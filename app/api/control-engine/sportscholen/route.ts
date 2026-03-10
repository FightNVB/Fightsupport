// app/api/control-engine/sportscholen/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { requireAnyRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

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

function runScraper(scriptPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [scriptPath, "run"], {
      stdio: "inherit",
      shell: false,
      cwd: path.dirname(scriptPath),
      env: {
        ...process.env,
        SystemRoot: process.env.SystemRoot ?? "C:\\Windows",
        ComSpec: process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
      },
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Sportscholen scraper exit code ${code}`));
    });
  });
}

export async function POST() {
  try {
    console.log("🏫 API sportscholen: start scraper");

    const scriptPath = resolveScriptPath("scrapers", "sportscholen", "scraper_sportscholen.js");
    await runScraper(scriptPath);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("❌ sportscholen API fout:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
