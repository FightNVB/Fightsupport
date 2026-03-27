"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle, XCircle, RefreshCcw, ArrowLeft, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";

const NVB_ORANGE = "#ff4d00";

type MeldingRow = {
  id: string;
  partij_nr: number | null;
  hoek: "rood" | "blauw" | null;
  rule: string | null;
  rule_code: string | null;
  resultaat: string | null;
  boodschap: string | null;
  review_status: string | null;
  aantekeningen: string | null;
};

function getMeldingStatus(row: MeldingRow): { label: string; color: string; bg: string } {
  const res = String(row.resultaat ?? "").toLowerCase();
  const rev = String(row.review_status ?? "").toLowerCase();
  if (res === "ok" || rev === "goedgekeurd")
    return { label: "Akkoord", color: "#166534", bg: "rgba(22,163,74,0.12)" };
  if (res === "afgekeurd" || rev === "afgekeurd")
    return { label: "Afgewezen", color: "#991b1b", bg: "rgba(220,38,38,0.12)" };
  return { label: "In behandeling", color: "#92400e", bg: "rgba(234,179,8,0.12)" };
}

function safe(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const pageWrap: CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f0f0f0 0%, #e2e2e2 100%)",
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
};

const topBar: CSSProperties = {
  background: "linear-gradient(180deg, #1a1a1e 0%, #0d0d10 100%)",
  borderBottom: `3px solid ${NVB_ORANGE}`,
  padding: "12px 24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const headerBtn: CSSProperties = {
  padding: "6px 14px",
  fontSize: 12,
  fontWeight: 800,
  color: "#fff",
  background: "linear-gradient(180deg, #3d434d 0%, #22262d 100%)",
  border: "1px solid rgba(0,0,0,0.45)",
  borderRadius: 4,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  textDecoration: "none",
};

const orangeBtn: CSSProperties = {
  ...headerBtn,
  background: `linear-gradient(180deg, #ff6a14 0%, ${NVB_ORANGE} 55%, #df3f00 100%)`,
  border: "1px solid rgba(150,40,0,0.55)",
};

const innerWrap: CSSProperties = {
  maxWidth: 1000,
  margin: "0 auto",
  padding: "24px 16px 48px",
};

const cardStyle: CSSProperties = {
  background: "#fff",
  borderRadius: 10,
  border: "2px solid #2b2b2b",
  boxShadow: "0 12px 26px rgba(0,0,0,0.10)",
  marginBottom: 16,
  overflow: "hidden",
};

const cardHeader: CSSProperties = {
  background: "linear-gradient(180deg, #2a2a2e 0%, #1f1f23 100%)",
  borderBottom: `2px solid rgba(255,77,0,0.50)`,
  padding: "10px 16px",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const statCardStyle: CSSProperties = {
  background: "linear-gradient(180deg, #f4f4f4 0%, #dfdfdf 100%)",
  border: "2px solid #3f3f3f",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), 0 10px 28px rgba(0,0,0,0.18)",
  borderRadius: 12,
  padding: "14px 20px",
  minWidth: 120,
};

