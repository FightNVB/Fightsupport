import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    const runId = context.params.id;

    // 1) Haal run op
    const { data: run, error: runErr } = await supabaseAdmin
      .from("controle_runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (runErr || !run) {
      return NextResponse.json(
        { ok: false, error: "Controle-run niet gevonden." },
        { status: 404 }
      );
    }

// ✅ AuthZ: scope op matchmaking_id
const { userId, role } = await requireUserWithRole(req);
const mmId = String((run as any)?.matchmaking_id ?? "");
if (mmId) {
  await assertCanAccessMatchmaking({ matchmaking_id: mmId, userId, role });
} else {
  // zonder matchmaking_id: alleen admin/superadmin
  if (role !== "admin" && role !== "superadmin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
}

    // 2) Haal event erbij (naam + datum)
    let event = null;

    if (run.event_id) {
      const { data: ev } = await supabaseAdmin
        .from("evenementen")
        .select("id, naam, datum, matchmaker, promotor, hoofdofficial")
        .eq("id", run.event_id)
        .maybeSingle();

      event = ev ?? null;
    }

    // 3) Haal ALLE resultaten
    const { data: resultaten, error: resErr } = await supabaseAdmin
      .from("controle_resultaten")
      .select("*")
      .eq("run_id", runId)
      .order("partij_index", { ascending: true });

    if (resErr) throw resErr;

    return NextResponse.json({
      ok: true,
      run,
      event,
      resultaten: resultaten ?? [],
    });
  } catch (e: any) {
    console.error("❌ CONTROL-RUN GET ERROR", e);
    return NextResponse.json(
      { ok: false, error: e.message ?? "Onbekende fout." },
      { status: 500 }
    );
  }
}
