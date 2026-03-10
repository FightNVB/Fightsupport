// app/api/import/paste/route.ts
import { NextResponse } from "next/server";
import { parsePastedMatchmaking } from "@/lib/import/pasteMatchmakingParser";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const pasted_text = String(body?.pasted_text ?? "").trim();

    if (!pasted_text) {
      return NextResponse.json({ ok: false, error: "Geen tekst ontvangen." }, { status: 400 });
    }

    const result = parsePastedMatchmaking(pasted_text);

    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Onbekende fout bij paste import." }, { status: 500 });
  }
}