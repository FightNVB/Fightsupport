"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Upload,
  Search,
  UserPlus,
  Radar,
  X,
  Link2,
  Swords,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";

const NVB_ORANGE = "#ff4d00";

type FighterRow = {
  id: string;
  fighter_id?: string | null;
  source: "fighter_context" | "inschrijving";

  matchmaking_id?: string | null;
  upload_id?: string | null;
  row_nr?: number | null;
  inschrijving_id?: string | null;

  discipline?: string | null;
  klasse?: string | null;
  geslacht?: string | null;

  voornaam?: string | null;
  achternaam?: string | null;
  naam_input?: string | null;

  email?: string | null;
  telefoon?: string | null;
  gym?: string | null;
  gym_input?: string | null;
  va_nummer?: string | null;

  geboortedatum?: string | null;
  geboortedatum_input?: string | null;
  gewicht?: number | string | null;

  win?: number | null;
  loss?: number | null;
  draw?: number | null;
  demo?: number | null;

  fp_naam?: string | null;
  fp_geboortedatum?: string | null;
  fp_gym?: string | null;
  fp_klasse?: string | null;

  uitslagen_count?: number | null;
  laatste_partij_datum?: string | null;
  nulmeting_opmerking?: string | null;
  heeft_keurmerk?: string | null;

  naam_match?: boolean | null;
  geboortedatum_match?: boolean | null;
  gym_match?: boolean | null;

  opmerkingen?: string | null;
  raw?: any;

  scrape_status?: string | null;
  scraped_at?: string | null;
};

type MatchRow = {
  id: string;
  partij_nr?: number | null;

  rood_inschrijving_id?: number | null;
  blauw_inschrijving_id?: number | null;

  rood_naam?: string | null;
  blauw_naam?: string | null;

  raw?: any;
};

type MatchmakingRow = {
  id: string;
  naam?: string | null;
  datum?: string | null;
  locatie?: string | null;
  promotor?: string | null;
  bondteam?: string | null;
  status?: string | null;
};

type DifferenceRow = {
  key: string;
  label: string;
  left: string;
  right: string;
  tone?: "default" | "orange" | "red";
};

type BoutRuleResult = {
  code: string;
  message: string;
  severity: "ok" | "warning" | "error";
};

type ClassTabKey =
  | "jeugd-jongen"
  | "jeugd-meisje"
  | "n-heer"
  | "n-dame"
  | "c-heer"
  | "c-dame"
  | "b-heer"
  | "b-dame"
  | "a-heer"
  | "a-dame";

type ClassTabItem = {
  key: ClassTabKey;
  label: string;
};

const CLASS_TAB_ORDER: ClassTabItem[] = [
  { key: "jeugd-jongen", label: "Jeugd jongen" },
  { key: "jeugd-meisje", label: "Jeugd meisje" },
  { key: "n-heer", label: "N klasse heer" },
  { key: "n-dame", label: "N klasse dame" },
  { key: "c-heer", label: "C heer" },
  { key: "c-dame", label: "C dame" },
  { key: "b-heer", label: "B heer" },
  { key: "b-dame", label: "B dame" },
  { key: "a-heer", label: "A heer" },
  { key: "a-dame", label: "A dame" },
];

function toName(f: FighterRow | null | undefined) {
  if (!f) return "-";
  const composed = `${f.voornaam ?? ""} ${f.achternaam ?? ""}`.trim();
  return composed || f.fp_naam || f.naam_input || "Onbekend";
}

function toNum(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;

  const normalized = String(v).replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function formatWeight(v: unknown) {
  const n = toNum(v);
  return n == null ? "-" : `${n.toFixed(2)} kg`;
}

function formatDate(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("nl-NL");
}

function calcAgeOnDate(birth?: string | null, eventDate?: string | null) {
  if (!birth || !eventDate) return null;
  const b = new Date(birth);
  const e = new Date(eventDate);
  if (Number.isNaN(b.getTime()) || Number.isNaN(e.getTime())) return null;

  let age = e.getFullYear() - b.getFullYear();
  const m = e.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && e.getDate() < b.getDate())) age--;
  return age;
}

