"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import dayjs from "dayjs";
import {
  ArrowLeft,
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
  Bell,
  Building2,
  ChevronDown,
  ChevronUp,
  Mail,
  UserCog,
  Save,
  X,
} from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";
import { supabase } from "@/lib/supabaseClient";

const bebas = { className: "font-sans" };

const ORANGE = "#ff4d00";
const DARK = "#2b3138";
const DARKER = "#1f242b";
const HERO_ART_SRC = "/branding/fightsupport/fighter-shield.png";
const AUTOCHECK_ENDPOINT = "/api/matchmaker/fighter-rescrape";
const SAVE_ENDPOINT = "/api/matchmaker/correct-matchmaker-fighter";
const TOERNOOI_AUTOCHECK_ENDPOINT = "/api/control-engine/bout-rescrape";
const TOERNOOI_SAVE_ENDPOINT = "/api/control-engine/toernooi-fighter/update";

type AnyRow = Record<string, any>;

type HeaderRow = {
  id: string;
  naam: string | null;
  datum: string | null;
  locatie: string | null;
  bondteam: string | null;
};

type Corner = "rood" | "blauw";

type MatchmakingBoutRow = {
  id?: string | number | null;
  matchmaking_id?: string | null;
  partij_nr?: number | null;
  bout_id?: string | null;
  discipline?: string | null;
  klasse?: string | null;
  rood_naam?: string | null;
  rood_naam_mm?: string | null;
  rood_gym?: string | null;
  rood_gym_mm?: string | null;
  rood_va_mm?: string | null;
  va_rood?: string | null;
  blauw_naam?: string | null;
  blauw_naam_mm?: string | null;
  blauw_gym?: string | null;
  blauw_gym_mm?: string | null;
  blauw_va_mm?: string | null;
  va_blauw?: string | null;
  toernooi_code?: string | null;
  is_toernooi?: boolean | null;
};

type BoutContextRow = {
  id?: string;
  controle_run_id?: string | null;
  matchmaking_id?: string | null;
  partij_nr?: number | null;
  upload_id?: string | null;
  bout_id?: string | null;
  discipline?: string | null;
  klasse_mm?: string | null;
  evenement_datum?: string | null;
  evenement_naam?: string | null;
  locatie?: string | null;
  is_toernooi?: boolean | null;
  toernooi_code?: string | null;
  bondteam?: string | null;

  rood_naam_mm?: string | null;
  rood_gym_mm?: string | null;
  rood_va_mm?: string | null;
  rood_naam_fp?: string | null;
  rood_geboortedatum_fp?: string | null;
  rood_geslacht?: string | null;
  rood_licentie?: string | null;
  rood_heeft_startverbod?: string | null;
  rood_totaal_wedstrijden_scrape?: number | null;
  rood_gewonnen_scrape?: number | null;
  rood_nulmeting_totaal?: number | null;
  rood_nulmeting_opmerking?: string | null;
  rood_nulmeting_klasse?: string | null;
  rood_gewicht_mm?: string | number | null;
  keurmerk_rood?: boolean | string | null;
  keurmerk_reden_rood?: string | null;
  rood_leeftijd_event?: number | null;
  rood_demo_totaal?: number | null;
  rood_historisch_w?: number | null;
  rood_historisch_l?: number | null;
  rood_historisch_d?: number | null;

  blauw_naam_mm?: string | null;
  blauw_gym_mm?: string | null;
  blauw_va_mm?: string | null;
  blauw_naam_fp?: string | null;
  blauw_geboortedatum_fp?: string | null;
  blauw_geslacht?: string | null;
  blauw_licentie?: string | null;
  blauw_heeft_startverbod?: string | null;
  blauw_totaal_wedstrijden_scrape?: number | null;
  blauw_gewonnen_scrape?: number | null;
  blauw_nulmeting_totaal?: number | null;
  blauw_nulmeting_opmerking?: string | null;
  blauw_nulmeting_klasse?: string | null;
  blauw_gewicht_mm?: string | number | null;
  keurmerk_blauw?: boolean | string | null;
  keurmerk_reden_blauw?: string | null;
  blauw_leeftijd_event?: number | null;
  blauw_demo_totaal?: number | null;
  blauw_historisch_w?: number | null;
  blauw_historisch_l?: number | null;
  blauw_historisch_d?: number | null;
};

