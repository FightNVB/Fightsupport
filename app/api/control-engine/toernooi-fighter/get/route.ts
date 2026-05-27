// app/api/control-engine/toernooi-fighter/get/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
} from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function upper(v: unknown) {
  return s(v).toUpperCase();
}

function first(...vals: unknown[]) {
  for (const v of vals) {
    const x = s(v);
    if (x) return x;
  }
  return null;
}

function n(v: unknown): number | null {
  if (v == null || v === "") return null;
  const x = Number(String(v).replace(",", "."));
  return Number.isFinite(x) ? x : null;
}

function raw(row: any) {
  const r = row?.raw_json;
  if (!r) return {};
  if (typeof r === "object") return r;
  try {
    return JSON.parse(String(r));
  } catch {
    return {};
  }
}

function nameFrom(row: any, hoek: "rood" | "blauw") {
  const r = raw(row);
  const voor = first(row?.[`${hoek}_voornaam`], r?.[`${hoek}_voornaam`], r?.[hoek]?.voornaam);
  const achter = first(row?.[`${hoek}_achternaam`], r?.[`${hoek}_achternaam`], r?.[hoek]?.achternaam);
  const full = [voor, achter].filter(Boolean).join(" ").trim();
  return first(row?.[`${hoek}_naam`], r?.[`${hoek}_naam`], r?.[hoek]?.naam, full);
}

function fighterFromBout(row: any, hoek: "rood" | "blauw", toernooi_code: string) {
  const r = raw(row);
  const va = first(
    row?.[`${hoek}_va`],
    row?.[`${hoek}_va_nummer`],
    row?.[`${hoek}_fighter_id`],
    r?.[`${hoek}_va`],
    r?.[`${hoek}_va_nummer`],
    r?.[hoek]?.va,
    r?.[hoek]?.va_nummer,
    r?.[hoek]?.fighter_id,
  );
  const naam = nameFrom(row, hoek);
  if (!va && !naam) return null;

  return {
    id: first(row?.id, row?.bout_uid, `${hoek}-${va ?? naam}`),
    fighter_id: va ?? `${hoek}-${naam}`,
    va_nummer: va,
    toernooi_code,
    naam,
    naam_fp: first(r?.[hoek]?.naam_fp, r?.[`${hoek}_naam_fp`], r?.[hoek]?.fp_naam),
    sportschool: first(
      row?.[`${hoek}_gym`],
      row?.[`${hoek}_sportschool`],
      r?.[`${hoek}_gym`],
      r?.[`${hoek}_sportschool`],
      r?.[hoek]?.gym,
      r?.[hoek]?.sportschool,
    ),
    sportschool_fp: first(r?.[hoek]?.sportschool_fp, r?.[hoek]?.gym_fp),
    gewicht: n(first(row?.[`${hoek}_gewicht`], r?.[`${hoek}_gewicht`], r?.[hoek]?.gewicht, row?.max_gewicht)),
    leeftijd: n(first(row?.[`${hoek}_leeftijd`], r?.[`${hoek}_leeftijd`], r?.[hoek]?.leeftijd, r?.[hoek]?.leeftijd_event)),
    geslacht: first(row?.[`${hoek}_geslacht`], r?.[`${hoek}_geslacht`], r?.[hoek]?.geslacht, r?.[hoek]?.gender),
    licentie: r?.[hoek]?.licentie ?? r?.[`${hoek}_licentie`] ?? null,
    heeft_startverbod: r?.[hoek]?.heeft_startverbod ?? r?.[`${hoek}_heeft_startverbod`] ?? null,
    keurmerk: r?.[hoek]?.keurmerk ?? r?.[`${hoek}_keurmerk`] ?? null,
  };
}

function mergeFighter(base: any, extra: any) {
  return {
    ...base,
    naam: first(base?.naam, extra?.naam, extra?.naam_fp, extra?.fp_naam, extra?.volledige_naam),
    naam_fp: first(base?.naam_fp, extra?.naam_fp, extra?.fp_naam),
    sportschool: first(base?.sportschool, extra?.sportschool, extra?.gym, extra?.sportschool_naam),
    sportschool_fp: first(base?.sportschool_fp, extra?.sportschool_fp, extra?.gym_fp),
    gewicht: base?.gewicht ?? n(extra?.gewicht ?? extra?.gewicht_fp ?? extra?.gewicht_mm),
    leeftijd: base?.leeftijd ?? n(extra?.leeftijd_event ?? extra?.leeftijd ?? extra?.leeftijd_mm),
    geslacht: first(base?.geslacht, extra?.geslacht, extra?.gender),
    licentie: base?.licentie ?? extra?.licentie ?? extra?.licentie_ok ?? extra?.licentie_geldig ?? null,
    heeft_startverbod: base?.heeft_startverbod ?? extra?.heeft_startverbod ?? extra?.startverbod_actief ?? null,
    keurmerk: base?.keurmerk ?? extra?.keurmerk ?? extra?.sportschool_keurmerk ?? null,
  };
}

