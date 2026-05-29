import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) throw new Error("Supabase service role configuratie ontbreekt.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function cleanString(value: unknown) {
  const s = String(value ?? "").trim();
  return s.length ? s : null;
}

function cleanVa(value: unknown) {
  const s = cleanString(value);
  if (!s) return null;
  const digits = s.replace(/^VA/i, "").replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

function missingColumn(message: string) {
  return (
    message.match(/'([^']+)' column/)?.[1] ||
    message.match(/column "([^"]+)"/)?.[1] ||
    message.match(/Could not find the '([^']+)' column/)?.[1] ||
    ""
  );
}

async function safeInsertCase(supabase: any, row: Record<string, any>) {
  let payload = { ...row };
  const dropped: string[] = [];

  for (let i = 0; i < 18; i++) {
    const { data, error } = await supabase
      .from("discipline_cases")
      .insert(payload)
      .select("*")
      .single();

    if (!error) return { data, dropped };

    const col = missingColumn(error.message || "");
    if ((error.code === "PGRST204" || error.code === "42703") && col && col in payload) {
      delete payload[col];
      dropped.push(col);
      continue;
    }

    throw error;
  }

  throw new Error("Melding opslaan mislukt: te veel onbekende kolommen in discipline_cases.");
}


async function getBearerUserId(req: NextRequest, supabase: any) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data?.user?.id || null;
}

async function getProfile(supabase: any, userId: string | null) {
  if (!userId) return null;
  const { data } = await supabase
    .from("user_profiles")
    .select("id, full_name, email, bondteam, role")
    .eq("id", userId)
    .maybeSingle();
  return data || null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const supabase = supabaseAdmin();

    const naam = cleanString(body.naam);
    const categorie = cleanString(body.categorie) || "official_melding";
    const omschrijving = cleanString(body.omschrijving);

    if (!naam) return NextResponse.json({ ok: false, error: "Naam betrokkene is verplicht." }, { status: 400 });
    if (!omschrijving) return NextResponse.json({ ok: false, error: "Omschrijving is verplicht." }, { status: 400 });

    const authUserId = await getBearerUserId(req, supabase);
    const melderUserId = authUserId || cleanString(body.melder_user_id) || cleanString(body.aangemaakt_door);
    const profile = await getProfile(supabase, melderUserId);

    const melderNaam = cleanString(body.melder_naam) || cleanString(profile?.full_name) || "Official";
    const melderEmail = cleanString(body.melder_email) || cleanString(profile?.email);
    const melderBondteam = cleanString(body.melder_bondteam) || cleanString(profile?.bondteam);
    const melderRole = cleanString(profile?.role) || "Official";

    if (!melderUserId) {
      return NextResponse.json(
        { ok: false, error: "Gebruiker niet gevonden. Log opnieuw in en probeer opnieuw." },
        { status: 401 }
      );
    }

    if (!melderBondteam) {
      return NextResponse.json(
        { ok: false, error: "Bondteam ontbreekt bij deze official. Vul bondteam in user_profiles voordat je een melding opslaat." },
        { status: 400 }
      );
    }

    const interneNotitie = [
      "Melding aangemaakt door official.",
      "BRON: official",
      melderNaam ? `MELDER_NAAM: ${melderNaam}` : "",
      melderEmail ? `MELDER_EMAIL: ${melderEmail}` : "",
      melderBondteam ? `MELDER_BONDTEAM: ${melderBondteam}` : "",
      melderRole ? `MELDER_ROL: ${melderRole}` : "",
      cleanString(body.datum_overtreding) ? `Datum overtreding: ${cleanString(body.datum_overtreding)}` : "",
      cleanString(body.interne_notitie) || "",
    ].filter(Boolean).join("\n");

    const payload = {
      type: "overtreding",
      status: "open",
      betrokkene_type: cleanString(body.betrokkene_type) || "official",
      betrokkene_id: cleanString(body.betrokkene_id),
      va_nummer: cleanVa(body.va_nummer),
      naam,
      matchmaking_id: cleanString(body.matchmaking_id),
      event_id: cleanString(body.event_id),
      bout_id: cleanString(body.bout_id),
      categorie,
      ernst: cleanString(body.ernst) || "laag",
      omschrijving,
      interne_notitie: interneNotitie,
      aangemaakt_door: melderUserId,
      datum_overtreding: cleanString(body.datum_overtreding),

      // Deze kolommen bestaan in jouw admin discipline_cases schema.
      bron_type: "official",
      gemeld_door_user_id: melderUserId,
      gemeld_door_naam: melderNaam,
      gemeld_door_email: melderEmail,
      gemeld_door_role: melderRole,
      gemeld_door_bondteam: melderBondteam,
      gemeld_op: new Date().toISOString(),

      // Backwards/fallback kolommen: safeInsertCase verwijdert ze automatisch als ze niet bestaan.
      bron: "official",
      melding_bron: "official",
      melder_user_id: melderUserId,
      melder_naam: melderNaam,
      melder_email: melderEmail,
      melder_bondteam: melderBondteam,
    };

    const { data, dropped } = await safeInsertCase(supabase, payload);
    return NextResponse.json({ ok: true, item: data, dossier: data, dropped_columns: dropped });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Melding opslaan mislukt." }, { status: 500 });
  }
}
