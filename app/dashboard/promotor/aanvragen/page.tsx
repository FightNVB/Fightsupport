"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  ClipboardList,
} from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

type Row = {
  id: string;
  created_at: string;
  naam: string;
  datum: string;
  locatie: string | null;
  bondteam: string | null;
  disciplines: string[];
  status: string;
  voorkeur_hoofdofficial_name: string | null;
  toegewezen_hoofdofficial_name: string | null;
  reactie_official: string | null;
};

type ApiResponse = {
  rows?: Row[];
  error?: string;
};

const ORANGE = "#ff4d00";

const PAGE_BG: CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg,#0f1216 0%, #1b2027 45%, #0f1216 100%)",
};

const OUTER_SHELL: CSSProperties = {
  background:
    "linear-gradient(180deg,#f8f8f8 0%, #d7d7d7 18%, #8a8a8a 55%, #efefef 100%)",
  boxShadow:
    "0 22px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.55)",
};

const INNER_SHELL: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(32,37,45,0.98) 0%, rgba(20,24,30,0.98) 100%)",
  border: "3px solid rgba(95,105,118,0.55)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
};

function formatDate(v: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("nl-NL");
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Laden mislukt";
}

function statusStyle(status: string): CSSProperties {
  const s = String(status || "").toLowerCase();

  if (s === "geaccepteerd" || s === "definitief") {
    return {
      background: "rgba(34,197,94,0.14)",
      color: "#166534",
      border: "1px solid rgba(34,197,94,0.45)",
    };
  }

  if (s === "afgewezen") {
    return {
      background: "rgba(220,38,38,0.14)",
      color: "#991b1b",
      border: "1px solid rgba(220,38,38,0.45)",
    };
  }

  if (s === "verzonden_naar_official") {
    return {
      background: "rgba(255,77,0,0.14)",
      color: "#b63b00",
      border: "1px solid rgba(255,77,0,0.45)",
    };
  }

  return {
    background: "rgba(59,130,246,0.14)",
    color: "#1d4ed8",
    border: "1px solid rgba(59,130,246,0.40)",
  };
}

