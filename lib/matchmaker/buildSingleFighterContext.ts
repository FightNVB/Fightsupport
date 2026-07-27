// lib/matchmaker/buildSingleFighterContext.ts
// Bouwt basis-context voor één losse vechter vóórdat een echte partij gemaakt is.
// Werkt voor normale aanmeldingen én losse toernooi-deelnemers uit matchmaker_toernooi_fighters.
// Geen rood/blauw en geen echte partij_nr: toernooi gebruikt toernooi_code + va_nummer als sleutel.

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

function firstFilled(...values: unknown[]): string | null {
  for (const v of values) {
    const s = cleanNamePart(v);
    if (s) return s;
  }
  return null;
}

function normalizeNameForComparison(v: unknown): string {
  return cleanNamePart(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function classifyUitslag(raw: unknown): "win" | "loss" | "draw" | "demo" | null {
  const txt = String(raw ?? "").trim().toLowerCase();
  if (!txt) return null;
  if (txt.includes("demo") || txt.includes("demonstr") || txt.includes("no contest") || txt.includes("nocontest")) return "demo";
  if (txt.includes("gelijk") || txt.includes("draw") || txt.includes("onbeslist")) return "draw";
  if (txt.includes("verlies") || txt.includes("verliest") || txt.includes("lost") || txt.includes("loss")) return "loss";
  if (txt.includes("winst") || txt.includes("gewonnen") || txt.includes("wint") || txt.includes("win")) return "win";
  return null;
}

function buildRecordFromUitslagen(rows: AnyRow[] = []) {
  let record_w = 0;
  let record_l = 0;
  let record_d = 0;
  let demo = 0;

  for (const row of rows) {
    const kind = classifyUitslag(row?.uitslag ?? row?.resultaat ?? row?.outcome);
    if (kind === "win") record_w += 1;
    else if (kind === "loss") record_l += 1;
    else if (kind === "draw") record_d += 1;
    else if (kind === "demo") demo += 1;
  }

  const totaalZonderDemo = record_w + record_l + record_d;
  const totaalInclusiefDemo = totaalZonderDemo + demo;
  const totaalVoorJeugd = Math.max(0, totaalZonderDemo + Math.floor(demo / 3));

  return {
    record_w,
    record_l,
    record_d,
    demo,
    totaal_wedstrijden: totaalZonderDemo,
    totaal_uitslagen_inclusief_demo: totaalInclusiefDemo,
    totaal_partijen_voor_regels: totaalVoorJeugd,
    hasUitslagen: rows.length > 0,
  };
}

export function buildSingleFighterContext(params: {
  matchmakingId: string;
  controleRunId: string;

  // Normale flow: aanmelding uit aanmeldingen.
  aanmelding: AnyRow;

  // Toernooi-flow vóór admin-controle: losse deelnemer uit matchmaker_toernooi_fighters.
  // Als deze is meegegeven, is dit de matchmaker-bron voor VA/naam/sportschool/discipline/klasse/gewicht.
  toernooiFighter?: AnyRow | null;

  fightersRaw?: AnyRow | null;
  uitslagen?: AnyRow[];
  eventDate?: string | null;
}) {
  const {
    matchmakingId,
    controleRunId,
    aanmelding,
    toernooiFighter = null,
    fightersRaw: raw = null,
    uitslagen = [],
    eventDate = null,
  } = params;

  const source = toernooiFighter ?? aanmelding;
  const isToernooi = !!toernooiFighter || !!source?.toernooi_code;
  const toernooiCode = firstFilled(source?.toernooi_code, source?.toernooi, source?.t_code)?.toUpperCase() ?? null;
  const record = buildRecordFromUitslagen(uitslagen);

  const va = normalizeVa(
    source?.va_nummer ??
      source?.fighter_id ??
      source?.va ??
      source?.va_nr ??
      source?.vanummer ??
      aanmelding?.va_nummer ??
      aanmelding?.va ??
      aanmelding?.va_nr ??
      aanmelding?.vanummer ??
      raw?.va_nummer ??
      raw?.fighter_id
  );

  const naamInput = toernooiFighter
    ? cleanNamePart(
        firstFilled(
          toernooiFighter?.naam,
          toernooiFighter?.naam_mm,
          toernooiFighter?.fighter_name,
          aanmeldingFullName(aanmelding)
        )
      )
    : aanmeldingFullName(aanmelding);

  const naamFp = raw ? fullName(raw) : "";

  const geboortedatum =
    pick(raw, ["geboortedatum", "birth_date"]) ??
    pick(source, ["geboortedatum", "geboortedatum_input"]) ??
    pick(aanmelding, ["geboortedatum", "geboortedatum_input"]);

  const gymFp = pick(raw, ["sportschool", "gym", "sportschool_naam", "sportschool_fp"]);
  const gymInput =
    pick(source, ["gym", "sportschool", "sportschool_naam", "gym_input"]) ??
    pick(aanmelding, ["gym", "sportschool", "sportschool_naam", "gym_input"]);

  const klasseFp = pick(raw, ["berekende_klasse", "nulmeting_klasse", "klasse", "klasse_fp"]);
  const klasseInput = pick(source, ["klasse", "klasse_mm"]);
  const licentieRaw = pick(raw, ["licentie_actief", "licentie", "licentie_status", "licentie_ok", "heeft_licentie"]);
  const startverbodRaw = pick(raw, ["heeft_startverbod", "startverbod"]);
  const keurmerkRaw = pick(raw, ["heeft_keurmerk", "keurmerk", "gym_keurmerk"]);
  const now = new Date().toISOString();

  return {
    matchmaking_id: matchmakingId,
    controle_run_id: controleRunId,

    status: raw ? "beschikbaar" : "controle_mislukt",
    beschikbaar: !!raw,
    gematcht: false,
    afgemeld: false,

    // Normale aanmelding-id blijft behouden. Toernooi heeft daarnaast zijn eigen rij-id.
    inschrijving_id: aanmelding.id ?? source?.aanmelding_id ?? null,
    aanmelding_id: aanmelding.id ?? source?.aanmelding_id ?? null,
    matchmaker_toernooi_fighter_id: toernooiFighter?.id ?? null,
    row_nr: source?.row_nr ?? aanmelding.row_nr ?? null,
    upload_id: source?.upload_id ?? aanmelding.upload_id ?? null,

    is_toernooi: isToernooi,
    toernooi_code: toernooiCode,
    partij_nr: 0,
    bout_id: null,
    hoek: isToernooi ? "toernooi" : null,

    fighter_id: va ?? raw?.fighter_id ?? null,
    va_nummer: va ?? raw?.va_nummer ?? raw?.fighter_id ?? null,
    va: va ?? raw?.va_nummer ?? raw?.fighter_id ?? null,

    naam: naamInput || naamFp || null,
    naam_input: naamInput || null,
    naam_mm: naamInput || null,
    naam_fp: naamFp || null,
    fp_naam: naamFp || null,
    voornaam: source?.voornaam ?? aanmelding.voornaam ?? null,
    achternaam: source?.achternaam ?? aanmelding.achternaam ?? null,

    discipline:
      pick(source, ["discipline"]) ??
      pick(aanmelding, ["discipline"]) ??
      pick(raw, ["primary_discipline", "nulmeting_discipline", "discipline"]),
    klasse: klasseInput ?? klasseFp ?? null,
    klasse_mm: klasseInput ?? null,
    klasse_fp: klasseFp ?? null,
    fp_klasse: klasseFp ?? null,
    nulmeting_klasse: pick(raw, ["nulmeting_klasse"]) ?? klasseFp ?? null,
    nulmeting_opmerking: pick(raw, ["nulmeting_opmerking", "nulmeting"]),

    geslacht: pick(raw, ["geslacht"]) ?? pick(source, ["geslacht"]) ?? pick(aanmelding, ["geslacht"]),
    geslacht_fp: pick(raw, ["geslacht"]),
    fp_geslacht: pick(raw, ["geslacht"]),
    geboortedatum,
    geboortedatum_fp: pick(raw, ["geboortedatum", "birth_date"]),
    fp_geboortedatum: pick(raw, ["geboortedatum", "birth_date"]),
    geboortedatum_input: pick(source, ["geboortedatum", "geboortedatum_input"]) ?? pick(aanmelding, ["geboortedatum", "geboortedatum_input"]),
    leeftijd: calcAge(geboortedatum, eventDate),
    leeftijd_event: calcAge(geboortedatum, eventDate),
    evenement_datum: eventDate,

    sportschool: gymInput ?? gymFp ?? null,
    gym: gymInput ?? gymFp ?? null,
    sportschool_mm: gymInput ?? null,
    gym_input: gymInput ?? null,
    sportschool_fp: gymFp ?? null,
    fp_gym: gymFp ?? null,
    gewicht:
      toNumberOrNull(pick(source, ["gewicht", "gewicht_kg"])) ??
      pick(source, ["gewicht", "gewicht_kg"]) ??
      toNumberOrNull(pick(aanmelding, ["gewicht", "gewicht_kg"])) ??
      pick(aanmelding, ["gewicht", "gewicht_kg"]),

    licentie: licentieRaw ?? null,
    licentie_actief: boolish(licentieRaw),
    licentie_status: licentieRaw ?? null,
    licentie_ok: boolish(licentieRaw),
    fit_to_fight: boolish(pick(raw, ["fit_to_fight"])),
    heeft_startverbod: startverbodRaw ?? null,
    startverbod: startverbodRaw ?? null,
    heeft_keurmerk: keurmerkRaw ?? null,
    keurmerk: keurmerkRaw ?? null,

    record_w: record.hasUitslagen ? record.record_w : toNumberOrNull(pick(raw, ["record_w", "win", "wins", "gewonnen"])),
    record_l: record.hasUitslagen ? record.record_l : toNumberOrNull(pick(raw, ["record_l", "loss", "losses", "verloren"])),
    record_d: record.hasUitslagen ? record.record_d : toNumberOrNull(pick(raw, ["record_d", "draw", "draws", "onbeslist"])),
    gewonnen: record.hasUitslagen ? record.record_w : toNumberOrNull(pick(raw, ["gewonnen", "record_w", "win", "wins"])),
    verloren: record.hasUitslagen ? record.record_l : toNumberOrNull(pick(raw, ["verloren", "record_l", "loss", "losses"])),
    draw: record.hasUitslagen ? record.record_d : toNumberOrNull(pick(raw, ["draw", "record_d", "draws", "onbeslist"])),
    demo: record.hasUitslagen ? record.demo : toNumberOrNull(pick(raw, ["demo", "demo_partijen"])),
    totaal_wedstrijden: record.hasUitslagen ? record.totaal_wedstrijden : toNumberOrNull(pick(raw, ["totaal_wedstrijden", "record_totaal", "uitslagen_count"])),
    totaal_partijen_voor_regels: record.hasUitslagen ? record.totaal_partijen_voor_regels : null,
    uitslagen_count: record.hasUitslagen ? record.totaal_wedstrijden : toNumberOrNull(pick(raw, ["uitslagen_count", "totaal_wedstrijden", "record_totaal"])),
    laatste_partij_datum: pick(raw, ["laatste_partij_datum", "laatste_datum"]),

    naam_match:
      naamFp && naamInput
        ? normalizeNameForComparison(naamFp) === normalizeNameForComparison(naamInput)
        : null,
    geboortedatum_match:
      pick(raw, ["geboortedatum", "birth_date"]) && (pick(source, ["geboortedatum", "geboortedatum_input"]) ?? pick(aanmelding, ["geboortedatum", "geboortedatum_input"]))
        ? String(pick(raw, ["geboortedatum", "birth_date"])).slice(0, 10) ===
          String(pick(source, ["geboortedatum", "geboortedatum_input"]) ?? pick(aanmelding, ["geboortedatum", "geboortedatum_input"])).slice(0, 10)
        : null,
    gym_match: gymFp && gymInput ? String(gymFp).toLowerCase() === String(gymInput).toLowerCase() : null,

    controle_status: raw ? "gecontroleerd" : "controle_mislukt",
    gegevens_status: raw ? "gecontroleerd" : "controle_mislukt",
    scrape_status: raw ? "gecontroleerd" : "controle_mislukt",
    checked_at: now,
    scraped_at: raw ? now : null,
    bron: isToernooi ? "matchmaker_toernooi_fighters" : "aanmeldingen",
    uitslagen,
    uitslagen_raw: uitslagen,
    matchmaker_uitslagen_raw: uitslagen,
    raw_json: {
      aanmelding,
      matchmaker_toernooi_fighter: toernooiFighter,
      fightpassport_fighter: raw,
      matchmaker_uitslagen_raw: uitslagen,
    },
    raw: {
      aanmelding,
      matchmaker_toernooi_fighter: toernooiFighter,
      fightpassport_fighter: raw,
      matchmaker_uitslagen_raw: uitslagen,
    },
    created_at: now,
    updated_at: now,
  };
}

export async function buildFighterContextsForAanmeldingen(params: {
  supabase: any;
  matchmakingId: string;
  controleRunId: string;
  aanmeldingen: AnyRow[];
  rawRows?: AnyRow[];
  uitslagenRows?: AnyRow[];
  eventDate?: string | null;
  writeRules?: boolean;
}) {
  const {
    supabase,
    matchmakingId,
    controleRunId,
    aanmeldingen,
    rawRows = [],
    uitslagenRows = [],
    eventDate = null,
    writeRules = false,
  } = params;

  const rawByVa = new Map<string, AnyRow>();
  for (const raw of rawRows) {
    const va = normalizeVa(raw?.va_nummer ?? raw?.fighter_id ?? raw?.va);
    if (va && !rawByVa.has(va)) rawByVa.set(va, raw);
  }

  const uitslagenByVa = new Map<string, AnyRow[]>();
  for (const row of uitslagenRows) {
    const va = normalizeVa(row?.va_nummer ?? row?.fighter_id ?? row?.va);
    if (!va) continue;
    const list = uitslagenByVa.get(va) ?? [];
    list.push(row);
    uitslagenByVa.set(va, list);
  }

  const contextRows = (aanmeldingen ?? []).map((aanmelding) => {
    const va = normalizeVa(aanmelding?.va_nummer ?? aanmelding?.va ?? aanmelding?.va_nr ?? aanmelding?.vanummer);
    return buildSingleFighterContext({
      matchmakingId,
      controleRunId,
      aanmelding,
      fightersRaw: va ? rawByVa.get(va) ?? null : null,
      uitslagen: va ? uitslagenByVa.get(va) ?? [] : [],
      eventDate,
    });
  });

  if (!contextRows.length) return { data: [], error: null };

  await supabase
    .from("controle_bout_context")
    .delete()
    .eq("matchmaking_id", matchmakingId)
    .eq("controle_run_id", controleRunId)
    .eq("bron", "aanmeldingen");

  const { data, error } = await supabase.from("controle_bout_context").insert(contextRows).select("*");
  if (error) return { data: null, error };

  if (writeRules) {
    const { rulesEngine } = await import("@/lib/rulesEngine");
    await rulesEngine({
      matchmaking_id: matchmakingId,
      controle_run_id: controleRunId,
      ctxRows: data ?? contextRows,
    });
  }

  return { data: data ?? contextRows, error: null };
}
