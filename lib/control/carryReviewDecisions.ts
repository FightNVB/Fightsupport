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
  if (["rejected", "reject", "afgekeurd"].includes(status)) return "rejected";
  return null;
}

function isRecordDifferenceRule(ruleCode: unknown): boolean {
  const code = String(ruleCode ?? "").trim().toUpperCase();
  return !!code && (code.includes("PARTIJVERSCHIL") || code.includes("RECORDVERSCHIL"));
}

function cleanVa(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

function vaFromContext(ctx: any, side: "rood" | "blauw"): string | null {
  const candidates = side === "rood"
    ? [ctx?.rood_va_mm, ctx?.va_rood, ctx?.va_rood_mm, ctx?.rood_va_fp, ctx?.rood_va_scrape]
    : [ctx?.blauw_va_mm, ctx?.va_blauw, ctx?.va_blauw_mm, ctx?.blauw_va_fp, ctx?.blauw_va_scrape];
  for (const value of candidates) {
    const va = cleanVa(value);
    if (va) return va;
  }
  return null;
}

function rowKeys(row: any): string[] {
  const keys: string[] = [];
  const boutId = String(row?.bout_id ?? "").trim();
  const partijNr = row?.partij_nr == null ? "" : String(row.partij_nr);
  if (boutId) keys.push(`bout:${boutId}`);
  if (partijNr) keys.push(`partij:${partijNr}`);
  return keys;
}

function makeLookup(rows: any[]): Map<string, any> {
  const map = new Map<string, any>();
  for (const row of rows ?? []) {
    for (const key of rowKeys(row)) if (!map.has(key)) map.set(key, row);
  }
  return map;
}

function findContext(lookup: Map<string, any>, row: any): any | null {
  for (const key of rowKeys(row)) {
    const ctx = lookup.get(key);
    if (ctx) return ctx;
  }
  return null;
}

function pairing(args: CarryReviewArgs, ctx: any): string | null {
  if (!ctx) return null;
  return args.pairingIdentity(
    args.matchmakingId,
    vaFromContext(ctx, "rood"),
    vaFromContext(ctx, "blauw"),
  );
}

function subjectKey(args: CarryReviewArgs, row: any, ctx: any): string | null {
  const tournament = String(row?.toernooi_code ?? "").trim().toUpperCase();
  const explicitVa = cleanVa(row?.toernooi_va_nummer) ?? cleanVa(row?.fighter_id);
  if (explicitVa) return tournament ? `TOERNOOI:${tournament}:VA:${explicitVa}` : `VA:${explicitVa}`;

  const hoek = String(row?.hoek ?? "").trim().toLowerCase();
  if (hoek === "rood" || hoek === "blauw") {
    const va = vaFromContext(ctx, hoek);
    if (va) return `VA:${va}`;
  }

  const pair = pairing(args, ctx);
  return pair ? `PAIR:${pair}` : null;
}

function issueKey(args: CarryReviewArgs, row: any, ctx: any): string | null {
  const ruleCode = String(row?.rule_code ?? "").trim().toUpperCase();
  if (!ruleCode || ruleCode === "__NO_RULES__") return null;
  const subject = subjectKey(args, row, ctx);
  return subject ? `${subject}|RULE:${ruleCode}` : null;
}

function hasManualData(row: any): boolean {
  return !!normalizeStatus(row?.review_status) ||
    !!row?.reviewed_at ||
    !!String(row?.review_note ?? "").trim() ||
    !!String(row?.aantekeningen ?? "").trim();
}

function reviewPatch(oldRow: any, recordDifference: boolean): Record<string, unknown> | null {
  const status = normalizeStatus(oldRow?.review_status);
  if (recordDifference && status !== "approved") return null;

  const patch: Record<string, unknown> = {
    review_status: status ?? oldRow?.review_status ?? null,
    review_note: oldRow?.review_note ?? null,
    reviewed_by: oldRow?.reviewed_by ?? null,
    reviewed_at: oldRow?.reviewed_at ?? null,
    aantekeningen: oldRow?.aantekeningen ?? null,
  };

  if (status === "approved") {
    patch.resultaat = "OK";
    patch.actie_status = "goedgekeurd";
  } else if (status === "rejected") {
    patch.resultaat = "AFKEUR";
    patch.actie_status = "afgekeurd";
  }
  return patch;
}

/**
 * Draagt handmatige besluiten alleen over vanuit de DIRECT VOORGAANDE,
 * afgeronde controle van dezelfde rol/flow.
 *
 * Daardoor geldt:
 * - dezelfde melding bestaat nog -> besluit blijft staan;
 * - melding is in de vorige controle verdwenen -> oud besluit komt niet terug;
 * - nieuwe melding -> geen oud besluit;
 * - Admin/Matchmaker/Officials blijven van elkaar geïsoleerd.
 */
export async function carryReviewDecisions(args: CarryReviewArgs): Promise<number> {
  const { supabase, matchmakingId, runId, currentContextRows, runTypes } = args;

  const { data: previousRuns, error: runsError } = await supabase
    .from("controle_runs")
    .select("id,run_type,gestart_op,status")
    .eq("matchmaking_id", matchmakingId)
    .in("run_type", runTypes)
    .eq("status", "klaar")
    .neq("id", runId)
    .order("gestart_op", { ascending: false, nullsFirst: false })
    .limit(1);
  if (runsError) throw runsError;

  const previousRunId = String(previousRuns?.[0]?.id ?? "").trim();
  if (!previousRunId) return 0;

  const { data: previousRows, error: previousError } = await supabase
    .from("controle_resultaten")
    .select("id,controle_run_id,partij_nr,bout_id,rule_code,hoek,toernooi_code,fighter_id,toernooi_va_nummer,review_status,review_note,reviewed_by,reviewed_at,aantekeningen,created_at")
    .eq("matchmaking_id", matchmakingId)
    .eq("controle_run_id", previousRunId)
    .order("reviewed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (previousError) throw previousError;

  const reviewedRows = (previousRows ?? []).filter((row: any) => hasManualData(row));
  if (!reviewedRows.length) return 0;

  const { data: oldContexts, error: contextError } = await supabase
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .eq("controle_run_id", previousRunId);
  if (contextError) throw contextError;

  const oldLookup = makeLookup(oldContexts ?? []);
  const previousByIssue = new Map<string, any>();
  const approvedRecordByPairRule = new Map<string, any>();

  for (const oldRow of reviewedRows) {
    const oldCtx = findContext(oldLookup, oldRow);
    const ruleCode = String(oldRow?.rule_code ?? "").trim().toUpperCase();
    if (!ruleCode || ruleCode === "__NO_RULES__") continue;

    if (isRecordDifferenceRule(ruleCode)) {
      if (normalizeStatus(oldRow?.review_status) !== "approved") continue;
      const pair = pairing(args, oldCtx);
      if (!pair) continue;
      const key = `${pair}|${ruleCode}`;
      if (!approvedRecordByPairRule.has(key)) approvedRecordByPairRule.set(key, oldRow);
      continue;
    }

    const key = issueKey(args, oldRow, oldCtx);
    if (key && !previousByIssue.has(key)) previousByIssue.set(key, oldRow);
  }

  const { data: currentRows, error: currentError } = await supabase
    .from("controle_resultaten")
    .select("id,partij_nr,bout_id,rule_code,hoek,toernooi_code,fighter_id,toernooi_va_nummer")
    .eq("matchmaking_id", matchmakingId)
    .eq("controle_run_id", runId);
  if (currentError) throw currentError;

  const currentLookup = makeLookup(currentContextRows);
  let carried = 0;

  for (const currentRow of currentRows ?? []) {
    const ruleCode = String(currentRow?.rule_code ?? "").trim().toUpperCase();
    if (!ruleCode || ruleCode === "__NO_RULES__") continue;
    const currentCtx = findContext(currentLookup, currentRow);

    let oldRow: any | null = null;
    let recordDifference = false;

    if (isRecordDifferenceRule(ruleCode)) {
      const pair = pairing(args, currentCtx);
      if (!pair) continue;
      oldRow = approvedRecordByPairRule.get(`${pair}|${ruleCode}`) ?? null;
      recordDifference = true;
    } else {
      const key = issueKey(args, currentRow, currentCtx);
      if (!key) continue;
      oldRow = previousByIssue.get(key) ?? null;
    }

    if (!oldRow) continue;
    const patch = reviewPatch(oldRow, recordDifference);
    if (!patch) continue;

    const { error: updateError } = await supabase
      .from("controle_resultaten")
      .update(patch)
      .eq("id", currentRow.id)
      .eq("controle_run_id", runId);
    if (updateError) throw updateError;
    carried += 1;
  }

  return carried;
}
