import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import { supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUEUE_TABLE = "fightpassport_refresh_queue";

function normalizeVa(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

async function authorize(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const { data, error } = await supabaseAdmin.schema("nvb_platform").from("service_api_tokens")
    .select("id,permissions").eq("token_hash", hash).eq("active", true).maybeSingle();
  if (error) throw new Error("Service-token kon niet worden gecontroleerd.");
  if (!data || !Array.isArray(data.permissions)) return null;
  // Bestaande writer-token blijft bruikbaar tijdens de overgang; nieuwe tokens kunnen
  // beperkt worden tot alleen refresh.
  if (!data.permissions.includes("fightpassport:refresh") && !data.permissions.includes("fightpassport:writer")) return null;
  await supabaseAdmin.schema("nvb_platform").from("service_api_tokens")
    .update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return data;
}

function workerPath() {
  const root = process.cwd();
  const candidates = [
    path.join(root, "ControlEngine", "scrapers", "fp_total", "scraper_fp_refresh_queue.js"),
    path.join(root, "scrapers", "fp_total", "scraper_fp_refresh_queue.js"),
  ];
  const file = candidates.find((candidate) => fs.existsSync(candidate));
  if (!file) throw new Error("FightPassport refresh-worker niet gevonden.");
  return file;
}

function startWorker(req: Request) {
  const file = workerPath();
  const proc = spawn(process.execPath, [file], {
    stdio: ["ignore", "pipe", "pipe"], shell: false, cwd: path.dirname(file), windowsHide: true,
    env: {
      ...process.env,
      FP_MATCHMAKER_ID: "",
      FP_SESSION_MODE: "master",
      HEADLESS: process.env.HEADLESS ?? "false",
      PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "false",
      FIGHTSUPPORT_INTERNAL_URL: process.env.FIGHTSUPPORT_INTERNAL_URL || process.env.INTERNAL_APP_URL || new URL(req.url).origin,
      TERMINATOR_INTERNAL_TOKEN: process.env.TERMINATOR_INTERNAL_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    },
  });
  proc.stdout?.on("data", d => process.stdout.write("[fp-refresh-api] " + d.toString()));
  proc.stderr?.on("data", d => process.stderr.write("[fp-refresh-api] " + d.toString()));
  proc.on("error", e => console.error("[fp-refresh-api] spawn fout:", e));
  return proc.pid ?? null;
}

export async function POST(req: Request) {
  try {
    if (!await authorize(req)) return NextResponse.json({ ok: false, error: "Geen toegang." }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const va = normalizeVa(body?.va);
    if (!va) return NextResponse.json({ ok: false, error: "Geldig VA-nummer ontbreekt." }, { status: 400 });

    const { data: active, error: activeError } = await supabaseAdmin.from(QUEUE_TABLE)
      .select("id,status").eq("va_nummer", va).in("status", ["pending", "processing"]).limit(1).maybeSingle();
    if (activeError) throw activeError;

    let item = active;
    let alreadyQueued = Boolean(active?.id);
    if (!item) {
      const { data: inserted, error } = await supabaseAdmin.from(QUEUE_TABLE)
        .insert({ va_nummer: va, status: "pending", requested_role: "nvb_platform" })
        .select("id,status").single();
      if (error && String(error.code || "") !== "23505") throw error;
      if (error) {
        const { data: existing, error: existingError } = await supabaseAdmin.from(QUEUE_TABLE)
          .select("id,status").eq("va_nummer", va).in("status", ["pending", "processing"]).limit(1).maybeSingle();
        if (existingError) throw existingError;
        item = existing; alreadyQueued = true;
      } else item = inserted;
    }

    const pid = startWorker(req);
    return NextResponse.json({ ok: true, queued: true, already_queued: alreadyQueued, va, queue_id: item?.id ?? null, refresh_worker_pid: pid }, { status: 202 });
  } catch (e: any) {
    console.error("[fightpassport-refresh] fout", e);
    return NextResponse.json({ ok: false, error: e?.message || "FightPassport refresh kon niet worden gestart." }, { status: 500 });
  }
}
