import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type ControleRun = {
  id: string;
  matchmaking_id: string;
  status: string | null;
  gestart_op: string | null;
  afgerond_op: string | null;
  run_type: string | null;
};

type TabKey = "in_de_maak" | "retour_ontvangen" | "ontvangen";

function getUserIdFromAuth(auth: any) {
  return String(
    auth?.user?.id ??
      auth?.session?.user?.id ??
      auth?.profile?.id ??
      auth?.id ??
      auth?.userId ??
      ""
  ).trim();
}

function s(v: unknown): string | null {
  const x = String(v ?? "").trim();
  return x || null;
}

function inferTab(row: any): TabKey {
  const stadium = String(row?.stadium ?? "").trim().toLowerCase();
  const bron = String(row?.bron_type ?? "").trim().toLowerCase();

  if (stadium === "retour_naar_eigenaar") {
    return "retour_ontvangen";
  }

  if (bron === "matchmaker_upload") {
    return "ontvangen";
  }

  return "in_de_maak";
}

export async function GET(req: Request) {
  try {
    const auth = await requireUserWithRole(req, [
      "matchmaker",
      "admin",
      "superadmin",
    ]);

    const userId = getUserIdFromAuth(auth);

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Geen geldige gebruiker gevonden." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, full_name, email, role, bondteam")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[matchmaker/controle-overzicht] profile error:", profileError);
      return NextResponse.json(
        { ok: false, error: profileError.message },
        { status: 500 }
      );
    }

    const role = String(profile?.role ?? "").trim().toLowerCase();
    if (role !== "matchmaker" && role !== "admin" && role !== "superadmin") {
      return NextResponse.json(
        { ok: false, error: "Gebruiker is geen matchmaker." },
        { status: 403 }
      );
    }

    const { data: matchmakings, error } = await supabaseAdmin
      .from("matchmakings")
      .select(
        `
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
      `
      )
      .eq("is_archived", false)
      .eq("huidige_eigenaar_type", "matchmaker")
      .eq("huidige_eigenaar_user_id", userId)
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[matchmaker/controle-overzicht] matchmakings error:", error);
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
      console.error("[matchmaker/controle-overzicht] controle_runs error:", runsError);
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

    const profileIds = Array.from(
      new Set(
        (matchmakings ?? [])
          .flatMap((r: any) => [r.last_updated_by, r.huidige_eigenaar_user_id])
          .map((v) => String(v ?? "").trim())
          .filter(Boolean)
      )
    );

    const profileNameMap = new Map<string, string>();

    if (profileIds.length) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("user_profiles")
        .select("id, full_name, email")
        .in("id", profileIds);

      if (profilesError) {
        console.error("[matchmaker/controle-overzicht] user_profiles error:", profilesError);
      } else {
        for (const p of profiles ?? []) {
          const id = String((p as any)?.id ?? "").trim();
          if (!id) continue;

          const label =
            String((p as any)?.full_name ?? "").trim() ||
            String((p as any)?.email ?? "").trim() ||
            id;

          profileNameMap.set(id, label);
        }
      }
    }

    const rows = (matchmakings ?? []).map((r: any) => {
      const ownerId = s(r.huidige_eigenaar_user_id);
      const lastUpdatedBy = s(r.last_updated_by);

      return {
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
        huidige_eigenaar_user_id: ownerId,
        huidige_eigenaar_user_name: ownerId ? profileNameMap.get(ownerId) ?? null : null,
        huidige_eigenaar_bondteam: r.huidige_eigenaar_bondteam ?? null,

        created_at: r.created_at ?? null,
        last_updated_at: r.last_updated_at ?? null,
        last_updated_by: lastUpdatedBy,
        last_updated_by_name: lastUpdatedBy
          ? profileNameMap.get(lastUpdatedBy) ?? null
          : null,

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

        tab: inferTab(r),
        laatste_run: latestRunMap.get(String(r.id)) ?? null,
      };
    });

    return NextResponse.json({
      ok: true,
      user_id: userId,
      full_name: profile?.full_name ?? null,
      role,
      rows,
    });
  } catch (e: any) {
    console.error("[matchmaker/controle-overzicht] unexpected:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Onverwachte fout" },
      { status: 500 }
    );
  }
}