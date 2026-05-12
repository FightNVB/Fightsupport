// lib/matchmaker/saveSingleFighterContext.ts

import { type AnyRow, type SupabaseLike, normalizeVa } from "./singleFighterUtils";

function s(v: any): string {
  return String(v ?? "").trim();
}

function n(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const num = Number(String(v).replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function i(v: any): number | null {
  const num = n(v);
  return num === null ? null : Math.trunc(num);
}

function dateOrNull(v: any): string | null {
  const x = s(v);
  if (!x) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;

  const m = x.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }

  return null;
}

function boolOrNull(v: any): boolean | null {
  if (v === true || v === false) return v;

  const x = s(v).toLowerCase();
  if (!x) return null;

  if (["true", "ja", "yes", "1", "ok"].includes(x)) return true;
  if (["false", "nee", "no", "0"].includes(x)) return false;

  return null;
}

function uuidOrNull(v: any): string | null {
  const x = s(v);
  if (!x) return null;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x)
    ? x
    : null;
}

function pick(row: AnyRow, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && s(value) !== "") return value;
  }
  return null;
}

function toContextRow(ctx: AnyRow) {
  const va = normalizeVa(
    pick(ctx, ["va_nummer", "va", "fighter_va", "fighterVa"])
  );

  const now = new Date().toISOString();

  return {
    updated_at: now,

    inschrijving_id: i(pick(ctx, ["inschrijving_id", "aanmelding_id", "id_aanmelding"])),
    matchmaking_id: uuidOrNull(pick(ctx, ["matchmaking_id", "matchmakingId"])),
    controle_run_id: uuidOrNull(pick(ctx, ["controle_run_id", "controleRunId", "scrape_run_id"])),
    fighter_id: uuidOrNull(pick(ctx, ["fighter_id", "fighterId"])),
    event_id: uuidOrNull(pick(ctx, ["event_id", "eventId"])),

    row_nr: i(pick(ctx, ["row_nr", "rowNr", "rij", "regel"])),

    discipline: pick(ctx, ["discipline"]),
    klasse: pick(ctx, ["klasse", "klasse_input", "klasse_mm"]),
    geslacht: pick(ctx, ["geslacht", "fp_geslacht", "geslacht_input"]),

    voornaam: pick(ctx, ["voornaam"]),
    achternaam: pick(ctx, ["achternaam"]),
    naam: pick(ctx, ["naam", "fp_naam", "naam_input"]),
    naam_input: pick(ctx, ["naam_input", "input_naam"]),
    gym_input: pick(ctx, ["gym_input", "sportschool_input", "sportschool_mm", "gym"]),
    geboortedatum_input: dateOrNull(pick(ctx, ["geboortedatum_input", "input_geboortedatum"])),

    gewicht: n(pick(ctx, ["gewicht"])),

    va_nummer: va,

    fp_naam: pick(ctx, ["fp_naam", "naam_fp"]),
    fp_geboortedatum: dateOrNull(pick(ctx, ["fp_geboortedatum", "geboortedatum_fp"])),
    fp_gym: pick(ctx, ["fp_gym", "gym_fp", "sportschool_fp"]),
    fp_klasse: pick(ctx, ["fp_klasse", "klasse_fp"]),
    fp_geslacht: pick(ctx, ["fp_geslacht", "geslacht_fp"]),

    geboortedatum: dateOrNull(pick(ctx, ["geboortedatum", "fp_geboortedatum", "geboortedatum_fp"])),

    licentie: pick(ctx, ["licentie", "licentie_status"]),
    heeft_startverbod: pick(ctx, ["heeft_startverbod", "startverbod"]),
    heeft_keurmerk: pick(ctx, ["heeft_keurmerk", "keurmerk"]),
    keurmerk_reden: pick(ctx, ["keurmerk_reden"]),

    totaal_wedstrijden: i(pick(ctx, ["totaal_wedstrijden", "record_totaal"])),
    gewonnen: i(pick(ctx, ["gewonnen", "record_w", "wins"])),
    record_w: i(pick(ctx, ["record_w", "gewonnen", "wins"])),
    record_l: i(pick(ctx, ["record_l", "verloren", "losses"])),
    record_d: i(pick(ctx, ["record_d", "draws", "gelijk"])),

    nulmeting_totaal: i(pick(ctx, ["nulmeting_totaal"])),
    nulmeting_klasse: pick(ctx, ["nulmeting_klasse"]),
    nulmeting_opmerking: pick(ctx, ["nulmeting_opmerking"]),

    naam_match: boolOrNull(pick(ctx, ["naam_match"])),
    geboortedatum_match: boolOrNull(pick(ctx, ["geboortedatum_match"])),
    gym_match: boolOrNull(pick(ctx, ["gym_match"])),

    uitslagen_count: i(pick(ctx, ["uitslagen_count"])),
    laatste_partij_datum: dateOrNull(pick(ctx, ["laatste_partij_datum"])),

    scraped_at: pick(ctx, ["scraped_at"]) ?? now,
    evenement_datum: dateOrNull(pick(ctx, ["evenement_datum", "eventDate", "event_date"])),

    extra: {
      scrape_status: pick(ctx, ["scrape_status", "controle_status"]),
      bron: pick(ctx, ["bron", "source"]),
      raw: pick(ctx, ["raw"]),
    },
  };
}

