import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const KNOWN_ROLES = [
  "superadmin",
  "admin",
  "promotor",
  "matchmaker",
  "official",
  "hoofdofficial",
  "dispensatie_admin",
  "trainer",
  "sportschool",
];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function cleanString(v: unknown) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function normalizeEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeRole(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();
  return KNOWN_ROLES.includes(raw) ? raw : raw;
}

function normalizeRoles(value: unknown): string[] {
  const input = Array.isArray(value) ? value : value ? [value] : [];
  return Array.from(
    new Set(input.map((r) => normalizeRole(r)).filter((r) => KNOWN_ROLES.includes(r)))
  );
}

function getBaseUrl(req: Request) {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL;

  if (envUrl) return envUrl.replace(/\/$/, "");

  const url = new URL(req.url);
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (url.protocol ? url.protocol.replace(":", "") : "https");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");

  if (host) return `${proto}://${host}`.replace(/\/$/, "");
  return url.origin.replace(/\/$/, "");
}

async function findAuthUserByEmail(email: string) {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;

    const users = data?.users ?? [];
    const found = users.find((u) => String(u.email ?? "").toLowerCase() === target);
    if (found) return found;
    if (users.length < perPage) return null;
    page += 1;
  }

  return null;
}

async function syncAuthMetadata(
  userId: string,
  profile: {
    full_name: string | null;
    role: string | null;
    roles: string[];
    bondteam: string | null;
  }
) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      full_name: profile.full_name,
      role: profile.role,
      roles: profile.roles,
      bondteam: profile.bondteam,
    },
    app_metadata: {
      role: profile.role,
      roles: profile.roles,
      bondteam: profile.bondteam,
    },
  });

  if (error) throw error;
}

async function getRoleRowsByNames(roleNames: string[]) {
  if (roleNames.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("roles")
    .select("id,name")
    .in("name", roleNames);

  if (error) throw error;
  return data ?? [];
}

async function getUserRoleNames(userId: string): Promise<string[]> {
  const { data: userRoles, error: userRolesError } = await supabaseAdmin
    .from("user_roles")
    .select("role_id,role")
    .eq("user_id", userId);

  if (userRolesError) throw userRolesError;

  const directRoles = (userRoles ?? [])
    .map((r: any) => normalizeRole(r.role))
    .filter((r) => KNOWN_ROLES.includes(r));

  const roleIds = Array.from(
    new Set(
      (userRoles ?? [])
        .map((r: any) => r.role_id)
        .filter((id: any) => id !== null && id !== undefined)
    )
  );

  let roleNamesFromIds: string[] = [];

  if (roleIds.length > 0) {
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("roles")
      .select("id,name")
      .in("id", roleIds);

    if (rolesError) throw rolesError;

    roleNamesFromIds = (roles ?? [])
      .map((r: any) => normalizeRole(r.name))
      .filter((r) => KNOWN_ROLES.includes(r));
  }

  return Array.from(new Set([...roleNamesFromIds, ...directRoles]));
}

async function syncUserRoles(userId: string, roleNames: string[]) {
  const cleanRoles = normalizeRoles(roleNames);

  const { error: deleteError } = await supabaseAdmin
    .from("user_roles")
    .delete()
    .eq("user_id", userId);

  if (deleteError) throw deleteError;

  if (cleanRoles.length === 0) return [];

  const roleRows = await getRoleRowsByNames(cleanRoles);
  const foundNames = roleRows.map((r: any) => normalizeRole(r.name));
  const missing = cleanRoles.filter((r) => !foundNames.includes(r));

  if (missing.length > 0) {
    throw new Error(`Onbekende rol(len): ${missing.join(", ")}`);
  }

  const inserts = roleRows.map((r: any) => ({
    user_id: userId,
    role_id: r.id,
  }));

  if (inserts.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert(inserts);

    if (insertError) throw insertError;
  }

  return cleanRoles;
}

async function upsertProfile(input: {
  userId: string;
  email: string;
  full_name: string | null;
  roles: string[];
  bondteam: string | null;
}) {
  const roles = normalizeRoles(input.roles);
  const primaryRole = roles[0] ?? "matchmaker";

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        id: input.userId,
        email: input.email,
        full_name: input.full_name,
        role: primaryRole,
        active_role: primaryRole,
        bondteam: input.bondteam,
      },
      { onConflict: "id" }
    )
    .select("id,email,full_name,role,active_role,bondteam,active_sportschool_id,meekijk_sportschool_id,created_at")
    .single();

  if (error) throw error;

  const syncedRoles = await syncUserRoles(input.userId, roles);

  await syncAuthMetadata(input.userId, {
    full_name: input.full_name,
    role: primaryRole,
    roles: syncedRoles,
    bondteam: input.bondteam,
  });

  return { ...data, roles: syncedRoles };
}

