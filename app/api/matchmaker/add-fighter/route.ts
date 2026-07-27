import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processMatchmakingFighters } from "@/lib/matchmaker/processMatchmakingFighters";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const runtime = "nodejs";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function n(v: unknown) {
  const x = Number(String(v ?? "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(x) ? x : null;
}

async function getUser(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!token) throw new Error("Niet ingelogd.");

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error(error?.message || "Niet ingelogd.");
  return data.user;
}

export async function POST(req: Request) {
  try {
    const user = await getUser(req);
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmaking_id);
    const requestedMatchmakerId = s(body?.matchmaker_id);
    const vaNummer = s(body?.va_nummer);
    const sportschoolId = Number(body?.sportschool_id);
    const gewicht = n(body?.gewicht);

    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    }
    if (!vaNummer) {
      return NextResponse.json({ error: "Kies een vechter uit FightPassport." }, { status: 400 });
    }
    if (!Number.isFinite(sportschoolId)) {
      return NextResponse.json({ error: "Kies de sportschool voor deze aanmelding." }, { status: 400 });
    }
    if (gewicht === null) {
      return NextResponse.json({ error: "Vul een geldig wedstrijdgewicht in." }, { status: 400 });
    }

    const { data: matchmaking, error: matchmakingError } = await supabaseAdmin
      .from("matchmakings")
      .select("id, bron_type, maker_user_id, matchmaker_id, uploaded_by")
      .eq("id", matchmakingId)
      .maybeSingle();

    if (matchmakingError) throw matchmakingError;
    if (!matchmaking) {
      return NextResponse.json({ error: "Matchmaking niet gevonden." }, { status: 404 });
    }

    const dbMatchmakerId = s(matchmaking.matchmaker_id) || s(matchmaking.maker_user_id);
    if (requestedMatchmakerId && dbMatchmakerId && requestedMatchmakerId !== dbMatchmakerId) {
      return NextResponse.json(
        { error: "De opgegeven matchmaker hoort niet bij deze matchmaking." },
        { status: 400 },
      );
    }

    const isVanDezeMatchmaker =
      matchmaking.maker_user_id === user.id ||
      matchmaking.matchmaker_id === user.id ||
      matchmaking.uploaded_by === user.id;

    if (s(matchmaking.bron_type).toLowerCase() === "admin_upload" || !isVanDezeMatchmaker) {
      return NextResponse.json(
        { error: "Je kunt alleen toevoegen aan een eigen matchmaking die in de app is gemaakt." },
        { status: 403 },
      );
    }

    const [{ data: fighter, error: fighterError }, { data: activeSchoolLinks, error: linkError }] =
      await Promise.all([
        supabaseAdmin
          .from("fightpassport_fighters")
          .select(
            "id, va_nummer, naam, voornaam, achternaam, geslacht, email, primary_discipline, nulmeting_discipline, berekende_klasse, nulmeting_klasse, totaal_wedstrijden, gewonnen, kos, fit_to_fight, licentie_actief, heeft_startverbod",
          )
          .eq("va_nummer", vaNummer)
          .maybeSingle(),
        supabaseAdmin
          .from("fightpassport_school_fighters")
          .select("sportschool_id")
          .eq("va_nummer", vaNummer)
          .eq("actief", true),
      ]);

    if (fighterError) throw fighterError;
    if (linkError) throw linkError;
    if (!fighter) {
      return NextResponse.json({ error: "Vechter niet gevonden in fightpassport_fighters." }, { status: 404 });
    }

    const activeSchoolIds = (activeSchoolLinks ?? [])
      .map((row: any) => Number(row.sportschool_id))
      .filter(Number.isFinite);

    const allRelevantSchoolIds = [...new Set([...activeSchoolIds, sportschoolId])];
    const { data: relevantSchools, error: schoolError } = await supabaseAdmin
      .from("sportscholen")
      .select("sportschool_id, naam")
      .in("sportschool_id", allRelevantSchoolIds);
    if (schoolError) throw schoolError;
    const schoolById = new Map(
      (relevantSchools ?? []).map((row: any) => [Number(row.sportschool_id), row]),
    );
    const school = schoolById.get(sportschoolId);
    if (!school) {
      return NextResponse.json({ error: "Sportschool niet gevonden." }, { status: 404 });
    }

    const oldSchool = activeSchoolIds.length === 1
      ? schoolById.get(activeSchoolIds[0]) ?? null
      : null;
    const differsFromFightPassport = !activeSchoolIds.includes(sportschoolId);

    const { data: existing, error: duplicateError } = await supabaseAdmin
      .from("aanmeldingen")
      .select("id")
      .eq("matchmaking_id", matchmakingId)
      .eq("va_nummer", vaNummer)
      .limit(1);
    if (duplicateError) throw duplicateError;
    if ((existing ?? []).length > 0) {
      return NextResponse.json(
        { error: `${fighter.naam || `VA ${vaNummer}`} staat al in deze matchmaking.` },
        { status: 409 },
      );
    }

    const totaal = n(fighter.totaal_wedstrijden) ?? 0;
    const wins = n(fighter.gewonnen) ?? 0;
    const row = {
      matchmaking_id: matchmakingId,
      row_nr: null,
      status: "rauw",
      discipline: s(fighter.primary_discipline) || s(fighter.nulmeting_discipline) || null,
      klasse: s(fighter.berekende_klasse) || s(fighter.nulmeting_klasse) || null,
      geslacht: s(fighter.geslacht) || null,
      voornaam: s(fighter.voornaam) || null,
      achternaam: s(fighter.achternaam) || null,
      naam: s(fighter.naam) || null,
      email: s(fighter.email) || null,
      telefoon: null,
      gym: s(school.naam) || null,
      va_nummer: vaNummer,
      gewicht,
      win: wins,
      loss: Math.max(0, totaal - wins),
      draw: 0,
      demo: 0,
      opmerkingen: null,
      raw: {
        handmatig_toegevoegd: true,
        bron: "fightpassport_fighters",
        matchmaking_id: matchmakingId,
        matchmaker_id: dbMatchmakerId || null,
        sportschool_id: sportschoolId,
        toegevoegd_door: user.id,
        toegevoegd_op: new Date().toISOString(),
        fit_to_fight: fighter.fit_to_fight,
        licentie_actief: fighter.licentie_actief,
        heeft_startverbod: fighter.heeft_startverbod,
      },
      uploaded_by: user.id,
    };

    const { data, error } = await supabaseAdmin
      .from("aanmeldingen")
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;

    if (differsFromFightPassport) {
      const { error: changeError } = await supabaseAdmin
        .from("matchmaker_fighter_school_changes")
        .insert({
          matchmaking_id: matchmakingId,
          aanmelding_id: data.id,
          fighter_id: fighter.id ?? null,
          va_nummer: vaNummer,
          old_sportschool_id: oldSchool?.sportschool_id ?? null,
          old_sportschool_name: oldSchool?.naam ?? null,
          new_sportschool_id: sportschoolId,
          new_sportschool_name: school.naam,
          changed_by_user_id: user.id,
          changed_by_email: user.email ?? null,
          source: "manual_add",
          status: "open",
        });
      if (changeError) {
        await supabaseAdmin.from("aanmeldingen").delete().eq("id", data.id);
        throw new Error(`Sportschoolwijziging registreren mislukt: ${changeError.message}`);
      }
    }

    await supabaseAdmin
      .from("matchmakings")
      .update({ last_updated_at: new Date().toISOString(), last_updated_by: user.id })
      .eq("id", matchmakingId);

    const processing = await processMatchmakingFighters({
      supabase: supabaseAdmin,
      matchmakingId,
    });

    return NextResponse.json({
      ok: true,
      fighter: data,
      fighter_processing: {
        processed: processing.processed,
        controle_run_id: processing.controleRunId,
        rule_hits: processing.hits.length,
      },
    });
  } catch (err: any) {
    console.error("[matchmaker/add-fighter] error:", err);
    return NextResponse.json(
      { error: err?.message || "Handmatig toevoegen mislukt." },
      { status: 500 },
    );
  }
}
