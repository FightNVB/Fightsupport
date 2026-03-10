import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

export async function GET() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MatchControl";
  wb.created = new Date();

  const ws = wb.addWorksheet("Fighters");
  ws.columns = [
    { header: "naam", key: "naam", width: 26 }, // mag ook voor+achternaam zijn
    { header: "voornaam", key: "voornaam", width: 18 },
    { header: "achternaam", key: "achternaam", width: 18 },
    { header: "gym", key: "gym", width: 26 },
    { header: "va_nummer", key: "va_nummer", width: 14 },
    { header: "kg", key: "kg", width: 10 },
    { header: "discipline", key: "discipline", width: 14 },
    { header: "klasse", key: "klasse", width: 18 },
    { header: "geboortedatum", key: "geboortedatum", width: 14 }, // YYYY-MM-DD
  ];

  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  ws.addRow({
    naam: "Jair Ronodimedjo",
    gym: "Gym Zero50 / ZeroFifty Fights",
    va_nummer: "20483",
    kg: 50,
    discipline: "KICKBOKSEN",
    klasse: "JEUGD KLASSE",
    geboortedatum: "2011-06-26",
  });

  const info = wb.addWorksheet("INFO");
  info.columns = [{ header: "info", key: "info", width: 140 }];
  info.addRow({
    info:
      "MATCHMAKER MATCHEN TEMPLATE. Je mag óf 'naam' vullen, óf 'voornaam' + 'achternaam'. Kolomnamen laten staan. Parser herkent ook andere bestanden (zoals jouw Dynamite voorbeeld) op basis van header namen.",
  });
  info.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="matchmaker_fighters_template.xlsx"',
    },
  });
}
