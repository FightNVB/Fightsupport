// ---------------------------------------------------------
// MATCHCONTROL PARSER â VERSIE 12.2 â .XLS SUPPORT (SheetJS fallback) + KLEUR (best effort)
// ---------------------------------------------------------
//
// â .xlsx via ExcelJS (styles + waarden)
// â .xls via SheetJS (xlsx lib) fallback (styles/kleur best-effort)
// â Zelfde logica: header detectie + rood/blauw split + VA-only mode
//
// â TOEVOEGING (zonder bestaande logica te wijzigen):
// - Max gewicht notatie als "-31" (alleen '-' + getal) wordt herkend als 31
// - Wordt Ã³Ã³k apart opgeslagen in bout.extra.max_gewicht
// - Pauze-rijen worden overgeslagen
// - Toernooi-rijen worden herkend en gemarkeerd (bout.extra.is_toernooi = true) (NIET overslaan)
//
// Dependencies:
// npm i exceljs xlsx
//

import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { randomUUID } from "crypto";

export interface ParsedBout {
  bout_uid?: string | null;
  partij_nr: number | null;

  rood_naam: string | null;
  rood_gym: string | null;
  va_rood: string | null;
  rood_geboortedatum: string | null;
  rood_gewicht: string | null;

  blauw_naam: string | null;
  blauw_gym: string | null;
  va_blauw: string | null;
  blauw_geboortedatum: string | null;
  blauw_gewicht: string | null;

  discipline: string | null;
  klasse: string | null;

  record_rood_w: number;
  record_rood_l: number;
  record_rood_d: number;

  record_blauw_w: number;
  record_blauw_l: number;
  record_blauw_d: number;

  extra: any;
}


/* =========================================================
   â TEMPLATE PARSER (Admin upload template met VS/T)
   - VS kolom gevuld => normale partij (Atleet 1 vs Atleet 2)
   - VS kolom gevuld met T/T1/T2/... => toernooi deelnemerslijst
     -> genereert round-robin (iedereen tegen iedereen) binnen dezelfde T-code
========================================================= */

function normCell(v: any): string {
  return String(v ?? "").trim();
}
function normLower(v: any): string {
  return normCell(v).toLowerCase();
}
function isVsMarker(v: any): boolean {
  const s = normLower(v);
  return s === "vs" || s === "v.s" || s === "v.s." || s === "versus";
}
function parseTCode(v: any): string | null {
  const s = normCell(v).toUpperCase();
  if (!s) return null;
  // Sta "T" toe (1 toernooi) Ã©n "T1/T2/..." (meerdere toernooien)
  if (s === "T") return "T";
  if (/^T\d{1,3}$/.test(s)) return s;
  return null;
}
function parseMaxKgNumber(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = normCell(v);
  if (!s) return null;
  const m = s.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? Math.abs(n) : null;
}

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
};

