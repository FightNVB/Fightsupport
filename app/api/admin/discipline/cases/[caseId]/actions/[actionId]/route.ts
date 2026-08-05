import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const EDITABLE_ACTION_FIELDS = [
  "actie_type",
  "status",
  "start_datum",
  "eind_datum",
  "punten",
  "omschrijving",
] as const;

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeNullable(value: unknown) {
  if (value === "") return null;
  return value;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ caseId: string; actionId: string }> }) {
  await requireAdmin(req);
  try {
    const { caseId, actionId } = await ctx.params;
    const body = await req.json();
    const patch: Record<string, any> = {};

    for (const key of EDITABLE_ACTION_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) patch[key] = normalizeNullable(body[key]);
    }

    if ("actie_type" in patch) patch.actie_type = cleanText(patch.actie_type);
    if ("omschrijving" in patch) patch.omschrijving = cleanText(patch.omschrijving);
    if ("punten" in patch) patch.punten = Number(patch.punten || 0);

    if (!patch.actie_type || !patch.omschrijving) {
      return NextResponse.json({ ok: false, error: "Actietype en omschrijving zijn verplicht." }, { status: 400 });
    }

    if (patch.status === "afgerond") patch.afgerond_op = new Date().toISOString();
    if ("status" in patch && patch.status !== "afgerond") patch.afgerond_op = null;

    const { data, error } = await supabase
      .from("discipline_actions")
      .update(patch)
      .eq("id", actionId)
      .eq("case_id", caseId)
      .select("*")
      .single();

    if (error) throw error;

    // Bewerkingen aan een vervolgstap mogen het dossier niet automatisch sluiten.
    return NextResponse.json({ ok: true, action: data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ caseId: string; actionId: string }> }) {
  await requireAdmin(req);
  try {
    const { caseId, actionId } = await ctx.params;
    const { error } = await supabase
      .from("discipline_actions")
      .delete()
      .eq("id", actionId)
      .eq("case_id", caseId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  }
}
