import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  assertCanAccessMatchmaking,
  requireAnyRole,
} from "@/app/api/_utils/authz";
import {
  ensureLifecycleRecord,
  transferLifecycle,
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

function normalizeBondteam(v: unknown): string | null {
  const value = String(v ?? "").trim().toUpperCase();
  return value || null;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await requireAnyRole(req, [
      "admin",
      "matchmaker",
      "hoofdofficial",
      "official",
    ]);

    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmaking_id);

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
          huidige_eigenaar_type,
          huidige_eigenaar_user_id,
          huidige_eigenaar_bondteam,
          vorige_eigenaar_type,
          vorige_eigenaar_user_id,
          vorige_eigenaar_bondteam,
          matchmaker_id,
          bron_type,
          stadium
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

    const targetBondteam = normalizeBondteam((mm as any)?.bondteam);

    if (!targetBondteam) {
      return jsonError("bondteam ontbreekt op matchmakings.", 400, {
        matchmaking_id: matchmakingId,
      });
    }

    const currentStage = s((mm as any)?.stadium) || "ingediend_admin";

    const currentOwnerType =
      s((mm as any)?.huidige_eigenaar_type) || "admin";

    const currentOwnerUserId =
      currentOwnerType === "matchmaker"
        ? s((mm as any)?.huidige_eigenaar_user_id) || userId
        : null;

    const currentOwnerBondteam =
      normalizeBondteam((mm as any)?.huidige_eigenaar_bondteam) ||
      targetBondteam;

    const bronType =
      s((mm as any)?.bron_type) ||
      (role === "matchmaker"
        ? "matchmaker_app"
        : role === "admin"
        ? "admin_upload"
        : "official_upload");

    const now = new Date().toISOString();

    await ensureLifecycleRecord({
      matchmakingId,
      naam: (mm as any)?.naam ?? null,
      datum: (mm as any)?.datum ?? null,
      locatie: (mm as any)?.locatie ?? null,
      matchmakerId: (mm as any)?.matchmaker_id ?? null,
      bronType,
      stage: currentStage as any,
      ownerType: currentOwnerType as any,
      ownerUserId: currentOwnerUserId,
      ownerBondteam: currentOwnerBondteam,
      previousOwnerType: ((mm as any)?.vorige_eigenaar_type ?? null) as any,
      previousOwnerUserId: (mm as any)?.vorige_eigenaar_user_id ?? null,
      previousOwnerBondteam: (mm as any)?.vorige_eigenaar_bondteam ?? null,
      actorUserId: userId,
      actorRole: role,
      metadata: {
        route: "api/matchmaker/send-to-bond/route",
        ensured: true,
      },
    });

    const moved = await transferLifecycle({
      matchmakingId,
      newStage: "in_officials",
      newOwnerType: "bondteam",
      newOwnerBondteam: targetBondteam,
      actorUserId: userId,
      actorRole: role,
      opmerking: "Doorgestuurd naar bond/officials.",
      metadata: {
        route: "api/matchmaker/send-to-bond/route",
        target_bondteam: targetBondteam,
      },
    });

    const { error: mmUpdateErr } = await supabaseAdmin
      .from("matchmakings")
      .update({
        stadium: "in_officials",
        status: "in_officials",
        huidige_eigenaar_type: "bondteam",
        huidige_eigenaar_user_id: null,
        huidige_eigenaar_bondteam: targetBondteam,
        bondteam: targetBondteam,
        sent_to_officials_at: now,
        last_updated_at: now,
        last_updated_by: userId,
        sent_at: now,
        sent_by: userId,
      })
      .eq("id", matchmakingId);

    if (mmUpdateErr) {
      return jsonError(
        "Bijwerken matchmakings naar bond mislukt.",
        500,
        mmUpdateErr
      );
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      bondteam: targetBondteam,
      lifecycle: moved,
      message:
        `Matchmaking is doorgestuurd naar bond ${targetBondteam} en staat nu op in_officials.`,
    });
  } catch (err: any) {
    return jsonError(err?.message ?? "Onbekende fout.", 500);
  }
}