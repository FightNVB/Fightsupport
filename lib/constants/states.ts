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
  "nieuw",
  "bouwen_matchmaking",
  "concept_matchmaking",
  "ingediend_admin",
  "in_controle_admin",
  "review",
  "bij_eigenaar",
  "klaar_voor_weegstation",
  "in_officials",
  "in_weegstation",
  "weegstation_verwerkt",
  "definitieve_lineup",
  "klaar_voor_uitslagen",
  "uitslagen_in_bewerking",
  "uitslagen_definitief",
  "gearchiveerd",
];

// Valid transitions: from → to[]
export const VALID_TRANSITIONS: Record<MatchmakingState, MatchmakingState[]> = {
  draft: ["approved"],
  approved: ["weging"],
  weging: ["lineup"],
  lineup: ["complete"],
  complete: [],
  nieuw: ["bouwen_matchmaking"],
  bouwen_matchmaking: ["concept_matchmaking"],
  concept_matchmaking: ["ingediend_admin"],
  ingediend_admin: ["in_controle_admin"],
  in_controle_admin: ["review", "klaar_voor_weegstation"],
  review: ["bij_eigenaar", "bouwen_matchmaking", "concept_matchmaking", "ingediend_admin", "klaar_voor_weegstation"],
  bij_eigenaar: ["bouwen_matchmaking", "concept_matchmaking", "ingediend_admin"],
  klaar_voor_weegstation: ["in_officials"],
  in_officials: ["review", "in_weegstation"],
  in_weegstation: ["review", "weegstation_verwerkt"],
  weegstation_verwerkt: ["review", "definitieve_lineup"],
  definitieve_lineup: ["klaar_voor_uitslagen"],
  klaar_voor_uitslagen: ["uitslagen_in_bewerking"],
  uitslagen_in_bewerking: ["uitslagen_definitief"],
  uitslagen_definitief: ["gearchiveerd"],
  gearchiveerd: [],
};

// Human-readable labels (Dutch)
export const STATE_LABELS: Record<MatchmakingState, string> = {
  draft: "Concept",
  approved: "Goedgekeurd",
  weging: "Weging",
  lineup: "Lineup",
  complete: "Afgerond",
  nieuw: "Nieuw",
  bouwen_matchmaking: "Bouwen matchmaking",
  concept_matchmaking: "Concept matchmaking",
  ingediend_admin: "Ingediend admin",
  in_controle_admin: "In controle admin",
  review: "Review",
  bij_eigenaar: "Bij eigenaar",
  klaar_voor_weegstation: "Klaar voor weegstation",
  in_officials: "In officials",
  in_weegstation: "In weegstation",
  weegstation_verwerkt: "Weegstation verwerkt",
  definitieve_lineup: "Definitieve lineup",
  klaar_voor_uitslagen: "Klaar voor uitslagen",
  uitslagen_in_bewerking: "Uitslagen in bewerking",
  uitslagen_definitief: "Uitslagen definitief",
  gearchiveerd: "Gearchiveerd",
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
