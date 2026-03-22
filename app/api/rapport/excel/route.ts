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

type AuditEvent = {
  partij_nr: number | null;
  hoek: "rood" | "blauw" | null;
  event_type: string | null;
  old_va: string | null;
  new_va: string | null;
  actor_email: string | null;
  created_at: string | null;
  reason: string | null;
};

type PartijStatus = "OK" | "AFKEUR" | "DISPENSATIE" | "ACTIE";

function safe(v: any, fallback = "") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function safeRaw(v: any) {
  return String(v ?? "").trim();
}

function normalizeVa(v: any) {
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[-–—]/g, "")
    .toUpperCase();
}

function numOrBlank(v: any) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number" && Number.isFinite(v)) return v;

  const raw = String(v).trim();
  if (!raw) return "";

  const normalized = raw.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : raw;
}

function normCode(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function isApprovedOrClosed(review_status: any) {
  if (review_status == null) return false;
  const raw = String(review_status).trim().toLowerCase();
  if (!raw) return false;

  const tokens = raw
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/g)
    .filter(Boolean);

  const tset = new Set(tokens);
  const hasAny = (...t: string[]) => t.some((x) => tset.has(x));

  if (
    hasAny(
      "approved",
      "approve",
      "accepted",
      "ok",
      "akkoord",
      "done",
      "closed",
      "resolved",
      "complete",
      "completed"
    )
  ) {
    return true;
  }

  if (hasAny("goedgekeurd", "afgehandeld")) return true;
  if (tset.has("goed") && !tset.has("niet")) return true;
  if (raw.includes("goedgekeurd") || raw.includes("afgehandeld")) return true;

  return false;
}

function textLooksApproved(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return false;
  return (
    s === "approved" ||
    s === "approve" ||
    s === "ok" ||
    s === "goed" ||
    s === "goedgekeurd" ||
    s === "akkoord" ||
    s === "accepted" ||
    s === "resolved" ||
    s === "afgehandeld" ||
    s === "closed" ||
    s === "complete" ||
    s === "completed" ||
    s.includes("goedgekeurd") ||
    s.includes("approved") ||
    s.includes("akkoord") ||
    s.includes("afgehandeld") ||
    s.includes("resolved")
  );
}

