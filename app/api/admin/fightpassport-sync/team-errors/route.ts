import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export async function GET(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);

    const url = new URL(req.url);
    const runId = String(url.searchParams.get("run_id") ?? "").trim();

    if (!runId) {
      return NextResponse.json(
        { error: "run_id ontbreekt." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("fightpassport_team_sync_items")
      .select(
        "id, sync_run_id, sportschool_id, sportschool_naam, plaats, status, error_message, attempts, fighter_links, started_at, finished_at, created_at, updated_at",
      )
      .eq("sync_run_id", runId)
      .in("status", ["error", "fout", "failed", "mislukt"])
      .order("sportschool_id", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ errors: data ?? [] });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error("[fightpassport-sync/team-errors] ophalen mislukt:", err);
    return NextResponse.json(
      { error: "Sportschoolfouten konden niet worden geladen." },
      { status: 500 },
    );
  }
}
