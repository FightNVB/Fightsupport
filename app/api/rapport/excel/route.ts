// app/api/rapport/excel/route.ts
import { NextResponse } from "next/server";
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

type ResultRow = {
  partij_nr: number | null;
  rule: string | null;
  rule_code: string | null;
  resultaat: string | null;
  boodschap: string | null;
  aantekeningen: string | null;
  created_at: string | null;
  review_status?: string | null;
  hoek?: "rood" | "blauw" | null;
};

type PartijStatus = "OK" | "AFKEUR" | "DISPENSATIE" | "ACTIE";

function safe(v: any, fallback = "") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}
function normCode(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function isApprovedOrClosed(review_status: any) {
  if (review_status == null) return false;
  const s = String(review_status).trim().toLowerCase();
  return (
    s === "approved" ||
    s === "approve" ||
    s === "ok" ||
    s === "goed" ||
    s === "goedgekeurd" ||
    s === "akkoord" ||
    s === "accepted" ||
    s === "yes" ||
    s === "done" ||
    s === "closed" ||
    s === "afgehandeld" ||
    s === "resolved" ||
    s === "complete" ||
    s === "completed"
  );
}

function isRejectedOrDeclined(review_status: any) {
  if (review_status == null) return false;
  const s = String(review_status).trim().toLowerCase();
  return (
    s === "rejected" ||
    s === "reject" ||
    s === "afkeur" ||
    s === "afgekeurd" ||
    s === "afgewezen" ||
    s === "declined" ||
    s === "denied" ||
    s === "refused" ||
    s === "geweigerd" ||
    s === "no" ||
    s === "nee"
  );
}

function dispensatieStatusLabel(r: ResultRow) {
  const rs = (r as any)?.review_status;
  if (isRejectedOrDeclined(rs)) return "AFGEKEURD";
  if (isApprovedOrClosed(rs)) return "GOEDGEKEURD";
  return "OPEN";
}

/** Naam mismatch nooit tonen (behalve VA gewijzigd) */
function isNameMismatch(r: ResultRow) {
  const c = normCode(r.rule_code);
  return c.startsWith("VECHTER_NAAM_MISMATCH") || c.startsWith("VECHTER_NAAM_ANDERS");
}

/** VA gewijzigd */
function isFightpaspoortGewijzigd(r: ResultRow) {
  const c = normCode(r.rule_code);
  if (c.startsWith("VA_NUMMER_AANGEPAST")) return true;

  const rr = String(r.rule ?? "").toLowerCase();
  const bb = String(r.boodschap ?? "").toLowerCase();
  return rr.includes("fightpaspoort nummer gewijzigd") || bb.includes("fightpaspoort nummer gewijzigd");
}

function statusFromResultaat(resultaat: any): PartijStatus {
  const s = String(resultaat ?? "").trim().toLowerCase();
  if (s === "afkeur" || s === "afgekeurd" || s === "reject" || s === "rejected") return "AFKEUR";
  if (s === "dispensatie") return "DISPENSATIE";
  if (s === "actie") return "ACTIE";
  return "OK";
}
function statusPrio(s: PartijStatus) {
  return s === "AFKEUR" ? 1 : s === "DISPENSATIE" ? 2 : s === "ACTIE" ? 3 : 9;
}
function partyStatusVoorMeldingen(meldingen: ResultRow[]): PartijStatus {
  if (!meldingen?.length) return "OK";
  let best: PartijStatus = "OK";
  let bestP = 999;
  for (const m of meldingen) {
    const st = statusFromResultaat(m.resultaat);
    const p = statusPrio(st);
    if (p < bestP) {
      bestP = p;
      best = st;
    }
  }
  return best;
}

function isDispensatieMelding(m: ResultRow) {
  const res = String(m.resultaat ?? "").trim().toLowerCase();
  if (res === "dispensatie") return true;
  const c = normCode(m.rule_code ?? m.rule);
  if (c.includes("DISPENSATIE")) return true;
  if (c.includes("KLASSE") && c.includes("VERSCHIL")) return true;
  return false;
}
function hasDispensatie(meldingen: ResultRow[]) {
  return (meldingen ?? []).some(isDispensatieMelding);
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

function fmtDateTime(v: any) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" });
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

/**
 * ✅ Eventmeta (FightSupport):
 * 1) matchmaking_uploads.event_id -> events.id (naam, datum)
 * 2) fallback: events.matchmaking_id == matchmaking_id
 * 3) fallback: events.upload_id == matchmaking_id
 * 4) fallback: matchmaking_uploads.(evenement_naam/evenement_datum)
 */
async function getEventMeta(matchmaking_id: string) {
  try {
    const { data: up, error: upErr } = await supabase
      .from("matchmaking_uploads")
      .select("event_id, evenement_naam, evenement_datum, matchmaking_id")
      .or(`id.eq.${matchmaking_id},matchmaking_id.eq.${matchmaking_id}`)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (upErr) throw upErr;

    const uploadEventId = (up as any)?.event_id ? String((up as any).event_id) : null;

    if (uploadEventId) {
      const { data: ev, error: evErr } = await supabase
        .from("events")
        .select("id, naam, datum")
        .eq("id", uploadEventId)
        .maybeSingle();

      if (!evErr && ev) {
        return {
          id: String((ev as any)?.id ?? uploadEventId),
          naam: (ev as any)?.naam ?? null,
          datum: (ev as any)?.datum ?? null,
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
        id: String((evByMm as any)?.id ?? null),
        naam: (evByMm as any)?.naam ?? null,
        datum: (evByMm as any)?.datum ?? null,
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
        id: String((evByUpload as any)?.id ?? null),
        naam: (evByUpload as any)?.naam ?? null,
        datum: (evByUpload as any)?.datum ?? null,
      };
    }

    return {
      id: uploadEventId ?? null,
      naam: (up as any)?.evenement_naam ?? null,
      datum: (up as any)?.evenement_datum ?? null,
    };
  } catch {
    return { id: null, naam: null, datum: null };
  }
}

/** ✅ Excel kolomnummer -> Excel kolomletters (1=>A, 26=>Z, 27=>AA, ...) */
function colToName(n: number) {
  let num = Math.max(1, Math.floor(n));
  let s = "";
  while (num > 0) {
    const mod = (num - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

/** ✅ merge helper: unmerge eerst als al gemerged (voorkomt "Cannot merge already merged cells") */
function ensureMerged(ws: ExcelJS.Worksheet, range: string) {
  try {
    (ws as any).unMergeCells?.(range);
  } catch {}
  try {
    ws.mergeCells(range);
  } catch {}
}

function styleRowFillAndFont(row: ExcelJS.Row, isWhite: boolean) {
  const fill = isWhite
    ? { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFFFFF" } }
    : { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF2F2F2F" } };

  const font = isWhite ? { color: { argb: "FF000000" } } : { color: { argb: "FFFFFFFF" } };

  row.eachCell((cell) => {
    cell.fill = fill as any;
    cell.font = { ...(cell.font ?? {}), ...(font as any) };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF9CA3AF" } },
      left: { style: "thin", color: { argb: "FF9CA3AF" } },
      bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
      right: { style: "thin", color: { argb: "FF9CA3AF" } },
    };
  });
}

function writeHeaderBlock(opts: {
  ws: ExcelJS.Worksheet;
  title: string;
  eventName: string;
  eventDate: string;
  runStart: string;
  runEnd: string;
  runId: string;
  matchmakingId: string;
  colCount: number;
  logoSpace?: boolean;
}) {
  const { ws, title, eventName, eventDate, runStart, runEnd, runId, matchmakingId, colCount, logoSpace } = opts;

  const endCol = Math.max(1, colCount);
  const endColLetter = colToName(endCol);

  if (endCol <= 3) {
    ensureMerged(ws, `A1:${endColLetter}1`);
    ensureMerged(ws, `A2:${endColLetter}2`);
    ensureMerged(ws, `A3:${endColLetter}3`);

    ws.getCell("A1").value = title;
    ws.getCell("A2").value = `Evenement: ${eventName}  •  Datum: ${eventDate}`;
    ws.getCell("A3").value = `Controle: ${runStart} → ${runEnd}  •  Run: ${runId}  •  Matchmaking: ${matchmakingId}`;

    ws.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF0D0D0D" } };
    ws.getCell("A2").font = { bold: true, size: 11, color: { argb: "FF0D0D0D" } };
    ws.getCell("A3").font = { size: 10, color: { argb: "FF0D0D0D" } };

    ws.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
    ws.getCell("A2").alignment = { vertical: "middle", horizontal: "left" };
    ws.getCell("A3").alignment = { vertical: "middle", horizontal: "left" };
  } else {
    if (logoSpace) {
      ensureMerged(ws, "A1:C3");
      const a1 = ws.getCell("A1");
      a1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } } as any;
      a1.border = {
        top: { style: "thin", color: { argb: "FF9CA3AF" } },
        left: { style: "thin", color: { argb: "FF9CA3AF" } },
        bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
        right: { style: "thin", color: { argb: "FF9CA3AF" } },
      } as any;
      a1.alignment = { vertical: "middle", horizontal: "center" } as any;
      a1.value = {
        richText: [
          { text: "FIGHT", font: { bold: true, size: 18, color: { argb: "FF111827" } } },
          { text: "SUPPORT", font: { bold: true, size: 18, color: { argb: "FFFF6200" } } },
        ],
      } as any;
    }

    ensureMerged(ws, `D1:${endColLetter}1`);
    ensureMerged(ws, `D2:${endColLetter}2`);
    ensureMerged(ws, `D3:${endColLetter}3`);

    ws.getCell("D1").value = title;
    ws.getCell("D2").value = `Evenement: ${eventName}  •  Datum: ${eventDate}`;
    ws.getCell("D3").value = `Controle: ${runStart} → ${runEnd}  •  Run: ${runId}  •  Matchmaking: ${matchmakingId}`;

    ws.getCell("D1").font = { bold: true, size: 16, color: { argb: "FF0D0D0D" } };
    ws.getCell("D2").font = { bold: true, size: 11, color: { argb: "FF0D0D0D" } };
    ws.getCell("D3").font = { size: 10, color: { argb: "FF0D0D0D" } };

    ws.getCell("D1").alignment = { vertical: "middle", horizontal: "left" };
    ws.getCell("D2").alignment = { vertical: "middle", horizontal: "left" };
    ws.getCell("D3").alignment = { vertical: "middle", horizontal: "left" };
  }

  for (let rr = 1; rr <= 3; rr++) {
    const row = ws.getRow(rr);
    for (let c = 1; c <= endCol; c++) {
      const cell = ws.getCell(rr, c);
      if (!cell.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } } as any;
      cell.border =
        cell.border ??
        ({
          top: { style: "thin", color: { argb: "FF9CA3AF" } },
          left: { style: "thin", color: { argb: "FF9CA3AF" } },
          bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
          right: { style: "thin", color: { argb: "FF9CA3AF" } },
        } as any);
    }
  }

  ws.getRow(1).height = 22;
  ws.getRow(2).height = 18;
  ws.getRow(3).height = 18;
}

function styleHeaderRow(ws: ExcelJS.Worksheet, headerRowNumber: number, colCount: number) {
  const headerRow = ws.getRow(headerRowNumber);
  headerRow.height = 20;

  for (let c = 1; c <= colCount; c++) {
    const cell = ws.getCell(headerRowNumber, c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF6200" } };
    cell.font = { bold: true, color: { argb: "FF000000" } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF9CA3AF" } },
      left: { style: "thin", color: { argb: "FF9CA3AF" } },
      bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
      right: { style: "thin", color: { argb: "FF9CA3AF" } },
    };
  }
}

function isLicentieOk(v: any): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return false;
  return s === "ja" || s === "yes" || s === "true" || s === "1" || s === "geldig";
}
function keurmerkIsProbleem(v: any) {
  return v === false || v == null;
}

async function addLogoToSheet(wb: ExcelJS.Workbook, ws: ExcelJS.Worksheet) {
  const candidates = [
    // FightSupport branding (voorkeur)
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

  if (!found) {
    console.warn("⚠️ Logo niet gevonden. Gezocht in:", candidates);
    return;
  }

  const ext = found.toLowerCase().endsWith(".png")
    ? "png"
    : found.toLowerCase().endsWith(".jpg") || found.toLowerCase().endsWith(".jpeg")
      ? "jpeg"
      : null;

  if (!ext) {
    console.warn("⚠️ Logo heeft onbekende extensie:", found);
    return;
  }

  try {
    const buf = await fs.readFile(found);
    const imageId = wb.addImage({ buffer: buf, extension: ext as any });
    ws.addImage(imageId, {
      tl: { col: 0.05, row: 0.15 },
      ext: { width: 200, height: 70 },
    });
    console.log("✅ Logo toegevoegd vanuit:", found);
  } catch (e) {
    console.error("❌ Logo kon niet worden toegevoegd:", found, e);
  }
}

/** Hoek infereren als hij ontbreekt */
function inferHoek(r: ResultRow): "rood" | "blauw" | null {
  if (r.hoek === "rood" || r.hoek === "blauw") return r.hoek;
  const c = normCode(r.rule_code ?? r.rule);
  if (c.includes("_ROOD")) return "rood";
  if (c.includes("_BLAUW")) return "blauw";
  return null;
}

/** Verbod detectie (nieuwe flow) */
function isVerbodMelding(r: ResultRow) {
  const c = normCode(r.rule_code ?? r.rule);
  if (c.startsWith("VERBOD_")) return true;
  if (c.startsWith("VERBODZONDER") || c.startsWith("VERBOD_ZONDER")) return true;
  const rr = String(r.rule ?? "").toUpperCase();
  const bb = String(r.boodschap ?? "").toUpperCase();
  return rr.includes("VERBOD") || bb.includes("VERBOD");
}

/** Licentie meldingen (op basis van rules, niet ctx) */
function isLicentieMelding(r: ResultRow) {
  const c = normCode(r.rule_code ?? r.rule);
  const isL = c.startsWith("LICENTIE_") || c.includes("LICENTIE");
  if (!isL) return false;
  return statusFromResultaat(r.resultaat) === "AFKEUR";
}

/** Keurmerk meldingen (op basis van rules, niet ctx) — alleen AFKEUR op dit tabblad */
function isKeurmerkMelding(r: ResultRow) {
  const rule = (r.rule_code ?? "").toUpperCase();
  const status = (r.resultaat ?? "").toUpperCase();

  if (!rule.includes("KEURMERK")) return false;

  return status === "AFKEUR" || status === "ACTIE";
}

/** Startverbod meldingen (op basis van rules) */
function isStartverbodMelding(r: ResultRow) {
  const c = normCode(r.rule_code ?? r.rule);
  return c.includes("STARTVERBOD");
}

/** Geen VA meldingen (op basis van rules) */
function isGeenVaMelding(r: ResultRow) {
  const c = normCode(r.rule_code ?? r.rule);
  return c.startsWith("VA_ONTBREEKT") || c.includes("VA_ONTBREEKT");
}

/**
 * ✅ VA helper:
 * - prev (MM fout/oude): *_va_mm_prev
 * - current (huidig): *_va_mm → va_* → *_va
 */
function getVaInfo(ctx: any, side: "rood" | "blauw") {
  if (!ctx) return { prev: "", current: "", changed: false };

  // Let op: we gebruiken een sentinel "-" als iemand een lege VA invult.
  // Daarmee kunnen we "leeg → ingevuld" herkennen zonder dat alle partijen als gewijzigd tellen.
  const prevRaw =
    side === "rood" ? (ctx?.rood_va_mm_prev ?? null) : (ctx?.blauw_va_mm_prev ?? null);

  const current =
    side === "rood"
      ? safe(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.rood_va, "")
      : safe(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.blauw_va, "");

  // changed ONLY if prevRaw is explicitly set by our API:
  // - "-"  => was leeg en is nu ingevuld
  // - "123" => was 123 en is nu iets anders
  const prevRawStr = prevRaw === null || prevRaw === undefined ? null : String(prevRaw);
  const changed =
    prevRawStr === "-" ? !!current : (prevRawStr ? (!!current && prevRawStr !== current) : false);

  const prev = prevRawStr === "-" ? "" : safe(prevRawStr, "");

  return { prev, current, changed };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const matchmaking_id = String(url.searchParams.get("matchmaking_id") ?? "").trim();
    if (!matchmaking_id) return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });

    const run = await getLatestRun(matchmaking_id);
    if (!run?.id) return NextResponse.json({ error: "Geen controle_run gevonden voor deze matchmaking_id" }, { status: 400 });

    const eventMeta = await getEventMeta(matchmaking_id);

    const { data: ctxRows, error: ctxErr } = await supabase
      .from("controle_bout_context")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", run.id)
      .order("partij_nr", { ascending: true });
    if (ctxErr) throw ctxErr;

    const { data: resRows, error: resErr } = await supabase
      .from("controle_resultaten")
      .select("partij_nr, rule, rule_code, resultaat, boodschap, aantekeningen, created_at, review_status, hoek")
      .eq("controle_run_id", run.id);
    if (resErr) throw resErr;

    const resultaten = (resRows ?? []) as ResultRow[];

    const openMeldingen = resultaten.filter((r) => {
      if (isApprovedOrClosed((r as any).review_status)) return false;
      if (isNameMismatch(r) && !isFightpaspoortGewijzigd(r)) return false;
      return true;
    });

    const alleDispensaties = resultaten
      .filter((r) => {
        if (isNameMismatch(r) && !isFightpaspoortGewijzigd(r)) return false;
        return true;
      })
      .filter(isDispensatieMelding);

    const meldingenVoorTab = openMeldingen.filter((r) => !isDispensatieMelding(r));

    const meldByPartij = new Map<number, ResultRow[]>();
    for (const r of openMeldingen) {
      const pn = Number(r.partij_nr);
      if (!Number.isFinite(pn)) continue;
      const arr = meldByPartij.get(pn) ?? [];
      arr.push(r);
      meldByPartij.set(pn, arr);
    }
    for (const [pn, arr] of meldByPartij.entries()) {
      arr.sort((a, b) => statusPrio(statusFromResultaat(a.resultaat)) - statusPrio(statusFromResultaat(b.resultaat)));
      meldByPartij.set(pn, arr);
    }

    const ctxList = (ctxRows ?? []) as any[];

    const eventName = safe(eventMeta?.naam, "-");
    const eventDate = fmtNlDateOnly(eventMeta?.datum);
    const runStart = fmtDateTime(run.gestart_op);
    const runEnd = fmtDateTime(run.afgerond_op);
    const runId = safe(run.id, "-");

    const ctxByPn = new Map<number, any>();
    for (const p of ctxList) {
      const pn = Number(p.partij_nr);
      if (Number.isFinite(pn)) ctxByPn.set(pn, p);
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "FightSupport";
    wb.created = new Date();

    // =========================================================
    // TAB VOLGORDE:
    // Overzicht, Verbod, Startverbod, Licentie, Keurmerk,
    // Dispensatie, Geen VA, VA gewijzigd, Meldingen
    // =========================================================

    // =========================
    // 1) OVERZICHT (logo)
    // ✅ AANGEPAST: VA oud + VA huidig + VA gewijzigd?
    // =========================
    {
      const ws = wb.addWorksheet("Overzicht");

      ws.columns = [
        { header: "Partij_nr", width: 9 },
        { header: "Partij", width: 10 },
        { header: "Discipline", width: 12 },
        { header: "Klasse", width: 18 },
        { header: "Rood naam", width: 26 },
        { header: "Rood sportschool", width: 24 },
        { header: "Rood VA (MM oud)", width: 14 },
        { header: "Rood VA (huidig)", width: 14 },
        { header: "Blauw naam", width: 26 },
        { header: "Blauw sportschool", width: 24 },
        { header: "Blauw VA (MM oud)", width: 14 },
        { header: "Blauw VA (huidig)", width: 14 },
        { header: "VA gewijzigd?", width: 12 },
        { header: "Status", width: 12 },
        { header: "Open meldingen", width: 14 },
        { header: "Dispensatie vereist", width: 18 },
      ];

      writeHeaderBlock({
        ws,
        title: "FightSupport – Overzicht",
        eventName,
        eventDate,
        runStart,
        runEnd,
        runId,
        matchmakingId: matchmaking_id,
        colCount: 16,
        logoSpace: true,
      });

      await addLogoToSheet(wb, ws);

      const HEADER_ROW = 4;
      ws.getRow(HEADER_ROW).values = (ws.columns ?? []).map((c) => c.header) as any;
      styleHeaderRow(ws, HEADER_ROW, 16);

      const START_ROW = HEADER_ROW + 1;
      let outRowNr = START_ROW;

      for (const p of ctxList) {
        const pn = Number(p.partij_nr);
        const meldingen = Number.isFinite(pn) ? meldByPartij.get(pn) ?? [] : [];
        const status = partyStatusVoorMeldingen(meldingen);
        const openCount = meldingen.length;
        const dispVereist = hasDispensatie(meldingen) ? "vereist" : "";

        const roodVa = getVaInfo(p, "rood");
        const blauwVa = getVaInfo(p, "blauw");
        const vaGewijzigd = roodVa.changed || blauwVa.changed ? "JA" : "";

        const row = ws.getRow(outRowNr++);
        row.values = [
          p.partij_nr ?? null,
          p.partij_label ?? p.partij_nr ?? null,
          safe(p.discipline, ""),
          safe(p.klasse_mm ?? p.klasse, ""),
          safe(p.rood_naam_fp ?? p.rood_naam_mm, ""),
          safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym, ""),
          safe(roodVa.prev, ""),
          safe(roodVa.current, ""),
          safe(p.blauw_naam_fp ?? p.blauw_naam_mm, ""),
          safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym, ""),
          safe(blauwVa.prev, ""),
          safe(blauwVa.current, ""),
          vaGewijzigd,
          status,
          openCount,
          dispVereist,
        ];

        const isWhite = (row.number - START_ROW) % 2 === 0;
        styleRowFillAndFont(row, isWhite);
      }

      ws.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW, column: 16 } };
    }

    // =========================
    // 2) VERBOD (open)
    // =========================
    {
      const ws = wb.addWorksheet("Verbod");

      ws.columns = [
        { header: "Partij_nr", width: 9 },
        { header: "Partij", width: 10 },
        { header: "Hoek", width: 9 },
        { header: "Rule code", width: 34 },
        { header: "Rule", width: 26 },
        { header: "Boodschap", width: 80 },
        { header: "Created", width: 20 },
      ];

      writeHeaderBlock({
        ws,
        title: "FightSupport – Verbod (open)",
        eventName,
        eventDate,
        runStart,
        runEnd,
        runId,
        matchmakingId: matchmaking_id,
        colCount: 7,
      });

      const HEADER_ROW = 4;
      ws.getRow(HEADER_ROW).values = (ws.columns ?? []).map((c) => c.header) as any;
      styleHeaderRow(ws, HEADER_ROW, 7);

      const START_ROW = HEADER_ROW + 1;

      const verbodRows = openMeldingen
        .filter((r) => isVerbodMelding(r) || (statusFromResultaat(r.resultaat) === "AFKEUR" && normCode(r.rule_code ?? "").startsWith("VERBOD_")))
        .sort((a, b) => {
          const ap = Number(a.partij_nr ?? 999999);
          const bp = Number(b.partij_nr ?? 999999);
          if (ap !== bp) return ap - bp;
          const ah = String(inferHoek(a) ?? "");
          const bh = String(inferHoek(b) ?? "");
          if (ah !== bh) return ah.localeCompare(bh);
          return String(a.rule_code ?? "").localeCompare(String(b.rule_code ?? ""));
        });

      let rno = START_ROW;
      for (const r of verbodRows) {
        const pn = Number(r.partij_nr);
        const ctx = Number.isFinite(pn) ? ctxByPn.get(pn) : null;

        const row = ws.getRow(rno++);
        row.values = [
          r.partij_nr ?? null,
          safe(ctx?.partij_label ?? ctx?.partij_nr ?? r.partij_nr, "-"),
          safe(inferHoek(r), ""),
          safe(r.rule_code ?? r.rule, ""),
          safe(r.rule, ""),
          safe(r.boodschap ?? r.rule, ""),
          safe(r.created_at, ""),
        ];

        const isWhite = (row.number - START_ROW) % 2 === 0;
        styleRowFillAndFont(row, isWhite);
      }

      ws.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW, column: 7 } };
    }

    // =========================
    // 3) STARTVERBOD (open, op basis van meldingen)
    // =========================
    {
      const ws = wb.addWorksheet("Startverbod");

      ws.columns = [
        { header: "Partij", width: 10 },
        { header: "Hoek", width: 9 },
        { header: "Naam", width: 28 },
        { header: "Sportschool", width: 26 },
        { header: "Melding", width: 70 },
      ];

      writeHeaderBlock({
        ws,
        title: "FightSupport – Startverbod (open)",
        eventName,
        eventDate,
        runStart,
        runEnd,
        runId,
        matchmakingId: matchmaking_id,
        colCount: 5,
      });

      const HEADER_ROW = 4;
      ws.getRow(HEADER_ROW).values = (ws.columns ?? []).map((c) => c.header) as any;
      styleHeaderRow(ws, HEADER_ROW, 5);

      const START_ROW = HEADER_ROW + 1;

      const rows = openMeldingen
        .filter((r) => isStartverbodMelding(r))
        .sort((a, b) => Number(a.partij_nr ?? 999999) - Number(b.partij_nr ?? 999999));

      let rno = START_ROW;
      for (const r of rows) {
        const pn = Number(r.partij_nr);
        const ctx = Number.isFinite(pn) ? ctxByPn.get(pn) : null;
        const hoek = inferHoek(r);

        const naam =
          hoek === "blauw"
            ? safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm, "-")
            : safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm, "-");

        const gym =
          hoek === "blauw"
            ? safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym, "-")
            : safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym, "-");

        const partij = safe(ctx?.partij_label ?? ctx?.partij_nr ?? r.partij_nr, "-");

        const row = ws.getRow(rno++);
        row.values = [partij, safe(hoek, ""), naam, gym, safe(r.boodschap ?? r.rule, "")];

        const isWhite = (row.number - START_ROW) % 2 === 0;
        styleRowFillAndFont(row, isWhite);
      }

      ws.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW, column: 5 } };
    }

    // =========================
    // 4) LICENTIE (open, op basis van meldingen)
    // ✅ AANGEPAST: VA huidig altijd via ctx (mm > va_* > *_va)
    // =========================
    {
      const ws = wb.addWorksheet("Licentie");

      ws.columns = [
        { header: "Partij", width: 10 },
        { header: "Hoek", width: 9 },
        { header: "Naam", width: 28 },
        { header: "Sportschool", width: 26 },
        { header: "Licentie", width: 12 },
        { header: "VA (huidig)", width: 14 },
        { header: "VA (MM oud)", width: 14 },
        { header: "Melding", width: 60 },
      ];

      writeHeaderBlock({
        ws,
        title: "FightSupport – Licentie (open)",
        eventName,
        eventDate,
        runStart,
        runEnd,
        runId,
        matchmakingId: matchmaking_id,
        colCount: 8,
      });

      const HEADER_ROW = 4;
      ws.getRow(HEADER_ROW).values = (ws.columns ?? []).map((c) => c.header) as any;
      styleHeaderRow(ws, HEADER_ROW, 8);

      const START_ROW = HEADER_ROW + 1;

      const rows = openMeldingen
        .filter((r) => isLicentieMelding(r))
        .sort((a, b) => {
          const ap = Number(a.partij_nr ?? 999999);
          const bp = Number(b.partij_nr ?? 999999);
          if (ap !== bp) return ap - bp;
          return String(inferHoek(a) ?? "").localeCompare(String(inferHoek(b) ?? ""));
        });

      let rno = START_ROW;
      for (const r of rows) {
        const pn = Number(r.partij_nr);
        const ctx = Number.isFinite(pn) ? ctxByPn.get(pn) : null;
        const hoek = inferHoek(r);

        const naam =
          hoek === "blauw"
            ? safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm, "-")
            : safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm, "-");

        const gym =
          hoek === "blauw"
            ? safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym, "-")
            : safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym, "-");

        const lic = hoek === "blauw" ? safe(ctx?.blauw_licentie, "onbekend") : safe(ctx?.rood_licentie, "onbekend");

        const vaInfo = getVaInfo(ctx, hoek === "blauw" ? "blauw" : "rood");

        const partij = safe(ctx?.partij_label ?? ctx?.partij_nr ?? r.partij_nr, "-");

        const row = ws.getRow(rno++);
        row.values = [partij, safe(hoek, ""), naam, gym, lic, safe(vaInfo.current, "-"), safe(vaInfo.prev, ""), safe(r.boodschap ?? r.rule, "")];

        const isWhite = (row.number - START_ROW) % 2 === 0;
        styleRowFillAndFont(row, isWhite);
      }

      ws.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW, column: 8 } };
    }

    // =========================
    // 5) KEURMERK (open, sportscholen uniek op basis van meldingen)
    // =========================
    {
      const ws = wb.addWorksheet("Keurmerk");

      ws.columns = [
        { header: "Sportschool", width: 42 },
        { header: "Reden", width: 60 },
        { header: "Open meldingen", width: 14 },
      ];

      writeHeaderBlock({
        ws,
        title: "FightSupport – Keurmerk (open)",
        eventName,
        eventDate,
        runStart,
        runEnd,
        runId,
        matchmakingId: matchmaking_id,
        colCount: 3,
      });

      const HEADER_ROW = 4;
      ws.getRow(HEADER_ROW).values = (ws.columns ?? []).map((c) => c.header) as any;
      styleHeaderRow(ws, HEADER_ROW, 3);

      const START_ROW = HEADER_ROW + 1;

      const set = new Map<string, { reden: string; count: number }>();

      const rows = openMeldingen.filter((r) => isKeurmerkMelding(r));
      for (const r of rows) {
        const pn = Number(r.partij_nr);
        if (!Number.isFinite(pn)) continue;
        const ctx = ctxByPn.get(pn);
        if (!ctx) continue;

        const hoek = inferHoek(r);

        const gym =
          hoek === "blauw"
            ? safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym, "")
            : safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym, "");

        if (!gym) continue;

        const reden =
          hoek === "blauw"
            ? safe(ctx?.keurmerk_reden_blauw ?? r.boodschap ?? r.rule, "Keurmerk ongeldig/onbekend")
            : safe(ctx?.keurmerk_reden_rood ?? r.boodschap ?? r.rule, "Keurmerk ongeldig/onbekend");

        const cur = set.get(gym);
        if (!cur) set.set(gym, { reden, count: 1 });
        else set.set(gym, { reden: cur.reden || reden, count: cur.count + 1 });
      }

      const gyms = Array.from(set.entries()).sort((a, b) => a[0].localeCompare(b[0], "nl"));

      let rno = START_ROW;
      for (const [gym, obj] of gyms) {
        const row = ws.getRow(rno++);
        row.values = [gym, obj.reden, obj.count];
        const isWhite = (row.number - START_ROW) % 2 === 0;
        styleRowFillAndFont(row, isWhite);
      }

      ws.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW, column: 3 } };
    }

    // =========================
    // 6) DISPENSATIE (altijd tonen: open + goedgekeurd + afgekeurd)
    // =========================
    {
      const ws = wb.addWorksheet("Dispensatie");

      ws.columns = [
        { header: "Partij_nr", width: 9 },
        { header: "Hoek", width: 9 },
        { header: "VA (MM oud)", width: 14 },
        { header: "VA (huidig)", width: 14 },
        { header: "Resultaat", width: 12 },
        { header: "Status", width: 14 },
        { header: "Rule code", width: 28 },
        { header: "Boodschap", width: 80 },
        { header: "Created", width: 20 },
      ];

      writeHeaderBlock({
        ws,
        title: "FightSupport – Dispensatie (incl. besluit)",
        eventName,
        eventDate,
        runStart,
        runEnd,
        runId,
        matchmakingId: matchmaking_id,
        colCount: 7,
      });

      const HEADER_ROW = 4;
      ws.getRow(HEADER_ROW).values = (ws.columns ?? []).map((c) => c.header) as any;
      styleHeaderRow(ws, HEADER_ROW, 7);

      const START_ROW = HEADER_ROW + 1;

      const dispRows = alleDispensaties.sort((a, b) => Number(a.partij_nr ?? 999999) - Number(b.partij_nr ?? 999999));

      let rno = START_ROW;
      for (const r of dispRows) {
        const row = ws.getRow(rno++);
        row.values = [
          r.partij_nr ?? null,
          safe(inferHoek(r), ""),
          (() => {
            const pn = Number(r.partij_nr);
            const ctx = Number.isFinite(pn) ? ctxByPn.get(pn) : null;
            const hoek = inferHoek(r);
            const vaInfo = getVaInfo(ctx, hoek === "blauw" ? "blauw" : "rood");
            return safe(vaInfo.prev, "");
          })(),
          (() => {
            const pn = Number(r.partij_nr);
            const ctx = Number.isFinite(pn) ? ctxByPn.get(pn) : null;
            const hoek = inferHoek(r);
            const vaInfo = getVaInfo(ctx, hoek === "blauw" ? "blauw" : "rood");
            return safe(vaInfo.current, "");
          })(),
          safe(r.resultaat, ""),
          dispensatieStatusLabel(r),
          safe(r.rule_code ?? r.rule, ""),
          safe(r.boodschap ?? r.rule, ""),
          safe(r.created_at, ""),
        ];
        const isWhite = (row.number - START_ROW) % 2 === 0;
        styleRowFillAndFont(row, isWhite);
      }

      ws.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW, column: 7 } };
    }

    // =========================
    // 7) GEEN VA (open, op basis van meldingen)
    // ✅ AANGEPAST: toon VA huidig + (optioneel) MM oud
    // =========================
    {
      const ws = wb.addWorksheet("Geen VA");

      ws.columns = [
        { header: "Partij", width: 10 },
        { header: "Hoek", width: 9 },
        { header: "Naam", width: 28 },
        { header: "Sportschool", width: 26 },
        { header: "VA (huidig)", width: 14 },
        { header: "VA (MM oud)", width: 14 },
        { header: "Melding", width: 60 },
      ];

      writeHeaderBlock({
        ws,
        title: "FightSupport – Geen/ongeldig VA nummer (open)",
        eventName,
        eventDate,
        runStart,
        runEnd,
        runId,
        matchmakingId: matchmaking_id,
        colCount: 7,
      });

      const HEADER_ROW = 4;
      ws.getRow(HEADER_ROW).values = (ws.columns ?? []).map((c) => c.header) as any;
      styleHeaderRow(ws, HEADER_ROW, 7);

      const START_ROW = HEADER_ROW + 1;

      const rows = openMeldingen
        .filter((r) => isGeenVaMelding(r))
        .sort((a, b) => {
          const ap = Number(a.partij_nr ?? 999999);
          const bp = Number(b.partij_nr ?? 999999);
          if (ap !== bp) return ap - bp;
          return String(inferHoek(a) ?? "").localeCompare(String(inferHoek(b) ?? ""));
        });

      let rno = START_ROW;
      for (const r of rows) {
        const pn = Number(r.partij_nr);
        const ctx = Number.isFinite(pn) ? ctxByPn.get(pn) : null;
        const hoek = inferHoek(r);

        const naam =
          hoek === "blauw"
            ? safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm, "-")
            : safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm, "-");

        const gym =
          hoek === "blauw"
            ? safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym, "-")
            : safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym, "-");

        const vaInfo = getVaInfo(ctx, hoek === "blauw" ? "blauw" : "rood");

        const partij = safe(ctx?.partij_label ?? ctx?.partij_nr ?? r.partij_nr, "-");

        const row = ws.getRow(rno++);
        row.values = [partij, safe(hoek, ""), naam, gym, safe(vaInfo.current, ""), safe(vaInfo.prev, ""), safe(r.boodschap ?? r.rule, "")];

        const isWhite = (row.number - START_ROW) % 2 === 0;
        styleRowFillAndFont(row, isWhite);
      }

      ws.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW, column: 7 } };
    }

    // =========================
    // 8) VA GEWIJZIGD (open)
