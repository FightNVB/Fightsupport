import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { requireRole, supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const STATUSES = new Set(["pending_review", "confirmed_deleted", "retry_requested", "resolved"]);
const ACTIONS = new Set(["confirm_deleted", "retry", "restore", "resolve"]);

function resolveRetryWorkerPath() {
  const candidates = [
    path.join(process.cwd(), "ControlEngine", "scrapers", "fp_total", "retry_queue_worker.js"),
    path.join(process.cwd(), "scrapers", "fp_total", "retry_queue_worker.js"),
    path.join(process.cwd(), "ControlEngine", "ControlEngine", "scrapers", "fp_total", "retry_queue_worker.js"),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`Retry-worker niet gevonden:\n- ${candidates.join("\n- ")}`);
  return found;
}

function ensureRetryWorkerStarted(workerPath: string) {
  const child = spawn(process.execPath, [workerPath], {
    cwd: path.dirname(workerPath),
    shell: false,
    windowsHide: true,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
  if (!child.pid) throw new Error("Retry-worker kon niet worden gestart.");

  child.stdout?.on("data", (chunk) => {
    const text = String(chunk).trimEnd();
    if (text) console.log(`[fightpassport-retry-worker] ${text}`);
  });
  child.stderr?.on("data", (chunk) => {
    const text = String(chunk).trimEnd();
    if (text) console.error(`[fightpassport-retry-worker][stderr] ${text}`);
  });
  child.on("error", (error) => console.error("[fightpassport-retry-worker] startfout", error));
  child.on("close", (code, signal) => console.log("[fightpassport-retry-worker] afgerond", { code, signal }));

  return child.pid;
}

export async function GET(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const url = new URL(req.url);
    const status = (url.searchParams.get("status") || "all").trim();
    const q = (url.searchParams.get("q") || "").trim().replace(/[%(),]/g, "");

    let query = supabaseAdmin.from("fightpassport_missing_va").select("*").order("last_seen_at", { ascending: false }).limit(1000);
    if (status !== "all" && STATUSES.has(status)) query = query.eq("status", status);
    if (q) query = query.ilike("va_number", `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    const { data: allStatuses, error: statsError } = await supabaseAdmin.from("fightpassport_missing_va").select("status");
    if (statsError) throw statsError;
    const stats = (allStatuses ?? []).reduce<Record<string, number>>((acc, row: any) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      items: data ?? [],
      stats: {
        pending_review: stats.pending_review || 0,
        retry_requested: stats.retry_requested || 0,
        confirmed_deleted: stats.confirmed_deleted || 0,
        resolved: stats.resolved || 0,
        attention: (stats.pending_review || 0) + (stats.retry_requested || 0),
      },
    });
  } catch (err: any) {
    if (err instanceof NextResponse) return err;
    console.error("fightpassport missing-va GET", err);
    return NextResponse.json({ error: err?.message || "Ontbrekende VA-nummers konden niet worden geladen." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireRole(req, ["admin", "superadmin"]);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").trim();
    const note = body.review_note == null ? undefined : String(body.review_note).trim().slice(0, 2000);
    const requestedVaNumbers = Array.isArray(body.va_numbers)
      ? body.va_numbers
      : [body.va_number];
    const vaNumbers: string[] = Array.from(
      new Set<string>(
        requestedVaNumbers
          .map((value: unknown) => String(value ?? "").trim())
          .filter((value: string) => value.length > 0)
      )
    );

    if (!vaNumbers.length || vaNumbers.some((vaNumber) => !/^\d{1,8}$/.test(vaNumber))) {
      return NextResponse.json({ error: "Eén of meer VA-nummers zijn ongeldig." }, { status: 400 });
    }
    if (vaNumbers.length > 1000) {
      return NextResponse.json({ error: "Maximaal 1000 VA-nummers per bulkactie." }, { status: 400 });
    }
    if (!ACTIONS.has(action)) return NextResponse.json({ error: "Onbekende actie." }, { status: 400 });

    const now = new Date().toISOString();
    const patch: Record<string, any> = { updated_at: now };

    if (action === "confirm_deleted") {
      Object.assign(patch, { status: "confirmed_deleted", confirmed_at: now, confirmed_by: auth.userId, resolved_at: null });
    } else if (action === "retry") {
      Object.assign(patch, { status: "retry_requested", confirmed_at: null, confirmed_by: null, resolved_at: null });
    } else if (action === "restore") {
      Object.assign(patch, { status: "pending_review", confirmed_at: null, confirmed_by: null, resolved_at: null });
    } else {
      Object.assign(patch, { status: "resolved", resolved_at: now, confirmed_at: null, confirmed_by: null });
    }
    if (note !== undefined) patch.review_note = note || null;

    const { data, error } = await supabaseAdmin
      .from("fightpassport_missing_va")
      .update(patch)
      .in("va_number", vaNumbers)
      .select("*");
    if (error) throw error;

    const updated = data ?? [];
    if (updated.length !== vaNumbers.length) {
      return NextResponse.json({
        error: `${updated.length} van ${vaNumbers.length} VA-nummers zijn bijgewerkt. Niet alle nummers zijn gevonden.`,
        updated: updated.length,
      }, { status: 409 });
    }

    const labels: Record<string, string> = {
      confirm_deleted: "als verwijderd gemarkeerd",
      retry: "aan de retry-wachtrij toegevoegd",
      restore: "teruggezet naar beoordeling",
      resolve: "als opgelost gemarkeerd",
    };

    return NextResponse.json({
      items: updated,
      item: updated.length === 1 ? updated[0] : undefined,
      queued: action === "retry",
      updated: updated.length,
      message: `${updated.length} VA-nummer${updated.length === 1 ? "" : "s"} ${labels[action]}.`,
    }, { status: action === "retry" ? 202 : 200 });
  } catch (err: any) {
    if (err instanceof NextResponse) return err;
    console.error("fightpassport missing-va PATCH", err);
    return NextResponse.json({ error: err?.message || "Actie kon niet worden uitgevoerd." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(req, ["admin", "superadmin"]);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").trim();

    if (action !== "start_retry_run") {
      return NextResponse.json({ error: "Onbekende actie." }, { status: 400 });
    }

    const { count, error: countError } = await supabaseAdmin
      .from("fightpassport_missing_va")
      .select("id", { count: "exact", head: true })
      .eq("status", "retry_requested");

    if (countError) throw countError;
    if (!count) {
      return NextResponse.json({
        started: false,
        queued: 0,
        message: "De retry-wachtrij is leeg.",
      });
    }

    const workerPath = resolveRetryWorkerPath();
    const pid = ensureRetryWorkerStarted(workerPath);

    return NextResponse.json({
      started: true,
      queued: count,
      workers: 8,
      worker_pid: pid,
      message: `Retry-run gestart voor ${count} VA-nummers met 8 workers.`,
    }, { status: 202 });
  } catch (err: any) {
    if (err instanceof NextResponse) return err;
    console.error("fightpassport missing-va POST", err);
    return NextResponse.json({
      error: err?.message || "Retry-run kon niet worden gestart.",
    }, { status: 500 });
  }
}
