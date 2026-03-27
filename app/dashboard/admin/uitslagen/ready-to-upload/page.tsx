"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, RefreshCcw, ArrowLeft } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

const NVB_ORANGE = "#ff4d00";

type ReadyMatchmaking = {
  matchmaking_id: string;
  status: string;
  event_naam: string | null;
  datum: string | null;
  bondteam: string | null;
};

function safe(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function formatDate(d: string | null) {
  if (!d) return "-";
  try {
    const dt = new Date(d.length === 10 ? `${d}T00:00:00` : d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("nl-NL");
  } catch {
    return d;
  }
}

const cardStyle: CSSProperties = {
  background: "#1a1a2e",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  padding: "20px 24px",
  marginBottom: 14,
};

export default function ReadyToUploadPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReadyMatchmaking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch("/api/admin/uitslagen/ready-to-upload");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fout bij laden.");
      setItems(json.items ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Onbekende fout.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function downloadExcel(matchmakingId: string) {
    setDownloading(matchmakingId);
    try {
      const res = await authedFetch(
        `/api/admin/uitslagen/export?matchmaking_id=${matchmakingId}`
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Download mislukt.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `uitslagen-${matchmakingId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message ?? "Onbekende fout bij downloaden.");
    } finally {
      setDownloading(null);
    }
  }

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
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <Image src="/nvb-logo.png" alt="NVB" width={44} height={44} style={{ borderRadius: 8 }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: NVB_ORANGE }}>
              Uitslagen — Klaar voor download
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
              Overzicht van matchmakings waarvan alle uitslagen zijn ingevoerd
            </p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            <button
              onClick={load}
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
              href="/dashboard/admin"
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

        {error && (
          <div
            style={{
              ...cardStyle,
              background: "rgba(220,38,38,0.1)",
              borderColor: "rgba(220,38,38,0.3)",
              color: "#fca5a5",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.55)", padding: 64 }}>
            Laden…
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              ...cardStyle,
              textAlign: "center",
              color: "rgba(255,255,255,0.55)",
              padding: 48,
            }}
          >
            Geen matchmakings klaar voor download.
          </div>
        ) : (
          items.map((item) => {
            const isBusy = downloading === item.matchmaking_id;
            return (
              <div key={item.matchmaking_id} style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}
                    >
                      {safe(item.event_naam)}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.55)",
                        display: "flex",
                        gap: 16,
                      }}
                    >
                      <span>📅 {formatDate(item.datum)}</span>
                      {item.bondteam && <span>🏛️ {item.bondteam}</span>}
                      <span
                        style={{
                          background: "rgba(22,163,74,0.15)",
                          color: "#4ade80",
                          borderRadius: 6,
                          padding: "1px 8px",
                          fontWeight: 600,
                          fontSize: 11,
                        }}
                      >
                        LINEUP ✓
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.35)",
                        marginTop: 4,
                      }}
                    >
                      {item.matchmaking_id}
                    </div>
                  </div>

                  <button
                    disabled={isBusy}
                    onClick={() => downloadExcel(item.matchmaking_id)}
                    style={{
                      background: isBusy ? "rgba(255,77,0,0.4)" : NVB_ORANGE,
                      border: "none",
                      borderRadius: 8,
                      color: "#fff",
                      padding: "10px 20px",
                      cursor: isBusy ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Download size={15} />
                    {isBusy ? "Downloaden…" : "Download Excel"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