async function deleteOldContexts(params: {
  supabase: SupabaseLike;
  matchmakingId: string;
  rows: AnyRow[];
}) {
  const { supabase, matchmakingId, rows } = params;

  const inschrijvingIds = rows
    .map((r) => i(pick(r, ["inschrijving_id"])))
    .filter((x): x is number => x !== null);

  if (inschrijvingIds.length) {
    await supabase
      .from("matchmaker_fighter_context")
      .delete()
      .eq("matchmaking_id", matchmakingId)
      .in("inschrijving_id", inschrijvingIds);
  }

  const vaNummers = rows
    .map((r) => normalizeVa(pick(r, ["va_nummer", "va"])))
    .filter(Boolean);

  if (vaNummers.length) {
    await supabase
      .from("matchmaker_fighter_context")
      .delete()
      .eq("matchmaking_id", matchmakingId)
      .in("va_nummer", vaNummers);
  }
}

export async function saveSingleFighterContexts(params: {
  supabase: SupabaseLike;
  matchmakingId: string;
  contexts: AnyRow[];
}) {
  const { supabase, matchmakingId, contexts } = params;

  const rows = (contexts ?? []).map(toContextRow);

  if (!rows.length) {
    return { data: [], error: null };
  }

  await deleteOldContexts({ supabase, matchmakingId, rows });

  const { data, error } = await supabase
    .from("matchmaker_fighter_context")
    .insert(rows)
    .select("*");

  return { data: data ?? [], error };
}

export async function saveSingleFighterRules(params: {
  supabase: SupabaseLike;
  matchmakingId: string;
  controleRunId: string;
  hits: AnyRow[];
}) {
  const { supabase, matchmakingId, controleRunId, hits } = params;

  if (!hits?.length) return { data: [], error: null };

  const table = "matchmaker_fighter_resultaten";

  await supabase
    .from(table)
    .delete()
    .eq("matchmaking_id", matchmakingId)
    .eq("controle_run_id", controleRunId);

  const rows = hits.map((hit) => ({
  matchmaking_id: matchmakingId,
  controle_run_id: controleRunId,
  inschrijving_id: i(hit.inschrijving_id),
  fighter_id: uuidOrNull(hit.fighter_id),
  va_nummer: normalizeVa(hit.va_nummer),

  rule: hit.rule ?? null,
  rule_code: hit.rule_code ?? null,
  resultaat: hit.resultaat ?? null,
  severity: hit.severity ?? null,
  boodschap: hit.boodschap ?? null,

  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

  const { data, error } = await supabase.from(table).insert(rows).select("*");

  return { data: data ?? [], error };
}

export async function markAanmeldingenFromContexts(params: {
  supabase: SupabaseLike;
  matchmakingId: string;
  contexts: AnyRow[];
}) {
  const { supabase, matchmakingId, contexts } = params;

  const okIds: number[] = [];
  const failIds: number[] = [];

  for (const ctx of contexts ?? []) {
    const id = i(pick(ctx, ["inschrijving_id"]));
    if (!id) continue;

    const status = s(pick(ctx, ["scrape_status", "controle_status"])).toLowerCase();

    if (status.includes("mislukt") || status.includes("fail") || status.includes("error")) {
      failIds.push(id);
    } else {
      okIds.push(id);
    }
  }

  const now = new Date().toISOString();

  if (okIds.length) {
    await supabase
      .from("aanmeldingen")
      .update({
        scrape_status: "gecontroleerd",
        controle_status: "gecontroleerd",
        gegevens_status: "gecontroleerd",
        checked_at: now,
        scraped_at: now,
        updated_at: now,
      })
      .eq("matchmaking_id", matchmakingId)
      .in("id", okIds);
  }

  if (failIds.length) {
    await supabase
      .from("aanmeldingen")
      .update({
        scrape_status: "controle_mislukt",
        controle_status: "controle_mislukt",
        gegevens_status: "controle_mislukt",
        checked_at: now,
        updated_at: now,
      })
      .eq("matchmaking_id", matchmakingId)
      .in("id", failIds);
  }

  return { ok: true };
}