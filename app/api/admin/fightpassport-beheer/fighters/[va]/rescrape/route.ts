import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { requireUserWithRole } from "@/app/api/_utils/authz";

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

function isRoleAllowed(role: string | null | undefined) {
  return role === "admin" || role === "superadmin";
}

function normalizeVa(raw: unknown) {
  const value = String(raw ?? "").trim().replace(/\D/g, "");
  if (!/^\d{3,6}$/.test(value)) return null;
  return value;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ va: string }> },
) {
  try {
    const { role } = await requireUserWithRole(req);
    if (!isRoleAllowed(role)) {
      return NextResponse.json({ error: "Geen toegang." }, { status: 403 });
    }

    const { va: rawVa } = await context.params;
    const va = normalizeVa(rawVa);
    if (!va) {
      return NextResponse.json({ error: "Ongeldig VA-nummer." }, { status: 400 });
    }

    const robotPath = resolveScriptPath(
      "scrapers",
      "fp_total",
      TOTAL_ROBOT_FILE,
    );

    const proc = spawn(process.execPath, [robotPath, va, va], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      cwd: path.dirname(robotPath),
      windowsHide: true,
      env: {
        ...process.env,

        // Deze route herscrapet exact één vechter.
        FP_TOTAL_VA_LIST: va,
        FP_TOTAL_RUN_KIND: "retry",
        FP_TOTAL_START_VA: va,
        FP_TOTAL_END_VA: va,
        FP_TOTAL_BATCH_START_VA: va,
        FP_TOTAL_BATCH_END_VA: va,

        FP_MATCHMAKER_ID: "",
        FP_SESSION_MODE: "master",
        HEADLESS: process.env.HEADLESS ?? "false",
        PUPPETEER_HEADLESS:
          process.env.PUPPETEER_HEADLESS ??
          process.env.HEADLESS ??
          "false",

        WORKERS: "1",
        FP_TOTAL_WORKERS: "1",
        STAGGER_MS: "0",
        TAB_ATTEMPTS: process.env.TAB_ATTEMPTS ?? "5",
        SOFT_WAIT_MS: process.env.SOFT_WAIT_MS ?? "2500",
        BETWEEN_ATTEMPTS_MS: process.env.BETWEEN_ATTEMPTS_MS ?? "1200",
        FP_TOTAL_TIMEOUT_MS: process.env.FP_TOTAL_TIMEOUT_MS ?? "480000",
        FP_TOTAL_RESULTS: "true",
      },
    });

    proc.stdout.on("data", (data) => {
      process.stdout.write(`[fighter-rescrape VA ${va}] ${data.toString()}`);
    });

    proc.stderr.on("data", (data) => {
      process.stderr.write(`[fighter-rescrape VA ${va}] ${data.toString()}`);
    });

    proc.on("error", (error) => {
      console.error(`[fighter-rescrape VA ${va}] spawn fout:`, error);
    });

    proc.on("close", (code) => {
      console.log(`[fighter-rescrape VA ${va}] klaar met exit code ${code}`);
    });

    return NextResponse.json(
      {
        ok: true,
        started: true,
        va_nummer: va,
        message: `Herscrape voor VA ${va} gestart. Ververs het dossier zodra de run klaar is.`,
      },
      { status: 202 },
    );
  } catch (err: any) {
    console.error("[fighter-rescrape] starten mislukt:", err);
    return NextResponse.json(
      { error: err?.message ?? "Herscrape starten mislukt." },
      { status: 500 },
    );
  }
}
