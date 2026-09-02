// app/api/control-engine/bout-rescrape/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

import {
  buildControleBoutContext as buildControlBoutContext,
  buildToernooiContext,
} from "@/lib/control/buildControleBoutContext";
import { enrichControleBoutContext as enrichControlBoutContext } from "@/lib/control/enrichControleBoutContext";
import { rulesEngine as controlRulesEngine } from "@/lib/rulesEngine";

import { buildControleBoutContext as buildMatchmakerBoutContext } from "@/lib/matchmaker/buildControleBoutContext";
import { enrichControleBoutContext as enrichMatchmakerBoutContext } from "@/lib/matchmaker/enrichControleBoutContext";
import { rulesEngine as matchmakerRulesEngine } from "@/lib/matchmaker/rulesEngine";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function toVaStrict(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (/^\d{1,6}$/.test(s)) return s;
  const digits = s.replace(/[^0-9]/g, "");
  if (/^\d{1,6}$/.test(digits)) return digits;
  return null;
}

function unwrapUuid(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "[object Object]") return null;
  return s;
}

function asPartijNr(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Number(n) : null;
}

function isUnknownColumnError(err: any): boolean {
  const msg = String(err?.message ?? err?.details ?? err?.hint ?? "").toLowerCase();
  const code = String(err?.code ?? "").toUpperCase();
  return code === "PGRST204" || code === "42703" || msg.includes("column") || msg.includes("bestaat niet");
}