export async function GET(req: Request) {
  await requireAdmin(req);

  try {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id,email,full_name,role,active_role,bondteam,active_sportschool_id,meekijk_sportschool_id,created_at")
      .order("email", { ascending: true });

    if (error) return jsonError(error.message, 500);

    const rows = data ?? [];
    const users = await Promise.all(
      rows.map(async (u: any) => {
        const roles = await getUserRoleNames(u.id).catch(() => []);
        const fallbackRole = normalizeRole(u.role);
        const finalRoles = roles.length > 0 ? roles : fallbackRole ? [fallbackRole] : [];
        return {
          ...u,
          roles: finalRoles,
          role: fallbackRole,
          active_role: normalizeRole(u.active_role),
        };
      })
    );

    return NextResponse.json({ users });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Server error", 500);
  }
}

export async function POST(req: Request) {
  await requireAdmin(req);

  try {
    const body = await req.json().catch(() => null);
    const email = normalizeEmail(body?.email);
    const full_name = cleanString(body?.full_name);
    const roles = normalizeRoles(body?.roles ?? body?.role ?? "matchmaker");
    const role = roles[0] ?? "matchmaker";
    const bondteam = cleanString(body?.bondteam);

    if (!email) return jsonError("Email is verplicht", 400);
    if (roles.length === 0) return jsonError("Minimaal één rol is verplicht", 400);

    const redirectTo = `${getBaseUrl(req)}/login/set`;
    let authUser = await findAuthUserByEmail(email);
    let invited = false;

    if (!authUser) {
      const { data: invite, error: inviteErr } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: { full_name, role, roles, bondteam },
        });

      if (inviteErr) return jsonError(inviteErr.message, 500);
      authUser = invite?.user ?? null;
      invited = true;
    }

    if (!authUser?.id) return jsonError("Kon geen auth user id krijgen", 500);

    const user = await upsertProfile({
      userId: authUser.id,
      email,
      full_name,
      roles,
      bondteam,
    });

    return NextResponse.json({
      user,
      invited,
      redirectTo,
      message: invited
        ? "Uitnodiging verzonden."
        : "Bestaande auth user gekoppeld en profiel bijgewerkt.",
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Server error", 500);
  }
}

