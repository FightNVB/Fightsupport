// lib/matchmaker/rulesEngine.ts

import dayjs from "dayjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { saveControleResultaten } from "@/lib/matchmaker/saveControleResultaten";

type RuleResultaat = "OK" | "INFO" | "ACTIE" | "DISPENSATIE" | "AFKEUR" | "VERBOD";
type Severity = "info" | "ok" | "warning" | "error";
type Klasse = "R" | "N" | "C" | "B" | "A";
type MmaLevel = "AMATEUR" | "PRO";

type RuleHit = {
  partij_nr: number | null;
  bout_id: string | null;
  rule: string;
  rule_code: string;
  resultaat: RuleResultaat;
  severity: Severity;
  boodschap: string;
  matchmaking_id?: string | null;
  hoek?: "rood" | "blauw" | null;
  toernooi_code?: string | null;
  fighter_id?: string | null;
  va_nummer?: string | null;
};

type UitslagRow = {
  va_nummer: string | number | null;
  discipline: string | null;
  klasse: string | null;
  uitslag: string | null;
};

const VOLGORDE: Klasse[] = ["R", "N", "C", "B", "A"];

const MMA_JEUGD_AGE_BANDS: Array<{ min: number; max: number; label: string }> = [
  { min: 0, max: 11, label: "TE JONG" },
  { min: 12, max: 13, label: "CAT-13" },
  { min: 14, max: 15, label: "CAT-15" },
  { min: 16, max: 17, label: "CAT-17" },
];

function asInt(v: any): number | null {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function toInt(value: any): number {
  if (value === null || value === undefined) return 0;
  const n = parseInt(String(value), 10);
  return isNaN(n) ? 0 : n;
}

function unwrapUuid(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "[object Object]") return null;
  return s;
}

function normLower(v: any): string {
  return String(v ?? "").toLowerCase().trim();
}

