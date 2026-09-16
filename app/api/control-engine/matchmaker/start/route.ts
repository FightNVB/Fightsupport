// app/api/control-engine/matchmaker/start/route.ts
// Normale Matchmaker-controle: uitsluitend actuele centrale FightPassport DB-data.
// Geen scraper. Upload en Eindcontrole gebruiken de aparte full/scraper-flow.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildControleBoutContext, buildToernooiContext } from "@/lib/matchmaker/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/matchmaker/enrichControleBoutContext";
import { rulesEngine } from "@/lib/matchmaker/rulesEngine";
import { carryApprovedRecordDifferenceReviews } from "@/lib/matchmaker/carryRecordDifferenceReview";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const RUN_TYPE = "matchmaker_db_controle";

function norm(value: unknown) {
  return String(value ?? "").trim();
}

function isRoleAllowed(role: string | null | undefined) {
  return ["matchmaker", "admin", "superadmin"].includes(String(role ?? "").toLowerCase());
}

async function updateRun(controleRunId: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("controle_runs").update(patch).eq("id", controleRunId);
  if (error) console.warn("[control-engine/matchmaker/start] run update mislukt", error);
}

async function countBouts(matchmakingId: string) {
  const { count, error } = await supabase
    .from("matchmaking_bouts_raw")
    .select("id", { count: "exact", head: true })
    .eq("matchmaking_id", matchmakingId)
    .or("verwijderd.is.null,verwijderd.eq.false");
  if (error) throw error;
  return Number(count ?? 0);
}

async function createRun(args: {
  matchmakingId: string;
  userId: string | null;
  role: string | null;
  total: number;
}) {
  const { data, error } = await supabase.from("controle_runs").insert({
    matchmaking_id: args.matchmakingId,
    gestart_door_user_id: args.userId,
    gestart_door_rol: args.role,
    status: "running",
    gestart_op: new Date().toISOString(),
    run_type: RUN_TYPE,
    is_latest: true,
    totaal_aantal: args.total,
    verwerkt_aantal: 0,
    progress: 5,
    current_step: "Matchmaker DB-controle wordt voorbereid...",
  }).select("id").single();

  if (error) throw error;
  if (!data?.id) throw new Error("Geen controle_run_id ontvangen.");

  // Alleen oudere Matchmaker DB-runs verliezen 'latest'. Andere rollen/flows blijven ongemoeid.
  const { error: latestError } = await supabase.from("controle_runs")
    .update({ is_latest: false })
    .eq("matchmaking_id", args.matchmakingId)
    .eq("run_type", RUN_TYPE)
    .neq("id", data.id);
  if (latestError) console.warn("[control-engine/matchmaker/start] is_latest warning", latestError);

  return String(data.id);
}

