import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  assertCanAccessMatchmaking,
  requireAnyRole,
} from "@/app/api/_utils/authz";
import {
  ensureLifecycleRecord,
  transferLifecycle,
  type MatchmakingOwnerType,
} from "@/app/api/_utils/matchmakingLifecycle";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function jsonError(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, extra }, { status });
}

function normalizeOwnerType(v: unknown): MatchmakingOwnerType | null {
  const x = String(v ?? "").trim();
  if (x === "matchmaker" || x === "admin" || x === "bondteam" || x === "archief") {
    return x;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await requireAnyRole(req, [
      "superadmin",
      "admin",
      "hoofdofficial",
      "official",
      "matchmaker",
    ]);

    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmaking_id);
    const reason =
      s(body?.reason) || "Teruggestuurd naar eigenaar voor verdere behandeling.";

    if (!matchmakingId) {
      return jsonError("matchmaking_id ontbreekt.");
    }

    await assertCanAccessMatchmaking({
      matchmaking_id: matchmakingId,
      userId,
      role,
    });

    const { data: mm, error: mmError } = await supabaseAdmin
      .from("matchmakings")
      .select(
        `
          id,
          naam,
          datum,
          locatie,
          bondteam,
          bron_type,
          matchmaker_id,
          stadium,
          huidige_eigenaar_type,
          huidige_eigenaar_user_id,
          huidige_eigenaar_bondteam,
          vorige_eigenaar_type,
          vorige_eigenaar_user_id,
          vorige_eigenaar_bondteam
        `
      )
      .eq("id", matchmakingId)
      .maybeSingle();

    if (mmError) {
      return jsonError("Ophalen matchmaking mislukt.", 500, mmError);
    }

    if (!mm) {
      return jsonError("Matchmaking niet gevonden.", 404);
    }

    const previousOwnerType = normalizeOwnerType((mm as any)?.vorige_eigenaar_type);
    const previousOwnerUserId = s((mm as any)?.vorige_eigenaar_user_id);
    const previousOwnerBondteam = s((mm as any)?.vorige_eigenaar_bondteam);

    if (!previousOwnerType) {
      return jsonError(
        "Geen vorige eigenaar gevonden; return-to-owner is niet mogelijk.",
        400,
        {
          matchmaking_id: matchmakingId,
          vorige_eigenaar_type: (mm as any)?.vorige_eigenaar_type ?? null,
        }
      );
    }

    if (previousOwnerType === "matchmaker" && !previousOwnerUserId) {
      const fallbackMatchmakerId = s((mm as any)?.matchmaker_id);
      if (!fallbackMatchmakerId) {
        return jsonError(
          "Vorige eigenaar is matchmaker, maar geen matchmaker_id gevonden.",
          400,
          { matchmaking_id: matchmakingId }
        );
      }
    }

    if (previousOwnerType === "bondteam" && !previousOwnerBondteam && !(mm as any)?.bondteam) {
      return jsonError(
        "Vorige eigenaar is bondteam, maar geen bondteam gevonden.",
        400,
        { matchmaking_id: matchmakingId }
      );
    }

    const targetOwnerType = previousOwnerType;
    const targetOwnerUserId =
      targetOwnerType === "matchmaker"
        ? previousOwnerUserId || s((mm as any)?.matchmaker_id)
        : null;
    const targetOwnerBondteam =
      targetOwnerType === "bondteam"
        ? previousOwnerBondteam || s((mm as any)?.bondteam)
        : null;

    await ensureLifecycleRecord({
      matchmakingId,
      naam: (mm as any)?.naam ?? null,
      datum: (mm as any)?.datum ?? null,
      locatie: (mm as any)?.locatie ?? null,
      matchmakerId: (mm as any)?.matchmaker_id ?? null,
      bronType: (mm as any)?.bron_type ?? null,
      stage:
        ((mm as any)?.stadium && String((mm as any).stadium).trim()) ||
        "in_controle_admin",
      ownerType: normalizeOwnerType((mm as any)?.huidige_eigenaar_type) ?? "admin",
      ownerUserId:
        (mm as any)?.huidige_eigenaar_type === "matchmaker"
          ? (mm as any)?.huidige_eigenaar_user_id
          : null,
      ownerBondteam:
        (mm as any)?.huidige_eigenaar_type === "bondteam"
          ? (mm as any)?.huidige_eigenaar_bondteam
          : null,
      previousOwnerType,
      previousOwnerUserId,
      previousOwnerBondteam,
      actorUserId: userId,
      actorRole: role,
      metadata: {
        route: "api/matchmaker/return-to-owner/route",
        ensured: true,
      },
    });

    const moved = await transferLifecycle({
      matchmakingId,
      newStage: "bij_eigenaar",
      newOwnerType: targetOwnerType,
      newOwnerUserId: targetOwnerUserId,
      newOwnerBondteam: targetOwnerBondteam,
      actorUserId: userId,
      actorRole: role,
      opmerking: reason,
      metadata: {
        route: "api/matchmaker/return-to-owner/route",
        previous_owner_type: previousOwnerType,
        previous_owner_user_id: previousOwnerUserId,
        previous_owner_bondteam: previousOwnerBondteam,
      },
    });

    const nowIso = new Date().toISOString();

    const patch: Record<string, any> = {
      stadium: "bij_eigenaar",
      status: "bij_eigenaar",
      huidige_eigenaar_type: targetOwnerType,
      huidige_eigenaar_user_id:
        targetOwnerType === "matchmaker" ? targetOwnerUserId : null,
      huidige_eigenaar_bondteam:
        targetOwnerType === "bondteam" ? targetOwnerBondteam : null,
      returned_at: nowIso,
      returned_by: userId,
      return_reason: reason,
      last_updated_at: nowIso,
      last_updated_by: userId,
    };

    const { error: mmUpdateErr } = await supabaseAdmin
      .from("matchmakings")
      .update(patch)
      .eq("id", matchmakingId);

    if (mmUpdateErr) {
      return jsonError(
        "Bijwerken matchmakings voor return-to-owner mislukt.",
        500,
        mmUpdateErr
      );
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      owner_type: targetOwnerType,
      owner_user_id: targetOwnerUserId,
      owner_bondteam: targetOwnerBondteam,
      lifecycle: moved,
      message: "Matchmaking is teruggestuurd naar de eigenaar en staat nu op bij_eigenaar.",
    });
  } catch (err: any) {
    return jsonError(err?.message ?? "Onbekende fout.", 500);
  }
}