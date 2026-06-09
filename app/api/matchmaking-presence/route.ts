import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type PresencePayload = {
  matchmakingId?: string;
  page?: string;
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase service env ontbreekt.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function getAuthenticatedUser(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) throw new Error("Niet ingelogd.");

  const supabase = getServiceClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) throw new Error("Ongeldige sessie.");
  return { supabase, user: data.user };
}

async function getUserDisplayData(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
) {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, naam, display_name, email")
    .eq("id", userId)
    .maybeSingle();

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("roles(name), role:roles(name)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const p = (profile ?? {}) as any;
  const r = (roleRow ?? {}) as any;
  const roleName =
    r?.roles?.name ??
    r?.role?.name ??
    r?.name ??
    null;

  return {
    user_name:
      String(p.full_name ?? p.naam ?? p.display_name ?? p.email ?? "").trim() ||
      null,
    user_role: roleName ? String(roleName) : null,
  };
}

async function listOtherActiveUsers(
  supabase: ReturnType<typeof getServiceClient>,
  matchmakingId: string,
  userId: string,
) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("matchmaking_presence")
    .select("user_id, user_name, user_role, page, last_seen")
    .eq("matchmaking_id", matchmakingId)
    .neq("user_id", userId)
    .gte("last_seen", fiveMinutesAgo)
    .order("last_seen", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const body = (await req.json().catch(() => ({}))) as PresencePayload;

    const matchmakingId = String(body.matchmakingId ?? "").trim();
    const page = String(body.page ?? "controle").trim() || "controle";

    if (!matchmakingId) {
      return NextResponse.json(
        { error: "matchmakingId ontbreekt." },
        { status: 400 },
      );
    }

    const display = await getUserDisplayData(supabase, user.id);

    const { error: upsertErr } = await supabase
      .from("matchmaking_presence")
      .upsert(
        {
          matchmaking_id: matchmakingId,
          user_id: user.id,
          user_email: user.email ?? null,
          user_name: display.user_name ?? user.email ?? user.id,
          user_role: display.user_role,
          page,
          last_seen: new Date().toISOString(),
        },
        { onConflict: "matchmaking_id,user_id" },
      );

    if (upsertErr) throw upsertErr;

    const users = await listOtherActiveUsers(supabase, matchmakingId, user.id);
    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    const message = e?.message ?? String(e);
    const status =
      message.includes("Niet ingelogd") || message.includes("Ongeldige sessie")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const matchmakingId = String(
      req.nextUrl.searchParams.get("matchmakingId") ?? "",
    ).trim();

    if (!matchmakingId) {
      return NextResponse.json(
        { error: "matchmakingId ontbreekt." },
        { status: 400 },
      );
    }

    const users = await listOtherActiveUsers(supabase, matchmakingId, user.id);
    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    const message = e?.message ?? String(e);
    const status =
      message.includes("Niet ingelogd") || message.includes("Ongeldige sessie")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
