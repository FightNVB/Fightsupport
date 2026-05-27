"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NieuweTalentstatusVechterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ naam: "", va_nummer: "", sportschool: "", land: "NL", geboortedatum: "", geslacht: "", talent_status: "voorlopig", opmerkingen: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) { setForm(f => ({ ...f, [key]: value })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const res = await fetch("/api/admin/beheer/talentstatus/vechters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const json = await res.json(); setSaving(false);
    if (!json.ok) return setError(json.error || "Opslaan mislukt");
    router.push("/dashboard/admin/beheer/talentstatus");
  }

  return <main className="min-h-screen bg-[#2b2b2b] p-6 text-white"><style>{`.talent-silver-btn, .talent-silver-btn *{color:#000!important;}`}</style><section className="mx-auto max-w-4xl border border-zinc-500 bg-[#121212] shadow-2xl">
    <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">Talentstatus register</p><h1 className="text-2xl font-black uppercase">J+ vechter toevoegen</h1></header>
    <form onSubmit={submit} className="grid gap-4 p-5 md:grid-cols-2">
      <Field label="Naam" value={form.naam} onChange={v => set("naam", v)} required />
      <Field label="VA nummer" value={form.va_nummer} onChange={v => set("va_nummer", v)} />
      <Field label="Sportschool" value={form.sportschool} onChange={v => set("sportschool", v)} />
      <label className="text-sm font-bold uppercase text-zinc-300">Land<select value={form.land} onChange={e => set("land", e.target.value)} className="mt-1 w-full border border-zinc-600 bg-[#111] p-2 text-white"><option value="NL">Nederland</option><option value="BE">België</option><option value="DE">Duitsland</option><option value="FR">Frankrijk</option><option value="EU">Overig Europa</option></select></label>
      <Field label="Geboortedatum" type="date" value={form.geboortedatum} onChange={v => set("geboortedatum", v)} />
      <Field label="Geslacht" value={form.geslacht} onChange={v => set("geslacht", v)} />
      <label className="text-sm font-bold uppercase text-zinc-300">Talentstatus<select value={form.talent_status} onChange={e => set("talent_status", e.target.value)} className="mt-1 w-full border border-zinc-600 bg-[#111] p-2 text-white"><option value="voorlopig">Voorlopig</option><option value="definitief">Definitief</option><option value="afgewezen">Afgewezen</option></select></label>
      <label className="md:col-span-2 text-sm font-bold uppercase text-zinc-300">Opmerkingen<textarea value={form.opmerkingen} onChange={e => set("opmerkingen", e.target.value)} className="mt-1 min-h-24 w-full border border-zinc-600 bg-[#111] p-2 text-white" /></label>
      {error && <p className="md:col-span-2 border border-red-500 bg-red-950 p-3 text-sm">{error}</p>}
      <div className="md:col-span-2 flex gap-2"><Link href="/dashboard/admin/beheer/talentstatus" className="talent-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black">Annuleren</Link><button disabled={saving} className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black">{saving ? "Opslaan..." : "Opslaan"}</button></div>
    </form>
  </section></main>;
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return <label className="text-sm font-bold uppercase text-zinc-300">{label}<input required={required} type={type} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full border border-zinc-600 bg-[#111] p-2 text-white outline-none" /></label>;
}
