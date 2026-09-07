import { NextRequest, NextResponse } from "next/server";
import { requireUserWithRole, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUserWithRole(req, ["matchmaker", "admin", "superadmin"]);

    let query = supabaseAdmin
      .from("matchmaker_matchmaking_snapshots")
      .select(`
        id,
        matchmaking_id,
        matchmaker_user_id,
        snapshot_type,
        evenement_naam,
        evenement_datum,
        locatie,
        promotor,
        bondteam,
        status_op_moment,
        stadium_op_moment,
        totaal_partijen,
        created_at
      `)
      .order("created_at", { ascending: false });

    // Matchmakers zien uitsluitend hun eigen snapshots.
    // Admin/superadmin mogen desgewenst alle snapshots zien.
    if (!['admin', 'superadmin'].includes(auth.role)) {
      query = query.eq("matchmaker_user_id", auth.authUserId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Snapshots laden mislukt." },
      { status: 500 },
    );
  }
}
