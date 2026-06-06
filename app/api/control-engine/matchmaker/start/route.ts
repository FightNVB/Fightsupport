// app/api/control-engine/matchmaker/start/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import {
  buildControleBoutContext,
  buildToernooiContext,
} from "@/lib/control/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/control/enrichControleBoutContext";
import { rulesEngine } from "@/lib/rulesEngine";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
} from "@/app/api/_utils/authz";
import { transferLifecycle } from "@/app/api/_utils/matchmakingLifecycle";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const DEBUG = process.env.CONTROL_ENGINE_DEBUG === "1";

// Matchmaker-autocheck gebruikt ook de master-login, maar unlock wordt netjes naar admin gestuurd.
const SCRAPER_FILE = "scraper_fp_bundle.js";

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

  while (true) {
    try {
      const fd = fs.openSync(lockPath, "wx");
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }));
      fs.closeSync(fd);
      break;
    } catch {
      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > 1000 * 60 * 90) fs.unlinkSync(lockPath);
      } catch {}
      if (Date.now() - started > 1000 * 60 * 120) {
        throw new Error("FightPassport scraper-lock timeout. Er draait mogelijk nog een andere scraper.");
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  try {
    return await fn();
  } finally {
    try { fs.unlinkSync(lockPath); } catch {}
  }
}

function clampInt(n: any, def: number, min: number, max: number): number {
  const num = Number(n);
  if (!Number.isFinite(num)) return def;
  const v = Math.floor(num);
  return Math.max(min, Math.min(max, v));
}

function isRoleAllowedForRoute(role: string | null | undefined) {
  return role === "matchmaker" || role === "admin" || role === "superadmin";
}

function isFightPassportUnlockError(err: any) {
  const text = String(err?.message ?? err ?? "").toLowerCase();
  return (
    text.includes("unlock") ||
    text.includes("verification") ||
    text.includes("verificatie") ||
    text.includes("2fa") ||
    text.includes("two-factor") ||
    text.includes("two factor") ||
    text.includes("code gevraagd") ||
    text.includes("fp_unlock_required")
  );
}

async function updateRunProgress(args: {
  controle_run_id: string;
  totaal_aantal?: number;
  verwerkt_aantal?: number;
  progress?: number;
  current_step?: string;
}) {
  const patch: Record<string, any> = {};

  if (typeof args.totaal_aantal === "number") {
    patch.totaal_aantal = args.totaal_aantal;
  }

  if (typeof args.verwerkt_aantal === "number") {
    patch.verwerkt_aantal = args.verwerkt_aantal;
  }

  if (typeof args.progress === "number") {
    patch.progress = Math.max(0, Math.min(100, Math.round(args.progress)));
  }

  if (typeof args.current_step === "string") {
    patch.current_step = args.current_step;
  }

  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from("controle_runs")
    .update(patch)
    .eq("id", args.controle_run_id);

  if (error) {
    console.warn("[control-engine/matchmaker/start] progress update mislukt", error);
  }
}

async function markOtherRunsNotLatest(
  matchmaking_id: string,
  current_run_id: string
) {
  const { error } = await supabase
    .from("controle_runs")
    .update({ is_latest: false })
    .eq("matchmaking_id", matchmaking_id)
    .neq("id", current_run_id);

  if (error) {
    console.warn(
      "[control-engine/matchmaker/start] kon andere runs niet op is_latest=false zetten",
      error
    );
  }
}

async function abortActiveRuns(matchmaking_id: string) {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("controle_runs")
    .update({
      status: "aborted",
      afgerond_op: now,
      is_latest: false,
      foutmelding: "Automatisch afgebroken omdat een nieuwe controle is gestart.",
    })
    .eq("matchmaking_id", matchmaking_id)
    .eq("status", "running");

  if (error) {
    throw error;
  }
}

