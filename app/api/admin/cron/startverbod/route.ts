// app/api/admin/cron/startverbod/route.ts
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let runningProcess: ReturnType<typeof spawn> | null = null;

function isAuthorized(request: NextRequest) {
  const expected = String(process.env.CRON_SECRET || "").trim();
  if (!expected) return false;

  const authorization = request.headers.get("authorization") || "";
  return authorization === `Bearer ${expected}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Niet toegestaan" }, { status: 401 });
  }

  if (runningProcess && runningProcess.exitCode === null && !runningProcess.killed) {
    return NextResponse.json(
      { ok: false, error: "Startverbod-scraper draait al" },
      { status: 409 }
    );
  }

  const script = path.join(
    process.cwd(),
    "ControlEngine",
    "scrapers",
    "startverbod",
    "scraper_startverbod.js"
  );

  const child = spawn(process.execPath, [script, "run"], {
    cwd: process.cwd(),
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      FP_SESSION_MODE: "master",
      HEADLESS: process.env.HEADLESS ?? "true",
      PUPPETEER_HEADLESS:
        process.env.PUPPETEER_HEADLESS ??
        process.env.HEADLESS ??
        "true",
    },
  });

  runningProcess = child;

  child.stdout?.on("data", (data) => {
    process.stdout.write(`[startverbod] ${data.toString()}`);
  });

  child.stderr?.on("data", (data) => {
    process.stderr.write(`[startverbod] ${data.toString()}`);
  });

  child.on("close", (code) => {
    console.log(`[startverbod] proces afgesloten met code ${code}`);
    if (runningProcess === child) runningProcess = null;
  });

  child.on("error", (error) => {
    console.error("[startverbod] procesfout:", error);
    if (runningProcess === child) runningProcess = null;
  });

  return NextResponse.json({
    ok: true,
    message: "Startverbod-scraper gestart",
    pid: child.pid,
  });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Niet toegestaan" }, { status: 401 });
  }

  const running = Boolean(
    runningProcess &&
    runningProcess.exitCode === null &&
    !runningProcess.killed
  );

  return NextResponse.json({
    ok: true,
    running,
    pid: running ? runningProcess?.pid : null,
  });
}
