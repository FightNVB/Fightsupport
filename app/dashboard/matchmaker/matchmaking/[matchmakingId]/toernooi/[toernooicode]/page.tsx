"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { authedFetch } from "@/lib/api/authedFetch";
import { supabase } from "@/lib/supabaseClient";

const ORANGE = "#ff4d00";
const SILVER = "#d8d3cc";
const LOGO_SRC = "/branding/fightsupport/toernooi.png";

type Fighter = {
  id?: string | number | null;
  fighter_id: string;
  va_nummer?: string | null;
  naam: string | null;
  naam_fp?: string | null;
  sportschool: string | null;
  sportschool_fp?: string | null;
  gewicht: number | string | null;
  leeftijd: number | string | null;
  geslacht: string | null;
  licentie?: string | boolean | null;
  heeft_startverbod?: string | boolean | null;
  keurmerk?: string | boolean | null;
  toernooi_code: string | null;
  record?: string | null;
};

type BoutRow = {
  id?: string | number | null;
  bout_uid?: string | null;
  partij_nr?: number | string | null;
  toernooi_code?: string | null;
  max_gewicht?: string | number | null;
  rood_naam?: string | null;
  rood_voornaam?: string | null;
  rood_achternaam?: string | null;
  rood_gym?: string | null;
  rood_sportschool?: string | null;
  rood_va?: string | number | null;
  rood_gewicht?: string | number | null;
  rood_leeftijd?: string | number | null;
  rood_geslacht?: string | null;
  blauw_naam?: string | null;
  blauw_voornaam?: string | null;
  blauw_achternaam?: string | null;
  blauw_gym?: string | null;
  blauw_sportschool?: string | null;
  blauw_va?: string | number | null;
  blauw_gewicht?: string | number | null;
  blauw_leeftijd?: string | number | null;
  blauw_geslacht?: string | null;
  raw_json?: any;
};

type Melding = {
  id: string;
  fighter_id: string | null;
  toernooi_code: string | null;
  toernooi_va_nummer?: string | null;
  resultaat: string | null;
  severity: string | null;
  rule: string | null;
  rule_code: string | null;
  boodschap: string | null;
  review_status?: string | null;
  actie_status?: string | null;
  aantekeningen?: string | null;
  created_at?: string | null;
};

type MeldingCategorie = "licentie" | "startverbod" | "keurmerk" | "vechter";

type MeldingBlock = {
  key: MeldingCategorie;
  title: string;
  subtitle: string;
  empty: string;
  meldingen: Melding[];
};

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function normCode(v: unknown) {
  return String(v ?? "").trim().toUpperCase();
}

function safe(v: unknown, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}


function normalizeVa(v: unknown) {
  return String(v ?? "").replace(/[^0-9]/g, "");
}

function isTruthyValue(v: unknown) {
  const s = norm(v);
  return v === true || ["ja", "yes", "true", "1", "actief"].includes(s);
}

function isFalsyValue(v: unknown) {
  const s = norm(v);
  return v === false || ["nee", "no", "false", "0", "geen", "niet", "n.v.t."].includes(s);
}

function normResultaat(v: unknown): "ok" | "actie" | "afkeur" | "dispensatie" | "verbod" {
  const s = norm(v);
  if (s === "ok" || s === "goedgekeurd") return "ok";
  if (s === "dispensatie") return "dispensatie";
  if (s === "verbod") return "verbod";
  if (s === "afkeur" || s === "afgekeurd") return "afkeur";
  return "actie";
}

function resultLabel(v: unknown) {
  const r = normResultaat(v);
  if (r === "ok") return "OK";
  if (r === "verbod") return "VERBOD";
  if (r === "afkeur") return "AFKEUR";
  if (r === "dispensatie") return "DISPENSATIE";
  return "ACTIE";
}

function resultRank(v: unknown) {
  const r = normResultaat(v);
  if (r === "verbod") return 5;
  if (r === "dispensatie") return 4;
  if (r === "afkeur") return 3;
  if (r === "actie") return 2;
  return 1;
}

