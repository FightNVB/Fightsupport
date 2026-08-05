import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";
import { ensureLifecycleRecord, transferLifecycle } from "@/app/api/_utils/matchmakingLifecycle";
import { privateJson, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const text = (value: unknown) => String(value ?? "").trim();

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req, [
      "official",
      "hoofdofficial",
      "admin",
      "superadmin",
    ]);
    const body = await req.json().catch(() => ({}));
    const matchmakingId = text(body?.matchmaking_id);
    if (!matchmakingId) return privateJson({ ok: false, error: "matchmaking_id ontbreekt." }, 400);

    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });

    const { data: matchmaking, error: readError } = await supabaseAdmin
      .from("matchmakings")
      .select("id,naam,datum,locatie,bondteam,matchmaker_id,bron_type,stadium,status,huidige_eigenaar_type,huidige_eigenaar_user_id,huidige_eigenaar_bondteam,vorige_eigenaar_type,vorige_eigenaar_user_id,vorige_eigenaar_bondteam")
      .eq("id", matchmakingId)
      .maybeSingle();

    if (readError) return privateJson({ ok: false, error: "Matchmaking kon niet worden opgehaald." }, 500);
    if (!matchmaking) return privateJson({ ok: false, error: "Matchmaking niet gevonden." }, 404);

    const currentOwnerType = text(matchmaking.huidige_eigenaar_type) || "bondteam";
    const currentOwnerUserId = currentOwnerType === "matchmaker"
      ? text(matchmaking.huidige_eigenaar_user_id) || text(matchmaking.matchmaker_id) || null
      : null;
    const currentOwnerBondteam = currentOwnerType === "bondteam"
      ? text(matchmaking.huidige_eigenaar_bondteam) || text(matchmaking.bondteam) || null
      : null;
    const stage = text(matchmaking.stadium) || text(matchmaking.status) || "bij_bond_in_controle";
    const bronType = text(matchmaking.bron_type) || "official_upload";

    await ensureLifecycleRecord({
      matchmakingId,
      naam: matchmaking.naam ?? null,
      datum: matchmaking.datum ?? null,
      locatie: matchmaking.locatie ?? null,
      matchmakerId: matchmaking.matchmaker_id ?? null,
      bronType,
      stage: stage as any,
      ownerType: currentOwnerType as any,
      ownerUserId: currentOwnerUserId,
      ownerBondteam: currentOwnerBondteam,
      previousOwnerType: (matchmaking.vorige_eigenaar_type ?? null) as any,
      previousOwnerUserId: matchmaking.vorige_eigenaar_user_id ?? null,
      previousOwnerBondteam: matchmaking.vorige_eigenaar_bondteam ?? null,
      actorUserId: userId,
      actorRole: role,
      metadata: { route: "api/officials/send-to-admin", action: "send_to_admin" },
    });

    const lifecycle = await transferLifecycle({
      matchmakingId,
      newStage: "ingediend_admin",
      newOwnerType: "admin",
      actorUserId: userId,
      actorRole: role,
      opmerking: "Official heeft de matchmaking doorgestuurd naar admin.",
      metadata: {
        route: "api/officials/send-to-admin",
        action: "send_to_admin",
        previous_owner_type: currentOwnerType,
        previous_owner_user_id: currentOwnerUserId,
        previous_owner_bondteam: currentOwnerBondteam,
      },
    });

    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("matchmakings")
      .update({
        stadium: "ingediend_admin",
        status: "ingediend_admin",
        final_status: "ingediend_admin",
        vorige_eigenaar_type: currentOwnerType,
        vorige_eigenaar_user_id: currentOwnerUserId,
        vorige_eigenaar_bondteam: currentOwnerBondteam,
        huidige_eigenaar_type: "admin",
        huidige_eigenaar_user_id: null,
        huidige_eigenaar_bondteam: null,
        submitted_to_admin_at: now,
        last_updated_at: now,
        last_updated_by: userId,
        sent_at: now,
        sent_by: userId,
      })
      .eq("id", matchmakingId);

    if (updateError) return privateJson({ ok: false, error: "Matchmaking kon niet worden bijgewerkt." }, 500);

    return privateJson({
      ok: true,
      matchmaking_id: matchmakingId,
      lifecycle,
      message: "Matchmaking is doorgestuurd naar admin en staat nu op ingediend_admin.",
    });
  } catch (error) {
    return secureError(error);
  }
}
