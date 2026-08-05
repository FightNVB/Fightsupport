import { NextResponse } from "next/server";
import { getWeegstationAuthContext } from "@/lib/weegstation/routeAuth";
import { evaluateWeighInBout } from "@/lib/weegstation/weighInRulesEngine";

export const runtime = "nodejs";

function canDecideDispensation(ctx: {
  isHoofdofficialLike?: boolean;
  roleNames?: string[];
}) {
  if (ctx.isHoofdofficialLike) return true;

  const names = (ctx.roleNames ?? []).map((x) => String(x).trim().toLowerCase());
  return names.includes("hoofdofficial") || names.includes("superadmin");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rowId = String((body as any)?.id ?? "").trim();
    const matchmakingId = String((body as any)?.matchmaking_id ?? "").trim();
    const decision = String((body as any)?.decision ?? "").trim().toLowerCase();

    if (!rowId || !matchmakingId) {
      return NextResponse.json({ error: "id of matchmaking_id ontbreekt." }, { status: 400 });
    }

    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json(
        { error: "decision moet approved of rejected zijn." },
        { status: 400 }
      );
    }

    const auth = await getWeegstationAuthContext(req, matchmakingId);
    const { admin, userId } = auth;

    if (!canDecideDispensation(auth)) {
      return NextResponse.json(
        {
          error:
            "Alleen hoofdofficial of superadmin mag gewicht-dispensaties behandelen.",
        },
        { status: 403 }
      );
    }

    const { data: row, error: rowErr } = await admin
      .from("weigh_in_bouts")
      .select("*")
      .eq("id", rowId)
      .eq("matchmaking_id", matchmakingId)
      .single();

    if (rowErr || !row) {
      throw new Error(rowErr?.message ?? "Partij niet gevonden.");
    }

    const evalResult = evaluateWeighInBout({
      discipline: row.discipline,
      klasse_mm: row.klasse_mm,
      leeftijd_type: row.leeftijd_type,
      max_gewicht: row.max_gewicht,
      rood_doorgegeven_gewicht: row.rood_doorgegeven_gewicht,
      blauw_doorgegeven_gewicht: row.blauw_doorgegeven_gewicht,
      rood_gewogen_gewicht: row.rood_gewogen_gewicht,
      blauw_gewogen_gewicht: row.blauw_gewogen_gewicht,
      dispensatie_verleend: false,
    });

    if (!evalResult.dispensatieMogelijk && !evalResult.dispensatieNodig) {
      return NextResponse.json(
        { error: "Voor deze partij is geen gewicht-dispensatie van toepassing." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const payload =
      decision === "approved"
        ? {
            dispensatie_nodig: true,
            dispensatie_verleend: true,
            dispensatie_reason: "VERLEEND",
            dispensatie_by: userId,
            dispensatie_at: now,
            praktijk_status: "OK",
            eindstatus: "OK",
            admin_sanctie_nodig: false,
            admin_sanctie_reason: null,
            laatste_bewerking_door: userId,
            laatste_bewerking_op: now,
            updated_at: now,
          }
        : {
            dispensatie_nodig: false,
            dispensatie_verleend: false,
            dispensatie_reason: "AFGEWEZEN",
            dispensatie_by: userId,
            dispensatie_at: now,
            praktijk_status: "AFKEUR",
            eindstatus: "AFKEUR",
            admin_sanctie_nodig: false,
            admin_sanctie_reason: null,
            laatste_bewerking_door: userId,
            laatste_bewerking_op: now,
            updated_at: now,
          };

    const { data: updated, error: updErr } = await admin
      .from("weigh_in_bouts")
      .update(payload)
      .eq("id", rowId)
      .select("*")
      .single();

    if (updErr || !updated) {
      throw new Error(updErr?.message ?? "Dispensatie beslissing mislukt.");
    }

    return NextResponse.json({
      ok: true,
      bout: updated,
      eval: evaluateWeighInBout({
        discipline: updated.discipline,
        klasse_mm: updated.klasse_mm,
        leeftijd_type: updated.leeftijd_type,
        max_gewicht: updated.max_gewicht,
        rood_doorgegeven_gewicht: updated.rood_doorgegeven_gewicht,
        blauw_doorgegeven_gewicht: updated.blauw_doorgegeven_gewicht,
        rood_gewogen_gewicht: updated.rood_gewogen_gewicht,
        blauw_gewogen_gewicht: updated.blauw_gewogen_gewicht,
        dispensatie_verleend: updated.dispensatie_verleend,
      }),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Gewicht-dispensatie beslissing mislukt." },
      { status: 500 }
    );
  }
}
