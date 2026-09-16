// Matchmaker Eindcontrole endpoint.
// POST gebruikt de volledige live scraper-flow; GET leest de status van diezelfde run.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { POST as startFullControle } from "@/app/api/control-engine/matchmaker/full/start/route";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RUN_TYPE = "control-engine-matchmaker-total";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function norm(value: unknown) {
  return String(value ?? "").trim();
}

function roleAllowed(role: string | null | undefined) {
  return ["matchmaker", "admin", "superadmin"].includes(String(role ?? "").toLowerCase());
}

export async function POST(req: Request) {
  return startFullControle(req);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const matchmakingId = norm(url.searchParams.get("matchmaking_id"));
    const controleRunId = norm(url.searchParams.get("controle_run_id"));

    if (!matchmakingId && !controleRunId) {
      return NextResponse.json(
        { error: "matchmaking_id of controle_run_id ontbreekt" },
        { status: 400 },
      );
    }

    const { userId, role } = await requireUserWithRole(req);
    if (!roleAllowed(role)) {
      return NextResponse.json({ error: "Geen toegang tot Matchmaker-eindcontrole" }, { status: 403 });
    }

    if (matchmakingId) {
      await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });
    }

    let query = supabase
      .from("controle_runs")
      .select("id,matchmaking_id,status,gestart_op,afgerond_op,run_type,progress,current_step,totaal_aantal,verwerkt_aantal,foutmelding")
      .eq("run_type", RUN_TYPE);

    if (controleRunId) query = query.eq("id", controleRunId);
    if (matchmakingId) query = query.eq("matchmaking_id", matchmakingId);

    const { data, error } = await query
      .order("gestart_op", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ ok: true, run: data ?? null });
  } catch (error: any) {
    console.error("[matchmaker/eindcontrole/status]", error);
    return NextResponse.json(
      { error: error?.message ?? "Status eindcontrole ophalen mislukt." },
      { status: 500 },
    );
  }
}
