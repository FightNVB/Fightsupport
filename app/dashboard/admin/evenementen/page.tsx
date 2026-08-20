"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Search } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

type EventRow = {
  event_id: number;
  bond_naam: string | null;
  evenement_naam: string | null;
  evenement_datum: string | null;
  plaats: string | null;
};

type SyncRun = {
  id: string;
  start_event_id: number;
  end_event_id: number;
  status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";
  workers: number;
  processed_count: number;
  found_count: number;
  not_found_count: number;
  error_count: number;
  last_event_id: number | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};

const PAGE_SIZE = 75;

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
    : date.toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" });
}

function numberValue(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export default function EvenementenPage() {
  const router = useRouter();
  const statusBusyRef = useRef(false);
  const eventsBusyRef = useRef(false);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [run, setRun] = useState<SyncRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [startEventId, setStartEventId] = useState(77);
  const [endEventId, setEndEventId] = useState(5000);

  const running = run?.status === "running" || run?.status === "pending";
  const expected = run
    ? Math.max(0, Number(run.end_event_id) - Number(run.start_event_id) + 1)
    : 0;
  const progress = expected > 0
    ? Math.min(100, Math.round((numberValue(run?.processed_count) / expected) * 100))
    : 0;

  const loadEvents = useCallback(async () => {
    if (eventsBusyRef.current) return;
    eventsBusyRef.current = true;

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });

      if (submittedQuery) params.set("q", submittedQuery);
      if (year) params.set("year", year);

      const response = await authedFetch(
        `/api/admin/fightpassport-evenementen/events?${params.toString()}`,
        { cache: "no-store" }
      );
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || "Evenementen konden niet worden geladen.");
      }

      setEvents(Array.isArray(json.events) ? json.events : []);
      setTotal(Number(json.total ?? 0));
    } finally {
      eventsBusyRef.current = false;
    }
  }, [page, submittedQuery, year]);

  const loadStatus = useCallback(async () => {
    if (statusBusyRef.current) return;
    statusBusyRef.current = true;

    try {
      const response = await authedFetch(
        "/api/admin/fightpassport-evenementen/status",
        { cache: "no-store" }
      );
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || "Status kon niet worden geladen.");
      }

      setRun(json.run ?? null);
    } finally {
      statusBusyRef.current = false;
    }
  }, []);

  const reloadAll = useCallback(async () => {
    try {
      setError("");
      await Promise.all([loadEvents(), loadStatus()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [loadEvents, loadStatus]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void reloadAll();
    };

    const timer = window.setInterval(refresh, running ? 5000 : 15000);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reloadAll, running]);

  async function startScraper() {
    setError("");
    setNotice("");

    if (
      !Number.isInteger(startEventId) ||
      !Number.isInteger(endEventId) ||
      startEventId < 1 ||
      endEventId < startEventId
    ) {
      setError("Vul een geldig bereik in.");
      return;
    }

    try {
      setStarting(true);

      const response = await authedFetch(
        "/api/admin/fightpassport-evenementen/start",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startEventId,
            endEventId,
            workers: 20,
          }),
        }
      );
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || "Evenementen Terminator kon niet worden gestart.");
      }

      setNotice(
        json.message ||
          `Evenementen Terminator gestart voor ${startEventId} t/m ${endEventId} met 20 workers.`
      );

      window.setTimeout(() => void reloadAll(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setSubmittedQuery(query.trim());
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 35 }, (_, index) => String(current - index));
  }, []);

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

            <div />
          </div>

          <div style={styles.heroBottom}>
            <div style={styles.heroIdentity}>
              <div style={styles.eyebrow}>FIGHTPASSPORT DATABASE</div>
              <h1 style={styles.title}>Evenementen</h1>
              <div style={styles.identityStrip}>
                <span style={styles.identityChip}>{total} evenementen</span>
                <span style={styles.identityChip}>
                  Status: {running ? "Terminator actief" : run?.status || "gereed"}
                </span>
                <span style={styles.identityChip}>20 workers</span>
              </div>
            </div>
          </div>
        </header>

        {error ? <div style={styles.error}>{error}</div> : null}
        {notice ? <div style={styles.notice}>{notice}</div> : null}

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionKicker}>TERMINATOR</div>
              <h2 style={styles.sectionTitle}>Evenementen ophalen</h2>
            </div>
            <span
              style={{
                ...styles.statusBadge,
                ...(running
                  ? styles.statusRunning
                  : run?.status === "failed"
                    ? styles.statusFailed
                    : run?.status === "completed"
                      ? styles.statusCompleted
                      : {}),
              }}
            >
              {running
                ? "ACTIEF"
                : run?.status === "failed"
                  ? "MISLUKT"
                  : run?.status === "paused"
                    ? "GEPAUZEERD"
                    : run?.status === "completed"
                      ? "AFGEROND"
                      : "GEREED"}
            </span>
          </div>

          <div style={styles.scraperControls}>
            <label style={styles.label}>
              Vanaf eventnummer
              <input
                style={styles.input}
                type="number"
                min={1}
                value={startEventId}
                disabled={running || starting}
                onChange={(event) => setStartEventId(Number(event.target.value))}
              />
            </label>

            <label style={styles.label}>
              Tot en met
              <input
                style={styles.input}
                type="number"
                min={1}
                value={endEventId}
                disabled={running || starting}
                onChange={(event) => setEndEventId(Number(event.target.value))}
              />
            </label>

            <label style={styles.label}>
              Workers
              <input style={styles.input} value="20" disabled />
            </label>

            <button
              style={styles.orangeButton}
              onClick={startScraper}
              disabled={running || starting}
            >
              <Play size={16} />
              {starting ? "Starten..." : running ? "Terminator draait" : "Start Terminator"}
            </button>
          </div>

          {run ? (
            <div style={styles.runArea}>
              <div style={styles.progressTop}>
                <strong>
                  {numberValue(run.processed_count)} / {expected} verwerkt
                </strong>
                <span>
                  {progress}% · laatste event {run.last_event_id ?? "—"}
                </span>
              </div>

              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${progress}%` }} />
              </div>

              <div style={styles.runStats}>
                <div style={styles.runStat}>
                  <span>Gevonden</span>
                  <strong>{numberValue(run.found_count)}</strong>
                </div>
                <div style={styles.runStat}>
                  <span>Niet bestaand (705)</span>
                  <strong>{numberValue(run.not_found_count)}</strong>
                </div>
                <div style={styles.runStat}>
                  <span>Fouten</span>
                  <strong style={numberValue(run.error_count) > 0 ? styles.danger : undefined}>
                    {numberValue(run.error_count)}
                  </strong>
                </div>
                <div style={styles.runStat}>
                  <span>Gestart</span>
                  <strong>{fmtDateTime(run.started_at)}</strong>
                </div>
              </div>

              {run.error_message ? (
                <div style={styles.runError}>{run.error_message}</div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section style={styles.section}>
          <div style={styles.tableHeader}>
            <div>
              <div style={styles.sectionKicker}>DATABASE</div>
              <h2 style={styles.sectionTitle}>Verzamelde evenementen</h2>
            </div>

            <form style={styles.filters} onSubmit={submitSearch}>
              <div style={styles.searchWrap}>
                <Search size={15} style={styles.searchIcon} />
                <input
                  style={{ ...styles.input, ...styles.searchInput }}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Zoek naam, plaats, bond of eventnummer"
                />
              </div>

              <select
                style={styles.input}
                value={year}
                onChange={(event) => {
                  setYear(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Alle jaren</option>
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <button style={styles.silverButton} type="submit">
                Zoeken
              </button>
            </form>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Datum</th>
                  <th style={styles.th}>Naam</th>
                  <th style={styles.th}>Plaats</th>
                  <th style={styles.th}>Bond</th>
                </tr>
              </thead>

              <tbody>
                {!loading && events.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={4}>
                      Geen evenementen gevonden.
                    </td>
                  </tr>
                ) : null}

                {loading ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={4}>
                      Evenementen laden...
                    </td>
                  </tr>
                ) : null}

                {events.map((event, index) => (
                  <tr
                    key={event.event_id}
                    onClick={() =>
                      router.push(`/dashboard/admin/evenementen/${event.event_id}`)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <td
                      style={{
                        ...styles.td,
                        ...(index % 2 ? styles.tdLight : styles.tdDark),
                        width: 135,
                      }}
                    >
                      {fmtDate(event.evenement_datum)}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        ...(index % 2 ? styles.tdLight : styles.tdDark),
                      }}
                    >
                      <strong style={{ color: "#ff6a2a", fontWeight: 900 }}>{event.evenement_naam || "Naam onbekend"}</strong>
                      <span style={styles.subtle}>Event #{event.event_id}</span>
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        ...(index % 2 ? styles.tdLight : styles.tdDark),
                      }}
                    >
                      {event.plaats || "—"}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        ...(index % 2 ? styles.tdLight : styles.tdDark),
                      }}
                    >
                      {event.bond_naam || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.pagination}>
            <button
              style={styles.silverButton}
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Vorige
            </button>

            <span>
              Pagina <strong>{page}</strong> van <strong>{totalPages}</strong>
            </span>

            <button
              style={styles.silverButton}
              disabled={page >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Volgende
            </button>
          </div>
        </section>
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
    maxWidth: 1540,
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
    fontSize: "clamp(28px,3vw,38px)",
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingBottom: 10,
    marginBottom: 14,
    borderBottom: "1px solid #30363d",
  },
  tableHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottom: "1px solid #30363d",
  },
  sectionKicker: {
    color: "#a6adb4",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.6,
  },
  sectionTitle: {
    margin: "3px 0 0",
    color: "#ff7440",
    fontSize: 20,
  },
  label: {
    display: "grid",
    gap: 5,
    color: "#a6adb4",
    fontSize: 10,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    height: 38,
    padding: "0 10px",
    border: "1px solid #59616a",
    borderRadius: 0,
    background: "#0d1115",
    color: "#fff",
    font: "inherit",
  },
  scraperControls: {
    display: "grid",
    gridTemplateColumns: "170px 170px 100px minmax(190px,240px)",
    gap: 10,
    alignItems: "end",
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
    minHeight: 40,
    padding: "0 15px",
    border: "1px solid #ff7438",
    borderRadius: 0,
    background: "linear-gradient(#ff7438,#df4300)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,.24),0 4px 10px rgba(0,0,0,.28)",
  },
  statusBadge: {
    padding: "5px 10px",
    border: "1px solid #59616a",
    background: "#20262c",
    color: "#d7dce0",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.8,
  },
  statusRunning: {
    borderColor: "#ff4d00",
    background: "#2a140b",
    color: "#ff9a70",
  },
  statusFailed: {
    borderColor: "#c63a3a",
    background: "#2b1010",
    color: "#ff8b84",
  },
  statusCompleted: {
    borderColor: "#3f9c58",
    background: "#102317",
    color: "#70dc8a",
  },
  runArea: {
    marginTop: 15,
    paddingTop: 13,
    borderTop: "1px solid #30363d",
  },
  progressTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 7,
    color: "#d9dde1",
    fontSize: 12,
  },
  progressTrack: {
    height: 10,
    border: "1px solid #505861",
    background: "#090c0f",
  },
  progressFill: {
    height: "100%",
    background: "#ff4d00",
    transition: "width .25s ease",
  },
  runStats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: 8,
    marginTop: 10,
  },
  runStat: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    padding: "9px 10px",
    border: "1px solid #30363d",
    background: "#0d1115",
    color: "#a6adb4",
    fontSize: 12,
  },
  danger: {
    color: "#ff654d",
  },
  runError: {
    marginTop: 9,
    padding: "9px 10px",
    border: "1px solid #a93b32",
    background: "#2b1110",
    color: "#ffd4d0",
    fontSize: 12,
  },
  filters: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },
  searchWrap: {
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 10,
    top: 11,
    color: "#8d959d",
    pointerEvents: "none",
  },
  searchInput: {
    width: 340,
    paddingLeft: 34,
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #444b52",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    padding: "9px 10px",
    borderBottom: "2px solid #ff4d00",
    background: "#20262c",
    color: "#f3f3f3",
    textAlign: "left",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "9px 10px",
    borderBottom: "1px solid #31373d",
    verticalAlign: "top",
  },
  tdDark: {
    background: "#11161a",
    color: "#f3f3f3",
  },
  tdLight: {
    background: "#ececec",
    color: "#111",
  },
  subtle: {
    display: "block",
    marginTop: 3,
    color: "#8c949c",
    fontSize: 10,
  },
  emptyCell: {
    padding: 30,
    textAlign: "center",
    color: "#9aa1a8",
    background: "#0d1115",
  },
  pagination: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    fontSize: 12,
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
  notice: {
    marginBottom: 14,
    padding: "10px 12px",
    border: "1px solid #ff7438",
    background: "#211108",
    color: "#ffd5c2",
    fontWeight: 800,
  },
};
