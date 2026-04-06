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
  X,
  Link2,
  Swords,
  ChevronDown,
  ChevronUp,
  Layers3,
  Clock3,
  AlertTriangle,
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
    raw: row.raw ?? null,
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

function geslachtKlasseTabLabel(
  klasse?: string | null,
  geslacht?: string | null
) {
  const k = String(klasse ?? "").trim().toLowerCase();
  const g = normalizeGender(geslacht);

  if (k.includes("jeugd")) {
    if (g === "Vrouw") return "Meisje / jeugd";
    if (g === "Man") return "Jongen / jeugd";
    return "Onbekend / jeugd";
  }

  const prefix =
    k === "a" || k.startsWith("a ") || k.includes("a-klasse")
      ? "A"
      : k === "b" || k.startsWith("b ") || k.includes("b-klasse")
      ? "B"
      : k === "c" || k.startsWith("c ") || k.includes("c-klasse")
      ? "C"
      : k === "n" || k.startsWith("n ") || k.includes("n-klasse")
      ? "N"
      : klasse || "Overig";

  if (g === "Vrouw") return `${prefix} dame`;
  if (g === "Man") return `${prefix} heer`;
  return `${prefix} onbekend`;
}

function tabRank(label: string) {
  const v = label.trim().toLowerCase();

  if (v === "jongen / jeugd") return 0;
  if (v === "meisje / jeugd") return 1;
  if (v === "n heer") return 10;
  if (v === "n dame") return 11;
  if (v === "c heer") return 20;
  if (v === "c dame") return 21;
  if (v === "b heer") return 30;
  if (v === "b dame") return 31;
  if (v === "a heer") return 40;
  if (v === "a dame") return 41;
  return 999;
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
  const [toolsCollapsed, setToolsCollapsed] = useState(true);

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
  const [activeUploadView, setActiveUploadView] = useState<"all" | "latest">("all");

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

    if (
      !fighterContextQuery.error &&
      (fighterContextQuery.data ?? []).length > 0
    ) {
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

  const uploadGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        uploadId: string;
        rows: FighterRow[];
        maxRowNr: number;
      }
    >();

    for (const fighter of fighters) {
      const uploadId = String(fighter.upload_id ?? "").trim();
      if (!uploadId) continue;

      const existing = map.get(uploadId);
      const rowNr = fighter.row_nr ?? 0;

      if (!existing) {
        map.set(uploadId, {
          uploadId,
          rows: [fighter],
          maxRowNr: rowNr,
        });
      } else {
        existing.rows.push(fighter);
        if (rowNr > existing.maxRowNr) existing.maxRowNr = rowNr;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.maxRowNr - a.maxRowNr);
  }, [fighters]);

  const latestUploadId = useMemo(() => {
    return uploadGroups[0]?.uploadId ?? null;
  }, [uploadGroups]);

  const latestUploadCount = useMemo(() => {
    return uploadGroups[0]?.rows.length ?? 0;
  }, [uploadGroups]);

  const sourceFilteredFighters = useMemo(() => {
    if (activeUploadView === "latest" && latestUploadId) {
      return fighters.filter(
        (f) => String(f.upload_id ?? "").trim() === String(latestUploadId).trim()
      );
    }
    if (activeUploadView === "latest" && !latestUploadId) {
      return [];
    }
    return fighters;
  }, [fighters, activeUploadView, latestUploadId]);

  const baseFiltered = useMemo(() => {
    const q = filter.query.trim().toLowerCase();

    return sourceFilteredFighters
      .filter((f) => !filter.onlyUnmatched || !fighterIsMatched(f, matchedIds))
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
          f.email,
          f.telefoon,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
  }, [sourceFilteredFighters, filter, matchedIds]);

  const disciplineTabs = useMemo(() => {
    return Array.from(
      new Set(
        baseFiltered
          .map((f) => String(f.discipline ?? "").trim())
          .filter(Boolean)
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
          .map((f) => geslachtKlasseTabLabel(f.klasse, f.geslacht))
          .filter(Boolean)
      )
    );

    return values.sort(
      (a, b) => tabRank(a) - tabRank(b) || a.localeCompare(b, "nl")
    );
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
        ? geslachtKlasseTabLabel(f.klasse, f.geslacht) === activeKlasse
        : true;

      return disciplineOk && klasseOk;
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
  }, [baseFiltered, activeDiscipline, activeKlasse, matchmaking?.datum]);

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
      "discipline",
      "Discipline",
      selectedRed.discipline ?? "-",
      selectedBlue.discipline ?? "-"
    );

    addDiff(
      "klasse",
      "Klasse",
      selectedRed.klasse ?? "-",
      selectedBlue.klasse ?? "-"
    );

    addDiff(
      "geslacht",
      "Geslacht",
      normalizeGender(selectedRed.geslacht),
      normalizeGender(selectedBlue.geslacht),
      normalizeGender(selectedRed.geslacht) !== normalizeGender(selectedBlue.geslacht)
        ? "red"
        : "default"
    );

    addDiff(
      "sportschool",
      "Sportschool",
      selectedRed.gym_input || selectedRed.fp_gym || selectedRed.gym || "-",
      selectedBlue.gym_input || selectedBlue.fp_gym || selectedBlue.gym || "-"
    );

    addDiff(
      "gewicht",
      "Gewicht",
      formatWeight(redWeight),
      formatWeight(blueWeight),
      redWeight != null && blueWeight != null && redWeight !== blueWeight ? "orange" : "default"
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

      differences.push({
        key: "leeftijdsverschil",
        label: "Leeftijdsverschil",
        left: ageDiffExact.text,
        right:
          ageRule.status === "verbod"
            ? "VERBOD"
            : ageRule.status === "dispensatie"
            ? "DISPENSATIE AANVRAGEN"
            : "OK",
        tone:
          ageRule.status === "verbod"
            ? "red"
            : ageRule.status === "dispensatie"
            ? "orange"
            : "default",
      });
    }

    return {
      redName: toName(selectedRed),
      blueName: toName(selectedBlue),
      differences,
      ageRule,
      saveBlocked: ageRule?.status === "verbod",
    };
  }, [selectedRed, selectedBlue]);

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
      resetMatchChoice();
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

  async function scrapeLatestUpload() {
    try {
      if (!matchmakingId) return;

      const latestRows = fighters.filter(
        (f) => String(f.upload_id ?? "").trim() === String(latestUploadId ?? "").trim()
      );

      if (!latestRows.length) {
        alert("Geen nieuwste upload gevonden.");
        return;
      }

      setScrapeBusy(true);

      const fighterContextIds = latestRows
        .filter((f) => f.source === "fighter_context")
        .map((f) => f.id);

      const inschrijvingIds = latestRows
        .map((f) => String(f.inschrijving_id ?? f.id ?? "").trim())
        .filter(Boolean);

      const fighterIds = latestRows
        .map((f) => String(f.id).trim())
        .filter(Boolean);

      const res = await authedFetch(`/api/matchmaker/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          mode: "selected",
          fighter_ids: fighterIds,
          fighter_context_ids: fighterContextIds,
          inschrijving_ids: inschrijvingIds,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        alert(json?.error ?? "Autocheck nieuwste upload mislukt");
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
      alert("Deze twee vechters mogen niet dezelfde zijn.");
      return;
    }

    if (compareData?.saveBlocked) {
      alert("Deze partij mag niet opgeslagen worden: leeftijdsverschil is 24 maanden of meer.");
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

        rood_inschrijving_id:
          selectedRed.inschrijving_id ?? null,
        blauw_inschrijving_id:
          selectedBlue.inschrijving_id ?? null,
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

      const existingVaNummers = new Set(
        fighters
          .map((f) => String(f.va_nummer ?? "").trim().toLowerCase())
          .filter(Boolean)
      );

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("matchmaking_id", matchmakingId);
      formData.append("uploaded_by", user.id);

      const token =
        (await supabase.auth.getSession()).data.session?.access_token ?? "";

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

      await load();
      setActiveUploadView("latest");
      setToolsCollapsed(true);

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
        message: `${inserted} nieuwe vechter${
          inserted !== 1 ? "s" : ""
        } toegevoegd${
          duplicates > 0
            ? `, ${duplicates} dubbel${duplicates !== 1 ? "en" : ""} overgeslagen`
            : ""
        }.`,
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
            width={250}
            height={100}
            priority
            style={{ height: "auto", width: "100%", maxWidth: 250 }}
          />
        </div>

        <div style={portalBand}>
          <div style={portalTitle}>MATCH PORTAAL</div>
          <div style={portalSub}>SNEL MATCHEN</div>
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
        <div style={titleCardCompact}>
          <div style={titleTopRow}>
            <div>
              <div style={titleMain}>Matchen</div>
              <div style={titleSubCompact}>
                Kies een vechter, klik daarna op de tweede vechter en controleer alleen de verschillen.
              </div>
            </div>

            <button
              type="button"
              style={collapseToggle}
              onClick={() => setToolsCollapsed((v) => !v)}
            >
              {toolsCollapsed ? (
                <>
                  <ChevronDown size={16} style={{ marginRight: 8 }} />
                  Werkbalk openen
                </>
              ) : (
                <>
                  <ChevronUp size={16} style={{ marginRight: 8 }} />
                  Werkbalk inklappen
                </>
              )}
            </button>
          </div>

          <div style={metaRowCompact}>
            <span>
              <strong>Event:</strong> {matchmaking?.naam ?? "-"}
            </span>
            <span>
              <strong>Datum:</strong> {formatDate(matchmaking?.datum)}
            </span>
            <span>
              <strong>Bondteam:</strong> {matchmaking?.bondteam ?? "-"}
            </span>
            <span>
              <strong>Locatie:</strong> {matchmaking?.locatie ?? "-"}
            </span>
            <span>
              <strong>Uploads:</strong> {uploadGroups.length}
            </span>
            <span>
              <strong>Nieuwste upload:</strong>{" "}
              {latestUploadCount ? `${latestUploadCount} vechters` : "-"}
            </span>
            <span>
              <strong>Bestaande partijen:</strong> {matches.length}
            </span>
          </div>
        </div>

        {!toolsCollapsed ? (
          <>
            <div style={actionGridCompact}>
              <ActionCard
                title="Upload"
                text="Excel"
                icon={<Upload size={24} />}
                onClick={() => {
                  setUploadResult(null);
                  setUploadFile(null);
                  setShowUploadModal(true);
                }}
              />

              <ActionCard
                title="Handmatig"
                text="Losse vechter"
                icon={<UserPlus size={24} />}
                onClick={() => setShowManualModal(true)}
              />

              <ActionCard
                title="Autocheck alles"
                text="Fightpaspoort"
                icon={<Radar size={24} />}
                onClick={() => void scrapeAll()}
                disabled={scrapeBusy || !matchmakingId}
              />

              <ActionCard
                title="Autocheck laatste upload"
                text={
                  latestUploadCount
                    ? `${latestUploadCount} vechters`
                    : "Geen upload"
                }
                icon={<Clock3 size={24} />}
                onClick={() => void scrapeLatestUpload()}
                disabled={scrapeBusy || !latestUploadId || !matchmakingId}
              />
            </div>

            <div style={filterCardCompact}>
              <div style={filterTopRowCompact}>
                <div>
                  <div style={sectionTitle}>Filters</div>
                  <div style={sectionSub}>Zoek en kies snel de juiste groep.</div>
                </div>

                <div style={selectedCount}>
                  {selectedIds.length} geselecteerd
                  {selectedRed ? (
                    <span style={{ marginLeft: 10, color: "#ffd8c7" }}>
                      · gekozen: <strong>{toName(selectedRed)}</strong>
                    </span>
                  ) : null}
                </div>
              </div>

              <div style={uploadTabsWrap}>
                <button
                  type="button"
                  style={{
                    ...uploadViewTab,
                    ...(activeUploadView === "all" ? activeUploadViewTab : {}),
                  }}
                  onClick={() => setActiveUploadView("all")}
                >
                  <Layers3 size={15} style={{ marginRight: 8 }} />
                  Alle vechters
                </button>

                <button
                  type="button"
                  style={{
                    ...uploadViewTab,
                    ...(activeUploadView === "latest" ? activeUploadViewTab : {}),
                  }}
                  onClick={() => setActiveUploadView("latest")}
                >
                  <Clock3 size={15} style={{ marginRight: 8 }} />
                  Nieuwste upload
                  <span style={uploadCountBadge}>{latestUploadCount}</span>
                </button>
              </div>

              <div style={filterGridCompact}>
                <div style={fieldWrapWide}>
                  <label style={labelStyle}>Zoeken</label>
                  <div style={searchInputWrap}>
                    <Search size={16} style={{ color: "#6b7280" }} />
                    <input
                      style={textInputBare}
                      placeholder="Naam, gym, VA, discipline of klasse"
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
                    Keuze wissen
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={tabLabel}>Discipline</div>
                <div style={tabRailCompact}>
                  {disciplineTabs.length === 0 ? (
                    <div style={sectionSub}>Geen disciplines gevonden.</div>
                  ) : (
                    disciplineTabs.map((tab) => (
                      <button
                        key={tab}
                        style={{
                          ...tabBtnCompact,
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

              <div style={{ marginTop: 12 }}>
                <div style={tabLabel}>Klasse / geslacht</div>
                <div style={tabRailCompact}>
                  {klasseTabs.length === 0 ? (
                    <div style={sectionSub}>Geen klasses gevonden.</div>
                  ) : (
                    klasseTabs.map((tab) => (
                      <button
                        key={tab}
                        style={{
                          ...subTabBtnCompact,
                          ...(activeKlasse === tab ? activeSubTabBtn : {}),
                        }}
                        onClick={() => setActiveKlasse(tab)}
                      >
                        {tab}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}

        <div style={fighterTableCard}>
          {visibleFighters.length === 0 ? (
            <div style={emptyStateCard}>
              Geen vechters gevonden in deze selectie.
            </div>
          ) : (
            <div style={tableWrap}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Sel</th>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Discipline</th>
                    <th style={thStyle}>Klasse</th>
                    <th style={thStyle}>Geslacht</th>
                    <th style={thStyle}>Naam vechter</th>
                    <th style={thStyle}>Sportschool</th>
                    <th style={thStyle}>Totaal aantal partijen</th>
                    <th style={thStyle}>Leeftijd</th>
                    <th style={thStyle}>Gewicht</th>
                    <th style={thStyle}>Detail</th>
                    <th style={thStyle}>Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFighters.map((f, i) => {
                    const selectionId = getStableSelectionId(f);
                    const selected = selectedIds.includes(selectionId);
                    const age = getFighterAge(f, matchmaking?.datum ?? null);
                    const isChosen =
                      selectedRed?.id === f.id || selectedBlue?.id === f.id;

                    const detailHref = getFighterDetailHref(matchmakingId, f);

                    return (
                      <tr
                        key={String(f.id)}
                        style={{
                          background: isChosen
                            ? "linear-gradient(180deg, rgba(255,77,0,0.22) 0%, rgba(255,77,0,0.08) 100%)"
                            : i % 2 === 0
                            ? "#ffffff"
                            : "#111827",
                          color: isChosen
                            ? "#fff"
                            : i % 2 === 0
                            ? "#111"
                            : "#fff",
                          outline: isChosen
                            ? "2px solid rgba(255,77,0,0.75)"
                            : "none",
                        }}
                      >
                        <td style={tdStyle}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelected(selectionId)}
                          />
                        </td>

                        <td style={tdStyleStrong}>#{f.row_nr ?? "-"}</td>
                        <td style={tdStyle}>{f.discipline ?? "-"}</td>
                        <td style={tdStyle}>{f.klasse ?? "-"}</td>
                        <td style={tdStyle}>{normalizeGender(f.geslacht)}</td>
                        <td style={tdStyleStrong}>{toName(f)}</td>
                        <td style={tdStyle}>
                          {f.gym_input ?? f.fp_gym ?? f.gym ?? "-"}
                        </td>
                        <td style={tdStyle}>{getDisplayTotalPartijenText(f)}</td>
                        <td style={tdStyle}>{age ?? "-"}</td>
                        <td style={tdStyle}>{formatWeight(f.gewicht)}</td>

                        <td style={tdStyle}>
                          <Link href={detailHref} style={detailLink}>
                            <Link2 size={14} style={{ marginRight: 6 }} />
                            Detail
                          </Link>
                        </td>

                        <td style={tdStyle}>
                          <button
                            style={{
                              ...matchPickButton,
                              ...(isChosen ? activePickButton : {}),
                            }}
                            onClick={() => handleMatchClick(f)}
                          >
                            <Swords size={14} style={{ marginRight: 6 }} />
                            {selectedRed?.id === f.id
                              ? "Gekozen"
                              : selectedBlue?.id === f.id
                              ? "Gekozen"
                              : selectedRed
                              ? "Match"
                              : "Kies vechter"}
                          </button>
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
                <div style={sectionTitle}>Verschillen</div>
                <div style={sectionSub}>
                  Alleen afwijkingen tussen beide vechters worden getoond.
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
                  title={
                    compareData.saveBlocked
                      ? "Opslaan geblokkeerd door verbod."
                      : undefined
                  }
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
              <div style={compareFighterHeader}>Vechter 1</div>
              <div style={compareFighterHeader}>Vechter 2</div>
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
        <div
          style={modalBackdrop}
          onClick={() => !uploadBusy && setShowUploadModal(false)}
        >
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <div style={sectionTitle}>Vechters uploaden</div>
                <div style={sectionSub}>
                  Upload een Excel bestand met nieuwe vechters.
                </div>
              </div>
              <button
                style={closeBtn}
                onClick={() => !uploadBusy && setShowUploadModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "16px 18px" }}>
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#e2e8f0",
                  }}
                >
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
                  1 vechter per rij · naam, discipline, klasse, VA, gewicht, gym
                </div>
              </div>

              {uploadResult && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 6,
                    background:
                      uploadResult.duplicates > 0
                        ? "rgba(234,179,8,0.15)"
                        : "rgba(34,197,94,0.15)",
                    border:
                      uploadResult.duplicates > 0
                        ? "1px solid rgba(234,179,8,0.4)"
                        : "1px solid rgba(34,197,94,0.4)",
                    color:
                      uploadResult.duplicates > 0 ? "#fef08a" : "#86efac",
                    fontSize: 13,
                    fontWeight: 700,
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
                  cursor:
                    !uploadFile || uploadBusy ? "not-allowed" : "pointer",
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
      <div style={{ ...rowTone }}>{left || "-"}</div>
      <div style={{ ...rowTone }}>{right || "-"}</div>
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
  paddingBottom: 10,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg, rgba(255,77,0,0.10) 0%, rgba(0,0,0,0) 55%)",
};

const topLogoWrap: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  paddingTop: 6,
};

const portalBand: CSSProperties = {
  marginTop: 4,
  background:
    "linear-gradient(180deg, rgba(22,28,40,0.95) 0%, rgba(6,10,16,0.95) 100%)",
  borderTop: "1px solid rgba(255,255,255,0.15)",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  textAlign: "center",
  padding: "8px 16px 10px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
};

const portalTitle: CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  lineHeight: 1,
  letterSpacing: "0.03em",
  color: "#efefef",
  textShadow: "0 2px 10px rgba(0,0,0,0.55)",
};

const portalSub: CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  letterSpacing: "0.24em",
  color: NVB_ORANGE,
};

const headerActionRow: CSSProperties = {
  maxWidth: 1500,
  margin: "8px auto 0",
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  padding: "0 16px",
};

const silverButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "0 14px",
  border: "1px solid rgba(0,0,0,0.35)",
  background:
    "linear-gradient(180deg,#ffffff 0%,#dedede 38%,#b8b8b8 50%,#f7f7f7 100%)",
  color: "#111",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 18px rgba(0,0,0,0.25)",
};

const contentWrap: CSSProperties = {
  maxWidth: 1700,
  margin: "0 auto",
  padding: 14,
  display: "grid",
  gap: 12,
};

const titleCardCompact: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.18)",
  background:
    "linear-gradient(180deg, rgba(10,14,20,0.98) 0%, rgba(2,5,9,0.98) 100%)",
  padding: 12,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
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
  minHeight: 38,
  padding: "0 12px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const titleMain: CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  color: "#fff",
};

const titleSubCompact: CSSProperties = {
  marginTop: 3,
  fontSize: 13,
  color: "#c9d1db",
};

const metaRowCompact: CSSProperties = {
  marginTop: 8,
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
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
  border: "2px solid rgba(230,230,230,0.82)",
  background:
    "linear-gradient(180deg, rgba(16,19,26,0.98) 0%, rgba(5,8,13,0.98) 100%)",
  boxShadow:
    "inset 0 0 0 1px rgba(255,255,255,0.20), 0 10px 18px rgba(0,0,0,0.26)",
};

const iconBoxCompact: CSSProperties = {
  width: 52,
  height: 52,
  display: "grid",
  placeItems: "center",
  color: "#fff",
  background:
    "linear-gradient(180deg, #ff680f 0%, #ff4d00 55%, #cc3f00 100%)",
  boxShadow: "0 8px 16px rgba(255,77,0,0.18)",
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
  border: "1px solid rgba(255,255,255,0.18)",
  background:
    "linear-gradient(180deg, rgba(10,14,20,0.98) 0%, rgba(2,5,9,0.98) 100%)",
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

const uploadTabsWrap: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 12,
};

const uploadViewTab: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 38,
  padding: "0 12px",
  border: "1px solid rgba(255,255,255,0.14)",
  background:
    "linear-gradient(180deg, rgba(14,19,26,0.96) 0%, rgba(5,9,14,0.96) 100%)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const activeUploadViewTab: CSSProperties = {
  border: "1px solid rgba(255,77,0,0.65)",
  background:
    "linear-gradient(180deg, rgba(255,112,36,0.22) 0%, rgba(255,77,0,0.16) 100%)",
  boxShadow: "0 8px 18px rgba(255,77,0,0.14)",
};

const uploadCountBadge: CSSProperties = {
  marginLeft: 8,
  minWidth: 24,
  height: 24,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 8px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.12)",
  fontSize: 12,
  fontWeight: 900,
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

const fieldWrapWide: CSSProperties = {
  display: "grid",
  gap: 6,
};

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

const tabLabel: CSSProperties = {
  marginBottom: 6,
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#d6dee8",
};

const tabRailCompact: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  padding: 8,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
};

const tabBtnCompact: CSSProperties = {
  minHeight: 40,
  padding: "0 14px",
  border: "1px solid rgba(255,255,255,0.16)",
  background:
    "linear-gradient(180deg, rgba(17,24,39,0.9) 0%, rgba(8,12,18,0.9) 100%)",
  color: "#fff",
  fontWeight: 900,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
};

const activeTabBtn: CSSProperties = {
  background: "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)",
  color: "#fff",
  border: "1px solid rgba(255,77,0,0.8)",
  boxShadow: "0 10px 22px rgba(255,77,0,0.24)",
};

const subTabBtnCompact: CSSProperties = {
  minHeight: 38,
  padding: "0 12px",
  border: "1px solid rgba(255,255,255,0.16)",
  background:
    "linear-gradient(180deg, rgba(8,14,22,0.95) 0%, rgba(4,8,13,0.95) 100%)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

const activeSubTabBtn: CSSProperties = {
  background: "linear-gradient(180deg, #5b6678 0%, #374151 100%)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.30)",
  boxShadow: "0 8px 18px rgba(148,163,184,0.18)",
};

const fighterTableCard: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.18)",
  background:
    "linear-gradient(180deg, rgba(10,14,20,0.98) 0%, rgba(2,5,9,0.98) 100%)",
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
  border: "1px solid rgba(255,255,255,0.18)",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

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

const tdStyleStrong: CSSProperties = {
  ...tdStyle,
  fontWeight: 800,
};

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
  background:
    "linear-gradient(180deg, rgba(16,19,26,0.99) 0%, rgba(5,8,13,0.99) 100%)",
  padding: 18,
  boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
  marginBottom: 24,
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

const noDiffCard: CSSProperties = {
  padding: "14px 16px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#e5e7eb",
  fontWeight: 700,
};