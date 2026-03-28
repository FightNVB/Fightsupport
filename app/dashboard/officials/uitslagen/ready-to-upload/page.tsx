"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, RefreshCcw } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";

const NVB_ORANGE = "#ff4d00";

type RoleName =
  | "superadmin"
  | "admin"
  | "promotor"
  | "matchmaker"
  | "official"
  | "hoofdofficial"
  | "dispensatie_admin";

type ReadyItem = {
  matchmaking_id: string;
  event_naam: string | null;
  datum: string | null;
  bondteam: string | null;
  partijen_count?: number;
  status?: string;
};

function safeText(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
}

function formatDate(v: string | null): string {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function normalizeRoleName(name: any): RoleName | null {
  const s = String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const valid: RoleName[] = [
    "superadmin", "admin", "promotor", "matchmaker",
    "official", "hoofdofficial", "dispensatie_admin",
  ];
  return valid.includes(s as RoleName) ? (s as RoleName) : null;
}

const ALLOWED_ROLES: RoleName[] = ["hoofdofficial", "admin", "superadmin", "dispensatie_admin"];

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
  textDecoration: "none",
  display: "inline-block",
};

const orangeBtn: CSSProperties = {
  ...headerBtn,
  background: `linear-gradient(180deg, #ff6a14 0%, ${NVB_ORANGE} 55%, #df3f00 100%)`,
  border: "1px solid rgba(150,40,0,0.55)",
};

const innerWrap: CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "24px 16px 48px",
};

const cardStyle: CSSProperties = {
  background: "#fff",
  borderRadius: 10,
  border: "2px solid #2b2b2b",
  boxShadow: "0 12px 26px rgba(0,0,0,0.10)",
  overflow: "hidden",
};

const cardHeader: CSSProperties = {
  background: "linear-gradient(180deg, #2a2a2e 0%, #1f1f23 100%)",
  borderBottom: "2px solid rgba(255,77,0,0.50)",
  padding: "10px 16px",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: CSSProperties = {
  padding: "8px 10px",
  textAlign: "left" as const,
  fontWeight: 700,
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  background: "#f5f5f5",
  borderBottom: "1px solid #e0e0e0",
};

const tdStyle: CSSProperties = {
  padding: "8px 10px",
  verticalAlign: "middle",
  borderBottom: "1px solid #f0f0f0",
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function ReadyToUploadPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [roleNames, setRoleNames] = useState<RoleName[]>([]);
  const [items, setItems] = useState<ReadyItem[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  const canAccess = useMemo(
    () => roleNames.some((r) => ALLOWED_ROLES.includes(r as RoleName)),
    [roleNames]
  );

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Niet ingelogd.");

      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", user.id);

      const roleIds = (userRoles ?? []).map((r: any) => r.role_id).filter(Boolean);
      let names: RoleName[] = [];
      if (roleIds.length > 0) {
        const { data: rolesRows } = await supabase
          .from("roles")
          .select("id, name")
          .in("id", roleIds);
        names = (rolesRows ?? [])
          .map((r: any) => normalizeRoleName(r?.name))
          .filter(Boolean) as RoleName[];
      }
      setRoleNames(names);

      if (!names.some((r) => ALLOWED_ROLES.includes(r as RoleName))) {
        throw new Error("Alleen hoofdofficial, admin of superadmin kan deze pagina bekijken.");
      }

      const res = await authedFetch("/api/admin/uitslagen/ready-to-upload");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Laden mislukt");

      setItems((json.items ?? []) as ReadyItem[]);
    } catch (e: any) {
      setError(e?.message ?? "Laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleDownload(matchmakingId: string, eventNaam: string | null) {
    setDownloading(matchmakingId);
    setError(null);
    setNotice(null);

    try {
      const res = await authedFetch(
        `/api/admin/uitslagen/export?matchmaking_id=${encodeURIComponent(matchmakingId)}`
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? "Download mislukt");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.download = `uitslagen_${matchmakingId}_${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice(`✅ Excel gedownload voor: ${safeText(eventNaam)}`);
    } catch (e: any) {
      setError(e?.message ?? "Download mislukt.");
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
              Uitslagen — Klaar voor Upload
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
              Excel downloaden voor FightPassport
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/dashboard/officials" style={headerBtn}>
            ← Terug
          </Link>
          <button style={headerBtn} onClick={() => void loadData()} disabled={loading}>
            <RefreshCcw size={12} style={{ marginRight: 4, display: "inline" }} />
            Ververs
          </button>
        </div>
      </div>

      <div style={innerWrap}>
        {notice && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: 8,
              padding: "8px 14px",
              marginBottom: 12,
              color: "#166534",
              fontSize: 13,
            }}
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              padding: "8px 14px",
              marginBottom: 12,
              color: "#991b1b",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#6b7280" }}>Laden…</div>
        ) : !canAccess ? (
          <div
            style={{
              background: "#fef2f2",
              borderRadius: 10,
              padding: 32,
              textAlign: "center",
              color: "#991b1b",
              border: "2px solid #fca5a5",
            }}
          >
            Je hebt geen toegang tot deze pagina.
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: 32,
              textAlign: "center",
              color: "#6b7280",
              border: "2px solid #2b2b2b",
            }}
          >
            Geen matchmakings klaar voor upload. Zorg dat alle uitslagen zijn ingevoerd.
          </div>
        ) : (
          <div style={cardStyle}>
            <div style={cardHeader}>
              <span>
                Klaar voor FightPassport Upload — {items.length}{" "}
                {items.length === 1 ? "matchmaking" : "matchmakings"}
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 400 }}>
                Alle uitslagen ingevuld · Excel downloaden
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Event</th>
                    <th style={thStyle}>Datum</th>
                    <th style={thStyle}>Bondteam</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: "right" as const }}>Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.matchmaking_id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        {safeText(item.event_naam)}
                      </td>
                      <td style={tdStyle}>{formatDate(item.datum)}</td>
                      <td style={tdStyle}>{safeText(item.bondteam)}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background: "#dcfce7",
                            color: "#166534",
                          }}
                        >
                          ✓ Klaar
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" as const }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <Link
                            href={`/dashboard/officials/uitslagen/${encodeURIComponent(item.matchmaking_id)}`}
                            style={headerBtn}
                          >
                            Bekijken
                          </Link>
                          <button
                            style={orangeBtn}
                            disabled={downloading === item.matchmaking_id}
                            onClick={() => void handleDownload(item.matchmaking_id, item.event_naam)}
                          >
                            <Download
                              size={12}
                              style={{ marginRight: 4, display: "inline" }}
                            />
                            {downloading === item.matchmaking_id ? "Bezig…" : "Excel Download"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
