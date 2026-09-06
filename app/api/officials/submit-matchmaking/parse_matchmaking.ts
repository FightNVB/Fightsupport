// ---------------------------------------------------------
// FIGHTSUPPORT PARSER – VERSIE 13.2 –
// ---------------------------------------------------------
//
// ✅ .xlsx via ExcelJS (styles + waarden)
// ✅ .xls via SheetJS (xlsx lib) fallback (styles/kleur best-effort)
// ✅ Zelfde logica: header detectie + rood/blauw split + VA-only mode
//
// ✅ REGELS:
// - "gewicht" / "kg" = gewicht van 1 vechter (rood of blauw)
// - "max gewicht" / "max kg" = afgesproken bovengrens voor beide vechters
// - "min gewicht" / "min kg" = afgesproken ondergrens voor beide vechters
// - afgesproken gewicht is partijniveau, net als discipline/klasse
// - max/min gewicht mag NOOIT als rood_gewicht of blauw_gewicht worden gelezen
//
// ✅ NIEUW in 13.2:
// - toernooi via partij_nr = T1 / T2 / T3 ...
// - gegenereerde toernooi-bouts krijgen GEEN nep partij_nr
// - toernooi_code staat zowel op rootniveau als in extra
// - template parser groepeert deelnemers op partij_nr=T*
// - scant meerdere werkbladen en kiest het beste matchmaking-blad
// - herkent afgesproken gewicht dat per ongeluk in KG (1)/(2) staat als Max KG leeg is
// - extra VA-header fallback voor layouts met Rode hoek / Blauwe hoek en VA nr. rood/blauw
//

import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { randomUUID } from "crypto";

type WeightNotationType = "exact" | "up_to" | "open_above";

type ParsedWeightMeta = {
  value: number;
  label: string;
  type: WeightNotationType;
};

export interface ParsedBout {
  bout_uid?: string | null;
  partij_nr: number | null;

  rood_naam: string | null;
  rood_gym: string | null;
  va_rood: string | null;
  rood_geboortedatum: string | null;
  rood_gewicht: string | null;
  rood_gewicht_notatie?: string | null;

  blauw_naam: string | null;
  blauw_gym: string | null;
  va_blauw: string | null;
  blauw_geboortedatum: string | null;
  blauw_gewicht: string | null;
  blauw_gewicht_notatie?: string | null;

  discipline: string | null;
  klasse: string | null;

  max_gewicht: number | null;
  max_gewicht_notatie?: string | null;

  min_gewicht: number | null;
  min_gewicht_notatie?: string | null;

  record_rood_w: number;
  record_rood_l: number;
  record_rood_d: number;

  record_blauw_w: number;
  record_blauw_l: number;
  record_blauw_d: number;

  is_toernooi?: boolean | null;
  toernooi_code?: string | null;

  extra: any;
}

/* =========================================================
   0. GENERIC HELPERS
========================================================= */

function norm(v: any): string {
  if (v == null) return "";
  return String(v).toLowerCase().trim();
}

function safe(v: any): string {
  return v == null ? "" : String(v).trim();
}

function normCell(v: any): string {
  return String(v ?? "").trim();
}

function normLower(v: any): string {
  return normCell(v).toLowerCase();
}

function isProbablyDate(v: string): boolean {
  return /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(v.trim());
}

