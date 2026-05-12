import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function isMissingTableOrColumn(error: any): boolean {
  const msg = String(error?.message ?? error ?? "").toLowerCase();
  const code = String(error?.code ?? "").toLowerCase();

  return (
    code === "pgrst204" ||
    code === "pgrst205" ||
    code === "42p01" ||
    code === "42703" ||
    msg.includes("could not find the table") ||
    msg.includes("could not find the") ||
    msg.includes("schema cache") ||
    msg.includes("relation") ||
    msg.includes("column")
  );
}

async function getUser(req: Request) {
  const auth =
    req.headers.get("authorization") ||
    req.headers.get("Authorization") ||
    "";

  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) throw new Error("Niet ingelogd.");

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    throw new Error(error?.message || "Niet ingelogd.");
  }

  return data.user;
}

async function getUserProfile(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("id, role, rol, type, bondteam")
    .eq("id", userId)
    .maybeSingle();

  return data as any | null;
}

async function assertCanDelete(matchmakingId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmakings")
    .select(
      "id, matchmaker_id, maker_user_id, uploaded_by, huidige_eigenaar_type, huidige_eigenaar_user_id, stadium, status",
    )
    .eq("id", matchmakingId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Matchmaking niet gevonden.");

  const profile = await getUserProfile(userId);
  const role = s(profile?.role || profile?.rol || profile?.type).toLowerCase();

  const isAdmin =
    role.includes("superadmin") ||
    role === "admin" ||
    role.includes("admin");

  if (isAdmin) return data;

  const stage = s((data as any).stadium) || s((data as any).status);

  const editableStages = new Set([
    "",
    "nieuw",
    "bouwen_matchmaking",
    "concept_matchmaking",
    "bij_matchmaker_in_bewerking",
    "retour_naar_matchmaker",
  ]);

  const ownerIds = [
    (data as any).matchmaker_id,
    (data as any).maker_user_id,
    (data as any).uploaded_by,
    (data as any).huidige_eigenaar_user_id,
  ]
    .map(s)
    .filter(Boolean);

  const isOwner = ownerIds.includes(userId);

  if (!isOwner || !editableStages.has(stage)) {
    throw new Error(
      "Deze matchmaking mag door de matchmaker niet verwijderd worden in deze fase.",
    );
  }

  return data;
}

async function deleteBy(table: string, column: string, value: string) {
  if (!value) return { ok: true, skipped: true };

  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq(column, value);

  if (!error) return { ok: true, skipped: false };

  if (isMissingTableOrColumn(error)) {
    console.warn(
      `[delete-matchmaking] ${table}.${column} overgeslagen:`,
      error.message,
    );

    return {
      ok: false,
      skipped: true,
      warning: error.message,
    };
  }

  throw new Error(`${table} verwijderen mislukt: ${error.message}`);
}

async function deleteByAny(
  table: string,
  filters: Array<{ column: string; value: string }>,
) {
  for (const filter of filters) {
    if (!filter.value) continue;
    await deleteBy(table, filter.column, filter.value);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser(req);

    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(
      body?.matchmaking_id ||
        body?.matchmakingId ||
        body?.id,
    );

    if (!matchmakingId) {
      return NextResponse.json(
        { ok: false, error: "matchmaking_id ontbreekt" },
        { status: 400 },
      );
    }

    await assertCanDelete(matchmakingId, user.id);

    /**
     * Volgorde is belangrijk:
     * eerst afhankelijke resultaten/raw/context/upload-tabellen,
     * daarna pas de hoofdregel uit matchmakings.
     */
    const deletePlan = [
      // Matchmaker aanmeld-flow
      "matchmaker_fighter_resultaten",
      "matchmaker_fighter_rules",
      "matchmaker_fighter_context",
      "matchmaker_fighters_raw",
      "matchmaker_uitslagen_raw",
      "aanmeldingen",
      "matchmaker_uploads",

      // Oude/andere uploadtabel, als die nog bestaat
      "matchmaking_uploads",

      // Wedstrijd/control-flow
      "controle_resultaten",
      "controle_uitslagen",
      "controle_bout_context",
      "controle_toernooi_context",
      "fighters_raw",
      "uitslagen_raw",
      "controle_runs",
      "control_runs",
      "matchmaking_bouts_raw",
    ];

    for (const table of deletePlan) {
      await deleteByAny(table, [
        { column: "matchmaking_id", value: matchmakingId },
        { column: "matchmaker_matchmaking_id", value: matchmakingId },
      ]);
    }

    const { error: deleteMatchmakingError } = await supabaseAdmin
      .from("matchmakings")
      .delete()
      .eq("id", matchmakingId);

    if (deleteMatchmakingError) {
      throw new Error(
        `matchmakings verwijderen mislukt: ${deleteMatchmakingError.message}`,
      );
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
    });
  } catch (err: any) {
    console.error("❌ delete matchmaking fout:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Verwijderen mislukt.",
      },
      { status: 500 },
    );
  }
}