function normalizeKlasseText(v: any): string {
  return String(v ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function ageOnEventFromCtx(ctx: any, hoek: "rood" | "blauw"): number | null {
  const dob =
    hoek === "rood"
      ? parseIsoDateOnly(ctx?.rood_geboortedatum_fp ?? ctx?.rood_geboortedatum)
      : parseIsoDateOnly(ctx?.blauw_geboortedatum_fp ?? ctx?.blauw_geboortedatum);

  const eventDate = parseEventDateFromCtx(ctx);
  return ageOnReferenceDate(dob, eventDate);
}

function isJeugdFromCtx(ctx: any): boolean {
  const r = ageOnEventFromCtx(ctx, "rood");
  const b = ageOnEventFromCtx(ctx, "blauw");

  if ((typeof r === "number" && r < 18) || (typeof b === "number" && b < 18)) {
    return true;
  }

  const k = String(ctx?.klasse_mm ?? "").toUpperCase().replace(/\s+/g, " ").trim();
  if (k.includes("J+")) return true;
  if (k.includes("JEUGD")) return true;
  if (k === "J") return true;
  if (k.startsWith("J ")) return true;
  if (k.startsWith("J-")) return true;

  return false;
}

function isVolwassenePair(ctx: any): boolean {
  const r = ageOnEventFromCtx(ctx, "rood");
  const b = ageOnEventFromCtx(ctx, "blauw");
  return typeof r === "number" && r >= 18 && typeof b === "number" && b >= 18;
}

function minAgeEvent(ctx: any): number | null {
  const r = ageOnEventFromCtx(ctx, "rood");
  const b = ageOnEventFromCtx(ctx, "blauw");
  if (typeof r === "number" && typeof b === "number") return Math.min(r, b);
  if (typeof r === "number") return r;
  if (typeof b === "number") return b;
  return null;
}

function isMmaBout(ctx: any): boolean {
  const d = String(ctx?.discipline ?? "").toUpperCase();
  const sd = String(ctx?.sub_discipline ?? "").toUpperCase();
  const km = String(ctx?.klasse_mm ?? "").toUpperCase();
  const mmaToken = km === "P" || km === "PRO" || km === "AMA" || km === "AMATEUR";

  return d.includes("MMA") || sd.includes("MMA") || km.includes("MMA") || mmaToken;
}


function isExactBoksenText(v: any): boolean {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase() === "BOKSEN";
}

function isPureBoksenZonderLicentieKeurmerk(ctx: any): boolean {
  // Bewust extreem strikt: alleen exact discipline=Boksen én klasse=Boksen.
  // Alleen dán zijn Fightpaspoort/VA-nummer, licentie en keurmerk niet van toepassing.
  // Kickboksen, thaiboksen, jeugd boksen, dames boksen, K1-boksen, enz. vallen hier NIET onder.
  return isExactBoksenText(ctx?.discipline) && isExactBoksenText(ctx?.klasse_mm ?? ctx?.klasse);
}

function isKickboksMuayThai(ctx: any): boolean {
  const d = String(ctx?.discipline ?? "").toUpperCase();
  const sd = String(ctx?.sub_discipline ?? "").toUpperCase();
  const s = `${d} ${sd}`;

  return (
    s.includes("KICK") ||
    s.includes("K1") ||
    s.includes("MUAY") ||
    s.includes("THAI") ||
    s.includes("MT")
  );
}

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
    .filter((x) => x !== "el" && x !== "al" && x !== "de" && x !== "van");
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

function parseGender(v: any): "M" | "V" | null {
  const s = normLower(v);
  if (!s) return null;
  if (s === "m" || s.includes("man")) return "M";
  if (s === "v" || s.includes("vrouw")) return "V";
  return null;
}

function leeftijdsVerschilJeugd(dobR: dayjs.Dayjs | null, dobB: dayjs.Dayjs | null) {
  if (!dobR || !dobB) {
    return {
      type: "ACTIE" as const,
      diffDaysTotal: null as number | null,
      diffMonths: null as number | null,
      diffDaysRemainder: null as number | null,
    };
  }

  const older = dobR.isBefore(dobB) ? dobR : dobB;
  const younger = dobR.isBefore(dobB) ? dobB : dobB.isBefore(dobR) ? dobR : dobB;

  const diffMonths = Math.abs(younger.diff(older, "month"));
  const afterMonths = older.add(diffMonths, "month");
  const diffDaysRemainder = Math.abs(younger.diff(afterMonths, "day"));
  const diffDaysTotal = Math.abs(younger.diff(older, "day"));

  const dispThreshold = older.add(18, "month").add(1, "day");
  const verbodThreshold = older.add(24, "month");

  const isVerbod =
    younger.isSame(verbodThreshold, "day") || younger.isAfter(verbodThreshold, "day");
  const isDisp = younger.isAfter(dispThreshold, "day") && !isVerbod;

  if (isVerbod) {
    return {
      type: "VERBOD" as const,
      diffDaysTotal,
      diffMonths,
      diffDaysRemainder,
    };
  }

  if (isDisp) {
    return {
      type: "DISPENSATIE" as const,
      diffDaysTotal,
      diffMonths,
      diffDaysRemainder,
    };
  }

  return {
    type: "OK" as const,
    diffDaysTotal,
    diffMonths,
    diffDaysRemainder,
  };
}

function mmaJeugdAgeBand(age: number | null) {
  if (typeof age !== "number") return null;
  for (const b of MMA_JEUGD_AGE_BANDS) {
    if (age >= b.min && age <= b.max) return b;
  }
  return null;
}

function getCurrentTotalsAll(uitslagenPerDiscipline: any): any | null {
  if (!uitslagenPerDiscipline) return null;

  const obj =
    typeof uitslagenPerDiscipline === "string"
      ? (() => {
          try {
            return JSON.parse(uitslagenPerDiscipline);
          } catch {
            return null;
          }
        })()
      : uitslagenPerDiscipline;

  return obj?.current?._all ?? null;
}

function demoToPartijEquivalent(demo: number): number {
  return Math.floor(Math.max(0, demo) / 3);
}

function effectiveFromTotals(t: any): number | null {
  if (!t) return null;

  const total = Number(t.total ?? 0);
  const demo = Number(t.demo ?? 0);

  if (!Number.isFinite(total) || !Number.isFinite(demo)) return null;
  return Math.max(0, (total - demo) + demoToPartijEquivalent(demo));
}

function idxKlasse(k: Klasse | null): number {
  return k ? VOLGORDE.indexOf(k) : -1;
}

function maxKlasse(a: Klasse | null, b: Klasse | null): Klasse | null {
  if (!a) return b;
  if (!b) return a;
  return idxKlasse(a) >= idxKlasse(b) ? a : b;
}

function parseKbMmKlasseToLetter(mm: any): Klasse | null {
  const raw = String(mm ?? "").trim();
  if (!raw) return null;

  const up = normalizeKlasseText(raw);

  // Amateur/AMA is een MMA-klasse en nooit A-klasse in KB/MT-resultaten.
  // FightPassport kan alleen "Amateur" of "AMA" in de kolom klasse zetten,
  // dus sluit die waarden expliciet uit voordat losse klasseletters worden gelezen.
  if (
    up.includes("MMA") ||
    up === "AMA" ||
    up === "AMATEUR" ||
    up === "MMA AMA" ||
    up === "MMA AMATEUR" ||
    up.includes("AMATEUR")
  ) {
    return null;
  }

  // Belangrijk:
  // - "Jeugd/Youth" zelf is géén N-klasse.
  // - Maar FightPassport/nulmeting kan samengestelde tekst geven zoals
  //   "Jeugd/Youth • Nieuweling/Newcomer".
  //   Voor volwassen controles moeten we dan het jeugddeel negeren en
  //   de volwassen klasse "Nieuweling/Newcomer" gebruiken.
  if (up.includes("VETERAAN") || up.includes("VETERAN")) {
    return "N";
  }

  if (up.includes("NIEUWELING") || up.includes("NEWCOMER")) {
    return "N";
  }

  if (
    up === "J" ||
    up === "J+" ||
    up.includes("JEUGD") ||
    up.includes("YOUTH") ||
    up.includes("J KLASSE") ||
    up.includes("J CLASS")
  ) {
    return null;
  }

  if (up.includes("R KLASSE") || up.includes("R CLASS")) return "R";
  if (up.includes("N KLASSE") || up.includes("N CLASS")) return "N";
  if (up.includes("C KLASSE") || up.includes("C CLASS")) return "C";
  if (up.includes("B KLASSE") || up.includes("B CLASS")) return "B";
  if (up.includes("A KLASSE") || up.includes("A CLASS")) return "A";

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

function asKlasseLetter(v: any): Klasse | null {
  return parseKbMmKlasseToLetter(v);
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
  if (s.includes("k1") || s.includes("k-1") || s.includes("k 1")) return true;
  if (s.includes("muay")) return true;
  if (s.includes("thai")) return true;
  return false;
}

function hoogsteKlasseUitUitslagen(rows: UitslagRow[]): Klasse | null {
  let best: Klasse | null = null;

  for (const r of rows ?? []) {
    if (!isRelevantStandingDiscipline(r?.discipline)) continue;

    // Jeugd/Youth mag nooit als volwassen N/C/B/A historie meetellen.
    // Vanaf 18 jaar is het startpunt N, maar jeugdresultaten promoveren niet automatisch naar C.
    if (isJeugdKlasseText(r?.klasse)) continue;

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

    // Jeugd/Youth-resultaten mogen geen volwassen N-record vullen, ook niet als
    // de tekst "Jeugd/Youth • Nieuweling/Newcomer" bevat.
    if (isJeugdKlasseText(r?.klasse)) continue;

    const rk = asKlasseLetter(r?.klasse);
    if (rk !== k) continue;

    const o = parseOutcome(r?.uitslag);
    if (o === "DEMO") continue;

    total += 1;
    if (o === "WIN") wins += 1;
  }

  return { wins, total };
}

function getRelevantStandingNonDemoRows(rows: UitslagRow[]): UitslagRow[] {
  return (rows ?? []).filter((r) => {
    if (!isRelevantStandingDiscipline(r?.discipline)) return false;
    return parseOutcome(r?.uitslag) !== "DEMO";
  });
}

function getRKlasseStats(rows: UitslagRow[]) {
  const relevant = getRelevantStandingNonDemoRows(rows);

  let rTotal = 0;
  let rWins = 0;
  let hasJeugd = false;
  let hasOutsideR = false;

  for (const r of relevant) {
    const klasseText = r?.klasse;
    const letter = asKlasseLetter(klasseText);
    const outcome = parseOutcome(r?.uitslag);

    if (isJeugdKlasseText(klasseText)) {
      hasJeugd = true;
      continue;
    }

    if (letter === "R") {
      rTotal += 1;
      if (outcome === "WIN") rWins += 1;
      continue;
    }

    if (letter === "N" || letter === "C" || letter === "B" || letter === "A") {
      hasOutsideR = true;
    }
  }

  return {
    relevantTotal: relevant.length,
    hasAnyExperience: relevant.length > 0,
    rTotal,
    rWins,
    hasJeugd,
    hasOutsideR,
  };
}

function getJeugdExperienceStats(rows: UitslagRow[]): { total: number; wins: number } {
  let total = 0;
  let wins = 0;

  for (const r of rows ?? []) {
    if (!isRelevantStandingDiscipline(r?.discipline)) continue;
    if (!isJeugdKlasseText(r?.klasse)) continue;

    const outcome = parseOutcome(r?.uitslag);
    if (outcome === "DEMO") continue;

    total += 1;
    if (outcome === "WIN") wins += 1;
  }

  return { total, wins };
}

function getScrapedTotalWedstrijden(ctx: any, hoek: "rood" | "blauw"): number | null {
  const raw = hoek === "rood" ? ctx?.rood_totaal_wedstrijden_scrape : ctx?.blauw_totaal_wedstrijden_scrape;
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(String(raw).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function isJeugdTalentstatusKlasse(v: any): boolean {
  const s = normalizeKlasseText(v).replace(/\s+/g, "");
  return s === "J+" || s.includes("J+") || s.includes("TALENTSTATUS");
}

function hasTalentstatusInOpmerking(v: any): boolean {
  return String(v ?? "").toLowerCase().includes("talentstatus");
}

function getTalentstatusInfo(ctx: any): {
  heeftTalentstatus: boolean;
  roodHeeft: boolean;
  blauwHeeft: boolean;
} {
  const roodOpmerking = ctx?.rood_nulmeting_opmerking;
  const blauwOpmerking = ctx?.blauw_nulmeting_opmerking;

  const roodHeeft = hasTalentstatusInOpmerking(roodOpmerking);
  const blauwHeeft = hasTalentstatusInOpmerking(blauwOpmerking);

  return {
    heeftTalentstatus: roodHeeft || blauwHeeft,
    roodHeeft,
    blauwHeeft,
  };
}

function hasDopingCertificaatInOpmerking(v: any): boolean {
  const s = String(v ?? "").toLowerCase();
  return (
    s.includes("[doping_certificaat=behaald]") ||
    s.includes("doping certificaat behaald") ||
    s.includes("dopingcertificaat behaald")
  );
}

function getDopingCertificaatInfo(ctx: any): {
  roodHeeft: boolean;
  blauwHeeft: boolean;
} {
  return {
    roodHeeft: hasDopingCertificaatInOpmerking(ctx?.rood_nulmeting_opmerking),
    blauwHeeft: hasDopingCertificaatInOpmerking(ctx?.blauw_nulmeting_opmerking),
  };
}

function isDopingCertificaatVerplichtVoorPartij(ctx: any): boolean {
  if (isMmaBout(ctx)) {
    return parseMmaLevel(ctx?.klasse_mm ?? ctx?.klasse) === "PRO";
  }

  const klasse = parseKbMmKlasseToLetter(ctx?.klasse_mm ?? ctx?.klasse);
  return klasse === "A" || klasse === "B";
}

function fallbackAdultKbMtKlasseFromNulmeting(ctx: any, hoek: "rood" | "blauw"): Klasse | null {
  const primary = hoek === "rood" ? ctx?.rood_nulmeting_klasse : ctx?.blauw_nulmeting_klasse;
  const secondaryCandidates =
    hoek === "rood"
      ? [
          ctx?.rood_klasse_nulmeting,
          ctx?.rood_fp_klasse,
          ctx?.rood_current_klasse,
        ]
      : [
          ctx?.blauw_klasse_nulmeting,
          ctx?.blauw_fp_klasse,
          ctx?.blauw_current_klasse,
        ];

  const primaryParsed = parseKbMmKlasseToLetter(primary);
  if (primaryParsed) return primaryParsed;

  for (const candidate of secondaryCandidates) {
    const parsed = parseKbMmKlasseToLetter(candidate);
    if (parsed) return parsed;
  }

  return null;
}

function getAdultKbMtBaseKlasse(ctx: any, hoek: "rood" | "blauw", rows: UitslagRow[]): Klasse {
  // Uitslagen zijn leidend. Nulmeting is alleen fallback als er geen
  // bruikbare volwassen KICKBOKSEN/MUAY THAI uitslagen zijn.
  const historyKlasse = hoogsteKlasseUitUitslagen(rows);
  if (historyKlasse) return historyKlasse;

  const jeugdStats = getJeugdExperienceStats(rows);

  // Zelfde uitgangspunt als matchEngine en fighterRules:
  // alleen jeugdpartijen geven bij de overgang naar senioren niet automatisch
  // een volwassen C/B/A-klasse. Zonder aantoonbare hoofdcontact-doorstroom
  // start de reguliere volwassen controle daarom in N.
  if (jeugdStats.total > 0) return "N";

  const nulmetingKlasse = fallbackAdultKbMtKlasseFromNulmeting(ctx, hoek);
  return nulmetingKlasse ?? "N";
}

async function fetchUitslagenByVa(opts: {
  matchmaking_id: string;
  controle_run_id: string;
  vaList: string[];
}): Promise<Map<string, UitslagRow[]>> {
  const { vaList } = opts;
  const map = new Map<string, UitslagRow[]>();
  if (!vaList.length) return map;

  const chunkSize = 500;

  for (let i = 0; i < vaList.length; i += chunkSize) {
    const chunk = vaList.slice(i, i + chunkSize);
    const numericChunk = chunk
      .map((va) => Number(va))
      .filter((va) => Number.isFinite(va));

    const { data, error } = await supabaseAdmin
      .from("fightpassport_results")
      .select("va_nummer, discipline, klasse, uitslag, datum, evenement, tegenstander")
      .in("va_nummer", numericChunk.length > 0 ? numericChunk : chunk)
      .order("datum", { ascending: false });

    if (error) throw error;

    const seen = new Set<string>();

    for (const r of (data ?? []) as any[]) {
      const va = String(r?.va_nummer ?? "").trim().replace(/^0+/, "");
      if (!va) continue;

      // Centrale resultaten kunnen door imports een dubbel snapshot bevatten.
      // Eén echte partij mag de klasse/promotietelling maar één keer beïnvloeden.
      const dedupeKey = [
        va,
        String(r?.datum ?? "").trim(),
        String(r?.evenement ?? "").trim().toLowerCase(),
        String(r?.tegenstander ?? "").trim().toLowerCase(),
        String(r?.discipline ?? "").trim().toLowerCase(),
        String(r?.klasse ?? "").trim().toUpperCase(),
        String(r?.uitslag ?? "").trim().toLowerCase(),
      ].join("||");

      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      if (!map.has(va)) map.set(va, []);
      map.get(va)!.push({
        va_nummer: r?.va_nummer ?? null,
        discipline: r?.discipline ?? null,
        klasse: r?.klasse ?? null,
        uitslag: r?.uitslag ?? null,
      });
    }
  }

  return map;
}

function getCtxVa(ctx: any, hoek: "rood" | "blauw"): string {
  const candidates =
    hoek === "rood"
      ? [ctx?.rood_va_mm, ctx?.rood_va_fp, ctx?.rood_va_scrape, ctx?.va_rood, ctx?.va_rood_mm]
      : [ctx?.blauw_va_mm, ctx?.blauw_va_fp, ctx?.blauw_va_scrape, ctx?.va_blauw, ctx?.va_blauw_mm];

  for (const value of candidates) {
    const va = String(value ?? "").trim().replace(/\D+/g, "").replace(/^0+/, "");
    if (va) return va;
  }

  return "";
}

async function fetchFightPassportFightersByVa(vaList: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  if (!vaList.length) return map;

  const chunkSize = 500;

  for (let i = 0; i < vaList.length; i += chunkSize) {
    const chunk = vaList.slice(i, i + chunkSize);
    const numericChunk = chunk
      .map((va) => Number(va))
      .filter((va) => Number.isFinite(va));

    const { data, error } = await supabaseAdmin
      .from("fightpassport_fighters")
      .select("*")
      .in("va_nummer", numericChunk.length > 0 ? numericChunk : chunk)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    for (const fighter of (data ?? []) as any[]) {
      const va = String(fighter?.va_nummer ?? "").trim().replace(/^0+/, "");
      if (!va || map.has(va)) continue;
      map.set(va, fighter);
    }
  }

  return map;
}

function firstDefined(...values: any[]): any {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function applyCentralFighterToCorner(ctx: any, hoek: "rood" | "blauw", fighter: any): any {
  if (!fighter) return ctx;

  const prefix = hoek === "rood" ? "rood" : "blauw";
  const va = String(fighter?.va_nummer ?? getCtxVa(ctx, hoek)).trim().replace(/^0+/, "");
  const totaal = firstDefined(
    fighter?.totaal_wedstrijden,
    fighter?.totaal,
    fighter?.totaal_wedstrijden_scrape,
    fighter?.nulmeting_totaal
  );
  const licentie = firstDefined(
    fighter?.licentie,
    fighter?.licentie_actief,
    fighter?.licentie_geldig,
    fighter?.licentie_status
  );
  const startverbod = firstDefined(fighter?.heeft_startverbod, fighter?.startverbod_actief);
  const nulmetingKlasse = firstDefined(fighter?.nulmeting_klasse, fighter?.berekende_klasse, fighter?.klasse);

  return {
    ...ctx,
    [`${prefix}_va_fp`]: va || null,
    [`${prefix}_va_scrape`]: va || null,
    [`${prefix}_naam_fp`]: firstDefined(fighter?.naam, ctx?.[`${prefix}_naam_fp`]),
    [`${prefix}_naam_scrape`]: firstDefined(fighter?.naam, ctx?.[`${prefix}_naam_scrape`]),
    [`${prefix}_geboortedatum_fp`]: firstDefined(fighter?.geboortedatum, ctx?.[`${prefix}_geboortedatum_fp`]),
    [`${prefix}_geslacht`]: firstDefined(fighter?.geslacht, ctx?.[`${prefix}_geslacht`]),
    [`${prefix}_licentie`]: licentie,
    [`${prefix}_licentie_fp`]: licentie,
    [`${prefix}_heeft_startverbod`]: startverbod,
    [`${prefix}_totaal_wedstrijden_scrape`]: totaal,
    [`${prefix}_gewonnen_scrape`]: firstDefined(fighter?.gewonnen, fighter?.wins),
    [`${prefix}_nulmeting_totaal`]: firstDefined(fighter?.nulmeting_totaal, totaal),
    [`${prefix}_nulmeting_opmerking`]: firstDefined(
      fighter?.nulmeting_opmerking,
      ctx?.[`${prefix}_nulmeting_opmerking`]
    ),
    [`${prefix}_nulmeting_klasse`]: firstDefined(
      nulmetingKlasse,
      ctx?.[`${prefix}_nulmeting_klasse`]
    ),
    [`${prefix}_klasse_nulmeting`]: firstDefined(
      nulmetingKlasse,
      ctx?.[`${prefix}_klasse_nulmeting`]
    ),
    [`${prefix}_fp_klasse`]: firstDefined(nulmetingKlasse, ctx?.[`${prefix}_fp_klasse`]),
    [`${prefix}_current_klasse`]: firstDefined(nulmetingKlasse, ctx?.[`${prefix}_current_klasse`]),
  };
}

function applyCentralFightersToCtx(ctx: any, fighterByVa: Map<string, any>): any {
  const roodVa = getCtxVa(ctx, "rood");
  const blauwVa = getCtxVa(ctx, "blauw");

  let next = ctx;
  if (roodVa) next = applyCentralFighterToCorner(next, "rood", fighterByVa.get(roodVa));
  if (blauwVa) next = applyCentralFighterToCorner(next, "blauw", fighterByVa.get(blauwVa));
  return next;
}

function getMandatoryPromotionInfo(
  k: Klasse,
  wins: number,
  total: number
): { from: Klasse; to: Klasse; reason: string } | null {
  if (k === "R") {
    if (wins >= 2) return { from: "R", to: "N", reason: `${wins} gewonnen R-klasse partijen` };
    if (total >= 3) return { from: "R", to: "N", reason: `${total} gevochten R-klasse partijen` };
    return null;
  }

  if (k === "N") {
    if (wins >= 4) return { from: "N", to: "C", reason: `${wins} gewonnen N-klasse partijen` };
    if (total >= 6) return { from: "N", to: "C", reason: `${total} gevochten N-klasse partijen` };
    return null;
  }

  if (k === "C") {
    if (wins >= 6) return { from: "C", to: "B", reason: `${wins} gewonnen C-klasse partijen` };
    if (total >= 8) return { from: "C", to: "B", reason: `${total} gevochten C-klasse partijen` };
    return null;
  }

  if (k === "B") {
    if (wins >= 8) return { from: "B", to: "A", reason: `${wins} gewonnen B-klasse partijen` };
    if (total >= 10) return { from: "B", to: "A", reason: `${total} gevochten B-klasse partijen` };
    return null;
  }

  return null;
}

function promoteFrom(k: Klasse, wins: number, total: number): Klasse {
  const mandatory = getMandatoryPromotionInfo(k, wins, total);
  if (mandatory) return mandatory.to;

  // Belangrijk: 3 gewonnen N-partijen betekent: MAG naar C.
  // Het is géén verplichte promotie en mag dus N niet afkeuren.
  // Verplicht naar C is pas vanaf 4 gewonnen N-partijen of 6 gevochten N-partijen.
  return k;
}

function buildMandatoryPromotionHit(opts: {
  matchmaking_id: string;
  partij_nr: number | null;
  bout_id: string | null;
  hoek: "rood" | "blauw";
  naam: string;
  boutK: Klasse | null;
  promotion: { from: Klasse; to: Klasse; reason: string };
  toernooiCode?: string | null;
}): RuleHit {
  const { matchmaking_id, partij_nr, bout_id, hoek, naam, boutK, promotion, toernooiCode } = opts;
  const teLaag = !!boutK && idxKlasse(boutK) < idxKlasse(promotion.to);
  const plek = toernooiCode ? ` in ${toernooiCode}` : "";

  return {
    matchmaking_id,
    partij_nr,
    bout_id,
    hoek,
    rule: "Verplicht naar hogere klasse",
    rule_code: "VOLWASSEN_KLASSE_PROMOTIE_VERPLICHT",
    resultaat: teLaag ? "AFKEUR" : "INFO",
    severity: teLaag ? "error" : "info",
    boodschap: teLaag
      ? `${naam} heeft te veel ervaring voor klasse ${promotion.from} en moet naar klasse ${promotion.to}. Deze partij staat nu in klasse ${boutK}.`
      : `${naam} heeft genoeg ervaring voor klasse ${promotion.to}.`,
  };
}

function canFightAdultKbMtBoutClass(fighterKlasse: Klasse | null, boutK: Klasse | null): boolean {
  if (!fighterKlasse || !boutK) return true;

  // R is geen standaard startpunt onder N, maar een optionele instapklasse.
  // Daarom mag een R-bout hier niet automatisch worden afgekeurd omdat de
  // volwassen basis/default op N staat. De harde R-controle hieronder bepaalt
  // apart dat R alleen mag zonder wedstrijdervaring.
  if (boutK === "R") return true;

  // Strikte klassecontrole: lager vechten mag niet.
  // Een vechter die op basis van uitslagen/nulmeting/verplichte promotie in C/B/A hoort,
  // mag dus niet alsnog in een lagere klasse worden gezet.
  if (boutK === fighterKlasse) return true;

  // Als iemand expliciet als R geregistreerd staat, mag N altijd: volwassenen
  // starten functioneel in N en R is optioneel, niet verplicht.
  if (fighterKlasse === "R" && boutK === "N") return true;

  return false;
}

function canFightAdultKbMtBoutClassFromRecord(opts: {
  fighterKlasse: Klasse | null;
  boutK: Klasse | null;
  baseK: Klasse;
  winsInBase: number;
  totalInBase: number;
}): boolean {
  const { fighterKlasse, boutK, baseK, winsInBase, totalInBase } = opts;

  if (canFightAdultKbMtBoutClass(fighterKlasse, boutK)) return true;
  if (!boutK) return true;

  // N -> C is toegestaan vanaf 3 gewonnen N-partijen, maar pas verplicht
  // bij 4 gewonnen of 6 totaal gevochten N-partijen.
  // Daardoor mag een vechter met exact 3 N-winst zowel in N blijven als naar C.
  if (baseK === "N" && boutK === "C" && winsInBase >= 3 && winsInBase < 4 && totalInBase < 6) {
    return true;
  }

  return false;
}

function parseMmaLevel(v: any): MmaLevel | null {
  const s = normalizeKlasseText(v);
  if (!s) return null;

  if (
    s === "P" ||
    s === "PRO" ||
    s === "MMA P" ||
    s === "MMA PRO" ||
    s.includes("PROFESSIONAL") ||
    s.includes("MMA PROFESSIONAL")
  ) {
    return "PRO";
  }

  if (
    s === "AMA" ||
    s === "AMATEUR" ||
    s === "MMA AMA" ||
    s === "MMA AMATEUR" ||
    s.includes("AMATEUR")
  ) {
    return "AMATEUR";
  }

  return null;
}

function getMmaLevelFromCtx(ctx: any, hoek: "rood" | "blauw"): MmaLevel | null {
  const cand =
    hoek === "rood"
      ? ctx?.rood_mma_current_klasse ??
        ctx?.rood_mma_klasse ??
        ctx?.rood_klasse_mma ??
        ctx?.rood_fp_mma_klasse ??
        ctx?.rood_nulmeting_klasse
      : ctx?.blauw_mma_current_klasse ??
        ctx?.blauw_mma_klasse ??
        ctx?.blauw_klasse_mma ??
        ctx?.blauw_fp_mma_klasse ??
        ctx?.blauw_nulmeting_klasse;

  return parseMmaLevel(cand);
}

function parseJsonSafe(v: any): any | null {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return null;
  }
}

function getToernooiCodeFromCtx(ctx: any): string | null {
  const direct = String(ctx?.toernooi_code ?? "").trim().toUpperCase();
  if (direct && /^T\S*$/.test(direct)) return direct;

  const raw = parseJsonSafe(ctx?.raw_json);
  const fromRaw = String(raw?.toernooi_code ?? "").trim().toUpperCase();
  if (fromRaw && /^T\S*$/.test(fromRaw)) return fromRaw;

  return null;
}

function isJeugdKlasseText(v: any): boolean {
  const s = normalizeKlasseText(v);
  if (!s) return false;
  return s === "J" || s === "J+" || s.includes("JEUGD") || s.includes("YOUTH");
}

function isToernooiCtx(ctx: any): boolean {
  const flag = String(ctx?.is_toernooi ?? "").trim().toLowerCase();
  if (flag === "true" || flag === "1" || flag === "ja") return true;
  return !!getToernooiCodeFromCtx(ctx);
}

function getTournamentFighterKey(ctx: any, hoek: "rood" | "blauw"): string | null {
  const va =
    hoek === "rood"
      ? String(ctx?.rood_va_mm ?? ctx?.va_rood ?? "").trim()
      : String(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? "").trim();

  if (va) return `va:${va}`;

  const naam =
    hoek === "rood"
      ? String(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm ?? ctx?.rood_naam ?? "")
          .trim()
          .toLowerCase()
      : String(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm ?? ctx?.blauw_naam ?? "")
          .trim()
          .toLowerCase();

  const gym =
    hoek === "rood"
      ? String(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym ?? "")
          .trim()
          .toLowerCase()
      : String(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym ?? "")
          .trim()
          .toLowerCase();

  if (!naam && !gym) return null;
  return `fallback:${naam}__${gym}`;
}

function getTournamentFighterIdFromCtx(ctx: any, hoek: "rood" | "blauw"): string | null {
  const candidates =
    hoek === "rood"
      ? [
          ctx?.rood_fighter_id,
          ctx?.fighter_id_rood,
          ctx?.rood_va_mm,
          ctx?.va_rood,
          ctx?.va_rood_mm,
        ]
      : [
          ctx?.blauw_fighter_id,
          ctx?.fighter_id_blauw,
          ctx?.blauw_va_mm,
          ctx?.va_blauw,
          ctx?.va_blauw_mm,
        ];

  for (const v of candidates) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }

  return null;
}

function getTournamentVaNummerFromCtx(ctx: any, hoek: "rood" | "blauw"): string | null {
  const candidates =
    hoek === "rood"
      ? [
          ctx?.rood_va_nummer,
          ctx?.va_nummer_rood,
          ctx?.rood_va_mm,
          ctx?.va_rood,
          ctx?.va_rood_mm,
          ctx?.rood_fighter_id,
        ]
      : [
          ctx?.blauw_va_nummer,
          ctx?.va_nummer_blauw,
          ctx?.blauw_va_mm,
          ctx?.va_blauw,
          ctx?.va_blauw_mm,
          ctx?.blauw_fighter_id,
        ];

  for (const v of candidates) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }

  return null;
}

function withTournamentFighterFields(
  hit: RuleHit,
  ctx: any,
  hoek: "rood" | "blauw"
): RuleHit {
  return {
    ...hit,
    hoek,
    toernooi_code: getToernooiCodeFromCtx(ctx),
    fighter_id: getTournamentFighterIdFromCtx(ctx, hoek),
    va_nummer: getTournamentVaNummerFromCtx(ctx, hoek),
  };
}

function buildTournamentScopeKey(opts: {
  ctx: any;
  hoek?: "rood" | "blauw" | null;
  rule_code: string;
}): string | null {
  const toernooiCode = getToernooiCodeFromCtx(opts.ctx);
  if (!toernooiCode) return null;

  if (opts.hoek) {
    const fighterKey = getTournamentFighterKey(opts.ctx, opts.hoek);
    if (!fighterKey) return null;
    return `${toernooiCode}||${fighterKey}||${opts.rule_code}`;
  }

  const vaR = String(opts.ctx?.rood_va_mm ?? opts.ctx?.va_rood ?? "").trim();
  const vaB = String(opts.ctx?.blauw_va_mm ?? opts.ctx?.va_blauw ?? "").trim();

  if (vaR && vaB) {
    const sorted = [vaR, vaB].sort();
    return `${toernooiCode}||PAIR||${opts.rule_code}||${sorted[0]}||${sorted[1]}`;
  }

  const keyR = getTournamentFighterKey(opts.ctx, "rood");
  const keyB = getTournamentFighterKey(opts.ctx, "blauw");

  if (!keyR && !keyB) return null;

  const sorted = [keyR ?? "?", keyB ?? "?"].sort();
  return `${toernooiCode}||PAIR_FALLBACK||${opts.rule_code}||${sorted[0]}||${sorted[1]}`;
}

function getGlobalTournamentPersonKey(
  ctx: any,
  hoek: "rood" | "blauw",
  rule_code: string
): string | null {
  const fighterKey = getTournamentFighterKey(ctx, hoek);
  if (!fighterKey) return null;
  return `${fighterKey}||${rule_code}`;
}

function cleanTournamentValue(v: any): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const low = s.toLowerCase();
  if (low === "-" || low === "—" || low === "n.v.t." || low === "nvt" || low === "null" || low === "undefined") return "";
  return s;
}

function firstCleanTournamentValue(...values: any[]): string {
  for (const v of values) {
    const s = cleanTournamentValue(v);
    if (s) return s;
  }
  return "";
}

function hasMeaningfulTournamentParticipant(p: any): boolean {
  return !!firstCleanTournamentValue(
    p?.fighter_id,
    p?.va_nummer,
    p?.va_nummer_fp,
    p?.va_nummer_mm,
    p?.naam_fp,
    p?.naam,
    p?.naam_mm,
    p?.sportschool,
    p?.sportschool_mm
  );
}

function hasMeaningfulTournamentCorner(ctx: any, hoek: "rood" | "blauw"): boolean {
  if (hoek === "rood") {
    return !!firstCleanTournamentValue(
      ctx?.rood_fighter_id,
      ctx?.fighter_id_rood,
      ctx?.rood_va_nummer,
      ctx?.va_nummer_rood,
      ctx?.rood_va_mm,
      ctx?.va_rood,
      ctx?.va_rood_mm,
      ctx?.rood_naam_fp,
      ctx?.rood_naam_mm,
      ctx?.rood_naam,
      ctx?.rood_gym_fp,
      ctx?.rood_gym_mm,
      ctx?.rood_gym
    );
  }

  return !!firstCleanTournamentValue(
    ctx?.blauw_fighter_id,
    ctx?.fighter_id_blauw,
    ctx?.blauw_va_nummer,
    ctx?.va_nummer_blauw,
    ctx?.blauw_va_mm,
    ctx?.va_blauw,
    ctx?.va_blauw_mm,
    ctx?.blauw_naam_fp,
    ctx?.blauw_naam_mm,
    ctx?.blauw_naam,
    ctx?.blauw_gym_fp,
    ctx?.blauw_gym_mm,
    ctx?.blauw_gym
  );
}

function getFighterDisplayName(ctx: any, hoek: "rood" | "blauw"): string {
  const naam =
    hoek === "rood"
      ? firstCleanTournamentValue(ctx?.rood_naam_fp, ctx?.rood_naam_mm, ctx?.rood_naam)
      : firstCleanTournamentValue(ctx?.blauw_naam_fp, ctx?.blauw_naam_mm, ctx?.blauw_naam);

  return naam || "Onbekende vechter";
}

function getFighterGymName(ctx: any, hoek: "rood" | "blauw"): string {
  const gym =
    hoek === "rood"
      ? firstCleanTournamentValue(ctx?.rood_gym_fp, ctx?.rood_gym_mm, ctx?.rood_gym)
      : firstCleanTournamentValue(ctx?.blauw_gym_fp, ctx?.blauw_gym_mm, ctx?.blauw_gym);

  return gym || "Onbekende sportschool";
}


function hasFightPassportScrapeInfo(ctx: any, hoek: "rood" | "blauw"): boolean {
  // Alleen echte FightPassport/scrape velden tellen hier mee.
  // MM-velden tellen bewust niet mee: als VA verkeerd is en fightpassport_fighters geen rij bevat,
  // wil je een ACTIE "geen info", niet allerlei afkeuren op lege FP-data.
  if (!ctx) return false;

  const values =
    hoek === "rood"
      ? [
          ctx?.rood_naam_fp,
          ctx?.rood_naam_scrape,
          ctx?.rood_geboortedatum_fp,
          ctx?.rood_va_fp,
          ctx?.rood_va_scrape,
          ctx?.rood_licentie,
          ctx?.rood_licentie_ok,
          ctx?.rood_licentie_geldig,
          ctx?.rood_licentie_status,
          ctx?.rood_licentie_fp,
          ctx?.rood_licentie_ja_nee,
          ctx?.rood_heeft_startverbod,
          ctx?.rood_totaal_wedstrijden_scrape,
          ctx?.rood_uitslagen_per_discipline,
          ctx?.rood_nulmeting_klasse,
          ctx?.rood_nulmeting_opmerking,
        ]
      : [
          ctx?.blauw_naam_fp,
          ctx?.blauw_naam_scrape,
          ctx?.blauw_geboortedatum_fp,
          ctx?.blauw_va_fp,
          ctx?.blauw_va_scrape,
          ctx?.blauw_licentie,
          ctx?.blauw_licentie_ok,
          ctx?.blauw_licentie_geldig,
          ctx?.blauw_licentie_status,
          ctx?.blauw_licentie_fp,
          ctx?.blauw_licentie_ja_nee,
          ctx?.blauw_heeft_startverbod,
          ctx?.blauw_totaal_wedstrijden_scrape,
          ctx?.blauw_uitslagen_per_discipline,
          ctx?.blauw_nulmeting_klasse,
          ctx?.blauw_nulmeting_opmerking,
        ];

  return values.some((v) => cleanTournamentValue(v) !== "");
}

function buildGeenFightPassportInfoHit(opts: {
  matchmaking_id: string;
  partij_nr: number | null;
  bout_id: string | null;
  hoek: "rood" | "blauw";
  naam: string;
  va: string;
}): RuleHit {
  const label = opts.hoek === "rood" ? "Rood" : "Blauw";
  return {
    matchmaking_id: opts.matchmaking_id,
    partij_nr: opts.partij_nr,
    bout_id: opts.bout_id,
    hoek: opts.hoek,
    rule: `Geen FightPassport-info (${opts.hoek})`,
    rule_code: `GEEN_FIGHTPASSPORT_INFO_${opts.hoek.toUpperCase()}`,
    resultaat: "ACTIE",
    severity: "warning",
    boodschap: `${label} ${opts.naam} heeft VA ${opts.va}, maar er is geen FightPassport/scrape-info gevonden. Controleer of het VA-nummer klopt.`,
  };
}

function isBelgischeSportschoolReason(v: any): boolean {
  const s = String(v ?? "").toLowerCase().trim();
  if (!s) return false;
  return (
    s.includes("belgië") ||
    s.includes("belgie") ||
    s.includes("belgische") ||
    s.includes("bkbmo") ||
    s.includes("bkbmo") ||
    s.includes("bkmo") ||
    s.includes("boksboekje")
  );
}

function isBelgischeSportschoolCtx(ctx: any, hoek: "rood" | "blauw"): boolean {
  const gym = getFighterGymName(ctx, hoek);
  const reason =
    hoek === "rood"
      ? ctx?.keurmerk_reden_rood
      : ctx?.keurmerk_reden_blauw;

  const countryCandidates =
    hoek === "rood"
      ? [
          ctx?.rood_land_fp,
          ctx?.rood_land_mm,
          ctx?.rood_land,
          ctx?.rood_gym_land,
          ctx?.rood_sportschool_land,
        ]
      : [
          ctx?.blauw_land_fp,
          ctx?.blauw_land_mm,
          ctx?.blauw_land,
          ctx?.blauw_gym_land,
          ctx?.blauw_sportschool_land,
        ];

  const countryIsBelgisch = countryCandidates.some((v) => {
    const s = String(v ?? "").toLowerCase().trim();
    return s === "be" || s === "belgie" || s === "belgië" || s === "belgium";
  });

  return countryIsBelgisch || isBelgischeSportschoolReason(reason) || isBelgischeSportschoolReason(gym);
}

function pushTournamentPersonHit(
  hits: RuleHit[],
  tournamentSeen: Set<string>,
  h: RuleHit,
  ctx: any,
  hoek: "rood" | "blauw"
) {
  if (!ctx || !isToernooiCtx(ctx)) {
    hits.push({ ...h, hoek });
    return;
  }

  const globalKey = getGlobalTournamentPersonKey(ctx, hoek, h.rule_code);

  if (!globalKey) {
    hits.push(withTournamentFighterFields(h, ctx, hoek));
    return;
  }

  if (tournamentSeen.has(globalKey)) return;
  tournamentSeen.add(globalKey);
  hits.push(withTournamentFighterFields(h, ctx, hoek));
}

function isPositiveLicenseValue(v: any): boolean {
  const s = normLower(v);
  return s === "ja" || s === "j" || s === "true" || s === "1" || s === "geldig";
}

function isPositiveBooleanish(v: any): boolean {
  const s = normLower(v);
  return s === "ja" || s === "j" || s === "true" || s === "1" || s === "geldig";
}

function getTournamentPairKey(ctx: any, ruleCode: string): string | null {
  const toernooiCode = getToernooiCodeFromCtx(ctx) ?? "TOERNOOI";
  const keyR = getTournamentFighterKey(ctx, "rood");
  const keyB = getTournamentFighterKey(ctx, "blauw");
  if (!keyR || !keyB) return null;
  const sorted = [keyR, keyB].sort();
  return `${toernooiCode}||PAIR||${ruleCode}||${sorted[0]}||${sorted[1]}`;
}

function formatJeugdDifferenceMessage(ctx: any): string | null {
  const naamR = getFighterDisplayName(ctx, "rood");
  const naamB = getFighterDisplayName(ctx, "blauw");
  const dobR = parseIsoDateOnly(ctx?.rood_geboortedatum_fp ?? ctx?.rood_geboortedatum);
  const dobB = parseIsoDateOnly(ctx?.blauw_geboortedatum_fp ?? ctx?.blauw_geboortedatum);
  if (!dobR || !dobB) return `${naamR} - leeftijdsverschil niet controleerbaar - ${naamB}`;

  let oudereNaam = naamR;
  let jongereNaam = naamB;
  let oudereDob = dobR;
  let jongereDob = dobB;

  if (dobB.isBefore(dobR)) {
    oudereNaam = naamB;
    jongereNaam = naamR;
    oudereDob = dobB;
    jongereDob = dobR;
  }

  const diffMonths = Math.abs(jongereDob.diff(oudereDob, "month"));
  const afterMonths = oudereDob.add(diffMonths, "month");
  const diffDays = Math.abs(jongereDob.diff(afterMonths, "day"));

  return `${oudereNaam} - ${diffMonths} maanden en ${diffDays} dagen ouder - ${jongereNaam}`;
}


function tournamentParticipantKey(p: any): string {
  const va = firstCleanTournamentValue(p?.va_nummer, p?.fighter_id, p?.va_nummer_fp, p?.va_nummer_mm);
  if (va) return `va:${va}`;

  const naam = normNameSoft(firstCleanTournamentValue(p?.naam_fp, p?.naam, p?.naam_mm));
  const gym = normNameSoft(firstCleanTournamentValue(p?.sportschool, p?.sportschool_mm));
  return `fallback:${naam}__${gym}`;
}

function tournamentParticipantToCornerCtx(p: any, hoek: "rood" | "blauw"): Record<string, any> {
  const prefix = hoek;
  const fighterId = firstCleanTournamentValue(p?.fighter_id, p?.va_nummer, p?.va_nummer_fp, p?.va_nummer_mm) || null;
  const vaFp = firstCleanTournamentValue(p?.va_nummer_fp, p?.va_nummer, p?.fighter_id) || null;
  const vaMm = firstCleanTournamentValue(p?.va_nummer_mm, p?.va_mm, p?.fighter_id_mm, p?.va_nummer, p?.fighter_id) || null;
  const naam = firstCleanTournamentValue(p?.naam_fp, p?.naam, p?.naam_mm) || null;
  const naamMm = firstCleanTournamentValue(p?.naam_mm, p?.naam, p?.naam_fp) || null;
  const gym = firstCleanTournamentValue(p?.sportschool, p?.sportschool_mm) || null;
  const gewicht = p?.gewicht ?? null;
  const geboortedatum = p?.geboortedatum ?? null;
  const startverbod = p?.heeft_startverbod ?? null;
  const totaal = p?.totaal_wedstrijden ?? p?.nulmeting_totaal ?? null;

  return {
    [`${prefix}_fighter_id`]: fighterId,
    [`${prefix}_va_nummer`]: vaFp ?? fighterId,
    [`${prefix}_va_fp`]: vaFp ?? fighterId,
    [`${prefix}_va_scrape`]: vaFp ?? fighterId,
    [`${prefix}_va_mm`]: vaMm ?? fighterId,
    [`va_${prefix}`]: vaFp ?? fighterId,
    [`va_${prefix}_mm`]: vaMm ?? fighterId,
    [`${prefix}_naam`]: naam,
    [`${prefix}_naam_fp`]: naam,
    [`${prefix}_naam_mm`]: naamMm,
    [`${prefix}_gym`]: gym,
    [`${prefix}_gym_fp`]: gym,
    [`${prefix}_gym_mm`]: firstCleanTournamentValue(p?.sportschool_mm, gym) || null,
    [`${prefix}_geboortedatum`]: geboortedatum,
    [`${prefix}_geboortedatum_fp`]: geboortedatum,
    [`${prefix}_geslacht`]: p?.geslacht ?? null,
    [`${prefix}_gewicht`]: gewicht,
    [`${prefix}_gewicht_fp`]: gewicht,
    [`${prefix}_gewicht_mm`]: gewicht,
    [`${prefix}_licentie`]: p?.licentie ?? null,
    [`${prefix}_heeft_startverbod`]: startverbod,
    [`${prefix}_nulmeting_klasse`]: p?.nulmeting_klasse ?? p?.klasse ?? null,
    [`${prefix}_klasse_nulmeting`]: p?.nulmeting_klasse ?? p?.klasse ?? null,
    [`${prefix}_fp_klasse`]: p?.nulmeting_klasse ?? p?.klasse ?? null,
    [`${prefix}_current_klasse`]: p?.nulmeting_klasse ?? p?.klasse ?? null,
    [`${prefix}_nulmeting_opmerking`]: p?.nulmeting_opmerking ?? null,
    [`${prefix}_totaal_wedstrijden_scrape`]: totaal,
    [`${prefix}_demo_totaal`]: p?.demo ?? null,
    [`keurmerk_${prefix}`]: p?.heeft_keurmerk ?? null,
    [`keurmerk_reden_${prefix}`]: p?.keurmerk_reason ?? null,
  };
}

function buildTournamentPairRowsFromParticipants(participants: any[]): any[] {
  const grouped = new Map<string, any[]>();

  for (const p of participants ?? []) {
    const code = String(p?.toernooi_code ?? "").trim().toUpperCase();
    if (!code) continue;
    const arr = grouped.get(code) ?? [];
    arr.push(p);
    grouped.set(code, arr);
  }

  const pairRows: any[] = [];

  for (const [toernooiCode, listRaw] of grouped) {
    const seen = new Set<string>();
    const list: any[] = [];

    for (const p of listRaw) {
      if (!hasMeaningfulTournamentParticipant(p)) continue;
      const key = tournamentParticipantKey(p);
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(p);
    }

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        pairRows.push({
          is_toernooi: true,
          toernooi_code: toernooiCode,
          matchmaking_id: a?.matchmaking_id ?? b?.matchmaking_id ?? null,
          controle_run_id: a?.controle_run_id ?? b?.controle_run_id ?? null,
          bout_id: null,
          partij_nr: null,
          discipline: a?.discipline ?? b?.discipline ?? null,
          klasse_mm: a?.klasse_mm ?? a?.klasse ?? b?.klasse_mm ?? b?.klasse ?? null,
          sub_discipline: null,
          event_date: a?.evenement_datum ?? b?.evenement_datum ?? null,
          event_datum: a?.evenement_datum ?? b?.evenement_datum ?? null,
          evenement_datum: a?.evenement_datum ?? b?.evenement_datum ?? null,
          datum: a?.evenement_datum ?? b?.evenement_datum ?? null,
          raw_json: { toernooi_code: toernooiCode },
          ...tournamentParticipantToCornerCtx(a, "rood"),
          ...tournamentParticipantToCornerCtx(b, "blauw"),
        });
      }
    }
  }

  return pairRows;
}

