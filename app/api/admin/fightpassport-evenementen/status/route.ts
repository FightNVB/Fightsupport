import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "superadmin"];

export async function GET(req: Request) {
  try {
    await requireRole(req, ALLOWED_ROLES);

    const { data: run, error } = await supabaseAdmin
      .from("fightpassport_event_sync_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!run) return NextResponse.json({ run: null, items: [] });

    const { data: items, error: itemsError } = await supabaseAdmin
      .from("fightpassport_event_sync_items")
      .select(
        "event_id,status,exists_in_fightpassport,evenement_naam,evenement_datum,error_code,error_message,finished_at",
      )
      .eq("sync_run_id", run.id)
      .order("event_id", { ascending: false })
      .limit(100);

    if (itemsError) throw itemsError;
    return NextResponse.json({ run, items: items ?? [] });
  } catch (err: any) {
    if (err instanceof NextResponse) return err;
    console.error("[fightpassport-evenementen/status] laden mislukt:", err);
    return NextResponse.json(
      { error: err?.message || "Scraperstatus kon niet worden geladen." },
      { status: 500 },
    );
  }
}
