import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import { supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUEUE_TABLE = "fightpassport_email_queue";

function normalizeVa(value: unknown) {
  const valueOnly = String(value ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(valueOnly) ? valueOnly : null;
}

async function authorize(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const { data, error } = await supabaseAdmin.schema("nvb_platform").from("service_api_tokens")
    .select("id,permissions").eq("token_hash", hash).eq("active", true).maybeSingle();
  if (error) { console.error("[fightpassport-correctie] service-token databasefout", error.message); throw new Error("Service-token kon niet worden gecontroleerd."); }
  if (!data) return null;
  if (!Array.isArray(data.permissions) || !data.permissions.includes("fightpassport:writer")) return null;
  await supabaseAdmin.schema("nvb_platform").from("service_api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return data;
}

function queueWorker() {
  const root = process.cwd();
  const candidates = [
    path.join(root, "ControlEngine", "scrapers", "fp_email", "scraper_fp_email_queue.js"),
    path.join(root, "scrapers", "fp_email", "scraper_fp_email_queue.js"),
  ];
  const file = candidates.find((candidate) => fs.existsSync(candidate));
  if (!file) throw new Error("FightPassport e-mail queue-worker niet gevonden.");
  return file;
}

function startQueueWorker() {
  const workerPath = queueWorker();
  const proc = spawn("node", [workerPath], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    cwd: path.dirname(workerPath),
    windowsHide: true,
    env: {
      ...process.env,
      PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH ?? "",
      HEADLESS: process.env.HEADLESS ?? "false",
      PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "false",
      TAB_ATTEMPTS: process.env.TAB_ATTEMPTS ?? "5",
      SOFT_WAIT_MS: process.env.SOFT_WAIT_MS ?? "200",
      BETWEEN_ATTEMPTS_MS: process.env.BETWEEN_ATTEMPTS_MS ?? "350",
      FP_EMAIL_QUEUE_LANES: process.env.FP_EMAIL_QUEUE_LANES ?? "3",
    },
  });
  proc.stdout?.on("data", (data) => process.stdout.write(`[fp-email-queue] ${data.toString()}`));
  proc.stderr?.on("data", (data) => process.stderr.write(`[fp-email-queue] ${data.toString()}`));
  proc.on("error", (error) => console.error("[fp-email-queue] spawn fout:", error));
  return proc.pid ?? null;
}

export async function POST(req: Request) {
  try {
    if (!await authorize(req)) return NextResponse.json({ ok: false, error: "Geen toegang." }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const type = String(body?.type || "").trim().toLowerCase();
    const va = normalizeVa(body?.va);
    if (!va) return NextResponse.json({ ok: false, error: "Geldig VA-nummer ontbreekt." }, { status: 400 });
    if (type !== "email") return NextResponse.json({ ok: false, error: "Onbekend correctietype." }, { status: 400 });

    console.log("[fightpassport-correctie] ontvangen", { type, va });

    const { data: active, error: activeError } = await supabaseAdmin
      .from(QUEUE_TABLE).select("id,status").eq("va_nummer", va)
      .in("status", ["pending", "processing"]).limit(1).maybeSingle();
    if (activeError) throw activeError;

    let item = active;
    let alreadyQueued = Boolean(active?.id);
    if (!item) {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from(QUEUE_TABLE).insert({ va_nummer: va, status: "pending" })
        .select("id,status").single();
      if (insertError && String(insertError.code || "") !== "23505") throw insertError;
      if (insertError) {
        const { data: existing, error: existingError } = await supabaseAdmin
          .from(QUEUE_TABLE).select("id,status").eq("va_nummer", va)
          .in("status", ["pending", "processing"]).limit(1).maybeSingle();
        if (existingError) throw existingError;
        item = existing;
        alreadyQueued = true;
      } else item = inserted;
    }

    const workerPid = startQueueWorker();
    return NextResponse.json({
      ok: true, queued: true, already_queued: alreadyQueued, type, va,
      queue_id: item?.id ?? null, queue_worker_pid: workerPid,
    }, { status: 202 });
  } catch (e: any) {
    console.error("[fightpassport-correctie] fout", e);
    return NextResponse.json({ ok: false, error: e?.message || "FightPassport-correctie kon niet in de wachtrij worden gezet." }, { status: 500 });
  }
}
