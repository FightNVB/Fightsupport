import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAnyRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  try {
    await requireAnyRole(req, ["admin", "superadmin"]);

    const { data: matchmakings, error } = await supabaseAdmin
      .from("matchmakings")
      .select(`
        id,
        naam,
        datum,
        locatie,
        promotor,
        bondteam,
        bron_type,
        stadium,
        status,
        final_status,
        huidige_eigenaar_type,
        huidige_eigenaar_user_id,
        huidige_eigenaar_bondteam,
        created_at,
        last_updated_at,
        last_updated_by,
        submitted_to_admin_at,
        entered_control_at,
        sent_to_officials_at,
        entered_weegstation_at,
        ready_for_results_at,
        results_finalized_at,
        is_actief,
        locked_for_editing,
        is_archived,
        matchmaker_id,
        hoofdofficial_id
      `)
      .eq("is_archived", false)
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[matchmakings-overzicht] matchmakings error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      rows: matchmakings ?? [],
    });
  } catch (e: any) {
    console.error("[matchmakings-overzicht] unexpected:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Onverwachte fout" },
      { status: 500 }
    );
  }
}