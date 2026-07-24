"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { authedFetch } from "@/lib/api/authedFetch";

type Row = Record<string, any>;

function text(value: unknown, fallback = "-") {
  const v = String(value ?? "").trim();
  return v || fallback;
}

function dateTime(value: unknown) {
  const d = new Date(String(value ?? ""));
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("nl-NL");
}

export default function ControleRunResultatenPage() {
  const params = useParams<{ runId: string }>();
  const runId = String(params?.runId ?? "");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await authedFetch(`/api/control-engine/runs/${encodeURIComponent(runId)}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json.error || "Controleresultaten laden mislukt.");
    else { setData(json); setError(""); }
    setLoading(false);
  }

  useEffect(() => {
    if (!runId) return;
    load();
    const timer = window.setInterval(load, 4000);
    return () => window.clearInterval(timer);
  }, [runId]);

  const rows: Row[] = data?.resultaten ?? [];
  const fouten = useMemo(() => rows.filter((r) => {
    const status = text(r.resultaat ?? r.status, "").toLowerCase();
    return !["ok", "goedgekeurd", "resolved"].includes(status) || Boolean(r.boodschap || r.error_message);
  }), [rows]);

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-white md:p-7">
      <div className="mx-auto max-w-7xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-700 px-5 py-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wide text-orange-500">Controlerun resultaten</h1>
            <p className="text-sm text-zinc-300">{text(data?.event?.naam, "Matchmaking")} · gestart {dateTime(data?.run?.gestart_op)}</p>
          </div>
          <Link href={data?.run?.matchmaking_id ? `/dashboard/admin/controle/${data.run.matchmaking_id}` : "/dashboard/admin/controle"} className="border border-zinc-500 px-3 py-2 text-sm font-bold hover:bg-zinc-800">Terug naar controle</Link>
        </header>

        {loading ? <div className="p-8 text-center">Resultaten laden…</div> : null}
        {error ? <div className="m-5 border border-red-500 bg-red-950/50 p-4 text-red-200">{error}</div> : null}

        {!loading && !error ? (
          <>
            <section className="grid grid-cols-2 gap-px border-b border-zinc-700 bg-zinc-700 md:grid-cols-4">
              {[
                ["Status", text(data?.run?.status)],
                ["Totaal", String(rows.length)],
                ["Fouten/acties", String(fouten.length)],
                ["Afgerond", dateTime(data?.run?.afgerond_op)],
              ].map(([label, value]) => <div key={label} className="bg-zinc-900 p-4"><div className="text-xs uppercase text-zinc-400">{label}</div><div className="mt-1 font-bold">{value}</div></div>)}
            </section>

            <section className="p-4">
              <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-orange-500">Fouten en aandachtspunten</h2>
              <div className="overflow-x-auto border border-zinc-700">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-zinc-800 text-xs uppercase text-zinc-300"><tr><th className="p-3">Partij</th><th className="p-3">Hoek / vechter</th><th className="p-3">Resultaat</th><th className="p-3">Regel</th><th className="p-3">Melding</th></tr></thead>
                  <tbody>
                    {fouten.length ? fouten.map((r, i) => <tr key={r.id ?? i} className={i % 2 ? "bg-zinc-950" : "bg-zinc-900"}><td className="p-3 font-bold">{text(r.partij_nr ?? r.partij_index)}</td><td className="p-3">{text(r.hoek ?? r.fighter_name ?? r.va_nummer)}</td><td className="p-3 font-bold text-orange-400">{text(r.resultaat ?? r.status)}</td><td className="p-3">{text(r.rule ?? r.rule_code)}</td><td className="p-3">{text(r.boodschap ?? r.error_message)}</td></tr>) : <tr><td colSpan={5} className="p-8 text-center text-zinc-400">Geen fouten of aandachtspunten in deze run.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
