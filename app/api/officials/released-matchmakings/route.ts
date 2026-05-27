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

function toSafeErrorMessage(error: any, fallback: string) {
  const raw = String(error?.message ?? error ?? "").toLowerCase();

  if (
    raw.includes("502") ||
    raw.includes("bad gateway") ||
    raw.includes("cloudflare")
  ) {
    return "Supabase is tijdelijk niet bereikbaar. Probeer het zo opnieuw.";
  }

  if (
    raw.includes("fetch failed") ||
    raw.includes("network") ||
    raw.includes("timeout") ||
    raw.includes("socket")
  ) {
    return "Tijdelijke verbindingsfout met Supabase. Probeer het zo opnieuw.";
  }

  return String(error?.message ?? fallback);
}

async function safeSelect<T>(
  promise: any,
  label: string,
  fallback: T[] = []
): Promise<T[]> {
  try {
    const { data, error } = await promise;

    if (error) {
      console.error(`[released-matchmakings] ${label} queryfout:`, error);
      return fallback;
    }

    return Array.isArray(data) ? data : fallback;
  } catch (err) {
    console.error(`[released-matchmakings] ${label} upstream fout:`, err);
    return fallback;
  }
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

type UploadRow = {
  id: string;
  uploaded_at: string | null;
  uploaded_by: string | null;
  evenement_naam: string | null;
  evenement_datum: string | null;
  locatie: string | null;
  matchmaking_id: string | null;
  matchmaker: string | null;
  promotor: string | null;
  bondteam: string | null;
  official_release: boolean | null;
  official_released_at: string | null;
};

type WeighInRow = {
  matchmaking_id: string | null;
  laatste_bewerking_op?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type LineupRow = {
  matchmaking_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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
        {
          error: toSafeErrorMessage(
            profileErr,
            "Laden user_profiles mislukt."
          ),
        },
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
        {
          error: toSafeErrorMessage(
            uploadError,
            "Laden matchmaking_uploads mislukt."
          ),
        },
        { status: 500 }
      );
    }

    const matchmakingIds = Array.from(
      new Set(
        (uploads ?? [])
          .map((u: any) => String(u?.matchmaking_id ?? "").trim())
          .filter(Boolean)
      )
    );

    const { data: runs, error: runsErr } = matchmakingIds.length
      ? await supabaseAdmin
          .from("controle_runs")
          .select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type")
          .in("matchmaking_id", matchmakingIds)
      : { data: [] as ControleRun[], error: null as any };

    if (runsErr) {
      return NextResponse.json(
        {
          error: toSafeErrorMessage(runsErr, "Laden controle_runs mislukt."),
        },
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
        {
          error: toSafeErrorMessage(
            queueErr,
            "Laden official_control_queue mislukt."
          ),
        },
        { status: 500 }
      );
    }

    const weighRows = matchmakingIds.length
      ? await safeSelect<WeighInRow>(
          supabaseAdmin
            .from("weigh_in_bouts")
            .select("matchmaking_id, laatste_bewerking_op, updated_at, created_at")
            .in("matchmaking_id", matchmakingIds),
          "weigh_in_bouts"
        )
      : [];

    const lineupRows = matchmakingIds.length
      ? await safeSelect<LineupRow>(
          supabaseAdmin
            .from("definitive_matchmaking_bouts")
            .select("matchmaking_id, created_at, updated_at")
            .in("matchmaking_id", matchmakingIds),
          "definitive_matchmaking_bouts"
        )
      : [];

    const runMap = new Map<string, ControleRun>();
    (runs ?? []).forEach((r) => {
      const mmId = String(r?.matchmaking_id ?? "").trim();
      if (!mmId) return;

      const existing = runMap.get(mmId);
      if (!existing) {
        runMap.set(mmId, r);
        return;
      }

      const nextTime = new Date(r.gestart_op ?? r.afgerond_op ?? 0).getTime();
      const existingTime = new Date(
        existing.gestart_op ?? existing.afgerond_op ?? 0
      ).getTime();

      if (nextTime >= existingTime) {
        runMap.set(mmId, r);
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
      const mmId = String(q?.matchmaking_id ?? "").trim();
      if (!mmId) return;

      const existing = queueMap.get(mmId);
      if (!existing) {
        queueMap.set(mmId, q);
        return;
      }

      const nextRank = rank(String(q.status ?? ""));
      const existingRank = rank(String(existing.status ?? ""));

      if (
        nextRank > existingRank ||
        (nextRank === existingRank &&
          new Date(q.created_at ?? 0).getTime() >
            new Date(existing.created_at ?? 0).getTime())
      ) {
        queueMap.set(mmId, q);
      }
    });

    const weighMap = new Map<
      string,
      {
        count: number;
        latest_at: string | null;
      }
    >();

    (weighRows ?? []).forEach((w) => {
      const mmId = String(w?.matchmaking_id ?? "").trim();
      if (!mmId) return;

      const stamp =
        w.laatste_bewerking_op ?? w.updated_at ?? w.created_at ?? null;

      const existing = weighMap.get(mmId);
      if (!existing) {
        weighMap.set(mmId, { count: 1, latest_at: stamp });
        return;
      }

      const nextTime = new Date(stamp ?? 0).getTime();
      const existingTime = new Date(existing.latest_at ?? 0).getTime();

      weighMap.set(mmId, {
        count: existing.count + 1,
        latest_at: nextTime >= existingTime ? stamp : existing.latest_at,
      });
    });

    const lineupMap = new Map<
      string,
      {
        count: number;
        latest_at: string | null;
      }
    >();

    (lineupRows ?? []).forEach((l) => {
      const mmId = String(l?.matchmaking_id ?? "").trim();
      if (!mmId) return;

      const stamp = l.updated_at ?? l.created_at ?? null;

      const existing = lineupMap.get(mmId);
      if (!existing) {
        lineupMap.set(mmId, { count: 1, latest_at: stamp });
        return;
      }

      const nextTime = new Date(stamp ?? 0).getTime();
      const existingTime = new Date(existing.latest_at ?? 0).getTime();

      lineupMap.set(mmId, {
        count: existing.count + 1,
        latest_at: nextTime >= existingTime ? stamp : existing.latest_at,
      });
    });

    const rows = (uploads ?? []).map((u: UploadRow) => {
      const mmId = String(u?.matchmaking_id ?? "").trim();
      const laatste_run = mmId ? runMap.get(mmId) ?? null : null;
      const actieve_queue_job = mmId ? queueMap.get(mmId) ?? null : null;

      const weighInfo = mmId ? weighMap.get(mmId) : null;
      const lineupInfo = mmId ? lineupMap.get(mmId) : null;

      const in_lineup = !!lineupInfo?.count;
      const naar_weegstation = !in_lineup && !!weighInfo?.count;

      const flow_status = in_lineup
        ? "in lineup"
        : naar_weegstation
        ? "naar weegstation"
        : "ontvangen";

      return {
        ...u,
        laatste_run,
        actieve_queue_job,

        flow_status,

        naar_weegstation,
        naar_weegstation_at: weighInfo?.latest_at ?? null,

        in_lineup,
        lineup: in_lineup,
        definitive_id: in_lineup ? mmId : null,
        definitive_matchmaking_id: in_lineup ? mmId : null,
      };
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    if (isResponseLike(e)) return e;

    return NextResponse.json(
      {
        error: toSafeErrorMessage(
          e,
          "Onbekende fout bij laden official overzicht."
        ),
      },
      { status: 500 }
    );
  }
}
