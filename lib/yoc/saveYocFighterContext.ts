// lib/yoc/saveYocFighterContext.ts

import { type AnyRow, type SupabaseLike, normalizeVa, safeInsert, s } from "./yocUtils";

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
  if (/^\d{4}-\d{2}-\d{2}/.test(x)) return x.slice(0, 10);
  const m = x.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function boolOrNull(v: any): boolean | null {
  if (v === true || v === false) return v;
  const x = s(v).toLowerCase();
  if (!x) return null;
  if (["true", "ja", "yes", "1", "ok", "geldig"].includes(x)) return true;
  if (["false", "nee", "no", "0", "ongeldig", "geen", "niet geldig"].includes(x)) return false;
  return null;
}

function pick(row: AnyRow, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && s(value) !== "") return value;
  }
  return null;
}

function toContextRow(ctx: AnyRow) {
  const now = new Date().toISOString();
  const va = normalizeVa(pick(ctx, ["va_nummer", "va", "va_nummer_mm", "fighter_id"]));

  return {
    yoc_event_id: pick(ctx, ["yoc_event_id", "yocEventId"]),
    yoc_run_id: pick(ctx, ["yoc_run_id", "yocRunId"]),
    // Let op: fighter_raw_id heeft een FK naar yoc_fighters_raw.id.
    // Niet terugvallen op yoc_fighter_id/id, anders krijg je FK-errors en verdwijnen meldingen.
    fighter_raw_id: pick(ctx, ["fighter_raw_id"]),
    yoc_fighter_id: pick(ctx, ["yoc_fighter_id"]),
    upload_id: pick(ctx, ["upload_id"]),
    row_index: i(pick(ctx, ["row_index", "row_nr", "rij"])),
    row_nr: i(pick(ctx, ["row_nr", "row_index", "rij"])),

    va_nummer: va,

    naam_mm: pick(ctx, ["naam_mm", "naam_input", "naam"]),
    naam_input: pick(ctx, ["naam_input", "naam_mm"]),
    naam_fp: pick(ctx, ["naam_fp", "fp_naam"]),
    fp_naam: pick(ctx, ["fp_naam", "naam_fp"]),

    geslacht_mm: pick(ctx, ["geslacht_mm", "geslacht_input", "geslacht"]),
    geslacht_fp: pick(ctx, ["geslacht_fp", "fp_geslacht"]),
    fp_geslacht: pick(ctx, ["fp_geslacht", "geslacht_fp"]),

    geboortedatum_mm: dateOrNull(pick(ctx, ["geboortedatum_mm", "geboortedatum_input"])),
    geboortedatum_input: dateOrNull(pick(ctx, ["geboortedatum_input", "geboortedatum_mm"])),
    geboortedatum_fp: dateOrNull(pick(ctx, ["geboortedatum_fp", "fp_geboortedatum"])),
    fp_geboortedatum: dateOrNull(pick(ctx, ["fp_geboortedatum", "geboortedatum_fp"])),
    geboortedatum: dateOrNull(pick(ctx, ["geboortedatum", "geboortedatum_fp", "geboortedatum_mm"])),
    leeftijd: i(pick(ctx, ["leeftijd", "leeftijd_event"])),
    leeftijd_event: i(pick(ctx, ["leeftijd_event", "leeftijd"])),
    evenement_datum: dateOrNull(pick(ctx, ["evenement_datum", "event_datum", "eventDate", "event_date"])),
    event_datum: dateOrNull(pick(ctx, ["event_datum", "evenement_datum", "eventDate", "event_date"])),

    sportschool_mm: pick(ctx, ["sportschool_mm", "gym_input", "sportschool", "gym"]),
    gym_input: pick(ctx, ["gym_input", "sportschool_mm"]),
    sportschool_fp: pick(ctx, ["sportschool_fp", "fp_gym", "gym_fp"]),
    fp_gym: pick(ctx, ["fp_gym", "sportschool_fp", "gym_fp"]),
    sportschool: pick(ctx, ["sportschool", "sportschool_fp", "sportschool_mm"]),

    gewicht_mm: n(pick(ctx, ["gewicht_mm", "gewicht"])),
    gewicht: n(pick(ctx, ["gewicht", "gewicht_mm"])),

    klasse: pick(ctx, ["klasse", "klasse_mm", "klasse_fp"]),
    klasse_mm: pick(ctx, ["klasse_mm", "klasse"]),
    klasse_fp: pick(ctx, ["klasse_fp", "fp_klasse"]),
    fp_klasse: pick(ctx, ["fp_klasse", "klasse_fp"]),

    licentie: pick(ctx, ["licentie", "licentie_status"]),
    licentie_status: pick(ctx, ["licentie_status", "licentie"]),
    licentie_ok: boolOrNull(pick(ctx, ["licentie_ok", "licentie", "licentie_status"])),
    heeft_startverbod: boolOrNull(pick(ctx, ["heeft_startverbod", "startverbod"])),
    startverbod: pick(ctx, ["startverbod", "heeft_startverbod"]),

    heeft_keurmerk: boolOrNull(pick(ctx, ["heeft_keurmerk", "keurmerk", "keurmerk_ok"])),
    keurmerk: boolOrNull(pick(ctx, ["keurmerk", "heeft_keurmerk", "keurmerk_ok"])),
    keurmerk_ok: boolOrNull(pick(ctx, ["keurmerk_ok", "heeft_keurmerk", "keurmerk"])),
    keurmerk_status: pick(ctx, ["keurmerk_status"]),
    keurmerk_reden: pick(ctx, ["keurmerk_reden"]),
    keurmerk_einddatum: dateOrNull(pick(ctx, ["keurmerk_einddatum", "keurmerk_einde", "keurmerk_eind", "einde_keurmerk"])),
    sportschool_id: pick(ctx, ["sportschool_id"]),
    sportschool_match_naam: pick(ctx, ["sportschool_match_naam"]),
    sportschool_match_plaats: pick(ctx, ["sportschool_match_plaats"]),
    sportschool_match_land: pick(ctx, ["sportschool_match_land"]),

    totaal_wedstrijden: i(pick(ctx, ["totaal_wedstrijden", "record_totaal"])),
    gewonnen: i(pick(ctx, ["gewonnen", "record_w", "wins"])),
    record_w: i(pick(ctx, ["record_w", "gewonnen", "wins"])),
    record_l: i(pick(ctx, ["record_l", "verloren", "losses"])),
    record_d: i(pick(ctx, ["record_d", "draws", "onbeslist"])),

    nulmeting_totaal: i(pick(ctx, ["nulmeting_totaal"])),
    nulmeting_klasse: pick(ctx, ["nulmeting_klasse"]),
    nulmeting_opmerking: pick(ctx, ["nulmeting_opmerking"]),

    naam_match: boolOrNull(pick(ctx, ["naam_match"])),
    geboortedatum_match: boolOrNull(pick(ctx, ["geboortedatum_match"])),
    gym_match: boolOrNull(pick(ctx, ["gym_match"])),

    scrape_status: pick(ctx, ["scrape_status", "controle_status"]),
    scrape_error: pick(ctx, ["scrape_error", "error"]),
    scraped_at: pick(ctx, ["scraped_at"]) ?? now,
    updated_at: now,
    extra: pick(ctx, ["extra"]) ?? null,
  };
}

