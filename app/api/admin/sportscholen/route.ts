import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  await requireAdmin(req);

  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    let query = supabaseAdmin
      .from("sportscholen")
      .select("sportschool_id, naam, plaats, land, keurmerk_start, keurmerk_einde")
      .order("naam", { ascending: true })
      .limit(200);

    if (q) {
      const like = `%${q}%`;
      query = query.or(`naam.ilike.${like},plaats.ilike.${like},land.ilike.${like}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