type TournamentContextRow = {
  id?: string;
  controle_run_id?: string | null;
  matchmaking_id?: string | null;
  toernooi_code?: string | null;
  fighter_id?: string | null;
  va_nummer?: string | null;
  naam?: string | null;
  naam_fp?: string | null;
  naam_mm?: string | null;
  sportschool?: string | null;
  sportschool_mm?: string | null;
  geboortedatum?: string | null;
  geslacht?: string | null;
  gewicht?: string | number | null;
  discipline?: string | null;
  klasse?: string | null;
  klasse_mm?: string | null;
  licentie?: string | null;
  heeft_startverbod?: boolean | string | null;
  nulmeting_totaal?: number | null;
  nulmeting_klasse?: string | null;
  nulmeting_opmerking?: string | null;
  totaal_wedstrijden?: number | null;
  gewonnen?: number | null;
  verloren?: number | null;
  draw?: number | null;
  demo?: number | null;
  leeftijd_event?: number | null;
  heeft_keurmerk?: boolean | string | null;
  keurmerk_reason?: string | null;
  evenement_datum?: string | null;
  evenement_naam?: string | null;
  locatie?: string | null;
  bondteam?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type UnifiedFighter = {

  fighter_id: string | null;
  row_nr: number | null;
  corner: Corner | null;
  bout_id: string | null;
  partij_nr: number | null;
  controle_run_id: string | null;
  is_toernooi: boolean;
  toernooi_code: string | null;

  naam: string | null;
  naam_fp: string | null;
  geboortedatum: string | null;
  leeftijd: number | null;
  geslacht: string | null;
  gewicht: number | null;
  discipline: string | null;
  klasse: string | null;
  gym: string | null;
  va_nummer: string | null;

  licentie: string | null;
  heeft_startverbod: string | null;

  totaal_wedstrijden: number | null;
  gewonnen: number | null;
  verloren: number | null;
  draw: number | null;
  demo: number | null;

  nulmeting_totaal: number | null;
  nulmeting_klasse: string | null;
  nulmeting_opmerking: string | null;

  heeft_keurmerk: string | null;
  keurmerk_reason: string | null;

  email: string | null;
  telefoon: string | null;
  trainer_naam: string | null;
  trainer_email: string | null;
  trainer_tel: string | null;
};

type ResultRow = {
  id?: string | number;
  datum: string | null;
  discipline: string | null;
  klasse: string | null;
  uitslag: string | null;
  fighter_id?: string | null;
  tegenstander?: string | null;
  evenement?: string | null;
  sportschool?: string | null;
  gewicht?: string | number | null;
};

type FighterRuleResultRow = {
  id?: string | number;
  controle_run_id?: string | null;
  bout_id?: string | null;
  partij_nr?: number | null;
  hoek?: string | null;
  toernooi_code?: string | null;
  rule: string | null;
  rule_code: string | null;
  resultaat: string | null;
  severity: string | null;
  boodschap: string | null;
  review_status?: string | null;
};

type MeldingItem = {
  id?: string | number;
  level: "ok" | "info" | "warn" | "error";
  title: string;
  text: string;
  resultaat?: string | null;
  severity?: string | null;
  canReview?: boolean;
};

type EditSectionKey = "persoonlijk" | "vechterdetails" | "contact" | "trainer" | "alles";

type EditDraft = {
  naam_input: string;
  geboortedatum_input: string;
  geslacht: string;
  gewicht: string;
  gym_input: string;
  va_nummer: string;
  email: string;
  telefoon: string;
  trainer_naam: string;
  trainer_email: string;
  trainer_tel: string;
};

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

function calcAgeAtDate(birth?: string | null, at?: string | null) {
  if (!birth || !at) return null;
  const b = dayjs(birth);
  const e = dayjs(at);
  if (!b.isValid() || !e.isValid()) return null;
  return e.diff(b, "year");
}

function safeText(v: unknown, fallback = "-") {
  const out = s(v);
  return out || fallback;
}

function boolLikeLabel(v?: string | null) {
  const x = norm(v);
  if (!x) return null;
  if (["ja", "true", "1", "yes"].includes(x)) return true;
  if (["nee", "false", "0", "no"].includes(x)) return false;
  return null;
}

function firstFilled(...vals: unknown[]) {
  for (const val of vals) {
    const out = s(val);
    if (out) return out;
  }
  return "";
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
  const rows: MeldingItem[] = [];

  for (const rr of ruleResults) {
    const level = mapSeverityToMeldingLevel(rr.severity, rr.resultaat);
    rows.push({
      id: rr.id,
      level,
      title: safeText(rr.rule, safeText(rr.rule_code, "Melding")),
      text:
        safeText(rr.boodschap, "Geen aanvullende toelichting beschikbaar.") +
        (rr.resultaat ? ` (${String(rr.resultaat).toUpperCase()})` : ""),
      resultaat: rr.resultaat,
      severity: rr.severity,
      canReview: Boolean(rr.id) && (level === "warn" || level === "info"),
    });
  }

  if (rows.length === 0 && nulmetingOpmerking !== "-" && nulmetingOpmerking !== "") {
    rows.push({
      level: "warn",
      title: "Nulmeting opmerking",
      text: nulmetingOpmerking,
      canReview: false,
    });
  }

  if (rows.length === 0 && resultsCount === 0) {
    rows.push({
      level: "warn",
      title: "Geen uitslagenhistorie",
      text: "Er zijn nog geen uitslagen gevonden voor deze vechter binnen de beschikbare dataset.",
      canReview: false,
    });
  }

  if (rows.length === 0) {
    rows.push({
      level: "ok",
      title: "Geen meldingen",
      text: "Voor deze vechter zijn momenteel geen fighter rules meldingen gevonden.",
      canReview: false,
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

function buildYouthWeightRange(weight: unknown) {
  const kg = toNum(weight);
  if (kg == null) return "-";
  const min = Math.max(0, kg - 2);
  const max = kg + 2;
  return `${min.toFixed(2)} t/m ${max.toFixed(2)} kg`;
}

function extractKeurmerkDate(reason?: string | null) {
  const raw = s(reason);
  if (!raw) return null;

  const iso = raw.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso?.[1] && dayjs(iso[1]).isValid()) return iso[1];

  const nl = raw.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (nl?.[0]) {
    const val = `${nl[3]}-${nl[2]}-${nl[1]}`;
    if (dayjs(val).isValid()) return val;
  }

  return null;
}

function isTruthyKeurmerk(v: unknown) {
  if (typeof v === "boolean") return v;
  return boolLikeLabel(s(v)) === true;
}

function findCornerFromBoutRow(row: MatchmakingBoutRow | null, fighterId: string): Corner | null {
  if (!row) return null;
  const id = s(fighterId);
  const rood = s(row.rood_va_mm || row.va_rood);
  const blauw = s(row.blauw_va_mm || row.va_blauw);

  if (rood && rood === id) return "rood";
  if (blauw && blauw === id) return "blauw";
  return null;
}

function mapContextToUnified(
  ctx: BoutContextRow,
  corner: Corner,
  fighterId: string
): UnifiedFighter {
  const prefix = corner === "rood" ? "rood" : "blauw";

  const get = <T = any,>(key: string): T | null =>
    ((ctx as AnyRow)?.[`${prefix}_${key}`] ?? null) as T | null;

  return {
    fighter_id: fighterId || s(get("va_mm")) || null,
    row_nr: toNum(ctx.partij_nr),
    corner,
    bout_id: s(ctx.bout_id) || null,
    partij_nr: toNum(ctx.partij_nr),
    controle_run_id: s(ctx.controle_run_id) || null,
    is_toernooi: Boolean(ctx.is_toernooi),
    toernooi_code: s(ctx.toernooi_code) || null,

    naam: firstFilled(get("naam_mm"), get("naam_fp")),
    naam_fp: s(get("naam_fp")) || null,
    geboortedatum: s(get("geboortedatum_fp")) || null,
    leeftijd: toNum(get("leeftijd_event")),
    geslacht: s(get("geslacht")) || null,
    gewicht: toNum(get("gewicht_mm")),
    discipline: s(ctx.discipline) || null,
    klasse: s(ctx.klasse_mm) || null,
    gym: s(get("gym_mm")) || null,
    va_nummer: fighterId || s(get("va_mm")) || null,

    licentie: s(get("licentie")) || null,
    heeft_startverbod: s(get("heeft_startverbod")) || null,

    totaal_wedstrijden: toNum(get("totaal_wedstrijden_scrape")),
    gewonnen: toNum(get("gewonnen_scrape")),
    verloren: toNum(get("historisch_l")),
    draw: toNum(get("historisch_d")),
    demo: toNum(get("demo_totaal")),

    nulmeting_totaal: toNum(get("nulmeting_totaal")),
    nulmeting_klasse: s(get("nulmeting_klasse")) || null,
    nulmeting_opmerking: s(get("nulmeting_opmerking")) || null,

    heeft_keurmerk: isTruthyKeurmerk((ctx as AnyRow)?.[`keurmerk_${prefix}`]) ? "Ja" : "Nee",
    keurmerk_reason: s((ctx as AnyRow)?.[`keurmerk_reden_${prefix}`]) || null,

    email: null,
    telefoon: null,
    trainer_naam: null,
    trainer_email: null,
    trainer_tel: null,
  };
}


function mapTournamentContextToUnified(
  ctx: TournamentContextRow,
  fighterId: string
): UnifiedFighter {
  return {
    fighter_id: fighterId || s(ctx.fighter_id) || s(ctx.va_nummer) || null,
    row_nr: null,
    corner: null,
    bout_id: null,
    partij_nr: null,
    controle_run_id: s(ctx.controle_run_id) || null,
    is_toernooi: true,
    toernooi_code: s(ctx.toernooi_code) || null,

    naam: firstFilled(ctx.naam, ctx.naam_fp, ctx.naam_mm),
    naam_fp: s(ctx.naam_fp) || null,
    geboortedatum: s(ctx.geboortedatum) || null,
    leeftijd: toNum(ctx.leeftijd_event),
    geslacht: s(ctx.geslacht) || null,
    gewicht: toNum(ctx.gewicht),
    discipline: s(ctx.discipline) || null,
    klasse: s(ctx.klasse ?? ctx.klasse_mm) || null,
    gym: firstFilled(ctx.sportschool, ctx.sportschool_mm),
    va_nummer: fighterId || s(ctx.va_nummer) || s(ctx.fighter_id) || null,

    licentie: s(ctx.licentie) || null,
    heeft_startverbod:
      typeof ctx.heeft_startverbod === "boolean"
        ? ctx.heeft_startverbod
          ? "Ja"
          : "Nee"
        : s(ctx.heeft_startverbod) || null,

    totaal_wedstrijden: toNum(ctx.totaal_wedstrijden),
    gewonnen: toNum(ctx.gewonnen),
    verloren: toNum(ctx.verloren),
    draw: toNum(ctx.draw),
    demo: toNum(ctx.demo),

    nulmeting_totaal: toNum(ctx.nulmeting_totaal),
    nulmeting_klasse: s(ctx.nulmeting_klasse) || null,
    nulmeting_opmerking: s(ctx.nulmeting_opmerking) || null,

    heeft_keurmerk: isTruthyKeurmerk(ctx.heeft_keurmerk) ? "Ja" : "Nee",
    keurmerk_reason: s(ctx.keurmerk_reason) || null,

    email: null,
    telefoon: null,
    trainer_naam: null,
    trainer_email: null,
    trainer_tel: null,
  };
}

function mapBoutToUnified(
  bout: MatchmakingBoutRow,
  corner: Corner,
  fighterId: string
): UnifiedFighter {

  const isRood = corner === "rood";

  const naam = isRood
    ? firstFilled(bout.rood_naam, bout.rood_naam_mm)
    : firstFilled(bout.blauw_naam, bout.blauw_naam_mm);

  const gym = isRood
    ? firstFilled(bout.rood_gym, bout.rood_gym_mm)
    : firstFilled(bout.blauw_gym, bout.blauw_gym_mm);

  const va = isRood
    ? firstFilled((bout as AnyRow).va_rood, (bout as AnyRow).rood_va_mm)
    : firstFilled((bout as AnyRow).va_blauw, (bout as AnyRow).blauw_va_mm);

  return {
    fighter_id: fighterId || s(va) || null,
    row_nr: toNum(bout.partij_nr),
    corner,
    bout_id: s(bout.bout_id) || null,
    partij_nr: toNum(bout.partij_nr),
    controle_run_id: null,
    is_toernooi: Boolean(bout.is_toernooi),
    toernooi_code: s(bout.toernooi_code) || null,

    naam: s(naam) || null,
    naam_fp: null,
    geboortedatum: null,
    leeftijd: null,
    geslacht: null,
    gewicht: null,
    discipline: s(bout.discipline) || null,
    klasse: s(bout.klasse) || null,
    gym: s(gym) || null,
    va_nummer: fighterId || s(va) || null,

    licentie: null,
    heeft_startverbod: null,

    totaal_wedstrijden: null,
    gewonnen: null,
    verloren: null,
    draw: null,
    demo: null,

    nulmeting_totaal: null,
    nulmeting_klasse: null,
    nulmeting_opmerking: null,

    heeft_keurmerk: null,
    keurmerk_reason: null,

    email: null,
    telefoon: null,
    trainer_naam: null,
    trainer_email: null,
    trainer_tel: null,
  };
}

function pickRelevantRuleRows(
  rows: FighterRuleResultRow[],
  fighterName: string,
  fighterId: string,
  opponentName: string
) {
  const nameNeedle = norm(fighterName);
  const idNeedle = norm(fighterId);
  const opponentNeedle = norm(opponentName);

  const filtered = rows.filter((row) => {
    const hay = norm(`${row.rule ?? ""} ${row.rule_code ?? ""} ${row.boodschap ?? ""}`);
    if (!hay) return true;
    if (nameNeedle && hay.includes(nameNeedle)) return true;
    if (idNeedle && hay.includes(idNeedle)) return true;
    if (opponentNeedle && hay.includes(opponentNeedle)) return true;

    const youthRule =
      hay.includes("jeugd") ||
      hay.includes("leeftijdsverschil") ||
      hay.includes("partijverschil") ||
      hay.includes("toernooi");
    return !youthRule;
  });

  return filtered.length ? filtered : rows;
}

function dedupeRuleRows(rows: FighterRuleResultRow[]) {
  const seen = new Set<string>();
  const out: FighterRuleResultRow[] = [];

  for (const row of rows) {
    const key = [
      norm(row.rule),
      norm(row.rule_code),
      norm(row.resultaat),
      norm(row.boodschap),
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }

  return out;
}

function meldingTone(level: "ok" | "info" | "warn" | "error") {
  if (level === "error") {
    return {
      border: "rgba(239,68,68,0.30)",
      left: "rgba(239,68,68,0.95)",
      glow: "rgba(239,68,68,0.16)",
      text: "#fff4f4",
      badgeBg: "linear-gradient(180deg, rgba(239,68,68,0.95) 0%, rgba(153,27,27,0.95) 100%)",
      badgeBorder: "rgba(248,113,113,0.42)",
      badgeText: "#fff4f4",
      valueBg:
        "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.05) 100%)",
    };
  }

  if (level === "warn") {
    return {
      border: "rgba(255,77,0,0.30)",
      left: "rgba(255,77,0,0.95)",
      glow: "rgba(255,77,0,0.14)",
      text: "#fff7f2",
      badgeBg: "linear-gradient(180deg, rgba(255,77,0,0.95) 0%, rgba(180,54,0,0.95) 100%)",
      badgeBorder: "rgba(255,133,80,0.42)",
      badgeText: "#fff7f2",
      valueBg:
        "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.05) 100%)",
    };
  }

  if (level === "info") {
    return {
      border: "rgba(59,130,246,0.30)",
      left: "rgba(59,130,246,0.95)",
      glow: "rgba(59,130,246,0.14)",
      text: "#eff6ff",
      badgeBg: "linear-gradient(180deg, rgba(59,130,246,0.95) 0%, rgba(29,78,216,0.95) 100%)",
      badgeBorder: "rgba(96,165,250,0.42)",
      badgeText: "#eff6ff",
      valueBg:
        "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.05) 100%)",
    };
  }

  return {
    border: "rgba(34,197,94,0.30)",
    left: "rgba(34,197,94,0.95)",
    glow: "rgba(34,197,94,0.14)",
    text: "#f0fdf4",
    badgeBg: "linear-gradient(180deg, rgba(34,197,94,0.95) 0%, rgba(21,128,61,0.95) 100%)",
    badgeBorder: "rgba(74,222,128,0.42)",
    badgeText: "#f0fdf4",
    valueBg:
      "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.05) 100%)",
  };
}

function emptyDraft(unified: UnifiedFighter | null): EditDraft {
  return {
    naam_input: firstFilled(unified?.naam),
    geboortedatum_input: firstFilled(unified?.geboortedatum),
    geslacht: firstFilled(unified?.geslacht),
    gewicht: firstFilled(unified?.gewicht),
    gym_input: firstFilled(unified?.gym),
    va_nummer: firstFilled(unified?.va_nummer),
    email: firstFilled(unified?.email),
    telefoon: firstFilled(unified?.telefoon),
    trainer_naam: firstFilled(unified?.trainer_naam),
    trainer_email: firstFilled(unified?.trainer_email),
    trainer_tel: firstFilled(unified?.trainer_tel),
  };
}

export default function FighterPage() {
  const router = useRouter();
  const params = useParams<{ matchmakingId: string; fighterId: string }>();

  const matchmakingId = s(params?.matchmakingId);
  const fighterId = s(params?.fighterId);

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const [header, setHeader] = useState<HeaderRow | null>(null);
  const [fighter, setFighter] = useState<MatchmakingBoutRow | null>(null);
  const [unified, setUnified] = useState<UnifiedFighter | null>(null);
  const [fighterContext, setFighterContext] = useState<BoutContextRow | TournamentContextRow | null>(null);
  const [rawFighter, setRawFighter] = useState<AnyRow | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [ruleResults, setRuleResults] = useState<FighterRuleResultRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showExtraOpmerking, setShowExtraOpmerking] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | number | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editSection, setEditSection] = useState<EditSectionKey>("alles");
  const [editSaving, setEditSaving] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft>({
    naam_input: "",
    geboortedatum_input: "",
    geslacht: "",
    gewicht: "",
    gym_input: "",
    va_nummer: "",
    email: "",
    telefoon: "",
    trainer_naam: "",
    trainer_email: "",
    trainer_tel: "",
  });
  const initialVaRef = useRef<string>("");

  const loadData = useCallback(async () => {
    if (!matchmakingId || !fighterId) return;

    setLoading(true);
    setLoadError(null);

    try {
      const { data: boutRows, error: boutError } = await supabase
        .from("matchmaking_bouts_raw")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .or(`va_rood.eq.${fighterId},va_blauw.eq.${fighterId}`)
        .order("partij_nr", { ascending: true });

      if (boutError) throw boutError;

      const boutRow = ((boutRows ?? [])[0] ?? null) as MatchmakingBoutRow | null;
      const boutCorner = findCornerFromBoutRow(boutRow, fighterId);

      const contextBaseQuery = supabase
        .from("controle_bout_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false });

      const ctxResponse = boutRow?.bout_id
        ? await contextBaseQuery.eq("bout_id", s(boutRow.bout_id)).limit(25)
        : await contextBaseQuery.or(`rood_va_mm.eq.${fighterId},blauw_va_mm.eq.${fighterId}`).limit(25);

      if (ctxResponse.error) throw ctxResponse.error;

      const primaryBoutContext = ((ctxResponse.data ?? [])[0] ?? null) as BoutContextRow | null;

      const tournamentContextQuery = await supabase
        .from("controle_toernooi_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .or(`fighter_id.eq.${fighterId},va_nummer.eq.${fighterId}`)
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(25);

      if (tournamentContextQuery.error) throw tournamentContextQuery.error;

      const primaryTournamentContext =
        ((tournamentContextQuery.data ?? [])[0] ?? null) as TournamentContextRow | null;

      const primaryContext = primaryTournamentContext ?? primaryBoutContext;

      if (!primaryContext && !boutRow) {
        throw new Error("Geen vechtergegevens gevonden voor deze matchmaking en vechter.");
      }

      const { data: headerRows, error: headerError } = await supabase
        .from("matchmakings")
        .select("id, naam, datum, locatie, bondteam")
        .eq("id", matchmakingId)
        .limit(1);

      if (headerError) throw headerError;

      const headerRow = (headerRows ?? [])[0] ?? null;

      setHeader({
        id: matchmakingId,
        naam: (headerRow as any)?.naam ?? (primaryContext as any)?.evenement_naam ?? null,
        datum: (headerRow as any)?.datum ?? (primaryContext as any)?.evenement_datum ?? null,
        locatie: (headerRow as any)?.locatie ?? (primaryContext as any)?.locatie ?? null,
        bondteam: (headerRow as any)?.bondteam ?? (primaryContext as any)?.bondteam ?? null,
      } as HeaderRow);

      if (!primaryContext) throw new Error("Geen context gevonden voor deze vechter.");

      const isTournamentContext = Boolean(primaryTournamentContext);
      const corner = isTournamentContext
        ? null
        : boutCorner ??
          (s((primaryContext as BoutContextRow).rood_va_mm) === fighterId
            ? "rood"
            : s((primaryContext as BoutContextRow).blauw_va_mm) === fighterId
            ? "blauw"
            : null);

      if (!isTournamentContext && !corner) {
        throw new Error("Hoek kon niet worden bepaald voor deze vechter.");
      }

      setFighter(boutRow);
      setFighterContext(primaryContext);
      setRawFighter(null);

      const mapped = isTournamentContext
        ? mapTournamentContextToUnified(primaryTournamentContext as TournamentContextRow, fighterId)
        : mapContextToUnified(primaryContext as BoutContextRow, corner as Corner, fighterId);
      setUnified(mapped);

      const isTournament = Boolean(
        isTournamentContext ||
          (primaryContext as any).is_toernooi ||
          boutRow?.is_toernooi ||
          s((primaryContext as any).toernooi_code)
      );
      const toernooiCode = s((primaryContext as any).toernooi_code || boutRow?.toernooi_code);
      const controleRunId = s((primaryContext as any).controle_run_id);
      const partijNr =
        toNum((primaryContext as any).partij_nr) ??
        toNum(boutRow?.partij_nr) ??
        null;
      const fighterVa = s(mapped.va_nummer || fighterId);

      let resultQuery = supabase
        .from("controle_resultaten")
        .select("id, controle_run_id, bout_id, partij_nr, rule, rule_code, resultaat, severity, boodschap, review_status, hoek, toernooi_code")
        .eq("matchmaking_id", matchmakingId)
        .order("created_at", { ascending: true });

      if (controleRunId) {
        resultQuery = resultQuery.eq("controle_run_id", controleRunId);
      }

      if (isTournament) {
        if (toernooiCode) {
          resultQuery = resultQuery.eq("toernooi_code", toernooiCode);
        }
      } else if (partijNr != null) {
        resultQuery = resultQuery.eq("partij_nr", partijNr);
      } else if (s((primaryContext as any).bout_id)) {
        resultQuery = resultQuery.eq("bout_id", s((primaryContext as any).bout_id));
      } else if (s(boutRow?.bout_id)) {
        resultQuery = resultQuery.eq("bout_id", s(boutRow?.bout_id));
      }

      const { data: rawRuleRows, error: resultError } = await resultQuery;
      if (resultError) throw resultError;

      const opponentName =
        !corner
          ? ""
          : corner === "rood"
          ? safeText((primaryContext as any).blauw_naam_mm || (primaryContext as any).blauw_naam_fp, "")
          : safeText((primaryContext as any).rood_naam_mm || (primaryContext as any).rood_naam_fp, "");

      const tournamentRuleRows = ((rawRuleRows ?? []) as AnyRow[]).filter((row) => {
        if (!isTournament) return true;

        const hay = norm(`${row.rule ?? ""} ${row.rule_code ?? ""} ${row.boodschap ?? ""}`);
        const fighterNeedles = [norm(mapped.naam), norm(mapped.naam_fp), norm(fighterVa)].filter(Boolean);
        return fighterNeedles.some((needle) => hay.includes(String(needle)));
      });

      const filteredRuleRows = dedupeRuleRows(
        pickRelevantRuleRows(
          (tournamentRuleRows.length ? tournamentRuleRows : (rawRuleRows ?? [])) as FighterRuleResultRow[],
          safeText(mapped.naam, ""),
          fighterId,
          opponentName
        )
      );

      setRuleResults(filteredRuleRows);

      let uitslagenQuery = supabase
        .from("controle_uitslagen")
        .select("id, datum, discipline, klasse, uitslag, tegenstander, evenement, va_nummer, hoek, partij_nr, toernooi_code")
        .eq("matchmaking_id", matchmakingId)
        .order("datum", { ascending: false });

      if (controleRunId) {
        uitslagenQuery = uitslagenQuery.eq("controle_run_id", controleRunId);
      }

      if (isTournament) {
        if (toernooiCode) {
          uitslagenQuery = uitslagenQuery.eq("toernooi_code", toernooiCode);
        }
        if (fighterVa) {
          uitslagenQuery = uitslagenQuery.eq("va_nummer", fighterVa);
        }
      } else if (partijNr != null) {
        uitslagenQuery = uitslagenQuery.eq("partij_nr", partijNr);
      }

      const { data: uitslagenRows, error: uitslagenError } = await uitslagenQuery;
      if (uitslagenError) throw uitslagenError;

      const filteredUitslagen = ((uitslagenRows ?? []) as AnyRow[]).filter((row) => {
        const rowCorner = s(row.hoek).toLowerCase();
        const rowVa = s(row.va_nummer);
        const matchesCorner = rowCorner ? rowCorner === corner : false;
        const matchesId = rowVa && rowVa === fighterVa;

        if (isTournament) {
          return matchesCorner || matchesId;
        }

        return matchesCorner || matchesId || !rowCorner;
      });

      setResults(
        filteredUitslagen.map((row) => ({
          id: row.id,
          datum: row.datum ?? null,
          discipline: row.discipline ?? null,
          klasse: row.klasse ?? null,
          uitslag: row.uitslag ?? null,
          fighter_id: row.va_nummer ?? fighterId,
          tegenstander: row.tegenstander ?? null,
          evenement: row.evenement ?? null,
          sportschool: row.sportschool ?? null,
          gewicht: row.gewicht ?? null,
        }))
      );
    } catch (err: any) {
      setLoadError(err?.message || "Onbekende fout bij laden.");
    } finally {
      setLoading(false);
    }
  }, [matchmakingId, fighterId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const naam = useMemo(() => safeText(unified?.naam, "Onbekend"), [unified]);
  const geboortedatum = useMemo(() => unified?.geboortedatum ?? null, [unified]);
  const discipline = useMemo(() => unified?.discipline ?? null, [unified]);
  const klasse = useMemo(() => unified?.klasse ?? null, [unified]);
  const geslacht = useMemo(() => unified?.geslacht ?? null, [unified]);
  const gewicht = useMemo(() => unified?.gewicht ?? null, [unified]);
  const trainerNaam = useMemo(() => unified?.trainer_naam ?? null, [unified]);

  const licentie = useMemo(() => boolLikeLabel(unified?.licentie), [unified]);
  const startverbod = useMemo(() => boolLikeLabel(unified?.heeft_startverbod), [unified]);

  const leeftijdEvent = useMemo(() => {
    if (unified?.leeftijd != null) return unified.leeftijd;
    return calcAgeAtDate(geboortedatum, header?.datum);
  }, [unified, geboortedatum, header?.datum]);

  const nulmetingOpmerkingRaw = useMemo(
    () => s(unified?.nulmeting_opmerking),
    [unified]
  );

  const nulmetingOpmerking = useMemo(
    () => safeText(unified?.nulmeting_opmerking, "-"),
    [unified]
  );

  const heeftNulmetingOpmerking = useMemo(
    () => nulmetingOpmerkingRaw.length > 0 && nulmetingOpmerkingRaw !== "-",
    [nulmetingOpmerkingRaw]
  );

  useEffect(() => {
    setShowExtraOpmerking(heeftNulmetingOpmerking);
  }, [heeftNulmetingOpmerking]);

  const nulmetingTotaal = useMemo(() => {
    const n = toNum(unified?.nulmeting_totaal);
    return n == null ? "-" : String(n);
  }, [unified]);

  const nulmetingKlasse = useMemo(
    () => safeText(unified?.nulmeting_klasse, "-"),
    [unified]
  );

  const isYouth = useMemo(() => {
    return (
      norm(klasse).includes("jeugd") ||
      norm(klasse).includes("youth") ||
      norm(nulmetingKlasse).includes("jeugd") ||
      norm(nulmetingKlasse).includes("youth") ||
      (leeftijdEvent != null && leeftijdEvent < 18)
    );
  }, [klasse, nulmetingKlasse, leeftijdEvent]);

  const gewichtKlasseDisplay = useMemo(() => {
    if (isYouth) return buildYouthWeightRange(gewicht);
    return determineAdultWeightClass(gewicht, discipline);
  }, [isYouth, gewicht, discipline]);

  const gewichtKlasseLabel = useMemo(() => {
    return isYouth ? "Zoekmarge gewicht" : "Gewichtklasse";
  }, [isYouth]);

  const meldingen = useMemo(
    () => buildRuleMeldingen(ruleResults, nulmetingOpmerking, results.length),
    [ruleResults, nulmetingOpmerking, results.length]
  );

  const keurmerkInput = useMemo(() => {
    return safeText(unified?.gym, "-");
  }, [unified]);

  const keurmerkSportschool = useMemo(() => {
    const reason = s(unified?.keurmerk_reason);
    const matched = reason.match(/gematcht met\s+\"([^\"]+)\"/i)?.[1];
    return safeText(matched || unified?.gym, "-");
  }, [unified]);

  const keurmerkGeldigTotRaw = useMemo(() => {
    return extractKeurmerkDate(unified?.keurmerk_reason);
  }, [unified]);

  const eventDateRaw = useMemo(() => {
    const d = s(header?.datum || fighterContext?.evenement_datum);
    return d && dayjs(d).isValid() ? dayjs(d).format("YYYY-MM-DD") : null;
  }, [header?.datum, fighterContext?.evenement_datum]);

  const keurmerkValidation = useMemo(() => {
    const rawStatus = s(unified?.heeft_keurmerk) || "";
    const matchedSchool = keurmerkSportschool !== "-";
    const expiryRaw = keurmerkGeldigTotRaw;

    if (!matchedSchool) {
      return {
        aanwezig: "Nee",
        color: "red" as const,
        einddatum: "-",
      };
    }

    if (!expiryRaw) {
      return {
        aanwezig: rawStatus === "Ja" ? "Ja" : "Nee",
        color: rawStatus === "Ja" ? ("green" as const) : ("red" as const),
        einddatum: "-",
      };
    }

    const expiry = dayjs(expiryRaw);
    if (!expiry.isValid()) {
      return {
        aanwezig: "Nee",
        color: "red" as const,
        einddatum: "-",
      };
    }

    if (eventDateRaw && dayjs(eventDateRaw).isValid()) {
      const eventDate = dayjs(eventDateRaw);
      if (expiry.endOf("day").isBefore(eventDate.startOf("day"))) {
        return {
          aanwezig: "Nee",
          color: "red" as const,
          einddatum: formatDate(expiryRaw),
        };
      }
    }

    return {
      aanwezig: rawStatus === "Ja" ? "Ja" : "Nee",
      color: rawStatus === "Ja" ? ("green" as const) : ("red" as const),
      einddatum: formatDate(expiryRaw),
    };
  }, [unified, keurmerkSportschool, keurmerkGeldigTotRaw, eventDateRaw]);

  function openEditModal(section: EditSectionKey = "alles") {
    const draft = emptyDraft(unified);
    setEditDraft(draft);
    setEditSection(section);
    initialVaRef.current = s(draft.va_nummer);
    setEditOpen(true);
  }

  function closeEditModal() {
    setEditOpen(false);
  }

  function setDraft<K extends keyof EditDraft>(key: K, value: EditDraft[K]) {
    setEditDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function reviewMelding(item: MeldingItem, action: "approve" | "reject") {
    if (!item.id) return;

    setReviewingId(item.id);

    try {
      const res = await authedFetch(unified?.is_toernooi ? "/api/control-engine/review" : "/api/matchmaker/review-warning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          unified?.is_toernooi
            ? { controle_resultaat_id: item.id, decision: action }
            : { matchmaking_id: matchmakingId, result_id: item.id, action, source: "fighter" }
        ),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? "Melding verwerken mislukt");
      }

      await loadData();
    } catch (err: any) {
      alert(err?.message || "Melding verwerken mislukt.");
    } finally {
      setReviewingId(null);
    }
  }

  async function runAutocheckFightpaspoort() {
    if (!unified?.va_nummer) return;

    setChecking(true);

    try {
      const payload = {
        matchmaking_id: matchmakingId,
        fighter_id: unified.va_nummer,
        va_nummer: unified.va_nummer,
        bout_id: unified.bout_id,
        partij_nr: unified.partij_nr,
        corner: unified.corner,
        toernooi_code: unified.toernooi_code,
        is_toernooi: unified.is_toernooi,
      };

      const res = await authedFetch(unified.is_toernooi ? TOERNOOI_AUTOCHECK_ENDPOINT : AUTOCHECK_ENDPOINT, {
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

      if (!res.ok) {
        throw new Error(json?.error || `Autocheck mislukt (${res.status})`);
      }

      await loadData();
      alert("Autocheck Fightpaspoort uitgevoerd.");
    } catch (err: any) {
      alert(err?.message || "Autocheck mislukt.");
    } finally {
      setChecking(false);
    }
  }

  async function saveEdit(runAutocheckAfter: boolean) {
    if (!unified?.va_nummer) return;

    setEditSaving(true);

    try {
      const payload = {
        matchmaking_id: matchmakingId,
        fighter_id: unified.va_nummer,
        va_nummer: s(editDraft.va_nummer) || unified.va_nummer || null,
        bout_id: unified.bout_id,
        partij_nr: unified.partij_nr,
        corner: unified.corner,
        toernooi_code: unified.toernooi_code,
        is_toernooi: unified.is_toernooi,

        naam_input: s(editDraft.naam_input) || null,
        geboortedatum_input: s(editDraft.geboortedatum_input) || null,
        geslacht: s(editDraft.geslacht) || null,
        gewicht: s(editDraft.gewicht) || null,
        gym_input: s(editDraft.gym_input) || null,

        email: s(editDraft.email) || null,
        telefoon: s(editDraft.telefoon) || null,
        trainer_naam: s(editDraft.trainer_naam) || null,
        trainer_email: s(editDraft.trainer_email) || null,
        trainer_tel: s(editDraft.trainer_tel) || null,
      };

      const saveRes = await authedFetch(unified.is_toernooi ? TOERNOOI_SAVE_ENDPOINT : SAVE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const saveJson = await saveRes.json().catch(() => null);

      if (!saveRes.ok) {
        throw new Error(saveJson?.error ?? "Opslaan mislukt");
      }

      const vaChanged = s(editDraft.va_nummer) !== s(initialVaRef.current);

      if (runAutocheckAfter || vaChanged) {
        const rescrapePayload = {
          matchmaking_id: matchmakingId,
          fighter_id: s(editDraft.va_nummer) || unified.va_nummer || null,
          va_nummer: s(editDraft.va_nummer) || unified.va_nummer || null,
          bout_id: unified.bout_id,
          partij_nr: unified.partij_nr,
          corner: unified.corner,
          toernooi_code: unified.toernooi_code,
          is_toernooi: unified.is_toernooi,
        };

        const rescrapeRes = await authedFetch(unified.is_toernooi ? TOERNOOI_AUTOCHECK_ENDPOINT : AUTOCHECK_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rescrapePayload),
        });

        const rescrapeJson = await rescrapeRes.json().catch(() => null);

        if (!rescrapeRes.ok) {
          throw new Error(rescrapeJson?.error ?? "Opslaan gelukt, maar autocheck mislukte");
        }
      }

      await loadData();
      setEditOpen(false);
      alert(runAutocheckAfter || vaChanged ? "Opgeslagen + autocheck uitgevoerd." : "Wijzigingen opgeslagen.");
    } catch (err: any) {
      alert(err?.message || "Opslaan mislukt.");
    } finally {
      setEditSaving(false);
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

  if (!unified) {
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

      {checking ? (
        <WaitOverlay
          title="Fightpaspoort controle bezig"
          subtitle="De scraper draait. Een ogenblik geduld terwijl de vechter opnieuw wordt gecontroleerd."
        />
      ) : null}

      {editOpen ? (
        <EditModal
          draft={editDraft}
          section={editSection}
          saving={editSaving}
          onClose={closeEditModal}
          onChange={setDraft}
          onSave={() => saveEdit(false)}
          onSaveAndAutocheck={() => saveEdit(true)}
        />
      ) : null}

      <div style={shell}>
        <BrutalHeader
          eventName={safeText(header?.naam)}
          eventDate={formatDate(header?.datum)}
          discipline={safeText(discipline)}
          klasse={safeText(klasse)}
          location={safeText(header?.locatie)}
          bondteam={safeText(header?.bondteam)}
          fighterName={naam}
          matchmakingId={matchmakingId}
          onBack={() => router.back()}
          onAutocheck={runAutocheckFightpaspoort}
          onEdit={() => openEditModal("alles")}
          checking={checking}
        />

        <section style={backplate}>
          <section style={topGrid}>
            <div style={sideCardWrap}>
              <MetalCard accent="blue">
                <CardHeader title="Persoonlijk" dot="blue" onEdit={() => openEditModal("persoonlijk")} />
                <section style={{ ...cardBodyDark, minHeight: TOP_CARD_HEIGHT }}>
                  <div style={fighterHeaderName}>{naam}</div>

                  <div style={infoGridCompact}>
                    <InfoRow
                      icon={<CalendarDays size={14} />}
                      label="Geboortedatum"
                      value={formatDate(geboortedatum)}
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
                      value={safeText(unified?.va_nummer)}
                    />
                    <InfoRow
                      icon={<UserRound size={14} />}
                      label="Naam bron"
                      value={safeText(
                        rawFighter?.naam ??
                          unified?.naam_fp ??
                          (fighterContext as any)?.naam_fp ??
                          (fighterContext as any)?.naam_mm
                      )}
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
                  <CardHeader title="Contactinformatie" dot="orange" onEdit={() => openEditModal("contact")} />
                  <section style={cardBodyCenterLight}>
                    <div style={contactEmailLarge}>
                      {safeText(unified?.email ?? unified?.trainer_email)}
                    </div>
                    <div style={infoGridCompactLight}>
                      <InfoRowLight
                        icon={<Phone size={14} />}
                        label="Telefoon"
                        value={safeText(unified?.telefoon ?? unified?.trainer_tel)}
                      />
                      <InfoRowLight
                        icon={<UserCog size={14} />}
                        label="Trainer"
                        value={safeText(unified?.trainer_naam)}
                      />
                    </div>
                  </section>
                </MetalCard>
              </div>
            </div>

            <div style={sideCardWrap}>
              <MetalCard accent="red">
                <CardHeader title="Vechterdetails" dot="red" onEdit={() => openEditModal("vechterdetails")} />
                <section style={{ ...cardBodyDark, minHeight: TOP_CARD_HEIGHT }}>
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
                      label={gewichtKlasseLabel}
                      value={gewichtKlasseDisplay}
                    />
                    <InfoRow
                      icon={<Trophy size={14} />}
                      label="Totaal partijen"
                      value={safeText(unified?.totaal_wedstrijden)}
                    />
                    <InfoRow
                      icon={<Building2 size={14} />}
                      label="Sportschool"
                      value={safeText(unified?.gym)}
                    />
                    <InfoRow
                      icon={<UserRound size={14} />}
                      label="Trainer"
                      value={safeText(trainerNaam)}
                    />
                  </div>
                </section>
              </MetalCard>
            </div>
          </section>

          <section style={{ marginTop: 12 }}>
            <div style={extraKeurmerkGrid}>
              <MetalCard accent="blue">
                <CardHeader title="Extra / Nulmeting" dot="blue" />
                <section
                  style={{
                    ...cardBodyDark,
                    minHeight: heeftNulmetingOpmerking && showExtraOpmerking ? EXTRA_HEIGHT_EXPANDED : EXTRA_HEIGHT_COMPACT,
                  }}
                >
                  <div style={extraGridCompact}>
                    <ReadOnlyMini label="Nulmeting klasse" value={nulmetingKlasse} />
                    <ReadOnlyMini label="Nulmeting totaal" value={nulmetingTotaal} />
                  </div>

                  <div style={{ height: 12 }} />

                  <div style={collapseHeaderRow}>
                    <div style={collapseTitle}>Opmerking</div>
                    {heeftNulmetingOpmerking ? (
                      <button
                        type="button"
                        onClick={() => setShowExtraOpmerking((v) => !v)}
                        style={collapseToggleBtn}
                      >
                        {showExtraOpmerking ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        {showExtraOpmerking ? "Inklappen" : "Uitklappen"}
                      </button>
                    ) : (
                      <div style={collapseMuted}>Geen opmerking</div>
                    )}
                  </div>

                  {heeftNulmetingOpmerking && showExtraOpmerking ? (
                    <>
                      <div style={{ height: 8 }} />
                      <ReadOnlyBlockDark
                        label="Opmerking"
                        value={safeText(nulmetingOpmerking)}
                        minHeight={122}
                      />
                    </>
                  ) : null}
                </section>
              </MetalCard>

              <MetalCard accent="orange">
                <CardHeader title="Keurmerk" dot="orange" />
                <section style={cardBodyDark}>
                  <div style={keurmerkCompactGrid}>
                    <ReadOnlyBlockDark
                      label="Naam sportschool"
                      value={keurmerkInput}
                      minHeight={52}
                    />
                    <ReadOnlyBlockDark
                      label="Gematcht in DB tegen sportschool"
                      value={keurmerkSportschool}
                      minHeight={52}
                    />
                  </div>

                  <div style={{ height: 10 }} />

                  <div style={keurmerkCompactGrid}>
                    <ReadOnlyBlockDark
                      label="Keurmerk aanwezig"
                      value={keurmerkValidation.aanwezig}
                      minHeight={52}
                      strongValue={keurmerkValidation.color}
                    />
                    <ReadOnlyBlockDark
                      label="Einddatum keurmerk"
                      value={keurmerkValidation.einddatum}
                      minHeight={52}
                    />
                  </div>
                </section>
              </MetalCard>
            </div>
          </section>

          <section style={{ marginTop: 12 }}>
            <MetalCard accent="orange">
              <CardHeader title="Uitslagen" dot="orange" />
              <section style={cardBodyLightReadable}>
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
                              key={String(row.id ?? i)}
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
                <div style={meldingGridCompact}>
                  {meldingen.map((m, i) => (
                    <MeldingBlock
                      key={`${m.title}-${i}`}
                      item={m}
                      busy={reviewingId === m.id}
                      onApprove={() => reviewMelding(m, "approve")}
                      onReject={() => reviewMelding(m, "reject")}
                    />
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

function EditModal({
  draft,
  section,
  saving,
  onClose,
  onChange,
  onSave,
  onSaveAndAutocheck,
}: {
  draft: EditDraft;
  section: EditSectionKey;
  saving: boolean;
  onClose: () => void;
  onChange: <K extends keyof EditDraft>(key: K, value: EditDraft[K]) => void;
  onSave: () => void;
  onSaveAndAutocheck: () => void;
}) {
  return (
    <div style={waitOverlay}>
      <div style={waitBackdrop} onClick={saving ? undefined : onClose} />
      <div style={{ ...waitPanelOuter, width: "min(96vw, 960px)" }}>
        <div style={waitPanelInner}>
          <div style={editModalTopRow}>
            <div className={bebas.className} style={editModalTitle}>
              VECHTER BEWERKEN
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={editCloseButton}
            >
              <X size={16} />
            </button>
          </div>

          <div style={editGrid}>
            <EditSection title="Persoonlijk">
              <EditField
                label="Naam"
                value={draft.naam_input}
                onChange={(v) => onChange("naam_input", v)}
              />
              <EditField
                label="Fightpaspoort nummer"
                value={draft.va_nummer}
                onChange={(v) => onChange("va_nummer", v.replace(/[^\d]/g, ""))}
              />
              <EditField
                label="Geboortedatum"
                type="date"
                value={draft.geboortedatum_input}
                onChange={(v) => onChange("geboortedatum_input", v)}
              />
              <EditSelect
                label="Geslacht"
                value={draft.geslacht}
                onChange={(v) => onChange("geslacht", v)}
                options={[
                  { value: "", label: "-" },
                  { value: "man", label: "Man" },
                  { value: "vrouw", label: "Vrouw" },
                ]}
              />
            </EditSection>

            <EditSection title="Vechterdetails">
              <EditField
                label="Gewicht"
                value={draft.gewicht}
                onChange={(v) => onChange("gewicht", v)}
              />
              <EditField
                label="Sportschool"
                value={draft.gym_input}
                onChange={(v) => onChange("gym_input", v)}
              />
            </EditSection>

            <EditSection title="Contact">
              <EditField
                label="Email"
                value={draft.email}
                onChange={(v) => onChange("email", v)}
              />
              <EditField
                label="Telefoon"
                value={draft.telefoon}
                onChange={(v) => onChange("telefoon", v)}
              />
            </EditSection>

            <EditSection title="Trainer">
              <EditField
                label="Trainer naam"
                value={draft.trainer_naam}
                onChange={(v) => onChange("trainer_naam", v)}
              />
              <EditField
                label="Trainer email"
                value={draft.trainer_email}
                onChange={(v) => onChange("trainer_email", v)}
              />
              <EditField
                label="Trainer telefoon"
                value={draft.trainer_tel}
                onChange={(v) => onChange("trainer_tel", v)}
              />
            </EditSection>
          </div>

          <div style={editActionRow}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={editGhostButton}
            >
              Annuleren
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              style={{
                ...editSaveButton,
                ...(saving ? { opacity: 0.7, cursor: "wait" } : null),
              }}
            >
              <Save size={14} />
              {saving ? "Opslaan..." : "Opslaan"}
            </button>

            <button
              type="button"
              onClick={onSaveAndAutocheck}
              disabled={saving}
              style={{
                ...editSaveAndCheckButton,
                ...(saving ? { opacity: 0.7, cursor: "wait" } : null),
              }}
            >
              <RefreshCcw size={14} />
              {saving ? "Bezig..." : "Opslaan + Autocheck"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={editSectionBox}>
      <div style={editSectionTitle}>{title}</div>
      <div style={editSectionFields}>{children}</div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label style={editFieldWrap}>
      <span style={editFieldLabel}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={editInput}
      />
    </label>
  );
}

function EditSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label style={editFieldWrap}>
      <span style={editFieldLabel}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={editInput}
      >
        {options.map((opt) => (
          <option key={`${opt.value}-${opt.label}`} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

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
  onEdit,
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
  onEdit: () => void;
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
            <div className={bebas.className} style={headerFightsupport}>
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
              <button style={silverHeaderButton} onClick={onEdit}>
                <UserCog size={14} style={{ marginRight: 8 }} />
                Bewerken
              </button>
              <button
                style={{
                  ...silverHeaderButton,
                  ...(checking
                    ? {
                        opacity: 0.72,
                        cursor: "wait",
                      }
                    : null),
                }}
                onClick={onAutocheck}
                disabled={checking}
              >
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
  onEdit,
}: {
  title: string;
  dot?: "red" | "blue" | "orange" | "none";
  onEdit?: () => void;
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
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserCog size={16} />
          </button>
        ) : null}
      </div>
      <div style={cardAccentLine} />
    </div>
  );
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

function ReadOnlyBlockDark({
  label,
  value,
  minHeight = 120,
  strongValue = "normal",
}: {
  label: string;
  value: string;
  minHeight?: number;
  strongValue?: "normal" | "green" | "red";
}) {
  const color =
    strongValue === "green" ? "#bbf7d0" : strongValue === "red" ? "#fecaca" : "#ffffff";

  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div
        style={{
          ...readOnlyMiniBox,
          ...darkReadOnlyBlock,
          minHeight,
          color,
          fontWeight: strongValue === "normal" ? 800 : 900,
          alignItems: minHeight > 70 ? "flex-start" : "center",
          whiteSpace: "pre-wrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MeldingBlock({
  item,
  busy = false,
  onApprove,
  onReject,
}: {
  item: MeldingItem;
  busy?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const tone = meldingTone(item.level);

  return (
    <div style={meldingBlockWrap(tone)}>
      <div style={meldingBlockHead}>
        <div style={meldingLabelRow}>
          <span style={labelStyle}>Melding</span>
          <span style={meldingLevelBadge(tone)}>
            <Bell size={12} />
            {meldingLevelLabel(item.level)}
          </span>
        </div>
        <div style={meldingTitleCompact}>{item.title}</div>
      </div>

      <div
        style={{
          ...readOnlyMiniBox,
          ...meldingValueBox(tone),
        }}
      >
        {item.text}
      </div>

      {item.canReview ? (
        <div style={meldingActionRow}>
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            style={{
              ...meldingActionButton,
              ...(busy ? meldingActionButtonBusy : null),
            }}
          >
            Goedkeuren
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            style={{
              ...meldingActionButton,
              ...meldingActionButtonDanger,
              ...(busy ? meldingActionButtonBusy : null),
            }}
          >
            Afkeuren
          </button>
        </div>
      ) : null}
    </div>
  );
}

function WaitOverlay({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div style={waitOverlay}>
      <div style={waitBackdrop} />
      <div style={waitPanelOuter}>
        <div style={waitPanelInner}>
          <div style={waitBadgeRow}>
            <span style={waitBadge}>
              <RefreshCcw size={14} />
              Bezig met laden
            </span>
          </div>
          <div className={bebas.className} style={waitTitle}>
            {title}
          </div>
          <div style={waitText}>{subtitle}</div>
          <div style={waitBarTrack}>
            <div style={waitBarFill} />
          </div>
        </div>
      </div>
    </div>
  );
}

function meldingLevelLabel(level: "ok" | "info" | "warn" | "error") {
  if (level === "error") return "Afkeur";
  if (level === "warn") return "Actie";
  if (level === "info") return "Info";
  return "Ok";
}

const TOP_CARD_HEIGHT = 288;
const CONTACT_CARD_HEIGHT = 112;
const EXTRA_HEIGHT_COMPACT = 112;
const EXTRA_HEIGHT_EXPANDED = 238;

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

const headerLeftBlock: CSSProperties = { minWidth: 0 };
const headerCenterBlock: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
};
const headerRightBlock: CSSProperties = { minWidth: 0, textAlign: "right" };

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
  marginTop: 10,
  color: "#fff",
  fontSize: 28,
  lineHeight: 1.05,
  fontWeight: 900,
  textShadow: "0 2px 10px rgba(0,0,0,0.45)",
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

const cardBodyLightReadable: CSSProperties = {
  padding: 12,
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.46), transparent 58%), linear-gradient(180deg, rgba(248,249,251,0.99) 0%, rgba(228,231,236,0.99) 100%)",
  color: "#0f172a",
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
  color: "#334155",
  fontWeight: 900,
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
  fontWeight: 900,
  fontSize: 13,
  lineHeight: 1.3,
};

const extraKeurmerkGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  alignItems: "start",
};

const extraGridCompact: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
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

const darkReadOnlyBlock: CSSProperties = {
  width: "100%",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.07)",
  padding: 12,
  fontSize: 13,
  lineHeight: 1.5,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};

const collapseHeaderRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const collapseTitle: CSSProperties = {
  color: "#d0d7de",
  fontWeight: 900,
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const collapseMuted: CSSProperties = {
  color: "rgba(255,255,255,0.58)",
  fontWeight: 800,
  fontSize: 12,
};

const collapseToggleBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: 32,
  padding: "0 10px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.10)",
  color: "#fff",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
};

const keurmerkCompactGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const meldingGridCompact: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 10,
  width: "100%",
};

function meldingBlockWrap(tone: ReturnType<typeof meldingTone>): CSSProperties {
  return {
    borderRadius: 10,
    border: `1px solid ${tone.border}`,
    background: `radial-gradient(circle at 20% 0%, ${tone.glow}, transparent 48%), linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.00) 100%)`,
    padding: 10,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  };
}

const meldingBlockHead: CSSProperties = {
  marginBottom: 8,
};

const meldingLabelRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

function meldingLevelBadge(tone: ReturnType<typeof meldingTone>): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 24,
    padding: "0 8px",
    borderRadius: 4,
    background: tone.badgeBg,
    border: `1px solid ${tone.badgeBorder}`,
    color: tone.badgeText,
    fontSize: 11,
    fontWeight: 900,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16)",
    whiteSpace: "nowrap",
  };
}

const meldingTitleCompact: CSSProperties = {
  color: "#ffffff",
  fontWeight: 900,
  fontSize: 14,
  lineHeight: 1.2,
};

const meldingActionRow: CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 10,
  flexWrap: "wrap",
};

const meldingActionButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 34,
  padding: "0 12px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "linear-gradient(180deg, rgba(34,197,94,0.95) 0%, rgba(21,128,61,0.95) 100%)",
  color: "#fff",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
};

const meldingActionButtonDanger: CSSProperties = {
  background: "linear-gradient(180deg, rgba(255,77,0,0.95) 0%, rgba(180,54,0,0.95) 100%)",
};

const meldingActionButtonBusy: CSSProperties = {
  opacity: 0.7,
  cursor: "wait",
};

function meldingValueBox(tone: ReturnType<typeof meldingTone>): CSSProperties {
  return {
    alignItems: "flex-start",
    minHeight: 54,
    padding: "10px 12px",
    whiteSpace: "pre-wrap",
    lineHeight: 1.45,
    color: tone.text,
    background: tone.valueBg,
    border: `1px solid ${tone.border}`,
    borderLeft: `4px solid ${tone.left}`,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
  };
}

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
  color: "#334155",
  fontSize: 13,
  fontWeight: 900,
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

const waitOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const waitBackdrop: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(7,10,14,0.58)",
  backdropFilter: "blur(4px)",
};

const waitPanelOuter: CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: "min(92vw, 720px)",
  ...metalFrameStyle("orange"),
};

const waitPanelInner: CSSProperties = {
  borderRadius: 18,
  overflow: "hidden",
  border: "2px solid rgba(226,229,235,0.18)",
  boxShadow: "inset 0 0 0 2px rgba(19,22,29,0.66)",
  padding: 22,
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,77,0,0.15), transparent 48%), radial-gradient(circle at 82% 0%, rgba(59,130,246,0.12), transparent 44%), linear-gradient(180deg, rgba(20,22,28,0.98) 0%, rgba(8,10,14,1) 100%)",
};

const waitBadgeRow: CSSProperties = {
  display: "flex",
  justifyContent: "center",
};

const waitBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minHeight: 32,
  padding: "0 12px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  fontWeight: 900,
  fontSize: 12,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const waitTitle: CSSProperties = {
  marginTop: 14,
  textAlign: "center",
  color: "#ffffff",
  fontSize: 38,
  lineHeight: 1,
  letterSpacing: "0.08em",
};

const waitText: CSSProperties = {
  marginTop: 12,
  textAlign: "center",
  color: "rgba(255,255,255,0.84)",
  fontSize: 14,
  lineHeight: 1.5,
  fontWeight: 700,
};

const waitBarTrack: CSSProperties = {
  marginTop: 18,
  width: "100%",
  height: 14,
  borderRadius: 999,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.16)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
  boxShadow: "inset 0 1px 4px rgba(0,0,0,0.45)",
};

const waitBarFill: CSSProperties = {
  width: "58%",
  height: "100%",
  borderRadius: 999,
  background:
    "linear-gradient(90deg, rgba(255,77,0,0.96) 0%, rgba(255,130,64,0.96) 48%, rgba(59,130,246,0.92) 100%)",
  boxShadow: "0 0 18px rgba(255,77,0,0.35)",
};

const editModalTopRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 16,
};

const editModalTitle: CSSProperties = {
  color: "#fff",
  fontSize: 34,
  lineHeight: 1,
  letterSpacing: "0.08em",
};

const editCloseButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 38,
  height: 38,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  cursor: "pointer",
};

const editGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

const editSectionBox: CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  padding: 14,
};

