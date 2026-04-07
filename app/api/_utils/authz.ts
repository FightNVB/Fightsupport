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
  | "dispensatie_admin"
  | "unknown";

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : null;
  return token && token.length ? token : null;
}

function normalizeRole(v: any): RoleName {
  const r = String(v ?? "").trim().toLowerCase();
  if (["superadmin","admin","matchmaker","official","hoofdofficial","dispensatie_admin"].includes(r)) return r as RoleName;
  return "unknown";
}

export async function getUserRole(userId: string): Promise<RoleName> {
  const { data: prof } = await supabaseAdmin.from("user_profiles").select("role").eq("id", userId).maybeSingle();
  const direct = normalizeRole((prof as any)?.role);
  if (direct !== "unknown") return direct;

  const { data } = await supabaseAdmin
    .from("user_roles")
    .select(`role_id, roles:roles ( name )`)
    .eq("user_id", userId)
    .maybeSingle();

  return normalizeRole((data as any)?.roles?.name);
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
  const { data } = await supabaseAdmin.from("user_profiles").select("bondteam").eq("id", userId).maybeSingle();
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

export async function assertCanAccessMatchmaking(opts: { matchmaking_id: string; userId: string; role: RoleName; }): Promise<void> {
  const { matchmaking_id, userId, role } = opts;
  if (role === "admin" || role === "superadmin") return;
  const meta = await getMatchmakingMeta(matchmaking_id);
  if (!meta) throw new Response("Forbidden", { status: 403 });

  if (role === "matchmaker") {
    const allowedIds = [meta.huidige_eigenaar_user_id, meta.matchmaker_id, meta.uploaded_by].filter(Boolean).map(String);
    if (!allowedIds.includes(userId)) throw new Response("Forbidden", { status: 403 });
    return;
  }

  if (role === "official" || role === "hoofdofficial") {
    const userBond = await getUserBondteam(userId);
    if (!userBond || !meta.bondteam || String(userBond) !== String(meta.bondteam)) {
      throw new Response("Forbidden", { status: 403 });
    }
    return;
  }

  throw new Response("Forbidden", { status: 403 });
}

export { supabaseAdmin };
