// app/api/control-engine/officials/live-check/route.ts
//
// Lichte officials wedstrijddagcheck.
// GEEN volledige DB-rebuild.
// GEEN cleanup van controle_resultaten/context.
// GEEN verwijdering van dispensatie_requests.
//
// Flow:
// 1. pak laatste bestaande controle_run van deze matchmaking
// 2. verzamel VA's uit de bestaande controle_bout_context
// 3. run alleen scraper_fp_officials.js
// 4. controle_fighter_actueel wordt voor dezelfde run bijgewerkt
// 5. licentie/startverbod/keurmerk over bestaande context leggen
// 6. rulesEngine opnieuw draaien op dezelfde run/context
//
// Hierdoor blijft de bestaande controle intact, maar zijn de drie
// actuele FightPassport-velden de wedstrijddagwaarheid.

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
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

const SCRAPER_FILE = "scraper_fp_officials.js";

function toVaStrict(value: any): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

function pickVA(row: any, side: "rood" | "blauw"): string | null {
  if (side === "rood") {
    return (
      toVaStrict(row?.rood_va_mm) ??
      toVaStrict(row?.rood_va) ??
      toVaStrict(row?.va_rood) ??
      null
    );
  }

  return (
    toVaStrict(row?.blauw_va_mm) ??
    toVaStrict(row?.blauw_va) ??
    toVaStrict(row?.va_blauw) ??
    null
  );
}

