// lib/workflow/stateGates.ts
// State transition logic with pre-condition checks.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchmakingState, StateTransitionResult, RoleName } from "@/lib/types/workflow";
import { isValidTransition } from "@/lib/constants/states";
import { canDo } from "@/lib/constants/roleMatrix";
import { ERRORS } from "@/lib/constants/errors";
import { logStateTransition } from "@/lib/workflow/auditLogger";

// ─── Pre-condition checks ──────────────────────────────────────────────────────

/**
 * For the APPROVED → WEGING transition:
 * All controle_resultaten must have review_status == 'goedgekeurd' or resultaat == 'ok'.
 * No 'pending' or 'afgewezen'/'afgekeurd' meldingen allowed.
 */
async function checkApprovedToWeging(
  supabase: SupabaseClient,
  matchmaking_id: string
): Promise<string | null> {
  const { data: rows, error } = await supabase
    .from("controle_resultaten")
    .select("id, resultaat, review_status")
    .eq("matchmaking_id", matchmaking_id);

  if (error) return ERRORS.DB_ERROR;

  const pending = (rows ?? []).filter((r: any) => {
    const res = String(r.resultaat ?? "").toLowerCase();
    const rev = String(r.review_status ?? "").toLowerCase();
    // A row blocks transition if it's not OK and not already reviewed/approved
    if (res === "ok") return false;
    if (rev === "goedgekeurd") return false;
    return true;
  });

  if (pending.length > 0) {
    return ERRORS.PENDING_MELDINGEN;
  }

  return null;
}

/**
 * For the WEGING → LINEUP transition:
 * All bouts must have both fighters weighed (gewogen_gewicht set).
 */
async function checkWegingToLineup(
  supabase: SupabaseClient,
  matchmaking_id: string
): Promise<string | null> {
  const { data: bouts, error } = await supabase
    .from("matchmaking_bouts")
    .select("id, rood_gewogen_gewicht, blauw_gewogen_gewicht, eindstatus")
    .eq("matchmaking_id", matchmaking_id);

  if (error) return ERRORS.DB_ERROR;
  if (!bouts || bouts.length === 0) return ERRORS.NO_BOUTS;

  const unweighed = (bouts ?? []).filter(
    (b: any) => b.eindstatus !== "cancelled" && (b.rood_gewogen_gewicht == null || b.blauw_gewogen_gewicht == null)
  );

  if (unweighed.length > 0) {
    return `Er zijn nog ${unweighed.length} partij(en) waarbij het gewogen gewicht ontbreekt.`;
  }

  return null;
}

/**
 * For the LINEUP → COMPLETE transition:
 * All bouts must have an uitslag (uitslag_rood is set).
 */
async function checkLineupToComplete(
  supabase: SupabaseClient,
  matchmaking_id: string
): Promise<string | null> {
  const { data: bouts, error } = await supabase
    .from("matchmaking_bouts")
    .select("id, uitslag_rood, eindstatus")
    .eq("matchmaking_id", matchmaking_id);

  if (error) return ERRORS.DB_ERROR;
  if (!bouts || bouts.length === 0) return ERRORS.NO_BOUTS;

  const missing = (bouts ?? []).filter(
    (b: any) =>
      b.eindstatus !== "cancelled" &&
      (b.uitslag_rood == null || String(b.uitslag_rood).trim() === "")
  );

  if (missing.length > 0) {
    return `Er zijn nog ${missing.length} partij(en) zonder uitslag.`;
  }

  return null;
}

// ─── Main gate function ────────────────────────────────────────────────────────

/**
 * Attempt a state transition for a matchmaking.
 * Returns a StateTransitionResult — never throws.
 */
export async function attemptStateTransition(
  supabase: SupabaseClient,
  opts: {
    matchmaking_id: string;
    from_state: MatchmakingState;
    to_state: MatchmakingState;
    actor_id: string;
    role: RoleName | string;
  }
): Promise<StateTransitionResult> {
  const { matchmaking_id, from_state, to_state, actor_id, role } = opts;

  // 1. Validate the transition is allowed by the state machine
  if (!isValidTransition(from_state, to_state)) {
    return { ok: false, error: ERRORS.INVALID_TRANSITION(from_state, to_state) };
  }

  // 2. Check role permission for this specific transition
  const actionMap: Partial<Record<string, string>> = {
    "approved->weging": "state_transition_to_weging",
    "weging->lineup": "state_transition_to_lineup",
    "lineup->complete": "state_transition_to_complete",
  };
  const actionKey = actionMap[`${from_state}->${to_state}`];
  if (actionKey && !canDo(role, actionKey as any)) {
    return { ok: false, error: ERRORS.NO_ACCESS };
  }

  // 3. Pre-condition checks per transition
  let preConditionError: string | null = null;

  if (from_state === "approved" && to_state === "weging") {
    preConditionError = await checkApprovedToWeging(supabase, matchmaking_id);
  } else if (from_state === "weging" && to_state === "lineup") {
    preConditionError = await checkWegingToLineup(supabase, matchmaking_id);
  } else if (from_state === "lineup" && to_state === "complete") {
    preConditionError = await checkLineupToComplete(supabase, matchmaking_id);
  }

  if (preConditionError) {
    return { ok: false, error: preConditionError };
  }

  // 4. Persist the new state
  const { error: updateErr } = await supabase
    .from("matchmaking_uploads")
    .update({ status: to_state })
    .eq("matchmaking_id", matchmaking_id);

  if (updateErr) {
    return { ok: false, error: ERRORS.DB_ERROR };
  }

  // 5. Audit log (non-blocking)
  await logStateTransition(supabase, {
    matchmaking_id,
    from_state,
    to_state,
    actor_id,
    actor_role: role,
  });

  return { ok: true, new_state: to_state };
}

/**
 * Fetch the current state of a matchmaking.
 * Returns null when not found.
 */
export async function getMatchmakingState(
  supabase: SupabaseClient,
  matchmaking_id: string
): Promise<MatchmakingState | null> {
  const { data, error } = await supabase
    .from("matchmaking_uploads")
    .select("status")
    .eq("matchmaking_id", matchmaking_id)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return (data as any).status as MatchmakingState | null;
}
