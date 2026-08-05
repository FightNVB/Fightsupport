import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PRIVATE_NO_STORE, requireAdminAccess, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ yocId: string }> };

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

function normalizeVa(v: unknown) {
  return String(v ?? "").replace(/\D/g, "").replace(/^0+/, "");
}
function isYes(v: unknown) {
  const s = String(v ?? "").trim().toLowerCase();
  return ["ja", "yes", "true", "1", "actief", "geldig", "ok"].includes(s) || v === true;
}
function isNo(v: unknown) {
  const s = String(v ?? "").trim().toLowerCase();
  return ["nee", "no", "false", "0", "geen", "niet", "ongeldig"].includes(s) || v === false;
}
function jaNee(v: unknown) {
  if (isYes(v)) return "Ja";
  if (isNo(v)) return "Nee";
  return "Onbekend";
}
function weight(v: unknown) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 9999;
}
function contextFor(f: any, byId: Map<string, any>, byVa: Map<string, any>) {
  const va = normalizeVa(f.va_nummer_mm ?? f.va_nummer ?? f.va);
  return byId.get(String(f.id)) || (va ? byVa.get(va) : null) || null;
}
function statusFor(rows: any[]) {
  const meldingen = rows.filter((r) => String(r.resultaat || "").toLowerCase() !== "ok");
  if (!meldingen.length) return "OK";
  if (meldingen.some((r) => r.resultaat === "afgekeurd")) return "AFKEUR";
  if (meldingen.some((r) => r.resultaat === "actie")) return "ACTIE";
  return "OK";
}
function rowsFor(f: any, c: any, byF: Map<string, any[]>, byRaw: Map<string, any[]>) {
  return byF.get(String(f.id)) || (c?.fighter_raw_id ? byRaw.get(String(c.fighter_raw_id)) : null) || [];
}
function checks(c: any) {
  return {
    licentie: jaNee(c?.licentie_ok ?? c?.licentie),
    startverbod: isYes(c?.heeft_startverbod ?? c?.startverbod) ? "Ja" : isNo(c?.heeft_startverbod ?? c?.startverbod) ? "Nee" : "Onbekend",
    keurmerk: jaNee(c?.keurmerk_ok ?? c?.heeft_keurmerk ?? c?.keurmerk),
  };
}
function escPdf(s: unknown) {
  return String(s ?? "").replace(/[\\()]/g, "\\$&").replace(/[\r\n]+/g, " ");
}
function textLine(x: number, y: number, size: number, text: string, font = "F1") {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${escPdf(text)}) Tj ET\n`;
}
function makePdf(lines: string[]) {
  const objects: string[] = [];
  const pages: number[] = [];
  let pageOps = "";
  let y = 790;
  const addPage = () => {
    const stream = `q 1 1 1 rg 0 0 595 842 re f Q\n${pageOps}`;
    const contentObjNo = objects.length + 1;
    objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}endstream`);
    const pageObjNo = objects.length + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjNo} 0 R >>`);
    pages.push(pageObjNo);
    pageOps = "";
    y = 790;
  };
  const add = (line: string, size = 9, font = "F1") => {
    if (y < 45) addPage();
    pageOps += textLine(32, y, size, line.slice(0, 120), font);
    y -= size + 5;
  };
  for (const line of lines) add(line, line.startsWith("YOC RAPPORT") ? 18 : line.startsWith("---") ? 11 : 8.5, line.startsWith("YOC RAPPORT") || line.startsWith("---") ? "F2" : "F1");
  addPage();
  const catalog = `<< /Type /Catalog /Pages 2 0 R >>`;
  const pagesObj = `<< /Type /Pages /Kids [${pages.map((p) => `${p} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  const font1 = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
  const font2 = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`;
  const all = [catalog, pagesObj, font1, font2, ...objects];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  all.forEach((obj, i) => { offsets.push(Buffer.byteLength(pdf, "latin1")); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${all.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= all.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size ${all.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

export async function GET(req: Request, { params }: Params) {
  try {
    await requireAdminAccess(req);
    const { yocId } = await params;
    const supabase = adminClient();
    const [{ data: event }, { data: fighters, error: fErr }, { data: contexts }, { data: results }] = await Promise.all([
      supabase.from("yoc_events").select("*").eq("id", yocId).maybeSingle(),
      supabase.from("yoc_fighters").select("*").eq("yoc_event_id", yocId),
      supabase.from("yoc_fighter_context").select("*").eq("yoc_event_id", yocId),
      supabase.from("yoc_resultaten").select("*").eq("yoc_event_id", yocId),
    ]);
    if (fErr) throw fErr;

    const byId = new Map<string, any>();
    const byVa = new Map<string, any>();
    for (const c of contexts || []) {
      if (c.yoc_fighter_id) byId.set(String(c.yoc_fighter_id), c);
      const va = normalizeVa(c.va_nummer ?? c.va ?? c.fighter_id);
      if (va) byVa.set(va, c);
    }
    const byF = new Map<string, any[]>();
    const byRaw = new Map<string, any[]>();
    for (const r of results || []) {
      if (r.yoc_fighter_id) byF.set(String(r.yoc_fighter_id), [...(byF.get(String(r.yoc_fighter_id)) || []), r]);
      if (r.fighter_raw_id) byRaw.set(String(r.fighter_raw_id), [...(byRaw.get(String(r.fighter_raw_id)) || []), r]);
    }

    const sorted = [...(fighters || [])].sort((a, b) => weight(a.gewicht_mm ?? a.gewicht) - weight(b.gewicht_mm ?? b.gewicht));
    const summary = { ok: 0, actie: 0, afkeur: 0 };
    const lines = [
      `YOC RAPPORT - ${event?.naam || event?.event_name || "YOC"}`,
      `Datum: ${event?.event_datum || "-"}   Locatie: ${event?.locatie || "-"}   Deelnemers: ${sorted.length}`,
      "",
      "--- Overzicht gesorteerd op gewicht ---",
      "KG | VA | Naam | Sportschool | Licentie | Startverbod | Keurmerk | Status | Meldingen",
    ];
    for (const f of sorted) {
      const c = contextFor(f, byId, byVa);
      const rr = rowsFor(f, c, byF, byRaw);
      const st = statusFor(rr);
      if (st === "OK") summary.ok++; else if (st === "AFKEUR") summary.afkeur++; else summary.actie++;
      const ck = checks(c);
      const meldingen = rr.filter((r) => String(r.resultaat || "").toLowerCase() !== "ok").map((r) => r.boodschap || r.rule_code || r.rule).filter(Boolean).join(" | ") || "geen meldingen";
      lines.push(`${f.gewicht_mm ?? f.gewicht ?? "-"} | ${f.va_nummer_mm ?? "-"} | ${f.naam_mm ?? "-"} | ${f.sportschool_mm ?? "-"} | ${ck.licentie} | ${ck.startverbod} | ${ck.keurmerk} | ${st} | ${meldingen}`);
    }
    lines.splice(3, 0, `Samenvatting: OK ${summary.ok} / ACTIE ${summary.actie} / AFKEUR ${summary.afkeur}`);

    const pdf = makePdf(lines);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="yoc-rapport-${yocId}.pdf"`,
        "Cache-Control": PRIVATE_NO_STORE,
      },
    });
  } catch (e: any) {
    return secureError(e, "YOC-rapport kon niet worden gemaakt.");
  }
}