async function createControleRun(args: {
  matchmaking_id: string;
  gestart_door_user_id: string | null;
  gestart_door_rol: string | null;
}) {
  const payload = {
    matchmaking_id: args.matchmaking_id,
    gestart_door_user_id: args.gestart_door_user_id,
    gestart_door_rol: args.gestart_door_rol,
    status: "running",
    gestart_op: new Date().toISOString(),
    run_type: "control-engine",
    is_latest: true,

    totaal_aantal: 0,
    verwerkt_aantal: 0,
    progress: 0,
    current_step: "Controle wordt gestart...",
  };

  const { data, error } = await supabase
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

function runNodeScript(
  scriptPath: string,
  args: string[],
  envExtra?: Record<string, string>,
  logPrefix?: string
): Promise<{ stdout: string; stderr: string; ms: number }> {
  return withScraperLock(() => new Promise((resolve, reject) => {
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
          `Script spawn error: ${
            err?.message ?? err
          }\n(ms=${ms})\n\nSTDERR:\n${stderr}\n\nSTDOUT:\n${stdout}`
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
  }));
}

function uniqueBy<T>(arr: T[], getKey: (row: T) => string): T[] {
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

export async function POST(req: Request) {
  let controle_run_id: string | null = null;
  let matchmaking_id: string | null = null;

  try {
    const body = await req.json();
    matchmaking_id = (body?.matchmaking_id as string | undefined) || null;

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

    if (!isRoleAllowedForRoute(role)) {
      return NextResponse.json(
        { error: "Geen toegang tot matchmaker start route" },
        { status: 403 }
      );
    }

    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    await abortActiveRuns(matchmaking_id);

    const run = await createControleRun({
      matchmaking_id,
      gestart_door_user_id: userId ?? null,
      gestart_door_rol: role ?? null,
    });

    controle_run_id = run.id!;

    await updateRunProgress({
      controle_run_id: controle_run_id!,
      progress: 2,
      current_step: "Oude controlegegevens opruimen...",
    });

    console.log("[control-engine/matchmaker/start] 🧹 cleanup oude raw data...");

    const cleanupTargets = [
      "fighters_raw",
      "uitslagen_raw",
      "controle_uitslagen",
      "controle_resultaten",
      "controle_bout_context",
      "controle_toernooi_context",
    ] as const;

    for (const table of cleanupTargets) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("matchmaking_id", matchmaking_id);

      if (error) throw error;
    }

    console.log("[control-engine/matchmaker/start] ✅ cleanup klaar");

    await updateRunProgress({
      controle_run_id: controle_run_id!,
      progress: 5,
      current_step: "Partijen en toernooi-deelnemers verzamelen...",
    });

    const { data: bouts, error: boutsErr } = await supabase
      .from("matchmaking_bouts_raw")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .order("partij_nr", { ascending: true });

    if (boutsErr) throw boutsErr;

    const { data: toernooiDeelnemers, error: tErr } = await supabase
      .from("controle_toernooi_context")
      .select("fighter_id, va_nummer, toernooi_code")
      .eq("matchmaking_id", matchmaking_id);

    if (tErr && String((tErr as any)?.code ?? "") !== "42P01") throw tErr;

    const vaSet = new Set<string>();
    (bouts ?? []).forEach((b: any) => {
      const rood = pickVA(b, "rood");
      const blauw = pickVA(b, "blauw");
      if (rood) vaSet.add(rood);
      if (blauw) vaSet.add(blauw);
    });

    (toernooiDeelnemers ?? []).forEach((d: any) => {
      const va = toVaStrict(d?.fighter_id) ?? toVaStrict(d?.va_nummer);
      if (va) vaSet.add(va);
    });

    const va_nummers = [...vaSet].filter(Boolean);

    const totaalAantal =
      va_nummers.length > 0
        ? va_nummers.length
        : (bouts ?? []).length + (toernooiDeelnemers ?? []).length;

    await updateRunProgress({
      controle_run_id: controle_run_id!,
      totaal_aantal: totaalAantal,
      verwerkt_aantal: 0,
      progress: 8,
      current_step: `Scrape voorbereiden (${va_nummers.length} vechters)...`,
    });

    console.log("[control-engine/matchmaker/start] run", {
      matchmaking_id,
      controle_run_id,
      do_scrape,
      bouts: (bouts ?? []).length,
      toernooi_deelnemers: (toernooiDeelnemers ?? []).length,
      va_count: va_nummers.length,
      workers,
      stagger_ms,
      tab_attempts,
      soft_wait_ms,
      between_attempts_ms,
      fullfighter_timeout_ms,
      uitslagen_timeout_ms,
      uitslagen_tries,
      scraper: SCRAPER_FILE,
      role,
      userId,
    });

    dlog("[control-engine/matchmaker/start] va_sample", va_nummers.slice(0, 12));

    const fpBundlePath = resolveScriptPath(
      "scrapers",
      "fp_bundle",
      SCRAPER_FILE
    );

    dlog("[control-engine/matchmaker/start] fpBundlePath =", fpBundlePath);

    if (do_scrape && va_nummers.length > 0) {
      console.log("[control-engine/matchmaker/start] ▶ fp_bundle start", {
        va_count: va_nummers.length,
        scraper: SCRAPER_FILE,
      });

      await updateRunProgress({
        controle_run_id: controle_run_id!,
        progress: 12,
        current_step: `FightPassport scrape gestart (${va_nummers.length} vechters)...`,
      });

      try {
        const res = await runNodeScript(
          fpBundlePath,
          [matchmaking_id!, controle_run_id!, ...va_nummers],
          {
            // Control-engine/admin start gebruikt ALTIJD de master-login.
            // Belangrijk: process.env.FP_MATCHMAKER_ID kan globaal bestaan, maar mag hier niet doorlekken.
            FP_MATCHMAKER_ID: "",
            FP_SESSION_MODE: "master",

            // Zelfde headless-regels als je andere scrapers.
            HEADLESS: process.env.HEADLESS ?? "false",
            PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "false",

            WORKERS: String(workers),
            STAGGER_MS: String(stagger_ms),
            TAB_ATTEMPTS: String(tab_attempts),
            SOFT_WAIT_MS: String(soft_wait_ms),
            BETWEEN_ATTEMPTS_MS: String(between_attempts_ms),
            FULLFIGHTER_TIMEOUT_MS: String(fullfighter_timeout_ms),
            UITSLAGEN_TIMEOUT_MS: String(uitslagen_timeout_ms),
            UITSLAGEN_TRIES: String(uitslagen_tries),
          },
          "fp_bundle_matchmaker"
        );

        console.log("[control-engine/matchmaker/start] ✅ fp_bundle klaar", {
          ms: res.ms,
          va_count: va_nummers.length,
          scraper: SCRAPER_FILE,
        });

        await updateRunProgress({
          controle_run_id: controle_run_id!,
          verwerkt_aantal: va_nummers.length,
          progress: 45,
          current_step: `Scrape klaar (${va_nummers.length}/${totaalAantal} vechters verwerkt)...`,
        });
      } catch (e: any) {
        console.log(
          "[control-engine/matchmaker/start] ❌ fp_bundle failed (continuing)",
          {
            error: e?.message ?? String(e),
            scraper: SCRAPER_FILE,
          }
        );

        if (isFightPassportUnlockError(e)) {
          const nowIso = new Date().toISOString();

          await updateRunProgress({
            controle_run_id: controle_run_id!,
            progress: 35,
            current_step:
              "FightPassport vraagt om unlock-code. Matchmaking wordt naar admin gestuurd...",
          });

          await supabase
            .from("controle_runs")
            .update({
              status: "failed",
              foutmelding: "FightPassport unlock vereist",
              afgerond_op: nowIso,
              current_step: "Unlock vereist; doorgestuurd naar admin.",
            })
            .eq("id", controle_run_id!);

          await transferLifecycle({
            matchmakingId: matchmaking_id!,
            newStage: "ingediend_admin" as any,
            newOwnerType: "admin" as any,
            newOwnerUserId: null,
            actorUserId: userId ?? null,
            actorRole: role ?? "matchmaker",
            opmerking: "FightPassport unlock vereist tijdens matchmaker-autocheck.",
            metadata: {
              route: "api/control-engine/matchmaker/start",
              action: "auto_send_to_admin_unlock_required",
              controle_run_id,
            },
          });

          await supabase
            .from("matchmakings")
            .update({
              stadium: "ingediend_admin",
              status: "ingediend_admin",
              final_status: "ingediend_admin",
              huidige_eigenaar_type: "admin",
              huidige_eigenaar_user_id: null,
              huidige_eigenaar_bondteam: null,
              submitted_to_admin_at: nowIso,
              sent_at: nowIso,
              sent_by: userId ?? null,
              last_updated_at: nowIso,
              last_updated_by: userId ?? null,
            })
            .eq("id", matchmaking_id!);

          return NextResponse.json(
            {
              ok: false,
              code: "FP_UNLOCK_REQUIRED",
              unlock_required: true,
              message:
                "FightPassport vraagt om een unlock-code. De matchmaking is automatisch doorgestuurd naar admin.",
              controle_run_id,
              matchmaking_id,
            },
            { status: 202 }
          );
        }

        await updateRunProgress({
          controle_run_id: controle_run_id!,
          progress: 35,
          current_step:
            "Scraper gaf een fout, controle wordt verder opgebouwd met beschikbare data...",
        });
      }
    } else {
      console.log("[control-engine/matchmaker/start] scrape skipped", {
        do_scrape,
        va_count: va_nummers.length,
        scraper: SCRAPER_FILE,
      });

      await updateRunProgress({
        controle_run_id: controle_run_id!,
        progress: 35,
        current_step: "Scrape overgeslagen, context wordt opgebouwd...",
      });
    }

    console.log("[control-engine/matchmaker/start] ▶ buildControleBoutContext...");

    await updateRunProgress({
      controle_run_id: controle_run_id!,
      progress: 50,
      current_step: "Partij-context opbouwen...",
    });

    await buildControleBoutContext(matchmaking_id!, controle_run_id!);

    console.log("[control-engine/matchmaker/start] ✅ buildControleBoutContext klaar");

    await updateRunProgress({
      controle_run_id: controle_run_id!,
      progress: 60,
      current_step: "Toernooi-context opbouwen...",
    });

    console.log("[control-engine/matchmaker/start] ▶ buildToernooiContext...");
    const toernooiRows = await buildToernooiContext(
      matchmaking_id!,
      controle_run_id!
    );
    console.log("[control-engine/matchmaker/start] ✅ buildToernooiContext klaar", {
      rows: Array.isArray(toernooiRows) ? toernooiRows.length : 0,
    });

    await updateRunProgress({
      controle_run_id: controle_run_id!,
      progress: 70,
      current_step: "Context verrijken met FightPassport-data...",
    });

    console.log("[control-engine/matchmaker/start] ▶ enrichControleBoutContext...");
    await enrichControleBoutContext(matchmaking_id!, controle_run_id!);
    console.log("[control-engine/matchmaker/start] ✅ enrichControleBoutContext klaar");

    await updateRunProgress({
      controle_run_id: controle_run_id!,
      progress: 78,
      current_step: "Regelcontrole voorbereiden...",
    });

    console.log("[control-engine/matchmaker/start] ▶ load ctxRows for rulesEngine...");

    const { data: rawCtxRows, error: ctxErr } = await supabase
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
        : uniqueBy(
            (rawCtxRows ?? []) as any[],
            (r: any) =>
              String(
                r?.bout_id ??
                  r?.bout_uid ??
                  `${r?.partij_nr ?? ""}-${r?.rood_va_mm ?? ""}-${
                    r?.blauw_va_mm ?? ""
                  }`
              )
          );

    console.log("[control-engine/matchmaker/start] ✅ ctxRows loaded", {
      matchmaking_rows: rawCtxRows?.length ?? 0,
      current_run_rows: ctxRowsCurrentRun.length,
      rows_used_for_rules: ctxRows.length,
    });

    if ((bouts?.length ?? 0) > 0 && (ctxRows?.length ?? 0) === 0) {
      throw new Error(
        `Geen controle_bout_context rows gevonden voor matchmaking ${matchmaking_id} na build/enrich. Bouts=${
          bouts?.length ?? 0
        }.`
      );
    }

    await updateRunProgress({
      controle_run_id: controle_run_id!,
      progress: 85,
      current_step: "RulesEngine draait...",
    });

    console.log("[control-engine/matchmaker/start] ▶ rulesEngine...");
    const hits = await rulesEngine({
      matchmaking_id,
      controle_run_id: controle_run_id!,
      ctxRows: (ctxRows ?? []) as any[],
    });

    console.log("[control-engine/matchmaker/start] ✅ rulesEngine klaar", {
      hits: Array.isArray(hits) ? hits.length : 0,
    });

    console.log(
      "[control-engine/matchmaker/start] ℹ️ saveControleResultaten gebeurt in rulesEngine zelf"
    );

    if (DEBUG && Array.isArray(hits) && hits[0]) {
      console.log("[control-engine/matchmaker/start] hit_sample", hits[0]);
    }

    await updateRunProgress({
      controle_run_id: controle_run_id!,
      progress: 95,
      current_step: "Controle-resultaten tellen...",
    });

    try {
      const { count } = await supabase
        .from("controle_resultaten")
        .select("id", { count: "exact", head: true })
        .eq("controle_run_id", controle_run_id!);

      console.log("[control-engine/matchmaker/start] controle_resultaten count", {
        count: count ?? null,
      });
    } catch {}

    await updateRunProgress({
      controle_run_id: controle_run_id!,
      totaal_aantal: totaalAantal,
      verwerkt_aantal: totaalAantal,
      progress: 100,
      current_step: "Controle klaar.",
    });

    await supabase
      .from("controle_runs")
      .update({
        status: "klaar",
        afgerond_op: new Date().toISOString(),
        is_latest: true,
        totaal_aantal: totaalAantal,
        verwerkt_aantal: totaalAantal,
        progress: 100,
        current_step: "Controle klaar.",
      })
      .eq("id", controle_run_id);

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      controle_run_id,
      do_scrape,
      bouts: bouts?.length ?? 0,
      va_count: va_nummers.length,
      ctx_rows_used: ctxRows.length,
      toernooi_rows_used: Array.isArray(toernooiRows) ? toernooiRows.length : 0,
      workers,
      stagger_ms,
      tab_attempts,
      soft_wait_ms,
      between_attempts_ms,
      fullfighter_timeout_ms,
      uitslagen_timeout_ms,
      uitslagen_tries,
      scraper: SCRAPER_FILE,
      role,
    });
  } catch (err: any) {
    console.error("❌ ControlEngine matchmaker fout:", err);

    if (controle_run_id) {
      await supabase
        .from("controle_runs")
        .update({
          status: "failed",
          foutmelding: err?.message ?? "Onbekende fout",
          afgerond_op: new Date().toISOString(),
          current_step: "Controle mislukt.",
        })
        .eq("id", controle_run_id);
    }

    return NextResponse.json(
      {
        error: err?.message ?? "Onbekende fout",
        controle_run_id,
        matchmaking_id,
      },
      { status: 500 }
    );
  }
}