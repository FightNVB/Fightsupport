import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Payload = {
  matchmaking_id: string;
  discipline: string;
  klasse: string;

  rood_naam: string;
  rood_gym: string;
  va_rood: string | number;
  rood_gewicht: number | string;
  rood_geboortedatum?: string | null;
  rood_geslacht?: string | null;
  rood_email?: string | null;
  rood_telefoon?: string | null;

  blauw_naam: string;
  blauw_gym: string;
  va_blauw: string | number;
  blauw_gewicht: number | string;
  blauw_geboortedatum?: string | null;
  blauw_geslacht?: string | null;
  blauw_email?: string | null;
  blauw_telefoon?: string | null;

  max_gewicht: number | string | null;
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

async function getLatestUpload(admin: any, matchmaking_id: string) {
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

async function getNextRowNr(admin: any, matchmaking_id: string) {
  const { data, error } = await admin
    .from("matchmaker_inschrijvingen")
    .select("row_nr")
    .eq("matchmaking_id", matchmaking_id)
    .order("row_nr", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Number((data as any)?.row_nr ?? 0) + 1;
}

async function getNextPartijNr(admin: any, matchmaking_id: string) {
  const { data, error } = await admin
    .from("matchmaker_bouts_raw")
    .select("partij_nr")
    .eq("matchmaking_id", matchmaking_id)
    .order("partij_nr", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Number((data as any)?.partij_nr ?? 0) + 1;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertInschrijving(
  admin: any,
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

    opmerkingen: "handmatig toegevoegd vanuit lineup",
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
    .insert(insertRow as any)
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
      return bad(
        "Missing env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
        500
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return bad("Missing Authorization Bearer token", 401);

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

    const rood_naam = String(body.rood_naam ?? "").trim();
    const rood_gym = String(body.rood_gym ?? "").trim();
    const rood_va = toVaStrict(body.va_rood);
    const rood_gewicht = toNum(body.rood_gewicht);
    const rood_geboortedatum = clean(body.rood_geboortedatum);
    const rood_geslacht = clean(body.rood_geslacht);
    const rood_email = clean(body.rood_email);
    const rood_telefoon = clean(body.rood_telefoon);

    const blauw_naam = String(body.blauw_naam ?? "").trim();
    const blauw_gym = String(body.blauw_gym ?? "").trim();
    const blauw_va = toVaStrict(body.va_blauw);
    const blauw_gewicht = toNum(body.blauw_gewicht);
    const blauw_geboortedatum = clean(body.blauw_geboortedatum);
    const blauw_geslacht = clean(body.blauw_geslacht);
    const blauw_email = clean(body.blauw_email);
    const blauw_telefoon = clean(body.blauw_telefoon);

    const max_gewicht = toNum(body.max_gewicht);

    if (!matchmaking_id) return bad("matchmaking_id ontbreekt");
    if (!discipline) return bad("discipline ontbreekt");
    if (!klasse) return bad("klasse ontbreekt");

    if (!rood_naam) return bad("rood_naam ontbreekt");
    if (!rood_gym) return bad("rood_gym ontbreekt");
    if (rood_gewicht == null) return bad("rood_gewicht ongeldig");

    if (!blauw_naam) return bad("blauw_naam ontbreekt");
    if (!blauw_gym) return bad("blauw_gym ontbreekt");
    if (blauw_gewicht == null) return bad("blauw_gewicht ongeldig");

    const latestUpload = await getLatestUpload(admin, matchmaking_id);

    const rowNrRood = await getNextRowNr(admin, matchmaking_id);
    const rowNrBlauw = rowNrRood + 1;
    const nextPartijNr = await getNextPartijNr(admin, matchmaking_id);

    const roodInschrijving = await insertInschrijving(admin, {
      matchmaking_id,
      upload_id: latestUpload.id,
      uploaded_by: latestUpload.uploaded_by ?? userRes.user.id,
      row_nr: rowNrRood,
      discipline,
      klasse,
      geslacht: rood_geslacht,
      naam: rood_naam,
      gym: rood_gym,
      va_nummer: rood_va,
      geboortedatum: rood_geboortedatum,
      gewicht: rood_gewicht,
      email: rood_email,
      telefoon: rood_telefoon,
      evenement_naam: latestUpload.evenement_naam ?? null,
      evenement_datum: latestUpload.evenement_datum ?? null,
    });

    const blauwInschrijving = await insertInschrijving(admin, {
      matchmaking_id,
      upload_id: latestUpload.id,
      uploaded_by: latestUpload.uploaded_by ?? userRes.user.id,
      row_nr: rowNrBlauw,
      discipline,
      klasse,
      geslacht: blauw_geslacht,
      naam: blauw_naam,
      gym: blauw_gym,
      va_nummer: blauw_va,
      geboortedatum: blauw_geboortedatum,
      gewicht: blauw_gewicht,
      email: blauw_email,
      telefoon: blauw_telefoon,
      evenement_naam: latestUpload.evenement_naam ?? null,
      evenement_datum: latestUpload.evenement_datum ?? null,
    });

    const bout_uid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    const raw_json = {
      parse_mode: "manual_add_from_lineup",
      created_by: userRes.user.id,
      rood_inschrijving_id: roodInschrijving.id,
      blauw_inschrijving_id: blauwInschrijving.id,
    };

    const boutRow = {
      upload_id: latestUpload.id,
      matchmaking_id,
      partij_nr: nextPartijNr,
      discipline,
      klasse,

      rood_naam,
      rood_gym,
      va_rood: rood_va,
      rood_gewicht,

      blauw_naam,
      blauw_gym,
      va_blauw: blauw_va,
      blauw_gewicht,

      max_gewicht,

      raw_json: JSON.stringify(raw_json),
      bout_uid,
    };

    const { data: insertedBout, error: boutErr } = await admin
      .from("matchmaker_bouts_raw")
      .insert(boutRow)
      .select("*")
      .single();

    if (boutErr) return bad(boutErr.message, 500);

    return NextResponse.json({
      ok: true,
      matchup: {
        partij_nr: nextPartijNr,
        matchmaking_id,
      },
      inschrijvingen: {
        rood: roodInschrijving,
        blauw: blauwInschrijving,
      },
      bout: insertedBout,
      next_step:
        "Gebruik daarna /api/officials/weegstation/build zodat weigh_in_bouts de nieuwste versie oppakt.",
    });
  } catch (e: any) {
    return bad(e?.message ?? String(e), 500);
  }
}