import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseFromAuthHeader(authHeader: string): any {
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

async function writeAuditLog(
  supabase: any,
  payload: {
    actor_user_id?: string | null;
    actor_email?: string | null;
    actor_role?: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    matchmaking_id?: string | null;
    partij_nr?: number | null;
    old_value?: any;
    new_value?: any;
    meta?: any;
  },
) {
  try {
    await supabase.from("admin_beheer_audit_log").insert({
      actor_user_id: payload.actor_user_id ?? null,
      actor_email: payload.actor_email ?? null,
      actor_role: payload.actor_role ?? null,
      action: payload.action,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id ?? null,
      matchmaking_id: payload.matchmaking_id ?? null,
      partij_nr: payload.partij_nr ?? null,
      old_value: payload.old_value ?? null,
      new_value: payload.new_value ?? null,
      meta: payload.meta ?? null,
    });
  } catch (err) {
    console.error("writeAuditLog error:", err);
  }
}

function asSafeDateOrNull(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  return s || null;
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
    const notitie = String(body?.notitie ?? "").trim() || null;

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt." },
        { status: 400 },
      );
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, bondteam, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const actorRole =
      String(profile?.role ?? "")
        .trim()
        .toLowerCase() || null;

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
        `,
      )
      .eq("matchmaking_id", matchmaking_id)
      .order("uploaded_at", { ascending: false })
      .limit(1);

    if (uploadError) {
      console.error("save-matchmaking uploadError:", uploadError);
      return NextResponse.json(
        { error: "Kon matchmaking_uploads niet laden." },
        { status: 500 },
      );
    }

    const upload = uploads?.[0];
    if (!upload) {
      return NextResponse.json(
        { error: "Geen matchmaking_upload gevonden." },
        { status: 404 },
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
        { status: 500 },
      );
    }

    const run = runs?.[0] ?? null;

    // Snapshot moet partijen kunnen bewaren vanuit elke fase:
    // 1. uitslagen_bouts       -> na / tijdens uitslagen
    // 2. weigh_in_bouts        -> na / tijdens weegstation
    // 3. matchmaking_bouts_raw -> vóór weegstation, direct na upload/controle
    const { data: uitslagenBoutsData, error: uitslagenBoutsError } =
      await supabase
        .from("uitslagen_bouts")
        .select("*")
        .eq("matchmaking_id", matchmaking_id)
        .order("partij_nr", { ascending: true });

    if (uitslagenBoutsError) {
      console.error(
        "save-matchmaking uitslagenBoutsError:",
        uitslagenBoutsError,
      );
      return NextResponse.json(
        { error: "Kon uitslagen_bouts niet laden." },
        { status: 500 },
      );
    }

    const { data: weighInBoutsData, error: weighInBoutsError } = await supabase
      .from("weigh_in_bouts")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .order("partij_nr", { ascending: true });

    if (weighInBoutsError) {
      console.error("save-matchmaking weighInBoutsError:", weighInBoutsError);
      return NextResponse.json(
        { error: "Kon weigh_in_bouts niet laden." },
        { status: 500 },
      );
    }

    const { data: rawBoutsData, error: rawBoutsError } = await supabase
      .from("matchmaking_bouts_raw")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("verwijderd", false)
      .order("partij_nr", { ascending: true });

    if (rawBoutsError) {
      console.error("save-matchmaking rawBoutsError:", rawBoutsError);
      return NextResponse.json(
        { error: "Kon matchmaking_bouts_raw niet laden." },
        { status: 500 },
      );
    }

    const uitslagenBouts = Array.isArray(uitslagenBoutsData)
      ? uitslagenBoutsData
      : [];
    const weighInBouts = Array.isArray(weighInBoutsData)
      ? weighInBoutsData
      : [];
    const rawBouts = Array.isArray(rawBoutsData) ? rawBoutsData : [];

    let boutsSource = "matchmaking_bouts_raw";
    let bouts = rawBouts;

    if (uitslagenBouts.length > 0) {
      boutsSource = "uitslagen_bouts";
      bouts = uitslagenBouts;
    } else if (weighInBouts.length > 0) {
      boutsSource = "weigh_in_bouts";
      bouts = weighInBouts;
    }

    const totaalPartijen = bouts.length;

    const snapshot = {
      matchmaking_id,
      upload_id: upload.id ?? null,
      saved_by_user_id: user.id ?? null,
      saved_by_email: user.email ?? null,
      saved_by_name: profile?.full_name ?? null,

      evenement_naam: upload.evenement_naam ?? null,
      evenement_datum: asSafeDateOrNull(upload.evenement_datum),
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

      totaal_partijen: totaalPartijen,
      notitie,

      payload_json: {
        upload,
        latest_run: run,
        bouts,
        bouts_source: boutsSource,
        uitslagen_bouts: uitslagenBouts,
        weigh_in_bouts: weighInBouts,
        raw_bouts: rawBouts,
        saved_from: "admin_controle_overzicht",
      },
    };

    const { data: inserted, error: insertError } = await supabase
      .from("admin_beheer_matchmaking_snapshots")
      .insert(snapshot)
      .select("id, matchmaking_id, created_at, totaal_partijen")
      .single();

    if (insertError) {
      console.error("save-matchmaking insertError:", insertError);
      return NextResponse.json(
        { error: "Opslaan in beheer-tabel mislukt." },
        { status: 500 },
      );
    }

    await writeAuditLog(supabase, {
      actor_user_id: user.id,
      actor_email: user.email ?? null,
      actor_role: actorRole,
      action: "snapshot_created",
      entity_type: "matchmaking_snapshot",
      entity_id: inserted?.id ?? null,
      matchmaking_id,
      new_value: {
        snapshot_id: inserted?.id ?? null,
        evenement_naam: upload.evenement_naam ?? null,
        bondteam: upload.bondteam ?? null,
        totaal_partijen: totaalPartijen,
      },
      meta: {
        saved_from: "admin_controle_overzicht",
        bouts_source: boutsSource,
        uitslagen_bouts: uitslagenBouts.length,
        weigh_in_bouts: weighInBouts.length,
        raw_bouts: rawBouts.length,
        notitie,
      },
    });

    return NextResponse.json({
      ok: true,
      snapshot_id: inserted?.id ?? null,
      totaal_partijen: inserted?.totaal_partijen ?? totaalPartijen,
      message: "✅ Matchmaking opgeslagen in beheer-database.",
    });
  } catch (error: any) {
    console.error("save-matchmaking fatal:", error);
    return NextResponse.json(
      { error: error?.message ?? "Onbekende fout." },
      { status: 500 },
    );
  }
}
