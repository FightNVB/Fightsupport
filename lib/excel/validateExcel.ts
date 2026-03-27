/**
 * lib/excel/validateExcel.ts
 * Excel validation utilities for file uploads.
 *
 * Functions:
 *  - validateMatchmakerExcel(buffer)  - Fighter list validation
 *  - validateUitslagenExcel(buffer)   - Results validation
 *  - sanitizeExcelValue(value)        - Safe string/number extraction
 */

import ExcelJS from "exceljs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ROWS = 1000;
export const ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
export const ALLOWED_EXTENSIONS = [".xlsx", ".xls"];

// FightPassport uitslagen required headers
export const UITSLAG_HEADERS_REQUIRED = [
  "Nr.",
  "Discipline*",
  "Klasse*",
  "VANr. (Rood)*",
  "Naam (Rood)",
  "Uitslag (uitkomst van rood hoek)",
  "VANr. (Blauw)*",
  "Naam (Blauw)",
] as const;

// ---------------------------------------------------------------------------
// Validation result types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  rowCount?: number;
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

/**
 * Safely extract a string from an Excel cell value.
 * Trims whitespace and enforces a max length.
 */
export function sanitizeExcelString(
  value: unknown,
  maxLength = 500
): string | null {
  if (value == null) return null;
  if (value instanceof Date) return null;
  const s = String(value).trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") {
    return null;
  }
  return s.slice(0, maxLength);
}

/**
 * Safely extract a finite number from an Excel cell value.
 */
export function sanitizeExcelNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object") return null;
  const s = String(value).replace(",", ".").trim();
  if (!s) return null;
  const match = s.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Safely extract either a string or number from an Excel cell value.
 * Returns the value in its most natural form.
 */
export function sanitizeExcelValue(
  value: unknown
): string | number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value).trim();
  return s || null;
}

// ---------------------------------------------------------------------------
// File-level validation helpers
// ---------------------------------------------------------------------------

/**
 * Validate file size.
 */
