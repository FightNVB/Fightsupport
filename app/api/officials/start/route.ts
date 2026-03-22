import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmaking_id = body?.matchmaking_id as string | undefined;

    if (!matchmaking_id) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    }

    const { userId, role } = await requireUserWithRole(req);
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    const payload = {
      do_scrape: body?.do_scrape !== false,
      workers: body?.workers ?? 8,
      stagger_ms: body?.stagger_ms ?? 250,
      tab_attempts: body?.tab_attempts ?? 8,
      soft_wait_ms: body?.soft_wait_ms ?? 900,
      between_attempts_ms: body?.between_attempts_ms ?? 450,
      fullfighter_timeout_ms: body?.fullfighter_timeout_ms ?? 35000,
      uitslagen_timeout_ms: body?.uitslagen_timeout_ms ?? 90000,
      uitslagen_tries: body?.uitslagen_tries ?? 1,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("official_control_queue")
      .insert({
        matchmaking_id,
        requested_by: userId,
        status: "queued",
        payload,
      })
      .select("*")
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        const { data: existing } = await supabase
          .from("official_control_queue")
          .select("id, status, created_at, started_at, controle_run_id")
          .eq("matchmaking_id", matchmaking_id)
          .in("status", ["queued", "running"])
          .order("created_at", { ascending: false })
          .limit(1);

        return NextResponse.json({
          ok: true,
          queued: false,
          already_exists: true,
          message: "Voor deze matchmaking staat al een officials-controle in de wachtrij of draait er al één.",
          existing_job: existing?.[0] ?? null,
        });
      }

      throw insertErr;
    }

    const baseUrl =
      process.env.INTERNAL_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    fetch(`${baseUrl}/api/officials/queue/run-next`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-officials-queue-secret": process.env.OFFICIALS_QUEUE_SECRET || "",
      },
      body: JSON.stringify({ trigger: "officials-start" }),
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      queued: true,
      message: "Officials-controle toegevoegd aan wachtrij.",
      job_id: inserted.id,
      status: inserted.status,
      matchmaking_id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}