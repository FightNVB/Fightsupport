"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { authedFetch } from "@/lib/api/authedFetch";
import NvbLightButton from "@/components/NvbLightButton";
import NvbDarkButton from "@/components/NvbDarkButton";

const NVB_ORANGE = "#ff4d00";

const silverBackplate: CSSProperties = {
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 38%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(236,238,242,0.98) 100%)",
};

type FpSessionStatus = {
  status?: string | null;
  message?: string | null;
  updated_at?: string | null;
  last_error?: string | null;
};

function formatDateTime(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("nl-NL");
}

function isFightPassportUnlockStatus(status: string | null | undefined) {
  const s = String(status ?? "").trim().toLowerCase();
  return (
    s === "waiting_for_unlock" ||
    s === "waiting_for_unlock_code" ||
    s === "unlock_required" ||
    s === "code_required" ||
    s.includes("unlock") ||
    s.includes("pincode")
  );
}

function formatStatus(status: string | null | undefined) {
  const s = String(status ?? "").trim().toLowerCase();
  if (!s) return "Onbekend";
  if (isFightPassportUnlockStatus(s)) return "Wacht op unlockcode";
  if (s === "ready" || s === "logged_in" || s === "ok") return "Ingelogd / klaar";
  if (s === "logging_in") return "Bezig met inloggen";
  if (s === "scraping") return "Scraper bezig";
  if (s === "failed" || s === "error") return "Fout";
  return status ?? "Onbekend";
}

