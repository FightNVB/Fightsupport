import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const ROLE_OPTIONS = [
  "Matchmaker",
  "Official",
  "Hoofdofficial",
  "Admin",
  "Promotor",
  "Sportschool",
  "Superadmin",
];

type ProfilePayload = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  bondteam: string | null;
};

function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}

function cleanString(value: unknown) {
  const v = String(value ?? "").trim();
  return v.length ? v : null;
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeRole(value: unknown) {
  const raw = String(value ?? "").trim();
  const low = raw.toLowerCase();
  return ROLE_OPTIONS.find((r) => r.toLowerCase() === low) ?? (raw || null);
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

async function findAuthUserByEmail(email: string): Promise<User | null> {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const found = data.users.find(
      (u) => String(u.email ?? "").trim().toLowerCase() === email
    );

    if (found) return found;
    if (data.users.length < 1000) break;
  }

  return null;
}

async function upsertProfile(profile: ProfilePayload) {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(profile, { onConflict: "id" })
    .select("id,email,full_name,role,bondteam,created_at")
    .single();

  if (error) throw error;
  return data;
}

async function upsertPublicUser(user: { id: string; email: string; full_name: string | null }) {
  // Jouw public.users schema: id, auth_id, full_name, email, created_at, status.
  // Deze rij is nodig zolang oude FK's zoals matchmaking_uploads.uploaded_by naar public.users.id wijzen.
  const rowWithAuthId = {
    id: user.id,
    auth_id: user.id,
    email: user.email,
    full_name: user.full_name,
    status: "active",
  };

  const first = await supabaseAdmin
    .from("users")
    .upsert(rowWithAuthId, { onConflict: "id" })
    .select("id,email,full_name,status")
    .single();

  if (!first.error) return first.data;

  // Fallback voor het geval auth_id lokaal toch anders is gedefinieerd of ontbreekt.
  const fallback = await supabaseAdmin
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        status: "active",
      },
      { onConflict: "id" }
    )
    .select("id,email,full_name,status")
    .single();

  if (fallback.error) throw fallback.error;
  return fallback.data;
}

async function getRoleRows() {
  const { data, error } = await supabaseAdmin.from("roles").select("*");
  if (error) throw error;
  return data ?? [];
}

function roleNameFromRow(row: any) {
  return String(row?.name ?? row?.role ?? row?.title ?? "").trim();
}

async function getRoleId(role: string) {
  const normalized = normalizeRole(role);
  if (!normalized) throw new Error("Rol is verplicht");

  const rows = await getRoleRows();
  const found = rows.find(
    (r: any) => roleNameFromRow(r).toLowerCase() === normalized.toLowerCase()
  );

  if (!found?.id) {
    throw new Error(`Rol '${normalized}' bestaat niet in tabel roles`);
  }

  return { id: found.id, role: normalized };
}

async function getRolesByUserIds(userIds: string[]) {
  if (!userIds.length) return new Map<string, string>();

  const { data: userRoleRows, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id,role_id,role")
    .in("user_id", userIds);

  if (error) {
    if (error.code === "42P01") return new Map<string, string>();
    throw error;
  }

  const roleIds = Array.from(
    new Set((userRoleRows ?? []).map((r: any) => r.role_id).filter(Boolean))
  );

  const roleNameById = new Map<any, string>();
  if (roleIds.length) {
    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("roles")
      .select("*")
      .in("id", roleIds as any[]);
    if (rolesErr) throw rolesErr;
    for (const row of roles ?? []) roleNameById.set((row as any).id, roleNameFromRow(row));
  }

  const map = new Map<string, string>();
  for (const row of userRoleRows ?? []) {
    const userId = String((row as any).user_id ?? "");
    if (!userId || map.has(userId)) continue;
    const role = normalizeRole(roleNameById.get((row as any).role_id) || (row as any).role);
    if (role) map.set(userId, role);
  }

  return map;
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

async function deactivateUser(userId: string) {
  const now = new Date().toISOString();

  const usersUpdate = await supabaseAdmin
    .from("users")
    .update({ status: "inactive" })
    .eq("id", userId)
    .select("id,status")
    .maybeSingle();

  if (usersUpdate.error && usersUpdate.error.code !== "42P01") {
    throw usersUpdate.error;
  }

  // Laat profiel en rollen bestaan voor historie, rapportages en FK's.
  // Alleen optionele velden bijwerken als ze in jouw schema bestaan; fouten daarop negeren.
  await supabaseAdmin
    .from("user_profiles")
    .update({ deleted_at: now })
    .eq("id", userId);

  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { deactivated: true, deactivated_at: now },
    app_metadata: { deactivated: true },
  });

  return { id: userId, status: "inactive", deactivated_at: now };
}

