// lib/galaTime.ts
// ------------------------------------------------------------
// - Telt aantal partijen per categorie (obv ctxRows)
// - Vermenigvuldigt met minutes_per_bout (Excel kolom S / jouw totalen)
// - Rondt uren omhoog op kwartieren (Excel W16)

export type GalaCategorie =
  | "A_TITEL"
  | "A"
  | "B"
  | "C"
  | "N"
  | "JEUGD_16_17"
  | "JEUGD_LT_16"
  | "DEMO"
  | "MMA_PRO"
  | "MMA_AM"
  | "ONBEKEND";

export type GalaTimeConfig = {
  minutes_per_bout: Record<GalaCategorie, number>;
  warning_over_minutes: number; // 6.5 uur = 390
  max_with_hoofdofficial_minutes: number; // 8 uur = 480
  round_to_quarter_hours: boolean; // Excel W16
};

// ✅ jouw Excel "Totaal" minuten per bout (pas aan als Excel anders is)
export const DEFAULT_GALA_TIME_CONFIG: GalaTimeConfig = {
  minutes_per_bout: {
    A_TITEL: 31.0,
    A: 21.0,
    B: 14.0,
    C: 13.0,
    N: 11.5,
    JEUGD_16_17: 10.5,  // bij jou: 16–17jr (3x1.5) => totaaltijd in Excel
    JEUGD_LT_16: 8.5,   // bij jou: <16jr (3x1.0) => totaaltijd in Excel
    DEMO: 6.0,
    MMA_PRO: 17.0,
    MMA_AM: 17.0,
    ONBEKEND: 13.0,
  },
  warning_over_minutes: 390,
  max_with_hoofdofficial_minutes: 480,
  round_to_quarter_hours: true,
};

function up(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function parseISODateOnly(d?: any): Date | null {
  if (!d) return null;
  const s = String(d).trim();
  const dt = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  return isNaN(dt.getTime()) ? null : dt;
}

function calcAgeYearsOnDate(eventDate: Date, birthDate: Date): number | null {
  let years = eventDate.getFullYear() - birthDate.getFullYear();
  const m = eventDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && eventDate.getDate() < birthDate.getDate())) years -= 1;
  if (!Number.isFinite(years) || years < 0) return null;
  return years;
}

function getAgeAtEvent(ctx: any, side: "rood" | "blauw"): number | null {
  // ✅ eerst: gebruik je al berekende leeftijd_event (snel + betrouwbaar)
  const ageEvent =
    side === "rood" ? Number(ctx?.rood_leeftijd_event) : Number(ctx?.blauw_leeftijd_event);
  if (Number.isFinite(ageEvent)) return ageEvent;

  // fallback: berekenen uit eventdatum + geboortedatum
  const ev = parseISODateOnly(ctx?.evenement_datum);
  const bd =
    parseISODateOnly(ctx?.[`${side}_geboortedatum_fp`]) ??
    parseISODateOnly(ctx?.[`${side}_geboortedatum_mm`]);

  if (!ev || !bd) return null;
  return calcAgeYearsOnDate(ev, bd);
}

/** Parse letterklasse R/N/C/B/A uit allerlei vormen (zonder CLASS→A bug) */
function parseStandingLetterClass(input: any): "R" | "N" | "C" | "B" | "A" | null {
  const s = up(input);
  if (!s) return null;

  // expliciet jeugd/newcomer negeren
  if (
    s.includes("JEUGD") ||
    s.includes("YOUTH") ||
    s.includes("NIEUWELING") ||
    s.includes("NEWCOMER") ||
    s.startsWith("J") ||
    s.includes("J-KLASSE")
  ) {
    return null;
  }

  // letter als los token
  const m1 = s.match(/\b(R|N|C|B|A)\b/);
  if (m1) return m1[1] as any;

  // begin "C-" etc
  const m2 = s.match(/^(R|N|C|B|A)[- ]/);
  if (m2) return m2[1] as any;

  // "C-KLASSE" "C-CLASS"
  const m3 = s.match(/\b(R|N|C|B|A)\b\s*[- ]?\s*(KLASSE|CLASS)\b/);
  if (m3) return m3[1] as any;

  return null;
}

/**
 * Mapping:
 * - Demo
 * - MMA Pro/Am
 * - Jeugd split: <16 vs 16-17 (obv leeftijd_event / geboortedatum)
 * - Staand: A titel / A / B / C / N
 */
