import { NextResponse } from "next/server";
import {
  boutRulesEngine,
  type BoutRulesInput,
  type FighterInput,
} from "@/lib/boutRulesEngine";

export const runtime = "nodejs";

function s(v: unknown): string | null {
  const x = String(v ?? "").trim();
  return x || null;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function normalizeFighter(raw: any): FighterInput {
  return {
    naam: s(raw?.naam),
    geboortedatum: s(raw?.geboortedatum),
    gewicht: toNum(raw?.gewicht),
    geslacht: s(raw?.geslacht),
    klasse: s(raw?.klasse),
    partijen: toNum(raw?.partijen),
    licentie: s(raw?.licentie),
    startverbod: s(raw?.startverbod),
  };
}

function normalizeInput(body: any): BoutRulesInput {
  return {
    rood: normalizeFighter(body?.rood ?? {}),
    blauw: normalizeFighter(body?.blauw ?? {}),
    eventDate: s(body?.eventDate),
    discipline: s(body?.discipline),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Geen geldige JSON body ontvangen." },
        { status: 400 }
      );
    }

    const input = normalizeInput(body);

    if (!input.rood && !input.blauw) {
      return NextResponse.json(
        { ok: false, error: "Geen vechterdata ontvangen." },
        { status: 400 }
      );
    }

    const hits = boutRulesEngine(input);

    return NextResponse.json({
      ok: true,
      input,
      hits,
      count: hits.length,
    });
  } catch (err: any) {
    console.error("[api/matchmaker/bout-rules/evaluate] error", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Onbekende fout",
      },
      { status: 500 }
    );
  }
}