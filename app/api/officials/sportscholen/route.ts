import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader, hasAnyRole, hasAnyRoleFromReq } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  try {
    // ✅ officials only
    await requireUserFromAuthHeader(req);
    const okRole = await hasAnyRoleFromReq(req, ["official", "hoofdofficial", "superadmin", "admin"]);
    if (!okRole) return NextResponse.json({ ok: false, error: "Geen rechten" }, { status: 403 });

    const url = new URL(req.url);
    const q = String(url.searchParams.get("q") ?? "").trim();
    if (!q) return NextResponse.json({ ok: true, rows: [] });

    // simpele ilike op naam/plaats
    const like = `%${q.replace(/%/g, "").replace(/_/g, "").trim()}%`;

    const { data, error } = await supabaseAdmin
      .from("sportscholen")
      .select("sportschool_id, naam, plaats, land, keurmerk_start, keurmerk_einde")
      .or(`naam.ilike.${like},plaats.ilike.${like}`)
      .order("naam", { ascending: true })
      .limit(25);

    if (error) throw error;

    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
