import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const HISTORICAL_FULL_START_VA = 775;
const HISTORICAL_FULL_END_VA = 33129;
const HISTORICAL_FULL_PROCESSES = 3;
const HISTORICAL_WORKERS_PER_PROCESS = 10;

function splitRange(startVa: number, endVa: number, processCount: number) {
  const total = endVa - startVa + 1;
  const count = Math.max(1, Math.min(processCount, total));
  const baseSize = Math.floor(total / count);
  const remainder = total % count;
  let nextStart = startVa;
  return Array.from({ length: count }, (_, index) => {
    const size = baseSize + (index < remainder ? 1 : 0);
    const part = { start_va: nextStart, end_va: nextStart + size - 1 };
    nextStart = part.end_va + 1;
    return part;
  });
}

function int(value: unknown, fallback: number, min = 1, max = 99999) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.floor(parsed))) : fallback;
}

function scriptPath() {
  const candidates = [
    path.join(process.cwd(), "ControlEngine", "scrapers", "historical_startverbod", "scraper_historical_startverbod.js"),
    path.join(process.cwd(), "scrapers", "historical_startverbod", "scraper_historical_startverbod.js"),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error("Historische Startverbod/Schorsing-scraper niet gevonden.");
  return found;
}

function launch(run: any) {
  const script = scriptPath();
  const child = spawn("node", [script, String(run.start_va), String(run.end_va), "run"], {
    cwd: path.dirname(script), shell: false, windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      HISTORY_RUN_ID: String(run.id),
      HISTORY_START_VA: String(run.start_va),
      HISTORY_END_VA: String(run.end_va),
      HISTORY_WORKERS: String(run.workers),
      FP_SESSION_MODE: "master",
      // Alleen historische scraper: iedere run begint met een echte schone login.
      FP_FRESH_LOGIN: "true",
      HEADLESS: process.env.HEADLESS ?? "false",
      PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "false",
    },
  });
  child.stdout?.on("data", (data) => process.stdout.write(`[historical-startverbod] ${data}`));
  child.stderr?.on("data", (data) => process.stderr.write(`[historical-startverbod] ${data}`));
  child.on("error", async (error) => {
    await supabaseAdmin.from("fighter_startverbod_history_runs").update({
      status: "paused",
      last_error: `Proces kon niet starten: ${error.message}`,
      finished_at: null,
      pid: null,
      updated_at: new Date().toISOString(),
    }).eq("id", run.id).eq("status", "running");
  });

  // Bij een lokale crash/afgesloten terminal komt er soms geen nette scraper-finalize.
  // Laat zo'n run niet eeuwig als "running" staan: maak hem hervatbaar.
  child.on("exit", async (code, signal) => {
    const { data: current } = await supabaseAdmin
      .from("fighter_startverbod_history_runs")
      .select("status")
      .eq("id", run.id)
      .maybeSingle();

    if (current?.status === "running") {
      await supabaseAdmin.from("fighter_startverbod_history_runs").update({
        status: "paused",
        pid: null,
        finished_at: null,
        last_error: `Scraperproces onverwacht beëindigd (code=${code ?? "null"}, signal=${signal ?? "none"}). Hervatten is mogelijk.`,
        updated_at: new Date().toISOString(),
      }).eq("id", run.id).eq("status", "running");
    }
  });

  return child.pid ?? null;
}

