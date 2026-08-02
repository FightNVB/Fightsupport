import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function s(value: unknown) {
  return String(value ?? "").trim();
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
    .select(
      "id, matchmaker_id, uploaded_by, maker_user_id, huidige_eigenaar_user_id",
    )
    .eq("id", matchmakingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Matchmaking niet gevonden.");

  const allowed = [
    data.matchmaker_id,
    data.uploaded_by,
    data.maker_user_id,
    data.huidige_eigenaar_user_id,
  ]
    .map(s)
    .filter(Boolean);

  if (!allowed.includes(userId)) {
    throw new Error("Geen toegang tot deze matchmaking.");
  }
}

async function getPriorityIds(matchmakingId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmaker_prioriteiten")
    .select("inschrijving_id")
    .eq("matchmaking_id", matchmakingId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => s(row.inschrijving_id))
    .filter(Boolean);
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const url = new URL(req.url);
    const matchmakingId = s(url.searchParams.get("matchmaking_id"));

    if (!matchmakingId) throw new Error("matchmaking_id ontbreekt.");

    await assertAccess(user.id, matchmakingId);
    const ids = await getPriorityIds(matchmakingId, user.id);

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      inschrijving_ids: ids,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Prioriteiten laden mislukt." },
      { status: 400 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body.matchmaking_id);
    const inschrijvingId = s(body.inschrijving_id);
    const actief = body.actief === true;

    if (!matchmakingId) throw new Error("matchmaking_id ontbreekt.");
    if (!inschrijvingId) throw new Error("inschrijving_id ontbreekt.");

    await assertAccess(user.id, matchmakingId);

    if (actief) {
      const { error } = await supabaseAdmin
        .from("matchmaker_prioriteiten")
        .upsert(
          {
            matchmaking_id: matchmakingId,
            inschrijving_id: inschrijvingId,
            user_id: user.id,
          },
          {
            onConflict: "matchmaking_id,inschrijving_id,user_id",
            ignoreDuplicates: true,
          },
        );

      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("matchmaker_prioriteiten")
        .delete()
        .eq("matchmaking_id", matchmakingId)
        .eq("inschrijving_id", inschrijvingId)
        .eq("user_id", user.id);

      if (error) throw new Error(error.message);
    }

    const ids = await getPriorityIds(matchmakingId, user.id);

    return NextResponse.json({
      ok: true,
      actief,
      matchmaking_id: matchmakingId,
      inschrijving_id: inschrijvingId,
      inschrijving_ids: ids,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Prioriteit opslaan mislukt." },
      { status: 400 },
    );
  }
}
