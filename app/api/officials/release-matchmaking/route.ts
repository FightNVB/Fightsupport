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
    const matchmakingId = String((body as any)?.matchmaking_id ?? "").trim();

    if (!matchmakingId) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt." },
        { status: 400 }
      );
    }

    const primaryRole = String(roles?.[0] ?? "").trim().toLowerCase();
    await assertCanAccessMatchmaking(userId, primaryRole, matchmakingId);

    const nowIso = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("matchmaking_uploads")
      .update({
        official_release: true,
        official_released_at: nowIso,
      })
      .eq("matchmaking_id", matchmakingId)
      .select("id, matchmaking_id, official_release, official_released_at, bondteam");

    if (error) {
      return NextResponse.json(
        { error: error.message || "Doorsturen mislukt." },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Geen matchmaking_uploads record gevonden voor deze matchmaking." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      released_count: data.length,
      message:
        "✅ Matchmaking is doorgestuurd naar officials en staat nu in het official overzicht.",
    });
  } catch (e: any) {
    if (isResponseLike(e)) return e;

    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout." },
      { status: 500 }
    );
  }
}
