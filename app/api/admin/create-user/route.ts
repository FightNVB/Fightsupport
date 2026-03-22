// app/api/admin/create-user/route.ts
import { requireAdmin } from "@/app/api/_utils/authz";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function POST(req: Request) {
  await requireAdmin(req);

  try {
    const body = await req.json();
    const { full_name, email, roles } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "E-mailadres ontbreekt" },
        { status: 400 }
      );
    }

    if (!full_name || typeof full_name !== "string") {
      return NextResponse.json(
        { error: "Volledige naam ontbreekt" },
        { status: 400 }
      );
    }

    if (!Array.isArray(roles)) {
      return NextResponse.json(
        { error: "Rollen ontbreken of zijn ongeldig" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const baseUrl = getBaseUrl(req);
    const redirectTo = `${baseUrl}/login/set`;

    // 1) Nodig gebruiker uit per mail i.p.v. direct account met wachtwoord aanmaken
    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          full_name,
        },
      });

    if (inviteError || !inviteData?.user) {
      console.error("INVITE ERROR:", inviteError);
      return NextResponse.json(
        {
          error:
            inviteError?.message || "Fout bij uitnodigen van gebruiker per e-mail",
        },
        { status: 400 }
      );
    }

    const userId = inviteData.user.id;

    // 2) Naam opslaan / bijwerken in eigen users-tabel
    //    Upsert is hier veiliger dan alleen update, voor het geval er nog geen rij bestaat.
    const { error: userUpsertError } = await supabase
      .from("users")
      .upsert(
        {
          id: userId,
          full_name,
        },
        { onConflict: "id" }
      );

    if (userUpsertError) {
      console.error("USERS UPSERT ERROR:", userUpsertError);
      return NextResponse.json(
        { error: "Gebruiker uitgenodigd, maar profiel opslaan mislukte" },
        { status: 500 }
      );
    }

    // 3) Rollen invoegen
    if (roles.length > 0) {
      const { data: rolesList, error: rolesError } = await supabase
        .from("roles")
        .select("id, name");

      if (rolesError) {
        console.error("ROLES FETCH ERROR:", rolesError);
        return NextResponse.json(
          { error: "Gebruiker uitgenodigd, maar rollen ophalen mislukte" },
          { status: 500 }
        );
      }

      const roleInserts = roles
        .map((r: string) => {
          const roleRow = rolesList?.find((x) => x.name === r);
          return roleRow ? { user_id: userId, role_id: roleRow.id } : null;
        })
        .filter(Boolean) as Array<{ user_id: string; role_id: string }>;

      if (roleInserts.length) {
        // eerst bestaande user_roles voor zekerheid weg
        const { error: deleteRolesError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        if (deleteRolesError) {
          console.error("DELETE USER_ROLES ERROR:", deleteRolesError);
          return NextResponse.json(
            { error: "Gebruiker uitgenodigd, maar oude rollen verwijderen mislukte" },
            { status: 500 }
          );
        }

        const { error: insertRolesError } = await supabase
          .from("user_roles")
          .insert(roleInserts);

        if (insertRolesError) {
          console.error("INSERT USER_ROLES ERROR:", insertRolesError);
          return NextResponse.json(
            { error: "Gebruiker uitgenodigd, maar rollen koppelen mislukte" },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        invited: true,
        redirectTo,
        message:
          "Gebruiker is uitgenodigd per e-mail en kan via de link een wachtwoord instellen.",
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("API ERROR:", e);
    return NextResponse.json(
      { error: "Onverwachte serverfout" },
      { status: 500 }
    );
  }
}