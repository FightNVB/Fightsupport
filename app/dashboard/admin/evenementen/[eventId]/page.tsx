"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

type EventOfficial = {
  id: number;
  event_id: number;
  functie: string | null;
  naam: string;
  volgorde: number;
  last_seen_at: string | null;
};

type EventDetail = {
  event_id: number;
  source_url: string;
  bond_naam: string | null;
  evenement_naam: string | null;
  evenement_datum: string | null;
  straatnaam: string | null;
  postcode: string | null;
  plaats: string | null;
  promotor: string | null;
  aangemaakt_op: string | null;
  afgehandeld_op: string | null;
  laatst_gewijzigd_op: string | null;
  laatst_gewijzigd_door: string | null;
  matchmaking_aantal_vechters: number | null;
  matchmaking_fit_to_fight: number | null;
  matchmaking_startverbod: number | null;
  matchmaking_aantal_partijen: number | null;
  matchmaking_nog_in_te_delen: number | null;
  uitslagen_aantal: number | null;
  uitslagen_nog_in_te_voeren: number | null;
  schorsingen_aantal: number | null;
  startverboden_aantal: number | null;
  officials_count: number | null;
  officials: EventOfficial[];
  last_seen_at: string | null;
  last_scraped_at: string | null;
  raw_json: unknown;
};

function fmtDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("nl-NL");
}

function fmtDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" });
}

