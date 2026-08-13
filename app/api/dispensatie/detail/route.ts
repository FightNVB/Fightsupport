import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader, getUserRoleNames, hasAnyRole } from "@/lib/api/requireRole";
import { buildDispensatieSnapshot } from "@/lib/dispensatie/buildSnapshot";

export const runtime = "nodejs";
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function POST(req: Request) {
  try {
    const { supabase, userId } = await requireUserFromAuthHeader(req);
    const roles = await getUserRoleNames(supabase, userId);
    if (!hasAnyRole(roles, ["admin","superadmin","dispensatie_admin"])) return NextResponse.json({ error:"Geen rechten." }, { status:403 });
    const body = await req.json().catch(()=>({}));
    const requestId = String(body.request_id ?? "").trim();
    if (!requestId) return NextResponse.json({ error:"request_id ontbreekt." }, { status:400 });

    const { data: request, error } = await supabaseAdmin.from("dispensatie_requests").select("*").eq("id", requestId).single();
    if (error) throw error;

    let snapshot = request.snapshot_json ?? null;
    if (request.matchmaking_id) {
      try {
        const fresh = await buildDispensatieSnapshot(supabaseAdmin, request.matchmaking_id, request.partij_nr);
        snapshot = { ...(snapshot ?? {}), ...fresh, bout: fresh.bout ?? snapshot?.bout ?? null, context: fresh.context ?? snapshot?.context ?? null };
      } catch {}
    }

    const [{ data:votes }, { data:messages }, { data:attachments }] = await Promise.all([
      supabaseAdmin.from("dispensatie_votes").select("*").eq("request_id", requestId).order("updated_at", { ascending:false }),
      supabaseAdmin.from("dispensatie_messages").select("*").eq("request_id", requestId).order("created_at", { ascending:true }),
      supabaseAdmin.from("dispensatie_attachments").select("*").eq("request_id", requestId).order("uploaded_at", { ascending:false }),
    ]);

    return NextResponse.json({ request, snapshot, votes:votes ?? [], messages:messages ?? [], attachments:attachments ?? [], roles, can_decide: hasAnyRole(roles,["superadmin"]) });
  } catch (e:any) { return NextResponse.json({ error:e?.message ?? String(e) }, { status:500 }); }
}
