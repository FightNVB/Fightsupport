"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Save,
  Search,
  ShieldAlert,
  UserRound,
  ClipboardCheck,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";
import { evaluateWeighInBout } from "@/lib/weegstation/weighInRulesEngine";

const NVB_ORANGE = "#ff4d00";
const FS_LINE_LIGHT = "rgba(0,0,0,0.12)";

type RoleName =
  | "superadmin"
  | "admin"
  | "promotor"
  | "matchmaker"
  | "official"
  | "hoofdofficial"
  | "dispensatie_admin";

type WeighInBout = {
  id: string;
  matchmaking_id: string;
  partij_nr: number;
  bondteam: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  discipline: string | null;
  klasse_mm: string | null;
  max_gewicht: number | string | null;
  max_gewicht_notatie?: string | null;
  bout_id?: string | null;
  controle_run_id?: string | null;

  rood_naam: string | null;
  rood_gym: string | null;
  rood_va: string | null;
  rood_leeftijd_event: number | null;
  rood_doorgegeven_gewicht: number | string | null;
  rood_gewogen_gewicht: number | string | null;

  blauw_naam: string | null;
  blauw_gym: string | null;
  blauw_va: string | null;
  blauw_leeftijd_event: number | null;

  // Optionele controlevelden vanuit FightPassport / control context.
  // Niet iedere database heeft al exact dezelfde kolomnamen, daarom vangen
  // de badge helpers hieronder meerdere varianten af.
  rood_licentie?: string | boolean | number | null;
  blauw_licentie?: string | boolean | number | null;
  rood_heeft_licentie?: string | boolean | number | null;
  blauw_heeft_licentie?: string | boolean | number | null;
  rood_startverbod?: string | boolean | number | null;
  blauw_startverbod?: string | boolean | number | null;
  rood_heeft_startverbod?: string | boolean | number | null;
  blauw_heeft_startverbod?: string | boolean | number | null;
  rood_keurmerk?: string | boolean | number | null;
  blauw_keurmerk?: string | boolean | number | null;
  rood_heeft_keurmerk?: string | boolean | number | null;
  blauw_heeft_keurmerk?: string | boolean | number | null;
  licentie_rood?: boolean | null;
  licentie_blauw?: boolean | null;
  keurmerk_rood?: boolean | null;
  keurmerk_blauw?: boolean | null;
  startverbod_rood?: boolean | null;
  startverbod_blauw?: boolean | null;

  blauw_doorgegeven_gewicht: number | string | null;
  blauw_gewogen_gewicht: number | string | null;

  gewicht_verschil: number | string | null;
  leeftijd_type: string;
  reglement_status: string;
  praktijk_status: string;
  eindstatus: string;

  dispensatie_nodig: boolean;
  dispensatie_verleend: boolean;
  dispensatie_reason: string | null;

  gewicht_strafpunt_rood?: number | string | null;
  gewicht_strafpunt_blauw?: number | string | null;

  admin_sanctie_nodig?: boolean | number | string | null;
  admin_sanctie_reason?: string | null;

  weging_notitie: string | null;
  laatste_bewerking_op: string | null;
};

type MatchmakingHeader = {
  matchmaking_id: string;
  bondteam: string | null;
  evenement_naam: string | null;
  evenement_datum: string | null;
  locatie: string | null;
};

type DraftState = {
  rood: string;
  blauw: string;
  note: string;
  strafpuntRood: "0" | "1";
  strafpuntBlauw: "0" | "1";
};

type FighterResult = {
  boutId: string;
  partijNr: number;
  corner: "red" | "blue";
  fighterName: string;
  fighterGym: string;
  fighterVa: string;
  fighterDoorgegeven: number | null;
  fighterGewogen: number | null;
  opponentName: string;
  opponentGym: string;
  opponentVa: string;
  opponentGewogen: number | null;
  discipline: string | null;
  klasse: string | null;
  bout: WeighInBout;
};

type StatusChipConfig = {
  key: string;
  label: string;
  bg: string;
  color: string;
  border: string;
};

type ParsedWeightClass =
  | { kind: "heavy"; threshold: number; label: string }
  | { kind: "max"; max: number; label: string }
  | { kind: "unknown"; label: string };

const KB_TM_MUAYTHAI_LIMITS: Array<{
  match: RegExp;
  max: number | null;
  openMin?: number;
}> = [
  { match: /super\s*heavy/i, max: null, openMin: 95.0 },
  { match: /junior\s*bantam/i, max: 52.16 },
  { match: /bantam/i, max: 53.52 },
  { match: /junior\s*feather/i, max: 55.34 },
  { match: /feather/i, max: 57.15 },
  { match: /junior\s*lightweight/i, max: 58.97 },
  { match: /lightweight/i, max: 61.23 },
  { match: /junior\s*welter/i, max: 63.5 },
  { match: /welter/i, max: 66.68 },
  { match: /junior\s*middle/i, max: 69.85 },
  { match: /super\s*light\s*heavy/i, max: 82.55 },
  { match: /light\s*heavy/i, max: 79.38 },
  { match: /middleweight\s*76(?:[.,]20)?/i, max: 76.2 },
  { match: /middleweight/i, max: 72.57 },
  { match: /cruiser/i, max: 86.18 },
  { match: /heavyweight/i, max: 95.0 },
];

function isYouthClassCode(v: string | null | undefined): boolean {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "j" || s === "j+" || s.includes("jeugd") || s.includes("junior");
}

function findKbTmMuaythaiLimit(label: string | null | undefined) {
  const s = String(label ?? "").trim();
  if (!s) return null;
  for (const row of KB_TM_MUAYTHAI_LIMITS) {
    if (row.match.test(s)) return row;
  }
  return null;
}

function pageBgStyle(): CSSProperties {
  return {
    background:
      "radial-gradient(circle at top, rgba(255,77,0,0.13) 0%, rgba(255,77,0,0) 24%), linear-gradient(180deg, #edf1f5 0%, #dfe5eb 100%)",
  };
}

function metalFrameStyle(): CSSProperties {
  return {
    border: "4px solid rgba(20,22,26,0.90)",
    borderRadius: 26,
    background:
      "radial-gradient(900px 300px at 50% -10%, rgba(255,77,0,0.16), transparent 55%), linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 20%, rgba(255,255,255,0.00) 42%, rgba(255,255,255,0.12) 70%, rgba(255,255,255,0.02) 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0.015) 5px), linear-gradient(180deg, #575b64 0%, #2b2f37 45%, #181b20 100%)",
    boxShadow:
      "0 20px 55px rgba(0,0,0,0.22), inset 0 0 0 2px rgba(255,255,255,0.14), inset 0 0 0 5px rgba(90,94,104,0.28), inset 0 -14px 22px rgba(0,0,0,0.30)",
  };
}

function metalInnerStyle(): CSSProperties {
  return {
    border: "3px solid rgba(20,22,26,0.34)",
    borderRadius: 20,
    background:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 6px), linear-gradient(180deg, #f8fafc 0%, #e7edf3 100%)",
    boxShadow:
      "inset 0 0 0 2px rgba(255,255,255,0.80), inset 0 0 0 6px rgba(0,0,0,0.08), inset 0 -12px 22px rgba(0,0,0,0.08)",
  };
}

function darkPanelStyle(): CSSProperties {
  return {
    background:
      "linear-gradient(180deg, rgba(47,50,58,0.98) 0%, rgba(30,32,37,0.98) 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
    borderRadius: 16,
  };
}

function silverCardStyle(): CSSProperties {
  return {
    background:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 6px), linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(237,242,247,0.98) 100%)",
    border: "2px solid rgba(0,0,0,0.15)",
    borderRadius: 18,
    boxShadow:
      "inset 0 0 0 1px rgba(255,255,255,0.75), inset 0 -10px 18px rgba(0,0,0,0.06)",
  };
}

function statsBoxStyle(): CSSProperties {
  return {
    background:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, rgba(255,255,255,0.04) 1px, rgba(255,255,255,0.04) 7px), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(233,238,243,0.96) 100%)",
    border: "2px solid rgba(0,0,0,0.12)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.85), 0 6px 18px rgba(0,0,0,0.06)",
  };
}

function normalizeRoleName(v: unknown): RoleName | "" {
  return String(v ?? "")
    .trim()
    .toLowerCase() as RoleName | "";
}

function safeText(v: unknown, fallback = "-") {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

function toPenalty(v: unknown): 0 | 1 {
  return Number(String(v ?? "0").trim()) === 1 ? 1 : 0;
}

function hasManualSanction(v: unknown): boolean {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function hasLiveManualSanction(
  row: WeighInBout,
  evalResult?: ReturnType<typeof evaluateWeighInBout> | null,
): boolean {
  // De live rules-engine is leidend.
  // Oude opgeslagen admin_sanctie_nodig waardes mogen geen 95+ partij blijven markeren
  // wanneer de actuele evaluatie zegt dat er géén sanctie nodig is.
  if (evalResult) return !!evalResult.adminSanctieNodig;
  return hasManualSanction(row.admin_sanctie_nodig);
}

function getLiveManualSanctionReason(
  row: WeighInBout,
  evalResult?: ReturnType<typeof evaluateWeighInBout> | null,
): string {
  return (
    evalResult?.adminSanctieReason ||
    row.admin_sanctie_reason ||
    "Handmatige beoordeling nodig."
  );
}

function fmtKg(v: number | string | null | undefined) {
  const n = toNum(v);
  if (n == null) return "-";
  return `${n.toFixed(1)} kg`;
}

function fmtCompact(v: number | string | null | undefined) {
  const n = toNum(v);
  if (n == null) return "-";
  return n.toFixed(1);
}

function parseWeightClass(
  klasse: string | null | undefined,
  fallbackMax: number | string | null | undefined,
): ParsedWeightClass {
  const raw = String(klasse ?? "").trim();
  const normalized = raw
    .toLowerCase()
    .replace(",", ".")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized) {
    const plus95 =
      /(?:^|\D)95(?:[.,]0+)?\s*\+(?:\D|$)/i.test(normalized) ||
      /\+\s*95(?:[.,]0+)?/i.test(normalized);
    if (
      plus95 ||
      normalized.includes("super heavyweight") ||
      normalized.includes("superheavyweight")
    ) {
      return {
        kind: "heavy",
        threshold: 95,
        label: raw || "95+",
      };
    }

    const namedLimit = findKbTmMuaythaiLimit(raw);
    if (namedLimit) {
      if (namedLimit.max == null) {
        return {
          kind: "heavy",
          threshold: namedLimit.openMin ?? 95,
          label: raw,
        };
      }

      return {
        kind: "max",
        max: namedLimit.max,
        label: raw,
      };
    }

    const minusMatch = normalized.match(/(?:^|\s)-\s*(\d+(?:\.\d+)?)(?:\s|$)/);
    if (minusMatch) {
      return {
        kind: "max",
        max: Number(minusMatch[1]),
        label: raw,
      };
    }

    const plusMatch = normalized.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*\+(?:\s|$)/);
    if (plusMatch) {
      const threshold = Number(plusMatch[1]);
      return {
        kind: "heavy",
        threshold,
        label: raw,
      };
    }
  }

  const fallback = toNum(fallbackMax);
  if (fallback != null) {
    const normalizedFallback = Math.abs(fallback);
    return {
      kind: "max",
      max: normalizedFallback,
      label: raw || `-${normalizedFallback}`,
    };
  }

  return {
    kind: "unknown",
    label: raw || "-",
  };
}

