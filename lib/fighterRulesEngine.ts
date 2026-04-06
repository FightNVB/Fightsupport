// lib/fighterRulesEngine.ts

import dayjs from "dayjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type FighterRuleResultaat =
  | "OK"
  | "INFO"
  | "ACTIE"
  | "DISPENSATIE"
  | "AFKEUR"
  | "VERBOD";

export type FighterSeverity = "info" | "ok" | "warning" | "error";

export type FighterRuleHit = {
  matchmaking_id?: string | null;
  fighter_id?: string | null;
  inschrijving_id?: string | null;
  row_nr?: number | null;
  rule: string;
  rule_code: string;
  resultaat: FighterRuleResultaat;
  severity: FighterSeverity;
  boodschap: string;
};

type Klasse = "R" | "N" | "C" | "B" | "A";
const VOLGORDE: Klasse[] = ["R", "N", "C", "B", "A"];

/* ==========================================================
   helpers algemeen
   ========================================================== */

function asInt(v: any): number | null {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function unwrapUuid(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "[object Object]") return null;
  return s;
}

function norm(v: any): string {
  return String(v ?? "").trim();
}

function normLower(v: any): string {
  return String(v ?? "").trim().toLowerCase();
}

function parseIsoDateOnly(v: any): dayjs.Dayjs | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = dayjs(s);
  return d.isValid() ? d : null;
}

function parseEventDateFromCtx(ctx: any): dayjs.Dayjs | null {
  const candidates = [
    ctx?.event_date,
    ctx?.event_datum,
    ctx?.evenement_datum,
    ctx?.gala_date,
    ctx?.gala_datum,
    ctx?.datum,
    ctx?.match_date,
    ctx?.match_datum,
    ctx?.wedstrijd_datum,
    ctx?.created_at,
  ];

  for (const v of candidates) {
    const d = parseIsoDateOnly(v);
    if (d) return d;
  }

  return null;
}

function ageOnReferenceDate(dob: dayjs.Dayjs | null, ref: dayjs.Dayjs | null): number | null {
  if (!dob || !ref) return null;
  if (!dob.isValid() || !ref.isValid()) return null;
  return ref.diff(dob, "year");
}

function parseGender(v: any): "M" | "V" | null {
  const s = normLower(v);
  if (!s) return null;
  if (s === "m" || s.includes("man") || s === "male") return "M";
  if (s === "v" || s.includes("vrouw") || s === "female") return "V";
  return null;
}

/* ==========================================================
   helpers single fighter
   ========================================================== */

function getNaamMm(ctx: any) {
  return (
    ctx?.naam_mm ??
    ctx?.fighter_name_mm ??
    ctx?.naam_input ??
    ctx?.naam
  );
}

function getNaamFp(ctx: any) {
  return (
    ctx?.naam_fp ??
    ctx?.fp_naam ??
    ctx?.naam_scrape ??
    ctx?.fighter_name_fp ??
    ctx?.naam
  );
}

function getVa(ctx: any) {
  return norm(
    ctx?.va_nummer ??
      ctx?.va_nummer_mm ??
      ctx?.va ??
      ctx?.fp_va_nummer
  );
}

function getDob(ctx: any) {
  return (
    parseIsoDateOnly(ctx?.geboortedatum_fp) ??
    parseIsoDateOnly(ctx?.fp_geboortedatum) ??
    parseIsoDateOnly(ctx?.geboortedatum_input) ??
    parseIsoDateOnly(ctx?.geboortedatum) ??
    parseIsoDateOnly(ctx?.dob)
  );
}

function getAgeOnEvent(ctx: any): number | null {
  const dob = getDob(ctx);
  const eventDate = parseEventDateFromCtx(ctx);
  return ageOnReferenceDate(dob, eventDate);
}

function getGenderMm(ctx: any) {
  return (
    ctx?.geslacht_mm ??
    ctx?.geslacht_input ??
    ctx?.geslacht
  );
}

function getGenderFp(ctx: any) {
  return (
    ctx?.geslacht_fp ??
    ctx?.fp_geslacht ??
    ctx?.geslacht_scrape ??
    ctx?.geslacht
  );
}

function getLicentie(ctx: any) {
  return ctx?.licentie ?? ctx?.fp_licentie;
}

function getStartverbod(ctx: any) {
  return ctx?.heeft_startverbod ?? ctx?.startverbod ?? ctx?.fp_startverbod;
}

function getKeurmerkValue(ctx: any) {
  return ctx?.keurmerk ?? ctx?.sportschool_keurmerk ?? ctx?.keurmerk_geldig;
}

