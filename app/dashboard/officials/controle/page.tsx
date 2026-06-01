"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/api/authedFetch";
import { supabase } from "@/lib/supabaseClient";

import NvbLightButton from "@/components/NvbLightButton";
import NvbDarkButton from "@/components/NvbDarkButton";

const NVB_ORANGE = "#ff4d00";

const API_OVERVIEW = "/api/officials/matchmakings-overzicht";
const API_START_CONTROLE = "/api/control-engine/officials/start";
const API_DELETE_MATCHMAKING = "/api/control-engine/delete-matchmaking";
const API_NAAR_UITSLAGEN = "/api/matchmaking/naar-uitslagen";
const API_VERPLAATS_NAAR_ADMIN_ARCHIEF = "/api/admin/archief/verplaats";

const silverBackplate: CSSProperties = {
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 38%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(236,238,242,0.98) 100%)",
};

interface ControleRun {
  id: string;
  matchmaking_id: string;
  status: string | null;
  gestart_op: string | null;
  afgerond_op: string | null;
  run_type: string | null;
}

type ActiveTab = "received" | "lineup" | "results" | "archive" | "uploaded";

interface MatchmakingRow {
  id: string;
  naam: string | null;
  datum: string | null;
  locatie: string | null;
  promotor: string | null;
  bondteam: string | null;

  bron_type: string | null;
  stadium: string | null;
  status: string | null;
  final_status: string | null;

  huidige_eigenaar_type: string | null;
  huidige_eigenaar_user_id: string | null;
  huidige_eigenaar_bondteam: string | null;

  created_at: string | null;
  last_updated_at: string | null;
  last_updated_by: string | null;

  submitted_to_admin_at: string | null;
  entered_control_at: string | null;
  sent_to_officials_at: string | null;
  entered_weegstation_at: string | null;
  ready_for_results_at: string | null;
  results_finalized_at: string | null;

  is_actief: boolean | null;
  locked_for_editing: boolean | null;
  is_archived: boolean | null;

  matchmaker_id?: string | null;
  hoofdofficial_id?: string | null;

  tab: ActiveTab;
  laatste_run: ControleRun | null;

  // Uitslagen-run wordt client-side bijgehaald, omdat het official overzicht
  // vaak alleen controle-runs teruggeeft. Zonder deze velden ziet de Archief-tab
  // matchmakings met afgeronde uitslagen soms niet.
  uitslagen_run_id?: string | null;
  uitslagen_run_status?: string | null;
}

function formatDate(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("nl-NL");
}

function formatDateTime(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("nl-NL");
}

function getMonthKey(v: string | null | undefined) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey: string) {
  if (!monthKey) return "-";
  const [year, month] = monthKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
  });
}

function Small({
  children,
  origin = "left center",
}: {
  children: ReactNode;
  origin?: string;
}) {
  return (
    <div
      style={{
        transform: "scale(0.85)",
        transformOrigin: origin,
      }}
    >
      {children}
    </div>
  );
}

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "Niet gecontroleerd").trim().toLowerCase();
}

function isRunningStatus(status: string | null | undefined) {
  const s = normalizeStatus(status);
  return s === "running" || s === "bezig" || s === "in_behandeling";
}

function formatStatusLabel(status: string | null | undefined) {
  const raw = String(status ?? "").trim();
  const s = raw.toLowerCase();

  if (!s) return "Niet gecontroleerd";
  if (s === "niet gecontroleerd") return "Niet gecontroleerd";
  if (s === "nieuw") return "Nieuw";
  if (s === "concept") return "Concept";
  if (s === "in_behandeling") return "In behandeling";
  if (s === "running") return "Bezig";
  if (s === "klaar") return "Klaar";
  if (s === "failed") return "Mislukt";
  if (s === "klaar_voor_weegstation") return "Klaar voor weegstation";
  if (s === "in_weegstation") return "In weegstation";
  if (s === "weegstation_verwerkt") return "Weging verwerkt";
  if (s === "klaar_voor_definitieve_lineup") return "Klaar voor definitieve lineup";
  if (s === "definitieve_lineup") return "Definitieve lineup";
  if (s === "klaar_voor_uitslagen") return "Klaar voor uitslagen";
  if (s === "uitslagen_in_bewerking") return "In uitslagen";
  if (s === "uitslagen_definitief") return "Uitslagen definitief";
  if (s === "afgerond") return "Afgerond";

  return raw;
}

