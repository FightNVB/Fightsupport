import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAnyRole } from "@/app/api/_utils/authz";

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


async function findEventByName(supabase: any, value: string | null) {
  const eventNaam = cleanString(value);
  if (!eventNaam) return null;

  const candidates = [
    { table: "events", column: "naam" },
    { table: "events", column: "name" },
    { table: "events", column: "event_name" },
    { table: "matchmakings", column: "event_naam" },
    { table: "matchmakings", column: "event_name" },
  ];

  for (const c of candidates) {
    const { data, error } = await supabase
      .from(c.table)
      .select("id")
      .ilike(c.column, eventNaam)
      .limit(2);

    if (error) {
      const msg = String(error.message || "").toLowerCase();
      const code = String(error.code || "").toLowerCase();
      if (
        code === "42p01" ||
        code === "42703" ||
        code === "pgrst204" ||
        msg.includes("does not exist") ||
        msg.includes("could not find") ||
        msg.includes("schema cache")
      ) {
        continue;
      }
      throw error;
    }

    if ((data ?? []).length === 1) return data[0].id;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAnyRole(req, ["matchmaker"]);
    const body = await req.json().catch(() => ({}));
    const supabase = supabaseAdmin();

    const naam = cleanString(body.naam);
    const categorie = cleanString(body.categorie) || "matchmaker_melding";
    const omschrijving = cleanString(body.omschrijving);
    const eventNaam =
      cleanString(body.event_naam) ||
      cleanString(body.event_name) ||
      cleanString(body.event);
    const eventId = cleanString(body.event_id) || await findEventByName(supabase, eventNaam);

    if (!naam) return NextResponse.json({ ok: false, error: "Naam betrokkene is verplicht." }, { status: 400 });
    if (!omschrijving) return NextResponse.json({ ok: false, error: "Omschrijving is verplicht." }, { status: 400 });

    const melderUserId = auth.userId;
    const profile = auth.profile;

    const melderNaam = cleanString(body.melder_naam) || cleanString(profile?.full_name) || "Matchmaker";
    const melderEmail = cleanString(body.melder_email) || cleanString(profile?.email);
    const melderBondteam = cleanString(body.melder_bondteam) || cleanString(profile?.bondteam);
    const melderRole = auth.role;

    if (!melderUserId) {
      return NextResponse.json(
        { ok: false, error: "Gebruiker niet gevonden. Log opnieuw in als matchmaker en probeer opnieuw." },
        { status: 401 }
      );
    }

    if (!melderBondteam) {
      return NextResponse.json(
        { ok: false, error: "Bondteam ontbreekt bij deze matchmaker. Vul bondteam in user_profiles voordat je een melding opslaat." },
        { status: 400 }
      );
    }

    const interneNotitie = [
      "Melding aangemaakt door matchmaker.",
      "BRON: matchmaker",
      melderNaam ? `MELDER_NAAM: ${melderNaam}` : "",
      melderEmail ? `MELDER_EMAIL: ${melderEmail}` : "",
      melderBondteam ? `MELDER_BONDTEAM: ${melderBondteam}` : "",
      melderRole ? `MELDER_ROL: ${melderRole}` : "",
      cleanString(body.datum_overtreding) ? `Datum overtreding: ${cleanString(body.datum_overtreding)}` : "",
      eventNaam ? `EVENT_NAAM: ${eventNaam}` : "",
      eventNaam && !eventId ? "LET OP: event_id niet automatisch gevonden op basis van eventnaam." : "",
      cleanString(body.interne_notitie) || "",
    ].filter(Boolean).join("\n");

    const payload = {
      type: "overtreding",
      status: "open",
      betrokkene_type: cleanString(body.betrokkene_type) || "matchmaker",
      betrokkene_id: cleanString(body.betrokkene_id),
      va_nummer: cleanVa(body.va_nummer),
      naam,
      matchmaking_id: cleanString(body.matchmaking_id),
      event_id: eventId,
      event_naam: eventNaam,
      event_name: eventNaam,
      bout_id: cleanString(body.bout_id),
      categorie,
      ernst: cleanString(body.ernst) || "laag",
      omschrijving,
      interne_notitie: interneNotitie,
      aangemaakt_door: melderUserId,
      datum_overtreding: cleanString(body.datum_overtreding),

      // Deze kolommen bestaan in jouw admin discipline_cases schema.
      bron_type: "matchmaker",
      gemeld_door_user_id: melderUserId,
      gemeld_door_naam: melderNaam,
      gemeld_door_email: melderEmail,
      gemeld_door_role: melderRole,
      gemeld_door_bondteam: melderBondteam,
      gemeld_op: new Date().toISOString(),

      // Backwards/fallback kolommen: safeInsertCase verwijdert ze automatisch als ze niet bestaan.
      bron: "matchmaker",
      melding_bron: "matchmaker",
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