async function fetchToernooiContextRows(opts: {
  controle_run_id: string;
  matchmaking_id: string;
}): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("controle_toernooi_context")
    .select("*")
    .eq("controle_run_id", opts.controle_run_id)
    .eq("matchmaking_id", opts.matchmaking_id)
    .order("toernooi_code", { ascending: true })
    .order("naam", { ascending: true });

  if (error) {
    // Zolang de nieuwe tabel nog niet gemigreerd is, mag de gewone partijencontrole niet klappen.
    if ((error as any)?.code === "42P01") return [];
    throw error;
  }

  return (data ?? []).filter(hasMeaningfulTournamentParticipant);
}

async function runTournamentRules(opts: {
  controle_run_id: string;
  matchmaking_id: string;
  rows: any[];
  scoped_bout_id?: string | null;
  scoped_partij_nr?: number | null;
}) {
  const { controle_run_id, matchmaking_id, rows, scoped_bout_id, scoped_partij_nr } = opts;
  const hits: RuleHit[] = [];

  const personSeen = new Set<string>();
  const pairSeen = new Set<string>();

  const vaSet = new Set<string>();
  for (const ctx of rows) {
    const vr = String(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.va_rood_mm ?? "").trim();
    const vb = String(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.va_blauw_mm ?? "").trim();
    if (vr) vaSet.add(vr);
    if (vb) vaSet.add(vb);
  }

  const uitslagenByVa = await fetchUitslagenByVa({
    matchmaking_id,
    controle_run_id,
    vaList: [...vaSet],
  });

  function parseWeightKg(v: any): number | null {
    if (v == null) return null;
    const raw = String(v).trim().replace(',', '.');
    if (!raw) return null;
    const m = raw.match(/-?\d+(?:\.\d+)?/);
    if (!m) return null;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  function getTournamentPersonScopeKey(ctx: any, hoek: "rood" | "blauw", ruleCode: string): string {
    const fighterKey = getTournamentFighterKey(ctx, hoek);
    if (fighterKey) return `${fighterKey}||${ruleCode}`;
    return `${getFighterDisplayName(ctx, hoek).toLowerCase()}||${getFighterGymName(ctx, hoek).toLowerCase()}||${ruleCode}`;
  }

  function getTournamentPairScopeKey(ctx: any, ruleCode: string, extra?: string): string {
    const keyR = getTournamentFighterKey(ctx, "rood") ?? `${getFighterDisplayName(ctx, "rood").toLowerCase()}||${getFighterGymName(ctx, "rood").toLowerCase()}`;
    const keyB = getTournamentFighterKey(ctx, "blauw") ?? `${getFighterDisplayName(ctx, "blauw").toLowerCase()}||${getFighterGymName(ctx, "blauw").toLowerCase()}`;
    const sorted = [keyR, keyB].sort();
    return `${ruleCode}||${sorted[0]}||${sorted[1]}${extra ? `||${extra}` : ''}`;
  }

  function getEffectiveYouthFights(ctx: any, hoek: "rood" | "blauw"): number | null {
    const totalRaw = hoek === "rood" ? ctx?.rood_totaal_wedstrijden_scrape : ctx?.blauw_totaal_wedstrijden_scrape;
    const demoRaw = hoek === "rood" ? ctx?.rood_demo_totaal : ctx?.blauw_demo_totaal;
    const va =
      hoek === "rood"
        ? String(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.va_rood_mm ?? "").trim()
        : String(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.va_blauw_mm ?? "").trim();
    const histRows = va ? (uitslagenByVa.get(va) ?? []) : [];

    const countDemo = (rows2: any[]) =>
      (rows2 ?? []).reduce((acc, r) => {
        const s = String((r as any)?.uitslag ?? "").toLowerCase();
        return acc + (s.includes("demo") || s.includes("demonstr") ? 1 : 0);
      }, 0);

    if (totalRaw !== null && totalRaw !== undefined) {
      const total = toInt(totalRaw);
      const demo = demoRaw !== null && demoRaw !== undefined ? toInt(demoRaw) : countDemo(histRows);
      return Math.max(0, total - demo + Math.floor(demo / 3));
    }

    const totals =
      hoek === "rood"
        ? getCurrentTotalsAll(ctx?.rood_uitslagen_per_discipline)
        : getCurrentTotalsAll(ctx?.blauw_uitslagen_per_discipline);
    const eff = effectiveFromTotals(totals);
    return typeof eff === "number" ? eff : null;
  }

  function formatTournamentPairMessage(ctx: any, melding: string): string {
    const naamR = getFighterDisplayName(ctx, "rood");
    const naamB = getFighterDisplayName(ctx, "blauw");
    return `Vechter ${naamR} vs vechter ${naamB} geeft melding: ${melding}`;
  }

  function pushTournamentUniquePersonHit(ctx: any, hoek: "rood" | "blauw", hit: RuleHit) {
    const dedupeKey = `${getTournamentPersonScopeKey(ctx, hoek, hit.rule_code)}||${String(hit.boodschap ?? "").trim().toLowerCase()}`;
    if (personSeen.has(dedupeKey)) return;
    personSeen.add(dedupeKey);
    hits.push(withTournamentFighterFields({ ...hit, partij_nr: null }, ctx, hoek));
  }

  function pushTournamentUniquePairHit(ctx: any, hit: RuleHit, extraKey?: string) {
    const boodschapKey = String(hit.boodschap ?? "").trim().toLowerCase();
    const key = `${getTournamentPairScopeKey(ctx, hit.rule_code, extraKey)}||${boodschapKey}`;
    if (pairSeen.has(key)) return;
    pairSeen.add(key);

    // Pair-meldingen gelden voor beide deelnemers. Zo kan de fighter-detailpage
    // dezelfde melding tonen bij beide losse toernooi-vechters.
    hits.push(withTournamentFighterFields({ ...hit, partij_nr: null }, ctx, "rood"));
    hits.push(withTournamentFighterFields({ ...hit, partij_nr: null }, ctx, "blauw"));
  }

  for (const ctx of rows) {
    const bout_id = unwrapUuid(ctx?.bout_id);
    const toernooiCode = getToernooiCodeFromCtx(ctx) ?? "TOERNOOI";

    const naamR = getFighterDisplayName(ctx, "rood");
    const naamB = getFighterDisplayName(ctx, "blauw");
    const gymR = getFighterGymName(ctx, "rood");
    const gymB = getFighterGymName(ctx, "blauw");

    const vaRood = String(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.va_rood_mm ?? "").trim();
    const vaBlauw = String(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.va_blauw_mm ?? "").trim();
    const hasRood = hasMeaningfulTournamentCorner(ctx, "rood");
    const hasBlauw = hasMeaningfulTournamentCorner(ctx, "blauw");
    const skipLicentieEnKeurmerk = isPureBoksenZonderLicentieKeurmerk(ctx);

    if (!hasRood && !hasBlauw) continue;

    if (!skipLicentieEnKeurmerk && hasRood && !vaRood) {
      pushTournamentUniquePersonHit(ctx, "rood", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Fightpaspoort nummer ontbreekt",
        rule_code: "TOERNOOI_FIGHTPASPOORT_ONTBREEKT",
        resultaat: "AFKEUR",
        severity: "error",
        boodschap: `${naamR} heeft geen Fightpaspoort nummer.`,
      });
    }

    if (!skipLicentieEnKeurmerk && hasBlauw && !vaBlauw) {
      pushTournamentUniquePersonHit(ctx, "blauw", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Fightpaspoort nummer ontbreekt",
        rule_code: "TOERNOOI_FIGHTPASPOORT_ONTBREEKT",
        resultaat: "AFKEUR",
        severity: "error",
        boodschap: `${naamB} heeft geen Fightpaspoort nummer.`,
      });
    }

    if (!skipLicentieEnKeurmerk && hasRood && !isPositiveLicenseValue(ctx?.rood_licentie)) {
      const licWaarde = String(ctx?.rood_licentie ?? "").trim() || "leeg";
      pushTournamentUniquePersonHit(ctx, "rood", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Licentie ontbreekt of ongeldig",
        rule_code: "TOERNOOI_LICENTIE_ONGELDIG",
        resultaat: "AFKEUR",
        severity: "error",
        boodschap: `${naamR} heeft geen geldige licentie (waarde: "${licWaarde}").`,
      });
    }

    if (!skipLicentieEnKeurmerk && hasBlauw && !isPositiveLicenseValue(ctx?.blauw_licentie)) {
      const licWaarde = String(ctx?.blauw_licentie ?? "").trim() || "leeg";
      pushTournamentUniquePersonHit(ctx, "blauw", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Licentie ontbreekt of ongeldig",
        rule_code: "TOERNOOI_LICENTIE_ONGELDIG",
        resultaat: "AFKEUR",
        severity: "error",
        boodschap: `${naamB} heeft geen geldige licentie (waarde: "${licWaarde}").`,
      });
    }

    if (hasRood && isPositiveBooleanish(ctx?.rood_heeft_startverbod)) {
      pushTournamentUniquePersonHit(ctx, "rood", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Startverbod",
        rule_code: "TOERNOOI_STARTVERBOD",
        resultaat: "VERBOD",
        severity: "error",
        boodschap: `${naamR} heeft een startverbod.`,
      });
    }

    if (hasBlauw && isPositiveBooleanish(ctx?.blauw_heeft_startverbod)) {
      pushTournamentUniquePersonHit(ctx, "blauw", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Startverbod",
        rule_code: "TOERNOOI_STARTVERBOD",
        resultaat: "VERBOD",
        severity: "error",
        boodschap: `${naamB} heeft een startverbod.`,
      });
    }

    if (hasRood && !nameSimilar(ctx?.rood_naam_mm, ctx?.rood_naam_fp ?? ctx?.rood_naam_scrape)) {
      pushTournamentUniquePersonHit(ctx, "rood", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Naam klopt niet met FightPassport",
        rule_code: "NAAM_KLOPT_NIET_MET_FIGHTPASPOORT",
        resultaat: "ACTIE",
        severity: "warning",
        boodschap: `${naamR}: matchmaker="${String(ctx?.rood_naam_mm ?? "-").trim() || "-"}" • FightPassport="${String(ctx?.rood_naam_fp ?? ctx?.rood_naam_scrape ?? "-").trim() || "-"}". Controleer FP-koppeling.`,
      });
    }

    if (hasBlauw && !nameSimilar(ctx?.blauw_naam_mm, ctx?.blauw_naam_fp ?? ctx?.blauw_naam_scrape)) {
      pushTournamentUniquePersonHit(ctx, "blauw", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Naam klopt niet met FightPassport",
        rule_code: "NAAM_KLOPT_NIET_MET_FIGHTPASPOORT",
        resultaat: "ACTIE",
        severity: "warning",
        boodschap: `${naamB}: matchmaker="${String(ctx?.blauw_naam_mm ?? "-").trim() || "-"}" • FightPassport="${String(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_scrape ?? "-").trim() || "-"}". Controleer FP-koppeling.`,
      });
    }

    const vaFpRood = String(ctx?.rood_va_fp ?? ctx?.rood_va_nummer ?? ctx?.va_rood ?? "").trim();
    const vaMmRood = String(ctx?.rood_va_mm ?? ctx?.va_rood_mm ?? "").trim();
    if (!skipLicentieEnKeurmerk && hasRood && vaFpRood && vaMmRood && vaFpRood !== vaMmRood) {
      pushTournamentUniquePersonHit(ctx, "rood", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Fightpaspoort nummer gewijzigd",
        rule_code: "TOERNOOI_VA_NUMMER_MISMATCH",
        resultaat: "ACTIE",
        severity: "warning",
        boodschap: `${naamR}: VA-nummer matchmaker="${vaMmRood}" wijkt af van FightPassport="${vaFpRood}". Controleer of de juiste vechter is gekoppeld.`,
      });
    }

    const vaFpBlauw = String(ctx?.blauw_va_fp ?? ctx?.blauw_va_nummer ?? ctx?.va_blauw ?? "").trim();
    const vaMmBlauw = String(ctx?.blauw_va_mm ?? ctx?.va_blauw_mm ?? "").trim();
    if (!skipLicentieEnKeurmerk && hasBlauw && vaFpBlauw && vaMmBlauw && vaFpBlauw !== vaMmBlauw) {
      pushTournamentUniquePersonHit(ctx, "blauw", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Fightpaspoort nummer gewijzigd",
        rule_code: "TOERNOOI_VA_NUMMER_MISMATCH",
        resultaat: "ACTIE",
        severity: "warning",
        boodschap: `${naamB}: VA-nummer matchmaker="${vaMmBlauw}" wijkt af van FightPassport="${vaFpBlauw}". Controleer of de juiste vechter is gekoppeld.`,
      });
    }

    const kR = ctx?.keurmerk_rood;
    const kB = ctx?.keurmerk_blauw;
    const redenR = String(ctx?.keurmerk_reden_rood ?? "").trim();
    const redenB = String(ctx?.keurmerk_reden_blauw ?? "").trim();

    if (!skipLicentieEnKeurmerk && hasRood && isBelgischeSportschoolCtx(ctx, "rood")) {
      pushTournamentUniquePersonHit(ctx, "rood", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Belgische sportschool controleren",
        rule_code: "TOERNOOI_KEURMERK_BE",
        resultaat: "INFO",
        severity: "info",
        boodschap: `${naamR} (${gymR}): ${redenR}`,
      });
    } else if (!skipLicentieEnKeurmerk && hasRood && kR == null) {
      pushTournamentUniquePersonHit(ctx, "rood", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Sportschool niet gevonden",
        rule_code: "TOERNOOI_SPORTSCHOOL_NIET_GEVONDEN",
        resultaat: "ACTIE",
        severity: "warning",
        boodschap: `${naamR} (${gymR}): ${redenR || "sportschool niet gevonden of niet controleerbaar op eventdatum."}`,
      });
    } else if (!skipLicentieEnKeurmerk && hasRood && kR === false) {
      pushTournamentUniquePersonHit(ctx, "rood", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Keurmerk sportschool ongeldig",
        rule_code: "TOERNOOI_KEURMERK_ONGELDIG",
        resultaat: "AFKEUR",
        severity: "error",
        boodschap: `${naamR} (${gymR}): ${redenR || "geen geldig keurmerk op eventdatum."}`,
      });
    }

    if (!skipLicentieEnKeurmerk && hasBlauw && isBelgischeSportschoolCtx(ctx, "blauw")) {
      pushTournamentUniquePersonHit(ctx, "blauw", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Belgische sportschool controleren",
        rule_code: "TOERNOOI_KEURMERK_BE",
        resultaat: "INFO",
        severity: "info",
        boodschap: `${naamB} (${gymB}): ${redenB}`,
      });
    } else if (!skipLicentieEnKeurmerk && hasBlauw && kB == null) {
      pushTournamentUniquePersonHit(ctx, "blauw", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Sportschool niet gevonden",
        rule_code: "TOERNOOI_SPORTSCHOOL_NIET_GEVONDEN",
        resultaat: "ACTIE",
        severity: "warning",
        boodschap: `${naamB} (${gymB}): ${redenB || "sportschool niet gevonden of niet controleerbaar op eventdatum."}`,
      });
    } else if (!skipLicentieEnKeurmerk && hasBlauw && kB === false) {
      pushTournamentUniquePersonHit(ctx, "blauw", {
        matchmaking_id,
        bout_id,
        partij_nr: null,
        rule: "Keurmerk sportschool ongeldig",
        rule_code: "TOERNOOI_KEURMERK_ONGELDIG",
        resultaat: "AFKEUR",
        severity: "error",
        boodschap: `${naamB} (${gymB}): ${redenB || "geen geldig keurmerk op eventdatum."}`,
      });
    }

    const ageR = ageOnEventFromCtx(ctx, "rood");
    const ageB = ageOnEventFromCtx(ctx, "blauw");
    if (hasRood && hasBlauw && typeof ageR === "number" && typeof ageB === "number") {
      const mix = (ageR < 18 && ageB >= 18) || (ageB < 18 && ageR >= 18);
      if (mix) {
        pushTournamentUniquePairHit(
          ctx,
          {
            matchmaking_id,
            bout_id,
            partij_nr: null,
            rule: "Jeugd vs volwassen verboden",
            rule_code: "TOERNOOI_JEUGD_VOLWASSEN_MIX",
            resultaat: "VERBOD",
            severity: "error",
            boodschap: formatTournamentPairMessage(ctx, "jeugd/volwassen mix niet toegestaan."),
          },
          "mix"
        );
      }
    }

    const jeugd = isJeugdFromCtx(ctx);
    if (hasRood && hasBlauw && jeugd) {
      const dobR = parseIsoDateOnly(ctx?.rood_geboortedatum_fp ?? ctx?.rood_geboortedatum);
      const dobB = parseIsoDateOnly(ctx?.blauw_geboortedatum_fp ?? ctx?.blauw_geboortedatum);
      const lv = leeftijdsVerschilJeugd(dobR, dobB);

      if (lv.type === "DISPENSATIE" || lv.type === "VERBOD") {
        const resultText =
          lv.type === "VERBOD"
            ? `leeftijdsverschil ${lv.diffMonths} maanden en ${lv.diffDaysRemainder} dagen. Vanaf 24 maanden is dit verboden.`
            : `leeftijdsverschil ${lv.diffMonths} maanden en ${lv.diffDaysRemainder} dagen. Vanaf 18 maanden is dispensatie vereist.`;

        pushTournamentUniquePairHit(
          ctx,
          {
            matchmaking_id,
            bout_id,
            partij_nr: null,
            rule: "Jeugd leeftijdsverschil",
            rule_code: "TOERNOOI_JEUGD_LEEFTIJD",
            resultaat: lv.type,
            severity: lv.type === "VERBOD" ? "error" : "warning",
            boodschap: formatTournamentPairMessage(ctx, resultText),
          },
          `age-${lv.type}`
        );
      }

      if (isMmaBout(ctx)) {
        const bandR = mmaJeugdAgeBand(ageR);
        const bandB = mmaJeugdAgeBand(ageB);

        if (bandR && bandB && bandR.label !== bandB.label) {
          pushTournamentUniquePairHit(
            ctx,
            {
              matchmaking_id,
              bout_id,
              partij_nr: null,
              rule: "MMA jeugd verschillende leeftijdscategorie",
              rule_code: "TOERNOOI_MMA_JEUGD_CAT",
              resultaat: "AFKEUR",
              severity: "error",
              boodschap: formatTournamentPairMessage(
                ctx,
                `${naamR} zit in categorie ${bandR.label} en ${naamB} in categorie ${bandB.label}.`
              ),
            },
            `${bandR.label}-${bandB.label}`
          );
        }
      }

      const effR = getEffectiveYouthFights(ctx, "rood");
      const effB = getEffectiveYouthFights(ctx, "blauw");
      if (effR != null && effB != null) {
        const verschil = Math.abs(effR - effB);
        const minEff = Math.min(effR, effB);
        if (minEff < 15 && verschil > 4) {
          pushTournamentUniquePairHit(
            ctx,
            {
              matchmaking_id,
              bout_id,
              partij_nr: null,
              rule: "Jeugd partijverschil te groot",
              rule_code: "TOERNOOI_JEUGD_PARTIJVERSCHIL",
              resultaat: "DISPENSATIE",
              severity: "warning",
              boodschap: formatTournamentPairMessage(
                ctx,
                `partijverschil is ${verschil}. ${naamR} heeft ${effR} partijen en ${naamB} heeft ${effB} partijen. Zolang één van beide minder dan 15 partijen heeft, is maximaal 4 verschil toegestaan.`
              ),
            },
            `fights-${verschil}`
          );
        }
      }

      const gewichtR = parseWeightKg(ctx?.rood_gewicht_fp ?? ctx?.rood_gewicht_mm ?? ctx?.rood_gewicht);
      const gewichtB = parseWeightKg(ctx?.blauw_gewicht_fp ?? ctx?.blauw_gewicht_mm ?? ctx?.blauw_gewicht);
      if (gewichtR != null && gewichtB != null) {
        const verschilKg = Math.abs(gewichtR - gewichtB);
        if (verschilKg > 3) {
          pushTournamentUniquePairHit(
            ctx,
            {
              matchmaking_id,
              bout_id,
              partij_nr: null,
              rule: "Jeugd gewichtsverschil te groot",
              rule_code: "TOERNOOI_JEUGD_GEWICHT",
              resultaat: "DISPENSATIE",
              severity: "warning",
              boodschap: formatTournamentPairMessage(
                ctx,
                `gewichtsverschil is ${verschilKg.toFixed(1)} kg. Bij jeugd is maximaal 3,0 kg verschil toegestaan.`
              ),
            },
            `weight-${verschilKg.toFixed(1)}`
          );
        }
      }
    }

    const boutKlasseText = String(ctx?.klasse_mm ?? "").trim();
    const isJeugdToernooiKlasse = isJeugdKlasseText(boutKlasseText);

    if (isJeugdToernooiKlasse) {
      const roodJeugdKlasse = isJeugdKlasseText(ctx?.rood_nulmeting_klasse);
      const blauwJeugdKlasse = isJeugdKlasseText(ctx?.blauw_nulmeting_klasse);

      if (hasRood && !roodJeugdKlasse) {
        pushTournamentUniquePersonHit(ctx, "rood", {
          matchmaking_id,
          bout_id,
          partij_nr: null,
          rule: "Niet juiste klasse",
          rule_code: "TOERNOOI_JEUGD_VERKEERDE_KLASSE",
          resultaat: "ACTIE",
          severity: "warning",
          boodschap: `${naamR} hoort niet in ${boutKlasseText || toernooiCode}. FightPassport/nulmeting klasse: ${String(ctx?.rood_nulmeting_klasse ?? "onbekend").trim() || "onbekend"}.`,
        });
      }

      if (hasBlauw && !blauwJeugdKlasse) {
        pushTournamentUniquePersonHit(ctx, "blauw", {
          matchmaking_id,
          bout_id,
          partij_nr: null,
          rule: "Niet juiste klasse",
          rule_code: "TOERNOOI_JEUGD_VERKEERDE_KLASSE",
          resultaat: "ACTIE",
          severity: "warning",
          boodschap: `${naamB} hoort niet in ${boutKlasseText || toernooiCode}. FightPassport/nulmeting klasse: ${String(ctx?.blauw_nulmeting_klasse ?? "onbekend").trim() || "onbekend"}.`,
        });
      }
    }

    const volwassenen = isVolwassenePair(ctx);
    if (hasRood && hasBlauw && volwassenen && isKickboksMuayThai(ctx)) {
      const boutK = parseKbMmKlasseToLetter(ctx?.klasse_mm);
      if (boutK) {
        const rowsR = vaRood ? (uitslagenByVa.get(vaRood) ?? []) : [];
        const rowsB = vaBlauw ? (uitslagenByVa.get(vaBlauw) ?? []) : [];

        const fallbackR = fallbackAdultKbMtKlasseFromNulmeting(ctx, "rood");
        const fallbackB = fallbackAdultKbMtKlasseFromNulmeting(ctx, "blauw");

        const baseR = getAdultKbMtBaseKlasse(ctx, "rood", rowsR);
        const baseB = getAdultKbMtBaseKlasse(ctx, "blauw", rowsB);

        const recR = recordInKlasse(rowsR, baseR);
        const recB = recordInKlasse(rowsB, baseB);

        const roodK = promoteFrom(baseR, recR.wins, recR.total);
        const blauwK = promoteFrom(baseB, recB.wins, recB.total);

        const promoR = getMandatoryPromotionInfo(baseR, recR.wins, recR.total);
        const promoB = getMandatoryPromotionInfo(baseB, recB.wins, recB.total);

        if (hasRood && promoR && boutK && idxKlasse(boutK) < idxKlasse(promoR.to)) {
          pushTournamentUniquePersonHit(
            ctx,
            "rood",
            buildMandatoryPromotionHit({
              matchmaking_id,
              partij_nr: null,
              bout_id,
              hoek: "rood",
              naam: naamR,
              boutK,
              promotion: promoR,
              toernooiCode,
            })
          );
        }

        if (hasBlauw && promoB && boutK && idxKlasse(boutK) < idxKlasse(promoB.to)) {
          pushTournamentUniquePersonHit(
            ctx,
            "blauw",
            buildMandatoryPromotionHit({
              matchmaking_id,
              partij_nr: null,
              bout_id,
              hoek: "blauw",
              naam: naamB,
              boutK,
              promotion: promoB,
              toernooiCode,
            })
          );
        }

        // Toernooi-klasse blijft strikt voor verplicht lagere/hogere klasse,
        // maar N -> C met precies 3 N-winst is toegestaan omdat dit "mag naar C" is.
        const roodToernooiOk = canFightAdultKbMtBoutClassFromRecord({
          fighterKlasse: roodK,
          boutK,
          baseK: baseR,
          winsInBase: recR.wins,
          totalInBase: recR.total,
        });
        const blauwToernooiOk = canFightAdultKbMtBoutClassFromRecord({
          fighterKlasse: blauwK,
          boutK,
          baseK: baseB,
          winsInBase: recB.wins,
          totalInBase: recB.total,
        });

        if (hasRood && !roodToernooiOk) {
          pushTournamentUniquePersonHit(ctx, "rood", {
            matchmaking_id,
            bout_id,
            partij_nr: null,
            rule: "Dispensatie nodig voor klasse",
            rule_code: "TOERNOOI_VOLWASSEN_VERKEERDE_KLASSE",
            resultaat: "DISPENSATIE",
            severity: "warning",
            boodschap: `${naamR} staat in klasse ${boutK}, maar hoort volgens de controle in klasse ${roodK}. Vraag dispensatie aan of pas de klasse aan.`,
          });
        }

        if (hasBlauw && !blauwToernooiOk) {
          pushTournamentUniquePersonHit(ctx, "blauw", {
            matchmaking_id,
            bout_id,
            partij_nr: null,
            rule: "Dispensatie nodig voor klasse",
            rule_code: "TOERNOOI_VOLWASSEN_VERKEERDE_KLASSE",
            resultaat: "DISPENSATIE",
            severity: "warning",
            boodschap: `${naamB} staat in klasse ${boutK}, maar hoort volgens de controle in klasse ${blauwK}. Vraag dispensatie aan of pas de klasse aan.`,
          });
        }
      }
    }
  }

  return hits;
}