function formatBronLabel(bronType: string | null | undefined) {
  const s = String(bronType ?? "").trim().toLowerCase();

  if (!s) return "-";
  if (s === "matchmaker_upload") return "Matchmaker upload";
  if (s === "matchmaker_app") return "Matchmaker app";
  if (s === "official_upload") return "Official upload";
  if (s === "official_app") return "Official app";
  if (s === "admin_upload") return "Admin upload";
  if (s === "admin_app") return "Admin app";

  return String(bronType ?? "-");
}

function formatOwnerLabel(row: MatchmakingRow) {
  const type = String(row.huidige_eigenaar_type ?? "").trim().toLowerCase();
  const ownerBondteam = String(row.huidige_eigenaar_bondteam ?? "").trim();

  if (type === "official") {
    return ownerBondteam ? `Official · ${ownerBondteam}` : "Official";
  }

  if (type === "bondteam") {
    return ownerBondteam ? `Bondteam · ${ownerBondteam}` : "Bondteam";
  }

  if (type === "admin") return "Admin";
  if (type === "matchmaker") return "Matchmaker";

  return "Onbekend";
}

function normalizedStadium(row: Pick<MatchmakingRow, "stadium" | "status">) {
  return String(row.stadium ?? row.status ?? "")
    .trim()
    .toLowerCase();
}

function getOfficialOverviewTab(row: MatchmakingRow): ActiveTab {
  const stadium = normalizedStadium(row);
  const status = String(row.status ?? "")
    .trim()
    .toLowerCase();
  const finalStatus = String(row.final_status ?? "")
    .trim()
    .toLowerCase();
  const runStatus = String(row.laatste_run?.status ?? "")
    .trim()
    .toLowerCase();
  const uitslagenRunStatus = String(row.uitslagen_run_status ?? "")
    .trim()
    .toLowerCase();

  // Zodra uitslagen naar admin zijn gestuurd/gefinaliseerd, is de matchmaking klaar.
  // Die hoort niet meer bij In uitslagen, maar in Archief.
  if (
    stadium === "uitslagen_definitief" ||
    status === "uitslagen_definitief" ||
    finalStatus === "uitslagen_definitief" ||
    runStatus === "afgerond" ||
    uitslagenRunStatus === "afgerond" ||
    status === "afgerond" ||
    stadium === "afgerond" ||
    row.is_archived === true ||
    !!row.results_finalized_at
  ) {
    return "archive";
  }

  // Zodra de matchmaking naar uitslagen is gezet, hoort hij niet meer tussen
  // Ontvangen of Definitieve lineup, maar in de aparte tab In uitslagen.
  if (
    stadium === "klaar_voor_uitslagen" ||
    stadium === "uitslagen_in_bewerking" ||
    status === "klaar_voor_uitslagen" ||
    status === "uitslagen_in_bewerking" ||
    uitslagenRunStatus === "open" ||
    uitslagenRunStatus === "concept" ||
    uitslagenRunStatus === "in_bewerking"
  ) {
    return "results";
  }

  // Weegstation zelf heeft een eigen pagina/flow.
  // Alleen nadat finalize de weging heeft verwerkt, komt de matchmaking hier terug
  // onder Definitieve lineup.
  if (
    stadium === "weegstation_verwerkt" ||
    stadium === "weging_afgesloten" ||
    status === "klaar_voor_definitieve_lineup" ||
    status === "definitieve_lineup"
  ) {
    return "lineup";
  }

  return row.tab === "uploaded" ? "uploaded" : "received";
}

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 text-sm font-extrabold tracking-[0.02em] transition"
      style={{
        borderRadius: 0,
        minWidth: 240,
        background: active
          ? "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)"
          : "linear-gradient(180deg, #f2f2f2 0%, #cfcfcf 48%, #a8a8a8 100%)",
        color: active ? "#fff" : "#161616",
        border: active
          ? "1px solid rgba(150,40,0,0.55)"
          : "1px solid rgba(82,82,91,0.45)",
        boxShadow: active
          ? "inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 22px rgba(255,77,0,0.18)"
          : "inset 0 1px 0 rgba(255,255,255,0.85), 0 10px 18px rgba(0,0,0,0.10)",
      }}
    >
      {label} <span style={{ opacity: 0.9 }}>({count})</span>
    </button>
  );
}

