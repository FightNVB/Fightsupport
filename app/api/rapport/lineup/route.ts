import path from "path";
import fs from "fs/promises";
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

function hasFilledValue(v: any) {
  return v !== null && v !== undefined && String(v).trim() !== "";
}

function pickFirstFilled(...values: any[]) {
  for (const v of values) {
    if (hasFilledValue(v)) return v;
  }
  return "";
}

function fmtNlDateOnly(v: any) {
  if (!v) return "-";
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;

  return d.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" });
}

function fmtYmdForFilename(v: any) {
  if (!v) return "00000000";
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}${m[2]}${m[3]}`;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "00000000";

  const y = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}${mm}${dd}`;
}

function parseDateOnly(v: any): Date | null {
  if (!v) return null;

  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return new Date(Date.UTC(y, mo, d, 12, 0, 0));
  }

  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
      12,
      0,
      0
    )
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

function calcAgeAtDate(dob: any, refDate: any): string {
  const n = calcAgeAtDateNumber(dob, refDate);
  return n == null ? "" : String(n);
}

function normalizeKlasse(v: any) {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function normalizeVa(v: any) {
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[-–—]/g, "")
    .toUpperCase();
}

function getDobForSide(row: any, side: "rood" | "blauw") {
  return side === "rood"
    ? pickFirstFilled(
        row?.rood_geboortedatum_fp,
        row?.rood_geboortedatum_mm,
        row?.rood_geboortedatum,
        row?.geboortedatum_rood,
        row?.rood_dob,
        row?.red_dob
      )
    : pickFirstFilled(
        row?.blauw_geboortedatum_fp,
        row?.blauw_geboortedatum_mm,
        row?.blauw_geboortedatum,
        row?.geboortedatum_blauw,
        row?.blauw_dob,
        row?.blue_dob
      );
}

function getLeeftijdOpEvenement(row: any, side: "rood" | "blauw", eventDate: any) {
  return calcAgeAtDate(getDobForSide(row, side), eventDate);
}

function getComputedRondetijden(row: any, eventDate: any) {
  const klasse = normalizeKlasse(
    pickFirstFilled(row?.klasse_mm, row?.klasse, row?.class)
  );

  if (!klasse) return "";

  if (klasse.startsWith("A")) return "3 x 3 min";
  if (klasse.startsWith("B")) return "3 x 3 min";
  if (klasse.startsWith("C")) return "3 x 2 min";
  if (klasse.startsWith("N")) return "3 x 1,5 min";
  if (klasse.startsWith("R") || klasse.includes("RECREANT")) return "3 x 1,5 min";

  if (klasse.startsWith("J")) {
    const leeftijdRood = calcAgeAtDateNumber(getDobForSide(row, "rood"), eventDate);
    const leeftijdBlauw = calcAgeAtDateNumber(getDobForSide(row, "blauw"), eventDate);

    if (
      leeftijdRood !== null &&
      leeftijdBlauw !== null &&
      leeftijdRood >= 16 &&
      leeftijdBlauw >= 16
    ) {
      return "3 x 1,5 min";
    }

    return "3 x 1 min";
  }

  return "";
}

function getNaam(row: any, side: "rood" | "blauw") {
  return side === "rood"
    ? safe(
        pickFirstFilled(
          row?.rood_naam_fp,
          row?.rood_naam_gecorrigeerd,
          row?.rood_naam_corrected,
          row?.rood_naam_mm,
          row?.rood_naam,
          row?.naam_rood,
          row?.red_name
        ),
        ""
      )
    : safe(
        pickFirstFilled(
          row?.blauw_naam_fp,
          row?.blauw_naam_gecorrigeerd,
          row?.blauw_naam_corrected,
          row?.blauw_naam_mm,
          row?.blauw_naam,
          row?.naam_blauw,
          row?.blue_name
        ),
        ""
      );
}

function getGym(row: any, side: "rood" | "blauw") {
  return side === "rood"
    ? safe(
        pickFirstFilled(
          row?.rood_gym_fp,
          row?.rood_gym_mm,
          row?.rood_gym,
          row?.sportschool_rood,
          row?.red_gym
        ),
        ""
      )
    : safe(
        pickFirstFilled(
          row?.blauw_gym_fp,
          row?.blauw_gym_mm,
          row?.blauw_gym,
          row?.sportschool_blauw,
          row?.blue_gym
        ),
        ""
      );
}