function rowIsEffectivelyApproved(r: ResultRow) {
  const anyRow = r as any;
  return (
    isApprovedOrClosed(anyRow?.review_status) ||
    textLooksApproved(anyRow?.status) ||
    textLooksApproved(anyRow?.review_result) ||
    textLooksApproved(anyRow?.besluit) ||
    textLooksApproved(anyRow?.aantekeningen)
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

function rowHaystack(r: ResultRow) {
  return `${r.rule_code ?? ""} ${r.rule ?? ""} ${r.boodschap ?? ""} ${r.aantekeningen ?? ""}`.toLowerCase();
}

function isNameMismatch(r: ResultRow) {
  const c = normCode(r.rule_code);
  return c.startsWith("VECHTER_NAAM_MISMATCH") || c.startsWith("VECHTER_NAAM_ANDERS");
}

function isVARow(r: ResultRow) {
  const hay = rowHaystack(r);
  const c = normCode(r.rule_code);
  return (
    c.includes("VA") ||
    hay.includes("fightpaspoort") ||
    hay.includes("va nummer") ||
    hay.includes("va-nummer") ||
    hay.includes("v.a.") ||
    hay.includes("passport nummer")
  );
}

function isMissingVARow(r: ResultRow) {
  const hay = rowHaystack(r);
  const c = normCode(r.rule_code);
  return (
    c.includes("VA_ONTBREEKT") ||
    c.includes("VA_MISSING") ||
    c.includes("FIGHTPASPOORT_ONTBREEKT") ||
    c.includes("FIGHTPASPOORT_MISSING") ||
    c.includes("GEEN_VA") ||
    (isVARow(r) &&
      (hay.includes("ontbreekt") ||
        hay.includes("missing") ||
        hay.includes("geen va") ||
        hay.includes("geen fightpaspoort") ||
        hay.includes("leeg va") ||
        hay.includes("va ontbreekt") ||
        hay.includes("fightpaspoort ontbreekt") ||
        hay.includes("geen nummer") ||
        hay.includes("nummer ontbreekt")))
  );
}

function isFightpaspoortGewijzigd(r: ResultRow) {
  const c = normCode(r.rule_code);
  if (
    c.startsWith("VA_NUMMER_AANGEPAST") ||
    c.includes("VA_CHANGED") ||
    c.includes("VA_WIJZIG") ||
    c.includes("FIGHTPASPOORT_GEWIJZIGD")
  ) {
    return true;
  }

  const hay = rowHaystack(r);
  return (
    hay.includes("fightpaspoort nummer gewijzigd") ||
    hay.includes("va nummer gewijzigd") ||
    hay.includes("va aangepast") ||
    hay.includes("fightpaspoort aangepast") ||
    hay.includes("gewijzigd van") ||
    hay.includes("aangepast van")
  );
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

async function getMatchmakingRawMap(matchmaking_id: string) {
  const byBoutId = new Map<string, any>();
  const byPartijNr = new Map<number, any>();

  const { data, error } = await supabase
    .from("matchmaking_bouts_raw")
    .select("bout_uid, partij_nr, max_gewicht")
    .eq("matchmaking_id", matchmaking_id);

  if (error) throw error;

  for (const row of data ?? []) {
    const boutIdCandidates = [(row as any)?.bout_uid]
      .map((v: any) => safe(v, ""))
      .filter(Boolean);

    const partijNr = Number((row as any)?.partij_nr);
    const maxGewicht = (row as any)?.max_gewicht ?? null;

    for (const boutId of boutIdCandidates) {
      byBoutId.set(boutId, maxGewicht);
    }
    if (Number.isFinite(partijNr)) byPartijNr.set(partijNr, maxGewicht);
  }

  return { byBoutId, byPartijNr };
}

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

function styleUploadMetaCell(cell: ExcelJS.Cell, opts?: { bold?: boolean; align?: "left" | "center" | "right" }) {
  cell.font = {
    name: "Calibri",
    size: 11,
    bold: !!opts?.bold,
    color: { argb: "FF000000" },
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: opts?.align ?? "left",
    wrapText: true,
  };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } } as any;
}

function styleUploadHeaderCell(cell: ExcelJS.Cell) {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFF6200" },
  } as any;
  cell.font = {
    name: "Calibri",
    size: 11,
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

function styleUploadDataCell(cell: ExcelJS.Cell, opts?: { center?: boolean }) {
  cell.font = {
    name: "Calibri",
    size: 11,
    color: { argb: "FF000000" },
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: opts?.center ? "center" : "left",
    wrapText: true,
  };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } } as any;
  cell.border = {
    top: { style: "thin", color: { argb: "FF9CA3AF" } },
    left: { style: "thin", color: { argb: "FF9CA3AF" } },
    bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
    right: { style: "thin", color: { argb: "FF9CA3AF" } },
  };
}

function styleUploadSheetLayout(ws: ExcelJS.Worksheet) {
  ws.views = [{ state: "normal", showGridLines: true }];

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 15;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 34;
  ws.getColumn(5).width = 28;
  ws.getColumn(6).width = 18;
  ws.getColumn(7).width = 10;
  ws.getColumn(8).width = 6;
  ws.getColumn(9).width = 34;
  ws.getColumn(10).width = 28;
  ws.getColumn(11).width = 18;
  ws.getColumn(12).width = 10;
  ws.getColumn(13).width = 14;

  ws.getRow(1).height = 24;
  ws.getRow(2).height = 22;
  ws.getRow(3).height = 22;
  ws.getRow(4).height = 22;
  ws.getRow(5).height = 12;
  ws.getRow(6).height = 24;
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
    tl: { col: 0.35, row: 0.2 },
    ext: { width: 210, height: 78 },
    editAs: "oneCell",
  });
}

