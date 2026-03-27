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
  RefreshCcw,
  Save,
  Upload,
  Search,
  UserPlus,
  Radar,
  Users,
  X,
  Link2,
  Swords,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";

const NVB_ORANGE = "#ff4d00";

type FighterRow = {
  id: string;
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

  rood_fighter_id?: string | null;
  blauw_fighter_id?: string | null;

  rood_fighter_context_id?: string | null;
  blauw_fighter_context_id?: string | null;

  rood_naam?: string | null;
  blauw_naam?: string | null;
  advice?: string | null;
  warnings?: string[] | null;
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
    source: "inschrijving",

    matchmaking_id: row.matchmaking_id ?? null,
    upload_id: row.upload_id ?? null,
    row_nr: row.row_nr ?? null,
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
    source: "fighter_context",

    matchmaking_id: row.matchmaking_id ?? null,
    upload_id: null,
    row_nr: null,
    inschrijving_id: row.inschrijving_id ? String(row.inschrijving_id) : null,

    discipline: pickString(row, ["discipline"]),
    klasse: pickString(row, ["klasse"]),
    geslacht: pickString(row, ["geslacht"]),

    voornaam: pickString(row, ["voornaam"]),
    achternaam: pickString(row, ["achternaam"]),
    naam_input: pickString(row, ["naam_input"]),

    email: null,
    telefoon: null,
    gym: pickString(row, ["fp_gym"]),
    gym_input: pickString(row, ["gym_input"]),
    va_nummer: pickString(row, ["va_nummer"]),

    geboortedatum: pickString(row, ["fp_geboortedatum"]),
    geboortedatum_input: pickString(row, ["geboortedatum_input"]),
    gewicht:
      pickNumber(row, ["gewicht"]) ??
      pickString(row, ["gewicht"]) ??
      null,

    win: pickNumber(row, ["record_w"]),
    loss: pickNumber(row, ["record_l"]),
    draw: pickNumber(row, ["record_d"]),
    demo: null,

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

    rood_fighter_id: row.rood_fighter_id ?? null,
    blauw_fighter_id: row.blauw_fighter_id ?? null,

    rood_fighter_context_id: row.rood_fighter_context_id ?? null,
    blauw_fighter_context_id: row.blauw_fighter_context_id ?? null,

    rood_naam: row.rood_naam ?? null,
    blauw_naam: row.blauw_naam ?? null,
    advice: row.advice ?? null,
    warnings: Array.isArray(row.warnings) ? row.warnings : null,
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
    return "Vrouwelijk";
  }
  if (
    v === "man" ||
    v === "m" ||
    v === "male" ||
    v === "heer" ||
    v === "jongen"
  ) {
    return "Mannelijk";
  }
  return value?.trim() || "Onbekend";
}

function klasseLabelForTab(value?: string | null) {
  const raw = String(value ?? "").trim();
  const v = raw.toLowerCase();

  if (!raw) return "";
  if (v.includes("jeugd")) return "Jeugd";
  if (v === "a" || v.startsWith("a ") || v.includes("a-klasse")) return "A";
  if (v === "b" || v.startsWith("b ") || v.includes("b-klasse")) return "B";
  if (v === "c" || v.startsWith("c ") || v.includes("c-klasse")) return "C";
  if (v === "n" || v.startsWith("n ") || v.includes("n-klasse")) return "N";

  return raw;
}

function klasseDisplayLabel(tab: string) {
  if (tab === "A") return "A-Klasse";
  if (tab === "B") return "B-Klasse";
  if (tab === "C") return "C-Klasse";
  if (tab === "N") return "N-Klasse";
  return tab;
}

function klasseRank(tab: string) {
  if (tab === "A") return 0;
  if (tab === "B") return 1;
  if (tab === "C") return 2;
  if (tab === "N") return 3;
  if (tab === "Jeugd") return 4;
  return 999;
}

function getRecordText(f: FighterRow | null | undefined) {
  if (!f) return "-";
  const win = toNum(f.win) ?? 0;
  const loss = toNum(f.loss) ?? 0;
  const draw = toNum(f.draw) ?? 0;
  const demo = toNum(f.demo) ?? 0;
  return `${win}-${loss}-${draw}${demo ? ` (${demo} demo)` : ""}`;
}

function getTotalFights(f: FighterRow | null | undefined) {
  if (!f) return 0;
  return (
    (toNum(f.win) ?? 0) +
    (toNum(f.loss) ?? 0) +
    (toNum(f.draw) ?? 0) +
    (toNum(f.demo) ?? 0)
  );
}

function isYouthKlasse(value?: string | null) {
  return String(value ?? "").toLowerCase().includes("jeugd");
}

