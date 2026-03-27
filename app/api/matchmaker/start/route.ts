import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { buildMatchmakerFighterContext } from "@/lib/matchmaker/buildMatchmakerFighterContext";
import { enrichMatchmakerBoutContext } from "@/lib/matchmaker/enrichMatchmakerBoutContext";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
} from "@/app/api/_utils/authz";

export const runtime = "nodejs";

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

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])];
}

export async function POST(req: Request) {
  let controle_run_id: string | null = null;

  try {
    const body = await req.json();
    const matchmaking_id = body?.matchmaking_id as string | undefined;

    const do_scrape = body?.do_scrape !== false;

    const workers = clampInt(body?.workers ?? 8, 8, 1, 20);
    const stagger_ms = clampInt(body?.stagger_ms ?? 250, 250, 0, 5000);
    const tab_attempts = clampInt(body?.tab_attempts ?? 8, 8, 1, 30);
    const soft_wait_ms = clampInt(body?.soft_wait_ms ?? 900, 900, 200, 5000);
    const between_attempts_ms = clampInt(
      body?.between_attempts_ms ?? 450,
      450,
      0,
      5000
    );

    const fullfighter_timeout_ms = clampInt(
      body?.fullfighter_timeout_ms ?? 35000,
      35000,
      5000,
      180000
    );
    const uitslagen_timeout_ms = clampInt(
      body?.uitslagen_timeout_ms ?? 90000,
      90000,
      5000,
      240000
    );
    const uitslagen_tries = clampInt(body?.uitslagen_tries ?? 1, 1, 1, 5);

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt" },
        { status: 400 }
      );
    }

    const { userId, role } = await requireUserWithRole(req);
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    const { data: runRows, error: runErr } = await supabase
      .from("matchmaker_controle_runs")
      .insert({
        matchmaking_id,
        status: "running",
        gestart_op: new Date().toISOString(),
        run_type: "matchmaker-scrape",
      })
      .select("id")
      .limit(1);

    if (runErr) throw runErr;

    controle_run_id = runRows?.[0]?.id ?? null;
    if (!controle_run_id) {
      throw new Error("matchmaker_controle_runs insert gaf geen id terug");
    }

    console.log("[control-engine/start] ▶ cleanup oude matchmaker data...", {
      matchmaking_id,
      controle_run_id,
    });

    const { error: delCtxErr } = await supabase
      .from("matchmaker_fighter_context")
      .delete()
      .eq("matchmaking_id", matchmaking_id);

    if (delCtxErr) throw delCtxErr;

    const { error: delRawErr } = await supabase
      .from("matchmaker_fighters_raw")
      .delete()
      .eq("matchmaking_id", matchmaking_id);

    if (delRawErr) throw delRawErr;

    const { error: delUitslagenErr } = await supabase
      .from("matchmaker_uitslagen_raw")
      .delete()
      .eq("matchmaking_id", matchmaking_id);

    if (delUitslagenErr) throw delUitslagenErr;

    console.log("[control-engine/start] ✅ cleanup klaar");

    const { data: inschrijvingen, error: insErr } = await supabase
      .from("matchmaker_inschrijvingen")
      .select("id, row_nr, va_nummer")
      .eq("matchmaking_id", matchmaking_id)
      .order("row_nr", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (insErr) throw insErr;

    const va_nummers = uniqueStrings(
      (inschrijvingen ?? []).map((row: any) => toVaStrict(row?.va_nummer))
    );

    console.log("[control-engine/start] run", {
      matchmaking_id,
      controle_run_id,
      do_scrape,
      inschrijvingen: inschrijvingen?.length ?? 0,
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

    dlog("[control-engine/start] va_sample", va_nummers.slice(0, 12));

    const fpBundlePath = resolveScriptPath(
      "scrapers",
      "fp_bundle_mm",
      "scraper_fp_bundle_mm.js"
    );
    dlog("[control-engine/start] fpBundlePath =", fpBundlePath);

    if (do_scrape && va_nummers.length > 0) {
      console.log("[control-engine/start] ▶ fp_bundle start", {
        va_count: va_nummers.length,
      });

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
          "fp_bundleMM"
        );

        console.log("[control-engine/start] ✅ fp_bundleMM klaar", {
          ms: res.ms,
          va_count: va_nummers.length,
        });
      } catch (e: any) {
        console.log("[control-engine/start] ❌ fp_bundleMM failed", {
          error: e?.message ?? String(e),
        });
        throw e;
      }
    } else {
      console.log("[control-engine/start] scrape skipped", {
        do_scrape,
        va_count: va_nummers.length,
      });
    }

    console.log("[control-engine/start] ▶ buildMatchmakerFighterContext...");
    await buildMatchmakerFighterContext(matchmaking_id, controle_run_id);
    console.log("[control-engine/start] ✅ buildMatchmakerFighterContext klaar");

    console.log("[control-engine/start] ▶ enrichMatchmakerBoutContext...");
    await enrichMatchmakerBoutContext(matchmaking_id, controle_run_id);
    console.log("[control-engine/start] ✅ enrichMatchmakerBoutContext klaar");

    await supabase
      .from("matchmaker_controle_runs")
      .update({
        status: "klaar",
        afgerond_op: new Date().toISOString(),
      })
      .eq("id", controle_run_id);

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      controle_run_id,
      do_scrape,
      inschrijvingen: inschrijvingen?.length ?? 0,
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
  } catch (err: any) {
    console.error("❌ ControlEngine fout:", err);

    if (controle_run_id) {
      await supabase
        .from("matchmaker_controle_runs")
        .update({
          status: "failed",
          foutmelding: err?.message ?? "Onbekende fout",
          afgerond_op: new Date().toISOString(),
        })
        .eq("id", controle_run_id);
    }

    return NextResponse.json(
      { error: err?.message ?? "Onbekende fout", controle_run_id },
      { status: 500 }
    );
  }
}