import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const LOCK_MINUTES = 120;

type LockPayload = { matchmakingId?: string; page?: string };

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service env ontbreekt.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function getBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  return header.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

async function getAuthenticatedUser(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) throw new Error("Niet ingelogd.");
  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Ongeldige sessie.");
  return { supabase, user: data.user };
}

async function getDisplay(supabase: ReturnType<typeof getServiceClient>, userId: string) {
  const { data: profile } = await supabase.from("user_profiles")
    .select("full_name, naam, display_name, email").eq("id", userId).maybeSingle();
  const { data: roleRow } = await supabase.from("user_roles")
    .select("roles(name), role:roles(name)").eq("user_id", userId).limit(1).maybeSingle();
  const p = (profile ?? {}) as any;
  const r = (roleRow ?? {}) as any;
  return {
    user_name: String(p.full_name ?? p.naam ?? p.display_name ?? p.email ?? "").trim() || null,
    user_role: r?.roles?.name ?? r?.role?.name ?? r?.name ?? null,
  };
}

function asPresence(lock: any) {
  if (!lock) return [];
  return [{
    user_id: String(lock.locked_by_user_id),
    user_name: lock.locked_by_name ?? null,
    user_role: lock.locked_by_role ?? null,
    page: lock.page ?? null,
    last_seen: lock.locked_at,
  }];
}

async function getActiveLock(supabase: ReturnType<typeof getServiceClient>, matchmakingId: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("matchmaking_edit_locks").select("*")
    .eq("matchmaking_id", matchmakingId).gt("expires_at", now).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const body = (await req.json().catch(() => ({}))) as LockPayload;
    const matchmakingId = String(body.matchmakingId ?? "").trim();
    const page = String(body.page ?? "controle").trim() || "controle";
    if (!matchmakingId) return NextResponse.json({ error: "matchmakingId ontbreekt." }, { status: 400 });

    // Ruim een verlopen lock op. Dit is geen heartbeat: dit gebeurt alleen bij openen/claimen.
    await supabase.from("matchmaking_edit_locks").delete()
      .eq("matchmaking_id", matchmakingId).lte("expires_at", new Date().toISOString());

    const existing = await getActiveLock(supabase, matchmakingId);
    if (existing && String(existing.locked_by_user_id) !== user.id) {
      return NextResponse.json({ ok: true, editable: false, lock: existing, users: asPresence(existing) });
    }

    const display = await getDisplay(supabase, user.id);
    const now = new Date();
    const expires = new Date(now.getTime() + LOCK_MINUTES * 60_000);
    const row = {
      matchmaking_id: matchmakingId,
      locked_by_user_id: user.id,
      locked_by_email: user.email ?? null,
      locked_by_name: display.user_name ?? user.email ?? user.id,
      locked_by_role: display.user_role,
      page,
      locked_at: existing?.locked_at ?? now.toISOString(),
      expires_at: expires.toISOString(),
    };

    if (existing && String(existing.locked_by_user_id) === user.id) {
      const { data, error } = await supabase.from("matchmaking_edit_locks")
        .update({ page, expires_at: expires.toISOString() })
        .eq("matchmaking_id", matchmakingId)
        .eq("locked_by_user_id", user.id)
        .select("*").single();
      if (error) throw error;
      return NextResponse.json({ ok: true, editable: true, lock: data, users: [] });
    }

    const { data, error } = await supabase.from("matchmaking_edit_locks").insert(row).select("*").single();
    if (error) {
      // Twee gebruikers kunnen exact tegelijk openen. De PRIMARY KEY op matchmaking_id
      // beslist dan atomair wie wint; de verliezer krijgt de bestaande lock terug.
      if ((error as any)?.code === "23505") {
        const winner = await getActiveLock(supabase, matchmakingId);
        return NextResponse.json({ ok: true, editable: false, lock: winner, users: asPresence(winner) });
      }
      throw error;
    }
    return NextResponse.json({ ok: true, editable: true, lock: data, users: [] });
  } catch (e: any) {
    const message = e?.message ?? String(e);
    const status = /Niet ingelogd|Ongeldige sessie/.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const matchmakingId = String(req.nextUrl.searchParams.get("matchmakingId") ?? "").trim();
    if (!matchmakingId) return NextResponse.json({ error: "matchmakingId ontbreekt." }, { status: 400 });
    const lock = await getActiveLock(supabase, matchmakingId);
    const isMine = !!lock && String(lock.locked_by_user_id) === user.id;
    return NextResponse.json({ ok: true, editable: isMine, lock, users: asPresence(lock) });
  } catch (e: any) {
    const message = e?.message ?? String(e);
    const status = /Niet ingelogd|Ongeldige sessie/.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const body = (await req.json().catch(() => ({}))) as LockPayload;
    const matchmakingId = String(body.matchmakingId ?? req.nextUrl.searchParams.get("matchmakingId") ?? "").trim();
    if (!matchmakingId) return NextResponse.json({ error: "matchmakingId ontbreekt." }, { status: 400 });
    const { error } = await supabase.from("matchmaking_edit_locks").delete()
      .eq("matchmaking_id", matchmakingId).eq("locked_by_user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const message = e?.message ?? String(e);
    const status = /Niet ingelogd|Ongeldige sessie/.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
