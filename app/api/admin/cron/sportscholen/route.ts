import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCK_FILE = path.join(os.tmpdir(), "fightsupport-cron-sportscholen.lock");

function isCronAllowed(req: Request) {
  const secret = process.env.CRON_SECRET || process.env.SPORTSCHOOL_SYNC_SECRET;
  if (!secret) return false;

  const authorization = req.headers.get("authorization") || "";
  return (
    authorization === `Bearer ${secret}` ||
    req.headers.get("x-cron-secret") === secret
  );
}

async function requireAdminOrCron(req: Request) {
  if (isCronAllowed(req)) return;
  await requireAdmin(req);
}

function findScraperPath() {
  const configured = process.env.SPORTSCHOLEN_SCRAPER_PATH;

  const candidates = [
    configured ? path.resolve(process.cwd(), configured) : null,
    path.join(
      process.cwd(),
      "ControlEngine",
      "scrapers",
      "sportscholen",
      "scraper_sportscholen.js",
    ),
    path.join(
      process.cwd(),
      "control-engine",
      "scrapers",
      "sportscholen",
      "scraper_sportscholen.js",
    ),
    path.join(
      process.cwd(),
      "scrapers",
      "sportscholen",
      "scraper_sportscholen.js",
    ),
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

function readRunningPid() {
  try {
    if (!fs.existsSync(LOCK_FILE)) return null;

    const pid = Number(fs.readFileSync(LOCK_FILE, "utf8").trim());
    if (!Number.isInteger(pid) || pid <= 0) {
      fs.rmSync(LOCK_FILE, { force: true });
      return null;
    }

    process.kill(pid, 0);
    return pid;
  } catch {
    fs.rmSync(LOCK_FILE, { force: true });
    return null;
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminOrCron(req);

    const runningPid = readRunningPid();
    if (runningPid) {
      return NextResponse.json({
        ok: true,
        started: false,
        already_running: true,
        pid: runningPid,
        message: "De sportscholenscraper draait al.",
      });
    }

    const scraperPath = findScraperPath();
    if (!scraperPath || !fs.existsSync(scraperPath)) {
      return NextResponse.json(
        {
          error: `Sportscholenscraper niet gevonden: ${scraperPath ?? "onbekend"}`,
        },
        { status: 500 },
      );
    }

    const child = spawn(process.execPath, [scraperPath, "run"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        FP_MATCHMAKER_ID: "",
        FP_SESSION_MODE: "master",
        HEADLESS: process.env.HEADLESS ?? "true",
        PUPPETEER_HEADLESS:
          process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "true",
      },
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (!child.pid) {
      throw new Error("Sportscholenscraper kon niet worden gestart.");
    }

    fs.writeFileSync(LOCK_FILE, String(child.pid), "utf8");

    child.stdout?.on("data", (chunk) => {
      console.log(`[cron-sportscholen] ${String(chunk).trimEnd()}`);
    });
    child.stderr?.on("data", (chunk) => {
      console.error(`[cron-sportscholen][stderr] ${String(chunk).trimEnd()}`);
    });
    child.on("error", (error) => {
      console.error("[cron-sportscholen] Startfout:", error);
      fs.rmSync(LOCK_FILE, { force: true });
    });
    child.on("close", (code, signal) => {
      console.log("[cron-sportscholen] Afgerond", { code, signal });
      fs.rmSync(LOCK_FILE, { force: true });
    });

    return NextResponse.json({
      ok: true,
      started: true,
      pid: child.pid,
      mode: "run",
      message: "De sportscholenscraper is gestart.",
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: error?.message ?? "server_error" },
      { status: 500 },
    );
  }
}
