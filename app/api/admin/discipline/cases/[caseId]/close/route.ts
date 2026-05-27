import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(_req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  try {
    const { caseId } = await ctx.params;

    const { data, error } = await supabase
      .from("discipline_cases")
      .update({ status: "afgerond", afgerond_op: new Date().toISOString() })
      .eq("id", caseId)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, case: data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
