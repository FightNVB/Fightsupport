"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, RefreshCcw, ArrowLeft, FileSpreadsheet } from "lucide-react";
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

const innerWrap: CSSProperties = {
  maxWidth: 960,
  margin: "0 auto",
  padding: "24px 16px 48px",
};

const cardStyle: CSSProperties = {
  background: "#fff",
  borderRadius: 10,
  border: "2px solid #2b2b2b",
  boxShadow: "0 12px 26px rgba(0,0,0,0.10)",
  marginBottom: 14,
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
  gap: 8,
};

const statCardStyle: CSSProperties = {
  background: "linear-gradient(180deg, #f4f4f4 0%, #dfdfdf 100%)",
  border: "2px solid #3f3f3f",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), 0 10px 28px rgba(0,0,0,0.18)",
  borderRadius: 12,
  padding: "14px 20px",
  minWidth: 120,
};

const orangeDownloadBtn: CSSProperties = {
  background: `linear-gradient(180deg, #ff6a14 0%, ${NVB_ORANGE} 55%, #df3f00 100%)`,
  border: "1px solid rgba(150,40,0,0.55)",
  borderRadius: 6,
  color: "#fff",
  padding: "10px 20px",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 13,
  display: "flex",
  alignItems: "center",
  gap: 8,
  whiteSpace: "nowrap" as const,
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
    void load();
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
              Uitslagen — Klaar voor Download
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
              Matchmakings met alle uitslagen ingevuld
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/dashboard/admin" style={headerBtn}>
            <ArrowLeft size={12} /> Terug
          </Link>
          <button style={headerBtn} onClick={() => void load()}>
            <RefreshCcw size={12} /> Ververs
          </button>
        </div>
      </div>

      <div style={innerWrap}>
        {/* Stat cards */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={statCardStyle}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#555", fontWeight: 700 }}>
              Klaar voor download
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#111", marginTop: 2 }}>
              {loading ? "…" : items.length}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "linear-gradient(180deg, #fee2e2 0%, #fecaca 100%)",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 16,
              color: "#991b1b",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 64, color: "#6b7280" }}>Laden…</div>
        ) : items.length === 0 ? (
          <div
            style={{
              ...cardStyle,
              textAlign: "center",
              padding: 48,
              color: "#6b7280",
              fontSize: 14,
            }}
          >
            Geen matchmakings klaar voor download.
          </div>
        ) : (
          items.map((item) => {
            const isBusy = downloading === item.matchmaking_id;
            return (
              <div key={item.matchmaking_id} style={cardStyle}>
                {/* Card header */}
                <div style={cardHeader}>
                  <FileSpreadsheet size={16} color={NVB_ORANGE} />
                  <span>{safe(item.event_naam)}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "rgba(22,163,74,0.25)",
                      color: "#166534",
                      border: "1px solid rgba(22,163,74,0.4)",
                      borderRadius: 4,
                      padding: "2px 10px",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    LINEUP ✓
                  </span>
                </div>

                {/* Card body */}
                <div
                  style={{
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: "#555", display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <span>📅 {formatDate(item.datum)}</span>
                      {item.bondteam && <span>🏛️ {item.bondteam}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                      {item.matchmaking_id}
                    </div>
                  </div>

                  <button
                    disabled={isBusy}
                    onClick={() => void downloadExcel(item.matchmaking_id)}
                    style={{
                      ...orangeDownloadBtn,
                      opacity: isBusy ? 0.55 : 1,
                      cursor: isBusy ? "not-allowed" : "pointer",
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
