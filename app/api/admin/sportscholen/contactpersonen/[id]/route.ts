import { NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const patch: any = { updated_at: new Date().toISOString() };
    for (const k of ["naam", "email", "rol", "actief"]) if (k in body) patch[k] = body[k];
    const { data, error } = await supabaseAdmin.from("sportschool_contactpersonen").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ row: data });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  try {
    const { id } = await ctx.params;
    const { error } = await supabaseAdmin.from("sportschool_contactpersonen").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
