// app/api/admin/update-roles/route.ts
// Legacy endpoint. Eén hoofdrol wordt opgeslagen in user_profiles.role.
import { NextResponse } from "next/server";
import { supabaseAdmin, requireAdmin } from "@/app/api/_utils/authz";

export async function POST(req: Request) {
  await requireAdmin(req);

  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId ?? body.id ?? "").trim();
    const role = String(body.role ?? body.roles?.[0] ?? "").trim();

    if (!userId) throw new Error("Geen userId ontvangen");
    if (!role) throw new Error("Geen rol ontvangen");

    const { error } = await supabaseAdmin
      .from("user_profiles")
      .update({ role })
      .eq("id", userId);

    if (error) throw error;

    // Best-effort compatibiliteit: oude user_roles-koppeling leegmaken en eventueel vullen.
    try {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      const { data: roleRow } = await supabaseAdmin
        .from("roles")
        .select("id,name")
        .ilike("name", role)
        .maybeSingle();
      if (roleRow?.id) {
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role_id: roleRow.id });
      }
    } catch (_) {}

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
