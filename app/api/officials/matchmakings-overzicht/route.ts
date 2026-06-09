import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const ALLOWED_ROLES = new Set(["official", "hoofdofficial", "admin", "superadmin"]);

type ControleRun = {
  id: string;
  matchmaking_id: string;
  status: string | null;
  gestart_op: string | null;
  afgerond_op: string | null;
  run_type: string | null;
};

type UserProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  active_role?: string | null;
  default_role?: string | null;
  available_roles?: string[] | null;
  bondteam: string | null;
};

function normalizeRole(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

function getProfileRoles(profile: UserProfileRow | null): string[] {
  return [
    profile?.active_role,
    profile?.role,
    profile?.default_role,
    ...(Array.isArray(profile?.available_roles) ? profile.available_roles : []),
  ]
    .map(normalizeRole)
    .filter(Boolean);
}

function canOpenOfficialsOverview(profile: UserProfileRow | null): boolean {
  return getProfileRoles(profile).some((role) => ALLOWED_ROLES.has(role));
}

function getBearerToken(req: Request): string {
  const authHeader = req.headers.get("authorization") ?? "";
  return authHeader.replace(/^Bearer\s+/i, "").trim();
}

function escapePostgrestValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function inferTab(bronType: string | null | undefined): "uploaded" | "received" {
  const bron = String(bronType ?? "").trim().toLowerCase();

  if (bron === "official_upload" || bron === "official_app") {
    return "uploaded";
  }

  return "received";
}

export async function GET(req: Request) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Geen geldige sessie gevonden." },
        { status: 401 }
      );
    }

    const { data: authUser, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser?.user?.id) {
      console.error("[officials/matchmakings-overzicht] auth error:", authError);
      return NextResponse.json(
        { ok: false, error: "Sessie ongeldig of verlopen." },
        { status: 401 }
      );
    }

    const userId = authUser.user.id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name, email, role, active_role, default_role, available_roles, bondteam")
      .eq("id", userId)
      .maybeSingle<UserProfileRow>();

    if (profileError) {
      console.error("[officials/matchmakings-overzicht] profile error:", profileError);
      return NextResponse.json(
        { ok: false, error: profileError.message },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Geen profiel gevonden voor deze gebruiker." },
        { status: 404 }
      );
    }

    const profileRoles = getProfileRoles(profile);

    if (!canOpenOfficialsOverview(profile)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Geen toegang tot officials overzicht. Rollen gevonden: ${profileRoles.join(", ") || "-"}`,
        },
        { status: 403 }
      );
    }

    const bondteam = String(profile.bondteam ?? "").trim();

    if (!bondteam) {
      return NextResponse.json(
        {
          ok: false,
          error: "Geen bondteam gevonden op user_profiles voor deze gebruiker.",
        },
        { status: 400 }
      );
    }

    const escapedBondteam = escapePostgrestValue(bondteam);

    const { data: matchmakings, error } = await supabaseAdmin
      .from("matchmakings")
      .select(`
        id,
        naam,
        datum,
        locatie,
        promotor,
        bondteam,
        bron_type,
        stadium,
        status,
        final_status,
        huidige_eigenaar_type,
        huidige_eigenaar_user_id,
        huidige_eigenaar_bondteam,
        created_at,
        last_updated_at,
        last_updated_by,
        submitted_to_admin_at,
        entered_control_at,
        sent_to_officials_at,
        entered_weegstation_at,
        ready_for_results_at,
        results_finalized_at,
        is_actief,
        locked_for_editing,
        is_archived,
        matchmaker_id,
        hoofdofficial_id
      `)
      .or("is_archived.is.null,is_archived.eq.false")
      .in("huidige_eigenaar_type", ["bondteam", "official"])
      .or(`huidige_eigenaar_bondteam.eq."${escapedBondteam}",bondteam.eq."${escapedBondteam}"`)
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[officials/matchmakings-overzicht] matchmakings error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const matchmakingIds = (matchmakings ?? [])
      .map((r: any) => String(r.id ?? "").trim())
      .filter(Boolean);

    const { data: runs, error: runsError } = matchmakingIds.length
      ? await supabaseAdmin
          .from("controle_runs")
          .select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type")
          .in("matchmaking_id", matchmakingIds)
      : { data: [] as any[], error: null as any };

    if (runsError) {
      console.error("[officials/matchmakings-overzicht] controle_runs error:", runsError);
    }

    const latestRunMap = new Map<string, ControleRun>();

    for (const run of runs ?? []) {
      const mmId = String(run.matchmaking_id ?? "").trim();
      if (!mmId) continue;

      const existing = latestRunMap.get(mmId);
      const runTime = new Date(run.gestart_op ?? 0).getTime();
      const existingTime = new Date(existing?.gestart_op ?? 0).getTime();

      if (!existing || runTime > existingTime) {
        latestRunMap.set(mmId, {
          id: String(run.id),
          matchmaking_id: mmId,
          status: run.status ?? null,
          gestart_op: run.gestart_op ?? null,
          afgerond_op: run.afgerond_op ?? null,
          run_type: run.run_type ?? null,
        });
      }
    }

    const rows = (matchmakings ?? []).map((r: any) => ({
      id: String(r.id),
      naam: r.naam ?? null,
      datum: r.datum ?? null,
      locatie: r.locatie ?? null,
      promotor: r.promotor ?? null,
      bondteam: r.bondteam ?? null,

      bron_type: r.bron_type ?? null,
      stadium: r.stadium ?? null,
      status: r.status ?? null,
      final_status: r.final_status ?? null,

      huidige_eigenaar_type: r.huidige_eigenaar_type ?? null,
      huidige_eigenaar_user_id: r.huidige_eigenaar_user_id ?? null,
      huidige_eigenaar_bondteam: r.huidige_eigenaar_bondteam ?? null,

      created_at: r.created_at ?? null,
      last_updated_at: r.last_updated_at ?? null,
      last_updated_by: r.last_updated_by ?? null,

      submitted_to_admin_at: r.submitted_to_admin_at ?? null,
      entered_control_at: r.entered_control_at ?? null,
      sent_to_officials_at: r.sent_to_officials_at ?? null,
      entered_weegstation_at: r.entered_weegstation_at ?? null,
      ready_for_results_at: r.ready_for_results_at ?? null,
      results_finalized_at: r.results_finalized_at ?? null,

      is_actief: r.is_actief ?? true,
      locked_for_editing: r.locked_for_editing ?? false,
      is_archived: r.is_archived ?? false,

      matchmaker_id: r.matchmaker_id ?? null,
      hoofdofficial_id: r.hoofdofficial_id ?? null,

      tab: inferTab(r.bron_type),
      laatste_run: latestRunMap.get(String(r.id)) ?? null,
    }));

    return NextResponse.json({
      ok: true,
      bondteam,
      roles: profileRoles,
      rows,
    });
  } catch (e: any) {
    if (e instanceof Response) {
      const text = await e.text().catch(() => "");
      console.error("[officials/matchmakings-overzicht] response error:", e.status, text);
      return NextResponse.json(
        { ok: false, error: text || `Toegang geweigerd (${e.status})` },
        { status: e.status || 500 }
      );
    }

    console.error("[officials/matchmakings-overzicht] unexpected:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Onverwachte fout" },
      { status: 500 }
    );
  }
}