async function replaceUserRole(userId: string, roleInput: unknown) {
  const normalized = normalizeRole(roleInput);
  if (!normalized) throw new Error("Rol is verplicht");

  const { id: role_id, role } = await getRoleId(normalized);

  const del = await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  if (del.error && del.error.code !== "42P01") throw del.error;

  const ins = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role_id });
  if (ins.error && ins.error.code !== "42P01") throw ins.error;

  return role;
}

function withRole(profile: any, role: string | null) {
  const finalRole = normalizeRole(role) ?? normalizeRole(profile?.role);
  return {
    ...profile,
    role: finalRole,
    roles: finalRole ? [finalRole] : [],
  };
}

const HARD_DELETE_BLOCKERS = [
  ["aanmeldingen", "uploaded_by"],
  ["controle_resultaten", "reviewed_by"],
  ["controle_runs", "gestart_door_user_id"],
  ["controle_runs", "created_by"],
  ["controle_runs", "uitgevoerd_door"],
  ["events", "aangemaakt_door"],
  ["events", "matchmaker_id"],
  ["events", "hoofdofficial_id"],
  ["events", "created_by"],
  ["exam_invites", "invited_by"],
  ["fightpassport_sessions", "matchmaker_id"],
  ["matchmaker_uploads", "uploaded_by"],
  ["matchmaking_uploads", "uploaded_by"],
  ["matchmakings", "promotor_id"],
  ["matchmakings", "matchmaker_id"],
  ["matchmakings", "huidige_eigenaar_user_id"],
  ["matchmakings", "last_updated_by"],
  ["matchmakings", "maker_user_id"],
  ["matchmakings", "uploaded_by"],
] as const;

async function findBlockingReferences(userId: string) {
  const refs: Array<{ table: string; column: string; count: number }> = [];

  for (const [table, column] of HARD_DELETE_BLOCKERS) {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(column, userId);

    if (error) {
      // Niet elke omgeving heeft alle tabellen/kolommen. Alleen echte bestaande verwijzingen blokkeren.
      continue;
    }

    if ((count ?? 0) > 0) refs.push({ table, column, count: count ?? 0 });
  }

  return refs;
}

