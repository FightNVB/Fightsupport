import { NextRequest, NextResponse } from "next/server";
import { cleanVa, supabaseAdmin } from "@/lib/talentstatusAdmin";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

type Row = Record<string, any>;
type PdfPage = { ops: string[]; y: number; pageNo: number };

function safeText(value: any, max = 120) {
  return String(value ?? "-")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "")
    .slice(0, max);
}
function escPdf(value: any) { return safeText(value, 500).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
function wrap(value: any, max = 52) {
  const text = safeText(value, 500);
  if (text.length <= max) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    if ((cur + " " + word).trim().length > max) { if (cur) lines.push(cur); cur = word; }
    else cur = (cur + " " + word).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

function buildPdf(partijen: Row[], vechters: Row[]) {
  const pages: PdfPage[] = [];
  const addPage = () => {
    const page: PdfPage = { ops: [], y: 785, pageNo: pages.length + 1 };
    pages.push(page);
    // dark FightSupport header
    page.ops.push("0.06 0.06 0.06 rg 0 770 595 72 re f");
    page.ops.push("0.20 0.20 0.20 rg 0 760 595 10 re f");
    page.ops.push("1 0.30 0 rg 0 756 595 4 re f");
    page.ops.push("BT /F2 10 Tf 40 815 Td 1 0.30 0 rg (FIGHTSUPPORT) Tj ET");
    page.ops.push("BT /F2 22 Tf 40 790 Td 1 1 1 rg (Talentstatus rapport) Tj ET");
    page.ops.push(`BT /F1 8 Tf 455 815 Td 0.85 0.85 0.85 rg (${escPdf(new Date().toLocaleDateString("nl-NL"))}) Tj ET`);
    page.y = 730;
    return page;
  };
  let page = addPage();
  const ensure = (height = 20) => { if (page.y - height < 55) page = addPage(); };
  const text = (x: number, y: number, value: any, size = 9, bold = false, color = "0 0 0") => {
    page.ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td ${color} rg (${escPdf(value)}) Tj ET`);
  };
  const rect = (x: number, y: number, w: number, h: number, color: string) => page.ops.push(`${color} rg ${x} ${y} ${w} ${h} re f`);
  const stroke = (x: number, y: number, w: number, h: number, color = "0.65 0.65 0.65") => page.ops.push(`${color} RG ${x} ${y} ${w} ${h} re S`);
  const section = (title: string) => { ensure(34); rect(40, page.y - 6, 515, 24, "0.12 0.12 0.12"); rect(40, page.y - 8, 515, 3, "1 0.30 0"); text(52, page.y + 2, title.toUpperCase(), 11, true, "1 1 1"); page.y -= 38; };
  const stat = (x: number, label: string, value: any) => { rect(x, page.y - 12, 158, 42, "0.88 0.88 0.88"); stroke(x, page.y - 12, 158, 42); text(x + 12, page.y + 8, value, 16, true, "0 0 0"); text(x + 12, page.y - 5, label.toUpperCase(), 7, true, "0.30 0.30 0.30"); };

  stat(40, "Partijen", partijen.length); stat(218, "Talentstatus vechters", vechters.length); stat(396, "Controle", "NVB"); page.y -= 68;

  section("Partijen");
  if (!partijen.length) { text(48, page.y, "Geen partijen gevonden.", 9); page.y -= 18; }
  for (const p of partijen) {
    ensure(66);
    rect(40, page.y - 46, 515, 58, "0.96 0.96 0.96"); stroke(40, page.y - 46, 515, 58);
    rect(40, page.y - 46, 5, 58, p.vechter_talentstatus_ontbreekt || p.tegenstander_talentstatus_ontbreekt ? "0.75 0 0" : "0.05 0.45 0.10");
    text(52, page.y - 3, `${p.event_datum || "geen datum"}  |  ${p.event_naam || "-"}`, 8, true, "0 0 0");
    text(52, page.y - 18, `Vechter 1: ${p.vechter_naam || "-"}  VA ${p.vechter_va || "-"}  ${p.vechter_sportschool || "-"}`, 8, true, "1 0.30 0");
    text(52, page.y - 31, `Vechter 2: ${p.tegenstander_naam || "-"}  VA ${p.tegenstander_va || "-"}  ${p.tegenstander_sportschool || "-"}`, 8, true, "1 0.30 0");
    text(330, page.y - 18, `Winnaar: ${p.winnaar || "-"}`, 8, false, "0 0 0");
    text(330, page.y - 31, `Uitslag: ${p.uitslag || "-"}`, 8, false, "0 0 0");
    text(330, page.y - 44, p.vechter_talentstatus_ontbreekt || p.tegenstander_talentstatus_ontbreekt ? "Controle: status ontbreekt" : "Controle: OK", 8, true, p.vechter_talentstatus_ontbreekt || p.tegenstander_talentstatus_ontbreekt ? "0.75 0 0" : "0.05 0.45 0.10");
    page.y -= 68;
  }

  section("Talentstatus vechters");
  if (!vechters.length) { text(48, page.y, "Geen talentstatus vechters gevonden.", 9); page.y -= 18; }
  for (const v of vechters) {
    ensure(42);
    rect(40, page.y - 26, 515, 36, "0.96 0.96 0.96"); stroke(40, page.y - 26, 515, 36);
    text(52, page.y - 2, `${v.naam || "-"}  |  VA ${v.va_nummer || "-"}`, 9, true, "1 0.30 0");
    const detail = `${v.sportschool || "-"} | ${v.land || "-"} | talentstatus: ${v.talent_status || "-"} | status: ${v.moet_evalueren ? "evaluatie nodig" : (v.status || "-")} | partijen: ${v.partijen_totaal ?? 0}/${v.max_proef_partijen ?? 3}`;
    for (const line of wrap(detail, 95)) { text(52, page.y - 16, line, 8, false, "0 0 0"); }
    page.y -= 46;
  }

  // footer
  for (const p of pages) {
    p.ops.push("0.12 0.12 0.12 rg 0 0 595 34 re f");
    p.ops.push(`BT /F1 8 Tf 40 13 Td 0.85 0.85 0.85 rg (${escPdf(`FightSupport Talentstatus - pagina ${p.pageNo} van ${pages.length}`)}) Tj ET`);
  }

  const objects: string[] = [];
  const addObj = (body: string) => { objects.push(body); return objects.length; };
  const fontObj = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const boldObj = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageObjs: number[] = [];
  for (const p of pages) {
    const stream = p.ops.join("\n");
    const contentObj = addObj(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    const pageObj = addObj(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObj} 0 R /F2 ${boldObj} 0 R >> >> /Contents ${contentObj} 0 R >>`);
    pageObjs.push(pageObj);
  }
  const pagesObj = addObj(`<< /Type /Pages /Kids [${pageObjs.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageObjs.length} >>`);
  for (const pageObj of pageObjs) objects[pageObj - 1] = objects[pageObj - 1].replace("/Parent 0 0 R", `/Parent ${pagesObj} 0 R`);
  const catalogObj = addObj(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(pdf, "latin1")); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObj} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "rapport";
  const va = cleanVa(searchParams.get("va"));
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "alles";

  try {
    let partijenQuery = supabaseAdmin.from("v_talentstatus_partijen_overzicht").select("*").order("event_datum", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
    if (va) partijenQuery = partijenQuery.or(`vechter_va.eq.${va},tegenstander_va.eq.${va}`);
    if (q.trim()) partijenQuery = partijenQuery.or(`vechter_naam.ilike.%${q.trim()}%,tegenstander_naam.ilike.%${q.trim()}%,event_naam.ilike.%${q.trim()}%`);

    let vechtersQuery = supabaseAdmin.from("v_talentstatus_vechters_overzicht").select("*").order("naam", { ascending: true });
    if (status !== "alles") vechtersQuery = vechtersQuery.eq("status", status);
    if (va) vechtersQuery = vechtersQuery.eq("va_nummer", va);

    const [{ data: partijen, error: partijenError }, { data: vechters, error: vechtersError }] = await Promise.all([partijenQuery, vechtersQuery]);
    if (partijenError) throw partijenError;
    if (vechtersError) throw vechtersError;

    const pdf = buildPdf(type === "vechters" ? [] : (partijen ?? []), type === "partijen" ? [] : (vechters ?? []));
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"fightsupport-talentstatus-rapport.pdf\"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  }
}
