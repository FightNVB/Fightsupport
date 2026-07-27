// app/api/matchmaker/fighter-review/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ReviewAction = "approve" | "reject" | "dismiss";

function s(value: unknown): string {
  return String(value ?? "").trim();
}

async function getReviewer(req: NextRequest) {
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { user: null, error: "Niet ingelogd." };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { user: null, error: "Sessie is ongeldig of verlopen." };

  return { user: data.user, error: null };
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, error: authError } = await getReviewer(req);
    if (authError || !user) {
      return NextResponse.json({ error: authError ?? "Niet ingelogd." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const id = s(body?.id);
    const matchmakingId = s(body?.matchmaking_id);
    const action = s(body?.action) as ReviewAction;
    const note = s(body?.note) || null;

    if (!id || !matchmakingId) {
      return NextResponse.json(
        { error: "Melding-ID en matchmaking-ID zijn verplicht." },
        { status: 400 },
      );
    }

    if (!["approve", "reject", "dismiss"].includes(action)) {
      return NextResponse.json({ error: "Ongeldige reviewactie." }, { status: 400 });
    }

    const { data: current, error: readError } = await supabaseAdmin
      .from("matchmaker_fighter_resultaten")
      .select("*")
      .eq("id", id)
      .eq("matchmaking_id", matchmakingId)
      .maybeSingle();

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
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
      reviewed_by: user.id,
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
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, result: data });
  } catch (error: any) {
    console.error("[fighter-review] onverwachte fout:", error);
    return NextResponse.json(
      { error: error?.message || "Melding beoordelen mislukt." },
      { status: 500 },
    );
  }
}
