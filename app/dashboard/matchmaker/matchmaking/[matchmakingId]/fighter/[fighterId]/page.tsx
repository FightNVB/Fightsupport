"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import dayjs from "dayjs";
import { bebasNeue } from "@/app/fonts";
import {
  ArrowLeft,
  Save,
  Phone,
  ShieldCheck,
  ShieldX,
  UserRound,
  Dumbbell,
  CalendarDays,
  Scale,
  Trophy,
  AlertTriangle,
  BadgeInfo,
  FileDigit,
  MapPin,
  RefreshCcw,
  Pencil,
  X,
  Bell,
  Building2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";


const ORANGE = "#ff4d00";
const DARK = "#2b3138";
const DARKER = "#1f242b";
const HERO_ART_SRC = "/branding/fightsupport/fighter-shield.png";
const AUTOCHECK_ENDPOINT = "/api/matchmaker/fighter-rescrape";

/* =========================
   TYPES
========================= */

type FighterRow = {
  id: string;
  fighter_id: string | null;
  matchmaking_id: string | null;
  upload_id?: string | null;
  row_nr?: number | null;

  voornaam: string | null;
  achternaam: string | null;
  naam_input: string | null;

  geboortedatum: string | null;
  geslacht: string | null;

  discipline: string | null;
  klasse: string | null;
  gewicht: number | string | null;

  gym: string | null;
  trainer_naam: string | null;
  trainer_email: string | null;
  trainer_tel: string | null;

  licentie: boolean | string | null;
  startverbod: boolean | string | null;

  va_nummer: string | null;
  email: string | null;
  telefoon: string | null;

  win: number | null;
  loss: number | null;
  draw: number | null;
  demo: number | null;

  extra_opmerking: string | null;
  nulmeting_opmerking: string | null;
  opmerkingen: string | null;

  created_at: string | null;
};

type MatchmakingRow = {
  id: string;
  naam: string | null;
  datum: string | null;
  locatie: string | null;
  bondteam: string | null;
};

type RawFighterRow = {
  id: string;
  matchmaking_id: string | null;
  controle_run_id: string | null;
  fighter_id: string | null;
  row_nr: number | null;

  va_nummer: string | number | null;
  naam: string | null;
  geboortedatum: string | null;
  geslacht: string | null;

  licentie: string | boolean | null;
  heeft_startverbod: string | boolean | null;

  totaal_wedstrijden: number | null;
  gewonnen: number | null;
  verloren?: number | null;
  gelijk?: number | null;

  nulmeting_totaal: number | null;
  nulmeting_opmerking: string | null;
  nulmeting_klasse: string | null;

  updated_at: string | null;
};

type FighterContextRow = {
  id: string | number;
  matchmaking_id: string | null;
  controle_run_id: string | null;
  inschrijving_id: string | number | null;
  fighter_id: string | null;
  row_nr: number | null;
  updated_at: string | null;

  discipline: string | null;
  klasse: string | null;
  geslacht: string | null;
  voornaam: string | null;
  achternaam: string | null;
  naam_input: string | null;
  gym_input: string | null;
  geboortedatum_input: string | null;
  gewicht: number | string | null;
  va_nummer: string | null;

  fp_naam: string | null;
  fp_geboortedatum: string | null;
  fp_gym: string | null;
  fp_klasse: string | null;

  record_w: number | null;
  record_l: number | null;
  record_d: number | null;

  uitslagen_count: number | null;
  laatste_partij_datum: string | null;
  nulmeting_opmerking: string | null;
  heeft_keurmerk: string | boolean | null;
  extra: any;
};

type ResultRow = {
  id: string | number;
  matchmaking_id: string | null;
  controle_run_id: string | null;
  fighter_id: string | null;
  partij_nr: number | null;

  va_nummer: string | null;
  datum: string | null;
  evenement: string | null;
  uitslag: string | null;
  discipline: string | null;
  klasse: string | null;
  sportschool: string | null;
  tegenstander: string | null;
  opmerking: string | null;
  gewicht: string | number | null;
  created_at: string | null;
};

type FighterRuleResultRow = {
  id: string | number;
  matchmaking_id: string | null;
  controle_run_id: string | null;
  fighter_id: string | null;
  inschrijving_id: string | null;
  row_nr: number | null;
  naam: string | null;
  va_nummer: string | null;
  rule: string | null;
  rule_code: string | null;
  resultaat: string | null;
  severity: string | null;
  boodschap: string | null;
  created_at: string | null;
};

/* =========================
   HELPERS
========================= */

function s(v: unknown) {
  return String(v ?? "").trim();
}

function norm(v: unknown) {
  return s(v).toLowerCase();
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function boolLike(v: unknown): boolean | null {
  if (v == null || v === "") return null;
  if (typeof v === "boolean") return v;
  const x = norm(v);
  if (["1", "true", "ja", "yes", "y"].includes(x)) return true;
  if (["0", "false", "nee", "no", "n"].includes(x)) return false;
  return null;
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function formatDate(v?: string | null) {
  if (!v) return "-";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD-MM-YYYY") : String(v);
}

function formatWeight(v: unknown) {
  const n = toNum(v);
  return n == null ? "-" : `${n.toFixed(2)} kg`;
}

function normalizeGender(v?: string | null) {
  const x = norm(v);
  if (!x) return "-";
  if (["vrouw", "v", "female", "f", "dame", "meisje"].includes(x)) return "Vrouw";
  if (["man", "m", "male", "heer", "jongen"].includes(x)) return "Man";
  return s(v) || "-";
}

function calcAgeToday(birth?: string | null) {
  if (!birth) return null;
  const d = dayjs(birth);
  if (!d.isValid()) return null;
  return dayjs().diff(d, "year");
}

function calcAgeAtDate(birth?: string | null, at?: string | null) {
  if (!birth || !at) return null;
  const b = dayjs(birth);
  const e = dayjs(at);
  if (!b.isValid() || !e.isValid()) return null;
  return e.diff(b, "year");
}

function compactName(first?: string | null, last?: string | null, fallback?: string | null) {
  const full = `${s(first)} ${s(last)}`.trim();
  return full || s(fallback) || "Onbekend";
}

function getTotalPartijenFromInschrijving(f: FighterRow | null) {
  if (!f) return 0;
  const win = toNum(f.win) ?? 0;
  const loss = toNum(f.loss) ?? 0;
  const draw = toNum(f.draw) ?? 0;
  const demo = toNum(f.demo) ?? 0;
  const isYouth = norm(f.klasse).includes("jeugd");
  if (!isYouth) return win + loss + draw + demo;
  return win + loss + draw + Math.floor(demo / 3);
}

function getTotalPartijenSmart(
  fighter: FighterRow | null,
  raw: RawFighterRow | null,
  context: FighterContextRow | null,
  results: ResultRow[]
) {
  const fromRaw = toNum(raw?.totaal_wedstrijden);
  if (fromRaw != null) return fromRaw;

  const fromContext = toNum(context?.uitslagen_count);
  if (fromContext != null) return fromContext;

  if (results.length > 0) return results.length;
  return getTotalPartijenFromInschrijving(fighter);
}

function resultLabel(v?: string | null) {
  const x = norm(v);
  if (!x) return "-";
  if (x.includes("win") || x.includes("winst")) return "Winst";
  if (x.includes("verlies") || x.includes("loss")) return "Verlies";
  if (x.includes("onbeslist") || x.includes("draw")) return "Onbeslist";
  if (x.includes("demo")) return "Demo";
  if (x.includes("no contest")) return "No contest";
  return s(v);
}

function safeText(v: unknown, fallback = "-") {
  const out = s(v);
  return out || fallback;
}

function statusBadgeStyle(kind: "green" | "red"): CSSProperties {
  const map = {
    green: {
      bg: "linear-gradient(180deg, rgba(34,197,94,0.96) 0%, rgba(21,128,61,0.96) 100%)",
      bd: "rgba(34,197,94,0.44)",
      tx: "#f3fff8",
    },
    red: {
      bg: "linear-gradient(180deg, rgba(239,68,68,0.96) 0%, rgba(153,27,27,0.96) 100%)",
      bd: "rgba(248,113,113,0.42)",
      tx: "#fff4f4",
    },
  }[kind];

  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 31,
    padding: "0 10px",
    borderRadius: 4,
    background: map.bg,
    border: `1px solid ${map.bd}`,
    color: map.tx,
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: "0.01em",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px rgba(0,0,0,0.22)",
  };
}

function mapSeverityToMeldingLevel(
  severity?: string | null,
  resultaat?: string | null
): "ok" | "info" | "warn" | "error" {
  const sev = norm(severity);
  const res = norm(resultaat);

  if (sev === "error" || res === "afkeur" || res === "verbod") return "error";
  if (sev === "warning" || res === "actie" || res === "dispensatie") return "warn";
  if (sev === "info" || res === "info") return "info";
  return "ok";
}

function buildRuleMeldingen(
  ruleResults: FighterRuleResultRow[],
  nulmetingOpmerking: string,
  resultsCount: number
) {
  const rows: {
    level: "ok" | "info" | "warn" | "error";
    title: string;
    text: string;
  }[] = [];

  for (const rr of ruleResults) {
    rows.push({
      level: mapSeverityToMeldingLevel(rr.severity, rr.resultaat),
      title: safeText(rr.rule, safeText(rr.rule_code, "Melding")),
      text:
        safeText(rr.boodschap, "Geen aanvullende toelichting beschikbaar.") +
        (rr.resultaat ? ` (${String(rr.resultaat).toUpperCase()})` : ""),
    });
  }

  if (rows.length === 0 && nulmetingOpmerking !== "-" && nulmetingOpmerking !== "") {
    rows.push({
      level: "warn",
      title: "Nulmeting opmerking",
      text: nulmetingOpmerking,
    });
  }

  if (rows.length === 0 && resultsCount === 0) {
    rows.push({
      level: "warn",
      title: "Geen uitslagenhistorie",
      text: "Er zijn nog geen uitslagen gevonden voor deze vechter binnen de beschikbare dataset.",
    });
  }

  if (rows.length === 0) {
    rows.push({
      level: "ok",
      title: "Geen meldingen",
      text: "Voor deze vechter zijn momenteel geen fighter rules meldingen gevonden.",
    });
  }

  return rows;
}

function determineAdultWeightClass(weight: unknown, discipline?: string | null) {
  const kg = toNum(weight);
  if (kg == null) return "-";

  const d = norm(discipline);
  const isMma = d.includes("mma");

  const mmaClasses = [
    { max: 52.2, label: "Strawweight" },
    { max: 56.7, label: "Flyweight" },
    { max: 61.2, label: "Bantamweight" },
    { max: 65.8, label: "Featherweight" },
    { max: 70.3, label: "Lightweight" },
    { max: 77.1, label: "Welterweight" },
    { max: 83.9, label: "Middleweight" },
    { max: 93.0, label: "Light Heavyweight" },
    { max: 120.2, label: "Heavyweight" },
    { max: Infinity, label: "Super Heavyweight" },
  ];

  const kbClasses = [
    { max: 48.99, label: "Junior Flyweight" },
    { max: 50.8, label: "Flyweight" },
    { max: 52.16, label: "Junior Bantamweight" },
    { max: 53.52, label: "Bantamweight" },
    { max: 55.34, label: "Junior Featherweight" },
    { max: 57.15, label: "Featherweight" },
    { max: 58.97, label: "Junior Lightweight" },
    { max: 61.23, label: "Lightweight" },
    { max: 63.5, label: "Super Lightweight" },
    { max: 66.68, label: "Welterweight" },
    { max: 69.85, label: "Junior Middleweight" },
    { max: 72.57, label: "Middleweight" },
    { max: 76.2, label: "Super Middleweight" },
    { max: 79.38, label: "Light Heavyweight" },
    { max: 82.55, label: "Super Light Heavyweight" },
    { max: 86.18, label: "Cruiserweight" },
    { max: 95.0, label: "Heavyweight" },
    { max: Infinity, label: "Super Heavyweight" },
  ];

  const found = (isMma ? mmaClasses : kbClasses).find((x) => kg <= x.max);
  return found?.label ?? "-";
}

/* =========================
   PAGE
========================= */

export default function FighterPage() {
  const router = useRouter();
  const params = useParams<{ matchmakingId: string; fighterId: string }>();

  const matchmakingId = s(params?.matchmakingId);
  const fighterId = s(params?.fighterId);

  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<
    "" | "persoonlijk" | "contact" | "details"
  >("");
  const [checking, setChecking] = useState(false);

  const [fighter, setFighter] = useState<FighterRow | null>(null);
  const [matchmaking, setMatchmaking] = useState<MatchmakingRow | null>(null);
  const [rawFighter, setRawFighter] = useState<RawFighterRow | null>(null);
  const [fighterContext, setFighterContext] = useState<FighterContextRow | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [ruleResults, setRuleResults] = useState<FighterRuleResultRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editingPersoonlijk, setEditingPersoonlijk] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);

  const [persoonlijkForm, setPersoonlijkForm] = useState({
    voornaam: "",
    achternaam: "",
    geboortedatum: "",
    geslacht: "",
    va_nummer: "",
  });

  const [detailsForm, setDetailsForm] = useState({
    discipline: "",
    klasse: "",
    gewicht: "",
    gym: "",
    trainer_naam: "",
  });

  const [contactForm, setContactForm] = useState({
    email: "",
    telefoon: "",
  });

  const loadData = useCallback(async () => {
    if (!matchmakingId || !fighterId) return;

    setLoading(true);
    setLoadError(null);

    try {
      let resolvedFighter: FighterRow | null = null;

      {
        const q1 = await supabase
          .from("matchmaker_inschrijvingen")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("fighter_id", fighterId)
          .maybeSingle();

        if (q1.data) resolvedFighter = q1.data as FighterRow;
      }

      if (!resolvedFighter && fighterId && isUuid(fighterId)) {
        const q2 = await supabase
          .from("matchmaker_inschrijvingen")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("id", fighterId)
          .maybeSingle();

        if (q2.data) resolvedFighter = q2.data as FighterRow;
      }

      if (!resolvedFighter && fighterId) {
        const q3 = await supabase
          .from("matchmaker_inschrijvingen")
          .select("*")
          .eq("fighter_id", fighterId)
          .maybeSingle();

        if (q3.data) resolvedFighter = q3.data as FighterRow;
      }

      const { data: mmData } = await supabase
        .from("matchmaker_matchmakings")
        .select("id, naam, datum, locatie, bondteam")
        .eq("id", matchmakingId)
        .maybeSingle();

      setMatchmaking((mmData as MatchmakingRow | null) ?? null);
      setFighter(resolvedFighter);

      if (!resolvedFighter) {
        setRawFighter(null);
        setFighterContext(null);
        setResults([]);
        setRuleResults([]);
        setLoading(false);
        return;
      }

      setPersoonlijkForm({
        voornaam: resolvedFighter.voornaam ?? "",
        achternaam: resolvedFighter.achternaam ?? "",
        geboortedatum: resolvedFighter.geboortedatum ?? "",
        geslacht: resolvedFighter.geslacht ?? "",
        va_nummer: resolvedFighter.va_nummer ?? "",
      });

      setDetailsForm({
        discipline: resolvedFighter.discipline ?? "",
        klasse: resolvedFighter.klasse ?? "",
        gewicht: resolvedFighter.gewicht == null ? "" : String(resolvedFighter.gewicht),
        gym: resolvedFighter.gym ?? "",
        trainer_naam: resolvedFighter.trainer_naam ?? "",
      });

      setContactForm({
        email: resolvedFighter.email ?? resolvedFighter.trainer_email ?? "",
        telefoon: resolvedFighter.telefoon ?? resolvedFighter.trainer_tel ?? "",
      });

      const resolvedVa = s(resolvedFighter.va_nummer) || null;
      const resolvedRowNr = resolvedFighter.row_nr ?? null;
      const resolvedInschrijvingId = resolvedFighter.id ?? null;
      const resolvedFighterId = s(resolvedFighter.fighter_id) || null;

      let raw: RawFighterRow | null = null;

      if (resolvedFighterId) {
        const r1 = await supabase
          .from("matchmaker_fighters_raw")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("fighter_id", resolvedFighterId)
          .order("updated_at", { ascending: false })
          .limit(1);

        raw = (r1.data?.[0] as RawFighterRow | undefined) ?? null;
      }

      if (!raw && resolvedVa) {
        const r2 = await supabase
          .from("matchmaker_fighters_raw")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("va_nummer", resolvedVa)
          .order("updated_at", { ascending: false })
          .limit(1);

        raw = (r2.data?.[0] as RawFighterRow | undefined) ?? null;
      }

      if (!raw && resolvedRowNr != null) {
        const r3 = await supabase
          .from("matchmaker_fighters_raw")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("row_nr", resolvedRowNr)
          .order("updated_at", { ascending: false })
          .limit(1);

        raw = (r3.data?.[0] as RawFighterRow | undefined) ?? null;
      }

      setRawFighter(raw);

      let ctx: FighterContextRow | null = null;

      if (resolvedFighterId) {
        const c1 = await supabase
          .from("matchmaker_fighter_context")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("fighter_id", resolvedFighterId)
          .order("updated_at", { ascending: false })
          .limit(1);

        ctx = (c1.data?.[0] as FighterContextRow | undefined) ?? null;
      }

      if (!ctx && resolvedInschrijvingId) {
        const c2 = await supabase
          .from("matchmaker_fighter_context")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("inschrijving_id", resolvedInschrijvingId)
          .order("updated_at", { ascending: false })
          .limit(1);

        ctx = (c2.data?.[0] as FighterContextRow | undefined) ?? null;
      }

      if (!ctx && resolvedVa) {
        const c3 = await supabase
          .from("matchmaker_fighter_context")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("va_nummer", resolvedVa)
          .order("updated_at", { ascending: false })
          .limit(1);

        ctx = (c3.data?.[0] as FighterContextRow | undefined) ?? null;
      }

      if (!ctx && resolvedRowNr != null) {
        const c4 = await supabase
          .from("matchmaker_fighter_context")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("row_nr", resolvedRowNr)
          .order("updated_at", { ascending: false })
          .limit(1);

        ctx = (c4.data?.[0] as FighterContextRow | undefined) ?? null;
      }

      setFighterContext(ctx);

      let resultRows: ResultRow[] = [];

      if (resolvedFighterId) {
        const u1 = await supabase
          .from("matchmaker_uitslagen_raw")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("fighter_id", resolvedFighterId)
          .order("datum", { ascending: false });

        if (!u1.error && (u1.data?.length ?? 0) > 0) {
          resultRows = (u1.data as ResultRow[]) ?? [];
        }
      }

      if (resultRows.length === 0 && resolvedVa) {
        const u2 = await supabase
          .from("matchmaker_uitslagen_raw")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("va_nummer", resolvedVa)
          .order("datum", { ascending: false });

        resultRows = (u2.data as ResultRow[]) ?? [];
      }

      setResults(resultRows);

      let latestRunId: string | null =
        s(ctx?.controle_run_id) || s(raw?.controle_run_id) || null;

      if (!latestRunId) {
        const runQ = await supabase
          .from("matchmaker_fighter_resultaten")
          .select("controle_run_id, created_at")
          .eq("matchmaking_id", matchmakingId)
          .order("created_at", { ascending: false })
          .limit(25);

        latestRunId =
          (runQ.data ?? [])
            .map((x: any) => s(x?.controle_run_id))
            .find(Boolean) || null;
      }

      let rules: FighterRuleResultRow[] = [];

      async function loadRulesForRun(runId: string) {
        if (!runId) return [];

        if (resolvedFighterId) {
          const rr1 = await supabase
            .from("matchmaker_fighter_resultaten")
            .select("*")
            .eq("matchmaking_id", matchmakingId)
            .eq("controle_run_id", runId)
            .eq("fighter_id", resolvedFighterId)
            .order("created_at", { ascending: true });

          if (!rr1.error && (rr1.data?.length ?? 0) > 0) {
            return rr1.data as FighterRuleResultRow[];
          }
        }

        if (resolvedInschrijvingId) {
          const rr2 = await supabase
            .from("matchmaker_fighter_resultaten")
            .select("*")
            .eq("matchmaking_id", matchmakingId)
            .eq("controle_run_id", runId)
            .eq("inschrijving_id", resolvedInschrijvingId)
            .order("created_at", { ascending: true });

          if (!rr2.error && (rr2.data?.length ?? 0) > 0) {
            return rr2.data as FighterRuleResultRow[];
          }
        }

        if (resolvedRowNr != null) {
          const rr3 = await supabase
            .from("matchmaker_fighter_resultaten")
            .select("*")
            .eq("matchmaking_id", matchmakingId)
            .eq("controle_run_id", runId)
            .eq("row_nr", resolvedRowNr)
            .order("created_at", { ascending: true });

          if (!rr3.error && (rr3.data?.length ?? 0) > 0) {
            return rr3.data as FighterRuleResultRow[];
          }
        }

        if (resolvedVa) {
          const rr4 = await supabase
            .from("matchmaker_fighter_resultaten")
            .select("*")
            .eq("matchmaking_id", matchmakingId)
            .eq("controle_run_id", runId)
            .eq("va_nummer", resolvedVa)
            .order("created_at", { ascending: true });

          if (!rr4.error && (rr4.data?.length ?? 0) > 0) {
            return rr4.data as FighterRuleResultRow[];
          }
        }

        return [];
      }

      if (latestRunId) {
        rules = await loadRulesForRun(latestRunId);
      }

      if (rules.length === 0) {
        if (resolvedFighterId) {
          const rrFallback1 = await supabase
            .from("matchmaker_fighter_resultaten")
            .select("*")
            .eq("matchmaking_id", matchmakingId)
            .eq("fighter_id", resolvedFighterId)
            .order("created_at", { ascending: false });

          if (!rrFallback1.error && (rrFallback1.data?.length ?? 0) > 0) {
            rules = rrFallback1.data as FighterRuleResultRow[];
          }
        }

        if (rules.length === 0 && resolvedInschrijvingId) {
          const rrFallback2 = await supabase
            .from("matchmaker_fighter_resultaten")
            .select("*")
            .eq("matchmaking_id", matchmakingId)
            .eq("inschrijving_id", resolvedInschrijvingId)
            .order("created_at", { ascending: false });

          if (!rrFallback2.error && (rrFallback2.data?.length ?? 0) > 0) {
            rules = rrFallback2.data as FighterRuleResultRow[];
          }
        }

        if (rules.length === 0 && resolvedRowNr != null) {
          const rrFallback3 = await supabase
            .from("matchmaker_fighter_resultaten")
            .select("*")
            .eq("matchmaking_id", matchmakingId)
            .eq("row_nr", resolvedRowNr)
            .order("created_at", { ascending: false });

          if (!rrFallback3.error && (rrFallback3.data?.length ?? 0) > 0) {
            rules = rrFallback3.data as FighterRuleResultRow[];
          }
        }

        if (rules.length === 0 && resolvedVa) {
          const rrFallback4 = await supabase
            .from("matchmaker_fighter_resultaten")
            .select("*")
            .eq("matchmaking_id", matchmakingId)
            .eq("va_nummer", resolvedVa)
            .order("created_at", { ascending: false });

          if (!rrFallback4.error && (rrFallback4.data?.length ?? 0) > 0) {
            rules = rrFallback4.data as FighterRuleResultRow[];
          }
        }
      }

      setRuleResults(rules);
    } catch (err: any) {
      setLoadError(err?.message || "Onbekende fout bij laden.");
    } finally {
      setLoading(false);
    }
  }, [matchmakingId, fighterId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const naam = useMemo(() => {
    return (
      compactName(fighter?.voornaam, fighter?.achternaam, fighter?.naam_input) ||
      compactName(
        fighterContext?.voornaam,
        fighterContext?.achternaam,
        fighterContext?.naam_input
      ) ||
      safeText(fighterContext?.fp_naam) ||
      safeText(rawFighter?.naam, "Onbekend")
    );
  }, [fighter, fighterContext, rawFighter]);

  const geboortedatum = useMemo(
    () =>
      fighter?.geboortedatum ??
      fighterContext?.geboortedatum_input ??
      fighterContext?.fp_geboortedatum ??
      rawFighter?.geboortedatum ??
      null,
    [fighter, fighterContext, rawFighter]
  );

  const discipline = useMemo(
    () => fighter?.discipline ?? fighterContext?.discipline ?? null,
    [fighter, fighterContext]
  );

  const klasse = useMemo(
    () => fighter?.klasse ?? fighterContext?.klasse ?? fighterContext?.fp_klasse ?? null,
    [fighter, fighterContext]
  );

  const geslacht = useMemo(
    () => fighter?.geslacht ?? fighterContext?.geslacht ?? rawFighter?.geslacht ?? null,
    [fighter, fighterContext, rawFighter]
  );

  const gewicht = useMemo(
    () => fighter?.gewicht ?? fighterContext?.gewicht ?? null,
    [fighter, fighterContext]
  );

  const gym = useMemo(
    () => fighter?.gym ?? fighterContext?.gym_input ?? fighterContext?.fp_gym ?? null,
    [fighter, fighterContext]
  );

  const trainerNaam = useMemo(
    () => fighter?.trainer_naam ?? fighterContext?.extra?.trainer_naam ?? null,
    [fighter, fighterContext]
  );

  const licentie = useMemo(
    () => boolLike(rawFighter?.licentie ?? fighter?.licentie ?? fighterContext?.extra?.licentie),
    [rawFighter, fighter, fighterContext]
  );

  const startverbod = useMemo(
    () =>
      boolLike(
        rawFighter?.heeft_startverbod ??
          fighter?.startverbod ??
          fighterContext?.extra?.startverbod
      ),
    [rawFighter, fighter, fighterContext]
  );

  const leeftijdNu = useMemo(() => calcAgeToday(geboortedatum), [geboortedatum]);
  const leeftijdEvent = useMemo(
    () => calcAgeAtDate(geboortedatum, matchmaking?.datum),
    [geboortedatum, matchmaking?.datum]
  );

  const totaalPartijen = useMemo(
    () => getTotalPartijenSmart(fighter, rawFighter, fighterContext, results),
    [fighter, rawFighter, fighterContext, results]
  );

  const nulmetingOpmerking = useMemo(() => {
    return (
      rawFighter?.nulmeting_opmerking ??
      fighterContext?.nulmeting_opmerking ??
      fighter?.nulmeting_opmerking ??
      "-"
    );
  }, [rawFighter, fighterContext, fighter]);

  const nulmetingTotaal = useMemo(() => {
    const n = toNum(rawFighter?.nulmeting_totaal ?? fighterContext?.extra?.nulmeting_totaal);
    return n == null ? "-" : String(n);
  }, [rawFighter, fighterContext]);

  const nulmetingKlasse = useMemo(() => {
    return safeText(rawFighter?.nulmeting_klasse ?? fighterContext?.fp_klasse, "-");
  }, [rawFighter, fighterContext]);

  const gewichtKlasseVolwassen = useMemo(() => {
    const isYouth =
      norm(klasse).includes("jeugd") ||
      norm(klasse).includes("youth") ||
      (leeftijdEvent != null && leeftijdEvent < 18);

    if (isYouth) return "-";
    return determineAdultWeightClass(gewicht, discipline);
  }, [gewicht, discipline, klasse, leeftijdEvent]);

  const meldingen = useMemo(
    () => buildRuleMeldingen(ruleResults, safeText(nulmetingOpmerking, "-"), results.length),
    [ruleResults, nulmetingOpmerking, results.length]
  );

  function resetPersoonlijkForm() {
    setPersoonlijkForm({
      voornaam: fighter?.voornaam ?? "",
      achternaam: fighter?.achternaam ?? "",
      geboortedatum: fighter?.geboortedatum ?? "",
      geslacht: fighter?.geslacht ?? "",
      va_nummer: fighter?.va_nummer ?? "",
    });
  }

  function resetDetailsForm() {
    setDetailsForm({
      discipline: fighter?.discipline ?? "",
      klasse: fighter?.klasse ?? "",
      gewicht: fighter?.gewicht == null ? "" : String(fighter.gewicht),
      gym: fighter?.gym ?? "",
      trainer_naam: fighter?.trainer_naam ?? "",
    });
  }

  function resetContactForm() {
    setContactForm({
      email: fighter?.email ?? fighter?.trainer_email ?? "",
      telefoon: fighter?.telefoon ?? fighter?.trainer_tel ?? "",
    });
  }

  async function savePersoonlijk() {
    if (!fighter?.id) return;
    setSavingSection("persoonlijk");

    const payload = {
      voornaam: persoonlijkForm.voornaam || null,
      achternaam: persoonlijkForm.achternaam || null,
      geboortedatum: persoonlijkForm.geboortedatum || null,
      geslacht: persoonlijkForm.geslacht || null,
      va_nummer: persoonlijkForm.va_nummer || null,
    };

    const { error } = await supabase
      .from("matchmaker_inschrijvingen")
      .update(payload)
      .eq("id", fighter.id);

    setSavingSection("");

    if (error) {
      alert(error.message || "Opslaan mislukt");
      return;
    }

    setFighter((prev) => (prev ? { ...prev, ...payload } : prev));
    setEditingPersoonlijk(false);
    alert("Persoonlijke gegevens opgeslagen");
  }

  async function saveDetails() {
    if (!fighter?.id) return;
    setSavingSection("details");

    const payload = {
      discipline: detailsForm.discipline || null,
      klasse: detailsForm.klasse || null,
      gewicht: detailsForm.gewicht === "" ? null : toNum(detailsForm.gewicht),
      gym: detailsForm.gym || null,
      trainer_naam: detailsForm.trainer_naam || null,
    };

    const { error } = await supabase
      .from("matchmaker_inschrijvingen")
      .update(payload)
      .eq("id", fighter.id);

    setSavingSection("");

    if (error) {
      alert(error.message || "Opslaan mislukt");
      return;
    }

    setFighter((prev) => (prev ? { ...prev, ...payload } : prev));
    setEditingDetails(false);
    alert("Vechterdetails opgeslagen");
  }

  async function saveContact() {
    if (!fighter?.id) return;
    setSavingSection("contact");

    const payload = {
      email: contactForm.email || null,
      telefoon: contactForm.telefoon || null,
    };

    const { error } = await supabase
      .from("matchmaker_inschrijvingen")
      .update(payload)
      .eq("id", fighter.id);

    setSavingSection("");

    if (error) {
      alert(error.message || "Opslaan mislukt");
      return;
    }

    setFighter((prev) => (prev ? { ...prev, ...payload } : prev));
    setEditingContact(false);
    alert("Contactgegevens opgeslagen");
  }

  async function runAutocheckFightpaspoort() {
    if (!fighter) return;

    setChecking(true);

    try {
      const payload = {
        matchmaking_id: matchmakingId,
        fighter_id: fighter.fighter_id ?? null,
        inschrijving_id: fighter.id ?? null,
        row_nr: fighter.row_nr ?? null,
        va_nummer: fighter.va_nummer ?? null,
      };

      const res = await authedFetch(AUTOCHECK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (res.status === 404) {
        alert(`Autocheck gaf 404 op ${AUTOCHECK_ENDPOINT}`);
        return;
      }

      if (res.status === 405) {
        alert(`Autocheck gaf 405 op ${AUTOCHECK_ENDPOINT}`);
        return;
      }

      if (res.status === 401) {
        alert("Niet ingelogd of geen rechten voor deze matchmaking.");
        return;
      }

      if (!res.ok) {
        alert(json?.error || `Autocheck mislukt (${res.status})`);
        return;
      }

      await loadData();
      alert("Autocheck Fightpaspoort uitgevoerd.");
    } catch (err: any) {
      alert(err?.message || "Autocheck mislukt.");
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={pageGlow} />
        <div style={loadingWrap}>Vechter laden...</div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main style={pageStyle}>
        <div style={pageGlow} />
        <div style={loadingWrap}>{loadError}</div>
      </main>
    );
  }

  if (!fighter) {
    return (
      <main style={pageStyle}>
        <div style={pageGlow} />
        <div style={loadingWrap}>Geen vechter gevonden.</div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={pageGlow} />

      <div style={shell}>
        <BrutalHeader
          eventName={safeText(matchmaking?.naam)}
          eventDate={formatDate(matchmaking?.datum)}
          discipline={safeText(discipline)}
          klasse={safeText(klasse)}
          location={safeText(matchmaking?.locatie)}
          bondteam={safeText(matchmaking?.bondteam)}
          fighterName={naam}
          matchmakingId={matchmakingId}
          onBack={() =>
            router.push(`/dashboard/matchmaker/matchmaking/${matchmakingId}/match`, { replace: true })
          }
          onAutocheck={runAutocheckFightpaspoort}
          checking={checking}
        />

        <section style={backplate}>
          <section style={topGrid}>
            <div style={sideCardWrap}>
              <MetalCard accent="blue">
                <CardHeader
                  title="Persoonlijk"
                  dot="blue"
                  actions={
                    editingPersoonlijk ? (
                      <ActionGroup>
                        <button
                          style={miniSilverButton}
                          onClick={() => {
                            resetPersoonlijkForm();
                            setEditingPersoonlijk(false);
                          }}
                        >
                          <X size={13} style={{ marginRight: 6 }} />
                          Annuleren
                        </button>
                        <button
                          style={miniSilverButton}
                          onClick={savePersoonlijk}
                          disabled={savingSection === "persoonlijk"}
                        >
                          <Save size={13} style={{ marginRight: 6 }} />
                          {savingSection === "persoonlijk" ? "Opslaan..." : "Opslaan"}
                        </button>
                      </ActionGroup>
                    ) : (
                      <button style={miniSilverButton} onClick={() => setEditingPersoonlijk(true)}>
                        <Pencil size={13} style={{ marginRight: 6 }} />
                        Bewerken
                      </button>
                    )
                  }
                />

                <section style={{ ...cardBodyDark, minHeight: TOP_CARD_HEIGHT }}>
                  {!editingPersoonlijk ? (
                    <>
                      <div style={fighterHeaderName}>{naam}</div>

                      <div style={infoGridCompact}>
                        <InfoRow
                          icon={<CalendarDays size={14} />}
                          label="Geboortedatum"
                          value={formatDate(geboortedatum)}
                        />
                        <InfoRow
                          icon={<CalendarDays size={14} />}
                          label="Leeftijd nu"
                          value={leeftijdNu == null ? "-" : `${leeftijdNu} jaar`}
                        />
                        <InfoRow
                          icon={<CalendarDays size={14} />}
                          label="Leeftijd event"
                          value={leeftijdEvent == null ? "-" : `${leeftijdEvent} jaar`}
                        />
                        <InfoRow
                          icon={<BadgeInfo size={14} />}
                          label="Geslacht"
                          value={normalizeGender(geslacht)}
                        />
                        <InfoRow
                          icon={<FileDigit size={14} />}
                          label="Fightpaspoort nummer"
                          value={safeText(fighter?.va_nummer ?? fighterContext?.va_nummer)}
                        />
                      </div>

                      <div style={badgeRow}>
                        <span style={statusBadgeStyle(licentie ? "green" : "red")}>
                          {licentie ? <ShieldCheck size={13} /> : <ShieldX size={13} />}
                          Licentie {licentie ? "JA" : "NEE"}
                        </span>

                        <span style={statusBadgeStyle(startverbod ? "red" : "green")}>
                          {startverbod ? <ShieldX size={13} /> : <ShieldCheck size={13} />}
                          Startverbod {startverbod ? "JA" : "NEE"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div style={editGridSingle}>
                      <Field
                        label="Voornaam"
                        value={persoonlijkForm.voornaam}
                        onChange={(v) => setPersoonlijkForm((p) => ({ ...p, voornaam: v }))}
                      />
                      <Field
                        label="Achternaam"
                        value={persoonlijkForm.achternaam}
                        onChange={(v) => setPersoonlijkForm((p) => ({ ...p, achternaam: v }))}
                      />
                      <Field
                        label="Geboortedatum"
                        type="date"
                        value={persoonlijkForm.geboortedatum}
                        onChange={(v) => setPersoonlijkForm((p) => ({ ...p, geboortedatum: v }))}
                      />
                      <Field
                        label="Geslacht"
                        value={persoonlijkForm.geslacht}
                        onChange={(v) => setPersoonlijkForm((p) => ({ ...p, geslacht: v }))}
                      />
                      <Field
                        label="Fightpaspoort nummer"
                        value={persoonlijkForm.va_nummer}
                        onChange={(v) => setPersoonlijkForm((p) => ({ ...p, va_nummer: v }))}
                      />
                    </div>
                  )}
                </section>
              </MetalCard>
            </div>

            <div style={centerColumn}>
              <div style={heroCenterWrap}>
                <Image
                  src={HERO_ART_SRC}
                  alt="Fighter shield"
                  width={340}
                  height={340}
                  priority
                  loading="eager"
                  style={heroCenterImage}
                />
              </div>

              <div style={contactWrap}>
                <MetalCard accent="orange">
                  <CardHeader
                    title="Contactinformatie"
                    dot="orange"
                    actions={
                      editingContact ? (
                        <ActionGroup>
                          <button
                            style={miniSilverButton}
                            onClick={() => {
                              resetContactForm();
                              setEditingContact(false);
                            }}
                          >
                            <X size={13} style={{ marginRight: 6 }} />
                            Annuleren
                          </button>
                          <button
                            style={miniSilverButton}
                            onClick={saveContact}
                            disabled={savingSection === "contact"}
                          >
                            <Save size={13} style={{ marginRight: 6 }} />
                            {savingSection === "contact" ? "Opslaan..." : "Opslaan"}
                          </button>
                        </ActionGroup>
                      ) : (
                        <button style={miniSilverButton} onClick={() => setEditingContact(true)}>
                          <Pencil size={13} style={{ marginRight: 6 }} />
                          Bewerken
                        </button>
                      )
                    }
                  />
                  <section style={cardBodyCenterLight}>
                    {!editingContact ? (
                      <>
                        <div style={contactEmailLarge}>{safeText(fighter?.email)}</div>
                        <div style={infoGridCompactLight}>
                          <InfoRowLight
                            icon={<Phone size={14} />}
                            label="Telefoon"
                            value={safeText(fighter?.telefoon)}
                          />
                        </div>
                      </>
                    ) : (
                      <div style={editGridSingle}>
                        <FieldLight
                          label="Email"
                          value={contactForm.email}
                          onChange={(v) => setContactForm((p) => ({ ...p, email: v }))}
                        />
                        <FieldLight
                          label="Telefoon"
                          value={contactForm.telefoon}
                          onChange={(v) => setContactForm((p) => ({ ...p, telefoon: v }))}
                        />
                      </div>
                    )}
                  </section>
                </MetalCard>
              </div>
            </div>

            <div style={sideCardWrap}>
              <MetalCard accent="red">
                <CardHeader
                  title="Vechterdetails"
                  dot="red"
                  actions={
                    editingDetails ? (
                      <ActionGroup>
                        <button
                          style={miniSilverButton}
                          onClick={() => {
                            resetDetailsForm();
                            setEditingDetails(false);
                          }}
                        >
                          <X size={13} style={{ marginRight: 6 }} />
                          Annuleren
                        </button>
                        <button
                          style={miniSilverButton}
                          onClick={saveDetails}
                          disabled={savingSection === "details"}
                        >
                          <Save size={13} style={{ marginRight: 6 }} />
                          {savingSection === "details" ? "Opslaan..." : "Opslaan"}
                        </button>
                      </ActionGroup>
                    ) : (
                      <button style={miniSilverButton} onClick={() => setEditingDetails(true)}>
                        <Pencil size={13} style={{ marginRight: 6 }} />
                        Bewerken
                      </button>
                    )
                  }
                />

                <section style={{ ...cardBodyDark, minHeight: TOP_CARD_HEIGHT }}>
                  {!editingDetails ? (
                    <div style={infoGridCompact}>
                      <InfoRow
                        icon={<Dumbbell size={14} />}
                        label="Discipline"
                        value={safeText(discipline)}
                      />
                      <InfoRow
                        icon={<BadgeInfo size={14} />}
                        label="Klasse"
                        value={safeText(klasse)}
                      />
                      <InfoRow
                        icon={<Scale size={14} />}
                        label="Gewicht"
                        value={formatWeight(gewicht)}
                      />
                      <InfoRow
                        icon={<Trophy size={14} />}
                        label="Gewichtklasse"
                        value={gewichtKlasseVolwassen}
                      />
                      <InfoRow
                        icon={<Trophy size={14} />}
                        label="Totaal partijen"
                        value={String(totaalPartijen)}
                      />
                      <InfoRow
                        icon={<Building2 size={14} />}
                        label="Sportschool"
                        value={safeText(gym)}
                      />
                      <InfoRow
                        icon={<UserRound size={14} />}
                        label="Trainer"
                        value={safeText(trainerNaam)}
                      />
                    </div>
                  ) : (
                    <div style={editGridSingle}>
                      <Field
                        label="Discipline"
                        value={detailsForm.discipline}
                        onChange={(v) => setDetailsForm((p) => ({ ...p, discipline: v }))}
                      />
                      <Field
                        label="Klasse"
                        value={detailsForm.klasse}
                        onChange={(v) => setDetailsForm((p) => ({ ...p, klasse: v }))}
                      />
                      <Field
                        label="Gewicht"
                        value={detailsForm.gewicht}
                        onChange={(v) => setDetailsForm((p) => ({ ...p, gewicht: v }))}
                      />
                      <Field
                        label="Sportschool"
                        value={detailsForm.gym}
                        onChange={(v) => setDetailsForm((p) => ({ ...p, gym: v }))}
                      />
                      <Field
                        label="Trainer naam"
                        value={detailsForm.trainer_naam}
                        onChange={(v) => setDetailsForm((p) => ({ ...p, trainer_naam: v }))}
                      />
                    </div>
                  )}
                </section>
              </MetalCard>
            </div>
          </section>

          <section style={{ marginTop: 12 }}>
            <MetalCard accent="blue">
              <CardHeader title="Extra / Nulmeting" dot="blue" />
              <section style={{ ...cardBodyDark, minHeight: EXTRA_HEIGHT }}>
                <div style={extraGridCompact}>
                  <ReadOnlyMini label="Nulmeting klasse" value={nulmetingKlasse} />
                  <ReadOnlyMini label="Nulmeting totaal" value={nulmetingTotaal} />
                </div>
                <div style={{ height: 10 }} />
                <LightReadOnlyBlock
                  label="Opmerking"
                  value={safeText(nulmetingOpmerking)}
                  minHeight={150}
                />
              </section>
            </MetalCard>
          </section>

          <section style={{ marginTop: 12 }}>
            <MetalCard accent="orange">
              <CardHeader title="Uitslagen" dot="orange" />
              <section style={cardBodyLight}>
                {results.length === 0 ? (
                  <div style={emptyState}>
                    <AlertTriangle size={16} />
                    <span>Nog geen uitslagen gevonden.</span>
                  </div>
                ) : (
                  <div style={tableWrap}>
                    <table style={tableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Datum</th>
                          <th style={thStyle}>Resultaat</th>
                          <th style={thStyle}>Tegenstander</th>
                          <th style={thStyle}>Evenement</th>
                          <th style={thStyle}>Discipline</th>
                          <th style={thStyle}>Klasse</th>
                          <th style={thStyle}>Sportschool</th>
                          <th style={thStyle}>Gewicht</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((row, i) => {
                          const darkRow = i % 2 === 1;

                          return (
                            <tr
                              key={String(row.id)}
                              style={{
                                background: darkRow ? "#2b3138" : "#ffffff",
                                color: darkRow ? "#ffffff" : "#111827",
                              }}
                            >
                              <td style={tdStyle}>{formatDate(row.datum)}</td>
                              <td style={tdStyle}>{resultLabel(row.uitslag)}</td>
                              <td style={tdStyle}>{safeText(row.tegenstander)}</td>
                              <td style={tdStyle}>{safeText(row.evenement)}</td>
                              <td style={tdStyle}>{safeText(row.discipline)}</td>
                              <td style={tdStyle}>{safeText(row.klasse)}</td>
                              <td style={tdStyle}>{safeText(row.sportschool)}</td>
                              <td style={tdStyle}>{formatWeight(row.gewicht)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </MetalCard>
          </section>

          <section style={{ marginTop: 12 }}>
            <MetalCard accent="blue">
              <CardHeader title="Meldingen" dot="blue" />
              <section style={cardBodyDark}>
                <div style={meldingGridWide}>
                  {meldingen.map((m, i) => (
                    <div key={`${m.title}-${i}`} style={meldingBox(m.level)}>
                      <div style={meldingTitleRow}>
                        <Bell size={14} />
                        <span>{m.title}</span>
                      </div>
                      <div style={meldingText}>{m.text}</div>
                    </div>
                  ))}
                </div>
              </section>
            </MetalCard>
          </section>
        </section>

        <div style={footer}>© FightSupport</div>
      </div>
    </main>
  );
}

/* =========================
   SMALL COMPONENTS
========================= */

function BrutalHeader({
  eventName,
  eventDate,
  discipline,
  klasse,
  location,
  bondteam,
  fighterName,
  matchmakingId,
  onBack,
  onAutocheck,
  checking,
}: {
  eventName: string;
  eventDate: string;
  discipline: string;
  klasse: string;
  location: string;
  bondteam: string;
  fighterName: string;
  matchmakingId: string;
  onBack: () => void;
  onAutocheck: () => void;
  checking: boolean;
}) {
  return (
    <div style={{ ...metalFrameStyle("orange"), overflow: "hidden", marginBottom: 12 }}>
      <div style={headerCore}>
        <div style={headerTexture} />
        <div style={headerBevel} />

        <div style={headerGrid}>
          <div style={headerLeftBlock}>
            <div style={headerTiny}>EVENT</div>
            <div style={headerEventName}>{eventName}</div>

            <div style={headerFacts}>
              <HeaderFact label="Datum" value={eventDate} />
              <HeaderFact label="Discipline" value={discipline} />
              <HeaderFact label="Klasse (MM)" value={klasse} />
            </div>
          </div>

          <div style={headerCenterBlock}>
            <div className={bebasNeue.className} style={headerFightsupport}>
              FIGHTSUPPORT
            </div>
            <div style={headerSubline}>VECHTER DETAIL</div>
            <div style={headerCenterName}>{fighterName}</div>
          </div>

          <div style={headerRightBlock}>
            <div style={headerTiny}>VECHTER</div>
            <div style={headerFighterLabel}>Detail</div>

            <div style={headerBadgeWrap}>
              <span style={runChip}>PAGINA: ACTIEF</span>
            </div>

            <div style={headerIdText}>Matchmaking ID: {matchmakingId}</div>

            <div style={headerActionRow}>
              <button style={orangeBackButton} onClick={onBack}>
                <ArrowLeft size={15} />
              </button>
              <button style={silverHeaderButton} onClick={onAutocheck} disabled={checking}>
                <RefreshCcw size={14} style={{ marginRight: 8 }} />
                {checking ? "Autocheck..." : "Autocheck"}
              </button>
            </div>
          </div>
        </div>

        <div style={headerBottomMeta}>
          <MetaPill icon={<MapPin size={13} />} text={location} />
          <MetaPill icon={<BadgeInfo size={13} />} text={`Bondteam: ${bondteam}`} />
          <MetaPill icon={<Dumbbell size={13} />} text={discipline} />
          <MetaPill icon={<BadgeInfo size={13} />} text={klasse} />
        </div>
      </div>
    </div>
  );
}

function HeaderFact({ label, value }: { label: string; value: string }) {
  return (
    <div style={headerFactRow}>
      <span style={headerFactLabel}>{label}:</span>{" "}
      <span style={headerFactValue}>{value}</span>
    </div>
  );
}

function MetaPill({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <span style={metaPill}>
      {icon ? <span style={{ display: "inline-flex" }}>{icon}</span> : null}
      <span>{text}</span>
    </span>
  );
}

function MetalCard({
  children,
  accent = "none",
}: {
  children: ReactNode;
  accent?: "none" | "orange" | "red" | "blue";
}) {
  return (
    <div style={{ ...metalFrameStyle(accent), height: "100%" }}>
      <div style={metalInnerRim}>{children}</div>
    </div>
  );
}

function CardHeader({
  title,
  dot = "none",
  actions,
}: {
  title: string;
  dot?: "red" | "blue" | "orange" | "none";
  actions?: ReactNode;
}) {
  const dotColor =
    dot === "red"
      ? "#ef4444"
      : dot === "blue"
      ? "#3b82f6"
      : dot === "orange"
      ? ORANGE
      : "rgba(255,255,255,0.35)";

  return (
    <div style={cardHeader}>
      <div style={cardHeaderRow}>
        <div style={cardTitleWrap}>
          <span style={{ ...cardDot, background: dotColor }} />
          <span>{title}</span>
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      <div style={cardAccentLine} />
    </div>
  );
}

function ActionGroup({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>;
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div style={infoRow}>
      <div style={infoLabel}>
        {icon ? <span style={{ display: "inline-flex" }}>{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div style={infoValue}>{value}</div>
    </div>
  );
}

function InfoRowLight({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div style={infoRowLight}>
      <div style={infoLabelLight}>
        {icon ? <span style={{ display: "inline-flex" }}>{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div style={infoValueLight}>{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

function FieldLight({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label style={labelStyleLight}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyleLight}
      />
    </div>
  );
}

function ReadOnlyMini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={readOnlyMiniBox}>{value}</div>
    </div>
  );
}

function LightReadOnlyBlock({
  label,
  value,
  minHeight = 120,
}: {
  label: string;
  value: string;
  minHeight?: number;
}) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={{ ...lightReadOnlyBox, minHeight }}>{value}</div>
    </div>
  );
}

/* =========================
   STYLES
========================= */

const TOP_CARD_HEIGHT = 288;
const CONTACT_CARD_HEIGHT = 112;
const EXTRA_HEIGHT = 250;

function metalFrameStyle(accent: "none" | "orange" | "red" | "blue" = "none"): CSSProperties {
  const accentGlow =
    accent === "red"
      ? "radial-gradient(520px 260px at 0% 0%, rgba(220,38,38,0.18), transparent 62%)"
      : accent === "blue"
      ? "radial-gradient(520px 260px at 100% 0%, rgba(37,99,235,0.18), transparent 62%)"
      : accent === "orange"
      ? "radial-gradient(640px 320px at 50% 0%, rgba(255,77,0,0.18), transparent 62%)"
      : "radial-gradient(640px 320px at 50% 0%, rgba(255,255,255,0.08), transparent 62%)";

  return {
    border: "4px solid rgba(178,182,190,0.95)",
    borderRadius: 24,
    background: `${accentGlow}, linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.10) 22%, rgba(255,255,255,0) 46%, rgba(255,255,255,0.14) 72%, rgba(255,255,255,0) 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0.015) 4px), linear-gradient(180deg, #80848d 0%, #575b65 18%, #252932 52%, #0d0f14 100%)`,
    boxShadow:
      "0 22px 60px rgba(0,0,0,0.42), inset 0 0 0 1px rgba(255,255,255,0.34), inset 0 0 0 3px rgba(215,218,224,0.22), inset 0 0 0 5px rgba(31,34,41,0.62), inset 0 1px 0 rgba(255,255,255,0.24)",
  };
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  position: "relative",
  background: "linear-gradient(180deg, #dadbdd 0%, #ececef 16%, #d7d8dc 100%)",
  padding: 8,
  overflow: "hidden",
};

const pageGlow: CSSProperties = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  background: "radial-gradient(circle at 50% 0%, rgba(255,77,0,0.06) 0%, transparent 22%)",
};

const shell: CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: 1660,
  margin: "0 auto",
};

const headerCore: CSSProperties = {
  position: "relative",
  padding: "14px 18px 12px",
  overflow: "hidden",
  background: `
    radial-gradient(900px 320px at 50% -40px, rgba(255,77,0,0.18), transparent 62%),
    radial-gradient(520px 240px at 14% 12%, rgba(255,255,255,0.12), transparent 62%),
    radial-gradient(520px 240px at 86% 18%, rgba(255,255,255,0.10), transparent 62%),
    repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, rgba(255,255,255,0.04) 1px, rgba(255,255,255,0.04) 6px),
    repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, rgba(0,0,0,0.00) 1px, rgba(0,0,0,0.00) 10px),
    linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 55%, #17171a 100%)
  `,
  borderBottom: "3px solid rgba(255,77,0,0.55)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -10px 24px rgba(0,0,0,0.55)",
};

const headerTexture: CSSProperties = {
  pointerEvents: "none",
  position: "absolute",
  inset: 0,
  opacity: 0.22,
  backgroundImage:
    "radial-gradient(900px 260px at 50% 0%, rgba(255,255,255,0.06), transparent 60%), repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, rgba(255,255,255,0.00) 1px, rgba(255,255,255,0.00) 9px), repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 1px, rgba(0,0,0,0.00) 1px, rgba(0,0,0,0.00) 13px)",
  mixBlendMode: "overlay",
};

const headerBevel: CSSProperties = {
  pointerEvents: "none",
  position: "absolute",
  inset: 12,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.55)",
};

const headerGrid: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  gridTemplateColumns: "1fr 1.1fr 1fr",
  gap: 16,
  alignItems: "center",
};

const headerLeftBlock: CSSProperties = {
  minWidth: 0,
};

const headerCenterBlock: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
};

const headerRightBlock: CSSProperties = {
  minWidth: 0,
  textAlign: "right",
};

const headerTiny: CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.20em",
  color: "rgba(255,255,255,0.60)",
  fontWeight: 700,
};

const headerEventName: CSSProperties = {
  marginTop: 4,
  color: ORANGE,
  fontSize: 30,
  lineHeight: 1,
  fontWeight: 900,
};

const headerFacts: CSSProperties = {
  marginTop: 10,
  display: "grid",
  gap: 3,
};

const headerFactRow: CSSProperties = {
  fontSize: 15,
  color: "rgba(255,255,255,0.88)",
  fontWeight: 700,
};

const headerFactLabel: CSSProperties = {
  color: "rgba(255,255,255,0.62)",
};

const headerFactValue: CSSProperties = {
  color: "#fff",
  fontWeight: 900,
};

const headerFightsupport: CSSProperties = {
  background:
    "linear-gradient(180deg, #ffffff 0%, #ececec 18%, #cfcfcf 38%, #9f9f9f 58%, #f4f4f4 78%, #7f7f7f 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  fontSize: 72,
  lineHeight: 0.9,
  letterSpacing: "0.18em",
  textShadow:
    "0 1px 0 rgba(255,255,255,0.30), 0 2px 0 rgba(0,0,0,0.72), 0 3px 0 rgba(0,0,0,0.78), 0 8px 16px rgba(0,0,0,0.62), 0 16px 30px rgba(0,0,0,0.70)",
  filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.75))",
};

const headerSubline: CSSProperties = {
  marginTop: 7,
  fontSize: 11,
  letterSpacing: "0.34em",
  color: "rgba(255,255,255,0.62)",
  fontWeight: 700,
};

const headerCenterName: CSSProperties = {
  marginTop: 8,
  color: "#fff",
  fontSize: 16,
  fontWeight: 900,
};

const headerFighterLabel: CSSProperties = {
  marginTop: 4,
  color: "#fff",
  fontSize: 34,
  lineHeight: 1,
  fontWeight: 900,
};

const headerBadgeWrap: CSSProperties = {
  marginTop: 10,
  display: "flex",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: 8,
};

const runChip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 32,
  padding: "0 12px",
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "linear-gradient(180deg, rgba(34,197,94,0.90) 0%, rgba(21,128,61,0.90) 100%)",
  color: "#f4fff7",
  fontWeight: 900,
  fontSize: 13,
};

const headerIdText: CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  color: "rgba(255,255,255,0.62)",
  wordBreak: "break-all",
};

const headerActionRow: CSSProperties = {
  marginTop: 12,
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
};

const orangeBackButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 50,
  height: 42,
  borderRadius: 4,
  border: "1px solid rgba(0,0,0,0.60)",
  background: "linear-gradient(180deg, #ff6200 0%, #cc3d00 100%)",
  color: "#fff",
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.30), 0 6px 14px rgba(0,0,0,0.5)",
};

const silverHeaderButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.35)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(205,205,205,0.78) 45%, rgba(120,120,120,0.55) 100%)",
  color: "#111",
  fontWeight: 900,
  fontSize: 13,
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 24px rgba(0,0,0,0.35)",
};

