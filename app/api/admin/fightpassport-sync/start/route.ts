import { NextResponse } from "next/server";
import { execFileSync } from "child_process";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";

function isFinishedStatus(status: unknown) {
  return ["completed", "failed", "cancelled", "canceled"].includes(
    String(status ?? "").toLowerCase()
  );
}

function findTotalScraperPids(): number[] {
  try {
    const out = execFileSync("pgrep", ["-f", "scraper_fp_total\\.js"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (!out) return [];

    return [...new Set(
      out
        .split(/\s+/)
        .map(Number)
        .filter(
          (pid) =>
            Number.isInteger(pid) &&
            pid > 1 &&
            pid !== process.pid
        )
    )];
  } catch {
    return [];
  }
}

function signalProcess(pid: number, signal: NodeJS.Signals) {
  try {
    process.kill(pid, signal);
    return true;
  } catch (err: any) {
    if (err?.code === "ESRCH") return false;
    throw err;
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const body = await req.json().catch(() => ({}));
    const runId = String(body?.run_id ?? "").trim();

    if (!runId) {
      return NextResponse.json({ error: "run_id ontbreekt." }, { status: 400 });
    }

    const { data: selectedRun, error: runError } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .select("id,status,run_type,meta,started_at,finished_at")
      .eq("id", runId)
      .single();

    if (runError || !selectedRun) {
      return NextResponse.json({ error: "Run niet gevonden." }, { status: 404 });
    }

    if (String(selectedRun.run_type ?? "").toLowerCase() !== "full") {
      return NextResponse.json(
        { error: "Alleen Total AutoCheck-runs kunnen via deze route worden gepauzeerd." },
        { status: 400 }
      );
    }

    if (isFinishedStatus(selectedRun.status)) {
      return NextResponse.json({ error: "Deze run is al afgerond." }, { status: 409 });
    }

    const batchId = String((selectedRun.meta as any)?.batch_id ?? "").trim();
    let runsToPause: any[] = [selectedRun];

    if (batchId) {
      const { data: activeRuns, error: activeRunsError } = await supabaseAdmin
        .from("fightpassport_sync_runs")
        .select("id,status,run_type,meta,started_at,finished_at")
        .eq("run_type", "full")
        .in("status", ["running", "paused"]);

      if (activeRunsError) throw activeRunsError;

      runsToPause = (activeRuns ?? []).filter(
        (run: any) => String(run?.meta?.batch_id ?? "") === batchId
      );

      if (!runsToPause.length) runsToPause = [selectedRun];
    }

    const databasePids = runsToPause
      .map((run: any) => Number(run?.meta?.pid))
      .filter((pid: number) => Number.isInteger(pid) && pid > 1);

    // Zoek daarnaast rechtstreeks in de actieve processen. Zo wordt ook een
    // tweede deelproces gestopt als meta.pid ontbreekt of verouderd is.
    const detectedPids = findTotalScraperPids();
    const pids = [...new Set([...databasePids, ...detectedPids])];

    const signaledPids: number[] = [];
    for (const pid of pids) {
      if (signalProcess(pid, "SIGTERM")) signaledPids.push(pid);
    }

    // De scraper handelt SIGTERM zelf af: geen nieuwe VA's uitdelen,
    // lopende workers afronden en daarna de run als paused opslaan.
    // Daarom bewust géén automatische SIGKILL en géén finished_at.
    const runIds = runsToPause.map((run: any) => String(run.id));
    const { error: updateError } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .update({
        status: "paused",
        finished_at: null,
        error_message: null,
      })
      .in("id", runIds);

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      stopped: signaledPids.length > 0,
      graceful: true,
      batch_id: batchId || null,
      run_ids: runIds,
      database_pids: databasePids,
      detected_pids: detectedPids,
      signaled_pids: signaledPids,
      status: "paused",
      message: signaledPids.length
        ? "Pauzesignaal naar alle Total AutoCheck-processen verstuurd. Lopende VA's worden nog netjes afgerond."
        : "Geen actief Total AutoCheck-proces gevonden; de bijbehorende ronde(s) zijn als gepauzeerd gemarkeerd.",
    });
  } catch (err: any) {
    if (err instanceof NextResponse) return err;
    console.error("[fightpassport-sync/stop] pauzeren mislukt:", err);
    return NextResponse.json(
      { error: err?.message ?? "Run pauzeren mislukt." },
      { status: 500 }
    );
  }
}
