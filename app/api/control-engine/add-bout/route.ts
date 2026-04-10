import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  assertCanAccessMatchmaking,
  requireAnyRole,
} from "@/app/api/_utils/authz";

export const runtime = "nodejs";

type Payload = {
  matchmaking_id: string;

  discipline: string;
  klasse: string;
  geslacht?: string | null;

  rood_naam: string;
  rood_gym?: string | null;
  va_rood?: string | number | null;
  rood_gewicht?: string | number | null;
  rood_geboortedatum?: string | null;
  rood_geslacht?: string | null;
  rood_email?: string | null;
  rood_telefoon?: string | null;

  blauw_naam: string;
  blauw_gym?: string | null;
  va_blauw?: string | number | null;
  blauw_gewicht?: string | number | null;
  blauw_geboortedatum?: string | null;
  blauw_geslacht?: string | null;
  blauw_email?: string | null;
  blauw_telefoon?: string | null;

  max_gewicht?: string | number | null;
  opmerkingen?: string | null;
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function bad(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, extra }, { status });
}

function clean(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toVa(v: unknown): string | null {
  if (v == null || v === "") return null;
  const digits = String(v).replace(/[^\d]/g, "").trim();
  if (!digits) return null;
  return digits;
}

async function getMatchmaking(matchmakingId: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmakings")
    .select("id, naam, datum, locatie, status, bondteam")
    .eq("id", matchmakingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Matchmaking niet gevonden.");

  return data;
}

async function getNextPartijNr(matchmakingId: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmaking_bouts_raw")
    .select("partij_nr")
    .eq("matchmaking_id", matchmakingId)
    .order("partij_nr", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return Number(data?.partij_nr ?? 0) + 1;
}

function makeBoutUid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `bout-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await requireAnyRole(req, [
      "admin",
      "superadmin",
      "official",
      "hoofdofficial",
      "matchmaker",
    ]);

    const body = (await req.json().catch(() => ({}))) as Partial<Payload>;

    const matchmaking_id = String(body?.matchmaking_id ?? "").trim();

    if (!matchmaking_id) {
      return bad("matchmaking_id ontbreekt.");
    }

    await assertCanAccessMatchmaking({
      matchmaking_id,
      userId,
      role,
    });

    const mm = await getMatchmaking(matchmaking_id);

    const discipline = clean(body?.discipline);
    const klasse = clean(body?.klasse);
    const geslacht = clean(body?.geslacht);

    const rood_naam = clean(body?.rood_naam);
    const rood_gym = clean(body?.rood_gym);
    const va_rood = toVa(body?.va_rood);
    const rood_gewicht = toNum(body?.rood_gewicht);
    const rood_geboortedatum = clean(body?.rood_geboortedatum);
    const rood_geslacht = clean(body?.rood_geslacht) ?? geslacht;
    const rood_email = clean(body?.rood_email);
    const rood_telefoon = clean(body?.rood_telefoon);

    const blauw_naam = clean(body?.blauw_naam);
    const blauw_gym = clean(body?.blauw_gym);
    const va_blauw = toVa(body?.va_blauw);
    const blauw_gewicht = toNum(body?.blauw_gewicht);
    const blauw_geboortedatum = clean(body?.blauw_geboortedatum);
    const blauw_geslacht = clean(body?.blauw_geslacht) ?? geslacht;
    const blauw_email = clean(body?.blauw_email);
    const blauw_telefoon = clean(body?.blauw_telefoon);

    const max_gewicht = toNum(body?.max_gewicht);
    const opmerkingen = clean(body?.opmerkingen);

    if (!discipline) return bad("discipline ontbreekt.");
    if (!klasse) return bad("klasse ontbreekt.");
    if (!rood_naam) return bad("rood_naam ontbreekt.");
    if (!blauw_naam) return bad("blauw_naam ontbreekt.");

    const partij_nr = await getNextPartijNr(matchmaking_id);
    const bout_uid = makeBoutUid();
    const now = new Date().toISOString();

    const insertRow: Record<string, any> = {
      matchmaking_id,
      partij_nr,
      bout_uid,

      discipline,
      klasse,
      geslacht,

      rood_naam,
      rood_gym,
      va_rood,
      rood_gewicht,
      rood_geboortedatum,
      rood_geslacht,
      rood_email,
      rood_telefoon,

      blauw_naam,
      blauw_gym,
      va_blauw,
      blauw_gewicht,
      blauw_geboortedatum,
      blauw_geslacht,
      blauw_email,
      blauw_telefoon,

      max_gewicht,
      opmerkingen,

      raw_json: JSON.stringify({
        source: "manual_add_bout_controle",
        created_at: now,
        created_by: userId,
        created_role: role,
        matchmaking_id,
        matchmaking_naam: (mm as any)?.naam ?? null,
      }),
    };

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("matchmaking_bouts_raw")
      .insert(insertRow)
      .select("*")
      .single();

    if (insertErr) {
      return bad("Opslaan in matchmaking_bouts_raw mislukt.", 500, insertErr);
    }

    await supabaseAdmin
      .from("matchmakings")
      .update({
        last_updated_at: now,
        last_updated_by: userId,
      })
      .eq("id", matchmaking_id);

    return NextResponse.json({
      ok: true,
      message: "Bout toegevoegd aan matchmaking_bouts_raw.",
      matchmaking: mm,
      bout: inserted,
    });
  } catch (err: any) {
    return bad(err?.message ?? "Onbekende fout.", 500);
  }
}