import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type WeegstationRole =
  | "superadmin"
  | "admin"
  | "promotor"
  | "matchmaker"
  | "official"
  | "hoofdofficial"
  | "dispensatie_admin";

type AuthContext = {
  userId: string;
  roles: WeegstationRole[];
  isAdminLike: boolean;
  isHoofdofficialLike: boolean;
  bondteam: string;
  admin: SupabaseClient;
};

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

function normalizeRoleName(v: unknown): WeegstationRole | "" {
  return String(v ?? "").trim().toLowerCase() as WeegstationRole | "";
}

function getBearerTokenFromRequest(req: Request): string {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    throw new Error("Niet ingelogd.");
  }

  return token;
}

export async function getWeegstationAuthContext(
  req: Request,
  matchmakingId?: string
): Promise<AuthContext> {
  const admin = createSupabaseAdmin();
  const accessToken = getBearerTokenFromRequest(req);

  const {
    data: { user },
    error: authErr,
  } = await admin.auth.getUser(accessToken);

  if (authErr || !user) {
    throw new Error("Niet ingelogd.");
  }

  const { data: profile, error: profileErr } = await admin
    .from("user_profiles")
    .select("id, bondteam, role")
    .eq("id", user.id)
    .single();

  if (profileErr) {
    throw new Error(profileErr.message);
  }

  // ✅ Canonical role source: user_profiles.role (single role)
  // Legacy fallback: user_roles + roles
  let roles: WeegstationRole[] = [];

  const profileRole = normalizeRoleName((profile as any)?.role);
  if (profileRole) {
    roles = [profileRole as WeegstationRole];
  } else {
    // Legacy fallback
    const { data: userRoles, error: urErr } = await admin
      .from("user_roles")
      .select("role_id")
      .eq("user_id", user.id);

    if (urErr) {
      throw new Error(urErr.message);
    }

    const roleIds = (userRoles ?? []).map((r: any) => r.role_id).filter(Boolean);

    if (roleIds.length > 0) {
      const { data: rolesRows, error: rolesErr } = await admin
        .from("roles")
        .select("id, name")
        .in("id", roleIds);

      if (rolesErr) {
        throw new Error(rolesErr.message);
      }

      roles = (rolesRows ?? [])
        .map((r: any) => normalizeRoleName(r?.name))
        .filter(Boolean) as WeegstationRole[];
    }
  }

  const isAdminLike = roles.some((r) =>
    ["admin", "superadmin", "dispensatie_admin"].includes(r)
  );

  const isHoofdofficialLike = roles.some((r) =>
    ["hoofdofficial", "superadmin", "dispensatie_admin"].includes(r)
  );

  const bondteam = String(profile?.bondteam ?? "").trim();

  const hasWeegstationAccess = roles.some((r) =>
    ["official", "hoofdofficial", "admin", "superadmin", "dispensatie_admin"].includes(r)
  );

  if (!hasWeegstationAccess) {
    throw new Error("Je hebt geen toegang tot het weegstation.");
  }

  if (matchmakingId) {
    const { data: mm, error: mmErr } = await admin
      .from("matchmaking_uploads")
      .select("matchmaking_id, bondteam")
      .eq("matchmaking_id", matchmakingId)
      .single();

    if (mmErr) {
      throw new Error(mmErr.message);
    }

    const mmBondteam = String(mm?.bondteam ?? "").trim().toLowerCase();

    const teamAccess =
      roles.some((r) => r === "official" || r === "hoofdofficial") &&
      !!mmBondteam &&
      mmBondteam === bondteam.toLowerCase();

    if (!isAdminLike && !teamAccess) {
      throw new Error("Je mag alleen matchmakings van je eigen bondteam zien en bewerken.");
    }
  }

  return {
    userId: user.id,
    roles,
    isAdminLike,
    isHoofdofficialLike,
    bondteam,
    admin,
  };
}