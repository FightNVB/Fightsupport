"use client";

import { authedFetch } from "@/lib/api/authedFetch";
import { AuthenticatedDownloadButton } from "@/app/dashboard/_components/AuthenticatedDownloadButton";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Party = any;
type Fighter = any;

const silverBtn = "border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] hover:from-white hover:to-zinc-400";

export default function TalentstatusRapportagePage() {
  const [partijen, setPartijen] = useState<Party[]>([]);
  const [vechters, setVechters] = useState<Fighter[]>([]);
  const [q, setQ] = useState("");
  const [va, setVa] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pdfHref = `/api/admin/beheer/talentstatus/rapportage/pdf?type=rapport&q=${encodeURIComponent(q)}&va=${encodeURIComponent(va)}`;
  const filteredVechters = useMemo(() => vechters.slice(0, 8), [vechters]);
  const filteredPartijen = useMemo(() => partijen.slice(0, 10), [partijen]);

  async function load() {
    setLoading(true); setError("");
    const [p, v] = await Promise.all([
      authedFetch(`/api/admin/beheer/talentstatus/partijen?q=${encodeURIComponent(q)}&va=${encodeURIComponent(va)}`, { cache: "no-store" }).then(r => r.json()),
      authedFetch("/api/admin/beheer/talentstatus/vechters?status=alles", { cache: "no-store" }).then(r => r.json()),
    ]);
    setLoading(false);
    if (!p.ok) setError(p.error || "Partijen laden mislukt"); else setPartijen(p.items || []);
    if (v.ok) setVechters(v.items || []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);



  return <main className="min-h-screen bg-[#2b2b2b] p-6 text-white"><section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
    <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">Talentstatus rapportage</p><h1 className="text-2xl font-black uppercase">Rapport eerst bekijken</h1><p className="text-sm text-zinc-300">Controleer de preview hieronder. Daarna maak je met één knop het complete PDF-rapport.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/dashboard/admin/beheer/talentstatus" className={silverBtn}>Terug</Link><Link href="/dashboard/admin/beheer/talentstatus/vechters" className={silverBtn}>Talentstatus vechters</Link><Link href="/dashboard/admin/beheer/talentstatus/partijen/nieuw" className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black">Partij inboeken</Link></div>
      </div>
    </header>

    <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex flex-wrap gap-2 border-b border-zinc-700 p-4"><input value={q} onChange={e => setQ(e.target.value)} placeholder="Zoek event of naam" className="border border-zinc-600 bg-[#111] px-3 py-2 text-sm text-white outline-none" /><select value={va} onChange={e => setVa(e.target.value)} className="border border-zinc-600 bg-[#111] px-3 py-2 text-sm text-white"><option value="">Alle vechters</option>{vechters.map(v => <option key={v.id} value={v.va_nummer || ""}>{v.naam} {v.va_nummer ? `VA ${v.va_nummer}` : ""}</option>)}</select><button className={silverBtn}>Filter</button><AuthenticatedDownloadButton href={pdfHref} filename="talentstatus-rapport.pdf" className={silverBtn}>Maak PDF</AuthenticatedDownloadButton></form>
    {error && <p className="mx-4 mt-4 border border-red-500 bg-red-950 p-3 text-sm">{error}</p>}

    <div className="grid gap-4 border-b border-zinc-700 p-4 md:grid-cols-3"><Stat value={partijen.length} label="Partijen in rapport" /><Stat value={partijen.filter(p => p.klasse === "J+").length} label="Ingeboekte J+ uitslagen" /><Stat value={vechters.length} label="Talentstatus vechters" /></div>

    <section className="p-4">
      <div className="mx-auto max-w-5xl overflow-hidden border border-zinc-400 bg-[#eeeeee] !text-black shadow-2xl">
        <div className="border-b-4 border-[#ff4d00] bg-gradient-to-r from-[#111] via-[#2f2f2f] to-[#111] p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#ff4d00]">FightSupport</p>
          <h2 className="mt-1 text-3xl font-black uppercase">Talentstatus rapport</h2>
          <p className="mt-1 text-sm text-zinc-300">Preview van het rapport zoals het bedoeld is: donker, zilver en oranje.</p>
        </div>
        <div className="grid gap-3 bg-[#d9d9d9] p-4 md:grid-cols-3"><PreviewStat value={partijen.length} label="Partijen" /><PreviewStat value={partijen.filter(p => p.klasse === "J+").length} label="J+ uitslagen" /><PreviewStat value={new Date().toLocaleDateString("nl-NL")} label="Datum" /></div>
        <div className="p-5">
          <h3 className="border-b-2 border-[#ff4d00] pb-2 text-lg font-black uppercase">Partijen</h3>
          <div className="mt-3 overflow-x-auto"><table className="w-full border-collapse text-sm"><thead className="bg-[#222] text-left text-xs uppercase text-white"><tr><th className="p-2">Datum/event</th><th className="p-2">Vechter 1</th><th className="p-2">Vechter 2</th><th className="p-2">Winnaar</th><th className="p-2">Klasse</th><th className="p-2">Uitslag</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="p-3">Laden...</td></tr> : filteredPartijen.map(p => <tr key={p.id} className="border-b border-zinc-300 bg-white"><td className="p-2"><b>{p.event_naam || "-"}</b><br/><span className="text-xs text-zinc-600">{p.event_datum || "geen datum"}</span></td><td className="p-2"><b>{p.vechter_naam}</b><br/><span className="text-xs text-zinc-600">{p.vechter_land} {p.vechter_va ? `VA ${p.vechter_va}` : ""}</span></td><td className="p-2"><b>{p.tegenstander_naam}</b><br/><span className="text-xs text-zinc-600">{p.tegenstander_land} {p.tegenstander_va ? `VA ${p.tegenstander_va}` : ""}</span></td><td className="p-2">{p.winnaar || "-"}<br/><span className="text-xs text-zinc-600">{p.uitslag || ""}</span></td><td className="p-2"><span className={p.klasse === "J+" ? "border border-[#ff4d00] bg-[#ff4d00] px-2 py-1 text-xs font-black uppercase text-black" : "text-xs text-zinc-500"}>{p.klasse || "-"}</span></td><td className="p-2"><b>{p.methode || p.uitslag || "-"}</b></td></tr>)}</tbody></table></div>
          <h3 className="mt-6 border-b-2 border-[#ff4d00] pb-2 text-lg font-black uppercase">Talentstatus vechters</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">{filteredVechters.map(v => <div key={v.id} className="border border-zinc-300 bg-white p-3"><b className="text-[#ff4d00]">{v.naam}</b><p className="text-xs text-zinc-700">VA {v.va_nummer || "-"} / {v.sportschool || "-"} / {v.land || "-"}</p><p className="text-xs font-bold uppercase">{v.talent_status || "-"} · {v.status || "-"} · partijen {v.partijen_totaal ?? 0}/{v.max_proef_partijen ?? 3}</p></div>)}</div>
          {(partijen.length > filteredPartijen.length || vechters.length > filteredVechters.length) && <p className="mt-4 text-xs font-bold text-zinc-600">Preview toont een selectie. De PDF neemt alle gefilterde records mee.</p>}
        </div>
      </div>
    </section>

    <div className="overflow-x-auto p-4 pt-0"><table className="w-full border-collapse text-sm"><thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300"><tr><th className="border border-zinc-700 p-2">Datum/event</th><th className="border border-zinc-700 p-2">Vechter 1</th><th className="border border-zinc-700 p-2">Vechter 2</th><th className="border border-zinc-700 p-2">Gewicht</th><th className="border border-zinc-700 p-2">Uitslag</th><th className="border border-zinc-700 p-2">Klasse</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="p-4">Laden...</td></tr> : partijen.map(p => <tr key={p.id} className="bg-[#171717] hover:bg-[#202020]"><td className="border border-zinc-800 p-2"><b>{p.event_naam || "-"}</b><br/><span className="text-xs text-zinc-400">{p.event_datum || "geen datum"}</span></td><td className="border border-zinc-800 p-2"><b className="text-[#ff4d00]">{p.vechter_naam}</b><br/><span className="text-xs text-zinc-400">{p.vechter_land} {p.vechter_va ? `VA ${p.vechter_va}` : ""} / {p.vechter_sportschool || "-"}</span></td><td className="border border-zinc-800 p-2"><b className="text-[#ff4d00]">{p.tegenstander_naam}</b><br/><span className="text-xs text-zinc-400">{p.tegenstander_land} {p.tegenstander_va ? `VA ${p.tegenstander_va}` : ""} / {p.tegenstander_sportschool || "-"}</span></td><td className="border border-zinc-800 p-2">{p.vechter_gewicht || "-"} / {p.tegenstander_gewicht || "-"}</td><td className="border border-zinc-800 p-2">{p.winnaar || "-"}<br/><span className="text-xs text-zinc-400">{p.uitslag || ""}</span></td><td className="border border-zinc-800 p-2"><span className={p.klasse === "J+" ? "border border-[#ff4d00] bg-[#ff4d00] px-2 py-1 text-xs font-black uppercase text-black" : "text-xs text-zinc-500"}>{p.klasse || "-"}</span></td></tr>)}</tbody></table></div>
  </section></main>;
}

function Stat({ value, label }: { value: any; label: string }) { return <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{value}</b><p className="text-xs uppercase text-zinc-400">{label}</p></div>; }
function PreviewStat({ value, label }: { value: any; label: string }) { return <div className="border border-zinc-400 bg-gradient-to-b from-white to-zinc-300 p-3"><b className="text-xl !text-black">{value}</b><p className="text-xs font-black uppercase text-zinc-700">{label}</p></div>; }
