// lib/api/requireRole.ts
// ✅ Single auth mechanism for API routes: Authorization: Bearer <access_token>
// ✅ No cookie-based auth / SSR session required
// ✅ Source of truth for roles: public.user_profiles.role (single role)
//    (legacy fallback: user_roles + roles)

import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export type AuthedContext = {
  supabase: SupabaseClient; // service-role client for DB operations
  user: User;
  userId: string;
};

// Service role client (bypasses RLS for server-side reads/writes)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/**
 * ✅ Authenticate user via Authorization: Bearer <token>
 */
export async function requireUserFromAuthHeader(req: Request): Promise<AuthedContext> {
  const token = getBearerToken(req);
  if (!token) {
    // 401
    throw NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    // 401
    throw NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  return { supabase: supabaseAdmin, user: data.user, userId: data.user.id };
}

/**
 * ✅ Role source of truth: public.user_profiles.role (single role)
 * Returns array for backward compatibility.
 */
export async function getUserRoleNames(supabase: SupabaseClient, userId: string): Promise<string[]> {
  // 1) preferred: user_profiles.role
  const { data: prof, error: pErr } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!pErr) {
    const r = String((prof as any)?.role ?? "")
      .trim()
      .toLowerCase();
    if (r) return [r];
  }

  // 2) legacy fallback: user_roles + roles
  const { data: ur, error: urErr } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId);
  if (urErr) throw urErr;

  const roleIds = (ur ?? [])
    .map((x: any) => Number(x?.role_id))
    .filter((n: number) => Number.isFinite(n));

  if (roleIds.length === 0) return [];

  const { data: roles, error: rErr } = await supabase
    .from("roles")
    .select("id,name")
    .in("id", roleIds);

  if (rErr) throw rErr;

  const names = (roles ?? [])
    .map((x: any) => String(x?.name ?? "").trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(names));
}

/**
 * ✅ Role check with superadmin bypass.
 */
export function hasAnyRole(userRoles: string[] | null | undefined, wanted: string | string[]) {
  const roles = (userRoles ?? [])
    .map((s) => String(s ?? "").trim().toLowerCase())
    .filter(Boolean);

  const wantedArr = (Array.isArray(wanted) ? wanted : [wanted])
    .map((s) => String(s ?? "").trim().toLowerCase())
    .filter(Boolean);

  if (roles.includes("superadmin")) return true;
  return wantedArr.some((w) => roles.includes(w));
}

/**
 * ✅ Convenience for route handlers that only have `req`.
 */
export async function hasAnyRoleFromReq(req: Request, wanted: string | string[]) {
  const { userId } = await requireUserFromAuthHeader(req);
  const roles = await getUserRoleNames(supabaseAdmin, userId);
  return hasAnyRole(roles, wanted);
}

/**
 * ✅ Enforce role(s) for API routes.
 * Returns { userId, roles } when ok.
 * Throws a NextResponse 401/403 when not allowed.
 */
export async function requireRole(req: Request, wanted: string | string[]) {
  const { userId } = await requireUserFromAuthHeader(req);
  const roles = await getUserRoleNames(supabaseAdmin, userId);

  if (!hasAnyRole(roles, wanted)) {
    // 403
    throw NextResponse.json({ error: "Geen toegang." }, { status: 403 });
  }

  return { userId, roles };
}