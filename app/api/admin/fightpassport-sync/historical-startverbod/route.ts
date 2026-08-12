import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";

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
      status: "failed", last_error: `Proces kon niet starten: ${error.message}`,
      finished_at: new Date().toISOString(),
    }).eq("id", run.id);
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

    const startVa = int(body?.start_va, 775);
    const endVa = int(body?.end_va, 33150);
    const workers = int(body?.workers, 4, 1, 20);
    if (endVa < startVa) return NextResponse.json({ error: "Tot VA mag niet lager zijn dan Van VA." }, { status: 400 });
    const { data: active } = await supabaseAdmin.from("fighter_startverbod_history_runs")
      .select("id").eq("status", "running").limit(1).maybeSingle();
    if (active) return NextResponse.json({ error: "Er draait al een historische synchronisatie." }, { status: 409 });
    const { data: run, error } = await supabaseAdmin.from("fighter_startverbod_history_runs").insert({
      status: "idle", start_va: startVa, end_va: endVa, workers,
    }).select("*").single();
    if (error) throw error;
    const pid = launch(run);
    await supabaseAdmin.from("fighter_startverbod_history_runs").update({
      status: "running", pid, started_at: new Date().toISOString(),
    }).eq("id", run.id);
    return NextResponse.json({ ok: true, run_id: run.id, message: `Historische synchronisatie gestart voor VA ${startVa} t/m ${endVa}.` }, { status: 202 });
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
    }).eq("id", run.id);
    return NextResponse.json({ ok: true, message: stopping ? "Historische synchronisatie gestopt." : "Historische synchronisatie gepauzeerd." });
  } catch (error: any) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: "Lifecycle-actie voor historische synchronisatie mislukt." }, { status: 500 });
  }
}
