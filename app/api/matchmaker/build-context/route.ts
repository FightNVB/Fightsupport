import { NextResponse } from "next/server";
import { requireMatchmakerAccess } from "@/lib/matchmaker/access";
import { buildMatchmakerFighterContext } from "@/lib/matchmaker/buildMatchmakerFighterContext";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mmIdStr = String(body?.matchmaker_matchmaking_id ?? "").trim();
    const mmIdNum = Number(body?.matchmaker_matchmaking_id);
    if (!mmIdStr) {
      return NextResponse.json({ error: "matchmaker_matchmaking_id ontbreekt" }, { status: 400 });
    }

    await requireMatchmakerAccess(req, mmIdNum);
    const result = await buildMatchmakerFighterContext(mmIdStr);
    return NextResponse.json({ ok: true, count: result.count });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
