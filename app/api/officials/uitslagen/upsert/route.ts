import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireAnyRole } from "@/app/api/_utils/authz";

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

function pickFirst(...vals: any[]) {
  for (const v of vals) {
    const s = clean(v);
    if (s) return s;
  }
  return "";
}

async function resolveKlasse(supabase: any, body: any, bout: any) {
  const direct = pickFirst(body.klasse, body.bout_klasse, body.partij_klasse, bout?.klasse, bout?.bout_klasse, bout?.partij_klasse);
  if (direct) return direct;

  const partijNr = Number(bout?.original_partij_nr ?? bout?.partij_nr ?? body?.partij_nr);
  if (!Number.isFinite(partijNr)) return "";

  const { data, error } = await supabase
    .from("matchmaking_bouts_raw")
    .select("*")
    .eq("matchmaking_id", clean(body.matchmaking_id))
    .eq("partij_nr", partijNr)
    .maybeSingle();

  if (error) {
    console.warn("[officials/uitslagen/upsert] klasse fallback mislukt:", error.message);
    return "";
  }

  return pickFirst(data?.klasse, data?.bout_klasse, data?.partij_klasse, data?.class, data?.klasse_rood, data?.klasse_blauw);
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
    const body = await req.json().catch(() => ({}));

    const uitslagenBoutId = clean(body.uitslagen_bout_id ?? body.bout_id);
    const matchmakingId = clean(body.matchmaking_id);
    const winnaarHoek = clean(body.winnaar_hoek);
    const methode = clean(body.methode);
    const opmerkingen = clean(body.opmerkingen);
    const klasseInput = clean(body.klasse ?? body.bout_klasse ?? body.partij_klasse);

    if (!uitslagenBoutId) return bad("uitslagen_bout_id ontbreekt");
    if (!matchmakingId) return bad("matchmaking_id ontbreekt");
    if (!winnaarHoek) return bad("winnaar_hoek ontbreekt");
    if (!methode) return bad("methode ontbreekt");

    const auth = await requireAnyRole(req, ["official", "hoofdofficial", "admin", "superadmin"]);
    await assertCanAccessMatchmaking({
      matchmaking_id: matchmakingId,
      userId: auth.userId,
      role: auth.role,
    });

    const supabase = adminClient();

    const { data: bout, error: boutErr } = await supabase
      .from("uitslagen_bouts")
      .select("*")
      .eq("id", uitslagenBoutId)
      .eq("matchmaking_id", matchmakingId)
      .maybeSingle();

    if (boutErr) return bad(boutErr.message, 500);
    if (!bout) return bad("Uitslagenpartij niet gevonden.", 404);

    const klasse = klasseInput || await resolveKlasse(supabase, body, bout);

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
      klasse: klasse || null,
      ronde: body.ronde ?? null,
      tijd_in_ronde: body.tijd_in_ronde ?? null,
      opmerkingen: opmerkingen || null,
      ingevuld_door: auth.userId,
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
