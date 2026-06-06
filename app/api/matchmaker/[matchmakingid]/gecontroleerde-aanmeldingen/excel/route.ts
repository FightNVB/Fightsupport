import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORANGE = "FF4D00";
const DARK = "1F2026";
const SILVER = "E5E7EB";
const WHITE = "FFFFFF";
const BLACK = "111827";
const LOGO_PATH = path.join(process.cwd(), "public", "branding", "fightsupport", "excel-logo.png");

type AnyRow = Record<string, any>;

type Params = {
  params: Promise<{ matchmakingId: string }> | { matchmakingId: string };
};

function txt(v: unknown) {
  return String(v ?? "").trim();
}
function lower(v: unknown) {
  return txt(v).toLowerCase();
}
function pickFirst(...vals: any[]) {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return "";
}
function onlyDigits(v: any) {
  return String(v ?? "").replace(/[^\d]/g, "").trim();
}
function num(v: any) {
  const n = Number(txt(v).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function parseJson(v: any): any {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    const parsed = JSON.parse(String(v));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function deepGet(source: any, pathValue: string) {
  let cur = parseJson(source) ?? source;
  for (const part of pathValue.split(".")) {
    cur = parseJson(cur) ?? cur;
    if (!cur || typeof cur !== "object") return "";
    cur = cur[part];
  }
  return cur;
}
function nameOf(f: AnyRow) {
  return (
    txt(pickFirst(f.naam, f.fp_naam, f.naam_fp, f.naam_input)) ||
    [f.voornaam, f.achternaam].map(txt).filter(Boolean).join(" ") ||
    "Onbekend"
  );
}
function vaOf(f: AnyRow) {
  return onlyDigits(pickFirst(f.va_nummer, f.va, f.fightpaspoort_nummer));
}
function gymOf(f: AnyRow) {
  return txt(
    pickFirst(
      f.gym,
      f.sportschool,
      f.gym_input,
      f.sportschool_input,
      f.fp_gym,
      deepGet(f.extra, "raw.aanmelding.gym"),
      deepGet(f.raw, "aanmelding.gym"),
    ),
  );
}
function disciplineOf(f: AnyRow) {
  return txt(pickFirst(f.discipline, f.discipline_input, f.sport, f.vechtsport));
}
function klasseOf(f: AnyRow) {
  return txt(pickFirst(f.klasse, f.klasse_input, f.fp_klasse, f.nulmeting_klasse));
}
function geslachtOf(f: AnyRow) {
  const g = lower(pickFirst(f.geslacht, f.fp_geslacht, f.gender, f.sexe));
  if (["m", "man", "male", "heer", "heren", "jongen", "jongens"].includes(g)) return "Man";
  if (["v", "vrouw", "female", "dame", "dames", "meisje", "meisjes"].includes(g)) return "Vrouw";
  return txt(pickFirst(f.geslacht, f.fp_geslacht, f.gender, f.sexe));
}
function klasseTabOf(f: AnyRow) {
  const k = lower(klasseOf(f));
  if (k.includes("jeugd") || k === "j" || k.includes("youth")) return "Jeugd";
  if (k.includes("nieuweling") || k === "n" || k.includes("n-klasse") || k.includes("n klasse")) return "N";
  if (k.includes("r-klasse") || k.includes("r klasse") || k === "r") return "R";
  if (k.includes("c-klasse") || k.includes("c klasse") || k === "c") return "C";
  if (k.includes("b-klasse") || k.includes("b klasse") || k === "b") return "B";
  if (k.includes("a-klasse") || k.includes("a klasse") || k === "a") return "A";
  if (k.includes("amateur") || k.includes("ama")) return "MMA AMA";
  if (k.includes("pro")) return "MMA PRO";
  return "Onbekend";
}
function tabKeyOf(f: AnyRow) {
  const k = klasseTabOf(f);
  const g = geslachtOf(f).toLowerCase().includes("vrouw") ? "Vrouw" : geslachtOf(f).toLowerCase().includes("man") ? "Man" : "Onbekend";
  const gender = g === "Vrouw" ? "dame" : g === "Man" ? "heer" : "?";
  const youthGender = g === "Vrouw" ? "dame" : g === "Man" ? "man" : "?";
  if (k === "Jeugd") return `J/${youthGender}`;
  if (k === "MMA AMA") return `Amateur/${gender}`;
  if (k === "MMA PRO") return `Pro/${gender}`;
  if (["R", "N", "C", "B", "A"].includes(k)) return `${k}/${gender === "heer" ? "man" : gender}`;
  return `${k}/${gender}`;
}
function parseDateOnly(v: any): Date | null {
  const value = txt(v);
  if (!value) return null;
  const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12));
  const dmy = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
function ageOf(f: AnyRow, eventDate: any) {
  const direct = num(pickFirst(f.leeftijd, f.age, f.fp_leeftijd));
  if (direct !== null && direct > 0) return Math.round(direct);
  const birth = parseDateOnly(pickFirst(f.geboortedatum, f.geboortedatum_input, f.fp_geboortedatum, f.dob));
  const ref = parseDateOnly(pickFirst(f.evenement_datum, f.event_datum, eventDate)) || new Date();
  if (!birth) return null;
  let age = ref.getUTCFullYear() - birth.getUTCFullYear();
  const m = ref.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
}
function weightOf(f: AnyRow) {
  return num(pickFirst(f.gewicht, f.gewicht_input, f.fp_gewicht, f.gewicht_fp));
}
function recordOf(f: AnyRow) {
  const w = num(pickFirst(f.record_w, f.win, f.wins, f.gewonnen)) ?? 0;
  const l = num(pickFirst(f.record_l, f.loss, f.losses, f.verloren)) ?? 0;
  const d = num(pickFirst(f.record_d, f.draw, f.draws, f.onbeslist)) ?? 0;
  const total = num(pickFirst(f.totaal_wedstrijden, f.totaal_partijen, f.uitslagen_count));
  const other = total !== null ? Math.max(0, total - w - l - d) : num(pickFirst(f.demo, f.overige, f.overige_partijen)) ?? 0;
  return `${w}-${l}-${d} (${other})`;
}
function isAfgemeld(f: AnyRow) {
  const status = lower(pickFirst(f.status, f.aanmelding_status, f.inschrijving_status, deepGet(f.extra, "raw.aanmelding.status")));
  return ["afgemeld", "cancelled", "canceled"].includes(status);
}
function sortFighters(a: AnyRow, b: AnyRow, eventDate: any) {
  const tabOrder = ["J/man", "J/dame", "R/man", "R/dame", "N/man", "N/dame", "C/man", "C/dame", "B/man", "B/dame", "A/man", "A/dame", "Amateur/heer", "Amateur/dame", "Pro/heer", "Pro/dame"];
  const ta = tabOrder.indexOf(tabKeyOf(a));
  const tb = tabOrder.indexOf(tabKeyOf(b));
  if (ta !== tb) return (ta === -1 ? 999 : ta) - (tb === -1 ? 999 : tb);
  const ageDiff = (ageOf(a, eventDate) ?? 999) - (ageOf(b, eventDate) ?? 999);
  if (ageDiff) return ageDiff;
  const weightDiff = (weightOf(a) ?? 9999) - (weightOf(b) ?? 9999);
  if (weightDiff) return weightDiff;
  return nameOf(a).localeCompare(nameOf(b), "nl");
}
function normalizeSheetName(name: string) {
  return name.replace(/[\\/?*\[\]:]/g, "-").slice(0, 31) || "Blad";
}
function filenameSafe(name: string) {
  return name.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}
function trainerOf(f: AnyRow) {
  return txt(pickFirst(
    f.naam_trainer,
    f.trainer,
    f.trainer_naam,
    f.coach,
    f.contactpersoon,
    deepGet(f.extra, "raw.aanmelding.naam_trainer"),
    deepGet(f.extra, "raw.aanmelding.trainer"),
    deepGet(f.extra, "raw.aanmelding.coach"),
    deepGet(f.raw, "aanmelding.naam_trainer"),
    deepGet(f.raw, "aanmelding.trainer"),
  ));
}
function emailOf(f: AnyRow) {
  return txt(pickFirst(f.email, f.emailadres, f.contact_email, deepGet(f.extra, "raw.aanmelding.email"), deepGet(f.raw, "aanmelding.email")));
}
function phoneOf(f: AnyRow) {
  return txt(pickFirst(f.telefoon, f.telefoonnummer, f.phone, f.contact_telefoon, deepGet(f.extra, "raw.aanmelding.telefoon"), deepGet(f.raw, "aanmelding.telefoon")));
}

async function getAllRows(query: any) {
  const pageSize = 1000;
  let from = 0;
  const rows: AnyRow[] = [];
  for (;;) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function mergeRows(contextRows: AnyRow[], aanmeldingen: AnyRow[]) {
  const byId = new Map<string, AnyRow>();
  const byVa = new Map<string, AnyRow>();
  for (const a of aanmeldingen) {
    const id = txt(pickFirst(a.id, a.inschrijving_id, a.aanmelding_id));
    const va = vaOf(a);
    if (id) byId.set(id, a);
    if (va) byVa.set(va, a);
  }
  return contextRows.map((c) => {
    const id = txt(pickFirst(c.inschrijving_id, c.aanmelding_id, c.id));
    const va = vaOf(c);
    const a = (id && byId.get(id)) || (va && byVa.get(va)) || {};
    const extra = parseJson(c.extra) ?? c.extra;
    return { ...a, ...c, extra, __aanmelding: a };
  });
}

function decorateSheet(ws: ExcelJS.Worksheet, workbook: ExcelJS.Workbook, title: string, subtitle: string, logoId?: number) {
  ws.views = [{ state: "frozen", ySplit: 5 }];
  ws.properties.defaultRowHeight = 20;
  ws.getRow(1).height = 42;
  ws.getCell("A1").value = "FightSupport";
  ws.getCell("A1").font = { bold: true, size: 24, color: { argb: ORANGE } };
  ws.getCell("A2").value = title;
  ws.getCell("A2").font = { bold: true, size: 16, color: { argb: WHITE } };
  ws.getCell("A3").value = subtitle;
  ws.getCell("A3").font = { bold: true, size: 11, color: { argb: SILVER } };
  for (let r = 1; r <= 4; r++) {
    ws.getRow(r).fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK } };
  }
  if (logoId) {
    ws.addImage(logoId, { tl: { col: 7.4, row: 0.2 }, ext: { width: 190, height: 55 } });
  }
}
function styleHeader(row: ExcelJS.Row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ORANGE } };
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: BLACK } } };
  });
}
function styleRows(ws: ExcelJS.Worksheet, startRow: number) {
  for (let r = startRow; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const dark = (r - startRow) % 2 === 1;
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: dark ? "2A2C32" : "FFFFFF" } };
      cell.font = { color: { argb: dark ? "FFFFFF" : BLACK } };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = { bottom: { style: "thin", color: { argb: dark ? "3A3D45" : "D1D5DB" } } };
    });
  }
}
function addFighterSheet(workbook: ExcelJS.Workbook, title: string, fighters: AnyRow[], eventDate: any, subtitle: string, logoId?: number) {
  const ws = workbook.addWorksheet(normalizeSheetName(title));
  decorateSheet(ws, workbook, title, subtitle, logoId);
  const columns = [
    { header: "Tab", key: "tab", width: 14 },
    { header: "Naam", key: "naam", width: 28 },
    { header: "Sportschool", key: "gym", width: 28 },
    { header: "VA", key: "va", width: 12 },
    { header: "Discipline", key: "discipline", width: 16 },
    { header: "Klasse", key: "klasse", width: 18 },
    { header: "Geslacht", key: "geslacht", width: 12 },
    { header: "Leeftijd", key: "leeftijd", width: 10 },
    { header: "Gewicht", key: "gewicht", width: 12 },
    { header: "Record", key: "record", width: 12 },
    { header: "Licentie", key: "licentie", width: 12 },
    { header: "Startverbod", key: "startverbod", width: 14 },
    { header: "Keurmerk", key: "keurmerk", width: 12 },
    { header: "Status", key: "status", width: 16 },
  ];
  ws.columns = columns.map(({ key, width }) => ({ key, width }));
  const headerRow = ws.getRow(5);
  headerRow.values = columns.map((c) => c.header);
  styleHeader(headerRow);
  for (const f of fighters) {
    ws.addRow({
      tab: tabKeyOf(f),
      naam: nameOf(f),
      gym: gymOf(f),
      va: vaOf(f),
      discipline: disciplineOf(f),
      klasse: klasseOf(f),
      geslacht: geslachtOf(f),
      leeftijd: ageOf(f, eventDate) ?? "-",
      gewicht: weightOf(f) !== null ? `${weightOf(f)} kg` : "-",
      record: recordOf(f),
      licentie: txt(pickFirst(f.licentie, f.licentie_status)) || "-",
      startverbod: txt(pickFirst(f.heeft_startverbod, f.startverbod)) || "-",
      keurmerk: txt(pickFirst(f.heeft_keurmerk, f.keurmerk)) || "-",
      status: txt(pickFirst(f.status, f.scrape_status)) || "gecontroleerd",
    });
  }
  ws.autoFilter = { from: "A5", to: `N${Math.max(5, ws.rowCount)}` };
  styleRows(ws, 6);
}
function addContactSheet(workbook: ExcelJS.Workbook, fighters: AnyRow[], subtitle: string, logoId?: number) {
  const ws = workbook.addWorksheet("Contact info");
  decorateSheet(ws, workbook, "Contact info", subtitle, logoId);
  const columns = [
    { header: "Naam vechter", key: "naam", width: 30 },
    { header: "Sportschool", key: "gym", width: 30 },
    { header: "Naam trainer", key: "trainer", width: 24 },
    { header: "Telefoon", key: "telefoon", width: 18 },
    { header: "Email", key: "email", width: 34 },
  ];
  ws.columns = columns.map(({ key, width }) => ({ key, width }));
  const headerRow = ws.getRow(5);
  headerRow.values = columns.map((c) => c.header);
  styleHeader(headerRow);
  for (const f of fighters) {
    ws.addRow({ naam: nameOf(f), gym: gymOf(f), trainer: trainerOf(f) || "-", telefoon: phoneOf(f) || "-", email: emailOf(f) || "-" });
  }
  ws.autoFilter = { from: "A5", to: `E${Math.max(5, ws.rowCount)}` };
  styleRows(ws, 6);
}
function addResultsSheet(workbook: ExcelJS.Workbook, rows: AnyRow[], fighters: AnyRow[], subtitle: string, logoId?: number) {
  const ws = workbook.addWorksheet("Meldingen");
  decorateSheet(ws, workbook, "Meldingen", subtitle, logoId);
  const byId = new Map(fighters.map((f) => [txt(pickFirst(f.inschrijving_id, f.id)), f]));
  const byVa = new Map(fighters.map((f) => [vaOf(f), f]));
  const columns = [
    { header: "Resultaat", key: "resultaat", width: 14 },
    { header: "Regel", key: "regel", width: 28 },
    { header: "Naam", key: "naam", width: 28 },
    { header: "VA", key: "va", width: 12 },
    { header: "Sportschool", key: "gym", width: 26 },
    { header: "Melding", key: "melding", width: 70 },
  ];
  ws.columns = columns.map(({ key, width }) => ({ key, width }));
  const headerRow = ws.getRow(5);
  headerRow.values = columns.map((c) => c.header);
  styleHeader(headerRow);
  for (const r of rows) {
    const f = (txt(r.inschrijving_id) && byId.get(txt(r.inschrijving_id))) || (vaOf(r) && byVa.get(vaOf(r))) || {};
    ws.addRow({
      resultaat: txt(r.resultaat || r.severity) || "-",
      regel: txt(r.rule || r.rule_code) || "-",
      naam: txt(r.naam) || nameOf(f),
      va: vaOf(r) || vaOf(f),
      gym: gymOf(f),
      melding: txt(r.boodschap || r.message || r.omschrijving) || "-",
    });
  }
  ws.autoFilter = { from: "A5", to: `F${Math.max(5, ws.rowCount)}` };
  styleRows(ws, 6);
}

