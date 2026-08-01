"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Search, Swords, TimerReset } from "lucide-react";

type BoutStatus = "concept" | "bevestigd" | "onder_voorbehoud";

type Bout = {
  id: string;
  partijNr: number | null;
  klasse: string;
  geslacht: string;
  discipline: string;
  maxGewicht: string;
  status: BoutStatus;
  red: { naam: string; sportschool: string; record: string };
  blue: { naam: string; sportschool: string; record: string };
};

type SearchingFighter = {
  id: string;
  naam: string;
  sportschool: string;
  record: string;
  klasse: string;
  geslacht: string;
  leeftijd: number | null;
  gewicht: string;
};

type Payload = {
  event: {
    title: string;
    date: string;
    location: string;
    disciplines: string;
    phase: string;
    updatedAt: string;
  };
  counts: { total: number; confirmed: number; pending: number; searching: number };
  bouts: Bout[];
  searching: SearchingFighter[];
};

type FilterKey = "all" | "bevestigd" | "concept" | "tegenstander_gezocht";

const labels: Record<FilterKey, string> = {
  all: "Alle partijen",
  bevestigd: "Bevestigd",
  concept: "Concept",
  tegenstander_gezocht: "Tegenstander gezocht",
};

function dateLabel(value: string) {
  if (!value) return "Datum volgt";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function updateLabel(value: string) {
  if (!value) return "Zojuist";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function statusLabel(status: BoutStatus) {
  if (status === "bevestigd") return "Bevestigd";
  if (status === "onder_voorbehoud") return "Onder voorbehoud";
  return "Concept";
}

export default function PublicMatchmakingClient({ token }: { token: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(
          `/api/public/matchmaking/${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        const json = await response.json();
        if (!response.ok) throw new Error(json?.error || "Matchmaking laden mislukt");
        if (active) {
          setData(json);
          setError("");
        }
      } catch (e: any) {
        if (active) setError(e?.message || "Matchmaking laden mislukt");
      }
    }

    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [token]);

  const visibleBouts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.bouts ?? []).filter((bout) => {
      if (filter !== "all" && filter !== "tegenstander_gezocht" && bout.status !== filter) {
        return false;
      }
      if (!q) return true;
      return [
        bout.red.naam,
        bout.red.sportschool,
        bout.red.record,
        bout.blue.naam,
        bout.blue.sportschool,
        bout.blue.record,
        bout.klasse,
        bout.geslacht,
        bout.maxGewicht,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data, filter, query]);

  const visibleSearching = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.searching ?? []).filter((fighter) => {
      if (!q) return true;
      return [
        fighter.naam,
        fighter.sportschool,
        fighter.record,
        fighter.klasse,
        fighter.geslacht,
        fighter.leeftijd,
        fighter.gewicht,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data, query]);

  if (error) {
    return (
      <main className="pm-state">
        <div>
          <b>Openbare matchmaking niet beschikbaar</b>
          <span>{error}</span>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="pm-state">
        <div>
          <b>Matchmaking laden…</b>
          <span>De actuele partijen worden opgehaald.</span>
        </div>
      </main>
    );
  }

  const counts: Record<FilterKey, number> = {
    all: data.counts.total,
    bevestigd: data.counts.confirmed,
    concept: data.bouts.filter((bout) => bout.status === "concept").length,
    tegenstander_gezocht: data.counts.searching,
  };

  const isSearching = filter === "tegenstander_gezocht";

  return (
    <main className="pm-page">
      <section className="pm-hero">
        <div className="pm-heroShade" />
        <div className="pm-brand">
          <img src="/branding/fightsupport/logo-header.png" alt="FightSupport" />
        </div>
        <div className="pm-heroContent">
          <div className="pm-kicker">
            <Swords size={15} /> {data.event.phase}
          </div>
          <h1>{data.event.title}</h1>
          <div className="pm-meta">
            <span>
              <CalendarDays size={16} /> {dateLabel(data.event.date)}
            </span>
            <span>
              <MapPin size={16} /> {data.event.location || "Locatie volgt"}
            </span>
            {data.event.disciplines && (
              <span>
                <Swords size={16} /> {data.event.disciplines}
              </span>
            )}
          </div>
          <div className="pm-update">
            <TimerReset size={15} /> Laatste update: {updateLabel(data.event.updatedAt)}
          </div>
        </div>
        <div className="pm-stats">
          <Stat label="Totaal partijen" value={data.counts.total} />
          <Stat label="Bevestigd" value={data.counts.confirmed} kind="ok" />
          <Stat label="Onder voorbehoud" value={data.counts.pending} kind="pending" />
          <Stat label="Tegenstander gezocht" value={data.counts.searching} kind="searching" />
        </div>
      </section>

      <section className="pm-content">
        <div className="pm-toolbar">
          <div className="pm-tabs">
            {(Object.keys(labels) as FilterKey[]).map((key) => (
              <button
                key={key}
                className={filter === key ? "active" : ""}
                onClick={() => setFilter(key)}
              >
                {labels[key]} <span>{counts[key]}</span>
              </button>
            ))}
          </div>
          <label className="pm-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isSearching
                  ? "Zoek naam, sportschool, klasse, gewicht…"
                  : "Zoek naam, sportschool, record…"
              }
            />
          </label>
        </div>

        {isSearching ? (
          <SearchingTable fighters={visibleSearching} />
        ) : (
          <BoutTable bouts={visibleBouts} />
        )}

        <div className="pm-disclaimer">
          Dit is een voorlopige matchmaking. Partijen kunnen nog wijzigen totdat ze officieel zijn bevestigd.
        </div>
      </section>

      <footer>
        Powered by <b>FightSupport</b> · Professional Combat Sports Management
      </footer>
    </main>
  );
}

function BoutTable({ bouts }: { bouts: Bout[] }) {
  return (
    <div className="pm-tableWrap">
      <table className="pm-boutTable">
        <thead>
          <tr>
            <th className="col-nr">#</th>
            <th className="col-class">K</th>
            <th className="col-gender">M/V</th>
            <th>Rode hoek</th>
            <th className="weight">Max gewicht</th>
            <th>Blauwe hoek</th>
            <th className="col-status">Status</th>
          </tr>
        </thead>
        <tbody>
          {bouts.map((bout) => (
            <tr key={bout.id || String(bout.partijNr)}>
              <td className="nr">{bout.partijNr ?? "-"}</td>
              <td className="compact">{bout.klasse}</td>
              <td className="compact">{bout.geslacht}</td>
              <td>
                <Fighter side="red" fighter={bout.red} />
              </td>
              <td className="maxWeight">
                <strong>{bout.maxGewicht}</strong>
                <span>MAX GEWICHT</span>
              </td>
              <td>
                <Fighter side="blue" fighter={bout.blue} />
              </td>
              <td className="statusCell">
                <span className={`status ${bout.status}`}>{statusLabel(bout.status)}</span>
              </td>
            </tr>
          ))}
          {!bouts.length && (
            <tr>
              <td colSpan={7} className="empty">
                Geen partijen binnen deze selectie.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SearchingTable({ fighters }: { fighters: SearchingFighter[] }) {
  return (
    <div className="pm-tableWrap pm-searchingWrap">
      <table className="pm-searchingTable">
        <thead>
          <tr>
            <th>Naam</th>
            <th>Sportschool</th>
            <th>Record</th>
            <th className="col-class">Klasse</th>
            <th className="col-gender">M/V</th>
            <th className="col-age">Leeftijd</th>
            <th className="col-weight">Gewicht</th>
          </tr>
        </thead>
        <tbody>
          {fighters.map((fighter) => (
            <tr key={fighter.id}>
              <td className="search-name">{fighter.naam}</td>
              <td>{fighter.sportschool}</td>
              <td className="search-record">{fighter.record}</td>
              <td className="compact">{fighter.klasse}</td>
              <td className="compact">{fighter.geslacht}</td>
              <td className="compact">{fighter.leeftijd ?? "—"}</td>
              <td className="compact search-weight">{fighter.gewicht}</td>
            </tr>
          ))}
          {!fighters.length && (
            <tr>
              <td colSpan={7} className="empty">
                Geen vechters binnen deze selectie.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Fighter({ side, fighter }: { side: "red" | "blue"; fighter: Bout["red"] }) {
  return (
    <div className={`fighter ${side}`}>
      <strong>{fighter.naam}</strong>
      <span>
        {fighter.sportschool}
        <i>•</i>
        {fighter.record}
      </span>
    </div>
  );
}

function Stat({ label, value, kind = "" }: { label: string; value: number; kind?: string }) {
  return (
    <div className={`pm-stat ${kind}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
