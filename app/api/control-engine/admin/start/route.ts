// app/api/control-engine/admin/start/route.ts
//
// Admincontrole gebruikt bewust een EIGEN scraperbestand:
//   ControlEngine/scrapers/fp_bundle_admin/scraper_fp_admin.js
//
// Dat bestand is inhoudelijk gelijk aan de actuele Total-scraper, maar deze route
// geeft hem uitsluitend de VA-nummers uit één matchmaking_id mee.
//
// Flow:
// 1. admin/superadmin + toegang matchmaking
// 2. nieuwe controle_run
// 3. alle unieke VA-nummers uit actieve partijen verzamelen
// 4. admin scraper draaien in 3 processen x 8 workers
// 5. Total-tabellen zijn daarna actueel voor precies deze vechters
// 6. oude live-snapshot van deze matchmaking verwijderen, zodat die de verse
//    Total-data niet kan overschrijven
// 7. controle-context opnieuw bouwen + enrich + rulesEngine
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

const SCRAPER_FILE = "scraper_fp_admin.js";
const PROCESS_COUNT = 3;
const WORKERS_PER_PROCESS = 8;

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

function resolveScriptPath(...parts: string[]) {
  const root = process.cwd();
  const candidates = [
    path.join(root, ...parts),
    path.join(root, "ControlEngine", ...parts),
    path.join(root, "ControlEngine", "ControlEngine", ...parts),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`Script niet gevonden:\n- ${candidates.join("\n- ")}`);
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
      env: {
        ...process.env,
        ...envExtra,
      },
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

    child.on("error", (error) => {
      reject(
        new Error(
          `Script spawn error: ${error?.message ?? error}\nSTDERR:\n${stderr}\nSTDOUT:\n${stdout}`,
        ),
      );
    });

    child.on("close", (code) => {
      const ms = Date.now() - startedAt;
      if (code === 0) {
        resolve({ stdout, stderr, ms });
        return;
      }

      reject(
        new Error(
          `Script failed: ${scriptPath} (exit code ${code})\n(ms=${ms})\nSTDERR:\n${stderr}\nSTDOUT:\n${stdout}`,
        ),
      );
    });
  });
}

async function updateRunProgress(
  controle_run_id: string,
  patch: Record<string, any>,
) {
  const { error } = await supabase
    .from("controle_runs")
    .update(patch)
    .eq("id", controle_run_id);

  if (error) {
    console.warn(
      "[control-engine/admin/start] progress update warning:",
      error.message,
    );
  }
}

