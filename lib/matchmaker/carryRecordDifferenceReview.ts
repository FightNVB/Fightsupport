// lib/matchmaker/carryRecordDifferenceReview.ts
// Matchmaker-owned review carry helper. Intentionally not shared with Admin/Officials.
// A previous manual decision is carried only when the SAME rule is emitted again in
// the new Matchmaker run for the same fighter/pairing. Disappeared rules remain history only.
// Party/record-difference keeps its special stable-VA-pair behaviour and only carries APPROVED.

import { matchmakerPairingIdentity } from "@/lib/matchmaker/pairingIdentity";

const MATCHMAKER_RUN_TYPES = ["matchmaker_db_controle", "control-engine-matchmaker-total"];

type ReviewStatus = "approved" | "rejected" | null;

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

function pairing(matchmakingId: string, ctx: any): string | null {
  if (!ctx) return null;
  return matchmakerPairingIdentity(matchmakingId, vaFromContext(ctx, "rood"), vaFromContext(ctx, "blauw"));
}

function subjectKey(matchmakingId: string, row: any, ctx: any): string | null {
  const tournament = String(row?.toernooi_code ?? "").trim().toUpperCase();
  const explicitVa = cleanVa(row?.toernooi_va_nummer) ?? cleanVa(row?.fighter_id);
  if (explicitVa) return tournament ? `TOERNOOI:${tournament}:VA:${explicitVa}` : `VA:${explicitVa}`;

  const hoek = String(row?.hoek ?? "").trim().toLowerCase();
  if (hoek === "rood" || hoek === "blauw") {
    const va = vaFromContext(ctx, hoek);
    if (va) return `VA:${va}`;
  }

  const pair = pairing(matchmakingId, ctx);
  return pair ? `PAIR:${pair}` : null;
}

function currentIssueKey(matchmakingId: string, row: any, ctx: any): string | null {
  const ruleCode = String(row?.rule_code ?? "").trim().toUpperCase();
  if (!ruleCode || ruleCode === "__NO_RULES__") return null;
  const subject = subjectKey(matchmakingId, row, ctx);
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

export async function carryApprovedRecordDifferenceReviews(args: {
  supabase: any;
  matchmakingId: string;
  runId: string;
  currentContextRows: any[];
}): Promise<number> {
  const { supabase, matchmakingId, runId, currentContextRows } = args;

  // Role isolation: normal DB-control and full/eindcontrole may share Matchmaker decisions,
  // but Admin and Officials decisions are never imported here.
  const { data: previousRuns, error: runsError } = await supabase
    .from("controle_runs")
    .select("id,run_type,gestart_op")
    .eq("matchmaking_id", matchmakingId)
    .in("run_type", MATCHMAKER_RUN_TYPES)
    .neq("id", runId)
    .order("gestart_op", { ascending: false, nullsFirst: false });
  if (runsError) throw runsError;

  const previousRunIds = (previousRuns ?? []).map((run: any) => String(run?.id ?? "").trim()).filter(Boolean);
  if (!previousRunIds.length) return 0;

  const { data: previousRows, error: previousError } = await supabase
    .from("controle_resultaten")
    .select("id,controle_run_id,partij_nr,bout_id,rule_code,hoek,toernooi_code,fighter_id,toernooi_va_nummer,review_status,review_note,reviewed_by,reviewed_at,aantekeningen,created_at")
    .eq("matchmaking_id", matchmakingId)
    .in("controle_run_id", previousRunIds)
    .order("reviewed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (previousError) throw previousError;

  const reviewedRows = (previousRows ?? []).filter((row: any) => hasManualData(row));
  if (!reviewedRows.length) return 0;

  const reviewedRunIds = [...new Set(reviewedRows.map((row: any) => String(row?.controle_run_id ?? "").trim()).filter(Boolean))];
  const { data: oldContexts, error: contextError } = await supabase
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .in("controle_run_id", reviewedRunIds);
  if (contextError) throw contextError;

  const lookupByRun = new Map<string, Map<string, any>>();
  for (const ctx of oldContexts ?? []) {
    const oldRunId = String(ctx?.controle_run_id ?? "").trim();
    if (!oldRunId) continue;
    if (!lookupByRun.has(oldRunId)) lookupByRun.set(oldRunId, new Map());
    const lookup = lookupByRun.get(oldRunId)!;
    for (const key of rowKeys(ctx)) if (!lookup.has(key)) lookup.set(key, ctx);
  }

  const previousByIssue = new Map<string, any>();
  const approvedRecordByPairRule = new Map<string, any>();
  for (const oldRow of reviewedRows) {
    const oldRunId = String(oldRow?.controle_run_id ?? "").trim();
    const oldCtx = findContext(lookupByRun.get(oldRunId) ?? new Map(), oldRow);
    const ruleCode = String(oldRow?.rule_code ?? "").trim().toUpperCase();
    if (!ruleCode || ruleCode === "__NO_RULES__") continue;

    if (isRecordDifferenceRule(ruleCode)) {
      if (normalizeStatus(oldRow?.review_status) !== "approved") continue;
      const pair = pairing(matchmakingId, oldCtx);
      if (!pair) continue;
      const key = `${pair}|${ruleCode}`;
      if (!approvedRecordByPairRule.has(key)) approvedRecordByPairRule.set(key, oldRow);
      continue;
    }

    const key = currentIssueKey(matchmakingId, oldRow, oldCtx);
    if (key && !previousByIssue.has(key)) previousByIssue.set(key, oldRow);
  }

  const { data: currentRows, error: currentError } = await supabase
    .from("controle_resultaten")
    .select("id,partij_nr,bout_id,rule_code,hoek,toernooi_code,fighter_id,toernooi_va_nummer")
    .eq("matchmaking_id", matchmakingId)
    .eq("controle_run_id", runId);
  if (currentError) throw currentError;

  const currentLookup = makeLookup(currentContextRows);
  let carriedRecordDifferences = 0;

  for (const currentRow of currentRows ?? []) {
    const ruleCode = String(currentRow?.rule_code ?? "").trim().toUpperCase();
    if (!ruleCode || ruleCode === "__NO_RULES__") continue;
    const currentCtx = findContext(currentLookup, currentRow);

    let oldRow: any | null = null;
    let recordDifference = false;

    if (isRecordDifferenceRule(ruleCode)) {
      const pair = pairing(matchmakingId, currentCtx);
      if (!pair) continue;
      oldRow = approvedRecordByPairRule.get(`${pair}|${ruleCode}`) ?? null;
      recordDifference = true;
    } else {
      const key = currentIssueKey(matchmakingId, currentRow, currentCtx);
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
    if (recordDifference) carriedRecordDifferences += 1;
  }

  return carriedRecordDifferences;
}
