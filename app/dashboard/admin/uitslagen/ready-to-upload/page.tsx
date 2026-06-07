"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api/authedFetch";

const ORANGE = "#ff4d00";

type Row = {
  matchmaking_id: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  bondteam: string | null;
  partijen: number;
  ingevuld: number;
};

function clean(v: unknown) {
  return String(v ?? "").trim();
}
function norm(v: unknown) {
  return clean(v).toUpperCase();
}

function metalFrameStyle(): CSSProperties {
  return {
    background:
      "linear-gradient(145deg,#ffffff 0%,#cfcfcf 9%,#606060 18%,#f8f8f8 32%,#9a9a9a 48%,#3d3d3d 62%,#f5f5f5 78%,#b8b8b8 100%)",
    border: "1px solid rgba(255,255,255,0.70)",
    boxShadow:
      "0 22px 58px rgba(0,0,0,0.58), inset 0 2px 1px rgba(255,255,255,0.90), inset 0 -2px 2px rgba(0,0,0,0.72)",
  };
}

function contentPanelStyle(): CSSProperties {
  return {
    background:
      "radial-gradient(circle at 12% 0%, rgba(255,77,0,0.12), transparent 28%), linear-gradient(180deg,#15191f 0%,#07090d 100%)",
    border: "1px solid rgba(255,255,255,0.16)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.85)",
  };
}

const pageBg =
  "radial-gradient(circle at 50% -10%, rgba(255,255,255,.16), transparent 22%), radial-gradient(circle at 10% 4%, rgba(255,77,0,.18), transparent 26%), radial-gradient(circle at 92% 12%, rgba(255,255,255,.10), transparent 23%), linear-gradient(180deg,#030405 0%,#090c10 42%,#010203 100%)";
const silverBtn =
  "inline-flex items-center justify-center gap-2 rounded-none border border-zinc-200 bg-[linear-gradient(180deg,#ffffff_0%,#ededed_18%,#bfc3c8_50%,#737b84_78%,#f5f5f5_100%)] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] !text-black shadow-[inset_0_1px_0_rgba(255,255,255,.95),0_10px_24px_rgba(0,0,0,.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const orangeBtn =
  "inline-flex items-center justify-center gap-2 rounded-none border border-[#ffb18b] bg-[linear-gradient(180deg,#ff8a45_0%,#ff4d00_48%,#8f2600_100%)] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.45),0_0_22px_rgba(255,77,0,.26)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const darkInput =
  "min-h-11 w-full rounded-none border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.34))] px-4 text-sm font-bold text-white outline-none placeholder:text-zinc-500 focus:border-[#ff4d00]";

function formatDate(v: string | null) {
  if (!v) return "-";
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("nl-NL");
}