export function validateFileSize(sizeBytes: number): string | null {
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return `Bestand is te groot (${(sizeBytes / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}

/**
 * Validate file extension.
 */
export function validateFileExtension(filename: string): string | null {
  const lower = filename.toLowerCase();
  const ok = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!ok) {
    return `Ongeldig bestandstype. Alleen ${ALLOWED_EXTENSIONS.join(", ")} bestanden zijn toegestaan.`;
  }
  return null;
}

/**
 * Validate MIME type.
 */
export function validateMimeType(mimeType: string): string | null {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return `Ongeldig bestandstype (${mimeType}). Alleen Excel bestanden zijn toegestaan.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Header normalization
// ---------------------------------------------------------------------------

function normalizeHeader(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// Matchmaker Excel validation (fighter list)
// ---------------------------------------------------------------------------

const MATCHMAKER_REQUIRED_HEADERS = [
  ["voornaam"],
  ["achternaam"],
  ["va nr.", "va nr", "va", "va_nummer"],
];

/**
 * Validates an uploaded matchmaker Excel buffer.
 * Checks: headers, row count, numeric columns, duplicate fighters.
 */
export async function validateMatchmakerExcel(
  buffer: Buffer | Uint8Array
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let wb: ExcelJS.Workbook;
  try {
    wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buffer as any);
  } catch {
    return {
      valid: false,
      errors: ["Kan het Excel bestand niet lezen. Controleer of het bestand niet beschadigd is."],
      warnings,
    };
  }

  const ws = wb.worksheets[0];
  if (!ws) {
    return {
      valid: false,
      errors: ["Excel bestand bevat geen werkbladen."],
      warnings,
    };
  }

  // Find header row
  const headerRowNr = findHeaderRow(ws, ["voornaam", "achternaam"]);
  const headerRow = ws.getRow(headerRowNr);

  // Build column map
  const colMap: Record<string, number> = {};
  headerRow.eachCell((cell, col) => {
    const key = normalizeHeader(cell.value);
    if (key) colMap[key] = col;
  });

  // Check required headers
  for (const aliases of MATCHMAKER_REQUIRED_HEADERS) {
    const found = aliases.some((a) => {
      const norm = normalizeHeader(a);
      return (
        colMap[norm] !== undefined ||
        Object.keys(colMap).some((h) => h.includes(norm))
      );
    });
    if (!found) {
      errors.push(
        `Verplichte kolom ontbreekt: "${aliases[0]}". Controleer de kolomkoppen.`
      );
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Count data rows and check for duplicates
  const dataRowCount = Math.max(0, ws.rowCount - headerRowNr);
  if (dataRowCount > MAX_ROWS) {
    errors.push(
      `Te veel rijen (${dataRowCount}). Maximum is ${MAX_ROWS} rijen per upload.`
    );
    return { valid: false, errors, warnings };
  }

  const seen = new Map<string, number>();
  let rowCount = 0;

  const colVoor = findCol(colMap, ["voornaam"]);
  const colAcht = findCol(colMap, ["achternaam"]);
  const colVa = findCol(colMap, ["va nr.", "va nr", "va", "va_nummer"]);
  const colGew = findCol(colMap, ["gewicht", "kg"]);

  for (let r = headerRowNr + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    const voornaam = colVoor ? sanitizeExcelString(row.getCell(colVoor).value) : null;
    const achternaam = colAcht ? sanitizeExcelString(row.getCell(colAcht).value) : null;
    const vaNummer = colVa ? sanitizeExcelString(row.getCell(colVa).value) : null;

    if (!voornaam && !achternaam && !vaNummer) continue;

    rowCount++;

    // Duplicate detection: va_nummer + name
    const key = `${(vaNummer ?? "").toLowerCase()}|${(voornaam ?? "").toLowerCase()}|${(achternaam ?? "").toLowerCase()}`;
    const prevRow = seen.get(key);
    if (prevRow !== undefined) {
      warnings.push(
        `Mogelijke dubbele vechter op rij ${r}: ${voornaam} ${achternaam}${vaNummer ? ` (VA: ${vaNummer})` : ""} (ook op rij ${prevRow}).`
      );
    } else {
      seen.set(key, r);
    }

    // Numeric column type check
    if (colGew) {
      const gew = row.getCell(colGew).value;
      if (gew != null && sanitizeExcelNumber(gew) === null) {
        warnings.push(`Rij ${r}: Gewicht "${gew}" is geen geldig getal.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    rowCount,
  };
}

// ---------------------------------------------------------------------------
// Uitslagen Excel validation
// ---------------------------------------------------------------------------

/**
 * Validates a FightPassport uitslagen Excel buffer.
 * Checks required headers and row count.
 */
export async function validateUitslagenExcel(
  buffer: Buffer | Uint8Array
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let wb: ExcelJS.Workbook;
  try {
    wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buffer as any);
  } catch {
    return {
      valid: false,
      errors: ["Kan het Excel bestand niet lezen. Controleer of het bestand niet beschadigd is."],
      warnings,
    };
  }

  const ws = wb.worksheets[0];
  if (!ws) {
    return {
      valid: false,
      errors: ["Excel bestand bevat geen werkbladen."],
      warnings,
    };
  }

  // Find the header row containing required FightPassport columns
  const headerRowNr = findHeaderRowByContent(ws, UITSLAG_HEADERS_REQUIRED as unknown as string[]);
  const headerRow = ws.getRow(headerRowNr);

  // Build set of found headers
  const foundHeaders = new Set<string>();
  headerRow.eachCell((cell) => {
    const h = String(cell.value ?? "").trim();
    if (h) foundHeaders.add(h);
  });

  // Check required headers
  for (const required of UITSLAG_HEADERS_REQUIRED) {
    if (!foundHeaders.has(required)) {
      errors.push(`Verplichte kolom ontbreekt in Excel: "${required}".`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Count rows
  const rowCount = Math.max(0, ws.rowCount - headerRowNr);
  if (rowCount > MAX_ROWS) {
    errors.push(`Te veel rijen (${rowCount}). Maximum is ${MAX_ROWS}.`);
    return { valid: false, errors, warnings };
  }

  return {
    valid: true,
    errors,
    warnings,
    rowCount,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function findHeaderRow(ws: ExcelJS.Worksheet, mustContain: string[]): number {
  const maxScan = Math.min(ws.rowCount, 50);
  for (let r = 1; r <= maxScan; r++) {
    const row = ws.getRow(r);
    const values = (row.values ?? []) as unknown[];
    const joined = values.map(normalizeHeader).join("|");
    if (mustContain.every((k) => joined.includes(normalizeHeader(k)))) {
      return r;
    }
  }
  return 1;
}

function findHeaderRowByContent(
  ws: ExcelJS.Worksheet,
  mustContain: string[]
): number {
  const maxScan = Math.min(ws.rowCount, 50);
  for (let r = 1; r <= maxScan; r++) {
    const row = ws.getRow(r);
    const values = (row.values ?? []) as unknown[];
    const strValues = values.map((v) => String(v ?? "").trim());
    if (mustContain.some((k) => strValues.includes(k))) {
      return r;
    }
  }
  return 1;
}

function findCol(
  colMap: Record<string, number>,
  aliases: string[]
): number | null {
  for (const alias of aliases) {
    const norm = normalizeHeader(alias);
    if (colMap[norm] !== undefined) return colMap[norm];
    const fuzzy = Object.entries(colMap).find(([h]) => h.includes(norm));
    if (fuzzy) return fuzzy[1];
  }
  return null;
}
