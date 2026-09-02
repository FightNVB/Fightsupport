import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  assertCanAccessMatchmaking,
  requireAnyRole,
} from "@/app/api/_utils/authz";

import { buildControleBoutContext } from "@/lib/matchmaker/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/matchmaker/enrichControleBoutContext";
import { rulesEngine } from "@/lib/matchmaker/rulesEngine";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function clean(v: unknown) {
  const value = String(v ?? "").trim();
  return value || null;
}

function toNum(v: unknown) {
  if (v == null || v === "") return null;
  const value = Number(String(v).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(value) ? value : null;
}

function toVa(v: unknown): string | null {
  const value = String(v ?? "").replace(/\D/g, "");
  return value || null;
}

function makeBoutUid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `bout-${Date.now()}`;
  }
}

async function nextPartijNr(matchmakingId: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmaking_bouts_raw")
    .select("partij_nr")
    .eq("matchmaking_id", matchmakingId);

  if (error) throw error;

  const nummers = (data ?? [])
    .map((row: any) => Number(row?.partij_nr))
    .filter((value: number) => Number.isFinite(value));

  return nummers.length ? Math.max(...nummers) + 1 : 1;
}

async function getLatestControleRunId(matchmakingId: string) {
  const { data: runRows, error: runError } = await supabaseAdmin
    .from("controle_runs")
    .select("id")
    .eq("matchmaking_id", matchmakingId)
    .order("gestart_op", { ascending: false, nullsFirst: false })
    .order("afgerond_op", { ascending: false, nullsFirst: false })
    .limit(1);

  if (runError) throw runError;

  const runId = String(runRows?.[0]?.id ?? "").trim();
  if (runId) return runId;

  // Fallback voor oudere matchmakings waarbij controle_runs niet meer compleet is,
  // maar controle_bout_context nog wel een bruikbare run bevat.
  const { data: contextRows, error: contextError } = await supabaseAdmin
    .from("controle_bout_context")
    .select("controle_run_id, created_at")
    .eq("matchmaking_id", matchmakingId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (contextError) throw contextError;

  return String(contextRows?.[0]?.controle_run_id ?? "").trim() || null;
}

async function createControleRun(
  matchmakingId: string,
  userId: string,
  role: string,
) {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("controle_runs")
    .insert({
      matchmaking_id: matchmakingId,
      gestart_door_user_id: userId,
      gestart_door_rol: role,
      status: "running",
      gestart_op: now,
      run_type: "manual_add_bout",
      is_latest: true,
      totaal_aantal: 0,
      verwerkt_aantal: 0,
      progress: 0,
      current_step: "Controle wordt gestart...",
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) {
    throw new Error("Controlerun aanmaken gaf geen id terug.");
  }

  const { error: latestError } = await supabaseAdmin
    .from("controle_runs")
    .update({ is_latest: false })
    .eq("matchmaking_id", matchmakingId)
    .neq("id", data.id);

  if (latestError) {
    console.warn(
      "[control-engine/add-bout] Andere controleruns konden niet op is_latest=false worden gezet",
      latestError,
    );
  }

  return String(data.id);
}

async function rebuildCompleteControle(
  matchmakingId: string,
  controleRunId: string,
) {
  await buildControleBoutContext(matchmakingId, controleRunId);
  await enrichControleBoutContext(matchmakingId, controleRunId);

  const { data: ctxRows, error: ctxError } = await supabaseAdmin
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .eq("controle_run_id", controleRunId);

  if (ctxError) throw ctxError;
  if (!ctxRows?.length) {
    throw new Error("Controlecontext voor deze matchmaking is niet opgebouwd.");
  }

  // rulesEngine slaat de controle_resultaten zelf op via saveControleResultaten.
  await rulesEngine({
    controle_run_id: controleRunId,
    matchmaking_id: matchmakingId,
    ctxRows,
  });

  const now = new Date().toISOString();
  const { error: finishError } = await supabaseAdmin
    .from("controle_runs")
    .update({
      status: "klaar",
      afgerond_op: now,
      verwerkt_aantal: ctxRows.length,
      totaal_aantal: ctxRows.length,
      progress: 100,
      current_step: "Controle klaar.",
      foutmelding: null,
      is_latest: true,
    })
    .eq("id", controleRunId);

  if (finishError) throw finishError;

  return ctxRows.length;
}

async function rebuildControleForPartij(
  matchmakingId: string,
  controleRunId: string,
  partijNr: number,
) {
  // Exact dezelfde scoped flow als create-match: alleen de nieuw toegevoegde partij.
  await buildControleBoutContext(matchmakingId, controleRunId, {
    partij_nr: partijNr,
  });

  await enrichControleBoutContext(matchmakingId, controleRunId, {
    partij_nr: partijNr,
  });

  const { data: ctxRows, error: ctxError } = await supabaseAdmin
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .eq("controle_run_id", controleRunId)
    .eq("partij_nr", partijNr);

  if (ctxError) throw ctxError;
  if (!ctxRows?.length) {
    throw new Error(`Controlecontext voor partij ${partijNr} is niet opgebouwd.`);
  }

  // scoped_partij_nr zorgt ervoor dat saveControleResultaten alleen deze partij vervangt.
  await rulesEngine({
    controle_run_id: controleRunId,
    matchmaking_id: matchmakingId,
    ctxRows,
    scoped_partij_nr: partijNr,
  });

  const now = new Date().toISOString();
  const { error: finishError } = await supabaseAdmin
    .from("controle_runs")
    .update({
      status: "klaar",
      afgerond_op: now,
      current_step: "Controle klaar.",
      foutmelding: null,
      is_latest: true,
    })
    .eq("id", controleRunId);

  if (finishError) throw finishError;

  return ctxRows.length;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await requireAnyRole(req, [
      "admin",
      "superadmin",
      "official",
      "hoofdofficial",
      "matchmaker",
    ]);

    const body = await req.json().catch(() => ({}));

    const matchmakingId = String(body?.matchmaking_id ?? "").trim();
    if (!matchmakingId) {
      throw Object.assign(new Error("matchmaking_id ontbreekt."), { status: 400 });
    }

    await assertCanAccessMatchmaking({
      matchmaking_id: matchmakingId,
      userId,
      role,
    });

    const vaRood = toVa(body?.va_rood);
    const vaBlauw = toVa(body?.va_blauw);

    if (!vaRood) {
      throw Object.assign(new Error("VA-nummer rode vechter ontbreekt."), {
        status: 400,
      });
    }
    if (!vaBlauw) {
      throw Object.assign(new Error("VA-nummer blauwe vechter ontbreekt."), {
        status: 400,
      });
    }

    const partijNr = await nextPartijNr(matchmakingId);
    const maxGewicht = toNum(body?.max_gewicht);

    // Handmatig toevoegen moet dezelfde bronstructuur krijgen als submit-matchmaking,
    // alleen zonder upload_id. Naam, sportschool, gewicht, klasse en discipline zijn
    // matchmaking-input. Build zoekt daarna UITSLUITEND via het VA-nummer de centrale
    // FightPassport-data en zet die apart in de *_fp velden van controle_bout_context.
    const insertRow = {
      matchmaking_id: matchmakingId,
      bout_uid: makeBoutUid(),
      partij_nr: partijNr,

      rood_naam: clean(body?.rood_naam),
      rood_gym: clean(body?.rood_gym),
      va_rood: vaRood,
      rood_geboortedatum: null,
      rood_gewicht: toNum(body?.rood_gewicht),

      blauw_naam: clean(body?.blauw_naam),
      blauw_gym: clean(body?.blauw_gym),
      va_blauw: vaBlauw,
      blauw_geboortedatum: null,
      blauw_gewicht: toNum(body?.blauw_gewicht),

      discipline: clean(body?.discipline),
      klasse: clean(body?.klasse),
      is_toernooi: false,
      toernooi_code: null,

      max_gewicht: maxGewicht,
      max_gewicht_notatie: maxGewicht != null ? `-${maxGewicht}` : null,
      max_gewicht_type: maxGewicht != null ? "up_to" : null,

      raw_json: {
        source: "manual_add_bout",
        created_by: userId,
        role,
      },
      created_at: new Date().toISOString(),
      laatste_bewerking_op: new Date().toISOString(),
    };

    // Net als create-match: de partij wordt daadwerkelijk aan matchmaking_bouts_raw toegevoegd.
    const { data: bout, error: insertError } = await supabaseAdmin
      .from("matchmaking_bouts_raw")
      .insert(insertRow)
      .select("*")
      .single();

    if (insertError) throw insertError;

    // Hergebruik de bestaande controlerun van deze matchmaking.
    // Alleen wanneer er echt nog geen run bestaat, maken we er één en bouwen we alles.
    let controleRunId = await getLatestControleRunId(matchmakingId);
    let nieuweControleRun = false;
    let contextRows = 0;

    if (!controleRunId) {
      controleRunId = await createControleRun(matchmakingId, userId, role);
      nieuweControleRun = true;
      contextRows = await rebuildCompleteControle(matchmakingId, controleRunId);
    } else {
      contextRows = await rebuildControleForPartij(
        matchmakingId,
        controleRunId,
        partijNr,
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Partij toegevoegd en gecontroleerd.",
      partij_nr: partijNr,
      bout,
      controle_run_id: controleRunId,
      controle_bijgewerkt: true,
      nieuwe_controle_run: nieuweControleRun,
      context_rows: contextRows,
    });
  } catch (err: any) {
    console.error("[control-engine/add-bout] error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Partij toevoegen mislukt.",
        code: err?.code ?? null,
        details: err?.details ?? null,
      },
      { status: Number(err?.status ?? 500) },
    );
  }
}
