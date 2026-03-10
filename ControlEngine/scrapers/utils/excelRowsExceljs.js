import ExcelJS from "exceljs";
import fs from "fs";

/**
 * Vervanger voor:
 *   XLSX.read(...) + sheet_to_json(sheet, { header: 1, raw: false })
 *
 * Geeft: rows = array-of-arrays (AOA)
 * Zodat je bestaande scraper-logica vrijwel hetzelfde blijft.
 */
export async function readXlsxToRows(input, opts = {}) {
  const { sheetIndex = 0, maxCol = 200, trim = true } = opts;

  const wb = new ExcelJS.Workbook();

  if (Buffer.isBuffer(input)) {
    await wb.xlsx.load(input);
  } else if (typeof input === "string") {
    const buf = fs.readFileSync(input);
    await wb.xlsx.load(buf);
  } else {
    throw new Error("readXlsxToRows: input moet Buffer of filepath string zijn");
  }

  const ws = wb.worksheets[sheetIndex];
  if (!ws) return [];

  const colCount = Math.min(ws.columnCount || maxCol, maxCol);
  const rows = [];

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const arr = [];

    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      const v = cell.value;

      let s = "";
      if (v == null) s = "";
      else if (v instanceof Date) {
        const yyyy = String(v.getFullYear());
        const mm = String(v.getMonth() + 1).padStart(2, "0");
        const dd = String(v.getDate()).padStart(2, "0");
        s = `${yyyy}-${mm}-${dd}`;
      } else if (typeof v === "object" && v.text) {
        s = String(v.text);
      } else {
        s = String(v);
      }

      arr.push(trim ? s.trim() : s);
    }

    rows.push(arr);
  }

  // trailing lege rijen weg (zoals sheet_to_json vaak implicit doet)
  while (
    rows.length &&
    rows[rows.length - 1].every((x) => !String(x || "").trim())
  ) {
    rows.pop();
  }

  return rows;
}