function detectTemplateCols(headerRow: any[]): TemplateCols | null {
  const h = headerRow.map((x) => normLower(x));

  const idx = (needles: string[]) => {
    for (let i = 0; i < h.length; i++) {
      const v = h[i];
      if (!v) continue;
      if (needles.some((n) => v === n || v.includes(n))) return i + 1; // 1-based col
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
  // In jouw template staat T vaak helemaal rechts (en header kan fout zijn). We bepalen 'm later op basis van waarden.

  if ([partijNr, discipline, klasse, naam1, gym1, va1, vs, naam2, gym2, va2].some((x) => x < 1)) return null;

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
  };
}

async function tryParseAdminTemplate(fileBuffer: Buffer): Promise<any[] | null> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fileBuffer);

  const ws = wb.worksheets?.[0];
  if (!ws) return null;

  // header rij zoeken (eerste 25 rijen)
  let headerRowIndex = -1;
  let cols: TemplateCols | null = null;

  for (let r = 1; r <= Math.min(25, ws.rowCount); r++) {
    const row = ws.getRow(r);
    const header = [];
    for (let c = 1; c <= Math.min(40, ws.columnCount); c++) header.push(row.getCell(c).value);
    const detected = detectTemplateCols(header);
    if (detected) {
      headerRowIndex = r;
      cols = detected;
      break;
    }
  }

  if (!cols || headerRowIndex < 1) return null;

  // â Toernooi-code staat in dezelfde kolom als VS (kolom H in jouw template).
  // Waarden: "vs" voor partij, of "T1"/"T2"/... voor toernooi.
  const bouts: any[] = [];
  const deelnemersByT: Record<string, any[]> = {};
  let maxPartijNr = 0;

  const lastRow = ws.rowCount;
  for (let r = headerRowIndex + 1; r <= lastRow; r++) {
    const row = ws.getRow(r);

    const partijNrRaw = row.getCell(cols.partijNr).value;
    const partijNr = typeof partijNrRaw === "number" ? partijNrRaw : Number(normCell(partijNrRaw));
    if (Number.isFinite(partijNr) && partijNr > maxPartijNr) maxPartijNr = partijNr;

    const discipline = normCell(row.getCell(cols.discipline).value) || null;
    const klasse = normCell(row.getCell(cols.klasse).value) || null;

    const naam1 = normCell(row.getCell(cols.naam1).value) || null;
    const gym1 = normCell(row.getCell(cols.gym1).value) || null;
    // ✅ VA: letters/tekens weg + voorloopnullen weg (VA kan nooit met 0 beginnen)
    const va1 = extractVA(row.getCell(cols.va1).value) || null;
    const kg1 = cols.kg1 > 0 ? normCell(row.getCell(cols.kg1).value) || null : null;

    const vsVal = row.getCell(cols.vs).value;

    const naam2 = normCell(row.getCell(cols.naam2).value) || null;
    const gym2 = normCell(row.getCell(cols.gym2).value) || null;
    // ✅ VA: letters/tekens weg + voorloopnullen weg (VA kan nooit met 0 beginnen)
    const va2 = extractVA(row.getCell(cols.va2).value) || null;
    const kg2 = cols.kg2 > 0 ? normCell(row.getCell(cols.kg2).value) || null : null;

    const maxKgVal = cols.maxKg ? row.getCell(cols.maxKg).value : null;
    const maxKgNum = parseMaxKgNumber(maxKgVal);

    const tCode = parseTCode(vsVal);

    const isEmptyLine =
      !naam1 && !gym1 && !va1 && !naam2 && !gym2 && !va2 && !discipline && !klasse && !tCode;
    if (isEmptyLine) continue;

    // 1) Normale partij
    if (isVsMarker(vsVal) && (naam2 || va2 || gym2)) {
      bouts.push({
        bout_uid: randomUUID(),
        partij_nr: Number.isFinite(partijNr) ? partijNr : null,

        rood_naam: naam1,
        rood_gym: gym1,
        va_rood: va1,
        rood_geboortedatum: null,
        rood_gewicht: kg1,

        blauw_naam: naam2,
        blauw_gym: gym2,
        va_blauw: va2,
        blauw_geboortedatum: null,
        blauw_gewicht: kg2,

        discipline,
        klasse,

        record_rood_w: 0,
        record_rood_l: 0,
        record_rood_d: 0,

        record_blauw_w: 0,
        record_blauw_l: 0,
        record_blauw_d: 0,

        // â belangrijk: route.ts leest top-level is_toernooi
        is_toernooi: false,
        extra: {
          max_gewicht: maxKgNum,
          template: "admin_vs_t",
          t_code: tCode,
        },
      });
      continue;
    }

    // 2) Toernooi deelnemer (T1/T2/...)
    if (tCode) {
      if (!deelnemersByT[tCode]) deelnemersByT[tCode] = [];
      deelnemersByT[tCode].push({
        naam: naam1,
        gym: gym1,
        va: va1,
        kg: kg1,
        discipline,
        klasse,
        max_gewicht: maxKgNum,
      });
    }
  }

  // Round-robin genereren per T-code
  let nextPartijNr = maxPartijNr > 0 ? maxPartijNr + 1 : 1;
  for (const [code, deelnemers] of Object.entries(deelnemersByT)) {
    const list = (deelnemers ?? []).filter((x) => x?.naam || x?.va);
    if (list.length < 2) continue;

    // discipline/klasse/maxkg: pak de eerste met waarde
    const d = list.find((x) => x?.discipline)?.discipline ?? null;
    const k = list.find((x) => x?.klasse)?.klasse ?? null;
    const mk = list.find((x) => x?.max_gewicht != null)?.max_gewicht ?? null;

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];

        bouts.push({
          bout_uid: randomUUID(),
          partij_nr: nextPartijNr++,

          rood_naam: a?.naam ?? null,
          rood_gym: a?.gym ?? null,
          va_rood: a?.va ?? null,
          rood_geboortedatum: null,
          rood_gewicht: a?.kg ?? null,

          blauw_naam: b?.naam ?? null,
          blauw_gym: b?.gym ?? null,
          va_blauw: b?.va ?? null,
          blauw_geboortedatum: null,
          blauw_gewicht: b?.kg ?? null,

          discipline: d,
          klasse: k,

          record_rood_w: 0,
          record_rood_l: 0,
          record_rood_d: 0,

          record_blauw_w: 0,
          record_blauw_l: 0,
          record_blauw_d: 0,

          is_toernooi: true,
          extra: {
            is_toernooi: true,
            toernooi_code: code,
            toernooi_format: "roundrobin",
            max_gewicht: mk,
            template: "admin_vs_t",
          },
        });
      }
    }
  }

  return bouts.length ? bouts : null;
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

