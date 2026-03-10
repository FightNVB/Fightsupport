import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function assertOwner(matchmaker_matchmaking_id: number, user_id: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmaker_matchmakings")
    .select("id, created_by")
    .eq("id", matchmaker_matchmaking_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Matchmaking niet gevonden.");
  if (String((data as any).created_by) !== String(user_id)) {
    throw new Error("Geen rechten om dit evenement te wijzigen.");
  }
  return true;
}

/**
 * POST body:
 * {
 *   matchmaker_matchmaking_id: number,
 *   user_id: string,
 *   fighter: {
 *     discipline?: string,
 *     klasse?: string,
 *     geslacht?: string,
 *     voornaam?: string,
 *     achternaam?: string,
 *     email?: string,
 *     gym?: string,
 *     va_nummer?: string,
 *     geboortedatum?: string,
 *     gewicht?: string,
 *     opmerkingen?: string
 *   }
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const mmId = Number(body?.matchmaker_matchmaking_id);
    const user_id = String(body?.user_id ?? "").trim();
    const fighter = (body?.fighter ?? {}) as Record<string, any>;

    if (!Number.isFinite(mmId) || !user_id) {
      return NextResponse.json({ error: "matchmaker_matchmaking_id en user_id zijn verplicht" }, { status: 400 });
    }

    await assertOwner(mmId, user_id);

    const row = {
      matchmaker_matchmaking_id: mmId,
      upload_id: null,
      row_nr: null,

      discipline: String(fighter?.discipline ?? "").trim() || null,
      klasse: String(fighter?.klasse ?? "").trim() || null,
      geslacht: String(fighter?.geslacht ?? "").trim() || null,

      voornaam: String(fighter?.voornaam ?? "").trim() || null,
      achternaam: String(fighter?.achternaam ?? "").trim() || null,
      email: String(fighter?.email ?? "").trim() || null,

      gym: String(fighter?.gym ?? "").trim() || null,
      va_nummer: String(fighter?.va_nummer ?? "").trim() || null,
      geboortedatum: String(fighter?.geboortedatum ?? "").trim() || null,
      gewicht: String(fighter?.gewicht ?? "").trim() || null,

      opmerkingen: String(fighter?.opmerkingen ?? "").trim() || null,
      raw: fighter ?? null,
      uploaded_by: user_id,
    };

    // minimaal naam
    if (!row.voornaam && !row.achternaam) {
      return NextResponse.json({ error: "Vul minimaal voornaam of achternaam in." }, { status: 400 });
    }

    // ✅ Handmatige inschrijving hoort in matchmaker_inschrijvingen (input-laag)
    const { error } = await supabaseAdmin.from("matchmaker_inschrijvingen").insert(row);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[matchmaker/manual-fighter] error", err);
    return NextResponse.json({ error: err?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