function getVa(row: any, side: "rood" | "blauw") {
  const raw =
    side === "rood"
      ? pickFirstFilled(
          row?.rood_va_mm,
          row?.rood_va_gecorrigeerd,
          row?.rood_va_corrected,
          row?.rood_va,
          row?.va_rood,
          row?.red_va
        )
      : pickFirstFilled(
          row?.blauw_va_mm,
          row?.blauw_va_gecorrigeerd,
          row?.blauw_va_corrected,
          row?.blauw_va,
          row?.va_blauw,
          row?.blue_va
        );

  return safe(normalizeVa(raw), "");
}

function getKlasse(row: any) {
  return safe(pickFirstFilled(row?.klasse_mm, row?.klasse, row?.class), "");
}

function getDiscipline(row: any) {
  return safe(
    pickFirstFilled(row?.discipline, row?.discipline_mm, row?.sport),
    ""
  );
}

function ensureMerged(ws: ExcelJS.Worksheet, range: string) {
  try {
    (ws as any).unMergeCells?.(range);
  } catch {}
  try {
    ws.mergeCells(range);
  } catch {}
}

function styleMetaCell(
  cell: ExcelJS.Cell,
  opts?: { bold?: boolean; align?: "left" | "center" | "right"; size?: number }
) {
  cell.font = {
    name: "Calibri",
    size: opts?.size ?? 10,
    bold: !!opts?.bold,
    color: { argb: "FF000000" },
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: opts?.align ?? "left",
    wrapText: true,
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFFFF" },
  } as any;
}

function styleHeaderCell(cell: ExcelJS.Cell) {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFF6200" },
  } as any;
  cell.font = {
    name: "Calibri",
    size: 8,
    bold: true,
    color: { argb: "FF000000" },
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
  cell.border = {
    top: { style: "thin", color: { argb: "FF9CA3AF" } },
    left: { style: "thin", color: { argb: "FF9CA3AF" } },
    bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
    right: { style: "thin", color: { argb: "FF9CA3AF" } },
  };
}

function styleDataCell(
  cell: ExcelJS.Cell,
  opts?: { center?: boolean; isWhite?: boolean; fontSize?: number }
) {
  const isWhite = opts?.isWhite ?? true;

  cell.font = {
    name: "Calibri",
    size: opts?.fontSize ?? 7,
    color: { argb: isWhite ? "FF000000" : "FFFFFFFF" },
    bold: false,
  };

  cell.alignment = {
    vertical: "middle",
    horizontal: opts?.center ? "center" : "left",
    wrapText: true,
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: isWhite ? "FFFFFFFF" : "FF2F2F2F" },
  } as any;

  cell.border = {
    top: { style: "thin", color: { argb: "FF9CA3AF" } },
    left: { style: "thin", color: { argb: "FF9CA3AF" } },
    bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
    right: { style: "thin", color: { argb: "FF9CA3AF" } },
  };
}

function styleLineupSheetLayout(ws: ExcelJS.Worksheet) {
  ws.views = [{ state: "normal", showGridLines: true }];

  ws.pageSetup = {
    paperSize: 9, // A4
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: {
      left: 0.2,
      right: 0.2,
      top: 0.25,
      bottom: 0.25,
      header: 0.1,
      footer: 0.1,
    },
    horizontalCentered: true,
    verticalCentered: false,
  };

  ws.headerFooter = {
    differentFirst: false,
    differentOddEven: false,
    oddFooter: "&LLineup&RPagina &P / &N",
  };

  ws.getColumn(1).width = 6;   // partij nr
  ws.getColumn(2).width = 9;   // discipline
  ws.getColumn(3).width = 11;  // klasse
  ws.getColumn(4).width = 20;  // naam rood
  ws.getColumn(5).width = 14;  // gym rood
  ws.getColumn(6).width = 10;  // va rood
  ws.getColumn(7).width = 5;   // leeftijd rood
  ws.getColumn(8).width = 4;   // vs
  ws.getColumn(9).width = 20;  // naam blauw
  ws.getColumn(10).width = 14; // gym blauw
  ws.getColumn(11).width = 10; // va blauw
  ws.getColumn(12).width = 5;  // leeftijd blauw
  ws.getColumn(13).width = 10; // rondetijden

  ws.getRow(1).height = 18;
  ws.getRow(2).height = 15;
  ws.getRow(3).height = 15;
  ws.getRow(4).height = 8;
  ws.getRow(5).height = 16;

  ws.properties.defaultRowHeight = 15;
}

