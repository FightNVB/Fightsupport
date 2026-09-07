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

    if (!["admin", "superadmin"].includes(auth.role)) {
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

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireUserWithRole(req, ["matchmaker", "admin", "superadmin"]);
    const body = await req.json().catch(() => ({}));
    const id = String((body as any)?.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Snapshot-id ontbreekt." },
        { status: 400 },
      );
    }

    let query = supabaseAdmin
      .from("matchmaker_matchmaking_snapshots")
      .delete()
      .eq("id", id);

    // Matchmaker mag uitsluitend een eigen snapshot verwijderen.
    if (!["admin", "superadmin"].includes(auth.role)) {
      query = query.eq("matchmaker_user_id", auth.authUserId);
    }

    const { data, error } = await query.select("id").maybeSingle();
    if (error) throw error;

    if (!data?.id) {
      return NextResponse.json(
        { ok: false, error: "Snapshot niet gevonden of geen toegang." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Snapshot verwijderen mislukt." },
      { status: 500 },
    );
  }
}
