// app/api/officials/uitslagen/submit/route.ts
// Official uitslagen submission endpoint.
// Requires official, hoofdofficial, admin, or superadmin role.
// Matchmaking must be in LINEUP state.

import { NextResponse } from "next/server";
import { requireAnyRole, supabaseAdmin, assertCanAccessMatchmaking } from "@/app/api/_utils/authz";
import { validateUitslagInput, assertMatchmakingInState } from "@/lib/workflow/matchmakingValidator";
import { logUitslagEntry } from "@/lib/workflow/auditLogger";
import { ERRORS } from "@/lib/constants/errors";

export const runtime = "nodejs";

function isUuid(v: any): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(v ?? "").trim()
  );
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireAnyRole(req, [
      "official",
      "hoofdofficial",
      "admin",
      "superadmin",
      "dispensatie_admin",
    ]);

    const body = await req.json().catch(() => ({}));
    const { matchmaking_id, bout_id, partij_nr, uitslag_rood, winnaar } = body ?? {};

    if (!isUuid(matchmaking_id)) {
      return NextResponse.json(
        { error: ERRORS.INVALID_UUID("matchmaking_id") },
        { status: 400 }
      );
    }

    if (!isUuid(bout_id)) {
      return NextResponse.json(
        { error: ERRORS.INVALID_UUID("bout_id") },
        { status: 400 }
      );
    }

    // Uitslagen kunnen worden ingevoerd zodra de matchmaking in lineup of
    // uitslagenfase staat. Oudere flows gebruiken "lineup", nieuwe flows
    // gebruiken "klaar_voor_uitslagen" / "uitslagen_in_bewerking".
    const allowedStateChecks = await Promise.all([
      assertMatchmakingInState(supabaseAdmin, matchmaking_id, "lineup"),
      assertMatchmakingInState(supabaseAdmin, matchmaking_id, "klaar_voor_uitslagen"),
      assertMatchmakingInState(supabaseAdmin, matchmaking_id, "uitslagen_in_bewerking"),
    ]);

    if (!allowedStateChecks.some((check) => check.ok)) {
      return NextResponse.json(
        { error: allowedStateChecks[0]?.error ?? "Matchmaking staat niet in uitslagenfase." },
        { status: 422 }
      );
    }

    // Ensure the user can access this matchmaking (bondteam check for officials)
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    // Validate uitslag input
    const inputValidation = validateUitslagInput({ uitslag_rood, winnaar });
    if (!inputValidation.ok) {
      return NextResponse.json({ error: inputValidation.error }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const pNr = Number(partij_nr) || null;

    // Upsert uitslag on the bout row
    const { error: upErr } = await supabaseAdmin
      .from("matchmaking_bouts")
      .update({
        uitslag_rood: String(uitslag_rood).trim(),
        winnaar: String(winnaar).trim().toLowerCase(),
        uitslag_ingevoerd_door: userId,
        uitslag_ingevoerd_op: nowIso,
      })
      .eq("id", bout_id)
      .eq("matchmaking_id", matchmaking_id);

    if (upErr) {
      return NextResponse.json({ error: ERRORS.DB_ERROR }, { status: 500 });
    }

    await logUitslagEntry(supabaseAdmin, {
      uitslag_id: bout_id,
      matchmaking_id,
      partij_nr: pNr ?? 0,
      actor_id: userId,
      actor_role: role,
      uitslag_rood: String(uitslag_rood).trim(),
      winnaar: String(winnaar).trim().toLowerCase(),
    });

    const { error: mmStatusErr } = await supabaseAdmin
      .from("matchmakings")
      .update({
        stadium: "uitslagen_in_bewerking",
        status: "uitslagen_in_bewerking",
        locked_for_editing: true,
        last_updated_at: nowIso,
        last_updated_by: userId,
      })
      .eq("id", matchmaking_id)
      .in("stadium", ["lineup", "klaar_voor_uitslagen", "uitslagen_in_bewerking"]);

    if (mmStatusErr) {
      console.warn("[officials/uitslagen/submit] matchmaking status update mislukt:", mmStatusErr.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e?.message ?? ERRORS.UNKNOWN_ERROR },
      { status: 500 }
    );
  }
}
