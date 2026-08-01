import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let runningProcess: ReturnType<typeof spawn> | null = null;

export async function POST(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);

    if (runningProcess && runningProcess.exitCode === null && !runningProcess.killed) {
      return NextResponse.json(
        { ok: false, error: "De Startverboden Sync draait al.", pid: runningProcess.pid },
        { status: 409 }
      );
    }

    const scriptPath = path.join(
      process.cwd(),
      "ControlEngine",
      "scrapers",
      "startverbod",
      "scraper_startverbod.js"
    );

    const child = spawn(process.execPath, [scriptPath, "run"], {
      cwd: process.cwd(),
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        FP_SESSION_MODE: "master",
        HEADLESS: process.env.HEADLESS ?? "false",
        PUPPETEER_HEADLESS:
          process.env.PUPPETEER_HEADLESS ??
          process.env.HEADLESS ??
          "false",
      },
    });

    runningProcess = child;

    child.stdout?.on("data", (data) => {
      process.stdout.write(`[startverbod-sync] ${data.toString()}`);
    });

    child.stderr?.on("data", (data) => {
      process.stderr.write(`[startverbod-sync] ${data.toString()}`);
    });

    child.on("close", (code) => {
      console.log(`[startverbod-sync] proces afgesloten met code ${code}`);
      if (runningProcess === child) runningProcess = null;
    });

    child.on("error", (error) => {
      console.error("[startverbod-sync] procesfout:", error);
      if (runningProcess === child) runningProcess = null;
    });

    return NextResponse.json({
      ok: true,
      message: "Startverboden Sync gestart.",
      pid: child.pid,
    });
  } catch (error: any) {
    if (error instanceof NextResponse) return error;
    console.error("Startverboden Sync starten mislukt:", error);
    return NextResponse.json(
      { error: error?.message || "Startverboden Sync starten mislukt." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);

    const running = Boolean(
      runningProcess &&
      runningProcess.exitCode === null &&
      !runningProcess.killed
    );

    const { data: latestRun, error } = await supabaseAdmin
      .from("startverbod_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      running,
      pid: running ? runningProcess?.pid : null,
      latestRun: latestRun ?? null,
    });
  } catch (error: any) {
    if (error instanceof NextResponse) return error;

    return NextResponse.json(
      { error: error?.message || "Status ophalen mislukt." },
      { status: 500 }
    );
  }
}
