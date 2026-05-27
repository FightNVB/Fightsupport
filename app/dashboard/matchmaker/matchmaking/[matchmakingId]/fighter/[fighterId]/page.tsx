"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  User,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";

type Uitslag = {
  id?: string;
  datum?: string | null;
  evenement?: string | null;
  tegenstander?: string | null;
  uitslag?: string | null;
  discipline?: string | null;
  klasse?: string | null;
  gewicht?: string | number | null;
  sportschool?: string | null;
};

type Sportschool = {
  sportschool_id?: string | number | null;
  naam?: string | null;
  plaats?: string | null;
  land?: string | null;
  keurmerk_start?: string | null;
  keurmerk_einde?: string | null;
};


type FighterRuleResultRow = {
  id?: string | number;
  controle_run_id?: string | null;
  inschrijving_id?: string | number | null;
  fighter_id?: string | null;
  va_nummer?: string | null;
  rule?: string | null;
  rule_code?: string | null;
  resultaat?: string | null;
  severity?: string | null;
  boodschap?: string | null;
  review_status?: string | null;
};

type MatchmakingHeader = {
  id?: string | null;
  naam?: string | null;
  datum?: string | null;
  locatie?: string | null;
  bondteam?: string | null;
};

function normalizeVa(v: unknown) {
  return String(v ?? "").replace(/[^0-9]/g, "");
}

function isNumericId(v: unknown) {
  return /^\d+$/.test(String(v ?? "").trim());
}

function isUuid(v: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v ?? "").trim());
}

