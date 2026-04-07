import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAnyRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const auth = await requireAnyRole(req, ["matchmaker", "superadmin", "admin"]);
    const userId = auth.userId;
    const role = String(auth.role || "").trim().toLowerCase();

    const body = await req.json();

    const naam = String(body?.naam ?? "").trim();
    const datum = String(body?.datum ?? "").trim();
    const locatie = String(body?.locatie ?? "").trim() || null;
    const promotor = String(body?.promotor ?? "").trim() || null;
    const bondteam = String(body?.bondteam ?? "").trim() || null;
    const matchmakerNaam = String(body?.matchmaker_naam ?? "").trim() || null;

    if (!naam) {
      return NextResponse.json({ error: "Naam is verplicht." }, { status: 400 });
    }

    if (!datum) {
      return NextResponse.json({ error: "Datum is verplicht." }, { status: 400 });
    }

    if (!bondteam) {
      return NextResponse.json({ error: "Bondteam is verplicht." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const matchmakingId = randomUUID();

    // 1) eerst event maken
    const { data: eventRow, error: eventError } = await supabaseAdmin
      .from("events")
      .insert({
        naam,
        datum,
        locatie,
        status: "draft",
        bondteam,
        matchmaker: matchmakerNaam,
        promotor,
      })
      .select("id")
      .single();

    if (eventError) {
      console.error("create-matchmaking event insert error:", eventError);
      return NextResponse.json(
        { error: eventError.message || "Aanmaken event mislukt." },
        { status: 500 }
      );
    }

    const eventId = String(eventRow?.id ?? "").trim();
    if (!eventId) {
      return NextResponse.json(
        { error: "Kon event_id niet bepalen." },
        { status: 500 }
      );
    }

    // 2) centrale lifecycle/hoofdrecord
    const { error: lifecycleError } = await supabaseAdmin
      .from("matchmakings")
      .insert({
        id: matchmakingId,
        naam,
        datum,
        locatie,
        matchmaker_id: userId,
        status: "nieuw",
        created_at: now,
        event_id: eventId,
        bron_type: "matchmaker_app",
        stadium: "nieuw",
        huidige_eigenaar_type: "matchmaker",
        huidige_eigenaar_user_id: userId,
        huidige_eigenaar_bondteam: null,
        is_actief: true,
        locked_for_editing: false,
        is_archived: false,
        last_updated_at: now,
        last_updated_by: userId,
      });

    if (lifecycleError) {
      console.error("create-matchmaking lifecycle insert error:", lifecycleError);

      await supabaseAdmin.from("events").delete().eq("id", eventId);

      return NextResponse.json(
        { error: lifecycleError.message || "Aanmaken matchmakings mislukt." },
        { status: 500 }
      );
    }

    // 3) matchmaker-specifieke record
    const { error: mmError } = await supabaseAdmin
      .from("matchmaker_matchmakings")
      .insert({
        id: matchmakingId,
        naam,
        datum,
        locatie,
        promotor,
        bondteam,
        matchmaker_id: userId,
        matchmaker_naam: matchmakerNaam,
        status: "nieuw",
        official_release: false,
        created_at: now,
        updated_at: now,
      });

    if (mmError) {
      console.error("create-matchmaking matchmaker_matchmakings insert error:", mmError);

      await supabaseAdmin.from("matchmakings").delete().eq("id", matchmakingId);
      await supabaseAdmin.from("events").delete().eq("id", eventId);

      return NextResponse.json(
        { error: mmError.message || "Aanmaken matchmaker_matchmakings mislukt." },
        { status: 500 }
      );
    }

    // 4) flowlog
    const { error: flowLogError } = await supabaseAdmin
      .from("matchmaking_flow_log")
      .insert({
        matchmaking_id: matchmakingId,
        actie_type: "created",
        naar_stadium: "nieuw",
        naar_eigenaar_type: "matchmaker",
        naar_eigenaar_user_id: userId,
        actor_user_id: userId,
        actor_role: role || "matchmaker",
        opmerking: "Matchmaking aangemaakt vanuit matchmaker app",
        metadata: {
          source: "app/api/matchmaker/create-matchmaking/route.ts",
          bondteam,
          promotor,
          event_id: eventId,
        },
        created_at: now,
      });

    if (flowLogError) {
      console.error("create-matchmaking flowlog warning:", flowLogError);
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      event_id: eventId,
    });
  } catch (e: any) {
    console.error("create-matchmaking error:", e);
    return NextResponse.json(
      { error: e?.message || "Onbekende fout" },
      { status: 500 }
    );
  }
}