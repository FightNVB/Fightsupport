"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const ORANGE = "#ff4d00";
const LOGO_SRC = "/branding/fightsupport/toernooi.png";

type Fighter = {
  id?: string | number | null;
  fighter_id: string | null;
  va_nummer?: string | null;
  naam: string | null;
  naam_fp?: string | null;
  sportschool: string | null;
  gewicht: number | string | null;
  leeftijd: number | string | null;
  geslacht: string | null;
  licentie?: string | boolean | null;
  heeft_startverbod?: string | boolean | null;
  keurmerk?: string | boolean | null;
  heeft_keurmerk?: string | boolean | null;
  toernooi_code: string | null;
  discipline?: string | null;
  klasse?: string | null;
  nulmeting_klasse?: string | null;
  record?: string | null;
  gewicht_match?: string | number | null;
};

type Melding = {
  id: string;
  fighter_id: string | null;
  toernooi_code: string | null;
  discipline?: string | null;
  klasse?: string | null;
  nulmeting_klasse?: string | null;
  record?: string | null;
  gewicht_match?: string | number | null;
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
  return v === true || ["ja", "yes", "true", "1", "actief", "ok", "geldig"].some((x) => s === x || s.includes(x));
}

function isFalsyValue(v: unknown) {
  const s = norm(v);
  return v === false || ["nee", "no", "false", "0", "geen", "niet", "n.v.t.", "nvt", "ongeldig"].some((x) => s === x || s.includes(x));
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
  if (r === "verbod") return { bg: "rgba(127,29,29,0.34)", border: "rgba(248,113,113,0.72)", text: "#fecaca" };
  if (r === "afkeur") return { bg: "rgba(220,38,38,0.16)", border: "rgba(248,113,113,0.55)", text: "#fecaca" };
  if (r === "dispensatie") return { bg: "rgba(147,51,234,0.16)", border: "rgba(216,180,254,0.58)", text: "#e9d5ff" };
  if (r === "ok") return { bg: "rgba(22,163,74,0.13)", border: "rgba(74,222,128,0.45)", text: "#bbf7d0" };
  return { bg: "rgba(255,77,0,0.15)", border: "rgba(255,77,0,0.62)", text: "#fed7aa" };
}

function sameFighter(m: Melding, f: Fighter) {
  const mf = normalizeVa(m.fighter_id);
  const mtva = normalizeVa(m.toernooi_va_nummer);
  const ff = normalizeVa(f.fighter_id);
  const fv = normalizeVa(f.va_nummer);
  return (!!mf && (mf === ff || mf === fv)) || (!!mtva && (mtva === ff || mtva === fv));
}

function fighterVa(f: Fighter) {
  return safe(f.va_nummer ?? f.fighter_id);
}

function fighterName(f: Fighter) {
  return safe(f.naam_fp ?? f.naam, "Onbekende deelnemer");
}