function writeUploadLikeOverviewHeader(opts: {
  wb: ExcelJS.Workbook;
  ws: ExcelJS.Worksheet;
  eventName: string;
  eventDate: string;
  bond: string;
}) {
  const { ws, eventName, eventDate, bond } = opts;

  styleUploadSheetLayout(ws);

  ensureMerged(ws, "D1:G1");
  ensureMerged(ws, "D2:E2");
  ensureMerged(ws, "D3:E3");
  ensureMerged(ws, "D4:E4");

  ws.getCell("D1").value = "FIGHTSUPPORT EXCEL RAPPORTAGE";
  ws.getCell("D1").font = {
    name: "Calibri",
    size: 14,
    bold: true,
    color: { argb: "FF000000" },
  };
  ws.getCell("D1").alignment = { vertical: "middle", horizontal: "left" };
  ws.getCell("D1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } } as any;

  ws.getCell("D2").value = "Naam Evenement:";
  styleUploadMetaCell(ws.getCell("D2"), { bold: true });
  ws.getCell("F2").value = eventName && eventName !== "-" ? eventName : "";
  styleUploadMetaCell(ws.getCell("F2"));

  ws.getCell("D3").value = "Datum Evenement:";
  styleUploadMetaCell(ws.getCell("D3"), { bold: true });
  ws.getCell("F3").value = eventDate && eventDate !== "-" ? eventDate : "";
  styleUploadMetaCell(ws.getCell("F3"));

  ws.getCell("D4").value = "Bond:";
  styleUploadMetaCell(ws.getCell("D4"), { bold: true });
  ws.getCell("F4").value = bond || "";
  styleUploadMetaCell(ws.getCell("F4"));

  const headers = [
    "Partij nr",
    "Discipline",
    "Klasse",
    "Naam atleet 1",
    "Sportschool (1)",
    "Fightpaspoort nr (1)",
    "KG (1)",
    "VS",
    "Naam atleet 2",
    "Sportschool (2)",
    "Fightpaspoort nr (2)",
    "KG (2)",
    "Max KG",
  ];

  for (let c = 1; c <= headers.length; c++) {
    const cell = ws.getCell(6, c);
    cell.value = headers[c - 1];
    styleUploadHeaderCell(cell);
  }
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
}) {
  const { ws, title, eventName, eventDate, runStart, runEnd, runId, matchmakingId, colCount } = opts;

  const endCol = Math.max(1, colCount);
  const endColLetter = colToName(endCol);

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

  for (let rr = 1; rr <= 3; rr++) {
    for (let c = 1; c <= endCol; c++) {
      const cell = ws.getCell(rr, c);
      if (!cell.fill) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } } as any;
      }
      cell.border = {
        top: { style: "thin", color: { argb: "FF9CA3AF" } },
        left: { style: "thin", color: { argb: "FF9CA3AF" } },
        bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
        right: { style: "thin", color: { argb: "FF9CA3AF" } },
      };
    }
  }

  ws.getRow(1).height = 22;
  ws.getRow(2).height = 18;
  ws.getRow(3).height = 18;
}

function inferHoek(r: ResultRow): "rood" | "blauw" | null {
  if (r.hoek === "rood" || r.hoek === "blauw") return r.hoek;

  const c = String(r.rule_code ?? "").toLowerCase();
  const rr = String(r.rule ?? "").toLowerCase();
  const bb = String(r.boodschap ?? "").toLowerCase();
  const hay = `${c} ${rr} ${bb}`;

  if (hay.includes("_rood") || hay.includes(" rood") || hay.includes("rode hoek") || hay.includes("hoek rood")) {
    return "rood";
  }

  if (hay.includes("_blauw") || hay.includes(" blauw") || hay.includes("blauwe hoek") || hay.includes("hoek blauw")) {
    return "blauw";
  }

  return null;
}

