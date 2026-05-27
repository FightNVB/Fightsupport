// lib/matchmaker/fighterRules.ts
import dayjs from "dayjs";

export type AnyRow = Record<string, any>;

export type MatchmakerFighterResultaat =
  | "OK"
  | "LET_OP"
  | "ACTIE"
  | "DISPENSATIE"
  | "AFKEUR"
  | "VERBOD";

export type MatchmakerFighterSeverity =
  | "ok"
  | "info"
  | "warning"
  | "error";

export type MatchmakerFighterRuleHit = {
  matchmaking_id: string | null;
  controle_run_id?: string | null;
  inschrijving_id?: string | number | null;
  aanmelding_id?: string | number | null;
  fighter_id?: string | null;
  va_nummer?: string | null;
  regel_type: "matchmaker_fighter";
  rule: string;
  rule_code: string;
  resultaat: MatchmakerFighterResultaat;
  severity: MatchmakerFighterSeverity;
  boodschap: string;
  bron: "aanmeldingen";
  created_at: string;
};

export type UitslagRow = {
  va_nummer?: string | number | null;
  discipline?: string | null;
  klasse?: string | null;
  uitslag?: string | null;
  datum?: string | null;
};

type Klasse = "R" | "N" | "C" | "B" | "A";
type NormKlasse = Klasse | "JEUGD" | "MMA_AMATEUR" | "MMA_PRO";
type Outcome = "WIN" | "LOSS" | "DRAW" | "OTHER";

type RecordStats = {
  wins: number;
  losses: number;
  draws: number;
  other: number;
  total: number;
  recordLabel: string;
};

type KlasseProgress = Record<Klasse, RecordStats>;

type RecordAdvice = {
  currentClass: Klasse;
  minimumClass: Klasse;
  recordInCurrentClass: RecordStats;
  totalOfficial: number;
  totalOther: number;
};

const KLASSE_VOLGORDE: Klasse[] = ["R", "N", "C", "B", "A"];

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function lower(v: unknown): string {
  return s(v).toLowerCase();
}

function digits(v: unknown): string {
  return s(v).replace(/\D+/g, "").replace(/^0+/, "");
}

