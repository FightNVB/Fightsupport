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

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`Robot niet gevonden:\n- ${candidates.join("\n- ")}`);
}

function isRoleAllowed(role: string | null | undefined) {
  return role === "admin" || role === "superadmin";
}

function runNodeScript(
  scriptPath: string,
  args: string[],
  envExtra?: Record<string, string>,
  logPrefix?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      cwd: path.dirname(scriptPath),
      windowsHide: true,
      env: { ...process.env, ...envExtra },
    });

    proc.stdout.on("data", (data) => {
      const text = data.toString();
      process.stdout.write(logPrefix ? `[${logPrefix}] ${text}` : text);
    });

    proc.stderr.on("data", (data) => {
      const text = data.toString();
      process.stderr.write(logPrefix ? `[${logPrefix}] ${text}` : text);
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Sportscholen-herkansing stopte met exit code ${code}`));
    });
  });
}

export async function POST(req: Request) {
  try {
    const { role } = await requireUserWithRole(req);

    if (!isRoleAllowed(role)) {
      return NextResponse.json({ error: "Geen toegang." }, { status: 403 });
    }

    const { data: activeRun, error: activeRunError } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .select("id")
      .eq("run_type", "team")
      .eq("status", "running")
      .limit(1)
      .maybeSingle();

    if (activeRunError) throw activeRunError;
    if (activeRun) {
      return NextResponse.json(
        { error: "Er draait al een sportscholensynchronisatie." },
        { status: 409 },
      );
    }

    const { count, error: countError } = await supabaseAdmin
      .from("sportscholen")
      .select("sportschool_id", { count: "exact", head: true })
      .in("team_sync_status", ["fout", "mislukt"]);

    if (countError) throw countError;

    const failedCount = Number(count ?? 0);
    if (failedCount === 0) {
      return NextResponse.json({
        ok: true,
        started: false,
        failed_count: 0,
        message: "Er zijn geen mislukte sportscholen om opnieuw te verwerken.",
      });
    }

    const teamRobotPath = resolveScriptPath("scrapers", "fp_total", TEAM_ROBOT_FILE);

    void runNodeScript(
      teamRobotPath,
      ["run-errors"],
      {
        FP_SESSION_MODE: "master",
        HEADLESS: process.env.HEADLESS ?? "false",
        PUPPETEER_HEADLESS:
          process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "false",
        TEAM_SCHOOL_TABS: "8",
        TEAM_SCHOOL_STAGGER_MS: process.env.TEAM_SCHOOL_STAGGER_MS ?? "800",
      },
      "fp_team_retry",
    ).catch((err) => {
      console.error("[retry-team-errors] achtergrondfout:", err);
    });

    return NextResponse.json(
      {
        ok: true,
        started: true,
        failed_count: failedCount,
        message: `Herkansing gestart voor ${failedCount} mislukte sportscholen.`,
      },
      { status: 202 },
    );
  } catch (err: any) {
    console.error("[retry-team-errors] starten mislukt:", err);
    return NextResponse.json(
      { error: err?.message ?? "Herkansing starten mislukt." },
      { status: 500 },
    );
  }
}