function resultStyle(v: unknown) {
  const r = normResultaat(v);
  if (r === "verbod") return { bg: "rgba(127,29,29,0.35)", border: "rgba(248,113,113,0.80)", text: "#fecaca" };
  if (r === "afkeur") return { bg: "rgba(220,38,38,0.18)", border: "rgba(248,113,113,0.65)", text: "#fecaca" };
  if (r === "dispensatie") return { bg: "rgba(147,51,234,0.18)", border: "rgba(216,180,254,0.65)", text: "#e9d5ff" };
  if (r === "ok") return { bg: "rgba(22,163,74,0.14)", border: "rgba(74,222,128,0.52)", text: "#bbf7d0" };
  return { bg: "rgba(255,77,0,0.16)", border: "rgba(255,77,0,0.72)", text: "#fed7aa" };
}

function sameFighter(m: Melding, f: Fighter) {
  const mf = norm(m.fighter_id);
  const mtva = norm(m.toernooi_va_nummer);
  const ff = norm(f.fighter_id);
  const fv = norm(f.va_nummer);
  return (!!mf && (mf === ff || mf === fv)) || (!!mtva && (mtva === ff || mtva === fv));
}

function fighterVa(f: Fighter) {
  return safe(f.va_nummer ?? f.fighter_id);
}

function fighterName(f: Fighter) {
  return safe(f.naam_fp ?? f.naam, "Onbekende deelnemer");
}

function fighterSchool(f: Fighter) {
  return safe(f.sportschool_fp ?? f.sportschool, "Sportschool onbekend");
}

function messageText(m: Melding) {
  return `${m.rule_code ?? ""} ${m.rule ?? ""} ${m.boodschap ?? ""}`.toLowerCase();
}

function meldingCategorie(m: Melding): MeldingCategorie {
  const t = messageText(m);
  if (t.includes("startverbod") || t.includes("start verbod")) return "startverbod";
  if (t.includes("licentie") || t.includes("license")) return "licentie";
  if (t.includes("keurmerk") || t.includes("sportschool") || t.includes("bkbmo") || t.includes("belgi")) return "keurmerk";
  return "vechter";
}

function isOpenMelding(m: Melding) {
  const review = norm(m.review_status);
  const resultaat = normResultaat(m.resultaat);
  return resultaat !== "ok" && (!review || review === "open");
}

