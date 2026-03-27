// app/api/admin/uitslagen/export/route.ts
// Export uitslagen as an Excel file for a ready matchmaking.
// Requires hoofdofficial, admin, superadmin, or dispensatie_admin role.

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAnyRole, supabaseAdmin } from "@/app/api/_utils/authz";
import { assertMatchmakingInState } from "@/lib/workflow/matchmakingValidator";
import { ERRORS } from "@/lib/constants/errors";

export const runtime = "nodejs";

function isUuid(v: any): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(v ?? "").trim()
  );
}

function safe(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

export async function GET(req: Request) {
  try {
    await requireAnyRole(req, ["hoofdofficial", "admin", "superadmin", "dispensatie_admin"]);

    const { searchParams } = new URL(req.url);
    const matchmaking_id = String(searchParams.get("matchmaking_id") ?? "").trim();

    if (!isUuid(matchmaking_id)) {
      return NextResponse.json(
        { error: ERRORS.INVALID_UUID("matchmaking_id") },
        { status: 400 }
      );
    }

    // Matchmaking must be in LINEUP state (all uitslagen in)
    const stateCheck = await assertMatchmakingInState(supabaseAdmin, matchmaking_id, "lineup");
    if (!stateCheck.ok) {
      return NextResponse.json({ error: stateCheck.error }, { status: 422 });
    }

    // Fetch bouts with uitslagen
    const { data: bouts, error: boutsErr } = await supabaseAdmin
      .from("matchmaking_bouts")
      .select(
        "partij_nr, discipline, klasse_mm, rood_naam, rood_va, rood_gym, blauw_naam, blauw_va, blauw_gym, uitslag_rood, winnaar, rood_gewogen_gewicht, blauw_gewogen_gewicht, eindstatus"
      )
      .eq("matchmaking_id", matchmaking_id)
      .order("partij_nr", { ascending: true });

    if (boutsErr) {
      return NextResponse.json({ error: ERRORS.DB_ERROR }, { status: 500 });
    }

    // Build Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FightSupport";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Uitslagen");

    sheet.columns = [
      { header: "Partij", key: "partij_nr", width: 8 },
      { header: "Discipline", key: "discipline", width: 12 },
      { header: "Klasse", key: "klasse_mm", width: 12 },
      { header: "Rood naam", key: "rood_naam", width: 24 },
      { header: "Rood VA", key: "rood_va", width: 14 },
      { header: "Rood gym", key: "rood_gym", width: 20 },
      { header: "Blauw naam", key: "blauw_naam", width: 24 },
      { header: "Blauw VA", key: "blauw_va", width: 14 },
      { header: "Blauw gym", key: "blauw_gym", width: 20 },
      { header: "Gew. rood (kg)", key: "rood_gewogen_gewicht", width: 16 },
      { header: "Gew. blauw (kg)", key: "blauw_gewogen_gewicht", width: 16 },
      { header: "Uitslag", key: "uitslag_rood", width: 30 },
      { header: "Winnaar", key: "winnaar", width: 12 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFF4D00" },
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

    for (const bout of bouts ?? []) {
      sheet.addRow({
        partij_nr: bout.partij_nr ?? "",
        discipline: safe(bout.discipline),
        klasse_mm: safe(bout.klasse_mm),
        rood_naam: safe(bout.rood_naam),
        rood_va: safe(bout.rood_va),
        rood_gym: safe(bout.rood_gym),
        blauw_naam: safe(bout.blauw_naam),
        blauw_va: safe(bout.blauw_va),
        blauw_gym: safe(bout.blauw_gym),
        rood_gewogen_gewicht: bout.rood_gewogen_gewicht ?? "",
        blauw_gewogen_gewicht: bout.blauw_gewogen_gewicht ?? "",
        uitslag_rood: safe(bout.uitslag_rood),
        winnaar: safe(bout.winnaar),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="uitslagen-${matchmaking_id}.xlsx"`,
      },
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e?.message ?? ERRORS.UNKNOWN_ERROR },
      { status: 500 }
    );
  }
}
