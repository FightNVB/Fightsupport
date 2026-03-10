"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";


const ORANGE = "#ff4d00";
const BORDER = "#2b2b2b";
const PAGE_BG =
  "radial-gradient(900px 520px at 18% 0%, rgba(255,77,0,0.14), transparent 56%), radial-gradient(780px 520px at 82% 18%, rgba(255,255,255,0.80), transparent 62%), linear-gradient(180deg,#f6f6f6 0%, #e7e7e7 55%, #d4d4d4 100%)";
const PANEL_BG = "linear-gradient(180deg,#ffffff 0%, #f2f2f2 55%, #e7e7e7 100%)";
const PANEL_BG_SOFT = "linear-gradient(180deg,#fbfbfb 0%, #efefef 55%, #e2e2e2 100%)";
const PANEL_SHADOW = "0 12px 28px rgba(0,0,0,0.16), inset 0 0 0 2px rgba(255,255,255,0.70)";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-6" style={{ background: PAGE_BG }}>
      <div className="mx-auto w-full max-w-6xl">
        {/* buitenframe */}
        <div
          className="rounded-[36px] p-[10px]"
          style={{
            background: "linear-gradient(180deg,#f8f8f8 0%, #d6d6d6 55%, #bdbdbd 100%)",
            boxShadow: "0 20px 70px rgba(0,0,0,0.35)",
          }}
        >
          {/* binnenframe */}
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
      {/* subtiele oranje highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-10"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,77,0,0.18) 35%, rgba(255,77,0,0.05) 65%, transparent 100%)",
        }}
      />
      <div className="flex items-center justify-between gap-4">
        <div>
          <div style={{ color: ORANGE, letterSpacing: "0.14em", fontWeight: 800 }}>
            FIGHTSUPPORT
          </div>
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>
            Vechtsport ondersteuning
          </div>
        </div>

        {/* logo center */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <div
            className="rounded-[22px] p-[6px]"
            style={{
              background: "linear-gradient(180deg,#fefefe,#cfcfcf)",
              boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
            }}
          >
            <div
              className="rounded-[18px] p-[6px]"
              style={{
                border: `3px solid ${BORDER}`,
                background: "linear-gradient(180deg,#111,#000)",
              }}
            >
              <Image
                src="/branding/fightsupport/logo-dark.png"
                width={84}
                height={84}
                alt="FightSupport"
                priority
              />
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

export default function BeheerPortalPage() {
  const router = useRouter();

  const separator = useMemo(
    () => ({
      height: 1,
      background: "linear-gradient(to right, transparent, rgba(0,0,0,0.20), transparent)",
    }) as React.CSSProperties,
    []
  );

  return (
    <Shell>
      <Header onBack={() => router.back()} onDashboard={() => router.push("/dashboard/admin")} />

      <div className="px-6 py-8">
        <div className="text-center">
          <div className="text-4xl font-extrabold" style={{ color: ORANGE }}>
            Beheer Portaal
          </div>
          <div className="mt-1" style={{ color: "#555" }}>
            Admin tools voor events, accounts en sportschool-aliassen.
          </div>
        </div>

        <div className="my-6" style={separator} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="rounded-2xl p-5"
            style={{
              background: PANEL_BG,
              border: `3px solid ${BORDER}`,
              boxShadow: PANEL_SHADOW,
            }}
          >
            <div
              className="mb-4 h-[4px] w-full rounded-full"
              style={{ background: "linear-gradient(90deg,#ff4d00, rgba(255,77,0,0.10))" }}
            />
            <div className="font-bold" style={{ color: "#111" }}>
              Acties
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {/* Meer zilver/oranje buttons (diepte + accenten) */}
              <button
                onClick={() => router.push("/dashboard/admin/beheer/accounts-beheer")}
                className="rounded-xl px-4 py-3 text-left font-extrabold"
                style={{
                  background: "linear-gradient(180deg,#ffffff 0%, #f1f1f1 55%, #d9d9d9 100%)",
                  border: `3px solid ${BORDER}`,
                  boxShadow:
                    "0 10px 18px rgba(0,0,0,0.16), inset 0 0 0 2px rgba(255,255,255,0.80), inset 0 -14px 16px rgba(0,0,0,0.06)",
                }}
              >
                <span style={{ color: ORANGE }}>Gebruikers beheer</span>
                <div className="text-xs font-semibold" style={{ color: "#444" }}>
                  Accounts aanvragen & handmatig toevoegen
                </div>
              </button>

              <button
                onClick={() => router.push("/dashboard/admin/beheer/events/new")}
                className="rounded-xl px-4 py-3 text-left font-extrabold"
                style={{
                  background: PANEL_BG_SOFT,
                  border: `3px solid ${BORDER}`,
                  boxShadow: PANEL_SHADOW,
                }}
              >
                <span style={{ color: ORANGE }}>Event aanmaken</span>
                <div className="text-xs font-semibold" style={{ color: "#444" }}>
                  Nieuw event + datum + discipline(s)
                </div>
              </button>

              <button
                onClick={() => router.push("/dashboard/admin/beheer/events/link")}
                className="rounded-xl px-4 py-3 text-left font-extrabold"
                style={{
                  background: PANEL_BG,
                  border: `3px solid ${BORDER}`,
                  boxShadow: PANEL_SHADOW,
                }}
              >
                <span style={{ color: ORANGE }}>Koppel events aan data</span>
                <div className="text-xs font-semibold" style={{ color: "#444" }}>
                  Matchmaking uploads koppelen aan events
                </div>
              </button>

              <button
                onClick={() => router.push("/dashboard/admin/beheer/sportscholen/aliases")}
                className="rounded-xl px-4 py-3 text-left font-extrabold"
                style={{
                  background: PANEL_BG_SOFT,
                  border: `3px solid ${BORDER}`,
                  boxShadow: PANEL_SHADOW,
                }}
              >
                <span style={{ color: ORANGE }}>Sportschool aliassen</span>
                <div className="text-xs font-semibold" style={{ color: "#444" }}>
                  Consistente matching (scraper)
                </div>
              </button>

              <button
                onClick={() => router.push("/dashboard/admin/settings")}
                className="rounded-xl px-4 py-3 text-left font-extrabold"
                style={{
                  background: "linear-gradient(180deg, rgba(255,77,0,0.18) 0%, #f3f3f3 45%, #dfdfdf 100%)",
                  border: `3px solid ${BORDER}`,
                  boxShadow: PANEL_SHADOW,
                }}
              >
                <span style={{ color: "#111" }}>Instellingen</span>
                <div className="text-xs font-semibold" style={{ color: "#444" }}>
                  App & beheer opties
                </div>
              </button>
            </div>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{ background: PANEL_BG_SOFT, border: `3px solid ${BORDER}`, boxShadow: PANEL_SHADOW }}
          >
            <div
              className="mb-4 h-[4px] w-full rounded-full"
              style={{ background: "linear-gradient(90deg, rgba(255,77,0,0.12), rgba(0,0,0,0.10))" }}
            />
            <div className="font-bold" style={{ color: "#111" }}>
              Tips
            </div>
            <ul className="mt-3 space-y-2" style={{ color: "#444" }}>
              <li>• Maak eerst een event aan, koppel daarna de upload (matchmaking).</li>
              <li>• Aliassen helpen de scraper om sportscholen consistent te matchen.</li>
              <li>• Accounts: rol toekennen en eventueel bondteam invullen.</li>
            </ul>

            <div
              className="mt-6 rounded-xl p-4"
              style={{
                border: `3px solid ${BORDER}`,
                background: "linear-gradient(180deg,#ffffff 0%, #f3f3f3 50%, #e7e7e7 100%)",
                boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.70)",
              }}
            >
              <div className="text-sm font-bold" style={{ color: "#111" }}>
                FightSupport
              </div>
              <div className="text-sm" style={{ color: "#555" }}>
                Licht zilver thema met donkergrijze randen en oranje accenten.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs" style={{ color: "#666" }}>
          © 2026 FightSupport
        </div>
      </div>
    </Shell>
  );
}
