// lib/recordCalculator.ts

export type Bucket = "KB" | "MMA";

export type RecordTotals = {
  wins: number;
  losses: number;
  draws: number;     // echte draws (gelijkspel)
  demo: number;      // demo count (apart)
  ko_losses: number;
  other: number;     // NC/UNKNOWN/etc (binnen KB/MMA)
  total: number;     // totaal entries die meetellen in deze totals (incl demo/other)
};

export type RecordByBucket = {
  _all: RecordTotals;
  KB?: RecordTotals;
  MMA?: RecordTotals;
};

export type ClassAwareRecord = {
  current: RecordByBucket;   // huidige klasse
  historic: RecordByBucket;  // vorige/andere klasse (Historisch totaal / Overige)
  historic_other_discipline_total: number; // boksen/unknown/etc (valt onder Overige)
};

function emptyTotals(): RecordTotals {
  return { wins: 0, losses: 0, draws: 0, demo: 0, ko_losses: 0, other: 0, total: 0 };
}

/**
 * Normaliseer FightPassport discipline strings naar jouw 2 buckets.
 * - Alles staand (Kickboksen / Thaiboksen / Muay Thai / Dutchstyle) -> KB
 * - MMA -> MMA
 * - Boksen/Boxing -> null (valt buiten record; gaat naar "overige discipline")
 */
export function normalizeToBucket(input: any): Bucket | null {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();

  // Boksen negeren voor KB/MMA record
  if (s.includes("boks") || s.includes("boxing")) return null;

  // MMA
  if (s.includes("mma")) return "MMA";

  // Alles staand naar KB (KB + MT telt samen als KB)
  if (s.includes("kick") || s.includes("thaib") || s.includes("muay") || s.includes("dutch")) {
    return "KB";
  }

  // onbekend telt niet mee in KB/MMA record
  return null;
}

export type ParsedOutcome =
  | { kind: "WIN" }
  | { kind: "LOSS"; isKoLoss: boolean }
  | { kind: "DRAW" }
  | { kind: "DEMO" }
  | { kind: "OTHER" };

function includesAny(s: string, parts: string[]) {
  return parts.some((p) => s.includes(p));
}

/**
 * Parse uitslag:
 * - WIN / LOSS (incl KO-loss) / DRAW
 * - DEMO apart
 * - NC/UNKNOWN/etc -> OTHER
 */
export function parseUitslag(uitslag: any): ParsedOutcome {
  const s = String(uitslag ?? "").trim().toLowerCase();
  if (!s) return { kind: "OTHER" };

  // demo (apart!)
  if (includesAny(s, ["demo", "demonstratie", "demonstration"])) return { kind: "DEMO" };

  // win
  if (includesAny(s, ["wint", "win"])) return { kind: "WIN" };

  // draw
  if (includesAny(s, ["gelijk", "draw", "onbeslist"])) return { kind: "DRAW" };

  // loss
  if (includesAny(s, ["verliest", "lost", "verlies"])) {
    const isKo =
      includesAny(s, ["ko", "tko", "k.o", "t.k.o", "knock"]);
    return { kind: "LOSS", isKoLoss: isKo };
  }

  // NC/UNKNOWN/etc
  return { kind: "OTHER" };
}

/* ---------------- helpers voor klasse ---------------- */

function normClass(v: any): string | null {
  const s = String(v ?? "").trim().toLowerCase();
  return s.length ? s : null;
}

/**
 * Demo -> “wedstrijd-equivalenten” onder draws:
 * elke 3 demo = 1 draw-equivalent
 */
export function demoToDrawEquivalents(demoCount: number): number {
  const n = Number.isFinite(Number(demoCount)) ? Number(demoCount) : 0;
  return Math.floor(Math.max(0, n) / 3);
}

/**
 * Handig voor UI:
 * draws_effective = draws + floor(demo/3)
 */
export function drawsEffective(t: RecordTotals): number {
  return (t.draws ?? 0) + demoToDrawEquivalents(t.demo ?? 0);
}

/* ---------------- bestaande functie (backwards compat) ---------------- */

/**
 * Bouw record JSONB uit uitslagen_raw rows (voor 1 va_nummer)
 * (Ongewijzigd in “shape”, maar DEMO telt nu apart i.p.v. other)
 */
