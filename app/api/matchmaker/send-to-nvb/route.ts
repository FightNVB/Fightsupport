import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, getUserBondteam, requireAnyRole } from "@/app/api/_utils/authz";
import { ensureLifecycleRecord, transferLifecycle } from "@/app/api/_utils/matchmakingLifecycle";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: unknown): string { return String(v ?? "").trim(); }
function jsonError(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

async function ensureControleRun(matchmakingId: string, userId: string) {
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from("controle_runs")
    .select("id")
    .eq("matchmaking_id", matchmakingId)
    .eq("run_type", "nvb")
    .order("gestart_op", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing?.id) return String(existing.id);
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("controle_runs")
    .insert({ matchmaking_id: matchmakingId, run_type: "nvb", status: "queued", gestart_op: new Date().toISOString(), aangevraagd_door: userId })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return String(inserted.id);
}

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await requireAnyRole(req, ["admin", "matchmaker", "hoofdofficial", "official"]);
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmaking_id);
    const directToBondteam = body?.direct_to_bondteam === true;
    if (!matchmakingId) return jsonError("matchmaking_id ontbreekt.");

    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });

    const { data: mm } = await supabaseAdmin
      .from("matchmakings")
      .select("id, naam, datum, locatie, huidige_eigenaar_bondteam, matchmaker_id")
      .eq("id", matchmakingId)
      .maybeSingle();

    const fallbackBondteam = (await getUserBondteam(userId)) || null;

    await ensureLifecycleRecord({
      matchmakingId,
      naam: (mm as any)?.naam ?? null,
      datum: (mm as any)?.datum ?? null,
      locatie: (mm as any)?.locatie ?? null,
      matchmakerId: (mm as any)?.matchmaker_id ?? null,
      bronType: role === "matchmaker" ? "matchmaker_app" : role === "admin" ? "admin_upload" : "official_upload",
      stage: "concept_matchmaking",
      ownerType: role === "matchmaker" ? "matchmaker" : role === "admin" ? "admin" : "bondteam",
      ownerUserId: role === "matchmaker" ? userId : null,
      ownerBondteam: (mm as any)?.huidige_eigenaar_bondteam ?? fallbackBondteam,
      actorUserId: userId,
      actorRole: role,
      metadata: { route: "api/matchmaker/send-to-nvb/route", ensured: true },
    });

    if (directToBondteam) {
      const bondteam = s(body?.bondteam) || (mm as any)?.huidige_eigenaar_bondteam || fallbackBondteam;
      if (!bondteam) return jsonError("bondteam ontbreekt voor doorsturen naar bondteam.");
      const moved = await transferLifecycle({
        matchmakingId,
        newStage: "klaar_voor_weegstation",
        newOwnerType: "bondteam",
        newOwnerBondteam: bondteam,
        actorUserId: userId,
        actorRole: role,
        opmerking: "Doorgestuurd naar bondteam/weegstation.",
        metadata: { route: "api/matchmaker/send-to-nvb/route", direct_to_bondteam: true },
      });
      return NextResponse.json({ ok: true, matchmaking_id: matchmakingId, lifecycle: moved, message: "Matchmaking is doorgestuurd naar bondteam / weegstation." });
    }

    const controleRunId = await ensureControleRun(matchmakingId, userId);
    const moved = await transferLifecycle({
      matchmakingId,
      newStage: "ingediend_admin",
      newOwnerType: "admin",
      actorUserId: userId,
      actorRole: role,
      opmerking: "Doorgestuurd naar admin/controle.",
      metadata: { route: "api/matchmaker/send-to-nvb/route", controle_run_id: controleRunId },
    });

    await supabaseAdmin.from("matchmaking_uploads").update({ flow_status: "naar_controle_verstuurd" }).eq("matchmaking_id", matchmakingId);
    await supabaseAdmin.from("matchmaker_matchmakings").update({ status: "naar_controle_verstuurd" }).eq("id", matchmakingId);

    return NextResponse.json({ ok: true, matchmaking_id: matchmakingId, controle_run_id: controleRunId, lifecycle: moved, message: "Matchmaking is doorgestuurd naar admin/controle." });
  } catch (err: any) {
    return jsonError(err?.message ?? "Onbekende fout.", 500);
  }
}