function diffInMonthsAndDays(
  birthA?: string | null,
  birthB?: string | null
): { months: number; days: number; text: string } | null {
  if (!birthA || !birthB) return null;

  const dateA = new Date(birthA);
  const dateB = new Date(birthB);
  if (Number.isNaN(dateA.getTime()) || Number.isNaN(dateB.getTime())) return null;

  let older = dateA;
  let younger = dateB;

  if (dateA.getTime() > dateB.getTime()) {
    older = dateB;
    younger = dateA;
  }

  let months =
    (younger.getFullYear() - older.getFullYear()) * 12 +
    (younger.getMonth() - older.getMonth());

  let probe = new Date(older);
  probe.setMonth(probe.getMonth() + months);

  if (probe.getTime() > younger.getTime()) {
    months -= 1;
    probe = new Date(older);
    probe.setMonth(probe.getMonth() + months);
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.floor((younger.getTime() - probe.getTime()) / msPerDay);

  return {
    months,
    days,
    text: `${months} maand${months === 1 ? "" : "en"} en ${days} dag${
      days === 1 ? "" : "en"
    }`,
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

function pickString(row: any, keys: string[]) {
  for (const key of keys) {
    const v = row?.[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v);
    }
  }
  return null;
}

function pickNumber(row: any, keys: string[]) {
  for (const key of keys) {
    const v = row?.[key];
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function mapInschrijvingToFighter(row: any): FighterRow {
  return {
    id: String(row.id),
    fighter_id: row.fighter_id ? String(row.fighter_id) : null,
    source: "inschrijving",

    matchmaking_id: row.matchmaking_id ?? null,
    upload_id: row.upload_id ?? null,
    row_nr: Number.isFinite(Number(row.row_nr)) ? Number(row.row_nr) : null,
    inschrijving_id: row.id ? String(row.id) : null,

    discipline: pickString(row, ["discipline"]),
    klasse: pickString(row, ["klasse", "klasse_mm"]),
    geslacht: pickString(row, ["geslacht"]),

    voornaam: pickString(row, ["voornaam"]),
    achternaam: pickString(row, ["achternaam"]),
    naam_input: pickString(row, ["naam_input", "naam"]),

    email: pickString(row, ["email"]),
    telefoon: pickString(row, ["telefoon"]),
    gym: pickString(row, ["gym"]),
    gym_input: pickString(row, ["gym_input"]),
    va_nummer: pickString(row, ["va_nummer", "va"]),

    geboortedatum: pickString(row, ["geboortedatum"]),
    geboortedatum_input: pickString(row, ["geboortedatum_input"]),
    gewicht:
      pickNumber(row, ["gewicht"]) ??
      pickString(row, ["gewicht"]) ??
      null,

    win: pickNumber(row, ["win"]),
    loss: pickNumber(row, ["loss"]),
    draw: pickNumber(row, ["draw"]),
    demo: pickNumber(row, ["demo"]),

    opmerkingen: pickString(row, ["opmerkingen"]),
    raw: row,

    scrape_status: pickString(row, ["scrape_status"]),
    scraped_at: pickString(row, ["scraped_at"]),
  };
}

function mapFighterContextToFighter(row: any): FighterRow {
  return {
    id: String(row.id),
    fighter_id: row.fighter_id ? String(row.fighter_id) : null,
    source: "fighter_context",

    matchmaking_id: row.matchmaking_id ?? null,
    upload_id: null,
    row_nr: pickNumber(row, ["row_nr"]),
    inschrijving_id: row.inschrijving_id ? String(row.inschrijving_id) : null,

    discipline: pickString(row, ["discipline"]),
    klasse: pickString(row, ["klasse"]),
    geslacht: pickString(row, ["geslacht"]),

    voornaam: pickString(row, ["voornaam"]),
    achternaam: pickString(row, ["achternaam"]),
    naam_input: pickString(row, ["naam_input"]),

    email: pickString(row, ["email"]),
    telefoon: pickString(row, ["telefoon"]),
    gym: pickString(row, ["gym", "fp_gym"]),
    gym_input: pickString(row, ["gym_input"]),
    va_nummer: pickString(row, ["va_nummer"]),

    geboortedatum: pickString(row, ["geboortedatum", "fp_geboortedatum"]),
    geboortedatum_input: pickString(row, ["geboortedatum_input"]),
    gewicht:
      pickNumber(row, ["gewicht"]) ??
      pickString(row, ["gewicht"]) ??
      null,

    win: pickNumber(row, ["record_w", "win"]),
    loss: pickNumber(row, ["record_l", "loss"]),
    draw: pickNumber(row, ["record_d", "draw"]),
    demo: pickNumber(row, ["demo"]) ?? null,

    fp_naam: pickString(row, ["fp_naam"]),
    fp_geboortedatum: pickString(row, ["fp_geboortedatum"]),
    fp_gym: pickString(row, ["fp_gym"]),
    fp_klasse: pickString(row, ["fp_klasse"]),

    uitslagen_count: pickNumber(row, ["uitslagen_count"]),
    laatste_partij_datum: pickString(row, ["laatste_partij_datum"]),
    nulmeting_opmerking: pickString(row, ["nulmeting_opmerking"]),
    heeft_keurmerk: pickString(row, ["heeft_keurmerk"]),

    naam_match: row?.naam_match ?? null,
    geboortedatum_match: row?.geboortedatum_match ?? null,
    gym_match: row?.gym_match ?? null,

    opmerkingen: pickString(row, ["opmerkingen"]),
    raw: row,

    scrape_status: pickString(row, ["scrape_status"]),
    scraped_at: pickString(row, ["scraped_at"]),
  };
}

function mergeFighterWithInschrijving(
  fighter: FighterRow,
  inschrijvingRow?: any | null
): FighterRow {
  if (!inschrijvingRow) return fighter;

  const mapped = mapInschrijvingToFighter(inschrijvingRow);

  return {
    ...fighter,
    fighter_id: fighter.fighter_id ?? mapped.fighter_id ?? null,
    upload_id: fighter.upload_id ?? mapped.upload_id ?? null,
    row_nr: fighter.row_nr ?? mapped.row_nr ?? null,
    inschrijving_id: fighter.inschrijving_id ?? mapped.inschrijving_id ?? null,

    discipline: fighter.discipline ?? mapped.discipline ?? null,
    klasse: fighter.klasse ?? mapped.klasse ?? null,
    geslacht: fighter.geslacht ?? mapped.geslacht ?? null,

    voornaam: fighter.voornaam ?? mapped.voornaam ?? null,
    achternaam: fighter.achternaam ?? mapped.achternaam ?? null,
    naam_input: fighter.naam_input ?? mapped.naam_input ?? null,

    email: fighter.email ?? mapped.email ?? null,
    telefoon: fighter.telefoon ?? mapped.telefoon ?? null,
    gym: fighter.gym ?? mapped.gym ?? null,
    gym_input: fighter.gym_input ?? mapped.gym_input ?? null,
    va_nummer: fighter.va_nummer ?? mapped.va_nummer ?? null,

    geboortedatum: fighter.geboortedatum ?? mapped.geboortedatum ?? null,
    geboortedatum_input:
      fighter.geboortedatum_input ?? mapped.geboortedatum_input ?? null,
    gewicht: fighter.gewicht ?? mapped.gewicht ?? null,

    win: fighter.win ?? mapped.win ?? null,
    loss: fighter.loss ?? mapped.loss ?? null,
    draw: fighter.draw ?? mapped.draw ?? null,
    demo: fighter.demo ?? mapped.demo ?? null,

    opmerkingen: fighter.opmerkingen ?? mapped.opmerkingen ?? null,
  };
}

function deriveMatchmakingFromRows(
  matchmakingId: string,
  rows: any[]
): MatchmakingRow {
  const first = rows?.[0] ?? {};

  return {
    id: matchmakingId,
    naam: pickString(first, ["evenement_naam", "naam", "event_naam"]),
    datum: pickString(first, ["evenement_datum", "datum", "event_datum"]),
    locatie: pickString(first, ["locatie", "evenement_locatie"]),
    promotor: pickString(first, ["promotor"]),
    bondteam: pickString(first, ["bondteam"]),
    status: pickString(first, ["status"]),
  };
}

function mapMatchRow(row: any): MatchRow {
  return {
    id: String(row.id),
    partij_nr: row.partij_nr ?? null,
    rood_inschrijving_id:
      row.rood_inschrijving_id != null ? Number(row.rood_inschrijving_id) : null,
    blauw_inschrijving_id:
      row.blauw_inschrijving_id != null ? Number(row.blauw_inschrijving_id) : null,
    rood_naam: row.rood_naam ?? null,
    blauw_naam: row.blauw_naam ?? null,
    raw: row,
  };
}

function normalizeGender(value?: string | null) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return "Onbekend";
  if (
    v === "vrouw" ||
    v === "v" ||
    v === "female" ||
    v === "f" ||
    v === "dame" ||
    v === "meisje"
  ) {
    return "Vrouw";
  }
  if (
    v === "man" ||
    v === "m" ||
    v === "male" ||
    v === "heer" ||
    v === "jongen"
  ) {
    return "Man";
  }
  return value?.trim() || "Onbekend";
}

function getFighterAge(fighter: FighterRow, eventDate?: string | null) {
  return calcAgeOnDate(
    fighter.geboortedatum ??
      fighter.geboortedatum_input ??
      fighter.fp_geboortedatum ??
      null,
    eventDate ?? null
  );
}

function getFighterBirth(fighter: FighterRow) {
  return (
    fighter.geboortedatum ??
    fighter.geboortedatum_input ??
    fighter.fp_geboortedatum ??
    null
  );
}

function isYouthKlasse(value?: string | null) {
  return String(value ?? "").toLowerCase().includes("jeugd");
}

function getDisplayTotalPartijen(f: FighterRow | null | undefined) {
  if (!f) return 0;

  const win = toNum(f.win) ?? 0;
  const loss = toNum(f.loss) ?? 0;
  const draw = toNum(f.draw) ?? 0;
  const demo = toNum(f.demo) ?? 0;

  if (!isYouthKlasse(f.klasse)) {
    return win + loss + draw + demo;
  }

  const zonderDemo = win + loss + draw;
  const demoAlsPartijen = Math.floor(demo / 3);
  return zonderDemo + demoAlsPartijen;
}

function getDisplayTotalPartijenText(f: FighterRow | null | undefined) {
  if (!f) return "0";

  const totaal = getDisplayTotalPartijen(f);
  const demo = toNum(f.demo) ?? 0;

  if (!isYouthKlasse(f.klasse)) return String(totaal);
  if (!demo) return String(totaal);

  const demoAlsPartijen = Math.floor(demo / 3);
  return `${totaal} (${demo} demo → ${demoAlsPartijen})`;
}

function getMatchLinkedId(match: MatchRow, side: "red" | "blue") {
  if (side === "red") {
    return String(
      match.raw?.rood_fighter_context_id ??
        match.raw?.rood_fighter_id ??
        match.rood_inschrijving_id ??
        ""
    ).trim();
  }

  return String(
    match.raw?.blauw_fighter_context_id ??
      match.raw?.blauw_fighter_id ??
      match.blauw_inschrijving_id ??
      ""
  ).trim();
}

function getFighterIdentityKeys(fighter: FighterRow) {
  return [
    String(fighter.id ?? "").trim(),
    String(fighter.inschrijving_id ?? "").trim(),
    String(fighter.fighter_id ?? "").trim(),
  ].filter(Boolean);
}

function fighterIsMatched(fighter: FighterRow, matchedIds: Set<string>) {
  return getFighterIdentityKeys(fighter).some((key) => matchedIds.has(key));
}

function getStableSelectionId(fighter: FighterRow) {
  return String(fighter.id);
}

function getFighterDetailHref(matchmakingId: string, fighter: FighterRow) {
  const stableId = String(fighter.fighter_id ?? "").trim();
  if (stableId) {
    return `/dashboard/matchmaker/matchmaking/${matchmakingId}/fighter/${stableId}`;
  }
  return `/dashboard/matchmaker/matchmaking/${matchmakingId}/fighter/${fighter.id}`;
}

function isCheckedFighter(fighter: FighterRow) {
  const rawExists = fighter.source === "fighter_context";
  if (rawExists) return true;

  if (String(fighter.scraped_at ?? "").trim()) return true;

  const status = String(fighter.scrape_status ?? "").trim().toLowerCase();
  if (!status) return false;

  if (
    [
      "pending",
      "queued",
      "running",
      "processing",
      "new",
      "nieuw",
      "wacht",
      "wachtend",
    ].includes(status)
  ) {
    return false;
  }

  return true;
}

function getGenderBucket(value?: string | null): "heer" | "dame" | null {
  const normalized = normalizeGender(value);
  if (normalized === "Man") return "heer";
  if (normalized === "Vrouw") return "dame";
  return null;
}

function getKlasseLetter(value?: string | null): "n" | "c" | "b" | "a" | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes("jeugd")) return null;

  const compact = raw.replace(/\s+/g, " ");

  if (
    compact === "n" ||
    compact.startsWith("n ") ||
    compact.includes(" n ") ||
    compact.includes("n-") ||
    compact.includes("klasse n") ||
    compact.includes("n klasse")
  ) {
    return "n";
  }
  if (
    compact === "c" ||
    compact.startsWith("c ") ||
    compact.includes(" c ") ||
    compact.includes("c-") ||
    compact.includes("klasse c") ||
    compact.includes("c klasse")
  ) {
    return "c";
  }
  if (
    compact === "b" ||
    compact.startsWith("b ") ||
    compact.includes(" b ") ||
    compact.includes("b-") ||
    compact.includes("klasse b") ||
    compact.includes("b klasse")
  ) {
    return "b";
  }
  if (
    compact === "a" ||
    compact.startsWith("a ") ||
    compact.includes(" a ") ||
    compact.includes("a-") ||
    compact.includes("klasse a") ||
    compact.includes("a klasse")
  ) {
    return "a";
  }

  return null;
}

function getClassTabKey(fighter: FighterRow): ClassTabKey | null {
  const klasse = String(fighter.klasse ?? "").trim().toLowerCase();
  const gender = getGenderBucket(fighter.geslacht);

  if (!klasse || !gender) return null;

  if (klasse.includes("jeugd")) {
    return gender === "heer" ? "jeugd-jongen" : "jeugd-meisje";
  }

  const letter = getKlasseLetter(klasse);
  if (!letter) return null;

  if (letter === "n") return gender === "heer" ? "n-heer" : "n-dame";
  if (letter === "c") return gender === "heer" ? "c-heer" : "c-dame";
  if (letter === "b") return gender === "heer" ? "b-heer" : "b-dame";
  return gender === "heer" ? "a-heer" : "a-dame";
}

function normalizeBoutRuleSeverity(value: any): "ok" | "warning" | "error" {
  const raw = String(value ?? "").trim().toLowerCase();

  if (
    [
      "error",
      "danger",
      "verbod",
      "afkeur",
      "afgekeurd",
      "block",
      "blocked",
    ].includes(raw)
  ) {
    return "error";
  }

  if (
    [
      "warning",
      "warn",
      "actie",
      "dispensatie",
      "oranje",
      "orange",
      "needs_attention",
    ].includes(raw)
  ) {
    return "warning";
  }

  return "ok";
}

function normalizeBoutRuleMessages(payload: any): BoutRuleResult[] {
  const candidates = [
    payload?.rules,
    payload?.results,
    payload?.messages,
    payload?.hits,
    payload?.data?.rules,
    payload?.data?.results,
    payload?.data?.messages,
    payload?.boutRules,
    payload?.bout_rules,
  ];

  const source = candidates.find((x) => Array.isArray(x));
  if (!Array.isArray(source)) return [];

  return source
    .map((item: any, index: number): BoutRuleResult | null => {
      const message = String(
        item?.message ??
          item?.boodschap ??
          item?.text ??
          item?.omschrijving ??
          item?.rule_message ??
          ""
      ).trim();

      const code = String(
        item?.code ?? item?.rule_code ?? item?.id ?? `rule-${index + 1}`
      ).trim();

      const severity = normalizeBoutRuleSeverity(
        item?.severity ?? item?.resultaat ?? item?.status ?? item?.tone
      );

      if (!message) return null;

      return {
        code: code || `rule-${index + 1}`,
        message,
        severity,
      };
    })
    .filter(Boolean) as BoutRuleResult[];
}

function HeaderButton({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button onClick={onClick} style={silverButton}>
      {children}
    </button>
  );
}

export default function MatchmakerMatchPage() {
  const params = useParams<{ matchmakingId?: string | string[] }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const matchmakingId = useMemo(() => {
    const fromPath = Array.isArray(params?.matchmakingId)
      ? params.matchmakingId[0]
      : params?.matchmakingId;

    const fromQuery = searchParams.get("matchmaking_id") ?? "";
    return String(fromPath || fromQuery || "").trim();
  }, [params, searchParams]);

  const [matchmaking, setMatchmaking] = useState<MatchmakingRow | null>(null);
  const [fighters, setFighters] = useState<FighterRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedRed, setSelectedRed] = useState<FighterRow | null>(null);
  const [selectedBlue, setSelectedBlue] = useState<FighterRow | null>(null);

  const [busy, setBusy] = useState(false);
  const [scrapeBusy, setScrapeBusy] = useState(false);
  const [handmatigBusy, setHandmatigBusy] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);

  const [scrapeOverlayOpen, setScrapeOverlayOpen] = useState(false);
  const [scrapeOverlayMessage, setScrapeOverlayMessage] = useState("");

  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    inserted: number;
    duplicates: number;
    message: string;
  } | null>(null);

  const [activeClassTab, setActiveClassTab] = useState<ClassTabKey | "">("");

  const [filter, setFilter] = useState({
    query: "",
    onlyUnmatched: true,
  });

  const [manualForm, setManualForm] = useState({
    voornaam: "",
    achternaam: "",
    discipline: "",
    klasse: "",
    geslacht: "",
    gym: "",
    va_nummer: "",
    geboortedatum: "",
    gewicht: "",
    win: "",
    loss: "",
    draw: "",
    demo: "",
    opmerkingen: "",
  });

  const [boutRuleMessages, setBoutRuleMessages] = useState<BoutRuleResult[]>([]);

  async function load() {
    if (!matchmakingId) return;

    if (!isUuid(matchmakingId)) {
      alert("Ongeldige matchmakingId");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("Niet ingelogd.");
      return;
    }

    let loadedMatchmaking: MatchmakingRow | null = null;

    const matchmakingQuery = await supabase
      .from("matchmaker_matchmakings")
      .select("*")
      .eq("id", matchmakingId)
      .maybeSingle();

    if (!matchmakingQuery.error && matchmakingQuery.data) {
      const mm = matchmakingQuery.data;
      loadedMatchmaking = {
        id: String(mm.id),
        naam: pickString(mm, ["naam", "evenement_naam"]),
        datum: pickString(mm, ["datum", "evenement_datum"]),
        locatie: pickString(mm, ["locatie"]),
        promotor: pickString(mm, ["promotor"]),
        bondteam: pickString(mm, ["bondteam"]),
        status: pickString(mm, ["status"]),
      };
    }

    const fighterContextQuery = await supabase
      .from("matchmaker_fighter_context")
      .select("*")
      .eq("matchmaking_id", matchmakingId);

    let mappedFighters: FighterRow[] = [];

    if (!fighterContextQuery.error && (fighterContextQuery.data ?? []).length > 0) {
      const fighterContextRows = fighterContextQuery.data ?? [];

      const inschrijvingIds = fighterContextRows
        .map((row: any) => String(row.inschrijving_id ?? "").trim())
        .filter(Boolean);

      const fighterIds = fighterContextRows
        .map((row: any) => String(row.fighter_id ?? "").trim())
        .filter(Boolean);

      let inschrijvingenLookupRows: any[] = [];

      if (inschrijvingIds.length > 0) {
        const byInschrijving = await supabase
          .from("matchmaker_inschrijvingen")
          .select("*")
          .in("id", inschrijvingIds);

        if (!byInschrijving.error) {
          inschrijvingenLookupRows = byInschrijving.data ?? [];
        }
      }

      if (!inschrijvingenLookupRows.length && fighterIds.length > 0) {
        const byFighterId = await supabase
          .from("matchmaker_inschrijvingen")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .in("fighter_id", fighterIds);

        if (!byFighterId.error) {
          inschrijvingenLookupRows = byFighterId.data ?? [];
        }
      }

      const byInschrijvingId = new Map<string, any>();
      const byFighterId = new Map<string, any>();

      for (const row of inschrijvingenLookupRows) {
        const inschrijvingId = String(row.id ?? "").trim();
        const fighterId = String(row.fighter_id ?? "").trim();

        if (inschrijvingId) byInschrijvingId.set(inschrijvingId, row);
        if (fighterId) byFighterId.set(fighterId, row);
      }

      mappedFighters = fighterContextRows.map((row: any) => {
        const fighter = mapFighterContextToFighter(row);

        const linkedRow =
          (fighter.inschrijving_id &&
            byInschrijvingId.get(String(fighter.inschrijving_id))) ||
          (fighter.fighter_id && byFighterId.get(String(fighter.fighter_id))) ||
          null;

        return mergeFighterWithInschrijving(fighter, linkedRow);
      });

      if (!loadedMatchmaking) {
        loadedMatchmaking = deriveMatchmakingFromRows(
          matchmakingId,
          fighterContextRows
        );
      }
    } else {
      const inschrijvingenQuery = await supabase
        .from("matchmaker_inschrijvingen")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .order("row_nr", { ascending: true });

      if (inschrijvingenQuery.error) {
        alert(inschrijvingenQuery.error.message || "Laden van vechters mislukt");
        return;
      }

      const inschrijvingen = inschrijvingenQuery.data ?? [];
      mappedFighters = inschrijvingen.map(mapInschrijvingToFighter);

      if (!loadedMatchmaking) {
        loadedMatchmaking = deriveMatchmakingFromRows(matchmakingId, inschrijvingen);
      }
    }

    setMatchmaking(
      loadedMatchmaking ?? {
        id: matchmakingId,
        naam: null,
        datum: null,
        locatie: null,
        promotor: null,
        bondteam: null,
        status: null,
      }
    );
    setFighters(mappedFighters);

    const matchesQuery = await supabase
      .from("matchmaker_bouts_raw")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .order("partij_nr", { ascending: true });

    if (matchesQuery.error) {
      setMatches([]);
    } else {
      setMatches((matchesQuery.data ?? []).map(mapMatchRow));
    }
  }

  useEffect(() => {
    if (!matchmakingId) return;
    void load();
  }, [matchmakingId]);

  const matchedIds = useMemo(() => {
    const s = new Set<string>();
    for (const m of matches) {
      const redId = getMatchLinkedId(m, "red");
      const blueId = getMatchLinkedId(m, "blue");
      if (redId) s.add(redId);
      if (blueId) s.add(blueId);
    }
    return s;
  }, [matches]);

  const checkedCount = useMemo(
    () => fighters.filter((f) => isCheckedFighter(f)).length,
    [fighters]
  );

  const baseFilteredFighters = useMemo(() => {
    const q = filter.query.trim().toLowerCase();

    return fighters.filter((f) => {
      if (filter.onlyUnmatched && fighterIsMatched(f, matchedIds)) return false;

      if (!q) return true;

      return [
        toName(f),
        f.gym,
        f.gym_input,
        f.fp_gym,
        f.fp_naam,
        f.va_nummer,
        f.discipline,
        f.klasse,
        normalizeGender(f.geslacht),
        f.email,
        f.telefoon,
        f.scrape_status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [fighters, filter, matchedIds]);

  const classTabs = useMemo(() => {
    const present = new Set<ClassTabKey>();

    for (const fighter of baseFilteredFighters) {
      const key = getClassTabKey(fighter);
      if (key) present.add(key);
    }

    return CLASS_TAB_ORDER.filter((item) => present.has(item.key));
  }, [baseFilteredFighters]);

  useEffect(() => {
    if (!classTabs.length) {
      setActiveClassTab("");
      return;
    }
    if (activeClassTab && classTabs.some((tab) => tab.key === activeClassTab)) return;
    setActiveClassTab(classTabs[0].key);
  }, [classTabs, activeClassTab]);

  const visibleFighters = useMemo(() => {
    const rows = baseFilteredFighters.filter((fighter) => {
      if (!activeClassTab) return true;
      return getClassTabKey(fighter) === activeClassTab;
    });

    return [...rows].sort((a, b) => {
      const ageA = getFighterAge(a, matchmaking?.datum ?? null);
      const ageB = getFighterAge(b, matchmaking?.datum ?? null);

      if ((ageA ?? 999) !== (ageB ?? 999)) {
        return (ageA ?? 999) - (ageB ?? 999);
      }

      const weightA = toNum(a.gewicht);
      const weightB = toNum(b.gewicht);

      if ((weightA ?? 9999) !== (weightB ?? 9999)) {
        return (weightA ?? 9999) - (weightB ?? 9999);
      }

      const rowA = a.row_nr ?? 999999;
      const rowB = b.row_nr ?? 999999;

      if (rowA !== rowB) return rowA - rowB;

      return toName(a).localeCompare(toName(b), "nl");
    });
  }, [baseFilteredFighters, activeClassTab, matchmaking?.datum]);

  const visibleDisciplinesText = useMemo(() => {
    const values = Array.from(
      new Set(
        visibleFighters
          .map((f) => String(f.discipline ?? "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "nl"));

    return values.length ? values.join(" · ") : "-";
  }, [visibleFighters]);

  const visibleKlassenText = useMemo(() => {
    const values = Array.from(
      new Set(
        visibleFighters
          .map((f) => String(f.klasse ?? "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "nl"));

    return values.length ? values.join(" · ") : "-";
  }, [visibleFighters]);

  const visibleGeslachtText = useMemo(() => {
    const values = Array.from(
      new Set(
        visibleFighters
          .map((f) => normalizeGender(f.geslacht))
          .filter((v) => v && v !== "Onbekend")
      )
    ).sort((a, b) => a.localeCompare(b, "nl"));

    return values.length ? values.join(" · ") : "-";
  }, [visibleFighters]);

  const compareData = useMemo(() => {
    if (!selectedRed || !selectedBlue) return null;

    const redBirth = getFighterBirth(selectedRed);
    const blueBirth = getFighterBirth(selectedBlue);

    const ageDiffExact = diffInMonthsAndDays(redBirth, blueBirth);
    const redWeight = toNum(selectedRed.gewicht);
    const blueWeight = toNum(selectedBlue.gewicht);

    const differences: DifferenceRow[] = [];

    const addDiff = (
      key: string,
      label: string,
      left: string,
      right: string,
      tone: "default" | "orange" | "red" = "default"
    ) => {
      if ((left || "-") === (right || "-")) return;
      differences.push({
        key,
        label,
        left: left || "-",
        right: right || "-",
        tone,
      });
    };

    addDiff(
      "gewicht",
      "Gewicht",
      formatWeight(redWeight),
      formatWeight(blueWeight),
      redWeight != null && blueWeight != null && redWeight !== blueWeight
        ? "orange"
        : "default"
    );

    addDiff(
      "leeftijd",
      "Leeftijd",
      String(getFighterAge(selectedRed, matchmaking?.datum ?? null) ?? "-"),
      String(getFighterAge(selectedBlue, matchmaking?.datum ?? null) ?? "-")
    );

    addDiff(
      "totaal_partijen",
      "Totaal partijen",
      getDisplayTotalPartijenText(selectedRed),
      getDisplayTotalPartijenText(selectedBlue)
    );

    let ageRule:
      | {
          status: "ok" | "dispensatie" | "verbod";
          text: string;
          months: number;
        }
      | null = null;

    if (ageDiffExact) {
      if (ageDiffExact.months >= 24) {
        ageRule = {
          status: "verbod",
          months: ageDiffExact.months,
          text: `Leeftijdsverschil ${ageDiffExact.text} → VERBOD`,
        };
      } else if (ageDiffExact.months >= 18) {
        ageRule = {
          status: "dispensatie",
          months: ageDiffExact.months,
          text: `Leeftijdsverschil ${ageDiffExact.text} → DISPENSATIE AANVRAGEN`,
        };
      } else {
        ageRule = {
          status: "ok",
          months: ageDiffExact.months,
          text: `Leeftijdsverschil ${ageDiffExact.text}`,
        };
      }
    }

    return {
      redName: toName(selectedRed),
      blueName: toName(selectedBlue),
      differences,
      ageRule,
      saveBlocked:
        ageRule?.status === "verbod" ||
        boutRuleMessages.some((r) => r.severity === "error"),
    };
  }, [selectedRed, selectedBlue, matchmaking?.datum, boutRuleMessages]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function resetMatchChoice() {
    setSelectedRed(null);
    setSelectedBlue(null);
    setShowCompareModal(false);
    setBoutRuleMessages([]);
  }

  async function evaluateBoutRules(red: FighterRow, blue: FighterRow) {
    try {
      const res = await authedFetch(`/api/matchmaker/bout-rules/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          red_fighter_id: red.fighter_id ?? red.id,
          blue_fighter_id: blue.fighter_id ?? blue.id,
          red_inschrijving_id: red.inschrijving_id ?? null,
          blue_inschrijving_id: blue.inschrijving_id ?? null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error ?? "BoutRulesEngine fout");
      }

      const normalized = normalizeBoutRuleMessages(json);
      setBoutRuleMessages(normalized);
      setShowCompareModal(true);
    } catch (err: any) {
      alert(err?.message ?? "Fout bij controleren van de partijregels");
    }
  }

  function handleMatchClick(fighter: FighterRow) {
    if (!selectedRed) {
      setSelectedRed(fighter);
      setSelectedBlue(null);
      setBoutRuleMessages([]);
      setShowCompareModal(false);
      return;
    }

    if (String(selectedRed.id) === String(fighter.id)) {
      resetMatchChoice();
      return;
    }

    setSelectedBlue(fighter);
    void evaluateBoutRules(selectedRed, fighter);
  }

  async function scrapeAll() {
    try {
      if (!matchmakingId) return;

      setScrapeBusy(true);
      setScrapeOverlayOpen(true);
      setScrapeOverlayMessage(
        "Wacht op resultaten... Fightpaspoort controle."
      );

      const res = await authedFetch(`/api/matchmaker/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          do_scrape: true,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? "Scrapen mislukt");
      }

      setScrapeOverlayMessage("Resultaten worden geladen...");
      await load();
    } catch (err: any) {
      alert(err?.message ?? "Scrapen mislukt");
    } finally {
      setScrapeBusy(false);
      setScrapeOverlayOpen(false);
      setScrapeOverlayMessage("");
    }
  }

  async function scrapeSelected() {
    try {
      if (!matchmakingId || selectedIds.length === 0) {
        alert("Selecteer eerst één of meerdere vechters.");
        return;
      }

      const selectedFighters = fighters.filter((f) =>
        selectedIds.includes(String(f.id))
      );

      if (!selectedFighters.length) {
        alert("Geen geselecteerde vechters gevonden.");
        return;
      }

      setScrapeBusy(true);
      setScrapeOverlayOpen(true);
      setScrapeOverlayMessage(
        "Wacht op resultaten... De geselecteerde vechters worden gecontroleerd."
      );

      const res = await authedFetch(`/api/matchmaker/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          do_scrape: true,
          fighter_ids: selectedFighters.map((f) => f.fighter_id ?? f.id),
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? "Autocheck geselecteerd mislukt");
      }

      setScrapeOverlayMessage("Resultaten worden geladen...");
      await load();
    } catch (err: any) {
      alert(err?.message ?? "Autocheck geselecteerd mislukt");
    } finally {
      setScrapeBusy(false);
      setScrapeOverlayOpen(false);
      setScrapeOverlayMessage("");
    }
  }

  async function saveMatch() {
    if (!matchmakingId || !selectedRed || !selectedBlue) return;

    if (String(selectedRed.id) === String(selectedBlue.id)) {
      alert("Deze twee vechters mogen niet dezelfde zijn.");
      return;
    }

    if (compareData?.saveBlocked) {
      alert("Deze partij mag niet opgeslagen worden door de partijregels.");
      return;
    }

    setBusy(true);

    const res = await authedFetch(`/api/matchmaker/create-match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchmaking_id: matchmakingId,

        rood_fighter_id: selectedRed.fighter_id ?? selectedRed.id,
        blauw_fighter_id: selectedBlue.fighter_id ?? selectedBlue.id,

        rood_fighter_context_id:
          selectedRed.source === "fighter_context" ? selectedRed.id : null,
        blauw_fighter_context_id:
          selectedBlue.source === "fighter_context" ? selectedBlue.id : null,

        rood_inschrijving_id: selectedRed.inschrijving_id ?? null,
        blauw_inschrijving_id: selectedBlue.inschrijving_id ?? null,
      }),
    });

    const json = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok) {
      alert(json?.error ?? "Opslaan mislukt");
      return;
    }

    resetMatchChoice();
    router.push(`/dashboard/matchmaker/matchmaking/${matchmakingId}`);
  }

  async function addManualFighter() {
    try {
      if (!matchmakingId) return;

      if (!manualForm.voornaam.trim() && !manualForm.achternaam.trim()) {
        alert("Vul minimaal een naam in.");
        return;
      }

      setHandmatigBusy(true);

      const res = await authedFetch(`/api/matchmaker/add-fighter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          ...manualForm,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        alert(json?.error ?? "Handmatig toevoegen mislukt");
        return;
      }

      setManualForm({
        voornaam: "",
        achternaam: "",
        discipline: "",
        klasse: "",
        geslacht: "",
        gym: "",
        va_nummer: "",
        geboortedatum: "",
        gewicht: "",
        win: "",
        loss: "",
        draw: "",
        demo: "",
        opmerkingen: "",
      });

      setShowManualModal(false);
      await load();
    } finally {
      setHandmatigBusy(false);
    }
  }

  async function handleUpload() {
    try {
      if (!uploadFile || !matchmakingId) return;

      setUploadBusy(true);

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("matchmaking_id", matchmakingId);

      const res = await authedFetch(`/api/matchmaker/submit-inschrijvingen`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error ?? "Upload mislukt");
      }

      setUploadResult({
        inserted: Number(json?.inserted ?? 0),
        duplicates: Number(json?.duplicates ?? 0),
        message:
          json?.message ??
          `Upload voltooid. Toegevoegd: ${Number(
            json?.inserted ?? 0
          )}, dubbelen: ${Number(json?.duplicates ?? 0)}.`,
      });

      setUploadFile(null);
      await load();
    } catch (err: any) {
      alert(err?.message ?? "Upload mislukt");
    } finally {
      setUploadBusy(false);
    }
  }

  const selectedCountText = `${selectedIds.length} geselecteerd`;
  const unmatchedCount = visibleFighters.filter(
    (f) => !fighterIsMatched(f, matchedIds)
  ).length;

  return (
    <main style={pageBackground}>
      <style jsx global>{`
        @keyframes fsSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes fsSpinReverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
      `}</style>

      <div style={topShell}>
        <div style={topLogoWrap}>
          <Image
            src="/branding/fightsupport/excel-logo.png"
            alt="FightSupport"
            width={180}
            height={64}
            style={{ width: "auto", height: 56 }}
            priority
          />
        </div>

        <div style={portalBand}>
          <div style={portalBandInner}>
            <div style={portalBandLeft}>
              <Link
                href={`/dashboard/matchmaker/matchmaking`}
                style={{ textDecoration: "none" }}
              >
                <HeaderButton>
                  <ArrowLeft size={16} style={{ marginRight: 8 }} />
                  Terug
                </HeaderButton>
              </Link>
            </div>

            <div style={portalBandCenter}>
              <div style={portalTitle}>MATCHMAKER</div>
              <div style={portalSub}>VECHTERS MATCHEN</div>
            </div>

            <div style={portalBandRight} />
          </div>
        </div>
      </div>

      <div style={contentWrap}>
        <div style={titleCardCompact}>
          <div style={titleTopRow}>
            <div>
              <div style={titleMain}>
                {matchmaking?.naam || "Matchmaking"}
              </div>
              <div style={titleSubCompact}>
                {formatDate(matchmaking?.datum)} · {matchmaking?.locatie || "-"} ·{" "}
                {matchmaking?.bondteam || "-"}
              </div>
            </div>

            <button
              style={collapseToggle}
              onClick={() => setToolsCollapsed((prev) => !prev)}
            >
              {toolsCollapsed ? (
                <>
                  <ChevronDown size={15} style={{ marginRight: 8 }} />
                  Toon acties
                </>
              ) : (
                <>
                  <ChevronUp size={15} style={{ marginRight: 8 }} />
                  Verberg acties
                </>
              )}
            </button>
          </div>

          <div style={metaRowCompact}>
            <span>Status: {matchmaking?.status || "-"}</span>
            <span>Gecontroleerd: {checkedCount}</span>
            <span>Zichtbaar: {visibleFighters.length}</span>
            <span>Ongekoppeld: {unmatchedCount}</span>
          </div>

          {!toolsCollapsed ? (
            <div style={{ marginTop: 10 }}>
              <div style={actionGridCompact}>
                <ActionCard
                  title="Autocheck alles"
                  text="Start scraper voor alle vechters"
                  icon={<Radar size={22} />}
                  onClick={() => void scrapeAll()}
                  disabled={scrapeBusy || !matchmakingId}
                />
                <ActionCard
                  title="Autocheck geselecteerd"
                  text="Controleer alleen geselecteerde vechters"
                  icon={<CheckCircle2 size={22} />}
                  onClick={() => void scrapeSelected()}
                  disabled={scrapeBusy || !selectedIds.length || !matchmakingId}
                />
                <ActionCard
                  title="Handmatig toevoegen"
                  text="Voeg zelf een vechter toe"
                  icon={<UserPlus size={22} />}
                  onClick={() => setShowManualModal(true)}
                />
                <ActionCard
                  title="Upload vechters"
                  text="Importeer extra vechters uit Excel"
                  icon={<Upload size={22} />}
                  onClick={() => setShowUploadModal(true)}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div style={filterCardCompact}>
          <div style={filterTopRowCompact}>
            <div>
              <div style={sectionTitle}>Zoeken en selectie</div>
              <div style={sectionSub}>
                Klassen staan nu in tabbladen en worden alleen getoond als ze aanwezig zijn.
              </div>
            </div>
            <div style={selectedCount}>{selectedCountText}</div>
          </div>

          <div style={filterGridCompact}>
            <div style={fieldWrapWide}>
              <label style={labelStyle}>Zoeken</label>
              <div style={searchInputWrap}>
                <Search size={16} />
                <input
                  value={filter.query}
                  onChange={(e) =>
                    setFilter((s) => ({ ...s, query: e.target.value }))
                  }
                  placeholder="Zoek op naam, gym, klasse, VA, status..."
                  style={textInputBare}
                />
              </div>
            </div>

            <label style={checkboxWrap}>
              <input
                type="checkbox"
                checked={filter.onlyUnmatched}
                onChange={(e) =>
                  setFilter((s) => ({
                    ...s,
                    onlyUnmatched: e.target.checked,
                  }))
                }
              />
              Alleen ongekoppeld
            </label>

            <div style={filterActionArea}>
              <button style={tinyButton} onClick={clearSelection}>
                Wis selectie
              </button>
              <button
                style={{
                  ...tinyButton,
                  ...(selectedRed ? activePickButton : {}),
                }}
                onClick={resetMatchChoice}
              >
                Reset matchkeuze
              </button>
            </div>
          </div>

          <div style={classInfoRow}>
            <div style={classInfoCard}>
              <div style={labelStyle}>Discipline</div>
              <div style={classInfoValue}>{visibleDisciplinesText}</div>
            </div>
            <div style={classInfoCard}>
              <div style={labelStyle}>Klasse</div>
              <div style={classInfoValue}>{visibleKlassenText}</div>
            </div>
            <div style={classInfoCard}>
              <div style={labelStyle}>Geslacht</div>
              <div style={classInfoValue}>{visibleGeslachtText}</div>
            </div>
          </div>

          {classTabs.length > 0 ? (
            <div style={tabButtonRail}>
              {classTabs.map((tab) => {
                const count = baseFilteredFighters.filter(
                  (fighter) => getClassTabKey(fighter) === tab.key
                ).length;
                const active = activeClassTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    style={{
                      ...tabButton,
                      ...(active ? activeTabButton : {}),
                    }}
                    onClick={() => setActiveClassTab(tab.key)}
                  >
                    <span>{tab.label}</span>
                    <span style={tabCount}>{count}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={emptyStateCard}>
              Geen klasse-tabbladen gevonden voor de huidige selectie.
            </div>
          )}
        </div>

        <div style={fighterTableCard}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 10,
              alignItems: "flex-start",
            }}
          >
            <div>
              <div style={sectionTitle}>
                Beschikbare vechters
                {activeClassTab
                  ? ` · ${
                      classTabs.find((t) => t.key === activeClassTab)?.label ?? ""
                    }`
                  : ""}
              </div>
              <div style={sectionSub}>
                Binnen het tabblad gesorteerd op leeftijd en daarna gewicht.
              </div>
            </div>
          </div>

          {visibleFighters.length === 0 ? (
            <div style={emptyStateCard}>Geen vechters gevonden.</div>
          ) : (
            <div style={tableWrap}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Sel</th>
                    <th style={thStyle}>Actie</th>
                    <th style={thStyle}>Detail</th>
                    <th style={thStyle}>Naam</th>
                    <th style={thStyle}>Discipline</th>
                    <th style={thStyle}>Klasse</th>
                    <th style={thStyle}>Geslacht</th>
                    <th style={thStyle}>Leeftijd</th>
                    <th style={thStyle}>Gewicht</th>
                    <th style={thStyle}>Totaal partijen</th>
                    <th style={thStyle}>Gym</th>
                    <th style={thStyle}>VA</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFighters.map((fighter, index) => {
                    const stableId = getStableSelectionId(fighter);
                    const isSelected = selectedIds.includes(stableId);
                    const isRed = selectedRed?.id === fighter.id;
                    const isBlue = selectedBlue?.id === fighter.id;
                    const alreadyMatched = fighterIsMatched(fighter, matchedIds);
                    const checked = isCheckedFighter(fighter);
                    const age = getFighterAge(fighter, matchmaking?.datum ?? null);

                    const rowBackground =
                      index % 2 === 0 ? "#ffffff" : "#2b2b2b";
                    const rowColor = index % 2 === 0 ? "#111111" : "#ffffff";

                    return (
                      <tr
                        key={fighter.id}
                        style={{ background: rowBackground, color: rowColor }}
                      >
                        <td style={{ ...tdStyle, color: rowColor }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelected(stableId)}
                          />
                        </td>

                        <td style={{ ...tdStyle, color: rowColor }}>
                          <button
                            style={{
                              ...matchPickButton,
                              ...(isRed || isBlue ? activePickButton : {}),
                              opacity: alreadyMatched ? 0.6 : 1,
                            }}
                            onClick={() => handleMatchClick(fighter)}
                            disabled={alreadyMatched}
                          >
                            <Swords size={15} style={{ marginRight: 8 }} />
                            {isRed ? "Rood" : isBlue ? "Blauw" : "Kies"}
                          </button>
                        </td>

                        <td style={{ ...tdStyle, color: rowColor }}>
                          <Link
                            href={getFighterDetailHref(matchmakingId, fighter)}
                            style={detailLink}
                          >
                            <Link2 size={14} style={{ marginRight: 7 }} />
                            Detail
                          </Link>
                        </td>

                        <td style={{ ...tdStyleStrong, color: rowColor }}>
                          {toName(fighter)}
                        </td>

                        <td style={{ ...tdStyle, color: rowColor }}>
                          {fighter.discipline || "-"}
                        </td>

                        <td style={{ ...tdStyle, color: rowColor }}>
                          {fighter.klasse || "-"}
                        </td>

                        <td style={{ ...tdStyle, color: rowColor }}>
                          {normalizeGender(fighter.geslacht)}
                        </td>

                        <td style={{ ...tdStyle, color: rowColor }}>
                          {age ?? "-"}
                        </td>

                        <td style={{ ...tdStyle, color: rowColor }}>
                          {formatWeight(fighter.gewicht)}
                        </td>

                        <td style={{ ...tdStyle, color: rowColor }}>
                          {getDisplayTotalPartijenText(fighter)}
                        </td>

                        <td style={{ ...tdStyle, color: rowColor }}>
                          {fighter.gym || fighter.gym_input || fighter.fp_gym || "-"}
                        </td>

                        <td style={{ ...tdStyle, color: rowColor }}>
                          {fighter.va_nummer || "-"}
                        </td>

                        <td style={{ ...tdStyle, color: rowColor }}>
                          {alreadyMatched ? (
                            "Al gekoppeld"
                          ) : checked ? (
                            "Gecontroleerd"
                          ) : (
                            fighter.scrape_status || "Nieuw"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCompareModal && compareData && selectedRed && selectedBlue ? (
        <div style={modalBackdrop} onClick={resetMatchChoice}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={modalTopBar}>
              <div>
                <div style={sectionTitle}>Verschillen en meldingen</div>
                <div style={sectionSub}>
                  Gewicht, leeftijd, aantal partijen en alle meldingen uit de boutRulesEngine.
                </div>
              </div>

              <div style={modalTopActions}>
                <button style={secondaryButton} onClick={resetMatchChoice}>
                  Annuleren
                </button>
                <button
                  style={{
                    ...primaryButton,
                    ...(compareData.saveBlocked ? disabledDangerButton : {}),
                  }}
                  disabled={busy || compareData.saveBlocked}
                  onClick={() => void saveMatch()}
                >
                  <Save size={16} style={{ marginRight: 8 }} />
                  {busy ? "Opslaan..." : "Match"}
                </button>
                <button style={closeBtn} onClick={resetMatchChoice}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {compareData.ageRule?.status === "dispensatie" ? (
              <div style={dispensatieBanner}>
                <AlertTriangle size={18} style={{ marginRight: 10 }} />
                {compareData.ageRule.text}
              </div>
            ) : null}

            {compareData.ageRule?.status === "verbod" ? (
              <div style={verbodBanner}>
                <AlertTriangle size={18} style={{ marginRight: 10 }} />
                {compareData.ageRule.text}
              </div>
            ) : null}

            <div style={compareHeaderRow}>
              <div />
              <div style={compareFighterHeader}>{compareData.redName}</div>
              <div style={compareFighterHeader}>{compareData.blueName}</div>
            </div>

            <div style={compareTable}>
              {compareData.differences.length === 0 ? (
                <div style={noDiffCard}>Geen verschillen gevonden.</div>
              ) : (
                compareData.differences.map((row) => (
                  <CompareRow
                    key={row.key}
                    label={row.label}
                    left={row.left}
                    right={row.right}
                    tone={row.tone}
                  />
                ))
              )}
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={sectionTitle}>BoutRulesEngine meldingen</div>
              {boutRuleMessages.length === 0 ? (
                <div style={noDiffCard}>
                  Geen meldingen vanuit de boutRulesEngine ontvangen.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {boutRuleMessages.map((rule) => {
                    const toneStyle =
                      rule.severity === "error"
                        ? verbodBanner
                        : rule.severity === "warning"
                        ? dispensatieBanner
                        : okBanner;

                    const Icon =
                      rule.severity === "ok" ? CheckCircle2 : AlertTriangle;

                    return (
                      <div key={rule.code} style={toneStyle}>
                        <Icon size={18} style={{ marginRight: 10 }} />
                        <div>
                          <div style={{ fontWeight: 900 }}>{rule.message}</div>
                          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
                            Code: {rule.code}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showManualModal ? (
        <div style={modalBackdrop} onClick={() => setShowManualModal(false)}>
          <div style={modalCardLarge} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div style={sectionTitle}>Vechter handmatig toevoegen</div>
              <button style={closeBtn} onClick={() => setShowManualModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={manualGrid}>
              <ManualInput
                label="Voornaam"
                value={manualForm.voornaam}
                onChange={(v) => setManualForm((s) => ({ ...s, voornaam: v }))}
              />
              <ManualInput
                label="Achternaam"
                value={manualForm.achternaam}
                onChange={(v) => setManualForm((s) => ({ ...s, achternaam: v }))}
              />
              <ManualInput
                label="Geslacht"
                value={manualForm.geslacht}
                onChange={(v) => setManualForm((s) => ({ ...s, geslacht: v }))}
              />
              <ManualInput
                label="Discipline"
                value={manualForm.discipline}
                onChange={(v) => setManualForm((s) => ({ ...s, discipline: v }))}
              />
              <ManualInput
                label="Klasse"
                value={manualForm.klasse}
                onChange={(v) => setManualForm((s) => ({ ...s, klasse: v }))}
              />
              <ManualInput
                label="Gym"
                value={manualForm.gym}
                onChange={(v) => setManualForm((s) => ({ ...s, gym: v }))}
              />
              <ManualInput
                label="VA nummer"
                value={manualForm.va_nummer}
                onChange={(v) => setManualForm((s) => ({ ...s, va_nummer: v }))}
              />
              <ManualInput
                label="Geboortedatum"
                type="date"
                value={manualForm.geboortedatum}
                onChange={(v) =>
                  setManualForm((s) => ({ ...s, geboortedatum: v }))
                }
              />
              <ManualInput
                label="Gewicht"
                value={manualForm.gewicht}
                onChange={(v) => setManualForm((s) => ({ ...s, gewicht: v }))}
              />
              <ManualInput
                label="Win"
                value={manualForm.win}
                onChange={(v) => setManualForm((s) => ({ ...s, win: v }))}
              />
              <ManualInput
                label="Loss"
                value={manualForm.loss}
                onChange={(v) => setManualForm((s) => ({ ...s, loss: v }))}
              />
              <ManualInput
                label="Draw"
                value={manualForm.draw}
                onChange={(v) => setManualForm((s) => ({ ...s, draw: v }))}
              />
              <ManualInput
                label="Demo"
                value={manualForm.demo}
                onChange={(v) => setManualForm((s) => ({ ...s, demo: v }))}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>Opmerkingen</label>
              <textarea
                style={textareaStyle}
                value={manualForm.opmerkingen}
                onChange={(e) =>
                  setManualForm((s) => ({ ...s, opmerkingen: e.target.value }))
                }
              />
            </div>

            <div style={modalActionRow}>
              <button
                style={secondaryButton}
                onClick={() => setShowManualModal(false)}
              >
                Annuleren
              </button>
              <button
                style={primaryButton}
                disabled={handmatigBusy || !matchmakingId}
                onClick={() => void addManualFighter()}
              >
                {handmatigBusy ? "Opslaan..." : "Toevoegen"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showUploadModal ? (
        <div
          style={modalBackdrop}
          onClick={() => !uploadBusy && setShowUploadModal(false)}
        >
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <div style={sectionTitle}>Vechters uploaden</div>
                <div style={sectionSub}>Upload een Excel bestand met nieuwe vechters.</div>
              </div>
              <button
                style={closeBtn}
                onClick={() => !uploadBusy && setShowUploadModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "16px 18px" }}>
              <label style={labelStyle}>Excel bestand (.xlsx, .xls)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                style={fileInputStyle}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setUploadFile(f);
                  setUploadResult(null);
                }}
              />

              {uploadResult ? (
                <div style={uploadResultBox}>{uploadResult.message}</div>
              ) : null}
            </div>

            <div style={modalActionRow}>
              <button
                style={secondaryButton}
                onClick={() => !uploadBusy && setShowUploadModal(false)}
              >
                Sluiten
              </button>
              <button
                style={primaryButton}
                disabled={!uploadFile || uploadBusy || !matchmakingId}
                onClick={() => void handleUpload()}
              >
                <Upload size={16} style={{ marginRight: 8 }} />
                {uploadBusy ? "Uploaden..." : "Upload bestand"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {scrapeOverlayOpen ? (
        <div style={scrapeOverlay}>
          <div style={scrapeOverlayCard}>
            <div style={scrapeSpinnerWrap}>
              <div style={scrapeSpinnerOuter} />
              <div style={scrapeSpinnerInner} />
            </div>

            <div style={scrapeOverlayTitle}>Even wachten</div>
            <div style={scrapeOverlayTextStyle}>
              {scrapeOverlayMessage || "Wacht op resultaten..."}
            </div>
            <div style={scrapeOverlaySub}>
              Sluit deze pagina niet af totdat de resultaten zijn geladen.
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function CompareRow({
  label,
  left,
  right,
  tone = "default",
}: {
  label: string;
  left: string;
  right: string;
  tone?: "default" | "orange" | "red";
}) {
  const rowTone =
    tone === "red"
      ? compareValueDanger
      : tone === "orange"
      ? compareValueWarning
      : compareValue;

  return (
    <div style={compareRow}>
      <div style={compareLabel}>{label}</div>
      <div style={rowTone}>{left || "-"}</div>
      <div style={rowTone}>{right || "-"}</div>
    </div>
  );
}

function ManualInput({
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
        style={inputStyle}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ActionCard({
  title,
  text,
  icon,
  onClick,
  disabled,
}: {
  title: string;
  text: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...portalCardCompact,
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div style={iconBoxCompact}>{icon}</div>
      <div style={{ flex: 1, textAlign: "left" }}>
        <div style={portalCardTitleCompact}>{title}</div>
        <div style={portalCardTextCompact}>{text}</div>
      </div>
    </button>
  );
}

const pageBackground: CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(900px 520px at 18% 0%, rgba(255,77,0,0.14), transparent 56%), radial-gradient(780px 520px at 82% 18%, rgba(255,255,255,0.08), transparent 62%), linear-gradient(180deg,#040404 0%, #050505 55%, #000000 100%)",
  color: "#fff",
};
const topShell: CSSProperties = {
  position: "relative",
  paddingBottom: 4,
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  background: "linear-gradient(180deg, rgba(255,77,0,0.08) 0%, rgba(0,0,0,0) 58%)",
};
const topLogoWrap: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  paddingTop: 2,
  paddingBottom: 2,
};
const portalBand: CSSProperties = {
  marginTop: 0,
  background: "linear-gradient(180deg, rgba(12,20,36,0.98) 0%, rgba(4,8,14,0.98) 100%)",
  borderTop: "1px solid rgba(255,255,255,0.12)",
  borderBottom: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};
const portalBandInner: CSSProperties = {
  maxWidth: 1600,
  margin: "0 auto",
  minHeight: 78,
  display: "grid",
  gridTemplateColumns: "220px 1fr 220px",
  alignItems: "center",
  gap: 12,
  padding: "0 14px",
};
const portalBandLeft: CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
};
const portalBandCenter: CSSProperties = { textAlign: "center" };
const portalBandRight: CSSProperties = { minHeight: 1 };
const portalTitle: CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  lineHeight: 1,
  letterSpacing: "0.035em",
  color: "#f3f4f6",
  textShadow: "0 2px 10px rgba(0,0,0,0.55)",
};
const portalSub: CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  letterSpacing: "0.26em",
  color: NVB_ORANGE,
};
const silverButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 36,
  padding: "0 13px",
  border: "1px solid rgba(0,0,0,0.35)",
  background: "linear-gradient(180deg,#ffffff 0%,#e7e7e7 34%,#bcbcbc 50%,#fafafa 100%)",
  color: "#111",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.92), 0 8px 18px rgba(0,0,0,0.22)",
};
const contentWrap: CSSProperties = {
  maxWidth: 1800,
  margin: "0 auto",
  padding: "8px 14px 14px",
  display: "grid",
  gap: 10,
};
const titleCardCompact: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.16)",
  background: "linear-gradient(180deg, rgba(6,11,18,0.985) 0%, rgba(1,3,7,0.985) 100%)",
  padding: 12,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};
const titleTopRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};
const collapseToggle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 34,
  padding: "0 12px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const titleMain: CSSProperties = { fontSize: 18, fontWeight: 900, color: "#fff" };
const titleSubCompact: CSSProperties = {
  marginTop: 2,
  fontSize: 13,
  color: "#c9d1db",
};
const metaRowCompact: CSSProperties = {
  marginTop: 8,
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  fontSize: 12,
  color: "#d9d9d9",
};
const actionGridCompact: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 10,
};
const portalCardCompact: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 10,
  border: "1px solid rgba(230,230,230,0.72)",
  background: "linear-gradient(180deg, rgba(11,16,24,0.985) 0%, rgba(3,7,12,0.985) 100%)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14), 0 10px 18px rgba(0,0,0,0.24)",
};
const iconBoxCompact: CSSProperties = {
  width: 46,
  height: 46,
  display: "grid",
  placeItems: "center",
  color: "#fff",
  background: "linear-gradient(180deg, #ff680f 0%, #ff4d00 55%, #cc3f00 100%)",
  boxShadow: "0 8px 16px rgba(255,77,0,0.16)",
  flexShrink: 0,
};
const portalCardTitleCompact: CSSProperties = {
  fontSize: 15,
  fontWeight: 900,
  color: "#efefef",
};
const portalCardTextCompact: CSSProperties = {
  marginTop: 2,
  fontSize: 12,
  color: "#d0d6df",
};
const filterCardCompact: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.16)",
  background: "linear-gradient(180deg, rgba(6,11,18,0.985) 0%, rgba(1,3,7,0.985) 100%)",
  padding: 12,
};
const filterTopRowCompact: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  marginBottom: 10,
};
const selectedCount: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#d8d8d8",
};
const sectionTitle: CSSProperties = {
  fontSize: 17,
  fontWeight: 900,
  color: "#fff",
};
const sectionSub: CSSProperties = {
  marginTop: 3,
  fontSize: 13,
  color: "#aeb8c5",
};
const filterGridCompact: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr auto auto",
  gap: 10,
  alignItems: "end",
};
const filterActionArea: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};
const fieldWrapWide: CSSProperties = { display: "grid", gap: 6 };
const labelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#c4ccd7",
};
const inputStyle: CSSProperties = {
  height: 42,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  padding: "0 12px",
  outline: "none",
};
const searchInputWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  height: 42,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  padding: "0 12px",
};
const textInputBare: CSSProperties = {
  flex: 1,
  height: "100%",
  background: "transparent",
  border: "none",
  color: "#fff",
  outline: "none",
};
const checkboxWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minHeight: 42,
  fontSize: 13,
  color: "#d6dbe2",
};
const classInfoRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
  marginTop: 10,
};
const classInfoCard: CSSProperties = {
  padding: "10px 12px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
};
const classInfoValue: CSSProperties = {
  marginTop: 5,
  fontSize: 13,
  color: "#ffffff",
  fontWeight: 700,
};
const tabButtonRail: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 12,
};
const tabButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  minHeight: 38,
  padding: "0 14px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};
const activeTabButton: CSSProperties = {
  background: "linear-gradient(180deg,#ff8b45 0%,#ff4d00 100%)",
  border: "1px solid rgba(255,77,0,0.55)",
  color: "#fff",
};
const tabCount: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 24,
  height: 24,
  padding: "0 6px",
  background: "rgba(0,0,0,0.18)",
  fontSize: 12,
  fontWeight: 900,
};
const fighterTableCard: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.16)",
  background: "linear-gradient(180deg, rgba(6,11,18,0.985) 0%, rgba(1,3,7,0.985) 100%)",
  padding: 10,
};
const tinyButton: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
};
const emptyStateCard: CSSProperties = {
  padding: 20,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
  color: "#cbd5e1",
};
const tableWrap: CSSProperties = {
  overflowX: "auto",
  border: "1px solid rgba(255,255,255,0.16)",
};
const tableStyle: CSSProperties = { width: "100%", borderCollapse: "collapse" };
const thStyle: CSSProperties = {
  background: "linear-gradient(180deg, #ff6a00 0%, #ff5400 100%)",
  color: "#fff",
  padding: "10px 8px",
  textAlign: "left",
  fontWeight: 900,
  whiteSpace: "nowrap",
  fontSize: 13,
};
const tdStyle: CSSProperties = {
  padding: "8px",
  borderTop: "1px solid rgba(0,0,0,0.08)",
  whiteSpace: "nowrap",
  fontSize: 13,
};
const tdStyleStrong: CSSProperties = { ...tdStyle, fontWeight: 800 };
const detailLink: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  color: "#111",
  textDecoration: "none",
  fontWeight: 800,
  background: "#ececec",
  padding: "7px 10px",
  fontSize: 12,
};
const matchPickButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 34,
  padding: "0 12px",
  border: "1px solid rgba(0,0,0,0.2)",
  background: "#efefef",
  color: "#111",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 12,
};
const activePickButton: CSSProperties = {
  background: "linear-gradient(180deg,#ff8b45 0%,#ff4d00 100%)",
  color: "#fff",
};
const modalBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.62)",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  zIndex: 1000,
  padding: "36px 20px 20px",
  overflowY: "auto",
};
const modalCard: CSSProperties = {
  width: "100%",
  maxWidth: 920,
  border: "3px solid rgba(255,255,255,0.20)",
  background: "linear-gradient(180deg, rgba(16,19,26,0.99) 0%, rgba(5,8,13,0.99) 100%)",
  padding: 18,
  boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
  marginBottom: 24,
};
const modalCardLarge: CSSProperties = { ...modalCard, maxWidth: 1100 };
const modalHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 16,
};
const modalTopBar: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 16,
};
const modalTopActions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};
const closeBtn: CSSProperties = {
  width: 40,
  height: 40,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  cursor: "pointer",
};
const compareHeaderRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "180px 1fr 1fr",
  gap: 10,
  marginBottom: 8,
};
const compareFighterHeader: CSSProperties = {
  fontWeight: 900,
  color: "#fff",
  padding: "0 4px",
};
const compareTable: CSSProperties = { display: "grid", gap: 8 };
const compareRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "180px 1fr 1fr",
  gap: 10,
  alignItems: "center",
};
const compareLabel: CSSProperties = {
  fontWeight: 900,
  color: "#fff",
  fontSize: 13,
};
const compareValue: CSSProperties = {
  minHeight: 42,
  display: "flex",
  alignItems: "center",
  padding: "0 12px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#e5e7eb",
  fontSize: 13,
};
const compareValueWarning: CSSProperties = {
  ...compareValue,
  background: "rgba(255,166,0,0.10)",
  border: "1px solid rgba(255,166,0,0.30)",
  color: "#ffdc9b",
};
const compareValueDanger: CSSProperties = {
  ...compareValue,
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.34)",
  color: "#fecaca",
};
const primaryButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "0 14px",
  border: "1px solid rgba(255,77,0,0.55)",
  background: "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};
const secondaryButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "0 14px",
  border: "1px solid rgba(255,255,255,0.20)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};
const disabledDangerButton: CSSProperties = {
  background: "linear-gradient(180deg, #7f1d1d 0%, #991b1b 100%)",
  border: "1px solid rgba(239,68,68,0.55)",
  opacity: 0.7,
  cursor: "not-allowed",
};
const modalActionRow: CSSProperties = {
  marginTop: 18,
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
};
const manualGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 12,
};
const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 100,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  padding: 12,
  outline: "none",
  resize: "vertical",
};
const dispensatieBanner: CSSProperties = {
  display: "flex",
  alignItems: "center",
  marginBottom: 14,
  padding: "12px 14px",
  background: "rgba(255,166,0,0.12)",
  border: "1px solid rgba(255,166,0,0.35)",
  color: "#ffdc9b",
  fontWeight: 900,
};
const verbodBanner: CSSProperties = {
  display: "flex",
  alignItems: "center",
  marginBottom: 14,
  padding: "12px 14px",
  background: "rgba(239,68,68,0.14)",
  border: "1px solid rgba(239,68,68,0.38)",
  color: "#fecaca",
  fontWeight: 900,
};
const okBanner: CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "12px 14px",
  background: "rgba(34,197,94,0.12)",
  border: "1px solid rgba(34,197,94,0.34)",
  color: "#bbf7d0",
  fontWeight: 900,
};
const noDiffCard: CSSProperties = {
  padding: "14px 16px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#e5e7eb",
  fontWeight: 700,
};
const scrapeOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 3000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.72)",
  backdropFilter: "blur(3px)",
  padding: 20,
};
const scrapeOverlayCard: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  border: "2px solid rgba(255,255,255,0.18)",
  background: "linear-gradient(180deg, rgba(10,14,20,0.98) 0%, rgba(3,7,12,0.98) 100%)",
  boxShadow: "0 28px 80px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.08)",
  padding: "28px 26px",
  textAlign: "center",
};
const scrapeSpinnerWrap: CSSProperties = {
  position: "relative",
  width: 88,
  height: 88,
  margin: "0 auto 18px",
};
const scrapeSpinnerOuter: CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: "50%",
  border: "4px solid rgba(255,255,255,0.12)",
  borderTop: "4px solid #ff4d00",
  animation: "fsSpin 1s linear infinite",
};
const scrapeSpinnerInner: CSSProperties = {
  position: "absolute",
  inset: 14,
  borderRadius: "50%",
  border: "3px solid rgba(255,255,255,0.08)",
  borderBottom: "3px solid #ff8a3d",
  animation: "fsSpinReverse 1.2s linear infinite",
};
const scrapeOverlayTitle: CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  color: "#ffffff",
  letterSpacing: "0.03em",
};
const scrapeOverlayTextStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 15,
  lineHeight: 1.5,
  color: "#f1f5f9",
  fontWeight: 700,
};
const scrapeOverlaySub: CSSProperties = {
  marginTop: 12,
  fontSize: 12,
  color: "#aeb8c5",
};
const fileInputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 6,
  color: "#e2e8f0",
  fontSize: 13,
};
const uploadResultBox: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 6,
  background: "rgba(34,197,94,0.15)",
  border: "1px solid rgba(34,197,94,0.4)",
  color: "#86efac",
  fontSize: 13,
  fontWeight: 700,
  marginTop: 12,
};