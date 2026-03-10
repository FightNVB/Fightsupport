"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const ORANGE = "#ff4d00";
const BORDER = "#2b2b2b";
const PAGE_BG =
  "radial-gradient(900px 520px at 18% 0%, rgba(255,77,0,0.14), transparent 56%), radial-gradient(780px 520px at 82% 18%, rgba(255,255,255,0.80), transparent 62%), linear-gradient(180deg,#f6f6f6 0%, #e7e7e7 55%, #d4d4d4 100%)";
const PANEL_BG = "linear-gradient(180deg,#ffffff 0%, #f2f2f2 55%, #e7e7e7 100%)";
const PANEL_BG_SOFT = "linear-gradient(180deg,#fbfbfb 0%, #efefef 55%, #e2e2e2 100%)";
const PANEL_SHADOW = "0 12px 28px rgba(0,0,0,0.16), inset 0 0 0 2px rgba(255,255,255,0.70)";

const BONDTEAMS = ["IRO", "NKF", "WPKL", "WMTA", "VON", "UMC", "MMAAN", "MON"] as const;
const DISCIPLINES = ["MMA", "KB", "MT", "K1", "BOKSEN"] as const;

type Bondteam = (typeof BONDTEAMS)[number];
type Discipline = (typeof DISCIPLINES)[number];

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
            style={{
              background: "linear-gradient(180deg,#4b4b4b,#2f2f2f)",
              color: "#fff",
              border: "2px solid rgba(255,255,255,0.22)",
              boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.25)",
            }}
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-bold mb-1" style={{ color: "#222" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

