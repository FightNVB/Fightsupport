import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
} from "@/app/api/_utils/authz";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await context.params;

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

    const { userId, role } = await requireUserWithRole(req);
    const matchmakingId = String(run.matchmaking_id ?? "");

    if (matchmakingId) {
      await assertCanAccessMatchmaking({
        matchmaking_id: matchmakingId,
        userId,
        role,
      });
    } else if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    let event = null;
    if (run.event_id) {
      const { data: ev } = await supabaseAdmin
        .from("evenementen")
        .select("id, naam, datum, matchmaker, promotor, hoofdofficial")
        .eq("id", run.event_id)
        .maybeSingle();
      event = ev ?? null;
    }

    const { data: scrapeItems, error: itemsErr } = await supabaseAdmin
      .from("controle_scrape_items")
      .select("*")
      .eq("controle_run_id", runId)
      .order("va_nummer", { ascending: true });

    if (itemsErr) throw itemsErr;

    return NextResponse.json({
      ok: true,
      run,
      event,
      scrape_items: scrapeItems ?? [],
    });
  } catch (e: any) {
    console.error("❌ CONTROL-RUN SCRAPE RESULTS GET ERROR", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Onbekende fout." },
      { status: 500 }
    );
  }
}
