// app/api/_utils/authz.ts
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
  | "promotor"
  | "sportschool"
  | "dispensatie_admin"
  | "trainer"
  | "unknown";

export type AuthzUser = {
  userId: string;
  profileId: string;
  authUserId: string;
  role: RoleName;
  allowedRoles: RoleName[];
  bondteam: string | null;
  email: string | null;
  profile: {
    id: string;
    email: string | null;
    full_name?: string | null;
    bondteam: string | null;
    role: string | null;
    active_role: string | null;
  };
  user: { id: string; email?: string | null };
};

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : null;
  return token && token.length ? token : null;
}

function normalizeRole(v: any): RoleName {
  const r = String(v ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (
    [
      "superadmin",
      "admin",
      "matchmaker",
      "official",
      "hoofdofficial",
      "promotor",
      "sportschool",
      "dispensatie_admin",
      "trainer",
    ].includes(r)
  ) {
    return r as RoleName;
  }
  return "unknown";
}

export function canUseMatchmakerMenu(role: RoleName) {
  return ["matchmaker", "official", "hoofdofficial", "admin", "superadmin"].includes(role);
}

async function findUserProfile(authUserId: string, email?: string | null): Promise<AuthzUser["profile"]> {
  const { data: byId, error: byIdErr } = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, full_name, bondteam, role, active_role")
    .eq("id", authUserId)
    .maybeSingle();

  if (byIdErr) throw byIdErr;
  if ((byId as any)?.id) return byId as AuthzUser["profile"];

  const normalizedEmail = String(email ?? "").trim();
  if (!normalizedEmail) throw new Response("Forbidden", { status: 403 });

  const { data: byEmail, error: byEmailErr } = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, full_name, bondteam, role, active_role")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (byEmailErr) throw byEmailErr;
  if (!(byEmail as any)?.id) throw new Response("Forbidden", { status: 403 });

  return byEmail as AuthzUser["profile"];
}

async function getRoleNamesForProfile(profileId: string, authUserId?: string): Promise<RoleName[]> {
  async function loadRoleIds(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role_id")
      .eq("user_id", userId);

    if (error) throw error;
    return (data ?? [])
      .map((row: any) => row?.role_id)
      .filter((roleId: any) => roleId != null && String(roleId).trim() !== "");
  }

  let roleIds = await loadRoleIds(profileId);
  if (roleIds.length === 0 && authUserId && authUserId !== profileId) {
    roleIds = await loadRoleIds(authUserId);
  }

  if (roleIds.length === 0) return [];

  const { data: roles, error } = await supabaseAdmin
    .from("roles")
    .select("id, name")
    .in("id", roleIds);

  if (error) throw error;

  return Array.from(
    new Set(
      (roles ?? [])
        .map((role: any) => normalizeRole(role?.name))
        .filter((role): role is RoleName => role !== "unknown")
    )
  );
}

function resolveActiveRole(profile: AuthzUser["profile"], allowedRoles: RoleName[]): RoleName {
  const allowedSet = new Set(allowedRoles);
  const activeRole = normalizeRole(profile.active_role);

  if (activeRole !== "unknown") {
    if (!allowedSet.has(activeRole)) throw new Response("Forbidden", { status: 403 });
    return activeRole;
  }

  const legacyRole = normalizeRole(profile.role);
  if (legacyRole !== "unknown" && allowedSet.has(legacyRole)) return legacyRole;

  throw new Response("Forbidden", { status: 403 });
}

export async function getUserRole(userId: string): Promise<RoleName> {
  const { data: prof, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, full_name, bondteam, role, active_role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !(prof as any)?.id) return "unknown";

  const allowedRoles = await getRoleNamesForProfile(String((prof as any).id));
  try {
    return resolveActiveRole(prof as AuthzUser["profile"], allowedRoles);
  } catch {
    return "unknown";
  }
}

export async function requireUserWithRole(req: Request, allowed?: RoleName[]): Promise<AuthzUser> {
  const token = getBearerToken(req);
  if (!token) throw new Response("Unauthorized", { status: 401 });

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user?.id) throw new Response("Unauthorized", { status: 401 });

  const authUserId = userData.user.id;
  const authEmail = userData.user.email ?? null;
  const profile = await findUserProfile(authUserId, authEmail);
  const profileId = String(profile.id);
  const allowedRoles = await getRoleNamesForProfile(profileId, authUserId);
  const role = resolveActiveRole(profile, allowedRoles);

  if (allowed?.length && role !== "superadmin" && !allowed.includes(role)) {
    throw new Response("Forbidden", { status: 403 });
  }

  return {
    userId: profileId,
    profileId,
    authUserId,
    role,
    allowedRoles,
    bondteam: profile.bondteam ? String(profile.bondteam) : null,
    email: profile.email ?? authEmail,
    profile,
    user: { id: authUserId, email: authEmail },
  };
}

