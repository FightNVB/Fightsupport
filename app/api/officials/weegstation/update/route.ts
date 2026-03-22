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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const rowId = String((body as any)?.id ?? "").trim();
    if (!rowId) {
      return NextResponse.json({ error: "id ontbreekt." }, { status: 400 });
    }

    const { admin, userId, isHoofdofficialLike } = await getWeegstationAuthContext(req);

    const { data: row, error: rowErr } = await admin
      .from("weigh_in_bouts")
      .select("*")
      .eq("id", rowId)
      .single();

    if (rowErr || !row) {
      throw new Error(rowErr?.message ?? "Partij niet gevonden.");
    }

    await getWeegstationAuthContext(req, row.matchmaking_id);

    const nextRood = toNum((body as any)?.rood_gewogen_gewicht);
    const nextBlauw = toNum((body as any)?.blauw_gewogen_gewicht);
    const note = String((body as any)?.weging_notitie ?? "").trim();

    const requestedStrafpuntRood = toPenalty((body as any)?.gewicht_strafpunt_rood);
    const requestedStrafpuntBlauw = toPenalty((body as any)?.gewicht_strafpunt_blauw);

    const evalResult = evaluateWeighInBout({
      discipline: row.discipline,
      klasse_mm: row.klasse_mm,
      leeftijd_type: row.leeftijd_type,
      max_gewicht: row.max_gewicht,
      rood_doorgegeven_gewicht: row.rood_doorgegeven_gewicht,
      blauw_doorgegeven_gewicht: row.blauw_doorgegeven_gewicht,
      rood_gewogen_gewicht: nextRood,
      blauw_gewogen_gewicht: nextBlauw,
      dispensatie_verleend: row.dispensatie_verleend,
    });

    const finalStrafpuntRood =
      isHoofdofficialLike && evalResult.canProceedWithPenalty && evalResult.nietOpGewichtRood
        ? requestedStrafpuntRood
        : 0;

    const finalStrafpuntBlauw =
      isHoofdofficialLike && evalResult.canProceedWithPenalty && evalResult.nietOpGewichtBlauw
        ? requestedStrafpuntBlauw
        : 0;

    const nextDispensatieNodig = !!evalResult.dispensatieNodig;
    const nextDispensatieVerleend = nextDispensatieNodig ? !!row.dispensatie_verleend : false;

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
      dispensatie_reason: nextDispensatieNodig ? row.dispensatie_reason ?? null : null,
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

    if (updErr || !updated) {
      throw new Error(updErr?.message ?? "Opslaan mislukt.");
    }

    return NextResponse.json({
      ok: true,
      bout: updated,
      eval: evalResult,
      hoofdofficial_required_for_penalty:
        !isHoofdofficialLike &&
        evalResult.canProceedWithPenalty &&
        ((requestedStrafpuntRood && evalResult.nietOpGewichtRood) ||
          (requestedStrafpuntBlauw && evalResult.nietOpGewichtBlauw)),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Update van weegstation mislukt." },
      { status: 500 }
    );
  }
}