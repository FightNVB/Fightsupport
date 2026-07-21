import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export async function POST(req: Request) {
  try {
    const { userId } = await requireRole(req, ["admin", "superadmin"]);
    const body = await req.json().catch(() => ({}));
    const id = String(body?.certificate_id || "");
    const action = String(body?.action || "");
    const reason = String(body?.reason || "").trim() || null;
    if (!id || !["approve", "reject"].includes(action)) return NextResponse.json({ error: "Ongeldige actie." }, { status: 400 });
    const { data: cert } = await supabaseAdmin.from("doping_certificates").select("id,va_nummer").eq("id", id).maybeSingle();
    if (!cert) return NextResponse.json({ error: "Certificaat niet gevonden." }, { status: 404 });
    const approved = action === "approve";
    const now = new Date().toISOString();
    await supabaseAdmin.from("doping_certificates").update({ status: approved ? "goedgekeurd" : "afgekeurd", reviewed_at: now, reviewed_by: userId, rejection_reason: approved ? null : reason }).eq("id", id);
    await supabaseAdmin.from("doping_fighters").upsert({ va_nummer: String((cert as any).va_nummer), workflow_status: approved ? "goedgekeurd" : "afgekeurd", certificate_status: approved ? "goedgekeurd" : "afgekeurd", certificate_reviewed_at: now, certificate_reviewed_by: userId, certificate_rejection_reason: approved ? null : reason, fightpassport_status: approved ? "wacht_op_verwerking" : "niet_verwerkt", updated_at: now }, { onConflict: "va_nummer" });
    if (approved) {
      await supabaseAdmin.from("doping_fightpassport_queue").insert({ va_nummer: String((cert as any).va_nummer), certificate_id: id, status: "pending", payload: { source: "doping_review" } });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Beoordeling mislukt." }, { status: 500 });
  }
}
