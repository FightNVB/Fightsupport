import { NextRequest, NextResponse } from "next/server";
import { cleanVa, needsTalentstatus, normLand, supabaseAdmin } from "@/lib/talentstatusAdmin";

export const runtime = "nodejs";

type AnyRow = Record<string, any>;

function cleanText(v: any) {
  return String(v ?? "").trim();
}

function sameId(a: any, b: any) {
  return cleanText(a) && cleanText(a) === cleanText(b);
}

async function findTalent(id: string | null, va: string) {
  if (id) {
    const { data } = await supabaseAdmin
      .from("talentstatus_vechters")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (data) return data;
  }

  if (va) {
    const { data } = await supabaseAdmin
      .from("talentstatus_vechters")
      .select("*")
      .eq("va_nummer", va)
      .maybeSingle();
    if (data) return data;
  }

  return null;
}

function normalizeManualPartij(p: AnyRow) {
  return {
    ...p,
    id: `talentstatus-${p.id}`,
    source_id: p.id,
    source_type: "talentstatus_partijen",
    klasse: "J+",
    methode: p.uitslag || null,
  };
}

function normalizeUitslagenBout(ub: AnyRow, resultaat?: AnyRow | null, matchmaking?: AnyRow | null) {
  const winnaarHoek = cleanText(resultaat?.winnaar_hoek).toLowerCase();
  const winnaar =
    winnaarHoek === "rood"
      ? ub.rood_naam
      : winnaarHoek === "blauw"
        ? ub.blauw_naam
        : resultaat?.winnaar_hoek || null;

  return {
    id: `uitslagen-${ub.id}`,
    source_id: ub.id,
    source_type: "uitslagen_bouts",
    event_naam: matchmaking?.naam || null,
    event_datum: matchmaking?.datum || null,
    matchmaking_id: ub.matchmaking_id || null,
    bout_id: ub.id,
    partij_nr: ub.partij_nr,

    vechter_id: null,
    tegenstander_id: null,

    vechter_naam: ub.rood_naam || "",
    vechter_sportschool: ub.rood_gym || null,
    vechter_va: ub.rood_va || null,
    vechter_land: "NL",
    vechter_gewicht: ub.rood_gewicht_gewogen ?? ub.rood_gewicht_opgegeven ?? null,

    tegenstander_naam: ub.blauw_naam || "",
    tegenstander_sportschool: ub.blauw_gym || null,
    tegenstander_va: ub.blauw_va || null,
    tegenstander_land: "NL",
    tegenstander_gewicht: ub.blauw_gewicht_gewogen ?? ub.blauw_gewicht_opgegeven ?? null,

    winnaar,
    uitslag: resultaat?.methode || null,
    methode: resultaat?.methode || null,
    status: resultaat?.uitslag_status || ub.eindstatus || "geregistreerd",
    bron: "uitslagen_bouts",
    opmerkingen: resultaat?.opmerkingen || ub.weging_notitie || null,
    klasse: ub.klasse || "J+",
    created_at: resultaat?.created_at || ub.created_at || null,
    updated_at: resultaat?.updated_at || ub.created_at || null,
  };
}