function clampInt(value: any, fallback: number, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function isRoleAllowedForRoute(role: string | null | undefined) {
  return (
    role === "official" ||
    role === "hoofdofficial" ||
    role === "admin" ||
    role === "superadmin"
  );
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

function resolveScraperLockPath() {
  const root = process.cwd();

  const candidates = [
    path.join(root, "ControlEngine", "scrapers"),
    path.join(root, "ControlEngine", "ControlEngine", "scrapers"),
    path.join(root, "control-engine", "scrapers"),
    path.join(root, "scrapers"),
  ];

  const directory =
    candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];

  fs.mkdirSync(directory, { recursive: true });

  return path.join(directory, ".fightpassport-scraper.lock");
}

// Net als de volledige officials-start: FightPassport robots nooit door elkaar.
async function withScraperLock<T>(fn: () => Promise<T>): Promise<T> {
  const lockPath = resolveScraperLockPath();
  const startedAt = Date.now();

  while (true) {
    try {
      const fd = fs.openSync(lockPath, "wx");

      fs.writeFileSync(
        fd,
        JSON.stringify({
          pid: process.pid,
          started_at: new Date().toISOString(),
          source: "officials-live-check",
        }),
      );

      fs.closeSync(fd);
      break;
    } catch {
      try {
        const stat = fs.statSync(lockPath);

        if (Date.now() - stat.mtimeMs > 1000 * 60 * 90) {
          fs.unlinkSync(lockPath);
        }
      } catch {}

      if (Date.now() - startedAt > 1000 * 60 * 120) {
        throw new Error(
          "FightPassport scraper-lock timeout. Er draait mogelijk nog een andere scraper.",
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  try {
    return await fn();
  } finally {
    try {
      fs.unlinkSync(lockPath);
    } catch {}
  }
}

function runNodeScript(
  scriptPath: string,
  args: string[],
  envExtra?: Record<string, string>,
  logPrefix?: string,
): Promise<{ stdout: string; stderr: string; ms: number }> {
  return withScraperLock(
    () =>
      new Promise((resolve, reject) => {
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
      }),
  );
}

async function loadLatestRun(matchmaking_id: string) {
  // Eerst expliciet is_latest, daarna fallback op nieuwste bruikbare run.
  const latest = await supabase
    .from("controle_runs")
    .select("id,status,is_latest,gestart_op,afgerond_op")
    .eq("matchmaking_id", matchmaking_id)
    .eq("is_latest", true)
    .order("gestart_op", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest.error) throw latest.error;
  if (latest.data?.id) return latest.data;

  const fallback = await supabase
    .from("controle_runs")
    .select("id,status,is_latest,gestart_op,afgerond_op")
    .eq("matchmaking_id", matchmaking_id)
    .order("gestart_op", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallback.error) throw fallback.error;
  return fallback.data ?? null;
}

async function loadCurrentContext(
  matchmaking_id: string,
  controle_run_id: string,
) {
  const { data, error } = await supabase
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id)
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
  contextRows: any[];
  liveRows: any[];
}) {
  const liveByVa = new Map(
    args.liveRows.map((row) => [String(row.va_nummer), row]),
  );

  let updated = 0;

  for (const context of args.contextRows) {
    const roodVa = pickVA(context, "rood");
    const blauwVa = pickVA(context, "blauw");

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
      if (
        rood.error_message ||
        typeof rood.licentie_ok !== "boolean" ||
        typeof rood.startverbod_actief !== "boolean" ||
        typeof rood.keurmerk_ok !== "boolean"
      ) {
        throw new Error(
          `Actuele FightPassport-check ongeldig voor rode hoek VA ${roodVa}, partij ${context?.partij_nr ?? "?"}.`,
        );
      }

      patch.rood_licentie = rood.licentie_ok ? "Ja" : "Nee";
      patch.rood_heeft_startverbod = rood.startverbod_actief
        ? "true"
        : "false";
      patch.keurmerk_rood = rood.keurmerk_ok;

      patch.keurmerk_reden_rood = rood.land
        ? `Actuele FightPassport-check: ${rood.sportschool ?? "-"} · ${rood.land}; ${
            String(rood.land).trim().toLowerCase() === "nederland"
              ? rood.keurmerk_schild_gevonden
                ? "Nederlands keurmerkschild aanwezig."
                : "Nederlandse sportschool zonder keurmerkschild."
              : "Buitenlandse sportschool, keurmerk niet verplicht."
          }`
        : "Actuele FightPassport-check.";
    }

    if (blauw) {
      if (
        blauw.error_message ||
        typeof blauw.licentie_ok !== "boolean" ||
        typeof blauw.startverbod_actief !== "boolean" ||
        typeof blauw.keurmerk_ok !== "boolean"
      ) {
        throw new Error(
          `Actuele FightPassport-check ongeldig voor blauwe hoek VA ${blauwVa}, partij ${context?.partij_nr ?? "?"}.`,
        );
      }

      patch.blauw_licentie = blauw.licentie_ok ? "Ja" : "Nee";
      patch.blauw_heeft_startverbod = blauw.startverbod_actief
        ? "true"
        : "false";
      patch.keurmerk_blauw = blauw.keurmerk_ok;

      patch.keurmerk_reden_blauw = blauw.land
        ? `Actuele FightPassport-check: ${blauw.sportschool ?? "-"} · ${blauw.land}; ${
            String(blauw.land).trim().toLowerCase() === "nederland"
              ? blauw.keurmerk_schild_gevonden
                ? "Nederlands keurmerkschild aanwezig."
                : "Nederlandse sportschool zonder keurmerkschild."
              : "Buitenlandse sportschool, keurmerk niet verplicht."
          }`
        : "Actuele FightPassport-check.";
    }

    if (!Object.keys(patch).length) continue;

    const { error } = await supabase
      .from("controle_bout_context")
      .update(patch)
      .eq("id", context.id)
      .eq("matchmaking_id", args.matchmaking_id)
      .eq("controle_run_id", args.controle_run_id);

    if (error) throw error;
    updated++;
  }

  return updated;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmaking_id =
      String(body?.matchmaking_id ?? "").trim() || null;

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt." },
        { status: 400 },
      );
    }

    const { userId, role } = await requireUserWithRole(req);

    if (!isRoleAllowedForRoute(role)) {
      return NextResponse.json(
        { error: "Geen toegang tot officials live-check route." },
        { status: 403 },
      );
    }

    await assertCanAccessMatchmaking({
      matchmaking_id,
      userId,
      role,
    });

    const latestRun = await loadLatestRun(matchmaking_id);

    if (!latestRun?.id) {
      return NextResponse.json(
        {
          error:
            "Er bestaat nog geen controle-run voor deze matchmaking. Start eerst de volledige controle.",
        },
        { status: 409 },
      );
    }

    const controle_run_id = String(latestRun.id);

    const contextRows = await loadCurrentContext(
      matchmaking_id,
      controle_run_id,
    );

    if (!contextRows.length) {
      return NextResponse.json(
        {
          error:
            "De laatste controle-run bevat geen partijcontext. Start eerst de volledige controle.",
          controle_run_id,
        },
        { status: 409 },
      );
    }

    const vaSet = new Set<string>();

    for (const row of contextRows) {
      const rood = pickVA(row, "rood");
      const blauw = pickVA(row, "blauw");

      if (rood) vaSet.add(rood);
      if (blauw) vaSet.add(blauw);
    }

    const va_nummers = [...vaSet];

    if (!va_nummers.length) {
      return NextResponse.json(
        {
          error:
            "Geen geldige VA-nummers gevonden in de bestaande controlecontext.",
          controle_run_id,
        },
        { status: 409 },
      );
    }

    const workers = clampInt(
      body?.workers ?? process.env.FP_OFFICIALS_WORKERS ?? 8,
      8,
      1,
      20,
    );

    const stagger_ms = clampInt(
      body?.stagger_ms ?? 250,
      250,
      0,
      5000,
    );

    const tab_attempts = clampInt(
      body?.tab_attempts ?? 8,
      8,
      1,
      30,
    );

    const soft_wait_ms = clampInt(
      body?.soft_wait_ms ?? 900,
      900,
      100,
      5000,
    );

    const between_attempts_ms = clampInt(
      body?.between_attempts_ms ?? 450,
      450,
      0,
      5000,
    );

    const live_timeout_ms = clampInt(
      body?.live_timeout_ms ?? 45000,
      45000,
      5000,
      180000,
    );

    const scraperPath = resolveScriptPath(
      "scrapers",
      "fp_bundle_officials",
      SCRAPER_FILE,
    );

    console.log("[control-engine/officials/live-check] ▶ start", {
      matchmaking_id,
      controle_run_id,
      va_count: va_nummers.length,
      workers,
    });

    const scrapeResult = await runNodeScript(
      scraperPath,
      [matchmaking_id, controle_run_id, ...va_nummers],
      {
        FP_MATCHMAKER_ID: "",
        FP_SESSION_MODE: "master",
        HEADLESS: process.env.HEADLESS ?? "false",
        PUPPETEER_HEADLESS:
          process.env.PUPPETEER_HEADLESS ??
          process.env.HEADLESS ??
          "false",

        WORKERS: String(workers),
        FP_OFFICIALS_WORKERS: String(workers),
        STAGGER_MS: String(stagger_ms),
        TAB_ATTEMPTS: String(tab_attempts),
        SOFT_WAIT_MS: String(soft_wait_ms),
        BETWEEN_ATTEMPTS_MS: String(between_attempts_ms),
        FP_OFFICIALS_TIMEOUT_MS: String(live_timeout_ms),
      },
      "fp_officials_live",
    );

    const liveRows = await loadLiveChecks(
      matchmaking_id,
      controle_run_id,
    );

    const wanted = new Set(va_nummers);

    const currentLiveRows = liveRows.filter((row: any) =>
      wanted.has(String(row.va_nummer)),
    );

    const liveErrors = currentLiveRows.filter(
      (row: any) =>
        row?.error_message ||
        typeof row?.licentie_ok !== "boolean" ||
        typeof row?.startverbod_actief !== "boolean" ||
        typeof row?.keurmerk_ok !== "boolean",
    );

    if (
      currentLiveRows.length !== va_nummers.length ||
      liveErrors.length
    ) {
      throw new Error(
        `Actuele FightPassport-check niet compleet: ${currentLiveRows.length}/${va_nummers.length} resultaten, ${liveErrors.length} fout(en).`,
      );
    }

    const updatedContexts = await applyLiveChecksToCurrentContext({
      matchmaking_id,
      controle_run_id,
      contextRows,
      liveRows: currentLiveRows,
    });

    // Context opnieuw laden: rulesEngine moet exact de zojuist bijgewerkte
    // live waarden ontvangen.
    const freshContextRows = await loadCurrentContext(
      matchmaking_id,
      controle_run_id,
    );

    // Geen nieuwe run, geen rebuild. De rulesEngine draait opnieuw op DEZELFDE run.
    // dispensatie_requests wordt nergens aangeraakt.
    const hits = await rulesEngine({
      matchmaking_id,
      controle_run_id,
      ctxRows: freshContextRows,
    });

    console.log("[control-engine/officials/live-check] ✅ klaar", {
      matchmaking_id,
      controle_run_id,
      va_count: va_nummers.length,
      updated_contexts: updatedContexts,
      rules_hits: Array.isArray(hits) ? hits.length : 0,
      scraper_ms: scrapeResult.ms,
    });

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      controle_run_id,
      source: "fightpassport_live_only",
      live_check: {
        va_count: va_nummers.length,
        result_count: currentLiveRows.length,
        checks: ["licentie", "startverbod", "keurmerk"],
      },
      updated_contexts: updatedContexts,
      rules_hits: Array.isArray(hits) ? hits.length : 0,
      scraper_ms: scrapeResult.ms,
    });
  } catch (error: any) {
    console.error(
      "[control-engine/officials/live-check] ❌ fout:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? String(error),
      },
      { status: 500 },
    );
  }
}
