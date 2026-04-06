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
import { authedFetch } from "@/lib/api/authedFetch";

import NvbLightButton from "@/components/NvbLightButton";
import NvbDarkButton from "@/components/NvbDarkButton";

const NVB_ORANGE = "#ff4d00";

/**
 * Bestaande routes
 */
const API_UPLOADED = "/api/officials/uploaded-matchmakings";
const API_RELEASED = "/api/officials/released-matchmakings";
const API_START_CONTROLE = "/api/officials/start";
const API_DELETE_MATCHMAKING = "/api/control-engine/delete-matchmaking";

const silverBackplate: CSSProperties = {
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 38%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(236,238,242,0.98) 100%)",
};

interface ControleRun {
  id: string;
  matchmaking_id: string;
  status: string;
  gestart_op: string | null;
  afgerond_op: string | null;
  run_type: string | null;
}

interface OfficialQueueJob {
  id: string;
  matchmaking_id: string;
  status: "queued" | "running" | "done" | "failed" | "cancelled" | string;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  controle_run_id: string | null;
  error_message: string | null;
}

interface UploadRow {
  id: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  locatie: string | null;

  matchmaking_id: string | null;
  official_release?: boolean | null;
  official_released_at?: string | null;

  matchmaker: string | null;
  promotor: string | null;
  bondteam: string | null;

  uploaded_at?: string | null;
  uploaded_by?: string | null;

  laatste_run: ControleRun | null;
  actieve_queue_job: OfficialQueueJob | null;

  flow_status?: string | null;
  naar_weegstation?: boolean | null;
  naar_weegstation_at?: string | null;
  weegstation_started_at?: string | null;
  in_lineup?: boolean | null;
  lineup?: boolean | null;
  definitive_id?: string | null;
  definitive_matchmaking_id?: string | null;
}

type ActiveTab = "uploaded" | "released";

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

function getQueueStatusLabel(job: OfficialQueueJob | null, run: ControleRun | null) {
  if (job?.status === "queued") return "in wachtrij";
  if (job?.status === "running") return "bezig";
  if (job?.status === "failed") return "mislukt";
  if (job?.status === "done") return "klaar";
  if (job?.status === "cancelled") return "geannuleerd";

  if (run?.status === "klaar") return "klaar";
  if (run?.status === "failed") return "failed";
  if (run?.status === "running") return "bezig";
  if (run?.status) return run.status;

  return "nieuw";
}

function getQueueStatusStyle(
  job: OfficialQueueJob | null,
  run: ControleRun | null
): CSSProperties {
  const label = getQueueStatusLabel(job, run);

  if (label === "in wachtrij") {
    return {
      background: "rgba(255, 193, 7, 0.16)",
      color: "#7a5400",
      border: "1px solid rgba(255, 193, 7, 0.45)",
    };
  }

  if (label === "bezig") {
    return {
      background: "rgba(255, 77, 0, 0.14)",
      color: "#b63b00",
      border: "1px solid rgba(255, 77, 0, 0.45)",
    };
  }

  if (label === "klaar") {
    return {
      background: "rgba(34, 197, 94, 0.14)",
      color: "#166534",
      border: "1px solid rgba(34, 197, 94, 0.45)",
    };
  }

  if (label === "mislukt" || label === "failed") {
    return {
      background: "rgba(220, 38, 38, 0.14)",
      color: "#991b1b",
      border: "1px solid rgba(220, 38, 38, 0.45)",
    };
  }

  if (label === "geannuleerd") {
    return {
      background: "rgba(120,120,120,0.12)",
      color: "#444",
      border: "1px solid rgba(120,120,120,0.28)",
    };
  }

  return {
    background: "rgba(59,130,246,0.14)",
    color: "#1d4ed8",
    border: "1px solid rgba(59,130,246,0.40)",
  };
}

