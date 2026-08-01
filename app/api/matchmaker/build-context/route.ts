import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processMatchmakingFighters } from "@/lib/matchmaker/processMatchmakingFighters";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const runtime = "nodejs";

function s(v: unknown) {
  return String(v ?? "").trim();
}

/**
 * Bouwt de matchmaker-context rechtstreeks uit:
 *   aanmeldingen + fightpassport_fighters + fightpassport_results + startverbod.
 * De oude matchmaker_fighters_raw/fighters_raw tussenlaag wordt niet meer gebruikt.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmaking_id ?? body?.matchmaker_matchmaking_id);
    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    }

    const result = await processMatchmakingFighters({
      supabase: supabaseAdmin,
      matchmakingId,
      controleRunId: s(body?.controle_run_id) || undefined,
    });

    const ontbrekend = result.contexts.filter(
      (row: Record<string, any>) => row?.controle_status === "controle_mislukt",
    ).length;
    const naamAfwijkingen = result.contexts.filter(
      (row: Record<string, any>) => row?.naam_match === false,
    ).length;

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      count: result.processed,
      gecontroleerd: result.processed - ontbrekend,
      controle_mislukt: ontbrekend,
      naam_afwijkingen: naamAfwijkingen,
      controle_run_id: result.controleRunId,
      rule_hits: result.hits.length,
      startverbod_bron: "startverbod",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Context opbouwen mislukt" },
      { status: 500 },
    );
  }
}
