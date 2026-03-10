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

export async function POST(
  req: Request,
  ctx: { params: { id: string } }
) {
  await requireAdmin(req);

  try {
    const { id } = ctx.params;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "").trim().toLowerCase(); // approve|reject

    const { data: row, error } = await supabaseAdmin
      .from("account_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !row) return jsonError("Request niet gevonden", 404);

    if (action === "reject") {
      const { error: delErr } = await supabaseAdmin
        .from("account_requests")
        .delete()
        .eq("id", id);

      if (delErr) return jsonError(delErr.message, 500);
      return NextResponse.json({ ok: true });
    }

    if (action !== "approve") return jsonError("action moet approve/reject zijn", 400);

    const email = String(row.email ?? "").trim().toLowerCase();
    const full_name = String(row.name ?? "").trim();
    const requested_role = String(row.requested_role ?? "").trim();
    const bondteam = row.team ? String(row.team).trim() : null;
    const notes = row.notes ? String(row.notes).trim() : null;

    if (!email) return jsonError("Email ontbreekt", 400);

    // Invite
    const { data: invite, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (inviteErr) return jsonError(inviteErr.message, 500);

    const userId = invite?.user?.id;
    if (!userId) return jsonError("Kon geen user id krijgen", 500);

    // Profile aanmaken/upserten
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

    // Request verwijderen
    const { error: delErr } = await supabaseAdmin
      .from("account_requests")
      .delete()
      .eq("id", id);

    if (delErr) return jsonError(delErr.message, 500);

    return NextResponse.json({ ok: true, invited: true, user_id: userId });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Server error", 500);
  }
}