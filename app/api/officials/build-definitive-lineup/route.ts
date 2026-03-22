import { NextResponse } from "next/server";
import {
  requireUserFromAuthHeader,
  getUserRoleNames,
  supabaseAdmin,
} from "@/lib/api/requireRole";

function norm(v: unknown) {
  return String(v ?? "").trim();
}

function lower(v: unknown) {
  return norm(v).toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = norm((body as any)?.matchmakingId);

    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmakingId ontbreekt." }, { status: 400 });
    }

    const { user, userId } = await requireUserFromAuthHeader(req);
    const roleNames = await getUserRoleNames(supabaseAdmin, userId);

    const canBuild =
      roleNames.includes("matchmaker") ||
      roleNames.includes("official") ||
      roleNames.includes("hoofdofficial") ||
      roleNames.includes("admin") ||
      roleNames.includes("superadmin");

    const isAdmin =
      roleNames.includes("admin") || roleNames.includes("superadmin");

    if (!canBuild) {
      return NextResponse.json({ error: "Geen toegang." }, { status: 403 });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name, bondteam")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Gebruikersprofiel niet gevonden." }, { status: 403 });
    }

    const { data: mm, error: mmErr } = await supabaseAdmin
      .from("matchmaking_uploads")
      .select("matchmaking_id, bondteam, evenement_naam, evenement_datum, locatie")
      .eq("matchmaking_id", matchmakingId)
      .single();

    if (mmErr || !mm) {
      return NextResponse.json({ error: "Matchmaking niet gevonden." }, { status: 404 });
    }

    if (!isAdmin && lower(mm.bondteam) !== lower(profile.bondteam)) {
      return NextResponse.json(
        { error: "Je mag alleen je eigen bondteam verwerken." },
        { status: 403 }
      );
    }

    const { data: goodBouts, error: weighErr } = await supabaseAdmin
      .from("weigh_in_bouts")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .in("eindstatus", ["OK", "GOEDGEKEURD_MET_DISPENSATIE"])
      .order("partij_nr", { ascending: true });

    if (weighErr) {
      return NextResponse.json({ error: weighErr.message }, { status: 500 });
    }

    if (!goodBouts || goodBouts.length === 0) {
      return NextResponse.json(
        { error: "Er zijn geen toegelaten partijen om op te nemen in de lineup." },
        { status: 400 }
      );
    }

    const { data: existingHeader, error: existingHeaderErr } = await supabaseAdmin
      .from("definitive_matchmakings")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .maybeSingle();

    if (existingHeaderErr) {
      return NextResponse.json({ error: existingHeaderErr.message }, { status: 500 });
    }

    if (existingHeader?.locked) {
      return NextResponse.json(
        { error: "Deze definitieve lineup staat al vast en kan niet meer opnieuw worden opgebouwd." },
        { status: 400 }
      );
    }

    const headerPayload = {
      matchmaking_id: matchmakingId,
      bondteam: mm.bondteam ?? "",
      evenement_naam: mm.evenement_naam,
      evenement_datum: mm.evenement_datum,
      locatie: mm.locatie,
      status: "concept",
      locked: false,
    };

    const { data: header, error: headerErr } = await supabaseAdmin
      .from("definitive_matchmakings")
      .upsert(headerPayload, { onConflict: "matchmaking_id" })
      .select("*")
      .single();

    if (headerErr || !header) {
      return NextResponse.json(
        { error: headerErr?.message ?? "Definitieve lineup header kon niet worden opgeslagen." },
        { status: 500 }
      );
    }

    const { error: deleteErr } = await supabaseAdmin
      .from("definitive_matchmaking_bouts")
      .delete()
      .eq("definitive_matchmaking_id", header.id);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    const boutRows = goodBouts.map((row: any, index: number) => ({
      definitive_matchmaking_id: header.id,
      matchmaking_id: row.matchmaking_id,
      weigh_in_bout_id: row.id,
      partij_nr: row.partij_nr,
      sort_order: index + 1,
      is_locked: false,
      bondteam: row.bondteam ?? mm.bondteam ?? "",
      discipline: row.discipline,
      klasse_mm: row.klasse_mm,
      max_gewicht: row.max_gewicht,
      rood_naam: row.rood_naam,
      rood_gym: row.rood_gym,
      rood_va: row.rood_va,
      rood_geboortedatum: row.rood_geboortedatum ?? null,
      blauw_geboortedatum: row.blauw_geboortedatum ?? null,
      evenement_datum: mm.evenement_datum ?? null,
      leeftijd_type: row.leeftijd_type ?? null,
      rood_gewogen_gewicht: row.rood_gewogen_gewicht,
      blauw_naam: row.blauw_naam,
      blauw_gym: row.blauw_gym,
      blauw_va: row.blauw_va,
      blauw_gewogen_gewicht: row.blauw_gewogen_gewicht,
      gewicht_verschil: row.gewicht_verschil,
      eindstatus: row.eindstatus,
      dispensatie_verleend: row.dispensatie_verleend,
      weging_notitie: row.weging_notitie,
    }));

    const { error: insertErr } = await supabaseAdmin
      .from("definitive_matchmaking_bouts")
      .insert(boutRows);

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      definitiveMatchmakingId: header.id,
      savedBouts: boutRows.length,
      builtBy: user.id,
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout bij opbouwen van definitieve lineup." },
      { status: 500 }
    );
  }
}