"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Search, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Melding = {
  id: string;
  status: string;
  fighter_id?: string | null;
  sportschool_id?: string | null;
  sportschool_naam?: string | null;
  va_nummer?: string | null;
  naam?: string | null;
  type: string;
  melding: string;
  admin_opmerking?: string | null;
  created_by?: string | null;
  created_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  raw?: any;
};

const TYPE_LABELS: Record<string, string> = {
  traint_niet_meer_bij_ons: "Traint niet meer bij ons",
  gegevens_wijzigen: "Gegevens wijzigen",
  uitslag_klopt_niet: "Uitslag klopt niet",
  licentie_klopt_niet: "Licentie klopt niet",
  startverbod_klopt_niet: "Startverbod klopt niet",
  sportschool_klopt_niet: "Sportschool klopt niet",
  anders: "Anders",
};

function safe(value: unknown, fallback = "-") {
  const s = String(value ?? "").trim();
  return s || fallback;
}

function typeLabel(type: string) {
  return TYPE_LABELS[type] || safe(type);
}

function formatDate(value: unknown) {
  const s = String(value ?? "").trim();
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: string) {
  if (status === "afgehandeld") return "border-emerald-500 text-emerald-300";
  if (status === "afgewezen") return "border-red-500 text-red-300";
  if (status === "in_behandeling") return "border-[#ff4d00] text-[#ff4d00]";
  return "border-zinc-500 text-zinc-200";
}

