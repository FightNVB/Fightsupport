import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { requireAdmin } from "@/app/api/_utils/authz";
import { supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const START_VA = Number(process.env.FP_TOTAL_START_VA || 775);
const FALLBACK_END_VA = Number(process.env.FP_TOTAL_END_VA || 33108);
const END_BUFFER = Number(process.env.FP_TOTAL_END_BUFFER || 100);
const START_WEEKDAYS = new Set(["Tue", "Fri"]);

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
      .limit(5);

    if (runError) throw runError;

    let run = (openRuns ?? []).find((item: any) => String(item.status).toLowerCase() === "running") ?? null;
    if (run) {
      const pid = Number((run.meta as any)?.pid);
      if (isProcessAlive(pid)) {
        return NextResponse.json({
          ok: true,
          started: false,
          already_running: true,
          run_id: run.id,
          pid,
          message: "De Total AutoCheck draait al.",
        });
      }

      // Een serverrestart kan een run op 'running' achterlaten terwijl het proces weg is.
      await supabaseAdmin
        .from("fightpassport_sync_runs")
        .update({ status: "paused", error_message: null })
        .eq("id", run.id);
      run = { ...run, status: "paused" };
    }

    run = run ?? (openRuns ?? []).find((item: any) => String(item.status).toLowerCase() === "paused") ?? null;

    const weekday = amsterdamWeekday();
    if (!run && !START_WEEKDAYS.has(weekday)) {
      return NextResponse.json({
        ok: true,
        started: false,
        scheduled_start_day: false,
        weekday,
        message: "Geen onafgeronde ronde en vandaag start geen nieuwe ronde. Nieuwe rondes starten dinsdag en vrijdag.",
      });
    }

    const scraperPath = resolveScraperPath();
    if (!fs.existsSync(scraperPath)) {
      return NextResponse.json({ error: `Total scraper niet gevonden: ${scraperPath}` }, { status: 500 });
    }

    // Een hervatte ronde houdt bewust hetzelfde eindpunt. Alleen bij een nieuwe
    // dinsdag-/vrijdagronde wordt het bereik opnieuw dynamisch bepaald.
    const dynamicEndVa = run ? Number(run.end_va) : await resolveDynamicEndVa();
    const args = run ? [String(run.start_va), String(run.end_va)] : [String(START_VA), String(dynamicEndVa)];
    const child = spawn(process.execPath, [scraperPath, ...args], {
      cwd: path.dirname(scraperPath),
      env: {
        ...process.env,
        FP_TOTAL_RUN_ID: run?.id ? String(run.id) : "",
        FP_MATCHMAKER_ID: "",
        FP_SESSION_MODE: "master",
        HEADLESS: process.env.HEADLESS ?? "true",
        PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "true",
        FP_TOTAL_WORKERS: process.env.FP_TOTAL_WORKERS ?? "8",
        WORKERS: process.env.FP_TOTAL_WORKERS ?? "8",
        STAGGER_MS: process.env.STAGGER_MS ?? "2500",
        FP_TOTAL_RESULTS: "true",
      },
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (!child.pid) throw new Error("Total scraper kon niet worden gestart.");

    child.stdout?.on("data", (chunk) => console.log(`[cron-fp-total] ${String(chunk).trimEnd()}`));
    child.stderr?.on("data", (chunk) => console.error(`[cron-fp-total][stderr] ${String(chunk).trimEnd()}`));
    child.on("error", (error) => console.error("[cron-fp-total] Startfout:", error));
    child.on("close", (code, signal) => console.log("[cron-fp-total] Afgerond", { code, signal }));

    return NextResponse.json({
      ok: true,
      started: true,
      resumed: !!run,
      run_id: run?.id ?? null,
      pid: child.pid,
      weekday,
      start_va: run?.start_va ?? START_VA,
      end_va: run?.end_va ?? dynamicEndVa,
      message: run ? "Onvoltooide Total AutoCheck-ronde hervat." : "Nieuwe Total AutoCheck-ronde gestart.",
    }, { status: 202 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error?.message ?? "server_error" }, { status: 500 });
  }
}
