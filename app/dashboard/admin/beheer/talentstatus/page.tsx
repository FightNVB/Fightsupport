"use client";

import { authedFetch } from "@/lib/api/authedFetch";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Fighter = {
  id: string;
  va_nummer?: string | null;
  naam: string;
  sportschool?: string | null;
  land: string;
  talent_status: string;
  status: string;
  partijen_totaal?: number;
  max_proef_partijen: number;
  moet_evalueren?: boolean;
  created_at: string;
};

export default function TalentstatusPage() {
  const [items, setItems] = useState<Fighter[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("alles");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const res = await authedFetch(`/api/admin/beheer/talentstatus/vechters?status=${status}&q=${encodeURIComponent(q)}`, { cache: "no-store" });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) return setError(json.error || "Laden mislukt");
    setItems(json.items || []);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);
  const evalCount = useMemo(() => items.filter(i => i.moet_evalueren || i.status === "evaluatie_nodig").length, [items]);

  return <main className="min-h-screen bg-[#2b2b2b] p-6 text-white"><style>{`.talent-silver-btn, .talent-silver-btn *{color:#000!important;}`}</style>
    <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
      <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">FightSupport Admin / Beheer</p>
            <h1 className="text-2xl font-black uppercase">J+ talentstatus vechters</h1>
            <p className="text-sm text-zinc-300">Nederlandse J+ vechters moeten talentstatus hebben. Buitenlandse Europese vechters kunnen handmatig op partij worden ingevoerd.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="talent-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black" href="/dashboard/admin/">Terug naar admin</Link>
            <Link className="talent-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black" href="/dashboard/admin/beheer/talentstatus/vechters">Talentstatus vechters</Link>
            <Link className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black" href="/dashboard/admin/beheer/talentstatus/vechters/nieuw">Vechter toevoegen</Link>
            <Link className="talent-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black" href="/dashboard/admin/beheer/talentstatus/partijen">J+ partijen</Link>
            <Link className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black" href="/dashboard/admin/beheer/talentstatus/partijen/nieuw">Partij inboeken</Link>
            <Link className="talent-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black" href="/dashboard/admin/beheer/talentstatus/rapportage">Rapportage</Link>
          </div>
        </div>
      </header>

      <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-3">
        <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{items.length}</b><p className="text-xs uppercase text-zinc-400">Vechters in selectie</p></div>
        <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{evalCount}</b><p className="text-xs uppercase text-zinc-400">Evaluatie nodig</p></div>
        <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">3</b><p className="text-xs uppercase text-zinc-400">Voorlopige partijen standaard</p></div>
      </div>

      <div className="flex flex-wrap gap-2 p-4">
        {["alles", "actief", "evaluatie_nodig", "definitief", "afgewezen"].map(t => <button key={t} onClick={() => setStatus(t)} className={`border px-3 py-2 text-xs font-black uppercase ${status === t ? "border-[#ff4d00] bg-[#ff4d00] !text-black" : "border-zinc-500 bg-[#242424] text-white"}`}>{t.replaceAll("_", " ")}</button>)}
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="ml-auto flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Zoek naam, VA of sportschool" className="border border-zinc-600 bg-[#111] px-3 py-2 text-sm text-white outline-none" />
          <button className="talent-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black !text-black">Zoek</button>
        </form>
      </div>

      {error && <p className="mx-4 mb-4 border border-red-500 bg-red-950 p-3 text-sm">{error}</p>}
      <div className="overflow-x-auto p-4 pt-0">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
            <tr><th className="border border-zinc-700 p-2">Vechter</th><th className="border border-zinc-700 p-2">Sportschool</th><th className="border border-zinc-700 p-2">Land</th><th className="border border-zinc-700 p-2">Partijen</th><th className="border border-zinc-700 p-2">Status</th><th className="border border-zinc-700 p-2">Actie</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="p-4">Laden...</td></tr> : items.map(item => <tr key={item.id} className="bg-[#171717] hover:bg-[#202020]">
              <td className="border border-zinc-800 p-2"><b className="text-[#ff4d00]">{item.naam}</b><br/><span className="text-xs text-zinc-400">{item.va_nummer ? `VA ${item.va_nummer}` : "Geen VA"}</span></td>
              <td className="border border-zinc-800 p-2">{item.sportschool || "-"}</td>
              <td className="border border-zinc-800 p-2">{item.land}</td>
              <td className="border border-zinc-800 p-2 font-bold">{item.partijen_totaal ?? 0} / {item.max_proef_partijen ?? 3}</td>
              <td className="border border-zinc-800 p-2"><span className={`border px-2 py-1 text-xs font-black uppercase ${item.moet_evalueren || item.status === "evaluatie_nodig" ? "border-[#ff4d00] text-[#ff4d00]" : "border-zinc-500 text-zinc-200"}`}>{item.moet_evalueren ? "evaluatie nodig" : item.status}</span></td>
              <td className="border border-zinc-800 p-2"><Link className="talent-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-3 py-1 text-xs font-black !text-black" href={`/dashboard/admin/beheer/talentstatus/${item.id}`}>Open</Link></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  </main>;
}
