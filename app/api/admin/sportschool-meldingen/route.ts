import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAnyRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function bad(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, extra }, { status });
}

function s(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeRole(value: unknown) {
  return s(value).toLowerCase();
}

function normalizeStatus(value: unknown) {
  const status = s(value).toLowerCase();
  if (["open", "in_behandeling", "afgehandeld", "afgewezen"].includes(status)) {
    return status;
  }
  return "open";
}

async function getUserRoleNames(userId: string): Promise<string[]> {
  const { data: userRoles, error: userRolesError } = await supabaseAdmin
    .from("user_roles")
    .select("role_id, role")
    .eq("user_id", userId);

  if (userRolesError) throw userRolesError;

  const directRoles = (userRoles ?? [])
    .map((r: any) => normalizeRole(r.role))
    .filter(Boolean);

  const roleIds = Array.from(
    new Set(
      (userRoles ?? [])
        .map((r: any) => r.role_id)
        .filter((id: any) => id !== null && id !== undefined),
    ),
  );

  let roleNamesFromIds: string[] = [];

  if (roleIds.length > 0) {
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("roles")
      .select("id, name")
      .in("id", roleIds);

    if (rolesError) throw rolesError;

    roleNamesFromIds = (roles ?? [])
      .map((r: any) => normalizeRole(r.name))
      .filter(Boolean);
  }

  return Array.from(new Set([...roleNamesFromIds, ...directRoles]));
}

async function requireAdmin(req: Request) {
  try {
    const auth = await requireAnyRole(req, ["admin", "superadmin"]);
    return {
      ok: true as const,
      user: { id: auth.userId },
      profile: auth.profile,
      roles: [auth.role],
    };
  } catch (error: any) {
    if (error instanceof Response) {
      return {
        ok: false as const,
        response: bad(error.status === 401 ? "Niet ingelogd" : "Geen toegang", error.status),
      };
    }
    return {
      ok: false as const,
      response: bad("Autorisatie mislukt", 500, error?.message),
    };
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const status = s(searchParams.get("status") || "open");
    const q = s(searchParams.get("q"));

    let query = supabaseAdmin
      .from("sportschool_vechter_meldingen")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(250);

    if (status !== "alles") query = query.eq("status", normalizeStatus(status));

    if (q) {
      const like = `%${q.replace(/[%_]/g, "")}%`;
      query = query.or(
        `naam.ilike.${like},va_nummer.ilike.${like},sportschool_naam.ilike.${like},melding.ilike.${like},type.ilike.${like}`,
      );
    }

    const { data, error } = await query;
    if (error) return bad("Meldingen laden mislukt", 500, error.message);

    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const id = s(body.id);
    const status = normalizeStatus(body.status);
    const adminOpmerking = s(body.admin_opmerking ?? body.adminOpmerking);

    if (!id) return bad("id ontbreekt");

    // Lees eerst de melding, zodat een admin-afwijzing van een door de trainer
    // toegevoegde vechter ook de tijdelijke fightcrew-koppeling kan terugdraaien.
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("sportschool_vechter_meldingen")
      .select("id,va_nummer,sportschool_id,raw")
      .eq("id", id)
      .maybeSingle();

    if (existingError) return bad("Melding laden mislukt", 500, existingError.message);
    if (!existing) return bad("Melding niet gevonden", 404);

    const patch: Record<string, any> = {
      status,
      admin_opmerking: adminOpmerking || null,
    };

    if (status === "afgehandeld" || status === "afgewezen") {
      patch.reviewed_by = auth.user.id;
      patch.reviewed_at = new Date().toISOString();
    } else {
      patch.reviewed_by = null;
      patch.reviewed_at = null;
    }

    const { data, error } = await supabaseAdmin
      .from("sportschool_vechter_meldingen")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return bad("Melding bijwerken mislukt", 500, error.message);

    const rawAction = s((existing as any)?.raw?.actie).toLowerCase();
    if (status === "afgewezen" && rawAction === "vechter_toegevoegd_uit_fightpassport") {
      const va = s((existing as any).va_nummer).replace(/\D/g, "");
      const schoolIdRaw = s((existing as any).sportschool_id);
      const schoolIdNumber = Number(schoolIdRaw);
      const schoolValue: string | number = Number.isFinite(schoolIdNumber) ? schoolIdNumber : schoolIdRaw;

      if (va && schoolIdRaw) {
        const { error: unlinkError } = await supabaseAdmin
          .from("fightpassport_school_fighters")
          .update({ actief: false, updated_at: new Date().toISOString() })
          .eq("sportschool_id", schoolValue)
          .eq("va_nummer", va);

        if (unlinkError) {
          console.error("[admin/sportschool-meldingen] afgewezen koppeling verwijderen mislukt", unlinkError);
          return bad("Melding is afgewezen, maar de vechter kon niet uit het sportschooloverzicht worden verwijderd", 500, unlinkError.message);
        }
      }
    }

    return NextResponse.json({ ok: true, item: data });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}
