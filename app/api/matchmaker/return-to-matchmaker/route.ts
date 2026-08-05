import { NextRequest } from "next/server";
import { assertCanAccessMatchmaking, requireUserWithRole, supabaseAdmin } from "@/app/api/_utils/authz";
import {
  ensureLifecycleRecord,
  transferLifecycle,
  type MatchmakingOwnerType,
} from "@/app/api/_utils/matchmakingLifecycle";
import { privateJson, secureError } from "@/lib/api/secureRoute";
import { ALL_MATCHMAKING_STAGES, type MatchmakingStage } from "@/lib/matchmakingLifecycleConfig";

export const runtime = "nodejs";

const s = (value: unknown) => String(value ?? "").trim();

function normalizeStage(value: unknown): MatchmakingStage {
  const stage = s(value) as MatchmakingStage;
  return ALL_MATCHMAKING_STAGES.includes(stage) ? stage : "in_controle_admin";
}

function normalizeOwnerType(value: unknown): MatchmakingOwnerType {
  const ownerType = s(value);
  if (
    ownerType === "matchmaker" ||
    ownerType === "matchmaker_upload" ||
    ownerType === "admin" ||
    ownerType === "bondteam" ||
    ownerType === "archief"
  ) {
    return ownerType;
  }
  return "matchmaker";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmaking_id);
    const reason = s(body?.reason) || "Teruggestuurd naar matchmaker voor aanpassing.";
    if (!matchmakingId) return privateJson({ ok: false, error: "matchmaking_id ontbreekt." }, 400);

    const auth = await requireUserWithRole(req, ["matchmaker", "admin", "superadmin"]);
    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId: auth.userId, role: auth.role });

    const { data: mm, error: mmError } = await supabaseAdmin
      .from("matchmakings")
      .select("id,naam,datum,locatie,bondteam,matchmaker_id,bron_type,stadium,huidige_eigenaar_type,huidige_eigenaar_user_id,huidige_eigenaar_bondteam")
      .eq("id", matchmakingId)
      .maybeSingle();

    if (mmError) return privateJson({ ok: false, error: "Matchmaking kon niet worden geladen." }, 500);
    if (!mm) return privateJson({ ok: false, error: "Matchmaking niet gevonden." }, 404);

    const targetMatchmakerId = s((mm as any).matchmaker_id) ||
      ((mm as any).huidige_eigenaar_type === "matchmaker" ? s((mm as any).huidige_eigenaar_user_id) : "");
    if (!targetMatchmakerId) {
      return privateJson({ ok: false, error: "Geen matchmaker aan deze matchmaking gekoppeld." }, 409);
    }

    await ensureLifecycleRecord({
      matchmakingId,
      naam: (mm as any).naam ?? null,
      datum: (mm as any).datum ?? null,
      locatie: (mm as any).locatie ?? null,
      matchmakerId: targetMatchmakerId,
      bronType: (mm as any).bron_type ?? null,
      stage: normalizeStage((mm as any).stadium),
      ownerType: normalizeOwnerType((mm as any).huidige_eigenaar_type),
      ownerUserId: (mm as any).huidige_eigenaar_user_id ?? null,
      ownerBondteam: (mm as any).huidige_eigenaar_bondteam ?? (mm as any).bondteam ?? null,
      actorUserId: auth.userId,
      actorRole: auth.role,
      metadata: { route: "api/matchmaker/return-to-matchmaker", ensured: true },
    });

    const moved = await transferLifecycle({
      matchmakingId,
      newStage: "concept_matchmaking",
      newOwnerType: "matchmaker",
      newOwnerUserId: targetMatchmakerId,
      actorUserId: auth.userId,
      actorRole: auth.role,
      opmerking: reason,
      metadata: { route: "api/matchmaker/return-to-matchmaker", target_matchmaker_id: targetMatchmakerId },
    });

    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("matchmakings")
      .update({
        stadium: "concept_matchmaking",
        status: "retour_naar_matchmaker",
        huidige_eigenaar_type: "matchmaker",
        huidige_eigenaar_user_id: targetMatchmakerId,
        huidige_eigenaar_bondteam: null,
        returned_at: now,
        returned_by: auth.userId,
        return_reason: reason,
        last_updated_at: now,
        last_updated_by: auth.userId,
      })
      .eq("id", matchmakingId);

    if (updateError) return privateJson({ ok: false, error: "Matchmaking kon niet worden teruggezet." }, 500);

    if (reason) {
      const { error: resultError } = await supabaseAdmin.from("controle_resultaten").insert({
        matchmaking_id: matchmakingId,
        partij_nr: null,
        hoek: null,
        resultaat: "actie",
        rule: "return_to_matchmaker",
        rule_code: "RETURN_TO_MATCHMAKER",
        boodschap: reason,
        review_status: "definitief",
        actor_user_id: auth.userId,
        created_at: now,
      });
      if (resultError && !String(resultError.message ?? "").toLowerCase().includes("actor_user_id")) throw resultError;
    }

    return privateJson({
      ok: true,
      matchmaking_id: matchmakingId,
      matchmaker_id: targetMatchmakerId,
      lifecycle: moved,
      message: "Matchmaking is teruggestuurd naar matchmaker.",
    });
  } catch (error) {
    return secureError(error, "Matchmaking kon niet worden teruggestuurd.");
  }
}
