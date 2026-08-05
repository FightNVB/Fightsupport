import { NextRequest } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/app/api/_utils/authz";
import { privateJson, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  try {
    const { searchParams } = new URL(req.url);

    const q = String(searchParams.get("q") ?? "").trim();
    const bondteam = String(searchParams.get("bondteam") ?? "").trim();
    const matchmaking_id = String(searchParams.get("matchmaking_id") ?? "").trim();
    const saved_by = String(searchParams.get("saved_by") ?? "").trim();

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? 50), 1),
      200
    );

    let query = supabaseAdmin
      .from("admin_beheer_matchmaking_snapshots")
      .select(
        `
          id,
          created_at,
          updated_at,
          matchmaking_id,
          upload_id,
          saved_by_user_id,
          saved_by_email,
          saved_by_name,
          evenement_naam,
          evenement_datum,
          locatie,
          matchmaker,
          promotor,
          bondteam,
          official_release,
          official_released_at,
          controle_run_id,
          controle_status,
          controle_gestart_op,
          controle_afgerond_op,
          controle_run_type,
          totaal_partijen,
          notitie
        `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (bondteam) {
      query = query.ilike("bondteam", `%${bondteam}%`);
    }

    if (matchmaking_id) {
      query = query.eq("matchmaking_id", matchmaking_id);
    }

    if (saved_by) {
      query = query.or(
        `saved_by_email.ilike.%${saved_by}%,saved_by_name.ilike.%${saved_by}%`
      );
    }

    if (q) {
      query = query.or(
        [
          `evenement_naam.ilike.%${q}%`,
          `locatie.ilike.%${q}%`,
          `bondteam.ilike.%${q}%`,
          `matchmaker.ilike.%${q}%`,
          `promotor.ilike.%${q}%`,
          `saved_by_email.ilike.%${q}%`,
          `saved_by_name.ilike.%${q}%`,
          `matchmaking_id.ilike.%${q}%`,
        ].join(",")
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("snapshots list error:", error);
      return privateJson(
        { error: "Kon snapshots niet laden." },
        500
      );
    }

    return privateJson({
      ok: true,
      items: Array.isArray(data) ? data : [],
    });
  } catch (error: any) {
    return secureError(error, "Kon snapshots niet laden.");
  }
}