function firstFilled(...vals: unknown[]) {
  for (const val of vals) {
    const out = String(val ?? "").trim();
    if (out) return out;
  }
  return "";
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function fullName(row?: any | null) {
  return firstFilled(
    row?.naam,
    row?.fp_naam,
    row?.naam_input,
    [row?.voornaam, row?.achternaam].map((x) => String(x ?? "").trim()).filter(Boolean).join(" "),
  );
}

function mapResultLevel(severity?: string | null, resultaat?: string | null) {
  const sev = String(severity ?? "").trim().toLowerCase();
  const res = String(resultaat ?? "").trim().toLowerCase();
  if (sev === "error" || res.includes("verbod") || res.includes("afkeur")) return "error";
  if (sev === "warning" || res.includes("dispensatie") || res.includes("actie") || res.includes("let")) return "warn";
  if (sev === "info" || res.includes("info")) return "info";
  return "ok";
}

function dedupeRules(rows: FighterRuleResultRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = [row.rule, row.rule_code, row.resultaat, row.boodschap].map((x) => String(x ?? "").trim().toLowerCase()).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


function calcAgeAtDate(birth?: string | null, at?: string | null) {
  if (!birth || !at) return null;
  const b = new Date(birth);
  const e = new Date(at);
  if (Number.isNaN(b.getTime()) || Number.isNaN(e.getTime())) return null;
  let years = e.getFullYear() - b.getFullYear();
  const beforeBirthday = e.getMonth() < b.getMonth() || (e.getMonth() === b.getMonth() && e.getDate() < b.getDate());
  if (beforeBirthday) years -= 1;
  return years;
}

function extractKeurmerkDate(reason?: string | null) {
  const raw = String(reason ?? "").trim();
  const iso = raw.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
  if (iso && !Number.isNaN(new Date(iso).getTime())) return iso;
  const nl = raw.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (nl) return `${nl[3]}-${nl[2]}-${nl[1]}`;
  return null;
}

function getResultKind(v?: string | null): "win" | "loss" | "draw" | "other" {
  const x = String(v ?? "").trim().toLowerCase();

  // Eerst onbeslist tellen. Daarmee komt een uitslag zoals "onbeslist / draw"
  // nooit per ongeluk als winst of verlies in het record terecht.
  if (x.includes("onbeslist") || x.includes("draw") || x.includes("gelijk")) return "draw";
  if (x.includes("verlies") || x.includes("verliest") || x.includes("verloren") || x.includes("loss") || x === "l") return "loss";
  if (x.includes("winst") || x.includes("wint") || x.includes("gewonnen") || x === "win" || x === "w") return "win";

  // Demo, no contest en andere niet-record uitslagen horen wel mee te tellen
  // als partij, maar niet als W/V/O in het huidige klasse-record.
  return "other";
}

function normalizeClassToken(v?: string | null) {
  const x = String(v ?? "").trim().toLowerCase();
  if (!x) return "";

  // FightSupport klassevolgorde: J -> R -> N -> C -> B -> A.
  // Let op: discipline staat soms onder klasse in dezelfde cel, dus alleen de echte klasse-token pakken.
  if (x.includes("jeugd") || x.includes("youth") || /^j(|\s|\/|-)/i.test(x) || x === "j") return "j";
  if (x.includes("recreant") || /^r(|\s|\/|-)/i.test(x) || x === "r") return "r";
  if (x.includes("nieuweling") || /^n(|\s|\/|-)/i.test(x) || x === "n") return "n";
  if (x.includes("c-klasse") || x.includes("c klasse") || /^c(|\s|\/|-)/i.test(x) || x === "c") return "c";
  if (x.includes("b-klasse") || x.includes("b klasse") || /^b(|\s|\/|-)/i.test(x) || x === "b") return "b";
  if (x.includes("a-klasse") || x.includes("a klasse") || x.includes("elite") || /^a(|\s|\/|-)/i.test(x) || x === "a") return "a";

  return x.replace(/[^a-z0-9+]/g, "");
}

function classRank(token?: string | null) {
  const t = normalizeClassToken(token);
  const order: Record<string, number> = { j: 1, r: 2, n: 3, c: 4, b: 5, a: 6 };
  return order[t] ?? 0;
}

function highestRecordClass(rows: Uitslag[]) {
  let best = "";
  let bestRank = 0;

  for (const row of rows) {
    const token = normalizeClassToken(row.klasse);
    const rank = classRank(token);
    if (rank > bestRank) {
      best = token;
      bestRank = rank;
    }
  }

  return best;
}

function displayClassToken(v?: string | null) {
  const token = normalizeClassToken(v);
  const labels: Record<string, string> = {
    j: "J",
    r: "R",
    n: "N",
    c: "C",
    b: "B",
    a: "A",
  };

  return labels[token] ?? safe(v);
}

function sameRecordClass(resultClass?: string | null, currentClass?: string | null) {
  const resultToken = normalizeClassToken(resultClass);
  const currentToken = normalizeClassToken(currentClass);
  if (!resultToken || !currentToken) return true;
  return resultToken === currentToken;
}

function resultLabel(v?: string | null) {
  const kind = getResultKind(v);
  if (kind === "win") return "Winst";
  if (kind === "loss") return "Verlies";
  if (kind === "draw") return "Onbeslist";
  const x = String(v ?? "").trim().toLowerCase();
  if (x.includes("demo")) return "Demo";
  if (x.includes("no contest") || x.includes("nocontest") || x === "nc") return "No contest";
  return safe(v);
}

function extractKeurmerkName(reason?: string | null, fallback = "-") {
  const match = String(reason ?? "").match(/gematcht met\s+\"([^\"]+)\"/i);
  return match?.[1] || fallback;
}

const SCRAPE_START_ENDPOINT = (matchmakingId: string) => `/api/matchmaker/${matchmakingId}/fighters/herscrape`;

function safe(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function parseRaw(raw: any) {
  if (!raw) return {} as any;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return {} as any;
  }
}

function formatDate(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function yes(
  value: any,
  positiveWords = ["ja", "yes", "true", "ok", "geldig", "actief"],
) {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  return value === true || positiveWords.some((w) => s === w || s.includes(w));
}

function daysUntil(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  d.setHours(23, 59, 59, 999);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

function fighterName(fighter: any) {
  return safe(fighter?.fp_naam ?? fighter?.naam, "Onbekende vechter");
}

function licenseValue(fighter: any) {
  const raw = parseRaw(fighter?.raw);
  return (
    fighter?.licentie ??
    fighter?.licentie_status ??
    fighter?.heeft_licentie ??
    raw?.details?.licentie ??
    null
  );
}

function hasStartverbod(fighter: any) {
  const raw = parseRaw(fighter?.raw);
  return (
    yes(fighter?.heeft_startverbod, ["ja", "yes", "true"]) ||
    yes(fighter?.startverbod, ["ja", "yes", "true"]) ||
    yes(raw?.details?.heeft_startverbod, ["ja", "yes", "true"])
  );
}

export default function FighterDetailPage() {
  const params = useParams<{ matchmakingId: string; fighterId: string }>();
  const router = useRouter();

  const matchmakingId = String(params?.matchmakingId ?? "").trim();
  const fighterId = String(params?.fighterId ?? "").trim();

  const [fighter, setFighter] = useState<any>(null);
  const [sportschool, setSportschool] = useState<Sportschool | null>(null);
  const [matchmaking, setMatchmaking] = useState<MatchmakingHeader | null>(null);
  const [uitslagen, setUitslagen] = useState<Uitslag[]>([]);
  const [meldingen, setMeldingen] = useState<FighterRuleResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (matchmakingId && fighterId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchmakingId, fighterId]);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const needleVa = normalizeVa(fighterId);
      const numeric = isNumericId(fighterId);

      const { data: matchRows, error: matchErr } = await supabase
        .from("matchmakings")
        .select("id,naam,datum,locatie,bondteam")
        .eq("id", matchmakingId)
        .limit(1);

      if (matchErr) throw matchErr;
      const mm = (matchRows ?? [])[0] ?? null;
      setMatchmaking(mm);

      const ctxFilters = [`va_nummer.eq.${needleVa || fighterId}`];
      if (isUuid(fighterId)) ctxFilters.push(`fighter_id.eq.${fighterId}`);
      if (numeric) ctxFilters.push(`inschrijving_id.eq.${fighterId}`, `id.eq.${fighterId}`);

      const { data: ctxRows, error: ctxErr } = await supabase
        .from("matchmaker_fighter_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .or(ctxFilters.join(","))
        .order("updated_at", { ascending: false })
        .limit(1);

      if (ctxErr) throw ctxErr;
      const ctx = (ctxRows ?? [])[0] ?? null;

      const aanmeldingFilters = [`va_nummer.eq.${needleVa || fighterId}`];
      if (numeric) aanmeldingFilters.push(`id.eq.${fighterId}`);

      const { data: aanRows, error: aanErr } = await supabase
        .from("aanmeldingen")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .or(aanmeldingFilters.join(","))
        .order("updated_at", { ascending: false })
        .limit(1);

      if (aanErr) throw aanErr;
      const aan = (aanRows ?? [])[0] ?? null;

      let raw: any = null;
      try {
        if (needleVa) {
          const { data } = await supabase
            .from("matchmaker_fighters_raw")
            .select("*")
            .eq("matchmaking_id", matchmakingId)
            .eq("va_nummer", needleVa)
            .order("updated_at", { ascending: false })
            .limit(1);
          raw = (data ?? [])[0] ?? null;
        } else if (isUuid(fighterId)) {
          const { data } = await supabase
            .from("matchmaker_fighters_raw")
            .select("*")
            .eq("matchmaking_id", matchmakingId)
            .eq("fighter_id", fighterId)
            .order("updated_at", { ascending: false })
            .limit(1);
          raw = (data ?? [])[0] ?? null;
        }
      } catch {
        raw = null;
      }

      if (!ctx && !aan && !raw) {
        throw new Error("Geen vechter gevonden in matchmaker_fighter_context, aanmeldingen of matchmaker_fighters_raw.");
      }

      const extra = parseRaw(ctx?.extra);
      const extraAanmelding = extra?.raw?.aanmelding ?? extra?.aanmelding ?? {};
      const sourceAanmelding = aan ?? extraAanmelding ?? {};
      const rawScraped = raw ?? extra?.raw?.fighters_raw ?? {};
      const va = normalizeVa(firstFilled(ctx?.va_nummer, rawScraped?.va_nummer, sourceAanmelding?.va_nummer, fighterId));
      const keurmerkReason = firstFilled(ctx?.keurmerk_reden, ctx?.keurmerk_reason);

      const nextFighter = {
        id: ctx?.id ?? aan?.id ?? raw?.id ?? fighterId,
        context_id: ctx?.id ?? null,
        inschrijving_id: ctx?.inschrijving_id ?? sourceAanmelding?.id ?? aan?.id ?? (numeric ? fighterId : null),
        fighter_id: firstFilled(ctx?.fighter_id, rawScraped?.fighter_id),
        controle_run_id: firstFilled(ctx?.controle_run_id, rawScraped?.controle_run_id),
        naam: firstFilled(ctx?.naam, ctx?.fp_naam, rawScraped?.naam, fullName(sourceAanmelding), fighterId),
        fp_naam: firstFilled(ctx?.fp_naam, rawScraped?.naam),
        fp_geboortedatum: firstFilled(ctx?.fp_geboortedatum, ctx?.geboortedatum, rawScraped?.geboortedatum, sourceAanmelding?.geboortedatum, ctx?.geboortedatum_input),
        geboortedatum: firstFilled(ctx?.geboortedatum, sourceAanmelding?.geboortedatum, ctx?.geboortedatum_input),
        geslacht: firstFilled(ctx?.geslacht, ctx?.fp_geslacht, rawScraped?.geslacht, sourceAanmelding?.geslacht),
        gewicht: toNum(ctx?.gewicht ?? sourceAanmelding?.gewicht),
        discipline: firstFilled(ctx?.discipline, sourceAanmelding?.discipline),
        klasse: firstFilled(ctx?.klasse, sourceAanmelding?.klasse, ctx?.fp_klasse),
        gym: firstFilled(ctx?.gym_input, ctx?.fp_gym, sourceAanmelding?.gym, rawScraped?.sportschool),
        va_nummer: va,
        licentie: firstFilled(ctx?.licentie, rawScraped?.licentie),
        heeft_startverbod: firstFilled(ctx?.heeft_startverbod, rawScraped?.heeft_startverbod),
        gewonnen: toNum(ctx?.gewonnen ?? ctx?.record_w ?? rawScraped?.gewonnen ?? sourceAanmelding?.win) ?? 0,
        verloren: toNum(ctx?.verloren ?? ctx?.record_l ?? rawScraped?.verloren ?? sourceAanmelding?.loss) ?? 0,
        onbeslist: toNum(ctx?.draw ?? ctx?.gelijk ?? ctx?.record_d ?? rawScraped?.gelijk ?? sourceAanmelding?.draw) ?? 0,
        totaal_wedstrijden: toNum(ctx?.totaal_wedstrijden ?? rawScraped?.totaal_wedstrijden ?? ctx?.nulmeting_totaal) ?? 0,
        nulmeting_klasse: firstFilled(ctx?.nulmeting_klasse, rawScraped?.nulmeting_klasse),
        nulmeting_totaal: toNum(ctx?.nulmeting_totaal ?? rawScraped?.nulmeting_totaal) ?? 0,
        nulmeting_opmerking: firstFilled(ctx?.nulmeting_opmerking, rawScraped?.nulmeting_opmerking),
        heeft_keurmerk: firstFilled(ctx?.heeft_keurmerk, ctx?.keurmerk_status, ctx?.keurmerk_ok),
        keurmerk_reden: keurmerkReason,
        scrape_status: firstFilled(ctx?.scrape_status, aan?.status, raw?.status),
        scraped_at: firstFilled(ctx?.scraped_at, aan?.scraped_at, raw?.updated_at, raw?.created_at),
        scrape_run_id: firstFilled(ctx?.controle_run_id, rawScraped?.controle_run_id),
        scrape_error: firstFilled(ctx?.scrape_error, aan?.scrape_error),
        raw: rawScraped,
      };

      setFighter(nextFighter);
      setSportschool({
        naam: nextFighter.gym,
        plaats: firstFilled(sourceAanmelding?.plaats, rawScraped?.plaats),
        keurmerk_einde: extractKeurmerkDate(keurmerkReason),
      });

      let rules: FighterRuleResultRow[] = [];
      if (va) {
        let q = supabase
          .from("matchmaker_fighter_resultaten")
          .select("id,controle_run_id,inschrijving_id,fighter_id,va_nummer,rule,rule_code,resultaat,severity,boodschap,review_status")
          .eq("matchmaking_id", matchmakingId)
          .eq("va_nummer", va)
          .order("created_at", { ascending: true });
        if (nextFighter.controle_run_id) q = q.eq("controle_run_id", nextFighter.controle_run_id);
        const res = await q;
        if (res.error) throw res.error;
        rules = (res.data ?? []) as FighterRuleResultRow[];
      }

      if (!rules.length && nextFighter.inschrijving_id) {
        const res = await supabase
          .from("matchmaker_fighter_resultaten")
          .select("id,controle_run_id,inschrijving_id,fighter_id,va_nummer,rule,rule_code,resultaat,severity,boodschap,review_status")
          .eq("matchmaking_id", matchmakingId)
          .eq("inschrijving_id", String(nextFighter.inschrijving_id))
          .order("created_at", { ascending: true });
        if (res.error) throw res.error;
        rules = (res.data ?? []) as FighterRuleResultRow[];
      }
      setMeldingen(dedupeRules(rules));

      if (va) {
        const res = await supabase
          .from("matchmaker_uitslagen_raw")
          .select("id,datum,evenement,tegenstander,uitslag,discipline,klasse,gewicht,sportschool,va_nummer")
          .eq("matchmaking_id", matchmakingId)
          .eq("va_nummer", va)
          .order("datum", { ascending: false });
        if (res.error) throw res.error;
        setUitslagen((res.data ?? []) as Uitslag[]);
      } else {
        setUitslagen([]);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Vechter laden mislukt");
      setFighter(null);
      setSportschool(null);
      setUitslagen([]);
      setMeldingen([]);
    } finally {
      setLoading(false);
    }
  }

  async function runAutocheckFightpaspoort() {
    if (!fighter?.inschrijving_id && !fighter?.va_nummer) return;

    setChecking(true);
    try {
      const payload = {
        mode: "single_fighter",
        aanmelding_ids: fighter.inschrijving_id ? [Number(fighter.inschrijving_id)] : [],
        selected_ids: fighter.inschrijving_id ? [Number(fighter.inschrijving_id)] : [],
        va_nummers: fighter.va_nummer ? [String(fighter.va_nummer).replace(/\D/g, "")] : [],
        only_selected: true,
      };

      const res = await authedFetch(SCRAPE_START_ENDPOINT(matchmakingId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Controle mislukt (${res.status})`);
      await load();
    } catch (err: any) {
      alert(err?.message || "Controle mislukt.");
    } finally {
      setChecking(false);
    }
  }

  const raw = useMemo(() => parseRaw(fighter?.raw), [fighter?.raw]);
  const recordStats = useMemo(() => {
    if (uitslagen.length) {
      const hoogsteKlasse = highestRecordClass(uitslagen);

      return uitslagen.reduce(
        (acc, row) => {
          const kind = getResultKind(row.uitslag);
          const rowKlasse = normalizeClassToken(row.klasse);

          // Record is altijd in de hoogste klasse waarin uitslagen staan.
          // Alle eerdere/lager geplaatste klasses + demo/no contest tellen als overige.
          if (!hoogsteKlasse || rowKlasse !== hoogsteKlasse || kind === "other") {
            acc.other += 1;
            return acc;
          }

          if (kind === "win") acc.w += 1;
          else if (kind === "loss") acc.l += 1;
          else if (kind === "draw") acc.d += 1;
          else acc.other += 1;

          return acc;
        },
        { w: 0, l: 0, d: 0, other: 0 },
      );
    }

    const w = Number(fighter?.gewonnen ?? raw?.details?.gewonnen ?? 0) || 0;
    const l = Number(fighter?.verloren ?? raw?.details?.verloren ?? 0) || 0;
    const d = Number(fighter?.onbeslist ?? raw?.details?.onbeslist ?? raw?.details?.gelijk ?? 0) || 0;
    const total = Number(fighter?.totaal_wedstrijden ?? raw?.details?.totaal ?? raw?.details?.totaal_wedstrijden ?? 0) || 0;
    return { w, l, d, other: Math.max(0, total - w - l - d) };
  }, [fighter, raw, uitslagen]);

  const record = `${recordStats.w}-${recordStats.l}-${recordStats.d} (${recordStats.other})`;
  const totaalWedstrijden = uitslagen.length || Number(fighter?.totaal_wedstrijden ?? raw?.details?.totaal ?? recordStats.w + recordStats.l + recordStats.d + recordStats.other) || 0;
  const hoogsteUitslagenKlasse = highestRecordClass(uitslagen);
  const klasseVolgensControle = hoogsteUitslagenKlasse
    ? displayClassToken(hoogsteUitslagenKlasse)
    : displayClassToken(fighter?.nulmeting_klasse ?? raw?.nulmeting?.klasse ?? fighter?.klasse);
  const klasseControleBron = hoogsteUitslagenKlasse ? "uitslagen" : "nulmeting";

  const hasLicense = yes(fighter?.licentie);
  const startverbod = yes(fighter?.heeft_startverbod, ["ja", "yes", "true"]);
  const age = calcAgeAtDate(fighter?.fp_geboortedatum ?? fighter?.geboortedatum, matchmaking?.datum);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(96,74,58,0.36),transparent_30rem),radial-gradient(circle_at_bottom,rgba(255,90,31,0.08),transparent_24rem),linear-gradient(180deg,#100e0c,#080808_52%,#030303)] text-white">
      <div className="mx-auto max-w-7xl px-3 py-2 sm:px-5 lg:px-6">
        <div className="fs-chrome-panel relative mb-3 overflow-hidden rounded-[1.15rem] border-[5px] border-[#d9d6d0] bg-[linear-gradient(135deg,#251f1a,#11100f_48%,#050505)] shadow-[0_0_0_1px_#59534d,0_0_0_5px_rgba(255,255,255,0.22),0_16px_34px_rgba(0,0,0,0.86),inset_0_2px_0_rgba(255,255,255,0.78),inset_0_-2px_0_rgba(0,0,0,0.95)] before:absolute before:inset-[7px] before:rounded-[0.82rem] before:border before:border-[#8f8982] before:content-[''] after:absolute after:left-10 after:top-0 after:h-[3px] after:w-48 after:bg-[linear-gradient(90deg,transparent,#fff,transparent)] after:content-['']">
          <div className="relative min-h-[126px] px-3 py-3">
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden px-[260px]">
              <img
                src="/branding/fightsupport/fightsupport1.png"
                alt="FightSupport"
                draggable={false}
                className="h-[86px] w-auto max-w-[920px] object-contain select-none drop-shadow-[0_0_18px_rgba(255,120,40,0.24)]"
              />
            </div>

            <div className="relative z-10 flex min-h-[102px] items-center justify-between gap-4">
              <div className="flex min-w-[260px] items-center gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-[0.26em] text-[#ff8a4c]">
                    Vechter detail
                  </div>
                  <div className="truncate text-sm text-[#d1c3b7]">
                    {safe(matchmaking?.naam, "Matchmaking")}
                  </div>
                </div>
              </div>

              <div className="hidden min-w-[280px] text-right lg:block">
                <div className="text-[11px] font-black uppercase tracking-[0.32em] text-[#ff6a2a]">
                  FightSupport
                </div>
                <div className="text-xl font-black tracking-tight text-white sm:text-3xl">
                  Matchmaker
                </div>
                <div className="text-sm text-[#d1c3b7]">
                  Profiel, licentie, nulmeting, meldingen en uitslagen.
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="rounded-[2rem] border border-[#8a8178] bg-[#161311] p-10 text-center text-lg font-black text-zinc-200 shadow-xl shadow-black/50">
            <RefreshCw className="mx-auto mb-3 animate-spin text-[#ff6a2a]" /> Laden...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-[2rem] border border-red-500/60 bg-[#2a1111] p-6 text-red-200 shadow-xl shadow-black/50">
            <div className="flex items-center gap-3 text-lg font-black">
              <XCircle /> {error}
            </div>
          </div>
        )}

        {!loading && !error && fighter && (
          <>
            <div className="relative mb-3 overflow-hidden rounded-[1.05rem] border-[5px] border-[#d9d6d0] bg-[linear-gradient(180deg,#1b1714,#0b0a09)] shadow-[0_0_0_1px_#524c46,0_0_0_7px_rgba(255,255,255,0.28),0_14px_30px_rgba(0,0,0,0.82),inset_0_2px_0_rgba(255,255,255,0.58)] before:absolute before:inset-[7px] before:rounded-[0.75rem] before:border before:border-[#89847e] before:content-['']">
              <div className="relative border-b border-[#b8afa6]/45 bg-[linear-gradient(90deg,#11100f,#211914,#3a1609)] px-4 py-2.5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <div className="text-sm font-black uppercase tracking-[0.24em] text-[#d0c4b8]">
                      {safe(sportschool?.naam, "Sportschool")}
                    </div>

                    <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-[#ff6a2a] drop-shadow-[0_2px_10px_rgba(255,120,40,0.35)] sm:text-4xl">
                      {safe(fighter.naam, "Onbekende vechter")}
                    </h1>

                    <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-xs text-zinc-300">
                      <span className="rounded-full border border-[#b8afa6] bg-[#11100f] px-2.5 py-0.5 font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                        VA {safe(fighter.va_nummer)}
                      </span>
                      <span className="rounded-full border border-[#8a8178] bg-[#11100f] px-2.5 py-0.5">
                        Geboren {formatDate(fighter.fp_geboortedatum ?? fighter.geboortedatum)}
                      </span>
                      <span className="rounded-full border border-[#8a8178] bg-[#11100f] px-2.5 py-0.5">
                        {safe(fighter.geslacht)}
                      </span>
                      {age !== null && (
                        <span className="rounded-full border border-[#8a8178] bg-[#11100f] px-2.5 py-0.5">
                          {age} jaar op event
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    <button
                      onClick={() => router.push(`/dashboard/matchmaker/matchmaking/${matchmakingId}/match`)}
                      className="inline-flex items-center justify-center gap-2 border-2 border-[#d7d4ce] bg-[linear-gradient(180deg,#ffffff,#adadad_44%,#eeeeee_52%,#6f6f6f)] px-5 py-2 text-sm font-black text-black shadow-[inset_0_1px_0_#fff,0_5px_0_#28140c,0_8px_16px_rgba(0,0,0,0.55)] transition hover:brightness-110"
                    >
                      <ArrowLeft size={18} /> Terug
                    </button>
                    <button
                      onClick={runAutocheckFightpaspoort}
                      disabled={checking}
                      className="inline-flex items-center justify-center gap-2 border-2 border-[#ff7a3d] bg-[linear-gradient(180deg,#ff6a22,#b73600)] px-5 py-2 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_5px_0_#28140c,0_8px_16px_rgba(0,0,0,0.55)] transition hover:brightness-110 disabled:opacity-60"
                    >
                      <RefreshCw size={17} className={checking ? "animate-spin" : ""} /> Autocheck opnieuw
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative grid gap-2 p-3 md:grid-cols-5">
                <InfoCard icon={<ShieldCheck />} label="Licentie" value={hasLicense ? "Ja" : "Nee"} danger={!hasLicense} />
                <InfoCard icon={<ShieldAlert />} label="Startverbod" value={startverbod ? "Ja" : "Nee"} danger={startverbod} />
                <InfoCard icon={<Trophy />} label="Record" value={record} />
                <InfoCard icon={<Dumbbell />} label="Totaal wedstrijden" value={String(totaalWedstrijden)} />
                <InfoCard icon={<Trophy />} label="Klasse volgens controle" value={`${safe(klasseVolgensControle)} (${klasseControleBron})`} />
              </div>
            </div>

            <div className="mb-3 grid gap-2 md:grid-cols-2">
              <DetailBlock
                title="Nulmeting"
                rows={[
                  ["Klasse volgens controle", `${safe(klasseVolgensControle)} (${klasseControleBron})`],
                  ["Nulmeting klasse", safe(fighter.nulmeting_klasse ?? raw?.nulmeting?.klasse)],
                  ["Totaal", safe(fighter.nulmeting_totaal ?? raw?.nulmeting?.totaal, "0")],
                  ["Opmerking", safe(fighter.nulmeting_opmerking ?? raw?.nulmeting?.opmerking)],
                ]}
              />
              <DetailBlock
                title="Keurmerk"
                rows={[
                  ["Sportschool", safe(sportschool?.naam)],
                  ["Gematcht in DB", extractKeurmerkName(fighter.keurmerk_reden, safe(sportschool?.naam))],
                  ["Keurmerk einde", formatDate(sportschool?.keurmerk_einde)],
                ]}
              />
            </div>

            <div className="relative mb-3 overflow-hidden rounded-[1.05rem] border-[5px] border-[#d9d6d0] bg-[linear-gradient(180deg,#1b1714,#0d0c0b)] shadow-[0_0_0_1px_#524c46,0_0_0_7px_rgba(255,255,255,0.28),0_14px_30px_rgba(0,0,0,0.82),inset_0_2px_0_rgba(255,255,255,0.58)] before:absolute before:inset-[7px] before:rounded-[0.75rem] before:border before:border-[#89847e] before:content-['']">
              <div className="relative flex items-center justify-between border-b border-[#b8afa6]/45 bg-[linear-gradient(90deg,#11100f,#211914,#3a1609)] px-4 py-2.5 text-white">
                <div>
                  <div className="flex items-center gap-2 text-lg font-black">
                    <CalendarDays size={20} /> Uitslagen
                  </div>
                  <div className="mt-0.5 text-xs text-[#c8bdb3]">
                    Gelezen uit matchmaker_uitslagen_raw op VA {safe(fighter.va_nummer)}.
                  </div>
                </div>
                <div className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                  {uitslagen.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] table-fixed text-xs">
                  <thead>
                    <tr className="border-b border-[#b8afa6]/45 bg-[#ff4d00] text-xs uppercase tracking-[0.14em] text-white">
                      <th className="w-[12%] px-3 py-2 text-left">Datum</th>
                      <th className="w-[25%] px-3 py-2 text-left">Event</th>
                      <th className="w-[18%] px-3 py-2 text-left">Tegenstander</th>
                      <th className="w-[16%] px-3 py-2 text-left">Sportschool</th>
                      <th className="w-[12%] px-3 py-2 text-left">Klasse</th>
                      <th className="w-[8%] px-3 py-2 text-left">Kg</th>
                      <th className="w-[9%] px-3 py-2 text-left">Uitslag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uitslagen.map((u, i) => (
                      <tr key={u.id || i} className="border-b border-white/10 odd:bg-[#11100f] even:bg-[#1b1714] hover:bg-[#2a1c14]/70">
                        <td className="px-3 py-2 font-bold text-white">{formatDate(u.datum)}</td>
                        <td className="px-3 py-2 text-zinc-200"><div className="line-clamp-2">{safe(u.evenement)}</div></td>
                        <td className="px-3 py-2 font-black text-white">{safe(u.tegenstander)}</td>
                        <td className="px-3 py-2 text-zinc-300">{safe(u.sportschool)}</td>
                        <td className="px-3 py-2 text-zinc-300">{safe(u.klasse)}<div className="text-xs text-[#9f948c]">{safe(u.discipline)}</div></td>
                        <td className="px-3 py-2 text-zinc-300">{safe(u.gewicht)}</td>
                        <td className="px-3 py-2 font-black text-[#ff9a66]">{resultLabel(u.uitslag)}</td>
                      </tr>
                    ))}
                    {!uitslagen.length && (
                      <tr><td colSpan={7} className="p-5 text-center text-[#c8bdb3]">Geen uitslagen gevonden voor deze VA.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.05rem] border-[5px] border-[#d9d6d0] bg-[linear-gradient(180deg,#1b1714,#0d0c0b)] shadow-[0_0_0_1px_#524c46,0_0_0_7px_rgba(255,255,255,0.28),0_14px_30px_rgba(0,0,0,0.82),inset_0_2px_0_rgba(255,255,255,0.58)] before:absolute before:inset-[7px] before:rounded-[0.75rem] before:border before:border-[#89847e] before:content-['']">
              <div className="relative flex items-center justify-between border-b border-[#b8afa6]/45 bg-[linear-gradient(90deg,#11100f,#211914,#3a1609)] px-4 py-2.5 text-white">
                <div>
                  <div className="flex items-center gap-2 text-lg font-black">
                    <ShieldAlert size={20} /> Meldingen
                  </div>
                  <div className="mt-0.5 text-xs text-[#c8bdb3]">
                    Gelezen uit matchmaker_fighter_resultaten voor deze vechter.
                  </div>
                </div>
                <div className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                  {meldingen.length}
                </div>
              </div>

              <div className="relative flex flex-col gap-2 p-3">
                {meldingen.length ? (
                  meldingen.map((m, i) => {
                    const level = mapResultLevel(m.severity, m.resultaat);
                    const color = level === "error" ? "border-red-500/70 bg-[#2a1111] text-red-100" : level === "warn" ? "border-[#ff7a3d]/70 bg-[#24170f] text-[#ffd2bd]" : level === "info" ? "border-blue-400/60 bg-[#101827] text-blue-100" : "border-green-500/50 bg-[#102016] text-green-100";
                    return (
                      <div key={m.id ?? i} className={`relative w-full rounded-[0.85rem] border-2 p-3 shadow-xl shadow-black/40 ${color}`}>
                        <div className="flex items-start gap-3">
                          {level === "ok" ? <CheckCircle2 className="mt-0.5 shrink-0" /> : <AlertTriangle className="mt-0.5 shrink-0" />}
                          <div>
                            <div className="font-black uppercase tracking-[0.08em]">{safe(m.rule, safe(m.rule_code, "Melding"))}</div>
                            <div className="mt-1 text-sm font-semibold">{safe(m.boodschap, "Geen toelichting.")}</div>
                            <div className="mt-2 text-xs font-black opacity-80">{safe(m.resultaat)} {m.review_status ? `• review: ${m.review_status}` : ""}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="relative rounded-[0.85rem] border-2 border-green-500/50 bg-[#102016] p-3 text-green-100 shadow-xl shadow-black/40 md:col-span-2">
                    <div className="flex items-center gap-3 font-black"><CheckCircle2 /> Geen meldingen gevonden.</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[0.85rem] border-[5px] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_10px_20px_rgba(0,0,0,0.70),inset_0_1px_0_rgba(255,255,255,0.30)] before:absolute before:inset-[5px] before:rounded-[0.6rem] before:border before:border-white/20 before:content-[''] after:absolute after:right-5 after:top-2 after:h-2 after:w-9 after:rounded-full after:bg-[#ff5a1f] after:blur-[5px] after:content-[''] ${danger ? "border-red-500/70 bg-[linear-gradient(180deg,#321111,#160707)]" : "border-[#d4d0c9] bg-[linear-gradient(180deg,#1a1714,#0f0d0c)]"}`}
    >
      <div
        className={`relative mb-2 flex items-center justify-between ${danger ? "text-red-300" : "text-[#c8bdb3]"}`}
      >
        <span className="text-xs font-black uppercase tracking-[0.2em]">
          {label}
        </span>
        <span>{icon}</span>
      </div>
      <div
        className={`relative text-xl font-black ${danger ? "text-red-200" : "text-white"}`}
      >
        {value}
      </div>
    </div>
  );
}

function DetailBlock({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div className="relative overflow-hidden rounded-[1rem] border-[5px] border-[#d9d6d0] bg-[linear-gradient(180deg,#1b1714,#100e0c)] p-3 shadow-[0_0_0_1px_#524c46,0_0_0_4px_rgba(255,255,255,0.18),0_12px_24px_rgba(0,0,0,0.75),inset_0_2px_0_rgba(255,255,255,0.45)] before:absolute before:inset-[6px] before:rounded-[0.7rem] before:border before:border-[#89847e] before:content-[''] after:absolute after:right-8 after:top-2 after:h-2 after:w-10 after:rounded-full after:bg-[#ff5a1f] after:blur-[5px] after:content-['']">
      <div className="relative mb-2 flex items-center gap-2 text-base font-black text-white">
        <User size={18} className="text-[#ff6a2a]" /> {title}
      </div>
      <div className="relative space-y-1.5">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between gap-4 border-b border-white/10 pb-1.5 text-xs last:border-b-0"
          >
            <span className="font-bold text-[#c8bdb3]">{k}</span>
            <span className="text-right font-black text-white">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
