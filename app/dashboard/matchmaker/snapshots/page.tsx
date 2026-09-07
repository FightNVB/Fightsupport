"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  MapPin,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api/authedFetch";

type SnapshotRow = {
  id: string;
  matchmaking_id: string;
  snapshot_type: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  locatie: string | null;
  promotor: string | null;
  bondteam: string | null;
  status_op_moment: string | null;
  stadium_op_moment: string | null;
  totaal_partijen: number;
  created_at: string;
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("nl-NL");
}

function fmtDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" });
}

export default function MatchmakerSnapshotsPage() {
  const router = useRouter();
  const { user, roles, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const allowed = useMemo(
    () => (roles ?? []).some((r) => ["matchmaker", "admin", "superadmin"].includes(r)),
    [roles],
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await authedFetch("/api/matchmaker/snapshots", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Snapshots laden mislukt.");
      setRows(Array.isArray(json?.rows) ? json.rows : []);
    } catch (e: any) {
      setError(e?.message || "Snapshots laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  async function removeSnapshot(row: SnapshotRow) {
    const naam = row.evenement_naam || "deze snapshot";
    if (!window.confirm(`Snapshot van "${naam}" definitief verwijderen?`)) return;

    setDeletingId(row.id);
    setError("");

    try {
      const res = await authedFetch("/api/matchmaker/snapshots", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Snapshot verwijderen mislukt.");

      setRows((prev) => prev.filter((item) => item.id !== row.id));
    } catch (e: any) {
      setError(e?.message || "Snapshot verwijderen mislukt.");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allowed) {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [authLoading, user, allowed]);

  if (authLoading || !user || !allowed) return null;

  return (
    <main className="min-h-screen bg-[#050607] text-white">
      <div className="border-b border-white/10 bg-[#111318]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center border border-white/15 bg-black">
              <Archive size={21} />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-wide">Mijn snapshots</h1>
              <p className="text-xs text-white/55">Ingeleverde matchmakings op het moment van overdracht</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/matchmaker")}
            className="inline-flex h-9 items-center gap-2 border border-white/15 bg-black px-3 text-xs font-bold hover:border-[#ff4d00]"
          >
            <ArrowLeft size={14} /> Terug
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold">{rows.length} snapshot{rows.length === 1 ? "" : "s"}</div>
            <div className="text-xs text-white/50">Deze versies veranderen niet meer nadat ze zijn opgeslagen.</div>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex h-9 items-center gap-2 bg-[#ff4d00] px-3 text-xs font-black uppercase text-white hover:brightness-110"
          >
            <RefreshCcw size={14} /> Verversen
          </button>
        </div>

        {error ? <div className="mb-4 border border-red-500/50 bg-red-950/30 p-3 text-sm text-red-200">{error}</div> : null}

        <div className="overflow-hidden border border-white/10 bg-[#0b0d10]">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-sm">
              <thead className="bg-[#ff4d00] text-left text-xs uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-3">Evenement</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Locatie</th>
                  <th className="px-4 py-3">Partijen</th>
                  <th className="px-4 py-3">Bondteam</th>
                  <th className="px-4 py-3">Overgedragen</th>
                  <th className="px-4 py-3">Actie</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-4 py-8 text-center text-white/55" colSpan={7}>Laden...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td className="px-4 py-8 text-center text-white/55" colSpan={7}>Nog geen snapshots. De eerste wordt gemaakt zodra een matchmaking naar het weegstation wordt gestuurd.</td></tr>
                ) : rows.map((row, index) => (
                  <tr key={row.id} className={index % 2 ? "bg-white/[0.035]" : "bg-black/20"}>
                    <td className="px-4 py-3 font-bold">{row.evenement_naam || "-"}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-2"><CalendarDays size={14} className="text-[#ff4d00]" />{fmtDate(row.evenement_datum)}</span></td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-2"><MapPin size={14} className="text-white/45" />{row.locatie || "-"}</span></td>
                    <td className="px-4 py-3">{row.totaal_partijen ?? 0}</td>
                    <td className="px-4 py-3">{row.bondteam || "-"}</td>
                    <td className="px-4 py-3">{fmtDateTime(row.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/matchmaker/snapshots/${row.id}`)}
                          className="h-8 border border-white/15 bg-white/5 px-3 text-xs font-bold hover:border-[#ff4d00]"
                        >
                          Bekijken
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => void removeSnapshot(row)}
                          className="inline-flex h-8 items-center gap-1.5 border border-red-500/50 bg-red-950/30 px-3 text-xs font-bold text-red-200 hover:border-red-400 disabled:opacity-50"
                          title="Snapshot verwijderen"
                        >
                          <Trash2 size={13} />
                          {deletingId === row.id ? "Verwijderen..." : "Verwijderen"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
