"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { authedFetch } from "@/lib/api/authedFetch";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  Ban,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

const ORANGE = "#ff4d00";
const LOGO = "/branding/fightsupport/excel-logo.png";

type Fighter = Record<string, any>;
type ResultRow = Record<string, any>;
type FilterKey = "all" | "no_license" | "no_keurmerk" | "gematcht" | "afgemeld";

function s(v: unknown) {
  return String(v ?? "").trim();
}
function lower(v: unknown) {
  return s(v).toLowerCase();
}
function val(v: unknown) {
  return s(v) || "-";
}
function pickFirst(...vals: any[]) {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return "";
}
function onlyDigits(v: any) {
  return String(v ?? "")
    .replace(/[^\d]/g, "")
    .trim();
}
function name(f: Fighter) {
  return (
    s(f.naam) ||
    s(f.fp_naam) ||
    s(f.naam_fp) ||
    s(f.naam_input) ||
    [f.voornaam, f.achternaam].map(s).filter(Boolean).join(" ") ||
    "Onbekend"
  );
}
function rowKeyOf(f: Fighter) {
  return s(
    pickFirst(
      f.inschrijving_id,
      f.id,
      f.context_id,
      f.va_nummer,
      f.va,
      f.fighter_id,
    ),
  );
}
function inschrijvingIdOf(f: Fighter) {
  return s(pickFirst(f.inschrijving_id, f.id));
}
function detailIdOf(f: Fighter) {
  return s(pickFirst(f.inschrijving_id, f.id));
}
function vaOf(f: Fighter) {
  return onlyDigits(pickFirst(f.va_nummer, f.va));
}
function gymOf(f: Fighter) {
  return val(
    pickFirst(
      f.fp_gym,
      f.gym,
      f.sportschool,
      f.sportschool_fp,
      f.sportschool_input,
      f.gym_input,
      f.extra?.raw?.aanmelding?.gym,
    ),
  );
}
function klasseOf(f: Fighter) {
  return val(
    pickFirst(
      f.klasse,
      f.fp_klasse,
      f.klasse_fp,
      f.klasse_input,
      f.nulmeting_klasse,
    ),
  );
}
function disciplineOf(f: Fighter) {
  return val(
    pickFirst(f.discipline, f.discipline_input, f.sport, f.vechtsport),
  );
}
function geslachtOf(f: Fighter) {
  const g = lower(pickFirst(f.geslacht, f.gender, f.sexe));
  if (["m", "man", "male", "heer", "heren", "jongen", "jongens"].includes(g))
    return "Man";
  if (
    ["v", "vrouw", "female", "dame", "dames", "meisje", "meisjes"].includes(g)
  )
    return "Vrouw";
  return val(pickFirst(f.geslacht, f.gender, f.sexe));
}
function klasseTabOf(f: Fighter) {
  const k = lower(klasseOf(f));
  if (k.includes("jeugd") || k === "j" || k.includes("youth")) return "Jeugd";
  if (
    k.includes("nieuweling") ||
    k === "n" ||
    k.includes("n-klasse") ||
    k.includes("n klasse")
  )
    return "N";
  if (k.includes("r-klasse") || k.includes("r klasse") || k === "r") return "R";
  if (k.includes("c-klasse") || k.includes("c klasse") || k === "c") return "C";
  if (k.includes("b-klasse") || k.includes("b klasse") || k === "b") return "B";
  if (k.includes("a-klasse") || k.includes("a klasse") || k === "a") return "A";
  if (k.includes("amateur") || k.includes("ama")) return "MMA AMA";
  if (k.includes("pro")) return "MMA PRO";
  return "Onbekend";
}
function geslachtTabOf(f: Fighter) {
  const g = lower(geslachtOf(f));
  if (g.includes("vrouw") || g.includes("dame") || g.includes("meis"))
    return "Vrouw";
  if (g.includes("man") || g.includes("heer") || g.includes("jong"))
    return "Man";
  return "Onbekend";
}
function tabKeyOf(f: Fighter) {
  const k = klasseTabOf(f);
  const g = geslachtTabOf(f);
  const gender = g === "Vrouw" ? "dame" : g === "Man" ? "heer" : "?";
  const youthGender = g === "Vrouw" ? "dame" : g === "Man" ? "man" : "?";

  if (k === "Jeugd") return `J/${youthGender}`;
  if (k === "MMA AMA") return `Amateur/${gender}`;
  if (k === "MMA PRO") return `Pro/${gender}`;
  if (["R", "N", "C", "B", "A"].includes(k))
    return `${k}/${gender === "heer" ? "man" : gender}`;

  return `${k}/${gender}`;
}
function gewichtOf(f: Fighter) {
  const raw = pickFirst(f.gewicht, f.gewicht_input, f.fp_gewicht, f.gewicht_fp);
  const txt = s(raw);
  if (!txt) return "-";
  const n = Number(txt.replace(",", ".").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return /kg/i.test(txt) ? txt : `${txt} kg`;
  return Number.isInteger(n) ? `${n} kg` : `${String(n).replace(".", ",")} kg`;
}
function gewichtSortValue(f: Fighter) {
  const raw = pickFirst(f.gewicht, f.gewicht_input, f.fp_gewicht, f.gewicht_fp);
  const n = Number(
    s(raw)
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}
function parseDateOnly(v: any): Date | null {
  if (!v) return null;
  const txt = String(v).trim();
  const ymd = txt.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd)
    return new Date(
      Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12),
    );
  const dmy = txt.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy)
    return new Date(
      Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12),
    );
  const d = new Date(txt);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12),
  );
}
function calcAge(dob: any, ref: any) {
  const birth = parseDateOnly(dob);
  const date = parseDateOnly(ref) || new Date();
  if (!birth) return "";
  let age = date.getUTCFullYear() - birth.getUTCFullYear();
  const m = date.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && date.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 ? `${age}` : "";
}
function leeftijdOf(f: Fighter) {
  const direct = pickFirst(f.leeftijd, f.age, f.fp_leeftijd);
  const n = Number(String(direct ?? "").replace(/[^\d.-]/g, ""));
  if (Number.isFinite(n) && n > 0) return `${Math.round(n)}`;
  return (
    calcAge(
      pickFirst(f.geboortedatum, f.fp_geboortedatum, f.geboortedatum_fp, f.dob),
      pickFirst(f.event_datum, f.event_date, f.datum, f.matchmaking_datum),
    ) || "-"
  );
}
function leeftijdSortValue(f: Fighter) {
  const direct = pickFirst(f.leeftijd, f.age, f.fp_leeftijd);
  const directNumber = Number(String(direct ?? "").replace(/[^\d.-]/g, ""));
  if (Number.isFinite(directNumber) && directNumber > 0) return directNumber;
  const age = Number(
    calcAge(
      pickFirst(f.geboortedatum, f.fp_geboortedatum, f.geboortedatum_fp, f.dob),
      pickFirst(f.event_datum, f.event_date, f.datum, f.matchmaking_datum),
    ),
  );
  return Number.isFinite(age) && age >= 0 ? age : Number.POSITIVE_INFINITY;
}

function normVa(v: unknown) {
  return s(v).replace(/[^0-9]/g, "");
}

function rowMatchesFighter(row: ResultRow, f?: Fighter | null) {
  if (!f) return false;
  const va = normVa(pickFirst(f.va_nummer, f.va, f.fighter_id));
  const inschrijvingId = s(pickFirst(f.inschrijving_id, f.aanmelding_id, f.id));
  return (
    (!!va && normVa(row.va_nummer) === va) ||
    (!!inschrijvingId && s(pickFirst(row.inschrijving_id, row.aanmelding_id)) === inschrijvingId) ||
    (!!s(row.naam) && lower(row.naam) === lower(name(f)))
  );
}

