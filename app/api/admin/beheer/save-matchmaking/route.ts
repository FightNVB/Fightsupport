import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseFromAuthHeader(authHeader: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase env vars ontbreken.");
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
    }

    const supabase = getSupabaseFromAuthHeader(authHeader);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const matchmaking_id = String(body?.matchmaking_id ?? "").trim();

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt." },
        { status: 400 }
      );
    }

    const { data: uploads, error: uploadError } = await supabase
      .from("matchmaking_uploads")
      .select(
        `
          id,
          uploaded_at,
          uploaded_by,
          hoofdofficial_user_id,
          evenement_naam,
          evenement_datum,
          locatie,
          matchmaking_id,
          matchmaker,
          promotor,
          bondteam,
          official_release,
          official_released_at
        `
      )
      .eq("matchmaking_id", matchmaking_id)
      .order("uploaded_at", { ascending: false })
      .limit(1);

    if (uploadError) {
      console.error("save-matchmaking uploadError:", uploadError);
      return NextResponse.json(
        { error: "Kon matchmaking_uploads niet laden." },
        { status: 500 }
      );
    }

    const upload = uploads?.[0];
    if (!upload) {
      return NextResponse.json(
        { error: "Geen matchmaking_upload gevonden." },
        { status: 404 }
      );
    }

    const { data: runs, error: runError } = await supabase
      .from("controle_runs")
      .select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type")
      .eq("matchmaking_id", matchmaking_id)
      .order("gestart_op", { ascending: false })
      .limit(1);

    if (runError) {
      console.error("save-matchmaking runError:", runError);
      return NextResponse.json(
        { error: "Kon controle_runs niet laden." },
        { status: 500 }
      );
    }

    const run = runs?.[0] ?? null;

    const snapshot = {
      matchmaking_id,
      upload_id: upload.id ?? null,
      saved_by_user_id: user.id ?? null,
      saved_by_email: user.email ?? null,

      evenement_naam: upload.evenement_naam ?? null,
      evenement_datum: upload.evenement_datum ?? null,
      locatie: upload.locatie ?? null,
      matchmaker: upload.matchmaker ?? null,
      promotor: upload.promotor ?? null,
      bondteam: upload.bondteam ?? null,

      official_release: !!upload.official_release,
      official_released_at: upload.official_released_at ?? null,

      controle_run_id: run?.id ?? null,
      controle_status: run?.status ?? null,
      controle_gestart_op: run?.gestart_op ?? null,
      controle_afgerond_op: run?.afgerond_op ?? null,
      controle_run_type: run?.run_type ?? null,

      payload_json: {
        upload,
        latest_run: run,
        saved_from: "admin_controle_overzicht",
      },
    };

    const { error: insertError } = await supabase
      .from("admin_beheer_matchmaking_snapshots")
      .insert(snapshot);

    if (insertError) {
      console.error("save-matchmaking insertError:", insertError);
      return NextResponse.json(
        { error: "Opslaan in beheer-tabel mislukt." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "✅ Matchmaking opgeslagen in beheer-database.",
    });
  } catch (error: any) {
    console.error("save-matchmaking fatal:", error);
    return NextResponse.json(
      { error: error?.message ?? "Onbekende fout." },
      { status: 500 }
    );
  }
}