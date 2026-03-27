"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Download, RefreshCcw, Save } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";

const NVB_ORANGE = "#ff4d00";
const FS_LINE_LIGHT = "rgba(0,0,0,0.12)";

// Vaste uitslag opties – altijd vanuit rood perspectief
const UITSLAG_OPTIONS = [
  "Wint op punten",
  "Verliest op punten",
  "Onbeslist",
  "Wint op KO",
  "Verliest op KO",
  "Wint op Technisch KO",
  "Verliest op Technisch KO",
  "Wint d.m.v. medische interventie",
  "Verliest d.m.v. medische interventie",
  "Wint d.m.v. opgave",
  "Verliest d.m.v. opgave",
  "No contest",
  "Wint d.m.v. submission",
  "Verliest d.m.v. submission",
  "Wint d.m.v. diskwalificatie",
  "Verliest d.m.v. diskwalificatie",
  "Wint d.m.v. RSC",
  "Verliest d.m.v. RSC",
  "Demo",
];

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
  sort_order: number | null;
};

function safeText(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
}

function fmtKg(v: number | null | undefined): string {
  if (v == null) return "-";
  return `${Number(v).toFixed(1)} kg`;
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

// ─── Styles ────────────────────────────────────────────────────────────────────
const pageWrap: CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f0f0f0 0%, #e2e2e2 100%)",
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
};

const innerWrap: CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "0 16px 48px",
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
  borderBottom: "2px solid rgba(255,77,0,0.50)",
  padding: "10px 16px",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: CSSProperties = {
  padding: "8px 10px",
  textAlign: "left",
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

const selectStyle: CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  fontSize: 12,
  border: "1px solid #d1d5db",
  borderRadius: 4,
  background: "#fff",
  color: "#111",
};

