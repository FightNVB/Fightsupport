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

    // Zelfde horizontale opbouw als de Jury Excel, uitgebreid met weeggegevens.
    const ws = wb.addWorksheet("Weegstation");
    ws.views = [{ state: "frozen", ySplit: 1, xSplit: 1, showGridLines: false }];
    const columns: Array<{ header: string; key: string; width: number }> = [
      { header: "Nr", key: "nr", width: 7 },
      { header: "Discipline", key: "discipline", width: 18 },
      { header: "Klasse", key: "klasse", width: 13 },
      { header: "Rood", key: "rood", width: 27 },
      { header: "Sportschool rood", key: "roodGym", width: 25 },
      { header: "VA rood", key: "roodVa", width: 12 },
      { header: "VS", key: "vs", width: 6 },
      { header: "Blauw", key: "blauw", width: 27 },
      { header: "Sportschool blauw", key: "blauwGym", width: 25 },
      { header: "VA blauw", key: "blauwVa", width: 12 },
      { header: "Max kg", key: "max", width: 12 },
      { header: "Rood kg", key: "roodGewogen", width: 12 },
      { header: "Blauw kg", key: "blauwGewogen", width: 12 },
      { header: "Verschil kg", key: "verschil", width: 13 },
      { header: "Minpunt rood", key: "minpuntRood", width: 15 },
      { header: "Minpunt blauw", key: "minpuntBlauw", width: 15 },
      { header: "Dispensatie", key: "dispensatie", width: 22 },
      { header: "Reden dispensatie", key: "dispensatieReden", width: 38 },
      { header: "Status", key: "status", width: 23 },
      { header: "Opmerking", key: "opmerking", width: 38 },
    ];
    ws.columns = columns;
    ws.autoFilter = { from: "A1", to: "T1" };

    const header = ws.getRow(1);
    header.height = 30;
    header.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF30343B" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = { bottom: { style: "medium", color: { argb: "FFFF4D00" } } };
    });

    for (const source of rows as any[]) {
      const minRood = Number(source.gewicht_strafpunt_rood ?? 0);
      const minBlauw = Number(source.gewicht_strafpunt_blauw ?? 0);
      const reden = safe(source.dispensatie_reason);
      const dispStatus = source.dispensatie_verleend
        ? "VERLEEND"
        : source.dispensatie_nodig
          ? "NODIG / NIET VERLEEND"
          : reden.toUpperCase() === "AFGEKEURD"
            ? "AFGEKEURD"
            : "Geen";
      const row = ws.addRow({
        nr: source.partij_nr ?? "",
        discipline: safe(source.discipline, String(source.klasse_mm ?? "").trim().toUpperCase() === "BOKSEN" ? "Boksen" : ""),
        klasse: safe(source.klasse_mm),
        rood: safe(source.rood_naam),
        roodGym: safe(source.rood_gym),
        roodVa: safe(source.rood_va),
        vs: "VS",
        blauw: safe(source.blauw_naam),
        blauwGym: safe(source.blauw_gym),
        blauwVa: safe(source.blauw_va),
        max: weight(source.max_gewicht),
        roodGewogen: weight(source.rood_gewogen_gewicht),
        blauwGewogen: weight(source.blauw_gewogen_gewicht),
        verschil: difference(source.rood_gewogen_gewicht, source.blauw_gewogen_gewicht),
        minpuntRood: minRood > 0 ? -minRood : 0,
        minpuntBlauw: minBlauw > 0 ? -minBlauw : 0,
        dispensatie: dispStatus,
        dispensatieReden: reden,
        status: safe(source.eindstatus || source.praktijk_status || source.reglement_status, "-"),
        opmerking: safe(source.weging_notitie),
      });

      const even = row.number % 2 === 0;
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.font = { name: "Calibri", size: 11, color: { argb: "FF222222" }, bold: col === 1 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: even ? "FFF0F0F0" : "FFFFFFFF" } };
        cell.alignment = {
          vertical: "middle",
          horizontal: [1, 3, 6, 7, 10, 11, 12, 13, 14, 15, 16, 17].includes(col) ? "center" : "left",
          wrapText: true,
        };
        cell.border = { bottom: { style: "hair", color: { argb: "FFD0D0D0" } } };
      });
      row.getCell(1).font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFF4D00" } };
      for (const col of [11, 12, 13, 14]) row.getCell(col).numFmt = "0.0";
      for (const col of [15, 16]) {
        row.getCell(col).numFmt = "0";
        if (Number(row.getCell(col).value) < 0) {
          row.getCell(col).font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFC22A19" } };
        }
      }
      if (source.dispensatie_verleend) {
        row.getCell(17).font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF187B41" } };
      }
      row.height = 30;
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
