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

function parseRawJson(v: any): any {
  if (!v) return {};
  if (typeof v === "object") return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return {};
  }
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

async function cleanupOldUitslagenData(matchmakingId: string) {
  // Bij opnieuw klaarzetten van uitslagen moet de uitslagenflow volledig vers zijn.
  // Eerst oude talentstatus-regels uit uitslagen verwijderen, daarna resultaten en bouts.
  // Let op: handmatig ingeboekte talentstatus-partijen blijven staan, want die hebben geen bron=uitslagen.
  const { error: oldTalentstatusErr } = await supabaseAdmin
    .from("talentstatus_partijen")
    .delete()
    .eq("matchmaking_id", matchmakingId)
    .eq("bron", "uitslagen");

  if (oldTalentstatusErr) throw oldTalentstatusErr;

  const { error: oldResultsErr } = await supabaseAdmin
    .from("uitslagen_resultaten")
    .delete()
    .eq("matchmaking_id", matchmakingId);

  if (oldResultsErr) throw oldResultsErr;

  const { error: oldBoutsErr } = await supabaseAdmin
    .from("uitslagen_bouts")
    .delete()
    .eq("matchmaking_id", matchmakingId);

  if (oldBoutsErr) throw oldBoutsErr;
}

type ControleRow = {
  partij_nr: number | string | null;
  bout_id?: string | null;
  source_id: string | null;
  source_table: string | null;
  toernooi_code?: string | null;
  va_nummer?: string | number | null;
  toernooi_va_nummer?: string | number | null;
  fighter_id?: string | null;
  rule: string | null;
  rule_code: string | null;
  resultaat: string | null;
  severity?: string | null;
  actie_status: string | null;
  review_status?: string | null;
  hoek: string | null;
  boodschap?: string | null;
};

type PartyDecision = {
  blocked: boolean;
  blockedReasons: string[];
  roodMinpunten: number;
  blauwMinpunten: number;
  hasControle: boolean;
  roodWarning: boolean;
  blauwWarning: boolean;
  algemeneWarning: boolean;
  warningReasons: string[];
};

function isApprovedOverride(row: ControleRow) {
  const actieStatus = norm(row.actie_status);
  const reviewStatus = norm(row.review_status);
  return [actieStatus, reviewStatus].some((status) =>
    ["goedgekeurd", "approved", "akkoord", "ok"].includes(status),
  );
}

function isResolvedControleRow(row: ControleRow) {
  return (
    isApprovedOverride(row) ||
    norm(row.resultaat) === "ok" ||
    norm(row.resultaat) === "info" ||
    upper(row.rule_code) === "OK" ||
    upper(row.severity) === "INFO"
  );
}

function controleResolutionKey(row: ControleRow) {
  const partijNr = n(row.partij_nr, 0);
  const boutId = s(row.bout_id) || s(row.source_id);
  const toernooiCode = tournamentCode(row.toernooi_code);
  const va = normVa(row.toernooi_va_nummer) || normVa(row.va_nummer) || s(row.fighter_id);
  const ruleKey = upper(row.rule_code) || upper(row.rule) || upper((row as any).boodschap);
  const hoek = upper(row.hoek);

  if (toernooiCode && va) return `T:${toernooiCode}:${va}:R:${ruleKey}:H:${hoek}`;
  if (boutId) return `B:${boutId}:R:${ruleKey}:H:${hoek}`;
  if (partijNr) return `P:${partijNr}:R:${ruleKey}:H:${hoek}`;
  return `R:${ruleKey}:H:${hoek}`;
}

function activeControleRowsForDefinitieveLineup(rows: ControleRow[]) {
  const resolvedKeys = new Set<string>();

  for (const row of rows) {
    if (isResolvedControleRow(row)) {
      resolvedKeys.add(controleResolutionKey(row));
    }
  }

  return rows.filter((row) => {
    if (isResolvedControleRow(row)) return false;
    if (resolvedKeys.has(controleResolutionKey(row))) return false;
    return isLineupBlokkadeRow(row);
  });
}

function isAfkeur(row: ControleRow) {
  const resultaat = norm(row.resultaat);
  const ruleCode = upper(row.rule_code);
  return (
    resultaat === "afkeur" || resultaat === "afgekeurd" || ruleCode === "AFKEUR"
  );
}

