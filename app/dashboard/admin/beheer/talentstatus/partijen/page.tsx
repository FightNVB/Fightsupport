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

  const displayPartijen = useMemo(() => {
    const map = new Map<string, Party>();

    for (const p of partijen) {
      const key = [
        clean(p.matchmaking_id),
        clean(p.bout_id),
        clean(p.partij_nr),
        clean(p.vechter_naam).toLowerCase(),
        clean(p.tegenstander_naam).toLowerCase(),
      ].join("|");

      const existing = map.get(key);

      // Bij dubbel syncen kan dezelfde partij twee keer terugkomen.
      // Bewaar dan de meest complete/laatst bijgewerkte regel.
      if (!existing) {
        map.set(key, p);
        continue;
      }

      const existingScore =
        (clean(existing.event_naam) ? 1 : 0) +
        (clean(existing.event_datum) ? 1 : 0) +
        (clean(existing.winnaar) ? 1 : 0) +
        (clean(existing.uitslag || existing.methode) ? 1 : 0);

      const newScore =
        (clean(p.event_naam) ? 1 : 0) +
        (clean(p.event_datum) ? 1 : 0) +
        (clean(p.winnaar) ? 1 : 0) +
        (clean(p.uitslag || p.methode) ? 1 : 0);

      const existingUpdated = Date.parse(clean(existing.updated_at) || clean(existing.created_at) || "0") || 0;
      const newUpdated = Date.parse(clean(p.updated_at) || clean(p.created_at) || "0") || 0;

      if (newScore > existingScore || (newScore === existingScore && newUpdated >= existingUpdated)) {
        map.set(key, p);
      }
    }

    return Array.from(map.values());
  }, [partijen]);

  const stats = useMemo(() => {
    const events = new Set(displayPartijen.map((p) => clean(p.event_naam)).filter(Boolean));
    const openEvaluatie = displayPartijen.filter((p) => clean(p.status).toLowerCase().includes("evaluatie")).length;
    return { events: events.size, openEvaluatie };
  }, [displayPartijen]);

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
          <Stat value={displayPartijen.length} label="J+ partijen" />
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
              ) : displayPartijen.length === 0 ? (
                <tr><td colSpan={7} className="border border-zinc-800 p-4">Geen J+ talentstatus-partijen gevonden.</td></tr>
              ) : displayPartijen.map((p, index) => {
                const isLight = index % 2 === 0;
                const rowClass = isLight
                  ? "bg-zinc-100 text-black hover:bg-zinc-200"
                  : "bg-[#171717] text-white hover:bg-[#202020]";
                const mutedClass = isLight ? "text-zinc-700" : "text-zinc-400";
                const nameClass = isLight ? "text-[#c23a00]" : "text-[#ff4d00]";
                const sourceClass = isLight
                  ? "border border-zinc-500 px-2 py-1 text-xs font-black uppercase text-black"
                  : "border border-zinc-500 px-2 py-1 text-xs font-black uppercase text-zinc-200";

                return (
                  <tr key={`${clean(p.matchmaking_id)}-${clean(p.bout_id)}-${clean(p.partij_nr)}-${clean(p.id)}`} className={rowClass}>
                    <td className="border border-zinc-800 p-2"><b>{p.event_naam || "-"}</b><br /><span className={`text-xs ${mutedClass}`}>{p.event_datum || "geen datum"} · partij {p.partij_nr || "-"}</span></td>
                    <td className="border border-zinc-800 p-2"><b className={nameClass}>{p.vechter_naam || "-"}</b><br /><span className={`text-xs ${mutedClass}`}>{p.vechter_sportschool || "-"} {p.vechter_va ? `· VA ${p.vechter_va}` : ""}</span></td>
                    <td className="border border-zinc-800 p-2"><b className={nameClass}>{p.tegenstander_naam || "-"}</b><br /><span className={`text-xs ${mutedClass}`}>{p.tegenstander_sportschool || "-"} {p.tegenstander_va ? `· VA ${p.tegenstander_va}` : ""}</span></td>
                    <td className="border border-zinc-800 p-2">{p.vechter_gewicht || "-"} / {p.tegenstander_gewicht || "-"}</td>
                    <td className="border border-zinc-800 p-2"><b>{p.winnaar || "-"}</b><br /><span className={`text-xs ${mutedClass}`}>{p.uitslag || p.methode || ""}</span></td>
                    <td className="border border-zinc-800 p-2"><span className={sourceClass}>{p.bron || "-"}</span></td>
                    <td className="border border-zinc-800 p-2"><span className="border border-[#ff4d00] bg-[#ff4d00] px-2 py-1 text-xs font-black uppercase text-black">{p.klasse || "J+"}</span></td>
                  </tr>
                );
              })}
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
