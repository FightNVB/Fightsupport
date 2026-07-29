import { NextResponse } from "next/server";
import { execFileSync } from "child_process";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";

function isFinishedStatus(status: unknown) {
  return ["completed", "failed", "cancelled", "canceled"].includes(
    String(status ?? "").toLowerCase()
  );
}

function childPids(pid: number): number[] {
  if (!Number.isInteger(pid) || pid <= 1) return [];
  try {
    const out = execFileSync("pgrep", ["-P", String(pid)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!out) return [];
    return out.split(/\s+/).map(Number).filter((n) => Number.isInteger(n) && n > 1);
  } catch {
    return [];
  }
}

function collectProcessTree(rootPid: number): number[] {
  const seen = new Set<number>();
  const ordered: number[] = [];
  function walk(pid: number) {
    if (seen.has(pid)) return;
    seen.add(pid);
    for (const child of childPids(pid)) walk(child);
    ordered.push(pid);
  }
  walk(rootPid);
  return ordered;
}

function signalProcessTree(rootPid: number, signal: NodeJS.Signals) {
  for (const pid of collectProcessTree(rootPid)) {
    try {
      process.kill(pid, signal);
    } catch (err: any) {
      if (err?.code !== "ESRCH") throw err;
    }
  }
}

function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
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
        { error: "Alleen Total AutoCheck-runs kunnen via deze route worden gestopt." },
        { status: 400 }
      );
    }
    if (isFinishedStatus(selectedRun.status)) {
      return NextResponse.json({ error: "Deze run is al afgerond." }, { status: 409 });
    }

    const batchId = String((selectedRun.meta as any)?.batch_id ?? "").trim();
    let runsToStop: any[] = [selectedRun];

    if (batchId) {
      const { data: activeRuns, error: activeRunsError } = await supabaseAdmin
        .from("fightpassport_sync_runs")
        .select("id,status,run_type,meta,started_at,finished_at")
        .eq("run_type", "full")
        .in("status", ["running", "paused"]);
      if (activeRunsError) throw activeRunsError;
      runsToStop = (activeRuns ?? []).filter(
        (run: any) => String(run?.meta?.batch_id ?? "") === batchId
      );
      if (!runsToStop.length) runsToStop = [selectedRun];
    }

    const pids = runsToStop
      .map((run: any) => Number(run?.meta?.pid))
      .filter((pid: number) => Number.isInteger(pid) && pid > 1);

    for (const pid of pids) signalProcessTree(pid, "SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    for (const pid of pids) {
      if (isProcessAlive(pid)) signalProcessTree(pid, "SIGKILL");
    }

    const finishedAt = new Date().toISOString();
    const runIds = runsToStop.map((run: any) => String(run.id));
    const { error: updateError } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .update({
        status: "cancelled",
        finished_at: finishedAt,
        error_message: null,
      })
      .in("id", runIds);
    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      batch_id: batchId || null,
      run_ids: runIds,
      pids,
      status: "cancelled",
      finished_at: finishedAt,
      message: batchId
        ? `Beide Total AutoCheck-deelruns zijn gestopt.`
        : "Run gestopt.",
    });
  } catch (err: any) {
    if (err instanceof NextResponse) return err;
    console.error("[fightpassport-sync/stop] stoppen mislukt:", err);
    return NextResponse.json(
      { error: err?.message ?? "Run stoppen mislukt." },
      { status: 500 }
    );
  }
}