function getKeurmerkReason(ctx: any) {
  return norm(ctx?.keurmerk_reden ?? ctx?.sportschool_keurmerk_reden);
}

function getMmaLevelRaw(ctx: any) {
  return (
    ctx?.mma_current_klasse ??
    ctx?.mma_klasse ??
    ctx?.klasse_mma ??
    ctx?.fp_mma_klasse
  );
}

function getBoutKlasse(ctx: any) {
  return ctx?.klasse_mm ?? ctx?.klasse ?? ctx?.voorgestelde_klasse;
}

function getDiscipline(ctx: any) {
  return ctx?.discipline;
}

function getSubDiscipline(ctx: any) {
  return ctx?.sub_discipline;
}

/* ==========================================================
   naamcheck tolerant
   ========================================================== */

function normNameSoft(v: any): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const n = b.length;
  const dp = new Array(n + 1);

  for (let j = 0; j <= n; j++) dp[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;

    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }

  return dp[n];
}

function tokenSimilarity(a: string, b: string): number {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen ? 1 - dist / maxLen : 1;
}

function splitTokens(v: any): string[] {
  const s = normNameSoft(v);
  if (!s) return [];

  return s
    .split(" ")
    .map((x) => x.trim())
    .filter((x) => x.length >= 2)
    .filter((x) => !["el", "al", "de", "van"].includes(x));
}

function nameSimilar(aRaw: any, bRaw: any): boolean {
  const aTokens = splitTokens(aRaw);
  const bTokens = splitTokens(bRaw);

  if (!aTokens.length || !bTokens.length) return true;

  const aLast = aTokens[aTokens.length - 1];
  const bLast = bTokens[bTokens.length - 1];

  if (tokenSimilarity(aLast, bLast) < 0.78) return false;

  const aFirsts = aTokens.slice(0, -1);
  const bFirsts = bTokens.slice(0, -1);

  if (!aFirsts.length || !bFirsts.length) return true;

  let bestFirst = 0;
  for (const af of aFirsts) {
    for (const bf of bFirsts) {
      bestFirst = Math.max(bestFirst, tokenSimilarity(af, bf));
    }
  }

  return bestFirst >= 0.72;
}

/* ==========================================================
   klasse helpers KB/MT
   ========================================================== */

function idxKlasse(k: Klasse | null): number {
  return k ? VOLGORDE.indexOf(k) : -1;
}

function asKlasseLetter(v: any): Klasse | null {
  const s = String(v ?? "").trim().toUpperCase();
  return (VOLGORDE as string[]).includes(s) ? (s as Klasse) : null;
}

function maxKlasse(a: Klasse | null, b: Klasse | null): Klasse | null {
  if (!a) return b;
  if (!b) return a;
  return idxKlasse(a) >= idxKlasse(b) ? a : b;
}

function parseKbMmKlasseToLetter(mm: any): Klasse | null {
  const raw = String(mm ?? "").trim();
  if (!raw) return null;

  const up = raw.toUpperCase();

  if (
    up.includes("JEUGD") ||
    up.includes("YOUTH") ||
    up.includes("NIEUWELING") ||
    up.includes("NEWCOMER") ||
    up.startsWith("J") ||
    up.includes("J-KLASSE")
  ) {
    return null;
  }

  const m1 = up.match(/\b(R|N|C|B|A)\b/);
  if (m1) return m1[1] as Klasse;

  const m2 = up.match(/^(R|N|C|B|A)[- ]/);
  if (m2) return m2[1] as Klasse;

  const m3 = up.match(/\b(R|N|C|B|A)\b\s*[- ]?\s*(KLASSE|CLASS)\b/);
  if (m3) return m3[1] as Klasse;

  const m4 = up.match(/\b(KLASSE|CLASS)\b\s*[- ]?\s*\b(R|N|C|B|A)\b/);
  if (m4) return m4[2] as Klasse;

  return null;
}

function parseOutcome(uitslag: any): "WIN" | "LOSS" | "DRAW" | "DEMO" | "OTHER" {
  const s = String(uitslag ?? "").toLowerCase();
  if (!s) return "OTHER";
  if (s.includes("demo") || s.includes("demonstr")) return "DEMO";
  if (s.includes("wint") || s.includes("win")) return "WIN";
  if (s.includes("verliest") || s.includes("verlies") || s.includes("lost")) return "LOSS";
  if (s.includes("onbeslist") || s.includes("draw") || s.includes("gelijk")) return "DRAW";
  return "OTHER";
}

