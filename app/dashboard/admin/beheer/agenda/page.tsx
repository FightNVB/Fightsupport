"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  RefreshCw,
  Search,
  MapPin,
  UsersRound,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type EventRow = Record<string, any>;

function s(v: unknown) {
  return String(v ?? "").trim();
}

function pick(...vals: unknown[]) {
  for (const v of vals) {
    const x = s(v);
    if (x) return x;
  }
  return "";
}

function formatDate(v: unknown) {
  const x = s(v);
  if (!x) return "-";
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return x;
  return d.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function eventName(event: EventRow) {
  return (
    pick(event.naam, event.event_naam, event.titel, event.name) ||
    "Onbekend evenement"
  );
}

function eventDate(event: EventRow) {
  return pick(event.datum, event.event_datum, event.date, event.start_date);
}

function eventLocation(event: EventRow) {
  return pick(event.locatie, event.plaats, event.location, event.venue) || "-";
}

function eventStatus(event: EventRow) {
  return pick(event.status, event.event_status) || "open";
}

function isFuture(event: EventRow) {
  const d = new Date(eventDate(event));
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

export default function AdminAgendaPage() {
  const [items, setItems] = useState<EventRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("alles");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const params = new URLSearchParams({ q, status });
      const res = await fetch(`/api/admin/beheer/agenda?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Agenda laden mislukt");
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e: any) {
      setError(e?.message || "Agenda laden mislukt");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteEvent(event: EventRow) {
    const id = s(event.id);
    if (!id) {
      setError("Evenement heeft geen id en kan niet verwijderd worden.");
      return;
    }

    const naam = eventName(event);
    const datum = formatDate(eventDate(event));
    const akkoord = window.confirm(
      `Evenement verwijderen?\n\n${naam}\nDatum: ${datum}\n\nLet op: gekoppelde matchmakings, aanmeldingen, controles, weegstation/uitslagen en YOC-gegevens die direct aan dit evenement hangen worden ook verwijderd. Dit kan niet ongedaan gemaakt worden.`,
    );

    if (!akkoord) return;

    setDeletingId(id);
    setError("");
    setMsg("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const params = new URLSearchParams({ id });

      const res = await fetch(`/api/admin/beheer/agenda?${params.toString()}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Evenement verwijderen mislukt");
      }

      const linked = Number(json?.linked_matchmakings ?? 0);
      setItems((cur) => cur.filter((item) => s(item.id) !== id));
      setMsg(
        linked > 0
          ? `Evenement verwijderd. Ook ${linked} gekoppelde matchmaking(s) opgeschoond.`
          : "Evenement verwijderd.",
      );
    } catch (e: any) {
      setError(e?.message || "Evenement verwijderen mislukt");
    } finally {
      setDeletingId("");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const stats = useMemo(() => {
    const upcoming = items.filter(isFuture).length;
    const past = Math.max(0, items.length - upcoming);
    return { total: items.length, upcoming, past };
  }, [items]);

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-4 text-white sm:p-6">
      <style>{`.agenda-silver-btn,.agenda-silver-btn *{color:#000!important;}`}</style>
      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
                FightSupport Admin / Beheer
              </p>
              <h1 className="text-2xl font-black uppercase">
                Agenda evenementen
              </h1>
              <p className="text-sm text-zinc-300">
                Overzicht van alle evenementen uit de events-tabel.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="agenda-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black"
                href="/dashboard/admin/administratie"
              >
                <ArrowLeft className="mr-2 inline" size={16} /> Terug naar
                administratie
              </Link>
              <button
                onClick={load}
                className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black"
              >
                <RefreshCw
                  className={`mr-2 inline ${loading ? "animate-spin" : ""}`}
                  size={16}
                />{" "}
                Vernieuwen
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-3">
          <Stat
            label="Evenementen"
            value={stats.total}
            icon={<CalendarDays size={18} />}
          />
          <Stat
            label="Aankomend"
            value={stats.upcoming}
            icon={<UsersRound size={18} />}
          />
          <Stat
            label="Historie"
            value={stats.past}
            icon={<MapPin size={18} />}
          />
        </div>

        <div className="flex flex-wrap gap-2 p-4">
          {[
            "alles",
            "open",
            "concept",
            "actief",
            "afgerond",
            "geannuleerd",
          ].map((t) => (
            <button
              key={t}
              onClick={() => setStatus(t)}
              className={`border px-3 py-2 text-xs font-black uppercase ${status === t ? "border-[#ff4d00] bg-[#ff4d00] !text-black" : "border-zinc-500 bg-[#242424] text-white"}`}
            >
              {t}
            </button>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="ml-auto flex min-w-[280px] flex-1 justify-end gap-2"
          >
            <div className="flex min-w-[240px] flex-1 items-center gap-2 border border-zinc-600 bg-[#111] px-3 py-2">
              <Search size={16} className="text-[#ff4d00]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Zoek event, locatie, promotor..."
                className="w-full bg-transparent text-sm text-white outline-none"
              />
            </div>
            <button className="agenda-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black !text-black">
              Zoek
            </button>
          </form>
        </div>


        {error && (
          <p className="mx-4 mb-4 border border-red-500 bg-red-950 p-3 text-sm">
            {error}
          </p>
        )}

        {msg && (
          <p className="mx-4 mb-4 border border-green-500 bg-green-950 p-3 text-sm text-green-100">
            {msg}
          </p>
        )}

        <div className="overflow-x-auto p-4 pt-0">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
              <tr>
                <th className="border border-zinc-700 p-2">Evenement</th>
                <th className="border border-zinc-700 p-2">Datum</th>
                <th className="border border-zinc-700 p-2">Locatie</th>
                <th className="border border-zinc-700 p-2">Promotor</th>
                <th className="border border-zinc-700 p-2">Matchmaker</th>
                <th className="border border-zinc-700 p-2">Hoofdofficial</th>
                <th className="border border-zinc-700 p-2">Status</th>
                <th className="border border-zinc-700 p-2 text-right">Actie</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="border border-zinc-800 p-4 text-zinc-300"
                  >
                    Laden...
                  </td>
                </tr>
              ) : items.length ? (
                items.map((event, idx) => {
                  const isLight = idx % 2 === 1;
                  const rowClass = isLight
                    ? "bg-[#f2f2f2] text-[#111111] hover:bg-[#ffffff]"
                    : "bg-[#111111] text-white hover:bg-[#202020]";
                  const mutedClass = isLight
                    ? "text-zinc-700"
                    : "text-zinc-400";
                  const borderClass = isLight
                    ? "border-zinc-300"
                    : "border-zinc-800";

                  return (
                    <tr key={event.id || idx} className={rowClass}>
                      <td className={`border p-2 ${borderClass}`}>
                        <b className="text-[#ff4d00]">{eventName(event)}</b>
                        <br />
                        <span className={`text-xs ${mutedClass}`}>
                          {event.id || "-"}
                        </span>
                      </td>
                      <td className={`border p-2 font-bold ${borderClass}`}>
                        {formatDate(eventDate(event))}
                      </td>
                      <td className={`border p-2 ${borderClass}`}>
                        {eventLocation(event)}
                      </td>
                      <td className={`border p-2 ${borderClass}`}>
                        {pick(event.promotor, event.promotor_naam) || "-"}
                      </td>
                      <td className={`border p-2 ${borderClass}`}>
                        {pick(event.matchmaker, event.matchmaker_naam) || "-"}
                      </td>
                      <td className={`border p-2 ${borderClass}`}>
                        {pick(event.hoofdofficial, event.hoofdofficial_naam) ||
                          "-"}
                      </td>
                      <td className={`border p-2 ${borderClass}`}>
                        <span
                          className={`border px-2 py-1 text-xs font-black uppercase ${isLight ? "border-zinc-500 text-zinc-900" : "border-zinc-500 text-zinc-200"}`}
                        >
                          {eventStatus(event)}
                        </span>
                      </td>
                      <td className={`border p-2 text-right ${borderClass}`}>
                        <button
                          type="button"
                          onClick={() => deleteEvent(event)}
                          disabled={!!deletingId || !event.id}
                          className="inline-flex items-center justify-center gap-2 border border-red-500 bg-red-900 px-3 py-1 text-xs font-black uppercase text-red-100 shadow hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Evenement verwijderen"
                        >
                          {deletingId === s(event.id) ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          {deletingId === s(event.id) ? "Bezig" : "Verwijder"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="border border-zinc-800 p-6 text-center text-zinc-400"
                  >
                    Geen evenementen gevonden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
      <div className="flex items-center justify-between text-zinc-400">
        <p className="text-xs uppercase tracking-[0.18em]">{label}</p>
        {icon}
      </div>
      <b className="mt-1 block text-2xl text-[#ff4d00]">{value}</b>
    </div>
  );
}
