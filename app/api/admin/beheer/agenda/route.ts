import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function bad(error: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error, extra }, { status });
}

function s(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeRole(v: unknown) {
  return s(v).toLowerCase();
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
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";

  if (!token) return { ok: false as const, error: "Niet ingelogd", status: 401 };

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  const user = userData?.user;

  if (userError || !user) {
    return {
      ok: false as const,
      error: "Sessie ongeldig",
      status: 401,
      extra: userError?.message,
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
      error: "Profiel laden mislukt",
      status: 500,
      extra: profileError.message,
    };
  }

  const roles = await getUserRoleNames(user.id).catch(() => []);
  const activeRole = normalizeRole(profile?.active_role || profile?.role);
  const fallbackRole = normalizeRole(profile?.role);
  const allRoles = Array.from(new Set([activeRole, fallbackRole, ...roles].filter(Boolean)));

  const allowed = allRoles.includes("admin") || allRoles.includes("superadmin");

  if (!allowed) return { ok: false as const, error: "Geen toegang", status: 403 };

  return { ok: true as const, user, profile, roles: allRoles };
}

function dateValue(row: AnyRow) {
  return s(row.datum ?? row.event_datum ?? row.start_datum ?? row.start_date ?? row.date);
}

function nameValue(row: AnyRow) {
  return s(row.naam ?? row.event_naam ?? row.titel ?? row.title ?? row.name);
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return bad(auth.error, auth.status, "extra" in auth ? auth.extra : undefined);

    const { searchParams } = new URL(req.url);
    const q = s(searchParams.get("q")).toLowerCase();
    const status = s(searchParams.get("status") || "alles").toLowerCase();

    const { data, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .order("datum", { ascending: true, nullsFirst: false });

    if (error) return bad("Evenementen laden mislukt", 500, error.message);

    const items = ((data ?? []) as AnyRow[]).filter((event) => {
      const haystack = [
        nameValue(event),
        event.locatie,
        event.plaats,
        event.land,
        event.promotor,
        event.organisatie,
        event.hoofdofficial,
        event.matchmaker,
        event.status,
        dateValue(event),
      ]
        .map((x) => s(x).toLowerCase())
        .join(" ");

      if (q && !haystack.includes(q)) return false;
      if (status && status !== "alles" && s(event.status).toLowerCase() !== status) return false;
      return true;
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return bad(auth.error, auth.status, "extra" in auth ? auth.extra : undefined);

    const { searchParams } = new URL(req.url);
    const id = s(searchParams.get("id"));

    if (!id) return bad("Event id ontbreekt", 400);

    const { data: event, error: loadError } = await supabaseAdmin
      .from("events")
      .select("id, naam, event_naam, datum, event_datum")
      .eq("id", id)
      .maybeSingle();

    if (loadError) return bad("Evenement laden mislukt", 500, loadError.message);
    if (!event) return bad("Evenement niet gevonden", 404);

    const { error } = await supabaseAdmin
      .from("events")
      .delete()
      .eq("id", id);

    if (error) return bad("Evenement verwijderen mislukt", 500, error.message);

    return NextResponse.json({ ok: true, deleted: event });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}
