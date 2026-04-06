"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard, ClipboardList } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

type Row = {
  id: string;
  naam: string;
  datum: string;
  locatie: string | null;
  bondteam: string | null;
  disciplines: string[];
  promotor_name: string | null;
  status: string;
  opmerking_admin: string | null;
};

const ORANGE = "#ff4d00";

export default function OfficialRequestsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const res = await authedFetch("/api/officials/event-requests/mine", { method: "GET" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Laden mislukt");
        setRows(Array.isArray(json?.rows) ? json.rows : []);
      } catch (e: any) {
        setErr(e?.message || "Laden mislukt");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <main className="min-h-screen px-4 py-6" style={{ background: "linear-gradient(180deg,#0f1216 0%, #1b2027 45%, #0f1216 100%)" }}>
      <div className="mx-auto max-w-[1500px] rounded-[34px] p-[7px]" style={{ background: "linear-gradient(180deg,#f8f8f8 0%, #d7d7d7 18%, #8a8a8a 55%, #efefef 100%)" }}>
        <div className="overflow-hidden rounded-[28px] border-[3px] border-zinc-600/60 bg-[linear-gradient(180deg,rgba(32,37,45,0.98)_0%,rgba(20,24,30,0.98)_100%)]">
          <div className="px-6 py-5" style={{ background: "linear-gradient(180deg, #3b4149 0%, #242a31 48%, #171b20 100%)", borderBottom: "3px solid rgba(255,77,0,0.5)" }}>
            <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto_1fr]">
              <div>
                <div className="text-[28px] font-extrabold uppercase" style={{ color: ORANGE }}>Official verzoeken</div>
                <div className="mt-1 text-sm text-white/75">Verzoeken die aan jou zijn toegewezen</div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => router.back()} className="rounded-[10px] px-4 py-2 text-sm font-extrabold text-black" style={{ background: "linear-gradient(180deg,#ffffff 0%, #ececec 18%, #cfcfcf 40%, #f7f7f7 58%, #a9a9a9 100%)" }}>
                    <span className="inline-flex items-center gap-2"><ArrowLeft size={16} /> Terug</span>
                  </button>
                  <button onClick={() => router.push("/dashboard/officials")} className="rounded-[10px] px-4 py-2 text-sm font-extrabold text-black" style={{ background: "linear-gradient(180deg,#ffffff 0%, #ececec 18%, #cfcfcf 40%, #f7f7f7 58%, #a9a9a9 100%)" }}>
                    <span className="inline-flex items-center gap-2"><LayoutDashboard size={16} /> Dashboard</span>
                  </button>
                </div>
              </div>
              <div className="justify-self-center">
                <img src="/branding/fightsupport/excel-logo.png" alt="FightSupport" style={{ width: 240, height: "auto", display: "block" }} />
              </div>
              <div className="justify-self-end text-right">
                <div className="text-sm font-extrabold tracking-[0.20em] text-white/90">FIGHTSUPPORT</div>
                <div className="text-xs text-white/70">Vechtsport ondersteuning</div>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 text-black">
            <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(245,247,250,0.98)_0%,rgba(229,233,238,0.98)_100%)] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[12px] text-white" style={{ background: "linear-gradient(180deg, #ff6b22 0%, #ff4d00 55%, #b93200 100%)" }}>
                  <ClipboardList size={22} />
                </div>
                <div>
                  <div className="text-lg font-extrabold">Toegewezen verzoeken</div>
                  <div className="text-sm text-slate-600">Accepteer of wijs af</div>
                </div>
              </div>

              {err ? <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{err}</div> : null}
              {loading ? <div className="text-slate-500">Laden…</div> : null}

              {!loading ? (
                <div className="overflow-x-auto rounded-[18px] border-2 border-zinc-800 bg-white">
                  <table className="min-w-full border-collapse text-sm">
                    <thead style={{ background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)", color: "#fff" }}>
                      <tr>
                        <th className="px-4 py-3 text-left">Datum</th>
                        <th className="px-4 py-3 text-left">Evenement</th>
                        <th className="px-4 py-3 text-left">Promotor</th>
                        <th className="px-4 py-3 text-left">Admin opmerking</th>
                        <th className="px-4 py-3 text-left">Actie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Geen toegewezen verzoeken gevonden.</td>
                        </tr>
                      ) : (
                        rows.map((r, i) => {
                          const zebra = i % 2 === 0;
                          return (
                            <tr key={r.id} style={{ backgroundColor: zebra ? "#ffffff" : "#0d0d0d", color: zebra ? "#000" : "#fff" }}>
                              <td className="px-4 py-3">{r.datum}</td>
                              <td className="px-4 py-3">
                                <div className="font-semibold">{r.naam}</div>
                                <div className="text-xs" style={{ color: zebra ? "#64748b" : "rgba(255,255,255,0.68)" }}>{r.locatie ?? "-"} • {r.bondteam ?? "-"}</div>
                              </td>
                              <td className="px-4 py-3">{r.promotor_name ?? "-"}</td>
                              <td className="px-4 py-3">{r.opmerking_admin ?? "-"}</td>
                              <td className="px-4 py-3">
                                <Link href={`/dashboard/officials/verzoeken/${r.id}`} className="rounded-[10px] border border-orange-600 bg-[#151515] px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600 hover:text-black">
                                  Open
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
