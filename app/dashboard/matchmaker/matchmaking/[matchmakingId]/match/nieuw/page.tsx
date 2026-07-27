"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { authedFetch } from "@/lib/api/authedFetch";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Save,
  ShieldAlert,
  Swords,
  XCircle,
} from "lucide-react";

const ORANGE = "#ff4d00";

type Fighter = Record<string, any>;
type ResultRow = Record<string, any>;
type EngineHit = Record<string, any>;
type Severity = "OK" | "INFO" | "LET OP" | "DISPENSATIE" | "AFKEUR" | "VERBOD";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function lower(v: unknown) {
  return s(v).toLowerCase();
}

function n(v: unknown) {
  const x = Number(
    String(v ?? "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, ""),
  );
  return Number.isFinite(x) ? x : null;
}

function parseJson(v: unknown): any {
  if (!v) return {};
  if (typeof v === "object") return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return {};
  }
}

function deep(f?: Fighter | null) {
  const extra = parseJson(f?.extra);
  return {
    extra,
    raw: extra?.raw ?? f?.raw ?? {},
    aanmelding: extra?.raw?.aanmelding ?? f?.aanmelding ?? {},
    fightersRaw: extra?.raw?.fighters_raw ?? f?.fighters_raw ?? {},
  };
}

function name(f?: Fighter | null) {
  if (!f) return "-";
  const d = deep(f);
  return (
    s(f.naam) ||
    s(f.fp_naam) ||
    s(d.fightersRaw?.naam) ||
    s(f.naam_input) ||
    [f.voornaam, f.achternaam].map(s).filter(Boolean).join(" ") ||
    [d.aanmelding?.voornaam, d.aanmelding?.achternaam]
      .map(s)
      .filter(Boolean)
      .join(" ") ||
    "Onbekend"
  );
}

function idOf(f?: Fighter | null) {
  if (!f) return "";
  return s(f.inschrijving_id || f.id || f.fighter_id || f.va_nummer || f.va);
}

function val(v: unknown) {
  return s(v) || "-";
}

function firstFilled(...vals: unknown[]) {
  for (const v of vals) {
    const out = s(v);
    if (out) return out;
  }
  return "";
}