function isDispensatie(row: ControleRow) {
  const rule = norm(row.rule);
  const code = upper(row.rule_code);
  return (
    rule.includes("dispensatie") ||
    code.includes("DISPENSATIE") ||
    code === "VERLEEND"
  );
}

function isDispensatieVerleend(row: ControleRow) {
  const result = upper(row.resultaat);
  const code = upper(row.rule_code);
  return (
    result === "VERLEEND" || code === "VERLEEND" || isApprovedOverride(row)
  );
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
  const combined = `${upper(row.rule)} ${upper(row.rule_code)} ${upper(row.resultaat)} ${upper((row as any).boodschap)}`;
  return combined.includes("STARTVERBOD") || combined.includes("VERBOD");
}

function isHardNoRow(row: ControleRow) {
  const combined = `${upper(row.rule)} ${upper(row.rule_code)} ${upper(row.resultaat)} ${upper((row as any).boodschap)}`;

  // Zelfde basis als voorlopige lineup: alleen verbod/startverbod houdt een partij volledig tegen.
  // Licentie/keurmerk is geen harde blokkade voor de voorlopige set; die wordt pas hieronder
  // gebruikt als open melding om uit de definitieve jury-lineup te filteren.
  return combined.includes("STARTVERBOD") || combined.includes("VERBOD");
}


function isLicentieOfKeurmerkRow(row: ControleRow) {
  const combined = `${upper(row.rule)} ${upper(row.rule_code)} ${upper(row.resultaat)} ${upper((row as any).boodschap)}`;
  return (
    combined.includes("LICENTIE") ||
    combined.includes("KEURMERK") ||
    combined.includes("GEEN_LICENTIE") ||
    combined.includes("GEEN_KEURMERK")
  );
}

function isOpenLicentieOfKeurmerkRow(row: ControleRow) {
  if (!isLicentieOfKeurmerkRow(row)) return false;
  if (isResolvedControleRow(row)) return false;
  return true;
}

function warningHoek(row: ControleRow): "rood" | "blauw" | null {
  const hoek = norm(row.hoek);
  const combined = `${upper(row.rule)} ${upper(row.rule_code)} ${upper((row as any).boodschap)}`;
  if (hoek === "rood" || combined.includes("ROOD")) return "rood";
  if (hoek === "blauw" || combined.includes("BLAUW")) return "blauw";
  return null;
}

function isLineupBlokkadeRow(row: ControleRow) {
  if (isResolvedControleRow(row)) return false;

  // Definitieve/jury lineup en naar-uitslagen = voorlopige lineup minus ALLE open meldingen.
  // Alleen een echte minpunt-regel mag mee, want dat is een strafpunt en geen blokkade/melding.
  if (isActieMinpunt(row)) return false;

  return true;
}

function isActieMinpunt(row: ControleRow) {
  const resultaat = norm(row.resultaat);
  const code = upper(row.rule_code);
  const rule = norm(row.rule);
  const msg = norm((row as any).boodschap);
  return resultaat === "actie" && (rule.includes("minpunt") || code.includes("MINPUNT") || msg.includes("minpunt"));
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

  const id =
    normVa(row.toernooi_va_nummer) ||
    normVa(row.va_nummer) ||
    s(row.fighter_id) ||
    normVa(row.source_id);
  if (!id) return null;

  return `T:${code}:${id}`;
}

