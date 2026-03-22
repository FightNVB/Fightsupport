import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const { data, error } = await supabase
      .from("official_control_queue")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      jobs: data ?? [],
      active_job: (data ?? []).find((x: any) => x.status === "queued" || x.status === "running") ?? null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}