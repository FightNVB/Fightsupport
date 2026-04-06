import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function asText(v: unknown) {
  const s = String(v ?? "").trim();
  return s || null;
}

export async function POST(req: Request) {
  try {
    const auth = await requireUserWithRole(req, ["promotor", "admin", "superadmin"]);
    const body = await req.json();

    const naam = asText(body?.naam);
    const datum = asText(body?.datum);
    const locatie = asText(body?.locatie);
    const bondteam = asText(body?.bondteam);
    const disciplines = Array.isArray(body?.disciplines)
      ? body.disciplines.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [];

    if (!naam) return NextResponse.json({ error: "Naam is verplicht" }, { status: 400 });
    if (!datum) return NextResponse.json({ error: "Datum is verplicht" }, { status: 400 });
    if (!bondteam) return NextResponse.json({ error: "Bondteam is verplicht" }, { status: 400 });
    if (!disciplines.length) return NextResponse.json({ error: "Kies minimaal 1 discipline" }, { status: 400 });

    const userId = String((auth as any)?.user?.id ?? "").trim();
    const email = String((auth as any)?.user?.email ?? "").trim() || null;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, display_name, naam, name, username")
      .eq("user_id", userId)
      .maybeSingle();

    const promotorName =
      (profile as any)?.full_name ||
      (profile as any)?.display_name ||
      (profile as any)?.naam ||
      (profile as any)?.name ||
      (profile as any)?.username ||
      email ||
      userId;

    let voorkeurName: string | null = null;
    const voorkeurId = asText(body?.voorkeur_hoofdofficial_user_id);

    if (voorkeurId) {
      const { data: voorkeurProfile } = await supabase
        .from("user_profiles")
        .select("full_name, display_name, naam, name, username")
        .eq("user_id", voorkeurId)
        .maybeSingle();

      voorkeurName =
        (voorkeurProfile as any)?.full_name ||
        (voorkeurProfile as any)?.display_name ||
        (voorkeurProfile as any)?.naam ||
        (voorkeurProfile as any)?.name ||
        (voorkeurProfile as any)?.username ||
        voorkeurId;
    }

    const { data, error } = await supabase
      .from("event_requests")
      .insert({
        promotor_user_id: userId,
        promotor_name: promotorName,
        promotor_email: email,
        naam,
        datum,
        locatie,
        bondteam,
        disciplines,
        voorkeur_hoofdofficial_user_id: voorkeurId,
        voorkeur_hoofdofficial_name: voorkeurName,
        status: "nieuw",
        opmerking_promotor: asText(body?.opmerking_promotor),
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Opslaan mislukt" }, { status: 500 });
  }
}
