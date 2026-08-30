import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type AnyRow = Record<string, any>;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function obj(value: unknown): AnyRow {
  if (!value) return {};
  if (typeof value === "object") return value as AnyRow;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function first(...values: unknown[]) {
  for (const value of values) {
    if (value !== null && value !== undefined && s(value)) return value;
  }
  return "";
}

function digits(value: unknown) {
  return s(value).replace(/\D/g, "");
}

function bool(value: unknown) {
  return value === true || s(value) === "1" || s(value).toLowerCase() === "true";
}

function normalizeStatus(value: unknown) {
  const raw = s(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (raw.includes("tegenstander") || raw.includes("opponent")) return "tegenstander_gezocht";
  if (raw.includes("voorbehoud") || raw.includes("pending")) return "onder_voorbehoud";

  // Intern gebruikt de Matchmaking-tab letterlijk "match" voor een bevestigde partij.
  // De publieke live pagina moet die actuele status daarom ook als bevestigd tonen.
  if (
    raw === "match" ||
    raw === "gematcht" ||
    raw.includes("bevest") ||
    raw.includes("confirm") ||
    raw === "akkoord"
  ) {
    return "bevestigd";
  }

  return "concept";
}

/**
 * Gebruik de officiële matchmaking-notatie. Niet opnieuw rekenen uit de
 * individuele gewichten: -95 betekent maximaal 95 kg, 95+ betekent boven 95 kg.
 */
function displayMaxWeight(row: AnyRow, raw: AnyRow) {
  const notation = s(first(row.max_gewicht_notatie, raw.max_gewicht_notatie));
  if (notation) return /kg/i.test(notation) ? notation.toUpperCase() : `${notation} KG`;

  const value = s(first(row.max_gewicht, raw.max_gewicht));
  if (!value) return "—";

  const type = s(first(row.max_gewicht_type, raw.max_gewicht_type)).toLowerCase();
  if (value.includes("+") || type === "plus" || type === "above" || type === "over") {
    return `${value.replace(/[^0-9.,]/g, "")}+ KG`;
  }

  if (value.startsWith("-")) return `${value} KG`;
  return `-${value} KG`;
}

function numberOrZero(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function recordValues(row?: AnyRow | null) {
  if (!row) return { wins: 0, losses: 0, draws: 0, total: 0 };

  const extra = obj(row.extra);
  const aanmelding = obj(extra?.raw?.aanmelding ?? extra?.aanmelding);

  return {
    wins: numberOrZero(first(row.record_w, aanmelding.win, aanmelding.wins)),
    losses: numberOrZero(first(row.record_l, aanmelding.loss, aanmelding.losses)),
    draws: numberOrZero(first(row.record_d, aanmelding.draw, aanmelding.draws)),
    total: numberOrZero(
      first(row.uitslagen_count, row.totaal_wedstrijden, aanmelding.totaal_wedstrijden),
    ),
  };
}

function recordFromContext(row?: AnyRow | null, includeClass = true) {
  if (!row) return "—";
  const { wins, losses, draws, total } = recordValues(row);
  const klasse = includeClass
    ? s(first(row.klasse, row.fp_klasse, row.nulmeting_klasse))
    : "";
  const prefix = klasse ? `${klasse} ` : "";
  return `${prefix}${wins}-${losses}-${draws}${total ? ` (${total})` : ""}`;
}

function normalizeRecordClass(value: unknown) {
  const raw = s(value)
    .toLowerCase()
    .replace(/\b(?:klasse|class|clas)\b/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compact = raw.replace(/[^a-z0-9+]/g, "");

  const repeated = compact.match(/^([jrncba])\1$/i);
  if (repeated) return repeated[1].toLowerCase();
  if (compact === "j+" || compact.includes("j+") || compact.includes("talentstatus")) return "j+";
  if (compact === "j" || compact.startsWith("jeugd") || compact.includes("youth")) return "j";
  if (compact === "r" || compact.startsWith("rclas") || compact.startsWith("rclass") || compact.includes("recreant")) return "r";
  if (compact === "n" || compact.startsWith("nclas") || compact.startsWith("nclass") || compact.includes("nieuweling")) return "n";
  if (compact === "c" || compact.startsWith("cclas") || compact.startsWith("cclass")) return "c";
  if (compact === "b" || compact.startsWith("bclas") || compact.startsWith("bclass")) return "b";
  if (compact === "a" || compact.startsWith("aclas") || compact.startsWith("aclass") || compact.includes("elite")) return "a";
  if (compact.includes("amateur") || compact.includes("ama")) return "amateur";
  if (compact.includes("pro")) return "pro";
  return compact;
}

function resultKind(value: unknown): "win" | "loss" | "draw" | "other" {
  const raw = s(value).toLowerCase().replace(/\s+/g, " ").trim();
  if (!raw) return "other";
  if (raw.includes("demo") || raw.includes("no contest") || raw.includes("nocontest") || raw === "nc") return "other";
  if (raw.includes("onbeslist") || raw.includes("gelijk") || raw.includes("draw")) return "draw";
  if (raw.includes("verliest") || raw.includes("verlies") || raw.includes("verloren") || raw.includes("loss") || raw === "l") return "loss";
  if (raw.includes("wint") || raw.includes("winst") || raw.includes("gewonnen") || raw === "win" || raw === "w") return "win";
  return "other";
}

function recordClassRank(token: string) {
  return ({ j: 1, "j+": 1, r: 2, n: 3, c: 4, b: 5, a: 6, amateur: 3, pro: 6 } as Record<string, number>)[token] ?? 0;
}

function recordClassDisplay(token: string) {
  return ({ j: "J", "j+": "J", r: "R", n: "N", c: "C", b: "B", a: "A", amateur: "Amateur", pro: "Pro" } as Record<string, string>)[token] || "—";
}

function resultRowsForContext(context: AnyRow | undefined, allRows: AnyRow[]) {
  if (!context) return [];
  const va = digits(first(context.va_nummer, context.va, context.fighter_id));
  if (!va) return [];

  const rows = allRows.filter((row) =>
    digits(first(row.va_nummer, row.bron_va_nummer, row.va, row.fighter_id)) === va
  );

  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = s(first(
      row.id,
      [
        row.va_nummer,
        row.datum,
        row.evenement,
        row.tegenstander,
        row.uitslag,
        row.klasse,
      ].map((value) => s(value).toLowerCase()).join("|"),
    ));
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function recordFromResults(
  context: AnyRow | undefined,
  allRows: AnyRow[],
  includeClass = true,
) {
  if (!context) return "—";
  const rows = resultRowsForContext(context, allRows);

  let highestClass = "";
  let highestRank = 0;
  for (const row of rows) {
    if (resultKind(first(row.uitslag, row.resultaat, row.outcome)) === "other") continue;
    const token = normalizeRecordClass(first(
      row.klasse,
      row.class,
      row.wedstrijdklasse,
      row.niveau,
      row.fight_class,
    ));
    const rank = recordClassRank(token);
    if (rank > highestRank) {
      highestClass = token;
      highestRank = rank;
    }
  }

  if (!highestClass) return recordFromContext(context, includeClass);

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let other = 0;

  for (const row of rows) {
    const kind = resultKind(first(row.uitslag, row.resultaat, row.outcome));
    const token = normalizeRecordClass(first(
      row.klasse,
      row.class,
      row.wedstrijdklasse,
      row.niveau,
      row.fight_class,
    ));

    if (token === highestClass && kind === "win") wins += 1;
    else if (token === highestClass && kind === "loss") losses += 1;
    else if (token === highestClass && kind === "draw") draws += 1;
    else other += 1;
  }

  const prefix = includeClass ? `${recordClassDisplay(highestClass)} ` : "";
  return `${prefix}${wins}-${losses}-${draws} (${other})`;
}


function contextName(row?: AnyRow | null) {
  return s(first(
    row?.naam,
    row?.fp_naam,
    row?.naam_input,
    row?.naam_matchmaker,
  ));
}

function contextGym(row?: AnyRow | null) {
  return s(first(
    row?.gym_input,
    row?.sportschool_input,
    row?.fp_gym,
    row?.gym,
    row?.sportschool,
  ));
}

function contextClass(row?: AnyRow | null) {
  return s(first(
    row?.klasse,
    row?.fp_klasse,
    row?.berekende_klasse,
    row?.nulmeting_klasse,
  ));
}

function contextDiscipline(row?: AnyRow | null) {
  return s(first(
    row?.discipline,
    row?.primary_discipline,
    row?.nulmeting_discipline,
  ));
}

function registrationId(value: unknown) {
  return s(value);
}

function fighterView(
  context: AnyRow | undefined,
  snapshot: AnyRow,
  row: AnyRow,
  corner: "rood" | "blauw",
  resultRows: AnyRow[],
) {
  const rowName = corner === "rood" ? row.rood_naam : row.blauw_naam;
  const rowGym = corner === "rood" ? row.rood_gym : row.blauw_gym;

  return {
    // Terminator-ready: actuele fighter-context is de waarheid.
    // De bout-snapshot blijft uitsluitend fallback voor oude of incomplete data.
    inschrijvingId: registrationId(first(
      context?.inschrijving_id,
      context?.aanmelding_id,
      row[`${corner}_aanmelding_id`],
      row[`${corner}_inschrijving_id`],
      snapshot.aanmelding_id,
      snapshot.inschrijving_id,
      snapshot.id,
    )),
    naam: contextName(context) || s(first(rowName, snapshot.naam, snapshot.naam_input)) || "Tegenstander gezocht",
    sportschool: contextGym(context) || s(first(rowGym, snapshot.sportschool, snapshot.gym)) || "—",
    record: context ? recordFromResults(context, resultRows) : s(first(snapshot.record, snapshot.record_string)) || "—",
  };
}

function parseDate(value: unknown): Date | null {
  const raw = s(value);
  if (!raw) return null;
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12));
  }
  const dmy = raw.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (dmy) {
    return new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12));
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageOnDate(birthValue: unknown, eventValue: unknown): number | null {
  const birth = parseDate(birthValue);
  const event = parseDate(eventValue);
  if (!birth || !event) return null;

  let age = event.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = event.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && event.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
}

function genderLabel(value: unknown) {
  const raw = s(value).toLowerCase();
  if (["m", "man", "male", "heer", "jongen", "mannelijk"].includes(raw)) return "M";
  if (["v", "vrouw", "female", "dame", "meisje", "vrouwelijk"].includes(raw)) return "V";
  return "—";
}


function normalizeLineupClass(value: unknown, disciplineValue: unknown) {
  const raw = s(value).toLowerCase();
  const compact = raw
    .replace(/\b(?:klasse|class|clas)\b/g, " ")
    .replace(/[._/\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const discipline = s(disciplineValue).toLowerCase();

  if (discipline.includes("mma") || discipline.includes("mixed martial")) {
    if (compact.includes("jeugd") || compact.includes("youth") || compact.includes("junior") || compact === "j") return "J";
    if (compact.includes("pro") || compact.includes("professional")) return "Pro";
    return "Ama";
  }

  if (raw.includes("j+") || compact.includes("j plus") || compact.includes("talentstatus") || compact.includes("talent status")) return "J+";
  if (compact === "j" || compact.includes("jeugd") || compact.includes("youth") || compact.includes("junior")) return "J";
  if (compact === "d" || compact.includes("demo") || compact.includes("demonstratie")) return "D";
  if (compact === "r" || compact.includes("recreant") || compact.includes("recreatief")) return "R";
  if (compact === "n" || compact.includes("nieuweling") || compact.includes("novice") || compact.includes("newcomer")) return "N";
  if (/(^| )c( |$)/.test(compact)) return "C";
  if (/(^| )b( |$)/.test(compact)) return "B";
  if (/(^| )a( |$)/.test(compact) || compact.includes("elite")) return "A";
  return s(value) || "—";
}

function genderFromValues(...values: unknown[]) {
  for (const value of values) {
    const label = genderLabel(value);
    if (label !== "—") return label;
  }
  return "—";
}

function cleanStoredRoundTimes(value: unknown) {
  const explicit = s(value);
  if (!explicit) return "";
  return explicit
    .replace(/\s*\/\s*\d+(?:[,.]\d+)?\s*(?:sec(?:onden?)?|min(?:uten?)?)\s*rust.*$/i, "")
    .replace(/\s*[-–—]\s*rust.*$/i, "")
    .replace(/\s+rust.*$/i, "")
    .trim();
}

function lineupRoundTimes(args: {
  row: AnyRow;
  raw: AnyRow;
  controle?: AnyRow;
  discipline: string;
  klasse: string;
  eventDate: unknown;
  redBirth?: unknown;
  blueBirth?: unknown;
  redAge?: unknown;
  blueAge?: unknown;
}) {
  const { row, raw, controle, discipline, klasse, eventDate } = args;
  const explicit = cleanStoredRoundTimes(first(
    row.ronde_tijden, row.rondetijden, row.partijduur, row.rondes,
    raw.ronde_tijden, raw.rondetijden, raw.partijduur, raw.rondes,
  ));
  if (explicit) return explicit;

  const d = s(discipline).toLowerCase();
  const k = s(klasse);
  const rawDescription = s(first(row.omschrijving, raw.omschrijving, row.partij_label, raw.partij_label)).toLowerCase();
  const titleFight = rawDescription.includes("titel") || rawDescription.includes("championship") || rawDescription.includes("kampioenschap");

  if (d.includes("mma") || d.includes("mixed martial")) {
    if (k === "J") return "2 x 3 min";
    if (k === "Pro") return titleFight ? "5 x 5 min" : "3 x 5 min";
    return titleFight ? "5 x 3 min" : "3 x 3 min";
  }

  if (titleFight && k === "A") return "5 x 3 min";
  if (rawDescription.includes("4oz") || rawDescription.includes("4 oz")) return "3 x 3 min";
  if (k === "D") return "2 x 1 min";

  if (k === "J" || k === "J+") {
    const parseAge = (direct: unknown, birth: unknown) => {
      const n = Number(direct);
      if (Number.isFinite(n) && n >= 0) return n;
      return ageOnDate(birth, eventDate);
    };
    const redAge = parseAge(args.redAge, args.redBirth);
    const blueAge = parseAge(args.blueAge, args.blueBirth);
    return redAge !== null && blueAge !== null && redAge >= 16 && blueAge >= 16
      ? "3 x 1,5 min"
      : "3 x 1 min";
  }

  if (k === "R") return "3 x 1 min";
  if (k === "N") return "3 x 1,5 min";
  if (k === "C") return "3 x 2 min";
  if (k === "B") return "3 x 3 min";
  if (k === "A") return "3 x 3 min";
  return "—";
}

function galaMinutesForBout(klasse: string, discipline: string, rondeTijden: string) {
  const d = s(discipline).toLowerCase();
  const k = s(klasse).toUpperCase();
  const rounds = s(rondeTijden).toLowerCase();

  // Zelfde vaste partijminuten als de gala-duurberekening in matchmakingId.
  if (d.includes("mma") || d.includes("mixed martial")) return 17;
  if (rounds.includes("5 x 3") && k === "A") return 31;
  if (k === "A") return 21;
  if (k === "B") return 14;
  if (k === "C") return 13;
  if (k === "N") return 11.5;
  if (k === "J+") return 10.5;
  if (k === "J") return rounds.includes("1,5") || rounds.includes("1.5") ? 10.5 : 8.5;
  if (k === "R") return 8.5;
  if (k === "D") return 6;
  if (d.includes("boksen") || d.includes("boxing")) return 10;
  return 0;
}

function formatGalaDuration(mins: number) {
  const rounded = Math.round(mins * 10) / 10;
  const hours = Math.floor(rounded / 60);
  const minutes = Math.round((rounded - hours * 60) * 10) / 10;
  const fmt = (value: number) => Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
  if (hours <= 0) return `${fmt(minutes)} min`;
  if (minutes === 0) return `${hours} uur`;
  return `${hours} uur ${fmt(minutes)} min`;
}

function weightLabel(value: unknown) {
  const raw = s(value).replace(/\s*kg\s*$/i, "");
  if (!raw) return "—";
  return `${raw.replace(".", ",")} kg`;
}

function classRank(value: unknown) {
  const raw = s(value).toLowerCase().replace(/klasse|class|clas|\s|-/g, "");
  if (raw === "a" || raw.startsWith("a")) return 1;
  if (raw === "b" || raw.startsWith("b")) return 2;
  if (raw === "c" || raw.startsWith("c")) return 3;
  if (raw === "n" || raw.includes("nieuweling")) return 4;
  if (raw.includes("j+") || raw.includes("talentstatus")) return 5;
  if (raw === "r" || raw.startsWith("r")) return 6;
  if (raw === "j" || raw.includes("jeugd") || raw.includes("youth")) return 7;
  return 99;
}

function weightSortValue(value: unknown) {
  const match = s(value).replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!match) return Number.POSITIVE_INFINITY;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const cleanToken = s(token);
    if (!cleanToken) return NextResponse.json({ error: "Ongeldige link" }, { status: 400 });

    const { data: promoterPublication, error: promoterError } = await supabaseAdmin
      .from("matchmaking_public_pages")
      .select("*")
      .eq("public_token", cleanToken)
      .eq("is_enabled", true)
      .maybeSingle();

    if (promoterError) throw promoterError;

    let publication = promoterPublication;
    let audience: "promoter" | "trainers" = "promoter";

    if (!publication) {
      const { data: trainerPublication, error: trainerError } = await supabaseAdmin
        .from("matchmaking_public_pages")
        .select("*")
        .eq("trainer_token", cleanToken)
        .eq("is_enabled", true)
        .eq("trainer_is_published", true)
        .maybeSingle();
      if (trainerError) throw trainerError;
      publication = trainerPublication;
      audience = "trainers";
    }

    if (!publication) {
      return NextResponse.json(
        { error: "Deze line-uplink is niet beschikbaar" },
        { status: 404 },
      );
    }

    if (audience === "trainers") {
      if (!publication.trainer_snapshot) {
        return NextResponse.json(
          { error: "Er is nog geen update voor trainers gepubliceerd" },
          { status: 404 },
        );
      }
      return NextResponse.json(publication.trainer_snapshot, {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    const matchmakingId = s(publication.matchmaking_id);
    const [mmRes, boutsRes, contextsRes, controleRes] = await Promise.all([
      supabaseAdmin.from("matchmakings").select("*").eq("id", matchmakingId).single(),
      supabaseAdmin
        .from("matchmaking_bouts_raw")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .order("partij_nr", { ascending: true }),
      supabaseAdmin
        .from("matchmaker_fighter_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId),
      supabaseAdmin
        .from("controle_bout_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .order("updated_at", { ascending: false }),
    ]);

    if (mmRes.error) throw mmRes.error;
    if (boutsRes.error) throw boutsRes.error;
    if (contextsRes.error) throw contextsRes.error;
    if (controleRes.error) throw controleRes.error;

    // Exact dezelfde recordbron als tab Matchmaking: de centrale
    // FightPassport-uitslagenhistorie, niet matchmaker_uitslagen_raw.
    const contextVaNumbers = Array.from(
      new Set(
        (contextsRes.data ?? [])
          .map((context: AnyRow) => digits(first(context.va_nummer, context.va, context.fighter_id)))
          .filter(Boolean),
      ),
    );

    let resultRows: AnyRow[] = [];
    if (contextVaNumbers.length) {
      const { data: fightPassportResults, error: resultsError } = await supabaseAdmin
        .from("fightpassport_results")
        .select("*")
        .in("va_nummer", contextVaNumbers)
        .order("datum", { ascending: false });

      if (resultsError) throw resultsError;
      resultRows = (fightPassportResults ?? []) as AnyRow[];
    }

    const contextByVa = new Map<string, AnyRow>();
    const contextByRegistrationId = new Map<string, AnyRow>();
    for (const context of contextsRes.data ?? []) {
      const va = digits(context.va_nummer);
      const aanmeldingId = registrationId(first(context.inschrijving_id, context.aanmelding_id));
      if (va && !contextByVa.has(va)) contextByVa.set(va, context);
      if (aanmeldingId && !contextByRegistrationId.has(aanmeldingId)) {
        contextByRegistrationId.set(aanmeldingId, context);
      }
    }

    const controleByBoutId = new Map<string, AnyRow>();
    const controleByPartijNr = new Map<number, AnyRow>();
    const controleVaNumbers = new Set<string>();
    for (const controle of controleRes.data ?? []) {
      const boutId = s(controle.bout_id);
      const partijNr = Number(controle.partij_nr);
      if (boutId && !controleByBoutId.has(boutId)) controleByBoutId.set(boutId, controle);
      if (Number.isFinite(partijNr) && !controleByPartijNr.has(partijNr)) controleByPartijNr.set(partijNr, controle);
      const rv = digits(controle.rood_va_mm);
      const bv = digits(controle.blauw_va_mm);
      if (rv) controleVaNumbers.add(rv);
      if (bv) controleVaNumbers.add(bv);
    }

    const boutVaNumbers = new Set<string>();
    for (const row of boutsRes.data ?? []) {
      const raw = obj(row.raw_json);
      const red = obj(raw.rood);
      const blue = obj(raw.blauw);
      const rv = digits(first(row.va_rood, row.rood_va, red.va_nummer, red.va));
      const bv = digits(first(row.va_blauw, row.blauw_va, blue.va_nummer, blue.va));
      if (rv) boutVaNumbers.add(rv);
      if (bv) boutVaNumbers.add(bv);
    }

    const allVaNumbers = Array.from(new Set([...controleVaNumbers, ...boutVaNumbers]));
    let fightpassportFighters: AnyRow[] = [];
    if (allVaNumbers.length) {
      const { data, error } = await supabaseAdmin
        .from("fightpassport_fighters")
        .select("va_nummer,geslacht,geboortedatum,naam")
        .in("va_nummer", allVaNumbers);
      if (error) throw error;
      fightpassportFighters = (data ?? []) as AnyRow[];
    }
    const fighterByVa = new Map<string, AnyRow>();
    for (const fighter of fightpassportFighters) {
      const va = digits(fighter.va_nummer);
      if (va && !fighterByVa.has(va)) fighterByVa.set(va, fighter);
    }

    function controleForBout(row: AnyRow, raw: AnyRow) {
      const boutId = s(first(row.bout_uid, row.bout_id, raw.bout_uid, raw.bout_id));
      if (boutId && controleByBoutId.has(boutId)) return controleByBoutId.get(boutId);
      const partijNr = Number(first(row.partij_nr, raw.partij_nr));
      return Number.isFinite(partijNr) ? controleByPartijNr.get(partijNr) : undefined;
    }

    function contextForCorner(row: AnyRow, raw: AnyRow, corner: "rood" | "blauw") {
      const snapshot = obj(raw[corner]);

      // Een bout verwijst naar een concrete aanmelding. Die sleutel is altijd
      // specifieker dan VA, omdat hetzelfde VA binnen één matchmaking vaker kan
      // voorkomen. Alleen bij oude bouts zonder inschrijving-ID vallen we terug op VA.
      const aanmeldingId = registrationId(first(
        row[`${corner}_aanmelding_id`],
        row[`${corner}_inschrijving_id`],
        snapshot.aanmelding_id,
        snapshot.inschrijving_id,
        snapshot.id,
      ));
      if (aanmeldingId && contextByRegistrationId.has(aanmeldingId)) {
        return contextByRegistrationId.get(aanmeldingId);
      }

      const va = digits(first(
        row[`va_${corner}`],
        row[`${corner}_va`],
        row[`${corner}_va_nummer`],
        snapshot.va_nummer,
        snapshot.va,
      ));
      return va && contextByVa.has(va) ? contextByVa.get(va) : undefined;
    }

    const activeRows = (boutsRes.data ?? []).filter((row: AnyRow) => {
      const raw = obj(row.raw_json);
      return !bool(row.verwijderd) && (s(row.partij_nr) || s(raw.partij_nr));
    });

    const matchedVas = new Set<string>();
    for (const row of activeRows) {
      const raw = obj(row.raw_json);
      const red = obj(raw.rood);
      const blue = obj(raw.blauw);
      const redVa = digits(first(row.va_rood, row.rood_va, red.va_nummer, red.va));
      const blueVa = digits(first(row.va_blauw, row.blauw_va, blue.va_nummer, blue.va));
      if (redVa) matchedVas.add(redVa);
      if (blueVa) matchedVas.add(blueVa);
    }

    const mm = mmRes.data ?? {};
    const priorityUserId = s(first(
      mm.matchmaker_id,
      mm.uploaded_by,
      mm.maker_user_id,
      mm.huidige_eigenaar_user_id,
    ));

    let priorityIds = new Set<string>();
    if (priorityUserId) {
      const { data: priorities, error: prioritiesError } = await supabaseAdmin
        .from("matchmaker_prioriteiten")
        .select("inschrijving_id")
        .eq("matchmaking_id", matchmakingId)
        .eq("user_id", priorityUserId);
      if (prioritiesError) throw prioritiesError;
      priorityIds = new Set(
        (priorities ?? []).map((row: AnyRow) => s(row.inschrijving_id)).filter(Boolean),
      );
    }

    const eventDate = s(first(mm.event_datum, mm.datum, mm.evenement_datum));

    const bouts = activeRows
      .map((row: AnyRow) => {
        const raw = obj(row.raw_json);
        const red = obj(raw.rood);
        const blue = obj(raw.blauw);
        const redContext = contextForCorner(row, raw, "rood");
        const blueContext = contextForCorner(row, raw, "blauw");
        const controle = controleForBout(row, raw);
        const status = normalizeStatus(first(row.status, row.partij_status, row.bout_status, raw.status));

        const redVa = digits(first(row.va_rood, row.rood_va, controle?.rood_va_mm, red.va_nummer, red.va));
        const blueVa = digits(first(row.va_blauw, row.blauw_va, controle?.blauw_va_mm, blue.va_nummer, blue.va));
        const redFp = redVa ? fighterByVa.get(redVa) : undefined;
        const blueFp = blueVa ? fighterByVa.get(blueVa) : undefined;

        const discipline = s(first(
          row.discipline,
          raw.discipline,
          controle?.discipline,
          contextDiscipline(redContext),
          contextDiscipline(blueContext),
        )) || "—";
        const rawKlasse = first(
          row.klasse,
          row.klasse_mm,
          raw.klasse,
          controle?.klasse_mm,
          contextClass(redContext),
          contextClass(blueContext),
        );
        const klasse = normalizeLineupClass(rawKlasse, discipline);

        const redBirth = first(
          controle?.rood_geboortedatum_fp,
          controle?.rood_geboortedatum_mm,
          redFp?.geboortedatum,
          redContext?.geboortedatum,
          redContext?.fp_geboortedatum,
          row.rood_geboortedatum,
        );
        const blueBirth = first(
          controle?.blauw_geboortedatum_fp,
          controle?.blauw_geboortedatum_mm,
          blueFp?.geboortedatum,
          blueContext?.geboortedatum,
          blueContext?.fp_geboortedatum,
          row.blauw_geboortedatum,
        );

        const geslacht = genderFromValues(
          row.geslacht,
          raw.geslacht,
          controle?.rood_geslacht,
          controle?.blauw_geslacht,
          redFp?.geslacht,
          blueFp?.geslacht,
          redContext?.geslacht,
          redContext?.fp_geslacht,
          blueContext?.geslacht,
          blueContext?.fp_geslacht,
        );

        const rondeTijden = lineupRoundTimes({
          row,
          raw,
          controle,
          discipline,
          klasse,
          eventDate,
          redBirth,
          blueBirth,
          redAge: controle?.rood_leeftijd_event,
          blueAge: controle?.blauw_leeftijd_event,
        });

        return {
          id: s(row.id),
          partijNr: Number(first(row.partij_nr, raw.partij_nr)) || null,
          klasse,
          geslacht,
          discipline,
          maxGewicht: displayMaxWeight(
            { ...row, max_gewicht: first(row.max_gewicht, controle?.max_gewicht), max_gewicht_notatie: first(row.max_gewicht_notatie, controle?.max_gewicht_notatie) },
            raw,
          ),
          rondeTijden,
          galaMinuten: galaMinutesForBout(klasse, discipline, rondeTijden),
          status,
          red: {
            ...fighterView(redContext, red, row, "rood", resultRows),
            starred: priorityIds.has(registrationId(first(
              redContext?.inschrijving_id, redContext?.aanmelding_id, row.rood_aanmelding_id, row.rood_inschrijving_id, red.aanmelding_id, red.inschrijving_id, red.id,
            ))),
          },
          blue: {
            ...fighterView(blueContext, blue, row, "blauw", resultRows),
            starred: priorityIds.has(registrationId(first(
              blueContext?.inschrijving_id, blueContext?.aanmelding_id, row.blauw_aanmelding_id, row.blauw_inschrijving_id, blue.aanmelding_id, blue.inschrijving_id, blue.id,
            ))),
          },
        };
      })
      .filter((bout: AnyRow) => {
        if (bout.status === "onder_voorbehoud" && publication.show_pending === false) return false;
        return bout.status !== "tegenstander_gezocht";
      })
      // De openbare line-up volgt exact de opgeslagen partijvolgorde.
      .sort((a: AnyRow, b: AnyRow) => {
        const pa = Number.isFinite(a.partijNr) ? a.partijNr : Number.POSITIVE_INFINITY;
        const pb = Number.isFinite(b.partijNr) ? b.partijNr : Number.POSITIVE_INFINITY;
        return pa - pb;
      });

    const searching = publication.show_opponent_search === false
      ? []
      : (contextsRes.data ?? [])
          .filter((context: AnyRow) => s(context.status).toLowerCase() === "open")
          .filter((context: AnyRow) => {
            const va = digits(context.va_nummer);
            return !va || !matchedVas.has(va);
          })
          .map((context: AnyRow) => {
            const contextEventDate = first(context.evenement_datum, eventDate);
            const birthDate = first(
              context.geboortedatum,
              context.fp_geboortedatum,
              context.geboortedatum_input,
            );

            const inschrijvingId = registrationId(first(
              context.inschrijving_id,
              context.aanmelding_id,
              context.id,
            ));

            return {
              id: inschrijvingId || s(first(context.id, context.va_nummer)),
              inschrijvingId,
              starred: priorityIds.has(inschrijvingId),
              naam: s(first(context.naam, context.fp_naam, context.naam_input)) || "Onbekend",
              sportschool: s(first(context.gym_input, context.fp_gym)) || "—",
              record: recordFromResults(context, resultRows, false),
              klasse: s(first(context.klasse, context.fp_klasse, context.nulmeting_klasse)) || "—",
              geslacht: genderLabel(first(context.geslacht, context.fp_geslacht)),
              leeftijd: ageOnDate(birthDate, contextEventDate),
              gewicht: weightLabel(context.gewicht),
            };
          })
          .sort((a: AnyRow, b: AnyRow) => {
            const klasse = classRank(a.klasse) - classRank(b.klasse);
            if (klasse !== 0) return klasse;
            const ageA = a.leeftijd ?? Number.POSITIVE_INFINITY;
            const ageB = b.leeftijd ?? Number.POSITIVE_INFINITY;
            if (ageA !== ageB) return ageA - ageB;
            const weightA = Number(String(a.gewicht).replace(/[^0-9.,]/g, "").replace(",", "."));
            const weightB = Number(String(b.gewicht).replace(/[^0-9.,]/g, "").replace(",", "."));
            if (Number.isFinite(weightA) && Number.isFinite(weightB) && weightA !== weightB) {
              return weightA - weightB;
            }
            return a.naam.localeCompare(b.naam, "nl");
          });

    const galaDuurMinuten = bouts.reduce(
      (total: number, bout: AnyRow) => total + (Number(bout.galaMinuten) || 0),
      0,
    );
    // Alleen intern nodig voor de som; niet als los veld per partij naar de browser sturen.
    const publicBouts = bouts.map(({ galaMinuten, ...bout }: AnyRow) => bout);

    const updatedAt = [...(boutsRes.data ?? []), ...(contextsRes.data ?? [])].reduce(
      (latest: string, row: AnyRow) => {
        const candidate = s(first(row.laatste_bewerking_op, row.updated_at, row.created_at));
        return !latest || (candidate && candidate > latest) ? candidate : latest;
      },
      s(first(publication.updated_at, publication.created_at)),
    ) || new Date().toISOString();

    return NextResponse.json(
      {
        ok: true,
        audience: "promoter",
        event: {
          title: s(publication.public_title) || s(first(mm.event_naam, mm.naam, mm.titel)) || "Line-up",
          date: eventDate,
          location: s(publication.public_location) || s(first(mm.event_locatie, mm.locatie, mm.plaats, mm.stadium)),
          disciplines: s(publication.public_disciplines) || s(first(mm.discipline, mm.disciplines)),
          phase: "Line-up",
          updatedAt,
          galaDuur: galaDuurMinuten > 0 ? formatGalaDuration(galaDuurMinuten) : "",
        },
        counts: {
          total: bouts.length,
          confirmed: bouts.filter((b: AnyRow) => b.status === "bevestigd").length,
          pending: bouts.filter((b: AnyRow) => b.status === "onder_voorbehoud").length,
          searching: searching.length,
        },
        bouts: publicBouts,
        searching,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: s(error?.message) || "Line-up laden mislukt" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const cleanToken = s(token);
    if (!cleanToken) {
      return NextResponse.json({ error: "Ongeldige link" }, { status: 400 });
    }

    // Alleen de actieve promotor-live-token mag prioriteiten wijzigen.
    // De trainer-token wordt bewust niet geaccepteerd.
    const { data: publication, error: publicationError } = await supabaseAdmin
      .from("matchmaking_public_pages")
      .select("matchmaking_id")
      .eq("public_token", cleanToken)
      .eq("is_enabled", true)
      .maybeSingle();

    if (publicationError) throw publicationError;
    if (!publication) {
      return NextResponse.json(
        { error: "Deze live link is niet beschikbaar" },
        { status: 404 },
      );
    }

    const matchmakingId = s(publication.matchmaking_id);
    const body = await req.json().catch(() => ({}));
    const inschrijvingId = s(body.inschrijving_id);
    const actief = body.actief === true;

    if (!inschrijvingId) {
      return NextResponse.json({ error: "inschrijving_id ontbreekt" }, { status: 400 });
    }

    const { data: mm, error: mmError } = await supabaseAdmin
      .from("matchmakings")
      .select("matchmaker_id, uploaded_by, maker_user_id, huidige_eigenaar_user_id")
      .eq("id", matchmakingId)
      .single();

    if (mmError) throw mmError;

    // Gebruik bij voorkeur dezelfde gebruiker waaronder de bestaande sterren
    // van deze matchmaking al zijn opgeslagen. Zo sluit de promotor-livepagina
    // exact aan op de prioriteiten die de matchmaker op de interne pagina ziet.
    const { data: existingPriority, error: existingPriorityError } = await supabaseAdmin
      .from("matchmaker_prioriteiten")
      .select("user_id")
      .eq("matchmaking_id", matchmakingId)
      .limit(1)
      .maybeSingle();

    if (existingPriorityError) throw existingPriorityError;

    const priorityUserId = s(first(
      existingPriority?.user_id,
      mm?.matchmaker_id,
      mm?.uploaded_by,
      mm?.maker_user_id,
      mm?.huidige_eigenaar_user_id,
    ));

    if (!priorityUserId) throw new Error("Eigenaar van matchmaking niet gevonden");

    // Accepteer uitsluitend een inschrijving die echt bij deze matchmaking hoort.
    const { data: fighterContext, error: fighterError } = await supabaseAdmin
      .from("matchmaker_fighter_context")
      .select("id")
      .eq("matchmaking_id", matchmakingId)
      .or(`inschrijving_id.eq.${inschrijvingId},aanmelding_id.eq.${inschrijvingId},id.eq.${inschrijvingId}`)
      .limit(1)
      .maybeSingle();

    if (fighterError) throw fighterError;
    if (!fighterContext) {
      return NextResponse.json(
        { error: "Vechter hoort niet bij deze matchmaking" },
        { status: 400 },
      );
    }

    if (actief) {
      const { error } = await supabaseAdmin
        .from("matchmaker_prioriteiten")
        .upsert(
          {
            matchmaking_id: matchmakingId,
            inschrijving_id: inschrijvingId,
            user_id: priorityUserId,
          },
          {
            onConflict: "matchmaking_id,inschrijving_id,user_id",
            ignoreDuplicates: true,
          },
        );
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("matchmaker_prioriteiten")
        .delete()
        .eq("matchmaking_id", matchmakingId)
        .eq("inschrijving_id", inschrijvingId)
        .eq("user_id", priorityUserId);
      if (error) throw error;
    }

    return NextResponse.json({
      ok: true,
      inschrijving_id: inschrijvingId,
      actief,
    });
  } catch (error: any) {
    console.error("[public-matchmaking] Ster opslaan mislukt", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });

    return NextResponse.json(
      {
        error: s(error?.message) || "Ster opslaan mislukt",
        code: s(error?.code),
      },
      { status: 500 },
    );
  }
}

