// lib/rulesEngine.ts

import dayjs from "dayjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { saveControleResultaten } from "@/lib/control/saveControleResultaten";

import {
  estimateGalaTimeFromContextRows,
  formatMinutesNL,
  formatHoursQuarterNL,
} from "@/lib/galaTime";

type RuleResultaat = "OK" | "INFO" | "ACTIE" | "DISPENSATIE" | "AFKEUR" | "VERBOD";
type Severity = "info" | "ok" | "warning" | "error";

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
};

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

function normLower(v: any): string {
  return String(v ?? "").toLowerCase().trim();
}

function parseIsoDateOnly(v: any): dayjs.Dayjs | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = dayjs(s);
  return d.isValid() ? d : null;
}

/* ==========================================================
   Basis: jeugd/volwassen + “jongste regel geldt”
========================================================== */

function isJeugdFromCtx(ctx: any): boolean {
  // Primair: leeftijd op event-datum
  const r = asInt(ctx?.rood_leeftijd_event);
  const b = asInt(ctx?.blauw_leeftijd_event);
  if ((typeof r === "number" && r < 18) || (typeof b === "number" && b < 18)) return true;

  // Secundair/fallback: klasse-indicatie uit matchmaking.
  // ✅ J+ = Jeugd met talentstatus, maar valt onder de JEUGD-regels.
  const k = String(ctx?.klasse_mm ?? "").toUpperCase().replace(/\s+/g, " ").trim();
  if (k.includes("J+")) return true;

  // Extra: als matchmaker expliciet "Jeugd" in klasse zet
  if (k.includes("JEUGD")) return true;

  return false;
}

function isVolwassenePair(ctx: any): boolean {
  const r = asInt(ctx?.rood_leeftijd_event);
  const b = asInt(ctx?.blauw_leeftijd_event);
  return typeof r === "number" && r >= 18 && typeof b === "number" && b >= 18;
}

function minAgeEvent(ctx: any): number | null {
  const r = asInt(ctx?.rood_leeftijd_event);
  const b = asInt(ctx?.blauw_leeftijd_event);
  if (typeof r === "number" && typeof b === "number") return Math.min(r, b);
  if (typeof r === "number") return r;
  if (typeof b === "number") return b;
  return null;
}

/* ==========================================================
   Discipline: MMA herkennen
========================================================== */

function isMmaBout(ctx: any): boolean {
  const d = String(ctx?.discipline ?? "").toUpperCase();
  const sd = String(ctx?.sub_discipline ?? "").toUpperCase();
  const km = String(ctx?.klasse_mm ?? "").toUpperCase();
  const mmaToken = km === "P" || km === "PRO" || km === "AMA" || km === "AMATEUR";
  return d.includes("MMA") || sd.includes("MMA") || km.includes("MMA") || mmaToken;
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

/* ==========================================================
   Naam mismatch (ACTIE) — tolerant
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

function toInt(value: any): number {
  if (value === null || value === undefined) return 0;
  const n = parseInt(String(value), 10);
  return isNaN(n) ? 0 : n;
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

/* ==========================================================
   Geslacht
========================================================== */

function parseGender(v: any): "M" | "V" | null {
  const s = normLower(v);
  if (!s) return null;
  if (s === "m" || s.includes("man")) return "M";
  if (s === "v" || s.includes("vrouw")) return "V";
  return null;
}

/* ==========================================================
   Jeugd (niet-MMA): leeftijdsverschil maandenregel
========================================================== */

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
  const younger = dobR.isBefore(dobB) ? dobB : dobR;

  // ✅ We willen zowel 'maanden' als 'dagen' tonen (rapport/UI).
  const diffMonths = Math.abs(younger.diff(older, "month"));
  const afterMonths = older.add(diffMonths, "month");
  const diffDaysRemainder = Math.abs(younger.diff(afterMonths, "day"));
  const diffDaysTotal = Math.abs(younger.diff(older, "day"));

  const dispThreshold = older.add(18, "month").add(1, "day");
  const afkeurThreshold = older.add(24, "month");

  const isAfkeur =
    younger.isSame(afkeurThreshold, "day") || younger.isAfter(afkeurThreshold, "day");
  const isDisp = younger.isAfter(dispThreshold, "day") && !isAfkeur;

  // ✅ NVB: ≥24 maanden is VERBOD (zwaarder dan AFKEUR)
  if (isAfkeur) return { type: "VERBOD" as const, diffDaysTotal, diffMonths, diffDaysRemainder };
  if (isDisp) return { type: "DISPENSATIE" as const, diffDaysTotal, diffMonths, diffDaysRemainder };
  return { type: "OK" as const, diffDaysTotal, diffMonths, diffDaysRemainder };
}


