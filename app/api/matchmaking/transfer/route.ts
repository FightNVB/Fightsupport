import { NextResponse } from "next/server";
import { assertCanAccessMatchmaking, getUserBondteam, requireUserWithRole } from "@/app/api/_utils/authz";
import { transferLifecycle } from "@/app/api/_utils/matchmakingLifecycle";

export const runtime = "nodejs";

function s(v: unknown) { return String(v ?? "").trim(); }

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req);
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmaking_id);
    const newStage = s(body?.new_stage) as any;
    const newOwnerType = s(body?.new_owner_type) as any;
    const opmerking = s(body?.opmerking) || null;
    if (!matchmakingId || !newStage || !newOwnerType) {
      return NextResponse.json({ error: "matchmaking_id, new_stage en new_owner_type zijn verplicht." }, { status: 400 });
    }
    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });
    let newOwnerUserId = s(body?.new_owner_user_id) || null;
    let newOwnerBondteam = s(body?.new_owner_bondteam) || null;
    if (newOwnerType === "bondteam" && !newOwnerBondteam) newOwnerBondteam = (await getUserBondteam(userId)) || null;
    if (newOwnerType === "matchmaker" && !newOwnerUserId) newOwnerUserId = userId;

    const row = await transferLifecycle({
      matchmakingId,
      newStage,
      newOwnerType,
      newOwnerUserId,
      newOwnerBondteam,
      actorUserId: userId,
      actorRole: role,
      opmerking,
      metadata: { route: "api/matchmaking/transfer" },
    });

    return NextResponse.json({ ok: true, matchmaking: row });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Onbekende fout." }, { status: 500 });
  }
}
