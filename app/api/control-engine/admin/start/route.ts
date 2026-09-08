// app/api/control-engine/admin/start/route.ts
//
// ADMINCONTROLE
// - eigen full scraper: fp_bundle_admin/scraper_fp_admin.js
// - scope: uitsluitend VA's uit deze matchmaking
// - 3 processen x 8 workers
// - daarna verse SPORTSCHOLEN-tegel als extra bewijs voor enrich
// - rulesEngine bouwt de actuele meldingen volledig opnieuw op
// - eerdere handmatige reviews worden alleen teruggezet als dezelfde regel
//   in de nieuwe run opnieuw bestaat
//
// Dispensatie_requests worden hier NOOIT verwijderd.

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { buildControleBoutContext } from "@/lib/control/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/control/enrichControleBoutContext";
import { rulesEngine } from "@/lib/rulesEngine";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
} from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const FULL_SCRAPER_FILE = "scraper_fp_admin.js";
const SCHOOL_SCRAPER_FILE = "scraper_fp_admin_school.js";
const PROCESS_COUNT = 3;
const WORKERS_PER_PROCESS = 8;

type ReviewRow = {
  partij_nr?: number | null;
  bout_id?: string | null;
  rule_code?: string | null;
  hoek?: string | null;
  toernooi_code?: string | null;
  fighter_id?: string | null;
  toernooi_va_nummer?: string | null;
  review_status?: string | null;
  review_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  aantekeningen?: string | null;
};

function toVaStrict(value: any): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

function pickVA(row: any, side: "rood" | "blauw"): string | null {
  if (side === "rood") {
    return (
      toVaStrict(row?.va_rood) ??
      toVaStrict(row?.rood_va) ??
      toVaStrict(row?.rood_va_mm) ??
      null
    );
  }
  return (
    toVaStrict(row?.va_blauw) ??
    toVaStrict(row?.blauw_va) ??
    toVaStrict(row?.blauw_va_mm) ??
    null
  );
}

function clampInt(value: any, fallback: number, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function isRoleAllowedForRoute(role: string | null | undefined) {
  return role === "admin" || role === "superadmin";
}

function resolveScriptPath(file: string) {
  const root = process.cwd();
  const candidates = [
    path.join(root, "ControlEngine", "scrapers", "fp_bundle_admin", file),
    path.join(root, "ControlEngine", "ControlEngine", "scrapers", "fp_bundle_admin", file),
    path.join(root, "control-engine", "scrapers", "fp_bundle_admin", file),
    path.join(root, "control-engine", "control-engine", "scrapers", "fp_bundle_admin", file),
    path.join(root, "scrapers", "fp_bundle_admin", file),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`Admin scraper niet gevonden: ${file}\n- ${candidates.join("\n- ")}`);
  return found;
}

function runNodeScript(
  scriptPath: string,
  args: string[],
  envExtra?: Record<string, string>,
  logPrefix?: string,
): Promise<{ stdout: string; stderr: string; ms: number }> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
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
      process.stdout.write(logPrefix ? `[${logPrefix}] ${text}` : text);
    });
    child.stderr?.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(logPrefix ? `[${logPrefix}] ${text}` : text);
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      const ms = Date.now() - startedAt;
      if (code === 0) return resolve({ stdout, stderr, ms });
      reject(
        new Error(
          `Script failed: ${scriptPath} (exit code ${code})\n(ms=${ms})\nSTDERR:\n${stderr}\nSTDOUT:\n${stdout}`,
        ),
      );
    });
  });
}

async function updateRunProgress(controle_run_id: string, patch: Record<string, any>) {
  const { error } = await supabase
    .from("controle_runs")
    .update(patch)
    .eq("id", controle_run_id);
  if (error) {
    console.warn("[control-engine/admin/start] progress update warning:", error.message);
  }
}