export async function GET(req: NextRequest, ctx: Params) {
  try {
    const { matchmakingId } = await ctx.params;
    if (!matchmakingId) return NextResponse.json({ ok: false, error: "matchmakingId ontbreekt" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ ok: false, error: "Supabase env ontbreekt" }, { status: 500 });
    }

    const auth = req.headers.get("authorization") || "";
    const sb = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: auth ? { Authorization: auth } : {} },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (authError || !authData?.user) {
      return NextResponse.json({ ok: false, error: "Niet ingelogd" }, { status: 401 });
    }

    const { data: matchmaking } = await sb
      .from("matchmakings")
      .select("*")
      .eq("id", matchmakingId)
      .maybeSingle();

    const eventName = txt(pickFirst(matchmaking?.evenement_naam, matchmaking?.event_name, matchmaking?.naam, "Gecontroleerde aanmeldingen"));
    const eventDate = pickFirst(matchmaking?.evenement_datum, matchmaking?.event_date, matchmaking?.datum);
    const subtitle = [eventName, eventDate ? `Datum: ${eventDate}` : "", `Export: ${new Date().toLocaleString("nl-NL")}`].filter(Boolean).join(" · ");

    const [contextRows, aanmeldingen] = await Promise.all([
      getAllRows(sb.from("matchmaker_fighter_context").select("*").eq("matchmaking_id", matchmakingId).order("row_nr", { ascending: true })),
      getAllRows(sb.from("matchmaker_inschrijvingen").select("*").eq("matchmaking_id", matchmakingId).order("row_nr", { ascending: true })),
    ]);

    let resultRows: AnyRow[] = [];
    try {
      resultRows = await getAllRows(sb.from("matchmaker_fighter_resultaten").select("*").eq("matchmaking_id", matchmakingId).order("created_at", { ascending: true }));
    } catch {
      resultRows = [];
    }

    const fighters = mergeRows(contextRows, aanmeldingen)
      .filter((f) => !isAfgemeld(f))
      .sort((a, b) => sortFighters(a, b, eventDate));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FightSupport";
    workbook.created = new Date();
    workbook.modified = new Date();

    let logoId: number | undefined;
    if (fs.existsSync(LOGO_PATH)) {
      logoId = workbook.addImage({ filename: LOGO_PATH, extension: "png" });
    }

    addFighterSheet(workbook, "Alle deelnemers", fighters, eventDate, subtitle, logoId);

    const tabOrder = ["J/man", "J/dame", "R/man", "R/dame", "N/man", "N/dame", "C/man", "C/dame", "B/man", "B/dame", "A/man", "A/dame", "Amateur/heer", "Amateur/dame", "Pro/heer", "Pro/dame"];
    const tabNames = Array.from(new Set(fighters.map(tabKeyOf))).sort((a, b) => {
      const ai = tabOrder.indexOf(a);
      const bi = tabOrder.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.localeCompare(b, "nl");
    });
    for (const tab of tabNames) {
      addFighterSheet(workbook, tab, fighters.filter((f) => tabKeyOf(f) === tab), eventDate, subtitle, logoId);
    }

    addContactSheet(workbook, fighters, subtitle, logoId);
    addResultsSheet(workbook, resultRows, fighters, subtitle, logoId);

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `${filenameSafe(eventName || "gecontroleerde-aanmeldingen")}-gecontroleerde-aanmeldingen.xlsx`;

    return new NextResponse(buffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[gecontroleerde-aanmeldingen-excel]", e);
    return NextResponse.json({ ok: false, error: e?.message || "Excel export maken mislukt" }, { status: 500 });
  }
}
