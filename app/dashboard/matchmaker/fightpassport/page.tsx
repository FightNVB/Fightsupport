// app/dashboard/matchmaker/fightpassport/page.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { authedFetch } from "@/lib/api/authedFetch";
import { ArrowLeft, KeyRound, Link2, Loader2, ShieldCheck, Unlink } from "lucide-react";

const ORANGE = "#ff4d00";

type SessionState = {
  status?: string;
  message?: string;
  updated_at?: string;
  last_login_at?: string;
} | null;

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export default function FightPassportPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [unlockCode, setUnlockCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [session, setSession] = useState<SessionState>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const status = norm(session?.status);
  const active = status === "active" || status === "logged_in" || status === "gekoppeld";
  const unlockRequired = useMemo(() => {
    const message = norm(session?.message);
    return (
      status === "unlock_required" ||
      status === "waiting_for_unlock" ||
      status === "unlock_nodig" ||
      message.includes("unlock") ||
      message.includes("pincode")
    );
  }, [session?.message, status]);

  async function loadStatus(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await authedFetch("/api/matchmaker/fightpassport/status");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Status ophalen mislukt");
      setSession(json?.session || null);
    } catch (e: any) {
      setMsg(e?.message || "Status ophalen mislukt");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function startLogin() {
    setBusy(true);
    setMsg("");

    try {
      const res = await authedFetch("/api/matchmaker/fightpassport/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          action: "login",
          trust_device: trustDevice,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Inloggen mislukt");

      setPassword("");
      setSession(json?.session || null);

      const nextStatus = norm(json?.session?.status);
      const nextMessage = norm(json?.session?.message);
      const needsUnlock =
        nextStatus === "unlock_required" ||
        nextStatus === "waiting_for_unlock" ||
        nextMessage.includes("unlock") ||
        nextMessage.includes("pincode");

      if (needsUnlock) {
        setMsg("FightPassport vraagt om een unlockcode. Vul hieronder alleen de 7-cijferige code in en bevestig.");
      } else {
        setMsg("FightPassport is gekoppeld. Je kunt nu Autocheck starten zonder opnieuw in te loggen.");
      }

      await loadStatus(true);
    } catch (e: any) {
      setMsg(e?.message || "Inloggen mislukt");
      await loadStatus(true);
    } finally {
      setBusy(false);
    }
  }

  async function submitUnlockCode() {
    setBusy(true);
    setMsg("");

    try {
      const code = unlockCode.replace(/\D/g, "").slice(0, 7);
      if (!/^\d{7}$/.test(code)) {
        throw new Error("Vul een geldige unlockcode van 7 cijfers in.");
      }

      const res = await authedFetch("/api/matchmaker/fightpassport/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unlock",
          unlock_code: code,
          trust_device: trustDevice,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Unlockcode bevestigen mislukt");

      setUnlockCode("");
      setSession(json?.session || null);
      setMsg("Unlockcode bevestigd. FightPassport is gekoppeld.");
      await loadStatus(true);
    } catch (e: any) {
      setMsg(e?.message || "Unlockcode bevestigen mislukt");
      await loadStatus(true);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setMsg("");

    try {
      const res = await authedFetch("/api/matchmaker/fightpassport/disconnect", {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Loskoppelen mislukt");

      setUsername("");
      setPassword("");
      setUnlockCode("");
      await loadStatus(true);
      setMsg("FightPassport sessie losgekoppeld.");
    } catch (e: any) {
      setMsg(e?.message || "Loskoppelen mislukt");
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = active ? "Gekoppeld" : unlockRequired ? "Unlockcode nodig" : "Niet gekoppeld";
  const statusColor = active ? "#46ff8a" : unlockRequired ? "#ffd166" : ORANGE;

  return (
    <main style={shell}>
      <section style={frame}>
        <header style={header}>
          <div>
            <div style={eyebrow}>MATCHMAKER</div>
            <h1 style={title}>FightPassport koppelen</h1>
            <p style={sub}>
              Koppel je eigen FightPassport sessie één keer. Daarna gebruikt Autocheck deze sessie op de VPS.
            </p>
          </div>
          <Link href="/dashboard/matchmaker/matchmaking" style={back}>
            <ArrowLeft size={16} /> Terug
          </Link>
        </header>

        {msg && <div style={message}>{msg}</div>}

        <div style={statusCard}>
          {loading ? (
            <Loader2 style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <ShieldCheck color={statusColor} />
          )}
          <div>
            <b>{statusLabel}</b>
            <div style={muted}>{session?.message || "Nog geen FightPassport sessie gevonden."}</div>
            {session?.updated_at && (
              <div style={muted}>Laatst bijgewerkt: {new Date(session.updated_at).toLocaleString("nl-NL")}</div>
            )}
          </div>
        </div>

        {!unlockRequired && (
          <section style={panel}>
            <h2 style={panelTitle}>Stap 1 — Inloggen</h2>
            <p style={muted}>
              Je wachtwoord wordt niet opgeslagen. Het wordt alleen gebruikt om de sessie/cookies te maken. Als FightPassport
              daarna een unlockcode vraagt, verschijnt stap 2 vanzelf.
            </p>

            <div style={grid}>
              <label style={label}>
                Gebruikersnaam
                <input
                  style={input}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </label>

              <label style={label}>
                Wachtwoord
                <input
                  style={input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                />
              </label>
            </div>

            <div style={actions}>
              <button style={orangeBtn} onClick={startLogin} disabled={busy || !username || !password}>
                {busy ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Link2 size={16} />}
                Inloggen / koppelen
              </button>

              <button style={silverBtn} onClick={disconnect} disabled={busy || !session}>
                <Unlink size={16} /> Loskoppelen
              </button>
            </div>
          </section>
        )}

        {unlockRequired && (
          <section style={unlockPanel}>
            <h2 style={panelTitle}>Stap 2 — Unlockcode bevestigen</h2>
            <p style={muted}>
              FightPassport heeft de login geaccepteerd maar vraagt nu om de 7-cijferige unlockcode. Vul alleen de code in,
              laat vertrouwd apparaat aan staan en bevestig.
            </p>

            <div style={grid}>
              <label style={label}>
                Unlockcode
                <input
                  style={input}
                  value={unlockCode}
                  onChange={(e) => setUnlockCode(e.target.value.replace(/\D/g, "").slice(0, 7))}
                  placeholder="7 cijfers"
                  inputMode="numeric"
                  autoFocus
                />
              </label>

              <label style={checkLabel}>
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                />
                Vertrouwd apparaat aanvinken
              </label>
            </div>

            <div style={actions}>
              <button style={orangeBtn} onClick={submitUnlockCode} disabled={busy || unlockCode.length !== 7}>
                {busy ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <KeyRound size={16} />}
                Unlockcode bevestigen
              </button>

              <button style={silverBtn} onClick={disconnect} disabled={busy || !session}>
                <Unlink size={16} /> Stoppen / loskoppelen
              </button>
            </div>
          </section>
        )}
      </section>

      <style jsx global>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );
}

const shell: React.CSSProperties = { minHeight: "100vh", background: "linear-gradient(180deg,#050505,#15161a,#070707)", color: "#fff", padding: 28 };
const frame: React.CSSProperties = { maxWidth: 980, margin: "0 auto", border: "4px solid rgba(255,255,255,.78)", borderRadius: 22, background: "linear-gradient(135deg,#2d3037,#101114 55%,#33363d)", boxShadow: "0 24px 70px rgba(0,0,0,.55)", padding: 22 };
const header: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", borderBottom: `3px solid ${ORANGE}`, paddingBottom: 18, marginBottom: 18 };
const eyebrow: React.CSSProperties = { color: ORANGE, fontWeight: 950, letterSpacing: 3, fontSize: 12 };
const title: React.CSSProperties = { margin: "4px 0", color: ORANGE, textTransform: "uppercase", letterSpacing: 2 };
const sub: React.CSSProperties = { margin: 0, color: "#d5d8dd", fontWeight: 700 };
const back: React.CSSProperties = { color: "#111", textDecoration: "none", display: "inline-flex", gap: 8, alignItems: "center", borderRadius: 8, padding: "9px 13px", fontWeight: 950, background: "linear-gradient(180deg,#fff,#979ca4,#fff)" };
const message: React.CSSProperties = { border: `1px solid ${ORANGE}`, borderRadius: 12, padding: 12, marginBottom: 14, background: "rgba(255,77,0,.18)", fontWeight: 850 };
const statusCard: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", border: "2px solid rgba(255,255,255,.25)", borderRadius: 16, padding: 14, background: "linear-gradient(180deg,#393c43,#15161a)", marginBottom: 16 };
const muted: React.CSSProperties = { color: "#cdd1d8", fontWeight: 700, fontSize: 13, marginTop: 4 };
const panel: React.CSSProperties = { border: "2px solid rgba(255,255,255,.22)", borderRadius: 16, padding: 16, background: "linear-gradient(180deg,#30333a,#101114)" };
const unlockPanel: React.CSSProperties = { ...panel, border: "2px solid rgba(255,209,102,.72)", background: "linear-gradient(180deg,#3a3320,#101114)" };
const panelTitle: React.CSSProperties = { margin: "0 0 8px", color: "#fff" };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(220px,1fr))", gap: 12, marginTop: 14 };
const label: React.CSSProperties = { display: "grid", gap: 6, color: "#f7f7f7", fontWeight: 850 };
const checkLabel: React.CSSProperties = { display: "flex", gap: 10, alignItems: "center", fontWeight: 850 };
const input: React.CSSProperties = { border: "1px solid rgba(255,255,255,.35)", borderRadius: 10, padding: "10px 12px", background: "#fff", color: "#111", fontWeight: 800 };
const actions: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 };
const orangeBtn: React.CSSProperties = { display: "inline-flex", gap: 8, alignItems: "center", borderRadius: 8, border: "1px solid #ff9b72", padding: "10px 14px", color: "#fff", fontWeight: 950, cursor: "pointer", background: "linear-gradient(180deg,#ff6b21,#ff4d00 48%,#a92d00)" };
const silverBtn: React.CSSProperties = { display: "inline-flex", gap: 8, alignItems: "center", borderRadius: 8, border: "1px solid #b8bcc2", padding: "10px 14px", color: "#111", fontWeight: 950, cursor: "pointer", background: "linear-gradient(180deg,#fff,#9ba0a8,#fff)" };
