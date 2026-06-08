import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
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
];

const ROLE_ALIASES: Record<string, string> = {
  sportschool: "trainer",
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function cleanString(v: unknown) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function normalizeEmail(v: unknown) {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function normalizeRole(value: unknown) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  const mapped = ROLE_ALIASES[raw] ?? raw;
  return KNOWN_ROLES.includes(mapped) ? mapped : mapped;
}

function normalizeRoles(value: unknown): string[] {
  const input = Array.isArray(value) ? value : value ? [value] : [];
  return Array.from(
    new Set(
      input.map((r) => normalizeRole(r)).filter((r) => KNOWN_ROLES.includes(r)),
    ),
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
    const found = users.find(
      (u) => String(u.email ?? "").toLowerCase() === target,
    );
    if (found) return found;
    if (users.length < perPage) return null;
    page += 1;
  }

  return null;
}

async function cleanupExistingUserForReinvite(userId: string) {
  const cleanupSteps = [
    {
      name: "user_roles",
      run: () =>
        supabaseAdmin.from("user_roles").delete().eq("user_id", userId),
    },
    {
      name: "user_profiles",
      run: () =>
        supabaseAdmin.from("user_profiles").delete().eq("id", userId),
    },
    {
      name: "users",
      run: () => supabaseAdmin.from("users").delete().eq("id", userId),
    },
  ];

  for (const step of cleanupSteps) {
    const { error } = await step.run();
    if (error) {
      throw new Error(
        `Bestaande gebruiker opruimen mislukt bij ${step.name}: ${error.message}`,
      );
    }
  }
}

async function ensureAuthUser(input: {
  req: Request;
  email: string;
  full_name: string | null;
  roles: string[];
  bondteam: string | null;
}) {
  const role = input.roles[0] ?? "matchmaker";
  const existing = await findAuthUserByEmail(input.email);

  let reinvited = false;

  if (existing?.id) {
    // Opnieuw uitnodigen werkt betrouwbaarder dan een reset-password link,
    // omdat jouw /login/set pagina op de Supabase invite-flow is ingericht.
    // Belangrijk: eerst app-tabellen opruimen, anders blokkeert de FK naar
    // auth.users en krijg je: Database error deleting user.
    await cleanupExistingUserForReinvite(existing.id);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      existing.id,
    );

    if (deleteError) {
      throw new Error(`Auth user verwijderen mislukt: ${deleteError.message}`);
    }

    reinvited = true;
  }

  const redirectTo = `${getBaseUrl(input.req)}/login/set`;
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    input.email,
    {
      redirectTo,
      data: {
        full_name: input.full_name,
        role,
        roles: input.roles,
        bondteam: input.bondteam,
      },
    },
  );

  if (error) throw error;
  if (!data?.user?.id) throw new Error("Kon geen auth user id krijgen");

  return {
    authUser: data.user,
    invited: true,
    reinvited,
    mailSent: true,
    mailType: reinvited ? "reinvite" : "invite",
  };
}

async function syncAuthMetadata(
  userId: string,
  profile: {
    full_name: string | null;
    role: string | null;
    roles: string[];
    bondteam: string | null;
  },
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
        .filter((id: any) => id !== null && id !== undefined),
    ),
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

async function syncPublicUser(input: {
  userId: string;
  authId: string;
  email: string;
  full_name: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        id: input.userId,
        auth_id: input.authId,
        email: input.email,
        full_name: input.full_name,
        status: "active",
      },
      { onConflict: "id" },
    )
    .select("id,auth_id,email,full_name,status,created_at")
    .single();

  if (error) throw error;
  return data;
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
      { onConflict: "id" },
    )
    .select(
      "id,email,full_name,role,active_role,bondteam,active_sportschool_id,meekijk_sportschool_id,created_at",
    )
    .single();

  if (error) throw error;

  const syncedRoles = await syncUserRoles(input.userId, roles);
  return { ...data, roles: syncedRoles };
}

