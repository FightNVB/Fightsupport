import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
} from "@/app/api/_utils/authz";
import {
  buildSingleFighterContext,
  normalizeVa,
  type AnyRow,
} from "@/lib/matchmaker/buildSingleFighterContext";
import { enrichSingleFighterContext } from "@/lib/matchmaker/enrichSingleFighterContext";
import { rulesSingleFighter } from "@/lib/matchmaker/rulesSingleFighter";
import {
  saveSingleFighterContexts,
  saveSingleFighterRules,
} from "@/lib/matchmaker/saveSingleFighterContext";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function normalizeText(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  return s ? s : null;
}

function normalizeNumber(input: unknown): number | null {
  if (input === null || input === undefined || input === "") return null;
  const n = Number(String(input).replace(",", ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(input: unknown): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const nl = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (nl) {
    return `${nl[3]}-${nl[2].padStart(2, "0")}-${nl[1].padStart(2, "0")}`;
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function isUuid(input: unknown): boolean {
  const value = String(input ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function uuidOrNull(input: unknown): string | null {
  const value = String(input ?? "").trim();
  return isUuid(value) ? value : null;
}

function splitName(fullName: string | null) {
  const name = String(fullName ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { voornaam: null as string | null, achternaam: null as string | null };

  const parts = name.split(" ");
  if (parts.length === 1) {
    return { voornaam: parts[0], achternaam: null as string | null };
  }

  return {
    voornaam: parts[0],
    achternaam: parts.slice(1).join(" "),
  };
}

function safeJson(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return {};
  }
}

function duplicateKey(naam: string | null, va: string | null) {
  const n = String(naam ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const v = String(va ?? "").trim();

  if (n && v) return `name-va:${n}|${v}`;
  if (v) return `va:${v}`;
  if (n) return `name:${n}`;
  return null;
}

async function findAanmelding(args: {
  matchmaking_id: string;
  inschrijving_id?: string | number | null;
  old_va_nummer?: string | null;
}) {
  const { matchmaking_id } = args;
  const inschrijvingId = String(args.inschrijving_id ?? "").trim();
  const oldVa = normalizeVa(args.old_va_nummer);

  if (inschrijvingId) {
    const { data, error } = await supabase
      .from("aanmeldingen")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("id", inschrijvingId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (oldVa) {
    const { data, error } = await supabase
      .from("aanmeldingen")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("va_nummer", oldVa)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    if (data?.[0]) return data[0];
  }

  return null;
}

async function loadLatestControleRunId(matchmaking_id: string, fallback?: string | null) {
  if (fallback) return fallback;

  const { data, error } = await supabase
    .from("controle_runs")
    .select("id, gestart_op, created_at")
    .eq("matchmaking_id", matchmaking_id)
    .order("gestart_op", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (error) {
    console.warn("[matchmaker/correct-fighter] controle_run niet geladen:", error.message);
    return null;
  }

  return data?.[0]?.id ? String(data[0].id) : null;
}

async function loadEventDate(matchmaking_id: string) {
  const { data, error } = await supabase
    .from("matchmakings")
    .select("datum")
    .eq("id", matchmaking_id)
    .maybeSingle();

  if (error) throw error;
  return data?.datum ?? null;
}

async function loadFightersRaw(matchmaking_id: string, va_nummer: string | null) {
  if (!va_nummer) return null;

  const { data, error } = await supabase
    .from("matchmaker_fighters_raw")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("va_nummer", va_nummer)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (error) {
    console.warn("[matchmaker/correct-fighter] matchmaker_fighters_raw niet geladen:", error.message);
    return null;
  }

  return (data?.[0] ?? null) as AnyRow | null;
}

async function loadUitslagen(matchmaking_id: string, va_nummer: string | null) {
  if (!va_nummer) return [] as AnyRow[];

  const { data, error } = await supabase
    .from("matchmaker_uitslagen_raw")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("va_nummer", va_nummer)
    .order("datum", { ascending: false });

  if (error) {
    console.warn("[matchmaker/correct-fighter] matchmaker_uitslagen_raw niet geladen:", error.message);
    return [] as AnyRow[];
  }

  return (data ?? []) as AnyRow[];
}

function setIfColumnExists(
  target: Record<string, any>,
  row: Record<string, any>,
  column: string,
  value: any,
) {
  if (value === undefined) return;
  if (Object.prototype.hasOwnProperty.call(row, column)) target[column] = value;
}

function mergeCorrectionIntoJson(rawJson: any, values: Record<string, any>, userId: string | null) {
  const json = safeJson(rawJson);
  const correctedAt = new Date().toISOString();
  const cleanValues = Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined)
  );

  const patchRawFighter = (source: any) => {
    const obj = source && typeof source === "object" ? source : {};
    return {
      ...obj,
      ...cleanValues,
      corrected_at: correctedAt,
      corrected_by: userId,
      corrected_via: "matchmaker_correct_fighter",
    };
  };

  return {
    ...json,
    ...cleanValues,
    corrected_at: correctedAt,
    corrected_by: userId,
    corrected_via: "matchmaker_correct_fighter",
    corrected_values: {
      ...(json.corrected_values && typeof json.corrected_values === "object"
        ? json.corrected_values
        : {}),
      ...cleanValues,
    },
    aanmelding: patchRawFighter(json.aanmelding),
    raw: patchRawFighter(json.raw),
    extra: {
      ...(json.extra && typeof json.extra === "object" ? json.extra : {}),
      raw: {
        ...(json.extra?.raw && typeof json.extra.raw === "object" ? json.extra.raw : {}),
        aanmelding: patchRawFighter(json.extra?.raw?.aanmelding),
      },
    },
  };
}

async function syncMatchmakerFightersRawCorrection(args: {
  matchmaking_id: string;
  old_va_nummer: string | null;
  new_va_nummer: string | null;
  aanmelding_id: string | number | null;
  patch: Record<string, any>;
  userId: string | null;
}) {
  const oldVa = normalizeVa(args.old_va_nummer);
  const newVa = normalizeVa(args.new_va_nummer);
  const aanmeldingId = String(args.aanmelding_id ?? "").trim();
  const vaList = Array.from(new Set([oldVa, newVa].filter(Boolean))) as string[];

  let query = supabase
    .from("matchmaker_fighters_raw")
    .select("*")
    .eq("matchmaking_id", args.matchmaking_id);

  if (vaList.length) {
    query = query.in("va_nummer", vaList);
  } else if (aanmeldingId) {
    query = query.eq("aanmelding_id", aanmeldingId);
  } else {
    return {
      synced: false,
      rows: 0,
      reason: "Geen VA of aanmelding_id om matchmaker_fighters_raw te vinden.",
    };
  }

  const { data: rawRows, error: loadError } = await query;

  if (loadError) {
    console.warn(
      "[matchmaker/correct-fighter] matchmaker_fighters_raw sync laden mislukt:",
      loadError.message,
    );
    return { synced: false, rows: 0, reason: loadError.message };
  }

  const rows = (rawRows ?? []) as Record<string, any>[];
  if (!rows.length) {
    return {
      synced: false,
      rows: 0,
      reason: "Geen matchmaker_fighters_raw rij gevonden voor deze correctie.",
    };
  }

  const correctedValues = {
    va_nummer: newVa ?? undefined,
    va: newVa ?? undefined,
    // fighter_id is in meerdere matchmaker-tabellen een UUID-kolom.
    // Een VA-nummer zoals "19773" mag daar nooit in geschreven worden.
    // VA hoort uitsluitend in va_nummer/va.
    fighter_id: uuidOrNull(args.patch.fighter_id) ?? undefined,
    naam: args.patch.naam,
    fp_naam: args.patch.naam,
    naam_input: args.patch.naam,
    voornaam: args.patch.voornaam,
    achternaam: args.patch.achternaam,
    gym: args.patch.gym,
    sportschool: args.patch.gym,
    fp_gym: args.patch.gym,
    sportschool_input: args.patch.gym,
    discipline: args.patch.discipline,
    discipline_input: args.patch.discipline,
    klasse: args.patch.klasse,
    fp_klasse: args.patch.klasse,
    klasse_fp: args.patch.klasse,
    klasse_input: args.patch.klasse,
    geslacht: args.patch.geslacht,
    gender: args.patch.geslacht,
    geboortedatum: args.patch.geboortedatum,
    fp_geboortedatum: args.patch.geboortedatum,
    geboortedatum_fp: args.patch.geboortedatum,
    gewicht: args.patch.gewicht,
    gewicht_input: args.patch.gewicht,
    fp_gewicht: args.patch.gewicht,
    win: args.patch.win,
    wins: args.patch.win,
    record_w: args.patch.win,
    loss: args.patch.loss,
    losses: args.patch.loss,
    record_l: args.patch.loss,
    draw: args.patch.draw,
    draws: args.patch.draw,
    record_d: args.patch.draw,
  };

  let updatedRows = 0;

  for (const row of rows) {
    const rawPatch: Record<string, any> = {};

    for (const [column, value] of Object.entries(correctedValues)) {
      setIfColumnExists(rawPatch, row, column, value);
    }

    if (Object.prototype.hasOwnProperty.call(row, "updated_at")) {
      rawPatch.updated_at = new Date().toISOString();
    }

    if (Object.prototype.hasOwnProperty.call(row, "raw_json")) {
      rawPatch.raw_json = mergeCorrectionIntoJson(row.raw_json, correctedValues, args.userId);
    }

    if (Object.prototype.hasOwnProperty.call(row, "raw")) {
      rawPatch.raw = mergeCorrectionIntoJson(row.raw, correctedValues, args.userId);
    }

    if (!Object.keys(rawPatch).length) continue;

    let updateQuery = supabase.from("matchmaker_fighters_raw").update(rawPatch);
    if (row.id !== null && row.id !== undefined) {
      updateQuery = updateQuery.eq("id", row.id);
    } else {
      updateQuery = updateQuery
        .eq("matchmaking_id", args.matchmaking_id)
        .eq("va_nummer", row.va_nummer);
    }

    const { error: updateError } = await updateQuery;
    if (updateError) throw updateError;
    updatedRows += 1;
  }

  return { synced: updatedRows > 0, rows: updatedRows, reason: null };
}

async function recalculateSingleFighter(args: {
  matchmaking_id: string;
  controle_run_id: string | null;
  aanmelding: AnyRow;
}) {
  const { matchmaking_id, aanmelding } = args;
  const controle_run_id = await loadLatestControleRunId(
    matchmaking_id,
    args.controle_run_id
  );

  if (!controle_run_id) {
    return {
      recalculated: false,
      reason: "Geen controle_run gevonden; aanmelding is wel opgeslagen.",
    };
  }

  const va = normalizeVa(aanmelding?.va_nummer);
  const [eventDate, fightersRaw, uitslagen] = await Promise.all([
    loadEventDate(matchmaking_id),
    loadFightersRaw(matchmaking_id, va),
    loadUitslagen(matchmaking_id, va),
  ]);

  const baseContext = buildSingleFighterContext({
    matchmakingId: matchmaking_id,
    controleRunId: controle_run_id,
    aanmelding,
    fightersRaw,
    uitslagen,
    eventDate,
  });

  const enrichedContext = await enrichSingleFighterContext({
    supabase,
    context: baseContext,
  });

  const hits = rulesSingleFighter(enrichedContext);

  const contextResult = await saveSingleFighterContexts({
    supabase,
    matchmakingId: matchmaking_id,
    contexts: [enrichedContext],
  });

  if (contextResult.error) throw contextResult.error;

  const rulesResult = await saveSingleFighterRules({
    supabase,
    matchmakingId: matchmaking_id,
    controleRunId: controle_run_id,
    hits,
  });

  if (rulesResult.error) throw rulesResult.error;

  const enrichedAny = enrichedContext as any;

  return {
    recalculated: true,
    controle_run_id,
    context_rows: contextResult.data?.length ?? 0,
    rules: hits.length,
    keurmerk_status: enrichedAny.keurmerk_status ?? null,
    keurmerk: enrichedAny.keurmerk ?? enrichedAny.heeft_keurmerk ?? null,
    keurmerk_reden: enrichedAny.keurmerk_reden ?? null,
  };
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req, [
      "matchmaker",
      "admin",
      "superadmin",
    ]);

    const body = await req.json().catch(() => ({}));
    const matchmaking_id = String(body?.matchmaking_id ?? "").trim();

    if (!matchmaking_id) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    }

    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    const aanmelding = await findAanmelding({
      matchmaking_id,
      inschrijving_id: body?.inschrijving_id,
      old_va_nummer: body?.old_va_nummer ?? body?.va_nummer,
    });

    if (!aanmelding) {
      return NextResponse.json(
        { error: "Aanmelding niet gevonden voor deze matchmaking/vechter." },
        { status: 404 }
      );
    }

    const newVa = normalizeVa(
      body?.new_va_nummer ?? body?.va_nummer ?? aanmelding.va_nummer
    );
    const naam = normalizeText(body?.naam ?? aanmelding.naam);
    const { voornaam, achternaam } = splitName(naam);

    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (newVa !== null) patch.va_nummer = newVa;
    if (naam !== null) patch.naam = naam;
    if (voornaam !== null) patch.voornaam = voornaam;
    if (achternaam !== null) patch.achternaam = achternaam;

    if (body?.gym !== undefined) patch.gym = normalizeText(body.gym);
    if (body?.sportschool !== undefined) patch.gym = normalizeText(body.sportschool);
    if (body?.discipline !== undefined) patch.discipline = normalizeText(body.discipline);
    if (body?.klasse !== undefined) patch.klasse = normalizeText(body.klasse);
    if (body?.geslacht !== undefined) patch.geslacht = normalizeText(body.geslacht);
    if (body?.geboortedatum !== undefined) patch.geboortedatum = normalizeDate(body.geboortedatum);
    if (body?.gewicht !== undefined) patch.gewicht = normalizeNumber(body.gewicht);
    if (body?.email !== undefined) patch.email = normalizeText(body.email);
    if (body?.telefoon !== undefined) patch.telefoon = normalizeText(body.telefoon);
    if (body?.win !== undefined) patch.win = normalizeNumber(body.win) ?? 0;
    if (body?.loss !== undefined) patch.loss = normalizeNumber(body.loss) ?? 0;
    if (body?.draw !== undefined) patch.draw = normalizeNumber(body.draw) ?? 0;

    patch.duplicate_key = duplicateKey(
      patch.naam ?? aanmelding.naam,
      patch.va_nummer ?? aanmelding.va_nummer
    );

    const raw = safeJson(aanmelding.raw);
    patch.raw = {
      ...raw,
      corrected_at: new Date().toISOString(),
      corrected_by: userId ?? null,
      corrected_via: "matchmaker_correct_fighter",
      parsed_naam: patch.naam ?? raw.parsed_naam ?? aanmelding.naam ?? null,
      corrected_values: {
        va_nummer: patch.va_nummer ?? aanmelding.va_nummer ?? null,
        naam: patch.naam ?? aanmelding.naam ?? null,
        gym: patch.gym ?? aanmelding.gym ?? null,
        discipline: patch.discipline ?? aanmelding.discipline ?? null,
        klasse: patch.klasse ?? aanmelding.klasse ?? null,
        geslacht: patch.geslacht ?? aanmelding.geslacht ?? null,
        geboortedatum: patch.geboortedatum ?? aanmelding.geboortedatum ?? null,
        gewicht: patch.gewicht ?? aanmelding.gewicht ?? null,
        email: patch.email ?? aanmelding.email ?? null,
        telefoon: patch.telefoon ?? aanmelding.telefoon ?? null,
        win: patch.win ?? aanmelding.win ?? null,
        loss: patch.loss ?? aanmelding.loss ?? null,
        draw: patch.draw ?? aanmelding.draw ?? null,
      },
    };

    const { data: updated, error: updateError } = await supabase
      .from("aanmeldingen")
      .update(patch)
      .eq("id", aanmelding.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    const fighterRawSync = await syncMatchmakerFightersRawCorrection({
      matchmaking_id,
      old_va_nummer: aanmelding.va_nummer,
      new_va_nummer: updated.va_nummer,
      aanmelding_id: updated.id,
      patch,
      userId: userId ?? null,
    });

    const shouldRecalculate =
      body?.recalculate === true ||
      body?.herberekenen === true ||
      body?.rebuild_context === true;

    let recalculation: any = {
      recalculated: false,
      reason: "Alleen aanmelding opgeslagen; geen herberekening gevraagd.",
    };

    if (shouldRecalculate) {
      recalculation = await recalculateSingleFighter({
        matchmaking_id,
        controle_run_id: body?.controle_run_id ? String(body.controle_run_id) : null,
        aanmelding: updated,
      });
    }

    return NextResponse.json({
      ok: true,
      message: shouldRecalculate
        ? "Aanmelding + fighter snapshot bijgewerkt en context/keurmerk/rules opnieuw berekend."
        : "Aanmelding + fighter snapshot bijgewerkt.",
      matchmaking_id,
      old_va_nummer: normalizeVa(aanmelding.va_nummer),
      new_va_nummer: normalizeVa(updated.va_nummer),
      aanmelding: updated,
      matchmaker_fighters_raw_sync: fighterRawSync,
      ...recalculation,
    });
  } catch (e: any) {
    console.error("[matchmaker/correct-fighter] fout:", e);
    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout bij correctie van aanmelding." },
      { status: 500 }
    );
  }
}
