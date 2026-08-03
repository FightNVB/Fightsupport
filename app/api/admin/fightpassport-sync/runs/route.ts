import { NextResponse } from "next/server";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export async function GET(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);

    const [syncRuns, startverbodRuns] = await Promise.all([
      supabaseAdmin
        .from("fightpassport_sync_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(25),

      supabaseAdmin
        .from("startverbod_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(25),
    ]);

    if (syncRuns.error) throw syncRuns.error;
    if (startverbodRuns.error) throw startverbodRuns.error;

    const mappedStartverbodRuns = (startverbodRuns.data ?? []).map((run: any) => ({
      ...run,
      run_type: "startverbod",
      source_table: "startverbod_runs",
      processed_count: run.excel_rijen ?? 0,
      found_count: run.gekoppeld ?? 0,
      error_count: run.koppelfouten ?? 0,
      meta: {
        scraper: "startverbod",
        excel_rijen: run.excel_rijen ?? 0,
        gekoppeld: run.gekoppeld ?? 0,
        koppelfouten: run.koppelfouten ?? 0,
      },
    }));

    const runs = [...(syncRuns.data ?? []), ...mappedStartverbodRuns]
      .sort(
        (a: any, b: any) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      )
      .slice(0, 25);

    return NextResponse.json({ runs });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json(
      { error: "Runs konden niet worden geladen." },
      { status: 500 }
    );
  }
}



export async function DELETE(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const url = new URL(req.url);
    const runId = url.searchParams.get("run_id");

    if (!runId) {
      return NextResponse.json({ error: "Run-id ontbreekt." }, { status: 400 });
    }

    const { data: syncRun, error: syncReadError } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .select("id,status,run_type,meta")
      .eq("id", runId)
      .maybeSingle();

    if (syncReadError) throw syncReadError;

    if (syncRun) {
      const status = String(syncRun.status ?? "").toLowerCase();
      if (["running", "paused"].includes(status)) {
        return NextResponse.json(
          { error: "Een actieve of gepauzeerde run kan niet worden verwijderd. Rond de run eerst af." },
          { status: 409 }
        );
      }

      const { error: itemsError } = await supabaseAdmin
        .from("fightpassport_sync_items")
        .delete()
        .eq("sync_run_id", runId);

      if (itemsError) throw itemsError;

      const { error: deleteError } = await supabaseAdmin
        .from("fightpassport_sync_runs")
        .delete()
        .eq("id", runId);

      if (deleteError) throw deleteError;
      return NextResponse.json({ ok: true, source: "fightpassport_sync_runs" });
    }

    // Startverbod-runs worden voor het overzicht uit een aparte, oudere tabel
    // samengevoegd. Daarom ook daar zoeken in plaats van onterecht 404 geven.
    const { data: startverbodRun, error: startverbodReadError } = await supabaseAdmin
      .from("startverbod_runs")
      .select("id,status")
      .eq("id", runId)
      .maybeSingle();

    if (startverbodReadError) throw startverbodReadError;
    if (!startverbodRun) {
      return NextResponse.json({ error: "Run niet gevonden." }, { status: 404 });
    }

    const startverbodStatus = String(startverbodRun.status ?? "").toLowerCase();
    if (["running", "paused"].includes(startverbodStatus)) {
      return NextResponse.json(
        { error: "Een actieve startverbod-run kan niet worden verwijderd." },
        { status: 409 }
      );
    }

    const { error: startverbodDeleteError } = await supabaseAdmin
      .from("startverbod_runs")
      .delete()
      .eq("id", runId);

    if (startverbodDeleteError) throw startverbodDeleteError;
    return NextResponse.json({ ok: true, source: "startverbod_runs" });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: "Synchronisatieregel kon niet worden verwijderd." }, { status: 500 });
  }
}