async function trySelect(table: string, matchmaking_id: string) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("matchmaking_id", matchmaking_id);

  if (error) {
    console.warn(`[toernooi-fighter/get] ${table} niet bruikbaar`, error);
    return [] as any[];
  }
  return data ?? [];
}

export async function GET(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req);
    const url = new URL(req.url);
    const matchmaking_id = s(url.searchParams.get("matchmaking_id"));
    const toernooi_code = upper(url.searchParams.get("toernooi_code"));

    if (!matchmaking_id) return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    if (!toernooi_code) return NextResponse.json({ error: "toernooi_code ontbreekt" }, { status: 400 });

    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    // Bron van waarheid voor deelnemers: matchmaking_bouts_raw.toernooi_code.
    const boutRowsAll = await trySelect("matchmaking_bouts_raw", matchmaking_id);
    const boutRows = boutRowsAll.filter((r) => upper(r?.toernooi_code) === toernooi_code);

    const fighterMap = new Map<string, any>();
    for (const row of boutRows) {
      for (const hoek of ["rood", "blauw"] as const) {
        const f = fighterFromBout(row, hoek, toernooi_code);
        if (!f) continue;
        const key = first(f.va_nummer, f.fighter_id, f.naam);
        if (!key) continue;
        fighterMap.set(key, fighterMap.has(key) ? mergeFighter(fighterMap.get(key), f) : f);
      }
    }

    // Meldingen horen door de rulesEngine met deze toernooi_code terug te komen.
    // controle_resultaten blijft leidend; matchmaker_fighter_resultaten is fallback voor oudere checks.
    const controleResultaten = await trySelect("controle_resultaten", matchmaking_id);
    const matchmakerResultaten = await trySelect("matchmaker_fighter_resultaten", matchmaking_id);
    const allMeldingen = [...controleResultaten, ...matchmakerResultaten];
    const meldingen = allMeldingen.filter((r: any) => {
      const tc = upper(r?.toernooi_code);
      if (tc) return tc === toernooi_code;
      const va = first(r?.toernooi_va_nummer, r?.va_nummer, r?.fighter_id, r?.inschrijving_id);
      return va ? fighterMap.has(va) : false;
    });

    // Als er een melding is voor een VA die nog niet uit bouts kwam, toch tonen.
    for (const m of meldingen) {
      const va = first(m?.toernooi_va_nummer, m?.va_nummer, m?.fighter_id);
      if (!va || fighterMap.has(va)) continue;
      fighterMap.set(va, {
        id: va,
        fighter_id: va,
        va_nummer: va,
        toernooi_code,
        naam: first(m?.naam, m?.fighter_naam, m?.fp_naam),
        naam_fp: first(m?.naam_fp, m?.fp_naam),
        sportschool: first(m?.sportschool, m?.gym),
        sportschool_fp: first(m?.sportschool_fp, m?.gym_fp),
        gewicht: n(m?.gewicht),
        leeftijd: n(m?.leeftijd_event ?? m?.leeftijd),
        geslacht: first(m?.geslacht, m?.gender),
        licentie: null,
        heeft_startverbod: null,
        keurmerk: null,
      });
    }

    let fighters = [...fighterMap.values()];

    // Verrijking met matchmaker_fighters_raw/fighters_raw, zonder afhankelijk te zijn van context.
    const vaList = [...new Set(fighters.flatMap((f) => [s(f?.fighter_id), s(f?.va_nummer)]).filter(Boolean))];
    if (vaList.length) {
      const rawSources = [
        ...(await trySelect("matchmaker_fighters_raw", matchmaking_id)),
        ...(await trySelect("fighters_raw", matchmaking_id)),
      ];
      const byVa = new Map<string, any>();
      for (const r of rawSources) {
        const keys = [
          first(r?.va_nummer, r?.fighter_id, r?.va, r?.fightpaspoort_nummer),
          first(r?.id),
        ].filter(Boolean) as string[];
        for (const key of keys) byVa.set(key, r);
      }
      fighters = fighters.map((f) => {
        const extra = byVa.get(s(f?.va_nummer)) ?? byVa.get(s(f?.fighter_id));
        return extra ? mergeFighter(f, extra) : f;
      });
    }

    fighters.sort((a, b) => s(a?.naam ?? a?.naam_fp).localeCompare(s(b?.naam ?? b?.naam_fp), "nl"));

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      toernooi_code,
      source: {
        fighters_from_matchmaking_bouts_raw: boutRows.length,
        meldingen: meldingen.length,
      },
      fighters,
      meldingen,
      matchmaking_bouts_raw: boutRows,
    });
  } catch (e: any) {
    console.error("[toernooi-fighter/get]", e);
    return NextResponse.json({ error: e?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