const headerBottomMeta: CSSProperties = {
  position: "relative",
  zIndex: 1,
  marginTop: 12,
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const metaPill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 4,
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "#fff",
  fontWeight: 900,
  fontSize: 12,
};

const backplate: CSSProperties = {
  borderRadius: 30,
  border: "2px solid rgba(160,165,175,0.48)",
  padding: 14,
  background: `
    radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 38%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%),
    radial-gradient(circle at 20% 0%, rgba(255,77,0,0.10), transparent 40%),
    radial-gradient(circle at 80% 20%, rgba(0,120,255,0.08), transparent 42%),
    repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.03) 2px, rgba(0,0,0,0.04) 4px),
    linear-gradient(180deg, #f0f0f2 0%, #dadade 52%, #c9c9cf 100%)
  `,
  boxShadow: "0 22px 60px rgba(24,24,27,0.12), inset 0 1px 0 rgba(255,255,255,0.45)",
};

const topGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 0.88fr) 420px minmax(0, 0.88fr)",
  gap: 14,
  alignItems: "start",
};

const sideCardWrap: CSSProperties = {
  width: "100%",
  maxWidth: 670,
  justifySelf: "center",
};

const centerColumn: CSSProperties = {
  width: "100%",
  display: "grid",
  gridTemplateRows: "228px auto",
  alignItems: "start",
  justifyItems: "center",
};

