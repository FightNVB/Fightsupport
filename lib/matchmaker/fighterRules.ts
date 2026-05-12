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

  if (
    ["nee", "n", "no", "false", "0", "ongeldig", "niet geldig"].includes(x)
  ) {
    return false;
  }

  return null;
}

function dateOnly(v: unknown): dayjs.Dayjs | null {
  if (!v) return null;
  const d = dayjs(s(v));
  return d.isValid() ? d : null;
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

      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + cost,
      );

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

  if (
    x === "m" ||
    x === "man" ||
    x === "male" ||
    x === "jongen" ||
    x === "heer"
  ) {
    return "M";
  }

  if (
    x === "v" ||
    x === "vrouw" ||
    x === "female" ||
    x === "meisje" ||
    x === "dame"
  ) {
    return "V";
  }

  return null;
}

function normalizeKlasse(v: unknown): Klasse | "JEUGD" | "MMA_AMATEUR" | "MMA_PRO" | null {
  const x = s(v).toUpperCase();

  if (!x) return null;

  if (
    x.includes("JEUGD") ||
    x.includes("YOUTH") ||
    x === "J" ||
    x.startsWith("J-")
  ) {
    return "JEUGD";
  }

  if (x.includes("MMA") && (x.includes("PRO") || x.includes("PROF"))) {
    return "MMA_PRO";
  }

  if (x.includes("MMA") && (x.includes("AMA") || x.includes("AMATEUR"))) {
    return "MMA_AMATEUR";
  }

  if (x.includes("NIEUWELING") || x.includes("NEWCOMER")) return "N";
  if (x.includes("VETERAAN") || x.includes("VETERAN")) return "N";

  const direct = x.match(/\b(R|N|C|B|A)\b/);
  if (direct) return direct[1] as Klasse;

  const klass = x.match(/\b(R|N|C|B|A)[- ]?(KLASSE|CLASS)\b/);
  if (klass) return klass[1] as Klasse;

  return null;
}

function klasseIndex(k: Klasse | null): number {
  if (!k) return -1;
  return KLASSE_VOLGORDE.indexOf(k);
}

function maxKlasse(a: Klasse | null, b: Klasse | null): Klasse | null {
  if (!a) return b;
  if (!b) return a;
  return klasseIndex(a) >= klasseIndex(b) ? a : b;
}

function parseOutcome(v: unknown): "WIN" | "LOSS" | "DRAW" | "DEMO" | "OTHER" {
  const x = lower(v);

  if (!x) return "OTHER";
  if (x.includes("demo") || x.includes("demonstr")) return "DEMO";
  if (x.includes("wint") || x.includes("win")) return "WIN";
  if (x.includes("verliest") || x.includes("verlies") || x.includes("lost")) {
    return "LOSS";
  }
  if (x.includes("draw") || x.includes("gelijk") || x.includes("onbeslist")) {
    return "DRAW";
  }

  return "OTHER";
}

function isKbMtDiscipline(v: unknown): boolean {
  const x = lower(v);
  return (
    x.includes("kick") ||
    x.includes("k1") ||
    x.includes("muay") ||
    x.includes("thai")
  );
}

function getNaamInput(ctx: AnyRow): string {
  const combined = [ctx.voornaam, ctx.achternaam].map(s).filter(Boolean).join(" ").trim();
  const naamInput = s(ctx.naam_input);

  // De naamcheck moet de aanmeldnaam vergelijken met FightPassport.
  // `ctx.naam` kan in de context juist de FightPassport-naam zijn, dus die gebruiken
  // we pas als laatste fallback. Als naam_input historisch alleen de voornaam bevat,
  // herstellen we hem hier met voornaam + achternaam.
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
  return (
    s(ctx.gym_input) ||
    s(ctx.sportschool_input) ||
    s(ctx.sportschool) ||
    s(ctx.gym)
  );
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
  return (
    dateOnly(ctx.geboortedatum_input) ||
    dateOnly(ctx.geboortedatum) ||
    dateOnly(ctx.geboortedatum_mm)
  );
}

function getDobFp(ctx: AnyRow): dayjs.Dayjs | null {
  return (
    dateOnly(ctx.fp_geboortedatum) ||
    dateOnly(ctx.geboortedatum_fp) ||
    dateOnly(ctx.extra?.raw_scrape?.geboortedatum)
  );
}

