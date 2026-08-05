import { NextRequest, NextResponse } from "next/server";
import { cleanVa, supabaseAdmin } from "@/lib/talentstatusAdmin";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "partijen";
  const va = cleanVa(searchParams.get("va"));

  if (type === "vechter" && va) {
    const { data, error } = await supabaseAdmin
      .from("v_talentstatus_vechter_rapport")
      .select("*")
      .eq("va_nummer", va)
      .maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
    return NextResponse.json({ ok: true, item: data });
  }

  const { data, error } = await supabaseAdmin
    .from(type === "vechters" ? "v_talentstatus_vechters_overzicht" : "v_talentstatus_partijen_overzicht")
    .select("*")
    .order(type === "vechters" ? "naam" : "event_datum", { ascending: type === "vechters", nullsFirst: false });

  if (error) return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}
