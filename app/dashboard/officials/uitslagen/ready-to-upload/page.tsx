"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import NvbLightButton from "@/components/NvbLightButton";
import NvbDarkButton from "@/components/NvbDarkButton";

const ORANGE = "#ff4d00";

type Row = {
  matchmaking_id: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  bondteam: string | null;
  partijen: number;
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

function formatDate(v: string | null) {
  if (!v) return "-";
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("nl-NL");
}

export default function AdminReadyToUploadPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("lineup_bouts")
        .select(`
          matchmaking_id,
          bondteam,
          evenement_naam,
          evenement_datum,
          uitslagen_lineup!inner (
            finalized
          )
        `)
        .order("evenement_datum", { ascending: false });

      if (error) throw error;

      const onlyFinalized = (data ?? []).filter((r: any) => r.uitslagen_lineup?.[0]?.finalized === true);
      const map = new Map<string, Row>();

      for (const row of onlyFinalized as any[]) {
        const id = String(row.matchmaking_id ?? "").trim();
        const cur = map.get(id) ?? {
          matchmaking_id: id,
          bondteam: row.bondteam ?? null,
          evenement_naam: row.evenement_naam ?? null,
          evenement_datum: row.evenement_datum ?? null,
          partijen: 0,
        };
        cur.partijen += 1;
        map.set(id, cur);
      }

      setRows(Array.from(map.values()));
    } catch (e: any) {
      setError(e?.message ?? "Laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="min-h-screen bg-[#eceff3] px-4 py-5">
      <div className="mx-auto w-full max-w-[1520px]">
        <div className="rounded-[30px] p-[5px]" style={metalFrameStyle()}>
          <div className="overflow-hidden rounded-[26px]" style={{ background: "linear-gradient(180deg, rgba(41,41,46,0.98) 0%, rgba(24,24,28,0.98) 100%)", border: "2px solid rgba(70,70,74,0.38)" }}>
            <div className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-[1fr_auto_1fr] md:items-center" style={{ borderBottom: "3px solid rgba(255,77,0,0.58)" }}>
              <div className="flex flex-wrap items-center gap-2 md:justify-self-start">
                <NvbLightButton label="← Admin" onClick={() => router.push("/dashboard/admin")} />
                <NvbDarkButton label="↺ Ververs" onClick={() => void load()} />
              </div>
              <div className="flex justify-center">
                <Image src="/branding/fightsupport/excel-logo.png" alt="FightSupport" width={280} height={80} priority style={{ width: "auto", height: "58px", objectFit: "contain" }} />
              </div>
              <div className="text-right md:justify-self-end">
                <div className="text-[18px] font-black uppercase tracking-[0.12em]" style={{ color: ORANGE }}>
                  Ready to Upload
                </div>
                <div className="text-[12px] text-white/60">Gefinaliseerde Excel downloads</div>
              </div>
            </div>

            <div className="p-4 md:p-5">
              <div className="rounded-[24px] p-[4px]" style={metalFrameStyle()}>
                <div className="rounded-[20px] p-4 md:p-5" style={contentPanelStyle()}>
                  <h1 className="text-[30px] font-black uppercase tracking-[0.08em] md:text-[36px]" style={{ color: ORANGE }}>
                    Klaar voor FightPaspoort upload
                  </h1>

                  {error ? <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div> : null}

                  <div className="mt-4 overflow-hidden rounded-[18px] border border-zinc-500/30">
                    <div className="grid grid-cols-[1.7fr_120px_120px_110px_140px] border-b text-[11px] font-extrabold uppercase tracking-[0.08em] text-white" style={{ background: "linear-gradient(180deg, rgba(56,56,61,1) 0%, rgba(34,34,39,1) 100%)" }}>
                      <div className="px-4 py-3">Evenement</div>
                      <div className="px-3 py-3">Datum</div>
                      <div className="px-3 py-3">Bondteam</div>
                      <div className="px-3 py-3">Partijen</div>
                      <div className="px-3 py-3">Download</div>
                    </div>

                    {loading ? (
                      <div className="bg-white px-4 py-8 text-center text-sm text-zinc-500">Laden…</div>
                    ) : rows.length === 0 ? (
                      <div className="bg-white px-4 py-8 text-center text-sm text-zinc-500">Nog niets gefinaliseerd.</div>
                    ) : (
                      rows.map((row, i) => {
                        const zebra = i % 2 === 0;
                        return (
                          <div
                            key={row.matchmaking_id}
                            className="grid grid-cols-[1.7fr_120px_120px_110px_140px] items-center text-[13px]"
                            style={{ background: zebra ? "#ffffff" : "#34343a", color: zebra ? "#111111" : "#ffffff" }}
                          >
                            <div className="px-4 py-3">
                              <div className="font-extrabold">{row.evenement_naam || "-"}</div>
                              <div className="text-[11px]" style={{ color: zebra ? "#5f6470" : "rgba(255,255,255,0.72)" }}>{row.matchmaking_id}</div>
                            </div>
                            <div className="px-3 py-3">{formatDate(row.evenement_datum)}</div>
                            <div className="px-3 py-3 font-bold">{row.bondteam || "-"}</div>
                            <div className="px-3 py-3 font-bold">{row.partijen}</div>
                            <div className="px-3 py-3">
                              <a
                                href={`/api/admin/uitslagen/export?matchmaking_id=${encodeURIComponent(row.matchmaking_id)}`}
                                className="inline-flex rounded-xl px-3 py-2 text-[12px] font-extrabold uppercase tracking-[0.05em] text-white"
                                style={{ background: "linear-gradient(180deg, #ff6a1a 0%, #ff4d00 55%, #d63b00 100%)" }}
                              >
                                Download Excel
                              </a>
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