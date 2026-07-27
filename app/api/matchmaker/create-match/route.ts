import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildControleBoutContext } from "@/lib/matchmaker/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/control/enrichControleBoutContext";
import { rulesEngine } from "@/lib/rulesEngine";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function n(v: unknown) {
  const x = Number(String(v ?? "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(x) ? x : null;
}

function va(v: unknown) {
  const x = s(v).replace(/[^\d]/g, "");
  return x || null;
}


function maxGewichtData(body: any) {
  const raw = s(
    body?.max_gewicht ??
      body?.maxGewicht ??
      body?.maximum_gewicht ??
      body?.weight_limit,
  );

  const value = n(raw);
  if (value == null) {
    return {
      max_gewicht: null,
      max_gewicht_notatie: null,
      max_gewicht_type: null,
    };
  }

  const explicitNotation = s(
    body?.max_gewicht_notatie ??
      body?.maxGewichtNotatie ??
      body?.weight_limit_notation,
  );
  const explicitType = s(
    body?.max_gewicht_type ??
      body?.maxGewichtType ??
      body?.weight_limit_type,
  ).toLowerCase();

  const isOpenAbove = /\+/.test(raw) || explicitType === "open_above";
  const type =
    explicitType === "exact" ||
    explicitType === "up_to" ||
    explicitType === "open_above"
      ? explicitType
      : isOpenAbove
        ? "open_above"
        : "up_to";

  const notation =
    explicitNotation ||
    (type === "open_above" ? `${value}+` : type === "exact" ? `${value}` : `-${value}`);

  return {
    max_gewicht: value,
    max_gewicht_notatie: notation,
    max_gewicht_type: type,
  };
}

function fullName(row: any) {
  return (
    s(row?.naam) ||
    s(row?.fp_naam) ||
    s(row?.naam_input) ||
    [row?.voornaam, row?.achternaam].map(s).filter(Boolean).join(" ") ||
    null
  );
}

async function getUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) throw new Error("Niet ingelogd.");

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Niet ingelogd.");

  return data.user;
}

async function getFighter(matchmakingId: string, inschrijvingId: any, fighterId: any) {
  let q = supabaseAdmin
    .from("matchmaker_fighter_context")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .limit(1);

  if (inschrijvingId) {
    q = q.eq("inschrijving_id", inschrijvingId);
  } else if (fighterId) {
    q = q.eq("va_nummer", va(fighterId));
  } else {
    return null;
  }

  const { data, error } = await q.maybeSingle();
  if (error) throw error;

  return data;
}

