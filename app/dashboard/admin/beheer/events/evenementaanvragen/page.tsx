"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard, ClipboardList } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

type Row = {
  id: string;
  created_at: string;
  naam: string;
  datum: string;
  locatie: string | null;
  bondteam: string | null;
  disciplines: string[];
  promotor_name: string | null;
  promotor_email: string | null;
  voorkeur_hoofdofficial_name: string | null;
  toegewezen_hoofdofficial_name: string | null;
  status: string;
};

const ORANGE = "#ff4d00";

function formatDate(v: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("nl-NL");
}

function statusStyle(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "geaccepteerd" || s === "definitief") return { background: "rgba(34,197,94,0.14)", color: "#166534", border: "1px solid rgba(34,197,94,0.45)" };
  if (s === "afgewezen") return { background: "rgba(220,38,38,0.14)", color: "#991b1b", border: "1px solid rgba(220,38,38,0.45)" };
  if (s === "verzonden_naar_official") return { background: "rgba(255,77,0,0.14)", color: "#b63b00", border: "1px solid rgba(255,77,0,0.45)" };
  if (s === "in_behandeling") return { background: "rgba(255,193,7,0.14)", color: "#7a5400", border: "1px solid rgba(255,193,7,0.45)" };
  return { background: "rgba(59,130,246,0.14)", color: "#1d4ed8", border: "1px solid rgba(59,130,246,0.40)" };
}

export default function AdminEventRequestsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const res = await authedFetch("/api/admin/event-requests", { method: "GET" });
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

  const filteredRows = useMemo(() => {
    if (!filterStatus) return rows;
    return rows.filter((r) => String(r.status).toLowerCase() === filterStatus);
  }, [rows, filterStatus]);

  const statusOptions = useMemo(() => Array.from(new Set(rows.map((r) => String(r.status).toLowerCase()))), [rows]);

  return (
    <main className="min-h-screen px-4 py-6" style={{ background: "linear-gradient(180deg,#0f1216 0%, #1b2027 45%, #0f1216 100%)" }}>
      <div className="mx-auto max-w-[1500px] rounded-[34px] p-[7px]" style={{ background: "linear-gradient(180deg,#f8f8f8 0%, #d7d7d7 18%, #8a8a8a 55%, #efefef 100%)" }}>
        <div className="overflow-hidden rounded-[28px] border-[3px] border-zinc-600/60 bg-[linear-gradient(180deg,rgba(32,37,45,0.98)_0%,rgba(20,24,30,0.98)_100%)]">
          <div className="px-6 py-5" style={{ background: "linear-gradient(180deg, #3b4149 0%, #242a31 48%, #171b20 100%)", borderBottom: "3px solid rgba(255,77,0,0.5)" }}>
            <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto_1fr]">
              <div>
                <div className="text-[28px] font-extrabold uppercase" style={{ color: ORANGE }}>Ontvangen evenement aanvragen</div>
                <div className="mt-1 text-sm text-white/75">Admin overzicht van alle evenement aanvragen</div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => router.back()} className="rounded-[10px] px-4 py-2 text-sm font-extrabold text-black" style={{ background: "linear-gradient(180deg,#ffffff 0%, #ececec 18%, #cfcfcf 40%, #f7f7f7 58%, #a9a9a9 100%)" }}>
                    <span className="inline-flex items-center gap-2"><ArrowLeft size={16} /> Terug</span>
                  </button>
                  <button onClick={() => router.push("/dashboard/admin")} className="rounded-[10px] px-4 py-2 text-sm font-extrabold text-black" style={{ background: "linear-gradient(180deg,#ffffff 0%, #ececec 18%, #cfcfcf 40%, #f7f7f7 58%, #a9a9a9 100%)" }}>
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

          <div className="px-6 py-6">
            <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(245,247,250,0.98)_0%,rgba(229,233,238,0.98)_100%)] p-5 text-black">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[12px] text-white" style={{ background: "linear-gradient(180deg, #ff6b22 0%, #ff4d00 55%, #b93200 100%)" }}>
                  <ClipboardList size={22} />
                </div>
                <div>
                  <div className="text-lg font-extrabold">Evenementen</div>
                  <div className="text-sm text-slate-600">Kies een evenement om official te koppelen</div>
                </div>
              </div>

              <div className="mb-4 max-w-[260px]">
                <div className="mb-1 text-[12px] font-extrabold uppercase tracking-[0.10em] text-slate-700">Status filter</div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full rounded-xl border-2 border-zinc-800 bg-white px-3 py-2 text-black">
                  <option value="">Alle statussen</option>
                  {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
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
                        <th className="px-4 py-3 text-left">Voorkeur official</th>
                        <th className="px-4 py-3 text-left">Toegewezen</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Actie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Geen aangevraagde evenementen gevonden.</td>
                        </tr>
                      ) : (
                        filteredRows.map((r, i) => {
                          const zebra = i % 2 === 0;
                          return (
                            <tr key={r.id} style={{ backgroundColor: zebra ? "#ffffff" : "#0d0d0d", color: zebra ? "#000" : "#fff" }}>
                              <td className="px-4 py-3">{formatDate(r.datum)}</td>
                              <td className="px-4 py-3">
                                <div className="font-semibold">{r.naam}</div>
                                <div className="text-xs" style={{ color: zebra ? "#64748b" : "rgba(255,255,255,0.68)" }}>
                                  {r.locatie ?? "-"} • {r.bondteam ?? "-"}
                                </div>
                              </td>
                              <td className="px-4 py-3">{r.promotor_name ?? r.promotor_email ?? "-"}</td>
                              <td className="px-4 py-3">{r.voorkeur_hoofdofficial_name ?? "-"}</td>
                              <td className="px-4 py-3">{r.toegewezen_hoofdofficial_name ?? "-"}</td>
                              <td className="px-4 py-3"><span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={statusStyle(r.status)}>{r.status}</span></td>
                              <td className="px-4 py-3">
                                <Link href={`/dashboard/admin/evenementaanvragen/${r.id}`} className="rounded-[10px] border border-orange-600 bg-[#151515] px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600 hover:text-black">
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
