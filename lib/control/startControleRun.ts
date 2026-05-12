// lib/control/startControleRun.ts
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

export const supabaseControl = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const DEBUG = process.env.CONTROL_ENGINE_DEBUG === "1";

export type StartControleRunArgs = {
  matchmaking_id: string;
  gestart_door_user_id?: string | null;
  gestart_door_rol?: string | null;
  run_type?: string | null;
};

export type StartControleRunResult = {
  id: string;
  matchmaking_id: string;
  status: string | null;
};

export type ScrapeSettings = {
  workers: number;
  stagger_ms: number;
  tab_attempts: number;
  soft_wait_ms: number;
  between_attempts_ms: number;
  fullfighter_timeout_ms: number;
  uitslagen_timeout_ms: number;
  uitslagen_tries: number;
};

export function dlog(...args: any[]) {
  if (DEBUG) console.log(...args);
}

export function clampInt(
  n: any,
  def: number,
  min: number,
  max: number
): number {
  const num = Number(n);
  if (!Number.isFinite(num)) return def;
  const v = Math.floor(num);
  return Math.max(min, Math.min(max, v));
}

export function getScrapeSettings(body: any): ScrapeSettings {
  return {
    workers: clampInt(body?.workers ?? 8, 8, 1, 20),
    stagger_ms: clampInt(body?.stagger_ms ?? 250, 250, 0, 5000),
    tab_attempts: clampInt(body?.tab_attempts ?? 8, 8, 1, 30),
    soft_wait_ms: clampInt(body?.soft_wait_ms ?? 900, 900, 200, 5000),
    between_attempts_ms: clampInt(
      body?.between_attempts_ms ?? 450,
      450,
      0,
      5000
    ),
    fullfighter_timeout_ms: clampInt(
      body?.fullfighter_timeout_ms ?? 35000,
      35000,
      5000,
      180000
    ),
    uitslagen_timeout_ms: clampInt(
      body?.uitslagen_timeout_ms ?? 90000,
      90000,
      5000,
      240000
    ),
    uitslagen_tries: clampInt(body?.uitslagen_tries ?? 1, 1, 1, 5),
  };
}

export function toVaStrict(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  const digits = s.replace(/[^0-9]/g, "");
  return /^\d{3,5}$/.test(digits) ? digits : null;
}

export function pickVA(b: any, side: "rood" | "blauw"): string | null {
  if (side === "rood") {
    return (
      toVaStrict(b.rood_va) ??
      toVaStrict(b.va_rood) ??
      toVaStrict(b.rood_va_mm) ??
      null
    );
  }

  return (
    toVaStrict(b.blauw_va) ??
    toVaStrict(b.va_blauw) ??
    toVaStrict(b.blauw_va_mm) ??
    null
  );
}

export function collectUniqueVANummers(bouts: any[]): string[] {
  const vaSet = new Set<string>();

  for (const b of bouts ?? []) {
    const rood = pickVA(b, "rood");
    const blauw = pickVA(b, "blauw");
    if (rood) vaSet.add(rood);
    if (blauw) vaSet.add(blauw);
  }

  return [...vaSet].filter(Boolean);
}

