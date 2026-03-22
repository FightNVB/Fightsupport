import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runOfficialsControlJob } from "@/lib/control/runOfficialsControlJob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function claimNextJob() {
  const { data: running, error: runningErr } = await supabase
    .from("official_control_queue")
    .select("id")
    .eq("status", "running")
    .limit(1);

  if (runningErr) throw runningErr;
  if (running && running.length > 0) return null;

  const { data: queued, error: queuedErr } = await supabase
    .from("official_control_queue")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (queuedErr) throw queuedErr;
  if (!queued || queued.length === 0) return null;

  const job = queued[0];

  const { data: claimed, error: claimErr } = await supabase
    .from("official_control_queue")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("*")
    .limit(1);

  if (claimErr) throw claimErr;
  if (!claimed || claimed.length === 0) return null;

  return claimed[0];
}

export async function POST(req: Request) {
  try {
    const expected = process.env.OFFICIALS_QUEUE_SECRET || "";
    const received = req.headers.get("x-officials-queue-secret") || "";

    if (expected && received !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job = await claimNextJob();

    if (!job) {
      return NextResponse.json({
        ok: true,
        processed: false,
        message: "Geen queued job of er draait al een officials-job.",
      });
    }

    try {
      const result = await runOfficialsControlJob({
        queueJobId: job.id,
        matchmaking_id: job.matchmaking_id,
        payload: job.payload ?? {},
      });

      const baseUrl =
        process.env.INTERNAL_BASE_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "http://localhost:3000";

      fetch(`${baseUrl}/api/officials/queue/run-next`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-officials-queue-secret": process.env.OFFICIALS_QUEUE_SECRET || "",
        },
        body: JSON.stringify({ trigger: "chain-next" }),
      }).catch(() => {});

      return NextResponse.json({
        ok: true,
        processed: true,
        job_id: job.id,
        result,
      });
    } catch (err: any) {
      return NextResponse.json(
        {
          ok: false,
          processed: true,
          job_id: job.id,
          error: err?.message ?? "Onbekende fout",
        },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}