async function deleteOldContexts(params: { supabase: SupabaseLike; yocEventId: string; rows: AnyRow[] }) {
  const { supabase, yocEventId, rows } = params;

  const rawIds = Array.from(new Set(rows.map((r) => s(pick(r, ["fighter_raw_id"]))).filter(Boolean)));
  if (rawIds.length) {
    await supabase.from("yoc_fighter_context").delete().eq("yoc_event_id", yocEventId).in("fighter_raw_id", rawIds);
  }

  const fighterIds = Array.from(new Set(rows.map((r) => s(pick(r, ["yoc_fighter_id"]))).filter(Boolean)));
  if (fighterIds.length) {
    await supabase.from("yoc_fighter_context").delete().eq("yoc_event_id", yocEventId).in("yoc_fighter_id", fighterIds);
  }

  const vas = Array.from(new Set(rows.map((r) => normalizeVa(pick(r, ["va_nummer", "va", "va_nummer_mm"]))).filter(Boolean) as string[]));
  if (vas.length) {
    await supabase.from("yoc_fighter_context").delete().eq("yoc_event_id", yocEventId).in("va_nummer", vas);
  }
}

export async function saveYocFighterContexts(params: { supabase: SupabaseLike; yocEventId: string; contexts: AnyRow[] }) {
  const { supabase, yocEventId, contexts } = params;
  const rows = (contexts ?? []).map(toContextRow).filter((r) => r.yoc_event_id);
  if (!rows.length) return { data: [], error: null };

  await deleteOldContexts({ supabase, yocEventId, rows });
  const { data, error } = await safeInsert(supabase, "yoc_fighter_context", rows);
  return { data: data ?? [], error };
}