const WEIGHT_UPPER_TOLERANCE = 0.2;
const YOUTH_LOWER_OFFSET = 2.0;
const ADULT_LOWER_OFFSET = 3.0;

function getWeightRangeForUi(
  klasse: string | null | undefined,
  fallbackMax: number | string | null | undefined,
  leeftijdType?: string | null | undefined,
) {
  const parsed = parseWeightClass(klasse, fallbackMax);

  if (parsed.kind === "heavy") {
    return { min: parsed.threshold, max: null as number | null };
  }

  if (parsed.kind !== "max") {
    return { min: null as number | null, max: null as number | null };
  }

  // J en J+ zijn jeugd. Alle andere klassen/codes (N, R, A, C, B enz.)
  // vallen voor de weegmarge onder volwassenen: max - 3 kg t/m max + 0.2 kg.
  const isJeugd = isYouthClassCode(leeftijdType) || isYouthClassCode(klasse);
  const lowerOffset = isJeugd ? YOUTH_LOWER_OFFSET : ADULT_LOWER_OFFSET;

  return {
    min:
      lowerOffset == null
        ? null
        : Number((parsed.max - lowerOffset).toFixed(2)),
    max: Number((parsed.max + WEIGHT_UPPER_TOLERANCE).toFixed(2)),
  };
}


function getWeightRangeTextForUi(
  klasse: string | null | undefined,
  fallbackMax: number | string | null | undefined,
  leeftijdType?: string | null | undefined,
) {
  const range = getWeightRangeForUi(klasse, fallbackMax, leeftijdType);

  if (range.min == null && range.max == null) return "-";
  if (range.max == null) return `minimaal ${range.min?.toFixed(1)} kg`;
  if (range.min == null) return `maximaal ${range.max.toFixed(1)} kg`;

  return `${range.min.toFixed(1)} t/m ${range.max.toFixed(1)} kg`;
}

function isWeightOutsideClass(
  weight: number | null | undefined,
  klasse: string | null | undefined,
  fallbackMax: number | string | null | undefined,
  leeftijdType?: string | null | undefined,
) {
  if (weight == null || !Number.isFinite(weight)) return false;

  const range = getWeightRangeForUi(klasse, fallbackMax, leeftijdType);

  if (range.max == null) {
    return range.min != null ? Number(weight) < range.min : false;
  }

  return (
    (range.min != null && Number(weight) < range.min) ||
    Number(weight) > range.max
  );
}

function isOpenHeavyWeightClass(
  klasse: string | null | undefined,
  fallbackMax: number | string | null | undefined,
) {
  return parseWeightClass(klasse, fallbackMax).kind === "heavy";
}

function isTeLicht(
  gewogen: number | null | undefined,
  leeftijdType: string | null | undefined,
  klasse?: string | null | undefined,
  fallbackMax?: number | string | null | undefined,
) {
  if (isOpenHeavyWeightClass(klasse, fallbackMax)) return false;

  const w = toNum(gewogen);
  if (w == null) return false;

  const range = getWeightRangeForUi(klasse, fallbackMax, leeftijdType);
  if (range.min == null) return false;

  return w < range.min;
}

function getWeightClassHint(
  klasse: string | null | undefined,
  fallbackMax: number | string | null | undefined,
) {
  const parsed = parseWeightClass(klasse, fallbackMax);

  if (parsed.kind === "heavy") {
    return `${parsed.threshold}+ kg (heavyweight, minimum ${parsed.threshold} kg)`;
  }

  if (parsed.kind === "max") {
    return `max ${parsed.max} kg`;
  }

  return safeText(klasse);
}

function getWeightRuleTitle(row: WeighInBout | null) {
  const parsed = parseWeightClass(row?.klasse_mm, row?.max_gewicht);
  if (parsed.kind === "heavy") return "Gewichtsklasse";
  if (parsed.kind === "max") return "Max gewicht";
  return "Gewichtsregel";
}

function getWeightRuleValue(row: WeighInBout | null) {
  if (!row) return "-";
  const parsed = parseWeightClass(
    row.klasse_mm,
    row.max_gewicht_notatie ?? row.max_gewicht,
  );
  if (parsed.kind === "heavy") return `${parsed.threshold}+ heavyweight`;
  if (parsed.kind === "max") return `${parsed.max.toFixed(1)} kg`;
  return safeText(row.max_gewicht_notatie ?? row.klasse_mm ?? row.max_gewicht);
}

function formatDate(v: string | null) {
  if (!v) return "-";
  return new Date(v.length === 10 ? `${v}T00:00:00` : v).toLocaleDateString(
    "nl-NL",
  );
}

function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchText(value: unknown) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function splitSearchTokens(value: unknown) {
  return normalizeSearchText(value).split(/\s+/).filter(Boolean);
}

function getSearchWeightRank(item: FighterResult) {
  if (item.fighterGewogen == null) return 0;
  if (item.opponentGewogen == null) return 1;
  return 2;
}

function getFieldPrefixScore(field: string, query: string) {
  if (!field || !query) return 0;
  if (field === query) return 40;
  if (field.startsWith(query)) return 34;

  const words = field.split(" ").filter(Boolean);
  if (words.some((word) => word === query)) return 30;
  if (words.some((word) => word.startsWith(query))) return 26;
  if (field.includes(` ${query}`)) return 22;
  if (field.includes(query)) return 16;
  return 0;
}

function scoreTokenCoverage(tokens: string[], words: string[]) {
  if (!tokens.length || !words.length) return 0;

  let score = 0;
  const used = new Set<number>();

  for (const token of tokens) {
    let best = 0;
    let bestIndex = -1;

    for (let i = 0; i < words.length; i++) {
      if (used.has(i)) continue;
      const word = words[i];
      let candidate = 0;

      if (word === token) candidate = 18;
      else if (word.startsWith(token)) candidate = 15;
      else if (word.includes(token)) candidate = 9;
      else if (token.length >= 3 && token.startsWith(word)) candidate = 7;

      if (candidate > best) {
        best = candidate;
        bestIndex = i;
      }
    }

    if (best > 0 && bestIndex >= 0) {
      used.add(bestIndex);
      score += best;
    }
  }

  if (used.size === tokens.length) {
    score += 12;
  }

  return score;
}

function scoreFighterSearch(item: FighterResult, query: string) {
  const q = normalizeSearchText(query);
  if (!q) return 0;

  const queryTokens = splitSearchTokens(q);
  const compactQuery = compactSearchText(q);

  const fighterName = normalizeSearchText(item.fighterName);
  const fighterGym = normalizeSearchText(item.fighterGym);
  const fighterVa = compactSearchText(item.fighterVa);
  const partijNr = compactSearchText(String(item.partijNr));
  const opponentName = normalizeSearchText(item.opponentName);
  const opponentGym = normalizeSearchText(item.opponentGym);
  const cornerLabel =
    item.corner === "red" ? "rood rode hoek red" : "blauw blauwe hoek blue";

  const fighterNameWords = fighterName.split(" ").filter(Boolean);
  const fighterGymWords = fighterGym.split(" ").filter(Boolean);
  const opponentNameWords = opponentName.split(" ").filter(Boolean);
  const opponentGymWords = opponentGym.split(" ").filter(Boolean);

  let score = 0;

  if (fighterVa && fighterVa === compactQuery) score = Math.max(score, 180);
  else if (
    fighterVa &&
    fighterVa.startsWith(compactQuery) &&
    compactQuery.length >= 3
  ) {
    score = Math.max(score, 150);
  }

  if (partijNr && partijNr === compactQuery) score = Math.max(score, 138);

  if (fighterName === q) score = Math.max(score, 170);
  else if (fighterName.startsWith(q)) score = Math.max(score, 150);
  else if (fighterNameWords.some((word) => word === q))
    score = Math.max(score, 142);
  else if (fighterNameWords.some((word) => word.startsWith(q)))
    score = Math.max(score, 132);
  else if (fighterName.includes(` ${q}`)) score = Math.max(score, 122);
  else if (fighterName.includes(q)) score = Math.max(score, 112);

  const fighterTokenCoverage = scoreTokenCoverage(
    queryTokens,
    fighterNameWords,
  );
  if (fighterTokenCoverage > 0) {
    score = Math.max(score, 98 + fighterTokenCoverage);
  }

  const gymTokenCoverage = scoreTokenCoverage(queryTokens, fighterGymWords);
  if (fighterGym === q) score = Math.max(score, 126);
  else if (fighterGym.startsWith(q)) score = Math.max(score, 114);
  else if (fighterGymWords.some((word) => word === q))
    score = Math.max(score, 108);
  else if (fighterGymWords.some((word) => word.startsWith(q)))
    score = Math.max(score, 102);
  else if (fighterGym.includes(` ${q}`)) score = Math.max(score, 94);
  else if (fighterGym.includes(q)) score = Math.max(score, 84);
  if (gymTokenCoverage > 0) {
    score = Math.max(score, 78 + gymTokenCoverage);
  }

  const opponentTokenCoverage = scoreTokenCoverage(
    queryTokens,
    opponentNameWords,
  );
  if (opponentName === q) score = Math.max(score, 92);
  else if (opponentName.startsWith(q)) score = Math.max(score, 84);
  else if (opponentNameWords.some((word) => word === q))
    score = Math.max(score, 78);
  else if (opponentNameWords.some((word) => word.startsWith(q)))
    score = Math.max(score, 72);
  else if (opponentName.includes(` ${q}`)) score = Math.max(score, 66);
  else if (opponentName.includes(q)) score = Math.max(score, 60);
  if (opponentTokenCoverage > 0) {
    score = Math.max(score, 52 + opponentTokenCoverage);
  }

  const broadFields = [
    fighterName,
    fighterGym,
    opponentName,
    opponentGym,
    cornerLabel,
  ].filter(Boolean);
  for (const field of broadFields) {
    score = Math.max(score, getFieldPrefixScore(field, q));
  }

  const combinedFields = [
    fighterName,
    fighterGym,
    fighterVa,
    partijNr,
    opponentName,
    opponentGym,
    cornerLabel,
  ]
    .filter(Boolean)
    .join(" ");

  if (
    queryTokens.length > 1 &&
    queryTokens.every((token) => combinedFields.includes(token))
  ) {
    score = Math.max(score, 74 + queryTokens.length * 6);
  }

  if (score === 0 && compactQuery.length >= 2) {
    const compactCombined = compactSearchText(combinedFields);
    if (compactCombined.includes(compactQuery)) {
      score = Math.max(score, 42);
    }
  }

  if (score === 0) return 0;

  if (item.fighterGewogen == null) score += 24;
  else if (item.opponentGewogen == null) score += 8;

  return score;
}

function normalizeStatus(status: unknown): string {
  const s = String(status ?? "")
    .trim()
    .toUpperCase();

  if (!s) return "WACHT_OP_WEGEN";
  if (s === "OK") return "OK";
  if (s.includes("DISPENSATIE")) return "DISPENSATIE_NODIG";
  if (s.includes("AFKEUR")) return "AFKEUR";
  if (s.includes("DEELS")) return "DEELS_GEWOGEN";
  if (s.includes("WACHT")) return "WACHT_OP_WEGEN";
  if (s.includes("HANDMATIG")) return "HANDMATIGE_BEOORDELING";

  return s;
}

