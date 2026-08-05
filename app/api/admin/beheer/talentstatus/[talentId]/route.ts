import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/talentstatusAdmin";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ talentId: string }> }) {
  await requireAdmin(req);
  const { talentId } = await ctx.params;
  const { data, error } = await supabaseAdmin
    .from("v_talentstatus_vechters_overzicht")
    .select("*")
    .eq("id", talentId)
    .single();

  if (error) return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 404 });

  const { data: partijen, error: pErr } = await supabaseAdmin
    .from("v_talentstatus_partijen_overzicht")
    .select("*")
    .or(`vechter_id.eq.${talentId},tegenstander_id.eq.${talentId}`)
    .order("event_datum", { ascending: false, nullsFirst: false });

  if (pErr) return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  return NextResponse.json({ ok: true, item: data, partijen: partijen ?? [] });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ talentId: string }> }) {
  await requireAdmin(req);
  const { talentId } = await ctx.params;
  const body = await req.json();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ["talent_status", "status", "evaluatie_resultaat", "evaluatie_opmerking", "opmerkingen", "is_actief"]) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  if (body.talent_status === "definitief" || body.talent_status === "afgewezen") {
    patch.geevalueerd_op = new Date().toISOString();
    patch.status = body.talent_status === "definitief" ? "definitief" : "afgewezen";
  }

  const { data, error } = await supabaseAdmin.from("talentstatus_vechters").update(patch).eq("id", talentId).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}