function makeRuleHitUserFriendly(hit: RuleHit): RuleHit {
  const clean = (v: any) => String(v ?? "")
    .replace(/\bMM\b/g, "matchmaking")
    .replace(/FightPassport\/nulmeting\/promotie/gi, "de controle")
    .replace(/FightPassport\/nulmeting/gi, "de controle")
    .replace(/FightPassport/gi, "FightPassport")
    .replace(/scrape-info/gi, "gegevens")
    .replace(/scrape/gi, "controle")
    .replace(/\bctx\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const code = String(hit.rule_code ?? "").toUpperCase();
  let rule = clean(hit.rule);
  let boodschap = clean(hit.boodschap);

  if (code.includes("LICENT")) rule = "Licentie controleren";
  else if (code.includes("KEURMERK") || code.includes("SPORTSCHOOL")) rule = "Sportschool controleren";
  else if (code.includes("STARTVERBOD")) rule = "Startverbod";
  else if (code.includes("GEWICHT")) rule = hit.resultaat === "DISPENSATIE" ? "Dispensatie nodig voor gewicht" : "Gewicht controleren";
  else if (code.includes("LEEFTIJD")) rule = hit.resultaat === "VERBOD" ? "Leeftijdsverschil te groot" : "Leeftijd controleren";
  else if (code.includes("KLASSE_GEEN_BASIS") || code.includes("VERKEERDE_KLASSE")) rule = hit.resultaat === "DISPENSATIE" ? "Dispensatie nodig voor klasse" : "Verkeerde klasse";
  else if (code.includes("PROMOTIE")) rule = "Verplicht naar hogere klasse";
  else if (code.includes("GEEN_FIGHTPASSPORT_INFO")) rule = "Vechtergegevens controleren";
  else if (code.includes("VA_NUMMER") || code.includes("FIGHTPASPOORT")) rule = "FightPassport-nummer controleren";
  else if (code.includes("NAAM")) rule = "Naam controleren";
  else if (code.includes("R_KLASSE")) rule = "R-klasse controleren";

  if (!boodschap) {
    if (hit.resultaat === "DISPENSATIE") boodschap = "Voor deze partij is dispensatie nodig.";
    else if (hit.resultaat === "AFKEUR") boodschap = "Deze partij voldoet niet aan de regels. Pas de gegevens aan of keur de partij af.";
    else if (hit.resultaat === "VERBOD") boodschap = "Deze partij mag niet doorgaan volgens de regels.";
    else if (hit.resultaat === "ACTIE") boodschap = "Controleer deze partij handmatig.";
    else boodschap = "Geen bijzonderheden.";
  }

  return { ...hit, rule, boodschap };
}

export async function rulesEngine(opts: {
  controle_run_id: string;
  matchmaking_id: string;
  ctxRows: any[];
  scoped_bout_id?: string | null;
  scoped_partij_nr?: number | null;
}) {
  const { controle_run_id, matchmaking_id, ctxRows } = opts;

  const scopedBoutId = unwrapUuid(opts?.scoped_bout_id);
  const scopedPartijNr =
    opts?.scoped_partij_nr != null && Number.isFinite(Number(opts.scoped_partij_nr))
      ? Number(opts.scoped_partij_nr)
      : null;

  const rowsInput = Array.isArray(ctxRows) ? ctxRows : ctxRows ? [ctxRows] : [];

  const vaSet = new Set<string>();
  for (const ctx of rowsInput) {
    const roodVa = getCtxVa(ctx, "rood");
    const blauwVa = getCtxVa(ctx, "blauw");
    if (roodVa) vaSet.add(roodVa);
    if (blauwVa) vaSet.add(blauwVa);
  }

  const centralFighterByVa = await fetchFightPassportFightersByVa([...vaSet]);
  const rowsRaw = rowsInput.map((ctx) => applyCentralFightersToCtx(ctx, centralFighterByVa));

  const rows = rowsRaw.filter((ctx) => {
    const ctxBoutId = unwrapUuid(ctx?.bout_id);
    const ctxPartijNr = asInt(ctx?.partij_nr);

    if (scopedBoutId) return ctxBoutId === scopedBoutId;
    if (scopedPartijNr != null) return ctxPartijNr === scopedPartijNr;
    return true;
  });

  const legacyTournamentRows = rows.filter((ctx) => isToernooiCtx(ctx));
  const normalRows = rows.filter((ctx) => !isToernooiCtx(ctx));

  // Toernooi moet op de actuele/verrijkte controle_toernooi_context draaien.
  // controle_bout_context kan nog oude MM/raw sportschooltekst bevatten (bv. "Team Elite"),
  // terwijl controle_toernooi_context na correctie al "Team Elite rijen" bevat.
  // Daarom gebruiken we legacy toernooi-rows uit controle_bout_context alleen als fallback.
  const toernooiContextRows = scopedBoutId || scopedPartijNr != null
    ? []
    : await fetchToernooiContextRows({ controle_run_id, matchmaking_id });

  const toernooiPairRows = buildTournamentPairRowsFromParticipants(toernooiContextRows);
  const tournamentRows = toernooiPairRows.length > 0 ? toernooiPairRows : legacyTournamentRows;

  const tournamentHits = tournamentRows.length
    ? await runTournamentRules({
        controle_run_id,
        matchmaking_id,
        rows: tournamentRows,
        scoped_bout_id: scopedBoutId,
        scoped_partij_nr: scopedPartijNr,
      })
    : [];

  if (!normalRows.length) {
    await saveControleResultaten({
      controle_run_id,
      matchmaking_id,
      hits: tournamentHits,
      ...(scopedBoutId ? { bout_id: scopedBoutId } : {}),
      ...(scopedBoutId == null && scopedPartijNr != null ? { partij_nr: scopedPartijNr } : {}),
    });

    return tournamentHits;
  }

  const hits: RuleHit[] = [];
  const pushHit = (h: RuleHit) => hits.push(h);

  const tournamentSeen = new Set<string>();

  function pushHitTournamentAware(h: RuleHit, ctx?: any) {
    if (!ctx || !isToernooiCtx(ctx)) {
      hits.push(h);
      return;
    }

    const scopeKey = buildTournamentScopeKey({
      ctx,
      hoek: h.hoek ?? null,
      rule_code: h.rule_code,
    });

    if (!scopeKey) {
      if (h.hoek === "rood" || h.hoek === "blauw") {
        hits.push(withTournamentFighterFields(h, ctx, h.hoek));
      } else {
        hits.push(withTournamentFighterFields({ ...h, hoek: "rood" }, ctx, "rood"));
        hits.push(withTournamentFighterFields({ ...h, hoek: "blauw" }, ctx, "blauw"));
      }
      return;
    }

    if (tournamentSeen.has(scopeKey)) return;
    tournamentSeen.add(scopeKey);

    if (h.hoek === "rood" || h.hoek === "blauw") {
      hits.push(withTournamentFighterFields(h, ctx, h.hoek));
    } else {
      hits.push(withTournamentFighterFields({ ...h, hoek: "rood" }, ctx, "rood"));
      hits.push(withTournamentFighterFields({ ...h, hoek: "blauw" }, ctx, "blauw"));
    }
  }

  const uitslagenVaSet = new Set<string>();
  for (const ctx of rows) {
    const roodVa = getCtxVa(ctx, "rood");
    const blauwVa = getCtxVa(ctx, "blauw");
    if (roodVa) uitslagenVaSet.add(roodVa);
    if (blauwVa) uitslagenVaSet.add(blauwVa);
  }
  const vaList = [...uitslagenVaSet];

  const uitslagenByVa = await fetchUitslagenByVa({
    matchmaking_id,
    controle_run_id,
    vaList,
  });

  for (const ctx of normalRows) {
    const partij_nr = asInt(ctx?.partij_nr);
    const bout_id = unwrapUuid(ctx?.bout_id);

    const vaRood = String(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.va_rood_mm ?? "").trim();
    const vaBlauw = String(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.va_blauw_mm ?? "").trim();
    const hasRood = true;
    const hasBlauw = true;
    const skipLicentieEnKeurmerk = isPureBoksenZonderLicentieKeurmerk(ctx);

    if (!skipLicentieEnKeurmerk && !vaRood) {
      const naam = getFighterDisplayName(ctx, "rood");

      pushTournamentPersonHit(
        hits,
        tournamentSeen,
        {
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "Fightpaspoort nummer ontbreekt",
          rule_code: "FIGHTPASPOORT_ONTBREEKT",
          resultaat: "AFKEUR",
          severity: "error",
          boodschap: `${naam} heeft geen Fightpaspoort nummer. Zonder Fightpaspoort nummer is er geen deelname mogelijk.`,
        },
        ctx,
        "rood"
      );
    }

    if (!skipLicentieEnKeurmerk && hasBlauw && !vaBlauw) {
      const naam = getFighterDisplayName(ctx, "blauw");

      pushTournamentPersonHit(
        hits,
        tournamentSeen,
        {
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "Fightpaspoort nummer ontbreekt",
          rule_code: "FIGHTPASPOORT_ONTBREEKT",
          resultaat: "AFKEUR",
          severity: "error",
          boodschap: `${naam} heeft geen Fightpaspoort nummer. Zonder Fightpaspoort nummer is er geen deelname mogelijk.`,
        },
        ctx,
        "blauw"
      );
    }

    const roodHeeftFightPassportInfo =
      skipLicentieEnKeurmerk || !vaRood || hasFightPassportScrapeInfo(ctx, "rood");
    const blauwHeeftFightPassportInfo =
      skipLicentieEnKeurmerk || !vaBlauw || hasFightPassportScrapeInfo(ctx, "blauw");

    if (!skipLicentieEnKeurmerk && vaRood && !roodHeeftFightPassportInfo) {
      pushTournamentPersonHit(
        hits,
        tournamentSeen,
        buildGeenFightPassportInfoHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          hoek: "rood",
          naam: getFighterDisplayName(ctx, "rood"),
          va: vaRood,
        }),
        ctx,
        "rood"
      );
    }

    if (!skipLicentieEnKeurmerk && vaBlauw && !blauwHeeftFightPassportInfo) {
      pushTournamentPersonHit(
        hits,
        tournamentSeen,
        buildGeenFightPassportInfoHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          hoek: "blauw",
          naam: getFighterDisplayName(ctx, "blauw"),
          va: vaBlauw,
        }),
        ctx,
        "blauw"
      );
    }

    const jeugd = isJeugdFromCtx(ctx);
    const volwassenen = isVolwassenePair(ctx);
    const mma = isMmaBout(ctx);
    const mmaJeugd = jeugd && mma;

    {
      const boutIsJPlus = isJeugdTalentstatusKlasse(ctx?.klasse_mm);
      const talentInfo = getTalentstatusInfo(ctx);

      if (boutIsJPlus) {
        for (const hoek of ["rood", "blauw"] as const) {
          const heeftTalentstatus = hoek === "rood" ? talentInfo.roodHeeft : talentInfo.blauwHeeft;
          const naam = getFighterDisplayName(ctx, hoek);
          const va = getTournamentVaNummerFromCtx(ctx, hoek) ??
            (hoek === "rood" ? ctx?.rood_va_mm : ctx?.blauw_va_mm) ??
            "onbekend";

          pushHitTournamentAware(
            {
              matchmaking_id,
              partij_nr,
              bout_id,
              hoek,
              rule: heeftTalentstatus ? "J+ talentstatus akkoord" : "J+ talentstatus ontbreekt",
              rule_code: heeftTalentstatus
                ? `JPLUS_TALENTSTATUS_AKKOORD_${hoek.toUpperCase()}`
                : `JPLUS_TALENTSTATUS_ONTBREEKT_${hoek.toUpperCase()}`,
              resultaat: heeftTalentstatus ? "INFO" : "AFKEUR",
              severity: heeftTalentstatus ? "info" : "error",
              boodschap: heeftTalentstatus
                ? `${naam} (VA ${va}) heeft talentstatus in de nulmeting-opmerking. Akkoord voor J+.`
                : `${naam} (VA ${va}) heeft geen talentstatus in de nulmeting-opmerking. J+ niet akkoord.`,
            },
            ctx
          );
        }
      }
    }

    {
      const dopingCertificaatVerplicht = isDopingCertificaatVerplichtVoorPartij(ctx);
      const dopingInfo = getDopingCertificaatInfo(ctx);

      if (dopingCertificaatVerplicht) {
        for (const hoek of ["rood", "blauw"] as const) {
          const heeftCertificaat = hoek === "rood" ? dopingInfo.roodHeeft : dopingInfo.blauwHeeft;
          const naam = getFighterDisplayName(ctx, hoek);
          const va = getTournamentVaNummerFromCtx(ctx, hoek) ??
            (hoek === "rood" ? ctx?.rood_va_mm : ctx?.blauw_va_mm) ??
            "onbekend";

          pushHitTournamentAware(
            {
              matchmaking_id,
              partij_nr,
              bout_id,
              hoek,
              rule: heeftCertificaat ? "Dopingcertificaat akkoord" : "Dopingcertificaat ontbreekt",
              rule_code: heeftCertificaat
                ? `DOPINGCERTIFICAAT_AKKOORD_${hoek.toUpperCase()}`
                : `DOPINGCERTIFICAAT_ONTBREEKT_${hoek.toUpperCase()}`,
              resultaat: heeftCertificaat ? "INFO" : "AFKEUR",
              severity: heeftCertificaat ? "info" : "error",
              boodschap: heeftCertificaat
                ? `${naam} (VA ${va}) heeft het dopingcertificaat behaald. Akkoord voor deze A-, B- of Pro-partij.`
                : `${naam} (VA ${va}) heeft geen behaald dopingcertificaat in de nulmeting-opmerking. A-, B- of Pro-partij niet akkoord.`,
            },
            ctx
          );
        }
      }
    }

    {
      const ageR = ageOnEventFromCtx(ctx, "rood");
      const ageB = ageOnEventFromCtx(ctx, "blauw");

      if (typeof ageR === "number" && ageR >= 40) {
        pushHitTournamentAware(
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            hoek: "rood",
            rule: "Sportmedisch advies vereist 40+ (rood)",
            rule_code: "SPORTMEDISCH_ADVIES_40PLUS_ROOD",
            resultaat: "ACTIE",
            severity: "warning",
            boodschap: `Rood is op eventdatum ${ageR} jaar. Vanaf 40 jaar is sportmedisch advies van een sportarts nodig.`,
          },
          ctx
        );
      }

      if (typeof ageB === "number" && ageB >= 40) {
        pushHitTournamentAware(
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            hoek: "blauw",
            rule: "Sportmedisch advies vereist 40+ (blauw)",
            rule_code: "SPORTMEDISCH_ADVIES_40PLUS_BLAUW",
            resultaat: "ACTIE",
            severity: "warning",
            boodschap: `Blauw is op eventdatum ${ageB} jaar. Vanaf 40 jaar is sportmedisch advies van een sportarts nodig.`,
          },
          ctx
        );
      }
    }

    {
      const ageR = ageOnEventFromCtx(ctx, "rood");
      const ageB = ageOnEventFromCtx(ctx, "blauw");

      if (hasRood && hasBlauw && typeof ageR === "number" && typeof ageB === "number") {
        const mix = (ageR < 18 && ageB >= 18) || (ageB < 18 && ageR >= 18);
        if (mix) {
          pushHit({
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Jeugd vs volwassen verboden",
            rule_code: "JEUGD_vs_VOLWASSEN_AFKEUR",
            resultaat: "VERBOD",
            severity: "error",
            boodschap: `Rood leeftijd (event): ${ageR} • Blauw leeftijd (event): ${ageB} — mix jeugd/volwassen is niet toegestaan (VERBOD).`,
          });
        }
      }
    }

    {
      const roodNaamMM = ctx?.rood_naam_mm;
      const roodNaamFP = ctx?.rood_naam_fp ?? ctx?.rood_naam_scrape;
      const blauwNaamMM = ctx?.blauw_naam_mm;
      const blauwNaamFP = ctx?.blauw_naam_fp ?? ctx?.blauw_naam_scrape;

      if (roodHeeftFightPassportInfo && !nameSimilar(roodNaamMM, roodNaamFP)) {
        pushHitTournamentAware(
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Naam klopt niet met FightPassport (rood)",
            rule_code: "NAAM_KLOPT_NIET_MET_FIGHTPASSPORT_ROOD",
            resultaat: "ACTIE",
            severity: "warning",
            boodschap: `Rood naam matchmaker ("${roodNaamMM ?? "-"}") wijkt af van FightPassport ("${roodNaamFP ?? "-"}"). Controleer VA/vechter.`,
            hoek: "rood",
          },
          ctx
        );
      }

      if (blauwHeeftFightPassportInfo && !nameSimilar(blauwNaamMM, blauwNaamFP)) {
        pushHitTournamentAware(
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Naam klopt niet met FightPassport (blauw)",
            rule_code: "NAAM_KLOPT_NIET_MET_FIGHTPASSPORT_BLAUW",
            resultaat: "ACTIE",
            severity: "warning",
            boodschap: `Blauw naam matchmaker ("${blauwNaamMM ?? "-"}") wijkt af van FightPassport ("${blauwNaamFP ?? "-"}"). Controleer VA/vechter.`,
            hoek: "blauw",
          },
          ctx
        );
      }
    }

    {
      const kR = ctx?.keurmerk_rood;
      const kB = ctx?.keurmerk_blauw;
      const redenR = String(ctx?.keurmerk_reden_rood ?? "").trim();
      const redenB = String(ctx?.keurmerk_reden_blauw ?? "").trim();

      if (!skipLicentieEnKeurmerk && hasRood && roodHeeftFightPassportInfo && isBelgischeSportschoolCtx(ctx, "rood")) {
        const naam = getFighterDisplayName(ctx, "rood");
        const gym = getFighterGymName(ctx, "rood");

        pushTournamentPersonHit(
          hits,
          tournamentSeen,
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Belgische sportschool (check BKBMO)",
            rule_code: "KEURMERK_BE_INFO",
            resultaat: "INFO",
            severity: "info",
            boodschap: `${naam} (${gym}): ${redenR}`,
          },
          ctx,
          "rood"
        );
      }

      if (!skipLicentieEnKeurmerk && hasBlauw && blauwHeeftFightPassportInfo && isBelgischeSportschoolCtx(ctx, "blauw")) {
        const naam = getFighterDisplayName(ctx, "blauw");
        const gym = getFighterGymName(ctx, "blauw");

        pushTournamentPersonHit(
          hits,
          tournamentSeen,
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Belgische sportschool (check BKBMO)",
            rule_code: "KEURMERK_BE_INFO",
            resultaat: "INFO",
            severity: "info",
            boodschap: `${naam} (${gym}): ${redenB}`,
          },
          ctx,
          "blauw"
        );
      }

      if (!skipLicentieEnKeurmerk && roodHeeftFightPassportInfo && kR == null) {
        const naam = getFighterDisplayName(ctx, "rood");
        const gym = getFighterGymName(ctx, "rood");

        pushTournamentPersonHit(
          hits,
          tournamentSeen,
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Sportschool niet gevonden",
            rule_code: "SPORTSCHOOL_NIET_GEVONDEN",
            resultaat: "ACTIE",
            severity: "warning",
            boodschap: `${naam} (${gym}): ${redenR || "NL gym: gym match onzeker."}`,
          },
          ctx,
          "rood"
        );
      } else if (!skipLicentieEnKeurmerk && hasRood && roodHeeftFightPassportInfo && kR === false) {
        const naam = getFighterDisplayName(ctx, "rood");
        const gym = getFighterGymName(ctx, "rood");

        pushTournamentPersonHit(
          hits,
          tournamentSeen,
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Keurmerk NL sportschool ongeldig",
            rule_code: "KEURMERK_ONGELDIG",
            resultaat: "AFKEUR",
            severity: "error",
            boodschap: `${naam} (${gym}): ${
              redenR || "NL gym: geen geldig keurmerk (ontbreekt/verlopen)."
            }`,
          },
          ctx,
          "rood"
        );
      }

      if (!skipLicentieEnKeurmerk && blauwHeeftFightPassportInfo && kB == null) {
        const naam = getFighterDisplayName(ctx, "blauw");
        const gym = getFighterGymName(ctx, "blauw");

        pushTournamentPersonHit(
          hits,
          tournamentSeen,
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Sportschool niet gevonden",
            rule_code: "SPORTSCHOOL_NIET_GEVONDEN",
            resultaat: "ACTIE",
            severity: "warning",
            boodschap: `${naam} (${gym}): ${redenB || "NL gym: gym match onzeker."}`,
          },
          ctx,
          "blauw"
        );
      } else if (!skipLicentieEnKeurmerk && hasBlauw && blauwHeeftFightPassportInfo && kB === false) {
        const naam = getFighterDisplayName(ctx, "blauw");
        const gym = getFighterGymName(ctx, "blauw");

        pushTournamentPersonHit(
          hits,
          tournamentSeen,
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Keurmerk NL sportschool ongeldig",
            rule_code: "KEURMERK_ONGELDIG",
            resultaat: "AFKEUR",
            severity: "error",
            boodschap: `${naam} (${gym}): ${
              redenB || "NL gym: geen geldig keurmerk (ontbreekt/verlopen)."
            }`,
          },
          ctx,
          "blauw"
        );
      }
    }

    {
      const gR = parseGender(ctx?.rood_geslacht);
      const gB = parseGender(ctx?.blauw_geslacht);

      if (gR && gB && gR !== gB) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "Man tegen vrouw niet toegestaan",
          rule_code: "GESLACHT_AFKEUR",
          resultaat: "VERBOD",
          severity: "error",
          boodschap: `Rood is ${gR === "M" ? "man" : "vrouw"} en Blauw is ${
            gB === "M" ? "man" : "vrouw"
          } — VERBOD.`,
        });
      }
    }

    {
      const sbR = normLower(ctx?.rood_heeft_startverbod);
      const sbB = normLower(ctx?.blauw_heeft_startverbod);
      const sbR_has = sbR === "ja" || sbR === "true" || sbR === "1";
      const sbB_has = sbB === "ja" || sbB === "true" || sbB === "1";

      if (roodHeeftFightPassportInfo && sbR_has) {
        pushHitTournamentAware(
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            hoek: "rood",
            rule: "Vechter heeft startverbod (rood)",
            rule_code: "STARTVERBOD_ROOD",
            resultaat: "VERBOD",
            severity: "error",
            boodschap: "Rood heeft een startverbod — VERBOD.",
          },
          ctx
        );
      }

      if (blauwHeeftFightPassportInfo && sbB_has) {
        pushHitTournamentAware(
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            hoek: "blauw",
            rule: "Vechter heeft startverbod (blauw)",
            rule_code: "STARTVERBOD_BLAUW",
            resultaat: "VERBOD",
            severity: "error",
            boodschap: "Blauw heeft een startverbod — VERBOD.",
          },
          ctx
        );
      }
    }

    {
      const licR = normLower(ctx?.rood_licentie);
      const licB = normLower(ctx?.blauw_licentie);

      const licR_ok =
        licR === "ja" ||
        licR === "j" ||
        licR === "true" ||
        licR === "1" ||
        licR === "geldig";
      const licB_ok =
        licB === "ja" ||
        licB === "j" ||
        licB === "true" ||
        licB === "1" ||
        licB === "geldig";

      if (!skipLicentieEnKeurmerk && roodHeeftFightPassportInfo && !licR_ok) {
        const naam = getFighterDisplayName(ctx, "rood");
        const licWaarde = String(ctx?.rood_licentie ?? "").trim() || "leeg";

        pushTournamentPersonHit(
          hits,
          tournamentSeen,
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Licentie ontbreekt of ongeldig",
            rule_code: "LICENTIE_ONGELDIG",
            resultaat: "AFKEUR",
            severity: "error",
            boodschap: `${naam} heeft geen geldige licentie (waarde: "${licWaarde}").`,
          },
          ctx,
          "rood"
        );
      }

      if (!skipLicentieEnKeurmerk && blauwHeeftFightPassportInfo && !licB_ok) {
        const naam = getFighterDisplayName(ctx, "blauw");
        const licWaarde = String(ctx?.blauw_licentie ?? "").trim() || "leeg";

        pushTournamentPersonHit(
          hits,
          tournamentSeen,
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Licentie ontbreekt of ongeldig",
            rule_code: "LICENTIE_ONGELDIG",
            resultaat: "AFKEUR",
            severity: "error",
            boodschap: `${naam} heeft geen geldige licentie (waarde: "${licWaarde}").`,
          },
          ctx,
          "blauw"
        );
      }
    }

    if (mma) {
      const minAge = minAgeEvent(ctx);

      if (typeof minAge === "number" && minAge < 12) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "MMA onder 12 jaar verboden",
          rule_code: "MMA_LEEFTIJD_AFKEUR",
          resultaat: "VERBOD",
          severity: "error",
          boodschap: `Minimale leeftijd in de partij is ${minAge} — MMA wedstrijden zijn verboden onder 12 jaar — VERBODEN.`,
        });
      }
    }

    if (mma && volwassenen) {
      const mmaLevelR = getMmaLevelFromCtx(ctx, "rood");
      const mmaLevelB = getMmaLevelFromCtx(ctx, "blauw");
      void mmaLevelR;
      void mmaLevelB;

      const vaR = String(ctx?.rood_va_mm ?? "").trim();
      const vaB = String(ctx?.blauw_va_mm ?? "").trim();
      const rowsR = vaR ? (uitslagenByVa.get(vaR) ?? []) : [];
      const rowsB = vaB ? (uitslagenByVa.get(vaB) ?? []) : [];

      let proCountR = 0;
      let amaCountR = 0;
      let proCountB = 0;
      let amaCountB = 0;

      for (const r of rowsR) {
        const level = parseMmaLevel(r?.klasse);
        if (level === "PRO") proCountR++;
        if (level === "AMATEUR") amaCountR++;
      }

      for (const r of rowsB) {
        const level = parseMmaLevel(r?.klasse);
        if (level === "PRO") proCountB++;
        if (level === "AMATEUR") amaCountB++;
      }

      const proFighterR = proCountR >= 3 && amaCountR === 0;
      const proFighterB = proCountB >= 3 && amaCountB === 0;
      const amateurNewR = amaCountR > 0 && proCountR === 0 && amaCountR < 3;
      const amateurNewB = amaCountB > 0 && proCountB === 0 && amaCountB < 3;

      if ((proFighterR && amateurNewB) || (proFighterB && amateurNewR)) {
        const proSide = proFighterR ? "rood" : "blauw";
        const amateurSide = proFighterR ? "blauw" : "rood";
        const proCount = proFighterR ? proCountR : proCountB;
        const amaCount = proFighterR ? amaCountB : amaCountR;

        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "MMA: Pro vs Amateur",
          rule_code: "MMA_PRO_VS_AMATEUR",
          resultaat: "DISPENSATIE",
          severity: "warning",
          boodschap: `${proSide.toUpperCase()} is Pro fighter (${proCount} pro wedstrijden) en ${amateurSide.toUpperCase()} is nieuweling Amateur (${amaCount} amateur wedstrijd${
            amaCount > 1 ? "en" : ""
          }) — DISPENSATIE vereist.`,
        });
      }
    }

    if (hasRood && hasBlauw && jeugd) {
      if (mmaJeugd) {
        const ageR = ageOnEventFromCtx(ctx, "rood");
        const ageB = ageOnEventFromCtx(ctx, "blauw");
        const bandR = mmaJeugdAgeBand(ageR);
        const bandB = mmaJeugdAgeBand(ageB);

        if (bandR && bandB && bandR.label !== bandB.label) {
          pushHit({
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "MMA jeugd: verschillende leeftijdscategorie",
            rule_code: "MMA_JEUGD_CAT_AFKEUR",
            resultaat: "AFKEUR",
            severity: "error",
            boodschap: `Rood valt in categorie ${bandR.label} (leeftijd ${ageR}) en Blauw in ${bandB.label} (leeftijd ${ageB}) — AFKEUR.`,
          });
        }
      } else {
        const dobR = parseIsoDateOnly(ctx?.rood_geboortedatum_fp);
        const dobB = parseIsoDateOnly(ctx?.blauw_geboortedatum_fp);
        const lv = leeftijdsVerschilJeugd(dobR, dobB);

        if (lv.type === "DISPENSATIE") {
          pushHit({
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Leeftijdsverschil 18-24 maanden (jeugd)",
            rule_code: "LEEFTIJD_VERSCHIL_JEUGD_DISPENSATIE",
            resultaat: "DISPENSATIE",
            severity: "warning",
            boodschap: `Leeftijdsverschil: ${lv.diffMonths} maanden en ${lv.diffDaysRemainder} dagen — vanaf 18 maanden verschil is DISPENSATIE vereist.`,
          });
        } else if (lv.type === "VERBOD") {
          pushHit({
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Leeftijdsverschil te groot (jeugd)",
            rule_code: "LEEFTIJD_VERSCHIL_JEUGD_AFKEUR",
            resultaat: "VERBOD",
            severity: "error",
            boodschap: `Leeftijdsverschil: ${lv.diffMonths} maanden en ${lv.diffDaysRemainder} dagen — vanaf 24 maanden verschil is dit een VERBOD.`,
          });
        }
      }
    }

    if (hasRood && hasBlauw && jeugd) {
      const countDemo = (rows2: any[]) =>
        (rows2 ?? []).reduce((acc, r) => {
          const s = String((r as any)?.uitslag ?? "").toLowerCase();
          return acc + (s.includes("demo") || s.includes("demonstr") ? 1 : 0);
        }, 0);

      const totalR = toInt(ctx?.rood_totaal_wedstrijden_scrape);
      const totalB = toInt(ctx?.blauw_totaal_wedstrijden_scrape);

      const vaR = String(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.va_rood_mm ?? "").trim();
      const vaB = String(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.va_blauw_mm ?? "").trim();
      const rowsR = vaR ? (uitslagenByVa.get(vaR) ?? []) : [];
      const rowsB = vaB ? (uitslagenByVa.get(vaB) ?? []) : [];

      const demoR =
        ctx?.rood_demo_totaal !== null && ctx?.rood_demo_totaal !== undefined
          ? toInt(ctx?.rood_demo_totaal)
          : countDemo(rowsR);

      const demoB =
        ctx?.blauw_demo_totaal !== null && ctx?.blauw_demo_totaal !== undefined
          ? toInt(ctx?.blauw_demo_totaal)
          : countDemo(rowsB);

      const effR = Math.max(0, totalR - demoR + Math.floor(demoR / 3));
      const effB = Math.max(0, totalB - demoB + Math.floor(demoB / 3));

      const hasPrimaryTotals =
        ctx?.rood_totaal_wedstrijden_scrape !== null &&
        ctx?.rood_totaal_wedstrijden_scrape !== undefined &&
        ctx?.blauw_totaal_wedstrijden_scrape !== null &&
        ctx?.blauw_totaal_wedstrijden_scrape !== undefined;

      if (!hasPrimaryTotals) {
        const tR = getCurrentTotalsAll(ctx?.rood_uitslagen_per_discipline);
        const tB = getCurrentTotalsAll(ctx?.blauw_uitslagen_per_discipline);
        const effR2 = effectiveFromTotals(tR);
        const effB2 = effectiveFromTotals(tB);

        if (effR2 == null || effB2 == null) {
          pushHit({
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Jeugd: partijverschil niet controleerbaar",
            rule_code: "JEUGD_PARTIJVERSCHIL_GEEN_INFO",
            resultaat: "ACTIE",
            severity: "warning",
            boodschap:
              "Geen (bruikbare) totalen gevonden voor rood en/of blauw — jeugd partijverschil-regel kan niet worden toegepast.",
          });
        } else {
          const verschil2 = Math.abs(effR2 - effB2);
          const minEff2 = Math.min(effR2, effB2);

          if (minEff2 < 15 && verschil2 > 4) {
            pushHit({
              matchmaking_id,
              partij_nr,
              bout_id,
              rule: "Jeugd: partijverschil te groot",
              rule_code: "PARTIJVERSCHIL_DISPENSATIE",
              resultaat: "DISPENSATIE",
              severity: "warning",
              boodschap: `Jeugd partijverschil: Rood ${effR2} partijen • Blauw ${effB2} partijen • Verschil ${verschil2}. Regel: zolang één van beide minder dan 15 partijen heeft, is maximaal 4 verschil toegestaan — DISPENSATIE vereist.`,
            });
          }
        }
      } else {
        const verschil = Math.abs(effR - effB);
        const minEff = Math.min(effR, effB);

        if (minEff < 15 && verschil > 4) {
          pushHit({
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Jeugd: partijverschil te groot",
            rule_code: "PARTIJVERSCHIL_DISPENSATIE",
            resultaat: "DISPENSATIE",
            severity: "warning",
            boodschap: `Jeugd partijverschil: Rood ${effR} partijen • Blauw ${effB} partijen • Verschil ${verschil}. Regel: zolang één van beide minder dan 15 partijen heeft, is maximaal 4 verschil toegestaan — DISPENSATIE vereist.`,
          });
        }
      }
    }

    if (hasRood && hasBlauw && volwassenen && isKickboksMuayThai(ctx)) {
      const boutK = parseKbMmKlasseToLetter(ctx?.klasse_mm);

      const vaR = String(ctx?.rood_va_mm ?? "").trim();
      const vaB = String(ctx?.blauw_va_mm ?? "").trim();
      const rowsR = vaR ? (uitslagenByVa.get(vaR) ?? []) : [];
      const rowsB = vaB ? (uitslagenByVa.get(vaB) ?? []) : [];

      const fallbackR = fallbackAdultKbMtKlasseFromNulmeting(ctx, "rood");
      const fallbackB = fallbackAdultKbMtKlasseFromNulmeting(ctx, "blauw");

      const baseR = getAdultKbMtBaseKlasse(ctx, "rood", rowsR);
      const baseB = getAdultKbMtBaseKlasse(ctx, "blauw", rowsB);

      const recR = recordInKlasse(rowsR, baseR);
      const recB = recordInKlasse(rowsB, baseB);

      const roodK = promoteFrom(baseR, recR.wins, recR.total);
      const blauwK = promoteFrom(baseB, recB.wins, recB.total);

      const promoR = getMandatoryPromotionInfo(baseR, recR.wins, recR.total);
      const promoB = getMandatoryPromotionInfo(baseB, recB.wins, recB.total);

      if (promoR && boutK && idxKlasse(boutK) < idxKlasse(promoR.to)) {
        pushHitTournamentAware(
          buildMandatoryPromotionHit({
            matchmaking_id,
            partij_nr,
            bout_id,
            hoek: "rood",
            naam: getFighterDisplayName(ctx, "rood"),
            boutK,
            promotion: promoR,
          }),
          ctx
        );
      }

      if (promoB && boutK && idxKlasse(boutK) < idxKlasse(promoB.to)) {
        pushHitTournamentAware(
          buildMandatoryPromotionHit({
            matchmaking_id,
            partij_nr,
            bout_id,
            hoek: "blauw",
            naam: getFighterDisplayName(ctx, "blauw"),
            boutK,
            promotion: promoB,
          }),
          ctx
        );
      }

      if (boutK === "R") {
        const naamR = getFighterDisplayName(ctx, "rood");
        const naamB = getFighterDisplayName(ctx, "blauw");

        const statsR = getRKlasseStats(rowsR);

        // Belangrijk: R-klasse ervaring uit fightpassport_results is toegestaan in de R-klasse.
        // Een eerdere versie gebruikte statsR.hasAnyExperience / totaal_wedstrijden_scrape
        // als harde afkeur, waardoor één normale R-partij onterecht werd gezien als
        // "wedstrijdervaring niet toegestaan". Voor R gelden alleen deze harde grenzen:
        // - geen jeugdverleden;
        // - geen N/C/B/A-verleden;
        // - maximaal 2 gewonnen R-partijen;
        // - maximaal 3 gevochten R-partijen.

        if (statsR.hasJeugd) {
          pushHitTournamentAware(
            {
              matchmaking_id,
              partij_nr,
              bout_id,
              hoek: "rood",
              rule: "R-klasse niet toegestaan na jeugdwedstrijden",
              rule_code: "R_KLASSE_JEUGD_VERLEDEN",
              resultaat: "AFKEUR",
              severity: "error",
              boodschap: `${naamR} heeft jeugdwedstrijd-ervaring in de uitslagenhistorie en mag daarom niet in de R-klasse uitkomen.`,
            },
            ctx
          );
        }
        if (statsR.hasOutsideR) {
          pushHitTournamentAware(
            {
              matchmaking_id,
              partij_nr,
              bout_id,
              hoek: "rood",
              rule: "Wedstrijdervaring in R niet toegestaan",
              rule_code: "R_KLASSE_WEDSTRIJDERVARIG",
              resultaat: "AFKEUR",
              severity: "error",
              boodschap: `${naamR} heeft wedstrijduitslagen (N/C/B/A) en mag daarom niet in de R-klasse uitkomen.`,
            },
            ctx
          );
        }
        if (statsR.rWins >= 2 || statsR.rTotal >= 3) {
          const redenR =
            statsR.rWins >= 2
              ? `${statsR.rWins} gewonnen R-klasse partijen`
              : `${statsR.rTotal} gevochten R-klasse partijen`;

          pushHitTournamentAware(
            {
              matchmaking_id,
              partij_nr,
              bout_id,
              hoek: "rood",
              rule: "R-klasse maximum bereikt",
              rule_code: "R_KLASSE_PROMOTIE_N",
              resultaat: "AFKEUR",
              severity: "error",
              boodschap: `${naamR} heeft al ${redenR} en moet daarom in de N-klasse uitkomen.`,
            },
            ctx
          );
        }

        const statsB = getRKlasseStats(rowsB);

        // Zie uitleg bij rood: R-klasse uitslagen tellen mee voor de R-limieten,
        // maar zijn op zichzelf geen verboden wedstrijdervaring.

        if (statsB.hasJeugd) {
          pushHitTournamentAware(
            {
              matchmaking_id,
              partij_nr,
              bout_id,
              hoek: "blauw",
              rule: "R-klasse niet toegestaan na jeugdwedstrijden",
              rule_code: "R_KLASSE_JEUGD_VERLEDEN",
              resultaat: "AFKEUR",
              severity: "error",
              boodschap: `${naamB} heeft jeugdwedstrijd-ervaring in de uitslagenhistorie en mag daarom niet in de R-klasse uitkomen.`,
            },
            ctx
          );
        }
        if (statsB.hasOutsideR) {
          pushHitTournamentAware(
            {
              matchmaking_id,
              partij_nr,
              bout_id,
              hoek: "blauw",
              rule: "Wedstrijdervaring in R niet toegestaan",
              rule_code: "R_KLASSE_WEDSTRIJDERVARIG",
              resultaat: "AFKEUR",
              severity: "error",
              boodschap: `${naamB} heeft wedstrijduitslagen (N/C/B/A) en mag daarom niet in de R-klasse uitkomen.`,
            },
            ctx
          );
        }
        if (statsB.rWins >= 2 || statsB.rTotal >= 3) {
          const redenB =
            statsB.rWins >= 2
              ? `${statsB.rWins} gewonnen R-klasse partijen`
              : `${statsB.rTotal} gevochten R-klasse partijen`;

          pushHitTournamentAware(
            {
              matchmaking_id,
              partij_nr,
              bout_id,
              hoek: "blauw",
              rule: "R-klasse maximum bereikt",
              rule_code: "R_KLASSE_PROMOTIE_N",
              resultaat: "AFKEUR",
              severity: "error",
              boodschap: `${naamB} heeft al ${redenB} en moet daarom in de N-klasse uitkomen.`,
            },
            ctx
          );
        }
      }

      const roodOk =
        !roodHeeftFightPassportInfo ||
        canFightAdultKbMtBoutClassFromRecord({
          fighterKlasse: roodK,
          boutK,
          baseK: baseR,
          winsInBase: recR.wins,
          totalInBase: recR.total,
        });
      const blauwOk =
        !blauwHeeftFightPassportInfo ||
        canFightAdultKbMtBoutClassFromRecord({
          fighterKlasse: blauwK,
          boutK,
          baseK: baseB,
          winsInBase: recB.wins,
          totalInBase: recB.total,
        });

      // Geen automatische promotie op basis van jeugd-ervaring.
      // Vanaf 18 jaar is startpunt N. Jeugd kan wel reden zijn voor handmatige beoordeling,
      // maar moet nooit stilletjes C/B/A akkoord maken.
      const naamRood = getFighterDisplayName(ctx, "rood");
      const naamBlauw = getFighterDisplayName(ctx, "blauw");
      const requestedHigherThanN = !!boutK && idxKlasse(boutK) > idxKlasse("N");

      if (requestedHigherThanN && roodHeeftFightPassportInfo && !roodOk && roodK === "N") {
        // Volwassen uitslagen zijn leidend.
        // Jeugduitslagen mogen hier geen aparte meldingstekst meer veroorzaken:
        // als iemand hoger dan N staat zonder voldoende volwassen N/C/B/A-basis,
        // is dit gewoon een dispensatie voor klasse.
        pushHitTournamentAware(
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            hoek: "rood",
            rule: "Dispensatie nodig voor klasse",
            rule_code: "VOLWASSEN_KLASSE_GEEN_BASIS",
            resultaat: "DISPENSATIE",
            severity: "warning",
            boodschap: `${naamRood} staat in klasse ${boutK}, maar heeft volgens de controle onvoldoende volwassen basis voor deze klasse. Vraag dispensatie aan of pas de klasse aan.`,
          },
          ctx
        );
      }

      if (requestedHigherThanN && blauwHeeftFightPassportInfo && !blauwOk && blauwK === "N") {
        // Volwassen uitslagen zijn leidend.
        // Jeugduitslagen mogen hier geen aparte meldingstekst meer veroorzaken:
        // als iemand hoger dan N staat zonder voldoende volwassen N/C/B/A-basis,
        // is dit gewoon een dispensatie voor klasse.
        pushHitTournamentAware(
          {
            matchmaking_id,
            partij_nr,
            bout_id,
            hoek: "blauw",
            rule: "Dispensatie nodig voor klasse",
            rule_code: "VOLWASSEN_KLASSE_GEEN_BASIS",
            resultaat: "DISPENSATIE",
            severity: "warning",
            boodschap: `${naamBlauw} staat in klasse ${boutK}, maar heeft volgens de controle onvoldoende volwassen basis voor deze klasse. Vraag dispensatie aan of pas de klasse aan.`,
          },
          ctx
        );
      }

      if (boutK && (!roodOk || !blauwOk)) {
        const klasseDetails: string[] = [];
        const klasseActieDetails: string[] = [];

        const roodGeenBasisVoorHoger = requestedHigherThanN && roodHeeftFightPassportInfo && !roodOk && roodK === "N";
        const blauwGeenBasisVoorHoger = requestedHigherThanN && blauwHeeftFightPassportInfo && !blauwOk && blauwK === "N";

        if (!roodOk) {
          klasseDetails.push(`rood hoort in ${roodK}`);
          if (roodGeenBasisVoorHoger) {
            klasseActieDetails.push(`rood heeft geen volwassen basis voor ${boutK}`);
          }
        } else if (roodK === "R" && boutK === "N") {
          klasseDetails.push("rood akkoord: N is startklasse");
        }

        if (!blauwOk) {
          klasseDetails.push(`blauw hoort in ${blauwK}`);
          if (blauwGeenBasisVoorHoger) {
            klasseActieDetails.push(`blauw heeft geen volwassen basis voor ${boutK}`);
          }
        } else if (blauwK === "R" && boutK === "N") {
          klasseDetails.push("blauw akkoord: N is startklasse");
        }

        const alleenGeenBasisVoorHoger =
          (!roodOk || !blauwOk) &&
          (!roodOk ? roodGeenBasisVoorHoger : true) &&
          (!blauwOk ? blauwGeenBasisVoorHoger : true);

        if (!alleenGeenBasisVoorHoger) {
          pushHit({
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Dispensatie nodig voor klasse",
            rule_code: "VOLWASSEN_VERKEERDE_KLASSE",
            resultaat: "DISPENSATIE",
            severity: "warning",
            boodschap: `Deze partij staat in klasse ${boutK}, maar dat klopt niet. ${klasseDetails.join(" • ")}. Vraag dispensatie aan of pas de klasse aan.`,
          });
        }
      }
    }
  }

  const allHits = [...tournamentHits, ...hits].map(makeRuleHitUserFriendly);

  await saveControleResultaten({
    controle_run_id,
    matchmaking_id,
    hits: allHits,
    ...(scopedBoutId ? { bout_id: scopedBoutId } : {}),
    ...(scopedBoutId == null && scopedPartijNr != null ? { partij_nr: scopedPartijNr } : {}),
  });

  return allHits;
}