function getFlowStatusLabel(
  row: UploadRow
): "ontvangen" | "naar weegstation" | "in lineup" {
  const explicit = String(row.flow_status ?? "").trim().toLowerCase();

  if (explicit === "in lineup" || explicit === "lineup" || explicit === "definitief") {
    return "in lineup";
  }

  if (
    explicit === "naar weegstation" ||
    explicit === "weegstation" ||
    explicit === "in weegstation"
  ) {
    return "naar weegstation";
  }

  if (row.in_lineup || row.lineup || row.definitive_id || row.definitive_matchmaking_id) {
    return "in lineup";
  }

  if (row.naar_weegstation || row.naar_weegstation_at || row.weegstation_started_at) {
    return "naar weegstation";
  }

  return "ontvangen";
}

function getFlowStatusStyle(
  flow: "ontvangen" | "naar weegstation" | "in lineup"
): CSSProperties {
  if (flow === "in lineup") {
    return {
      background: "rgba(34, 197, 94, 0.14)",
      color: "#166534",
      border: "1px solid rgba(34, 197, 94, 0.45)",
    };
  }

  if (flow === "naar weegstation") {
    return {
      background: "rgba(255, 77, 0, 0.14)",
      color: "#b63b00",
      border: "1px solid rgba(255, 77, 0, 0.45)",
    };
  }

  return {
    background: "rgba(59,130,246,0.14)",
    color: "#1d4ed8",
    border: "1px solid rgba(59,130,246,0.40)",
  };
}

