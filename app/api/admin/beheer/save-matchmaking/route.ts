import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

async function writeAuditLog(
  supabase: ReturnType<typeof createClient>,
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
  }
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
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, bondteam, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const actorRole = String(profile?.role ?? "")
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

    const { data: boutsData, error: boutsError } = await supabase
      .from("weigh_in_bouts")
      .select(
        `
          id,
          partij_nr,
          discipline,
          klasse_mm,
          max_gewicht,
          rood_naam,
          rood_gym,
          rood_va,
          rood_doorgegeven_gewicht,
          rood_gewogen_gewicht,
          blauw_naam,
          blauw_gym,
          blauw_va,
          blauw_doorgegeven_gewicht,
          blauw_gewogen_gewicht,
          gewicht_verschil,
          leeftijd_type,
          reglement_status,
          praktijk_status,
          eindstatus,
          dispensatie_nodig,
          dispensatie_verleend,
          dispensatie_reason,
          dispensatie_by,
          dispensatie_at,
          gewicht_strafpunt_rood,
          gewicht_strafpunt_blauw,
          admin_sanctie_nodig,
          admin_sanctie_reason,
          weging_notitie,
          laatste_bewerking_op,
          laatste_bewerking_door,
          created_at,
          updated_at
        `
      )
      .eq("matchmaking_id", matchmaking_id)
      .order("partij_nr", { ascending: true });

    if (boutsError) {
      console.error("save-matchmaking boutsError:", boutsError);
      return NextResponse.json(
        { error: "Kon weigh_in_bouts niet laden." },
        { status: 500 }
      );
    }

    const bouts = Array.isArray(boutsData) ? boutsData : [];
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
        { status: 500 }
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
      { status: 500 }
    );
  }
}