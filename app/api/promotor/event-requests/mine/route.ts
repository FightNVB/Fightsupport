import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Laden mislukt";
}

export async function GET(req: Request) {
  try {
    const auth = await requireUserWithRole(req, ["promotor", "admin", "superadmin"]);

    const userId = String(auth?.user?.id ?? "").trim();

    if (!userId) {
      return NextResponse.json({ rows: [] });
    }

    const { data, error } = await supabase
      .from("event_requests")
      .select(
        "id, created_at, naam, datum, locatie, bondteam, disciplines, status, voorkeur_hoofdofficial_name, toegewezen_hoofdofficial_name, reactie_official"
      )
      .eq("promotor_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      rows: Array.isArray(data) ? data : [],
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}