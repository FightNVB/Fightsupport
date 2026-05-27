// app/api/matchmaker/scrape/start/route.ts
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";
import { runSingleFighterContextPipeline } from "@/lib/matchmaker/runSingleFighterContextPipeline";
import { runMatchmakerFighterRules } from "@/lib/matchmaker/fighterRules";

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

function s(v: any): string {
  return String(v ?? "").trim();
}

function clampInt(n: any, def: number, min: number, max: number): number {
  const num = Number(n);
  if (!Number.isFinite(num)) return def;
  const v = Math.floor(num);
  return Math.max(min, Math.min(max, v));
}

function toVaStrict(v: any): string | null {
  const digits = s(v).replace(/[^0-9]/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

function toUuidOrNull(v: any): string | null {
  const x = s(v);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x)
    ? x
    : null;
}

function normalizeFighterId(v: any): string | null {
  // fighter_id is a UUID column in several matchmaker tables.
  // A Fightpaspoort/VA number like "29852" must NEVER be written or queried as fighter_id.
  return toUuidOrNull(v);
}

function missingColumnName(error: any): string | null {
  const msg = String(error?.message ?? error ?? "");
  const m = msg.match(/Could not find the ['"]([^'"]+)['"] column/i);
  return m?.[1] ?? null;
}

function isMissingTableError(error: any): boolean {
  const msg = String(error?.message ?? error ?? "").toLowerCase();

  return (
    msg.includes("could not find the table") ||
    msg.includes("schema cache") ||
    msg.includes("pgrst205") ||
    msg.includes("relation")
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
      const out = d.toString();
      stdout += out;
      process.stdout.write(logPrefix ? `[${logPrefix}] ${out}` : out);
    });

    proc.stderr.on("data", (d) => {
      const out = d.toString();
      stderr += out;
      process.stderr.write(logPrefix ? `[${logPrefix}] ${out}` : out);
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

async function assertCanAccessMatchmakerMatchmaking(opts: {
  matchmaking_id: string;
  userId: string;
  role: string | null | undefined;
}) {
  const role = String(opts.role ?? "").toLowerCase();
  const isAdmin = role.includes("superadmin") || role.includes("admin");

  if (isAdmin) return;

  const { data, error } = await supabase
    .from("matchmakings")
    .select("id, matchmaker_id, maker_user_id, uploaded_by, huidige_eigenaar_user_id")
    .eq("id", opts.matchmaking_id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Matchmaking niet gevonden");

  const ownerIds = [
    (data as any).matchmaker_id,
    (data as any).maker_user_id,
    (data as any).uploaded_by,
    (data as any).huidige_eigenaar_user_id,
  ]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);

  if (!ownerIds.includes(opts.userId)) {
    throw new Error("Geen toegang tot deze matchmaking");
  }
}


async function getFightPassportSessionForUser(matchmakerId: string) {
  const { data, error } = await supabase
    .from("fightpassport_sessions")
    .select("id, matchmaker_id, status, updated_at")
    .eq("matchmaker_id", matchmakerId)
    .maybeSingle();

  if (error) {
    const msg = String(error?.message ?? error);
    // Backwards compatible: als de tabel nog niet bestaat, laten we oude master-flow toe.
    if (msg.toLowerCase().includes("schema cache") || msg.toLowerCase().includes("could not find") || msg.toLowerCase().includes("relation")) {
      return null;
    }
    throw error;
  }

  return data;
}

async function getMatchmakingFightPassportOwner(matchmakingId: string, fallbackUserId: string) {
  const { data, error } = await supabase
    .from("matchmakings")
    .select("id, datum, matchmaker_id, maker_user_id, uploaded_by, huidige_eigenaar_user_id")
    .eq("id", matchmakingId)
    .maybeSingle();

  if (error) throw error;

  const fpMatchmakerId =
    toUuidOrNull((data as any)?.matchmaker_id) ??
    toUuidOrNull((data as any)?.maker_user_id) ??
    toUuidOrNull((data as any)?.uploaded_by) ??
    toUuidOrNull((data as any)?.huidige_eigenaar_user_id) ??
    toUuidOrNull(fallbackUserId);

  return {
    row: data,
    fpMatchmakerId,
  };
}

async function safeUpdateByIds(
  table: string,
  patch: Record<string, any>,
  ids: string[]
) {
  const clean = Array.from(new Set(ids.map((id) => s(id)).filter(Boolean)));
  if (!clean.length) return null;

  let body = { ...patch };

  for (let attempt = 0; attempt < 20; attempt++) {
    const { error } = await supabase.from(table).update(body).in("id", clean);

    if (!error) return null;

    const col = missingColumnName(error);

    if (col && Object.prototype.hasOwnProperty.call(body, col)) {
      delete body[col];
      continue;
    }

    return error;
  }

  return new Error(`${table}: update past niet op schema`);
}

async function deleteAttempt(builder: () => any) {
  const { error } = await builder();

  if (!error) return { ok: true, ignored: false, error: null as any };

  if (isMissingTableError(error) || missingColumnName(error)) {
    return { ok: false, ignored: true, error };
  }

  return { ok: false, ignored: false, error };
}

async function deleteOldMatchmakerRaw(matchmakingId: string, vaNummers: string[]) {
  if (!vaNummers.length) return;

  const attempts = [
    () =>
      supabase
        .from("matchmaker_fighters_raw")
        .delete()
        .eq("matchmaker_matchmaking_id", matchmakingId)
        .in("va_nummer", vaNummers),

    () =>
      supabase
        .from("matchmaker_fighters_raw")
        .delete()
        .eq("matchmaking_id", matchmakingId)
        .in("va_nummer", vaNummers),

  ];

  let deletedOrIgnored = false;
  let lastError: any = null;

  for (const attempt of attempts) {
    const res = await deleteAttempt(attempt);

    if (res.ok || res.ignored) {
      deletedOrIgnored = true;
      continue;
    }

    lastError = res.error;
  }

  if (!deletedOrIgnored && lastError) {
    console.warn(
      "[matchmaker/scrape/start] oude matchmaker_fighters_raw niet opgeruimd:",
      lastError.message ?? lastError
    );
  }
}

async function deleteOldMatchmakerDerivedData(opts: {
  matchmakingId: string;
  vaNummers: string[];
  aanmeldingIds: string[];
}) {
  const { matchmakingId, vaNummers, aanmeldingIds } = opts;

  const tables = [
    "matchmaker_uitslagen_raw",
    "matchmaker_fighter_context",
    "matchmaker_fighter_resultaten",
    "matchmaker_fighter_rules",
  ];

  for (const table of tables) {
    const attempts: Array<() => any> = [];

    if (vaNummers.length) {
      attempts.push(
        () =>
          supabase
            .from(table)
            .delete()
            .eq("matchmaking_id", matchmakingId)
            .in("va_nummer", vaNummers),

        () =>
          supabase
            .from(table)
            .delete()
            .eq("matchmaker_matchmaking_id", matchmakingId)
            .in("va_nummer", vaNummers),
      );
    }

    if (aanmeldingIds.length) {
      attempts.push(
        () =>
          supabase
            .from(table)
            .delete()
            .eq("matchmaking_id", matchmakingId)
            .in("inschrijving_id", aanmeldingIds),

        () =>
          supabase
            .from(table)
            .delete()
            .eq("matchmaker_matchmaking_id", matchmakingId)
            .in("inschrijving_id", aanmeldingIds)
      );
    }

    let hadRealError = false;

    for (const attempt of attempts) {
      const res = await deleteAttempt(attempt);

      if (res.ok) {
        hadRealError = false;
        break;
      }

      if (res.ignored) continue;

      hadRealError = true;

      console.warn(
        `[matchmaker/scrape/start] ${table} niet opgeruimd:`,
        res.error?.message ?? res.error
      );

      break;
    }

    if (!hadRealError) {
      dlog(`[matchmaker/scrape/start] ${table} cleanup klaar/overgeslagen`);
    }
  }
}

async function readRawByQuery(builder: () => any) {
  const { data, error } = await builder();

  if (error) return { rows: [] as any[], error };

  return { rows: data ?? [], error: null as any };
}

async function readMatchmakerFightersRaw(opts: {
  matchmakingId: string;
  scrapeRunId: string;
  vaNummers: string[];
}) {
  const { matchmakingId, scrapeRunId, vaNummers } = opts;

  if (!vaNummers.length) return [] as any[];

  const attempts = [
    () =>
      supabase
        .from("matchmaker_fighters_raw")
        .select("*")
        .eq("matchmaker_matchmaking_id", matchmakingId)
        .in("va_nummer", vaNummers)
        .order("updated_at", { ascending: false }),

    () =>
      supabase
        .from("matchmaker_fighters_raw")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .in("va_nummer", vaNummers)
        .order("updated_at", { ascending: false }),

    () =>
      supabase
        .from("matchmaker_fighters_raw")
        .select("*")
        .eq("scrape_run_id", scrapeRunId)
        .in("va_nummer", vaNummers)
        .order("updated_at", { ascending: false }),

    () =>
      supabase
        .from("matchmaker_fighters_raw")
        .select("*")
        .eq("controle_run_id", scrapeRunId)
        .in("va_nummer", vaNummers)
        .order("updated_at", { ascending: false }),
  ];

  let lastError: any = null;

  for (const attempt of attempts) {
    const { rows, error } = await readRawByQuery(attempt);

    if (error) {
      lastError = error;
      continue;
    }

    if (!rows.length) continue;

    const byVa = new Map<string, any>();

    for (const row of rows) {
      const va = toVaStrict(row?.va_nummer) ?? toVaStrict(row?.fighter_id);

      if (va && !byVa.has(va)) {
        byVa.set(va, row);
      }
    }

    if (byVa.size) return [...byVa.values()];
  }

  if (lastError) {
    console.warn(
      "[matchmaker/scrape/start] matchmaker_fighters_raw lezen waarschuwing:",
      lastError.message ?? lastError
    );
  }

  return [];
}


async function readMatchmakerFighterContexts(matchmakingId: string) {
  const attempts = [
    () =>
      supabase
        .from("matchmaker_fighter_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId),

    () =>
      supabase
        .from("matchmaker_fighter_context")
        .select("*")
        .eq("matchmaker_matchmaking_id", matchmakingId),
  ];

  let lastError: any = null;

  for (const attempt of attempts) {
    const { data, error } = await attempt();

    if (!error) return data ?? [];

    lastError = error;

    if (missingColumnName(error) || isMissingTableError(error)) {
      continue;
    }
  }

  if (lastError) throw lastError;

  return [] as any[];
}

async function safeDeleteAllMatchmakerFighterResults(matchmakingId: string) {
  const attempts = [
    () =>
      supabase
        .from("matchmaker_fighter_resultaten")
        .delete()
        .eq("matchmaking_id", matchmakingId),

    () =>
      supabase
        .from("matchmaker_fighter_resultaten")
        .delete()
        .eq("matchmaker_matchmaking_id", matchmakingId),

    () =>
      supabase
        .from("matchmaker_fighter_rules")
        .delete()
        .eq("matchmaking_id", matchmakingId),

    () =>
      supabase
        .from("matchmaker_fighter_rules")
        .delete()
        .eq("matchmaker_matchmaking_id", matchmakingId),
  ];

  let didSomething = false;
  let lastError: any = null;

  for (const attempt of attempts) {
    const res = await deleteAttempt(attempt);

    if (res.ok) {
      didSomething = true;
      continue;
    }

    if (res.ignored) continue;

    lastError = res.error;
  }

  if (!didSomething && lastError) {
    console.warn(
      "[matchmaker/scrape/start] oude fighterRules resultaten niet opgeruimd:",
      lastError.message ?? lastError
    );
  }
}

async function insertRowsWithSchemaFallback(table: string, rows: any[]) {
  if (!rows.length) return { inserted: 0, error: null as any };

  let body = rows.map((row) => ({ ...row }));

  for (let attempt = 0; attempt < 30; attempt++) {
    const { error } = await supabase.from(table).insert(body);

    if (!error) return { inserted: body.length, error: null as any };

    const col = missingColumnName(error);

    if (col) {
      body = body.map((row) => {
        const next = { ...row };
        delete next[col];
        return next;
      });
      continue;
    }

    return { inserted: 0, error };
  }

  return {
    inserted: 0,
    error: new Error(`${table}: insert past niet op schema`),
  };
}

async function saveMatchmakerFighterRuleRows(rows: any[]) {
  if (!rows.length) return { table: null as string | null, inserted: 0 };

  const preferredTables = ["matchmaker_fighter_resultaten", "matchmaker_fighter_rules"];
  let lastError: any = null;

  for (const table of preferredTables) {
    const { inserted, error } = await insertRowsWithSchemaFallback(table, rows);

    if (!error) return { table, inserted };

    lastError = error;

    if (isMissingTableError(error)) {
      continue;
    }

    throw error;
  }

  if (lastError) throw lastError;

  return { table: null as string | null, inserted: 0 };
}

async function runAndSaveMatchmakerFighterRules(opts: {
  matchmakingId: string;
  controleRunId: string;
}) {
  const contexts = await readMatchmakerFighterContexts(opts.matchmakingId);

  dlog("[matchmaker/scrape/start] fighterRules contexts", contexts.length);

  const rows: any[] = [];

  for (const ctx of contexts) {
    const hits = runMatchmakerFighterRules(
      {
        ...ctx,
        matchmaking_id: ctx.matchmaking_id ?? opts.matchmakingId,
        controle_run_id: ctx.controle_run_id ?? opts.controleRunId,
      },
      { includeOk: true }
    );

    for (const hit of hits) {
      rows.push({
        matchmaking_id: hit.matchmaking_id ?? opts.matchmakingId,
        controle_run_id: hit.controle_run_id ?? opts.controleRunId,
        inschrijving_id: hit.inschrijving_id ?? null,
        aanmelding_id: hit.aanmelding_id ?? null,
        fighter_id: normalizeFighterId(hit.fighter_id),
        va_nummer: hit.va_nummer ?? toVaStrict(hit.fighter_id) ?? null,
        regel_type: hit.regel_type,
        rule: hit.rule,
        rule_code: hit.rule_code,
        resultaat: hit.resultaat,
        severity: hit.severity,
        boodschap: hit.boodschap,
        bron: hit.bron,
        created_at: hit.created_at,
      });
    }
  }

  await safeDeleteAllMatchmakerFighterResults(opts.matchmakingId);

  const saveResult = await saveMatchmakerFighterRuleRows(rows);

  dlog("[matchmaker/scrape/start] fighterRules opgeslagen", {
    count: rows.length,
    table: saveResult.table,
  });

  return {
    contexts_count: contexts.length,
    rules_count: rows.length,
    table: saveResult.table,
  };
}

function extractVaFromAanmelding(row: any): string | null {
  return (
    toVaStrict(row?.va_nummer) ??
    toVaStrict(row?.va) ??
    toVaStrict(row?.va_nr) ??
    toVaStrict(row?.vanummer) ??
    toVaStrict(row?.fighter_id)
  );
}

function uniqCleanIds(values: any[]): string[] {
  return Array.from(new Set(values.map((x) => s(x)).filter(Boolean)));
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req);
    const body = await req.json().catch(() => ({}));

    const matchmaking_id = s(body?.matchmaking_id);

    if (!matchmaking_id) {
      return NextResponse.json(
        { ok: false, error: "matchmaking_id ontbreekt" },
        { status: 400 }
      );
    }

    await assertCanAccessMatchmakerMatchmaking({
      matchmaking_id,
      userId,
      role,
    });

    const workers = clampInt(body?.workers ?? 8, 8, 1, 20);
    const stagger_ms = clampInt(body?.stagger_ms ?? 250, 250, 0, 5000);
    const tab_attempts = clampInt(body?.tab_attempts ?? 8, 8, 1, 30);
    const soft_wait_ms = clampInt(body?.soft_wait_ms ?? 900, 900, 200, 5000);
    const between_attempts_ms = clampInt(body?.between_attempts_ms ?? 450, 450, 0, 5000);
    const fullfighter_timeout_ms = clampInt(body?.fullfighter_timeout_ms ?? 35000, 35000, 5000, 180000);
    const uitslagen_timeout_ms = clampInt(body?.uitslagen_timeout_ms ?? 90000, 90000, 5000, 240000);
    const uitslagen_tries = clampInt(body?.uitslagen_tries ?? 1, 1, 1, 5);

    const scrape_run_id =
      typeof body?.scrape_run_id === "string" && body.scrape_run_id.trim()
        ? body.scrape_run_id.trim()
        : crypto.randomUUID();

    const selectedIds = uniqCleanIds([
      ...(Array.isArray(body?.selected_ids) ? body.selected_ids : []),
      ...(Array.isArray(body?.aanmelding_ids) ? body.aanmelding_ids : []),
    ]);

    const uploadBatchId = s(
      body?.upload_batch_id ??
        body?.upload_id ??
        body?.aanmelding_upload_id ??
        body?.source_upload_id ??
        body?.batch_id
    );

    const mode = s(body?.mode).toLowerCase();
    const onlyOpen = body?.only_open !== false;

    let aanmeldingenQuery = supabase
      .from("aanmeldingen")
      .select("*")
      .eq("matchmaking_id", matchmaking_id);

    if (selectedIds.length) {
      aanmeldingenQuery = aanmeldingenQuery.in("id", selectedIds);
    } else if (uploadBatchId) {
      aanmeldingenQuery = aanmeldingenQuery.eq("upload_batch_id", uploadBatchId);
    }

    if (onlyOpen) {
      aanmeldingenQuery = aanmeldingenQuery.in("status", ["nieuw", "rauw", "raw", "open", "aangemeld"]);
    }

    const { data: aanmeldingen, error: aanmeldingenError } = await aanmeldingenQuery;

    if (aanmeldingenError) throw aanmeldingenError;

    const rows = aanmeldingen ?? [];

    if (!rows.length) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: "Geen nieuwe aanmeldingen gevonden om te controleren.",
        matchmaking_id,
        scrape_run_id,
        mode,
        upload_batch_id: uploadBatchId || null,
      });
    }

    const va_nummers = Array.from(
      new Set(
        rows
          .map((row: any) => extractVaFromAanmelding(row))
          .filter(Boolean) as string[]
      )
    );

    if (!va_nummers.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "Geen VA-nummers gevonden in aanmeldingen",
          matchmaking_id,
          scrape_run_id,
        },
        { status: 400 }
      );
    }

    const aanmeldingIds = rows.map((r: any) => s(r.id)).filter(Boolean);

    await safeUpdateByIds(
      "aanmeldingen",
      {
        status: "controle_bezig",
        scrape_started_at: new Date().toISOString(),
        scrape_failed_at: null,
        scrape_error: null,
        scrape_run_id,
        updated_at: new Date().toISOString(),
      },
      aanmeldingIds
    );

    await deleteOldMatchmakerRaw(matchmaking_id, va_nummers);

    await deleteOldMatchmakerDerivedData({
      matchmakingId: matchmaking_id,
      vaNummers: va_nummers,
      aanmeldingIds,
    });

    console.log("[matchmaker/scrape/start] start", {
      matchmaking_id,
      scrape_run_id,
      aanmeldingen_count: rows.length,
      va_count: va_nummers.length,
      selected_count: selectedIds.length,
      upload_batch_id: uploadBatchId || null,
      target_table: "matchmaker_fighters_raw",
    });

    const fpBundleMMPath = resolveScriptPath(
      "scrapers",
      "fp_bundle_mm",
      "scraper_fp_bundle_mm.js"
    );

    dlog("[matchmaker/scrape/start] fpBundleMMPath =", fpBundleMMPath);

    const { row: mmOwnerRow, fpMatchmakerId } = await getMatchmakingFightPassportOwner(
      matchmaking_id,
      userId
    );

    if (!fpMatchmakerId) {
      return NextResponse.json(
        {
          ok: false,
          needs_fightpassport_connect: true,
          error: "Geen matchmaker gekoppeld aan deze matchmaking. Daardoor kan geen FightPassport matchmaker-sessie worden gekozen.",
        },
        { status: 409 }
      );
    }

    const fpSession = await getFightPassportSessionForUser(fpMatchmakerId);

    if (!fpSession) {
      return NextResponse.json(
        {
          ok: false,
          needs_fightpassport_connect: true,
          fp_matchmaker_id: fpMatchmakerId,
          error: "Koppel eerst de FightPassport sessie van de matchmaker die bij deze matchmaking hoort.",
        },
        { status: 409 }
      );
    }

    const scrapeResult = await runNodeScript(
      fpBundleMMPath,
      [matchmaking_id, scrape_run_id, ...va_nummers],
      {
        // Matchmaker scraper gebruikt ALTIJD de sessie van de matchmaker die aan deze matchmaking hangt.
        // Dus niet beslissen op role, want een superadmin kan ook matchmaker zijn.
        FP_MATCHMAKER_ID: fpMatchmakerId,
        FP_SESSION_MODE: "matchmaker",
        WORKERS: String(workers),
        STAGGER_MS: String(stagger_ms),
        TAB_ATTEMPTS: String(tab_attempts),
        SOFT_WAIT_MS: String(soft_wait_ms),
        BETWEEN_ATTEMPTS_MS: String(between_attempts_ms),
        FULLFIGHTER_TIMEOUT_MS: String(fullfighter_timeout_ms),
        UITSLAGEN_TIMEOUT_MS: String(uitslagen_timeout_ms),
        UITSLAGEN_TRIES: String(uitslagen_tries),

        MATCHMAKER_MATCHMAKING_ID: matchmaking_id,
        MATCHMAKING_ID: matchmaking_id,
        CONTROLE_RUN_ID: scrape_run_id,
        SCRAPE_RUN_ID: scrape_run_id,

        RAW_TARGET_TABLE: "matchmaker_fighters_raw",
        TARGET_TABLE: "matchmaker_fighters_raw",
        MATCHMAKER_UITSLAGEN_TABLE: "matchmaker_uitslagen_raw",
      },
      "fp_bundle_mm"
    );

    const rawRows = await readMatchmakerFightersRaw({
      matchmakingId: matchmaking_id,
      scrapeRunId: scrape_run_id,
      vaNummers: va_nummers,
    });

    const mmRow = mmOwnerRow;

    const safeAanmeldingen = rows.map((row: any) => ({
      ...row,
      fighter_id: normalizeFighterId(row?.fighter_id),
      va_nummer: extractVaFromAanmelding(row),
    }));

    const safeRawRows = rawRows.map((row: any) => ({
      ...row,
      fighter_id: normalizeFighterId(row?.fighter_id),
      va_nummer: toVaStrict(row?.va_nummer) ?? toVaStrict(row?.fighter_id),
    }));

    const contextResult = await runSingleFighterContextPipeline({
      supabase,
      matchmakingId: matchmaking_id,
      controleRunId: scrape_run_id,
      aanmeldingen: safeAanmeldingen,
      rawRows: safeRawRows,
      eventDate: (mmRow as any)?.datum ?? null,
      writeRules: false,
    });

    const fighterRulesResult = await runAndSaveMatchmakerFighterRules({
      matchmakingId: matchmaking_id,
      controleRunId: scrape_run_id,
    });

    const foundVas = new Set(
      rawRows
        .map((r: any) => toVaStrict(r?.va_nummer) ?? toVaStrict(r?.fighter_id))
        .filter(Boolean) as string[]
    );

    const foundIds: string[] = [];
    const missingIds: string[] = [];

    for (const row of rows as any[]) {
      const va = extractVaFromAanmelding(row);

      if (va && foundVas.has(va)) {
        foundIds.push(String(row.id));
      } else {
        missingIds.push(String(row.id));
      }
    }

    await safeUpdateByIds(
      "aanmeldingen",
      {
        status: "gescrapt",
        scraped_at: new Date().toISOString(),
        scrape_failed_at: null,
        scrape_error: null,
        scrape_run_id,
        updated_at: new Date().toISOString(),
      },
      foundIds
    );

    await safeUpdateByIds(
      "aanmeldingen",
      {
        status: "scrape_mislukt",
        scrape_failed_at: new Date().toISOString(),
        scrape_error: "Geen Fightpaspoort-resultaat gevonden voor dit VA-nummer.",
        scrape_run_id,
        updated_at: new Date().toISOString(),
      },
      missingIds
    );

    if (contextResult.error) {
      console.warn(
        "[matchmaker/scrape/start] context/rules waarschuwing:",
        contextResult.error.message ?? contextResult.error
      );
    }

    console.log("[matchmaker/scrape/start] klaar", {
      ms: scrapeResult.ms,
      va_count: va_nummers.length,
      matchmaker_fighters_raw_count: rawRows.length,
      context_count: contextResult.count,
      rules_count: fighterRulesResult.rules_count,
      rules_table: fighterRulesResult.table,
      gescrapt: foundIds.length,
      scrape_mislukt: missingIds.length,
    });

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      scrape_run_id,
      va_count: va_nummers.length,
      matchmaker_fighters_raw_count: rawRows.length,
      context_count: contextResult.count,
      rules_count: fighterRulesResult.rules_count,
      rules_table: fighterRulesResult.table,
      gescrapt: foundIds.length,
      scrape_mislukt: missingIds.length,
      workers,
      stagger_ms,
      tab_attempts,
      soft_wait_ms,
      between_attempts_ms,
      fullfighter_timeout_ms,
      uitslagen_timeout_ms,
      uitslagen_tries,
      warning: contextResult.error
        ? String(contextResult.error?.message ?? contextResult.error)
        : null,
    });
  } catch (err: any) {
    if (err instanceof Response) {
      return err;
    }

    console.error("❌ matchmaker scrape/start fout:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Onbekende fout",
      },
      { status: 500 }
    );
  }
}
