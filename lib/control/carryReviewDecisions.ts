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
  return args.pairingIdentity(args.matchmakingId, vaFromContext(ctx, "rood"), vaFromContext(ctx, "blauw"));
}

function issueKey(args: CarryReviewArgs, row: any, ctx: any): string | null {
  const ruleCode = String(row?.rule_code ?? "").trim().toUpperCase();
  if (!ruleCode || ruleCode === "__NO_RULES__") return null;

  const tournament = String(row?.toernooi_code ?? "").trim().toUpperCase();
  const explicitVa = cleanVa(row?.toernooi_va_nummer) ?? cleanVa(row?.fighter_id);
  if (explicitVa) {
    const subject = tournament ? `TOERNOOI:${tournament}:VA:${explicitVa}` : `VA:${explicitVa}`;
    return `${subject}|RULE:${ruleCode}`;
  }

  const hoek = String(row?.hoek ?? "").trim().toLowerCase();
  if (hoek === "rood" || hoek === "blauw") {
    const va = vaFromContext(ctx, hoek);
    if (va) return `VA:${va}|RULE:${ruleCode}`;
  }

  const pair = pairing(args, ctx);
  return pair ? `PAIR:${pair}|RULE:${ruleCode}` : null;
}

function hasDecision(row: any): boolean {
  return normalizeStatus(row?.review_status) !== null;
}

function reviewPatch(oldRow: any): Record<string, unknown> | null {
  const status = normalizeStatus(oldRow?.review_status);
  if (!status) return null;

  const patch: Record<string, unknown> = {
    // Bewaar de bestaande FightSupport-statuswoorden. De UI/API's gebruiken deze al.
    review_status: status === "approved" ? "goedgekeurd" : "afgekeurd",
    review_note: oldRow?.review_note ?? null,
    reviewed_by: oldRow?.reviewed_by ?? null,
    reviewed_at: oldRow?.reviewed_at ?? null,
    aantekeningen: oldRow?.aantekeningen ?? null,
  };

  if (status === "approved") {
    patch.resultaat = "OK";
    patch.actie_status = "goedgekeurd";
  } else {
    patch.resultaat = "AFKEUR";
    patch.actie_status = "afgekeurd";
  }
  return patch;
}

/**
 * Behoudt een handmatig besluit zolang DEZELFDE melding onafgebroken aanwezig is.
 *
 * Dit sluit aan op saveControleResultaten:
 * - dezelfde melding opnieuw -> goedkeuring OF afkeur blijft staan;
 * - tussentijdse controle heeft de melding niet -> keten stopt, oud besluit komt niet terug;
 * - nieuwe melding -> open;
 * - verschillende rollen/flows blijven geïsoleerd via runTypes.
 *
 * We lopen meerdere voorgaande runs terug omdat een tussenliggende run door een eerdere
 * bug het review_status al als open kan hebben opgeslagen. Zolang de melding in ELKE
 * tussenliggende run aanwezig bleef, mag het laatste echte handmatige besluit worden hersteld.
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
    .limit(25);
  if (runsError) throw runsError;

  const runIds = (previousRuns ?? []).map((r: any) => String(r?.id ?? "").trim()).filter(Boolean);
  if (!runIds.length) return 0;

  const { data: previousRows, error: rowsError } = await supabase
    .from("controle_resultaten")
    .select("id,controle_run_id,partij_nr,bout_id,rule_code,hoek,toernooi_code,fighter_id,toernooi_va_nummer,review_status,review_note,reviewed_by,reviewed_at,aantekeningen,created_at")
    .eq("matchmaking_id", matchmakingId)
    .in("controle_run_id", runIds);
  if (rowsError) throw rowsError;

  const { data: oldContexts, error: contextError } = await supabase
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .in("controle_run_id", runIds);
  if (contextError) throw contextError;

  const contextsByRun = new Map<string, Map<string, any>>();
  for (const ctx of oldContexts ?? []) {
    const rid = String(ctx?.controle_run_id ?? "").trim();
    if (!rid) continue;
    if (!contextsByRun.has(rid)) contextsByRun.set(rid, new Map());
    const lookup = contextsByRun.get(rid)!;
    for (const key of rowKeys(ctx)) if (!lookup.has(key)) lookup.set(key, ctx);
  }

  const issuesByRun = new Map<string, Map<string, any>>();
  for (const row of previousRows ?? []) {
    const rid = String(row?.controle_run_id ?? "").trim();
    if (!rid) continue;
    const ctx = findContext(contextsByRun.get(rid) ?? new Map(), row);
    const key = issueKey(args, row, ctx);
    if (!key) continue;
    if (!issuesByRun.has(rid)) issuesByRun.set(rid, new Map());
    const map = issuesByRun.get(rid)!;
    const existing = map.get(key);
    // Als dezelfde issue dubbel staat, heeft een echte beslissing voorrang.
    if (!existing || (!hasDecision(existing) && hasDecision(row))) map.set(key, row);
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
    const currentCtx = findContext(currentLookup, currentRow);
    const key = issueKey(args, currentRow, currentCtx);
    if (!key) continue;

    let decisionRow: any | null = null;

    // Alleen teruglopen zolang de melding onafgebroken in iedere controle aanwezig was.
    for (const rid of runIds) {
      const oldRow = issuesByRun.get(rid)?.get(key) ?? null;
      if (!oldRow) break;
      if (hasDecision(oldRow)) {
        decisionRow = oldRow;
        break;
      }
    }

    if (!decisionRow) continue;
    const patch = reviewPatch(decisionRow);
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
