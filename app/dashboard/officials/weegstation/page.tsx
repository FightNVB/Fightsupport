"use client";

// app/dashboard/officials/weegstation/page.tsx
// ✅ Weegstation overzicht: lijst van alle matchmakings waarvan weging beschikbaar is

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import NvbDarkButton from "@/components/NvbDarkButton";
import NvbLightButton from "@/components/NvbLightButton";

const NVB_ORANGE = "#ff4d00";

function metalFrameStyle(): CSSProperties {
  const accentGlow =
    "radial-gradient(640px 320px at 50% 0%, rgba(255,77,0,0.18), transparent 62%)";
  const brushed =
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 4px)";
  const sheen =
    "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 24%, rgba(255,255,255,0) 48%, rgba(255,255,255,0.10) 70%, rgba(255,255,255,0) 100%)";
  return {
    border: "5px solid rgba(10,10,12,0.92)",
    borderRadius: 22,
    background: `${accentGlow}, ${sheen}, ${brushed}, linear-gradient(180deg, #3a3d44 0%, #1f2025 52%, #0a0b0e 100%)`,
    boxShadow:
      "0 26px 70px rgba(0,0,0,0.70)," +
      " inset 0 0 0 2px rgba(255,255,255,0.14)," +
      " inset 0 0 0 4px rgba(180,180,190,0.18)," +
      " inset 0 0 0 7px rgba(0,0,0,0.55)," +
      " inset 0 1px 0 rgba(255,255,255,0.22)," +
      " inset 0 -18px 24px rgba(0,0,0,0.65)",
  };
}

function metalInnerStyle(): CSSProperties {
  return {
    border: "3px solid rgba(0,0,0,0.45)",
    borderRadius: 16,
    background:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, rgba(255,255,255,0.025) 1px, rgba(255,255,255,0.025) 6px)," +
      " linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(233,236,240,0.98) 100%)",
    boxShadow:
      "inset 0 0 0 2px rgba(255,255,255,0.70)," +
      " inset 0 0 0 6px rgba(0,0,0,0.10)," +
      " inset 0 -12px 22px rgba(0,0,0,0.12)",
  };
}

type EventRow = {
  matchmaking_id: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  bondteam: string | null;
  discipline: string | null;
  total: number;
  gewogen: number;
  ok: number;
  dispensatie: number;
  afkeur: number;
};

function formatDate(v: string | null) {
  if (!v) return "-";
  return new Date(v.length === 10 ? `${v}T00:00:00` : v).toLocaleDateString("nl-NL");
}

