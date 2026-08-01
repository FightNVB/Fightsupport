import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);

    const url = new URL(req.url);
    const allOpen = url.searchParams.get("allOpen") === "true";
    const requestedRunId = url.searchParams.get("run_id");

    const { data: latestRun, error: latestRunError } = await supabaseAdmin
      .from("startverbod_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRunError) throw latestRunError;

    const runId = requestedRunId || (allOpen ? null : latestRun?.id ?? null);

    let query = supabaseAdmin
      .from("startverbod_koppelfouten")
      .select(
        "id,run_id,naam_bron,soort,ingang,einde,fout_type,mogelijke_va_nummers,mogelijke_namen,opgelost,opgelost_va_nummer,opgelost_at,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(250);

    if (runId) {
      // Standaard alleen de fouten van de laatste startverbod-run.
      query = query.eq("run_id", runId);
    } else {
      // Alleen expliciet met ?allOpen=true alle nog openstaande historische fouten.
      query = query.eq("opgelost", false);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      latestRun: latestRun ?? null,
      selectedRunId: runId,
      errors: data ?? [],
      count: data?.length ?? 0,
    });
  } catch (error: any) {
    if (error instanceof NextResponse) return error;

    console.error("startverbod koppelfouten laden:", error);
    return NextResponse.json(
      { error: error?.message || "Startverbod-koppelfouten laden mislukt." },
      { status: 500 }
    );
  }
}
