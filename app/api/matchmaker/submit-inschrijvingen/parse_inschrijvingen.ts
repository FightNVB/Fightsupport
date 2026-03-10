import ExcelJS from "exceljs";

export type ParsedFighterRow = {
  row_nr: number;
  klasse: string | null;
  discipline: string | null;
  geslacht: string | null;

  // contact
  email: string | null;
  telefoon: string | null;

  voornaam: string | null;
  achternaam: string | null;
  va_nummer: string | null;
  gym: string | null;

  geboortedatum: string | null; // YYYY-MM-DD
  gewicht: number | null;

  win: number | null;
  loss: number | null;
  draw: number | null;
  demo: number | null;

  opmerkingen: string | null;
  raw: Record<string, any>;
};

function norm(s: any): string {
  return String(s ?? "").trim().toLowerCase();
}

function asText(v: any): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function parseNumber(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).replace(",", ".").trim();
  if (!s) return null;
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function parseWeightKg(v: any): number | null {
  // accepts: 63.5, "63.5 kg", "63,5kg"
  return parseNumber(v);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoDate(v: any): string | null {
  if (!v) return null;

  // ExcelJS may give Date
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = pad2(v.getMonth() + 1);
    const d = pad2(v.getDate());
    return `${y}-${m}-${d}`;
  }

  const s = String(v).trim();
  if (!s) return null;

  // dd-mm-yyyy or dd/mm/yyyy
  const m1 = s.match(/^(\d{1,2})[\-/](\d{1,2})[\-/](\d{4})$/);
  if (m1) {
    const d = pad2(Number(m1[1]));
    const m = pad2(Number(m1[2]));
    const y = m1[3];
    return `${y}-${m}-${d}`;
  }

  // yyyy-mm-dd
  const m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m2) {
    const y = m2[1];
    const m = pad2(Number(m2[2]));
    const d = pad2(Number(m2[3]));
    return `${y}-${m}-${d}`;
  }

  return null;
}

function findHeaderRow(ws: ExcelJS.Worksheet): number {
  // look for a row containing "voornaam" + "achternaam" + "va"
  const maxScan = Math.min(ws.rowCount, 50);
  for (let r = 1; r <= maxScan; r++) {
    const row = ws.getRow(r);
    const values = (row.values ?? []) as any[];
    const joined = values.map(norm).join("|");
    if (joined.includes("voornaam") && joined.includes("achternaam") && (joined.includes("va") || joined.includes("va nr"))) {
      return r;
    }
  }
  return 1;
}

export async function parseExcelToFighters(buf: Buffer): Promise<ParsedFighterRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const ws = wb.worksheets[0];
  if (!ws) return [];

  const headerRowNr = findHeaderRow(ws);
  const headerRow = ws.getRow(headerRowNr);
  const colMap: Record<string, number> = {};

  headerRow.eachCell((cell, col) => {
    const key = norm(cell.value);
    if (!key) return;
    colMap[key] = col;
  });

  // helper to find column by possible header labels
  const col = (...keys: string[]) => {
    for (const k of keys) {
      const c = colMap[norm(k)];
      if (c) return c;
    }
    // fuzzy: find includes
    const entries = Object.entries(colMap);
    for (const k of keys) {
      const kk = norm(k);
      const found = entries.find(([h]) => h.includes(kk));
      if (found) return found[1];
    }
    return null;
  };

  const cKlasse = col("klasse");
  const cDisc = col("stijl", "discipline");
  const cGesl = col("geslacht");
  const cEmail = col("email", "e-mail", "mail");
  const cTel = col("telefoon", "tel", "telefoonnummer", "mobiel", "mobile");
  const cVoor = col("voornaam");
  const cAcht = col("achternaam");
  const cVa = col("va nr.", "va nr", "va", "va_nummer");
  const cGym = col("gym", "sportschool");
  const cDob = col("geboortedatum", "dob");
  const cGew = col("gewicht", "kg");
  const cWin = col("win");
  const cLoss = col("loss", "verlies");
  const cDraw = col("draw");
  const cDemo = col("demo");
  const cOp = col("opmerkingen", "extra", "notities");

  const out: ParsedFighterRow[] = [];

  for (let r = headerRowNr + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    const voornaam = cVoor ? asText(row.getCell(cVoor).value) : null;
    const achternaam = cAcht ? asText(row.getCell(cAcht).value) : null;
    const va_nummer = cVa ? asText(row.getCell(cVa).value) : null;

    // stop if we hit a long empty section
    if (!voornaam && !achternaam && !va_nummer) {
      // but continue if there are still values elsewhere; simple heuristic:
      const anyVal = (row.values ?? []).some((v: any) => norm(v));
      if (!anyVal) continue;
    }

    // ignore opponent columns in templates that still have them (we only keep 1 fighter per row)
    const gym = cGym ? asText(row.getCell(cGym).value) : null;

    const fighter: ParsedFighterRow = {
      row_nr: r,
      klasse: cKlasse ? asText(row.getCell(cKlasse).value) : null,
      discipline: cDisc ? asText(row.getCell(cDisc).value) : null,
      geslacht: cGesl ? asText(row.getCell(cGesl).value) : null,
      email: cEmail ? asText(row.getCell(cEmail).value) : null,
      telefoon: cTel ? asText(row.getCell(cTel).value) : null,

      voornaam,
      achternaam,
      va_nummer: va_nummer ? String(va_nummer).trim() : null,
      gym,

      geboortedatum: cDob ? toIsoDate(row.getCell(cDob).value) : null,
      gewicht: cGew ? parseWeightKg(row.getCell(cGew).value) : null,

      win: cWin ? parseNumber(row.getCell(cWin).value) : null,
      loss: cLoss ? parseNumber(row.getCell(cLoss).value) : null,
      draw: cDraw ? parseNumber(row.getCell(cDraw).value) : null,
      demo: cDemo ? parseNumber(row.getCell(cDemo).value) : null,

      opmerkingen: cOp ? asText(row.getCell(cOp).value) : null,
      raw: {
        values: row.values,
      },
    };

    // require at least name OR VA
    if (!fighter.voornaam && !fighter.achternaam && !fighter.va_nummer) continue;

    out.push(fighter);
  }

  return out;
}