function getDispDecision(
  row: WeighInBout,
): "VERLEEND" | "AFGEWEZEN" | "NODIG" | null {
  const reason = String(row.dispensatie_reason ?? "")
    .trim()
    .toUpperCase();

  if (row.dispensatie_verleend || reason === "VERLEEND") return "VERLEEND";
  if (reason === "AFGEWEZEN") return "AFGEWEZEN";
  if (row.dispensatie_nodig) return "NODIG";
  return null;
}

function getDraftsFromRows(rows: WeighInBout[]): Record<string, DraftState> {
  const next: Record<string, DraftState> = {};
  for (const row of rows) {
    next[row.id] = {
      rood:
        row.rood_gewogen_gewicht != null
          ? String(row.rood_gewogen_gewicht)
          : "",
      blauw:
        row.blauw_gewogen_gewicht != null
          ? String(row.blauw_gewogen_gewicht)
          : "",
      note: row.weging_notitie ?? "",
      strafpuntRood: String(toPenalty(row.gewicht_strafpunt_rood)) as "0" | "1",
      strafpuntBlauw: String(toPenalty(row.gewicht_strafpunt_blauw)) as
        | "0"
        | "1",
    };
  }
  return next;
}

function getRowCompletionRank(row: WeighInBout) {
  const hasRood = row.rood_gewogen_gewicht != null;
  const hasBlauw = row.blauw_gewogen_gewicht != null;
  if (!hasRood && !hasBlauw) return 0;
  if (!hasRood || !hasBlauw) return 1;
  return 2;
}

function dedupeRows(rows: WeighInBout[]) {
  const map = new Map<string, WeighInBout>();

  for (const row of rows) {
    const key = `${row.matchmaking_id}__${row.partij_nr}`;
    const prev = map.get(key);

    if (!prev) {
      map.set(key, row);
      continue;
    }

    const prevRank = getRowCompletionRank(prev);
    const nextRank = getRowCompletionRank(row);

    if (nextRank > prevRank) {
      map.set(key, row);
      continue;
    }

    if (nextRank < prevRank) continue;

    const prevUpdated = new Date(prev.laatste_bewerking_op ?? 0).getTime();
    const nextUpdated = new Date(row.laatste_bewerking_op ?? 0).getTime();

    if (nextUpdated >= prevUpdated) {
      map.set(key, row);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.partij_nr - b.partij_nr);
}

function statusChipFromRowOrEval(
  row: WeighInBout,
  evalStatus?: string,
): StatusChipConfig {
  const rowStatus = normalizeStatus(
    row.eindstatus || row.praktijk_status || row.reglement_status,
  );
  const normalizedEval = normalizeStatus(evalStatus);
  const dispDecision = getDispDecision(row);

  // De live evaluatie is leidend voor de UI.
  // Anders kan een oude opgeslagen AFKEUR/HANDMATIG blijven hangen terwijl 95+ live OK is.
  let finalStatus = normalizedEval || rowStatus || "WACHT_OP_WEGEN";

  if (dispDecision === "VERLEEND") {
    finalStatus = "OK";
  } else if (dispDecision === "AFGEWEZEN") {
    finalStatus = "AFKEUR";
  } else if (dispDecision === "NODIG" && finalStatus !== "AFKEUR") {
    finalStatus = "DISPENSATIE_NODIG";
  }

  switch (finalStatus) {
    case "OK":
      return {
        key: finalStatus,
        label: "OK",
        bg: "#dcfce7",
        color: "#166534",
        border: "#86efac",
      };

    case "DISPENSATIE_NODIG":
      return {
        key: finalStatus,
        label: "Dispensatie",
        bg: "#fef3c7",
        color: "#92400e",
        border: "#fcd34d",
      };

    case "AFKEUR":
      return {
        key: finalStatus,
        label: "Afkeur",
        bg: "#fee2e2",
        color: "#991b1b",
        border: "#fca5a5",
      };

    case "DEELS_GEWOGEN":
      return {
        key: finalStatus,
        label: "Deels gewogen",
        bg: "#fef3c7",
        color: "#92400e",
        border: "#fcd34d",
      };

    case "WACHT_OP_WEGEN":
      return {
        key: finalStatus,
        label: "Te wegen",
        bg: "#dbeafe",
        color: "#1e40af",
        border: "#93c5fd",
      };

    case "HANDMATIGE_BEOORDELING":
      return {
        key: finalStatus,
        label: "Handmatig",
        bg: "#ede9fe",
        color: "#5b21b6",
        border: "#c4b5fd",
      };

    default:
      return {
        key: finalStatus,
        label: finalStatus || "Onbekend",
        bg: "#e5e7eb",
        color: "#374151",
        border: "#cbd5e1",
      };
  }
}

function getLiveEval(row: WeighInBout, draft?: DraftState) {
  return evaluateWeighInBout({
    discipline: row.discipline,
    klasse_mm: row.klasse_mm,
    leeftijd_type: row.leeftijd_type,
    max_gewicht: toNum(row.max_gewicht),
    max_gewicht_notatie: row.max_gewicht_notatie ?? null,
    rood_doorgegeven_gewicht: toNum(row.rood_doorgegeven_gewicht),
    blauw_doorgegeven_gewicht: toNum(row.blauw_doorgegeven_gewicht),
    rood_gewogen_gewicht: draft ? toNum(draft.rood) : toNum(row.rood_gewogen_gewicht),
    blauw_gewogen_gewicht: draft
      ? toNum(draft.blauw)
      : toNum(row.blauw_gewogen_gewicht),
    dispensatie_verleend: row.dispensatie_verleend,
  });
}

function getLiveDispState(
  row: WeighInBout,
  evalResult?: ReturnType<typeof evaluateWeighInBout>,
): "VERLEEND" | "AFGEWEZEN" | "NODIG" | null {
  const saved = getDispDecision(row);
  if (saved === "VERLEEND" || saved === "AFGEWEZEN") return saved;
  if (saved === "NODIG") return "NODIG";
  if (normalizeStatus(evalResult?.eindStatus) === "DISPENSATIE_NODIG")
    return "NODIG";
  return null;
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl p-3 text-center" style={statsBoxStyle()}>
      <div style={{ color, fontWeight: 900, fontSize: 24, lineHeight: 1.1 }}>
        {value}
      </div>
      <div
        style={{
          color: "rgba(0,0,0,0.52)",
          fontSize: 12,
          marginTop: 4,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone = "dark",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "dark" | "orange" | "green" | "red";
  className?: string;
}) {
  const styles =
    tone === "orange"
      ? {
          background: "linear-gradient(180deg, #ff6a2b 0%, #ff4d00 100%)",
          border: "1px solid #c93e00",
          color: "#111",
        }
      : tone === "green"
        ? {
            background: "#16a34a",
            border: "1px solid #15803d",
            color: "#fff",
          }
        : tone === "red"
          ? {
              background: "#dc2626",
              border: "1px solid #b91c1c",
              color: "#fff",
            }
          : {
              background: "linear-gradient(180deg, #3d434d 0%, #22262d 100%)",
              border: "1px solid rgba(0,0,0,0.45)",
              color: "#fff",
            };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center whitespace-nowrap px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        borderRadius: 4,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
        ...styles,
      }}
    >
      {children}
    </button>
  );
}

type FighterComplianceBadges = {
  licentieOk: boolean;
  licentieLabel: string;
  startverbod: boolean;
  startverbodLabel: string;
  keurmerkOk: boolean;
  keurmerkLabel: string;
};

function firstFilledValue(...values: unknown[]) {
  for (const value of values) {
    const s = String(value ?? "").trim();
    if (s) return value;
  }
  return null;
}

function isLicentieOk(value: unknown) {
  // controle_bout_context gebruikt rood_licentie/blauw_licentie als tekst.
  // Alleen Ja/true/1 telt als geldige licentie. Nee, null, leeg of onbekend is fout.
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;

  const s = String(value).trim().toLowerCase();
  return s === "ja" || s === "true" || s === "1" || s === "yes";
}

function isKeurmerkOk(value: unknown) {
  // Keurmerk komt uit controle_bout_context.keurmerk_rood/keurmerk_blauw.
  // Alleen echte true is goed. false, null, leeg of onbekend is fout.
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;

  const s = String(value).trim().toLowerCase();
  return s === "true" || s === "1" || s === "ja" || s === "yes";
}

function isStartverbodValue(value: unknown) {
  if (value === true) return true;
  if (value === false || value == null) return false;

  const s = String(value).trim().toLowerCase();
  if (!s) return false;

  if (["0", "false", "nee", "no", "geen", "geen startverbod", "nvt", "n.v.t.", "ok"].includes(s)) {
    return false;
  }

  return s.includes("startverbod") || ["1", "true", "ja", "yes", "actief"].includes(s);
}

function getFighterComplianceBadges(
  row: WeighInBout,
  corner: "red" | "blue",
): FighterComplianceBadges {
  const anyRow = row as any;
  const nlPrefix = corner === "red" ? "rood" : "blauw";

  const licentieValue = firstFilledValue(
    anyRow[`${nlPrefix}_licentie`],
    anyRow[`${nlPrefix}_heeft_licentie`],
    anyRow[`licentie_${nlPrefix}`],
  );

  const keurmerkValue = firstFilledValue(
    anyRow[`keurmerk_${nlPrefix}`],
    anyRow[`${nlPrefix}_keurmerk`],
    anyRow[`${nlPrefix}_heeft_keurmerk`],
  );

  const startverbodValue = firstFilledValue(
    anyRow[`${nlPrefix}_heeft_startverbod`],
    anyRow[`startverbod_${nlPrefix}`],
    anyRow[`${nlPrefix}_startverbod`],
    anyRow[`${nlPrefix}_start_verbod`],
  );

  const licentieOk = isLicentieOk(licentieValue);
  const startverbod = isStartverbodValue(startverbodValue);
  const keurmerkOk = isKeurmerkOk(keurmerkValue);

  return {
    licentieOk,
    licentieLabel: licentieOk ? "Licentie OK" : "Geen licentie",
    startverbod,
    startverbodLabel: startverbod ? "STARTVERBOD" : "Geen startverbod",
    keurmerkOk,
    keurmerkLabel: keurmerkOk ? "Keurmerk OK" : "Geen keurmerk",
  };
}

const COMPLIANCE_FIELDS_TO_KEEP: Array<keyof WeighInBout> = [
  "rood_licentie",
  "blauw_licentie",
  "rood_heeft_licentie",
  "blauw_heeft_licentie",
  "rood_startverbod",
  "blauw_startverbod",
  "rood_heeft_startverbod",
  "blauw_heeft_startverbod",
  "rood_keurmerk",
  "blauw_keurmerk",
  "rood_heeft_keurmerk",
  "blauw_heeft_keurmerk",
  "licentie_rood",
  "licentie_blauw",
  "keurmerk_rood",
  "keurmerk_blauw",
  "startverbod_rood",
  "startverbod_blauw",
];

function mergeBoutKeepingCompliance(
  previous: WeighInBout,
  updated: WeighInBout,
): WeighInBout {
  const merged: WeighInBout = { ...previous, ...updated };

  // De update API wijzigt alleen weegvelden. Als de response geen badgevelden
  // bevat of null teruggeeft, behouden we de status van de geselecteerde vechter.
  // Daardoor schieten licentie/keurmerk/startverbod badges niet tijdelijk naar rood
  // tijdens of direct na gewicht opslaan.
  for (const key of COMPLIANCE_FIELDS_TO_KEEP) {
    const nextValue = updated[key];
    const nextText = String(nextValue ?? "").trim();
    if (nextValue === undefined || nextValue === null || nextText === "") {
      (merged as any)[key] = (previous as any)[key];
    }
  }

  return merged;
}


