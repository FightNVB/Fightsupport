// app/api/control-engine/delete-matchmaking/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const matchmaking_id = body?.matchmaking_id as string | undefined;
    if (!matchmaking_id) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    }

// ✅ AuthZ: matchmaker alleen eigen uploads, officials alleen eigen bondteam, (super)admin overal
const { userId, role } = await requireUserWithRole(req);
await assertCanAccessMatchmaking({ matchmaking_id, userId, role });


    // 1) runs ophalen (voor cascade deletes per run)
    const { data: runs, error: runsErr } = await supabaseAdmin
      .from("controle_runs")
      .select("id")
      .eq("matchmaking_id", matchmaking_id);

    if (runsErr) throw runsErr;

    const runIds = (runs ?? []).map((r: any) => r.id).filter(Boolean);

    // 2) resultaten/context per run weg
    if (runIds.length) {
      const { error: resErr } = await supabaseAdmin
        .from("controle_resultaten")
        .delete()
        .in("controle_run_id", runIds);
      if (resErr) throw resErr;

      const { error: ctxErr } = await supabaseAdmin
        .from("controle_bout_context")
        .delete()
        .in("controle_run_id", runIds);
      if (ctxErr) throw ctxErr;

      // uitslagen_raw is snapshot per run
      const { error: uErr } = await supabaseAdmin
        .from("uitslagen_raw")
        .delete()
        .in("controle_run_id", runIds);
      if (uErr) throw uErr;
    }

    // 3) runs weg
    {
      const { error } = await supabaseAdmin
        .from("controle_runs")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    // 4) matchmaking data weg
    {
      const { error } = await supabaseAdmin
        .from("matchmaking_bouts_raw")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    {
      const { error } = await supabaseAdmin
        .from("matchmaking_uploads")
        .delete()
        .eq("matchmaking_id", matchmaking_id);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, matchmaking_id });
  } catch (e: any) {
    console.error("❌ delete-matchmaking error:", e);
    return NextResponse.json({ error: e?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
