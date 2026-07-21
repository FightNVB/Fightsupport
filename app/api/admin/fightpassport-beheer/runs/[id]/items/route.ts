import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const { id } = await params;
    const { data, error } = await supabaseAdmin.from("fightpassport_sync_items").select("*").eq("sync_run_id", id).order("va_nummer", { ascending: true }).limit(50000);
    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch (err: any) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: err?.message || "Run-details konden niet worden geladen." }, { status: 500 });
  }
}
