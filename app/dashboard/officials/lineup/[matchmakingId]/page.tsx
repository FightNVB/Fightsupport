"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CheckCircle, FileText, RefreshCcw } from "lucide-react";

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

type Bout = {
  id: string;
  matchmaking_id: string;
  partij_nr: number;
  sort_order: number | null;
  discipline: string | null;
  klasse_mm: string | null;
  rood_naam: string | null;
  rood_va: string | null;
  rood_gym: string | null;
  blauw_naam: string | null;
  blauw_va: string | null;
  blauw_gym: string | null;
  rood_gewogen_gewicht: number | null;
  blauw_gewogen_gewicht: number | null;
  eindstatus: string;
  is_locked: boolean | null;
};

function safeText(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
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

// ─── Styles ─────────────────────────────────────────────────────────────────
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
};

const orangeBtn: CSSProperties = {
  ...headerBtn,
  background: `linear-gradient(180deg, #ff6a14 0%, ${NVB_ORANGE} 55%, #df3f00 100%)`,
  border: "1px solid rgba(150,40,0,0.55)",
};

const greenBtn: CSSProperties = {
  ...headerBtn,
  background: "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)",
  border: "1px solid rgba(21,128,61,0.55)",
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

const moveBtn: CSSProperties = {
  padding: "3px 7px",
  fontSize: 12,
  background: "rgba(0,0,0,0.08)",
  border: "1px solid rgba(0,0,0,0.15)",
  borderRadius: 3,
  cursor: "pointer",
  color: "#333",
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function LineupPage() {
  const params = useParams<{ matchmakingId?: string | string[] }>();
  const router = useRouter();

  const matchmakingId = useMemo(() => {
    const v = Array.isArray(params?.matchmakingId)
      ? params.matchmakingId[0]
      : params?.matchmakingId;
    return String(v ?? "").trim();
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [roleNames, setRoleNames] = useState<RoleName[]>([]);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [header, setHeader] = useState<{
    evenement_naam: string | null;
    bondteam: string | null;
  } | null>(null);

  const isHoofdofficialOrSuperadmin = useMemo(
    () =>
      roleNames.includes("hoofdofficial") ||
      roleNames.includes("superadmin") ||
      roleNames.includes("admin"),
    [roleNames]
  );

  const canEdit = useMemo(
    () =>
      roleNames.some((r) =>
        ["official", "hoofdofficial", "admin", "superadmin"].includes(r)
      ),
    [roleNames]
  );

  async function loadData() {
    if (!matchmakingId) return;
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

      if (
        !names.some((r) =>
          ["official", "hoofdofficial", "admin", "superadmin", "matchmaker"].includes(r)
        )
      ) {
        throw new Error("Je hebt geen toegang tot de lineup pagina.");
      }

      const { data: mm } = await supabase
        .from("matchmaking_uploads")
        .select("evenement_naam, bondteam")
        .eq("matchmaking_id", matchmakingId)
        .single();

      if (mm) setHeader({ evenement_naam: mm.evenement_naam ?? null, bondteam: mm.bondteam ?? null });

      const { data: boutsData, error: boutsErr } = await supabase
        .from("definitive_matchmaking_bouts")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .in("eindstatus", ["OK", "GOEDGEKEURD_MET_DISPENSATIE"])
        .order("sort_order", { ascending: true })
        .order("partij_nr", { ascending: true });

      if (boutsErr) throw new Error(boutsErr.message);
      setBouts(boutsData ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (matchmakingId) void loadData();
  }, [matchmakingId]);

  async function moveBout(boutId: string, direction: "up" | "down") {
    setBusy(true);
    try {
      const res = await authedFetch("/api/officials/reorder-definitive-lineup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: matchmakingId, bout_id: boutId, direction }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Verplaatsen mislukt");
      await loadData();
    } catch (e: any) {
      setError(e?.message ?? "Verplaatsen mislukt.");
    } finally {
      setBusy(false);
    }
  }

  async function autoSort() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await authedFetch("/api/officials/auto-sort-definitive-lineup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: matchmakingId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Automatisch sorteren mislukt");
      setNotice("Lineup automatisch gesorteerd.");
      await loadData();
    } catch (e: any) {
      setError(e?.message ?? "Sorteren mislukt.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmLineup() {
    if (!isHoofdofficialOrSuperadmin) {
      setError("Alleen hoofdofficial, admin of superadmin kan de lineup bevestigen.");
      return;
    }
    if (!confirm(`Weet je zeker dat je de lineup voor ${bouts.length} partijen wilt bevestigen? Dit markeert de matchmaking als klaar voor uitslagen.`)) return;

    setConfirming(true);
    setError(null);
    setNotice(null);

    try {
      const res = await authedFetch("/api/officials/lock-definitive-lineup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: matchmakingId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Bevestigen mislukt");
      setNotice("✅ Lineup bevestigd! Uitslagen pagina is nu beschikbaar.");
      await loadData();
    } catch (e: any) {
      setError(e?.message ?? "Bevestigen mislukt.");
    } finally {
      setConfirming(false);
    }
  }

  async function downloadPdf() {
    setExportingPdf(true);
    setError(null);
    setNotice(null);
    try {
      const res = await authedFetch("/api/officials/lineup/finalize-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: matchmakingId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? "PDF genereren mislukt");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lineup_${matchmakingId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice("✅ Lineup PDF gedownload.");
    } catch (e: any) {
      setError(e?.message ?? "PDF genereren mislukt.");
    } finally {
      setExportingPdf(false);
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
              Lineup
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
              {safeText(header?.evenement_naam)} · {safeText(header?.bondteam)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/dashboard/officials/weegstation" style={headerBtn}>
            ← Terug
          </Link>
          <button style={headerBtn} onClick={() => void loadData()}>
            <RefreshCcw size={12} style={{ marginRight: 4, display: "inline" }} />
            Ververs
          </button>
          {canEdit && (
            <button style={headerBtn} onClick={() => void autoSort()} disabled={busy}>
              Auto-sort
            </button>
          )}
          {isHoofdofficialOrSuperadmin && bouts.length > 0 && (
            <>
              <button
                style={greenBtn}
                onClick={() => void confirmLineup()}
                disabled={confirming || busy}
              >
                <CheckCircle size={12} style={{ marginRight: 4, display: "inline" }} />
                {confirming ? "Bezig…" : "Lineup bevestigen"}
              </button>
              <button
                style={orangeBtn}
                onClick={() => void downloadPdf()}
                disabled={exportingPdf || busy}
              >
                <FileText size={12} style={{ marginRight: 4, display: "inline" }} />
                {exportingPdf ? "Bezig…" : "PDF Download"}
              </button>
              <Link
                href={`/dashboard/officials/uitslagen/${encodeURIComponent(matchmakingId)}`}
                style={orangeBtn}
              >
                → Uitslagen invoeren
              </Link>
            </>
          )}
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
          <div style={{ textAlign: "center", padding: 48, color: "#6b7280" }}>
            Laden…
          </div>
        ) : bouts.length === 0 ? (
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
            Geen OK-partijen gevonden. Zorg dat de weegstation afgerond is (alle partijen status OK).
          </div>
        ) : (
          <div style={cardStyle}>
            <div style={cardHeader}>
              <span>Lineup — {bouts.length} partijen</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                Alleen partijen met status OK
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Nr.</th>
                    <th style={thStyle}>Discipline · Klasse</th>
                    <th style={{ ...thStyle, color: "#dc2626" }}>Rood</th>
                    <th style={{ ...thStyle, color: "#2563eb" }}>Blauw</th>
                    <th style={thStyle}>Status</th>
                    {canEdit && <th style={thStyle}>Volgorde</th>}
                  </tr>
                </thead>
                <tbody>
                  {bouts.map((bout, i) => (
                    <tr
                      key={bout.id}
                      style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 700, color: "#9ca3af" }}>
                        {i + 1}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>
                        {bout.partij_nr}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600 }}>
                          {safeText(bout.discipline)}
                        </span>
                        <span style={{ color: "#6b7280" }}>
                          {" "}· {safeText(bout.klasse_mm)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>
                          {safeText(bout.rood_naam)}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          {safeText(bout.rood_gym)}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>
                          {safeText(bout.blauw_naam)}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>
                          {safeText(bout.blauw_gym)}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            background:
                              bout.eindstatus === "OK"
                                ? "#dcfce7"
                                : "#fff7ed",
                            color:
                              bout.eindstatus === "OK"
                                ? "#166534"
                                : "#9a3412",
                          }}
                        >
                          {bout.eindstatus}
                        </span>
                      </td>
                      {canEdit && (
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              style={moveBtn}
                              disabled={busy || i === 0}
                              onClick={() => void moveBout(bout.id, "up")}
                              title="Omhoog"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              style={moveBtn}
                              disabled={busy || i === bouts.length - 1}
                              onClick={() => void moveBout(bout.id, "down")}
                              title="Omlaag"
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>
                        </td>
                      )}
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
