import { NextResponse } from "next/server";
import { requireMatchmakerAccess } from "@/lib/matchmaker/access";
import { buildMatchmakerFighterContext } from "@/lib/matchmaker/buildMatchmakerFighterContext";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mmId = Number(body?.matchmaker_matchmaking_id);
    if (!Number.isFinite(mmId)) {
      return NextResponse.json({ error: "matchmaker_matchmaking_id ontbreekt" }, { status: 400 });
    }

    await requireMatchmakerAccess(req, mmId);
    const result = await buildMatchmakerFighterContext(mmId);
    return NextResponse.json({ ok: true, count: result.count });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
