import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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

/** Map a matchmaker_fighter_context row to FighterInput for the rules engine. */
function contextRowToInput(row: any): FighterInput {
  return {
    naam: s(row?.naam ?? row?.fp_naam ?? row?.naam_input),
    geboortedatum: s(row?.geboortedatum ?? row?.fp_geboortedatum ?? row?.geboortedatum_input),
    gewicht: toNum(row?.gewicht),
    geslacht: s(row?.geslacht),
    klasse: s(row?.klasse ?? row?.fp_klasse),
    partijen: toNum(row?.totaal_wedstrijden),
    licentie: s(row?.licentie),
    startverbod: s(row?.heeft_startverbod),
    keurmerk: s(row?.heeft_keurmerk),
    keurmerk_reden: null,
    extra: row?.extra ?? null,
  };
}

/** Fallback: map a raw body.rood/body.blauw object to FighterInput. */
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
    keurmerk: s(raw?.keurmerk),
    keurmerk_reden: s(raw?.keurmerk_reden),
    extra: raw?.extra ?? null,
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

    const matchmakingId = s(body?.matchmaking_id);
    const redId = s(body?.red_fighter_id);
    const blueId = s(body?.blue_fighter_id);
    const redInschrijvingId = s(body?.red_inschrijving_id);
    const blueInschrijvingId = s(body?.blue_inschrijving_id);

    let redInput: FighterInput | null = null;
    let blueInput: FighterInput | null = null;
    let eventDate: string | null = s(body?.eventDate);

    // Fetch real fighter data from the database when IDs are provided.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey && (redId || redInschrijvingId || blueId || blueInschrijvingId)) {
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });

      // Fetch event date from matchmakings table if not already provided.
      if (!eventDate && matchmakingId) {
        const { data: mm } = await admin
          .from("matchmaker_matchmakings")
          .select("datum, evenement_datum")
          .eq("id", matchmakingId)
          .maybeSingle();
        eventDate = s(mm?.datum ?? mm?.evenement_datum);

        // Fallback to the latest upload for this matchmaking.
        if (!eventDate) {
          const { data: upload } = await admin
            .from("matchmaking_uploads")
            .select("evenement_datum")
            .eq("matchmaking_id", matchmakingId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          eventDate = s(upload?.evenement_datum);
        }
      }

      // Helper: fetch a single fighter context row by its row id or inschrijving_id.
      async function fetchContext(
        fighterId: string | null,
        inschrijvingId: string | null
      ): Promise<FighterInput | null> {
        if (fighterId) {
          const { data } = await admin
            .from("matchmaker_fighter_context")
            .select("*")
            .eq("id", fighterId)
            .maybeSingle();
          if (data) return contextRowToInput(data);
        }
        if (inschrijvingId && matchmakingId) {
          const { data } = await admin
            .from("matchmaker_fighter_context")
            .select("*")
            .eq("matchmaking_id", matchmakingId)
            .eq("inschrijving_id", inschrijvingId)
            .maybeSingle();
          if (data) return contextRowToInput(data);
        }
        return null;
      }

      redInput = await fetchContext(redId, redInschrijvingId);
      blueInput = await fetchContext(blueId, blueInschrijvingId);
    }

    // Fall back to body.rood / body.blauw when DB lookup was not possible or returned nothing.
    if (!redInput) redInput = normalizeFighter(body?.rood ?? {});
    if (!blueInput) blueInput = normalizeFighter(body?.blauw ?? {});

    const boutInput: BoutRulesInput = {
      rood: redInput,
      blauw: blueInput,
      eventDate,
      discipline: s(body?.discipline),
    };

    const hits = boutRulesEngine(boutInput);

    return NextResponse.json({
      ok: true,
      input: boutInput,
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