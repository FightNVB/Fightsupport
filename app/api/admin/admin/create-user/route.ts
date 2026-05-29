// app/api/admin/create-user/route.ts
// Legacy endpoint. Hoofdroute is /api/admin/users.
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

export async function POST(req: Request) {
  await requireAdmin(req);

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const full_name = String(body?.full_name ?? body?.name ?? "").trim() || null;
    const role = String(body?.role ?? body?.roles?.[0] ?? "Matchmaker").trim();
    const bondteam = String(body?.bondteam ?? body?.team ?? "").trim() || null;

    if (!email) return jsonError("E-mailadres ontbreekt", 400);
    if (!role) return jsonError("Rol ontbreekt", 400);

    const redirectTo = `${getBaseUrl(req)}/login/set`;
    let authUser = await findAuthUserByEmail(email);
    let invited = false;

    if (!authUser) {
      const { data: inviteData, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: { full_name, role, bondteam },
        });

      if (inviteError || !inviteData?.user) {
        return jsonError(inviteError?.message || "Fout bij uitnodigen van gebruiker", 400);
      }

      authUser = inviteData.user;
      invited = true;
    }

    const { error: profileErr } = await supabaseAdmin.from("user_profiles").upsert(
      { id: authUser.id, email, full_name, role, bondteam },
      { onConflict: "id" }
    );

    if (profileErr) return jsonError(profileErr.message, 500);

    await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      user_metadata: { full_name, role, bondteam },
      app_metadata: { role, bondteam },
    });

    return NextResponse.json({ ok: true, invited, redirectTo });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Onverwachte serverfout", 500);
  }
}
