// app/api/dispensatie/decide/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader, hasAnyRole, hasAnyRoleFromReq } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { user } = await requireUserFromAuthHeader(req);
    const ok = await hasAnyRoleFromReq(req, ["superadmin"]);
    if (!ok) return NextResponse.json({ error: "Alleen superadmin." }, { status: 403 });

    const body = await req.json();
    const request_id = String(body.request_id ?? "").trim();
    const decision = String(body.decision ?? "").trim(); // "approved" | "rejected"
    const reason = String(body.reason ?? "").trim();

    if (!request_id) return NextResponse.json({ error: "request_id ontbreekt." }, { status: 400 });
    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json({ error: "decision moet approved of rejected zijn." }, { status: 400 });
    }
    if (!reason) return NextResponse.json({ error: "Reden is verplicht." }, { status: 400 });

    // request ophalen (voor matchmaking_id / controle_run_id)
    const { data: reqRow, error: rErr } = await supabaseAdmin
      .from("dispensatie_requests")
      .select("id, matchmaking_id, controle_run_id")
      .eq("id", request_id)
      .single();

    if (rErr) throw rErr;

    let controle_run_id = reqRow?.controle_run_id ?? null;

    if (!controle_run_id && reqRow?.matchmaking_id) {
      const { data: runs, error: runErr } = await supabaseAdmin
        .from("controle_runs")
        .select("id")
        .eq("matchmaking_id", reqRow.matchmaking_id)
        .order("gestart_op", { ascending: false })
        .limit(1);

      if (runErr) throw runErr;
      controle_run_id = runs?.[0]?.id ?? null;
    }

    // ✅ we eisen het niet meer hard; we vullen als kan
    const { error: uErr } = await supabaseAdmin
      .from("dispensatie_requests")
      .update({
        status: "closed",
        decision,
        decision_reason: reason,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        controle_run_id: controle_run_id ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request_id);

    if (uErr) throw uErr;

    return NextResponse.json({ ok: true, controle_run_id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
