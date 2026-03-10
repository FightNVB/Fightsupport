import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireAnyRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { controle_resultaat_id, decision } = await req.json();

    if (!controle_resultaat_id || !decision) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // ✅ Auth: official/hoofdofficial/admin/superadmin
    const { userId, role } = await requireAnyRole(req, ["official","hoofdofficial","admin","superadmin"]);

    // ✅ Vind matchmaking scope via resultaat -> run
    let matchmaking_id: string | null = null;
    let controle_run_id: string | null = null;

    const { data: resRow, error: resErr } = await supabase
      .from("controle_resultaten")
      .select("matchmaking_id, controle_run_id, run_id")
      .eq("id", controle_resultaat_id)
      .maybeSingle();

    if (resErr) throw resErr;

    matchmaking_id = (resRow as any)?.matchmaking_id ?? null;
    controle_run_id = (resRow as any)?.controle_run_id ?? (resRow as any)?.run_id ?? null;

    if (!matchmaking_id && controle_run_id) {
      const { data: runRow, error: runErr } = await supabase
        .from("controle_runs")
        .select("matchmaking_id")
        .eq("id", controle_run_id)
        .maybeSingle();
      if (runErr) throw runErr;
      matchmaking_id = (runRow as any)?.matchmaking_id ?? null;
    }

    if (!matchmaking_id) {
      return NextResponse.json({ error: "Kan matchmaking_id niet bepalen." }, { status: 400 });
    }

    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    const review_status = decision === "approved" ? "approved" : "rejected";

    const { error } = await supabase
      .from("controle_resultaten")
      .update({
        review_status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      })
      .eq("id", controle_resultaat_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("review-gala-duur error:", e);
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
