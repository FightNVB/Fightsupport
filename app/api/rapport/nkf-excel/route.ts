// app/api/rapport/nkf-excel/route.ts
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function safe(v: any, fallback = "") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function pickFirst(...vals: any[]) {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return "";
}

function onlyDigits(v: any) {
  const s = String(v ?? "").replace(/[^\d]/g, "").trim();
  return s || "";
}

function parseDateOnly(v: any): Date | null {
  if (!v) return null;
  const s = String(v).trim();

  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12, 0, 0));
  }

  const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) {
    return new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12, 0, 0));
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;

  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0)
  );
}

function calcAgeAtDateNumber(dob: any, refDate: any): number | null {
  const birth = parseDateOnly(dob);
  const ref = parseDateOnly(refDate);
  if (!birth || !ref) return null;

  let age = ref.getUTCFullYear() - birth.getUTCFullYear();
  const m = ref.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function formatAge(v: any, dob: any, eventDate: any) {
  const calc = calcAgeAtDateNumber(dob, eventDate);
  if (calc != null) return `${calc} jaar`;

  const raw = safe(v, "");
  if (!raw) return "";
  if (/jaar/i.test(raw)) return raw;

  const n = Number(String(raw).replace(/[^\d.-]/g, ""));
  if (Number.isFinite(n)) return `${Math.round(n)} jaar`;

  return raw;
}

function formatKg(v: any) {
  const raw = safe(v, "");
  if (!raw) return "";

  const n = Number(String(raw).replace(",", ".").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) {
    return /kg/i.test(raw) ? raw : `${raw}kg`;
  }

  if (Number.isInteger(n)) return `${n}kg`;
  return `${String(n).replace(".", ",")}kg`;
}

function formatJaNee(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";

  if (
    s === "ja" ||
    s === "yes" ||
    s === "true" ||
    s === "1" ||
    s === "geldig" ||
    s === "valid"
  ) {
    return "Ja";
  }

  if (
    s === "nee" ||
    s === "no" ||
    s === "false" ||
    s === "0" ||
    s === "ongeldig" ||
    s === "invalid"
  ) {
    return "Nee";
  }

  return "";
}

function fmtYmdForFilename(v: any) {
  if (!v) return "00000000";
  const d = parseDateOnly(v);
  if (!d) return "00000000";

  const y = String(d.getUTCFullYear());
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function getCurrentNaam(ctx: any, side: "rood" | "blauw") {
  return side === "rood"
    ? safe(
        pickFirst(
          ctx?.rood_naam_fp,
          ctx?.rood_naam_gecorrigeerd,
          ctx?.rood_naam_corrected,
          ctx?.rood_naam_mm,
          ctx?.rood_naam
        ),
        ""
      )
    : safe(
        pickFirst(
          ctx?.blauw_naam_fp,
          ctx?.blauw_naam_gecorrigeerd,
          ctx?.blauw_naam_corrected,
          ctx?.blauw_naam_mm,
          ctx?.blauw_naam
        ),
        ""
      );
}

function getCurrentGym(ctx: any, side: "rood" | "blauw") {
  return side === "rood"
    ? safe(pickFirst(ctx?.rood_gym_fp, ctx?.rood_gym_mm, ctx?.rood_gym), "")
    : safe(pickFirst(ctx?.blauw_gym_fp, ctx?.blauw_gym_mm, ctx?.blauw_gym), "");
}

function getVa(ctx: any, side: "rood" | "blauw") {
  const raw =
    side === "rood"
      ? pickFirst(
          ctx?.rood_va_mm,
          ctx?.rood_va_gecorrigeerd,
          ctx?.rood_va_corrected,
          ctx?.va_rood,
          ctx?.rood_va
        )
      : pickFirst(
          ctx?.blauw_va_mm,
          ctx?.blauw_va_gecorrigeerd,
          ctx?.blauw_va_corrected,
          ctx?.va_blauw,
          ctx?.blauw_va
        );

  return onlyDigits(raw);
}

function getDob(ctx: any, side: "rood" | "blauw") {
  return side === "rood"
    ? pickFirst(
        ctx?.rood_geboortedatum_fp,
        ctx?.rood_geboortedatum_mm,
        ctx?.rood_geboortedatum,
        ctx?.geboortedatum_rood,
        ctx?.rood_dob
      )
    : pickFirst(
        ctx?.blauw_geboortedatum_fp,
        ctx?.blauw_geboortedatum_mm,
        ctx?.blauw_geboortedatum,
        ctx?.geboortedatum_blauw,
        ctx?.blauw_dob
      );
}

function getLeeftijd(ctx: any, side: "rood" | "blauw", eventDate: any) {
  const dob = getDob(ctx, side);
  const direct =
    side === "rood"
      ? pickFirst(ctx?.rood_leeftijd, ctx?.leeftijd_rood)
      : pickFirst(ctx?.blauw_leeftijd, ctx?.leeftijd_blauw);

  return formatAge(direct, dob, eventDate);
}

function getGewicht(ctx: any, side: "rood" | "blauw") {
  const raw =
    side === "rood"
      ? pickFirst(ctx?.rood_gewicht_fp, ctx?.rood_gewicht_mm, ctx?.rood_gewicht, ctx?.gewicht_rood)
      : pickFirst(ctx?.blauw_gewicht_fp, ctx?.blauw_gewicht_mm, ctx?.blauw_gewicht, ctx?.gewicht_blauw);

  return formatKg(raw);
}

function getLicentie(ctx: any, side: "rood" | "blauw") {
  const raw =
    side === "rood"
      ? pickFirst(ctx?.rood_licentie, ctx?.rood_fightlicentie, ctx?.licentie_rood)
      : pickFirst(ctx?.blauw_licentie, ctx?.blauw_fightlicentie, ctx?.licentie_blauw);

  return formatJaNee(raw);
}

function getRecordOfErvaring(ctx: any, side: "rood" | "blauw") {
  return side === "rood"
    ? safe(ctx?.rood_totaal_wedstrijden_scrape, "")
    : safe(ctx?.blauw_totaal_wedstrijden_scrape, "");
}

function getKlasse(ctx: any) {
  return safe(pickFirst(ctx?.klasse_mm, ctx?.klasse), "");
}

async function getLatestRun(matchmaking_id: string) {
  const { data, error } = await supabase
    .from("controle_runs")
    .select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type")
    .eq("matchmaking_id", matchmaking_id)
    .order("gestart_op", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

async function getEventMeta(matchmaking_id: string) {
  try {
    const { data: upByMm, error: upByMmErr } = await supabase
      .from("matchmaking_uploads")
      .select("id, event_id, evenement_naam, evenement_datum, matchmaking_id, bondteam, uploaded_at")
      .eq("matchmaking_id", matchmaking_id)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (upByMmErr) throw upByMmErr;

    let up = upByMm;

    if (!up) {
      const { data: upById, error: upByIdErr } = await supabase
        .from("matchmaking_uploads")
        .select("id, event_id, evenement_naam, evenement_datum, matchmaking_id, bondteam, uploaded_at")
        .eq("id", matchmaking_id)
        .limit(1)
        .maybeSingle();

      if (upByIdErr) throw upByIdErr;
      up = upById;
    }

    const uploadEventId = up?.event_id ? String(up.event_id) : null;

    if (uploadEventId) {
      const { data: ev, error: evErr } = await supabase
        .from("events")
        .select("id, naam, datum")
        .eq("id", uploadEventId)
        .maybeSingle();

      if (!evErr && ev) {
        return {
          id: String(ev.id ?? uploadEventId),
          naam: ev.naam ?? up?.evenement_naam ?? null,
          datum: ev.datum ?? up?.evenement_datum ?? null,
          bond: up?.bondteam ?? null,
        };
      }
    }

    const { data: evByMm, error: evByMmErr } = await supabase
      .from("events")
      .select("id, naam, datum")
      .eq("matchmaking_id", matchmaking_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!evByMmErr && evByMm) {
      return {
        id: String(evByMm.id ?? null),
        naam: evByMm.naam ?? up?.evenement_naam ?? null,
        datum: evByMm.datum ?? up?.evenement_datum ?? null,
        bond: up?.bondteam ?? null,
      };
    }

    const { data: evByUpload, error: evByUploadErr } = await supabase
      .from("events")
      .select("id, naam, datum")
      .eq("upload_id", matchmaking_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!evByUploadErr && evByUpload) {
      return {
        id: String(evByUpload.id ?? null),
        naam: evByUpload.naam ?? up?.evenement_naam ?? null,
        datum: evByUpload.datum ?? up?.evenement_datum ?? null,
        bond: up?.bondteam ?? null,
      };
    }

    return {
      id: uploadEventId ?? up?.id ?? null,
      naam: up?.evenement_naam ?? null,
      datum: up?.evenement_datum ?? null,
      bond: up?.bondteam ?? null,
    };
  } catch {
    return { id: null, naam: null, datum: null, bond: null };
  }
}

function borderThin() {
  return {
    top: { style: "thin" as const, color: { argb: "FF000000" } },
    left: { style: "thin" as const, color: { argb: "FF000000" } },
    bottom: { style: "thin" as const, color: { argb: "FF000000" } },
    right: { style: "thin" as const, color: { argb: "FF000000" } },
  };
}

function applySheetLayout(ws: ExcelJS.Worksheet) {
  ws.views = [{ state: "normal", showGridLines: true }];

  ws.getColumn(1).width = 5;   // Nr
  ws.getColumn(2).width = 10;  // rood va
  ws.getColumn(3).width = 28;  // rood naam
  ws.getColumn(4).width = 14;  // rood licentie
  ws.getColumn(5).width = 22;  // rood gym
  ws.getColumn(6).width = 10;  // rood FR
  ws.getColumn(7).width = 10;  // rood gewicht
  ws.getColumn(8).width = 10;  // rood leeftijd
  ws.getColumn(9).width = 8;   // VS
  ws.getColumn(10).width = 10; // blauw va
  ws.getColumn(11).width = 28; // blauw naam
  ws.getColumn(12).width = 14; // blauw licentie
  ws.getColumn(13).width = 24; // blauw gym
  ws.getColumn(14).width = 10; // blauw FR
  ws.getColumn(15).width = 10; // blauw leeftijd
  ws.getColumn(16).width = 10; // blauw gewicht
  ws.getColumn(17).width = 14; // klasse

  ws.getRow(1).height = 22;
}

function styleHeaderRow(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  for (let c = 1; c <= 17; c++) {
    const cell = row.getCell(c);
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } } as any;
    cell.border = borderThin();
  }
  row.commit();
}

function styleDataRow(row: ExcelJS.Row) {
  for (let c = 1; c <= 17; c++) {
    const cell = row.getCell(c);
    cell.font = { name: "Calibri", size: 11, color: { argb: "FF000000" } };
    cell.alignment = {
      vertical: "middle",
      horizontal:
        c === 1 || c === 2 || c === 6 || c === 7 || c === 8 || c === 9 || c === 10 || c === 14 || c === 15 || c === 16
          ? "center"
          : "left",
      wrapText: true,
    };
    cell.border = borderThin();
  }

  row.getCell(9).font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
  row.getCell(9).alignment = { vertical: "middle", horizontal: "center" };
  row.height = 21;
  row.commit();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const matchmaking_id = String(url.searchParams.get("matchmaking_id") ?? "").trim();

    if (!matchmaking_id) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    }

    const run = await getLatestRun(matchmaking_id);
    if (!run?.id) {
      return NextResponse.json({ error: "Geen controle_run gevonden voor deze matchmaking_id" }, { status: 400 });
    }

    const eventMeta = await getEventMeta(matchmaking_id);

    const { data: ctxRows, error: ctxErr } = await supabase
      .from("controle_bout_context")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", run.id)
      .order("partij_nr", { ascending: true });

    if (ctxErr) throw ctxErr;

    const ctxList = (ctxRows ?? []) as any[];
    if (!ctxList.length) {
      return NextResponse.json(
        { error: "Geen controle_bout_context gevonden voor deze matchmaking_id" },
        { status: 400 }
      );
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "FightSupport";
    wb.created = new Date();

    const ws = wb.addWorksheet("NKF");
    applySheetLayout(ws);

    ws.getCell("A1").value = "Nr.";
    ws.getCell("B1").value = "-nr";
    ws.getCell("C1").value = "Naam";
    ws.getCell("D1").value = "Fightlicentie";
    ws.getCell("E1").value = "Gym:";
    ws.getCell("F1").value = "FR/record";
    ws.getCell("G1").value = "Gewicht";
    ws.getCell("H1").value = "Lftd";
    ws.getCell("I1").value = "";
    ws.getCell("J1").value = "-nr";
    ws.getCell("K1").value = "Naam";
    ws.getCell("L1").value = "Fightlicentie";
    ws.getCell("M1").value = "Gym:";
    ws.getCell("N1").value = "FR";
    ws.getCell("O1").value = "Lftd";
    ws.getCell("P1").value = "Gewicht";
    ws.getCell("Q1").value = "Klasse";

    styleHeaderRow(ws);

    const eventDateRaw = eventMeta?.datum ?? null;

    let outRowNr = 2;

    for (const p of ctxList) {
      const row = ws.getRow(outRowNr++);

      row.getCell(1).value = p.partij_nr ?? outRowNr - 2;

      row.getCell(2).value = getVa(p, "rood");
      row.getCell(3).value = getCurrentNaam(p, "rood");
      row.getCell(4).value = getLicentie(p, "rood");
      row.getCell(5).value = getCurrentGym(p, "rood");
      row.getCell(6).value = getRecordOfErvaring(p, "rood");
      row.getCell(7).value = getGewicht(p, "rood");
      row.getCell(8).value = getLeeftijd(p, "rood", eventDateRaw);

      row.getCell(9).value = "VS";

      row.getCell(10).value = getVa(p, "blauw");
      row.getCell(11).value = getCurrentNaam(p, "blauw");
      row.getCell(12).value = getLicentie(p, "blauw");
      row.getCell(13).value = getCurrentGym(p, "blauw");
      row.getCell(14).value = getRecordOfErvaring(p, "blauw");
      row.getCell(15).value = getLeeftijd(p, "blauw", eventDateRaw);
      row.getCell(16).value = getGewicht(p, "blauw");
      row.getCell(17).value = getKlasse(p);

      styleDataRow(row);
    }

    const cleanEventName = safe(eventMeta?.naam, "NKF_Matchmaking")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "_");

    const dateForFile = fmtYmdForFilename(eventMeta?.datum);
    const filename = `NKF_${cleanEventName}_${dateForFile}.xlsx`;

    const outBuf = await wb.xlsx.writeBuffer();

    return new Response(outBuf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("❌ nkf excel export error:", e);
    return NextResponse.json({ error: e?.message ?? "Onbekende fout" }, { status: 500 });
  }
}