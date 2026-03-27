// lib/auth/roleChecks.ts
// Role validation helpers that build on top of the existing authz utilities.

import type { RoleName } from "@/lib/types/workflow";
import { canDo, type Action } from "@/lib/constants/roleMatrix";

/**
 * Normalize any value to a RoleName.
 */
export function normalizeRole(v: unknown): RoleName {
  const r = String(v ?? "")
    .trim()
    .toLowerCase();
  const valid: RoleName[] = [
    "superadmin",
    "admin",
    "matchmaker",
    "official",
    "hoofdofficial",
    "dispensatie_admin",
  ];
  return (valid.includes(r as RoleName) ? r : "unknown") as RoleName;
}

/**
 * Returns true when the role is admin-like (admin, superadmin, dispensatie_admin).
 */
export function isAdminLike(role: RoleName | string): boolean {
  const r = normalizeRole(role);
  return ["admin", "superadmin", "dispensatie_admin"].includes(r);
}

/**
 * Returns true when the role is official-like (official, hoofdofficial).
 */
export function isOfficialLike(role: RoleName | string): boolean {
  const r = normalizeRole(role);
  return ["official", "hoofdofficial"].includes(r);
}

/**
 * Returns true when the role may enter uitslagen.
 */
export function canEnterUitslagen(role: RoleName | string): boolean {
  return canDo(role, "uitslagen_invoeren");
}

/**
 * Returns true when the role may perform weging.
 */
export function canWegen(role: RoleName | string): boolean {
  return canDo(role, "wegen");
}

/**
 * Returns true when the role may give/approve dispensatie.
 */
export function canGiveDispensatie(role: RoleName | string): boolean {
  return canDo(role, "dispensatie_geven");
}

/**
 * Returns true when the role may approve meldingen.
 */
export function canApproveMelding(role: RoleName | string): boolean {
  return canDo(role, "melding_approve");
}

/**
 * Returns true when the role may download exports.
 */
export function canDownloadExport(role: RoleName | string): boolean {
  return canDo(role, "export_download");
}

/**
 * Throws an error message when the role is not allowed to perform the action.
 */
export function assertCan(role: RoleName | string, action: Action): void {
  if (!canDo(role, action)) {
    throw new Error(`Rol '${role}' heeft geen toestemming voor actie '${action}'.`);
  }
}
