"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { authedFetch } from "@/lib/api/authedFetch";

import NvbLightButton from "@/components/NvbLightButton";
import NvbDarkButton from "@/components/NvbDarkButton";

const NVB_ORANGE = "#ff4d00";

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
}

function formatDate(v: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("nl-NL");
}

function formatDateTime(v: string | null | undefined) {
  if (!v) return "-";
  return new Date(v).toLocaleString("nl-NL");
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
  if (job?.status === "done") return "doorgestuurd";
  if (run?.status === "klaar") return "klaar";
  if (run?.status === "failed") return "failed";
  if (run?.status) return run.status;
  return "nieuw";
}

function getQueueStatusStyle(job: OfficialQueueJob | null, run: ControleRun | null): CSSProperties {
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

  if (label === "klaar" || label === "doorgestuurd") {
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

  return {
    background: "rgba(120,120,120,0.12)",
    color: "#444",
    border: "1px solid rgba(120,120,120,0.28)",
  };
}

export default function ControleOverzichtPage() {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sportsBusy, setSportsBusy] = useState(false);
  const [sportsMsg, setSportsMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      void load(false);
    }, 5000);

    return () => clearInterval(t);
  }, []);

  async function load(showLoader = true) {
    if (showLoader) setLoading(true);
    setErrorMsg("");
    setSportsMsg("");

    try {
      const res = await authedFetch("/api/officials/released-matchmakings", {
        method: "GET",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          json?.error ??
            "Laden official overzicht mislukt. Controleer de route of permissies."
        );
      }

      setRows(Array.isArray(json?.rows) ? json.rows : []);
    } catch (e: any) {
      console.error("Fout bij laden official overzicht:", e);
      setRows([]);
      setErrorMsg(
        e?.message ??
          "Laden official overzicht mislukt. Controleer route / rechten / API-response."
      );
    } finally {
      setLoading(false);
    }
  }

  async function runSportscholen() {
    try {
      setSportsMsg("");
      setSportsBusy(true);

      const res = await authedFetch("/api/sportscholen/sync", {
        method: "POST",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSportsMsg(`❌ ${json?.error ?? "Sync mislukt."}`);
        return;
      }

      setSportsMsg(json?.message ?? "✅ Sportscholen gesynchroniseerd.");
    } catch (e: any) {
      console.error(e);
      setSportsMsg(`❌ ${e?.message ?? "Sync mislukt (onverwachte fout)."}`);
    } finally {
      setSportsBusy(false);
    }
  }

  const visibleRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aTime = new Date(a.official_released_at ?? a.uploaded_at ?? 0).getTime();
      const bTime = new Date(b.official_released_at ?? b.uploaded_at ?? 0).getTime();
      return bTime - aTime;
    });
  }, [rows]);

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
            className="relative rounded-[28px] overflow-hidden"
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

                  <div className="mt-3 flex flex-wrap gap-2 items-center">
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
                        label="Ververs"
                        onClick={() => {
                          void load(true);
                        }}
                      />
                    </Small>
                  </div>
                </div>

                <div className="justify-self-center">
                  <div
                    className="rounded-[28px] p-[6px]"
                    style={{
                      background:
                        "linear-gradient(180deg, #f5f5f5 0%, #cfcfcf 35%, #8f8f8f 65%, #f0f0f0 100%)",
                      boxShadow: `
                        0 0 0 1px rgba(255,255,255,0.70),
                        0 12px 28px rgba(0,0,0,0.70)
                      `,
                    }}
                  >
                    <div
                      className="rounded-[22px] p-3"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(12,12,12,0.96), rgba(4,4,4,0.96))",
                        border: "3px solid rgba(220,220,220,0.50)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
                      }}
                    >
                      <Image
                        src="/branding/fightsupport/excel-logo.png"
                        alt="FightSupport"
                        width={650}
                        height={200}
                        priority
                      />
                    </div>
                  </div>
                </div>

                <div className="justify-self-end flex flex-col items-end gap-2">
                  <button
                    onClick={runSportscholen}
                    disabled={sportsBusy}
                    className="px-3 py-2 text-sm bg-[#2f2f33] border border-[var(--brand-orange)] text-white rounded hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60"
                    title="Update sportscholen tabel (keurmerk data)"
                  >
                    {sportsBusy ? "Sportscholen…" : "Sportscholen sync"}
                  </button>

                  {sportsMsg ? (
                    <span className="text-xs" style={{ color: "var(--brand-orange)" }}>
                      {sportsMsg}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="px-4 md:px-6 py-6">
              <div
                className="rounded-3xl border-2 border-zinc-500/60 p-4 md:p-5 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50"
                style={silverBackplate}
              >
                <div className="px-2 md:px-3 py-2">
                  <div className="mt-2 text-center">
                    <h1
                      className="text-4xl md:text-5xl font-extrabold tracking-wide"
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
                      Controle Overzicht
                    </h1>

                    <div
                      className="mx-auto mt-4 mb-3"
                      style={{
                        width: 200,
                        height: 4,
                        borderRadius: 999,
                        background: `linear-gradient(90deg, ${NVB_ORANGE} 0%, #ff7a1a 50%, ${NVB_ORANGE} 100%)`,
                        boxShadow: "0 0 16px rgba(255,77,0,0.65)",
                      }}
                    />

                    <p className="mt-2 text-sm md:text-base text-zinc-700">
                      Doorgestuurde matchmakings voor officials
                    </p>
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
                    <p className="text-gray-500 mt-6 text-center">Laden…</p>
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
                              <th className="py-3 px-4 text-left">Datum</th>
                              <th className="py-3 px-4 text-left">Evenement</th>
                              <th className="py-3 px-4 text-left">Locatie</th>
                              <th className="py-3 px-4 text-left">Matchmaker</th>
                              <th className="py-3 px-4 text-left">Promotor</th>
                              <th className="py-3 px-4 text-left">Bondteam</th>
                              <th className="py-3 px-4 text-left">Status</th>
                              <th className="py-3 px-4 text-left">Doorgestuurd</th>
                              <th className="py-3 px-4 text-left">Acties</th>
                            </tr>
                          </thead>

                          <tbody>
                            {visibleRows.map((r, i) => {
                              const zebra = i % 2 === 0;
                              const run = r.laatste_run;
                              const queueJob = r.actieve_queue_job;
                              const hasMatchmaking = !!r.matchmaking_id;
                              const mmId = r.matchmaking_id ?? "";

                              return (
                                <tr
                                  key={r.id}
                                  style={{
                                    backgroundColor: zebra ? "#ffffff" : "#0d0d0d",
                                    color: zebra ? "#000" : "#fff",
                                  }}
                                >
                                  <td className="py-3 px-4">{formatDate(r.evenement_datum)}</td>
                                  <td className="py-3 px-4 font-semibold">{r.evenement_naam ?? "-"}</td>
                                  <td className="py-3 px-4">{r.locatie ?? "-"}</td>
                                  <td className="py-3 px-4">{r.matchmaker ?? "-"}</td>
                                  <td className="py-3 px-4">{r.promotor ?? "-"}</td>
                                  <td className="py-3 px-4">{r.bondteam ?? "-"}</td>

                                  <td className="py-3 px-4">
                                    <span
                                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                                      style={getQueueStatusStyle(queueJob, run)}
                                    >
                                      {getQueueStatusLabel(queueJob, run)}
                                    </span>
                                    {queueJob?.status === "failed" && queueJob?.error_message ? (
                                      <div className="mt-1 text-xs opacity-80">
                                        {queueJob.error_message}
                                      </div>
                                    ) : null}
                                  </td>

                                  <td className="py-3 px-4 text-sm">
                                    {formatDateTime(r.official_released_at)}
                                  </td>

                                  <td className="py-3 px-4">
                                    {hasMatchmaking ? (
                                      <Link
                                        href={`/dashboard/officials/controle/${encodeURIComponent(mmId)}`}
                                        className="inline-flex px-3 py-2 text-sm rounded bg-[#151515] text-white border border-orange-600 hover:bg-orange-600 hover:text-black"
                                      >
                                        Matchmaking
                                      </Link>
                                    ) : (
                                      <span className="inline-flex px-3 py-2 text-sm rounded bg-[#151515] text-white/40 border border-white/15">
                                        Geen matchmaking
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}

                            {visibleRows.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={9}
                                  className="py-8 px-4 text-center text-zinc-500"
                                  style={{ background: "#ffffff" }}
                                >
                                  Geen doorgestuurde matchmakings gevonden.
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