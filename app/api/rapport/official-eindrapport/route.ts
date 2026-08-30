// app/api/rapport/official-eindrapport/route.ts
import { createClient } from "@supabase/supabase-js";
import { privateJson, requireMatchmakingAccess, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const matchmakingId = String(url.searchParams.get("matchmaking_id") ?? "").trim();
    if (!matchmakingId) {
      return privateJson({ ok: false, error: "matchmaking_id ontbreekt" }, 400);
    }

    await requireMatchmakingAccess(req, matchmakingId);

    const { data: runRows, error: runErr } = await supabase
      .from("controle_runs")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .order("gestart_op", { ascending: false })
      .limit(1);
    if (runErr) throw runErr;

    const run = runRows?.[0] ?? null;
    if (!run?.id) {
      return privateJson({ ok: false, error: "Geen controlerun gevonden." }, 404);
    }

    const [eventQ, ctxQ, tournamentQ, currentQ, resultQ, dispQ] = await Promise.all([
      supabase
        .from("matchmakings")
        .select("id,naam,datum,locatie,promotor,matchmaker_naam,matchmaker_id,maker_user_id,uploaded_by,bondteam,aantal_uren")
        .eq("id", matchmakingId)
        .maybeSingle(),
      supabase
        .from("controle_bout_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("controle_run_id", run.id)
        .order("partij_nr", { ascending: true }),
      supabase
        .from("controle_toernooi_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("controle_run_id", run.id),
      supabase
        .from("controle_fighter_actueel")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("controle_run_id", run.id),
      supabase
        .from("controle_resultaten")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("controle_run_id", run.id),
      supabase
        .from("dispensatie_requests")
        .select("*")
        .eq("matchmaking_id", matchmakingId),
    ]);

    for (const q of [eventQ, ctxQ, tournamentQ, currentQ, resultQ, dispQ]) {
      if (q.error) throw q.error;
    }

    const event = eventQ.data ? { ...eventQ.data } : null;

    // Oude uploads hebben soms wel matchmaker_id/maker_user_id/uploaded_by,
    // maar nog geen matchmaker_naam. user_profiles is daarvoor de bron.
    if (event && !String(event.matchmaker_naam ?? "").trim()) {
      const profileId = String(
        event.matchmaker_id ?? event.maker_user_id ?? event.uploaded_by ?? "",
      ).trim();

      if (profileId) {
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("id,full_name")
          .eq("id", profileId)
          .maybeSingle();

        if (profileError) throw profileError;
        if (String(profile?.full_name ?? "").trim()) {
          event.matchmaker_naam = String(profile?.full_name).trim();
        }
      }
    }

    return privateJson({
      ok: true,
      matchmaking_id: matchmakingId,
      run,
      event,
      bout_context: ctxQ.data ?? [],
      tournament_context: tournamentQ.data ?? [],
      fighter_actueel: currentQ.data ?? [],
      resultaten: resultQ.data ?? [],
      dispensaties: dispQ.data ?? [],
    });
  } catch (error) {
    return secureError(error);
  }
}
