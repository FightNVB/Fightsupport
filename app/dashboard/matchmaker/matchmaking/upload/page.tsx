"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api/authedFetch";
import NvbLightButton from "@/components/NvbLightButton";
import NvbDarkButton from "@/components/NvbDarkButton";

const NVB_ORANGE = "#ff4d00";

const silverBackplate: CSSProperties = {
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 38%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(236,238,242,0.98) 100%)",
};

function Small({
  children,
  origin = "left center",
}: {
  children: ReactNode;
  origin?: string;
}) {
  return (
    <div
      style={{
        transform: "scale(0.85)",
        transformOrigin: origin,
      }}
    >
      {children}
    </div>
  );
}

export default function MatchmakerInschrijvingenUploadPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user } = useAuth();

  const matchmakingId = String(sp.get("matchmaking_id") ?? "").trim();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  const acceptedInfo = useMemo(
    () => [
      "Excel .xlsx",
      "Excel .xls",
      "1 vechter per rij",
      "Geen rood/blauw split",
    ],
    []
  );

  async function handleSubmit() {
    try {
      if (!user) {
        setMelding("⚠️ Je bent niet ingelogd.");
        return;
      }

      if (!matchmakingId) {
        setMelding("⚠️ Geen matchmaking_id gevonden.");
        return;
      }

      if (!file) {
        setMelding("⚠️ Kies een Excel bestand.");
        return;
      }

      setLoading(true);
      setMelding("⏳ Uploaden en verwerken…");

      const fd = new FormData();
      fd.append("matchmaking_id", matchmakingId);
      fd.append("uploaded_by", user.id);
      fd.append("file", file);

      const res = await authedFetch("/api/matchmaker/submit-inschrijvingen", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMelding(`❌ ${data?.error ?? "Upload mislukt"}`);
        return;
      }

      setMelding(`✅ ${data?.inserted ?? 0} vechters toegevoegd.`);
      router.push(`/dashboard/matchmaker/matchmaking/${data.matchmaking_id ?? matchmakingId}/match`);
    } catch (e) {
      console.error(e);
      setMelding("❌ Onverwachte fout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6" style={{ background: "#eef0f3" }}>
      <div className="mx-auto w-full max-w-[1200px]">
        <div
          className="rounded-[32px] p-[6px]"
          style={{
            background:
              "linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 22%, #8f8f8f 55%, #f0f0f0 100%)",
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.7),
              0 22px 70px rgba(0,0,0,0.9)
            `,
          }}
        >
          <div
            className="relative overflow-hidden rounded-[28px]"
            style={{
              background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
              border: "3px solid rgba(63,63,70,0.35)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            <div
              className="px-6 py-5"
              style={{
                background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                borderBottom: `3px solid rgba(255,77,0,0.55)`,
              }}
            >
              <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto_1fr]">
                <div className="justify-self-start">
                  <div className="leading-tight">
                    <div
                      className="font-extrabold uppercase"
                      style={{
                        fontSize: 28,
                        letterSpacing: "0.04em",
                        color: NVB_ORANGE,
                        textShadow: "0 6px 18px rgba(0,0,0,0.45)",
                      }}
                    >
                      Inschrijvingen upload
                    </div>
                    <div className="mt-1 text-sm text-white/85">
                      Voeg een extra bestand toe aan deze matchmaking
                    </div>
                    <div className="mt-1 text-xs text-white/70">
                      Matchmaking ID: {matchmakingId || "-"}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Small origin="left center">
                      <NvbLightButton
                        label="← Terug naar overzicht"
                        onClick={() =>
                          (window.location.href =
                            "/dashboard/matchmaker/matchmaking")
                        }
                      />
                    </Small>

                    {matchmakingId ? (
                      <Small origin="left center">
                        <NvbDarkButton
                          label="Terug naar matchmaking"
                          onClick={() =>
                            (window.location.href = `/dashboard/matchmaker/matchmaking/${matchmakingId}`)
                          }
                        />
                      </Small>
                    ) : null}
                  </div>
                </div>

                <div className="justify-self-center">
                  <Image
                    src="/branding/fightsupport/excel-logo.png"
                    alt="FightSupport"
                    width={320}
                    height={120}
                    priority
                    className="h-auto w-[240px] md:w-[280px] xl:w-[320px] drop-shadow-[0_8px_22px_rgba(0,0,0,0.45)]"
                  />
                </div>

                <div className="justify-self-end">
                  <div
                    className="rounded-2xl border px-4 py-3 text-right"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
                      borderColor: "rgba(255,77,0,0.35)",
                      color: "#fff",
                    }}
                  >
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/65">
                      Bestand
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      Excel upload
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-6 md:px-6">
              <div
                className="rounded-3xl border-2 border-zinc-500/60 p-4 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50 md:p-5"
                style={silverBackplate}
              >
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                  <div
                    className="rounded-[24px] border p-5"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(239,242,246,0.98) 100%)",
                      borderColor: "rgba(90,90,95,0.22)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 24px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-700">
                      Upload bestand
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Upload hier een extra inschrijvingenbestand voor deze
                      matchmaking.
                    </div>

                    <div className="mt-5">
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                        Excel bestand *
                      </label>

                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="orange-input h-11 w-full py-2"
                      />

                      <div className="mt-3 text-xs text-zinc-500">
                        Geselecteerd: {file?.name ?? "Nog geen bestand gekozen"}
                      </div>
                    </div>

                    {melding ? (
                      <div
                        className="mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold"
                        style={{
                          background: "rgba(255,255,255,0.75)",
                          borderColor: melding.startsWith("✅")
                            ? "rgba(16,185,129,0.35)"
                            : melding.startsWith("⚠️")
                            ? "rgba(245,158,11,0.35)"
                            : "rgba(255,77,0,0.35)",
                          color: melding.startsWith("✅")
                            ? "#0a7a2f"
                            : melding.startsWith("⚠️")
                            ? "#9a5a00"
                            : "#c2410c",
                        }}
                      >
                        {melding}
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60"
                      >
                        {loading ? "Bezig…" : "Upload & voeg toe"}
                      </button>

                      <button
                        onClick={() => setFile(null)}
                        disabled={loading}
                        className="rounded border border-zinc-300 bg-[#2f2f33] px-4 py-2 text-sm font-semibold text-white hover:bg-white hover:text-black disabled:opacity-60"
                      >
                        Wissen
                      </button>
                    </div>
                  </div>

                  <div
                    className="rounded-[24px] border p-5"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(239,242,246,0.98) 100%)",
                      borderColor: "rgba(90,90,95,0.22)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 24px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-700">
                      Upload regels
                    </div>

                    <div className="mt-4 space-y-3">
                      {acceptedInfo.map((item) => (
                        <div
                          key={item}
                          className="rounded-xl border px-3 py-3 text-sm"
                          style={{
                            background: "#fff",
                            borderColor: "rgba(63,63,70,0.12)",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                          }}
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    <div
                      className="mt-5 rounded-2xl border px-4 py-4 text-sm text-zinc-600"
                      style={{
                        background: "#fff",
                        borderColor: "rgba(63,63,70,0.12)",
                      }}
                    >
                      Let op: deze pagina maakt geen nieuwe matchmaking aan. De
                      upload wordt toegevoegd aan de bestaande matchmaking uit de
                      URL.
                    </div>
                  </div>
                </div>

                <p className="mt-7 text-center text-xs text-zinc-500">
                  © FightSupport
                </p>
              </div>
            </div>
          </div>
        </div>

        <style jsx global>{`
          :root {
            --brand-orange: ${NVB_ORANGE};
          }

          .orange-input {
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid rgba(255, 77, 0, 0.35);
            border-radius: 12px;
            padding: 0 12px;
            outline: none;
            color: #111;
          }

          .orange-input:focus {
            border-color: rgba(255, 77, 0, 0.75);
            box-shadow: 0 0 0 3px rgba(255, 77, 0, 0.18);
          }
        `}</style>
      </div>
    </main>
  );
}