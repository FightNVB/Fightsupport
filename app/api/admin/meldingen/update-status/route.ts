// app/api/admin/meldingen/update-status/route.ts
// Update the status (review decision) of a controle_resultaat (melding).
// Requires admin role.

import { NextResponse } from "next/server";
import { requireAnyRole, supabaseAdmin } from "@/app/api/_utils/authz";
import {
  getMelding,
  validateMeldingStatusChange,
  isValidMeldingStatus,
} from "@/lib/workflow/meldingValidator";
import { logMeldingUpdate } from "@/lib/workflow/auditLogger";
import { ERRORS } from "@/lib/constants/errors";

export const runtime = "nodejs";

function isUuid(v: any): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(v ?? "").trim()
  );
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireAnyRole(req, ["admin", "superadmin"]);

    const body = await req.json().catch(() => ({}));
    const { melding_id, new_status, reden } = body ?? {};

    if (!isUuid(melding_id)) {
      return NextResponse.json(
        { error: ERRORS.INVALID_UUID("melding_id") },
        { status: 400 }
      );
    }

    const statusStr = String(new_status ?? "").trim().toLowerCase();
    if (!isValidMeldingStatus(statusStr)) {
      return NextResponse.json(
        { error: ERRORS.INVALID_MELDING_STATUS(statusStr) },
        { status: 400 }
      );
    }

    // Fetch current melding
    const melding = await getMelding(supabaseAdmin, melding_id);
    if (!melding) {
      return NextResponse.json(
        { error: ERRORS.MELDING_NOT_FOUND },
        { status: 404 }
      );
    }

    const currentResultaat = String(melding.resultaat ?? "").toLowerCase();
    // Map current state to MeldingStatus for validation
    const currentStatus =
      currentResultaat === "ok"
        ? "akkoord"
        : currentResultaat === "afgekeurd" || currentResultaat === "afkeur"
        ? "afgewezen"
        : "pending";

    const validation = validateMeldingStatusChange(currentStatus as any, statusStr as any);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 422 });
    }

    // Map new_status to DB values
    const nowIso = new Date().toISOString();
    const redenStr = String(reden ?? "").trim();

    let newResultaat: string;
    let newReviewStatus: string;

    if (statusStr === "akkoord") {
      newResultaat = "ok";
      newReviewStatus = "goedgekeurd";
    } else if (statusStr === "afgewezen") {
      newResultaat = "afgekeurd";
      newReviewStatus = "afgekeurd";
    } else if (statusStr === "deleted") {
      newResultaat = melding.resultaat ?? "ok";
      newReviewStatus = "deleted";
    } else {
      // pending — reset review
      newResultaat = melding.original_resultaat ?? melding.resultaat ?? "ok";
      newReviewStatus = "pending";
    }

    const patch: Record<string, any> = {
      resultaat: newResultaat,
      review_status: newReviewStatus,
      reviewed_by: userId,
      reviewed_at: nowIso,
    };

    if (redenStr) patch.aantekeningen = redenStr;
    if (!melding.original_resultaat) {
      patch.original_resultaat = melding.resultaat;
    }

    const { error: upErr } = await supabaseAdmin
      .from("controle_resultaten")
      .update(patch)
      .eq("id", melding_id);

    if (upErr) {
      return NextResponse.json({ error: ERRORS.DB_ERROR }, { status: 500 });
    }

    await logMeldingUpdate(supabaseAdmin, {
      melding_id,
      matchmaking_id: melding.matchmaking_id ?? null,
      old_status: currentStatus,
      new_status: statusStr,
      actor_id: userId,
      actor_role: role,
      reden: redenStr || null,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e?.message ?? ERRORS.UNKNOWN_ERROR },
      { status: 500 }
    );
  }
}