/* ==========================================================
   MMA jeugd: leeftijdscategorie bands
========================================================== */

const MMA_JEUGD_AGE_BANDS: Array<{ min: number; max: number; label: string }> = [
  { min: 0, max: 11, label: "TE JONG" },
  { min: 12, max: 13, label: "CAT-13" },
  { min: 14, max: 15, label: "CAT-15" },
  { min: 16, max: 17, label: "CAT-17" },
];

function mmaJeugdAgeBand(age: number | null) {
  if (typeof age !== "number") return null;
  for (const b of MMA_JEUGD_AGE_BANDS) {
    if (age >= b.min && age <= b.max) return b;
  }
  return null;
}

/* ==========================================================
   Jeugd party diff via ctx totals (snel)
========================================================== */

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
  // ✅ NVB: Demo is een uitslag, telt mee als 1/3 partij (afgerond naar beneden).
  // Voorbeeld: total=25, demo=10 → (25-10) + floor(10/3)=15+3=18
  return Math.floor(Math.max(0, demo) / 3);
}

function effectiveFromTotals(t: any): number | null {
  if (!t) return null;
  const total = Number(t.total ?? 0);
  const demo = Number(t.demo ?? 0);
  if (!Number.isFinite(total) || !Number.isFinite(demo)) return null;
  return Math.max(0, (total - demo) + demoToPartijEquivalent(demo));
}

/* ==========================================================
   VOLWASSEN KB/MT klasse uit uitslagen_raw (per VA)
   N is basis, R optioneel
========================================================== */

type Klasse = "R" | "N" | "C" | "B" | "A";
const VOLGORDE: Klasse[] = ["R", "N", "C", "B", "A"];

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

/** Alleen KB/MT/standing uitslagen tellen voor volwassen klasse */
function isRelevantStandingDiscipline(d: any): boolean {
  const s = String(d ?? "").toLowerCase();
  if (!s) return false;
  if (s.includes("kick")) return true;
  if (s.includes("muay")) return true;
  if (s.includes("thai")) return true;
  return false;
}

type UitslagRow = {
  va_nummer: string | number | null;
  discipline: string | null;
  klasse: string | null;
  uitslag: string | null;
};

