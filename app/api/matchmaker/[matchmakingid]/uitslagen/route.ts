import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function normalizeVa(v: unknown) {
  return String(v ?? "").replace(/[^0-9]/g, "").replace(/^0+/, "");
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ matchmakingId: string }> | { matchmakingId: string } },
) {
  try {
    const params = await ctx.params;
    const matchmakingId = String(params?.matchmakingId ?? "").trim();

    if (!matchmakingId) {
      return NextResponse.json({ error: "Ongeldige matchmaking id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("matchmaker_uitslagen_raw")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .order("datum", { ascending: false, nullsFirst: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []).map((r: any) => ({
      ...r,
      va_nummer: normalizeVa(r?.va_nummer),
    }));

    return NextResponse.json({
      matchmaker_uitslagen_raw: rows,
      uitslagen: rows,
      count: rows.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Uitslagen laden mislukt" },
      { status: 500 },
    );
  }
}
