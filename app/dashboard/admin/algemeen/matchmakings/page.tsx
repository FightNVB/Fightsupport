"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

type Profile = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  active_role?: string | null;
  bondteam?: string | null;
};

type Matchmaking = {
  id: string;
  naam?: string | null;
  datum?: string | null;
  locatie?: string | null;
  status?: string | null;
  stadium?: string | null;
  final_status?: string | null;
  bron_type?: string | null;
  created_at?: string | null;
  sent_at?: string | null;
  last_updated_at?: string | null;

  matchmaker_id?: string | null;
  huidige_eigenaar_type?: string | null;
  huidige_eigenaar_user_id?: string | null;
  huidige_eigenaar_bondteam?: string | null;
  bondteam?: string | null;

  is_actief?: boolean | null;
  locked_for_editing?: boolean | null;
  is_archived?: boolean | null;

  matchmaker_profiel?: Profile | null;
  eigenaar_profiel?: Profile | null;
  maker_profiel?: Profile | null;
  last_updated_by_profiel?: Profile | null;

  [key: string]: any;
};

const STADIA = [
  "bouwen_matchmaking",
  "concept_matchmaking",
  "ingediend_admin",
  "in_controle_admin",
  "review",
  "klaar_voor_weegstation",
  "in_weegstation",
  "weegstation_verwerkt",
  "definitieve_lineup",
  "klaar_voor_uitslagen",
  "uitslagen_in_bewerking",
  "uitslagen_definitief",
  "gearchiveerd",
];

const EIGENAARS = [
  "admin",
  "matchmaker",
  "official",
  "hoofdofficial",
  "bondteam",
];

const BONDTEAMS = ["", "NVB", "NKF", "WPKL", "VON"];

function fmtDate(v?: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("nl-NL");
}

function fmtDateTime(v?: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleString("nl-NL");
}

function person(p?: Profile | null, fallback?: string | null) {
  if (p?.full_name) return p.full_name;
  if (p?.email) return p.email;
  return fallback || "-";
}

