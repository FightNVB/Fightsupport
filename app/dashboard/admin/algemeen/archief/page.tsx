"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Archive, Search, ShieldCheck } from "lucide-react";
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

function SilverLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:brightness-110"
    >
      {children}
    </Link>
  );
}

function DarkDangerButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 border border-red-500/70 bg-[#242424] px-3 py-2 text-xs font-black uppercase text-red-200 shadow-lg shadow-black/30 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, muted }: { label: string; value: string | number; muted?: string }) {
  return (
    <div className="border border-zinc-600 bg-[#1c1c1c] p-3 shadow-lg shadow-black/20">
      <b className="text-xl text-[#ff4d00]">{value}</b>
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      {muted ? <p className="mt-1 text-xs text-zinc-500">{muted}</p> : null}
    </div>
  );
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
    [roles],
  );

  const isSuperadmin = useMemo(
    () => roles?.some((r) => String(r).toLowerCase() === "superadmin") ?? false,
    [roles],
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

      const q = supabase
        .from("matchmakings")
        .select("id, naam, datum, locatie, bondteam, huidige_eigenaar_bondteam, status, stadium, last_updated_at, results_finalized_at")
        .or(
          "status.eq.admin_archief,stadium.eq.admin_archief,status.eq.gearchiveerd,stadium.eq.gearchiveerd,is_archived.eq.true"
        )
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
      <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
        <section className="mx-auto max-w-3xl border border-zinc-500 bg-[#121212] p-8 text-center shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">FightSupport Admin</p>
          <h1 className="mt-2 text-2xl font-black uppercase">Geen toegang</h1>
          <p className="mt-2 text-zinc-300">Alleen admin of superadmin kan Admin Archief bekijken.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">FightSupport Admin / Algemeen</p>
              <h1 className="text-2xl font-black uppercase">Admin Archief</h1>
              <p className="text-sm text-zinc-300">Afgeronde matchmakings die naar het admin archief zijn verplaatst.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SilverLink href="/dashboard/admin/administratie">Terug naar administratie</SilverLink>
              <div className="border border-zinc-600 bg-[#1c1c1c] px-4 py-2 text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Bond</p>
                <p className="text-xl font-black text-[#ff4d00]">{myBondteam || "-"}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-4">
          <StatCard label="In archief" value={filtered.length} muted="Huidige selectie" />
          <StatCard label="Totaal geladen" value={rows.length} muted="Voor jouw bondteam" />
          <StatCard label="Bondteams" value={bondOptions.length || "-"} muted={canSeeAll ? "NVB superadmin" : "Beperkte weergave"} />
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3 shadow-lg shadow-black/20">
            <div className="flex items-center gap-2 text-[#ff4d00]"><ShieldCheck className="h-5 w-5" /><b className="text-sm uppercase">Archief</b></div>
            <p className="mt-2 text-xs text-zinc-400">Gearchiveerde matchmakings blijven beschikbaar voor inzage en rapportage.</p>
          </div>
        </div>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-[240px_1fr_auto]">
          <select
            value={bondFilter}
            onChange={(e) => setBondFilter(e.target.value)}
            className="border border-zinc-600 bg-[#111] px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#ff4d00]"
          >
            <option value="">Alle bondteams</option>
            {bondOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek op event, datum, locatie, bondteam of status..."
              className="w-full border border-zinc-600 bg-[#111] py-2 pl-9 pr-3 text-sm font-bold text-white outline-none placeholder:text-zinc-500 focus:border-[#ff4d00]"
            />
          </label>

          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center justify-center gap-2 border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:bg-orange-400"
          >
            <Archive className="h-4 w-4" /> Vernieuwen
          </button>
        </div>

        {melding ? (
          <div className="m-4 border border-red-500/60 bg-red-950/40 p-3 text-sm font-bold text-red-200">{melding}</div>
        ) : null}

        <div className="p-4">
          <div className="overflow-hidden border border-zinc-600 bg-[#101010] shadow-2xl">
            <div className="grid grid-cols-[140px_1.7fr_120px_170px_1fr_330px] border-b border-zinc-600 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-black">
              <div>Datum</div>
              <div>Event</div>
              <div>Bond</div>
              <div>Status</div>
              <div>Laatst bijgewerkt</div>
              <div className="text-right">Acties</div>
            </div>

            {loading ? (
              <div className="px-4 py-10 text-center text-zinc-400">Laden...</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-zinc-400">Geen matchmakings in Admin Archief gevonden.</div>
            ) : (
              filtered.map((row, index) => {
                const rowBond = norm(row.huidige_eigenaar_bondteam || row.bondteam);
                return (
                  <div
                    key={row.id}
                    className={[
                      "grid grid-cols-[140px_1.7fr_120px_170px_1fr_330px] items-center border-t border-zinc-700 px-4 py-3 text-sm",
                      index % 2 === 0 ? "bg-[#050505] text-white" : "bg-[#e8e8e8] text-zinc-950",
                    ].join(" ")}
                  >
                    <div className="font-black">{formatDate(row.datum)}</div>
                    <div>
                      <div className="font-black uppercase text-[#ff4d00]">{row.naam || "-"}</div>
                      <div className={index % 2 === 0 ? "mt-1 text-xs text-zinc-500" : "mt-1 text-xs text-zinc-600"}>{row.id}</div>
                      {row.locatie ? <div className={index % 2 === 0 ? "mt-1 text-xs text-zinc-300" : "mt-1 text-xs text-zinc-700"}>{row.locatie}</div> : null}
                    </div>
                    <div><span className="inline-flex border border-[#ff4d00] bg-[#ff4d00]/10 px-2 py-1 text-xs font-black text-[#ff4d00]">{rowBond || "-"}</span></div>
                    <div className="font-black">{statusLabel(row.status || row.stadium)}</div>
                    <div>{formatDateTime(row.last_updated_at || row.results_finalized_at)}</div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <SilverLink href={`/dashboard/admin/algemeen/archief/${row.id}`}>Open</SilverLink>
                      <SilverLink href={`/dashboard/officials/uitslagen/inzien/${row.id}`}>Uitslagen</SilverLink>
                      <DarkDangerButton onClick={() => definitiefVerwijderen(row)} disabled={busyId === row.id}>Verwijderen</DarkDangerButton>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
