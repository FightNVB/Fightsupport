// app/api/matchmaker/scrape/start/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

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

function clampInt(n: any, def: number, min: number, max: number): number {
  const num = Number(n);
  if (!Number.isFinite(num)) return def;
  const v = Math.floor(num);
  return Math.max(min, Math.min(max, v));
}

function toVaStrict(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  const digits = s.replace(/[^0-9]/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null; // iets ruimer
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

async function assertCanAccessMatchmakerMatchmaking(opts: {
  matchmaker_matchmaking_id: string;
  userId: string;
  role: string | null | undefined;
}) {
  const role = String(opts.role ?? "").toLowerCase();
  const isAdmin = role.includes("superadmin") || role.includes("admin");
  if (isAdmin) return;

  // matchmaker: alleen eigen record
  const { data, error } = await supabase
    .from("matchmaker_matchmakings")
    .select("id, created_by")
    .eq("id", opts.matchmaker_matchmaking_id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Matchmaker matchmaking niet gevonden");

  const created_by = (data as any).created_by as string | null;
  if (!created_by || created_by !== opts.userId) {
    throw new Error("Geen toegang tot deze matchmaking (matchmaker)");
  }
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req);

    const body = await req.json();
    const matchmaker_matchmaking_id = body?.matchmaker_matchmaking_id as string | undefined;

    if (!matchmaker_matchmaking_id) {
      return NextResponse.json({ error: "matchmaker_matchmaking_id ontbreekt" }, { status: 400 });
    }

    await assertCanAccessMatchmakerMatchmaking({ matchmaker_matchmaking_id, userId, role });

    // bundle settings (zelfde knobs als je controle start route)
    const workers = clampInt(body?.workers ?? 8, 8, 1, 20);
    const stagger_ms = clampInt(body?.stagger_ms ?? 250, 250, 0, 5000);
    const tab_attempts = clampInt(body?.tab_attempts ?? 8, 8, 1, 30);
    const soft_wait_ms = clampInt(body?.soft_wait_ms ?? 900, 900, 200, 5000);
    const between_attempts_ms = clampInt(body?.between_attempts_ms ?? 450, 450, 0, 5000);

    const fullfighter_timeout_ms = clampInt(body?.fullfighter_timeout_ms ?? 35000, 35000, 5000, 180000);
    const uitslagen_timeout_ms = clampInt(body?.uitslagen_timeout_ms ?? 90000, 90000, 5000, 240000);
    const uitslagen_tries = clampInt(body?.uitslagen_tries ?? 1, 1, 1, 5);

    // scrape_run_id: client mag sturen, anders maken we er 1
    const scrape_run_id =
      (typeof body?.scrape_run_id === "string" && body.scrape_run_id) ? body.scrape_run_id : crypto.randomUUID();

    // 1) VA’s ophalen uit matchmaker_inschrijvingen
    const { data: rows, error } = await supabase
      .from("matchmaker_inschrijvingen")
      .select("*")
      .eq("matchmaker_matchmaking_id", matchmaker_matchmaking_id);

    if (error) throw error;

    const vaSet = new Set<string>();
    (rows ?? []).forEach((r: any) => {
      // jij gaat dit schema toch strak trekken, maar dit is 3-liner veilig:
      const va =
        toVaStrict(r.va_nummer) ??
        toVaStrict(r.va) ??
        toVaStrict(r.va_nr) ??
        toVaStrict(r.vanummer) ??
        null;

      if (va) vaSet.add(va);
    });

    const va_nummers = [...vaSet];

    console.log("[matchmaker/scrape/start]", {
      matchmaker_matchmaking_id,
      scrape_run_id,
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

    if (va_nummers.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Geen VA-nummers gevonden in matchmaker_inschrijvingen", matchmaker_matchmaking_id, scrape_run_id },
        { status: 400 }
      );
    }

    // 2) script pad (matchmaker bundle)
    const fpBundleMMPath = resolveScriptPath("scrapers", "fp_bundle_mm", "scraper_fp_bundle_mm.js");
    dlog("[matchmaker/scrape/start] fpBundleMMPath =", fpBundleMMPath);

    // 3) run scraper
    const res = await runNodeScript(
      fpBundleMMPath,
      [matchmaker_matchmaking_id, scrape_run_id, ...va_nummers],
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
      "fp_bundle_mm"
    );

    console.log("[matchmaker/scrape/start] ✅ fp_bundle_mm klaar", { ms: res.ms, va_count: va_nummers.length });

    return NextResponse.json({
      ok: true,
      matchmaker_matchmaking_id,
      scrape_run_id,
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
    console.error("❌ matchmaker scrape/start fout:", err);
    return NextResponse.json({ error: err?.message ?? "Onbekende fout" }, { status: 500 });
  }
}