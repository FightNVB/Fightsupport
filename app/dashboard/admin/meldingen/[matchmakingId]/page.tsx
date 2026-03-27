"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

function statusLabel(row: MeldingRow): { label: string; color: string } {
  const res = String(row.resultaat ?? "").toLowerCase();
  const rev = String(row.review_status ?? "").toLowerCase();
  if (res === "ok" || rev === "goedgekeurd") return { label: "Akkoord", color: "#16a34a" };
  if (res === "afgekeurd" || rev === "afgekeurd") return { label: "Afgewezen", color: "#dc2626" };
  return { label: "In behandeling", color: "#d97706" };
}

function safe(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

const cardStyle: CSSProperties = {
  background: "#1a1a2e",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  padding: "20px 24px",
  marginBottom: 16,
};

export default function AdminMeldingenPage() {
  const { matchmakingId } = useParams<{ matchmakingId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [meldingen, setMeldingen] = useState<MeldingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reden, setReden] = useState<Record<string, string>>({});

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
    if (matchmakingId) loadMeldingen();
  }, [matchmakingId]);

  async function updateStatus(meldingId: string, new_status: string) {
    setBusy(meldingId);
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
      await loadMeldingen();
    } catch (e: any) {
      alert(e?.message ?? "Onbekende fout.");
    } finally {
      setBusy(null);
    }
  }

  const total = meldingen.length;
  const akkoord = meldingen.filter(
    (m) => String(m.resultaat).toLowerCase() === "ok" || String(m.review_status).toLowerCase() === "goedgekeurd"
  ).length;
  const pending = total - akkoord;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f0f23 100%)",
        color: "#ffffff",
        fontFamily: "'Inter', sans-serif",
        padding: "32px 24px",
      }}
    >
      {/* Header */}
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <Image src="/nvb-logo.png" alt="NVB" width={44} height={44} style={{ borderRadius: 8 }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: NVB_ORANGE }}>
              Meldingen Controle
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
              {matchmakingId}
            </p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            <button
              onClick={loadMeldingen}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                color: "#fff",
                padding: "8px 14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
              }}
            >
              <RefreshCcw size={14} /> Vernieuwen
            </button>
            <Link
              href="/dashboard/admin/controle"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                color: "#fff",
                padding: "8px 14px",
                textDecoration: "none",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <ArrowLeft size={14} /> Terug
            </Link>
          </div>
        </div>

        {/* Summary bar */}
        <div
          style={{
            ...cardStyle,
            display: "flex",
            gap: 32,
            marginBottom: 24,
            background: "rgba(255,77,0,0.08)",
            borderColor: "rgba(255,77,0,0.25)",
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>Totaal meldingen</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{total}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>Akkoord</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#16a34a" }}>{akkoord}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>In behandeling</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#d97706" }}>{pending}</div>
          </div>
          {pending === 0 && total > 0 && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, color: "#16a34a" }}>
              <CheckCircle size={20} />
              <span style={{ fontWeight: 600 }}>Klaar voor statusovergang</span>
            </div>
          )}
          {pending > 0 && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, color: "#d97706" }}>
              <AlertTriangle size={20} />
              <span style={{ fontWeight: 600 }}>Los alle meldingen op</span>
            </div>
          )}
        </div>

        {error && (
          <div style={{ ...cardStyle, background: "rgba(220,38,38,0.1)", borderColor: "rgba(220,38,38,0.3)", color: "#fca5a5" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.55)", padding: 48 }}>
            Laden…
          </div>
        ) : meldingen.length === 0 ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.55)", padding: 48 }}>
            Geen meldingen gevonden voor deze matchmaking.
          </div>
        ) : (
          meldingen.map((m) => {
            const { label, color } = statusLabel(m);
            const isBusy = busy === m.id;
            return (
              <div key={m.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 6 }}>
                      <span
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          borderRadius: 6,
                          padding: "2px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Partij {m.partij_nr ?? "?"}
                      </span>
                      {m.hoek && (
                        <span
                          style={{
                            background: m.hoek === "rood" ? "rgba(220,38,38,0.2)" : "rgba(37,99,235,0.2)",
                            color: m.hoek === "rood" ? "#fca5a5" : "#93c5fd",
                            borderRadius: 6,
                            padding: "2px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: "capitalize",
                          }}
                        >
                          {m.hoek}
                        </span>
                      )}
                      <span
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          borderRadius: 6,
                          padding: "2px 10px",
                          fontSize: 11,
                          color: "rgba(255,255,255,0.55)",
                        }}
                      >
                        {safe(m.rule_code)}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color,
                        }}
                      >
                        {label}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, marginBottom: 4 }}>{safe(m.boodschap)}</div>
                    {m.aantekeningen && (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                        Aantekening: {m.aantekeningen}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {String(m.resultaat ?? "").toLowerCase() !== "ok" &&
                    String(m.review_status ?? "").toLowerCase() !== "goedgekeurd" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
                        <input
                          type="text"
                          placeholder="Reden / aantekening (optioneel)"
                          value={reden[m.id] ?? ""}
                          onChange={(e) =>
                            setReden((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 6,
                            color: "#fff",
                            padding: "6px 10px",
                            fontSize: 12,
                            outline: "none",
                          }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            disabled={isBusy}
                            onClick={() => updateStatus(m.id, "akkoord")}
                            style={{
                              flex: 1,
                              background: "#16a34a",
                              border: "none",
                              borderRadius: 6,
                              color: "#fff",
                              padding: "7px 0",
                              cursor: isBusy ? "not-allowed" : "pointer",
                              fontWeight: 600,
                              fontSize: 13,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              opacity: isBusy ? 0.6 : 1,
                            }}
                          >
                            <CheckCircle size={14} /> Akkoord
                          </button>
                          <button
                            disabled={isBusy}
                            onClick={() => updateStatus(m.id, "afgewezen")}
                            style={{
                              flex: 1,
                              background: "#dc2626",
                              border: "none",
                              borderRadius: 6,
                              color: "#fff",
                              padding: "7px 0",
                              cursor: isBusy ? "not-allowed" : "pointer",
                              fontWeight: 600,
                              fontSize: 13,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              opacity: isBusy ? 0.6 : 1,
                            }}
                          >
                            <XCircle size={14} /> Afwijzen
                          </button>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
