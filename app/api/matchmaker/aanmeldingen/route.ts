import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    if (Object.prototype.hasOwnProperty.call(existing, column)) {
      patch[column] = emptyToNull(value);
    }
  }

  setIfColumnExists("naam", body.naam);
  setIfColumnExists("sportschool", body.sportschool ?? body.gym);
  setIfColumnExists("gym", body.gym ?? body.sportschool);
  setIfColumnExists("va_nummer", body.va_nummer);
  setIfColumnExists("gewicht", body.gewicht);
  setIfColumnExists("discipline", body.discipline);
  setIfColumnExists("klasse", body.klasse);
  setIfColumnExists("geslacht", body.geslacht);

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

    return NextResponse.json({
      ok: true,
      aanmelding: data,
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

    return NextResponse.json({
      ok: true,
      message: "Aanmelding verwijderd.",
    });
  } catch (e: any) {
    console.error("[DELETE /api/matchmaker/aanmeldingen]", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Verwijderen mislukt." },
      { status: 400 }
    );
  }
}