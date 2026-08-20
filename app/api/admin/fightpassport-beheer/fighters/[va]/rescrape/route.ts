import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUEUE_TABLE = "fightpassport_refresh_queue";
const QUEUE_WORKER_FILE = "scraper_fp_refresh_queue.js";

function resolveScriptPath(...parts: string[]) {
  const root = process.cwd();
  const candidates = [
    path.join(root, ...parts),
    path.join(root, "ControlEngine", ...parts),
    path.join(root, "ControlEngine", "ControlEngine", ...parts),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`Robot niet gevonden:\n- ${candidates.join("\n- ")}`);
}

function isRoleAllowed(role: string | null | undefined) {
  return role === "admin" || role === "superadmin" || role === "matchmaker";
}

function normalizeVa(raw: unknown) {
  const value = String(raw ?? "").trim().replace(/\D/g, "");
  if (!/^\d{3,6}$/.test(value)) return null;
  return value;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service-configuratie ontbreekt.");

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

async function latestQueueItem(
  admin: ReturnType<typeof adminClient>,
  va: string,
) {
  const { data, error } = await admin
    .from(QUEUE_TABLE)
    .select(
      "id,va_nummer,status,requested_role,matchmaking_id,aanmelding_id,sync_run_id,created_at,claimed_at,finished_at,error_message",
    )
    .eq("va_nummer", va)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

function startRefreshWorker(req: Request) {
  const workerPath = resolveScriptPath(
    "scrapers",
    "fp_total",
    QUEUE_WORKER_FILE,
  );

  // Ieder POST-verzoek mag dit proberen.
  // De worker zelf gebruikt een atomair lockbestand (wx), waardoor er
  // maximaal één extra refresh-worker tegelijk actief blijft.
  const proc = spawn(process.execPath, [workerPath], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    cwd: path.dirname(workerPath),
    windowsHide: true,
    detached: false,
    env: {
      ...process.env,
      FP_MATCHMAKER_ID: "",
      FP_SESSION_MODE: "master",
      HEADLESS: process.env.HEADLESS ?? "false",
      PUPPETEER_HEADLESS:
        process.env.PUPPETEER_HEADLESS ??
        process.env.HEADLESS ??
        "false",
      FIGHTSUPPORT_INTERNAL_URL:
        process.env.FIGHTSUPPORT_INTERNAL_URL ||
        process.env.INTERNAL_APP_URL ||
        new URL(req.url).origin,
      TERMINATOR_INTERNAL_TOKEN:
        process.env.TERMINATOR_INTERNAL_TOKEN ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        "",
    },
  });

  proc.stdout?.on("data", (data) => {
    process.stdout.write(`[fp-refresh-worker] ${data.toString()}`);
  });
  proc.stderr?.on("data", (data) => {
    process.stderr.write(`[fp-refresh-worker] ${data.toString()}`);
  });
  proc.on("error", (error) => {
    console.error("[fp-refresh-worker] spawn fout:", error);
  });
  proc.on("close", (code) => {
    console.log(`[fp-refresh-worker] launcher klaar met exit code ${code}`);
  });

  return proc.pid ?? null;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ va: string }> },
) {
  try {
    const auth: any = await requireUserWithRole(req);
    if (!isRoleAllowed(auth?.role)) {
      return NextResponse.json({ error: "Geen toegang." }, { status: 403 });
    }

    const { va: rawVa } = await context.params;
    const va = normalizeVa(rawVa);
    if (!va) {
      return NextResponse.json(
        { error: "Ongeldig VA-nummer." },
        { status: 400 },
      );
    }

    const item = await latestQueueItem(adminClient(), va);

    return NextResponse.json({
      ok: true,
      va_nummer: va,
      item,
    });
  } catch (err: any) {
    console.error("[fighter-rescrape] status mislukt:", err);
    return NextResponse.json(
      { error: err?.message ?? "Update-status laden mislukt." },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ va: string }> },
) {
  try {
    const auth: any = await requireUserWithRole(req);
    const role = auth?.role as string | undefined;

    if (!isRoleAllowed(role)) {
      return NextResponse.json({ error: "Geen toegang." }, { status: 403 });
    }

    const { va: rawVa } = await context.params;
    const va = normalizeVa(rawVa);
    if (!va) {
      return NextResponse.json(
        { error: "Ongeldig VA-nummer." },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const matchmakingId =
      String(body?.matchmaking_id ?? "").trim() || null;
    const aanmeldingId =
      String(body?.aanmelding_id ?? "").trim() || null;
    const requestedBy =
      String(
        auth?.user?.id ??
          auth?.userId ??
          auth?.id ??
          "",
      ).trim() || null;

    const admin = adminClient();

    const { data: activeExisting, error: activeError } = await admin
      .from(QUEUE_TABLE)
      .select("id,va_nummer,status,created_at")
      .eq("va_nummer", va)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeError) throw activeError;

    let queueItem = activeExisting;
    let alreadyQueued = Boolean(activeExisting?.id);

    if (!queueItem) {
      const { data: inserted, error: insertError } = await admin
        .from(QUEUE_TABLE)
        .insert({
          va_nummer: va,
          status: "pending",
          requested_by: requestedBy,
          requested_role: role ?? null,
          matchmaking_id: matchmakingId,
          aanmelding_id: aanmeldingId,
        })
        .select("id,va_nummer,status,created_at")
        .single();

      if (insertError) {
        // Gelijktijdige klik op dezelfde VA: partial unique index wint.
        if (String(insertError.code || "") !== "23505") throw insertError;
        queueItem = await latestQueueItem(admin, va);
        alreadyQueued = true;
      } else {
        queueItem = inserted;
      }
    }

    // Altijd een LOSSE extra update-worker proberen te starten,
    // ook als de normale Total AutoCheck al uren draait.
    // De worker-lock voorkomt meerdere extra workers.
    const workerPid = startRefreshWorker(req);

    return NextResponse.json(
      {
        ok: true,
        queued: true,
        already_queued: alreadyQueued,
        va_nummer: va,
        queue_id: queueItem?.id ?? null,
        refresh_worker_pid: workerPid,
        message: alreadyQueued
          ? `VA ${va} stond al in de FightPassport updatewachtrij.`
          : `VA ${va} is toegevoegd aan de FightPassport updatewachtrij.`,
      },
      { status: 202 },
    );
  } catch (err: any) {
    console.error("[fighter-rescrape] aanvragen mislukt:", err);
    return NextResponse.json(
      { error: err?.message ?? "FightPassport update aanvragen mislukt." },
      { status: 500 },
    );
  }
}
