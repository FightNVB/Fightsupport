import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

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

function normalizeRole(v: unknown) {
  const raw = String(v ?? "").trim();
  const roles = ["Matchmaker", "Official", "Hoofdofficial", "Admin", "Promotor", "Sportschool", "Superadmin"];
  return roles.find((r) => r.toLowerCase() === raw.toLowerCase()) ?? raw ?? "Matchmaker";
}

function getBaseUrl(req: Request) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || (url.protocol ? url.protocol.replace(":", "") : "https");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) return `${proto}://${host}`.replace(/\/$/, "");
  return url.origin.replace(/\/$/, "");
}

async function findAuthUserByEmail(email: string) {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 1000;
  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
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
    user_metadata: profile,
    app_metadata: { role: profile.role, bondteam: profile.bondteam },
  });
  if (error) throw error;
}

async function bestEffortSyncSingleRole(userId: string, role: string | null) {
  try {
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    if (!role) return;
    const { data: roleRow } = await supabaseAdmin
      .from("roles")
      .select("id,name")
      .ilike("name", role)
      .maybeSingle();
    if (!roleRow?.id) return;
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role_id: roleRow.id });
  } catch (e) {
    console.warn("bestEffortSyncSingleRole skipped:", e);
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  await requireAdmin(req);

  try {
    const resolvedParams = "then" in ctx.params ? await ctx.params : ctx.params;
    const id = resolvedParams.id;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "").trim().toLowerCase();

    const { data: row, error } = await supabaseAdmin
      .from("account_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !row) return jsonError("Request niet gevonden", 404);

    if (action === "reject") {
      const { error: delErr } = await supabaseAdmin.from("account_requests").delete().eq("id", id);
      if (delErr) return jsonError(delErr.message, 500);
      return NextResponse.json({ ok: true, rejected: true });
    }

    if (action !== "approve") return jsonError("action moet approve/reject zijn", 400);

    const email = normalizeEmail(row.email);
    const full_name = cleanString(row.name);
    const role = normalizeRole(row.requested_role || "Matchmaker");
    const bondteam = cleanString(row.team);
    const notes = cleanString(row.notes);

    if (!email) return jsonError("Email ontbreekt", 400);

    const redirectTo = `${getBaseUrl(req)}/login/set`;
    let authUser = await findAuthUserByEmail(email);
    let invited = false;

    if (!authUser) {
      const { data: invite, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name, role, bondteam, notes },
      });
      if (inviteErr) return jsonError(inviteErr.message, 500);
      authUser = invite?.user ?? null;
      invited = true;
    }

    if (!authUser?.id) return jsonError("Kon geen auth user id krijgen", 500);

    const { error: upErr } = await supabaseAdmin.from("user_profiles").upsert(
      {
        id: authUser.id,
        email,
        full_name,
        role,
        bondteam,
        notes,
      },
      { onConflict: "id" }
    );

    if (upErr) return jsonError(upErr.message, 500);

    await bestEffortSyncSingleRole(authUser.id, role);
    await syncAuthMetadata(authUser.id, { full_name, role, bondteam });

    const { error: delErr } = await supabaseAdmin.from("account_requests").delete().eq("id", id);
    if (delErr) return jsonError(delErr.message, 500);

    return NextResponse.json({
      ok: true,
      invited,
      redirectTo,
      user_id: authUser.id,
      message: invited
        ? "Request goedgekeurd en uitnodiging verzonden."
        : "Request goedgekeurd en bestaande auth user gekoppeld.",
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Server error", 500);
  }
}
