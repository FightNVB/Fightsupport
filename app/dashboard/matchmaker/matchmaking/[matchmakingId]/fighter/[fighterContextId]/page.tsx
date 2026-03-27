"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Inter, Bebas_Neue } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";
import VsBadge from "@/components/VsBadge";

type AnyRow = Record<string, any>;

type FighterContext = {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  matchmaking_id: string | null;
  inschrijving_id: string | null;
  row_nr: number | null;

  discipline: string | null;
  klasse: string | null;
  geslacht: string | null;
  voornaam: string | null;
  achternaam: string | null;
  naam_input: string | null;
  gym_input: string | null;
  geboortedatum_input: string | null;
  gewicht: number | null;
  va_nummer: string | null;

  fp_naam: string | null;
  fp_geboortedatum: string | null;
  fp_gym: string | null;
  fp_klasse: string | null;

  record_w: number | null;
  record_l: number | null;
  record_d: number | null;

  naam_match: boolean | null;
  geboortedatum_match: boolean | null;
  gym_match: boolean | null;

  uitslagen_count: number | null;
  laatste_partij_datum: string | null;

  nulmeting_opmerking: string | null;
  heeft_keurmerk: string | boolean | null;
  extra: any | null;

  naam?: string | null;
  geboortedatum?: string | null;
  licentie?: string | null;
  heeft_startverbod?: string | null;
  totaal_wedstrijden?: number | null;
  gewonnen?: number | null;
  nulmeting_totaal?: number | null;
  nulmeting_klasse?: string | null;
  scraped_at?: string | null;
  event_id?: string | null;
  event_datum?: string | null;
  evenement_datum?: string | null;
  evenement_naam?: string | null;

  [key: string]: any;
};

type InschrijvingRow = {
  id: string;
  matchmaking_id: string | null;
  row_nr: number | null;
  email: string | null;
  trainer_naam: string | null;
  telefoon: string | null;
  voornaam?: string | null;
  achternaam?: string | null;
  naam_input?: string | null;
  va_nummer?: string | null;
};

type DisplayUitslag = {
  datum: string;
  tegenstander: string;
  event: string;
  discipline: string;
  klasse: string;
  uitslag: string;
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
});

const NVB_ORANGE = "#ff4d00";
const BLUE = "#2563eb";
const RED = "#ef4444";

// --------------------------------------------------
// utils
// --------------------------------------------------
function isUuidLike(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v ?? "").trim()
  );
}

function safeJson(input: any): any {
  if (input == null) return null;
  if (typeof input === "object") return input;
  if (typeof input !== "string") return input;
  const s = input.trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return input;
  }
}

function isEmptyValue(v: any) {
  return (
    v == null ||
    v === "" ||
    String(v).trim() === "" ||
    String(v).trim().toLowerCase() === "null" ||
    String(v).trim().toLowerCase() === "undefined"
  );
}

function firstFilled(...values: any[]) {
  for (const v of values) {
    if (!isEmptyValue(v)) return v;
  }
  return null;
}

function asYes(v: any): boolean {
  if (v == null) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  const s = String(v).trim().toLowerCase();
  return ["1", "true", "ja", "yes", "y", "geldig", "ok"].includes(s);
}

function norm(s: any) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s/-]/gu, "");
}

function fmtDate(v: any): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("nl-NL");
}

function fmtDateISO(v: any): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toISOString().slice(0, 10);
}

function fmtDateTime(v: any): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("nl-NL");
}

function fmtKg(v: any): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `${n.toFixed(1)} KG`.replace(".0", "");
}

function fmtNum(v: any): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return String(n);
}

function parseDateOnly(v: any): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function compareDatesOnOrAfter(left: any, right: any): boolean | null {
  const a = parseDateOnly(left);
  const b = parseDateOnly(right);
  if (!a || !b) return null;
  return a.getTime() >= b.getTime();
}

function calcAgeYearsOnDate(eventDate: Date, birthDate: Date): number | null {
  let years = eventDate.getFullYear() - birthDate.getFullYear();
  const m = eventDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && eventDate.getDate() < birthDate.getDate())) years -= 1;
  if (years < 0 || !Number.isFinite(years)) return null;
  return years;
}

function valueToSingleLine(v: any): string {
  const parsed = safeJson(v);

  if (parsed == null) return "—";
  if (typeof parsed === "string") return parsed.trim() || "—";
  if (typeof parsed === "number" || typeof parsed === "boolean") return String(parsed);

  if (Array.isArray(parsed)) {
    const parts = parsed
      .flatMap((item) => {
        if (item == null) return [];
        if (typeof item === "string") return [item.trim()];
        if (typeof item === "number" || typeof item === "boolean") return [String(item)];
        if (typeof item === "object") {
          return Object.entries(item).map(([k, val]) => `${k}: ${valueToSingleLine(val)}`);
        }
        return [String(item)];
      })
      .filter(Boolean);

    return parts.join(" • ") || "—";
  }

  if (typeof parsed === "object") {
    const parts = Object.entries(parsed)
      .map(([k, val]) => `${k}: ${valueToSingleLine(val)}`)
      .filter(Boolean);

    return parts.join(" • ") || "—";
  }

  return String(parsed);
}

