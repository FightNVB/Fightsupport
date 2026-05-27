"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Archive, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api/authedFetch";

type Row = {
  id: string;
  naam: string | null;
  datum: string | null;
  locatie: string | null;
  bondteam: string | null;
  huidige_eigenaar_bondteam: string | null;
  status: string | null;
  stadium: string | null;
  last_updated_at: string | null;
  results_finalized_at: string | null;
};

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

function formatDateTime(v: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString("nl-NL");
}

function statusLabel(v: string | null) {
  const s = lower(v);
  if (s === "admin_archief") return "Admin Archief";
  if (s === "uitslagen_definitief") return "Uitslagen definitief";
  if (s === "afgerond") return "Afgerond";
  return clean(v) || "-";
}

export default function AdminAlgemeenArchiefPage() {
  const { user, roles, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [myBondteam, setMyBondteam] = useState("");
  const [query, setQuery] = useState("");
  const [bondFilter, setBondFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [melding, setMelding] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = useMemo(
    () => roles?.some((r) => ["admin", "superadmin"].includes(String(r).toLowerCase())) ?? false,
    [roles]
  );

  const isSuperadmin = useMemo(
    () => roles?.some((r) => String(r).toLowerCase() === "superadmin") ?? false,
    [roles]
  );

  const canSeeAll = isSuperadmin && norm(myBondteam) === "NVB";

  async function loadProfileBondteam(userId: string) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("bondteam")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return norm((data as any)?.bondteam);
  }

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    setMelding(null);

    try {
      const profileBondteam = await loadProfileBondteam(user.id);
      setMyBondteam(profileBondteam);

      let q = supabase
        .from("matchmakings")
        .select("id, naam, datum, locatie, bondteam, huidige_eigenaar_bondteam, status, stadium, last_updated_at, results_finalized_at")
        .or("status.eq.admin_archief,stadium.eq.admin_archief")
        .order("last_updated_at", { ascending: false });

      const { data, error } = await q;
      if (error) throw error;

      const next = ((data ?? []) as Row[]).filter((r) => {
        const rowBondteam = norm(r.huidige_eigenaar_bondteam || r.bondteam);
        return canSeeAll || !profileBondteam || rowBondteam === profileBondteam;
      });

      setRows(next);
    } catch (e: any) {
      setRows([]);
      setMelding(e?.message ?? "Admin archief laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  async function heropen(row: Row) {
    if (!isSuperadmin) return;
    const ok = window.confirm(`Uitslagen van ${row.naam ?? "dit evenement"} weer op bewerken zetten?`);
    if (!ok) return;

    setBusyId(row.id);
    try {
      const res = await authedFetch("/api/admin/uitslagen/heropen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: row.id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Heropenen mislukt.");
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Heropenen mislukt.");
    } finally {
      setBusyId(null);
    }
  }

  async function definitiefVerwijderen(row: Row) {
    const ok = window.confirm(`Definitief verwijderen?\n\n${row.naam ?? "Onbekend evenement"}\n\nDit verwijdert de matchmaking met controledata.`);
    if (!ok) return;

    setBusyId(row.id);
    try {
      const res = await authedFetch("/api/control-engine/delete-matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: row.id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Verwijderen mislukt.");
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Verwijderen mislukt.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!isAdmin) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, isAdmin, roles]);

  const bondOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => norm(r.huidige_eigenaar_bondteam || r.bondteam)).filter(Boolean))).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((r) => {
      const rowBond = norm(r.huidige_eigenaar_bondteam || r.bondteam);
      if (bondFilter && rowBond !== bondFilter) return false;
      if (!needle) return true;
      return [r.naam, r.datum, r.locatie, rowBond, r.status, r.stadium].join(" ").toLowerCase().includes(needle);
    });
  }, [rows, query, bondFilter]);

  if (!authLoading && (!user || !isAdmin)) {
    return (
      <main className="min-h-screen bg-[#07090d] p-8 text-white">
        <div className="mx-auto max-w-3xl border-4 border-[#a3a7ad] bg-[#11151c] p-8 text-center">
          <h1 className="text-2xl font-black text-[#ff4d00]">Geen toegang</h1>
          <p className="mt-2 text-zinc-300">Alleen admin of superadmin kan Admin Archief bekijken.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-6 py-6 text-white">
      <div className="mx-auto max-w-[1740px] overflow-hidden rounded-none border-4 border-[#a3a7ad] bg-[linear-gradient(180deg,#3a3d43_0%,#171b22_40%,#080b11_100%)] shadow-[0_0_45px_rgba(0,0,0,0.7)]">
        <div className="grid grid-cols-[230px_1fr_390px] items-center gap-5 border-b-2 border-[#ff4d00] px-8 py-5">
          <button
            onClick={() => (window.location.href = "/dashboard/admin")}
            className="h-[48px] rounded-none border-2 border-[#f4f4f4] bg-[linear-gradient(180deg,#ffffff_0%,#d8d8d8_42%,#878787_100%)] text-[16px] font-black text-black shadow-[inset_0_2px_0_rgba(255,255,255,.9),0_0_0_1px_rgba(0,0,0,.5)]"
          >
            ← Admin
          </button>

          <div className="flex items-center justify-center gap-4">
            <Archive className="h-14 w-14 text-[#ff4d00]" />
            <div className="text-center">
              <div className="text-[38px] font-black uppercase tracking-[8px] text-[#ff4d00]">Admin Archief</div>
              <div className="text-sm font-bold uppercase tracking-[3px] text-zinc-300">Afgeronde matchmakings · FightSupport</div>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-flex items-center gap-2 border border-[#ff4d00] bg-[#ff4d0017] px-3 py-2 text-xs font-black uppercase tracking-[2px] text-[#ff7a3c]">
              <ShieldCheck className="h-4 w-4" />
              Bond: {myBondteam || "-"}
            </div>
            {canSeeAll ? <div className="mt-2 text-xs font-bold text-zinc-300">NVB superadmin: alle bondteams zichtbaar</div> : null}
          </div>
        </div>

        <div className="px-8 py-8 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.10),transparent_38%)]">
          <div className="mb-6 grid grid-cols-[1fr_220px_460px] items-end gap-4">
            <div>
              <h1 className="text-[34px] font-black tracking-[5px] text-[#ff4d00]">AFGEROND ARCHIEF</h1>
              <p className="text-zinc-300">Matchmakings die door officials zijn afgerond en naar admin archief zijn verplaatst.</p>
            </div>

            <select
              value={bondFilter}
              onChange={(e) => setBondFilter(e.target.value)}
              className="h-[48px] rounded-none border-2 border-[#777c86] bg-black/75 px-4 text-white outline-none transition focus:border-[#ff4d00]"
            >
              <option value="">Alle bondteams</option>
              {bondOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Zoek event, datum, locatie of status..."
                className="h-[48px] w-full rounded-none border-2 border-[#777c86] bg-black/75 pl-12 pr-4 text-white outline-none transition focus:border-[#ff4d00]"
              />
            </div>
          </div>

          {melding ? <div className="mb-6 border-2 border-red-500/70 bg-red-950/70 px-5 py-4 text-sm font-black text-red-100">{melding}</div> : null}

          <div className="overflow-hidden rounded-none border-4 border-[#a3a7ad] shadow-[inset_0_0_0_2px_rgba(255,255,255,.25),0_18px_35px_rgba(0,0,0,.45)]">
            <div className="grid grid-cols-[150px_2fr_150px_170px_1fr_370px] bg-[linear-gradient(180deg,#ffffff_0%,#d8d8d8_30%,#8f8f8f_64%,#eeeeee_100%)] px-6 py-4 border-b-2 border-black text-sm font-black uppercase tracking-[2px] text-black">
              <div>Datum</div><div>Event</div><div>Bond</div><div>Status</div><div>Laatst bijgewerkt</div><div className="text-right">Acties</div>
            </div>

            {loading ? (
              <div className="bg-[#0e1118] px-6 py-10 text-center text-zinc-400">Laden...</div>
            ) : filtered.length === 0 ? (
              <div className="bg-[#0e1118] px-6 py-10 text-center text-zinc-400">Geen matchmakings in Admin Archief gevonden.</div>
            ) : filtered.map((row, index) => {
              const rowBond = norm(row.huidige_eigenaar_bondteam || row.bondteam);
              return (
                <div key={row.id} className={`grid grid-cols-[150px_2fr_150px_170px_1fr_370px] items-center border-t-2 border-[#4f545c] px-6 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] ${index % 2 === 0 ? "bg-[#0f131a]" : "bg-[#161b23]"}`}>
                  <div className="font-bold text-zinc-300">{formatDate(row.datum)}</div>
                  <div>
                    <div className="text-[24px] font-black uppercase tracking-[2px] text-white">{row.naam || "-"}</div>
                    <div className="mt-1 text-xs text-zinc-500">{row.id}</div>
                    {row.locatie ? <div className="mt-1 text-sm text-zinc-400">{row.locatie}</div> : null}
                  </div>
                  <div><span className="rounded-none border border-[#ff4d00] bg-[#ff4d0017] px-4 py-2 text-sm font-black text-[#ff7a3c]">{rowBond || "-"}</span></div>
                  <div className="font-black text-[#ff7a3c]">{statusLabel(row.status || row.stadium)}</div>
                  <div className="text-sm text-zinc-300">{formatDateTime(row.last_updated_at || row.results_finalized_at)}</div>
                  <div className="flex justify-end gap-3 text-right">
                    <Link href={`/dashboard/officials/uitslagen/inzien/${row.id}`} className="inline-flex h-[42px] items-center justify-center rounded-none border-2 border-[#f4f4f4] bg-[linear-gradient(180deg,#ffffff_0%,#d8d8d8_42%,#878787_100%)] px-4 text-xs font-black uppercase tracking-[1.5px] !text-black text-black shadow-[inset_0_2px_0_rgba(255,255,255,.9),0_0_0_1px_rgba(0,0,0,.5)] transition hover:scale-[1.02]">
                      Inzien
                    </Link>
                    {isSuperadmin ? (
                      <button onClick={() => heropen(row)} disabled={busyId === row.id} className="inline-flex h-[42px] items-center justify-center rounded-none border-2 border-[#ffb18b] bg-[linear-gradient(180deg,#ff7d38_0%,#ff4d00_100%)] px-4 text-xs font-black uppercase tracking-[1.5px] text-white shadow-[0_0_25px_rgba(255,77,0,0.35)] transition hover:scale-[1.02] disabled:opacity-50">
                        Op bewerken
                      </button>
                    ) : null}
                    <button onClick={() => definitiefVerwijderen(row)} disabled={busyId === row.id} className="inline-flex h-[42px] items-center justify-center rounded-none border-2 border-red-600 bg-[#2f2f33] px-4 text-xs font-black uppercase tracking-[1.5px] text-red-200 transition hover:bg-red-600 hover:text-white disabled:opacity-50">
                      Verwijderen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