export function resolveScriptPath(...parts: string[]) {
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

export function resolveFpBundlePath(scraperFile: string) {
  return resolveScriptPath("scrapers", "fp_bundle", scraperFile);
}

export function isActiveRunConflict(err: any) {
  const code = String(err?.code ?? "");
  const message = String(err?.message ?? "").toLowerCase();
  const details = String(err?.details ?? "").toLowerCase();
  const hint = String(err?.hint ?? "").toLowerCase();

  return (
    code === "23505" ||
    message.includes("duplicate key") ||
    message.includes("unique constraint") ||
    message.includes("controle_runs_one_active_per_matchmaking") ||
    details.includes("controle_runs_one_active_per_matchmaking") ||
    hint.includes("controle_runs_one_active_per_matchmaking")
  );
}

export async function markOtherRunsNotLatest(
  matchmaking_id: string,
  current_run_id: string
) {
  const { error } = await supabaseControl
    .from("controle_runs")
    .update({ is_latest: false })
    .eq("matchmaking_id", matchmaking_id)
    .neq("id", current_run_id);

  if (error) {
    console.warn(
      "[startControleRun] kon andere runs niet op is_latest=false zetten",
      error
    );
  }
}

export async function createControleRun(
  args: StartControleRunArgs
): Promise<StartControleRunResult> {
  const payload = {
    matchmaking_id: args.matchmaking_id,
    gestart_door_user_id: args.gestart_door_user_id ?? null,
    gestart_door_rol: args.gestart_door_rol ?? null,
    status: "running",
    gestart_op: new Date().toISOString(),
    run_type: args.run_type ?? "control-engine",
    is_latest: true,
  };

  const { data, error } = await supabaseControl
    .from("controle_runs")
    .insert(payload)
    .select("id, matchmaking_id, status")
    .single();

  if (error) throw error;
  if (!data?.id) {
    throw new Error("controle_run insert gaf geen id terug");
  }

  await markOtherRunsNotLatest(args.matchmaking_id, data.id);

  return data;
}

export async function finishControleRunSuccess(controle_run_id: string) {
  const { error } = await supabaseControl
    .from("controle_runs")
    .update({
      status: "klaar",
      afgerond_op: new Date().toISOString(),
      is_latest: true,
    })
    .eq("id", controle_run_id);

  if (error) throw error;
}

export async function finishControleRunFailed(
  controle_run_id: string,
  err: any
) {
  const { error } = await supabaseControl
    .from("controle_runs")
    .update({
      status: "failed",
      foutmelding: err?.message ?? "Onbekende fout",
      afgerond_op: new Date().toISOString(),
    })
    .eq("id", controle_run_id);

  if (error) {
    console.error("[startControleRun] finishControleRunFailed update error", error);
  }
}

export async function loadMatchmakingBouts(matchmaking_id: string) {
  const { data, error } = await supabaseControl
    .from("matchmaking_bouts_raw")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .order("partij_nr", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export function uniqueBy<T>(arr: T[], getKey: (row: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];

  for (const row of arr) {
    const key = getKey(row);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return out;
}

export async function loadControleContextForRun(args: {
  matchmaking_id: string;
  controle_run_id: string;
  allowFallbackToLatestMatchmakingRows?: boolean;
}) {
  const { matchmaking_id, controle_run_id, allowFallbackToLatestMatchmakingRows } =
    args;

  const { data: rawCtxRows, error: ctxErr } = await supabaseControl
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .order("partij_nr", { ascending: true })
    .order("created_at", { ascending: false });

  if (ctxErr) throw ctxErr;

  const ctxRowsCurrentRun = (rawCtxRows ?? []).filter(
    (r: any) => String(r?.controle_run_id ?? "") === String(controle_run_id)
  );

  const ctxRows =
    ctxRowsCurrentRun.length > 0
      ? ctxRowsCurrentRun
      : allowFallbackToLatestMatchmakingRows
      ? uniqueBy(
          (rawCtxRows ?? []) as any[],
          (r: any) =>
            String(
              r?.bout_id ??
                r?.bout_uid ??
                `${r?.partij_nr ?? ""}-${r?.rood_va_mm ?? ""}-${r?.blauw_va_mm ?? ""}`
            )
        )
      : [];

  return {
    rawCtxRows: rawCtxRows ?? [],
    ctxRowsCurrentRun,
    ctxRows,
  };
}

export async function countControleResultaten(controle_run_id: string) {
  const { count, error } = await supabaseControl
    .from("controle_resultaten")
    .select("id", { count: "exact", head: true })
    .eq("controle_run_id", controle_run_id);

  if (error) throw error;
  return count ?? 0;
}

export function runNodeScript(
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

      if (code === 0) {
        resolve({ stdout, stderr, ms });
      } else {
        reject(
          new Error(
            `Script failed: ${scriptPath} (exit code ${code})\n(ms=${ms})\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`
          )
        );
      }
    });
  });
}

export async function runFpBundleScraper(args: {
  scraperFile: string;
  matchmaking_id: string;
  controle_run_id: string;
  va_nummers: string[];
  settings: ScrapeSettings;
  logPrefix?: string;
}) {
  const scriptPath = resolveFpBundlePath(args.scraperFile);

  dlog("[startControleRun] fpBundlePath =", scriptPath);

  return runNodeScript(
    scriptPath,
    [args.matchmaking_id, args.controle_run_id, ...args.va_nummers],
    {
      WORKERS: String(args.settings.workers),
      STAGGER_MS: String(args.settings.stagger_ms),
      TAB_ATTEMPTS: String(args.settings.tab_attempts),
      SOFT_WAIT_MS: String(args.settings.soft_wait_ms),
      BETWEEN_ATTEMPTS_MS: String(args.settings.between_attempts_ms),
      FULLFIGHTER_TIMEOUT_MS: String(args.settings.fullfighter_timeout_ms),
      UITSLAGEN_TIMEOUT_MS: String(args.settings.uitslagen_timeout_ms),
      UITSLAGEN_TRIES: String(args.settings.uitslagen_tries),
    },
    args.logPrefix ?? "fp_bundle"
  );
}