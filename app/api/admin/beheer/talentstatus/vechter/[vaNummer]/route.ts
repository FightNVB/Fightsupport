import { NextRequest, NextResponse } from "next/server";
import { cleanVa, supabaseAdmin } from "@/lib/talentstatusAdmin";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ vaNummer: string }> }) {
  const { vaNummer } = await ctx.params;
  const va = cleanVa(vaNummer);
  const { data, error } = await supabaseAdmin
    .from("v_talentstatus_vechter_rapport")
    .select("*")
    .eq("va_nummer", va)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}
