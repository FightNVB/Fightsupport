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

    return out
      .split(/\s+/)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 1);
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

    for (const child of childPids(pid)) {
      walk(child);
    }

    ordered.push(pid);
  }

  walk(rootPid);
  return ordered;
}

function signalProcessTree(rootPid: number, signal: NodeJS.Signals) {
  // Kindprocessen eerst, hoofdproces als laatste.
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

    const { data: run, error: runError } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .select("id,status,run_type,meta,started_at,finished_at")
      .eq("id", runId)
      .single();

    if (runError || !run) {
      return NextResponse.json({ error: "Run niet gevonden." }, { status: 404 });
    }

    if (String(run.run_type ?? "").toLowerCase() !== "full") {
      return NextResponse.json(
        { error: "Alleen Total AutoCheck-runs kunnen via deze route worden gestopt." },
        { status: 400 }
      );
    }

    if (isFinishedStatus(run.status)) {
      return NextResponse.json(
        { error: "Deze run is al afgerond." },
        { status: 409 }
      );
    }

    const pid = Number((run.meta as any)?.pid);

    if (!Number.isInteger(pid) || pid <= 1) {
      return NextResponse.json(
        { error: "Voor deze run is geen geldig scraperproces geregistreerd." },
        { status: 409 }
      );
    }

    // Eerst vriendelijk stoppen.
    signalProcessTree(pid, "SIGTERM");

    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Puppeteer blijft soms hangen; dan dezelfde boom hard beëindigen.
    if (isProcessAlive(pid)) {
      signalProcessTree(pid, "SIGKILL");
    }

    const finishedAt = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .update({
        status: "cancelled",
        finished_at: finishedAt,
        error_message: null,
      })
      .eq("id", runId);

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      run_id: runId,
      pid,
      status: "cancelled",
      finished_at: finishedAt,
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
