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
    const auth = await requireUserWithRole(req, ["promotor", "admin", "superadmin"]);
    const userId = String((auth as any)?.user?.id ?? "").trim();

    const { data, error } = await supabase
      .from("event_requests")
      .select("id, created_at, naam, datum, locatie, bondteam, disciplines, status, voorkeur_hoofdofficial_name, toegewezen_hoofdofficial_name, reactie_official")
      .eq("promotor_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Laden mislukt" }, { status: 500 });
  }
}
