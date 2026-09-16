// lib/control/carryRecordDifferenceReview.ts
// Admin-owned 24h helper. Intentionally not shared with Matchmaker/Officials.
// Only an earlier APPROVED party/record-difference decision may be carried forward.

import { adminPairingIdentity } from "@/lib/control/pairingIdentity";

function normalizeStatus(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function isApproved(value: unknown): boolean {
  return ["approved", "approve", "goedgekeurd", "ok"].includes(normalizeStatus(value));
}

function isRecordDifferenceRule(ruleCode: unknown): boolean {
  const code = String(ruleCode ?? "").trim().toUpperCase();
  if (!code) return false;
  return code.includes("PARTIJVERSCHIL") || code.includes("RECORDVERSCHIL");
}

function vaFromContext(ctx: any, side: "rood" | "blauw"): string | null {
  const candidates = side === "rood"
    ? [ctx?.rood_va_mm, ctx?.va_rood, ctx?.va_rood_mm, ctx?.rood_va_fp, ctx?.rood_va_scrape]
    : [ctx?.blauw_va_mm, ctx?.va_blauw, ctx?.va_blauw_mm, ctx?.blauw_va_fp, ctx?.blauw_va_scrape];
  for (const value of candidates) {
    const digits = String(value ?? "").replace(/\D/g, "");
    if (/^\d{3,6}$/.test(digits)) return digits;
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
  return adminPairingIdentity(matchmakingId, vaFromContext(ctx, "rood"), vaFromContext(ctx, "blauw"));
}

export async function carryApprovedAdminRecordDifferenceReviews(args: {
  supabase: any;
  matchmakingId: string;
  runId: string;
  currentContextRows: any[];
}): Promise<number> {
  const { supabase, matchmakingId, runId, currentContextRows } = args;

  const { data: previousRows, error: previousError } = await supabase
    .from("controle_resultaten")
    .select("id,controle_run_id,partij_nr,bout_id,rule_code,review_status,review_note,reviewed_by,reviewed_at,aantekeningen,created_at")
    .eq("matchmaking_id", matchmakingId)
    .neq("controle_run_id", runId)
    .not("review_status", "is", null)
    .order("reviewed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (previousError) throw previousError;

  const approved = (previousRows ?? []).filter(
    (row: any) => isApproved(row?.review_status) && isRecordDifferenceRule(row?.rule_code)
  );
  if (!approved.length) return 0;

  const runIds = [...new Set(approved.map((row: any) => String(row?.controle_run_id ?? "").trim()).filter(Boolean))];
  if (!runIds.length) return 0;

  const { data: oldContexts, error: contextError } = await supabase
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .in("controle_run_id", runIds);
  if (contextError) throw contextError;

  const lookupByRun = new Map<string, Map<string, any>>();
  for (const ctx of oldContexts ?? []) {
    const oldRunId = String(ctx?.controle_run_id ?? "").trim();
    if (!oldRunId) continue;
    if (!lookupByRun.has(oldRunId)) lookupByRun.set(oldRunId, new Map());
    const lookup = lookupByRun.get(oldRunId)!;
    for (const key of rowKeys(ctx)) if (!lookup.has(key)) lookup.set(key, ctx);
  }

  const approvedByPairRule = new Map<string, any>();
  for (const oldRow of approved) {
    const oldRunId = String(oldRow?.controle_run_id ?? "").trim();
    const oldCtx = findContext(lookupByRun.get(oldRunId) ?? new Map(), oldRow);
    const pair = pairing(matchmakingId, oldCtx);
    const code = String(oldRow?.rule_code ?? "").trim().toUpperCase();
    if (!pair || !code) continue;
    const key = `${pair}|${code}`;
    if (!approvedByPairRule.has(key)) approvedByPairRule.set(key, oldRow);
  }
  if (!approvedByPairRule.size) return 0;

  const { data: currentRows, error: currentError } = await supabase
    .from("controle_resultaten")
    .select("id,partij_nr,bout_id,rule_code")
    .eq("matchmaking_id", matchmakingId)
    .eq("controle_run_id", runId);
  if (currentError) throw currentError;

  const currentLookup = makeLookup(currentContextRows);
  let carried = 0;
  for (const currentRow of currentRows ?? []) {
    if (!isRecordDifferenceRule(currentRow?.rule_code)) continue;
    const currentCtx = findContext(currentLookup, currentRow);
    const pair = pairing(matchmakingId, currentCtx);
    const code = String(currentRow?.rule_code ?? "").trim().toUpperCase();
    if (!pair || !code) continue;
    const oldRow = approvedByPairRule.get(`${pair}|${code}`);
    if (!oldRow) continue;

    const { error: updateError } = await supabase
      .from("controle_resultaten")
      .update({
        review_status: oldRow.review_status ?? "approved",
        review_note: oldRow.review_note ?? null,
        reviewed_by: oldRow.reviewed_by ?? null,
        reviewed_at: oldRow.reviewed_at ?? null,
        aantekeningen: oldRow.aantekeningen ?? null,
        resultaat: "OK",
        actie_status: "goedgekeurd",
      })
      .eq("id", currentRow.id);
    if (updateError) throw updateError;
    carried += 1;
  }

  return carried;
}
