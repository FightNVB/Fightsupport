// lib/api/auth.ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type AuthUser = {
  userId: string;
  profileId: string;
  role: string;
};

export async function requireUserFromAuthHeader(req: NextRequest): Promise<AuthUser> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    throw new Error("UNAUTHORIZED");
  }

  const user = data.user;

  const { data: profileById, error: profileByIdErr } = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, role, active_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileByIdErr) {
    throw new Error("NO_ROLE");
  }

  let profile: any = profileById;
  if (!profile?.id) {
    const email = String(user.email ?? "").trim();
    if (!email) throw new Error("NO_ROLE");

    const { data: profileByEmail, error: profileByEmailErr } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, role, active_role")
      .ilike("email", email)
      .maybeSingle();

    if (profileByEmailErr || !profileByEmail?.id) {
      throw new Error("NO_ROLE");
    }
    profile = profileByEmail;
  }

  const { data: userRoles, error: userRolesErr } = await supabaseAdmin
    .from("user_roles")
    .select("role_id")
    .eq("user_id", profile.id);

  if (userRolesErr) throw new Error("NO_ROLE");

  const roleIds = (userRoles ?? [])
    .map((row: any) => row?.role_id)
    .filter((roleId: any) => roleId != null && String(roleId).trim() !== "");

  if (roleIds.length === 0) throw new Error("NO_ROLE");

  const { data: roles, error: rolesErr } = await supabaseAdmin
    .from("roles")
    .select("id, name")
    .in("id", roleIds);

  if (rolesErr) throw new Error("NO_ROLE");

  const allowedRoles = new Set(
    (roles ?? [])
      .map((r: any) => String(r?.name ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_"))
      .filter(Boolean)
  );

  const activeRole = String(profile.active_role ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const legacyRole = String(profile.role ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const role = activeRole || legacyRole;

  if (!role || !allowedRoles.has(role)) {
    throw new Error("NO_ROLE");
  }

  return {
    userId: profile.id,
    profileId: profile.id,
    role: String(role),
  };
}
