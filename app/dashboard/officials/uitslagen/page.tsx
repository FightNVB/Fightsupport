"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

type Row = {
  matchmaking_id: string;
  bondteam: string | null;
  evenement_naam: string | null;
  evenement_datum: string | null;
  partijen: number;
  ingevuld: number;
  run_status: string | null;
  finalized: boolean;
};

type UserProfile = { bondteam: string | null };
type ActiveTab = "active" | "done";

function clean(v: unknown) {
  return String(v ?? "").trim();
}
function norm(v: unknown) {
  return clean(v).toUpperCase();
}
function lower(v: unknown) {
  return clean(v).toLowerCase();
}

function formatDate(v: string | null) {
  if (!v) return "-";
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("nl-NL");
}

export default function OfficialsUitslagenPage() {
  const router = useRouter();
  const { user, roles, loading: authLoading } = useAuth();

  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [myBondteam, setMyBondteam] = useState("");
  const [melding, setMelding] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("active");

  const allowed = useMemo(
    () =>
      roles?.some((r) =>
        ["official", "hoofdofficial", "admin", "superadmin"].includes(
          String(r).toLowerCase(),
        ),
      ) ?? false,
    [roles],
  );

  const isSuperadmin = useMemo(
    () => roles?.some((r) => String(r).toLowerCase() === "superadmin") ?? false,
    [roles],
  );

  const canSeeAllBonds = isSuperadmin && norm(myBondteam) === "NVB";

  async function loadMyProfileBondteam(userId: string) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("bondteam")
      .eq("id", userId)
      .maybeSingle<UserProfile>();

    if (error)
      throw new Error(
        `Bondteam ophalen uit user_profiles mislukt: ${error.message}`,
      );
    return clean(data?.bondteam).toUpperCase();
  }

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    setMelding(null);

    try {
      const profileBondteam = await loadMyProfileBondteam(user.id);
      setMyBondteam(profileBondteam);

      if (!profileBondteam) {
        setRows([]);
        setMelding(
          "Geen bondteam gevonden in user_profiles. Zet bondteam op de gebruiker om uitslagen te tonen.",
        );
        return;
      }

      const [
        { data: runRows, error: runError },
        { data: boutRows, error: boutError },
        { data: resultRows, error: resultError },
        { data: uploadRows, error: uploadError },
        { data: mmRows, error: mmError },
      ] = await Promise.all([
        supabase.from("uitslagen_runs").select("id, matchmaking_id, status"),
        supabase
          .from("uitslagen_bouts")
          .select("uitslagen_run_id, matchmaking_id, partij_nr"),
        supabase
          .from("uitslagen_resultaten")
          .select("uitslagen_run_id, matchmaking_id, uitslag_status"),
        supabase
          .from("matchmaking_uploads")
          .select("matchmaking_id, bondteam, evenement_naam, evenement_datum"),
        supabase
          .from("matchmakings")
          .select(
            "id, naam, datum, bondteam, huidige_eigenaar_bondteam, stadium, status",
          ),
      ]);

      if (runError) throw runError;
      if (boutError) throw boutError;
      if (resultError) throw resultError;
      if (uploadError) throw uploadError;
      if (mmError) throw mmError;

      const uploadById = new Map(
        (uploadRows ?? []).map((r: any) => [String(r.matchmaking_id), r]),
      );
      const mmById = new Map((mmRows ?? []).map((r: any) => [String(r.id), r]));
      const byRun = new Map<string, Row>();

      for (const run of runRows ?? []) {
        const runId = clean((run as any).id);
        const mmid = clean((run as any).matchmaking_id);
        if (!runId || !mmid) continue;

        const upload: any = uploadById.get(mmid) ?? {};
        const mm: any = mmById.get(mmid) ?? {};
        const rowBondteam = norm(
          upload?.bondteam || mm?.huidige_eigenaar_bondteam || mm?.bondteam,
        );

        if (!canSeeAllBonds && rowBondteam !== profileBondteam) continue;

        byRun.set(runId, {
          matchmaking_id: mmid,
          bondteam: rowBondteam || null,
          evenement_naam: upload?.evenement_naam ?? mm?.naam ?? null,
          evenement_datum: upload?.evenement_datum ?? mm?.datum ?? null,
          partijen: 0,
          ingevuld: 0,
          run_status: clean((run as any).status) || null,
          finalized:
            lower((run as any).status) === "afgerond" ||
            lower(mm?.status) === "uitslagen_definitief" ||
            lower(mm?.stadium) === "uitslagen_definitief",
        });
      }

      for (const row of boutRows ?? []) {
        const cur = byRun.get(String((row as any).uitslagen_run_id));
        if (cur) cur.partijen += 1;
      }

      for (const row of resultRows ?? []) {
        const cur = byRun.get(String((row as any).uitslagen_run_id));
        if (cur && String((row as any).uitslag_status ?? "") !== "concept")
          cur.ingevuld += 1;
      }

      setRows(
        Array.from(byRun.values()).sort((a, b) =>
          String(b.evenement_datum ?? "").localeCompare(
            String(a.evenement_datum ?? ""),
          ),
        ),
      );
    } catch (e: any) {
      setRows([]);
      setMelding(e?.message ?? "Uitslagen laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) return void router.replace("/login");
    if (!allowed) return void router.replace("/dashboard");
    void load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, allowed, router, roles]);

  const activeRows = useMemo(
    () => rows.filter((row) => !row.finalized),
    [rows],
  );

  const doneRows = useMemo(() => rows.filter((row) => row.finalized), [rows]);

  const tabRows = activeTab === "active" ? activeRows : doneRows;

  const filtered = tabRows.filter((row) =>
    [row.evenement_naam, row.evenement_datum, row.bondteam, row.run_status]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
                FightSupport Officials
              </p>
              <h1 className="text-2xl font-black uppercase">Uitslagen</h1>
              <p className="text-sm text-zinc-300">
                {canSeeAllBonds
                  ? "NVB superadmin: alle bondteams zichtbaar"
                  : `Alleen uitslagen van bondteam ${myBondteam || "-"}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 border border-[#ff4d00] bg-[#ff4d0017] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#ff7a3c]">
                <ShieldCheck className="h-4 w-4" />
                Bond: {myBondteam || "-"}
              </div>
              <button
                type="button"
                onClick={() => router.push("/dashboard/officials")}
                className="border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:brightness-110"
              >
                Terug naar officials
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-4">
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{activeRows.length}</b>
            <p className="text-xs uppercase text-zinc-400">Actieve uitslagen</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{doneRows.length}</b>
            <p className="text-xs uppercase text-zinc-400">Afgerond</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{rows.length}</b>
            <p className="text-xs uppercase text-zinc-400">Totaal zichtbaar</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{myBondteam || "-"}</b>
            <p className="text-xs uppercase text-zinc-400">Bondteam</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-4">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`border px-3 py-2 text-xs font-black uppercase ${activeTab === "active" ? "border-[#ff4d00] bg-[#ff4d00] !text-black" : "border-zinc-500 bg-[#242424] text-white"}`}
          >
            Actief ({activeRows.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("done")}
            className={`border px-3 py-2 text-xs font-black uppercase ${activeTab === "done" ? "border-[#ff4d00] bg-[#ff4d00] !text-black" : "border-zinc-500 bg-[#242424] text-white"}`}
          >
            Afgerond ({doneRows.length})
          </button>

          <div className="ml-auto flex min-w-[320px] items-center gap-2 border border-zinc-600 bg-[#111] px-3 py-2">
            <Search className="h-4 w-4 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek event, status of bondteam..."
              className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-zinc-500"
            />
          </div>
        </div>

        {melding ? (
          <p className="mx-4 mb-4 border border-red-500 bg-red-950 p-3 text-sm font-bold text-red-100">
            {melding}
          </p>
        ) : null}

        <div className="px-4 pb-5">
          <div className="overflow-x-auto border border-zinc-700">
            <table className="w-full min-w-[1060px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
                  <th className="border border-zinc-700 px-4 py-3">Event</th>
                  <th className="border border-zinc-700 px-4 py-3">Bond</th>
                  <th className="border border-zinc-700 px-4 py-3">Datum</th>
                  <th className="border border-zinc-700 px-4 py-3">Partijen</th>
                  <th className="border border-zinc-700 px-4 py-3">
                    Voortgang
                  </th>
                  <th className="border border-zinc-700 px-4 py-3 text-right">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="border border-zinc-800 px-4 py-8 text-center text-zinc-300"
                    >
                      Laden...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="border border-zinc-800 px-4 py-8 text-center text-zinc-300"
                    >
                      {activeTab === "active"
                        ? "Geen actieve uitslagen gevonden."
                        : "Geen afgeronde uitslagen gevonden."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, index) => {
                    const pct =
                      row.partijen > 0
                        ? Math.round((row.ingevuld / row.partijen) * 100)
                        : 0;
                    const finalized = row.finalized;

                    return (
                      <tr
                        key={row.matchmaking_id}
                        className={
                          index % 2 === 0
                            ? "bg-[#171717] text-white"
                            : "bg-[#202020] text-white"
                        }
                      >
                        <td className="border border-zinc-800 px-4 py-3">
                          <b className="text-[#ff4d00]">
                            {row.evenement_naam || "-"}
                          </b>
                          <div className="mt-1 text-xs text-zinc-500">
                            {row.matchmaking_id}
                          </div>
                        </td>
                        <td className="border border-zinc-800 px-4 py-3 font-black text-[#ff4d00]">
                          {row.bondteam || "-"}
                        </td>
                        <td className="border border-zinc-800 px-4 py-3">
                          {formatDate(row.evenement_datum)}
                        </td>
                        <td className="border border-zinc-800 px-4 py-3 font-black">
                          {row.partijen}
                        </td>
                        <td className="border border-zinc-800 px-4 py-3">
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="text-zinc-400">
                              {row.ingevuld} ingevuld
                            </span>
                            <span
                              className={
                                finalized
                                  ? "font-black text-emerald-300"
                                  : "font-black text-[#ff4d00]"
                              }
                            >
                              {finalized ? "Definitief" : `${pct}%`}
                            </span>
                          </div>
                          <div className="h-2 border border-zinc-700 bg-black">
                            <div
                              className="h-full bg-[#ff4d00]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="border border-zinc-800 px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {activeTab === "active" ? (
                              <Link
                                href={`/dashboard/officials/uitslagen/${row.matchmaking_id}`}
                                className="inline-flex border border-[#ff4d00] bg-[#ff4d00] px-3 py-2 text-xs font-black uppercase !text-black"
                              >
                                Uitslagen
                              </Link>
                            ) : (
                              <Link
                                href={`/dashboard/officials/uitslagen/inzien/${row.matchmaking_id}`}
                                className="inline-flex border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-3 py-2 text-xs font-black uppercase !text-black"
                              >
                                Inzien
                              </Link>
                            )}
                            <Link
                              href={`/dashboard/officials/controle/${row.matchmaking_id}`}
                              className="inline-flex border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-3 py-2 text-xs font-black uppercase !text-black"
                            >
                              Matchmaking
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