function dedupeMeldingen(list: Melding[]) {
  const seen = new Set<string>();
  return list.filter((m) => {
    const key = [norm(m.fighter_id), norm(m.toernooi_va_nummer), norm(m.rule_code), norm(m.boodschap), norm(m.resultaat)].join("_");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function firstArray(json: any, keys: string[]) {
  for (const key of keys) {
    const value = json?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function fullName(first?: unknown, last?: unknown, fallback?: unknown) {
  const combined = `${String(first ?? "").trim()} ${String(last ?? "").trim()}`.trim();
  return combined || safe(fallback, "Onbekende deelnemer");
}

function fighterFromBout(row: BoutRow, hoek: "rood" | "blauw"): Fighter | null {
  const raw = row.raw_json ?? {};
  const prefix = hoek;
  const va = safe((row as any)?.[`${prefix}_va`] ?? raw?.[`${prefix}_va`] ?? raw?.[`${prefix}_va_nummer`] ?? raw?.[prefix]?.va_nummer ?? raw?.[prefix]?.va, "");
  const naam = fullName(
    (row as any)?.[`${prefix}_voornaam`] ?? raw?.[`${prefix}_voornaam`] ?? raw?.[prefix]?.voornaam,
    (row as any)?.[`${prefix}_achternaam`] ?? raw?.[`${prefix}_achternaam`] ?? raw?.[prefix]?.achternaam,
    (row as any)?.[`${prefix}_naam`] ?? raw?.[`${prefix}_naam`] ?? raw?.[prefix]?.naam,
  );
  if (!va && !naam) return null;

  return {
    id: `${row.id ?? row.bout_uid ?? row.partij_nr ?? "bout"}-${prefix}-${va || naam}`,
    fighter_id: va || `${row.id ?? row.bout_uid ?? row.partij_nr ?? "bout"}-${prefix}`,
    va_nummer: va || null,
    naam,
    naam_fp: raw?.[prefix]?.fp_naam ?? raw?.[`${prefix}_fp_naam`] ?? null,
    sportschool: (row as any)?.[`${prefix}_gym`] ?? (row as any)?.[`${prefix}_sportschool`] ?? raw?.[`${prefix}_gym`] ?? raw?.[`${prefix}_sportschool`] ?? raw?.[prefix]?.sportschool ?? null,
    sportschool_fp: raw?.[prefix]?.fp_sportschool ?? raw?.[`${prefix}_fp_sportschool`] ?? null,
    gewicht: (row as any)?.[`${prefix}_gewicht`] ?? raw?.[`${prefix}_gewicht`] ?? raw?.[prefix]?.gewicht ?? row.max_gewicht ?? null,
    leeftijd: (row as any)?.[`${prefix}_leeftijd`] ?? raw?.[`${prefix}_leeftijd`] ?? raw?.[prefix]?.leeftijd ?? null,
    geslacht: (row as any)?.[`${prefix}_geslacht`] ?? raw?.[`${prefix}_geslacht`] ?? raw?.[prefix]?.geslacht ?? null,
    licentie: raw?.[prefix]?.licentie ?? raw?.[`${prefix}_licentie`] ?? null,
    heeft_startverbod: raw?.[prefix]?.heeft_startverbod ?? raw?.[`${prefix}_heeft_startverbod`] ?? null,
    keurmerk: raw?.[prefix]?.keurmerk ?? raw?.[`${prefix}_keurmerk`] ?? null,
    toernooi_code: normCode(row.toernooi_code),
  };
}

function fightersFromMatchmakingBouts(rows: BoutRow[], toernooiCode: string) {
  const seen = new Set<string>();
  const result: Fighter[] = [];
  rows
    .filter((row) => normCode(row.toernooi_code) === toernooiCode)
    .forEach((row) => {
      for (const hoek of ["rood", "blauw"] as const) {
        const f = fighterFromBout(row, hoek);
        if (!f) continue;
        const key = norm(f.va_nummer ?? f.fighter_id ?? f.naam);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        result.push(f);
      }
    });
  return result.sort((a, b) => fighterName(a).localeCompare(fighterName(b), "nl"));
}


function fighterFromToernooiRow(row: any): Fighter | null {
  const va = normalizeVa(row?.va_nummer ?? row?.fighter_id);
  const naam = safe(row?.naam ?? row?.naam_fp ?? row?.naam_mm, "");
  if (!va && !naam) return null;

  return {
    id: row?.id ?? null,
    fighter_id: va || String(row?.fighter_id ?? "").trim(),
    va_nummer: va || null,
    naam: naam || "Onbekende deelnemer",
    naam_fp: row?.naam_fp ?? null,
    sportschool: row?.sportschool ?? row?.sportschool_mm ?? null,
    gewicht: row?.gewicht ?? null,
    leeftijd: row?.leeftijd_event ?? row?.leeftijd ?? null,
    geslacht: row?.geslacht ?? null,
    licentie: row?.licentie ?? null,
    heeft_startverbod: row?.heeft_startverbod ?? null,
    keurmerk: row?.heeft_keurmerk ?? row?.keurmerk ?? null,
    toernooi_code: normCode(row?.toernooi_code),
  };
}

function resultKind(v: unknown): "win" | "loss" | "draw" | "other" {
  const s = norm(v);
  if (s.includes("onbeslist") || s.includes("draw") || s.includes("gelijk")) return "draw";
  if (s.includes("verliest") || s.includes("verlies") || s.includes("verloren") || s.includes("loss") || s === "l") return "loss";
  if (s.includes("wint") || s.includes("winst") || s.includes("gewonnen") || s.includes("win") || s === "w") return "win";
  return "other";
}

function normalizeKlasse(v: unknown) {
  const s = norm(v);
  if (!s) return "";
  if (s.includes("jeugd") || s.includes("youth") || s === "j" || s.startsWith("j ")) return "J";
  if (s.includes("recreant") || s === "r" || s.startsWith("r ")) return "R";
  if (s.includes("nieuweling") || s === "n" || s.startsWith("n ")) return "N";
  if (s.includes("c-klasse") || s.includes("c klasse") || s === "c" || s.startsWith("c ")) return "C";
  if (s.includes("b-klasse") || s.includes("b klasse") || s === "b" || s.startsWith("b ")) return "B";
  if (s.includes("a-klasse") || s.includes("a klasse") || s.includes("elite") || s === "a" || s.startsWith("a ")) return "A";
  return String(v ?? "").trim().toUpperCase();
}

function sameDiscipline(a: unknown, b: unknown) {
  const aa = norm(a);
  const bb = norm(b);
  if (!aa || !bb) return true;
  if (aa === bb) return true;
  if ((aa.includes("kick") || aa.includes("k1")) && (bb.includes("kick") || bb.includes("k1"))) return true;
  if ((aa.includes("thai") || aa.includes("muay")) && (bb.includes("thai") || bb.includes("muay"))) return true;
  return false;
}

function buildCurrentClassRecord(rows: any[], klasse: unknown, discipline: unknown) {
  const targetKlasse = normalizeKlasse(klasse);
  let w = 0;
  let l = 0;
  let d = 0;
  let other = 0;

  for (const row of rows ?? []) {
    if (targetKlasse && normalizeKlasse(row?.klasse) !== targetKlasse) continue;
    if (!sameDiscipline(row?.discipline, discipline)) continue;

    const kind = resultKind(row?.uitslag ?? row?.resultaat ?? row?.outcome);
    if (kind === "win") w++;
    else if (kind === "loss") l++;
    else if (kind === "draw") d++;
    else other++;
  }

  return `${w}-${l}-${d}${other ? ` (${other})` : ""}`;
}

function toMelding(row: any): Melding {
  return {
    id: String(row?.id ?? `${row?.rule_code ?? "rule"}-${row?.va_nummer ?? row?.fighter_id ?? ""}`),
    fighter_id: row?.fighter_id ?? row?.va_nummer ?? null,
    toernooi_code: row?.toernooi_code ?? null,
    toernooi_va_nummer: row?.toernooi_va_nummer ?? row?.va_nummer ?? null,
    resultaat: row?.resultaat ?? null,
    severity: row?.severity ?? null,
    rule: row?.rule ?? null,
    rule_code: row?.rule_code ?? null,
    boodschap: row?.boodschap ?? null,
    review_status: row?.review_status ?? null,
    actie_status: row?.actie_status ?? null,
    aantekeningen: row?.aantekeningen ?? null,
    created_at: row?.created_at ?? null,
  };
}


const pageBg: React.CSSProperties = {
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,77,0,0.20), transparent 30%), radial-gradient(circle at 88% 4%, rgba(245,245,245,0.14), transparent 24%), linear-gradient(180deg, #2d2927 0%, #151313 38%, #050505 100%)",
};

const metalPanel: React.CSSProperties = {
  borderColor: "rgba(216,211,204,0.62)",
  background: "linear-gradient(135deg, rgba(245,245,245,0.16), rgba(62,58,56,0.62) 34%, rgba(8,8,8,0.96))",
  boxShadow: "0 22px 70px rgba(0,0,0,0.72), inset 0 0 0 1px rgba(255,255,255,0.15), inset 0 0 28px rgba(255,255,255,0.05)",
};

const chromeBorder: React.CSSProperties = {
  borderColor: "rgba(216,211,204,0.72)",
  background: "linear-gradient(135deg, rgba(255,255,255,0.18), rgba(82,78,74,0.54), rgba(0,0,0,0.86))",
  boxShadow: "0 16px 44px rgba(0,0,0,0.60), inset 0 0 0 1px rgba(255,255,255,0.18)",
};

export default function ToernooiDetailPage() {
  const params = useParams();
  const router = useRouter();

  const matchmakingId = String(params?.matchmakingId ?? "");
  const toernooiCode = normCode((params as any)?.toernooi_code ?? (params as any)?.toernooicode ?? (params as any)?.toernooiCode);

  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [meldingen, setMeldingen] = useState<Melding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!matchmakingId || !toernooiCode) return;
    setLoading(true);
    setError(null);

    try {
      const { data: toernooiRows, error: toernooiErr } = await supabase
        .from("matchmaker_toernooi_fighters")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("toernooi_code", toernooiCode)
        .order("naam", { ascending: true });

      if (toernooiErr) throw toernooiErr;

      const scopedToernooiRows = (toernooiRows ?? []).filter(
        (row: any) =>
          String(row?.matchmaking_id ?? "").trim() === matchmakingId &&
          normCode(row?.toernooi_code) === toernooiCode,
      );

      let nextFighters = scopedToernooiRows
        .map(fighterFromToernooiRow)
        .filter(Boolean) as Fighter[];

      // Fallback voor oude toernooien die nog alleen in matchmaking_bouts_raw staan.
      if (!nextFighters.length) {
        const { data: boutRows, error: boutErr } = await supabase
          .from("matchmaking_bouts_raw")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("toernooi_code", toernooiCode)
          .order("created_at", { ascending: true });

        if (boutErr) throw boutErr;

        nextFighters = fightersFromMatchmakingBouts(
          ((boutRows ?? []) as BoutRow[]).filter(
            (row: any) =>
              String(row?.matchmaking_id ?? matchmakingId).trim() === matchmakingId &&
              normCode(row?.toernooi_code) === toernooiCode,
          ),
          toernooiCode,
        );
      }

      const vas = nextFighters
        .map((f) => normalizeVa(f.va_nummer ?? f.fighter_id))
        .filter(Boolean);

      let klasse = "";
      let discipline = "";

      if ((toernooiRows ?? [])[0]) {
        klasse = safe((toernooiRows ?? [])[0]?.klasse, "");
        discipline = safe((toernooiRows ?? [])[0]?.discipline, "");
      }

      if ((!klasse || !discipline) && nextFighters.length) {
        klasse = safe((nextFighters[0] as any)?.klasse, klasse);
        discipline = safe((nextFighters[0] as any)?.discipline, discipline);
      }

      if ((!klasse || !discipline) && nextFighters.length) {
        const { data: boutMeta } = await supabase
          .from("matchmaking_bouts_raw")
          .select("klasse,discipline,max_gewicht,va_rood,va_blauw")
          .eq("matchmaking_id", matchmakingId)
          .eq("toernooi_code", toernooiCode)
          .limit(1);

        klasse = klasse || safe((boutMeta ?? [])[0]?.klasse, "");
        discipline = discipline || safe((boutMeta ?? [])[0]?.discipline, "");
      }

      if (vas.length) {
        const { data: uitslagenRows, error: uitslagenErr } = await supabase
          .from("matchmaker_uitslagen_raw")
          .select("va_nummer,uitslag,klasse,discipline")
          .eq("matchmaking_id", matchmakingId)
          .in("va_nummer", vas);

        if (uitslagenErr) throw uitslagenErr;

        const { data: contextRows } = await supabase
          .from("matchmaker_fighter_context")
          .select("matchmaking_id,va_nummer,licentie,heeft_startverbod,heeft_keurmerk,gewicht,leeftijd_event,leeftijd,geslacht,naam,naam_fp,sportschool,sportschool_mm,nulmeting_klasse,klasse,klasse_mm,discipline")
          .eq("matchmaking_id", matchmakingId)
          .in("va_nummer", vas);

        const ctxByVa = new Map<string, any>();
        for (const row of contextRows ?? []) {
          if (String(row?.matchmaking_id ?? matchmakingId).trim() !== matchmakingId) continue;
          const va = normalizeVa(row?.va_nummer);
          if (va && !ctxByVa.has(va)) ctxByVa.set(va, row);
        }

        const { data: boutRows } = await supabase
          .from("matchmaking_bouts_raw")
          .select("matchmaking_id,va_rood,va_blauw,max_gewicht,klasse,discipline,toernooi_code")
          .eq("matchmaking_id", matchmakingId)
          .eq("toernooi_code", toernooiCode);

        const gewichtByVa = new Map<string, any>();
        for (const row of boutRows ?? []) {
          const g = row?.max_gewicht ?? null;
          const vr = normalizeVa(row?.va_rood);
          const vb = normalizeVa(row?.va_blauw);
          if (vr && g != null) gewichtByVa.set(vr, g);
          if (vb && g != null) gewichtByVa.set(vb, g);
        }

        nextFighters = nextFighters.map((f) => {
          const va = normalizeVa(f.va_nummer ?? f.fighter_id);
          const ctx = ctxByVa.get(va);
          const rows = (uitslagenRows ?? []).filter((r: any) => normalizeVa(r?.va_nummer) === va);
          const currentKlasse = klasse || f?.toernooi_code || ctx?.klasse_mm || ctx?.klasse || ctx?.nulmeting_klasse;
          return {
            ...f,
            naam: safe(ctx?.naam_fp ?? ctx?.naam ?? f.naam, f.naam ?? "Onbekende deelnemer"),
            naam_fp: ctx?.naam_fp ?? f.naam_fp ?? null,
            sportschool: ctx?.sportschool ?? ctx?.sportschool_mm ?? f.sportschool,
            gewicht: gewichtByVa.get(va) ?? f.gewicht ?? ctx?.gewicht ?? null,
            leeftijd: ctx?.leeftijd_event ?? ctx?.leeftijd ?? f.leeftijd,
            geslacht: ctx?.geslacht ?? f.geslacht,
            licentie: ctx?.licentie ?? f.licentie,
            heeft_startverbod: ctx?.heeft_startverbod ?? f.heeft_startverbod,
            keurmerk: ctx?.heeft_keurmerk ?? f.keurmerk,
            record: buildCurrentClassRecord(rows, klasse || ctx?.klasse_mm || ctx?.klasse || ctx?.nulmeting_klasse, discipline || ctx?.discipline),
          };
        });
      }

      setFighters(nextFighters);

      const { data: resultRows, error: resultErr } = await supabase
        .from("matchmaker_fighter_resultaten")
        .select("id,controle_run_id,matchmaking_id,inschrijving_id,fighter_id,va_nummer,toernooi_code,resultaat,severity,rule,rule_code,boodschap,review_status,actie_status,aantekeningen,created_at")
        .eq("matchmaking_id", matchmakingId)
        .eq("toernooi_code", toernooiCode)
        .order("created_at", { ascending: true });

      if (resultErr) throw resultErr;

      setMeldingen(
        (resultRows ?? [])
          .filter(
            (row: any) =>
              String(row?.matchmaking_id ?? "").trim() === matchmakingId &&
              normCode(row?.toernooi_code) === toernooiCode,
          )
          .map(toMelding),
      );
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setFighters([]);
      setMeldingen([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchmakingId, toernooiCode]);

  const fighterMeldingen = useMemo(() => {
    const map = new Map<string, Melding[]>();
    for (const f of fighters) map.set(fighterVa(f), dedupeMeldingen(meldingen.filter((m) => sameFighter(m, f))));
    return map;
  }, [fighters, meldingen]);

  const meldingBlocks = useMemo<MeldingBlock[]>(() => {
    const openMeldingen = dedupeMeldingen(meldingen.filter(isOpenMelding));
    const byCat: Record<MeldingCategorie, Melding[]> = { licentie: [], startverbod: [], keurmerk: [], vechter: [] };
    for (const m of openMeldingen) byCat[meldingCategorie(m)].push(m);
    const sortMeldingen = (list: Melding[]) => [...list].sort((a, b) => resultRank(b.resultaat) - resultRank(a.resultaat));
    return [
      { key: "licentie", title: "Licentie meldingen", subtitle: "Licentieproblemen in dit toernooi.", empty: "Geen open licentie meldingen.", meldingen: sortMeldingen(byCat.licentie) },
      { key: "startverbod", title: "Startverbod", subtitle: "Startverboden binnen dit toernooi.", empty: "Geen open startverbod meldingen.", meldingen: sortMeldingen(byCat.startverbod) },
      { key: "keurmerk", title: "Keurmerk meldingen", subtitle: "Sportschool- en keurmerkcontroles.", empty: "Geen open keurmerk meldingen.", meldingen: sortMeldingen(byCat.keurmerk) },
      { key: "vechter", title: "Vechter meldingen", subtitle: "Klasse, leeftijd, gewicht en overige controles.", empty: "Geen open vechter meldingen.", meldingen: sortMeldingen(byCat.vechter) },
    ];
  }, [meldingen]);

  const stats = useMemo(() => {
    const open = meldingen.filter(isOpenMelding);
    return {
      deelnemers: fighters.length,
      open: open.length,
      startverbod: meldingBlocks.find((b) => b.key === "startverbod")?.meldingen.length ?? 0,
      licentie: meldingBlocks.find((b) => b.key === "licentie")?.meldingen.length ?? 0,
      keurmerk: meldingBlocks.find((b) => b.key === "keurmerk")?.meldingen.length ?? 0,
      vechter: meldingBlocks.find((b) => b.key === "vechter")?.meldingen.length ?? 0,
    };
  }, [fighters.length, meldingen, meldingBlocks]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 text-white" style={pageBg}>
        <div className="rounded-3xl border-2 p-6 font-black" style={metalPanel}>Toernooi detail laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 text-white md:p-6" style={pageBg}>
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="overflow-hidden rounded-3xl border-2" style={metalPanel}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white border-opacity-10 p-4 md:p-5">
            <div>
              <div className="text-xs font-black uppercase text-orange-200" style={{ letterSpacing: "0.24em" }}>FightSupport toernooi controle</div>
              <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">Toernooi {toernooiCode}</h1>
            </div>
            <button
              onClick={() => router.push(`/dashboard/matchmaker/matchmaking/${matchmakingId}/match`)}
              className="rounded-xl px-4 py-2 text-sm font-black uppercase transition hover:opacity-80"
              style={{ border: `1px solid ${ORANGE}`, background: "rgba(0,0,0,0.50)", color: "#ffd5c2", letterSpacing: "0.05em" }}
            >
              Terug naar match
            </button>
          </div>

          <div className="px-4 py-4 md:px-8">
            <div className="mx-auto max-w-3xl rounded-3xl border-2 p-2" style={chromeBorder}>
              <div className="rounded-2xl bg-black bg-opacity-90 px-5 py-2">
                <img src={LOGO_SRC} alt="FightSupport Toernooi" className="mx-auto block h-auto w-full max-w-xl object-contain" style={{ maxHeight: 95 }} />
              </div>
            </div>
          </div>
        </header>

        {error ? <div className="rounded-xl border border-red-400 bg-red-950 bg-opacity-40 p-3 text-sm font-bold text-red-100">{error}</div> : null}

        <section className="grid gap-3 md:grid-cols-6">
          <StatCard label="Deelnemers" value={stats.deelnemers} />
          <StatCard label="Open meldingen" value={stats.open} accent />
          <StatCard label="Licentie" value={stats.licentie} />
          <StatCard label="Startverbod" value={stats.startverbod} />
          <StatCard label="Keurmerk" value={stats.keurmerk} />
          <StatCard label="Vechter" value={stats.vechter} />
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="space-y-4">
            <SectionTitle title="Deelnemers" subtitle="Klik op een deelnemer voor de fighter detail pagina." />
            {fighters.length === 0 ? (
              <MetalEmpty>Geen toernooi-deelnemers gevonden voor toernooi {toernooiCode}.</MetalEmpty>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                {fighters.map((f) => {
                  const va = fighterVa(f);
                  const fM = fighterMeldingen.get(va) ?? [];
                  const highest = [...fM].sort((a, b) => resultRank(b.resultaat) - resultRank(a.resultaat))[0];
                  const st = highest ? resultStyle(highest.resultaat) : resultStyle("ok");
                  const startverbod = isTruthyValue(f.heeft_startverbod);
                  const geenLicentie = isFalsyValue(f.licentie);
                  const geenKeurmerk = isFalsyValue(f.keurmerk);

                  return (
                    <Link
                      key={`${f.toernooi_code}-${f.fighter_id}-${va}`}
                      href={`/dashboard/matchmaker/matchmaking/${matchmakingId}/fighter/${encodeURIComponent(va)}`}
                      className="group block rounded-3xl border-2 p-4 transition hover:-translate-y-1 hover:opacity-95 md:p-5"
                      style={{ ...chromeBorder, borderColor: highest ? st.border : "rgba(216,211,204,0.78)" }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-2xl font-black leading-tight text-white md:text-3xl">
                            {fighterName(f)}
                          </div>
                          <div className="mt-2 truncate text-base font-bold text-orange-200">{fighterSchool(f)}</div>
                        </div>
                        <div className="shrink-0 rounded-2xl border px-3 py-2 text-right" style={{ borderColor: "rgba(255,77,0,0.72)", background: "rgba(0,0,0,0.42)" }}>
                          <div className="text-xs font-black uppercase text-orange-200" style={{ letterSpacing: "0.12em" }}>VA</div>
                          <div className="text-lg font-black text-white">{va}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {highest ? <Badge label={resultLabel(highest.resultaat)} style={st} /> : <Badge label="GEEN OPEN MELDING" style={resultStyle("ok")} />}
                        {startverbod ? <Badge label="STARTVERBOD" style={resultStyle("verbod")} /> : null}
                        {geenLicentie ? <Badge label="GEEN LICENTIE" style={resultStyle("afkeur")} /> : null}
                        {geenKeurmerk ? <Badge label="GEEN KEURMERK" style={resultStyle("actie")} /> : null}
                      </div>

                      <div className="mt-4 grid grid-cols-4 gap-2">
                        <Info label="Leeftijd" value={f.leeftijd == null ? "-" : `${f.leeftijd} jaar`} />
                        <Info label="Gewicht" value={f.gewicht == null ? "-" : `${f.gewicht} kg`} />
                        <Info label="Record" value={safe((f as any).record, "0-0-0")} />
                        <Info label="Geslacht" value={safe(f.geslacht)} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {meldingBlocks.map((block) => <MeldingPanel key={block.key} block={block} fighters={fighters} />)}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border-2 px-4 py-3 font-black" style={{ ...chromeBorder, borderColor: accent ? "rgba(255,77,0,0.88)" : "rgba(216,211,204,0.58)" }}>
      <div className="text-xs uppercase text-zinc-400" style={{ letterSpacing: "0.14em" }}>{label}</div>
      <div className="mt-1 text-2xl text-white">{value}</div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border-2 p-4" style={chromeBorder}>
      <h2 className="text-lg font-black uppercase text-white" style={{ letterSpacing: "0.12em" }}>{title}</h2>
      <p className="mt-1 text-sm font-semibold text-zinc-300">{subtitle}</p>
    </div>
  );
}

function MeldingPanel({ block, fighters }: { block: MeldingBlock; fighters: Fighter[] }) {
  return (
    <section className="overflow-hidden rounded-3xl border-2" style={chromeBorder}>
      <div className="border-b border-white border-opacity-10 p-4" style={{ background: "linear-gradient(90deg, rgba(216,211,204,0.14), rgba(0,0,0,0.30), rgba(255,77,0,0.10))" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black uppercase text-white" style={{ letterSpacing: "0.12em" }}>{block.title}</h3>
            <p className="mt-1 text-sm font-semibold text-zinc-300">{block.subtitle}</p>
          </div>
          <span className="rounded-full border px-3 py-1 text-sm font-black text-orange-100" style={{ borderColor: "rgba(255,77,0,0.55)", background: "rgba(255,77,0,0.12)" }}>{block.meldingen.length}</span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {block.meldingen.length === 0 ? (
          <div className="rounded-xl border p-3 text-sm font-semibold text-zinc-400" style={{ borderColor: "rgba(216,211,204,0.25)", background: "rgba(255,255,255,0.04)" }}>{block.empty}</div>
        ) : (
          block.meldingen.map((m) => {
            const st = resultStyle(m.resultaat);
            const fighter = fighters.find((f) => sameFighter(m, f));
            return (
              <div key={m.id} className="rounded-2xl border p-3" style={{ background: st.bg, borderColor: st.border }}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={resultLabel(m.resultaat)} style={st} />
                  <span className="text-xs font-black uppercase text-zinc-300" style={{ letterSpacing: "0.10em" }}>{safe(m.rule_code ?? m.rule)}</span>
                </div>
                <div className="mt-2 text-sm font-black text-zinc-100">{fighter ? `${fighterName(fighter)} - ${fighterSchool(fighter)}` : "Algemene toernooi melding"}</div>
                <div className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-zinc-200">{safe(m.boodschap)}</div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function Badge({ label, style }: { label: string; style: { bg: string; border: string; text: string } }) {
  return (
    <span className="rounded-full border px-3 py-1 text-xs font-black uppercase" style={{ background: style.bg, borderColor: style.border, color: style.text, letterSpacing: "0.06em" }}>{label}</span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-3" style={{ borderColor: "rgba(216,211,204,0.34)", background: "rgba(0,0,0,0.30)" }}>
      <div className="text-xs font-black uppercase text-zinc-400" style={{ letterSpacing: "0.10em" }}>{label}</div>
      <div className="mt-1 truncate text-sm font-black text-white md:text-base">{value}</div>
    </div>
  );
}

function MetalEmpty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border-2 p-6 text-zinc-200" style={chromeBorder}>{children}</div>;
}
