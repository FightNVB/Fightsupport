"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";

type YocEvent = {
  id: string;
  naam?: string | null;
  event_name?: string | null;
  event_datum?: string | null;
  locatie?: string | null;
  status?: string | null;
  raw_filename?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FighterRow = {
  yoc_event_id: string;
};

type ContextRow = {
  yoc_event_id: string;
};

function eventTitle(item: YocEvent) {
  return item.naam || item.event_name || "YOC event";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("nl-NL");
}

function statusClass(status?: string | null) {
  const s = String(status || "uploaded").toLowerCase();
  if (s === "checked" || s === "klaar") return "border-green-500/50 bg-green-500/10 text-green-300";
  if (s === "failed" || s === "fout") return "border-red-500/50 bg-red-500/10 text-red-300";
  if (["queued", "running", "scraping", "building", "rescraping"].includes(s)) return "border-[#ff4d00]/70 bg-[#ff4d00]/10 text-[#ff7a33] animate-pulse";
  if (s === "scraped") return "border-[#ff4d00]/70 bg-[#ff4d00]/10 text-[#ff7a33]";
  return "border-zinc-600 bg-[#242424] text-zinc-200";
}

export default function YocOverviewPage() {
  const [items, setItems] = useState<YocEvent[]>([]);
  const [fighters, setFighters] = useState<FighterRow[]>([]);
  const [contexts, setContexts] = useState<ContextRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");

    const { data: events, error: eventsErr } = await supabase
      .from("yoc_events")
      .select("*")
      .order("created_at", { ascending: false });

    if (eventsErr) {
      setLoading(false);
      setError(eventsErr.message || "YOC events laden mislukt");
      return;
    }

    const [{ data: fighterRows }, { data: contextRows }] = await Promise.all([
      supabase.from("yoc_fighters").select("yoc_event_id"),
      supabase.from("yoc_fighter_context").select("yoc_event_id"),
    ]);

    setItems(events || []);
    setFighters(fighterRows || []);
    setContexts(contextRows || []);
    setLoading(false);
  }

  async function deleteEvent(yocEventId: string) {
    const ok = window.confirm(
      "Weet je zeker dat je dit YOC event volledig wilt verwijderen? Dit verwijdert ook de gekoppelde YOC-tabellen."
    );

    if (!ok) return;

    try {
      setDeletingId(yocEventId);
      setError("");

      const res = await authedFetch("/api/yoc/delete-event", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yoc_event_id: yocEventId }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || json?.message || "YOC event verwijderen mislukt");
      }

      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "YOC event verwijderen mislukt";
      setError(message);
      window.alert(message);
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      load();
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  const fighterCountByEvent = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of fighters) {
      if (!f.yoc_event_id) continue;
      m.set(f.yoc_event_id, (m.get(f.yoc_event_id) || 0) + 1);
    }
    return m;
  }, [fighters]);


  const contextCountByEvent = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of contexts) {
      if (!c.yoc_event_id) continue;
      m.set(c.yoc_event_id, (m.get(c.yoc_event_id) || 0) + 1);
    }
    return m;
  }, [contexts]);

  function isEventChecked(item: YocEvent) {
    const total = fighterCountByEvent.get(item.id) || 0;
    const checked = contextCountByEvent.get(item.id) || 0;
    return total > 0 && checked >= total;
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      const haystack = [eventTitle(item), item.locatie, item.status, item.raw_filename]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [items, q]);

  const totalFighters = fighters.length;

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <style>{`.yoc-silver-btn, .yoc-silver-btn *{color:#000!important;}`}</style>

      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
                FightSupport Admin / Controle
              </p>
              <h1 className="text-2xl font-black uppercase">YOC overzicht</h1>
              <p className="mt-1 text-sm text-zinc-300">
                Open oude YOC evenementen, start controles opnieuw of upload een nieuwe deelnemerslijst.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                className="yoc-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black"
                href="/dashboard/admin/controle"
              >
                Terug naar controle
              </Link>
              <Link
                className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black"
                href="/dashboard/admin/controle/yoc/upload"
              >
                Nieuwe YOC upload
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-3">
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{items.length}</b>
            <p className="text-xs uppercase text-zinc-400">YOC evenementen</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{totalFighters}</b>
            <p className="text-xs uppercase text-zinc-400">Deelnemers geüpload</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{items.filter((i) => isEventChecked(i) || i.status === "checked" || i.status === "klaar").length}</b>
            <p className="text-xs uppercase text-zinc-400">Gecontroleerd</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-4">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex w-full flex-wrap gap-2 md:w-auto"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Zoek YOC, locatie of status"
              className="min-w-[260px] border border-zinc-600 bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#ff4d00]"
            />
            <button
              type="button"
              onClick={load}
              className="yoc-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black"
            >
              Refresh
            </button>
          </form>
        </div>

        {error && <p className="mx-4 mb-4 border border-red-500 bg-red-950 p-3 text-sm">{error}</p>}

        <div className="overflow-x-auto p-4 pt-0">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
              <tr>
                <th className="border border-zinc-700 p-2">YOC</th>
                <th className="border border-zinc-700 p-2">Datum</th>
                <th className="border border-zinc-700 p-2">Locatie</th>
                <th className="border border-zinc-700 p-2">Deelnemers</th>
                <th className="border border-zinc-700 p-2">Status</th>
                <th className="border border-zinc-700 p-2">Aangemaakt</th>
                <th className="border border-zinc-700 p-2 text-right">Actie</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="bg-[#171717]">
                  <td colSpan={7} className="border border-zinc-800 p-4 text-zinc-300">Laden...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr className="bg-[#171717]">
                  <td colSpan={7} className="border border-zinc-800 p-4 text-zinc-300">
                    Geen YOC evenementen gevonden. Maak een nieuwe upload via de oranje knop.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="bg-[#171717] hover:bg-[#202020]">
                    <td className="border border-zinc-800 p-2">
                      <b className="text-[#ff4d00]">{eventTitle(item)}</b>
                      <br />
                      <span className="text-xs text-zinc-500">{item.id}</span>
                    </td>
                    <td className="border border-zinc-800 p-2 text-zinc-200">{formatDate(item.event_datum)}</td>
                    <td className="border border-zinc-800 p-2 text-zinc-200">{item.locatie || "-"}</td>
                    <td className="border border-zinc-800 p-2 font-black text-zinc-100">
                      {fighterCountByEvent.get(item.id) || 0}
                      <span className="ml-2 text-xs text-zinc-400">({contextCountByEvent.get(item.id) || 0} gecontroleerd)</span>
                    </td>
                    <td className="border border-zinc-800 p-2">
                      <span className={`inline-block border px-2 py-1 text-xs font-black uppercase ${statusClass(isEventChecked(item) ? "checked" : item.status)}`}>
                        {isEventChecked(item) ? "checked" : item.status || "uploaded"}
                      </span>
                    </td>
                    <td className="border border-zinc-800 p-2 text-zinc-300">{formatDate(item.created_at)}</td>
                    <td className="border border-zinc-800 p-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          className="yoc-silver-btn inline-block border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-3 py-1 text-xs font-black uppercase !text-black"
                          href={`/dashboard/admin/controle/yoc/${item.id}`}
                        >
                          Open
                        </Link>

                        <button
                          type="button"
                          onClick={() => deleteEvent(item.id)}
                          disabled={deletingId === item.id}
                          className="border border-red-700 bg-red-600 px-3 py-1 text-xs font-black uppercase text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === item.id ? "..." : "Verwijder"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
