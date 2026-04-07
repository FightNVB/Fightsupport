import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/matchmaker/access";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
} from "@/app/api/_utils/authz";

export const runtime = "nodejs";

async function deleteEq(table: string, column: string, value: string) {
  const { error } = await supabaseAdmin.from(table).delete().eq(column, value);
  if (error) {
    throw new Error(`[${table}] delete eq ${column} failed: ${error.message}`);
  }
}

async function bestEffortDeleteEq(table: string, column: string, value: string) {
  try {
    await deleteEq(table, column, value);
  } catch (e: any) {
    console.warn(`[matchmaker/delete-matchmaking] skip ${table}:`, e?.message);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const matchmaking_id = String(body?.matchmaking_id ?? "").trim();

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt" },
        { status: 400 }
      );
    }

    const { userId, role } = await requireUserWithRole(req);
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    console.log("[matchmaker/delete-matchmaking] start", { matchmaking_id });

    // 0) centrale hoofdrecord + event_id ophalen
    const { data: centralRow, error: centralErr } = await supabaseAdmin
      .from("matchmakings")
      .select("id, event_id")
      .eq("id", matchmaking_id)
      .maybeSingle();

    if (centralErr) throw centralErr;

    const event_id = centralRow?.event_id ? String(centralRow.event_id) : null;

    const { data: insRows, error: insErr } = await supabaseAdmin
      .from("matchmaker_inschrijvingen")
      .select("id, upload_id, va_nummer")
      .eq("matchmaking_id", matchmaking_id);

    if (insErr) throw insErr;

    const { data: runRows, error: runErr } = await supabaseAdmin
      .from("matchmaker_controle_runs")
      .select("id")
      .eq("matchmaking_id", matchmaking_id);

    if (runErr) throw runErr;

    // 1) zwaarste children eerst
    await bestEffortDeleteEq("dispensatie_requests", "matchmaking_id", matchmaking_id);
    await bestEffortDeleteEq("dispensatie_hits", "matchmaking_id", matchmaking_id);

    await bestEffortDeleteEq("matchmaker_controle_resultaten", "matchmaking_id", matchmaking_id);
    await bestEffortDeleteEq("matchmaker_bout_context", "matchmaking_id", matchmaking_id);
    await bestEffortDeleteEq("controle_audit_events", "matchmaking_id", matchmaking_id);

    await bestEffortDeleteEq("matchmaker_bouts_raw", "matchmaking_id", matchmaking_id);

    await bestEffortDeleteEq("lineup_bouts", "matchmaking_id", matchmaking_id);
    await bestEffortDeleteEq("weigh_in_bouts", "matchmaking_id", matchmaking_id);
    await bestEffortDeleteEq("weigh_in_audit", "matchmaking_id", matchmaking_id);

    await bestEffortDeleteEq("matchmaker_fighter_context", "matchmaking_id", matchmaking_id);
    await bestEffortDeleteEq("matchmaker_fighters_raw", "matchmaking_id", matchmaking_id);
    await bestEffortDeleteEq("matchmaker_uitslagen_raw", "matchmaking_id", matchmaking_id);

    await bestEffortDeleteEq("matchmaker_controle_runs", "matchmaking_id", matchmaking_id);

    // 2) centrale / alternatieve tabellen ook opruimen
    await bestEffortDeleteEq("controle_resultaten", "matchmaking_id", matchmaking_id);
    await bestEffortDeleteEq("controle_bout_context", "matchmaking_id", matchmaking_id);
    await bestEffortDeleteEq("controle_runs", "matchmaking_id", matchmaking_id);
    await bestEffortDeleteEq("controle_uitslagen", "matchmaking_id", matchmaking_id);

    await bestEffortDeleteEq("matchmaking_bouts_raw", "matchmaking_id", matchmaking_id);
    await bestEffortDeleteEq("fighters_raw", "matchmaking_id", matchmaking_id);
    await bestEffortDeleteEq("uitslagen_raw", "matchmaking_id", matchmaking_id);

    await bestEffortDeleteEq("definitive_matchmaking_bouts", "matchmaking_id", matchmaking_id);
    await bestEffortDeleteEq("definitive_matchmakings", "matchmaking_id", matchmaking_id);

    await bestEffortDeleteEq("matchmaker_matches", "matchmaking_id", matchmaking_id);

    // 3) inschrijvingen
    await bestEffortDeleteEq("matchmaker_inschrijvingen", "matchmaking_id", matchmaking_id);

    // 4) uploads
    await bestEffortDeleteEq("matchmaking_uploads", "matchmaking_id", matchmaking_id);
    await bestEffortDeleteEq("matchmaker_uploads", "matchmaking_id", matchmaking_id);

    // 5) flowlog opruimen vóór hoofdrecord
    await bestEffortDeleteEq("matchmaking_flow_log", "matchmaking_id", matchmaking_id);

    // 6) matchmaker hoofdrecord
    await bestEffortDeleteEq("matchmaker_matchmakings", "id", matchmaking_id);

    // 7) centraal hoofdrecord
    if (centralRow) {
      await deleteEq("matchmakings", "id", matchmaking_id);
    }

    // 8) event alleen verwijderen als er geen andere matchmakings meer aan hangen
    let eventDeleted = false;

    if (event_id) {
      const { count, error: countErr } = await supabaseAdmin
        .from("matchmakings")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event_id);

      if (countErr) throw countErr;

      if ((count ?? 0) === 0) {
        const { error: eventDeleteErr } = await supabaseAdmin
          .from("events")
          .delete()
          .eq("id", event_id);

        if (eventDeleteErr) {
          throw new Error(`[events] delete eq id failed: ${eventDeleteErr.message}`);
        }

        eventDeleted = true;
      }
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      event_id,
      event_deleted: eventDeleted,
      deleted: {
        inschrijvingen: insRows?.length ?? 0,
        runs: runRows?.length ?? 0,
      },
    });
  } catch (e: any) {
    console.error("❌ delete-matchmaking error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}