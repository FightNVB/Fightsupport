import { NextRequest } from "next/server";
import { assertCanAccessMatchmaking, requireUserWithRole, supabaseAdmin } from "@/app/api/_utils/authz";
import { privateJson, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const matchmakingId = String(req.nextUrl.searchParams.get("matchmaking_id") ?? "").trim();
    if (!matchmakingId) return privateJson({ error: "Matchmaking ontbreekt." }, 400);
    const auth = await requireUserWithRole(req, ["official", "hoofdofficial", "admin", "superadmin"]);
    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId: auth.userId, role: auth.role });

    const [bouts, results] = await Promise.all([
      supabaseAdmin.from("weigh_in_bouts").select("*").eq("matchmaking_id", matchmakingId).order("partij_nr", { ascending: true }),
      supabaseAdmin
        .from("controle_resultaten")
        .select("id,controle_run_id,run_id,bout_id,partij_nr,rule,rule_code,resultaat,original_resultaat,boodschap,hoek,review_status,actie_status,created_at")
        .eq("matchmaking_id", matchmakingId)
        .order("created_at", { ascending: false }),
    ]);
    if (bouts.error || results.error) throw bouts.error ?? results.error;
    return privateJson({ bouts: bouts.data ?? [], results: results.data ?? [] });
  } catch (error) {
    return secureError(error, "Weegstationgegevens konden niet worden geladen.");
  }
}
