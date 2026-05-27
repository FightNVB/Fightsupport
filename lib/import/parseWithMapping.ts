import ExcelJS from "exceljs";

type Mapping = Record<string, number | null>;

function cellToText(v: any) {
  if (v == null) return "";
  if (typeof v === "object" && "text" in v) return String((v as any).text ?? "").trim();
  return String(v).trim();
}

function getText(row: ExcelJS.Row, col?: number | null) {
  if (!col) return "";
  return cellToText(row.getCell(col).value);
}

function joinName(naam: string, voor: string, ach: string) {
  const n = (naam || "").trim();
  if (n) return n;
  const v = (voor || "").trim();
  const a = (ach || "").trim();
  return `${v} ${a}`.trim();
}

function extractVA(raw: any): string | null {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  let digits = v.replace(/\D+/g, "");
  digits = digits.replace(/^0+/, "");
  if (!digits) return null;
  if (digits.length < 2 || digits.length > 6) return null;
  return digits;
}

export async function parseExcelToBoutsWithMapping(opts: {
  fileBuffer: Buffer;
  sheet_name: string;
  header_row: number;
  mapping: Mapping;
}) {
  const { fileBuffer, sheet_name, header_row, mapping } = opts;

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fileBuffer as any);

  const ws = wb.getWorksheet(sheet_name) || wb.worksheets[0];
  if (!ws) return [];

  const bouts: any[] = [];
  let autoNr = 1;

  for (let r = header_row + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    const partijRaw = getText(row, mapping.partij_nr ?? 1);
    const partij = /^\d{1,4}$/.test(partijRaw) ? Number(partijRaw) : autoNr++;
    autoNr = partij + 1;

    const rood_naam = joinName(
      getText(row, mapping.rood_naam),
      getText(row, mapping.rood_voornaam),
      getText(row, mapping.rood_achternaam)
    );

    const blauw_naam = joinName(
      getText(row, mapping.blauw_naam),
      getText(row, mapping.blauw_voornaam),
      getText(row, mapping.blauw_achternaam)
    );

    const va_rood = extractVA(getText(row, mapping.rood_va));
    const va_blauw = extractVA(getText(row, mapping.blauw_va));

    // skip lege rijen
    const hasAny = rood_naam || blauw_naam || va_rood || va_blauw;
    if (!hasAny) continue;

    bouts.push({
      partij_nr: partij,

      rood_naam: rood_naam || null,
      rood_gym: getText(row, mapping.rood_gym) || null,
      va_rood: va_rood || null,
      rood_geboortedatum: getText(row, mapping.rood_geboortedatum) || null,
      rood_gewicht: getText(row, mapping.rood_gewicht) || null,

      blauw_naam: blauw_naam || null,
      blauw_gym: getText(row, mapping.blauw_gym) || null,
      va_blauw: va_blauw || null,
      blauw_geboortedatum: getText(row, mapping.blauw_geboortedatum) || null,
      blauw_gewicht: getText(row, mapping.blauw_gewicht) || null,

      discipline: getText(row, mapping.discipline) || null,
      klasse: getText(row, mapping.klasse) || null,

      record_rood_w: 0, record_rood_l: 0, record_rood_d: 0,
      record_blauw_w: 0, record_blauw_l: 0, record_blauw_d: 0,

      extra: { mode: "mapping" },
    });
  }

  return bouts;
}
