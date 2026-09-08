// app/api/matchmaker/eindcontrole/start/route.ts
//
// BELANGRIJK:
// - deze full scraper hangt ALLEEN aan de MATCHMAKER EINDCONTROLE;
// - de controle bij inleveren/submit wordt hier NIET aangepast;
// - official houdt zijn eigen kleine gameday-scraper.

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import {
  buildControleBoutContext,
  buildToernooiContext,
} from "@/lib/matchmaker/buildControleBoutContext";
import { enrichEindcontroleBoutContext } from "@/lib/matchmaker/enrichEindcontroleBoutContext";
import { rulesEngine } from "@/lib/matchmaker/rulesEngine";
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

const FINAL_RUN_TYPE = "matchmaker_eindcontrole";
const PROCESS_COUNT = 3;
const WORKERS_PER_PROCESS = 8;
const FULL_SCRAPER = "scraper_fp_matchmaker.js";
const SCHOOL_SCRAPER = "scraper_fp_matchmaker_school.js";

function norm(v: unknown) {
  return String(v ?? "").trim();
}

function toVaStrict(v: unknown): string | null {
  const digits = String(v ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

function pickVA(row: any, side: "rood" | "blauw") {
  const candidates =
    side === "rood"
      ? [row?.rood_va, row?.va_rood, row?.rood_va_mm, row?.rood_va_nummer, row?.rood_fighter_id]
      : [row?.blauw_va, row?.va_blauw, row?.blauw_va_mm, row?.blauw_va_nummer, row?.blauw_fighter_id];

  for (const value of candidates) {
    const va = toVaStrict(value);
    if (va) return va;
  }
  return null;
}

function isRoleAllowed(role: string | null | undefined) {
  return ["matchmaker", "admin", "superadmin"].includes(
    String(role ?? "").toLowerCase(),
  );
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function resolveScriptPath(file: string) {
  const root = process.cwd();
  const candidates = [
    path.join(root, "ControlEngine", "scrapers", "fp_bundle_matchmaker", file),
    path.join(root, "ControlEngine", "ControlEngine", "scrapers", "fp_bundle_matchmaker", file),
    path.join(root, "control-engine", "scrapers", "fp_bundle_matchmaker", file),
    path.join(root, "control-engine", "control-engine", "scrapers", "fp_bundle_matchmaker", file),
    path.join(root, "scrapers", "fp_bundle_matchmaker", file),
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`Matchmaker scraper niet gevonden: ${file}\n- ${candidates.join("\n- ")}`);
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
          `Script failed: ${scriptPath} (exit code ${code})\nSTDERR:\n${stderr}\nSTDOUT:\n${stdout}`,
        ),
      );
    });
  });
}

async function updateRun(controleRunId: string, patch: Record<string, unknown>) {
  const { error } = await supabase
    .from("controle_runs")
    .update(patch)
    .eq("id", controleRunId);
  if (error) console.warn("[matchmaker-eindcontrole] run update mislukt", error);
}

async function abortOlderFinalRuns(matchmakingId: string) {
  await supabase
    .from("controle_runs")
    .update({
      status: "aborted",
      afgerond_op: new Date().toISOString(),
      is_latest: false,
      foutmelding: "Afgebroken omdat een nieuwe eindcontrole is gestart.",
    })
    .eq("matchmaking_id", matchmakingId)
    .eq("run_type", FINAL_RUN_TYPE)
    .eq("status", "running");
}

