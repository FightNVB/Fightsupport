"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  History,
  Search,
  RefreshCcw,
  ArrowLeft,
  ShieldCheck,
  ClipboardList,
  Database,
} from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

const ORANGE = "#ff4d00";

type AuditRow = {
  id: string;
  created_at: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  matchmaking_id: string | null;
  partij_nr: number | null;
  old_value: any;
  new_value: any;
  meta: any;
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("nl-NL");
}

const pageBackground: CSSProperties = {
  minHeight: "100vh",
  color: "#fff",
  background: `
    radial-gradient(circle at 50% 0%, rgba(255,104,20,0.11) 0%, rgba(255,104,20,0.03) 10%, rgba(0,0,0,0) 22%),
    radial-gradient(circle at 50% 100%, rgba(255,104,20,0.09) 0%, rgba(255,104,20,0.02) 12%, rgba(0,0,0,0) 24%),
    radial-gradient(circle at 16% 20%, rgba(255,120,20,0.06) 0%, rgba(255,120,20,0) 16%),
    radial-gradient(circle at 84% 22%, rgba(255,120,20,0.06) 0%, rgba(255,120,20,0) 16%),
    linear-gradient(180deg, #030405 0%, #06080b 18%, #010203 100%)
  `,
};

const sectionRule = (top = false): CSSProperties => ({
  position: "relative",
  borderTop: top ? "1px solid rgba(255,255,255,0.05)" : undefined,
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.04),
    inset 0 -1px 0 rgba(0,0,0,0.82)
  `,
});

const steelFrameOuter: CSSProperties = {
  position: "relative",
  padding: 8,
  background: `
    linear-gradient(145deg,
      #ffffff 0%,
      #cfcfcf 6%,
      #6a6a6a 12%,
      #fafafa 19%,
      #8d8d8d 27%,
      #3f3f3f 36%,
      #ededed 47%,
      #9f9f9f 58%,
      #4b4b4b 69%,
      #ffffff 80%,
      #b8b8b8 90%,
      #f7f7f7 100%)
  `,
  border: "1px solid rgba(255,255,255,0.60)",
  boxShadow: `
    0 12px 22px rgba(0,0,0,0.60),
    inset 0 2px 1px rgba(255,255,255,0.96),
    inset 0 -2px 2px rgba(0,0,0,0.82),
    inset 2px 0 2px rgba(255,255,255,0.44),
    inset -2px 0 2px rgba(0,0,0,0.54)
  `,
};

const steelFrameMid: CSSProperties = {
  position: "relative",
  padding: 3,
  background: `
    linear-gradient(135deg,
      rgba(255,255,255,0.95) 0%,
      rgba(216,216,216,0.95) 14%,
      rgba(64,64,64,0.96) 28%,
      rgba(248,248,248,0.94) 48%,
      rgba(98,98,98,0.96) 68%,
      rgba(236,236,236,0.96) 100%)
  `,
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.78),
    inset 0 -1px 0 rgba(0,0,0,0.58)
  `,
};

const steelFrameChannel: CSSProperties = {
  position: "relative",
  padding: 4,
  background: `
    linear-gradient(180deg,
      #2a2a2a 0%,
      #080808 18%,
      #505050 34%,
      #0c0c0c 52%,
      #424242 72%,
      #090909 100%)
  `,
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.16),
    inset 0 -1px 0 rgba(0,0,0,0.84)
  `,
};

const steelFrameInner: CSSProperties = {
  position: "relative",
  padding: 2,
  background: `
    linear-gradient(135deg,
      #fbfbfb 0%,
      #d2d2d2 10%,
      #6f6f6f 22%,
      #f3f3f3 34%,
      #b4b4b4 46%,
      #545454 60%,
      #fafafa 78%,
      #b2b2b2 100%)
  `,
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow: `
    inset 0 1px 0 rgba(255,255,255,0.66),
    inset 0 -1px 0 rgba(0,0,0,0.50)
  `,
};

const darkPlate: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  border: "1px solid #080808",
  background: `
    radial-gradient(circle at 14% 84%, rgba(255,110,0,0.09), transparent 16%),
    radial-gradient(circle at 86% 14%, rgba(255,255,255,0.05), transparent 14%),
    linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.012) 15%, rgba(0,0,0,0.16) 100%),
    linear-gradient(135deg, #1a1d22 0%, #070a0f 46%, #15181d 100%)
  `,
  boxShadow: `
    inset 0 2px 4px rgba(0,0,0,0.92),
    inset 0 -2px 6px rgba(255,255,255,0.05),
    inset 0 0 30px rgba(255,120,0,0.05)
  `,
};

export default function AdminAuditPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [matchmakingId, setMatchmakingId] = useState("");
  const [actor, setActor] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (action.trim()) params.set("action", action.trim());
      if (matchmakingId.trim()) params.set("matchmaking_id", matchmakingId.trim());
      if (actor.trim()) params.set("actor", actor.trim());
      params.set("limit", "150");

      const res = await authedFetch(`/api/admin/beheer/audit?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Kon audit log niet laden.");
      }

      setItems(Array.isArray(json?.items) ? json.items : []);
    } catch (err: any) {
      setError(err?.message || "Onbekende fout.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    return {
      totaal: items.length,
      snapshots: items.filter((x) => x.action === "snapshot_created").length,
      entityTypes: new Set(items.map((x) => x.entity_type || "").filter(Boolean)).size,
    };
  }, [items]);

  return (
    <main style={pageBackground}>
      <style jsx>{`
        @keyframes fsPulseGlow {
          0%,
          100% {
            opacity: 0.78;
            transform: scaleX(1) scaleY(1);
          }
          50% {
            opacity: 1;
            transform: scaleX(1.08) scaleY(1.12);
          }
        }

        .fs-card-hover {
          transition:
            transform 180ms ease,
            filter 180ms ease,
            box-shadow 180ms ease;
        }

        .fs-card-hover:hover {
          transform: translateY(-2px);
          filter: drop-shadow(0 0 12px rgba(255, 77, 0, 0.08));
        }

        .fs-card-hover:hover .fs-card-glow {
          opacity: 1;
        }

        .fs-card-hover:hover .fs-card-outer {
          box-shadow:
            0 16px 28px rgba(0, 0, 0, 0.68),
            0 0 18px rgba(255, 77, 0, 0.08),
            inset 0 2px 1px rgba(255, 255, 255, 0.96),
            inset 0 -2px 2px rgba(0, 0, 0, 0.82),
            inset 2px 0 2px rgba(255, 255, 255, 0.44),
            inset -2px 0 2px rgba(0, 0, 0, 0.54);
        }

        .fs-hotspot {
          animation: fsPulseGlow 2.8s ease-in-out infinite;
          transform-origin: center center;
        }

        .fs-hotspot-2 {
          animation-delay: 0.7s;
        }

        .fs-metal-button {
          transition:
            transform 90ms ease,
            box-shadow 120ms ease,
            filter 120ms ease;
        }

        .fs-metal-button:hover {
          filter: brightness(1.02);
          box-shadow:
            inset 0 2px 1px rgba(255, 255, 255, 1),
            inset 0 -3px 2px rgba(0, 0, 0, 0.6),
            0 8px 18px rgba(0, 0, 0, 0.46),
            0 0 10px rgba(255, 77, 0, 0.08);
        }

        .fs-metal-button:active {
          transform: translateY(2px);
          box-shadow:
            inset 0 2px 2px rgba(0, 0, 0, 0.18),
            inset 0 -1px 1px rgba(255, 255, 255, 0.28),
            0 2px 6px rgba(0, 0, 0, 0.35);
        }

        @media (max-width: 1180px) {
          .audit-stats-grid {
            grid-template-columns: 1fr !important;
          }

          .audit-filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .audit-json-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 860px) {
          .title-row {
            padding-top: 12px !important;
            padding-bottom: 12px !important;
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .title-actions-wrap {
            position: static !important;
            transform: none !important;
            justify-content: center !important;
            margin-bottom: 10px !important;
          }

          .title-center {
            padding-top: 0 !important;
          }
        }

        @media (max-width: 760px) {
          .audit-filter-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <TopBand />
      <TitleBand />

      <div
        style={{
          maxWidth: 1480,
          margin: "0 auto",
          padding: "22px 24px 18px",
        }}
      >
        <div
          className="audit-stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 18,
            marginBottom: 20,
          }}
        >
          <StatCard
            icon={<History size={30} strokeWidth={2.5} />}
            label="Totaal records"
            value={String(stats.totaal)}
          />
          <StatCard
            icon={<ShieldCheck size={30} strokeWidth={2.5} />}
            label="Snapshots aangemaakt"
            value={String(stats.snapshots)}
          />
          <StatCard
            icon={<Database size={30} strokeWidth={2.5} />}
            label="Entity types"
            value={String(stats.entityTypes)}
          />
        </div>

        <SteelFrame>
          <div
            style={{
              ...darkPlate,
              padding: "18px 18px 16px",
            }}
          >
            <OrangeHotspot left={22} top={14} width={52} />
            <OrangeHotspot right={28} bottom={10} width={36} small variant={2} />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <IconPlate>
                <Search size={28} strokeWidth={2.4} />
              </IconPlate>

              <div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "#f1f1f1",
                    lineHeight: 1,
                    textShadow: "0 3px 8px rgba(0,0,0,0.75)",
                  }}
                >
                  Zoek en filter audit log
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: ORANGE,
                  }}
                >
                  Historische acties en wijzigingen
                </div>
              </div>
            </div>

            <div
              className="audit-filter-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
                gap: 14,
              }}
            >
              <Field label="Zoeken">
                <FieldInput
                  icon={<Search size={16} strokeWidth={2.3} />}
                  value={q}
                  onChange={setQ}
                  placeholder="actie, entity, e-mail..."
                />
              </Field>

              <Field label="Actie">
                <PlainInput
                  value={action}
                  onChange={setAction}
                  placeholder="snapshot_created"
                />
              </Field>

              <Field label="Matchmaking ID">
                <PlainInput
                  value={matchmakingId}
                  onChange={setMatchmakingId}
                  placeholder="UUID"
                />
              </Field>

              <Field label="Gebruiker">
                <PlainInput
                  value={actor}
                  onChange={setActor}
                  placeholder="e-mail of rol"
                />
              </Field>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <SteelButton
                label="Laden"
                icon={<RefreshCcw size={16} strokeWidth={2.4} />}
                onClick={load}
                accent
              />

              <SteelButton
                label="Filters wissen"
                onClick={() => {
                  setQ("");
                  setAction("");
                  setMatchmakingId("");
                  setActor("");
                }}
              />
            </div>
          </div>
        </SteelFrame>

        <div style={{ marginTop: 20, display: "grid", gap: 18 }}>
          {loading ? (
            <MessagePanel text="Laden..." />
          ) : error ? (
            <MessagePanel text={error} error />
          ) : items.length === 0 ? (
            <MessagePanel text="Geen audit records gevonden." />
          ) : (
            items.map((row) => (
              <SteelFrame key={row.id}>
                <div
                  style={{
                    ...darkPlate,
                    padding: "16px 16px 14px",
                  }}
                >
                  <OrangeHotspot left={18} top={10} width={38} small variant={2} />
                  <CardChromeOverlay />

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 16,
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "7px 12px",
                            borderRadius: 999,
                            background:
                              "linear-gradient(180deg, #ff6720 0%, #ff4d00 40%, #ad3100 100%)",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 900,
                            textTransform: "uppercase",
                            boxShadow:
                              "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.28), 0 0 12px rgba(255,77,0,0.16)",
                          }}
                        >
                          {row.action || "actie"}
                        </span>

                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "7px 12px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.14)",
                            background:
                              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.22))",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 800,
                            textTransform: "uppercase",
                          }}
                        >
                          {row.entity_type || "entity"}
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          fontSize: 14,
                          color: "#e7e7e7",
                        }}
                      >
                        <span style={{ fontWeight: 800 }}>Gebruiker:</span>{" "}
                        {row.actor_email || "—"}{" "}
                        <span style={{ color: "rgba(255,255,255,0.45)" }}>
                          ({row.actor_role || "—"})
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: "rgba(255,255,255,0.60)",
                        }}
                      >
                        {fmtDate(row.created_at)}
                      </div>
                    </div>

                    <div
                      style={{
                        minWidth: 260,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.20))",
                        padding: "12px 14px",
                        color: "#f1f1f1",
                      }}
                    >
                      <div style={{ fontSize: 13 }}>
                        <span style={{ color: "rgba(255,255,255,0.45)" }}>Matchmaking:</span>{" "}
                        <span style={{ fontWeight: 700 }}>{row.matchmaking_id || "—"}</span>
                      </div>
                      <div style={{ fontSize: 13, marginTop: 6 }}>
                        <span style={{ color: "rgba(255,255,255,0.45)" }}>Partij nr:</span>{" "}
                        <span style={{ fontWeight: 700 }}>
                          {row.partij_nr === null || row.partij_nr === undefined ? "—" : row.partij_nr}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="audit-json-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 14,
                    }}
                  >
                    <JsonPanel title="Oude waarde" data={row.old_value} />
                    <JsonPanel title="Nieuwe waarde" data={row.new_value} />
                    <JsonPanel title="Meta" data={row.meta} />
                  </div>
                </div>
              </SteelFrame>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

function TopBand() {
  return (
    <div
      style={{
        ...sectionRule(true),
        position: "relative",
        background: `
          radial-gradient(circle at 50% 50%, rgba(255,115,20,0.10) 0%, rgba(255,115,20,0.03) 16%, rgba(0,0,0,0) 34%),
          linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)
        `,
        paddingTop: 18,
        paddingBottom: 18,
      }}
    />
  );
}

function TitleBand() {
  return (
    <div
      style={{
        ...sectionRule(),
        position: "relative",
        background: `
          linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 10%, rgba(0,0,0,0.04) 100%),
          linear-gradient(180deg, #171b21 0%, #0a0d12 50%, #161a20 100%)
        `,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.06),
          inset 0 -1px 0 rgba(255,255,255,0.03),
          0 8px 14px rgba(0,0,0,0.34)
        `,
      }}
    >
      <div
        className="fs-hotspot"
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: -4,
          width: 160,
          height: 8,
          background:
            "radial-gradient(circle, rgba(255,98,0,1) 0%, rgba(255,98,0,0.55) 34%, rgba(255,98,0,0) 72%)",
          filter: "blur(2px)",
          pointerEvents: "none",
        }}
      />

      <div
        className="title-row"
        style={{
          position: "relative",
          maxWidth: 1480,
          margin: "0 auto",
          padding: "11px 18px 10px",
          minHeight: 92,
        }}
      >
        <div
          className="title-actions-wrap"
          style={{
            position: "absolute",
            right: 18,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
          }}
        >
          <Link
            href="/dashboard/admin"
            style={{ textDecoration: "none" }}
          >
            <HeaderSilverButton
              label="ADMIN"
              icon={<ArrowLeft size={15} strokeWidth={2.8} />}
            />
          </Link>
        </div>

        <div
          className="title-center"
          style={{
            textAlign: "center",
            paddingTop: 0,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 1,
              lineHeight: 1,
              color: "#ececec",
              textTransform: "uppercase",
              textShadow:
                "0 1px 0 rgba(255,255,255,0.18), 0 4px 10px rgba(0,0,0,0.82)",
            }}
          >
            Audit / Logboek
          </div>

          <div
            style={{
              marginTop: 7,
              fontSize: 9,
              letterSpacing: 2.5,
              color: ORANGE,
              textTransform: "uppercase",
              textShadow: "0 0 8px rgba(255,106,0,0.28)",
            }}
          >
            Historische acties en wijzigingen
          </div>
        </div>
      </div>
    </div>
  );
}

