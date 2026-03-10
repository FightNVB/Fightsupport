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

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  await requireAdmin(req);

  try {
    const id = ctx.params.id;
    const body = await req.json().catch(() => ({}));

    const patch: any = {};
    if (body.alias_text !== undefined) patch.alias_text = normAlias(body.alias_text);
    if (body.sportschool_id !== undefined) patch.sportschool_id = Number(body.sportschool_id);
    if (body.note !== undefined) patch.note = body.note != null ? String(body.note) : null;

    if (patch.alias_text !== undefined && !patch.alias_text) {
      return NextResponse.json({ error: "alias_text_required" }, { status: 400 });
    }
    if (patch.sportschool_id !== undefined && !Number.isFinite(patch.sportschool_id)) {
      return NextResponse.json({ error: "sportschool_id_invalid" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("sportschool_aliases")
      .update(patch)
      .eq("id", id)
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

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  await requireAdmin(req);

  try {
    const id = ctx.params.id;

    const { error } = await supabaseAdmin.from("sportschool_aliases").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