function getEventDate(ctx: AnyRow): dayjs.Dayjs | null {
  return (
    dateOnly(ctx.evenement_datum) ||
    dateOnly(ctx.event_datum) ||
    dateOnly(ctx.event_date) ||
    dateOnly(ctx.datum) ||
    dateOnly(ctx.created_at)
  );
}

function getAge(ctx: AnyRow): number | null {
  const direct = num(ctx.leeftijd_event ?? ctx.leeftijd);
  if (direct != null) return direct;

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

function highestClassFromResults(rows: UitslagRow[]): Klasse | null {
  let best: Klasse | null = null;

  for (const row of rows) {
    if (!isKbMtDiscipline(row.discipline)) continue;

    const k = normalizeKlasse(row.klasse);
    if (!k || k === "JEUGD" || k === "MMA_AMATEUR" || k === "MMA_PRO") {
      continue;
    }

    best = maxKlasse(best, k);
  }

  return best;
}

function recordInClass(rows: UitslagRow[], klasse: Klasse): { wins: number; total: number } {
  let wins = 0;
  let total = 0;

  for (const row of rows) {
    if (!isKbMtDiscipline(row.discipline)) continue;

    const k = normalizeKlasse(row.klasse);
    if (k !== klasse) continue;

    const outcome = parseOutcome(row.uitslag);
    if (outcome === "DEMO") continue;

    total++;

    if (outcome === "WIN") {
      wins++;
    }
  }

  return { wins, total };
}

function promotedClass(base: Klasse, wins: number, total: number): Klasse {
  if (base === "R") {
    if (wins >= 2 || total >= 3) return "N";
    return "R";
  }

  if (base === "N") {
    if (wins >= 3 || total >= 6) return "C";
    return "N";
  }

  if (base === "C") {
    if (wins >= 6 || total >= 8) return "B";
    return "C";
  }

  if (base === "B") {
    if (wins >= 8 || total >= 10) return "A";
    return "B";
  }

  return "A";
}

function classAllowed(advice: Klasse | null, requested: Klasse | null): boolean {
  if (!advice || !requested) return true;
  if (klasseIndex(requested) <= klasseIndex(advice)) return true;

  // R naar N mag als praktische instapregel.
  if (advice === "R" && requested === "N") return true;

  return false;
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
      controle_run_id: s(ctx.controle_run_id) || null,
      inschrijving_id: ctx.inschrijving_id ?? ctx.aanmelding_id ?? ctx.id ?? null,
      aanmelding_id: ctx.aanmelding_id ?? ctx.inschrijving_id ?? ctx.id ?? null,
      fighter_id: s(ctx.fighter_id ?? ctx.va_nummer) || null,
      va_nummer: s(ctx.va_nummer) || null,
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
  const genderFp = parseGender(ctx.fp_geslacht ?? ctx.geslacht_fp);

  const leeftijd = getAge(ctx);
  const klasseAanmelding = normalizeKlasse(
    ctx.klasse ?? ctx.klasse_input ?? ctx.klasse_mm,
  );

  const fpKlasse = normalizeKlasse(
    ctx.fp_klasse ?? ctx.klasse_fp ?? ctx.nulmeting_klasse,
  );

  const discipline = ctx.discipline ?? ctx.discipline_input;
  const kbMt = isKbMtDiscipline(discipline);

  const uitslagen = getUitslagen(ctx, opts?.uitslagen);

  if (!va) {
    add(
      "MATCHMAKER_GEEN_VA",
      "ACTIE",
      "Deze aanmelding heeft geen geldig Fightpaspoortnummer.",
      "warning",
      "Fightpaspoortnummer ontbreekt",
    );
  }

  if (va && !fpNaam && !dobFp) {
    add(
      "MATCHMAKER_GEEN_FP_DATA",
      "ACTIE",
      "Geen Fightpaspoortgegevens gevonden voor deze vechter. Controleer VA-nummer of start de controle opnieuw.",
      "warning",
      "Geen Fightpaspoortdata",
    );
  }

  if (!inputNaam) {
    add(
      "MATCHMAKER_NAAM_ONTBREEKT",
      "ACTIE",
      "Naam ontbreekt in de aanmelding.",
      "warning",
      "Naam ontbreekt",
    );
  } else if (fpNaam && !nameSimilar(inputNaam, fpNaam)) {
    add(
      "MATCHMAKER_NAAM_WIJKT_AF",
      "ACTIE",
      `Naam uit aanmelding ("${inputNaam}") wijkt af van Fightpaspoort ("${fpNaam}").`,
      "warning",
      "Naam wijkt af",
    );
  }

  if (!dobInput) {
    add(
      "MATCHMAKER_GEBOORTEDATUM_ONTBREEKT",
      "ACTIE",
      "Geboortedatum ontbreekt in de aanmelding.",
      "warning",
      "Geboortedatum ontbreekt",
    );
  } else if (dobFp && !sameDate(dobInput, dobFp)) {
    add(
      "MATCHMAKER_GEBOORTEDATUM_WIJKT_AF",
      "ACTIE",
      `Geboortedatum uit aanmelding (${dobInput.format("DD-MM-YYYY")}) wijkt af van Fightpaspoort (${dobFp.format("DD-MM-YYYY")}).`,
      "warning",
      "Geboortedatum wijkt af",
    );
  }

  if (genderInput && genderFp && genderInput !== genderFp) {
    add(
      "MATCHMAKER_GESLACHT_WIJKT_AF",
      "ACTIE",
      "Geslacht uit aanmelding wijkt af van Fightpaspoort.",
      "warning",
      "Geslacht wijkt af",
    );
  }

  if (inputGym && fpGym && !nameSimilar(inputGym, fpGym)) {
    add(
      "MATCHMAKER_SPORTSCHOOL_WIJKT_AF",
      "LET_OP",
      `Sportschool uit aanmelding ("${inputGym}") wijkt af van Fightpaspoort ("${fpGym}").`,
      "warning",
      "Sportschool wijkt af",
    );
  }

  const licentie = boolish(
    ctx.licentie ??
      ctx.fp_licentie ??
      ctx.licentie_ok ??
      ctx.licentie_status,
  );

  if (licentie === false || lower(ctx.licentie) === "nee") {
    add(
      "MATCHMAKER_GEEN_LICENTIE",
      "AFKEUR",
      "Deze vechter heeft geen geldige licentie.",
      "error",
      "Geen geldige licentie",
    );
  }

  const startverbod = boolish(
    ctx.startverbod ??
      ctx.heeft_startverbod ??
      ctx.fp_startverbod,
  );

  if (startverbod === true || lower(ctx.startverbod).includes("ja")) {
    add(
      "MATCHMAKER_STARTVERBOD",
      "VERBOD",
      "Deze vechter heeft een startverbod en mag niet deelnemen.",
      "error",
      "Startverbod",
    );
  }

  const keurmerk = boolish(
    ctx.keurmerk ??
      ctx.heeft_keurmerk ??
      ctx.keurmerk_geldig ??
      ctx.sportschool_keurmerk,
  );

  const keurmerkStatus = lower(ctx.keurmerk_status);
  const keurmerkReden =
    s(ctx.keurmerk_reden) ||
    s(ctx.sportschool_keurmerk_reden) ||
    "Sportschool heeft geen geldig keurmerk.";

  if (keurmerkStatus === "belgie_check" || keurmerkStatus.includes("belg")) {
    add(
      "MATCHMAKER_BELGIE_CHECK",
      "LET_OP",
      keurmerkReden || "Belgische sportschool: controleer BKBMO/boksboekje handmatig.",
      "info",
      "België check",
    );
  } else if (keurmerk === false) {
    add(
      "MATCHMAKER_GEEN_KEURMERK",
      "LET_OP",
      keurmerkReden,
      "warning",
      "Geen geldig keurmerk",
    );
  }

  if (leeftijd != null && leeftijd < 18) {
    if (
      klasseAanmelding &&
      klasseAanmelding !== "JEUGD" &&
      klasseAanmelding !== "MMA_AMATEUR" &&
      klasseAanmelding !== "MMA_PRO"
    ) {
      add(
        "MATCHMAKER_JEUGD_IN_VOLWASSEN_KLASSE",
        "AFKEUR",
        `Deze vechter is ${leeftijd} jaar op eventdatum en staat in volwassen klasse ${klasseAanmelding}.`,
        "error",
        "Jeugd in volwassen klasse",
      );
    }

    if (fpKlasse && fpKlasse !== "JEUGD") {
      add(
        "MATCHMAKER_FP_KLASSE_JEUGD_WIJKT_AF",
        "LET_OP",
        `Deze vechter is jeugd op eventdatum, maar Fightpaspoort/nulmeting geeft klasse ${fpKlasse}. Controleer dit handmatig.`,
        "warning",
        "Jeugd klassecontrole",
      );
    }
  }

  if (leeftijd != null && leeftijd >= 18 && klasseAanmelding === "JEUGD") {
    add(
      "MATCHMAKER_VOLWASSENE_IN_JEUGD_KLASSE",
      "AFKEUR",
      `Deze vechter is ${leeftijd} jaar op eventdatum en mag niet als jeugd worden ingedeeld.`,
      "error",
      "Volwassene in jeugdklasse",
    );
  }

  if (leeftijd != null && leeftijd >= 40) {
    add(
      "MATCHMAKER_SPORTMEDISCH_ADVIES_40_PLUS",
      "ACTIE",
      `Deze vechter is ${leeftijd} jaar op eventdatum. Controleer sportmedische keuring/advies.`,
      "warning",
      "Sportmedische controle 40+",
    );
  }

  if (leeftijd != null && leeftijd >= 18 && kbMt) {
    const requested =
      klasseAanmelding && klasseAanmelding !== "JEUGD" &&
      klasseAanmelding !== "MMA_AMATEUR" &&
      klasseAanmelding !== "MMA_PRO"
        ? klasseAanmelding
        : null;

    const historyClass = highestClassFromResults(uitslagen);

    const base =
      historyClass ??
      (fpKlasse && fpKlasse !== "JEUGD" &&
      fpKlasse !== "MMA_AMATEUR" &&
      fpKlasse !== "MMA_PRO"
        ? fpKlasse
        : null);

    if (!requested) {
      add(
        "MATCHMAKER_KLASSE_ONDUIDELIJK",
        "ACTIE",
        "De opgegeven klasse kon niet duidelijk worden bepaald.",
        "warning",
        "Klasse onduidelijk",
      );
    }

    if (!uitslagen.length && !base) {
      add(
        "MATCHMAKER_GEEN_UITSLAGEN_VOOR_KLASSECHECK",
        "LET_OP",
        "Geen uitslagenhistorie of nulmetingklasse gevonden. Klasse moet handmatig gecontroleerd worden.",
        "warning",
        "Geen uitslagenhistorie",
      );
    }

    if (base && requested) {
      const rec = recordInClass(uitslagen, base);
      const advies = promotedClass(base, rec.wins, rec.total);

      if (!classAllowed(advies, requested)) {
        add(
          "MATCHMAKER_KLASSE_TE_HOOG",
          "DISPENSATIE",
          `Vechter is opgegeven voor klasse ${requested}, maar op basis van uitslagen/nulmeting is het advies maximaal ${advies}. Record in ${base}: ${rec.wins} winst / ${rec.total} totaal.`,
          "warning",
          "Klasse te hoog",
        );
      }

      if (klasseIndex(requested) < klasseIndex(advies)) {
        add(
          "MATCHMAKER_KLASSE_TE_LAAG",
          "ACTIE",
          `Vechter is opgegeven voor klasse ${requested}, maar op basis van uitslagen/nulmeting hoort deze vechter minimaal rond klasse ${advies}. Record in ${base}: ${rec.wins} winst / ${rec.total} totaal.`,
          "warning",
          "Klasse te laag",
        );
      }
    }
  }

  if (opts?.includeOk && hits.length === 0) {
    add(
      "MATCHMAKER_FIGHTER_OK",
      "OK",
      "Geen bijzonderheden gevonden voor deze vechter.",
      "ok",
      "Vechtercontrole OK",
    );
  }

  return hits;
}

export const fighterRules = runMatchmakerFighterRules;
export default runMatchmakerFighterRules;