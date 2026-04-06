import { NextResponse } from "next/server";
import { getWeegstationAuthContext } from "@/lib/weegstation/routeAuth";
import { evaluateWeighInBout } from "@/lib/weegstation/weighInRulesEngine";

export const runtime = "nodejs";

function normalizeRoleNames(roleNames?: unknown[]): string[] {
  return (roleNames ?? [])
    .map((x) => String(x ?? "").trim().toLowerCase())
    .filter(Boolean);
}

function canFinalize(ctx: {
  isHoofdofficialLike?: boolean;
  roleNames?: unknown[];
}) {
  const names = normalizeRoleNames(ctx.roleNames);

  if (ctx.isHoofdofficialLike) return true;

  return (
    names.includes("official") ||
    names.includes("hoofdofficial") ||
    names.includes("admin") ||
    names.includes("superadmin")
  );
}

function getDispDecision(row: any): "VERLEEND" | "AFGEWEZEN" | "NODIG" | null {
  const reason = String(row?.dispensatie_reason ?? "").trim().toUpperCase();

  if (row?.dispensatie_verleend || reason === "VERLEEND") return "VERLEEND";
  if (reason === "AFGEWEZEN") return "AFGEWEZEN";
  if (row?.dispensatie_nodig) return "NODIG";
  return null;
}

function normalizeStatus(status: unknown): string {
  const s = String(status ?? "").trim().toUpperCase();

  if (!s) return "WACHT_OP_WEGEN";
  if (s === "OK") return "OK";
  if (s.includes("DISPENSATIE")) return "DISPENSATIE_NODIG";
  if (s.includes("AFKEUR")) return "AFKEUR";
  if (s.includes("DEELS")) return "DEELS_GEWOGEN";
  if (s.includes("WACHT")) return "WACHT_OP_WEGEN";
  if (s.includes("HANDMATIG")) return "HANDMATIGE_BEOORDELING";

  return s;
}