const heroCenterWrap: CSSProperties = {
  width: "100%",
  height: 228,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  marginTop: -8,
};

const heroCenterImage: CSSProperties = {
  width: "100%",
  maxWidth: 315,
  height: "auto",
  objectFit: "contain",
  display: "block",
  filter: "drop-shadow(0 16px 24px rgba(0,0,0,0.34))",
};

const contactWrap: CSSProperties = {
  width: "100%",
  maxWidth: 455,
  marginTop: 60,
};

const metalInnerRim: CSSProperties = {
  position: "relative",
  height: "100%",
  borderRadius: 18,
  overflow: "hidden",
  border: "2px solid rgba(226,229,235,0.18)",
  boxShadow: "inset 0 0 0 2px rgba(19,22,29,0.66)",
};

const cardHeader: CSSProperties = {
  padding: "11px 14px 9px",
  borderBottom: "1px solid rgba(0,0,0,0.35)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%, rgba(0,0,0,0.55) 100%), linear-gradient(180deg, #2a2d33 0%, #15161a 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.65)",
};

const cardHeaderRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const cardTitleWrap: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  color: "#fff",
  fontSize: 14,
  fontWeight: 900,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const cardDot: CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 5,
  boxShadow: "0 0 0 1px rgba(0,0,0,0.45)",
};

