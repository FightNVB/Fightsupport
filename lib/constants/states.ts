// lib/constants/states.ts
// Matchmaking state machine definitions.

import type { MatchmakingState } from "@/lib/types/workflow";

// Ordered list of valid states.
export const MATCHMAKING_STATES: MatchmakingState[] = [
  "draft",
  "approved",
  "weging",
  "lineup",
  "complete",
];

// Valid transitions: from → to[]
export const VALID_TRANSITIONS: Record<MatchmakingState, MatchmakingState[]> = {
  draft: ["approved"],
  approved: ["weging"],
  weging: ["lineup"],
  lineup: ["complete"],
  complete: [],
};

// Human-readable labels (Dutch)
export const STATE_LABELS: Record<MatchmakingState, string> = {
  draft: "Concept",
  approved: "Goedgekeurd",
  weging: "Weging",
  lineup: "Lineup",
  complete: "Afgerond",
};

/**
 * Returns true if the transition from → to is allowed by the state machine.
 */
export function isValidTransition(
  from: MatchmakingState,
  to: MatchmakingState
): boolean {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

/**
 * Returns the next state after the given state, or null if at end.
 */
export function getNextState(
  current: MatchmakingState
): MatchmakingState | null {
  const idx = MATCHMAKING_STATES.indexOf(current);
  if (idx < 0 || idx >= MATCHMAKING_STATES.length - 1) return null;
  return MATCHMAKING_STATES[idx + 1];
}
