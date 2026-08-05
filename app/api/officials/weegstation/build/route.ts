import { NextResponse } from "next/server";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
  supabaseAdmin,
} from "@/app/api/_utils/authz";
import { refreshAuthorizedWeegstation } from "../refresh/route";

export const runtime = "nodejs";

async function cleanupOldWeegstationData(admin: any, matchmakingId: string) {
  const { error: oldWeegResultsBySourceErr } = await admin
    .from("controle_resultaten")
    .delete()
    .eq("matchmaking_id", matchmakingId)
    .eq("source_table", "weigh_in_bouts");
  if (oldWeegResultsBySourceErr) throw oldWeegResultsBySourceErr;

  const { error: oldWeegResultsByRuleErr } = await admin
    .from("controle_resultaten")
    .delete()
    .eq("matchmaking_id", matchmakingId)
    .ilike("rule", "weegstation%");
  if (oldWeegResultsByRuleErr) throw oldWeegResultsByRuleErr;

  // We verwijderen weigh_in_bouts hier bewust niet.
  // Refresh bouwt de actuele rijen opnieuw op en koppelt bestaande wegingen
  // per vechter/VA terug aan de juiste hoek. Als build eerst alles wist,
  // zijn die gewichten niet meer veilig te herstellen.
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = String((body as any)?.matchmakingId ?? "").trim();
    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmakingId ontbreekt." }, { status: 400 });
    }

    const auth = await requireUserWithRole(req, [
      "official",
      "hoofdofficial",
      "admin",
      "superadmin",
      "dispensatie_admin",
      "matchmaker",
    ]);
    if (auth.role !== "dispensatie_admin") {
      await assertCanAccessMatchmaking({
        matchmaking_id: matchmakingId,
        userId: auth.userId,
        role: auth.role,
      });
    }
    const admin = supabaseAdmin;
    const userId = auth.authUserId;

    const { data: mmRow, error: mmReadErr } = await admin
      .from("matchmakings")
      .select("id, bondteam")
      .eq("id", matchmakingId)
      .single();
    if (mmReadErr) throw mmReadErr;

    const nowIso = new Date().toISOString();
    const nextBondteam = String(mmRow?.bondteam ?? "").trim() || null;

    await cleanupOldWeegstationData(admin, matchmakingId);

    const refreshReq = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify({ matchmakingId }),
    });
    const refreshRes = await refreshAuthorizedWeegstation(
      refreshReq,
      matchmakingId,
      admin,
      userId,
    );
    const refreshJson = await refreshRes.json().catch(() => ({}));
    if (!refreshRes.ok) {
      return NextResponse.json(refreshJson, { status: refreshRes.status });
    }

    const { error: mmErr } = await admin
      .from("matchmakings")
      .update({
        stadium: "klaar_voor_weegstation",
        status: "klaar_voor_weegstation",
        huidige_eigenaar_type: "bondteam",
        huidige_eigenaar_user_id: userId,
        huidige_eigenaar_bondteam: nextBondteam,
        sent_at: nowIso,
        sent_by: userId,
        sent_to_officials_at: nowIso,
        last_received_at: nowIso,
        last_received_by: userId,
        last_updated_at: nowIso,
        last_updated_by: userId,
      })
      .eq("id", matchmakingId);
    if (mmErr) throw mmErr;

    return NextResponse.json({
      ...refreshJson,
      ok: true,
      matchmaking_id: matchmakingId,
      stadium: "klaar_voor_weegstation",
      owner_type: "bondteam",
      owner_bondteam: nextBondteam,
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e?.message ?? "Build van weegstation mislukt." },
      { status: 500 },
    );
  }
}
