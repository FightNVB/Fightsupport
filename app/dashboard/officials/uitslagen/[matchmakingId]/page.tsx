"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { authedFetch } from "@/lib/api/authedFetch";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import NvbDarkButton from "@/components/NvbDarkButton";
import NvbLightButton from "@/components/NvbLightButton";
import {
  RESULT_OPTIONS,
  DECISION_OPTIONS,
  mapBoutResultToExcel,
  type BoutResultType,
  type DecisionCode,
} from "@/lib/uitslagen/excelMapping";

const ORANGE = "#ff4d00";

type Row = {
  id: string;
  matchup_id?: string;
  matchmaking_id: string;
  partij_nr: number;
  discipline: string | null;
  klasse_mm: string | null;
  max_gewicht: number | null;
  rood_naam: string | null;
  rood_gym: string | null;
  blauw_naam: string | null;
  blauw_gym: string | null;
  uitslagen_lineup?: {
    id: string;
    result_type: BoutResultType;
    decision_code: DecisionCode;
    result_label_red: string;
    finalized: boolean;
  }[];
};

type LocalState = {
  result_type: BoutResultType | "";
  decision_code: DecisionCode;
  changed_reason: string;
};

function metalFrameStyle(): CSSProperties {
  return {
    background:
      "linear-gradient(180deg, rgba(248,248,248,0.98) 0%, rgba(214,214,214,0.98) 16%, rgba(125,125,125,0.98) 48%, rgba(235,235,235,0.98) 100%)",
    boxShadow:
      "0 0 0 1px rgba(255,255,255,0.65), 0 18px 40px rgba(0,0,0,0.22)",
  };
}

function contentPanelStyle(): CSSProperties {
  return {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(241,244,247,0.98) 100%)",
    border: "2px solid rgba(84,84,90,0.34)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.88)",
  };
}