export default function FightPassportSessiePage() {
  const [session, setSession] = useState<FpSessionStatus | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const codeOk = useMemo(() => /^\d{7}$/.test(code.trim()), [code]);
  const waitingForUnlock = isFightPassportUnlockStatus(session?.status);

  useEffect(() => {
    void loadSession();
    const timer = window.setInterval(() => void loadSession(false), 2500);
    return () => window.clearInterval(timer);
  }, []);

  async function loadSession(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const res = await authedFetch("/api/fightpassport/session", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setMessage(
          `❌ FightPassport sessiestatus kon niet worden geladen (${res.status}). ${t}`
        );
        return;
      }

      const json = await res.json().catch(() => null);
      setSession({
        status: json?.status ?? json?.session?.status ?? null,
        message: json?.message ?? json?.session?.message ?? null,
        updated_at: json?.updated_at ?? json?.session?.updated_at ?? null,
        last_error: json?.last_error ?? json?.session?.last_error ?? null,
      });
    } catch (e) {
      console.error(e);
      setMessage("❌ Onverwachte fout bij ophalen van FightPassport sessie.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function submitUnlockCode() {
    try {
      setMessage("");
      const cleanCode = code.trim();

      if (!/^\d{7}$/.test(cleanCode)) {
        setMessage("⚠️ Vul precies 7 cijfers in.");
        return;
      }

      setSending(true);

      const res = await authedFetch("/api/fightpassport/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode, trust_device: true }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(json?.error ? `❌ ${json.error}` : "❌ Unlockcode versturen mislukt.");
        await loadSession(false);
        return;
      }

      setMessage(json?.message ?? "✅ Unlockcode verstuurd. De scraper kan nu verder.");
      setCode("");
      await loadSession(false);
    } catch (e) {
      console.error(e);
      setMessage("❌ Onverwachte fout bij versturen van unlockcode.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6" style={{ background: "#eef0f3" }}>
      <div className="mx-auto w-full max-w-[1100px]">
        <div
          className="rounded-[32px] p-[6px]"
          style={{
            background:
              "linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 22%, #8f8f8f 55%, #f0f0f0 100%)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.7), 0 22px 70px rgba(0,0,0,0.65)",
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
              <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto]">
                <div>
                  <div
                    className="font-extrabold uppercase"
                    style={{
                      fontSize: 28,
                      letterSpacing: "0.04em",
                      color: NVB_ORANGE,
                      textShadow: "0 6px 18px rgba(0,0,0,0.45)",
                    }}
                  >
                    FightPassport sessie
                  </div>
                  <div className="mt-1 text-sm text-white/85">
                    Unlockcode invoeren en vertrouwd apparaat bevestigen voor de scraper.
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div style={{ transform: "scale(0.85)", transformOrigin: "left center" }}>
                      <NvbLightButton
                        label="← Terug naar controle"
                        onClick={() =>
                          (window.location.href = "/dashboard/admin/controle")
                        }
                      />
                    </div>
                    <div style={{ transform: "scale(0.85)", transformOrigin: "left center" }}>
                      <NvbDarkButton
                        label="Status vernieuwen"
                        onClick={() => void loadSession()}
                      />
                    </div>
                  </div>
                </div>

                <div className="justify-self-center md:justify-self-end">
                  <div className="w-[240px] md:w-[300px]">
                    <img
                      src="/branding/fightsupport/excel-logo.png"
                      alt="FightSupport"
                      width={320}
                      height={120}
                      loading="eager"
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                        filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.45))",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-6 md:px-6">
              <div
                className="rounded-3xl border-2 border-zinc-500/60 p-4 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50 md:p-5"
                style={silverBackplate}
              >
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]">
                  <section
                    className="rounded-2xl border p-4"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(239,242,246,0.98) 100%)",
                      borderColor: "rgba(90,90,95,0.24)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 24px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-600">
                      Huidige sessie
                    </div>

                    {loading ? (
                      <div className="text-sm font-semibold text-zinc-600">Laden…</div>
                    ) : (
                      <div className="space-y-3">
                        <div
                          className="rounded-xl border px-4 py-3"
                          style={{
                            background: waitingForUnlock
                              ? "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)"
                              : "linear-gradient(180deg, #ffffff 0%, #f4f5f7 100%)",
                            borderColor: waitingForUnlock
                              ? "rgba(255,77,0,0.45)"
                              : "rgba(63,63,70,0.18)",
                          }}
                        >
                          <div className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
                            Status
                          </div>
                          <div
                            className="mt-1 text-2xl font-black uppercase"
                            style={{ color: waitingForUnlock ? NVB_ORANGE : "#18181b" }}
                          >
                            {formatStatus(session?.status)}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="rounded-xl border border-zinc-300/70 bg-white px-4 py-3">
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
                              Laatste update
                            </div>
                            <div className="mt-1 text-sm font-bold text-zinc-800">
                              {formatDateTime(session?.updated_at)}
                            </div>
                          </div>
                          <div className="rounded-xl border border-zinc-300/70 bg-white px-4 py-3">
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
                              Vertrouwd apparaat
                            </div>
                            <div className="mt-1 text-sm font-bold text-zinc-800">
                              Wordt automatisch aangevinkt
                            </div>
                          </div>
                        </div>

                        {session?.message ? (
                          <div className="rounded-xl border border-zinc-300/70 bg-white px-4 py-3 text-sm font-semibold text-zinc-700">
                            {session.message}
                          </div>
                        ) : null}

                        {session?.last_error ? (
                          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                            {session.last_error}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </section>

                  <section
                    className="rounded-2xl border p-4"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(42,42,46,0.98) 0%, rgba(20,20,24,0.98) 100%)",
                      borderColor: "rgba(255,77,0,0.45)",
                      boxShadow:
                        "0 18px 42px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.10)",
                    }}
                  >
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-white/70">
                      Unlockcode uit e-mail
                    </div>
                    <div className="mt-2 text-lg font-black uppercase text-white">
                      Vul 7 cijfers in
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      De scraper vult deze code in bij <strong>input.pincode</strong>, zet
                      <strong> vertrouw dit apparaat</strong> aan en laat de wachtende scrape daarna verder gaan.
                    </p>

                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 7))}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="1234567"
                      maxLength={7}
                      className="mt-5 h-14 w-full border px-4 text-center text-2xl font-black tracking-[0.28em] outline-none"
                      style={{
                        borderRadius: 0,
                        borderColor: code && !codeOk ? "#ef4444" : "rgba(255,77,0,0.65)",
                        background: "#fff",
                        color: "#111",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                      }}
                    />

                    <button
                      type="button"
                      onClick={submitUnlockCode}
                      disabled={!codeOk || sending}
                      className="mt-4 h-12 w-full text-sm font-black uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        borderRadius: 0,
                        background:
                          "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.22)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 24px rgba(255,77,0,0.20)",
                      }}
                    >
                      {sending ? "Code versturen…" : "Code versturen"}
                    </button>

                    {message ? (
                      <div
                        className="mt-4 rounded-xl border px-4 py-3 text-sm font-bold"
                        style={{
                          background: message.startsWith("✅")
                            ? "rgba(22,163,74,0.16)"
                            : message.startsWith("⚠️")
                            ? "rgba(245,158,11,0.16)"
                            : "rgba(239,68,68,0.16)",
                          borderColor: message.startsWith("✅")
                            ? "rgba(34,197,94,0.35)"
                            : message.startsWith("⚠️")
                            ? "rgba(245,158,11,0.35)"
                            : "rgba(239,68,68,0.35)",
                          color: "#fff",
                        }}
                      >
                        {message}
                      </div>
                    ) : null}
                  </section>
                </div>

                <div className="mt-4 rounded-2xl border border-zinc-700/30 bg-[#242428] px-4 py-3 text-sm font-semibold text-white shadow-inner">
                  Let op: als Puppeteer op de unlockpagina staat, mag de login niet opnieuw gestart worden.
                  Deze pagina stuurt alleen de code naar de bestaande wachtende sessie.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
