import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export async function GET(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const { data, error } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(25);
    if (error) throw error;
    return NextResponse.json({ runs: data ?? [] });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Runs konden niet worden geladen." }, { status: 500 });
  }
}
