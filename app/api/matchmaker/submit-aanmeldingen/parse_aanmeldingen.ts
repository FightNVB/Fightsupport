import ExcelJS from "exceljs";

export type ParseAanmeldingenContext = {
  upload_batch_id?: string | null;
  upload_filename?: string | null;
  storage_path?: string | null;
};

export type ParsedFighterRow = {
  row_nr: number;
  klasse: string | null;
  discipline: string | null;
  geslacht: string | null;

  email: string | null;
  telefoon: string | null;

  naam: string | null;
  voornaam: string | null;
  achternaam: string | null;
  va_nummer: string | null;
  gym: string | null;

  geboortedatum: string | null;
  gewicht: number | null;

  win: number | null;
  loss: number | null;
  draw: number | null;
  demo: number | null;

  opmerkingen: string | null;
  raw: Record<string, any>;
};


function s(v: unknown): string {
  return String(v ?? "").trim();
}

function norm(s: any): string {
  return String(cellPrimitive(s) ?? "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase();
}

function cellPrimitive(v: any): any {
  if (v == null) return null;

  if (typeof v === "object") {
    if ("result" in v) return v.result;
    if ("text" in v) return v.text;
    if ("richText" in v && Array.isArray(v.richText)) {
      return v.richText.map((x: any) => x?.text ?? "").join("");
    }
    if ("hyperlink" in v && "text" in v) return v.text;
  }

  return v;
}

function asText(v: any): string | null {
  const raw = cellPrimitive(v);
  const s = String(raw ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!s) return null;
  if (s.toLowerCase() === "null") return null;
  if (s === "[object Object]") return null;

  return s;
}

function cleanNamePart(v: any): string | null {
  const text = asText(v);
  if (!text) return null;
  if (text.startsWith("=")) return null;
  return text;
}

function makeFullName(args: {
  naam?: any;
  voornaam?: any;
  achternaam?: any;
  fallback?: any;
}): string | null {
  const voornaam = cleanNamePart(args.voornaam);
  const achternaam = cleanNamePart(args.achternaam);
  const combined = [voornaam, achternaam].filter(Boolean).join(" ").trim();

  // Bij standaard aanmeldlijsten staan voornaam en achternaam los.
  // Gebruik die combinatie altijd boven een losse/generiek gevonden naam-kolom,
  // zodat naam_input niet per ongeluk alleen de voornaam wordt.
  if (combined) return combined;

  const direct = cleanNamePart(args.naam);
  if (direct) return direct;

  return cleanNamePart(args.fallback);
}

function parseNumber(v: any): number | null {
  if (v == null) return null;
  const raw = cellPrimitive(v);

  if (typeof raw === "number" && Number.isFinite(raw)) return raw;

  const s = String(raw ?? "").replace(",", ".").trim();
  if (!s) return null;

  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;

  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function parseWeightKg(v: any): number | null {
  return parseNumber(v);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoDate(v: any): string | null {
  const raw = cellPrimitive(v);
  if (!raw) return null;

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const m = pad2(raw.getMonth() + 1);
    const d = pad2(raw.getDate());
    return `${y}-${m}-${d}`;
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = raw * 24 * 60 * 60 * 1000;
    const d = new Date(excelEpoch.getTime() + ms);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(
        d.getUTCDate(),
      )}`;
    }
  }

  const s = String(raw).trim();
  if (!s) return null;

  const m1 = s.match(/^(\d{1,2})[\-/](\d{1,2})[\-/](\d{4})$/);
  if (m1) {
    const d = pad2(Number(m1[1]));
    const m = pad2(Number(m1[2]));
    const y = m1[3];
    return `${y}-${m}-${d}`;
  }

  const m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m2) {
    const y = m2[1];
    const m = pad2(Number(m2[2]));
    const d = pad2(Number(m2[3]));
    return `${y}-${m}-${d}`;
  }

  return null;
}

function parseErvaring(v: any): {
  win: number | null;
  loss: number | null;
  draw: number | null;
  demo: number | null;
} {
  const s = asText(v) ?? "";
  if (!s) return { win: null, loss: null, draw: null, demo: null };

  const parts = s.split("/").map((x) => parseNumber(x));
  return {
    win: parts[0] ?? null,
    loss: parts[1] ?? null,
    draw: parts[2] ?? null,
    demo: parts[3] ?? null,
  };
}

function findHeaderRow(ws: ExcelJS.Worksheet): number {
  const maxScan = Math.min(ws.rowCount, 60);

  for (let r = 1; r <= maxScan; r++) {
    const row = ws.getRow(r);
    const values = (row.values ?? []) as any[];
    const joined = values.map(norm).join("|");

    const fightSupportTemplate =
      joined.includes("naam atleet 1") &&
      joined.includes("sportschool") &&
      joined.includes("fightpaspoort");

    const standardTemplate =
      joined.includes("geslacht") &&
      joined.includes("voornaam") &&
      joined.includes("achternaam") &&
      (joined.includes("va nr.") ||
        joined.includes("va nr") ||
        joined.includes("va"));

    const oldTemplate =
      joined.includes("voornaam") &&
      joined.includes("achternaam") &&
      (joined.includes("va") || joined.includes("va nr"));

    if (fightSupportTemplate || standardTemplate || oldTemplate) return r;
  }

  return 1;
}

function buildColumnMap(headerRow: ExcelJS.Row) {
  const colMap: Record<string, number> = {};

  headerRow.eachCell((cell, col) => {
    const key = norm(cell.value);
    if (!key) return;
    colMap[key] = col;
  });

  return colMap;
}

function getCellText(row: ExcelJS.Row, colNr: number | null) {
  if (!colNr) return null;
  return asText(row.getCell(colNr).value);
}

function getCellNumber(row: ExcelJS.Row, colNr: number | null) {
  if (!colNr) return null;
  return parseNumber(row.getCell(colNr).value);
}

function getCellDate(row: ExcelJS.Row, colNr: number | null) {
  if (!colNr) return null;
  return toIsoDate(row.getCell(colNr).value);
}

function getEventMeta(ws: ExcelJS.Worksheet, headerRowNr: number) {
  const meta: Record<string, any> = {};

  for (let r = 1; r < headerRowNr; r++) {
    const row = ws.getRow(r);
    const values = (row.values ?? []) as any[];

    for (let i = 1; i < values.length; i++) {
      const current = norm(values[i]);
      const next = values[i + 1];

      if (current.includes("naam evenement")) {
        meta.evenement_naam = asText(next);
      } else if (current.includes("datum evenement")) {
        meta.evenement_datum = toIsoDate(next) ?? asText(next);
      } else if (current === "bond:" || current === "bond") {
        meta.bond = asText(next);
      }
    }
  }

  return meta;
}

export async function parseExcelToFighters(
  buf: Buffer,
  context: ParseAanmeldingenContext = {},
): Promise<ParsedFighterRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);

  const ws = wb.worksheets[0];
  if (!ws) return [];

  const headerRowNr = findHeaderRow(ws);
  const headerRow = ws.getRow(headerRowNr);
  const colMap = buildColumnMap(headerRow);
  const eventMeta = getEventMeta(ws, headerRowNr);
  const uploadBatchId = s(context.upload_batch_id);
  const uploadFilename = s(context.upload_filename);
  const storagePath = s(context.storage_path);

  const col = (...keys: string[]) => {
    for (const k of keys) {
      const c = colMap[norm(k)];
      if (c) return c;
    }

    const entries = Object.entries(colMap);

    for (const k of keys) {
      const kk = norm(k);
      const found = entries.find(
        ([h]) => h === kk || h.includes(kk) || kk.includes(h),
      );
      if (found) return found[1];
    }

    return null;
  };

  const cNr = col("nr.", "nr", "nummer");
  const cKlasse = col("klasse");
  const cDisc = col("stijl", "discipline");
  const cGesl = col("geslacht");
  const cEmail = col("email", "e-mail", "mail");
  const cTel = col("telefoon", "tel", "telefoonnummer", "mobiel", "mobile");

  const cVoor = col("voornaam");
  const cAcht = col("achternaam");
  let cNaamAtleet = col(
    "naam atleet 1",
    "naam atleet",
    "volledige naam",
    "naam vechter",
    "vechter",
    "naam",
  );

  // Voorkom dat de generieke header "naam" fuzzy matcht op "voornaam" of "achternaam".
  // In dat geval moet naam uit voornaam + achternaam worden opgebouwd.
  if (cNaamAtleet && (cNaamAtleet === cVoor || cNaamAtleet === cAcht)) {
    cNaamAtleet = null;
  }

  const cVa = col(
    "va nr.",
    "va nr",
    "va",
    "va_nummer",
    "fightpaspoort nr (1)",
    "fightpaspoort nr",
    "fightpaspoortnummer",
  );

  const cGym = col("gym", "sportschool", "sportschool (1)");
  const cDob = col("geboortedatum", "dob");
  const cGew = col("gewicht", "kg", "kg (1)");

  const cWin = col("win");
  const cLoss = col("loss", "verlies");
  const cDraw = col("draw");
  const cDemo = col("demo");
  const cErv = col("erv", "ervaring", "record");

  const cOp = col("opmerkingen", "extra", "notities");

  const out: ParsedFighterRow[] = [];
  const usingSingleNameColumn = Boolean(cNaamAtleet && !cVoor && !cAcht);

  for (let r = headerRowNr + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const anyVal = (Array.isArray(row.values) ? row.values : []).some((v: any) => norm(v));
    if (!anyVal) continue;

    const fullName = getCellText(row, cNaamAtleet);
    const voornaam = cVoor ? getCellText(row, cVoor) : null;
    const achternaam = cAcht ? getCellText(row, cAcht) : null;

    const naam = makeFullName({
      naam: fullName,
      voornaam,
      achternaam,
      fallback: fullName,
    });

    const va_nummer = getCellText(row, cVa);

    if (!naam && !voornaam && !achternaam && !va_nummer) continue;

    const rowNrFromSheet = getCellNumber(row, cNr);
    const gym = getCellText(row, cGym);
    const erv = parseErvaring(getCellText(row, cErv));

    const win = cWin ? getCellNumber(row, cWin) : erv.win;
    const loss = cLoss ? getCellNumber(row, cLoss) : erv.loss;
    const draw = cDraw ? getCellNumber(row, cDraw) : erv.draw;
    const demo = cDemo ? getCellNumber(row, cDemo) : erv.demo;

    const fighter: ParsedFighterRow = {
      row_nr: rowNrFromSheet ?? r,
      klasse: getCellText(row, cKlasse),
      discipline: getCellText(row, cDisc),
      geslacht: getCellText(row, cGesl),

      email: getCellText(row, cEmail),
      telefoon: getCellText(row, cTel),

      naam,
      voornaam,
      achternaam,
      va_nummer: va_nummer ? String(va_nummer).trim() : null,
      gym,

      geboortedatum: getCellDate(row, cDob),
      gewicht: cGew ? parseWeightKg(row.getCell(cGew).value) : null,

      win,
      loss,
      draw,
      demo,

      opmerkingen: getCellText(row, cOp),
      raw: {
        values: row.values,
        template_type: usingSingleNameColumn
          ? "fightsupport_aanmeldingen"
          : "standard_inschrijvingen",
        event_meta: eventMeta,
        original_name_cell: fullName,
        parsed_naam: naam,
        ...(uploadBatchId ? { upload_batch_id: uploadBatchId } : {}),
        ...(uploadFilename ? { upload_filename: uploadFilename } : {}),
        ...(storagePath ? { storage_path: storagePath } : {}),
      },
    };

    if (!fighter.naam && !fighter.voornaam && !fighter.achternaam && !fighter.va_nummer) {
      continue;
    }

    out.push(fighter);
  }

  return out;
}