const editSectionTitle: CSSProperties = {
  color: ORANGE,
  fontWeight: 900,
  fontSize: 13,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  marginBottom: 12,
};

const editSectionFields: CSSProperties = {
  display: "grid",
  gap: 10,
};

const editFieldWrap: CSSProperties = {
  display: "grid",
  gap: 6,
};

const editFieldLabel: CSSProperties = {
  color: "#d0d7de",
  fontWeight: 800,
  fontSize: 12,
};

const editInput: CSSProperties = {
  width: "100%",
  minHeight: 40,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  padding: "0 12px",
  fontWeight: 800,
  fontSize: 13,
  outline: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

const editActionRow: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 18,
};

const editGhostButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
};

const editSaveButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "linear-gradient(180deg, rgba(34,197,94,0.95) 0%, rgba(21,128,61,0.95) 100%)",
  color: "#fff",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
};

const editSaveAndCheckButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "linear-gradient(180deg, rgba(255,77,0,0.95) 0%, rgba(180,54,0,0.95) 100%)",
  color: "#fff",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
};

const smallEditButton: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid rgba(255,77,0,0.55)", background: "rgba(255,77,0,0.12)", color: "#fff", borderRadius: 8, padding: "5px 8px", fontSize: 11, fontWeight: 900, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em" };
