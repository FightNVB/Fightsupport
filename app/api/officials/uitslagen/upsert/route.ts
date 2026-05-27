import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env mist: NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getUserIdFromBearer(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Supabase env mist: NEXT_PUBLIC_SUPABASE_URL of NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  const authClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

function resultaatType(winnaarHoek: string) {
  const s = winnaarHoek.toLowerCase();
  if (s === "rood" || s === "blauw") return "winnaar";
  if (s === "onbeslist") return "onbeslist";
  if (s === "no_contest") return "no_contest";
  if (s === "demo") return "demo";
  return s || null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromBearer(req);
    if (!userId) return bad("Unauthorized", 401);

    const body = await req.json().catch(() => ({}));

    const uitslagenBoutId = clean(body.uitslagen_bout_id ?? body.bout_id);
    const matchmakingId = clean(body.matchmaking_id);
    const winnaarHoek = clean(body.winnaar_hoek);
    const methode = clean(body.methode);
    const opmerkingen = clean(body.opmerkingen);

    if (!uitslagenBoutId) return bad("uitslagen_bout_id ontbreekt");
    if (!matchmakingId) return bad("matchmaking_id ontbreekt");
    if (!winnaarHoek) return bad("winnaar_hoek ontbreekt");
    if (!methode) return bad("methode ontbreekt");

    const supabase = adminClient();

    const { data: bout, error: boutErr } = await supabase
      .from("uitslagen_bouts")
      .select("id, matchmaking_id, uitslagen_run_id, partij_nr")
      .eq("id", uitslagenBoutId)
      .eq("matchmaking_id", matchmakingId)
      .maybeSingle();

    if (boutErr) return bad(boutErr.message, 500);
    if (!bout) return bad("Uitslagenpartij niet gevonden.", 404);

    const now = new Date().toISOString();

    // Alleen kolommen gebruiken die in jouw uitslagen_resultaten tabel bestaan.
    // Belangrijk: bestaande conceptregels worden geüpdatet op uitslagen_bout_id.
    const payload = {
      uitslagen_bout_id: uitslagenBoutId,
      uitslagen_run_id: (bout as any).uitslagen_run_id ?? null,
      matchmaking_id: matchmakingId,
      uitslag_status: clean(body.uitslag_status) || "definitief",
      resultaat_type: resultaatType(winnaarHoek),
      winnaar_hoek: winnaarHoek,
      methode,
      ronde: body.ronde ?? null,
      tijd_in_ronde: body.tijd_in_ronde ?? null,
      opmerkingen: opmerkingen || null,
      ingevuld_door: userId,
      ingevuld_op: now,
      updated_at: now,
    };

    const { data: existing, error: existingErr } = await supabase
      .from("uitslagen_resultaten")
      .select("id")
      .eq("uitslagen_bout_id", uitslagenBoutId)
      .maybeSingle();

    if (existingErr) return bad(existingErr.message, 500);

    if ((existing as any)?.id) {
      const { data: updated, error: updateErr } = await supabase
        .from("uitslagen_resultaten")
        .update(payload)
        .eq("id", (existing as any).id)
        .select("*")
        .single();

      if (updateErr) return bad(updateErr.message, 500);
      return NextResponse.json({ ok: true, row: updated, mode: "updated" });
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("uitslagen_resultaten")
      .insert(payload)
      .select("*")
      .single();

    if (insertErr) return bad(insertErr.message, 500);
    return NextResponse.json({ ok: true, row: inserted, mode: "inserted" });
  } catch (e: any) {
    console.error("[officials/uitslagen/upsert]", e);
    return bad(e?.message ?? "Opslaan mislukt", 500);
  }
}