async function abortActiveRuns(matchmaking_id: string) {
  const { error } = await supabase
    .from("controle_runs")
    .update({
      status: "aborted",
      afgerond_op: new Date().toISOString(),
      is_latest: false,
      foutmelding:
        "Automatisch afgebroken omdat een nieuwe admincontrole is gestart.",
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
    console.warn(
      "[control-engine/admin/start] andere runs is_latest=false warning:",
      latestError.message,
    );
  }

  return String(data.id);
}

async function cleanupPreviousControlView(matchmaking_id: string) {
  // Bewust GEEN dispensatie_requests verwijderen.
  // Bewust GEEN centrale Total-tabellen verwijderen: de admin-scraper ververst
  // alleen de VA's die in deze matchmaking voorkomen.
  const tables = [
    "controle_resultaten",
    "controle_bout_context",
    "controle_toernooi_context",
    "controle_uitslagen",
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("matchmaking_id", matchmaking_id);

    if (error && String((error as any)?.code ?? "") !== "42P01") {
      throw error;
    }
  }
}

async function cleanupStaleLiveRows(matchmaking_id: string) {
  // De oude admin/official live-snapshot mag de verse Total-equivalente scrape
  // niet overschrijven in buildControleBoutContext/enrichControleBoutContext.
  const { error } = await supabase
    .from("controle_fighter_actueel")
    .delete()
    .eq("matchmaking_id", matchmaking_id);

  if (error && String((error as any)?.code ?? "") !== "42P01") {
    throw error;
  }
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

export async function POST(req: Request) {
  let matchmaking_id: string | null = null;
  let controle_run_id: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    matchmaking_id = String(body?.matchmaking_id ?? "").trim() || null;

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt." },
        { status: 400 },
      );
    }

    const { userId, role } = await requireUserWithRole(req);

    if (!isRoleAllowedForRoute(role)) {
      return NextResponse.json(
        { error: "Geen toegang tot admin start route." },
        { status: 403 },
      );
    }

    await assertCanAccessMatchmaking({
      matchmaking_id,
      userId,
      role,
    });

    const staggerMs = clampInt(body?.stagger_ms ?? 450, 450, 0, 5000);
    const tabAttempts = clampInt(body?.tab_attempts ?? 5, 5, 1, 30);
    const softWaitMs = clampInt(body?.soft_wait_ms ?? 200, 200, 0, 5000);
    const betweenAttemptsMs = clampInt(
      body?.between_attempts_ms ?? 350,
      350,
      0,
      5000,
    );
    const scrapeTimeoutMs = clampInt(
      body?.scrape_timeout_ms ?? 120000,
      120000,
      30000,
      300000,
    );

    await abortActiveRuns(matchmaking_id);
    await cleanupPreviousControlView(matchmaking_id);

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
    if (!bouts.length) {
      throw new Error(
        "Deze matchmaking bevat geen actieve partijen om te controleren.",
      );
    }

    const vaSet = new Set<string>();
    for (const bout of bouts) {
      const rood = pickVA(bout, "rood");
      const blauw = pickVA(bout, "blauw");
      if (rood) vaSet.add(rood);
      if (blauw) vaSet.add(blauw);
    }

    const vaNummers = [...vaSet];
    if (!vaNummers.length) {
      throw new Error(
        "Geen geldige VA-nummers gevonden in deze matchmaking.",
      );
    }

    await updateRunProgress(controle_run_id, {
      totaal_aantal: vaNummers.length,
      verwerkt_aantal: 0,
      progress: 15,
      current_step:
        `Volledige FightPassport-scrape: ${vaNummers.length} vechters (3 x 8 workers)...`,
    });

    const scraperPath = resolveScriptPath(
      "scrapers",
      "fp_bundle_admin",
      SCRAPER_FILE,
    );

    const chunks: string[][] = Array.from(
      { length: PROCESS_COUNT },
      () => [],
    );

    vaNummers.forEach((va, index) => {
      chunks[index % PROCESS_COUNT].push(va);
    });

    const activeChunks = chunks.filter((chunk) => chunk.length > 0);
    const adminBatchId = `admin-${matchmaking_id}-${crypto.randomUUID()}`;

    const scrapeResults = await Promise.all(
      activeChunks.map((chunk, index) => {
        const numeric = chunk.map(Number).filter(Number.isFinite);
        const minVa = numeric.length ? Math.min(...numeric) : 1;
        const maxVa = numeric.length ? Math.max(...numeric) : minVa;

        return runNodeScript(
          scraperPath,
          // De admin-scraper is een zelfstandige Total-variant. De scope komt
          // uitsluitend via FP_TOTAL_VA_LIST; er wordt dus NOOIT een volledig
          // VA-bereik doorlopen vanuit de admincontrole.
          ["1", "1"],
          {
            FP_TOTAL_VA_LIST: chunk.join(","),
            FP_TOTAL_RUN_KIND: "retry",
            FP_TOTAL_RESULTS: "true",
            FP_TOTAL_WORKERS: String(WORKERS_PER_PROCESS),
            WORKERS: String(WORKERS_PER_PROCESS),
            FP_TOTAL_TIMEOUT_MS: String(scrapeTimeoutMs),
            FP_TOTAL_LOGIN_RETRIES: "1",
            FP_TOTAL_TRANSIENT_RETRIES: "1",
            FP_SKIP_RUN_TERMINATOR: "true",
            FP_TOTAL_BATCH_ID: adminBatchId,
            FP_TOTAL_BATCH_PART: String(index + 1),
            FP_TOTAL_BATCH_PARTS: String(activeChunks.length),
            FP_TOTAL_BATCH_START_VA: String(minVa),
            FP_TOTAL_BATCH_END_VA: String(maxVa),
            STAGGER_MS: String(staggerMs),
            TAB_ATTEMPTS: String(tabAttempts),
            SOFT_WAIT_MS: String(softWaitMs),
            BETWEEN_ATTEMPTS_MS: String(betweenAttemptsMs),
            HEADLESS: process.env.HEADLESS ?? "false",
            PUPPETEER_HEADLESS:
              process.env.PUPPETEER_HEADLESS ??
              process.env.HEADLESS ??
              "false",
          },
          `fp_admin_total_${index + 1}`,
        );
      }),
    );

    console.log(
      "[control-engine/admin/start] ✅ admin Total-equivalente scrape 3x8 klaar",
      {
        matchmaking_id,
        controle_run_id,
        process_count: activeChunks.length,
        workers_per_process: WORKERS_PER_PROCESS,
        va_count: vaNummers.length,
        ms: Math.max(...scrapeResults.map((r) => r.ms)),
      },
    );

    await updateRunProgress(controle_run_id, {
      verwerkt_aantal: vaNummers.length,
      progress: 65,
      current_step: "Verse Total-data verwerken in admincontrole...",
    });

    // Oude live-status verwijderen zodat de net gescrapete centrale Total-data
    // leidend is. buildControleBoutContext valt dan voor licentie/startverbod
    // rechtstreeks terug op fightpassport_fighters en voor uitslagen op
    // fightpassport_results. Enrich gebruikt opgeslagen FP-sportschooldata.
    await cleanupStaleLiveRows(matchmaking_id);

    await buildControleBoutContext(matchmaking_id, controle_run_id);
    await enrichControleBoutContext(matchmaking_id, controle_run_id);

    const { data: ctxRows, error: ctxError } = await supabase
      .from("controle_bout_context")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", controle_run_id)
      .order("partij_nr", { ascending: true });

    if (ctxError) throw ctxError;
    if (!ctxRows?.length) {
      throw new Error(
        "Geen controle_bout_context gevonden na admin Total-rebuild.",
      );
    }

    await updateRunProgress(controle_run_id, {
      progress: 85,
      current_step: "RulesEngine draait op de verse volledige scrape...",
    });

    const hits = await rulesEngine({
      matchmaking_id,
      controle_run_id,
      ctxRows,
    });

    await updateRunProgress(controle_run_id, {
      totaal_aantal: vaNummers.length,
      verwerkt_aantal: vaNummers.length,
      progress: 100,
      current_step: "Controle klaar.",
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
        file: SCRAPER_FILE,
        scope: "matchmaking_va_list_only",
        va_count: vaNummers.length,
        processes: activeChunks.length,
        configured_processes: PROCESS_COUNT,
        workers_per_process: WORKERS_PER_PROCESS,
        batch_id: adminBatchId,
      },
      context_rows: ctxRows.length,
      rules_hits: Array.isArray(hits) ? hits.length : 0,
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
          current_step: "Controle mislukt.",
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
