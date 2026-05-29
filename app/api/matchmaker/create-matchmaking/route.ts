import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const runtime = "nodejs";

function s(v: unknown) {
  return String(v ?? "").trim();
}

async function getUser(req: Request) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) throw new Error("Niet ingelogd.");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error(error?.message || "Niet ingelogd.");
  return data.user;
}

export async function POST(req: Request) {
  try {
    const user = await getUser(req);
    const body = await req.json().catch(() => ({}));

    const naam = s(body?.naam);
    const datum = s(body?.datum);
    const bondteam = s(body?.bondteam);

    if (!naam) return NextResponse.json({ error: "Naam is verplicht." }, { status: 400 });
    if (!datum) return NextResponse.json({ error: "Datum is verplicht." }, { status: 400 });
    if (!bondteam) return NextResponse.json({ error: "Bondteam is verplicht." }, { status: 400 });

    // FK-fix: matchmakings.matchmaker_id verwijst naar public.user_profiles.id.
    // Als de auth user nog geen profielrij heeft, crasht de insert op matchmakings.
    const { data: existingProfile, error: profileLookupErr } = await supabaseAdmin
      .from("user_profiles")
      .select("id,email,full_name,role,bondteam")
      .eq("id", user.id)
      .maybeSingle();

    if (profileLookupErr) throw profileLookupErr;

    let profile = existingProfile;

    if (!profile) {
      const meta = (user.user_metadata ?? {}) as Record<string, any>;
      const { data: createdProfile, error: profileInsertErr } = await supabaseAdmin
        .from("user_profiles")
        .insert({
          id: user.id,
          email: user.email ?? null,
          full_name: s(meta.full_name) || s(meta.name) || s(body?.matchmaker_naam) || null,
          role: s(meta.role) || "Matchmaker",
          bondteam: s(meta.bondteam) || bondteam || null,
        })
        .select("id,email,full_name,role,bondteam")
        .single();

      if (profileInsertErr) throw profileInsertErr;
      profile = createdProfile;
    }

    const now = new Date().toISOString();
    const insertRow = {
      naam,
      datum,
      locatie: s(body?.locatie) || null,
      promotor: s(body?.promotor) || null,
      bondteam,
      bron_type: "matchmaker_app",
      stadium: "concept_matchmaking",
      status: "concept_matchmaking",
      maker_type: "matchmaker",
      matchmaker_id: user.id,
      maker_user_id: user.id,
      uploaded_by: user.id,
      matchmaker_naam: s(body?.matchmaker_naam) || s(body?.matchmaker) || s(profile?.full_name) || null,
      huidige_eigenaar_type: "matchmaker",
      huidige_eigenaar_user_id: user.id,
      huidige_eigenaar_bondteam: null,
      locked_for_editing: false,
      created_at: now,
      last_updated_at: now,
      last_updated_by: user.id,
    };

    const { data, error } = await supabaseAdmin
      .from("matchmakings")
      .insert(insertRow)
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, matchmaking_id: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Aanmaken mislukt." }, { status: 500 });
  }
}
