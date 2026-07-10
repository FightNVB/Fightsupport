import { NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

function clean(v: unknown) {
  const value = String(v ?? "").trim();
  return value.length ? value : null;
}

async function findAuthUserByEmail(email: string) {
  const wanted = email.trim().toLowerCase();
  let page = 1;

  while (page <= 100) {
    const result = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (result.error) throw result.error;

    const found = result.data.users.find(
      (user) => String(user.email ?? "").trim().toLowerCase() === wanted,
    );

    if (found) {
      const metadata = (found.user_metadata ?? {}) as Record<string, unknown>;
      return {
        id: found.id,
        email: String(found.email ?? email),
        name:
          String(metadata.full_name ?? metadata.name ?? "").trim() || null,
      };
    }

    if (result.data.users.length < 1000) break;
    page += 1;
  }

  return null;
}

async function findExistingUserByEmail(email: string) {
  const profile = await supabaseAdmin
    .from("user_profiles")
    .select("id, email, full_name, naam")
    .ilike("email", email)
    .maybeSingle();

  if (profile.error) throw profile.error;

  if ((profile.data as any)?.id) {
    return {
      id: String((profile.data as any).id),
      email: String((profile.data as any).email ?? email),
      name:
        String(
          (profile.data as any).full_name ??
            (profile.data as any).naam ??
            "",
        ).trim() || null,
    };
  }

  const ownUser = await supabaseAdmin
    .from("users")
    .select("id, email, full_name, naam")
    .ilike("email", email)
    .maybeSingle();

  if (ownUser.error) throw ownUser.error;

  if ((ownUser.data as any)?.id) {
    return {
      id: String((ownUser.data as any).id),
      email: String((ownUser.data as any).email ?? email),
      name:
        String(
          (ownUser.data as any).full_name ??
            (ownUser.data as any).naam ??
            "",
        ).trim() || null,
    };
  }

  return findAuthUserByEmail(email);
}

async function ensureTrainerRole(userId: string) {
  const role = await supabaseAdmin
    .from("roles")
    .select("id")
    .eq("name", "trainer")
    .maybeSingle();

  if (role.error) throw role.error;

  const roleId = (role.data as any)?.id;
  if (!roleId) return;

  const assignment = await supabaseAdmin
    .from("user_roles")
    .upsert(
      { user_id: userId, role_id: roleId },
      { onConflict: "user_id,role_id" },
    );

  if (assignment.error) throw assignment.error;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await requireAdmin(req);

  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const current = await supabaseAdmin
      .from("sportschool_contactpersonen")
      .select("id, user_id, naam, email")
      .eq("id", id)
      .maybeSingle();

    if (current.error) throw current.error;
    if (!current.data) {
      return NextResponse.json(
        { error: "Contactpersoon niet gevonden." },
        { status: 404 },
      );
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const key of ["naam", "rol", "actief"]) {
      if (key in body) patch[key] = body[key];
    }

    if ("email" in body) {
      const email = clean(body.email)?.toLowerCase();

      if (!email) {
        return NextResponse.json(
          { error: "Email is verplicht." },
          { status: 400 },
        );
      }

      const existingUser = await findExistingUserByEmail(email);

      if (!existingUser) {
        return NextResponse.json(
          {
            error:
              "Er bestaat nog geen gebruiker met dit e-mailadres. Maak de contactpersoon opnieuw aan om een uitnodiging te versturen.",
          },
          { status: 400 },
        );
      }

      patch.email = email;
      patch.user_id = existingUser.id;

      if (!clean(body.naam) && existingUser.name) {
        patch.naam = existingUser.name;
      }

      await ensureTrainerRole(existingUser.id);
    }

    const { data, error } = await supabaseAdmin
      .from("sportschool_contactpersonen")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ row: data });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await requireAdmin(req);

  try {
    const { id } = await ctx.params;

    const { error } = await supabaseAdmin
      .from("sportschool_contactpersonen")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 },
    );
  }
}
