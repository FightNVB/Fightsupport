import { NextRequest, NextResponse } from "next/server";
import { cleanVa, needsTalentstatus, normLand, supabaseAdmin } from "@/lib/talentstatusAdmin";

export const runtime = "nodejs";

async function findTalent(id: string | null, va: string) {
  if (id) {
    const { data } = await supabaseAdmin.from("talentstatus_vechters").select("*").eq("id", id).maybeSingle();
    if (data) return data;
  }
  if (va) {
    const { data } = await supabaseAdmin.from("talentstatus_vechters").select("*").eq("va_nummer", va).maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const va = cleanVa(searchParams.get("va"));

  let query = supabaseAdmin
    .from("v_talentstatus_partijen_overzicht")
    .select("*")
    .order("event_datum", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (va) query = query.or(`vechter_va.eq.${va},tegenstander_va.eq.${va}`);
  if (q.trim()) {
    const term = q.trim();
    query = query.or(`vechter_naam.ilike.%${term}%,tegenstander_naam.ilike.%${term}%,event_naam.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const vechterVa = cleanVa(body.vechter_va);
  const tegenstanderVa = cleanVa(body.tegenstander_va);
  const vechterLand = normLand(body.vechter_land || "NL");
  const tegenstanderLand = normLand(body.tegenstander_land || "NL");

  const v1 = await findTalent(body.vechter_id || null, vechterVa);
  const v2 = await findTalent(body.tegenstander_id || null, tegenstanderVa);

  if (needsTalentstatus(vechterLand) && !v1) {
    return NextResponse.json({ ok: false, error: "Vechter 1 komt uit Nederland en moet eerst in talentstatus-vechters staan." }, { status: 400 });
  }
  if (needsTalentstatus(tegenstanderLand) && !v2) {
    return NextResponse.json({ ok: false, error: "Tegenstander komt uit Nederland en moet eerst in talentstatus-vechters staan." }, { status: 400 });
  }

  const winnaarKeuze = body.winnaar_keuze || "";
  const winnaarNaam =
    winnaarKeuze === "vechter"
      ? (body.vechter_naam || v1?.naam || "")
      : winnaarKeuze === "tegenstander"
        ? (body.tegenstander_naam || v2?.naam || "")
        : (body.winnaar || null);

  const uitslag =
    body.uitslag ||
    (["Onbeslist", "No contest", "Demo"].includes(winnaarKeuze)
      ? winnaarKeuze
      : (winnaarKeuze && body.methode ? `Wint op ${String(body.methode).toLowerCase()}` : null));

  const payload = {
    event_naam: body.event_naam || null,
    event_datum: body.event_datum || null,
    matchmaking_id: body.matchmaking_id || null,
    bout_id: body.bout_id || null,
    partij_nr: body.partij_nr ? Number(body.partij_nr) : null,

    vechter_id: v1?.id || null,
    tegenstander_id: v2?.id || null,

    vechter_naam: body.vechter_naam || v1?.naam || "",
    vechter_sportschool: body.vechter_sportschool || v1?.sportschool || null,
    vechter_va: vechterVa || v1?.va_nummer || null,
    vechter_land: vechterLand,
    vechter_gewicht: body.vechter_gewicht ? Number(body.vechter_gewicht) : null,

    tegenstander_naam: body.tegenstander_naam || v2?.naam || "",
    tegenstander_sportschool: body.tegenstander_sportschool || v2?.sportschool || null,
    tegenstander_va: tegenstanderVa || v2?.va_nummer || null,
    tegenstander_land: tegenstanderLand,
    tegenstander_gewicht: body.tegenstander_gewicht ? Number(body.tegenstander_gewicht) : null,

    winnaar: winnaarNaam || null,
    uitslag,
    status: body.status || "geregistreerd",
    bron: body.bron || "admin",
    opmerkingen: body.opmerkingen || null,
  };

  if (!payload.vechter_naam || !payload.tegenstander_naam) {
    return NextResponse.json({ ok: false, error: "Naam van beide vechters is verplicht." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("talentstatus_partijen").insert(payload).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  for (const fighter of [v1, v2]) {
    if (!fighter) continue;
    const { count } = await supabaseAdmin
      .from("talentstatus_partijen")
      .select("id", { count: "exact", head: true })
      .or(`vechter_id.eq.${fighter.id},tegenstander_id.eq.${fighter.id}`);

    if ((count ?? 0) >= Number(fighter.max_proef_partijen || 3) && fighter.talent_status === "voorlopig") {
      await supabaseAdmin.from("talentstatus_vechters").update({ status: "evaluatie_nodig", updated_at: new Date().toISOString() }).eq("id", fighter.id);
    }
  }

  return NextResponse.json({ ok: true, item: data });
}
