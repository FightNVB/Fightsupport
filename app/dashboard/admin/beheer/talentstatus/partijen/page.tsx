"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Party = any;

const silverBtn = "talent-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] hover:from-white hover:to-zinc-400";

function clean(v: any) {
  return String(v ?? "").trim();
}

export default function TalentstatusPartijenPage() {
  const [partijen, setPartijen] = useState<Party[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/beheer/talentstatus/partijen?klasse=${encodeURIComponent("J+")}&q=${encodeURIComponent(q)}`, { cache: "no-store" });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) return setError(json.error || "Talentstatus-partijen laden mislukt.");
    setPartijen(json.items || []);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => {
    const events = new Set(partijen.map((p) => clean(p.event_naam)).filter(Boolean));
    const openEvaluatie = partijen.filter((p) => clean(p.status).toLowerCase().includes("evaluatie")).length;
    return { events: events.size, openEvaluatie };
  }, [partijen]);

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <style>{`.talent-silver-btn, .talent-silver-btn *{color:#000!important;}`}</style>
      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">FightSupport Admin / Talentstatus</p>
              <h1 className="text-2xl font-black uppercase">Overzicht J+ talentstatus partijen</h1>
              <p className="text-sm text-zinc-300">Alle partijen met klasse J+ uit uitslagen_resultaten en handmatig ingeboekte talentstatus-partijen.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/admin/beheer/talentstatus" className={silverBtn}>Terug</Link>
              <Link href="/dashboard/admin/beheer/talentstatus/partijen/nieuw" className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black">Partij inboeken</Link>
              <Link href="/dashboard/admin/beheer/talentstatus/rapportage" className={silverBtn}>Rapportage / PDF</Link>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-3">
          <Stat value={partijen.length} label="J+ partijen" />
          <Stat value={stats.events} label="Evenementen" />
          <Stat value={stats.openEvaluatie} label="Evaluatie nodig" />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex flex-wrap gap-2 border-b border-zinc-700 p-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek event, vechter of sportschool" className="min-w-[280px] flex-1 border border-zinc-600 bg-[#111] px-3 py-2 text-sm text-white outline-none" />
          <button className={silverBtn}>Zoek</button>
        </form>

        {error && <p className="mx-4 mt-4 border border-red-500 bg-red-950 p-3 text-sm">{error}</p>}

        <div className="overflow-x-auto p-4">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
              <tr>
                <th className="border border-zinc-700 p-2">Datum/event</th>
                <th className="border border-zinc-700 p-2">Vechter rood / 1</th>
                <th className="border border-zinc-700 p-2">Vechter blauw / 2</th>
                <th className="border border-zinc-700 p-2">Gewicht</th>
                <th className="border border-zinc-700 p-2">Uitslag</th>
                <th className="border border-zinc-700 p-2">Bron</th>
                <th className="border border-zinc-700 p-2">Klasse</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="border border-zinc-800 p-4">Laden...</td></tr>
              ) : partijen.length === 0 ? (
                <tr><td colSpan={7} className="border border-zinc-800 p-4">Geen J+ talentstatus-partijen gevonden.</td></tr>
              ) : partijen.map((p) => (
                <tr key={p.id} className="bg-[#171717] hover:bg-[#202020]">
                  <td className="border border-zinc-800 p-2"><b>{p.event_naam || "-"}</b><br /><span className="text-xs text-zinc-400">{p.event_datum || "geen datum"} · partij {p.partij_nr || "-"}</span></td>
                  <td className="border border-zinc-800 p-2"><b className="text-[#ff4d00]">{p.vechter_naam || "-"}</b><br /><span className="text-xs text-zinc-400">{p.vechter_sportschool || "-"} {p.vechter_va ? `· VA ${p.vechter_va}` : ""}</span></td>
                  <td className="border border-zinc-800 p-2"><b className="text-[#ff4d00]">{p.tegenstander_naam || "-"}</b><br /><span className="text-xs text-zinc-400">{p.tegenstander_sportschool || "-"} {p.tegenstander_va ? `· VA ${p.tegenstander_va}` : ""}</span></td>
                  <td className="border border-zinc-800 p-2">{p.vechter_gewicht || "-"} / {p.tegenstander_gewicht || "-"}</td>
                  <td className="border border-zinc-800 p-2"><b>{p.winnaar || "-"}</b><br /><span className="text-xs text-zinc-400">{p.uitslag || p.methode || ""}</span></td>
                  <td className="border border-zinc-800 p-2"><span className="border border-zinc-500 px-2 py-1 text-xs font-black uppercase text-zinc-200">{p.bron || "-"}</span></td>
                  <td className="border border-zinc-800 p-2"><span className="border border-[#ff4d00] bg-[#ff4d00] px-2 py-1 text-xs font-black uppercase text-black">{p.klasse || "J+"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: any; label: string }) {
  return <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{value}</b><p className="text-xs uppercase text-zinc-400">{label}</p></div>;
}
