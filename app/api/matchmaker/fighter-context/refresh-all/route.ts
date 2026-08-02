import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { refreshMatchmaking } from "@/lib/matchmaker/terminator";

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
    .select(
      "id, matchmaker_id, uploaded_by, maker_user_id, huidige_eigenaar_user_id, locked_for_editing",
    )
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

  if (data.locked_for_editing === true) {
    throw new Error("Deze matchmaking is vergrendeld.");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body.matchmaking_id);

    if (!matchmakingId) throw new Error("matchmaking_id ontbreekt.");

    await assertAccess(user.id, matchmakingId);

    const terminator = await refreshMatchmaking({
      supabase: supabaseAdmin,
      matchmakingId,
    });

    return NextResponse.json({
      ...terminator,
      refresh_page: true,
      matchmaking_id: matchmakingId,
      processed: terminator.fighter_contexts,
      rebuilt_bouts: terminator.bouts,
    });
  } catch (error: any) {
    console.error("[POST /api/matchmaker/fighter-context/refresh-all]", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Vechterdata vernieuwen mislukt." },
      { status: 400 },
    );
  }
}
