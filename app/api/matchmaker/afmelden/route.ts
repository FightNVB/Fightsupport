import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";
import { secureError } from "@/lib/api/secureRoute";

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
  const n = Number(String(v).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function isUuid(v: unknown) {
  const x = s(v);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
}

function fullInputName(ctx?: AnyRow | null, aanmelding?: AnyRow | null) {
  const voornaam = asString(aanmelding?.voornaam) || asString(ctx?.voornaam);
  const achternaam = asString(aanmelding?.achternaam) || asString(ctx?.achternaam);
  const combined = [voornaam, achternaam].map(s).filter(Boolean).join(" ").trim();

  // Volledige invoernaam is leidend. Oude records kunnen naam/naam_input alleen als voornaam hebben.
  return (
    combined ||
    asString(ctx?.naam_input) ||
    asString(aanmelding?.naam_input) ||
    asString(aanmelding?.naam) ||
    null
  );
}

function fullName(ctx?: AnyRow | null, aanmelding?: AnyRow | null) {
  return (
    fullInputName(ctx, aanmelding) ||
    asString(ctx?.fp_naam) ||
    asString(aanmelding?.fp_naam) ||
    null
  );
}

function mergeRaw(raw: unknown, patch: AnyRow) {
  const base = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as AnyRow : {};
  return { ...base, ...patch };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const matchmakingId = asString(body.matchmaking_id ?? body.matchmakingId);
    const fighterContextId = asNumber(body.fighter_context_id ?? body.fighterContextId);
    const inschrijvingIdFromBody = asNumber(body.inschrijving_id ?? body.inschrijvingId);
    const reden = asString(body.reden ?? body.reason);
    const opmerking = asString(body.opmerking);

    if (!matchmakingId || !isUuid(matchmakingId)) {
      return bad("Geldige matchmaking_id ontbreekt");
    }

    if (fighterContextId == null && inschrijvingIdFromBody == null) {
      return bad("inschrijving_id of fighter_context_id ontbreekt");
    }

    const auth = await requireUserWithRole(req, ["matchmaker", "admin", "superadmin"]);
    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId: auth.userId, role: auth.role });

    let ctxRow: AnyRow | null = null;

    if (fighterContextId != null) {
      const { data, error } = await supabase
        .from("matchmaker_fighter_context")
        .select("*")
        .eq("id", fighterContextId)
        .eq("matchmaking_id", matchmakingId)
        .maybeSingle();

      if (error) return bad("Fighter context laden mislukt", 500, error.message);
      ctxRow = data;
    }

    if (!ctxRow && inschrijvingIdFromBody != null) {
      const { data, error } = await supabase
        .from("matchmaker_fighter_context")
        .select("*")
        .eq("inschrijving_id", inschrijvingIdFromBody)
        .eq("matchmaking_id", matchmakingId)
        .maybeSingle();

      if (error) return bad("Fighter context laden mislukt", 500, error.message);
      ctxRow = data;
    }

    const inschrijvingId =
      inschrijvingIdFromBody ?? asNumber(ctxRow?.inschrijving_id);

    if (inschrijvingId == null) {
      return bad("Geen inschrijving_id gevonden");
    }

    const { data: aanmelding, error: aanmeldingError } = await supabase
      .from("aanmeldingen")
      .select("*")
      .eq("id", inschrijvingId)
      .eq("matchmaking_id", matchmakingId)
      .maybeSingle();

    if (aanmeldingError) return bad("Aanmelding laden mislukt", 500, aanmeldingError.message);
    if (!aanmelding) return bad("Aanmelding niet gevonden", 404);

    const { data: mmRow } = await supabase
      .from("matchmakings")
      .select("*")
      .eq("id", matchmakingId)
      .maybeSingle();

    const eventId =
      asString(aanmelding.event_id) ||
      asString(mmRow?.event_id) ||
      null;

    let eventRow: AnyRow | null = null;

    if (eventId) {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

      eventRow = data;
    }

    const eventNaam =
      asString(eventRow?.naam) ||
      asString(eventRow?.event_naam) ||
      asString(mmRow?.naam) ||
      asString(aanmelding.raw?.event_naam);

    const eventDatum =
      asString(eventRow?.datum) ||
      asString(eventRow?.event_datum) ||
      asString(mmRow?.event_datum) ||
      asString(mmRow?.datum) ||
      asString(aanmelding.raw?.event_datum);

    const afgemeldAt = new Date().toISOString();
    const naamInput = fullInputName(ctxRow, aanmelding);
    const naam = naamInput || fullName(ctxRow, aanmelding) || `Inschrijving ${inschrijvingId}`;

    const oudeOpmerking = asString(aanmelding.opmerkingen);
    const nieuweOpmerking = [oudeOpmerking, reden ? `Afmelding: ${reden}` : null]
      .filter(Boolean)
      .join("\n");

    const raw = mergeRaw(aanmelding.raw, {
      afmelding: {
        status: "open",
        reden,
        opmerking,
        afgemeld_at: afgemeldAt,
        fighter_context_id: fighterContextId ?? ctxRow?.id ?? null,
        inschrijving_id: inschrijvingId,
        naam,
        event_naam: eventNaam,
        event_datum: eventDatum,
      },
    });

    const afmeldingInsert = {
      status: "open",
      matchmaking_id: matchmakingId,
      event_id: eventId,
      inschrijving_id: inschrijvingId,
      fighter_context_id: fighterContextId ?? ctxRow?.id ?? null,

      matchmaker_user_id: aanmelding.uploaded_by ?? null,

      event_naam: eventNaam,
      event_datum: eventDatum,

      naam,
      naam_input: naamInput,
      fp_naam: asString(ctxRow?.fp_naam) || asString(aanmelding.fp_naam),
      voornaam: asString(aanmelding.voornaam),
      achternaam: asString(aanmelding.achternaam),

      sportschool:
        asString(ctxRow?.gym_input) ||
        asString(ctxRow?.fp_gym) ||
        asString(aanmelding.gym),

      va_nummer:
        asString(ctxRow?.va_nummer) ||
        asString(aanmelding.va_nummer),

      discipline: asString(ctxRow?.discipline) || asString(aanmelding.discipline),
      klasse: asString(ctxRow?.klasse) || asString(aanmelding.klasse),
      geslacht: asString(ctxRow?.geslacht) || asString(aanmelding.geslacht),
      gewicht: asNumber(ctxRow?.gewicht ?? aanmelding.gewicht),
      geboortedatum:
        asString(ctxRow?.geboortedatum_input) ||
        asString(ctxRow?.fp_geboortedatum) ||
        asString(aanmelding.geboortedatum),

      reden,
      opmerking,
      afgemeld_at: afgemeldAt,
      raw: {
        aanmelding,
        fighter_context: ctxRow,
        matchmaking: mmRow,
        event: eventRow,
      },
    };

    const { data: afmelding, error: insertError } = await supabase
      .from("afmeldingen")
      .insert(afmeldingInsert)
      .select("*")
      .single();

    if (insertError) {
      return bad("Afmelding opslaan in afmeldingen mislukt", 500, insertError.message);
    }

    const { error: updateError } = await supabase
      .from("aanmeldingen")
      .update({
        status: "afgemeld",
        opmerkingen: nieuweOpmerking || null,
        raw,
        updated_at: afgemeldAt,
      })
      .eq("id", inschrijvingId)
      .eq("matchmaking_id", matchmakingId);

    if (updateError) {
      return bad("Aanmelding op afgemeld zetten mislukt", 500, updateError.message);
    }

    return NextResponse.json({
      ok: true,
      afmelding,
      status: "afgemeld",
    });
  } catch (e: any) {
    return secureError(e, "Afmelding kon niet worden verwerkt.");
  }
}