const cardAccentLine: CSSProperties = {
  marginTop: 9,
  height: 3,
  borderRadius: 999,
  background:
    "linear-gradient(90deg, rgba(255,77,0,0.0) 0%, rgba(255,77,0,0.85) 22%, rgba(255,77,0,0.85) 78%, rgba(255,77,0,0.0) 100%)",
};

const cardBodyDark: CSSProperties = {
  padding: 12,
  color: "#fff",
  background:
    "radial-gradient(circle at 28% 0%, rgba(255,77,0,0.12), transparent 48%), radial-gradient(circle at 88% 0%, rgba(37,99,235,0.10), transparent 46%), linear-gradient(180deg, rgba(20,22,28,0.97) 0%, rgba(8,10,14,0.99) 100%)",
};

const cardBodyCenterLight: CSSProperties = {
  padding: "10px 12px 8px",
  minHeight: CONTACT_CARD_HEIGHT,
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.50), transparent 58%), linear-gradient(180deg, rgba(244,245,247,0.98) 0%, rgba(220,223,228,0.98) 100%)",
  color: "#12151a",
};

const cardBodyLight: CSSProperties = {
  padding: 12,
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.42), transparent 58%), linear-gradient(180deg, rgba(245,246,248,0.98) 0%, rgba(221,224,229,0.98) 100%)",
};