function fighterSchool(f: Fighter) {
  return safe(f.sportschool, "Sportschool onbekend");
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

function isLicentieMelding(m: Melding) {
  return meldingCategorie(m) === "licentie";
}

function isStartverbodMelding(m: Melding) {
  return meldingCategorie(m) === "startverbod";
}

function isKeurmerkMelding(m: Melding) {
  return meldingCategorie(m) === "keurmerk";
}

function isOpenMelding(m: Melding) {
  const review = norm(m.review_status);
  const resultaat = normResultaat(m.resultaat);
  return resultaat !== "ok" && (!review || review === "open");
}

function dedupeMeldingen(list: Melding[]) {
  const seen = new Set<string>();
  return list.filter((m) => {
    const key = [
      normalizeVa(m.fighter_id),
      normalizeVa(m.toernooi_va_nummer),
      norm(m.rule_code),
      norm(m.boodschap),
      norm(m.resultaat),
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toFighter(row: any): Fighter {
  const va = normalizeVa(row?.va_nummer ?? row?.fighter_id);
  return {
    id: row?.id ?? null,
    fighter_id: va || String(row?.fighter_id ?? "").trim() || null,
    va_nummer: va || null,
    naam: row?.naam ?? row?.naam_fp ?? null,
    naam_fp: row?.naam_fp ?? null,
    sportschool: row?.sportschool ?? row?.sportschool_mm ?? null,
    gewicht: row?.gewicht ?? null,
    leeftijd: row?.leeftijd_event ?? row?.leeftijd ?? null,
    geslacht: row?.geslacht ?? null,
    licentie: row?.licentie ?? null,
    heeft_startverbod: row?.heeft_startverbod ?? null,
    keurmerk: row?.heeft_keurmerk ?? row?.keurmerk ?? null,
    heeft_keurmerk: row?.heeft_keurmerk ?? row?.keurmerk ?? null,
    toernooi_code: row?.toernooi_code ?? null,
    discipline: row?.discipline ?? null,
    klasse: row?.klasse_mm ?? row?.klasse ?? null,
    nulmeting_klasse: row?.nulmeting_klasse ?? null,
  };
}

function toMelding(row: any): Melding {
  return {
    id: String(row?.id ?? `${row?.rule_code ?? "rule"}-${row?.fighter_id ?? row?.toernooi_va_nummer ?? ""}`),
    fighter_id: row?.fighter_id ?? null,
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



function normalizeClassToken(v: unknown) {
  const x = String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!x) return "";

  if (x.includes("jeugd") || x.includes("youth") || x === "j" || x.startsWith("j ") || x.startsWith("j-")) return "J";
  if (x.includes("j+") || x.includes("talent")) return "J+";
  if (x.includes("recreant") || x === "r" || x.includes("r klasse") || x.includes("r-klasse") || x.includes("r class")) return "R";
  if (x.includes("nieuweling") || x.includes("newcomer") || x === "n" || x.includes("n klasse") || x.includes("n-klasse") || x.includes("n class")) return "N";
  if (x === "c" || x.includes("c klasse") || x.includes("c-klasse") || x.includes("c class")) return "C";
  if (x === "b" || x.includes("b klasse") || x.includes("b-klasse") || x.includes("b class")) return "B";
  if (x === "a" || x.includes("a klasse") || x.includes("a-klasse") || x.includes("a class") || x.includes("elite")) return "A";

  const m = x.toUpperCase().match(/\b(J\+|J|R|N|C|B|A)\b/);
  return m?.[1] ?? x.toUpperCase();
}

function normalizeDisciplineToken(v: unknown) {
  const x = String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!x) return "";
  if (x.includes("kick") || x.includes("k1")) return "KICKBOKSEN";
  if (x.includes("thai") || x.includes("muay")) return "KICKBOKSEN";
  if (x.includes("mma")) return "MMA";
  if (x.includes("boks")) return "BOKSEN";
  return x.toUpperCase();
}

function sameRecordScope(row: any, fighter: Fighter) {
  const rowKlasse = normalizeClassToken(row?.klasse);
  const fighterKlasse = normalizeClassToken(fighter?.klasse);
  const rowDiscipline = normalizeDisciplineToken(row?.discipline);
  const fighterDiscipline = normalizeDisciplineToken(fighter?.discipline);

  const klasseOk = !fighterKlasse || !rowKlasse || rowKlasse === fighterKlasse;
  const disciplineOk = !fighterDiscipline || !rowDiscipline || rowDiscipline === fighterDiscipline;

  return klasseOk && disciplineOk;
}

function buildRecord(uitslagen: any[]) {
  let w = 0;
  let l = 0;
  let d = 0;

  for (const u of uitslagen ?? []) {
    const s = String(u?.uitslag ?? "").toLowerCase();

    if (s.includes("demo") || s.includes("no contest") || s.includes("nocontest")) {
      continue;
    }

    if (
      s.includes("wint") ||
      s.includes("gewonnen") ||
      s.includes("winner") ||
      s === "w" ||
      s === "win"
    ) {
      w++;
    } else if (
      s.includes("verliest") ||
      s.includes("lost") ||
      s.includes("verlies") ||
      s === "l" ||
      s === "loss"
    ) {
      l++;
    } else if (
      s.includes("draw") ||
      s.includes("onbeslist") ||
      s.includes("gelijk")
    ) {
      d++;
    }
  }

  return `${w}-${l}-${d}`;
}


function tournamentClassToken(v: unknown) {
  const x = String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!x) return "";
  if (x.includes("j+") || x.includes("talent")) return "J+";
  if (x.includes("jeugd") || x.includes("youth") || x === "j" || x.startsWith("j ")) return "J";
  if (x.includes("recreant") || x === "r" || x.includes("r klasse") || x.includes("r class")) return "R";
  if (x.includes("nieuweling") || x.includes("newcomer") || x.includes("novice") || x === "n" || x.includes("n klasse") || x.includes("n class")) return "N";
  if (x === "c" || x.includes("c klasse") || x.includes("c class")) return "C";
  if (x === "b" || x.includes("b klasse") || x.includes("b class")) return "B";
  if (x === "a" || x.includes("a klasse") || x.includes("a class") || x.includes("elite")) return "A";
  return x.toUpperCase();
}


function isRelevantKickboxingDiscipline(v: unknown) {
  const s = String(v ?? "").trim().toLowerCase();
  return s.includes("kick") || s.includes("muay") || s.includes("thai") || s.includes("k1");
}

function isJeugdKlasseForHistory(v: unknown) {
  const s = String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return s === "j" || s.includes("jeugd") || s.includes("youth");
}

function effectiveClassFromUitslagenOrNulmeting(fighter: Fighter, uitslagenRows: any[]) {
  const va = normalizeVa(fighter.va_nummer ?? fighter.fighter_id);
  let best = "";
  let bestRank = 0;

  for (const row of uitslagenRows ?? []) {
    if (normalizeVa(row?.va_nummer) !== va) continue;
    if (!isRelevantKickboxingDiscipline(row?.discipline)) continue;
    if (isJeugdKlasseForHistory(row?.klasse)) continue;

    const token = tournamentClassToken(row?.klasse);
    const rankMap: Record<string, number> = { R: 1, N: 2, C: 3, B: 4, A: 5 };
    const rank = rankMap[token] ?? 0;

    if (rank > bestRank) {
      best = token;
      bestRank = rank;
    }
  }

  return best || tournamentClassToken((fighter as any)?.nulmeting_klasse);
}

function hasClassMismatchMelding(meldingen: Melding[], fighter: Fighter) {
  const va = normalizeVa(fighter.va_nummer ?? fighter.fighter_id);
  return meldingen.some((m) => {
    if (!sameFighter(m, fighter)) return false;
    const text = `${m.rule_code ?? ""} ${m.rule ?? ""} ${m.boodschap ?? ""}`.toLowerCase();
    return text.includes("toernooi-klasse") || text.includes("toernooiklasse") || text.includes("klasse");
  });
}

function buildClassMismatchMeldingen(fighters: Fighter[], existingMeldingen: Melding[], uitslagenRows: any[]): Melding[] {
  const out: Melding[] = [];

  for (const fighter of fighters) {
    const toernooiKlasseRaw = fighter.klasse;
    const toernooiKlasse = tournamentClassToken(toernooiKlasseRaw);
    const fighterKlasse = effectiveClassFromUitslagenOrNulmeting(fighter, uitslagenRows);
    const va = normalizeVa(fighter.va_nummer ?? fighter.fighter_id);
    const hasRelevantUitslagen = (uitslagenRows ?? []).some((row: any) =>
      normalizeVa(row?.va_nummer) === va &&
      isRelevantKickboxingDiscipline(row?.discipline) &&
      !isJeugdKlasseForHistory(row?.klasse) &&
      !!tournamentClassToken(row?.klasse)
    );
    const fighterKlasseRaw = hasRelevantUitslagen ? fighterKlasse : (fighter as any).nulmeting_klasse;

    if (!toernooiKlasse || !fighterKlasse || toernooiKlasse === fighterKlasse) continue;
    if (hasClassMismatchMelding(existingMeldingen, fighter)) continue;

    out.push({
      id: `synthetic-class-${fighter.toernooi_code ?? "T"}-${va || fighter.id || fighter.naam}`,
      fighter_id: va || fighter.fighter_id,
      toernooi_va_nummer: va || fighter.va_nummer || fighter.fighter_id,
      toernooi_code: fighter.toernooi_code,
      resultaat: "actie",
      severity: "warning",
      rule: "Toernooi klasse",
      rule_code: "TOERNOOI_KLASSE_MISMATCH",
      boodschap: `Zit niet in toernooi-klasse (${safe(fighterKlasseRaw, fighterKlasse)} in ${safe(toernooiKlasseRaw, toernooiKlasse)})`,
      review_status: null,
      actie_status: null,
      aantekeningen: null,
      created_at: null,
    });
  }

  return out;
}


export default function ToernooiDetailPage() {
  const params = useParams();
  const router = useRouter();

  const matchmakingId = String((params as any)?.matchmakingId ?? "").trim();
  const toernooiCode = normCode((params as any)?.toernooicode ?? (params as any)?.toernooiCode ?? (params as any)?.toernooi_code);

  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [meldingen, setMeldingen] = useState<Melding[]>([]);
  const [records, setRecords] = useState<Record<string,string>>({});
  const [gewichten, setGewichten] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!matchmakingId || !toernooiCode) return;
    setLoading(true);
    setError(null);

    try {
      const { data: fighterRows, error: fighterErr } = await supabase
        .from("controle_toernooi_context")
        .select("id,matchmaking_id,controle_run_id,toernooi_code,fighter_id,va_nummer,naam,naam_fp,naam_mm,sportschool,sportschool_mm,gewicht,leeftijd_event,geslacht,licentie,heeft_startverbod,heeft_keurmerk,keurmerk_reason,discipline,klasse,klasse_mm,nulmeting_klasse")
        .eq("matchmaking_id", matchmakingId)
        .eq("toernooi_code", toernooiCode)
        .order("naam", { ascending: true });

      if (fighterErr) throw fighterErr;

      const nextFighters = (fighterRows ?? []).map(toFighter);
      setFighters(nextFighters);

      const latestRunId =
        (fighterRows ?? [])
          .map((r: any) => String(r?.controle_run_id ?? "").trim())
          .filter(Boolean)[0] ?? "";

      let resultQuery = supabase
        .from("controle_resultaten")
        .select("id,controle_run_id,matchmaking_id,fighter_id,toernooi_va_nummer,toernooi_code,resultaat,severity,rule,rule_code,boodschap,review_status,actie_status,aantekeningen,created_at")
        .eq("matchmaking_id", matchmakingId)
        .eq("toernooi_code", toernooiCode)
        .order("created_at", { ascending: true });

      if (latestRunId) resultQuery = resultQuery.eq("controle_run_id", latestRunId);

      const { data: resultRows, error: resultErr } = await resultQuery;
      if (resultErr) throw resultErr;


      const vas = nextFighters
        .map((f) => normalizeVa(f.va_nummer ?? f.fighter_id))
        .filter(Boolean);

      let uitslagenRows: any[] = [];

      if (vas.length > 0) {
        const { data: fetchedUitslagenRows } = await supabase
          .from("controle_uitslagen")
          .select("va_nummer,uitslag,klasse,discipline")
          .in("va_nummer", vas);

        uitslagenRows = (fetchedUitslagenRows ?? []) as any[];

        const recMap: Record<string,string> = {};

        for (const fighter of nextFighters) {
          const va = normalizeVa(fighter.va_nummer ?? fighter.fighter_id);
          if (!va) continue;

          const rowsInCurrentClass = (uitslagenRows ?? []).filter((r:any) =>
            normalizeVa(r?.va_nummer) === va && sameRecordScope(r, fighter)
          );

          recMap[va] = buildRecord(rowsInCurrentClass);
        }

        setRecords(recMap);

        const { data: boutRows } = await supabase
          .from("matchmaking_bouts_raw")
          .select("va_rood,va_blauw,max_gewicht")
          .eq("matchmaking_id", matchmakingId)
          .eq("toernooi_code", toernooiCode);

        const gMap: Record<string,string> = {};

        for (const b of boutRows ?? []) {
          const gr = String(b?.max_gewicht ?? "").trim();
          const vr = normalizeVa(b?.va_rood);
          const vb = normalizeVa(b?.va_blauw);

          if (vr && gr) gMap[vr] = gr;
          if (vb && gr) gMap[vb] = gr;
        }

        setGewichten(gMap);
      }


      const dbMeldingen = (resultRows ?? []).map(toMelding);
      // Klassemeldingen komen uit controle_resultaten/rulesEngine.
      // Niet meer frontend-only synthetisch toevoegen, anders wijken overzicht/detail/toernooi van elkaar af.
      setMeldingen(dedupeMeldingen(dbMeldingen));
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
    for (const f of fighters) {
      map.set(fighterVa(f), dedupeMeldingen(meldingen.filter((m) => sameFighter(m, f))));
    }
    return map;
  }, [fighters, meldingen]);

  const meldingBlocks = useMemo<MeldingBlock[]>(() => {
    const openMeldingen = dedupeMeldingen(meldingen.filter(isOpenMelding));
    const byCat: Record<MeldingCategorie, Melding[]> = {
      licentie: [],
      startverbod: [],
      keurmerk: [],
      vechter: [],
    };

    for (const m of openMeldingen) byCat[meldingCategorie(m)].push(m);

    const sortMeldingen = (list: Melding[]) => [...list].sort((a, b) => resultRank(b.resultaat) - resultRank(a.resultaat));

    return [
      { key: "licentie", title: "Licentie meldingen", subtitle: "Licentieproblemen die direct aandacht nodig hebben.", empty: "Geen open licentie meldingen.", meldingen: sortMeldingen(byCat.licentie) },
      { key: "startverbod", title: "Startverbod", subtitle: "Startverboden binnen dit toernooi.", empty: "Geen open startverbod meldingen.", meldingen: sortMeldingen(byCat.startverbod) },
      { key: "keurmerk", title: "Keurmerk meldingen", subtitle: "Sportschool- en keurmerkcontroles.", empty: "Geen open keurmerk meldingen.", meldingen: sortMeldingen(byCat.keurmerk) },
      { key: "vechter", title: "Vechter meldingen", subtitle: "Klasse, leeftijd, gewicht en overige vechtercontroles.", empty: "Geen open vechter meldingen.", meldingen: sortMeldingen(byCat.vechter) },
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
      <div className="min-h-screen bg-zinc-950 p-6 text-white">
        <div className="rounded-2xl border border-orange-500/50 bg-black/60 p-6 font-extrabold">
          Toernooi detail laden...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#24282c_0%,#30353a_45%,#1d2023_100%)] p-[18px] text-white max-md:p-0">
      <div className="mx-auto max-w-[1560px] space-y-4">
        <header className="relative overflow-hidden border border-[#9da3a8] bg-black shadow-[0_18px_42px_rgba(20,24,28,.24),0_2px_8px_rgba(0,0,0,.18)] aspect-[16/10] min-h-[650px] max-h-[940px] max-md:min-h-0 max-md:aspect-auto">
          <img
            src="/branding/fightsupport/fighter-hero.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center max-md:relative max-md:h-auto max-md:object-contain"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.08),transparent_28%,transparent_68%,rgba(0,0,0,.28))]" />

          <div className="absolute right-5 top-5 z-20 max-md:right-2 max-md:top-2">
            <button
              onClick={() => router.push(`/dashboard/admin/controle/${matchmakingId}`)}
              className="inline-flex h-[38px] items-center justify-center border border-white/40 bg-black/70 px-3 text-sm font-black text-white shadow-lg backdrop-blur-md max-md:h-[34px] max-md:text-xs"
            >
              ← Terug naar controle
            </button>
          </div>

          <div className="absolute left-[4.2%] top-[31%] z-10 w-[48%] text-shadow max-md:hidden">
            <div className="text-[clamp(13px,1.15vw,20px)] font-black uppercase tracking-[0.14em] text-[#ff641f]">FightSupport toernooi controle</div>
            <h1 className="mt-2 text-[clamp(32px,3.25vw,58px)] font-black uppercase leading-none text-white drop-shadow-[0_4px_14px_#000]">Toernooi {toernooiCode}</h1>
          </div>

          <div className="absolute bottom-[27.2%] left-[6.8%] z-10 grid w-[45.5%] grid-cols-4 gap-2 text-[clamp(11px,.92vw,16px)] font-black uppercase text-white drop-shadow-[0_2px_7px_#000] max-md:hidden">
            <div>{stats.deelnemers} deelnemers</div>
            <div>{stats.open} open</div>
            <div>{stats.licentie} licentie</div>
            <div>{stats.startverbod} startverbod</div>
          </div>

          <div className="absolute bottom-[9.6%] left-[3.35%] right-[5.2%] z-10 grid h-[13.8%] grid-cols-4 gap-[1.35%] max-md:hidden">
            <TournamentHeroStatus title="KEURMERK" value={`${stats.keurmerk} melding${stats.keurmerk===1?"":"en"}`} />
            <TournamentHeroStatus title="VECHTER" value={`${stats.vechter} melding${stats.vechter===1?"":"en"}`} />
            <TournamentHeroStatus title="DEELNEMERS" value={`${stats.deelnemers} totaal`} />
            <TournamentHeroStatus title="STATUS" value={stats.open?`${stats.open} open melding${stats.open===1?"":"en"}`:"Geen open meldingen"} ok={!stats.open} />
          </div>
        </header>

        <div className="hidden mx-[10px] mt-0 mb-3 border border-[#555d64] border-t-[3px] border-t-[#ff4d00] bg-[linear-gradient(145deg,#33383d,#262b2f)] p-4 max-md:block">
          <h1 className="m-0 text-[26px] font-black uppercase leading-none text-white">Toernooi {toernooiCode}</h1>
          <div className="mt-2 text-xs font-black uppercase tracking-wide text-[#ff6a2a]">FightSupport toernooi controle</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MobileTournamentField label="Deelnemers" value={stats.deelnemers} />
            <MobileTournamentField label="Open meldingen" value={stats.open} />
            <MobileTournamentField label="Licentie" value={stats.licentie} />
            <MobileTournamentField label="Startverbod" value={stats.startverbod} />
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-400/50 bg-red-950/35 p-3 text-sm font-bold text-red-100">
            {error}
          </div>
        ) : null}

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
            <SectionTitle title="Deelnemers" subtitle="Naam en sportschool. Klik op een deelnemer voor de fighter detail pagina." />

            {fighters.length === 0 ? (
              <MetalEmpty>Geen toernooi-deelnemers gevonden voor toernooi {toernooiCode}. Controleer of buildToernooiContext heeft gedraaid en of toernooi_code exact overeenkomt.</MetalEmpty>
            ) : (
              <div className="flex flex-col gap-4">
                {fighters.map((f) => {
                  const va = fighterVa(f);
                  const fM = fighterMeldingen.get(va) ?? [];
                  const openFM = fM.filter(isOpenMelding);
                  const highest = [...openFM].sort((a, b) => resultRank(b.resultaat) - resultRank(a.resultaat))[0];
                  const st = highest ? resultStyle(highest.resultaat) : resultStyle("ok");
                  const startverbod = isTruthyValue(f.heeft_startverbod) || openFM.some(isStartverbodMelding);
                  const geenLicentie = isFalsyValue(f.licentie) || openFM.some(isLicentieMelding);
                  const geenKeurmerk = isFalsyValue(f.heeft_keurmerk ?? f.keurmerk) || openFM.some(isKeurmerkMelding);

                  return (
                    <Link
                      key={`${f.toernooi_code}-${f.fighter_id}-${va}`}
                      href={`/dashboard/admin/controle/${matchmakingId}/fighter/${encodeURIComponent(va)}`}
                      className="group overflow-hidden w-full rounded-[22px] border-[4px] border-[#d6d1cb] p-4 shadow-xl transition hover:-translate-y-0.5 hover:border-orange-500/70"
                      style={{
                        width: "100%",
                        borderColor: highest ? st.border : "rgba(214,211,203,0.95)",
                        background: "linear-gradient(135deg,rgba(214,211,209,0.18),rgba(45,45,52,0.40),rgba(0,0,0,0.88))",
                        boxShadow: "0 18px 45px rgba(0,0,0,0.52), inset 0 0 0 1px rgba(255,255,255,0.10)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-xl font-black text-white group-hover:text-orange-100">
                            {fighterName(f)}
                          </div>
                          <div className="mt-1 truncate text-sm font-semibold text-zinc-300">
                            {fighterSchool(f)}
                          </div>
                        </div>
                        <div className="shrink-0 rounded-xl border border-orange-500/45 bg-orange-500/10 px-3 py-2 text-right shadow-inner">
                          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-200">VA</div>
                          <div className="font-black text-orange-100">{va}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {highest ? <Badge label={resultLabel(highest.resultaat)} style={st} /> : <Badge label="GEEN OPEN MELDING" style={resultStyle("ok")} />}
                        {startverbod ? <Badge label="STARTVERBOD" style={resultStyle("verbod")} /> : null}
                        {geenLicentie ? <Badge label="GEEN LICENTIE" style={resultStyle("afkeur")} /> : null}
                        {geenKeurmerk ? <Badge label="GEEN KEURMERK" style={resultStyle("actie")} /> : null}
                      </div>

                      <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
                        <Info label="Leeftijd" value={f.leeftijd == null ? "-" : `${f.leeftijd} jaar`} />
                        <Info label="Gewicht" value={gewichten[va] ? `${gewichten[va]} kg` : "-"} />
                        <Info label="Record" value={records[va] ?? "0-0-0"} />
                        <Info label="Geslacht" value={safe(f.geslacht)} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {meldingBlocks.map((block) => (
              <MeldingPanel key={block.key} block={block} fighters={fighters} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function TournamentHeroStatus({title,value,ok=false}:{title:string;value:string;ok?:boolean}){return <div className="flex min-w-0 items-center pl-[76px] pr-3"><div className="min-w-0"><div className="text-[clamp(9px,.75vw,12px)] font-black uppercase tracking-[.1em] text-white drop-shadow-[0_2px_5px_#000]">{title}</div><div className={`mt-1 truncate text-[clamp(10px,.82vw,13px)] font-black ${ok?"text-[#a8e0b5]":"text-[#f1f3f5]"} drop-shadow-[0_2px_5px_#000]`}>{value}</div></div></div>}
function MobileTournamentField({label,value}:{label:string;value:string|number}){return <div className="border border-[#596168] bg-[#3a4045] p-2.5"><span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-[#aeb6bd]">{label}</span><b className="text-sm text-white">{value}</b></div>}

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className="rounded-2xl border-[3px] px-4 py-3 font-black shadow-xl"
      style={{
        borderColor: accent ? "rgba(255,77,0,0.75)" : "rgba(214,211,203,0.52)",
        background: accent
          ? "linear-gradient(135deg,rgba(255,77,0,0.30),rgba(82,82,91,0.46),rgba(0,0,0,0.68))"
          : "linear-gradient(135deg,rgba(214,211,209,0.14),rgba(63,63,70,0.34),rgba(0,0,0,0.68))",
        boxShadow: "0 16px 40px rgba(0,0,0,0.48), inset 0 0 0 1px rgba(255,255,255,0.07)",
      }}
    >
      <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl text-white">{value}</div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border-[3px] border-[#d6d1cb]/55 bg-[linear-gradient(135deg,rgba(214,211,209,0.13),rgba(63,63,70,0.42),rgba(0,0,0,0.68))] p-4 shadow-xl">
      <h2 className="text-lg font-black uppercase tracking-[0.14em] text-white">{title}</h2>
      <p className="mt-1 text-sm font-semibold text-zinc-400">{subtitle}</p>
    </div>
  );
}

function MeldingPanel({ block, fighters }: { block: MeldingBlock; fighters: Fighter[] }) {
  return (
    <section className="overflow-hidden rounded-[22px] border-[3px] border-[#d6d1cb]/45 bg-[linear-gradient(135deg,rgba(214,211,209,0.11),rgba(39,39,42,0.38),rgba(0,0,0,0.74))] shadow-xl">
      <div className="border-b border-white/10 bg-[linear-gradient(90deg,rgba(214,211,209,0.13),rgba(63,63,70,0.46),rgba(255,77,0,0.10))] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black uppercase tracking-[0.14em] text-white">{block.title}</h3>
            <p className="mt-1 text-sm font-semibold text-zinc-400">{block.subtitle}</p>
          </div>
          <span className="rounded-full border border-orange-500/45 bg-orange-500/10 px-3 py-1 text-sm font-black text-orange-100">
            {block.meldingen.length}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {block.meldingen.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm font-semibold text-zinc-500">
            {block.empty}
          </div>
        ) : (
          block.meldingen.map((m) => {
            const st = resultStyle(m.resultaat);
            const fighter = fighters.find((f) => sameFighter(m, f));
            return (
              <div key={m.id} className="rounded-2xl border p-3" style={{ background: st.bg, borderColor: st.border }}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={resultLabel(m.resultaat)} style={st} />
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-zinc-400">
                    {safe(m.rule_code ?? m.rule)}
                  </span>
                </div>

                <div className="mt-2 text-sm font-black text-zinc-100">
                  {fighter ? `${fighterName(fighter)} • ${fighterSchool(fighter)}` : "Algemene toernooi melding"}
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-zinc-200">
                  {safe(m.boodschap)}
                </div>
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
    <span className="rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide" style={{ background: style.bg, borderColor: style.border, color: style.text }}>
      {label}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(214,211,209,0.08),rgba(0,0,0,0.34))] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="mt-1 font-black text-zinc-100">{value}</div>
    </div>
  );
}

function MetalEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-[3px] border-[#d6d1cb]/45 bg-[linear-gradient(135deg,rgba(214,211,209,0.10),rgba(39,39,42,0.38),rgba(0,0,0,0.70))] p-6 text-zinc-200">
      {children}
    </div>
  );
}
