import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const TOTAL_ROBOT_FILE = "scraper_fp_total.js";

function resolveScriptPath(...parts: string[]) {
  const root = process.cwd();
  const candidates = [
    path.join(root, ...parts),
    path.join(root, "ControlEngine", ...parts),
    path.join(root, "ControlEngine", "ControlEngine", ...parts),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`Robot niet gevonden:\n- ${candidates.join("\n- ")}`);
}

function positiveInt(value: unknown, fallback: number, max = 20) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

function isClosedStatus(value: unknown) {
  return ["completed", "cancelled", "canceled"].includes(
    String(value ?? "").toLowerCase()
  );
}

function accumulatedRuntimeBeforeResume(
  run: { started_at?: unknown; finished_at?: unknown },
  meta: Record<string, unknown>
) {
  const stored = Number(meta.accumulated_runtime_ms);
  if (Number.isFinite(stored) && stored >= 0) return stored;

  const segmentStart = new Date(
    String(meta.resumed_at ?? meta.cycle_started_at ?? run.started_at ?? "")
  ).getTime();
  const segmentEnd = new Date(
    String(meta.last_stopped_at ?? run.finished_at ?? "")
  ).getTime();
  return Number.isFinite(segmentStart) && Number.isFinite(segmentEnd) && segmentEnd >= segmentStart
    ? segmentEnd - segmentStart
    : 0;
}