function extractDate(raw: any): string | null {
  if (!raw) return null;

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const yyyy = String(raw.getFullYear());
    const mm = String(raw.getMonth() + 1).padStart(2, "0");
    const dd = String(raw.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const v = String(raw).trim();
  if (!isProbablyDate(v)) return null;

  const m = v.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (!m) return null;

  let [_, dd, mm, yyyy] = m;
  if (yyyy.length === 2) yyyy = Number(yyyy) <= 30 ? "20" + yyyy : "19" + yyyy;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function formatWeightNumber(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (Number.isInteger(n)) return String(n);
  return String(n).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function compactSpaces(v: string): string {
  return v.replace(/\s+/g, " ").trim();
}

function cleanNamePart(v: any): string {
  return compactSpaces(String(v ?? "").replace(/\s+/g, " ").trim());
}

function joinNameParts(...parts: Array<string | null | undefined>): string | null {
  const out = parts
    .map((x) => cleanNamePart(x ?? ""))
    .filter(Boolean);

  if (!out.length) return null;
  return compactSpaces(out.join(" "));
}

/**
 * Parseert gewicht/notatie.
 *
 * exact:
 * - 56
 * - 56kg
 * - 56 kg
 * - 56 kilo
 * - KG 56
 * - Gewicht 56 kg
 *
 * klasse-notatie:
 * - -95
 * - - 95 kg
 * - 95+
 * - 95 + kg
 * - +95
 */
function extractWeightMeta(raw: any, opts?: { allowClassNotation?: boolean }): ParsedWeightMeta | null {
  const allowClassNotation = Boolean(opts?.allowClassNotation);

  if (raw == null) return null;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const abs = Math.abs(raw);

    // ExcelJS geeft een cel met -63.5 vaak als number -63.5 terug.
    // Dat is in matchmaking geen negatief gewicht, maar gewichtsklasse "tot 63.5".
    if (allowClassNotation && raw < 0 && abs >= 10 && abs <= 200) {
      return {
        value: abs,
        label: `-${formatWeightNumber(abs)}`,
        type: "up_to",
      };
    }

    if (raw >= 10 && raw <= 200) {
      const label = formatWeightNumber(raw);
      return { value: raw, label, type: "exact" };
    }
    return null;
  }

  const v = String(raw)
    .toLowerCase()
    .replace(",", ".")
    .replace(/\bkilo\b/g, "kg")
    .trim();

  if (!v) return null;
  if (isProbablyDate(v)) return null;

  if (allowClassNotation) {
    const plusAfter = v.match(/^\s*(\d+(?:\.\d+)?)\s*\+\s*(kg)?\s*$/i);
    if (plusAfter) {
      const n = Number(plusAfter[1]);
      if (Number.isFinite(n) && n >= 10 && n <= 200) {
        return {
          value: n,
          label: `${formatWeightNumber(n)}+`,
          type: "open_above",
        };
      }
    }

    const plusBefore = v.match(/^\s*\+\s*(\d+(?:\.\d+)?)\s*(kg)?\s*$/i);
    if (plusBefore) {
      const n = Number(plusBefore[1]);
      if (Number.isFinite(n) && n >= 10 && n <= 200) {
        return {
          value: n,
          label: `${formatWeightNumber(n)}+`,
          type: "open_above",
        };
      }
    }

    const minusPrefix = v.match(/^\s*-\s*(\d+(?:\.\d+)?)\s*(kg)?\s*$/i);
    if (minusPrefix) {
      const n = Number(minusPrefix[1]);
      if (Number.isFinite(n) && n >= 10 && n <= 200) {
        return {
          value: n,
          label: `-${formatWeightNumber(n)}`,
          type: "up_to",
        };
      }
    }
  } else {
    if (/^\s*-\s*\d/.test(v)) return null;
    if (/^\s*\+\s*\d/.test(v)) return null;
    if (/\d\s*\+\s*(kg)?\s*$/i.test(v)) return null;
  }

  const m = v.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;

  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  if (n < 10 || n > 200) return null;

  return {
    value: n,
    label: formatWeightNumber(n),
    type: "exact",
  };
}

/**
 * Alleen class-achtige notaties:
 * - -60
 * - - 60 kg
 * - 95+
 * - +95
 */
function extractClassWeightMetaOnly(raw: any): ParsedWeightMeta | null {
  if (raw == null) return null;

  const v = String(raw)
    .toLowerCase()
    .replace(",", ".")
    .replace(/\bkilo\b/g, "kg")
    .trim();

  if (!v) return null;
  if (isProbablyDate(v)) return null;

  const plusAfter = v.match(/^\s*(\d+(?:\.\d+)?)\s*\+\s*(kg)?\s*$/i);
  if (plusAfter) {
    const n = Number(plusAfter[1]);
    if (Number.isFinite(n) && n >= 10 && n <= 200) {
      return {
        value: n,
        label: `${formatWeightNumber(n)}+`,
        type: "open_above",
      };
    }
  }

  const plusBefore = v.match(/^\s*\+\s*(\d+(?:\.\d+)?)\s*(kg)?\s*$/i);
  if (plusBefore) {
    const n = Number(plusBefore[1]);
    if (Number.isFinite(n) && n >= 10 && n <= 200) {
      return {
        value: n,
        label: `${formatWeightNumber(n)}+`,
        type: "open_above",
      };
    }
  }

  const minusPrefix = v.match(/^\s*-\s*(\d+(?:\.\d+)?)\s*(kg)?\s*$/i);
  if (minusPrefix) {
    const n = Number(minusPrefix[1]);
    if (Number.isFinite(n) && n >= 10 && n <= 200) {
      return {
        value: n,
        label: `-${formatWeightNumber(n)}`,
        type: "up_to",
      };
    }
  }

  return null;
}

/**
 * Alleen exacte gewichten voor echte vechter-gewichten.
 */
function extractWeight(raw: any): string | null {
  const meta = extractWeightMeta(raw, { allowClassNotation: false });
  if (!meta) return null;
  return meta.type === "exact" ? meta.label : null;
}

function parseWeightNumber(v: any): number | null {
  const meta = extractWeightMeta(v, { allowClassNotation: false });
  if (!meta || meta.type !== "exact") return null;
  return Number.isFinite(meta.value) ? meta.value : null;
}

function parseAgreedWeightMeta(v: any): ParsedWeightMeta | null {
  const meta = extractWeightMeta(v, { allowClassNotation: true });
  if (!meta) return null;

  // Afgesproken partijgewicht:
  // - 62 / 62 kg / KG 62  => -62 (max / up_to)
  // - -62 / -62 kg        => -62 (max / up_to)
  // - 95+ / +95 / 95+ kg => 95+ (min / open_above)
  // Let op: plain 95 betekent dus -95. Alleen 95+ betekent vanaf 95 kg.
  if (meta.type === "exact") {
    return {
      value: meta.value,
      label: `-${formatWeightNumber(meta.value)}`,
      type: "up_to",
    };
  }

  return meta;
}

function extractRecord(raw: any) {
  if (!raw) return null;
  const v = String(raw).trim();
  const m = v.match(/^(\d+)\s*[-/]\s*(\d+)\s*[-/]\s*(\d+)$/);
  if (!m) return null;
  return { w: Number(m[1]), l: Number(m[2]), d: Number(m[3]) };
}

/**
 * VA-normalisatie:
 * - haalt alle niet-cijfers weg
 * - verwijdert leading zeros
 * - accepteert 2–6 cijfers als geldig
 */
function extractVA(raw: any): string | null {
  if (!raw) return null;
  const v = String(raw).trim();
  if (!v) return null;

  if (isProbablyDate(v)) return null;
  if (v.toLowerCase().includes("kg")) return null;
  if (v.toLowerCase().includes("kilo")) return null;
  if (extractRecord(v)) return null;

  let digits = v.replace(/\D+/g, "");
  if (!digits) return null;

  digits = digits.replace(/^0+/, "");
  if (!digits) return null;

  if (digits.length < 2 || digits.length > 6) return null;
  return digits;
}

function looksLikeRecord(v: string) {
  return /^\d+\s*[-/]\s*\d+\s*[-/]\s*\d+$/.test(v.trim());
}

function looksLikeName(v: string) {
  const s = v.trim();
  if (!s) return false;
  if (looksLikeRecord(s)) return false;
  if (isProbablyDate(s)) return false;
  if (extractVA(s)) return false;
  if (extractWeightMeta(s, { allowClassNotation: true })) return false;
  return /^[A-Za-zÀ-ÿ'’.\- ]{2,}$/.test(s);
}

function looksLikeGym(v: string) {
  return /(gym|team|boxing|kickbox|muay|thai|academy|club|fight|mma)/i.test(v);
}

function normalizeOpenOpponentCorner(bout: any) {
  const normalizeName = (value: any) => {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const norm = raw.toLowerCase().replace(/[._-]/g, " " ).replace(/\s+/g, " " ).trim();
    return [
      "tba",
      "t b a",
      "gezocht",
      "tegenstander gezocht",
      "opponent gezocht",
      "nog gezocht",
      "to be announced",
    ].includes(norm) ? "TBA" : raw;
  };

  const clear = (side: "rood" | "blauw") => {
    const nameKey = side === "rood" ? "rood_naam" : "blauw_naam";
    const gymKey = side === "rood" ? "rood_gym" : "blauw_gym";
    const vaKey = side === "rood" ? "va_rood" : "va_blauw";
    const dobKey = side === "rood" ? "rood_geboortedatum" : "blauw_geboortedatum";
    const weightKey = side === "rood" ? "rood_gewicht" : "blauw_gewicht";
    const weightNotationKey = side === "rood" ? "rood_gewicht_notatie" : "blauw_gewicht_notatie";
    const recPrefix = side === "rood" ? "record_rood_" : "record_blauw_";
    if (normalizeName(bout?.[nameKey]) !== "TBA") {
      bout[nameKey] = normalizeName(bout?.[nameKey]);
      return;
    }
    bout[nameKey] = "TBA";
    bout[gymKey] = null;
    bout[vaKey] = null;
    bout[dobKey] = null;
    bout[weightKey] = null;
    bout[weightNotationKey] = null;
    bout[`${recPrefix}w`] = 0;
    bout[`${recPrefix}l`] = 0;
    bout[`${recPrefix}d`] = 0;
    bout.extra = { ...(bout.extra ?? {}), [`${side}_open_opponent`]: true };
  };

  clear("rood");
  clear("blauw");
}

function makeEmptyBout(): ParsedBout {
  return {
    bout_uid: randomUUID(),
    partij_nr: null,

    rood_naam: null,
    rood_gym: null,
    va_rood: null,
    rood_geboortedatum: null,
    rood_gewicht: null,
    rood_gewicht_notatie: null,

    blauw_naam: null,
    blauw_gym: null,
    va_blauw: null,
    blauw_geboortedatum: null,
    blauw_gewicht: null,
    blauw_gewicht_notatie: null,

    discipline: null,
    klasse: null,

    max_gewicht: null,
    max_gewicht_notatie: null,

    min_gewicht: null,
    min_gewicht_notatie: null,

    record_rood_w: 0,
    record_rood_l: 0,
    record_rood_d: 0,

    record_blauw_w: 0,
    record_blauw_l: 0,
    record_blauw_d: 0,

    is_toernooi: false,
    toernooi_code: null,
    extra: {},
  };
}

function applyCornerWeightMeta(
  bout: ParsedBout,
  corner: "rood" | "blauw",
  meta: ParsedWeightMeta | null
) {
  if (!meta) return;

  if (corner === "rood") {
    if (meta.type === "exact") {
      bout.rood_gewicht = meta.label;
      bout.rood_gewicht_notatie = meta.label;
    } else {
      bout.rood_gewicht = null;
      bout.rood_gewicht_notatie = meta.label;
      bout.extra.rood_gewicht_type = meta.type;
    }
    return;
  }

  if (meta.type === "exact") {
    bout.blauw_gewicht = meta.label;
    bout.blauw_gewicht_notatie = meta.label;
  } else {
    bout.blauw_gewicht = null;
    bout.blauw_gewicht_notatie = meta.label;
    bout.extra.blauw_gewicht_type = meta.type;
  }
}

function applyAgreedWeightMeta(
  bout: ParsedBout,
  kind: "max" | "min",
  meta: ParsedWeightMeta | null
) {
  if (!meta) return;

  // +95 / 95+ betekent "vanaf 95 kg" en mag nooit als max_gewicht worden opgeslagen.
  if (meta.type === "open_above") {
    bout.min_gewicht = meta.value;
    bout.min_gewicht_notatie = meta.label;
    bout.extra.min_gewicht_type = meta.type;
    return;
  }

  // -63.5 / 63.5 in afgesproken gewicht betekent altijd "tot 63.5 kg".
  if (kind === "max") {
    bout.max_gewicht = meta.value;
    bout.max_gewicht_notatie = meta.label.startsWith("-")
      ? meta.label
      : `-${formatWeightNumber(meta.value)}`;
    bout.extra.max_gewicht_type = "up_to";
    return;
  }

  bout.min_gewicht = meta.value;
  bout.min_gewicht_notatie = meta.label;
  bout.extra.min_gewicht_type = meta.type;
}

/**
 * Belangrijk:
 * Als in een vechter-gewicht cel per ongeluk klasse-notatie staat
 * (zoals -45 of 95+), dan slaan we dat NIET op als hoekgewicht
 * maar als partijgewicht/max-notatie.
 */
function applySmartWeightFromCornerCell(
  bout: ParsedBout,
  corner: "rood" | "blauw",
  meta: ParsedWeightMeta | null,
  source?: string
) {
  if (!meta) return;

  if (meta.type === "exact") {
    applyCornerWeightMeta(bout, corner, meta);
    return;
  }

  // Klasse-notatie in hoekcel => behandel als partijgewicht / afgesproken gewicht
  if (bout.max_gewicht == null) {
    applyAgreedWeightMeta(bout, "max", meta);
    bout.extra.corner_weight_reinterpreted_as_max = true;
    bout.extra.corner_weight_reinterpreted_from = source ?? corner;
    return;
  }

  // Als max al bestaat, alleen notatie loggen maar NIET op hoekgewicht zetten
  bout.extra.corner_weight_class_notation_ignored = true;
  bout.extra.corner_weight_class_notation_source = source ?? corner;
  bout.extra.corner_weight_class_notation_value = meta.label;
}

function isVsMarker(v: any): boolean {
  const s = normLower(v);
  return s === "vs" || s === "v.s" || s === "v.s." || s === "versus";
}

function parseTCode(v: any): string | null {
  const s = normCell(v).toUpperCase();
  if (!s) return null;
  if (/^T\d{1,3}$/.test(s)) return s;
  return null;
}

function parsePartijNrOrToernooiCode(v: any): {
  partijNr: number | null;
  toernooiCode: string | null;
  raw: string;
} {
  const raw = normCell(v).toUpperCase();
  if (!raw) return { partijNr: null, toernooiCode: null, raw };

  if (/^T\d{1,3}$/.test(raw)) {
    return { partijNr: null, toernooiCode: raw, raw };
  }

  if (/^\d{1,4}$/.test(raw)) {
    return { partijNr: Number(raw), toernooiCode: null, raw };
  }

  return { partijNr: null, toernooiCode: null, raw };
}

/* =========================================================
   1. TEMPLATE PARSER (Admin upload template met VS/T)
========================================================= */

type TemplateCols = {
  partijNr: number;
  discipline: number;
  klasse: number;

  naam1: number;
  gym1: number;
  va1: number;
  kg1: number;

  vs: number;

  naam2: number;
  gym2: number;
  va2: number;
  kg2: number;

  maxKg: number | null;
  minKg: number | null;
};

function detectTemplateCols(headerRow: any[]): TemplateCols | null {
  const h = headerRow.map((x) => normLower(x));

  const at = (col1: number) => h[col1 - 1] ?? "";

  const fixedTemplateMatch =
    at(1).includes("partij") &&
    at(2).includes("discipline") &&
    at(3).includes("klasse") &&
    at(4).includes("naam atleet 1") &&
    at(5).includes("sportschool") &&
    at(6).includes("fightpaspoort") &&
    (at(7) === "kg (1)" || at(7) === "gewicht (1)" || at(7).includes("kg (1)") || at(7).includes("gewicht (1)")) &&
    (at(8) === "vs" || at(8) === "v.s" || at(8).includes("vs")) &&
    at(9).includes("naam atleet 2") &&
    at(10).includes("sportschool") &&
    at(11).includes("fightpaspoort") &&
    (at(12) === "kg (2)" || at(12) === "gewicht (2)" || at(12).includes("kg (2)") || at(12).includes("gewicht (2)")) &&
    (at(13).includes("max kg") || at(13).includes("max gewicht"));

  if (fixedTemplateMatch) {
    return {
      partijNr: 1,
      discipline: 2,
      klasse: 3,
      naam1: 4,
      gym1: 5,
      va1: 6,
      kg1: 7,
      vs: 8,
      naam2: 9,
      gym2: 10,
      va2: 11,
      kg2: 12,
      maxKg: 13,
      minKg: null,
    };
  }

  const idx = (needles: string[]) => {
    for (let i = 0; i < h.length; i++) {
      const v = h[i];
      if (!v) continue;
      if (needles.some((n) => v === n || v.includes(n))) return i + 1;
    }
    return -1;
  };

  const partijNr = idx(["partij nr", "partijnr", "partij"]);
  const discipline = idx(["discipline"]);
  const klasse = idx(["klasse"]);
  const naam1 = idx(["naam atleet 1", "naam 1", "atleet 1"]);
  const gym1 = idx(["sportschool (1)", "gym (1)", "sportschool 1", "gym 1"]);
  const va1 = idx(["fightpaspoort nr (1)", "va (1)", "va 1", "fightpaspoort 1"]);
  const kg1 = idx(["kg (1)", "gewicht (1)", "kg 1", "gewicht 1"]);
  const vs = idx(["vs", "v.s"]);
  const naam2 = idx(["naam atleet 2", "naam 2", "atleet 2"]);
  const gym2 = idx(["sportschool (2)", "gym (2)", "sportschool 2", "gym 2"]);
  const va2 = idx(["fightpaspoort nr (2)", "va (2)", "va 2", "fightpaspoort 2"]);
  const kg2 = idx(["kg (2)", "gewicht (2)", "kg 2", "gewicht 2"]);
  const maxKg = idx(["max kg", "maxkg", "max gewicht"]);
  const minKg = idx(["min kg", "minkg", "min gewicht"]);

  if ([partijNr, discipline, klasse, naam1, gym1, va1, vs, naam2, gym2, va2].some((x) => x < 1)) {
    return null;
  }

  return {
    partijNr,
    discipline,
    klasse,
    naam1,
    gym1,
    va1,
    kg1: kg1 > 0 ? kg1 : -1,
    vs,
    naam2,
    gym2,
    va2,
    kg2: kg2 > 0 ? kg2 : -1,
    maxKg: maxKg > 0 ? maxKg : null,
    minKg: minKg > 0 ? minKg : null,
  };
}


function scoreTemplateWorksheet(ws: ExcelJS.Worksheet): number {
  let best = 0;

  for (let r = 1; r <= Math.min(25, ws.rowCount); r++) {
    const row = ws.getRow(r);
    const header: any[] = [];

    for (let c = 1; c <= Math.min(17, ws.columnCount); c++) {
      header.push(row.getCell(c).value);
    }

    const detected = detectTemplateCols(header);
    if (!detected) continue;

    let dataRows = 0;
    for (let rr = r + 1; rr <= Math.min(ws.rowCount, r + 80); rr++) {
      const dataRow = ws.getRow(rr);
      const a = normCell(dataRow.getCell(detected.partijNr).value);
      const d = normCell(dataRow.getCell(detected.discipline).value);
      const n1 = normCell(dataRow.getCell(detected.naam1).value);
      const n2 = normCell(dataRow.getCell(detected.naam2).value);
      const va1 = extractVA(dataRow.getCell(detected.va1).value);
      const va2 = extractVA(dataRow.getCell(detected.va2).value);
      const h = normCell(dataRow.getCell(detected.vs).value);

      if (a || d || n1 || n2 || va1 || va2 || isVsMarker(h) || parseTCode(h)) dataRows++;
    }

    best = Math.max(best, 100 + dataRows);
  }

  return best;
}

function pickBestTemplateWorksheet(wb: ExcelJS.Workbook): ExcelJS.Worksheet | null {
  let bestWs: ExcelJS.Worksheet | null = null;
  let bestScore = -1;

  for (const ws of wb.worksheets ?? []) {
    const score = scoreTemplateWorksheet(ws);
    if (score > bestScore) {
      bestScore = score;
      bestWs = ws;
    }
  }

  return bestScore > 0 ? bestWs : wb.worksheets?.[0] ?? null;
}

async function tryParseAdminTemplate(fileBuffer: Buffer): Promise<any[] | null> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fileBuffer as any);

  const ws = pickBestTemplateWorksheet(wb);
  if (!ws) return null;

  let headerRowIndex = -1;
  let cols: TemplateCols | null = null;

  for (let r = 1; r <= Math.min(25, ws.rowCount); r++) {
    const row = ws.getRow(r);
    const header = [];
    for (let c = 1; c <= Math.min(13, ws.columnCount); c++) {
      header.push(row.getCell(c).value);
    }

    const detected = detectTemplateCols(header);
    if (detected) {
      headerRowIndex = r;

      // Eigen FightSupport-template is altijd A t/m M.
      // Kolom Q bevat alleen de dropdown/lijst voor kolom H en mag nooit worden gelezen.
      cols = {
        partijNr: 1,
        discipline: 2,
        klasse: 3,
        naam1: 4,
        gym1: 5,
        va1: 6,
        kg1: 7,
        vs: 8,
        naam2: 9,
        gym2: 10,
        va2: 11,
        kg2: 12,
        maxKg: 13,
        minKg: null,
      };
      break;
    }
  }

  if (!cols || headerRowIndex < 1) return null;

  const bouts: any[] = [];
  const deelnemersByT: Record<string, any[]> = {};

  const pushTournamentDeelnemer = (code: string, deelnemer: any) => {
    if (!code) return;
    if (!deelnemer?.naam && !deelnemer?.va && !deelnemer?.gym && !deelnemer?.kg_meta) return;

    if (!deelnemersByT[code]) deelnemersByT[code] = [];
    deelnemersByT[code].push(deelnemer);
  };

  const lastRow = ws.rowCount;
  for (let r = headerRowIndex + 1; r <= lastRow; r++) {
    const row = ws.getRow(r);

    const partijMeta = parsePartijNrOrToernooiCode(row.getCell(cols.partijNr).value);
    const partijNr = partijMeta.partijNr;

    const discipline = normCell(row.getCell(cols.discipline).value) || null;
    const klasse = normCell(row.getCell(cols.klasse).value) || null;

    const naam1 = normCell(row.getCell(cols.naam1).value) || null;
    const gym1 = normCell(row.getCell(cols.gym1).value) || null;
    const va1 = extractVA(row.getCell(cols.va1).value) || null;
    const kg1Meta =
      cols.kg1 > 0 ? extractWeightMeta(row.getCell(cols.kg1).value, { allowClassNotation: true }) : null;

    // Kolom H is leidend:
    // - "VS" = gewone partij
    // - "T1" / "T2" / ... = toernooi
    // Kolom Q wordt bewust genegeerd, omdat die alleen de dropdown/data-validatie-lijst is.
    const vsVal = row.getCell(cols.vs).value;
    const hTournamentCode = parseTCode(vsVal);

    const naam2 = normCell(row.getCell(cols.naam2).value) || null;
    const gym2 = normCell(row.getCell(cols.gym2).value) || null;
    const va2 = extractVA(row.getCell(cols.va2).value) || null;
    const kg2Meta =
      cols.kg2 > 0 ? extractWeightMeta(row.getCell(cols.kg2).value, { allowClassNotation: true }) : null;

    const maxKgVal = cols.maxKg ? row.getCell(cols.maxKg).value : null;
    const minKgVal = cols.minKg ? row.getCell(cols.minKg).value : null;

    const maxKgMeta = parseAgreedWeightMeta(maxKgVal);
    const minKgMeta = parseAgreedWeightMeta(minKgVal);

    // Sommige promotors vullen het afgesproken gewicht per ongeluk in KG (1) of KG (2)
    // en laten Max KG leeg. Als maar één van beide KG-kolommen gevuld is, behandelen we
    // die waarde als partijniveau-gewicht en NIET als rood/blauw vechtergewicht.
    const kg1AsAgreedMeta =
      !maxKgMeta &&
      !minKgMeta &&
      kg1Meta &&
      !kg2Meta
        ? parseAgreedWeightMeta(row.getCell(cols.kg1).value)
        : null;

    const kg2AsAgreedMeta =
      !maxKgMeta &&
      !minKgMeta &&
      kg2Meta &&
      !kg1Meta
        ? parseAgreedWeightMeta(row.getCell(cols.kg2).value)
        : null;

    const effectiveMaxKgMeta = maxKgMeta ?? kg1AsAgreedMeta ?? kg2AsAgreedMeta;

    const isEmptyLine =
      !naam1 &&
      !gym1 &&
      !va1 &&
      !kg1Meta &&
      !naam2 &&
      !gym2 &&
      !va2 &&
      !kg2Meta &&
      !discipline &&
      !klasse &&
      !hTournamentCode &&
      !maxKgMeta &&
      !minKgMeta &&
      partijNr == null;

    if (isEmptyLine) continue;

    if (isVsMarker(vsVal) && (naam1 || va1 || gym1 || naam2 || va2 || gym2 || kg1Meta || kg2Meta)) {
      const bout = makeEmptyBout();
      bout.bout_uid = randomUUID();
      bout.partij_nr = partijNr;

      bout.rood_naam = naam1;
      bout.rood_gym = gym1;
      bout.va_rood = va1;
      bout.rood_geboortedatum = null;

      if (kg1Meta && !kg1AsAgreedMeta) {
        applySmartWeightFromCornerCell(bout, "rood", kg1Meta, "template_kg1");
      }

      bout.blauw_naam = naam2;
      bout.blauw_gym = gym2;
      bout.va_blauw = va2;
      bout.blauw_geboortedatum = null;

      if (kg2Meta && !kg2AsAgreedMeta) {
        applySmartWeightFromCornerCell(bout, "blauw", kg2Meta, "template_kg2");
      }

      bout.discipline = discipline;
      bout.klasse = klasse;

      if (effectiveMaxKgMeta) applyAgreedWeightMeta(bout, "max", effectiveMaxKgMeta);
      if (minKgMeta) applyAgreedWeightMeta(bout, "min", minKgMeta);

      bout.record_rood_w = 0;
      bout.record_rood_l = 0;
      bout.record_rood_d = 0;

      bout.record_blauw_w = 0;
      bout.record_blauw_l = 0;
      bout.record_blauw_d = 0;

      bout.is_toernooi = false;
      bout.toernooi_code = null;
      bout.extra = {
        ...bout.extra,
        template: "admin_vs_t_fixed_a_m",
        h_marker: normCell(vsVal) || null,
        rood_gewicht_type: kg1Meta?.type ?? null,
        blauw_gewicht_type: kg2Meta?.type ?? null,
        max_gewicht_type: bout.extra.max_gewicht_type ?? effectiveMaxKgMeta?.type ?? null,
        agreed_weight_from_corner_kg: kg1AsAgreedMeta ? "kg1" : kg2AsAgreedMeta ? "kg2" : null,
        min_gewicht_type: bout.extra.min_gewicht_type ?? minKgMeta?.type ?? null,
      };

      normalizeOpenOpponentCorner(bout);
      bouts.push(bout);
      continue;
    }

    if (hTournamentCode) {
      pushTournamentDeelnemer(hTournamentCode, {
        naam: naam1,
        gym: gym1,
        va: va1,
        kg_meta: kg1Meta,
        discipline,
        klasse,
        max_gewicht_meta: effectiveMaxKgMeta,
        min_gewicht_meta: minKgMeta,
      });

      // Meestal gebruikt een toernooi-rij alleen atleet 1.
      // Als iemand toch atleet 2 invult op dezelfde T-rij, nemen we die ook mee.
      pushTournamentDeelnemer(hTournamentCode, {
        naam: naam2,
        gym: gym2,
        va: va2,
        kg_meta: kg2Meta,
        discipline,
        klasse,
        max_gewicht_meta: effectiveMaxKgMeta,
        min_gewicht_meta: minKgMeta,
      });
    }
  }

  for (const [code, deelnemers] of Object.entries(deelnemersByT)) {
    const list = (deelnemers ?? []).filter((x) => x?.naam || x?.va);
    if (list.length < 2) continue;

    const d = list.find((x) => x?.discipline)?.discipline ?? null;
    const k = list.find((x) => x?.klasse)?.klasse ?? null;
    const mk = list.find((x) => x?.max_gewicht_meta != null)?.max_gewicht_meta ?? null;
    const nk = list.find((x) => x?.min_gewicht_meta != null)?.min_gewicht_meta ?? null;

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];

        const bout = makeEmptyBout();
        bout.bout_uid = randomUUID();

        // Toernooi-bouts worden gegenereerd; geen nep partijnummers.
        bout.partij_nr = null;

        bout.rood_naam = a?.naam ?? null;
        bout.rood_gym = a?.gym ?? null;
        bout.va_rood = a?.va ?? null;
        bout.rood_geboortedatum = null;
        if (a?.kg_meta) applySmartWeightFromCornerCell(bout, "rood", a.kg_meta, "template_toernooi_rood");

        bout.blauw_naam = b?.naam ?? null;
        bout.blauw_gym = b?.gym ?? null;
        bout.va_blauw = b?.va ?? null;
        bout.blauw_geboortedatum = null;
        if (b?.kg_meta) applySmartWeightFromCornerCell(bout, "blauw", b.kg_meta, "template_toernooi_blauw");

        bout.discipline = d;
        bout.klasse = k;

        if (mk) applyAgreedWeightMeta(bout, "max", mk);
        if (nk) applyAgreedWeightMeta(bout, "min", nk);

        bout.record_rood_w = 0;
        bout.record_rood_l = 0;
        bout.record_rood_d = 0;

        bout.record_blauw_w = 0;
        bout.record_blauw_l = 0;
        bout.record_blauw_d = 0;

        bout.is_toernooi = true;
        bout.toernooi_code = code;

        bout.extra = {
          ...bout.extra,
          toernooi_code: code,
          toernooi_format: "roundrobin",
          template: "admin_vs_t_fixed_a_m",
          h_marker: code,
          rood_gewicht_type: a?.kg_meta?.type ?? null,
          blauw_gewicht_type: b?.kg_meta?.type ?? null,
          max_gewicht_type: bout.extra.max_gewicht_type ?? mk?.type ?? null,
          min_gewicht_type: bout.extra.min_gewicht_type ?? nk?.type ?? null,
        };

        normalizeOpenOpponentCorner(bout);
        bouts.push(bout);
      }
    }
  }

  if (bouts.length) {
    console.log("[parseExcelToBouts] admin template parsed", {
      template: "admin_vs_t_fixed_a_m",
      rows: bouts.length,
      normal_bouts: bouts.filter((b) => b.is_toernooi !== true).length,
      tournament_bouts: bouts.filter((b) => b.is_toernooi === true).length,
      va_rood: bouts.filter((b) => b.va_rood).length,
      va_blauw: bouts.filter((b) => b.va_blauw).length,
      unique_va: new Set(
        bouts.flatMap((b) => [b.va_rood, b.va_blauw]).filter(Boolean)
      ).size,
    });
  }

  return bouts.length ? bouts : null;
}

