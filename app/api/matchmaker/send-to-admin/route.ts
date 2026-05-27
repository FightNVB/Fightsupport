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
          huidige_eigenaar_bondteam,
          matchmaker_id,
          bron_type,
          stadium,
          status,
          huidige_eigenaar_type,
          huidige_eigenaar_user_id,
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

    const ownerTypeFromDb = s((mm as any)?.huidige_eigenaar_type);
    const currentStage =
      s((mm as any)?.stadium) ||
      s((mm as any)?.status) ||
      "bij_matchmaker_in_bewerking";

    const currentOwnerType =
      ownerTypeFromDb ||
      (role === "matchmaker"
        ? "matchmaker"
        : role === "admin"
        ? "admin"
        : "bondteam");

    const currentOwnerUserId =
      currentOwnerType === "matchmaker" ||
      currentOwnerType === "matchmaker_upload"
        ? s((mm as any)?.huidige_eigenaar_user_id) ||
          s((mm as any)?.matchmaker_id) ||
          userId
        : null;

    const currentOwnerBondteam =
      currentOwnerType === "bondteam"
        ? s((mm as any)?.huidige_eigenaar_bondteam) ||
          s((mm as any)?.bondteam) ||
          null
        : null;

    const bronType =
      s((mm as any)?.bron_type) ||
      (currentOwnerType === "matchmaker_upload"
        ? "matchmaker_upload"
        : role === "matchmaker"
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
      matchmakerId: (mm as any)?.matchmaker_id ?? userId,
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
        route: "api/matchmaker/send-to-admin/route",
        ensured: true,
        action: "send_to_admin",
      },
    });

    const moved = await transferLifecycle({
      matchmakingId,
      newStage: "ingediend_admin",
      newOwnerType: "admin",
      actorUserId: userId,
      actorRole: role,
      opmerking: "Doorgestuurd naar admin.",
      metadata: {
        route: "api/matchmaker/send-to-admin/route",
        action: "send_to_admin",
        previous_owner_type: currentOwnerType,
        previous_owner_user_id: currentOwnerUserId,
        previous_owner_bondteam: currentOwnerBondteam,
      },
    });

    const { error: mmUpdateErr } = await supabaseAdmin
      .from("matchmakings")
      .update({
        stadium: "ingediend_admin",
        status: "ingediend_admin",

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

    if (mmUpdateErr) {
      return jsonError(
        "Bijwerken matchmakings naar admin mislukt.",
        500,
        mmUpdateErr
      );
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      lifecycle: moved,
      message:
        "Matchmaking is doorgestuurd naar admin en staat nu op ingediend_admin.",
    });
  } catch (err: any) {
    return jsonError(err?.message ?? "Onbekende fout.", 500);
  }
}