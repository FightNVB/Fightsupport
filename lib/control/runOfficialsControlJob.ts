import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { buildControleBoutContext } from "@/lib/control/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/control/enrichControleBoutContext";
import { rulesEngine } from "@/lib/rulesEngine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const DEBUG = process.env.CONTROL_ENGINE_DEBUG === "1";

function dlog(...args: any[]) {
  if (DEBUG) console.log(...args);
}

function toVaStrict(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  const digits = s.replace(/[^0-9]/g, "");
  return /^\d{3,5}$/.test(digits) ? digits : null;
}

function pickVA(b: any, side: "rood" | "blauw"): string | null {
  if (side === "rood") {
    return toVaStrict(b.rood_va) ?? toVaStrict(b.va_rood) ?? toVaStrict(b.rood_va_mm) ?? null;
  }
  return toVaStrict(b.blauw_va) ?? toVaStrict(b.va_blauw) ?? toVaStrict(b.blauw_va_mm) ?? null;
}

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
  throw new Error(`Script niet gevonden:\n- ${candidates.join("\n- ")}`);
}

function clampInt(n: any, def: number, min: number, max: number): number {
  const num = Number(n);
  if (!Number.isFinite(num)) return def;
  const v = Math.floor(num);
  return Math.max(min, Math.min(max, v));
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
          `Script spawn error: ${err?.message ?? err}\n(ms=${ms})\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`
        )
      );
    });

    proc.on("close", (code) => {
      const ms = Date.now() - t0;
      if (code === 0) resolve({ stdout, stderr, ms });
      else {
        reject(
          new Error(
            `Script failed: ${scriptPath} (exit code ${code})\n(ms=${ms})\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`
          )
        );
      }
    });
  });
}