function parseDate(v: unknown) {
  const raw = s(v);
  if (!raw) return null;

  const iso = new Date(raw);
  if (!Number.isNaN(iso.getTime())) return iso;

  const m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

function formatDate(v: unknown) {
  const d = parseDate(v);
  if (!d) return val(v);
  return d.toLocaleDateString("nl-NL");
}

function birthDate(f?: Fighter | null) {
  const d = deep(f);
  return (
    f?.geboortedatum ??
    f?.fp_geboortedatum ??
    d.fightersRaw?.geboortedatum ??
    f?.geboortedatum_input ??
    d.aanmelding?.geboortedatum ??
    null
  );
}

function ageOnDate(birth: unknown, event: unknown) {
  const b = parseDate(birth);
  const e = parseDate(event);
  if (!b || !e) return null;

  let years = e.getFullYear() - b.getFullYear();
  const beforeBirthday =
    e.getMonth() < b.getMonth() ||
    (e.getMonth() === b.getMonth() && e.getDate() < b.getDate());

  if (beforeBirthday) years--;
  return years;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function diffYMD(a: unknown, b: unknown) {
  const d1 = parseDate(a);
  const d2 = parseDate(b);
  if (!d1 || !d2) return null;

  const start = d1 <= d2 ? new Date(d1) : new Date(d2);
  const end = d1 <= d2 ? new Date(d2) : new Date(d1);

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonth = (end.getMonth() + 11) % 12;
    const prevYear =
      prevMonth === 11 ? end.getFullYear() - 1 : end.getFullYear();
    days += daysInMonth(prevYear, prevMonth);
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days, totalMonths: years * 12 + months };
}

function normalizeGender(v: unknown) {
  const x = lower(v);
  if (!x) return "";
  if (["m", "man", "male", "jongen", "jongens", "heer", "heren"].includes(x))
    return "man";
  if (
    ["v", "vrouw", "female", "meisje", "meisjes", "dame", "dames"].includes(x)
  )
    return "vrouw";
  return x;
}

function gender(f?: Fighter | null) {
  const d = deep(f);
  return normalizeGender(
    f?.geslacht ??
      f?.fp_geslacht ??
      d.fightersRaw?.geslacht ??
      d.aanmelding?.geslacht ??
      f?.gender,
  );
}

function klass(f?: Fighter | null) {
  const d = deep(f);
  return s(
    f?.klasse ??
      f?.fp_klasse ??
      f?.klasse_fp ??
      f?.nulmeting_klasse ??
      d.fightersRaw?.nulmeting_klasse ??
      d.aanmelding?.klasse,
  );
}

function discipline(f?: Fighter | null) {
  const d = deep(f);
  return s(f?.discipline ?? f?.fp_discipline ?? d.aanmelding?.discipline);
}

function gym(f?: Fighter | null) {
  const d = deep(f);
  return s(
    f?.sportschool ??
      f?.gym_input ??
      f?.fp_gym ??
      f?.gym ??
      d.fightersRaw?.gym ??
      d.aanmelding?.gym,
  );
}

function weight(f?: Fighter | null) {
  const d = deep(f);
  return n(
    f?.gewicht ?? f?.gewicht_input ?? f?.fp_gewicht ?? d.aanmelding?.gewicht,
  );
}

function normalizeGymName(v: unknown) {
  return lower(v)
    .replace(/&/g, " en ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(sportschool|sportsschool|gym|team|fight|fighting|club|academy)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameGymInfo(rood?: Fighter | null, blauw?: Fighter | null) {
  const roodGym = gym(rood);
  const blauwGym = gym(blauw);
  const roodNorm = normalizeGymName(roodGym);
  const blauwNorm = normalizeGymName(blauwGym);

  return {
    roodGym,
    blauwGym,
    same: !!roodGym && !!blauwGym && !!roodNorm && roodNorm === blauwNorm,
  };
}

function isYouthValue(v: unknown) {
  const x = lower(v);
  return (
    x.includes("jeugd") ||
    x.includes("youth") ||
    x.includes("junior") ||
    /^j[\s+-]*/i.test(s(v))
  );
}

function isMmaMatch(rood?: Fighter | null, blauw?: Fighter | null) {
  const d = `${discipline(rood)} ${discipline(blauw)}`.toLowerCase();
  return d.includes("mma") || d.includes("mixed martial");
}

function roundUpHalf(v: number) {
  return Math.ceil(v * 2) / 2;
}

function fmtKg(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "";
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ",");
}

function suggestedMaxWeight(
  rood?: Fighter | null,
  blauw?: Fighter | null,
  youth = false,
) {
  const rw = weight(rood);
  const bw = weight(blauw);
  if (rw == null || bw == null) return null;

  const heavier = Math.max(rw, bw);
  const diff = Math.abs(rw - bw);
  const limit = youth ? 2 : isMmaMatch(rood, blauw) ? 4 : 3;

  if (diff >= limit) return roundUpHalf(heavier);
  if (diff === 0) return roundUpHalf(heavier + 1);
  return roundUpHalf(heavier + 0.5);
}

function weightLimitText(
  rood?: Fighter | null,
  blauw?: Fighter | null,
  youth = false,
) {
  if (youth) return "Jeugd: maximaal 2 kg verschil";
  if (isMmaMatch(rood, blauw)) return "MMA: maximaal 4 kg verschil";
  return "18 jaar en ouder: maximaal 3 kg verschil";
}

function isYouthMatch(
  rood?: Fighter | null,
  blauw?: Fighter | null,
  eventDate?: string,
) {
  const ra = ageOnDate(birthDate(rood), eventDate);
  const ba = ageOnDate(birthDate(blauw), eventDate);

  return (
    isYouthValue(klass(rood)) ||
    isYouthValue(klass(blauw)) ||
    (ra != null && ra < 18) ||
    (ba != null && ba < 18)
  );
}


function getResultKind(v: unknown): "win" | "loss" | "draw" | "other" {
  const x = lower(v)
    .replace(/\s+/g, " ")
    .trim();

  // matchmaker_uitslagen_raw.uitslag is leidend.
  if (!x) return "other";
  if (x.includes("demo") || x.includes("no contest") || x.includes("nocontest") || x === "nc") return "other";
  if (x.includes("onbeslist") || x.includes("gelijk") || x.includes("draw")) return "draw";
  if (x.includes("verliest") || x.includes("verlies") || x.includes("verloren") || x.includes("loss") || x === "l") return "loss";
  if (x.includes("wint") || x.includes("winst") || x.includes("gewonnen") || x === "win" || x === "w") return "win";
  return "other";
}

function normalizeClassToken(v: unknown) {
  const x = lower(v)
    .replace(/klasse/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!x || x === "-") return "";
  if (x === "j" || x.includes("jeugd") || x.includes("youth")) return "j";
  if (x === "r" || x.includes("recreant")) return "r";
  if (x === "n" || x.includes("nieuweling")) return "n";
  if (x === "c") return "c";
  if (x === "b") return "b";
  if (x === "a" || x.includes("elite")) return "a";
  if (x.includes("amateur") || x.includes("ama")) return "amateur";
  if (x.includes("pro")) return "pro";

  return x.replace(/[^a-z0-9+]/g, "");
}

function classRank(token: string) {
  const order: Record<string, number> = {
    j: 1,
    r: 2,
    n: 3,
    c: 4,
    b: 5,
    a: 6,
    amateur: 3,
    pro: 6,
  };
  return order[token] ?? 0;
}

function getRowClass(row: ResultRow) {
  return normalizeClassToken(
    firstFilled(
      row?.klasse,
      row?.class,
      row?.wedstrijdklasse,
      row?.niveau,
      row?.fight_class,
    ),
  );
}

function highestRecordClassFromRows(rows: ResultRow[]) {
  let highest = "";
  let highestRank = 0;

  for (const row of rows) {
    const token = getRowClass(row);
    const rank = classRank(token);
    if (rank > highestRank) {
      highest = token;
      highestRank = rank;
    }
  }

  return highest;
}

function getUitslagenRows(f?: Fighter | null, allRows: ResultRow[] = []) {
  const d = deep(f);
  const inline = [
    f?.uitslagen,
    f?.uitslagen_raw,
    f?.matchmaker_uitslagen_raw,
    d.extra?.uitslagen,
    d.extra?.matchmaker_uitslagen_raw,
    d.extra?.raw?.uitslagen,
    d.extra?.raw?.matchmaker_uitslagen_raw,
    d.fightersRaw?.uitslagen,
    d.fightersRaw?.uitslagen_raw,
  ];

  const rows: ResultRow[] = [];
  for (const list of inline) {
    if (Array.isArray(list)) rows.push(...list);
  }

  if (Array.isArray(allRows) && allRows.length) {
    // allRows is op deze matchpagina soms al gefilterd per vechter.
    // Als ze allemaal bij deze vechter passen, voeg ze direct toe.
    rows.push(...allRows.filter((r) => rowMatchesFighter(r, f)));
  }

  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = s(
      firstFilled(
        row?.id,
        [row?.va_nummer, row?.datum, row?.evenement, row?.tegenstander, row?.uitslag, row?.klasse]
          .map((x) => s(x).toLowerCase())
          .join("|"),
      ),
    );
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function recordFromUitslagen(rows: ResultRow[]) {
  const highestClass = highestRecordClassFromRows(rows);
  let w = 0;
  let l = 0;
  let draw = 0;
  let other = 0;
  let previousClassOfficial = 0;
  let demoNoContest = 0;

  for (const row of rows) {
    const kind = getResultKind(firstFilled(row?.uitslag, row?.resultaat, row?.outcome));
    const rowClass = getRowClass(row);

    if (kind === "other") {
      other += 1;
      demoNoContest += 1;
      continue;
    }

    if (highestClass && rowClass && rowClass !== highestClass) {
      other += 1;
      previousClassOfficial += 1;
      continue;
    }

    if (kind === "win") w += 1;
    else if (kind === "loss") l += 1;
    else if (kind === "draw") draw += 1;
  }

  const currentOfficial = w + l + draw;
  const official = currentOfficial + previousClassOfficial;
  const inclusive = official + demoNoContest;

  return {
    w,
    l,
    draw,
    other,
    demo: demoNoContest,
    previousClassOfficial,
    currentOfficial,
    official,
    inclusive,
    highestClass,
    hasRows: rows.length > 0,
  };
}

function demoToPartijEquivalent(demo: number) {
  return Math.floor(Math.max(0, demo) / 3);
}

function effectiveYouthPartijen(total: number | null | undefined, demo: number | null | undefined) {
  if (total == null || !Number.isFinite(total)) return null;
  const safeDemo = demo == null || !Number.isFinite(demo) ? 0 : demo;
  return Math.max(0, total - safeDemo + demoToPartijEquivalent(safeDemo));
}

function currentTotalsAll(v: unknown) {
  const obj = parseJson(v);
  return obj?.current?._all ?? null;
}

function readYesNo(...values: unknown[]) {
  const found = values.find((v) => s(v) !== "");
  const x = lower(found);

  if (["ja", "yes", "true", "1", "geldig", "ok"].includes(x)) return "JA";
  if (["nee", "no", "false", "0", "geen", "ongeldig"].includes(x)) return "NEE";

  if (x.includes("geen") || x.includes("ongeldig")) return "NEE";
  if (x.includes("ja") || x.includes("geldig")) return "JA";
  if (x.includes("nee")) return "NEE";

  return "ONBEKEND";
}

function licenseStatus(f?: Fighter | null) {
  const d = deep(f);
  return readYesNo(
    f?.licentie,
    d.fightersRaw?.licentie,
    f?.licentie_ok,
    f?.licentie_status,
    f?.fp_licentie,
    f?.raw?.licentie,
  );
}

function startverbodStatus(f?: Fighter | null) {
  const d = deep(f);
  return readYesNo(
    f?.heeft_startverbod,
    d.fightersRaw?.heeft_startverbod,
    f?.startverbod,
    f?.startverbod_status,
    f?.raw?.startverbod,
  );
}

function fightStats(f?: Fighter | null, uitslagenRows: ResultRow[] = []) {
  const d = deep(f);
  const rows = getUitslagenRows(f, uitslagenRows);
  const fromRows = recordFromUitslagen(rows);

  const totalsAll = currentTotalsAll(
    f?.uitslagen_per_discipline ??
      f?.fp_uitslagen_per_discipline ??
      d.fightersRaw?.uitslagen_per_discipline,
  );

  const fallbackW =
    n(f?.record_w) ??
    n(f?.gewonnen) ??
    n(d.fightersRaw?.gewonnen) ??
    n(totalsAll?.wins) ??
    n(totalsAll?.win) ??
    n(d.aanmelding?.win) ??
    0;

  const fallbackL =
    n(f?.record_l) ??
    n(f?.verloren) ??
    n(d.fightersRaw?.verloren) ??
    n(totalsAll?.losses) ??
    n(totalsAll?.loss) ??
    n(d.aanmelding?.loss) ??
    0;

  const fallbackDraw =
    n(f?.record_d) ??
    n(f?.draw) ??
    n(f?.gelijk) ??
    n(d.fightersRaw?.gelijk) ??
    n(totalsAll?.draws) ??
    n(totalsAll?.draw) ??
    n(d.aanmelding?.draw) ??
    0;

  const fallbackTotal =
    n(f?.totaal_wedstrijden) ??
    n(f?.nulmeting_totaal) ??
    n(d.fightersRaw?.totaal_wedstrijden) ??
    n(d.fightersRaw?.nulmeting_totaal) ??
    n(totalsAll?.total) ??
    n(f?.uitslagen_count);

  const fallbackOther = Math.max(
    0,
    (fallbackTotal ?? fallbackW + fallbackL + fallbackDraw) - fallbackW - fallbackL - fallbackDraw,
  );

  const w = fromRows.hasRows ? fromRows.w : fallbackW;
  const l = fromRows.hasRows ? fromRows.l : fallbackL;
  const draw = fromRows.hasRows ? fromRows.draw : fallbackDraw;
  const other = fromRows.hasRows ? fromRows.other : fallbackOther;
  const demo = fromRows.hasRows ? fromRows.demo : fallbackOther;

  const official = fromRows.hasRows ? fromRows.official : w + l + draw + other;
  const effectiveYouth = official + demoToPartijEquivalent(demo);

  return {
    official,
    effectiveYouth,
    demo,
    other,
    demoEquivalent: demoToPartijEquivalent(demo),
    w,
    l,
    draw,
  };
}

function recordLabel(f?: Fighter | null, uitslagenRows: ResultRow[] = []) {
  const stats = fightStats(f, uitslagenRows);
  return `${stats.w}-${stats.l}-${stats.draw} (${stats.other})`;
}

function partyDifferenceInfo(
  rood?: Fighter | null,
  blauw?: Fighter | null,
  youth = false,
  roodUitslagen: ResultRow[] = [],
  blauwUitslagen: ResultRow[] = [],
) {
  const r = fightStats(rood, roodUitslagen);
  const b = fightStats(blauw, blauwUitslagen);
  const roodPartijen = youth ? r.effectiveYouth : r.official;
  const blauwPartijen = youth ? b.effectiveYouth : b.official;
  const diff = Math.abs((roodPartijen ?? 0) - (blauwPartijen ?? 0));
  const demoDiff = Math.abs((r.demo ?? 0) - (b.demo ?? 0));

  let severity: Severity = "OK";
  let detail = youth
    ? `Jeugdpartij: rood ${roodPartijen}, blauw ${blauwPartijen}. Demo telt als 1 partij per 3 demo's: rood ${r.demo} demo (${r.demoEquivalent} meegeteld), blauw ${b.demo} demo (${b.demoEquivalent} meegeteld).`
    : `Officiële partijen: rood ${roodPartijen}, blauw ${blauwPartijen}. Demo wordt apart gelezen en niet bij officiële partijen opgeteld.`;

  const minOfficial = Math.min(roodPartijen ?? 0, blauwPartijen ?? 0);

  if (youth && minOfficial < 15 && diff > 4) {
    severity = "DISPENSATIE";
    detail = `Jeugdpartij met ${diff} partijen verschil. Rood ${roodPartijen}, blauw ${blauwPartijen}. Demo wordt omgerekend: totaal - demo + floor(demo/3). Zolang één van beide minder dan 15 partijen heeft, is bij meer dan 4 partijen verschil DISPENSATIE nodig.`;
  } else if (!youth && diff >= 6) {
    severity = "LET OP";
    detail = `Volwassen partij met groot partijenverschil. Rood ${roodPartijen}, blauw ${blauwPartijen}. Demo rood ${r.demo}, demo blauw ${b.demo}.`;
  } else if (demoDiff > 0) {
    detail = youth
      ? `Partijverschil is binnen marge. Demo is omgerekend: rood ${r.demo} demo (${r.demoEquivalent} meegeteld), blauw ${b.demo} demo (${b.demoEquivalent} meegeteld).`
      : `Officiële partijen zijn binnen marge. Demo verschil: ${demoDiff}. Demo rood ${r.demo}, demo blauw ${b.demo}.`;
  }

  return {
    diff,
    demoDiff,
    rood: r,
    blauw: b,
    severity,
    detail,
  };
}

function keurmerkInfo(f?: Fighter | null) {
  const reason = s(f?.keurmerk_reden);
  const rawStatus = s(
    f?.heeft_keurmerk ?? f?.keurmerk_status ?? f?.keurmerk_ok,
  );
  const reasonLower = lower(reason);
  const statusLower = lower(rawStatus);

  const belgium =
    reasonLower.includes("belgië") ||
    reasonLower.includes("belgie") ||
    reasonLower.includes("belgisch") ||
    reasonLower.includes("bkbmo") ||
    statusLower.includes("belgië") ||
    statusLower.includes("belgie") ||
    statusLower.includes("bkbmo");

  if (belgium) {
    return {
      ok: null as boolean | null,
      label: "BELGIË CHECK",
      tone: "warn" as const,
      reason:
        reason ||
        "Belgische/BKBMO sportschool. Informatieve melding, geen afkeur.",
    };
  }

  const yn = readYesNo(rawStatus);

  if (yn === "JA") {
    return {
      ok: true,
      label: "Geldig",
      tone: "ok" as const,
      reason: reason || "Keurmerk match gevonden.",
    };
  }

  if (yn === "NEE") {
    return {
      ok: false,
      label: "Ongeldig",
      tone: "bad" as const,
      reason: reason || "Geen keurmerk match gevonden.",
    };
  }

  if (
    reasonLower.includes("geen match") ||
    reasonLower.includes("geen keurmerk")
  ) {
    return {
      ok: false,
      label: "Ongeldig",
      tone: "bad" as const,
      reason,
    };
  }

  return {
    ok: null,
    label: "Geen data",
    tone: "warn" as const,
    reason: reason || "Geen keurmerkinformatie ontvangen.",
  };
}

function analysisAgeIsMixed(roodAge: number | null, blauwAge: number | null) {
  if (roodAge == null || blauwAge == null) return false;
  return (roodAge < 18 && blauwAge >= 18) || (blauwAge < 18 && roodAge >= 18);
}

function isLicentieOfKeurmerkMelding(row: ResultRow) {
  const text = lower(
    [
      row?.rule_code,
      row?.rule,
      row?.boodschap,
      row?.title,
      row?.type,
    ]
      .map((x) => s(x))
      .filter(Boolean)
      .join(" "),
  );

  return (
    text.includes("licentie") ||
    text.includes("license") ||
    text.includes("keurmerk") ||
    text.includes("sportschool geen keurmerk") ||
    text.includes("sportschool zonder keurmerk")
  );
}

function resultSeverity(row: ResultRow): Severity {
  // Licentie en keurmerk zijn duidelijke waarschuwingen voor de matchmaker,
  // maar mogen op deze matchpagina geen VERBOD veroorzaken.
  if (isLicentieOfKeurmerkMelding(row)) return "LET OP";

  const x = lower(row?.severity ?? row?.resultaat ?? row?.original_resultaat);

  if (x.includes("verbod")) return "VERBOD";
  if (x.includes("dispensatie")) return "DISPENSATIE";
  if (x.includes("afkeur") || x.includes("afgekeurd")) return "AFKEUR";
  if (x.includes("info")) return "INFO";
  if (x.includes("let") || x.includes("actie") || x.includes("warn"))
    return "LET OP";
  return "OK";
}


function engineSeverity(hit: EngineHit): Severity {
  const x = lower(
    hit?.resultaat ??
      hit?.severity ??
      hit?.original_resultaat ??
      hit?.status ??
      hit?.type,
  );

  if (x.includes("verbod")) return "VERBOD";
  if (x.includes("dispensatie")) return "DISPENSATIE";
  if (x.includes("afkeur") || x.includes("afgekeurd") || x.includes("error")) return "AFKEUR";
  if (x.includes("info")) return "INFO";
  if (x.includes("actie") || x.includes("warning") || x.includes("warn") || x.includes("let")) return "LET OP";
  return "OK";
}

function hitTitle(hit: EngineHit) {
  return s(hit?.rule ?? hit?.title ?? hit?.rule_code ?? "Melding") || "Melding";
}

function hitDetail(hit: EngineHit) {
  return s(hit?.boodschap ?? hit?.detail ?? hit?.message ?? hit?.omschrijving) || "Controle melding.";
}

function hitValue(hit: EngineHit) {
  return s(hit?.resultaat ?? hit?.severity ?? hit?.status) || engineSeverity(hit);
}

function extractEngineHits(json: any): EngineHit[] {
  const candidates = [
    json?.hits,
    json?.ruleHits,
    json?.rule_hits,
    json?.meldingen,
    json?.resultaten,
    json?.results,
    json?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as EngineHit[];
  }

  if (Array.isArray(json)) return json as EngineHit[];
  return [];
}

function severityRank(x: Severity) {
  return { OK: 0, INFO: 1, "LET OP": 2, DISPENSATIE: 3, AFKEUR: 4, VERBOD: 5 }[x];
}

function worst(items: { severity: Severity }[]) {
  return items.reduce<Severity>(
    (acc, item) =>
      severityRank(item.severity) > severityRank(acc) ? item.severity : acc,
    "OK",
  );
}

function normVa(v: unknown) {
  return s(v).replace(/[^0-9]/g, "");
}

function rowMatchesFighter(row: ResultRow, f?: Fighter | null) {
  if (!f) return false;
  const d = deep(f);
  const va = normVa(firstFilled(f.va_nummer, f.va, d.fightersRaw?.va_nummer, d.aanmelding?.va_nummer));
  const inschrijvingId = s(firstFilled(f.inschrijving_id, f.aanmelding_id, f.id, d.aanmelding?.id));
  const fighterId = s(firstFilled(f.fighter_id, d.fightersRaw?.fighter_id));

  return (
    (!!va && normVa(row.va_nummer) === va) ||
    (!!inschrijvingId && s(firstFilled(row.inschrijving_id, row.aanmelding_id)) === inschrijvingId) ||
    (!!fighterId && s(row.fighter_id) === fighterId) ||
    (!!s(row.naam) && lower(row.naam) === lower(name(f)))
  );
}
const page: CSSProperties = {
  minHeight: "100vh",
  padding: "8px 10px 16px",
  color: "#f4f4f5",
  background:
    "radial-gradient(circle at top, rgba(255,77,0,.10), transparent 30%), linear-gradient(135deg,#101114,#28292d 52%,#111214)",
};

export default function NieuweMatchPage() {
  const params = useParams<{ matchmakingId?: string; matchmakingid?: string }>();
  const search = useSearchParams();
  const router = useRouter();

  // Sommige routes gebruiken [matchmakingId], andere oude routes [matchmakingid].
  // Pak beide, anders wordt de API aangeroepen met een lege id.
  const matchmakingId = String(params?.matchmakingId ?? params?.matchmakingid ?? "");
  const roodId = search.get("rood") || "";
  const blauwId = search.get("blauw") || "";

  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [engineHits, setEngineHits] = useState<EngineHit[]>([]);
  const [engineLoading, setEngineLoading] = useState(false);
  const [engineError, setEngineError] = useState("");
  const [mm, setMm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [dispensatieOpen, setDispensatieOpen] = useState(false);
  const [weightConfirmOpen, setWeightConfirmOpen] = useState(false);
  const [weightWarningOpen, setWeightWarningOpen] = useState(false);
  const [maxWeightInput, setMaxWeightInput] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await authedFetch(`/api/matchmaker/${matchmakingId}`);
      const json = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json?.error || "Laden mislukt");

      setFighters(json?.fighters ?? json?.gecontroleerde_fighters ?? []);
      setMm(json?.matchmaking ?? null);

      // Regels/meldingen komen niet meer uit lokale page-logica.
      // De pagina laadt alleen vechters en laat MatchEngine de controle doen.

    } catch (e: any) {
      setMsg(e?.message || "Laden mislukt");
    }
  }, [matchmakingId]);

  useEffect(() => {
    if (matchmakingId) load();
  }, [matchmakingId, load]);

  const rood = useMemo(
    () =>
      fighters.find(
        (f) =>
          idOf(f) === roodId ||
          s(f.va_nummer) === roodId ||
          s(f.fighter_id) === roodId ||
          s(f.inschrijving_id) === roodId,
      ),
    [fighters, roodId],
  );

  const blauw = useMemo(
    () =>
      fighters.find(
        (f) =>
          idOf(f) === blauwId ||
          s(f.va_nummer) === blauwId ||
          s(f.fighter_id) === blauwId ||
          s(f.inschrijving_id) === blauwId,
      ),
    [fighters, blauwId],
  );


  const eventDate = s(
    mm?.datum ??
      mm?.event_datum ??
      mm?.evenement_datum ??
      mm?.date ??
      rood?.evenement_datum ??
      blauw?.evenement_datum ??
      mm?.created_at,
  );

  useEffect(() => {
    if (!matchmakingId || !rood || !blauw) {
      setEngineHits([]);
      setEngineError("");
      setEngineLoading(false);
      return;
    }

    let alive = true;

    async function checkMatchWithEngine() {
      setEngineLoading(true);
      setEngineError("");

      try {
        const res = await authedFetch(`/api/matchmaker/${matchmakingId}/match-check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchmaking_id: matchmakingId,
            event_date: eventDate || null,
            rood_inschrijving_id: rood?.inschrijving_id ?? rood?.id ?? null,
            blauw_inschrijving_id: blauw?.inschrijving_id ?? blauw?.id ?? null,
            rood_fighter_id: rood?.fighter_id || rood?.va_nummer || null,
            blauw_fighter_id: blauw?.fighter_id || blauw?.va_nummer || null,
            rood,
            blauw,
            max_gewicht: n(maxWeightInput),
            afgesproken_max_gewicht: n(maxWeightInput),
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || json?.message || "MatchEngine controle mislukt");

        if (alive) setEngineHits(extractEngineHits(json));
      } catch (e: any) {
        if (alive) {
          setEngineHits([]);
          setEngineError(e?.message || "MatchEngine controle mislukt");
        }
      } finally {
        if (alive) setEngineLoading(false);
      }
    }

    checkMatchWithEngine();

    return () => {
      alive = false;
    };
  }, [matchmakingId, rood, blauw, eventDate, maxWeightInput]);

  const analysis = useMemo(() => {
    const roodAge = ageOnDate(birthDate(rood), eventDate);
    const blauwAge = ageOnDate(birthDate(blauw), eventDate);
    const youth = isYouthMatch(rood, blauw, eventDate);
    const maxWeightSuggestion = suggestedMaxWeight(rood, blauw, youth);
    const enteredMaxWeight = n(maxWeightInput);

    const engineItems = engineHits.map((hit, idx) => ({
      title: hitTitle(hit),
      value: hitValue(hit),
      severity: engineSeverity(hit),
      detail: hitDetail(hit),
      icon: <ShieldAlert size={16} />,
      code: s(hit?.rule_code ?? hit?.code ?? idx),
    }));

    const errorItems = engineError
      ? [
          {
            title: "MatchEngine",
            value: "LET OP",
            severity: "LET OP" as Severity,
            detail: engineError,
            icon: <ShieldAlert size={16} />,
            code: "MATCH_ENGINE_ERROR",
          },
        ]
      : [];

    const allItems = [...engineItems, ...errorItems];

    return {
      youth,
      roodAge,
      blauwAge,
      maxWeightSuggestion,
      enteredMaxWeight,
      items: allItems,
      worst: engineLoading ? ("LET OP" as Severity) : worst(allItems),
    };
  }, [rood, blauw, eventDate, maxWeightInput, engineHits, engineError, engineLoading]);

  const comparison = useMemo(() => {
    const rw = weight(rood);
    const bw = weight(blauw);
    const weightDiff = rw != null && bw != null ? Math.abs(rw - bw) : null;
    const ageDiff =
      analysis.roodAge != null && analysis.blauwAge != null
        ? Math.abs(analysis.roodAge - analysis.blauwAge)
        : null;
    const roodRecord = recordLabel(rood);
    const blauwRecord = recordLabel(blauw);
    const sameDiscipline =
      !!discipline(rood) &&
      !!discipline(blauw) &&
      lower(discipline(rood)) === lower(discipline(blauw));
    const sameClass =
      !!klass(rood) &&
      !!klass(blauw) &&
      normalizeClassToken(klass(rood)) === normalizeClassToken(klass(blauw));

    return {
      rw,
      bw,
      weightDiff,
      ageDiff,
      roodRecord,
      blauwRecord,
      sameDiscipline,
      sameClass,
    };
  }, [rood, blauw, analysis.roodAge, analysis.blauwAge]);

  useEffect(() => {
    if (!rood || !blauw || maxWeightInput) return;
    const suggestion = suggestedMaxWeight(rood, blauw, analysis.youth);
    if (suggestion != null) setMaxWeightInput(fmtKg(suggestion));
  }, [rood, blauw, analysis.youth, maxWeightInput]);

  async function doSave() {
    setBusy(true);
    setMsg("");

    try {
      const res = await authedFetch("/api/matchmaker/create-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          rood_inschrijving_id: rood?.inschrijving_id ?? rood?.id ?? null,
          blauw_inschrijving_id: blauw?.inschrijving_id ?? blauw?.id ?? null,
          rood_fighter_id: rood?.fighter_id || rood?.va_nummer || null,
          blauw_fighter_id: blauw?.fighter_id || blauw?.va_nummer || null,
          max_gewicht: analysis.enteredMaxWeight,
          afgesproken_max_gewicht: analysis.enteredMaxWeight,
          gewicht: analysis.enteredMaxWeight,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Opslaan mislukt");

      router.push(`/dashboard/matchmaker/matchmaking/${matchmakingId}/match`);
    } catch (e: any) {
      setMsg(e?.message || "Opslaan mislukt");
    } finally {
      setBusy(false);
    }
  }

  async function save(forceDispensatie = false) {
    if (!rood || !blauw) {
      setMsg("Kies eerst rood en blauw.");
      return;
    }

    if (engineLoading) {
      setMsg("Wacht tot de MatchEngine controle klaar is.");
      return;
    }

    if (engineError) {
      setMsg(`MatchEngine controle is niet gelukt:
${engineError}`);
      return;
    }

    const verboden = analysis.items.filter(
      (item) => item.severity === "VERBOD",
    );
    if (verboden.length > 0) {
      setMsg(
        `Deze match mag niet worden opgeslagen:\n${verboden
          .map((item) => `• ${item.title}: ${item.detail}`)
          .join("\n")}`,
      );
      return;
    }

    const dispensaties = analysis.items.filter(
      (item) => item.severity === "DISPENSATIE",
    );

    if (!forceDispensatie && dispensaties.length > 0) {
      setDispensatieOpen(true);
      return;
    }

    if (!maxWeightInput && analysis.maxWeightSuggestion != null) {
      setMaxWeightInput(fmtKg(analysis.maxWeightSuggestion));
    }
    setWeightConfirmOpen(true);
  }

  function getWeightUnderLimitInfo() {
    const rw = weight(rood);
    const bw = weight(blauw);
    const entered = n(maxWeightInput);

    if (entered == null) return null;

    const weights = [rw, bw].filter(
      (value): value is number => value != null && Number.isFinite(value),
    );
    if (!weights.length) return null;

    const heavier = Math.max(...weights);
    if (entered >= heavier) return null;

    return {
      entered,
      heavier,
      message: `Max gewicht -${fmtKg(entered)} kg ligt onder het opgegeven gewicht van een vechter (${fmtKg(heavier)} kg).`,
    };
  }

  function confirmWeightAndSave() {
    const entered = n(maxWeightInput);

    if (entered == null) {
      setMsg("Vul het maximale wedstrijdgewicht in.");
      return;
    }

    const underLimit = getWeightUnderLimitInfo();
    if (underLimit && analysis.youth) {
      // De jeugdblokkade blijft zichtbaar in de gewichtspopup.
      return;
    }

    if (underLimit) {
      setWeightConfirmOpen(false);
      setWeightWarningOpen(true);
      return;
    }

    setWeightConfirmOpen(false);
    doSave();
  }

  return (
    <main style={page}>
      <div className="fs-shell">
        <header className="fs-page-head">
          <Link
            className="fs-back"
            href={`/dashboard/matchmaker/matchmaking/${matchmakingId}/match`}
          >
            <ArrowLeft size={16} />
            Terug
          </Link>

          <div className="fs-head-title">
            <span>FIGHTSUPPORT</span>
            <b>Nieuwe match</b>
            <small>
              {val(mm?.naam ?? mm?.event_naam ?? mm?.titel)} •{" "}
              {formatDate(eventDate)}
            </small>
          </div>

          <StatusPill severity={analysis.worst} />
          {engineLoading && <span className="fs-engine-loading">MatchEngine controle...</span>}
        </header>

        {msg && <div className="fs-message">{msg}</div>}

        <section className="fs-matchplate">
          <FighterPanel
            corner="red"
            title="RODE HOEK"
            matchmakingId={matchmakingId}
            f={rood}
            age={analysis.roodAge}
          />

          <div className="fs-center">
            <div className={`fs-verdict severity-${analysis.worst.toLowerCase().replace(" ", "-")}`}>
              <div className="fs-verdict-icon">
                {analysis.worst === "OK" ? <CheckCircle2 size={26} /> : <ShieldAlert size={26} />}
              </div>
              <div>
                <span>MATCHENGINE OORDEEL</span>
                <b>{engineLoading ? "Controle wordt uitgevoerd" : analysis.worst === "OK" ? "Deze combinatie voldoet" : analysis.worst === "LET OP" ? "Actie of overleg nodig" : analysis.worst}</b>
              </div>
              <strong>{engineLoading ? "…" : analysis.items.filter((item) => item.severity !== "OK").length}</strong>
            </div>

            <div className="fs-comparison">
              <div className="fs-comparison-head">
                <BarChart3 size={16} />
                VERSCHILLEN IN ÉÉN OOGOPSLAG
              </div>
              <ComparisonRow
                label="Leeftijd"
                red={analysis.roodAge == null ? "-" : `${analysis.roodAge} jaar`}
                blue={analysis.blauwAge == null ? "-" : `${analysis.blauwAge} jaar`}
                difference={comparison.ageDiff == null ? "-" : `${comparison.ageDiff} jaar verschil`}
                state={comparison.ageDiff == null ? "neutral" : analysis.youth && comparison.ageDiff >= 2 ? "warn" : "ok"}
              />
              <ComparisonRow
                label="Gewicht"
                red={comparison.rw == null ? "-" : `${fmtKg(comparison.rw)} kg`}
                blue={comparison.bw == null ? "-" : `${fmtKg(comparison.bw)} kg`}
                difference={comparison.weightDiff == null ? "-" : `${fmtKg(comparison.weightDiff)} kg verschil`}
                state={comparison.weightDiff == null ? "neutral" : comparison.weightDiff > (analysis.youth ? 2 : isMmaMatch(rood, blauw) ? 4 : 3) ? "warn" : "ok"}
              />
              <ComparisonRow
                label="Ervaring"
                red={comparison.roodRecord}
                blue={comparison.blauwRecord}
                difference="Record"
                state="neutral"
              />
              <ComparisonRow
                label="Klasse"
                red={val(klass(rood))}
                blue={val(klass(blauw))}
                difference={comparison.sameClass ? "Gelijk" : "Verschillend"}
                state={comparison.sameClass ? "ok" : "warn"}
              />
              <ComparisonRow
                label="Discipline"
                red={val(discipline(rood))}
                blue={val(discipline(blauw))}
                difference={comparison.sameDiscipline ? "Gelijk" : "Verschillend"}
                state={comparison.sameDiscipline ? "ok" : "warn"}
              />
            </div>

            <div className="fs-agreement">
              <span>Afgesproken maximum</span>
              <b>{maxWeightInput ? `-${maxWeightInput} kg` : analysis.maxWeightSuggestion == null ? "Nog niet ingevuld" : `Voorstel -${fmtKg(analysis.maxWeightSuggestion)} kg`}</b>
              <small>{weightLimitText(rood, blauw, analysis.youth)}</small>
            </div>

            <div className="fs-center-alerts">
              {analysis.items.filter((item) => item.severity !== "OK").length > 0 ? (
                analysis.items
                  .filter((item) => item.severity !== "OK")
                  .slice(0, 4)
                  .map((item, idx) => (
                    <div
                      className={`fs-center-alert ${item.severity === "INFO" ? "info" : severityRank(item.severity) >= 4 ? "danger" : "warning"}`}
                      key={`${item.code}-${idx}`}
                    >
                      <div className="fs-alert-icon">{item.severity === "INFO" ? "i" : "!"}</div>
                      <div className="fs-alert-text">
                        <div className="fs-alert-title">
                          {item.severity === "LET OP" ? "ACTIE" : item.severity}: {item.title}
                        </div>
                        <div className="fs-alert-detail">{item.detail}</div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="fs-center-alert ok">
                  <div className="fs-alert-icon">✓</div>
                  <div className="fs-alert-text">
                    <div className="fs-alert-title">OK: MatchEngine</div>
                    <div className="fs-alert-detail">
                      {engineLoading ? "Controle wordt uitgevoerd..." : "Geen open MatchEngine-meldingen voor deze combinatie."}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              className="fs-save"
              disabled={busy || !rood || !blauw}
              onClick={() => save()}
            >
              <Save size={16} />
              {busy ? "Opslaan..." : "Match opslaan"}
            </button>
          </div>

          <FighterPanel
            corner="blue"
            title="BLAUWE HOEK"
            matchmakingId={matchmakingId}
            f={blauw}
            age={analysis.blauwAge}
          />
        </section>
      </div>

      {weightConfirmOpen && (
        <div className="fs-modal-overlay">
          <div className="fs-modal-card fs-weight-modal-card">
            <div className="fs-modal-head">
              <div>
                <div className="fs-modal-kicker">
                  FightSupport wedstrijdgewicht
                </div>
                <div className="fs-modal-title">Max gewicht vastzetten</div>
              </div>
              <div className="fs-modal-badge">kg</div>
            </div>

            <div className="fs-modal-body">
              <p className="fs-modal-intro">
                Controleer de opgegeven gewichten en zet het maximale
                wedstrijdgewicht vast. Dit wordt opgeslagen als{" "}
                <b>max_gewicht</b> in de partij.
              </p>

              <div className="fs-weight-summary">
                <div>
                  <span>Rode hoek</span>
                  <b>{fmtKg(weight(rood)) || "-"} kg</b>
                  <small>{name(rood)}</small>
                </div>
                <div>
                  <span>Blauwe hoek</span>
                  <b>{fmtKg(weight(blauw)) || "-"} kg</b>
                  <small>{name(blauw)}</small>
                </div>
                <div className="proposal">
                  <span>Voorstel</span>
                  <b>-{fmtKg(analysis.maxWeightSuggestion)} kg</b>
                  <small>{weightLimitText(rood, blauw, analysis.youth)}</small>
                </div>
              </div>

              <div className="fs-weight-confirm-field">
                <label htmlFor="max-weight-confirm">
                  Max gewicht wedstrijd
                </label>
                <div className="fs-weight-input-row">
                  <span>-</span>
                  <input
                    id="max-weight-confirm"
                    value={maxWeightInput}
                    onChange={(e) => setMaxWeightInput(e.target.value)}
                    inputMode="decimal"
                    placeholder={
                      analysis.maxWeightSuggestion == null
                        ? "bijv. 72,5"
                        : fmtKg(analysis.maxWeightSuggestion)
                    }
                    autoFocus
                  />
                  <span>kg</span>
                </div>
                <small>
                  Typ het voorstel over of pas het bewust aan. Beide vechters
                  moeten zich aan dit maximum houden.
                </small>
              </div>

              {getWeightUnderLimitInfo() && analysis.youth && (
                <div className="fs-weight-warning is-blocking">
                  <ShieldAlert size={18} />
                  <div>
                    <b>Opslaan geblokkeerd bij jeugd</b>
                    <span>{getWeightUnderLimitInfo()?.message}</span>
                    <small>
                      Overleg met de trainer en pas het opgegeven gewicht aan.
                    </small>
                  </div>
                </div>
              )}

              <div className="fs-modal-actions">
                <button
                  type="button"
                  className="fs-modal-cancel"
                  onClick={() => setWeightConfirmOpen(false)}
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  className="fs-modal-confirm"
                  onClick={confirmWeightAndSave}
                >
                  Bevestigen en opslaan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {weightWarningOpen && getWeightUnderLimitInfo() && !analysis.youth && (
        <div className="fs-modal-overlay">
          <div className="fs-modal-card">
            <div className="fs-modal-head">
              <div>
                <div className="fs-modal-kicker">FightSupport waarschuwing</div>
                <div className="fs-modal-title">Gewicht ligt onder de opgave</div>
              </div>
              <div className="fs-modal-badge">!</div>
            </div>

            <div className="fs-modal-body">
              <div className="fs-weight-warning">
                <ShieldAlert size={18} />
                <div>
                  <b>Controleer deze gewichtsafspraak</b>
                  <span>{getWeightUnderLimitInfo()?.message}</span>
                  <small>
                    Bij een volwassen partij blokkeert dit het opslaan niet.
                    Bevestig alleen wanneer dit gewicht bewust met de trainers is afgesproken.
                  </small>
                </div>
              </div>

              <div className="fs-modal-actions">
                <button
                  type="button"
                  className="fs-modal-cancel"
                  onClick={() => {
                    setWeightWarningOpen(false);
                    setWeightConfirmOpen(true);
                  }}
                >
                  Gewicht aanpassen
                </button>
                <button
                  type="button"
                  className="fs-modal-confirm"
                  onClick={() => {
                    setWeightWarningOpen(false);
                    doSave();
                  }}
                >
                  Toch opslaan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dispensatieOpen && (
        <div className="fs-modal-overlay">
          <div className="fs-modal-card">
            <div className="fs-modal-head">
              <div>
                <div className="fs-modal-kicker">FightSupport controle</div>
                <div className="fs-modal-title">Dispensatie vereist</div>
              </div>
              <div className="fs-modal-badge">!</div>
            </div>

            <div className="fs-modal-body">
              <p className="fs-modal-intro">
                Voor deze match is dispensatie nodig. De matchmaker moet dit
                bewust bevestigen.
              </p>

              <div className="fs-modal-list">
                {analysis.items
                  .filter((item) => item.severity === "DISPENSATIE")
                  .map((item, idx) => (
                    <div className="fs-modal-rule" key={`${item.title}-${idx}`}>
                      <div className="fs-modal-rule-title">{item.title}</div>
                      <div className="fs-modal-rule-detail">{item.detail}</div>
                    </div>
                  ))}
              </div>

              <div className="fs-modal-question">
                Weet je zeker dat je deze partij met dispensatie wilt opslaan?
              </div>

              <div className="fs-modal-actions">
                <button
                  type="button"
                  className="fs-modal-cancel"
                  onClick={() => setDispensatieOpen(false)}
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  className="fs-modal-confirm"
                  onClick={() => {
                    setDispensatieOpen(false);
                    save(true);
                  }}
                >
                  Ja, opslaan met dispensatie
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {busy && (
        <div className="fs-wait-overlay">
          <div className="fs-wait-card">
            <div className="fs-wait-ring">FS</div>
            <div>
              <div className="fs-wait-title">Match wordt opgeslagen</div>
              <div className="fs-wait-text">
                FightSupport werkt de partij bij. Je gaat zo terug naar matchen.
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .fs-shell {
          max-width: 1540px;
          margin: 0 auto;
        }

        .fs-page-head {
          min-height: 72px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background:
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.18),
              rgba(255, 255, 255, 0.04) 18%,
              rgba(255, 255, 255, 0.1) 50%,
              rgba(255, 255, 255, 0.04) 82%,
              rgba(255, 255, 255, 0.18)
            ),
            repeating-linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.055) 0 1px,
              transparent 1px 8px
            ),
            linear-gradient(180deg, #6b6b70, #202124 38%, #111214 100%);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.35),
            inset 0 -3px 0 rgba(255, 77, 0, 0.65),
            0 24px 70px rgba(0, 0, 0, 0.52);
          display: grid;
          grid-template-columns: 150px 1fr 130px;
          gap: 8px;
          align-items: center;
          padding: 10px 18px;
        }

        .fs-back {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #f4f4f5;
          text-decoration: none;
          border-radius: 999px;
          padding: 9px 14px;
          font-weight: 950;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.2),
            rgba(0, 0, 0, 0.28)
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .fs-head-title {
          text-align: center;
        }

        .fs-head-title span {
          display: block;
          color: #f4f4f5;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.18em;
        }

        .fs-head-title b {
          display: block;
          color: ${ORANGE};
          font-size: 22px;
          line-height: 1;
          margin-top: 2px;
          text-transform: uppercase;
        }

        .fs-head-title small {
          display: block;
          color: #fff;
          font-weight: 900;
          margin-top: 5px;
        }

        .fs-message {
          margin-top: 8px;
          border-radius: 14px;
          padding: 12px 14px;
          color: #ffd1bf;
          border: 1px solid rgba(255, 77, 0, 0.5);
          background: rgba(255, 77, 0, 0.11);
          font-weight: 850;
        }

        .fs-engine-loading {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #111214;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.42);
        }

        .fs-matchplate {
          margin-top: 8px;
          border-radius: 20px;
          padding: 10px;
          border: 1px solid rgba(220, 220, 225, 0.42);
          background:
            radial-gradient(circle at center, rgba(140, 140, 146, 0.36), rgba(45, 46, 50, 0.58) 42%, rgba(13, 13, 15, 0.98) 100%),
            linear-gradient(180deg, #3f4044, #242529 45%, #111214);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.42),
            inset 0 -2px 0 rgba(0, 0, 0, 0.78),
            0 22px 70px rgba(0, 0, 0, 0.56);
          display: grid;
          grid-template-columns: minmax(280px, 0.82fr) minmax(440px, 1.04fr) minmax(280px, 0.82fr);
          gap: 10px;
          align-items: start;
        }

        .fs-fighter {
          min-height: auto;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.05),
              rgba(255, 255, 255, 0.015)
            ),
            linear-gradient(135deg, #111215, #050506);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            0 18px 45px rgba(0, 0, 0, 0.55);
        }

        .fs-fighter-title {
          height: 42px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          color: white;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.25),
            inset 0 -2px 0 rgba(0, 0, 0, 0.34);
        }

        .fs-fighter.red .fs-fighter-title {
          background: linear-gradient(180deg, #ff6b6b, #991b1b 55%, #450a0a);
        }

        .fs-fighter.blue .fs-fighter-title {
          background: linear-gradient(180deg, #60a5fa, #1d4ed8 55%, #0b1f54);
        }

        .fs-fighter-body {
          padding: 10px;
        }

        .fs-fighter-name {
          margin: 0;
          color: ${ORANGE};
          font-size: 22px;
          line-height: 0.98;
          letter-spacing: -0.03em;
          text-transform: uppercase;
        }

        .fs-gym {
          margin-top: 5px;
          color: #d4d4d8;
          font-size: 15px;
          font-weight: 900;
        }

        .fs-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin: 8px 0;
        }

        .mini-badge {
          display: inline-flex;
          gap: 7px;
          align-items: center;
          border-radius: 8px;
          padding: 5px 7px;
          font-size: 11px;
          font-weight: 1000;
          border: 1px solid rgba(255, 255, 255, 0.13);
          background: rgba(255, 255, 255, 0.07);
          color: #fff;
        }

        .mini-badge.ok {
          background: rgba(22, 163, 74, 0.8);
        }

        .mini-badge.bad {
          background: rgba(185, 28, 28, 0.8);
        }

        .mini-badge.warn {
          background: rgba(180, 83, 9, 0.8);
        }

        .fs-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 3px 10px;
        }

        .fs-info-line {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          padding: 4px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          color: #e4e4e7;
          font-size: 12px;
        }

        .fs-info-line span {
          color: #b8b8bf;
          font-weight: 850;
        }

        .fs-info-line b {
          text-align: right;
        }

        .fs-info-line.dark {
          color: #f8fafc;
          border-bottom: 1px solid rgba(255, 255, 255, 0.11);
        }

        .fs-info-line.dark span {
          color: #cbd5e1;
        }

        .fs-info-line.dark b {
          color: #ffffff;
        }

        .fs-keur {
          margin-top: 8px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.13);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.08),
            rgba(255, 255, 255, 0.025)
          );
        }

        .fs-subhead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 7px 10px;
          color: white;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.08em;
          background: linear-gradient(180deg, #292a2d, #070708);
          box-shadow: inset 0 -2px 0 rgba(255, 77, 0, 0.45);
        }

        .fs-whitebox {
          padding: 7px;
          background: white;
          color: #18181b;
          white-space: pre-wrap;
          font-weight: 750;
          font-size: 12px;
        }

        .fs-center {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: stretch;
          position: relative;
          z-index: 2;
        }

        .fs-details {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(225, 225, 230, 0.28);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.025)),
            linear-gradient(135deg, #2c2d31, #131416 58%, #070708);
          color: #fff;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.20),
            inset 0 -2px 0 rgba(255, 77, 0, 0.34),
            0 14px 34px rgba(0, 0, 0, 0.42);
        }

        .fs-details .fs-info-line {
          padding: 6px 10px;
        }

        .fs-details-head,
        .fs-block-head {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 12px;
          color: #fff;
          font-weight: 1000;
          letter-spacing: 0.08em;
          background: linear-gradient(180deg, #292a2d, #070708);
          box-shadow: inset 0 -2px 0 rgba(255, 77, 0, 0.55);
        }

        .fs-details-head {
          grid-column: 1 / -1;
        }

        .fs-weight-field,
        .fs-weight-confirm-field {
          padding: 12px 14px 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.11);
          background: linear-gradient(
            180deg,
            rgba(255, 77, 0, 0.12),
            rgba(255, 255, 255, 0.03)
          );
        }

        .fs-weight-field label,
        .fs-weight-confirm-field label {
          display: block;
          color: #fff;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .fs-weight-input-row {
          display: grid;
          grid-template-columns: 28px 1fr 34px;
          align-items: center;
          gap: 8px;
        }

        .fs-weight-input-row span {
          color: ${ORANGE};
          font-size: 22px;
          font-weight: 1000;
          text-align: center;
        }

        .fs-weight-input-row input {
          width: 100%;
          height: 42px;
          border-radius: 13px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          outline: none;
          padding: 0 13px;
          color: #fff;
          font-size: 20px;
          font-weight: 1000;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.12),
            rgba(0, 0, 0, 0.34)
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
        }

        .fs-weight-field small,
        .fs-weight-confirm-field small {
          display: block;
          margin-top: 8px;
          color: #e4e4e7;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.35;
        }

        .fs-center-alerts {
          display: grid;
          gap: 10px;
        }

        .fs-center-alert {
          min-height: 72px;
          border-radius: 14px;
          padding: 10px 14px;
          display: grid;
          grid-template-columns: 56px 1fr;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255, 97, 13, 0.88);
          background:
            radial-gradient(circle at left, rgba(255, 77, 0, 0.20), transparent 38%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.025)),
            linear-gradient(135deg, #28292d, #111214 58%, #070708);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.18),
            inset 0 -2px 0 rgba(255, 77, 0, 0.42),
            0 14px 32px rgba(0, 0, 0, 0.42);
        }

        .fs-center-alert.info {
          border-color: rgba(96, 165, 250, 0.88);
          background:
            radial-gradient(circle at left, rgba(59, 130, 246, 0.20), transparent 38%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.025)),
            linear-gradient(135deg, #28292d, #111214 58%, #070708);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.18),
            inset 0 -2px 0 rgba(59, 130, 246, 0.42),
            0 14px 32px rgba(0, 0, 0, 0.42);
        }

        .fs-center-alert.danger {
          border-color: rgba(220, 38, 38, 0.90);
        }

        .fs-alert-icon {
          width: 48px;
          height: 42px;
          margin: 0 auto;
          display: grid;
          place-items: center;
          color: #0b0b0c;
          font-size: 28px;
          line-height: 1;
          font-weight: 1000;
          clip-path: polygon(50% 0, 100% 100%, 0 100%);
          padding-top: 10px;
          background: linear-gradient(180deg, #ff8a1c, #ff4d00 60%, #a83200);
          text-shadow: 0 1px 0 rgba(255,255,255,.25);
          box-shadow: 0 10px 22px rgba(255, 77, 0, 0.22);
        }

        .fs-alert-text {
          display: flex;
          min-width: 0;
          flex-direction: column;
          justify-content: center;
        }

        .fs-alert-title {
          color: ${ORANGE};
          font-size: 15px;
          line-height: 1.1;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .fs-alert-detail {
          margin-top: 7px;
          color: #ffffff;
          font-size: 14px;
          line-height: 1.36;
          font-weight: 950;
        }

        .fs-save {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: min(560px, 100%);
          margin: 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.48);
          border-radius: 14px;
          padding: 14px 16px;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          font-weight: 1000;
          cursor: pointer;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0.08) 18%, rgba(38,39,42,0.98) 52%, rgba(12,12,14,0.98)),
            repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 8px);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.42),
            inset 0 -2px 0 rgba(255, 77, 0, 0.46),
            0 0 0 4px rgba(255,255,255,0.06),
            0 14px 28px rgba(0, 0, 0, 0.42);
        }

        .fs-save:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .fs-checks {
          margin-top: 8px;
          border-radius: 20px;
          border: 1px solid rgba(210, 210, 215, 0.34);
          background:
            linear-gradient(
              180deg,
              rgba(90, 90, 96, 0.92),
              rgba(34, 34, 38, 0.98) 42%,
              rgba(10, 10, 12, 0.98)
            );
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.24),
            inset 0 -2px 0 rgba(255, 77, 0, 0.42),
            0 18px 45px rgba(0, 0, 0, 0.42);
          overflow: hidden;
        }

        .dot {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          background: ${ORANGE};
        }

        .fs-check-grid {
          padding: 18px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(285px, 1fr));
          gap: 14px;
        }

        .fs-check-card {
          min-height: 118px;
          border-radius: 14px;
          padding: 16px 17px;
          border: 1px solid rgba(225, 225, 230, 0.22);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.025)),
            linear-gradient(135deg, #2a2a2f, #111113 72%, #070708);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.18),
            inset 0 -1px 0 rgba(255, 77, 0, 0.25),
            0 12px 26px rgba(0, 0, 0, 0.32);
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
        }

        .fs-check-card.top {
          border-color: rgba(255, 77, 0, 0.68);
          background:
            linear-gradient(180deg, rgba(255, 77, 0, 0.18), rgba(255, 255, 255, 0.03)),
            linear-gradient(135deg, #332522, #151515 72%, #080808);
        }

        .fs-check-card.mid {
          border-color: rgba(255, 77, 0, 0.58);
          background:
            linear-gradient(180deg, rgba(255, 77, 0, 0.14), rgba(255, 255, 255, 0.035)),
            linear-gradient(135deg, #353438, #171719 72%, #09090a);
        }

        .fs-check-title {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-bottom: 9px;
          flex-wrap: wrap;
        }

        .fs-check-title b {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #ffffff;
          font-size: 15px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .fs-check-value {
          font-size: 22px;
          line-height: 1;
          font-weight: 1000;
          color: ${ORANGE};
          text-transform: uppercase;
          margin: 2px 0 8px;
        }

        .fs-check-detail {
          margin: 0 auto;
          color: #f4f4f5;
          font-size: 15px;
          line-height: 1.38;
          font-weight: 900;
          max-width: 92%;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 8px;
          padding: 5px 7px;
          font-size: 11px;
          font-weight: 1000;
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #fff;
        }

        .status-pill.ok {
          background: rgba(22, 163, 74, 0.85);
        }

        .status-pill.warn {
          background: rgba(180, 83, 9, 0.9);
        }

        .status-pill.bad {
          background: rgba(234, 88, 12, 0.9);
        }

        .status-pill.stop {
          background: rgba(185, 28, 28, 0.92);
        }

        .fs-fighter-title {
          justify-content: space-between;
        }

        .fs-header-detail {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          color: #fff;
          text-decoration: none;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.08em;
          border: 1px solid rgba(255, 255, 255, 0.26);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.22),
            rgba(0, 0, 0, 0.28)
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .fs-header-detail:hover {
          background: linear-gradient(
            180deg,
            rgba(255, 77, 0, 0.95),
            rgba(120, 28, 0, 0.95)
          );
        }

        .status-pill.disp {
          background: rgba(255, 77, 0, 0.95);
        }

        .fs-modal-overlay,
        .fs-wait-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: radial-gradient(
            circle at center,
            rgba(255, 77, 0, 0.16),
            rgba(0, 0, 0, 0.82) 54%,
            rgba(0, 0, 0, 0.92)
          );
          backdrop-filter: blur(10px);
        }

        .fs-modal-card,
        .fs-wait-card {
          width: min(760px, 100%);
          border-radius: 28px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background:
            repeating-linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.04) 0 1px,
              transparent 1px 8px
            ),
            linear-gradient(180deg, #6b6b70 0%, #202124 34%, #0b0c0f 100%);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.35),
            inset 0 -3px 0 rgba(255, 77, 0, 0.65),
            0 34px 90px rgba(0, 0, 0, 0.72),
            0 0 48px rgba(255, 77, 0, 0.18);
        }

        .fs-weight-modal-card {
          width: min(820px, 100%);
        }

        .fs-weight-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin: 18px 0;
        }

        .fs-weight-summary > div {
          min-height: 112px;
          border-radius: 14px;
          padding: 15px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1),
            rgba(0, 0, 0, 0.24)
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .fs-weight-summary .proposal {
          border-color: rgba(255, 77, 0, 0.5);
          background: linear-gradient(
            180deg,
            rgba(255, 77, 0, 0.2),
            rgba(0, 0, 0, 0.24)
          );
        }

        .fs-weight-summary span {
          display: block;
          color: #d4d4d8;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .fs-weight-summary b {
          display: block;
          margin-top: 8px;
          color: #fff;
          font-size: 22px;
          line-height: 1;
        }

        .fs-weight-summary small {
          display: block;
          margin-top: 8px;
          color: #f4f4f5;
          font-weight: 800;
          line-height: 1.35;
        }

        .fs-weight-confirm-field {
          margin-top: 8px;
          border-radius: 20px;
          border: 1px solid rgba(255, 77, 0, 0.42);
        }

        .fs-modal-head {
          padding: 22px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.16);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.14),
            rgba(0, 0, 0, 0.18)
          );
        }

        .fs-modal-kicker {
          color: rgba(255, 255, 255, 0.6);
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .fs-modal-title {
          margin-top: 4px;
          color: #fff;
          font-size: 32px;
          font-weight: 1000;
          text-transform: uppercase;
        }

        .fs-modal-badge {
          width: 58px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: #fff;
          font-size: 22px;
          font-weight: 1000;
          background: linear-gradient(180deg, #ff8a00, #ff4d00);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.38),
            0 0 30px rgba(255, 77, 0, 0.35);
        }

        .fs-modal-body {
          padding: 24px;
        }

        .fs-modal-intro,
        .fs-modal-question {
          margin: 0 0 16px;
          color: #f4f4f5;
          font-weight: 850;
        }

        .fs-modal-list {
          display: grid;
          gap: 8px;
        }

        .fs-modal-rule {
          border-radius: 14px;
          padding: 16px;
          border: 1px solid rgba(255, 77, 0, 0.4);
          background: linear-gradient(
            180deg,
            rgba(255, 77, 0, 0.16),
            rgba(0, 0, 0, 0.18)
          );
        }

        .fs-modal-rule-title {
          color: #ffb089;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .fs-modal-rule-detail {
          margin-top: 6px;
          color: #fff;
          font-weight: 800;
          line-height: 1.5;
        }

        .fs-modal-question {
          margin-top: 22px;
          padding: 14px 16px;
          border-radius: 14px;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.06);
        }

        .fs-weight-warning {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-top: 14px;
          padding: 12px 14px;
          border: 1px solid rgba(255, 184, 0, 0.75);
          border-radius: 10px;
          background: rgba(255, 184, 0, 0.12);
          color: #fff3c4;
        }

        .fs-weight-warning.is-blocking {
          border-color: rgba(255, 77, 0, 0.9);
          background: rgba(255, 77, 0, 0.16);
          color: #ffe2d6;
        }

        .fs-weight-warning > div {
          display: grid;
          gap: 4px;
        }

        .fs-weight-warning b,
        .fs-weight-warning span,
        .fs-weight-warning small {
          display: block;
        }

        .fs-weight-warning span {
          line-height: 1.45;
        }

        .fs-weight-warning small {
          color: rgba(255, 255, 255, 0.72);
        }

        .fs-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 22px;
        }

        .fs-modal-cancel,
        .fs-modal-confirm {
          height: 50px;
          border-radius: 14px;
          padding: 0 22px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          cursor: pointer;
          font-weight: 1000;
        }

        .fs-modal-cancel {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.16),
            rgba(0, 0, 0, 0.3)
          );
        }

        .fs-modal-confirm {
          background: linear-gradient(180deg, #ff7b00, #ff4d00 54%, #7c1f00);
          box-shadow: 0 0 28px rgba(255, 77, 0, 0.35);
        }

        .fs-weight-modal-card {
          width: min(820px, 100%);
        }

        .fs-weight-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin: 18px 0;
        }

        .fs-weight-summary > div {
          min-height: 112px;
          border-radius: 14px;
          padding: 15px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1),
            rgba(0, 0, 0, 0.24)
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .fs-weight-summary .proposal {
          border-color: rgba(255, 77, 0, 0.5);
          background: linear-gradient(
            180deg,
            rgba(255, 77, 0, 0.2),
            rgba(0, 0, 0, 0.24)
          );
        }

        .fs-weight-summary span {
          display: block;
          color: #d4d4d8;
          font-size: 11px;
          font-weight: 1000;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .fs-weight-summary b {
          display: block;
          margin-top: 8px;
          color: #fff;
          font-size: 22px;
          line-height: 1;
        }

        .fs-weight-summary small {
          display: block;
          margin-top: 8px;
          color: #f4f4f5;
          font-weight: 800;
          line-height: 1.35;
        }

        .fs-weight-confirm-field {
          margin-top: 8px;
          border-radius: 20px;
          border: 1px solid rgba(255, 77, 0, 0.42);
        }

        .fs-wait-card {
          width: min(540px, 100%);
          padding: 26px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .fs-wait-ring {
          width: 72px;
          height: 72px;
          flex: 0 0 auto;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: #fff;
          font-weight: 1000;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: radial-gradient(
            circle,
            rgba(255, 77, 0, 0.95),
            rgba(90, 20, 0, 0.95)
          );
          box-shadow: 0 0 34px rgba(255, 77, 0, 0.34);
          animation: fsPulse 1.1s ease-in-out infinite alternate;
        }

        .fs-wait-title {
          color: #fff;
          font-size: 22px;
          font-weight: 1000;
          text-transform: uppercase;
        }

        .fs-wait-text {
          margin-top: 5px;
          color: #d4d4d8;
          font-weight: 800;
        }

        .fs-muted-small {
          color: rgba(0, 0, 0, 0.68);
          font-size: 12px;
          font-weight: 800;
        }

        @keyframes fsPulse {
          from {
            transform: scale(0.96);
            filter: brightness(0.9);
          }
          to {
            transform: scale(1.04);
            filter: brightness(1.18);
          }
        }

        @media (max-width: 1220px) {
          .fs-page-head {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .fs-engine-loading {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #111214;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.42);
        }

        .fs-matchplate {
            grid-template-columns: 1fr;
          }

          .fs-center {
            order: -1;
          }

          .fs-center-alert {
            grid-template-columns: 70px 1fr;
            padding: 10px;
          }

          .fs-alert-icon {
            width: 58px;
            height: 52px;
            font-size: 32px;
          }
        }

        @media (max-width: 680px) {
          .fs-weight-summary {
            grid-template-columns: 1fr;
          }
          main {
            padding: 12px !important;
          }

          .fs-info-grid {
            grid-template-columns: 1fr;
          }
        }

        /* 2026 match cockpit makeover */
        .fs-shell { max-width: 1480px; }
        .fs-page-head {
          min-height: 64px; border-radius: 14px; padding: 8px 14px;
          grid-template-columns: 130px 1fr 170px;
          background: linear-gradient(180deg,#303238 0%,#17181c 55%,#0d0e10 100%);
          border: 1px solid rgba(255,255,255,.18);
          box-shadow: inset 0 -2px 0 ${ORANGE}, 0 12px 34px rgba(0,0,0,.38);
        }
        .fs-back, .fs-header-detail { border-radius: 8px; }
        .fs-matchplate {
          grid-template-columns: minmax(300px,.9fr) minmax(470px,1.25fr) minmax(300px,.9fr);
          gap: 8px; padding: 8px; border-radius: 16px;
          background: #0b0c0f;
          border: 1px solid rgba(255,255,255,.16);
          box-shadow: 0 18px 50px rgba(0,0,0,.42);
        }
        .fs-fighter { border-radius: 12px; background: linear-gradient(180deg,#17191d,#0d0e11); }
        .fs-fighter-title { height: 46px; padding: 0 16px; }
        .fs-fighter.red .fs-fighter-title { background: linear-gradient(90deg,#8f1018,#d62832 55%,#5e0910); }
        .fs-fighter.blue .fs-fighter-title { background: linear-gradient(90deg,#123d9b,#2864e8 55%,#102b69); }
        .fs-fighter-body { padding: 14px; }
        .fs-fighter-name { font-size: 25px; color: #fff; letter-spacing: -.02em; }
        .fs-fighter.red .fs-fighter-name { color: #ff676d; }
        .fs-fighter.blue .fs-fighter-name { color: #6f9dff; }
        .fs-gym { color: #f4f4f5; opacity: .82; }
        .fs-fighter-highlights { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin:12px 0 8px; }
        .fs-fighter-highlights div { padding:9px 8px; border-radius:9px; background:#22242a; border:1px solid rgba(255,255,255,.08); text-align:center; }
        .fs-fighter-highlights span { display:block; color:#9ca3af; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:.08em; }
        .fs-fighter-highlights b { display:block; margin-top:3px; color:#fff; font-size:14px; }
        .mini-badge { border-radius:6px; padding:5px 8px; }
        .fs-info-grid { gap:0 12px; margin-top:4px; }
        .fs-info-line { padding:6px 0; }
        .fs-keur { margin-top:10px; border-radius:10px; }
        .fs-whitebox { background:#f4f4f5; padding:10px; line-height:1.4; }
        .fs-center { gap:8px; }
        .fs-verdict { display:grid; grid-template-columns:42px 1fr 42px; gap:10px; align-items:center; padding:10px 12px; border-radius:12px; background:#1c1e23; border:1px solid rgba(255,255,255,.12); }
        .fs-verdict-icon { width:38px; height:38px; display:grid; place-items:center; border-radius:9px; background:rgba(255,255,255,.08); }
        .fs-verdict span { display:block; font-size:10px; letter-spacing:.12em; color:#a1a1aa; font-weight:950; }
        .fs-verdict b { display:block; color:#fff; font-size:17px; margin-top:2px; }
        .fs-verdict strong { width:36px; height:36px; display:grid; place-items:center; border-radius:50%; background:rgba(255,255,255,.08); font-size:18px; }
        .fs-verdict.severity-ok { border-color:rgba(34,197,94,.5); box-shadow:inset 3px 0 0 #22c55e; }
        .fs-verdict.severity-let-op, .fs-verdict.severity-dispensatie { border-color:rgba(255,77,0,.55); box-shadow:inset 3px 0 0 ${ORANGE}; }
        .fs-verdict.severity-afkeur, .fs-verdict.severity-verbod { border-color:rgba(239,68,68,.55); box-shadow:inset 3px 0 0 #ef4444; }
        .fs-comparison { overflow:hidden; border-radius:12px; border:1px solid rgba(255,255,255,.12); background:#121317; }
        .fs-comparison-head { display:flex; align-items:center; gap:8px; padding:9px 12px; background:#23252b; color:#fff; font-size:12px; font-weight:1000; letter-spacing:.08em; border-bottom:2px solid ${ORANGE}; }
        .fs-compare-row { display:grid; grid-template-columns:1fr 150px 1fr; align-items:center; min-height:48px; border-bottom:1px solid rgba(255,255,255,.07); }
        .fs-compare-row:last-child { border-bottom:0; }
        .fs-compare-row > b { padding:0 12px; font-size:15px; }
        .fs-compare-row .red-value { text-align:right; color:#ff777c; }
        .fs-compare-row .blue-value { text-align:left; color:#78a3ff; }
        .fs-compare-label { align-self:stretch; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:4px 8px; background:rgba(255,255,255,.035); border-left:1px solid rgba(255,255,255,.06); border-right:1px solid rgba(255,255,255,.06); text-align:center; }
        .fs-compare-label span { color:#fff; font-size:11px; font-weight:1000; text-transform:uppercase; letter-spacing:.06em; }
        .fs-compare-label small { margin-top:2px; color:#9ca3af; font-size:10px; font-weight:800; }
        .fs-compare-row.ok .fs-compare-label small { color:#4ade80; }
        .fs-compare-row.warn .fs-compare-label small { color:#fb923c; }
        .fs-agreement { display:grid; grid-template-columns:1fr auto; align-items:center; gap:2px 12px; padding:10px 12px; border-radius:12px; background:linear-gradient(135deg,rgba(255,77,0,.18),#191b20 55%); border:1px solid rgba(255,77,0,.35); }
        .fs-agreement span { color:#cbd5e1; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:.08em; }
        .fs-agreement b { grid-row:1/3; grid-column:2; color:#fff; font-size:22px; }
        .fs-agreement small { color:#9ca3af; font-size:10px; font-weight:800; }
        .fs-center-alerts { gap:6px; }
        .fs-center-alert { border-radius:10px; }
        .fs-save { border-radius:10px !important; min-height:58px; font-size:17px !important; background:linear-gradient(180deg,#ff6526,#d63d00) !important; border-color:#ff7a45 !important; box-shadow:0 10px 24px rgba(255,77,0,.22), inset 0 1px 0 rgba(255,255,255,.25) !important; }
        .fs-save:hover { filter:brightness(1.08); transform:translateY(-1px); }
        @media (max-width: 1220px) {
          .fs-matchplate { grid-template-columns:1fr; }
          .fs-center { order:-1; }
        }
        @media (max-width: 680px) {
          .fs-compare-row { grid-template-columns:1fr 104px 1fr; }
          .fs-compare-row > b { font-size:12px; padding:0 7px; }
          .fs-fighter-highlights { grid-template-columns:1fr; }
        }
      `}</style>
    </main>
  );
}

function FighterPanel({
  corner,
  title,
  matchmakingId,
  f,
  age,
}: {
  corner: "red" | "blue";
  title: string;
  matchmakingId: string;
  f?: Fighter | null;
  age: number | null;
}) {
  const keur = keurmerkInfo(f);
  const licentie = licenseStatus(f);
  const startverbod = startverbodStatus(f);

  return (
    <article className={`fs-fighter ${corner}`}>
      <div className="fs-fighter-title">
        <span>{title}</span>
        {f && (
          <Link
            href={`/dashboard/matchmaker/matchmaking/${matchmakingId}/fighter/${String(f?.id || f?.fighter_id || f?.inschrijving_id || "")}`}
            className="fs-header-detail"
          >
            Details
          </Link>
        )}
      </div>

      <div className="fs-fighter-body">
        <h2 className="fs-fighter-name">{name(f)}</h2>
        <div className="fs-gym">{val(gym(f))}</div>

        <div className="fs-fighter-highlights">
          <div><span>Leeftijd</span><b>{age == null ? "-" : `${age} jaar`}</b></div>
          <div><span>Gewicht</span><b>{weight(f) == null ? "-" : `${fmtKg(weight(f))} kg`}</b></div>
          <div><span>Record</span><b>{recordLabel(f)}</b></div>
        </div>

        <div className="fs-badges">
          <MiniBadge
            label={`Licentie: ${licentie}`}
            state={licentie === "JA" ? "ok" : licentie === "NEE" ? "bad" : "warn"}
          />
          <MiniBadge
            label={`Startverbod: ${startverbod}`}
            state={
              startverbod === "JA"
                ? "bad"
                : startverbod === "NEE"
                  ? "ok"
                  : "warn"
            }
          />
        </div>

        <div className="fs-info-grid">
          <InfoLine
            label="VA"
            value={val(f?.va_nummer || f?.va || f?.fighter_id)}
          />
          <InfoLine label="Geboren" value={formatDate(birthDate(f))} />
          <InfoLine label="Geslacht" value={val(gender(f))} />
          <InfoLine label="Discipline" value={val(discipline(f))} />
          <InfoLine label="Klasse" value={val(klass(f))} />
        </div>

        <div className="fs-keur">
          <div className="fs-subhead">
            <span>MELDINGEN</span>
            <MiniBadge label={`Keurmerk: ${keur.label}`} state={keur.tone} />
          </div>
          <div className="fs-whitebox">
            <b>Keurmerkcontrole</b><br />{keur.reason}
            <br />
            <span className="fs-muted-small">
          
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function ComparisonRow({
  label,
  red,
  blue,
  difference,
  state,
}: {
  label: string;
  red: string;
  blue: string;
  difference: string;
  state: "ok" | "warn" | "neutral";
}) {
  return (
    <div className={`fs-compare-row ${state}`}>
      <b className="red-value">{red}</b>
      <div className="fs-compare-label">
        <span>{label}</span>
        <small>{difference}</small>
      </div>
      <b className="blue-value">{blue}</b>
    </div>
  );
}

function InfoLine({
  label,
  value,
  dark = false,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div className={`fs-info-line ${dark ? "dark" : ""}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function MiniBadge({
  label,
  state,
}: {
  label: string;
  state: "ok" | "bad" | "warn";
}) {
  return <span className={`mini-badge ${state}`}>{label}</span>;
}

function StatusPill({ severity }: { severity: Severity }) {
  const cls =
    severity === "VERBOD"
      ? "stop"
      : severity === "DISPENSATIE"
        ? "disp"
        : severity === "AFKEUR"
          ? "bad"
          : severity === "LET OP"
            ? "warn"
            : severity === "INFO"
              ? "info"
              : "ok";

  return (
    <span className={`status-pill ${cls}`}>
      {severity === "OK" || severity === "INFO" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      {severity === "LET OP" ? "ACTIE" : severity}
    </span>
  );
}
