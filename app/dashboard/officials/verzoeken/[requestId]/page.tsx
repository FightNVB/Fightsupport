"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

type DetailRow = {
  id: string;
  naam: string;
  datum: string;
  locatie: string | null;
  bondteam: string | null;
  disciplines: string[];
  promotor_name: string | null;
  promotor_email: string | null;
  opmerking_promotor: string | null;
  opmerking_admin: string | null;
  status: string;
};

const ORANGE = "#ff4d00";

export default function OfficialRequestDetailPage() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const requestId = String(params?.requestId ?? "");

  const [row, setRow] = useState<DetailRow | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const res = await authedFetch(`/api/officials/event-requests/${encodeURIComponent(requestId)}`, { method: "GET" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Laden mislukt");
        setRow(json?.row ?? null);
      } catch (e: any) {
        setErr(e?.message || "Laden mislukt");
      } finally {
        setLoading(false);
      }
    }
    if (requestId) void load();
  }, [requestId]);

  async function respond(response: "accepted" | "declined") {
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const res = await authedFetch("/api/officials/event-requests/respond", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          response,
          reason: reason.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Opslaan mislukt");
      setMsg(response === "accepted" ? "✅ Verzoek geaccepteerd." : "✅ Verzoek afgewezen.");
    } catch (e: any) {
      setErr(e?.message || "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6" style={{ background: "linear-gradient(180deg,#0f1216 0%, #1b2027 45%, #0f1216 100%)" }}>
      <div className="mx-auto max-w-[1400px] rounded-[34px] p-[7px]" style={{ background: "linear-gradient(180deg,#f8f8f8 0%, #d7d7d7 18%, #8a8a8a 55%, #efefef 100%)" }}>
        <div className="overflow-hidden rounded-[28px] border-[3px] border-zinc-600/60 bg-[linear-gradient(180deg,rgba(32,37,45,0.98)_0%,rgba(20,24,30,0.98)_100%)]">
          <div className="px-6 py-5" style={{ background: "linear-gradient(180deg, #3b4149 0%, #242a31 48%, #171b20 100%)", borderBottom: "3px solid rgba(255,77,0,0.5)" }}>
            <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto_1fr]">
              <div>
                <div className="text-[28px] font-extrabold uppercase" style={{ color: ORANGE }}>Official verzoek</div>
                <div className="mt-1 text-sm text-white/75">Accepteren of afwijzen</div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => router.back()} className="rounded-[10px] px-4 py-2 text-sm font-extrabold text-black" style={{ background: "linear-gradient(180deg,#ffffff 0%, #ececec 18%, #cfcfcf 40%, #f7f7f7 58%, #a9a9a9 100%)" }}>
                    <span className="inline-flex items-center gap-2"><ArrowLeft size={16} /> Terug</span>
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
            {loading ? <div className="rounded-[24px] bg-white p-5">Laden…</div> : null}
            {err ? <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{err}</div> : null}
            {msg ? <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{msg}</div> : null}

            {row ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(245,247,250,0.98)_0%,rgba(229,233,238,0.98)_100%)] p-5">
                  <div className="mb-3 text-lg font-extrabold">Verzoekgegevens</div>
                  <div className="space-y-3 text-sm">
                    <div><strong>Evenement:</strong> {row.naam}</div>
                    <div><strong>Datum:</strong> {row.datum}</div>
                    <div><strong>Locatie:</strong> {row.locatie ?? "-"}</div>
                    <div><strong>Bondteam:</strong> {row.bondteam ?? "-"}</div>
                    <div><strong>Disciplines:</strong> {Array.isArray(row.disciplines) ? row.disciplines.join(", ") : "-"}</div>
                    <div><strong>Promotor:</strong> {row.promotor_name ?? row.promotor_email ?? "-"}</div>
                    <div><strong>Opmerking promotor:</strong><br />{row.opmerking_promotor ?? "-"}</div>
                    <div><strong>Opmerking admin:</strong><br />{row.opmerking_admin ?? "-"}</div>
                  </div>
                </div>

                <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(245,247,250,0.98)_0%,rgba(229,233,238,0.98)_100%)] p-5">
                  <div className="mb-3 text-lg font-extrabold">Jouw reactie</div>
                  <div className="mb-3 text-sm text-slate-600">Je kunt dit verzoek accepteren of afwijzen. Bij afwijzen kun je een reden meegeven.</div>
                  <textarea className="mb-4 min-h-[140px] w-full rounded-xl border-2 border-zinc-800 bg-white px-3 py-2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optionele toelichting of reden van afwijzing" />

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => respond("accepted")}
                      className="rounded-[12px] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
                      style={{ background: "linear-gradient(180deg,#22c55e 0%, #16a34a 100%)", border: "2px solid #14532d" }}
                    >
                      <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} /> Accepteren</span>
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => respond("declined")}
                      className="rounded-[12px] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
                      style={{ background: "linear-gradient(180deg,#ef4444 0%, #dc2626 100%)", border: "2px solid #7f1d1d" }}
                    >
                      <span className="inline-flex items-center gap-2"><XCircle size={16} /> Afwijzen</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
