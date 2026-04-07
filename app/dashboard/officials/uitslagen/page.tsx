"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import NvbLightButton from "@/components/NvbLightButton";
import NvbDarkButton from "@/components/NvbDarkButton";

const ORANGE = "#ff4d00";

type Row = {
  matchmaking_id: string;
  bondteam: string | null;
  evenement_naam: string | null;
  evenement_datum: string | null;
  partijen: number;
  ingevuld: number;
  finalized: boolean;
};

function metalFrameStyle(): CSSProperties { return { background: "linear-gradient(180deg, rgba(248,248,248,0.98) 0%, rgba(214,214,214,0.98) 16%, rgba(125,125,125,0.98) 48%, rgba(235,235,235,0.98) 100%)", boxShadow: "0 0 0 1px rgba(255,255,255,0.65), 0 18px 40px rgba(0,0,0,0.22)" }; }
function contentPanelStyle(): CSSProperties { return { background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(241,244,247,0.98) 100%)", border: "2px solid rgba(84,84,90,0.34)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.88)" }; }
function formatDate(v: string | null) { if (!v) return "-"; const d = new Date(v.length===10?`${v}T00:00:00`:v); return Number.isNaN(d.getTime())?v:d.toLocaleDateString("nl-NL"); }

export default function OfficialsUitslagenPage() {
  const router = useRouter();
  const { user, roles, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const allowed = useMemo(() => roles?.some((r) => ["official", "hoofdofficial", "admin", "superadmin"].includes(String(r).toLowerCase())) ?? false, [roles]);
  async function load() {
    setLoading(true); setError("");
    try {
      const [{ data: runRows, error: runErr }, { data: boutRows, error: boutErr }, { data: resultRows, error: resultErr }, { data: uploadRows, error: uploadErr }] = await Promise.all([
        supabase.from("uitslagen_runs").select("id, matchmaking_id, status"),
        supabase.from("uitslagen_bouts").select("uitslagen_run_id, matchmaking_id, partij_nr"),
        supabase.from("uitslagen_resultaten").select("uitslagen_run_id, uitslag_status"),
        supabase.from("matchmaking_uploads").select("matchmaking_id, bondteam, evenement_naam, evenement_datum"),
      ]);
      if (runErr) throw runErr; if (boutErr) throw boutErr; if (resultErr) throw resultErr; if (uploadErr) throw uploadErr;
      const metaById = new Map((uploadRows ?? []).map((r:any)=>[String(r.matchmaking_id), r]));
      const byRun = new Map<string, Row>();
      for (const run of runRows ?? []) {
        const mmid = String((run as any).matchmaking_id ?? "").trim();
        if (!mmid) continue;
        const meta:any = metaById.get(mmid) ?? {};
        byRun.set(String((run as any).id), { matchmaking_id: mmid, bondteam: meta?.bondteam ?? null, evenement_naam: meta?.evenement_naam ?? null, evenement_datum: meta?.evenement_datum ?? null, partijen: 0, ingevuld: 0, finalized: String((run as any).status ?? "") === "afgerond" });
      }
      for (const row of boutRows ?? []) { const cur = byRun.get(String((row as any).uitslagen_run_id)); if (cur) cur.partijen += 1; }
      for (const row of resultRows ?? []) { const cur = byRun.get(String((row as any).uitslagen_run_id)); if (cur && String((row as any).uitslag_status ?? "") !== "concept") cur.ingevuld += 1; }
      setRows(Array.from(byRun.values()).sort((a,b)=>String(b.evenement_datum??"").localeCompare(String(a.evenement_datum??""))));
    } catch (e:any) { setError(e?.message ?? "Laden mislukt."); } finally { setLoading(false); }
  }
  useEffect(() => { if (authLoading) return; if (!user) return void router.replace("/login"); if (!allowed) return void router.replace("/dashboard"); void load(); }, [authLoading, user, allowed, router]);
  const filtered = rows.filter((row) => [row.evenement_naam, row.evenement_datum, row.bondteam, row.matchmaking_id].map((v) => String(v ?? "").toLowerCase()).join(" ").includes(query.toLowerCase()));
  return <main className="min-h-screen bg-[#eceff3] px-4 py-5"><div className="mx-auto w-full max-w-[1520px]"><div className="rounded-[30px] p-[5px]" style={metalFrameStyle()}><div className="overflow-hidden rounded-[26px]" style={{ background: "linear-gradient(180deg, rgba(41,41,46,0.98) 0%, rgba(24,24,28,0.98) 100%)", border: "2px solid rgba(70,70,74,0.38)" }}><div className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-[1fr_auto_1fr] md:items-center" style={{ borderBottom: "3px solid rgba(255,77,0,0.58)" }}><div className="flex flex-wrap items-center gap-2 md:justify-self-start"><NvbLightButton label="← Menu" onClick={() => router.push("/dashboard/officials")} /><NvbDarkButton label="↺ Ververs" onClick={() => void load()} /></div><div className="flex justify-center"><Image src="/branding/fightsupport/excel-logo.png" alt="FightSupport" width={280} height={80} priority style={{ width: "auto", height: "58px", objectFit: "contain" }} /></div><div className="text-right md:justify-self-end"><div className="text-[18px] font-black uppercase tracking-[0.12em]" style={{ color: ORANGE }}>Official Uitslagen</div><div className="text-[12px] text-white/60">Overzicht van uitslagen-runs</div></div></div><div className="p-4 md:p-5"><div className="rounded-[24px] p-[4px]" style={metalFrameStyle()}><div className="rounded-[20px] p-4 md:p-5" style={contentPanelStyle()}><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h1 className="text-[30px] font-black uppercase tracking-[0.08em] md:text-[36px]" style={{ color: ORANGE }}>Uitslagen overzicht</h1><p className="text-[13px] text-zinc-600">Selecteer een matchmaking om uitslagen te verwerken.</p></div><div className="relative w-full md:w-[360px]"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek op event, bondteam of id" className="w-full rounded-2xl border bg-white py-2.5 pl-9 pr-3 text-sm outline-none" style={{ borderColor: "rgba(63,63,70,0.25)" }} /></div></div>{error ? <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div> : null}<div className="mt-4 overflow-hidden rounded-[18px] border border-zinc-500/30"><div className="grid grid-cols-[1.7fr_120px_120px_110px_110px_120px] border-b text-[11px] font-extrabold uppercase tracking-[0.08em] text-white" style={{ background: "linear-gradient(180deg, rgba(56,56,61,1) 0%, rgba(34,34,39,1) 100%)" }}><div className="px-4 py-3">Evenement</div><div className="px-3 py-3">Datum</div><div className="px-3 py-3">Bondteam</div><div className="px-3 py-3">Partijen</div><div className="px-3 py-3">Ingevuld</div><div className="px-3 py-3">Actie</div></div>{loading ? <div className="bg-white px-4 py-8 text-center text-sm text-zinc-500">Laden…</div> : filtered.length === 0 ? <div className="bg-white px-4 py-8 text-center text-sm text-zinc-500">Geen uitslagen gevonden.</div> : filtered.map((row, i) => { const zebra = i % 2 === 0; return <div key={row.matchmaking_id} className="grid grid-cols-[1.7fr_120px_120px_110px_110px_120px] items-center text-[13px]" style={{ background: zebra ? "#ffffff" : "#34343a", color: zebra ? "#111111" : "#ffffff" }}><div className="px-4 py-3"><div className="font-extrabold">{row.evenement_naam || "-"}</div><div className="text-[11px]" style={{ color: zebra ? "#5f6470" : "rgba(255,255,255,0.72)" }}>{row.matchmaking_id}</div></div><div className="px-3 py-3">{formatDate(row.evenement_datum)}</div><div className="px-3 py-3 font-bold">{row.bondteam || "-"}</div><div className="px-3 py-3 font-bold">{row.partijen}</div><div className="px-3 py-3 font-bold">{row.ingevuld}</div><div className="px-3 py-3"><Link href={`/dashboard/officials/uitslagen/${encodeURIComponent(row.matchmaking_id)}`} className="inline-flex rounded-xl px-3 py-2 text-[12px] font-extrabold uppercase tracking-[0.05em] text-white" style={{ background: "linear-gradient(180deg, #ff6a1a 0%, #ff4d00 55%, #d63b00 100%)" }}>Open</Link></div></div>; })}</div></div></div></div></div></div></div></main>; }