async function createControleRun(matchmakingId: string, userId: string | null) {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("controle_runs")
    .insert({
      matchmaking_id: matchmakingId,
      gestart_door_user_id: userId,
      gestart_door_rol: null,
      status: "running",
      gestart_op: now,
      run_type: "control-engine",
      is_latest: true,
      totaal_aantal: 0,
      verwerkt_aantal: 0,
      progress: 0,
      current_step: "Controle wordt gestart...",
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error("Controlerun aanmaken gaf geen id terug.");

  const { error: latestError } = await supabaseAdmin
    .from("controle_runs")
    .update({ is_latest: false })
    .eq("matchmaking_id", matchmakingId)
    .neq("id", data.id);

  if (latestError) {
    console.warn("Andere controleruns konden niet op is_latest=false worden gezet", latestError);
  }

  return String(data.id);
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

  const runId = s(runRows?.[0]?.id);
  if (runId) return runId;

  // Fallback voor oudere matchmakings waarbij de run niet meer in controle_runs staat,
  // maar er nog wel context van die run aanwezig is.
  const { data: contextRows, error: contextError } = await supabaseAdmin
    .from("controle_bout_context")
    .select("controle_run_id, created_at")
    .eq("matchmaking_id", matchmakingId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (contextError) throw contextError;

  return s(contextRows?.[0]?.controle_run_id) || null;
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
}

async function rebuildControleForPartij(
  matchmakingId: string,
  controleRunId: string,
  partijNr: number,
) {
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

  await rulesEngine({
    controle_run_id: controleRunId,
    matchmaking_id: matchmakingId,
    ctxRows,
    scoped_partij_nr: partijNr,
  });
}

async function nextPartijNr(matchmakingId: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmaking_bouts_raw")
    .select("partij_nr")
    .eq("matchmaking_id", matchmakingId);

  if (error) throw error;

  const nums = (data ?? [])
    .map((r: any) => Number(r.partij_nr))
    .filter((x: number) => Number.isFinite(x));

  return nums.length ? Math.max(...nums) + 1 : 1;
}

function isMissingColumnError(error: any) {
  const msg = String(error?.message || "");
  const code = String(error?.code || "");

  return (
    code === "PGRST204" ||
    code === "42703" ||
    msg.includes("Could not find the") ||
    msg.includes("column") ||
    msg.includes("schema cache")
  );
}

async function safeUpdateAanmeldingenMatched(matchmakingId: string, ids: any[], partijNr: number) {
  const cleanIds = Array.from(new Set(ids.map((id) => s(id)).filter(Boolean)));
  if (!cleanIds.length) return;

  const payloads = [
    { status: "gematcht", updated_at: new Date().toISOString() },
    { status: "gematcht" },
  ];

  for (const payload of payloads) {
    const { error } = await supabaseAdmin
      .from("aanmeldingen")
      .update(payload)
      .eq("matchmaking_id", matchmakingId)
      .in("id", cleanIds);

    if (!error) return;
    if (!isMissingColumnError(error)) throw error;
  }

  console.warn("aanmeldingen gematcht update overgeslagen: status/updated_at kolom niet beschikbaar", {
    matchmakingId,
    ids: cleanIds,
    partijNr,
  });
}

async function markContextMatched(matchmakingId: string, ids: any[], partijNr: number) {
  const cleanIds = Array.from(new Set(ids.map((id) => s(id)).filter(Boolean)));
  if (!cleanIds.length) return;

  const { data: rows, error: readError } = await supabaseAdmin
    .from("matchmaker_fighter_context")
    .select("id, inschrijving_id, extra")
    .eq("matchmaking_id", matchmakingId)
    .in("inschrijving_id", cleanIds);

  if (readError) {
    console.warn("matchmaker_fighter_context lezen voor gematcht markering mislukt", readError);
    return;
  }

  for (const row of rows ?? []) {
    const currentExtra = row?.extra && typeof row.extra === "object" ? row.extra : {};
    const nextExtra = {
      ...currentExtra,
      gematcht: true,
      matchmaker_match: {
        ...(currentExtra as any)?.matchmaker_match,
        gematcht: true,
        partij_nr: partijNr,
      },
    };

    const { error } = await supabaseAdmin
      .from("matchmaker_fighter_context")
      .update({ extra: nextExtra, updated_at: new Date().toISOString() })
      .eq("id", row.id);

    if (error) {
      const fallback = await supabaseAdmin
        .from("matchmaker_fighter_context")
        .update({ extra: nextExtra })
        .eq("id", row.id);

      if (fallback.error) {
        console.warn("matchmaker_fighter_context gematcht markeren mislukt", fallback.error);
      }
    }
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser(req);

    const body = await req.json().catch(() => ({}));

    const matchmakingId = s(body.matchmaking_id);
    const roodInschrijvingId = body.rood_inschrijving_id ?? body.rood_id ?? null;
    const blauwInschrijvingId = body.blauw_inschrijving_id ?? body.blauw_id ?? null;

    const roodFighterId = body.rood_fighter_id ?? body.rood_va ?? null;
    const blauwFighterId = body.blauw_fighter_id ?? body.blauw_va ?? null;

    if (!matchmakingId) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt." },
        { status: 400 },
      );
    }

    if (!roodInschrijvingId && !roodFighterId) {
      return NextResponse.json(
        { error: "Rode vechter ontbreekt." },
        { status: 400 },
      );
    }

    if (!blauwInschrijvingId && !blauwFighterId) {
      return NextResponse.json(
        { error: "Blauwe vechter ontbreekt." },
        { status: 400 },
      );
    }

    const rood = await getFighter(matchmakingId, roodInschrijvingId, roodFighterId);
    const blauw = await getFighter(matchmakingId, blauwInschrijvingId, blauwFighterId);

    if (!rood || !blauw) {
      return NextResponse.json(
        { error: "Rode of blauwe vechter niet gevonden in matchmaker_fighter_context." },
        { status: 404 },
      );
    }

    const partijNr = await nextPartijNr(matchmakingId);
    const maxGewicht = maxGewichtData(body);

    const insertRow = {
      matchmaking_id: matchmakingId,
      partij_nr: partijNr,

      discipline: s(rood.discipline || blauw.discipline) || null,
      klasse: s(rood.klasse || blauw.klasse) || null,
      geslacht: s(rood.geslacht || blauw.geslacht) || null,

      max_gewicht: maxGewicht.max_gewicht,
      max_gewicht_notatie: maxGewicht.max_gewicht_notatie,
      max_gewicht_type: maxGewicht.max_gewicht_type,

      rood_naam: fullName(rood),
      rood_gym: s(rood.sportschool || rood.gym_input || rood.fp_gym) || null,
      rood_gewicht: n(rood.gewicht),
      va_rood: va(rood.va_nummer),

      blauw_naam: fullName(blauw),
      blauw_gym: s(blauw.sportschool || blauw.gym_input || blauw.fp_gym) || null,
      blauw_gewicht: n(blauw.gewicht),
      va_blauw: va(blauw.va_nummer),

      is_toernooi: false,
      raw_json: {
        source: "matchmaker_match_nieuw",
        rood_inschrijving_id: rood.inschrijving_id ?? null,
        blauw_inschrijving_id: blauw.inschrijving_id ?? null,
        max_gewicht: maxGewicht.max_gewicht,
        max_gewicht_notatie: maxGewicht.max_gewicht_notatie,
        max_gewicht_type: maxGewicht.max_gewicht_type,
      },
    };

    const { data, error } = await supabaseAdmin
      .from("matchmaking_bouts_raw")
      .insert(insertRow)
      .select("*")
      .single();

    if (error) throw error;

    const matchedIds = [rood.inschrijving_id, blauw.inschrijving_id].filter(Boolean);
    await safeUpdateAanmeldingenMatched(matchmakingId, matchedIds, partijNr);
    await markContextMatched(matchmakingId, matchedIds, partijNr);

    let controleRunId = await getLatestControleRunId(matchmakingId);
    let nieuweControleRun = false;

    if (!controleRunId) {
      controleRunId = await createControleRun(matchmakingId, user.id ?? null);
      nieuweControleRun = true;
      await rebuildCompleteControle(matchmakingId, controleRunId);
    } else {
      await rebuildControleForPartij(matchmakingId, controleRunId, partijNr);
    }

    return NextResponse.json({
      ok: true,
      partij_nr: partijNr,
      bout: data,
      controle_run_id: controleRunId,
      controle_bijgewerkt: true,
      nieuwe_controle_run: nieuweControleRun,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "Match opslaan mislukt.",
        code: e?.code ?? null,
        details: e?.details ?? null,
      },
      { status: 500 },
    );
  }
}