// app/api/_utils/authz.ts
// Auth + authorization helpers for API routes.
// Uses service role to verify bearer tokens and to read roles / ownership.

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type RoleName =
  | "superadmin"
  | "admin"
  | "matchmaker"
  | "official"
  | "hoofdofficial"
  | "dispensatie_admin"
  | "unknown";

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : null;
  return token && token.length ? token : null;
}

function normalizeRole(v: any): RoleName {
  const r = String(v ?? "").trim().toLowerCase();
  if (
    r === "superadmin" ||
    r === "admin" ||
    r === "matchmaker" ||
    r === "official" ||
    r === "hoofdofficial" ||
    r === "dispensatie_admin"
  ) {
    return r;
  }
  return "unknown";
}

/**
 * ✅ Canonical role source:
 * 1) public.user_profiles.role (single role)
 * 2) legacy fallback: user_roles -> roles.name
 */
export async function getUserRole(userId: string): Promise<RoleName> {
  // 1) user_profiles.role
  const { data: prof, error: pErr } = await supabaseAdmin
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!pErr) {
    const r = normalizeRole((prof as any)?.role);
    if (r !== "unknown") return r;
  }

  // 2) legacy: user_roles + roles
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select(
      `
      role_id,
      roles:roles ( name )
    `
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[authz:getUserRole]", error);
    return "unknown";
  }

  const roleName = (data as any)?.roles?.name;
  return normalizeRole(roleName);
}

export async function requireUserWithRole(req: Request): Promise<{ userId: string; role: RoleName }> {
  const token = getBearerToken(req);
  if (!token) throw new Response("Unauthorized", { status: 401 });

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user?.id) throw new Response("Unauthorized", { status: 401 });

  const userId = userData.user.id;
  const role = await getUserRole(userId);
  return { userId, role };
}

export async function requireAdmin(req: Request): Promise<{ userId: string; role: RoleName }> {
  const { userId, role } = await requireUserWithRole(req);
  if (role !== "admin" && role !== "superadmin") throw new Response("Forbidden", { status: 403 });
  return { userId, role };
}

export async function requireAnyRole(req: Request, allowed: RoleName[]): Promise<{ userId: string; role: RoleName }> {
  const { userId, role } = await requireUserWithRole(req);
  if (role === "superadmin") return { userId, role };
  if (!allowed.includes(role)) throw new Response("Forbidden", { status: 403 });
  return { userId, role };
}

export async function getUserBondteam(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("bondteam")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[authz:getUserBondteam]", error);
    return null;
  }

  const bt = (data as any)?.bondteam;
  return bt ? String(bt) : null;
}

export async function getMatchmakingMeta(matchmaking_id: string): Promise<{ uploaded_by: string | null; bondteam: string | null } | null> {
  const { data, error } = await supabaseAdmin
    .from("matchmaking_uploads")
    .select("uploaded_by, bondteam")
    .eq("matchmaking_id", matchmaking_id)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[authz:getMatchmakingMeta]", error);
    return null;
  }

  return {
    uploaded_by: (data as any)?.uploaded_by ? String((data as any).uploaded_by) : null,
    bondteam: (data as any)?.bondteam ? String((data as any).bondteam) : null,
  };
}

export async function getMatchmakingOwner(matchmaking_id: string): Promise<string | null> {
  const meta = await getMatchmakingMeta(matchmaking_id);
  return meta?.uploaded_by ?? null;
}

/**
 * Access rules:
 * - superadmin/admin: always
 * - matchmaker: only if uploaded_by == userId
 * - official/hoofdofficial: only if matchmaking_uploads.bondteam == user_profiles.bondteam
 */
export async function assertCanAccessMatchmaking(opts: {
  matchmaking_id: string;
  userId: string;
  role: RoleName;
}): Promise<void> {
  const { matchmaking_id, userId, role } = opts;

  if (role === "admin" || role === "superadmin") return;

  const meta = await getMatchmakingMeta(matchmaking_id);
  const owner = meta?.uploaded_by ?? null;
  const mmBond = meta?.bondteam ?? null;

  if (role === "matchmaker") {
    if (!owner || owner !== userId) throw new Response("Forbidden", { status: 403 });
    return;
  }

  if (role === "official" || role === "hoofdofficial") {
    const userBond = await getUserBondteam(userId);
    if (!userBond || !mmBond || String(userBond) !== String(mmBond)) {
      throw new Response("Forbidden", { status: 403 });
    }
    return;
  }

  throw new Response("Forbidden", { status: 403 });
}

export { supabaseAdmin };
