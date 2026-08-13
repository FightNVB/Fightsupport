// app/api/dispensatie/create-from-controle/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader, hasAnyRoleFromReq } from "@/lib/api/requireRole";
import { buildDispensatieSnapshot } from "@/lib/dispensatie/buildSnapshot";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function asUuidOrNull(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (s === "[object Object]") return null;
  // simpele uuid check
  if (!/^[0-9a-fA-F-]{36}$/.test(s)) return null;
  return s;
}

export async function POST(req: Request) {
  try {
    const { user } = await requireUserFromAuthHeader(req);

    // ✅ rechten: admin / superadmin
    const ok = await hasAnyRoleFromReq(req, ["admin", "superadmin"]);
    if (!ok) return NextResponse.json({ error: "Geen rechten." }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    const matchmaking_id = asUuidOrNull(body.matchmaking_id);
    const partij_nr = Number(body.partij_nr);
    const bout_id = asUuidOrNull(body.bout_id);

    const va_rood = (typeof body.va_rood === "string" && body.va_rood.trim()) ? body.va_rood.trim() : null;
    const va_blauw = (typeof body.va_blauw === "string" && body.va_blauw.trim()) ? body.va_blauw.trim() : null;

    const discipline = (typeof body.discipline === "string" && body.discipline.trim()) ? body.discipline.trim() : null;
    const rule_code = (typeof body.rule_code === "string" && body.rule_code.trim()) ? body.rule_code.trim() : "MANUAL_PARTIJ";
    const rule = (typeof body.rule === "string" && body.rule.trim()) ? body.rule.trim() : "Handmatig doorgestuurd";
    const reason = (typeof body.reason === "string" && body.reason.trim()) ? body.reason.trim() : null;

    if (!matchmaking_id || !Number.isFinite(partij_nr) || partij_nr <= 0) {
      return NextResponse.json({ error: "matchmaking_id en partij_nr zijn verplicht." }, { status: 400 });
    }

    const snapshot = await buildDispensatieSnapshot(supabaseAdmin, matchmaking_id, partij_nr);

    // Een bestaande aanvraag NOOIT opnieuw openen of een besluit overschrijven.
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("dispensatie_requests")
      .select("id,status,decision")
      .eq("matchmaking_id", matchmaking_id)
      .eq("partij_nr", partij_nr)
      .eq("rule_code", rule_code)
      .maybeSingle();

    if (exErr) throw exErr;

    if (existing?.id) {
      const patch: any = {
        bout_id,
        va_rood,
        va_blauw,
        discipline,
        rule,
        reason,
        evenement_naam: snapshot.evenement_naam,
        evenement_datum: snapshot.evenement_datum,
        snapshot_json: snapshot,
        updated_at: new Date().toISOString(),
      };

      const { error: updErr } = await supabaseAdmin
        .from("dispensatie_requests")
        .update(patch)
        .eq("id", existing.id);
      if (updErr) throw updErr;

      return NextResponse.json({
        ok: true,
        id: existing.id,
        status: existing.status,
        decision: existing.decision,
        preserved: true,
      });
    }

    const insertRow: any = {
      matchmaking_id,
      partij_nr,
      bout_id,
      va_rood,
      va_blauw,
      discipline,
      rule_code,
      rule,
      reason,
      status: "nieuw",
      created_by: user.id,
      evenement_naam: snapshot.evenement_naam,
      evenement_datum: snapshot.evenement_datum,
      snapshot_json: snapshot,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("dispensatie_requests")
      .insert(insertRow)
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