function ComplianceBadge({
  label,
  ok,
  dangerWhenOk = false,
}: {
  label: string;
  ok: boolean;
  dangerWhenOk?: boolean;
}) {
  const isDanger = dangerWhenOk ? ok : !ok;

  return (
    <span
      className="inline-flex items-center justify-center whitespace-nowrap px-3 py-1 text-[11px] font-black uppercase tracking-[0.04em]"
      style={{
        borderRadius: 4,
        background: isDanger
          ? "linear-gradient(180deg, #fee2e2 0%, #fecaca 100%)"
          : "linear-gradient(180deg, #dcfce7 0%, #bbf7d0 100%)",
        color: isDanger ? "#991b1b" : "#166534",
        border: isDanger ? "1px solid #f87171" : "1px solid #86efac",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)",
      }}
    >
      {label}
    </span>
  );
}

export default function WeegstationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchmakingId = String(params?.matchmakingId ?? "");
  const activeInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [header, setHeader] = useState<MatchmakingHeader | null>(null);
  const [rows, setRows] = useState<WeighInBout[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [roleNames, setRoleNames] = useState<RoleName[]>([]);
  const [myBondteam, setMyBondteam] = useState("");

  const [search, setSearch] = useState("");
  const [selectedFighter, setSelectedFighter] = useState<FighterResult | null>(
    null,
  );

  const isHoofdofficialOrSuperadmin = useMemo(
    () =>
      roleNames.includes("hoofdofficial") || roleNames.includes("superadmin"),
    [roleNames],
  );

  // Matchmakers can view weegstation read-only but cannot edit weights, penalties or dispensaties
  const isMatchmakerOnly = useMemo(
    () =>
      roleNames.includes("matchmaker") &&
      !roleNames.some((r) =>
        [
          "official",
          "hoofdofficial",
          "admin",
          "superadmin",
          "dispensatie_admin",
        ].includes(r),
      ),
    [roleNames],
  );

  const canAccess = useMemo(
    () =>
      roleNames.some((r) =>
        [
          "official",
          "hoofdofficial",
          "admin",
          "superadmin",
          "dispensatie_admin",
          "matchmaker",
        ].includes(r),
      ),
    [roleNames],
  );

  function getDraft(rowId: string): DraftState {
    return (
      drafts[rowId] ?? {
        rood: "",
        blauw: "",
        note: "",
        strafpuntRood: "0",
        strafpuntBlauw: "0",
      }
    );
  }

  function setDraft(rowId: string, patch: Partial<DraftState>) {
    setDrafts((prev) => ({
      ...prev,
      [rowId]: { ...getDraft(rowId), ...patch },
    }));
  }

  async function fetchRows(mmId: string) {
    const { data, error } = await supabase
      .from("weigh_in_bouts")
      .select("*")
      .eq("matchmaking_id", mmId)
      .order("partij_nr", { ascending: true });

    if (error) throw error;

    const baseRows = dedupeRows((data ?? []) as WeighInBout[]);

    if (baseRows.length === 0) return baseRows;

    const controleRunIds = Array.from(
      new Set(
        baseRows
          .map((row) => String((row as any)?.controle_run_id ?? "").trim())
          .filter(Boolean),
      ),
    );

    let controleQuery = supabase
      .from("controle_bout_context")
      .select(
        "id, controle_run_id, bout_id, partij_nr, created_at, updated_at, rood_licentie, blauw_licentie, rood_heeft_startverbod, blauw_heeft_startverbod, keurmerk_rood, keurmerk_blauw",
      )
      .eq("matchmaking_id", mmId)
      .order("created_at", { ascending: false });

    // Wanneer weigh_in_bouts aan een controle_run gekoppeld is, gebruik dan exact
    // die run. Zo pakken we niet per ongeluk een oude contextregel zonder badges.
    if (controleRunIds.length > 0) {
      controleQuery = controleQuery.in("controle_run_id", controleRunIds);
    }

    const { data: controleRows, error: controleErr } = await controleQuery;

    if (controleErr) {
      console.warn(
        "Controle context voor weegstation badges kon niet geladen worden:",
        controleErr.message,
      );
      return baseRows;
    }

    const hasUsableBadgeData = (ctx: any) =>
      ctx?.rood_licentie != null ||
      ctx?.blauw_licentie != null ||
      ctx?.rood_heeft_startverbod != null ||
      ctx?.blauw_heeft_startverbod != null ||
      ctx?.keurmerk_rood != null ||
      ctx?.keurmerk_blauw != null;

    const applyControleBadges = (row: WeighInBout, ctx: any): WeighInBout => ({
      ...row,
      rood_licentie: ctx.rood_licentie ?? row.rood_licentie,
      blauw_licentie: ctx.blauw_licentie ?? row.blauw_licentie,
      rood_heeft_startverbod:
        ctx.rood_heeft_startverbod ?? row.rood_heeft_startverbod,
      blauw_heeft_startverbod:
        ctx.blauw_heeft_startverbod ?? row.blauw_heeft_startverbod,
      keurmerk_rood: ctx.keurmerk_rood ?? row.keurmerk_rood,
      keurmerk_blauw: ctx.keurmerk_blauw ?? row.keurmerk_blauw,
    });

    return baseRows.map((row) => {
      const rowControleRunId = String((row as any)?.controle_run_id ?? "").trim();
      const rowBoutId = String((row as any)?.bout_id ?? "").trim();
      const rowPartijNr = Number(row.partij_nr);

      // 1. Beste match: dezelfde controle_run + bout_id.
      // 2. Daarna: dezelfde controle_run + partij_nr.
      // 3. Fallback: bout_id of partij_nr, maar alleen als er bruikbare badge-data is.
      const ctx =
        (controleRows ?? []).find((c: any) => {
          const sameRun =
            !rowControleRunId ||
            String(c?.controle_run_id ?? "").trim() === rowControleRunId;
          const sameBout =
            rowBoutId && String(c?.bout_id ?? "").trim() === rowBoutId;
          return sameRun && sameBout && hasUsableBadgeData(c);
        }) ??
        (controleRows ?? []).find((c: any) => {
          const sameRun =
            !rowControleRunId ||
            String(c?.controle_run_id ?? "").trim() === rowControleRunId;
          const samePartij = Number(c?.partij_nr) === rowPartijNr;
          return sameRun && samePartij && hasUsableBadgeData(c);
        }) ??
        (controleRows ?? []).find((c: any) => {
          const sameBout =
            rowBoutId && String(c?.bout_id ?? "").trim() === rowBoutId;
          return sameBout && hasUsableBadgeData(c);
        }) ??
        (controleRows ?? []).find((c: any) => {
          const samePartij = Number(c?.partij_nr) === rowPartijNr;
          return samePartij && hasUsableBadgeData(c);
        });

      return ctx ? applyControleBadges(row, ctx) : row;
    });
  }

  async function hydrateRows(mmId: string) {
    const nextRows = await fetchRows(mmId);
    setRows(nextRows);
    setDrafts(getDraftsFromRows(nextRows));
    return nextRows;
  }

  async function refreshRows(manual = false) {
    if (!matchmakingId) return;

    setSyncing(true);
    setError(null);
    setNotice(null);

    try {
      const res = await authedFetch("/api/officials/weegstation/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmakingId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "Weeglijst opbouwen mislukt.");

      // Na het opbouwen halen we de rijen opnieuw via fetchRows op.
      // fetchRows verrijkt weigh_in_bouts met controle_bout_context,
      // zodat licentie/keurmerk/startverbod badges niet leeg blijven.
      const nextRows = await hydrateRows(matchmakingId);

      setNotice(
        manual
          ? `Weeglijst ververst (${nextRows.length} partijen).`
          : `Weeglijst opgebouwd (${nextRows.length} partijen).`,
      );
    } catch (e: any) {
      setError(e?.message ?? "Weeglijst verversen mislukt.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      setNotice(null);

      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id;

        if (!uid) {
          router.push("/login");
          return;
        }

        const { data: profile, error: profileErr } = await supabase
          .from("user_profiles")
          .select("id, bondteam")
          .eq("id", uid)
          .single();

        if (profileErr) throw profileErr;
        setMyBondteam(String(profile?.bondteam ?? "").trim());

        const { data: userRoles, error: urErr } = await supabase
          .from("user_roles")
          .select("role_id")
          .eq("user_id", uid);

        if (urErr) throw urErr;

        const roleIds = (userRoles ?? [])
          .map((r: any) => r.role_id)
          .filter(Boolean);
        let names: RoleName[] = [];

        if (roleIds.length > 0) {
          const { data: rolesRows, error: rolesErr } = await supabase
            .from("roles")
            .select("id, name")
            .in("id", roleIds);

          if (rolesErr) throw rolesErr;

          names = (rolesRows ?? [])
            .map((r: any) => normalizeRoleName(r?.name))
            .filter(Boolean) as RoleName[];
        }

        setRoleNames(names);

        if (
          !names.some((r) =>
            [
              "official",
              "hoofdofficial",
              "admin",
              "superadmin",
              "dispensatie_admin",
              "matchmaker",
            ].includes(r),
          )
        ) {
          throw new Error("Je hebt geen toegang tot de weeglijst.");
        }

        const { data: mm, error: mmErr } = await supabase
          .from("matchmaking_uploads")
          .select(
            "matchmaking_id, bondteam, evenement_naam, evenement_datum, locatie",
          )
          .eq("matchmaking_id", matchmakingId)
          .single();

        if (mmErr) throw mmErr;
        setHeader(mm as MatchmakingHeader);

        const mmBondteam = String(mm?.bondteam ?? "")
          .trim()
          .toLowerCase();
        const adminAccess = names.some((r) =>
          ["admin", "superadmin", "dispensatie_admin"].includes(r),
        );
        const teamAccess =
          names.some((r) => r === "official" || r === "hoofdofficial") &&
          mmBondteam &&
          mmBondteam ===
            String(profile?.bondteam ?? "")
              .trim()
              .toLowerCase();
        // Matchmakers get read-only access to any weegstation
        const matchmakerAccess = names.includes("matchmaker");

        if (!adminAccess && !teamAccess && !matchmakerAccess) {
          throw new Error(
            "Je mag alleen matchmakings van je eigen bondteam zien en bewerken.",
          );
        }

        const existingRows = await hydrateRows(matchmakingId);
        if (existingRows.length === 0) {
          await refreshRows(false);
        }
      } catch (e: any) {
        setError(e?.message ?? "Fout bij laden van de weeglijst.");
      } finally {
        setLoading(false);
      }
    }

    if (matchmakingId) {
      load();
    }
  }, [matchmakingId, router]);

  const fighterResults = useMemo(() => {
    const list: FighterResult[] = [];

    for (const row of rows) {
      const draft = getDraft(row.id);
      const liveRood = toNum(draft.rood);
      const liveBlauw = toNum(draft.blauw);

      list.push({
        boutId: row.id,
        partijNr: row.partij_nr,
        corner: "red",
        fighterName: safeText(row.rood_naam, ""),
        fighterGym: safeText(row.rood_gym, ""),
        fighterVa: safeText(row.rood_va, ""),
        fighterDoorgegeven: toNum(row.rood_doorgegeven_gewicht),
        fighterGewogen: liveRood,
        opponentName: safeText(row.blauw_naam, "-"),
        opponentGym: safeText(row.blauw_gym, "-"),
        opponentVa: safeText(row.blauw_va, "-"),
        opponentGewogen: liveBlauw,
        discipline: row.discipline,
        klasse: row.klasse_mm,
        bout: row,
      });

      list.push({
        boutId: row.id,
        partijNr: row.partij_nr,
        corner: "blue",
        fighterName: safeText(row.blauw_naam, ""),
        fighterGym: safeText(row.blauw_gym, ""),
        fighterVa: safeText(row.blauw_va, ""),
        fighterDoorgegeven: toNum(row.blauw_doorgegeven_gewicht),
        fighterGewogen: liveBlauw,
        opponentName: safeText(row.rood_naam, "-"),
        opponentGym: safeText(row.rood_gym, "-"),
        opponentVa: safeText(row.rood_va, "-"),
        opponentGewogen: liveRood,
        discipline: row.discipline,
        klasse: row.klasse_mm,
        bout: row,
      });
    }

    return list;
  }, [rows, drafts]);

  const searchSuggestions = useMemo(() => {
    const q = search.trim();

    const sortBaseResults = (a: FighterResult, b: FighterResult) => {
      const aWeightRank = getSearchWeightRank(a);
      const bWeightRank = getSearchWeightRank(b);
      if (aWeightRank !== bWeightRank) return aWeightRank - bWeightRank;

      const aCompletion = getRowCompletionRank(a.bout);
      const bCompletion = getRowCompletionRank(b.bout);
      if (aCompletion !== bCompletion) return aCompletion - bCompletion;

      const aCorner = a.corner === "red" ? 0 : 1;
      const bCorner = b.corner === "red" ? 0 : 1;
      if (a.partijNr !== b.partijNr) return a.partijNr - b.partijNr;
      return aCorner - bCorner;
    };

    const base = [...fighterResults].sort(sortBaseResults);

    if (!q) return base.slice(0, 24);

    return base
      .map((item) => ({ item, score: scoreFighterSearch(item, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => {
        const aWeightRank = getSearchWeightRank(a.item);
        const bWeightRank = getSearchWeightRank(b.item);
        if (aWeightRank !== bWeightRank) return aWeightRank - bWeightRank;

        if (b.score !== a.score) return b.score - a.score;

        const aCompletion = getRowCompletionRank(a.item.bout);
        const bCompletion = getRowCompletionRank(b.item.bout);
        if (aCompletion !== bCompletion) return aCompletion - bCompletion;

        const aCorner = a.item.corner === "red" ? 0 : 1;
        const bCorner = b.item.corner === "red" ? 0 : 1;
        if (a.item.partijNr !== b.item.partijNr)
          return a.item.partijNr - b.item.partijNr;
        return aCorner - bCorner;
      })
      .slice(0, 24)
      .map((x) => x.item);
  }, [fighterResults, search]);

  const counts = useMemo(() => {
    let nogNiet = 0;
    let deels = 0;
    let volledig = 0;
    let dispensaties = 0;
    let afkeur = 0;
    let handmatig = 0;

    for (const row of rows) {
      const draft = getDraft(row.id);
      const evalResult = getLiveEval(row, draft);
      const chip = statusChipFromRowOrEval(row, evalResult?.eindStatus);
      const dispDecision = getLiveDispState(row, evalResult);

      if (chip.key === "WACHT_OP_WEGEN") nogNiet++;
      else if (chip.key === "DEELS_GEWOGEN") deels++;
      else volledig++;

      if (dispDecision === "NODIG" || dispDecision === "VERLEEND") {
        dispensaties++;
      }

      if (chip.key === "AFKEUR") {
        afkeur++;
      }

      if (hasLiveManualSanction(row, evalResult)) {
        handmatig++;
      }
    }

    return { nogNiet, deels, volledig, dispensaties, afkeur, handmatig };
  }, [rows, drafts]);

  function selectFighter(item: FighterResult) {
    // Gebruik altijd de meest actuele row uit state. Daarmee krijgt de geselecteerde
    // vechter direct de verrijkte licentie/keurmerk/startverbod badges uit
    // controle_bout_context, ook vóór de eerste keer opslaan.
    const currentRow = rows.find((row) => row.id === item.boutId) ?? item.bout;
    setSelectedFighter({ ...item, bout: currentRow });
    setTimeout(() => activeInputRef.current?.focus(), 40);
  }

  const selectedRow = selectedFighter
    ? (rows.find((r) => r.id === selectedFighter.boutId) ?? null)
    : null;

  const selectedDraft = selectedRow ? getDraft(selectedRow.id) : null;

  const selectedEval =
    selectedRow && selectedDraft
      ? getLiveEval(selectedRow, selectedDraft)
      : null;

  const activeWeightValue =
    selectedFighter?.corner === "red"
      ? (selectedDraft?.rood ?? "")
      : (selectedDraft?.blauw ?? "");

  const activePenaltyValue =
    selectedFighter?.corner === "red"
      ? (selectedDraft?.strafpuntRood ?? "0")
      : (selectedDraft?.strafpuntBlauw ?? "0");

  const activeWeightNumber = toNum(activeWeightValue);
  const selectedWeightClass = selectedRow
    ? parseWeightClass(
        selectedRow.klasse_mm,
        selectedRow.max_gewicht_notatie ?? selectedRow.max_gewicht,
      )
    : null;
  const selectedIsOpenHeavyClass = selectedWeightClass?.kind === "heavy";
  const selectedIsOutsideWeightClass =
    !!selectedRow &&
    isWeightOutsideClass(
      activeWeightNumber,
      selectedRow.klasse_mm,
      selectedRow.max_gewicht_notatie ?? selectedRow.max_gewicht,
      selectedRow.leeftijd_type,
    );

  const isTooLight =
    !!selectedRow &&
    (selectedFighter?.corner === "red"
      ? isTeLicht(
          activeWeightNumber,
          selectedRow.leeftijd_type,
          selectedRow.klasse_mm,
          selectedRow.max_gewicht_notatie ?? selectedRow.max_gewicht,
        )
      : isTeLicht(
          activeWeightNumber,
          selectedRow.leeftijd_type,
          selectedRow.klasse_mm,
          selectedRow.max_gewicht_notatie ?? selectedRow.max_gewicht,
        ));

  const selectedEvalPenaltyApplies =
    !!selectedEval &&
    !!selectedEval.canProceedWithPenalty &&
    !selectedEval.adminSanctieNodig &&
    (selectedFighter?.corner === "red"
      ? !!selectedEval.nietOpGewichtRood
      : !!selectedEval.nietOpGewichtBlauw);

  const selectedCanAssignPenalty =
    !!selectedRow &&
    (selectedIsOutsideWeightClass ||
      isTooLight ||
      (!selectedIsOpenHeavyClass && selectedEvalPenaltyApplies));

  const selectedDispState =
    selectedRow && selectedEval
      ? getLiveDispState(selectedRow, selectedEval)
      : null;

  const selectedComplianceBadges =
    selectedRow && selectedFighter
      ? getFighterComplianceBadges(selectedRow, selectedFighter.corner)
      : null;

  async function saveSelected() {
    if (!selectedRow || !selectedDraft) return;

    setSavingId(selectedRow.id);
    setError(null);
    setNotice(null);

    try {
      const penaltyPayload = isHoofdofficialOrSuperadmin
        ? {
            gewicht_strafpunt_rood: toPenalty(selectedDraft.strafpuntRood),
            gewicht_strafpunt_blauw: toPenalty(selectedDraft.strafpuntBlauw),
          }
        : {};

      const res = await authedFetch("/api/officials/weegstation/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRow.id,
          rood_gewogen_gewicht: toNum(selectedDraft.rood),
          blauw_gewogen_gewicht: toNum(selectedDraft.blauw),
          weging_notitie: selectedDraft.note,
          ...penaltyPayload,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Opslaan mislukt.");

      const updated = json?.bout as WeighInBout;
      if (!updated) throw new Error("Geen bijgewerkte partij ontvangen.");

      const safeUpdated = mergeBoutKeepingCompliance(selectedRow, updated);

      setRows((prev) =>
        prev.map((r) =>
          r.id === safeUpdated.id ? mergeBoutKeepingCompliance(r, safeUpdated) : r,
        ),
      );
      setDrafts((prev) => ({
        ...prev,
        [safeUpdated.id]: {
          rood:
            safeUpdated.rood_gewogen_gewicht != null
              ? String(safeUpdated.rood_gewogen_gewicht)
              : "",
          blauw:
            safeUpdated.blauw_gewogen_gewicht != null
              ? String(safeUpdated.blauw_gewogen_gewicht)
              : "",
          note: safeUpdated.weging_notitie ?? "",
          strafpuntRood: String(toPenalty(safeUpdated.gewicht_strafpunt_rood)) as
            | "0"
            | "1",
          strafpuntBlauw: String(toPenalty(safeUpdated.gewicht_strafpunt_blauw)) as
            | "0"
            | "1",
        },
      }));

      setSelectedFighter((prev) => {
        if (!prev || prev.boutId !== safeUpdated.id) return prev;
        return {
          ...prev,
          bout: safeUpdated,
          fighterGewogen:
            prev.corner === "red"
              ? toNum(safeUpdated.rood_gewogen_gewicht)
              : toNum(safeUpdated.blauw_gewogen_gewicht),
          opponentGewogen:
            prev.corner === "red"
              ? toNum(safeUpdated.blauw_gewogen_gewicht)
              : toNum(safeUpdated.rood_gewogen_gewicht),
        };
      });

      setNotice(`Partij ${safeUpdated.partij_nr} opgeslagen.`);
    } catch (e: any) {
      setError(e?.message ?? "Opslaan mislukt.");
    } finally {
      setSavingId(null);
    }
  }

  async function decideDispensation(
    rowId: string,
    decision: "approved" | "rejected",
  ) {
    setSavingId(rowId);
    setError(null);
    setNotice(null);

    try {
      const res = await authedFetch("/api/officials/weegstation/dispensatie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rowId,
          decision,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "Dispensatie beslissing mislukt.");

      const updated = json?.bout as WeighInBout;
      if (!updated) throw new Error("Geen bijgewerkte partij ontvangen.");

      const previousRow = rows.find((r) => r.id === updated.id);
      const safeUpdated = previousRow
        ? mergeBoutKeepingCompliance(previousRow, updated)
        : updated;

      setRows((prev) =>
        prev.map((r) =>
          r.id === safeUpdated.id ? mergeBoutKeepingCompliance(r, safeUpdated) : r,
        ),
      );
      setDrafts((prev) => ({
        ...prev,
        [safeUpdated.id]: {
          rood:
            safeUpdated.rood_gewogen_gewicht != null
              ? String(safeUpdated.rood_gewogen_gewicht)
              : "",
          blauw:
            safeUpdated.blauw_gewogen_gewicht != null
              ? String(safeUpdated.blauw_gewogen_gewicht)
              : "",
          note: safeUpdated.weging_notitie ?? "",
          strafpuntRood: String(toPenalty(safeUpdated.gewicht_strafpunt_rood)) as
            | "0"
            | "1",
          strafpuntBlauw: String(toPenalty(safeUpdated.gewicht_strafpunt_blauw)) as
            | "0"
            | "1",
        },
      }));
      setSelectedFighter((prev) => {
        if (!prev || prev.boutId !== safeUpdated.id) return prev;
        return {
          ...prev,
          bout: safeUpdated,
          fighterGewogen:
            prev.corner === "red"
              ? toNum(safeUpdated.rood_gewogen_gewicht)
              : toNum(safeUpdated.blauw_gewogen_gewicht),
          opponentGewogen:
            prev.corner === "red"
              ? toNum(safeUpdated.blauw_gewogen_gewicht)
              : toNum(safeUpdated.rood_gewogen_gewicht),
        };
      });

      setNotice(
        decision === "approved"
          ? `Dispensatie goedgekeurd voor partij ${safeUpdated.partij_nr}. Partij staat nu op OK.`
          : `Dispensatie afgekeurd voor partij ${safeUpdated.partij_nr}. Partij staat nu op afkeur.`,
      );
    } catch (e: any) {
      setError(e?.message ?? "Dispensatie beslissing mislukt.");
    } finally {
      setSavingId(null);
    }
  }

  async function completeWeighIn() {
    if (!isHoofdofficialOrSuperadmin) {
      setError("Alleen hoofdofficial of superadmin mag de weging afsluiten.");
      setNotice(null);
      return;
    }

    if (finalizing) return;

    setFinalizing(true);
    setError(null);
    setNotice(null);

    try {
      const res = await authedFetch("/api/officials/weegstation/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmakingId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Weging afsluiten mislukt.");

      const openUrl =
        typeof json?.open_url === "string" && json.open_url.trim()
          ? json.open_url.trim()
          : `/dashboard/officials/controle/${matchmakingId}`;

      router.push(openUrl);
      return;
    } catch (e: any) {
      setError(e?.message ?? "Weging verwerken naar matchmaking mislukt.");
    } finally {
      setFinalizing(false);
    }
  }

  if (loading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={pageBgStyle()}
      >
        <div
          className="max-w-[420px] rounded-3xl p-4"
          style={metalFrameStyle()}
        >
          <div className="p-8 text-center" style={metalInnerStyle()}>
            <div style={{ color: NVB_ORANGE, fontWeight: 900, fontSize: 26 }}>
              ⚖️ WEEGSTATION
            </div>
            <div className="mt-3 text-sm font-semibold text-zinc-700">
              Laden...
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-6"
        style={pageBgStyle()}
      >
        <div className="max-w-xl rounded-3xl p-4" style={metalFrameStyle()}>
          <div className="p-8 text-center" style={metalInnerStyle()}>
            <div className="text-xl font-black text-red-600">Geen toegang</div>
            <p className="mt-3 text-sm text-zinc-700">
              Deze pagina is alleen voor officials, hoofdofficials, admins en
              superadmins.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen px-3 py-4 md:px-5 md:py-5"
      style={pageBgStyle()}
    >
      <div className="mx-auto max-w-[1840px]" style={metalFrameStyle()}>
        <div className="p-3 md:p-4" style={metalInnerStyle()}>
          <div
            className="rounded-[14px] px-4 py-2 text-white shadow-2xl"
            style={{
              ...darkPanelStyle(),
              background:
                "linear-gradient(180deg, rgba(47,50,58,0.98) 0%, rgba(30,32,37,0.98) 100%)",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 leading-tight">
                <div
                  className="text-[11px] font-black uppercase tracking-[0.12em]"
                  style={{ color: NVB_ORANGE }}
                >
                  Event info
                </div>

                <div className="text-[24px] font-black text-white leading-[1.05]">
                  {safeText(header?.evenement_naam, "Onbekend evenement")}
                </div>

                <div className="text-[14px] font-semibold text-white/80">
                  {formatDate(header?.evenement_datum ?? null)} ·{" "}
                  {safeText(header?.bondteam, myBondteam || "-")} ·{" "}
                  {safeText(header?.locatie)}
                </div>
              </div>

              <div className="flex items-center justify-center shrink-0">
                <div
                  className="rounded-[6px] p-[2px]"
                  style={{
                    background:
                      "linear-gradient(135deg, #f5f5f5 0%, #bdbdbd 28%, #8e8e8e 55%, #f0f0f0 72%, #6f6f6f 100%)",
                  }}
                >
                  <div
                    className="rounded-[4px] px-2 py-[2px]"
                    style={{
                      background: "rgba(0,0,0,0.65)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <Image
                      src="/branding/fightsupport/logo-dark.png"
                      width={170}
                      height={70}
                      alt="FightSupport"
                      className="h-auto w-auto"
                      priority
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/dashboard/officials/weegstation"
                  className="px-3 py-1.5 text-[12px] font-black text-white"
                  style={{
                    borderRadius: 4,
                    border: "1px solid rgba(0,0,0,0.45)",
                    background:
                      "linear-gradient(180deg, #3d434d 0%, #22262d 100%)",
                  }}
                >
                  ← Terug
                </Link>

                {isHoofdofficialOrSuperadmin && (
                  <ActionButton
                    onClick={completeWeighIn}
                    disabled={finalizing}
                    tone="orange"
                    className="px-3 py-1.5 text-[12px]"
                  >
                    {finalizing ? "Verwerken..." : "Matchmaking"}
                  </ActionButton>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <StatBox label="Nog niet" value={counts.nogNiet} color="#0ea5e9" />
            <StatBox label="Deels" value={counts.deels} color="#ca8a04" />
            <StatBox label="Volledig" value={counts.volledig} color="#16a34a" />
            <StatBox
              label="Dispensatie"
              value={counts.dispensaties}
              color={NVB_ORANGE}
            />
            <StatBox label="Afkeur" value={counts.afkeur} color="#dc2626" />
            <StatBox
              label="Handmatig"
              value={counts.handmatig}
              color="#7c3aed"
            />
          </div>

          {error && (
            <div
              className="mt-4 rounded-2xl p-3 text-sm font-semibold"
              style={{
                background: "rgba(220,38,38,0.12)",
                border: "1px solid rgba(220,38,38,0.30)",
                color: "#991b1b",
              }}
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              className="mt-4 rounded-2xl p-3 text-sm font-semibold"
              style={{
                background: "rgba(22,163,74,0.12)",
                border: "1px solid rgba(22,163,74,0.30)",
                color: "#166534",
              }}
            >
              {notice}
            </div>
          )}

          <div
            className="mt-5 flex flex-col gap-4 xl:flex-row"
            style={{ minHeight: 760 }}
          >
            <div className="flex flex-col xl:w-[36%] xl:min-w-[320px] xl:max-w-[500px]">
              <div
                className="flex h-full flex-col rounded-[16px] p-3 text-white"
                style={darkPanelStyle()}
              >
                <label
                  className="mb-3 flex items-center gap-3 rounded-md px-3 py-3"
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  <Search className="h-5 w-5 text-white/55" />
                  <input
                    type="text"
                    placeholder="Slim zoeken: naam, gym, VA, partij of hoek..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      const first = searchSuggestions[0];
                      if (!first) return;
                      e.preventDefault();
                      selectFighter(first);
                    }}
                    className="w-full text-sm font-semibold outline-none placeholder:text-zinc-500"
                    style={{
                      background: "#ffffff",
                      color: "#111111",
                      border: "1px solid rgba(0,0,0,0.20)",
                      borderRadius: 4,
                      padding: "10px 12px",
                    }}
                  />
                </label>

                <div className="mb-3 text-xs font-semibold text-white/45">
                  Slim zoeken op naam, gym, VA, partij of hoek. Ongewogen
                  vechters blijven bovenaan.
                </div>

                <div
                  className="flex-1 overflow-y-auto"
                  style={{ maxHeight: 650 }}
                >
                  {searchSuggestions.length === 0 ? (
                    <div className="py-8 text-center text-sm text-white/35">
                      Geen vechters gevonden
                    </div>
                  ) : (
                    searchSuggestions.map((item, idx) => {
                      const isSelected =
                        selectedFighter?.boutId === item.boutId &&
                        selectedFighter?.corner === item.corner;

                      const draft = getDraft(item.bout.id);
                      const evalResult = getLiveEval(item.bout, draft);
                      const chip = statusChipFromRowOrEval(
                        item.bout,
                        evalResult?.eindStatus,
                      );
                      const penalty =
                        item.corner === "red"
                          ? toPenalty(draft.strafpuntRood)
                          : toPenalty(draft.strafpuntBlauw);

                      return (
                        <button
                          key={`${item.boutId}-${item.corner}-${idx}`}
                          type="button"
                          onClick={() => selectFighter(item)}
                          className="mb-2 w-full p-3 text-left transition-all"
                          style={{
                            borderRadius: 4,
                            background: isSelected
                              ? "linear-gradient(180deg, rgba(255,77,0,0.20), rgba(255,77,0,0.10))"
                              : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
                            border: isSelected
                              ? `1.5px solid ${NVB_ORANGE}`
                              : "1.5px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-bold tracking-[0.08em] text-white/45">
                                PARTIJ #{item.partijNr} ·{" "}
                                {item.corner === "red"
                                  ? "RODE HOEK"
                                  : "BLAUWE HOEK"}
                              </div>

                              <div className="mt-1 flex items-center gap-2">
                                <UserRound
                                  className="h-4 w-4"
                                  style={{
                                    color:
                                      item.corner === "red"
                                        ? "#ef4444"
                                        : "#3b82f6",
                                  }}
                                />
                                <span className="truncate text-sm font-extrabold text-white">
                                  {item.fighterName}
                                </span>
                              </div>

                              <div className="mt-1 text-xs text-white/45">
                                {item.fighterGym} · VA {item.fighterVa}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-1">
                                <span
                                  className="px-2 py-1 text-[10px] font-black"
                                  style={{
                                    borderRadius: 4,
                                    background: chip.bg,
                                    color: chip.color,
                                    border: `1px solid ${chip.border}`,
                                    boxShadow:
                                      "inset 0 1px 0 rgba(255,255,255,0.35)",
                                  }}
                                >
                                  {chip.label}
                                </span>

                                {getLiveDispState(item.bout, evalResult) ===
                                  "NODIG" && (
                                  <span className="rounded-sm border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-black text-white/85">
                                    Dispensatie nodig
                                  </span>
                                )}

                                {penalty === 1 && (
                                  <span className="rounded-sm border border-red-300 bg-red-100 px-2 py-1 text-[10px] font-black text-red-800">
                                    Minpunt R1
                                  </span>
                                )}

                                {hasLiveManualSanction(
                                  item.bout,
                                  evalResult,
                                ) && (
                                  <span className="rounded-sm border border-violet-300 bg-violet-100 px-2 py-1 text-[10px] font-black text-violet-800">
                                    Handmatige actie
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-[10px] font-bold text-white/45">
                                GEWOGEN
                              </div>
                              <div className="mt-1 text-sm font-extrabold text-white">
                                {fmtKg(item.fighterGewogen)}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              {!selectedFighter ||
              !selectedRow ||
              !selectedDraft ||
              !selectedEval ? (
                <div
                  className="flex h-full items-center justify-center rounded-[18px]"
                  style={{
                    ...silverCardStyle(),
                    minHeight: 500,
                  }}
                >
                  <div className="text-center">
                    <div style={{ fontSize: 48, marginBottom: 12 }}>⚖️</div>
                    <div className="text-base font-semibold text-zinc-700">
                      Selecteer links één vechter om te wegen
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full p-4" style={silverCardStyle()}>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-black text-zinc-900">
                        Partij #{selectedFighter.partijNr}
                      </div>
                      <div className="mt-1 text-sm text-zinc-600">
                        {safeText(selectedFighter.discipline)} ·{" "}
                        {safeText(selectedFighter.klasse)} ·{" "}
                        {safeText(selectedRow.leeftijd_type)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {(() => {
                        const chip = statusChipFromRowOrEval(
                          selectedRow,
                          selectedEval?.eindStatus,
                        );
                        return (
                          <span
                            className="px-3 py-1 text-xs font-black"
                            style={{
                              borderRadius: 4,
                              background: chip.bg,
                              color: chip.color,
                              border: `1px solid ${chip.border}`,
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
                            }}
                          >
                            {chip.label}
                          </span>
                        );
                      })()}

                      {selectedDispState === "VERLEEND" && (
                        <span className="inline-flex h-7 items-center whitespace-nowrap rounded-sm border border-emerald-300 bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-800">
                          Dispensatie ✅
                        </span>
                      )}

                      {selectedDispState === "AFGEWEZEN" && (
                        <span className="inline-flex h-7 items-center whitespace-nowrap rounded-sm border border-red-300 bg-red-100 px-3 py-1 text-[11px] font-black text-red-800">
                          Dispensatie ⛔
                        </span>
                      )}

                      {selectedDispState === "NODIG" && (
                        <span className="inline-flex h-7 items-center whitespace-nowrap rounded-sm border border-yellow-300 bg-yellow-100 px-3 py-1 text-[11px] font-black text-yellow-800">
                          Dispensatie nodig
                        </span>
                      )}
                    </div>
                  </div>

                  {isMatchmakerOnly && (
                    <div className="mb-3 rounded-[8px] border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                      👁 Alleen-lezen modus — matchmakers mogen gewichten
                      bekijken maar niet wijzigen.
                    </div>
                  )}

                  <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.95fr]">
                    <div
                      className="rounded-[10px] p-4"
                      style={{
                        background:
                          selectedFighter.corner === "red"
                            ? "linear-gradient(180deg, rgba(220,38,38,0.08), rgba(255,255,255,0.72))"
                            : "linear-gradient(180deg, rgba(37,99,235,0.08), rgba(255,255,255,0.72))",
                        border:
                          selectedFighter.corner === "red"
                            ? "2px solid rgba(220,38,38,0.20)"
                            : "2px solid rgba(37,99,235,0.20)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
                      }}
                    >
                      <div
                        className="mb-2 text-xs font-black uppercase tracking-[0.08em]"
                        style={{
                          color:
                            selectedFighter.corner === "red"
                              ? "#dc2626"
                              : "#2563eb",
                        }}
                      >
                        {selectedFighter.corner === "red"
                          ? "🔴 geselecteerde vechter"
                          : "🔵 geselecteerde vechter"}
                      </div>

                      <div className="text-2xl font-black text-zinc-900">
                        {selectedFighter.fighterName}
                      </div>

                      <div className="mt-1 text-sm text-zinc-600">
                        {selectedFighter.fighterGym} · VA{" "}
                        {selectedFighter.fighterVa}
                      </div>

                      {selectedComplianceBadges && (
                        <div
                          className="mt-3 flex flex-wrap gap-2 rounded-[8px] p-2"
                          style={{
                            background: "rgba(17,24,39,0.06)",
                            border: "1px solid rgba(0,0,0,0.10)",
                          }}
                        >
                          <ComplianceBadge
                            label={selectedComplianceBadges.licentieLabel}
                            ok={selectedComplianceBadges.licentieOk}
                          />
                          <ComplianceBadge
                            label={selectedComplianceBadges.startverbodLabel}
                            ok={selectedComplianceBadges.startverbod}
                            dangerWhenOk
                          />
                          <ComplianceBadge
                            label={selectedComplianceBadges.keurmerkLabel}
                            ok={selectedComplianceBadges.keurmerkOk}
                          />
                        </div>
                      )}

                      <div className="mt-2 text-xs text-zinc-500">
                        Opgegeven: {fmtKg(selectedFighter.fighterDoorgegeven)}
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-bold text-zinc-700">
                          Gewogen gewicht (kg)
                        </label>
                        <input
                          ref={activeInputRef}
                          type="text"
                          inputMode="decimal"
                          enterKeyHint="done"
                          autoComplete="off"
                          placeholder="Gewicht"
                          value={activeWeightValue}
                          readOnly={isMatchmakerOnly}
                          disabled={isMatchmakerOnly}
                          onChange={(e) => {
                            if (
                              isMatchmakerOnly ||
                              !selectedRow ||
                              !selectedFighter
                            )
                              return;
                            if (selectedFighter.corner === "red") {
                              setDraft(selectedRow.id, {
                                rood: e.target.value,
                              });
                            } else {
                              setDraft(selectedRow.id, {
                                blauw: e.target.value,
                              });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (isMatchmakerOnly) return;
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            void saveSelected();
                          }}
                          style={{
                            width: "100%",
                            padding: "16px 14px",
                            fontSize: 30,
                            fontWeight: 800,
                            textAlign: "center",
                            background: isMatchmakerOnly
                              ? "rgba(243,244,246,0.95)"
                              : "rgba(255,255,255,0.95)",
                            border:
                              selectedFighter.corner === "red"
                                ? "2.5px solid rgba(220,38,38,0.34)"
                                : "2.5px solid rgba(37,99,235,0.34)",
                            borderRadius: 4,
                            color: isMatchmakerOnly ? "#6b7280" : "#111",
                            outline: "none",
                            letterSpacing: "0.02em",
                          }}
                        />
                        <div className="mt-2 text-xs font-semibold text-zinc-500">
                          {isMatchmakerOnly
                            ? "Alleen-lezen — matchmakers mogen geen gewichten wijzigen."
                            : "Typ gewicht en druk op Enter om direct op te slaan."}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div
                          className="rounded-[8px] p-3"
                          style={{
                            background: "rgba(255,255,255,0.68)",
                            border: `1px solid ${FS_LINE_LIGHT}`,
                          }}
                        >
                          <div className="text-[11px] font-black uppercase tracking-[0.06em] text-zinc-500">
                            Tegenstander
                          </div>
                          <div className="mt-1 text-base font-extrabold text-zinc-900">
                            {selectedFighter.opponentName}
                          </div>
                          <div className="mt-1 text-sm text-zinc-600">
                            {selectedFighter.opponentGym} · VA{" "}
                            {selectedFighter.opponentVa}
                          </div>
                          <div className="mt-2 text-xs text-zinc-500">
                            Gewogen: {fmtKg(selectedFighter.opponentGewogen)}
                          </div>
                        </div>

                        <div
                          className="rounded-[8px] p-3"
                          style={{
                            background: "rgba(255,255,255,0.68)",
                            border: `1px solid ${FS_LINE_LIGHT}`,
                          }}
                        >
                          <div className="text-[11px] font-black uppercase tracking-[0.06em] text-zinc-500">
                            Klasse / gewichtsregel
                          </div>
                          <div className="mt-1 text-base font-extrabold text-zinc-900">
                            {getWeightRuleValue(selectedRow)}
                          </div>
                          <div className="mt-2 text-xs text-zinc-500">
                            {getWeightRuleTitle(selectedRow)}:{" "}
                            {getWeightClassHint(
                              selectedRow.klasse_mm,
                              selectedRow.max_gewicht_notatie ??
                                selectedRow.max_gewicht,
                            )}
                          </div>
                          <div className="mt-1 text-xs font-bold text-zinc-700">
                            Toegestaan wegen: {getWeightRangeTextForUi(
                              selectedRow.klasse_mm,
                              selectedRow.max_gewicht_notatie ??
                                selectedRow.max_gewicht,
                              selectedRow.leeftijd_type,
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className="rounded-[10px] p-4"
                      style={{
                        background: "rgba(255,255,255,0.56)",
                        border: `1px solid ${FS_LINE_LIGHT}`,
                      }}
                    >
                      <div className="mb-3 text-sm font-black uppercase tracking-[0.06em] text-zinc-800">
                        Status en beoordeling
                      </div>

                      <div
                        className="mb-3 rounded-[8px] p-3 text-center"
                        style={{
                          background: "rgba(255,255,255,0.74)",
                          border: `1px solid ${FS_LINE_LIGHT}`,
                        }}
                      >
                        <div className="text-lg font-black text-zinc-900">
                          Verschil: {fmtKg(selectedEval?.diff ?? null)}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          Jeugd: OK ≤ 2.5 / Disp. 2.6–3.9 / Afkeur ≥ 4.0
                        </div>
                        <div className="text-xs text-zinc-500">
                          Volwassen: OK ≤ 3.5 / Disp. 3.6–6.9 / Afkeur ≥ 7.0
                        </div>
                      </div>

                      <div className="space-y-2">
                        {(selectedEval?.messages ?? []).map(
                          (msg: string, idx: number) => (
                            <div
                              key={idx}
                              className="rounded-[8px] px-3 py-2 text-sm font-semibold text-zinc-700"
                              style={{
                                background: "rgba(255,255,255,0.74)",
                                border: `1px solid ${FS_LINE_LIGHT}`,
                              }}
                            >
                              {msg}
                            </div>
                          ),
                        )}
                      </div>

                      {selectedIsOutsideWeightClass && (
                        <div
                          className="mt-3 rounded-[8px] p-3 text-sm font-bold text-red-900"
                          style={{
                            background: "rgba(220,38,38,0.10)",
                            border: "1px solid rgba(220,38,38,0.26)",
                          }}
                        >
                          Deze vechter valt buiten de toegestane gewichtsklasse
                          (
                          {getWeightClassHint(
                            selectedRow.klasse_mm,
                            selectedRow.max_gewicht_notatie ??
                              selectedRow.max_gewicht,
                          )}
                          ). Toegestaan wegen: {getWeightRangeTextForUi(
                            selectedRow.klasse_mm,
                            selectedRow.max_gewicht_notatie ??
                              selectedRow.max_gewicht,
                            selectedRow.leeftijd_type,
                          )}. Je kunt dus te zwaar én te licht zijn.
                        </div>
                      )}

                      {hasLiveManualSanction(selectedRow, selectedEval) && (
                        <div
                          className="mt-3 rounded-[8px] p-3"
                          style={{
                            background: "rgba(124,58,237,0.10)",
                            border: "1px solid rgba(124,58,237,0.26)",
                          }}
                        >
                          <div className="flex items-center gap-2 font-black text-violet-900">
                            <ShieldAlert className="h-4 w-4" />
                            Handmatige actie nodig
                          </div>
                          <div className="mt-2 text-sm text-violet-900/80">
                            {getLiveManualSanctionReason(
                              selectedRow,
                              selectedEval,
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                    <div
                      className="rounded-[10px] p-4"
                      style={{
                        background: "rgba(255,255,255,0.56)",
                        border: `1px solid ${FS_LINE_LIGHT}`,
                      }}
                    >
                      <div className="mb-3 text-sm font-black uppercase tracking-[0.06em] text-zinc-800">
                        Minpunt eerste ronde
                      </div>

                      {!selectedCanAssignPenalty ? (
                        <div
                          className="rounded-[8px] p-3 text-sm font-semibold text-zinc-600"
                          style={{
                            background: "rgba(255,255,255,0.74)",
                            border: `1px solid ${FS_LINE_LIGHT}`,
                          }}
                        >
                          Voor deze vechter is nu geen minpunt mogelijk. Minpunt kan alleen bij te zwaar of te licht wegen buiten de toegestane range.
                        </div>
                      ) : !isHoofdofficialOrSuperadmin ? (
                        <div className="rounded-[8px] border border-orange-200 bg-orange-50 p-3 text-sm font-bold text-orange-800">
                          Alleen hoofdofficial of superadmin mag minpunt
                          bevestigen.
                        </div>
                      ) : (
                        <div
                          className="rounded-[8px] p-3"
                          style={{
                            background: "rgba(255,255,255,0.74)",
                            border: `1px solid ${FS_LINE_LIGHT}`,
                          }}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-xs font-black uppercase tracking-[0.06em] text-zinc-500">
                              Minpunt
                            </div>

                            <span
                              className="inline-flex min-w-[72px] items-center justify-center px-2 py-1 text-[11px] font-black"
                              style={{
                                borderRadius: 4,
                                background:
                                  activePenaltyValue === "1"
                                    ? "#dcfce7"
                                    : "#fee2e2",
                                color:
                                  activePenaltyValue === "1"
                                    ? "#166534"
                                    : "#991b1b",
                                border:
                                  activePenaltyValue === "1"
                                    ? "1px solid #86efac"
                                    : "1px solid #fca5a5",
                              }}
                            >
                              {activePenaltyValue === "1"
                                ? "Minpunt: Ja"
                                : "Minpunt: Nee"}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <ActionButton
                              onClick={() => {
                                if (!selectedRow || !selectedFighter) return;
                                if (selectedFighter.corner === "red") {
                                  setDraft(selectedRow.id, {
                                    strafpuntRood: "1",
                                  });
                                } else {
                                  setDraft(selectedRow.id, {
                                    strafpuntBlauw: "1",
                                  });
                                }
                              }}
                              tone={
                                activePenaltyValue === "1" ? "green" : "dark"
                              }
                            >
                              Ja
                            </ActionButton>

                            <ActionButton
                              onClick={() => {
                                if (!selectedRow || !selectedFighter) return;
                                if (selectedFighter.corner === "red") {
                                  setDraft(selectedRow.id, {
                                    strafpuntRood: "0",
                                  });
                                } else {
                                  setDraft(selectedRow.id, {
                                    strafpuntBlauw: "0",
                                  });
                                }
                              }}
                              tone={activePenaltyValue === "0" ? "red" : "dark"}
                            >
                              Nee
                            </ActionButton>
                          </div>
                        </div>
                      )}
                    </div>

                    <div
                      className="rounded-[10px] p-4"
                      style={{
                        background: "rgba(255,255,255,0.56)",
                        border: `1px solid ${FS_LINE_LIGHT}`,
                      }}
                    >
                      <div className="mb-3 text-sm font-black uppercase tracking-[0.06em] text-zinc-800">
                        Weegnotitie
                      </div>

                      <textarea
                        rows={3}
                        placeholder="Optionele notitie..."
                        value={selectedDraft.note}
                        onChange={(e) =>
                          selectedRow &&
                          setDraft(selectedRow.id, { note: e.target.value })
                        }
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          fontSize: 14,
                          fontWeight: 500,
                          background: "rgba(255,255,255,0.92)",
                          border: "1.5px solid rgba(0,0,0,0.14)",
                          borderRadius: 4,
                          color: "#111",
                          outline: "none",
                          resize: "vertical",
                        }}
                      />
                    </div>
                  </div>

                  {!isMatchmakerOnly && (
                    <ActionButton
                      onClick={saveSelected}
                      disabled={savingId === selectedRow.id}
                      tone="dark"
                      className="gap-2 px-5 py-3 text-sm"
                    >
                      <Save className="h-4 w-4" />
                      {savingId === selectedRow.id ? "Opslaan..." : "Opslaan"}
                    </ActionButton>
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            className="mt-5 rounded-[16px] p-4 text-white"
            style={darkPanelStyle()}
          >
            <div
              className="mb-3 text-sm font-black uppercase tracking-[0.06em]"
              style={{ color: NVB_ORANGE }}
            >
              📋 Alle gewogen partijen
            </div>

            <div className="overflow-x-auto">
              <table
                className="w-full border-separate text-sm"
                style={{ borderSpacing: "0 4px" }}
              >
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50">
                      Nr
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50">
                      Discipline
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50">
                      Klasse
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50">
                      Rood
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50">
                      Blauw
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50">
                      Max
                    </th>
                    <th
                      className="px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50"
                      style={{ width: 74, minWidth: 74 }}
                    >
                      R.gew.
                    </th>
                    <th
                      className="px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50"
                      style={{ width: 74, minWidth: 74 }}
                    >
                      B.gew.
                    </th>
                    <th
                      className="px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50"
                      style={{ width: 78, minWidth: 78 }}
                    >
                      Verschil
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50">
                      Status
                    </th>
                    <th
                      className="px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.08em] text-white/50"
                      style={{ width: 82, minWidth: 82 }}
                    >
                      Minpunt
                    </th>
                    <th
                      className="px-2 py-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-white/50"
                      style={{ width: 220, minWidth: 220 }}
                    >
                      Acties
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => {
                    const draft = getDraft(row.id);
                    const liveRood = toNum(draft.rood);
                    const liveBlauw = toNum(draft.blauw);
                    const evalResult = getLiveEval(row, draft);
                    const chip = statusChipFromRowOrEval(
                      row,
                      evalResult?.eindStatus,
                    );
                    const dispState = getLiveDispState(row, evalResult);

                    const canHandleDisp =
                      isHoofdofficialOrSuperadmin &&
                      (normalizeStatus(evalResult?.eindStatus) ===
                        "DISPENSATIE_NODIG" ||
                        dispState === "NODIG" ||
                        dispState === "VERLEEND" ||
                        dispState === "AFGEWEZEN");

                    const zebraBg =
                      index % 2 === 0
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(171,178,187,0.14)";

                    const roodMinpunt = toPenalty(draft.strafpuntRood) === 1;
                    const blauwMinpunt = toPenalty(draft.strafpuntBlauw) === 1;
                    const hasPenalty = roodMinpunt || blauwMinpunt;

                    return (
                      <tr
                        key={row.id}
                        style={{
                          background: zebraBg,
                        }}
                      >
                        <td
                          className="px-2 py-2 font-black"
                          style={{ color: NVB_ORANGE }}
                        >
                          #{row.partij_nr}
                        </td>
                        <td className="px-2 py-2 text-white/85">
                          {safeText(row.discipline)}
                        </td>
                        <td className="px-2 py-2 text-white/85">
                          {safeText(row.klasse_mm)}
                        </td>
                        <td className="px-2 py-2 font-bold text-red-400">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{safeText(row.rood_naam, "?")}</span>
                            {roodMinpunt && (
                              <span className="rounded-sm border border-red-300 bg-red-100 px-2 py-1 text-[10px] font-black text-red-800">
                                Minpunt R1
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 font-bold text-sky-400">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{safeText(row.blauw_naam, "?")}</span>
                            {blauwMinpunt && (
                              <span className="rounded-sm border border-sky-300 bg-sky-100 px-2 py-1 text-[10px] font-black text-sky-800">
                                Minpunt R1
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 font-bold text-white/88">
                          {fmtCompact(row.max_gewicht)}
                        </td>
                        <td className="px-2 py-2 font-bold text-white/92">
                          {fmtCompact(liveRood)}
                        </td>
                        <td className="px-2 py-2 font-bold text-white/92">
                          {fmtCompact(liveBlauw)}
                        </td>
                        <td className="px-2 py-2 font-bold text-white/75">
                          {fmtCompact(evalResult?.diff ?? null)}
                        </td>

                        <td className="px-2 py-2">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className="px-2 py-1 text-[10px] font-black"
                              style={{
                                borderRadius: 4,
                                background: chip.bg,
                                color: chip.color,
                                border: `1px solid ${chip.border}`,
                                boxShadow:
                                  "inset 0 1px 0 rgba(255,255,255,0.35)",
                              }}
                            >
                              {chip.label}
                            </span>

                            {dispState === "NODIG" && (
                              <span className="text-[10px] font-black text-white/85">
                                Dispensatie nodig
                              </span>
                            )}

                            {hasLiveManualSanction(row, evalResult) && (
                              <span className="rounded-sm border border-violet-300 bg-violet-100 px-2 py-1 text-[10px] font-black text-violet-800">
                                Handmatig
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-2 py-2 text-center">
                          {hasPenalty ? (
                            <div className="flex flex-col items-center gap-1">
                              {roodMinpunt && (
                                <span className="inline-flex min-w-[58px] items-center justify-center rounded-sm border border-red-300 bg-red-100 px-2 py-1 text-[10px] font-black text-red-800">
                                  Rood
                                </span>
                              )}
                              {blauwMinpunt && (
                                <span className="inline-flex min-w-[58px] items-center justify-center rounded-sm border border-sky-300 bg-sky-100 px-2 py-1 text-[10px] font-black text-sky-800">
                                  Blauw
                                </span>
                              )}
                            </div>
                          ) : (
                            <span
                              className="inline-flex min-w-[42px] items-center justify-center px-2 py-1 text-[11px] font-black"
                              style={{
                                borderRadius: 4,
                                background: "#fee2e2",
                                color: "#991b1b",
                                border: "1px solid #fca5a5",
                                boxShadow:
                                  "0 0 0 1px rgba(220,38,38,0.10) inset",
                              }}
                            >
                              Nee
                            </span>
                          )}
                        </td>

                        <td className="px-2 py-2">
                          <div className="flex flex-nowrap items-center gap-1 whitespace-nowrap">
                            {(dispState === "VERLEEND" ||
                              dispState === "AFGEWEZEN") && (
                              <span
                                className="inline-flex h-7 min-w-[28px] items-center justify-center px-2 text-[12px] font-black"
                                style={{
                                  borderRadius: 4,
                                  background:
                                    dispState === "VERLEEND"
                                      ? "#dcfce7"
                                      : "#fee2e2",
                                  color:
                                    dispState === "VERLEEND"
                                      ? "#166534"
                                      : "#991b1b",
                                  border:
                                    dispState === "VERLEEND"
                                      ? "1px solid #86efac"
                                      : "1px solid #fca5a5",
                                }}
                                title={
                                  dispState === "VERLEEND"
                                    ? "Dispensatie goedgekeurd"
                                    : "Dispensatie afgewezen"
                                }
                              >
                                {dispState === "VERLEEND" ? "✅" : "⛔"}
                              </span>
                            )}

                            {canHandleDisp && (
                              <>
                                <ActionButton
                                  onClick={() =>
                                    decideDispensation(row.id, "approved")
                                  }
                                  disabled={savingId === row.id}
                                  tone="green"
                                  className="px-2 py-1 text-[11px] leading-none"
                                >
                                  Ja
                                </ActionButton>
                                <ActionButton
                                  onClick={() =>
                                    decideDispensation(row.id, "rejected")
                                  }
                                  disabled={savingId === row.id}
                                  tone="red"
                                  className="px-2 py-1 text-[11px] leading-none"
                                >
                                  Nee
                                </ActionButton>
                              </>
                            )}

                            <Link
                              href={`/dashboard/officials/controle/${matchmakingId}/partij/${row.partij_nr}`}
                              className="inline-flex items-center justify-center whitespace-nowrap px-2 py-1 text-[11px] font-black leading-none text-white"
                              style={{
                                borderRadius: 4,
                                border: "1px solid rgba(0,0,0,0.45)",
                                background:
                                  "linear-gradient(180deg, #3d434d 0%, #22262d 100%)",
                                boxShadow:
                                  "inset 0 1px 0 rgba(255,255,255,0.10)",
                                height: 28,
                              }}
                            >
                              Detail
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
