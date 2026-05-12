import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";
import { ensureLifecycleRecord, transferLifecycle } from "@/app/api/_utils/matchmakingLifecycle";

export const runtime = "nodejs";
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
function bad(message: string, status = 400, extra?: unknown) { return NextResponse.json({ ok: false, error: message, extra }, { status }); }

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req);
    const body = await req.json().catch(() => ({}));
    const matchmaking_id = String(body?.matchmaking_id ?? "").trim();
    if (!matchmaking_id) return bad("matchmaking_id ontbreekt");
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    const { data: rows, error: rowsErr } = await supabaseAdmin
      .from("matchmaking_bouts_raw")
      .select("id")
      .eq("matchmaking_id", matchmaking_id)
      .limit(1);
    if (rowsErr) return bad("Ophalen matchmaking_bouts_raw mislukt", 500, rowsErr);
    if (!rows?.length) return bad("Geen partijen gevonden in matchmaking_bouts_raw voor deze matchmaking.", 404);

    await ensureLifecycleRecord({ matchmakingId: matchmaking_id, bronType: "matchmaker_app", stage: "bij_matchmaker_in_bewerking", ownerType: "matchmaker", ownerUserId: userId, actorUserId: userId, actorRole: role, metadata: { route: "api/matchmaker/submit-to-control/route" } });
    const lifecycle = await transferLifecycle({ matchmakingId: matchmaking_id, newStage: "ingediend_admin", newOwnerType: "admin", actorUserId: userId, actorRole: role, opmerking: "Matchmaker heeft de matchmaking doorgestuurd naar admin.", metadata: { route: "api/matchmaker/submit-to-control/route" } });

    const now = new Date().toISOString();
    await supabaseAdmin.from("matchmakings").update({ stadium: "ingediend_admin", status: "ingediend_admin", huidige_eigenaar_type: "admin", huidige_eigenaar_user_id: null, huidige_eigenaar_bondteam: null, submitted_to_admin_at: now, last_updated_at: now, last_updated_by: userId }).eq("id", matchmaking_id);

    return NextResponse.json({ ok: true, matchmaking_id, lifecycle, message: "Matchmaking is doorgestuurd naar admin en verdwijnt uit de matchmaker-lijst tot admin hem terugstuurt." });
  } catch (err: any) {
    return bad(err?.message ?? "Onbekende fout.", 500);
  }
}
