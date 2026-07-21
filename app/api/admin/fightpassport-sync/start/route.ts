// app/api/admin/fightpassport-sync/start/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import {
  requireUserWithRole,
} from "@/app/api/_utils/authz";

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

    const workers = clampInt(body?.workers ?? 8, 8, 1, 10);
    const staggerMs = clampInt(body?.stagger_ms ?? 700, 700, 0, 5000);
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

    const totalRobotPath = resolveScriptPath(
      "scrapers",
      "fp_total",
      TOTAL_ROBOT_FILE
    );

    console.log("[fightpassport-sync/start] ▶ totaal robot start", {
      start_va: startVa,
      end_va: endVa,
      workers,
      robot: TOTAL_ROBOT_FILE,
      role,
      totalRobotPath,
    });

    /*
      Zelfde startmethode als app/api/control-engine/admin/start:
      - spawn("node", ...)
      - cwd = map van het script
      - stdout/stderr via pipe
      - master FightPassport sessie
      - dezelfde headless/worker env-opzet

      Bewust AWAITEN we de robot hier, net zoals de admin-control route.
      Zo komt een echte Puppeteer- of Node-fout terug als HTTP 500
      en verdwijnt die niet in een los detached proces.
    */
    const totalResult = await runNodeScript(
      totalRobotPath,
      [String(startVa), String(endVa)],
      {
        FP_MATCHMAKER_ID: "",
        FP_SESSION_MODE: "master",

        HEADLESS: process.env.HEADLESS ?? "false",
        PUPPETEER_HEADLESS:
          process.env.PUPPETEER_HEADLESS ??
          process.env.HEADLESS ??
          "false",

        WORKERS: String(workers),
        FP_TOTAL_WORKERS: String(workers),
        STAGGER_MS: String(staggerMs),
        TAB_ATTEMPTS: String(tabAttempts),
        SOFT_WAIT_MS: String(softWaitMs),
        BETWEEN_ATTEMPTS_MS: String(betweenAttemptsMs),
        FP_TOTAL_TIMEOUT_MS: String(totalTimeoutMs),
        FP_TOTAL_RESULTS: "true",
      },
      "fp_total_admin"
    );

    console.log("[fightpassport-sync/start] ✅ totaal robot klaar", {
      ms: totalResult.ms,
      start_va: startVa,
      end_va: endVa,
      workers,
    });

    return NextResponse.json({
      ok: true,
      start_va: startVa,
      end_va: endVa,
      workers,
      ms: totalResult.ms,
    });
  } catch (err: any) {
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