export default function WeegstationOverzichtPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [melding, setMelding] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadEvents() {
    setLoading(true);
    setMelding(null);

    const { data, error } = await supabase
      .from("weigh_in_bouts")
      .select(
        "matchmaking_id, evenement_naam, evenement_datum, bondteam, discipline, eindstatus, rood_gewogen_gewicht, blauw_gewogen_gewicht"
      )
      .order("evenement_datum", { ascending: false });

    if (error) {
      setMelding("❌ Fout bij laden evenementen: " + error.message);
      setLoading(false);
      return;
    }

    // Group by matchmaking_id
    const byMm: Record<string, EventRow> = {};
    for (const row of data ?? []) {
      const mmId = row.matchmaking_id;
      if (!byMm[mmId]) {
        byMm[mmId] = {
          matchmaking_id: mmId,
          evenement_naam: row.evenement_naam,
          evenement_datum: row.evenement_datum,
          bondteam: row.bondteam,
          discipline: row.discipline,
          total: 0,
          gewogen: 0,
          ok: 0,
          dispensatie: 0,
          afkeur: 0,
        };
      }
      byMm[mmId].total += 1;
      if (row.rood_gewogen_gewicht != null && row.blauw_gewogen_gewicht != null) {
        byMm[mmId].gewogen += 1;
      }
      if (row.eindstatus === "OK" || row.eindstatus === "GOEDGEKEURD_MET_DISPENSATIE") {
        byMm[mmId].ok += 1;
      }
      if (row.eindstatus === "DISPENSATIE_NODIG" || row.eindstatus === "GOEDGEKEURD_MET_DISPENSATIE") {
        byMm[mmId].dispensatie += 1;
      }
      if (row.eindstatus === "AFKEUR") {
        byMm[mmId].afkeur += 1;
      }
    }

    setEvents(Object.values(byMm));
    setLoading(false);
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#0a0a0d" }}
    >
      <div style={{ width: "100%", maxWidth: 760 }}>
        {/* Metal frame */}
        <div style={metalFrameStyle()} className="p-4">
          {/* Header */}
          <div className="mb-4 rounded-xl px-4 py-4" style={{ background: "linear-gradient(180deg, rgba(255,77,0,0.22), rgba(0,0,0,0))", border: "1px solid rgba(255,77,0,0.28)" }}>
            <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
              <div />
              <div className="flex justify-center">
                <div className="rounded-[18px] p-[4px]" style={{ background: "linear-gradient(135deg, #f5f5f5 0%, #bdbdbd 28%, #8e8e8e 55%, #f0f0f0 72%, #6f6f6f 100%)", boxShadow: "0 0 0 2px rgba(255,255,255,0.45), 0 0 0 6px rgba(120,120,120,0.18), 0 12px 26px rgba(0,0,0,0.40)" }}>
                  <div className="rounded-[14px] px-3 py-2" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.40) 100%)", border: "1px solid rgba(255,255,255,0.10)" }}>
                    <Image src="/branding/fightsupport/logo-dark.png" width={220} height={120} alt="FightSupport" priority className="mx-auto" />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div style={{ color: NVB_ORANGE, fontWeight: 900, fontSize: 20, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  ⚖️ WEEGSTATION
                </div>
                <div style={{ color: "rgba(255,255,255,0.60)", fontSize: 13, marginTop: 2 }}>
                  Nederlandse Vechtsport Bond — Gewichtsregistratie
                </div>
              </div>
            </div>
          </div>

          {/* Inner silver plate */}
          <div style={metalInnerStyle()} className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a" }}>
                Kies een evenement
              </div>
              <button
                onClick={loadEvents}
                style={{ color: NVB_ORANGE, fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
              >
                ↺ Vernieuwen
              </button>
            </div>

            {melding && (
              <div className="mb-3 p-3 rounded-lg text-sm" style={{ background: melding.startsWith("❌") ? "#fee2e2" : "#dcfce7", color: melding.startsWith("❌") ? "#991b1b" : "#166534" }}>
                {melding}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8" style={{ color: "rgba(0,0,0,0.45)" }}>
                Laden…
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8" style={{ color: "rgba(0,0,0,0.45)" }}>
                Geen evenementen beschikbaar voor wegen.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {events.map((ev) => (
                  <button
                    key={ev.matchmaking_id}
                    onClick={() => router.push(`/dashboard/officials/weegstation/${ev.matchmaking_id}`)}
                    className="w-full text-left rounded-xl px-4 py-3 transition-all"
                    style={{
                      background: "rgba(0,0,0,0.04)",
                      border: "1.5px solid rgba(0,0,0,0.12)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,77,0,0.07)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,77,0,0.40)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.04)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.12)";
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a" }}>
                          {ev.evenement_naam ?? "Onbekend evenement"}
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(0,0,0,0.50)", marginTop: 2 }}>
                          {formatDate(ev.evenement_datum)} &nbsp;·&nbsp; {ev.bondteam ?? "-"} &nbsp;·&nbsp; {ev.discipline ?? "-"}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <div style={{ fontSize: 13, fontWeight: 600, color: ev.gewogen === ev.total ? "#16a34a" : NVB_ORANGE }}>
                          {ev.gewogen}/{ev.total} gewogen
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(0,0,0,0.45)" }}>
                          {ev.ok} OK · {ev.dispensatie} disp. · {ev.afkeur} afkeur
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4">
              <NvbLightButton
                label="← Terug naar officials portaal"
                onClick={() => router.push("/dashboard/officials")}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}