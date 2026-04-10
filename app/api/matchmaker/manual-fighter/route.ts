import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Payload = {
  matchmaking_id: string;
  discipline: string;
  klasse: string;

  naam: string;
  gym: string;
  va_nummer?: string | number;
  gewicht: number | string;

  geboortedatum?: string | null;
  geslacht?: string | null;
  email?: string | null;
  telefoon?: string | null;
};

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function toNum(v: any): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toVaStrict(v: any): string | null {
  if (v == null) return null;
  const digits = String(v).replace(/[^0-9]/g, "");
  return /^\d{1,6}$/.test(digits) ? digits : null;
}

function clean(v: any): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function splitName(fullName: string) {
  const s = String(fullName ?? "").trim().replace(/\s+/g, " ");
  if (!s) return { voornaam: "", achternaam: "" };

  const parts = s.split(" ");
  if (parts.length === 1) {
    return { voornaam: parts[0], achternaam: "" };
  }

  return {
    voornaam: parts.slice(0, -1).join(" "),
    achternaam: parts.slice(-1).join(" "),
  };
}

function buildRawInschrijving(values: any[]) {
  return JSON.stringify({ values });
}

async function getLatestUpload(admin: ReturnType<typeof createClient>, matchmaking_id: string) {
  const { data, error } = await admin
    .from("matchmaker_uploads")
    .select("id, matchmaking_id, evenement_naam, evenement_datum, uploaded_by")
    .eq("matchmaking_id", matchmaking_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Geen matchmaker_upload gevonden voor dit matchmaking_id.");

  return data;
}

async function getNextRowNr(admin: ReturnType<typeof createClient>, matchmaking_id: string) {
  const { data, error } = await admin
    .from("matchmaker_inschrijvingen")
    .select("row_nr")
    .eq("matchmaking_id", matchmaking_id)
    .order("row_nr", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Number(data?.row_nr ?? 0) + 1;
}

async function insertInschrijving(
  admin: ReturnType<typeof createClient>,
  args: {
    matchmaking_id: string;
    upload_id: string | number;
    uploaded_by: string | null;
    row_nr: number;
    discipline: string;
    klasse: string;
    geslacht: string | null;
    naam: string;
    gym: string;
    va_nummer: string | null;
    geboortedatum: string | null;
    gewicht: number | null;
    email: string | null;
    telefoon: string | null;
    evenement_naam: string | null;
    evenement_datum: string | null;
  }
) {
  const { voornaam, achternaam } = splitName(args.naam);

  const insertRow = {
    uploaded_by: args.uploaded_by,
    matchmaking_id: args.matchmaking_id,
    upload_id: args.upload_id,
    row_nr: args.row_nr,

    discipline: args.discipline,
    klasse: args.klasse,
    geslacht: args.geslacht,

    voornaam,
    achternaam,
    email: args.email,
    telefoon: args.telefoon,

    gym: args.gym,
    va_nummer: args.va_nummer,
    geboortedatum: args.geboortedatum,
    gewicht: args.gewicht,

    opmerkingen: "handmatig toegevoegd (losse vechter)",
    raw: buildRawInschrijving([
      null,
      args.geslacht,
      voornaam,
      achternaam,
      null,
      args.geboortedatum,
      args.gewicht != null ? `${args.gewicht} kg` : null,
      null,
      args.va_nummer,
      args.gym,
      args.email,
      args.klasse,
      args.discipline,
    ]),

    evenement_naam: args.evenement_naam,
    evenement_datum: args.evenement_datum,
    trainer_naam: null,
  };

  const { data, error } = await admin
    .from("matchmaker_inschrijvingen")
    .insert(insertRow)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnon || !serviceKey) {
      return bad("Missing env vars", 500);
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return bad("Missing Authorization", 401);

    const authClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) return bad("Unauthorized", 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const body = (await req.json()) as Partial<Payload>;

    const matchmaking_id = String(body.matchmaking_id ?? "").trim();
    const discipline = String(body.discipline ?? "").trim();
    const klasse = String(body.klasse ?? "").trim();

    const naam = String(body.naam ?? "").trim();
    const gym = String(body.gym ?? "").trim();
    const va_nummer = toVaStrict(body.va_nummer);
    const gewicht = toNum(body.gewicht);

    const geboortedatum = clean(body.geboortedatum);
    const geslacht = clean(body.geslacht);
    const email = clean(body.email);
    const telefoon = clean(body.telefoon);

    if (!matchmaking_id) return bad("matchmaking_id ontbreekt");
    if (!discipline) return bad("discipline ontbreekt");
    if (!klasse) return bad("klasse ontbreekt");
    if (!naam) return bad("naam ontbreekt");
    if (!gym) return bad("gym ontbreekt");
    if (gewicht == null) return bad("gewicht ongeldig");

    const latestUpload = await getLatestUpload(admin, matchmaking_id);
    const rowNr = await getNextRowNr(admin, matchmaking_id);

    const inschrijving = await insertInschrijving(admin, {
      matchmaking_id,
      upload_id: latestUpload.id,
      uploaded_by: latestUpload.uploaded_by ?? userRes.user.id,
      row_nr: rowNr,
      discipline,
      klasse,
      geslacht,
      naam,
      gym,
      va_nummer,
      geboortedatum,
      gewicht,
      email,
      telefoon,
      evenement_naam: latestUpload.evenement_naam ?? null,
      evenement_datum: latestUpload.evenement_datum ?? null,
    });

    return NextResponse.json({
      ok: true,
      inschrijving,
      message: "Losse vechter toegevoegd aan matchmaker_inschrijvingen.",
    });
  } catch (e: any) {
    return bad(e?.message ?? String(e), 500);
  }
}