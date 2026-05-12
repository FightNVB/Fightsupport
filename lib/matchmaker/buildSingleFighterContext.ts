// lib/matchmaker/buildSingleFighterContext.ts
// Bouwt basis-context voor één losse aanmelding.
// Geen rood/blauw en geen partij_nr: dit is vóórdat een match gemaakt is.

import {
  type AnyRow,
  normalizeVa,
  pick,
  fullName,
  toNumberOrNull,
  boolish,
  calcAge,
} from "./singleFighterUtils";

export type { AnyRow };
export { normalizeVa } from "./singleFighterUtils";

function cleanNamePart(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function aanmeldingFullName(row: AnyRow): string {
  const voornaam = cleanNamePart(row?.voornaam);
  const achternaam = cleanNamePart(row?.achternaam);
  const combined = [voornaam, achternaam].filter(Boolean).join(" ").trim();

  // Als voornaam + achternaam aanwezig zijn, is dat leidend.
  // Sommige parsers zetten `naam` historisch alleen op de voornaam; dat mag niet
  // gebruikt worden voor de FightPassport-naamcheck.
  if (combined) return combined;

  return cleanNamePart(row?.naam ?? row?.naam_input ?? row?.fighter_name);
}

export function buildSingleFighterContext(params: {
  matchmakingId: string;
  controleRunId: string;
  aanmelding: AnyRow;
  fightersRaw?: AnyRow | null;
  eventDate?: string | null;
}) {
  const { matchmakingId, controleRunId, aanmelding, fightersRaw: raw = null, eventDate = null } = params;

  const va = normalizeVa(
    aanmelding?.va_nummer ??
      aanmelding?.va ??
      aanmelding?.va_nr ??
      aanmelding?.vanummer ??
      raw?.va_nummer ??
      raw?.fighter_id
  );

  const naamInput = aanmeldingFullName(aanmelding);
  const naamFp = raw ? fullName(raw) : "";
  const geboortedatum = pick(raw, ["geboortedatum", "birth_date"]) ?? pick(aanmelding, ["geboortedatum", "geboortedatum_input"]);
  const gymFp = pick(raw, ["sportschool", "gym", "sportschool_naam"]);
  const gymInput = pick(aanmelding, ["gym", "sportschool", "sportschool_naam", "gym_input"]);
  const klasseFp = pick(raw, ["klasse", "nulmeting_klasse", "klasse_fp"]);
  const klasseInput = pick(aanmelding, ["klasse", "klasse_mm"]);
  const licentieRaw = pick(raw, ["licentie", "licentie_status", "licentie_ok", "heeft_licentie"]);
  const startverbodRaw = pick(raw, ["heeft_startverbod", "startverbod"]);
  const keurmerkRaw = pick(raw, ["heeft_keurmerk", "keurmerk", "gym_keurmerk"]);
  const now = new Date().toISOString();

  return {
    matchmaking_id: matchmakingId,
    controle_run_id: controleRunId,
    inschrijving_id: aanmelding.id ?? null,
    aanmelding_id: aanmelding.id ?? null,
    row_nr: aanmelding.row_nr ?? null,
    upload_id: aanmelding.upload_id ?? null,

    fighter_id: va ?? raw?.fighter_id ?? null,
    va_nummer: va ?? raw?.va_nummer ?? raw?.fighter_id ?? null,
    va: va ?? raw?.va_nummer ?? raw?.fighter_id ?? null,

    naam: naamFp || naamInput || null,
    naam_input: naamInput || null,
    naam_mm: naamInput || null,
    naam_fp: naamFp || null,
    fp_naam: naamFp || null,
    voornaam: aanmelding.voornaam ?? null,
    achternaam: aanmelding.achternaam ?? null,

    discipline: pick(aanmelding, ["discipline"]) ?? pick(raw, ["discipline"]),
    klasse: klasseInput ?? klasseFp ?? null,
    klasse_mm: klasseInput ?? null,
    klasse_fp: klasseFp ?? null,
    fp_klasse: klasseFp ?? null,
    nulmeting_klasse: pick(raw, ["nulmeting_klasse"]) ?? klasseFp ?? null,
    nulmeting_opmerking: pick(raw, ["nulmeting_opmerking", "nulmeting"]),

    geslacht: pick(raw, ["geslacht"]) ?? pick(aanmelding, ["geslacht"]),
    geslacht_fp: pick(raw, ["geslacht"]),
    fp_geslacht: pick(raw, ["geslacht"]),
    geboortedatum,
    geboortedatum_fp: pick(raw, ["geboortedatum", "birth_date"]),
    fp_geboortedatum: pick(raw, ["geboortedatum", "birth_date"]),
    geboortedatum_input: pick(aanmelding, ["geboortedatum", "geboortedatum_input"]),
    leeftijd: calcAge(geboortedatum, eventDate),
    leeftijd_event: calcAge(geboortedatum, eventDate),
    evenement_datum: eventDate,

    sportschool: gymFp ?? gymInput ?? null,
    gym: gymFp ?? gymInput ?? null,
    sportschool_mm: gymInput ?? null,
    gym_input: gymInput ?? null,
    sportschool_fp: gymFp ?? null,
    fp_gym: gymFp ?? null,
    gewicht: toNumberOrNull(pick(aanmelding, ["gewicht", "gewicht_kg"])) ?? pick(aanmelding, ["gewicht", "gewicht_kg"]),

    licentie: licentieRaw ?? null,
    licentie_status: licentieRaw ?? null,
    licentie_ok: boolish(licentieRaw),
    heeft_startverbod: startverbodRaw ?? null,
    startverbod: startverbodRaw ?? null,
    heeft_keurmerk: keurmerkRaw ?? null,
    keurmerk: keurmerkRaw ?? null,

    record_w: toNumberOrNull(pick(raw, ["record_w", "win", "wins", "gewonnen"])),
    record_l: toNumberOrNull(pick(raw, ["record_l", "loss", "losses", "verloren"])),
    record_d: toNumberOrNull(pick(raw, ["record_d", "draw", "draws", "onbeslist"])),
    gewonnen: toNumberOrNull(pick(raw, ["gewonnen", "record_w", "win", "wins"])),
    verloren: toNumberOrNull(pick(raw, ["verloren", "record_l", "loss", "losses"])),
    draw: toNumberOrNull(pick(raw, ["draw", "record_d", "draws", "onbeslist"])),
    demo: toNumberOrNull(pick(raw, ["demo", "demo_partijen"])),
    totaal_wedstrijden: toNumberOrNull(pick(raw, ["totaal_wedstrijden", "record_totaal", "uitslagen_count"])),
    uitslagen_count: toNumberOrNull(pick(raw, ["uitslagen_count", "totaal_wedstrijden", "record_totaal"])),
    laatste_partij_datum: pick(raw, ["laatste_partij_datum", "laatste_datum"]),

    naam_match: naamFp && naamInput ? naamFp.toLowerCase() === naamInput.toLowerCase() : null,
    geboortedatum_match:
      pick(raw, ["geboortedatum", "birth_date"]) && pick(aanmelding, ["geboortedatum", "geboortedatum_input"])
        ? String(pick(raw, ["geboortedatum", "birth_date"])).slice(0, 10) ===
          String(pick(aanmelding, ["geboortedatum", "geboortedatum_input"])).slice(0, 10)
        : null,
    gym_match: gymFp && gymInput ? String(gymFp).toLowerCase() === String(gymInput).toLowerCase() : null,

    controle_status: raw ? "gecontroleerd" : "controle_mislukt",
    gegevens_status: raw ? "gecontroleerd" : "controle_mislukt",
    scrape_status: raw ? "gecontroleerd" : "controle_mislukt",
    checked_at: now,
    scraped_at: raw ? now : null,
    bron: "aanmeldingen",
    raw_json: { aanmelding, fighters_raw: raw },
    raw: { aanmelding, fighters_raw: raw },
    created_at: now,
    updated_at: now,
  };
}
