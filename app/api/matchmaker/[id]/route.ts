import { NextResponse } from "next/server";
import { requireMatchmakerAccess, supabaseAdmin } from "@/lib/matchmaker/access";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params;
    const mmId = Number(params.id);
    if (!Number.isFinite(mmId)) {
      return NextResponse.json({ error: "Ongeldige matchmaking id" }, { status: 400 });
    }

    await requireMatchmakerAccess(req, mmId);

    const [{ data: mm, error: mmErr }, { data: uploads, error: uploadsErr }, { data: fighters, error: fightersErr }, { data: matches, error: matchesErr }, { data: runs, error: runsErr }] = await Promise.all([
      supabaseAdmin.from("matchmaker_matchmakings").select("*").eq("id", mmId).single(),
      supabaseAdmin.from("matchmaker_uploads").select("*").eq("matchmaker_matchmaking_id", mmId).order("created_at", { ascending: false }),
      supabaseAdmin.from("matchmaker_fighter_context").select("*").eq("matchmaker_matchmaking_id", mmId).order("created_at", { ascending: true }),
      supabaseAdmin.from("matchmaker_matches").select("*").eq("matchmaker_matchmaking_id", mmId).order("partij_nr", { ascending: true }),
      supabaseAdmin.from("matchmaker_scrape_runs").select("*").eq("matchmaker_matchmaking_id", mmId).order("created_at", { ascending: false }).limit(5),
    ]);

    if (mmErr) throw mmErr;
    if (uploadsErr) throw uploadsErr;
    if (fightersErr) throw fightersErr;
    if (matchesErr) throw matchesErr;
    if (runsErr) throw runsErr;

    return NextResponse.json({ ok: true, matchmaking: mm, uploads: uploads ?? [], fighters: fighters ?? [], matches: matches ?? [], scrape_runs: runs ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
