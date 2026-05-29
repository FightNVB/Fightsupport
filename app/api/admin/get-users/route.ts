import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function normalizeRole(value: unknown) {
  const raw = String(value ?? "").trim();
  return raw.length ? raw : null;
}

function roleNameFromRow(row: any) {
  return String(row?.name ?? row?.role ?? row?.title ?? "").trim();
}

async function getUserStatuses(userIds: string[]) {
  const map = new Map<string, string>();
  if (!userIds.length) return map;

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id,status")
    .in("id", userIds);

  if (error) {
    if (error.code === "42P01") return map;
    throw error;
  }

  for (const row of data ?? []) {
    const id = String((row as any).id ?? "");
    if (id) map.set(id, String((row as any).status ?? "active"));
  }

  return map;
}

export async function GET(req: Request) {
  await requireAdmin(req);

  try {
    const { data: users, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id, email, full_name, role, bondteam, created_at")
      .order("email", { ascending: true });

    if (error) throw error;

    const ids = (users ?? []).map((u) => u.id).filter(Boolean);
    const roleByUser = new Map<string, string>();

    if (ids.length) {
      const { data: userRoleRows, error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role_id, role")
        .in("user_id", ids);
      if (roleErr && roleErr.code !== "42P01") throw roleErr;

      const roleIds = Array.from(new Set((userRoleRows ?? []).map((r: any) => r.role_id).filter(Boolean)));
      const roleNameById = new Map<any, string>();

      if (roleIds.length) {
        const { data: roles, error: rolesErr } = await supabaseAdmin.from("roles").select("*").in("id", roleIds as any[]);
        if (rolesErr) throw rolesErr;
        for (const row of roles ?? []) roleNameById.set((row as any).id, roleNameFromRow(row));
      }

      for (const row of userRoleRows ?? []) {
        const userId = String((row as any).user_id ?? "");
        if (!userId || roleByUser.has(userId)) continue;
        const role = normalizeRole(roleNameById.get((row as any).role_id) || (row as any).role);
        if (role) roleByUser.set(userId, role);
      }
    }

    const url = new URL(req.url);
    const includeInactive = url.searchParams.get("include_inactive") === "1" || url.searchParams.get("includeInactive") === "true";
    const statusByUser = await getUserStatuses(ids);

    return NextResponse.json({
      ok: true,
      users: (users ?? [])
        .map((u) => {
          const role = roleByUser.get(u.id) ?? normalizeRole(u.role);
          const status = statusByUser.get(u.id) ?? "active";
          return { ...u, role, roles: role ? [role] : [], status, is_active: status !== "inactive" };
        })
        .filter((u) => includeInactive || u.status !== "inactive"),
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
