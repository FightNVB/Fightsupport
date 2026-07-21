import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";
import { normalizeDopingClass, normalizeDopingDiscipline } from "@/lib/doping";

export const runtime = "nodejs";

async function sendResend(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY ontbreekt");
  const from = process.env.DOPING_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "FightSupport <noreply@fightsupport.nl>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || `Resend ${response.status}`);
  return body;
}

export async function POST(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const body = await req.json().catch(() => ({}));
    const disciplineWanted = String(body?.discipline || "ALL").toUpperCase();
    const classesWanted = Array.isArray(body?.classes) ? body.classes.map((x: any) => String(x).toUpperCase()) : [];
    const selectedVa = Array.isArray(body?.va_nummers) ? new Set(body.va_nummers.map(String)) : null;
    const reminder = Boolean(body?.reminder);

    const { data: fighters, error } = await supabaseAdmin.from("fightpassport_fighters").select("va_nummer,naam,email,primary_discipline,nulmeting_discipline,nulmeting_klasse,berekende_klasse,mma_level").not("email", "is", null).limit(20000);
    if (error) throw error;

    const candidates = (fighters ?? []).filter((f: any) => {
      if (selectedVa && !selectedVa.has(String(f.va_nummer))) return false;
      const d = normalizeDopingDiscipline(f.primary_discipline ?? f.nulmeting_discipline ?? (f.mma_level ? "MMA" : null));
      const k = d === "MMA" ? normalizeDopingClass(f.mma_level ?? f.berekende_klasse ?? f.nulmeting_klasse) : normalizeDopingClass(f.berekende_klasse ?? f.nulmeting_klasse);
      if (disciplineWanted !== "ALL" && d !== disciplineWanted) return false;
      if (classesWanted.length && !classesWanted.includes(String(k ?? ""))) return false;
      return Boolean(f.email);
    });

    let sent = 0, skipped = 0, failed = 0;
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    for (const f of candidates) {
      const { data: existing } = await supabaseAdmin.from("doping_invitations").select("id").eq("va_nummer", String((f as any).va_nummer)).eq("invitation_type", "uitnodiging").maybeSingle();
      if (existing && !reminder) { skipped++; continue; }

      const type = reminder ? "herinnering" : "uitnodiging";
      const { data: invitation, error: inviteError } = await supabaseAdmin.from("doping_invitations").insert({ va_nummer: String((f as any).va_nummer), email_to: String((f as any).email), invitation_type: type, subject: reminder ? "Herinnering verplichte dopingeducatie" : "Verplichte dopingeducatie" }).select("id,upload_token").single();
      if (inviteError) { failed++; continue; }
      const link = `${origin}/doping/${(invitation as any).upload_token}`;
      const subject = reminder ? "Herinnering: rond je dopingeducatie af" : "Uitnodiging: verplichte dopingeducatie";
      const html = `<p>Beste ${(f as any).naam || "vechter"},</p><p>Via de onderstaande persoonlijke pagina kun je na het afronden van de dopingeducatie jouw certificaat indienen bij de NVB.</p><p><a href="${link}">Open jouw persoonlijke certificaatpagina</a></p><p>Met vriendelijke groet,<br>Nederlandse Vechtsport Bond</p>`;
      try {
        await sendResend(String((f as any).email), subject, html);
        await supabaseAdmin.from("doping_invitations").update({ sent_at: new Date().toISOString(), delivery_status: "sent" }).eq("id", (invitation as any).id);
        await supabaseAdmin.from("doping_fighters").upsert({ va_nummer: String((f as any).va_nummer), workflow_status: reminder ? "herinnerd" : "uitgenodigd", last_invited_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "va_nummer" });
        sent++;
      } catch (e: any) {
        await supabaseAdmin.from("doping_invitations").update({ delivery_status: "failed", delivery_error: e?.message || String(e) }).eq("id", (invitation as any).id);
        failed++;
      }
    }
    return NextResponse.json({ ok: true, selected: candidates.length, sent, skipped, failed });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Mailing mislukt." }, { status: 500 });
  }
}
