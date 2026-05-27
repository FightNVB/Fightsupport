import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  assertCanAccessMatchmaking,
  getUserBondteam,
  requireUserWithRole,
} from "@/app/api/_utils/authz";
import { transferLifecycle } from "@/app/api/_utils/matchmakingLifecycle";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function norm(v: unknown) {
  return s(v).toLowerCase();
}

function upper(v: unknown) {
  return s(v).toUpperCase();
}

function n(v: unknown, fallback = 0) {
  const x = Number(v ?? fallback);
  return Number.isFinite(x) ? x : fallback;
}

function jsonError(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, extra }, { status });
}

type ControleRow = {
  partij_nr: number | string | null;
  source_id: string | null;
  source_table: string | null;
  toernooi_code?: string | null;
  va_nummer?: string | number | null;
  fighter_id?: string | null;
  vechter_id?: string | null;
  rood_va?: string | number | null;
  blauw_va?: string | number | null;
  rule: string | null;
  rule_code: string | null;
  resultaat: string | null;
  severity?: string | null;
  actie_status: string | null;
  review_status?: string | null;
  hoek: string | null;
};

type PartyDecision = {
  blocked: boolean;
  blockedReasons: string[];
  roodMinpunten: number;
  blauwMinpunten: number;
  hasControle: boolean;
};

function isApprovedOverride(row: ControleRow) {
  const status = norm(row.actie_status);
  return ["goedgekeurd", "approved", "akkoord", "ok"].includes(status);
}

function isAfkeur(row: ControleRow) {
  const resultaat = norm(row.resultaat);
  const ruleCode = upper(row.rule_code);
  return resultaat === "afkeur" || resultaat === "afgekeurd" || ruleCode === "AFKEUR";
}

function isDispensatie(row: ControleRow) {
  const rule = norm(row.rule);
  const code = upper(row.rule_code);
  return rule.includes("dispensatie") || code.includes("DISPENSATIE") || code === "VERLEEND";
}

function isDispensatieVerleend(row: ControleRow) {
  return upper(row.rule_code) === "VERLEEND";
}

function isInfo(row: ControleRow) {
  return norm(row.resultaat) === "info" || upper(row.severity) === "INFO";
}

function isOk(row: ControleRow) {
  return norm(row.resultaat) === "ok" || upper(row.rule_code) === "OK";
}

function isOpenReview(v: unknown) {
  const x = upper(v);
  return x === "OPEN" || x === "PENDING" || x === "WACHT" || x === "WACHTEND";
}

function hasVerbod(row: ControleRow) {
  const combined = `${upper(row.rule)} ${upper(row.rule_code)} ${upper(row.resultaat)}`;
  return combined.includes("STARTVERBOD") || combined.includes("VERBOD");
}

function normVa(v: unknown) {
  const digits = s(v).replace(/\D/g, "").replace(/^0+/, "");
  return digits || s(v);
}

function tournamentCode(v: unknown) {
  return upper(v);
}

function rowTournamentKey(row: ControleRow) {
  const code = tournamentCode(row.toernooi_code);
  if (!code) return null;

  const id = normVa(row.va_nummer) || s(row.fighter_id) || s(row.vechter_id) || normVa(row.source_id);
  if (!id) return null;

  return `T:${code}:${id}`;
}

function rawTournamentKeys(row: any) {
  const code = tournamentCode(row.toernooi_code);
  if (!code) return [];

  const ids = [
    row.va_nummer,
    row.va,
    row.fighter_va,
    row.vechter_va,
    row.fighter_id,
    row.vechter_id,
    row.id,
  ]
    .map((x) => normVa(x) || s(x))
    .filter(Boolean);

  return Array.from(new Set(ids.map((id) => `T:${code}:${id}`)));
}

function minpuntHoek(row: ControleRow): "rood" | "blauw" | null {
  const code = upper(row.rule_code);
  const hoek = norm(row.hoek);

  if (hoek === "rood" || code.includes("ROOD")) return "rood";
  if (hoek === "blauw" || code.includes("BLAUW")) return "blauw";
  return null;
}

function applyControleRowToDecision(row: ControleRow, decision: PartyDecision) {
  decision.hasControle = true;

  const resultaat = norm(row.resultaat);
  const code = upper(row.rule_code);
  const rule = norm(row.rule);

  if (resultaat === "actie" && (rule.includes("minpunt") || code.includes("MINPUNT"))) {
    const hoek = minpuntHoek(row);
    if (hoek === "rood") decision.roodMinpunten += 1;
    if (hoek === "blauw") decision.blauwMinpunten += 1;
    return;
  }

  // Alleen OK en INFO mogen door. Alles anders blokkeert, ook bij toernooi-vechters.
  if (isInfo(row) || isOk(row)) return;

  if (hasVerbod(row)) {
    decision.blocked = true;
    decision.blockedReasons.push("Verbod/startverbod aanwezig");
    return;
  }

  if (isAfkeur(row) && !isApprovedOverride(row)) {
    decision.blocked = true;
    decision.blockedReasons.push("AFKEUR zonder actie_status goedgekeurd");
    return;
  }

  if (isDispensatie(row) && !isDispensatieVerleend(row)) {
    decision.blocked = true;
    decision.blockedReasons.push("Dispensatie niet verleend");
    return;
  }

  if (resultaat === "actie" || isOpenReview(row.actie_status) || isOpenReview(row.review_status)) {
    decision.blocked = true;
    decision.blockedReasons.push("Open actiepunt of review aanwezig");
    return;
  }

  decision.blocked = true;
  decision.blockedReasons.push(`Controle-status blokkeert: ${s(row.resultaat) || s(row.rule_code) || "onbekend"}`);
}

