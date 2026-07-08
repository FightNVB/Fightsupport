// Single auth mechanism for API routes: Authorization: Bearer <access_token>
// Source of truth for authorization: user_profiles.active_role validated against user_roles.

import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export type AuthedContext = {
  supabase: SupabaseClient;
  user: User;
  userId: string;
  profileId: string;
};

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

function normalizeRole(v: any): string | null {
  const r = String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return r || null;
}

async function getUserProfileForAuthUser(user: User): Promise<any> {
  const { data: byId, error: byIdErr } = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, role, active_role")
    .eq("id", user.id)
    .maybeSingle();

  if (byIdErr) throw byIdErr;
  if ((byId as any)?.id) return byId;

  const email = String(user.email ?? "").trim();
  if (!email) throw NextResponse.json({ error: "Geen toegang." }, { status: 403 });

  const { data: byEmail, error: byEmailErr } = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, role, active_role")
    .ilike("email", email)
    .maybeSingle();

  if (byEmailErr) throw byEmailErr;
  if (!(byEmail as any)?.id) throw NextResponse.json({ error: "Geen toegang." }, { status: 403 });

  return byEmail;
}

async function getAllowedRoleNames(supabase: SupabaseClient, profileId: string): Promise<string[]> {
  const { data: ur, error: urErr } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", profileId);
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
    .map((x: any) => normalizeRole(x?.name))
    .filter(Boolean) as string[];

  return Array.from(new Set(names));
}

export async function requireUserFromAuthHeader(req: Request): Promise<AuthedContext> {
  const token = getBearerToken(req);
  if (!token) {
    throw NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    throw NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const profile = await getUserProfileForAuthUser(data.user);
  return { supabase: supabaseAdmin, user: data.user, userId: profile.id, profileId: profile.id };
}

export async function getUserRoleNames(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data: prof, error: pErr } = await supabase
    .from("user_profiles")
    .select("id, role, active_role")
    .eq("id", userId)
    .maybeSingle();

  if (pErr) throw pErr;
  if (!(prof as any)?.id) return [];

  const allowed = await getAllowedRoleNames(supabase, String((prof as any).id));
  const allowedSet = new Set(allowed);
  const activeRole = normalizeRole((prof as any)?.active_role);

  if (activeRole) {
    return allowedSet.has(activeRole) ? [activeRole] : [];
  }

  const legacyRole = normalizeRole((prof as any)?.role);
  return legacyRole && allowedSet.has(legacyRole) ? [legacyRole] : [];
}

export function hasAnyRole(userRoles: string[] | null | undefined, wanted: string | string[]) {
  const roles = (userRoles ?? [])
    .map((s) => normalizeRole(s))
    .filter(Boolean) as string[];

  const wantedArr = (Array.isArray(wanted) ? wanted : [wanted])
    .map((s) => normalizeRole(s))
    .filter(Boolean) as string[];

  if (roles.includes("superadmin")) return true;
  return wantedArr.some((w) => roles.includes(w));
}

export async function hasAnyRoleFromReq(req: Request, wanted: string | string[]) {
  const { userId } = await requireUserFromAuthHeader(req);
  const roles = await getUserRoleNames(supabaseAdmin, userId);
  return hasAnyRole(roles, wanted);
}

export async function requireRole(req: Request, wanted: string | string[]) {
  const { userId } = await requireUserFromAuthHeader(req);
  const roles = await getUserRoleNames(supabaseAdmin, userId);

  if (!hasAnyRole(roles, wanted)) {
    throw NextResponse.json({ error: "Geen toegang." }, { status: 403 });
  }

  return { userId, roles };
}
