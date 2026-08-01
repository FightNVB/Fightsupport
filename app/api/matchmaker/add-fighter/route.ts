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

function normalizeDiscipline(value: unknown) {
  const raw = s(value).toUpperCase();

  if (raw.includes("MMA") || raw.includes("MIXED MARTIAL")) return "MMA";
  if (raw.includes("THAI") || raw.includes("MUAY")) return "THAIBOKSEN";
  if (raw.includes("KICK")) return "KICKBOKSEN";

  return raw;
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
    const sportschoolIdRaw = s(body?.sportschool_id);
    const sportschoolId = sportschoolIdRaw ? Number(sportschoolIdRaw) : null;
    const manualSchoolName = s(body?.gym);
    const requestedDiscipline = normalizeDiscipline(body?.discipline);
    const requestedClass = s(body?.klasse).toUpperCase();
    const gewicht = n(body?.gewicht);

    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    }
    if (!vaNummer) {
      return NextResponse.json({ error: "Kies een vechter uit FightPassport." }, { status: 400 });
    }
    if (sportschoolId !== null && !Number.isFinite(sportschoolId)) {
      return NextResponse.json({ error: "Ongeldige sportschool gekozen." }, { status: 400 });
    }
    if (sportschoolId === null && !manualSchoolName) {
      return NextResponse.json({ error: "Vul de sportschool voor deze aanmelding in." }, { status: 400 });
    }
    if (!requestedDiscipline) {
      return NextResponse.json(
        { error: "Kies de discipline voor deze aanmelding." },
        { status: 400 },
      );
    }
    if (!["KICKBOKSEN", "THAIBOKSEN", "MMA"].includes(requestedDiscipline)) {
      return NextResponse.json(
        { error: "Ongeldige discipline gekozen." },
        { status: 400 },
      );
    }
    if (!requestedClass) {
      return NextResponse.json(
        { error: "Kies de klasse voor deze aanmelding." },
        { status: 400 },
      );
    }
    if (gewicht === null || gewicht <= 0) {
      return NextResponse.json(
        { error: "Vul een geldig wedstrijdgewicht groter dan 0 in." },
        { status: 400 },
      );
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
            "va_nummer, naam, voornaam, achternaam, geslacht, email, primary_discipline, nulmeting_discipline, berekende_klasse, nulmeting_klasse, totaal_wedstrijden, gewonnen, kos, fit_to_fight, licentie_actief, heeft_startverbod",
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

    const allRelevantSchoolIds = [
      ...new Set([
        ...activeSchoolIds,
        ...(sportschoolId !== null ? [sportschoolId] : []),
      ]),
    ];

    let relevantSchools: any[] = [];
    if (allRelevantSchoolIds.length > 0) {
      const { data, error: schoolError } = await supabaseAdmin
        .from("sportscholen")
        .select("sportschool_id, naam")
        .in("sportschool_id", allRelevantSchoolIds);
      if (schoolError) throw schoolError;
      relevantSchools = data ?? [];
    }

    const schoolById = new Map(
      relevantSchools.map((row: any) => [Number(row.sportschool_id), row]),
    );
    const selectedSchool = sportschoolId !== null ? schoolById.get(sportschoolId) : null;
    if (sportschoolId !== null && !selectedSchool) {
      return NextResponse.json({ error: "Sportschool niet gevonden." }, { status: 404 });
    }

    const schoolName = s(selectedSchool?.naam) || manualSchoolName;
    const oldSchool = activeSchoolIds.length === 1
      ? schoolById.get(activeSchoolIds[0]) ?? null
      : null;
    const normalizeSchool = (value: unknown) =>
      s(value)
        .toLocaleLowerCase("nl-NL")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const activeSchoolNames = activeSchoolIds
      .map((id) => normalizeSchool(schoolById.get(id)?.naam))
      .filter(Boolean);
    const differsFromFightPassport = sportschoolId !== null
      ? !activeSchoolIds.includes(sportschoolId)
      : !activeSchoolNames.includes(normalizeSchool(schoolName));

    const { data: existing, error: duplicateError } = await supabaseAdmin
      .from("aanmeldingen")
      .select("id, naam, va_nummer, gym, discipline, gewicht, source_type, upload_batch_id")
      .eq("matchmaking_id", matchmakingId)
      .eq("va_nummer", vaNummer)
      .limit(1);
    if (duplicateError) throw duplicateError;
    if ((existing ?? []).length > 0) {
      return NextResponse.json(
        {
          error: `${fighter.naam || `VA ${vaNummer}`} staat al in deze matchmaking.`,
          duplicate: true,
          existing: existing![0],
        },
        { status: 409 },
      );
    }

    const totaal = n(fighter.totaal_wedstrijden) ?? 0;
    const wins = n(fighter.gewonnen) ?? 0;
    const row = {
      matchmaking_id: matchmakingId,
      row_nr: null,
      status: "rauw",
      discipline:
        requestedDiscipline ||
        normalizeDiscipline(fighter.primary_discipline) ||
        normalizeDiscipline(fighter.nulmeting_discipline) ||
        null,
      klasse:
        requestedClass ||
        s(fighter.berekende_klasse) ||
        s(fighter.nulmeting_klasse) ||
        null,
      geslacht: s(fighter.geslacht) || null,
      voornaam: s(fighter.voornaam) || null,
      achternaam: s(fighter.achternaam) || null,
      naam: s(fighter.naam) || null,
      email: s(fighter.email) || null,
      telefoon: null,
      gym: schoolName || null,
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
        discipline_opgegeven: requestedDiscipline,
        discipline_fightpassport:
          normalizeDiscipline(fighter.primary_discipline) ||
          normalizeDiscipline(fighter.nulmeting_discipline) ||
          null,
        klasse_opgegeven: requestedClass,
        klasse_fightpassport:
          s(fighter.berekende_klasse) ||
          s(fighter.nulmeting_klasse) ||
          null,
        gewicht_opgegeven: gewicht,
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
          fighter_id: null,
          va_nummer: vaNummer,
          old_sportschool_id: oldSchool?.sportschool_id ?? null,
          old_sportschool_name: oldSchool?.naam ?? null,
          new_sportschool_id: sportschoolId,
          new_sportschool_name: schoolName,
          changed_by_user_id: user.id,
          changed_by_email: user.email ?? null,
          source: "manual_add",
          status: "open",
        });
      if (changeError) {
        console.error(
          "[matchmaker/add-fighter] sportschoolwijziging niet geregistreerd:",
          changeError,
        );
      }
    }

    await supabaseAdmin
      .from("matchmakings")
      .update({ last_updated_at: new Date().toISOString(), last_updated_by: user.id })
      .eq("id", matchmakingId);

    const processing = await processMatchmakingFighters({
      supabase: supabaseAdmin,
      matchmakingId,
      aanmeldingId: data.id,
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
