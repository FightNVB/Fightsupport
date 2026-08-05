import { NextResponse } from "next/server";
import { assertCanAccessMatchmaking, requireUserWithRole, supabaseAdmin } from "@/app/api/_utils/authz";
import { privateJson, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = String(body?.matchmaking_id ?? "").trim();

    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt." }, { status: 400 });
    }

    const auth = await requireUserWithRole(req, ["hoofdofficial", "admin", "superadmin"]);
    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId: auth.userId, role: auth.role });

    const { data: uploads, error: findErr } = await supabaseAdmin
      .from("matchmaking_uploads")
      .select("id, matchmaking_id")
      .eq("matchmaking_id", matchmakingId);

    if (findErr) throw findErr;

    if (!uploads || uploads.length === 0) {
      return NextResponse.json(
        { error: "Geen matchmaking_uploads gevonden voor deze matchmaking." },
        { status: 404 }
      );
    }

    const nowIso = new Date().toISOString();

    const { error: updateErr } = await supabaseAdmin
      .from("matchmaking_uploads")
      .update({
        returned_to_matchmaker: true,
        returned_to_matchmaker_at: nowIso,
        returned_to_matchmaker_by: auth.userId,
      })
      .eq("matchmaking_id", matchmakingId);

    if (updateErr) throw updateErr;

    return privateJson({
      ok: true,
      matchmaking_id: matchmakingId,
      updated_count: uploads.length,
      message: "✅ Matchmaking is teruggestuurd naar de matchmaker.",
    });
  } catch (e: any) {
    return secureError(e, "Matchmaking kon niet worden teruggestuurd.");
  }
}
