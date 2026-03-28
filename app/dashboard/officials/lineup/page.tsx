"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import NvbLightButton from "@/components/NvbLightButton";
import NvbDarkButton from "@/components/NvbDarkButton";

const NVB_ORANGE = "#ff4d00";

const silverBackplate: CSSProperties = {
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 38%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(236,238,242,0.98) 100%)",
};

function Small({
  children,
  origin = "left center",
}: {
  children: ReactNode;
  origin?: string;
}) {
  return (
    <div style={{ transform: "scale(0.85)", transformOrigin: origin }}>
      {children}
    </div>
  );
}

type LineupRow = {
  matchmaking_id: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  bondteam: string | null;
  partijen: number;
};

function formatDate(v: string | null) {
  if (!v) return "-";
  return new Date(v.length === 10 ? `${v}T00:00:00` : v).toLocaleDateString("nl-NL");
}

export default function OfficialsLineupOverzichtPage() {
  const router = useRouter();
  const { user, roles, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<LineupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const allowed = roles?.some((r) =>
      ["official", "hoofdofficial", "admin", "superadmin"].includes(r)
    );
    if (!allowed) {
      router.replace("/dashboard");
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, roles]);

  async function load() {
    setLoading(true);
    setErrorMsg("");

    try {
      const [{ data: uploads, error: uploadsError }, { data: bouts, error: boutsError }] =
        await Promise.all([
          supabase
            .from("matchmaking_uploads")
            .select("matchmaking_id, evenement_naam, evenement_datum, bondteam")
            .order("evenement_datum", { ascending: false }),
          supabase
            .from("definitive_matchmaking_bouts")
            .select("matchmaking_id")
            .in("eindstatus", ["OK", "GOEDGEKEURD_MET_DISPENSATIE"]),
        ]);

      if (uploadsError) throw uploadsError;
      if (boutsError) throw boutsError;

      const partijCountByMm: Record<string, number> = {};
      for (const b of bouts ?? []) {
        const id = b.matchmaking_id as string;
        partijCountByMm[id] = (partijCountByMm[id] ?? 0) + 1;
      }

      const rows: LineupRow[] = (uploads ?? []).map((upload) => ({
        matchmaking_id: upload.matchmaking_id as string,
        evenement_naam: upload.evenement_naam ?? null,
        evenement_datum: upload.evenement_datum ?? null,
        bondteam: upload.bondteam ?? null,
        partijen: partijCountByMm[upload.matchmaking_id as string] ?? 0,
      }));

      setRows(rows);
    } catch (e: any) {
      console.error("Fout bij laden lineup overzicht:", e);
      setErrorMsg(e?.message ?? "Laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

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
            {/* Header */}
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
                        onClick={() => router.push("/dashboard/officials")}
                      />
                    </Small>
                    <Small origin="left center">
                      <NvbDarkButton
                        label="↺ Ververs"
                        onClick={() => void load()}
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

                <div className="justify-self-end">
                  <div
                    style={{
                      color: NVB_ORANGE,
                      fontWeight: 900,
                      fontSize: 18,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      textAlign: "right",
                    }}
                  >
                    📋 LINEUP OVERZICHT
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, textAlign: "right", marginTop: 2 }}>
                    Officials — Lineup Bekijken
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
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
                        textShadow:
                          "0 2px 0 rgba(255,255,255,0.35), 0 8px 22px rgba(0,0,0,0.35)",
                      }}
                    >
                      Lineup Overzicht
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
                      Selecteer een evenement om de lineup te bekijken
                    </p>
                  </div>

                  {errorMsg && (
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
                  )}

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
                              <th className="py-3 px-4 text-left text-sm font-semibold">Evenement</th>
                              <th className="py-3 px-4 text-left text-sm font-semibold">Datum</th>
                              <th className="py-3 px-4 text-left text-sm font-semibold">Bondteam</th>
                              <th className="py-3 px-4 text-left text-sm font-semibold">Partijen</th>
                              <th className="py-3 px-4 text-left text-sm font-semibold">Actie</th>
                            </tr>
                          </thead>

                          <tbody>
                            {rows.map((row, i) => {
                              const zebra = i % 2 === 0;
                              return (
                                <tr
                                  key={row.matchmaking_id}
                                  style={{
                                    backgroundColor: zebra ? "#ffffff" : "#f5f5f5",
                                    color: "#111",
                                    borderBottom: "1px solid rgba(0,0,0,0.07)",
                                    transition: "background 0.15s",
                                  }}
                                  onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                                      "rgba(255,77,0,0.06)";
                                  }}
                                  onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                                      zebra ? "#ffffff" : "#f5f5f5";
                                  }}
                                >
                                  <td className="py-3 px-4 font-semibold">
                                    {row.evenement_naam ?? "-"}
                                  </td>
                                  <td className="py-3 px-4">
                                    {formatDate(row.evenement_datum)}
                                  </td>
                                  <td className="py-3 px-4">
                                    {row.bondteam ?? "-"}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                                      style={{
                                        background: "rgba(255,77,0,0.10)",
                                        color: "#b63b00",
                                        border: "1px solid rgba(255,77,0,0.30)",
                                      }}
                                    >
                                      {row.partijen} partijen
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <Link
                                      href={`/dashboard/officials/lineup/${encodeURIComponent(row.matchmaking_id)}`}
                                      className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg text-white transition-all"
                                      style={{
                                        background:
                                          "linear-gradient(180deg, #ff6a1a 0%, #ff4d00 50%, #e63c00 100%)",
                                        border: "1px solid rgba(255,255,255,0.20)",
                                        boxShadow:
                                          "inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 6px rgba(255,77,0,0.35)",
                                      }}
                                      onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLAnchorElement).style.filter =
                                          "brightness(1.1)";
                                        (e.currentTarget as HTMLAnchorElement).style.transform =
                                          "translateY(-1px)";
                                      }}
                                      onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLAnchorElement).style.filter =
                                          "brightness(1)";
                                        (e.currentTarget as HTMLAnchorElement).style.transform =
                                          "translateY(0)";
                                      }}
                                    >
                                      → Bekijk
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}

                            {rows.length === 0 && (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="py-8 px-4 text-center text-zinc-500"
                                  style={{ background: "#ffffff" }}
                                >
                                  Geen matchmakings gevonden.
                                </td>
                              </tr>
                            )}
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
