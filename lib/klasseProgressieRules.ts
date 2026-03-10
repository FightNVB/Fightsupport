// lib/klasseProgressieRules.ts
import type { RuleResult } from "./types";

/**
 * Klassevolgorde NVB
 */
type Klasse = "R" | "N" | "C" | "B" | "A";
const VOLGORDE: Klasse[] = ["R", "N", "C", "B", "A"];

function idx(k?: string | null): number {
  if (!k) return -1;
  return VOLGORDE.indexOf(k as Klasse);
}

function asKlasse(v: any): Klasse | null {
  const s = String(v ?? "").trim().toUpperCase();
  return (VOLGORDE as string[]).includes(s) ? (s as Klasse) : null;
}

/**
 * JOUW promotietempo
 */
function moetPromoveren(klasse: Klasse, wins: number, total: number): Klasse | null {
  switch (klasse) {
    case "R":
      if (wins >= 2 || total >= 3) return "N";
      break;
    case "N":
      if (wins >= 3 || total >= 6) return "C";
      break;
    case "C":
      if (wins >= 6 || total >= 8) return "B";
      break;
    case "B":
      if (wins >= 8 || total >= 10) return "A";
      break;
  }
  return null;
}

function parseBuckets(uitslagenPerDiscipline: any): any | null {
  if (!uitslagenPerDiscipline) return null;

  if (typeof uitslagenPerDiscipline === "string") {
    try {
      return JSON.parse(uitslagenPerDiscipline);
    } catch {
      return null;
    }
  }
  return uitslagenPerDiscipline;
}

/**
 * Record uit ctx.<hoek>_uitslagen_per_discipline
 *
 * - Prefer: current[KLASSE] (bijv. current.C)
 * - Fallback: current._all
 */
function getRecordFromContextUitslagen(
  uitslagenPerDiscipline: any,
  klasse?: Klasse | null,
): { wins: number; total: number } {
  const obj = parseBuckets(uitslagenPerDiscipline);
  const cur = obj?.current;
  if (!cur) return { wins: 0, total: 0 };

  const byKlasse = klasse ? cur?.[klasse] : null;
  const t = byKlasse ?? cur?._all;
  if (!t) return { wins: 0, total: 0 };

  return {
    wins: Number(t.wins ?? 0) || 0,
    total: Number(t.total ?? 0) || 0,
  };
}

/**
 * Vind hoogste klasse uit buckets (als current.R/current.N/... bestaan).
 * We zoeken de hoogste klasse met total > 0.
 */
function hoogsteKlasseUitBuckets(uitslagenPerDiscipline: any): Klasse | null {
  const obj = parseBuckets(uitslagenPerDiscipline);
  const cur = obj?.current;
  if (!cur) return null;

  // loop van hoog naar laag: A,B,C,N,R
  for (let i = VOLGORDE.length - 1; i >= 0; i--) {
    const k = VOLGORDE[i];
    const t = cur?.[k];
    const total = Number(t?.total ?? 0) || 0;
    if (total > 0) return k;
  }
  return null;
}

/**
 * “Eenmaal hoger gevochten = blijft in die klasse”
 * In jouw controle_bout_context:
 *   rood_klasse_hist / blauw_klasse_hist
 */
function hoogsteKlasseUitHistorie(ctx: any, hoek: "rood" | "blauw"): Klasse | null {
  const v = hoek === "rood" ? ctx?.rood_klasse_hist : ctx?.blauw_klasse_hist;
  return asKlasse(v);
}

function maxKlasse(a: Klasse | null, b: Klasse | null): Klasse | null {
  if (!a) return b;
  if (!b) return a;
  return idx(a) >= idx(b) ? a : b;
}

/**
 * Bepaal "huidige klasse" volgens jouw wens:
 * - Als er uitslagen zijn: NIET naar nulmeeting kijken.
 * - Alleen als er geen uitslagen zijn: nulmeeting gebruiken.
 */
