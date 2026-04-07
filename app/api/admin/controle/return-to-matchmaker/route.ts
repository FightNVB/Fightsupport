import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader, hasAnyRole } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: unknown): string {
  return String(v ?? "").trim();
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFromAuthHeader(req);

    if (!hasAnyRole(user, ["superadmin", "admin", "hoofdofficial"])) {
      return jsonError("Geen toegang.", 403);
    }

    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmaking_id);
    const reason = s(body?.reason);

    if (!matchmakingId) {
      return jsonError("matchmaking_id ontbreekt.");
    }

    const nowIso = new Date().toISOString();

    const { error: uploadErr } = await supabaseAdmin
      .from("matchmaking_uploads")
      .update({
        flow_status: "teruggestuurd_naar_matchmaker",
        laatste_bewerking_op: nowIso,
      })
      .eq("matchmaking_id", matchmakingId);

    if (uploadErr) {
      const msg = String(uploadErr.message || "");
      if (!msg.toLowerCase().includes("laatste_bewerking_op")) throw uploadErr;
    }

    const { error: runErr } = await supabaseAdmin
      .from("controle_runs")
      .update({
        status: "teruggestuurd_naar_matchmaker",
        afgerond_op: nowIso,
      })
      .eq("matchmaking_id", matchmakingId)
      .eq("status", "queued");

    if (runErr) {
      const msg = String(runErr.message || "");
      if (!msg.toLowerCase().includes("status")) throw runErr;
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
          actor_user_id: user.id,
          created_at: nowIso,
        });

      if (resultErr) {
        const msg = String(resultErr.message || "");
        if (!msg.toLowerCase().includes("actor_user_id")) throw resultErr;
      }
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      message:
        "Matchmaking is teruggestuurd naar matchmaker. Verdere aanpassingen lopen nu via matchmaking_bouts_raw.",
    });
  } catch (err: any) {
    return jsonError(err?.message ?? "Onbekende fout.", 500);
  }
}