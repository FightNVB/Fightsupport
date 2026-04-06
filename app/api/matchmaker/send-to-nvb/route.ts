import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader, hasAnyRole } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function asString(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUserFromAuthHeader(req);

    if (
      !hasAnyRole(user, [
        "superadmin",
        "admin",
        "matchmaker",
      ])
    ) {
      return NextResponse.json({ error: "Geen toegang." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const matchmakingId = asString(body?.matchmaking_id);

    if (!matchmakingId) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt." },
        { status: 400 }
      );
    }

    // 1) Kijk of matchmaking bestaat
    const { data: uploadRows, error: uploadErr } = await supabaseAdmin
      .from("matchmaking_uploads")
      .select("id, matchmaking_id, uploaded_by")
      .eq("matchmaking_id", matchmakingId)
      .order("uploaded_at", { ascending: false })
      .limit(1);

    if (uploadErr) {
      return NextResponse.json(
        { error: uploadErr.message },
        { status: 500 }
      );
    }

    const upload = uploadRows?.[0];
    if (!upload) {
      return NextResponse.json(
        { error: "Matchmaking niet gevonden." },
        { status: 404 }
      );
    }

    // 2) Optioneel: als matchmaker alleen eigen matchmaking mag sturen
    if (
      !hasAnyRole(user, ["superadmin", "admin"]) &&
      upload.uploaded_by &&
      String(upload.uploaded_by) !== String(user.id)
    ) {
      return NextResponse.json(
        { error: "Je mag alleen je eigen matchmaking doorsturen." },
        { status: 403 }
      );
    }

    // 3) Markeer matchmaking als naar NVB controle gestuurd
    // Voeg deze kolommen toe als ze nog niet bestaan:
    // nvb_controle_ingestuurd boolean
    // nvb_controle_ingestuurd_op timestamptz
    // nvb_controle_ingestuurd_door uuid/text
    const { error: markErr } = await supabaseAdmin
      .from("matchmaking_uploads")
      .update({
        nvb_controle_ingestuurd: true,
        nvb_controle_ingestuurd_op: new Date().toISOString(),
        nvb_controle_ingestuurd_door: user.id,
      })
      .eq("matchmaking_id", matchmakingId);

    if (markErr) {
      return NextResponse.json(
        { error: markErr.message },
        { status: 500 }
      );
    }

    // 4) Zorg dat hij ook terug te vinden is in admin controle_runs
    // Pas kolomnamen aan als jouw schema anders is
    const { data: existingRun, error: existingRunErr } = await supabaseAdmin
      .from("controle_runs")
      .select("id, matchmaking_id, run_type, status")
      .eq("matchmaking_id", matchmakingId)
      .eq("run_type", "nvb")
      .order("gestart_op", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRunErr) {
      return NextResponse.json(
        { error: existingRunErr.message },
        { status: 500 }
      );
    }

    if (!existingRun) {
      const { error: insertRunErr } = await supabaseAdmin
        .from("controle_runs")
        .insert({
          matchmaking_id: matchmakingId,
          run_type: "nvb",
          status: "queued",
          gestart_op: new Date().toISOString(),
          aangevraagd_door: user.id,
        });

      if (insertRunErr) {
        return NextResponse.json(
          { error: insertRunErr.message },
          { status: 500 }
        );
      }
    } else if (existingRun.status !== "queued" && existingRun.status !== "running") {
      const { error: updateRunErr } = await supabaseAdmin
        .from("controle_runs")
        .update({
          status: "queued",
          gestart_op: new Date().toISOString(),
        })
        .eq("id", existingRun.id);

      if (updateRunErr) {
        return NextResponse.json(
          { error: updateRunErr.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "✅ Matchmaking is doorgestuurd naar NVB controle en staat nu klaar onder admin controles.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Onbekende fout." },
      { status: 500 }
    );
  }
}