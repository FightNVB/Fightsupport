// lib/workflow/matchmakingValidator.ts
// Validation rules for matchmaking operations.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchmakingState } from "@/lib/types/workflow";
import { ERRORS } from "@/lib/constants/errors";

export type ValidationResult = {
  ok: boolean;
  error?: string;
};

function isUuid(v: any): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(v ?? "").trim()
  );
}

/**
 * Validate that a matchmaking_id is a valid UUID.
 */
export function validateMatchmakingId(id: any): ValidationResult {
  if (!isUuid(id)) {
    return { ok: false, error: ERRORS.INVALID_UUID("matchmaking_id") };
  }
  return { ok: true };
}

/**
 * Fetch the matchmaking row and verify it is in the expected state.
 * Returns the matchmaking row on success.
 */
export async function assertMatchmakingInState(
  supabase: SupabaseClient,
  matchmaking_id: string,
  expectedState: MatchmakingState
): Promise<{ ok: true; row: Record<string, any> } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("matchmaking_uploads")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, error: ERRORS.DB_ERROR };
  if (!data) return { ok: false, error: ERRORS.NOT_FOUND("Matchmaking") };

  const actual = String((data as any).status ?? "").toLowerCase() as MatchmakingState;
  if (actual !== expectedState) {
    return { ok: false, error: ERRORS.NOT_IN_STATE(expectedState, actual) };
  }

  return { ok: true, row: data as Record<string, any> };
}

/**
 * Validate uitslag input values.
 */
export function validateUitslagInput(opts: {
  uitslag_rood: any;
  winnaar: any;
}): ValidationResult {
  const { uitslag_rood, winnaar } = opts;

  const u = String(uitslag_rood ?? "").trim();
  if (!u) return { ok: false, error: ERRORS.MISSING_FIELD("uitslag_rood") };

  const valid_winnaar = ["rood", "blauw", "onbeslist"];
  const w = String(winnaar ?? "").trim().toLowerCase();
  if (!valid_winnaar.includes(w)) {
    return { ok: false, error: ERRORS.INVALID_UITSLAG };
  }

  return { ok: true };
}

/**
 * Check whether a matchmaking has all uitslagen entered.
 * Returns true when every non-cancelled bout has uitslag_rood set.
 */
export async function isMatchmakingComplete(
  supabase: SupabaseClient,
  matchmaking_id: string
): Promise<boolean> {
  const { data: bouts, error } = await supabase
    .from("matchmaking_bouts")
    .select("id, uitslag_rood, eindstatus")
    .eq("matchmaking_id", matchmaking_id);

  if (error || !bouts || bouts.length === 0) return false;

  return (bouts as any[]).every(
    (b) =>
      b.eindstatus === "cancelled" ||
      (b.uitslag_rood != null && String(b.uitslag_rood).trim() !== "")
  );
}

/**
 * Return all matchmakings that are ready to export (LINEUP state, all uitslagen in).
 */
export async function getReadyToExportMatchmakings(
  supabase: SupabaseClient
): Promise<Record<string, any>[]> {
  const { data: uploads, error } = await supabase
    .from("matchmaking_uploads")
    .select("matchmaking_id, status, event_naam, datum, bondteam")
    .eq("status", "lineup")
    .order("uploaded_at", { ascending: false });

  if (error || !uploads) return [];

  const ready: Record<string, any>[] = [];

  for (const upload of uploads as any[]) {
    const complete = await isMatchmakingComplete(supabase, upload.matchmaking_id);
    if (complete) ready.push(upload);
  }

  return ready;
}
