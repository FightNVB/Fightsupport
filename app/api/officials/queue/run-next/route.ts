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

const STALE_RUNNING_MINUTES = 30;

function minutesAgoIso(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

async function releaseStaleRunningJobs() {
  const cutoff = minutesAgoIso(STALE_RUNNING_MINUTES);

  const { data: staleRows, error: staleErr } = await supabase
    .from("official_control_queue")
    .select("id, matchmaking_id, status, started_at, controle_run_id")
    .eq("status", "running")
    .lt("started_at", cutoff);

  if (staleErr) throw staleErr;

  if (!staleRows || staleRows.length === 0) {
    return [];
  }

  const staleIds = staleRows.map((row: any) => row.id);

  const { error: queueUpdateErr } = await supabase
    .from("official_control_queue")
    .update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error_message: `Automatisch vrijgegeven: running job ouder dan ${STALE_RUNNING_MINUTES} minuten`,
    })
    .in("id", staleIds);

  if (queueUpdateErr) throw queueUpdateErr;

  for (const row of staleRows) {
    const controleRunId = String((row as any)?.controle_run_id ?? "").trim();
    if (!controleRunId) continue;

    try {
      await supabase
        .from("controle_runs")
        .update({
          status: "failed",
          foutmelding: `Automatisch vrijgegeven: officials queue job bleef langer dan ${STALE_RUNNING_MINUTES} minuten running`,
          afgerond_op: new Date().toISOString(),
        })
        .eq("id", controleRunId)
        .eq("status", "running");
    } catch (e) {
      console.error("⚠️ officials queue stale controle_run vrijgeven mislukt:", {
        controle_run_id: controleRunId,
        error: e,
      });
    }
  }

  console.warn("[officials/queue/run-next] stale running jobs vrijgegeven:", staleRows);

  return staleRows;
}

async function claimNextJob() {
  await releaseStaleRunningJobs();

  const { data: running, error: runningErr } = await supabase
    .from("official_control_queue")
    .select("id, matchmaking_id, status, created_at, started_at, controle_run_id")
    .eq("status", "running")
    .order("created_at", { ascending: true })
    .limit(1);

  if (runningErr) throw runningErr;

  if (running && running.length > 0) {
    console.log("[officials/queue/run-next] skip claim: running job exists", running[0]);
    return {
      job: null,
      reason: "running_exists" as const,
      running: running[0],
    };
  }

  const { data: queued, error: queuedErr } = await supabase
    .from("official_control_queue")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);

  if (queuedErr) throw queuedErr;

  if (!queued || queued.length === 0) {
    console.log("[officials/queue/run-next] no queued jobs found");
    return {
      job: null,
      reason: "no_queued" as const,
      running: null,
    };
  }

  const nextJob = queued[0];

  const { data: claimed, error: claimErr } = await supabase
    .from("official_control_queue")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      finished_at: null,
      error_message: null,
    })
    .eq("id", nextJob.id)
    .eq("status", "queued")
    .select("*")
    .limit(1);

  if (claimErr) throw claimErr;

  if (!claimed || claimed.length === 0) {
    console.log("[officials/queue/run-next] claim lost race", { job_id: nextJob.id });
    return {
      job: null,
      reason: "claim_lost" as const,
      running: null,
    };
  }

  console.log("[officials/queue/run-next] claimed job", {
    id: claimed[0].id,
    matchmaking_id: claimed[0].matchmaking_id,
  });

  return {
    job: claimed[0],
    reason: "claimed" as const,
    running: null,
  };
}

export async function POST(req: Request) {
  try {
    const expected = process.env.OFFICIALS_QUEUE_SECRET || "";
    const received = req.headers.get("x-officials-queue-secret") || "";

    if (expected && received !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const claimed = await claimNextJob();

    if (!claimed.job) {
      return NextResponse.json({
        ok: true,
        processed: false,
        reason: claimed.reason,
        running_job: claimed.running ?? null,
        message:
          claimed.reason === "running_exists"
            ? "Er draait al een officials-job."
            : claimed.reason === "no_queued"
            ? "Geen queued officials-job gevonden."
            : "Queue job niet geclaimd.",
      });
    }

    const job = claimed.job;

    let result: any = null;

    try {
      result = await runOfficialsControlJob({
        queueJobId: job.id,
        matchmaking_id: job.matchmaking_id,
        payload: job.payload ?? {},
      });
    } catch (err: any) {
      console.error("❌ officials queue run-next job failed:", {
        job_id: job.id,
        matchmaking_id: job.matchmaking_id,
        error: err?.message ?? String(err),
      });

      return NextResponse.json(
        {
          ok: false,
          processed: true,
          job_id: job.id,
          matchmaking_id: job.matchmaking_id,
          error: err?.message ?? "Onbekende fout",
        },
        { status: 500 }
      );
    }

    try {
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
      }).catch((e) => {
        console.error("⚠️ officials queue chain-next trigger mislukt:", e);
      });
    } catch (e) {
      console.error("⚠️ officials queue chain-next setup fout:", e);
    }

    return NextResponse.json({
      ok: true,
      processed: true,
      job_id: job.id,
      matchmaking_id: job.matchmaking_id,
      result,
    });
  } catch (err: any) {
    console.error("❌ officials queue run-next route error:", err);

    return NextResponse.json(
      { error: err?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}