function num(v: unknown): number | null {
  const n = Number(s(v).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function boolish(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  const x = lower(v);

  if (!x) return null;

  if (["ja", "j", "yes", "y", "true", "1", "geldig", "ok"].includes(x)) {
    return true;
  }

  if (["nee", "n", "no", "false", "0", "ongeldig", "niet geldig"].includes(x)) {
    return false;
  }

  return null;
}

function dateOnly(v: unknown): dayjs.Dayjs | null {
  if (!v) return null;

  const raw = s(v);
  const d = dayjs(raw);
  if (d.isValid()) return d;

  const m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const parsed = dayjs(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`);
    return parsed.isValid() ? parsed : null;
  }

  return null;
}

function sameDate(a: dayjs.Dayjs | null, b: dayjs.Dayjs | null): boolean {
  if (!a || !b) return false;
  return a.format("YYYY-MM-DD") === b.format("YYYY-MM-DD");
}

function normName(v: unknown): string {
  return s(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(v: unknown): string[] {
  return normName(v)
    .split(" ")
    .map((x) => x.trim())
    .filter((x) => x.length >= 2)
    .filter((x) => !["de", "van", "el", "al", "ibn", "bin"].includes(x));
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }

  return dp[b.length];
}

function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (!max) return 1;
  return 1 - levenshtein(a, b) / max;
}

function nameSimilar(a: unknown, b: unknown): boolean {
  const at = tokens(a);
  const bt = tokens(b);

  if (!at.length || !bt.length) return true;

  const aLast = at[at.length - 1];
  const bLast = bt[bt.length - 1];

  if (similarity(aLast, bLast) < 0.78) return false;

  const af = at.slice(0, -1);
  const bf = bt.slice(0, -1);

  if (!af.length || !bf.length) return true;

  let best = 0;

  for (const x of af) {
    for (const y of bf) {
      best = Math.max(best, similarity(x, y));
    }
  }

  return best >= 0.72;
}

function parseGender(v: unknown): "M" | "V" | null {
  const x = lower(v);

  if (!x) return null;
  if (["m", "man", "male", "jongen", "heer"].includes(x)) return "M";
  if (["v", "vrouw", "female", "meisje", "dame"].includes(x)) return "V";

  return null;
}

function normalizeKlasse(v: unknown): NormKlasse | null {
  const x = s(v).toUpperCase();

  if (!x) return null;

  if (x.includes("JEUGD") || x.includes("YOUTH") || x === "J" || x === "J+" || x.startsWith("J-")) {
    return "JEUGD";
  }

  if (x.includes("MMA") && (x.includes("PRO") || x.includes("PROF"))) return "MMA_PRO";
  if (x.includes("MMA") && (x.includes("AMA") || x.includes("AMATEUR"))) return "MMA_AMATEUR";

  if (x.includes("NIEUWELING") || x.includes("NEWCOMER")) return "N";
  if (x.includes("VETERAAN") || x.includes("VETERAN")) return "N";

  const klass = x.match(/\b(R|N|C|B|A)[- ]?(KLASSE|CLASS)?\b/);
  if (klass) return klass[1] as Klasse;

  return null;
}

function isAdultKlasse(k: NormKlasse | null): k is Klasse {
  return k === "R" || k === "N" || k === "C" || k === "B" || k === "A";
}

function klasseIndex(k: Klasse | null): number {
  if (!k) return -1;
  return KLASSE_VOLGORDE.indexOf(k);
}

function isKbMtDiscipline(v: unknown): boolean {
  const x = lower(v);
  return x.includes("kick") || x.includes("k1") || x.includes("muay") || x.includes("thai");
}

function parseOutcome(v: unknown): Outcome {
  const x = lower(v);

  if (!x) return "OTHER";
  if (x.includes("demo") || x.includes("demonstr") || x.includes("no contest") || x.includes("nocontest") || x.includes("no-contest")) return "OTHER";
  if (x.includes("onbeslist") || x.includes("gelijk") || x.includes("draw")) return "DRAW";
  if (x.includes("verliest") || x.includes("verlies") || x.includes("lost") || x.includes("loss")) return "LOSS";
  if (x.includes("wint") || x.includes("gewonnen") || x.includes("win")) return "WIN";

  return "OTHER";
}

function emptyRecord(): RecordStats {
  return { wins: 0, losses: 0, draws: 0, other: 0, total: 0, recordLabel: "0-0-0" };
}

function finishRecord(r: RecordStats): RecordStats {
  const official = r.wins + r.losses + r.draws;
  return {
    ...r,
    total: official,
    recordLabel: `${r.wins}-${r.losses}-${r.draws}${r.other > 0 ? ` (${r.other})` : ""}`,
  };
}

function addOutcomeToRecord(r: RecordStats, outcome: Outcome) {
  if (outcome === "WIN") r.wins += 1;
  else if (outcome === "LOSS") r.losses += 1;
  else if (outcome === "DRAW") r.draws += 1;
  else r.other += 1;
}

function getNaamInput(ctx: AnyRow): string {
  const combined = [ctx.voornaam, ctx.achternaam].map(s).filter(Boolean).join(" ").trim();
  const naamInput = s(ctx.naam_input);

  if (combined && (!naamInput || normName(naamInput) === normName(ctx.voornaam))) {
    return combined;
  }

  return naamInput || combined || s(ctx.fighter_name) || s(ctx.naam);
}

function getNaamFp(ctx: AnyRow): string {
  return (
    s(ctx.fp_naam) ||
    s(ctx.naam_fp) ||
    s(ctx.naam_scrape) ||
    s(ctx.extra?.raw?.fighters_raw?.naam) ||
    s(ctx.extra?.raw?.scrape?.naam) ||
    s(ctx.extra?.raw_scrape?.naam)
  );
}

function getGymInput(ctx: AnyRow): string {
  return s(ctx.gym_input) || s(ctx.sportschool_input) || s(ctx.sportschool) || s(ctx.gym);
}

function getGymFp(ctx: AnyRow): string {
  return (
    s(ctx.fp_gym) ||
    s(ctx.gym_fp) ||
    s(ctx.sportschool_fp) ||
    s(ctx.extra?.raw_scrape?.sportschool) ||
    s(ctx.extra?.raw_scrape?.gym)
  );
}

function getDobInput(ctx: AnyRow): dayjs.Dayjs | null {
  return dateOnly(ctx.geboortedatum_input) || dateOnly(ctx.geboortedatum) || dateOnly(ctx.geboortedatum_mm);
}

function getDobFp(ctx: AnyRow): dayjs.Dayjs | null {
  return (
    dateOnly(ctx.fp_geboortedatum) ||
    dateOnly(ctx.geboortedatum_fp) ||
    dateOnly(ctx.extra?.raw_scrape?.geboortedatum) ||
    dateOnly(ctx.extra?.raw?.fighters_raw?.geboortedatum)
  );
}

function getEventDate(ctx: AnyRow): dayjs.Dayjs | null {
  return dateOnly(ctx.evenement_datum) || dateOnly(ctx.event_datum) || dateOnly(ctx.event_date) || dateOnly(ctx.datum);
}

function getAgeOnEvent(ctx: AnyRow): number | null {
  const dob = getDobFp(ctx) || getDobInput(ctx);
  const eventDate = getEventDate(ctx);

  if (!dob || !eventDate) return null;
  return eventDate.diff(dob, "year");
}

function getUitslagen(ctx: AnyRow, uitslagen?: UitslagRow[]): UitslagRow[] {
  if (Array.isArray(uitslagen)) return uitslagen;
  if (Array.isArray(ctx.uitslagen)) return ctx.uitslagen;
  if (Array.isArray(ctx.uitslagen_raw)) return ctx.uitslagen_raw;
  if (Array.isArray(ctx.extra?.uitslagen)) return ctx.extra.uitslagen;
  if (Array.isArray(ctx.extra?.raw?.uitslagen)) return ctx.extra.raw.uitslagen;
  return [];
}

function buildKlasseProgress(rows: UitslagRow[]): KlasseProgress {
  const progress: KlasseProgress = {
    R: emptyRecord(),
    N: emptyRecord(),
    C: emptyRecord(),
    B: emptyRecord(),
    A: emptyRecord(),
  };

  for (const row of rows) {
    if (!isKbMtDiscipline(row.discipline)) continue;

    const k = normalizeKlasse(row.klasse);
    const outcome = parseOutcome(row.uitslag);

    if (isAdultKlasse(k)) {
      addOutcomeToRecord(progress[k], outcome);
    } else {
      // Jeugd, onbekende klasse, demo/no-contest of andere oude data hoort niet in het huidige volwassen record.
      // Deze wordt later als overige meegenomen bij de actuele klasse.
      continue;
    }
  }

  for (const k of KLASSE_VOLGORDE) progress[k] = finishRecord(progress[k]);
  return progress;
}

export function recordStatsFromUitslagen(rows: UitslagRow[] = [], currentClass?: Klasse | NormKlasse | null) {
  const requested = isAdultKlasse(currentClass ?? null) ? currentClass as Klasse : null;
  const progress = buildKlasseProgress(rows);

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let other = 0;

  for (const row of rows) {
    if (!isKbMtDiscipline(row.discipline)) continue;

    const k = normalizeKlasse(row.klasse);
    const outcome = parseOutcome(row.uitslag);

    if (requested && k === requested) {
      if (outcome === "WIN") wins += 1;
      else if (outcome === "LOSS") losses += 1;
      else if (outcome === "DRAW") draws += 1;
      else other += 1;
    } else if (requested) {
      other += 1;
    } else {
      if (outcome === "WIN") wins += 1;
      else if (outcome === "LOSS") losses += 1;
      else if (outcome === "DRAW") draws += 1;
      else other += 1;
    }
  }

  const total = wins + losses + draws;
  const recordLabel = `${wins}-${losses}-${draws}${other > 0 ? ` (${other})` : ""}`;

  return {
    wins,
    losses,
    draws,
    demo: other,
    other,
    totaalInclusiefDemo: total + other,
    totaalZonderDemo: total,
    totaalVoorPartijverschil: total,
    recordLabel,
    perKlasse: progress,
  };
}

function minimumAfterClass(base: Klasse, rec: RecordStats): Klasse {
  if (base === "R") {
    if (rec.wins >= 2 || rec.total >= 3) return "N";
    return "R";
  }

  if (base === "N") {
    if (rec.wins >= 3 || rec.total >= 6) return "C";
    return "N";
  }

  if (base === "C") {
    if (rec.wins >= 6 || rec.total >= 8) return "B";
    return "C";
  }

  if (base === "B") {
    if (rec.wins >= 8 || rec.total >= 10) return "A";
    return "B";
  }

  return "A";
}

function getRecordAdvice(rows: UitslagRow[], fpKlasse: NormKlasse | null): RecordAdvice {
  const progress = buildKlasseProgress(rows);

  let currentClass: Klasse | null = isAdultKlasse(fpKlasse) ? fpKlasse : null;

  for (const k of KLASSE_VOLGORDE) {
    if (progress[k].total > 0 || progress[k].other > 0) currentClass = k;
  }

  if (!currentClass) currentClass = "N";

  let minimumClass: Klasse = "N";

  // R is optioneel. Zonder partijen mag R of N, maar advies/minimum blijft R als FP/nulmeting R aangeeft.
  if (currentClass === "R") minimumClass = minimumAfterClass("R", progress.R);
  else minimumClass = currentClass;

  // Doorloop verplichte promoties per klasse. Een vechter kan nooit lager dan de klasse die uit zijn actuele klasse/record volgt.
  for (const k of KLASSE_VOLGORDE) {
    if (klasseIndex(k) < klasseIndex(minimumClass)) continue;
    const next = minimumAfterClass(k, progress[k]);
    if (klasseIndex(next) > klasseIndex(minimumClass)) minimumClass = next;
  }

  let totalOfficial = 0;
  let totalOther = 0;
  for (const k of KLASSE_VOLGORDE) {
    totalOfficial += progress[k].total;
    totalOther += progress[k].other;
  }

  return {
    currentClass,
    minimumClass,
    recordInCurrentClass: progress[currentClass],
    totalOfficial,
    totalOther,
  };
}

function recordLabelForRequestedClass(rows: UitslagRow[], requested: Klasse): string {
  return recordStatsFromUitslagen(rows, requested).recordLabel;
}

function makeAdd(ctx: AnyRow, hits: MatchmakerFighterRuleHit[]) {
  return (
    rule_code: string,
    resultaat: MatchmakerFighterResultaat,
    boodschap: string,
    severity?: MatchmakerFighterSeverity,
    rule?: string,
  ) => {
    hits.push({
      matchmaking_id: s(ctx.matchmaking_id) || null,
      controle_run_id: s(ctx.controle_run_id ?? ctx.scrape_run_id) || null,
      inschrijving_id: ctx.inschrijving_id ?? ctx.aanmelding_id ?? ctx.id ?? null,
      aanmelding_id: ctx.aanmelding_id ?? ctx.inschrijving_id ?? ctx.id ?? null,
      fighter_id: s(ctx.fighter_id) || null,
      va_nummer: digits(ctx.va_nummer ?? ctx.va_nummer_input ?? ctx.va) || null,
      regel_type: "matchmaker_fighter",
      rule: rule || rule_code,
      rule_code,
      resultaat,
      severity:
        severity ??
        (resultaat === "OK"
          ? "ok"
          : resultaat === "VERBOD" || resultaat === "AFKEUR"
            ? "error"
            : "warning"),
      boodschap,
      bron: "aanmeldingen",
      created_at: new Date().toISOString(),
    });
  };
}

export function runMatchmakerFighterRules(
  ctx: AnyRow,
  opts?: {
    uitslagen?: UitslagRow[];
    includeOk?: boolean;
  },
): MatchmakerFighterRuleHit[] {
  const hits: MatchmakerFighterRuleHit[] = [];
  const add = makeAdd(ctx, hits);

  const va = digits(ctx.va_nummer ?? ctx.va_nummer_input ?? ctx.va);
  const fpNaam = getNaamFp(ctx);
  const inputNaam = getNaamInput(ctx);
  const fpGym = getGymFp(ctx);
  const inputGym = getGymInput(ctx);

  const dobInput = getDobInput(ctx);
  const dobFp = getDobFp(ctx);

  const genderInput = parseGender(ctx.geslacht_input ?? ctx.geslacht);
  const genderFp = parseGender(ctx.fp_geslacht ?? ctx.geslacht_fp ?? ctx.extra?.raw_scrape?.geslacht ?? ctx.extra?.raw?.fighters_raw?.geslacht);

  const leeftijd = getAgeOnEvent(ctx);
  const eventDate = getEventDate(ctx);

  const klasseAanmelding = normalizeKlasse(ctx.klasse ?? ctx.klasse_input ?? ctx.klasse_mm);
  const fpKlasse = normalizeKlasse(ctx.fp_klasse ?? ctx.klasse_fp ?? ctx.nulmeting_klasse ?? ctx.extra?.raw_scrape?.nulmeting_klasse);

  const discipline = ctx.discipline ?? ctx.discipline_input;
  const kbMt = isKbMtDiscipline(discipline);

  const uitslagen = getUitslagen(ctx, opts?.uitslagen);
  const requested = isAdultKlasse(klasseAanmelding) ? klasseAanmelding : null;
  const recordStats = recordStatsFromUitslagen(uitslagen, requested);

  if (!va) {
    add("MATCHMAKER_GEEN_VA", "ACTIE", "Deze aanmelding heeft geen geldig Fightpaspoortnummer.", "warning", "Fightpaspoortnummer ontbreekt");
  }

  if (va && !fpNaam && !dobFp) {
    add("MATCHMAKER_GEEN_FP_DATA", "ACTIE", "Geen Fightpaspoortgegevens gevonden voor deze vechter. Controleer VA-nummer of start de controle opnieuw.", "warning", "Geen Fightpaspoortdata");
  }

  if (!inputNaam) {
    add("MATCHMAKER_NAAM_ONTBREEKT", "ACTIE", "Naam ontbreekt in de aanmelding.", "warning", "Naam ontbreekt");
  } else if (fpNaam && !nameSimilar(inputNaam, fpNaam)) {
    add("MATCHMAKER_NAAM_WIJKT_AF", "ACTIE", `Naam uit aanmelding ("${inputNaam}") wijkt af van Fightpaspoort ("${fpNaam}"). Fightpaspoort is leidend.`, "warning", "Naam wijkt af");
  }

  if (!dobInput) {
    add("MATCHMAKER_GEBOORTEDATUM_ONTBREEKT", "ACTIE", "Geboortedatum ontbreekt in de aanmelding.", "warning", "Geboortedatum ontbreekt");
  } else if (dobFp && !sameDate(dobInput, dobFp)) {
    add("MATCHMAKER_GEBOORTEDATUM_WIJKT_AF", "ACTIE", `Geboortedatum uit aanmelding (${dobInput.format("DD-MM-YYYY")}) wijkt af van Fightpaspoort (${dobFp.format("DD-MM-YYYY")}). Fightpaspoort is leidend.`, "warning", "Geboortedatum wijkt af");
  }

  if (!eventDate) {
    add("MATCHMAKER_EVENTDATUM_ONTBREEKT", "ACTIE", "Eventdatum ontbreekt. Leeftijd kan niet betrouwbaar op eventdatum worden berekend.", "warning", "Eventdatum ontbreekt");
  }

  if (genderInput && genderFp && genderInput !== genderFp) {
    add("MATCHMAKER_GESLACHT_WIJKT_AF", "ACTIE", `Geslacht uit aanmelding (${genderInput === "M" ? "man" : "vrouw"}) wijkt af van Fightpaspoort (${genderFp === "M" ? "man" : "vrouw"}). Fightpaspoort is leidend.`, "warning", "Geslacht wijkt af");
  }

  if (inputGym && fpGym && !nameSimilar(inputGym, fpGym)) {
    add("MATCHMAKER_SPORTSCHOOL_WIJKT_AF", "LET_OP", `Sportschool uit aanmelding ("${inputGym}") wijkt af van Fightpaspoort ("${fpGym}").`, "warning", "Sportschool wijkt af");
  }

  const licentie = boolish(ctx.fp_licentie ?? ctx.licentie ?? ctx.licentie_ok ?? ctx.licentie_status ?? ctx.extra?.raw_scrape?.licentie);
  if (licentie === false) {
    add("MATCHMAKER_GEEN_LICENTIE", "AFKEUR", "Deze vechter heeft volgens Fightpaspoort geen geldige licentie.", "error", "Geen geldige licentie");
  }

  const startverbod = boolish(ctx.fp_startverbod ?? ctx.heeft_startverbod ?? ctx.startverbod ?? ctx.extra?.raw_scrape?.heeft_startverbod);
  if (startverbod === true) {
    add("MATCHMAKER_STARTVERBOD", "VERBOD", "Deze vechter heeft volgens Fightpaspoort een startverbod en mag niet deelnemen.", "error", "Startverbod");
  }

  const keurmerk = boolish(ctx.keurmerk ?? ctx.heeft_keurmerk ?? ctx.keurmerk_geldig ?? ctx.sportschool_keurmerk);
  const keurmerkStatus = lower(ctx.keurmerk_status);
  const keurmerkReden = s(ctx.keurmerk_reden) || s(ctx.sportschool_keurmerk_reden) || "Sportschool heeft geen geldig keurmerk.";

  if (keurmerkStatus === "belgie_check" || keurmerkStatus.includes("belg")) {
    add("MATCHMAKER_BELGIE_CHECK", "LET_OP", keurmerkReden || "Belgische sportschool: controleer BKBMO/boksboekje handmatig.", "info", "België check");
  } else if (keurmerk === false) {
    add("MATCHMAKER_GEEN_KEURMERK", "LET_OP", keurmerkReden, "warning", "Geen geldig keurmerk");
  }

  if (leeftijd != null && leeftijd < 18) {
    if (klasseAanmelding && klasseAanmelding !== "JEUGD" && klasseAanmelding !== "MMA_AMATEUR" && klasseAanmelding !== "MMA_PRO") {
      add("MATCHMAKER_JEUGD_IN_VOLWASSEN_KLASSE", "AFKEUR", `Deze vechter is ${leeftijd} jaar op eventdatum en staat in volwassen klasse ${klasseAanmelding}. Tot 18 jaar is dit altijd jeugd.`, "error", "Jeugd in volwassen klasse");
    }

    if (fpKlasse && fpKlasse !== "JEUGD" && fpKlasse !== "MMA_AMATEUR" && fpKlasse !== "MMA_PRO") {
      add("MATCHMAKER_FP_KLASSE_JEUGD_WIJKT_AF", "LET_OP", `Deze vechter is ${leeftijd} jaar op eventdatum en dus jeugd, maar Fightpaspoort/nulmeting geeft klasse ${fpKlasse}. Controleer dit handmatig.`, "warning", "Jeugd klassecontrole");
    }
  }

  if (leeftijd != null && leeftijd >= 18 && klasseAanmelding === "JEUGD") {
    add("MATCHMAKER_VOLWASSENE_IN_JEUGD_KLASSE", "AFKEUR", `Deze vechter is ${leeftijd} jaar op eventdatum en mag niet als jeugd worden ingedeeld.`, "error", "Volwassene in jeugdklasse");
  }

  if (leeftijd != null && leeftijd >= 40) {
    add("MATCHMAKER_SPORTMEDISCH_ADVIES_40_PLUS", "ACTIE", `Deze vechter is ${leeftijd} jaar op eventdatum. Controleer sportmedische keuring/advies.`, "warning", "Sportmedische controle 40+");
  }

  if (leeftijd != null && leeftijd >= 18 && kbMt) {
    if (!requested) {
      add("MATCHMAKER_KLASSE_ONDUIDELIJK", "ACTIE", "De opgegeven klasse kon niet duidelijk worden bepaald.", "warning", "Klasse onduidelijk");
    }

    const advice = getRecordAdvice(uitslagen, fpKlasse);

    if (!uitslagen.length && !isAdultKlasse(fpKlasse)) {
      add("MATCHMAKER_GEEN_UITSLAGEN_VOOR_KLASSECHECK", "LET_OP", "Geen uitslagenhistorie of volwassen nulmetingklasse gevonden. Klasse moet handmatig gecontroleerd worden.", "warning", "Geen uitslagenhistorie");
    }

    if (requested === "R") {
      const rRec = buildKlasseProgress(uitslagen).R;
      const hasNonRExperience = recordStats.other > 0;

      if (hasNonRExperience) {
        add("MATCHMAKER_R_KLASSE_MET_WEDSTRIJDERVARING", "AFKEUR", `R-klasse is alleen bedoeld als optionele instapklasse zonder eerdere wedstrijdervaring buiten R. Huidig record in R: ${rRec.recordLabel}. Overige partijen: ${recordStats.other}.`, "error", "R-klasse met wedstrijdervaring");
      } else if (rRec.wins >= 2 || rRec.total >= 3) {
        add("MATCHMAKER_R_KLASSE_MAX_BEREIKT", "AFKEUR", `R-klasse maximum bereikt. Record in R: ${rRec.recordLabel}. Na 2 winst of 3 totaal moet deze vechter naar N klasse.`, "error", "R-klasse maximum bereikt");
      }
    }

    if (requested) {
      const requestedRecordLabel = recordLabelForRequestedClass(uitslagen, requested);

      if (klasseIndex(requested) < klasseIndex(advice.minimumClass)) {
        add("MATCHMAKER_KLASSE_TE_LAAG", "ACTIE", `Vechter is opgegeven voor klasse ${requested}, maar hoort op basis van Fightpaspoort/uitslagen minimaal in klasse ${advice.minimumClass}. Record in opgegeven klasse: ${requestedRecordLabel}.`, "warning", "Klasse te laag");
      }

      if (klasseIndex(requested) > klasseIndex(advice.minimumClass)) {
        // Te hoog indelen kan soms met dispensatie, behalve wanneer iemand zonder historie rechtstreeks hoger dan N wordt gezet.
        const resultaat: MatchmakerFighterResultaat = advice.totalOfficial === 0 && requested !== "N" && requested !== "R" ? "AFKEUR" : "DISPENSATIE";
        add("MATCHMAKER_KLASSE_TE_HOOG", resultaat, `Vechter is opgegeven voor klasse ${requested}, maar op basis van Fightpaspoort/uitslagen is het advies ${advice.minimumClass}. Record in opgegeven klasse: ${requestedRecordLabel}.`, resultaat === "AFKEUR" ? "error" : "warning", "Klasse te hoog");
      }

      if (opts?.includeOk) {
        add("MATCHMAKER_RECORD_BEREKEND", "OK", `Record voor opgegeven klasse ${requested}: ${requestedRecordLabel}.`, "ok", "Record berekend");
      }
    }
  }

  if (opts?.includeOk && hits.length === 0) {
    add("MATCHMAKER_FIGHTER_OK", "OK", "Geen bijzonderheden gevonden voor deze vechter.", "ok", "Vechtercontrole OK");
  }

  return hits;
}

export const fighterRules = runMatchmakerFighterRules;
export default runMatchmakerFighterRules;
