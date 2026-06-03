import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ yocId: string }> };

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function countRows(
  supabase: ReturnType<typeof adminClient>,
  table: string,
  yocId: string
) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("yoc_event_id", yocId);

  if (error) return null;
  return count ?? 0;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { yocId } = await params;
  const supabase = adminClient();
  const runId = req.nextUrl.searchParams.get("run_id");

  if (!yocId || yocId === "undefined") {
    return NextResponse.json({ ok: false, error: "Ongeldig YOC-id." }, { status: 400 });
  }

  let q = supabase
    .from("yoc_runs")
    .select("*")
    .eq("yoc_event_id", yocId);

  if (runId) {
    // Bij een expliciete run_id ook rescrape/autocheck runs toestaan.
    q = q.eq("id", runId);
  } else {
    q = q.in("run_type", ["scrape", "rescrape", "autocheck"]).order("created_at", { ascending: false }).limit(1);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const run = Array.isArray(data) ? data[0] : data;

  if (!run) {
    return NextResponse.json({ ok: false, error: "Geen YOC run gevonden." }, { status: 404 });
  }

  const [fighters_count, raw_count, context_count, results_count] = await Promise.all([
    countRows(supabase, "yoc_fighters", yocId),
    countRows(supabase, "yoc_fighters_raw", yocId),
    countRows(supabase, "yoc_fighter_context", yocId),
    countRows(supabase, "yoc_resultaten", yocId),
  ]);

  const status = String(run.status || "unknown");
  const done = ["klaar", "failed", "fout"].includes(status.toLowerCase());

  return NextResponse.json({
    ok: true,
    yoc_event_id: yocId,
    yoc_run_id: run.id,
    status,
    done,
    failed: status.toLowerCase() === "failed" || status.toLowerCase() === "fout",
    error: run.foutmelding ?? null,
    gestart_op: run.gestart_op ?? run.created_at ?? null,
    afgerond_op: run.afgerond_op ?? null,
    counts: {
      fighters_count,
      raw_count,
      context_count,
      results_count,
    },
  });
}
