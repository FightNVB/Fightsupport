import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import ExcelJS from "exceljs";
import {
  EXCEL_HEADERS,
  EXCEL_DISCIPLINES,
  EXCEL_KLASSES,
  EXCEL_UITSLAGEN,
  mapDisciplineToExcel,
  mapKlasseToExcel,
  assertAllowedExcelValue,
} from "@/lib/uitslagen/excelMapping";

export const runtime = "nodejs";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function normalizeVa(v: unknown): string {
  return String(v ?? "").replace(/[^0-9]/g, "").replace(/^0+/, "");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const matchmaking_id = String(url.searchParams.get("matchmaking_id") ?? "").trim();
    if (!matchmaking_id) return bad("matchmaking_id ontbreekt");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: rows, error } = await admin
      .from("lineup_bouts")
      .select(`
        id,
        partij_nr,
        discipline,
        klasse_mm,
        rood_va,
        rood_naam,
        blauw_va,
        blauw_naam,
        uitslagen_lineup (
          result_label_red,
          finalized
        )
      `)
      .eq("matchmaking_id", matchmaking_id)
      .order("partij_nr", { ascending: true });

    if (error) return bad(error.message, 500);
    if (!rows?.length) return bad("Geen lineup_bouts gevonden.", 404);

    const allFinalized = rows.every((r: any) => r.uitslagen_lineup?.[0]?.finalized === true);
    if (!allFinalized) {
      return bad("Niet alle uitslagen zijn gefinaliseerd.");
    }

    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "FormatImportMatchmakingInclUitslagen.xlsx"
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const ws = workbook.getWorksheet("Excelformat");
    if (!ws) return bad("Sheet 'Excelformat' niet gevonden in template.", 500);

    const headerValues = [
      ws.getCell("A1").value,
      ws.getCell("B1").value,
      ws.getCell("C1").value,
      ws.getCell("D1").value,
      ws.getCell("E1").value,
      ws.getCell("F1").value,
      ws.getCell("G1").value,
      ws.getCell("H1").value,
    ].map((v) => String(v ?? "").trim());

    if (JSON.stringify(headerValues) !== JSON.stringify([...EXCEL_HEADERS])) {
      return bad("Template headers wijken af van verwacht formaat.", 500);
    }

    // oude datarijen leegmaken vanaf rij 2
    if (ws.rowCount > 1) {
      for (let r = ws.rowCount; r >= 2; r -= 1) {
        ws.spliceRows(r, 1);
      }
    }

    rows.forEach((row: any, idx: number) => {
      const result = row.uitslagen_lineup?.[0];
      const discipline = assertAllowedExcelValue(
        mapDisciplineToExcel(row.discipline),
        EXCEL_DISCIPLINES,
        "Discipline"
      );
      const klasse = assertAllowedExcelValue(
        mapKlasseToExcel(row.klasse_mm),
        EXCEL_KLASSES,
        "Klasse"
      );
      const uitslag = assertAllowedExcelValue(
        String(result?.result_label_red ?? "").trim(),
        EXCEL_UITSLAGEN,
        "Uitslag"
      );

      const targetRow = idx + 2;

      ws.getCell(`A${targetRow}`).value = Number(row.partij_nr ?? idx + 1);
      ws.getCell(`B${targetRow}`).value = discipline;
      ws.getCell(`C${targetRow}`).value = klasse;
      ws.getCell(`D${targetRow}`).value = normalizeVa(row.rood_va);
      ws.getCell(`E${targetRow}`).value = String(row.rood_naam ?? "").trim();
      ws.getCell(`F${targetRow}`).value = uitslag;
      ws.getCell(`G${targetRow}`).value = normalizeVa(row.blauw_va);
      ws.getCell(`H${targetRow}`).value = String(row.blauw_naam ?? "").trim();
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `uitslagen-${matchmaking_id}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: any) {
    return bad(e?.message ?? String(e), 500);
  }
}