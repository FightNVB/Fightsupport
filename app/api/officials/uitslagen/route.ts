import { NextRequest } from "next/server";
import { requireUserWithRole, supabaseAdmin } from "@/app/api/_utils/authz";
import { privateJson, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUserWithRole(req, ["official", "hoofdofficial", "admin", "superadmin"]);
    const isUnscopedAdmin = auth.role === "admin" || auth.role === "superadmin";
    const bondteam = clean(auth.bondteam);
    if (!isUnscopedAdmin && !bondteam) return privateJson({ error: "Geen bondteam gekoppeld." }, 403);

    let matchmakingQuery = supabaseAdmin
      .from("matchmakings")
      .select("id,naam,datum,bondteam,huidige_eigenaar_bondteam,stadium,status");
    let uploadQuery = supabaseAdmin
      .from("matchmaking_uploads")
      .select("matchmaking_id,bondteam,evenement_naam,evenement_datum");
    if (!isUnscopedAdmin) {
      matchmakingQuery = matchmakingQuery.or(`bondteam.eq.${bondteam},huidige_eigenaar_bondteam.eq.${bondteam}`);
      uploadQuery = uploadQuery.eq("bondteam", bondteam);
    }

    const [matchmakings, uploads] = await Promise.all([matchmakingQuery, uploadQuery]);
    if (matchmakings.error || uploads.error) throw matchmakings.error ?? uploads.error;

    const matchmakingIds = [...new Set([
      ...(matchmakings.data ?? []).map((row: any) => clean(row.id)),
      ...(uploads.data ?? []).map((row: any) => clean(row.matchmaking_id)),
    ].filter(Boolean))];
    if (matchmakingIds.length === 0) {
      return privateJson({ runs: [], bouts: [], results: [], uploads: [], matchmakings: [], viewerBondteam: auth.bondteam });
    }

    const [runs, bouts, results] = await Promise.all([
      supabaseAdmin.from("uitslagen_runs").select("id,matchmaking_id,status").in("matchmaking_id", matchmakingIds),
      supabaseAdmin.from("uitslagen_bouts").select("uitslagen_run_id,matchmaking_id,partij_nr").in("matchmaking_id", matchmakingIds),
      supabaseAdmin.from("uitslagen_resultaten").select("uitslagen_run_id,matchmaking_id,uitslag_status").in("matchmaking_id", matchmakingIds),
    ]);
    if (runs.error || bouts.error || results.error) throw runs.error ?? bouts.error ?? results.error;

    return privateJson({
      runs: runs.data ?? [],
      bouts: bouts.data ?? [],
      results: results.data ?? [],
      uploads: uploads.data ?? [],
      matchmakings: matchmakings.data ?? [],
      viewerBondteam: auth.bondteam ?? null,
    });
  } catch (error) {
    return secureError(error, "Uitslagenoverzicht kon niet worden geladen.");
  }
}