export default function PromotorAanvragenPage() {
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const res = await authedFetch("/api/promotor/event-requests/mine", {
          method: "GET",
        });

        let json: ApiResponse = {};
        try {
          json = (await res.json()) as ApiResponse;
        } catch {
          json = {};
        }

        if (!res.ok) {
          throw new Error(json?.error || "Laden mislukt");
        }

        if (!active) return;
        setRows(Array.isArray(json?.rows) ? json.rows : []);
      } catch (error: unknown) {
        if (!active) return;
        setErr(getErrorMessage(error));
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="px-4 py-6" style={PAGE_BG}>
      <div className="mx-auto max-w-[1500px] rounded-[34px] p-[7px]" style={OUTER_SHELL}>
        <div className="overflow-hidden rounded-[28px]" style={INNER_SHELL}>
          <div
            className="px-6 py-5"
            style={{
              background:
                "linear-gradient(180deg, #3b4149 0%, #242a31 48%, #171b20 100%)",
              borderBottom: "3px solid rgba(255,77,0,0.5)",
            }}
          >
            <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto_1fr]">
              <div>
                <div
                  className="text-[28px] font-extrabold uppercase"
                  style={{ color: ORANGE }}
                >
                  Mijn aanvragen
                </div>
                <div className="mt-1 text-sm text-white/75">
                  Overzicht van alle ingediende evenementverzoeken
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded-[10px] px-4 py-2 text-sm font-extrabold text-black"
                    style={{
                      background:
                        "linear-gradient(180deg,#ffffff 0%, #ececec 18%, #cfcfcf 40%, #f7f7f7 58%, #a9a9a9 100%)",
                      border: "1px solid rgba(120,120,120,0.95)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,1), inset 0 -2px 2px rgba(0,0,0,0.32), 0 8px 18px rgba(0,0,0,0.28)",
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <ArrowLeft size={16} />
                      Terug
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/promotor")}
                    className="rounded-[10px] px-4 py-2 text-sm font-extrabold text-black"
                    style={{
                      background:
                        "linear-gradient(180deg,#ffffff 0%, #ececec 18%, #cfcfcf 40%, #f7f7f7 58%, #a9a9a9 100%)",
                      border: "1px solid rgba(120,120,120,0.95)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,1), inset 0 -2px 2px rgba(0,0,0,0.32), 0 8px 18px rgba(0,0,0,0.28)",
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <LayoutDashboard size={16} />
                      Dashboard
                    </span>
                  </button>
                </div>
              </div>

              <div className="justify-self-center">
                <Image
                  src="/branding/fightsupport/excel-logo.png"
                  alt="FightSupport"
                  width={240}
                  height={80}
                  priority
                  style={{ width: 240, height: "auto", display: "block" }}
                />
              </div>

              <div className="justify-self-end text-right">
                <div className="text-sm font-extrabold tracking-[0.20em] text-white/90">
                  FIGHTSUPPORT
                </div>
                <div className="text-xs text-white/70">
                  Vechtsport ondersteuning
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div
              className="rounded-[24px] p-5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(245,247,250,0.98) 0%, rgba(229,233,238,0.98) 100%)",
                border: "2px solid rgba(95,105,118,0.55)",
                boxShadow:
                  "0 16px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.8)",
              }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-[12px] text-white"
                  style={{
                    background:
                      "linear-gradient(180deg, #ff6b22 0%, #ff4d00 55%, #b93200 100%)",
                  }}
                >
                  <ClipboardList size={22} />
                </div>

                <div>
                  <div className="text-lg font-extrabold text-black">
                    Mijn evenementverzoeken
                  </div>
                  <div className="text-sm text-slate-600">
                    Status, official en reactie
                  </div>
                </div>
              </div>

              {err ? (
                <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                  {err}
                </div>
              ) : null}

              {loading ? (
                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                  Laden…
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[18px] border-2 border-zinc-800 bg-white">
                  <table className="min-w-full border-collapse text-sm">
                    <thead
                      style={{
                        background:
                          "linear-gradient(180deg, #ff6b00 0%, #ff5a00 100%)",
                        color: "#fff",
                      }}
                    >
                      <tr>
                        <th className="px-4 py-3 text-left">Datum</th>
                        <th className="px-4 py-3 text-left">Evenement</th>
                        <th className="px-4 py-3 text-left">Bondteam</th>
                        <th className="px-4 py-3 text-left">Disciplines</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Official</th>
                        <th className="px-4 py-3 text-left">Reactie</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-8 text-center text-slate-500"
                          >
                            Nog geen aanvragen gevonden.
                          </td>
                        </tr>
                      ) : (
                        rows.map((r, i) => {
                          const zebra = i % 2 === 0;

                          return (
                            <tr
                              key={r.id}
                              style={{
                                backgroundColor: zebra ? "#ffffff" : "#f7f7f8",
                                color: "#111827",
                                borderTop: "1px solid rgba(15,23,42,0.08)",
                              }}
                            >
                              <td className="px-4 py-3">
                                {formatDate(r.datum)}
                              </td>

                              <td className="px-4 py-3">
                                <div className="font-semibold text-black">
                                  {r.naam}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {r.locatie ?? "-"}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-black">
                                {r.bondteam ?? "-"}
                              </td>

                              <td className="px-4 py-3 text-black">
                                {Array.isArray(r.disciplines) &&
                                r.disciplines.length > 0
                                  ? r.disciplines.join(", ")
                                  : "-"}
                              </td>

                              <td className="px-4 py-3">
                                <span
                                  className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                                  style={statusStyle(r.status)}
                                >
                                  {r.status || "-"}
                                </span>
                              </td>

                              <td className="px-4 py-3 text-black">
                                {r.toegewezen_hoofdofficial_name ??
                                  r.voorkeur_hoofdofficial_name ??
                                  "-"}
                              </td>

                              <td className="px-4 py-3 text-black">
                                {r.reactie_official ?? "-"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}