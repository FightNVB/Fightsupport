import { NextRequest, NextResponse } from "next/server";
import { cleanVa, normLand, supabaseAdmin } from "@/lib/talentstatusAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "alles";

  let query = supabaseAdmin
    .from("v_talentstatus_vechters_overzicht")
    .select("*")
    .order("created_at", { ascending: false });

  if (status !== "alles") query = query.eq("status", status);
  if (q.trim()) {
    const term = q.trim();
    query = query.or(`naam.ilike.%${term}%,va_nummer.ilike.%${term}%,sportschool.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const va_nummer = cleanVa(body.va_nummer);
  const naam = String(body.naam || body.vechter_naam || "").trim();
  const land = normLand(body.land || "NL");

  if (!naam) return NextResponse.json({ ok: false, error: "Naam ontbreekt." }, { status: 400 });
  if (land === "NL" && !va_nummer) return NextResponse.json({ ok: false, error: "Nederlandse J+ vechter moet een VA-nummer hebben." }, { status: 400 });

  const payload = {
    va_nummer: va_nummer || null,
    naam,
    geboortedatum: body.geboortedatum || null,
    geslacht: body.geslacht || null,
    sportschool: body.sportschool || null,
    hoofdcontact: body.hoofdcontact || null,
    hoofdcontact_email: body.hoofdcontact_email || null,
    hoofdcontact_telefoon: body.hoofdcontact_telefoon || null,
    land,
    klasse: "J+",
    talent_status: body.talent_status || "voorlopig",
    status: body.status || "actief",
    max_proef_partijen: Number(body.max_proef_partijen || 3),
    admin_bevestigd: true,
    admin_bevestigd_op: new Date().toISOString(),
    opmerkingen: body.opmerkingen || null,
  };

  let data = null;
  let error = null;

  if (va_nummer) {
    const existing = await supabaseAdmin
      .from("talentstatus_vechters")
      .select("id")
      .eq("va_nummer", va_nummer)
      .maybeSingle();

    if (existing.error) {
      error = existing.error;
    } else if (existing.data?.id) {
      const updated = await supabaseAdmin
        .from("talentstatus_vechters")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existing.data.id)
        .select("*")
        .single();
      data = updated.data;
      error = updated.error;
    } else {
      const inserted = await supabaseAdmin
        .from("talentstatus_vechters")
        .insert(payload)
        .select("*")
        .single();
      data = inserted.data;
      error = inserted.error;
    }
  } else {
    const inserted = await supabaseAdmin
      .from("talentstatus_vechters")
      .insert(payload)
      .select("*")
      .single();
    data = inserted.data;
    error = inserted.error;
  }

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}
