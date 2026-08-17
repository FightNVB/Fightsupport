// app/api/admin/fightpassport-sync/start/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import {
  requireUserWithRole,
} from "@/app/api/_utils/authz";
import { supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const TOTAL_ROBOT_FILE = "scraper_fp_total.js";

function resolveScriptPath(...parts: string[]) {
  const root = process.cwd();

  const candidates = [
    path.join(root, ...parts),
    path.join(root, "ControlEngine", ...parts),
    path.join(root, "ControlEngine", "ControlEngine", ...parts),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(`Robot niet gevonden:\n- ${candidates.join("\n- ")}`);
}

function clampInt(n: any, def: number, min: number, max: number): number {
  const num = Number(n);
  if (!Number.isFinite(num)) return def;
  const v = Math.floor(num);
  return Math.max(min, Math.min(max, v));
}

function isRoleAllowedForRoute(role: string | null | undefined) {
  return role === "admin" || role === "superadmin";
}

function runNodeScript(
  scriptPath: string,
  args: string[],
  envExtra?: Record<string, string>,
  logPrefix?: string
): Promise<{ stdout: string; stderr: string; ms: number }> {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();

    const proc = spawn("node", [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      cwd: path.dirname(scriptPath),
      windowsHide: true,
      env: { ...process.env, ...envExtra },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(logPrefix ? `[${logPrefix}] ${s}` : s);
    });

    proc.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(logPrefix ? `[${logPrefix}] ${s}` : s);
    });

    proc.on("error", (err) => {
      const ms = Date.now() - t0;
      reject(
        new Error(
          `Robot spawn error: ${
            err?.message ?? err
          }\n(ms=${ms})\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`
        )
      );
    });

    proc.on("close", (code) => {
      const ms = Date.now() - t0;

      if (code === 0) {
        resolve({ stdout, stderr, ms });
      } else {
        reject(
          new Error(
            `Robot failed: ${scriptPath} (exit code ${code})\n(ms=${ms})\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`
          )
        );
      }
    });
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const startVa = clampInt(body?.start_va, 775, 1, 99999);
    const endVa = clampInt(body?.end_va, startVa, 1, 99999);

    const workersPerProcess = 10;
    const requestedProcesses = 2;
    const staggerMs = clampInt(body?.stagger_ms ?? 2500, 2500, 0, 10000);
    const tabAttempts = clampInt(body?.tab_attempts ?? 3, 3, 1, 30);
    const softWaitMs = clampInt(body?.soft_wait_ms ?? 1500, 1500, 200, 5000);
    const betweenAttemptsMs = clampInt(
      body?.between_attempts_ms ?? 700,
      700,
      0,
      5000
    );
    const totalTimeoutMs = clampInt(
      body?.total_timeout_ms ?? 150000,
      150000,
      5000,
      300000
    );

    if (endVa < startVa) {
      return NextResponse.json(
        { error: "Eind VA mag niet lager zijn dan Start VA." },
        { status: 400 }
      );
    }

    const { role } = await requireUserWithRole(req);

    if (!isRoleAllowedForRoute(role)) {
      return NextResponse.json(
        { error: "Geen toegang tot FightPaspoort AutoCheck." },
        { status: 403 }
      );
    }

    // Een handmatige range mag naast een gepauzeerde geplande full-run starten.
    // Alleen een daadwerkelijk draaiende Total-run blokkeert een nieuwe start.
    const { data: runningRun, error: runningRunError } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .select("id,status,run_type,start_va,end_va,meta")
      .in("run_type", ["full", "range"])
      .eq("status", "running")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (runningRunError) throw runningRunError;
    if (runningRun) {
      return NextResponse.json(
        {
          error: "Er draait al een Total AutoCheck-run. Stop die eerst voordat je een nieuwe start.",
          run_id: runningRun.id,
        },
        { status: 409 }
      );
    }

    const totalRobotPath = resolveScriptPath(
      "scrapers",
      "fp_total",
      TOTAL_ROBOT_FILE
    );

    console.log("[fightpassport-sync/start] ▶ totaal robot start", {
      start_va: startVa,
      end_va: endVa,
      workers_per_process: workersPerProcess,
      processes: requestedProcesses,
      robot: TOTAL_ROBOT_FILE,
      role,
      totalRobotPath,
    });

    const batchId = crypto.randomUUID();

    // Verdeel het bereik zonder overlap over maximaal 2 processen.
    // Bij een bereik van 1 VA starten we vanzelf maar 1 proces.
    const totalVaCount = endVa - startVa + 1;
    const processCount = Math.min(requestedProcesses, totalVaCount);
    const baseSize = Math.floor(totalVaCount / processCount);
    const remainder = totalVaCount % processCount;

    let nextStartVa = startVa;
    const parts = Array.from({ length: processCount }, (_, index) => {
      const size = baseSize + (index < remainder ? 1 : 0);
      const part = {
        part: index + 1,
        startVa: nextStartVa,
        endVa: nextStartVa + size - 1,
      };
      nextStartVa = part.endVa + 1;
      return part;
    });

    for (const part of parts) {
      void runNodeScript(
        totalRobotPath,
        [String(part.startVa), String(part.endVa)],
        {
          FP_MATCHMAKER_ID: "",
          FP_SESSION_MODE: "master",
          HEADLESS: process.env.HEADLESS ?? "false",
          PUPPETEER_HEADLESS:
            process.env.PUPPETEER_HEADLESS ??
            process.env.HEADLESS ??
            "false",
          WORKERS: String(workersPerProcess),
          FP_TOTAL_WORKERS: String(workersPerProcess),
          FP_TOTAL_RUN_KIND: "range",
          FP_TOTAL_BATCH_ID: batchId,
          FP_TOTAL_BATCH_PART: String(part.part),
          FP_TOTAL_BATCH_PARTS: String(parts.length),
          FP_TOTAL_BATCH_START_VA: String(startVa),
          FP_TOTAL_BATCH_END_VA: String(endVa),
          STAGGER_MS: String(staggerMs),
          TAB_ATTEMPTS: String(tabAttempts),
          SOFT_WAIT_MS: String(softWaitMs),
          BETWEEN_ATTEMPTS_MS: String(betweenAttemptsMs),
          FP_TOTAL_TIMEOUT_MS: String(totalTimeoutMs),
          FP_TOTAL_RESULTS: "true",
          FIGHTSUPPORT_INTERNAL_URL:
          process.env.FIGHTSUPPORT_INTERNAL_URL ||
          process.env.INTERNAL_APP_URL ||
          new URL(req.url).origin,
          TERMINATOR_INTERNAL_TOKEN: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        },
        `fp_total_admin_${part.part}`
      )
        .then((result) => {
          console.log("[fightpassport-sync/start] ✅ deelrobot klaar", {
            batch_id: batchId,
            part: part.part,
            ms: result.ms,
            start_va: part.startVa,
            end_va: part.endVa,
            workers: workersPerProcess,
          });
        })
        .catch((err) => {
          console.error(
            `[fightpassport-sync/start] ❌ deelrobot ${part.part} achtergrondfout:`,
            err
          );
        });
    }

    return NextResponse.json(
      {
        ok: true,
        started: true,
        start_va: startVa,
        end_va: endVa,
        batch_id: batchId,
        processes: parts.length,
        workers_per_process: workersPerProcess,
        parts: parts.map((part) => ({ part: part.part, start_va: part.startVa, end_va: part.endVa })),
        message: `Total AutoCheck gestart als ${parts.length} ${parts.length === 1 ? "proces" : "processen"} × ${workersPerProcess} workers voor VA ${startVa} t/m ${endVa}.`,
      },
      { status: 202 }
    );
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error(
      "[fightpassport-sync/start] ❌ totaal robot mislukt:",
      err
    );

    return NextResponse.json(
      {
        error: err?.message ?? "Onbekende fout bij starten van de AutoCheck.",
      },
      { status: 500 }
    );
  }
}