/**
 * â TOEVOEGING: max gewicht notatie is ALTIJD "-<getal>" (geen andere tekens)
 * - "-31" -> 31
 * - "- 31" -> 31
 */
function extractMaxWeightOnly(raw: any): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^\s*-\s*(\d+(?:[.,]\d+)?)\s*$/);
  if (!m) return null;

  const n = Number(m[1].replace(",", "."));
  if (!Number.isFinite(n)) return null;

  // max gewicht komt ook bij jeugd voor, dus lagere grens dan "normaal gewicht"
  if (n >= 10 && n <= 200) return String(n);
  return null;
}

function extractWeight(raw: any): string | null {
  if (!raw) return null;

  // â TOEVOEGING (bovenaan): eerst kijken naar max-gewicht notatie "-31"
  const maxW = extractMaxWeightOnly(raw);
  if (maxW) return maxW;

  const v = String(raw).toLowerCase().replace(/\s+/g, " ").trim();

  if (v.includes("kg")) {
    const m = v.match(/(\d+(?:[.,]\d+)?)/);
    return m ? m[1].replace(",", ".") : null;
  }

  if (/^\d+[.,]?\d*$/.test(v)) {
    const n = Number(v.replace(",", "."));
    if (Number.isFinite(n) && n >= 20 && n <= 200) return String(n);
  }

  return null;
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
 * - accepteert 2â6 cijfers als geldig
 */
function extractVA(raw: any): string | null {
  if (!raw) return null;
  const v = String(raw).trim();
  if (!v) return null;

  if (isProbablyDate(v)) return null;
  if (v.toLowerCase().includes("kg")) return null;
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
  if (extractWeight(s)) return false;
  return /^[A-Za-zÃ-Ã¿'â. \-]{3,}$/.test(s);
}

function looksLikeGym(v: string) {
  return /(gym|team|boxing|kickbox|muay|thai|academy|club|fight|mma)/i.test(v);
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

    blauw_naam: null,
    blauw_gym: null,
    va_blauw: null,
    blauw_geboortedatum: null,
    blauw_gewicht: null,

    discipline: null,
    klasse: null,

    record_rood_w: 0,
    record_rood_l: 0,
    record_rood_d: 0,

    record_blauw_w: 0,
    record_blauw_l: 0,
    record_blauw_d: 0,

    extra: {},
  };
}

/* =========================================================
   1. UNIVERSELE SHEET ADAPTER (.xlsx ExcelJS / .xls SheetJS)
========================================================= */

type Corner = "rood" | "blauw" | null;

type CellLike = {
  value: any;
  text: string; // display-ish
  fillARGB: string | null; // "AARRGGBB" if known
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
  // OLE signature: D0 CF 11 E0 A1 B1 1A E1
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
  if (s.length === 6) return "FF" + s; // RGB -> ARGB
  if (s.length === 8) return s;
  return null;
}

function cornerFromARGB(argb: string | null): Corner {
  if (!argb) return null;
  const a = argb.toUpperCase();

  // rood varianten
  if (a.endsWith("FF0000") || a.endsWith("C00000") || a.endsWith("E06666")) return "rood";
  if (a.endsWith("F4CCCC") || a.endsWith("FF9999") || a.endsWith("FF6D01")) return "rood";

  // blauw varianten
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

function sheetjsToSheetLike(workbook: XLSX.WorkBook): SheetLike {
  const name = workbook.SheetNames[0];
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

    // value
    let value: any = cell.v ?? null;

    // dates: SheetJS zet soms Date, soms number
    if (cell.t === "d" && cell.v instanceof Date) value = cell.v;

    // text
    const text = safe(cell.w ?? cell.v ?? "");

    // style best-effort
    // Bij cellStyles:true kan cell.s aanwezig zijn.
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
   2. HEADER DETECTIE â ROBUUST
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
   3. VA-ONLY PAIRING MODE
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
   4. KOLOM MAPPING â SLIM + KLEUR
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

function headerLooksLikeName(h: string) {
  const s = norm(h);
  return (
    s.includes("naam") ||
    s.includes("vechter") ||
    s.includes("fighter") ||
    s.includes("voornaam") ||
    (s.includes("voor") && !s.includes("voordeel"))
  );
}

function findInRange(headers0: string[], start0: number, end0: number, patterns: string[]): number | null {
  for (let i = start0; i <= end0 && i < headers0.length; i++) {
    const h = headers0[i];
    if (!h) continue;
    if (patterns.some((p) => h.includes(p))) return i + 1;
  }
  return null;
}

function findNameColInRange(headers0: string[], start0: number, end0: number): number | null {
  for (let i = start0; i <= end0 && i < headers0.length; i++) {
    const h = headers0[i] || "";
    if (!h) continue;

    if (h.includes("voornaam") || h.includes("achternaam")) continue;

    if (h === "naam" || h.includes("vechter") || h.includes("fighter")) return i + 1;
    if (h.includes("naam") && !h.includes("voor") && !h.includes("ach")) return i + 1;
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

  const styleCol = styleColIdx >= 0 ? styleColIdx + 1 : null;
  const classCol = classColIdx >= 0 ? classColIdx + 1 : null;
  const partijCol = partijColIdx >= 0 ? partijColIdx + 1 : 1;

  // â EXTRA: "vs" kolom als harde splitter (werkt perfect voor jouw GLORY sheet)
  const vsColIdx = headers0.findIndex((h) => h && (h === "vs" || h.includes("vs") || h.includes("v.s")));
  const vsCol = vsColIdx >= 0 ? vsColIdx + 1 : null;

  const nameCols: number[] = [];
  for (let i = 0; i < headers0.length; i++) {
    if (headers0[i] && headerLooksLikeName(headers0[i])) nameCols.push(i + 1);
  }

  const above = findCornerStartsFromRowAbove({ sheet, headerRowIndex, maxCol });

  const voornaamCols: number[] = [];
  for (let i = 0; i < headers0.length; i++) {
    const h = headers0[i] || "";
    if (!h) continue;
    if (h === "voornaam" || (h.includes("voornaam") && !h.includes("achternaam"))) {
      voornaamCols.push(i + 1);
    }
  }

  const redStartByDup = voornaamCols[0] || null;
  const blueStartByDup = voornaamCols.length >= 2 ? voornaamCols[1] : null;

  const redNameByCorner = nameCols.find((c) => headerCorners0[c - 1] === "rood") || null;
  const blueNameByCorner = nameCols.find((c) => headerCorners0[c - 1] === "blauw") || null;

  const redStart = above.redStart || redStartByDup || redNameByCorner || nameCols[0] || 2;

  let blueStart = above.blueStart || blueStartByDup || blueNameByCorner || null;
  if (!blueStart) blueStart = Math.min(maxCol, redStart + 7);
  if (blueStart <= redStart) {
    const alt = blueStartByDup && blueStartByDup > redStart ? blueStartByDup : null;
    blueStart = alt || Math.min(maxCol, redStart + 7);
  }

  // â FIX: ranges mogen NIET blind op styleCol eindigen als styleCol links staat.
  // Eerst default ranges:
  let redRange = { start: Math.max(1, redStart), end: Math.max(1, blueStart - 1) };
  let blueRange = { start: Math.max(1, blueStart), end: maxCol };

  // â Als we een vs-kolom hebben die tussen rood en blauw zit: gebruik die als splitter.
  if (vsCol && vsCol > redRange.start && vsCol < blueRange.end) {
    redRange = { start: redRange.start, end: Math.max(redRange.start, vsCol - 1) };
    blueRange = { start: Math.min(maxCol, vsCol + 1), end: maxCol };
  }

  // â Alleen als styleCol rechts van blueRange.start ligt, mag hij de blauwe range afkappen.
  if (styleCol && styleCol > blueRange.start) {
    blueRange.end = Math.max(blueRange.start, styleCol - 1);
  }

  const red0s = redRange.start - 1;
  const red0e = redRange.end - 1;
  const blu0s = blueRange.start - 1;
  const blu0e = blueRange.end - 1;

  const pVoor = ["voornaam", "voor"];
  const pAch = ["achternaam", "ach", "achter"];
  const pGym = ["gym", "sportschool", "school", "vereniging", "club", "team"];
  const pGeb = ["geboorte", "geboortedatum", "geb", "dob", "birth"];
  const pGew = ["gewicht", "gew", "kg", "kilo", "max kg"];
  const pVA = ["va", "va nr", "paspoort", "passport", "id", "nva"];
  const pRec = ["record", "rec", "erv", "ervaring", "exp"];

  const red: ColMap = {
    start: redRange.start,
    end: redRange.end,
    voor: findInRange(headers0, red0s, red0e, pVoor),
    ach: findInRange(headers0, red0s, red0e, pAch),
    naam: findNameColInRange(headers0, red0s, red0e),
    gym: findInRange(headers0, red0s, red0e, pGym),
    geb: findInRange(headers0, red0s, red0e, pGeb),
    gew: findInRange(headers0, red0s, red0e, pGew),
    va: findInRange(headers0, red0s, red0e, pVA),
    rec: findInRange(headers0, red0s, red0e, pRec),
  };

  const blue: ColMap = {
    start: blueRange.start,
    end: blueRange.end,
    voor: findInRange(headers0, blu0s, blu0e, pVoor),
    ach: findInRange(headers0, blu0s, blu0e, pAch),
    naam: findNameColInRange(headers0, blu0s, blu0e),
    gym: findInRange(headers0, blu0s, blu0e, pGym),
    geb: findInRange(headers0, blu0s, blu0e, pGeb),
    gew: findInRange(headers0, blu0s, blu0e, pGew),
    va: findInRange(headers0, blu0s, blu0e, pVA),
    rec: findInRange(headers0, blu0s, blu0e, pRec),
  };

  return { red, blue, styleCol, classCol, partijCol };
}

/* =========================================================
   5. NAAM OPHALEN
========================================================= */

function extractNameFromRow(row: RowLike, map: ColMap): string | null {
  const vNaam = map.naam ? cellTextLike(row.getCell(map.naam)) : "";
  if (vNaam && looksLikeName(vNaam)) return vNaam.trim();

  const vVoor = map.voor ? cellTextLike(row.getCell(map.voor)) : "";
  const vAch = map.ach ? cellTextLike(row.getCell(map.ach)) : "";

  if (vVoor && vAch) return `${vVoor} ${vAch}`.trim();
  if (vVoor && vVoor.includes(" ")) return vVoor.trim();

  if (vVoor && !vAch && map.voor) {
    const adj = cellTextLike(row.getCell(map.voor + 1));
    if (adj && looksLikeName(adj) && !extractVA(adj) && !extractDate(adj)) {
      return `${vVoor} ${adj}`.trim();
    }
    return vVoor.trim();
  }

  return null;
}

/* =========================================================
   6. ROW COLOR FALLBACK
========================================================= */

function scanRowByColorForCorner(
  row: RowLike,
  maxCol: number,
  corner: "rood" | "blauw"
): { name?: string; gym?: string; va?: string } {
  const out: any = {};
  for (let c = 1; c <= maxCol; c++) {
    const cell = row.getCell(c);
    const v = cellTextLike(cell);
    if (!v) continue;

    const cc = getCellCornerFromLike(cell);
    if (cc !== corner) continue;

    if (!out.name && looksLikeName(v)) out.name = v;
    if (!out.gym && looksLikeGym(v)) out.gym = v;
    if (!out.va) {
      const va = extractVA(v);
      if (va) out.va = va;
    }
  }
  return out;
}

/* =========================================================
   7. MAIN â BUFFER â BOUTS (.xlsx / .xls)
========================================================= */

/** â TOEVOEGING: pauze regels overslaan */
function isPauseRowText(s: string): boolean {
  const t = norm(s);
  if (!t) return false;
  return t.includes("pauze") || t.includes("break");
}

/** â TOEVOEGING: toernooi regels herkennen (niet overslaan) */
function isToernooiRowText(s: string): boolean {
  const t = norm(s);
  if (!t) return false;
  return t.includes("toernooi");
}

export async function parseExcelToBouts(fileBuffer: Buffer): Promise<ParsedBout[]> {
  // â Eerst proberen: jouw admin template (VS/T)
  try {
    const templ = await tryParseAdminTemplate(fileBuffer);
    if (templ && templ.length) {
      return templ as any;
    }
  } catch (e) {
    // val terug op de robuuste parser
    console.warn("[parseExcelToBouts] template-parse faalde, fallback naar robuuste parser:", (e as any)?.message);
  }


  // --- Kies loader op basis van signature / extensie maakt niet uit ---
  let sheet: SheetLike | null = null;
  let mode: "exceljs_xlsx" | "sheetjs_xls" | "sheetjs_xlsx" = "exceljs_xlsx";

  if (isOleXls(fileBuffer)) {
    // .xls (OLE)
    const wb = XLSX.read(fileBuffer, {
      type: "buffer",
      cellDates: true,
      cellStyles: true,
      raw: false,
    });
    sheet = sheetjsToSheetLike(wb);
    mode = "sheetjs_xls";
  } else {
    // probeer eerst ExcelJS (.xlsx)
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);
      const ws = workbook.worksheets[0];
      if (!ws) return [];
      sheet = exceljsToSheetLike(ws);
      mode = "exceljs_xlsx";
    } catch {
      // fallback: kan ook xlsx zijn maar ExcelJS struikelt -> SheetJS
      const wb = XLSX.read(fileBuffer, {
        type: "buffer",
        cellDates: true,
        cellStyles: true,
        raw: false,
      });
      sheet = sheetjsToSheetLike(wb);
      mode = "sheetjs_xlsx";
    }
  }

  if (!sheet || sheet.rowCount === 0) return [];

  // VA-only mode
  const vaOnly = tryParseVaOnlyPairs(sheet);
  if (vaOnly) {
    console.log("ð Parsed bouts (VA-only mode):", vaOnly.length, "mode:", mode);
    console.log("VA rood:", vaOnly.filter((b) => b.va_rood).length);
    console.log("VA blauw:", vaOnly.filter((b) => b.va_blauw).length);
    return vaOnly;
  }

  const maxCol = Math.min(sheet.columnCount || 80, 120);
  const headerRowIndex = detectHeaderRow(sheet, 50, Math.min(80, maxCol));
  const { red, blue, styleCol, classCol, partijCol } = buildCornerMaps({
    sheet,
    headerRowIndex,
    maxCol,
  });

  const bouts: ParsedBout[] = [];
  let autoNr = 1;

  for (let r = headerRowIndex + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);

    // â TOEVOEGING: pauze regel skip (kijk in eerste paar cellen)
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

    // â TOEVOEGING: toernooi herkennen (niet overslaan)
    // Check eerste paar cellen + een korte scan (veilig voor layouts zonder vaste kolom)
    let isToernooi = false;
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
    if (isToernooi) bout.extra.is_toernooi = true;

    // â TOEVOEGING: max gewicht "-31" detecteren en opslaan
    // (zonder je bestaande gewicht-mapping te veranderen)
    for (let c = 1; c <= Math.min(maxCol, 40); c++) {
      const txt = cellTextLike(row.getCell(c));
      const val = row.getCell(c).value;
      const mw = extractMaxWeightOnly(txt) || extractMaxWeightOnly(val);
      if (mw) {
        bout.extra.max_gewicht = mw; // bijv "31"
        break;
      }
    }

    const pRaw = cellTextLike(row.getCell(partijCol || 1));
    const pFirst = cellTextLike(row.getCell(1));

    if (pRaw && /^\d{1,4}$/.test(pRaw)) {
      bout.partij_nr = Number(pRaw);
      autoNr = bout.partij_nr + 1;
    } else if (pFirst && /^\d{1,4}$/.test(pFirst)) {
      bout.partij_nr = Number(pFirst);
      autoNr = bout.partij_nr + 1;
    } else {
      bout.partij_nr = autoNr++;
    }

    // ROOD
    bout.rood_naam = extractNameFromRow(row, red);

    const roodGym = red.gym ? cellTextLike(row.getCell(red.gym)) : "";
    bout.rood_gym = roodGym || null;

    const roodGebRaw = red.geb ? row.getCell(red.geb).value : null;
    bout.rood_geboortedatum = extractDate(roodGebRaw);

    const roodGew = red.gew ? cellTextLike(row.getCell(red.gew)) : "";
    bout.rood_gewicht = extractWeight(roodGew);

    const roodVaRaw = red.va ? cellTextLike(row.getCell(red.va)) : "";
    bout.va_rood = extractVA(roodVaRaw);

    const roodRecRaw = red.rec ? cellTextLike(row.getCell(red.rec)) : "";
    const recR = extractRecord(roodRecRaw);
    if (recR) {
      bout.record_rood_w = recR.w;
      bout.record_rood_l = recR.l;
      bout.record_rood_d = recR.d;
    }

    // BLAUW
    bout.blauw_naam = extractNameFromRow(row, blue);

    const blauwGym = blue.gym ? cellTextLike(row.getCell(blue.gym)) : "";
    bout.blauw_gym = blauwGym || null;

    const blauwGebRaw = blue.geb ? row.getCell(blue.geb).value : null;
    bout.blauw_geboortedatum = extractDate(blauwGebRaw);

    const blauwGew = blue.gew ? cellTextLike(row.getCell(blue.gew)) : "";
    bout.blauw_gewicht = extractWeight(blauwGew);

    const blauwVaRaw = blue.va ? cellTextLike(row.getCell(blue.va)) : "";
    bout.va_blauw = extractVA(blauwVaRaw);

    const blauwRecRaw = blue.rec ? cellTextLike(row.getCell(blue.rec)) : "";
    const recB = extractRecord(blauwRecRaw);
    if (recB) {
      bout.record_blauw_w = recB.w;
      bout.record_blauw_l = recB.l;
      bout.record_blauw_d = recB.d;
    }

    // stijl/klasse
    if (styleCol) {
      const v = cellTextLike(row.getCell(styleCol));
      bout.discipline = v || null;
    }
    if (classCol) {
      const v = cellTextLike(row.getCell(classCol));
      bout.klasse = v || null;
    }

    // kleur fallback (best effort; bij .xls kan dit null zijn als styles ontbreken)
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
      bout.blauw_gym;

    if (!hasAny) continue;

    bouts.push(bout);
  }

  console.log("ð Parsed bouts:", bouts.length, "mode:", mode);
  console.log("VA rood:", bouts.filter((b) => b.va_rood).length);
  console.log("VA blauw:", bouts.filter((b) => b.va_blauw).length);

  return bouts;
}