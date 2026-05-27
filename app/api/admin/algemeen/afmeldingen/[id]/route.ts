import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type AnyRow = Record<string, any>;

function s(v: unknown) {
  return String(v ?? "").trim();
}

function asString(v: unknown) {
  const x = s(v);
  return x || null;
}

function isUuid(v: unknown) {
  const x = s(v);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
}

function isValidId(v: unknown) {
  const x = s(v);
  return isUuid(x) || /^\d+$/.test(x);
}

function bad(msg: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: msg, extra }, { status });
}

function pickName(row: AnyRow) {
  return (
    asString(row?.naam_input) ||
    asString(row?.fp_naam) ||
    asString(row?.naam) ||
    [row?.voornaam, row?.achternaam].map(s).filter(Boolean).join(" ") ||
    null
  );
}

function normalize(row: AnyRow) {
  return {
    ...row,
    display_naam: pickName(row),
    display_sportschool: asString(row?.sportschool) || asString(row?.gym_input) || asString(row?.fp_gym) || asString(row?.gym),
    display_event: asString(row?.event_naam) || asString(row?.evenement_naam) || asString(row?.raw?.event?.naam) || asString(row?.raw?.matchmaking?.naam),
    display_event_datum: asString(row?.event_datum) || asString(row?.evenement_datum) || asString(row?.raw?.event?.datum) || asString(row?.raw?.matchmaking?.datum),
  };
}

async function loadHistorie(row: AnyRow) {
  const va = asString(row?.va_nummer);
  const naamInput = asString(row?.naam_input);
  const fpNaam = asString(row?.fp_naam);
  const inschrijvingId = row?.inschrijving_id;

  const ors: string[] = [];
  if (va) ors.push(`va_nummer.eq.${va}`);
  if (inschrijvingId) ors.push(`inschrijving_id.eq.${inschrijvingId}`);
  if (naamInput) ors.push(`naam_input.eq.${naamInput}`);
  if (fpNaam) ors.push(`fp_naam.eq.${fpNaam}`);
  if (!ors.length) return [];

  const { data } = await supabase
    .from("afmeldingen")
    .select("*")
    .or(ors.join(","))
    .order("afgemeld_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  return (data || []).map(normalize);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await ctx.params;
    const id = params.id;
    if (!isValidId(id)) return bad("Geldige afmelding id ontbreekt");

    const { data, error } = await supabase.from("afmeldingen").select("*").eq("id", id).maybeSingle();
    if (error) return bad("Afmelding laden mislukt", 500, error.message);
    if (!data) return bad("Afmelding niet gevonden", 404);

    const afmelding = normalize(data);
    const historie = await loadHistorie(data);
    const vaker_afgemeld = historie.filter((x: AnyRow) => x.id !== id).length;

    return NextResponse.json({ ok: true, afmelding, historie, vaker_afgemeld });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}