async function addOverviewLogo(wb: ExcelJS.Workbook, ws: ExcelJS.Worksheet) {
  const candidates = [
    path.join(process.cwd(), "public", "branding", "fightsupport", "excel-logo.png"),
    path.join(process.cwd(), "public", "logo_fightsupport.png"),
  ];

  let found: string | null = null;
  for (const p of candidates) {
    try {
      await fs.access(p);
      found = p;
      break;
    } catch {}
  }

  if (!found) return;

  const ext = found.toLowerCase().endsWith(".png")
    ? "png"
    : found.toLowerCase().endsWith(".jpg") || found.toLowerCase().endsWith(".jpeg")
      ? "jpeg"
      : null;

  if (!ext) return;

  const buf = await fs.readFile(found);
  const imageId = wb.addImage({ buffer: buf, extension: ext as any });

  ws.addImage(imageId, {
    tl: { col: 0.2, row: 0.08 },
    ext: { width: 165, height: 58 },
    editAs: "oneCell",
  });
}

function writeLineupHeader(opts: {
  ws: ExcelJS.Worksheet;
  eventName: string;
  eventDate: string;
  bond: string;
  sourceLabel: string;
}) {
  const { ws, eventName, eventDate, bond, sourceLabel } = opts;

  styleLineupSheetLayout(ws);

  ensureMerged(ws, "D1:H1");
  ensureMerged(ws, "D2:E2");
  ensureMerged(ws, "D3:E3");

  ws.getCell("D1").value = "FIGHTSUPPORT LINEUP";
  ws.getCell("D1").font = {
    name: "Calibri",
    size: 12,
    bold: true,
    color: { argb: "FF000000" },
  };
  ws.getCell("D1").alignment = { vertical: "middle", horizontal: "left" };
  ws.getCell("D1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFFFF" },
  } as any;

  ws.getCell("D2").value = "Naam Evenement:";
  styleMetaCell(ws.getCell("D2"), { bold: true, size: 9 });
  ws.getCell("F2").value = eventName && eventName !== "-" ? eventName : "";
  styleMetaCell(ws.getCell("F2"), { size: 9 });

  ws.getCell("D3").value = "Datum / Bond:";
  styleMetaCell(ws.getCell("D3"), { bold: true, size: 9 });
  ws.getCell("F3").value = `${eventDate || ""}${bond ? `  •  ${bond}` : ""}`;
  styleMetaCell(ws.getCell("F3"), { size: 9 });

  ws.getCell("J2").value = "Bron:";
  styleMetaCell(ws.getCell("J2"), { bold: true, size: 9 });
  ws.getCell("K2").value = sourceLabel;
  styleMetaCell(ws.getCell("K2"), { size: 9 });

  const headers = [
    "Partij nr",
    "Discipline",
    "Klasse",
    "Naam atleet (1)",
    "Sportschool (1)",
    "Fightpaspoort nr (1)",
    "Leeftijd",
    "VS",
    "Naam atleet (2)",
    "Sportschool (2)",
    "Fightpaspoort nr (2)",
    "Leeftijd",
    "Rondetijden",
  ];

  for (let c = 1; c <= headers.length; c++) {
    const cell = ws.getCell(5, c);
    cell.value = headers[c - 1];
    styleHeaderCell(cell);
  }

  ws.getRow(5).height = 18;
  ws.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: headers.length },
  };
}

