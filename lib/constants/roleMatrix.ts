// lib/constants/roleMatrix.ts
// Role-Based Access Control matrix.
// Defines which roles are allowed to perform which actions.

import type { RoleName } from "@/lib/types/workflow";

export type Action =
  | "wegen"
  | "minpunten"
  | "dispensatie_geven"
  | "partij_nummer_wijzigen"
  | "uitslagen_invoeren"
  | "export_download"
  | "user_beheer"
  | "matchmaking_approve"
  | "melding_approve"
  | "melding_afwijzen"
  | "state_transition_to_weging"
  | "state_transition_to_lineup"
  | "state_transition_to_complete";

// Map: action → array of roles that may perform the action.
// superadmin implicitly has all permissions (checked in canDo()).
export const ROLE_MATRIX: Record<Action, RoleName[]> = {
  wegen: ["official", "hoofdofficial", "admin", "dispensatie_admin"],
  minpunten: ["hoofdofficial", "admin", "dispensatie_admin"],
  dispensatie_geven: ["hoofdofficial", "admin", "dispensatie_admin"],
  partij_nummer_wijzigen: ["matchmaker", "hoofdofficial", "admin", "dispensatie_admin"],
  uitslagen_invoeren: ["official", "hoofdofficial", "admin", "dispensatie_admin"],
  export_download: ["hoofdofficial", "admin", "dispensatie_admin"],
  user_beheer: ["admin", "dispensatie_admin"],
  matchmaking_approve: ["admin"],
  melding_approve: ["admin"],
  melding_afwijzen: ["admin"],
  state_transition_to_weging: ["admin"],
  state_transition_to_lineup: ["admin", "hoofdofficial"],
  state_transition_to_complete: ["admin", "official", "hoofdofficial"],
};

/**
 * Check whether a given role may perform an action.
 * superadmin always returns true.
 */
export function canDo(role: RoleName | string, action: Action): boolean {
  if (!role) return false;
  const r = String(role).trim().toLowerCase() as RoleName;
  if (r === "superadmin") return true;
  const allowed = ROLE_MATRIX[action] ?? [];
  return allowed.includes(r as RoleName);
}

/**
 * Return all actions allowed for a given role.
 */
export function getAllowedActions(role: RoleName | string): Action[] {
  const r = String(role).trim().toLowerCase() as RoleName;
  if (r === "superadmin") return Object.keys(ROLE_MATRIX) as Action[];
  return (Object.keys(ROLE_MATRIX) as Action[]).filter((a) =>
    (ROLE_MATRIX[a] ?? []).includes(r)
  );
}