async function createFinalRun(args: {
  matchmakingId: string;
  userId: string | null;
  role: string | null;
  total: number;
}) {
  const { data, error } = await supabase
    .from("controle_runs")
    .insert({
      matchmaking_id: args.matchmakingId,
      gestart_door_user_id: args.userId,
      gestart_door_rol: args.role,
      status: "running",
      gestart_op: new Date().toISOString(),
      run_type: FINAL_RUN_TYPE,
      is_latest: true,
      totaal_aantal: args.total,
      verwerkt_aantal: 0,
      progress: 2,
      current_step: "Matchmaker eindcontrole wordt voorbereid...",
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error("Geen controle_run_id ontvangen.");

  await supabase
    .from("controle_runs")
    .update({ is_latest: false })
    .eq("matchmaking_id", args.matchmakingId)
    .neq("id", data.id);

  return String(data.id);
}

async function collectVaNumbers(matchmakingId: string) {
  const [{ data: bouts, error: boutsError }, { data: tournamentRows, error: tournamentError }] =
    await Promise.all([
      supabase
        .from("matchmaking_bouts_raw")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .or("verwijderd.is.null,verwijderd.eq.false"),
      supabase
        .from("controle_toernooi_context")
        .select("fighter_id,va_nummer")
        .eq("matchmaking_id", matchmakingId),
    ]);

  if (boutsError) throw boutsError;
  if (tournamentError && String((tournamentError as any)?.code ?? "") !== "42P01") {
    throw tournamentError;
  }

  const vaSet = new Set<string>();
  for (const bout of bouts ?? []) {
    const rood = pickVA(bout, "rood");
    const blauw = pickVA(bout, "blauw");
    if (rood) vaSet.add(rood);
    if (blauw) vaSet.add(blauw);
  }

  for (const row of tournamentRows ?? []) {
    const va = toVaStrict((row as any)?.va_nummer) ?? toVaStrict((row as any)?.fighter_id);
    if (va) vaSet.add(va);
  }

  return { vaNumbers: [...vaSet], bouts: bouts ?? [] };
}

function uniqueBy<T>(arr: T[], getKey: (row: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of arr) {
    const key = getKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

async function runFullMatchmakerScrape(args: {
  matchmakingId: string;
  controleRunId: string;
  vaNumbers: string[];
  staggerMs: number;
  tabAttempts: number;
  softWaitMs: number;
  betweenAttemptsMs: number;
  scrapeTimeoutMs: number;
}) {
  const scriptPath = resolveScriptPath(FULL_SCRAPER);
  const chunks: string[][] = Array.from({ length: PROCESS_COUNT }, () => []);
  args.vaNumbers.forEach((va, index) => chunks[index % PROCESS_COUNT].push(va));
  const activeChunks = chunks.filter((chunk) => chunk.length > 0);
  const batchId = `matchmaker-${args.matchmakingId}-${crypto.randomUUID()}`;

  await Promise.all(
    activeChunks.map((chunk, index) => {
      const numeric = chunk.map(Number).filter(Number.isFinite);
      const minVa = numeric.length ? Math.min(...numeric) : 1;
      const maxVa = numeric.length ? Math.max(...numeric) : minVa;

      return runNodeScript(
        scriptPath,
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
          FP_TOTAL_BATCH_ID: batchId,
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
        `fp_matchmaker_full_${index + 1}`,
      );
    }),
  );

  return { batchId, processes: activeChunks.length };
}

async function runSportschoolEvidencePass(args: {
  matchmakingId: string;
  controleRunId: string;
  vaNumbers: string[];
  scrapeTimeoutMs: number;
}) {
  // Dit is GEEN tweede rules/control-flow. Deze pass leest alleen de actuele
  // SPORTSCHOLEN-tegel (plus de bestaande kleine profielvelden) zodat enrich
  // de actuele FP-sportschool als aanwijzing kan gebruiken.
  const scriptPath = resolveScriptPath(SCHOOL_SCRAPER);
  await runNodeScript(
    scriptPath,
    [args.matchmakingId, args.controleRunId, ...args.vaNumbers],
    {
      FP_OFFICIALS_WORKERS: String(WORKERS_PER_PROCESS),
      WORKERS: String(WORKERS_PER_PROCESS),
      FP_OFFICIALS_TIMEOUT_MS: String(args.scrapeTimeoutMs),
      FP_OFFICIALS_ALLOW_INCOMPLETE_EXIT: "1",
      HEADLESS: process.env.HEADLESS ?? "false",
      PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "false",
    },
    "fp_matchmaker_sportschool",
  );
}

async function finalizeInBackground(args: {
  matchmakingId: string;
  controleRunId: string;
  vaNumbers: string[];
  boutCount: number;
  staggerMs: number;
  tabAttempts: number;
  softWaitMs: number;
  betweenAttemptsMs: number;
  scrapeTimeoutMs: number;
}) {
  try {
    await updateRun(args.controleRunId, {
      progress: 8,
      current_step: `Volledige FightPassport-scrape draait (${args.vaNumbers.length} vechters, 3 x 8 workers)...`,
    });

    const full = await runFullMatchmakerScrape(args);

    await updateRun(args.controleRunId, {
      progress: 58,
      verwerkt_aantal: args.vaNumbers.length,
      current_step: "Actuele SPORTSCHOLEN-tegel uitlezen als extra bewijs...",
    });

    await runSportschoolEvidencePass(args);

    await updateRun(args.controleRunId, {
      progress: 68,
      current_step: "Matchmaker partij-context opnieuw opbouwen...",
    });
    await buildControleBoutContext(args.matchmakingId, args.controleRunId);

    await updateRun(args.controleRunId, {
      progress: 74,
      current_step: "Matchmaker toernooi-context opnieuw opbouwen...",
    });
    const toernooiRows = await buildToernooiContext(args.matchmakingId, args.controleRunId);

    await updateRun(args.controleRunId, {
      progress: 80,
      current_step: "Sportschool aanwijzingen combineren en keurmerk op MM-sportschool controleren...",
    });
    await enrichEindcontroleBoutContext(args.matchmakingId, args.controleRunId);

    const { data: rawCtxRows, error: ctxError } = await supabase
      .from("controle_bout_context")
      .select("*")
      .eq("matchmaking_id", args.matchmakingId)
      .order("partij_nr", { ascending: true })
      .order("created_at", { ascending: false });

    if (ctxError) throw ctxError;

    const currentRows = (rawCtxRows ?? []).filter(
      (row: any) => norm(row?.controle_run_id) === args.controleRunId,
    );
    const ctxRows = currentRows.length
      ? currentRows
      : uniqueBy(rawCtxRows ?? [], (row: any) =>
          norm(
            row?.bout_id ??
              row?.bout_uid ??
              `${row?.partij_nr ?? ""}-${row?.rood_va_mm ?? ""}-${row?.blauw_va_mm ?? ""}`,
          ),
        );

    if (args.boutCount > 0 && !ctxRows.length) {
      throw new Error("Na build/enrich is geen controle_bout_context gevonden.");
    }

    await updateRun(args.controleRunId, {
      progress: 90,
      current_step: "Matchmaker RulesEngine draait op de verse full scrape...",
    });

    const hits = await rulesEngine({
      matchmaking_id: args.matchmakingId,
      controle_run_id: args.controleRunId,
      ctxRows: ctxRows as any[],
    });

    await updateRun(args.controleRunId, {
      status: "klaar",
      afgerond_op: new Date().toISOString(),
      is_latest: true,
      totaal_aantal: args.vaNumbers.length,
      verwerkt_aantal: args.vaNumbers.length,
      progress: 100,
      current_step: "Matchmaker eindcontrole klaar. Rapport is bijgewerkt.",
      foutmelding: null,
    });

    console.log("[matchmaker-eindcontrole] klaar", {
      matchmakingId: args.matchmakingId,
      controleRunId: args.controleRunId,
      vaCount: args.vaNumbers.length,
      batchId: full.batchId,
      processes: full.processes,
      ctxRows: ctxRows.length,
      toernooiRows: Array.isArray(toernooiRows) ? toernooiRows.length : 0,
      hits: Array.isArray(hits) ? hits.length : 0,
    });
  } catch (error: any) {
    console.error("[matchmaker-eindcontrole] mislukt", error);
    await updateRun(args.controleRunId, {
      status: "failed",
      afgerond_op: new Date().toISOString(),
      progress: 100,
      current_step: "Eindcontrole mislukt.",
      foutmelding: error?.message ?? String(error),
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = norm(body?.matchmaking_id);
    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    }

    const { userId, role } = await requireUserWithRole(req);
    if (!isRoleAllowed(role)) {
      return NextResponse.json({ error: "Geen toegang tot matchmaker eindcontrole" }, { status: 403 });
    }
    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });

    await abortOlderFinalRuns(matchmakingId);

    const { vaNumbers, bouts } = await collectVaNumbers(matchmakingId);
    if (!vaNumbers.length) {
      return NextResponse.json(
        { error: "Geen VA-nummers gevonden in deze matchmaking/toernooien." },
        { status: 400 },
      );
    }

    const controleRunId = await createFinalRun({
      matchmakingId,
      userId: userId ?? null,
      role: role ?? null,
      total: vaNumbers.length,
    });

    const staggerMs = clampInt(body?.stagger_ms ?? 450, 450, 0, 5000);
    const tabAttempts = clampInt(body?.tab_attempts ?? 5, 5, 1, 30);
    const softWaitMs = clampInt(body?.soft_wait_ms ?? 200, 200, 0, 5000);
    const betweenAttemptsMs = clampInt(body?.between_attempts_ms ?? 350, 350, 0, 5000);
    const scrapeTimeoutMs = clampInt(body?.scrape_timeout_ms ?? 120000, 120000, 30000, 300000);

    // Zelf-gehoste Next/PM2: de full scrape + sportschoolpass + build/enrich/rules
    // mogen na de 202-response doorlopen. Dit raakt UITSLUITEND de eindcontrole.
    void finalizeInBackground({
      matchmakingId,
      controleRunId,
      vaNumbers,
      boutCount: bouts.length,
      staggerMs,
      tabAttempts,
      softWaitMs,
      betweenAttemptsMs,
      scrapeTimeoutMs,
    });

    return NextResponse.json(
      {
        ok: true,
        started: true,
        matchmaking_id: matchmakingId,
        controle_run_id: controleRunId,
        va_count: vaNumbers.length,
        status: "running",
        scraper: "matchmaker_full",
        scope: "eindcontrole_only",
      },
      { status: 202 },
    );
  } catch (error: any) {
    console.error("[matchmaker-eindcontrole/start] fout", error);
    return NextResponse.json(
      { error: error?.message ?? "Laatste eindcontrole starten mislukt." },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const matchmakingId = norm(url.searchParams.get("matchmaking_id"));
    const controleRunId = norm(url.searchParams.get("controle_run_id"));

    if (!matchmakingId && !controleRunId) {
      return NextResponse.json(
        { error: "matchmaking_id of controle_run_id ontbreekt" },
        { status: 400 },
      );
    }

    const { userId, role } = await requireUserWithRole(req);
    if (!isRoleAllowed(role)) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    if (matchmakingId) {
      await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });
    }

    let query = supabase
      .from("controle_runs")
      .select("id,matchmaking_id,status,gestart_op,afgerond_op,run_type,progress,current_step,totaal_aantal,verwerkt_aantal,foutmelding")
      .eq("run_type", FINAL_RUN_TYPE);

    if (controleRunId) query = query.eq("id", controleRunId);
    if (matchmakingId) query = query.eq("matchmaking_id", matchmakingId);

    const { data, error } = await query
      .order("gestart_op", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ ok: true, run: data ?? null });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Eindcontrole-status ophalen mislukt." },
      { status: 500 },
    );
  }
}
