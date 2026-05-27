import { NextResponse } from "next/server";
import { readJsonFile, resolveScraperUtilsPath } from "../_utils";

export const runtime = "nodejs";

export async function GET() {
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
  });
}
