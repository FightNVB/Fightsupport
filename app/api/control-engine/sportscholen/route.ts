// app/api/control-engine/sportscholen/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

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

function resolveScraperLockPath() {
  const root = process.cwd();
  const candidates = [
    path.join(root, "ControlEngine", "scrapers"),
    path.join(root, "ControlEngine", "ControlEngine", "scrapers"),
    path.join(root, "scrapers"),
  ];

  const dir = candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, ".fightpassport-scraper.lock");
}

async function withScraperLock<T>(fn: () => Promise<T>): Promise<T> {
  const lockPath = resolveScraperLockPath();
  const started = Date.now();
  let lastLog = 0;

  while (true) {
    try {
      const fd = fs.openSync(lockPath, "wx");
      fs.writeFileSync(
        fd,
        JSON.stringify(
          {
            pid: process.pid,
            started_at: new Date().toISOString(),
            route: "sportscholen",
          },
          null,
          2
        )
      );
      fs.closeSync(fd);
      console.log("🏫 sportscholen: scraper-lock verkregen", { lockPath });
      break;
    } catch {
      try {
        const stat = fs.statSync(lockPath);
        const ageMs = Date.now() - stat.mtimeMs;

        if (ageMs > 1000 * 60 * 90) {
          console.warn("🏫 sportscholen: oude scraper-lock verwijderd", {
            lockPath,
            age_min: Math.round(ageMs / 60000),
          });
          fs.unlinkSync(lockPath);
          continue;
        }

        if (Date.now() - lastLog > 10000) {
          lastLog = Date.now();
          console.log("🏫 sportscholen: wacht op scraper-lock", {
            lockPath,
            age_sec: Math.round(ageMs / 1000),
          });
        }
      } catch {}

      if (Date.now() - started > 1000 * 60 * 120) {
        throw new Error(
          "FightPassport scraper-lock timeout. Er draait mogelijk nog een andere scraper. Verwijder eventueel .fightpassport-scraper.lock als er echt niets draait."
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  try {
    return await fn();
  } finally {
    try {
      fs.unlinkSync(lockPath);
      console.log("🏫 sportscholen: scraper-lock vrijgegeven", { lockPath });
    } catch {}
  }
}

function runScraper(scriptPath: string): Promise<{ stdout: string; stderr: string; ms: number }> {
  return withScraperLock(
    () =>
      new Promise((resolve, reject) => {
        const t0 = Date.now();
        const cwd = path.dirname(scriptPath);

        console.log("🏫 sportscholen: spawn scraper", {
          node: process.execPath,
          scriptPath,
          cwd,
          args: ["run"],
          master_login: true,
        });

        const proc = spawn(process.execPath, [scriptPath, "run"], {
          stdio: ["ignore", "pipe", "pipe"],
          shell: false,
          cwd,
          windowsHide: true,
          env: {
            ...process.env,

            // BELANGRIJK: sportscholen hoort ALTIJD master-login te gebruiken.
            // Dus nooit per ongeluk een matchmaker-profiel/cookies doorgeven.
            FP_MATCHMAKER_ID: "",
            FP_SESSION_MODE: "master",

            // Zelfde headless-regels als admin/officials.
            HEADLESS: process.env.HEADLESS ?? "false",
            PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "false",

            SystemRoot: process.env.SystemRoot ?? "C:\\Windows",
            ComSpec: process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
          },
        });

        console.log("🏫 sportscholen: child process gestart", { pid: proc.pid });

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (d) => {
          const s = d.toString();
          stdout += s;
          process.stdout.write(`[sportscholen-scraper] ${s}`);
        });

        proc.stderr.on("data", (d) => {
          const s = d.toString();
          stderr += s;
          process.stderr.write(`[sportscholen-scraper:err] ${s}`);
        });

        proc.on("error", (err) => {
          const ms = Date.now() - t0;
          reject(
            new Error(
              `Sportscholen scraper spawn error: ${err?.message ?? err}\n(ms=${ms})\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`
            )
          );
        });

        proc.on("close", (code) => {
          const ms = Date.now() - t0;
          console.log("🏫 sportscholen: child process gesloten", { code, ms });

          if (code === 0) {
            resolve({ stdout, stderr, ms });
            return;
          }

          reject(
            new Error(
              `Sportscholen scraper exit code ${code}\n(ms=${ms})\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`
            )
          );
        });
      })
  );
}

export async function POST() {
  try {
    console.log("🏫 API sportscholen: start scraper");

    const scriptPath = resolveScriptPath(
      "scrapers",
      "sportscholen",
      "scraper_sportscholen.js"
    );

    console.log("🏫 API sportscholen: script gevonden", { scriptPath });

    const result = await runScraper(scriptPath);

    console.log("🏫 API sportscholen: scraper klaar", {
      ms: result.ms,
      stdout_len: result.stdout.length,
      stderr_len: result.stderr.length,
    });

    return NextResponse.json({ ok: true, ms: result.ms });
  } catch (err: any) {
    console.error("❌ sportscholen API fout:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}
