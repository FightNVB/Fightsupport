import { NextRequest, NextResponse } from "next/server";
import { cleanVa, normLand, supabaseAdmin } from "@/lib/talentstatusAdmin";

export const runtime = "nodejs";

type TalentFighter = {
  id: string;
  va_nummer?: string | null;
  talent_status?: string | null;
  status?: string | null;
  partijen_totaal?: number | null;
  max_proef_partijen?: number | null;
  moet_evalueren?: boolean | null;
  [key: string]: unknown;
};

type TalentPartij = {
  id: string;
  bout_id?: string | null;
  vechter_id?: string | null;
  tegenstander_id?: string | null;
  vechter_va?: string | null;
  tegenstander_va?: string | null;
};

type UitslagenResultaat = {
  id: string;
  uitslagen_bout_id?: string | null;
};

type UitslagenBout = {
  id: string;
  klasse?: string | null;
  rood_va?: string | null;
  blauw_va?: string | null;
};

function normalizeVa(value: unknown) {
  return cleanVa(value);
}

function isVoorlopig(value: unknown) {
  return String(value || "").toLowerCase() === "voorlopig";
}

function isJPlus(value: unknown) {
  return String(value || "").trim().toUpperCase() === "J+";
}

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

  const fighters = (data ?? []) as TalentFighter[];

  // 1) Handmatig ingevoerde / doorgeschreven talentstatus-partijen tellen.
  const { data: partijen, error: partijenError } = await supabaseAdmin
    .from("talentstatus_partijen")
    .select("id, bout_id, vechter_id, tegenstander_id, vechter_va, tegenstander_va");

  if (partijenError) {
    return NextResponse.json({ ok: false, error: partijenError.message }, { status: 500 });
  }

  const partijenList = (partijen ?? []) as TalentPartij[];

  // Als een uitslagen-bout al in talentstatus_partijen staat, tellen we hem niet nog eens uit uitslagen_resultaten.
  const talentstatusBoutIds = new Set(
    partijenList
      .map((partij) => String(partij.bout_id || ""))
      .filter(Boolean)
  );

  // 2) Uitslagen tellen via uitslagen_resultaten -> uitslagen_bouts.
  // Belangrijk: klasse staat bij jou in uitslagen_bouts, niet betrouwbaar in uitslagen_resultaten.
  const { data: uitslagen, error: uitslagenError } = await supabaseAdmin
    .from("uitslagen_resultaten")
    .select("id, uitslagen_bout_id")
    .not("uitslagen_bout_id", "is", null);

  if (uitslagenError) {
    return NextResponse.json({ ok: false, error: uitslagenError.message }, { status: 500 });
  }

  const uitslagenList = ((uitslagen ?? []) as UitslagenResultaat[]).filter(
    (uitslag) => uitslag.uitslagen_bout_id && !talentstatusBoutIds.has(String(uitslag.uitslagen_bout_id))
  );

  const uitslagenBoutIds = Array.from(
    new Set(uitslagenList.map((uitslag) => String(uitslag.uitslagen_bout_id || "")).filter(Boolean))
  );

  let uitslagenBoutsList: UitslagenBout[] = [];
  if (uitslagenBoutIds.length > 0) {
    const { data: uitslagenBouts, error: boutsError } = await supabaseAdmin
      .from("uitslagen_bouts")
      .select("id, klasse, rood_va, blauw_va")
      .in("id", uitslagenBoutIds)
      .eq("klasse", "J+");

    if (boutsError) {
      return NextResponse.json({ ok: false, error: boutsError.message }, { status: 500 });
    }

    uitslagenBoutsList = ((uitslagenBouts ?? []) as UitslagenBout[]).filter((bout) => isJPlus(bout.klasse));
  }

  const uitslagenBoutById = new Map(uitslagenBoutsList.map((bout) => [String(bout.id), bout]));

  const items = fighters.map((fighter) => {
    const fighterId = String(fighter.id || "");
    const fighterVa = normalizeVa(fighter.va_nummer);
    const countedKeys = new Set<string>();

    for (const partij of partijenList) {
      const matchById =
        !!fighterId &&
        (String(partij.vechter_id || "") === fighterId || String(partij.tegenstander_id || "") === fighterId);

      const matchByVa =
        !!fighterVa &&
        (normalizeVa(partij.vechter_va) === fighterVa || normalizeVa(partij.tegenstander_va) === fighterVa);

      if (matchById || matchByVa) countedKeys.add(`talentstatus:${partij.id}`);
    }

    for (const uitslag of uitslagenList) {
      if (!fighterVa) continue;
      const boutId = String(uitslag.uitslagen_bout_id || "");
      const bout = uitslagenBoutById.get(boutId);
      if (!bout) continue;

      const matchByVa = normalizeVa(bout.rood_va) === fighterVa || normalizeVa(bout.blauw_va) === fighterVa;
      if (matchByVa) countedKeys.add(`uitslagen_bout:${boutId}`);
    }

    const partijenTotaal = countedKeys.size;
    const maxProefPartijen = Number(fighter.max_proef_partijen || 3);
    const moetEvalueren = partijenTotaal >= maxProefPartijen && isVoorlopig(fighter.talent_status);

    return {
      ...fighter,
      partijen_totaal: partijenTotaal,
      max_proef_partijen: maxProefPartijen,
      moet_evalueren: moetEvalueren,
      status: moetEvalueren ? "evaluatie_nodig" : fighter.status,
    };
  });

  return NextResponse.json({ ok: true, items });
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
