"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/api/authedFetch";

type SnapshotRow = {
  id: string;
  created_at: string | null;
  matchmaking_id: string | null;
  upload_id: string | null;
  saved_by_user_id: string | null;
  saved_by_email: string | null;
  saved_by_name?: string | null;
  evenement_naam: string | null;
  evenement_datum: string | null;
  locatie: string | null;
  matchmaker: string | null;
  promotor: string | null;
  bondteam: string | null;
  official_release: boolean | null;
  official_released_at: string | null;
  controle_run_id: string | null;
  controle_status: string | null;
  controle_gestart_op: string | null;
  controle_afgerond_op: string | null;
  controle_run_type: string | null;
  totaal_partijen?: number | null;
  notitie?: string | null;
};

function fmtDate(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("nl-NL");
}

function fmtDateTime(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("nl-NL");
}

function clean(v: any) {
  const s = String(v ?? "").trim();
  return s || "-";
}

async function readJsonOrThrow(res: Response, label: string) {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!contentType.includes("application/json")) {
    const preview = text.trim().slice(0, 160);
    throw new Error(`${label}: API geeft geen JSON terug. Controleer of de route onder app/api/admin/algemeen/snapshots staat. Status ${res.status}. ${preview}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label}: ongeldige JSON ontvangen. Status ${res.status}.`);
  }
}

