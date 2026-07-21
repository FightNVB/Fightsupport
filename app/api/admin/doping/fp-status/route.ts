import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export async function POST(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const body = await req.json().catch(() => ({}));
    const va = String(body?.va_nummer || "");
    const status = String(body?.status || "");
    if (!va || !["processed", "failed", "pending"].includes(status)) return NextResponse.json({ error: "Ongeldige status." }, { status: 400 });
    const now = new Date().toISOString();
    await supabaseAdmin.from("doping_fighters").upsert({ va_nummer: va, fightpassport_status: status === "processed" ? "verwerkt" : status === "failed" ? "mislukt" : "wacht_op_verwerking", fightpassport_processed_at: status === "processed" ? now : null, fightpassport_error: status === "failed" ? String(body?.error || "Onbekende fout") : null, updated_at: now }, { onConflict: "va_nummer" });
    await supabaseAdmin.from("doping_fightpassport_queue").update({ status, processed_at: status === "processed" ? now : null, error_message: status === "failed" ? String(body?.error || "Onbekende fout") : null }).eq("va_nummer", va).eq("status", "pending");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Status bijwerken mislukt." }, { status: 500 });
  }
}