function isRelevantStandingDiscipline(d: any): boolean {
  const s = String(d ?? "").toLowerCase();
  if (!s) return false;
  if (s.includes("kick")) return true;
  if (s.includes("muay")) return true;
  if (s.includes("thai")) return true;
  return false;
}

function isKickboksMuayThai(ctx: any): boolean {
  const d = String(getDiscipline(ctx) ?? "").toUpperCase();
  const sd = String(getSubDiscipline(ctx) ?? "").toUpperCase();
  const s = `${d} ${sd}`;

  return (
    s.includes("KICK") ||
    s.includes("K1") ||
    s.includes("MUAY") ||
    s.includes("THAI") ||
    s.includes("MT")
  );
}

type UitslagRow = {
  va_nummer: string | number | null;
  discipline: string | null;
  klasse: string | null;
  uitslag: string | null;
};

async function fetchUitslagenByVa(opts: {
  matchmaking_id: string;
  controle_run_id?: string | null;
  va: string;
}): Promise<UitslagRow[]> {
  const { matchmaking_id, controle_run_id, va } = opts;
  if (!va) return [];

  let query = supabaseAdmin
    .from("uitslagen_raw")
    .select("va_nummer, discipline, klasse, uitslag")
    .eq("matchmaking_id", matchmaking_id)
    .eq("va_nummer", va);

  if (controle_run_id) {
    query = query.eq("controle_run_id", controle_run_id);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as UitslagRow[];
}

function hoogsteKlasseUitUitslagen(rows: UitslagRow[]): Klasse | null {
  let best: Klasse | null = null;

  for (const r of rows ?? []) {
    if (!isRelevantStandingDiscipline(r?.discipline)) continue;
    const k = asKlasseLetter(r?.klasse);
    if (!k) continue;
    best = maxKlasse(best, k);
  }

  return best;
}

function recordInKlasse(rows: UitslagRow[], k: Klasse): { wins: number; total: number } {
  let wins = 0;
  let total = 0;

  for (const r of rows ?? []) {
    if (!isRelevantStandingDiscipline(r?.discipline)) continue;
    const rk = asKlasseLetter(r?.klasse);
    if (rk !== k) continue;

    const o = parseOutcome(r?.uitslag);
    if (o === "DEMO") continue;

    total += 1;
    if (o === "WIN") wins += 1;
  }

  return { wins, total };
}

function promoteFrom(k: Klasse, wins: number, total: number): Klasse {
  if (k === "R") {
    if (wins >= 2 || total >= 3) return "N";
    return "R";
  }
  if (k === "N") {
    if (wins >= 3 || total >= 6) return "C";
    return "N";
  }
  if (k === "C") {
    if (wins >= 6 || total >= 8) return "B";
    return "C";
  }
  if (k === "B") {
    if (wins >= 8 || total >= 10) return "A";
    return "B";
  }
  return "A";
}

function canFightAdultKbMtBoutClass(fighterMax: Klasse | null, boutK: Klasse | null): boolean {
  if (!fighterMax || !boutK) return true;
  if (idxKlasse(boutK) <= idxKlasse(fighterMax)) return true;
  if (fighterMax === "R" && boutK === "N") return true;
  return false;
}

/* ==========================================================
   mma helpers
   ========================================================== */

type MmaLevel = "AMATEUR" | "PRO";

function parseMmaLevel(v: any): MmaLevel | null {
  const s = String(v ?? "").toUpperCase().trim();
  if (!s) return null;
  if (s === "P" || s === "PRO" || s.includes("PROFESSIONAL") || s.includes("PROF")) return "PRO";
  if (s === "AMA" || s === "AMATEUR" || s.includes("AMATEUR")) return "AMATEUR";
  return null;
}

/* ==========================================================
   hoofdengine
   ========================================================== */

export async function fighterRulesEngine(opts: {
  ctx: any;
  matchmaking_id: string;
  controle_run_id?: string | null;
}) {
  const { ctx, matchmaking_id, controle_run_id = null } = opts;

  const hits: FighterRuleHit[] = [];
  const pushHit = (h: FighterRuleHit) => hits.push(h);

  const fighter_id = unwrapUuid(ctx?.fighter_id);
  const inschrijving_id = unwrapUuid(ctx?.inschrijving_id ?? ctx?.id);
  const row_nr = asInt(ctx?.row_nr);

  const va = getVa(ctx);
  const naamMm = getNaamMm(ctx);
  const naamFp = getNaamFp(ctx);
  const dob = getDob(ctx);
  const eventDate = parseEventDateFromCtx(ctx);
  const ageOnEvent = getAgeOnEvent(ctx);
  const genderMm = parseGender(getGenderMm(ctx));
  const genderFp = parseGender(getGenderFp(ctx));
  const licentie = normLower(getLicentie(ctx));
  const startverbod = normLower(getStartverbod(ctx));
  const keurmerk = getKeurmerkValue(ctx);
  const keurmerkReason = getKeurmerkReason(ctx);

  const common = {
    matchmaking_id,
    fighter_id,
    inschrijving_id,
    row_nr,
  };

  // fightpaspoort / VA
  if (!va) {
    pushHit({
      ...common,
      rule: "Fightpaspoort nummer ontbreekt",
      rule_code: "FIGHTPASPOORT_ONTBREEKT",
      resultaat: "AFKEUR",
      severity: "error",
      boodschap:
        "Geen Fightpaspoort nummer gevonden. Zonder Fightpaspoort nummer is er geen deelname mogelijk.",
    });
  }

  // naamcontrole
  if (!naamMm || !naamFp) {
    pushHit({
      ...common,
      rule: "Naamcontrole niet volledig",
      rule_code: "NAAMCHECK_GEEN_VOLLEDIGE_DATA",
      resultaat: "ACTIE",
      severity: "warning",
      boodschap:
        "Naam uit matchmaking en/of Fightpassport ontbreekt. Naamcontrole kon niet volledig worden uitgevoerd.",
    });
  } else if (!nameSimilar(naamMm, naamFp)) {
    pushHit({
      ...common,
      rule: "Naam klopt niet met Fightpassport",
      rule_code: "NAAM_KLOPT_NIET_MET_FIGHTPASSPORT",
      resultaat: "ACTIE",
      severity: "warning",
      boodschap: `Naam opgave ("${naamMm}") wijkt af van Fightpassport ("${naamFp}"). Controleer VA/vechter.`,
    });
  }

  // geslachtcheck
  if (!genderMm || !genderFp) {
    pushHit({
      ...common,
      rule: "Geslacht niet volledig controleerbaar",
      rule_code: "GESLACHTCHECK_GEEN_VOLLEDIGE_DATA",
      resultaat: "ACTIE",
      severity: "warning",
      boodschap:
        "Geslacht uit opgave en/of Fightpassport ontbreekt. Controle kon niet volledig worden uitgevoerd.",
    });
  } else if (genderMm !== genderFp) {
    pushHit({
      ...common,
      rule: "Geslacht wijkt af van opgave",
      rule_code: "GESLACHT_MISMATCH",
      resultaat: "ACTIE",
      severity: "warning",
      boodschap: `Geslacht opgave is ${genderMm === "M" ? "man" : "vrouw"} maar Fightpassport geeft ${
        genderFp === "M" ? "man" : "vrouw"
      } aan. Controleer invoer en vechtergegevens.`,
    });
  }

  // geboortedatum / event datum
  if (!dob) {
    pushHit({
      ...common,
      rule: "Geboortedatum ontbreekt",
      rule_code: "GEBOORTEDATUM_ONTBREEKT",
      resultaat: "ACTIE",
      severity: "warning",
      boodschap:
        "Geboortedatum ontbreekt. Leeftijdsafhankelijke controles konden niet volledig worden uitgevoerd.",
    });
  }

  if (!eventDate) {
    pushHit({
      ...common,
      rule: "Eventdatum ontbreekt",
      rule_code: "EVENTDATUM_ONTBREEKT",
      resultaat: "ACTIE",
      severity: "warning",
      boodschap:
        "Eventdatum ontbreekt. Leeftijd op eventdatum kon niet worden bepaald.",
    });
  }

  // 40+ sportmedisch
  if (typeof ageOnEvent === "number" && ageOnEvent >= 40) {
    pushHit({
      ...common,
      rule: "Sportmedische keuring / advies 40+",
      rule_code: "SPORTMEDISCH_ADVIES_40PLUS",
      resultaat: "ACTIE",
      severity: "warning",
      boodschap: `Vechter is op eventdatum ${ageOnEvent} jaar. Vanaf 40 jaar is sportmedisch advies / keuring van een sportarts nodig.`,
    });
  }

  // licentie
  {
    const licentieOk =
      licentie === "ja" ||
      licentie === "j" ||
      licentie === "true" ||
      licentie === "1" ||
      licentie === "geldig";

    if (!licentieOk) {
      pushHit({
        ...common,
        rule: "Licentie ontbreekt/ongeldig",
        rule_code: "LICENTIE_ONGELDIG",
        resultaat: "AFKEUR",
        severity: "error",
        boodschap: `Geen geldige licentie gevonden (waarde: "${norm(getLicentie(ctx)) || "leeg"}").`,
      });
    }
  }

  // startverbod
  {
    const heeftStartverbod =
      startverbod === "ja" || startverbod === "true" || startverbod === "1";

    if (heeftStartverbod) {
      pushHit({
        ...common,
        rule: "Startverbod",
        rule_code: "STARTVERBOD",
        resultaat: "VERBOD",
        severity: "error",
        boodschap: "Deze vechter heeft een startverbod en mag niet deelnemen.",
      });
    }
  }

  // keurmerk / belgie
  {
    if (keurmerkReason.startsWith("⚠️ België")) {
      pushHit({
        ...common,
        rule: "Belgische sportschool",
        rule_code: "KEURMERK_BE_INFO",
        resultaat: "INFO",
        severity: "info",
        boodschap: keurmerkReason,
      });
    }

    if (keurmerk == null) {
      pushHit({
        ...common,
        rule: "Sportschool niet gevonden",
        rule_code: "SPORTSCHOOL_NIET_GEVONDEN",
        resultaat: "ACTIE",
        severity: "warning",
        boodschap: keurmerkReason || "Gym match onzeker. Controleer sportschool/keurmerk handmatig.",
      });
    } else if (keurmerk === false) {
      pushHit({
        ...common,
        rule: "Keurmerk ongeldig",
        rule_code: "KEURMERK_ONGELDIG",
        resultaat: "AFKEUR",
        severity: "error",
        boodschap: keurmerkReason || "Geen geldig keurmerk gevonden (ontbreekt of verlopen).",
      });
    }
  }

  // klasse-volwassenen KB/MT
  {
    const volwassen = typeof ageOnEvent === "number" && ageOnEvent >= 18;
    const kbmt = isKickboksMuayThai(ctx);

    if (volwassen && kbmt) {
      const boutK = parseKbMmKlasseToLetter(getBoutKlasse(ctx));

      if (!boutK) {
        pushHit({
          ...common,
          rule: "Boutklasse niet duidelijk",
          rule_code: "BOUTKLASSE_ONDUIDELIJK",
          resultaat: "ACTIE",
          severity: "warning",
          boodschap:
            "De klasse waarin de matchmaker deze vechter wil plaatsen kon niet eenduidig worden bepaald.",
        });
      } else if (!va) {
        pushHit({
          ...common,
          rule: "Klassecheck niet mogelijk zonder VA",
          rule_code: "KLASSECHECK_GEEN_VA",
          resultaat: "ACTIE",
          severity: "warning",
          boodschap:
            "Zonder Fightpaspoort nummer kan de klassecheck op basis van uitslagen niet worden uitgevoerd.",
        });
      } else {
        const rows = await fetchUitslagenByVa({
          matchmaking_id,
          controle_run_id,
          va,
        });

        const histKlasse = hoogsteKlasseUitUitslagen(rows);
        const baseK: Klasse = histKlasse ?? "N";
        const rec = recordInKlasse(rows, baseK);
        const adviesK = promoteFrom(baseK, rec.wins, rec.total);
        const ok = canFightAdultKbMtBoutClass(adviesK, boutK);

        if (!rows.length) {
          pushHit({
            ...common,
            rule: "Geen uitslagenhistorie gevonden",
            rule_code: "GEEN_UITSLAGENHISTORIE",
            resultaat: "ACTIE",
            severity: "warning",
            boodschap:
              "Geen uitslagenhistorie gevonden voor deze vechter. Klasse-advies kon slechts beperkt worden bepaald.",
          });
        }

        if (!ok) {
          pushHit({
            ...common,
            rule: "Verkeerde klasse op basis van uitslagen",
            rule_code: "VOLWASSEN_VERKEERDE_KLASSE",
            resultaat: "DISPENSATIE",
            severity: "warning",
            boodschap: `Matchmaker wil vechter in klasse ${boutK} plaatsen, maar op basis van uitslagen ligt het advies op maximaal ${adviesK}. Let op: dispensatie / extra controle nodig.`,
          });
        }
      }
    }
  }

  // mma level info
  {
    const raw = getMmaLevelRaw(ctx);
    const mmaLevel = parseMmaLevel(raw);

    if (raw && !mmaLevel) {
      pushHit({
        ...common,
        rule: "MMA niveau onduidelijk",
        rule_code: "MMA_LEVEL_ONDUIDELIJK",
        resultaat: "ACTIE",
        severity: "warning",
        boodschap: `MMA niveau kon niet goed worden geïnterpreteerd uit waarde "${String(raw)}".`,
      });
    }
  }

  return hits;
}