"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/api/authedFetch";

type SnapshotItem = {
  id: string;
  created_at: string | null;
  updated_at?: string | null;
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
  payload_json?: {
    upload?: any;
    latest_run?: any;
    bouts?: any[];
    saved_from?: string;
    [key: string]: any;
  } | null;
  [key: string]: any;
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

function isTrueLike(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "ja" || s === "yes";
}

function pick(row: any, keys: string[]) {
  for (const key of keys) {
    const v = row?.[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

function partijLabel(row: any, index: number) {
  if (isTrueLike(row?.is_toernooi)) {
    return clean(pick(row, ["toernooi_code", "toernooi_id", "toernooi_nummer", "toernooi"]));
  }
  return clean(pick(row, ["partij_label", "partij_nr", "bout_nr", "nr"]) ?? index + 1);
}

function maxGewicht(row: any) {
  return clean(pick(row, ["max_gewicht", "maxgewicht", "max_kg", "gewicht", "gewichtsklasse"]));
}

export default function SnapshotDetailPage() {
  const params = useParams<{ snapshotId: string }>();
  const snapshotId = String(params?.snapshotId ?? "");

  const [item, setItem] = useState<SnapshotItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await authedFetch(`/api/admin/algemeen/snapshots/${snapshotId}`);
      const json = await readJsonOrThrow(res, "Snapshot laden");

      if (!res.ok || !json?.ok) throw new Error(json?.error || "Kon snapshot niet laden.");
      setItem(json?.item ?? null);
    } catch (err: any) {
      setError(err?.message || "Onbekende fout.");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!snapshotId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotId]);

  const bouts = useMemo(() => {
    return Array.isArray(item?.payload_json?.bouts) ? item!.payload_json!.bouts! : [];
  }, [item]);

  const stats = useMemo(() => {
    return {
      partijen: bouts.length || Number(item?.totaal_partijen ?? 0),
      toernooien: bouts.filter((b) => isTrueLike(b?.is_toernooi)).length,
      wedstrijden: bouts.filter((b) => !isTrueLike(b?.is_toernooi)).length,
      release: item?.official_release ? "Ja" : "Nee",
    };
  }, [bouts, item]);

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
              <h1 className="text-2xl font-black uppercase">Snapshot detail</h1>
              <p className="text-sm text-zinc-300">Opgeslagen paginaweergave van deze matchmaking snapshot.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link className="silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black" href="/dashboard/admin/algemeen/snapshots">
                Terug naar snapshots
              </Link>
              {item?.matchmaking_id && (
                <Link className="silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black" href={`/dashboard/admin/algemeen/matchmakings?q=${encodeURIComponent(item.matchmaking_id)}`}>
                  Matchmaking
                </Link>
              )}
              <button onClick={load} className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black">
                Vernieuwen
              </button>
            </div>
          </div>
        </header>

        {error && <p className="m-4 border border-red-500 bg-red-950 p-3 text-sm">{error}</p>}

        {loading ? (
          <div className="p-4">Laden...</div>
        ) : !item ? (
          <div className="p-4 text-zinc-400">Snapshot niet gevonden.</div>
        ) : (
          <>
            <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-4">
              <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{stats.partijen}</b><p className="text-xs uppercase text-zinc-400">Partijen in snapshot</p></div>
              <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{stats.wedstrijden}</b><p className="text-xs uppercase text-zinc-400">Wedstrijden</p></div>
              <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{stats.toernooien}</b><p className="text-xs uppercase text-zinc-400">Toernooi regels</p></div>
              <div className="border border-zinc-600 bg-[#1c1c1c] p-3"><b className="text-xl text-[#ff4d00]">{stats.release}</b><p className="text-xs uppercase text-zinc-400">Official release</p></div>
            </div>

            <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-3">
              <div className="border border-zinc-700 bg-[#181818] p-3">
                <b className="text-[#ff4d00]">Event</b>
                <p className="mt-2 text-sm font-black">{clean(item.evenement_naam)}</p>
                <p className="text-xs text-zinc-300">Datum: {fmtDate(item.evenement_datum)}</p>
                <p className="text-xs text-zinc-300">Locatie: {clean(item.locatie)}</p>
                <p className="text-xs text-zinc-300">Bondteam: {clean(item.bondteam)}</p>
              </div>

              <div className="border border-zinc-700 bg-[#181818] p-3">
                <b className="text-[#ff4d00]">Snapshot</b>
                <p className="mt-2 text-xs">snapshot_id: {clean(item.id)}</p>
                <p className="text-xs">gemaakt: {fmtDateTime(item.created_at)}</p>
                <p className="text-xs">door: {clean(item.saved_by_name || item.saved_by_email)}</p>
                <p className="text-xs">saved_from: {clean(item.payload_json?.saved_from)}</p>
              </div>

              <div className="border border-zinc-700 bg-[#181818] p-3">
                <b className="text-[#ff4d00]">Controle</b>
                <p className="mt-2 text-xs">status: {clean(item.controle_status)}</p>
                <p className="text-xs">run_type: {clean(item.controle_run_type)}</p>
                <p className="text-xs">controle_run_id: {clean(item.controle_run_id)}</p>
                <p className="text-xs">afgerond: {fmtDateTime(item.controle_afgerond_op)}</p>
              </div>
            </div>

            {item.notitie && (
              <div className="border-b border-zinc-700 p-4">
                <div className="border border-zinc-700 bg-[#181818] p-3">
                  <b className="text-[#ff4d00]">Notitie</b>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{item.notitie}</p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto p-4">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
                  <tr>
                    <th className="border border-zinc-700 p-2">Partij</th>
                    <th className="border border-zinc-700 p-2">Discipline</th>
                    <th className="border border-zinc-700 p-2">Klasse</th>
                    <th className="border border-zinc-700 p-2">Gewicht</th>
                    <th className="border border-zinc-700 p-2">Rood</th>
                    <th className="border border-zinc-700 p-2">Blauw</th>
                    <th className="border border-zinc-700 p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bouts.length === 0 ? (
                    <tr><td colSpan={7} className="border border-zinc-800 p-4 text-zinc-400">Geen partijen in deze snapshot.</td></tr>
                  ) : (
                    bouts.map((row, index) => {
                      const light = index % 2 === 0;
                      const roodNaam = clean(pick(row, ["rood_naam_fp", "rood_naam_mm", "rood_naam", "naam_rood"]));
                      const roodGym = clean(pick(row, ["rood_gym_fp", "rood_gym_mm", "rood_gym", "sportschool_rood"]));
                      const roodVa = clean(pick(row, ["rood_va_mm", "va_rood", "rood_va"]));
                      const blauwNaam = clean(pick(row, ["blauw_naam_fp", "blauw_naam_mm", "blauw_naam", "naam_blauw"]));
                      const blauwGym = clean(pick(row, ["blauw_gym_fp", "blauw_gym_mm", "blauw_gym", "sportschool_blauw"]));
                      const blauwVa = clean(pick(row, ["blauw_va_mm", "va_blauw", "blauw_va"]));

                      return (
                        <Fragment key={`${partijLabel(row, index)}-${index}`}>
                          <tr className={light ? "snapshot-row-light" : "snapshot-row-dark"}>
                            <td className="border border-zinc-800 p-2"><b className="orange-text text-[#ff4d00]">{partijLabel(row, index)}</b></td>
                            <td className="border border-zinc-800 p-2">{clean(pick(row, ["discipline", "sport"]))}</td>
                            <td className="border border-zinc-800 p-2 font-bold">{clean(pick(row, ["klasse_mm", "klasse", "boutklasse"]))}</td>
                            <td className="border border-zinc-800 p-2">{maxGewicht(row)}</td>
                            <td className="border border-zinc-800 p-2"><b>{roodNaam}</b><br /><span className="row-muted text-xs">{roodGym} / VA {roodVa}</span></td>
                            <td className="border border-zinc-800 p-2"><b>{blauwNaam}</b><br /><span className="row-muted text-xs">{blauwGym} / VA {blauwVa}</span></td>
                            <td className="border border-zinc-800 p-2"><span className="orange-text border border-[#ff4d00] px-2 py-1 text-xs font-black uppercase text-[#ff4d00]">{clean(pick(row, ["status", "resultaat", "controle_status"]))}</span></td>
                          </tr>
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 pt-0">
              <button onClick={() => setShowRaw(!showRaw)} className="silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black !text-black">
                {showRaw ? "Ruwe data sluiten" : "Ruwe data tonen"}
              </button>

              {showRaw && (
                <pre className="mt-3 max-h-[520px] overflow-auto border border-zinc-700 bg-[#080808] p-3 text-xs text-zinc-300">
                  {JSON.stringify(item, null, 2)}
                </pre>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
