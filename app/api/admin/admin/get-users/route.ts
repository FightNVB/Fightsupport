// app/api/admin/get-users/route.ts
// Legacy endpoint. Leest nu uit user_profiles, niet meer uit public.users.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/api/_utils/authz";
import { requireAdmin } from "@/app/api/_utils/authz";

export async function GET(req: Request) {
  await requireAdmin(req);

  try {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id,email,full_name,role,bondteam,created_at")
      .order("email", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      users: (data ?? []).map((u: any) => ({
        ...u,
        name: u.full_name,
        roles: u.role ? [u.role] : [],
      })),
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