// ✅ AANGEPAST: toon VA wijzigingen óók als er géén specifieke melding bestaat (leeg → ingevuld telt ook)
// =========================
{
  const ws = wb.addWorksheet("VA gewijzigd");

  ws.columns = [
    { header: "Partij_nr", width: 9 },
    { header: "Hoek", width: 9 },
    { header: "Naam", width: 28 },
    { header: "Sportschool", width: 26 },
    { header: "VA (MM oud)", width: 14 },
    { header: "VA (huidig)", width: 14 },
    { header: "Wijziging", width: 26 },
    { header: "Updated", width: 20 },
  ];

  writeHeaderBlock({
    ws,
    title: "FightSupport – VA nummer wijzigingen (open)",
    eventName,
    eventDate,
    runStart,
    runEnd,
    runId,
    matchmakingId: matchmaking_id,
    colCount: 8,
  });

  const HEADER_ROW = 4;
  ws.getRow(HEADER_ROW).values = (ws.columns ?? []).map((c) => c.header) as any;
  styleHeaderRow(ws, HEADER_ROW, 8);

  const START_ROW = HEADER_ROW + 1;

  // Bouw wijzigingenlijst uit CONTEXT (dus onafhankelijk van welke rules/meldingen er zijn)
  const changes: Array<{
    partij_nr: number;
    hoek: "rood" | "blauw";
    naam: string;
    gym: string;
    prev: string;
    current: string;
    label: string;
    updated: string;
  }> = [];

  for (const ctx of ctxRows ?? []) {
    const pn = Number((ctx as any)?.partij_nr);
    if (!Number.isFinite(pn)) continue;

    for (const side of ["rood", "blauw"] as const) {
      const info = getVaInfo(ctx, side);
      if (!info.changed) continue;

      const naam =
        side === "blauw"
          ? safe((ctx as any)?.blauw_naam_fp ?? (ctx as any)?.blauw_naam_mm ?? (ctx as any)?.blauw_naam, "-")
          : safe((ctx as any)?.rood_naam_fp ?? (ctx as any)?.rood_naam_mm ?? (ctx as any)?.rood_naam, "-");

      const gym =
        side === "blauw"
          ? safe((ctx as any)?.blauw_gym_fp ?? (ctx as any)?.blauw_gym_mm ?? (ctx as any)?.blauw_gym, "-")
          : safe((ctx as any)?.rood_gym_fp ?? (ctx as any)?.rood_gym_mm ?? (ctx as any)?.rood_gym, "-");

      const label = info.prev ? `${info.prev} → ${info.current}` : `→ ${info.current}`;

      changes.push({
        partij_nr: pn,
        hoek: side,
        naam,
        gym,
        prev: safe(info.prev, ""),
        current: safe(info.current, ""),
        label,
        updated: safe((ctx as any)?.updated_at ?? (ctx as any)?.created_at ?? "", ""),
      });
    }
  }

  changes.sort((a, b) => a.partij_nr - b.partij_nr || a.hoek.localeCompare(b.hoek));

  let rno = START_ROW;
  for (const ch of changes) {
    const row = ws.getRow(rno++);
    row.values = [
      ch.partij_nr,
      ch.hoek,
      ch.naam,
      ch.gym,
      ch.prev,
      ch.current,
      ch.label,
      ch.updated,
    ];
    const isWhite = (row.number - START_ROW) % 2 === 0;
    styleRowFillAndFont(row, isWhite);
  }

  ws.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW, column: 8 } };
}

