import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

export async function GET() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MatchControl";
  wb.created = new Date();

  const ws = wb.addWorksheet("Bouts");
  ws.columns = [
    { header: "partij_nr", key: "partij_nr", width: 10 },
    { header: "discipline", key: "discipline", width: 14 },
    { header: "klasse", key: "klasse", width: 18 },

    { header: "naam_rood", key: "naam_rood", width: 24 },
    { header: "gym_rood", key: "gym_rood", width: 24 },
    { header: "va_rood", key: "va_rood", width: 14 },
    { header: "kg_rood", key: "kg_rood", width: 10 },

    { header: "naam_blauw", key: "naam_blauw", width: 24 },
    { header: "gym_blauw", key: "gym_blauw", width: 24 },
    { header: "va_blauw", key: "va_blauw", width: 14 },
    { header: "kg_blauw", key: "kg_blauw", width: 10 },

    { header: "titel_partij", key: "titel_partij", width: 12 },
    { header: "toernooi", key: "toernooi", width: 10 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const info = wb.addWorksheet("INFO");
  info.columns = [{ header: "info", key: "info", width: 140 }];
  info.addRow({
    info:
      "UPLOAD TEMPLATE (OFFICIALS). Laat de kolomnamen exact staan. titel_partij/toernooi invullen met Ja of Nee.",
  });
  info.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="official_upload_template.xlsx"',
    },
  });
}