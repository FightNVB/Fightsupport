import { NextResponse } from "next/server";
import { readJsonFile, resolveScraperUtilsPath } from "../_utils";
import { PRIVATE_NO_STORE, requireAdminAccess, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try { await requireAdminAccess(req); } catch (error) { return secureError(error); }
  const statePath = resolveScraperUtilsPath("fp_session_state.json");
  const unlockPath = resolveScraperUtilsPath("fp_unlock_request.json");

  const session = readJsonFile(statePath, {
    status: "unknown",
    message: "Nog geen FightPassport sessiestatus bekend.",
    updated_at: null,
  });

  const unlockRequest = readJsonFile(unlockPath, null);

  return NextResponse.json({
    ok: true,
    ...session,
    session,
    has_pending_unlock_code: Boolean(unlockRequest?.code),
  }, { headers: { "Cache-Control": PRIVATE_NO_STORE } });
}
