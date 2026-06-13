import { NextResponse } from "next/server";
import { getWeegstationAuthContext } from "@/lib/weegstation/routeAuth";
import { evaluateWeighInBout } from "@/lib/weegstation/weighInRulesEngine";

export const runtime = "nodejs";

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

function toPenalty(v: unknown): 0 | 1 {
  return Number(String(v ?? "0").trim()) === 1 ? 1 : 0;
}

function cleanText(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

async function enrichWithControleBadges(admin: any, bout: any) {
  if (!bout?.matchmaking_id || bout?.partij_nr == null) return bout;

  if (bout?.is_toernooi || bout?.toernooi_code) {
    const { data: ctx, error } = await admin
      .from("controle_toernooi_context")
      .select("licentie, heeft_startverbod, heeft_keurmerk")
      .eq("matchmaking_id", bout.matchmaking_id)
      .eq("toernooi_code", bout.toernooi_code)
      .eq("va_nummer", bout.rood_va)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !ctx) return bout;

    return {
      ...bout,
      rood_licentie: ctx.licentie,
      rood_heeft_startverbod: ctx.heeft_startverbod,
      keurmerk_rood: ctx.heeft_keurmerk,
    };
  }

  const { data: ctx, error } = await admin
    .from("controle_bout_context")
    .select(
      "rood_licentie, blauw_licentie, rood_heeft_startverbod, blauw_heeft_startverbod, keurmerk_rood, keurmerk_blauw",
    )
    .eq("matchmaking_id", bout.matchmaking_id)
    .eq("partij_nr", bout.partij_nr)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !ctx) return bout;

  return {
    ...bout,
    rood_licentie: ctx.rood_licentie,
    blauw_licentie: ctx.blauw_licentie,
    rood_heeft_startverbod: ctx.rood_heeft_startverbod,
    blauw_heeft_startverbod: ctx.blauw_heeft_startverbod,
    keurmerk_rood: ctx.keurmerk_rood,
    keurmerk_blauw: ctx.keurmerk_blauw,
  };
}

