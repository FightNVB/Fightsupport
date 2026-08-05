"use client";

import { authedFetch } from "@/lib/api/authedFetch";

import Link from "next/link";
import { use, useEffect, useState } from "react";

export default function TalentstatusDetailPage({ params }: { params: Promise<{ talentId: string }> }) {
  const { talentId } = use(params);
  const [item, setItem] = useState<any>(null);
  const [partijen, setPartijen] = useState<any[]>([]);
  const [evaluatie, setEvaluatie] = useState({ talent_status: "", evaluatie_resultaat: "", evaluatie_opmerking: "" });
  const [error, setError] = useState("");

  async function load() {
    const json = await authedFetch(`/api/admin/beheer/talentstatus/${talentId}`, { cache: "no-store" }).then(r => r.json());
    if (!json.ok) return setError(json.error || "Laden mislukt");
    setItem(json.item); setPartijen(json.partijen || []);
    setEvaluatie({ talent_status: json.item.talent_status || "voorlopig", evaluatie_resultaat: json.item.evaluatie_resultaat || "", evaluatie_opmerking: json.item.evaluatie_opmerking || "" });
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [talentId]);

  async function save(status: string) {
    const json = await authedFetch(`/api/admin/beheer/talentstatus/${talentId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...evaluatie, talent_status: status }) }).then(r => r.json());
    if (!json.ok) return setError(json.error || "Opslaan mislukt");
    await load();
  }

  async function deletePartij(partijId: string) {
    if (!confirm("Weet je zeker dat je deze talentstatus-partij wilt verwijderen?")) return;
    setError("");
    const json = await authedFetch(`/api/admin/beheer/talentstatus/partijen/${partijId}`, { method: "DELETE" }).then(r => r.json());
    if (!json.ok) return setError(json.error || "Verwijderen mislukt");
    await load();
  }

  return <main className="min-h-screen bg-[#2b2b2b] p-6 text-white"><style>{`.talent-silver-btn, .talent-silver-btn *{color:#000!important;}`}</style><section className="mx-auto max-w-6xl border border-zinc-500 bg-[#121212] shadow-2xl">
    <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">Talentstatus dossier</p><h1 className="text-2xl font-black uppercase">{item?.naam || "Laden..."}</h1><p className="text-sm text-zinc-300">{item?.va_nummer ? `VA ${item.va_nummer}` : "Geen VA"} / {item?.sportschool || "-"} / {item?.land || "-"}</p></div><div className="flex gap-2"><Link href="/dashboard/admin/beheer/talentstatus" className="talent-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black">Terug</Link>{item?.va_nummer && <Link href={`/dashboard/admin/beheer/talentstatus/vechter/${item.va_nummer}`} className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black">Vechterrapport</Link>}</div></div></header>
    {error && <p className="m-4 border border-red-500 bg-red-950 p-3 text-sm">{error}</p>}
    {!item ? <p className="p-5">Laden...</p> : <div className="grid gap-5 p-5 lg:grid-cols-[1fr_380px]">
      <section><div className="grid gap-3 md:grid-cols-3"><Card label="Partijen" value={`${item.partijen_totaal ?? 0} / ${item.max_proef_partijen ?? 3}`} /><Card label="Status" value={item.status} /><Card label="Talentstatus" value={item.talent_status} /></div>
        <h2 className="mt-6 mb-3 text-lg font-black uppercase text-[#ff4d00]">Partijen</h2><div className="overflow-x-auto"><table className="w-full border-collapse text-sm"><thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300"><tr><th className="border border-zinc-700 p-2">Event</th><th className="border border-zinc-700 p-2">Vechter 1</th><th className="border border-zinc-700 p-2">Vechter 2</th><th className="border border-zinc-700 p-2">Uitslag</th><th className="border border-zinc-700 p-2">Actie</th></tr></thead><tbody>{partijen.map(p => <tr key={p.id} className="bg-[#171717]"><td className="border border-zinc-800 p-2">{p.event_naam || "-"}<br/><span className="text-xs text-zinc-400">{p.event_datum || ""}</span></td><td className="border border-zinc-800 p-2">{p.vechter_naam}<br/><span className="text-xs text-zinc-400">{p.vechter_gewicht || "-"} kg</span></td><td className="border border-zinc-800 p-2">{p.tegenstander_naam}<br/><span className="text-xs text-zinc-400">{p.tegenstander_gewicht || "-"} kg</span></td><td className="border border-zinc-800 p-2">{p.winnaar || "-"}<br/>{p.uitslag || ""}</td><td className="border border-zinc-800 p-2"><button onClick={() => deletePartij(p.id)} className="talent-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-3 py-1 text-xs font-black uppercase !text-black">Verwijderen</button></td></tr>)}</tbody></table></div></section>
      <aside className="border border-zinc-600 bg-[#181818] p-4"><h2 className="text-lg font-black uppercase text-[#ff4d00]">Evaluatie</h2><p className="mt-1 text-sm text-zinc-300">Na 3 voorlopige partijen moet admin beslissen: definitief of afgewezen.</p><label className="mt-4 block text-sm font-bold uppercase text-zinc-300">Resultaat<input value={evaluatie.evaluatie_resultaat} onChange={e => setEvaluatie(x => ({ ...x, evaluatie_resultaat: e.target.value }))} className="mt-1 w-full border border-zinc-600 bg-[#111] p-2 text-white" /></label><label className="mt-4 block text-sm font-bold uppercase text-zinc-300">Opmerking<textarea value={evaluatie.evaluatie_opmerking} onChange={e => setEvaluatie(x => ({ ...x, evaluatie_opmerking: e.target.value }))} className="mt-1 min-h-24 w-full border border-zinc-600 bg-[#111] p-2 text-white" /></label><div className="mt-4 grid gap-2"><button onClick={() => save("definitief")} className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black">Definitief maken</button><button onClick={() => save("afgewezen")} className="border border-red-500 bg-red-950 px-4 py-2 text-sm font-black uppercase text-red-100">Afwijzen</button><button onClick={() => save("voorlopig")} className="border border-zinc-400 bg-[#242424] px-4 py-2 text-sm font-black uppercase text-white">Voorlopig houden</button></div></aside>
    </div>}
  </section></main>;
}
function Card({ label, value }: { label: string; value: string }) { return <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{value}</b><p className="text-xs uppercase text-zinc-400">{label}</p></div>; }
