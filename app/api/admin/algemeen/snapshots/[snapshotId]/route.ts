import { NextRequest } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/app/api/_utils/authz";
import { privateJson, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";

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
  await requireAdmin(req);
  try {
    const { snapshotId } = await context.params;

    if (!/^[0-9a-f-]{36}$/i.test(snapshotId) && !/^\d+$/.test(snapshotId)) {
      return privateJson({ error: "Ongeldige snapshotId." }, 400);
    }

    const { data, error } = await supabaseAdmin
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
      return privateJson(
        { error: "Kon snapshot niet laden." },
        500
      );
    }

    if (!data) {
      return privateJson(
        { error: "Snapshot niet gevonden." },
        404
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

    return privateJson({
      ok: true,
      item,
    });
  } catch (error: any) {
    return secureError(error, "Kon snapshot niet laden.");
  }
}
