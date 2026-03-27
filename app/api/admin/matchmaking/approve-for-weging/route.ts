// app/api/admin/matchmaking/approve-for-weging/route.ts
// State transition endpoint: APPROVED → WEGING
// Requires admin role.

import { NextResponse } from "next/server";
import { requireAnyRole, supabaseAdmin } from "@/app/api/_utils/authz";
import { attemptStateTransition, getMatchmakingState } from "@/lib/workflow/stateGates";
import { ERRORS } from "@/lib/constants/errors";

export const runtime = "nodejs";

function isUuid(v: any): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(v ?? "").trim()
  );
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireAnyRole(req, ["admin", "superadmin"]);

    const body = await req.json().catch(() => ({}));
    const { matchmaking_id } = body ?? {};

    if (!isUuid(matchmaking_id)) {
      return NextResponse.json(
        { error: ERRORS.INVALID_UUID("matchmaking_id") },
        { status: 400 }
      );
    }

    const currentState = await getMatchmakingState(supabaseAdmin, matchmaking_id);
    if (!currentState) {
      return NextResponse.json(
        { error: ERRORS.NOT_FOUND("Matchmaking") },
        { status: 404 }
      );
    }

    const result = await attemptStateTransition(supabaseAdmin, {
      matchmaking_id,
      from_state: currentState,
      to_state: "weging",
      actor_id: userId,
      role,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({ ok: true, new_state: result.new_state });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e?.message ?? ERRORS.UNKNOWN_ERROR },
      { status: 500 }
    );
  }
}