export async function PATCH(req: Request) {
  await requireAdmin(req);

  try {
    const body = await req.json().catch(() => null);
    const id = cleanString(body?.id);
    if (!id) return jsonError("Missing id", 400);

    const existingRoles = await getUserRoleNames(id);
    const roles = "roles" in body ? normalizeRoles(body.roles) : existingRoles;
    const primaryRole = roles[0] ?? normalizeRole(body?.role) ?? "matchmaker";

    if ("roles" in body && roles.length === 0) {
      return jsonError("Minimaal één rol is verplicht", 400);
    }

    const patch: Record<string, any> = {};
    if ("full_name" in body) patch.full_name = cleanString(body.full_name);
    if ("bondteam" in body) patch.bondteam = cleanString(body.bondteam);
    if ("active_sportschool_id" in body) patch.active_sportschool_id = cleanString(body.active_sportschool_id);
    if ("meekijk_sportschool_id" in body) patch.meekijk_sportschool_id = cleanString(body.meekijk_sportschool_id);
    if ("roles" in body || "role" in body) {
      patch.role = primaryRole;
      patch.active_role = roles.includes(normalizeRole(body?.active_role))
        ? normalizeRole(body.active_role)
        : primaryRole;
    }

    if (Object.keys(patch).length === 0 && !("roles" in body)) {
      return jsonError("Geen wijzigingen ontvangen", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .update(patch)
      .eq("id", id)
      .select("id,email,full_name,role,active_role,bondteam,active_sportschool_id,meekijk_sportschool_id,created_at")
      .single();

    if (error) return jsonError(error.message, 500);

    const syncedRoles = "roles" in body ? await syncUserRoles(id, roles) : roles;

    await syncAuthMetadata(id, {
      full_name: data.full_name ?? null,
      role: data.role ?? null,
      roles: syncedRoles,
      bondteam: data.bondteam ?? null,
    });

    return NextResponse.json({ user: { ...data, roles: syncedRoles } });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Server error", 500);
  }
}

export async function DELETE(req: Request) {
  await requireAdmin(req);

  try {
    const body = await req.json().catch(() => null);
    const id = cleanString(body?.id);
    if (!id) return jsonError("Missing id", 400);

    const isMissingLegacyTableOrColumn = (error: any) => {
      const msg = String(error?.message ?? "").toLowerCase();
      const code = String(error?.code ?? "").toLowerCase();

      return (
        code === "42p01" ||
        code === "42703" ||
        code === "pgrst204" ||
        msg.includes("does not exist") ||
        msg.includes("could not find") ||
        msg.includes("schema cache")
      );
    };

    const cleanupWarnings: string[] = [];

    const { data: profileBeforeDelete } = await supabaseAdmin
      .from("user_profiles")
      .select("id,email")
      .eq("id", id)
      .maybeSingle();

    const email = normalizeEmail(profileBeforeDelete?.email ?? body?.email);

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", id);

    if (roleErr && !isMissingLegacyTableOrColumn(roleErr)) {
      return jsonError(`user_roles verwijderen mislukt: ${roleErr.message}`, 500);
    }

    if (roleErr) cleanupWarnings.push(`user_roles overgeslagen: ${roleErr.message}`);

    const legacyDeletes = [
      supabaseAdmin.from("users").delete().eq("id", id),
      supabaseAdmin.from("users").delete().eq("user_id", id),
    ];

    if (email) {
      legacyDeletes.push(supabaseAdmin.from("users").delete().eq("email", email));
    }

    for (const legacyDelete of legacyDeletes) {
      const { error } = await legacyDelete;

      if (error && !isMissingLegacyTableOrColumn(error)) {
        cleanupWarnings.push(`public.users cleanup melding: ${error.message}`);
      }
    }

    const { error: profileErr } = await supabaseAdmin
      .from("user_profiles")
      .delete()
      .eq("id", id);

    if (profileErr) {
      return jsonError(`user_profiles verwijderen mislukt: ${profileErr.message}`, 500);
    }

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);

    // Supabase Auth kan soms nog "Database error deleting user" teruggeven
    // nadat de public-tabellen al netjes zijn opgeruimd. In dat geval willen we
    // niet alsnog een 500 naar de UI sturen, want de beheeractie is praktisch
    // afgerond. We geven de melding als warning terug zodat je hem nog kunt zien.
    if (authErr) {
      const authMessage = String(authErr.message ?? "");
      const authMessageLower = authMessage.toLowerCase();

      if (!authMessageLower.includes("not found")) {
        cleanupWarnings.push(`Auth user cleanup melding: ${authMessage}`);
      }
    }

    return NextResponse.json({
      ok: true,
      deleted: {
        auth_user: !authErr,
        user_profiles: true,
        user_roles: !roleErr,
        users: true,
      },
      warnings: cleanupWarnings,
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Server error", 500);
  }
}