function getMatchLinkedId(match: MatchRow, side: "red" | "blue") {
  if (side === "red") {
    return String(
      match.rood_fighter_context_id ?? match.rood_fighter_id ?? ""
    ).trim();
  }
  return String(
    match.blauw_fighter_context_id ?? match.blauw_fighter_id ?? ""
  ).trim();
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

  const [activeDiscipline, setActiveDiscipline] = useState("");
  const [activeKlasse, setActiveKlasse] = useState("");

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
      mappedFighters = fighterContextRows.map(mapFighterContextToFighter);

      if (!loadedMatchmaking) {
        loadedMatchmaking = deriveMatchmakingFromRows(matchmakingId, fighterContextRows);
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
      .from("matchmaker_matches")
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

  const baseFiltered = useMemo(() => {
    const q = filter.query.trim().toLowerCase();

    return fighters
      .filter((f) => !filter.onlyUnmatched || !matchedIds.has(String(f.id)))
      .filter((f) => {
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
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
  }, [fighters, filter, matchedIds]);

  const disciplineTabs = useMemo(() => {
    return Array.from(
      new Set(
        baseFiltered.map((f) => String(f.discipline ?? "").trim()).filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "nl"));
  }, [baseFiltered]);

  useEffect(() => {
    if (!disciplineTabs.length) {
      setActiveDiscipline("");
      return;
    }
    if (!activeDiscipline || !disciplineTabs.includes(activeDiscipline)) {
      setActiveDiscipline(disciplineTabs[0]);
    }
  }, [disciplineTabs, activeDiscipline]);

  const klasseTabs = useMemo(() => {
    if (!activeDiscipline) return [];

    const values = Array.from(
      new Set(
        baseFiltered
          .filter((f) => String(f.discipline ?? "").trim() === activeDiscipline)
          .map((f) => klasseLabelForTab(f.klasse))
          .filter(Boolean)
      )
    );

    return values.sort((a, b) => klasseRank(a) - klasseRank(b) || a.localeCompare(b, "nl"));
  }, [baseFiltered, activeDiscipline]);

  useEffect(() => {
    if (!klasseTabs.length) {
      setActiveKlasse("");
      return;
    }
    if (!activeKlasse || !klasseTabs.includes(activeKlasse)) {
      setActiveKlasse(klasseTabs[0]);
    }
  }, [klasseTabs, activeKlasse]);

  const visibleFighters = useMemo(() => {
    const rows = baseFiltered.filter((f) => {
      const disciplineOk = activeDiscipline
        ? String(f.discipline ?? "").trim() === activeDiscipline
        : true;
      const klasseOk = activeKlasse
        ? klasseLabelForTab(f.klasse) === activeKlasse
        : true;
      return disciplineOk && klasseOk;
    });

    return [...rows].sort((a, b) => {
      const genderA = normalizeGender(a.geslacht);
      const genderB = normalizeGender(b.geslacht);
      if (genderA !== genderB) {
        return genderA.localeCompare(genderB, "nl");
      }

      const ageA = calcAgeOnDate(
        a.geboortedatum ?? a.geboortedatum_input ?? a.fp_geboortedatum ?? null,
        matchmaking?.datum ?? null
      );
      const ageB = calcAgeOnDate(
        b.geboortedatum ?? b.geboortedatum_input ?? b.fp_geboortedatum ?? null,
        matchmaking?.datum ?? null
      );

      if ((ageA ?? 999) !== (ageB ?? 999)) {
        return (ageA ?? 999) - (ageB ?? 999);
      }

      const weightA = toNum(a.gewicht);
      const weightB = toNum(b.gewicht);

      if ((weightA ?? 9999) !== (weightB ?? 9999)) {
        return (weightA ?? 9999) - (weightB ?? 9999);
      }

      return toName(a).localeCompare(toName(b), "nl");
    });
  }, [baseFiltered, activeDiscipline, activeKlasse, matchmaking?.datum]);

  const groupedVisibleFighters = useMemo(() => {
    const groups: Record<string, FighterRow[]> = {};
    for (const fighter of visibleFighters) {
      const key = normalizeGender(fighter.geslacht);
      if (!groups[key]) groups[key] = [];
      groups[key].push(fighter);
    }
    return groups;
  }, [visibleFighters]);

  const compareSummary = useMemo(() => {
    if (!selectedRed || !selectedBlue) return null;

    const redAge = calcAgeOnDate(
      selectedRed.geboortedatum ??
        selectedRed.geboortedatum_input ??
        selectedRed.fp_geboortedatum ??
        null,
      matchmaking?.datum ?? null
    );
    const blueAge = calcAgeOnDate(
      selectedBlue.geboortedatum ??
        selectedBlue.geboortedatum_input ??
        selectedBlue.fp_geboortedatum ??
        null,
      matchmaking?.datum ?? null
    );

    const redWeight = toNum(selectedRed.gewicht);
    const blueWeight = toNum(selectedBlue.gewicht);

    const youth =
      isYouthKlasse(selectedRed.klasse) || isYouthKlasse(selectedBlue.klasse);

    return {
      rood: toName(selectedRed),
      blauw: toName(selectedBlue),
      discipline: selectedRed.discipline || selectedBlue.discipline || "-",
      klasse: selectedRed.klasse || selectedBlue.klasse || "-",
      geslacht: selectedRed.geslacht || selectedBlue.geslacht || "-",
      gewichtDiff:
        redWeight != null && blueWeight != null
          ? Math.abs(redWeight - blueWeight).toFixed(2)
          : "-",
      leeftijdDiff:
        redAge != null && blueAge != null ? Math.abs(redAge - blueAge) : "-",
      roodLeeftijd: redAge ?? "-",
      blauwLeeftijd: blueAge ?? "-",
      roodGym: selectedRed.gym_input || selectedRed.fp_gym || selectedRed.gym || "-",
      blauwGym: selectedBlue.gym_input || selectedBlue.fp_gym || selectedBlue.gym || "-",
      roodVA: selectedRed.va_nummer || "-",
      blauwVA: selectedBlue.va_nummer || "-",
      roodRecord: getRecordText(selectedRed),
      blauwRecord: getRecordText(selectedBlue),
      roodPartijen: getTotalFights(selectedRed),
      blauwPartijen: getTotalFights(selectedBlue),
      isJeugd: youth,
    };
  }, [selectedRed, selectedBlue, matchmaking?.datum]);

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
  }

  function handleMatchClick(fighter: FighterRow) {
    if (!selectedRed) {
      setSelectedRed(fighter);
      setSelectedBlue(null);
      setShowCompareModal(false);
      return;
    }

    if (String(selectedRed.id) === String(fighter.id)) {
      setSelectedRed(null);
      setSelectedBlue(null);
      setShowCompareModal(false);
      return;
    }

    setSelectedBlue(fighter);
    setShowCompareModal(true);
  }

  async function scrapeAll() {
    try {
      if (!matchmakingId) return;

      setScrapeBusy(true);

      const res = await authedFetch(`/api/matchmaker/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          mode: "auto",
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        alert(json?.error ?? "Scrapen mislukt");
        return;
      }

      await load();
    } finally {
      setScrapeBusy(false);
    }
  }

  async function scrapeSelected() {
    try {
      if (!matchmakingId) return;

      if (!selectedIds.length) {
        alert("Selecteer eerst vechters.");
        return;
      }

      setScrapeBusy(true);

      const selectedFighters = fighters.filter((f) => selectedIds.includes(String(f.id)));
      const fighterContextIds = selectedFighters
        .filter((f) => f.source === "fighter_context")
        .map((f) => f.id);

      const inschrijvingIds = selectedFighters
        .filter((f) => f.source === "inschrijving")
        .map((f) => f.id);

      const res = await authedFetch(`/api/matchmaker/scrape-fighters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          mode: "selected",
          fighter_ids: selectedIds,
          fighter_context_ids: fighterContextIds,
          inschrijving_ids: inschrijvingIds,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        alert(json?.error ?? "Scrapen mislukt");
        return;
      }

      await load();
    } finally {
      setScrapeBusy(false);
    }
  }

  async function saveMatch() {
    if (!matchmakingId || !selectedRed || !selectedBlue) return;

    if (String(selectedRed.id) === String(selectedBlue.id)) {
      alert("Rood en blauw mogen niet dezelfde vechter zijn.");
      return;
    }

    setBusy(true);

    const res = await authedFetch(`/api/matchmaker/create-match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchmaking_id: matchmakingId,

        rood_fighter_id: selectedRed.id,
        blauw_fighter_id: selectedBlue.id,

        rood_fighter_context_id:
          selectedRed.source === "fighter_context" ? selectedRed.id : null,
        blauw_fighter_context_id:
          selectedBlue.source === "fighter_context" ? selectedBlue.id : null,

        rood_inschrijving_id:
          selectedRed.source === "inschrijving"
            ? selectedRed.inschrijving_id ?? selectedRed.id
            : selectedRed.inschrijving_id ?? null,
        blauw_inschrijving_id:
          selectedBlue.source === "inschrijving"
            ? selectedBlue.inschrijving_id ?? selectedBlue.id
            : selectedBlue.inschrijving_id ?? null,
      }),
    });

    const json = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok) {
      alert(json?.error ?? "Opslaan mislukt");
      return;
    }

    setSelectedRed(null);
    setSelectedBlue(null);
    setShowCompareModal(false);
    await load();
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
    if (!uploadFile || !matchmakingId) return;

    setUploadBusy(true);
    setUploadResult(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Niet ingelogd.");
        return;
      }

      // Collect existing VA nummers for dedup check
      const existingVaNummers = new Set(
        fighters
          .map((f) => String(f.va_nummer ?? "").trim().toLowerCase())
          .filter(Boolean)
      );

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("matchmaking_id", matchmakingId);
      formData.append("uploaded_by", user.id);

      const token = (await supabase.auth.getSession()).data.session?.access_token ?? "";
      const res = await fetch("/api/matchmaker/submit-inschrijvingen", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json?.error ?? "Upload mislukt");
        return;
      }

      // Reload fighters and count duplicates
      await load();

      // Re-collect after load to count dupes
      const newFightersQuery = await supabase
        .from("matchmaker_inschrijvingen")
        .select("va_nummer")
        .eq("matchmaking_id", matchmakingId)
        .eq("upload_id", json.upload_id);

      const newVaNummers = (newFightersQuery.data ?? []).map((r: any) =>
        String(r.va_nummer ?? "").trim().toLowerCase()
      );
      const duplicates = newVaNummers.filter(
        (va) => va && existingVaNummers.has(va)
      ).length;
      const inserted = Math.max(0, (json.inserted ?? 0) - duplicates);

      setUploadResult({
        inserted,
        duplicates,
        message: `${inserted} nieuwe vechter${inserted !== 1 ? "s" : ""} toegevoegd${duplicates > 0 ? `, ${duplicates} dubbel${duplicates !== 1 ? "en" : ""} overgeslagen` : ""}.`,
      });

      setUploadFile(null);
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <main style={pageBackground}>
      <div style={topShell}>
        <div style={topLogoWrap}>
          <Image
            src="/branding/fightsupport/excel-logo.png"
            alt="FightSupport"
            width={560}
            height={140}
            priority
            style={{ height: "auto", width: "100%", maxWidth: 560 }}
          />
        </div>

        <div style={portalBand}>
          <div style={portalTitle}>MATCH PORTAAL</div>
          <div style={portalSub}>INSCHRIJVINGEN EN MATCHEN</div>
        </div>

        <div style={headerActionRow}>
          <HeaderButton
            onClick={() => router.push("/dashboard/matchmaker/matchmaking")}
          >
            <ArrowLeft size={16} style={{ marginRight: 8 }} />
            Overzicht
          </HeaderButton>

          <HeaderButton onClick={() => void load()}>
            <RefreshCcw size={16} style={{ marginRight: 8 }} />
            Ververs
          </HeaderButton>
        </div>
      </div>

      <div style={contentWrap}>
        <div style={titleCard}>
          <div style={titleMain}>Matchmaking bouwen</div>
          <div style={titleSub}>
            Kies eerst de rode hoek en klik daarna bij de volgende vechter op match
          </div>
          <div style={metaRow}>
            <span>
              <strong>Evenement:</strong> {matchmaking?.naam ?? "-"}
            </span>
            <span>
              <strong>Datum:</strong> {formatDate(matchmaking?.datum)}
            </span>
            <span>
              <strong>Locatie:</strong> {matchmaking?.locatie ?? "-"}
            </span>
            <span>
              <strong>Bondteam:</strong> {matchmaking?.bondteam ?? "-"}
            </span>
          </div>
        </div>

        <div style={actionGrid}>
          <ActionCard
            title="Upload"
            text="Voeg extra vechters toe via Excel (meerdere uploads mogelijk)"
            icon={<Upload size={34} />}
            onClick={() => {
              setUploadResult(null);
              setUploadFile(null);
              setShowUploadModal(true);
            }}
          />

          <ActionCard
            title="Handmatig toevoegen"
            text="Voeg een losse vechter toe"
            icon={<UserPlus size={34} />}
            onClick={() => setShowManualModal(true)}
          />

          <ActionCard
            title="Autocheck vechters"
            text="Stuur de volledige lijst naar Fightpaspoort"
            icon={<Radar size={34} />}
            onClick={() => void scrapeAll()}
            disabled={scrapeBusy || !matchmakingId}
          />

          <ActionCard
            title="Autocheck selectie"
            text={`Autocheck alleen geselecteerde vechters (${selectedIds.length})`}
            icon={<Users size={34} />}
            onClick={() => void scrapeSelected()}
            disabled={scrapeBusy || !selectedIds.length || !matchmakingId}
          />
        </div>

        <div style={filterCard}>
          <div style={filterTopRow}>
            <div>
              <div style={sectionTitle}>Tabs en filters</div>
              <div style={sectionSub}>
                Discipline en klasse staan nu in vaste tabbalken
              </div>
            </div>
            <div style={selectedCount}>
              {selectedIds.length} geselecteerd
              {selectedRed ? (
                <span style={{ marginLeft: 14, color: "#ffd9c8" }}>
                  · rood: <strong>{toName(selectedRed)}</strong>
                </span>
              ) : null}
            </div>
          </div>

          <div style={filterGrid}>
            <div style={fieldWrapWide}>
              <label style={labelStyle}>Zoeken</label>
              <div style={searchInputWrap}>
                <Search size={16} style={{ color: "#6b7280" }} />
                <input
                  style={textInputBare}
                  placeholder="Zoek naam, gym, VA, discipline of klasse"
                  value={filter.query}
                  onChange={(e) =>
                    setFilter((s) => ({ ...s, query: e.target.value }))
                  }
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
                Selectie wissen
              </button>
              <button style={tinyButton} onClick={resetMatchChoice}>
                Rood wissen
              </button>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={tabLabel}>Discipline</div>
            <div style={tabRail}>
              {disciplineTabs.length === 0 ? (
                <div style={sectionSub}>Geen disciplines gevonden.</div>
              ) : (
                disciplineTabs.map((tab) => (
                  <button
                    key={tab}
                    style={{
                      ...tabBtn,
                      ...(activeDiscipline === tab ? activeTabBtn : {}),
                    }}
                    onClick={() => setActiveDiscipline(tab)}
                  >
                    {tab}
                  </button>
                ))
              )}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={tabLabel}>Klasse</div>
            <div style={tabRail}>
              {klasseTabs.length === 0 ? (
                <div style={sectionSub}>Geen klasses gevonden.</div>
              ) : (
                klasseTabs.map((tab) => (
                  <button
                    key={tab}
                    style={{
                      ...subTabBtn,
                      ...(activeKlasse === tab ? activeSubTabBtn : {}),
                    }}
                    onClick={() => setActiveKlasse(tab)}
                  >
                    {klasseDisplayLabel(tab)}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={fighterTableCard}>
          <div style={tableTitleRow}>
            <div>
              <div style={sectionTitle}>Vechterslijst</div>
              <div style={sectionSub}>
                Tab: {activeDiscipline || "-"} / {klasseDisplayLabel(activeKlasse || "-")}
              </div>
            </div>
          </div>

          {Object.keys(groupedVisibleFighters).length === 0 ? (
            <div style={emptyStateCard}>
              Geen vechters gevonden in deze discipline/klasse.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 18 }}>
              {["Vrouwelijk", "Mannelijk", "Onbekend"]
                .filter((gender) => (groupedVisibleFighters[gender] ?? []).length > 0)
                .map((gender) => {
                  const rows = groupedVisibleFighters[gender] ?? [];

                  return (
                    <div key={gender} style={genderBlock}>
                      <div style={genderDivider}>
                        <div style={genderDividerLine} />
                        <span style={genderDividerLabel}>{gender}</span>
                        <div style={genderDividerLine} />
                      </div>

                      <div style={tableWrap}>
                        <table style={tableStyle}>
                          <thead>
                            <tr>
                              <th style={thStyle}>Sel</th>
                              <th style={thStyle}>Naam</th>
                              <th style={thStyle}>Leeftijd</th>
                              <th style={thStyle}>Gewicht</th>
                              <th style={thStyle}>Record</th>
                              <th style={thStyle}>Partijen</th>
                              <th style={thStyle}>Gym</th>
                              <th style={thStyle}>VA</th>
                              <th style={thStyle}>Scrape</th>
                              <th style={thStyle}>Detail</th>
                              <th style={thStyle}>Actie</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((f, i) => {
                              const selected = selectedIds.includes(String(f.id));
                              const age = calcAgeOnDate(
                                f.geboortedatum ??
                                  f.geboortedatum_input ??
                                  f.fp_geboortedatum ??
                                  null,
                                matchmaking?.datum ?? null
                              );
                              const isRed = selectedRed?.id === f.id;

                              return (
                                <tr
                                  key={String(f.id)}
                                  style={{
                                    background: isRed
                                      ? "linear-gradient(180deg, rgba(255,77,0,0.22) 0%, rgba(255,77,0,0.08) 100%)"
                                      : i % 2 === 0
                                      ? "#fff"
                                      : "#0d0d0d",
                                    color: isRed ? "#fff" : i % 2 === 0 ? "#111" : "#fff",
                                    outline: isRed
                                      ? "2px solid rgba(255,77,0,0.75)"
                                      : "none",
                                  }}
                                >
                                  <td style={tdStyle}>
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={() => toggleSelected(String(f.id))}
                                    />
                                  </td>
                                  <td style={tdStyleStrong}>
                                    <div style={{ display: "grid", gap: 4 }}>
                                      <span>{toName(f)}</span>
                                      <span style={subCellText}>
                                        {f.discipline ?? "-"} · {f.klasse ?? "-"}
                                      </span>
                                    </div>
                                  </td>
                                  <td style={tdStyle}>{age ?? "-"}</td>
                                  <td style={tdStyle}>{formatWeight(f.gewicht)}</td>
                                  <td style={tdStyle}>{getRecordText(f)}</td>
                                  <td style={tdStyle}>{getTotalFights(f)}</td>
                                  <td style={tdStyle}>
                                    {f.gym_input ?? f.fp_gym ?? f.gym ?? "-"}
                                  </td>
                                  <td style={tdStyle}>{f.va_nummer ?? "-"}</td>
                                  <td style={tdStyle}>{f.scrape_status ?? "-"}</td>
                                  <td style={tdStyle}>
                                    <Link
                                      href={`/dashboard/matchmaker/matchmaking/${matchmakingId}/fighter/${f.id}`}
                                      style={detailLink}
                                    >
                                      <Link2 size={14} style={{ marginRight: 6 }} />
                                      Detail
                                    </Link>
                                  </td>
                                  <td style={tdStyle}>
                                    <button
                                      style={{
                                        ...matchPickButton,
                                        ...(isRed ? activePickButton : {}),
                                      }}
                                      onClick={() => handleMatchClick(f)}
                                    >
                                      <Swords size={14} style={{ marginRight: 6 }} />
                                      {isRed ? "Rood gekozen" : selectedRed ? "Match" : "Kies rood"}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div style={selectionSummaryGrid}>
          <div style={selectionCard}>
            <div style={{ ...sectionTitle, color: NVB_ORANGE }}>Rode hoek</div>
            {!selectedRed ? (
              <div style={sectionSub}>Nog geen rode hoek gekozen.</div>
            ) : (
              <SelectionBlock fighter={selectedRed} eventDate={matchmaking?.datum ?? null} />
            )}
          </div>

          <div style={selectionCard}>
            <div style={{ ...sectionTitle, color: "#f1f5f9" }}>Tegenstander</div>
            {!selectedBlue ? (
              <div style={sectionSub}>Klik daarna bij een tweede vechter op match.</div>
            ) : (
              <SelectionBlock fighter={selectedBlue} eventDate={matchmaking?.datum ?? null} />
            )}
          </div>
        </div>
      </div>

      {showCompareModal && compareSummary ? (
        <div style={modalBackdrop} onClick={() => setShowCompareModal(false)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <div style={sectionTitle}>Verschillen vergelijken</div>
                <div style={sectionSub}>
                  Controleer deze partij voordat je opslaat
                </div>
              </div>
              <button
                style={closeBtn}
                onClick={() => setShowCompareModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={compareHeaderRow}>
              <div />
              <div style={compareFighterHeader}>Rood</div>
              <div style={compareFighterHeader}>Blauw</div>
            </div>

            <div style={compareTable}>
              <CompareRow label="Naam" left={compareSummary.rood} right={compareSummary.blauw} />
              <CompareRow
                label="Geslacht"
                left={selectedRed?.geslacht ?? "-"}
                right={selectedBlue?.geslacht ?? "-"}
              />
              <CompareRow
                label="Discipline"
                left={selectedRed?.discipline ?? "-"}
                right={selectedBlue?.discipline ?? "-"}
              />
              <CompareRow
                label="Klasse"
                left={selectedRed?.klasse ?? "-"}
                right={selectedBlue?.klasse ?? "-"}
              />
              <CompareRow
                label="Leeftijd"
                left={String(compareSummary.roodLeeftijd)}
                right={String(compareSummary.blauwLeeftijd)}
              />
              {compareSummary.isJeugd ? (
                <CompareRow
                  label="Leeftijdsverschil"
                  left={`${compareSummary.leeftijdDiff} jaar`}
                  right=""
                />
              ) : null}
              <CompareRow
                label="Gewicht"
                left={formatWeight(selectedRed?.gewicht)}
                right={formatWeight(selectedBlue?.gewicht)}
              />
              <CompareRow
                label="Gewichtsverschil"
                left={`${compareSummary.gewichtDiff} kg`}
                right=""
              />
              <CompareRow
                label="Record"
                left={compareSummary.roodRecord}
                right={compareSummary.blauwRecord}
              />
              <CompareRow
                label="Aantal partijen"
                left={String(compareSummary.roodPartijen)}
                right={String(compareSummary.blauwPartijen)}
              />
              <CompareRow
                label="Gym"
                left={compareSummary.roodGym}
                right={compareSummary.blauwGym}
              />
              <CompareRow
                label="VA"
                left={compareSummary.roodVA}
                right={compareSummary.blauwVA}
              />
            </div>

            <div style={modalActionRow}>
              <button
                style={secondaryButton}
                onClick={() => setShowCompareModal(false)}
              >
                Terug
              </button>
              <button
                style={primaryButton}
                disabled={!matchmakingId || busy}
                onClick={() => void saveMatch()}
              >
                <Save size={16} style={{ marginRight: 8 }} />
                {busy ? "Opslaan..." : "Match opslaan"}
              </button>
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
                onChange={(v) =>
                  setManualForm((s) => ({ ...s, achternaam: v }))
                }
              />
              <ManualInput
                label="Geslacht"
                value={manualForm.geslacht}
                onChange={(v) => setManualForm((s) => ({ ...s, geslacht: v }))}
              />
              <ManualInput
                label="Discipline"
                value={manualForm.discipline}
                onChange={(v) =>
                  setManualForm((s) => ({ ...s, discipline: v }))
                }
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
                onChange={(v) =>
                  setManualForm((s) => ({ ...s, va_nummer: v }))
                }
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
        <div style={modalBackdrop} onClick={() => !uploadBusy && setShowUploadModal(false)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <div style={sectionTitle}>Vechters uploaden</div>
                <div style={sectionSub}>
                  Upload een Excel bestand met nieuwe vechters. Meerdere uploads zijn mogelijk.
                </div>
              </div>
              <button
                style={closeBtn}
                onClick={() => !uploadBusy && setShowUploadModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
                  Excel bestand (.xlsx, .xls)
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: 6,
                    color: "#e2e8f0",
                    fontSize: 13,
                  }}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setUploadFile(f);
                    setUploadResult(null);
                  }}
                />
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                  1 vechter per rij · Kolommen: naam, discipline, klasse, VA nummer, gewicht, gym
                </div>
              </div>

              {uploadResult && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 6,
                    background: uploadResult.duplicates > 0
                      ? "rgba(234,179,8,0.15)"
                      : "rgba(34,197,94,0.15)",
                    border: uploadResult.duplicates > 0
                      ? "1px solid rgba(234,179,8,0.4)"
                      : "1px solid rgba(34,197,94,0.4)",
                    color: uploadResult.duplicates > 0 ? "#fef08a" : "#86efac",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 12,
                  }}
                >
                  {uploadResult.message}
                </div>
              )}
            </div>

            <div style={modalActionRow}>
              <button
                style={secondaryButton}
                onClick={() => !uploadBusy && setShowUploadModal(false)}
                disabled={uploadBusy}
              >
                Sluiten
              </button>
              <button
                style={{
                  ...primaryButton,
                  opacity: !uploadFile || uploadBusy ? 0.55 : 1,
                  cursor: !uploadFile || uploadBusy ? "not-allowed" : "pointer",
                }}
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
    </main>
  );
}

function CompareRow({
  label,
  left,
  right,
}: {
  label: string;
  left: string;
  right: string;
}) {
  return (
    <div style={compareRow}>
      <div style={compareLabel}>{label}</div>
      <div style={compareValue}>{left || "-"}</div>
      <div style={compareValue}>{right || "-"}</div>
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

function SelectionBlock({
  fighter,
  eventDate,
}: {
  fighter: FighterRow;
  eventDate: string | null;
}) {
  const age = calcAgeOnDate(
    fighter.geboortedatum ??
      fighter.geboortedatum_input ??
      fighter.fp_geboortedatum ??
      null,
    eventDate
  );

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div>
        <strong>Naam:</strong> {toName(fighter)}
      </div>
      <div>
        <strong>Geslacht:</strong> {fighter.geslacht ?? "-"}
      </div>
      <div>
        <strong>Discipline:</strong> {fighter.discipline ?? "-"}
      </div>
      <div>
        <strong>Klasse:</strong> {fighter.klasse ?? "-"}
      </div>
      <div>
        <strong>Leeftijd:</strong> {age ?? "-"}
      </div>
      <div>
        <strong>Gewicht:</strong> {formatWeight(fighter.gewicht)}
      </div>
      <div>
        <strong>Record:</strong> {getRecordText(fighter)}
      </div>
      <div>
        <strong>Aantal partijen:</strong> {getTotalFights(fighter)}
      </div>
      <div>
        <strong>Gym:</strong> {fighter.gym_input ?? fighter.fp_gym ?? fighter.gym ?? "-"}
      </div>
      <div>
        <strong>VA:</strong> {fighter.va_nummer ?? "-"}
      </div>
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
        ...portalCard,
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div style={iconBox}>{icon}</div>
      <div style={{ flex: 1, textAlign: "left" }}>
        <div style={portalCardTitle}>{title}</div>
        <div style={portalCardText}>{text}</div>
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
  paddingBottom: 18,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg, rgba(255,77,0,0.10) 0%, rgba(0,0,0,0) 55%)",
};

const topLogoWrap: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  paddingTop: 8,
};

const portalBand: CSSProperties = {
  marginTop: 6,
  background:
    "linear-gradient(180deg, rgba(22,28,40,0.95) 0%, rgba(6,10,16,0.95) 100%)",
  borderTop: "1px solid rgba(255,255,255,0.15)",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  textAlign: "center",
  padding: "10px 16px 14px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
};

const portalTitle: CSSProperties = {
  fontSize: 44,
  fontWeight: 900,
  lineHeight: 1,
  letterSpacing: "0.03em",
  color: "#efefef",
  textShadow: "0 2px 10px rgba(0,0,0,0.55)",
};

const portalSub: CSSProperties = {
  marginTop: 6,
  fontSize: 14,
  letterSpacing: "0.28em",
  color: NVB_ORANGE,
};

const headerActionRow: CSSProperties = {
  maxWidth: 1500,
  margin: "12px auto 0",
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  padding: "0 20px",
};

const silverButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 18px",
  border: "1px solid rgba(0,0,0,0.35)",
  background:
    "linear-gradient(180deg,#ffffff 0%,#dedede 38%,#b8b8b8 50%,#f7f7f7 100%)",
  color: "#111",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 18px rgba(0,0,0,0.25)",
};

const contentWrap: CSSProperties = {
  maxWidth: 1700,
  margin: "0 auto",
  padding: 18,
  display: "grid",
  gap: 18,
};

const titleCard: CSSProperties = {
  border: "2px solid rgba(255,255,255,0.20)",
  background:
    "linear-gradient(180deg, rgba(10,14,20,0.98) 0%, rgba(2,5,9,0.98) 100%)",
  padding: 18,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
};

const titleMain: CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: "#fff",
};

const titleSub: CSSProperties = {
  marginTop: 4,
  fontSize: 14,
  color: "#c9d1db",
};

const metaRow: CSSProperties = {
  marginTop: 10,
  display: "flex",
  flexWrap: "wrap",
  gap: 18,
  fontSize: 13,
  color: "#d9d9d9",
};

const actionGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
};

const portalCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: 16,
  border: "6px solid rgba(230,230,230,0.9)",
  background:
    "linear-gradient(180deg, rgba(16,19,26,0.98) 0%, rgba(5,8,13,0.98) 100%)",
  boxShadow:
    "inset 0 0 0 2px rgba(255,255,255,0.30), 0 14px 28px rgba(0,0,0,0.35)",
};

const iconBox: CSSProperties = {
  width: 96,
  height: 96,
  display: "grid",
  placeItems: "center",
  color: "#fff",
  background:
    "linear-gradient(180deg, #ff680f 0%, #ff4d00 55%, #cc3f00 100%)",
  boxShadow: "0 10px 24px rgba(255,77,0,0.22)",
  flexShrink: 0,
};

const portalCardTitle: CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  color: "#efefef",
};

const portalCardText: CSSProperties = {
  marginTop: 8,
  fontSize: 14,
  color: "#d0d6df",
};

const filterCard: CSSProperties = {
  border: "2px solid rgba(255,255,255,0.20)",
  background:
    "linear-gradient(180deg, rgba(10,14,20,0.98) 0%, rgba(2,5,9,0.98) 100%)",
  padding: 18,
};

const filterTopRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14,
};

const selectedCount: CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#d8d8d8",
};

const sectionTitle: CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  color: "#fff",
};

const sectionSub: CSSProperties = {
  marginTop: 4,
  fontSize: 14,
  color: "#aeb8c5",
};

const filterGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr auto auto",
  gap: 12,
  alignItems: "end",
};

const filterActionArea: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const fieldWrapWide: CSSProperties = {
  display: "grid",
  gap: 6,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#c4ccd7",
};

const inputStyle: CSSProperties = {
  height: 46,
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
  height: 46,
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
  minHeight: 46,
  fontSize: 14,
  color: "#d6dbe2",
};

const tabLabel: CSSProperties = {
  marginBottom: 8,
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#d6dee8",
};

const tabRail: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  padding: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
};

const tabBtn: CSSProperties = {
  minHeight: 52,
  padding: "0 18px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "linear-gradient(180deg, rgba(17,24,39,0.9) 0%, rgba(8,12,18,0.9) 100%)",
  color: "#fff",
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};

const activeTabBtn: CSSProperties = {
  background: "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)",
  color: "#fff",
  border: "1px solid rgba(255,77,0,0.8)",
  boxShadow: "0 10px 22px rgba(255,77,0,0.24)",
};

const subTabBtn: CSSProperties = {
  minHeight: 46,
  padding: "0 18px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "linear-gradient(180deg, rgba(8,14,22,0.95) 0%, rgba(4,8,13,0.95) 100%)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};

const activeSubTabBtn: CSSProperties = {
  background: "linear-gradient(180deg, #5b6678 0%, #374151 100%)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.30)",
  boxShadow: "0 8px 18px rgba(148,163,184,0.18)",
};

const fighterTableCard: CSSProperties = {
  border: "2px solid rgba(255,255,255,0.20)",
  background:
    "linear-gradient(180deg, rgba(10,14,20,0.98) 0%, rgba(2,5,9,0.98) 100%)",
  padding: 18,
};

const tableTitleRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 14,
};

const tinyButton: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 700,
};

const emptyStateCard: CSSProperties = {
  padding: 24,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
  color: "#cbd5e1",
};

const genderBlock: CSSProperties = {
  display: "grid",
  gap: 12,
};

const genderDivider: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const genderDividerLine: CSSProperties = {
  flex: 1,
  height: 1,
  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)",
};

const genderDividerLabel: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 34,
  padding: "0 14px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontWeight: 900,
  letterSpacing: "0.05em",
};

const tableWrap: CSSProperties = {
  overflowX: "auto",
  border: "2px solid rgba(255,255,255,0.18)",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: CSSProperties = {
  background: "linear-gradient(180deg, #ff6a00 0%, #ff5400 100%)",
  color: "#fff",
  padding: "12px 10px",
  textAlign: "left",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "10px",
  borderTop: "1px solid rgba(0,0,0,0.08)",
  whiteSpace: "nowrap",
};

const tdStyleStrong: CSSProperties = {
  ...tdStyle,
  fontWeight: 800,
};

const subCellText: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  opacity: 0.82,
};

const detailLink: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  color: "#111",
  textDecoration: "none",
  fontWeight: 800,
  background: "#ececec",
  padding: "7px 10px",
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
};

const activePickButton: CSSProperties = {
  background: "linear-gradient(180deg,#ff8b45 0%,#ff4d00 100%)",
  color: "#fff",
};

const selectionSummaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const selectionCard: CSSProperties = {
  border: "2px solid rgba(255,255,255,0.20)",
  background:
    "linear-gradient(180deg, rgba(10,14,20,0.98) 0%, rgba(2,5,9,0.98) 100%)",
  padding: 18,
};

const modalBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.62)",
  display: "grid",
  placeItems: "center",
  zIndex: 1000,
  padding: 20,
};

const modalCard: CSSProperties = {
  width: "100%",
  maxWidth: 920,
  border: "3px solid rgba(255,255,255,0.20)",
  background:
    "linear-gradient(180deg, rgba(16,19,26,0.99) 0%, rgba(5,8,13,0.99) 100%)",
  padding: 18,
  boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
};

const modalCardLarge: CSSProperties = {
  ...modalCard,
  maxWidth: 1100,
};

const modalHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 16,
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

const compareTable: CSSProperties = {
  display: "grid",
  gap: 8,
};

const compareRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "180px 1fr 1fr",
  gap: 10,
  alignItems: "center",
};

const compareLabel: CSSProperties = {
  fontWeight: 900,
  color: "#fff",
};

const compareValue: CSSProperties = {
  minHeight: 42,
  display: "flex",
  alignItems: "center",
  padding: "0 12px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#e5e7eb",
};

const primaryButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 14px",
  border: "1px solid rgba(255,77,0,0.55)",
  background:
    "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 14px",
  border: "1px solid rgba(255,255,255,0.20)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
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