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
      "superadmin",
      "admin",
      "hoofdofficial",
      "official",
    ]);

    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmaking_id);
    const reason =
      s(body?.reason) || "Teruggestuurd naar matchmaker voor aanpassing.";

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
          matchmaker_id,
          bron_type,
          stadium,
          huidige_eigenaar_type,
          huidige_eigenaar_user_id,
          huidige_eigenaar_bondteam
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

    const targetMatchmakerId = s((mm as any)?.matchmaker_id);

    if (!targetMatchmakerId) {
      return jsonError(
        "Geen matchmaker_id gevonden; kan niet terugsturen naar matchmaker.",
        400,
        { matchmaking_id: matchmakingId }
      );
    }

    const nowIso = new Date().toISOString();

    await ensureLifecycleRecord({
      matchmakingId,
      naam: (mm as any)?.naam ?? null,
      datum: (mm as any)?.datum ?? null,
      locatie: (mm as any)?.locatie ?? null,
      matchmakerId: (mm as any)?.matchmaker_id ?? null,
      bronType:
        (mm as any)?.bron_type ??
        (role === "admin" || role === "superadmin"
          ? "admin_upload"
          : "official_upload"),
      stage:
        (mm as any)?.stadium && String((mm as any).stadium).trim()
          ? (String((mm as any).stadium) as import("@/app/api/_utils/matchmakingLifecycle").MatchmakingStage)
          : "in_controle_admin",
      ownerType:
        (mm as any)?.huidige_eigenaar_type &&
        String((mm as any).huidige_eigenaar_type).trim()
          ? (String((mm as any).huidige_eigenaar_type) as import("@/app/api/_utils/matchmakingLifecycle").MatchmakingOwnerType)
          : "admin",
      ownerUserId:
        (mm as any)?.huidige_eigenaar_type === "matchmaker"
          ? (mm as any)?.huidige_eigenaar_user_id
          : null,
      ownerBondteam:
        (mm as any)?.huidige_eigenaar_bondteam ??
        (mm as any)?.bondteam ??
        null,
      actorUserId: userId,
      actorRole: role,
      metadata: {
        route: "api/matchmaker/return-to-matchmaker/route",
        ensured: true,
      },
    });

    const moved = await transferLifecycle({
      matchmakingId,
      newStage: "retour_naar_eigenaar",
      newOwnerType: "matchmaker",
      newOwnerUserId: targetMatchmakerId,
      actorUserId: userId,
      actorRole: role,
      opmerking: reason,
      metadata: {
        route: "api/matchmaker/return-to-matchmaker/route",
        target_matchmaker_id: targetMatchmakerId,
      },
    });

    const { error: mmUpdateErr } = await supabaseAdmin
      .from("matchmakings")
      .update({
        stadium: "retour_naar_eigenaar",
        status: "retour_naar_eigenaar",
        huidige_eigenaar_type: "matchmaker",
        huidige_eigenaar_user_id: targetMatchmakerId,
        huidige_eigenaar_bondteam: null,
        returned_at: nowIso,
        returned_by: userId,
        return_reason: reason,
        last_updated_at: nowIso,
        last_updated_by: userId,
      })
      .eq("id", matchmakingId);

    if (mmUpdateErr) {
      return jsonError(
        "Bijwerken matchmakings voor retour naar matchmaker mislukt.",
        500,
        mmUpdateErr
      );
    }

    if (reason) {
      const { error: resultErr } = await supabaseAdmin
        .from("controle_resultaten")
        .insert({
          matchmaking_id: matchmakingId,
          partij_nr: null,
          hoek: null,
          resultaat: "actie",
          rule: "return_to_matchmaker",
          rule_code: "RETURN_TO_MATCHMAKER",
          boodschap: reason,
          review_status: "definitief",
          actor_user_id: userId,
          created_at: nowIso,
        });

      if (resultErr) {
        const msg = String(resultErr.message || "").toLowerCase();
        if (!msg.includes("actor_user_id")) throw resultErr;
      }
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      matchmaker_id: targetMatchmakerId,
      lifecycle: moved,
      message:
        "Matchmaking is teruggestuurd naar matchmaker en staat nu op retour_naar_eigenaar.",
    });
  } catch (err: any) {
    return jsonError(err?.message ?? "Onbekende fout.", 500);
  }
}