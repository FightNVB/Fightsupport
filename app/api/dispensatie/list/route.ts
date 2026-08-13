import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader, hasAnyRoleFromReq } from "@/lib/api/requireRole";

export const runtime = "nodejs";
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function POST(req: Request) {
  try {
    await requireUserFromAuthHeader(req);
    const ok = await hasAnyRoleFromReq(req, ["admin", "superadmin", "dispensatie_admin"]);
    if (!ok) return NextResponse.json({ error: "Geen rechten." }, { status: 403 });

    const { data: rows, error } = await supabaseAdmin
      .from("dispensatie_requests")
      .select("id,status,decision,decision_reason,decided_at,decided_by,matchmaking_id,partij_nr,bout_id,rule_code,rule,reason,evenement_naam,evenement_datum,snapshot_json,created_at,updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;

    const ids = [...new Set((rows ?? []).map((r:any)=>r.matchmaking_id).filter(Boolean))];
    const mmBy = new Map<string, any>();
    const eventBy = new Map<string, any>();
    const upBy = new Map<string, any>();

    if (ids.length) {
      const { data: mm } = await supabaseAdmin.from("matchmakings").select("id,naam,datum,event_id").in("id", ids);
      for (const x of mm ?? []) mmBy.set(String(x.id), x);
      const eventIds = [...new Set((mm ?? []).map((x:any)=>x.event_id).filter(Boolean))];
      if (eventIds.length) {
        const { data: events } = await supabaseAdmin.from("events").select("id,naam,datum").in("id", eventIds);
        for (const x of events ?? []) eventBy.set(String(x.id), x);
      }
      const { data: ups } = await supabaseAdmin.from("matchmaking_uploads").select("matchmaking_id,evenement_naam,evenement_datum,uploaded_at").in("matchmaking_id", ids).order("uploaded_at", { ascending: false });
      for (const x of ups ?? []) if (!upBy.has(String(x.matchmaking_id))) upBy.set(String(x.matchmaking_id), x);
    }

    const merged = (rows ?? []).map((r:any) => {
      const snap = r.snapshot_json ?? {};
      const mm = r.matchmaking_id ? mmBy.get(String(r.matchmaking_id)) : null;
      const ev = mm?.event_id ? eventBy.get(String(mm.event_id)) : null;
      const up = r.matchmaking_id ? upBy.get(String(r.matchmaking_id)) : null;
      return {
        ...r,
        evenement_naam: r.evenement_naam ?? snap.evenement_naam ?? mm?.naam ?? ev?.naam ?? up?.evenement_naam ?? null,
        evenement_datum: r.evenement_datum ?? snap.evenement_datum ?? mm?.datum ?? ev?.datum ?? up?.evenement_datum ?? null,
      };
    });

    return NextResponse.json({ rows: merged });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
