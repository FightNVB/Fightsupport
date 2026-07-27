// app/dashboard/matchmaker/matchmaking/[matchmakingId]/aanmeldingen/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { authedFetch } from "@/lib/api/authedFetch";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  Eye,
  FileUp,
  Plus,
  Search,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";

const ORANGE = "#ff4d00";
const LOGO_SRC = "/branding/fightsupport/excel-logo.png";
const EXCEL_TEMPLATE_URL =
  "/templates/fightsupport-aanmeldingen-upload.xlsx";

type Aanmelding = Record<string, any>;
type SportschoolOption = {
  sportschool_id: number;
  naam: string;
  plaats?: string | null;
};
type FighterOption = {
  va_nummer: string;
  naam: string;
  geboortedatum?: string | null;
  geslacht?: string | null;
  primary_discipline?: string | null;
  nulmeting_discipline?: string | null;
  berekende_klasse?: string | null;
  nulmeting_klasse?: string | null;
  nulmeting_gewicht?: string | number | null;
  email?: string | null;
  fit_to_fight?: boolean | null;
  licentie_actief?: boolean | null;
  heeft_startverbod?: boolean | null;
  sportscholen?: SportschoolOption[];
};
type NameVaCheck = {
  id: string;
  aanmelding_id: number;
  naam_upload: string;
  va_nummer_upload: string;
  naam_fightpassport?: string | null;
  va_nummer_fightpassport?: string | null;
  status: "open" | "resolved" | "ignored";
  resolution?: "upload_name_approved" | "va_corrected" | null;
  resolved_va_nummer?: string | null;
};

type BusyMode = "idle" | "upload" | "manual" | "delete" | "save" | "load";

type FighterForm = {
  discipline: string;
  klasse: string;
  geslacht: string;
  naam: string;
  gym: string;
  va_nummer: string;
  gewicht: string;
  email: string;
  telefoon: string;
};

function s(v: unknown) {
  return String(v ?? "").trim();
}

function pick(r: Aanmelding, keys: string[]) {
  for (const k of keys) {
    const v = s(r?.[k]);
    if (v) return v;
  }
  return "";
}

function pickName(r: Aanmelding) {
  const first = pick(r, ["voornaam", "first_name", "firstname"]);
  const last = pick(r, [
    "achternaam",
    "last_name",
    "lastname",
    "tussenvoegsel_achternaam",
  ]);
  const combined = [first, last].filter(Boolean).join(" ").trim();

  const direct = pick(r, [
    "naam",
    "name",
    "fighter_naam",
    "vechter_naam",
    "volledige_naam",
    "full_name",
    "naam_mm",
    "naam_fp",
  ]);

  if (combined && (!direct || direct.toLowerCase() === first.toLowerCase()))
    return combined;
  if (direct) return direct;
  return combined || "Onbekend";
}

function aanmeldingId(r: Aanmelding) {
  return pick(r, ["id", "aanmelding_id"]);
}

function uploadId(r: Aanmelding) {
  return pick(r, [
    "upload_batch_id",
    "upload_id",
    "aanmelding_upload_id",
    "source_upload_id",
    "batch_id",
  ]);
}

function name(r: Aanmelding) {
  return pickName(r);
}


function fmt(v: unknown) {
  return s(v) || "-";
}

