import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processMatchmakingFighters } from "@/lib/matchmaker/processMatchmakingFighters";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const TABLE = "aanmeldingen";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function emptyToNull(v: unknown) {
  const x = s(v);
  return x ? x : null;
}

async function requireUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) throw new Error("Niet ingelogd.");

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    throw new Error(error?.message || "Niet ingelogd.");
  }

  return data.user;
}

async function assertAccess(userId: string, matchmakingId: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmakings")
    .select("id, matchmaker_id, uploaded_by, huidige_eigenaar_user_id")
    .eq("id", matchmakingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Matchmaking niet gevonden.");

  const allowed =
    data.matchmaker_id === userId ||
    data.uploaded_by === userId ||
    data.huidige_eigenaar_user_id === userId;

  if (!allowed) throw new Error("Geen toegang tot deze matchmaking.");
}


function buildPatch(existing: Record<string, any>, body: Record<string, any>) {
  const patch: Record<string, any> = {};
  function setIfColumnExists(column: string, value: unknown) {
    if (value === undefined) return;
    if (Object.prototype.hasOwnProperty.call(existing, column)) {
      patch[column] = emptyToNull(value);
    }
  }

  // De opgave in aanmeldingen is de waarheid van de trainer/matchmaker en mag
  // volledig worden gecorrigeerd. De centrale FightPassport-vechter blijft
  // ongewijzigd; na opslaan wordt de matchmaking-context opnieuw opgebouwd.
  setIfColumnExists("sportschool", body.sportschool ?? body.gym);
  setIfColumnExists("gym", body.gym ?? body.sportschool);
  setIfColumnExists("gewicht", body.gewicht);
  setIfColumnExists("gewicht_kg", body.gewicht ?? body.gewicht_kg);
  setIfColumnExists("discipline", body.discipline ?? body.sport);
  setIfColumnExists("sport", body.sport ?? body.discipline);
  setIfColumnExists("klasse", body.klasse ?? body.klasse_mm);
  setIfColumnExists("klasse_mm", body.klasse_mm ?? body.klasse);
  setIfColumnExists("geslacht", body.geslacht ?? body.gender);
  setIfColumnExists("gender", body.gender ?? body.geslacht);
  setIfColumnExists("naam", body.naam ?? body.fighter_naam);
  setIfColumnExists("fighter_naam", body.fighter_naam ?? body.naam);
  setIfColumnExists("email", body.email);
  setIfColumnExists("telefoon", body.telefoon ?? body.phone);
  setIfColumnExists("phone", body.phone ?? body.telefoon);

  // VA kan bij een gewone correctie ook worden aangepast. Bij de slimme
  // databasekoppeling gelden extra controles voor een nog lege VA-koppeling.
  // Uitzondering: een geüploade aanmelding zonder VA mag via de expliciete
  // slimme databasekoppeling één VA-nummer krijgen. Daarna haalt
  // processMatchmakingFighters de overige vechtergegevens uit de database.
  const hydrateFromDatabase = body.hydrate_from_fighter_database === true;
  const currentVa = s(
    existing.va_nummer ?? existing.va ?? existing.fightpaspoort_nummer
  );
  const requestedVa = s(body.va_nummer ?? body.va ?? body.fightpaspoort_nummer);

  if (!hydrateFromDatabase && body.va_nummer !== undefined) {
    if (requestedVa && !/^\d+$/.test(requestedVa)) {
      throw new Error("Het VA-nummer mag alleen uit cijfers bestaan.");
    }
    setIfColumnExists("va_nummer", requestedVa);
    setIfColumnExists("va", requestedVa);
    setIfColumnExists("fightpaspoort_nummer", requestedVa);
  }

  if (hydrateFromDatabase) {
    if (currentVa) {
      throw new Error(
        `Deze aanmelding is al gekoppeld aan VA ${currentVa}. Gebruik de naam/VA-controle om een bestaande koppeling te corrigeren.`
      );
    }
    if (!requestedVa) {
      throw new Error("Kies eerst een vechter met een geldig VA-nummer.");
    }
    if (!/^\d+$/.test(requestedVa)) {
      throw new Error("Het VA-nummer mag alleen uit cijfers bestaan.");
    }

    setIfColumnExists("va_nummer", requestedVa);
    setIfColumnExists("va", requestedVa);
    setIfColumnExists("fightpaspoort_nummer", requestedVa);
  }

  if (Object.prototype.hasOwnProperty.call(existing, "updated_at")) {
    patch.updated_at = new Date().toISOString();
  }

  return patch;
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();

    const matchmakingId = s(body.matchmaking_id);
    const aanmeldingId = s(body.aanmelding_id || body.fighter_id || body.id);

    if (!matchmakingId) throw new Error("matchmaking_id ontbreekt.");
    if (!aanmeldingId) throw new Error("aanmelding_id ontbreekt.");

    await assertAccess(user.id, matchmakingId);

    const { data: existing, error: readError } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq("id", aanmeldingId)
      .maybeSingle();

    if (readError) throw new Error(`Lezen mislukt: ${readError.message}`);
    if (!existing) throw new Error(`Aanmelding niet gevonden met id ${aanmeldingId}.`);

    const patch = buildPatch(existing, body);
    const oldSchoolName = s(existing.sportschool ?? existing.gym);
    const newSchoolName = s(body.sportschool ?? body.gym);
    const schoolChanged = Boolean(newSchoolName && newSchoolName !== oldSchoolName);

    if (!Object.keys(patch).length) {
      throw new Error("Geen geldige kolommen gevonden om op te slaan.");
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(patch)
      .eq("matchmaking_id", matchmakingId)
      .eq("id", aanmeldingId)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Opslaan mislukt: ${error.code || ""} ${error.message}`);
    }

    if (schoolChanged) {
      const { error: changeError } = await supabaseAdmin
        .from("matchmaker_fighter_school_changes")
        .insert({
          matchmaking_id: matchmakingId,
          aanmelding_id: aanmeldingId,
          fighter_id: null,
          va_nummer: s(data?.va_nummer ?? existing.va_nummer),
          old_sportschool_name: oldSchoolName || null,
          new_sportschool_name: newSchoolName,
          changed_by_user_id: user.id,
          changed_by_email: user.email ?? null,
          source: "registration_edit",
          status: "open",
        });

      if (changeError) {
        const restorePatch: Record<string, any> = {};
        if (Object.prototype.hasOwnProperty.call(existing, "sportschool")) {
          restorePatch.sportschool = existing.sportschool ?? null;
        }
        if (Object.prototype.hasOwnProperty.call(existing, "gym")) {
          restorePatch.gym = existing.gym ?? null;
        }
        await supabaseAdmin
          .from(TABLE)
          .update(restorePatch)
          .eq("matchmaking_id", matchmakingId)
          .eq("id", aanmeldingId);
        throw new Error(`Sportschoolwijziging registreren mislukt: ${changeError.message}`);
      }
    }

    const processing = await processMatchmakingFighters({
      supabase: supabaseAdmin,
      matchmakingId,
      aanmeldingId,
    });

    const { data: refreshedAanmelding, error: refreshError } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq("id", aanmeldingId)
      .maybeSingle();

    if (refreshError) {
      throw new Error(`Bijgewerkte aanmelding laden mislukt: ${refreshError.message}`);
    }

    return NextResponse.json({
      ok: true,
      aanmelding: refreshedAanmelding ?? data,
      fighter_processing: {
        processed: processing.processed,
        controle_run_id: processing.controleRunId,
        rule_hits: processing.hits.length,
      },
    });
  } catch (e: any) {
    console.error("[PATCH /api/matchmaker/aanmeldingen]", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Opslaan mislukt." },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    const url = new URL(req.url);

    const matchmakingId = s(url.searchParams.get("matchmaking_id"));
    const aanmeldingId = s(
      url.searchParams.get("aanmelding_id") ||
      url.searchParams.get("fighter_id") ||
      url.searchParams.get("id")
    );

    if (!matchmakingId) throw new Error("matchmaking_id ontbreekt.");
    if (!aanmeldingId) throw new Error("aanmelding_id ontbreekt.");

    await assertAccess(user.id, matchmakingId);

    const { error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("matchmaking_id", matchmakingId)
      .eq("id", aanmeldingId);

    if (error) throw new Error(`Verwijderen mislukt: ${error.message}`);

    const processing = await processMatchmakingFighters({
      supabase: supabaseAdmin,
      matchmakingId,
    });

    return NextResponse.json({
      ok: true,
      message: "Aanmelding verwijderd.",
      fighter_processing: { processed: processing.processed },
    });
  } catch (e: any) {
    console.error("[DELETE /api/matchmaker/aanmeldingen]", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Verwijderen mislukt." },
      { status: 400 }
    );
  }
}