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
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Edit3,
  FileUp,
  Loader2,
  Plus,
  Radar,
  RefreshCw,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";

const ORANGE = "#ff4d00";
const LOGO_SRC = "/branding/fightsupport/excel-logo.png";

type Aanmelding = Record<string, any>;
type BusyMode =
  | "idle"
  | "upload"
  | "manual"
  | "controle"
  | "delete"
  | "save"
  | "load";
type ViewMode = "unchecked" | "checked" | "failed" | "all";

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

function onlyDigits(v: unknown) {
  return s(v).replace(/\D/g, "");
}

function timeValue(v: unknown) {
  const raw = s(v);
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

function statusOf(r: Aanmelding) {
  const normalized = normalizeStatus(
    pick(r, [
      "status",
      "aanmelding_status",
      "controle_status",
      "scrape_status",
      "fightpaspoort_status",
    ]),
  );

  const hasFailure =
    normalized === "scrape_mislukt" ||
    hasValue(r?.scrape_failed_at) ||
    hasValue(r?.scrape_error) ||
    hasValue(r?.error);

  if (hasFailure) return "scrape_mislukt";

  if (normalized === "gematcht" || normalized === "afgemeld") return normalized;

  const isRunning =
    normalized === "controle_bezig" ||
    hasValue(r?.scrape_started_at) ||
    hasValue(r?.controle_started_at);

  const hasScrapeSignal =
    normalized === "gescrapt" ||
    hasValue(r?.scraped_at) ||
    hasValue(r?.controle_run_id) ||
    hasValue(r?.checked_at) ||
    hasValue(r?.fightpaspoort_checked_at);

  if (hasScrapeSignal) return "gescrapt";
  if (isRunning) return "controle_bezig";

  return normalized;
}

function isScrapedAanmelding(r: Aanmelding) {
  return statusOf(r) === "gescrapt";
}

function isFailedAanmelding(r: Aanmelding) {
  return statusOf(r) === "scrape_mislukt";
}

function isRawAanmelding(r: Aanmelding) {
  return statusOf(r) === "rauw";
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
  if (mode === "controle") return "Fightpaspoort check loopt";
  if (mode === "delete") return "Verwijderen wordt uitgevoerd";
  if (mode === "save") return "Wijzigingen worden opgeslagen";
  if (mode === "load") return "Gegevens worden geladen";
  return "Bezig";
}

function busySubText(mode: BusyMode) {
  if (mode === "controle")
    return "Fightpaspoort check loopt.";
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
  const [viewMode, setViewMode] = useState<ViewMode>("unchecked");

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

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setBusyMode("load");
        setMsg("");
      }

      try {
        const res = await authedFetch(`/api/matchmaker/${matchmakingId}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Laden mislukt");

        setRows(Array.isArray(json?.aanmeldingen) ? json.aanmeldingen : []);
        setUploads(Array.isArray(json?.uploads) ? json.uploads : []);
        setMatchmaking(
          json?.matchmaking || json?.data?.matchmaking || json?.event || null,
        );
      } catch (e: any) {
        setMsg(e?.message || "Laden mislukt");
      } finally {
        if (!silent) {
          setLoading(false);
          setBusyMode("idle");
        }
      }
    },
    [matchmakingId],
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

  const rawRows = useMemo(
    () => sortAanmeldingen(rows.filter(isRawAanmelding)),
    [rows],
  );
  const scrapedRows = useMemo(
    () => sortAanmeldingen(rows.filter(isScrapedAanmelding)),
    [rows],
  );
  const failedRows = useMemo(
    () => sortAanmeldingen(rows.filter(isFailedAanmelding)),
    [rows],
  );
  const allRows = useMemo(() => sortAanmeldingen(rows), [rows]);

  const visibleRows = useMemo(() => {
    if (viewMode === "checked") return scrapedRows;
    if (viewMode === "failed") return failedRows;
    if (viewMode === "all") return allRows;
    return rawRows;
  }, [viewMode, scrapedRows, failedRows, allRows, rawRows]);

  const rowsForCheck = viewMode === "failed" ? failedRows : rawRows;

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

      setViewMode("unchecked");
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
    if (!s(form.naam)) {
      setMsg("Vul minimaal een naam in.");
      return;
    }

    setBusyMode("manual");
    setMsg("");

    try {
      const res = await authedFetch("/api/matchmaker/add-fighter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          ...form,
          sportschool: form.gym,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Toevoegen mislukt");

      setForm({
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

      setViewMode("unchecked");
      setMsg("Vechter toegevoegd.");
      await load(true);
    } catch (e: any) {
      setMsg(e?.message || "Toevoegen mislukt");
    } finally {
      setBusyMode("idle");
    }
  }

  async function waitForControleResult(
    checkedIds: string[],
    checkStartedAt: number,
  ) {
    const wanted = new Set(checkedIds.map(String).filter(Boolean));
    const startedAt = Date.now();
    const maxMs = 10 * 60 * 1000;
    const freshAfter = checkStartedAt - 5000;

    while (Date.now() - startedAt < maxMs) {
      const res = await authedFetch(`/api/matchmaker/${matchmakingId}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "Laden na Fightpaspoort check mislukt");

      const nextRows: Aanmelding[] = Array.isArray(json?.aanmeldingen)
        ? json.aanmeldingen
        : [];
      setRows(nextRows);
      setUploads(Array.isArray(json?.uploads) ? json.uploads : []);
      setMatchmaking(
        json?.matchmaking || json?.data?.matchmaking || json?.event || null,
      );

      const selected = nextRows.filter((r) =>
        wanted.has(String(aanmeldingId(r))),
      );

      const allFinishedFresh =
        selected.length > 0 &&
        selected.every((r) => {
          const st = statusOf(r);
          const startedFresh =
            timeValue(r?.scrape_started_at) >= freshAfter ||
            timeValue(r?.controle_started_at) >= freshAfter;
          const finishedFresh =
            timeValue(r?.scraped_at) >= freshAfter ||
            timeValue(r?.scrape_failed_at) >= freshAfter ||
            timeValue(r?.checked_at) >= freshAfter ||
            timeValue(r?.fightpaspoort_checked_at) >= freshAfter;

          if (st === "controle_bezig") return false;

          return (
            finishedFresh ||
            (startedFresh &&
              (st === "gescrapt" ||
                st === "scrape_mislukt" ||
                st === "gematcht" ||
                st === "afgemeld"))
          );
        });

      if (allFinishedFresh) return;
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }

    await load(true);
  }

  async function controleer() {
    const ids = Array.from(
      new Set(rowsForCheck.map(aanmeldingId).filter(Boolean)),
    );
    const vaNummers = Array.from(
      new Set(
        rowsForCheck
          .map((r) =>
            onlyDigits(pick(r, ["va_nummer", "va", "fightpaspoort_nummer"])),
          )
          .filter(Boolean),
      ),
    );

    if (!rowsForCheck.length) {
      setMsg(
        viewMode === "failed"
          ? "Er zijn geen mislukte aanmeldingen om opnieuw te controleren."
          : "Er zijn geen niet gecheckte aanmeldingen om te controleren.",
      );
      return;
    }

    if (!ids.length) {
      setMsg(
        "Deze regels hebben geen aanmelding-id en kunnen niet veilig naar de Fightpaspoort check.",
      );
      return;
    }

    if (!vaNummers.length) {
      setMsg(
        "Deze regels hebben geen VA nummer. Vul eerst een VA nummer in voordat je de Fightpaspoort check start.",
      );
      return;
    }

    setBusyMode("controle");
    setMsg("");

    try {
      const checkStartedAt = Date.now();
      const res = await authedFetch("/api/matchmaker/scrape/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          mode: viewMode === "failed" ? "selected" : "open_only",
          scope: viewMode === "failed" ? "failed" : "open",
          only_open: viewMode !== "failed",
          include_failed: viewMode === "failed",
          force: viewMode === "failed",
          aanmelding_ids: ids,
          va_nummers: vaNummers,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "Fightpaspoort check mislukt");

      await waitForControleResult(ids, checkStartedAt);
      setViewMode(viewMode === "failed" ? "failed" : "unchecked");
      setMsg(
        json?.message ||
          "Fightpaspoort check afgerond. Aanmeldingen hebben nu status gecheckt of mislukt.",
      );
    } catch (e: any) {
      setMsg(e?.message || "Fightpaspoort check mislukt");
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
      setMsg("Vechter bijgewerkt.");
      await load(true);
    } catch (e: any) {
      setMsg(e?.message || "Opslaan mislukt");
    } finally {
      setBusyMode("idle");
    }
  }

  return (
    <main style={pageShell}>
      {busyMode === "controle" && <WaitScreen mode={busyMode} />}

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
          <Stat
            icon={<FileUp size={20} />}
            label="Uploads"
            value={uploads.length}
          />
          <Stat
            icon={<Users size={20} />}
            label="Niet gecheckt"
            value={rawRows.length}
          />
          <Stat
            icon={<Users size={20} />}
            label="Gecheckt"
            value={scrapedRows.length}
          />
          <Stat
            icon={<Users size={20} />}
            label="Mislukt"
            value={failedRows.length}
          />
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
          </AccordionPanel>

          <AccordionPanel
            open={manualOpen}
            setOpen={setManualOpen}
            icon={<Plus size={18} />}
            title="Handmatig toevoegen"
            subtitle="Volgorde: discipline, klasse, geslacht, naam, sportschool, VA nummer, gewicht en optioneel contact."
          >
            <div style={manualLine}>
              <input
                placeholder="Discipline"
                value={form.discipline}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discipline: e.target.value }))
                }
                style={input}
              />
              <input
                placeholder="Klasse"
                value={form.klasse}
                onChange={(e) =>
                  setForm((f) => ({ ...f, klasse: e.target.value }))
                }
                style={input}
              />
              <input
                placeholder="Geslacht"
                value={form.geslacht}
                onChange={(e) =>
                  setForm((f) => ({ ...f, geslacht: e.target.value }))
                }
                style={input}
              />
              <input
                placeholder="Naam"
                value={form.naam}
                onChange={(e) =>
                  setForm((f) => ({ ...f, naam: e.target.value }))
                }
                style={input}
              />
              <input
                placeholder="Sportschool"
                value={form.gym}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gym: e.target.value }))
                }
                style={input}
              />
              <input
                placeholder="VA nummer"
                value={form.va_nummer}
                onChange={(e) =>
                  setForm((f) => ({ ...f, va_nummer: e.target.value }))
                }
                style={input}
              />
              <input
                placeholder="Gewicht"
                value={form.gewicht}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gewicht: e.target.value }))
                }
                style={input}
              />
              <input
                placeholder="Email trainer"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                style={input}
              />
              <input
                placeholder="Telefoon trainer"
                value={form.telefoon}
                onChange={(e) =>
                  setForm((f) => ({ ...f, telefoon: e.target.value }))
                }
                style={input}
              />

              <button
                className="fs-silver-btn compact-action"
                onClick={addManual}
                disabled={busy}
              >
                <Plus size={16} />
                Toevoegen
              </button>
            </div>
          </AccordionPanel>
        </section>

        <section style={metalPanelNoPadding}>
          <div style={tableHead}>
            <h2 style={tableTitle}>Uploads</h2>

            <button
              className="fs-silver-btn compact"
              onClick={() => load()}
              disabled={busy}
            >
              <RefreshCw size={16} />
              Vernieuwen
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr>
                  {[
                    "Upload",
                    "Bestand",
                    "Niet gecheckt",
                    "Gecheckt",
                    "Mislukt",
                    "Actie",
                  ].map((h) => (
                    <th style={th} key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {uploadTabs.map((u, index) => {
                  const id = s(u.upload_id || u.id || u.upload_batch_id);
                  const countOpen = id
                    ? rawRows.filter((r) => uploadId(r) === id).length
                    : 0;
                  const countScraped = id
                    ? scrapedRows.filter((r) => uploadId(r) === id).length
                    : 0;
                  const countFailed = id
                    ? failedRows.filter((r) => uploadId(r) === id).length
                    : 0;
                  return (
                    <tr key={id || index} className="fs-zebra-row">
                      <td style={td}>
                        <b>
                          {index === 0
                            ? "Nieuwste upload"
                            : `Upload ${uploadTabs.length - index}`}
                        </b>
                        <br />
                        <span style={smallMuted}>{fmt(id)}</span>
                      </td>
                      <td style={td}>
                        {fmt(u.filename || u.bestandsnaam || u.raw_filename)}
                      </td>
                      <td style={td}>{countOpen}</td>
                      <td style={td}>{countScraped}</td>
                      <td style={td}>{countFailed}</td>
                      <td style={td}>
                        {id && (
                          <button
                            className="fs-red-btn compact"
                            onClick={() => clearUpload(id)}
                            disabled={busy}
                          >
                            <Trash2 size={14} />
                            Verwijder upload
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!uploads.length && (
                  <tr className="fs-zebra-row">
                    <td colSpan={6} style={td}>
                      Nog geen uploads.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section style={metalPanelNoPadding}>
          <div style={tableHead}>
            <h2 style={tableTitle}>
              {viewMode === "unchecked" && `Niet gecheckt (${rawRows.length})`}
              {viewMode === "checked" && `Gecheckt (${scrapedRows.length})`}
              {viewMode === "failed" && `Mislukt (${failedRows.length})`}
              {viewMode === "all" && `Alles (${allRows.length})`}
            </h2>

            <div style={tableActions}>
              <button
                className={
                  viewMode === "unchecked"
                    ? "fs-orange-btn compact"
                    : "fs-silver-btn compact"
                }
                onClick={() => setViewMode("unchecked")}
                disabled={busy}
              >
                Niet gecheckt
              </button>
              <button
                className={
                  viewMode === "checked"
                    ? "fs-orange-btn compact"
                    : "fs-silver-btn compact"
                }
                onClick={() => setViewMode("checked")}
                disabled={busy}
              >
                Gecheckt
              </button>
              <button
                className={
                  viewMode === "failed"
                    ? "fs-orange-btn compact"
                    : "fs-silver-btn compact"
                }
                onClick={() => setViewMode("failed")}
                disabled={busy}
              >
                Mislukt
              </button>
              <button
                className={
                  viewMode === "all"
                    ? "fs-orange-btn compact"
                    : "fs-silver-btn compact"
                }
                onClick={() => setViewMode("all")}
                disabled={busy}
              >
                Alles
              </button>

              <button
                className="fs-green-btn compact"
                onClick={controleer}
                disabled={
                  busy ||
                  !rowsForCheck.length ||
                  ["checked", "all"].includes(viewMode)
                }
              >
                <Radar size={15} />
                {viewMode === "failed"
                  ? "Check mislukt opnieuw"
                  : "Start Autocheck"}
              </button>

              <Link
                href={`/dashboard/matchmaker/matchmaking/${matchmakingId}/match`}
                className="fs-blue-btn compact"
              >
                <Users size={15} />
                Gecontroleerde vechters
              </Link>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr>
                  {[
                    "Status",
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
                {visibleRows.map((r, index) => {
                  const id = aanmeldingId(r);
                  const key =
                    id || `${name(r)}-${pick(r, ["va_nummer", "va"])}-${index}`;
                  const isEditing = Boolean(id && editingId === id && editForm);

                  return (
                    <tr key={key} className="fs-zebra-row">
                      <td style={td}>
                        <StatusBadge
                          status={statusOf(r)}
                          scrapedAt={pick(r, ["scraped_at"])}
                          failedAt={pick(r, ["scrape_failed_at"])}
                        />
                      </td>

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
                            {fmt(
                              pick(r, [
                                "va_nummer",
                                "va",
                                "fightpaspoort_nummer",
                              ]),
                            )}
                          </td>
                          <td style={td}>
                            {fmt(pick(r, ["gewicht", "gewicht_kg"]))}
                          </td>
                          <td style={td}>
                            <div style={actionCell}>
                              {viewMode !== "checked" && (
                                <>
                                  <button
                                    className="fs-silver-btn compact"
                                    onClick={() => startEdit(r)}
                                    disabled={busy || !id}
                                  >
                                    <Edit3 size={14} />
                                    Bewerk
                                  </button>

                                  <button
                                    className="fs-red-btn compact"
                                    onClick={() => deleteFighter(r)}
                                    disabled={busy || !id}
                                  >
                                    <Trash2 size={14} />
                                    Verwijder
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}

                {!loading && !visibleRows.length && (
                  <tr className="fs-zebra-row">
                    <td colSpan={9} style={td}>
                      Geen aanmeldingen in deze weergave.
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

function StatusBadge({
  status,
  scrapedAt,
  failedAt,
}: {
  status: string;
  scrapedAt?: string;
  failedAt?: string;
}) {
  const normalized = normalizeStatus(status);
  const label =
    normalized === "gescrapt"
      ? "Gecheckt"
      : normalized === "scrape_mislukt"
        ? "Mislukt"
        : normalized === "controle_bezig"
          ? "Bezig"
          : normalized === "gematcht"
            ? "Gematcht"
            : normalized === "afgemeld"
              ? "Afgemeld"
              : "Niet gecheckt";

  const title =
    normalized === "gescrapt" && scrapedAt
      ? `Gecheckt op ${scrapedAt}`
      : normalized === "scrape_mislukt" && failedAt
        ? `Mislukt op ${failedAt}`
        : label;

  return (
    <span className={`fs-status ${normalized}`} title={title}>
      {label}
    </span>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
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

function WaitScreen({ mode }: { mode: BusyMode }) {
  return (
    <div style={waitOverlay}>
      <div style={waitCard}>
        <div style={waitLogoBox}>
          <Image
            src={LOGO_SRC}
            alt="FightSupport"
            width={330}
            height={85}
            style={waitLogoImg}
          />
        </div>

        <Loader2 size={46} style={spinner} />
        <h2 style={waitTitle}>{busyText(mode)}</h2>
        <p style={waitText}>{busySubText(mode)}</p>

        <div style={progressTrack}>
          <div style={progressFill} />
        </div>
      </div>
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
  minWidth: 110,
  padding: "7px 9px",
};

const actionCell: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
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
  minWidth: 1180,
  background: "#111216",
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "12px 15px",
  color: "#fff",
  fontSize: 13,
  textTransform: "uppercase",
  background: ORANGE,
  borderRight: "1px solid rgba(255,255,255,.35)",
  whiteSpace: "nowrap",
};

const td: CSSProperties = {
  padding: "12px 15px",
  verticalAlign: "top",
  borderRight: "1px solid rgba(255,255,255,.12)",
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
.fs-status.rauw{
  color:#111;
  border:1px solid #ffd37a;
  background:linear-gradient(180deg,#fff2bd,#f6b942);
}
.fs-status.gescrapt{
  color:#fff;
  border:1px solid #4dff91;
  background:linear-gradient(180deg,#145b2a,#098134);
}
.fs-status.scrape_mislukt{
  color:#fff;
  border:1px solid #ff8a8a;
  background:linear-gradient(180deg,#7a1d1d,#c92323);
}
.fs-status.controle_bezig{
  color:#fff;
  border:1px solid #54a2ff;
  background:linear-gradient(180deg,#142948,#0b58b8);
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
