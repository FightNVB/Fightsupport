// app/api/matchmaker/delete-matchmaking/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/matchmaker/access";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
} from "@/app/api/_utils/authz";

export const runtime = "nodejs";

async function deleteEq(table: string, column: string, value: string) {
  const { error } = await supabaseAdmin.from(table).delete().eq(column, value);
  if (error) {
    throw new Error(`[${table}] delete eq ${column} failed: ${error.message}`);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const matchmaking_id = String(body?.matchmaking_id ?? "").trim();

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt" },
        { status: 400 }
      );
    }

    const { userId, role } = await requireUserWithRole(req);
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    console.log("[matchmaker/delete-matchmaking] start", { matchmaking_id });

    // optioneel ophalen voor logging / controle
    const { data: insRows, error: insErr } = await supabaseAdmin
      .from("matchmaker_inschrijvingen")
      .select("id, upload_id, va_nummer")
      .eq("matchmaking_id", matchmaking_id);

    if (insErr) throw insErr;

    const { data: runRows, error: runErr } = await supabaseAdmin
      .from("matchmaker_controle_runs")
      .select("id")
      .eq("matchmaking_id", matchmaking_id);

    if (runErr) throw runErr;

    // 1) eerst alle child-tabellen met matchmaking_id opruimen
    await deleteEq("matchmaker_fighter_context", "matchmaking_id", matchmaking_id);
    await deleteEq("matchmaker_fighters_raw", "matchmaking_id", matchmaking_id);
    await deleteEq("matchmaker_uitslagen_raw", "matchmaking_id", matchmaking_id);
    await deleteEq("matchmaker_controle_runs", "matchmaking_id", matchmaking_id);

    // als je deze tabellen ook al hebt / gebruikt, laat ze staan
    // anders kun je deze blokken verwijderen
    try {
      await deleteEq("matchmaker_bout_context", "matchmaking_id", matchmaking_id);
    } catch (e: any) {
      console.warn("[matchmaker/delete-matchmaking] skip matchmaker_bout_context:", e?.message);
    }

    try {
      await deleteEq("matchmaker_controle_resultaten", "matchmaking_id", matchmaking_id);
    } catch (e: any) {
      console.warn("[matchmaker/delete-matchmaking] skip matchmaker_controle_resultaten:", e?.message);
    }

    // 2) inschrijvingen weg
    await deleteEq("matchmaker_inschrijvingen", "matchmaking_id", matchmaking_id);

    // 3) uploads weg
    // Gebruik hier de tabelnaam die jij echt gebruikt.
    // Laat matchmaker_uploads staan als dat jouw echte tabel is.
    await deleteEq("matchmaker_uploads", "matchmaking_id", matchmaking_id);

    // 4) hoofdrecord weg
await deleteEq("matchmaker_matchmakings", "id", matchmaking_id)

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      deleted: {
        inschrijvingen: insRows?.length ?? 0,
        runs: runRows?.length ?? 0,
      },
    });
  } catch (e: any) {
    console.error("❌ delete-matchmaking error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}