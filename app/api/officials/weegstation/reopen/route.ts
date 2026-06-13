import { NextResponse } from "next/server";
import { getWeegstationAuthContext } from "@/lib/weegstation/routeAuth";

export const runtime = "nodejs";

function s(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s((body as any)?.matchmakingId);

    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmakingId ontbreekt." }, { status: 400 });
    }

    const { admin, userId, isHoofdofficialLike } =
      await getWeegstationAuthContext(req, matchmakingId);

    if (!isHoofdofficialLike) {
      return NextResponse.json(
        { error: "Alleen hoofdofficial of superadmin mag het weegstation heropenen." },
        { status: 403 },
      );
    }

    const { data: mm, error: mmErr } = await admin
      .from("matchmakings")
      .select("id, bondteam, huidige_eigenaar_bondteam, stadium, status")
      .eq("id", matchmakingId)
      .single();

    if (mmErr || !mm) {
      throw new Error(mmErr?.message ?? "Matchmaking niet gevonden.");
    }

    const alreadyOpen =
      s((mm as any)?.stadium).toLowerCase() === "in_weegstation" ||
      s((mm as any)?.status).toLowerCase() === "in_weegstation";

    const bondteam =
      s((mm as any)?.huidige_eigenaar_bondteam) ||
      s((mm as any)?.bondteam) ||
      null;

    const nowIso = new Date().toISOString();

    const { error: updErr } = await admin
      .from("matchmakings")
      .update({
        stadium: "in_weegstation",
        status: "in_weegstation",
        huidige_eigenaar_type: "bondteam",
        huidige_eigenaar_user_id: userId,
        huidige_eigenaar_bondteam: bondteam,
        last_updated_at: nowIso,
        last_updated_by: userId,
      })
      .eq("id", matchmakingId);

    if (updErr) throw updErr;

    const { error: uploadErr } = await admin
      .from("matchmaking_uploads")
      .update({
        flow_status: "in_weegstation",
      })
      .eq("matchmaking_id", matchmakingId);

    if (uploadErr) {
      const msg = String(uploadErr.message || "").toLowerCase();
      if (!msg.includes("flow_status")) throw uploadErr;
    }

    // Bij tussentijds finalize worden nog niet gewogen partijen als
    // NIET_VERSCHENEN in controle_resultaten gezet. Als we het weegstation
    // heropenen, moeten die tijdelijke meldingen weg, anders blijven ze in
    // controle/lineup zichtbaar terwijl de vechter morgen nog gewogen wordt.
    const { data: removedAbsentRows, error: absentDeleteErr } = await admin
      .from("controle_resultaten")
      .delete()
      .eq("matchmaking_id", matchmakingId)
      .eq("source_table", "weigh_in_bouts")
      .eq("rule", "weegstation_status")
      .eq("rule_code", "NIET_VERSCHENEN")
      .select("id");

    if (absentDeleteErr) throw absentDeleteErr;

    return NextResponse.json({
      ok: true,
      already_open: alreadyOpen,
      matchmaking_id: matchmakingId,
      stadium: "in_weegstation",
      status: "in_weegstation",
      removed_niet_verschenen: removedAbsentRows?.length ?? 0,
      message: alreadyOpen
        ? "Weegstation was al geopend. Tijdelijke niet-verschenen meldingen zijn gecontroleerd/verwijderd."
        : "Weegstation heropend. Bestaande wegingen zijn bewaard en tijdelijke niet-verschenen meldingen zijn verwijderd.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Heropenen van weegstation mislukt." },
      { status: 500 },
    );
  }
}
