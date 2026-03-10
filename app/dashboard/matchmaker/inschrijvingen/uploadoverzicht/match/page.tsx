"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";

type Fighter = Record<string, any>;

function parseDate(v: any): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  return isNaN(d.getTime()) ? null : d;
}

function calcAgeYearsOnDate(eventDate: Date, birthDate: Date): number {
  let years = eventDate.getFullYear() - birthDate.getFullYear();
  const m = eventDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && eventDate.getDate() < birthDate.getDate())) years -= 1;
  return years;
}

function diffMonthsDays(from: Date, to: Date): { months: number; days: number; totalDays: number } {
  // from <= to
  let start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  let months = 0;
  while (true) {
    const next = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
    if (next <= end) {
      start = next;
      months += 1;
    } else break;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.round((end.getTime() - start.getTime()) / msPerDay);
  const totalDays = Math.round((end.getTime() - new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) / msPerDay);
  return { months, days, totalDays };
}

function safe(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

export default function MatchmakerMatchPage() {
  const router = useRouter();
  const params = useParams();
  const matchmakingId = String((params as any)?.matchmakingId ?? "");

  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [rows, setRows] = useState<Fighter[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  const [pickA, setPickA] = useState<Fighter | null>(null);
  const [pickB, setPickB] = useState<Fighter | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!matchmakingId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchmakingId]);

  async function load() {
    setLoading(true);
    setMsg("");

    const { data: mm } = await supabase
      .from("matchmaker_matchmakings")
      .select("evenement_datum")
      .eq("id", matchmakingId)
      .maybeSingle();
    setEventDate(parseDate((mm as any)?.evenement_datum) ?? null);

    const { data, error } = await supabase
      .from("matchmaker_inschrijvingen")
      .select("*")
      .eq("matchmaker_matchmaking_id", matchmakingId)
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      setRows([]);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as any);
    setLoading(false);
  }

  const sorted = useMemo(() => {
    const arr = [...rows];
    const key = (r: Fighter) => {
      const disc = safe(r.discipline, "").toLowerCase();
      const klass = safe(r.klasse, "").toLowerCase();
      const sex = safe(r.geslacht, "").toLowerCase();
      const w = Number(r.gewicht ?? 0);
      const b = parseDate(r.geboortedatum);
      const age = eventDate && b ? calcAgeYearsOnDate(eventDate, b) : 999;
      return [disc, klass, sex, String(isNaN(w) ? 9999 : w).padStart(6, "0"), String(age).padStart(3, "0")].join("|");
    };
    arr.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
    return arr;
  }, [rows, eventDate]);

  const groups = useMemo(() => {
    const g: Record<string, Fighter[]> = {};
    for (const r of sorted) {
      const k = `${safe(r.discipline, "-")} • ${safe(r.klasse, "-")} • ${safe(r.geslacht, "-")}`;
      (g[k] ||= []).push(r);
    }
    return g;
  }, [sorted]);

  function togglePick(r: Fighter) {
    if (!pickA || (pickA && pickB)) {
      setPickA(r);
      setPickB(null);
      setModalOpen(false);
      return;
    }
    if (pickA && !pickB) {
      if (String(pickA.id) === String(r.id)) return;
      setPickB(r);
      setModalOpen(true);
    }
  }

  const diff = useMemo(() => {
    if (!pickA || !pickB) return null;
    const aBirth = parseDate(pickA.geboortedatum);
    const bBirth = parseDate(pickB.geboortedatum);
    const aW = Number(pickA.gewicht ?? NaN);
    const bW = Number(pickB.gewicht ?? NaN);
    const wDiff = Number.isFinite(aW) && Number.isFinite(bW) ? Math.abs(aW - bW) : null;

    const aAge = eventDate && aBirth ? calcAgeYearsOnDate(eventDate, aBirth) : null;
    const bAge = eventDate && bBirth ? calcAgeYearsOnDate(eventDate, bBirth) : null;
    const maxAge = Math.max(aAge ?? 0, bAge ?? 0);

    let jeugd = false;
    if (aAge != null && bAge != null) jeugd = maxAge < 18;

    let ageDetail: string | null = null;
    if (eventDate && aBirth && bBirth) {
      const older = aBirth < bBirth ? aBirth : bBirth;
      const younger = aBirth < bBirth ? bBirth : aBirth;
      const md = diffMonthsDays(older, younger);
      ageDetail = `${md.months} maanden, ${md.days} dagen`;
    }

    return {
      jeugd,
      aAge,
      bAge,
      ageDetail,
      wDiff,
    };
  }, [pickA, pickB, eventDate]);

  async function createBout() {
    if (!pickA || !pickB) return;
    try {
      setCreating(true);
      setMsg("");

      const res = await authedFetch("/api/matchmaker/create-bout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          matchmaker_matchmaking_id: Number(matchmakingId),
          rood_inschrijving_id: Number(pickA.id),
          blauw_inschrijving_id: Number(pickB.id),
        }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg(`❌ ${j?.error ?? "Partij maken mislukt"}`);
        return;
      }

      setMsg(`✅ Partij aangemaakt (#${j?.partij_nr ?? "?"}).`);
      setModalOpen(false);
      setPickA(null);
      setPickB(null);

      // ga direct naar partijen-overzicht (of detail als je wil)
      router.push(`/dashboard/matchmaker/inschrijvingen/uploadoverzicht/${matchmakingId}`);
    } catch (e: any) {
      console.error(e);
      setMsg("❌ Onverwachte fout bij maken partij.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--brand-orange)", background: "#111" }}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs text-white/60">Match pagina</div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--brand-orange)" }}>
                Selecteer 2 vechters
              </h1>
              <div className="text-sm text-white/70">
                Gesorteerd op discipline → klasse → geslacht → gewicht → leeftijd.
              </div>
              <div className="mt-2 text-xs text-white/60">
                Eventdatum: {eventDate ? eventDate.toLocaleDateString("nl-NL") : "—"}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => router.push(`/dashboard/matchmaker/inschrijvingen/${matchmakingId}`)}
                className="rounded-md px-4 py-2 font-semibold border"
                style={{ borderColor: "var(--brand-orange)", color: "var(--brand-orange)" }}
              >
                ← Terug
              </button>
              <button
                onClick={() => {
                  setPickA(null);
                  setPickB(null);
                  setModalOpen(false);
                }}
                className="rounded-md px-4 py-2 font-semibold"
                style={{ background: "#2f2f33", border: "1px solid var(--brand-orange)" }}
              >
                Reset selectie
              </button>
            </div>
          </div>

          {msg ? <div className="mt-3 text-sm" style={{ color: "var(--brand-orange)" }}>{msg}</div> : null}
        </div>

        <div className="rounded-2xl border p-5" style={{ borderColor: "rgba(255,77,0,0.35)", background: "#0c0c0c" }}>
          {loading ? (
            <div className="text-white/60">Laden…</div>
          ) : Object.keys(groups).length === 0 ? (
            <div className="text-white/60">Geen inschrijvingen gevonden.</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groups).map(([k, list]) => (
                <div key={k} className="space-y-2">
                  <div className="text-sm font-bold" style={{ color: "var(--brand-orange)" }}>{k}</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-white/70">
                          <th className="py-2 pr-3">Select</th>
                          <th className="py-2 pr-3">Naam</th>
                          <th className="py-2 pr-3">Gym</th>
                          <th className="py-2 pr-3">VA</th>
                          <th className="py-2 pr-3">Gewicht</th>
                          <th className="py-2 pr-3">Geb.dat</th>
                          <th className="py-2 pr-3">Leeftijd</th>
                          <th className="py-2 pr-3">Partijen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r, idx) => {
                          const zebra = idx % 2 === 0;
                          const isA = pickA && String(pickA.id) === String(r.id);
                          const isB = pickB && String(pickB.id) === String(r.id);
                          const cls = zebra ? "bg-white text-zinc-900" : "bg-zinc-900 text-zinc-100";

                          const birth = parseDate(r.geboortedatum);
                          const age = eventDate && birth ? calcAgeYearsOnDate(eventDate, birth) : null;
                          const fights = [r.win, r.loss, r.draw, r.demo].filter((x) => x != null && String(x).trim() !== "").length
                            ? `${safe(r.win, "0")}-${safe(r.loss, "0")}-${safe(r.draw, "0")} (demo ${safe(r.demo, "0")})`
                            : "-";

                          return (
                            <tr key={r.id ?? idx} className={cls}>
                              <td className="py-2 px-2">
                                <button
                                  onClick={() => togglePick(r)}
                                  className="rounded-md px-3 py-1 font-semibold"
                                  style={{
                                    background: isA || isB ? "var(--brand-orange)" : "transparent",
                                    color: isA || isB ? "black" : "var(--brand-orange)",
                                    border: "1px solid var(--brand-orange)",
                                  }}
                                >
                                  {isA ? "Rood" : isB ? "Blauw" : "Kies"}
                                </button>
                              </td>
                              <td className="py-2 px-2 whitespace-nowrap font-semibold">
                                {safe([r.voornaam, r.achternaam].filter(Boolean).join(" "), "-")}
                              </td>
                              <td className="py-2 px-2 whitespace-nowrap">{safe(r.gym)}</td>
                              <td className="py-2 px-2 whitespace-nowrap">{safe(r.va_nummer)}</td>
                              <td className="py-2 px-2 whitespace-nowrap">{r.gewicht ?? "-"}</td>
                              <td className="py-2 px-2 whitespace-nowrap">{safe(r.geboortedatum)}</td>
                              <td className="py-2 px-2 whitespace-nowrap">{age == null ? "-" : String(age)}</td>
                              <td className="py-2 px-2 whitespace-nowrap">{fights}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL */}
        {modalOpen && pickA && pickB ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-2xl rounded-2xl border p-5" style={{ borderColor: "var(--brand-orange)", background: "#111" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-white/60">Vergelijking</div>
                  <div className="text-lg font-extrabold" style={{ color: "var(--brand-orange)" }}>
                    {safe([pickA.voornaam, pickA.achternaam].filter(Boolean).join(" "))}  vs  {safe([
                      pickB.voornaam,
                      pickB.achternaam,
                    ].filter(Boolean).join(" "))}
                  </div>
                  <div className="text-sm text-white/70">Klik “Akkoord” om de partij aan te maken.</div>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1 rounded border"
                  style={{ borderColor: "rgba(255,77,0,0.5)", color: "var(--brand-orange)" }}
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border p-3" style={{ borderColor: "rgba(255,77,0,0.25)", background: "#0c0c0c" }}>
                  <div className="text-white/60">Discipline / Klasse / Geslacht</div>
                  <div className="font-semibold">
                    {safe(pickA.discipline)} / {safe(pickA.klasse)} / {safe(pickA.geslacht)}
                  </div>
                </div>
                <div className="rounded-xl border p-3" style={{ borderColor: "rgba(255,77,0,0.25)", background: "#0c0c0c" }}>
                  <div className="text-white/60">Gewicht verschil</div>
                  <div className="font-semibold">{diff?.wDiff == null ? "-" : `${diff.wDiff.toFixed(1)} kg`}</div>
                </div>
                <div className="rounded-xl border p-3" style={{ borderColor: "rgba(255,77,0,0.25)", background: "#0c0c0c" }}>
                  <div className="text-white/60">Leeftijd op event</div>
                  <div className="font-semibold">Rood: {diff?.aAge ?? "-"} • Blauw: {diff?.bAge ?? "-"}</div>
                </div>
                <div className="rounded-xl border p-3" style={{ borderColor: "rgba(255,77,0,0.25)", background: "#0c0c0c" }}>
                  <div className="text-white/60">Leeftijd verschil (jeugd detail)</div>
                  <div className="font-semibold">{diff?.ageDetail ?? "-"}</div>
                </div>
              </div>

              <div className="mt-5 flex gap-2 justify-end">
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-md px-4 py-2 font-semibold border"
                  style={{ borderColor: "rgba(255,77,0,0.5)", color: "var(--brand-orange)" }}
                >
                  Afbreken
                </button>
                <button
                  onClick={createBout}
                  disabled={creating}
                  className="rounded-md px-4 py-2 font-semibold disabled:opacity-60"
                  style={{ background: "var(--brand-orange)", color: "black" }}
                >
                  {creating ? "Bezig…" : "Akkoord (maak partij)"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
