// app/api/matchmaker/fighter-review/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUserWithRole, resolveAndAssertFighterReviewAccess } from "@/app/api/_utils/authz";
import { privateJson, secureError } from "@/lib/api/secureRoute";

type ReviewAction = "approve" | "reject" | "dismiss";

function s(value: unknown): string {
  return String(value ?? "").trim();
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = s(body?.id);
    const action = s(body?.action) as ReviewAction;
    const note = s(body?.note) || null;

    if (!id) {
      return NextResponse.json(
        { error: "Melding-ID is verplicht." },
        { status: 400 },
      );
    }

    const auth = await requireUserWithRole(req, ["matchmaker", "admin", "superadmin"]);
    const matchmakingId = await resolveAndAssertFighterReviewAccess({ reviewId: id, userId: auth.userId, role: auth.role });

    if (!["approve", "reject", "dismiss"].includes(action)) {
      return NextResponse.json({ error: "Ongeldige reviewactie." }, { status: 400 });
    }

    const { data: current, error: readError } = await supabaseAdmin
      .from("matchmaker_fighter_resultaten")
      .select("id,matchmaking_id,original_resultaat,resultaat,review_status,review_note")
      .eq("id", id)
      .eq("matchmaking_id", matchmakingId)
      .maybeSingle();

    if (readError) {
      return privateJson({ error: "Melding kon niet worden geladen." }, 500);
    }

    if (!current) {
      return NextResponse.json({ error: "Melding niet gevonden." }, { status: 404 });
    }

    const originalResultaat =
      current.original_resultaat ?? current.resultaat ?? null;

    const update = {
      original_resultaat: originalResultaat,
      review_status:
        action === "approve"
          ? "goedgekeurd"
          : action === "reject"
            ? "afgewezen"
            : "gesloten",
      review_note: note,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
      resultaat:
        action === "approve" || action === "dismiss"
          ? "OK"
          : originalResultaat === "AFKEUR" || originalResultaat === "VERBOD"
            ? originalResultaat
            : "ACTIE",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("matchmaker_fighter_resultaten")
      .update(update)
      .eq("id", id)
      .eq("matchmaking_id", matchmakingId)
      .select("id,matchmaking_id,resultaat,original_resultaat,review_status,review_note,reviewed_by,reviewed_at,updated_at")
      .single();

    if (error) {
      return privateJson({ error: "Melding kon niet worden bijgewerkt." }, 500);
    }

    return privateJson({ ok: true, result: data });
  } catch (error: any) {
    return secureError(error, "Melding beoordelen mislukt.");
  }
}
