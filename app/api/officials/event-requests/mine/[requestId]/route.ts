import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request, ctx: { params: Promise<{ requestId: string }> }) {
  try {
    const auth = await requireUserWithRole(req, ["official", "hoofdofficial", "admin", "superadmin"]);
    const { requestId } = await ctx.params;

    let query = supabase
      .from("event_requests")
      .select("id, naam, datum, locatie, bondteam, disciplines, promotor_name, promotor_email, opmerking_promotor, opmerking_admin, status")
      .eq("id", requestId);
    if (auth.role !== "admin" && auth.role !== "superadmin") query = query.eq("bondteam", String(auth.bondteam ?? ""));
    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Verzoek niet gevonden" }, { status: 404 });

    return NextResponse.json({ row: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Laden mislukt" }, { status: 500 });
  }
}