const fighterHeaderName: CSSProperties = {
  color: ORANGE,
  fontSize: 22,
  fontWeight: 900,
  lineHeight: 1.02,
  marginBottom: 8,
};

const contactEmailLarge: CSSProperties = {
  color: ORANGE,
  fontSize: 18,
  lineHeight: 1.15,
  fontWeight: 900,
  marginBottom: 10,
  wordBreak: "break-word",
};

const badgeRow: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
};

const infoGridCompact: CSSProperties = {
  display: "grid",
  gap: 0,
};

const infoGridCompactLight: CSSProperties = {
  display: "grid",
  gap: 0,
};

const infoRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "170px 1fr",
  gap: 10,
  alignItems: "center",
  minHeight: 32,
  padding: "2px 0",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
};

const infoRowLight: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "110px 1fr",
  gap: 10,
  alignItems: "center",
  minHeight: 30,
  padding: "2px 0",
  borderBottom: "1px solid rgba(17,24,39,0.08)",
};

const infoLabel: CSSProperties = {
  color: "#d0d7de",
  fontWeight: 800,
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const infoLabelLight: CSSProperties = {
  color: "#4b5563",
  fontWeight: 800,
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const infoValue: CSSProperties = {
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 12.5,
  lineHeight: 1.25,
};

const infoValueLight: CSSProperties = {
  color: "#111827",
  fontWeight: 800,
  fontSize: 13,
  lineHeight: 1.3,
};

const extraGridCompact: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const miniSilverButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 32,
  padding: "0 12px",
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.35)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(205,205,205,0.78) 45%, rgba(120,120,120,0.55) 100%)",
  color: "#121a23",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 14px rgba(0,0,0,0.22)",
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 5,
  color: "#cfd6de",
  fontWeight: 900,
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.10em",
};