async function fetchUitslagenByVa(opts: {
  matchmaking_id: string;
  controle_run_id: string;
  vaList: string[];
}): Promise<Map<string, UitslagRow[]>> {
  const { matchmaking_id, controle_run_id, vaList } = opts;
  const map = new Map<string, UitslagRow[]>();
  if (!vaList.length) return map;

  const chunkSize = 500;
  for (let i = 0; i < vaList.length; i += chunkSize) {
    const chunk = vaList.slice(i, i + chunkSize);

    const { data, error } = await supabaseAdmin
      .from("uitslagen_raw")
      .select("va_nummer, discipline, klasse, uitslag")
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", controle_run_id)
      .in("va_nummer", chunk);

    if (error) throw error;

    for (const r of (data ?? []) as any[]) {
      const va = String(r?.va_nummer ?? "").trim();
      if (!va) continue;
      if (!map.has(va)) map.set(va, []);
      map.get(va)!.push(r as UitslagRow);
    }
  }

  return map;
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

/* ==========================================================
   MMA flow: Amateur vs Pro (helpers blijven, maar flow-checks zijn verwijderd)
========================================================== */

type MmaLevel = "AMATEUR" | "PRO";

function parseMmaLevel(v: any): MmaLevel | null {
  const s = String(v ?? "").toUpperCase().trim();
  if (!s) return null;

  if (s === "P" || s === "PRO" || s.includes("PROFESSIONAL") || s.includes("PROF")) return "PRO";
  if (s === "AMA" || s === "AMATEUR" || s.includes("AMATEUR")) return "AMATEUR";

  return null;
}

function getMmaLevelFromMm(ctx: any): MmaLevel | null {
  return parseMmaLevel(ctx?.klasse_mm);
}

function getMmaLevelFromCtx(ctx: any, hoek: "rood" | "blauw"): MmaLevel | null {
  const cand =
    hoek === "rood"
      ? (ctx?.rood_mma_current_klasse ??
          ctx?.rood_mma_klasse ??
          ctx?.rood_klasse_mma ??
          ctx?.rood_fp_mma_klasse)
      : (ctx?.blauw_mma_current_klasse ??
          ctx?.blauw_mma_klasse ??
          ctx?.blauw_klasse_mma ??
          ctx?.blauw_fp_mma_klasse);

  return parseMmaLevel(cand);
}

export async function rulesEngine(opts: {
  controle_run_id: string;
  matchmaking_id: string;
  ctxRows: any[];
}) {
  const { controle_run_id, matchmaking_id, ctxRows } = opts;

  const rows = Array.isArray(ctxRows) ? ctxRows : ctxRows ? [ctxRows] : [];
  const hits: RuleHit[] = [];
  const pushHit = (h: RuleHit) => hits.push(h);

  // 1) VA list verzamelen
  const vaSet = new Set<string>();
  for (const ctx of rows) {
    const vr = String(ctx?.rood_va_mm ?? "").trim();
    const vb = String(ctx?.blauw_va_mm ?? "").trim();
    if (vr) vaSet.add(vr);
    if (vb) vaSet.add(vb);
  }
  const vaList = [...vaSet];

  // 2) uitslagen_raw 1x ophalen (voor volwassen klasse-check)
  const uitslagenByVa = await fetchUitslagenByVa({
    matchmaking_id,
    controle_run_id,
    vaList,
  });

  for (const ctx of rows) {
    const partij_nr = asInt(ctx?.partij_nr);
    const bout_id = unwrapUuid(ctx?.bout_id);

    // ✅ VA ontbreekt => AFKEUR (voor beide hoeken apart)
    const vaRood = String(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.va_rood_mm ?? "").trim();
    const vaBlauw = String(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.va_blauw_mm ?? "").trim();

    if (!vaRood) {
      pushHit({
        matchmaking_id,
        partij_nr,
        bout_id,
        rule: "VA nummer ontbreekt (rood)",
        rule_code: "VA_ONTBREEKT_ROOD",
        resultaat: "AFKEUR",
        severity: "error",
        boodschap:
          "Geen VA nummer gevonden voor rood. Zonder VA kan FightPassport niet betrouwbaar geverifieerd worden.",
        hoek: "rood",
      });
    }

    if (!vaBlauw) {
      pushHit({
        matchmaking_id,
        partij_nr,
        bout_id,
        rule: "VA nummer ontbreekt (blauw)",
        rule_code: "VA_ONTBREEKT_BLAUW",
        resultaat: "AFKEUR",
        severity: "error",
        boodschap:
          "Geen VA nummer gevonden voor blauw. Zonder VA kan FightPassport niet betrouwbaar geverifieerd worden.",
        hoek: "blauw",
      });
    }

    const jeugd = isJeugdFromCtx(ctx);
    const volwassenen = isVolwassenePair(ctx);
    const mma = isMmaBout(ctx);
    const mmaJeugd = jeugd && mma;

    // ✅ jeugd vs volwassen mix is VERBOD (1 vechter < 18 en de ander ≥ 18)
    {
      const ageR = asInt(ctx?.rood_leeftijd_event);
      const ageB = asInt(ctx?.blauw_leeftijd_event);

      if (typeof ageR === "number" && typeof ageB === "number") {
        const mix = (ageR < 18 && ageB >= 18) || (ageB < 18 && ageR >= 18);
        if (mix) {
          pushHit({
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Jeugd vs volwassen (mix) verboden",
            rule_code: "JEUGD_VOLWASSEN_MIX_AFKEUR",
            resultaat: "VERBOD",
            severity: "error",
            boodschap: `Rood leeftijd (event): ${ageR} • Blauw leeftijd (event): ${ageB} — mix jeugd/volwassen is niet toegestaan (VERBOD).`,
          });
        }
      } else {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "Jeugd vs volwassen (mix) niet controleerbaar",
          rule_code: "JEUGD_VOLWASSEN_MIX_GEEN_DATA_ACTIE",
          resultaat: "ACTIE",
          severity: "warning",
          boodschap:
            "Leeftijd (op event) ontbreekt bij rood en/of blauw — kan niet bepalen of het een jeugd/volwassen mix is.",
        });
      }
    }

    // 0) NAAM mismatch
    {
      const roodNaamMM = ctx?.rood_naam_mm;
      const roodNaamFP = ctx?.rood_naam_fp ?? ctx?.rood_naam_scrape;
      const blauwNaamMM = ctx?.blauw_naam_mm;
      const blauwNaamFP = ctx?.blauw_naam_fp ?? ctx?.blauw_naam_scrape;

      if (!nameSimilar(roodNaamMM, roodNaamFP)) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "Vechter mismatch (naam)",
          rule_code: "VECHTER_NAAM_MISMATCH_ROOD",
          resultaat: "ACTIE",
          severity: "warning",
          boodschap: `Rood naam matchmaker (“${roodNaamMM ?? "-"}”) wijkt af van FightPassport (“${roodNaamFP ?? "-"}”). Controleer VA/vechter.`,
          hoek: "rood",
        });
      }

      if (!nameSimilar(blauwNaamMM, blauwNaamFP)) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "Vechter mismatch (naam)",
          rule_code: "VECHTER_NAAM_MISMATCH_BLAUW",
          resultaat: "ACTIE",
          severity: "warning",
          boodschap: `Blauw naam matchmaker (“${blauwNaamMM ?? "-"}”) wijkt af van FightPassport (“${blauwNaamFP ?? "-"}”). Controleer VA/vechter.`,
          hoek: "blauw",
        });
      }
    }

    // ✅ KEURMERK sportschool
    {
      const kR = ctx?.keurmerk_rood; // boolean | null
      const kB = ctx?.keurmerk_blauw; // boolean | null

      const redenR = String(ctx?.keurmerk_reden_rood ?? "").trim();
      const redenB = String(ctx?.keurmerk_reden_blauw ?? "").trim();

      // ✅ België: alleen informatief (geen afkeur)
      if (redenR.startsWith("⚠️ België")) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "Belgische sportschool (check later)",
          rule_code: "KEURMERK_BE_ROOD_INFO",
          resultaat: "INFO",
          severity: "info",
          boodschap: redenR,
          hoek: "rood",
        });
      }

      if (redenB.startsWith("⚠️ België")) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "Belgische sportschool (check later)",
          rule_code: "KEURMERK_BE_BLAUW_INFO",
          resultaat: "INFO",
          severity: "info",
          boodschap: redenB,
          hoek: "blauw",
        });
      }

      if (kR == null) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "Keurmerk NL sportschool (rood) ontbreekt",
          rule_code: "KEURMERK_GEEN_DATA_ROOD",
          resultaat: "ACTIE",
          severity: "warning",
          boodschap: redenR || "NL gym: keurmerk-data ontbreekt of gym match onzeker.",
          hoek: "rood",
        });
      } else if (kR === false) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "Keurmerk NL sportschool (rood) ongeldig",
          rule_code: "KEURMERK_ONGELDIG_ROOD",
          resultaat: "AFKEUR",
          severity: "error",
          boodschap: redenR || "NL gym: geen geldig keurmerk (ontbreekt/verlopen).",
          hoek: "rood",
        });
      }

      if (kB == null) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "Keurmerk NL sportschool (blauw) ontbreekt",
          rule_code: "KEURMERK_GEEN_DATA_BLAUW",
          resultaat: "ACTIE",
          severity: "warning",
          boodschap: redenB || "NL gym: keurmerk-data ontbreekt of gym match onzeker.",
          hoek: "blauw",
        });
      } else if (kB === false) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "Keurmerk NL sportschool (blauw) ongeldig",
          rule_code: "KEURMERK_ONGELDIG_BLAUW",
          resultaat: "AFKEUR",
          severity: "error",
          boodschap: redenB || "NL gym: geen geldig keurmerk (ontbreekt/verlopen).",
          hoek: "blauw",
        });
      }
    }

    // 1) man vs vrouw -> VERBOD
    {
      const gR = parseGender(ctx?.rood_geslacht);
      const gB = parseGender(ctx?.blauw_geslacht);
      if (gR && gB && gR !== gB) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "Man vs vrouw niet toegestaan",
          rule_code: "GESLACHT_MISMATCH_AFKEUR",
          resultaat: "VERBOD",
          severity: "error",
          boodschap: `Rood is ${gR === "M" ? "man" : "vrouw"} en Blauw is ${
            gB === "M" ? "man" : "vrouw"
          } — VERBOD.`,
        });
      }
    }

    // 2) startverbod -> VERBOD
    {
      const sbR = normLower(ctx?.rood_heeft_startverbod);
      const sbB = normLower(ctx?.blauw_heeft_startverbod);
      const sbR_has = sbR === "ja" || sbR === "true" || sbR === "1";
      const sbB_has = sbB === "ja" || sbB === "true" || sbB === "1";

      if (sbR_has || sbB_has) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "Startverbod actief",
          rule_code: "STARTVERBOD_AFKEUR",
          resultaat: "VERBOD",
          severity: "error",
          boodschap: `Rood: ${sbR_has ? "STARTVERBOD" : "OK"} • Blauw: ${
            sbB_has ? "STARTVERBOD" : "OK"
          } — VERBOD.`,
        });
      }
    }

    // 3) licentie (per hoek)
    {
      const licR = normLower(ctx?.rood_licentie);
      const licB = normLower(ctx?.blauw_licentie);

      const licR_ok =
        licR === "ja" || licR === "j" || licR === "true" || licR === "1" || licR === "geldig";
      const licB_ok =
        licB === "ja" || licB === "j" || licB === "true" || licB === "1" || licB === "geldig";

      if (!licR_ok) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          hoek: "rood",
          rule: "Licentie ontbreekt/ongeldig (rood)",
          rule_code: "LICENTIE_ONGELDIG_AFKEUR_ROOD",
          resultaat: "AFKEUR",
          severity: "error",
          boodschap: `Rood heeft GEEN/ONGELDIGE licentie (waarde: “${
            String(ctx?.rood_licentie ?? "").trim() || "leeg"
          }”).`,
        });
      }

      if (!licB_ok) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          hoek: "blauw",
          rule: "Licentie ontbreekt/ongeldig (blauw)",
          rule_code: "LICENTIE_ONGELDIG_AFKEUR_BLAUW",
          resultaat: "AFKEUR",
          severity: "error",
          boodschap: `Blauw heeft GEEN/ONGELDIGE licentie (waarde: “${
            String(ctx?.blauw_licentie ?? "").trim() || "leeg"
          }”).`,
        });
      }
    }

    // 4) MMA < 12
    if (mma) {
      const minAge = minAgeEvent(ctx);
      if (typeof minAge === "number" && minAge < 12) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "MMA onder 12 jaar verboden",
          rule_code: "MMA_U12_AFKEUR",
          resultaat: "AFKEUR",
          severity: "error",
          boodschap: `Minimale leeftijd in de partij is ${minAge} — MMA wedstrijden zijn verboden onder 12 jaar — AFKEUR.`,
        });
      }
    }

    // 5) MMA flow (amateur/pro) -> door jou verwijderd (geen hits meer)

    // 6) JEUGD regels (MMA youth agecat / niet-MMA leeftijdsverschil)
    if (jeugd) {
      if (mmaJeugd) {
        const ageR = asInt(ctx?.rood_leeftijd_event);
        const ageB = asInt(ctx?.blauw_leeftijd_event);
        const bandR = mmaJeugdAgeBand(ageR);
        const bandB = mmaJeugdAgeBand(ageB);

        if (!bandR || !bandB) {
          pushHit({
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "MMA jeugd: leeftijdscategorie niet controleerbaar",
            rule_code: "MMA_JEUGD_AGECAT_GEEN_DATA_ACTIE",
            resultaat: "ACTIE",
            severity: "warning",
            boodschap:
              "Leeftijd (op event) ontbreekt bij rood en/of blauw — MMA-jeugd leeftijdscategorie kan niet gecontroleerd worden.",
          });
        } else if (bandR.label !== bandB.label) {
          pushHit({
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "MMA jeugd: verschillende leeftijdscategorie",
            rule_code: "MMA_JEUGD_AGECAT_AFKEUR",
            resultaat: "AFKEUR",
            severity: "error",
            boodschap: `Rood valt in categorie ${bandR.label} (leeftijd ${ageR}) en Blauw in ${bandB.label} (leeftijd ${ageB}) — AFKEUR.`,
          });
        }
      } else {
        const dobR = parseIsoDateOnly(ctx?.rood_geboortedatum_fp);
        const dobB = parseIsoDateOnly(ctx?.blauw_geboortedatum_fp);
        const lv = leeftijdsVerschilJeugd(dobR, dobB);

        if (lv.type === "ACTIE") {
          pushHit({
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Leeftijdsverschil niet controleerbaar (jeugd)",
            rule_code: "LEEFTIJD_VERSCHIL_GEEN_DATA_ACTIE",
            resultaat: "ACTIE",
            severity: "warning",
            boodschap:
              "Geboortedatum ontbreekt bij rood en/of blauw — jeugd-leeftijdsverschil kan niet gecontroleerd worden.",
          });
        } else if (lv.type === "DISPENSATIE") {
          pushHit({
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Leeftijdsverschil te groot (jeugd)",
            rule_code: "LEEFTIJD_VERSCHIL_DISPENSATIE",
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
            rule_code: "LEEFTIJD_VERSCHIL_AFKEUR",
            resultaat: "VERBOD",
            severity: "error",
            boodschap: `Leeftijdsverschil: ${lv.diffMonths} maanden en ${lv.diffDaysRemainder} dagen — vanaf 24 maanden verschil is dit een VERBOD.`,
          });
        }
      }
    }

    // 7) JEUGD partijverschil (zelfde berekening als UI onder “Verschillen”)
    if (jeugd) {
      const countDemo = (rows: any[]) =>
        (rows ?? []).reduce((acc, r) => {
          const s = String((r as any)?.uitslag ?? "").toLowerCase();
          return acc + (s.includes("demo") || s.includes("demonstr") ? 1 : 0);
        }, 0);

      // primair: scraped totals (zoals UI)
      const totalR = toInt(ctx?.rood_totaal_wedstrijden_scrape);
      const totalB = toInt(ctx?.blauw_totaal_wedstrijden_scrape);

      // demo: eerst ctx demo_totaal, anders tellen uit controle_uitslagen
      const vaR = String(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.va_rood_mm ?? "").trim();
      const vaB = String(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.va_blauw_mm ?? "").trim();
      const rowsR = vaR ? (uitslagenByVa.get(vaR) ?? []) : [];
      const rowsB = vaB ? (uitslagenByVa.get(vaB) ?? []) : [];

      const demoR = toInt(ctx?.rood_demo_totaal) ?? countDemo(rowsR);
      const demoB = toInt(ctx?.blauw_demo_totaal) ?? countDemo(rowsB);

      const effR = totalR != null ? totalR - (demoR ?? 0) + Math.floor((demoR ?? 0) / 3) : null;
      const effB = totalB != null ? totalB - (demoB ?? 0) + Math.floor((demoB ?? 0) / 3) : null;

      if (effR == null || effB == null) {
        // fallback: oude totals-json (kan helpen bij oudere runs)
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
            rule_code: "JEUGD_PARTIJVERSCHIL_GEEN_DATA_ACTIE",
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
              rule_code: "JEUGD_PARTIJVERSCHIL_>_4_DISPENSATIE",
              resultaat: "DISPENSATIE",
              severity: "warning",
              boodschap: `Jeugd partijverschil: Rood ${effR2} partijen • Blauw ${effB2} partijen • Verschil ${verschil2}. Regel: zolang één van beide minder dan 15 partijen heeft, is maximaal 4 verschil toegestaan — DISPENSATIE vereist.`,
            });
          }
        }
      } else {
        const verschil = Math.abs(effR - effB);
        const minEff = Math.min(effR, effB);

        // ✅ jouw regel: zolang 1 van beide < 15 effectieve partijen, is max verschil 4
        if (minEff < 15 && verschil > 4) {
          pushHit({
            matchmaking_id,
            partij_nr,
            bout_id,
            rule: "Jeugd: partijverschil te groot",
            rule_code: "JEUGD_PARTIJVERSCHIL_>_4_DISPENSATIE",
            resultaat: "DISPENSATIE",
            severity: "warning",
            boodschap: `Jeugd partijverschil: Rood ${effR} partijen • Blauw ${effB} partijen • Verschil ${verschil}. Regel: zolang één van beide minder dan 15 partijen heeft, is maximaal 4 verschil toegestaan — DISPENSATIE vereist.`,
          });
        }
      }
    }

