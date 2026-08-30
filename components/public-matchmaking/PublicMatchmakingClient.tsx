"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, MapPin, Swords, TimerReset } from "lucide-react";

type Bout = {
  id: string;
  partijNr: number | null;
  klasse: string;
  geslacht: string;
  discipline: string;
  maxGewicht: string;
  rondeTijden?: string;
  red: { naam: string; sportschool: string };
  blue: { naam: string; sportschool: string };
};

type Payload = {
  audience?: "promoter" | "trainers";
  event: {
    title: string;
    date: string;
    location: string;
    disciplines: string;
    phase: string;
    updatedAt: string;
    galaDuur?: string;
  };
  counts: { total: number };
  bouts: Bout[];
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

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

function hasValue(value: unknown) {
  const valueString = clean(value);
  return Boolean(valueString && valueString !== "—" && valueString !== "-");
}

export default function PublicMatchmakingClient({ token }: { token: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await fetch(
        `/api/public/matchmaking/${encodeURIComponent(token)}`,
        { cache: "no-store" },
      );
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Line-up laden mislukt");
      setData(json);
      setError("");
    } catch (e: any) {
      setError(e?.message || "Line-up laden mislukt");
    } finally {
      // Geen publieke handmatige refresh nodig; opnieuw laden gebeurt vanuit matchmaking.
    }
  }

  useEffect(() => {
    load();
    // Bewust geen automatische interval: publicatie/verversing gebeurt vanuit matchmaking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const bouts = useMemo(() => data?.bouts ?? [], [data]);
  const showMaxWeight = useMemo(
    () => bouts.some((bout) => hasValue(bout.maxGewicht)),
    [bouts],
  );

  if (error) {
    return (
      <main className="pm-state">
        <div>
          <b>Line-up niet beschikbaar</b>
          <span>{error}</span>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="pm-state">
        <div>
          <b>Line-up laden…</b>
          <span>De actuele partijen worden opgehaald.</span>
        </div>
      </main>
    );
  }

  return (
    <main className="pm-page">
      <section className="pm-hero">
        <div className="pm-heroShade" />
        <div className="pm-brand">
          <img src="/branding/fightsupport/logo-header.png" alt="FightSupport" />
        </div>

        <div className="pm-heroContent">
          <div className="pm-kicker">
            <Swords size={15} /> Line-up
          </div>
          <h1>{data.event.title}</h1>
          <div className="pm-meta">
            <span><CalendarDays size={16} /> {dateLabel(data.event.date)}</span>
            <span><MapPin size={16} /> {data.event.location || "Locatie volgt"}</span>
            {data.event.disciplines && (
              <span><Swords size={16} /> {data.event.disciplines}</span>
            )}
          </div>
          <div className="pm-update">
            <TimerReset size={15} /> Laatste update: {updateLabel(data.event.updatedAt)}
          </div>
        </div>

        <div className="pm-lineupCount">
          <strong>{bouts.length}</strong>
          <span>{bouts.length === 1 ? "partij" : "partijen"}</span>
        </div>
      </section>

      <section className="pm-content">
        <div className="pm-sectionHead">
          <div>
            <span className="pm-sectionEyebrow">Fightcard</span>
            <h2>Line-up</h2>
          </div>
          <div className="pm-sectionActions">
            <p>De gepubliceerde volgorde en partijgegevens.</p>
            {data.event.galaDuur && (
              <div className="pm-galaDuration" title="Geschatte gala-duur op basis van de gepubliceerde partijen">
                <Clock3 size={16} />
                <span>Gala duur</span>
                <strong>{data.event.galaDuur}</strong>
              </div>
            )}
          </div>
        </div>

        <BoutTable bouts={bouts} showMaxWeight={showMaxWeight} />

        <div className="pm-disclaimer">
          {data.audience === "trainers"
            ? "Dit is de laatst gepubliceerde line-up. Nieuwe wijzigingen verschijnen na een volgende publicatie."
            : "Dit is de laatst gepubliceerde line-up."}
        </div>
      </section>

      <footer>
        Powered by <b>FightSupport</b> · Professional Combat Sports Management
      </footer>
    </main>
  );
}

function BoutTable({ bouts, showMaxWeight }: { bouts: Bout[]; showMaxWeight: boolean }) {
  const colSpan = showMaxWeight ? 8 : 7;

  return (
    <div className="pm-tableWrap">
      <table className="pm-boutTable">
        <thead>
          <tr>
            <th className="col-discipline">Discipline</th>
            <th className="col-class">Klasse</th>
            <th className="col-gender">M/V</th>
            <th className="col-fighter">Naam <span>Sportschool</span></th>
            <th className="col-vs">VS</th>
            <th className="col-fighter">Naam <span>Sportschool</span></th>
            {showMaxWeight && <th className="col-weight">Max gewicht</th>}
            <th className="col-rounds">Rondetijden</th>
          </tr>
        </thead>
        <tbody>
          {bouts.map((bout) => (
            <tr key={bout.id || String(bout.partijNr)}>
              <td className="disciplineCell">
                <strong>{bout.discipline || "—"}</strong>
                {bout.partijNr != null && <span className="boutNumber">Partij {bout.partijNr}</span>}
              </td>
              <td className="compact classCell">{bout.klasse || "—"}</td>
              <td className="compact genderCell">{bout.geslacht || "—"}</td>
              <td className="fighterCell fighterRed">
                <strong>{bout.red?.naam || "—"}</strong>
                <span>{bout.red?.sportschool || "—"}</span>
              </td>
              <td className="vsCell"><span>VS</span></td>
              <td className="fighterCell fighterBlue">
                <strong>{bout.blue?.naam || "—"}</strong>
                <span>{bout.blue?.sportschool || "—"}</span>
              </td>
              {showMaxWeight && (
                <td className="weightCell">
                  {hasValue(bout.maxGewicht) ? <strong>{bout.maxGewicht}</strong> : <span>—</span>}
                </td>
              )}
              <td className="roundsCell"><strong>{bout.rondeTijden || "—"}</strong></td>
            </tr>
          ))}
          {!bouts.length && (
            <tr>
              <td colSpan={colSpan} className="empty">Nog geen partijen in deze line-up.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
