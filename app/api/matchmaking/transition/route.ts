// app/api/matchmakings/transition/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAnyRole } from "@/app/api/_utils/authz";
import { transferLifecycle } from "@/app/api/_utils/matchmakingLifecycle";
import {
  MatchmakingStage,
  canMoveMatchmakingStage,
  isKnownMatchmakingStage,
  stageAllowsResults,
  stageLocksLineup,
} from "@/lib/matchmakingLifecycleConfig";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type Payload = {
  matchmaking_id: string;
  next_stage: MatchmakingStage;
  opmerking?: string | null;
};

function bad(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, extra }, { status });
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

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAnyRole(req, [
      "superadmin",
      "admin",
      "matchmaker",
      "official",
      "hoofdofficial",
    ]);

    const userId = auth.userId;
    const role = auth.role;

    const body = (await req.json().catch(() => ({}))) as Partial<Payload>;

    const matchmaking_id = String(body?.matchmaking_id ?? "").trim();
    const next_stage_raw = String(body?.next_stage ?? "").trim();

    if (!matchmaking_id) return bad("matchmaking_id ontbreekt.");
    if (!isKnownMatchmakingStage(next_stage_raw))
      return bad("next_stage ongeldig.");

    const next_stage = next_stage_raw as MatchmakingStage;

    const { data: current, error: currentErr } = await supabaseAdmin
      .from("matchmakings")
      .select("*")
      .eq("id", matchmaking_id)
      .single();

    if (currentErr) return bad(currentErr.message, 500);

    const currentStage = String(
      current?.stadium ?? ""
    ).trim() as MatchmakingStage;

    if (!isKnownMatchmakingStage(currentStage)) {
      return bad("Huidig stadium ongeldig.");
    }

    // 🔑 NIEUWE TRANSITION CHECK
    if (!canMoveMatchmakingStage(currentStage, next_stage)) {
      return bad(
        `Niet toegestaan: ${currentStage} → ${next_stage}`,
        403
      );
    }

    // 🔒 NIET naar officials als er nog issues zijn
    if (next_stage === "in_officials") {
      const counts = await countOpenIssues(matchmaking_id);
      if (counts.actie > 0 || counts.afkeur > 0 || counts.dispensatie > 0) {
        return bad(
          "Kan niet naar officials: open actie-, afkeur- of dispensatiepunten.",
          400,
          counts
        );
      }
    }

    // 🔒 LINEUP LOCK
    if (stageLocksLineup(currentStage)) {
      const blockedBackStages: MatchmakingStage[] = [
        "bouwen_matchmaking",
        "concept_matchmaking",
        "ingediend_admin",
        "in_controle_admin",
        "review",
      ];

      if (blockedBackStages.includes(next_stage)) {
        return bad(
          "Lineup is definitief en kan niet meer terug naar bewerkbare fases.",
          400
        );
      }
    }

    // 🔒 UITSLAGEN LOCK
    if (stageAllowsResults(currentStage)) {
      const blockedStages: MatchmakingStage[] = [
        "bouwen_matchmaking",
        "concept_matchmaking",
        "review",
        "in_weegstation",
        "weegstation_verwerkt",
      ];

      if (blockedStages.includes(next_stage)) {
        return bad(
          "Matchmaking zit in uitslagenfase en kan niet meer terug.",
          400
        );
      }
    }

    const moved = await transferLifecycle({
      matchmakingId: matchmaking_id,
      newStage: next_stage,
      actorUserId: userId,
      actorRole: role,
      newOwnerBondteam: current?.bondteam ?? null,
      opmerking: body?.opmerking ?? null,
      metadata: {
        route: "transition",
      },
    });

    return NextResponse.json({
      ok: true,
      matchmaking: moved,
      message: `Van ${currentStage} → ${next_stage}`,
    });
  } catch (e: any) {
    console.error("[transition]", e);
    return bad(e?.message ?? "Onbekende fout.", 500);
  }
}