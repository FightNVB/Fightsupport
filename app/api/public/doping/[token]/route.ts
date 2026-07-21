import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const { data: invitation, error } = await supabaseAdmin
      .from("doping_invitations")
      .select("id,va_nummer,email_to,expires_at,created_at")
      .eq("upload_token", token)
      .maybeSingle();
    if (error) throw error;
    if (!invitation) return NextResponse.json({ error: "Ongeldige link." }, { status: 404 });
    if ((invitation as any).expires_at && new Date((invitation as any).expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Deze link is verlopen." }, { status: 410 });
    }
    const { data: fighter } = await supabaseAdmin.from("fightpassport_fighters").select("va_nummer,naam").eq("va_nummer", (invitation as any).va_nummer).maybeSingle();
    const { data: certs } = await supabaseAdmin.from("doping_certificates").select("id,status,uploaded_at,original_filename").eq("invitation_id", (invitation as any).id).order("uploaded_at", { ascending: false });
    return NextResponse.json({ fighter, invitation: { id: (invitation as any).id }, certificates: certs ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Pagina kon niet worden geladen." }, { status: 500 });
  }
}
