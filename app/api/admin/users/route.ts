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

export async function GET(req: Request) {
  await requireAdmin(req);

  try {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id,email,full_name,role,bondteam,created_at")
      .order("email");

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ users: data ?? [] });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Server error", 500);
  }
}

export async function PATCH(req: Request) {
  await requireAdmin(req);

  try {
    const body = await req.json().catch(() => null);
    if (!body?.id) return jsonError("Missing id", 400);

    const patch: any = {};
    if ("role" in body) patch.role = body.role ?? null;
    if ("bondteam" in body) patch.bondteam = body.bondteam ?? null;
    if ("full_name" in body) patch.full_name = body.full_name ?? null;

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .update(patch)
      .eq("id", body.id)
      .select("id,email,full_name,role,bondteam,created_at")
      .single();

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ user: data });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Server error", 500);
  }
}

export async function POST(req: Request) {
  await requireAdmin(req);

  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const full_name = String(body?.full_name ?? "").trim();
    const role = String(body?.role ?? "").trim();
    const bondteam = body?.bondteam ? String(body.bondteam).trim() : null;

    if (!email) return jsonError("Email is verplicht", 400);
    if (!role) return jsonError("Role is verplicht", 400);

    const { data: invite, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (inviteErr) return jsonError(inviteErr.message, 500);

    const userId = invite?.user?.id;
    if (!userId) return jsonError("Kon geen user id krijgen", 500);

    const { data: up, error: upErr } = await supabaseAdmin
      .from("user_profiles")
      .upsert(
        {
          id: userId,
          email,
          full_name: full_name || null,
          role,
          bondteam,
        },
        { onConflict: "id" }
      )
      .select("id,email,full_name,role,bondteam,created_at")
      .single();

    if (upErr) return jsonError(upErr.message, 500);

    return NextResponse.json({ user: up, invited: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Server error", 500);
  }
}

export async function DELETE(req: Request) {
  await requireAdmin(req);

  try {
    const body = await req.json().catch(() => null);
    const id = String(body?.id ?? "").trim();
    if (!id) return jsonError("Missing id", 400);

    // 1) delete profile
    const { error: pErr } = await supabaseAdmin.from("user_profiles").delete().eq("id", id);
    if (pErr) return jsonError(pErr.message, 500);

    // 2) delete auth user
    const { error: aErr } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (aErr) return jsonError(aErr.message, 500);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Server error", 500);
  }
}