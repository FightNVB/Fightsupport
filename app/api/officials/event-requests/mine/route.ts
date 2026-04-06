import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  try {
    const auth = await requireUserWithRole(req, ["official", "hoofdofficial", "admin", "superadmin"]);
    const userId = String((auth as any)?.user?.id ?? "").trim();

    const { data, error } = await supabase
      .from("event_requests")
      .select("id, naam, datum, locatie, bondteam, disciplines, promotor_name, status, opmerking_admin")
      .eq("toegewezen_hoofdofficial_user_id", userId)
      .in("status", ["verzonden_naar_official", "geaccepteerd", "afgewezen"])
      .order("datum", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Laden mislukt" }, { status: 500 });
  }
}
