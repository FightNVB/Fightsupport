import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";
import { normalizeDopingClass, normalizeDopingDiscipline } from "@/lib/doping";

export async function GET(req: Request, ctx: { params: Promise<{ va: string }> }) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const { va } = await ctx.params;
    const { data: fighter, error } = await supabaseAdmin.from("fightpassport_fighters").select("*").eq("va_nummer", va).maybeSingle();
    if (error) throw error;
    if (!fighter) return NextResponse.json({ error: "Vechter niet gevonden." }, { status: 404 });

    const [{ data: results }, { data: gyms }, { data: bans }, { data: licenses }, { data: workflow }, { data: invites }, { data: certificates }, { data: queue }] = await Promise.all([
      supabaseAdmin.from("fightpassport_results").select("*").eq("va_nummer", va).order("datum", { ascending: false }),
      supabaseAdmin.from("fightpassport_fighter_gyms").select("*").eq("va_nummer", va),
      supabaseAdmin.from("fightpassport_startbans").select("*").eq("va_nummer", va).order("einde", { ascending: false }),
      supabaseAdmin.from("fightpassport_licenses").select("*").eq("va_nummer", va),
      supabaseAdmin.from("doping_fighters").select("*").eq("va_nummer", va).maybeSingle(),
      supabaseAdmin.from("doping_invitations").select("id,email_to,invitation_type,sent_at,delivery_status,delivery_error,created_at").eq("va_nummer", va).order("created_at", { ascending: false }),
      supabaseAdmin.from("doping_certificates").select("*").eq("va_nummer", va).order("uploaded_at", { ascending: false }),
      supabaseAdmin.from("doping_fightpassport_queue").select("*").eq("va_nummer", va).order("created_at", { ascending: false }),
    ]);

    const discipline = normalizeDopingDiscipline((fighter as any).primary_discipline ?? (fighter as any).nulmeting_discipline ?? ((fighter as any).mma_level ? "MMA" : null));
    const klasse = discipline === "MMA" ? normalizeDopingClass((fighter as any).mma_level ?? (fighter as any).berekende_klasse ?? (fighter as any).nulmeting_klasse) : normalizeDopingClass((fighter as any).berekende_klasse ?? (fighter as any).nulmeting_klasse);

    const signedCertificates = [] as any[];
    for (const c of certificates ?? []) {
      const { data } = await supabaseAdmin.storage.from("doping-certificates").createSignedUrl(String((c as any).storage_path), 1800);
      signedCertificates.push({ ...c, signed_url: data?.signedUrl ?? null });
    }

    return NextResponse.json({ fighter: { ...fighter, discipline, klasse }, results: results ?? [], gyms: gyms ?? [], startbans: bans ?? [], licenses: licenses ?? [], workflow: workflow ?? null, invitations: invites ?? [], certificates: signedCertificates, queue: queue ?? [] });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error(err);
    return NextResponse.json({ error: "Vechterdetail kon niet worden geladen." }, { status: 500 });
  }
}