export default function AdminMeldingenPage() {
  const { matchmakingId } = useParams<{ matchmakingId: string }>();

  const [loading, setLoading] = useState(true);
  const [meldingen, setMeldingen] = useState<MeldingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reden, setReden] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  async function loadMeldingen() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from("controle_resultaten")
        .select("id, partij_nr, hoek, rule, rule_code, resultaat, boodschap, review_status, aantekeningen")
        .eq("matchmaking_id", matchmakingId)
        .order("partij_nr", { ascending: true });

      if (dbErr) throw dbErr;
      setMeldingen((data ?? []) as MeldingRow[]);
    } catch (e: any) {
      setError(e?.message ?? "Fout bij laden meldingen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (matchmakingId) void loadMeldingen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchmakingId]);

  async function updateStatus(meldingId: string, new_status: string) {
    setBusy(meldingId);
    setNotice(null);
    try {
      const res = await authedFetch("/api/admin/meldingen/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          melding_id: meldingId,
          new_status,
          reden: reden[meldingId] ?? "",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fout bij opslaan.");
      setNotice(`Melding bijgewerkt naar: ${new_status}`);
      await loadMeldingen();
    } catch (e: any) {
      setError(e?.message ?? "Onbekende fout.");
    } finally {
      setBusy(null);
    }
  }

  async function bulkAkkoord() {
    const pending = meldingen.filter(
      (m) =>
        String(m.resultaat ?? "").toLowerCase() !== "ok" &&
        String(m.review_status ?? "").toLowerCase() !== "goedgekeurd"
    );
    if (pending.length === 0) return;
    if (!confirm(`Alle ${pending.length} openstaande meldingen op akkoord zetten?`)) return;
    for (const m of pending) {
      await updateStatus(m.id, "akkoord");
    }
  }

  const total = meldingen.length;
  const akkoord = meldingen.filter(
    (m) =>
      String(m.resultaat).toLowerCase() === "ok" ||
      String(m.review_status).toLowerCase() === "goedgekeurd"
  ).length;
  const afgewezen = meldingen.filter(
    (m) =>
      String(m.resultaat).toLowerCase() === "afgekeurd" ||
      String(m.review_status).toLowerCase() === "afgekeurd"
  ).length;
  const pending = total - akkoord - afgewezen;
  const allResolved = pending === 0 && total > 0;

  return (
    <div style={pageWrap}>
      {/* Top bar */}
      <div style={topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Image
            src="/branding/fightsupport/logo-dark.png"
            width={120}
            height={50}
            alt="FightSupport"
            style={{ height: "auto", width: "auto" }}
            priority
          />
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
              Meldingen Controle
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
              Admin goedkeuring · {safe(matchmakingId)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/dashboard/admin/controle" style={headerBtn}>
            <ArrowLeft size={12} /> Terug
          </Link>
          <button style={headerBtn} onClick={() => void loadMeldingen()}>
            <RefreshCcw size={12} /> Ververs
          </button>
          {pending > 0 && (
            <button style={orangeBtn} onClick={() => void bulkAkkoord()}>
              <CheckCircle size={12} /> Alles akkoord
            </button>
          )}
        </div>
      </div>

      <div style={innerWrap}>
        {/* Stat cards */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={statCardStyle}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#555", fontWeight: 700 }}>
              Totaal
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#111", marginTop: 2 }}>{total}</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#555", fontWeight: 700 }}>
              Akkoord
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#166534", marginTop: 2 }}>{akkoord}</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#555", fontWeight: 700 }}>
              Afgewezen
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#991b1b", marginTop: 2 }}>{afgewezen}</div>
          </div>
          <div style={statCardStyle}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#555", fontWeight: 700 }}>
              In behandeling
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#92400e", marginTop: 2 }}>{pending}</div>
          </div>
          {allResolved && (
            <div
              style={{
                ...statCardStyle,
                background: "linear-gradient(180deg, #dcfce7 0%, #bbf7d0 100%)",
                border: "2px solid #16a34a",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <CheckCircle size={22} color="#166534" />
              <div style={{ fontSize: 13, fontWeight: 800, color: "#166534" }}>
                Klaar voor<br />statusovergang
              </div>
            </div>
          )}
          {pending > 0 && (
            <div
              style={{
                ...statCardStyle,
                background: "linear-gradient(180deg, #fef9c3 0%, #fef08a 100%)",
                border: "2px solid #ca8a04",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <AlertTriangle size={22} color="#92400e" />
              <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e" }}>
                {pending} openstaand,<br />los op voor overgang
              </div>
            </div>
          )}
        </div>

        {/* Notices */}
        {notice && (
          <div
            style={{
              background: "linear-gradient(180deg, #dcfce7 0%, #bbf7d0 100%)",
              border: "1px solid #86efac",
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 12,
              color: "#166534",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ✅ {notice}
          </div>
        )}

        {error && (
          <div
            style={{
              background: "linear-gradient(180deg, #fee2e2 0%, #fecaca 100%)",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 12,
              color: "#991b1b",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Meldingen list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#6b7280" }}>Laden…</div>
        ) : meldingen.length === 0 ? (
          <div
            style={{
              ...cardStyle,
              textAlign: "center",
              padding: 40,
              color: "#6b7280",
              fontSize: 14,
            }}
          >
            Geen meldingen gevonden voor deze matchmaking.
          </div>
        ) : (
          meldingen.map((m) => {
            const { label, color, bg } = getMeldingStatus(m);
            const isBusy = busy === m.id;
            const isResolved =
              String(m.resultaat ?? "").toLowerCase() === "ok" ||
              String(m.review_status ?? "").toLowerCase() === "goedgekeurd";

            return (
              <div key={m.id} style={cardStyle}>
                {/* Card header */}
                <div style={cardHeader}>
                  <span
                    style={{
                      background: "rgba(255,255,255,0.12)",
                      borderRadius: 4,
                      padding: "2px 10px",
                      fontSize: 12,
                    }}
                  >
                    Partij {m.partij_nr ?? "?"}
                  </span>
                  {m.hoek && (
                    <span
                      style={{
                        background:
                          m.hoek === "rood"
                            ? "rgba(220,38,38,0.35)"
                            : "rgba(37,99,235,0.35)",
                        color: m.hoek === "rood" ? "#fca5a5" : "#93c5fd",
                        borderRadius: 4,
                        padding: "2px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: "capitalize",
                      }}
                    >
                      {m.hoek}
                    </span>
                  )}
                  {m.rule_code && (
                    <span
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        borderRadius: 4,
                        padding: "2px 10px",
                        fontSize: 11,
                        color: "rgba(255,255,255,0.65)",
                      }}
                    >
                      {m.rule_code}
                    </span>
                  )}
                  <span
                    style={{
                      marginLeft: "auto",
                      background: bg,
                      color,
                      border: `1px solid ${color}40`,
                      borderRadius: 4,
                      padding: "2px 10px",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {label}
                  </span>
                </div>

                {/* Card body */}
                <div style={{ padding: "16px 20px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 4 }}>
                        {safe(m.boodschap)}
                      </div>
                      {m.rule && (
                        <div style={{ fontSize: 12, color: "#555", marginBottom: 2 }}>
                          Regel: {m.rule}
                        </div>
                      )}
                      {m.aantekeningen && (
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                          <span style={{ fontWeight: 600 }}>Aantekening:</span> {m.aantekeningen}
                        </div>
                      )}
                    </div>

                    {/* Actions — only if not yet resolved */}
                    {!isResolved && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 230 }}>
                        <input
                          type="text"
                          placeholder="Reden / aantekening (optioneel)"
                          value={reden[m.id] ?? ""}
                          onChange={(e) =>
                            setReden((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                          style={{
                            border: "1px solid #d1d5db",
                            borderRadius: 6,
                            padding: "6px 10px",
                            fontSize: 12,
                            outline: "none",
                            color: "#111",
                            background: "#f9fafb",
                            width: "100%",
                            boxSizing: "border-box",
                          }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            disabled={isBusy}
                            onClick={() => void updateStatus(m.id, "akkoord")}
                            style={{
                              flex: 1,
                              background: isBusy
                                ? "#ccc"
                                : "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)",
                              border: "1px solid rgba(22,101,52,0.4)",
                              borderRadius: 6,
                              color: "#fff",
                              padding: "8px 0",
                              cursor: isBusy ? "not-allowed" : "pointer",
                              fontWeight: 700,
                              fontSize: 13,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              opacity: isBusy ? 0.7 : 1,
                            }}
                          >
                            <CheckCircle size={14} /> Akkoord
                          </button>
                          <button
                            disabled={isBusy}
                            onClick={() => void updateStatus(m.id, "afgewezen")}
                            style={{
                              flex: 1,
                              background: isBusy
                                ? "#ccc"
                                : "linear-gradient(180deg, #ef4444 0%, #dc2626 100%)",
                              border: "1px solid rgba(153,27,27,0.4)",
                              borderRadius: 6,
                              color: "#fff",
                              padding: "8px 0",
                              cursor: isBusy ? "not-allowed" : "pointer",
                              fontWeight: 700,
                              fontSize: 13,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              opacity: isBusy ? 0.7 : 1,
                            }}
                          >
                            <XCircle size={14} /> Afwijzen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
