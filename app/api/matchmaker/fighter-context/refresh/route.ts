import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processMatchmakingFighters } from "@/lib/matchmaker/processMatchmakingFighters";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function s(value: unknown) {
  return String(value ?? "").trim();
}

async function requireUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) throw new Error("Niet ingelogd.");

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    throw new Error(error?.message || "Niet ingelogd.");
  }

  return data.user;
}

async function assertAccess(userId: string, matchmakingId: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmakings")
    .select("id, matchmaker_id, uploaded_by, maker_user_id, huidige_eigenaar_user_id")
    .eq("id", matchmakingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Matchmaking niet gevonden.");

  const allowed = [
    data.matchmaker_id,
    data.uploaded_by,
    data.maker_user_id,
    data.huidige_eigenaar_user_id,
  ]
    .map(s)
    .filter(Boolean);

  if (!allowed.includes(userId)) {
    throw new Error("Geen toegang tot deze matchmaking.");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));

    const matchmakingId = s(body.matchmaking_id);
    const aanmeldingId = s(body.aanmelding_id);

    if (!matchmakingId) throw new Error("matchmaking_id ontbreekt.");
    if (!aanmeldingId) throw new Error("aanmelding_id ontbreekt.");

    await assertAccess(user.id, matchmakingId);

    const processing = await processMatchmakingFighters({
      supabase: supabaseAdmin,
      matchmakingId,
      aanmeldingId,
    });

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      aanmelding_id: aanmeldingId,
      processed: processing.processed,
      controle_run_id: processing.controleRunId,
      rule_hits: processing.hits.length,
      context: processing.contexts[0] ?? null,
    });
  } catch (error: any) {
    console.error("[POST /api/matchmaker/fighter-context/refresh]", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Vechter vernieuwen mislukt." },
      { status: 400 },
    );
  }
}
