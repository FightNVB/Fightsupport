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
    const preparePath = resolveScriptPath("scrapers", "sportscholen", "scraper_sportscholen_prepare.js");
    console.log("🏫 Alleen centrale SPORTSCHOLEN-Excel downloaden en verwerken");
    const result = await runNodeScript(preparePath, ["run"], {}, "sportscholen-prepare");
    return NextResponse.json({ok:true,mode:"sportscholen-excel-only",ms:result.ms});
  } catch (err: any) {
    console.error("❌ sportscholen API fout:", err);
    return NextResponse.json({ok:false,error:err?.message ?? "Onbekende fout"},{status:500});
  }
}
