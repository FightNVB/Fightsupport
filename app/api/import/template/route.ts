// app/api/import/template/route.ts
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

export async function GET() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MatchControl";
  wb.created = new Date();

  // =========================
  // Sheet 1: Template
  // =========================
  const ws = wb.addWorksheet("Template");

  const headers = [
    "Partij nr",
    "Discipline",
    "Klasse",
    "Max gewicht (kg)",
    "Rood naam",
    "Rood gym",
    "Rood FightPassport (VA nr)",
    "Rood gewicht (kg)",
    "Blauw naam",
    "Blauw gym",
    "Blauw FightPassport (VA nr)",
    "Blauw gewicht (kg)",
  ];

  ws.addRow(headers);
  ws.addRow([1, "", "", "", "", "", "", "", "", "", "", ""]);
  ws.addRow([2, "", "", "", "", "", "", "", "", "", "", ""]);

  ws.views = [{ state: "frozen", ySplit: 1 }];

  // Kolombreedtes
  ws.columns = [
    { width: 10 }, // partij
    { width: 12 }, // discipline
    { width: 18 }, // klasse
    { width: 18 }, // max kg
    { width: 22 }, // rood naam
    { width: 20 }, // rood gym
    { width: 24 }, // rood fightpassport
    { width: 18 }, // rood gewicht
    { width: 22 }, // blauw naam
    { width: 20 }, // blauw gym
    { width: 26 }, // blauw fightpassport
    { width: 18 }, // blauw gewicht
  ];

  // Header styling
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.height = 24;

  // ---- Excel “geen rare wetenschap” regels ----
  // We zetten expliciet number formats en tekst formats.
  // - FightPassport/VA nr moet TEKST blijven (geen wetenschappelijke notatie)
  // - Max gewicht en gewichten: getal met 1 decimaal
  //
  // Kolomnummers:
  // 4 = Max gewicht
  // 7 = Rood FightPassport
  // 8 = Rood gewicht
  // 11 = Blauw FightPassport
  // 12 = Blauw gewicht
  const COL_MAXKG = 4;
  const COL_ROOD_FP = 7;
  const COL_ROOD_KG = 8;
  const COL_BLAUW_FP = 11;
  const COL_BLAUW_KG = 12;

  // Stel formats in voor een “redelijk” bereik
  for (let r = 2; r <= 500; r++) {
    // FightPassport als tekst
    ws.getCell(r, COL_ROOD_FP).numFmt = "@";
    ws.getCell(r, COL_BLAUW_FP).numFmt = "@";

    // Gewichten als getal (1 decimaal)
    ws.getCell(r, COL_MAXKG).numFmt = "0.0";
    ws.getCell(r, COL_ROOD_KG).numFmt = "0.0";
    ws.getCell(r, COL_BLAUW_KG).numFmt = "0.0";
  }

  // Dropdown voor discipline
  for (let r = 2; r <= 500; r++) {
    ws.getCell(`B${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"KB,MMA,MT,K1"'],
      showErrorMessage: true,
      errorTitle: "Ongeldige discipline",
      error: "Kies uit: KB, MMA, MT, K1 (of laat leeg).",
    };
  }

  // =========================
  // Sheet 2: Uitleg
  // =========================
  const info = wb.addWorksheet("Uitleg");
  info.columns = [{ width: 110 }];

  const lines = [
    "MATCHCONTROL TEMPLATE — UITLEG (super simpel)",
    "",
    "1) Wat moet je doen?",
    "• Download dit bestand.",
    "• Vul de tab ‘Template’ in (1 regel = 1 partij).",
    "• Sla op.",
    "• Upload het bestand in MatchControl bij ‘Upload ingevulde template’.",
    "",
    "2) Welke velden zijn belangrijk?",
    "• Partij nr: gewoon 1,2,3… (als je dit leeg laat, doen wij het voor je).",
    "• Rood/Blauw naam: graag invullen.",
    "• Rood/Blauw gym: sportschool/club naam.",
    "• Rood/Blauw FightPassport (VA nr): heel belangrijk. (Mag leeg als je het niet weet.)",
    "• Discipline: bijv. KB of MMA.",
    "• Klasse: bijv. J-Klasse, N-Klasse, A-Klasse…",
    "• Max gewicht (kg): 38 of 71 of 90. Als je ‘95+’ hebt, zet dan ‘95+’ neer.",
    "",
    "3) Mag ik iets leeg laten?",
    "• Ja. Als FightPassport ontbreekt, slaan we de partij alsnog op.",
    "  (We willen juist later kunnen zien wie geen FightPassport heeft.)",
    "",
    "4) Let op met gewicht:",
    "• ‘Max gewicht (kg)’ is voor de hele partij.",
    "• ‘Rood gewicht (kg)’ en ‘Blauw gewicht (kg)’ zijn per vechter.",
    "• Je mag 70,5 typen. (Dus met komma of punt.)",
    "",
    "5) Tips om fouten te voorkomen:",
    "• Kopieer geen extra kolommen erbij.",
    "• Laat ‘v.s.’ of ‘licentie’ of ‘record’ weg in dit template.",
    "  (Die info mag bestaan, maar hoort niet in deze import.)",
    "",
    "Klaar? Dan uploaden 🙂",
  ];

  for (const t of lines) info.addRow([t]);

  info.getRow(1).font = { bold: true, size: 14 };
  info.getRow(1).alignment = { vertical: "middle" };

  const buf = await wb.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="MatchControl_Template.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}