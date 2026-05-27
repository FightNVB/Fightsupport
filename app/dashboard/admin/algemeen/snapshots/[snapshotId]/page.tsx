"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArchiveRestore, ClipboardList, ArrowLeft, Database, ShieldCheck, CalendarDays } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

const ORANGE = "#ff4d00";

type SnapshotItem = {
  id: string;
  created_at: string | null;
  matchmaking_id: string | null;
  upload_id: string | null;
  saved_by_user_id: string | null;
  saved_by_email: string | null;
  saved_by_name?: string | null;
  evenement_naam: string | null;
  evenement_datum: string | null;
  locatie: string | null;
  matchmaker: string | null;
  promotor: string | null;
  bondteam: string | null;
  official_release: boolean | null;
  official_released_at: string | null;
  controle_run_id: string | null;
  controle_status: string | null;
  controle_gestart_op: string | null;
  controle_afgerond_op: string | null;
  controle_run_type: string | null;
  totaal_partijen?: number | null;
  notitie?: string | null;
  payload_json?: {
    upload?: any;
    latest_run?: any;
    bouts?: any[];
    saved_from?: string;
  } | null;
};

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("nl-NL");
}

function val(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
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

export default function SnapshotDetailPage() {
  const params = useParams<{ snapshotId: string }>();
  const snapshotId = String(params?.snapshotId ?? "");

  const [item, setItem] = useState<SnapshotItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await authedFetch(`/api/admin/beheer/snapshots/${snapshotId}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Kon snapshot niet laden.");
      }

      setItem(json?.item ?? null);
    } catch (err: any) {
      setError(err?.message || "Onbekende fout.");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!snapshotId) return;
    load();
  }, [snapshotId]);

  const bouts = useMemo(() => {
    return Array.isArray(item?.payload_json?.bouts) ? item!.payload_json!.bouts! : [];
  }, [item]);

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
          .snapshot-detail-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .snapshot-detail-info-grid {
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
          .snapshot-detail-stats {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <TopBand />
      <TitleBand />

      <div
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "22px 24px 18px",
        }}
      >
        {loading ? (
          <MessagePanel text="Laden..." />
        ) : error ? (
          <MessagePanel text={error} error />
        ) : !item ? (
          <MessagePanel text="Snapshot niet gevonden." />
        ) : (
          <>
            <div
              className="snapshot-detail-stats"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 18,
                marginBottom: 20,
              }}
            >
              <StatCard
                icon={<ArchiveRestore size={30} strokeWidth={2.5} />}
                label="Event"
                value={item.evenement_naam || "—"}
                compact
              />
              <StatCard
                icon={<ShieldCheck size={30} strokeWidth={2.5} />}
                label="Bondteam"
                value={item.bondteam || "—"}
                compact
              />
              <StatCard
                icon={<CalendarDays size={30} strokeWidth={2.5} />}
                label="Gemaakt op"
                value={fmtDate(item.created_at)}
                compact
              />
              <StatCard
                icon={<Database size={30} strokeWidth={2.5} />}
                label="Partijen"
                value={String(item.totaal_partijen ?? bouts.length)}
              />
            </div>

            <div
              className="snapshot-detail-info-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 18,
                marginBottom: 20,
              }}
            >
              <InfoCard
                title="Snapshot informatie"
                subtitle="Opgeslagen metadata"
                icon={<ArchiveRestore size={26} strokeWidth={2.4} />}
              >
                <InfoGrid>
                  <Info label="Snapshot ID" value={item.id} />
                  <Info label="Matchmaking ID" value={item.matchmaking_id} />
                  <Info label="Event datum" value={fmtDate(item.evenement_datum)} />
                  <Info label="Locatie" value={item.locatie} />
                  <Info label="Matchmaker" value={item.matchmaker} />
                  <Info label="Promotor" value={item.promotor} />
                  <Info label="Gemaakt door" value={item.saved_by_name || item.saved_by_email} />
                  <Info label="Official release" value={item.official_release ? "Ja" : "Nee"} />
                  <Info label="Released op" value={fmtDate(item.official_released_at)} />
                  <Info label="Notitie" value={item.notitie} />
                </InfoGrid>
              </InfoCard>

              <InfoCard
                title="Controle informatie"
                subtitle="Run en brongegevens"
                icon={<ClipboardList size={26} strokeWidth={2.4} />}
              >
                <InfoGrid>
                  <Info label="Controle run ID" value={item.controle_run_id} />
                  <Info label="Controle status" value={item.controle_status} />
                  <Info label="Run type" value={item.controle_run_type} />
                  <Info label="Gestart op" value={fmtDate(item.controle_gestart_op)} />
                  <Info label="Afgerond op" value={fmtDate(item.controle_afgerond_op)} />
                  <Info label="Saved from" value={item.payload_json?.saved_from} />
                </InfoGrid>
              </InfoCard>
            </div>

            <SteelFrame>
              <div
                style={{
                  ...darkPlate,
                  padding: 0,
                }}
              >
                <OrangeHotspot left={18} top={10} width={38} small variant={2} />
                <CardChromeOverlay />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "16px 18px",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))",
                  }}
                >
                  <IconPlate small>
                    <ClipboardList size={22} strokeWidth={2.5} />
                  </IconPlate>

                  <div>
                    <div
                      style={{
                        fontSize: 21,
                        fontWeight: 900,
                        color: "#f2f2f2",
                        textShadow: "0 3px 8px rgba(0,0,0,0.7)",
                      }}
                    >
                      Partijen in snapshot
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        color: ORANGE,
                      }}
                    >
                      Bevroren momentopname van opgeslagen matchmaking
                    </div>
                  </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      minWidth: 1450,
                      borderCollapse: "collapse",
                      fontSize: 14,
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                          color: "rgba(255,255,255,0.78)",
                          textAlign: "left",
                        }}
                      >
                        {[
                          "Partij",
                          "Discipline",
                          "Klasse",
                          "Max gewicht",
                          "Rood",
                          "Rood VA",
                          "Rood gewogen",
                          "Blauw",
                          "Blauw VA",
                          "Blauw gewogen",
                          "Eindstatus",
                          "Dispensatie",
                          "Minpunt",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "14px 14px",
                              borderBottom: "1px solid rgba(255,255,255,0.08)",
                              fontWeight: 800,
                              letterSpacing: 0.3,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {bouts.length === 0 ? (
                        <MessageRow text="Geen partijen in payload gevonden." colSpan={13} />
                      ) : (
                        bouts.map((row: any, idx: number) => (
                          <tr
                            key={row?.id ?? `${row?.partij_nr ?? "x"}-${idx}`}
                            style={{
                              background:
                                idx % 2 === 0
                                  ? "rgba(255,255,255,0.03)"
                                  : "rgba(0,0,0,0.18)",
                            }}
                          >
                            <td style={cellStyleStrong}>{val(row?.partij_nr)}</td>
                            <td style={cellStyle}>{val(row?.discipline)}</td>
                            <td style={cellStyle}>{val(row?.klasse_mm)}</td>
                            <td style={cellStyle}>{val(row?.max_gewicht)}</td>

                            <td style={cellStyle}>
                              <div style={{ fontWeight: 800, color: "#f3f3f3" }}>
                                {val(row?.rood_naam)}
                              </div>
                              <div
                                style={{
                                  marginTop: 4,
                                  fontSize: 12,
                                  color: "rgba(255,255,255,0.50)",
                                }}
                              >
                                {val(row?.rood_gym)}
                              </div>
                            </td>

                            <td style={cellStyle}>{val(row?.rood_va)}</td>
                            <td style={cellStyle}>{val(row?.rood_gewogen_gewicht)}</td>

                            <td style={cellStyle}>
                              <div style={{ fontWeight: 800, color: "#f3f3f3" }}>
                                {val(row?.blauw_naam)}
                              </div>
                              <div
                                style={{
                                  marginTop: 4,
                                  fontSize: 12,
                                  color: "rgba(255,255,255,0.50)",
                                }}
                              >
                                {val(row?.blauw_gym)}
                              </div>
                            </td>

                            <td style={cellStyle}>{val(row?.blauw_va)}</td>
                            <td style={cellStyle}>{val(row?.blauw_gewogen_gewicht)}</td>
                            <td style={cellStyle}>{val(row?.eindstatus)}</td>

                            <td style={cellStyle}>
                              {row?.dispensatie_verleend
                                ? "Verleend"
                                : row?.dispensatie_nodig
                                ? "Nodig"
                                : "—"}
                            </td>

                            <td style={cellStyle}>
                              R: {val(row?.gewicht_strafpunt_rood)} / B: {val(row?.gewicht_strafpunt_blauw)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </SteelFrame>
          </>
        )}
      </div>
    </main>
  );
}

const cellStyle: CSSProperties = {
  padding: "14px 14px",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  color: "#dedede",
  verticalAlign: "middle",
};

const cellStyleStrong: CSSProperties = {
  ...cellStyle,
  fontWeight: 800,
  color: "#f4f4f4",
};

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
          maxWidth: 1600,
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
            href="/dashboard/admin/beheer/snapshots"
            style={{ textDecoration: "none" }}
          >
            <HeaderSilverButton
              label="SNAPSHOTS"
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
            Snapshot detail
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
            Inzien van opgeslagen matchmaking snapshot
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
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <SteelFrame hover>
      <div
        style={{
          ...darkPlate,
          minHeight: compact ? 122 : 118,
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
                fontSize: compact ? 18 : 34,
                lineHeight: compact ? 1.25 : 1,
                fontWeight: 900,
                color: "#f5f5f5",
                textShadow: "0 3px 8px rgba(0,0,0,0.75)",
                wordBreak: "break-word",
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

function InfoCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <SteelFrame>
      <div
        style={{
          ...darkPlate,
          padding: "18px 18px 16px",
        }}
      >
        <OrangeHotspot left={20} top={12} width={42} small variant={2} />
        <CardChromeOverlay />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <IconPlate>
            {icon}
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
              {title}
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
              {subtitle}
            </div>
          </div>
        </div>

        {children}
      </div>
    </SteelFrame>
  );
}

function InfoGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      }}
    >
      {children}
    </div>
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

function MessageRow({
  text,
  colSpan,
}: {
  text: string;
  colSpan: number;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          padding: "34px 16px",
          textAlign: "center",
          color: "rgba(255,255,255,0.66)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          fontWeight: 700,
        }}
      >
        {text}
      </td>
    </tr>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.18))",
        padding: "12px 12px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 8,
          wordBreak: "break-word",
          fontSize: 14,
          fontWeight: 700,
          color: "#fff",
        }}
      >
        {value === null || value === undefined || value === "" ? "—" : String(value)}
      </div>
    </div>
  );
}

function IconPlate({
  children,
  small = false,
}: {
  children: ReactNode;
  small?: boolean;
}) {
  return (
    <div
      style={{
        width: small ? 58 : 86,
        height: small ? 44 : 68,
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
