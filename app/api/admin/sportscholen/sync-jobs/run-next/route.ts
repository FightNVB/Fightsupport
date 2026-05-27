import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { requireAdmin, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Job = {
  id: string;
  sportschool_id: string;
  sportschool_naam: string | null;
  payload?: Record<string, any> | null;
};

function isCronAllowed(req: Request) {
  const secret = process.env.SPORTSCHOOL_SYNC_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const h = req.headers.get("authorization") || "";
  return h === `Bearer ${secret}` || req.headers.get("x-cron-secret") === secret;
}

async function requireAdminOrCron(req: Request) {
  if (isCronAllowed(req)) return;
  await requireAdmin(req);
}

function getBaseUrl(req: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

function scraperPath() {
  // Zet in .env bijvoorbeeld: SPORTSCHOOL_TEAM_SCRAPER_PATH=./scrapers/scraper_team.js
  return process.env.SPORTSCHOOL_TEAM_SCRAPER_PATH || process.env.SCRAPER_TEAM_PATH || path.join(process.cwd(), "scraper_team.js");
}

function runScraper(job: Job, req: Request) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const file = scraperPath();
    const args = [
      file,
      "--sportschool-id", String(job.sportschool_id),
      "--sportschool-naam", String(job.sportschool_naam ?? job.payload?.sportschool_naam ?? ""),
      "--job-id", String(job.id),
    ];

    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SPORTSCHOOL_ID: String(job.sportschool_id),
        SPORTSCHOOL_NAAM: String(job.sportschool_naam ?? job.payload?.sportschool_naam ?? ""),
        SPORTSCHOOL_SYNC_JOB_ID: String(job.id),
        SPORTSCHOOL_UPSERT_URL: `${getBaseUrl(req)}/api/admin/sportscholen/fighters/upsert`,
        SPORTSCHOOL_SYNC_SECRET: process.env.SPORTSCHOOL_SYNC_SECRET || process.env.CRON_SECRET || "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout: stdout.slice(-8000), stderr: stderr.slice(-8000) }));
  });
}

export async function POST(req: Request) {
  await requireAdminOrCron(req);

  try {
    const { data: job, error: jobErr } = await supabaseAdmin
      .from("sportschool_sync_jobs")
      .select("id, sportschool_id, sportschool_naam, payload")
      .eq("status", "nieuw")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (jobErr) throw jobErr;
    if (!job) return NextResponse.json({ ok: true, message: "Geen nieuwe sportschool sync jobs." });

    const now = new Date().toISOString();
    await supabaseAdmin
      .from("sportschool_sync_jobs")
      .update({ status: "bezig", started_at: now, updated_at: now, error: null })
      .eq("id", (job as Job).id);

    const result = await runScraper(job as Job, req);
    const finishedAt = new Date().toISOString();

    if (result.code === 0) {
      await supabaseAdmin
        .from("sportschool_sync_jobs")
        .update({ status: "gereed", finished_at: finishedAt, updated_at: finishedAt, log: { stdout: result.stdout, stderr: result.stderr } })
        .eq("id", (job as Job).id);

      await supabaseAdmin
        .from("sportscholen")
        .update({ last_team_sync_at: finishedAt, team_sync_status: "gereed", team_sync_error: null })
        .eq("sportschool_id", (job as Job).sportschool_id);

      return NextResponse.json({ ok: true, job_id: (job as Job).id, status: "gereed" });
    }

    const errText = result.stderr || result.stdout || `scraper_team.js stopte met code ${result.code}`;
    await supabaseAdmin
      .from("sportschool_sync_jobs")
      .update({ status: "mislukt", finished_at: finishedAt, updated_at: finishedAt, error: errText.slice(0, 3000), log: { stdout: result.stdout, stderr: result.stderr, code: result.code } })
      .eq("id", (job as Job).id);

    await supabaseAdmin
      .from("sportscholen")
      .update({ team_sync_status: "mislukt", team_sync_error: errText.slice(0, 1000) })
      .eq("sportschool_id", (job as Job).sportschool_id);

    return NextResponse.json({ ok: false, job_id: (job as Job).id, error: errText }, { status: 500 });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