function SteelFrame({
  children,
  hover = false,
}: {
  children: ReactNode;
  hover?: boolean;
}) {
  return (
    <div className={hover ? "fs-card-hover" : undefined}>
      <div style={steelFrameOuter} className={hover ? "fs-card-outer" : undefined}>
        <div
          className={hover ? "fs-card-glow" : undefined}
          style={{
            position: "absolute",
            inset: -2,
            opacity: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,77,0,0.10) 0%, rgba(255,77,0,0.04) 34%, rgba(255,77,0,0) 70%)",
            transition: "opacity 180ms ease",
            filter: "blur(8px)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `
              linear-gradient(120deg, rgba(255,255,255,0.46) 0%, rgba(255,255,255,0.10) 12%, transparent 23%),
              linear-gradient(300deg, rgba(255,255,255,0.20) 0%, transparent 22%),
              linear-gradient(180deg, rgba(0,0,0,0.26), transparent 40%)
            `,
            mixBlendMode: "screen",
          }}
        />

        <div style={steelFrameMid}>
          <div style={steelFrameChannel}>
            <div style={steelFrameInner}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <SteelFrame hover>
      <div
        style={{
          ...darkPlate,
          minHeight: 118,
          padding: "14px 16px",
        }}
      >
        <OrangeHotspot left={16} bottom={10} width={52} />
        <CardChromeOverlay />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <IconPlate>{icon}</IconPlate>

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.56)",
              }}
            >
              {label}
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 34,
                lineHeight: 1,
                fontWeight: 900,
                color: "#f5f5f5",
                textShadow: "0 3px 8px rgba(0,0,0,0.75)",
              }}
            >
              {value}
            </div>
          </div>
        </div>
      </div>
    </SteelFrame>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          marginBottom: 6,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function FieldInput({
  icon,
  value,
  onChange,
  placeholder,
}: {
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 46,
        padding: "0 14px",
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.22))",
        color: "#fff",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.50)" }}>{icon}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          background: "transparent",
          border: 0,
          outline: "none",
          color: "#fff",
          fontSize: 14,
        }}
      />
    </div>
  );
}

function PlainInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        minHeight: 46,
        padding: "0 14px",
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.22))",
        color: "#fff",
        fontSize: 14,
        outline: "none",
      }}
    />
  );
}

function MessagePanel({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return (
    <SteelFrame>
      <div
        style={{
          ...darkPlate,
          padding: "28px 18px",
          textAlign: "center",
          fontWeight: 800,
          color: error ? "#fca5a5" : "rgba(255,255,255,0.70)",
        }}
      >
        {text}
      </div>
    </SteelFrame>
  );
}

function JsonPanel({
  title,
  data,
}: {
  title: string;
  data: any;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.18))",
        padding: 12,
      }}
    >
      <div
        style={{
          marginBottom: 8,
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.50)",
        }}
      >
        {title}
      </div>

      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxHeight: 260,
          overflow: "auto",
          fontSize: 12,
          lineHeight: 1.5,
          color: data ? "#e8e8e8" : "rgba(255,255,255,0.42)",
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        }}
      >
        {data ? JSON.stringify(data, null, 2) : "—"}
      </pre>
    </div>
  );
}

function IconPlate({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: 86,
        height: 68,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        border: "1px solid #7b2500",
        background: "linear-gradient(180deg, #ff4d00 0%, #e04400 50%, #8a2600 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.30), 0 0 12px rgba(255,77,0,0.14)",
      }}
    >
      {children}
    </div>
  );
}

function SteelButton({
  label,
  onClick,
  icon,
  accent = false,
}: {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fs-metal-button"
      style={{
        minWidth: 140,
        height: 42,
        border: accent
          ? "1px solid #7b2500"
          : "1px solid rgba(185,185,185,0.95)",
        background: accent
          ? `
            linear-gradient(180deg,
              #ff7c3b 0%,
              #ff5d14 18%,
              #ff4d00 42%,
              #b33600 74%,
              #7d2300 100%)
          `
          : `
            linear-gradient(180deg,
              #ffffff 0%,
              #f3f3f3 10%,
              #d7d7d7 24%,
              #fcfcfc 42%,
              #bcbcbc 72%,
              #efefef 100%)
          `,
        color: accent ? "#fff" : "#121212",
        fontSize: 14,
        fontWeight: 900,
        boxShadow: accent
          ? `
            inset 0 1px 0 rgba(255,255,255,0.24),
            inset 0 -2px 2px rgba(0,0,0,0.34),
            0 4px 10px rgba(0,0,0,0.28)
          `
          : `
            inset 0 1px 0 rgba(255,255,255,1),
            inset 0 -2px 2px rgba(0,0,0,0.40),
            0 4px 10px rgba(0,0,0,0.28)
          `,
        cursor: "pointer",
        textShadow: accent
          ? "0 1px 0 rgba(0,0,0,0.30)"
          : "0 1px 0 rgba(255,255,255,0.55)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "0 18px",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function HeaderSilverButton({
  label,
  icon,
}: {
  label: string;
  icon?: ReactNode;
}) {
  return (
    <div
      className="fs-metal-button"
      style={{
        minWidth: 162,
        height: 42,
        border: "1px solid rgba(185,185,185,0.95)",
        background: `
          linear-gradient(180deg,
            #ffffff 0%,
            #f3f3f3 10%,
            #d7d7d7 24%,
            #fcfcfc 42%,
            #bcbcbc 72%,
            #efefef 100%)
        `,
        color: "#121212",
        fontSize: 15,
        fontWeight: 900,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,1),
          inset 0 -2px 2px rgba(0,0,0,0.40),
          0 4px 10px rgba(0,0,0,0.28)
        `,
        textShadow: "0 1px 0 rgba(255,255,255,0.55)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "0 18px",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </div>
  );
}

function OrangeHotspot({
  left,
  right,
  top,
  bottom,
  width,
  small = false,
  variant = 1,
}: {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  width: number;
  small?: boolean;
  variant?: 1 | 2 | 3;
}) {
  const extraClass =
    variant === 2 ? "fs-hotspot fs-hotspot-2" : variant === 3 ? "fs-hotspot fs-hotspot-2" : "fs-hotspot";

  return (
    <div
      className={extraClass}
      style={{
        position: "absolute",
        left,
        right,
        top,
        bottom,
        width,
        height: small ? 8 : 10,
        background:
          "radial-gradient(circle, rgba(255,98,0,1) 0%, rgba(255,98,0,0.55) 34%, rgba(255,98,0,0) 72%)",
        filter: "blur(1.5px)",
        pointerEvents: "none",
      }}
    />
  );
}

function CardChromeOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `
          linear-gradient(125deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.015) 15%, transparent 26%),
          linear-gradient(315deg, rgba(255,255,255,0.03) 0%, transparent 22%)
        `,
      }}
    />
  );
}