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
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const url = new URL(req.url);
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (url.protocol ? url.protocol.replace(":", "") : "https");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");

  if (host) {
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  return url.origin.replace(/\/$/, "");
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  await requireAdmin(req);

  try {
    const resolvedParams =
      "then" in ctx.params ? await ctx.params : ctx.params;

    const { id } = resolvedParams;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "").trim().toLowerCase(); // approve|reject

    const { data: row, error } = await supabaseAdmin
      .from("account_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !row) {
      return jsonError("Request niet gevonden", 404);
    }

    if (action === "reject") {
      const { error: delErr } = await supabaseAdmin
        .from("account_requests")
        .delete()
        .eq("id", id);

      if (delErr) return jsonError(delErr.message, 500);
      return NextResponse.json({ ok: true, rejected: true });
    }

    if (action !== "approve") {
      return jsonError("action moet approve/reject zijn", 400);
    }

    const email = String(row.email ?? "").trim().toLowerCase();
    const full_name = String(row.name ?? "").trim();
    const requested_role = String(row.requested_role ?? "").trim();
    const bondteam = row.team ? String(row.team).trim() : null;
    const notes = row.notes ? String(row.notes).trim() : null;

    if (!email) return jsonError("Email ontbreekt", 400);

    const redirectTo = `${getBaseUrl(req)}/login/set`;

    const { data: invite, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          full_name: full_name || null,
          role: requested_role || "Gebruiker",
          bondteam,
          notes,
        },
      });

    if (inviteErr) return jsonError(inviteErr.message, 500);

    const userId = invite?.user?.id;
    if (!userId) return jsonError("Kon geen user id krijgen", 500);

    const { error: upErr } = await supabaseAdmin
      .from("user_profiles")
      .upsert(
        {
          id: userId,
          email,
          full_name: full_name || null,
          role: (requested_role || "Gebruiker").trim(),
          bondteam,
          notes,
        },
        { onConflict: "id" }
      );

    if (upErr) return jsonError(upErr.message, 500);

    const { error: delErr } = await supabaseAdmin
      .from("account_requests")
      .delete()
      .eq("id", id);

    if (delErr) return jsonError(delErr.message, 500);

    return NextResponse.json({
      ok: true,
      invited: true,
      redirectTo,
      user_id: userId,
      message: "Request goedgekeurd en uitnodiging verzonden.",
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Server error", 500);
  }
}