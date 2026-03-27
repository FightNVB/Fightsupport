import { NextResponse } from "next/server";
import { requireMatchmakerAccess, supabaseAdmin } from "@/lib/matchmaker/access";
import { buildMatchAdvice, getLeeftijdType } from "@/lib/matchmaker/flow";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mmId = Number(body?.matchmaker_matchmaking_id);
    const roodId = Number(body?.rood_fighter_id);
    const blauwId = Number(body?.blauw_fighter_id);
    const notes = String(body?.notes ?? "").trim() || null;

    if (!Number.isFinite(mmId) || !Number.isFinite(roodId) || !Number.isFinite(blauwId)) {
      return NextResponse.json({ error: "matchmaker_matchmaking_id, rood_fighter_id en blauw_fighter_id zijn verplicht" }, { status: 400 });
    }
    if (roodId === blauwId) {
      return NextResponse.json({ error: "Kies 2 verschillende vechters" }, { status: 400 });
    }

    const access = await requireMatchmakerAccess(req, mmId);

    const { data: mm, error: mmErr } = await supabaseAdmin
      .from("matchmaker_matchmakings")
      .select("id, evenement_datum")
      .eq("id", mmId)
      .single();
    if (mmErr) throw mmErr;

    const { data: fighters, error: fighterErr } = await supabaseAdmin
      .from("matchmaker_fighter_context")
      .select("*")
      .eq("matchmaker_matchmaking_id", mmId)
      .in("id", [roodId, blauwId]);

    if (fighterErr) throw fighterErr;
    if ((fighters ?? []).length !== 2) throw new Error("Niet beide fighters gevonden.");

    const rood = fighters!.find((x: any) => Number(x.id) === roodId) as any;
    const blauw = fighters!.find((x: any) => Number(x.id) === blauwId) as any;

    const fighterIds = [roodId, blauwId];
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("matchmaker_matches")
      .select("id, rood_fighter_id, blauw_fighter_id")
      .eq("matchmaker_matchmaking_id", mmId)
      .or(`rood_fighter_id.eq.${fighterIds[0]},blauw_fighter_id.eq.${fighterIds[0]},rood_fighter_id.eq.${fighterIds[1]},blauw_fighter_id.eq.${fighterIds[1]}`)
      .limit(1);

    if (exErr) throw exErr;
    if ((existing ?? []).length > 0) {
      return NextResponse.json({ error: "Eén van deze vechters is al gekoppeld in een partij." }, { status: 409 });
    }

    const advice = buildMatchAdvice(rood, blauw, mm.evenement_datum);

    const { data: last, error: lastErr } = await supabaseAdmin
      .from("matchmaker_matches")
      .select("partij_nr")
      .eq("matchmaker_matchmaking_id", mmId)
      .order("partij_nr", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastErr) throw lastErr;

    const partijNr = Number(last?.partij_nr ?? 0) + 1;
    const leeftijdType = getLeeftijdType(rood.geboortedatum_input, mm.evenement_datum);

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("matchmaker_matches")
      .insert({
        matchmaker_matchmaking_id: mmId,
        created_by: access.userId,
        rood_fighter_id: roodId,
        blauw_fighter_id: blauwId,
        partij_nr: partijNr,
        discipline: rood.discipline ?? blauw.discipline ?? null,
        klasse: rood.klasse ?? blauw.klasse ?? null,
        geslacht: rood.geslacht ?? blauw.geslacht ?? null,
        leeftijd_type: leeftijdType,
        gewicht_rood: rood.gewicht ?? null,
        gewicht_blauw: blauw.gewicht ?? null,
        age_diff_days: advice.leeftijd_diff_days,
        weight_diff: advice.gewicht_diff,
        advice: advice.advies,
        warnings: advice.warnings,
        status: advice.advies === "afkeur" ? "blocked" : "draft",
        notes,
        extra: {
          leeftijd_diff_label: advice.leeftijd_diff_label,
          rood_inschrijving_id: rood.inschrijving_id ?? null,
          blauw_inschrijving_id: blauw.inschrijving_id ?? null,
        },
      })
      .select("id, partij_nr, advice, warnings")
      .single();

    if (insErr) throw insErr;

    await supabaseAdmin
      .from("matchmaker_matchmakings")
      .update({ status: "matching" })
      .eq("id", mmId);

    return NextResponse.json({ ok: true, match: inserted });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
