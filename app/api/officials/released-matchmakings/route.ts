import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function normalizeRole(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isResponseLike(value: unknown): value is Response {
  return typeof Response !== "undefined" && value instanceof Response;
}

type ControleRun = {
  id: string;
  matchmaking_id: string;
  status: string;
  gestart_op: string | null;
  afgerond_op: string | null;
  run_type: string | null;
};

type OfficialQueueJob = {
  id: string;
  matchmaking_id: string;
  status: "queued" | "running" | "done" | "failed" | "cancelled" | string;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  controle_run_id: string | null;
  error_message: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const { userId, roles } = await requireRole(req, [
      "superadmin",
      "super_admin",
      "admin",
      "administrator",
      "official",
      "hoofdofficial",
      "matchmaker",
    ]);

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("user_profiles")
      .select("role, bondteam")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) {
      return NextResponse.json(
        { error: profileErr.message || "Laden user_profiles mislukt." },
        { status: 500 }
      );
    }

    const roleSet = new Set<string>((roles ?? []).map((r) => normalizeRole(r)));
    const profileRole = normalizeRole((profile as any)?.role);
    if (profileRole) roleSet.add(profileRole);

    const userBondteam = String((profile as any)?.bondteam ?? "").trim();

    const isSuperadmin =
      roleSet.has("superadmin") ||
      roleSet.has("super_admin") ||
      roleSet.has("admin") ||
      roleSet.has("administrator");

    let uploadQuery = supabaseAdmin
      .from("matchmaking_uploads")
      .select(
        `
        id,
        uploaded_at,
        uploaded_by,
        evenement_naam,
        evenement_datum,
        locatie,
        matchmaking_id,
        matchmaker,
        promotor,
        bondteam,
        official_release,
        official_released_at
      `
      )
      .eq("official_release", true)
      .order("official_released_at", { ascending: false })
      .order("uploaded_at", { ascending: false });

    if (!isSuperadmin) {
      if (!userBondteam) {
        return NextResponse.json({ rows: [] });
      }
      uploadQuery = uploadQuery.eq("bondteam", userBondteam);
    }

    const { data: uploads, error: uploadError } = await uploadQuery;

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message || "Laden matchmaking_uploads mislukt." },
        { status: 500 }
      );
    }

    const matchmakingIds = (uploads ?? [])
      .map((u: any) => u.matchmaking_id)
      .filter(Boolean) as string[];

    const { data: runs, error: runsErr } = matchmakingIds.length
      ? await supabaseAdmin
          .from("controle_runs")
          .select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type")
          .in("matchmaking_id", matchmakingIds)
      : { data: [] as ControleRun[], error: null as any };

    if (runsErr) {
      return NextResponse.json(
        { error: runsErr.message || "Laden controle_runs mislukt." },
        { status: 500 }
      );
    }

    const { data: queueJobs, error: queueErr } = matchmakingIds.length
      ? await supabaseAdmin
          .from("official_control_queue")
          .select(
            "id, matchmaking_id, status, created_at, started_at, finished_at, controle_run_id, error_message"
          )
          .in("matchmaking_id", matchmakingIds)
      : { data: [] as OfficialQueueJob[], error: null as any };

    if (queueErr) {
      return NextResponse.json(
        { error: queueErr.message || "Laden official_control_queue mislukt." },
        { status: 500 }
      );
    }

    const runMap = new Map<string, ControleRun>();
    (runs ?? []).forEach((r) => {
      const existing = runMap.get(r.matchmaking_id);
      if (!existing || new Date(r.gestart_op ?? 0) > new Date(existing.gestart_op ?? 0)) {
        runMap.set(r.matchmaking_id, r);
      }
    });

    const queueMap = new Map<string, OfficialQueueJob>();
    const rank = (status: string) => {
      if (status === "running") return 4;
      if (status === "queued") return 3;
      if (status === "failed") return 2;
      if (status === "done") return 1;
      return 0;
    };

    (queueJobs ?? []).forEach((q) => {
      const existing = queueMap.get(q.matchmaking_id);
      if (!existing) {
        queueMap.set(q.matchmaking_id, q);
        return;
      }

      const nextRank = rank(q.status);
      const existingRank = rank(existing.status);

      if (
        nextRank > existingRank ||
        (nextRank === existingRank &&
          new Date(q.created_at ?? 0) > new Date(existing.created_at ?? 0))
      ) {
        queueMap.set(q.matchmaking_id, q);
      }
    });

    const rows = (uploads ?? []).map((u: any) => ({
      ...u,
      laatste_run: u.matchmaking_id ? runMap.get(u.matchmaking_id) ?? null : null,
      actieve_queue_job: u.matchmaking_id ? queueMap.get(u.matchmaking_id) ?? null : null,
    }));

    return NextResponse.json({ rows });
  } catch (e: any) {
    if (isResponseLike(e)) return e;

    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout." },
      { status: 500 }
    );
  }
}