function fmtDate(v: unknown) {
  const raw = s(v);
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function rowToForm(r: Aanmelding): FighterForm {
  return {
    discipline: pick(r, ["discipline", "sport"]) || "KICKBOKSEN",
    klasse: pick(r, ["klasse", "klasse_mm"]),
    geslacht: pick(r, ["geslacht", "gender"]),
    naam: name(r) === "Onbekend" ? "" : name(r),
    gym: pick(r, ["sportschool", "gym", "sportschool_naam"]),
    va_nummer: pick(r, ["va_nummer", "va", "fightpaspoort_nummer"]),
    gewicht: pick(r, ["gewicht", "gewicht_kg"]),
    email: pick(r, ["email", "trainer_email", "contact_email"]),
    telefoon: pick(r, [
      "telefoon",
      "phone",
      "trainer_telefoon",
      "contact_telefoon",
    ]),
  };
}

function busyText(mode: BusyMode) {
  if (mode === "upload") return "Aanmeldingen worden verwerkt";
  if (mode === "manual") return "Vechter wordt toegevoegd";
  if (mode === "delete") return "Verwijderen wordt uitgevoerd";
  if (mode === "save") return "Wijzigingen worden opgeslagen";
  if (mode === "load") return "Gegevens worden geladen";
  return "Bezig";
}

function busySubText(mode: BusyMode) {
  if (mode === "upload")
    return "Het bestand wordt opgeslagen en toegevoegd aan deze matchmaking.";
  return "Deze actie wordt uitgevoerd.";
}

function sortAanmeldingen(list: Aanmelding[]) {
  return [...list].sort((a, b) => {
    const discipline = pick(a, ["discipline", "sport"]).localeCompare(
      pick(b, ["discipline", "sport"]),
      "nl",
      { sensitivity: "base" },
    );
    if (discipline !== 0) return discipline;

    const klasse = pick(a, ["klasse", "klasse_mm"]).localeCompare(
      pick(b, ["klasse", "klasse_mm"]),
      "nl",
      { sensitivity: "base" },
    );
    if (klasse !== 0) return klasse;

    const geslacht = pick(a, ["geslacht", "gender"]).localeCompare(
      pick(b, ["geslacht", "gender"]),
      "nl",
      { sensitivity: "base" },
    );
    if (geslacht !== 0) return geslacht;

    return name(a).localeCompare(name(b), "nl", { sensitivity: "base" });
  });
}

export default function AanmeldingenPage() {
  const params = useParams<{ matchmakingId: string }>();
  const matchmakingId = String(params?.matchmakingId ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [rows, setRows] = useState<Aanmelding[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [matchmaking, setMatchmaking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busyMode, setBusyMode] = useState<BusyMode>("idle");
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FighterForm | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<"fighter" | "school">("fighter");
  const [sportscholen, setSportscholen] = useState<SportschoolOption[]>([]);
  const [selectedSportschoolId, setSelectedSportschoolId] = useState("");
  const [fighters, setFighters] = useState<FighterOption[]>([]);
  const [selectedVa, setSelectedVa] = useState("");
  const [fighterSearch, setFighterSearch] = useState("");
  const [selectorLoading, setSelectorLoading] = useState(false);
  const [nameVaChecks, setNameVaChecks] = useState<NameVaCheck[]>([]);
  const [correctVaByCheck, setCorrectVaByCheck] = useState<Record<string, string>>({});
  const [tableSearch, setTableSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"withVa" | "withoutVa">("withVa");
  const [missingVaAanmeldingId, setMissingVaAanmeldingId] = useState<string | null>(null);
  const [missingVaMode, setMissingVaMode] = useState<"name" | "school">("name");
  const [missingVaSearch, setMissingVaSearch] = useState("");
  const [missingVaSchoolName, setMissingVaSchoolName] = useState("");
  const [missingVaSchoolId, setMissingVaSchoolId] = useState("");
  const [missingVaFighters, setMissingVaFighters] = useState<FighterOption[]>([]);
  const [missingVaSelectedVa, setMissingVaSelectedVa] = useState("");
  const [missingVaLoading, setMissingVaLoading] = useState(false);

  const [form, setForm] = useState<FighterForm>({
    discipline: "KICKBOKSEN",
    klasse: "",
    geslacht: "",
    naam: "",
    gym: "",
    va_nummer: "",
    gewicht: "",
    email: "",
    telefoon: "",
  });

  const busy = busyMode !== "idle";

  const selectedFighter = useMemo(
    () => fighters.find((fighter) => String(fighter.va_nummer) === selectedVa) ?? null,
    [fighters, selectedVa],
  );

  const filteredFighters = useMemo(() => {
    const q = fighterSearch.trim().toLowerCase();
    if (!q) return fighters;
    return fighters.filter((fighter) =>
      `${fighter.naam} ${fighter.va_nummer}`.toLowerCase().includes(q),
    );
  }, [fighters, fighterSearch]);

  const resolvedMissingVaSchool = useMemo(() => {
    const wanted = normalizeSchoolName(missingVaSchoolName);
    if (!wanted) return null;

    return (
      sportscholen.find((school) => normalizeSchoolName(school.naam) === wanted) ??
      sportscholen.find((school) => {
        const candidate = normalizeSchoolName(school.naam);
        return candidate.includes(wanted) || wanted.includes(candidate);
      }) ??
      null
    );
  }, [missingVaSchoolName, sportscholen]);

  const loadSportscholen = useCallback(async () => {
    setSelectorLoading(true);
    try {
      const res = await authedFetch("/api/matchmaker/fighter-selector", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Sportscholen laden mislukt");
      setSportscholen(Array.isArray(json?.sportscholen) ? json.sportscholen : []);
    } catch (e: any) {
      setMsg(e?.message || "Sportscholen laden mislukt");
    } finally {
      setSelectorLoading(false);
    }
  }, []);

  const loadFightersForSchool = useCallback(async (sportschoolId: string) => {
    if (!sportschoolId) {
      setFighters([]);
      setSelectedVa("");
      return;
    }
    setSelectorLoading(true);
    setSelectedVa("");
    try {
      const res = await authedFetch(
        `/api/matchmaker/fighter-selector?sportschool_id=${encodeURIComponent(sportschoolId)}`,
        { cache: "no-store" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Vechters laden mislukt");
      setFighters(Array.isArray(json?.fighters) ? json.fighters : []);
    } catch (e: any) {
      setFighters([]);
      setMsg(e?.message || "Vechters laden mislukt");
    } finally {
      setSelectorLoading(false);
    }
  }, []);

  const searchFighters = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) {
      setFighters([]);
      setSelectedVa("");
      return;
    }
    setSelectorLoading(true);
    try {
      const res = await authedFetch(
        `/api/matchmaker/fighter-selector?q=${encodeURIComponent(q)}`,
        { cache: "no-store" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Zoeken mislukt");
      setFighters(Array.isArray(json?.fighters) ? json.fighters : []);
    } catch (e: any) {
      setFighters([]);
      setMsg(e?.message || "Zoeken mislukt");
    } finally {
      setSelectorLoading(false);
    }
  }, []);

  useEffect(() => {
    if (manualOpen && sportscholen.length === 0) void loadSportscholen();
  }, [manualOpen, sportscholen.length, loadSportscholen]);

  useEffect(() => {
    if (!manualOpen || searchMode !== "fighter") return;
    const timer = window.setTimeout(() => void searchFighters(fighterSearch), 300);
    return () => window.clearTimeout(timer);
  }, [manualOpen, searchMode, fighterSearch, searchFighters]);

  const loadNameVaChecks = useCallback(async () => {
    if (!matchmakingId) return;
    try {
      const res = await authedFetch(
        `/api/matchmaker/name-va-checks?matchmaking_id=${encodeURIComponent(matchmakingId)}`,
        { cache: "no-store" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Naam/VA-controles laden mislukt");
      setNameVaChecks(Array.isArray(json?.checks) ? json.checks : []);
    } catch (e: any) {
      setMsg(e?.message || "Naam/VA-controles laden mislukt");
    }
  }, [matchmakingId]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setBusyMode("load");
        setMsg("");
      }

      try {
        const res = await authedFetch(
          `/api/matchmaker/${matchmakingId}?t=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Laden mislukt");

        setRows(Array.isArray(json?.aanmeldingen) ? json.aanmeldingen : []);
        setUploads(Array.isArray(json?.uploads) ? json.uploads : []);
        setMatchmaking(
          json?.matchmaking || json?.data?.matchmaking || json?.event || null,
        );
        await loadNameVaChecks();
      } catch (e: any) {
        setMsg(e?.message || "Laden mislukt");
      } finally {
        if (!silent) {
          setLoading(false);
          setBusyMode("idle");
        }
      }
    },
    [matchmakingId, loadNameVaChecks],
  );

  useEffect(() => {
    if (matchmakingId) load();
  }, [matchmakingId, load]);

  const uploadTabs = useMemo(() => {
    return [...uploads].sort((a, b) => {
      const bd = Date.parse(s(b.created_at || b.createdAt || b.uploaded_at));
      const ad = Date.parse(s(a.created_at || a.createdAt || a.uploaded_at));
      return (Number.isFinite(bd) ? bd : 0) - (Number.isFinite(ad) ? ad : 0);
    });
  }, [uploads]);

  const allRows = useMemo(() => sortAanmeldingen(rows), [rows]);

  const missingVaRows = useMemo(
    () =>
      allRows.filter(
        (row) => !pick(row, ["va_nummer", "va", "fightpaspoort_nummer"]),
      ),
    [allRows],
  );

  const rowsWithVa = useMemo(
    () =>
      allRows.filter((row) =>
        Boolean(pick(row, ["va_nummer", "va", "fightpaspoort_nummer"])),
      ),
    [allRows],
  );

  const activeRows = activeTab === "withoutVa" ? missingVaRows : rowsWithVa;

  const filteredRows = useMemo(() => {
    const q = tableSearch.trim().toLocaleLowerCase("nl-NL");
    if (!q) return activeRows;

    return activeRows.filter((row) => {
      const searchable = [
        pick(row, ["discipline", "sport"]),
        pick(row, ["klasse", "klasse_mm"]),
        pick(row, ["geslacht", "gender"]),
        name(row),
        pick(row, ["gym", "sportschool", "sportschool_naam"]),
        pick(row, ["va_nummer", "va", "fightpaspoort_nummer"]),
        pick(row, ["gewicht", "gewicht_kg"]),
        pick(row, ["email", "trainer_email", "contact_email"]),
        pick(row, ["telefoon", "phone", "trainer_telefoon", "contact_telefoon"]),
        uploadId(row),
      ]
        .join(" ")
        .toLocaleLowerCase("nl-NL");

      return searchable.includes(q);
    });
  }, [activeRows, tableSearch]);

  const eventName = pick(matchmaking || {}, [
    "naam",
    "event_naam",
    "titel",
    "title",
    "naam_event",
    "wedstrijdnaam",
  ]);
  const eventDate = fmtDate(
    pick(matchmaking || {}, [
      "datum",
      "event_datum",
      "event_date",
      "evenement_datum",
      "date",
    ]),
  );

  async function upload() {
    const file = inputRef.current?.files?.[0];

    if (!file) {
      setMsg("Kies eerst een Excel bestand.");
      return;
    }

    setBusyMode("upload");
    setMsg("");

    try {
      const fd = new FormData();
      fd.set("matchmaking_id", matchmakingId);
      fd.set("file", file);

      const res = await authedFetch("/api/matchmaker/submit-aanmeldingen", {
        method: "POST",
        body: fd,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Upload mislukt");

      if (inputRef.current) inputRef.current.value = "";

      setMsg(
        json?.message ||
          "Upload gelukt. Nieuwe aanmeldingen zijn toegevoegd aan deze matchmaking.",
      );
      await load(true);
    } catch (e: any) {
      setMsg(e?.message || "Upload mislukt");
    } finally {
      setBusyMode("idle");
    }
  }

  async function addManual() {
    if (!selectedFighter) {
      setMsg("Kies eerst een vechter.");
      return;
    }
    if (!s(form.gewicht)) {
      setMsg("Vul het actuele wedstrijdgewicht in.");
      return;
    }

    const linkedSchools = selectedFighter.sportscholen ?? [];
    const resolvedSchoolId = selectedSportschoolId ||
      (linkedSchools.length === 1 ? String(linkedSchools[0].sportschool_id) : "");

    if (!resolvedSchoolId) {
      setMsg("Kies de sportschool waarvoor deze vechter wordt aangemeld.");
      return;
    }

    const sportschool = sportscholen.find(
      (row) => String(row.sportschool_id) === resolvedSchoolId,
    ) ?? linkedSchools.find((row) => String(row.sportschool_id) === resolvedSchoolId);

    setBusyMode("manual");
    setMsg("");
    try {
      const res = await authedFetch("/api/matchmaker/add-fighter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          matchmaker_id: matchmaking?.matchmaker_id || matchmaking?.maker_user_id || null,
          sportschool_id: Number(resolvedSchoolId),
          va_nummer: selectedFighter.va_nummer,
          gewicht: form.gewicht,
          gym: sportschool?.naam || "",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Toevoegen mislukt");

      setSelectedVa("");
      setSelectedSportschoolId("");
      setFighterSearch("");
      setFighters([]);
      setForm((current) => ({ ...current, gewicht: "" }));
      const linkedSchoolIds = (selectedFighter.sportscholen ?? []).map((row) => String(row.sportschool_id));
      const schoolWasChanged = !linkedSchoolIds.includes(String(resolvedSchoolId));
      setMsg(
        schoolWasChanged
          ? `${selectedFighter.naam} is toegevoegd. De afwijkende sportschool is opgeslagen en voor admin geregistreerd.`
          : `${selectedFighter.naam} is toegevoegd aan deze matchmaking.`,
      );
      await load(true);
    } catch (e: any) {
      setMsg(e?.message || "Toevoegen mislukt");
    } finally {
      setBusyMode("idle");
    }
  }

  async function resolveNameVaCheck(
    check: NameVaCheck,
    action: "approve_name" | "correct_va",
  ) {
    const va = s(correctVaByCheck[check.id]);
    if (action === "correct_va" && !va) {
      setMsg("Vul eerst het juiste VA-nummer in.");
      return;
    }

    setBusyMode("save");
    setMsg("");
    try {
      const res = await authedFetch("/api/matchmaker/name-va-checks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          check_id: check.id,
          action,
          va_nummer: action === "correct_va" ? va : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Naam/VA-controle opslaan mislukt");

      setCorrectVaByCheck((current) => {
        const next = { ...current };
        delete next[check.id];
        return next;
      });
      setMsg(
        action === "approve_name"
          ? `Naam ${check.naam_upload} is goedgekeurd voor VA ${check.va_nummer_upload}.`
          : `VA-nummer aangepast en FightPassport-gegevens opnieuw geladen.`,
      );
      await load(true);
    } catch (e: any) {
      setMsg(e?.message || "Naam/VA-controle opslaan mislukt");
    } finally {
      setBusyMode("idle");
    }
  }

  function normalizeSchoolName(value: unknown) {
    return s(value)
      .toLocaleLowerCase("nl-NL")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  async function openMissingVaSearch(row: Aanmelding) {
    const id = aanmeldingId(row);
    if (!id) {
      setMsg("Deze aanmelding heeft geen id en kan niet worden gekoppeld.");
      return;
    }

    const schoolName = pick(row, ["gym", "sportschool", "sportschool_naam"]);

    setMissingVaAanmeldingId(id);
    setMissingVaMode("name");
    setMissingVaSearch(name(row) === "Onbekend" ? "" : name(row));
    setMissingVaSchoolName(schoolName);
    setMissingVaSchoolId("");
    setMissingVaFighters([]);
    setMissingVaSelectedVa("");

    if (sportscholen.length === 0) {
      await loadSportscholen();
    }
  }

  useEffect(() => {
    if (!missingVaAanmeldingId || missingVaMode !== "name") return;

    const q = missingVaSearch.trim();
    if (q.length < 2) {
      setMissingVaFighters([]);
      setMissingVaSelectedVa("");
      return;
    }

    const timer = window.setTimeout(async () => {
      setMissingVaLoading(true);
      try {
        const res = await authedFetch(
          `/api/matchmaker/fighter-selector?q=${encodeURIComponent(q)}`,
          { cache: "no-store" },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Slim zoeken mislukt");
        setMissingVaFighters(Array.isArray(json?.fighters) ? json.fighters : []);
      } catch (e: any) {
        setMissingVaFighters([]);
        setMsg(e?.message || "Slim zoeken mislukt");
      } finally {
        setMissingVaLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [missingVaAanmeldingId, missingVaMode, missingVaSearch]);

  useEffect(() => {
    if (!missingVaAanmeldingId || missingVaMode !== "school") return;

    const schoolId = missingVaSchoolId ||
      (resolvedMissingVaSchool ? String(resolvedMissingVaSchool.sportschool_id) : "");

    if (!schoolId) {
      setMissingVaFighters([]);
      setMissingVaSelectedVa("");
      return;
    }

    setMissingVaSchoolId(schoolId);
    setMissingVaLoading(true);
    setMissingVaSelectedVa("");

    void authedFetch(
      `/api/matchmaker/fighter-selector?sportschool_id=${encodeURIComponent(schoolId)}`,
      { cache: "no-store" },
    )
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Vechters van sportschool laden mislukt");
        setMissingVaFighters(Array.isArray(json?.fighters) ? json.fighters : []);
      })
      .catch((e: any) => {
        setMissingVaFighters([]);
        setMsg(e?.message || "Vechters van sportschool laden mislukt");
      })
      .finally(() => setMissingVaLoading(false));
  }, [
    missingVaAanmeldingId,
    missingVaMode,
    missingVaSchoolId,
    resolvedMissingVaSchool,
  ]);

  async function linkMissingVa() {
    if (!missingVaAanmeldingId || !missingVaSelectedVa) {
      setMsg("Kies eerst de juiste vechter uit de database.");
      return;
    }

    const fighter = missingVaFighters.find(
      (row) => String(row.va_nummer) === missingVaSelectedVa,
    );

    setBusyMode("save");
    setMsg("");
    try {
      const res = await authedFetch("/api/matchmaker/aanmeldingen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          aanmelding_id: missingVaAanmeldingId,
          va_nummer: missingVaSelectedVa,
          hydrate_from_fighter_database: true,
          source: missingVaMode === "school"
            ? "smart_search_missing_va_school"
            : "smart_search_missing_va_name",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Vechter koppelen mislukt");

      setMsg(
        `${fighter?.naam || "De vechter"} (VA ${missingVaSelectedVa}) is aan de aanmelding gekoppeld.`,
      );
      setMissingVaAanmeldingId(null);
      setMissingVaSearch("");
      setMissingVaSchoolName("");
      setMissingVaSchoolId("");
      setMissingVaMode("name");
      setMissingVaFighters([]);
      setMissingVaSelectedVa("");
      await load(true);
    } catch (e: any) {
      setMsg(e?.message || "Vechter koppelen mislukt");
    } finally {
      setBusyMode("idle");
    }
  }

  async function clearUpload(uploadIdValue: string) {
    const id = s(uploadIdValue);

    if (!id) {
      setMsg("Geen upload-id gevonden.");
      return;
    }

    const ok = window.confirm(
      "Weet je zeker dat je deze upload wilt verwijderen? Alle aanmeldingen uit deze upload worden ook verwijderd.",
    );
    if (!ok) return;

    setBusyMode("delete");
    setMsg("");

    try {
      const res = await authedFetch("/api/matchmaker/delete-aanmeldingupload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          upload_id: id,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Upload verwijderen mislukt");

      setMsg("Upload en bijbehorende aanmeldingen verwijderd.");
      await load(true);
    } catch (e: any) {
      setMsg(e?.message || "Upload verwijderen mislukt");
    } finally {
      setBusyMode("idle");
    }
  }

  async function deleteFighter(r: Aanmelding) {
    const id = aanmeldingId(r);

    if (!id) {
      setMsg(
        "Deze vechter heeft geen aanmelding-id en kan niet worden verwijderd.",
      );
      return;
    }

    setBusyMode("delete");
    setMsg("");

    try {
      const res = await authedFetch(
        `/api/matchmaker/aanmeldingen?matchmaking_id=${encodeURIComponent(matchmakingId)}&aanmelding_id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "Vechter verwijderen mislukt");

      setMsg("Vechter verwijderd.");
      await load(true);
    } catch (e: any) {
      setMsg(e?.message || "Vechter verwijderen mislukt");
    } finally {
      setBusyMode("idle");
    }
  }

  function startEdit(r: Aanmelding) {
    const id = aanmeldingId(r);

    if (!id) {
      setMsg(
        "Deze vechter heeft geen aanmelding-id en kan niet worden bewerkt.",
      );
      return;
    }

    setEditingId(id);
    setEditForm(rowToForm(r));
  }

  async function saveEdit() {
    if (!editingId || !editForm) return;

    setBusyMode("save");
    setMsg("");

    try {
      const res = await authedFetch("/api/matchmaker/aanmeldingen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          aanmelding_id: editingId,
          discipline: editForm.discipline,
          klasse: editForm.klasse,
          geslacht: editForm.geslacht,
          naam: editForm.naam,
          sportschool: editForm.gym,
          gym: editForm.gym,
          va_nummer: editForm.va_nummer,
          gewicht: editForm.gewicht,
          email: editForm.email,
          telefoon: editForm.telefoon,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Opslaan mislukt");

      setEditingId(null);
      setEditForm(null);
      setMsg("Aanmelding bijgewerkt en vechtercontext opnieuw opgebouwd.");
      await load(true);
    } catch (e: any) {
      setMsg(e?.message || "Opslaan mislukt");
    } finally {
      setBusyMode("idle");
    }
  }

  return (
    <main style={pageShell} className="fs-page315">

      <style>{`
        .fs-page315, .fs-page315 * { box-sizing: border-box; }
        .fs-page315 {
          min-height: 100vh !important;
          background: #2b2b2b !important;
          color: #ffffff !important;
          padding: 24px !important;
        }
        .fs-page315 section {
          border: 1px solid #71717a !important;
          border-radius: 0 !important;
          background: #121212 !important;
          box-shadow: 0 24px 70px rgba(0,0,0,.62) !important;
        }
        .fs-page315 header {
          border-bottom: 1px solid #52525b !important;
          border-radius: 0 !important;
          background: linear-gradient(90deg,#1d1d1d,#303030,#151515) !important;
          min-height: 96px !important;
        }
        .fs-page315 h1,
        .fs-page315 h2,
        .fs-page315 h3 {
          text-transform: uppercase !important;
          font-weight: 950 !important;
          letter-spacing: .02em !important;
        }
        .fs-page315 h1,
        .fs-page315 b,
        .fs-page315 strong {
          color: #ff4d00 !important;
        }
        .fs-page315 a,
        .fs-page315 button {
          border-radius: 0 !important;
          font-weight: 950 !important;
          text-transform: uppercase !important;
        }
        .fs-page315 input,
        .fs-page315 select,
        .fs-page315 textarea {
          border-radius: 0 !important;
          border: 1px solid #52525b !important;
          background: #111111 !important;
          color: #ffffff !important;
          box-shadow: none !important;
        }
        .fs-page315 input::placeholder,
        .fs-page315 textarea::placeholder { color: #a1a1aa !important; }
        .fs-page315 table {
          border-collapse: collapse !important;
          background: #121212 !important;
        }
        .fs-page315 thead,
        .fs-page315 thead tr,
        .fs-page315 th {
          background: #252525 !important;
          color: #d4d4d8 !important;
          border: 1px solid #3f3f46 !important;
          text-transform: uppercase !important;
        }
        .fs-page315 td {
          border: 1px solid #27272a !important;
        }
        .fs-page315 tbody tr:nth-child(odd) {
          background: #171717 !important;
          color: #ffffff !important;
        }
        .fs-page315 tbody tr:nth-child(even) {
          background: #202020 !important;
          color: #ffffff !important;
        }
        .fs-page315 tbody tr:hover {
          background: #242424 !important;
          outline: 1px solid rgba(255,77,0,.35) !important;
          outline-offset: -1px !important;
        }
        .fs-page315 .fs-silver-btn,
        .fs-page315 .fs-back-button {
          border: 1px solid #d4d4d8 !important;
          background: linear-gradient(to bottom,#ffffff,#e4e4e7,#71717a) !important;
          color: #000000 !important;
          box-shadow: 0 10px 22px rgba(0,0,0,.30) !important;
        }
        .fs-page315 .fs-orange-btn {
          border: 1px solid #ff4d00 !important;
          background: #ff4d00 !important;
          color: #000000 !important;
          box-shadow: 0 10px 22px rgba(0,0,0,.30) !important;
        }
        .fs-page315 .fs-green-btn,
        .fs-page315 .fs-blue-btn {
          border: 1px solid #d4d4d8 !important;
          background: linear-gradient(to bottom,#ffffff,#e4e4e7,#71717a) !important;
          color: #000000 !important;
          box-shadow: 0 10px 22px rgba(0,0,0,.30) !important;
        }
        .fs-page315 .fs-red-btn {
          border: 1px solid #ef4444 !important;
          background: #991b1b !important;
          color: #ffffff !important;
          box-shadow: 0 10px 22px rgba(0,0,0,.30) !important;
        }
        .fs-page315 .fs-status {
          border-radius: 0 !important;
          border: 1px solid #52525b !important;
          background: #242424 !important;
          color: #ffffff !important;
        }
        .fs-page315 .fs-zebra-row:nth-child(odd),
        .fs-page315 .fs-zebra-row:nth-child(even) {
          background: transparent !important;
          color: inherit !important;
        }
        @media (max-width: 900px) {
          .fs-page315 { padding: 14px !important; }
          .fs-page315 header { grid-template-columns: 1fr !important; text-align: center !important; }
        }
      `}</style>

      <section style={chromeFrame}>
        <header style={heroHeader}>
          <div style={heroLeft}>
            <div style={eyebrow}>MATCHMAKER</div>
            <h1 style={heroTitle}>Aanmeldingen</h1>
            <div style={eventMeta}>
              <strong>{eventName || "Evenement"}</strong>
              {eventDate && <span>{eventDate}</span>}
            </div>
          </div>

          <div style={logoWrap}>
            <Image
              src={LOGO_SRC}
              alt="FightSupport"
              width={390}
              height={92}
              priority
              style={logoImg}
            />
          </div>

          <div style={heroRight}>
            <Link
              href="/dashboard/matchmaker/matchmaking"
              className="fs-back-button"
            >
              <ArrowLeft size={17} />
              Terug naar matchmakingen
            </Link>
          </div>
        </header>
      </section>

      <section style={contentFrame}>
        {msg && <div style={messageBox}>{msg}</div>}

        <div style={statsGrid}>
          <Stat icon={<FileUp size={20} />} label="Uploads" value={uploads.length} />
          <Stat icon={<Users size={20} />} label="Aanmeldingen" value={allRows.length} />
          <Stat icon={<AlertTriangle size={20} />} label="Naam/VA open" value={nameVaChecks.filter((check) => check.status === "open").length} />
          <Stat icon={<Search size={20} />} label="Zonder VA" value={missingVaRows.length} />
        </div>

        <section style={accordionGrid}>
          <AccordionPanel
            open={uploadOpen}
            setOpen={setUploadOpen}
            icon={<FileUp size={18} />}
            title="Excel upload"
            subtitle="Upload één of meerdere bestanden. Nieuwe uploads blijven apart controleerbaar."
          >
            <div style={uploadLine}>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={fileInput}
              />
              <button
                className="fs-orange-btn compact-action"
                onClick={upload}
                disabled={busy}
              >
                <FileUp size={16} />
                Upload bestand
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <a
                className="fs-silver-btn compact-action"
                href={EXCEL_TEMPLATE_URL}
                download="fightsupport-aanmeldingen-upload.xlsx"
              >
                <Download size={16} />
                Download template
              </a>
            </div>

            <div style={uploadHistory}>
              <div style={uploadHistoryHeader}>
                <strong>Eerdere uploads</strong>
                <span style={smallMuted}>
                  Verwijder een compleet bestand inclusief de bijbehorende aanmeldingen.
                </span>
              </div>

              {uploadTabs.length > 0 ? (
                <div style={uploadHistoryList}>
                  {uploadTabs.map((uploadRow, index) => {
                    const id = uploadId(uploadRow);
                    const filename =
                      pick(uploadRow, [
                        "raw_filename",
                        "filename",
                        "original_filename",
                        "upload_filename",
                      ]) || `Upload ${uploadTabs.length - index}`;
                    const createdAt = pick(uploadRow, [
                      "created_at",
                      "createdAt",
                      "uploaded_at",
                    ]);
                    const inserted = pick(uploadRow, [
                      "inserted_count",
                      "row_count",
                      "aantal",
                    ]);
                    const duplicates = pick(uploadRow, [
                      "duplicate_count",
                      "duplicates",
                    ]);

                    return (
                      <div key={id || `${filename}-${index}`} style={uploadHistoryRow}>
                        <div style={uploadHistoryInfo}>
                          <b style={uploadFilename}>{filename}</b>
                          <span style={smallMuted}>
                            {createdAt ? fmtDate(createdAt) : "Datum onbekend"}
                            {inserted ? ` · ${inserted} toegevoegd` : ""}
                            {duplicates ? ` · ${duplicates} dubbel` : ""}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="fs-red-btn compact"
                          onClick={() => clearUpload(id)}
                          disabled={busy || !id}
                          title={
                            id
                              ? `Verwijder upload ${filename}`
                              : "Upload-id ontbreekt"
                          }
                        >
                          <Trash2 size={15} />
                          Upload verwijderen
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={uploadHistoryEmpty}>Nog geen uploads gevonden.</div>
              )}
            </div>
          </AccordionPanel>

          <AccordionPanel
            open={manualOpen}
            setOpen={setManualOpen}
            icon={<Plus size={18} />}
            title="Handmatig toevoegen"
            subtitle="Zoek direct op naam of VA-nummer, of kies eerst een sportschool. De vechtergegevens komen uit FightPassport."
          >
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <button
                className={searchMode === "fighter" ? "fs-orange-btn compact" : "fs-silver-btn compact"}
                onClick={() => {
                  setSearchMode("fighter");
                  setSelectedSportschoolId("");
                  setSelectedVa("");
                  setFighters([]);
                }}
                type="button"
              >
                Zoek vechter
              </button>
              <button
                className={searchMode === "school" ? "fs-orange-btn compact" : "fs-silver-btn compact"}
                onClick={() => {
                  setSearchMode("school");
                  setFighterSearch("");
                  setSelectedVa("");
                  setFighters([]);
                }}
                type="button"
              >
                Kies sportschool
              </button>
            </div>

            <div style={manualSmartGrid}>
              {searchMode === "school" ? (
                <label style={{ ...fieldLabel, gridColumn: "span 2" }}>
                  <span>Sportschool</span>
                  <select
                    value={selectedSportschoolId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedSportschoolId(value);
                      void loadFightersForSchool(value);
                    }}
                    style={input}
                    disabled={busy || selectorLoading}
                  >
                    <option value="">Kies sportschool</option>
                    {sportscholen.map((school) => (
                      <option key={school.sportschool_id} value={school.sportschool_id}>
                        {school.naam}{school.plaats ? ` — ${school.plaats}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label style={{ ...fieldLabel, gridColumn: "span 2" }}>
                  <span>Zoek in alle vechters</span>
                  <input
                    placeholder="Typ minimaal 2 tekens van naam of VA-nummer"
                    value={fighterSearch}
                    onChange={(e) => {
                      setFighterSearch(e.target.value);
                      setSelectedVa("");
                      setSelectedSportschoolId("");
                    }}
                    style={input}
                    disabled={busy}
                    autoComplete="off"
                  />
                </label>
              )}

              <label style={{ ...fieldLabel, gridColumn: "span 2" }}>
                <span>Vechter</span>
                <select
                  value={selectedVa}
                  onChange={(e) => {
                    const va = e.target.value;
                    setSelectedVa(va);
                    const fighter = fighters.find((row) => String(row.va_nummer) === va);
                    const schools = fighter?.sportscholen ?? [];
                    if (searchMode === "fighter") {
                      setSelectedSportschoolId(schools.length === 1 ? String(schools[0].sportschool_id) : "");
                    }
                  }}
                  style={input}
                  disabled={selectorLoading || fighters.length === 0}
                >
                  <option value="">
                    {selectorLoading ? "Vechters laden..." : fighters.length ? "Kies vechter" : "Geen resultaten geladen"}
                  </option>
                  {filteredFighters.map((fighter) => (
                    <option key={fighter.va_nummer} value={fighter.va_nummer}>
                      {fighter.naam} — VA {fighter.va_nummer}
                    </option>
                  ))}
                </select>
              </label>

              {selectedFighter && (
                <>
                  <div style={fighterPreview}>
                    <b>{selectedFighter.naam}</b>
                    <span>VA {selectedFighter.va_nummer}</span>
                    <span>{selectedFighter.geslacht || "Geslacht onbekend"}</span>
                    <span>{selectedFighter.berekende_klasse || selectedFighter.nulmeting_klasse || "Klasse onbekend"}</span>
                    <span>{selectedFighter.primary_discipline || selectedFighter.nulmeting_discipline || "Discipline onbekend"}</span>
                    <span>{selectedFighter.licentie_actief ? "Licentie actief" : "Geen actieve licentie"}</span>
                    <span>{selectedFighter.fit_to_fight ? "Fit to fight" : "Niet fit to fight"}</span>
                    {selectedFighter.heeft_startverbod && <strong>Startverbod</strong>}
                  </div>

                  <label style={{ ...fieldLabel, gridColumn: "span 2" }}>
                    <span>Sportschool voor deze aanmelding</span>
                    <select
                      value={selectedSportschoolId}
                      onChange={(e) => setSelectedSportschoolId(e.target.value)}
                      style={input}
                      disabled={busy || selectorLoading}
                    >
                      <option value="">Kies sportschool</option>
                      {sportscholen.map((school) => {
                        const linked = (selectedFighter.sportscholen ?? []).some(
                          (item) => Number(item.sportschool_id) === Number(school.sportschool_id),
                        );
                        return (
                          <option key={school.sportschool_id} value={school.sportschool_id}>
                            {school.naam}{school.plaats ? ` — ${school.plaats}` : ""}{linked ? " · gekoppeld in FightPassport" : ""}
                          </option>
                        );
                      })}
                    </select>
                    <span style={schoolHelpText}>
                      De gekoppelde sportschool is vooraf geselecteerd. Je mag voor deze aanmelding een andere sportschool kiezen; die afwijking wordt voor admin geregistreerd.
                    </span>
                  </label>
                </>
              )}

              <label style={fieldLabel}>
                <span>Actueel wedstrijdgewicht</span>
                <input
                  placeholder="Bijvoorbeeld 67,5"
                  inputMode="decimal"
                  value={form.gewicht}
                  onChange={(e) => setForm((f) => ({ ...f, gewicht: e.target.value }))}
                  style={input}
                  disabled={!selectedFighter || busy}
                />
              </label>

              <div style={{ display: "flex", alignItems: "end" }}>
                <button
                  className="fs-silver-btn compact-action"
                  onClick={addManual}
                  disabled={busy || selectorLoading || !selectedFighter}
                >
                  <Plus size={16} />
                  Toevoegen
                </button>
              </div>
            </div>
          </AccordionPanel>
        </section>

        {nameVaChecks.some((check) => check.status === "open") && (
          <section style={metalPanelNoPadding}>
            <div style={tableHead}>
              <div>
                <h2 style={tableTitle}>Naam en VA controleren</h2>
                <div style={smallMuted}>Alleen afwijkingen uit geüploade bestanden. Keur een roepnaam goed of koppel de aanmelding aan het juiste VA-nummer.</div>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8, padding: 12 }}>
              {nameVaChecks.filter((check) => check.status === "open").map((check) => (
                <div key={check.id} style={nameVaCheckRow}>
                  <div style={{ minWidth: 220 }}>
                    <b>{check.naam_upload}</b>
                    <div style={smallMuted}>Upload: VA {check.va_nummer_upload}</div>
                  </div>
                  <div style={{ minWidth: 220 }}>
                    <span style={smallMuted}>FightPassport</span>
                    <div><b>{check.naam_fightpassport || "Naam niet gevonden"}</b></div>
                    <div style={smallMuted}>VA {check.va_nummer_fightpassport || check.va_nummer_upload}</div>
                  </div>
                  <button
                    type="button"
                    className="fs-orange-btn compact"
                    onClick={() => resolveNameVaCheck(check, "approve_name")}
                    disabled={busy}
                  >
                    Naam is akkoord
                  </button>
                  <input
                    style={{ ...cellInput, minWidth: 130 }}
                    placeholder="Juiste VA"
                    inputMode="numeric"
                    value={correctVaByCheck[check.id] || ""}
                    onChange={(e) =>
                      setCorrectVaByCheck((current) => ({ ...current, [check.id]: e.target.value }))
                    }
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="fs-silver-btn compact"
                    onClick={() => resolveNameVaCheck(check, "correct_va")}
                    disabled={busy || !s(correctVaByCheck[check.id])}
                  >
                    VA aanpassen
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={metalPanelNoPadding}>
          <div style={registrationTabs}>
            <button
              type="button"
              className={activeTab === "withVa" ? "fs-orange-btn compact" : "fs-silver-btn compact"}
              onClick={() => {
                setActiveTab("withVa");
                setMissingVaAanmeldingId(null);
                setTableSearch("");
              }}
            >
              <Users size={15} />
              Aanmeldingen met VA ({rowsWithVa.length})
            </button>
            <button
              type="button"
              className={activeTab === "withoutVa" ? "fs-orange-btn compact" : "fs-silver-btn compact"}
              onClick={() => {
                setActiveTab("withoutVa");
                setEditingId(null);
                setEditForm(null);
                setTableSearch("");
              }}
            >
              <AlertTriangle size={15} />
              Zonder VA-nummer ({missingVaRows.length})
            </button>
          </div>

          <div style={compactTableHead}>
            <h2 style={compactTableTitle}>
              {activeTab === "withoutVa"
                ? "Aanmeldingen zonder VA-nummer"
                : "Alle gekoppelde aanmeldingen"}{" "}
              ({filteredRows.length}/{activeRows.length})
            </h2>

            <label style={compactTableSearchWrap}>
              <Search size={16} />
              <input
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Slim zoeken in aanmeldingen"
                style={tableSearchInput}
                aria-label="Slim zoeken in alle aanmeldingen"
              />
              {tableSearch && (
                <button
                  type="button"
                  onClick={() => setTableSearch("")}
                  style={clearSearchButton}
                  aria-label="Zoekfilter wissen"
                  title="Zoekfilter wissen"
                >
                  <X size={14} />
                </button>
              )}
            </label>

            <Link
              href={`/dashboard/matchmaker/matchmaking/${matchmakingId}/match`}
              className="fs-blue-btn compact"
              style={compactMatchLink}
            >
              <Users size={15} />
              Ga naar matchen
            </Link>
          </div>

          <div style={{ width: "100%", overflowX: "hidden" }}>
            <table style={table}>
              <colgroup>
                <col style={{ width: "9%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "27%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr>
                  {[
                    "Discipline",
                    "Klasse",
                    "Geslacht",
                    "Naam",
                    "Sportschool",
                    "VA nummer",
                    "Gewicht",
                    "Acties",
                  ].map((h) => (
                    <th style={th} key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((r, index) => {
                  const id = aanmeldingId(r);
                  const key =
                    id || `${name(r)}-${pick(r, ["va_nummer", "va"])}-${index}`;
                  const isEditing = Boolean(id && editingId === id && editForm);
                  const vaNumber = pick(r, ["va_nummer", "va", "fightpaspoort_nummer"]);
                  
                  const isMissingVaSearchOpen = Boolean(
                    id && missingVaAanmeldingId === id,
                  );

                  return (
                    <React.Fragment key={key}>
                    <tr className="fs-zebra-row">
                      {isEditing && editForm ? (
                        <>
                          <td style={td}>
                            <input
                              style={cellInput}
                              value={editForm.discipline}
                              onChange={(e) =>
                                setEditForm((f) =>
                                  f ? { ...f, discipline: e.target.value } : f,
                                )
                              }
                            />
                          </td>
                          <td style={td}>
                            <input
                              style={cellInput}
                              value={editForm.klasse}
                              onChange={(e) =>
                                setEditForm((f) =>
                                  f ? { ...f, klasse: e.target.value } : f,
                                )
                              }
                            />
                          </td>
                          <td style={td}>
                            <input
                              style={cellInput}
                              value={editForm.geslacht}
                              onChange={(e) =>
                                setEditForm((f) =>
                                  f ? { ...f, geslacht: e.target.value } : f,
                                )
                              }
                            />
                          </td>
                          <td style={td}>
                            <input
                              style={cellInput}
                              value={editForm.naam}
                              onChange={(e) =>
                                setEditForm((f) =>
                                  f ? { ...f, naam: e.target.value } : f,
                                )
                              }
                            />
                          </td>
                          <td style={td}>
                            <input
                              style={cellInput}
                              value={editForm.gym}
                              onChange={(e) =>
                                setEditForm((f) =>
                                  f ? { ...f, gym: e.target.value } : f,
                                )
                              }
                            />
                          </td>
                          <td style={td}>
                            <input
                              style={cellInput}
                              value={editForm.va_nummer}
                              onChange={(e) =>
                                setEditForm((f) =>
                                  f ? { ...f, va_nummer: e.target.value } : f,
                                )
                              }
                            />
                          </td>
                          <td style={td}>
                            <input
                              style={cellInput}
                              value={editForm.gewicht}
                              onChange={(e) =>
                                setEditForm((f) =>
                                  f ? { ...f, gewicht: e.target.value } : f,
                                )
                              }
                            />
                          </td>
                          <td style={td}>
                            <div style={actionCell}>
                              <button
                                className="fs-green-btn compact"
                                onClick={saveEdit}
                                disabled={busy}
                              >
                                <Save size={14} />
                                Opslaan
                              </button>
                              <button
                                className="fs-silver-btn compact"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditForm(null);
                                }}
                                disabled={busy}
                              >
                                <X size={14} />
                                Annuleer
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={td}>
                            {fmt(pick(r, ["discipline", "sport"]))}
                          </td>
                          <td style={td}>
                            {fmt(pick(r, ["klasse", "klasse_mm"]))}
                          </td>
                          <td style={td}>
                            {fmt(pick(r, ["geslacht", "gender"]))}
                          </td>
                          <td style={td}>
                            <b>{name(r)}</b>
                          </td>
                          <td style={td}>
                            {fmt(
                              pick(r, [
                                "gym",
                                "sportschool",
                                "sportschool_naam",
                              ]),
                            )}
                          </td>
                          <td style={td}>
                            {vaNumber ? (
                              fmt(vaNumber)
                            ) : (
                              <div style={missingVaCell}>
                                <span style={missingVaBadge}>
                                  <AlertTriangle size={13} /> Geen VA-nummer
                                </span>
                                <button
                                  type="button"
                                  className="fs-orange-btn compact"
                                  style={smartSearchButton}
                                  onClick={() => openMissingVaSearch(r)}
                                  disabled={busy || !id}
                                >
                                  <Search size={14} /> Slim zoeken
                                </button>
                              </div>
                            )}
                          </td>
                          <td style={td}>
                            {fmt(pick(r, ["gewicht", "gewicht_kg"]))}
                          </td>
                          <td style={td}>
                            <div style={actionCell}>
                              <>
                                  {vaNumber && (
                                    <Link
                                      href={`/dashboard/matchmaker/matchmaking/${matchmakingId}/fighter/${encodeURIComponent(vaNumber)}`}
                                      className="fs-silver-btn"
                                      style={actionIconButton}
                                      aria-label={`Open fighterpagina van ${name(r)}`}
                                      title="Fighter bekijken"
                                    >
                                      <Eye size={16} />
                                    </Link>
                                  )}

                                  <button
                                    className="fs-silver-btn"
                                    style={actionIconButton}
                                    onClick={() => startEdit(r)}
                                    disabled={busy || !id}
                                    aria-label={`Bewerk ${name(r)}`}
                                    title="Bewerken"
                                  >
                                    <Edit3 size={16} />
                                  </button>

                                  <button
                                    className="fs-red-btn"
                                    style={actionIconButton}
                                    onClick={() => deleteFighter(r)}
                                    disabled={busy || !id}
                                    aria-label={`Verwijder ${name(r)}`}
                                    title="Verwijderen"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                    {isMissingVaSearchOpen && (
                      <tr style={missingVaSearchRow}>
                        <td colSpan={8} style={missingVaSearchCell}>
                          <div style={missingVaSearchPanel}>
                            <div style={missingVaSearchIntro}>
                              <AlertTriangle size={18} />
                              <div>
                                <b>{name(r)} heeft geen VA-nummer in de upload.</b>
                                <div style={smallMuted}>
                                  Zoek de juiste vechter in de database en koppel het VA-nummer aan deze aanmelding.
                                </div>
                              </div>
                            </div>
                            <div style={missingVaModeButtons}>
                              <button
                                type="button"
                                className={missingVaMode === "name" ? "fs-orange-btn compact" : "fs-silver-btn compact"}
                                onClick={() => {
                                  setMissingVaMode("name");
                                  setMissingVaSelectedVa("");
                                  setMissingVaFighters([]);
                                }}
                              >
                                <Search size={14} /> Zoek op naam
                              </button>
                              <button
                                type="button"
                                className={missingVaMode === "school" ? "fs-orange-btn compact" : "fs-silver-btn compact"}
                                onClick={() => {
                                  setMissingVaMode("school");
                                  setMissingVaSelectedVa("");
                                  setMissingVaFighters([]);
                                }}
                                disabled={!missingVaSchoolName}
                              >
                                <Users size={14} /> Vechters van sportschool
                              </button>
                            </div>
                            <div style={missingVaSearchControls}>
                              {missingVaMode === "name" ? (
                                <input
                                  value={missingVaSearch}
                                  onChange={(e) => {
                                    setMissingVaSearch(e.target.value);
                                    setMissingVaSelectedVa("");
                                  }}
                                  placeholder="Zoek op naam of VA-nummer"
                                  style={input}
                                  autoFocus
                                />
                              ) : (
                                <select
                                  value={missingVaSchoolId || (resolvedMissingVaSchool ? String(resolvedMissingVaSchool.sportschool_id) : "")}
                                  onChange={(e) => {
                                    setMissingVaSchoolId(e.target.value);
                                    setMissingVaSelectedVa("");
                                  }}
                                  style={input}
                                  disabled={missingVaLoading || sportscholen.length === 0}
                                >
                                  <option value="">
                                    {missingVaSchoolName
                                      ? `Sportschool uit aanmelding: ${missingVaSchoolName}`
                                      : "Geen sportschool ingevuld"}
                                  </option>
                                  {sportscholen.map((school) => (
                                    <option key={school.sportschool_id} value={school.sportschool_id}>
                                      {school.naam}{school.plaats ? ` — ${school.plaats}` : ""}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <select
                                value={missingVaSelectedVa}
                                onChange={(e) => setMissingVaSelectedVa(e.target.value)}
                                style={input}
                                disabled={missingVaLoading || missingVaFighters.length === 0}
                              >
                                <option value="">
                                  {missingVaLoading
                                    ? "Database doorzoeken..."
                                    : missingVaFighters.length
                                      ? missingVaMode === "school"
                                        ? `Kies een vechter van ${resolvedMissingVaSchool?.naam || missingVaSchoolName}`
                                        : "Kies de juiste vechter"
                                      : missingVaMode === "school"
                                        ? "Geen vechters bij deze sportschool gevonden"
                                        : "Geen resultaten"}
                                </option>
                                {missingVaFighters.map((fighter) => (
                                  <option key={fighter.va_nummer} value={fighter.va_nummer}>
                                    {fighter.naam} — VA {fighter.va_nummer}
                                    {fighter.geboortedatum ? ` — ${fmtDate(fighter.geboortedatum)}` : ""}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="fs-orange-btn compact"
                                onClick={linkMissingVa}
                                disabled={busy || missingVaLoading || !missingVaSelectedVa}
                              >
                                <Save size={14} /> Koppelen
                              </button>
                              <button
                                type="button"
                                className="fs-silver-btn compact"
                                onClick={() => {
                                  setMissingVaAanmeldingId(null);
                                  setMissingVaSearch("");
                                  setMissingVaFighters([]);
                                  setMissingVaSelectedVa("");
                                }}
                                disabled={busy}
                              >
                                <X size={14} /> Sluiten
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}

                {!loading && !filteredRows.length && (
                  <tr className="fs-zebra-row">
                    <td colSpan={8} style={td}>
                      {activeRows.length
                        ? "Geen aanmeldingen gevonden met dit zoekfilter."
                        : activeTab === "withoutVa"
                          ? "Er zijn geen aanmeldingen zonder VA-nummer."
                          : "Er zijn nog geen gekoppelde aanmeldingen voor deze matchmaking."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <style jsx global>
        {globalCss}
      </style>
    </main>
  );
}


function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div style={statCard}>
      <div style={statIcon}>{icon}</div>
      <div>
        <div style={statLabel}>{label}</div>
        <div style={statValue}>{value}</div>
      </div>
    </div>
  );
}

function AccordionPanel({
  open,
  setOpen,
  icon,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div style={metalPanel}>
      <button
        type="button"
        style={accordionButton}
        onClick={() => setOpen(!open)}
      >
        <span style={accordionTitle}>
          <span style={panelIcon}>{icon}</span>
          <span>
            <span style={panelTitleText}>{title}</span>
            <span style={accordionSub}>{subtitle}</span>
          </span>
        </span>
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {open && <div style={accordionBody}>{children}</div>}
    </div>
  );
}

const pageShell: CSSProperties = {
  minHeight: "100vh",
  color: "#f7f7f7",
  padding: "24px 0 46px",
  background: "linear-gradient(180deg,#050505 0%,#101114 48%,#060607 100%)",
};

const chromeFrame: CSSProperties = {
  width: "min(1500px, calc(100vw - 96px))",
  margin: "0 auto",
  border: "4px solid rgba(255,255,255,.78)",
  borderRadius: 20,
  background: "linear-gradient(180deg,#303137,#1d1f25)",
  boxShadow: "0 20px 46px rgba(0,0,0,.42), inset 0 0 0 2px rgba(0,0,0,.45)",
  overflow: "hidden",
};

const heroHeader: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  gap: 18,
  padding: "12px 22px",
  borderBottom: `2px solid ${ORANGE}`,
  minHeight: 104,
};

const heroLeft: CSSProperties = { minWidth: 260 };
const heroRight: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
};

const eyebrow: CSSProperties = {
  color: ORANGE,
  fontWeight: 950,
  letterSpacing: 3,
  textTransform: "uppercase",
  fontSize: 12,
};

const heroTitle: CSSProperties = {
  margin: "3px 0 8px",
  fontSize: 28,
  lineHeight: 1,
  color: ORANGE,
  textTransform: "uppercase",
  letterSpacing: 2,
};

const eventMeta: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  color: "#fff",
  fontWeight: 850,
  fontSize: 13,
};

const logoWrap: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  width: 390,
  height: 92,
};

const logoImg: CSSProperties = {
  width: 390,
  height: 92,
  objectFit: "contain",
};

const waitLogoImg: CSSProperties = {
  width: 330,
  height: 85,
  objectFit: "contain",
};

const contentFrame: CSSProperties = {
  width: "min(1500px, calc(100vw - 96px))",
  margin: "18px auto 0",
  border: "4px solid rgba(255,255,255,.78)",
  borderRadius: 20,
  padding: 22,
  background:
    "linear-gradient(135deg,#26282e 0%,#111216 42%,#2f3239 70%,#111216 100%)",
  boxShadow:
    "inset 0 0 0 1px rgba(255,255,255,.14), 0 24px 60px rgba(0,0,0,.45)",
  color: "#f7f7f7",
};

const messageBox: CSSProperties = {
  border: "1px solid rgba(255,77,0,.65)",
  borderRadius: 12,
  padding: "10px 13px",
  marginBottom: 14,
  color: "#fff",
  background: "linear-gradient(180deg,rgba(255,77,0,.20),rgba(35,35,39,.96))",
  fontWeight: 800,
};

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4,minmax(160px,1fr))",
  gap: 12,
  marginBottom: 14,
};

const statCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  border: "1px solid rgba(255,255,255,.20)",
  borderRadius: 16,
  padding: 13,
  background: "linear-gradient(180deg,#3a3d44,#17181d)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.2), 0 12px 30px rgba(0,0,0,.28)",
};

const statIcon: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  color: "#fff",
  background: "linear-gradient(180deg,#ff5a14,#b93100)",
};

const statLabel: CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1.5,
  color: "#aeb4bd",
  fontWeight: 950,
};

const statValue: CSSProperties = {
  fontSize: 24,
  fontWeight: 950,
  color: "#fff",
};

const accordionGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 14,
  marginBottom: 14,
};

const metalPanel: CSSProperties = {
  border: "2px solid rgba(255,255,255,.22)",
  borderRadius: 16,
  padding: 0,
  background: "linear-gradient(180deg,#3a3d44 0%,#1c1e24 52%,#101114 100%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,.18), inset 0 -1px 0 rgba(0,0,0,.5), 0 16px 34px rgba(0,0,0,.35)",
  color: "#f7f7f7",
  overflow: "hidden",
};

const metalPanelNoPadding: CSSProperties = {
  ...metalPanel,
  marginTop: 14,
};

const accordionButton: CSSProperties = {
  width: "100%",
  border: 0,
  cursor: "pointer",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "14px 16px",
  background: "linear-gradient(180deg,#33363e,#17191e)",
  textAlign: "left",
};

const accordionTitle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const accordionSub: CSSProperties = {
  display: "block",
  color: "#c9cdd3",
  fontSize: 12,
  fontWeight: 700,
  marginTop: 3,
};

const accordionBody: CSSProperties = {
  padding: 14,
  borderTop: `2px solid ${ORANGE}`,
};

const panelTitleText: CSSProperties = {
  display: "block",
  fontSize: 18,
  fontWeight: 950,
};

const panelIcon: CSSProperties = {
  display: "inline-flex",
  color: ORANGE,
};

const smallMuted: CSSProperties = {
  color: "inherit",
  opacity: 0.72,
  fontSize: 12,
  fontWeight: 700,
};

const uploadLine: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
  alignItems: "center",
};

const uploadHistory: CSSProperties = {
  marginTop: 16,
  borderTop: "1px solid rgba(255,255,255,.16)",
  paddingTop: 14,
};

const uploadHistoryHeader: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  marginBottom: 10,
};

const uploadHistoryList: CSSProperties = {
  display: "grid",
  gap: 8,
};

const uploadHistoryRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: 10,
  border: "1px solid rgba(255,255,255,.18)",
  background: "#15161a",
};

const uploadHistoryInfo: CSSProperties = {
  minWidth: 0,
  display: "grid",
  gap: 3,
};

const uploadFilename: CSSProperties = {
  color: "#fff",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const uploadHistoryEmpty: CSSProperties = {
  padding: 10,
  border: "1px dashed rgba(255,255,255,.22)",
  color: "#b9bec5",
  fontSize: 12,
  fontWeight: 700,
};

const nameVaCheckRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1.2fr auto 140px auto",
  gap: 10,
  alignItems: "center",
  padding: 10,
  border: "1px solid rgba(255,255,255,.18)",
  background: "#15161a",
};

const manualSmartGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
  alignItems: "end",
};

const fieldLabel: CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  fontWeight: 900,
  color: "#d7dadd",
};

const schoolHelpText: CSSProperties = {
  color: "#fbbf24",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1.35,
};

const fighterPreview: CSSProperties = {
  gridColumn: "1 / -1",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  padding: 12,
  border: "1px solid #555d64",
  background: "#11161a",
  color: "#dfe3e6",
  fontSize: 12,
};

const manualLine: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5,minmax(130px,1fr))",
  gap: 8,
  alignItems: "center",
};

const fileInput: CSSProperties = {
  width: "100%",
  border: "1px solid rgba(255,255,255,.22)",
  borderRadius: 10,
  padding: "8px 10px",
  background: "#111",
  color: "#fff",
  minHeight: 36,
};

const input: CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(0,0,0,.25)",
  color: "#111",
  borderRadius: 10,
  padding: "8px 10px",
  fontWeight: 700,
  minHeight: 36,
  minWidth: 0,
};

const cellInput: CSSProperties = {
  ...input,
  width: "100%",
  minWidth: 0,
  padding: "5px 6px",
  minHeight: 30,
  fontSize: 12,
};

const actionCell: CSSProperties = {
  display: "flex",
  gap: 4,
  flexWrap: "nowrap",
  alignItems: "center",
  justifyContent: "center",
};

const actionIconButton: CSSProperties = {
  width: 30,
  height: 30,
  minWidth: 30,
  padding: 0,
  display: "inline-grid",
  placeItems: "center",
  cursor: "pointer",
};

const tableSearchWrap: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  minWidth: 310,
  minHeight: 34,
  padding: "0 8px",
  border: "1px solid rgba(255,255,255,.28)",
  background: "#111",
  color: "#d4d4d8",
};

const tableSearchInput: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 0,
  padding: "7px 2px",
  background: "transparent",
  color: "#fff",
  outline: "none",
  fontWeight: 800,
};

const clearSearchButton: CSSProperties = {
  width: 24,
  height: 24,
  minWidth: 24,
  padding: 0,
  display: "grid",
  placeItems: "center",
  border: 0,
  background: "transparent",
  color: "#fff",
  cursor: "pointer",
};

const missingVaCell: CSSProperties = {
  display: "grid",
  gap: 5,
  justifyItems: "start",
};

const missingVaBadge: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 6px",
  border: "1px solid #f59e0b",
  background: "rgba(245,158,11,.15)",
  color: "#fbbf24",
  fontSize: 11,
  fontWeight: 950,
  textTransform: "uppercase",
};

const smartSearchButton: CSSProperties = {
  minHeight: 27,
  padding: "4px 7px",
  fontSize: 11,
};

const missingVaSearchRow: CSSProperties = {
  background: "#0f1012",
};

const missingVaSearchCell: CSSProperties = {
  padding: 0,
  borderBottom: `2px solid ${ORANGE}`,
};

const missingVaSearchPanel: CSSProperties = {
  display: "grid",
  gap: 10,
  padding: 12,
  background: "linear-gradient(180deg,rgba(245,158,11,.12),#111216)",
};

const missingVaSearchIntro: CSSProperties = {
  display: "flex",
  gap: 9,
  alignItems: "center",
  color: "#fbbf24",
};

const missingVaModeButtons: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const missingVaSearchControls: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px,1fr) minmax(300px,1.4fr) auto auto",
  gap: 8,
  alignItems: "center",
};

const registrationTabs: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  padding: "12px 12px 0",
  borderBottom: "1px solid rgba(255,255,255,.12)",
};

const compactTableHead: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(max-content, 1fr) minmax(360px, 520px) max-content",
  alignItems: "center",
  gap: 18,
  padding: 14,
  background: "linear-gradient(180deg,#24262c,#101114)",
  color: "white",
  borderBottom: `3px solid ${ORANGE}`,
};

const compactTableTitle: CSSProperties = {
  margin: 0,
  fontSize: 19,
  fontWeight: 950,
  whiteSpace: "nowrap",
  lineHeight: 1.1,
};

const compactTableSearchWrap: CSSProperties = {
  ...tableSearchWrap,
  width: "100%",
  minWidth: 0,
  margin: 0,
};

const compactMatchLink: CSSProperties = {
  whiteSpace: "nowrap",
  justifySelf: "end",
};

const tableHead: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: 14,
  background: "linear-gradient(180deg,#24262c,#101114)",
  color: "white",
  borderBottom: `3px solid ${ORANGE}`,
};

const tableActions: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const tableTitle: CSSProperties = {
  margin: 0,
  fontSize: 19,
  fontWeight: 950,
};

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  background: "#111216",
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "8px 8px",
  color: "#fff",
  fontSize: 11,
  textTransform: "uppercase",
  background: ORANGE,
  borderRight: "1px solid rgba(255,255,255,.35)",
  whiteSpace: "nowrap",
};

const td: CSSProperties = {
  padding: "8px 8px",
  verticalAlign: "middle",
  borderRight: "1px solid rgba(255,255,255,.12)",
  fontSize: 13,
  lineHeight: 1.25,
  overflowWrap: "anywhere",
};

const unlockActions: CSSProperties = {
  marginTop: 22,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
};

const unlockPrimaryButton: CSSProperties = {
  borderRadius: 0,
  padding: "12px 18px",
  background: "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.22)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 24px rgba(255,77,0,0.24)",
  fontSize: 14,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  cursor: "pointer",
};

const unlockSecondaryButton: CSSProperties = {
  borderRadius: 0,
  padding: "12px 18px",
  background: "linear-gradient(180deg, #3b3b40 0%, #202025 100%)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.18)",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};

const waitStatusPill: CSSProperties = {
  marginTop: 18,
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  borderRadius: 999,
  padding: "10px 16px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
};

const waitStatusDot: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: ORANGE,
  boxShadow: "0 0 18px rgba(255,77,0,0.75)",
};

const waitOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "grid",
  placeItems: "center",
  padding: 24,
  background:
    "radial-gradient(circle at center, rgba(255,77,0,.14), rgba(0,0,0,.88) 45%, rgba(0,0,0,.95))",
  backdropFilter: "blur(8px)",
};

const waitCard: CSSProperties = {
  width: "min(560px, calc(100vw - 48px))",
  border: "4px solid rgba(255,255,255,.82)",
  borderRadius: 24,
  padding: "26px 28px 28px",
  textAlign: "center",
  background: "linear-gradient(180deg,#2e3036,#0b0c0f)",
  boxShadow: "0 30px 90px rgba(0,0,0,.75), inset 0 0 0 2px rgba(0,0,0,.5)",
  color: "#fff",
};

const waitLogoBox: CSSProperties = {
  width: 330,
  height: 85,
  maxWidth: "90%",
  margin: "0 auto 18px",
};

const spinner: CSSProperties = {
  color: ORANGE,
  animation: "fsSpin 1s linear infinite",
  margin: "0 auto 8px",
};

const waitTitle: CSSProperties = {
  margin: "8px 0 8px",
  color: ORANGE,
  textTransform: "uppercase",
  letterSpacing: 2,
  fontWeight: 950,
};

const waitText: CSSProperties = {
  margin: "0 auto 18px",
  maxWidth: 420,
  color: "#d8d8d8",
  fontWeight: 700,
  lineHeight: 1.45,
};

const progressTrack: CSSProperties = {
  height: 10,
  borderRadius: 999,
  overflow: "hidden",
  background: "rgba(255,255,255,.13)",
  border: "1px solid rgba(255,255,255,.16)",
};

const progressFill: CSSProperties = {
  height: "100%",
  width: "42%",
  borderRadius: 999,
  background:
    "linear-gradient(90deg,transparent,#ff4d00,#fff,#ff4d00,transparent)",
  animation: "fsProgress 1.45s ease-in-out infinite",
};

const globalCss = `
.fs-silver-btn,.fs-orange-btn,.fs-green-btn,.fs-blue-btn,.fs-red-btn,.fs-back-button{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  border-radius:8px;
  padding:9px 14px;
  font-weight:950;
  text-decoration:none;
  cursor:pointer;
  min-height:36px;
  letter-spacing:.1px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.65),0 8px 20px rgba(0,0,0,.22);
  transition:transform .12s ease,filter .12s ease,opacity .12s ease;
  white-space:nowrap;
}
.fs-back-button{
  color:#111;
  border:1px solid #d7d9dd;
  background:linear-gradient(180deg,#ffffff 0%,#d4d7db 44%,#8f949b 52%,#f7f7f7 100%);
  min-width:190px;
}
.fs-silver-btn{
  color:#111;
  border:1px solid #8f9399;
  background:linear-gradient(180deg,#ffffff 0%,#cfd2d6 43%,#8e9298 50%,#f7f7f7 100%);
}
.fs-orange-btn{
  color:#fff;
  border:1px solid #ff9b72;
  background:linear-gradient(180deg,#ff6b21,#ff4d00 48%,#a92d00);
}
.fs-green-btn{
  color:#fff;
  border:1px solid #2cff7d;
  background:linear-gradient(180deg,#173b22,#0e7e35 55%,#063d18);
  box-shadow:0 0 16px rgba(0,255,100,.35),inset 0 1px 0 rgba(255,255,255,.25);
}
.fs-blue-btn{
  color:#fff;
  border:1px solid #54a2ff;
  background:linear-gradient(180deg,#142948,#0b58b8 55%,#06295e);
  box-shadow:0 0 16px rgba(50,130,255,.34),inset 0 1px 0 rgba(255,255,255,.25);
}
.fs-red-btn{
  color:#fff;
  border:1px solid #ff7d7d;
  background:linear-gradient(180deg,#681b1b,#b91c1c 55%,#5a0b0b);
}
.fs-silver-btn:hover,.fs-orange-btn:hover,.fs-green-btn:hover,.fs-blue-btn:hover,.fs-red-btn:hover,.fs-back-button:hover{
  filter:brightness(1.06);
  transform:translateY(-1px);
}
.fs-silver-btn:disabled,.fs-orange-btn:disabled,.fs-green-btn:disabled,.fs-blue-btn:disabled,.fs-red-btn:disabled{
  opacity:.55;
  cursor:not-allowed;
  transform:none;
  filter:none;
}
.compact{
  padding:7px 11px;
  min-height:32px;
  font-size:13px;
}
.compact-action{
  padding:8px 12px;
  min-height:36px;
  font-size:13px;
}
.fs-status{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:104px;
  border-radius:999px;
  padding:5px 10px;
  font-size:12px;
  font-weight:950;
  text-transform:uppercase;
  letter-spacing:.7px;
}
.fs-status.gematcht{
  color:#fff;
  border:1px solid #b68cff;
  background:linear-gradient(180deg,#39215f,#673ab7);
}
.fs-status.afgemeld{
  color:#fff;
  border:1px solid #cfd2d6;
  background:linear-gradient(180deg,#4b4f57,#202228);
}
.fs-zebra-row:nth-child(odd){
  background:#202228;
  color:#fff;
}
.fs-zebra-row:nth-child(even){
  background:#f4f4f5;
  color:#101114;
}
.fs-zebra-row:nth-child(even) td{
  border-right:1px solid #d6d7db;
}
.fs-zebra-row:nth-child(odd) td{
  border-right:1px solid rgba(255,255,255,.12);
}
.fs-zebra-row:hover{
  outline:2px solid rgba(255,77,0,.45);
  outline-offset:-2px;
}
@keyframes fsSpin{
  to{transform:rotate(360deg)}
}
@keyframes fsProgress{
  0%{transform:translateX(-120%)}
  100%{transform:translateX(250%)}
}
@media (max-width:1200px){
  main section header{
    grid-template-columns:1fr!important;
    text-align:center;
  }
}
@media (max-width:1100px){
  .fs-silver-btn,.fs-orange-btn,.fs-green-btn,.fs-blue-btn,.fs-red-btn,.fs-back-button{
    white-space:normal;
  }
}
@media (max-width:900px){
  main{padding-top:0!important}
  .fs-silver-btn,.fs-orange-btn,.fs-green-btn,.fs-blue-btn,.fs-red-btn{
    width:100%;
  }
  .fs-back-button{
    width:100%;
  }
}
`;
