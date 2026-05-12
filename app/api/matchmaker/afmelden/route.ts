import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type AnyRow = Record<string, any>;

function bad(msg: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: msg, extra }, { status });
}

function s(v: unknown) {
  return String(v ?? "").trim();
}

function asString(v: unknown) {
  const x = s(v);
  return x || null;
}

function asNumber(v: unknown) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function isUuid(v: unknown) {
  const x = s(v);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
}

function isMissingColumnError(error: any) {
  const msg = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "");
  return code === "42703" || code === "PGRST204" || msg.includes("could not find") || msg.includes("does not exist");
}

function fullName(row: AnyRow | null | undefined) {
  return (
    asString(row?.naam) ||
    asString(row?.fp_naam) ||
    asString(row?.naam_input) ||
    [row?.voornaam, row?.achternaam].map(s).filter(Boolean).join(" ") ||
    null
  );
}

function mergeRaw(raw: unknown, patch: AnyRow) {
  const base = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as AnyRow) : {};
  return { ...base, ...patch };
}

async function loadMatchmaking(matchmakingId: string) {
  const { data, error } = await supabase
    .from("matchmakings")
    .select("id, naam, datum, event_datum")
    .eq("id", matchmakingId)
    .maybeSingle();

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("matchmakings")
      .select("id, naam")
      .eq("id", matchmakingId)
      .maybeSingle();
    return fallback;
  }

  return { data, error };
}

async function loadContextById(matchmakingId: string, fighterContextId: number) {
  const { data, error } = await supabase
    .from("matchmaker_fighter_context")
    .select(
      "id, inschrijving_id, matchmaking_id, naam_input, fp_naam, va_nummer, voornaam, achternaam",
    )
    .eq("id", fighterContextId)
    .eq("matchmaking_id", matchmakingId)
    .maybeSingle();

  return { data, error };
}

async function loadContextByInschrijving(matchmakingId: string, inschrijvingId: number) {
  const { data, error } = await supabase
    .from("matchmaker_fighter_context")
    .select(
      "id, inschrijving_id, matchmaking_id, naam_input, fp_naam, va_nummer, voornaam, achternaam",
    )
    .eq("inschrijving_id", inschrijvingId)
    .eq("matchmaking_id", matchmakingId)
    .maybeSingle();

  return { data, error };
}

async function loadAanmelding(matchmakingId: string, inschrijvingId: number) {
  const { data, error } = await supabase
    .from("aanmeldingen")
    .select(
      "id, matchmaking_id, status, opmerkingen, raw, naam, voornaam, achternaam, va_nummer, gym, geboortedatum, gewicht, discipline, klasse, geslacht, upload_batch_id, raw_filename",
    )
    .eq("id", inschrijvingId)
    .eq("matchmaking_id", matchmakingId)
    .maybeSingle();

  if (error && isMissingColumnError(error)) {
    return supabase
      .from("aanmeldingen")
      .select("id, matchmaking_id, status, opmerkingen, raw, naam, voornaam, achternaam, va_nummer")
      .eq("id", inschrijvingId)
      .eq("matchmaking_id", matchmakingId)
      .maybeSingle();
  }

  return { data, error };
}

async function updateAanmeldingStatus(matchmakingId: string, inschrijvingId: number, patch: AnyRow) {
  const { error } = await supabase
    .from("aanmeldingen")
    .update(patch)
    .eq("id", inschrijvingId)
    .eq("matchmaking_id", matchmakingId);

  if (!error) return { error: null };

  if (!isMissingColumnError(error)) return { error };

  const minimalPatch: AnyRow = {
    status: "afgemeld",
    opmerkingen: patch.opmerkingen,
    raw: patch.raw,
  };

  return supabase
    .from("aanmeldingen")
    .update(minimalPatch)
    .eq("id", inschrijvingId)
    .eq("matchmaking_id", matchmakingId);
}

async function deleteLinkedBouts(matchmakingId: string, inschrijvingId: number | null, fighterContextId: number | null) {
  const orParts: string[] = [];

  if (inschrijvingId != null) {
    orParts.push(`rood_inschrijving_id.eq.${inschrijvingId}`);
    orParts.push(`blauw_inschrijving_id.eq.${inschrijvingId}`);
  }

  if (fighterContextId != null) {
    orParts.push(`rood_fighter_context_id.eq.${fighterContextId}`);
    orParts.push(`blauw_fighter_context_id.eq.${fighterContextId}`);
  }

  if (!orParts.length) return { error: null };

  const { error } = await supabase
    .from("matchmaking_bouts_raw")
    .delete()
    .eq("matchmaking_id", matchmakingId)
    .or(orParts.join(","));

  return { error };
}

async function deleteContext(matchmakingId: string, fighterContextId: number | null) {
  if (fighterContextId == null) return { error: null };

  const { error } = await supabase
    .from("matchmaker_fighter_context")
    .delete()
    .eq("id", fighterContextId)
    .eq("matchmaking_id", matchmakingId);

  return { error };
}

