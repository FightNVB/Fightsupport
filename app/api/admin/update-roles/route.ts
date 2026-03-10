import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { requireAdmin } from "@/app/api/_utils/authz";

export async function POST(req: Request) {
  await requireAdmin(req);

  try {
    const body = await req.json();

    const userId = body.userId;
    const roles = Array.isArray(body.roles) ? body.roles : [];

    if (!userId) throw new Error("Geen userId ontvangen");

    // 1️⃣ Oude rollen verwijderen
    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (delErr) throw delErr;

    // 2️⃣ Nieuwe rollen invoeren
    if (roles.length > 0) {
      const inserts = roles.map((roleId: number) => ({
        user_id: userId,
        role_id: roleId
      }));

      const { error: insErr } = await supabaseAdmin
        .from("user_roles")
        .insert(inserts);

      if (insErr) throw insErr;
    }

    return NextResponse.json({ ok: true });

  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
