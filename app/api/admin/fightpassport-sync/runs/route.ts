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


export async function DELETE(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const url = new URL(req.url);
    const runId = url.searchParams.get("run_id");

    if (!runId) {
      return NextResponse.json({ error: "Run-id ontbreekt." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .delete()
      .eq("id", runId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Synchronisatieregel kon niet worden verwijderd." }, { status: 500 });
  }
}
