"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

type Row = { matchmaking_id: string; evenement_naam: string | null; evenement_datum: string | null; bondteam: string | null; };

export default function ReadyToUploadPage() {
  const router = useRouter();
  const { user, roles, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [{ data: runRows, error: runErr }, { data: uploadRows, error: upErr }] = await Promise.all([
        supabase.from("uitslagen_runs").select("matchmaking_id, status").eq("status", "afgerond"),
        supabase.from("matchmaking_uploads").select("matchmaking_id, evenement_naam, evenement_datum, bondteam"),
      ]);
      if (runErr) throw runErr; if (upErr) throw upErr;
      const uploads = new Map((uploadRows ?? []).map((r:any)=>[String(r.matchmaking_id), r]));
      setRows((runRows ?? []).map((r:any)=>({ matchmaking_id: String(r.matchmaking_id), evenement_naam: uploads.get(String(r.matchmaking_id))?.evenement_naam ?? null, evenement_datum: uploads.get(String(r.matchmaking_id))?.evenement_datum ?? null, bondteam: uploads.get(String(r.matchmaking_id))?.bondteam ?? null })));
    } catch (e:any) { setError(e?.message ?? "Laden mislukt."); } finally { setLoading(false); }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) return void router.replace("/login");
    if (!(roles ?? []).some((r) => ["admin", "superadmin", "hoofdofficial", "official"].includes(String(r).toLowerCase()))) return void router.replace("/dashboard");
    void load();
  }, [authLoading, user, roles, router]);

  return <main className="min-h-screen bg-[#eceff3] p-6"><div className="mx-auto max-w-[1200px]"><h1 className="text-3xl font-black text-[#ff4d00]">Ready to upload</h1>{error ? <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-red-800">{error}</div> : null}<div className="mt-4 overflow-hidden rounded-2xl border border-zinc-300 bg-white">{loading ? <div className="p-6">Laden…</div> : rows.length === 0 ? <div className="p-6">Geen afgeronde uitslagen.</div> : rows.map((row) => <div key={row.matchmaking_id} className="grid grid-cols-[1.6fr_140px_140px_160px] items-center border-t border-zinc-200 px-4 py-3 first:border-t-0"><div><div className="font-bold">{row.evenement_naam || '-'}</div><div className="text-xs text-zinc-500">{row.matchmaking_id}</div></div><div>{row.evenement_datum || '-'}</div><div>{row.bondteam || '-'}</div><div><Link href={`/api/admin/uitslagen/export?matchmaking_id=${encodeURIComponent(row.matchmaking_id)}`} className="rounded-lg bg-[#ff4d00] px-3 py-2 text-sm font-bold text-white">Export</Link></div></div>)}</div></div></main>;
}
