import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { requireAdmin } from "@/app/api/_utils/authz";

export async function GET(req: Request) {
  await requireAdmin(req);

  try {
    // 1️⃣ USERS ophalen
    const { data: users, error: userErr } = await supabaseAdmin
      .from("users")
      .select("id, email, name")
      .order("email");

    if (userErr) throw userErr;

    // 2️⃣ ROLE koppelingen ophalen
    const { data: userRoles, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, roles(name)")
      .order("user_id");

    if (roleErr) throw roleErr;

    // 3️⃣ MERGEN (safe)
    const merged = users.map((u) => {
      const assigned = userRoles
        ?.filter((r) => r.user_id === u.id)
        // r.roles is een ARRAY → r.roles[0]?.name
        .map((r) => r.roles?.[0]?.name)
        .filter(Boolean) || [];

      return {
        ...u,
        roles: assigned,
      };
    });

    return NextResponse.json({ ok: true, users: merged });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
