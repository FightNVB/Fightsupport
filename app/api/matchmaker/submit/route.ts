import { NextResponse } from "next/server";
import { requireMatchmakerAccess, supabaseAdmin } from "@/lib/matchmaker/access";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mmId = Number(body?.matchmaker_matchmaking_id);
    if (!Number.isFinite(mmId)) {
      return NextResponse.json({ error: "matchmaker_matchmaking_id ontbreekt" }, { status: 400 });
    }

    await requireMatchmakerAccess(req, mmId);

    const { data: mm, error: mmErr } = await supabaseAdmin
      .from("matchmaker_matchmakings")
      .select("*")
      .eq("id", mmId)
      .single();
    if (mmErr) throw mmErr;

    const { data: matches, error: matchErr } = await supabaseAdmin
      .from("matchmaker_matches")
      .select(`
        *,
        rood:rood_fighter_id(*),
        blauw:blauw_fighter_id(*)
      `)
      .eq("matchmaker_matchmaking_id", mmId)
      .order("partij_nr", { ascending: true });

    if (matchErr) throw matchErr;
    if ((matches ?? []).length === 0) {
      return NextResponse.json({ error: "Er zijn nog geen partijen aangemaakt." }, { status: 400 });
    }

    const blocked = (matches ?? []).filter((m: any) => String(m.advice ?? "") === "afkeur" || String(m.status ?? "") === "blocked");
    if (blocked.length > 0) {
      return NextResponse.json({ error: `Er staan nog ${blocked.length} afgekeurde/geblokkeerde partijen open.` }, { status: 400 });
    }

    await supabaseAdmin
      .from("matchmaker_bouts_raw")
      .delete()
      .eq("matchmaker_matchmaking_id", mmId);

    const rows = (matches ?? []).map((m: any) => ({
      matchmaker_matchmaking_id: mmId,
      partij_nr: m.partij_nr,
      rood_inschrijving_id: m.rood?.inschrijving_id ?? null,
      blauw_inschrijving_id: m.blauw?.inschrijving_id ?? null,
      discipline: m.discipline ?? null,
      klasse: m.klasse ?? null,
      geslacht: m.geslacht ?? null,
      leeftijd_type: m.leeftijd_type ?? null,
      rood_naam: m.rood?.naam_input ?? null,
      blauw_naam: m.blauw?.naam_input ?? null,
      rood_gym: m.rood?.gym_input ?? null,
      blauw_gym: m.blauw?.gym_input ?? null,
      rood_va: m.rood?.va_nummer ?? null,
      blauw_va: m.blauw?.va_nummer ?? null,
      rood_gewicht: m.rood?.gewicht ?? null,
      blauw_gewicht: m.blauw?.gewicht ?? null,
      created_by: mm.created_by ?? null,
      status: "submitted",
      source_match_id: m.id,
      submitted_at: new Date().toISOString(),
      raw: {
        advice: m.advice ?? null,
        warnings: m.warnings ?? [],
        notes: m.notes ?? null,
        rood_context: m.rood ?? null,
        blauw_context: m.blauw ?? null,
      },
    }));

    const { error: insErr } = await supabaseAdmin.from("matchmaker_bouts_raw").insert(rows);
    if (insErr) throw insErr;

    const { error: updErr } = await supabaseAdmin
      .from("matchmaker_matchmakings")
      .update({
        status: "submitted",
        sent_to_nvb_at: new Date().toISOString(),
      })
      .eq("id", mmId);

    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, submitted_matches: rows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
