import { NextRequest, NextResponse } from "next/server";
import { requireUserWithRole, supabaseAdmin } from "@/app/api/_utils/authz";
import { privateJson, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getNoteValue(note: unknown, key: string) {
  const text = String(note ?? "");
  const line = text.split(/\r?\n/).find((l) => l.toLowerCase().startsWith(`${key.toLowerCase()}:`));
  return line ? line.slice(key.length + 1).trim() : null;
}

function normalize(row: any, profileById: Map<string, any>) {
  const profile = row.aangemaakt_door ? profileById.get(String(row.aangemaakt_door)) : null;
  const note = row.interne_notitie || "";
  const noteBron = getNoteValue(note, "BRON");
  const noteMelderNaam = getNoteValue(note, "MELDER_NAAM");
  const noteMelderEmail = getNoteValue(note, "MELDER_EMAIL");
  const noteMelderBondteam = getNoteValue(note, "MELDER_BONDTEAM");

  const melderNaam = row.gemeld_door_naam || row.melder_naam || noteMelderNaam || profile?.full_name || null;
  const melderEmail = row.gemeld_door_email || row.melder_email || noteMelderEmail || profile?.email || null;
  const melderBondteam = row.gemeld_door_bondteam || row.melder_bondteam || noteMelderBondteam || profile?.bondteam || null;
  const bron = row.bron_type || row.melding_bron || row.bron || noteBron || (String(note).toLowerCase().includes("official") ? "official" : null);

  return {
    ...row,
    datum_overtreding: row.datum_overtreding || row.datum || row.aangemaakt_op || row.gemeld_op || null,
    created_at: row.aangemaakt_op || row.gemeld_op || null,
    aangemaakt_op: row.aangemaakt_op || null,
    gemeld_op: row.gemeld_op || null,
    betrokkene_type: row.betrokkene_type || row.type || null,
    naam: row.naam || row.betrokkene_naam || null,
    omschrijving: row.omschrijving || row.beschrijving || row.notitie || null,
    melding_bron: bron,
    melder_user_id: row.gemeld_door_user_id || row.melder_user_id || row.aangemaakt_door || null,
    melder_naam: melderNaam,
    melder_email: melderEmail,
    melder_bondteam: melderBondteam,
    aangemaakt_door_naam: profile?.full_name || melderNaam,
    aangemaakt_door_email: profile?.email || melderEmail,
  };
}

async function getLoggedInProfile(supabase: any, req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  if (!token) {
    return { profile: null, error: "Geen ingelogde official gevonden. Log opnieuw in." };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user?.id) {
    return { profile: null, error: "Sessie verlopen. Log opnieuw in." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, full_name, email, bondteam, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile?.bondteam) {
    return { profile: null, error: "Geen bondteam gekoppeld aan deze official." };
  }

  return { profile, error: null };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUserWithRole(req, ["official", "hoofdofficial", "admin", "superadmin"]);
    const bondteam = String(auth.bondteam ?? "").trim();
    if ((auth.role === "official" || auth.role === "hoofdofficial") && !bondteam) {
      return privateJson({ error: "Geen bondteam gekoppeld." }, 403);
    }

    let query = supabaseAdmin
      .from("discipline_cases")
      .select("*")
      .eq("bron_type", "official")
      .order("datum_overtreding", { ascending: false, nullsFirst: false })
      .order("aangemaakt_op", { ascending: false, nullsFirst: false })
      .limit(500);
    if (auth.role === "official" || auth.role === "hoofdofficial") {
      query = query.eq("gemeld_door_bondteam", bondteam);
    }
    const { data, error } = await query;

    if (error) throw error;

    const rows = data || [];
    const creatorIds = Array.from(new Set(rows.map((x: any) => x.aangemaakt_door).filter(Boolean).map(String)));
    const profileById = new Map<string, any>();

    if (creatorIds.length) {
      const { data: profiles } = await supabaseAdmin
        .from("user_profiles")
        .select("id, full_name, email, bondteam, role")
        .in("id", creatorIds);

      for (const profile of profiles || []) profileById.set(String(profile.id), profile);
    }

    return privateJson({ ok: true, bondteam: auth.role === "superadmin" ? null : bondteam, items: rows.map((row: any) => normalize(row, profileById)) });
  } catch (error) {
    return secureError(error, "Meldingen ophalen mislukt.");
  }
}