function bepaalHuidigeKlasse(ctx: any, hoek: "rood" | "blauw"): { huidige: Klasse | null; hist: Klasse | null; heeftUitslagen: boolean; buckets: any } {
  const nulmetingKlasse = hoek === "rood" ? ctx.rood_nulmeting_klasse : ctx.blauw_nulmeting_klasse;
  const mmKlasse = ctx.klasse_mm;

  const buckets = hoek === "rood" ? ctx.rood_uitslagen_per_discipline : ctx.blauw_uitslagen_per_discipline;
  const recAll = getRecordFromContextUitslagen(buckets, null); // pakt _all
  const heeftUitslagen = (recAll.total ?? 0) > 0;

  const hist = hoogsteKlasseUitHistorie(ctx, hoek);

  if (heeftUitslagen) {
    // uitslagen → geen nulmeeting
    const fromBuckets = hoogsteKlasseUitBuckets(buckets);
    const huidige = asKlasse(hist ?? fromBuckets ?? mmKlasse);
    return { huidige, hist, heeftUitslagen, buckets };
  }

  // geen uitslagen → nulmeeting (of mm) gebruiken
  const huidige = asKlasse(nulmetingKlasse ?? mmKlasse);
  return { huidige, hist, heeftUitslagen, buckets };
}

/**
 * 🔥 Hoofdregel
 * Input = rij uit controle_bout_context
 */
export function checkKlasseProgressieFromContext(ctx: any): RuleResult[] {
  const results: RuleResult[] = [];

  const base = {
    matchmaking_id: ctx.matchmaking_id,
    partij_nr: ctx.partij_nr,
  };

  // ========== 1) per hoek: promotiecheck (alleen volwassenen) ==========
  (["rood", "blauw"] as const).forEach((hoek) => {
    const leeftijd = hoek === "rood" ? ctx.rood_leeftijd_event : ctx.blauw_leeftijd_event;
    if (!leeftijd || leeftijd < 18) return;

    const { huidige, hist, buckets, heeftUitslagen } = bepaalHuidigeKlasse(ctx, hoek);
    if (!huidige) return;

    // "blijft in hoogste klasse" (alleen relevant als hist hoger is dan huidige)
    const effectieveKlasse = maxKlasse(huidige, hist);

    if (hist && idx(hist) > idx(huidige)) {
      results.push({
        ...base,
        rule_code: `KLASSE_${hoek.toUpperCase()}_TERUGMATCH_NIET_TOEGESTAAN`,
        severity: "error",
        message: `Vechter ${hoek.toUpperCase()} heeft eerder in hogere klasse (${hist}) gevochten en mag niet terug naar ${huidige}. Geldige klasse is minimaal ${hist}.`,
        hoek,
      });
    }

    // ✅ promotie-record: per effectieve klasse (current.C etc.), fallback _all
    const { wins, total } = getRecordFromContextUitslagen(buckets, effectieveKlasse);

    const volgende = moetPromoveren(effectieveKlasse as Klasse, wins, total);
    if (volgende) {
      results.push({
        ...base,
        rule_code: `KLASSE_${hoek.toUpperCase()}_MOET_PROMOVEREN`,
        severity: "error",
        message: `Vechter ${hoek.toUpperCase()} heeft ${wins} winst / ${total} partijen (in klasse ${effectieveKlasse}) en moet promoveren naar ${volgende}.` +
          (heeftUitslagen ? "" : " (bepaald op basis van nulmeeting omdat er geen uitslagen zijn)"),
        hoek,
      });
    }
  });

  // ========== 2) Klasseverschil tussen vechters ==========
  // Ook hier: als er uitslagen zijn → NIET nulmeeting gebruiken.
  const r = bepaalHuidigeKlasse(ctx, "rood");
  const b = bepaalHuidigeKlasse(ctx, "blauw");

  const kR = maxKlasse(r.huidige, r.hist);
  const kB = maxKlasse(b.huidige, b.hist);

  if (kR && kB && kR !== kB) {
    const d = Math.abs(idx(kR) - idx(kB));

    if (d === 1) {
      results.push({
        ...base,
        rule_code: "KLASSEVERSCHIL_1",
        severity: "warning",
        message: `Klasseverschil van één stap (${kR} vs ${kB}) — dispensatie vereist.`,
      });
    }

    if (d >= 2) {
      results.push({
        ...base,
        rule_code: "KLASSEVERSCHIL_GT_1",
        severity: "error",
        message: `Klasseverschil te groot (${kR} vs ${kB}).`,
      });
    }
  }

  return results;
}

/**
 * ✅ Alias export zodat jouw rulesEngine import niet breekt
 */
export const klasseProgressieRules = checkKlasseProgressieFromContext;