export default function OfficialsOverzichtPage() {
  const [rows, setRows] = useState<MatchmakingRow[]>([]);
  const [bondteam, setBondteam] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayTitle, setOverlayTitle] = useState("Even wachten");
  const [overlayMessage, setOverlayMessage] = useState("");
  const [overlaySubMessage, setOverlaySubMessage] = useState(
    "Sluit deze pagina niet af totdat de resultaten zijn geladen."
  );

  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterName, setFilterName] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const [activeTab, setActiveTab] = useState<ActiveTab>("received");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await authedFetch(API_OVERVIEW, {
        method: "GET",
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setRows([]);
        setBondteam("");
        setErrorMsg(json?.error ?? "Official overzicht laden mislukt.");
        return;
      }

      const nextRows = Array.isArray(json?.rows) ? json.rows : [];

      // Haal uitslagen_runs apart op. Het endpoint /api/officials/matchmakings-overzicht
      // geeft bij laatste_run meestal de controle-run terug, niet de uitslagen-run.
      // Daardoor verdwenen afgeronde uitslagen soms uit Archief.
      const matchmakingIds = Array.from(
        new Set(
          nextRows
            .map((r: any) => String(r?.id ?? "").trim())
            .filter(Boolean)
        )
      );

      let rowsWithUitslagen = nextRows;
      if (matchmakingIds.length > 0) {
        const { data: uitslagenRuns, error: uitslagenRunError } = await supabase
          .from("uitslagen_runs")
          .select("id, matchmaking_id, status")
          .in("matchmaking_id", matchmakingIds);

        if (!uitslagenRunError) {
          const runByMatchmakingId = new Map(
            (uitslagenRuns ?? []).map((run: any) => [String(run.matchmaking_id), run])
          );

          rowsWithUitslagen = nextRows.map((row: any) => {
            const uitslagenRun: any = runByMatchmakingId.get(String(row.id));
            return {
              ...row,
              uitslagen_run_id: uitslagenRun?.id ?? null,
              uitslagen_run_status: uitslagenRun?.status ?? null,
            };
          });
        } else {
          console.warn("Uitslagen-runs laden mislukt:", uitslagenRunError.message);
        }
      }

      setRows(rowsWithUitslagen);
      setBondteam(String(json?.bondteam ?? "").trim());
    } catch (e: any) {
      console.error("Fout bij laden official overzicht:", e);
      setRows([]);
      setBondteam("");
      setErrorMsg(e?.message ?? "Official overzicht laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (loading) return;
    if (isBusy) return;

    const hasRunning = rows.some((r) =>
      isRunningStatus(r.laatste_run?.status ?? r.stadium ?? r.status)
    );

    if (!hasRunning) return;

    const timer = window.setInterval(() => {
      void load();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [rows, loading, isBusy]);

  async function startControle(matchmakingId: string) {
    try {
      setIsBusy(true);
      setBusyId(matchmakingId);
      setOverlayTitle("Controle loopt");
      setOverlayMessage("Wacht op resultaten... Fightpaspoort controle loopt.");
      setOverlaySubMessage(
        "Sluit deze pagina niet af totdat de resultaten zijn geladen."
      );
      setOverlayOpen(true);

      const res = await authedFetch(API_START_CONTROLE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          do_scrape: true,
          scrape_mode: "auto",
          reset_before_run: true,
          workers: 8,
          stagger_ms: 250,
          tab_attempts: 8,
          soft_wait_ms: 900,
          between_attempts_ms: 450,
          fullfighter_timeout_ms: 35000,
          uitslagen_timeout_ms: 90000,
          uitslagen_tries: 1,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.error ?? "Start controle mislukt.");
        return;
      }

      setOverlayMessage("Resultaten worden geladen...");
      await load();
    } finally {
      setBusyId(null);
      setIsBusy(false);
      setOverlayOpen(false);
      setOverlayMessage("");
      setOverlayTitle("Even wachten");
      setOverlaySubMessage(
        "Sluit deze pagina niet af totdat de resultaten zijn geladen."
      );
    }
  }

  async function naarUitslagen(matchmakingId: string) {
    const ok = window.confirm(
      "Wil je deze definitieve lineup omzetten naar uitslagen? Alleen partijen met eindstatus OK worden meegenomen."
    );
    if (!ok) return;

    try {
      setIsBusy(true);
      setBusyId(matchmakingId);
      setOverlayTitle("Naar uitslagen");
      setOverlayMessage("Definitieve lineup wordt omgezet naar uitslagen...");
      setOverlaySubMessage("Alleen partijen met eindstatus OK worden meegenomen.");
      setOverlayOpen(true);

      const res = await authedFetch(API_NAAR_UITSLAGEN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: matchmakingId }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.error ?? "Omzetten naar uitslagen mislukt.");
        return;
      }

      setOverlayMessage("Uitslagen zijn aangemaakt. Pagina wordt geopend...");
      window.location.href = `/dashboard/officials/uitslagen/${matchmakingId}`;
    } finally {
      setBusyId(null);
      setIsBusy(false);
      setOverlayOpen(false);
      setOverlayMessage("");
      setOverlayTitle("Even wachten");
      setOverlaySubMessage(
        "Sluit deze pagina niet af totdat de resultaten zijn geladen."
      );
    }
  }

  async function deleteMatchmaking(row: MatchmakingRow) {
    const ok = window.confirm(
      `Weet je zeker dat je deze matchmaking + alle controle data wilt verwijderen?\n\n${row.naam ?? "Onbekend evenement"}`
    );
    if (!ok) return;

    try {
      setIsBusy(true);
      setBusyId(row.id);
      setOverlayTitle("Verwijderen");
      setOverlayMessage("Matchmaking en controledata worden verwijderd...");
      setOverlaySubMessage("Even wachten tot verwijderen klaar is.");
      setOverlayOpen(true);

      const res = await authedFetch(API_DELETE_MATCHMAKING, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: row.id }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert(json?.error ?? "Verwijderen mislukt.");
        return;
      }

      setOverlayMessage("Overzicht wordt bijgewerkt...");
      await load();
    } finally {
      setBusyId(null);
      setIsBusy(false);
      setOverlayOpen(false);
      setOverlayMessage("");
      setOverlayTitle("Even wachten");
      setOverlaySubMessage(
        "Sluit deze pagina niet af totdat de resultaten zijn geladen."
      );
    }
  }


  async function verplaatsNaarAdminArchief(row: MatchmakingRow) {
    const ok = window.confirm(
      `Deze afgeronde matchmaking wordt uit het officials-archief gehaald en naar Admin Archief verplaatst.\n\n${row.naam ?? "Onbekend evenement"}`
    );
    if (!ok) return;

    try {
      setIsBusy(true);
      setBusyId(row.id);
      setOverlayTitle("Naar admin archief");
      setOverlayMessage("Matchmaking wordt naar Admin Archief verplaatst...");
      setOverlaySubMessage("De matchmaking blijft bewaard en wordt niet definitief verwijderd.");
      setOverlayOpen(true);

      const res = await authedFetch(API_VERPLAATS_NAAR_ADMIN_ARCHIEF, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: row.id }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        alert(json?.error ?? "Verplaatsen naar admin archief mislukt.");
        return;
      }

      setOverlayMessage("Overzicht wordt bijgewerkt...");
      await load();
    } finally {
      setBusyId(null);
      setIsBusy(false);
      setOverlayOpen(false);
      setOverlayMessage("");
      setOverlayTitle("Even wachten");
      setOverlaySubMessage(
        "Sluit deze pagina niet af totdat de resultaten zijn geladen."
      );
    }
  }

  const monthOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => getMonthKey(r.datum)).filter(Boolean))
    ).sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const statusOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows.map((r) =>
          normalizeStatus(
            r.uitslagen_run_status ?? r.laatste_run?.status ?? r.stadium ?? r.status ?? "Niet gecontroleerd"
          )
        )
      )
    ).sort((a, b) => a.localeCompare(b, "nl"));
  }, [rows]);

  const uploadedCount = useMemo(
    () => rows.filter((r) => getOfficialOverviewTab(r) === "uploaded").length,
    [rows]
  );

  const receivedCount = useMemo(
    () => rows.filter((r) => getOfficialOverviewTab(r) === "received").length,
    [rows]
  );

  const lineupCount = useMemo(
    () => rows.filter((r) => getOfficialOverviewTab(r) === "lineup").length,
    [rows]
  );

  const resultsCount = useMemo(
    () => rows.filter((r) => getOfficialOverviewTab(r) === "results").length,
    [rows]
  );

  const archiveCount = useMemo(
    () => rows.filter((r) => getOfficialOverviewTab(r) === "archive").length,
    [rows]
  );

  const tabRows = useMemo(() => {
    return rows.filter((r) => getOfficialOverviewTab(r) === activeTab);
  }, [rows, activeTab]);

  const filteredRows = useMemo(() => {
    const nameNeedle = filterName.trim().toLowerCase();

    return tabRows.filter((r) => {
      const rowMonth = getMonthKey(r.datum);
      const rowEvent = (r.naam ?? "").trim().toLowerCase();
      const rowStatus = normalizeStatus(
        r.uitslagen_run_status ?? r.laatste_run?.status ?? r.stadium ?? r.status ?? "Niet gecontroleerd"
      );

      if (filterMonth && rowMonth !== filterMonth) return false;
      if (filterStatus && rowStatus !== filterStatus) return false;
      if (nameNeedle && !rowEvent.includes(nameNeedle)) return false;

      return true;
    });
  }, [tabRows, filterMonth, filterName, filterStatus]);

  const hasActiveFilters = !!filterMonth || !!filterName || !!filterStatus;

  function resetFilters() {
    setFilterMonth("");
    setFilterName("");
    setFilterStatus("");
  }

  return (
    <main className="min-h-screen px-4 py-6" style={{ background: "#eef0f3" }}>
      <div className="mx-auto w-full max-w-[1650px]">
        <div
          className="rounded-[32px] p-[6px]"
          style={{
            background:
              "linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 22%, #8f8f8f 55%, #f0f0f0 100%)",
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.7),
              0 22px 70px rgba(0,0,0,0.9)
            `,
          }}
        >
          <div
            className="relative overflow-hidden rounded-[28px]"
            style={{
              background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
              border: "3px solid rgba(63,63,70,0.35)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            <div
              className="px-6 py-5"
              style={{
                background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                borderBottom: `3px solid rgba(255,77,0,0.55)`,
              }}
            >
              <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto_1fr]">
                <div className="justify-self-start">
                  <div className="leading-tight">
                    <div
                      className="font-extrabold uppercase"
                      style={{
                        fontSize: 28,
                        letterSpacing: "0.04em",
                        color: NVB_ORANGE,
                        textShadow: "0 6px 18px rgba(0,0,0,0.45)",
                      }}
                    >
                      Officials · Matchmakings
                    </div>
                    <div className="mt-1 text-sm text-white/85">
                      Overzicht op basis van tabel <strong>matchmakings</strong>
                    </div>
                    <div className="mt-1 text-sm text-white/70">
                      Alleen huidige eigenaar bondteam/official · bondteam{" "}
                      <strong>{bondteam || "-"}</strong>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Small origin="left center">
                      <NvbLightButton
                        label="← Terug naar Officials"
                        onClick={() =>
                          (window.location.href = "/dashboard/officials")
                        }
                      />
                    </Small>

                    <Small origin="left center">
                      <NvbDarkButton
                        label="Upload MM"
                        onClick={() =>
                          (window.location.href = "/dashboard/officials/upload")
                        }
                      />
                    </Small>

                    <Small origin="left center">
                      <NvbDarkButton label="Ververs" onClick={() => void load()} />
                    </Small>
                  </div>
                </div>

                <div className="justify-self-center">
                  <div className="w-[240px] md:w-[280px] xl:w-[320px]">
                    <img
                      src="/branding/fightsupport/excel-logo.png"
                      alt="FightSupport"
                      width={320}
                      height={120}
                      loading="eager"
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                        filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.45))",
                      }}
                    />
                  </div>
                </div>

                <div className="flex min-w-[240px] flex-col items-end gap-2 justify-self-end">
                  <div
                    className="rounded-2xl px-4 py-3 text-right text-xs"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      color: "#fff",
                    }}
                  >
                    <div className="uppercase tracking-[0.14em] text-white/70">
                      Actief bondteam
                    </div>
                    <div className="mt-1 text-base font-bold">
                      {bondteam || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-6 md:px-6">
              <div
                className="rounded-3xl border-2 border-zinc-500/60 p-4 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50 md:p-5"
                style={silverBackplate}
              >
                <div className="px-2 py-2 md:px-3">
                  <div className="mb-5 flex flex-wrap items-center justify-center gap-3">
                    <TabButton
                      active={activeTab === "received"}
                      label="Ontvangen matchmakings"
                      count={receivedCount}
                      onClick={() => setActiveTab("received")}
                    />
                    <TabButton
                      active={activeTab === "lineup"}
                      label="Definitieve lineup"
                      count={lineupCount}
                      onClick={() => setActiveTab("lineup")}
                    />
                    <TabButton
                      active={activeTab === "results"}
                      label="In uitslagen"
                      count={resultsCount}
                      onClick={() => setActiveTab("results")}
                    />
                    <TabButton
                      active={activeTab === "archive"}
                      label="Archief"
                      count={archiveCount}
                      onClick={() => setActiveTab("archive")}
                    />
                    <TabButton
                      active={activeTab === "uploaded"}
                      label="Eigen uploads"
                      count={uploadedCount}
                      onClick={() => setActiveTab("uploaded")}
                    />
                  </div>

                  {errorMsg ? (
                    <div
                      className="mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold"
                      style={{
                        background: "rgba(220,38,38,0.10)",
                        color: "#991b1b",
                        borderColor: "rgba(220,38,38,0.28)",
                      }}
                    >
                      ❌ {errorMsg}
                    </div>
                  ) : null}

                  {!loading && (
                    <div
                      className="rounded-[24px] border p-4 md:p-4"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(239,242,246,0.98) 100%)",
                        borderColor: "rgba(90,90,95,0.22)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 24px rgba(0,0,0,0.08)",
                      }}
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-700">
                            Filters
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {activeTab === "received"
                              ? "Ontvangen matchmakings die nu bij dit bondteam in beheer zijn"
                              : activeTab === "lineup"
                              ? "Weging verwerkt: klaar voor definitieve lineup en daarna uitslagen"
                              : activeTab === "results"
                              ? "Matchmakings waarvan de uitslagen nog ingevoerd of gecorrigeerd worden"
                              : activeTab === "archive"
                              ? "Afgeronde matchmakings waarvan de uitslagen naar admin zijn gestuurd"
                              : "Eigen official uploads die nu bij dit bondteam in beheer zijn"}
                          </div>
                        </div>

                        <div className="text-sm text-zinc-600">
                          {filteredRows.length} van {tabRows.length} zichtbaar
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[180px_minmax(240px,1fr)_180px_180px]">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            Maand
                          </label>
                          <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
                            style={{
                              borderColor: "rgba(63,63,70,0.22)",
                              background: "#fff",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
                            }}
                          >
                            <option value="">Alle maanden</option>
                            {monthOptions.map((monthKey) => (
                              <option key={monthKey} value={monthKey}>
                                {formatMonthLabel(monthKey)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            Naam event
                          </label>
                          <input
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                            placeholder="Zoek evenement"
                            className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
                            style={{
                              borderColor: "rgba(63,63,70,0.22)",
                              background: "#fff",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
                            }}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            Status
                          </label>
                          <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
                            style={{
                              borderColor: "rgba(63,63,70,0.22)",
                              background: "#fff",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
                            }}
                          >
                            <option value="">Alle statussen</option>
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {formatStatusLabel(status)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-end">
                          <button
                            onClick={resetFilters}
                            disabled={!hasActiveFilters}
                            className="h-10 w-full rounded-xl border bg-[#2f2f33] px-3 text-sm text-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                            style={{
                              borderColor: hasActiveFilters
                                ? "rgba(255,77,0,0.65)"
                                : "rgba(63,63,70,0.22)",
                            }}
                          >
                            Filters wissen
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <p className="mt-6 text-center text-gray-500">Laden…</p>
                  ) : (
                    <div
                      className="mt-5 overflow-hidden rounded-2xl"
                      style={{
                        border: "2px solid rgba(230,230,230,0.55)",
                        background:
                          "linear-gradient(180deg, rgba(18,18,18,0.18) 0%, rgba(10,10,10,0.22) 100%)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                      }}
                    >
                      <div
                        className="h-[3px]"
                        style={{ background: "rgba(255,77,0,0.75)" }}
                      />

                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                          <thead
                            style={{
                              background:
                                "linear-gradient(180deg, #ff6a00 0%, #ff5400 100%)",
                              color: "#fff",
                              borderBottom:
                                "2px solid rgba(255,255,255,0.35)",
                            }}
                          >
                            <tr>
                              <th className="px-4 py-3 text-left">Datum</th>
                              <th className="px-4 py-3 text-left">Evenement</th>
                              <th className="px-4 py-3 text-left">Bron</th>
                              <th className="px-4 py-3 text-left">Eigenaar</th>
                              <th className="px-4 py-3 text-left">Bondteam</th>
                              <th className="px-4 py-3 text-left">
                                Laatst bijgewerkt
                              </th>
                              <th className="px-4 py-3 text-left">Acties</th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredRows.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="px-4 py-8 text-center text-sm"
                                  style={{ background: "#ffffff", color: "#555" }}
                                >
                                  {activeTab === "received"
                                    ? "Geen ontvangen matchmakings gevonden."
                                    : activeTab === "lineup"
                                    ? "Geen matchmakings klaar voor definitieve lineup gevonden."
                                    : activeTab === "results"
                                    ? "Geen matchmakings in uitslagen gevonden."
                                    : activeTab === "archive"
                                    ? "Geen afgeronde matchmakings in archief gevonden."
                                    : "Geen eigen official uploads gevonden."}
                                </td>
                              </tr>
                            ) : (
                              filteredRows.map((r, i) => {
                                const zebra = i % 2 === 0;
                                const rowBusy = busyId === r.id;
                                const rowStatus =
                                  r.laatste_run?.status ??
                                  r.uitslagen_run_status ??
                                  r.stadium ??
                                  r.status ??
                                  "Niet gecontroleerd";

                                return (
                                  <tr
                                    key={r.id}
                                    style={{
                                      backgroundColor: zebra
                                        ? "#ffffff"
                                        : "#0d0d0d",
                                      color: zebra ? "#000" : "#fff",
                                    }}
                                  >
                                    <td className="px-4 py-3">
                                      {formatDate(r.datum)}
                                    </td>

                                    <td className="px-4 py-3 font-semibold">
                                      <div>{r.naam ?? "-"}</div>
                                      {r.locatie ? (
                                        <div className="text-xs opacity-75">
                                          {r.locatie}
                                        </div>
                                      ) : null}
                                    </td>

                                    <td className="px-4 py-3">
                                      {formatBronLabel(r.bron_type)}
                                    </td>

                                    <td className="px-4 py-3">
                                      {formatOwnerLabel(r)}
                                    </td>

                                    <td className="px-4 py-3">
                                      {r.bondteam ??
                                        r.huidige_eigenaar_bondteam ??
                                        "-"}
                                    </td>

                                    <td className="px-4 py-3 text-sm">
                                      <div>{formatDateTime(r.last_updated_at)}</div>
                                      <div className="text-xs opacity-75">
                                        {formatStatusLabel(rowStatus)}
                                      </div>
                                    </td>

                                    <td className="px-4 py-3">
                                      <div className="flex flex-wrap items-center gap-3">
                                        <Link
                                          href={`/dashboard/officials/controle/${r.id}`}
                                          className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black"
                                        >
                                          Matchmaking
                                        </Link>

                                        {activeTab === "uploaded" ? (
                                          <button
                                            onClick={() => startControle(r.id)}
                                            disabled={rowBusy || isBusy}
                                            className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60"
                                            title="Start volledige controle"
                                          >
                                            {rowBusy && isBusy
                                              ? "Bezig…"
                                              : isRunningStatus(rowStatus)
                                              ? "Controle loopt…"
                                              : "Start controle"}
                                          </button>
                                        ) : null}

                                        {activeTab === "lineup" ? (
                                          <button
                                            onClick={() => naarUitslagen(r.id)}
                                            disabled={rowBusy || isBusy}
                                            className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60"
                                            title="Zet definitieve lineup om naar uitslagen"
                                          >
                                            {rowBusy && isBusy ? "Bezig…" : "Naar uitslagen"}
                                          </button>
                                        ) : null}

                                        {activeTab === "results" ? (
                                          <Link
                                            href={`/dashboard/officials/uitslagen/${r.id}`}
                                            className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black"
                                          >
                                            Uitslagen openen
                                          </Link>
                                        ) : null}

                                        {activeTab === "archive" ? (
                                          <>
                                            <Link
                                              href={`/dashboard/officials/uitslagen/inzien/${r.id}`}
                                              className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black"
                                            >
                                              Uitslagen inzien
                                            </Link>

                                            <button
                                              onClick={() => verplaatsNaarAdminArchief(r)}
                                              disabled={rowBusy || isBusy}
                                              className="rounded border border-red-600 bg-[#2f2f33] px-3 py-1 text-sm text-red-200 hover:bg-red-600 hover:text-white disabled:opacity-60"
                                              title="Verplaatst deze afgeronde matchmaking naar Admin Archief"
                                            >
                                              {rowBusy && isBusy ? "Bezig…" : "Verwijderen"}
                                            </button>
                                          </>
                                        ) : null}

                                        {activeTab !== "archive" ? (
                                          <button
                                            onClick={() => deleteMatchmaking(r)}
                                            disabled={rowBusy || isBusy}
                                            className="rounded border border-red-600 bg-[#2f2f33] px-3 py-1 text-sm text-red-200 hover:bg-red-600 hover:text-white disabled:opacity-60"
                                            title="Verwijdert deze matchmaking met gekoppelde controledata"
                                          >
                                            {rowBusy && isBusy ? "Bezig…" : "Verwijderen"}
                                          </button>
                                        ) : null}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <p className="mt-7 text-center text-xs text-zinc-500">
                    © FightSupport
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {overlayOpen ? (
          <div style={scrapeOverlay}>
            <div style={scrapeOverlayCard}>
              <div style={scrapeSpinnerWrap}>
                <div style={scrapeSpinnerOuter} />
                <div style={scrapeSpinnerInner} />
              </div>

              <div style={scrapeOverlayTitle}>{overlayTitle}</div>
              <div style={scrapeOverlayTextStyle}>
                {overlayMessage || "Wacht op resultaten..."}
              </div>
              <div style={scrapeOverlaySub}>{overlaySubMessage}</div>
            </div>
          </div>
        ) : null}

        <style jsx global>{`
          :root {
            --brand-orange: ${NVB_ORANGE};
          }

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
      </div>
    </main>
  );
}

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
  background:
    "linear-gradient(180deg, rgba(10,14,20,0.98) 0%, rgba(3,7,12,0.98) 100%)",
  boxShadow:
    "0 28px 80px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.08)",
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