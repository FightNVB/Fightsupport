// app/api/import/template/parse/route.ts
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { parsePastedMatchmaking } from "@/lib/import/pasteMatchmakingParser";

export const runtime = "nodejs";

function cellToString(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    // exceljs rich / formula / etc.
    if ((v as any)?.text) return String((v as any).text);
    if ((v as any)?.result !== undefined) return String((v as any).result);
  }
  return String(v);
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ ok: false, error: "Geen bestand ontvangen (field: file)." }, { status: 400 });
    }

    const ab = await (file as File).arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(ab));

    const ws = wb.worksheets?.[0];
    if (!ws) {
      return NextResponse.json({ ok: false, error: "Geen werkblad gevonden in dit bestand." }, { status: 400 });
    }

    // Converteer sheet → TSV (zodat exact dezelfde parser gebruikt wordt)
    // Leest tot eerste 2000 rijen / 50 kolommen (veiligheidslimiet)
    const maxRows = Math.min(ws.rowCount || 0, 2000);
    const maxCols = Math.min(ws.columnCount || 0, 50);

    const lines: string[] = [];
    for (let r = 1; r <= maxRows; r++) {
      const row = ws.getRow(r);
      const vals: string[] = [];
      let hasAny = false;

      for (let c = 1; c <= maxCols; c++) {
        const v = row.getCell(c).value;
        const s = cellToString(v).replace(/\r?\n/g, " ").trim();
        if (s) hasAny = true;
        vals.push(s);
      }

      // sla volledig lege rijen over
      if (!hasAny) continue;

      // TSV lijn
      lines.push(vals.join("\t"));
    }

    const tsv = lines.join("\n").trim();
    if (!tsv) {
      return NextResponse.json({ ok: false, error: "Bestand bevat geen leesbare data." }, { status: 400 });
    }

    const result = parsePastedMatchmaking(tsv);
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Onbekende fout bij template upload parse." }, { status: 500 });
  }
}