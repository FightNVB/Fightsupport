import { NextResponse } from "next/server";
import { requireMatchmakerAccess, supabaseAdmin } from "@/lib/matchmaker/access";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const mmId = Number(body?.matchmaker_matchmaking_id);
    const matchId = String(body?.match_id ?? "").trim();

    if (!Number.isFinite(mmId) || !matchId) {
      return NextResponse.json({ error: "matchmaker_matchmaking_id en match_id zijn verplicht" }, { status: 400 });
    }

    await requireMatchmakerAccess(req, mmId);

    const { error } = await supabaseAdmin
      .from("matchmaker_matches")
      .delete()
      .eq("matchmaker_matchmaking_id", mmId)
      .eq("id", matchId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