export default function NewEventPage() {
  const router = useRouter();

  const [naam, setNaam] = useState("");
  const [datum, setDatum] = useState("");
  const [locatie, setLocatie] = useState("");
  const [status, setStatus] = useState("draft");
  const [bondteam, setBondteam] = useState<Bondteam | "">("");
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);

  const [promotor, setPromotor] = useState("");
  const [matchmaker, setMatchmaker] = useState("");
  const [hoofdofficial, setHoofdofficial] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return !!naam.trim() && !!datum && !!bondteam && disciplines.length > 0;
  }, [naam, datum, bondteam, disciplines]);

  function toggleDiscipline(d: Discipline) {
    setDisciplines((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function onSubmit() {
    setErr(null);
    if (!canSave) return;

    setSaving(true);
    try {
      const res = await fetch("/api/events/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          naam: naam.trim(),
          datum,
          locatie: locatie.trim() || null,
          status,
          bondteam: bondteam || null,
          disciplines,
          promotor: promotor.trim() || null,
          matchmaker: matchmaker.trim() || null,
          hoofdofficial: hoofdofficial.trim() || null,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Opslaan mislukt");

      router.push("/dashboard/admin/beheer/events/link");
    } catch (e: any) {
      setErr(e?.message || "Onbekende fout");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <Header onBack={() => router.back()} onDashboard={() => router.push("/dashboard/admin")} />

      <div className="px-6 py-8">
        <div className="text-center">
          <div className="text-4xl font-extrabold" style={{ color: ORANGE }}>
            Evenement aanmaken
          </div>
          <div className="mt-1" style={{ color: "#555" }}>
            Bondteam verplicht • disciplines meerdere (incl. boksen)
          </div>
        </div>

        {err && (
          <div
            className="mt-6 rounded-2xl px-4 py-3"
            style={{
              border: `3px solid ${BORDER}`,
              background: "linear-gradient(180deg,#fff1f1 0%, #ffe0e0 100%)",
              color: "#7a0000",
              boxShadow: "0 10px 22px rgba(0,0,0,0.12)",
            }}
          >
            {err}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5" style={{ background: PANEL_BG, border: `3px solid ${BORDER}`, boxShadow: PANEL_SHADOW }}>
            <div className="mb-4 h-[4px] w-full rounded-full" style={{ background: "linear-gradient(90deg,#ff4d00, rgba(255,77,0,0.10))" }} />
            <div className="text-lg font-extrabold mb-4" style={{ color: "#111" }}>
              Basis
            </div>

            <div className="space-y-4">
              <Field label="Naam *">
                <input
                  className="w-full rounded-xl px-3 py-2"
                  style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  placeholder="Bijv. Lady Legends"
                />
              </Field>

              <Field label="Datum *">
                <input
                  type="date"
                  className="w-full rounded-xl px-3 py-2"
                  style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
                  value={datum}
                  onChange={(e) => setDatum(e.target.value)}
                />
              </Field>

              <Field label="Locatie / plaats">
                <input
                  className="w-full rounded-xl px-3 py-2"
                  style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
                  value={locatie}
                  onChange={(e) => setLocatie(e.target.value)}
                  placeholder="Bijv. Wijk bij Duurstede"
                />
              </Field>

              <Field label="Status">
                <select
                  className="w-full rounded-xl px-3 py-2"
                  style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="draft">draft</option>
                  <option value="open">open</option>
                  <option value="closed">closed</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: PANEL_BG_SOFT, border: `3px solid ${BORDER}`, boxShadow: PANEL_SHADOW }}>
            <div className="mb-4 h-[4px] w-full rounded-full" style={{ background: "linear-gradient(90deg, rgba(255,77,0,0.12), rgba(0,0,0,0.10))" }} />
            <div className="text-lg font-extrabold mb-4" style={{ color: "#111" }}>
              Bondteam & disciplines
            </div>

            <div className="space-y-4">
              <Field label="Bondteam *">
                <select
                  className="w-full rounded-xl px-3 py-2"
                  style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
                  value={bondteam}
                  onChange={(e) => setBondteam((e.target.value as any) || "")}
                >
                  <option value="">— kies —</option>
                  {BONDTEAMS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>

              <div>
                <div className="text-sm font-bold mb-2" style={{ color: "#222" }}>
                  Disciplines * (meerdere)
                </div>
                <div className="flex flex-wrap gap-2">
                  {DISCIPLINES.map((d) => {
                    const on = disciplines.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDiscipline(d)}
                        className="px-3 py-2 rounded-xl font-extrabold"
                        style={{
                          background: on ? ORANGE : "#f2f2f2",
                          color: on ? "#fff" : "#111",
                          border: `2px solid ${BORDER}`,
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs" style={{ color: "#666" }}>
                  Geselecteerd: {disciplines.length ? disciplines.join(", ") : "—"}
                </div>
              </div>

              <div className="pt-2" style={{ borderTop: `1px solid rgba(0,0,0,0.18)` }}>
                <div className="text-sm font-extrabold mb-2" style={{ color: "#111" }}>
                  Optioneel aanvullen
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Promotor">
                    <input
                      className="w-full rounded-xl px-3 py-2"
                      style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
                      value={promotor}
                      onChange={(e) => setPromotor(e.target.value)}
                    />
                  </Field>
                  <Field label="Matchmaker">
                    <input
                      className="w-full rounded-xl px-3 py-2"
                      style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
                      value={matchmaker}
                      onChange={(e) => setMatchmaker(e.target.value)}
                    />
                  </Field>
                  <Field label="Hoofdofficial">
                    <input
                      className="w-full rounded-xl px-3 py-2"
                      style={{ background: "#fff", border: `2px solid ${BORDER}`, color: "#000" }}
                      value={hoofdofficial}
                      onChange={(e) => setHoofdofficial(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 justify-end">
          <button
            disabled={!canSave || saving}
            onClick={onSubmit}
            className="rounded-xl px-6 py-3 font-extrabold disabled:opacity-60"
            style={{
              background: "linear-gradient(180deg,#ff6a2a 0%, #ff4d00 55%, #c93b00 100%)",
              color: "#fff",
              border: `3px solid ${BORDER}`,
              boxShadow:
                "0 14px 28px rgba(0,0,0,0.22), inset 0 0 0 2px rgba(255,255,255,0.25), inset 0 -16px 20px rgba(0,0,0,0.12)",
            }}
          >
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </div>
    </Shell>
  );
}
