// app/api/officials/lineup/finalize-pdf/route.ts
// Generate a landscape A4 PDF of the lineup for a matchmaking.
// Requires matchmaker, hoofdofficial, admin, or superadmin role.

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole, supabaseAdmin } from "@/app/api/_utils/authz";
import { ERRORS } from "@/lib/constants/errors";

export const runtime = "nodejs";

function isUuid(v: any): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(v ?? "").trim()
  );
}

function safe(v: any, fallback = "-"): string {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function formatDate(v: string | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function buildHtml(bouts: any[], info: { evenement_naam?: string | null; evenement_datum?: string | null; bondteam?: string | null }): string {
  const rows = bouts
    .map((b, i) => {
      const bg = i % 2 === 0 ? "#ffffff" : "#f5f5f5";
      const sortNr = i + 1;
      return `
        <tr style="background:${bg};">
          <td style="text-align:center;">${sortNr}</td>
          <td>${safe(b.discipline)}</td>
          <td>${safe(b.klasse_mm)}</td>
          <td style="color:#b91c1c;font-weight:600;">${safe(b.rood_naam)}</td>
          <td style="color:#b91c1c;">${safe(b.rood_gym)}</td>
          <td style="text-align:center;font-weight:700;color:#6b7280;">vs</td>
          <td style="color:#1d4ed8;font-weight:600;">${safe(b.blauw_naam)}</td>
          <td style="color:#1d4ed8;">${safe(b.blauw_gym)}</td>
        </tr>`;
    })
    .join("\n");

  const totalBouts = bouts.length;
  // Dynamically scale font size to fit ~40 bouts per page
  const fontSize = totalBouts <= 20 ? 11 : totalBouts <= 30 ? 10 : totalBouts <= 40 ? 9 : 8;

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <style>
    @page { size: A4 landscape; margin: 12mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: ${fontSize}pt;
      color: #111;
      background: #fff;
    }
    .header {
      text-align: center;
      margin-bottom: 8px;
    }
    .header img {
      height: 40px;
      width: auto;
      margin-bottom: 4px;
    }
    .event-info {
      font-size: ${fontSize + 1}pt;
      font-weight: 700;
      color: #2a2a2a;
      margin-bottom: 2px;
    }
    .event-meta {
      font-size: ${fontSize - 1}pt;
      color: #555;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    thead tr {
      background: #2a2a2a;
      color: #fff;
    }
    thead th {
      padding: 5px 6px;
      text-align: left;
      font-weight: 700;
      font-size: ${fontSize - 0.5}pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border: 1px solid #c0c0c0;
    }
    tbody td {
      padding: 4px 6px;
      border: 1px solid #c0c0c0;
      vertical-align: middle;
    }
    .footer {
      display: none;
    }
    @media print {
      .footer {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="event-info">${safe(info.evenement_naam, "FightSupport Event")}</div>
    <div class="event-meta">${formatDate(info.evenement_datum)} &nbsp;|&nbsp; ${safe(info.bondteam)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:40px;text-align:center;">#</th>
        <th style="width:120px;">Discipline</th>
        <th style="width:100px;">Klasse</th>
        <th>Rood Naam</th>
        <th>Sportschool</th>
        <th style="width:28px;text-align:center;">vs</th>
        <th>Blauw Naam</th>
        <th>Sportschool</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="footer">© FIGHTSUPPORT — ${totalBouts} partijen — gegenereerd op ${new Date().toLocaleDateString("nl-NL")}</div></body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAnyRole(req, [
      "matchmaker",
      "hoofdofficial",
      "admin",
      "superadmin",
    ]);

    const body = await req.json().catch(() => ({}));
    const matchmakingId = String(body?.matchmaking_id ?? "").trim();

    if (!isUuid(matchmakingId)) {
      return NextResponse.json(
        { error: ERRORS.INVALID_UUID("matchmaking_id") },
        { status: 400 }
      );
    }

    // Fetch matchmaking info
    const { data: mmInfo } = await supabaseAdmin
      .from("matchmaking_uploads")
      .select("evenement_naam, evenement_datum, bondteam")
      .eq("matchmaking_id", matchmakingId)
      .maybeSingle();

    // Fetch bouts
    const { data: bouts, error: boutsErr } = await supabaseAdmin
      .from("definitive_matchmaking_bouts")
      .select(
        "id, partij_nr, sort_order, discipline, klasse_mm, rood_naam, rood_gym, blauw_naam, blauw_gym, eindstatus"
      )
      .eq("matchmaking_id", matchmakingId)
      .in("eindstatus", ["OK", "GOEDGEKEURD_MET_DISPENSATIE"])
      .order("sort_order", { ascending: true })
      .order("partij_nr", { ascending: true });

    if (boutsErr) {
      return NextResponse.json({ error: boutsErr.message }, { status: 500 });
    }

    if (!bouts || bouts.length === 0) {
      return NextResponse.json(
        { error: "Geen OK partijen gevonden voor PDF export." },
        { status: 400 }
      );
    }

    const html = buildHtml(bouts, mmInfo ?? {});

    // Use puppeteer to generate PDF
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate: `<div style="font-size:7pt;color:#888;width:100%;text-align:center;padding-top:2mm;">
          © FIGHTSUPPORT &nbsp;|&nbsp; Pagina <span class="pageNumber"></span> van <span class="totalPages"></span>
        </div>`,
      });

      // Audit log (non-fatal if table does not exist)
      await supabaseAdmin.from("lineup_pdf_log").insert({
        matchmaking_id: matchmakingId,
        gegenereerd_door: userId,
        bestand_naam: `lineup_${matchmakingId}.pdf`,
        partijen_count: bouts.length,
      }).then(() => undefined).catch((err) => console.error("[lineup-pdf-audit]", err));

      const eventSlug = safe(mmInfo?.evenement_naam, "lineup")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .slice(0, 40);
      const filename = `lineup_${eventSlug}_${matchmakingId.slice(0, 8)}.pdf`;

      return new NextResponse(pdfBuffer as Buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (e: any) {
    console.error("[lineup/finalize-pdf]", e);
    return NextResponse.json(
      { error: e?.message ?? "PDF genereren mislukt" },
      { status: 500 }
    );
  }
}
