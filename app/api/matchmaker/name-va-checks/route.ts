import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processMatchmakingFighters } from "@/lib/matchmaker/processMatchmakingFighters";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function s(value: unknown) {
  return String(value ?? "").trim();
}

function onlyDigits(value: unknown) {
  return s(value).replace(/\D+/g, "").replace(/^0+/, "");
}

async function requireUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) throw new Error("Niet ingelogd.");

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error(error?.message || "Niet ingelogd.");
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

  if (
    data.matchmaker_id !== userId &&
    data.uploaded_by !== userId &&
    data.huidige_eigenaar_user_id !== userId
  ) {
    throw new Error("Geen toegang tot deze matchmaking.");
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const url = new URL(req.url);
    const matchmakingId = s(url.searchParams.get("matchmaking_id"));
    if (!matchmakingId) throw new Error("matchmaking_id ontbreekt.");

    await assertAccess(user.id, matchmakingId);

    const { data, error } = await supabaseAdmin
      .from("matchmaker_name_va_checks")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, checks: data ?? [] });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Naam/VA-controles laden mislukt." },
      { status: 400 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const matchmakingId = s(body.matchmaking_id);
    const checkId = s(body.check_id);
    const action = s(body.action);

    if (!matchmakingId) throw new Error("matchmaking_id ontbreekt.");
    if (!checkId) throw new Error("check_id ontbreekt.");
    if (!action) throw new Error("action ontbreekt.");

    await assertAccess(user.id, matchmakingId);

    const { data: check, error: checkError } = await supabaseAdmin
      .from("matchmaker_name_va_checks")
      .select("*")
      .eq("id", checkId)
      .eq("matchmaking_id", matchmakingId)
      .maybeSingle();

    if (checkError) throw new Error(checkError.message);
    if (!check) throw new Error("Naam/VA-controle niet gevonden.");
    if (check.status !== "open") throw new Error("Deze controle is al afgehandeld.");

    const now = new Date().toISOString();

    if (action === "approve_name") {
      const { error } = await supabaseAdmin
        .from("matchmaker_name_va_checks")
        .update({
          status: "resolved",
          resolution: "upload_name_approved",
          resolved_va_nummer: check.va_nummer_upload,
          resolved_by_user_id: user.id,
          resolved_by_email: user.email ?? null,
          resolved_at: now,
          updated_at: now,
        })
        .eq("id", checkId);

      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, resolution: "upload_name_approved" });
    }

    if (action === "correct_va") {
      const vaNummer = onlyDigits(body.va_nummer);
      if (!vaNummer) throw new Error("Vul een geldig VA-nummer in.");

      const { data: fighter, error: fighterError } = await supabaseAdmin
        .from("fightpassport_fighters")
        .select("*")
        .eq("va_nummer", vaNummer)
        .maybeSingle();

      if (fighterError) throw new Error(fighterError.message);
      if (!fighter) throw new Error(`Geen vechter gevonden met VA ${vaNummer}.`);

      const fighterClass = fighter.berekende_klasse || fighter.nulmeting_klasse || null;
      const patch: Record<string, any> = {
        va_nummer: vaNummer,
        geboortedatum: fighter.geboortedatum ?? null,
        geslacht: fighter.geslacht ?? null,
        klasse: fighterClass,
        email: fighter.email ?? null,
        licentie_actief: fighter.licentie_actief ?? null,
        fit_to_fight: fighter.fit_to_fight ?? null,
        heeft_startverbod: fighter.heeft_startverbod ?? null,
        totaal_partijen: fighter.totaal_wedstrijden ?? null,
        updated_at: now,
      };

      const { error: registrationError } = await supabaseAdmin
        .from("aanmeldingen")
        .update(patch)
        .eq("id", check.aanmelding_id)
        .eq("matchmaking_id", matchmakingId);

      if (registrationError) throw new Error(registrationError.message);

      const { error: resolveError } = await supabaseAdmin
        .from("matchmaker_name_va_checks")
        .update({
          status: "resolved",
          resolution: "va_corrected",
          resolved_va_nummer: vaNummer,
          va_nummer_fightpassport: vaNummer,
          naam_fightpassport: fighter.naam ?? null,
          resolved_by_user_id: user.id,
          resolved_by_email: user.email ?? null,
          resolved_at: now,
          updated_at: now,
        })
        .eq("id", checkId);

      if (resolveError) throw new Error(resolveError.message);

      const processing = await processMatchmakingFighters({
        supabase: supabaseAdmin,
        matchmakingId,
      });

      return NextResponse.json({
        ok: true,
        resolution: "va_corrected",
        fighter,
        fighter_processing: { processed: processing.processed },
      });
    }

    throw new Error(`Onbekende actie: ${action}`);
  } catch (error: any) {
    console.error("[PATCH /api/matchmaker/name-va-checks]", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Naam/VA-controle opslaan mislukt." },
      { status: 400 },
    );
  }
}