// =========================
// 9) MELDINGEN (alleen open, dispensaties staan apart)
    // =========================
    {
      const ws = wb.addWorksheet("Meldingen");

      ws.columns = [
        { header: "Partij_nr", width: 9 },
        { header: "Hoek", width: 9 },
        { header: "VA (MM oud)", width: 14 },
        { header: "VA (huidig)", width: 14 },
        { header: "Resultaat", width: 12 },
        { header: "Review status", width: 14 },
        { header: "Rule code", width: 26 },
        { header: "Rule", width: 22 },
        { header: "Boodschap", width: 70 },
        { header: "Aantekeningen", width: 32 },
        { header: "Created", width: 20 },
      ];

      writeHeaderBlock({
        ws,
        title: "FightSupport – Meldingen (open)",
        eventName,
        eventDate,
        runStart,
        runEnd,
        runId,
        matchmakingId: matchmaking_id,
        colCount: 11,
      });

      const HEADER_ROW = 4;
      ws.getRow(HEADER_ROW).values = (ws.columns ?? []).map((c) => c.header) as any;
      styleHeaderRow(ws, HEADER_ROW, 11);

      const START_ROW = HEADER_ROW + 1;

      const sorted = [...meldingenVoorTab].sort((a, b) => {
        const ap = Number(a.partij_nr ?? 999999);
        const bp = Number(b.partij_nr ?? 999999);
        if (ap !== bp) return ap - bp;
        const ah = String(inferHoek(a) ?? "");
        const bh = String(inferHoek(b) ?? "");
        if (ah !== bh) return ah.localeCompare(bh);
        return statusPrio(statusFromResultaat(a.resultaat)) - statusPrio(statusFromResultaat(b.resultaat));
      });

      let rno = START_ROW;
      for (const r of sorted) {
        const pn = Number(r.partij_nr);
        const hoek = (inferHoek(r) as any) ?? null;
        const ctx = Number.isFinite(pn) ? ctxByPn.get(pn) : null;
        const va = getVaInfo(ctx, hoek === "blauw" ? "blauw" : "rood");

        const row = ws.getRow(rno++);
        row.values = [
          r.partij_nr ?? null,
          safe(hoek, ""),
          safe(va.prev, ""),
          safe(va.current, ""),
          safe(r.resultaat, ""),
          safe(r.review_status, ""),
          safe(r.rule_code, ""),
          safe(r.rule, ""),
          safe(r.boodschap, ""),
          safe(r.aantekeningen, ""),
          safe(r.created_at, ""),
        ];
        const isWhite = (row.number - START_ROW) % 2 === 0;
        styleRowFillAndFont(row, isWhite);
      }

      ws.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW, column: 11 } };
    }

    const outBuf = await wb.xlsx.writeBuffer();

    const cleanEventName = safe(eventName, "Event")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "_");

    const dateForFile = fmtYmdForFilename(eventMeta?.datum);

    const filename = `FightSupport_${cleanEventName}_${dateForFile}_run_${String(run.id).slice(0, 8)}.xlsx`;

    return new Response(outBuf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("❌ excel export error:", e);
    return NextResponse.json({ error: e?.message ?? "Onbekende fout" }, { status: 500 });
  }
}