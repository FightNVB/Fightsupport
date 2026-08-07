import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "superadmin"];
const MAX_WORKERS = 20;

export async function POST(req: Request) {
  try {
    await requireRole(req, ALLOWED_ROLES);

    const body = await req.json().catch(() => ({}));
    const startEventId = Number(body.startEventId ?? 77);
    const endEventId = Number(body.endEventId ?? 5000);
    const workers = Math.min(MAX_WORKERS, Math.max(1, Number(body.workers ?? MAX_WORKERS)));

    if (
      !Number.isInteger(startEventId) ||
      !Number.isInteger(endEventId) ||
      startEventId < 1 ||
      endEventId < startEventId
    ) {
      return NextResponse.json({ error: "Ongeldig evenementbereik." }, { status: 400 });
    }

    const { data: activeRun, error: activeError } = await supabaseAdmin
      .from("fightpassport_event_sync_runs")
      .select("id,status,pid,start_event_id,end_event_id,started_at")
      .in("status", ["pending", "running"])
      .limit(1)
      .maybeSingle();

    if (activeError) throw activeError;
    if (activeRun) {
      return NextResponse.json(
        { error: "Er loopt al een evenementenscrape.", run: activeRun },
        { status: 409 },
      );
    }

    // Linux is hoofdlettergevoelig: dit sluit exact aan op jouw map controlEngine.
    const scraperPath = path.join(
      process.cwd(),
      "ControlEngine",
      "scrapers",
      "evenementen",
      "scraper_fp_evenementen.js",
    );

    if (!fs.existsSync(scraperPath)) {
      throw new Error(`Evenementenscraper niet gevonden: ${scraperPath}`);
    }

    const isProduction = process.env.NODE_ENV === "production";

    const child = spawn(
      process.execPath,
      [scraperPath, String(startEventId), String(endEventId)],
      {
        cwd: process.cwd(),
        // Op de VPS blijft de scraper zelfstandig draaien. Lokaal blijft hij
        // gekoppeld aan de devserver, zodat Ctrl+C ook de scraper beëindigt.
        detached: isProduction,
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
        windowsHide: true,
        env: {
          ...process.env,
          FP_SESSION_MODE: "master",
          HEADLESS: process.env.HEADLESS ?? "false",
          PUPPETEER_HEADLESS:
            process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "false",
          WORKERS: String(workers),
          FP_EVENTS_WORKERS: String(workers),
        },
      },
    );

    child.stdout?.on("data", (chunk) => {
      process.stdout.write(`[fp-events] ${chunk.toString()}`);
    });

    child.stderr?.on("data", (chunk) => {
      process.stderr.write(`[fp-events] ${chunk.toString()}`);
    });

    child.on("error", (error) => {
      console.error("[fp-events] scraperproces kon niet starten:", error);
    });

    child.on("close", (code, signal) => {
      console.log("[fp-events] scraperproces afgesloten", { code, signal });
    });

    if (isProduction) {
      child.unref();
    } else {
      const stopLocalChild = () => {
        if (child.exitCode === null && !child.killed) {
          console.log("[fp-events] lokale devserver stopt; scraperproces wordt beëindigd", {
            pid: child.pid ?? null,
          });
          child.kill("SIGTERM");
        }
      };

      process.once("SIGINT", stopLocalChild);
      process.once("SIGTERM", stopLocalChild);
      child.once("close", () => {
        process.removeListener("SIGINT", stopLocalChild);
        process.removeListener("SIGTERM", stopLocalChild);
      });
    }

    console.log("[fp-events] scraperproces gestart", {
      pid: child.pid ?? null,
      scraperPath,
      startEventId,
      endEventId,
      workers,
    });

    return NextResponse.json(
      {
        ok: true,
        started: true,
        pid: child.pid ?? null,
        startEventId,
        endEventId,
        workers,
        message: `Evenementenscraper gestart met ${workers} workers voor ${startEventId} t/m ${endEventId}.`,
      },
      { status: 202 },
    );
  } catch (err: any) {
    if (err instanceof NextResponse) return err;
    console.error("[fightpassport-evenementen/start] starten mislukt:", err);
    return NextResponse.json(
      { error: err?.message || "Evenementenscraper kon niet worden gestart." },
      { status: 500 },
    );
  }
}
