// app/api/me/profile/route.ts
import { NextResponse } from "next/server";
import {
  requireUserFromAuthHeader,
  supabaseAdmin,
} from "@/lib/api/requireRole";

export const runtime = "nodejs";

function normalizeRole(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeBondteam(value: unknown): string {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "NULL" ? "" : normalized;
}

export async function GET(req: Request) {
  try {
    const { userId } = await requireUserFromAuthHeader(req);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("role,active_role,bondteam")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("GET /api/me/profile user_profiles error:", profileError);
      return NextResponse.json(
        { error: "Profiel kon niet worden geladen." },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Profiel niet gevonden." },
        { status: 404 }
      );
    }

    const { data: roleRows, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select(`
        role_id,
        roles (
          id,
          name
        )
      `)
      .eq("user_id", userId);

    if (rolesError) {
      console.error("GET /api/me/profile user_roles error:", rolesError);
      return NextResponse.json(
        { error: "Rollen konden niet worden geladen." },
        { status: 500 }
      );
    }

    const available_roles = Array.from(
      new Set(
        (roleRows ?? [])
          .map((row: any) => normalizeRole(row.roles?.name))
          .filter(Boolean)
      )
    );

    const default_role = normalizeRole((profile as any).role);
    const saved_active_role = normalizeRole((profile as any).active_role);

    const active_role =
      saved_active_role && available_roles.includes(saved_active_role)
        ? saved_active_role
        : available_roles.includes(default_role)
          ? default_role
          : available_roles[0] ?? default_role;

    return NextResponse.json({
      role: active_role,
      active_role,
      default_role,
      available_roles,
      bondteam: normalizeBondteam((profile as any).bondteam),
    });
  } catch (err) {
    if (err instanceof NextResponse) throw err;

    console.error("GET /api/me/profile error:", err);
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await requireUserFromAuthHeader(req);
    const body = await req.json().catch(() => ({}));

    const requestedRole = normalizeRole(body?.active_role ?? body?.role);

    if (!requestedRole) {
      return NextResponse.json(
        { error: "Geen rol opgegeven." },
        { status: 400 }
      );
    }

    const { data: roleRows, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select(`
        role_id,
        roles (
          id,
          name
        )
      `)
      .eq("user_id", userId);

    if (rolesError) {
      console.error("PATCH /api/me/profile user_roles error:", rolesError);
      return NextResponse.json(
        { error: "Rollen konden niet worden gecontroleerd." },
        { status: 500 }
      );
    }

    const available_roles = Array.from(
      new Set(
        (roleRows ?? [])
          .map((row: any) => normalizeRole(row.roles?.name))
          .filter(Boolean)
      )
    );

    if (!available_roles.includes(requestedRole)) {
      return NextResponse.json(
        { error: "Deze rol is niet gekoppeld aan deze gebruiker." },
        { status: 403 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({ active_role: requestedRole })
      .eq("id", userId);

    if (updateError) {
      console.error("PATCH /api/me/profile update error:", updateError);
      return NextResponse.json(
        { error: "Actieve rol kon niet worden opgeslagen." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      role: requestedRole,
      active_role: requestedRole,
      available_roles,
    });
  } catch (err) {
    if (err instanceof NextResponse) throw err;

    console.error("PATCH /api/me/profile error:", err);
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }
}