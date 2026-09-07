"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Archive } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

type Snapshot = {
  id: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  locatie: string | null;
  promotor: string | null;
  bondteam: string | null;
  totaal_partijen: number;
  created_at: string;
  snapshot_data: any;
};

export default function MatchmakerSnapshotDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = String(params?.id ?? "");
    if (!id) return;
    void (async () => {
      try {
        const res = await authedFetch(`/api/matchmaker/snapshots/${id}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Snapshot laden mislukt.");
        setSnapshot(json.snapshot);
      } catch (e: any) {
        setError(e?.message || "Snapshot laden mislukt.");
      }
    })();
  }, [params?.id]);

  const bouts = snapshot?.snapshot_data?.bouts ?? [];
  const dispensaties = snapshot?.snapshot_data?.dispensatie_requests ?? [];

  return (
    <main className="min-h-screen bg-[#050607] text-white">
      <div className="border-b border-white/10 bg-[#111318]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Archive size={22} className="text-[#ff4d00]" />
            <div>
              <h1 className="text-xl font-black uppercase">{snapshot?.evenement_naam || "Snapshot"}</h1>
              <p className="text-xs text-white/55">Vastgelegde versie bij overdracht naar het weegstation</p>
            </div>
          </div>
          <button onClick={() => router.push("/dashboard/matchmaker/snapshots")} className="inline-flex h-9 items-center gap-2 border border-white/15 px-3 text-xs font-bold hover:border-[#ff4d00]">
            <ArrowLeft size={14} /> Terug
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        {error ? <div className="border border-red-500/50 bg-red-950/30 p-3 text-red-200">{error}</div> : null}
        {!snapshot && !error ? <div className="text-white/55">Laden...</div> : null}
        {snapshot ? (
          <>
            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Info label="Datum" value={snapshot.evenement_datum || "-"} />
              <Info label="Locatie" value={snapshot.locatie || "-"} />
              <Info label="Promotor" value={snapshot.promotor || "-"} />
              <Info label="Bondteam" value={snapshot.bondteam || "-"} />
              <Info label="Partijen" value={String(snapshot.totaal_partijen ?? bouts.length)} />
            </div>

            <div className="overflow-hidden border border-white/10 bg-[#0b0d10]">
              <div className="bg-[#ff4d00] px-4 py-3 text-sm font-black uppercase">Matchmaking op overdrachtsmoment</div>
              <div className="overflow-x-auto">
                <table className="min-w-[1050px] w-full border-collapse text-sm">
                  <thead className="bg-white/[0.06] text-left text-xs uppercase text-white/65">
                    <tr>
                      <th className="px-3 py-2">#</th><th className="px-3 py-2">Rood</th><th className="px-3 py-2">Sportschool</th><th className="px-3 py-2">Gewicht</th><th className="px-3 py-2">Klasse</th><th className="px-3 py-2">Blauw</th><th className="px-3 py-2">Sportschool</th><th className="px-3 py-2">Gewicht</th><th className="px-3 py-2">Dispensatie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bouts.map((b: any, i: number) => {
                      const disp = dispensaties.filter((d: any) => Number(d.partij_nr) === Number(b.partij_nr));
                      return (
                        <tr
                          key={b.id ?? `${b.partij_nr}-${i}`}
                          style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#111318", color: i % 2 === 0 ? "#111111" : "#ffffff" }}
                        >
                          <td className="px-3 py-2 font-bold text-[#ff4d00]">{b.partij_nr ?? "-"}</td>
                          <td className="px-3 py-2 font-bold" style={{ color: "inherit" }}>{b.rood_naam || "-"}</td>
                          <td className="px-3 py-2" style={{ color: "inherit" }}>{b.rood_gym || "-"}</td>
                          <td className="px-3 py-2" style={{ color: "inherit" }}>{b.rood_gewicht || "-"}</td>
                          <td className="px-3 py-2" style={{ color: "inherit" }}>{b.klasse || "-"}</td>
                          <td className="px-3 py-2 font-bold" style={{ color: "inherit" }}>{b.blauw_naam || "-"}</td>
                          <td className="px-3 py-2" style={{ color: "inherit" }}>{b.blauw_gym || "-"}</td>
                          <td className="px-3 py-2" style={{ color: "inherit" }}>{b.blauw_gewicht || "-"}</td>
                          <td className="px-3 py-2" style={{ color: "inherit" }}>{disp.length ? disp.map((d: any) => d.status || d.decision || "aanvraag").join(", ") : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="border border-white/10 bg-[#0b0d10] p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</div><div className="mt-1 text-sm font-bold">{value}</div></div>;
}
