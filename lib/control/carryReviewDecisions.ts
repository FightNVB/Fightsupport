type ReviewStatus = "approved" | "rejected" | null;

type CarryReviewArgs = {
  supabase: any;
  matchmakingId: string;
  runId: string;
  currentContextRows: any[];
  runTypes: string[];
  pairingIdentity: (matchmakingId: string, roodVa: string | null, blauwVa: string | null) => string | null;
};

function normalizeStatus(value: unknown): ReviewStatus {
  const status = String(value ?? "").trim().toLowerCase();
  if (["approved", "approve", "goedgekeurd", "ok"].includes(status)) return "approved";
  if (["rejected", "reject", "afgekeurd", "hard_afgekeurd"].includes(status)) return "rejected";
  return null;
}

function norm(value: unknown): string {
  return String(value ?? "").trim();
}

/**
 * Een handmatig besluit hoort bij de MELDING in deze matchmaking, niet bij een controle-run.
 * bout_id is stabiel voor dezelfde partij. Samen met rule_code + hoek is dit de vaste identiteit.
 * Daardoor maakt het niet uit of daarna een DB-controle, full scrape of eindcontrole draait.
 */
function findingKey(row: any): string | null {
  const rule = norm(row?.rule_code).toUpperCase();
  if (!rule || rule === "__NO_RULES__") return null;

  const tournament = norm(row?.toernooi_code).toUpperCase();
  if (tournament) {
    const fighter = norm(row?.toernooi_va_nummer || row?.fighter_id);
    return fighter ? `TOERNOOI:${tournament}|VA:${fighter}|RULE:${rule}` : null;
  }

  const bout = norm(row?.bout_id);
  if (!bout) return null;
  const hoek = norm(row?.hoek).toLowerCase() || "beide";
  return `BOUT:${bout}|RULE:${rule}|HOEK:${hoek}`;
}

function reviewPatch(oldRow: any): Record<string, unknown> | null {
  const status = normalizeStatus(oldRow?.review_status);
  if (!status) return null;

  return {
    review_status: status === "approved" ? "goedgekeurd" : "afgekeurd",
    review_note: oldRow?.review_note ?? null,
    reviewed_by: oldRow?.reviewed_by ?? null,
    reviewed_at: oldRow?.reviewed_at ?? null,
    aantekeningen: oldRow?.aantekeningen ?? null,
    resultaat: status === "approved" ? "ok" : "afgekeurd",
    actie_status: status === "approved" ? "goedgekeurd" : "afgekeurd",
  };
}

/**
 * Zet het LAATSTE echte handmatige besluit terug op iedere actuele, identieke melding.
 *
 * Voorbeeld: 12 actiepunten -> 1 goedgekeurd -> iedere volgende controle blijft 11 open,
 * zolang die goedgekeurde melding (zelfde bout + regel + hoek) nog steeds bestaat.
 * Hetzelfde geldt voor afkeur.
 *
 * Een melding die niet meer uit de rules-engine komt heeft geen actuele row en wordt dus
 * vanzelf niet getoond. Nieuwe meldingen hebben geen historische decision-key en blijven open.
 * Admin en Matchmaker blijven geïsoleerd doordat de caller eigen runTypes meegeeft.
 */
export async function carryReviewDecisions(args: CarryReviewArgs): Promise<number> {
  const { supabase, matchmakingId, runId, runTypes } = args;

  const { data: runs, error: runsError } = await supabase
    .from("controle_runs")
    .select("id,gestart_op")
    .eq("matchmaking_id", matchmakingId)
    .in("run_type", runTypes)
    .neq("id", runId)
    .order("gestart_op", { ascending: false, nullsFirst: false })
    .limit(100);
  if (runsError) throw runsError;

  const runIds = (runs ?? []).map((r: any) => norm(r?.id)).filter(Boolean);
  if (!runIds.length) return 0;

  const { data: history, error: historyError } = await supabase
    .from("controle_resultaten")
    .select("id,controle_run_id,bout_id,partij_nr,rule_code,hoek,toernooi_code,fighter_id,toernooi_va_nummer,review_status,review_note,reviewed_by,reviewed_at,aantekeningen,created_at")
    .eq("matchmaking_id", matchmakingId)
    .in("controle_run_id", runIds)
    .order("created_at", { ascending: false });
  if (historyError) throw historyError;

  // Alleen echte besluiten opnemen. 'open' mag een eerder besluit NOOIT overschrijven.
  const decisions = new Map<string, any>();
  for (const row of history ?? []) {
    if (!normalizeStatus(row?.review_status)) continue;
    const key = findingKey(row);
    if (key && !decisions.has(key)) decisions.set(key, row);
  }
  if (!decisions.size) return 0;

  const { data: currentRows, error: currentError } = await supabase
    .from("controle_resultaten")
    .select("id,bout_id,partij_nr,rule_code,hoek,toernooi_code,fighter_id,toernooi_va_nummer,review_status")
    .eq("matchmaking_id", matchmakingId)
    .eq("controle_run_id", runId);
  if (currentError) throw currentError;

  let carried = 0;
  for (const row of currentRows ?? []) {
    const key = findingKey(row);
    if (!key) continue;
    const decision = decisions.get(key);
    if (!decision) continue;

    const patch = reviewPatch(decision);
    if (!patch) continue;

    const { error: updateError } = await supabase
      .from("controle_resultaten")
      .update(patch)
      .eq("id", row.id)
      .eq("controle_run_id", runId);
    if (updateError) throw updateError;
    carried += 1;
  }

  return carried;
}
