"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Fighter = { id: string; naam: string; va_nummer?: string | null; sportschool?: string | null; land: string; talent_status: string };

const silverBtn = "talent-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] hover:from-white hover:to-zinc-400";
const orangeBtn = "border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black";

export default function NieuweTalentstatusPartijPage() {
  const router = useRouter();
  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [form, setForm] = useState({
    event_naam: "", event_datum: "",
    vechter_id: "", vechter_naam: "", vechter_sportschool: "", vechter_va: "", vechter_land: "NL", vechter_gewicht: "",
    tegenstander_id: "", tegenstander_naam: "", tegenstander_sportschool: "", tegenstander_va: "", tegenstander_land: "NL", tegenstander_gewicht: "",
    winnaar: "", methode: "", uitslag: "", opmerkingen: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch("/api/admin/beheer/talentstatus/vechters?status=alles", { cache: "no-store" }).then(r => r.json()).then(j => setFighters(j.items || [])); }, []);
  function set<K extends keyof typeof form>(key: K, value: string) { setForm(f => ({ ...f, [key]: value })); }
  function choose(side: "vechter" | "tegenstander", id: string) {
    const f = fighters.find(x => x.id === id);
    set(`${side}_id` as keyof typeof form, id);
    if (!f) return;
    set(`${side}_naam` as keyof typeof form, f.naam);
    set(`${side}_sportschool` as keyof typeof form, f.sportschool || "");
    set(`${side}_va` as keyof typeof form, f.va_nummer || "");
    set(`${side}_land` as keyof typeof form, f.land || "NL");
  }
  const methods = ["Punten", "KO", "Technisch KO", "Medische interventie", "Opgave", "Submission", "Diskwalificatie", "RSC"];
  
  const isSpecialResult = ["Onbeslist", "No contest", "Demo"].includes(form.winnaar);
  const winnerName =
    form.winnaar === "vechter"
      ? form.vechter_naam
      : form.winnaar === "tegenstander"
        ? form.tegenstander_naam
        : form.winnaar;
  const winnerLabel =
    form.winnaar === "vechter"
      ? `Vechter 1 - ${form.vechter_naam || "nog niet gekozen"}`
      : form.winnaar === "tegenstander"
        ? `Vechter 2 - ${form.tegenstander_naam || "nog niet gekozen"}`
        : form.winnaar;


  function buildUitslag() {
    if (form.winnaar === "Onbeslist") return "Onbeslist";
    if (form.winnaar === "No contest") return "No contest";
    if (form.winnaar === "Demo") return "Demo";
    if (!form.winnaar || !form.methode) return "";
    const method = form.methode.toLowerCase();
    return `Wint op ${method}`;
  }

  function buildPreview() {
    const uitslag = buildUitslag();
    if (!uitslag) return "Kies eerst winnaar en methode.";
    if (form.winnaar === "vechter" || form.winnaar === "tegenstander") {
      return `${winnerLabel} — ${uitslag}`;
    }
    return uitslag;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const payload = {
      ...form,
      winnaar_keuze: form.winnaar,
      winnaar: winnerName || null,
      uitslag: buildUitslag(),
    };
    const res = await fetch("/api/admin/beheer/talentstatus/partijen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await res.json(); setSaving(false);
    if (!json.ok) return setError(json.error || "Opslaan mislukt");
    router.push("/dashboard/admin/beheer/talentstatus/rapportage");
  }

  return <main className="min-h-screen bg-[#2b2b2b] p-6 text-white"><style>{`.talent-silver-btn, .talent-silver-btn *{color:#000!important;}`}</style><section className="mx-auto max-w-6xl border border-zinc-500 bg-[#121212] shadow-2xl">
    <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">Talentstatus partij</p><h1 className="text-2xl font-black uppercase">J+ partij inboeken</h1><p className="text-sm text-zinc-300">Vechter 1 tegen Vechter 2. Nederlandse vechters moeten in het talentstatus-register staan. Buitenlandse Europese vechters mogen handmatig worden ingevoerd.</p></header>
    <form onSubmit={submit} className="grid gap-4 p-5">
      <div className="grid gap-4 md:grid-cols-2"><Field label="Event naam" value={form.event_naam} onChange={v => set("event_naam", v)} /><Field label="Event datum" type="date" value={form.event_datum} onChange={v => set("event_datum", v)} /></div>
      <div className="grid gap-4 md:grid-cols-2">
        <FighterBlock title="Vechter 1" side="vechter" form={form} fighters={fighters} set={set} choose={choose} />
        <FighterBlock title="Vechter 2" side="tegenstander" form={form} fighters={fighters} set={set} choose={choose} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold uppercase text-zinc-300">Winnaar
          <select value={form.winnaar} onChange={e => { set("winnaar", e.target.value); if (["Onbeslist", "No contest", "Demo", ""].includes(e.target.value)) set("methode", ""); }} className="mt-1 w-full border border-zinc-600 bg-[#111] p-2 text-white outline-none">
            <option value="">Kies winnaar</option>
            <option value="vechter" disabled={!form.vechter_naam}>Vechter 1 - {form.vechter_naam || "nog niet gekozen"}</option>
            <option value="tegenstander" disabled={!form.tegenstander_naam}>Vechter 2 - {form.tegenstander_naam || "nog niet gekozen"}</option>
            <option value="Onbeslist">Onbeslist</option>
            <option value="No contest">No contest</option>
            <option value="Demo">Demo</option>
          </select>
        </label>
        <label className="text-sm font-bold uppercase text-zinc-300">Methode
          <select disabled={!form.winnaar || isSpecialResult} value={form.methode} onChange={e => set("methode", e.target.value)} className="mt-1 w-full border border-zinc-600 bg-[#111] p-2 text-white outline-none disabled:opacity-40">
            <option value="">Kies methode</option>
            {methods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <span className="mt-1 block text-xs normal-case text-zinc-500">{buildPreview()}</span>
        </label>
      </div>
      <label className="text-sm font-bold uppercase text-zinc-300">Opmerkingen<textarea value={form.opmerkingen} onChange={e => set("opmerkingen", e.target.value)} className="mt-1 min-h-24 w-full border border-zinc-600 bg-[#111] p-2 text-white" /></label>
      {error && <p className="border border-red-500 bg-red-950 p-3 text-sm">{error}</p>}
      <div className="flex gap-2"><Link href="/dashboard/admin/beheer/talentstatus" className={silverBtn}>Annuleren</Link><button disabled={saving} className={orangeBtn}>{saving ? "Opslaan..." : "Partij opslaan"}</button></div>
    </form>
  </section></main>;
}

function FighterBlock({ title, side, form, fighters, set, choose }: any) {
  const idKey = `${side}_id`, naamKey = `${side}_naam`, schoolKey = `${side}_sportschool`, vaKey = `${side}_va`, landKey = `${side}_land`, gewichtKey = `${side}_gewicht`;
  const [zoek, setZoek] = useState("");
  const filtered = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    if (!term) return fighters.slice(0, 20);
    return fighters.filter((f: Fighter) => `${f.naam || ""} ${f.va_nummer || ""} ${f.sportschool || ""}`.toLowerCase().includes(term)).slice(0, 20);
  }, [fighters, zoek]);
  const selected = fighters.find((f: Fighter) => f.id === form[idKey]);

  return <section className="border border-zinc-600 bg-[#181818] p-4"><h2 className="mb-3 text-lg font-black uppercase text-[#ff4d00]">{title}</h2>
    <label className="text-sm font-bold uppercase text-zinc-300">Kies talentstatus-vechter</label>
    <input value={zoek} onChange={e => setZoek(e.target.value)} placeholder="Typ naam, deel van naam, VA of sportschool..." className="mt-1 w-full border border-zinc-600 bg-[#111] p-2 text-white outline-none" />
    <select value={form[idKey]} onChange={e => choose(side, e.target.value)} className="mt-2 w-full border border-zinc-600 bg-[#111] p-2 text-white">
      <option value="">Handmatig / buitenland</option>
      {selected && !filtered.some((f: Fighter) => f.id === selected.id) && <option value={selected.id}>{selected.naam} {selected.va_nummer ? `(VA ${selected.va_nummer})` : ""} - {selected.sportschool || "geen sportschool"}</option>}
      {filtered.map((f: Fighter) => <option key={f.id} value={f.id}>{f.naam} {f.va_nummer ? `(VA ${f.va_nummer})` : ""} - {f.sportschool || "geen sportschool"}</option>)}
    </select>
    <div className="mt-3 grid gap-3 md:grid-cols-2"><Field label="Naam" value={form[naamKey]} onChange={(v: string) => set(naamKey, v)} required /><Field label="Sportschool" value={form[schoolKey]} onChange={(v: string) => set(schoolKey, v)} /><Field label="VA nummer" value={form[vaKey]} onChange={(v: string) => set(vaKey, v)} /><Field label="Gewicht" type="number" value={form[gewichtKey]} onChange={(v: string) => set(gewichtKey, v)} /></div>
    <label className="mt-3 block text-sm font-bold uppercase text-zinc-300">Land<select value={form[landKey]} onChange={e => set(landKey, e.target.value)} className="mt-1 w-full border border-zinc-600 bg-[#111] p-2 text-white"><option value="NL">Nederland - talentstatus verplicht</option><option value="BE">België</option><option value="DE">Duitsland</option><option value="FR">Frankrijk</option><option value="EU">Overig Europa</option></select></label>
  </section>;
}
function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) { return <label className="text-sm font-bold uppercase text-zinc-300">{label}<input required={required} type={type} step={type === "number" ? "0.1" : undefined} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full border border-zinc-600 bg-[#111] p-2 text-white outline-none" /></label>; }
