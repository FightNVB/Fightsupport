
"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api/authedFetch";
import NvbLightButton from "@/components/NvbLightButton";
import NvbDarkButton from "@/components/NvbDarkButton";

const ORANGE = "#ff4d00";

type Row = {
  matchmaking_id: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  bondteam: string | null;
  partijen: number;
  ingevuld: number;
};

function clean(v: unknown) { return String(v ?? "").trim(); }
function norm(v: unknown) { return clean(v).toUpperCase(); }

function metalFrameStyle(): CSSProperties {
  return {
    background: "linear-gradient(180deg, rgba(248,248,248,0.98) 0%, rgba(214,214,214,0.98) 16%, rgba(125,125,125,0.98) 48%, rgba(235,235,235,0.98) 100%)",
    boxShadow: "0 0 0 1px rgba(255,255,255,0.65), 0 18px 40px rgba(0,0,0,0.22)",
  };
}

function contentPanelStyle(): CSSProperties {
  return {
    background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(241,244,247,0.98) 100%)",
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
  const { user, roles, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [myBondteam, setMyBondteam] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const allowed = useMemo(
    () => (roles ?? []).some((r) => ["admin", "superadmin"].includes(String(r).toLowerCase())),
    [roles]
  );
  const isSuperadmin = useMemo(
    () => (roles ?? []).some((r) => String(r).toLowerCase() === "superadmin"),
    [roles]
  );
  const canSeeAllBonds = isSuperadmin && norm(myBondteam) === "NVB";

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("bondteam")
        .eq("id", user.id)
        .maybeSingle();
      const profileBond = norm((profile as any)?.bondteam);
      setMyBondteam(profileBond);

      const [
        { data: runs, error: runErr },
        { data: bouts, error: boutErr },
        { data: results, error: resultErr },
        { data: uploads, error: uploadErr },
        { data: matchmakings, error: mmErr },
      ] = await Promise.all([
        supabase.from("uitslagen_runs").select("id, matchmaking_id, status").eq("status", "afgerond"),
        supabase.from("uitslagen_bouts").select("uitslagen_run_id, matchmaking_id, partij_nr"),
        supabase.from("uitslagen_resultaten").select("uitslagen_run_id, matchmaking_id, uitslag_status"),
        supabase.from("matchmaking_uploads").select("matchmaking_id, evenement_naam, evenement_datum, bondteam"),
        supabase.from("matchmakings").select("id, naam, datum, bondteam, huidige_eigenaar_bondteam, status, stadium"),
      ]);

      if (runErr) throw runErr;
      if (boutErr) throw boutErr;
      if (resultErr) throw resultErr;
      if (uploadErr) throw uploadErr;
      if (mmErr) throw mmErr;

      const uploadByMm = new Map((uploads ?? []).map((r: any) => [clean(r.matchmaking_id), r]));
      const mmById = new Map((matchmakings ?? []).map((r: any) => [clean(r.id), r]));
      const rowsByRun = new Map<string, Row>();

      for (const run of runs ?? []) {
        const runId = clean((run as any).id);
        const mmid = clean((run as any).matchmaking_id);
        const meta: any = uploadByMm.get(mmid) ?? {};
        const mm: any = mmById.get(mmid) ?? {};
        const bond = norm(meta.bondteam || mm.huidige_eigenaar_bondteam || mm.bondteam);
        if (!canSeeAllBonds && profileBond && bond && bond !== profileBond) continue;
        rowsByRun.set(runId, {
          matchmaking_id: mmid,
          evenement_naam: meta.evenement_naam ?? mm.naam ?? null,
          evenement_datum: meta.evenement_datum ?? mm.datum ?? null,
          bondteam: bond || null,
          partijen: 0,
          ingevuld: 0,
        });
      }

      for (const bout of bouts ?? []) {
        const cur = rowsByRun.get(clean((bout as any).uitslagen_run_id));
        if (cur) cur.partijen += 1;
      }
      for (const res of results ?? []) {
        const cur = rowsByRun.get(clean((res as any).uitslagen_run_id));
        if (cur && clean((res as any).uitslag_status).toLowerCase() !== "concept") cur.ingevuld += 1;
      }

      setRows(Array.from(rowsByRun.values()).sort((a, b) => clean(b.evenement_datum).localeCompare(clean(a.evenement_datum))));
    } catch (e: any) {
      setError(e?.message ?? "Laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  async function heropen(matchmakingId: string) {
    if (!isSuperadmin) return;
    const ok = window.confirm("Zet deze uitslagen weer op bewerken? Officials kunnen daarna via de matchmaking/uitslagenflow corrigeren.");
    if (!ok) return;

    setBusyId(matchmakingId);
    try {
      const res = await authedFetch("/api/admin/uitslagen/heropen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: matchmakingId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Op bewerken zetten mislukt.");
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Op bewerken zetten mislukt.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) return void router.replace("/login");
    if (!allowed) return void router.replace("/dashboard");
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, allowed, router, roles]);

  return (
    <main className="min-h-screen bg-[#eceff3] px-4 py-5">
      <div className="mx-auto w-full max-w-[1600px]">
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
                <div className="text-[18px] font-black uppercase tracking-[0.12em]" style={{ color: ORANGE }}>Ready to Upload</div>
                <div className="text-[12px] text-white/60">Gefinaliseerde uitslagen voor FightPassport</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">Bondteam: {myBondteam || "-"}</div>
              </div>
            </div>

            <div className="p-4 md:p-5">
              <div className="rounded-[24px] p-[4px]" style={metalFrameStyle()}>
                <div className="rounded-[20px] p-4 md:p-5" style={contentPanelStyle()}>
                  <h1 className="text-[30px] font-black uppercase tracking-[0.08em] md:text-[36px]" style={{ color: ORANGE }}>Klaar voor FightPassport upload</h1>
                  <p className="mt-1 text-sm font-semibold text-zinc-600">
                    Officials kunnen deze uitslagen alleen inzien. Alleen superadmin van hetzelfde bondteam, of NVB superadmin, kan een definitieve uitslag hier opnieuw op bewerken zetten.
                  </p>

                  {error ? <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div> : null}

                  <div className="mt-4 overflow-hidden rounded-[18px] border border-zinc-500/30">
                    <div className="grid grid-cols-[1.7fr_120px_120px_110px_140px_330px] border-b text-[11px] font-extrabold uppercase tracking-[0.08em] text-white" style={{ background: "linear-gradient(180deg, rgba(56,56,61,1) 0%, rgba(34,34,39,1) 100%)" }}>
                      <div className="px-4 py-3">Evenement</div>
                      <div className="px-3 py-3">Datum</div>
                      <div className="px-3 py-3">Bondteam</div>
                      <div className="px-3 py-3">Partijen</div>
                      <div className="px-3 py-3">Ingevuld</div>
                      <div className="px-3 py-3 text-right">Acties</div>
                    </div>

                    {loading ? (
                      <div className="bg-white px-4 py-8 text-center text-sm text-zinc-500">Laden…</div>
                    ) : rows.length === 0 ? (
                      <div className="bg-white px-4 py-8 text-center text-sm text-zinc-500">Nog niets gefinaliseerd.</div>
                    ) : rows.map((row, i) => {
                      const zebra = i % 2 === 0;
                      return (
                        <div key={row.matchmaking_id} className="grid grid-cols-[1.7fr_120px_120px_110px_140px_330px] items-center text-[13px]" style={{ background: zebra ? "#ffffff" : "#34343a", color: zebra ? "#111111" : "#ffffff" }}>
                          <div className="px-4 py-3">
                            <div className="font-extrabold">{row.evenement_naam || "-"}</div>
                            <div className="text-[11px]" style={{ color: zebra ? "#5f6470" : "rgba(255,255,255,0.72)" }}>{row.matchmaking_id}</div>
                          </div>
                          <div className="px-3 py-3">{formatDate(row.evenement_datum)}</div>
                          <div className="px-3 py-3 font-bold">{row.bondteam || "-"}</div>
                          <div className="px-3 py-3 font-bold">{row.partijen}</div>
                          <div className="px-3 py-3 font-bold">{row.ingevuld}/{row.partijen}</div>
                          <div className="flex justify-end gap-2 px-3 py-3">
                            <a href={`/api/officials/uitslagen/export?matchmaking_id=${encodeURIComponent(row.matchmaking_id)}`} className="inline-flex rounded-none border-2 border-[#f4f4f4] bg-[linear-gradient(180deg,#ffffff_0%,#d8d8d8_42%,#878787_100%)] px-3 py-2 text-[12px] font-extrabold uppercase tracking-[0.05em] !text-black shadow-[inset_0_1px_0_rgba(255,255,255,.9)]">Excel</a>
                            {isSuperadmin ? (
                              <button type="button" onClick={() => heropen(row.matchmaking_id)} disabled={busyId === row.matchmaking_id} className="inline-flex rounded-none border-2 border-[#ffb18b] bg-[linear-gradient(180deg,#ff7d38_0%,#ff4d00_100%)] px-3 py-2 text-[12px] font-extrabold uppercase tracking-[0.05em] text-white shadow-[0_0_20px_rgba(255,77,0,0.25)] disabled:opacity-50">
                                Op bewerken
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
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
