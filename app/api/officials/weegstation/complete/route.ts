import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWeegstationAuthContext } from "@/lib/weegstation/routeAuth";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmakingId);

    if (!matchmakingId) {
      return NextResponse.json(
        { error: "matchmakingId ontbreekt." },
        { status: 400 }
      );
    }

    const auth = await getWeegstationAuthContext(req, matchmakingId);
    const nowIso = new Date().toISOString();

    const { error: mmErr } = await supabaseAdmin
      .from("matchmakings")
      .update({
        stadium: "in_weegstation",
        entered_weegstation_at: nowIso,
        last_updated_at: nowIso,
        last_updated_by: auth.userId,
      })
      .eq("id", matchmakingId);

    if (mmErr) throw mmErr;

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      stadium: "in_weegstation",
      message: "Weegstation is gestart.",
    });
  } catch (err: any) {
    console.error("weegstation/complete POST error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Starten van weegstation mislukt." },
      { status: 500 }
    );
  }
}