export default function AdminMatchmakingsPage() {
  const [items, setItems] = useState<Matchmaking[]>([]);
  const [q, setQ] = useState("");
  const [stadium, setStadium] = useState("alles");
  const [eigenaar, setEigenaar] = useState("alles");
  const [archived, setArchived] = useState("actief");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      q,
      stadium,
      eigenaar,
      archived,
    });

    const res = await fetch(
      `/api/admin/algemeen/matchmakings?${params.toString()}`,
      {
        cache: "no-store",
      },
    );

    const json = await res.json();
    setLoading(false);

    if (!json.ok) {
      setError(json.error || "Laden mislukt");
      return;
    }

    setItems(json.items || []);
  }

  async function patch(id: string, field: string, value: any) {
    setSavingId(id);
    setError("");

    const res = await fetch("/api/admin/algemeen/matchmakings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });

    const json = await res.json();
    setSavingId("");

    if (!json.ok) {
      setError(json.error || "Opslaan mislukt");
      return;
    }

    await load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stadium, eigenaar, archived]);

  const counts = useMemo(() => {
    return {
      totaal: items.length,
      actief: items.filter((i) => i.is_actief && !i.is_archived).length,
      archief: items.filter((i) => i.is_archived).length,
      locked: items.filter((i) => i.locked_for_editing).length,
    };
  }, [items]);

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <style>{`.silver-btn, .silver-btn *{color:#000!important;}`}</style>

      <section className="mx-auto max-w-[1600px] border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
                FightSupport Admin / Beheer
              </p>
              <h1 className="text-2xl font-black uppercase">
                Alle matchmakings
              </h1>
              <p className="text-sm text-zinc-300">
                Overzicht van alle matchmakings, eigenaar, bondteam, stadium en
                technische info.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                className="silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black"
                href="/dashboard/admin/beheer"
              >
                Terug naar beheer
              </Link>

              <button
                onClick={load}
                className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black"
              >
                Vernieuwen
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-4">
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{counts.totaal}</b>
            <p className="text-xs uppercase text-zinc-400">In selectie</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{counts.actief}</b>
            <p className="text-xs uppercase text-zinc-400">Actief</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{counts.locked}</b>
            <p className="text-xs uppercase text-zinc-400">Locked</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{counts.archief}</b>
            <p className="text-xs uppercase text-zinc-400">Archief</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-4">
          <select
            value={stadium}
            onChange={(e) => setStadium(e.target.value)}
            className="border border-zinc-600 bg-[#111] px-3 py-2 text-sm text-white outline-none"
          >
            <option value="alles">Alle stadia</option>
            {STADIA.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>

          <select
            value={eigenaar}
            onChange={(e) => setEigenaar(e.target.value)}
            className="border border-zinc-600 bg-[#111] px-3 py-2 text-sm text-white outline-none"
          >
            <option value="alles">Alle eigenaren</option>
            {EIGENAARS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={archived}
            onChange={(e) => setArchived(e.target.value)}
            className="border border-zinc-600 bg-[#111] px-3 py-2 text-sm text-white outline-none"
          >
            <option value="actief">Alleen actief</option>
            <option value="archief">Alleen archief</option>
            <option value="alles">Alles</option>
          </select>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="ml-auto flex gap-2"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Zoek naam, id, gebruiker, bondteam, stadium"
              className="w-80 border border-zinc-600 bg-[#111] px-3 py-2 text-sm text-white outline-none"
            />
            <button className="silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black !text-black">
              Zoek
            </button>
          </form>
        </div>

        {error && (
          <p className="mx-4 mb-4 border border-red-500 bg-red-950 p-3 text-sm">
            {error}
          </p>
        )}

        <div className="overflow-x-auto p-4 pt-0">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
              <tr>
                <th className="border border-zinc-700 p-2">Matchmaking</th>
                <th className="border border-zinc-700 p-2">Datum</th>
                <th className="border border-zinc-700 p-2">Eigenaar</th>
                <th className="border border-zinc-700 p-2">Gebruiker</th>
                <th className="border border-zinc-700 p-2">Bondteam</th>
                <th className="border border-zinc-700 p-2">Stadium</th>
                <th className="border border-zinc-700 p-2">Status</th>
                <th className="border border-zinc-700 p-2">Info</th>
                <th className="border border-zinc-700 p-2">Actie</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="border border-zinc-800 p-4">
                    Laden...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="border border-zinc-800 p-4 text-zinc-400"
                  >
                    Geen matchmakings gevonden.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const isWhiteRow = index % 2 === 0;

                  return (
                    <Fragment key={item.id}>
                      <tr
                        className={
                          isWhiteRow
                            ? "bg-white text-black hover:bg-zinc-100"
                            : "bg-[#171717] text-white hover:bg-[#202020]"
                        }
                      >
                        <td className="border border-zinc-800 p-2">
                          <b className="text-[#ff4d00]">
                            {item.naam || "Zonder naam"}
                          </b>
                          <br />
                          <span className="text-xs opacity-70">{item.id}</span>
                          <br />
                          <span className="text-xs opacity-70">
                            {item.locatie || "-"}
                          </span>
                        </td>

                        <td className="border border-zinc-800 p-2 font-bold">
                          {fmtDate(item.datum)}
                        </td>

                        <td className="border border-zinc-800 p-2">
                          <select
                            value={item.huidige_eigenaar_type || ""}
                            onChange={(e) =>
                              patch(
                                item.id,
                                "huidige_eigenaar_type",
                                e.target.value,
                              )
                            }
                            className="w-full border border-zinc-500 bg-[#111] px-2 py-1 text-xs text-white"
                          >
                            <option value="">-</option>
                            {EIGENAARS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="border border-zinc-800 p-2">
                          <b>
                            {person(
                              item.eigenaar_profiel,
                              item.huidige_eigenaar_user_id,
                            )}
                          </b>
                          <br />
                          <span className="text-xs opacity-70">
                            Matchmaker:{" "}
                            {person(
                              item.matchmaker_profiel,
                              item.matchmaker_id,
                            )}
                          </span>
                        </td>

                        <td className="border border-zinc-800 p-2">
                          <select
                            value={item.huidige_eigenaar_bondteam || ""}
                            onChange={(e) => {
                              patch(
                                item.id,
                                "huidige_eigenaar_bondteam",
                                e.target.value,
                              );
                              patch(item.id, "bondteam", e.target.value);
                            }}
                            className="w-full border border-zinc-500 bg-[#111] px-2 py-1 text-xs text-white"
                          >
                            {BONDTEAMS.map((s) => (
                              <option key={s || "leeg"} value={s}>
                                {s || "-"}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="border border-zinc-800 p-2">
                          <select
                            value={item.stadium || ""}
                            onChange={(e) => {
                              patch(item.id, "stadium", e.target.value);
                              patch(item.id, "status", e.target.value);
                            }}
                            className="w-full border border-zinc-500 bg-[#111] px-2 py-1 text-xs text-white"
                          >
                            <option value="">-</option>
                            {STADIA.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="border border-zinc-800 p-2">
                          <span className="border border-[#ff4d00] px-2 py-1 text-xs font-black uppercase text-[#ff4d00]">
                            {item.status || "-"}
                          </span>
                          <br />
                          <span className="text-xs opacity-70">
                            Final: {item.final_status || "-"}
                          </span>
                        </td>

                        <td className="border border-zinc-800 p-2 text-xs">
                          <div>Aangemaakt: {fmtDateTime(item.created_at)}</div>
                          <div>Verzonden: {fmtDateTime(item.sent_at)}</div>
                          <div>Laatst: {fmtDateTime(item.last_updated_at)}</div>
                          <div>
                            {item.is_archived ? "Archief" : "Niet archief"} /{" "}
                            {item.locked_for_editing ? "Locked" : "Open"}
                          </div>
                        </td>

                        <td className="border border-zinc-800 p-2">
                          <button
                            onClick={() =>
                              setOpenId(openId === item.id ? "" : item.id)
                            }
                            className="silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-3 py-1 text-xs font-black !text-black"
                          >
                            {openId === item.id ? "Sluit" : "Alle info"}
                          </button>

                          {savingId === item.id && (
                            <div className="mt-2 text-xs font-bold text-[#ff4d00]">
                              Opslaan...
                            </div>
                          )}
                        </td>
                      </tr>

                      {openId === item.id && (
                        <tr className="bg-[#101010] text-white">
                          <td
                            colSpan={9}
                            className="border border-zinc-800 p-3"
                          >
                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="border border-zinc-700 bg-[#181818] p-3">
                                <b className="text-[#ff4d00]">Eigenaarschap</b>
                                <p className="mt-2 text-xs">
                                  Eigenaar type:{" "}
                                  {item.huidige_eigenaar_type || "-"}
                                </p>
                                <p className="text-xs">
                                  Eigenaar user:{" "}
                                  {person(
                                    item.eigenaar_profiel,
                                    item.huidige_eigenaar_user_id,
                                  )}
                                </p>
                                <p className="text-xs">
                                  Eigenaar bondteam:{" "}
                                  {item.huidige_eigenaar_bondteam || "-"}
                                </p>
                                <p className="text-xs">
                                  Bondteam: {item.bondteam || "-"}
                                </p>
                                <p className="text-xs">
                                  Maker:{" "}
                                  {person(
                                    item.maker_profiel,
                                    item.maker_user_id,
                                  )}
                                </p>
                              </div>

                              <div className="border border-zinc-700 bg-[#181818] p-3">
                                <b className="text-[#ff4d00]">Lifecycle</b>
                                <p className="mt-2 text-xs">
                                  submitted_to_admin_at:{" "}
                                  {fmtDateTime(item.submitted_to_admin_at)}
                                </p>
                                <p className="text-xs">
                                  entered_control_at:{" "}
                                  {fmtDateTime(item.entered_control_at)}
                                </p>
                                <p className="text-xs">
                                  sent_to_officials_at:{" "}
                                  {fmtDateTime(item.sent_to_officials_at)}
                                </p>
                                <p className="text-xs">
                                  entered_weegstation_at:{" "}
                                  {fmtDateTime(item.entered_weegstation_at)}
                                </p>
                                <p className="text-xs">
                                  results_finalized_at:{" "}
                                  {fmtDateTime(item.results_finalized_at)}
                                </p>
                                <p className="text-xs">
                                  archived_at: {fmtDateTime(item.archived_at)}
                                </p>
                              </div>

                              <div className="border border-zinc-700 bg-[#181818] p-3">
                                <b className="text-[#ff4d00]">Technisch</b>
                                <p className="mt-2 text-xs">
                                  event_id: {item.event_id || "-"}
                                </p>
                                <p className="text-xs">
                                  upload_id: {item.matchmaking_upload_id || "-"}
                                </p>
                                <p className="text-xs">
                                  bron_type: {item.bron_type || "-"}
                                </p>
                                <p className="text-xs">
                                  archive_record_id:{" "}
                                  {item.archive_record_id || "-"}
                                </p>
                                <p className="text-xs">
                                  last_updated_by:{" "}
                                  {person(
                                    item.last_updated_by_profiel,
                                    item.last_updated_by,
                                  )}
                                </p>
                              </div>
                            </div>

                            <details className="mt-3 border border-zinc-700 bg-[#080808] p-3">
                              <summary className="cursor-pointer text-xs font-black uppercase text-[#ff4d00]">
                                Ruwe database regel
                              </summary>
                              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs text-zinc-300">
                                {JSON.stringify(item, null, 2)}
                              </pre>
                            </details>
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
