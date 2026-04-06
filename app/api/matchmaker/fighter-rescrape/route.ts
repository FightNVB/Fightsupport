import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { enrichMatchmakerBoutContext } from "@/lib/matchmaker/enrichMatchmakerBoutContext";
import { fighterRulesEngine } from "@/lib/fighterRulesEngine";
import { saveMatchmakerFighterResultaten } from "@/lib/matchmaker/saveMatchmakerFighterResultaten";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
} from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function toVaStrict(v: unknown): string | null {
  if (v == null) return null;
  const raw = String(v).trim();
  if (/^\d{1,6}$/.test(raw)) return raw;

  const digits = raw.replace(/[^0-9]/g, "");
  if (/^\d{1,6}$/.test(digits)) return digits;

  return null;
}

function asUuid(v: unknown): string | null {
  const x = s(v);
  if (!x || x === "[object Object]") return null;
  return x;
}

function asRowNr(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Number(n) : null;
}

function asNumericId(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Number(n) : null;
}

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function boolLike(v: unknown): boolean | null {
  if (v == null || v === "") return null;
  if (typeof v === "boolean") return v;

  const x = String(v).trim().toLowerCase();
  if (["1", "true", "ja", "yes", "y"].includes(x)) return true;
  if (["0", "false", "nee", "no", "n"].includes(x)) return false;
  return null;
}

function compactName(
  first?: string | null,
  last?: string | null,
  fallback?: string | null
) {
  const full = `${s(first)} ${s(last)}`.trim();
  return full || s(fallback) || null;
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
  cwd?: string
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
        SystemRoot: process.env.SystemRoot ?? "C:\\Windows",
        ComSpec: process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
      },
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            `Script failed: ${path.basename(scriptPath)} (exit code ${code})`
          )
        );
      }
    });
  });
}

