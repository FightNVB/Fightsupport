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
  "Matchmaker",
  "Official",
  "Hoofdofficial",
  "Admin",
  "Promotor",
  "Sportschool",
  "Superadmin",
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
  const raw = String(value ?? "").trim();
  const match = KNOWN_ROLES.find((r) => r.toLowerCase() === raw.toLowerCase());
  return match ?? raw;
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

async function syncAuthMetadata(userId: string, profile: { full_name: string | null; role: string | null; bondteam: string | null }) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      full_name: profile.full_name,
      role: profile.role,
      bondteam: profile.bondteam,
    },
    app_metadata: {
      role: profile.role,
      bondteam: profile.bondteam,
    },
  });

  if (error) throw error;
}

async function bestEffortSyncSingleRole(userId: string, role: string | null) {
  // user_profiles.role is leidend. Deze sync is alleen voor oude code die nog via roles/user_roles kijkt.
  // Fouten hier blokkeren de hoofdflow niet, zolang user_profiles goed staat.
  try {
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

    if (!role) return;

    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("roles")
      .select("id,name")
      .ilike("name", role)
      .maybeSingle();

    if (roleErr || !roleRow?.id) return;

    await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role_id: roleRow.id,
    });
  } catch (e) {
    console.warn("bestEffortSyncSingleRole skipped:", e);
  }
}

async function upsertProfile(input: {
  userId: string;
  email: string;
  full_name: string | null;
  role: string;
  bondteam: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        id: input.userId,
        email: input.email,
        full_name: input.full_name,
        role: input.role,
        bondteam: input.bondteam,
      },
      { onConflict: "id" }
    )
    .select("id,email,full_name,role,bondteam,created_at")
    .single();

  if (error) throw error;

  await bestEffortSyncSingleRole(input.userId, input.role);
  await syncAuthMetadata(input.userId, {
    full_name: input.full_name,
    role: input.role,
    bondteam: input.bondteam,
  });

  return data;
}

export async function GET(req: Request) {
  await requireAdmin(req);

  try {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id,email,full_name,role,bondteam,created_at")
      .order("email", { ascending: true });

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ users: data ?? [] });
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
    const role = normalizeRole(body?.role || "Matchmaker");
    const bondteam = cleanString(body?.bondteam);

    if (!email) return jsonError("Email is verplicht", 400);
    if (!role) return jsonError("Rol is verplicht", 400);

    const redirectTo = `${getBaseUrl(req)}/login/set`;
    let authUser = await findAuthUserByEmail(email);
    let invited = false;

    if (!authUser) {
      const { data: invite, error: inviteErr } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: { full_name, role, bondteam },
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
      role,
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

    const patch: Record<string, any> = {};
    if ("full_name" in body) patch.full_name = cleanString(body.full_name);
    if ("role" in body) patch.role = normalizeRole(body.role);
    if ("bondteam" in body) patch.bondteam = cleanString(body.bondteam);

    if (Object.keys(patch).length === 0) {
      return jsonError("Geen wijzigingen ontvangen", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .update(patch)
      .eq("id", id)
      .select("id,email,full_name,role,bondteam,created_at")
      .single();

    if (error) return jsonError(error.message, 500);

    await bestEffortSyncSingleRole(id, data.role ?? null);
    await syncAuthMetadata(id, {
      full_name: data.full_name ?? null,
      role: data.role ?? null,
      bondteam: data.bondteam ?? null,
    });

    return NextResponse.json({ user: data });
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

    // Eerst koppeltabellen/legacy opruimen. Service role omzeilt RLS.
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", id);
    if (roleErr) return jsonError(roleErr.message, 500);

    // Oude public.users tabel kan nog bestaan in jouw project. Fout niet blokkeren als de tabel weg is.
    try {
      await supabaseAdmin.from("users").delete().eq("id", id);
    } catch (_) {}

    const { error: profileErr } = await supabaseAdmin
      .from("user_profiles")
      .delete()
      .eq("id", id);
    if (profileErr) return jsonError(profileErr.message, 500);

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authErr && !String(authErr.message ?? "").toLowerCase().includes("not found")) {
      return jsonError(authErr.message, 500);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Server error", 500);
  }
}