async function getEventMeta(matchmaking_id: string) {
  try {
    const { data: upByMm, error: upByMmErr } = await supabase
      .from("matchmaking_uploads")
      .select(
        "id, event_id, evenement_naam, evenement_datum, matchmaking_id, bondteam, uploaded_at"
      )
      .eq("matchmaking_id", matchmaking_id)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (upByMmErr) throw upByMmErr;

    let up = upByMm;

    if (!up) {
      const { data: upById, error: upByIdErr } = await supabase
        .from("matchmaking_uploads")
        .select(
          "id, event_id, evenement_naam, evenement_datum, matchmaking_id, bondteam, uploaded_at"
        )
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

async function getLineupRows(matchmaking_id: string) {
  const { data: ctxRows, error: ctxErr } = await supabase
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .order("partij_nr", { ascending: true });

  if (ctxErr) throw ctxErr;

  if ((ctxRows ?? []).length > 0) {
    return {
      source: "controle_bout_context",
      rows: ctxRows ?? [],
    };
  }

  const { data: rawRows, error: rawErr } = await supabase
    .from("matchmaking_bouts_raw")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .order("partij_nr", { ascending: true });

  if (rawErr) throw rawErr;

  return {
    source: "matchmaking_bouts_raw",
    rows: rawRows ?? [],
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const matchmaking_id = String(url.searchParams.get("matchmaking_id") ?? "").trim();

    if (!matchmaking_id) {
      return new Response(
        JSON.stringify({ error: "matchmaking_id ontbreekt" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const eventMeta = await getEventMeta(matchmaking_id);
    const { source, rows } = await getLineupRows(matchmaking_id);

    if (!rows.length) {
      return new Response(
        JSON.stringify({ error: "Geen lineup-rijen gevonden voor deze matchmaking_id" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "FightSupport";
    wb.created = new Date();

    const ws = wb.addWorksheet("Lineup");

    const eventName = safe(eventMeta?.naam, "-");
    const eventDate = fmtNlDateOnly(eventMeta?.datum);
    const eventDateRaw = eventMeta?.datum ?? null;
    const bond = safe(eventMeta?.bond, "");
    const sourceLabel =
      source === "controle_bout_context"
        ? "Actuele controle/context"
        : "Matchmaker raw";

    writeLineupHeader({
      ws,
      eventName,
      eventDate,
      bond,
      sourceLabel,
    });

    await addOverviewLogo(wb, ws);

    let outRowNr = 6;

    for (let i = 0; i < rows.length; i++) {
      const p = rows[i];
      const isWhite = i % 2 === 0;
      const row = ws.getRow(outRowNr++);

      row.getCell(1).value = p?.partij_nr ?? null;
      row.getCell(2).value = getDiscipline(p);
      row.getCell(3).value = getKlasse(p);
      row.getCell(4).value = getNaam(p, "rood");
      row.getCell(5).value = getGym(p, "rood");
      row.getCell(6).value = getVa(p, "rood");
      row.getCell(7).value = getLeeftijdOpEvenement(p, "rood", eventDateRaw);
      row.getCell(8).value = "vs";
      row.getCell(9).value = getNaam(p, "blauw");
      row.getCell(10).value = getGym(p, "blauw");
      row.getCell(11).value = getVa(p, "blauw");
      row.getCell(12).value = getLeeftijdOpEvenement(p, "blauw", eventDateRaw);
      row.getCell(13).value = getComputedRondetijden(p, eventDateRaw);

      for (let c = 1; c <= 13; c++) {
        styleDataCell(row.getCell(c), {
          center: c === 1 || c === 7 || c === 8 || c === 12 || c === 13,
          isWhite,
          fontSize: 7,
        });
      }

      row.getCell(8).font = {
        name: "Calibri",
        size: 7,
        bold: true,
        color: { argb: isWhite ? "FF000000" : "FFFFFFFF" },
      };

      row.height = 15;
    }

    ws.eachRow((row, rowNumber) => {
      if (rowNumber >= 6) {
        row.commit();
      }
    });

    const cleanEventName = safe(eventName, "Event")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "_");

    const dateForFile = fmtYmdForFilename(eventMeta?.datum);
    const filename = `FightSupport_Lineup_${cleanEventName}_${dateForFile}.xlsx`;

    const outBuf = await wb.xlsx.writeBuffer();

    return new Response(outBuf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("❌ lineup export error:", e);
    return new Response(
      JSON.stringify({ error: e?.message ?? "Onbekende fout" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}