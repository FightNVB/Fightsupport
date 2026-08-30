// app/api/officials/eindcontrole/start/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const QUEUE_TABLE = "controle_fighter_actueel_queue";
const FINAL_RUN_TYPE = "official_eindcontrole";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function norm(v: unknown) {
  return String(v ?? "").trim();
}

function toVaStrict(v: unknown): string | null {
  const digits = String(v ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

function pickVA(row: any, side: "rood" | "blauw") {
  const candidates =
    side === "rood"
      ? [row?.rood_va, row?.va_rood, row?.rood_va_mm, row?.rood_va_nummer, row?.rood_fighter_id]
      : [row?.blauw_va, row?.va_blauw, row?.blauw_va_mm, row?.blauw_va_nummer, row?.blauw_fighter_id];

  for (const value of candidates) {
    const va = toVaStrict(value);
    if (va) return va;
  }
  return null;
}

function isRoleAllowed(role: string | null | undefined) {
  return ["official", "hoofdofficial", "admin", "superadmin", "matchmaker"].includes(
    String(role ?? "").toLowerCase(),
  );
}

function resolveQueueWorkerPath() {
  const root = process.cwd();
  const candidates = [
    path.join(root, "ControlEngine", "scrapers", "fp_mm", "scraper_fp_mm_queue.js"),
    path.join(root, "ControlEngine", "ControlEngine", "scrapers", "fp_mm", "scraper_fp_mm_queue.js"),
    path.join(root, "control-engine", "scrapers", "fp_mm", "scraper_fp_mm_queue.js"),
    path.join(root, "control-engine", "control-engine", "scrapers", "fp_mm", "scraper_fp_mm_queue.js"),
    path.join(root, "scrapers", "fp_mm", "scraper_fp_mm_queue.js"),
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`fp_mm queue-worker niet gevonden:\n- ${candidates.join("\n- ")}`);
  }
  return found;
}

async function updateRun(
  controleRunId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("controle_runs")
    .update(patch)
    .eq("id", controleRunId);

  if (error) console.warn("[official-eindcontrole] run update mislukt", error);
}

async function abortOlderFinalRuns(matchmakingId: string) {
  const now = new Date().toISOString();
  await supabase
    .from("controle_runs")
    .update({
      status: "aborted",
      afgerond_op: now,
      is_latest: false,
      foutmelding: "Afgebroken omdat een nieuwe eindcontrole is gestart.",
    })
    .eq("matchmaking_id", matchmakingId)
    .eq("run_type", FINAL_RUN_TYPE)
    .eq("status", "running");
}

async function createFinalRun(args: {
  matchmakingId: string;
  userId: string | null;
  role: string | null;
  total: number;
}) {
  const { data, error } = await supabase
    .from("controle_runs")
    .insert({
      matchmaking_id: args.matchmakingId,
      gestart_door_user_id: args.userId,
      gestart_door_rol: args.role,
      status: "running",
      gestart_op: new Date().toISOString(),
      run_type: FINAL_RUN_TYPE,
      is_latest: true,
      totaal_aantal: args.total,
      verwerkt_aantal: 0,
      progress: 2,
      current_step: "Laatste eindcontrole wordt voorbereid...",
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error("Geen controle_run_id ontvangen.");

  await supabase
    .from("controle_runs")
    .update({ is_latest: false })
    .eq("matchmaking_id", args.matchmakingId)
    .neq("id", data.id);

  return String(data.id);
}

async function collectVaNumbers(matchmakingId: string) {
  const [{ data: bouts, error: boutsError }, { data: tournamentRows, error: tournamentError }] =
    await Promise.all([
      supabase
        .from("matchmaking_bouts_raw")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .or("verwijderd.is.null,verwijderd.eq.false"),
      supabase
        .from("controle_toernooi_context")
        .select("fighter_id,va_nummer")
        .eq("matchmaking_id", matchmakingId),
    ]);

  if (boutsError) throw boutsError;
  if (tournamentError && String((tournamentError as any)?.code ?? "") !== "42P01") {
    throw tournamentError;
  }

  const vaSet = new Set<string>();
  for (const bout of bouts ?? []) {
    const rood = pickVA(bout, "rood");
    const blauw = pickVA(bout, "blauw");
    if (rood) vaSet.add(rood);
    if (blauw) vaSet.add(blauw);
  }

  for (const row of tournamentRows ?? []) {
    const va = toVaStrict((row as any)?.va_nummer) ?? toVaStrict((row as any)?.fighter_id);
    if (va) vaSet.add(va);
  }

  return { vaNumbers: [...vaSet], bouts: bouts ?? [] };
}

async function enqueueFinalCheck(
  matchmakingId: string,
  controleRunId: string,
  vaNumbers: string[],
) {
  if (!vaNumbers.length) return;

  // Alleen eigen nieuwe run schoonmaken; andere matchmaking-queues nooit aanraken.
  await supabase
    .from(QUEUE_TABLE)
    .delete()
    .eq("matchmaking_id", matchmakingId)
    .eq("controle_run_id", controleRunId);

  const rows = vaNumbers.map((va) => ({
    matchmaking_id: matchmakingId,
    controle_run_id: controleRunId,
    va_nummer: va,
    status: "pending",
    error_message: null,
  }));

  const { error } = await supabase.from(QUEUE_TABLE).insert(rows);
  if (error) throw error;
}

function launchQueueWorker() {
  const scriptPath = resolveQueueWorkerPath();
  const child = spawn(process.execPath, [scriptPath], {
    cwd: path.dirname(scriptPath),
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: {
      ...process.env,
      FP_SESSION_MODE: "master",
      FP_MATCHMAKER_ID: "",
      FP_OFFICIALS_WORKERS: process.env.FP_MM_WORKERS ?? process.env.FP_OFFICIALS_WORKERS ?? "8",
      WORKERS: process.env.FP_MM_WORKERS ?? process.env.FP_OFFICIALS_WORKERS ?? "8",
    },
  });
  child.unref();
}

async function waitForOwnQueue(args: {
  matchmakingId: string;
  controleRunId: string;
  total: number;
}) {
  const timeoutMs = Math.max(120000, Number(process.env.FP_MM_FINAL_TIMEOUT_MS ?? 20 * 60 * 1000));
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const { data, error } = await supabase
      .from(QUEUE_TABLE)
      .select("status,error_message")
      .eq("matchmaking_id", args.matchmakingId)
      .eq("controle_run_id", args.controleRunId);

    if (error) throw error;

    const rows = data ?? [];
    const done = rows.filter((r: any) => r.status === "done").length;
    const failed = rows.filter((r: any) => r.status === "error").length;
    const processing = rows.filter((r: any) => r.status === "processing").length;
    const terminal = done + failed;
    const total = Math.max(args.total, rows.length);
    const progress = total > 0 ? 8 + Math.round((terminal / total) * 42) : 50;

    await updateRun(args.controleRunId, {
      verwerkt_aantal: terminal,
      progress: Math.min(50, progress),
      current_step:
        processing > 0
          ? `FightPassport eindcontrole draait (${terminal}/${total} afgerond)...`
          : `Wachten op FightPassport queue (${terminal}/${total} afgerond)...`,
    });

    if (rows.length >= args.total && terminal >= rows.length) {
      return { done, failed, total: rows.length };
    }

    await sleep(1500);
  }

  throw new Error("Timeout tijdens wachten op de FightPassport eindcontrole-queue.");
}

function uniqueBy<T>(arr: T[], getKey: (row: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of arr) {
    const key = getKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

async function finalizeInBackground(args: {
  matchmakingId: string;
  controleRunId: string;
  vaCount: number;
  boutCount: number;
}) {
  const { matchmakingId, controleRunId } = args;

  try {
    const queue = await waitForOwnQueue({
      matchmakingId,
      controleRunId,
      total: args.vaCount,
    });

    await updateRun(controleRunId, {
      progress: 52,
      current_step: "Partij-context opnieuw opbouwen...",
    });
    await buildControleBoutContext(matchmakingId, controleRunId);

    await updateRun(controleRunId, {
      progress: 62,
      current_step: "Toernooi-context opnieuw opbouwen...",
    });
    const toernooiRows = await buildToernooiContext(matchmakingId, controleRunId);

    await updateRun(controleRunId, {
      progress: 72,
      current_step: "Context verrijken met actuele FightPassport-data...",
    });
    await enrichControleBoutContext(matchmakingId, controleRunId);

    const { data: rawCtxRows, error: ctxError } = await supabase
      .from("controle_bout_context")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .order("partij_nr", { ascending: true })
      .order("created_at", { ascending: false });

    if (ctxError) throw ctxError;

    const currentRows = (rawCtxRows ?? []).filter(
      (row: any) => norm(row?.controle_run_id) === controleRunId,
    );

    const ctxRows =
      currentRows.length > 0
        ? currentRows
        : uniqueBy(rawCtxRows ?? [], (row: any) =>
            norm(
              row?.bout_id ??
                row?.bout_uid ??
                `${row?.partij_nr ?? ""}-${row?.rood_va_mm ?? ""}-${row?.blauw_va_mm ?? ""}`,
            ),
          );

    if (args.boutCount > 0 && !ctxRows.length) {
      throw new Error("Na build/enrich is geen controle_bout_context gevonden.");
    }

    await updateRun(controleRunId, {
      progress: 84,
      current_step: "Admin/official RulesEngine draait...",
    });

    const hits = await rulesEngine({
      matchmaking_id: matchmakingId,
      controle_run_id: controleRunId,
      ctxRows: ctxRows as any[],
    });

    const warningText = queue.failed > 0
      ? `${queue.failed} FightPassport-check(s) konden niet volledig worden gelezen. Het eindrapport toont deze als aandacht/blokkade.`
      : null;

    await updateRun(controleRunId, {
      status: "klaar",
      afgerond_op: new Date().toISOString(),
      is_latest: true,
      totaal_aantal: args.vaCount,
      verwerkt_aantal: args.vaCount,
      progress: 100,
      current_step: warningText ? `Eindcontrole klaar — ${warningText}` : "Eindcontrole klaar. Rapport is bijgewerkt.",
      foutmelding: warningText,
    });

    console.log("[official-eindcontrole] klaar", {
      matchmakingId,
      controleRunId,
      vaCount: args.vaCount,
      queueFailed: queue.failed,
      ctxRows: ctxRows.length,
      toernooiRows: Array.isArray(toernooiRows) ? toernooiRows.length : 0,
      hits: Array.isArray(hits) ? hits.length : 0,
    });
  } catch (error: any) {
    console.error("[official-eindcontrole] mislukt", error);
    await updateRun(controleRunId, {
      status: "failed",
      afgerond_op: new Date().toISOString(),
      progress: 100,
      current_step: "Eindcontrole mislukt.",
      foutmelding: error?.message ?? String(error),
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = norm(body?.matchmaking_id);
    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    }

    const { userId, role } = await requireUserWithRole(req);
    if (!isRoleAllowed(role)) {
      return NextResponse.json({ error: "Geen toegang tot laatste eindcontrole" }, { status: 403 });
    }
    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });

    await abortOlderFinalRuns(matchmakingId);

    const { vaNumbers, bouts } = await collectVaNumbers(matchmakingId);
    if (!vaNumbers.length) {
      return NextResponse.json(
        { error: "Geen VA-nummers gevonden in deze matchmaking/toernooien." },
        { status: 400 },
      );
    }

    const controleRunId = await createFinalRun({
      matchmakingId,
      userId: userId ?? null,
      role: role ?? null,
      total: vaNumbers.length,
    });

    await enqueueFinalCheck(matchmakingId, controleRunId, vaNumbers);
    await updateRun(controleRunId, {
      progress: 6,
      current_step: `${vaNumbers.length} vechters in de FightPassport eindcontrole-queue gezet...`,
    });

    launchQueueWorker();

    // Zelf-gehoste Next/PM2: de queue + build/enrich/rules mogen na de 202-response
    // doorlopen. De GET hieronder levert de voortgang voor de knop/pagina.
    void finalizeInBackground({
      matchmakingId,
      controleRunId,
      vaCount: vaNumbers.length,
      boutCount: bouts.length,
    });

    return NextResponse.json(
      {
        ok: true,
        started: true,
        matchmaking_id: matchmakingId,
        controle_run_id: controleRunId,
        va_count: vaNumbers.length,
        status: "running",
      },
      { status: 202 },
    );
  } catch (error: any) {
    console.error("[official-eindcontrole/start] fout", error);
    return NextResponse.json(
      { error: error?.message ?? "Laatste eindcontrole starten mislukt." },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const matchmakingId = norm(url.searchParams.get("matchmaking_id"));
    const controleRunId = norm(url.searchParams.get("controle_run_id"));

    if (!matchmakingId && !controleRunId) {
      return NextResponse.json(
        { error: "matchmaking_id of controle_run_id ontbreekt" },
        { status: 400 },
      );
    }

    const { userId, role } = await requireUserWithRole(req);
    if (!isRoleAllowed(role)) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    if (matchmakingId) {
      await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });
    }

    let query = supabase
      .from("controle_runs")
      .select("id,matchmaking_id,status,gestart_op,afgerond_op,run_type,progress,current_step,totaal_aantal,verwerkt_aantal,foutmelding")
      .eq("run_type", FINAL_RUN_TYPE);

    if (controleRunId) query = query.eq("id", controleRunId);
    if (matchmakingId) query = query.eq("matchmaking_id", matchmakingId);

    const { data, error } = await query
      .order("gestart_op", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ ok: true, run: data ?? null });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Eindcontrole-status ophalen mislukt." },
      { status: 500 },
    );
  }
}
