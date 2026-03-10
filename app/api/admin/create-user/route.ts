import { requireAdmin } from "@/app/api/_utils/authz";
// app/api/admin/create-user/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  await requireAdmin(req);

  try {
    const body = await req.json();
    const { full_name, email, password, roles } = body;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // ✔ SERVER-SIDE ONLY
      { auth: { persistSession: false } }
    );

    // 1. Maak auth user
    const { data: authUser, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError || !authUser.user) {
      console.error(createError);
      return NextResponse.json(
        { error: "Fout bij aanmaken Supabase auth user" },
        { status: 400 }
      );
    }

    const userId = authUser.user.id;

    // 2. Geef naam mee
    await supabase.from("users").update({ full_name }).eq("id", userId);

    // 3. Rollen invoegen
    if (roles.length > 0) {
      const { data: rolesList } = await supabase
        .from("roles")
        .select("id, name");

      const roleInserts = roles
        .map((r: string) => {
          const roleRow = rolesList?.find((x) => x.name === r);
          return roleRow ? { user_id: userId, role_id: roleRow.id } : null;
        })
        .filter(Boolean);

      if (roleInserts.length) {
        await supabase.from("user_roles").insert(roleInserts as any);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("API ERROR:", e);
    return NextResponse.json(
      { error: "Onverwachte serverfout" },
      { status: 500 }
    );
  }
}
