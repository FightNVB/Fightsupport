import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function normAlias(s: any) {
  return String(s ?? "").trim();
}

export async function GET(req: Request) {
  await requireAdmin(req);

  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);

    let query = supabaseAdmin
      .from("sportschool_aliases")
      .select(
        `
        id,
        alias_text,
        sportschool_id,
        note,
        created_at,
        updated_at,
        sportscholen (
          sportschool_id,
          naam,
          plaats,
          land,
          keurmerk_start,
          keurmerk_einde
        )
      `
      )
      .order("alias_text", { ascending: true })
      .limit(limit);

    if (q) {
      const like = `%${q}%`;
      query = query.or(`alias_text.ilike.${like},note.ilike.${like}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await requireAdmin(req);

  try {
    const body = await req.json().catch(() => ({}));
    const alias_text = normAlias(body.alias_text);
    const sportschool_id = Number(body.sportschool_id);
    const note = body.note != null ? String(body.note) : null;

    if (!alias_text) return NextResponse.json({ error: "alias_text_required" }, { status: 400 });
    if (!Number.isFinite(sportschool_id))
      return NextResponse.json({ error: "sportschool_id_required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("sportschool_aliases")
      .insert([{ alias_text, sportschool_id, note }])
      .select("id, alias_text, sportschool_id, note, created_at, updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, row: data });
  } catch (e: any) {
    const msg = String(e?.message ?? "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json({ error: "alias_exists" }, { status: 409 });
    }
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