function buildDecisions(rows: ControleRow[]) {
  const byPartij = new Map<number, PartyDecision>();
  const byTournamentFighter = new Map<string, PartyDecision>();

  function newDecision(): PartyDecision {
    return {
      blocked: false,
      blockedReasons: [],
      roodMinpunten: 0,
      blauwMinpunten: 0,
      hasControle: false,
    };
  }

  function ensurePartij(partijNr: number) {
    const current = byPartij.get(partijNr);
    if (current) return current;
    const next = newDecision();
    byPartij.set(partijNr, next);
    return next;
  }

  function ensureTournamentFighter(key: string) {
    const current = byTournamentFighter.get(key);
    if (current) return current;
    const next = newDecision();
    byTournamentFighter.set(key, next);
    return next;
  }

  for (const row of rows) {
    const tKey = rowTournamentKey(row);
    if (tKey) {
      applyControleRowToDecision(row, ensureTournamentFighter(tKey));
      continue;
    }

    const partijNr = n(row.partij_nr, 0);
    if (!partijNr) continue;

    applyControleRowToDecision(row, ensurePartij(partijNr));
  }

  return { byPartij, byTournamentFighter };
}

function rawRowDecision(row: any, decisions: ReturnType<typeof buildDecisions>) {
  const partijNr = n(row.partij_nr, 0);

  // Toernooi-vechters staan op partij_nr 0 en moeten per toernooi_code + VA/fighter_id geblokkeerd worden.
  if (partijNr === 0 || tournamentCode(row.toernooi_code)) {
    const keys = rawTournamentKeys(row);
    const found = keys
      .map((key) => decisions.byTournamentFighter.get(key))
      .find(Boolean);
    return found ?? null;
  }

  return decisions.byPartij.get(partijNr) ?? null;
}

function rawRowStatusOkOrInfo(row: any) {
  const status = upper(row.eindstatus ?? row.status ?? row.controle_status ?? row.resultaat);
  return status === "OK" || status === "INFO";
}

