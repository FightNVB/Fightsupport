"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Scale,
  RotateCcw,
  Send,
  ShieldCheck,
  ArrowRightLeft,
  FileSpreadsheet,
  FileText,
  Repeat,
} from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";

import NvbDarkButton from "@/components/NvbDarkButton";
import NvbLightButton from "@/components/NvbLightButton";

import { inter } from "@/app/fonts";


const NVB_ORANGE = "#ff4d00";

type AnyRow = Record<string, any>;

type ControleRun = {
  id: string;
  matchmaking_id: string;
  status: string;
  gestart_op: string | null;
  afgerond_op: string | null;
  run_type: string | null;
};

type PartijStatus =
  | "verbod"
  | "afgekeurd"
  | "dispensatie"
  | "actie"
  | "ok"
  | "geen_info";

type ResRow = {
  partij_nr: number | null;
  hoek?: "rood" | "blauw" | null;
  resultaat: "ok" | "actie" | "dispensatie" | "afgekeurd" | "verbod" | string;
  rule: string | null;
  rule_code?: string | null;
  boodschap: string | null;
  review_status?: string | null;
  original_resultaat?: string | null;
};

type FilterKey =
  | "all"
  | "verbod"
  | "afgekeurd"
  | "dispensatie"
  | "actie"
  | "ok"
  | "geen_info"
  | "geen_licentie";

function metalFrameStyle(accent: "none" | "orange" = "orange"): CSSProperties {
  const accentGlow =
    accent === "orange"
      ? "radial-gradient(640px 320px at 50% 0%, rgba(255,77,0,0.18), transparent 62%)"
      : "radial-gradient(640px 320px at 50% 0%, rgba(255,255,255,0.06), transparent 62%)";

  const brushed =
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 4px)";

  const sheen =
    "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 24%, rgba(255,255,255,0) 48%, rgba(255,255,255,0.10) 70%, rgba(255,255,255,0) 100%)";

  return {
    border: "5px solid rgba(10,10,12,0.92)",
    borderRadius: 22,
    background: `${accentGlow}, ${sheen}, ${brushed}, linear-gradient(180deg, #3a3d44 0%, #1f2025 52%, #0a0b0e 100%)`,
    boxShadow:
      "0 26px 70px rgba(0,0,0,0.70)," +
      " inset 0 0 0 2px rgba(255,255,255,0.14)," +
      " inset 0 0 0 4px rgba(180,180,190,0.18)," +
      " inset 0 0 0 7px rgba(0,0,0,0.55)," +
      " inset 0 1px 0 rgba(255,255,255,0.22)," +
      " inset 0 -18px 24px rgba(0,0,0,0.65)",
  };
}

function metalInnerStyle(): CSSProperties {
  return {
    border: "3px solid rgba(0,0,0,0.45)",
    borderRadius: 16,
    background:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, rgba(255,255,255,0.025) 1px, rgba(255,255,255,0.025) 6px)," +
      " linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(233,236,240,0.98) 100%)",
    boxShadow:
      "inset 0 0 0 2px rgba(255,255,255,0.70)," +
      " inset 0 0 0 6px rgba(0,0,0,0.10)," +
      " inset 0 -12px 22px rgba(0,0,0,0.12)",
  };
}

const silverBackplate: CSSProperties = {
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 38%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(236,238,242,0.98) 100%)",
};

function parseISODateOnly(d?: any): Date | null {
  if (!d) return null;
  const s = String(d).trim();
  const dt = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  return isNaN(dt.getTime()) ? null : dt;
}

function calcAgeYearsOnDate(eventDate: Date, birthDate: Date): number | null {
  let years = eventDate.getFullYear() - birthDate.getFullYear();
  const m = eventDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && eventDate.getDate() < birthDate.getDate())) years -= 1;
  if (years < 0 || !Number.isFinite(years)) return null;
  return years;
}

function ageAtEvent(ctx: AnyRow, side: "rood" | "blauw"): string {
  const event = parseISODateOnly(ctx?.evenement_datum);
  const birth = parseISODateOnly(
    ctx?.[`${side}_geboortedatum_fp`] ?? ctx?.[`${side}_geboortedatum_mm`]
  );
  if (!event || !birth) return "-";
  const years = calcAgeYearsOnDate(event, birth);
  return years == null ? "-" : String(years);
}

function ageAtEventNumber(ctx: AnyRow, side: "rood" | "blauw"): number | null {
  const event = parseISODateOnly(ctx?.evenement_datum);
  const birth = parseISODateOnly(
    ctx?.[`${side}_geboortedatum_fp`] ?? ctx?.[`${side}_geboortedatum_mm`]
  );
  if (!event || !birth) return null;
  return calcAgeYearsOnDate(event, birth);
}

function minAgeAtEvent(ctx: AnyRow): number {
  const rood = ageAtEventNumber(ctx, "rood");
  const blauw = ageAtEventNumber(ctx, "blauw");
  const nums = [rood, blauw].filter(
    (x): x is number => x != null && Number.isFinite(x)
  );
  if (!nums.length) return 999;
  return Math.min(...nums);
}

function safeText(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
}

function licenseValueToOk(v: any): boolean | null {
  if (v == null) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v > 0;
  const s = String(v).trim().toLowerCase();
  if (!s) return null;
  if (["ja", "yes", "true", "geldig", "ok", "actief", "active"].includes(s))
    return true;
  if (
    ["nee", "no", "false", "ongeldig", "verlopen", "niet", "inactive", "inactief"].includes(s)
  )
    return false;
  if (s.includes("valid") || s.includes("geldig") || s.includes("ok")) return true;
  if (s.includes("invalid") || s.includes("ongeldig") || s.includes("verlop"))
    return false;
  return null;
}

function isMissingLicentie(ctx: AnyRow, side: "rood" | "blauw"): boolean {
  if (!ctx) return false;
  const prefix = `${side}_`;
  const preferred = [
    `${prefix}licentie_ok`,
    `${prefix}licentie_geldig`,
    `${prefix}licentie`,
    `${prefix}licentie_status`,
    `${prefix}licentie_fp`,
    `${prefix}licentie_ja_nee`,
  ];
  const keys = [
    ...preferred.filter((k) => k in (ctx as any)),
    ...Object.keys(ctx).filter(
      (k) => k.startsWith(prefix) && k.toLowerCase().includes("licen")
    ),
  ];
  if (keys.length === 0) return false;

  for (const k of keys) {
    const ok = licenseValueToOk((ctx as any)[k]);
    if (ok === true) return false;
  }
  for (const k of keys) {
    const v = (ctx as any)[k];
    const ok = licenseValueToOk(v);
    if (ok === false) return true;
    if (v == null) return true;
    if (typeof v === "string" && !v.trim()) return true;
  }
  return false;
}

function isContextCompleet(ctx: AnyRow): boolean {
  if (!ctx) return false;
  const required = [
    ctx?.rood_va_mm,
    ctx?.blauw_va_mm,
    ctx?.rood_naam_fp,
    ctx?.blauw_naam_fp,
    ctx?.rood_geboortedatum_fp,
    ctx?.blauw_geboortedatum_fp,
    ctx?.rood_geslacht,
    ctx?.blauw_geslacht,
    ctx?.evenement_datum,
  ];
  return required.every((v) => v != null && String(v).trim() !== "");
}

function isBelgischeGymInfoRow(r: Partial<ResRow> | null | undefined): boolean {
  const code = String((r as any)?.rule_code ?? "").toUpperCase();
  const rule = String((r as any)?.rule ?? "").toUpperCase();
  const msg = String((r as any)?.boodschap ?? "").toUpperCase();
  if (code.includes("KEURMERK_BE")) return true;
  if (code.includes("BELG") && code.includes("INFO")) return true;
  if (
    rule.includes("BELGI") &&
    (rule.includes("KEURMERK") || rule.includes("SPORTSCHOOL"))
  )
    return true;
  if (
    msg.includes("BELGI") &&
    (msg.includes("BKBMO") || msg.includes("BKMO") || msg.includes("BOKSBOEKJE"))
  )
    return true;
  return false;
}

function displayResultaatLabel(r: ResRow): string {
  if (isBelgischeGymInfoRow(r)) return "LET OP";
  const s = String(r.resultaat ?? "").trim();
  return s ? s.toUpperCase() : "";
}

function normResultaat(v: any): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  if (
    s === "afkeur" ||
    s === "afgekeur" ||
    s === "afgekeurd" ||
    s === "afkeuren"
  )
    return "afgekeurd";
  if (s === "actie" || s === "waarschuwing") return "actie";
  if (s === "dispensatie" || s === "disp") return "dispensatie";
  if (s === "ok" || s === "goedgekeurd") return "ok";
  if (s === "info") return "ok";
  return s;
}

function normResultaatRow(r: ResRow): string {
  if (isBelgischeGymInfoRow(r)) return "ok";
  return normResultaat(r?.resultaat);
}

function statusFromResultaten(resultaten: ResRow[]): PartijStatus {
  let s: PartijStatus = "geen_info";
  for (const r of resultaten) {
    const res = normResultaatRow(r);
    if (res === "afgekeurd") return "afgekeurd";
    if (res === "dispensatie") {
      s = s === "geen_info" ? "dispensatie" : s;
    }
    if (res === "actie") {
      s = s === "geen_info" || s === "ok" ? "actie" : s;
    }
    if (res === "ok") s = s === "geen_info" ? "ok" : s;
  }
  return s;
}

function statusFromResultatenOrOk(
  resultaten: ResRow[] | undefined,
  ctxRow: AnyRow
): PartijStatus {
  if (!isContextCompleet(ctxRow)) return "geen_info";
  if (!resultaten || resultaten.length === 0) return "ok";
  return statusFromResultaten(resultaten);
}

function HeaderBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "yellow" | "orange" | "gray" | "green" | "white" | "blue" | "purple";
}) {
  const cls =
    tone === "red"
      ? "bg-red-500 text-zinc-900"
      : tone === "yellow"
      ? "bg-yellow-300 text-black"
      : tone === "orange"
      ? "bg-orange-600 text-zinc-900"
      : tone === "green"
      ? "bg-green-500 text-zinc-900"
      : tone === "blue"
      ? "bg-blue-700 text-white"
      : tone === "purple"
      ? "bg-purple-700 text-white"
      : tone === "white"
      ? "bg-white/90 text-black"
      : "bg-gray-500 text-zinc-900";

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${cls}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

function Chip({
  label,
  tone,
}: {
  label: string;
  tone: "red" | "yellow" | "orange" | "gray" | "green" | "white" | "purple" | "blue";
}) {
  const cls =
    tone === "red"
      ? "bg-red-500 text-zinc-900"
      : tone === "yellow"
      ? "bg-yellow-300 text-black"
      : tone === "orange"
      ? "bg-orange-600 text-zinc-900"
      : tone === "green"
      ? "bg-green-500 text-zinc-900"
      : tone === "purple"
      ? "bg-purple-700 text-white"
      : tone === "blue"
      ? "bg-blue-700 text-white"
      : tone === "white"
      ? "bg-white/90 text-black"
      : "bg-gray-500 text-zinc-900";

  return (
    <span className={`px-2 py-1 rounded text-[11px] font-extrabold ${cls}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: PartijStatus }) {
  if (status === "afgekeurd") return <Chip label="AFKEUR" tone="red" />;
  if (status === "dispensatie") return <Chip label="DISPENSATIE" tone="orange" />;
  if (status === "actie") return <Chip label="ACTIE" tone="yellow" />;
  if (status === "ok") return <Chip label="OK" tone="green" />;
  return <Chip label="GEEN INFO" tone="white" />;
}

function FilterButton({
  label,
  active,
  onClick,
  count,
  tone,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
  tone: "red" | "yellow" | "orange" | "gray" | "green" | "white" | "neutral" | "purple" | "blue";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold border transition";

  const activeCls =
    tone === "red"
      ? "bg-red-500 text-zinc-900 border-red-500"
      : tone === "yellow"
      ? "bg-yellow-300 text-black border-yellow-300"
      : tone === "orange"
      ? "bg-orange-600 text-zinc-900 border-orange-600"
      : tone === "green"
      ? "bg-green-500 text-zinc-900 border-green-500"
      : tone === "purple"
      ? "bg-purple-700 text-white border-purple-700"
      : tone === "blue"
      ? "bg-blue-700 text-white border-blue-700"
      : tone === "white"
      ? "bg-white text-black border-white"
      : tone === "gray"
      ? "bg-gray-500 text-zinc-900 border-gray-500"
      : "bg-zinc-100 text-zinc-900 border-zinc-300";

  const inactiveCls =
    tone === "red"
      ? "bg-white text-red-700 border-red-500/60 hover:bg-red-500/15"
      : tone === "yellow"
      ? "bg-white text-yellow-800 border-yellow-300/70 hover:bg-yellow-300/15"
      : tone === "orange"
      ? "bg-white text-orange-800 border-orange-500/70 hover:bg-orange-500/15"
      : tone === "green"
      ? "bg-white text-green-800 border-green-500/60 hover:bg-green-500/15"
      : tone === "purple"
      ? "bg-white text-purple-700 border-purple-700/60 hover:bg-purple-700/15"
      : tone === "blue"
      ? "bg-white text-blue-700 border-blue-500/60 hover:bg-blue-500/15"
      : tone === "white"
      ? "bg-white text-zinc-900 border-zinc-400 hover:bg-zinc-100"
      : tone === "gray"
      ? "bg-white text-slate-700 border-gray-500/60 hover:bg-gray-500/15"
      : "bg-white text-zinc-900 border-zinc-300 hover:bg-white";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!disabled}
      className={`${base} ${active ? activeCls : inactiveCls} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <span>{label}</span>
      <span
        className={`tabular-nums px-2 py-0.5 rounded-full ${active ? "bg-white" : "bg-zinc-100"}`}
      >
        {count}
      </span>
    </button>
  );
}

function isVerbodRow(r: ResRow) {
  const code = String(r.rule_code ?? "").toUpperCase();
  const rule = String(r.rule ?? "").toUpperCase();
  const msg = String(r.boodschap ?? "").toUpperCase();
  if (code.includes("STARTVERBOD")) return true;
  if (rule.includes("STARTVERBOD")) return true;
  if (msg.includes("STARTVERBOD")) return true;
  if (code.includes("VERBOD")) return true;
  if (rule.includes("VERBOD")) return true;
  if (msg.includes("VERBOD")) return true;
  if (rule.includes("NIET START")) return true;
  if (msg.includes("NIET START")) return true;
  return false;
}

function isGeenTegenstander(ctx: AnyRow): boolean {
  const blauwVa = String(ctx?.blauw_va_mm ?? "").trim();
  const blauwNaam = String(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm ?? "").trim();
  const roodVa = String(ctx?.rood_va_mm ?? "").trim();
  const roodNaam = String(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm ?? "").trim();
  const heeftRood = !!(roodVa || roodNaam);
  const heeftBlauw = !!(blauwVa || blauwNaam);
  return (heeftRood && !heeftBlauw) || (!heeftRood && heeftBlauw);
}

function formatDurationExact(mins: number): string {
  const rounded = Math.round(mins);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} uur`;
  return `${h} uur ${m} min`;
}

function isGalaDuurRow(r: ResRow) {
  const code = String(r.rule_code ?? "").toUpperCase();
  const rule = String(r.rule ?? "").toUpperCase();
  const msg = String(r.boodschap ?? "").toUpperCase();
  if (code.includes("GALA") && code.includes("DUUR")) return true;
  if (code.includes("EVENEMENT") && code.includes("DUUR")) return true;
  if (code.includes("TIJDSDUUR")) return true;
  if (rule.includes("GALA") && rule.includes("DUUR")) return true;
  if (rule.includes("TIJDSDUUR")) return true;
  if (rule.includes("EVENEMENT") && rule.includes("DUUR")) return true;
  if (msg.includes("GALA") && msg.includes("DUUR")) return true;
  if (msg.includes("TIJDSDUUR")) return true;
  if (msg.includes("EVENEMENT") && msg.includes("DUUR")) return true;
  if (rule.includes("DUURT TE LANG")) return true;
  if (msg.includes("DUURT TE LANG")) return true;
  return false;
}

const KLASSE_MINUTEN: Record<string, number> = {
  "a titel": 31,
  a: 21,
  b: 14,
  c: 13,
  n: 8,
  "16/17": 8,
  j: 8,
  jeugd: 8,
  demo: 6,
  boksen: 10,
  "mma pro": 17,
  "mma amateur": 17,
  "mma jeugd": 17,
};

function normalizeKlasse(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\bklasse\b/g, "")
    .replace(/\bclass\b/g, "")
    .replace(/\bheren\b/g, "")
    .replace(/\bheer\b/g, "")
    .replace(/\bdames\b/g, "")
    .replace(/\bdame\b/g, "")
    .replace(/\bjongens\b/g, "")
    .replace(/\bjongen\b/g, "")
    .replace(/\bmeisjes\b/g, "")
    .replace(/\bmeisje\b/g, "")
    .trim();
}

function matchKlasseMinuten(klasse: string, discipline?: string): number | null {
  const rawKlasse = String(klasse ?? "").trim().toLowerCase();
  const rawDiscipline = String(discipline ?? "").trim().toLowerCase();

  if (!rawKlasse && !rawDiscipline) return null;

  const k = normalizeKlasse(rawKlasse);
  const d = rawDiscipline
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    d.includes("boksen") ||
    d.includes("boxing") ||
    k.includes("boksen") ||
    k.includes("boxing")
  ) {
    return KLASSE_MINUTEN.boksen;
  }

  if (k.includes("mma") || d.includes("mma")) {
    if (k.includes("pro") || d.includes("pro")) return KLASSE_MINUTEN["mma pro"];
    if (
      k.includes("jeugd") ||
      k.includes("youth") ||
      d.includes("jeugd") ||
      d.includes("youth")
    ) {
      return KLASSE_MINUTEN["mma jeugd"];
    }
    return KLASSE_MINUTEN["mma amateur"];
  }

  if (k.includes("titel")) return KLASSE_MINUTEN["a titel"];

  if (
    k === "j" ||
    k.includes("jeugd") ||
    k.includes("youth") ||
    k.includes("junior")
  ) {
    return KLASSE_MINUTEN.j;
  }

  if (/16\s*\/\s*17/.test(k) || (k.includes("16") && k.includes("17"))) {
    return KLASSE_MINUTEN["16/17"];
  }

  if (
    k === "n" ||
    k.includes("nieuweling") ||
    k.includes("novice") ||
    /^n\b/.test(k)
  ) {
    return KLASSE_MINUTEN.n;
  }

  if (k === "c" || /^c\b/.test(k)) return KLASSE_MINUTEN.c;
  if (k === "b" || /^b\b/.test(k)) return KLASSE_MINUTEN.b;
  if (k === "a" || /^a\b/.test(k)) return KLASSE_MINUTEN.a;

  if (k.includes("demo")) return KLASSE_MINUTEN.demo;

  return null;
}

function calcGalaDuurFromRows(rows: AnyRow[]): {
  totalMins: number;
  unknownKlasses: string[];
  countsByKlasse: Record<string, number>;
} {
  let totalMins = 0;
  const unknownSet = new Set<string>();
  const countsByKlasse: Record<string, number> = {};

  for (const r of rows) {
    const klasse = String(r.klasse_mm ?? r.klasse ?? "").trim();
    const discipline = String(r.discipline ?? "").trim();
    const mins = matchKlasseMinuten(klasse, discipline);

    if (mins !== null) {
      totalMins += mins;
      const key = klasse || "-";
      countsByKlasse[key] = (countsByKlasse[key] ?? 0) + 1;
    } else if (klasse && klasse !== "-") {
      unknownSet.add(klasse);
    }
  }

  return {
    totalMins,
    unknownKlasses: Array.from(unknownSet),
    countsByKlasse,
  };
}

function buildGalaDuurFromMins(totalMins: number) {
  const approvalMin = 390;
  const maxMin = 510;
  const needsApproval = totalMins > approvalMin;
  const overMax = totalMins > maxMin;

  let extra = "";
  if (overMax) extra = "⚠️ Overschrijdt max 8.5 uur (510 min) — AFKEUR.";
  else if (needsApproval) extra = "⚠️ Boven 6.5 uur: Superadmin-goedkeuring nodig.";
  else extra = "Binnen 6.5 uur (geen goedkeuring nodig).";

  return {
    mins: totalMins,
    needsApproval,
    overMax,
    text: `Geschatte gala-duur: ${formatDurationExact(totalMins)} (${Math.round(
      totalMins
    )} min). ${extra}`,
  };
}

function buildCompactRunMeldingen(runMeldingen: ResRow[], galaDuurMinsOverride?: number): ResRow[] {
  const galaRows = (runMeldingen ?? []).filter(isGalaDuurRow);
  const rest = (runMeldingen ?? []).filter((r) => !isGalaDuurRow(r));

  const mins: number | null =
    galaDuurMinsOverride != null
      ? galaDuurMinsOverride
      : galaRows.length > 0
      ? null
      : null;

  if (mins === null && galaRows.length === 0) return runMeldingen ?? [];

  const approvalMin = 390;
  const maxMin = 510;
  const needsApproval = mins != null ? mins > approvalMin : true;
  const overMax = mins != null ? mins > maxMin : false;
  const resultaat = overMax ? "afgekeurd" : needsApproval ? "actie" : "ok";

  const compactMsg =
    mins != null
      ? `Geschatte gala-duur: ${formatDurationExact(mins)} (${Math.round(mins)} min). ${
          overMax
            ? "Overschrijdt max 8.5 uur — AFKEUR."
            : needsApproval
            ? "Boven 6.5 uur — Hoofdofficial nodig / actie."
            : "Binnen 6.5 uur (geen goedkeuring nodig)."
        }`
      : galaRows.find((r) => r?.boodschap)?.boodschap ??
        "Gala-duur kon niet worden berekend.";

  const merged: ResRow = {
    partij_nr: null,
    hoek: null,
    rule: "Gala tijdsduur",
    rule_code: "GALA_DUUR",
    resultaat,
    boodschap: compactMsg,
  };

  return [merged, ...rest];
}

function DarkActionButton({
  label,
  onClick,
  tone = "orange",
  title,
  disabled,
  icon,
}: {
  label: string;
  onClick: () => void;
  tone?: "orange" | "green" | "purple" | "red" | "silver" | "blue";
  title?: string;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const border =
    tone === "green"
      ? "rgba(34,197,94,0.85)"
      : tone === "purple"
      ? "rgba(147,51,234,0.85)"
      : tone === "red"
      ? "rgba(239,68,68,0.85)"
      : tone === "silver"
      ? "rgba(220,220,220,0.70)"
      : tone === "blue"
      ? "rgba(59,130,246,0.85)"
      : "rgba(255,77,0,0.85)";

  const text =
    tone === "silver"
      ? "rgba(240,240,240,0.95)"
      : tone === "orange"
      ? "rgba(255,210,190,0.95)"
      : "rgba(240,240,240,0.95)";

  return (
    <button
      type="button"
      disabled={!!disabled}
      title={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded font-extrabold text-sm transition ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90 hover:-translate-y-[1px]"
      }`}
      style={{
        background: "rgba(0,0,0,0.55)",
        border: `1px solid ${border}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        color: text,
        minHeight: 40,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-zinc-700 mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="w-full rounded-lg px-3 py-2 bg-white text-zinc-900 border border-zinc-300 focus:outline-none focus:border-white/30"
      />
    </label>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className={`${inter.className} min-h-screen bg-zinc-100 text-zinc-900`}>
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 py-3">{children}</div>
    </div>
  );
}

function getStableRowKey(r: AnyRow): string {
  if (typeof r?.id === "string" && r.id.trim()) return `ctx-${r.id.trim()}`;
  if (typeof r?.bout_id === "string" && r.bout_id.trim()) return `bout-${r.bout_id.trim()}`;
  if (typeof r?.matchmaker_bout_id === "string" && r.matchmaker_bout_id.trim())
    return `mmb-${r.matchmaker_bout_id.trim()}`;
  if (typeof r?.raw_bout_id === "string" && r.raw_bout_id.trim()) return `raw-${r.raw_bout_id.trim()}`;
  if (typeof r?.source_bout_id === "string" && r.source_bout_id.trim())
    return `src-${r.source_bout_id.trim()}`;
  return `partij-${String(r?.partij_nr ?? Math.random())}`;
}

function getControleContextId(r: AnyRow): string | null {
  if (typeof r?.id === "string" && r.id.trim()) return r.id.trim();
  return null;
}

function getBoutIdForReorder(r: AnyRow): string | null {
  const candidates = [r?.matchmaker_bout_id, r?.bout_id, r?.raw_bout_id, r?.source_bout_id];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

function arrayMove<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function toNumberLoose(v: any): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function getBoutWeightForSort(r: AnyRow): number {
  const maxKg = toNumberLoose(r?.max_gewicht);
  if (maxKg != null) return maxKg;

  const rood = toNumberLoose(r?.rood_gewicht);
  const blauw = toNumberLoose(r?.blauw_gewicht);

  if (rood != null && blauw != null) return Math.max(rood, blauw);
  if (rood != null) return rood;
  if (blauw != null) return blauw;
  return 999;
}

function klasseRank(raw: any): number {
  const s = String(raw ?? "").trim().toUpperCase();
  if (!s) return 999;
  if (s.includes("N")) return 1;
  if (s.includes("C")) return 2;
  if (s.includes("B")) return 3;
  if (s.includes("A")) return 4;
  return 999;
}

function autoSortLineupRows(input: AnyRow[]): AnyRow[] {
  return [...input].sort((a, b) => {
    const ageDiff = minAgeAtEvent(a) - minAgeAtEvent(b);
    if (ageDiff !== 0) return ageDiff;

    const klasseDiff =
      klasseRank(a?.klasse_mm ?? a?.klasse) - klasseRank(b?.klasse_mm ?? b?.klasse);
    if (klasseDiff !== 0) return klasseDiff;

    const weightDiff = getBoutWeightForSort(a) - getBoutWeightForSort(b);
    if (weightDiff !== 0) return weightDiff;

    const aPn = Number(a?.partij_nr ?? 99999);
    const bPn = Number(b?.partij_nr ?? 99999);
    return aPn - bPn;
  });
}

function swapRowCornersLocal(row: AnyRow): AnyRow {
  const next = { ...row };

  const pairs: Array<[string, string]> = [
    ["rood_naam_fp", "blauw_naam_fp"],
    ["rood_naam_mm", "blauw_naam_mm"],
    ["rood_naam", "blauw_naam"],
    ["rood_gym_fp", "blauw_gym_fp"],
    ["rood_gym_mm", "blauw_gym_mm"],
    ["rood_gym", "blauw_gym"],
    ["rood_va_mm", "blauw_va_mm"],
    ["va_rood", "va_blauw"],
    ["rood_gewicht", "blauw_gewicht"],
    ["rood_geboortedatum_fp", "blauw_geboortedatum_fp"],
    ["rood_geboortedatum_mm", "blauw_geboortedatum_mm"],
    ["rood_geslacht", "blauw_geslacht"],
    ["rood_licentie", "blauw_licentie"],
    ["rood_licentie_ok", "blauw_licentie_ok"],
    ["rood_licentie_geldig", "blauw_licentie_geldig"],
    ["rood_licentie_status", "blauw_licentie_status"],
    ["rood_licentie_fp", "blauw_licentie_fp"],
    ["rood_licentie_ja_nee", "blauw_licentie_ja_nee"],
    ["rood_nulmeting_klasse", "blauw_nulmeting_klasse"],
    ["rood_totaal_wedstrijden", "blauw_totaal_wedstrijden"],
    ["rood_gewonnen", "blauw_gewonnen"],
  ];

  for (const [a, b] of pairs) {
    const av = next[a];
    const bv = next[b];
    next[a] = bv;
    next[b] = av;
  }

  next.__swapped_corners = !next.__swapped_corners;
  return next;
}

export default function ControleMatchmakingPage() {
  const params = useParams();
  const router = useRouter();
  const matchmakingId = params?.matchmakingId as string;

  const [reloadTick, setReloadTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<ControleRun | null>(null);
  const [evenementNaam, setEvenementNaam] = useState<string | null>(null);
  const [evenementDatum, setEvenementDatum] = useState<string | null>(null);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [orderedRows, setOrderedRows] = useState<AnyRow[]>([]);
  const [lineupMode, setLineupMode] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saveOrderBusy, setSaveOrderBusy] = useState(false);

  const [statusByPartij, setStatusByPartij] = useState<Record<number, PartijStatus>>({});
  const [runMeldingen, setRunMeldingen] = useState<ResRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [busyPartij, setBusyPartij] = useState<Record<number, string>>({});
  const [hasDispByPartij, setHasDispByPartij] = useState<Record<number, boolean>>({});
  const [dispRequestByPartij, setDispRequestByPartij] = useState<Record<number, boolean>>({});
  const [countByPartij, setCountByPartij] = useState<Record<number, number>>({});
  const [verbodByPartij, setVerbodByPartij] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [showWeegstationModal, setShowWeegstationModal] = useState(false);
  const [headerBusy, setHeaderBusy] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [fDiscipline, setFDiscipline] = useState("");
  const [fKlasse, setFKlasse] = useState("");
  const [fRoodNaam, setFRoodNaam] = useState("");
  const [fRoodGym, setFRoodGym] = useState("");
  const [fRoodVa, setFRoodVa] = useState("");
  const [fRoodKg, setFRoodKg] = useState("");
  const [fBlauwNaam, setFBlauwNaam] = useState("");
  const [fBlauwGym, setFBlauwGym] = useState("");
  const [fBlauwVa, setFBlauwVa] = useState("");
  const [fBlauwKg, setFBlauwKg] = useState("");
  const [fMaxKg, setFMaxKg] = useState("");

  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  const subtitle = useMemo(() => {
    const naam = (evenementNaam ?? "").trim();
    const datum = (evenementDatum ?? "").trim();
    if (naam && datum) return `${naam}  ${datum}`;
    if (naam) return naam;
    if (datum) return datum;
    return "-";
  }, [evenementNaam, evenementDatum]);

  const separator = useMemo(
    () =>
      ({
        height: "1px",
        background:
          "linear-gradient(to right, transparent, rgba(220,220,220,0.22), transparent)",
      }) as React.CSSProperties,
    []
  );

  function openExcel() {
    window.open(
      `/api/rapport/excel?matchmaking_id=${encodeURIComponent(matchmakingId)}`,
      "_blank"
    );
  }

  function openRapportage() {
    window.open(
      `/api/rapport/lineup?matchmaking_id=${encodeURIComponent(matchmakingId)}`,
      "_blank"
    );
  }

  function openNkfExcel() {
    window.open(
      `/api/rapport/nkf-excel?matchmaking_id=${encodeURIComponent(matchmakingId)}`,
      "_blank"
    );
  }

  function syncOrderedRowsFromRows(nextRows: AnyRow[]) {
    const sorted = [...nextRows].sort(
      (a, b) => Number(a.partij_nr ?? 0) - Number(b.partij_nr ?? 0)
    );
    setOrderedRows(sorted);
  }

  function movePartij(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= orderedRows.length) return;
    setOrderedRows((prev) => arrayMove(prev, fromIndex, toIndex));
  }

  function swapPartijCorners(index: number) {
    setOrderedRows((prev) => {
      const copy = [...prev];
      if (!copy[index]) return prev;
      copy[index] = swapRowCornersLocal(copy[index]);
      return copy;
    });
    setMsg("✅ Hoeken lokaal gewisseld in lineup. Opslaan om volgorde te bewaren.");
  }

  function applyAutoLineup() {
    setOrderedRows(autoSortLineupRows(orderedRows));
    setMsg(
      "✅ Lineup automatisch gesorteerd op jongste eerst, daarna klasse N → C → B → A, daarna gewicht."
    );
  }

  function getVisualPartijNr(row: AnyRow, indexInView: number) {
    if (!lineupMode) return Number(row?.partij_nr ?? indexInView + 1);
    return indexInView + 1;
  }

  function hasOrderChanges() {
    if (orderedRows.length !== rows.length) return false;

    for (let i = 0; i < orderedRows.length; i += 1) {
      const visualNr = i + 1;
      const currentNr = Number(orderedRows[i]?.partij_nr ?? 0);
      if (currentNr !== visualNr) return true;
      if (orderedRows[i]?.__swapped_corners) return true;
    }

    return false;
  }

  async function withHeaderBusy(key: string, fn: () => Promise<void>) {
    setHeaderBusy(key);
    setError(null);
    setMsg("");
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setHeaderBusy(null);
    }
  }

  async function saveLineupOrder() {
    setError(null);
    setMsg("");

    if (!matchmakingId) {
      setError("matchmakingId ontbreekt.");
      return;
    }

    const items = orderedRows.map((r, index) => ({
      ctx_row_id: getControleContextId(r),
      bout_id: getBoutIdForReorder(r),
      old_partij_nr:
        typeof r?.partij_nr === "number"
          ? r.partij_nr
          : typeof r?.partij_nr === "string" && /^\d+$/.test(r.partij_nr.trim())
          ? Number(r.partij_nr.trim())
          : null,
      partij_nr: index + 1,
      swap_corners: !!r?.__swapped_corners,
    }));

    const invalid = items.find((x) => !x.ctx_row_id && !x.bout_id && x.old_partij_nr == null);
    if (invalid) {
      setError("Niet alle partijen hebben een geldige bronkoppeling voor reorder.");
      return;
    }

    setSaveOrderBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Niet ingelogd.");

      const resp = await authedFetch("/api/controle/reorder-partijen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          items,
        }),
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error ?? "Volgorde opslaan mislukt.");

      setMsg("✅ Lineup opgeslagen.");
      setLineupMode(false);
      setReloadTick((x) => x + 1);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaveOrderBusy(false);
    }
  }

  function cancelLineupMode() {
    setLineupMode(false);
    syncOrderedRowsFromRows(rows);
    setDragId(null);
  }

  async function addPartijSubmit() {
    setError(null);
    setMsg("");
    if (!matchmakingId) {
      setError("matchmakingId ontbreekt.");
      return;
    }

    const required = [
      ["Discipline", fDiscipline],
      ["Klasse", fKlasse],
      ["Rood naam", fRoodNaam],
      ["Rood sportschool", fRoodGym],
      ["Rood VA", fRoodVa],
      ["Rood KG", fRoodKg],
      ["Blauw naam", fBlauwNaam],
      ["Blauw sportschool", fBlauwGym],
      ["Blauw VA", fBlauwVa],
      ["Blauw KG", fBlauwKg],
      ["Max gewicht", fMaxKg],
    ] as const;

    const miss = required.find(([, v]) => !String(v ?? "").trim());
    if (miss) {
      setError(`Veld ontbreekt: ${miss[0]}`);
      return;
    }

    const toNum = (s: string) => {
      const n = Number(String(s).replace(",", "."));
      return Number.isFinite(n) ? n : null;
    };

    const payload = {
      matchmaking_id: matchmakingId,
      discipline: fDiscipline.trim(),
      klasse: fKlasse.trim(),
      rood_naam: fRoodNaam.trim(),
      rood_gym: fRoodGym.trim(),
      va_rood: fRoodVa.trim(),
      rood_gewicht: toNum(fRoodKg),
      blauw_naam: fBlauwNaam.trim(),
      blauw_gym: fBlauwGym.trim(),
      va_blauw: fBlauwVa.trim(),
      blauw_gewicht: toNum(fBlauwKg),
      max_gewicht: toNum(fMaxKg),
    };

    if (
      payload.rood_gewicht == null ||
      payload.blauw_gewicht == null ||
      payload.max_gewicht == null
    ) {
      setError("KG velden moeten een geldig getal zijn (bijv. 71.5).");
      return;
    }

    setAddBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Niet ingelogd.");

      const resp = await authedFetch("/api/matchmaking/add-bout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error ?? "Partij toevoegen mislukt");

      setMsg("✅ Partij toegevoegd.");
      setShowAdd(false);
      setFDiscipline("");
      setFKlasse("");
      setFRoodNaam("");
      setFRoodGym("");
      setFRoodVa("");
      setFRoodKg("");
      setFBlauwNaam("");
      setFBlauwGym("");
      setFBlauwVa("");
      setFBlauwKg("");
      setFMaxKg("");
      setReloadTick((x) => x + 1);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setAddBusy(false);
    }
  }

  async function deletePartij(partijNr: number, boutId?: string | null) {
    if (!confirm(`Partij ${partijNr} verwijderen?`)) return;
    setBusyPartij((prev) => ({ ...prev, [partijNr]: "delete" }));
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Niet ingelogd.");

      const resp = await authedFetch("/api/matchmaking/delete-partij", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          partij_nr: partijNr,
          controle_run_id: run?.id ?? null,
          bout_id: boutId ?? null,
        }),
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error ?? "Verwijderen mislukt.");

      setMsg(`✅ Partij ${partijNr} verwijderd.`);
      setReloadTick((x) => x + 1);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusyPartij((prev) => {
        const next = { ...prev };
        delete next[partijNr];
        return next;
      });
    }
  }

  async function stuurNaarUitslagen() {
    await withHeaderBusy("uitslagen", async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Niet ingelogd.");

      const resp = await authedFetch("/api/matchmaking/naar-uitslagen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ matchmaking_id: matchmakingId }),
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error ?? "Naar uitslagen sturen mislukt.");

      setMsg(json?.message ?? "✅ Matchmaking is doorgestuurd naar uitslagen.");
      setReloadTick((x) => x + 1);
    });
  }

  async function stuurNaarControle() {
    await withHeaderBusy("controle", async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Niet ingelogd.");

      const resp = await authedFetch("/api/officials/stuur-naar-controle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ matchmaking_id: matchmakingId }),
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error ?? "Sturen naar controle mislukt.");

      setMsg(json?.message ?? "✅ Matchmaking is doorgestuurd naar controle.");
      setReloadTick((x) => x + 1);
    });
  }

  async function retourNaarMatchmaker() {
    await withHeaderBusy("retour", async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Niet ingelogd.");

      const resp = await authedFetch("/api/return-matchmaking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          return_to: "matchmaker",
        }),
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error ?? "Retour naar matchmaker mislukt.");

      setMsg(json?.message ?? "✅ Matchmaking is teruggezet naar matchmaker.");
      setReloadTick((x) => x + 1);
    });
  }

  async function stuurUploadNaarAdmin() {
    await withHeaderBusy("admin", async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Niet ingelogd.");

      const resp = await authedFetch("/api/officials/upload-matchmaking-naar-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
        }),
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(json?.error ?? "Sturen naar admin mislukt.");

      setMsg(json?.message ?? "✅ Upload-matchmaking is doorgestuurd naar admin.");
      setReloadTick((x) => x + 1);
    });
  }

  async function load() {
    setLoading(true);
    setError(null);
    setMsg("");

    try {
      if (!matchmakingId) {
        setRows([]);
        setOrderedRows([]);
        setRun(null);
        setEvenementNaam(null);
        setEvenementDatum(null);
        setStatusByPartij({});
        setRunMeldingen([]);
        setHasDispByPartij({});
        setDispRequestByPartij({});
        setCountByPartij({});
        setVerbodByPartij({});
        return;
      }

      try {
        const { data: mm, error: mmErr } = await supabase
          .from("matchmakings")
          .select("naam, datum, event_id")
          .eq("id", matchmakingId)
          .maybeSingle();

        if (mmErr) throw mmErr;

        let naam = String((mm as any)?.naam ?? "").trim() || null;
        let datum = String((mm as any)?.datum ?? "").trim() || null;
        const eventId = String((mm as any)?.event_id ?? "").trim() || null;

        if (eventId && (!naam || !datum)) {
          const { data: ev, error: evErr } = await supabase
            .from("events")
            .select("naam, datum")
            .eq("id", eventId)
            .maybeSingle();

          if (evErr) throw evErr;
          if (!naam) naam = String((ev as any)?.naam ?? "").trim() || null;
          if (!datum) datum = String((ev as any)?.datum ?? "").trim() || null;
        }

        if (!naam || !datum) {
          const { data: ups, error: upErr } = await supabase
            .from("matchmaking_uploads")
            .select("evenement_naam, evenement_datum, event_id")
            .eq("matchmaking_id", matchmakingId)
            .order("uploaded_at", { ascending: false })
            .limit(1);

          if (upErr) throw upErr;

          const up = (ups ?? [])?.[0] as any;
          if (!naam) naam = String(up?.evenement_naam ?? "").trim() || null;
          if (!datum) datum = String(up?.evenement_datum ?? "").trim() || null;
        }

        setEvenementNaam(naam);
        setEvenementDatum(datum);
      } catch {
        setEvenementNaam(null);
        setEvenementDatum(null);
      }

      const { data: lastCtxRows, error: lastErr } = await supabase
        .from("controle_bout_context")
        .select("controle_run_id, created_at")
        .eq("matchmaking_id", matchmakingId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (lastErr) throw lastErr;

      const latestControleRunId = lastCtxRows?.[0]?.controle_run_id
        ? String(lastCtxRows[0].controle_run_id)
        : null;

      setRun(
        latestControleRunId
          ? ({
              id: latestControleRunId,
              matchmaking_id: matchmakingId,
              status: "unknown",
              gestart_op: null,
              afgerond_op: null,
              run_type: null,
            } as ControleRun)
          : null
      );

      let ctxQuery = supabase
        .from("controle_bout_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId);

      if (latestControleRunId) ctxQuery = ctxQuery.eq("controle_run_id", latestControleRunId);

      const { data: ctxRows, error: ctxErr } = await ctxQuery.order("partij_nr", {
        ascending: true,
      });

      if (ctxErr) throw ctxErr;

      const ctxList = (ctxRows ?? []) as AnyRow[];
      setRows(ctxList);
      syncOrderedRowsFromRows(ctxList);

      const map: Record<number, PartijStatus> = {};
      const ctxByPn: Record<number, AnyRow> = {};

      for (const r of ctxList) {
        const pn = Number(r.partij_nr);
        if (!Number.isFinite(pn)) continue;
        ctxByPn[pn] = r;
        map[pn] = isContextCompleet(r) ? "ok" : "geen_info";
      }

      if (!latestControleRunId) {
        setStatusByPartij(map);
        setRunMeldingen([]);
        setHasDispByPartij({});
        setDispRequestByPartij({});
        setCountByPartij({});
        setVerbodByPartij({});
        return;
      }

      const { data: resRows, error: resErr } = await supabase
        .from("controle_resultaten")
        .select(
          "partij_nr, bout_id, hoek, resultaat, rule, rule_code, boodschap, review_status, original_resultaat"
        )
        .eq("controle_run_id", latestControleRunId);

      if (resErr) throw resErr;

      const allRes = (resRows ?? []) as ResRow[];

      const runRows = allRes.filter((r) => {
        const pn = (r as any)?.partij_nr;
        const isRunPn = pn == null || Number(pn) === 0;
        const isRunBout = (r as any)?.bout_id == null;
        return isRunPn && isRunBout;
      });
      setRunMeldingen(runRows);

      const resByPn: Record<number, ResRow[]> = {};
      for (const rr of allRes) {
        const pn = Number(rr.partij_nr);
        if (!Number.isFinite(pn) || pn <= 0) continue;
        if (!resByPn[pn]) resByPn[pn] = [];
        resByPn[pn].push(rr);
      }

      const dispMap: Record<number, boolean> = {};
      for (const pn of Object.keys(resByPn)) {
        const pnNum = Number(pn);
        const rr = resByPn[pnNum];
        const hasDisp = rr.some((r) => normResultaatRow(r) === "dispensatie");
        if (hasDisp) dispMap[pnNum] = true;
      }

      const statusMap: Record<number, PartijStatus> = { ...map };
      const verbodMap: Record<number, boolean> = {};
      const countMap: Record<number, number> = {};

      for (const pnStr of Object.keys(ctxByPn)) {
        const pn = Number(pnStr);
        const ctx = ctxByPn[pn];
        const rr = resByPn[pn] ?? [];

        let status = statusFromResultatenOrOk(rr, ctx);
        if (dispMap[pn]) status = "dispensatie";

        statusMap[pn] = status;
        verbodMap[pn] = rr.some(isVerbodRow);
        countMap[pn] = rr.length;
      }

      setStatusByPartij(statusMap);
      setVerbodByPartij(verbodMap);
      setCountByPartij(countMap);
      setHasDispByPartij(dispMap);
      setDispRequestByPartij({});
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchmakingId, reloadTick]);

  useEffect(() => {
    if (!lineupMode) syncOrderedRowsFromRows(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const galaDuurCalc = useMemo(() => {
    if (rows.length === 0) return null;
    const result = calcGalaDuurFromRows(rows);
    return result.totalMins > 0 ? result : null;
  }, [rows]);

  const galaDuur = useMemo(() => {
    if (galaDuurCalc) return buildGalaDuurFromMins(galaDuurCalc.totalMins);
    return null;
  }, [galaDuurCalc]);

  const compactRunMeldingen = useMemo(
    () => buildCompactRunMeldingen(runMeldingen, galaDuurCalc?.totalMins),
    [runMeldingen, galaDuurCalc]
  );

  const rowsByPartijNr = useMemo(() => {
    if (lineupMode) return orderedRows;
    return [...rows].sort((a, b) => Number(a.partij_nr ?? 0) - Number(b.partij_nr ?? 0));
  }, [rows, orderedRows, lineupMode]);

  const missingLicentieByPartij = useMemo(() => {
    const m: Record<number, boolean> = {};
    for (const r of rows) {
      const pn = Number(r.partij_nr);
      if (!Number.isFinite(pn)) continue;
      if (isMissingLicentie(r, "rood") || isMissingLicentie(r, "blauw")) m[pn] = true;
    }
    return m;
  }, [rows]);

  const totals = useMemo(() => {
    let meldingen_totaal = 0,
      partijen_met_melding = 0;
    let ok = 0,
      actie = 0,
      afk = 0,
      disp = 0,
      geen = 0,
      verbod = 0,
      geen_licentie = 0;

    for (const r of rows) {
      const pn = Number(r.partij_nr);
      if (!Number.isFinite(pn)) continue;
      const s = statusByPartij[pn] ?? "geen_info";

      if (s === "afgekeurd") afk++;
      else if (s === "actie") actie++;
      else if (s === "ok") ok++;
      else if (s === "dispensatie") disp++;
      else geen++;

      if (verbodByPartij[pn]) verbod++;
      if (missingLicentieByPartij[pn]) geen_licentie++;

      const cnt = countByPartij[pn] ?? 0;
      meldingen_totaal += cnt;
      if (cnt > 0) partijen_met_melding++;
    }

    return {
      totaal: rows.length,
      meldingen_totaal,
      partijen_met_melding,
      verbod,
      afk,
      dispensatie: disp,
      actie,
      ok,
      geen,
      geen_licentie,
    };
  }, [rows, statusByPartij, verbodByPartij, countByPartij, missingLicentieByPartij]);

  const filterCounts = useMemo(() => {
    let afk = 0,
      actie = 0,
      ok = 0,
      disp = 0,
      geen = 0,
      verbod = 0,
      geen_licentie = 0;

    for (const r of rows) {
      const pn = Number(r.partij_nr);
      if (!Number.isFinite(pn)) continue;
      const s = statusByPartij[pn] ?? "geen_info";

      if (s === "afgekeurd") afk++;
      else if (s === "actie") actie++;
      else if (s === "ok") ok++;
      else if (s === "dispensatie") disp++;
      else geen++;

      if (verbodByPartij[pn]) verbod++;
      if (missingLicentieByPartij[pn]) geen_licentie++;
    }

    return {
      all: rows.length,
      verbod,
      afgekeurd: afk,
      dispensatie: disp,
      actie,
      ok,
      geen_info: geen,
      geen_licentie,
    };
  }, [rows, statusByPartij, verbodByPartij, missingLicentieByPartij]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    const base = rowsByPartijNr.filter((r) => {
      const pn = Number(r.partij_nr);
      if (!Number.isFinite(pn) && !lineupMode) return false;
      if (filter === "dispensatie")
        return (
          !!hasDispByPartij[pn] ||
          !!dispRequestByPartij[pn] ||
          statusByPartij[pn] === "dispensatie"
        );
      if (filter === "verbod") return !!verbodByPartij[pn];
      if (filter === "geen_licentie") return !!missingLicentieByPartij[pn];
      if (filter !== "all") {
        const s = statusByPartij[pn] ?? "geen_info";
        if (s !== filter) return false;
      }
      return true;
    });

    if (!q) return base;

    const hay = (r: AnyRow) =>
      [
        r.rood_naam_fp,
        r.rood_naam_mm,
        r.rood_naam,
        r.rood_gym_fp,
        r.rood_gym_mm,
        r.rood_va_mm,
        r.blauw_naam_fp,
        r.blauw_naam_mm,
        r.blauw_naam,
        r.blauw_gym_fp,
        r.blauw_gym_mm,
        r.blauw_va_mm,
      ]
        .map((v) => String(v ?? "").trim().toLowerCase())
        .filter(Boolean)
        .join(" ");

    return base.filter((r) => hay(r).includes(q));
  }, [
    rowsByPartijNr,
    filter,
    statusByPartij,
    hasDispByPartij,
    dispRequestByPartij,
    verbodByPartij,
    missingLicentieByPartij,
    search,
    lineupMode,
  ]);

  return (
    <Shell>
      <div style={metalFrameStyle("orange")} className="p-3 md:p-4">
        <div style={metalInnerStyle()} className="p-4 md:p-5">
          <div
            className="rounded-2xl px-4 py-4 md:px-6 md:py-5"
            style={{
              background: "linear-gradient(180deg, #34343a 0%, #23232a 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 18px 34px rgba(0,0,0,0.22)",
              color: "#fff",
            }}
          >
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="flex items-center justify-center xl:justify-start text-center xl:text-left">
                <div>
                  <div
                    className={inter.className}
                    style={{
                      color: NVB_ORANGE,
                      letterSpacing: "0.14em",
                      fontSize: 20,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      lineHeight: 1.1,
                    }}
                  >
                    FIGHTSUPPORT
                  </div>
                  <div
                    className={inter.className}
                    style={{
                      color: "rgba(255,255,255,0.84)",
                      fontSize: 14,
                      letterSpacing: "0.06em",
                      fontWeight: 500,
                      marginTop: 4,
                    }}
                  >
                    Vechtsport ondersteuning
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <Image
                  src="/branding/fightsupport/excel-logo.png"
                  width={340}
                  height={100}
                  alt="FightSupport"
                  priority
                  style={{ width: "auto", height: "84px", objectFit: "contain" }}
                />
              </div>

              <div className="flex items-center justify-center xl:justify-end">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/officials/controle")}
                  className="inline-flex items-center justify-center px-4 py-3 text-sm font-extrabold transition hover:-translate-y-[1px]"
                  style={{
                    minWidth: 210,
                    borderRadius: 8,
                    background:
                      "linear-gradient(180deg, rgba(250,250,250,0.98) 0%, rgba(226,229,233,0.98) 30%, rgba(195,198,203,0.98) 100%)",
                    color: "#1f2937",
                    border: "1px solid rgba(68,68,74,0.42)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -1px 0 rgba(0,0,0,0.10), 0 10px 18px rgba(0,0,0,0.18)",
                  }}
                >
                  ← Terug naar overzicht
                </button>
              </div>
            </div>

            <div
              className="mt-4 rounded-2xl p-3 md:p-4"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                <DarkActionButton
                  label={headerBusy === "excel" ? "Bezig..." : "Excel"}
                  tone="silver"
                  icon={<FileSpreadsheet className="h-4 w-4" />}
                  onClick={() => withHeaderBusy("excel", async () => openExcel())}
                  disabled={lineupMode || !!headerBusy}
                  title={lineupMode ? "Niet tijdens lineup bouwen." : undefined}
                />

                <DarkActionButton
                  label={headerBusy === "rapportage" ? "Bezig..." : "Rapportage"}
                  tone="silver"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() => withHeaderBusy("rapportage", async () => openRapportage())}
                  disabled={lineupMode || !!headerBusy}
                  title={lineupMode ? "Niet tijdens lineup bouwen." : undefined}
                />

                <DarkActionButton
                  label={headerBusy === "nkf" ? "Bezig..." : "NKF Excel"}
                  tone="silver"
                  icon={<FileSpreadsheet className="h-4 w-4" />}
                  onClick={() => withHeaderBusy("nkf", async () => openNkfExcel())}
                  disabled={lineupMode || !!headerBusy}
                  title={lineupMode ? "Niet tijdens lineup bouwen." : undefined}
                />

                <DarkActionButton
                  label={headerBusy === "controle" ? "Bezig..." : "Stuur naar controle"}
                  tone="orange"
                  icon={<ShieldCheck className="h-4 w-4" />}
                  onClick={stuurNaarControle}
                  disabled={lineupMode || !!headerBusy}
                  title={lineupMode ? "Sla eerst de lineup-volgorde op of annuleer." : undefined}
                />

                <DarkActionButton
                  label={headerBusy === "retour" ? "Bezig..." : "Retour naar matchmaker"}
                  tone="purple"
                  icon={<RotateCcw className="h-4 w-4" />}
                  onClick={retourNaarMatchmaker}
                  disabled={lineupMode || !!headerBusy}
                  title={lineupMode ? "Sla eerst de lineup-volgorde op of annuleer." : undefined}
                />

                <DarkActionButton
                  label={headerBusy === "admin" ? "Bezig..." : "Stuur upload naar admin"}
                  tone="blue"
                  icon={<Send className="h-4 w-4" />}
                  onClick={stuurUploadNaarAdmin}
                  disabled={lineupMode || !!headerBusy}
                  title={lineupMode ? "Sla eerst de lineup-volgorde op of annuleer." : undefined}
                />

                <DarkActionButton
                  label={headerBusy === "uitslagen" ? "Bezig..." : "Naar uitslagen"}
                  tone="green"
                  icon={<ArrowRightLeft className="h-4 w-4" />}
                  onClick={stuurNaarUitslagen}
                  disabled={lineupMode || !!headerBusy}
                  title={lineupMode ? "Sla eerst de lineup-volgorde op of annuleer." : undefined}
                />
              </div>
            </div>
          </div>

          <div className="pt-6">
            <div
              className={`${inter.className} text-center`}
              style={{
                color: NVB_ORANGE,
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Matchmaking controle
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <div
                className={inter.className}
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  letterSpacing: "0.02em",
                  color: "#1f1f23",
                  display: "inline-block",
                  padding: "12px 22px",
                  borderRadius: 0,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(242,242,242,0.96) 100%)",
                  border: "1px solid rgba(42,42,46,0.22)",
                  boxShadow: "0 12px 24px rgba(0,0,0,0.08)",
                }}
              >
                {safeText(subtitle, "Onbekend evenement")}
              </div>

              <button
                type="button"
                onClick={() => setShowAdd(true)}
                disabled={lineupMode}
                className={`${inter.className} px-5 py-3 text-[15px] font-extrabold tracking-[0.02em] text-white transition hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed`}
                style={{
                  background: "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)",
                  border: "1px solid rgba(150,40,0,0.55)",
                  borderRadius: 0,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 22px rgba(255,77,0,0.18)",
                  minWidth: 180,
                }}
                title={lineupMode ? "Niet tijdens lineup bouwen." : undefined}
              >
                Partij toevoegen
              </button>

              <button
                type="button"
                onClick={() => setShowWeegstationModal(true)}
                disabled={lineupMode || !!headerBusy}
                className="group inline-flex items-center gap-3 px-4 py-3 text-left transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderRadius: 0,
                  minWidth: 220,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(241,241,241,0.98) 100%)",
                  border: "1px solid rgba(35,35,40,0.16)",
                  boxShadow: "0 10px 22px rgba(0,0,0,0.10)",
                }}
              >
                <div
                  className="inline-flex h-10 w-10 items-center justify-center shrink-0"
                  style={{
                    borderRadius: 10,
                    background: "linear-gradient(180deg, #ff6a1a 0%, #ff4d00 100%)",
                    color: "#111",
                  }}
                >
                  <Scale className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-black text-zinc-900 group-hover:text-orange-700">
                    Weegstation
                  </div>
                  <div className="text-xs font-semibold text-zinc-600 leading-snug">
                    Stuur MM naar weegstation
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
              <div
                className="inline-flex items-center gap-3 rounded-full px-4 py-2"
                style={{
                  background: lineupMode
                    ? "linear-gradient(180deg, rgba(255,77,0,0.16) 0%, rgba(255,77,0,0.10) 100%)"
                    : "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(242,242,242,0.96) 100%)",
                  border: lineupMode
                    ? "1px solid rgba(255,77,0,0.45)"
                    : "1px solid rgba(42,42,46,0.20)",
                  boxShadow: "0 10px 22px rgba(0,0,0,0.07)",
                }}
              >
                <span className={`${inter.className} text-sm font-extrabold text-zinc-900`}>
                  Lineup bouwen
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (lineupMode) {
                      cancelLineupMode();
                    } else {
                      syncOrderedRowsFromRows(rows);
                      setLineupMode(true);
                    }
                  }}
                  aria-pressed={lineupMode}
                  className="relative h-8 w-16 rounded-full transition"
                  style={{
                    background: lineupMode
                      ? "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)"
                      : "linear-gradient(180deg, #d6d6d6 0%, #bababa 100%)",
                    border: lineupMode
                      ? "1px solid rgba(150,40,0,0.55)"
                      : "1px solid rgba(82,82,91,0.35)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.45), 0 6px 14px rgba(0,0,0,0.12)",
                  }}
                >
                  <span
                    className="absolute top-[3px] h-[24px] w-[24px] rounded-full transition-all"
                    style={{
                      left: lineupMode ? "36px" : "4px",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(226,226,226,0.96) 100%)",
                      border: "1px solid rgba(82,82,91,0.25)",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
                    }}
                  />
                </button>

                <span
                  className={`${inter.className} text-xs font-semibold ${
                    lineupMode ? "text-orange-700" : "text-zinc-600"
                  }`}
                >
                  {lineupMode ? "AAN" : "UIT"}
                </span>
              </div>

              {lineupMode ? (
                <>
                  <div
                    className={`${inter.className} rounded-xl px-4 py-2 text-sm font-semibold`}
                    style={{
                      background: "rgba(255,255,255,0.92)",
                      border: "1px solid rgba(255,77,0,0.22)",
                      color: "#7c2d12",
                    }}
                  >
                    Sleep partijen, gebruik pijltjes of wissel direct rood/blauw met
                    <span className="font-black"> Hoek wisselen</span>.
                  </div>

                  <button
                    type="button"
                    onClick={applyAutoLineup}
                    disabled={saveOrderBusy}
                    className={`${inter.className} px-5 py-3 text-[15px] font-extrabold tracking-[0.02em] text-zinc-900 transition hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={{
                      background: "linear-gradient(180deg, #f2f2f2 0%, #d5d5d5 48%, #bbbbbb 100%)",
                      border: "1px solid rgba(82,82,91,0.35)",
                      borderRadius: 0,
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.75), 0 10px 18px rgba(0,0,0,0.10)",
                      minWidth: 220,
                    }}
                  >
                    Automatisch sorteren
                  </button>

                  <button
                    type="button"
                    onClick={saveLineupOrder}
                    disabled={saveOrderBusy || !hasOrderChanges()}
                    className={`${inter.className} px-5 py-3 text-[15px] font-extrabold tracking-[0.02em] text-white transition hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={{
                      background: "linear-gradient(180deg, #1f7a35 0%, #15803d 55%, #166534 100%)",
                      border: "1px solid rgba(21,128,61,0.55)",
                      borderRadius: 0,
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 22px rgba(21,128,61,0.18)",
                      minWidth: 180,
                    }}
                  >
                    {saveOrderBusy ? "Opslaan..." : "Lineup opslaan"}
                  </button>

                  <button
                    type="button"
                    onClick={cancelLineupMode}
                    disabled={saveOrderBusy}
                    className={`${inter.className} px-5 py-3 text-[15px] font-extrabold tracking-[0.02em] text-zinc-900 transition hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={{
                      background: "linear-gradient(180deg, #f2f2f2 0%, #d5d5d5 48%, #bbbbbb 100%)",
                      border: "1px solid rgba(82,82,91,0.35)",
                      borderRadius: 0,
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.75), 0 10px 18px rgba(0,0,0,0.10)",
                      minWidth: 180,
                    }}
                  >
                    Annuleren
                  </button>
                </>
              ) : null}
            </div>

            <div
              className={inter.className}
              style={{
                marginTop: 12,
                textAlign: "center",
                fontSize: 12,
                color: "rgba(42,42,46,0.78)",
                letterSpacing: "0.06em",
              }}
            >
              {matchmakingId}
            </div>
          </div>

          <div className="my-4" style={separator} />

          <div
            className="rounded-3xl border-2 border-zinc-500/60 p-4 md:p-5 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50"
            style={silverBackplate}
          >
            {loading ? (
              <div className="text-zinc-700">Laden…</div>
            ) : error ? (
              <div className="text-red-700">{error}</div>
            ) : rows.length === 0 ? (
              <div className="text-zinc-700">Geen context gevonden (context nog niet gevuld?).</div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-zinc-800">
                    Partijen: <span className="text-zinc-900 font-semibold">{totals.totaal}</span>
                  </span>
                  <HeaderBadge label="Meldingen totaal" value={totals.meldingen_totaal} tone="white" />
                  <HeaderBadge label="Partijen met melding" value={totals.partijen_met_melding} tone="white" />
                  <HeaderBadge label="Verbod" value={totals.verbod} tone="purple" />
                  <HeaderBadge label="Geen licentie" value={totals.geen_licentie} tone="blue" />
                  <HeaderBadge label="Afkeur" value={totals.afk} tone="red" />
                  <HeaderBadge label="Dispensatie" value={totals.dispensatie} tone="orange" />
                  <HeaderBadge label="Actie" value={totals.actie} tone="yellow" />
                  <HeaderBadge label="OK" value={totals.ok} tone="green" />
                  <HeaderBadge label="Geen info" value={totals.geen} tone="white" />
                </div>

                {galaDuur?.text ? (
                  <div className="rounded-xl border border-zinc-300 bg-white/80 p-3 text-sm text-zinc-800">
                    <div>
                      <span className="font-semibold text-zinc-900">Gala duur:</span>{" "}
                      <span>{galaDuur.text}</span>
                    </div>

                    {galaDuurCalc?.countsByKlasse &&
                    Object.keys(galaDuurCalc.countsByKlasse).length > 0 ? (
                      <div className="mt-2 text-xs text-zinc-700">
                        {Object.entries(galaDuurCalc.countsByKlasse)
                          .map(([klasse, count]) => {
                            const mins = matchKlasseMinuten(klasse) ?? 0;
                            return `${klasse}: ${count} × ${mins} min = ${count * mins} min`;
                          })
                          .join(" • ")}
                      </div>
                    ) : null}

                    {galaDuurCalc?.unknownKlasses?.length ? (
                      <div className="mt-2 text-xs text-red-700">
                        Onbekende klasses in duur-berekening:{" "}
                        {galaDuurCalc.unknownKlasses.join(", ")}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {compactRunMeldingen.length > 0 && (
                  <div
                    className="mt-3 rounded-xl bg-white p-0 overflow-hidden"
                    style={{
                      border: "3px solid #2b2b2b",
                      boxShadow:
                        "0 12px 26px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.65)",
                    }}
                  >
                    <div
                      className="px-4 py-3 font-extrabold text-white"
                      style={{
                        background: "linear-gradient(180deg, #2a2a2e 0%, #1f1f23 100%)",
                        borderBottom: "2px solid rgba(255,77,0,0.50)",
                      }}
                    >
                      Run meldingen
                    </div>
                    <div className="p-4">
                      <div className="mt-1 space-y-2 text-sm">
                        {compactRunMeldingen.map((r, i) => (
                          <div
                            key={`${r.rule_code ?? "run"}-${i}`}
                            className="rounded-md bg-white p-3"
                            style={{
                              border: "2px solid rgba(43,43,43,0.35)",
                              boxShadow:
                                "inset 0 1px 0 rgba(255,255,255,0.70), 0 10px 18px rgba(0,0,0,0.05)",
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <div className="min-w-0">
                                <div className="text-zinc-900 font-semibold leading-tight">
                                  {r.rule ?? "(run)"}
                                  {r.rule_code ? (
                                    <span className="ml-2 text-xs text-zinc-600 font-semibold">
                                      ({r.rule_code})
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <span className="ml-auto text-xs font-extrabold tracking-wide text-zinc-700">
                                {displayResultaatLabel(r)}
                              </span>
                            </div>
                            {r.boodschap ? (
                              <div className="mt-1 text-zinc-700 leading-snug">{r.boodschap}</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {msg ? <div className="text-sm text-zinc-700">{msg}</div> : null}

                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-300 bg-white/5 p-3">
                  <div className="text-sm font-semibold text-zinc-800 mr-2">Filter:</div>

                  <div className="flex-1 min-w-[220px]">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      disabled={lineupMode}
                      placeholder="Zoek op naam, sportschool of VA…"
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:text-zinc-500 disabled:opacity-50"
                      style={{
                        background: "linear-gradient(180deg, #ffffff 0%, #f4f6f9 100%)",
                        border: "2px solid rgba(63,63,70,0.35)",
                        color: "#111827",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.90), 0 8px 18px rgba(0,0,0,0.10)",
                      }}
                    />
                  </div>

                  <FilterButton label="Alle" count={filterCounts.all} tone="neutral" active={filter === "all"} onClick={() => setFilter("all")} disabled={lineupMode} />
                  <FilterButton label="Verbod" count={filterCounts.verbod} tone="purple" active={filter === "verbod"} onClick={() => setFilter("verbod")} disabled={lineupMode} />
                  <FilterButton label="Geen licentie" count={filterCounts.geen_licentie} tone="blue" active={filter === "geen_licentie"} onClick={() => setFilter("geen_licentie")} disabled={lineupMode} />
                  <FilterButton label="Afkeur" count={filterCounts.afgekeurd} tone="red" active={filter === "afgekeurd"} onClick={() => setFilter("afgekeurd")} disabled={lineupMode} />
                  <FilterButton label="Dispensatie" count={filterCounts.dispensatie} tone="orange" active={filter === "dispensatie"} onClick={() => setFilter("dispensatie")} disabled={lineupMode} />
                  <FilterButton label="Actie" count={filterCounts.actie} tone="yellow" active={filter === "actie"} onClick={() => setFilter("actie")} disabled={lineupMode} />
                  <FilterButton label="OK" count={filterCounts.ok} tone="green" active={filter === "ok"} onClick={() => setFilter("ok")} disabled={lineupMode} />
                  <FilterButton label="Geen info" count={filterCounts.geen_info} tone="white" active={filter === "geen_info"} onClick={() => setFilter("geen_info")} disabled={lineupMode} />

                  <div className="ml-auto text-xs text-zinc-600">
                    Toon: <span className="font-semibold text-zinc-900">{filteredRows.length}</span>
                  </div>
                </div>

                <div className="overflow-auto rounded-xl border border-zinc-300">
                  <table className="min-w-full border-collapse">
                    <thead
                      style={{
                        background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                        color: "#fff",
                        borderBottom: "3px solid rgba(255,77,0,0.55)",
                      }}
                    >
                      <tr>
                        <th className="py-3 px-4 text-left w-40">#</th>
                        <th className="py-3 px-4 text-left">Vechters</th>
                        <th className="py-3 px-4 text-left w-[320px]">Info</th>
                        <th className="py-3 px-4 text-left w-[420px]">Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r, i) => {
                        const zebraWhite = i % 2 === 0;
                        const roodNaam = safeText(r.rood_naam_fp ?? r.rood_naam_mm ?? r.rood_naam, "-");
                        const blauwNaam = safeText(r.blauw_naam_fp ?? r.blauw_naam_mm ?? r.blauw_naam, "-");
                        const roodGym = safeText(r.rood_gym_mm ?? r.rood_gym_fp ?? r.rood_gym, "-");
                        const blauwGym = safeText(r.blauw_gym_mm ?? r.blauw_gym_fp ?? r.blauw_gym, "-");
                        const roodVA = safeText(r.rood_va_mm ?? r.va_rood, "-");
                        const blauwVA = safeText(r.blauw_va_mm ?? r.va_blauw, "-");
                        const roodAge = ageAtEvent(r, "rood");
                        const blauwAge = ageAtEvent(r, "blauw");

                        const originalPn = Number(r.partij_nr);
                        const visualPn = getVisualPartijNr(r, i);
                        const status = Number.isFinite(originalPn)
                          ? statusByPartij[originalPn] ?? "geen_info"
                          : "geen_info";

                        const discipline = safeText(r.discipline, "-");
                        const klasse = safeText(r.klasse_mm ?? r.klasse, "-");
                        const eventDatum = safeText(r.evenement_datum, "-");
                        const sortWeight = getBoutWeightForSort(r);
                        const dividerClass = zebraWhite
                          ? "border-t border-gray-400/70"
                          : "border-t border-zinc-300";
                        const heeftVerbod = Number.isFinite(originalPn)
                          ? !!verbodByPartij[originalPn]
                          : false;
                        const geenTegenstander = isGeenTegenstander(r);
                        const busy = Number.isFinite(originalPn) ? busyPartij[originalPn] : null;

                        const stableId = getStableRowKey(r);
                        const currentIndex = orderedRows.findIndex(
                          (x) => getStableRowKey(x) === stableId
                        );

                        return (
                          <tr
                            key={stableId}
                            draggable={lineupMode}
                            onDragStart={() => {
                              if (!lineupMode) return;
                              setDragId(stableId);
                            }}
                            onDragOver={(e) => {
                              if (!lineupMode) return;
                              e.preventDefault();
                            }}
                            onDrop={(e) => {
                              if (!lineupMode || !dragId) return;
                              e.preventDefault();
                              const fromIndex = orderedRows.findIndex(
                                (x) => getStableRowKey(x) === dragId
                              );
                              const toIndex = orderedRows.findIndex(
                                (x) => getStableRowKey(x) === stableId
                              );
                              if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
                                setOrderedRows((prev) => arrayMove(prev, fromIndex, toIndex));
                              }
                              setDragId(null);
                            }}
                            onDragEnd={() => setDragId(null)}
                            style={{
                              backgroundColor: zebraWhite ? "#ffffff" : "#0d0d0d",
                              color: zebraWhite ? "#000" : "#fff",
                              cursor: lineupMode ? "grab" : "default",
                              outline:
                                lineupMode && dragId === stableId
                                  ? "2px solid rgba(255,77,0,0.55)"
                                  : "none",
                            }}
                          >
                            <td className="py-3 px-4 font-semibold align-top">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="tabular-nums">{visualPn}</span>

                                  {lineupMode &&
                                  Number.isFinite(originalPn) &&
                                  originalPn !== visualPn ? (
                                    <span
                                      className="px-2 py-1 rounded text-[10px] font-extrabold"
                                      style={{
                                        background: zebraWhite
                                          ? "rgba(255,77,0,0.10)"
                                          : "rgba(255,255,255,0.12)",
                                        color: zebraWhite ? "#c2410c" : "#ffd0be",
                                        border: zebraWhite
                                          ? "1px solid rgba(255,77,0,0.22)"
                                          : "1px solid rgba(255,255,255,0.18)",
                                      }}
                                    >
                                      was {originalPn}
                                    </span>
                                  ) : null}

                                  {!!r?.__swapped_corners ? (
                                    <Chip label="HOEKEN GEWISSELD" tone="orange" />
                                  ) : null}

                                  <StatusBadge status={status} />
                                  {heeftVerbod ? <Chip label="VERBOD" tone="purple" /> : null}
                                  {Number.isFinite(originalPn) &&
                                  missingLicentieByPartij[originalPn] ? (
                                    <Chip label="GEEN LICENTIE" tone="blue" />
                                  ) : null}
                                </div>

                                {lineupMode ? (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        currentIndex >= 0 && movePartij(currentIndex, currentIndex - 1)
                                      }
                                      disabled={currentIndex <= 0}
                                      className="px-2 py-1 rounded text-xs font-extrabold disabled:opacity-40"
                                      style={{
                                        background: zebraWhite
                                          ? "linear-gradient(180deg, #f4f4f4 0%, #dadada 100%)"
                                          : "linear-gradient(180deg, #2c2c31 0%, #1f1f23 100%)",
                                        border: zebraWhite
                                          ? "1px solid rgba(82,82,91,0.35)"
                                          : "1px solid rgba(255,255,255,0.10)",
                                        color: zebraWhite ? "#111827" : "#fff",
                                      }}
                                    >
                                      ↑
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        currentIndex >= 0 && movePartij(currentIndex, currentIndex + 1)
                                      }
                                      disabled={
                                        currentIndex < 0 || currentIndex >= orderedRows.length - 1
                                      }
                                      className="px-2 py-1 rounded text-xs font-extrabold disabled:opacity-40"
                                      style={{
                                        background: zebraWhite
                                          ? "linear-gradient(180deg, #f4f4f4 0%, #dadada 100%)"
                                          : "linear-gradient(180deg, #2c2c31 0%, #1f1f23 100%)",
                                        border: zebraWhite
                                          ? "1px solid rgba(82,82,91,0.35)"
                                          : "1px solid rgba(255,255,255,0.10)",
                                        color: zebraWhite ? "#111827" : "#fff",
                                      }}
                                    >
                                      ↓
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => currentIndex >= 0 && swapPartijCorners(currentIndex)}
                                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded text-[11px] font-extrabold"
                                      style={{
                                        background: zebraWhite
                                          ? "linear-gradient(180deg, #fff5ef 0%, #ffe7d8 100%)"
                                          : "linear-gradient(180deg, #4a2c1f 0%, #2e1a12 100%)",
                                        border: zebraWhite
                                          ? "1px solid rgba(255,77,0,0.30)"
                                          : "1px solid rgba(255,184,158,0.22)",
                                        color: zebraWhite ? "#9a3412" : "#ffd0be",
                                      }}
                                    >
                                      <Repeat className="h-3.5 w-3.5" />
                                      Hoek wisselen
                                    </button>

                                    <span
                                      className="text-[11px] font-bold opacity-80"
                                      style={{ letterSpacing: "0.04em" }}
                                    >
                                      SLEEP
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                            </td>

                            <td className="py-3 px-4 align-top">
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className="inline-block w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: "#ef4444" }}
                                />
                                <div className="min-w-0 text-sm">
                                  <span className="font-semibold">{roodNaam}</span>{" "}
                                  <span className="opacity-80">({roodAge} jaar)</span>{" "}
                                  <span className="opacity-80">• {roodGym}</span>{" "}
                                  <span className="opacity-80">• FP/VA: {roodVA}</span>
                                </div>
                              </div>

                              <div className={`my-2 ${dividerClass}`} />

                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className="inline-block w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: "#3b82f6" }}
                                />
                                <div className="min-w-0 text-sm">
                                  <span className="font-semibold">{blauwNaam}</span>{" "}
                                  <span className="opacity-80">({blauwAge} jaar)</span>{" "}
                                  <span className="opacity-80">• {blauwGym}</span>{" "}
                                  <span className="opacity-80">• FP/VA: {blauwVA}</span>
                                </div>
                              </div>

                              {geenTegenstander ? (
                                <div className="mt-2 text-xs font-extrabold">
                                  <span className="px-2 py-1 rounded bg-red-500 text-zinc-900">
                                    GEEN TEGENSTANDER
                                  </span>
                                </div>
                              ) : null}
                            </td>

                            <td className="py-3 px-4 align-top">
                              <div className="space-y-1 text-sm">
                                <div>
                                  <span className="font-semibold">Discipline:</span>{" "}
                                  <span className="opacity-90">{discipline}</span>
                                </div>
                                <div>
                                  <span className="font-semibold">Klasse:</span>{" "}
                                  <span className="opacity-90">{klasse}</span>
                                </div>
                                <div>
                                  <span className="font-semibold">Klasse duur:</span>{" "}
                                  <span className="opacity-90">
                                    {matchKlasseMinuten(klasse, discipline) != null
                                      ? `${matchKlasseMinuten(klasse, discipline)} min`
                                      : "-"}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-semibold">Sorteergewicht:</span>{" "}
                                  <span className="opacity-90">
                                    {Number.isFinite(sortWeight) && sortWeight !== 999
                                      ? `${sortWeight} kg`
                                      : "-"}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-semibold">Event datum:</span>{" "}
                                  <span className="opacity-90">{eventDatum}</span>
                                </div>
                                <div>
                                  <span className="font-semibold">Meldingen:</span>{" "}
                                  <span className="opacity-90">
                                    {Number.isFinite(originalPn) ? countByPartij[originalPn] ?? 0 : 0}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 align-top">
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`/dashboard/officials/controle/${encodeURIComponent(
                                    matchmakingId
                                  )}/${encodeURIComponent(String(r.partij_nr ?? ""))}`}
                                  className="px-3 py-1.5 rounded font-extrabold text-sm"
                                  style={{
                                    background: "rgba(0,0,0,0.55)",
                                    border: `1px solid rgba(255,77,0,0.85)`,
                                    color: "rgba(255,210,190,0.95)",
                                    pointerEvents: lineupMode ? "none" : "auto",
                                    opacity: lineupMode ? 0.45 : 1,
                                  }}
                                  title={lineupMode ? "Niet tijdens lineup bouwen." : undefined}
                                >
                                  Detail
                                </Link>

                                <DarkActionButton
                                  label={busy === "delete" ? "… Verwijderen" : "Verwijderen"}
                                  tone="red"
                                  disabled={busy === "delete" || lineupMode}
                                  title={lineupMode ? "Niet tijdens lineup bouwen." : undefined}
                                  onClick={() =>
                                    Number.isFinite(originalPn) &&
                                    deletePartij(originalPn, getBoutIdForReorder(r))
                                  }
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 text-xs text-zinc-500 text-center">© FightSupport</div>
              </div>
            )}
          </div>

          {showWeegstationModal && (
            <div className="fixed inset-0 z-[998] flex items-center justify-center px-4">
              <button
                type="button"
                aria-label="Sluit bevestiging"
                className="absolute inset-0"
                style={{ background: "rgba(0,0,0,0.62)" }}
                onClick={() => setShowWeegstationModal(false)}
              />

              <div
                className="relative w-full max-w-[620px] overflow-hidden rounded-[26px]"
                style={{
                  ...metalFrameStyle("orange"),
                  borderRadius: 26,
                  boxShadow:
                    "0 30px 80px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.12)",
                }}
              >
                <div style={metalInnerStyle()} className="m-3 rounded-[20px] p-5 md:p-6">
                  <div
                    className="rounded-[18px] px-5 py-4 text-white"
                    style={{
                      background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                      border: "2px solid rgba(63,63,70,0.45)",
                      boxShadow: "0 16px 32px rgba(0,0,0,0.18)",
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                        style={{
                          background: "linear-gradient(180deg, #ff6a1a 0%, #ff4d00 100%)",
                          color: "#111",
                          boxShadow: "0 12px 24px rgba(255,77,0,0.28)",
                        }}
                      >
                        <Scale className="h-7 w-7" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className={inter.className}
                          style={{
                            color: NVB_ORANGE,
                            fontSize: 14,
                            fontWeight: 800,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                          }}
                        >
                          Weegstation bevestiging
                        </div>
                        <h2 className="mt-2 text-2xl font-black text-white md:text-[30px]">
                          Wil je nu naar het weegstation?
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-white/80 md:text-[15px]">
                          De matchmaking is doorgestuurd. Je kunt direct verdergaan naar het
                          weegstation, of op deze pagina blijven.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setShowWeegstationModal(false)}
                      className="rounded-xl px-4 py-3 text-sm font-extrabold transition hover:-translate-y-0.5"
                      style={{
                        background: "linear-gradient(180deg, #f5f5f5 0%, #d7d7d7 100%)",
                        color: "#111827",
                        border: "2px solid rgba(63,63,70,0.30)",
                        boxShadow: "0 10px 22px rgba(0,0,0,0.10)",
                      }}
                    >
                      Op pagina blijven
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowWeegstationModal(false);
                        router.push(`/dashboard/officials/weegstation/${matchmakingId}`);
                      }}
                      className="rounded-xl px-4 py-3 text-sm font-extrabold transition hover:-translate-y-0.5"
                      style={{
                        background: "linear-gradient(180deg, #ff6a1a 0%, #ff4d00 100%)",
                        color: "#111",
                        border: "2px solid rgba(0,0,0,0.18)",
                        boxShadow: "0 12px 24px rgba(255,77,0,0.28)",
                      }}
                    >
                      Ja, naar weegstation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showAdd && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
              <div
                className="absolute inset-0"
                style={{ background: "rgba(0,0,0,0.65)" }}
                onClick={() => !addBusy && setShowAdd(false)}
              />
              <div className="relative w-full max-w-[980px] rounded-2xl border-[3px] border-zinc-700/40 bg-white shadow-2xl overflow-hidden">
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{
                    background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                    borderBottom: "3px solid rgba(255,77,0,0.55)",
                  }}
                >
                  <div>
                    <div className="text-white font-extrabold text-lg">Partij toevoegen</div>
                    <div className="text-white/75 text-xs">
                      Discipline / klasse + rood vs blauw (VA nummers als tekst) + max gewicht
                    </div>
                  </div>
                  <button
                    className="text-white/70 hover:text-white font-bold"
                    onClick={() => !addBusy && setShowAdd(false)}
                  >
                    ✕
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {error ? <div className="text-red-700 text-sm">{error}</div> : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field
                      label="Discipline"
                      value={fDiscipline}
                      onChange={setFDiscipline}
                      placeholder="Kickboksen / Muay Thai / MMA..."
                    />
                    <Field
                      label="Klasse"
                      value={fKlasse}
                      onChange={setFKlasse}
                      placeholder="N / C / B / A..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border-2 border-zinc-300 bg-white p-4">
                      <div className="text-zinc-900 font-extrabold mb-3">Rood</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="Naam rood" value={fRoodNaam} onChange={setFRoodNaam} />
                        <Field label="Sportschool rood" value={fRoodGym} onChange={setFRoodGym} />
                        <Field
                          label="VA nummer rood"
                          value={fRoodVa}
                          onChange={setFRoodVa}
                          placeholder="tekst"
                        />
                        <Field
                          label="KG rood"
                          value={fRoodKg}
                          onChange={setFRoodKg}
                          type="number"
                          placeholder="bijv. 71.5"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border-2 border-zinc-300 bg-white p-4">
                      <div className="text-zinc-900 font-extrabold mb-3">Blauw</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="Naam blauw" value={fBlauwNaam} onChange={setFBlauwNaam} />
                        <Field
                          label="Sportschool blauw"
                          value={fBlauwGym}
                          onChange={setFBlauwGym}
                        />
                        <Field
                          label="VA nummer blauw"
                          value={fBlauwVa}
                          onChange={setFBlauwVa}
                          placeholder="tekst"
                        />
                        <Field
                          label="KG blauw"
                          value={fBlauwKg}
                          onChange={setFBlauwKg}
                          type="number"
                          placeholder="bijv. 71.5"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field
                      label="Max gewicht (KG)"
                      value={fMaxKg}
                      onChange={setFMaxKg}
                      type="number"
                      placeholder="bijv. 72.0"
                    />
                    <div className="md:col-span-2 text-xs text-zinc-700 flex items-center">
                      Tip: als je "max gewicht" als tolerantie bedoelt (bv 3kg), zeg het even —
                      dan maak ik er 2 velden van: "gewichtsklasse" + "max afwijking".
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-zinc-300 flex items-center justify-end gap-3">
                  <NvbLightButton
                    label="Annuleren"
                    onClick={() => !addBusy && setShowAdd(false)}
                  />
                  <NvbDarkButton
                    label={addBusy ? "Bezig..." : "Partij toevoegen"}
                    onClick={addPartijSubmit}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}