function isVerbodMelding(r: ResultRow) {
  const c = normCode(r.rule_code ?? r.rule);
  if (c.startsWith("VERBOD_")) return true;
  if (c.startsWith("VERBODZONDER") || c.startsWith("VERBOD_ZONDER")) return true;
  const rr = String(r.rule ?? "").toUpperCase();
  const bb = String(r.boodschap ?? "").toUpperCase();
  return rr.includes("VERBOD") || bb.includes("VERBOD");
}

function isLicentieMelding(r: ResultRow) {
  const c = normCode(r.rule_code ?? r.rule);
  const isL = c.startsWith("LICENTIE_") || c.includes("LICENTIE");
  if (!isL) return false;
  return statusFromResultaat(r.resultaat) === "AFKEUR";
}

function isKeurmerkMelding(r: ResultRow) {
  const rule = (r.rule_code ?? "").toUpperCase();
  const status = (r.resultaat ?? "").toUpperCase();
  if (!rule.includes("KEURMERK")) return false;
  return status === "AFKEUR" || status === "ACTIE";
}

function isStartverbodMelding(r: ResultRow) {
  const c = normCode(r.rule_code ?? r.rule);
  return c.includes("STARTVERBOD");
}

function getVaInfo(ctx: any, side: "rood" | "blauw") {
  if (!ctx) return { prev: "", current: "", changed: false };

  const prevRaw = side === "rood" ? (ctx?.rood_va_mm_prev ?? null) : (ctx?.blauw_va_mm_prev ?? null);

  const current =
    side === "rood"
      ? safe(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.rood_va, "")
      : safe(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.blauw_va, "");

  const prevNorm = normalizeVa(prevRaw);
  const currentNorm = normalizeVa(current);

  const prevDisplay = prevRaw === null || prevRaw === undefined || String(prevRaw).trim() === "-" ? "" : safe(prevRaw, "");
  const changed = !!prevNorm && !!currentNorm && prevNorm !== currentNorm;

  return { prev: prevDisplay, current, changed };
}

function getCurrentNaam(ctx: any, side: "rood" | "blauw") {
  if (!ctx) return "";
  return side === "rood"
    ? safe(
        ctx?.rood_naam_fp ??
          ctx?.rood_naam_gecorrigeerd ??
          ctx?.rood_naam_corrected ??
          ctx?.rood_naam_mm ??
          ctx?.rood_naam,
        ""
      )
    : safe(
        ctx?.blauw_naam_fp ??
          ctx?.blauw_naam_gecorrigeerd ??
          ctx?.blauw_naam_corrected ??
          ctx?.blauw_naam_mm ??
          ctx?.blauw_naam,
        ""
      );
}

function getCurrentGym(ctx: any, side: "rood" | "blauw") {
  if (!ctx) return "";
  return side === "rood"
    ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym, "")
    : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym, "");
}

function getCurrentGewicht(ctx: any, side: "rood" | "blauw") {
  if (!ctx) return "";
  const raw =
    side === "rood"
      ? ctx?.rood_gewicht_mm ?? ctx?.rood_gewicht ?? ctx?.gewicht_rood ?? ctx?.rood_weight
      : ctx?.blauw_gewicht_mm ?? ctx?.blauw_gewicht ?? ctx?.gewicht_blauw ?? ctx?.blauw_weight;
  return numOrBlank(raw);
}

function hasFilledValue(v: any) {
  return v !== null && v !== undefined && String(v).trim() !== "";
}