function getFinalBoutStatus(row: any, evalStatus?: string): string {
  const rowStatus = normalizeStatus(row?.eindstatus || row?.praktijk_status || row?.reglement_status);
  const normalizedEval = normalizeStatus(evalStatus);
  const dispDecision = getDispDecision(row);

  let finalStatus = rowStatus || normalizedEval || "WACHT_OP_WEGEN";

  if (
    rowStatus === "WACHT_OP_WEGEN" ||
    rowStatus === "DEELS_GEWOGEN" ||
    rowStatus === "HANDMATIGE_BEOORDELING" ||
    !row?.eindstatus
  ) {
    if (normalizedEval && normalizedEval !== "HANDMATIGE_BEOORDELING") {
      finalStatus = normalizedEval;
    }
  }

  if (dispDecision === "VERLEEND") {
    finalStatus = "OK";
  } else if (dispDecision === "AFGEWEZEN") {
    finalStatus = "AFKEUR";
  } else if (dispDecision === "NODIG" && finalStatus !== "AFKEUR") {
    finalStatus = "DISPENSATIE_NODIG";
  }

  return finalStatus;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = String((body as any)?.matchmakingId ?? "").trim();

    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmakingId ontbreekt." }, { status: 400 });
    }

    const auth = await getWeegstationAuthContext(req, matchmakingId);
    const { admin } = auth;

    if (!canFinalize(auth)) {
      return NextResponse.json(
        {
          error:
            "Alleen official, hoofdofficial, admin of superadmin mag de definitieve lineup bouwen.",
          debug_roles: normalizeRoleNames((auth as any)?.roleNames),
          debug_isHoofdofficialLike: !!(auth as any)?.isHoofdofficialLike,
        },
        { status: 403 }
      );
    }

    const { data: latestRow, error: latestErr } = await admin
      .from("weigh_in_bouts")
      .select("controle_run_id, laatste_bewerking_op, updated_at, created_at")
      .eq("matchmaking_id", matchmakingId)
      .not("controle_run_id", "is", null)
      .order("controle_run_id", { ascending: false })
      .order("laatste_bewerking_op", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (latestErr) {
      throw new Error(latestErr.message);
    }

    if (!latestRow?.controle_run_id) {
      return NextResponse.json(
        { error: "Geen controle_run_id gevonden voor deze matchmaking." },
        { status: 400 }
      );
    }

    const activeControleRunId = latestRow.controle_run_id;

    const { data: rows, error: rowsErr } = await admin
      .from("weigh_in_bouts")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq("controle_run_id", activeControleRunId)
      .order("partij_nr", { ascending: true });

    if (rowsErr) {
      throw new Error(rowsErr.message);
    }

    const allRows = rows ?? [];

    if (allRows.length === 0) {
      return NextResponse.json(
        { error: "Geen weegstation-partijen gevonden voor de actieve controle-run." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const evaluatedRows = allRows.map((row: any) => {
      const evalResult = evaluateWeighInBout({
        discipline: row.discipline,
        klasse_mm: row.klasse_mm,
        leeftijd_type: row.leeftijd_type,
        max_gewicht: row.max_gewicht,
        rood_doorgegeven_gewicht: row.rood_doorgegeven_gewicht,
        blauw_doorgegeven_gewicht: row.blauw_doorgegeven_gewicht,
        rood_gewogen_gewicht: row.rood_gewogen_gewicht,
        blauw_gewogen_gewicht: row.blauw_gewogen_gewicht,
        dispensatie_verleend: row.dispensatie_verleend,
      });

      const finalStatus = getFinalBoutStatus(row, evalResult.eindStatus);

      return {
        row,
        evalResult,
        finalStatus,
      };
    });

    const payload = evaluatedRows
      .filter(({ finalStatus }) => finalStatus === "OK")
      .map(({ row, evalResult, finalStatus }) => ({
        matchmaking_id: row.matchmaking_id,
        partij_nr: row.partij_nr,
        weigh_in_bout_id: row.id,
        controle_run_id: row.controle_run_id ?? null,

        bondteam: row.bondteam ?? null,
        evenement_naam: row.evenement_naam ?? null,
        evenement_datum: row.evenement_datum ?? null,
        discipline: row.discipline ?? null,
        klasse_mm: row.klasse_mm ?? null,
        max_gewicht: row.max_gewicht ?? null,

        rood_naam: row.rood_naam ?? null,
        rood_gym: row.rood_gym ?? null,
        rood_va: row.rood_va ?? null,
        rood_geboortedatum: row.rood_geboortedatum ?? null,
        rood_leeftijd_event: row.rood_leeftijd_event ?? null,
        rood_doorgegeven_gewicht: row.rood_doorgegeven_gewicht ?? null,
        rood_gewogen_gewicht: row.rood_gewogen_gewicht ?? null,

        blauw_naam: row.blauw_naam ?? null,
        blauw_gym: row.blauw_gym ?? null,
        blauw_va: row.blauw_va ?? null,
        blauw_geboortedatum: row.blauw_geboortedatum ?? null,
        blauw_leeftijd_event: row.blauw_leeftijd_event ?? null,
        blauw_doorgegeven_gewicht: row.blauw_doorgegeven_gewicht ?? null,
        blauw_gewogen_gewicht: row.blauw_gewogen_gewicht ?? null,

        gewicht_verschil: row.gewicht_verschil ?? evalResult.diff ?? null,
        leeftijd_type: row.leeftijd_type ?? evalResult.leeftijdType ?? null,
        eindstatus: finalStatus,

        dispensatie_nodig: !!row.dispensatie_nodig,
        dispensatie_verleend: !!row.dispensatie_verleend,
        dispensatie_reason: row.dispensatie_reason ?? null,

        gewicht_strafpunt_rood: row.gewicht_strafpunt_rood ?? 0,
        gewicht_strafpunt_blauw: row.gewicht_strafpunt_blauw ?? 0,

        admin_sanctie_nodig: !!row.admin_sanctie_nodig,
        admin_sanctie_reason: row.admin_sanctie_reason ?? null,

        weging_notitie: row.weging_notitie ?? null,
        bron: "weegstation",
        updated_at: now,
      }));

    if (payload.length === 0) {
      return NextResponse.json(
        { error: "Er zijn geen partijen met status OK in de actieve controle-run." },
        { status: 400 }
      );
    }

    const { error: upsertErr } = await admin
      .from("definitive_matchmaking_bouts")
      .upsert(payload, {
        onConflict: "matchmaking_id,partij_nr",
      });

    if (upsertErr) {
      throw new Error(upsertErr.message);
    }

    return NextResponse.json({
      ok: true,
      controle_run_id: activeControleRunId,
      saved_bouts: payload.length,
      saved_partij_nrs: payload.map((x) => x.partij_nr),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Finaliseren van weegstation mislukt." },
      { status: 500 }
    );
  }
}