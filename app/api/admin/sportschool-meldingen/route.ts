import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function bad(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, extra }, { status });
}

function s(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeRole(value: unknown) {
  return s(value).toLowerCase();
}

function normalizeStatus(value: unknown) {
  const status = s(value).toLowerCase();
  if (["open", "in_behandeling", "afgehandeld", "afgewezen"].includes(status)) {
    return status;
  }
  return "open";
}

async function getUserRoleNames(userId: string): Promise<string[]> {
  const { data: userRoles, error: userRolesError } = await supabaseAdmin
    .from("user_roles")
    .select("role_id, role")
    .eq("user_id", userId);

  if (userRolesError) throw userRolesError;

  const directRoles = (userRoles ?? [])
    .map((r: any) => normalizeRole(r.role))
    .filter(Boolean);

  const roleIds = Array.from(
    new Set(
      (userRoles ?? [])
        .map((r: any) => r.role_id)
        .filter((id: any) => id !== null && id !== undefined),
    ),
  );

  let roleNamesFromIds: string[] = [];

  if (roleIds.length > 0) {
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("roles")
      .select("id, name")
      .in("id", roleIds);

    if (rolesError) throw rolesError;

    roleNamesFromIds = (roles ?? [])
      .map((r: any) => normalizeRole(r.name))
      .filter(Boolean);
  }

  return Array.from(new Set([...roleNamesFromIds, ...directRoles]));
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) return { ok: false as const, response: bad("Niet ingelogd", 401) };

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  const user = userData?.user;

  if (userError || !user) {
    return {
      ok: false as const,
      response: bad("Ongeldige sessie", 401, userError?.message),
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, full_name, role, active_role, bondteam, active_sportschool_id, meekijk_sportschool_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false as const,
      response: bad("Profiel laden mislukt", 500, profileError.message),
    };
  }

  const roles = await getUserRoleNames(user.id).catch(() => []);
  const activeRole = normalizeRole(profile?.active_role || profile?.role);
  const fallbackRole = normalizeRole(profile?.role);
  const allRoles = Array.from(new Set([activeRole, fallbackRole, ...roles].filter(Boolean)));

  const allowed = allRoles.includes("admin") || allRoles.includes("superadmin");

  if (!allowed) return { ok: false as const, response: bad("Geen toegang", 403) };

  return { ok: true as const, user, profile, roles: allRoles };
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const status = s(searchParams.get("status") || "open");
    const q = s(searchParams.get("q"));

    let query = supabaseAdmin
      .from("sportschool_vechter_meldingen")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(250);

    if (status !== "alles") query = query.eq("status", normalizeStatus(status));

    if (q) {
      const like = `%${q.replace(/[%_]/g, "")}%`;
      query = query.or(
        `naam.ilike.${like},va_nummer.ilike.${like},sportschool_naam.ilike.${like},melding.ilike.${like},type.ilike.${like}`,
      );
    }

    const { data, error } = await query;
    if (error) return bad("Meldingen laden mislukt", 500, error.message);

    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const id = s(body.id);
    const status = normalizeStatus(body.status);
    const adminOpmerking = s(body.admin_opmerking ?? body.adminOpmerking);

    if (!id) return bad("id ontbreekt");

    const patch: Record<string, any> = {
      status,
      admin_opmerking: adminOpmerking || null,
    };

    if (status === "afgehandeld" || status === "afgewezen") {
      patch.reviewed_by = auth.user.id;
      patch.reviewed_at = new Date().toISOString();
    } else {
      patch.reviewed_by = null;
      patch.reviewed_at = null;
    }

    const { data, error } = await supabaseAdmin
      .from("sportschool_vechter_meldingen")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return bad("Melding bijwerken mislukt", 500, error.message);

    return NextResponse.json({ ok: true, item: data });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}
