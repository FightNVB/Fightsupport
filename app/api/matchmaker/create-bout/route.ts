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
    throw new Error("Geen rechten om deze matchmaking te wijzigen.");
  }
}

/**
 * POST body:
 * {
 *   matchmaker_matchmaking_id: number,
 *   user_id: string,
 *   rood_inschrijving_id: number,
 *   blauw_inschrijving_id: number
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const mmId = Number(body?.matchmaker_matchmaking_id);
    const user_id = String(body?.user_id ?? "").trim();
    const roodId = Number(body?.rood_inschrijving_id);
    const blauwId = Number(body?.blauw_inschrijving_id);

    if (!Number.isFinite(mmId) || !user_id) {
      return NextResponse.json({ error: "matchmaker_matchmaking_id en user_id zijn verplicht" }, { status: 400 });
    }
    if (!Number.isFinite(roodId) || !Number.isFinite(blauwId)) {
      return NextResponse.json({ error: "rood_inschrijving_id en blauw_inschrijving_id zijn verplicht" }, { status: 400 });
    }
    if (roodId === blauwId) {
      return NextResponse.json({ error: "Kies 2 verschillende vechters" }, { status: 400 });
    }

    await assertOwner(mmId, user_id);

    // laad inschrijvingen (input-laag)
    const { data: rood, error: rErr } = await supabaseAdmin
      .from("matchmaker_inschrijvingen")
      .select("*")
      .eq("matchmaker_matchmaking_id", mmId)
      .eq("id", roodId)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!rood) throw new Error("Rood inschrijving niet gevonden.");

    const { data: blauw, error: bErr } = await supabaseAdmin
      .from("matchmaker_inschrijvingen")
      .select("*")
      .eq("matchmaker_matchmaking_id", mmId)
      .eq("id", blauwId)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!blauw) throw new Error("Blauw inschrijving niet gevonden.");

    // guard: voorkom dubbele matches (zelfde vechter al in partij)
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("matchmaker_bouts_raw")
      .select("id")
      .eq("matchmaker_matchmaking_id", mmId)
      .or(`rood_inschrijving_id.eq.${roodId},blauw_inschrijving_id.eq.${roodId},rood_inschrijving_id.eq.${blauwId},blauw_inschrijving_id.eq.${blauwId}`)
      .limit(1);
    if (exErr) throw new Error(exErr.message);
    if ((existing ?? []).length) {
      return NextResponse.json({ error: "Eén van deze vechters is al gematcht in een partij." }, { status: 409 });
    }

    // bepaal volgende partij_nr
    const { data: maxRow, error: maxErr } = await supabaseAdmin
      .from("matchmaker_bouts_raw")
      .select("partij_nr")
      .eq("matchmaker_matchmaking_id", mmId)
      .order("partij_nr", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxErr) throw new Error(maxErr.message);

    const nextNr = Number(maxRow?.partij_nr ?? 0) + 1;

    const row = {
      matchmaker_matchmaking_id: mmId,
      partij_nr: nextNr,

      rood_inschrijving_id: roodId,
      blauw_inschrijving_id: blauwId,

      discipline: rood?.discipline ?? blauw?.discipline ?? null,
      klasse: rood?.klasse ?? blauw?.klasse ?? null,
      geslacht: rood?.geslacht ?? blauw?.geslacht ?? null,

      rood_naam: [rood?.voornaam, rood?.achternaam].filter(Boolean).join(" ").trim() || null,
      blauw_naam: [blauw?.voornaam, blauw?.achternaam].filter(Boolean).join(" ").trim() || null,

      rood_gym: rood?.gym ?? null,
      blauw_gym: blauw?.gym ?? null,

      rood_va: rood?.va_nummer ?? null,
      blauw_va: blauw?.va_nummer ?? null,

      rood_gewicht: rood?.gewicht ?? null,
      blauw_gewicht: blauw?.gewicht ?? null,

      created_by: user_id,
      status: "draft",

      raw: {
        rood_inschrijving: rood,
        blauw_inschrijving: blauw,
      },
    };

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("matchmaker_bouts_raw")
      .insert(row)
      .select("id, partij_nr")
      .single();
    if (insErr) throw new Error(insErr.message);

    return NextResponse.json({ ok: true, id: inserted.id, partij_nr: inserted.partij_nr });
  } catch (err: any) {
    console.error("[matchmaker/create-bout] error", err);
    return NextResponse.json({ error: err?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