export async function GET(req: Request) {
  await requireAdmin(req);

  try {
    const { data: profiles, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id,email,full_name,role,bondteam,created_at")
      .order("email", { ascending: true });

    if (error) return jsonError(error.message, 500);

    const url = new URL(req.url);
    const includeInactive = url.searchParams.get("include_inactive") === "1" || url.searchParams.get("includeInactive") === "true";

    const ids = (profiles ?? []).map((p) => p.id).filter(Boolean);
    const rolesMap = await getRolesByUserIds(ids);
    const statusMap = await getUserStatuses(ids);

    const users = (profiles ?? [])
      .map((p) => {
        const status = statusMap.get(p.id) ?? "active";
        return { ...withRole(p, rolesMap.get(p.id) ?? p.role), status, is_active: status !== "inactive" };
      })
      .filter((u) => includeInactive || u.status !== "inactive");

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
    const bondteam = cleanString(body?.bondteam);
    const role = normalizeRole(body?.role ?? (Array.isArray(body?.roles) ? body.roles[0] : body?.roles));

    if (!email) return jsonError("Email is verplicht", 400);
    if (!full_name) return jsonError("Naam is verplicht", 400);
    if (!role) return jsonError("Rol is verplicht", 400);

    const existingAuthUser = await findAuthUserByEmail(email);
    let userId = existingAuthUser?.id ?? null;
    let invited = false;
    const redirectTo = `${getBaseUrl(req)}/login/set`;

    if (!userId) {
      const { data: invite, error: inviteErr } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: { full_name, role, bondteam },
        });

      if (inviteErr) return jsonError(inviteErr.message, 500);
      userId = invite?.user?.id ?? null;
      invited = true;
    } else {
      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...(existingAuthUser?.user_metadata ?? {}),
          full_name,
          role,
          bondteam,
        },
        app_metadata: {
          ...(existingAuthUser?.app_metadata ?? {}),
          role,
          bondteam,
        },
      });

      if (updateAuthErr) return jsonError(updateAuthErr.message, 500);
    }

    if (!userId) return jsonError("Kon geen user id krijgen", 500);

    await upsertPublicUser({ id: userId, email, full_name });

    const profile = await upsertProfile({
      id: userId,
      email,
      full_name,
      role,
      bondteam,
    });

    const savedRole = await replaceUserRole(userId, role);

    return NextResponse.json({
      user: withRole(profile, savedRole),
      invited,
      repaired_existing_auth_user: !invited,
      redirectTo,
      message: invited
        ? "Uitnodiging verzonden. User staat in auth.users, users, user_profiles en user_roles."
        : "Bestaande Auth user gekoppeld aan users, user_profiles en user_roles.",
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

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("user_profiles")
      .select("id,email,full_name,role,bondteam,created_at")
      .eq("id", id)
      .single();

    if (existingErr) return jsonError(existingErr.message, 500);
    if (!existing) return jsonError("Gebruiker niet gevonden", 404);

    const nextFullName = "full_name" in (body ?? {}) ? cleanString(body.full_name) : existing.full_name;
    const nextBondteam = "bondteam" in (body ?? {}) ? cleanString(body.bondteam) : existing.bondteam;
    const nextRole = "role" in (body ?? {}) || "roles" in (body ?? {})
      ? normalizeRole(body?.role ?? (Array.isArray(body?.roles) ? body.roles[0] : body?.roles))
      : normalizeRole(existing.role);

    if (!nextRole) return jsonError("Rol is verplicht", 400);

    await upsertPublicUser({ id, email: existing.email, full_name: nextFullName });

    if ("status" in (body ?? {})) {
      const status = String(body.status ?? "active").trim().toLowerCase() === "inactive" ? "inactive" : "active";
      const statusUpdate = await supabaseAdmin.from("users").update({ status }).eq("id", id);
      if (statusUpdate.error && statusUpdate.error.code !== "42P01") return jsonError(statusUpdate.error.message, 500);
    }

    const savedRole = await replaceUserRole(id, nextRole);

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .update({
        full_name: nextFullName,
        role: savedRole,
        bondteam: nextBondteam,
      })
      .eq("id", id)
      .select("id,email,full_name,role,bondteam,created_at")
      .single();

    if (error) return jsonError(error.message, 500);

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: {
        full_name: nextFullName,
        role: savedRole,
        bondteam: nextBondteam,
      },
      app_metadata: {
        role: savedRole,
        bondteam: nextBondteam,
      },
    });

    if (authErr) {
      return jsonError(
        `users/user_profiles/user_roles zijn bijgewerkt, maar Auth metadata bijwerken mislukte: ${authErr.message}`,
        500
      );
    }

    return NextResponse.json({ user: withRole(data, savedRole) });
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

    // Productie-veilige delete: geen hard delete meer.
    // Users blijven bestaan voor FK's, historie, uploads, controle-runs en rapportages.
    // De UI moet users met status inactive standaard verbergen.
    const result = await deactivateUser(id);

    return NextResponse.json({
      ok: true,
      deactivated: true,
      user: result,
      message: "Gebruiker is gedeactiveerd. Profiel, rollen en historie blijven behouden.",
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Server error", 500);
  }
}
