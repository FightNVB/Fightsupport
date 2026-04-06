import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseUrl() {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!v) throw new Error("NEXT_PUBLIC_SUPABASE_URL ontbreekt.");
  return v;
}

function getSupabaseAnonKey() {
  const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!v) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY ontbreekt.");
  return v;
}

function getSupabaseServiceRoleKey() {
  const v = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!v) throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt.");
  return v;
}

async function getUserFromBearer(authHeader: string | null) {
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { user: null, error: "Niet ingelogd." };

  const supabaseAuth = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, error: "Ongeldige sessie." };
  }

  return { user: data.user, error: null };
}

async function getUserRoles(admin: ReturnType<typeof createClient>, userId: string): Promise<string[]> {
  const { data, error } = await admin
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  if (error) throw error;

  const names = (data ?? [])
    .map((row: any) => String(row?.roles?.name ?? "").trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(names)];
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error: userError } = await getUserFromBearer(authHeader);
    if (userError || !user) {
      return NextResponse.json({ error: userError ?? "Niet ingelogd." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const matchmakingId = String(body?.matchmaking_id ?? "").trim();

    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt." }, { status: 400 });
    }

    const admin = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const roles = await getUserRoles(admin, user.id);
    const allowed =
      roles.includes("admin") ||
      roles.includes("superadmin") ||
      roles.includes("hoofdofficial");

    if (!allowed) {
      return NextResponse.json(
        { error: "Je hebt geen rechten om een matchmaking terug te sturen naar de matchmaker." },
        { status: 403 }
      );
    }

    const { data: uploads, error: findErr } = await admin
      .from("matchmaking_uploads")
      .select("id, matchmaking_id")
      .eq("matchmaking_id", matchmakingId);

    if (findErr) throw findErr;

    if (!uploads || uploads.length === 0) {
      return NextResponse.json(
        { error: "Geen matchmaking_uploads gevonden voor deze matchmaking." },
        { status: 404 }
      );
    }

    const nowIso = new Date().toISOString();

    const { error: updateErr } = await admin
      .from("matchmaking_uploads")
      .update({
        returned_to_matchmaker: true,
        returned_to_matchmaker_at: nowIso,
        returned_to_matchmaker_by: user.id,
      })
      .eq("matchmaking_id", matchmakingId);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      updated_count: uploads.length,
      message: "✅ Matchmaking is teruggestuurd naar de matchmaker.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Onbekende serverfout." },
      { status: 500 }
    );
  }
}