import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "node:crypto";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const { data: invitation } = await supabaseAdmin.from("doping_invitations").select("id,va_nummer,expires_at").eq("upload_token", token).maybeSingle();
    if (!invitation) return NextResponse.json({ error: "Ongeldige link." }, { status: 404 });
    if ((invitation as any).expires_at && new Date((invitation as any).expires_at).getTime() < Date.now()) return NextResponse.json({ error: "Deze link is verlopen." }, { status: 410 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Geen bestand ontvangen." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Bestand is groter dan 10 MB." }, { status: 400 });
    const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.type)) return NextResponse.json({ error: "Gebruik PDF, JPG, PNG of WEBP." }, { status: 400 });

    const ext = (file.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const path = `${(invitation as any).va_nummer}/${Date.now()}_${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage.from("doping-certificates").upload(path, buffer, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { data: cert, error: certError } = await supabaseAdmin.from("doping_certificates").insert({
      va_nummer: String((invitation as any).va_nummer), invitation_id: (invitation as any).id, storage_path: path,
      original_filename: file.name, mime_type: file.type, size_bytes: file.size, status: "ontvangen",
    }).select("id").single();
    if (certError) throw certError;

    await supabaseAdmin.from("doping_fighters").upsert({
      va_nummer: String((invitation as any).va_nummer), workflow_status: "certificaat_ontvangen", certificate_status: "ontvangen",
      certificate_received_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: "va_nummer" });

    return NextResponse.json({ ok: true, certificate_id: (cert as any).id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Upload is mislukt." }, { status: 500 });
  }
}