function matchesSearch(p: AnyRow, q: string) {
  const term = q.trim().toLowerCase();
  if (!term) return true;

  return [
    p.event_naam,
    p.vechter_naam,
    p.vechter_sportschool,
    p.vechter_va,
    p.tegenstander_naam,
    p.tegenstander_sportschool,
    p.tegenstander_va,
    p.partij_nr,
  ]
    .map((v) => cleanText(v).toLowerCase())
    .some((v) => v.includes(term));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const va = cleanVa(searchParams.get("va"));

  // Handmatig ingeboekte talentstatus-partijen.
  // Let op: talentstatus_partijen heeft GEEN kolom klasse. Alles in deze tabel is talentstatus/J+ context.
  const manualQuery = supabaseAdmin
    .from("talentstatus_partijen")
    .select("*")
    .order("event_datum", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const { data: manualRows, error: manualError } = await manualQuery;
  if (manualError) {
    return NextResponse.json({ ok: false, error: manualError.message }, { status: 500 });
  }

  const manualItems = (manualRows ?? []).map(normalizeManualPartij);
  const manualBoutIds = new Set(
    manualItems
      .map((p) => cleanText(p.bout_id))
      .filter(Boolean)
  );

  // Automatische J+ partijen uit uitslagen_bouts.
  // Klasse staat alleen hier, dus alleen hier filteren we exact op J+.
  let boutsQuery = supabaseAdmin
    .from("uitslagen_bouts")
    .select("*")
    .eq("klasse", "J+")
    .eq("verwijderd", false)
    .order("created_at", { ascending: false });

  if (va) {
    boutsQuery = boutsQuery.or(`rood_va.eq.${va},blauw_va.eq.${va}`);
  }

  const { data: boutRows, error: boutsError } = await boutsQuery;
  if (boutsError) {
    return NextResponse.json({ ok: false, error: boutsError.message }, { status: 500 });
  }

  const boutIds = (boutRows ?? []).map((b) => b.id).filter(Boolean);
  const matchmakingIds = Array.from(
    new Set((boutRows ?? []).map((b) => cleanText(b.matchmaking_id)).filter(Boolean))
  );

  let resultatenByBoutId = new Map<string, AnyRow>();
  let matchmakingsById = new Map<string, AnyRow>();

  if (boutIds.length > 0) {
    const { data: resultaten, error: resultatenError } = await supabaseAdmin
      .from("uitslagen_resultaten")
      .select("id,uitslagen_bout_id,uitslag_status,winnaar_hoek,methode,opmerkingen,created_at,updated_at")
      .in("uitslagen_bout_id", boutIds);

    if (resultatenError) {
      return NextResponse.json({ ok: false, error: resultatenError.message }, { status: 500 });
    }

    resultatenByBoutId = new Map(
      (resultaten ?? []).map((r) => [String(r.uitslagen_bout_id), r])
    );
  }

  // Geen embedded select gebruiken: uitslagen_bouts.matchmaking_id heeft bij jou geen FK-relatie in de Supabase schema cache.
  // Daarom halen we matchmakings los op en koppelen we ze hieronder in TypeScript.
  if (matchmakingIds.length > 0) {
    const { data: matchmakings, error: matchmakingsError } = await supabaseAdmin
      .from("matchmakings")
      .select("id,naam,datum")
      .in("id", matchmakingIds);

    if (matchmakingsError) {
      return NextResponse.json({ ok: false, error: matchmakingsError.message }, { status: 500 });
    }

    matchmakingsById = new Map(
      (matchmakings ?? []).map((m) => [String(m.id), m])
    );
  }

  const uitslagenItems = (boutRows ?? [])
    .filter((ub) => !manualBoutIds.has(cleanText(ub.id)))
    .map((ub) =>
      normalizeUitslagenBout(
        ub,
        resultatenByBoutId.get(String(ub.id)),
        matchmakingsById.get(String(ub.matchmaking_id))
      )
    );

  let items = [...manualItems, ...uitslagenItems];

  if (va) {
    items = items.filter((p) => sameId(p.vechter_va, va) || sameId(p.tegenstander_va, va));
  }

  if (q.trim()) {
    items = items.filter((p) => matchesSearch(p, q));
  }

  items.sort((a, b) => {
    const ad = cleanText(a.event_datum || a.created_at);
    const bd = cleanText(b.event_datum || b.created_at);
    return bd.localeCompare(ad);
  });

  return NextResponse.json({ ok: true, items });
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

  // Let op: talentstatus_partijen heeft GEEN kolom klasse.
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

  const { data, error } = await supabaseAdmin
    .from("talentstatus_partijen")
    .insert(payload)
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  for (const fighter of [v1, v2]) {
    if (!fighter) continue;

    const { count } = await supabaseAdmin
      .from("talentstatus_partijen")
      .select("id", { count: "exact", head: true })
      .or(`vechter_id.eq.${fighter.id},tegenstander_id.eq.${fighter.id}`);

    if ((count ?? 0) >= Number(fighter.max_proef_partijen || 3) && fighter.talent_status === "voorlopig") {
      await supabaseAdmin
        .from("talentstatus_vechters")
        .update({ status: "evaluatie_nodig", updated_at: new Date().toISOString() })
        .eq("id", fighter.id);
    }
  }

  return NextResponse.json({ ok: true, item: data });
}