export async function POST(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);

    const body = await req.json().catch(() => ({}));
    const runId = String(body?.run_id ?? "").trim();

    if (!runId) {
      return NextResponse.json({ error: "run_id ontbreekt." }, { status: 400 });
    }

    const { data: run, error: runError } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .select("*")
      .eq("id", runId)
      .maybeSingle();

    if (runError) throw runError;
    if (!run) {
      return NextResponse.json({ error: "Run niet gevonden." }, { status: 404 });
    }

    if (String(run.run_type ?? "").toLowerCase() !== "full") {
      return NextResponse.json(
        { error: "Alleen Total AutoCheck-runs kunnen worden hervat." },
        { status: 400 }
      );
    }

    const status = String(run.status ?? "").toLowerCase();
    if (isClosedStatus(status)) {
      return NextResponse.json(
        { error: `Deze run is al afgesloten (${run.status}).` },
        { status: 409 }
      );
    }
    if (status !== "paused" && status !== "failed") {
      return NextResponse.json(
        { error: `Alleen een gepauzeerde of mislukte run kan worden hervat; huidige status is ${run.status}.` },
        { status: 409 }
      );
    }

    const { data: runningRun, error: runningError } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .select("id,start_va,end_va,status")
      .eq("run_type", "full")
      .eq("status", "running")
      .neq("id", runId)
      .limit(1)
      .maybeSingle();

    if (runningError) throw runningError;
    if (runningRun) {
      return NextResponse.json(
        {
          error: "Er draait al een Total AutoCheck-run. Pauzeer die eerst.",
          run_id: runningRun.id,
        },
        { status: 409 }
      );
    }

    const startVa = Number(run.start_va);
    const endVa = Number(run.end_va);
    if (!Number.isInteger(startVa) || !Number.isInteger(endVa) || endVa < startVa) {
      return NextResponse.json(
        { error: "De opgeslagen run heeft geen geldig VA-bereik." },
        { status: 400 }
      );
    }

    const meta = (run.meta ?? {}) as Record<string, unknown>;
    const workers = positiveInt(meta.workers_per_process ?? meta.workers, 20);
    const explicitVaList = Array.isArray(meta.explicit_va_list)
      ? meta.explicit_va_list.map(String).filter((value) => /^\d{3,6}$/.test(value))
      : [];

    const robotPath = resolveScriptPath(
      "scrapers",
      "fp_total",
      TOTAL_ROBOT_FILE
    );

    const resumedAt = new Date().toISOString();
    const nextMeta = {
      ...meta,
      workers,
      pid: null,
      accumulated_runtime_ms: accumulatedRuntimeBeforeResume(run, meta),
      resumed_at: resumedAt,
      resume_requested_at: resumedAt,
      resume_requested_by_api: true,
    };

    const { error: updateError } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .update({
        status: "running",
        finished_at: null,
        error_message: null,
        meta: nextMeta,
      })
      .eq("id", runId);

    if (updateError) throw updateError;

    const child = spawn("node", [robotPath, String(startVa), String(endVa)], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      cwd: path.dirname(robotPath),
      windowsHide: true,
      env: {
        ...process.env,
        FP_MATCHMAKER_ID: "",
        FP_SESSION_MODE: "master",
        HEADLESS: process.env.HEADLESS ?? "false",
        PUPPETEER_HEADLESS:
          process.env.PUPPETEER_HEADLESS ??
          process.env.HEADLESS ??
          "false",
        WORKERS: String(workers),
        FP_TOTAL_WORKERS: String(workers),
        FP_TOTAL_RUN_ID: runId,
        FP_TOTAL_RUN_KIND: String(meta.run_kind ?? (explicitVaList.length ? "retry" : "full")),
        FP_TOTAL_VA_LIST: explicitVaList.join(","),
        FP_TOTAL_BATCH_ID: String(meta.batch_id ?? ""),
        FP_TOTAL_BATCH_PART: String(meta.batch_part ?? 1),
        FP_TOTAL_BATCH_PARTS: String(meta.batch_parts ?? 1),
        FP_TOTAL_BATCH_START_VA: String(meta.batch_start_va ?? startVa),
        FP_TOTAL_BATCH_END_VA: String(meta.batch_end_va ?? endVa),
        STAGGER_MS: String(meta.stagger_ms ?? process.env.STAGGER_MS ?? 2500),
        FP_TOTAL_RESULTS: "true",
        FIGHTSUPPORT_INTERNAL_URL:
          process.env.FIGHTSUPPORT_INTERNAL_URL ||
          process.env.INTERNAL_APP_URL ||
          new URL(req.url).origin,
        TERMINATOR_INTERNAL_TOKEN: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      },
    });

    const pid = child.pid ?? null;

    child.stdout?.on("data", (data) => {
      process.stdout.write(`[fp_total_resume] ${data.toString()}`);
    });
    child.stderr?.on("data", (data) => {
      process.stderr.write(`[fp_total_resume][stderr] ${data.toString()}`);
    });

    child.on("error", async (error) => {
      console.error(`[fightpassport-sync/resume] spawn mislukt voor run ${runId}:`, error);
      await supabaseAdmin
        .from("fightpassport_sync_runs")
        .update({
          status: "paused",
          finished_at: null,
          error_message: `Hervatten kon niet worden gestart: ${error.message}`,
          meta: { ...nextMeta, pid: null, resume_spawn_failed_at: new Date().toISOString() },
        })
        .eq("id", runId);
    });

    child.on("close", (code, signal) => {
      console.log("[fightpassport-sync/resume] scraperproces afgesloten", {
        run_id: runId,
        code,
        signal,
      });
    });

    child.unref();

    await supabaseAdmin
      .from("fightpassport_sync_runs")
      .update({
        meta: { ...nextMeta, pid, resumed_at: resumedAt },
      })
      .eq("id", runId);

    return NextResponse.json(
      {
        ok: true,
        resumed: true,
        run_id: runId,
        pid,
        start_va: startVa,
        end_va: endVa,
        processed_count: Number(run.processed_count ?? 0),
        message: `Total AutoCheck-run hervat. Alleen nog niet verwerkte VA-nummers binnen ${startVa}–${endVa} worden opgepakt.`,
      },
      { status: 202 }
    );
  } catch (error: any) {
    if (error instanceof NextResponse) return error;
    console.error("[fightpassport-sync/resume] hervatten mislukt:", error);
    return NextResponse.json(
      { error: error?.message ?? "Run hervatten mislukt." },
      { status: 500 }
    );
  }
}