function getResolvedMaxGewicht(
  ctx: any,
  rawMaps: { byBoutId: Map<string, any>; byPartijNr: Map<number, any> }
) {
  const directCandidates = [
    ctx?.max_gewicht,
    ctx?.max_gewicht_mm,
    ctx?.gewicht_max_mm,
    ctx?.matchmaking_bouts_raw_max_gewicht,
    ctx?.gewicht_max,
    ctx?.max_kg,
    ctx?.extra?.max_gewicht,
    ctx?.extra?.max_kg,
    ctx?.extra?.gewicht_max,
  ];

  for (const candidate of directCandidates) {
    if (hasFilledValue(candidate)) return numOrBlank(candidate);
  }

  const boutIdCandidates = [ctx?.bout_id, ctx?.bout_uid]
    .map((v: any) => safe(v, ""))
    .filter(Boolean);

  for (const boutId of boutIdCandidates) {
    if (!rawMaps.byBoutId.has(boutId)) continue;
    const v = rawMaps.byBoutId.get(boutId);
    if (hasFilledValue(v)) return numOrBlank(v);
  }

  const partijNr = Number(ctx?.partij_nr);
  if (Number.isFinite(partijNr) && rawMaps.byPartijNr.has(partijNr)) {
    const v = rawMaps.byPartijNr.get(partijNr);
    if (hasFilledValue(v)) return numOrBlank(v);
  }

  return "";
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
    const rawMaps = await getMatchmakingRawMap(matchmaking_id);

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

    const { data: auditRows, error: auditErr } = await supabase
      .from("controle_audit_events")
      .select("partij_nr, hoek, event_type, old_va, new_va, actor_email, created_at, reason")
      .eq("controle_run_id", run.id)
      .eq("matchmaking_id", matchmaking_id)
      .order("created_at", { ascending: false });

    if (auditErr) {
      console.warn("audit load failed:", auditErr.message);
    }

    const resultaten = (resRows ?? []) as ResultRow[];
    const auditEvents = (auditRows ?? []) as AuditEvent[];

    const openMeldingen = resultaten.filter((r) => {
      if (isNameMismatch(r) && !isFightpaspoortGewijzigd(r)) return false;

      if (isMissingVARow(r)) {
        if (rowIsEffectivelyApproved(r)) return false;
        return true;
      }

      if (isFightpaspoortGewijzigd(r)) {
        if (rowIsEffectivelyApproved(r)) return false;
        return true;
      }

      if (rowIsEffectivelyApproved(r)) return false;
      if (String(r.resultaat ?? "").trim().toLowerCase() === "ok") return false;

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
    const eventBond = safe((eventMeta as any)?.bond, "");
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

    {
      const ws = wb.addWorksheet("Overzicht");

      writeUploadLikeOverviewHeader({
        wb,
        ws,
        eventName,
        eventDate,
        bond: eventBond,
      });

      await addOverviewLogo(wb, ws);

      const START_ROW = 7;
      let outRowNr = START_ROW;

      for (const p of ctxList) {
        const pn = Number(p.partij_nr);
        const meldingen = Number.isFinite(pn) ? meldByPartij.get(pn) ?? [] : [];
        const _status = partyStatusVoorMeldingen(meldingen);
        const _openCount = meldingen.length;
        const _dispVereist = hasDispensatie(meldingen) ? "vereist" : "";

        const roodVa = getVaInfo(p, "rood");
        const blauwVa = getVaInfo(p, "blauw");

        const row = ws.getRow(outRowNr++);

        row.getCell(1).value = p.partij_nr ?? null;
        row.getCell(2).value = safe(p.discipline, "");
        row.getCell(3).value = safe(p.klasse_mm ?? p.klasse, "");
        row.getCell(4).value = getCurrentNaam(p, "rood");
        row.getCell(5).value = getCurrentGym(p, "rood");
        row.getCell(6).value = safe(roodVa.current, "");
        row.getCell(7).value = getCurrentGewicht(p, "rood");
        row.getCell(8).value = "vs";
        row.getCell(9).value = getCurrentNaam(p, "blauw");
        row.getCell(10).value = getCurrentGym(p, "blauw");
        row.getCell(11).value = safe(blauwVa.current, "");
        row.getCell(12).value = getCurrentGewicht(p, "blauw");
        row.getCell(13).value = getResolvedMaxGewicht(p, rawMaps);

        for (let c = 1; c <= 13; c++) {
          styleUploadDataCell(row.getCell(c), {
            center: c === 1 || c === 7 || c === 8 || c === 12 || c === 13,
          });
        }

        row.getCell(8).font = {
          name: "Calibri",
          size: 11,
          bold: true,
          color: { argb: "FF000000" },
        };

        row.height = 21;
      }
    }

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
    }

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

        const naam = getCurrentNaam(ctx, hoek === "blauw" ? "blauw" : "rood");
        const gym = getCurrentGym(ctx, hoek === "blauw" ? "blauw" : "rood");
        const partij = safe(ctx?.partij_label ?? ctx?.partij_nr ?? r.partij_nr, "-");

        const row = ws.getRow(rno++);
        row.values = [partij, safe(hoek, ""), naam, gym, safe(r.boodschap ?? r.rule, "")];

        const isWhite = (row.number - START_ROW) % 2 === 0;
        styleRowFillAndFont(row, isWhite);
      }
    }

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

        const naam = getCurrentNaam(ctx, hoek === "blauw" ? "blauw" : "rood");
        const gym = getCurrentGym(ctx, hoek === "blauw" ? "blauw" : "rood");
        const lic = hoek === "blauw" ? safe(ctx?.blauw_licentie, "onbekend") : safe(ctx?.rood_licentie, "onbekend");
        const vaInfo = getVaInfo(ctx, hoek === "blauw" ? "blauw" : "rood");
        const partij = safe(ctx?.partij_label ?? ctx?.partij_nr ?? r.partij_nr, "-");

        const row = ws.getRow(rno++);
        row.values = [partij, safe(hoek, ""), naam, gym, lic, safe(vaInfo.current, "-"), safe(vaInfo.prev, ""), safe(r.boodschap ?? r.rule, "")];

        const isWhite = (row.number - START_ROW) % 2 === 0;
        styleRowFillAndFont(row, isWhite);
      }
    }

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
        const gym = getCurrentGym(ctx, hoek === "blauw" ? "blauw" : "rood");
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
    }

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
        colCount: 9,
      });

      const HEADER_ROW = 4;
      ws.getRow(HEADER_ROW).values = (ws.columns ?? []).map((c) => c.header) as any;
      styleHeaderRow(ws, HEADER_ROW, 9);

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
    }

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
        title: "FightSupport – Geen/ontbrekend VA nummer",
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

      const rows: Array<{
        partij: string;
        hoek: "rood" | "blauw";
        naam: string;
        gym: string;
        current: string;
        prev: string;
        melding: string;
        partij_nr: number;
      }> = [];

      const seen = new Set<string>();

      for (const ctx of ctxList) {
        const pn = Number((ctx as any)?.partij_nr);
        if (!Number.isFinite(pn)) continue;
        const partij = safe((ctx as any)?.partij_label ?? (ctx as any)?.partij_nr ?? pn, "-");

        for (const side of ["rood", "blauw"] as const) {
          const info = getVaInfo(ctx, side);
          if (safeRaw(info.current)) continue;

          const key = `${pn}-${side}-ctx`;
          if (seen.has(key)) continue;
          seen.add(key);

          rows.push({
            partij_nr: pn,
            partij,
            hoek: side,
            naam: getCurrentNaam(ctx, side),
            gym: getCurrentGym(ctx, side),
            current: safe(info.current, ""),
            prev: safe(info.prev, ""),
            melding: "Fightpaspoortnummer ontbreekt",
          });
        }
      }

      for (const r of resultaten) {
        if (!isMissingVARow(r)) continue;
        if (rowIsEffectivelyApproved(r)) continue;

        const pn = Number(r.partij_nr);
        const hoek = inferHoek(r);
        if (!Number.isFinite(pn) || !hoek) continue;

        const key = `${pn}-${hoek}-row`;
        if (seen.has(key)) continue;
        seen.add(key);

        const ctx = ctxByPn.get(pn);
        const info = getVaInfo(ctx, hoek);

        rows.push({
          partij_nr: pn,
          partij: safe(ctx?.partij_label ?? ctx?.partij_nr ?? pn, "-"),
          hoek,
          naam: getCurrentNaam(ctx, hoek),
          gym: getCurrentGym(ctx, hoek),
          current: safe(info.current, ""),
          prev: safe(info.prev, ""),
          melding: safe(r.boodschap ?? r.rule ?? "Fightpaspoortnummer ontbreekt", "Fightpaspoortnummer ontbreekt"),
        });
      }

      rows.sort((a, b) => a.partij_nr - b.partij_nr || a.hoek.localeCompare(b.hoek));

      let rno = START_ROW;
      for (const item of rows) {
        const row = ws.getRow(rno++);
        row.values = [item.partij, item.hoek, item.naam, item.gym, item.current, item.prev, item.melding];

        const isWhite = (row.number - START_ROW) % 2 === 0;
        styleRowFillAndFont(row, isWhite);
      }
    }

    {
      const ws = wb.addWorksheet("VA gewijzigd");

      ws.columns = [
        { header: "Partij_nr", width: 9 },
        { header: "Hoek", width: 9 },
        { header: "Naam", width: 28 },
        { header: "Sportschool", width: 26 },
        { header: "VA (MM oud)", width: 14 },
        { header: "VA (huidig)", width: 14 },
        { header: "Wijziging", width: 36 },
        { header: "Updated", width: 20 },
      ];

      writeHeaderBlock({
        ws,
        title: "FightSupport – VA nummer wijzigingen",
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

      const seen = new Set<string>();

      for (const ctx of ctxList) {
        const pn = Number((ctx as any)?.partij_nr);
        if (!Number.isFinite(pn)) continue;

        for (const side of ["rood", "blauw"] as const) {
          const info = getVaInfo(ctx, side);
          if (!info.changed) continue;

          const key = `${pn}-${side}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const naam = getCurrentNaam(ctx, side);
          const gym = getCurrentGym(ctx, side);

          changes.push({
            partij_nr: pn,
            hoek: side,
            naam,
            gym,
            prev: safe(info.prev, ""),
            current: safe(info.current, ""),
            label: `${safe(info.prev, "-")} → ${safe(info.current, "-")}`,
            updated: safe((ctx as any)?.updated_at ?? (ctx as any)?.created_at ?? "", ""),
          });
        }
      }

      for (const ev of auditEvents) {
        if (normCode(ev.event_type) !== "VA_CHANGED") continue;

        const pn = Number(ev.partij_nr);
        const hoek = ev.hoek === "blauw" ? "blauw" : "rood";
        if (!Number.isFinite(pn)) continue;

        const key = `${pn}-${hoek}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const ctx = ctxByPn.get(pn);
        const naam = getCurrentNaam(ctx, hoek);
        const gym = getCurrentGym(ctx, hoek);

        changes.push({
          partij_nr: pn,
          hoek,
          naam,
          gym,
          prev: safe(ev.old_va, ""),
          current: safe(ev.new_va, ""),
          label: `${safe(ev.old_va, "-")} → ${safe(ev.new_va, "-")}`,
          updated: safe(ev.created_at, ""),
        });
      }

      for (const r of resultaten) {
        if (!isFightpaspoortGewijzigd(r)) continue;
        if (rowIsEffectivelyApproved(r)) continue;

        const pn = Number(r.partij_nr);
        const hoek = inferHoek(r);
        if (!Number.isFinite(pn) || !hoek) continue;

        const key = `${pn}-${hoek}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const ctx = ctxByPn.get(pn);
        const info = getVaInfo(ctx, hoek);

        changes.push({
          partij_nr: pn,
          hoek,
          naam: getCurrentNaam(ctx, hoek),
          gym: getCurrentGym(ctx, hoek),
          prev: safe(info.prev, ""),
          current: safe(info.current, ""),
          label:
            info.prev || info.current
              ? `${safe(info.prev, "-")} → ${safe(info.current, "-")}`
              : safe(r.boodschap ?? r.rule ?? "Fightpaspoortnummer gewijzigd", "Fightpaspoortnummer gewijzigd"),
          updated: safe(r.created_at, ""),
        });
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
    }

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