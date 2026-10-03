import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { assertCanAccessMatchmaking, requireUserWithRole, supabaseAdmin } from "@/app/api/_utils/authz";
import { PRIVATE_NO_STORE, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";

function safe(v: unknown, fallback = "") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function num(v: unknown): number | null {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

function weight(v: unknown): number | string {
  const n = num(v);
  return n == null ? "" : n;
}

function difference(red: unknown, blue: unknown): number | string {
  const r = num(red);
  const b = num(blue);
  return r == null || b == null ? "" : Number(Math.abs(r - b).toFixed(2));
}

function penalty(row: any) {
  const red = Number(row?.gewicht_strafpunt_rood ?? 0) === 1;
  const blue = Number(row?.gewicht_strafpunt_blauw ?? 0) === 1;
  if (red && blue) return "Rood + Blauw";
  if (red) return "Rood";
  if (blue) return "Blauw";
  return "Nee";
}

function cleanFilename(v: unknown) {
  return safe(v, "weegstation")
    .replace(/[^a-zA-Z0-9 _-]+/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

export async function GET(req: NextRequest) {
  try {
    const matchmakingId = safe(req.nextUrl.searchParams.get("matchmaking_id"));
    if (!matchmakingId) {
      return new Response(JSON.stringify({ error: "matchmaking_id ontbreekt" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Cache-Control": PRIVATE_NO_STORE },
      });
    }

    const auth = await requireUserWithRole(req, [
      "official",
      "hoofdofficial",
      "admin",
      "superadmin",
      "matchmaker",
    ]);
    await assertCanAccessMatchmaking({
      matchmaking_id: matchmakingId,
      userId: auth.userId,
      role: auth.role,
    });

    const { data, error } = await supabaseAdmin
      .from("weigh_in_bouts")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .order("partij_nr", { ascending: true });

    if (error) throw error;
    const rows = data ?? [];

    const wb = new ExcelJS.Workbook();
    wb.creator = "FightSupport";
    wb.created = new Date();

    const ws = wb.addWorksheet("Weegstation");
    ws.views = [{ state: "frozen", ySplit: 1, showGridLines: true }];
    ws.autoFilter = "A1:K1";
    ws.columns = [
      { header: "Nr", key: "nr", width: 8 },
      { header: "Discipline", key: "discipline", width: 18 },
      { header: "Klasse", key: "klasse", width: 16 },
      { header: "Rood", key: "rood", width: 30 },
      { header: "Blauw", key: "blauw", width: 30 },
      { header: "Max", key: "max", width: 12 },
      { header: "R.gew.", key: "roodGewogen", width: 12 },
      { header: "B.gew.", key: "blauwGewogen", width: 12 },
      { header: "Verschil", key: "verschil", width: 12 },
      { header: "Status", key: "status", width: 22 },
      { header: "Minpunt", key: "minpunt", width: 16 },
    ];

    const header = ws.getRow(1);
    header.height = 28;
    header.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF30343B" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF777777" } },
        left: { style: "thin", color: { argb: "FF777777" } },
        bottom: { style: "thin", color: { argb: "FF777777" } },
        right: { style: "thin", color: { argb: "FF777777" } },
      };
    });

    for (const source of rows as any[]) {
      const row = ws.addRow({
        nr: source.partij_nr ?? "",
        discipline: safe(source.discipline),
        klasse: safe(source.klasse_mm),
        rood: safe(source.rood_naam),
        blauw: safe(source.blauw_naam),
        max: weight(source.max_gewicht),
        roodGewogen: weight(source.rood_gewogen_gewicht),
        blauwGewogen: weight(source.blauw_gewogen_gewicht),
        verschil: difference(source.rood_gewogen_gewicht, source.blauw_gewogen_gewicht),
        status: safe(source.eindstatus || source.praktijk_status || source.reglement_status, "-"),
        minpunt: penalty(source),
      });

      const even = row.number % 2 === 0;
      row.eachCell((cell, col) => {
        cell.font = { name: "Calibri", size: 11, color: { argb: "FF111111" }, bold: col === 1 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: even ? "FFF2F2F2" : "FFFFFFFF" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: [1, 6, 7, 8, 9, 11].includes(col) ? "center" : "left",
          wrapText: true,
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFD0D0D0" } },
          left: { style: "thin", color: { argb: "FFD0D0D0" } },
          bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
          right: { style: "thin", color: { argb: "FFD0D0D0" } },
        };
      });
      row.getCell(1).font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFF4D00" } };
      for (const col of [6, 7, 8, 9]) row.getCell(col).numFmt = "0.0";
      row.height = 24;
    }

    const first = (rows as any[])[0] ?? {};
    const eventName = cleanFilename(first.evenement_naam || "weegstation");
    const eventDate = safe(first.evenement_datum).slice(0, 10).replace(/-/g, "");
    const filename = `FightSupport_Weegstation_${eventName}${eventDate ? "_" + eventDate : ""}.xlsx`;
    const buffer = await wb.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": PRIVATE_NO_STORE,
      },
    });
  } catch (error) {
    console.error("Weegstation Excel export mislukt", error);
    return secureError(error, "Weegstation Excel-export kon niet worden gemaakt.");
  }
}
