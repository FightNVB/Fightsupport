import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAnyRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request, ctx: { params: Promise<{ requestId: string }> }) {
  try {
    const auth = await requireAnyRole(req, ["official", "hoofdofficial", "admin", "superadmin"]);
    const userId = String((auth as any)?.user?.id ?? "").trim();
    const { requestId } = await ctx.params;

    const { data, error } = await supabase
      .from("event_requests")
      .select("id, naam, datum, locatie, bondteam, disciplines, promotor_name, promotor_email, opmerking_promotor, opmerking_admin, status")
      .eq("id", requestId)
      .eq("toegewezen_hoofdofficial_user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Verzoek niet gevonden" }, { status: 404 });

    return NextResponse.json({ row: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Laden mislukt" }, { status: 500 });
  }
}