export async function requireAdmin(req: Request): Promise<AuthzUser> {
  const auth = await requireUserWithRole(req);
  if (auth.role !== "admin" && auth.role !== "superadmin") throw new Response("Forbidden", { status: 403 });
  return auth;
}

export async function requireAnyRole(req: Request, allowed: RoleName[]): Promise<AuthzUser> {
  const auth = await requireUserWithRole(req);
  if (auth.role === "superadmin") return auth;
  if (!allowed.includes(auth.role)) throw new Response("Forbidden", { status: 403 });
  return auth;
}

export async function getUserBondteam(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("bondteam")
    .eq("id", userId)
    .maybeSingle();

  const bt = (data as any)?.bondteam;
  return bt ? String(bt) : null;
}

export async function getMatchmakingMeta(matchmaking_id: string): Promise<any | null> {
  const { data: mm } = await supabaseAdmin
    .from("matchmakings")
    .select("id, matchmaker_id, huidige_eigenaar_type, huidige_eigenaar_user_id, huidige_eigenaar_bondteam, bron_type")
    .eq("id", matchmaking_id)
    .maybeSingle();

  const { data: upload } = await supabaseAdmin
    .from("matchmaking_uploads")
    .select("uploaded_by, bondteam")
    .eq("matchmaking_id", matchmaking_id)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    uploaded_by: (upload as any)?.uploaded_by ? String((upload as any).uploaded_by) : null,
    bondteam: (mm as any)?.huidige_eigenaar_bondteam || (upload as any)?.bondteam || null,
    huidige_eigenaar_type: (mm as any)?.huidige_eigenaar_type || null,
    huidige_eigenaar_user_id: (mm as any)?.huidige_eigenaar_user_id || null,
    matchmaker_id: (mm as any)?.matchmaker_id || null,
  };
}

export async function getMatchmakingOwner(matchmaking_id: string): Promise<string | null> {
  const meta = await getMatchmakingMeta(matchmaking_id);
  return meta?.huidige_eigenaar_user_id ?? meta?.matchmaker_id ?? meta?.uploaded_by ?? null;
}

export async function assertCanAccessMatchmaking(opts: {
  matchmaking_id: string;
  userId: string;
  role: RoleName;
}): Promise<void> {
  const { matchmaking_id, userId, role } = opts;
  if (role === "admin" || role === "superadmin") return;

  const meta = await getMatchmakingMeta(matchmaking_id);
  if (!meta) throw new Response("Forbidden", { status: 403 });

  const allowedOwnerIds = [meta.huidige_eigenaar_user_id, meta.matchmaker_id, meta.uploaded_by]
    .filter(Boolean)
    .map(String);

  if (["matchmaker", "official", "hoofdofficial"].includes(role) && allowedOwnerIds.includes(userId)) {
    return;
  }

  if (role === "official" || role === "hoofdofficial") {
    const userBond = await getUserBondteam(userId);
    if (userBond && meta.bondteam && String(userBond) === String(meta.bondteam)) return;
  }

  throw new Response("Forbidden", { status: 403 });
}

export async function resolveAndAssertFighterReviewAccess(opts: {
  reviewId: string;
  userId: string;
  role: RoleName;
}): Promise<string> {
  const { data: review, error } = await supabaseAdmin
    .from("matchmaker_fighter_resultaten")
    .select("id,matchmaking_id,inschrijving_id")
    .eq("id", opts.reviewId)
    .maybeSingle();

  if (error) throw error;
  if (!review) throw new Response("Not Found", { status: 404 });

  let matchmakingId = String((review as any).matchmaking_id ?? "").trim();
  if (!matchmakingId && (review as any).inschrijving_id != null) {
    const { data: registration, error: registrationError } = await supabaseAdmin
      .from("aanmeldingen")
      .select("matchmaking_id")
      .eq("id", (review as any).inschrijving_id)
      .maybeSingle();
    if (registrationError) throw registrationError;
    matchmakingId = String((registration as any)?.matchmaking_id ?? "").trim();
  }

  if (!matchmakingId) throw new Response("Forbidden", { status: 403 });
  await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId: opts.userId, role: opts.role });
  return matchmakingId;
}

export { supabaseAdmin };