async function recalcToernooiGroup(
  admin: any,
  matchmakingId: string,
  toernooiCode: string | null,
) {
  if (!toernooiCode) return null;

  const { data: rows, error } = await admin
    .from("weigh_in_bouts")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .eq("toernooi_code", toernooiCode)
    .order("partij_nr", { ascending: true });

  if (error) throw error;

  const groupWeights = (rows ?? [])
    .map((row: any) => toNum(row.rood_gewogen_gewicht))
    .filter((v: number | null): v is number => v != null);

  let selectedUpdated: any = null;

  for (const row of rows ?? []) {
    const evalResult = evaluateWeighInBout({
      discipline: row.discipline,
      klasse_mm: row.klasse_mm,
      leeftijd_type: row.leeftijd_type,
      max_gewicht: toNum(row.max_gewicht),
      max_gewicht_notatie: row.max_gewicht_notatie ?? null,
      rood_doorgegeven_gewicht: toNum(row.rood_doorgegeven_gewicht),
      blauw_doorgegeven_gewicht: null,
      rood_gewogen_gewicht: toNum(row.rood_gewogen_gewicht),
      blauw_gewogen_gewicht: null,
      dispensatie_verleend: false,
      is_toernooi: true,
      toernooi_code: toernooiCode,
      toernooi_group_gewichten: groupWeights,
    });

    const { data: updated, error: updErr } = await admin
      .from("weigh_in_bouts")
      .update({
        blauw_gewogen_gewicht: null,
        gewicht_verschil: evalResult.diff,
        leeftijd_type: evalResult.leeftijdType,
        reglement_status: evalResult.reglementStatus,
        praktijk_status: evalResult.praktijkStatus,
        eindstatus: evalResult.eindStatus,
        dispensatie_nodig: false,
        dispensatie_verleend: false,
        dispensatie_reason: null,
        gewicht_strafpunt_blauw: 0,
        admin_sanctie_nodig: !!evalResult.adminSanctieNodig,
        admin_sanctie_reason: evalResult.adminSanctieReason ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .select("*")
      .single();

    if (updErr) throw updErr;
    selectedUpdated = updated;
  }

  return selectedUpdated;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const rowId = String((body as any)?.id ?? "").trim();
    if (!rowId) {
      return NextResponse.json({ error: "id ontbreekt." }, { status: 400 });
    }

    const { admin, userId, isHoofdofficialLike } =
      await getWeegstationAuthContext(req);

    const { data: row, error: rowErr } = await admin
      .from("weigh_in_bouts")
      .select("*")
      .eq("id", rowId)
      .single();

    if (rowErr || !row)
      throw new Error(rowErr?.message ?? "Partij niet gevonden.");

    await getWeegstationAuthContext(req, row.matchmaking_id);

    const isToernooi = !!row.is_toernooi || !!cleanText(row.toernooi_code);
    const nextRood = toNum((body as any)?.rood_gewogen_gewicht);
    const nextBlauw = isToernooi
      ? null
      : toNum((body as any)?.blauw_gewogen_gewicht);
    const note = String((body as any)?.weging_notitie ?? "").trim();

    const requestedStrafpuntRood = toPenalty(
      (body as any)?.gewicht_strafpunt_rood,
    );
    const requestedStrafpuntBlauw = isToernooi
      ? 0
      : toPenalty((body as any)?.gewicht_strafpunt_blauw);

    const evalResult = evaluateWeighInBout({
      discipline: row.discipline,
      klasse_mm: row.klasse_mm,
      leeftijd_type: row.leeftijd_type,
      max_gewicht: toNum(row.max_gewicht),
      max_gewicht_notatie: row.max_gewicht_notatie ?? null,
      rood_doorgegeven_gewicht: toNum(row.rood_doorgegeven_gewicht),
      blauw_doorgegeven_gewicht: toNum(row.blauw_doorgegeven_gewicht),
      rood_gewogen_gewicht: nextRood,
      blauw_gewogen_gewicht: nextBlauw,
      dispensatie_verleend: row.dispensatie_verleend,
      is_toernooi: isToernooi,
      toernooi_code: row.toernooi_code ?? null,
      toernooi_group_gewichten: isToernooi ? [nextRood] : [],
    });

    const finalStrafpuntRood = isToernooi
      ? 0
      : isHoofdofficialLike
        ? requestedStrafpuntRood
        : 0;
    const finalStrafpuntBlauw = isToernooi
      ? 0
      : isHoofdofficialLike
        ? requestedStrafpuntBlauw
        : 0;

    const nextDispensatieNodig = isToernooi
      ? false
      : !!evalResult.dispensatieNodig;
    const nextDispensatieVerleend = nextDispensatieNodig
      ? !!row.dispensatie_verleend
      : false;

    const payload = {
      rood_gewogen_gewicht: nextRood,
      blauw_gewogen_gewicht: nextBlauw,
      gewicht_verschil: evalResult.diff,
      leeftijd_type: evalResult.leeftijdType,
      reglement_status: evalResult.reglementStatus,
      praktijk_status: evalResult.praktijkStatus,
      eindstatus: evalResult.eindStatus,
      dispensatie_nodig: nextDispensatieNodig,
      dispensatie_verleend: nextDispensatieVerleend,
      dispensatie_reason: nextDispensatieNodig
        ? (row.dispensatie_reason ?? null)
        : null,
      gewicht_strafpunt_rood: finalStrafpuntRood,
      gewicht_strafpunt_blauw: finalStrafpuntBlauw,
      admin_sanctie_nodig: !!evalResult.adminSanctieNodig,
      admin_sanctie_reason: evalResult.adminSanctieReason ?? null,
      weging_notitie: note || null,
      laatste_bewerking_door: userId,
      laatste_bewerking_op: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updErr } = await admin
      .from("weigh_in_bouts")
      .update(payload)
      .eq("id", rowId)
      .select("*")
      .single();

    if (updErr || !updated)
      throw new Error(updErr?.message ?? "Opslaan mislukt.");

    let finalUpdated = updated;
    if (isToernooi) {
      await recalcToernooiGroup(
        admin,
        row.matchmaking_id,
        cleanText(row.toernooi_code),
      );
      const { data: reread } = await admin
        .from("weigh_in_bouts")
        .select("*")
        .eq("id", rowId)
        .single();
      if (reread) finalUpdated = reread;
    }

    const updatedWithBadges = await enrichWithControleBadges(
      admin,
      finalUpdated,
    );

    return NextResponse.json({
      ok: true,
      bout: updatedWithBadges,
      eval: evalResult,
      hoofdofficial_required_for_penalty:
        !isToernooi &&
        !isHoofdofficialLike &&
        evalResult.canProceedWithPenalty &&
        ((requestedStrafpuntRood && evalResult.nietOpGewichtRood) ||
          (requestedStrafpuntBlauw && evalResult.nietOpGewichtBlauw)),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Update van weegstation mislukt." },
      { status: 500 },
    );
  }
}