export async function GET(req: Request) {
  await requireAdmin(req);

  try {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select(
        "id,email,full_name,role,active_role,bondteam,active_sportschool_id,meekijk_sportschool_id,created_at",
      )
      .order("email", { ascending: true });

    if (error) return jsonError(error.message, 500);

    const rows = data ?? [];
    const users = await Promise.all(
      rows.map(async (u: any) => {
        const roles = await getUserRoleNames(u.id).catch(() => []);
        const fallbackRole = normalizeRole(u.role);
        const finalRoles =
          roles.length > 0 ? roles : fallbackRole ? [fallbackRole] : [];
        return {
          ...u,
          roles: finalRoles,
          role: fallbackRole,
          active_role: normalizeRole(u.active_role),
        };
      }),
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
    const bondteam = cleanString(body?.bondteam);

    if (!email) return jsonError("Email is verplicht", 400);
    if (roles.length === 0)
      return jsonError("Minimaal één rol is verplicht", 400);

    const { authUser, invited, reinvited, mailSent, mailType } = await ensureAuthUser({
      req,
      email,
      full_name,
      roles,
      bondteam,
    });

    const publicUser = await syncPublicUser({
      userId: authUser.id,
      authId: authUser.id,
      email,
      full_name,
    });

    const user = await upsertProfile({
      userId: authUser.id,
      email,
      full_name,
      roles,
      bondteam,
    });

    return NextResponse.json({
      user: {
        ...user,
        public_user: publicUser,
      },
      invited,
      reinvited,
      mail_sent: mailSent,
      mail_type: mailType,
      message: reinvited
        ? "Bestaande auth user verwijderd, opnieuw uitgenodigd en gebruiker opnieuw opgeslagen in auth.users, users, user_profiles en user_roles."
        : "Uitnodiging verzonden en gebruiker opgeslagen in auth.users, users, user_profiles en user_roles.",
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
    if ("active_sportschool_id" in body)
      patch.active_sportschool_id = cleanString(body.active_sportschool_id);
    if ("meekijk_sportschool_id" in body)
      patch.meekijk_sportschool_id = cleanString(body.meekijk_sportschool_id);
    if ("roles" in body || "role" in body) {
      patch.role = primaryRole;
      patch.active_role = roles.includes(normalizeRole(body?.active_role))
        ? normalizeRole(body.active_role)
        : primaryRole;
    }

    const publicPatch: Record<string, any> = {};
    if ("email" in body) publicPatch.email = normalizeEmail(body.email);
    if ("full_name" in body)
      publicPatch.full_name = cleanString(body.full_name);
    if ("status" in body)
      publicPatch.status = cleanString(body.status) ?? "active";

    if (
      Object.keys(patch).length === 0 &&
      Object.keys(publicPatch).length === 0 &&
      !("roles" in body)
    ) {
      return jsonError("Geen wijzigingen ontvangen", 400);
    }

    if (Object.keys(publicPatch).length > 0) {
      const { error: publicUserErr } = await supabaseAdmin
        .from("users")
        .update(publicPatch)
        .eq("id", id);

      if (publicUserErr)
        return jsonError(
          `users bijwerken mislukt: ${publicUserErr.message}`,
          500,
        );
    }

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .update(patch)
      .eq("id", id)
      .select(
        "id,email,full_name,role,active_role,bondteam,active_sportschool_id,meekijk_sportschool_id,created_at",
      )
      .single();

    if (error) return jsonError(error.message, 500);

    const syncedRoles =
      "roles" in body ? await syncUserRoles(id, roles) : roles;

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

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", id);

    if (roleErr && !isMissingLegacyTableOrColumn(roleErr)) {
      return jsonError(
        `user_roles verwijderen mislukt: ${roleErr.message}`,
        500,
      );
    }

    if (roleErr)
      cleanupWarnings.push(`user_roles overgeslagen: ${roleErr.message}`);

    const { error: profileErr } = await supabaseAdmin
      .from("user_profiles")
      .delete()
      .eq("id", id);

    if (profileErr) {
      return jsonError(
        `user_profiles verwijderen mislukt: ${profileErr.message}`,
        500,
      );
    }

    const { error: publicUserErr } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", id);

    if (publicUserErr && !isMissingLegacyTableOrColumn(publicUserErr)) {
      return jsonError(
        `users verwijderen mislukt: ${publicUserErr.message}`,
        500,
      );
    }

    if (publicUserErr)
      cleanupWarnings.push(`users overgeslagen: ${publicUserErr.message}`);

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authErr) {
      const authMessage = String(authErr.message ?? "");
      if (!authMessage.toLowerCase().includes("not found")) {
        cleanupWarnings.push(`Auth user cleanup melding: ${authMessage}`);
      }
    }

    return NextResponse.json({
      ok: true,
      deleted: {
        auth_user: !authErr,
        users: !publicUserErr,
        user_profiles: true,
        user_roles: !roleErr,
      },
      warnings: cleanupWarnings,
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Server error", 500);
  }
}
