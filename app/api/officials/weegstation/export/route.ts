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

function excelVa(v: unknown): number | string {
  const value = safe(v);
  if (!value) return "";
  const parsed = Number(value);
  return /^\\d+$/.test(value) && Number.isSafeInteger(parsed) ? parsed : value;
}

function exportDiscipline(source: any, rfp: boolean): string {
  const explicit = safe(source.discipline);
  if (explicit) return explicit;
  if (safe(source.klasse_mm).toUpperCase() === "BOKSEN") return "Boksen";
  // RFP: bevestigd dat alle overige partijen Kickboksen zijn.
  return rfp ? "Kickboksen" : "";
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
    const isRfp = rows.some((row: any) => /(^|\\b)rfp(\\b|$)/i.test(safe(row.evenement_naam)));

    const contextIds = [...new Set(rows.map((row: any) => safe(row.bout_context_id)).filter(Boolean))];
    const licentiePerContext = new Map<string, { rood: unknown; blauw: unknown; keurmerkRood: unknown; keurmerkBlauw: unknown }>();
    if (contextIds.length) {
      const { data: contexts, error: contextError } = await supabaseAdmin
        .from("controle_bout_context")
        .select("id,rood_licentie,blauw_licentie,keurmerk_rood,keurmerk_blauw")
        .in("id", contextIds);
      if (contextError) throw contextError;
      for (const ctx of contexts ?? []) {
        licentiePerContext.set(ctx.id, { rood: ctx.rood_licentie, blauw: ctx.blauw_licentie, keurmerkRood: ctx.keurmerk_rood, keurmerkBlauw: ctx.keurmerk_blauw });
      }
    }
    const { data: licentieMeldingen, error: meldingenError } = await supabaseAdmin
      .from("controle_resultaten")
      .select("partij_nr,rule_code,rule,boodschap")
      .eq("matchmaking_id", matchmakingId);
    if (meldingenError) throw meldingenError;
    const ontbrekendeLicentie = (value: unknown): boolean =>
      ["nee", "false", "0", "ongeldig", "verlopen"].includes(safe(value).toLowerCase());

    const wb = new ExcelJS.Workbook();
    wb.creator = "FightSupport";
    wb.created = new Date();

    // Zelfde horizontale opbouw als de Jury Excel, uitgebreid met weeggegevens.
    const ws = wb.addWorksheet("Weegstation");
    ws.views = [{ showGridLines: false }];
    const columns: Array<{ header: string; key: string; width: number }> = [
      { header: "Nr", key: "nr", width: 7 },
      { header: "Discipline", key: "discipline", width: 18 },
      { header: "Klasse", key: "klasse", width: 14 },
      { header: "Rood", key: "rood", width: 28 },
      { header: "Sportschool rood", key: "roodGym", width: 26 },
      { header: "VA rood", key: "roodVa", width: 12 },
      { header: "Blauw", key: "blauw", width: 28 },
      { header: "Sportschool blauw", key: "blauwGym", width: 26 },
      { header: "VA blauw", key: "blauwVa", width: 12 },
      { header: "Max", key: "max", width: 12 },
      { header: "R.gew.", key: "roodGewogen", width: 12 },
      { header: "B.gew.", key: "blauwGewogen", width: 12 },
      { header: "Verschil", key: "verschil", width: 13 },
      { header: "Status", key: "status", width: 24 },
      { header: "Minpunt", key: "minpunt", width: 23 },
      { header: "Dispensatie", key: "dispensatie", width: 23 },
      { header: "Reden dispensatie", key: "dispensatieReden", width: 36 },
      { header: "Opmerking", key: "opmerking", width: 36 },
    ];
    ws.columns = columns;


    const header = ws.getRow(1);
    header.height = 30;
    header.eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF30343B" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = { bottom: { style: "medium", color: { argb: "FFFF4D00" } } };
    });

    // Hoekkleuren in de kopregel: inclusief de afzonderlijke weeggewichten.
    for (const col of [4, 5, 6, 11]) {
      header.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB4232D" } };
    }
    for (const col of [7, 8, 9, 12]) {
      header.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1766A3" } };
    }

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
        discipline: exportDiscipline(source, isRfp),
        klasse: safe(source.klasse_mm),
        rood: safe(source.rood_naam),
        roodGym: safe(source.rood_gym),
        roodVa: excelVa(source.rood_va),
        blauw: safe(source.blauw_naam),
        blauwGym: safe(source.blauw_gym),
        blauwVa: excelVa(source.blauw_va),
        max: weight(source.max_gewicht),
        roodGewogen: weight(source.rood_gewogen_gewicht),
        blauwGewogen: weight(source.blauw_gewogen_gewicht),
        verschil: difference(source.rood_gewogen_gewicht, source.blauw_gewogen_gewicht),
        minpunt: [minRood > 0 ? `Rood -${minRood}` : "", minBlauw > 0 ? `Blauw -${minBlauw}` : ""].filter(Boolean).join(" | ") || "Nee",
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
          horizontal: [1, 3, 6, 9, 10, 11, 12, 13, 15, 16].includes(col) ? "center" : "left",
          wrapText: true,
        };
        cell.border = { bottom: { style: "hair", color: { argb: "FFD0D0D0" } } };
      });
      const discipline = exportDiscipline(source, isRfp).trim().toLowerCase();
      if (discipline !== "boksen") {
        const ctx = licentiePerContext.get(safe(source.bout_context_id));
        const meldingen = (licentieMeldingen ?? []).filter((m: any) =>
          Number(m.partij_nr) === Number(source.partij_nr) &&
          /licent/i.test([m.rule_code, m.rule, m.boodschap].join(" "))
        );
        const hasMelding = (naam: unknown, type: "licent" | "keurmerk") => meldingen.some((m: any) =>
          [m.rule_code, m.rule, m.boodschap].some((value: unknown) => safe(value).toLowerCase().includes(type)) &&
          safe(naam).length > 0 && safe(m.boodschap).toLowerCase().includes(safe(naam).toLowerCase())
        );
        const mark = (col: number) => {
          row.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE0E0" } };
        };
        // Naam = licentie; sportschool = keurmerk. VA blijft neutraal.
        if (ontbrekendeLicentie(ctx?.rood) || hasMelding(source.rood_naam, "licent")) mark(4);
        if (ontbrekendeLicentie(ctx?.blauw) || hasMelding(source.blauw_naam, "licent")) mark(7);
        if (ctx?.keurmerkRood === false || hasMelding(source.rood_gym, "keurmerk")) mark(5);
        if (ctx?.keurmerkBlauw === false || hasMelding(source.blauw_gym, "keurmerk")) mark(8);
      }
      row.getCell(1).font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFF4D00" } };
      for (const col of [6, 9]) row.getCell(col).numFmt = "0";
      for (const col of [10, 11, 12, 13]) row.getCell(col).numFmt = "0.0";
      if (minRood > 0 || minBlauw > 0) {
        // Eén Minpunt-kolom, maar elke hoek krijgt zijn eigen tekstkleur.
        const parts: Array<{ text: string; font: { name: string; size: number; bold: boolean; color: { argb: string } } }> = [];
        if (minRood > 0) parts.push({
          text: `Rood -${minRood}`,
          font: { name: "Calibri", size: 11, bold: true, color: { argb: "FFB4232D" } },
        });
        if (minRood > 0 && minBlauw > 0) parts.push({
          text: " | ",
          font: { name: "Calibri", size: 11, bold: false, color: { argb: "FF666666" } },
        });
        if (minBlauw > 0) parts.push({
          text: `Blauw -${minBlauw}`,
          font: { name: "Calibri", size: 11, bold: true, color: { argb: "FF1766A3" } },
        });
        row.getCell(15).value = { richText: parts };
      }
      if (source.dispensatie_verleend) {
        row.getCell(16).font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF187B41" } };
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
