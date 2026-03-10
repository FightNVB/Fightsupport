import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  await requireAdmin(req);

  try {
    const { data, error } = await supabaseAdmin
      .from("account_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return jsonError(e?.message ?? "Server error", 500);
  }
}