"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const NVB_ORANGE = "#ff4d00";

type UploadRow = {
  id: string;
  matchmaking_id: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  locatie: string | null;
  promotor: string | null;
  bondteam: string | null;
  matchmaker: string | null;
  uploaded_at: string | null;
  uploaded_by: string | null;
  returned_to_matchmaker: boolean | null;
  returned_to_matchmaker_at: string | null;
};

type ControleRunRow = {
  matchmaking_id: string;
  status: string | null;
  gestart_op: string | null;
  afgerond_op: string | null;
  run_type: string | null;
};

type ResultRow = {
  upload_id: string;
  matchmaking_id: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  locatie: string | null;
  promotor: string | null;
  bondteam: string | null;
  matchmaker: string | null;
  uploaded_at: string | null;
  returned_to_matchmaker_at: string | null;
  controle_status: string | null;
  partijen: number;
};

function safeText(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
}

function parseISODateOnly(d?: any): Date | null {
  if (!d) return null;
  const s = String(d).trim();
  const dt = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatDateNl(d?: any): string {
  const dt = parseISODateOnly(d);
  if (!dt) {
    const raw = String(d ?? "").trim();
    return raw || "-";
  }
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function formatDateTimeNl(d?: any): string {
  const raw = String(d ?? "").trim();
  if (!raw) return "-";
  const dt = new Date(raw);
  if (isNaN(dt.getTime())) return raw;

  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");

  return `${dd}-${mm}-${yyyy} ${hh}:${mi}`;
}

function normControleStatus(v: any): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "Niet gecontroleerd";
  if (["completed", "done", "afgerond", "goedgekeurd", "ok"].includes(s)) return "Gecontroleerd";
  if (["running", "bezig", "processing"].includes(s)) return "Bezig";
  if (["failed", "error", "fout"].includes(s)) return "Fout";
  return String(v);
}

function statusPillStyle(status: string): CSSProperties {
  const s = status.toLowerCase();

  if (s.includes("gecontroleerd")) {
    return {
      background: "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)",
      color: "#111827",
      border: "1px solid rgba(21,128,61,0.50)",
    };
  }

  if (s.includes("bezig")) {
    return {
      background: "linear-gradient(180deg, #facc15 0%, #eab308 100%)",
      color: "#111827",
      border: "1px solid rgba(161,98,7,0.45)",
    };
  }

  if (s.includes("fout")) {
    return {
      background: "linear-gradient(180deg, #ef4444 0%, #dc2626 100%)",
      color: "#111827",
      border: "1px solid rgba(153,27,27,0.45)",
    };
  }

  return {
    background: "linear-gradient(180deg, #ffffff 0%, #e5e7eb 100%)",
    color: "#111827",
    border: "1px solid rgba(113,113,122,0.35)",
  };
}

function SquareOrangeButton({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={title}
      className="inline-flex items-center justify-center w-11 h-11"
      style={{
        background: "linear-gradient(180deg, #ff6a14 0%, #ff4d00 60%, #df3f00 100%)",
        border: "1px solid rgba(150,40,0,0.60)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.24), 0 8px 16px rgba(255,77,0,0.22)",
      }}
    >
      {children}
    </Link>
  );
}

export default function MatchmakerOntvangenPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "gecontroleerd" | "bezig" | "fout" | "niet gecontroleerd">("all");

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const userId = authData.user?.id;
      if (!userId) throw new Error("Niet ingelogd.");

      const { data: uploads, error: upErr } = await supabase
        .from("matchmaking_uploads")
        .select(
          `
            id,
            matchmaking_id,
            evenement_naam,
            evenement_datum,
            locatie,
            promotor,
            bondteam,
            matchmaker,
            uploaded_at,
            uploaded_by,
            returned_to_matchmaker,
            returned_to_matchmaker_at
          `
        )
        .eq("uploaded_by", userId)
        .eq("returned_to_matchmaker", true)
        .order("returned_to_matchmaker_at", { ascending: false });

      if (upErr) throw upErr;

      const uploadRows = (uploads ?? []) as UploadRow[];

      const latestByMatchmaking = new Map<string, UploadRow>();

      for (const row of uploadRows) {
        const mmId = String(row.matchmaking_id ?? "").trim();
        if (!mmId) continue;

        const currentTime = new Date(
          row.returned_to_matchmaker_at ?? row.uploaded_at ?? 0
        ).getTime();

        const existing = latestByMatchmaking.get(mmId);
        const existingTime = existing
          ? new Date(existing.returned_to_matchmaker_at ?? existing.uploaded_at ?? 0).getTime()
          : -1;

        if (!existing || currentTime > existingTime) {
          latestByMatchmaking.set(mmId, row);
        }
      }

      const matchmakingIds = [...latestByMatchmaking.keys()];

      if (matchmakingIds.length === 0) {
        setRows([]);
        return;
      }

      const { data: ctxRows, error: ctxErr } = await supabase
        .from("controle_bout_context")
        .select("matchmaking_id, partij_nr")
        .in("matchmaking_id", matchmakingIds);

      if (ctxErr) throw ctxErr;

      const partijCountByMatchmaking: Record<string, number> = {};
      for (const row of (ctxRows ?? []) as any[]) {
        const mmId = String(row?.matchmaking_id ?? "").trim();
        const partijNr = Number(row?.partij_nr);

        if (!mmId || !Number.isFinite(partijNr)) continue;

        partijCountByMatchmaking[mmId] = Math.max(
          partijCountByMatchmaking[mmId] ?? 0,
          partijNr
        );
      }

      const { data: runs, error: runErr } = await supabase
        .from("controle_runs")
        .select("matchmaking_id, status, gestart_op, afgerond_op, run_type")
        .in("matchmaking_id", matchmakingIds)
        .order("gestart_op", { ascending: false });

      if (runErr) throw runErr;

      const latestRunByMatchmaking = new Map<string, ControleRunRow>();
      for (const run of (runs ?? []) as ControleRunRow[]) {
        const mmId = String(run.matchmaking_id ?? "").trim();
        if (!mmId) continue;
        if (!latestRunByMatchmaking.has(mmId)) {
          latestRunByMatchmaking.set(mmId, run);
        }
      }

      const result: ResultRow[] = matchmakingIds.map((mmId) => {
        const up = latestByMatchmaking.get(mmId)!;
        const run = latestRunByMatchmaking.get(mmId);

        return {
          upload_id: up.id,
          matchmaking_id: mmId,
          evenement_naam: up.evenement_naam,
          evenement_datum: up.evenement_datum,
          locatie: up.locatie,
          promotor: up.promotor,
          bondteam: up.bondteam,
          matchmaker: up.matchmaker,
          uploaded_at: up.uploaded_at,
          returned_to_matchmaker_at: up.returned_to_matchmaker_at,
          controle_status: run?.status ?? "Niet gecontroleerd",
          partijen: partijCountByMatchmaking[mmId] ?? 0,
        };
      });

      result.sort((a, b) => {
        const ta = new Date(a.returned_to_matchmaker_at ?? a.uploaded_at ?? 0).getTime();
        const tb = new Date(b.returned_to_matchmaker_at ?? b.uploaded_at ?? 0).getTime();
        return tb - ta;
      });

      setRows(result);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const status = normControleStatus(row.controle_status).toLowerCase();

      if (statusFilter !== "all") {
        if (statusFilter === "gecontroleerd" && !status.includes("gecontroleerd")) return false;
        if (statusFilter === "bezig" && !status.includes("bezig")) return false;
        if (statusFilter === "fout" && !status.includes("fout")) return false;
        if (statusFilter === "niet gecontroleerd" && !status.includes("niet gecontroleerd")) return false;
      }

      if (!q) return true;

      const hay = [
        row.evenement_naam,
        row.evenement_datum,
        row.locatie,
        row.promotor,
        row.bondteam,
        row.matchmaker,
        row.matchmaking_id,
        row.controle_status,
      ]
        .map((v) => String(v ?? "").toLowerCase().trim())
        .join(" ");

      return hay.includes(q);
    });
  }, [rows, search, statusFilter]);

  const totals = useMemo(() => {
    let partijen = 0;
    for (const row of rows) partijen += Number(row.partijen ?? 0) || 0;
    return {
      matchmakings: rows.length,
      partijen,
    };
  }, [rows]);

  return (
    <main
      className="min-h-screen px-4 py-8 flex items-center justify-center"
      style={{ background: "#eef0f3" }}
    >
      <div className="relative w-full max-w-[1280px]">
        <div
          className="pointer-events-none absolute -inset-10 rounded-[48px]"
          style={{
            boxShadow:
              "0 0 110px rgba(220,220,220,0.26), 0 0 180px rgba(220,220,220,0.16), 0 0 140px rgba(255,77,0,0.04)",
          }}
        />

        <div className="relative rounded-[42px] p-[10px]">
          <div
            className="absolute inset-0 rounded-[42px]"
            style={{
              background: "linear-gradient(180deg, #d0d0d0 0%, #8f8f8f 50%, #2a2a2a 100%)",
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.35),
                0 0 0 2px rgba(120,120,120,0.20),
                0 30px 80px rgba(0,0,0,0.70)
              `,
            }}
          />

          <div
            className="relative rounded-[34px] p-[2px]"
            style={{
              background:
                "linear-gradient(135deg, rgba(245,245,245,0.95) 0%, rgba(200,200,200,0.65) 40%, rgba(150,150,150,0.45) 70%, rgba(255,77,0,0.10) 100%)",
            }}
          >
            <div
              className="rounded-[32px] px-6 py-5"
              style={{
                background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
                border: "2px solid rgba(63,63,70,0.30)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
                color: "#111827",
              }}
            >
              <div
                className="flex items-center justify-between gap-6 px-5 py-5"
                style={{
                  background: "linear-gradient(180deg, #34343a 0%, #23232a 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 18px 34px rgba(0,0,0,0.22)",
                  color: "#fff",
                }}
              >
                <div className="flex items-center gap-4 min-w-[240px]">
                  <Image
                    src="/branding/fightsupport/excel-logo.png"
                    width={180}
                    height={48}
                    alt="FightSupport"
                    priority
                    style={{ width: "auto", height: "44px", objectFit: "contain" }}
                  />
                </div>

                <div className="flex flex-1 items-center justify-end gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/matchmaker")}
                    className={`${inter.className} px-5 py-3 text-[15px] font-extrabold tracking-[0.02em] text-zinc-900 transition hover:translate-y-[-1px]`}
                    style={{
                      background: "linear-gradient(180deg, #f2f2f2 0%, #cfcfcf 48%, #a8a8a8 100%)",
                      border: "1px solid rgba(82,82,91,0.45)",
                      borderRadius: 0,
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.85), 0 10px 18px rgba(0,0,0,0.12)",
                      minWidth: 180,
                    }}
                  >
                    ← Dashboard
                  </button>

                  <Link
                    href="/dashboard/matchmaker/controle/upload"
                    className={`${inter.className} inline-flex items-center justify-center px-5 py-3 text-[15px] font-extrabold tracking-[0.02em] text-white transition hover:translate-y-[-1px]`}
                    style={{
                      background: "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)",
                      border: "1px solid rgba(150,40,0,0.55)",
                      borderRadius: 0,
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 22px rgba(255,77,0,0.18)",
                      minWidth: 240,
                    }}
                  >
                    Nieuwe matchmaking uploaden
                  </Link>
                </div>
              </div>

              <div className="pt-6">
                <div
                  className={`${inter.className} text-center`}
                  style={{
                    color: NVB_ORANGE,
                    fontSize: 22,
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Ontvangen van NVB 
                </div>

                <div
                  className={`${inter.className} mt-2 text-center`}
                  style={{
                    fontSize: 13,
                    color: "rgba(42,42,46,0.78)",
                    letterSpacing: "0.05em",
                  }}
                >
                  Upload nieuwe matchmakings naar controle en open teruggestuurde matchmakings
                </div>
              </div>

              <div
                className="my-5"
                style={{
                  height: "1px",
                  background:
                    "linear-gradient(to right, transparent, rgba(220,220,220,0.22), transparent)",
                }}
              />

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="text-sm text-zinc-800">
                  Matchmakings:{" "}
                  <span className="font-extrabold text-zinc-900">{totals.matchmakings}</span>
                </div>
                <div className="text-sm text-zinc-800">
                  Partijen:{" "}
                  <span className="font-extrabold text-zinc-900">{totals.partijen}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-300 bg-white/40 p-3 mb-4">
                <div className="flex-1 min-w-[240px]">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Zoek op evenement, promotor, bondteam, locatie..."
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:text-zinc-500"
                    style={{
                      background: "linear-gradient(180deg, #ffffff 0%, #f4f6f9 100%)",
                      border: "2px solid rgba(63,63,70,0.35)",
                      color: "#111827",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.90), 0 8px 18px rgba(0,0,0,0.10)",
                    }}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: "#fff",
                    border: "2px solid rgba(63,63,70,0.35)",
                    color: "#111827",
                    minWidth: 190,
                  }}
                >
                  <option value="all">Alle statussen</option>
                  <option value="gecontroleerd">Gecontroleerd</option>
                  <option value="bezig">Bezig</option>
                  <option value="fout">Fout</option>
                  <option value="niet gecontroleerd">Niet gecontroleerd</option>
                </select>

                <Link
                  href="/dashboard/matchmaker/controle/upload"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-extrabold text-white"
                  style={{
                    background: "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)",
                    border: "1px solid rgba(150,40,0,0.55)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 18px rgba(255,77,0,0.16)",
                  }}
                >
                  + Upload
                </Link>
              </div>

              {loading ? (
                <div className="text-zinc-700">Laden…</div>
              ) : error ? (
                <div className="text-red-700">{error}</div>
              ) : filteredRows.length === 0 ? (
                <div
                  className="rounded-xl border border-zinc-300 px-4 py-6 text-zinc-700"
                  style={{ background: "rgba(255,255,255,0.65)" }}
                >
                  Geen teruggestuurde matchmakings gevonden.
                </div>
              ) : (
                <div className="overflow-auto rounded-xl border border-zinc-300">
                  <table className="min-w-full border-collapse">
                    <thead
                      style={{
                        background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                        color: "#fff",
                        borderBottom: "3px solid rgba(255,77,0,0.55)",
                      }}
                    >
                      <tr>
                        <th className="py-3 px-4 text-left">Evenement</th>
                        <th className="py-3 px-4 text-left">Info</th>
                        <th className="py-3 px-4 text-left">Controle</th>
                        <th className="py-3 px-4 text-left w-[170px]">Acties</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRows.map((row, i) => {
                        const zebraWhite = i % 2 === 0;
                        const statusLabel = normControleStatus(row.controle_status);

                        return (
                          <tr
                            key={row.upload_id}
                            style={{
                              backgroundColor: zebraWhite ? "#ffffff" : "#0d0d0d",
                              color: zebraWhite ? "#000" : "#fff",
                            }}
                          >
                            <td className="px-4 py-4 align-top">
                              <div className="font-extrabold text-[15px]">
                                {safeText(row.evenement_naam, "Onbekend evenement")}
                              </div>
                              <div className="mt-1 text-sm opacity-80">
                                {formatDateNl(row.evenement_datum)}
                              </div>
                              <div className="mt-1 text-xs opacity-70 break-all">
                                {row.matchmaking_id}
                              </div>
                            </td>

                            <td className="px-4 py-4 align-top">
                              <div className="space-y-1 text-sm">
                                <div>
                                  <span className="font-semibold">Locatie:</span>{" "}
                                  <span className="opacity-90">{safeText(row.locatie)}</span>
                                </div>
                                <div>
                                  <span className="font-semibold">Promotor:</span>{" "}
                                  <span className="opacity-90">{safeText(row.promotor)}</span>
                                </div>
                                <div>
                                  <span className="font-semibold">Bondteam:</span>{" "}
                                  <span className="opacity-90">{safeText(row.bondteam)}</span>
                                </div>
                                <div>
                                  <span className="font-semibold">Partijen:</span>{" "}
                                  <span className="opacity-90">{row.partijen}</span>
                                </div>
                                <div>
                                  <span className="font-semibold">Teruggestuurd:</span>{" "}
                                  <span className="opacity-90">
                                    {formatDateTimeNl(row.returned_to_matchmaker_at)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4 align-top">
                              <div className="flex flex-col items-start gap-2">
                                <span
                                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold"
                                  style={statusPillStyle(statusLabel)}
                                >
                                  {statusLabel}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-4 align-top">
                              <div className="flex items-center gap-2">
                                <SquareOrangeButton
                                  href={`/dashboard/matchmaker/controle/ontvangen/${encodeURIComponent(
                                    row.matchmaking_id
                                  )}`}
                                  title="Open matchmaking"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M14 3h7v7" />
                                    <path d="M10 14L21 3" />
                                    <path d="M21 14v7h-7" />
                                    <path d="M3 10V3h7" />
                                    <path d="M3 21l7-7" />
                                  </svg>
                                </SquareOrangeButton>

                                <Link
                                  href={`/dashboard/matchmaker/controle/ontvangen/${encodeURIComponent(
                                    row.matchmaking_id
                                  )}`}
                                  className="inline-flex items-center px-3 py-2 font-extrabold text-sm"
                                  style={{
                                    background: "rgba(0,0,0,0.55)",
                                    border: `1px solid rgba(255,77,0,0.85)`,
                                    color: "rgba(255,210,190,0.95)",
                                  }}
                                >
                                  Open
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pt-4 text-xs text-zinc-500 text-center">© FightSupport</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}