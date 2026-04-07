import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, getUserBondteam, requireUserWithRole } from "@/app/api/_utils/authz";
import { transferLifecycle } from "@/app/api/_utils/matchmakingLifecycle";

export const runtime = "nodejs";
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
function s(v: unknown) { return String(v ?? "").trim(); }
function jsonError(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await requireUserWithRole(req);
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmaking_id);
    if (!matchmakingId) return jsonError("matchmaking_id ontbreekt.");
    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });

    const userBondteam = await getUserBondteam(userId);
    if (!(role === "admin" || role === "superadmin" || role === "hoofdofficial" || role === "official") || (!userBondteam && role !== "admin" && role !== "superadmin")) {
      return jsonError("Alleen bondteam/officiële gebruikers of admin mogen naar uitslagen sturen.", 403);
    }

    const { data: rawBouts, error: rawErr } = await supabaseAdmin
      .from("matchmaking_bouts_raw")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .or("verwijderd.is.null,verwijderd.eq.false")
      .order("partij_nr", { ascending: true });
    if (rawErr) throw rawErr;
    if (!rawBouts?.length) return jsonError("Geen actieve partijen gevonden in matchmaking_bouts_raw.", 404);

    const allowedStatuses = new Set(["OK"]);
    const eligible = rawBouts.filter((r: any) => allowedStatuses.has(s(r.eindstatus).toUpperCase()));
    if (!eligible.length) return jsonError("Geen partijen met status OK gevonden voor uitslagen.", 409);

    let uitslagenRunId: string;
    const { data: existingRun, error: existingRunErr } = await supabaseAdmin.from("uitslagen_runs").select("id").eq("matchmaking_id", matchmakingId).maybeSingle();
    if (existingRunErr) throw existingRunErr;
    if (existingRun?.id) {
      uitslagenRunId = String(existingRun.id);
      await supabaseAdmin.from("uitslagen_resultaten").delete().eq("matchmaking_id", matchmakingId);
      await supabaseAdmin.from("uitslagen_bouts").delete().eq("matchmaking_id", matchmakingId);
    } else {
      const { data: insertedRun, error: insRunErr } = await supabaseAdmin.from("uitslagen_runs").insert({ matchmaking_id: matchmakingId, created_by: userId, status: "open", bron: "matchmaking" }).select("id").single();
      if (insRunErr) throw insRunErr;
      uitslagenRunId = String(insertedRun.id);
    }

    const nowIso = new Date().toISOString();
    const boutInsertRows = eligible.map((row: any) => ({
      uitslagen_run_id: uitslagenRunId,
      matchmaking_id: matchmakingId,
      bron_bout_id: row.id,
      partij_nr: row.partij_nr,
      original_partij_nr: row.original_partij_nr ?? row.partij_nr,
      discipline: row.discipline ?? null,
      sub_discipline: row.sub_discipline ?? null,
      klasse: row.klasse ?? null,
      leeftijd_type: row.leeftijd_type ?? null,
      geslacht: row.geslacht ?? null,
      rood_naam: row.rood_naam ?? null,
      rood_gym: row.rood_gym ?? null,
      rood_va: row.va_rood ?? null,
      rood_geboortedatum: row.rood_geboortedatum ?? null,
      rood_gewicht_opgegeven: row.rood_gewicht ?? null,
      rood_gewicht_gewogen: row.rood_gewogen_gewicht ?? null,
      blauw_naam: row.blauw_naam ?? null,
      blauw_gym: row.blauw_gym ?? null,
      blauw_va: row.va_blauw ?? null,
      blauw_geboortedatum: row.blauw_geboortedatum ?? null,
      blauw_gewicht_opgegeven: row.blauw_gewicht ?? null,
      blauw_gewicht_gewogen: row.blauw_gewogen_gewicht ?? null,
      max_gewicht: row.max_gewicht ?? null,
      max_gewicht_notatie: row.max_gewicht_notatie ?? null,
      max_gewicht_type: row.max_gewicht_type ?? null,
      eindstatus: row.eindstatus ?? null,
      dispensatie_nodig: !!row.dispensatie_nodig,
      dispensatie_verleend: !!row.dispensatie_verleend,
      dispensatie_reason: row.dispensatie_reason ?? null,
      gewicht_strafpunt_rood: Number(row.gewicht_strafpunt_rood ?? 0),
      gewicht_strafpunt_blauw: Number(row.gewicht_strafpunt_blauw ?? 0),
      weging_notitie: row.weging_notitie ?? null,
      verwijderd: false,
      created_at: nowIso,
    }));
    const { data: insertedBouts, error: insBoutsErr } = await supabaseAdmin.from("uitslagen_bouts").insert(boutInsertRows).select("id, partij_nr");
    if (insBoutsErr) throw insBoutsErr;
    const resultRows = (insertedBouts ?? []).map((b: any) => ({ uitslagen_bout_id: b.id, uitslagen_run_id: uitslagenRunId, matchmaking_id: matchmakingId, uitslag_status: "concept", resultaat_type: null, winnaar_hoek: null, methode: null, ronde: null, tijd_in_ronde: null, opmerkingen: null, ingevuld_door: null, ingevuld_op: null, created_at: nowIso, updated_at: nowIso }));
    const { error: insResultsErr } = await supabaseAdmin.from("uitslagen_resultaten").insert(resultRows);
    if (insResultsErr) throw insResultsErr;

    const lifecycle = await transferLifecycle({ matchmakingId, newStage: "klaar_voor_uitslagen", newOwnerType: "bondteam", newOwnerBondteam: userBondteam || s(body?.bondteam) || null, actorUserId: userId, actorRole: role, opmerking: `Alleen partijen met status OK (${eligible.length}/${rawBouts.length}) zijn doorgestuurd naar uitslagen.`, metadata: { route: "api/matchmaking/naar-uitslagen/route", eligible_count: eligible.length, total_count: rawBouts.length } });
    await supabaseAdmin.from("matchmaking_uploads").update({ flow_status: "in_uitslagen" }).eq("matchmaking_id", matchmakingId);

    return NextResponse.json({ ok: true, matchmaking_id: matchmakingId, uitslagen_run_id: uitslagenRunId, bouts: boutInsertRows.length, lifecycle, message: "OK-partijen zijn omgezet naar uitslagenflow." });
  } catch (err: any) {
    console.error("matchmaking/naar-uitslagen POST error:", err);
    return jsonError(err?.message ?? "Onbekende fout.", 500);
  }
}