export async function GET(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const url = new URL(req.url);
    const runId = url.searchParams.get("run_id");
    const [runs, items] = await Promise.all([
      supabaseAdmin.from("fighter_startverbod_history_runs").select("*")
        .order("created_at", { ascending: false }).limit(20),
      runId
        ? supabaseAdmin.from("fighter_startverbod_history_items").select("*")
          .eq("run_id", runId).order("va_nummer", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (runs.error) throw runs.error;
    if (items.error) throw items.error;
    return NextResponse.json({ runs: runs.data ?? [], items: items.data ?? [] });
  } catch (error: any) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Historische synchronisaties konden niet worden geladen." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const body = await req.json();
    const action = String(body?.action || "start");

    if (action === "resume") {
      const { data: run, error } = await supabaseAdmin.from("fighter_startverbod_history_runs")
        .select("*").eq("id", body.run_id).eq("status", "paused").single();
      if (error) throw error;
      const pid = launch(run);
      await supabaseAdmin.from("fighter_startverbod_history_runs").update({ status: "running", pid }).eq("id", run.id);
      return NextResponse.json({ ok: true, message: "Historische synchronisatie hervat." }, { status: 202 });
    }

    if (action === "resume_all") {
      const { data: pausedRuns, error } = await supabaseAdmin
        .from("fighter_startverbod_history_runs")
        .select("*")
        .eq("status", "paused")
        .order("created_at", { ascending: false })
        .limit(HISTORICAL_FULL_PROCESSES);
      if (error) throw error;
      if (!pausedRuns?.length) {
        return NextResponse.json({ error: "Geen gepauzeerde historische processen gevonden." }, { status: 409 });
      }
      const now = new Date().toISOString();
      const resumed = [];
      for (const run of pausedRuns) {
        const pid = launch(run);
        await supabaseAdmin.from("fighter_startverbod_history_runs")
          .update({ status: "running", pid, finished_at: null, updated_at: now })
          .eq("id", run.id);
        resumed.push(run.id);
      }
      return NextResponse.json({ ok: true, run_ids: resumed, message: `${resumed.length} historische processen hervat.` }, { status: 202 });
    }

    const { data: active } = await supabaseAdmin.from("fighter_startverbod_history_runs")
      .select("id").eq("status", "running").limit(1).maybeSingle();
    if (active) return NextResponse.json({ error: "Er draait al een historische synchronisatie." }, { status: 409 });

    const full = body?.full === true;
    const startVa = full ? HISTORICAL_FULL_START_VA : int(body?.start_va, HISTORICAL_FULL_START_VA);
    const endVa = full ? HISTORICAL_FULL_END_VA : int(body?.end_va, HISTORICAL_FULL_END_VA);
    if (endVa < startVa) return NextResponse.json({ error: "Tot VA mag niet lager zijn dan Van VA." }, { status: 400 });

    const processCount = full ? HISTORICAL_FULL_PROCESSES : 1;
    const workers = full
      ? HISTORICAL_WORKERS_PER_PROCESS
      : int(body?.workers, HISTORICAL_WORKERS_PER_PROCESS, 1, 20);
    const parts = splitRange(startVa, endVa, processCount);
    const now = new Date().toISOString();
    const startedRuns = [];

    for (const part of parts) {
      const { data: run, error } = await supabaseAdmin.from("fighter_startverbod_history_runs").insert({
        status: "idle",
        start_va: part.start_va,
        end_va: part.end_va,
        workers,
      }).select("*").single();
      if (error) throw error;

      const pid = launch(run);
      await supabaseAdmin.from("fighter_startverbod_history_runs").update({
        status: "running",
        pid,
        started_at: now,
        updated_at: now,
      }).eq("id", run.id);
      startedRuns.push({ id: run.id, start_va: part.start_va, end_va: part.end_va, workers, pid });
    }

    return NextResponse.json({
      ok: true,
      run_ids: startedRuns.map((run) => run.id),
      runs: startedRuns,
      processes: startedRuns.length,
      workers_per_process: workers,
      start_va: startVa,
      end_va: endVa,
      message: full
        ? `Volledige historische synchronisatie gestart: ${startedRuns.length} processen × ${workers} workers voor VA ${startVa} t/m ${endVa}. Bevestigd verwijderde VA-nummers worden door de scraper overgeslagen.`
        : `Historische synchronisatie gestart voor VA ${startVa} t/m ${endVa}.`,
    }, { status: 202 });
  } catch (error: any) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: error?.message || "Historische synchronisatie starten mislukt." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const body = await req.json();
    const action = String(body?.action || "pause");
    const batchAction = action === "pause_all" || action === "stop_all";

    if (batchAction) {
      const { data: runs, error } = await supabaseAdmin
        .from("fighter_startverbod_history_runs")
        .select("*")
        .eq("status", "running");
      if (error) throw error;
      if (!runs?.length) {
        return NextResponse.json({ error: "Geen actieve historische processen gevonden." }, { status: 409 });
      }

      const stopping = action === "stop_all";
      for (const run of runs) {
        if (run.pid) {
          try { process.kill(Number(run.pid), "SIGTERM"); } catch {}
        }
      }
      const ids = runs.map((run) => run.id);
      await supabaseAdmin.from("fighter_startverbod_history_runs").update({
        status: stopping ? "failed" : "paused",
        last_error: stopping ? "Handmatig gestopt door beheerder." : null,
        finished_at: stopping ? new Date().toISOString() : null,
        pid: null,
        updated_at: new Date().toISOString(),
      }).in("id", ids);

      return NextResponse.json({
        ok: true,
        run_ids: ids,
        message: stopping
          ? `${ids.length} historische processen gestopt.`
          : `${ids.length} historische processen gepauzeerd.`,
      });
    }

    const { data: run, error } = await supabaseAdmin.from("fighter_startverbod_history_runs")
      .select("*").eq("id", body.run_id).single();
    if (error) throw error;
    if (run.pid) {
      try { process.kill(Number(run.pid), "SIGTERM"); } catch {}
    }
    const stopping = action === "stop";
    await supabaseAdmin.from("fighter_startverbod_history_runs").update({
      status: stopping ? "failed" : "paused",
      last_error: stopping ? "Handmatig gestopt door beheerder." : run.last_error,
      finished_at: stopping ? new Date().toISOString() : null,
      pid: null,
      updated_at: new Date().toISOString(),
    }).eq("id", run.id);
    return NextResponse.json({ ok: true, message: stopping ? "Historische synchronisatie gestopt." : "Historische synchronisatie gepauzeerd." });
  } catch (error: any) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Lifecycle-actie voor historische synchronisatie mislukt." }, { status: 500 });
  }
}