export default function AdminAlgemeenSnapshotsPage() {
  const [items, setItems] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [bondteam, setBondteam] = useState("");
  const [matchmakingId, setMatchmakingId] = useState("");
  const [savedBy, setSavedBy] = useState("");
  const [openId, setOpenId] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (bondteam.trim()) params.set("bondteam", bondteam.trim());
      if (matchmakingId.trim()) params.set("matchmaking_id", matchmakingId.trim());
      if (savedBy.trim()) params.set("saved_by", savedBy.trim());
      params.set("limit", "100");

      const res = await authedFetch(`/api/admin/algemeen/snapshots?${params.toString()}`);
      const json = await readJsonOrThrow(res, "Snapshots laden");

      if (!res.ok || !json?.ok) throw new Error(json?.error || "Kon snapshots niet laden.");
      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch (err: any) {
      setError(err?.message || "Onbekende fout.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    return {
      totaal: items.length,
      released: items.filter((x) => !!x.official_release).length,
      partijen: items.reduce((sum, x) => sum + Number(x.totaal_partijen ?? 0), 0),
      bondteams: new Set(items.map((x) => x.bondteam).filter(Boolean)).size,
    };
  }, [items]);

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <style>{`
        .silver-btn, .silver-btn *{color:#000!important;}
        .snapshot-row-light > td{background:#ffffff!important;color:#000000!important;}
        .snapshot-row-dark > td{background:#171717!important;color:#ffffff!important;}
        .snapshot-row-light b:not(.orange-text), .snapshot-row-light div:not(.orange-text), .snapshot-row-light p:not(.orange-text), .snapshot-row-light span:not(.orange-text){color:#000000!important;}
        .snapshot-row-dark b:not(.orange-text), .snapshot-row-dark div:not(.orange-text), .snapshot-row-dark p:not(.orange-text), .snapshot-row-dark span:not(.orange-text){color:#ffffff!important;}
        .snapshot-row-light .row-muted{color:#555555!important;}
        .snapshot-row-dark .row-muted{color:#d4d4d8!important;}
        .snapshot-row-light .orange-text, .snapshot-row-dark .orange-text{color:#ff4d00!important;}
        .snapshot-row-light:hover > td{background:#ffffff!important;color:#000000!important;}
        .snapshot-row-dark:hover > td{background:#171717!important;color:#ffffff!important;}
      `}</style>

      <section className="mx-auto max-w-[1600px] border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">FightSupport Admin / Algemeen</p>
              <h1 className="text-2xl font-black uppercase">Matchmaking snapshots</h1>
              <p className="text-sm text-zinc-300">Opgeslagen snapshots van matchmakings, controles en vrijgegeven versies.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link className="silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black" href="/dashboard/admin/algemeen">
                Terug naar algemeen
              </Link>
              <Link className="silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black" href="/dashboard/admin/algemeen/matchmakings">
                Matchmakings
              </Link>
              <button onClick={load} className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black">
                Vernieuwen
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-4">
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{stats.totaal}</b><p className="text-xs uppercase text-zinc-400">Snapshots</p></div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{stats.released}</b><p className="text-xs uppercase text-zinc-400">Official release</p></div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{stats.partijen}</b><p className="text-xs uppercase text-zinc-400">Partijen totaal</p></div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{stats.bondteams}</b><p className="text-xs uppercase text-zinc-400">Bondteams</p></div>
        </div>

        <div className="flex flex-wrap gap-2 p-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek event, locatie, matchmaker" className="border border-zinc-600 bg-[#111] px-3 py-2 text-sm text-white outline-none" />
          <input value={bondteam} onChange={(e) => setBondteam(e.target.value)} placeholder="Bondteam" className="w-32 border border-zinc-600 bg-[#111] px-3 py-2 text-sm text-white outline-none" />
          <input value={matchmakingId} onChange={(e) => setMatchmakingId(e.target.value)} placeholder="Matchmaking ID" className="w-72 border border-zinc-600 bg-[#111] px-3 py-2 text-sm text-white outline-none" />
          <input value={savedBy} onChange={(e) => setSavedBy(e.target.value)} placeholder="Opgeslagen door" className="border border-zinc-600 bg-[#111] px-3 py-2 text-sm text-white outline-none" />
          <button onClick={load} className="silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black !text-black">Zoek</button>
        </div>

        {error && <p className="mx-4 mb-4 border border-red-500 bg-red-950 p-3 text-sm">{error}</p>}

        <div className="overflow-x-auto p-4 pt-0">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
              <tr>
                <th className="border border-zinc-700 p-2">Snapshot</th>
                <th className="border border-zinc-700 p-2">Event</th>
                <th className="border border-zinc-700 p-2">Datum</th>
                <th className="border border-zinc-700 p-2">Bondteam</th>
                <th className="border border-zinc-700 p-2">Controle</th>
                <th className="border border-zinc-700 p-2">Partijen</th>
                <th className="border border-zinc-700 p-2">Opgeslagen door</th>
                <th className="border border-zinc-700 p-2">Actie</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="border border-zinc-800 p-4">Laden...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="border border-zinc-800 p-4 text-zinc-400">Geen snapshots gevonden.</td></tr>
              ) : (
                items.map((row, index) => {
                  const light = index % 2 === 0;
                  return (
                    <Fragment key={row.id}>
                      <tr className={light ? "snapshot-row-light" : "snapshot-row-dark"}>
                        <td className="border border-zinc-800 p-2">
                          <b className="orange-text text-[#ff4d00]">{fmtDateTime(row.created_at)}</b><br />
                          <span className="row-muted text-xs">{row.id}</span>
                        </td>
                        <td className="border border-zinc-800 p-2">
                          <b>{clean(row.evenement_naam)}</b><br />
                          <span className="row-muted text-xs">{clean(row.locatie)}</span>
                        </td>
                        <td className="border border-zinc-800 p-2 font-bold">{fmtDate(row.evenement_datum)}</td>
                        <td className="border border-zinc-800 p-2 font-black">{clean(row.bondteam)}</td>
                        <td className="border border-zinc-800 p-2">
                          <span className="orange-text border border-[#ff4d00] px-2 py-1 text-xs font-black uppercase text-[#ff4d00]">{clean(row.controle_status)}</span><br />
                          <span className="row-muted text-xs">{clean(row.controle_run_type)}</span>
                        </td>
                        <td className="border border-zinc-800 p-2 font-black">{Number(row.totaal_partijen ?? 0)}</td>
                        <td className="border border-zinc-800 p-2">
                          <b>{clean(row.saved_by_name || row.saved_by_email)}</b><br />
                          <span className="row-muted text-xs">{clean(row.saved_by_email)}</span>
                        </td>
                        <td className="border border-zinc-800 p-2">
                          <div className="flex flex-wrap gap-2">
                            <Link className="silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-3 py-1 text-xs font-black !text-black" href={`/dashboard/admin/algemeen/snapshots/${row.id}`}>
                              Open
                            </Link>
                            <button onClick={() => setOpenId(openId === row.id ? "" : row.id)} className="silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-3 py-1 text-xs font-black !text-black">
                              {openId === row.id ? "Sluit" : "Info"}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {openId === row.id && (
                        <tr className="bg-[#101010] text-white">
                          <td colSpan={8} className="border border-zinc-800 p-3">
                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="border border-zinc-700 bg-[#181818] p-3"><b className="text-[#ff4d00]">Matchmaking</b><p className="mt-2 text-xs">matchmaking_id: {clean(row.matchmaking_id)}</p><p className="text-xs">upload_id: {clean(row.upload_id)}</p><p className="text-xs">matchmaker: {clean(row.matchmaker)}</p><p className="text-xs">promotor: {clean(row.promotor)}</p></div>
                              <div className="border border-zinc-700 bg-[#181818] p-3"><b className="text-[#ff4d00]">Controle</b><p className="mt-2 text-xs">run_id: {clean(row.controle_run_id)}</p><p className="text-xs">gestart: {fmtDateTime(row.controle_gestart_op)}</p><p className="text-xs">afgerond: {fmtDateTime(row.controle_afgerond_op)}</p><p className="text-xs">release: {row.official_release ? "ja" : "nee"}</p></div>
                              <div className="border border-zinc-700 bg-[#181818] p-3"><b className="text-[#ff4d00]">Notitie</b><p className="mt-2 text-xs whitespace-pre-wrap">{clean(row.notitie)}</p></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
