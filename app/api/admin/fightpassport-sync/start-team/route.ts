// app/api/admin/fightpassport-sync/start-team/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { requireUserWithRole } from "@/app/api/_utils/authz";
import { supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const TEAM_ROBOT_FILE = "scraper_team.js";

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
      reject(
        new Error(
          `Robot spawn error: ${err?.message ?? err}\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`
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
    const { role } = await requireUserWithRole(req);

    if (!isRoleAllowedForRoute(role)) {
      return NextResponse.json(
        { error: "Geen toegang tot FightPaspoort sportschoolsynchronisatie." },
        { status: 403 }
      );
    }

    const { data: activeTeamRun, error: activeRunError } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .select("id,status,started_at")
      .eq("run_type", "team")
      .in("status", ["running"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeRunError) throw activeRunError;

    if (activeTeamRun) {
      return NextResponse.json(
        {
          ok: true,
          started: false,
          already_running: true,
          message: "Er draait al een sportscholensynchronisatie.",
        },
        { status: 200 }
      );
    }

    const teamRobotPath = resolveScriptPath(
      "scrapers",
      "fp_total",
      TEAM_ROBOT_FILE
    );

    console.log("[fightpassport-sync/start-team] ▶ sportscholen robot start", {
      robot: TEAM_ROBOT_FILE,
      teamRobotPath,
      role,
      school_tabs: 8,
    });

    // Start de scraper op de achtergrond en geef direct antwoord aan de browser.
    // Zo kan een lange sportscholensynchronisatie niet meer als HTTP-timeout
    // of "starten mislukt" in de UI eindigen terwijl de scraper gewoon draait.
    void runNodeScript(
      teamRobotPath,
      ["run-all"],
      {
        FP_SESSION_MODE: "master",

        HEADLESS: process.env.HEADLESS ?? "false",
        PUPPETEER_HEADLESS:
          process.env.PUPPETEER_HEADLESS ??
          process.env.HEADLESS ??
          "false",

        TEAM_SCHOOL_TABS: "8",
        TEAM_SCHOOL_STAGGER_MS:
          process.env.TEAM_SCHOOL_STAGGER_MS ?? "800",
      },
      "fp_team_all"
    )
      .then((result) => {
        console.log("[fightpassport-sync/start-team] ✅ sportscholen robot klaar", {
          ms: result.ms,
          school_tabs: 8,
        });
      })
      .catch(async (err) => {
        console.error(
          "[fightpassport-sync/start-team] ❌ sportscholen robot achtergrondfout:",
          err
        );

        const { data: runningRun } = await supabaseAdmin
          .from("fightpassport_sync_runs")
          .select("id")
          .eq("run_type", "team")
          .eq("status", "running")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (runningRun?.id) {
          await supabaseAdmin
            .from("fightpassport_sync_runs")
            .update({
              status: "failed",
              finished_at: new Date().toISOString(),
              error_message: err?.message ?? String(err),
            })
            .eq("id", runningRun.id);
        }
      });

    return NextResponse.json(
      {
        ok: true,
        started: true,
        tabs: 8,
        message: "Sportscholensynchronisatie gestart met 1 browser en 8 tabs.",
      },
      { status: 202 }
    );
  } catch (err: any) {
    console.error(
      "[fightpassport-sync/start-team] ❌ sportscholen robot mislukt:",
      err
    );

    return NextResponse.json(
      {
        error:
          err?.message ??
          "Onbekende fout bij starten van de sportschoolsynchronisatie.",
      },
      { status: 500 }
    );
  }
}
