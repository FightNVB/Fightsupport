import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export async function GET(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);

    const { data, error } = await supabaseAdmin
      .from("sportscholen")
      .select("sportschool_id, naam, plaats, land, team_sync_status, team_sync_error, updated_at")
      .in("team_sync_status", ["fout", "mislukt"])
      .order("sportschool_id", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ errors: data ?? [] });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[fightpassport-sync/team-errors] ophalen mislukt:", err);
    return NextResponse.json(
      { error: "Sportschoolfouten konden niet worden geladen." },
      { status: 500 }
    );
  }
}