const labelStyleLight: CSSProperties = {
  display: "block",
  marginBottom: 5,
  color: "#4b5563",
  fontWeight: 900,
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.10em",
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 38,
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  padding: "0 10px",
  outline: "none",
  fontSize: 13,
};

const inputStyleLight: CSSProperties = {
  width: "100%",
  minHeight: 38,
  borderRadius: 4,
  border: "1px solid rgba(17,24,39,0.12)",
  background: "rgba(255,255,255,0.76)",
  color: "#111827",
  padding: "0 10px",
  outline: "none",
  fontSize: 13,
};

const editGridSingle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const readOnlyMiniBox: CSSProperties = {
  minHeight: 38,
  display: "flex",
  alignItems: "center",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.07)",
  color: "#fff",
  padding: "0 10px",
  fontWeight: 800,
  fontSize: 13,
};

const lightReadOnlyBox: CSSProperties = {
  width: "100%",
  borderRadius: 8,
  border: "1px solid rgba(17,24,39,0.12)",
  background: "linear-gradient(180deg, rgba(244,245,247,0.98) 0%, rgba(227,230,235,0.98) 100%)",
  color: "#111827",
  padding: 12,
  fontSize: 13,
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
};

function meldingBox(level: "ok" | "info" | "warn" | "error"): CSSProperties {
  const styles = {
    ok: {
      border: "1px solid rgba(34,197,94,0.28)",
      bg: "linear-gradient(180deg, rgba(34,197,94,0.14) 0%, rgba(34,197,94,0.06) 100%)",
    },
    info: {
      border: "1px solid rgba(59,130,246,0.28)",
      bg: "linear-gradient(180deg, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0.06) 100%)",
    },
    warn: {
      border: "1px solid rgba(255,77,0,0.26)",
      bg: "linear-gradient(180deg, rgba(255,77,0,0.14) 0%, rgba(255,77,0,0.06) 100%)",
    },
    error: {
      border: "1px solid rgba(239,68,68,0.28)",
      bg: "linear-gradient(180deg, rgba(239,68,68,0.14) 0%, rgba(239,68,68,0.06) 100%)",
    },
  }[level];

  return {
    borderRadius: 8,
    padding: 10,
    border: styles.border,
    background: styles.bg,
    minHeight: 88,
  };
}

