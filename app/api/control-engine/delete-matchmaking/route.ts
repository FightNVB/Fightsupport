// app/api/control-engine/delete-matchmaking/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
} from "@/app/api/_utils/authz";

export const runtime = "nodejs";

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

    // 0) hoofdrecord + event_id ophalen uit matchmakings (leidende bron)
    const { data: matchmakingRow, error: matchmakingLookupError } =
      await supabaseAdmin
        .from("matchmakings")
        .select("id, event_id")
        .eq("id", matchmaking_id)
        .maybeSingle();

    if (matchmakingLookupError) throw matchmakingLookupError;
    if (!matchmakingRow) {
      return NextResponse.json(
        { error: "Matchmaking niet gevonden." },
        { status: 404 }
      );
    }

    const event_id = matchmakingRow.event_id ?? null;

    // 1) runs ophalen
    const { data: runs, error: runsErr } = await supabaseAdmin
      .from("controle_runs")
      .select("id")
      .eq("matchmaking_id", matchmaking_id);

    if (runsErr) throw runsErr;

    const runIds = (runs ?? []).map((r: any) => r.id).filter(Boolean);

    // 2) alles verwijderen wat aan controle_run_id hangt
    if (runIds.length) {
      {
        const { error } = await supabaseAdmin
          .from("controle_resultaten")
          .delete()
          .in("controle_run_id", runIds);
        if (error) throw error;
      }

      {
        const { error } = await supabaseAdmin
          .from("controle_bout_context")
          .delete()
          .in("controle_run_id", runIds);
        if (error) throw error;
      }

      {
        const { error } = await supabaseAdmin
          .from("uitslagen_raw")
          .delete()
          .in("controle_run_id", runIds);
        if (error) throw error;
      }
    }

    // 3) cleanup op matchmaking_id
    {
      const { error } = await supabaseAdmin
        .from("controle_resultaten")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    {
      const { error } = await supabaseAdmin
        .from("controle_bout_context")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    {
      const { error } = await supabaseAdmin
        .from("dispensatie_requests")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    {
      const { error } = await supabaseAdmin
        .from("controle_uitslagen")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    {
      const { error } = await supabaseAdmin
        .from("weigh_in_audit")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    {
      const { error } = await supabaseAdmin
        .from("weigh_in_bouts")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    {
      const { error } = await supabaseAdmin
        .from("definitive_matchmaking_bouts")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    {
      const { error } = await supabaseAdmin
        .from("definitive_matchmakings")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    {
      const { error } = await supabaseAdmin
        .from("matchmaking_bouts_raw")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    {
      const { error } = await supabaseAdmin
        .from("fighters_raw")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    {
      const { error } = await supabaseAdmin
        .from("uitslagen_raw")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    {
      const { error } = await supabaseAdmin
        .from("controle_runs")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    // lifecycle log eerst weg als die FK naar matchmakings heeft
    {
      const { error } = await supabaseAdmin
        .from("matchmaking_flow_log")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error && error.code !== "PGRST205") throw error;
    }

    // 4) uploads weg
    {
      const { error } = await supabaseAdmin
        .from("matchmaking_uploads")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    // 5) matchmaking hoofdrecord weg
    {
      const { error } = await supabaseAdmin
        .from("matchmakings")
        .delete()
        .eq("id", matchmaking_id);
      if (error) throw error;
    }

    // 6) event pas verwijderen als er geen andere matchmakings meer aan hangen
    let eventDeleted = false;

    if (event_id) {
      const { count, error: remainingErr } = await supabaseAdmin
        .from("matchmakings")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event_id);

      if (remainingErr) throw remainingErr;

      if ((count ?? 0) === 0) {
        const { error } = await supabaseAdmin
          .from("events")
          .delete()
          .eq("id", event_id);
        if (error) throw error;
        eventDeleted = true;
      }
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      event_id,
      event_deleted: eventDeleted,
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