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
      .select("id, matchmaking_id, controle_run_id, bout_id, partij_nr, rule_code")
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

    // Houd de oorspronkelijke controle-melding synchroon met het formele
    // dispensatiebesluit. Zo blijft controle_resultaten zelfstandig leesbaar:
    // original_resultaat blijft DISPENSATIE, resultaat wordt OK/AFGEKEURD en
    // de opgegeven reden wordt als review_note + aantekeningen bewaard.
    let resultQuery = supabaseAdmin
      .from("controle_resultaten")
      .select("id, resultaat, original_resultaat, created_at")
      .eq("matchmaking_id", reqRow.matchmaking_id)
      .eq("rule_code", reqRow.rule_code)
      .order("created_at", { ascending: false });

    if (reqRow.bout_id) {
      resultQuery = resultQuery.eq("bout_id", reqRow.bout_id);
    } else if (reqRow.partij_nr != null) {
      resultQuery = resultQuery.eq("partij_nr", reqRow.partij_nr);
    }

    if (controle_run_id) {
      resultQuery = resultQuery.eq("controle_run_id", controle_run_id);
    }

    const { data: resultRows, error: resultFindErr } = await resultQuery.limit(10);
    if (resultFindErr) throw resultFindErr;

    // Kies bij voorkeur de nog oorspronkelijke DISPENSATIE-regel.
    // Als die al eerder is omgezet, herkennen we hem via original_resultaat.
    const controleResultaat =
      (resultRows ?? []).find(
        (row: any) =>
          String(row?.resultaat ?? "").trim().toUpperCase() === "DISPENSATIE",
      ) ??
      (resultRows ?? []).find(
        (row: any) =>
          String(row?.original_resultaat ?? "").trim().toUpperCase() ===
          "DISPENSATIE",
      ) ??
      null;

    if (controleResultaat?.id) {
      const reviewedAt = new Date().toISOString();
      const originalResultaat =
        String(controleResultaat.original_resultaat ?? "").trim() ||
        String(controleResultaat.resultaat ?? "").trim() ||
        "DISPENSATIE";

      const { error: resultUpdateErr } = await supabaseAdmin
        .from("controle_resultaten")
        .update({
          resultaat: decision === "approved" ? "ok" : "afgekeurd",
          review_status:
            decision === "approved" ? "goedgekeurd" : "afgekeurd",
          review_note: reason,
          aantekeningen: reason,
          reviewed_by: user.id,
          reviewed_at: reviewedAt,
          original_resultaat: originalResultaat,
        })
        .eq("id", controleResultaat.id);

      if (resultUpdateErr) throw resultUpdateErr;
    } else {
      console.warn(
        "[dispensatie/decide] Geen bijbehorende controle_resultaten DISPENSATIE-regel gevonden",
        {
          request_id,
          matchmaking_id: reqRow.matchmaking_id,
          controle_run_id,
          bout_id: reqRow.bout_id,
          partij_nr: reqRow.partij_nr,
          rule_code: reqRow.rule_code,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      controle_run_id,
      controle_resultaat_id: controleResultaat?.id ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
