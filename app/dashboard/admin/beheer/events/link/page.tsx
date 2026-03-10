"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const ORANGE = "#ff4d00";
const BORDER = "#2b2b2b";
const PAGE_BG =
  "radial-gradient(900px 520px at 18% 0%, rgba(255,77,0,0.14), transparent 56%), radial-gradient(780px 520px at 82% 18%, rgba(255,255,255,0.80), transparent 62%), linear-gradient(180deg,#f6f6f6 0%, #e7e7e7 55%, #d4d4d4 100%)";
const PANEL_BG = "linear-gradient(180deg,#ffffff 0%, #f2f2f2 55%, #e7e7e7 100%)";
const PANEL_BG_SOFT = "linear-gradient(180deg,#fbfbfb 0%, #efefef 55%, #e2e2e2 100%)";
const PANEL_SHADOW = "0 12px 28px rgba(0,0,0,0.16), inset 0 0 0 2px rgba(255,255,255,0.70)";

type EventRow = {
  id: string;
  naam: string;
  datum: string;
  locatie: string | null;
  status: string;
  bondteam?: string | null;
  promotor?: string | null;
  matchmaker?: string | null;
  hoofdofficial?: string | null;
};

type UploadRow = {
  id: string;
  evenement_naam?: string | null;
  evenement_datum?: string | null;
  locatie?: string | null;
  raw_filename?: string | null;
  uploaded_at?: string | null;
  event_id?: string | null;
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-6" style={{ background: PAGE_BG }}>
      <div className="mx-auto w-full max-w-6xl">
        <div
          className="rounded-[36px] p-[10px]"
          style={{
            background: "linear-gradient(180deg,#f8f8f8 0%, #d6d6d6 55%, #bdbdbd 100%)",
            boxShadow: "0 20px 70px rgba(0,0,0,0.35)",
          }}
        >
          <div
            className="rounded-[28px] overflow-hidden"
            style={{
              border: `4px solid ${BORDER}`,
              background: "linear-gradient(180deg,#fbfbfb 0%, #f1f1f1 50%, #e7e7e7 100%)",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

function Header({ onBack, onDashboard }: { onBack: () => void; onDashboard: () => void }) {
  return (
    <div
      className="relative px-6 py-6"
      style={{
        background: "linear-gradient(180deg,#3a3a3a 0%, #1f1f1f 55%, #141414 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 10px 26px rgba(0,0,0,0.35)",
        borderBottom: "3px solid rgba(255,77,0,0.35)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-10"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,77,0,0.18) 35%, rgba(255,77,0,0.05) 65%, transparent 100%)",
        }}
      />
      <div className="flex items-center justify-between gap-4">
        <div>
          <div style={{ color: ORANGE, letterSpacing: "0.14em", fontWeight: 800 }}>FIGHTSUPPORT</div>
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>Vechtsport ondersteuning</div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2">
          <div
            className="rounded-[22px] p-[6px]"
            style={{
              background: "linear-gradient(180deg,#fefefe,#cfcfcf)",
              boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
            }}
          >
            <div className="rounded-[18px] p-[6px]" style={{ border: `3px solid ${BORDER}`, background: "linear-gradient(180deg,#111,#000)" }}>
              <Image src="/branding/fightsupport/logo-dark.png" width={84} height={84} alt="FightSupport" priority />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg px-4 py-2 font-bold"
            style={{ background: "linear-gradient(180deg,#4b4b4b,#2f2f2f)", color: "#fff", border: "2px solid rgba(255,255,255,0.22)" }}
          >
            Terug
          </button>
          <button
            onClick={onDashboard}
            className="rounded-lg px-5 py-2 font-extrabold"
            style={{
              background: "linear-gradient(180deg,#f6f6f6,#cfcfcf)",
              color: "#000",
              border: `3px solid ${BORDER}`,
              boxShadow:
                "0 10px 22px rgba(0,0,0,0.22), inset 0 0 0 2px rgba(255,255,255,0.75), inset 0 -10px 18px rgba(0,0,0,0.08)",
            }}
          >
            Naar dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LinkEventsPage() {
  const router = useRouter();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedEvent = useMemo(() => events.find((e) => e.id === selectedEventId) ?? null, [events, selectedEventId]);

  async function load() {
    setErr(null);
    const res = await fetch("/api/events/link-data");
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j?.error || "Laden mislukt");
    setEvents(j.events ?? []);
    setUploads(j.uploads ?? []);
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, []);

  async function linkUpload(uploadId: string) {
    if (!selectedEventId) {
      setErr("Kies eerst een evenement");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/events/link-matchmaking", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event_id: selectedEventId, matchmaking_upload_id: uploadId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Koppelen mislukt");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Onbekende fout");
    } finally {
      setSaving(false);
    }
  }

  async function saveEventPatch(patch: Partial<EventRow>) {
    if (!selectedEventId) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/events/update", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selectedEventId, ...patch }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Opslaan mislukt");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Onbekende fout");
    } finally {
      setSaving(false);
    }
  }

  const openUploads = uploads.filter((u) => !u.event_id);

  return (
    <Shell>
      <Header onBack={() => router.back()} onDashboard={() => router.push("/dashboard/admin")} />

      <div className="px-6 py-8">
        <div className="text-center">
          <div className="text-4xl font-extrabold" style={{ color: ORANGE }}>
            Events koppelen
          </div>
          <div className="mt-1" style={{ color: "#555" }}>
            Koppel matchmaking-uploads aan een event (event_id).
          </div>
        </div>

        {err && (
          <div className="mt-6 rounded-2xl px-4 py-3" style={{ border: `3px solid ${BORDER}`, background: "#ffe8e8", color: "#7a0000" }}>
            {err}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT */}
          <div className="rounded-2xl p-5" style={{ background: PANEL_BG, border: `3px solid ${BORDER}`, boxShadow: PANEL_SHADOW }}>
            <div className="mb-4 h-[4px] w-full rounded-full" style={{ background: "linear-gradient(90deg,#ff4d00, rgba(255,77,0,0.10))" }} />
            <div className="text-lg font-extrabold" style={{ color: "#111" }}>
              1) Kies event
            </div>
            <div className="mt-3">
              <select
                className="w-full rounded-xl px-3 py-2"
                style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                <option value="">— kies —</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.naam} — {e.datum}
                  </option>
                ))}
              </select>
            </div>

            {selectedEvent && (
              <div className="mt-5">
                <div className="text-sm font-bold" style={{ color: "#333" }}>
                  Missende info aanvullen (optioneel)
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-sm font-bold mb-1" style={{ color: "#222" }}>Promotor</div>
                    <FieldOnBlur
                      value={selectedEvent.promotor ?? ""}
                      onBlurSave={(v) => saveEventPatch({ promotor: v || null })}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-bold mb-1" style={{ color: "#222" }}>Matchmaker</div>
                    <FieldOnBlur
                      value={selectedEvent.matchmaker ?? ""}
                      onBlurSave={(v) => saveEventPatch({ matchmaker: v || null })}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-bold mb-1" style={{ color: "#222" }}>Hoofdofficial</div>
                    <FieldOnBlur
                      value={selectedEvent.hoofdofficial ?? ""}
                      onBlurSave={(v) => saveEventPatch({ hoofdofficial: v || null })}
                    />
                  </div>
                </div>

                {saving && <div className="mt-3 text-sm" style={{ color: "#666" }}>Bezig…</div>}
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="rounded-2xl p-5" style={{ background: PANEL_BG_SOFT, border: `3px solid ${BORDER}`, boxShadow: PANEL_SHADOW }}>
            <div className="mb-4 h-[4px] w-full rounded-full" style={{ background: "linear-gradient(90deg, rgba(255,77,0,0.12), rgba(0,0,0,0.10))" }} />
            <div className="text-lg font-extrabold" style={{ color: "#111" }}>
              2) Uploads zonder event
            </div>

            <div className="mt-3 overflow-x-auto rounded-2xl" style={{ border: `3px solid ${BORDER}`, background: "#fff" }}>
              <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: ORANGE, color: "#fff" }}>
                    <th className="text-left px-4 py-3">Upload</th>
                    <th className="text-left px-4 py-3">Event info (uit upload)</th>
                    <th className="text-left px-4 py-3">Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {openUploads.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4" colSpan={3} style={{ color: "#666" }}>
                        Geen openstaande uploads.
                      </td>
                    </tr>
                  ) : (
                    openUploads.map((u, idx) => (
                      <tr key={u.id} style={{ background: idx % 2 === 0 ? "#ffffff" : "#efefef" }}>
                        <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)" }}>
                          <div className="font-bold" style={{ color: "#111" }}>{u.raw_filename ?? "—"}</div>
                          <div className="text-xs" style={{ color: "#666" }}>{u.uploaded_at ?? ""}</div>
                        </td>
                        <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)", color: "#111" }}>
                          <div>{u.evenement_naam ?? "—"}</div>
                          <div className="text-sm" style={{ color: "#666" }}>
                            {u.evenement_datum ?? ""} {u.locatie ? `— ${u.locatie}` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.10)" }}>
                          <button
                            disabled={!selectedEventId || saving}
                            onClick={() => linkUpload(u.id)}
                            className="rounded-xl px-4 py-2 font-extrabold disabled:opacity-60"
                            style={{ background: ORANGE, color: "#fff", border: `2px solid ${BORDER}` }}
                          >
                            Koppel
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-xs" style={{ color: "#666" }}>
              Tip: na koppelen kun je de controle-flow overal via <span className="font-mono">event_id</span> terugvinden.
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function FieldOnBlur({
  value,
  onBlurSave,
}: {
  value: string;
  onBlurSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);

  useEffect(() => setV(value), [value]);

  return (
    <input
      className="w-full rounded-xl px-3 py-2"
      style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v !== value) onBlurSave(v.trim());
      }}
    />
  );
}