function isTournamentRawRow(row: any) {
  return n(row.partij_nr, 0) === 0 || !!tournamentCode(row.toernooi_code);
}

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await requireUserWithRole(req);
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmaking_id);

    if (!matchmakingId) return jsonError("matchmaking_id ontbreekt.");

    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });

    const userBondteam = await getUserBondteam(userId);
    const isAllowedRole = ["admin", "superadmin", "hoofdofficial", "official"].includes(role);

    if (!isAllowedRole || (!userBondteam && role !== "admin" && role !== "superadmin")) {
      return jsonError("Alleen bondteam/officiële gebruikers of admin mogen naar uitslagen sturen.", 403);
    }

    const { data: rawBouts, error: rawErr } = await supabaseAdmin
      .from("matchmaking_bouts_raw")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .or("verwijderd.is.null,verwijderd.eq.false")
      .order("partij_nr", { ascending: true });

    if (rawErr) throw rawErr;
    if (!rawBouts?.length) {
      return jsonError("Geen actieve partijen gevonden in matchmaking_bouts_raw.", 404);
    }

    const { data: controleRows, error: controleErr } = await supabaseAdmin
      .from("controle_resultaten")
      .select("partij_nr,source_id,source_table,toernooi_code,va_nummer,fighter_id,vechter_id,rood_va,blauw_va,rule,rule_code,resultaat,severity,actie_status,review_status,hoek")
      .eq("matchmaking_id", matchmakingId)
      .in("source_table", ["weigh_in_bouts", "matchmaking_bouts_raw"]);

    if (controleErr) throw controleErr;

    const decisions = buildDecisions((controleRows ?? []) as ControleRow[]);

    const eligible = rawBouts.filter((row: any) => {
      const decision = rawRowDecision(row, decisions);

      // Hoofdregel: alleen status OK of INFO mag door.
      // Normale partijen gebruiken eindstatus/status op matchmaking_bouts_raw + partij_nr-controle.
      // Toernooi-vechters gebruiken controle_resultaten per toernooi_code + VA/fighter_id, omdat partij_nr daar 0 is.
      if (isTournamentRawRow(row) && decision?.hasControle) return !decision.blocked;
      if (!rawRowStatusOkOrInfo(row)) return false;
      if (decision?.blocked) return false;

      return true;
    });

    if (!eligible.length) {
      return jsonError("Geen goedgekeurde partijen gevonden voor uitslagen.", 409, {
        total_count: rawBouts.length,
        controle_count: controleRows?.length ?? 0,
      });
    }

    let uitslagenRunId: string;
    const { data: existingRun, error: existingRunErr } = await supabaseAdmin
      .from("uitslagen_runs")
      .select("id")
      .eq("matchmaking_id", matchmakingId)
      .maybeSingle();

    if (existingRunErr) throw existingRunErr;

    if (existingRun?.id) {
      uitslagenRunId = String(existingRun.id);
      await supabaseAdmin.from("uitslagen_resultaten").delete().eq("matchmaking_id", matchmakingId);
      await supabaseAdmin.from("uitslagen_bouts").delete().eq("matchmaking_id", matchmakingId);
    } else {
      const { data: insertedRun, error: insRunErr } = await supabaseAdmin
        .from("uitslagen_runs")
        .insert({ matchmaking_id: matchmakingId, created_by: userId, status: "open", bron: "matchmaking" })
        .select("id")
        .single();

      if (insRunErr) throw insRunErr;
      uitslagenRunId = String(insertedRun.id);
    }

    const nowIso = new Date().toISOString();
    const boutInsertRows = eligible.map((row: any) => {
      const decision = rawRowDecision(row, decisions);
      const roodMinpunten = n(row.rood_minpunten ?? row.rood_min_punten ?? row.rood_strafpunten ?? row.gewicht_strafpunt_rood, 0) + (decision?.roodMinpunten ?? 0);
      const blauwMinpunten = n(row.blauw_minpunten ?? row.blauw_min_punten ?? row.blauw_strafpunten ?? row.gewicht_strafpunt_blauw, 0) + (decision?.blauwMinpunten ?? 0);

      return {
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
        rood_va: row.va_rood ?? row.rood_va ?? row.rood_va_nummer ?? null,
        rood_geboortedatum: row.rood_geboortedatum ?? null,
        rood_gewicht_opgegeven: row.rood_gewicht ?? null,
        rood_gewicht_gewogen: row.rood_gewogen_gewicht ?? null,
        blauw_naam: row.blauw_naam ?? null,
        blauw_gym: row.blauw_gym ?? null,
        blauw_va: row.va_blauw ?? row.blauw_va ?? row.blauw_va_nummer ?? null,
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
        gewicht_strafpunt_rood: roodMinpunten,
        gewicht_strafpunt_blauw: blauwMinpunten,
        weging_notitie: row.weging_notitie ?? null,
        verwijderd: false,
        created_at: nowIso,
      };
    });

    const { data: insertedBouts, error: insBoutsErr } = await supabaseAdmin
      .from("uitslagen_bouts")
      .insert(boutInsertRows)
      .select("id, partij_nr");

    if (insBoutsErr) throw insBoutsErr;

    const resultRows = (insertedBouts ?? []).map((b: any) => ({
      uitslagen_bout_id: b.id,
      uitslagen_run_id: uitslagenRunId,
      matchmaking_id: matchmakingId,
      uitslag_status: "concept",
      resultaat_type: null,
      winnaar_hoek: null,
      methode: null,
      ronde: null,
      tijd_in_ronde: null,
      opmerkingen: null,
      ingevuld_door: null,
      ingevuld_op: null,
      created_at: nowIso,
      updated_at: nowIso,
    }));

    const { error: insResultsErr } = await supabaseAdmin
      .from("uitslagen_resultaten")
      .insert(resultRows);

    if (insResultsErr) throw insResultsErr;

    const blockedCount = rawBouts.length - eligible.length;
    const lifecycle = await transferLifecycle({
      matchmakingId,
      newStage: "uitslagen_in_bewerking",
      newOwnerType: "bondteam",
      newOwnerBondteam: userBondteam || s(body?.bondteam) || null,
      actorUserId: userId,
      actorRole: role,
      opmerking: `Alleen partijen/toernooi-vechters met status OK of INFO (${eligible.length}/${rawBouts.length}) zijn doorgestuurd naar uitslagen. Alles behalve OK/INFO, open actie, afkeur of dispensatie is overgeslagen: ${blockedCount}.`,
      metadata: {
        route: "api/matchmaking/naar-uitslagen/route",
        eligible_count: eligible.length,
        total_count: rawBouts.length,
        blocked_count: blockedCount,
        controle_count: controleRows?.length ?? 0,
      },
    });

    await supabaseAdmin
      .from("matchmaking_uploads")
      .update({ flow_status: "in_uitslagen" })
      .eq("matchmaking_id", matchmakingId);

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      uitslagen_run_id: uitslagenRunId,
      bouts: boutInsertRows.length,
      skipped: blockedCount,
      lifecycle,
      message: "Alleen partijen/toernooi-vechters met status OK of INFO zijn omgezet naar uitslagenflow; alles anders is geblokkeerd en minpunten zijn meegenomen.",
    });
  } catch (err: any) {
    console.error("matchmaking/naar-uitslagen POST error:", err);
    return jsonError(err?.message ?? "Onbekende fout.", 500);
  }
}
