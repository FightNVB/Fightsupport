// app/api/control-engine/admin/start/route.ts
//
// Flow:
// 1. toegang / eigen bondteam via bestaande assertCanAccessMatchmaking
// 2. nieuwe controle_run
// 3. dezelfde DB-rebuild als de matchmaker: refreshMatchmaking()
// 4. alleen actuele FightPassport live-check:
//      licentie / startverbod / keurmerk
// 5. live waarden in DEZE controle_run over de DB-context leggen
// 6. rulesEngine opnieuw draaien; dit is de uiteindelijke wedstrijddagwaarheid
//
// Dispensatie:
// dispensatie_requests wordt hier NOOIT verwijderd.
// Daardoor blijft een goedgekeurde/afgewezen aanvraag gekoppeld over nieuwe controles.

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import {
  buildControleBoutContext,
  buildToernooiContext,
} from "@/lib/control/buildControleBoutContext";
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

// Admin en officials gebruiken bewust exact dezelfde lichte live-scraper.
// Total is de basis; live lezen we alleen licentie/startverbod/keurmerk.
const SCRAPER_FILE = "scraper_fp_admin.js";

function toVaStrict(value: any): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

function pickVA(row: any, side: "rood" | "blauw"): string | null {
  if (side === "rood") {
    return (
      toVaStrict(row?.rood_va) ??
      toVaStrict(row?.va_rood) ??
      toVaStrict(row?.rood_va_mm) ??
      null
    );
  }

  return (
    toVaStrict(row?.blauw_va) ??
    toVaStrict(row?.va_blauw) ??
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
          process.stdout.write(
            logPrefix ? `[${logPrefix}] ${text}` : text,
          );
        });

        child.stderr?.on("data", (data) => {
          const text = data.toString();
          stderr += text;
          process.stderr.write(
            logPrefix ? `[${logPrefix}] ${text}` : text,
          );
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
      foutmelding:
        "Automatisch afgebroken omdat een nieuwe controle is gestart.",
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
      run_type: "control-engine",
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
  // Bewust GEEN fighters_raw / uitslagen_raw verwijderen:
  // de volledige controle wordt nu uit de DB opgebouwd.
  //
  // Bewust GEEN dispensatie_requests verwijderen:
  // goedgekeurde/afgewezen dispensaties moeten over nieuwe controles blijven bestaan.
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

    if (
      error &&
      String((error as any)?.code ?? "") !== "42P01"
    ) {
      throw error;
    }
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

async function loadLiveChecks(
  matchmaking_id: string,
  controle_run_id: string,
) {
  const { data, error } = await supabase
    .from("controle_fighter_actueel")
    .select(
      "va_nummer,licentie_ok,startverbod_actief,keurmerk_ok,sportschool,land,keurmerk_schild_gevonden,error_message,checked_at",
    )
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id);

  if (error) throw error;
  return data ?? [];
}

async function applyLiveChecksToCurrentContext(args: {
  matchmaking_id: string;
  controle_run_id: string;
  liveRows: any[];
}) {
  const liveByVa = new Map(
    args.liveRows.map((row) => [String(row.va_nummer), row]),
  );

  const { data: contextRows, error } = await supabase
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", args.matchmaking_id)
    .eq("controle_run_id", args.controle_run_id)
    .order("partij_nr", { ascending: true });

  if (error) throw error;

  for (const context of contextRows ?? []) {
    const roodVa =
      toVaStrict(context?.rood_va_mm) ??
      toVaStrict(context?.va_rood) ??
      toVaStrict(context?.rood_va);

    const blauwVa =
      toVaStrict(context?.blauw_va_mm) ??
      toVaStrict(context?.va_blauw) ??
      toVaStrict(context?.blauw_va);

    const rood = roodVa ? liveByVa.get(roodVa) : null;
    const blauw = blauwVa ? liveByVa.get(blauwVa) : null;

    if (roodVa && !rood) {
      throw new Error(
        `Actuele FightPassport-check ontbreekt voor rode hoek VA ${roodVa}, partij ${context?.partij_nr ?? "?"}.`,
      );
    }

    if (blauwVa && !blauw) {
      throw new Error(
        `Actuele FightPassport-check ontbreekt voor blauwe hoek VA ${blauwVa}, partij ${context?.partij_nr ?? "?"}.`,
      );
    }

    const patch: Record<string, any> = {};

    if (rood) {
      patch.rood_licentie = rood.licentie_ok ? "Ja" : "Nee";
      patch.rood_heeft_startverbod = rood.startverbod_actief
        ? "true"
        : "false";
    }

    if (blauw) {
      patch.blauw_licentie = blauw.licentie_ok ? "Ja" : "Nee";
      patch.blauw_heeft_startverbod = blauw.startverbod_actief
        ? "true"
        : "false";
    }

    if (!Object.keys(patch).length) continue;

    const { error: updateError } = await supabase
      .from("controle_bout_context")
      .update(patch)
      .eq("id", context.id)
      .eq("matchmaking_id", args.matchmaking_id)
      .eq("controle_run_id", args.controle_run_id);

    if (updateError) throw updateError;
  }

  return contextRows?.length ?? 0;
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

    const workersPerProcess = 10;
    const processCount = 3;
    const stagger_ms = clampInt(body?.stagger_ms ?? 2500, 2500, 0, 10000);
    // Exact dezelfde operationele timing als de werkende Total start-route.
    const tab_attempts = clampInt(body?.tab_attempts ?? 3, 3, 1, 30);
    const soft_wait_ms = clampInt(
      body?.soft_wait_ms ?? 1500,
      1500,
      200,
      5000,
    );
    const between_attempts_ms = clampInt(
      body?.between_attempts_ms ?? 700,
      700,
      0,
      5000,
    );
    const live_timeout_ms = clampInt(
      body?.live_timeout_ms ?? 150000,
      150000,
      5000,
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
      current_step: "Partijen en VA-nummers voorbereiden...",
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

    const va_nummers = [...vaSet];

    if (!va_nummers.length) {
      throw new Error(
        "Geen geldige VA-nummers gevonden in deze matchmaking.",
      );
    }

    await updateRunProgress(controle_run_id, {
      totaal_aantal: va_nummers.length,
      verwerkt_aantal: 0,
      progress: 45,
      current_step: `Actuele FightPassport-check: ${va_nummers.length} vechters...`,
    });

    const scraperPath = resolveScriptPath(
      "scrapers",
      "fp_bundle_admin",
      SCRAPER_FILE,
    );

    const chunks: string[][] = Array.from({ length: processCount }, () => []);
    va_nummers.forEach((va, index) => {
      chunks[index % processCount].push(va);
    });

    const activeChunks = chunks.filter((chunk) => chunk.length > 0);

    const activeMatchmakingId = matchmaking_id;
    const activeControleRunId = controle_run_id;

    const scrapeResults = await Promise.all(
        activeChunks.map((chunk, index) =>
          runNodeScript(
            scraperPath,
            [activeMatchmakingId, activeControleRunId, ...chunk],
            {
              FP_MATCHMAKER_ID: "",
              FP_SESSION_MODE: "master",
              HEADLESS: process.env.HEADLESS ?? "false",
              PUPPETEER_HEADLESS:
                process.env.PUPPETEER_HEADLESS ??
                process.env.HEADLESS ??
                "false",

              WORKERS: String(workersPerProcess),
              FP_ADMIN_WORKERS: String(workersPerProcess),
              STAGGER_MS: String(stagger_ms),
              TAB_ATTEMPTS: String(tab_attempts),
              SOFT_WAIT_MS: String(soft_wait_ms),
              BETWEEN_ATTEMPTS_MS: String(between_attempts_ms),
              FP_ADMIN_TIMEOUT_MS: String(live_timeout_ms),
              FP_ADMIN_ALLOW_INCOMPLETE_EXIT: "1",
            },
            `fp_admin_live_${index + 1}`,
          ),
        ),
      );

    console.log("[control-engine/admin/start] ✅ actuele scraper 3x10 klaar", {
      process_count: activeChunks.length,
      workers_per_process: workersPerProcess,
      va_count: va_nummers.length,
      ms: Math.max(...scrapeResults.map((r) => r.ms)),
    });

    let liveRows = await loadLiveChecks(
      matchmaking_id,
      controle_run_id,
    );

    const isCompleteLiveRow = (row: any) =>
      !row?.error_message &&
      typeof row?.licentie_ok === "boolean" &&
      typeof row?.startverbod_actief === "boolean" &&
      typeof row?.keurmerk_ok === "boolean";

    const completeVaSet = new Set(
      liveRows
        .filter(isCompleteLiveRow)
        .map((row: any) => String(row.va_nummer)),
    );

    const retryVas = va_nummers.filter(
      (va) => !completeVaSet.has(String(va)),
    );

    if (retryVas.length > 0) {
      console.warn(
        `[control-engine/admin/start] ⚠️ herstelronde voor ${retryVas.length} ontbrekende VA('s): ${retryVas.join(", ")}`,
      );

      await updateRunProgress(controle_run_id, {
        progress: 55,
        current_step: `Herstelronde actuele FightPassport-check: ${retryVas.length} vechter(s)...`,
      });

      // Net als Total: alleen de mislukte VA's krijgen nog één volledig verse ronde.
      // Maximaal 10 workers, want hier gaat het alleen om de restlijst.
      await runNodeScript(
          scraperPath,
          [activeMatchmakingId, activeControleRunId, ...retryVas],
          {
            FP_MATCHMAKER_ID: "",
            FP_SESSION_MODE: "master",
            HEADLESS: process.env.HEADLESS ?? "false",
            PUPPETEER_HEADLESS:
              process.env.PUPPETEER_HEADLESS ??
              process.env.HEADLESS ??
              "false",

            WORKERS: String(Math.min(10, retryVas.length)),
            FP_ADMIN_WORKERS: String(Math.min(10, retryVas.length)),
            // In deze herstelronde nog één volledige interne transient retry toestaan.
            FP_ADMIN_TRANSIENT_RETRIES: "1",
            FP_ADMIN_LOGIN_RETRIES: "1",
            STAGGER_MS: String(stagger_ms),
            TAB_ATTEMPTS: String(tab_attempts),
            SOFT_WAIT_MS: String(soft_wait_ms),
            BETWEEN_ATTEMPTS_MS: String(between_attempts_ms),
            FP_ADMIN_TIMEOUT_MS: String(live_timeout_ms),
            FP_ADMIN_ALLOW_INCOMPLETE_EXIT: "1",
          },
        "fp_admin_live_retry",
      );

      liveRows = await loadLiveChecks(
        matchmaking_id,
        controle_run_id,
      );
    }

    const liveErrors = liveRows.filter(
      (row: any) => !isCompleteLiveRow(row),
    );

    if (liveRows.length !== va_nummers.length || liveErrors.length) {
      throw new Error(
        `Actuele FightPassport-check niet compleet: ${liveRows.length}/${va_nummers.length} resultaten, ${liveErrors.length} fout(en).`,
      );
    }

    await updateRunProgress(controle_run_id, {
      verwerkt_aantal: va_nummers.length,
      progress: 60,
      current_step: "Partij-context één keer opbouwen...",
    });

    await buildControleBoutContext(matchmaking_id, controle_run_id);

    await updateRunProgress(controle_run_id, {
      verwerkt_aantal: va_nummers.length,
      progress: 70,
      current_step:
        "Actuele licentie/startverbod/keurmerkwaarden toepassen...",
    });

    const contextCount = await applyLiveChecksToCurrentContext({
      matchmaking_id,
      controle_run_id,
      liveRows,
    });

    // Toernooi-context nogmaals voor deze run actualiseren, zonder extra FP-scrape.
    // buildToernooiContext haalt licentie/startverbod nu uit controle_fighter_actueel.
    await buildToernooiContext(matchmaking_id, controle_run_id);

    // Keurmerk blijft gebaseerd op de MATCHMAKER-sportschool.
    // De actuele FP-sportschool wordt alleen vergeleken en levert bij verschil
    // de aparte SPORTSCHOOL_AFWIJKING_FIGHTPASSPORT melding.
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
        "Geen controle_bout_context gevonden na DB-rebuild.",
      );
    }

    await updateRunProgress(controle_run_id, {
      progress: 85,
      current_step: "RulesEngine draait met actuele wedstrijddagcheck...",
    });

    // refreshMatchmaking heeft de DB-rules al gedraaid.
    // Deze tweede run is bewust de eindwaarheid met de drie live velden eroverheen.
    const hits = await rulesEngine({
      matchmaking_id,
      controle_run_id,
      ctxRows,
    });

    await updateRunProgress(controle_run_id, {
      totaal_aantal: va_nummers.length,
      verwerkt_aantal: va_nummers.length,
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
      source: "database_plus_fightpassport_live",
      live_check: {
        va_count: va_nummers.length,
        result_count: liveRows.length,
        checks: ["licentie", "startverbod", "keurmerk"],
      },
      context_rows: contextCount,
      rules_hits: Array.isArray(hits) ? hits.length : 0,
      scraper_processes: processCount,
      workers_per_process: workersPerProcess,
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
