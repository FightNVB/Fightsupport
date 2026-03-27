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

function getTotaalPartijen(item: any): number {
  if (typeof item?.totaal_partijen === "number") {
    return item.totaal_partijen;
  }

  const bouts = item?.payload_json?.bouts;
  if (Array.isArray(bouts)) {
    return bouts.length;
  }

  return 0;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ snapshotId: string }> }
) {
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

    const { snapshotId } = await context.params;

    if (!snapshotId) {
      return NextResponse.json(
        { error: "snapshotId ontbreekt." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("admin_beheer_matchmaking_snapshots")
      .select(
        `
          id,
          created_at,
          updated_at,
          matchmaking_id,
          upload_id,
          saved_by_user_id,
          saved_by_email,
          saved_by_name,
          evenement_naam,
          evenement_datum,
          locatie,
          matchmaker,
          promotor,
          bondteam,
          official_release,
          official_released_at,
          controle_run_id,
          controle_status,
          controle_gestart_op,
          controle_afgerond_op,
          controle_run_type,
          totaal_partijen,
          notitie,
          payload_json
        `
      )
      .eq("id", snapshotId)
      .maybeSingle();

    if (error) {
      console.error("snapshot detail error:", error);
      return NextResponse.json(
        { error: "Kon snapshot niet laden." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Snapshot niet gevonden." },
        { status: 404 }
      );
    }

    const payload_json =
      data?.payload_json && typeof data.payload_json === "object"
        ? data.payload_json
        : {};

    const item = {
      ...data,
      payload_json: {
        upload: payload_json?.upload ?? null,
        latest_run: payload_json?.latest_run ?? null,
        bouts: Array.isArray(payload_json?.bouts) ? payload_json.bouts : [],
        saved_from: payload_json?.saved_from ?? null,
      },
      totaal_partijen: getTotaalPartijen({
        ...data,
        payload_json,
      }),
    };

    return NextResponse.json({
      ok: true,
      item,
    });
  } catch (error: any) {
    console.error("snapshot detail fatal:", error);
    return NextResponse.json(
      { error: error?.message ?? "Onbekende fout." },
      { status: 500 }
    );
  }
}