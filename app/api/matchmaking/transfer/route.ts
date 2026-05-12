import { NextResponse } from "next/server";
import {
  assertCanAccessMatchmaking,
  getUserBondteam,
  requireUserWithRole,
} from "@/app/api/_utils/authz";
import { transferLifecycle } from "@/app/api/_utils/matchmakingLifecycle";
import {
  MatchmakingStage,
  canMoveMatchmakingStage,
  getOwnerTypeForStage,
  isKnownMatchmakingStage,
  stageAllowsResults,
  stageLocksLineup,
} from "@/lib/matchmakingLifecycleConfig";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function bad(error: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error, extra }, { status });
}

async function countOpenIssues(matchmakingId: string) {
  const { data, error } = await supabaseAdmin
    .from("controle_resultaten")
    .select("resultaat")
    .eq("matchmaking_id", matchmakingId);

  if (error) throw error;

  let actie = 0;
  let afkeur = 0;
  let dispensatie = 0;

  for (const row of data ?? []) {
    const r = String((row as any)?.resultaat ?? "").trim().toLowerCase();
    if (r === "actie") actie++;
    else if (r === "afkeur" || r === "afgekeurd") afkeur++;
    else if (r === "dispensatie") dispensatie++;
  }

  return { actie, afkeur, dispensatie };
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req);

    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmaking_id);
    const newStageRaw = s(body?.new_stage);
    const opmerking = s(body?.opmerking) || null;

    if (!matchmakingId || !newStageRaw) {
      return bad("matchmaking_id en new_stage zijn verplicht.");
    }

    if (!isKnownMatchmakingStage(newStageRaw)) {
      return bad("new_stage is ongeldig.");
    }

    const newStage = newStageRaw as MatchmakingStage;

    await assertCanAccessMatchmaking({
      matchmaking_id: matchmakingId,
      userId,
      role,
    });

    const { data: current, error: currentErr } = await supabaseAdmin
      .from("matchmakings")
      .select("*")
      .eq("id", matchmakingId)
      .single();

    if (currentErr || !current) {
      return bad(currentErr?.message || "Matchmaking niet gevonden.", 404);
    }

    const currentStageRaw = s(current.stadium || current.status);
    if (!isKnownMatchmakingStage(currentStageRaw)) {
      return bad("Huidig stadium is ongeldig of ontbreekt.");
    }

    const currentStage = currentStageRaw as MatchmakingStage;

    if (!canMoveMatchmakingStage(currentStage, newStage)) {
      return bad(`Niet toegestaan: ${currentStage} → ${newStage}`, 403);
    }

    if (newStage === "in_officials") {
      const counts = await countOpenIssues(matchmakingId);
      if (counts.actie > 0 || counts.afkeur > 0 || counts.dispensatie > 0) {
        return bad(
          "Kan niet naar officials: open actie-, afkeur- of dispensatiepunten moeten eerst opgelost zijn.",
          400,
          counts
        );
      }
    }

    if (stageLocksLineup(currentStage)) {
      const blockedBackStages: MatchmakingStage[] = [
        "nieuw",
        "bouwen_matchmaking",
        "concept_matchmaking",
        "ingediend_admin",
        "in_controle_admin",
        "review",
      ];

      if (blockedBackStages.includes(newStage)) {
        return bad(
          "Lineup is al definitief en kan niet meer terug naar bewerkbare fases.",
          400
        );
      }
    }

    if (stageAllowsResults(currentStage)) {
      const blockedStages: MatchmakingStage[] = [
        "nieuw",
        "bouwen_matchmaking",
        "concept_matchmaking",
        "review",
        "in_officials",
        "in_weegstation",
        "weegstation_verwerkt",
      ];

      if (blockedStages.includes(newStage)) {
        return bad(
          "Deze matchmaking zit al in uitslagenfase en kan niet meer terug naar eerdere fases.",
          400
        );
      }
    }

    const resolvedOwnerType = getOwnerTypeForStage(newStage);

    let newOwnerUserId: string | null = null;
    let newOwnerBondteam: string | null = null;

    if (resolvedOwnerType === "matchmaker") {
      newOwnerUserId =
        s(current.maker_user_id || current.matchmaker_id || body?.new_owner_user_id || userId) ||
        null;
    }

    if (resolvedOwnerType === "admin") {
      newOwnerUserId = userId;
    }

    if (resolvedOwnerType === "bondteam") {
      newOwnerBondteam =
        s(current.bondteam) ||
        s(body?.new_owner_bondteam) ||
        (await getUserBondteam(userId)) ||
        null;

      if (!newOwnerBondteam) {
        return bad(
          "Geen bondteam gevonden voor deze overgang. Zet bondteam op de matchmaking.",
          400
        );
      }
    }

    const row = await transferLifecycle({
      matchmakingId,
      newStage,
      newOwnerType: resolvedOwnerType,
      newOwnerUserId,
      newOwnerBondteam,
      actorUserId: userId,
      actorRole: role,
      opmerking,
      metadata: { route: "api/matchmaking/transfer" },
    });

    return NextResponse.json({
      ok: true,
      matchmaking: row,
      message: `Matchmaking verplaatst van ${currentStage} naar ${newStage}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Onbekende fout." },
      { status: 500 }
    );
  }
}