const meldingGridWide: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const meldingTitleRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 900,
  color: "#fff",
  marginBottom: 5,
};

const meldingText: CSSProperties = {
  fontSize: 12,
  color: "#e9edf2",
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
};

const tableWrap: CSSProperties = {
  overflowX: "auto",
  borderRadius: 10,
  border: "2px solid rgba(209,213,219,1)",
  background: "#fff",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 1080,
};

const thStyle: CSSProperties = {
  padding: "11px 10px",
  textAlign: "left",
  fontWeight: 900,
  fontSize: 12,
  whiteSpace: "nowrap",
  background: `linear-gradient(180deg, #ff6a1a 0%, ${ORANGE} 58%, #cc3d00 100%)`,
  color: "#fff",
  borderBottom: "2px solid #7a2400",
  borderRight: "1px solid rgba(0,0,0,0.22)",
};

const tdStyle: CSSProperties = {
  padding: "10px 10px",
  fontSize: 12,
  whiteSpace: "nowrap",
  borderRight: "1px solid rgba(17,24,39,0.08)",
  verticalAlign: "top",
};

const emptyState: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  color: "#4b5563",
  fontSize: 13,
  fontWeight: 800,
  padding: "8px 0",
};

const footer: CSSProperties = {
  textAlign: "center",
  marginTop: 10,
  opacity: 0.78,
  color: "#46515d",
  fontWeight: 900,
  fontSize: 12,
};

const loadingWrap: CSSProperties = {
  maxWidth: 900,
  margin: "80px auto",
  padding: 24,
  borderRadius: 18,
  background: `linear-gradient(180deg, ${DARK} 0%, ${DARKER} 100%)`,
  color: "#fff",
  textAlign: "center",
  fontWeight: 900,
  fontSize: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
};