function sortRows(rows: UploadRow[]) {
  return [...rows].sort((a, b) => {
    const aTime = new Date(
      a.official_released_at ?? a.uploaded_at ?? a.evenement_datum ?? 0
    ).getTime();
    const bTime = new Date(
      b.official_released_at ?? b.uploaded_at ?? b.evenement_datum ?? 0
    ).getTime();
    return bTime - aTime;
  });
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
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition"
      style={{
        background: active
          ? `linear-gradient(180deg, #ff8a36 0%, ${NVB_ORANGE} 100%)`
          : "linear-gradient(180deg, rgba(58,58,63,1) 0%, rgba(42,42,46,1) 100%)",
        color: "#fff",
        border: active
          ? "1px solid rgba(255,255,255,0.40)"
          : "1px solid rgba(255,255,255,0.18)",
        boxShadow: active
          ? "0 0 18px rgba(255,77,0,0.35)"
          : "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <span>{label}</span>
      <span
        className="inline-flex min-w-[28px] justify-center rounded-full px-2 py-[2px] text-[11px] font-extrabold"
        style={{
          background: active ? "rgba(0,0,0,0.24)" : "rgba(255,255,255,0.10)",
          color: "#fff",
        }}
      >
        {count}
      </span>
    </button>
  );
}

export default function ControleOverzichtPage() {
  const [uploadedRows, setUploadedRows] = useState<UploadRow[]>([]);
  const [releasedRows, setReleasedRows] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("uploaded");
  const [busyStartIds, setBusyStartIds] = useState<string[]>([]);
  const [busyDeleteIds, setBusyDeleteIds] = useState<string[]>([]);

  useEffect(() => {
    void loadAll(true);

    const t = setInterval(() => {
      void loadAll(false);
    }, 5000);

    return () => clearInterval(t);
  }, []);

  async function loadAll(showLoader = true) {
    if (showLoader) setLoading(true);
    setErrorMsg("");

    try {
      const [uploadedRes, releasedRes] = await Promise.allSettled([
        authedFetch(API_UPLOADED, { method: "GET" }),
        authedFetch(API_RELEASED, { method: "GET" }),
      ]);

      let uploaded: UploadRow[] = [];
      let released: UploadRow[] = [];
      let firstError = "";

      if (uploadedRes.status === "fulfilled") {
        const json = await uploadedRes.value.json().catch(() => ({}));
        if (!uploadedRes.value.ok) {
          firstError =
            json?.error ?? "Laden van officieel geüploade matchmakings mislukt.";
        } else {
          uploaded = Array.isArray(json?.rows) ? json.rows : [];
        }
      } else {
        firstError = "Laden van officieel geüploade matchmakings mislukt.";
      }

      if (releasedRes.status === "fulfilled") {
        const json = await releasedRes.value.json().catch(() => ({}));
        if (!releasedRes.value.ok && !firstError) {
          firstError =
            json?.error ?? "Laden van doorgestuurde matchmakings mislukt.";
        } else if (releasedRes.value.ok) {
          released = Array.isArray(json?.rows) ? json.rows : [];
        }
      } else if (!firstError) {
        firstError = "Laden van doorgestuurde matchmakings mislukt.";
      }

      setUploadedRows(uploaded);
      setReleasedRows(released);
      setErrorMsg(firstError);
    } catch (e: any) {
      console.error("Fout bij laden official overzicht:", e);
      setUploadedRows([]);
      setReleasedRows([]);
      setErrorMsg(
        e?.message ??
          "Laden official overzicht mislukt. Controleer routes / rechten / API-response."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleStartControle(row: UploadRow) {
    const mmId = String(row.matchmaking_id ?? "").trim();
    if (!mmId) {
      alert("Geen matchmaking_id gevonden.");
      return;
    }

    setBusyStartIds((prev) => [...prev, mmId]);

    try {
      const res = await authedFetch(API_START_CONTROLE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: mmId,
          do_scrape: true,
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

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error ?? "Start controle mislukt.");
      }

      if (json?.already_exists) {
        alert(
          json?.message ??
            "Voor deze matchmaking staat al een officials-controle in de wachtrij of draait er al één."
        );
      }

      await loadAll(false);
    } catch (e: any) {
      console.error("Start controle fout:", e);
      alert(e?.message ?? "Start controle mislukt.");
    } finally {
      setBusyStartIds((prev) => prev.filter((id) => id !== mmId));
    }
  }

  async function handleDelete(row: UploadRow) {
    const mmId = String(row.matchmaking_id ?? "").trim();
    if (!mmId) {
      alert("Geen matchmaking_id gevonden.");
      return;
    }

    const ok = window.confirm(
      `Weet je zeker dat je deze matchmaking wilt verwijderen?\n\n${row.evenement_naam ?? "Onbekend evenement"}`
    );
    if (!ok) return;

    setBusyDeleteIds((prev) => [...prev, mmId]);

    try {
      const res = await authedFetch(API_DELETE_MATCHMAKING, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: mmId }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error ?? "Verwijderen mislukt.");
      }

      await loadAll(false);
    } catch (e: any) {
      console.error("Verwijderen fout:", e);
      alert(e?.message ?? "Verwijderen mislukt.");
    } finally {
      setBusyDeleteIds((prev) => prev.filter((id) => id !== mmId));
    }
  }

  const visibleUploadedRows = useMemo(() => sortRows(uploadedRows), [uploadedRows]);
  const visibleReleasedRows = useMemo(() => sortRows(releasedRows), [releasedRows]);

  const currentRows =
    activeTab === "uploaded" ? visibleUploadedRows : visibleReleasedRows;

  return (
    <main className="min-h-screen px-4 py-6" style={{ background: "#eef0f3" }}>
      <div className="mx-auto w-full max-w-[1500px]">
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
              <div className="grid grid-cols-3 items-center gap-4">
                <div className="justify-self-start leading-tight">
                  <div
                    className="font-extrabold tracking-[0.20em]"
                    style={{
                      fontSize: 14,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(230,230,230,0.75) 35%, rgba(150,150,150,0.55) 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      textShadow: "0 10px 26px rgba(0,0,0,0.35)",
                    }}
                  >
                    FIGHTSUPPORT
                  </div>

                  <div className="text-xs text-white/70">Vechtsport ondersteuning</div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Small origin="left center">
                      <NvbLightButton
                        label="← Terug naar Menu"
                        onClick={() => {
                          window.location.href = "/dashboard/officials";
                        }}
                      />
                    </Small>

                    <Small origin="left center">
                      <NvbDarkButton
                        label="Upload"
                        onClick={() => {
                          window.location.href = "/dashboard/officials/upload";
                        }}
                      />
                    </Small>

                    <Small origin="left center">
                      <NvbDarkButton
                        label="Ververs"
                        onClick={() => {
                          void loadAll(true);
                        }}
                      />
                    </Small>
                  </div>
                </div>

                <div className="justify-self-center">
                  <Image
                    src="/branding/fightsupport/excel-logo.png"
                    alt="FightSupport"
                    width={150}
                    height={150}
                    priority
                    style={{ width: "auto", height: "auto", objectFit: "contain" }}
                  />
                </div>

                <div className="justify-self-end" />
              </div>
            </div>

            <div className="px-4 py-6 md:px-6">
              <div
                className="rounded-3xl border-2 border-zinc-500/60 p-4 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50 md:p-5"
                style={silverBackplate}
              >
                <div className="px-2 py-2 md:px-3">
                  <div className="mt-2 text-center">
                    <h1
                      className="text-4xl font-extrabold tracking-wide md:text-5xl"
                      style={{
                        backgroundImage: `linear-gradient(180deg, #ff7a1a 0%, ${NVB_ORANGE} 45%, #c92c00 100%)`,
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        color: "transparent",
                        textShadow: `
                          0 2px 0 rgba(255,255,255,0.35),
                          0 8px 22px rgba(0,0,0,0.35)
                        `,
                      }}
                    >
                      Matchmaking overzicht
                    </h1>

                    <div
                      className="mx-auto mb-3 mt-4"
                      style={{
                        width: 200,
                        height: 4,
                        borderRadius: 999,
                        background: `linear-gradient(90deg, ${NVB_ORANGE} 0%, #ff7a1a 50%, ${NVB_ORANGE} 100%)`,
                        boxShadow: "0 0 16px rgba(255,77,0,0.65)",
                      }}
                    />

                    <p className="mt-2 text-sm text-zinc-700 md:text-base">
                      Overzicht van officiële uploads en doorgestuurde matchmakings
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <TabButton
                        active={activeTab === "uploaded"}
                        label="Officieel geüpload"
                        count={visibleUploadedRows.length}
                        onClick={() => setActiveTab("uploaded")}
                      />
                      <TabButton
                        active={activeTab === "released"}
                        label="Naar bond gestuurd"
                        count={visibleReleasedRows.length}
                        onClick={() => setActiveTab("released")}
                      />
                    </div>

                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600">
                      Actieve tab:{" "}
                      <span style={{ color: NVB_ORANGE }}>
                        {activeTab === "uploaded"
                          ? "Officieel geüpload"
                          : "Naar bond gestuurd"}
                      </span>
                    </div>
                  </div>

                  {errorMsg ? (
                    <div
                      className="mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold"
                      style={{
                        background: "rgba(220,38,38,0.10)",
                        color: "#991b1b",
                        borderColor: "rgba(220,38,38,0.28)",
                      }}
                    >
                      ❌ {errorMsg}
                    </div>
                  ) : null}

                  {loading ? (
                    <p className="mt-6 text-center text-gray-500">Laden…</p>
                  ) : (
                    <div
                      className="mt-6 overflow-hidden rounded-2xl"
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
                                "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                              color: "#fff",
                              borderBottom: "2px solid rgba(255,77,0,0.55)",
                            }}
                          >
                            <tr>
                              <th className="px-4 py-3 text-left">Datum</th>
                              <th className="px-4 py-3 text-left">Evenement</th>
                              <th className="px-4 py-3 text-left">Locatie</th>
                              <th className="px-4 py-3 text-left">Matchmaker</th>
                              <th className="px-4 py-3 text-left">Promotor</th>
                              <th className="px-4 py-3 text-left">Bondteam</th>
                              <th className="px-4 py-3 text-left">Status</th>
                              <th className="px-4 py-3 text-left">
                                {activeTab === "uploaded" ? "Geüpload" : "Doorgestuurd"}
                              </th>
                              <th className="px-4 py-3 text-left">Acties</th>
                            </tr>
                          </thead>

                          <tbody>
                            {currentRows.map((r, i) => {
                              const zebra = i % 2 === 0;
                              const run = r.laatste_run;
                              const queueJob = r.actieve_queue_job;
                              const hasMatchmaking = !!r.matchmaking_id;
                              const mmId = String(r.matchmaking_id ?? "");
                              const flowLabel = getFlowStatusLabel(r);
                              const startBusy = busyStartIds.includes(mmId);
                              const deleteBusy = busyDeleteIds.includes(mmId);

                              return (
                                <tr
                                  key={`${activeTab}-${r.id}-${mmId}`}
                                  style={{
                                    backgroundColor: zebra ? "#ffffff" : "#0d0d0d",
                                    color: zebra ? "#000" : "#fff",
                                  }}
                                >
                                  <td className="px-4 py-3">{formatDate(r.evenement_datum)}</td>

                                  <td className="px-4 py-3 font-semibold">
                                    {r.evenement_naam ?? "-"}
                                  </td>

                                  <td className="px-4 py-3">{r.locatie ?? "-"}</td>
                                  <td className="px-4 py-3">{r.matchmaker ?? "-"}</td>
                                  <td className="px-4 py-3">{r.promotor ?? "-"}</td>
                                  <td className="px-4 py-3">{r.bondteam ?? "-"}</td>

                                  <td className="px-4 py-3">
                                    <div className="flex flex-col items-start gap-2">
                                      <span
                                        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                                        style={getQueueStatusStyle(queueJob, run)}
                                      >
                                        {getQueueStatusLabel(queueJob, run)}
                                      </span>

                                      <span
                                        className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold"
                                        style={getFlowStatusStyle(flowLabel)}
                                      >
                                        {flowLabel}
                                      </span>
                                    </div>

                                    {queueJob?.status === "failed" && queueJob?.error_message ? (
                                      <div className="mt-1 text-xs opacity-80">
                                        {queueJob.error_message}
                                      </div>
                                    ) : null}
                                  </td>

                                  <td className="px-4 py-3 text-sm">
                                    {activeTab === "uploaded"
                                      ? formatDateTime(r.uploaded_at)
                                      : formatDateTime(r.official_released_at)}
                                  </td>

                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-2">
                                      {hasMatchmaking ? (
                                        <Link
                                          href={`/dashboard/officials/controle/${encodeURIComponent(mmId)}`}
                                          className="inline-flex rounded border border-orange-600 bg-[#151515] px-3 py-2 text-sm text-white transition hover:bg-orange-600 hover:text-black"
                                        >
                                          Matchmaking
                                        </Link>
                                      ) : (
                                        <span className="inline-flex rounded border border-white/15 bg-[#151515] px-3 py-2 text-sm text-white/40">
                                          Geen matchmaking
                                        </span>
                                      )}

                                      {activeTab === "uploaded" ? (
                                        <>
                                          <button
                                            type="button"
                                            disabled={!hasMatchmaking || startBusy}
                                            onClick={() => void handleStartControle(r)}
                                            className="inline-flex rounded border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                                            style={{
                                              borderColor: "rgba(255,77,0,0.75)",
                                              background: "#fff7f2",
                                              color: "#b63b00",
                                            }}
                                          >
                                            {startBusy ? "Toevoegen..." : "Start controle"}
                                          </button>

                                          <button
                                            type="button"
                                            disabled={!hasMatchmaking || deleteBusy}
                                            onClick={() => void handleDelete(r)}
                                            className="inline-flex rounded border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                                            style={{
                                              borderColor: "rgba(220,38,38,0.55)",
                                              background: "rgba(220,38,38,0.08)",
                                              color: "#991b1b",
                                            }}
                                          >
                                            {deleteBusy ? "Verwijderen..." : "Verwijderen"}
                                          </button>
                                        </>
                                      ) : null}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}

                            {currentRows.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={9}
                                  className="px-4 py-8 text-center text-zinc-500"
                                  style={{ background: "#ffffff" }}
                                >
                                  {activeTab === "uploaded"
                                    ? "Geen officiële uploads gevonden."
                                    : "Geen doorgestuurde matchmakings gevonden."}
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <style jsx global>{`
              :root {
                --brand-orange: ${NVB_ORANGE};
              }
            `}</style>
          </div>
        </div>
      </div>
    </main>
  );
}