import { NextRequest, NextResponse } from "next/server";
import { cleanVa, supabaseAdmin } from "@/lib/talentstatusAdmin";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ vaNummer: string }> }) {
  await requireAdmin(req);
  const { vaNummer } = await ctx.params;
  const va = cleanVa(vaNummer);
  const { data, error } = await supabaseAdmin
    .from("v_talentstatus_vechter_rapport")
    .select("*")
    .eq("va_nummer", va)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}
