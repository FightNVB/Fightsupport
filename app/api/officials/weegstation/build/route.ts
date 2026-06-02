import { NextResponse } from "next/server";
import { getWeegstationAuthContext } from "@/lib/weegstation/routeAuth";

export const runtime = "nodejs";

function isConflictSecondTimeError(err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "").toLowerCase();
  return msg.includes("cannot affect row a second time");
}

function isOldColumnError(err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "").toLowerCase();
  return (
    msg.includes("column c.rood_naam does not exist") ||
    msg.includes("column ctx.rood_naam does not exist") ||
    msg.includes("column ctx.blauw_naam does not exist")
  );
}

async function cleanupOldWeegstationData(admin: any, matchmakingId: string) {
  // Bij opnieuw bouwen moet het weegstation altijd volledig vers zijn.
  // Alleen oude weegstation-output wordt verwijderd; rules-engine meldingen blijven staan.
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

async function attachControleRunIdsToWeighInBouts(admin: any, matchmakingId: string) {
  // De sync-rpc bouwt weigh_in_bouts vanuit controle_bout_context.
  // Niet elke DB-functie kopieert controle_run_id al mee, dus doen we hier
  // een veilige naloop: partij_nr -> bestaande controle_run_id.
  const { data: ctxRows, error: ctxErr } = await admin
    .from("controle_bout_context")
    .select("partij_nr, controle_run_id")
    .eq("matchmaking_id", matchmakingId)
    .not("controle_run_id", "is", null);

  if (ctxErr) throw ctxErr;

  const byPartij = new Map<number, string>();
  for (const ctx of ctxRows ?? []) {
    const partijNr = Number((ctx as any)?.partij_nr);
    const controleRunId = String((ctx as any)?.controle_run_id ?? "").trim();
    if (!Number.isFinite(partijNr) || !controleRunId) continue;
    if (!byPartij.has(partijNr)) byPartij.set(partijNr, controleRunId);
  }

  for (const [partijNr, controleRunId] of byPartij.entries()) {
    const { error: updErr } = await admin
      .from("weigh_in_bouts")
      .update({ controle_run_id: controleRunId })
      .eq("matchmaking_id", matchmakingId)
      .eq("partij_nr", partijNr);

    if (updErr) throw updErr;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = String((body as any)?.matchmakingId ?? "").trim();

    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmakingId ontbreekt." }, { status: 400 });
    }

    const { admin } = await getWeegstationAuthContext(req, matchmakingId);

    const nowIso = new Date().toISOString();
    let syncWarning: string | null = null;

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

    let actingUserId: string | null = null;
    if (token) {
      const { data: userData, error: userErr } = await admin.auth.getUser(token);
      if (!userErr && userData?.user?.id) {
        actingUserId = userData.user.id;
      }
    }

    const { data: mmRow, error: mmReadErr } = await admin
      .from("matchmakings")
      .select("id, bondteam")
      .eq("id", matchmakingId)
      .single();

    if (mmReadErr) throw mmReadErr;

    const nextBondteam = String(mmRow?.bondteam ?? "").trim() || null;

    await cleanupOldWeegstationData(admin, matchmakingId);

    try {
      const { error: rpcErr } = await admin.rpc("sync_weigh_in_bouts_for_matchmaking", {
        p_matchmaking_id: matchmakingId,
      });

      if (rpcErr) {
        if (isOldColumnError(rpcErr)) {
          syncWarning =
            "De databasefunctie gebruikt nog oude kolomnamen in controle_bout_context.";
        } else if (isConflictSecondTimeError(rpcErr)) {
          syncWarning =
            "De sync-functie leverde dubbele rijen op in dezelfde build.";
        } else {
          throw rpcErr;
        }
      }
    } catch (e: any) {
      if (isOldColumnError(e)) {
        syncWarning =
          "De databasefunctie gebruikt nog oude kolomnamen in controle_bout_context.";
      } else if (isConflictSecondTimeError(e)) {
        syncWarning =
          "De sync-functie leverde dubbele rijen op in dezelfde build.";
      } else {
        throw e;
      }
    }

    await attachControleRunIdsToWeighInBouts(admin, matchmakingId);

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

    const { data: rows, error: rowsErr } = await admin
      .from("weigh_in_bouts")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .order("controle_run_id", { ascending: false, nullsFirst: false })
      .order("partij_nr", { ascending: true });

    if (rowsErr) throw rowsErr;

    return NextResponse.json({
      ok: true,
      warning: syncWarning,
      rows: rows ?? [],
      count: (rows ?? []).length,
      matchmaking_id: matchmakingId,
      stadium: "klaar_voor_weegstation",
      owner_type: "bondteam",
      owner_bondteam: nextBondteam,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Build van weegstation mislukt." },
      { status: 500 }
    );
  }
}