export function resolveCategorie(ctx: any): GalaCategorie {
  const klasse = up(ctx?.klasse_mm ?? ctx?.klasse ?? "");
  const disc = up(ctx?.discipline ?? "");

  // 1) Demo
  if (klasse.includes("DEMO")) return "DEMO";

  // 2) MMA
  if (disc.includes("MMA") || klasse.includes("MMA")) {
    if (klasse.includes("PRO")) return "MMA_PRO";
    return "MMA_AM";
  }

  // 3) Jeugd split op leeftijd
  const ar = getAgeAtEvent(ctx, "rood");
  const ab = getAgeAtEvent(ctx, "blauw");

  const bothKnown = Number.isFinite(ar as any) && Number.isFinite(ab as any);
  if (bothKnown) {
    const r = ar as number;
    const b = ab as number;
    if (r < 18 && b < 18) {
      if (r >= 16 || b >= 16) return "JEUGD_16_17";
      return "JEUGD_LT_16";
    }
  } else {
    // fallback hints
    if (klasse.includes("16/17") || klasse.includes("16-17")) return "JEUGD_16_17";
    if (klasse.includes("JEUGD") || klasse.startsWith("J")) return "JEUGD_LT_16";
  }

  // 4) Staand letterklasse
  if (klasse.includes("TITEL") && klasse.includes("A")) return "A_TITEL";

  const letter = parseStandingLetterClass(klasse);
  if (letter === "A") return "A";
  if (letter === "B") return "B";
  if (letter === "C") return "C";
  if (letter === "N") return "N";
  if (letter === "R") return "N"; // R optioneel; voor tijd tellen we dit als N (pas aan als Excel aparte R rij heeft)

  return "ONBEKEND";
}

export type GalaTimeBreakdown = {
  total_minutes: number;
  total_hours_raw: number;
  total_hours_quarter_ceil: number;
  warning_over_minutes: number;
  max_with_hoofdofficial_minutes: number;
  by_category: Record<
    GalaCategorie,
    { count: number; minutes_per_bout: number; total_minutes: number }
  >;
};

export function estimateGalaTimeFromContextRows(
  ctxRows: any[],
  config: GalaTimeConfig = DEFAULT_GALA_TIME_CONFIG
): GalaTimeBreakdown {
  const by_category = {} as GalaTimeBreakdown["by_category"];

  const allCats: GalaCategorie[] = [
    "A_TITEL",
    "A",
    "B",
    "C",
    "N",
    "JEUGD_16_17",
    "JEUGD_LT_16",
    "DEMO",
    "MMA_PRO",
    "MMA_AM",
    "ONBEKEND",
  ];

  for (const c of allCats) {
    by_category[c] = {
      count: 0,
      minutes_per_bout: config.minutes_per_bout[c],
      total_minutes: 0,
    };
  }

  for (const ctx of ctxRows ?? []) {
    const cat = resolveCategorie(ctx);
    const per = config.minutes_per_bout[cat] ?? config.minutes_per_bout.ONBEKEND;
    by_category[cat].count += 1;
    by_category[cat].minutes_per_bout = per;
    by_category[cat].total_minutes += per;
  }

  const total_minutes = Object.values(by_category).reduce((s, x) => s + (x.total_minutes ?? 0), 0);
  const total_hours_raw = total_minutes / 60;

  const total_hours_quarter_ceil = config.round_to_quarter_hours
    ? ceilToQuarter(total_hours_raw)
    : total_hours_raw;

  return {
    total_minutes,
    total_hours_raw,
    total_hours_quarter_ceil,
    warning_over_minutes: config.warning_over_minutes,
    max_with_hoofdofficial_minutes: config.max_with_hoofdofficial_minutes,
    by_category,
  };
}

export function ceilToQuarter(hours: number): number {
  const h = Number(hours);
  if (!Number.isFinite(h) || h <= 0) return 0;
  return Math.ceil(h * 4) / 4;
}

export function formatMinutesNL(totalMinutes: number | null | undefined): string {
  const m = Number(totalMinutes);
  if (!Number.isFinite(m) || m <= 0) return "-";
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  if (h <= 0) return `${r} min`;
  if (r === 0) return `${h} u`;
  return `${h} u ${r} min`;
}

export function formatHoursQuarterNL(hours: number | null | undefined): string {
  const h = Number(hours);
  if (!Number.isFinite(h) || h <= 0) return "-";
  const whole = Math.floor(h);
  const frac = Math.round((h - whole) * 4) / 4;
  const q = Math.round(frac * 4);

  if (q === 0) return `${whole}`;
  if (q === 1) return `${whole} 1/4`;
  if (q === 2) return `${whole} 1/2`;
  if (q === 3) return `${whole} 3/4`;
  return `${h}`;
}
