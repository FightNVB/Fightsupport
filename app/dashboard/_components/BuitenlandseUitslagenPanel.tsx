"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { authedFetch } from "@/lib/api/authedFetch";

type Row = Record<string, any>;

export default function BuitenlandseUitslagenPanel() {
  const path = usePathname() ?? "";
  const mm = path.match(/^\/dashboard\/matchmaker\/matchmaking\/([^/]+)\/partij\/(\d+)/);
  const admin = path.match(/^\/dashboard\/admin\/controle\/([^/]+)\/partij\/(\d+)/);
  const match = mm || admin;
  const isAdmin = !!admin;
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ va_nummer:"", vechter_naam:"", datum:"", discipline:"", klasse:"", tegenstander:"", uitslag:"W", evenement:"", organisatie:"", land:"", bewijs_opmerking:"" });

  const matchmakingId = match?.[1] ?? "";
  const partijNr = match?.[2] ?? "";

  async function load() {
    if (!matchmakingId) return;
    const r = await authedFetch(`/api/matchmaker/buitenlandse-uitslagen?matchmaking_id=${encodeURIComponent(matchmakingId)}`);
    const j = await r.json().catch(() => ({}));
    if (r.ok) setRows((j.uitslagen ?? []).filter((x: Row) => String(x.partij_nr ?? "") === partijNr));
  }
  useEffect(() => { void load(); }, [matchmakingId, partijNr]);
  if (!match) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    try {
      const r = await authedFetch("/api/matchmaker/buitenlandse-uitslagen", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ ...form, matchmaking_id: matchmakingId, partij_nr:Number(partijNr) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Opslaan mislukt");
      setMsg("Buitenlandse uitslag ingediend voor NVB-controle.");
      setForm({ va_nummer:"", vechter_naam:"", datum:"", discipline:"", klasse:"", tegenstander:"", uitslag:"W", evenement:"", organisatie:"", land:"", bewijs_opmerking:"" });
      await load();
    } catch(e:any) { setMsg(e?.message ?? "Opslaan mislukt"); } finally { setSaving(false); }
  }

  async function status(id:string, next:string) {
    const r = await authedFetch("/api/matchmaker/buitenlandse-uitslagen", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id,status:next}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setMsg(j.error ?? "Bijwerken mislukt");
    await load();
  }

  const pending = rows.filter(r => r.status !== "VERWERKT_IN_FIGHTPASSPORT" && r.status !== "AFGEWEZEN").length;
  return <>
    <button type="button" onClick={()=>setOpen(true)} className="fixed bottom-5 right-5 z-[90] rounded-md border border-[#ff4d00] bg-[#171717] px-4 py-2 text-sm font-black text-white shadow-2xl hover:bg-[#242424]">
      {isAdmin ? `Buitenlandse uitslagen${pending ? ` (${pending})` : ""}` : "＋ Buitenlandse uitslag"}
    </button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg border border-zinc-500 bg-[#171717] p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><div><div className="text-xs font-black uppercase tracking-widest text-[#ff4d00]">Partij {partijNr}</div><h2 className="text-xl font-black">Buitenlandse uitslagen</h2></div><button onClick={()=>setOpen(false)} className="text-2xl text-zinc-300">×</button></div>
        {!isAdmin && <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input required placeholder="VA-nummer *" value={form.va_nummer} onChange={e=>setForm({...form,va_nummer:e.target.value})} className="rounded border border-zinc-600 bg-zinc-900 p-2" />
          <input placeholder="Naam vechter" value={form.vechter_naam} onChange={e=>setForm({...form,vechter_naam:e.target.value})} className="rounded border border-zinc-600 bg-zinc-900 p-2" />
          <input type="date" value={form.datum} onChange={e=>setForm({...form,datum:e.target.value})} className="rounded border border-zinc-600 bg-zinc-900 p-2" />
          <input placeholder="Discipline" value={form.discipline} onChange={e=>setForm({...form,discipline:e.target.value})} className="rounded border border-zinc-600 bg-zinc-900 p-2" />
          <input placeholder="Klasse" value={form.klasse} onChange={e=>setForm({...form,klasse:e.target.value})} className="rounded border border-zinc-600 bg-zinc-900 p-2" />
          <input placeholder="Tegenstander" value={form.tegenstander} onChange={e=>setForm({...form,tegenstander:e.target.value})} className="rounded border border-zinc-600 bg-zinc-900 p-2" />
          <select value={form.uitslag} onChange={e=>setForm({...form,uitslag:e.target.value})} className="rounded border border-zinc-600 bg-zinc-900 p-2"><option>W</option><option>V</option><option>G</option><option>NC</option></select>
          <input placeholder="Evenement" value={form.evenement} onChange={e=>setForm({...form,evenement:e.target.value})} className="rounded border border-zinc-600 bg-zinc-900 p-2" />
          <input placeholder="Organisatie / bond" value={form.organisatie} onChange={e=>setForm({...form,organisatie:e.target.value})} className="rounded border border-zinc-600 bg-zinc-900 p-2" />
          <input placeholder="Land" value={form.land} onChange={e=>setForm({...form,land:e.target.value})} className="rounded border border-zinc-600 bg-zinc-900 p-2" />
          <textarea placeholder="Bewijs / opmerking" value={form.bewijs_opmerking} onChange={e=>setForm({...form,bewijs_opmerking:e.target.value})} className="md:col-span-2 rounded border border-zinc-600 bg-zinc-900 p-2" />
          <button disabled={saving} className="rounded bg-[#ff4d00] px-4 py-2 font-black text-white disabled:opacity-50">{saving?"Opslaan…":"Indienen voor NVB-controle"}</button>
        </form>}
        {msg && <div className="my-3 rounded border border-zinc-600 bg-zinc-900 p-2 text-sm">{msg}</div>}
        <div className="mt-5 space-y-2">
          {rows.length===0 && <div className="text-sm text-zinc-400">Geen buitenlandse uitslagen gemeld voor deze partij.</div>}
          {rows.map(r=><div key={r.id} className="rounded border border-zinc-700 bg-zinc-900 p-3">
            <div className="flex flex-wrap justify-between gap-2"><b>{r.vechter_naam || "Vechter"} · VA {r.va_nummer}</b><span className="text-xs font-black text-[#ff4d00]">{r.status}</span></div>
            <div className="mt-1 text-sm text-zinc-300">{r.datum || "datum onbekend"} · {r.discipline || "discipline onbekend"} {r.klasse || ""} · {r.uitslag} vs {r.tegenstander || "onbekend"} · {r.evenement || "evenement onbekend"} · {r.land || "land onbekend"}</div>
            {r.bewijs_opmerking && <div className="mt-1 text-xs text-zinc-400">{r.bewijs_opmerking}</div>}
            {isAdmin && r.status!=="VERWERKT_IN_FIGHTPASSPORT" && r.status!=="AFGEWEZEN" && <div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>status(r.id,"GOEDGEKEURD")} className="rounded border border-green-700 px-3 py-1 text-xs font-bold">Goedkeuren</button><button onClick={()=>status(r.id,"VERWERKT_IN_FIGHTPASSPORT")} className="rounded bg-[#ff4d00] px-3 py-1 text-xs font-bold">Verwerkt in Fightpassport</button><button onClick={()=>status(r.id,"AFGEWEZEN")} className="rounded border border-red-700 px-3 py-1 text-xs font-bold">Afwijzen</button></div>}
          </div>)}
        </div>
      </div>
    </div>}
  </>;
}
