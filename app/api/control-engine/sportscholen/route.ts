// app/api/control-engine/sportscholen/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

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
  throw new Error(`scraper niet gevonden:\n- ${candidates.join("\n- ")}`);
}

function runNodeScript(
  scriptPath: string,
  args: string[],
  envExtra: Record<string, string> = {},
  logPrefix = "sportscholen"
): Promise<{ stdout: string; stderr: string; ms: number }> {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    const proc = spawn(process.execPath, [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      cwd: path.dirname(scriptPath),
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
        ...envExtra,
      },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(`[${logPrefix}] ${s}`);
    });

    proc.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(`[${logPrefix}:err] ${s}`);
    });

    proc.on("error", (err) => {
      reject(new Error(`${logPrefix} spawn error: ${err?.message ?? err}`));
    });

    proc.on("close", (code) => {
      const ms = Date.now() - started;
      if (code === 0) resolve({ stdout, stderr, ms });
      else reject(new Error(
        `${logPrefix} exit code ${code}\n(ms=${ms})\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`
      ));
    });
  });
}

async function loadAllSportschoolKeys(): Promise<string[]> {
  const all: string[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("sportscholen")
      .select("sportschool_id")
      .not("sportschool_id", "is", null)
      .order("sportschool_id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const batch = data ?? [];
    for (const row of batch) {
      const key = String((row as any)?.sportschool_id ?? "")
        .replace(/\D/g, "")
        .replace(/^0+/, "");
      if (key) all.push(key);
    }

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return [...new Set(all)];
}

function splitRoundRobin<T>(items: T[], parts: number): T[][] {
  const out = Array.from({ length: parts }, () => [] as T[]);
  items.forEach((item, index) => out[index % parts].push(item));
  return out;
}

export async function POST() {
  try {
    const preparePath = resolveScriptPath(
      "scrapers", "sportscholen", "scraper_sportscholen_prepare.js"
      );
    const workerPath = resolveScriptPath(
      "scrapers", "sportscholen", "scraper_sportscholen.js"
      );

    console.log("🏫 fase 1/2: volledige sportscholenlijst downloaden");
    await runNodeScript(preparePath, ["run"], {}, "sportscholen-prepare");

    const keys = await loadAllSportschoolKeys();
    if (!keys.length) throw new Error("Geen sportschool-keys gevonden.");

    const chunks = splitRoundRobin(keys, 3).filter((chunk) => chunk.length > 0);

    console.log("🏫 fase 2/2: 3x10 DETAILS + VECHTERS", {
      sportscholen: keys.length,
      processen: chunks.length,
      workers_per_proces: 10,
    });

    const results = await Promise.all(
        chunks.map((chunk, index) =>
          runNodeScript(
            workerPath,
            ["run-all"],
            {
              FP_SPORTSCHOLEN_KEYS: chunk.join(","),
              FP_SPORTSCHOLEN_WORKERS: "10",
              WORKERS: "10",
              STAGGER_MS:
                process.env.FP_SPORTSCHOLEN_STAGGER_MS ??
                process.env.STAGGER_MS ??
                "2500",
              TAB_ATTEMPTS: process.env.TAB_ATTEMPTS ?? "3",
              SOFT_WAIT_MS: process.env.SOFT_WAIT_MS ?? "1500",
              BETWEEN_ATTEMPTS_MS:
                process.env.BETWEEN_ATTEMPTS_MS ?? "700",
              FP_SPORTSCHOLEN_WORKER_DRIFT_MAX_MS:
                process.env.FP_SPORTSCHOLEN_WORKER_DRIFT_MAX_MS ?? "250",
              FP_SPORTSCHOLEN_LOGIN_RETRIES:
                process.env.FP_SPORTSCHOLEN_LOGIN_RETRIES ?? "1",
              FP_SPORTSCHOLEN_TRANSIENT_RETRIES:
                process.env.FP_SPORTSCHOLEN_TRANSIENT_RETRIES ?? "1",
              FP_SPORTSCHOLEN_DOWNLOAD_START_TIMEOUT_MS:
                process.env.FP_SPORTSCHOLEN_DOWNLOAD_START_TIMEOUT_MS ?? "6000",
            },
            `sportscholen-${index + 1}/${chunks.length}`
          )
        )
      );

    return NextResponse.json({
      ok: true,
      sportscholen: keys.length,
      processen: chunks.length,
      workers_per_proces: 10,
      ms: results.reduce((max, r) => Math.max(max, r.ms), 0),
    });
  } catch (err: any) {
    console.error("❌ sportscholen API fout:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}