function rawTournamentKeys(row: any) {
  const code = tournamentCode(
    row.toernooi_code ?? parseRawJson(row.raw_json)?.toernooi_code,
  );
  if (!code) return [];

  const ids = [
    row.toernooi_va_nummer,
    row.va_nummer,
    row.va,
    row.fighter_va,
    row.vechter_va,
    row.fighter_id,
    row.rood_va,
    row.blauw_va,
    row.va_rood,
    row.va_blauw,
    row.rood_va_nummer,
    row.blauw_va_nummer,
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

function rawRowKeys(row: any) {
  const keys = new Set<string>();
  const partijNr = n(row.partij_nr, 0);

  if (row.id) keys.add(`ID:${s(row.id)}`);
  if (row.bout_id) keys.add(`ID:${s(row.bout_id)}`);
  if (partijNr) keys.add(`P:${partijNr}`);

  return Array.from(keys);
}

function controleRowKeys(row: ControleRow) {
  const keys = new Set<string>();
  const partijNr = n(row.partij_nr, 0);
  const sourceTable = norm(row.source_table);

  // Weegstation-regels en minpunten koppelen alleen via partij_nr.
  // source_id is bij weigh_in_bouts niet hetzelfde als matchmaking_bouts_raw.id.
  // Dit voorkomt dubbele minpunten via ID én P.
  if (sourceTable === "weigh_in_bouts" || norm(row.rule).startsWith("weegstation") || isActieMinpunt(row)) {
    if (partijNr) keys.add(`P:${partijNr}`);
    return Array.from(keys);
  }

  if (row.bout_id) keys.add(`ID:${s(row.bout_id)}`);
  if (row.source_id) keys.add(`ID:${s(row.source_id)}`);

  // Belangrijk: harde blokkerende regels moeten altijd ook via partij_nr gekoppeld worden.
  // Anders kan een sportschool zonder keurmerk/licentie/startverbod toch door als source_id
  // niet exact matcht met matchmaking_bouts_raw.id.
  if (partijNr) keys.add(`P:${partijNr}`);

  return Array.from(keys);
}

function mergeDecision(target: PartyDecision, source: PartyDecision) {
  target.blocked = target.blocked || source.blocked;
  target.hasControle = target.hasControle || source.hasControle;
  target.roodMinpunten += source.roodMinpunten;
  target.blauwMinpunten += source.blauwMinpunten;
  target.roodWarning = target.roodWarning || source.roodWarning;
  target.blauwWarning = target.blauwWarning || source.blauwWarning;
  target.algemeneWarning = target.algemeneWarning || source.algemeneWarning;
  target.blockedReasons.push(...source.blockedReasons);
  target.warningReasons.push(...source.warningReasons);
}

function addWarningReason(decision: PartyDecision, row: ControleRow, fallback = "Open melding") {
  const msg = s((row as any).boodschap) || s(row.rule) || s(row.rule_code) || fallback;
  const key = msg.replace(/\s+/g, " ").trim().toLowerCase();
  if (!key) return;
  const exists = decision.warningReasons.some(
    (x) => x.replace(/\s+/g, " ").trim().toLowerCase() === key,
  );
  if (!exists) decision.warningReasons.push(msg);
}

function applyControleRowToDecision(row: ControleRow, decision: PartyDecision) {
  decision.hasControle = true;

  // Goedgekeurde/naar OK/INFO gezette regels zijn afgehandeld en mogen niet meer als melding meetellen.
  if (isResolvedControleRow(row)) return;

  // Minpunt is geen open melding voor lineup-filtering; dit gaat alleen naar de kolom Min punt.
  if (isActieMinpunt(row)) {
    const hoek = minpuntHoek(row);
    if (hoek === "rood") decision.roodMinpunten += 1;
    if (hoek === "blauw") decision.blauwMinpunten += 1;
    return;
  }

  // Iedere andere open regel is een melding: zichtbaar in voorlopige lineup en reden om
  // de partij uit definitieve/jury lineup en naar-uitslagen te houden.
  const hoek = warningHoek(row);
  if (hoek === "rood") decision.roodWarning = true;
  else if (hoek === "blauw") decision.blauwWarning = true;
  else decision.algemeneWarning = true;

  addWarningReason(decision, row, "Open melding");

  if (isHardNoRow(row) || hasVerbod(row)) {
    decision.blocked = true;
    decision.blockedReasons.push("Verbod/startverbod aanwezig");
  }
}
function buildDecisions(rows: ControleRow[]) {
  const byKey = new Map<string, PartyDecision>();
  const byTournamentFighter = new Map<string, PartyDecision>();

  function newDecision(): PartyDecision {
    return {
      blocked: false,
      blockedReasons: [],
      roodMinpunten: 0,
      blauwMinpunten: 0,
      hasControle: false,
      roodWarning: false,
      blauwWarning: false,
      algemeneWarning: false,
      warningReasons: [],
    };
  }

  function ensureKey(key: string) {
    const current = byKey.get(key);
    if (current) return current;
    const next = newDecision();
    byKey.set(key, next);
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

    const keys = controleRowKeys(row);
    if (!keys.length) continue;

    for (const key of keys) {
      applyControleRowToDecision(row, ensureKey(key));
    }
  }

  return { byKey, byTournamentFighter, newDecision };
}

function rawRowDecision(
  row: any,
  decisions: ReturnType<typeof buildDecisions>,
) {
  const partijNr = n(row.partij_nr, 0);

  if (
    partijNr === 0 ||
    tournamentCode(
      row.toernooi_code ?? parseRawJson(row.raw_json)?.toernooi_code,
    )
  ) {
    const keys = rawTournamentKeys(row);
    const merged = decisions.newDecision();
    for (const key of keys) {
      const found = decisions.byTournamentFighter.get(key);
      if (found) mergeDecision(merged, found);
    }
    return merged.hasControle ? merged : null;
  }

  const merged = decisions.newDecision();
  for (const key of rawRowKeys(row)) {
    const found = decisions.byKey.get(key);
    if (found) mergeDecision(merged, found);
  }

  return merged.hasControle ? merged : null;
}

function hasValue(v: any): boolean {
  return v != null && String(v).trim() !== "";
}

function licenseValueToKnown(v: any): boolean {
  if (v == null) return false;
  if (typeof v === "boolean" || typeof v === "number") return true;
  return String(v).trim() !== "";
}

function hasScrapeInfoForSide(row: any, side: "rood" | "blauw") {
  return (
    hasValue(row?.[`${side}_naam_fp`]) ||
    hasValue(row?.[`${side}_geboortedatum_fp`]) ||
    hasValue(row?.[`${side}_geboortedatum`]) ||
    licenseValueToKnown(
      row?.[`${side}_licentie`] ??
        row?.[`${side}_licentie_ok`] ??
        row?.[`${side}_licentie_geldig`] ??
        row?.[`${side}_licentie_status`] ??
        row?.[`${side}_licentie_fp`] ??
        row?.[`${side}_licentie_ja_nee`],
    ) ||
    hasValue(row?.[`${side}_totaal_wedstrijden`]) ||
    hasValue(row?.[`${side}_nulmeting_totaal`])
  );
}

function isContextCompleet(row: any): boolean {
  const roodVa =
    row?.rood_va_mm ?? row?.va_rood ?? row?.rood_va ?? row?.rood_va_nummer;
  const blauwVa =
    row?.blauw_va_mm ?? row?.va_blauw ?? row?.blauw_va ?? row?.blauw_va_nummer;
  const roodNaam = row?.rood_naam_fp ?? row?.rood_naam_mm ?? row?.rood_naam;
  const blauwNaam = row?.blauw_naam_fp ?? row?.blauw_naam_mm ?? row?.blauw_naam;

  return (
    hasValue(roodVa) &&
    hasValue(blauwVa) &&
    hasValue(roodNaam) &&
    hasValue(blauwNaam) &&
    hasScrapeInfoForSide(row, "rood") &&
    hasScrapeInfoForSide(row, "blauw")
  );
}

function rowStatusForUitslagen(row: any) {
  return norm(
    row?.eindstatus ??
      row?.weegstation_status ??
      row?.controle_status ??
      row?.status ??
      row?.resultaat ??
      parseRawJson(row?.raw_json)?.eindstatus ??
      parseRawJson(row?.raw_json)?.status,
  );
}

function isRowOkOrInfo(row: any) {
  const status = rowStatusForUitslagen(row);
  return ["ok", "info", "goedgekeurd", "approved", "akkoord"].includes(status);
}

function isEligibleForLineup(
  row: any,
  decisions: ReturnType<typeof buildDecisions>,
) {
  // Definitieve lineup = voorlopige lineup minus partijen met echte open meldingen.
  // Daarom niet opnieuw streng filteren op context/OK-status; alleen blokkades tellen.
  const decision = rawRowDecision(row, decisions);
  return !decision?.blocked;
}

function warningText(decision: PartyDecision | null) {
  if (!decision) return "";
  const seen = new Set<string>();
  const reasons: string[] = [];

  for (const reason of decision.warningReasons) {
    const clean = s(reason).replace(/\s+/g, " ").trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    reasons.push(clean);
  }

  return reasons.join(" | ");
}

function minpuntenFromDecision(
  b: any,
  decision: PartyDecision | null,
): { rood: number; blauw: number } {
  return {
    rood:
      n(
        b.rood_minpunten ??
          b.rood_min_punten ??
          b.rood_strafpunten ??
          b.gewicht_strafpunt_rood,
        0,
      ) + (decision?.roodMinpunten ?? 0),
    blauw:
      n(
        b.blauw_minpunten ??
          b.blauw_min_punten ??
          b.blauw_strafpunten ??
          b.gewicht_strafpunt_blauw,
        0,
      ) + (decision?.blauwMinpunten ?? 0),
  };
}

function getMinPuntForLineup(b: any, decision: PartyDecision | null): string {
  const mp = minpuntenFromDecision(b, decision);
  const parts = [];
  if (mp.rood > 0) parts.push(`Rood -${mp.rood}`);
  if (mp.blauw > 0) parts.push(`Blauw -${mp.blauw}`);
  return parts.join(" | ");
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

    const { data: weighRows, error: weighErr } = await supabaseAdmin
      .from("weigh_in_bouts")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .order("partij_nr", { ascending: true });

    if (weighErr) throw weighErr;

    let rawBouts = weighRows ?? [];

    // Weegstation is optioneel. Als er geen weegstationpartijen zijn, gebruiken we
    // de oorspronkelijke matchmakingpartijen als bron voor de uitslagenflow.
    if (!rawBouts.length) {
      const { data: matchmakingRows, error: matchmakingErr } = await supabaseAdmin
        .from("matchmaking_bouts_raw")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .order("partij_nr", { ascending: true });

      if (matchmakingErr) throw matchmakingErr;
      rawBouts = matchmakingRows ?? [];
    }

    if (!rawBouts.length) {
      return jsonError("Geen partijen gevonden voor de uitslagenflow.", 404);
    }

    const { data: controleRows, error: controleErr } = await supabaseAdmin
      .from("controle_resultaten")
      .select("partij_nr,bout_id,source_id,source_table,toernooi_code,toernooi_va_nummer,va_nummer,fighter_id,rule,rule_code,resultaat,severity,actie_status,review_status,hoek")
      .eq("matchmaking_id", matchmakingId);

    if (controleErr) throw controleErr;

    const activeControleRows = activeControleRowsForDefinitieveLineup(
      (controleRows ?? []) as ControleRow[],
    );

    const decisions = buildDecisions(activeControleRows);

    // Naar uitslagen moet exact dezelfde selectie en volgorde gebruiken als de definitieve jury-lineup.
    // Definitieve lineup = rawBouts op partij_nr-volgorde minus partijen met verbod/startverbod
    // en minus partijen met een echte open licentie/keurmerk-melding.
    const eligible = rawBouts.filter((row: any) => {
      if (!isEligibleForLineup(row, decisions)) return false;
      const decision = rawRowDecision(row, decisions);
      return !warningText(decision);
    });

    if (!eligible.length) {
      return jsonError("Geen partijen geschikt voor uitslagen. De selectie is gelijk aan de definitieve jury-lineup.", 409, {
        total_count: rawBouts.length,
        controle_count: controleRows?.length ?? 0,
        active_controle_count: activeControleRows.length,
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
      await supabaseAdmin
        .from("uitslagen_runs")
        .update({ status: "open", bron: "matchmaking" })
        .eq("id", uitslagenRunId);
    } else {
      const { data: insertedRun, error: insRunErr } = await supabaseAdmin
        .from("uitslagen_runs")
        .insert({ matchmaking_id: matchmakingId, created_by: userId, status: "open", bron: "matchmaking" })
        .select("id")
        .single();

      if (insRunErr) throw insRunErr;
      uitslagenRunId = String(insertedRun.id);
    }

    await cleanupOldUitslagenData(matchmakingId);

    const nowIso = new Date().toISOString();
    const boutInsertRows = eligible.map((row: any, index: number) => {
      const decision = rawRowDecision(row, decisions);
      const roodMinpunten = n(row.rood_minpunten ?? row.rood_min_punten ?? row.rood_strafpunten ?? row.gewicht_strafpunt_rood, 0) + (decision?.roodMinpunten ?? 0);
      const blauwMinpunten = n(row.blauw_minpunten ?? row.blauw_min_punten ?? row.blauw_strafpunten ?? row.gewicht_strafpunt_blauw, 0) + (decision?.blauwMinpunten ?? 0);

      return {
        uitslagen_run_id: uitslagenRunId,
        matchmaking_id: matchmakingId,
        bron_bout_id: row.bron_bout_id ?? row.matchmaking_bout_id ?? row.raw_bout_id ?? row.bout_id ?? row.id,
        // Belangrijk: uitslagen moet het echte partijnummer uit de definitieve lineup behouden.
        // Niet opnieuw nummeren met index + 1, want dan klopt de koppeling naar partij/detail/rapport niet meer
        // zodra er partijen zijn overgeslagen door open meldingen of verbod.
        partij_nr: n(row.partij_nr, index + 1),
        original_partij_nr: row.original_partij_nr ?? row.partij_nr,
        discipline: row.discipline ?? row.discipline_mm ?? null,
        sub_discipline: row.sub_discipline ?? row.sub_discipline_mm ?? null,
        klasse: row.klasse ?? row.klasse_mm ?? null,
        leeftijd_type: row.leeftijd_type ?? row.leeftijd_type_mm ?? null,
        geslacht: row.geslacht ?? row.geslacht_mm ?? null,
        rood_naam: row.rood_naam ?? row.rood_naam_mm ?? row.rood_naam_fp ?? null,
        rood_gym: row.rood_gym ?? row.rood_gym_mm ?? row.rood_gym_fp ?? null,
        rood_va: row.va_rood ?? row.rood_va ?? row.rood_va_mm ?? row.rood_va_fp ?? row.rood_va_nummer ?? null,
        rood_geboortedatum: row.rood_geboortedatum ?? row.rood_geboortedatum_mm ?? row.rood_geboortedatum_fp ?? null,
        rood_gewicht_opgegeven: row.rood_gewicht_opgegeven ?? row.rood_gewicht ?? row.rood_doorgegeven_gewicht ?? row.rood_gewicht_mm ?? null,
        rood_gewicht_gewogen: row.rood_gewicht_gewogen ?? row.rood_gewogen_gewicht ?? null,
        blauw_naam: row.blauw_naam ?? row.blauw_naam_mm ?? row.blauw_naam_fp ?? null,
        blauw_gym: row.blauw_gym ?? row.blauw_gym_mm ?? row.blauw_gym_fp ?? null,
        blauw_va: row.va_blauw ?? row.blauw_va ?? row.blauw_va_mm ?? row.blauw_va_fp ?? row.blauw_va_nummer ?? null,
        blauw_geboortedatum: row.blauw_geboortedatum ?? row.blauw_geboortedatum_mm ?? row.blauw_geboortedatum_fp ?? null,
        blauw_gewicht_opgegeven: row.blauw_gewicht_opgegeven ?? row.blauw_gewicht ?? row.blauw_doorgegeven_gewicht ?? row.blauw_gewicht_mm ?? null,
        blauw_gewicht_gewogen: row.blauw_gewicht_gewogen ?? row.blauw_gewogen_gewicht ?? null,
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
      opmerking: `Definitieve jury-lineup is exact doorgestuurd naar uitslagen (${eligible.length}/${rawBouts.length}). Overgeslagen volgens jury-lineup-filter: ${blockedCount}.`,
      metadata: {
        route: "api/matchmaking/naar-uitslagen/route",
        eligible_count: eligible.length,
        total_count: rawBouts.length,
        blocked_count: blockedCount,
        controle_count: controleRows?.length ?? 0,
        active_controle_count: activeControleRows.length,
      },
    });

    const { error: mmStatusErr } = await supabaseAdmin
      .from("matchmakings")
      .update({
        status: "klaar_voor_uitslagen",
        stadium: "uitslagen_in_bewerking",
        huidige_eigenaar_type: "bondteam",
        huidige_eigenaar_user_id: null,
        huidige_eigenaar_bondteam: userBondteam || s(body?.bondteam) || null,
        locked_for_editing: true,
        ready_for_results_at: nowIso,
        last_updated_at: nowIso,
        last_updated_by: userId,
      })
      .eq("id", matchmakingId);

    if (mmStatusErr) throw mmStatusErr;

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
      message: "Definitieve jury-lineup is exact omgezet naar uitslagenflow; dezelfde partijen, dezelfde volgorde en minpunten zijn meegenomen.",
    });
  } catch (err: any) {
    console.error("matchmaking/naar-uitslagen POST error:", err);
    return jsonError(err?.message ?? "Onbekende fout.", 500);
  }
}