export default function OfficialsUitslagenDetailPage() {
  const router = useRouter();
  const params = useParams<{ matchmakingId: string }>();
  const { user, roles, loading: authLoading } = useAuth();
  const matchmakingId = String(params?.matchmakingId ?? "").trim();

  const [rows, setRows] = useState<Row[]>([]);
  const [states, setStates] = useState<Record<string, LocalState>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pageMsg, setPageMsg] = useState("");
  const [pageErr, setPageErr] = useState("");

  const allowed = useMemo(
    () =>
      roles?.some((r) =>
        ["hoofdofficial", "admin", "superadmin"].includes(String(r).toLowerCase())
      ) ?? false,
    [roles]
  );

  async function load() {
    setLoading(true);
    setPageErr("");
    setPageMsg("");

    try {
      const { data, error } = await supabase
        .from("lineup_bouts")
        .select(`
          id,
          matchmaking_id,
          partij_nr,
          discipline,
          klasse_mm,
          max_gewicht,
          rood_naam,
          rood_gym,
          blauw_naam,
          blauw_gym,
          uitslagen_lineup (
            id,
            result_type,
            decision_code,
            result_label_red,
            finalized
          )
        `)
        .eq("matchmaking_id", matchmakingId)
        .order("partij_nr", { ascending: true });

      if (error) throw error;

      const nextRows = (data ?? []) as Row[];
      setRows(nextRows);

      const nextStates: Record<string, LocalState> = {};
      nextRows.forEach((row) => {
        const saved = row.uitslagen_lineup?.[0];
        nextStates[row.id] = {
          result_type: saved?.result_type ?? "",
          decision_code: saved?.decision_code ?? null,
          changed_reason: "",
        };
      });
      setStates(nextStates);
    } catch (e: any) {
      setPageErr(e?.message ?? "Laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) return void router.replace("/login");
    if (!allowed) return void router.replace("/dashboard");
    void load();
  }, [authLoading, user, allowed, router, matchmakingId]);

  function setRowState(id: string, patch: Partial<LocalState>) {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function saveRow(row: Row) {
    const state = states[row.id];
    if (!state?.result_type) return;

    setBusyId(row.id);
    setPageErr("");
    setPageMsg("");

    try {
      const res = await authedFetch("/api/officials/uitslagen/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineup_bout_id: row.id,
          matchmaking_id: row.matchmaking_id,
          partij_nr: row.partij_nr,
          result_type: state.result_type,
          decision_code: ["red_win", "blue_win"].includes(state.result_type) ? state.decision_code : null,
          changed_reason: state.changed_reason || null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Opslaan mislukt.");

      setPageMsg(`Partij ${row.partij_nr} opgeslagen.`);
      await load();
    } catch (e: any) {
      setPageErr(e?.message ?? "Opslaan mislukt.");
    } finally {
      setBusyId(null);
    }
  }

  async function finalizeAll() {
    setPageErr("");
    setPageMsg("");
    try {
      const res = await authedFetch("/api/officials/uitslagen/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: matchmakingId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Finaliseren mislukt.");

      setPageMsg("Alles is gefinaliseerd en staat vast.");
      await load();
    } catch (e: any) {
      setPageErr(e?.message ?? "Finaliseren mislukt.");
    }
  }

  return (
    <main className="min-h-screen bg-[#eceff3] px-4 py-5">
      <div className="mx-auto w-full max-w-[1780px]">
        <div className="rounded-[30px] p-[5px]" style={metalFrameStyle()}>
          <div className="overflow-hidden rounded-[26px]" style={{ background: "linear-gradient(180deg, rgba(41,41,46,0.98) 0%, rgba(24,24,28,0.98) 100%)", border: "2px solid rgba(70,70,74,0.38)" }}>
            <div className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-[1fr_auto_1fr] md:items-center" style={{ borderBottom: "3px solid rgba(255,77,0,0.58)" }}>
              <div className="flex flex-wrap items-center gap-2 md:justify-self-start">
                <NvbLightButton label="← Overzicht" onClick={() => router.push("/dashboard/officials/uitslagen")} />
                <NvbDarkButton label="↺ Ververs" onClick={() => void load()} />
              </div>
              <div className="flex justify-center">
                <Image src="/branding/fightsupport/excel-logo.png" alt="FightSupport" width={280} height={80} priority style={{ width: "auto", height: "58px", objectFit: "contain" }} />
              </div>
              <div className="text-right md:justify-self-end">
                <div className="text-[18px] font-black uppercase tracking-[0.12em]" style={{ color: ORANGE }}>
                  Uitslagen invoer
                </div>
                <div className="text-[12px] text-white/60">Rood wint • Blauw wint • Onbeslist • No contest • Demo</div>
              </div>
            </div>

            <div className="p-4 md:p-5">
              <div className="rounded-[24px] p-[4px]" style={metalFrameStyle()}>
                <div className="rounded-[20px] p-4 md:p-5" style={contentPanelStyle()}>
                  <div className="flex items-center justify-between gap-3">
                    <h1 className="text-[30px] font-black uppercase tracking-[0.08em]" style={{ color: ORANGE }}>
                      Uitslagen per partij
                    </h1>
                    <button
                      onClick={() => void finalizeAll()}
                      className="rounded-xl px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.05em] text-white"
                      style={{ background: "linear-gradient(180deg, #ff6a1a 0%, #ff4d00 55%, #d63b00 100%)" }}
                    >
                      Finaliseren
                    </button>
                  </div>

                  {pageMsg ? <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{pageMsg}</div> : null}
                  {pageErr ? <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{pageErr}</div> : null}

                  <div className="mt-4 space-y-3">
                    {loading ? (
                      <div className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-zinc-500">Laden…</div>
                    ) : rows.length === 0 ? (
                      <div className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-zinc-500">Geen partijen gevonden.</div>
                    ) : (
                      rows.map((row, idx) => {
                        const state = states[row.id];
                        const saved = row.uitslagen_lineup?.[0];
                        const finalized = saved?.finalized === true;

                        let preview = "-";
                        try {
                          if (state?.result_type) {
                            preview = mapBoutResultToExcel(
                              state.result_type as BoutResultType,
                              ["red_win", "blue_win"].includes(state.result_type) ? state.decision_code : null
                            );
                          }
                        } catch {
                          preview = "-";
                        }

                        return (
                          <div
                            key={row.id}
                            className="rounded-[18px] border p-3"
                            style={{
                              background: idx % 2 === 0 ? "#ffffff" : "#34343a",
                              color: idx % 2 === 0 ? "#111111" : "#ffffff",
                              borderColor: "rgba(84,84,90,0.28)",
                            }}
                          >
                            <div className="grid gap-3 xl:grid-cols-[72px_110px_130px_1.2fr_1.2fr_1.4fr_200px_120px] xl:items-center">
                              <div className="font-black">{row.partij_nr}</div>
                              <div className="font-bold">{row.discipline || "-"}</div>
                              <div className="font-bold">{row.klasse_mm || "-"}</div>

                              <div>
                                <div className="font-black">{row.rood_naam || "-"}</div>
                                <div className="text-[11px] opacity-70">{row.rood_gym || "-"}</div>
                              </div>

                              <div>
                                <div className="font-black">{row.blauw_naam || "-"}</div>
                                <div className="text-[11px] opacity-70">{row.blauw_gym || "-"}</div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  {RESULT_OPTIONS.map((opt) => (
                                    <button
                                      key={opt.value}
                                      disabled={finalized}
                                      onClick={() =>
                                        setRowState(row.id, {
                                          result_type: opt.value,
                                          decision_code: ["red_win", "blue_win"].includes(opt.value) ? state?.decision_code ?? null : null,
                                        })
                                      }
                                      className="rounded-xl px-3 py-2 text-[11px] font-extrabold uppercase disabled:opacity-50"
                                      style={{
                                        background:
                                          state?.result_type === opt.value
                                            ? "linear-gradient(180deg, #ff6a1a 0%, #ff4d00 55%, #d63b00 100%)"
                                            : idx % 2 === 0
                                            ? "#111111"
                                            : "#ffffff",
                                        color:
                                          state?.result_type === opt.value
                                            ? "#ffffff"
                                            : idx % 2 === 0
                                            ? "#ffffff"
                                            : "#111111",
                                      }}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>

                                {["red_win", "blue_win"].includes(String(state?.result_type)) ? (
                                  <div className="flex flex-wrap gap-2">
                                    {DECISION_OPTIONS.map((opt) => (
                                      <button
                                        key={opt.value}
                                        disabled={finalized}
                                        onClick={() => setRowState(row.id, { decision_code: opt.value })}
                                        className="rounded-xl border px-3 py-1.5 text-[11px] font-bold disabled:opacity-50"
                                        style={{
                                          background: state?.decision_code === opt.value ? "rgba(255,77,0,0.12)" : "transparent",
                                          borderColor: state?.decision_code === opt.value ? "rgba(255,77,0,0.45)" : "rgba(113,113,122,0.35)",
                                          color: "inherit",
                                        }}
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </div>

                              <div className="rounded-2xl border px-3 py-3 text-sm font-bold" style={{ background: "rgba(255,255,255,0.75)", color: "#111111", borderColor: "rgba(113,113,122,0.25)" }}>
                                Excel: {saved?.result_label_red || preview}
                              </div>

                              <div className="space-y-2">
                                <textarea
                                  value={state?.changed_reason ?? ""}
                                  onChange={(e) => setRowState(row.id, { changed_reason: e.target.value })}
                                  disabled={finalized}
                                  placeholder="Reden bij wijziging"
                                  className="min-h-[62px] w-full rounded-xl border px-3 py-2 text-[12px] text-black outline-none disabled:opacity-50"
                                  style={{ borderColor: "rgba(113,113,122,0.25)" }}
                                />
                                <button
                                  disabled={finalized || busyId === row.id || !state?.result_type}
                                  onClick={() => void saveRow(row)}
                                  className="w-full rounded-xl px-3 py-2 text-[12px] font-extrabold uppercase text-white disabled:opacity-50"
                                  style={{ background: "linear-gradient(180deg, #3f434b 0%, #25282e 100%)" }}
                                >
                                  {finalized ? "Gefinaliseerd" : busyId === row.id ? "Opslaan…" : "Opslaan"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}