import { execFileSync } from "child_process";
import { NextResponse } from "next/server";
import { requireUserWithRole } from "@/app/api/_utils/authz";
import { supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";

function isRoleAllowedForRoute(role: string | null | undefined) {
  return role === "admin" || role === "superadmin";
}

function processExists(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getDescendantPids(rootPid: number): number[] {
  try {
    const output = execFileSync("ps", ["-eo", "pid=,ppid="], {
      encoding: "utf8",
    });

    const children = new Map<number, number[]>();

    for (const line of output.split("\n")) {
      const match = line.trim().match(/^(\d+)\s+(\d+)$/);
      if (!match) continue;

      const pid = Number(match[1]);
      const ppid = Number(match[2]);

      if (!children.has(ppid)) children.set(ppid, []);
      children.get(ppid)!.push(pid);
    }

    const descendants: number[] = [];

    function walk(pid: number) {
      for (const child of children.get(pid) ?? []) {
        walk(child);
        descendants.push(child);
      }
    }

    walk(rootPid);
    return descendants;
  } catch {
    return [];
  }
}

function killTree(rootPid: number, signal: NodeJS.Signals) {
  const descendants = getDescendantPids(rootPid);

  // Eerst de diepste child-processen, daarna de scraper zelf.
  for (const pid of descendants) {
    try {
      process.kill(pid, signal);
    } catch {}
  }

  try {
    process.kill(rootPid, signal);
  } catch {}
}

export async function POST(req: Request) {
  try {
    const { role } = await requireUserWithRole(req);

    if (!isRoleAllowedForRoute(role)) {
      return NextResponse.json(
        { error: "Geen toegang tot het stoppen van de sportschoolsynchronisatie." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const runId = String(body?.run_id || "").trim();

    if (!runId) {
      return NextResponse.json(
        { error: "run_id ontbreekt." },
        { status: 400 }
      );
    }

    const { data: run, error: runError } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (runError || !run) {
      return NextResponse.json(
        { error: "Sportscholen-run niet gevonden." },
        { status: 404 }
      );
    }

    if (String(run.run_type || "").toLowerCase() !== "team") {
      return NextResponse.json(
        { error: "Deze route kan alleen team-runs stoppen." },
        { status: 400 }
      );
    }

    const pid = Number(run?.meta?.pid || 0);

    if (pid > 0 && processExists(pid)) {
      killTree(pid, "SIGTERM");

      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (processExists(pid)) {
        killTree(pid, "SIGKILL");
      }
    }

    const now = new Date().toISOString();
    const meta = {
      ...(run.meta || {}),
      pid: null,
      stopped_at: now,
      stopped_by: role,
    };

    const { error: updateError } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .update({
        status: "cancelled",
        finished_at: now,
        error_message: null,
        meta,
      })
      .eq("id", runId);

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      stopped: true,
      pid: pid || null,
      message: "Sportscholen Sync gestopt.",
    });
  } catch (err: any) {
    console.error("[fightpassport-sync/stop-team] ❌ stoppen mislukt:", err);

    return NextResponse.json(
      {
        error:
          err?.message ??
          "Onbekende fout bij stoppen van de sportschoolsynchronisatie.",
      },
      { status: 500 }
    );
  }
}