export function buildRecordByBucket(uitslagenRows: any[]): RecordByBucket {
  const totalsAll = emptyTotals();
  const totalsKB = emptyTotals();
  const totalsMMA = emptyTotals();

  for (const r of uitslagenRows ?? []) {
    const bucket = normalizeToBucket(r?.discipline);
    if (!bucket) continue;

    const parsed = parseUitslag(r?.uitslag);
    const t = bucket === "KB" ? totalsKB : totalsMMA;

    t.total += 1;
    totalsAll.total += 1;

    if (parsed.kind === "WIN") {
      t.wins += 1;
      totalsAll.wins += 1;
    } else if (parsed.kind === "LOSS") {
      t.losses += 1;
      totalsAll.losses += 1;
      if (parsed.isKoLoss) {
        t.ko_losses += 1;
        totalsAll.ko_losses += 1;
      }
    } else if (parsed.kind === "DRAW") {
      t.draws += 1;
      totalsAll.draws += 1;
    } else if (parsed.kind === "DEMO") {
      t.demo += 1;
      totalsAll.demo += 1;
    } else {
      t.other += 1;
      totalsAll.other += 1;
    }
  }

  const out: RecordByBucket = { _all: totalsAll };
  if (totalsKB.total > 0) out.KB = totalsKB;
  if (totalsMMA.total > 0) out.MMA = totalsMMA;

  return out;
}

/* ---------------- nieuwe: klasse-bewuste record berekening ---------------- */

/**
 * Record is “altijd in huidige klasse”.
 * Alles met andere klasse gaat naar historic (Historisch totaal / Overige).
 *
 * - currentClass: bv ctx.klasse_mm
 * - Als currentClass null is: dan behandelen we alles als "current" (anders zou je alles verliezen).
 *
 * Boksen/unknown discipline:
 * - telt niet mee in KB/MMA record
 * - wél als historic_other_discipline_total (Overige discipline)
 */
export function buildClassAwareRecord(
  uitslagenRows: any[],
  currentClass: any
): ClassAwareRecord {
  const curClass = normClass(currentClass);

  const currentRows: any[] = [];
  const historicRows: any[] = [];

  let otherDisciplineHistoric = 0;

  for (const r of uitslagenRows ?? []) {
    const rowClass = normClass(r?.klasse);

    // bepaal of deze regel in "current" valt
    const isCurrent = !curClass ? true : rowClass === curClass;

    // discipline bucket?
    const bucket = normalizeToBucket(r?.discipline);

    if (!bucket) {
      // boksen/unknown => valt onder Overige discipline
      if (!isCurrent) otherDisciplineHistoric += 1;
      else {
        // als currentClass onbekend is, wil je het niet kwijtraken; maar het telt niet mee in record
        // we tellen dit niet in current record, want record = KB/MMA.
      }
      continue;
    }

    if (isCurrent) currentRows.push(r);
    else historicRows.push(r);
  }

  return {
    current: buildRecordByBucket(currentRows),
    historic: buildRecordByBucket(historicRows),
    historic_other_discipline_total: otherDisciplineHistoric,
  };
}

/** Helper om totals naar flat velden te mappen (met DEMO erbij) */
export function totalsToFlat(t: RecordTotals) {
  const demo = t.demo ?? 0;
  const dEff = drawsEffective(t);

  return {
    record_w: t.wins,
    record_l: t.losses,

    // ✅ “record_d” wordt de effectieve draws incl demo/3
    record_d: dEff,

    // ✅ demo apart voor UI: toon record_d met (demo)
    demo_totaal: demo,

    // ✅ overige binnen KB/MMA (NC/UNKNOWN etc)
    record_o: t.other,

    // totaal entries in deze totals (incl demo/other)
    partijen_historie: t.total,

    ko_losses: t.ko_losses,
  };
}

/**
 * BACKWARDS COMPAT (jouw project had dit al)
 * Als jij dit al ergens gebruikt: behouden.
 * “Effectief totaal” = total - demo + floor(demo/3)
 */
export function getEffectiveTotalForExperience(total: number, demo: number) {
  const t = Number.isFinite(Number(total)) ? Number(total) : 0;
  const d = Number.isFinite(Number(demo)) ? Number(demo) : 0;
  return Math.max(0, t - d + Math.floor(d / 3));
}
