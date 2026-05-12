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
  { auth: { persistSession: false } }
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

function normalizeFighterFromContext(r: any, toernooi_code: string) {
  const va = first(r?.toernooi_va_nummer, r?.va_nummer, r?.fighter_id, r?.va, r?.fightpaspoort_nummer);
  const fighterId = first(r?.fighter_id, va) ?? "";

  return {
    id: r?.id ?? fighterId,
    fighter_id: fighterId,
    va_nummer: va,
    toernooi_code: upper(r?.toernooi_code) || toernooi_code,
    naam: first(r?.naam, r?.naam_mm, r?.naam_fp, r?.fp_naam, r?.volledige_naam),
    naam_fp: first(r?.naam_fp, r?.fp_naam),
    sportschool: first(r?.sportschool, r?.gym, r?.sportschool_mm, r?.gym_mm),
    sportschool_fp: first(r?.sportschool_fp, r?.gym_fp),
    gewicht: n(r?.gewicht ?? r?.gewicht_mm ?? r?.gewicht_fp),
    leeftijd: n(r?.leeftijd_event ?? r?.leeftijd ?? r?.leeftijd_mm),
    geslacht: first(r?.geslacht, r?.gender),
    licentie: r?.licentie ?? r?.licentie_ok ?? r?.licentie_geldig ?? null,
    heeft_startverbod: r?.heeft_startverbod ?? r?.startverbod_actief ?? null,
    keurmerk: r?.keurmerk ?? r?.sportschool_keurmerk ?? null,
  };
}

function normalizeFighterFromResult(r: any, toernooi_code: string) {
  const va = first(r?.toernooi_va_nummer, r?.fighter_id);
  const fighterId = first(r?.fighter_id, va) ?? "";

  return {
    id: fighterId,
    fighter_id: fighterId,
    va_nummer: va,
    toernooi_code,
    naam: null as string | null,
    naam_fp: null as string | null,
    sportschool: null as string | null,
    sportschool_fp: null as string | null,
    gewicht: null as number | null,
    leeftijd: null as number | null,
    geslacht: null as string | null,
    licentie: null as string | boolean | null,
    heeft_startverbod: null as boolean | null,
    keurmerk: null as string | boolean | null,
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

export async function GET(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req);

    const url = new URL(req.url);
    const matchmaking_id = s(url.searchParams.get("matchmaking_id"));
    const toernooi_code = upper(url.searchParams.get("toernooi_code"));

    if (!matchmaking_id) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    }
    if (!toernooi_code) {
      return NextResponse.json({ error: "toernooi_code ontbreekt" }, { status: 400 });
    }

    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    // 1) Meldingen zijn leidend voor deze overzichtspagina.
    // Daarom eerst controle_resultaten lezen, zodat de pagina ook werkt als
    // controle_toernooi_context nog leeg/niet goed gevuld is.
    const { data: rawMeldingen, error: meldErr } = await supabase
      .from("controle_resultaten")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .order("created_at", { ascending: false });

    if (meldErr) throw meldErr;

    const meldingen = (rawMeldingen ?? []).filter(
      (r: any) => upper(r?.toernooi_code) === toernooi_code
    );

    // 2) Eerst proberen deelnemers uit controle_toernooi_context te halen.
    // Dit is de mooiste bron wanneer build/enrich goed gevuld heeft.
    let contextRows: any[] = [];
    const { data: rawContext, error: contextErr } = await supabase
      .from("controle_toernooi_context")
      .select("*")
      .eq("matchmaking_id", matchmaking_id);

    // Als tabel/kolommen ooit tijdelijk verschillen, mag de overzichtspagina niet stuk gaan.
    if (!contextErr) {
      contextRows = (rawContext ?? []).filter(
        (r: any) => upper(r?.toernooi_code) === toernooi_code
      );
    } else {
      console.warn("[toernooi-fighter/get] controle_toernooi_context niet bruikbaar", contextErr);
    }

    const fighterMap = new Map<string, any>();

    for (const row of contextRows) {
      const f = normalizeFighterFromContext(row, toernooi_code);
      const key = first(f.fighter_id, f.va_nummer);
      if (!key) continue;
      fighterMap.set(key, f);
    }

    // 3) Fallback: als context leeg is of deelnemers mist, deelnemers afleiden uit controle_resultaten.
    for (const m of meldingen) {
      const f = normalizeFighterFromResult(m, toernooi_code);
      const key = first(f.fighter_id, f.va_nummer);
      if (!key) continue;
      if (!fighterMap.has(key)) fighterMap.set(key, f);
    }

    let fighters = [...fighterMap.values()];

    // 4) Extra verrijken uit fighters_raw waar mogelijk.
    // We gebruiken select('*') zodat dit niet breekt op kolomnamen die per versie verschillen.
    const vaList = fighters
      .flatMap((f) => [s(f?.fighter_id), s(f?.va_nummer)])
      .filter(Boolean);

    if (vaList.length > 0) {
      const uniqueVa = [...new Set(vaList)];
      const { data: rawFighters, error: fightersRawErr } = await supabase
        .from("fighters_raw")
        .select("*")
        .eq("matchmaking_id", matchmaking_id);

      if (!fightersRawErr) {
        const rawByVa = new Map<string, any>();
        for (const r of rawFighters ?? []) {
          const keys = [
            first(r?.va_nummer, r?.fighter_id, r?.va, r?.fightpaspoort_nummer),
            first(r?.id),
          ].filter(Boolean) as string[];
          for (const key of keys) rawByVa.set(key, r);
        }

        fighters = fighters.map((f) => {
          const raw = rawByVa.get(s(f?.fighter_id)) ?? rawByVa.get(s(f?.va_nummer));
          return raw ? mergeFighter(f, raw) : f;
        });
      } else {
        console.warn("[toernooi-fighter/get] fighters_raw niet bruikbaar", fightersRawErr);
      }

      // 5) Uitslagen ophalen op VA/fighter id. Niet op toernooi_context vertrouwen.
      const { data: rawUitslagen, error: uitsErr } = await supabase
        .from("controle_uitslagen")
        .select("*")
        .eq("matchmaking_id", matchmaking_id)
        .in("va_nummer", uniqueVa)
        .order("datum", { ascending: false });

      if (uitsErr) throw uitsErr;

      const uitslagen = (rawUitslagen ?? []).filter((r: any) => {
        const tc = upper(r?.toernooi_code);
        return !tc || tc === toernooi_code;
      });

      return NextResponse.json({
        ok: true,
        matchmaking_id,
        toernooi_code,
        source: {
          fighters_from_context: contextRows.length,
          fighters_from_resultaten: fighters.length,
          meldingen: meldingen.length,
          uitslagen: uitslagen.length,
        },
        fighters,
        meldingen,
        uitslagen,
      });
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      toernooi_code,
      source: {
        fighters_from_context: contextRows.length,
        fighters_from_resultaten: fighters.length,
        meldingen: meldingen.length,
        uitslagen: 0,
      },
      fighters,
      meldingen,
      uitslagen: [],
    });
  } catch (e: any) {
    console.error("[toernooi-fighter/get]", e);
    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}
