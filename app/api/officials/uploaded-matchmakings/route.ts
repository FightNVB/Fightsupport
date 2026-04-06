import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getUserBondteam,
  requireAnyRole,
  RoleName,
} from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

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

type UploadRowOut = {
  id: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  locatie: string | null;

  matchmaking_id: string | null;
  official_release: boolean | null;
  official_released_at: string | null;

  matchmaker: string | null;
  promotor: string | null;
  bondteam: string | null;

  uploaded_at: string | null;
  uploaded_by: string | null;

  laatste_run: ControleRun | null;
  actieve_queue_job: OfficialQueueJob | null;

  flow_status: string | null;
  naar_weegstation: boolean | null;
  naar_weegstation_at: string | null;
  weegstation_started_at: string | null;
  in_lineup: boolean | null;
  lineup: boolean | null;
  definitive_id: string | null;
  definitive_matchmaking_id: string | null;
};

function roleLower(r: unknown): RoleName {
  const x = String(r ?? "").trim().toLowerCase();
  if (
    x === "superadmin" ||
    x === "admin" ||
    x === "matchmaker" ||
    x === "official" ||
    x === "hoofdofficial" ||
    x === "dispensatie_admin"
  ) {
    return x as RoleName;
  }
  return "unknown";
}

function toMapByNewest<T extends Record<string, any>>(
  rows: T[],
  keyField: keyof T,
  dateField: keyof T
) {
  const map = new Map<string, T>();

  for (const row of rows) {
    const key = String(row?.[keyField] ?? "").trim();
    if (!key) continue;

    const current = map.get(key);
    const rowTs = new Date(String(row?.[dateField] ?? 0)).getTime();
    const curTs = current
      ? new Date(String(current?.[dateField] ?? 0)).getTime()
      : -1;

    if (!current || rowTs >= curTs) {
      map.set(key, row);
    }
  }

  return map;
}

export async function GET(req: Request) {
  try {
    const auth = await requireAnyRole(req, [
      "admin",
      "superadmin",
      "official",
      "hoofdofficial",
    ]);

    const userId = auth.userId;
    const role = roleLower(auth.role);

    let bondteamFilter: string | null = null;

    if (role === "official" || role === "hoofdofficial") {
      const userBondteam = await getUserBondteam(userId);
      if (!userBondteam) {
        return NextResponse.json(
          { error: "Je profiel mist bondteam." },
          { status: 403 }
        );
      }
      bondteamFilter = String(userBondteam);
    }

    let uploadQuery = supabase
      .from("matchmaking_uploads")
      .select(`
        id,
        matchmaking_id,
        evenement_naam,
        evenement_datum,
        locatie,
        official_release,
        official_released_at,
        matchmaker,
        promotor,
        bondteam,
        uploaded_at,
        uploaded_by
      `)
      .or("official_release.is.null,official_release.eq.false")
      .order("uploaded_at", { ascending: false });

    if (bondteamFilter) {
      uploadQuery = uploadQuery.eq("bondteam", bondteamFilter);
    }

    const { data: uploads, error: uploadErr } = await uploadQuery;
    if (uploadErr) throw uploadErr;

    const rowsBase = uploads ?? [];
    const matchmakingIds = [
      ...new Set(
        rowsBase
          .map((r: any) => String(r?.matchmaking_id ?? "").trim())
          .filter(Boolean)
      ),
    ];

    if (matchmakingIds.length === 0) {
      return NextResponse.json({ ok: true, rows: [] });
    }

    const [runsRes, queueRes, definitiveRes] = await Promise.all([
      supabase
        .from("controle_runs")
        .select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type")
        .in("matchmaking_id", matchmakingIds)
        .order("gestart_op", { ascending: false }),

      supabase
        .from("official_control_queue")
        .select(
          "id, matchmaking_id, status, created_at, started_at, finished_at, controle_run_id, error_message"
        )
        .in("matchmaking_id", matchmakingIds)
        .in("status", ["queued", "running", "failed", "done"])
        .order("created_at", { ascending: false }),

      supabase
        .from("definitive_matchmakings")
        .select("id, matchmaking_id, created_at")
        .in("matchmaking_id", matchmakingIds),
    ]);

    if (runsRes.error) throw runsRes.error;
    if (queueRes.error) throw queueRes.error;
    if (definitiveRes.error) throw definitiveRes.error;

    const latestRunMap = toMapByNewest(
      (runsRes.data ?? []) as ControleRun[],
      "matchmaking_id",
      "gestart_op"
    );

    const queueMap = toMapByNewest(
      (queueRes.data ?? []) as OfficialQueueJob[],
      "matchmaking_id",
      "created_at"
    );

    const definitiveMap = new Map<string, { id: string; matchmaking_id: string }>();
    for (const row of definitiveRes.data ?? []) {
      const mmId = String((row as any)?.matchmaking_id ?? "").trim();
      const id = String((row as any)?.id ?? "").trim();
      if (!mmId || !id) continue;
      if (!definitiveMap.has(mmId)) {
        definitiveMap.set(mmId, {
          id,
          matchmaking_id: mmId,
        });
      }
    }

    const rows: UploadRowOut[] = rowsBase.map((r: any) => {
      const mmId = String(r?.matchmaking_id ?? "").trim();
      const latestRun = latestRunMap.get(mmId) ?? null;
      const queueJob = queueMap.get(mmId) ?? null;
      const definitive = definitiveMap.get(mmId) ?? null;

      return {
        id: String(r?.id ?? ""),
        evenement_naam: r?.evenement_naam ?? null,
        evenement_datum: r?.evenement_datum ?? null,
        locatie: r?.locatie ?? null,

        matchmaking_id: mmId || null,
        official_release: r?.official_release ?? null,
        official_released_at: r?.official_released_at ?? null,

        matchmaker: r?.matchmaker ?? null,
        promotor: r?.promotor ?? null,
        bondteam: r?.bondteam ?? null,

        uploaded_at: r?.uploaded_at ?? null,
        uploaded_by: r?.uploaded_by ?? null,

        laatste_run: latestRun,
        actieve_queue_job: queueJob,

        flow_status: null,
        naar_weegstation: null,
        naar_weegstation_at: null,
        weegstation_started_at: null,
        in_lineup: !!definitive,
        lineup: !!definitive,
        definitive_id: definitive?.id ?? null,
        definitive_matchmaking_id: definitive?.matchmaking_id ?? null,
      };
    });

    return NextResponse.json({
      ok: true,
      rows,
    });
  } catch (e: any) {
    console.error("❌ officials/uploaded-matchmakings error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}