// lib/yoc/buildYocFighterContext.ts
// Bouwt basis-context voor één YOC-deelnemer: uploadrij + FightPassport/raw/context-data.

import {
  type AnyRow,
  normalizeVa,
  pick,
  fullName,
  toNumberOrNull,
  boolish,
  calcAge,
} from "./yocUtils";

export type { AnyRow };
export { normalizeVa } from "./yocUtils";

function s(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function dateOnly(v: unknown): string | null {
  const x = s(v);
  if (!x) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(x)) return x.slice(0, 10);
  const m = x.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function buildYocFighterContext(params: {
  yocEventId: string;
  yocRunId?: string | null;
  yocFighter: AnyRow;
  fightersRaw?: AnyRow | null;
  eventDate?: string | null;
}) {
  const { yocEventId, yocRunId = null, yocFighter, fightersRaw: raw = null, eventDate = null } = params;

  const va = normalizeVa(
    yocFighter?.va_nummer_mm ??
      yocFighter?.va_nummer ??
      yocFighter?.va ??
      yocFighter?.fighter_id ??
      raw?.va_nummer ??
      raw?.fighter_id
  );

  const naamInput = s(
    pick(yocFighter, ["naam_mm", "naam", "fighter_name", "naam_input"]) ??
      [pick(yocFighter, ["voornaam"]), pick(yocFighter, ["achternaam"])].filter(Boolean).join(" ")
  );

  const naamFp = raw ? fullName(raw) : "";
  const geboortedatumInput = dateOnly(pick(yocFighter, ["geboortedatum_mm", "geboortedatum", "birth_date", "dob"]));
  const geboortedatumFp = dateOnly(pick(raw, ["geboortedatum", "geboortedatum_fp", "birth_date"]));
  const geboortedatum = geboortedatumFp ?? geboortedatumInput;

  const gymInput = pick(yocFighter, ["sportschool_mm", "sportschool", "gym", "sportschool_naam", "gym_input"]);
  const gymFp = pick(raw, ["sportschool", "sportschool_fp", "gym", "sportschool_naam"]);
  const klasseFp = pick(raw, ["klasse", "nulmeting_klasse", "klasse_fp"]);
  const licentieRaw = pick(raw, ["licentie", "licentie_status", "licentie_ok", "heeft_licentie", "license", "license_status"]);
  const startverbodRaw = pick(raw, ["heeft_startverbod", "startverbod", "startverbod_status"]);
  const keurmerkRaw = pick(raw, ["heeft_keurmerk", "keurmerk", "gym_keurmerk", "keurmerk_ok"]);
  const keurmerkEinddatumRaw = pick(raw, ["keurmerk_einddatum", "keurmerk_eind", "keurmerk_einde", "einde_keurmerk"]);
  const now = new Date().toISOString();

  return {
    yoc_event_id: yocEventId,
    yoc_run_id: yocRunId,
    // fighter_raw_id moet verwijzen naar yoc_fighters_raw.id (FK), niet naar yoc_fighters.id.
    fighter_raw_id: raw?.id ?? null,
    yoc_fighter_id: yocFighter.id ?? null,
    upload_id: yocFighter.upload_id ?? null,
    row_index: toNumberOrNull(yocFighter.row_index ?? yocFighter.row_nr ?? yocFighter.rij),
    row_nr: toNumberOrNull(yocFighter.row_nr ?? yocFighter.row_index ?? yocFighter.rij),

    va_nummer: va,
    fighter_id: va,
    va: va,

    naam: naamFp || naamInput || null,
    naam_mm: naamInput || null,
    naam_input: naamInput || null,
    naam_fp: naamFp || null,
    fp_naam: naamFp || null,

    geslacht: pick(raw, ["geslacht", "geslacht_fp"]) ?? pick(yocFighter, ["geslacht_mm", "geslacht"]),
    geslacht_mm: pick(yocFighter, ["geslacht_mm", "geslacht"]),
    geslacht_fp: pick(raw, ["geslacht", "geslacht_fp"]),
    fp_geslacht: pick(raw, ["geslacht", "geslacht_fp"]),

    geboortedatum,
    geboortedatum_mm: geboortedatumInput,
    geboortedatum_input: geboortedatumInput,
    geboortedatum_fp: geboortedatumFp,
    fp_geboortedatum: geboortedatumFp,
    leeftijd: calcAge(geboortedatum, eventDate),
    leeftijd_event: calcAge(geboortedatum, eventDate),
    evenement_datum: eventDate,
    event_datum: eventDate,

    sportschool: gymFp ?? gymInput ?? null,
    gym: gymFp ?? gymInput ?? null,
    sportschool_mm: gymInput ?? null,
    gym_input: gymInput ?? null,
    sportschool_fp: gymFp ?? null,
    fp_gym: gymFp ?? null,

    gewicht: toNumberOrNull(pick(yocFighter, ["gewicht_mm", "gewicht", "gewicht_kg"])),
    gewicht_mm: toNumberOrNull(pick(yocFighter, ["gewicht_mm", "gewicht", "gewicht_kg"])),

    klasse: pick(yocFighter, ["klasse", "klasse_mm"]) ?? klasseFp ?? null,
    klasse_mm: pick(yocFighter, ["klasse", "klasse_mm"]),
    klasse_fp: klasseFp ?? null,
    fp_klasse: klasseFp ?? null,
    nulmeting_klasse: pick(raw, ["nulmeting_klasse"]) ?? klasseFp ?? null,
    nulmeting_opmerking: pick(raw, ["nulmeting_opmerking", "nulmeting"]),
    nulmeting_totaal: toNumberOrNull(pick(raw, ["nulmeting_totaal", "nulmeting_aantal", "nulmeting"])),

    licentie: licentieRaw ?? null,
    licentie_status: licentieRaw ?? null,
    licentie_ok: boolish(licentieRaw),
    heeft_startverbod: startverbodRaw ?? null,
    startverbod: startverbodRaw ?? null,
    heeft_keurmerk: keurmerkRaw ?? null,
    keurmerk: keurmerkRaw ?? null,
    keurmerk_ok: boolish(keurmerkRaw),
    keurmerk_status: pick(raw, ["keurmerk_status"]),
    keurmerk_reden: pick(raw, ["keurmerk_reden", "keurmerk_reason"]),
    keurmerk_einddatum: dateOnly(keurmerkEinddatumRaw),

    totaal_wedstrijden: toNumberOrNull(pick(raw, ["totaal_wedstrijden", "record_totaal", "wedstrijden"])),
    gewonnen: toNumberOrNull(pick(raw, ["gewonnen", "record_w", "wins"])),
    record_w: toNumberOrNull(pick(raw, ["record_w", "gewonnen", "wins"])),
    record_l: toNumberOrNull(pick(raw, ["record_l", "verloren", "losses"])),
    record_d: toNumberOrNull(pick(raw, ["record_d", "draws", "onbeslist"])),

    scrape_status: pick(raw, ["scrape_status"]) ?? (raw ? "ok" : "geen_fp_data"),
    scrape_error: pick(raw, ["scrape_error", "error"]),
    scraped_at: pick(raw, ["scraped_at", "created_at"]) ?? now,
    updated_at: now,

    extra: {
      bron: "yoc_fighters",
      raw_upload: yocFighter,
      raw_scrape: raw,
    },
  };
}
