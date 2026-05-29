// app/api/control-engine/delete-matchmaking/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
} from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const isMissingColumnError = (error: any) =>
  error?.code === "42703" ||
  String(error?.message ?? "").toLowerCase().includes("column") &&
    String(error?.message ?? "").toLowerCase().includes("does not exist");

const isMissingTableError = (error: any) =>
  error?.code === "42P01" ||
  String(error?.message ?? "").toLowerCase().includes("relation") &&
    String(error?.message ?? "").toLowerCase().includes("does not exist");

async function deleteByMatchmakingId(table: string, matchmaking_id: string) {
  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq("matchmaking_id", matchmaking_id);

  // Sommige oudere tabellen hebben geen matchmaking_id of bestaan niet in elke omgeving.
  // Dan ruimen we ze elders op via controle_run_id, of slaan we ze veilig over.
  if (error && !isMissingColumnError(error) && !isMissingTableError(error)) {
    throw error;
  }
}

async function deleteByControleRunIds(table: string, runIds: string[]) {
  if (!runIds.length) return;

  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .in("controle_run_id", runIds);

  if (error && !isMissingColumnError(error) && !isMissingTableError(error)) {
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const matchmaking_id = body?.matchmaking_id as string | undefined;

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt" },
        { status: 400 }
      );
    }

    const { userId, role } = await requireUserWithRole(req);
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    // 0) Hoofdrecord eerst ophalen, want hier zit meestal de FK naar events.
    const { data: matchmakingRow, error: matchmakingLookupError } =
      await supabaseAdmin
        .from("matchmakings")
        .select("id, event_id")
        .eq("id", matchmaking_id)
        .maybeSingle();

    if (matchmakingLookupError) throw matchmakingLookupError;

    if (!matchmakingRow) {
      return NextResponse.json(
        { error: "Matchmaking niet gevonden" },
        { status: 404 }
      );
    }

    // Fallback uit uploads alleen voor logging/veiligheid.
    const { data: uploadRow, error: uploadLookupError } = await supabaseAdmin
      .from("matchmaking_uploads")
      .select("id, matchmaking_id, event_id")
      .eq("matchmaking_id", matchmaking_id)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (uploadLookupError) throw uploadLookupError;

    const event_id = matchmakingRow?.event_id ?? uploadRow?.event_id ?? null;

    // 1) Controle-runs ophalen voordat we controle_runs verwijderen.
    const { data: runs, error: runsErr } = await supabaseAdmin
      .from("controle_runs")
      .select("id")
      .eq("matchmaking_id", matchmaking_id);

    if (runsErr) throw runsErr;

    const runIds = (runs ?? []).map((r: any) => r.id).filter(Boolean);

    // 2) Alles verwijderen wat aan controle_run_id hangt.
    // Dit voorkomt FK-problemen als sommige tabellen geen directe matchmaking_id hebben.
    await deleteByControleRunIds("controle_resultaten", runIds);
    await deleteByControleRunIds("controle_bout_context", runIds);
    await deleteByControleRunIds("controle_toernooi_context", runIds);
    await deleteByControleRunIds("uitslagen_raw", runIds);

    // 3) Cleanup op matchmaking_id.
    // Kind-tabellen eerst, daarna raw/context/run-tabellen, daarna uploads en hoofdrecord.
    const childTablesByMatchmakingId = [
      "weigh_in_audit",
      "weigh_in_bouts",
      "uitslagen_runs",
      "controle_resultaten",
      "controle_bout_context",
      "controle_toernooi_context",
      "dispensatie_requests",
      "controle_uitslagen",
      "definitive_matchmaking_bouts",
      "definitive_matchmakings",
      "matchmaking_bouts_raw",
      "fighters_raw",
      "uitslagen_raw",
      "controle_runs",
    ];

    for (const table of childTablesByMatchmakingId) {
      await deleteByMatchmakingId(table, matchmaking_id);
    }

    // 4) Uploads weg.
    await deleteByMatchmakingId("matchmaking_uploads", matchmaking_id);

    // 5) Matchmaking hoofdrecord weg.
    {
      const { error } = await supabaseAdmin
        .from("matchmakings")
        .delete()
        .eq("id", matchmaking_id);
      if (error) throw error;
    }

    // 6) Event pas verwijderen nadat matchmakings weg is,
    // en alleen als geen andere matchmaking meer naar dit event verwijst.
    let deletedEvent = false;

    if (event_id) {
      const { count: stillReferencedCount, error: refCheckError } =
        await supabaseAdmin
          .from("matchmakings")
          .select("id", { count: "exact", head: true })
          .eq("event_id", event_id);

      if (refCheckError) throw refCheckError;

      if ((stillReferencedCount ?? 0) === 0) {
        const { error } = await supabaseAdmin
          .from("events")
          .delete()
          .eq("id", event_id);

        if (error) throw error;
        deletedEvent = true;
      }
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      event_id,
      deleted_event: deletedEvent,
      deleted_all_for_matchmaking_id: true,
    });
  } catch (e: any) {
    console.error("❌ delete-matchmaking error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}