export async function runOfficialsControlJob(params: {
  queueJobId: string;
  matchmaking_id: string;
  payload?: Record<string, any>;
}) {
  const { queueJobId, matchmaking_id, payload = {} } = params;

  let controle_run_id: string | null = null;

  try {
    const do_scrape = payload?.do_scrape !== false;

    const workers = clampInt(payload?.workers ?? 8, 8, 1, 20);
    const stagger_ms = clampInt(payload?.stagger_ms ?? 250, 250, 0, 5000);
    const tab_attempts = clampInt(payload?.tab_attempts ?? 8, 8, 1, 30);
    const soft_wait_ms = clampInt(payload?.soft_wait_ms ?? 900, 900, 200, 5000);
    const between_attempts_ms = clampInt(payload?.between_attempts_ms ?? 450, 450, 0, 5000);

    const fullfighter_timeout_ms = clampInt(payload?.fullfighter_timeout_ms ?? 35000, 35000, 5000, 180000);
    const uitslagen_timeout_ms = clampInt(payload?.uitslagen_timeout_ms ?? 90000, 90000, 5000, 240000);
    const uitslagen_tries = clampInt(payload?.uitslagen_tries ?? 1, 1, 1, 5);

    const { data: runRows, error: runErr } = await supabase
      .from("controle_runs")
      .insert({
        matchmaking_id,
        status: "running",
        gestart_op: new Date().toISOString(),
        run_type: "control-engine",
      })
      .select("id")
      .limit(1);

    if (runErr) throw runErr;

    controle_run_id = runRows?.[0]?.id ?? null;
    if (!controle_run_id) throw new Error("controle_run insert gaf geen id terug");

    await supabase
      .from("official_control_queue")
      .update({ controle_run_id })
      .eq("id", queueJobId);

    const { data: bouts, error: boutsErr } = await supabase
      .from("matchmaking_bouts_raw")
      .select("*")
      .eq("matchmaking_id", matchmaking_id);

    if (boutsErr) throw boutsErr;

    const vaSet = new Set<string>();
    (bouts ?? []).forEach((b: any) => {
      const r = pickVA(b, "rood");
      const bl = pickVA(b, "blauw");
      if (r) vaSet.add(r);
      if (bl) vaSet.add(bl);
    });
    const va_nummers = [...vaSet].filter(Boolean);

    console.log("[officials/queue] run", {
      queueJobId,
      matchmaking_id,
      controle_run_id,
      do_scrape,
      bouts: (bouts ?? []).length,
      va_count: va_nummers.length,
      workers,
      stagger_ms,
      tab_attempts,
      soft_wait_ms,
      between_attempts_ms,
      fullfighter_timeout_ms,
      uitslagen_timeout_ms,
      uitslagen_tries,
    });

    dlog("[officials/queue] va_sample", va_nummers.slice(0, 12));

    const fpBundlePath = resolveScriptPath(
      "scrapers",
      "fp_bundle_officials",
      "scraper_fp_officials.js"
    );

    if (do_scrape && va_nummers.length > 0) {
      console.log("[officials/queue] ▶ fp_bundle start", { va_count: va_nummers.length });

      try {
        const res = await runNodeScript(
          fpBundlePath,
          [matchmaking_id, controle_run_id, ...va_nummers],
          {
            WORKERS: String(workers),
            STAGGER_MS: String(stagger_ms),
            TAB_ATTEMPTS: String(tab_attempts),
            SOFT_WAIT_MS: String(soft_wait_ms),
            BETWEEN_ATTEMPTS_MS: String(between_attempts_ms),
            FULLFIGHTER_TIMEOUT_MS: String(fullfighter_timeout_ms),
            UITSLAGEN_TIMEOUT_MS: String(uitslagen_timeout_ms),
            UITSLAGEN_TRIES: String(uitslagen_tries),
          },
          "fp_bundle_officials"
        );

        console.log("[officials/queue] ✅ fp_bundle klaar", { ms: res.ms, va_count: va_nummers.length });
      } catch (e: any) {
        console.log("[officials/queue] ❌ fp_bundle failed (continuing)", {
          error: e?.message ?? String(e),
        });
      }
    } else {
      console.log("[officials/queue] scrape skipped", { do_scrape, va_count: va_nummers.length });
    }

    console.log("[officials/queue] ▶ buildControleBoutContext...");
    await buildControleBoutContext(matchmaking_id, controle_run_id);
    console.log("[officials/queue] ✅ buildControleBoutContext klaar");

    console.log("[officials/queue] ▶ enrichControleBoutContext...");
    await enrichControleBoutContext(matchmaking_id, controle_run_id);
    console.log("[officials/queue] ✅ enrichControleBoutContext klaar");

    console.log("[officials/queue] ▶ load ctxRows for rulesEngine...");
    const { data: ctxRows, error: ctxErr } = await supabase
      .from("controle_bout_context")
      .select("*")
      .eq("controle_run_id", controle_run_id);

    if (ctxErr) throw ctxErr;

    console.log("[officials/queue] ✅ ctxRows loaded", { rows: ctxRows?.length ?? 0 });

    console.log("[officials/queue] ▶ rulesEngine...");
    const hits = await rulesEngine({
      matchmaking_id,
      controle_run_id,
      ctxRows: (ctxRows ?? []) as any[],
    });

    console.log("[officials/queue] ✅ rulesEngine klaar", {
      hits: Array.isArray(hits) ? hits.length : 0,
    });

    if (DEBUG && Array.isArray(hits) && hits[0]) {
      console.log("[officials/queue] hit_sample", hits[0]);
    }

    if (DEBUG) {
      try {
        const { count } = await supabase
          .from("controle_resultaten")
          .select("id", { count: "exact", head: true })
          .eq("controle_run_id", controle_run_id);
        console.log("[officials/queue] controle_resultaten count", { count: count ?? null });
      } catch {}
    }

    await supabase
      .from("controle_runs")
      .update({
        status: "klaar",
        afgerond_op: new Date().toISOString(),
      })
      .eq("id", controle_run_id);

    await supabase
      .from("official_control_queue")
      .update({
        status: "done",
        finished_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", queueJobId);

    return {
      ok: true,
      queueJobId,
      matchmaking_id,
      controle_run_id,
      do_scrape,
      va_count: va_nummers.length,
      workers,
      stagger_ms,
      tab_attempts,
      soft_wait_ms,
      between_attempts_ms,
      fullfighter_timeout_ms,
      uitslagen_timeout_ms,
      uitslagen_tries,
    };
  } catch (err: any) {
    console.error("❌ Officials queue fout:", err);

    if (controle_run_id) {
      await supabase
        .from("controle_runs")
        .update({
          status: "failed",
          foutmelding: err?.message ?? "Onbekende fout",
          afgerond_op: new Date().toISOString(),
        })
        .eq("id", controle_run_id);
    }

    await supabase
      .from("official_control_queue")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: err?.message ?? "Onbekende fout",
      })
      .eq("id", queueJobId);

    throw err;
  }
}