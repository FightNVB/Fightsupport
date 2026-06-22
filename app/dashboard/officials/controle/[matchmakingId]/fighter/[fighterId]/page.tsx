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

type CorrectBoutForm = {
  va_nummer: string;
  naam: string;
  gym: string;
  discipline: string;
  klasse: string;
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

function isOpenRule(row: FighterRuleResultRow) {
  const review = String(row.review_status ?? "").trim().toLowerCase();
  const resultaat = String(row.resultaat ?? "").trim().toLowerCase();
  return resultaat !== "ok" && resultaat !== "goedgekeurd" && (!review || review === "open");
}

function isLicentieRule(row: FighterRuleResultRow) {
  const text = `${row.rule_code ?? ""} ${row.rule ?? ""} ${row.boodschap ?? ""}`.toLowerCase();
  return text.includes("licentie") || text.includes("license");
}

function hasOpenLicentieRule(rows: FighterRuleResultRow[]) {
  return rows.some((row) => isOpenRule(row) && isLicentieRule(row));
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

const SCRAPE_START_ENDPOINT = () => `/api/control-engine/toernooi-fighter/autocheck`;

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

function effectiveClassFromUitslagenOrNulmeting(fighter: any, uitslagenRows: Uitslag[]) {
  let best = "";
  let bestRank = 0;

  for (const row of uitslagenRows ?? []) {
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

  return best || tournamentClassToken(fighter?.nulmeting_klasse);
}

function hasClassMismatchRule(rows: FighterRuleResultRow[]) {
  return rows.some((row) => {
    const text = `${row.rule_code ?? ""} ${row.rule ?? ""} ${row.boodschap ?? ""}`.toLowerCase();
    return text.includes("toernooi-klasse") || text.includes("toernooiklasse") || text.includes("klasse");
  });
}

function buildSyntheticClassMismatchRule(fighter: any, uitslagenRows: Uitslag[]): FighterRuleResultRow | null {
  const toernooiKlasseRaw = fighter?.klasse;
  const toernooiKlasse = tournamentClassToken(toernooiKlasseRaw);
  const fighterKlasse = effectiveClassFromUitslagenOrNulmeting(fighter, uitslagenRows);
  const hasRelevantUitslagen = (uitslagenRows ?? []).some((row) =>
    isRelevantKickboxingDiscipline(row?.discipline) && !isJeugdKlasseForHistory(row?.klasse) && !!tournamentClassToken(row?.klasse)
  );
  const fighterKlasseRaw = hasRelevantUitslagen ? fighterKlasse : fighter?.nulmeting_klasse;

  if (!toernooiKlasse || !fighterKlasse || toernooiKlasse === fighterKlasse) return null;

  const va = normalizeVa(fighter?.va_nummer ?? fighter?.fighter_id);
  return {
    id: `synthetic-class-${fighter?.toernooi_code ?? "T"}-${va || fighter?.id || "fighter"}`,
    controle_run_id: fighter?.controle_run_id ?? null,
    fighter_id: va || fighter?.fighter_id || null,
    va_nummer: va || fighter?.va_nummer || null,
    rule: "Toernooi klasse",
    rule_code: "TOERNOOI_KLASSE_MISMATCH",
    resultaat: "actie",
    severity: "warning",
    boodschap: `Zit niet in toernooi-klasse (${safe(fighterKlasseRaw, fighterKlasse)} in ${safe(toernooiKlasseRaw, toernooiKlasse)})`,
    review_status: null,
  };
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
  const [savingCorrectie, setSavingCorrectie] = useState(false);
  const [savingReviewId, setSavingReviewId] = useState<string | number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [correctForm, setCorrectForm] = useState<CorrectBoutForm>({
    va_nummer: "",
    naam: "",
    gym: "",
    discipline: "",
    klasse: "",
  });
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
      const paramsAny: any = params ?? {};
      const toernooiCodeParam = firstFilled(
        paramsAny.toernooiCode,
        paramsAny.toernooicode,
        paramsAny.toernooi_code,
        paramsAny.tournamentCode,
      ).toUpperCase();

      const { data: matchRows, error: matchErr } = await supabase
        .from("matchmakings")
        .select("id,naam,datum,locatie,bondteam")
        .eq("id", matchmakingId)
        .limit(1);

      if (matchErr) throw matchErr;
      const mm = (matchRows ?? [])[0] ?? null;
      setMatchmaking(mm);

      const tFilters: string[] = [];
      if (needleVa) {
        // VA-nummers zijn géén UUID's. Zoek numerieke vechters daarom alleen via VA-kolommen.
        tFilters.push(`va_nummer.eq.${needleVa}`);
      }
      if (isUuid(fighterId)) {
        // Alleen UUID-waarden mogen op UUID-kolommen zoals id/fighter_id gebruikt worden.
        tFilters.push(`id.eq.${fighterId}`, `fighter_id.eq.${fighterId}`);
      }

      let tQuery = supabase
        .from("controle_toernooi_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .or(tFilters.length ? tFilters.join(",") : `va_nummer.eq.__NO_VA__`)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (toernooiCodeParam) tQuery = tQuery.eq("toernooi_code", toernooiCodeParam);

      const { data: ctxRows, error: ctxErr } = await tQuery;
      if (ctxErr) throw ctxErr;
      const ctx = (ctxRows ?? [])[0] ?? null;

      let raw: any = null;
      const vaFromCtx = normalizeVa(firstFilled(ctx?.va_nummer, ctx?.fighter_id, fighterId));
      const va = vaFromCtx || needleVa;

      if (va) {
        const { data, error } = await supabase
          .from("fighters_raw")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("va_nummer", va)
          .order("updated_at", { ascending: false })
          .limit(1);
        if (error) throw error;
        raw = (data ?? [])[0] ?? null;
      }

      let rawBout: any = null;
      if (!ctx && va) {
        const boutFilters = [`va_rood.eq.${va}`, `va_blauw.eq.${va}`];
        if (isUuid(fighterId)) boutFilters.push(`fighter_id.eq.${fighterId}`);

        const { data, error } = await supabase
          .from("matchmaking_bouts_raw")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .or(boutFilters.join(","))
          .order("created_at", { ascending: false })
          .limit(1);
        if (error) throw error;
        rawBout = (data ?? [])[0] ?? null;
      }

      if (!ctx && !raw && !rawBout) {
        throw new Error("Geen toernooi-vechter gevonden in controle_toernooi_context, fighters_raw of matchmaking_bouts_raw.");
      }

      const rawBoutSide = va && rawBout
        ? normalizeVa(rawBout?.va_rood ?? rawBout?.rood_va ?? rawBout?.rood_va_mm) === va
          ? "rood"
          : normalizeVa(rawBout?.va_blauw ?? rawBout?.blauw_va ?? rawBout?.blauw_va_mm) === va
            ? "blauw"
            : ""
        : "";

      const keurmerkReason = firstFilled(ctx?.keurmerk_reason, ctx?.keurmerk_reden);
      const nextFighter = {
        id: ctx?.id ?? raw?.id ?? rawBout?.id ?? fighterId,
        context_id: ctx?.id ?? null,
        partij_nr: rawBout?.partij_nr ?? ctx?.partij_nr ?? null,
        hoek: rawBoutSide,
        inschrijving_id: ctx?.aanmelding_id ?? ctx?.inschrijving_id ?? rawBout?.raw_json?.deelnemer?.inschrijving_id ?? null,
        fighter_id: firstFilled(ctx?.fighter_id, ctx?.va_nummer, raw?.fighter_id, raw?.va_nummer, va),
        controle_run_id: firstFilled(ctx?.controle_run_id, raw?.controle_run_id),
        toernooi_code: firstFilled(ctx?.toernooi_code, rawBout?.toernooi_code, rawBout?.raw_json?.toernooi_code),
        naam: firstFilled(ctx?.naam, ctx?.naam_fp, raw?.naam, rawBout?.rood_naam, rawBout?.blauw_naam, fighterId),
        fp_naam: firstFilled(ctx?.naam_fp, raw?.naam),
        fp_geboortedatum: firstFilled(ctx?.geboortedatum, raw?.geboortedatum, ctx?.geboortedatum_fp, rawBout?.rood_geboortedatum, rawBout?.blauw_geboortedatum),
        geboortedatum: firstFilled(ctx?.geboortedatum, raw?.geboortedatum, rawBout?.rood_geboortedatum, rawBout?.blauw_geboortedatum),
        geslacht: firstFilled(ctx?.geslacht, raw?.geslacht),
        gewicht: toNum(ctx?.gewicht ?? raw?.gewicht ?? raw?.gewicht_kg ?? rawBout?.rood_gewicht ?? rawBout?.blauw_gewicht),
        discipline: firstFilled(ctx?.discipline, rawBout?.discipline),
        klasse: firstFilled(ctx?.klasse_mm, ctx?.klasse, rawBout?.klasse, raw?.nulmeting_klasse),
        nulmeting_klasse: firstFilled(ctx?.nulmeting_klasse, raw?.nulmeting_klasse),
        gym: firstFilled(ctx?.sportschool, ctx?.sportschool_mm, raw?.sportschool, raw?.sportschool_naam, rawBout?.rood_gym, rawBout?.blauw_gym),
        va_nummer: va,
        licentie: firstFilled(ctx?.licentie, raw?.licentie),
        heeft_startverbod: firstFilled(ctx?.heeft_startverbod, raw?.heeft_startverbod, raw?.startverbod_actief),
        gewonnen: toNum(ctx?.gewonnen ?? raw?.gewonnen ?? raw?.wins) ?? 0,
        verloren: toNum(ctx?.verloren ?? raw?.verloren ?? raw?.losses) ?? 0,
        onbeslist: toNum(ctx?.draw ?? raw?.draw ?? raw?.draws ?? raw?.gelijk) ?? 0,
        totaal_wedstrijden: toNum(ctx?.totaal_wedstrijden ?? raw?.totaal_wedstrijden ?? raw?.totaal ?? ctx?.nulmeting_totaal) ?? 0,
        nulmeting_totaal: toNum(ctx?.nulmeting_totaal ?? raw?.nulmeting_totaal) ?? 0,
        nulmeting_opmerking: firstFilled(ctx?.nulmeting_opmerking, raw?.nulmeting_opmerking),
        heeft_keurmerk: firstFilled(ctx?.heeft_keurmerk, ctx?.keurmerk_status, ctx?.keurmerk_ok),
        keurmerk_reden: keurmerkReason,
        scrape_status: firstFilled(ctx?.scrape_status, ctx?.gegevens_status, raw?.status),
        scraped_at: firstFilled(ctx?.updated_at, raw?.updated_at, raw?.created_at),
        scrape_run_id: firstFilled(ctx?.controle_run_id, raw?.controle_run_id),
        scrape_error: firstFilled(ctx?.scrape_error),
        raw: raw ?? ctx?.raw_json ?? rawBout?.raw_json ?? {},
      };

      setFighter(nextFighter);
      setCorrectForm({
        va_nummer: safe(nextFighter.va_nummer, ""),
        naam: safe(nextFighter.naam, ""),
        gym: safe(nextFighter.gym, ""),
        discipline: safe(nextFighter.discipline, ""),
        klasse: safe(nextFighter.klasse, ""),
      });
      setEditMode(false);
      setSportschool({
        naam: nextFighter.gym,
        plaats: firstFilled(raw?.plaats),
        keurmerk_einde: extractKeurmerkDate(keurmerkReason),
      });

      let rules: FighterRuleResultRow[] = [];
      if (nextFighter.toernooi_code || va) {
        let q = supabase
          .from("controle_resultaten")
          .select("id,controle_run_id,fighter_id,toernooi_va_nummer,va_nummer,rule,rule_code,resultaat,severity,boodschap,review_status,toernooi_code,partij_nr,bout_id,hoek")
          .eq("matchmaking_id", matchmakingId)
          .order("created_at", { ascending: true });

        if (nextFighter.controle_run_id) q = q.eq("controle_run_id", nextFighter.controle_run_id);
        if (nextFighter.toernooi_code) q = q.eq("toernooi_code", nextFighter.toernooi_code);

        // Toernooi-meldingen zijn niet altijd hetzelfde gevuld:
        // soms staat de VA in toernooi_va_nummer, soms in va_nummer en soms als tekst in fighter_id.
        // Daarom halen we de T1/T2-meldingen breed op en koppelen we lokaal op genormaliseerde VA.
        // Zo vermijden we ook PostgREST/UUID-fouten door een numerieke VA op een UUID-kolom te filteren.
        const res = await q;
        if (res.error) throw res.error;

        const allRules = (res.data ?? []) as FighterRuleResultRow[];
        const wantedVa = normalizeVa(va);
        const wantedUuid = isUuid(fighterId) ? String(fighterId).trim().toLowerCase() : "";

        rules = allRules.filter((row: any) => {
          if (!wantedVa && !wantedUuid) return true;

          const rowToernooi = String(row?.toernooi_code ?? "").trim().toUpperCase();
          const fighterToernooi = String(nextFighter.toernooi_code ?? "").trim().toUpperCase();
          if (fighterToernooi && rowToernooi && rowToernooi !== fighterToernooi) return false;

          const rowVa = normalizeVa(
            firstFilled(row?.toernooi_va_nummer, row?.va_nummer, row?.fighter_id),
          );
          if (wantedVa && rowVa && rowVa === wantedVa) return true;

          const rowFighterId = String(row?.fighter_id ?? "").trim().toLowerCase();
          if (wantedUuid && rowFighterId && rowFighterId === wantedUuid) return true;

          return false;
        });
      }
      let rulesForDisplay = rules;

      if (va) {
        let res = await supabase
          .from("uitslagen_raw")
          .select("id,datum,evenement,tegenstander,uitslag,discipline,klasse,gewicht,sportschool,va_nummer")
          .eq("matchmaking_id", matchmakingId)
          .eq("va_nummer", va)
          .order("datum", { ascending: false });

        if (res.error) throw res.error;
        let rows = (res.data ?? []) as Uitslag[];

        if (!rows.length) {
          const fallback = await supabase
            .from("controle_uitslagen")
            .select("id,datum,evenement,tegenstander,uitslag,discipline,klasse,va_nummer")
            .eq("matchmaking_id", matchmakingId)
            .eq("va_nummer", va)
            .order("datum", { ascending: false });
          if (fallback.error) throw fallback.error;
          rows = (fallback.data ?? []) as Uitslag[];
        }

        setUitslagen(rows);

        // Klassemeldingen komen uit controle_resultaten/rulesEngine.
        // Niet meer frontend-only synthetisch toevoegen, anders wijken overzicht/detail/toernooi van elkaar af.
      } else {
        setUitslagen([]);

        // Klassemeldingen komen uit controle_resultaten/rulesEngine.
        // Niet meer frontend-only synthetisch toevoegen.
      }

      setMeldingen(dedupeRules(rulesForDisplay));
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Toernooi-vechter laden mislukt");
      setFighter(null);
      setSportschool(null);
      setUitslagen([]);
      setMeldingen([]);
    } finally {
      setLoading(false);
    }
  }

  async function runAutocheckFightpaspoort() {
    if (!fighter?.va_nummer) return;

    setChecking(true);
    try {
      const payload = {
        matchmaking_id: matchmakingId,
        toernooi_code: fighter.toernooi_code,
        va_nummer: String(fighter.va_nummer).replace(/\D/g, ""),
        fighter_id: String(fighter.va_nummer).replace(/\D/g, ""),
        source: "toernooi-fighter-detail",
      };

      const res = await authedFetch(SCRAPE_START_ENDPOINT(), {
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

  async function saveCorrectBout() {
    if (!fighter?.toernooi_code || !fighter?.va_nummer) {
      alert("Deze toernooi-vechter heeft geen toernooi_code of VA-nummer. Kan niet opslaan via correct-bout.");
      return;
    }

    const payload: Record<string, any> = {
      matchmaking_id: matchmakingId,
      controle_run_id: fighter.controle_run_id || undefined,
      toernooi_code: fighter.toernooi_code,
      va_nummer: String(fighter.va_nummer).replace(/[^0-9]/g, ""),
      fighter_id: String(fighter.va_nummer).replace(/[^0-9]/g, ""),
      new_va_nummer: correctForm.va_nummer,
      new_naam: correctForm.naam,
      new_gym: correctForm.gym,
      new_discipline: correctForm.discipline,
      new_klasse: correctForm.klasse,
    };

    setSavingCorrectie(true);
    try {
      const res = await authedFetch("/api/control-engine/correct-bout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Opslaan mislukt (${res.status})`);

      await load();
      alert("Gegevens opgeslagen en toernooi-vechter opnieuw gecontroleerd.");
    } catch (err: any) {
      alert(err?.message || "Opslaan mislukt.");
    } finally {
      setSavingCorrectie(false);
    }
  }


  async function reviewMelding(melding: FighterRuleResultRow, decision: "approve" | "reject") {
    const meldingId = melding?.id;
    if (!meldingId && (!fighter?.toernooi_code || !fighter?.va_nummer)) {
      alert("Deze melding heeft geen id en geen toernooi_code/VA om te beoordelen.");
      return;
    }

    let note: string | null = null;
    if (decision === "reject") {
      note = window.prompt("Waarom keur je deze melding af?")?.trim() || null;
      if (!note) {
        alert("Aantekening is verplicht bij afkeuren.");
        return;
      }
    }

    setSavingReviewId(meldingId ?? `${melding.rule_code || melding.rule}-${decision}`);

    try {
      const payload: Record<string, any> = {
        controle_resultaat_id: meldingId,
        decision,
        note,
        matchmaking_id: matchmakingId,
        controle_run_id: melding.controle_run_id || fighter?.controle_run_id || undefined,
        toernooi_code: fighter?.toernooi_code || undefined,
        va_nummer: fighter?.va_nummer || undefined,
        fighter_id: fighter?.va_nummer || undefined,
        toernooi_va_nummer: fighter?.va_nummer || undefined,
        rule_code: melding.rule_code || undefined,
        rule: melding.rule || undefined,
      };

      const res = await authedFetch("/api/control-engine/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Review mislukt (${res.status})`);

      await load();
    } catch (err: any) {
      alert(err?.message || "Review mislukt.");
    } finally {
      setSavingReviewId(null);
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

  const openLicentieMelding = hasOpenLicentieRule(meldingen);
  const hasLicense = !openLicentieMelding && yes(fighter?.licentie);
  const startverbod = yes(fighter?.heeft_startverbod, ["ja", "yes", "true"]);
  const age = calcAgeAtDate(fighter?.fp_geboortedatum ?? fighter?.geboortedatum, matchmaking?.datum);
  const canCorrectBout = !!fighter?.toernooi_code && !!fighter?.va_nummer;

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
                    Toernooi vechter
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
                  Toernooi
                </div>
                <div className="text-sm text-[#d1c3b7]">
                  Controleprofiel, licentie, nulmeting, meldingen en uitslagen.
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
                      onClick={() => router.push(`/dashboard/admin/controle/${matchmakingId}`)}
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

              <div className="relative border-t border-[#b8afa6]/35 p-3">
                <div className="mb-2 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.18em] text-[#ff8a4c]">Gegevens corrigeren</div>
                    <div className="text-xs text-[#c8bdb3]">
                      Opslaan loopt via /api/control-engine/correct-bout op toernooi_code + VA en bouwt de toernooi-controle opnieuw op.
                      {canCorrectBout ? ` Toernooi ${fighter.toernooi_code} • VA ${fighter.va_nummer}` : " Geen toernooi_code/VA gevonden: corrigeren is hier uitgeschakeld."}
                    </div>
                  </div>
                  <div className="sticky top-2 z-20 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#1b1714]/95 p-2 shadow-lg shadow-black/30 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
                    {!editMode ? (
                      <button
                        onClick={() => setEditMode(true)}
                        disabled={!canCorrectBout}
                        className="border-2 border-[#d7d4ce] bg-[linear-gradient(180deg,#ffffff,#adadad_44%,#eeeeee_52%,#6f6f6f)] px-4 py-2 text-xs font-black text-black shadow-[inset_0_1px_0_#fff,0_4px_0_#28140c] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Wijzigen
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setCorrectForm({
                              va_nummer: safe(fighter.va_nummer, ""),
                              naam: safe(fighter.naam, ""),
                              gym: safe(fighter.gym, ""),
                              discipline: safe(fighter.discipline, ""),
                              klasse: safe(fighter.klasse, ""),
                            });
                            setEditMode(false);
                          }}
                          disabled={savingCorrectie}
                          className="border-2 border-[#d7d4ce] bg-[#161311] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                        >
                          Annuleren
                        </button>
                        <button
                          onClick={saveCorrectBout}
                          disabled={savingCorrectie || !canCorrectBout}
                          className="border-2 border-[#ff7a3d] bg-[linear-gradient(180deg,#ff6a22,#b73600)] px-4 py-2 text-xs font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_4px_0_#28140c] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingCorrectie ? "Opslaan..." : "Opslaan"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  <EditField label="VA" value={correctForm.va_nummer} disabled={!editMode} onChange={(v) => setCorrectForm((p) => ({ ...p, va_nummer: v.replace(/[^0-9]/g, "") }))} />
                  <EditField label="Naam" value={correctForm.naam} disabled={!editMode} onChange={(v) => setCorrectForm((p) => ({ ...p, naam: v }))} />
                  <EditField label="Sportschool" value={correctForm.gym} disabled={!editMode} onChange={(v) => setCorrectForm((p) => ({ ...p, gym: v }))} />
                  <EditField label="Discipline" value={correctForm.discipline} disabled={!editMode} onChange={(v) => setCorrectForm((p) => ({ ...p, discipline: v }))} />
                  <EditField label="Klasse" value={correctForm.klasse} disabled={!editMode} onChange={(v) => setCorrectForm((p) => ({ ...p, klasse: v }))} />
                </div>
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
                    Gelezen uit uitslagen_raw / controle_uitslagen op VA {safe(fighter.va_nummer)}.
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
                    Gelezen uit controle_resultaten voor deze toernooi-vechter.
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
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => reviewMelding(m, "approve")}
                                disabled={savingReviewId === m.id || String(m.review_status ?? "").toLowerCase() === "goedgekeurd"}
                                className="border-2 border-green-400/70 bg-[linear-gradient(180deg,#1f8a43,#0f4d25)] px-3 py-1.5 text-xs font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_3px_0_rgba(0,0,0,0.55)] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingReviewId === m.id ? "Bezig..." : "Goedkeuren"}
                              </button>
                              <button
                                type="button"
                                onClick={() => reviewMelding(m, "reject")}
                                disabled={savingReviewId === m.id}
                                className="border-2 border-red-400/70 bg-[linear-gradient(180deg,#b91c1c,#5f0f0f)] px-3 py-1.5 text-xs font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_3px_0_rgba(0,0,0,0.55)] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Afkeuren
                              </button>
                            </div>
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

function EditField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-[#c8bdb3]">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-2 border-[#8a8178] bg-[#080808] px-3 py-2 text-sm font-black text-white outline-none transition focus:border-[#ff6a2a] disabled:opacity-65"
      />
    </label>
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
