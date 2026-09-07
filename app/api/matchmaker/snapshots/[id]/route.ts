import { NextRequest, NextResponse } from "next/server";
import { requireUserWithRole, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUserWithRole(req, ["matchmaker", "admin", "superadmin"]);
    const { id } = await params;

    let query = supabaseAdmin
      .from("matchmaker_matchmaking_snapshots")
      .select("*")
      .eq("id", id);

    if (!['admin', 'superadmin'].includes(auth.role)) {
      query = query.eq("matchmaker_user_id", auth.authUserId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Snapshot niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, snapshot: data });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Snapshot laden mislukt." },
      { status: 500 },
    );
  }
}
