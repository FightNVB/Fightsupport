// app/api/control-engine/matchmaker/full/start/route.ts
// Volledige Matchmaker-controle voor Upload en Eindcontrole. Eigen scraper + eigen Matchmaker libs.

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { buildControleBoutContext } from "@/lib/matchmaker/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/matchmaker/enrichControleBoutContext";
import { rulesEngine } from "@/lib/matchmaker/rulesEngine";
import { carryApprovedRecordDifferenceReviews } from "@/lib/matchmaker/carryRecordDifferenceReview";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const RUN_TYPE = "control-engine-matchmaker-total";
const FULL_SCRAPER_FILE = "scraper_fp_matchmaker_full.js";
const PROCESS_COUNT = 3;
const WORKERS_PER_PROCESS = 8;

function toVaStrict(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

function pickVA(row: any, side: "rood" | "blauw"): string | null {
  const values = side === "rood"
    ? [row?.va_rood, row?.rood_va, row?.rood_va_mm, row?.rood_va_nummer, row?.rood_fighter_id]
    : [row?.va_blauw, row?.blauw_va, row?.blauw_va_mm, row?.blauw_va_nummer, row?.blauw_fighter_id];

  for (const value of values) {
    const va = toVaStrict(value);
    if (va) return va;
  }
  return null;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback;
}

function roleAllowed(role: string | null | undefined): boolean {
  return ["matchmaker", "admin", "superadmin"].includes(String(role ?? "").toLowerCase());
}

function resolveScriptPath(file: string): string {
  const root = process.cwd();
  const candidates = [
    path.join(root, "ControlEngine", "scrapers", "fp_bundle_matchmaker", file),
    path.join(root, "ControlEngine", "ControlEngine", "scrapers", "fp_bundle_matchmaker", file),
    path.join(root, "control-engine", "scrapers", "fp_bundle_matchmaker", file),
    path.join(root, "control-engine", "control-engine", "scrapers", "fp_bundle_matchmaker", file),
    path.join(root, "scrapers", "fp_bundle_matchmaker", file),
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Matchmaker full scraper niet gevonden: ${file}\n- ${candidates.join("\n- ")}`);
  }
  return found;
}

function runNodeScript(
  scriptPath: string,
  args: string[],
  envExtra: Record<string, string>,
  prefix: string
): Promise<{ ms: number }> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      cwd: path.dirname(scriptPath),
      windowsHide: true,
      env: { ...process.env, ...envExtra },
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(`[${prefix}] ${text}`);
    });
    child.stderr?.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(`[${prefix}] ${text}`);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ ms: Date.now() - started });
      else reject(new Error(`Matchmaker scraper exit ${code}\n${stderr}\n${stdout}`));
    });
  });
}

async function updateRun(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("controle_runs").update(patch).eq("id", id);
  if (error) console.warn("[matchmaker/full] run update:", error.message);
}

async function abortOwnRunning(matchmakingId: string) {
  const { error } = await supabase
    .from("controle_runs")
    .update({
      status: "aborted",
      afgerond_op: new Date().toISOString(),
      is_latest: false,
      foutmelding: "Afgebroken omdat een nieuwe volledige Matchmaker-controle is gestart.",
    })
    .eq("matchmaking_id", matchmakingId)
    .eq("run_type", RUN_TYPE)
    .eq("status", "running");

  if (error) throw error;
}

async function createRun(matchmakingId: string, userId: string | null, role: string | null): Promise<string> {
  const { data, error } = await supabase
    .from("controle_runs")
    .insert({
      matchmaking_id: matchmakingId,
      gestart_door_user_id: userId,
      gestart_door_rol: role,
      status: "running",
      gestart_op: new Date().toISOString(),
      run_type: RUN_TYPE,
      is_latest: true,
      totaal_aantal: 0,
      verwerkt_aantal: 0,
      progress: 0,
      current_step: "Volledige Matchmakercontrole wordt gestart...",
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error("Geen controle_run_id ontvangen.");

  await supabase
    .from("controle_runs")
    .update({ is_latest: false })
    .eq("matchmaking_id", matchmakingId)
    .eq("run_type", RUN_TYPE)
    .neq("id", data.id);

  return String(data.id);
}

async function loadBouts(matchmakingId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("matchmaking_bouts_raw")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .or("verwijderd.is.null,verwijderd.eq.false")
    .order("partij_nr");

  if (error) throw error;
  return data ?? [];
}

async function runFullScrape(
  matchmakingId: string,
  runId: string,
  vaList: string[],
  opts: {
    staggerMs: number;
    tabAttempts: number;
    softWaitMs: number;
    betweenAttemptsMs: number;
    scrapeTimeoutMs: number;
  }
) {
  const script = resolveScriptPath(FULL_SCRAPER_FILE);
  const chunks = Array.from({ length: PROCESS_COUNT }, () => [] as string[]);
  vaList.forEach((va, index) => chunks[index % PROCESS_COUNT].push(va));
  const active = chunks.filter((chunk) => chunk.length > 0);
  const batch = `matchmaker-${matchmakingId}-${crypto.randomUUID()}`;

  await Promise.all(
    active.map((chunk, index) => {
      const numbers = chunk.map(Number).filter(Number.isFinite);
      const min = Math.min(...numbers);
      const max = Math.max(...numbers);

      return runNodeScript(
        script,
        ["1", "1"],
        {
          FP_TOTAL_VA_LIST: chunk.join(","),
          FP_TOTAL_RUN_KIND: "retry",
          FP_TOTAL_RESULTS: "true",
          FP_TOTAL_WORKERS: String(WORKERS_PER_PROCESS),
          WORKERS: String(WORKERS_PER_PROCESS),
          FP_TOTAL_TIMEOUT_MS: String(opts.scrapeTimeoutMs),
          FP_TOTAL_LOGIN_RETRIES: "1",
          FP_TOTAL_TRANSIENT_RETRIES: "1",
          FP_SKIP_RUN_TERMINATOR: "true",
          FP_TOTAL_BATCH_ID: batch,
          FP_TOTAL_BATCH_PART: String(index + 1),
          FP_TOTAL_BATCH_PARTS: String(active.length),
          FP_TOTAL_BATCH_START_VA: String(min),
          FP_TOTAL_BATCH_END_VA: String(max),
          // De gekopieerde Matchmaker-scraper leest deze historische env-namen nog.
          // De scraperfile zelf is fysiek Matchmaker-eigen.
          FP_ADMIN_MATCHMAKING_ID: matchmakingId,
          FP_ADMIN_CONTROLE_RUN_ID: runId,
          STAGGER_MS: String(opts.staggerMs),
          TAB_ATTEMPTS: String(opts.tabAttempts),
          SOFT_WAIT_MS: String(opts.softWaitMs),
          BETWEEN_ATTEMPTS_MS: String(opts.betweenAttemptsMs),
          HEADLESS: process.env.HEADLESS ?? "false",
          PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "false",
        },
        `fp_matchmaker_full_${index + 1}`
      );
    })
  );

  return { batch, processes: active.length };
}

export async function POST(req: Request) {
  let matchmakingId: string | null = null;
  let runId: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    matchmakingId = String(body?.matchmaking_id ?? "").trim() || null;
    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt." }, { status: 400 });
    }

    const { userId, role } = await requireUserWithRole(req);
    if (!roleAllowed(role)) {
      return NextResponse.json({ error: "Geen toegang tot Matchmaker-controle." }, { status: 403 });
    }
    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });

    const opts = {
      staggerMs: clampInt(body?.stagger_ms ?? 450, 450, 0, 5000),
      tabAttempts: clampInt(body?.tab_attempts ?? 5, 5, 1, 30),
      softWaitMs: clampInt(body?.soft_wait_ms ?? 200, 200, 0, 5000),
      betweenAttemptsMs: clampInt(body?.between_attempts_ms ?? 350, 350, 0, 5000),
      scrapeTimeoutMs: clampInt(body?.scrape_timeout_ms ?? 120000, 120000, 30000, 300000),
    };

    await abortOwnRunning(matchmakingId);
    runId = await createRun(matchmakingId, userId ?? null, role ?? null);

    const bouts = await loadBouts(matchmakingId);
    if (!bouts.length) throw new Error("Geen actieve partijen gevonden.");

    const vaSet = new Set<string>();
    for (const bout of bouts) {
      const rood = pickVA(bout, "rood");
      const blauw = pickVA(bout, "blauw");
      if (rood) vaSet.add(rood);
      if (blauw) vaSet.add(blauw);
    }

    const vaList = [...vaSet];
    if (!vaList.length) throw new Error("Geen geldige VA-nummers gevonden.");

    await updateRun(runId, {
      totaal_aantal: vaList.length,
      progress: 12,
      current_step: `FightPassport-controle wordt uitgevoerd · ${vaList.length} vechters`,
    });

    const scrape = await runFullScrape(matchmakingId, runId, vaList, opts);

    await updateRun(runId, {
      verwerkt_aantal: vaList.length,
      progress: 74,
      current_step: "Matchmaker context opbouwen en verrijken...",
    });

    await buildControleBoutContext(matchmakingId, runId);
    await enrichControleBoutContext(matchmakingId, runId);

    const { data: ctx, error: ctxError } = await supabase
      .from("controle_bout_context")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq("controle_run_id", runId)
      .order("partij_nr");

    if (ctxError) throw ctxError;
    if (!ctx?.length) throw new Error("Geen Matchmaker controle_bout_context opgebouwd.");

    await updateRun(runId, {
      progress: 86,
      current_step: "Matchmaker rules-engine draait...",
    });

    const hits = await rulesEngine({
      matchmaking_id: matchmakingId,
      controle_run_id: runId,
      ctxRows: ctx,
    });

    // 24h-regel: uitsluitend eerder goedgekeurd partij-/recordverschil blijft staan
    // wanneer exact dezelfde twee VA-nummers binnen dezelfde matchmaking gekoppeld zijn.
    // Partijnummer, hoekvolgorde en technisch bout-id zijn niet leidend.
    // Alle overige regels worden altijd opnieuw beoordeeld op de actuele data.
    const carried = await carryApprovedRecordDifferenceReviews({
      supabase,
      matchmakingId,
      runId,
      currentContextRows: ctx,
    });

    // Geen oude context/resultaten verwijderen: eerdere runs en besluiten blijven historie.
    await updateRun(runId, {
      status: "klaar",
      afgerond_op: new Date().toISOString(),
      progress: 100,
      verwerkt_aantal: vaList.length,
      current_step: carried
        ? `Controle klaar. ${carried} eerder goedgekeurde partijverschil-beoordeling(en) behouden.`
        : "Controle klaar.",
      is_latest: true,
      foutmelding: null,
    });

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      controle_run_id: runId,
      source: "matchmaker_total",
      scraper: {
        file: FULL_SCRAPER_FILE,
        va_count: vaList.length,
        processes: scrape.processes,
        workers_per_process: WORKERS_PER_PROCESS,
        batch_id: scrape.batch,
      },
      context_rows: ctx.length,
      rules_hits: Array.isArray(hits) ? hits.length : 0,
      carried_record_difference_reviews: carried,
    });
  } catch (error: any) {
    console.error("[control-engine/matchmaker/full/start]", error);

    if (runId) {
      await updateRun(runId, {
        status: "failed",
        foutmelding: error?.message ?? String(error),
        afgerond_op: new Date().toISOString(),
        current_step: "Matchmakercontrole mislukt.",
      });
    }

    return NextResponse.json(
      {
        ok: false,
        matchmaking_id: matchmakingId,
        controle_run_id: runId,
        error: error?.message ?? String(error),
      },
      { status: 500 }
    );
  }
}
