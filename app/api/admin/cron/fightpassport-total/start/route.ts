import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { requireAdmin } from "@/app/api/_utils/authz";
import { supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const START_VA = Number(process.env.FP_TOTAL_START_VA || 775);
const FALLBACK_END_VA = Number(process.env.FP_TOTAL_END_VA || 33108);
const END_BUFFER = Number(process.env.FP_TOTAL_END_BUFFER || 100);
const WORKERS_PER_PROCESS = 10;
const REQUESTED_PROCESSES = 3;

function isCronAllowed(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authorization = req.headers.get("authorization") || "";
  return authorization === `Bearer ${secret}` || req.headers.get("x-cron-secret") === secret;
}

async function requireAdminOrCron(req: Request) {
  if (isCronAllowed(req)) return;
  await requireAdmin(req);
}

function amsterdamWeekday() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
  }).format(new Date());
}

function resolveScraperPath() {
  const candidates = [
    path.join(process.cwd(), "ControlEngine", "scrapers", "fp_total", "scraper_fp_total.js"),
    path.join(process.cwd(), "scrapers", "fp_total", "scraper_fp_total.js"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

function isProcessAlive(pid: number) {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function splitRange(startVa: number, endVa: number, requestedProcesses = REQUESTED_PROCESSES) {
  const totalVaCount = endVa - startVa + 1;
  const processCount = Math.min(requestedProcesses, totalVaCount);
  const baseSize = Math.floor(totalVaCount / processCount);
  const remainder = totalVaCount % processCount;

  let nextStartVa = startVa;
  return Array.from({ length: processCount }, (_, index) => {
    const size = baseSize + (index < remainder ? 1 : 0);
    const part = {
      part: index + 1,
      startVa: nextStartVa,
      endVa: nextStartVa + size - 1,
    };
    nextStartVa = part.endVa + 1;
    return part;
  });
}

async function resolveDynamicEndVa() {
  // Bepaal bij iedere NIEUWE ronde het hoogste VA-nummer dat al in de centrale
  // database staat en controleer ook een buffer daarboven. Zo groeit het bereik
  // automatisch mee wanneer FightPassport nieuwe VA-nummers uitgeeft.
  const { data, error } = await supabaseAdmin
    .from("fightpassport_fighters")
    .select("va_nummer")
    .not("va_nummer", "is", null)
    .order("va_nummer", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[cron-fp-total] Hoogste VA kon niet worden bepaald; fallback gebruikt:", error.message);
    return FALLBACK_END_VA;
  }

  const highestKnownVa = Number(data?.[0]?.va_nummer);
  if (!Number.isInteger(highestKnownVa) || highestKnownVa < START_VA) {
    return FALLBACK_END_VA;
  }

  return Math.max(FALLBACK_END_VA, highestKnownVa + END_BUFFER);
}

export async function POST(req: Request) {
  try {
    await requireAdminOrCron(req);

    const { data: openRuns, error: runError } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .select("*")
      .eq("run_type", "full")
      .in("status", ["running", "paused"])
      .order("started_at", { ascending: false })
      .limit(20);

    if (runError) throw runError;

    const runs = [...(openRuns ?? [])];
    const liveRuns = runs.filter((item: any) => {
      if (String(item.status).toLowerCase() !== "running") return false;
      return isProcessAlive(Number((item.meta as any)?.pid));
    });

    if (liveRuns.length > 0) {
      const first = liveRuns[0];
      return NextResponse.json({
        ok: true,
        started: false,
        already_running: true,
        run_id: first.id,
        run_ids: liveRuns.map((item: any) => item.id),
        processes: liveRuns.length,
        workers_per_process: WORKERS_PER_PROCESS,
        message: `De Total AutoCheck draait al (${liveRuns.length} proces${liveRuns.length === 1 ? "" : "sen"}).`,
      });
    }

    // Een serverrestart kan runs op 'running' achterlaten terwijl de processen weg zijn.
    // Zet alle zulke stale full-runs terug op paused, zodat ze hervat kunnen worden.
    const staleRunningRuns = runs.filter(
      (item: any) => String(item.status).toLowerCase() === "running"
    );

    for (const stale of staleRunningRuns) {
      const { error } = await supabaseAdmin
        .from("fightpassport_sync_runs")
        .update({ status: "paused", error_message: null })
        .eq("id", stale.id);
      if (error) throw error;
      stale.status = "paused";
    }

    const weekday = amsterdamWeekday();
    const scraperPath = resolveScraperPath();
    if (!fs.existsSync(scraperPath)) {
      return NextResponse.json({ error: `Total scraper niet gevonden: ${scraperPath}` }, { status: 500 });
    }

    const pausedRuns = runs.filter(
      (item: any) => String(item.status).toLowerCase() === "paused"
    );

    let batchId: string;
    let batchStartVa: number;
    let batchEndVa: number;
    let parts: Array<{
      part: number;
      startVa: number;
      endVa: number;
      runId?: string;
    }>;
    let resumed = false;

    if (pausedRuns.length > 0) {
      resumed = true;

      // Nieuwe 3x10 full-runs bewaren batch_id/batch_part in meta. Als zo'n batch
      // is gepauzeerd, hervatten we alleen de nog open delen met hun eigen run-id.
      const newestPaused = pausedRuns[0] as any;
      const newestMeta = (newestPaused.meta ?? {}) as any;
      const existingBatchId = String(newestMeta.batch_id ?? "").trim();

      if (existingBatchId) {
        const batchRuns = pausedRuns
          .filter((item: any) => String(item.meta?.batch_id ?? "") === existingBatchId)
          .sort(
            (a: any, b: any) =>
              Number(a.meta?.batch_part ?? 1) - Number(b.meta?.batch_part ?? 1)
          );

        batchId = existingBatchId;
        batchStartVa = Number(newestMeta.batch_start_va ?? Math.min(...batchRuns.map((r: any) => Number(r.start_va))));
        batchEndVa = Number(newestMeta.batch_end_va ?? Math.max(...batchRuns.map((r: any) => Number(r.end_va))));
        parts = batchRuns.map((item: any, index: number) => ({
          part: Number(item.meta?.batch_part ?? index + 1),
          startVa: Number(item.start_va),
          endVa: Number(item.end_va),
          runId: String(item.id),
        }));
      } else {
        // Compatibiliteit met een oude, enkelvoudige cron-run die vóór 3x10 is
        // gepauzeerd. Die hervatten we bewust als één proces met 10 workers;
        // één bestaande run-id tegelijk door drie processen laten bijwerken is onveilig.
        const legacyRun = newestPaused;
        batchId = crypto.randomUUID();
        batchStartVa = Number(legacyRun.start_va);
        batchEndVa = Number(legacyRun.end_va);
        parts = [
          {
            part: 1,
            startVa: batchStartVa,
            endVa: batchEndVa,
            runId: String(legacyRun.id),
          },
        ];
      }
    } else {
      batchStartVa = START_VA;
      batchEndVa = await resolveDynamicEndVa();
      batchId = crypto.randomUUID();
      parts = splitRange(batchStartVa, batchEndVa);
    }

    console.log("[cron-fp-total] ▶ Total AutoCheck start", {
      resumed,
      batch_id: batchId,
      start_va: batchStartVa,
      end_va: batchEndVa,
      processes: parts.length,
      workers_per_process: WORKERS_PER_PROCESS,
      parts,
    });

    const children = parts.map((part) => {
      const child = spawn(process.execPath, [scraperPath, String(part.startVa), String(part.endVa)], {
        cwd: path.dirname(scraperPath),
        env: {
          ...process.env,
          FP_TOTAL_RUN_ID: part.runId ?? "",
          FP_TOTAL_RUN_KIND: "full",
          FP_MATCHMAKER_ID: "",
          FP_SESSION_MODE: "master",
          HEADLESS: process.env.HEADLESS ?? "true",
          PUPPETEER_HEADLESS:
            process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "true",
          WORKERS: String(WORKERS_PER_PROCESS),
          FP_TOTAL_WORKERS: String(WORKERS_PER_PROCESS),
          FP_TOTAL_BATCH_ID: batchId,
          FP_TOTAL_BATCH_PART: String(part.part),
          FP_TOTAL_BATCH_PARTS: String(parts.length),
          FP_TOTAL_BATCH_START_VA: String(batchStartVa),
          FP_TOTAL_BATCH_END_VA: String(batchEndVa),
          STAGGER_MS: process.env.STAGGER_MS ?? "2500",
          TAB_ATTEMPTS: process.env.TAB_ATTEMPTS ?? "3",
          SOFT_WAIT_MS: process.env.SOFT_WAIT_MS ?? "1500",
          BETWEEN_ATTEMPTS_MS: process.env.BETWEEN_ATTEMPTS_MS ?? "700",
          FP_TOTAL_TIMEOUT_MS: process.env.FP_TOTAL_TIMEOUT_MS ?? "150000",
          FP_TOTAL_RESULTS: "true",
          FIGHTSUPPORT_INTERNAL_URL:
            process.env.FIGHTSUPPORT_INTERNAL_URL ||
            process.env.INTERNAL_APP_URL ||
            new URL(req.url).origin,
          TERMINATOR_INTERNAL_TOKEN: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        },
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
      });

      if (!child.pid) {
        throw new Error(`Total scraper deel ${part.part} kon niet worden gestart.`);
      }

      child.stdout?.on("data", (chunk) =>
        console.log(`[cron-fp-total-${part.part}] ${String(chunk).trimEnd()}`)
      );
      child.stderr?.on("data", (chunk) =>
        console.error(`[cron-fp-total-${part.part}][stderr] ${String(chunk).trimEnd()}`)
      );
      child.on("error", (error) =>
        console.error(`[cron-fp-total-${part.part}] Startfout:`, error)
      );
      child.on("close", (code, signal) =>
        console.log(`[cron-fp-total-${part.part}] Afgerond`, { code, signal })
      );

      return { ...part, pid: child.pid };
    });

    return NextResponse.json(
      {
        ok: true,
        started: true,
        resumed,
        batch_id: batchId,
        weekday,
        start_va: batchStartVa,
        end_va: batchEndVa,
        processes: children.length,
        workers_per_process: WORKERS_PER_PROCESS,
        parts: children.map((part) => ({
          part: part.part,
          start_va: part.startVa,
          end_va: part.endVa,
          run_id: part.runId ?? null,
          pid: part.pid,
        })),
        message: resumed
          ? `Onvoltooide Total AutoCheck hervat met ${children.length} proces${children.length === 1 ? "" : "sen"} × ${WORKERS_PER_PROCESS} workers.`
          : `Nieuwe Total AutoCheck gestart als ${children.length} processen × ${WORKERS_PER_PROCESS} workers.`,
      },
      { status: 202 }
    );
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error("[cron-fp-total] Start mislukt:", error);
    return NextResponse.json({ error: error?.message ?? "server_error" }, { status: 500 });
  }
}
