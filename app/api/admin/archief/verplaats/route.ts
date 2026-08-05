import { NextRequest, NextResponse } from "next/server";
import { assertCanAccessMatchmaking, requireUserWithRole, supabaseAdmin } from "@/app/api/_utils/authz";
import { privateJson, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function lower(v: unknown) {
  return s(v).toLowerCase();
}

function bad(error: string, status = 400) {
  return privateJson({ ok: false, error }, status);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmaking_id);
    if (!matchmakingId) return bad("matchmaking_id ontbreekt.");

    const auth = await requireUserWithRole(req, ["official", "hoofdofficial", "admin", "superadmin"]);
    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId: auth.userId, role: auth.role });

    const { data: mm, error: mmErr } = await supabaseAdmin
      .from("matchmakings")
      .select("id, naam, bondteam, huidige_eigenaar_bondteam, status, stadium")
      .eq("id", matchmakingId)
      .maybeSingle();

    if (mmErr) throw mmErr;
    if (!mm) return bad("Matchmaking niet gevonden.", 404);

    const userBondteam = s(auth.bondteam).toUpperCase();
    const mmBondteam = s((mm as any).huidige_eigenaar_bondteam || (mm as any).bondteam).toUpperCase();
    const isNvbSuperadmin = auth.role === "superadmin" && userBondteam === "NVB";

    if (!isNvbSuperadmin && userBondteam && mmBondteam && userBondteam !== mmBondteam) {
      return bad("Je mag alleen matchmakings van je eigen bondteam verplaatsen.", 403);
    }

    const stadium = lower((mm as any).stadium);
    const status = lower((mm as any).status);
    let currentStage = stadium || status;
    const finishedStages = ["uitslagen_definitief", "afgerond", "gearchiveerd", "admin_archief"];
    let isFinished = finishedStages.includes(stadium) || finishedStages.includes(status);

    const now = new Date().toISOString();

    // Herstel voor oude/blijvende records: de uitslagen kunnen al definitief zijn,
    // terwijl matchmakings nog op klaar_voor_uitslagen of uitslagen_in_bewerking staat.
    // Dan volgen we alsnog de geldige flow: klaar_voor_uitslagen -> uitslagen_in_bewerking -> uitslagen_definitief.
    if (!isFinished && ["klaar_voor_uitslagen", "uitslagen_in_bewerking"].includes(currentStage)) {
      const { data: run } = await supabaseAdmin
        .from("uitslagen_runs")
        .select("id, status")
        .eq("matchmaking_id", matchmakingId)
        .maybeSingle();

      const runIsFinished = lower((run as any)?.status) === "afgerond" || lower((run as any)?.status) === "uitslagen_definitief";

      if (runIsFinished) {
        if (currentStage === "klaar_voor_uitslagen") {
          const { error: inBewerkingErr } = await supabaseAdmin
            .from("matchmakings")
            .update({
              status: "uitslagen_in_bewerking",
              stadium: "uitslagen_in_bewerking",
              last_updated_at: now,
              last_updated_by: auth.userId,
            })
            .eq("id", matchmakingId);

          if (inBewerkingErr) throw inBewerkingErr;
        }

        const { error: repairErr } = await supabaseAdmin
          .from("matchmakings")
          .update({
            status: "uitslagen_definitief",
            stadium: "uitslagen_definitief",
            results_finalized_at: now,
            locked_for_editing: true,
            last_updated_at: now,
            last_updated_by: auth.userId,
          })
          .eq("id", matchmakingId);

        if (repairErr) throw repairErr;
        currentStage = "uitslagen_definitief";
        isFinished = true;
      }
    }

    if (!isFinished) {
      return bad(`Alleen definitief afgeronde matchmakings kunnen naar Admin Archief worden verplaatst. Huidige status: ${currentStage || "onbekend"}.`, 409);
    }

    const { error: updErr } = await supabaseAdmin
      .from("matchmakings")
      .update({
        status: "gearchiveerd",
        stadium: "gearchiveerd",
        huidige_eigenaar_type: "admin",
        huidige_eigenaar_user_id: null,
        huidige_eigenaar_bondteam: mmBondteam || null,
        is_archived: true,
        archived_at: now,
        final_status: "gearchiveerd",
        locked_for_editing: true,
        last_updated_at: now,
        last_updated_by: auth.userId,
      })
      .eq("id", matchmakingId);

    if (updErr) throw updErr;

    await supabaseAdmin
      .from("matchmaking_uploads")
      .update({ flow_status: "gearchiveerd" })
      .eq("matchmaking_id", matchmakingId);

    await supabaseAdmin.from("matchmaking_flow_log").insert({
      matchmaking_id: matchmakingId,
      actie_type: "naar_admin_archief",
      van_stadium: currentStage || null,
      naar_stadium: "gearchiveerd",
      van_eigenaar_type: "bondteam",
      naar_eigenaar_type: "admin",
      naar_eigenaar_bondteam: mmBondteam || null,
      actor_user_id: auth.userId,
      actor_role: auth.role,
      opmerking: "Afgeronde matchmaking vanuit officials archief naar Admin Archief verplaatst.",
      metadata: { route: "api/admin/archief/verplaats" },
    });

    return privateJson({
      ok: true,
      matchmaking_id: matchmakingId,
      status: "gearchiveerd",
    });
  } catch (e: any) {
    return secureError(e, "Verplaatsen naar Admin Archief mislukt.");
  }
}
