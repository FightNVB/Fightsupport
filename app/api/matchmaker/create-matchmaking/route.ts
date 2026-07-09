import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAnyRole } from "@/app/api/_utils/authz";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const runtime = "nodejs";

function s(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const auth = await requireAnyRole(req, ["matchmaker"]);
    const body = await req.json().catch(() => ({}));

    const naam = s(body?.naam);
    const datum = s(body?.datum);
    const bondteam = s(body?.bondteam);

    if (!naam) return NextResponse.json({ error: "Naam is verplicht." }, { status: 400 });
    if (!datum) return NextResponse.json({ error: "Datum is verplicht." }, { status: 400 });
    if (!bondteam) return NextResponse.json({ error: "Bondteam is verplicht." }, { status: 400 });

    const userId = auth.userId;
    const profile = auth.profile;

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
      matchmaker_id: userId,
      maker_user_id: userId,
      uploaded_by: userId,
      matchmaker_naam: s(body?.matchmaker_naam) || s(body?.matchmaker) || s(profile?.full_name) || null,
      huidige_eigenaar_type: "matchmaker",
      huidige_eigenaar_user_id: userId,
      huidige_eigenaar_bondteam: null,
      locked_for_editing: false,
      created_at: now,
      last_updated_at: now,
      last_updated_by: userId,
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
