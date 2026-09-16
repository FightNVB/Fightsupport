// app/api/rapport/admin-eindrapport/route.ts
// Zelfstandig Admin-eindrapport. Leest uitsluitend de laatste afgeronde volledige Admin-run.
import { createClient } from "@supabase/supabase-js";
import { privateJson, requireMatchmakingAccess, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

function norm(v: any) { return String(v ?? "").trim().toLowerCase(); }
function va(v: any) { const d = String(v ?? "").replace(/\D/g, ""); return /^\d{3,6}$/.test(d) ? d : ""; }
function activeResult(row: any) {
  const result = norm(row?.resultaat), review = norm(row?.review_status);
  if (["approved","accepted","goedgekeurd","akkoord","resolved","afgehandeld","closed"].includes(review)) return false;
  return result !== "ok" && result !== "info";
}
function fighterProjection(ctxRows: any[], tournamentRows: any[], resultRows: any[]) {
  const byVa = new Map<string, any>(); const sideVa = new Map<string, string>();
  const add = (raw: any, data: any) => { const key = va(raw); if (!key) return; const prev = byVa.get(key) ?? { va_nummer:key, licentie_ok:true, startverbod_actief:false, keurmerk_ok:true, sportschool:null, land:null, error_message:null }; byVa.set(key, { ...prev, ...data, va_nummer:key }); };
  for (const row of ctxRows ?? []) {
    const partij = Number(row?.partij_nr);
    for (const side of ["rood","blauw"] as const) {
      const key = va(row?.[`${side}_va_mm`] ?? row?.[`${side}_va_fp`] ?? row?.[`va_${side}`] ?? row?.[`${side}_va`] ?? row?.[`${side}_fighter_id`]);
      if (!key) continue; if (partij > 0) sideVa.set(`${partij}|${side}`, key);
      const reason = String(row?.[side === "rood" ? "keurmerk_reden_rood" : "keurmerk_reden_blauw"] ?? "");
      const landMatch = reason.match(/\((?:[^,()]+,\s*)?([^()]+)\)/);
      add(key, { sportschool: row?.[`${side}_gym_mm`] ?? row?.[`${side}_sportschool_mm`] ?? row?.[`${side}_gym_fp`] ?? row?.[`${side}_gym`] ?? null, land: landMatch?.[1]?.trim() || row?.[`${side}_land_fp`] || row?.[`${side}_land`] || null });
    }
  }
  for (const row of tournamentRows ?? []) add(row?.va_nummer ?? row?.fighter_id, { sportschool: row?.sportschool_mm ?? row?.sportschool ?? null, land: row?.land ?? null });
  for (const r of (resultRows ?? []).filter(activeResult)) {
    let key = va(r?.fighter_id ?? r?.toernooi_va_nummer ?? r?.va_nummer);
    if (!key && Number(r?.partij_nr) > 0 && ["rood","blauw"].includes(r?.hoek)) key = sideVa.get(`${Number(r.partij_nr)}|${r.hoek}`) ?? "";
    const cur = byVa.get(key); if (!cur) continue; const code = String(r?.rule_code ?? r?.rule ?? "").toUpperCase();
    if (code.includes("LICENT")) cur.licentie_ok = false; if (code.includes("STARTVERBOD")) cur.startverbod_actief = true; if (code.includes("KEURMERK") || code.includes("SPORTSCHOOL_NIET_GEVONDEN")) cur.keurmerk_ok = false;
  }
  return [...byVa.values()];
}

export async function GET(req: Request) {
  try {
    const matchmakingId = String(new URL(req.url).searchParams.get("matchmaking_id") ?? "").trim();
    if (!matchmakingId) return privateJson({ ok:false, error:"matchmaking_id ontbreekt" }, 400);
    await requireMatchmakingAccess(req, matchmakingId);
    const { data: runs, error: runError } = await supabase.from("controle_runs").select("*").eq("matchmaking_id", matchmakingId).eq("run_type","control-engine-admin-total").eq("status","klaar").order("gestart_op", { ascending:false }).limit(1);
    if (runError) throw runError; const run = runs?.[0];
    if (!run?.id) return privateJson({ ok:false, error:"Nog geen afgeronde admincontrole gevonden. Draai eerst de admincontrole." }, 404);
    const [eventQ,ctxQ,tournamentQ,resultQ,dispQ] = await Promise.all([
      supabase.from("matchmakings").select("id,naam,datum,locatie,promotor,matchmaker_naam,matchmaker_id,maker_user_id,uploaded_by,bondteam,aantal_uren").eq("id",matchmakingId).maybeSingle(),
      supabase.from("controle_bout_context").select("*").eq("matchmaking_id",matchmakingId).eq("controle_run_id",run.id).order("partij_nr"),
      supabase.from("controle_toernooi_context").select("*").eq("matchmaking_id",matchmakingId).eq("controle_run_id",run.id),
      supabase.from("controle_resultaten").select("*").eq("matchmaking_id",matchmakingId).eq("controle_run_id",run.id),
      supabase.from("dispensatie_requests").select("*").eq("matchmaking_id",matchmakingId),
    ]);
    for (const q of [eventQ,ctxQ,tournamentQ,resultQ,dispQ]) if (q.error) throw q.error;
    const event:any = eventQ.data ? { ...eventQ.data } : null;
    if (event && !String(event.matchmaker_naam ?? "").trim()) { const pid = String(event.matchmaker_id ?? event.maker_user_id ?? event.uploaded_by ?? "").trim(); if (pid) { const { data:p } = await supabase.from("user_profiles").select("full_name").eq("id",pid).maybeSingle(); if (p?.full_name) event.matchmaker_naam = String(p.full_name).trim(); } }
    return privateJson({ ok:true, report_role:"admin", matchmaking_id:matchmakingId, run, event, bout_context:ctxQ.data ?? [], tournament_context:tournamentQ.data ?? [], fighter_actueel:fighterProjection(ctxQ.data ?? [], tournamentQ.data ?? [], resultQ.data ?? []), resultaten:resultQ.data ?? [], dispensaties:dispQ.data ?? [] });
  } catch (error) { return secureError(error); }
}
