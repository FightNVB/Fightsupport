// app/api/rapport/matchmaker-eindrapport/route.ts
// Zelfstandig Matchmaker-eindrapport. Leest de laatste afgeronde live Matchmaker-eindcontrole.
import { createClient } from "@supabase/supabase-js";
import { privateJson, requireMatchmakingAccess, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth:{ persistSession:false } });

const MATCHMAKER_FINAL_RUN_TYPES = ["control-engine-matchmaker-total", "matchmaker_eindcontrole"];

export async function GET(req: Request) {
  try {
    const matchmakingId = String(new URL(req.url).searchParams.get("matchmaking_id") ?? "").trim();
    if (!matchmakingId) return privateJson({ ok:false, error:"matchmaking_id ontbreekt" }, 400);
    await requireMatchmakingAccess(req, matchmakingId);

    const { data:runs, error:runError } = await supabase.from("controle_runs").select("*")
      .eq("matchmaking_id",matchmakingId).in("run_type",MATCHMAKER_FINAL_RUN_TYPES).eq("status","klaar")
      .order("gestart_op",{ ascending:false }).limit(1);
    if (runError) throw runError; const run = runs?.[0];
    if (!run?.id) return privateJson({ ok:false, error:"Nog geen afgeronde Matchmaker-eindcontrole gevonden." },404);

    const [eventQ,ctxQ,tournamentQ,currentQ,resultQ,dispQ] = await Promise.all([
      supabase.from("matchmakings").select("id,naam,datum,locatie,promotor,matchmaker_naam,matchmaker_id,maker_user_id,uploaded_by,bondteam,aantal_uren").eq("id",matchmakingId).maybeSingle(),
      supabase.from("controle_bout_context").select("*").eq("matchmaking_id",matchmakingId).eq("controle_run_id",run.id).order("partij_nr"),
      supabase.from("controle_toernooi_context").select("*").eq("matchmaking_id",matchmakingId).eq("controle_run_id",run.id),
      supabase.from("controle_fighter_actueel").select("*").eq("matchmaking_id",matchmakingId).eq("controle_run_id",run.id),
      supabase.from("controle_resultaten").select("*").eq("matchmaking_id",matchmakingId).eq("controle_run_id",run.id),
      supabase.from("dispensatie_requests").select("*").eq("matchmaking_id",matchmakingId),
    ]);
    for (const q of [eventQ,ctxQ,tournamentQ,currentQ,resultQ,dispQ]) if (q.error) throw q.error;
    const event:any = eventQ.data ? { ...eventQ.data } : null;
    if (event && !String(event.matchmaker_naam ?? "").trim()) {
      const pid = String(event.matchmaker_id ?? event.maker_user_id ?? event.uploaded_by ?? "").trim();
      if (pid) { const { data:p, error:pe } = await supabase.from("user_profiles").select("full_name").eq("id",pid).maybeSingle(); if (pe) throw pe; if (p?.full_name) event.matchmaker_naam=String(p.full_name).trim(); }
    }
    return privateJson({ ok:true, report_role:"matchmaker", matchmaking_id:matchmakingId, run, event,
      bout_context:ctxQ.data ?? [], tournament_context:tournamentQ.data ?? [], fighter_actueel:currentQ.data ?? [],
      resultaten:resultQ.data ?? [], dispensaties:dispQ.data ?? [] });
  } catch (error) { return secureError(error); }
}
