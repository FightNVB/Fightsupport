import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, any>;
type FighterAnalysis = {
  va: string; naam: string; sportschool: string; bondteam: string; totaal: number; events: number;
  eerste: string; laatste: string; avgDays: number | null; minDays: number | null; last90: number; last365: number;
  score: number; label: string; advies: string;
};

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

function s(v: unknown) { return String(v ?? "").trim(); }
function n(v: unknown, fb = 0) { const x = Number(v); return Number.isFinite(x) ? x : fb; }
function d(v: unknown) { const raw = s(v); if (!raw) return null; const out = new Date(raw); return Number.isNaN(out.getTime()) ? null : out; }
function fmtDate(v: unknown) { const x = d(v); return x ? new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(x) : (s(v) || "-"); }
function dateKey(v: unknown) { return d(v)?.toISOString().slice(0, 10) || s(v) || "geen-datum"; }
function daysBetween(a: unknown, b: unknown) { const da = d(a)?.getTime(); const db = d(b)?.getTime(); if (!da || !db) return null; return Math.round(Math.abs(db - da) / 86400000); }
function points(r: Row) { return Math.max(1, n(r.gewicht_strafpunt, 1)); }
function gewicht(r: Row) { const a = s(r.doorgegeven_gewicht); const b = s(r.gewogen_gewicht); return a && b ? `${a} → ${b}` : (b || a || "-"); }
function first(...values: unknown[]) { for (const v of values) { const out = s(v); if (out) return out; } return ""; }

function matches(r: Row, q: string) {
  const query = q.toLowerCase(); if (!query) return true;
  return [r.va_nummer, r.naam, r.sportschool, r.bondteam, r.evenement_naam, r.evenement_datum, r.hoek, r.discipline, r.klasse, r.reden, r.gewogen_gewicht]
    .map((x) => s(x).toLowerCase()).join(" | ").includes(query);
}

async function loadRows(q: string) {
  const { data, error } = await supabase.from("min_punten_overzicht").select("*").order("evenement_datum", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false, nullsFirst: false }).limit(20000);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).filter((r) => matches(r, q));
}