function numberValue(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function Field({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div style={{ ...styles.field, ...(wide ? styles.fieldWide : {}) }}>
      <span style={styles.muted}>{label}</span>
      <strong style={styles.fieldValue}>{value || "—"}</strong>
    </div>
  );
}

function Metric({
  label,
  value,
  warning = false,
  positive = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
  positive?: boolean;
}) {
  const activeWarning = warning && value > 0;

  return (
    <div
      style={{
        ...styles.metric,
        ...(activeWarning ? styles.metricWarning : {}),
        ...(positive ? styles.metricPositive : {}),
      }}
    >
      <span style={styles.metricLabel}>{label}</span>
      <strong
        style={{
          ...styles.metricValue,
          ...(activeWarning ? styles.metricValueWarning : {}),
          ...(positive ? styles.metricValuePositive : {}),
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        {subtitle ? <span style={styles.sectionSubtitle}>{subtitle}</span> : null}
      </div>
      {children}
    </section>
  );
}

export default function EvenementDetailPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const eventId = String(params?.eventId || "");

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!eventId) return;

    try {
      setError("");

      const response = await authedFetch(
        `/api/admin/fightpassport-evenementen/events/${encodeURIComponent(eventId)}`,
        { cache: "no-store" }
      );
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || "Evenement kon niet worden geladen.");
      }

      setEvent(json.event ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();

    const refresh = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    const timer = window.setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const groupedOfficials = useMemo(() => {
    const groups = new Map<string, EventOfficial[]>();

    for (const official of event?.officials ?? []) {
      const functionName = official.functie?.trim() || "Overig";
      const group = groups.get(functionName) ?? [];
      group.push(official);
      groups.set(functionName, group);
    }

    return Array.from(groups.entries()).map(([functionName, rows]) => ({
      functionName,
      rows: rows.slice().sort((a, b) => a.volgorde - b.volgorde),
    }));
  }, [event?.officials]);

  if (loading && !event) {
    return (
      <main style={styles.page}>
        <div style={styles.wrap}>
          <div style={styles.loading}>Evenement laden...</div>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <header style={styles.hero}>
          <div style={styles.heroGlow} />

          <div style={styles.heroTop}>
            <button
              style={styles.silverButton}
              onClick={() => router.push("/dashboard/admin")}
            >
              <ArrowLeft size={16} />
              Dashboard
            </button>

            <div style={styles.logoWrap}>
              <img
                src="/branding/fightsupport/excel-logo.png"
                alt="FightSupport"
                style={styles.logo}
              />
            </div>

            <div style={styles.headerActions}>
              {event?.source_url ? (
                <button
                  style={styles.orangeButton}
                  onClick={() =>
                    window.open(event.source_url, "_blank", "noopener,noreferrer")
                  }
                >
                  <ExternalLink size={16} />
                  FightPassport
                </button>
              ) : null}
            </div>
          </div>

          <div style={styles.heroBottom}>
            <div style={styles.heroIdentity}>
              <div style={styles.eyebrow}>EVENEMENTDOSSIER</div>
              <h1 style={styles.title}>
                {event?.evenement_naam || `Evenement ${eventId}`}
              </h1>

              <div style={styles.identityStrip}>
                <span style={styles.identityChip}>
                  <b>EVENT</b> #{event?.event_id ?? eventId}
                </span>
                <span style={styles.identityChip}>
                  {event?.bond_naam || "Bond onbekend"}
                </span>
                <span style={styles.identityChip}>
                  {fmtDate(event?.evenement_datum ?? null)}
                </span>
                <span style={styles.identityChip}>
                  {event?.plaats || "Plaats onbekend"}
                </span>
                <span style={styles.identityChip}>
                  Sync {fmtDateTime(event?.last_scraped_at ?? null)}
                </span>
              </div>
            </div>
          </div>
        </header>

        {error ? <div style={styles.error}>{error}</div> : null}

        {event ? (
          <>
            <Section title="Evenementgegevens">
              <div style={styles.grid}>
                <Field label="Naam evenement" value={event.evenement_naam} wide />
                <Field label="Eventnummer" value={`#${event.event_id}`} />
                <Field label="Bond" value={event.bond_naam} />
                <Field label="Datum" value={fmtDate(event.evenement_datum)} />
                <Field label="Promotor" value={event.promotor} />
                <Field
                  label="Locatie"
                  value={[event.straatnaam, event.postcode, event.plaats]
                    .filter(Boolean)
                    .join(", ")}
                  wide
                />
              </div>
            </Section>

            <Section title="Matchmaking">
              <div style={styles.metricsGrid}>
                <Metric
                  label="Aantal vechters"
                  value={numberValue(event.matchmaking_aantal_vechters)}
                />
                <Metric
                  label="Fit to fight"
                  value={numberValue(event.matchmaking_fit_to_fight)}
                  positive
                />
                <Metric
                  label="Startverbod"
                  value={numberValue(event.matchmaking_startverbod)}
                  warning
                />
                <Metric
                  label="Aantal partijen"
                  value={numberValue(event.matchmaking_aantal_partijen)}
                />
                <Metric
                  label="Nog in te delen"
                  value={numberValue(event.matchmaking_nog_in_te_delen)}
                  warning
                />
              </div>
            </Section>

            <div style={styles.twoColumns}>
              <Section title="Uitslagen">
                <div style={styles.metricsGridTwo}>
                  <Metric
                    label="Aantal uitslagen"
                    value={numberValue(event.uitslagen_aantal)}
                  />
                  <Metric
                    label="Nog in te voeren"
                    value={numberValue(event.uitslagen_nog_in_te_voeren)}
                    warning
                  />
                </div>
              </Section>

              <Section title="Schorsingen en startverboden">
                <div style={styles.metricsGridTwo}>
                  <Metric
                    label="Schorsingen"
                    value={numberValue(event.schorsingen_aantal)}
                    warning
                  />
                  <Metric
                    label="Startverboden ter info"
                    value={numberValue(event.startverboden_aantal)}
                    warning
                  />
                </div>
              </Section>
            </div>

            <Section
              title={`Officials (${event.officials?.length ?? 0})`}
              subtitle="Uit de OFFICIALS-tegel"
            >
              {groupedOfficials.length ? (
                <div style={styles.officialsGrid}>
                  {groupedOfficials.map(({ functionName, rows }) => (
                    <div key={functionName} style={styles.officialGroup}>
                      <div style={styles.officialHeader}>{functionName}</div>

                      {rows.map((official, index) => (
                        <div
                          key={`${official.id}-${official.naam}`}
                          style={{
                            ...styles.officialRow,
                            ...(index % 2 ? styles.officialRowLight : {}),
                          }}
                        >
                          {official.naam}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.emptyState}>
                  Geen officials op de OFFICIALS-tegel vermeld.
                </div>
              )}
            </Section>

            <Section title="Registratie en synchronisatie">
              <div style={styles.grid}>
                <Field
                  label="Aangemaakt op"
                  value={fmtDate(event.aangemaakt_op)}
                />
                <Field
                  label="Afgehandeld op"
                  value={fmtDate(event.afgehandeld_op)}
                />
                <Field
                  label="Laatst gewijzigd"
                  value={fmtDate(event.laatst_gewijzigd_op)}
                />
                <Field
                  label="Gewijzigd door"
                  value={event.laatst_gewijzigd_door}
                />
                <Field
                  label="Laatst gezien"
                  value={fmtDateTime(event.last_seen_at)}
                />
                <Field
                  label="Laatst opgehaald"
                  value={fmtDateTime(event.last_scraped_at)}
                />
              </div>
            </Section>

            <details style={styles.rawDetails}>
              <summary style={styles.rawSummary}>
                Technische brondata tonen
              </summary>
              <pre style={styles.rawPre}>
                {JSON.stringify(event.raw_json, null, 2)}
              </pre>
            </details>
          </>
        ) : null}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 20,
    color: "#fff",
    fontFamily: "Inter, Arial, sans-serif",
    background:
      "radial-gradient(circle at 50% -10%,rgba(255,77,0,.16),transparent 34%),linear-gradient(180deg,#060708 0%,#0b0f13 48%,#050607 100%)",
  },
  wrap: {
    width: "100%",
    maxWidth: 1460,
    margin: "0 auto",
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    marginBottom: 16,
    border: "1px solid #4a5057",
    borderTop: "3px solid #ff4d00",
    background:
      "linear-gradient(145deg,#1b2026 0%,#0b0e12 55%,#15191e 100%)",
    boxShadow:
      "0 16px 34px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.05)",
  },
  heroGlow: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background:
      "radial-gradient(circle at 50% 10%,rgba(255,77,0,.14),transparent 24%)",
  },
  heroTop: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "1fr minmax(260px,760px) 1fr",
    alignItems: "center",
    gap: 14,
    padding: "10px 14px",
    borderBottom: "1px solid #353b42",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    minWidth: 0,
  },
  logo: {
    width: "100%",
    maxWidth: 760,
    height: 86,
    objectFit: "contain",
    filter:
      "drop-shadow(0 8px 14px rgba(0,0,0,.7)) drop-shadow(0 0 12px rgba(255,77,0,.12))",
  },
  headerActions: {
    display: "flex",
    justifyContent: "flex-end",
  },
  heroBottom: {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    padding: "18px 18px 20px",
  },
  heroIdentity: {
    display: "grid",
    justifyItems: "center",
    textAlign: "center",
    gap: 8,
    width: "100%",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 2.4,
    color: "#fff",
  },
  title: {
    margin: 0,
    color: "#ff6a2a",
    fontSize: "clamp(25px,3vw,36px)",
    fontWeight: 950,
    textShadow: "0 4px 12px #000",
  },
  identityStrip: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  identityChip: {
    padding: "6px 9px",
    border: "1px solid #6b3018",
    background: "#22120b",
    color: "#fff",
    fontSize: 12,
    fontWeight: 850,
  },
  section: {
    minWidth: 0,
    marginBottom: 14,
    padding: 16,
    border: "1px solid #3f464d",
    borderLeft: "3px solid #ff4d00",
    background: "linear-gradient(180deg,#151a1f,#0a0d10)",
    boxShadow: "0 10px 24px rgba(0,0,0,.24)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
    paddingBottom: 9,
    borderBottom: "1px solid #30363d",
  },
  sectionTitle: {
    margin: 0,
    color: "#ff7440",
    fontSize: 19,
  },
  sectionSubtitle: {
    color: "#9199a2",
    fontSize: 11,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 9,
  },
  field: {
    minWidth: 0,
    display: "grid",
    gap: 4,
    minHeight: 58,
    padding: "9px 10px",
    border: "1px solid #30363d",
    background: "#0d1115",
  },
  fieldWide: {
    gridColumn: "span 2",
  },
  muted: {
    color: "#9199a2",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldValue: {
    color: "#f0f2f3",
    fontSize: 13,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
    gap: 9,
  },
  metricsGridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 9,
  },
  metric: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 13px",
    border: "1px solid #555d65",
    borderTop: "3px solid #717981",
    background: "linear-gradient(180deg,#1c2228,#0d1115)",
    boxShadow: "0 8px 18px rgba(0,0,0,.25)",
  },
  metricPositive: {
    borderTopColor: "#3fa75a",
  },
  metricWarning: {
    borderTopColor: "#ff4d00",
    background: "linear-gradient(180deg,#28150d,#120b08)",
  },
  metricLabel: {
    minWidth: 0,
    color: "#a6adb4",
    fontSize: 10,
    lineHeight: 1.25,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  metricValue: {
    flex: "0 0 auto",
    color: "#f4f4f4",
    fontSize: 25,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  metricValuePositive: {
    color: "#70dc8a",
  },
  metricValueWarning: {
    color: "#ff654d",
  },
  twoColumns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
    gap: 14,
  },
  officialsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 10,
    alignItems: "start",
  },
  officialGroup: {
    minWidth: 0,
    border: "1px solid #444b52",
    background: "#11161a",
  },
  officialHeader: {
    padding: "9px 10px",
    borderBottom: "2px solid #ff4d00",
    background: "#20262c",
    color: "#f3f3f3",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  officialRow: {
    padding: "8px 10px",
    borderBottom: "1px solid #31373d",
    background: "#11161a",
    color: "#f3f3f3",
    fontSize: 13,
    overflowWrap: "anywhere",
  },
  officialRowLight: {
    background: "#ececec",
    color: "#111",
  },
  emptyState: {
    padding: 14,
    border: "1px solid #30363d",
    background: "#0d1115",
    color: "#9199a2",
  },
  rawDetails: {
    marginBottom: 14,
    border: "1px solid #3f464d",
    background: "#0a0d10",
  },
  rawSummary: {
    padding: "11px 13px",
    cursor: "pointer",
    color: "#ff7440",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  rawPre: {
    maxHeight: 520,
    overflow: "auto",
    margin: 0,
    padding: 14,
    borderTop: "1px solid #30363d",
    background: "#050607",
    color: "#dce1e5",
    fontSize: 11,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  silverButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 38,
    padding: "0 13px",
    border: "1px solid #aaa",
    borderRadius: 0,
    background: "linear-gradient(#fff,#c7c7c7)",
    color: "#111",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 #fff,0 4px 10px rgba(0,0,0,.28)",
  },
  orangeButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 38,
    padding: "0 13px",
    border: "1px solid #ff7438",
    borderRadius: 0,
    background: "linear-gradient(#ff7438,#df4300)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,.24),0 4px 10px rgba(0,0,0,.28)",
  },
  error: {
    marginBottom: 14,
    padding: "10px 12px",
    border: "1px solid #a93b32",
    borderLeft: "4px solid #ff4f43",
    background: "#2b1110",
    color: "#ffd4d0",
    fontWeight: 800,
  },
  loading: {
    marginTop: 30,
    padding: 24,
    border: "1px solid #3f464d",
    background: "#11161a",
    color: "#d8dce0",
    textAlign: "center",
  },
};
