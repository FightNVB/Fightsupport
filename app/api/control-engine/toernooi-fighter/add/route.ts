// app/api/control-engine/toernooi-fighter/add/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: unknown) { return String(v ?? "").trim(); }
function va(v: unknown) { const d = s(v).replace(/\D/g, ""); return d || null; }
function n(v: unknown) { const x = Number(s(v).replace(",", ".")); return Number.isFinite(x) ? x : null; }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmaking_id = s(body.matchmaking_id);
    const toernooi_code = s(body.toernooi_code);
    const fighter_id = va(body.fighter_id ?? body.va_nummer);

    if (!matchmaking_id) return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    if (!toernooi_code) return NextResponse.json({ error: "toernooi_code ontbreekt" }, { status: 400 });
    if (!fighter_id) return NextResponse.json({ error: "fighter_id/va_nummer ontbreekt" }, { status: 400 });

    const { userId, role } = await requireUserWithRole(req);
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    const row = {
      matchmaking_id,
      toernooi_code,
      fighter_id,
      va_nummer: fighter_id,
      is_toernooi: true,
      naam: s(body.naam_input ?? body.naam) || null,
      naam_mm: s(body.naam_input ?? body.naam) || null,
      geboortedatum: s(body.geboortedatum_input ?? body.geboortedatum) || null,
      geslacht: s(body.geslacht) || null,
      gewicht: n(body.gewicht),
      sportschool: s(body.gym_input ?? body.sportschool ?? body.gym) || null,
      sportschool_mm: s(body.gym_input ?? body.sportschool ?? body.gym) || null,
      discipline: s(body.discipline) || null,
      klasse: s(body.klasse) || null,
      email: s(body.email) || null,
      telefoon: s(body.telefoon) || null,
      trainer_naam: s(body.trainer_naam) || null,
      trainer_email: s(body.trainer_email) || null,
      trainer_tel: s(body.trainer_tel) || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      raw_json: JSON.stringify({ created_by: userId, role, source: "manual_add_toernooi_fighter" }),
    };

    const { data, error } = await supabase
      .from("controle_toernooi_context")
      .upsert(row, { onConflict: "matchmaking_id,toernooi_code,fighter_id" })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, row: data });
  } catch (err: any) {
    console.error("[toernooi-fighter/add]", err);
    return NextResponse.json({ error: err?.message ?? "Toernooi-vechter toevoegen mislukt" }, { status: 500 });
  }
}
