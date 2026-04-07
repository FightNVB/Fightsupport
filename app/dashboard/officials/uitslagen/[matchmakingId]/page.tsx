"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api/authedFetch";
import NvbLightButton from "@/components/NvbLightButton";
import NvbDarkButton from "@/components/NvbDarkButton";

type Row = { id: string; partij_nr: number; discipline: string | null; klasse: string | null; rood_naam: string | null; rood_gym: string | null; blauw_naam: string | null; blauw_gym: string | null; result?: { id?: string; uitslag_status?: string | null; resultaat_type?: string | null; winnaar_hoek?: string | null; methode?: string | null; opmerkingen?: string | null; } | null; };
type State = { resultaat_type: string; winnaar_hoek: string; methode: string; opmerkingen: string; };
const OPTIONS = ["winst", "verlies", "onbeslist", "no_contest", "demo"];

export default function UitslagenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, roles, loading: authLoading } = useAuth();
  const matchmakingId = String(params?.matchmakingId ?? "");
  const [rows, setRows] = useState<Row[]>([]);
  const [states, setStates] = useState<Record<string, State>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const allowed = useMemo(() => (roles ?? []).some((r) => ["official", "hoofdofficial", "admin", "superadmin"].includes(String(r).toLowerCase())), [roles]);

  async function load() {
    setLoading(true); setErr("");
    try {
      const { data: bouts, error: boutsErr } = await supabase.from("uitslagen_bouts").select("*").eq("matchmaking_id", matchmakingId).order("partij_nr", { ascending: true });
      if (boutsErr) throw boutsErr;
      const boutIds = (bouts ?? []).map((b:any)=>b.id);
      const { data: results, error: resErr } = boutIds.length ? await supabase.from("uitslagen_resultaten").select("*").in("uitslagen_bout_id", boutIds) : { data: [], error: null as any };
      if (resErr) throw resErr;
      const resByBout = new Map((results ?? []).map((r:any)=>[String(r.uitslagen_bout_id), r]));
      const nextRows = (bouts ?? []).map((b:any)=>({ id: String(b.id), partij_nr: Number(b.partij_nr), discipline: b.discipline ?? null, klasse: b.klasse ?? null, rood_naam: b.rood_naam ?? null, rood_gym: b.rood_gym ?? null, blauw_naam: b.blauw_naam ?? null, blauw_gym: b.blauw_gym ?? null, result: resByBout.get(String(b.id)) ?? null }));
      setRows(nextRows);
      const st: Record<string, State> = {};
      nextRows.forEach((r) => { st[r.id] = { resultaat_type: r.result?.resultaat_type ?? "", winnaar_hoek: r.result?.winnaar_hoek ?? "", methode: r.result?.methode ?? "", opmerkingen: r.result?.opmerkingen ?? "" }; });
      setStates(st);
    } catch (e:any) { setErr(e?.message ?? "Laden mislukt."); } finally { setLoading(false); }
  }

  useEffect(() => { if (authLoading) return; if (!user) return void router.replace("/login"); if (!allowed) return void router.replace("/dashboard"); void load(); }, [authLoading, user, allowed, router, matchmakingId]);
  function setRowState(id: string, patch: Partial<State>) { setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } })); }
  async function saveRow(row: Row) {
    const state = states[row.id]; if (!state) return;
    setBusyId(row.id); setErr(""); setMsg("");
    try {
      const res = await authedFetch("/api/officials/uitslagen/upsert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uitslagen_bout_id: row.id, matchmaking_id: matchmakingId, partij_nr: row.partij_nr, resultaat_type: state.resultaat_type || null, winnaar_hoek: state.winnaar_hoek || null, methode: state.methode || null, opmerkingen: state.opmerkingen || null }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Opslaan mislukt.");
      setMsg(`Partij ${row.partij_nr} opgeslagen.`);
      await load();
    } catch (e:any) { setErr(e?.message ?? "Opslaan mislukt."); } finally { setBusyId(null); }
  }
  async function finalizeAll() {
    setErr(""); setMsg("");
    try {
      const res = await authedFetch("/api/officials/uitslagen/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchmaking_id: matchmakingId }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Finaliseren mislukt.");
      setMsg("Alles is gefinaliseerd en staat vast.");
      await load();
    } catch (e:any) { setErr(e?.message ?? "Finaliseren mislukt."); }
  }
  return <main className="min-h-screen bg-[#eceff3] px-4 py-5"><div className="mx-auto w-full max-w-[1780px]"><div className="rounded-[30px] border border-zinc-300 bg-white p-4"><div className="mb-4 flex items-center justify-between"><div className="flex gap-2"><NvbLightButton label="← Overzicht" onClick={() => router.push("/dashboard/officials/uitslagen")} /><NvbDarkButton label="↺ Ververs" onClick={() => void load()} /></div><Image src="/branding/fightsupport/excel-logo.png" alt="FightSupport" width={280} height={80} priority style={{ width: "auto", height: "58px", objectFit: "contain" }} /><button onClick={() => void finalizeAll()} className="rounded-xl bg-[#ff4d00] px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.05em] text-white">Finaliseren</button></div><h1 className="text-[30px] font-black uppercase tracking-[0.08em] text-[#ff4d00]">Uitslagen per partij</h1>{msg ? <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{msg}</div> : null}{err ? <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{err}</div> : null}<div className="mt-4 space-y-3">{loading ? <div className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-zinc-500">Laden…</div> : rows.length === 0 ? <div className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-zinc-500">Geen partijen gevonden.</div> : rows.map((row, idx) => <div key={row.id} className="rounded-[18px] border p-3" style={{ background: idx % 2 === 0 ? "#ffffff" : "#34343a", color: idx % 2 === 0 ? "#111111" : "#ffffff", borderColor: "rgba(84,84,90,0.28)" }}><div className="grid gap-3 xl:grid-cols-[72px_110px_130px_1.2fr_1.2fr_1.8fr_120px] xl:items-center"><div className="font-black">{row.partij_nr}</div><div className="font-bold">{row.discipline || "-"}</div><div className="font-bold">{row.klasse || "-"}</div><div><div className="font-black">{row.rood_naam || "-"}</div><div className="text-[11px] opacity-70">{row.rood_gym || "-"}</div></div><div><div className="font-black">{row.blauw_naam || "-"}</div><div className="text-[11px] opacity-70">{row.blauw_gym || "-"}</div></div><div className="space-y-2"><div className="grid grid-cols-2 gap-2"><select value={states[row.id]?.resultaat_type ?? ""} onChange={(e)=>setRowState(row.id,{resultaat_type:e.target.value})} className="rounded-lg border px-3 py-2 text-black"><option value="">Kies resultaat</option>{OPTIONS.map((o)=><option key={o} value={o}>{o}</option>)}</select><select value={states[row.id]?.winnaar_hoek ?? ""} onChange={(e)=>setRowState(row.id,{winnaar_hoek:e.target.value})} className="rounded-lg border px-3 py-2 text-black"><option value="">Winnaar hoek</option><option value="rood">Rood</option><option value="blauw">Blauw</option></select></div><div className="grid grid-cols-2 gap-2"><input value={states[row.id]?.methode ?? ""} onChange={(e)=>setRowState(row.id,{methode:e.target.value})} placeholder="Methode" className="rounded-lg border px-3 py-2 text-black" /><input value={states[row.id]?.opmerkingen ?? ""} onChange={(e)=>setRowState(row.id,{opmerkingen:e.target.value})} placeholder="Opmerkingen" className="rounded-lg border px-3 py-2 text-black" /></div></div><div><button onClick={()=>void saveRow(row)} disabled={busyId===row.id} className="rounded-xl bg-[#ff4d00] px-3 py-2 text-[12px] font-extrabold uppercase tracking-[0.05em] text-white">{busyId===row.id ? "Opslaan…" : "Opslaan"}</button></div></div></div>)}</div></div></div></main>;
}