function getResultKind(v: unknown): "win" | "loss" | "draw" | "other" {
  const x = lower(v)
    .replace(/\s+/g, " ")
    .trim();

  // matchmaker_uitslagen_raw.uitslag is leidend.
  // Exacte betekenis:
  // - alles met "wint" = winst
  // - alles met "verliest" of "verlies" = verlies
  // - onbeslist/gelijk/draw = onbeslist
  // - demo/no contest = overige
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
  // Volgorde voor stand-up record: J -> R optioneel -> N -> C -> B -> A.
  // Het record wordt altijd getoond in de hoogste klasse waarin een echte uitslag staat.
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
    pickFirst(
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
    const kind = getResultKind(pickFirst(row?.uitslag, row?.resultaat, row?.outcome));
    if (kind === "other") continue; // demo/no contest bepaalt nooit hoogste recordklasse

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
  const inline = [
    f?.uitslagen,
    f?.uitslagen_raw,
    f?.matchmaker_uitslagen_raw,
    f?.raw?.uitslagen,
    f?.raw?.matchmaker_uitslagen_raw,
    f?.raw_json?.uitslagen,
    f?.raw_json?.matchmaker_uitslagen_raw,
    f?.extra?.uitslagen,
    f?.extra?.matchmaker_uitslagen_raw,
    f?.extra?.raw?.uitslagen,
    f?.extra?.raw?.matchmaker_uitslagen_raw,
  ];

  const rows: ResultRow[] = [];
  for (const list of inline) {
    if (Array.isArray(list)) rows.push(...list);
  }

  if (Array.isArray(allRows) && allRows.length) {
    rows.push(...allRows.filter((r) => rowMatchesFighter(r, f)));
  }

  // Voorkom dubbeltelling wanneer dezelfde uitslag zowel inline als uit matchmaker_uitslagen_raw komt.
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = s(
      pickFirst(
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

function recordStatsFromUitslagen(rows: ResultRow[]) {
  let w = 0;
  let l = 0;
  let d = 0;
  let other = 0;
  const highestClass = highestRecordClassFromRows(rows);

  for (const row of rows) {
    const kind = getResultKind(pickFirst(row?.uitslag, row?.resultaat, row?.outcome));

    // Demo, no contest en onbekende uitslagen vallen altijd onder overige.
    if (kind === "other") {
      other += 1;
      continue;
    }

    // Alleen de hoogste klasse telt in W-L-D. Alle lagere/vorige klassen zijn overige.
    const rowClass = getRowClass(row);
    if (highestClass && rowClass && rowClass !== highestClass) {
      other += 1;
      continue;
    }

    if (kind === "win") w += 1;
    else if (kind === "loss") l += 1;
    else if (kind === "draw") d += 1;
  }

  return { w, l, d, other, highestClass, hasRows: rows.length > 0 };
}

function demoToPartijEquivalent(demo: number) {
  return Math.floor(Math.max(0, demo) / 3);
}

function effectiveTotalWithDemo(totalInclDemo: number, demo: number) {
  return Math.max(0, totalInclDemo - demo + demoToPartijEquivalent(demo));
}

function totaalPartijenSortValue(f: Fighter) {
  const direct = pickFirst(
    f.totaal_wedstrijden,
    f.totaal_partijen,
    f.aantal_partijen,
    f.total_fights,
    f.fights_total,
    f.uitslagen_count,
    f.partijen,
  );
  const directNumber = Number(String(direct ?? "").replace(/[^\d.-]/g, ""));
  if (Number.isFinite(directNumber)) return directNumber;

  const w = Number(
    String(pickFirst(f.win, f.wins, f.winst, f.record_w) || 0).replace(
      /[^\d.-]/g,
      "",
    ),
  );
  const l = Number(
    String(pickFirst(f.loss, f.losses, f.verlies, f.record_l) || 0).replace(
      /[^\d.-]/g,
      "",
    ),
  );
  const d = Number(
    String(pickFirst(f.draw, f.draws, f.onbeslist, f.record_d) || 0).replace(
      /[^\d.-]/g,
      "",
    ),
  );
  const total =
    (Number.isFinite(w) ? w : 0) +
    (Number.isFinite(l) ? l : 0) +
    (Number.isFinite(d) ? d : 0);
  return total > 0 ? total : Number.POSITIVE_INFINITY;
}
function sortFightersInTab(a: Fighter, b: Fighter) {
  const gewichtDiff = gewichtSortValue(a) - gewichtSortValue(b);
  if (gewichtDiff !== 0) return gewichtDiff;
  const leeftijdDiff = leeftijdSortValue(a) - leeftijdSortValue(b);
  if (leeftijdDiff !== 0) return leeftijdDiff;
  const partijenDiff = totaalPartijenSortValue(a) - totaalPartijenSortValue(b);
  if (partijenDiff !== 0) return partijenDiff;
  return name(a).localeCompare(name(b), "nl");
}
function recordOf(f: Fighter, allRows: ResultRow[] = []) {
  const rows = getUitslagenRows(f, allRows);
  const fromRows = recordStatsFromUitslagen(rows);

  if (fromRows.hasRows) {
    return `${fromRows.w}-${fromRows.l}-${fromRows.d} (${fromRows.other})`;
  }

  const w = Number(
    String(pickFirst(f.win, f.wins, f.winst, f.record_w) || 0).replace(/[^\d.-]/g, ""),
  );
  const l = Number(
    String(pickFirst(f.loss, f.losses, f.verlies, f.record_l) || 0).replace(/[^\d.-]/g, ""),
  );
  const d = Number(
    String(pickFirst(f.draw, f.draws, f.onbeslist, f.record_d) || 0).replace(/[^\d.-]/g, ""),
  );
  const total = Number(
    String(
      pickFirst(
        f.totaal_wedstrijden,
        f.totaal_partijen,
        f.aantal_partijen,
        f.total_fights,
        f.fights_total,
        f.uitslagen_count,
      ) || 0,
    ).replace(/[^\d.-]/g, ""),
  );
  const explicitOther = Number(
    String(
      pickFirst(
        f.overige,
        f.overige_partijen,
        f.demo,
        f.demo_totaal,
        f.nulmeting_demo,
        f.demo_partijen,
        f.no_contest,
        f.no_contest_totaal,
      ) || 0,
    ).replace(/[^\d.-]/g, ""),
  );

  const safeW = Number.isFinite(w) ? w : 0;
  const safeL = Number.isFinite(l) ? l : 0;
  const safeD = Number.isFinite(d) ? d : 0;
  const fromTotal = Number.isFinite(total) ? Math.max(0, total - safeW - safeL - safeD) : 0;
  const other = Math.max(Number.isFinite(explicitOther) ? explicitOther : 0, fromTotal);

  return `${safeW}-${safeL}-${safeD} (${other})`;
}
function statusLic(f: Fighter) {
  const x = lower(
    pickFirst(f.licentie_status, f.licentie, f.licentie_ok, f.raw?.licentie),
  );
  if (["ja", "true", "geldig", "ok", "1", "valid", "yes", "y"].includes(x))
    return "ok";
  if (
    !x ||
    ["nee", "false", "ongeldig", "geen", "0", "invalid", "no", "n"].includes(
      x,
    ) ||
    x.includes("geen")
  )
    return "bad";
  return "unknown";
}
function statusKeur(f: Fighter) {
  const raw = pickFirst(
    f.heeft_keurmerk,
    f.keurmerk,
    f.keurmerk_status,
    f.keurmerk_ok,
    f.sportschool_keurmerk,
    f.gym_keurmerk,
    f.fp_keurmerk,
    f.extra?.heeft_keurmerk,
    f.extra?.keurmerk,
    f.raw?.keurmerk,
    f.raw?.heeft_keurmerk,
  );
  const x = lower(raw);
  if (
    ["ja", "true", "geldig", "ok", "1", "yes", "y"].includes(x) ||
    x.includes("keurmerk ja") ||
    x.includes("heeft keurmerk")
  )
    return "ok";
  if (
    !x ||
    ["nee", "false", "ongeldig", "geen", "0", "no", "n"].includes(x) ||
    x.includes("geen keurmerk") ||
    x.includes("zonder keurmerk") ||
    x.includes("niet erkend")
  )
    return "bad";
  return "unknown";
}
function obj(v: any) {
  if (!v) return null;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return null;
  try {
    const parsed = JSON.parse(v);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function getPath(source: any, path: string) {
  let cur = source;
  for (const part of path.split(".")) {
    cur = obj(cur) ?? cur;
    if (!cur || typeof cur !== "object") return "";
    cur = cur?.[part];
  }
  return cur;
}
function normalizeStatus(raw: string) {
  const status = raw.toLowerCase().trim();

  if (
    [
      "gescrapt",
      "gescraped",
      "scraped",
      "gecontroleerd",
      "checked",
      "verwerkt",
      "processed",
      "klaar",
      "done",
    ].includes(status)
  )
    return "gescrapt";

  if (["scrape_mislukt", "mislukt", "failed", "error", "fout"].includes(status))
    return "scrape_mislukt";

  if (
    [
      "controle_bezig",
      "bezig",
      "running",
      "scraping",
      "processing",
      "in_progress",
    ].includes(status)
  )
    return "controle_bezig";

  if (["gematcht", "matched"].includes(status)) return "gematcht";
  if (["afgemeld", "cancelled", "canceled"].includes(status)) return "afgemeld";

  if (
    [
      "nieuw",
      "rauw",
      "raw",
      "open",
      "aangemeld",
      "uploaded",
      "upload",
      "",
    ].includes(status)
  )
    return "rauw";

  return status || "rauw";
}

function hasValue(v: unknown) {
  return s(v).length > 0;
}

function pickStatusValue(r: Fighter) {
  return pickFirst(
    r.__fs_aanmelding_status,
    r.__fs_status,
    r.__fs_gematcht ? "gematcht" : "",
    r.status,
    r.aanmelding_status,
    r.inschrijving_status,
    r.controle_status,
    r.scrape_status,
    r.fightpaspoort_status,
    getPath(r, "aanmelding.status"),
    getPath(r, "aanmelding.aanmelding_status"),
    getPath(r, "extra.aanmelding.status"),
    getPath(r, "extra.aanmelding.aanmelding_status"),
    getPath(r, "extra.raw.aanmelding.status"),
    getPath(r, "extra.raw.aanmelding.aanmelding_status"),
    getPath(r, "raw.aanmelding.status"),
    getPath(r, "raw.aanmelding.aanmelding_status"),
    getPath(r, "extra.raw.status"),
    getPath(r, "raw.status"),
  );
}

function statusOf(f: Fighter) {
  const normalized = normalizeStatus(String(pickStatusValue(f) ?? ""));

  const hasFailure =
    normalized === "scrape_mislukt" ||
    hasValue(f?.scrape_failed_at) ||
    hasValue(f?.scrape_error) ||
    hasValue(f?.error) ||
    hasValue(getPath(f, "aanmelding.scrape_failed_at")) ||
    hasValue(getPath(f, "extra.raw.aanmelding.scrape_failed_at")) ||
    hasValue(getPath(f, "raw.aanmelding.scrape_failed_at"));

  if (hasFailure) return "scrape_mislukt";

  // Exact dezelfde voorrang als op de aanmeldingenpagina:
  // gematcht en afgemeld mogen NIET overschreven worden door scraped_at/controle_run_id.
  if (normalized === "gematcht" || normalized === "afgemeld") return normalized;

  const isRunning =
    normalized === "controle_bezig" ||
    hasValue(f?.scrape_started_at) ||
    hasValue(f?.controle_started_at) ||
    hasValue(getPath(f, "aanmelding.scrape_started_at")) ||
    hasValue(getPath(f, "extra.raw.aanmelding.scrape_started_at")) ||
    hasValue(getPath(f, "raw.aanmelding.scrape_started_at"));

  const hasScrapeSignal =
    normalized === "gescrapt" ||
    hasValue(f?.scraped_at) ||
    hasValue(f?.controle_run_id) ||
    hasValue(f?.checked_at) ||
    hasValue(f?.fightpaspoort_checked_at) ||
    hasValue(getPath(f, "aanmelding.scraped_at")) ||
    hasValue(getPath(f, "extra.raw.aanmelding.scraped_at")) ||
    hasValue(getPath(f, "raw.aanmelding.scraped_at"));

  if (hasScrapeSignal) return "gescrapt";
  if (isRunning) return "controle_bezig";

  return normalized;
}

function isAfgemeld(f: Fighter) {
  return statusOf(f) === "afgemeld";
}

function isGematcht(f: Fighter) {
  return statusOf(f) === "gematcht";
}

function displayStatusOf(f: Fighter) {
  if (isGematcht(f)) return "Gematcht";
  if (isAfgemeld(f)) return "Afgemeld";
  if (statusOf(f) === "gescrapt") return "Gecontroleerd";
  return "Niet gecontroleerd";
}

function displayStatusIconOf(f: Fighter) {
  if (isGematcht(f)) return "⚔️";
  if (isAfgemeld(f)) return "🚫";
  if (statusOf(f) === "gescrapt") return "✅";
  return "⏳";
}

function isBlockedFromMatching(f: Fighter) {
  return isAfgemeld(f) || isGematcht(f);
}

function isControlledFighter(f: Fighter) {
  const status = statusOf(f);

  // Deze pagina is "Gecontroleerde vechters": rauwe uploads, open aanmeldingen
  // en lopende checks horen hier nog niet thuis.
  return (
    status === "gescrapt" || status === "gematcht" || status === "afgemeld"
  );
}

function buildAanmeldingStatusMaps(aanmeldingen: Fighter[]) {
  const byId = new Map<string, string>();
  const byVa = new Map<string, string>();

  for (const a of aanmeldingen || []) {
    const status = statusOf(a);
    const id = s(pickFirst(a.id, a.aanmelding_id, a.inschrijving_id));
    const va = onlyDigits(pickFirst(a.va_nummer, a.va, a.fightpaspoort_nummer));

    if (id) byId.set(id, status);
    if (va) byVa.set(va, status);
  }

  return { byId, byVa };
}

function mergeAanmeldingStatusIntoFighters(
  fighters: Fighter[],
  aanmeldingen: Fighter[],
) {
  const { byId, byVa } = buildAanmeldingStatusMaps(aanmeldingen);

  return fighters.map((f) => {
    const id = inschrijvingIdOf(f);
    const va = vaOf(f);
    const aanmeldingStatus = (id && byId.get(id)) || (va && byVa.get(va)) || "";

    return aanmeldingStatus
      ? { ...f, __fs_aanmelding_status: aanmeldingStatus }
      : f;
  });
}

function collectMatchedKeys(json: any) {
  const ids = new Set<string>();
  const vas = new Set<string>();
  const sourceLists = [
    json?.bouts,
    json?.partijen,
    json?.matches,
    json?.matchmaking_bouts_raw,
    json?.raw_bouts,
    json?.controle_toernooi_context,
    json?.toernooien,
    json?.tournaments,
  ].filter(Array.isArray);

  function addId(v: any) {
    const id = s(v);
    if (id) ids.add(id);
  }

  function addVa(v: any) {
    const va = onlyDigits(v);
    if (va) vas.add(va);
  }

  for (const list of sourceLists) {
    for (const b of list || []) {
      const status = lower(
        pickFirst(b?.status, b?.partij_status, b?.bout_status),
      );
      const verwijderd =
        b?.verwijderd === true ||
        String(b?.verwijderd ?? "").trim() === "1" ||
        lower(b?.verwijderd) === "true";
      if (verwijderd || status.includes("verwijderd") || status.includes("deleted"))
        continue;

      const raw = obj(b?.raw_json) || {};
      const deelnemer = obj(raw?.deelnemer) || {};
      const rawAanmelding =
        obj(deelnemer?.aanmelding) ||
        obj(deelnemer?.extra?.raw?.aanmelding) ||
        obj(deelnemer?.raw?.aanmelding) ||
        {};

      [
        b?.rood_inschrijving_id,
        b?.blauw_inschrijving_id,
        b?.red_inschrijving_id,
        b?.blue_inschrijving_id,
        b?.rood_aanmelding_id,
        b?.blauw_aanmelding_id,
        b?.red_aanmelding_id,
        b?.blue_aanmelding_id,
        b?.inschrijving_id,
        b?.aanmelding_id,
        deelnemer?.inschrijving_id,
        deelnemer?.aanmelding_id,
        deelnemer?.id,
        rawAanmelding?.inschrijving_id,
        rawAanmelding?.aanmelding_id,
        rawAanmelding?.id,
      ].forEach(addId);

      [
        b?.va_rood,
        b?.va_blauw,
        b?.rood_va,
        b?.blauw_va,
        b?.red_va,
        b?.blue_va,
        b?.va_nummer,
        b?.fighter_id,
        b?.rood_fighter_id,
        b?.blauw_fighter_id,
        deelnemer?.va_nummer,
        deelnemer?.va,
        deelnemer?.fighter_id,
        rawAanmelding?.va_nummer,
        rawAanmelding?.va,
        rawAanmelding?.fightpaspoort_nummer,
      ].forEach(addVa);
    }
  }

  return { ids, vas };
}

function markMatchedFromBouts(fighters: Fighter[], json: any) {
  const { ids, vas } = collectMatchedKeys(json);
  return fighters.map((f) => {
    const id = inschrijvingIdOf(f);
    const va = vaOf(f);
    const alreadyMatched =
      isGematcht(f) || (!!id && ids.has(id)) || (!!va && vas.has(va));
    return alreadyMatched
      ? { ...f, __fs_gematcht: true, __fs_status: "gematcht" }
      : f;
  });
}
function scraperBusyOf(f: Fighter) {
  const status = lower(pickFirst(f.status, f.scrape_status, f.controle_status));
  const started = !!pickFirst(f.scrape_started_at, f.controle_started_at);
  const done = !!pickFirst(
    f.scraped_at,
    f.scrape_failed_at,
    f.controle_finished_at,
  );
  return (
    (status.includes("bezig") || status.includes("running") || started) && !done
  );
}
function nextTournamentCode(existing: any[]) {
  let max = 0;
  for (const t of existing || []) {
    const code = s(pickFirst(t.toernooi_code, t.toernooicode, t.code));
    const m = code.match(/^T(\d+)$/i);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `T${max + 1}`;
}

async function fetchMatchmakingLock(matchmakingId: string) {
  if (!matchmakingId) return false;

  const { data, error } = await supabase
    .from("matchmakings")
    .select("locked_for_editing")
    .eq("id", matchmakingId)
    .maybeSingle();

  if (error) {
    console.warn("Matchmaking lock laden mislukt", error.message);
    return false;
  }

  return data?.locked_for_editing === true;
}

async function fetchMatchmakingTournamentBouts(matchmakingId: string) {
  if (!matchmakingId) return [] as any[];

  const columns =
    "id, matchmaking_id, upload_id, partij_nr, is_toernooi, toernooi_code, raw_json, va_rood, va_blauw, rood_naam, blauw_naam, rood_gym, blauw_gym, discipline, klasse, max_gewicht, verwijderd, source_type";

  const base = supabase
    .from("matchmaking_bouts_raw")
    .select(columns)
    .eq("matchmaking_id", matchmakingId);

  const { data, error } = await base.or(
    "is_toernooi.eq.true,toernooi_code.not.is.null",
  );

  if (error) {
    console.warn("Toernooi bouts laden mislukt", error.message);
    return [] as any[];
  }

  return (data || []).filter((row: any) => {
    const code = s(row?.toernooi_code);
    return row?.is_toernooi === true || /^T\d+$/i.test(code);
  });
}

export default function FightersPage() {
  const params = useParams<{
    matchmakingId?: string;
    matchmakingid?: string;
  }>();
  const router = useRouter();
  const matchmakingId = String(
    params?.matchmakingId ?? params?.matchmakingid ?? "",
  );

  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [uitslagenRows, setUitslagenRows] = useState<ResultRow[]>([]);
  const [allScraperBusyCount, setAllScraperBusyCount] = useState(0);
  const [matchmakingLocked, setMatchmakingLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyText, setBusyText] = useState("");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [activeTab, setActiveTab] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [matchRed, setMatchRed] = useState<string>("");
  const [tournamentMode, setTournamentMode] = useState(false);
  const [tournamentIds, setTournamentIds] = useState<string[]>([]);
  const [tournamentCode, setTournamentCode] = useState("T1");
  const [tournamentDiscipline, setTournamentDiscipline] = useState("");
  const [tournamentClass, setTournamentClass] = useState("");
  const [tournamentWeight, setTournamentWeight] = useState("");
  const [existingTournaments, setExistingTournaments] = useState<any[]>([]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setMsg("");
    try {
      const res = await authedFetch(`/api/matchmaker/${matchmakingId}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Laden mislukt");

      const mmFromApi = json?.matchmaking ?? json?.matchmaking_row ?? json?.matchmakingData ?? json?.mm ?? json?.data?.matchmaking ?? null;
      const lockedFromApi =
        json?.locked_for_editing === true ||
        json?.control_engine_busy === true ||
        json?.controle_bezig === true ||
        mmFromApi?.locked_for_editing === true ||
        mmFromApi?.control_engine_busy === true ||
        mmFromApi?.controle_bezig === true;
      const lockedFromDb = await fetchMatchmakingLock(matchmakingId);
      setMatchmakingLocked(lockedFromApi || lockedFromDb);

      const toernooiBoutsFromDb = await fetchMatchmakingTournamentBouts(matchmakingId);
      const jsonWithDbBouts = {
        ...json,
        matchmaking_bouts_raw: [
          ...(Array.isArray(json?.matchmaking_bouts_raw)
            ? json.matchmaking_bouts_raw
            : []),
          ...toernooiBoutsFromDb,
        ],
        bouts: [
          ...(Array.isArray(json?.bouts) ? json.bouts : []),
          ...toernooiBoutsFromDb,
        ],
      };

      const rawFighters = Array.isArray(json?.fighters) ? json.fighters : [];
      const aanmeldingen = Array.isArray(json?.aanmeldingen)
        ? json.aanmeldingen
        : [];
      const fightersWithAanmeldingStatus = mergeAanmeldingStatusIntoFighters(
        rawFighters,
        aanmeldingen,
      );
      const loadedFighters = markMatchedFromBouts(
        fightersWithAanmeldingStatus,
        jsonWithDbBouts,
      );
      const controlledFighters = loadedFighters.filter(isControlledFighter);
      const loadedTournaments = Array.isArray(jsonWithDbBouts?.toernooien)
        ? jsonWithDbBouts.toernooien
        : Array.isArray(jsonWithDbBouts?.tournaments)
          ? jsonWithDbBouts.tournaments
          : Array.isArray(jsonWithDbBouts?.controle_toernooi_context) &&
              jsonWithDbBouts.controle_toernooi_context.length
            ? jsonWithDbBouts.controle_toernooi_context
            : Array.isArray(jsonWithDbBouts?.bouts)
              ? jsonWithDbBouts.bouts.filter((b: any) =>
                  s(pickFirst(b?.toernooi_code, b?.toernooicode, b?.tournament_code)),
                )
              : [];

      setAllScraperBusyCount(loadedFighters.filter(scraperBusyOf).length);
      setFighters(controlledFighters);
      const inlineUitslagen =
        json?.uitslagen ??
        json?.matchmaker_uitslagen_raw ??
        json?.uitslagen_raw ??
        json?.fighter_uitslagen ??
        [];

      if (Array.isArray(inlineUitslagen) && inlineUitslagen.length) {
        setUitslagenRows(inlineUitslagen);
      } else {
        let loadedUitslagen: ResultRow[] = [];
        try {
          const ur = await authedFetch(`/api/matchmaker/${matchmakingId}/uitslagen`);
          const uj = await ur.json().catch(() => ({}));
          loadedUitslagen = ur.ok
            ? uj?.uitslagen ??
                uj?.matchmaker_uitslagen_raw ??
                uj?.uitslagen_raw ??
                uj?.results ??
                []
            : [];
        } catch {
          loadedUitslagen = [];
        }

        // Fallback: page55 moet dezelfde bron kunnen lezen als de detailpagina.
        // Dit voorkomt een leeg/verkeerd record als de /uitslagen API niets teruggeeft.
        if (!loadedUitslagen.length) {
          const { data, error } = await supabase
            .from("matchmaker_uitslagen_raw")
            .select("id,matchmaking_id,controle_run_id,fighter_id,va_nummer,datum,evenement,tegenstander,sportschool,discipline,klasse,gewicht,uitslag,partij_nr")
            .eq("matchmaking_id", matchmakingId)
            .order("datum", { ascending: false });

          if (!error) loadedUitslagen = (data ?? []) as ResultRow[];
        }

        setUitslagenRows(loadedUitslagen);
      }
      setExistingTournaments(loadedTournaments);
      setTournamentCode(nextTournamentCode(loadedTournaments));
      setSelected((cur) =>
        cur.filter((id) =>
          controlledFighters.some(
            (f: Fighter) => rowKeyOf(f) === id && !isBlockedFromMatching(f),
          ),
        ),
      );
      setTournamentIds((cur) =>
        cur.filter((id) =>
          controlledFighters.some(
            (f: Fighter) =>
              inschrijvingIdOf(f) === id && !isBlockedFromMatching(f),
          ),
        ),
      );
      setMatchRed((cur) =>
        cur &&
        controlledFighters.some(
          (f: Fighter) =>
            inschrijvingIdOf(f) === cur && !isBlockedFromMatching(f),
        )
          ? cur
          : "",
      );
    } catch (e: any) {
      setAllScraperBusyCount(0);
      setMsg(e?.message || "Laden mislukt");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [matchmakingId]);

  useEffect(() => {
    if (matchmakingId) load();
  }, [matchmakingId, load]);

  useEffect(() => {
    if (!matchmakingId || (!matchmakingLocked && allScraperBusyCount <= 0)) return undefined;

    const timer = window.setInterval(() => {
      load(true);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [matchmakingId, matchmakingLocked, allScraperBusyCount, load]);

  const tabs = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of fighters) {
      if (isBlockedFromMatching(f)) continue;
      const key = tabKeyOf(f);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const orderKlasse = [
      "J/man",
      "J/dame",
      "R/man",
      "R/dame",
      "N/man",
      "N/dame",
      "C/man",
      "C/dame",
      "B/man",
      "B/dame",
      "A/man",
      "A/dame",
      "Amateur/heer",
      "Amateur/dame",
      "Pro/heer",
      "Pro/dame",
    ];
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        const ai = orderKlasse.indexOf(a);
        const bi = orderKlasse.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b, "nl");
      })
      .map(([key, count]) => ({ key, count }));
  }, [fighters]);

  useEffect(() => {
    if (!tabs.length) {
      if (activeTab) setActiveTab("");
      return;
    }
    if (!activeTab || !tabs.some((t) => t.key === activeTab))
      setActiveTab(tabs[0].key);
  }, [activeTab, tabs]);

  const stats = useMemo(() => {
    const active = fighters.filter((f) => !isBlockedFromMatching(f));
    const afgemeld = fighters.filter(isAfgemeld).length;
    const gematcht = fighters.filter(isGematcht).length;
    return {
      total: active.length,
      licentie: active.filter((f) => statusLic(f) === "bad").length,
      keurmerk: active.filter((f) => statusKeur(f) === "bad").length,
      afgemeld,
      gematcht,
      bezig: allScraperBusyCount,
    };
  }, [fighters, allScraperBusyCount]);

  const scraperRunning = matchmakingLocked || allScraperBusyCount > 0 || !!busyId;

  const visible = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return fighters
      .filter((f) => {
        const text = [
          name(f),
          vaOf(f),
          gymOf(f),
          klasseOf(f),
          disciplineOf(f),
          geslachtOf(f),
          recordOf(f, uitslagenRows),
        ]
          .map(s)
          .join(" ")
          .toLowerCase();
        if (needle && !text.includes(needle)) return false;

        if (filter === "gematcht") return isGematcht(f);
        if (filter === "afgemeld") return isAfgemeld(f);

        if (isBlockedFromMatching(f)) return false;
        if (activeTab && tabKeyOf(f) !== activeTab) return false;
        if (filter === "no_license" && statusLic(f) !== "bad") return false;
        if (filter === "no_keurmerk" && statusKeur(f) !== "bad") return false;
        return true;
      })
      .sort(sortFightersInTab);
  }, [fighters, q, filter, activeTab, uitslagenRows]);

  const visibleIds = useMemo(
    () => visible.map(rowKeyOf).filter(Boolean),
    [visible],
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  function toggle(id: string) {
    if (!id) return;
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  function toggleAllVisible() {
    setSelected((cur) => {
      if (allVisibleSelected)
        return cur.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...cur, ...visibleIds]));
    });
  }

  function toggleTournament(f: Fighter) {
    const id = inschrijvingIdOf(f);
    if (!id || isBlockedFromMatching(f)) return;
    setTournamentIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
    if (!tournamentDiscipline)
      setTournamentDiscipline(disciplineOf(f) === "-" ? "" : disciplineOf(f));
    if (!tournamentClass)
      setTournamentClass(klasseOf(f) === "-" ? "" : klasseOf(f));
  }

  function openTournamentMode() {
    setTournamentMode(true);
    setTournamentIds([]);
    setTournamentCode(nextTournamentCode(existingTournaments));
    setMsg(
      "Kies discipline, klasse en max gewicht. Klik daarna de deelnemersnamen aan binnen het juiste tabblad.",
    );
  }

  async function startTournament() {
    if (
      !tournamentDiscipline.trim() ||
      !tournamentClass.trim() ||
      !tournamentWeight.trim()
    ) {
      setMsg("Vul discipline, klasse en max gewicht in voor het toernooi.");
      return;
    }
    if (![4, 8].includes(tournamentIds.length)) {
      setMsg("Selecteer precies 4 of 8 deelnemers voor een toernooi.");
      return;
    }

    setBusyId("toernooi");
    setBusyText(`${tournamentCode} aanmaken...`);
    setMsg("");
    try {
      const deelnemers = fighters
        .filter((f) => tournamentIds.includes(inschrijvingIdOf(f)))
        .map((f) => ({
          inschrijving_id: inschrijvingIdOf(f),
          id: inschrijvingIdOf(f),
          fighter_id: pickFirst(f.fighter_id, f.va_nummer, f.va),
          va_nummer: vaOf(f),
          va: vaOf(f),
          naam: name(f),
          voornaam: pickFirst(f.voornaam, f.first_name),
          achternaam: pickFirst(f.achternaam, f.last_name),
          sportschool: gymOf(f),
          gym: gymOf(f),
          upload_id: pickFirst(f.upload_id, f.upload_batch_id),
          geboortedatum: pickFirst(
            f.geboortedatum,
            f.fp_geboortedatum,
            f.geboortedatum_fp,
            f.dob,
          ),
          geslacht: geslachtOf(f),
          gewicht: pickFirst(f.gewicht, f.gewicht_input, f.fp_gewicht),
          discipline: disciplineOf(f),
          klasse: klasseOf(f),
          licentie: pickFirst(f.licentie, f.licentie_status),
          heeft_startverbod: pickFirst(f.heeft_startverbod, f.startverbod),
          heeft_keurmerk: pickFirst(f.heeft_keurmerk, f.keurmerk),
          keurmerk_reason: pickFirst(f.keurmerk_reason, f.keurmerk_reden),
          record_w: pickFirst(f.record_w, f.win, f.wins),
          record_l: pickFirst(f.record_l, f.loss, f.losses),
          record_d: pickFirst(f.record_d, f.draw, f.draws),
          totaal_wedstrijden: pickFirst(f.totaal_wedstrijden, f.uitslagen_count),
          leeftijd_event: leeftijdOf(f),
        }));

      const payload = {
        matchmaking_id: matchmakingId,
        toernooi_code: tournamentCode,
        toernooicode: tournamentCode,
        discipline: tournamentDiscipline.trim(),
        klasse: tournamentClass.trim(),
        max_gewicht: tournamentWeight.trim(),
        deelnemer_inschrijving_ids: tournamentIds,
        participant_inschrijving_ids: tournamentIds,
        deelnemers,
      };
      const res = await authedFetch(
        `/api/matchmaker/${matchmakingId}/create-toernooi`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Toernooi aanmaken mislukt");

      const va_nummers = Array.from(new Set(deelnemers.map((d) => s(d.va_nummer)).filter(Boolean)));
      const aanmelding_ids = Array.from(new Set(deelnemers.map((d) => s(d.inschrijving_id)).filter(Boolean)));

      if (va_nummers.length || aanmelding_ids.length) {
        setBusyText(`${tournamentCode} deelnemers controleren...`);
        const scrapeRes = await authedFetch(
          `/api/matchmaker/${matchmakingId}/fighters/herscrape`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "selected",
              scope: "toernooi",
              toernooi_code: tournamentCode,
              toernooicode: tournamentCode,
              herscrape: true,
              force: true,
              va_nummers,
              vaNummers: va_nummers,
              aanmelding_ids,
              aanmeldingIds: aanmelding_ids,
            }),
          },
        );
        const scrapeJson = await scrapeRes.json().catch(() => ({}));
        if (!scrapeRes.ok)
          throw new Error(scrapeJson?.error || "Toernooi aangemaakt, maar Fightpaspoort controle starten mislukt");
      }

      setMsg(
        `${tournamentCode} is aangemaakt met ${tournamentIds.length} deelnemer(s) en alleen deze toernooi-deelnemers zijn naar de Fightpaspoort controle gestuurd.`,
      );
      setTournamentMode(false);
      setTournamentIds([]);
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Toernooi aanmaken mislukt");
    } finally {
      setBusyId(null);
      setBusyText("");
    }
  }

  function handleRowMatch(f: Fighter) {
    const matchId = inschrijvingIdOf(f);
    if (!matchId || isBlockedFromMatching(f)) return;
    if (!matchRed) {
      setMatchRed(matchId);
      setMsg(
        `${name(f)} staat klaar als rood. Klik nu op Match bij de blauwe hoek.`,
      );
      return;
    }
    if (matchRed === matchId) {
      setMatchRed("");
      setMsg("Rode hoek gewist. Kies opnieuw een vechter.");
      return;
    }
    router.push(
      `/dashboard/matchmaker/matchmaking/${matchmakingId}/match/nieuw?rood=${encodeURIComponent(matchRed)}&blauw=${encodeURIComponent(matchId)}`,
    );
  }

  async function herscrapeSelected() {
    const selectedFighters = fighters.filter(
      (f) => selected.includes(rowKeyOf(f)) && !isBlockedFromMatching(f),
    );
    const va_nummers = Array.from(
      new Set(selectedFighters.map(vaOf).filter(Boolean)),
    );
    const aanmelding_ids = Array.from(
      new Set(selectedFighters.map(inschrijvingIdOf).filter(Boolean)),
    );
    if (!va_nummers.length && !aanmelding_ids.length) {
      setMsg("Selecteer eerst vechters voor opnieuw controleren.");
      return;
    }

    setBusyId("herscrape");
    setBusyText("Geselecteerde vechters opnieuw controleren...");
    setMsg("");
    try {
      const res = await authedFetch(
        `/api/matchmaker/${matchmakingId}/fighters/herscrape`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "selected",
            scope: "selected",
            herscrape: true,
            force: true,
            va_nummers,
            vaNummers: va_nummers,
            aanmelding_ids,
            aanmeldingIds: aanmelding_ids,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "Opnieuw controleren mislukt");
      const okCount = Array.isArray(json?.gescrapt)
        ? json.gescrapt.length
        : va_nummers.length;
      const failCount = Array.isArray(json?.scrape_mislukt)
        ? json.scrape_mislukt.length
        : 0;
      setMsg(
        failCount
          ? `${okCount} vechter(s) opnieuw gecontroleerd. ${failCount} vechter(s) niet gelukt.`
          : "Geselecteerde vechters zijn opnieuw gecontroleerd.",
      );
      setSelected([]);
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Opnieuw controleren mislukt");
    } finally {
      setBusyId(null);
      setBusyText("");
    }
  }

  async function afmelden(f: Fighter) {
    const id = inschrijvingIdOf(f);
    if (!id || isGematcht(f)) return;
    const reason =
      prompt(`Reden afmelding voor ${name(f)}?`) ||
      "Afmelding vanuit matchmaker fighter-overzicht";

    setBusyId(id);
    setBusyText("Afmelding verwerken...");
    setMsg("");
    try {
      const res = await authedFetch("/api/matchmaker/afmelden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          inschrijving_id: id,
          fighter_id: f.fighter_id || null,
          reden: reason,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Afmelden mislukt");
      setSelected((cur) => cur.filter((x) => x !== id));
      if (matchRed === id) setMatchRed("");
      setMsg("Vechter afgemeld.");
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Afmelden mislukt");
    } finally {
      setBusyId(null);
      setBusyText("");
    }
  }

  const showWait = loading;

  return (
    <main style={pageBg}>
      {showWait && (
        <WaitOverlay
          text={busyText || "FightSupport controlegegevens laden..."}
        />
      )}

      <div style={shell}>
        <header style={topBar}>
          <div style={{ minWidth: 250 }}>
            <div style={eyebrow}>MATCHMAKER</div>
            <h1 style={title}>Gecontroleerde vechters</h1>
            <p style={subtitle}>
              Klik Match bij de eerste vechter voor rood en daarna bij de tweede
              vechter voor blauw.
            </p>
          </div>

          <div style={logoWrap}>
            <img src={LOGO} alt="FightSupport" style={logoImg} />
          </div>

          <Link
            href={`/dashboard/matchmaker/matchmaking/${matchmakingId}`}
            className="fs-back-btn" style={{ color: "#000" }}
          >
            <ArrowLeft size={17} />
            Terug
          </Link>
        </header>

        <section style={navRail}>
          <div style={railGroup}>
            <span style={railLabel}>Overzicht</span>
            {scraperRunning ? (
              <button
                className="fs-dark-btn fs-locked"
                disabled
                title="Deze matchmaking kan open zodra de Fightpaspoort check klaar is"
              >
                <span className="fs-mini-spinner" />
                Matchmaking controle bezig
              </button>
            ) : (
              <Link
                href={`/dashboard/matchmaker/matchmaking/${matchmakingId}`}
                className="fs-dark-btn fs-strong-btn"
              >
                Matchmaking
              </Link>
            )}
            <Link
              href={`/dashboard/matchmaker/matchmaking/${matchmakingId}/aanmeldingen`}
              className="fs-dark-btn fs-strong-btn"
            >
              <Users size={16} />
              Aanmeldingen
            </Link>
          </div>

          <div style={railGroup}>
            <span style={railLabel}>Acties</span>
            <button
              className="fs-orange-btn"
              onClick={() => herscrapeSelected()}
              disabled={!selected.length || !!busyId}
            >
              <RefreshCw size={16} />
              Herscrape geselecteerden{" "}
              {selected.length ? `(${selected.length})` : ""}
            </button>
            <button className="fs-dark-btn" onClick={() => load()} disabled={loading}>
              <RefreshCw size={16} />
              Vernieuwen
            </button>
            <button
              className="fs-tournament-btn"
              onClick={openTournamentMode}
              disabled={!!busyId}
            >
              <Trophy size={16} />
              Start toernooi
            </button>
          </div>
        </section>

        <section style={legendBar}>
          <span style={legendItem}>
            <Eye size={14} /> Detail
          </span>
          <span style={legendItem}>
            <Ban size={14} /> Afmelden
          </span>
          <span style={legendItem}>
            <Swords size={14} /> Match: eerste klik rood, tweede klik blauw
          </span>
        </section>

        {matchRed && (
          <div style={matchNotice}>
            <b>Rood geselecteerd:</b>{" "}
            {name(fighters.find((f) => inschrijvingIdOf(f) === matchRed) || {})}
            . Klik nu op <b>Match</b> bij de tegenstander voor blauw.
            <button className="fs-clear-btn" onClick={() => setMatchRed("")}>
              Wissen
            </button>
          </div>
        )}

        {msg && <div style={notice}>{msg}</div>}

        {tournamentMode && (
          <section style={tournamentPanel}>
            <div style={tournamentHead}>
              <div>
                <div style={eyebrowSmall}>TOERNOOI AANMAKEN</div>
                <h2 style={tournamentTitle}>{tournamentCode}</h2>
                <p style={tournamentText}>
                  Alle geselecteerde deelnemers worden gekoppeld aan dezelfde
                  toernooicode.
                </p>
              </div>
              <button
                className="fs-clear-btn"
                onClick={() => setTournamentMode(false)}
              >
                Sluiten
              </button>
            </div>

            <div style={tournamentForm}>
              <label style={fieldLabel}>
                Discipline
                <input
                  style={fieldInput}
                  value={tournamentDiscipline}
                  onChange={(e) => setTournamentDiscipline(e.target.value)}
                  placeholder="Kickboksen / MMA"
                />
              </label>
              <label style={fieldLabel}>
                Klasse
                <input
                  style={fieldInput}
                  value={tournamentClass}
                  onChange={(e) => setTournamentClass(e.target.value)}
                  placeholder="Jeugd / N / C / Amateur / Pro"
                />
              </label>
              <label style={fieldLabel}>
                Max gewicht
                <input
                  style={fieldInput}
                  value={tournamentWeight}
                  onChange={(e) => setTournamentWeight(e.target.value)}
                  placeholder="bijv. 70"
                />
              </label>
              <button
                className="fs-tournament-btn"
                onClick={startTournament}
                disabled={!!busyId || ![4, 8].includes(tournamentIds.length)}
              >
                <Trophy size={16} />
                Maak {tournamentCode} aan ({tournamentIds.length})
              </button>
            </div>

            <div style={tournamentHint}>
              Klik in de tabel op de naam van deelnemers die in {tournamentCode}{" "}
              horen. Een toernooi wordt aangemaakt met precies 4 of 8 deelnemers.
            </div>
          </section>
        )}

        <section style={metalPanel}>
          <div style={statGrid}>
            <Stat label="Matchbaar" value={stats.total} />
            <Stat label="Gematcht" value={stats.gematcht} />
            <Stat label="Geen licentie" value={stats.licentie} warning />
            <Stat label="Geen keurmerk" value={stats.keurmerk} warning />
            <Stat label="Afgemeld" value={stats.afgemeld} />
            <Stat label="Check bezig" value={stats.bezig} warning />
          </div>

          <div style={tabPanel}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeTab === tab.key ? "fs-tab active" : "fs-tab"}
                onClick={() => setActiveTab(tab.key)}
                disabled={filter === "afgemeld" || filter === "gematcht"}
              >
                {tab.key}
                <span>{tab.count}</span>
              </button>
            ))}
          </div>

          <div style={filterBar}>
            <div style={searchWrap}>
              <Search size={17} style={searchIcon} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Zoek naam, VA, sportschool, klasse..."
                style={input}
              />
            </div>
            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              Actief
            </FilterButton>
            <FilterButton
              active={filter === "no_license"}
              onClick={() => setFilter("no_license")}
            >
              Geen licentie
            </FilterButton>
            <FilterButton
              active={filter === "no_keurmerk"}
              onClick={() => setFilter("no_keurmerk")}
            >
              Geen keurmerk
            </FilterButton>
            <FilterButton
              active={filter === "gematcht"}
              onClick={() => {
                setFilter("gematcht");
                setActiveTab("");
              }}
            >
              Gematcht
            </FilterButton>
            <FilterButton
              active={filter === "afgemeld"}
              onClick={() => {
                setFilter("afgemeld");
                setActiveTab("");
              }}
            >
              Afgemeld
            </FilterButton>
          </div>

          <div style={tableCard}>
            <div style={tableHeader}>
              <b>{visible.length}</b> zichtbaar <span style={muted}> · </span>{" "}
              <b>{selected.length}</b> geselecteerd voor Fightpaspoort controle
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <colgroup>
                  <col style={{ width: 44 }} />
                  <col />
                  <col />
                  <col style={{ width: 68 }} />
                  <col style={{ width: 104 }} />
                  <col style={{ width: 48 }} />
                  <col style={{ width: 66 }} />
                  <col style={{ width: 42 }} />
                  <col style={{ width: 138 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thSelect}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        disabled={!visibleIds.length}
                        title="Selecteer alles zichtbaar"
                      />
                    </th>
                    {[
                      "Naam",
                      "Sportschool",
                      "VA",
                      "Record",
                      "Leeftijd",
                      "Gewicht",
                      "Status",
                      "Acties",
                    ].map((h) => (
                      <th style={th} key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {visible.map((f) => {
                    const rowKey = rowKeyOf(f);
                    const matchId = inschrijvingIdOf(f);
                    const detailId = encodeURIComponent(detailIdOf(f));
                    const va = vaOf(f);
                    const checked = selected.includes(rowKey);
                    const disabled = !matchId || isBlockedFromMatching(f);
                    const isRed = matchRed === matchId;

                    return (
                      <tr
                        key={rowKey || matchId || JSON.stringify(f)}
                        style={isRed ? trRed : tr}
                      >
                        <td style={tdSelect}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(rowKey)}
                            disabled={!rowKey || isBlockedFromMatching(f)}
                            title="Selecteer alleen voor opnieuw controleren"
                          />
                        </td>
                        <td style={tdName}>
                          <button
                            type="button"
                            className={
                              tournamentIds.includes(matchId)
                                ? "fs-name-select active"
                                : "fs-name-select"
                            }
                            onClick={() =>
                              tournamentMode ? toggleTournament(f) : undefined
                            }
                            disabled={
                              !tournamentMode ||
                              !matchId ||
                              isBlockedFromMatching(f)
                            }
                            title={
                              tournamentMode
                                ? `Toevoegen/verwijderen aan ${tournamentCode}`
                                : "Naam"
                            }
                          >
                            {name(f)}
                          </button>
                        </td>
                        <td style={td}>{gymOf(f)}</td>
                        <td style={tdVa}>{va || "-"}</td>
                        <td style={tdRecord}>{recordOf(f, uitslagenRows)}</td>
                        <td style={tdLeeftijd}>{leeftijdOf(f)}</td>
                        <td style={tdGewicht}>{gewichtOf(f)}</td>
                        <td style={tdStatusIcon} title={displayStatusOf(f)}>
                          {displayStatusIconOf(f)}
                        </td>
                        <td style={tdActions}>
                          <Link
                            className="fs-icon-btn"
                            href={
                              detailId
                                ? `/dashboard/matchmaker/matchmaking/${matchmakingId}/fighter/${detailId}`
                                : `/dashboard/matchmaker/matchmaking/${matchmakingId}/match`
                            }
                            title="Detail"
                          >
                            <Eye size={15} />
                          </Link>
                          <button
                            className="fs-icon-btn"
                            disabled={
                              busyId === matchId || !matchId || isGematcht(f)
                            }
                            onClick={() => afmelden(f)}
                            title={
                              isGematcht(f)
                                ? "Deze vechter is al gematcht"
                                : "Afmelden"
                            }
                          >
                            <Ban size={15} />
                          </button>
                          <button
                            className={
                              isRed
                                ? "fs-icon-btn red"
                                : matchRed
                                  ? "fs-icon-btn blue"
                                  : "fs-icon-btn orange"
                            }
                            disabled={disabled}
                            onClick={() => handleRowMatch(f)}
                            title={
                              isRed
                                ? "Rode hoek wissen"
                                : matchRed
                                  ? "Gebruik als blauwe hoek"
                                  : "Gebruik als rode hoek"
                            }
                          >
                            <Swords size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && !visible.length && (
                    <tr>
                      <td style={emptyTd} colSpan={9}>
                        Geen gecontroleerde vechters gevonden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>
        {globalCss}
      </style>
    </main>
  );
}

function Stat({
  label,
  value,
  warning,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div style={statCard}>
      <div
        style={{
          color: warning && value > 0 ? ORANGE : "#a8adb6",
          fontSize: 11,
          letterSpacing: 1.8,
          textTransform: "uppercase",
          fontWeight: 900,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 950, marginTop: 4 }}>{value}</div>
    </div>
  );
}
function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      className={active ? "fs-filter active" : "fs-filter"}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Badge({ kind }: { kind: string }) {
  const ok = kind === "ok";
  const bad = kind === "bad";
  return (
    <span className={ok ? "fs-badge ok" : bad ? "fs-badge bad" : "fs-badge"}>
      {ok ? <ShieldCheck size={13} /> : bad ? <ShieldAlert size={13} /> : null}
      {ok ? "JA" : bad ? "NEE" : "?"}
    </span>
  );
}
function WaitOverlay({ text }: { text: string }) {
  return (
    <div style={overlay}>
      <div style={waitBox}>
        <div style={spinner} />
        <div
          style={{
            color: ORANGE,
            fontWeight: 950,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Even geduld
        </div>
        <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900 }}>
          {text}
        </div>
      </div>
    </div>
  );
}

const pageBg: CSSProperties = {
  minHeight: "100vh",
  padding: "24px 18px 42px",
  color: "#f5f5f5",
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,.13), transparent 34%), linear-gradient(135deg,#15161a 0%,#27292f 45%,#0d0e11 100%)",
};
const shell: CSSProperties = {
  width: "min(1540px, calc(100vw - 36px))",
  margin: "0 auto",
  border: "6px solid rgba(255,255,255,.78)",
  borderRadius: 32,
  overflow: "hidden",
  boxShadow: "0 28px 80px rgba(0,0,0,.55)",
  background:
    "linear-gradient(180deg,#2d2e34 0%,#15161b 28%,#e8eaed 28%,#d8dadd 100%)",
};
const topBar: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  gap: 24,
  alignItems: "center",
  padding: "24px 32px",
  borderBottom: `3px solid ${ORANGE}`,
  background: "linear-gradient(180deg,#34343a,#222329)",
};
const eyebrow: CSSProperties = {
  color: ORANGE,
  fontWeight: 950,
  letterSpacing: 4,
  fontSize: 20,
  textTransform: "uppercase",
};
const title: CSSProperties = {
  margin: "4px 0",
  fontSize: 30,
  lineHeight: 1,
  fontWeight: 950,
  textTransform: "uppercase",
};
const subtitle: CSSProperties = {
  margin: 0,
  color: "#e5e7eb",
  fontSize: 13,
  fontWeight: 650,
};
const logoWrap: CSSProperties = { display: "flex", justifyContent: "center" };
const logoImg: CSSProperties = {
  width: "min(420px, 32vw)",
  height: "auto",
  objectFit: "contain",
};
const navRail: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
  margin: "24px 34px 0",
  padding: 14,
  borderRadius: 18,
  background: "linear-gradient(180deg, rgba(20,21,26,.94), rgba(8,8,10,.98))",
  border: "1px solid rgba(255,255,255,.16)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 18px 34px rgba(0,0,0,.28)",
};
const legendBar: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  margin: "12px 34px 0",
  padding: "10px 14px",
  borderRadius: 14,
  background: "linear-gradient(180deg,#e9ebef,#cfd3d9)",
  color: "#16171b",
  border: "1px solid rgba(0,0,0,.18)",
};
const legendItem: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 950,
};
const railGroup: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};
const railLabel: CSSProperties = {
  color: "#b7bcc6",
  textTransform: "uppercase",
  letterSpacing: 2,
  fontSize: 11,
  fontWeight: 950,
  marginRight: 4,
};
const notice: CSSProperties = {
  margin: "18px 34px 0",
  padding: 14,
  borderRadius: 14,
  color: "#ffe1d6",
  border: "1px solid rgba(255,77,0,.55)",
  background: "linear-gradient(180deg, rgba(255,77,0,.16), rgba(0,0,0,.58))",
};
const matchNotice: CSSProperties = {
  margin: "18px 34px 0",
  padding: 14,
  borderRadius: 14,
  color: "#ffe1d6",
  border: "1px solid rgba(220,38,38,.65)",
  background: "linear-gradient(180deg, rgba(220,38,38,.28), rgba(0,0,0,.62))",
};
const tournamentPanel: CSSProperties = {
  margin: "18px 34px 0",
  padding: 20,
  borderRadius: 22,
  color: "#f8fafc",
  background: "linear-gradient(135deg,#25272e 0%,#0b0c10 55%,#331104 100%)",
  border: "1px solid rgba(255,77,0,.45)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.18), 0 18px 42px rgba(0,0,0,.28)",
};
const tournamentHead: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 14,
};
const eyebrowSmall: CSSProperties = {
  color: ORANGE,
  fontWeight: 950,
  letterSpacing: 3,
  fontSize: 12,
};
const tournamentTitle: CSSProperties = {
  margin: "2px 0",
  fontSize: 34,
  fontWeight: 950,
  lineHeight: 1,
};
const tournamentText: CSSProperties = {
  margin: 0,
  color: "#d8dce3",
  fontWeight: 700,
};
const tournamentForm: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
  gap: 12,
  alignItems: "end",
};
const fieldLabel: CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#f8fafc",
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: 1.6,
  textTransform: "uppercase",
};
const fieldInput: CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.28)",
  background: "rgba(255,255,255,.92)",
  color: "#111",
  padding: "10px 11px",
  fontWeight: 850,
  outline: "none",
};
const tournamentHint: CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(255,255,255,.08)",
  color: "#fff2ec",
  fontWeight: 850,
};
const metalPanel: CSSProperties = {
  margin: 34,
  padding: 28,
  borderRadius: 26,
  background: "linear-gradient(135deg,#f7f8fa 0%,#cdd0d4 45%,#f5f6f8 100%)",
  border: "2px solid rgba(80,82,88,.55)",
  boxShadow: "inset 0 1px 0 white, 0 22px 60px rgba(0,0,0,.22)",
  color: "#111217",
};
const statGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(120px, 1fr))",
  gap: 12,
  marginBottom: 16,
};
const statCard: CSSProperties = {
  padding: 16,
  borderRadius: 18,
  color: "#f7f7f7",
  background: "linear-gradient(180deg,#2b2d34,#0b0c10)",
  border: "1px solid rgba(255,255,255,.18)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.22)",
};
const tabPanel: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 16,
  padding: 12,
  borderRadius: 16,
  background: "linear-gradient(180deg,#24262d,#111217)",
  border: "1px solid rgba(255,255,255,.18)",
};
const filterBar: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 16,
};
const searchWrap: CSSProperties = { position: "relative", flex: "1 1 320px" };
const searchIcon: CSSProperties = {
  position: "absolute",
  left: 12,
  top: 12,
  color: "#777",
};
const input: CSSProperties = {
  width: "100%",
  borderRadius: 13,
  border: "1px solid rgba(20,20,20,.24)",
  background: "rgba(255,255,255,.78)",
  color: "#111",
  padding: "11px 12px 11px 38px",
  outline: "none",
  fontWeight: 750,
};
const tableCard: CSSProperties = {
  borderRadius: 18,
  overflow: "hidden",
  border: "1px solid rgba(0,0,0,.18)",
  background: "white",
};
const tableHeader: CSSProperties = {
  padding: 14,
  color: "#111",
  borderBottom: "1px solid rgba(0,0,0,.1)",
  background: "linear-gradient(180deg,#fff,#e6e8eb)",
};
const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  minWidth: 980,
};
const th: CSSProperties = {
  textAlign: "left",
  padding: "10px 8px",
  color: "white",
  background: ORANGE,
  fontSize: 12,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};
const thSelect: CSSProperties = { ...th, width: 44, textAlign: "center" };
const td: CSSProperties = {
  padding: "9px 8px",
  verticalAlign: "middle",
  borderTop: "1px solid rgba(0,0,0,.1)",
  color: "#151515",
  fontWeight: 750,
  fontSize: 13,
};

const tdVa: CSSProperties = {
  ...td,
  width: 68,
  minWidth: 68,
  maxWidth: 68,
  whiteSpace: "nowrap",
};

const tdRecord: CSSProperties = {
  ...td,
  width: 104,
  minWidth: 104,
  maxWidth: 104,
  whiteSpace: "nowrap",
};

const tdLeeftijd: CSSProperties = {
  ...td,
  width: 48,
  minWidth: 48,
  maxWidth: 48,
  textAlign: "center",
  whiteSpace: "nowrap",
};

const tdGewicht: CSSProperties = {
  ...td,
  width: 66,
  minWidth: 66,
  maxWidth: 66,
  textAlign: "center",
  whiteSpace: "nowrap",
};

const tdStatusIcon: CSSProperties = {
  ...td,
  width: 42,
  minWidth: 42,
  maxWidth: 42,
  padding: "4px",
  textAlign: "center",
  fontSize: 18,
  whiteSpace: "nowrap",
};

const tdName: CSSProperties = { ...td, minWidth: 0, overflow: "hidden" };
const tdActions: CSSProperties = {
  ...td,
  width: 138,
  minWidth: 138,
  maxWidth: 138,
  padding: "8px 6px",
  whiteSpace: "nowrap",
};
const tdSelect: CSSProperties = { ...td, width: 44, minWidth: 44, maxWidth: 44, textAlign: "center" };
const tr: CSSProperties = {
  background: "linear-gradient(180deg,#fff,#f7f7f8)",
};
const trRed: CSSProperties = {
  background:
    "linear-gradient(180deg,rgba(220,38,38,.12),rgba(255,255,255,.96))",
  boxShadow: "inset 5px 0 0 #dc2626",
};
const emptyTd: CSSProperties = {
  ...td,
  textAlign: "center",
  padding: 32,
  color: "#555",
};
const muted: CSSProperties = {
  color: "#6b7280",
  fontSize: 13,
  fontWeight: 700,
};
const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "grid",
  placeItems: "center",
  background: "rgba(0,0,0,.72)",
  backdropFilter: "blur(5px)",
};
const waitBox: CSSProperties = {
  width: "min(520px, calc(100vw - 40px))",
  padding: 30,
  textAlign: "center",
  borderRadius: 24,
  color: "white",
  background: "linear-gradient(180deg,#2e3037,#08090c)",
  border: "2px solid rgba(255,255,255,.45)",
  boxShadow: "0 25px 80px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.22)",
};
const spinner: CSSProperties = {
  width: 54,
  height: 54,
  margin: "0 auto 18px",
  borderRadius: "50%",
  border: "5px solid rgba(255,255,255,.18)",
  borderTopColor: ORANGE,
  animation: "fs-spin .9s linear infinite",
};

const globalCss = `
@keyframes fs-spin { to { transform: rotate(360deg); } }
.fs-mini-spinner{width:15px;height:15px;border-radius:50%;border:2px solid rgba(255,255,255,.25);border-top-color:#ff4d00;animation:fs-spin .75s linear infinite;display:inline-block;flex:0 0 auto}
.fs-back-btn,.fs-dark-btn,.fs-orange-btn,.fs-filter,.fs-tab,.fs-icon-btn,.fs-clear-btn,.fs-tournament-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:10px;text-decoration:none;font-weight:950;cursor:pointer;transition:.15s ease;border:1px solid rgba(255,255,255,.22);white-space:nowrap}.fs-back-btn {
  color: #000 !important;justify-self:end;color:#101114;padding:9px 13px;max-width:max-content;background:linear-gradient(180deg,#ffffff,#c5c8ce 55%,#f2f3f5);border-color:rgba(255,255,255,.85);box-shadow:inset 0 1px 0 #fff,0 7px 18px rgba(0,0,0,.35)}.fs-dark-btn{color:#fff;padding:10px 14px;background:linear-gradient(180deg,#2c2e35,#111217);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 8px 16px rgba(0,0,0,.24)}.fs-strong-btn{border-color:rgba(255,77,0,.72);box-shadow:inset 0 1px 0 rgba(255,255,255,.24),0 0 0 1px rgba(255,77,0,.22),0 10px 22px rgba(255,77,0,.18)}.fs-locked{color:#f9c7b7;border-color:rgba(255,77,0,.55);background:linear-gradient(180deg,#3a1d14,#151515)}.fs-orange-btn{color:#fff;padding:10px 14px;border-color:rgba(255,77,0,.85);background:linear-gradient(180deg,#ff5c15,#a22b00);box-shadow:0 0 0 1px rgba(255,255,255,.18) inset,0 0 22px rgba(255,77,0,.28)}.fs-tournament-btn{color:#fff;padding:10px 14px;border-color:rgba(255,77,0,.9);background:linear-gradient(180deg,#ff6a21,#822100);box-shadow:0 0 0 1px rgba(255,255,255,.18) inset,0 0 24px rgba(255,77,0,.32)}.fs-icon-btn{width:34px;height:34px;padding:0;color:#fff;border-radius:9px;background:linear-gradient(180deg,#2b2d34,#111217);box-shadow:inset 0 1px 0 rgba(255,255,255,.16);margin-right:5px}.fs-icon-btn.orange{background:linear-gradient(180deg,#ff5c15,#a22b00);border-color:rgba(255,77,0,.8)}.fs-icon-btn.red{background:linear-gradient(180deg,#ef4444,#991b1b);border-color:rgba(220,38,38,.9)}.fs-icon-btn.blue{background:linear-gradient(180deg,#3b82f6,#1d4ed8);border-color:rgba(37,99,235,.9)}.fs-clear-btn{margin-left:12px;padding:6px 10px;color:#111;background:linear-gradient(180deg,#fff,#d7d9de);border-color:rgba(0,0,0,.2)}.fs-filter{color:#111;padding:10px 13px;background:linear-gradient(180deg,#fff,#d7d9de);border-color:rgba(0,0,0,.2)}.fs-filter.active{color:#fff;border-color:rgba(255,77,0,.9);background:linear-gradient(180deg,#ff5c15,#b32f00)}.fs-tab{color:#fff;padding:9px 12px;background:linear-gradient(180deg,#ff6a21,#b43300);border-color:rgba(255,77,0,.95);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 8px 18px rgba(255,77,0,.16)}.fs-tab span{display:inline-flex;min-width:22px;height:22px;align-items:center;justify-content:center;padding:0 7px;border-radius:999px;color:#111;background:linear-gradient(180deg,#ffffff,#d8dbe0);font-size:12px}.fs-tab.active{color:#fff;background:linear-gradient(180deg,#ff4d00,#7f2200);border-color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 0 2px rgba(255,77,0,.38),0 0 26px rgba(255,77,0,.34)}.fs-tab:disabled{opacity:.45;cursor:not-allowed}.fs-name-select{border:0;padding:0;margin:0;background:transparent;color:#ff4d00;font-size:15px;font-weight:950;cursor:default;text-align:left}.fs-name-select:not(:disabled){cursor:pointer;text-decoration:underline;text-underline-offset:3px}.fs-name-select.active{display:inline-flex;padding:6px 9px;border-radius:999px;color:#fff;background:linear-gradient(180deg,#ff5c15,#9a2800);box-shadow:0 0 0 1px rgba(255,77,0,.75),0 0 18px rgba(255,77,0,.24)}.fs-badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 8px;background:#eef0f3;border:1px solid #c9ccd1;color:#111;font-weight:950;font-size:11px}.fs-badge.ok{background:#dcfce7;border-color:#16a34a;color:#166534}.fs-badge.bad{background:#fee2e2;border-color:#dc2626;color:#991b1b}button:disabled{opacity:.55;cursor:not-allowed}@media (max-width: 900px){.fs-back-btn{justify-self:start}}
`;