async function finalizeDbControl(args: {
  matchmakingId: string;
  controleRunId: string;
  boutCount: number;
}) {
  try {
    await updateRun(args.controleRunId, { progress: 15, current_step: "Partij-context opbouwen uit matchmaking..." });
    await buildControleBoutContext(args.matchmakingId, args.controleRunId);

    await updateRun(args.controleRunId, { progress: 35, current_step: "Toernooi-context opbouwen..." });
    const toernooiRows = await buildToernooiContext(args.matchmakingId, args.controleRunId);

    await updateRun(args.controleRunId, { progress: 55, current_step: "Verrijken met actuele FightPassport DB-data..." });
    await enrichControleBoutContext(args.matchmakingId, args.controleRunId);

    const { data: ctxRows, error: ctxError } = await supabase.from("controle_bout_context")
      .select("*")
      .eq("matchmaking_id", args.matchmakingId)
      .eq("controle_run_id", args.controleRunId)
      .order("partij_nr", { ascending: true });
    if (ctxError) throw ctxError;
    if (args.boutCount > 0 && !(ctxRows ?? []).length) {
      throw new Error("Na build/enrich is geen controle_bout_context gevonden.");
    }

    await updateRun(args.controleRunId, { progress: 80, current_step: "Matchmaker RulesEngine draait..." });
    const hits = await rulesEngine({
      matchmaking_id: args.matchmakingId,
      controle_run_id: args.controleRunId,
      ctxRows: (ctxRows ?? []) as any[],
    });

    // Pas NA de actuele RulesEngine toe: alleen besluiten voor meldingen die in deze
    // nieuwe run opnieuw bestaan worden meegenomen. Verdwenen meldingen blijven historie.
    // Dezelfde helper bewaakt ook de speciale stabiele VA-pair regel voor partijverschil.
    const carriedRecordDifferences = await carryApprovedRecordDifferenceReviews({
      supabase,
      matchmakingId: args.matchmakingId,
      runId: args.controleRunId,
      currentContextRows: (ctxRows ?? []) as any[],
    });

    // Bewust GEEN delete van eerdere controle_resultaten/context/runs.
    // Historie en eerder genomen besluiten blijven beschikbaar.
    await updateRun(args.controleRunId, {
      status: "klaar",
      afgerond_op: new Date().toISOString(),
      is_latest: true,
      verwerkt_aantal: args.boutCount,
      progress: 100,
      current_step: "Matchmaker DB-controle klaar. Rapport is bijgewerkt.",
      foutmelding: null,
    });

    console.log("[matchmaker-db-controle] klaar", {
      matchmakingId: args.matchmakingId,
      controleRunId: args.controleRunId,
      ctxRows: (ctxRows ?? []).length,
      toernooiRows: Array.isArray(toernooiRows) ? toernooiRows.length : 0,
      hits: Array.isArray(hits) ? hits.length : 0,
      carriedRecordDifferences,
    });
  } catch (error: any) {
    console.error("[matchmaker-db-controle] mislukt", error);
    await updateRun(args.controleRunId, {
      status: "failed",
      afgerond_op: new Date().toISOString(),
      progress: 100,
      current_step: "Matchmaker DB-controle mislukt.",
      foutmelding: error?.message ?? String(error),
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = norm(body?.matchmaking_id);
    if (!matchmakingId) return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });

    const { userId, role } = await requireUserWithRole(req);
    if (!isRoleAllowed(role)) return NextResponse.json({ error: "Geen toegang tot Matchmaker-controle" }, { status: 403 });
    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });

    const boutCount = await countBouts(matchmakingId);
    if (!boutCount) return NextResponse.json({ error: "Geen partijen gevonden in deze matchmaking." }, { status: 400 });

    const controleRunId = await createRun({
      matchmakingId,
      userId: userId ?? null,
      role: role ?? null,
      total: boutCount,
    });

    void finalizeDbControl({ matchmakingId, controleRunId, boutCount });

    return NextResponse.json({
      ok: true,
      started: true,
      matchmaking_id: matchmakingId,
      controle_run_id: controleRunId,
      status: "running",
      scraper: null,
      pipeline: "matchmaker_db_control",
      scope: "normal_control",
    }, { status: 202 });
  } catch (error: any) {
    console.error("[control-engine/matchmaker/start] fout", error);
    return NextResponse.json({ error: error?.message ?? "Matchmaker DB-controle starten mislukt." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const matchmakingId = norm(url.searchParams.get("matchmaking_id"));
    const controleRunId = norm(url.searchParams.get("controle_run_id"));
    if (!matchmakingId && !controleRunId) {
      return NextResponse.json({ error: "matchmaking_id of controle_run_id ontbreekt" }, { status: 400 });
    }

    const { userId, role } = await requireUserWithRole(req);
    if (!isRoleAllowed(role)) return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    if (matchmakingId) await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });

    let query = supabase.from("controle_runs")
      .select("id,matchmaking_id,status,gestart_op,afgerond_op,run_type,progress,current_step,totaal_aantal,verwerkt_aantal,foutmelding")
      .eq("run_type", RUN_TYPE);
    if (controleRunId) query = query.eq("id", controleRunId);
    if (matchmakingId) query = query.eq("matchmaking_id", matchmakingId);

    const { data, error } = await query.order("gestart_op", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: true, run: data ?? null });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Matchmaker DB-controle-status ophalen mislukt." }, { status: 500 });
  }
}