// 8) VOLWASSEN KB/MT klasse: alleen voor Kickboksen/Muay Thai.
    if (volwassenen && isKickboksMuayThai(ctx)) {
      const boutK = parseKbMmKlasseToLetter(ctx?.klasse_mm);

      const vaR = String(ctx?.rood_va_mm ?? "").trim();
      const vaB = String(ctx?.blauw_va_mm ?? "").trim();

      const rowsR = vaR ? (uitslagenByVa.get(vaR) ?? []) : [];
      const rowsB = vaB ? (uitslagenByVa.get(vaB) ?? []) : [];

      const histRowsR = hoogsteKlasseUitUitslagen(rowsR);
      const histRowsB = hoogsteKlasseUitUitslagen(rowsB);

      const baseR = histRowsR ?? "N";
      const baseB = histRowsB ?? "N";

      const recR = recordInKlasse(rowsR, baseR);
      const recB = recordInKlasse(rowsB, baseB);

      const roodK = promoteFrom(baseR, recR.wins, recR.total);
      const blauwK = promoteFrom(baseB, recB.wins, recB.total);

      // ✅ door jou: geen "boutklasse niet leesbaar" melding meer
      if (boutK && (boutK !== roodK || boutK !== blauwK)) {
        pushHit({
          matchmaking_id,
          partij_nr,
          bout_id,
          rule: "Volwassen bout: verkeerde klasse",
          rule_code: "VOLWASSEN_BOUT_VERKEERDE_KLASSE",
          resultaat: "AFKEUR",
          severity: "error",
          boodschap: `Boutklasse klopt niet: ingevoerd ${boutK}. Advies op basis van uitslagen: Rood ${roodK}, Blauw ${blauwK} — AFKEUR (dispensatie mogelijk).`,
        });
      }
    }
  }

  // ✅ gala tijd (matchmaking-level hit)
  {
    const bt = estimateGalaTimeFromContextRows(rows);

    if (bt.total_minutes > bt.warning_over_minutes) {
      const overMax = bt.total_minutes > bt.max_with_hoofdofficial_minutes;

      hits.push({
        matchmaking_id,
        partij_nr: null,
        bout_id: null,
        rule: "Gala tijdsduur",
        rule_code: overMax ? "GALA_DUUR_AFKEUR" : "GALA_DUUR_WAARSCHUWING",
        resultaat: overMax ? "AFKEUR" : "ACTIE",
        severity: overMax ? "error" : "warning",
        boodschap:
          `Geschatte gala-duur: ${formatMinutesNL(bt.total_minutes)} ` +
          `(≈ ${formatHoursQuarterNL(bt.total_hours_quarter_ceil)} uur, kwartier-afronding). ` +
          (overMax
            ? `Boven maximum (${formatMinutesNL(bt.max_with_hoofdofficial_minutes)}) — AFKEUR.`
            : `Boven 6.5 uur (${formatMinutesNL(bt.warning_over_minutes)}) — Hoofdofficial nodig / actie.`),
      });
    }
  }

  await saveControleResultaten({
    controle_run_id,
    matchmaking_id,
    hits,
  });

  return hits;
}