function reviewKey(row: AnyRow): string {
  return [
    s(row?.fighter_raw_id),
    s(row?.rule_code ?? row?.rule).toUpperCase(),
    s(row?.boodschap),
  ].join("|");
}

export async function saveYocFighterRules(params: { supabase: SupabaseLike; yocEventId: string; yocRunId?: string | null; hits: AnyRow[] }) {
  const { supabase, yocEventId, yocRunId = null, hits } = params;
  if (!hits?.length) return { data: [], error: null };

  const fighterRawIds = Array.from(
    new Set(hits.map((hit) => s(hit?.fighter_raw_id)).filter(Boolean)),
  );

  // Full run en single fighter rescrape kunnen allebei via deze functie.
  // We verwijderen alleen resultaten van de betrokken fighter_raw_id's.
  // Daardoor raakt een herscrape van 1 vechter nooit de meldingen van andere vechters.
  let existingReviews: AnyRow[] = [];
  if (fighterRawIds.length) {
    const { data: oldRows, error: oldErr } = await supabase
      .from("yoc_resultaten")
      .select("fighter_raw_id,rule,rule_code,boodschap,review_status,reviewed_by,reviewed_at,original_resultaat,aantekeningen")
      .eq("yoc_event_id", yocEventId)
      .in("fighter_raw_id", fighterRawIds);

    if (oldErr) return { data: [], error: oldErr };
    existingReviews = oldRows ?? [];

    const { error: delErr } = await supabase
      .from("yoc_resultaten")
      .delete()
      .eq("yoc_event_id", yocEventId)
      .in("fighter_raw_id", fighterRawIds);

    if (delErr) return { data: [], error: delErr };
  } else {
    // Fallback voor oude/onvolledige hits zonder fighter_raw_id.
    // Dit blijft beperkt tot de run als yocRunId bekend is.
    let del = supabase.from("yoc_resultaten").delete().eq("yoc_event_id", yocEventId);
    if (yocRunId) del = del.eq("yoc_run_id", yocRunId);
    const { error: delErr } = await del;
    if (delErr) return { data: [], error: delErr };
  }

  const reviewByKey = new Map<string, AnyRow>();
  for (const oldRow of existingReviews) {
    const status = s(oldRow?.review_status).toLowerCase();
    if (!status || status === "open") continue;
    reviewByKey.set(reviewKey(oldRow), oldRow);
  }

  const rows = hits.map((hit) => {
    const base = {
      yoc_event_id: yocEventId,
      yoc_run_id: yocRunId ?? hit.yoc_run_id ?? null,
      // yoc_resultaten koppelt bewust alleen via fighter_raw_id.
      // De tabel heeft geen yoc_fighter_id en geen va_nummer kolom.
      fighter_raw_id: hit.fighter_raw_id ?? null,
      rule: hit.rule ?? hit.rule_code ?? null,
      rule_code: hit.rule_code ?? hit.rule ?? null,
      resultaat: hit.resultaat ?? null,
      severity: hit.severity ?? null,
      boodschap: hit.boodschap ?? null,
      created_at: new Date().toISOString(),
    };

    // Als dezelfde melding na herscrape terugkomt, behoud dan de review.
    const oldReview = reviewByKey.get(reviewKey(base));
    if (!oldReview) return base;

    return {
      ...base,
      review_status: oldReview.review_status ?? null,
      reviewed_by: oldReview.reviewed_by ?? null,
      reviewed_at: oldReview.reviewed_at ?? null,
      original_resultaat: oldReview.original_resultaat ?? hit.resultaat ?? null,
      aantekeningen: oldReview.aantekeningen ?? null,
      resultaat:
        s(oldReview.review_status).toLowerCase() === "goedgekeurd"
          ? "ok"
          : base.resultaat,
    };
  });

  const { data, error } = await safeInsert(supabase, "yoc_resultaten", rows);
  return { data: data ?? [], error };
}
