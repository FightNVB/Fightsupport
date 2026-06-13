import { NextResponse } from "next/server";
import { getWeegstationAuthContext } from "@/lib/weegstation/routeAuth";
import { POST as refreshWeegstation } from "../refresh/route";

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

  const { error: oldWeighInBoutsErr } = await admin
    .from("weigh_in_bouts")
    .delete()
    .eq("matchmaking_id", matchmakingId);

  if (oldWeighInBoutsErr) throw oldWeighInBoutsErr;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = String((body as any)?.matchmakingId ?? "").trim();

    if (!matchmakingId) {
      return NextResponse.json(
        { error: "matchmakingId ontbreekt." },
        { status: 400 },
      );
    }

    const { admin } = await getWeegstationAuthContext(req, matchmakingId);

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

    let actingUserId: string | null = null;
    if (token) {
      const { data: userData, error: userErr } =
        await admin.auth.getUser(token);
      if (!userErr && userData?.user?.id) actingUserId = userData.user.id;
    }

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

    const refreshRes = await refreshWeegstation(refreshReq);
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
        huidige_eigenaar_user_id: actingUserId,
        huidige_eigenaar_bondteam: nextBondteam,
        sent_at: nowIso,
        sent_by: actingUserId,
        sent_to_officials_at: nowIso,
        last_received_at: nowIso,
        last_received_by: actingUserId,
        last_updated_at: nowIso,
        last_updated_by: actingUserId,
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
    return NextResponse.json(
      { error: e?.message ?? "Build van weegstation mislukt." },
      { status: 500 },
    );
  }
}
