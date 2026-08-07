"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { authedFetch } from "@/lib/api/authedFetch";
import Link from "next/link";
import {
  Activity,
  Award,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Crown,
  Download,
  Dumbbell,
  Flame,
  Medal,
  Printer,
  RefreshCw,
  School,
  Shield,
  Sparkles,
  Star,
  Swords,
  Timer,
  Trophy,
  UserRound,
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
        .director-print { display: none; }
        .stats-hall-grid strong { display: block; font-size: 23px; line-height: 1; color: #f7f7f7; }
        .stats-hall-grid article span { display: block; margin-top: 4px; color: #aeb5bc; font-size: 8px; font-weight: 850; text-transform: uppercase; }

        @media print {
          @page { size: A4 landscape; margin: 0; }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #0b0d10 !important;
          }

          .stats-master-page {
            margin: 0 !important;
            padding: 0 !important;
            background: #0b0d10 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .screen-dashboard,
          .stats-no-print {
            display: none !important;
          }

          .director-print {
            display: block !important;
            width: 297mm;
            margin: 0;
            padding: 0;
            background: #0b0d10;
          }

          .director-page {
            width: 297mm;
            height: 210mm;
            box-sizing: border-box;
            overflow: hidden;
            break-after: page;
            page-break-after: always;
          }

          .director-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }

        @media (max-width: 1100px) {
          .stats-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          .stats-grid3 { grid-template-columns: 1fr !important; }
          .stats-grid2 { grid-template-columns: 1fr !important; }
          .stats-executive-grid,
          .stats-hall-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
        }

        @media (max-width: 680px) {
          .stats-master-page { padding: 8px !important; }
          .stats-hero-top {
            grid-template-columns: 1fr !important;
            justify-items: stretch !important;
            gap: 12px !important;
          }
          .stats-hero-top > div:first-child {
            justify-self: start !important;
          }
          .stats-hero-top > div:nth-child(2) {
            justify-self: center !important;
          }
          .stats-hero-top > div:nth-child(3) {
            justify-self: end !important;
          }
          .stats-logo { width: min(100%, 330px) !important; max-width: 100% !important; }
          .stats-kpis,
          .stats-executive-grid,
          .stats-highlights,
          .stats-hall-grid { grid-template-columns: 1fr !important; }
          .stats-filterbar { align-items: stretch !important; }
          .stats-date-filters { width: 100% !important; }
          .stats-date-filters label { flex: 1 1 130px !important; }
          .stats-date-filters input { width: 100% !important; }
        }
      `}</style>
      <DirectorPrintReport data={data} from={from} to={to} />

      <div className="screen-dashboard" style={s.wrap}>
        <header className="stats-print-hero" style={s.hero}>
          <div className="stats-hero-top" style={s.heroTop}>
            <div style={s.heroLeft}>
              <h1 style={s.title}>Statistiekenoverzicht</h1>
            </div>

            <div style={s.heroCenter}>
              <img
                className="stats-logo"
                src={LOGO}
                alt="FightSupport"
                style={s.logo}
              />
            </div>

            <div style={s.heroRight}>
              <Link href="/dashboard/admin" style={s.backButton}>
                <ArrowLeft size={18} strokeWidth={2.4} />
                Dashboard
              </Link>
            </div>
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

        <section className="stats-report-card" style={s.hallSection}>
          <div style={s.hallTop}>
            <div>
              <div style={s.hallEyebrow}>
                <Crown size={18} />
                FIGHTSUPPORT HALL OF FAME
              </div>
              <h2 style={s.hallTitle}>Records aller tijden</h2>
              <p style={s.hallSubtitle}>
                De absolute FightPassport-records. Deze blijven altijd aller tijden,
                ongeacht de geselecteerde periode hieronder.
              </p>
            </div>
            <div style={s.allTimeBadge}>ALL TIME</div>
          </div>

          <div className="stats-hall-grid" style={s.hallGrid}>
            <HallCard
              icon={Trophy}
              label="Meeste partijen ooit"
              value={data?.hall_of_fame?.meeste_partijen_ooit?.naam}
              stat={fmt(data?.hall_of_fame?.meeste_partijen_ooit?.partijen)}
              unit="partijen"
              detail={data?.hall_of_fame?.meeste_partijen_ooit ? `VA ${data.hall_of_fame.meeste_partijen_ooit.va_nummer}` : "-"}
            />
            <HallCard
              icon={Medal}
              label="Meeste overwinningen ooit"
              value={data?.hall_of_fame?.meeste_overwinningen_ooit?.naam}
              stat={fmt(data?.hall_of_fame?.meeste_overwinningen_ooit?.winst)}
              unit="overwinningen"
              detail={data?.hall_of_fame?.meeste_overwinningen_ooit ? `VA ${data.hall_of_fame.meeste_overwinningen_ooit.va_nummer}` : "-"}
            />
            <HallCard
              icon={Dumbbell}
              label="Meeste KO / TKO winst ooit"
              value={data?.hall_of_fame?.meeste_ko_tko_ooit?.naam}
              stat={fmt(data?.hall_of_fame?.meeste_ko_tko_ooit?.ko_tko_winst)}
              unit="KO / TKO"
              detail={data?.hall_of_fame?.meeste_ko_tko_ooit ? `VA ${data.hall_of_fame.meeste_ko_tko_ooit.va_nummer}` : "-"}
            />
            <HallCard
              icon={Flame}
              label="Langste winstreeks ooit"
              value={data?.hall_of_fame?.langste_winreeks_ooit?.naam}
              stat={fmt(data?.hall_of_fame?.langste_winreeks_ooit?.langste_winreeks)}
              unit="op rij"
              detail={data?.hall_of_fame?.langste_winreeks_ooit ? `VA ${data.hall_of_fame.langste_winreeks_ooit.va_nummer}` : "-"}
            />
            <HallCard
              icon={School}
              label="Actiefste sportschool ooit"
              value={data?.hall_of_fame?.actiefste_sportschool_ooit?.sportschool}
              stat={fmt(data?.hall_of_fame?.actiefste_sportschool_ooit?.partijdeelnames)}
              unit="partijdeelnames"
              detail={data?.hall_of_fame?.actiefste_sportschool_ooit ? `${fmt(data.hall_of_fame.actiefste_sportschool_ooit.unieke_vechters)} unieke vechters` : "-"}
            />
            <HallCard
              icon={Star}
              label="Grootste gala ooit"
              value={data?.hall_of_fame?.grootste_gala_ooit?.evenement_naam}
              stat={fmt(data?.hall_of_fame?.grootste_gala_ooit?.partijen)}
              unit="partijen"
              detail={
                data?.hall_of_fame?.grootste_gala_ooit
                  ? `${dateNl(data.hall_of_fame.grootste_gala_ooit.evenement_datum)} · ${data.hall_of_fame.grootste_gala_ooit.plaats || "-"}`
                  : "-"
              }
            />
            <HallCard
              icon={Timer}
              label="Oudste actieve vechter"
              value={data?.hall_of_fame?.oudste_actieve_vechter?.naam}
              stat={fmt(data?.hall_of_fame?.oudste_actieve_vechter?.leeftijd)}
              unit="jaar"
              detail={data?.hall_of_fame?.oudste_actieve_vechter ? `VA ${data.hall_of_fame.oudste_actieve_vechter.va_nummer}` : "-"}
            />
            <HallCard
              icon={UserRound}
              label="Jongste actieve vechter"
              value={data?.hall_of_fame?.jongste_actieve_vechter?.naam}
              stat={fmt(data?.hall_of_fame?.jongste_actieve_vechter?.leeftijd)}
              unit="jaar"
              detail={data?.hall_of_fame?.jongste_actieve_vechter ? `VA ${data.hall_of_fame.jongste_actieve_vechter.va_nummer}` : "-"}
            />
            <HallCard
              icon={Award}
              label="Official met meeste gala's"
              value={data?.hall_of_fame?.official_meeste_galas?.naam}
              stat={fmt(data?.hall_of_fame?.official_meeste_galas?.evenementen)}
              unit="gala's"
              detail={(data?.hall_of_fame?.official_meeste_galas?.functies ?? []).join(", ") || "-"}
              wide
            />
          </div>

          <div style={s.hallFoot}>
            <Shield size={14} />
            {data?.hall_of_fame?.actief_definitie || "Actief = minimaal één geregistreerde partij in de laatste 12 maanden."}
          </div>
        </section>

        <div style={s.statsDivider}>
          <span>STATISTIEKEN GESELECTEERDE PERIODE</span>
        </div>

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
            title="Top 10 meest actieve officials"
            rows={(data?.officials ?? []).slice(0, 10)}
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
            title="Alle gala's in geselecteerde periode"
            rows={data?.events?.alle ?? []}
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


function DirectorPrintReport({
  data,
  from,
  to,
}: {
  data: Stats | null;
  from: string;
  to: string;
}) {
  if (!data) return null;

  const totals = data?.totals ?? {};
  const quality = totals?.datakwaliteit ?? {};
  const topFighters = (data?.fighters?.meeste_partijen ?? []).slice(0, 10);
  const topWins = (data?.fighters?.meeste_winst ?? []).slice(0, 10);
  const topKo = (data?.fighters?.meeste_ko_tko ?? []).slice(0, 10);
  const topSchools = (data?.schools?.meeste_actieve_vechters ?? []).slice(0, 10);
  const topSchoolFights = (data?.schools?.meeste_partijen ?? []).slice(0, 10);
  const topSchoolPct = (data?.schools?.hoogste_winstpercentage ?? []).slice(0, 10);
  const bonds = (data?.bonds ?? []).slice(0, 10);
  const officials = (data?.officials ?? []).slice(0, 10);
  const events = (data?.events?.alle ?? []).slice(0, 20);

  const periodLabel =
    from || to ? `${dateNl(from)} — ${dateNl(to)}` : "Volledige FightPassport-historie";

  const authoritativeEvents =
    Number(quality.events_met_uitslagen_aantal ?? 0) +
    Number(quality.events_met_matchmaking_aantal ?? 0);

  return (
    <div className="director-print">
      <ReportPage pageNo="01" title="Managementoverzicht" subtitle={periodLabel}>
        <div style={r.heroBand}>
          <div style={r.heroMain}>
            <div style={r.heroEyebrow}>NATIONAAL TOTAAL</div>
            <div style={r.heroNumber}>{fmt(totals.partijen)}</div>
            <div style={r.heroCaption}>geregistreerde partijen</div>
          </div>
          <ReportMetric label="Evenementen" value={fmt(totals.evenementen)} />
          <ReportMetric label="Wedstrijdvechters" value={fmt(totals.wedstrijdvechters)} />
          <ReportMetric label="NL sportscholen" value={fmt(totals.nederlandse_sportscholen)} />
          <ReportMetric label="Bondteams" value={fmt(totals.bondteams)} />
          <ReportMetric label="Officials" value={fmt(totals.officials)} />
        </div>

        <div style={r.summaryCards}>
          <ReportCard
            label="Actiefste vechter"
            value={topFighters[0]?.naam ?? "-"}
            sub={topFighters[0] ? `${fmt(topFighters[0].partijen)} partijen · VA ${topFighters[0].va_nummer}` : "Geen data"}
          />
          <ReportCard
            label="Grootste wedstrijdploeg"
            value={topSchools[0]?.sportschool ?? "-"}
            sub={topSchools[0] ? `${fmt(topSchools[0].actieve_vechters)} actieve wedstrijdvechters` : "Geen data"}
          />
          <ReportCard
            label="Meest actief bondteam"
            value={bonds[0]?.bondteam ?? "-"}
            sub={bonds[0] ? `${fmt(bonds[0].partijen)} partijen · ${fmt(bonds[0].evenementen)} evenementen` : "Geen data"}
          />
          <ReportCard
            label="Datadekking eventtelling"
            value={`${fmt(authoritativeEvents)} / ${fmt(quality.totaal_events ?? totals.evenementen)}`}
            sub={`${fmt(quality.events_met_resultaten_fallback ?? 0)} evenementen via resultaten-fallback`}
          />
        </div>

        <div style={r.twoWide}>
          <ReportEventHighlight title="Grootste gala" row={totals.grootste_gala} />
          <ReportEventHighlight title="Kleinste gala" row={totals.kleinste_gala} />
        </div>

        <div style={r.callout}>
          <strong>Databron:</strong> FightPassport. Voor aantallen partijen per evenement wordt eerst
          Uitslagen gebruikt, daarna Matchmaking en alleen wanneer beide ontbreken de
          gededupliceerde FightPassport-resultaten.
        </div>
      </ReportPage>

      <ReportPage pageNo="02" title="Hall of Fame" subtitle="Historische FightPassport-records · aller tijden">
        <div style={r.threeTables}>
          <PrintHallTile title="Meeste partijen ooit" row={data?.hall_of_fame?.meeste_partijen_ooit} valueKey="partijen" unit="partijen" />
          <PrintHallTile title="Meeste overwinningen ooit" row={data?.hall_of_fame?.meeste_overwinningen_ooit} valueKey="winst" unit="overwinningen" />
          <PrintHallTile title="Meeste KO / TKO ooit" row={data?.hall_of_fame?.meeste_ko_tko_ooit} valueKey="ko_tko_winst" unit="KO / TKO" />
          <PrintHallTile title="Langste winstreeks ooit" row={data?.hall_of_fame?.langste_winreeks_ooit} valueKey="langste_winreeks" unit="op rij" />
          <PrintHallTile title="Oudste actieve vechter" row={data?.hall_of_fame?.oudste_actieve_vechter} valueKey="leeftijd" unit="jaar" />
          <PrintHallTile title="Jongste actieve vechter" row={data?.hall_of_fame?.jongste_actieve_vechter} valueKey="leeftijd" unit="jaar" />
        </div>
        <div style={{ ...r.twoWide, marginTop: "4mm" }}>
          <ReportCard
            label="Actiefste sportschool ooit"
            value={data?.hall_of_fame?.actiefste_sportschool_ooit?.sportschool ?? "-"}
            sub={data?.hall_of_fame?.actiefste_sportschool_ooit ? `${fmt(data.hall_of_fame.actiefste_sportschool_ooit.partijdeelnames)} partijdeelnames · ${fmt(data.hall_of_fame.actiefste_sportschool_ooit.unieke_vechters)} unieke vechters` : "Geen data"}
          />
          <ReportCard
            label="Official met meeste gala's"
            value={data?.hall_of_fame?.official_meeste_galas?.naam ?? "-"}
            sub={data?.hall_of_fame?.official_meeste_galas ? `${fmt(data.hall_of_fame.official_meeste_galas.evenementen)} gala's · ${(data.hall_of_fame.official_meeste_galas.functies ?? []).join(", ")}` : "Geen data"}
          />
        </div>
        <div style={{ marginTop: "4mm" }}>
          <ReportEventHighlight title="Grootste gala ooit" row={data?.hall_of_fame?.grootste_gala_ooit} />
        </div>
      </ReportPage>

      <ReportPage pageNo="03" title="Wedstrijdvechters" subtitle="Topprestaties in de geselecteerde periode">
        <div style={r.threeTables}>
          <PrintRanking
            title="Meeste partijen"
            rows={topFighters}
            columns={[
              ["Vechter", (x: any) => x.naam],
              ["VA", (x: any) => x.va_nummer],
              ["Partijen", (x: any) => fmt(x.partijen)],
            ]}
          />
          <PrintRanking
            title="Meeste winstpartijen"
            rows={topWins}
            columns={[
              ["Vechter", (x: any) => x.naam],
              ["VA", (x: any) => x.va_nummer],
              ["Winst", (x: any) => fmt(x.winst)],
            ]}
          />
          <PrintRanking
            title="Meeste KO / TKO winst"
            rows={topKo}
            columns={[
              ["Vechter", (x: any) => x.naam],
              ["VA", (x: any) => x.va_nummer],
              ["KO/TKO", (x: any) => fmt(x.ko_tko_winst)],
            ]}
          />
        </div>

        <div style={r.twoWide}>
          <CompactTop
            title="Jeugd · meeste partijen"
            rows={(data?.fighters?.jeugd?.meeste_partijen ?? []).slice(0, 5)}
          />
          <CompactTop
            title="Volwassenen · meeste partijen"
            rows={(data?.fighters?.volwassenen?.meeste_partijen ?? []).slice(0, 5)}
          />
        </div>
      </ReportPage>

      <ReportPage pageNo="04" title="Sportscholen & bondteams" subtitle="Organisaties met de grootste wedstrijdbijdrage">
        <div style={r.threeTables}>
          <PrintRanking
            title="Meeste actieve vechters"
            rows={topSchools}
            columns={[
              ["Sportschool", (x: any) => x.sportschool],
              ["Vechters", (x: any) => fmt(x.actieve_vechters)],
              ["Partijen", (x: any) => fmt(x.partijen)],
            ]}
          />
          <PrintRanking
            title="Meeste partijen"
            rows={topSchoolFights}
            columns={[
              ["Sportschool", (x: any) => x.sportschool],
              ["Partijen", (x: any) => fmt(x.partijen)],
              ["Winst", (x: any) => fmt(x.winst)],
            ]}
          />
          <PrintRanking
            title="Hoogste winstpercentage"
            rows={topSchoolPct}
            columns={[
              ["Sportschool", (x: any) => x.sportschool],
              ["Partijen", (x: any) => fmt(x.partijen)],
              ["Winst %", (x: any) => pct(x.winstpercentage)],
            ]}
          />
        </div>

        <div style={{ marginTop: 6 }}>
          <PrintRanking
            title="Officialteams / bonden"
            rows={bonds}
            columns={[
              ["Bondteam", (x: any) => x.bondteam],
              ["Evenementen", (x: any) => fmt(x.evenementen)],
              ["Partijen begeleid", (x: any) => fmt(x.partijen)],
              ["Officials", (x: any) => fmt(x.officials)],
            ]}
          />
        </div>
      </ReportPage>

      <ReportPage pageNo="05" title="Evenementen" subtitle="Grootste gala's en activiteit per evenement">
        <PrintRanking
          title="Top 20 gala's op aantal partijen"
          rows={events}
          columns={[
            ["Datum", (x: any) => dateNl(x.evenement_datum)],
            ["Evenement", (x: any) => x.evenement_naam],
            ["Plaats", (x: any) => x.plaats || "-"],
            ["Bondteam", (x: any) => x.bond_naam || "-"],
            ["Partijen", (x: any) => fmt(x.partijen)],
            [
              "Bron",
              (x: any) =>
                x.partijen_bron === "uitslagen"
                  ? "Uitslagen"
                  : x.partijen_bron === "matchmaking"
                    ? "Matchmaking"
                    : "Resultaten",
            ],
          ]}
          dense
        />
      </ReportPage>

      <ReportPage pageNo="06" title="Officials" subtitle="Meest actieve officials in de geselecteerde periode">
        <PrintRanking
          title="Officialactiviteit"
          rows={officials}
          columns={[
            ["Official", (x: any) => x.naam],
            ["Functie(s)", (x: any) => (x.functies ?? []).join(", ") || "-"],
            ["Evenementen", (x: any) => fmt(x.evenementen)],
            ["Partijen", (x: any) => fmt(x.partijen)],
            ["Bondteam(s)", (x: any) => (x.bondteams ?? []).join(", ") || "-"],
          ]}
        />

        <div style={r.reportFooterNote}>
          Laatste FightPassport-sync:{" "}
          <strong>
            {totals.laatste_sync
              ? new Date(totals.laatste_sync).toLocaleString("nl-NL")
              : "-"}
          </strong>
        </div>
      </ReportPage>
    </div>
  );
}

function ReportPage({
  pageNo,
  title,
  subtitle,
  children,
}: {
  pageNo: string;
  title: string;
  subtitle: string;
  children: any;
}) {
  return (
    <section className="director-page" style={r.page}>
      <div style={r.header}>
        <div>
          <div style={r.kicker}>FIGHTSUPPORT · FIGHTPASSPORT INTELLIGENCE</div>
          <h1 style={r.pageTitle}>{title}</h1>
          <div style={r.pageSub}>{subtitle}</div>
        </div>
        <img src={LOGO} alt="FightSupport" style={r.logo} />
      </div>
      <div style={r.rule} />
      <div style={r.body}>{children}</div>
      <div style={r.footer}>
        <span>FIGHTSUPPORT · NATIONAAL STATISTIEKRAPPORT</span>
        <span>{pageNo}</span>
      </div>
    </section>
  );
}

function PrintHallTile({
  title,
  row,
  valueKey,
  unit,
}: {
  title: string;
  row: any;
  valueKey: string;
  unit: string;
}) {
  return (
    <div style={r.card}>
      <div style={r.cardLabel}>{title}</div>
      <div style={r.cardValue}>{row?.naam ?? "-"}</div>
      <div style={{ marginTop: "2mm", fontSize: 21, fontWeight: 950, color: "#ff6d30" }}>
        {fmt(row?.[valueKey])}
      </div>
      <div style={r.cardSub}>{unit}{row?.va_nummer ? ` · VA ${row.va_nummer}` : ""}</div>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={r.metric}>
      <div style={r.metricValue}>{value}</div>
      <div style={r.metricLabel}>{label}</div>
    </div>
  );
}

function ReportCard({ label, value, sub }: any) {
  return (
    <div style={r.card}>
      <div style={r.cardLabel}>{label}</div>
      <div style={r.cardValue}>{value}</div>
      <div style={r.cardSub}>{sub}</div>
    </div>
  );
}

function ReportEventHighlight({ title, row }: any) {
  return (
    <div style={r.eventCard}>
      <div style={r.eventLabel}>{title}</div>
      <div style={r.eventName}>{row?.evenement_naam ?? "-"}</div>
      <div style={r.eventMeta}>
        {row
          ? `${dateNl(row.evenement_datum)} · ${row.plaats || "-"} · ${row.bond_naam || "-"}`
          : "Geen data"}
      </div>
      <div style={r.eventCount}>{row ? `${fmt(row.partijen)} partijen` : "-"}</div>
    </div>
  );
}

function CompactTop({ title, rows }: any) {
  return (
    <div style={r.compactBox}>
      <div style={r.tableTitle}>{title}</div>
      {(rows ?? []).map((row: any, i: number) => (
        <div key={`${title}-${i}`} style={r.compactRow}>
          <strong style={r.rankNo}>{i + 1}</strong>
          <span style={r.compactName}>{row.naam}</span>
          <span style={r.compactVa}>VA {row.va_nummer}</span>
          <strong>{fmt(row.partijen)}</strong>
        </div>
      ))}
    </div>
  );
}

function PrintRanking({
  title,
  rows,
  columns,
  dense = false,
}: {
  title: string;
  rows: any[];
  columns: any[];
  dense?: boolean;
}) {
  return (
    <div style={r.tableBox}>
      <div style={r.tableTitle}>{title}</div>
      <table style={{ ...r.table, fontSize: dense ? 8.6 : 9.2 }}>
        <thead>
          <tr>
            <th style={r.th}>#</th>
            {columns.map((col: any) => (
              <th key={col[0]} style={r.th}>{col[0]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((row: any, index: number) => (
            <tr key={`${title}-${index}`}>
              <td style={{ ...r.td, ...(index % 2 ? r.light : r.dark) }}>{index + 1}</td>
              {columns.map((col: any, i: number) => (
                <td key={i} style={{ ...r.td, ...(index % 2 ? r.light : r.dark) }}>
                  {col[1](row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const r: Record<string, CSSProperties> = {
  page: {
    position: "relative",
    padding: "10mm 12mm 9mm",
    color: "#f4f4f4",
    background:
      "radial-gradient(circle at 88% 0%,rgba(255,77,0,.13),transparent 26%),linear-gradient(150deg,#1c2127,#090c10 58%,#15191e)",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    height: "25mm",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },
  kicker: {
    color: "#aeb4ba",
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: 2,
  },
  pageTitle: {
    margin: "2mm 0 0",
    color: "#ff5b16",
    fontSize: 25,
    lineHeight: 1,
    textTransform: "uppercase",
    letterSpacing: .5,
  },
  pageSub: {
    marginTop: 4,
    color: "#d0d3d6",
    fontSize: 9,
  },
  logo: {
    width: "61mm",
    height: "18mm",
    objectFit: "contain",
  },
  rule: {
    height: 3,
    background: "linear-gradient(90deg,#ff4d00,#d8dde2 52%,#ff4d00)",
    boxShadow: "0 0 8px rgba(255,77,0,.45)",
  },
  body: {
    height: "158mm",
    paddingTop: "5mm",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  footer: {
    position: "absolute",
    left: "12mm",
    right: "12mm",
    bottom: "5mm",
    display: "flex",
    justifyContent: "space-between",
    borderTop: "1px solid rgba(255,255,255,.18)",
    paddingTop: "2.5mm",
    color: "#8f969d",
    fontSize: 7,
    letterSpacing: 1,
  },
  heroBand: {
    display: "grid",
    gridTemplateColumns: "2fr repeat(5,1fr)",
    minHeight: "38mm",
    border: "1px solid #626a72",
    background: "linear-gradient(180deg,#1c2228,#090c10)",
  },
  heroMain: {
    padding: "5mm",
    borderRight: "1px solid #4d555d",
  },
  heroEyebrow: {
    color: "#ff6d30",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: 1.4,
  },
  heroNumber: {
    marginTop: "2mm",
    fontSize: 33,
    lineHeight: 1,
    fontWeight: 950,
  },
  heroCaption: {
    marginTop: "2mm",
    color: "#b7bdc2",
    fontSize: 8,
  },
  metric: {
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    borderRight: "1px solid #4d555d",
    textAlign: "center",
    padding: "2mm",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 950,
  },
  metricLabel: {
    marginTop: 3,
    color: "#ff6d30",
    fontSize: 7.5,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  summaryCards: {
    marginTop: "5mm",
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: "3mm",
  },
  card: {
    minHeight: "28mm",
    padding: "4mm",
    border: "1px solid #565e66",
    borderTop: "2px solid #ff4d00",
    background: "linear-gradient(180deg,#191f25,#090c10)",
  },
  cardLabel: {
    color: "#aeb5bc",
    fontSize: 7,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: .7,
  },
  cardValue: {
    marginTop: "2mm",
    fontSize: 14,
    fontWeight: 950,
  },
  cardSub: {
    marginTop: "2mm",
    color: "#ff7540",
    fontSize: 8,
  },
  twoWide: {
    marginTop: "5mm",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "4mm",
  },
  eventCard: {
    padding: "4mm",
    minHeight: "30mm",
    border: "1px solid #535b63",
    background: "linear-gradient(135deg,#171c21,#080b0e)",
  },
  eventLabel: {
    color: "#ff6f38",
    fontSize: 8,
    fontWeight: 950,
    textTransform: "uppercase",
  },
  eventName: {
    marginTop: "2mm",
    fontSize: 14,
    fontWeight: 950,
  },
  eventMeta: {
    marginTop: "1.5mm",
    color: "#b6bcc2",
    fontSize: 8,
  },
  eventCount: {
    marginTop: "2mm",
    fontSize: 11,
    fontWeight: 900,
  },
  callout: {
    marginTop: "5mm",
    padding: "3mm 4mm",
    borderLeft: "3px solid #ff4d00",
    background: "#0a0d10",
    color: "#c6cbd0",
    fontSize: 8,
    lineHeight: 1.45,
  },
  threeTables: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: "3mm",
  },
  tableBox: {
    minWidth: 0,
    border: "1px solid #525a62",
    background: "#0a0e11",
    overflow: "hidden",
  },
  tableTitle: {
    padding: "2.5mm 3mm",
    color: "#ff6d30",
    fontSize: 9,
    fontWeight: 950,
    textTransform: "uppercase",
    background: "#171c21",
    borderBottom: "1px solid #4f565d",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "auto",
  },
  th: {
    padding: "1.7mm 2mm",
    textAlign: "left",
    background: "#242a30",
    color: "#fff",
    borderBottom: "2px solid #ff4d00",
    whiteSpace: "nowrap",
    fontWeight: 900,
  },
  td: {
    padding: "1.5mm 2mm",
    borderBottom: "1px solid #353c42",
    lineHeight: 1.2,
  },
  dark: {
    background: "#10151a",
    color: "#f0f0f0",
  },
  light: {
    background: "#d9dde1",
    color: "#111",
  },
  compactBox: {
    border: "1px solid #535b63",
    background: "#0a0e11",
  },
  compactRow: {
    minHeight: "7.5mm",
    display: "grid",
    gridTemplateColumns: "8mm 1fr 24mm 12mm",
    alignItems: "center",
    gap: "2mm",
    padding: "0 3mm",
    borderBottom: "1px solid #343b42",
    fontSize: 8.5,
  },
  rankNo: {
    color: "#ff6d30",
  },
  compactName: {
    fontWeight: 900,
  },
  compactVa: {
    color: "#aab1b8",
  },
  reportFooterNote: {
    marginTop: "5mm",
    padding: "4mm",
    borderLeft: "3px solid #ff4d00",
    background: "#0a0d10",
    color: "#bec4ca",
    fontSize: 9,
  },
};

function HallCard({
  icon: Icon,
  label,
  value,
  stat,
  unit,
  detail,
  wide = false,
}: any) {
  return (
    <article style={{ ...s.hallCard, ...(wide ? s.hallCardWide : {}) }}>
      <div style={s.hallCardShine} />
      <div style={s.hallIcon}>
        <Icon size={24} strokeWidth={2.1} />
      </div>
      <div style={s.hallCardContent}>
        <div style={s.hallCardLabel}>{label}</div>
        <div style={s.hallCardValue}>{value || "-"}</div>
        <div style={s.hallCardDetail}>{detail || "-"}</div>
      </div>
      <div style={s.hallStatBox}>
        <strong>{stat}</strong>
        <span>{unit}</span>
      </div>
    </article>
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
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 18,
    padding: "14px 16px",
  },
  heroLeft: {
    minWidth: 0,
    justifySelf: "start",
  },
  heroCenter: {
    justifySelf: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  heroRight: {
    justifySelf: "end",
    display: "flex",
    alignItems: "center",
  },
  logo: { width: 360, maxWidth: "40vw", height: 70, objectFit: "contain" },
  eyebrow: { fontSize: 10, letterSpacing: 2.2, fontWeight: 950, color: "#d8d8d8" },
  title: {
    margin: 0,
    color: "#ff6a2a",
    fontSize: 34,
    fontWeight: 950,
    whiteSpace: "nowrap",
  },
  sub: { color: "#aeb5bc", fontSize: 12 },
  backButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 40,
    padding: "0 15px",
    border: "1px solid #80878e",
    background: "linear-gradient(180deg,#f6f6f6 0%,#b9bec3 48%,#e7e9eb 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.9),0 5px 13px rgba(0,0,0,.28)",
    color: "#111",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 950,
    whiteSpace: "nowrap",
  },
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
  hallSection: {
    marginBottom: 14,
    padding: 16,
    border: "1px solid #737b84",
    borderTop: `4px solid ${ORANGE}`,
    background:
      "radial-gradient(circle at 92% 0%,rgba(255,77,0,.19),transparent 23%),radial-gradient(circle at 10% 100%,rgba(206,214,224,.08),transparent 28%),linear-gradient(145deg,#242a31,#090d11 54%,#171c22)",
    boxShadow: "0 18px 36px rgba(0,0,0,.42), inset 0 1px rgba(255,255,255,.08)",
  },
  hallTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    marginBottom: 13,
    paddingBottom: 11,
    borderBottom: "1px solid rgba(220,225,230,.22)",
  },
  hallEyebrow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#ff743b",
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: 2.1,
  },
  hallTitle: {
    margin: "4px 0 0",
    fontSize: 28,
    lineHeight: 1,
    color: "#f4f4f4",
    textTransform: "uppercase",
    letterSpacing: .6,
  },
  hallSubtitle: {
    margin: "7px 0 0",
    color: "#afb6bd",
    fontSize: 11,
  },
  allTimeBadge: {
    padding: "10px 16px",
    border: "1px solid #c2c7cc",
    background: "linear-gradient(180deg,#f7f7f7,#9da4ab 45%,#eceeef)",
    color: "#121416",
    fontWeight: 950,
    fontSize: 11,
    letterSpacing: 1.8,
    boxShadow: "0 0 18px rgba(255,255,255,.08), inset 0 1px #fff",
  },
  hallGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,minmax(0,1fr))",
    gap: 10,
  },
  hallCard: {
    position: "relative",
    minWidth: 0,
    minHeight: 116,
    display: "grid",
    gridTemplateColumns: "48px minmax(0,1fr) auto",
    alignItems: "center",
    gap: 10,
    padding: "12px 12px 11px",
    border: "1px solid #59616a",
    borderLeft: `3px solid ${ORANGE}`,
    background:
      "linear-gradient(120deg,rgba(255,255,255,.09),transparent 22%),linear-gradient(180deg,#1a2026,#090c10 72%,#151a20)",
    boxShadow: "inset 0 1px rgba(255,255,255,.07),0 10px 20px rgba(0,0,0,.28)",
    overflow: "hidden",
  },
  hallCardWide: {
    gridColumn: "span 2",
  },
  hallCardShine: {
    position: "absolute",
    left: "18%",
    right: "18%",
    top: -5,
    height: 10,
    background: "radial-gradient(circle,rgba(255,255,255,.65),rgba(255,255,255,.08) 45%,transparent 70%)",
    opacity: .42,
  },
  hallIcon: {
    width: 46,
    height: 46,
    display: "grid",
    placeItems: "center",
    color: "#f2f2f2",
    clipPath: "polygon(50% 0,90% 22%,90% 78%,50% 100%,10% 78%,10% 22%)",
    background:
      "linear-gradient(145deg,rgba(255,255,255,.30),transparent 30%),linear-gradient(160deg,#8f969f,#343a42 34%,#0a0d11 70%,#4c545d)",
    boxShadow: "0 0 0 1px rgba(255,255,255,.10),0 0 14px rgba(255,77,0,.10)",
  },
  hallCardContent: {
    minWidth: 0,
  },
  hallCardLabel: {
    color: "#ff7440",
    fontSize: 9,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: .65,
  },
  hallCardValue: {
    marginTop: 5,
    color: "#f5f5f5",
    fontSize: 14,
    fontWeight: 950,
    lineHeight: 1.15,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  hallCardDetail: {
    marginTop: 5,
    color: "#aeb5bc",
    fontSize: 9.5,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  hallStatBox: {
    minWidth: 62,
    textAlign: "right",
    paddingLeft: 9,
    borderLeft: "1px solid rgba(255,255,255,.12)",
  },
  hallFoot: {
    marginTop: 10,
    display: "flex",
    alignItems: "center",
    gap: 7,
    color: "#9ca4ac",
    fontSize: 9,
  },
  statsDivider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "17px 0 11px",
    color: "#ff6d30",
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: 2,
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