function resolveScriptPath(...parts: string[]) {
  const root = process.cwd();
  const candidates = [
    path.join(root, ...parts),
    path.join(root, "ControlEngine", ...parts),
    path.join(root, "ControlEngine", "ControlEngine", ...parts),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(`Script niet gevonden:\n- ${candidates.join("\n- ")}`);
}

function runNodeScript(
  scriptPath: string,
  args: string[],
  cwd?: string,
  extraEnv: Record<string, string> = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const nodeBin = process.execPath;
    const proc = spawn(nodeBin, [scriptPath, ...args], {
      stdio: "inherit",
      shell: false,
      cwd: cwd ?? path.dirname(scriptPath),
      windowsHide: true,
      env: {
        ...process.env,
        // Control-engine routes gebruiken ALTIJD de master-login uit scrapers/config/login_master.json.
        // Hiermee voorkom je dat een globale FP_MATCHMAKER_ID de admin/master scraper naar een matchmaker-profiel stuurt.
        FP_MATCHMAKER_ID: "",
        FP_SESSION_MODE: "master",

        // Licentie/keurmerk zijn kritieke checks: geef FightPassport/DETAILS extra tijd.
        WORKERS: process.env.WORKERS ?? "8",
        STAGGER_MS: process.env.STAGGER_MS ?? "250",
        TAB_ATTEMPTS: process.env.TAB_ATTEMPTS ?? "8",
        SOFT_WAIT_MS: process.env.SOFT_WAIT_MS ?? "1500",
        BETWEEN_ATTEMPTS_MS: process.env.BETWEEN_ATTEMPTS_MS ?? "450",
        FULLFIGHTER_TIMEOUT_MS: process.env.FULLFIGHTER_TIMEOUT_MS ?? "45000",
        UITSLAGEN_TIMEOUT_MS: process.env.UITSLAGEN_TIMEOUT_MS ?? "90000",
        UITSLAGEN_TRIES: process.env.UITSLAGEN_TRIES ?? "1",

        SystemRoot: process.env.SystemRoot ?? "C:\\Windows",
        ComSpec: process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",

        ...extraEnv,
      },
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Script failed: ${path.basename(scriptPath)} (exit code ${code})`));
    });
  });
}

async function runMatchmakerBundleForVaList(
  matchmaking_id: string,
  controle_run_id: string,
  vaList: string[]
) {
  const uniqueVaList = [...new Set(vaList.map((v) => toVaStrict(v)).filter(Boolean) as string[])];
  if (!uniqueVaList.length) return;

  const bundlePath = resolveScriptPath("scrapers", "fp_bundle", "scraper_fp_bundle.js");

  console.log(`[bout-rescrape] 🔄 Matchmaker fp_bundle voor VA: ${uniqueVaList.join(", ")}`);

  await runNodeScript(
    bundlePath,
    [matchmaking_id, controle_run_id, ...uniqueVaList],
    path.dirname(bundlePath),
    {
      FP_MATCHMAKER_ID: "",
      FP_SESSION_MODE: "master",
      WORKERS: String(Math.max(1, Math.min(uniqueVaList.length, 2))),
    }
  );
}

async function runTotalForVaList(vaList: string[]) {
  const uniqueVaList = [...new Set(vaList.map((v) => toVaStrict(v)).filter(Boolean) as string[])];
  if (!uniqueVaList.length) return;

  const totalPath = resolveScriptPath("scrapers", "fp_total", "scraper_fp_total.js");

  console.log(`[bout-rescrape] 🔄 Total-rescrape voor VA: ${uniqueVaList.join(", ")}`);

  await runNodeScript(
    totalPath,
    [],
    path.dirname(totalPath),
    {
      // fp_total ondersteunt een expliciete VA-lijst. Daardoor wordt alleen
      // deze partij/toernooivechter opnieuw opgehaald en niet een volledig bereik.
      FP_TOTAL_VA_LIST: uniqueVaList.join(","),
      FP_TOTAL_RUN_KIND: "retry",
      FP_TOTAL_WORKERS: String(Math.max(1, Math.min(uniqueVaList.length, 2))),
      FP_TOTAL_RESULTS: "true",
    }
  );
}

async function getLatestControleRunId(matchmaking_id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("controle_runs")
    .select("id, gestart_op")
    .eq("matchmaking_id", matchmaking_id)
    .order("gestart_op", { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data?.[0]?.id as string) ?? null;
}

async function getBoutRow(matchmaking_id: string, partij_nr: number) {
  const { data, error } = await supabase
    .from("matchmaking_bouts_raw")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("partij_nr", partij_nr)
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

async function getBoutContextRow(
  matchmaking_id: string,
  controle_run_id: string,
  partij_nr: number
) {
  const { data, error } = await supabase
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id)
    .eq("partij_nr", partij_nr)
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

async function persistVaChangeInBoutRaw(opts: {
  matchmaking_id: string;
  partij_nr: number;
  newVaRood?: string | null;
  newVaBlauw?: string | null;
}) {
  const { matchmaking_id, partij_nr, newVaRood, newVaBlauw } = opts;

  const bout = await getBoutRow(matchmaking_id, partij_nr);
  if (!bout) return;

  const oldR = toVaStrict(bout?.va_rood) ?? toVaStrict(bout?.rood_va) ?? null;
  const oldB = toVaStrict(bout?.va_blauw) ?? toVaStrict(bout?.blauw_va) ?? null;

  const changedR = !!newVaRood && newVaRood !== oldR;
  const changedB = !!newVaBlauw && newVaBlauw !== oldB;

  if (!changedR && !changedB) return;

  const prevPatch: Record<string, any> = {};

  if (changedR) {
    const prevExisting = toVaStrict(bout?.rood_va_mm_prev);
    if (!prevExisting) prevPatch.rood_va_mm_prev = oldR ?? "";
  }

  if (changedB) {
    const prevExisting = toVaStrict(bout?.blauw_va_mm_prev);
    if (!prevExisting) prevPatch.blauw_va_mm_prev = oldB ?? "";
  }

  if (Object.keys(prevPatch).length > 0) {
    const { error: prevErr } = await supabase
      .from("matchmaking_bouts_raw")
      .update(prevPatch)
      .eq("matchmaking_id", matchmaking_id)
      .eq("partij_nr", partij_nr);

    if (prevErr) {
      if (!isUnknownColumnError(prevErr)) throw prevErr;
      console.warn("[bout-rescrape] prev-kolommen ontbreken in matchmaking_bouts_raw; prev-step overgeslagen.");
    }
  }

  const patch: Record<string, any> = {};

  if (changedR) {
    patch.rood_va_was = oldR;
    patch.va_rood = newVaRood;
  }

  if (changedB) {
    patch.blauw_va_was = oldB;
    patch.va_blauw = newVaBlauw;
  }

  const { error: upErr } = await supabase
    .from("matchmaking_bouts_raw")
    .update(patch)
    .eq("matchmaking_id", matchmaking_id)
    .eq("partij_nr", partij_nr);

  if (upErr) throw upErr;
}

async function persistVaChangeInBoutContext(opts: {
  matchmaking_id: string;
  controle_run_id: string;
  partij_nr: number;
  newVaRood?: string | null;
  newVaBlauw?: string | null;
}) {
  const { matchmaking_id, controle_run_id, partij_nr, newVaRood, newVaBlauw } = opts;

  const ctx = await getBoutContextRow(matchmaking_id, controle_run_id, partij_nr);
  if (!ctx) return;

  const oldR =
    toVaStrict(ctx?.rood_va_mm) ??
    toVaStrict(ctx?.va_rood) ??
    toVaStrict(ctx?.rood_va) ??
    null;

  const oldB =
    toVaStrict(ctx?.blauw_va_mm) ??
    toVaStrict(ctx?.va_blauw) ??
    toVaStrict(ctx?.blauw_va) ??
    null;

  const changedR = !!newVaRood && newVaRood !== oldR;
  const changedB = !!newVaBlauw && newVaBlauw !== oldB;

  if (!changedR && !changedB) return;

  const patch: Record<string, any> = {};

  if (changedR) {
    const prevExisting = toVaStrict(ctx?.rood_va_mm_prev);
    if (!prevExisting) patch.rood_va_mm_prev = oldR ?? "";
    patch.rood_va_mm = newVaRood;
  }

  if (changedB) {
    const prevExisting = toVaStrict(ctx?.blauw_va_mm_prev);
    if (!prevExisting) patch.blauw_va_mm_prev = oldB ?? "";
    patch.blauw_va_mm = newVaBlauw;
  }

  try {
    const { error } = await supabase
      .from("controle_bout_context")
      .update(patch)
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", controle_run_id)
      .eq("partij_nr", partij_nr);

    if (error) throw error;
  } catch (err: any) {
    if (isUnknownColumnError(err)) return;
    throw err;
  }
}

export async function POST(req: Request) {
  const t0 = Date.now();

  try {
    const body = await req.json().catch(() => ({}));

    const matchmaking_id = String(body?.matchmaking_id ?? "").trim();
    if (!matchmaking_id) {
      return NextResponse.json({ error: "matchmaking_id is verplicht" }, { status: 400 });
    }

    const partij_nr = asPartijNr(body?.partij_nr);
    const toernooi_code = String(body?.toernooi_code ?? body?.toernooiCode ?? "").trim().toUpperCase();
    const fighter_id_in = toVaStrict(body?.fighter_id ?? body?.va_nummer ?? body?.va ?? body?.fighterId);

    // Toernooi-deelnemers hebben in controle_resultaten vaak partij_nr = 0.
    // De oude route ging alleen de toernooi-rescrape in als partij_nr echt null was.
    // Daardoor deed een rescrape met { partij_nr: 0, toernooi_code, fighter_id } niets/ging naar de gewone partij-flow.
    const isToernooiRequest = !!toernooi_code && !!fighter_id_in && (partij_nr == null || partij_nr <= 0);

    if (partij_nr == null && !isToernooiRequest) {
      return NextResponse.json(
        { error: "partij_nr is verplicht voor een partij, of toernooi_code + fighter_id voor een toernooi-vechter" },
        { status: 400 }
      );
    }

    const { userId, role } = await requireUserWithRole(req);
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    // Deze endpoint wordt door meerdere rollen gebruikt. Alleen een matchmaker-rescrape
    // moet de matchmaker build/enrich/rules/save-stack gebruiken.
    const isMatchmakerFlow = String(role ?? "").trim().toLowerCase() === "matchmaker";

    const controle_run_id_in = String(body?.controle_run_id ?? "").trim();
    const controle_run_id = controle_run_id_in || (await getLatestControleRunId(matchmaking_id));

    if (!controle_run_id) {
      return NextResponse.json(
        { error: "Geen controle_run gevonden. Draai eerst /api/control-engine/start." },
        { status: 400 }
      );
    }

    if (isToernooiRequest) {
      await runTotalForVaList([fighter_id_in]);

      const toernooiRows = await buildToernooiContext(matchmaking_id, controle_run_id, {
        toernooi_code,
        fighter_id: fighter_id_in,
      });

      // Alleen deze toernooi-vechter opnieuw verrijken.
      // Belangrijk: de rulesEngine moet daarna draaien op de actuele
      // controle_toernooi_context en niet op oude/raw toernooi-data.
      await enrichControlBoutContext(matchmaking_id, controle_run_id, {
        toernooi_code,
        fighter_id: fighter_id_in,
      } as any);

      const { data: toernooiCtxRows, error: toernooiCtxErr } = await supabase
        .from("controle_toernooi_context")
        .select("*")
        .eq("matchmaking_id", matchmaking_id)
        .eq("controle_run_id", controle_run_id)
        .eq("toernooi_code", toernooi_code)
        .or(`fighter_id.eq.${fighter_id_in},va_nummer.eq.${fighter_id_in}`)
        .order("naam", { ascending: true });

      if (toernooiCtxErr) throw toernooiCtxErr;

      // Voor toernooi geven we expres geen controle_bout_context mee.
      // rulesEngine haalt/maakt de toernooi-pair rows op basis van
      // controle_toernooi_context. Zo worden stale meldingen met oude
      // matchmaking_bouts_raw sportschool/klasse niet opnieuw gebruikt.
      await controlRulesEngine({
        matchmaking_id,
        controle_run_id,
        ctxRows: [],
        scoped_toernooi_code: toernooi_code,
        scoped_fighter_id: fighter_id_in,
        scoped_toernooi_rows: toernooiCtxRows ?? [],
      } as any);

      return NextResponse.json({
        ok: true,
        type: "toernooi_fighter",
        matchmaking_id,
        controle_run_id,
        toernooi_code,
        fighter_id: fighter_id_in,
        toernooi_rows: Array.isArray(toernooiRows) ? toernooiRows.length : 0,
        used_total: true,
        ms: Date.now() - t0,
      });
    }

    if (partij_nr == null) {
      return NextResponse.json({ error: "partij_nr ontbreekt" }, { status: 400 });
    }

    const va_rood_in = toVaStrict(
      body?.va_rood ?? body?.rood_va ?? body?.roodVa ?? body?.vaRood
    );
    const va_blauw_in = toVaStrict(
      body?.va_blauw ?? body?.blauw_va ?? body?.blauwVa ?? body?.vaBlauw
    );

    if (va_rood_in || va_blauw_in) {
      await persistVaChangeInBoutRaw({
        matchmaking_id,
        partij_nr,
        newVaRood: va_rood_in ?? null,
        newVaBlauw: va_blauw_in ?? null,
      });
    }

    const bout = await getBoutRow(matchmaking_id, partij_nr);
    if (!bout) {
      return NextResponse.json(
        { error: `Geen bout gevonden voor matchmaking_id=${matchmaking_id}, partij_nr=${partij_nr}` },
        { status: 404 }
      );
    }

    const fallbackBoutId =
      unwrapUuid(bout?.bout_uid) ??
      unwrapUuid(bout?.bout_id) ??
      null;

    const vaRood =
      va_rood_in ??
      toVaStrict(bout?.va_rood) ??
      toVaStrict(bout?.rood_va) ??
      toVaStrict(bout?.rood_va_mm) ??
      null;

    const vaBlauw =
      va_blauw_in ??
      toVaStrict(bout?.va_blauw) ??
      toVaStrict(bout?.blauw_va) ??
      toVaStrict(bout?.blauw_va_mm) ??
      null;

    const vaList = [vaRood, vaBlauw].filter(Boolean) as string[];

    if (vaList.length > 0) {
      // "Controleer Fightpaspoort" haalt voor deze partij altijd eerst de
      // actuele vechterdata op via FP Total. Daarna bepaalt de rol alleen
      // welke build/enrich/rules/save-stack wordt gebruikt.
      await runTotalForVaList(vaList);
    }

    if (isMatchmakerFlow) {
      await buildMatchmakerBoutContext(matchmaking_id, controle_run_id, { partij_nr });
    } else {
      await buildControlBoutContext(matchmaking_id, controle_run_id, { partij_nr });
    }

    if (va_rood_in || va_blauw_in) {
      await persistVaChangeInBoutContext({
        matchmaking_id,
        controle_run_id,
        partij_nr,
        newVaRood: va_rood_in ?? null,
        newVaBlauw: va_blauw_in ?? null,
      });
    }

    const ctxAfterBuild = await getBoutContextRow(matchmaking_id, controle_run_id, partij_nr);
    const scopedBoutId = unwrapUuid(ctxAfterBuild?.bout_id) ?? fallbackBoutId;

    if (isMatchmakerFlow) {
      await enrichMatchmakerBoutContext(matchmaking_id, controle_run_id, {
        partij_nr,
        bout_id: scopedBoutId,
      });
    } else {
      await enrichControlBoutContext(matchmaking_id, controle_run_id, {
        partij_nr,
        bout_id: scopedBoutId,
      });
    }

    const ctxFinal = await getBoutContextRow(matchmaking_id, controle_run_id, partij_nr);
    const ctxRows = ctxFinal ? [ctxFinal] : [];

    const rulesArgs = {
      matchmaking_id,
      controle_run_id,
      ctxRows,
      scoped_partij_nr: partij_nr,
      scoped_bout_id: unwrapUuid(ctxFinal?.bout_id) ?? scopedBoutId ?? null,
    };

    if (isMatchmakerFlow) {
      // lib/matchmaker/rulesEngine slaat via lib/matchmaker/saveControleResultaten
      // alleen deze scoped partij opnieuw op.
      await matchmakerRulesEngine(rulesArgs);
    } else {
      await controlRulesEngine(rulesArgs);
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      controle_run_id,
      partij_nr,
      bout_id: unwrapUuid(ctxFinal?.bout_id) ?? scopedBoutId ?? null,
      vaList,
      used_total: vaList.length > 0,
      used_matchmaker_bundle: false,
      flow: isMatchmakerFlow ? "matchmaker" : "control",
      ms: Date.now() - t0,
    });
  } catch (e: any) {
    console.error("❌ bout-rescrape error:", e);
    return NextResponse.json({ error: e?.message ?? "Onbekende fout" }, { status: 500 });
  }
}