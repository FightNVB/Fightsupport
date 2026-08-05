import { NextRequest } from "next/server";
import { assertCanAccessMatchmaking, requireUserWithRole, supabaseAdmin } from "@/app/api/_utils/authz";
import { privateJson, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: { params: Promise<{ matchmakingId: string }> }) {
  try {
    const { matchmakingId: rawId } = await context.params;
    const matchmakingId = String(rawId ?? "").trim();
    if (!matchmakingId) return privateJson({ error: "Matchmaking ontbreekt." }, 400);

    const auth = await requireUserWithRole(req, ["official", "hoofdofficial", "admin", "superadmin"]);
    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId: auth.userId, role: auth.role });

    const [bouts, results, matchmaking, upload, contextRows, runs] = await Promise.all([
      supabaseAdmin.from("uitslagen_bouts").select("*").eq("matchmaking_id", matchmakingId).order("partij_nr", { ascending: true }),
      supabaseAdmin.from("uitslagen_resultaten").select("*").eq("matchmaking_id", matchmakingId),
      supabaseAdmin.from("matchmakings").select("*").eq("id", matchmakingId).maybeSingle(),
      supabaseAdmin.from("matchmaking_uploads").select("*").eq("matchmaking_id", matchmakingId).maybeSingle(),
      supabaseAdmin.from("controle_bout_context").select("*").eq("matchmaking_id", matchmakingId).order("created_at", { ascending: false }),
      supabaseAdmin.from("uitslagen_runs").select("id,matchmaking_id,status,created_at").eq("matchmaking_id", matchmakingId).order("created_at", { ascending: false }),
    ]);
    const failed = [bouts, results, matchmaking, upload, contextRows, runs].find((result) => result.error);
    if (failed?.error) throw failed.error;
    if (!matchmaking.data && !upload.data) return privateJson({ error: "Matchmaking niet gevonden." }, 404);

    return privateJson({
      bouts: bouts.data ?? [],
      results: results.data ?? [],
      matchmaking: matchmaking.data ?? null,
      upload: upload.data ?? null,
      contextRows: contextRows.data ?? [],
      runs: runs.data ?? [],
      viewerBondteam: auth.bondteam ?? null,
    });
  } catch (error) {
    return secureError(error, "Uitslagen konden niet worden geladen.");
  }
}