export default function AdminSportschoolMeldingenPage() {
  const [items, setItems] = useState<Melding[]>([]);
  const [status, setStatus] = useState("open");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [opmerkingen, setOpmerkingen] = useState<Record<string, string>>({});

  async function tokenHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const headers = await tokenHeaders();
      const res = await fetch(
        `/api/admin/sportschool-meldingen?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}`,
        { headers, cache: "no-store" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Meldingen laden mislukt");
      const nextItems = Array.isArray(json.items) ? json.items : [];
      setItems(nextItems);
      setOpmerkingen((current) => {
        const next = { ...current };
        for (const item of nextItems) {
          if (next[item.id] === undefined) next[item.id] = item.admin_opmerking || "";
        }
        return next;
      });
    } catch (e: any) {
      setError(e?.message || "Meldingen laden mislukt");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(item: Melding, nextStatus: string) {
    setSavingId(item.id);
    setError("");
    try {
      const headers = await tokenHeaders();
      const res = await fetch("/api/admin/sportschool-meldingen", {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          status: nextStatus,
          admin_opmerking: opmerkingen[item.id] || "",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Melding bijwerken mislukt");
      await load();
    } catch (e: any) {
      setError(e?.message || "Melding bijwerken mislukt");
    } finally {
      setSavingId("");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const counts = useMemo(() => {
    return {
      totaal: items.length,
      open: items.filter((i) => i.status === "open").length,
      behandeling: items.filter((i) => i.status === "in_behandeling").length,
    };
  }, [items]);

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <style>{`.sportschool-admin-silver-btn, .sportschool-admin-silver-btn *{color:#000!important;}`}</style>
      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">FightSupport Admin / Beheer</p>
              <h1 className="text-2xl font-black uppercase">Sportschool meldingen</h1>
              <p className="text-sm text-zinc-300">Meldingen van trainers en sportscholen over vechters, gegevens, licenties en uitslagen.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="sportschool-admin-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black" href="/dashboard/admin/beheer">Terug naar beheer</Link>
              <button onClick={load} className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black">
                {loading ? "Laden..." : "Vernieuwen"}
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-3">
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{counts.totaal}</b><p className="text-xs uppercase text-zinc-400">Meldingen in selectie</p></div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{counts.open}</b><p className="text-xs uppercase text-zinc-400">Open</p></div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{counts.behandeling}</b><p className="text-xs uppercase text-zinc-400">In behandeling</p></div>
        </div>

        <div className="flex flex-wrap gap-2 p-4">
          {["alles", "open", "in_behandeling", "afgehandeld", "afgewezen"].map((item) => (
            <button
              key={item}
              onClick={() => setStatus(item)}
              className={`border px-3 py-2 text-xs font-black uppercase ${status === item ? "border-[#ff4d00] bg-[#ff4d00] !text-black" : "border-zinc-500 bg-[#242424] text-white"}`}
            >
              {item.replaceAll("_", " ")}
            </button>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); load(); }} className="ml-auto flex gap-2">
            <div className="flex items-center gap-2 border border-zinc-600 bg-[#111] px-3 py-2">
              <Search size={16} className="text-[#ff4d00]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek naam, VA of sportschool" className="bg-transparent text-sm text-white outline-none" />
            </div>
            <button className="sportschool-admin-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black !text-black">Zoek</button>
          </form>
        </div>

        {error && (
          <p className="mx-4 mb-4 flex items-center gap-2 border border-red-500 bg-red-950 p-3 text-sm text-red-200">
            <AlertTriangle size={18} /> {error}
          </p>
        )}

        <div className="space-y-3 p-4 pt-0">
          {loading && <div className="border border-zinc-700 bg-[#171717] p-4"><RefreshCw className="mr-2 inline animate-spin text-[#ff4d00]" /> Laden...</div>}

          {!loading && !items.length && (
            <div className="border border-zinc-700 bg-[#171717] p-6 text-center text-zinc-300">Geen meldingen gevonden.</div>
          )}

          {!loading && items.map((item) => (
            <article key={item.id} className="border border-zinc-700 bg-[#171717] shadow-xl shadow-black/30">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 bg-[#202020] p-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-[#ff4d00]">{typeLabel(item.type)}</div>
                  <h2 className="mt-1 text-xl font-black text-white">{safe(item.naam, "Onbekende vechter")}</h2>
                  <p className="text-sm text-zinc-400">VA {safe(item.va_nummer)} • {safe(item.sportschool_naam, "Sportschool onbekend")} • {formatDate(item.created_at)}</p>
                </div>
                <span className={`border px-3 py-1 text-xs font-black uppercase ${statusClass(item.status)}`}>{item.status.replaceAll("_", " ")}</span>
              </div>

              <div className="grid gap-3 p-4 lg:grid-cols-[1fr_340px]">
                <div>
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Melding</div>
                  <div className="min-h-[90px] whitespace-pre-wrap border border-zinc-800 bg-[#101010] p-3 text-sm text-zinc-100">{item.melding}</div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black uppercase tracking-[0.18em] text-zinc-300">
                    Admin opmerking
                    <textarea
                      value={opmerkingen[item.id] ?? ""}
                      onChange={(e) => setOpmerkingen((cur) => ({ ...cur, [item.id]: e.target.value }))}
                      rows={4}
                      className="mt-2 w-full resize-none border border-zinc-700 bg-[#111] p-2 text-sm text-white outline-none focus:border-[#ff4d00]"
                      placeholder="Wat is gecontroleerd of aangepast?"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button disabled={savingId === item.id} onClick={() => updateStatus(item, "in_behandeling")} className="border border-[#ff4d00] bg-[#242424] px-3 py-2 text-xs font-black uppercase text-[#ff4d00] disabled:opacity-60">In behandeling</button>
                    <button disabled={savingId === item.id} onClick={() => updateStatus(item, "open")} className="border border-zinc-500 bg-[#242424] px-3 py-2 text-xs font-black uppercase text-white disabled:opacity-60">Open</button>
                    <button disabled={savingId === item.id} onClick={() => updateStatus(item, "afgehandeld")} className="border border-emerald-500 bg-emerald-950 px-3 py-2 text-xs font-black uppercase text-emerald-200 disabled:opacity-60"><CheckCircle2 className="mr-1 inline" size={14} /> Afgehandeld</button>
                    <button disabled={savingId === item.id} onClick={() => updateStatus(item, "afgewezen")} className="border border-red-500 bg-red-950 px-3 py-2 text-xs font-black uppercase text-red-200 disabled:opacity-60"><XCircle className="mr-1 inline" size={14} /> Afwijzen</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
