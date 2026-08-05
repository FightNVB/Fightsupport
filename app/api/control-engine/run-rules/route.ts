import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rulesEngine } from "@/lib/rulesEngine";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";
import { secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type AnyRow = Record<string, any>;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const matchmaking_id = body?.matchmaking_id as string | undefined;
    const controle_run_id = body?.controle_run_id as string | undefined;

    if (!matchmaking_id || !controle_run_id) {
      return NextResponse.json(
        { error: "matchmaking_id en controle_run_id zijn verplicht" },
        { status: 400 }
      );
    }

    const auth = await requireUserWithRole(req, ["matchmaker", "official", "hoofdofficial", "admin", "superadmin"]);
    await assertCanAccessMatchmaking({ matchmaking_id, userId: auth.userId, role: auth.role });

    const { data: ctxRows, error: ctxErr } = await supabaseAdmin
      .from("controle_bout_context")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", controle_run_id)
      .order("partij_nr", { ascending: true });

    if (ctxErr) throw ctxErr;

    if (!ctxRows || ctxRows.length === 0) {
      return NextResponse.json({ ok: true, matchmaking_id, controle_run_id, inserted: 0 });
    }

    const hits = await rulesEngine({
      matchmaking_id,
      controle_run_id,
      ctxRows: ctxRows as AnyRow[],
    });

    return NextResponse.json({ ok: true, matchmaking_id, controle_run_id, inserted: hits.length });
  } catch (e: any) {
    return secureError(e, "Controle kon niet worden uitgevoerd.");
  }
}
