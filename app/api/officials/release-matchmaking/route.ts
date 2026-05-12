import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/api/requireRole";
import { assertCanAccessMatchmaking } from "@/lib/api/access";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function isResponseLike(value: unknown): value is Response {
  return typeof Response !== "undefined" && value instanceof Response;
}

function s(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const { userId, roles } = await requireRole(req, [
      "superadmin",
      "super_admin",
      "admin",
      "administrator",
      "matchmaker",
      "official",
      "hoofdofficial",
    ]);

    const body = await req.json().catch(() => ({}));
    const matchmakingId = s((body as any)?.matchmaking_id);

    if (!matchmakingId) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt." },
        { status: 400 }
      );
    }

    const primaryRole = s(roles?.[0]).toLowerCase();
    await assertCanAccessMatchmaking(userId, primaryRole, matchmakingId);

    const nowIso = new Date().toISOString();

    const { data: mm, error: mmErr } = await supabaseAdmin
      .from("matchmakings")
      .select(
        "id, bondteam, stadium, huidige_eigenaar_type, huidige_eigenaar_user_id, huidige_eigenaar_bondteam"
      )
      .eq("id", matchmakingId)
      .single();

    if (mmErr || !mm) {
      return NextResponse.json(
        { error: mmErr?.message || "Matchmaking niet gevonden." },
        { status: 404 }
      );
    }

    const bondteam = s((mm as any)?.bondteam);
    if (!bondteam) {
      return NextResponse.json(
        { error: "Deze matchmaking heeft geen bondteam." },
        { status: 400 }
      );
    }

    const currentStage = s((mm as any)?.stadium).toLowerCase();
    const blockedStages = new Set([
      "uitslagen_in_bewerking",
      "uitslagen_definitief",
      "terug_bij_admin",
      "gearchiveerd",
    ]);

    if (blockedStages.has(currentStage)) {
      return NextResponse.json(
        {
          error:
            "Deze matchmaking kan in de huidige fase niet meer naar officials worden gestuurd.",
        },
        { status: 400 }
      );
    }

    const previousOwnerType = (mm as any)?.huidige_eigenaar_type ?? null;
    const previousOwnerUserId = (mm as any)?.huidige_eigenaar_user_id ?? null;
    const previousOwnerBondteam = (mm as any)?.huidige_eigenaar_bondteam ?? null;

    const { error: mmUpdateErr } = await supabaseAdmin
      .from("matchmakings")
      .update({
        stadium: "in_officials",
        status: "in_officials",

        vorige_eigenaar_type: previousOwnerType,
        vorige_eigenaar_user_id: previousOwnerUserId,
        vorige_eigenaar_bondteam: previousOwnerBondteam,

        huidige_eigenaar_type: "bondteam",
        huidige_eigenaar_user_id: null,
        huidige_eigenaar_bondteam: bondteam,

        sent_at: nowIso,
        sent_by: userId,
        sent_to_officials_at: nowIso,
        last_received_at: nowIso,
        last_received_by: userId,

        last_updated_at: nowIso,
        last_updated_by: userId,
      })
      .eq("id", matchmakingId);

    if (mmUpdateErr) {
      return NextResponse.json(
        { error: mmUpdateErr.message || "Matchmaking update mislukt." },
        { status: 500 }
      );
    }

    const { data: uploadRows, error: uploadErr } = await supabaseAdmin
      .from("matchmaking_uploads")
      .update({
        official_release: true,
        official_released_at: nowIso,
      })
      .eq("matchmaking_id", matchmakingId)
      .select("id, matchmaking_id, official_release, official_released_at, bondteam");

    if (uploadErr) {
      return NextResponse.json(
        { error: uploadErr.message || "Update matchmaking_uploads mislukt." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      released_count: uploadRows?.length ?? 0,
      stadium: "in_officials",
      huidige_eigenaar_type: "bondteam",
      huidige_eigenaar_bondteam: bondteam,
      message: `✅ Matchmaking is doorgestuurd naar officials. Huidige eigenaar: ${bondteam}.`,
    });
  } catch (e: any) {
    if (isResponseLike(e)) return e;

    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout." },
      { status: 500 }
    );
  }
}