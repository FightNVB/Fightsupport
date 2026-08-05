import { NextResponse } from "next/server";
import {
  assertCanAccessMatchmaking,
  requireAdmin,
  requireUserWithRole,
  type AuthzUser,
  type RoleName,
} from "@/app/api/_utils/authz";

export const PRIVATE_NO_STORE = "private, no-store";

export async function requireMatchmakingAccess(
  req: Request,
  matchmakingId: string,
  roles: RoleName[] = ["matchmaker", "official", "hoofdofficial", "admin", "superadmin"],
): Promise<AuthzUser> {
  const auth = await requireUserWithRole(req, roles);
  await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId: auth.userId, role: auth.role });
  return auth;
}

export async function requireAdminAccess(req: Request): Promise<AuthzUser> {
  return requireAdmin(req);
}

export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": PRIVATE_NO_STORE, Pragma: "no-cache" },
  });
}

export function secureError(error: unknown, fallback = "De aanvraag kon niet worden verwerkt.") {
  if (error instanceof Response) {
    const headers = new Headers(error.headers);
    headers.set("Cache-Control", PRIVATE_NO_STORE);
    headers.set("Pragma", "no-cache");
    return new Response(error.body, { status: error.status, statusText: error.statusText, headers });
  }
  console.error("[secure-route]", error);
  return privateJson({ ok: false, error: fallback }, 500);
}