async function abortActiveRuns(matchmaking_id: string) {
  const { error } = await supabase
    .from("controle_runs")
    .update({
      status: "aborted",
      afgerond_op: new Date().toISOString(),
      is_latest: false,
      foutmelding: "Automatisch afgebroken omdat een nieuwe admincontrole is gestart.",
    })
    .eq("matchmaking_id", matchmaking_id)
    .eq("status", "running");
  if (error) throw error;
}

async function createControleRun(args: {
  matchmaking_id: string;
  userId: string | null;
  role: string | null;
}) {
  const { data, error } = await supabase
    .from("controle_runs")
    .insert({
      matchmaking_id: args.matchmaking_id,
      gestart_door_user_id: args.userId,
      gestart_door_rol: args.role,
      status: "running",
      gestart_op: new Date().toISOString(),
      run_type: "control-engine-admin-total",
      is_latest: true,
      totaal_aantal: 0,
      verwerkt_aantal: 0,
      progress: 0,
      current_step: "Admincontrole wordt gestart...",
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error("controle_run insert gaf geen id terug.");

  const { error: latestError } = await supabase
    .from("controle_runs")
    .update({ is_latest: false })
    .eq("matchmaking_id", args.matchmaking_id)
    .neq("id", data.id);
  if (latestError) {
    console.warn("[control-engine/admin/start] andere runs is_latest=false warning:", latestError.message);
  }

  return String(data.id);
}

async function cleanupPreviousContext(matchmaking_id: string) {
  // controle_resultaten bewust NOG NIET verwijderen: zolang de nieuwe run niet
  // geslaagd is, blijft de vorige beoordeling beschikbaar. Na succes verwijderen
  // we alleen de oude resultaat-rows. Dispensaties blijven altijd staan.
  const tables = [
    "controle_bout_context",
    "controle_toernooi_context",
    "controle_uitslagen",
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("matchmaking_id", matchmaking_id);
    if (error && String((error as any)?.code ?? "") !== "42P01") throw error;
  }
}

async function cleanupStaleLiveRows(matchmaking_id: string) {
  const { error } = await supabase
    .from("controle_fighter_actueel")
    .delete()
    .eq("matchmaking_id", matchmaking_id);
  if (error && String((error as any)?.code ?? "") !== "42P01") throw error;
}

async function loadActiveBouts(matchmaking_id: string) {
  const { data, error } = await supabase
    .from("matchmaking_bouts_raw")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .or("verwijderd.is.null,verwijderd.eq.false")
    .order("partij_nr", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function normReviewStatus(value: any): "approved" | "rejected" | null {
  const s = String(value ?? "").trim().toLowerCase();
  if (["approved", "approve", "goedgekeurd", "ok"].includes(s)) return "approved";
  if (["rejected", "reject", "afgekeurd", "afkeur"].includes(s)) return "rejected";
  return null;
}

function reviewKey(row: ReviewRow, includeBoutId: boolean) {
  const parts = [
    String(row?.partij_nr ?? ""),
    includeBoutId ? String(row?.bout_id ?? "") : "",
    String(row?.rule_code ?? "").trim().toLowerCase(),
    String(row?.hoek ?? "").trim().toLowerCase(),
    String(row?.toernooi_code ?? "").trim().toUpperCase(),
    String(row?.fighter_id ?? "").replace(/\D/g, ""),
    String(row?.toernooi_va_nummer ?? "").replace(/\D/g, ""),
  ];
  return parts.join("|");
}

async function loadPreviousReviewedResults(matchmaking_id: string): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from("controle_resultaten")
    .select("partij_nr,bout_id,rule_code,hoek,toernooi_code,fighter_id,toernooi_va_nummer,review_status,review_note,reviewed_by,reviewed_at,aantekeningen,created_at")
    .eq("matchmaking_id", matchmaking_id)
    .not("review_status", "is", null)
    .order("reviewed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).filter((row: any) => !!normReviewStatus(row?.review_status));
}

async function carryForwardReviews(args: {
  matchmaking_id: string;
  controle_run_id: string;
  previous: ReviewRow[];
}) {
  if (!args.previous.length) return 0;

  const strictMap = new Map<string, ReviewRow>();
  const fallbackMap = new Map<string, ReviewRow>();
  for (const row of args.previous) {
    const strict = reviewKey(row, true);
    const fallback = reviewKey(row, false);
    if (!strictMap.has(strict)) strictMap.set(strict, row);
    if (!fallbackMap.has(fallback)) fallbackMap.set(fallback, row);
  }

  const { data: current, error } = await supabase
    .from("controle_resultaten")
    .select("id,partij_nr,bout_id,rule_code,hoek,toernooi_code,fighter_id,toernooi_va_nummer")
    .eq("matchmaking_id", args.matchmaking_id)
    .eq("controle_run_id", args.controle_run_id);
  if (error) throw error;

  let carried = 0;
  for (const row of current ?? []) {
    const prev = strictMap.get(reviewKey(row, true)) ?? fallbackMap.get(reviewKey(row, false));
    if (!prev) continue;

    const normalized = normReviewStatus(prev.review_status);
    if (!normalized) continue;

    const patch: Record<string, any> = {
      review_status: prev.review_status ?? null,
      review_note: prev.review_note ?? null,
      reviewed_by: prev.reviewed_by ?? null,
      reviewed_at: prev.reviewed_at ?? null,
      aantekeningen: prev.aantekeningen ?? null,
    };

    if (normalized === "approved") {
      patch.resultaat = "OK";
      patch.actie_status = "goedgekeurd";
    } else {
      patch.resultaat = "AFKEUR";
      patch.actie_status = "afgekeurd";
    }

    const { error: updateError } = await supabase
      .from("controle_resultaten")
      .update(patch)
      .eq("id", (row as any).id);
    if (updateError) throw updateError;
    carried += 1;
  }

  return carried;
}

async function deleteOldResultRows(matchmaking_id: string, controle_run_id: string) {
  const { error } = await supabase
    .from("controle_resultaten")
    .delete()
    .eq("matchmaking_id", matchmaking_id)
    .neq("controle_run_id", controle_run_id);
  if (error) throw error;
}

async function runAdminFullScrape(args: {
  matchmaking_id: string;
  vaNummers: string[];
  staggerMs: number;
  tabAttempts: number;
  softWaitMs: number;
  betweenAttemptsMs: number;
  scrapeTimeoutMs: number;
}) {
  const scraperPath = resolveScriptPath(FULL_SCRAPER_FILE);
  const chunks: string[][] = Array.from({ length: PROCESS_COUNT }, () => []);
  args.vaNummers.forEach((va, index) => chunks[index % PROCESS_COUNT].push(va));
  const activeChunks = chunks.filter((chunk) => chunk.length > 0);
  const adminBatchId = `admin-${args.matchmaking_id}-${crypto.randomUUID()}`;

  const scrapeResults = await Promise.all(
    activeChunks.map((chunk, index) => {
      const numeric = chunk.map(Number).filter(Number.isFinite);
      const minVa = numeric.length ? Math.min(...numeric) : 1;
      const maxVa = numeric.length ? Math.max(...numeric) : minVa;

      return runNodeScript(
        scraperPath,
        ["1", "1"],
        {
          FP_TOTAL_VA_LIST: chunk.join(","),
          FP_TOTAL_RUN_KIND: "retry",
          FP_TOTAL_RESULTS: "true",
          FP_TOTAL_WORKERS: String(WORKERS_PER_PROCESS),
          WORKERS: String(WORKERS_PER_PROCESS),
          FP_TOTAL_TIMEOUT_MS: String(args.scrapeTimeoutMs),
          FP_TOTAL_LOGIN_RETRIES: "1",
          FP_TOTAL_TRANSIENT_RETRIES: "1",
          FP_SKIP_RUN_TERMINATOR: "true",
          FP_TOTAL_BATCH_ID: adminBatchId,
          FP_TOTAL_BATCH_PART: String(index + 1),
          FP_TOTAL_BATCH_PARTS: String(activeChunks.length),
          FP_TOTAL_BATCH_START_VA: String(minVa),
          FP_TOTAL_BATCH_END_VA: String(maxVa),
          STAGGER_MS: String(args.staggerMs),
          TAB_ATTEMPTS: String(args.tabAttempts),
          SOFT_WAIT_MS: String(args.softWaitMs),
          BETWEEN_ATTEMPTS_MS: String(args.betweenAttemptsMs),
          HEADLESS: process.env.HEADLESS ?? "false",
          PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "false",
        },
        `fp_admin_full_${index + 1}`,
      );
    }),
  );

  return {
    batchId: adminBatchId,
    processes: activeChunks.length,
    maxMs: scrapeResults.length ? Math.max(...scrapeResults.map((r) => r.ms)) : 0,
  };
}

async function runAdminSportschoolPass(args: {
  matchmaking_id: string;
  controle_run_id: string;
  vaNummers: string[];
  scrapeTimeoutMs: number;
}) {
  const schoolPath = resolveScriptPath(SCHOOL_SCRAPER_FILE);
  await runNodeScript(
    schoolPath,
    [args.matchmaking_id, args.controle_run_id, ...args.vaNummers],
    {
      FP_OFFICIALS_WORKERS: String(WORKERS_PER_PROCESS),
      WORKERS: String(WORKERS_PER_PROCESS),
      FP_OFFICIALS_TIMEOUT_MS: String(args.scrapeTimeoutMs),
      FP_OFFICIALS_ALLOW_INCOMPLETE_EXIT: "1",
      HEADLESS: process.env.HEADLESS ?? "false",
      PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "false",
    },
    "fp_admin_sportschool",
  );
}

export async function POST(req: Request) {
  let matchmaking_id: string | null = null;
  let controle_run_id: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    matchmaking_id = String(body?.matchmaking_id ?? "").trim() || null;
    if (!matchmaking_id) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt." }, { status: 400 });
    }

    const { userId, role } = await requireUserWithRole(req);
    if (!isRoleAllowedForRoute(role)) {
      return NextResponse.json({ error: "Geen toegang tot admin start route." }, { status: 403 });
    }
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    const staggerMs = clampInt(body?.stagger_ms ?? 450, 450, 0, 5000);
    const tabAttempts = clampInt(body?.tab_attempts ?? 5, 5, 1, 30);
    const softWaitMs = clampInt(body?.soft_wait_ms ?? 200, 200, 0, 5000);
    const betweenAttemptsMs = clampInt(body?.between_attempts_ms ?? 350, 350, 0, 5000);
    const scrapeTimeoutMs = clampInt(body?.scrape_timeout_ms ?? 120000, 120000, 30000, 300000);

    await abortActiveRuns(matchmaking_id);

    // Reviews eerst veilig in geheugen pakken. De oude resultaat-rows blijven
    // tijdens de nieuwe run ook nog staan, zodat een mislukte run niets wist.
    const previousReviews = await loadPreviousReviewedResults(matchmaking_id);
    await cleanupPreviousContext(matchmaking_id);

    controle_run_id = await createControleRun({
      matchmaking_id,
      userId: userId ?? null,
      role: role ?? null,
    });

    await updateRunProgress(controle_run_id, {
      progress: 5,
      current_step: "Partijen en VA-nummers verzamelen...",
    });

    const bouts = await loadActiveBouts(matchmaking_id);
    if (!bouts.length) throw new Error("Deze matchmaking bevat geen actieve partijen om te controleren.");

    const vaSet = new Set<string>();
    for (const bout of bouts) {
      const rood = pickVA(bout, "rood");
      const blauw = pickVA(bout, "blauw");
      if (rood) vaSet.add(rood);
      if (blauw) vaSet.add(blauw);
    }

    const vaNummers = [...vaSet];
    if (!vaNummers.length) throw new Error("Geen geldige VA-nummers gevonden in deze matchmaking.");

    await updateRunProgress(controle_run_id, {
      totaal_aantal: vaNummers.length,
      verwerkt_aantal: 0,
      progress: 12,
      current_step: `Volledige admin FightPassport-scrape: ${vaNummers.length} vechters (3 x 8 workers)...`,
    });

    const full = await runAdminFullScrape({
      matchmaking_id,
      vaNummers,
      staggerMs,
      tabAttempts,
      softWaitMs,
      betweenAttemptsMs,
      scrapeTimeoutMs,
    });

    await updateRunProgress(controle_run_id, {
      verwerkt_aantal: vaNummers.length,
      progress: 62,
      current_step: "Actuele SPORTSCHOLEN-tegel uitlezen als extra bewijs...",
    });

    // Alleen stale live rows verwijderen VOORDAT de nieuwe sportschoolpass draait.
    await cleanupStaleLiveRows(matchmaking_id);
    await runAdminSportschoolPass({
      matchmaking_id,
      controle_run_id,
      vaNummers,
      scrapeTimeoutMs,
    });

    await updateRunProgress(controle_run_id, {
      progress: 74,
      current_step: "Verse data verwerken: context + sportschoolherkenning...",
    });

    await buildControleBoutContext(matchmaking_id, controle_run_id);
    await enrichControleBoutContext(matchmaking_id, controle_run_id);

    const { data: ctxRows, error: ctxError } = await supabase
      .from("controle_bout_context")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", controle_run_id)
      .order("partij_nr", { ascending: true });

    if (ctxError) throw ctxError;
    if (!ctxRows?.length) throw new Error("Geen controle_bout_context gevonden na admin rebuild.");

    await updateRunProgress(controle_run_id, {
      progress: 86,
      current_step: "RulesEngine draait op de verse volledige scrape...",
    });

    const hits = await rulesEngine({
      matchmaking_id,
      controle_run_id,
      ctxRows,
    });

    // Alleen reviews terugzetten op regels die door DEZE verse rulesEngine-run
    // opnieuw zijn aangemaakt. Verdwenen regels blijven dus echt verdwenen.
    const carriedReviews = await carryForwardReviews({
      matchmaking_id,
      controle_run_id,
      previous: previousReviews,
    });

    // Pas nu de oude meldingen verwijderen. Als de run eerder faalt blijven ze staan.
    await deleteOldResultRows(matchmaking_id, controle_run_id);

    await updateRunProgress(controle_run_id, {
      totaal_aantal: vaNummers.length,
      verwerkt_aantal: vaNummers.length,
      progress: 100,
      current_step: carriedReviews > 0
        ? `Controle klaar. ${carriedReviews} eerdere beoordeling(en) behouden.`
        : "Controle klaar.",
      status: "klaar",
      afgerond_op: new Date().toISOString(),
      is_latest: true,
      foutmelding: null,
    });

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      controle_run_id,
      source: "admin_total_matchmaking",
      scraper: {
        file: FULL_SCRAPER_FILE,
        school_file: SCHOOL_SCRAPER_FILE,
        scope: "matchmaking_va_list_only",
        va_count: vaNummers.length,
        processes: full.processes,
        configured_processes: PROCESS_COUNT,
        workers_per_process: WORKERS_PER_PROCESS,
        batch_id: full.batchId,
      },
      context_rows: ctxRows.length,
      rules_hits: Array.isArray(hits) ? hits.length : 0,
      carried_reviews: carriedReviews,
    });
  } catch (error: any) {
    console.error("[control-engine/admin/start] ❌ fout:", error);

    if (controle_run_id) {
      await supabase
        .from("controle_runs")
        .update({
          status: "failed",
          foutmelding: error?.message ?? String(error),
          afgerond_op: new Date().toISOString(),
          current_step: "Controle mislukt. Vorige beoordeelde resultaten zijn niet opgeruimd.",
        })
        .eq("id", controle_run_id);
    }

    return NextResponse.json(
      {
        ok: false,
        matchmaking_id,
        controle_run_id,
        error: error?.message ?? String(error),
      },
      { status: 500 },
    );
  }
}