async function deleteResultaten(matchmakingId: string, inschrijvingId: number | null, fighterContextId: number | null) {
  const attempts: Array<PromiseLike<{ error: any }>> = [];

  if (inschrijvingId != null) {
    attempts.push(
      supabase
        .from("matchmaker_fighter_resultaten")
        .delete()
        .eq("matchmaking_id", matchmakingId)
        .eq("inschrijving_id", inschrijvingId),
    );
  }

  if (fighterContextId != null) {
    attempts.push(
      supabase
        .from("matchmaker_fighter_resultaten")
        .delete()
        .eq("matchmaking_id", matchmakingId)
        .eq("fighter_context_id", fighterContextId),
    );
  }

  for (const attempt of attempts) {
    const { error } = await attempt;
    if (error && !isMissingColumnError(error)) return { error };
  }

  return { error: null };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const matchmakingId = asString(body.matchmaking_id ?? body.matchmakingId);
    const fighterContextId = asNumber(body.fighter_context_id ?? body.fighterContextId);
    const inschrijvingIdFromBody = asNumber(body.inschrijving_id ?? body.inschrijvingId);
    const reden = asString(body.reden ?? body.reason ?? body.opmerking) ?? "";

    // Oude front-end kan fighter_id meesturen. VA nummers zijn géén UUID en worden hier bewust niet gebruikt.
    const legacyFighterId = isUuid(body.fighter_id) ? s(body.fighter_id) : null;

    if (!matchmakingId || !isUuid(matchmakingId)) {
      return bad("Geldige matchmaking_id ontbreekt");
    }

    if (fighterContextId == null && inschrijvingIdFromBody == null && !legacyFighterId) {
      return bad("inschrijving_id of fighter_context_id ontbreekt");
    }

    const { data: mmRow, error: mmError } = await loadMatchmaking(matchmakingId);
    if (mmError) return bad("Matchmaking laden mislukt", 500, mmError.message);

    const eventDateValue = asString(mmRow?.event_datum) || asString(mmRow?.datum);
    const eventDate = eventDateValue ? new Date(eventDateValue) : null;

    let within14Days = false;
    if (eventDate && !Number.isNaN(eventDate.getTime())) {
      const diff = eventDate.getTime() - Date.now();
      within14Days = diff >= 0 && diff <= 14 * 24 * 60 * 60 * 1000;
    }

    if (within14Days && !reden) {
      return bad("Reden verplicht binnen 14 dagen voor event");
    }

    let ctxRow: AnyRow | null = null;

    if (fighterContextId != null) {
      const { data, error } = await loadContextById(matchmakingId, fighterContextId);
      if (error) return bad("Fighter context laden mislukt", 500, error.message);
      ctxRow = data ?? null;
    }

    if (!ctxRow && inschrijvingIdFromBody != null) {
      const { data, error } = await loadContextByInschrijving(matchmakingId, inschrijvingIdFromBody);
      if (error) return bad("Fighter context laden mislukt", 500, error.message);
      ctxRow = data ?? null;
    }

    const resolvedInschrijvingId =
      inschrijvingIdFromBody ?? asNumber(ctxRow?.inschrijving_id) ?? null;

    const resolvedFighterContextId = fighterContextId ?? asNumber(ctxRow?.id) ?? null;

    if (resolvedInschrijvingId == null) {
      return bad(
        "Geen inschrijving_id gevonden. Afmelden hoort op aanmeldingen.status te gebeuren, niet op fighter_id.",
      );
    }

    const { data: aanmelding, error: aanmeldingError } = await loadAanmelding(
      matchmakingId,
      resolvedInschrijvingId,
    );

    if (aanmeldingError) {
      return bad("Aanmelding laden mislukt", 500, aanmeldingError.message);
    }

    if (!aanmelding) {
      return bad("Aanmelding niet gevonden", 404);
    }

    const afgemeldAt = new Date().toISOString();
    const fighterNaam = fullName(ctxRow) || fullName(aanmelding) || `Inschrijving ${resolvedInschrijvingId}`;
    const oudeOpmerking = asString(aanmelding.opmerkingen);
    const nieuweOpmerking = reden
      ? [oudeOpmerking, `Afmelding: ${reden}`].filter(Boolean).join("\n")
      : oudeOpmerking;

    const raw = mergeRaw(aanmelding.raw, {
      afmelding: {
        reden: reden || null,
        afgemeld_at: afgemeldAt,
        within_14_days: within14Days,
        fighter_context_id: resolvedFighterContextId,
        fighter_naam: fighterNaam,
        event_naam: mmRow?.naam ?? null,
        event_datum: eventDateValue ?? null,
      },
      afmelding_reden: reden || null,
      afgemeld_at: afgemeldAt,
    });

    const updatePatch: AnyRow = {
      status: "afgemeld",
      opmerkingen: nieuweOpmerking,
      raw,
      updated_at: afgemeldAt,
    };

    const { error: updateError } = await updateAanmeldingStatus(
      matchmakingId,
      resolvedInschrijvingId,
      updatePatch,
    );

    if (updateError) {
      return bad("Aanmelding op afgemeld zetten mislukt", 500, updateError.message);
    }

    const { error: boutError } = await deleteLinkedBouts(
      matchmakingId,
      resolvedInschrijvingId,
      resolvedFighterContextId,
    );

    if (boutError && !isMissingColumnError(boutError)) {
      return bad("Gekoppelde partij verwijderen mislukt", 500, boutError.message);
    }

    const { error: resultatenError } = await deleteResultaten(
      matchmakingId,
      resolvedInschrijvingId,
      resolvedFighterContextId,
    );

    if (resultatenError) {
      return bad("Regelresultaten opschonen mislukt", 500, resultatenError.message);
    }

    const { error: ctxDeleteError } = await deleteContext(matchmakingId, resolvedFighterContextId);

    if (ctxDeleteError && !isMissingColumnError(ctxDeleteError)) {
      return bad("Fighter context opschonen mislukt", 500, ctxDeleteError.message);
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      inschrijving_id: resolvedInschrijvingId,
      fighter_context_id: resolvedFighterContextId,
      status: "afgemeld",
      reden: reden || null,
      within_14_days: within14Days,
    });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}