/* =========================================================
   2. UNIVERSELE SHEET ADAPTER (.xlsx ExcelJS / .xls SheetJS)
========================================================= */

type Corner = "rood" | "blauw" | null;

type CellLike = {
  value: any;
  text: string;
  fillARGB: string | null;
};

type RowLike = {
  getCell(col: number): CellLike;
};

type SheetLike = {
  rowCount: number;
  columnCount: number;
  getRow(r: number): RowLike;
};

function isOleXls(buf: Buffer): boolean {
  if (!buf || buf.length < 8) return false;
  return (
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0 &&
    buf[4] === 0xa1 &&
    buf[5] === 0xb1 &&
    buf[6] === 0x1a &&
    buf[7] === 0xe1
  );
}

function normalizeARGB(argb: string | null): string | null {
  if (!argb) return null;
  const s = String(argb).replace(/^#/, "").toUpperCase();
  if (s.length === 6) return "FF" + s;
  if (s.length === 8) return s;
  return null;
}

function cornerFromARGB(argb: string | null): Corner {
  if (!argb) return null;
  const a = argb.toUpperCase();

  if (a.endsWith("FF0000") || a.endsWith("C00000") || a.endsWith("E06666")) return "rood";
  if (a.endsWith("F4CCCC") || a.endsWith("FF9999") || a.endsWith("FF6D01")) return "rood";

  if (a.endsWith("00B0F0") || a.endsWith("0070C0") || a.endsWith("0000FF")) return "blauw";
  if (a.endsWith("CFE2F3") || a.endsWith("CCECFF") || a.endsWith("66FFFF")) return "blauw";

  return null;
}

function getCellCornerFromLike(cell: CellLike): Corner {
  return cornerFromARGB(cell.fillARGB);
}

function exceljsToSheetLike(ws: ExcelJS.Worksheet): SheetLike {
  const rowCount = ws.rowCount || 0;
  const columnCount = ws.columnCount || 0;

  return {
    rowCount,
    columnCount,
    getRow(r: number): RowLike {
      const row = ws.getRow(r);
      return {
        getCell(c: number): CellLike {
          const cell = row.getCell(c) as ExcelJS.Cell;
          const v: any = cell.value;

          let text = "";
          if (v == null) text = "";
          else if (typeof v === "object" && (v as any).text) text = safe((v as any).text);
          else text = safe(v);

          const fill: any = (cell as any).fill;
          const fg = fill?.fgColor?.argb ? String(fill.fgColor.argb).toUpperCase() : null;

          return { value: v, text, fillARGB: normalizeARGB(fg) };
        },
      };
    },
  };
}

function sheetjsToSheetLike(workbook: XLSX.WorkBook, sheetName?: string): SheetLike {
  const name = sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[name];

  if (!sheet) {
    return {
      rowCount: 0,
      columnCount: 0,
      getRow: () => ({ getCell: () => ({ value: null, text: "", fillARGB: null }) }),
    };
  }

  const ref = sheet["!ref"] || "A1:A1";
  const range = XLSX.utils.decode_range(ref);
  const rowCount = range.e.r + 1;
  const columnCount = range.e.c + 1;

  function getCell(r1: number, c1: number): CellLike {
    const addr = XLSX.utils.encode_cell({ r: r1 - 1, c: c1 - 1 });
    const cell: any = sheet[addr];

    if (!cell) return { value: null, text: "", fillARGB: null };

    let value: any = cell.v ?? null;
    if (cell.t === "d" && cell.v instanceof Date) value = cell.v;

    const text = safe(cell.w ?? cell.v ?? "");

    const s = cell.s;
    const rgb =
      s?.fill?.fgColor?.rgb ||
      s?.fill?.fgColor?.argb ||
      s?.fgColor?.rgb ||
      s?.fgColor?.argb ||
      null;

    return { value, text, fillARGB: normalizeARGB(rgb) };
  }

  return {
    rowCount,
    columnCount,
    getRow(r: number): RowLike {
      return {
        getCell(c: number): CellLike {
          return getCell(r, c);
        },
      };
    },
  };
}

/* =========================================================
   3. HEADER DETECTIE – ROBUUST
========================================================= */

const HEADER_KEYWORDS = [
  "partij",
  "partijnr",
  "partij nr",
  "nr",
  "bout",
  "v.s",
  "vs",
  "rood",
  "blauw",
  "red",
  "blue",
  "hoek",
  "corner",

  "voor",
  "voornaam",
  "ach",
  "achternaam",
  "naam",
  "fighter",
  "vechter",

  "gym",
  "school",
  "sportschool",
  "vereniging",
  "club",
  "team",

  "va",
  "va nr",
  "paspoort",
  "passport",
  "id",
  "nva",

  "gew",
  "gewicht",
  "kg",
  "max kg",
  "max gewicht",
  "min kg",
  "min gewicht",
  "kilo",

  "geb",
  "geboorte",
  "dob",
  "birth",
  "leeftijd",
  "age",

  "erv",
  "ervaring",
  "record",
  "rec",
  "exp",

  "stijl",
  "discipline",
  "klasse",
  "class",
  "categorie",
  "cat",

  "duur",
  "rondes",
];

function cellTextLike(cell: CellLike): string {
  return safe(cell.text ?? cell.value ?? "");
}

function rowToStringsLike(row: RowLike, maxCol: number) {
  const out: string[] = [];
  for (let c = 1; c <= maxCol; c++) out.push(norm(cellTextLike(row.getCell(c))));
  return out;
}

function detectHeaderRow(sheet: SheetLike, maxScanRows = 50, maxCol = 80): number {
  let bestRow = 1;
  let bestScore = -1;

  const scanRows = Math.min(sheet.rowCount || 200, maxScanRows);

  for (let r = 1; r <= scanRows; r++) {
    const row = sheet.getRow(r);
    const cells = rowToStringsLike(row, maxCol).filter((x) => x !== "");
    if (cells.length < 3) continue;

    let score = 0;
    for (const c of cells) {
      for (const k of HEADER_KEYWORDS) {
        if (c.includes(k)) score += 1;
      }
    }

    const joined = cells.join(" | ");
    if (joined.includes("rood") || joined.includes("red")) score += 3;
    if (joined.includes("blauw") || joined.includes("blue")) score += 3;
    if (joined.includes("vs") || joined.includes("v.s")) score += 2;

    const voorCount = cells.filter((c) => c === "voornaam" || c.includes("voornaam")).length;
    const achCount = cells.filter((c) => c === "achternaam" || c.includes("achternaam")).length;
    if (voorCount >= 1) score += 4;
    if (achCount >= 1) score += 4;
    if (voorCount >= 2 && achCount >= 2) score += 6;

    let dataLike = 0;
    for (const c of cells) {
      if (extractVA(c)) dataLike++;
      if (extractDate(c)) dataLike++;
      if (looksLikeRecord(c)) dataLike++;
    }
    score -= Math.min(6, Math.floor(dataLike / 2));

    if (score > bestScore) {
      bestScore = score;
      bestRow = r;
    }
  }

  return bestRow;
}

/* =========================================================
   4. VA-ONLY PAIRING MODE
========================================================= */

function tryParseVaOnlyPairs(sheet: SheetLike): ParsedBout[] | null {
  const maxRows = Math.min(sheet.rowCount || 500, 200);
  const maxCol = Math.min(sheet.columnCount || 50, 10);

  const bouts: ParsedBout[] = [];

  for (let r = 1; r <= maxRows; r++) {
    const row = sheet.getRow(r);

    let boutNr: number | null = null;
    for (let c = 1; c <= maxCol; c++) {
      const txt = cellTextLike(row.getCell(c));
      const m = txt.match(/bout\s*(\d+)/i);
      if (m) {
        boutNr = Number(m[1]);
        break;
      }
    }
    if (!boutNr) continue;

    const leftRaw = cellTextLike(row.getCell(1));
    const rightRaw = cellTextLike(row.getCell(3));

    const vaL = extractVA(leftRaw);
    const vaR = extractVA(rightRaw);

    const hasAny = Boolean(vaL || vaR || leftRaw || rightRaw);
    if (!hasAny) continue;

    const b = makeEmptyBout();
    b.partij_nr = boutNr;
    b.va_rood = vaL;
    b.va_blauw = vaR;

    b.extra.mode = "va_only_pairing";
    b.extra.raw_left = leftRaw || null;
    b.extra.raw_right = rightRaw || null;

    bouts.push(b);
  }

  if (bouts.length >= 3) return bouts;
  return null;
}

/* =========================================================
   5. KOLOM MAPPING – SLIM + KLEUR
========================================================= */

type ColMap = {
  naam?: number | null;
  voor?: number | null;
  ach?: number | null;
  gym?: number | null;
  geb?: number | null;
  gew?: number | null;
  va?: number | null;
  rec?: number | null;
  leeftijd?: number | null;
  start?: number;
  end?: number;
};

function headerCornerFromText(h: string): Corner {
  const s = norm(h);
  if (!s) return null;
  if (s.includes("rood") || s.includes("red")) return "rood";
  if (s.includes("blauw") || s.includes("blue")) return "blauw";
  return null;
}

function isStrictVoornaamHeader(h: string): boolean {
  const s = norm(h);
  return s === "voornaam" || s.includes("voornaam");
}

function isStrictAchternaamHeader(h: string): boolean {
  const s = norm(h);
  return s === "achternaam" || s.includes("achternaam");
}

function isGenericNaamHeader(h: string): boolean {
  const s = norm(h);
  if (!s) return false;
  if (isStrictVoornaamHeader(s)) return false;
  if (isStrictAchternaamHeader(s)) return false;
  return s === "naam" || s.includes(" naam") || s.startsWith("naam ") || s.includes("fighter") || s.includes("vechter");
}

function isMaxWeightHeader(h: string): boolean {
  const s = norm(h);
  if (!s) return false;

  return (
    s.includes("max gewicht") ||
    s.includes("maxkg") ||
    s.includes("max kg") ||
    s.includes("maximum gewicht") ||
    s.includes("maximum kg")
  );
}

function isMinWeightHeader(h: string): boolean {
  const s = norm(h);
  if (!s) return false;

  return (
    s.includes("min gewicht") ||
    s.includes("minkg") ||
    s.includes("min kg") ||
    s.includes("minimum gewicht") ||
    s.includes("minimum kg")
  );
}

function isAgreedWeightHeader(h: string): boolean {
  const s = norm(h);
  if (!s) return false;

  return (
    isMaxWeightHeader(s) ||
    isMinWeightHeader(s) ||
    s.includes("afgesproken gewicht") ||
    s.includes("afgesproken kg") ||
    s.includes("matchmaker gewicht")
  );
}

function isFighterWeightHeader(h: string): boolean {
  const s = norm(h);
  if (!s) return false;
  if (isAgreedWeightHeader(s)) return false;

  return (
    s === "gewicht" ||
    s === "kg" ||
    s === "gew" ||
    s === "kilo" ||
    s === "gewicht rood" ||
    s === "gewicht blauw" ||
    s === "kg rood" ||
    s === "kg blauw" ||
    s === "rood gewicht" ||
    s === "blauw gewicht" ||
    s === "rood kg" ||
    s === "blauw kg"
  );
}

function findInRange(headers0: string[], start0: number, end0: number, patterns: string[]): number | null {
  for (let i = start0; i <= end0 && i < headers0.length; i++) {
    const h = headers0[i];
    if (!h) continue;
    if (patterns.some((p) => h === p || h.includes(p))) return i + 1;
  }
  return null;
}

function findVoornaamColInRange(headers0: string[], start0: number, end0: number): number | null {
  for (let i = start0; i <= end0 && i < headers0.length; i++) {
    if (isStrictVoornaamHeader(headers0[i] || "")) return i + 1;
  }
  return null;
}

function findAchternaamColInRange(headers0: string[], start0: number, end0: number): number | null {
  for (let i = start0; i <= end0 && i < headers0.length; i++) {
    if (isStrictAchternaamHeader(headers0[i] || "")) return i + 1;
  }
  return null;
}

function findNameColInRange(headers0: string[], start0: number, end0: number): number | null {
  for (let i = start0; i <= end0 && i < headers0.length; i++) {
    const h = headers0[i] || "";
    if (!h) continue;
    if (isGenericNaamHeader(h)) return i + 1;
  }
  return null;
}

function findWeightColInRange(headers0: string[], start0: number, end0: number): number | null {
  for (let i = start0; i <= end0 && i < headers0.length; i++) {
    const h = headers0[i] || "";
    if (!h) continue;
    if (isFighterWeightHeader(h)) return i + 1;
  }
  return null;
}

function findGlobalMaxWeightCol(headers0: string[]): number | null {
  for (let i = 0; i < headers0.length; i++) {
    const h = headers0[i] || "";
    if (isMaxWeightHeader(h)) return i + 1;
  }
  return null;
}

function findGlobalMinWeightCol(headers0: string[]): number | null {
  for (let i = 0; i < headers0.length; i++) {
    const h = headers0[i] || "";
    if (isMinWeightHeader(h)) return i + 1;
  }
  return null;
}

function findCornerStartsFromRowAbove(opts: { sheet: SheetLike; headerRowIndex: number; maxCol: number }): {
  redStart?: number;
  blueStart?: number;
} {
  const { sheet, headerRowIndex, maxCol } = opts;
  const r = headerRowIndex - 1;
  if (r < 1) return {};

  const row = sheet.getRow(r);

  let redStart: number | undefined;
  let blueStart: number | undefined;

  for (let c = 1; c <= maxCol; c++) {
    const cell = row.getCell(c);
    const txt = norm(cellTextLike(cell));
    const cc = getCellCornerFromLike(cell);

    if (!redStart && (txt.includes("rode hoek") || txt === "rood" || txt.includes("rood") || txt.includes("red"))) {
      redStart = c;
    }
    if (!blueStart && (txt.includes("blauwe hoek") || txt === "blauw" || txt.includes("blauw") || txt.includes("blue"))) {
      blueStart = c;
    }

    if (!redStart && cc === "rood") redStart = c;
    if (!blueStart && cc === "blauw") blueStart = c;
  }

  return { redStart, blueStart };
}

function buildCornerMaps(opts: { sheet: SheetLike; headerRowIndex: number; maxCol: number }): {
  red: ColMap;
  blue: ColMap;
  styleCol: number | null;
  classCol: number | null;
  partijCol: number | null;
  maxGewCol: number | null;
  minGewCol: number | null;
} {
  const { sheet, headerRowIndex, maxCol } = opts;

  const headerRow = sheet.getRow(headerRowIndex);
  const headers0: string[] = [];
  const headerCorners0: Corner[] = [];

  for (let c = 1; c <= maxCol; c++) {
    const cell = headerRow.getCell(c);
    const raw = cellTextLike(cell);
    const h = norm(raw);
    headers0.push(h);

    const byText = headerCornerFromText(h);
    const byColor = getCellCornerFromLike(cell);
    headerCorners0.push(byText || byColor || null);
  }

  const styleColIdx = headers0.findIndex((h) => h && (h.includes("stijl") || h.includes("discipline")));
  const classColIdx = headers0.findIndex((h) => h && (h.includes("klasse") || h.includes("class") || h.includes("categorie") || h.includes("cat")));
  const partijColIdx = headers0.findIndex((h) => h && (h.includes("partij") || h === "nr" || h.includes("partijnr")));
  const maxGewCol = findGlobalMaxWeightCol(headers0);
  const minGewCol = findGlobalMinWeightCol(headers0);

  const styleCol = styleColIdx >= 0 ? styleColIdx + 1 : null;
  const classCol = classColIdx >= 0 ? classColIdx + 1 : null;
  const partijCol = partijColIdx >= 0 ? partijColIdx + 1 : 1;

  const vsColIdx = headers0.findIndex((h) => h && (h === "vs" || h.includes("vs") || h.includes("v.s")));
  const vsCol = vsColIdx >= 0 ? vsColIdx + 1 : null;

  const voornaamCols: number[] = [];
  const achternaamCols: number[] = [];
  const naamCols: number[] = [];

  for (let i = 0; i < headers0.length; i++) {
    const h = headers0[i] || "";
    if (!h) continue;

    if (isStrictVoornaamHeader(h)) {
      voornaamCols.push(i + 1);
      continue;
    }
    if (isStrictAchternaamHeader(h)) {
      achternaamCols.push(i + 1);
      continue;
    }
    if (isGenericNaamHeader(h)) {
      naamCols.push(i + 1);
    }
  }

  const above = findCornerStartsFromRowAbove({ sheet, headerRowIndex, maxCol });

  const redStartByDup =
    voornaamCols[0] ||
    naamCols[0] ||
    achternaamCols[0] ||
    null;

  const blueStartByDup =
    voornaamCols.length >= 2
      ? voornaamCols[1]
      : naamCols.length >= 2
      ? naamCols[1]
      : achternaamCols.length >= 2
      ? achternaamCols[1]
      : null;

  const redNameByCorner =
    voornaamCols.find((c) => headerCorners0[c - 1] === "rood") ||
    naamCols.find((c) => headerCorners0[c - 1] === "rood") ||
    achternaamCols.find((c) => headerCorners0[c - 1] === "rood") ||
    null;

  const blueNameByCorner =
    voornaamCols.find((c) => headerCorners0[c - 1] === "blauw") ||
    naamCols.find((c) => headerCorners0[c - 1] === "blauw") ||
    achternaamCols.find((c) => headerCorners0[c - 1] === "blauw") ||
    null;

  const redStart = above.redStart || redStartByDup || redNameByCorner || 2;

  let blueStart = above.blueStart || blueStartByDup || blueNameByCorner || null;
  if (!blueStart) blueStart = Math.min(maxCol, redStart + 7);
  if (blueStart <= redStart) {
    const alt = blueStartByDup && blueStartByDup > redStart ? blueStartByDup : null;
    blueStart = alt || Math.min(maxCol, redStart + 7);
  }

  let redRange = { start: Math.max(1, redStart), end: Math.max(1, blueStart - 1) };
  let blueRange = { start: Math.max(1, blueStart), end: maxCol };

  if (vsCol && vsCol > redRange.start && vsCol < blueRange.end) {
    redRange = { start: redRange.start, end: Math.max(redRange.start, vsCol - 1) };
    blueRange = { start: Math.min(maxCol, vsCol + 1), end: maxCol };
  }

  const agreedCols = [maxGewCol, minGewCol].filter(
    (x): x is number => typeof x === "number" && x >= blueRange.start && x <= blueRange.end
  );

  if (agreedCols.length) {
    const firstAgreedCol = Math.min(...agreedCols);
    blueRange.end = Math.max(blueRange.start, firstAgreedCol - 1);
  }

  if (styleCol && styleCol >= blueRange.start && styleCol <= blueRange.end) {
    blueRange.end = Math.max(blueRange.start, styleCol - 1);
  }

  if (classCol && classCol >= blueRange.start && classCol <= blueRange.end) {
    blueRange.end = Math.max(blueRange.start, classCol - 1);
  }

  const red0s = redRange.start - 1;
  const red0e = redRange.end - 1;
  const blu0s = blueRange.start - 1;
  const blu0e = blueRange.end - 1;

  const pGym = ["gym", "sportschool", "school", "vereniging", "club", "team"];
  const pGeb = ["geboorte", "geboortedatum", "geb", "dob", "birth"];
  const pVA = ["va", "va nr", "paspoort", "passport", "id", "nva"];
  const pRec = ["record", "rec", "erv", "ervaring", "exp"];
  const pLeeftijd = ["leeftijd", "age"];

  const red: ColMap = {
    start: redRange.start,
    end: redRange.end,
    voor: findVoornaamColInRange(headers0, red0s, red0e),
    ach: findAchternaamColInRange(headers0, red0s, red0e),
    naam: findNameColInRange(headers0, red0s, red0e),
    gym: findInRange(headers0, red0s, red0e, pGym),
    geb: findInRange(headers0, red0s, red0e, pGeb),
    gew: findWeightColInRange(headers0, red0s, red0e),
    va: findInRange(headers0, red0s, red0e, pVA),
    rec: findInRange(headers0, red0s, red0e, pRec),
    leeftijd: findInRange(headers0, red0s, red0e, pLeeftijd),
  };

  const blue: ColMap = {
    start: blueRange.start,
    end: blueRange.end,
    voor: findVoornaamColInRange(headers0, blu0s, blu0e),
    ach: findAchternaamColInRange(headers0, blu0s, blu0e),
    naam: findNameColInRange(headers0, blu0s, blu0e),
    gym: findInRange(headers0, blu0s, blu0e, pGym),
    geb: findInRange(headers0, blu0s, blu0e, pGeb),
    gew: findWeightColInRange(headers0, blu0s, blu0e),
    va: findInRange(headers0, blu0s, blu0e, pVA),
    rec: findInRange(headers0, blu0s, blu0e, pRec),
    leeftijd: findInRange(headers0, blu0s, blu0e, pLeeftijd),
  };

  return { red, blue, styleCol, classCol, partijCol, maxGewCol, minGewCol };
}

/* =========================================================
   6. NAAM OPHALEN
========================================================= */

function isUsableNamePiece(v: string): boolean {
  const s = cleanNamePart(v);
  if (!s) return false;
  if (looksLikeGym(s)) return false;
  if (extractVA(s)) return false;
  if (extractDate(s)) return false;
  if (looksLikeRecord(s)) return false;
  if (extractWeightMeta(s, { allowClassNotation: true })) return false;
  return looksLikeName(s);
}

function findNeighborNamePart(
  row: RowLike,
  map: ColMap,
  anchorCol: number,
  direction: -1 | 1
): string | null {
  const start = map.start ?? 1;
  const end = map.end ?? start;

  const c = anchorCol + direction;
  if (c < start || c > end) return null;

  const raw = cellTextLike(row.getCell(c));
  if (!raw) return null;
  if (!isUsableNamePiece(raw)) return null;

  return cleanNamePart(raw);
}

function extractNameFromRow(row: RowLike, map: ColMap): string | null {
  const start = map.start ?? 1;
  const end = map.end ?? start;

  const vVoor = map.voor ? cleanNamePart(cellTextLike(row.getCell(map.voor))) : "";
  const vAch = map.ach ? cleanNamePart(cellTextLike(row.getCell(map.ach))) : "";
  const vNaam = map.naam ? cleanNamePart(cellTextLike(row.getCell(map.naam))) : "";

  const voorOk = isUsableNamePiece(vVoor);
  const achOk = isUsableNamePiece(vAch);
  const naamOk = isUsableNamePiece(vNaam);

  if (voorOk && achOk) {
    return joinNameParts(vVoor, vAch);
  }

  if (voorOk && !achOk && map.voor) {
    const right = findNeighborNamePart(row, map, map.voor, 1);
    if (right) return joinNameParts(vVoor, right);

    const left = findNeighborNamePart(row, map, map.voor, -1);
    if (left) return joinNameParts(left, vVoor);

    return vVoor;
  }

  if (achOk && !voorOk && map.ach) {
    const left = findNeighborNamePart(row, map, map.ach, -1);
    if (left) return joinNameParts(left, vAch);

    const right = findNeighborNamePart(row, map, map.ach, 1);
    if (right) return joinNameParts(vAch, right);

    return vAch;
  }

  if (naamOk) {
    return vNaam;
  }

  const pieces: string[] = [];
  for (let c = start; c <= end; c++) {
    const txt = cleanNamePart(cellTextLike(row.getCell(c)));
    if (!txt) continue;
    if (!isUsableNamePiece(txt)) continue;
    pieces.push(txt);
    if (pieces.length >= 2) break;
  }

  if (pieces.length >= 2) return joinNameParts(pieces[0], pieces[1]);
  if (pieces.length === 1) return pieces[0];

  return null;
}

/* =========================================================
   7. ROW COLOR FALLBACK
========================================================= */

function scanRowByColorForCorner(
  row: RowLike,
  maxCol: number,
  corner: "rood" | "blauw"
): { name?: string; gym?: string; va?: string } {
  const out: any = {};
  const namePieces: string[] = [];

  for (let c = 1; c <= maxCol; c++) {
    const cell = row.getCell(c);
    const v = cellTextLike(cell);
    if (!v) continue;

    const cc = getCellCornerFromLike(cell);
    if (cc !== corner) continue;

    if (isUsableNamePiece(v)) {
      namePieces.push(cleanNamePart(v));
      if (namePieces.length === 2 && !out.name) {
        out.name = joinNameParts(namePieces[0], namePieces[1]);
      } else if (namePieces.length === 1 && !out.name) {
        out.name = cleanNamePart(v);
      }
    }

    if (!out.gym && looksLikeGym(v)) out.gym = v;
    if (!out.va) {
      const va = extractVA(v);
      if (va) out.va = va;
    }
  }

  return out;
}

/* =========================================================
   8. GEWICHT FALLBACK IN RANGE
========================================================= */

function extractWeightMetaFromCornerRange(row: RowLike, map: ColMap, skipCols: number[] = []): ParsedWeightMeta | null {
  const start = map.start ?? 1;
  const end = map.end ?? start;
  const skip = new Set(skipCols.filter((x) => Number.isFinite(x)));

  for (let c = start; c <= end; c++) {
    if (skip.has(c)) continue;

    const cell = row.getCell(c);
    const txt = cellTextLike(cell);
    const lower = norm(txt);

    if (!txt) continue;
    if (isProbablyDate(txt)) continue;
    if (extractVA(txt)) continue;
    if (looksLikeRecord(txt)) continue;
    if (looksLikeName(txt)) continue;
    if (looksLikeGym(txt)) continue;
    if (isAgreedWeightHeader(lower)) continue;

    const meta = extractWeightMeta(cell.value ?? txt, { allowClassNotation: true });
    if (meta) return meta;
  }

  return null;
}


function findVaColumnsFromHeaders(opts: {
  sheet: SheetLike;
  headerRowIndex: number;
  maxCol: number;
  red: ColMap;
  blue: ColMap;
}): { redVaCol: number | null; blueVaCol: number | null; vaCols: number[] } {
  const { sheet, headerRowIndex, maxCol, red, blue } = opts;
  const headerRow = sheet.getRow(headerRowIndex);

  const vaCols: number[] = [];
  for (let c = 1; c <= maxCol; c++) {
    const h = norm(cellTextLike(headerRow.getCell(c)));
    if (!h) continue;

    const isVaHeader =
      h === "va" ||
      h === "va nr" ||
      h === "va nr." ||
      h.includes("va nr") ||
      h.includes("fightpaspoort") ||
      h.includes("paspoort") ||
      h === "nva";

    if (isVaHeader) vaCols.push(c);
  }

  let redVaCol: number | null = null;
  let blueVaCol: number | null = null;

  for (const c of vaCols) {
    const h = norm(cellTextLike(headerRow.getCell(c)));

    if (!redVaCol && (h.includes("rood") || h.includes("red"))) {
      redVaCol = c;
      continue;
    }

    if (!blueVaCol && (h.includes("blauw") || h.includes("blue"))) {
      blueVaCol = c;
      continue;
    }
  }

  const redStart = red.start ?? 1;
  const redEnd = red.end ?? Math.max(redStart, (blue.start ?? maxCol) - 1);
  const blueStart = blue.start ?? redEnd + 1;
  const blueEnd = blue.end ?? maxCol;

  if (!redVaCol) {
    redVaCol = vaCols.find((c) => c >= redStart && c <= redEnd) ?? null;
  }

  if (!blueVaCol) {
    blueVaCol = vaCols.find((c) => c >= blueStart && c <= blueEnd) ?? null;
  }

  // Layouts zoals: rood VA in I, blauw VA in R zonder expliciete kleur in header.
  // Dan zijn de eerste twee VA-kolommen gewoon rood/blauw.
  if (!redVaCol && vaCols.length >= 1) redVaCol = vaCols[0] ?? null;
  if (!blueVaCol && vaCols.length >= 2) blueVaCol = vaCols[1] ?? null;

  return { redVaCol, blueVaCol, vaCols };
}

function readVaFromColumn(row: RowLike, col: number | null): string | null {
  if (!col) return null;
  const cell = row.getCell(col);
  return extractVA(cellTextLike(cell)) || extractVA(cell.value);
}


function scoreSheetLikeForMatchmaking(sheet: SheetLike): number {
  if (!sheet || sheet.rowCount === 0) return -1;

  const maxCol = Math.min(sheet.columnCount || 80, 120);
  const scanRows = Math.min(sheet.rowCount || 200, 120);
  let score = 0;

  const headerRowIndex = detectHeaderRow(sheet, 50, Math.min(80, maxCol));
  const header = rowToStringsLike(sheet.getRow(headerRowIndex), Math.min(80, maxCol));
  const joinedHeader = header.join(" | ");

  if (joinedHeader.includes("voornaam")) score += 15;
  if (joinedHeader.includes("achternaam")) score += 15;
  if (joinedHeader.includes("va") || joinedHeader.includes("paspoort")) score += 15;
  if (joinedHeader.includes("gym") || joinedHeader.includes("sportschool")) score += 10;
  if (joinedHeader.includes("rood") || joinedHeader.includes("red")) score += 10;
  if (joinedHeader.includes("blauw") || joinedHeader.includes("blue")) score += 10;
  if (joinedHeader.includes("vs") || joinedHeader.includes("v.s")) score += 5;

  for (let r = Math.max(1, headerRowIndex + 1); r <= scanRows; r++) {
    const row = sheet.getRow(r);
    let rowHasVa = false;
    let rowHasName = false;
    let rowHasWeight = false;
    let rowHasRecord = false;

    for (let c = 1; c <= Math.min(maxCol, 40); c++) {
      const txt = cellTextLike(row.getCell(c));
      if (!txt) continue;

      if (extractVA(txt)) rowHasVa = true;
      if (looksLikeName(txt)) rowHasName = true;
      if (extractWeightMeta(txt, { allowClassNotation: true })) rowHasWeight = true;
      if (looksLikeRecord(txt)) rowHasRecord = true;
    }

    if (rowHasVa) score += 3;
    if (rowHasName) score += 1;
    if (rowHasWeight) score += 1;
    if (rowHasRecord) score += 1;
  }

  return score;
}

function pickBestSheetLike(sheets: Array<{ sheet: SheetLike; name: string }>): { sheet: SheetLike; name: string } | null {
  let best: { sheet: SheetLike; name: string } | null = null;
  let bestScore = -1;

  for (const item of sheets) {
    const score = scoreSheetLikeForMatchmaking(item.sheet);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best;
}

/* =========================================================
   9. MAIN – BUFFER → BOUTS (.xlsx / .xls)
========================================================= */

function isPauseRowText(s: string): boolean {
  const t = norm(s);
  if (!t) return false;
  return t.includes("pauze") || t.includes("break");
}

function isToernooiRowText(s: string): boolean {
  const t = norm(s);
  if (!t) return false;
  return t.includes("toernooi");
}

export async function parseExcelToBouts(fileBuffer: Buffer): Promise<ParsedBout[]> {
  try {
    const templ = await tryParseAdminTemplate(fileBuffer);
    if (templ && templ.length) {
      return templ as any;
    }
  } catch (e) {
    console.warn(
      "[parseExcelToBouts] template-parse faalde, fallback naar robuuste parser:",
      (e as any)?.message
    );
  }

  let sheet: SheetLike | null = null;
  let selectedSheetName: string | null = null;
  let mode: "exceljs_xlsx" | "sheetjs_xls" | "sheetjs_xlsx" = "exceljs_xlsx";

  if (isOleXls(fileBuffer)) {
    const wb = XLSX.read(fileBuffer, {
      type: "buffer",
      cellDates: true,
      cellStyles: true,
      raw: false,
    });
    const candidates = wb.SheetNames.map((name) => ({ sheet: sheetjsToSheetLike(wb, name), name }));
    const picked = pickBestSheetLike(candidates);
    sheet = picked?.sheet ?? null;
    selectedSheetName = picked?.name ?? null;
    mode = "sheetjs_xls";
  } else {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const candidates = (workbook.worksheets ?? []).map((ws) => ({ sheet: exceljsToSheetLike(ws), name: ws.name }));
      const picked = pickBestSheetLike(candidates);
      sheet = picked?.sheet ?? null;
      selectedSheetName = picked?.name ?? null;
      mode = "exceljs_xlsx";
    } catch {
      const wb = XLSX.read(fileBuffer, {
        type: "buffer",
        cellDates: true,
        cellStyles: true,
        raw: false,
      });
      const candidates = wb.SheetNames.map((name) => ({ sheet: sheetjsToSheetLike(wb, name), name }));
      const picked = pickBestSheetLike(candidates);
      sheet = picked?.sheet ?? null;
      selectedSheetName = picked?.name ?? null;
      mode = "sheetjs_xlsx";
    }
  }

  if (!sheet || sheet.rowCount === 0) return [];

  const vaOnly = tryParseVaOnlyPairs(sheet);
  if (vaOnly) {
    for (const b of vaOnly) b.extra.sheet_name = selectedSheetName;
    console.log("📘 Parsed bouts (VA-only mode):", vaOnly.length, "mode:", mode, "sheet:", selectedSheetName);
    console.log("VA rood:", vaOnly.filter((b) => b.va_rood).length);
    console.log("VA blauw:", vaOnly.filter((b) => b.va_blauw).length);
    return vaOnly;
  }

  const maxCol = Math.min(sheet.columnCount || 80, 120);
  const headerRowIndex = detectHeaderRow(sheet, 50, Math.min(80, maxCol));
  const { red, blue, styleCol, classCol, partijCol, maxGewCol, minGewCol } = buildCornerMaps({
    sheet,
    headerRowIndex,
    maxCol,
  });

  const vaHeaderFallback = findVaColumnsFromHeaders({
    sheet,
    headerRowIndex,
    maxCol,
    red,
    blue,
  });

  const skipWeightCols = [maxGewCol, minGewCol].filter((x): x is number => typeof x === "number");

  const bouts: ParsedBout[] = [];
  let autoNr = 1;

  for (let r = headerRowIndex + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);

    const t1 = cellTextLike(row.getCell(1));
    const t2 = cellTextLike(row.getCell(2));
    const t3 = cellTextLike(row.getCell(3));
    if (isPauseRowText(t1) || isPauseRowText(t2) || isPauseRowText(t3)) continue;

    let nonEmpty = 0;
    for (let c = 1; c <= Math.min(maxCol, 40); c++) {
      if (cellTextLike(row.getCell(c))) nonEmpty++;
    }
    if (nonEmpty < 3) continue;

    const bout = makeEmptyBout();
    bout.extra.parse_mode = mode;
    bout.extra.sheet_name = selectedSheetName;

    let isToernooi = false;
    let toernooiCode: string | null = null;

    if (isToernooiRowText(t1) || isToernooiRowText(t2) || isToernooiRowText(t3)) {
      isToernooi = true;
    } else {
      for (let c = 1; c <= Math.min(maxCol, 12); c++) {
        const tt = cellTextLike(row.getCell(c));
        if (isToernooiRowText(tt)) {
          isToernooi = true;
          break;
        }
      }
    }

    if (maxGewCol) {
      const raw = row.getCell(maxGewCol).value;
      const txt = cellTextLike(row.getCell(maxGewCol));
      const meta = parseAgreedWeightMeta(raw ?? txt);
      applyAgreedWeightMeta(bout, "max", meta);
    }

    if (minGewCol) {
      const raw = row.getCell(minGewCol).value;
      const txt = cellTextLike(row.getCell(minGewCol));
      const meta = parseAgreedWeightMeta(raw ?? txt);
      applyAgreedWeightMeta(bout, "min", meta);
    }

    if (bout.max_gewicht == null) {
      for (let c = 1; c <= Math.min(maxCol, 40); c++) {
        const txt = cellTextLike(row.getCell(c));
        const val = row.getCell(c).value;
        const meta = extractClassWeightMetaOnly(txt) || extractClassWeightMetaOnly(val);
        if (meta) {
          applyAgreedWeightMeta(bout, "max", meta);
          break;
        }
      }
    }

    const pRaw = cellTextLike(row.getCell(partijCol || 1));
    const pFirst = cellTextLike(row.getCell(1));

    const pMetaRaw = parsePartijNrOrToernooiCode(pRaw);
    const pMetaFirst = parsePartijNrOrToernooiCode(pFirst);
    const pMeta = pMetaRaw.partijNr != null || pMetaRaw.toernooiCode ? pMetaRaw : pMetaFirst;

    if (pMeta.toernooiCode) {
      isToernooi = true;
      toernooiCode = pMeta.toernooiCode;
      bout.partij_nr = null;
    } else if (pMeta.partijNr != null) {
      bout.partij_nr = pMeta.partijNr;
      autoNr = bout.partij_nr + 1;
    } else {
      bout.partij_nr = autoNr++;
    }

    bout.is_toernooi = isToernooi;
    bout.toernooi_code = toernooiCode;

    if (isToernooi) {
      bout.extra.is_toernooi = true;
      if (toernooiCode) bout.extra.toernooi_code = toernooiCode;
    }

    bout.rood_naam = extractNameFromRow(row, red);

    const roodGym = red.gym ? cellTextLike(row.getCell(red.gym)) : "";
    bout.rood_gym = roodGym || null;

    const roodGebRaw = red.geb ? row.getCell(red.geb).value : null;
    bout.rood_geboortedatum = extractDate(roodGebRaw);

    const roodGewRaw = red.gew ? row.getCell(red.gew).value : null;
    const roodGewMetaDirect = extractWeightMeta(roodGewRaw, { allowClassNotation: true });
    if (roodGewMetaDirect) {
      applySmartWeightFromCornerCell(bout, "rood", roodGewMetaDirect, "row_direct_rood");
    }
    if (!bout.rood_gewicht && !bout.rood_gewicht_notatie) {
      const fallbackMeta = extractWeightMetaFromCornerRange(row, red, skipWeightCols);
      if (fallbackMeta) {
        applySmartWeightFromCornerCell(bout, "rood", fallbackMeta, "row_fallback_rood");
      }
    }

    const roodVaRaw = red.va ? cellTextLike(row.getCell(red.va)) : "";
    bout.va_rood = extractVA(roodVaRaw);
    if (!bout.va_rood) {
      bout.va_rood = readVaFromColumn(row, vaHeaderFallback.redVaCol);
    }

    const roodRecRaw = red.rec ? cellTextLike(row.getCell(red.rec)) : "";
    const recR = extractRecord(roodRecRaw);
    if (recR) {
      bout.record_rood_w = recR.w;
      bout.record_rood_l = recR.l;
      bout.record_rood_d = recR.d;
    }

    bout.blauw_naam = extractNameFromRow(row, blue);

    const blauwGym = blue.gym ? cellTextLike(row.getCell(blue.gym)) : "";
    bout.blauw_gym = blauwGym || null;

    const blauwGebRaw = blue.geb ? row.getCell(blue.geb).value : null;
    bout.blauw_geboortedatum = extractDate(blauwGebRaw);

    const blauwGewRaw = blue.gew ? row.getCell(blue.gew).value : null;
    const blauwGewMetaDirect = extractWeightMeta(blauwGewRaw, { allowClassNotation: true });
    if (blauwGewMetaDirect) {
      applySmartWeightFromCornerCell(bout, "blauw", blauwGewMetaDirect, "row_direct_blauw");
    }
    if (!bout.blauw_gewicht && !bout.blauw_gewicht_notatie) {
      const fallbackMeta = extractWeightMetaFromCornerRange(row, blue, skipWeightCols);
      if (fallbackMeta) {
        applySmartWeightFromCornerCell(bout, "blauw", fallbackMeta, "row_fallback_blauw");
      }
    }

    const blauwVaRaw = blue.va ? cellTextLike(row.getCell(blue.va)) : "";
    bout.va_blauw = extractVA(blauwVaRaw);
    if (!bout.va_blauw) {
      bout.va_blauw = readVaFromColumn(row, vaHeaderFallback.blueVaCol);
    }

    const blauwRecRaw = blue.rec ? cellTextLike(row.getCell(blue.rec)) : "";
    const recB = extractRecord(blauwRecRaw);
    if (recB) {
      bout.record_blauw_w = recB.w;
      bout.record_blauw_l = recB.l;
      bout.record_blauw_d = recB.d;
    }

    if (styleCol) {
      const v = cellTextLike(row.getCell(styleCol));
      bout.discipline = v || null;
    }

    if (classCol) {
      const v = cellTextLike(row.getCell(classCol));
      bout.klasse = v || null;
    }

    if (!bout.rood_naam || !bout.va_rood || !bout.rood_gym) {
      const byColor = scanRowByColorForCorner(row, maxCol, "rood");
      if (!bout.rood_naam && byColor.name) bout.rood_naam = byColor.name;
      if (!bout.rood_gym && byColor.gym) bout.rood_gym = byColor.gym;
      if (!bout.va_rood && byColor.va) bout.va_rood = byColor.va;
    }

    if (!bout.blauw_naam || !bout.va_blauw || !bout.blauw_gym) {
      const byColor = scanRowByColorForCorner(row, maxCol, "blauw");
      if (!bout.blauw_naam && byColor.name) bout.blauw_naam = byColor.name;
      if (!bout.blauw_gym && byColor.gym) bout.blauw_gym = byColor.gym;
      if (!bout.va_blauw && byColor.va) bout.va_blauw = byColor.va;
    }

    if (!bout.va_rood) bout.extra.missing_va_rood = true;
    if (!bout.va_blauw) bout.extra.missing_va_blauw = true;

    const hasAny =
      bout.rood_naam ||
      bout.blauw_naam ||
      bout.va_rood ||
      bout.va_blauw ||
      bout.rood_gym ||
      bout.blauw_gym ||
      bout.rood_gewicht ||
      bout.rood_gewicht_notatie ||
      bout.blauw_gewicht ||
      bout.blauw_gewicht_notatie ||
      bout.max_gewicht != null ||
      bout.min_gewicht != null;

    if (!hasAny) continue;

    normalizeOpenOpponentCorner(bout);
    bouts.push(bout);
  }

  console.log("📘 Parsed bouts:", bouts.length, "mode:", mode, "sheet:", selectedSheetName);
  console.log("VA rood:", bouts.filter((b) => b.va_rood).length);
  console.log("VA blauw:", bouts.filter((b) => b.va_blauw).length);
  console.log("Toernooi bouts:", bouts.filter((b) => b.is_toernooi).length);

  return bouts;
}