const saveBtnSmall: CSSProperties = {
  padding: "5px 12px",
  fontSize: 12,
  fontWeight: 700,
  color: "#fff",
  background: NVB_ORANGE,
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function UitslagenInvoerPage() {
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
  const [uitslagen, setUitslagen] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const [header, setHeader] = useState<{
    evenement_naam: string | null;
    evenement_datum: string | null;
    bondteam: string | null;
  } | null>(null);

  const isHoofdofficialOrSuperadmin = useMemo(
    () => roleNames.includes("hoofdofficial") || roleNames.includes("superadmin") || roleNames.includes("admin"),
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

      // Load roles
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
          ["hoofdofficial", "admin", "superadmin"].includes(r)
        )
      ) {
        throw new Error("Alleen hoofdofficial, admin of superadmin kan uitslagen invoeren.");
      }

      // Load matchmaking header
      const { data: mm } = await supabase
        .from("matchmaking_uploads")
        .select("evenement_naam, evenement_datum, bondteam")
        .eq("matchmaking_id", matchmakingId)
        .single();

      if (mm) {
        setHeader({
          evenement_naam: mm.evenement_naam ?? null,
          evenement_datum: mm.evenement_datum ?? null,
          bondteam: mm.bondteam ?? null,
        });
      }

      // Load bouts (only OK or GOEDGEKEURD_MET_DISPENSATIE)
      const { data: boutsData, error: boutsErr } = await supabase
        .from("definitive_matchmaking_bouts")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .in("eindstatus", ["OK", "GOEDGEKEURD_MET_DISPENSATIE"])
        .order("sort_order", { ascending: true })
        .order("partij_nr", { ascending: true });

      if (boutsErr) throw new Error(boutsErr.message);
      setBouts(boutsData ?? []);

      // Load existing uitslagen
      const { data: uitslData } = await supabase
        .from("uitslagen_officieel")
        .select("partij_nr, uitslag")
        .eq("matchmaking_id", matchmakingId);

      const map: Record<number, string> = {};
      for (const u of uitslData ?? []) {
        if (u.partij_nr != null) map[Number(u.partij_nr)] = String(u.uitslag ?? "");
      }
      setUitslagen(map);
    } catch (e: any) {
      setError(e?.message ?? "Laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (matchmakingId) void loadData();
  }, [matchmakingId]);

  async function saveUitslag(partijNr: number, uitslag: string) {
    if (!uitslag) return;
    setSaving(partijNr);
    setError(null);
    setNotice(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Niet ingelogd.");

      const { error: upsertErr } = await supabase
        .from("uitslagen_officieel")
        .upsert(
          {
            matchmaking_id: matchmakingId,
            partij_nr: partijNr,
            uitslag,
            ingevoerd_door: user.id,
            ingevoerd_op: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "matchmaking_id,partij_nr" }
        );

      if (upsertErr) throw new Error(upsertErr.message);

      setUitslagen((prev) => ({ ...prev, [partijNr]: uitslag }));
      setNotice(`Partij ${partijNr} opgeslagen.`);
    } catch (e: any) {
      setError(e?.message ?? "Opslaan mislukt.");
    } finally {
      setSaving(null);
    }
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    setNotice(null);

    try {
      const res = await authedFetch("/api/officials/uitslagen/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: matchmakingId }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? "Export mislukt");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `uitslagen_${matchmakingId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice("Export succesvol gedownload.");
    } catch (e: any) {
      setError(e?.message ?? "Export mislukt.");
    } finally {
      setExporting(false);
    }
  }

  const allFilled = bouts.length > 0 && bouts.every((b) => !!uitslagen[b.partij_nr]);
  const filledCount = bouts.filter((b) => !!uitslagen[b.partij_nr]).length;

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
              Uitslagen Invoer
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
              {safeText(header?.evenement_naam)} ·{" "}
              {safeText(header?.bondteam)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link
            href="/dashboard/officials/weegstation"
            style={headerBtn}
          >
            ← Terug
          </Link>
          <button style={headerBtn} onClick={() => void loadData()}>
            <RefreshCcw size={12} style={{ marginRight: 4, display: "inline" }} />
            Ververs
          </button>
          {isHoofdofficialOrSuperadmin && (
            <button
              style={{
                ...orangeBtn,
                opacity: (!allFilled || exporting) ? 0.55 : 1,
                cursor: (!allFilled || exporting) ? "not-allowed" : "pointer",
              }}
              onClick={() => void handleExport()}
              disabled={!allFilled || exporting}
              title={!allFilled ? "Vul alle uitslagen in voor export" : ""}
            >
              <Download size={12} style={{ marginRight: 4, display: "inline" }} />
              {exporting ? "Bezig..." : "Export FightPassport (.xlsx)"}
            </button>
          )}
        </div>
      </div>

      <div style={innerWrap}>
        <div style={{ paddingTop: 24 }}>
          {/* Status bar */}
          <div
            style={{
              background: allFilled ? "#f0fdf4" : "#fffbeb",
              border: `1px solid ${allFilled ? "#86efac" : "#fcd34d"}`,
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 600,
              color: allFilled ? "#166534" : "#92400e",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {allFilled
              ? `✅ Alle ${bouts.length} uitslagen ingevuld – klaar voor export`
              : `⚠️ ${filledCount} van ${bouts.length} uitslagen ingevuld`}
          </div>

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
          ) : !isHoofdofficialOrSuperadmin ? (
            <div
              style={{
                background: "#fef2f2",
                borderRadius: 10,
                padding: 24,
                textAlign: "center",
                color: "#991b1b",
              }}
            >
              Alleen hoofdofficial, admin of superadmin kan uitslagen invoeren.
            </div>
          ) : bouts.length === 0 ? (
            <div
              style={{
                background: "#fff",
                borderRadius: 10,
                padding: 32,
                textAlign: "center",
                color: "#6b7280",
              }}
            >
              Geen OK-partijen gevonden. Zorg dat de weegstation afgerond is en de lineup is bevestigd.
            </div>
          ) : (
            <div style={cardStyle}>
              <div style={cardHeader}>
                Partijen — {safeText(header?.evenement_naam)} ({bouts.length} partijen)
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Nr.</th>
                      <th style={thStyle}>Discipline</th>
                      <th style={thStyle}>Klasse</th>
                      <th style={{ ...thStyle, color: "#dc2626" }}>Rood</th>
                      <th style={{ ...thStyle, color: "#2563eb" }}>Blauw</th>
                      <th style={thStyle}>Uitslag (rood perspectief)</th>
                      <th style={thStyle}>Actie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bouts.map((bout, i) => {
                      const currentUitslag = uitslagen[bout.partij_nr] ?? "";
                      const isFilled = !!currentUitslag;

                      return (
                        <tr
                          key={bout.id}
                          style={{
                            background: i % 2 === 0 ? "#fff" : "#fafafa",
                            outline: isFilled
                              ? "none"
                              : "1px solid rgba(234,179,8,0.3)",
                          }}
                        >
                          <td style={{ ...tdStyle, fontWeight: 700 }}>
                            {bout.partij_nr}
                          </td>
                          <td style={tdStyle}>
                            {safeText(bout.discipline)}
                          </td>
                          <td style={tdStyle}>
                            {safeText(bout.klasse_mm)}
                          </td>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 600 }}>
                              {safeText(bout.rood_naam)}
                            </div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>
                              {safeText(bout.rood_gym)} · VA {safeText(bout.rood_va)}
                            </div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>
                              {fmtKg(bout.rood_gewogen_gewicht)}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 600 }}>
                              {safeText(bout.blauw_naam)}
                            </div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>
                              {safeText(bout.blauw_gym)} · VA {safeText(bout.blauw_va)}
                            </div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>
                              {fmtKg(bout.blauw_gewogen_gewicht)}
                            </div>
                          </td>
                          <td style={{ ...tdStyle, minWidth: 280 }}>
                            <select
                              style={{
                                ...selectStyle,
                                borderColor: isFilled ? "#86efac" : "#fcd34d",
                                background: isFilled ? "#f0fdf4" : "#fffbeb",
                              }}
                              value={currentUitslag}
                              onChange={(e) => {
                                const val = e.target.value;
                                setUitslagen((prev) => ({
                                  ...prev,
                                  [bout.partij_nr]: val,
                                }));
                              }}
                            >
                              <option value="">— kies uitslag —</option>
                              {UITSLAG_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={tdStyle}>
                            <button
                              style={{
                                ...saveBtnSmall,
                                opacity:
                                  saving === bout.partij_nr || !currentUitslag
                                    ? 0.5
                                    : 1,
                                cursor:
                                  saving === bout.partij_nr || !currentUitslag
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                              disabled={saving === bout.partij_nr || !currentUitslag}
                              onClick={() =>
                                void saveUitslag(bout.partij_nr, currentUitslag)
                              }
                            >
                              <Save size={11} style={{ marginRight: 4, display: "inline" }} />
                              {saving === bout.partij_nr ? "…" : "Opslaan"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Export section */}
          {!loading && bouts.length > 0 && isHoofdofficialOrSuperadmin && (
            <div
              style={{
                background: "#fff",
                borderRadius: 10,
                border: "2px solid #2b2b2b",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  Export naar FightPassport
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  Download Excel in het vaste FightPassport format (altijd vanuit rood perspectief).{" "}
                  {!allFilled && (
                    <span style={{ color: "#b45309", fontWeight: 600 }}>
                      Vul alle {bouts.length - filledCount} nog ontbrekende uitslag(en) in voor de export beschikbaar is.
                    </span>
                  )}
                </div>
              </div>
              <button
                style={{
                  ...orangeBtn,
                  padding: "10px 20px",
                  fontSize: 13,
                  opacity: (!allFilled || exporting) ? 0.55 : 1,
                  cursor: (!allFilled || exporting) ? "not-allowed" : "pointer",
                }}
                disabled={!allFilled || exporting}
                onClick={() => void handleExport()}
              >
                <Download size={14} style={{ marginRight: 6, display: "inline" }} />
                {exporting ? "Bezig met exporteren…" : "Download Excel"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