function topMap(rows: Row[], keyFn: (r: Row) => string, limit = 10) {
  const m = new Map<string, number>();
  for (const r of rows) { const k = keyFn(r) || "Onbekend"; m.set(k, (m.get(k) ?? 0) + points(r)); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function analyseFighters(rows: Row[]): FighterAnalysis[] {
  const m = new Map<string, Row[]>();
  for (const r of rows) { const va = s(r.va_nummer) || `zonder-va-${r.id}`; m.set(va, [...(m.get(va) ?? []), r]); }
  const now = Date.now();
  return [...m.entries()].map(([va, list]) => {
    const sorted = [...list].sort((a, b) => (d(a.evenement_datum || a.created_at)?.getTime() ?? 0) - (d(b.evenement_datum || b.created_at)?.getTime() ?? 0));
    const firstRow = sorted[0] ?? {}; const lastRow = sorted[sorted.length - 1] ?? {};
    const dateVals = sorted.map((r) => r.evenement_datum || r.created_at).filter(Boolean);
    const diffs: number[] = [];
    for (let i = 1; i < dateVals.length; i++) { const x = daysBetween(dateVals[i - 1], dateVals[i]); if (x !== null) diffs.push(x); }
    const avgDays = diffs.length ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length) : null;
    const minDays = diffs.length ? Math.min(...diffs) : null;
    const last90 = list.filter((r) => { const t = d(r.evenement_datum || r.created_at)?.getTime(); return t ? now - t <= 90 * 86400000 : false; }).reduce((a, r) => a + points(r), 0);
    const last365 = list.filter((r) => { const t = d(r.evenement_datum || r.created_at)?.getTime(); return t ? now - t <= 365 * 86400000 : false; }).reduce((a, r) => a + points(r), 0);
    const totaal = list.reduce((a, r) => a + points(r), 0);
    const events = new Set(list.map((r) => `${dateKey(r.evenement_datum)}::${s(r.evenement_naam)}`)).size;
    let score = Math.min(100, totaal * 12 + last90 * 18 + last365 * 3 + (minDays !== null && minDays <= 90 ? 15 : 0) + (events >= 3 ? 10 : 0));
    const label = score >= 80 ? "ROOD - veelpleger" : score >= 55 ? "ORANJE - recidive" : score >= 30 ? "GEEL - monitoren" : "GROEN - normaal";
    const advies = score >= 80 ? "Actief opvolgen met sportschool" : score >= 55 ? "Bespreken bij volgende aanmelding" : score >= 30 ? "Monitoren" : "Geen directe actie";
    return { va, naam: first(lastRow.naam, firstRow.naam, "Onbekend"), sportschool: first(lastRow.sportschool, firstRow.sportschool, "-"), bondteam: first(lastRow.bondteam, firstRow.bondteam, "-"), totaal, events, eerste: fmtDate(firstRow.evenement_datum || firstRow.created_at), laatste: fmtDate(lastRow.evenement_datum || lastRow.created_at), avgDays, minDays, last90, last365, score, label, advies };
  }).sort((a, b) => b.score - a.score || b.totaal - a.totaal);
}

async function makeExcel(rows: Row[]) {
  const wb = new ExcelJS.Workbook(); wb.creator = "FightSupport"; wb.created = new Date();
  const fighters = analyseFighters(rows);
  const ws = wb.addWorksheet("Analyse vechters");
  ws.columns = [
    ["VA", 14], ["Naam", 28], ["Sportschool", 26], ["Bondteam", 14], ["Totaal minpunten", 16], ["Evenementen", 14], ["Eerste minpunt", 16], ["Laatste minpunt", 16], ["Gem. tussenruimte", 18], ["Kortste tussenruimte", 18], ["Laatste 90 dagen", 16], ["Laatste 12 maanden", 18], ["Risicoscore", 14], ["Risico", 22], ["Advies", 28]
  ].map(([header, width]) => ({ header: String(header), key: String(header), width: Number(width) }));
  for (const f of fighters) ws.addRow({ "VA": f.va, "Naam": f.naam, "Sportschool": f.sportschool, "Bondteam": f.bondteam, "Totaal minpunten": f.totaal, "Evenementen": f.events, "Eerste minpunt": f.eerste, "Laatste minpunt": f.laatste, "Gem. tussenruimte": f.avgDays === null ? "-" : `${f.avgDays} dagen`, "Kortste tussenruimte": f.minDays === null ? "-" : `${f.minDays} dagen`, "Laatste 90 dagen": f.last90, "Laatste 12 maanden": f.last365, "Risicoscore": f.score, "Risico": f.label, "Advies": f.advies });
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }; ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF4D00" } };
  ws.autoFilter = { from: "A1", to: "O1" }; ws.views = [{ state: "frozen", ySplit: 1 }];

  const top = wb.addWorksheet("Top veelplegers"); top.columns = ws.columns; fighters.slice(0, 25).forEach((f) => top.addRow(ws.columns!.reduce((o: any, c: any) => { o[c.key] = (f as any)[String(c.key)] ?? ""; return o; }, {})));
  const ev = wb.addWorksheet("Per evenement"); ev.columns = [{ header: "Datum", key: "datum", width: 16 }, { header: "Evenement", key: "event", width: 32 }, { header: "Minpunten", key: "punten", width: 14 }, { header: "Unieke vechters", key: "vechters", width: 16 }];
  const eventMap = new Map<string, Row[]>(); rows.forEach((r) => { const k = `${dateKey(r.evenement_datum)}::${s(r.evenement_naam) || "Onbekend"}`; eventMap.set(k, [...(eventMap.get(k) ?? []), r]); });
  [...eventMap.entries()].sort((a,b)=>a[0].localeCompare(b[0])).forEach(([k, list]) => { const [datum, event] = k.split("::"); ev.addRow({ datum: fmtDate(datum), event, punten: list.reduce((a,r)=>a+points(r),0), vechters: new Set(list.map(r=>s(r.va_nummer))).size }); });
  const raw = wb.addWorksheet("Alle minpunten"); raw.columns = [{header:"Datum",key:"datum",width:16},{header:"Evenement",key:"event",width:32},{header:"VA",key:"va",width:14},{header:"Naam",key:"naam",width:28},{header:"Sportschool",key:"sportschool",width:26},{header:"Bondteam",key:"bondteam",width:14},{header:"Gewicht",key:"gewicht",width:16},{header:"Minpunt",key:"punt",width:12},{header:"Reden",key:"reden",width:34}];
  rows.forEach(r=>raw.addRow({datum:fmtDate(r.evenement_datum||r.created_at),event:s(r.evenement_naam),va:s(r.va_nummer),naam:s(r.naam),sportschool:s(r.sportschool),bondteam:s(r.bondteam)||"-",gewicht:gewicht(r),punt:points(r),reden:s(r.reden)}));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function addLogo(doc: jsPDF) {
  try { const p = path.join(process.cwd(), "public", "branding", "fightsupport", "fightsupport1.png"); if (fs.existsSync(p)) doc.addImage(fs.readFileSync(p).toString("base64"), "PNG", 14, 10, 56, 18); } catch {}
}
function barChart(doc: jsPDF, title: string, data: [string, number][], x: number, y: number, w: number, h: number) {
  doc.setTextColor(255,255,255); doc.setFontSize(13); doc.text(title, x, y); const max = Math.max(1, ...data.map((d)=>d[1])); let yy = y + 8;
  data.slice(0,8).forEach(([label,val]) => { const bw = (val/max) * (w-45); doc.setFillColor(255,77,0); doc.rect(x+42, yy-4, bw, 5, "F"); doc.setTextColor(220,220,220); doc.setFontSize(8); doc.text(label.slice(0,22), x, yy); doc.text(String(val), x+44+bw, yy); yy += 8; });
}
function makePdf(rows: Row[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" }); const fighters = analyseFighters(rows); const totaal = rows.reduce((a,r)=>a+points(r),0); const veelplegers = fighters.filter(f=>f.score>=80).length; const recidive = fighters.filter(f=>f.score>=55).length;
  doc.setFillColor(5,5,5); doc.rect(0,0,210,297,"F"); addLogo(doc);
  doc.setTextColor(255,77,0); doc.setFontSize(20); doc.text("MINPUNTEN ANALYSE", 14, 42); doc.setTextColor(220,220,220); doc.setFontSize(10); doc.text(`Gegenereerd: ${fmtDate(new Date())}`, 14, 49);
  const cards = [["Totaal minpunten", totaal],["Unieke vechters", fighters.length],["Veelplegers", veelplegers],["Recidive/monitor", recidive],["Evenementen", new Set(rows.map(r=>`${dateKey(r.evenement_datum)}::${s(r.evenement_naam)}`)).size]];
  cards.forEach(([label,value],i)=>{ const x=14+(i%3)*63; const y=62+Math.floor(i/3)*28; doc.setFillColor(18,18,18); doc.roundedRect(x,y,58,22,2,2,"F"); doc.setTextColor(170,170,170); doc.setFontSize(7); doc.text(String(label).toUpperCase(),x+4,y+7); doc.setTextColor(255,77,0); doc.setFontSize(17); doc.text(String(value),x+4,y+17); });
  barChart(doc,"Top sportscholen", topMap(rows,r=>s(r.sportschool),8),14,126,82,70); barChart(doc,"Top evenementen", topMap(rows,r=>s(r.evenement_naam),8),112,126,82,70);
  autoTable(doc, { startY: 205, head: [["Risico", "VA", "Naam", "Sportschool", "Punten", "90d", "12m", "Advies"]], body: fighters.slice(0,12).map(f=>[f.label, f.va, f.naam, f.sportschool, f.totaal, f.last90, f.last365, f.advies]), theme: "grid", styles: { fontSize: 7, textColor: [20,20,20] }, headStyles: { fillColor: [255,77,0], textColor: [255,255,255] } });
  doc.addPage(); doc.setFillColor(5,5,5); doc.rect(0,0,210,297,"F"); addLogo(doc); doc.setTextColor(255,77,0); doc.setFontSize(16); doc.text("DETAILANALYSE VECHTERS",14,38);
  autoTable(doc, { startY: 46, head: [["VA","Naam","Sportschool","Bondteam","Totaal","Events","Eerste","Laatste","Gem.","Kortste","90d","12m","Score","Advies"]], body: fighters.map(f=>[f.va,f.naam,f.sportschool,f.bondteam,f.totaal,f.events,f.eerste,f.laatste,f.avgDays??"-",f.minDays??"-",f.last90,f.last365,f.score,f.advies]), theme:"grid", styles:{fontSize:6, textColor:[20,20,20]}, headStyles:{fillColor:[255,77,0],textColor:[255,255,255]} });
  return Buffer.from(doc.output("arraybuffer"));
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url); const format = s(url.searchParams.get("format") || "xlsx").toLowerCase(); const q = s(url.searchParams.get("q")); const rows = await loadRows(q);
    if (format === "pdf") return new NextResponse(makePdf(rows), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="fightsupport-minpunten-analyse.pdf"` } });
    return new NextResponse(await makeExcel(rows), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="fightsupport-minpunten-analyse.xlsx"` } });
  } catch (e:any) { return NextResponse.json({ ok:false, error:e?.message ?? String(e) }, { status:500 }); }
}