export default function AdminReadyToUploadPage() {
  const router = useRouter();
  const { user, roles, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [myBondteam, setMyBondteam] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const allowed = useMemo(
    () =>
      (roles ?? []).some((r) =>
        ["admin", "superadmin"].includes(String(r).toLowerCase()),
      ),
    [roles],
  );
  const isSuperadmin = useMemo(
    () => (roles ?? []).some((r) => String(r).toLowerCase() === "superadmin"),
    [roles],
  );
  const canSeeAllBonds = isSuperadmin && norm(myBondteam) === "NVB";

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    setError("");
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("bondteam")
        .eq("id", user.id)
        .maybeSingle();
      const profileBond = norm((profile as any)?.bondteam);
      setMyBondteam(profileBond);

      const [
        { data: runs, error: runErr },
        { data: bouts, error: boutErr },
        { data: results, error: resultErr },
        { data: uploads, error: uploadErr },
        { data: matchmakings, error: mmErr },
      ] = await Promise.all([
        supabase
          .from("uitslagen_runs")
          .select("id, matchmaking_id, status")
          .eq("status", "afgerond"),
        supabase
          .from("uitslagen_bouts")
          .select("uitslagen_run_id, matchmaking_id, partij_nr"),
        supabase
          .from("uitslagen_resultaten")
          .select("uitslagen_run_id, matchmaking_id, uitslag_status"),
        supabase
          .from("matchmaking_uploads")
          .select("matchmaking_id, evenement_naam, evenement_datum, bondteam"),
        supabase
          .from("matchmakings")
          .select(
            "id, naam, datum, bondteam, huidige_eigenaar_bondteam, status, stadium",
          ),
      ]);

      if (runErr) throw runErr;
      if (boutErr) throw boutErr;
      if (resultErr) throw resultErr;
      if (uploadErr) throw uploadErr;
      if (mmErr) throw mmErr;

      const uploadByMm = new Map(
        (uploads ?? []).map((r: any) => [clean(r.matchmaking_id), r]),
      );
      const mmById = new Map(
        (matchmakings ?? []).map((r: any) => [clean(r.id), r]),
      );
      const rowsByRun = new Map<string, Row>();

      for (const run of runs ?? []) {
        const runId = clean((run as any).id);
        const mmid = clean((run as any).matchmaking_id);
        const meta: any = uploadByMm.get(mmid) ?? {};
        const mm: any = mmById.get(mmid) ?? {};
        const bond = norm(
          meta.bondteam || mm.huidige_eigenaar_bondteam || mm.bondteam,
        );
        if (!canSeeAllBonds && profileBond && bond && bond !== profileBond)
          continue;
        rowsByRun.set(runId, {
          matchmaking_id: mmid,
          evenement_naam: meta.evenement_naam ?? mm.naam ?? null,
          evenement_datum: meta.evenement_datum ?? mm.datum ?? null,
          bondteam: bond || null,
          partijen: 0,
          ingevuld: 0,
        });
      }

      for (const bout of bouts ?? []) {
        const cur = rowsByRun.get(clean((bout as any).uitslagen_run_id));
        if (cur) cur.partijen += 1;
      }
      for (const res of results ?? []) {
        const cur = rowsByRun.get(clean((res as any).uitslagen_run_id));
        if (
          cur &&
          clean((res as any).uitslag_status).toLowerCase() !== "concept"
        )
          cur.ingevuld += 1;
      }

      setRows(
        Array.from(rowsByRun.values()).sort((a, b) =>
          clean(b.evenement_datum).localeCompare(clean(a.evenement_datum)),
        ),
      );
    } catch (e: any) {
      setError(e?.message ?? "Laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  async function heropen(matchmakingId: string) {
    if (!isSuperadmin) return;
    const ok = window.confirm(
      "Zet deze uitslagen weer op bewerken? Officials kunnen daarna via de matchmaking/uitslagenflow corrigeren.",
    );
    if (!ok) return;

    setBusyId(matchmakingId);
    try {
      const res = await authedFetch("/api/admin/uitslagen/heropen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: matchmakingId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(json?.error ?? "Op bewerken zetten mislukt.");
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Op bewerken zetten mislukt.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) return void router.replace("/login");
    if (!allowed) return void router.replace("/dashboard");
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, allowed, router, roles]);

  return (
    <main
      className="min-h-screen px-4 py-5 text-white"
      style={{ background: pageBg }}
    >
      <style>{`.talent-silver-btn, .talent-silver-btn *{color:#000!important;}`}</style>
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="p-[6px]" style={metalFrameStyle()}>
          <div className="overflow-hidden border border-black bg-[linear-gradient(180deg,#151a21_0%,#07090d_100%)] shadow-2xl">
            <header className="border-b border-[#ff4d00]/55 bg-[linear-gradient(180deg,rgba(255,255,255,.08),rgba(0,0,0,.14))] px-5 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="flex flex-wrap items-center gap-2 md:justify-self-start">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/admin")}
                    className={silverBtn}
                  >
                    ← Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => void load()}
                    className={orangeBtn}
                  >
                    ↺ Ververs
                  </button>
                </div>

                <div className="flex justify-center">
                  <Image
                    src="/branding/fightsupport/excel-logo.png"
                    alt="FightSupport"
                    width={340}
                    height={96}
                    priority
                    style={{
                      width: "auto",
                      height: "72px",
                      objectFit: "contain",
                      filter: "drop-shadow(0 16px 22px rgba(0,0,0,.58))",
                    }}
                  />
                </div>

                <div className="text-left md:text-right md:justify-self-end">
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ff4d00]">
                    Admin • uitslagen
                  </div>
                  <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
                    Ready to Upload
                  </h1>
                  <div className="mt-1 text-[12px] font-bold uppercase tracking-[0.14em] text-white/55">
                    Bondteam: {myBondteam || "-"}
                  </div>
                </div>
              </div>
            </header>

            <section className="grid gap-3 border-b border-white/10 p-4 md:grid-cols-4">
              <Stat label="Gefinaliseerd" value={rows.length} />
              <Stat
                label="Partijen"
                value={rows.reduce((sum, row) => sum + row.partijen, 0)}
              />
              <Stat
                label="Ingevuld"
                value={rows.reduce((sum, row) => sum + row.ingevuld, 0)}
              />
              <div className="border border-[#ff4d00]/35 bg-[linear-gradient(180deg,rgba(255,77,0,.14),rgba(0,0,0,.20))] p-3 shadow-xl">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
                  Toegang
                </div>
                <div className="mt-1 text-xl font-black text-[#ff4d00]">
                  {isSuperadmin ? "Superadmin" : "Inzien"}
                </div>
              </div>
            </section>

            <div className="p-4 md:p-5">
              <div className="p-[5px]" style={metalFrameStyle()}>
                <div className="p-4 md:p-5" style={contentPanelStyle()}>
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ff4d00]">
                        FightPassport upload
                      </div>
                      <h2 className="mt-1 text-3xl font-black uppercase tracking-[0.06em] text-white md:text-[38px]">
                        Klaar voor FightPassport upload
                      </h2>
                      <p className="mt-2 max-w-4xl text-sm font-semibold leading-relaxed text-zinc-300">
                        Officials kunnen deze uitslagen alleen inzien. Alleen
                        superadmin van hetzelfde bondteam, of NVB superadmin,
                        kan een definitieve uitslag hier opnieuw op bewerken
                        zetten.
                      </p>
                    </div>
                    <div className="border border-white/15 bg-black/30 px-4 py-3 text-right shadow-xl">
                      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400">
                        Status
                      </div>
                      <div className="text-2xl font-black text-[#ff4d00]">
                        {loading ? "Laden" : `${rows.length} items`}
                      </div>
                    </div>
                  </div>

                  {error ? (
                    <div className="mt-4 border border-red-500/45 bg-red-950/40 px-4 py-3 text-sm font-bold text-red-200">
                      {error}
                    </div>
                  ) : null}

                  <div className="mt-5 overflow-hidden border border-zinc-700 bg-black/45 shadow-2xl">
                    {loading ? (
                      <div className="px-4 py-10 text-center text-sm font-bold text-zinc-300">
                        Laden…
                      </div>
                    ) : rows.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm font-bold text-zinc-300">
                        Nog niets gefinaliseerd.
                      </div>
                    ) : (
                      <table className="w-full table-fixed border-collapse text-[12px]">
                        <thead className="bg-[#252525] text-left text-[10px] uppercase tracking-[0.10em] text-zinc-300">
                          <tr>
                            <th className="w-[42%] border border-zinc-700 px-2 py-2">
                              Evenement
                            </th>
                            <th className="w-[12%] border border-zinc-700 px-2 py-2">
                              Datum
                            </th>
                            <th className="w-[10%] border border-zinc-700 px-2 py-2">
                              Bond
                            </th>
                            <th className="w-[10%] border border-zinc-700 px-2 py-2 text-center">
                              Partijen
                            </th>
                            <th className="w-[10%] border border-zinc-700 px-2 py-2 text-center">
                              Ingevuld
                            </th>
                            <th className="w-[16%] border border-zinc-700 px-2 py-2 text-right">
                              Actie
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, idx) => (
                            <tr
                              key={row.matchmaking_id}
                              className={
                                idx % 2 === 0 ? "bg-[#171717]" : "bg-[#0f0f0f]"
                              }
                            >
                              <td className="border border-zinc-800 px-2 py-2 align-middle">
                                <div
                                  className="truncate font-black uppercase tracking-[0.02em] text-[#ff4d00]"
                                  title={row.evenement_naam || "-"}
                                >
                                  {row.evenement_naam || "-"}
                                </div>
                                <div
                                  className="mt-0.5 truncate text-[10px] font-semibold text-zinc-400"
                                  title={row.matchmaking_id}
                                >
                                  {row.matchmaking_id.slice(0, 8)}
                                </div>
                              </td>
                              <td className="border border-zinc-800 px-2 py-2 align-middle font-bold text-white whitespace-nowrap">
                                {formatDate(row.evenement_datum)}
                              </td>
                              <td className="border border-zinc-800 px-2 py-2 align-middle font-black text-white whitespace-nowrap">
                                {row.bondteam || "-"}
                              </td>
                              <td className="border border-zinc-800 px-2 py-2 text-center align-middle font-black text-white">
                                {row.partijen}
                              </td>
                              <td className="border border-zinc-800 px-2 py-2 text-center align-middle font-black text-white whitespace-nowrap">
                                {row.ingevuld}/{row.partijen}
                              </td>
                              <td className="border border-zinc-800 px-2 py-2 align-middle">
                                <div className="flex flex-wrap justify-end gap-1">
                                  <a
                                    href={`/api/officials/uitslagen/export?matchmaking_id=${encodeURIComponent(row.matchmaking_id)}`}
                                    className="talent-silver-btn border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-2 py-1 text-[10px] font-black uppercase !text-black"
                                  >
                                    Excel
                                  </a>
                                  {isSuperadmin ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        heropen(row.matchmaking_id)
                                      }
                                      disabled={busyId === row.matchmaking_id}
                                      className="border border-[#ff4d00] bg-[#ff4d00] px-2 py-1 text-[10px] font-black uppercase !text-black disabled:opacity-50"
                                    >
                                      Bewerken
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,.08),rgba(0,0,0,.24))] p-3 shadow-xl">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-3xl font-black leading-none text-white">
        {value}
      </div>
    </div>
  );
}
