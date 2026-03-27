// lib/auth/accessControl.ts
// Access control helpers for API route handlers.
// Wraps the canonical authz utility with typed role enforcement.

import { NextResponse } from "next/server";
import {
  requireUserWithRole,
  getUserBondteam,
  getMatchmakingMeta,
  supabaseAdmin,
} from "@/app/api/_utils/authz";
import type { RoleName } from "@/lib/types/workflow";
import { normalizeRole, isAdminLike } from "@/lib/auth/roleChecks";
import { canDo, type Action } from "@/lib/constants/roleMatrix";
import { ERRORS } from "@/lib/constants/errors";

export type AuthedUser = {
  userId: string;
  role: RoleName;
  bondteam: string | null;
};

/**
 * Authenticate + authorize a request for one or more allowed roles.
 * Throws a NextResponse 401/403 on failure.
 */
export async function requireRoleAccess(
  req: Request,
  allowedRoles: RoleName[]
): Promise<AuthedUser> {
  const { userId, role: rawRole } = await requireUserWithRole(req);
  const role = normalizeRole(rawRole);

  if (role !== "superadmin" && !allowedRoles.includes(role)) {
    throw NextResponse.json({ error: ERRORS.NO_ACCESS }, { status: 403 });
  }

  const bondteam = await getUserBondteam(userId);
  return { userId, role, bondteam };
}

/**
 * Authenticate and check that the user can perform a specific action.
 * Throws a NextResponse 401/403 on failure.
 */
export async function requireAction(
  req: Request,
  action: Action
): Promise<AuthedUser> {
  const { userId, role: rawRole } = await requireUserWithRole(req);
  const role = normalizeRole(rawRole);

  if (!canDo(role, action)) {
    throw NextResponse.json({ error: ERRORS.NO_ACCESS }, { status: 403 });
  }

  const bondteam = await getUserBondteam(userId);
  return { userId, role, bondteam };
}

/**
 * Ensure a user can access a specific matchmaking.
 * - admin/superadmin: always
 * - matchmaker: only own matchmaking (uploaded_by == userId)
 * - official/hoofdofficial: only same bondteam
 */
export async function assertMatchmakingAccess(
  matchmakingId: string,
  user: AuthedUser
): Promise<void> {
  const { userId, role, bondteam } = user;

  if (isAdminLike(role)) return;

  const meta = await getMatchmakingMeta(matchmakingId);

  if (role === "matchmaker") {
    if (!meta?.uploaded_by || meta.uploaded_by !== userId) {
      throw NextResponse.json({ error: ERRORS.NOT_OWN_MATCHMAKING }, { status: 403 });
    }
    return;
  }

  if (role === "official" || role === "hoofdofficial") {
    const mmBond = meta?.bondteam ?? null;
    if (!mmBond || !bondteam || String(mmBond).toLowerCase() !== String(bondteam).toLowerCase()) {
      throw NextResponse.json({ error: ERRORS.NOT_OWN_BONDTEAM }, { status: 403 });
    }
    return;
  }

  throw NextResponse.json({ error: ERRORS.NO_ACCESS }, { status: 403 });
}

/**
 * Authenticate + ensure access to a matchmaking in one call.
 */
export async function requireMatchmakingAccess(
  req: Request,
  matchmakingId: string,
  allowedRoles: RoleName[]
): Promise<AuthedUser> {
  const user = await requireRoleAccess(req, allowedRoles);
  await assertMatchmakingAccess(matchmakingId, user);
  return user;
}

export { supabaseAdmin };
