import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/_utils/authz";
import { supabaseAdmin } from "@/lib/api/requireRole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isCronAllowed(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authorization = req.headers.get("authorization") || "";
  return authorization === `Bearer ${secret}` || req.headers.get("x-cron-secret") === secret;
}

async function requireAdminOrCron(req: Request) {
  if (isCronAllowed(req)) return;
  await requireAdmin(req);
}

function isProcessAlive(pid: number) {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminOrCron(req);

    const { data: run, error } = await supabaseAdmin
      .from("fightpassport_sync_runs")
      .select("id,status,meta,processed_count")
      .eq("run_type", "full")
      .eq("status", "running")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!run) {
      return NextResponse.json({ ok: true, stopped: false, message: "Er draait geen Total AutoCheck." });
    }

    const pid = Number((run.meta as any)?.pid);
    if (!isProcessAlive(pid)) {
      await supabaseAdmin
        .from("fightpassport_sync_runs")
        .update({ status: "paused", error_message: null })
        .eq("id", run.id);
      return NextResponse.json({
        ok: true,
        stopped: false,
        marked_paused: true,
        run_id: run.id,
        message: "Het scraperproces draaide niet meer; de ronde is als gepauzeerd gemarkeerd.",
      });
    }

    // De scraper vangt SIGTERM zelf af: hij deelt geen nieuwe VA's meer uit,
    // laat de reeds lopende workers afronden en zet daarna de run op 'paused'.
    process.kill(pid, "SIGTERM");

    return NextResponse.json({
      ok: true,
      stopped: true,
      graceful: true,
      run_id: run.id,
      pid,
      message: "Pauzesignaal verstuurd. Lopende VA's worden nog netjes afgerond.",
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error?.message ?? "server_error" }, { status: 500 });
  }
}