async function resolveInschrijving(opts: {
  matchmaking_id: string;
  fighter_id?: string | null;
  inschrijving_id?: number | null;
  row_nr?: number | null;
  va_nummer?: string | null;
}) {
  const { matchmaking_id, fighter_id, inschrijving_id, row_nr, va_nummer } = opts;

  if (fighter_id) {
    const { data, error } = await supabase
      .from("matchmaker_inschrijvingen")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("fighter_id", fighter_id)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (inschrijving_id != null) {
    const { data, error } = await supabase
      .from("matchmaker_inschrijvingen")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("id", inschrijving_id)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (row_nr != null) {
    const { data, error } = await supabase
      .from("matchmaker_inschrijvingen")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("row_nr", row_nr)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (va_nummer) {
    const { data, error } = await supabase
      .from("matchmaker_inschrijvingen")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("va_nummer", va_nummer)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  return null;
}

async function getLatestRunId(matchmaking_id: string) {
  const { data, error } = await supabase
    .from("matchmaker_controle_runs")
    .select("id, gestart_op")
    .eq("matchmaking_id", matchmaking_id)
    .order("gestart_op", { ascending: false })
    .limit(1);

  if (error) throw error;
  return s(data?.[0]?.id) || null;
}

async function getLatestRawRow(matchmaking_id: string, va_nummer: string) {
  const { data, error } = await supabase
    .from("matchmaker_fighters_raw")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("va_nummer", va_nummer)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

async function patchLatestRawWithFighter(
  inschrijving: any,
  va_nummer: string,
  controle_run_id: string | null
) {
  const latest = await getLatestRawRow(inschrijving.matchmaking_id, va_nummer);
  if (!latest) return null;

  const patch: Record<string, any> = {
    fighter_id: asUuid(inschrijving.fighter_id),
    row_nr: asRowNr(inschrijving.row_nr),
    matchmaking_id: inschrijving.matchmaking_id,
  };

  if (controle_run_id) {
    patch.controle_run_id = controle_run_id;
  }

  const { error: upErr } = await supabase
    .from("matchmaker_fighters_raw")
    .update(patch)
    .eq("id", latest.id);

  if (upErr) throw upErr;

  return { ...latest, ...patch };
}

async function countUitslagen(
  matchmaking_id: string,
  fighter_id: string | null,
  va_nummer: string | null
) {
  if (fighter_id) {
    const { count, error } = await supabase
      .from("matchmaker_uitslagen_raw")
      .select("*", { count: "exact", head: true })
      .eq("matchmaking_id", matchmaking_id)
      .eq("fighter_id", fighter_id);

    if (error) throw error;
    return count ?? 0;
  }

  if (va_nummer) {
    const { count, error } = await supabase
      .from("matchmaker_uitslagen_raw")
      .select("*", { count: "exact", head: true })
      .eq("matchmaking_id", matchmaking_id)
      .eq("va_nummer", va_nummer);

    if (error) throw error;
    return count ?? 0;
  }

  return 0;
}

async function getLaatstePartijDatum(
  matchmaking_id: string,
  fighter_id: string | null,
  va_nummer: string | null
) {
  if (fighter_id) {
    const { data, error } = await supabase
      .from("matchmaker_uitslagen_raw")
      .select("datum")
      .eq("matchmaking_id", matchmaking_id)
      .eq("fighter_id", fighter_id)
      .order("datum", { ascending: false })
      .limit(1);

    if (error) throw error;
    return data?.[0]?.datum ?? null;
  }

  if (va_nummer) {
    const { data, error } = await supabase
      .from("matchmaker_uitslagen_raw")
      .select("datum")
      .eq("matchmaking_id", matchmaking_id)
      .eq("va_nummer", va_nummer)
      .order("datum", { ascending: false })
      .limit(1);

    if (error) throw error;
    return data?.[0]?.datum ?? null;
  }

  return null;
}

async function buildAndUpsertContext(
  inschrijving: any,
  raw: any | null,
  controle_run_id: string | null
) {
  const fighter_id = asUuid(inschrijving.fighter_id);
  const inschrijving_id = asNumericId(inschrijving.id);
  const row_nr = asRowNr(inschrijving.row_nr);
  const va_nummer = toVaStrict(inschrijving.va_nummer ?? raw?.va_nummer);

  const uitslagen_count = await countUitslagen(
    inschrijving.matchmaking_id,
    fighter_id,
    va_nummer
  );

  const laatste_partij_datum = await getLaatstePartijDatum(
    inschrijving.matchmaking_id,
    fighter_id,
    va_nummer
  );

  const payload: Record<string, any> = {
    matchmaking_id: inschrijving.matchmaking_id,
    controle_run_id,
    fighter_id,
    inschrijving_id,
    row_nr,
    updated_at: new Date().toISOString(),

    discipline: inschrijving.discipline ?? null,
    klasse: inschrijving.klasse ?? null,
    geslacht: inschrijving.geslacht ?? raw?.geslacht ?? null,

    voornaam: inschrijving.voornaam ?? null,
    achternaam: inschrijving.achternaam ?? null,
    naam_input:
      compactName(
        inschrijving.voornaam,
        inschrijving.achternaam,
        raw?.naam ?? null
      ) ?? null,

    gym_input: inschrijving.gym ?? null,
    geboortedatum_input: inschrijving.geboortedatum ?? null,
    gewicht: toNum(inschrijving.gewicht),
    va_nummer,

    fp_naam: raw?.naam ?? null,
    fp_geboortedatum: raw?.geboortedatum ?? null,
    fp_gym: inschrijving.gym ?? null,
    fp_klasse: raw?.nulmeting_klasse ?? inschrijving.klasse ?? null,

    record_w: toNum(raw?.gewonnen),
    record_l: toNum(raw?.verloren),
    record_d: toNum(raw?.gelijk),

    uitslagen_count,
    laatste_partij_datum,
    nulmeting_opmerking: raw?.nulmeting_opmerking ?? null,
    heeft_keurmerk: null,

    extra: {
      opmerkingen: inschrijving.opmerkingen ?? null,
      licentie: boolLike(raw?.licentie),
      startverbod: boolLike(raw?.heeft_startverbod),
      nulmeting_totaal: toNum(raw?.nulmeting_totaal),
      source: "fighter-rescrape",
      last_rescrape_at: new Date().toISOString(),
    },
  };

  if (fighter_id) {
    const { data, error } = await supabase
      .from("matchmaker_fighter_context")
      .upsert(payload, {
        onConflict: "matchmaking_id,fighter_id",
      })
      .select("*")
      .limit(1);

    if (error) throw error;
    return data?.[0] ?? null;
  }

  if (inschrijving_id != null) {
    const { data, error } = await supabase
      .from("matchmaker_fighter_context")
      .upsert(payload, {
        onConflict: "inschrijving_id",
      })
      .select("*")
      .limit(1);

    if (error) throw error;
    return data?.[0] ?? null;
  }

  if (row_nr != null) {
    const { data: existing, error: existingErr } = await supabase
      .from("matchmaker_fighter_context")
      .select("id")
      .eq("matchmaking_id", inschrijving.matchmaking_id)
      .eq("row_nr", row_nr)
      .limit(1)
      .maybeSingle();

    if (existingErr) throw existingErr;

    if (existing?.id) {
      const { data, error } = await supabase
        .from("matchmaker_fighter_context")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .limit(1);

      if (error) throw error;
      return data?.[0] ?? null;
    }
  }

  const { data, error } = await supabase
    .from("matchmaker_fighter_context")
    .insert(payload)
    .select("*")
    .limit(1);

  if (error) throw error;

  return data?.[0] ?? null;
}

async function rerunSingleFighterRules(opts: {
  matchmaking_id: string;
  controle_run_id: string | null;
  ctx: any;
}) {
  const { matchmaking_id, controle_run_id, ctx } = opts;

  const hits = await fighterRulesEngine({
    ctx,
    matchmaking_id,
    controle_run_id,
  });

  const fighter_id = asUuid(ctx?.fighter_id);
  const inschrijving_id = asNumericId(ctx?.inschrijving_id);
  const row_nr = asRowNr(ctx?.row_nr);
  const naam =
    compactName(ctx?.voornaam, ctx?.achternaam, ctx?.naam_input) ??
    s(ctx?.fp_naam) ??
    null;
  const va_nummer = toVaStrict(ctx?.va_nummer);

  const existingDelete = async () => {
    let q = supabase
      .from("matchmaker_fighter_resultaten")
      .delete()
      .eq("matchmaking_id", matchmaking_id);

    if (controle_run_id) {
      q = q.eq("controle_run_id", controle_run_id);
    }

    if (fighter_id) {
      q = q.eq("fighter_id", fighter_id);
    } else if (row_nr != null) {
      q = q.eq("row_nr", row_nr);
    } else if (inschrijving_id != null) {
      q = q.eq("inschrijving_id", inschrijving_id);
    }

    const { error } = await q;
    if (error) throw error;
  };

  await existingDelete();

  if (!controle_run_id) {
    return { hits: hits.length, inserted: 0 };
  }

  const saveResult = await saveMatchmakerFighterResultaten({
    matchmaking_id,
    controle_run_id,
    deleteExistingForRun: false,
    hits: hits.map((hit) => ({
      matchmaking_id,
      controle_run_id,
      fighter_id,
      inschrijving_id,
      row_nr,
      naam,
      va_nummer,
      rule: hit.rule,
      rule_code: hit.rule_code,
      resultaat: hit.resultaat,
      severity: hit.severity,
      boodschap: hit.boodschap,
    })),
  });

  return {
    hits: hits.length,
    inserted: saveResult.inserted,
  };
}

export async function POST(req: Request) {
  const t0 = Date.now();

  try {
    const body = await req.json().catch(() => ({}));

    const matchmaking_id = s(body?.matchmaking_id);
    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id is verplicht" },
        { status: 400 }
      );
    }

    const { userId, role } = await requireUserWithRole(req);
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    const fighter_id = asUuid(body?.fighter_id);
    const inschrijving_id = asNumericId(body?.inschrijving_id);
    const row_nr = asRowNr(body?.row_nr);
    const va_nummer_in = toVaStrict(body?.va_nummer);

    const inschrijving = await resolveInschrijving({
      matchmaking_id,
      fighter_id,
      inschrijving_id,
      row_nr,
      va_nummer: va_nummer_in,
    });

    if (!inschrijving) {
      return NextResponse.json(
        { error: "Geen inschrijving gevonden." },
        { status: 404 }
      );
    }

    const fighterIdResolved = asUuid(inschrijving.fighter_id);
    const inschrijvingIdResolved = asNumericId(inschrijving.id);
    const rowNrResolved = asRowNr(inschrijving.row_nr);

    if (!fighterIdResolved && inschrijvingIdResolved == null && rowNrResolved == null) {
      return NextResponse.json(
        { error: "Geen geldige fighter-identificatie gevonden." },
        { status: 400 }
      );
    }

    const va_nummer = toVaStrict(va_nummer_in ?? inschrijving.va_nummer);
    if (!va_nummer) {
      return NextResponse.json(
        { error: "Geen geldig VA nummer gevonden voor deze vechter." },
        { status: 400 }
      );
    }

    const controle_run_id = await getLatestRunId(matchmaking_id);

    const bundlePath = resolveScriptPath(
      "scrapers",
      "fp_bundle_mm",
      "scraper_fp_bundle_mm.js"
    );

    const scriptArgs = controle_run_id
      ? [matchmaking_id, controle_run_id, va_nummer]
      : [matchmaking_id, va_nummer];

    await runNodeScript(bundlePath, scriptArgs, path.dirname(bundlePath));

    const raw = await patchLatestRawWithFighter(
      inschrijving,
      va_nummer,
      controle_run_id
    );

    const context = await buildAndUpsertContext(
      inschrijving,
      raw,
      controle_run_id
    );

    await enrichMatchmakerBoutContext(matchmaking_id, controle_run_id ?? undefined);

    let refreshedCtx: any = null;

    if (fighterIdResolved) {
      const { data, error } = await supabase
        .from("matchmaker_fighter_context")
        .select("*")
        .eq("matchmaking_id", matchmaking_id)
        .eq("fighter_id", fighterIdResolved)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      refreshedCtx = data?.[0] ?? null;
    }

    if (!refreshedCtx && rowNrResolved != null) {
      const { data, error } = await supabase
        .from("matchmaker_fighter_context")
        .select("*")
        .eq("matchmaking_id", matchmaking_id)
        .eq("row_nr", rowNrResolved)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      refreshedCtx = data?.[0] ?? null;
    }

    if (!refreshedCtx && inschrijvingIdResolved != null) {
      const { data, error } = await supabase
        .from("matchmaker_fighter_context")
        .select("*")
        .eq("matchmaking_id", matchmaking_id)
        .eq("inschrijving_id", inschrijvingIdResolved)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      refreshedCtx = data?.[0] ?? null;
    }

    refreshedCtx = refreshedCtx ?? context;

    const rulesSummary = refreshedCtx
      ? await rerunSingleFighterRules({
          matchmaking_id,
          controle_run_id,
          ctx: refreshedCtx,
        })
      : { hits: 0, inserted: 0 };

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      controle_run_id,
      fighter_id: fighterIdResolved,
      inschrijving_id: inschrijvingIdResolved,
      row_nr: rowNrResolved,
      va_nummer,
      raw_id: raw?.id ?? null,
      context_id: refreshedCtx?.id ?? context?.id ?? null,
      fighter_rules_hits: rulesSummary.hits,
      fighter_rules_inserted: rulesSummary.inserted,
      ms: Date.now() - t0,
    });
  } catch (e: any) {
    if (e instanceof Response) {
      return e;
    }

    console.error("❌ fighter-rescrape error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}