function valueToLines(value: any): string[] {
  const parsed = safeJson(value);
  if (parsed == null) return [];

  if (Array.isArray(parsed)) {
    return parsed
      .flatMap((item) => {
        if (item == null) return [];
        if (typeof item === "string") return [item.trim()];
        if (typeof item === "number" || typeof item === "boolean") return [String(item)];
        if (typeof item === "object") return [valueToSingleLine(item)];
        return [String(item)];
      })
      .filter(Boolean);
  }

  if (typeof parsed === "string") {
    return parsed
      .split(/\n+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  if (typeof parsed === "object") {
    return Object.entries(parsed)
      .map(([k, v]) => `${k}: ${valueToSingleLine(v)}`)
      .filter(Boolean);
  }

  return [String(parsed)];
}

function getExtraValue(extra: any, keys: string[]) {
  const obj = safeJson(extra);
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;

  for (const [rawKey, rawValue] of Object.entries(obj)) {
    const nk = norm(rawKey).replace(/[_-]/g, " ");
    for (const wanted of keys) {
      const nw = norm(wanted).replace(/[_-]/g, " ");
      if (nk === nw || nk.includes(nw) || nw.includes(nk)) {
        return rawValue;
      }
    }
  }

  return null;
}

function normalizeLicentie(v: any): "ja" | "nee" {
  if (v === true) return "ja";
  if (v === false) return "nee";
  const s = String(v ?? "").trim().toLowerCase();
  if (["ja", "yes", "true", "1", "ok", "geldig"].includes(s)) return "ja";
  return "nee";
}

function normalizeStartverbod(v: any): "ja" | "nee" {
  if (v === true) return "ja";
  if (v === false) return "nee";
  const s = String(v ?? "").trim().toLowerCase();
  if (["ja", "yes", "true", "1"].includes(s)) return "ja";
  return "nee";
}

function pickUitslagColumns(row: AnyRow): DisplayUitslag {
  const datum = firstFilled(row.datum, row.partij_datum, row.event_datum, row.date);

  const tegenstander = firstFilled(
    row.tegenstander,
    row.opponent,
    row.naam_tegenstander,
    row.tegenstander_naam,
    row.opp_name,
    row.opponent_name,
    row.naam_tegenpartij,
    row.tegenpartij,
    [row.tegenstander_voornaam, row.tegenstander_achternaam].filter(Boolean).join(" ")
  );

  const event = firstFilled(
    row.event,
    row.event_naam,
    row.evenement,
    row.evenement_naam,
    row.organisatie,
    row.organizer
  );

  const discipline = firstFilled(row.discipline, row.sport, row.style);
  const klasse = firstFilled(row.klasse, row.class, row.categorie);
  const uitslag = firstFilled(row.uitslag, row.resultaat, row.wijze, row.result);

  return {
    datum: datum ? fmtDateISO(datum) : "—",
    tegenstander: String(tegenstander ?? "—"),
    event: String(event ?? "—"),
    discipline: String(discipline ?? "—"),
    klasse: String(klasse ?? "—"),
    uitslag: String(uitslag ?? "—"),
  };
}

function normalizeRuleToken(v: any): string {
  return String(v ?? "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\(|\)/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatMinutesToClock(minutes: number | null): string | null {
  if (minutes == null || !Number.isFinite(minutes)) return null;
  const totalSeconds = Math.round(minutes * 60);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function parseClassToken(v: any): string {
  return normalizeRuleToken(v).replace("klasse", "").replace(/\s+/g, " ").trim();
}

function getKickThaiWeightClass(weightValue: number | null): string | null {
  if (weightValue == null || !Number.isFinite(weightValue)) return null;

  if (weightValue <= 51) return "-51 kg";
  if (weightValue <= 54) return "-54 kg";
  if (weightValue <= 57) return "-57 kg";
  if (weightValue <= 60) return "-60 kg";
  if (weightValue <= 63.5) return "-63.5 kg";
  if (weightValue <= 67) return "-67 kg";
  if (weightValue <= 71) return "-71 kg";
  if (weightValue <= 75) return "-75 kg";
  if (weightValue <= 81) return "-81 kg";
  if (weightValue <= 86) return "-86 kg";
  if (weightValue <= 91) return "-91 kg";
  return "+91 kg";
}

function getMmaWeightClass(weightValue: number | null, isPro: boolean): string | null {
  if (weightValue == null || !Number.isFinite(weightValue)) return null;

  if (weightValue <= 52.2) return "Strawweight";
  if (weightValue <= 56.7) return "Flyweight";
  if (weightValue <= 61.2) return "Bantamweight";
  if (weightValue <= 65.8) return "Featherweight";
  if (weightValue <= 70.3) return "Lightweight";
  if (!isPro && weightValue <= 74.8) return "Super lightweight";
  if (weightValue <= 77.1) return "Welterweight";
  if (!isPro && weightValue <= 79.4) return "Super welterweight";
  if (weightValue <= 83.9) return "Middleweight";
  if (!isPro && weightValue <= 88.5) return "Super middleweight";
  if (weightValue <= 93.0) return "Light heavyweight";
  if (!isPro && weightValue <= 102.1) return "Cruiserweight";
  if (weightValue <= 120.2) return "Heavyweight";
  return "Super heavyweight";
}

function wedstrijddetailsFromCtx(ctx: FighterContext | null | undefined): {
  rondeTijd: string | null;
  format: string | null;
  rustTijd: string | null;
  gewichtsklasse: string | null;
} {
  if (!ctx) return { rondeTijd: null, format: null, rustTijd: null, gewichtsklasse: null };

  const discipline = normalizeRuleToken(ctx?.discipline);
  const klasseRaw = parseClassToken(ctx?.klasse);

  const eventDate = parseDateOnly(
    firstFilled(
      ctx?.event_datum,
      ctx?.evenement_datum,
      getExtraValue(ctx?.extra, ["event_datum", "evenement_datum"])
    )
  );
  const birthDate = parseDateOnly(
    firstFilled(ctx?.fp_geboortedatum, ctx?.geboortedatum_input, ctx?.geboortedatum)
  );
  const leeftijd = eventDate && birthDate ? calcAgeYearsOnDate(eventDate, birthDate) : null;

  const isMma = discipline.includes("mma");
  const isThaibox = discipline.includes("thai");
  const isKickbox =
    discipline.includes("kickboksen") ||
    discipline.includes("kickboxing") ||
    (!isMma && !isThaibox);

  const extraParsed = safeJson(ctx?.extra);
  const maxGewichtRaw = firstFilled(
    getExtraValue(extraParsed, [
      "max_gewicht",
      "max gewicht",
      "gewichtsklasse",
      "gewicht klasse",
      "klasse_mm",
    ]),
    ctx?.gewicht
  );
  const numericWeight = Number(maxGewichtRaw);
  const useWeight = Number.isFinite(numericWeight) ? numericWeight : Number(ctx?.gewicht);

  const explicitGewichtsklasse = firstFilled(
    getExtraValue(extraParsed, ["gewichtsklasse", "gewicht klasse", "weight class"]),
    getExtraValue(extraParsed, ["klasse_mm"])
  );

  const isJeugd =
    klasseRaw === "j" ||
    klasseRaw === "j+" ||
    klasseRaw.includes("jeugd") ||
    klasseRaw.includes("junior") ||
    klasseRaw.includes("jr") ||
    (leeftijd != null && leeftijd < 18);

  if (isMma) {
    const mmaLevelRaw = normalizeRuleToken(
      firstFilled(
        getExtraValue(extraParsed, ["mma level", "mma_niveau", "niveau", "level", "pro_status"]),
        "amateur"
      )
    );

    const isPro =
      mmaLevelRaw.includes("pro") ||
      mmaLevelRaw.includes("professional") ||
      mmaLevelRaw.includes("professioneel");

    return {
      rondeTijd: isPro ? "5:00" : "3:00",
      format: isPro ? "3 x 5:00" : "3 x 3:00",
      rustTijd: "1:00",
      gewichtsklasse:
        String(explicitGewichtsklasse ?? "").trim() ||
        getMmaWeightClass(Number.isFinite(useWeight) ? useWeight : null, isPro),
    };
  }

  if (isKickbox || isThaibox) {
    const klasse = klasseRaw.toUpperCase();

    if (klasse === "D") {
      return {
        rondeTijd: "1:00",
        format: "2 x 1:00",
        rustTijd: "0:30",
        gewichtsklasse:
          String(explicitGewichtsklasse ?? "").trim() ||
          getKickThaiWeightClass(Number.isFinite(useWeight) ? useWeight : null),
      };
    }

    if (isJeugd || klasse === "J" || klasse === "J+") {
      const youthRound = leeftijd != null && leeftijd >= 16 ? "1:30" : "1:00";
      const youthRest = leeftijd != null && leeftijd >= 16 ? "0:45" : "0:30";

      return {
        rondeTijd: youthRound,
        format: `3 x ${youthRound}`,
        rustTijd: youthRest,
        gewichtsklasse:
          String(explicitGewichtsklasse ?? "").trim() ||
          getKickThaiWeightClass(Number.isFinite(useWeight) ? useWeight : null),
      };
    }

    if (klasse === "R") {
      return {
        rondeTijd: "1:00",
        format: "3 x 1:00",
        rustTijd: "1:00",
        gewichtsklasse:
          String(explicitGewichtsklasse ?? "").trim() ||
          getKickThaiWeightClass(Number.isFinite(useWeight) ? useWeight : null),
      };
    }

    if (klasse === "N") {
      return {
        rondeTijd: "1:30",
        format: "3 x 1:30",
        rustTijd: "0:45",
        gewichtsklasse:
          String(explicitGewichtsklasse ?? "").trim() ||
          getKickThaiWeightClass(Number.isFinite(useWeight) ? useWeight : null),
      };
    }

    if (klasse === "C") {
      return {
        rondeTijd: "2:00",
        format: "3 x 2:00",
        rustTijd: "1:00",
        gewichtsklasse:
          String(explicitGewichtsklasse ?? "").trim() ||
          getKickThaiWeightClass(Number.isFinite(useWeight) ? useWeight : null),
      };
    }

    if (klasse === "B" || klasse === "A") {
      return {
        rondeTijd: "3:00",
        format: "3 x 3:00",
        rustTijd: "1:00",
        gewichtsklasse:
          String(explicitGewichtsklasse ?? "").trim() ||
          getKickThaiWeightClass(Number.isFinite(useWeight) ? useWeight : null),
      };
    }
  }

  return {
    rondeTijd: null,
    format: null,
    rustTijd: null,
    gewichtsklasse: String(explicitGewichtsklasse ?? "").trim() || null,
  };
}

// --------------------------------------------------
// styles
// --------------------------------------------------
function fightSupportTitleText(): CSSProperties {
  return {
    background:
      "linear-gradient(180deg, #ffffff 0%, #efefef 18%, #cfcfcf 38%, #a4a4a4 55%, #f8f8f8 75%, #7f7f7f 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textShadow:
      "0 1px 0 rgba(255,255,255,0.22), 0 3px 0 rgba(0,0,0,0.55), 0 10px 18px rgba(0,0,0,0.55)",
  };
}

function pageShellStyle(): CSSProperties {
  return {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #dcdcdc 0%, #d1d1d1 48%, #dbdbdb 100%)",
  };
}

function outerFrameStyle(): CSSProperties {
  return {
    borderRadius: 12,
    padding: 10,
    background:
      "linear-gradient(180deg, #0b0c0f 0%, #060708 100%), radial-gradient(circle at 50% 0%, rgba(255,255,255,0.12), transparent 40%)",
    border: "4px solid rgba(0,0,0,0.92)",
    boxShadow:
      "0 24px 60px rgba(0,0,0,0.42), inset 0 0 0 2px rgba(255,255,255,0.08)",
  };
}

function innerPlateStyle(): CSSProperties {
  return {
    borderRadius: 6,
    padding: 16,
    border: "2px solid rgba(0,0,0,0.35)",
    background:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 4px), linear-gradient(180deg, #efefef 0%, #d7d7d7 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.82), inset 0 0 0 2px rgba(0,0,0,0.08), inset 0 -16px 30px rgba(0,0,0,0.10)",
  };
}

function heroStyle(): CSSProperties {
  return {
    borderRadius: 16,
    padding: 18,
    border: "3px solid rgba(0,0,0,0.62)",
    background:
      "radial-gradient(900px 300px at 50% 0%, rgba(255,77,0,0.13), transparent 56%), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0.015) 6px), linear-gradient(180deg, #343842 0%, #1a1d24 54%, #0b0d11 100%)",
    boxShadow:
      "0 18px 36px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px rgba(255,255,255,0.05)",
  };
}

function steelFrameOuter(): CSSProperties {
  return {
    position: "relative",
    padding: 8,
    background: `
      linear-gradient(145deg,
        #ffffff 0%,
        #cfcfcf 6%,
        #6a6a6a 12%,
        #fafafa 19%,
        #8d8d8d 27%,
        #3f3f3f 36%,
        #ededed 47%,
        #9f9f9f 58%,
        #4b4b4b 69%,
        #ffffff 80%,
        #b8b8b8 90%,
        #f7f7f7 100%)
    `,
    border: "1px solid rgba(255,255,255,0.60)",
    boxShadow: `
      0 12px 22px rgba(0,0,0,0.40),
      inset 0 2px 1px rgba(255,255,255,0.96),
      inset 0 -2px 2px rgba(0,0,0,0.82),
      inset 2px 0 2px rgba(255,255,255,0.44),
      inset -2px 0 2px rgba(0,0,0,0.54)
    `,
    borderRadius: 4,
  };
}

function steelFrameMid(): CSSProperties {
  return {
    padding: 3,
    background: `
      linear-gradient(135deg,
        rgba(255,255,255,0.95) 0%,
        rgba(216,216,216,0.95) 14%,
        rgba(64,64,64,0.96) 28%,
        rgba(248,248,248,0.94) 48%,
        rgba(98,98,98,0.96) 68%,
        rgba(236,236,236,0.96) 100%)
    `,
    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,0.78),
      inset 0 -1px 0 rgba(0,0,0,0.58)
    `,
    borderRadius: 2,
  };
}

function steelFrameChannel(): CSSProperties {
  return {
    padding: 4,
    background: `
      linear-gradient(180deg,
        #2a2a2a 0%,
        #080808 18%,
        #505050 34%,
        #0c0c0c 52%,
        #424242 72%,
        #090909 100%)
    `,
    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,0.16),
      inset 0 -1px 0 rgba(0,0,0,0.84)
    `,
    borderRadius: 2,
  };
}

function steelFrameInner(): CSSProperties {
  return {
    padding: 2,
    background: `
      linear-gradient(135deg,
        #fbfbfb 0%,
        #d2d2d2 10%,
        #6f6f6f 22%,
        #f3f3f3 34%,
        #b4b4b4 46%,
        #545454 60%,
        #fafafa 78%,
        #b2b2b2 100%)
    `,
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,0.66),
      inset 0 -1px 0 rgba(0,0,0,0.50)
    `,
    borderRadius: 2,
  };
}

function darkCardStyle(): CSSProperties {
  return {
    borderRadius: 2,
    overflow: "hidden",
    border: "1px solid #080808",
    background:
      "radial-gradient(circle at 14% 84%, rgba(255,110,0,0.09), transparent 16%), radial-gradient(circle at 86% 14%, rgba(255,255,255,0.05), transparent 14%), linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.012) 15%, rgba(0,0,0,0.16) 100%), linear-gradient(135deg, #1a1d22 0%, #070a0f 46%, #15181d 100%)",
    boxShadow:
      "inset 0 2px 4px rgba(0,0,0,0.92), inset 0 -2px 6px rgba(255,255,255,0.05), inset 0 0 30px rgba(255,120,0,0.05)",
  };
}

function lightCardStyle(): CSSProperties {
  return {
    borderRadius: 4,
    overflow: "hidden",
    border: "2px solid rgba(0,0,0,0.18)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(236,236,236,0.99) 100%)",
    boxShadow:
      "0 14px 30px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.85)",
  };
}

function plateBodyStyle(): CSSProperties {
  return {
    border: "2px solid rgba(0,0,0,0.20)",
    borderRadius: 4,
    background:
      "radial-gradient(circle at 30% 0%, rgba(255,255,255,0.10), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(229,232,236,0.98) 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75), 0 16px 40px rgba(0,0,0,0.15)",
  };
}

function darkHeaderStyle(accent?: string): CSSProperties {
  const glow = accent
    ? `radial-gradient(420px 130px at 0% 0%, ${accent}22, transparent 50%),`
    : "";
  return {
    padding: "14px 16px",
    background: `${glow} linear-gradient(180deg, #23262d 0%, #0f1115 100%)`,
    borderBottom: `4px solid ${NVB_ORANGE}`,
    color: "#fff",
    boxShadow:
      "0 8px 18px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
  };
}

function darkBodyStyle(): CSSProperties {
  return {
    padding: 16,
    background:
      "radial-gradient(640px 220px at 0% 0%, rgba(255,77,0,0.07), transparent 52%), linear-gradient(180deg, #13161c 0%, #090b0f 100%)",
    color: "#fff",
  };
}

function lightBodyStyle(): CSSProperties {
  return {
    padding: 16,
    background:
      "linear-gradient(180deg, rgba(249,249,249,0.97) 0%, rgba(235,235,235,0.99) 100%)",
  };
}

function badgeStyle(kind: "ok" | "warn" | "bad" | "neutral"): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    padding: "0 14px",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.2,
    border: "1px solid rgba(0,0,0,0.30)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
  };

  if (kind === "ok") {
    return {
      ...base,
      color: "#fff",
      background: "linear-gradient(180deg, #1ea34a 0%, #157736 100%)",
    };
  }

  if (kind === "warn") {
    return {
      ...base,
      color: "#111",
      background: "linear-gradient(180deg, #f5c400 0%, #d7a400 100%)",
    };
  }

  if (kind === "bad") {
    return {
      ...base,
      color: "#fff",
      background: "linear-gradient(180deg, #c81f1f 0%, #8f1515 100%)",
    };
  }

  return {
    ...base,
    color: "#fff",
    background: "linear-gradient(180deg, #5a606b 0%, #3d434d 100%)",
  };
}

function zebraLightRowStyle(index: number): CSSProperties {
  const dark = index % 2 === 1;
  return {
    background: dark ? "#4a4d56" : "#f1f1f1",
    color: dark ? "#fff" : "#151515",
    borderBottom: "1px solid rgba(0,0,0,0.10)",
  };
}

function inputStyle(): CSSProperties {
  return {
    width: "100%",
    height: 42,
    borderRadius: 4,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
    color: "#fff",
    padding: "0 12px",
    fontSize: 14,
    fontWeight: 800,
    outline: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function silverButtonStyle(): CSSProperties {
  return {
    minWidth: 150,
    height: 42,
    border: "1px solid rgba(185,185,185,0.95)",
    background: `
      linear-gradient(180deg,
        #ffffff 0%,
        #f3f3f3 10%,
        #d7d7d7 24%,
        #fcfcfc 42%,
        #bcbcbc 72%,
        #efefef 100%)
    `,
    color: "#121212",
    fontSize: 15,
    fontWeight: 900,
    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,1),
      inset 0 -2px 2px rgba(0,0,0,0.40),
      0 4px 10px rgba(0,0,0,0.28)
    `,
    cursor: "pointer",
    textShadow: "0 1px 0 rgba(255,255,255,0.55)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "0 18px",
    whiteSpace: "nowrap",
    borderRadius: 2,
  };
}

// --------------------------------------------------
// components
// --------------------------------------------------
function SteelFrame({ children }: { children: ReactNode }) {
  return (
    <div style={steelFrameOuter()}>
      <div style={steelFrameMid()}>
        <div style={steelFrameChannel()}>
          <div style={steelFrameInner()}>{children}</div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  count,
  color = NVB_ORANGE,
}: {
  title: string;
  count?: string | number | ReactNode;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="inline-block h-5 w-5" style={{ background: color, borderRadius: 4 }} />
        <div className="text-[18px] font-black uppercase tracking-[0.06em]">{title}</div>
      </div>
      {count != null ? <div>{count}</div> : null}
    </div>
  );
}

function DarkFieldRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div
      className="flex items-start justify-between gap-4 py-3"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="text-[13px] font-extrabold uppercase tracking-[0.04em] text-white/62">
        {label}
      </div>
      <div className="text-sm font-black text-right text-white">{value}</div>
    </div>
  );
}

function StatusPill({
  label,
  value,
  kind,
}: {
  label: string;
  value: string;
  kind: "ok" | "warn" | "bad" | "neutral";
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[14px] font-black text-white/72">{label}</span>
      <span style={badgeStyle(kind)}>{value}</span>
    </div>
  );
}

function UitslagenTable({ rows }: { rows: DisplayUitslag[] }) {
  return (
    <div className="overflow-auto rounded-md border-2 border-zinc-300 bg-white">
      <table className="w-full text-sm border-collapse table-fixed">
        <thead className="bg-zinc-800 text-white border-b-4" style={{ borderColor: NVB_ORANGE }}>
          <tr>
            <th className="text-left px-3 py-2 w-32 border-r border-zinc-700">Datum</th>
            <th className="text-left px-3 py-2 w-56 border-r border-zinc-700">Tegenstander</th>
            <th className="text-left px-3 py-2 w-64 border-r border-zinc-700">Event</th>
            <th className="text-left px-3 py-2 w-40 border-r border-zinc-700">Discipline</th>
            <th className="text-left px-3 py-2 w-24 border-r border-zinc-700">Klasse</th>
            <th className="text-left px-3 py-2">Uitslag</th>
          </tr>
        </thead>
        <tbody className="[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(odd)]:text-zinc-900 [&>tr:nth-child(even)]:bg-zinc-700 [&>tr:nth-child(even)]:text-white">
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-3" colSpan={6}>
                Geen uitslagen gevonden.
              </td>
            </tr>
          ) : (
            rows.map((r, idx) => (
              <tr key={`${r.datum}-${r.tegenstander}-${idx}`}>
                <td className="px-3 py-3 align-top font-semibold break-words">{r.datum || "—"}</td>
                <td className="px-3 py-3 align-top font-semibold break-words">
                  {r.tegenstander || "—"}
                </td>
                <td className="px-3 py-3 align-top font-semibold break-words">{r.event || "—"}</td>
                <td className="px-3 py-3 align-top font-semibold break-words">
                  {r.discipline || "—"}
                </td>
                <td className="px-3 py-3 align-top font-semibold break-words">
                  {r.klasse || "—"}
                </td>
                <td className="px-3 py-3 align-top font-semibold break-words">
                  {r.uitslag || "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function MeldingenZebra({
  lines,
  scrapedAt,
}: {
  lines: string[];
  scrapedAt: string;
}) {
  return (
    <SteelFrame>
      <div style={lightCardStyle()}>
        <div style={darkHeaderStyle(BLUE)}>
          <SectionTitle
            title="Meldingen"
            count={
              <div className="flex flex-wrap items-center gap-3 text-sm font-black text-white/72">
                <span>{lines.length} meldingen</span>
                <span className="text-white/45">|</span>
                <span>Scraped op: {scrapedAt}</span>
              </div>
            }
            color={BLUE}
          />
        </div>

        <div style={lightBodyStyle()}>
          {lines.length === 0 ? (
            <div className="text-sm font-bold text-zinc-700">Geen meldingen.</div>
          ) : (
            <div className="overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.12)" }}>
              <table className="w-full text-sm">
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} style={zebraLightRowStyle(idx)}>
                      <td className="px-4 py-3 font-semibold leading-snug">↳ {line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SteelFrame>
  );
}

function KeurmerkCard({
  statusKind,
  statusLabel,
  lines,
}: {
  statusKind: "ok" | "warn" | "bad" | "neutral";
  statusLabel: string;
  lines: string[];
}) {
  return (
    <SteelFrame>
      <div style={darkCardStyle()}>
        <div style={darkHeaderStyle(RED)}>
          <SectionTitle
            title="Keurmerk"
            count={<span style={badgeStyle(statusKind)}>{statusLabel}</span>}
            color={RED}
          />
        </div>
        <div style={darkBodyStyle()}>
          {lines.length === 0 ? (
            <div className="text-sm font-bold text-white/72">Geen keurmerkinfo.</div>
          ) : (
            <div className="space-y-3 text-[16px] font-semibold text-white/92 whitespace-pre-wrap">
              {lines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SteelFrame>
  );
}

function ExtraNulmetingCard({
  nulmetingKlasse,
  nulmetingTotaal,
  nulmetingOpmerking,
}: {
  nulmetingKlasse: string;
  nulmetingTotaal: string;
  nulmetingOpmerking: string;
}) {
  return (
    <SteelFrame>
      <div style={darkCardStyle()}>
        <div style={darkHeaderStyle(NVB_ORANGE)}>
          <SectionTitle title="Extra / nulmeting" color={NVB_ORANGE} />
        </div>
        <div style={darkBodyStyle()}>
          <div className="space-y-3 text-sm font-extrabold text-white/88">
            <div>
              Klasse (nulmeting): <span className="text-white">{nulmetingKlasse}</span>
            </div>
            <div>
              Totaal (nulmeting): <span className="text-white">{nulmetingTotaal}</span>
            </div>
            <div className="whitespace-pre-wrap">{nulmetingOpmerking || "—"}</div>
          </div>
        </div>
      </div>
    </SteelFrame>
  );
}

function TrainerEditorCard({
  open,
  setOpen,
  trainerNaam,
  setTrainerNaam,
  telefoon,
  setTelefoon,
  saving,
  saveMsg,
  onSave,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  trainerNaam: string;
  setTrainerNaam: (v: string) => void;
  telefoon: string;
  setTelefoon: (v: string) => void;
  saving: boolean;
  saveMsg: string | null;
  onSave: () => void;
}) {
  return (
    <SteelFrame>
      <div style={darkCardStyle()}>
        <div style={darkHeaderStyle(NVB_ORANGE)}>
          <div className="flex items-center justify-between gap-3">
            <SectionTitle title="Trainer opslaan" color={NVB_ORANGE} />
            <button
              type="button"
              onClick={() => setOpen(!open)}
              style={{
                ...badgeStyle("neutral"),
                minHeight: 34,
                cursor: "pointer",
              }}
            >
              {open ? "Inklappen" : "Openen"}
            </button>
          </div>
        </div>

        {open ? (
          <div style={darkBodyStyle()}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.06em] text-white/55">
                  Trainer naam
                </div>
                <input
                  value={trainerNaam}
                  onChange={(e) => setTrainerNaam(e.target.value)}
                  placeholder="Trainer naam"
                  style={inputStyle()}
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.06em] text-white/55">
                  Telefoon
                </div>
                <input
                  value={telefoon}
                  onChange={(e) => setTelefoon(e.target.value)}
                  placeholder="Telefoonnummer"
                  style={inputStyle()}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                style={{
                  ...silverButtonStyle(),
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Opslaan..." : "Opslaan"}
              </button>

              {saveMsg ? <div className="text-sm font-bold text-white/80">{saveMsg}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </SteelFrame>
  );
}

// --------------------------------------------------
// page
// --------------------------------------------------
export default function MatchmakerFighterContextPage() {
  const router = useRouter();
  const params = useParams<{
    matchmakingId: string;
    fighterContextId: string;
  }>();

  const matchmakingId = String(params?.matchmakingId ?? "");
  const fighterContextId = String(params?.fighterContextId ?? "");

  const [row, setRow] = useState<FighterContext | null>(null);
  const [inschrijving, setInschrijving] = useState<InschrijvingRow | null>(null);
  const [trainerNaam, setTrainerNaam] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [uitslagenRows, setUitslagenRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [trainerEditorOpen, setTrainerEditorOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchFighterRow() {
      if (isUuidLike(fighterContextId)) {
        const byId = await supabase
          .from("matchmaker_fighter_context")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("id", fighterContextId)
          .limit(1)
          .maybeSingle();

        if (byId.data) return byId;
        if (byId.error) throw byId.error;

        const byInschrijvingId = await supabase
          .from("matchmaker_fighter_context")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("inschrijving_id", fighterContextId)
          .limit(1)
          .maybeSingle();

        return byInschrijvingId;
      }

      const fighterRowNr = Number(fighterContextId);
      if (!Number.isFinite(fighterRowNr)) {
        throw new Error("Ongeldige fighter id.");
      }

      return await supabase
        .from("matchmaker_fighter_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("row_nr", fighterRowNr)
        .limit(1)
        .maybeSingle();
    }

    async function fetchInschrijvingForFighter(fighter: FighterContext) {
      if (fighter.inschrijving_id && isUuidLike(fighter.inschrijving_id)) {
        const byId = await supabase
          .from("matchmaker_inschrijvingen")
          .select(
            "id, matchmaking_id, row_nr, email, trainer_naam, telefoon, voornaam, achternaam, naam_input, va_nummer"
          )
          .eq("matchmaking_id", matchmakingId)
          .eq("id", fighter.inschrijving_id)
          .limit(1)
          .maybeSingle();

        if (byId.data) return byId.data as InschrijvingRow;
      }

      if (fighter.row_nr != null) {
        const byRowNr = await supabase
          .from("matchmaker_inschrijvingen")
          .select(
            "id, matchmaking_id, row_nr, email, trainer_naam, telefoon, voornaam, achternaam, naam_input, va_nummer"
          )
          .eq("matchmaking_id", matchmakingId)
          .eq("row_nr", fighter.row_nr)
          .limit(1)
          .maybeSingle();

        if (byRowNr.data) return byRowNr.data as InschrijvingRow;
      }

      if (fighter.va_nummer) {
        const byVa = await supabase
          .from("matchmaker_inschrijvingen")
          .select(
            "id, matchmaking_id, row_nr, email, trainer_naam, telefoon, voornaam, achternaam, naam_input, va_nummer"
          )
          .eq("matchmaking_id", matchmakingId)
          .eq("va_nummer", fighter.va_nummer)
          .limit(1)
          .maybeSingle();

        if (byVa.data) return byVa.data as InschrijvingRow;
      }

      return null;
    }

    async function fetchUitslagenForFighter(fighter: FighterContext) {
      const { data, error } = await supabase
        .from("matchmaker_uitslagen_raw")
        .select("*")
        .eq("matchmaking_id", matchmakingId);

      if (error) {
        console.error("[fighter-context] uitslagen query fout", error);
        return [];
      }

      const rows = (data ?? []) as AnyRow[];
      if (!rows.length) return [];

      const va = String(fighter.va_nummer ?? "").trim();
      const fullName = norm([fighter.voornaam, fighter.achternaam].filter(Boolean).join(" "));
      const inputName = norm(fighter.naam_input);
      const fpName = norm(fighter.fp_naam);
      const dobInput = String(fighter.geboortedatum_input ?? "").trim();
      const dobFp = String(fighter.fp_geboortedatum ?? "").trim();

      const filtered = rows.filter((r) => {
        const rowVaCandidates = [
          r.va_nummer,
          r.va,
          r.fp_nummer,
          r.fighter_va,
          r.vechter_va,
          r.licentie_nummer,
        ]
          .map((x) => String(x ?? "").trim())
          .filter(Boolean);

        if (va && rowVaCandidates.includes(va)) return true;

        const rowName = norm(
          firstFilled(
            r.naam,
            r.naam_vechter,
            r.vechter_naam,
            r.fighter_name,
            r.fp_naam,
            [r.voornaam, r.achternaam].filter(Boolean).join(" ")
          )
        );

        const rowDob = String(
          firstFilled(r.geboortedatum, r.geb_datum, r.fp_geboortedatum, r.dob) ?? ""
        ).trim();

        const nameMatches =
          !!rowName &&
          [fullName, inputName, fpName].filter(Boolean).some((candidate) => {
            return rowName === candidate || rowName.includes(candidate) || candidate.includes(rowName);
          });

        const dobMatches =
          !!rowDob && [dobInput, dobFp].filter(Boolean).some((candidate) => rowDob === candidate);

        return nameMatches || (nameMatches && dobMatches);
      });

      return [...filtered].sort((a, b) => {
        const da = new Date(
          firstFilled(a.datum, a.partij_datum, a.event_datum, a.created_at) ?? 0
        ).getTime();
        const db = new Date(
          firstFilled(b.datum, b.partij_datum, b.event_datum, b.created_at) ?? 0
        ).getTime();
        return db - da;
      });
    }

    async function run() {
      try {
        setLoading(true);
        setErr(null);
        setSaveMsg(null);
        setRow(null);
        setInschrijving(null);
        setUitslagenRows([]);

        if (!matchmakingId) throw new Error("Geen matchmakingId in route.");
        if (!fighterContextId) throw new Error("Geen fighterContextId in route.");

        const fighterRes = await fetchFighterRow();

        if (fighterRes.error) throw new Error(fighterRes.error.message);
        if (!fighterRes.data) {
          throw new Error("Geen vechter gevonden binnen deze matchmaking.");
        }

        const fighter = fighterRes.data as FighterContext;
        const [uitslagen, inschrijvingRow] = await Promise.all([
          fetchUitslagenForFighter(fighter),
          fetchInschrijvingForFighter(fighter),
        ]);

        if (cancelled) return;

        setRow(fighter);
        setUitslagenRows(uitslagen);
        setInschrijving(inschrijvingRow);
        setTrainerNaam(String(inschrijvingRow?.trainer_naam ?? ""));
        setTelefoon(String(inschrijvingRow?.telefoon ?? ""));
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Onbekende fout.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [matchmakingId, fighterContextId]);

  async function handleSaveTrainerFields() {
    if (!matchmakingId) return;
    if (!row) return;

    try {
      setSaving(true);
      setSaveMsg(null);

      const payload = {
        trainer_naam: trainerNaam.trim() || null,
        telefoon: telefoon.trim() || null,
      };

      let updated: InschrijvingRow | null = null;

      if (inschrijving?.id) {
        const { data, error } = await supabase
          .from("matchmaker_inschrijvingen")
          .update(payload)
          .eq("matchmaking_id", matchmakingId)
          .eq("id", inschrijving.id)
          .select(
            "id, matchmaking_id, row_nr, email, trainer_naam, telefoon, voornaam, achternaam, naam_input, va_nummer"
          )
          .single();

        if (error) throw error;
        updated = data as InschrijvingRow;
      } else if (row.inschrijving_id && isUuidLike(row.inschrijving_id)) {
        const { data, error } = await supabase
          .from("matchmaker_inschrijvingen")
          .update(payload)
          .eq("matchmaking_id", matchmakingId)
          .eq("id", row.inschrijving_id)
          .select(
            "id, matchmaking_id, row_nr, email, trainer_naam, telefoon, voornaam, achternaam, naam_input, va_nummer"
          )
          .single();

        if (error) throw error;
        updated = data as InschrijvingRow;
      } else if (row.row_nr != null) {
        const { data, error } = await supabase
          .from("matchmaker_inschrijvingen")
          .update(payload)
          .eq("matchmaking_id", matchmakingId)
          .eq("row_nr", row.row_nr)
          .select(
            "id, matchmaking_id, row_nr, email, trainer_naam, telefoon, voornaam, achternaam, naam_input, va_nummer"
          )
          .single();

        if (error) throw error;
        updated = data as InschrijvingRow;
      } else {
        throw new Error("Geen matchmaker_inschrijvingen record gevonden om trainergegevens op te slaan.");
      }

      setInschrijving(updated);
      setTrainerNaam(String(updated?.trainer_naam ?? ""));
      setTelefoon(String(updated?.telefoon ?? ""));
      setSaveMsg("Trainergegevens opgeslagen.");
    } catch (e: any) {
      setSaveMsg(e?.message ?? "Opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  }

  const extraParsed = useMemo(() => safeJson(row?.extra), [row?.extra]);

  const fullName = useMemo(() => {
    if (!row) return "ONBEKENDE VECHTER";
    const v = String(row.voornaam ?? "").trim();
    const a = String(row.achternaam ?? "").trim();
    if (v || a) return `${v} ${a}`.trim();
    return String(firstFilled(row.naam_input, row.naam) ?? "ONBEKENDE VECHTER");
  }, [row]);

  const totaalPartijen = useMemo(
    () => firstFilled(row?.totaal_wedstrijden, row?.uitslagen_count, uitslagenRows.length) ?? 0,
    [row, uitslagenRows]
  );

  const totaalGewonnen = useMemo(() => firstFilled(row?.gewonnen, row?.record_w, 0) ?? 0, [row]);

  const licentieText = useMemo(() => {
    const raw = firstFilled(
      row?.licentie,
      getExtraValue(extraParsed, ["licentie", "heeft_licentie", "licentie geldig", "licentie_geldig"])
    );
    return normalizeLicentie(raw);
  }, [row, extraParsed]);

  const startVerbodText = useMemo(() => {
    const raw = firstFilled(
      row?.heeft_startverbod,
      getExtraValue(extraParsed, ["heeft_startverbod", "startverbod", "start verbod"])
    );
    return normalizeStartverbod(raw);
  }, [row, extraParsed]);

  const nulmetingTotaal = useMemo(
    () =>
      firstFilled(
        row?.nulmeting_totaal,
        getExtraValue(extraParsed, ["nulmeting_totaal", "nulmeting totaal"])
      ) ?? "—",
    [row, extraParsed]
  );

  const nulmetingKlasse = useMemo(
    () =>
      firstFilled(
        row?.nulmeting_klasse,
        getExtraValue(extraParsed, ["nulmeting_klasse", "nulmeting klasse"])
      ) ?? "—",
    [row, extraParsed]
  );

  const eventDatum = useMemo(() => {
    return (
      firstFilled(
        row?.event_datum,
        row?.evenement_datum,
        getExtraValue(extraParsed, ["event_datum", "event datum", "evenement_datum", "datum"]),
        getExtraValue(extraParsed, ["matchmaking_event_datum", "referentie_datum"])
      ) ?? null
    );
  }, [row, extraParsed]);

  const leeftijdEvent = useMemo(() => {
    const eventDate = parseDateOnly(eventDatum);
    const birthDate = parseDateOnly(
      firstFilled(row?.fp_geboortedatum, row?.geboortedatum_input, row?.geboortedatum)
    );
    if (!eventDate || !birthDate) return "—";
    const years = calcAgeYearsOnDate(eventDate, birthDate);
    return years == null ? "—" : `${years} jaar`;
  }, [eventDatum, row]);

  const wedstrijddetails = useMemo(() => wedstrijddetailsFromCtx(row), [row]);

  const keurmerkRaw = useMemo(() => {
    return safeJson(
      firstFilled(
        getExtraValue(extraParsed, ["keurmerk"]),
        getExtraValue(extraParsed, ["keurmerk info"]),
        getExtraValue(extraParsed, ["keurmerk_reason"]),
        getExtraValue(extraParsed, ["keurmerk reason"])
      )
    );
  }, [extraParsed]);

  const keurmerkInfo = useMemo(() => {
    const obj =
      keurmerkRaw && typeof keurmerkRaw === "object" && !Array.isArray(keurmerkRaw)
        ? keurmerkRaw
        : null;

    const dbMatchedGym = firstFilled(
      obj?.sportschool_match?.naam,
      obj?.sportschool_match?.sportschool,
      obj?.sportschool_match?.gym,
      obj?.matched_gym,
      obj?.db_match_sportschool,
      obj?.db_match,
      obj?.sportschool
    );

    const keurmerkEind = firstFilled(
      obj?.sportschool_match?.keurmerk_eind,
      obj?.keurmerk_eind,
      obj?.einddatum,
      obj?.eind_datum
    );

    const referentieDatum = firstFilled(eventDatum, obj?.referentie_datum, obj?.datum);
    const geldigOpEventDatum = compareDatesOnOrAfter(keurmerkEind, referentieDatum);

    let statusLabel = "Geen data";
    let statusKind: "ok" | "warn" | "bad" | "neutral" = "neutral";

    if (geldigOpEventDatum === true) {
      statusLabel = "Geldig";
      statusKind = "ok";
    } else if (geldigOpEventDatum === false) {
      statusLabel = "Ongeldig";
      statusKind = "bad";
    } else if (asYes(row?.heeft_keurmerk)) {
      statusLabel = "Geldig";
      statusKind = "ok";
    }

    const lines: string[] = [];
    lines.push(`MM sportschool: ${row?.gym_input || "—"}`);
    lines.push(`Gematcht met: ${dbMatchedGym ? String(dbMatchedGym) : "—"}`);
    lines.push(`Keurmerk geldig t/m: ${keurmerkEind ? fmtDate(keurmerkEind) : "—"}`);

    return {
      matchedGym: dbMatchedGym ? String(dbMatchedGym) : null,
      keurmerkEind: keurmerkEind ? String(keurmerkEind) : null,
      referentieDatum: referentieDatum ? String(referentieDatum) : null,
      statusLabel,
      statusKind,
      geldigOpEventDatum,
      lines,
    };
  }, [keurmerkRaw, row, eventDatum]);

  const displayUitslagen = useMemo(() => uitslagenRows.map(pickUitslagColumns), [uitslagenRows]);

  const emailValue = useMemo(
    () => String(firstFilled(inschrijving?.email, getExtraValue(extraParsed, ["email"])) ?? "—"),
    [inschrijving, extraParsed]
  );

  const meldingLines = useMemo(() => {
    const lines: string[] = [];
    if (!row) return lines;

    if (row.naam_match === false) {
      lines.push(`Naam wijkt af: input "${row.naam_input ?? "—"}" ↔ FightPassport "${row.fp_naam ?? "—"}".`);
    }

    if (row.geboortedatum_match === false) {
      lines.push(
        `Geboortedatum wijkt af van FightPassport: input "${row.geboortedatum_input ? fmtDate(row.geboortedatum_input) : "—"}" ↔ FightPassport "${row.fp_geboortedatum ? fmtDate(row.fp_geboortedatum) : "—"}".`
      );
    }

    if (row.fp_naam) {
      lines.push(`FightPassport naam: ${row.fp_naam}.`);
    }

    if (row.fp_geboortedatum) {
      lines.push(`FightPassport geboortedatum: ${fmtDate(row.fp_geboortedatum)}.`);
    }

    if (keurmerkInfo.matchedGym) {
      lines.push(`Gematcht met sportschool uit DB: ${keurmerkInfo.matchedGym}.`);
    }

    if (keurmerkInfo.geldigOpEventDatum === true) {
      lines.push(`Keurmerk geldig op eventdatum ${fmtDate(keurmerkInfo.referentieDatum)}.`);
    } else if (keurmerkInfo.geldigOpEventDatum === false) {
      lines.push(`Keurmerk niet geldig op eventdatum ${fmtDate(keurmerkInfo.referentieDatum)}.`);
    }

    const extraMeldingen = valueToLines(
      firstFilled(
        extraParsed?.meldingen,
        getExtraValue(extraParsed, ["meldingen"]),
        getExtraValue(extraParsed, ["warnings"]),
        getExtraValue(extraParsed, ["waarschuwingen"])
      )
    );

    for (const line of extraMeldingen) {
      const clean = valueToSingleLine(line);
      if (clean !== "—" && !lines.includes(clean)) lines.push(clean);
    }

    return lines.filter(Boolean);
  }, [row, keurmerkInfo, extraParsed]);

  return (
    <div className={inter.className} style={pageShellStyle()}>
      <div className="mx-auto max-w-[1800px] px-4 py-6">
        <div style={outerFrameStyle()}>
          <div style={innerPlateStyle()}>
            <div style={heroStyle()}>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_1fr_320px] xl:items-center">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-white/52">
                      Matchmaking ID
                    </div>
                    <div className="mt-1 text-sm font-black text-white/90 break-all">
                      {matchmakingId || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-white/52">
                      Fighter ref
                    </div>
                    <div className="mt-1 text-sm font-black text-white/90 break-all">
                      {fighterContextId || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-white/52">
                      Status
                    </div>
                    <div className="mt-2">
                      <span style={badgeStyle(err ? "bad" : loading ? "warn" : "ok")}>
                        {err ? "FOUT" : loading ? "LADEN" : "KLAAR"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 text-center">
                  <div className="text-sm font-black uppercase tracking-[0.18em] text-white/60">
                    Fighter context
                  </div>

                  <div
                    className={`${bebas.className} mt-1 text-[48px] leading-none tracking-[0.12em] md:text-[78px]`}
                    style={{
                      ...fightSupportTitleText(),
                      textAlign: "center",
                    }}
                  >
                    FIGHTSUPPORT
                  </div>

                  <div className="mt-2 text-sm font-black uppercase tracking-[0.28em] text-white/52">
                    Fighter dashboard
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-start xl:justify-end">
                  <button
                    onClick={() => router.back()}
                    className="h-[52px] min-w-[58px] px-4 text-lg font-black text-white active:scale-[0.98]"
                    style={{
                      borderRadius: 8,
                      background: "linear-gradient(180deg, #ff6a00 0%, #e14b00 100%)",
                      border: "1px solid rgba(0,0,0,0.45)",
                      boxShadow:
                        "0 10px 20px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.20)",
                    }}
                    title="Terug"
                  >
                    ←
                  </button>

                  <button
                    onClick={() => window.location.reload()}
                    className="h-[52px] min-w-[58px] px-4 text-lg font-black text-zinc-900 active:scale-[0.98]"
                    style={{
                      borderRadius: 8,
                      background: "linear-gradient(180deg, #d7d7d7 0%, #8f8f8f 100%)",
                      border: "1px solid rgba(0,0,0,0.45)",
                      boxShadow:
                        "0 10px 20px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.42)",
                    }}
                    title="Vernieuwen"
                  >
                    ↻
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="mt-6" style={lightCardStyle()}>
                <div style={darkHeaderStyle()}>
                  <div className="text-lg font-black uppercase tracking-[0.06em]">Laden</div>
                </div>
                <div style={lightBodyStyle()}>
                  <div className="text-sm font-bold text-zinc-800">Gegevens worden opgehaald…</div>
                </div>
              </div>
            ) : err ? (
              <div className="mt-6" style={lightCardStyle()}>
                <div style={darkHeaderStyle(RED)}>
                  <div className="text-lg font-black uppercase tracking-[0.06em]">Fout</div>
                </div>
                <div style={lightBodyStyle()}>
                  <div className="text-sm font-bold text-zinc-800">{err}</div>
                </div>
              </div>
            ) : !row ? (
              <div className="mt-6" style={lightCardStyle()}>
                <div style={darkHeaderStyle()}>
                  <div className="text-lg font-black uppercase tracking-[0.06em]">Geen data</div>
                </div>
                <div style={lightBodyStyle()}>
                  <div className="text-sm font-bold text-zinc-800">
                    Geen data gevonden in matchmaker_fighter_context.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.08fr_320px_1fr]">
                  <SteelFrame>
                    <div style={darkCardStyle()}>
                      <div style={darkHeaderStyle(RED)}>
                        <SectionTitle title="Fighter" color={RED} />
                      </div>

                      <div style={darkBodyStyle()}>
                        <div className="text-[38px] leading-none font-black text-[#ff5a0a] md:text-[48px]">
                          {fullName}
                        </div>

                        <div className="mt-3 text-[22px] font-extrabold text-white">
                          {row.gym_input || "—"}
                        </div>

                        <div className="mt-3 text-[15px] font-extrabold text-white/90">
                          FP/VA: {row.va_nummer || "—"}
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <StatusPill
                            label="Licentie:"
                            value={licentieText === "ja" ? "JA" : "NEE"}
                            kind={licentieText === "ja" ? "ok" : "bad"}
                          />
                          <StatusPill
                            label="Startverbod:"
                            value={startVerbodText === "ja" ? "JA" : "NEE"}
                            kind={startVerbodText === "ja" ? "bad" : "ok"}
                          />
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
                          <DarkFieldRow
                            label="Geboortedatum"
                            value={row.fp_geboortedatum ? fmtDate(row.fp_geboortedatum) : "—"}
                          />
                          <DarkFieldRow label="Leeftijd (event)" value={leeftijdEvent} />
                          <DarkFieldRow label="Geslacht" value={row.geslacht ?? "—"} />
                          <DarkFieldRow label="Gewicht" value={fmtKg(row.gewicht)} />
                        </div>
                      </div>
                    </div>
                  </SteelFrame>

                  <div className="flex flex-col gap-4">
                    <SteelFrame>
                      <div
                        className="mx-auto flex w-full items-center justify-center"
                        style={{
                          minHeight: 210,
                          padding: 16,
                          background:
                            "linear-gradient(180deg, rgba(245,245,245,0.96) 0%, rgba(223,223,223,0.98) 100%)",
                        }}
                      >
                        <div className="relative flex items-center justify-center">
                          <VsBadge />

                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              pointerEvents: "none",
                            }}
                          >
                            <div
                              style={{
                                position: "relative",
                                width: 118,
                                height: 118,
                                borderRadius: "999px",
                                overflow: "hidden",
                                background:
                                  "radial-gradient(circle at 50% 40%, rgba(255,77,0,0.30) 0%, rgba(255,77,0,0.12) 24%, rgba(10,10,10,0.96) 72%, rgba(0,0,0,1) 100%)",
                                boxShadow:
                                  "0 10px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.14)",
                              }}
                            >
                              <Image
                                src="/branding/fightsupport/fighter-shield.png"
                                alt="FightSupport"
                                fill
                                priority
                                style={{
                                  objectFit: "contain",
                                  padding: 10,
                                  border: "none",
                                  boxShadow: "none",
                                  background: "transparent",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </SteelFrame>

                    <SteelFrame>
                      <div className="w-full overflow-hidden" style={plateBodyStyle()}>
                        <div style={darkHeaderStyle()}>
                          <SectionTitle title="Wedstrijddetails" color={NVB_ORANGE} />
                        </div>
                        <div style={lightBodyStyle()}>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                            <div className="text-zinc-600 font-bold">Ronde tijd</div>
                            <div className="text-zinc-900 font-extrabold text-right">
                              {wedstrijddetails.rondeTijd ?? "—"}
                            </div>

                            <div className="text-zinc-600 font-bold">Discipline</div>
                            <div className="text-zinc-900 font-extrabold text-right">
                              {row.discipline ?? "—"}
                            </div>

                            <div className="text-zinc-600 font-bold">Klasse</div>
                            <div className="text-zinc-900 font-extrabold text-right">
                              {row.klasse ?? "—"}
                            </div>

                            <div className="text-zinc-600 font-bold">Gewichtklasse</div>
                            <div className="text-zinc-900 font-extrabold text-right">
                              {wedstrijddetails.gewichtsklasse ?? "—"}
                            </div>

                            <div className="text-zinc-600 font-bold">Event datum</div>
                            <div className="text-zinc-900 font-extrabold text-right">
                              {eventDatum ? fmtDate(eventDatum) : "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </SteelFrame>
                  </div>

                  <SteelFrame>
                    <div style={darkCardStyle()}>
                      <div style={darkHeaderStyle()}>
                        <SectionTitle title="Fighter details" color={NVB_ORANGE} />
                      </div>

                      <div style={darkBodyStyle()}>
                        <DarkFieldRow label="Totaal partijen" value={fmtNum(totaalPartijen)} />
                        <DarkFieldRow label="Totaal gewonnen" value={fmtNum(totaalGewonnen)} />
                        <DarkFieldRow
                          label="Laatste partij"
                          value={row.laatste_partij_datum ? fmtDate(row.laatste_partij_datum) : "—"}
                        />
                        <DarkFieldRow label="Trainer naam" value={trainerNaam || "—"} />
                        <DarkFieldRow label="Email" value={emailValue || "—"} />
                        <DarkFieldRow label="Telefoon" value={telefoon || "—"} />
                      </div>
                    </div>
                  </SteelFrame>
                </div>

                <div className="mt-6">
                  <SteelFrame>
                    <div className="overflow-hidden" style={plateBodyStyle()}>
                      <div style={darkHeaderStyle()}>
                        <SectionTitle
                          title="Uitslagen"
                          count={
                            <span className="text-sm font-black text-white/72">
                              {displayUitslagen.length} regels
                            </span>
                          }
                          color={NVB_ORANGE}
                        />
                      </div>
                      <div style={lightBodyStyle()}>
                        <UitslagenTable rows={displayUitslagen} />
                      </div>
                    </div>
                  </SteelFrame>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <KeurmerkCard
                    statusKind={keurmerkInfo.statusKind}
                    statusLabel={keurmerkInfo.statusLabel}
                    lines={keurmerkInfo.lines}
                  />

                  <ExtraNulmetingCard
                    nulmetingKlasse={String(nulmetingKlasse)}
                    nulmetingTotaal={fmtNum(nulmetingTotaal)}
                    nulmetingOpmerking={row.nulmeting_opmerking?.trim() || "—"}
                  />
                </div>

                <div className="mt-6">
                  <TrainerEditorCard
                    open={trainerEditorOpen}
                    setOpen={setTrainerEditorOpen}
                    trainerNaam={trainerNaam}
                    setTrainerNaam={setTrainerNaam}
                    telefoon={telefoon}
                    setTelefoon={setTelefoon}
                    saving={saving}
                    saveMsg={saveMsg}
                    onSave={handleSaveTrainerFields}
                  />
                </div>

                <div className="mt-6">
                  <MeldingenZebra
                    lines={meldingLines}
                    scrapedAt={row.scraped_at ? fmtDateTime(row.scraped_at) : "—"}
                  />
                </div>

                <div className="mt-8 text-center text-xs font-black uppercase tracking-[0.16em] text-zinc-600">
                  © Fightsupport
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}