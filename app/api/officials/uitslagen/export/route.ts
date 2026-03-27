import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireUserFromAuthHeader } from "@/lib/api/requireRole";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fixed uitslag options for FightPassport export – always from rood perspective
const UITSLAG_OPTIONS = [
  "Wint op punten",
  "Verliest op punten",
  "Onbeslist",
  "Wint op KO",
  "Verliest op KO",
  "Wint op Technisch KO",
  "Verliest op Technisch KO",
  "Wint d.m.v. medische interventie",
  "Verliest d.m.v. medische interventie",
  "Wint d.m.v. opgave",
  "Verliest d.m.v. opgave",
  "No contest",
  "Wint d.m.v. submission",
  "Verliest d.m.v. submission",
  "Wint d.m.v. diskwalificatie",
  "Verliest d.m.v. diskwalificatie",
  "Wint d.m.v. RSC",
  "Verliest d.m.v. RSC",
  "Demo",
];

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUserFromAuthHeader(req);

    const body = await req.json().catch(() => ({}));
    const matchmakingId = String(body?.matchmaking_id ?? "").trim();
    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmaking_id is verplicht" }, { status: 400 });
    }

    // Fetch bouts from definitive_matchmaking_bouts (status OK)
    const { data: bouts, error: boutsErr } = await supabaseAdmin
      .from("definitive_matchmaking_bouts")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .in("eindstatus", ["OK", "GOEDGEKEURD_MET_DISPENSATIE"])
      .order("sort_order", { ascending: true })
      .order("partij_nr", { ascending: true });

    if (boutsErr) {
      return NextResponse.json({ error: boutsErr.message }, { status: 500 });
    }

    if (!bouts || bouts.length === 0) {
      return NextResponse.json({ error: "Geen OK partijen gevonden voor export." }, { status: 400 });
    }

    // Fetch uitslagen for these bouts
    const { data: uitslagen } = await supabaseAdmin
      .from("uitslagen_officieel")
      .select("partij_nr, uitslag")
      .eq("matchmaking_id", matchmakingId);

    const uitslagenMap = new Map<number, string>();
    for (const u of uitslagen ?? []) {
      if (u.partij_nr != null) uitslagenMap.set(Number(u.partij_nr), String(u.uitslag ?? ""));
    }

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Uitslagen");

    // Column widths
    sheet.columns = [
      { key: "nr",       width: 8 },
      { key: "disc",     width: 22 },
      { key: "klasse",   width: 22 },
      { key: "va_rood",  width: 18 },
      { key: "naam_rood",width: 28 },
      { key: "uitslag",  width: 45 },
      { key: "va_blauw", width: 18 },
      { key: "naam_blauw", width: 28 },
    ];

    // Header row
    const headerRow = sheet.addRow([
      "Nr.",
      "Discipline*",
      "Klasse*",
      "VANr. (Rood)*",
      "Naam (Rood)",
      "Uitslag (uitkomst van rood hoek)",
      "VANr. (Blauw)*",
      "Naam (Blauw)",
    ]);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2A2A2E" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top:    { style: "thin" },
        left:   { style: "thin" },
        bottom: { style: "thin" },
        right:  { style: "thin" },
      };
    });
    sheet.getRow(1).height = 30;

    // Data rows
    for (const bout of bouts) {
      const partijNr = Number(bout.partij_nr ?? 0);
      const uitslag = uitslagenMap.get(partijNr) ?? "";

      const row = sheet.addRow([
        partijNr,
        String(bout.discipline ?? ""),
        String(bout.klasse_mm ?? ""),
        String(bout.rood_va ?? ""),
        String(bout.rood_naam ?? ""),
        uitslag,
        String(bout.blauw_va ?? ""),
        String(bout.blauw_naam ?? ""),
      ]);

      const rowIndex = row.number;
      const isEven = (rowIndex % 2) === 0;

      row.eachCell((cell) => {
        cell.alignment = { vertical: "middle", wrapText: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isEven ? "FFF5F5F5" : "FFFFFFFF" },
        };
        cell.border = {
          top:    { style: "thin", color: { argb: "FFE0E0E0" } },
          left:   { style: "thin", color: { argb: "FFE0E0E0" } },
          bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
          right:  { style: "thin", color: { argb: "FFE0E0E0" } },
        };
      });
    }

    // Add dropdown validation for the uitslag column
    const lastDataRow = 1 + bouts.length;
    sheet.getCell(`F2`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${UITSLAG_OPTIONS.join(",")}"`],
    };

    // Freeze header row
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    // Log the export
    await supabaseAdmin.from("uitslagen_export_log").insert({
      matchmaking_id: matchmakingId,
      geexporteerd_door: userId,
      bestand_naam: `uitslagen_${matchmakingId}.xlsx`,
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `uitslagen_${matchmakingId}.xlsx`;
    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    console.error("[uitslagen/export]", e);
    return NextResponse.json({ error: e?.message ?? "Export mislukt" }, { status: 500 });
  }
}
