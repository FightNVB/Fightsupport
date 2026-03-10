// app/api/control-engine/bout-rescrape/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

import { buildControleBoutContext } from "@/lib/control/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/control/enrichControleBoutContext";
import { rulesEngine } from "@/lib/rulesEngine";
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

function runNodeScript(scriptPath: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const nodeBin = process.execPath;
    const proc = spawn(nodeBin, [scriptPath, ...args], {
      stdio: "inherit",
      shell: false,
      cwd: cwd ?? path.dirname(scriptPath),
      windowsHide: true,
      env: {
        ...process.env,
        SystemRoot: process.env.SystemRoot ?? "C:\\Windows",
        ComSpec: process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
      },
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Script failed: ${path.basename(scriptPath)} (exit code ${code})`));
    });
  });
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

async function getBoutRow(matchmaking_id: string, partij_nr?: number) {
  if (!Number.isFinite(partij_nr)) return null;

  const { data, error } = await supabase
    .from("matchmaking_bouts_raw")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("partij_nr", partij_nr as number)
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}


 /**
 * Zet *_va_mm_prev alleen als die nog leeg is (eerste fout van MM),
 * zet *_va_was op de laatst-oude waarde (mag overschrijven),
 * en update va_rood/va_blauw naar de nieuwe waarde (dit is jouw MM bronveld).
 */
async function persistVaChangeInBoutRaw(opts: {
  matchmaking_id: string;
  partij_nr: number;
  newVaRood?: string | null;
  newVaBlauw?: string | null;
}) {
  const { matchmaking_id, partij_nr, newVaRood, newVaBlauw } = opts;

  const bout = await getBoutRow(matchmaking_id, partij_nr);
  if (!bout) return;

  // ✅ In jouw raw is de matchmaker-input: va_rood / va_blauw
  const oldR = toVaStrict(bout?.va_rood) ?? toVaStrict(bout?.rood_va) ?? null;
  const oldB = toVaStrict(bout?.va_blauw) ?? toVaStrict(bout?.blauw_va) ?? null;

  const changedR = !!newVaRood && newVaRood !== oldR;
  const changedB = !!newVaBlauw && newVaBlauw !== oldB;

  if (!changedR && !changedB) return;

  // 1) ✅ prev bewaren (alleen als leeg)
  const prevPatch: Record<string, any> = {};
  if (changedR) {
    const prevExisting = toVaStrict(bout?.rood_va_mm_prev);
    if (!prevExisting) prevPatch.rood_va_mm_prev = oldR ?? ""; // leeg→ingevuld ook zichtbaar
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

  // 2) ✅ “was” bijwerken (mag overschrijven) + nieuwe waarde naar va_rood/va_blauw
  const patch: Record<string, any> = {};
  if (changedR) {
    patch.rood_va_was = oldR;      // laatste oude waarde
    patch.va_rood = newVaRood;     // ✅ dit is de echte MM bron
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

  console.log("[bout-rescrape] ✅ VA wijziging opgeslagen in matchmaking_bouts_raw", {
    partij_nr,
    oldR,
    newVaRood,
    oldB,
    newVaBlauw,
  });
}

async function getBoutContextRow(matchmaking_id: string, controle_run_id: string, partij_nr?: number) {
  if (!Number.isFinite(partij_nr)) return null;

  const { data, error } = await supabase
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id)
    .eq("partij_nr", partij_nr as number)
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

/**
 * ✅ Belangrijk voor rapport:
 * Zet *_va_mm_prev in controle_bout_context als het VA nummer door de user wordt gewijzigd.
 * We doen dit defensief: bestaan kolommen niet -> skip zonder crash.
 */
async function persistVaChangeInBoutContext(opts: {
  matchmaking_id: string;
  controle_run_id: string;
  partij_nr: number;
  newVaRood?: string | null;
  newVaBlauw?: string | null;
}) {
  const { matchmaking_id, controle_run_id, partij_nr, newVaRood, newVaBlauw } = opts;

  const ctx = await getBoutContextRow(matchmaking_id, controle_run_id, partij_nr);
  if (!ctx) return; // context bestaat nog niet (bv. vóór buildControleBoutContext)

  const oldR =
    toVaStrict(ctx?.va_rood) ??
    toVaStrict(ctx?.rood_va) ??
    null;

  const oldB =
    toVaStrict(ctx?.va_blauw) ??
    toVaStrict(ctx?.blauw_va) ??
    null;

  const changedR = !!newVaRood && newVaRood !== oldR;
  const changedB = !!newVaBlauw && newVaBlauw !== oldB;

  if (!changedR && !changedB) return;

  const patch: Record<string, any> = {};

  if (changedR) {
    const prevExisting = toVaStrict(ctx?.rood_va_mm_prev);
    if (!prevExisting) patch.rood_va_mm_prev = oldR ?? ""; // leeg→ingevuld ook zichtbaar
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

    console.log("[bout-rescrape] ✅ VA wijziging opgeslagen in controle_bout_context", {
      partij_nr,
      oldR,
      newVaRood,
      oldB,
      newVaBlauw,
    });
  } catch (err: any) {
    if (isUnknownColumnError(err)) {
      console.warn("[bout-rescrape] controle_bout_context mist prev/mm kolommen; context-step overgeslagen.");
      return;
    }
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

    // ✅ AuthZ: admin/superadmin always ok; matchmaker only on own matchmaking
    const { userId, role } = await requireUserWithRole(req);
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    const partij_nr =
      body?.partij_nr != null && Number.isFinite(Number(body.partij_nr))
        ? Number(body.partij_nr)
        : undefined;

    const controle_run_id_in = body?.controle_run_id ? String(body.controle_run_id).trim() : "";
    const controle_run_id = controle_run_id_in || (await getLatestControleRunId(matchmaking_id));

    if (!controle_run_id) {
      return NextResponse.json(
        { error: "Geen controle_run gevonden. Draai eerst /api/control-engine/start." },
        { status: 400 }
      );
    }

    console.log("[bout-rescrape] start", { matchmaking_id, controle_run_id, partij_nr: partij_nr ?? null });

    // VA’s: accepteer meerdere body-keys (admin UI / oudere clients)
    const va_rood_in = toVaStrict(body?.va_rood ?? body?.rood_va ?? body?.roodVa ?? body?.vaRood);
    const va_blauw_in = toVaStrict(body?.va_blauw ?? body?.blauw_va ?? body?.blauwVa ?? body?.vaBlauw);
// ✅ NIEUW: als user VA wijzigt, leg dat vast (prev + nieuw) vóór rescrape
    if (Number.isFinite(partij_nr) && (va_rood_in || va_blauw_in)) {
      await persistVaChangeInBoutRaw({
        matchmaking_id,
        partij_nr: partij_nr as number,
        newVaRood: va_rood_in ?? null,
        newVaBlauw: va_blauw_in ?? null,
      });

      // ✅ ook in controle_bout_context (voor rapport: rood_va_mm_prev / blauw_va_mm_prev)
      await persistVaChangeInBoutContext({
        matchmaking_id,
        controle_run_id,
        partij_nr: partij_nr as number,
        newVaRood: va_rood_in ?? null,
        newVaBlauw: va_blauw_in ?? null,
      });
    }

    const bout = !va_rood_in && !va_blauw_in ? await getBoutRow(matchmaking_id, partij_nr) : await getBoutRow(matchmaking_id, partij_nr);

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

    // ✅ als geen VA’s: toch alleen die partij opnieuw rekenen (niet hele matchmaking!)
    if (vaList.length === 0) {
      await buildControleBoutContext(matchmaking_id, controle_run_id, { partij_nr }); // ✅ filter
      await enrichControleBoutContext(matchmaking_id, controle_run_id, { vaList: [] }); // ✅ noop

      // ✅ rulesEngine over ALLE ctxRows (anders verdwijnen andere partijen)
      const { data: ctxRows, error: cErr } = await supabase
        .from("controle_bout_context")
        .select("*")
        .eq("controle_run_id", controle_run_id)
        .eq("matchmaking_id", matchmaking_id)
        .order("partij_nr", { ascending: true });

      if (cErr) throw cErr;

      await rulesEngine({ matchmaking_id, controle_run_id, ctxRows: ctxRows ?? [] });

      return NextResponse.json({
        ok: true,
        message: "Geen geldige VA’s om te scrapen. Alleen deze partij is opnieuw berekend.",
        matchmaking_id,
        controle_run_id,
        partij_nr: partij_nr ?? null,
        vaList,
      });
    }

    // ✅ bundle scrape alleen 2 VA’s
    console.log("[bout-rescrape] ▶ bundle scrape", { vaList });
    const bundlePath = resolveScriptPath("scrapers", "fp_bundle", "scraper_fp_bundle.js");
    await runNodeScript(bundlePath, [matchmaking_id, controle_run_id, ...vaList], path.dirname(bundlePath));
    console.log("[bout-rescrape] ✅ bundle scrape klaar");

    // ✅ bouw context alleen voor deze partij (dus 1 bout), niet hele matchmaking
    console.log("[bout-rescrape] ▶ buildControleBoutContext (partij filter)");
    await buildControleBoutContext(matchmaking_id, controle_run_id, { partij_nr });

    // ✅ buildControleBoutContext kan ctx-row opnieuw maken; zet prev/mm nogmaals voor zekerheid
    if (Number.isFinite(partij_nr) && (va_rood_in || va_blauw_in)) {
      await persistVaChangeInBoutContext({
        matchmaking_id,
        controle_run_id,
        partij_nr: partij_nr as number,
        va_rood_in,
        va_blauw_in,
      });
    }
    console.log("[bout-rescrape] ✅ buildControleBoutContext klaar");

    // ✅ enrich alleen voor die 2 VA’s (niet alle vechters)
    console.log("[bout-rescrape] ▶ enrichControleBoutContext (va filter)");
    await enrichControleBoutContext(matchmaking_id, controle_run_id, { vaList });
    console.log("[bout-rescrape] ✅ enrichControleBoutContext klaar");

    // ✅ rulesEngine over ALLE ctxRows (anders verdwijnen andere partijen)
    const { data: ctxRows, error: ctxErr } = await supabase
      .from("controle_bout_context")
      .select("*")
      .eq("controle_run_id", controle_run_id)
      .eq("matchmaking_id", matchmaking_id)
      .order("partij_nr", { ascending: true });

    if (ctxErr) throw ctxErr;

    console.log("[bout-rescrape] ▶ rulesEngine (ctxRows full)", { rows: ctxRows?.length ?? 0 });
    await rulesEngine({ matchmaking_id, controle_run_id, ctxRows: ctxRows ?? [] });
    console.log("[bout-rescrape] ✅ rulesEngine klaar");

    console.log("[bout-rescrape] ⏱️ klaar in ms:", Date.now() - t0);

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      controle_run_id,
      partij_nr: partij_nr ?? null,
      vaList,
      used_bundle: true,
      ms: Date.now() - t0,
    });
  } catch (e: any) {
    console.error("❌ bout-rescrape error:", e);
    return NextResponse.json({ error: e?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
