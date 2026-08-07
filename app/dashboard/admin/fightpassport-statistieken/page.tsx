"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { authedFetch } from "@/lib/api/authedFetch";
import {
  Activity,
  Award,
  BarChart3,
  CalendarDays,
  Download,
  FileText,
  Printer,
  RefreshCw,
  School,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

const ORANGE = "#ff4d00";
const LOGO = "/branding/fightsupport/excel-logo.png";

type Stats = Record<string, any>;

function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function yearRange(year: number) {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

function currentSeasonRange() {
  const now = new Date();
  return { from: `${now.getFullYear()}-01-01`, to: ymd(now) };
}

function fmt(v: any) {
  return Number(v ?? 0).toLocaleString("nl-NL");
}

function pct(v: any) {
  return `${Number(v ?? 0).toLocaleString("nl-NL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function dateNl(v: any) {
  if (!v) return "-";
  const d = new Date(`${String(v).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("nl-NL");
}


function csvEscape(value: unknown) {
  const raw = String(value ?? "");
  return `"${raw.replace(/"/g, '""')}"`;
}

function downloadCsv(data: Stats, from: string, to: string) {
  const lines: string[] = [];
  const totals = data?.totals ?? {};

  lines.push(["FightSupport FightPassport Statistieken"].map(csvEscape).join(";"));
  lines.push(["Periode", from || "alles", to || "alles"].map(csvEscape).join(";"));
  lines.push("");

  lines.push(["Kerncijfer", "Waarde"].map(csvEscape).join(";"));
  lines.push(["Evenementen", totals.evenementen].map(csvEscape).join(";"));
  lines.push(["Partijen", totals.partijen].map(csvEscape).join(";"));
  lines.push(["Wedstrijdvechters", totals.wedstrijdvechters].map(csvEscape).join(";"));
  lines.push(["Nederlandse sportscholen", totals.nederlandse_sportscholen].map(csvEscape).join(";"));
  lines.push(["Bondteams", totals.bondteams].map(csvEscape).join(";"));
  lines.push(["Officials", totals.officials].map(csvEscape).join(";"));
  lines.push("");

  lines.push(["Top vechters", "VA", "Partijen", "Winst", "KO/TKO"].map(csvEscape).join(";"));
  for (const row of data?.fighters?.meeste_partijen ?? []) {
    lines.push(
      [row.naam, row.va_nummer, row.partijen, row.winst, row.ko_tko_winst]
        .map(csvEscape)
        .join(";"),
    );
  }
  lines.push("");

  lines.push(["Sportschool", "Actieve vechters", "Partijen", "Winst", "Verlies", "Winst %"].map(csvEscape).join(";"));
  for (const row of data?.schools?.meeste_partijen ?? []) {
    lines.push(
      [row.sportschool, row.actieve_vechters, row.partijen, row.winst, row.verlies, row.winstpercentage]
        .map(csvEscape)
        .join(";"),
    );
  }
  lines.push("");

  lines.push(["Bondteam", "Evenementen", "Partijen", "Officials"].map(csvEscape).join(";"));
  for (const row of data?.bonds ?? []) {
    lines.push(
      [row.bondteam, row.evenementen, row.partijen, row.officials]
        .map(csvEscape)
        .join(";"),
    );
  }

  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `fightsupport-statistieken-${from || "alles"}-${to || "alles"}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

export default function FightPassportStatistiekenPage() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const initial = currentSeasonRange();

  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [data, setData] = useState<Stats | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reportMode, setReportMode] = useState(false);

  const quickYears = useMemo(
    () => [thisYear - 2, thisYear - 1, thisYear],
    [thisYear],
  );

  async function load(nextFrom = from, nextTo = to) {
    setBusy(true);
    setError("");
    try {
      const p = new URLSearchParams();
      if (nextFrom) p.set("from", nextFrom);
      if (nextTo) p.set("to", nextTo);

      const res = await authedFetch(
        `/api/admin/fightpassport-statistieken?${p.toString()}`,
        { cache: "no-store" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Statistieken laden mislukt.");
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Statistieken laden mislukt.");
    } finally {
      setBusy(false);
    }
  }

  function applyRange(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    void load(nextFrom, nextTo);
  }

  useEffect(() => {
    void load(initial.from, initial.to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const done = () => setReportMode(false);
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);

  const totals = data?.totals ?? {};
  const quality = totals?.datakwaliteit ?? {};
  const totalEventsForQuality = Number(quality.totaal_events ?? 0);
  const authoritativeEvents =
    Number(quality.events_met_uitslagen_aantal ?? 0) +
    Number(quality.events_met_matchmaking_aantal ?? 0);
  const authoritativePct =
    totalEventsForQuality > 0
      ? Math.round((authoritativeEvents / totalEventsForQuality) * 100)
      : 0;

  const topFighter = data?.fighters?.meeste_partijen?.[0] ?? null;
  const topSchool = data?.schools?.meeste_actieve_vechters?.[0] ?? null;
  const topBond = data?.bonds?.[0] ?? null;

  return (
    <main className={`stats-master-page${reportMode ? " report-mode" : ""}`} style={s.page}>
      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          html, body { background: #fff !important; }
          .stats-master-page {
            background: #fff !important;
            color: #111 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .stats-no-print { display: none !important; }
          .stats-master-page section,
          .stats-master-page table,
          .stats-master-page .stats-report-card {
            break-inside: avoid;
          }
          .stats-master-page .stats-print-hero {
            border: 2px solid #222 !important;
            box-shadow: none !important;
          }
        }

        @media (max-width: 1100px) {
          .stats-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          .stats-grid3 { grid-template-columns: 1fr !important; }
          .stats-grid2 { grid-template-columns: 1fr !important; }
          .stats-executive-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
        }

        @media (max-width: 680px) {
          .stats-master-page { padding: 8px !important; }
          .stats-hero-top { flex-direction: column !important; align-items: flex-start !important; }
          .stats-logo { width: min(100%, 330px) !important; max-width: 100% !important; }
          .stats-kpis,
          .stats-executive-grid,
          .stats-highlights { grid-template-columns: 1fr !important; }
          .stats-filterbar { align-items: stretch !important; }
          .stats-date-filters { width: 100% !important; }
          .stats-date-filters label { flex: 1 1 130px !important; }
          .stats-date-filters input { width: 100% !important; }
        }
      `}</style>
      <div style={s.wrap}>
        <header className="stats-print-hero" style={s.hero}>
          <div className="stats-hero-top" style={s.heroTop}>
            <div>
              <div style={s.eyebrow}>FIGHTSUPPORT · FIGHTPASSPORT INTELLIGENCE</div>
              <h1 style={s.title}>Nationaal Statistiekoverzicht</h1>
              <div style={s.sub}>
                Wedstrijdsport in cijfers · vechters, sportscholen, evenementen, bondteams en officials.
              </div>
            </div>
            <img className="stats-logo" src={LOGO} alt="FightSupport" style={s.logo} />
          </div>

          <div style={s.filterbar}>
            <div style={s.quick}>
              {quickYears.map((year) => (
                <button
                  key={year}
                  style={s.silver}
                  disabled={busy}
                  onClick={() => {
                    const r = yearRange(year);
                    applyRange(r.from, r.to);
                  }}
                >
                  {year}
                </button>
              ))}
              <button
                style={s.orange}
                disabled={busy}
                onClick={() => applyRange(initial.from, initial.to)}
              >
                Dit seizoen
              </button>
              <button
                style={s.dark}
                disabled={busy}
                onClick={() => applyRange("", "")}
              >
                Alles
              </button>
            </div>

            <div className="stats-no-print" style={s.reportActions}>
              <button
                style={s.reportButton}
                disabled={!data || busy}
                onClick={() => {
                  setReportMode(true);
                  window.setTimeout(() => window.print(), 80);
                }}
              >
                <Printer size={16} />
                Rapport / PDF
              </button>
              <button
                style={s.silver}
                disabled={!data || busy}
                onClick={() => data && downloadCsv(data, from, to)}
              >
                <Download size={16} />
                Download CSV
              </button>
            </div>

            <div className="stats-date-filters" style={s.dateFilters}>
              <label style={s.label}>
                Van datum
                <input
                  style={s.input}
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label style={s.label}>
                Tot datum
                <input
                  style={s.input}
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
              <button style={s.silver} disabled={busy} onClick={() => void load()}>
                <RefreshCw size={16} />
                {busy ? "Berekenen..." : "Berekenen"}
              </button>
            </div>
          </div>
        </header>

        {error && <div style={s.error}>{error}</div>}

        <section className="stats-report-card" style={s.executive}>
          <div style={s.executiveHeader}>
            <div>
              <div style={s.executiveEyebrow}><Sparkles size={15} /> MANAGEMENT SUMMARY</div>
              <h2 style={s.executiveTitle}>
                {from || to ? `${dateNl(from)} — ${dateNl(to)}` : "Volledige FightPassport-historie"}
              </h2>
            </div>
            <div style={s.qualityBadge}>
              <BarChart3 size={18} />
              <div>
                <strong>{authoritativePct}%</strong>
                <span>eventtelling direct uit FightPassport</span>
              </div>
            </div>
          </div>

          <div className="stats-executive-grid" style={s.executiveGrid}>
            <ExecutiveFact
              label="Actiefste vechter"
              value={topFighter ? topFighter.naam : "-"}
              sub={topFighter ? `${fmt(topFighter.partijen)} partijen` : "Geen data"}
            />
            <ExecutiveFact
              label="Grootste wedstrijdploeg"
              value={topSchool ? topSchool.sportschool : "-"}
              sub={topSchool ? `${fmt(topSchool.actieve_vechters)} actieve vechters` : "Geen data"}
            />
            <ExecutiveFact
              label="Meest actieve bondteam"
              value={topBond ? topBond.bondteam : "-"}
              sub={topBond ? `${fmt(topBond.partijen)} partijen · ${fmt(topBond.evenementen)} events` : "Geen data"}
            />
            <ExecutiveFact
              label="Datadekking"
              value={`${fmt(authoritativeEvents)} / ${fmt(totalEventsForQuality)}`}
              sub={`${fmt(quality.events_met_resultaten_fallback ?? 0)} events via resultaten-fallback`}
            />
          </div>
        </section>

        <div className="stats-kpis" style={s.kpis}>
          <Kpi icon={<CalendarDays size={20} />} label="Evenementen" value={fmt(totals.evenementen)} />
          <Kpi icon={<Swords size={20} />} label="Partijen" value={fmt(totals.partijen)} />
          <Kpi icon={<Users size={20} />} label="Wedstrijdvechters" value={fmt(totals.wedstrijdvechters)} />
          <Kpi icon={<School size={20} />} label="NL sportscholen" value={fmt(totals.nederlandse_sportscholen)} />
          <Kpi icon={<Shield size={20} />} label="Bondteams" value={fmt(totals.bondteams)} />
          <Kpi icon={<Award size={20} />} label="Officials" value={fmt(totals.officials)} />
        </div>

        <div className="stats-highlights" style={s.highlights}>
          <Highlight
            icon={<Trophy size={18} />}
            title="Grootste gala"
            row={totals.grootste_gala}
          />
          <Highlight
            icon={<Activity size={18} />}
            title="Kleinste gala"
            row={totals.kleinste_gala}
          />
        </div>

        <Section title="Wedstrijdvechters">
          <div className="stats-grid3" style={s.grid3}>
            <Ranking
              title="Top 10 meeste partijen"
              rows={data?.fighters?.meeste_partijen ?? []}
              columns={[
                ["Vechter", (r: any) => `${r.naam} · VA ${r.va_nummer}`],
                ["Partijen", (r: any) => fmt(r.partijen)],
              ]}
            />
            <Ranking
              title="Top 10 meeste winst"
              rows={data?.fighters?.meeste_winst ?? []}
              columns={[
                ["Vechter", (r: any) => `${r.naam} · VA ${r.va_nummer}`],
                ["Winst", (r: any) => fmt(r.winst)],
              ]}
            />
            <Ranking
              title="Top 10 KO / TKO winst"
              rows={data?.fighters?.meeste_ko_tko ?? []}
              columns={[
                ["Vechter", (r: any) => `${r.naam} · VA ${r.va_nummer}`],
                ["KO/TKO", (r: any) => fmt(r.ko_tko_winst)],
              ]}
            />
          </div>

          <div className="stats-grid2" style={s.grid2}>
            <div style={s.ageBox}>
              <h3 style={s.ageTitle}>Jeugd</h3>
              <Ranking
                title="Meeste partijen"
                rows={data?.fighters?.jeugd?.meeste_partijen ?? []}
                columns={[
                  ["Vechter", (r: any) => `${r.naam} · VA ${r.va_nummer}`],
                  ["Partijen", (r: any) => fmt(r.partijen)],
                ]}
              />
              <Ranking
                title="Meeste winst"
                rows={data?.fighters?.jeugd?.meeste_winst ?? []}
                columns={[
                  ["Vechter", (r: any) => `${r.naam} · VA ${r.va_nummer}`],
                  ["Winst", (r: any) => fmt(r.winst)],
                ]}
              />
              <Ranking
                title="Meeste KO / TKO winst"
                rows={data?.fighters?.jeugd?.meeste_ko_tko ?? []}
                columns={[
                  ["Vechter", (r: any) => `${r.naam} · VA ${r.va_nummer}`],
                  ["KO/TKO", (r: any) => fmt(r.ko_tko_winst)],
                ]}
              />
            </div>

            <div style={s.ageBox}>
              <h3 style={s.ageTitle}>Volwassenen</h3>
              <Ranking
                title="Meeste partijen"
                rows={data?.fighters?.volwassenen?.meeste_partijen ?? []}
                columns={[
                  ["Vechter", (r: any) => `${r.naam} · VA ${r.va_nummer}`],
                  ["Partijen", (r: any) => fmt(r.partijen)],
                ]}
              />
              <Ranking
                title="Meeste winst"
                rows={data?.fighters?.volwassenen?.meeste_winst ?? []}
                columns={[
                  ["Vechter", (r: any) => `${r.naam} · VA ${r.va_nummer}`],
                  ["Winst", (r: any) => fmt(r.winst)],
                ]}
              />
              <Ranking
                title="Meeste KO / TKO winst"
                rows={data?.fighters?.volwassenen?.meeste_ko_tko ?? []}
                columns={[
                  ["Vechter", (r: any) => `${r.naam} · VA ${r.va_nummer}`],
                  ["KO/TKO", (r: any) => fmt(r.ko_tko_winst)],
                ]}
              />
            </div>
          </div>

          <Ranking
            title="Hoogste winstpercentage · minimaal 10 partijen"
            rows={data?.fighters?.hoogste_winstpercentage ?? []}
            columns={[
              ["Vechter", (r: any) => `${r.naam} · VA ${r.va_nummer}`],
              ["Partijen", (r: any) => fmt(r.partijen)],
              ["Winst", (r: any) => fmt(r.winst)],
              ["Verlies", (r: any) => fmt(r.verlies)],
              ["Onbeslist", (r: any) => fmt(r.onbeslist)],
              ["Winst %", (r: any) => pct(r.winstpercentage)],
            ]}
          />
        </Section>

        <Section title="Sportscholen">
          <div className="stats-grid3" style={s.grid3}>
            <Ranking
              title="Meeste actieve wedstrijdvechters"
              rows={data?.schools?.meeste_actieve_vechters ?? []}
              columns={[
                ["Sportschool", (r: any) => r.sportschool],
                ["Vechters", (r: any) => fmt(r.actieve_vechters)],
                ["Partijen", (r: any) => fmt(r.partijen)],
              ]}
            />
            <Ranking
              title="Meeste partijen"
              rows={data?.schools?.meeste_partijen ?? []}
              columns={[
                ["Sportschool", (r: any) => r.sportschool],
                ["Partijen", (r: any) => fmt(r.partijen)],
                ["Winst", (r: any) => fmt(r.winst)],
                ["Verlies", (r: any) => fmt(r.verlies)],
              ]}
            />
            <Ranking
              title="Hoogste winstpercentage · minimaal 10 partijen"
              rows={data?.schools?.hoogste_winstpercentage ?? []}
              columns={[
                ["Sportschool", (r: any) => r.sportschool],
                ["Partijen", (r: any) => fmt(r.partijen)],
                ["Winst %", (r: any) => pct(r.winstpercentage)],
              ]}
            />
          </div>
        </Section>

        <Section title="Officialteams / bonden">
          <Ranking
            title="Bondteams"
            rows={data?.bonds ?? []}
            columns={[
              ["Bondteam", (r: any) => r.bondteam],
              ["Evenementen", (r: any) => fmt(r.evenementen)],
              ["Partijen begeleid", (r: any) => fmt(r.partijen)],
              ["Officials", (r: any) => fmt(r.officials)],
            ]}
          />
        </Section>

        <Section title="Officials">
          <Ranking
            title="Meest actief"
            rows={data?.officials ?? []}
            columns={[
              ["Official", (r: any) => r.naam],
              ["Functie(s)", (r: any) => (r.functies ?? []).join(", ") || "-"],
              ["Evenementen", (r: any) => fmt(r.evenementen)],
              ["Partijen", (r: any) => fmt(r.partijen)],
              ["Bondteam(s)", (r: any) => (r.bondteams ?? []).join(", ") || "-"],
            ]}
          />
        </Section>

        <Section title="Evenementen">
          <Ranking
            title="Gala's op aantal partijen"
            rows={(data?.events?.alle ?? []).slice(0, 50)}
            columns={[
              ["Datum", (r: any) => dateNl(r.evenement_datum)],
              ["Evenement", (r: any) => r.evenement_naam],
              ["Plaats", (r: any) => r.plaats || "-"],
              ["Bondteam", (r: any) => r.bond_naam || "-"],
              ["Partijen", (r: any) => fmt(r.partijen)],
              [
                "Bron",
                (r: any) =>
                  r.partijen_bron === "uitslagen"
                    ? "Uitslagen"
                    : r.partijen_bron === "matchmaking"
                      ? "Matchmaking"
                      : "Resultaten (fallback)",
              ],
            ]}
          />
        </Section>

        <div style={s.foot}>
          Laatste FightPassport-sync:{" "}
          <b>
            {totals.laatste_sync
              ? new Date(totals.laatste_sync).toLocaleString("nl-NL")
              : "-"}
          </b>
        </div>
      </div>
    </main>
  );
}

function ExecutiveFact({ label, value, sub }: any) {
  return (
    <div style={s.executiveFact}>
      <div style={s.executiveFactLabel}>{label}</div>
      <div style={s.executiveFactValue}>{value}</div>
      <div style={s.executiveFactSub}>{sub}</div>
    </div>
  );
}

function Kpi({ icon, label, value }: any) {
  return (
    <div style={s.kpi}>
      <div style={s.kpiIcon}>{icon}</div>
      <div>
        <div style={s.kpiLabel}>{label}</div>
        <div style={s.kpiValue}>{value}</div>
      </div>
    </div>
  );
}

function Highlight({ icon, title, row }: any) {
  return (
    <div style={s.highlight}>
      <div style={s.highlightTitle}>
        {icon}
        {title}
      </div>
      {row ? (
        <>
          <div style={s.highlightName}>{row.evenement_naam}</div>
          <div style={s.highlightMeta}>
            {dateNl(row.evenement_datum)} · {row.plaats || "-"} · {row.bond_naam || "-"}
          </div>
          <div style={s.highlightValue}>{fmt(row.partijen)} partijen</div>
        </>
      ) : (
        <div style={s.muted}>Geen evenement met uitslagen in deze periode.</div>
      )}
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <section className="stats-report-card" style={s.section}>
      <h2 style={s.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

function Ranking({ title, rows, columns }: any) {
  return (
    <div style={s.tableCard}>
      <div style={s.tableTitle}>{title}</div>
      <div style={s.tableScroll}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>#</th>
              {columns.map((col: any) => (
                <th style={s.th} key={col[0]}>
                  {col[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((row: any, index: number) => {
              const zebra = index % 2 ? s.tdLight : s.tdDark;
              return (
                <tr key={`${title}-${index}`}>
                  <td style={{ ...s.td, ...zebra }}>{index + 1}</td>
                  {columns.map((col: any, cellIndex: number) => (
                    <td
                      key={`${index}-${cellIndex}`}
                      style={{ ...s.td, ...zebra }}
                    >
                      {col[1](row)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {!rows?.length && (
              <tr>
                <td
                  style={{ ...s.td, ...s.tdDark }}
                  colSpan={columns.length + 1}
                >
                  Geen gegevens in deze periode.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 50% -10%,rgba(255,77,0,.15),transparent 32%),linear-gradient(180deg,#060708,#0b0f13 52%,#050607)",
    color: "#fff",
    padding: 18,
  },
  wrap: { maxWidth: 1540, margin: "0 auto" },
  hero: {
    border: "1px solid #596169",
    borderTop: `3px solid ${ORANGE}`,
    background: "linear-gradient(145deg,#1c2228,#0b0f13 58%,#151a1f)",
    boxShadow: "0 16px 36px rgba(0,0,0,.45)",
    marginBottom: 12,
  },
  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    padding: "14px 16px",
  },
  logo: { width: 360, maxWidth: "40vw", height: 70, objectFit: "contain" },
  eyebrow: { fontSize: 10, letterSpacing: 2.2, fontWeight: 950, color: "#d8d8d8" },
  title: { margin: "2px 0", color: "#ff6a2a", fontSize: 34, fontWeight: 950 },
  sub: { color: "#aeb5bc", fontSize: 12 },
  filterbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    padding: 10,
    borderTop: "1px solid #3d444b",
    background: "#090d10",
  },
  quick: { display: "flex", gap: 7, flexWrap: "wrap", alignItems: "end" },
  dateFilters: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" },
  label: {
    display: "grid",
    gap: 4,
    fontSize: 10,
    fontWeight: 900,
    color: "#aab1b8",
    textTransform: "uppercase",
  },
  input: {
    height: 36,
    padding: "0 9px",
    background: "#080b0e",
    color: "#fff",
    border: "1px solid #636b73",
  },
  silver: {
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
    height: 36,
    padding: "0 12px",
    background: "linear-gradient(#fff,#bfc4c8)",
    color: "#111",
    border: "1px solid #90979e",
    fontWeight: 900,
    cursor: "pointer",
  },
  orange: {
    height: 36,
    padding: "0 13px",
    background: "linear-gradient(#ff7137,#dc4200)",
    color: "#fff",
    border: "1px solid #ff7a43",
    fontWeight: 900,
    cursor: "pointer",
  },
  dark: {
    height: 36,
    padding: "0 13px",
    background: "#171c21",
    color: "#fff",
    border: "1px solid #59616a",
    fontWeight: 850,
    cursor: "pointer",
  },
  error: {
    marginBottom: 12,
    padding: 11,
    border: "1px solid #a84c42",
    background: "#2b1110",
    color: "#ffd6d0",
    fontWeight: 800,
  },
  reportActions: {
    display: "flex",
    gap: 7,
    flexWrap: "wrap",
    alignItems: "end",
  },
  reportButton: {
    display: "inline-flex",
    gap: 7,
    alignItems: "center",
    height: 36,
    padding: "0 13px",
    background: "linear-gradient(180deg,#ff7a3f,#d63e00)",
    color: "#fff",
    border: "1px solid #ff9869",
    boxShadow: "0 0 16px rgba(255,77,0,.16)",
    fontWeight: 950,
    cursor: "pointer",
  },
  executive: {
    marginBottom: 11,
    padding: 14,
    border: "1px solid #757d86",
    borderTop: `3px solid ${ORANGE}`,
    background:
      "radial-gradient(circle at 85% 10%,rgba(255,77,0,.12),transparent 28%),linear-gradient(135deg,#20262d,#090d11 58%,#171c22)",
    boxShadow: "0 12px 28px rgba(0,0,0,.36), inset 0 1px rgba(255,255,255,.06)",
  },
  executiveHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  executiveEyebrow: {
    display: "flex",
    gap: 7,
    alignItems: "center",
    color: "#ff7a43",
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: 1.8,
  },
  executiveTitle: {
    margin: "5px 0 0",
    fontSize: 22,
    color: "#f4f4f4",
    letterSpacing: .4,
  },
  qualityBadge: {
    display: "flex",
    gap: 9,
    alignItems: "center",
    minWidth: 250,
    padding: "9px 11px",
    border: "1px solid rgba(225,228,232,.45)",
    background: "linear-gradient(#1e242a,#090c10)",
  },
  executiveGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 8,
  },
  executiveFact: {
    minWidth: 0,
    padding: "11px 12px",
    border: "1px solid #4b535b",
    background: "linear-gradient(180deg,#161b20,#090c10)",
  },
  executiveFactLabel: {
    color: "#9ea6ae",
    fontSize: 9,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: .9,
  },
  executiveFactValue: {
    marginTop: 5,
    color: "#f4f4f4",
    fontSize: 16,
    fontWeight: 950,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  executiveFactSub: {
    marginTop: 4,
    color: "#ff7941",
    fontSize: 10,
    fontWeight: 800,
  },
  kpis: {
    display: "grid",
    gridTemplateColumns: "repeat(6,minmax(0,1fr))",
    gap: 8,
    marginBottom: 10,
  },
  kpi: {
    display: "flex",
    gap: 9,
    alignItems: "center",
    minHeight: 68,
    padding: 10,
    border: "1px solid #555d65",
    borderTop: `3px solid ${ORANGE}`,
    background: "linear-gradient(#1a2026,#0c1014)",
  },
  kpiIcon: {
    width: 34,
    height: 34,
    display: "grid",
    placeItems: "center",
    color: "#111",
    background: "linear-gradient(#f6f6f6,#979da3)",
    border: "1px solid #dadada",
  },
  kpiLabel: {
    fontSize: 10,
    color: "#9fa7af",
    fontWeight: 900,
    textTransform: "uppercase",
  },
  kpiValue: { fontSize: 22, fontWeight: 950, marginTop: 2 },
  highlights: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 9,
    marginBottom: 10,
  },
  highlight: {
    padding: 12,
    border: "1px solid #505861",
    background: "linear-gradient(135deg,#1b2026,#0b0f12)",
  },
  highlightTitle: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    color: "#ff7440",
    fontSize: 11,
    fontWeight: 950,
    textTransform: "uppercase",
  },
  highlightName: { fontSize: 19, fontWeight: 950, marginTop: 5 },
  highlightMeta: { color: "#a9b0b7", fontSize: 12, marginTop: 2 },
  highlightValue: { fontSize: 16, fontWeight: 900, marginTop: 6 },
  muted: { color: "#9199a2", marginTop: 8 },
  section: {
    padding: 11,
    marginBottom: 10,
    border: "1px solid #434a51",
    borderLeft: `3px solid ${ORANGE}`,
    background: "linear-gradient(#11161b,#080b0e)",
  },
  sectionTitle: {
    margin: "0 0 9px",
    color: "#ff7440",
    fontSize: 19,
    fontWeight: 950,
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 8,
    marginBottom: 9,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 8,
    marginBottom: 9,
  },
  ageBox: {
    display: "grid",
    gap: 8,
    padding: 8,
    border: "1px solid #4a5158",
    background: "#0c1014",
  },
  ageTitle: { margin: 0, color: "#ff7440", fontSize: 17 },
  tableCard: {
    minWidth: 0,
    border: "1px solid #3f464d",
    background: "#0a0e11",
  },
  tableTitle: {
    padding: "7px 8px",
    background: "#171c21",
    borderBottom: "1px solid #3b4249",
    fontWeight: 950,
    fontSize: 12,
  },
  tableScroll: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: {
    textAlign: "left",
    padding: "7px 8px",
    whiteSpace: "nowrap",
    background: "#22282e",
    color: "#fff",
    borderBottom: `2px solid ${ORANGE}`,
  },
  td: { padding: "7px 8px", borderBottom: "1px solid #32383e" },
  tdDark: { background: "#10151a", color: "#f1f1f1" },
  tdLight: { background: "#e7e7e7", color: "#111" },
  foot: { padding: "7px 2px", textAlign: "right", color: "#aab1b8", fontSize: 11 },
};
