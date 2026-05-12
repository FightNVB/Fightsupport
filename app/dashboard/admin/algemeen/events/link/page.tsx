"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  Link2,
  CalendarDays,
  Swords,
  UserRound,
  FileSpreadsheet,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const ORANGE = "#ff4d00";
const BORDER = "#2a2f36";

type EventRow = {
  id: string;
  naam: string;
  datum: string;
  locatie: string | null;
  status: string | null;
  bondteam?: string | null;
  promotor?: string | null;
  matchmaker?: string | null;
  hoofdofficial?: string | null;
};

type MatchmakingRow = {
  id: string;
  naam?: string | null;
  datum?: string | null;
  locatie?: string | null;
  status?: string | null;
  bondteam?: string | null;
  promotor?: string | null;
  matchmaker?: string | null;
  hoofdofficial?: string | null;
  bron_type?: string | null;
  stadium?: string | null;
  created_at?: string | null;
  last_updated_at?: string | null;
  event_id?: string | null;
  matchmaking_upload_id?: string | null;
};

const PAGE_BG: CSSProperties = {
  minHeight: "100vh",
  background: `
    radial-gradient(circle at 18% 0%, rgba(255,77,0,0.12) 0%, transparent 26%),
    radial-gradient(circle at 82% 18%, rgba(255,255,255,0.06) 0%, transparent 24%),
    linear-gradient(180deg, #0f1216 0%, #1b2027 45%, #0f1216 100%)
  `,
  color: "#fff",
};

const SHELL_OUTER: CSSProperties = {
  background:
    "linear-gradient(180deg,#f8f8f8 0%, #d7d7d7 18%, #8a8a8a 55%, #efefef 100%)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
};

const SHELL_INNER: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(32,37,45,0.98) 0%, rgba(20,24,30,0.98) 100%)",
  border: "3px solid rgba(95,105,118,0.55)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
};

const LIGHT_PANEL: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(245,247,250,0.98) 0%, rgba(229,233,238,0.98) 100%)",
  border: "2px solid rgba(95,105,118,0.55)",
  boxShadow:
    "0 16px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.8)",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={PAGE_BG} className="px-4 py-6">
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="rounded-[34px] p-[7px]" style={SHELL_OUTER}>
          <div className="overflow-hidden rounded-[28px]" style={SHELL_INNER}>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

function SilverButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-extrabold transition hover:brightness-105 active:translate-y-[1px]"
      style={{
        color: "#111",
        border: "1px solid rgba(120,120,120,0.95)",
        background:
          "linear-gradient(180deg,#ffffff 0%, #ececec 18%, #cfcfcf 40%, #f7f7f7 58%, #a9a9a9 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,1), inset 0 -2px 2px rgba(0,0,0,0.32), 0 8px 18px rgba(0,0,0,0.28)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function OrangeButton({
  label,
  onClick,
  icon,
  disabled,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-[12px] px-5 py-2.5 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 hover:brightness-105 active:translate-y-[1px]"
      style={{
        color: "#fff",
        border: `2px solid ${BORDER}`,
        background:
          "linear-gradient(180deg,#ff7a2a 0%, #ff4d00 50%, #b83200 100%)",
        boxShadow:
          "0 12px 24px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -10px 18px rgba(0,0,0,0.18)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Header({
  onBack,
  onDashboard,
}: {
  onBack: () => void;
  onDashboard: () => void;
}) {
  return (
    <div
      className="relative px-6 py-5"
      style={{
        background:
          "linear-gradient(180deg, #3b4149 0%, #242a31 48%, #171b20 100%)",
        borderBottom: "3px solid rgba(255,77,0,0.5)",
        boxShadow: "0 12px 30px rgba(0,0,0,0.28)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-10"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,77,0,0.18) 35%, rgba(255,77,0,0.06) 65%, transparent 100%)",
        }}
      />

      <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto_1fr]">
        <div className="justify-self-start">
          <div
            className="font-extrabold uppercase"
            style={{
              fontSize: 28,
              letterSpacing: "0.05em",
              color: ORANGE,
              textShadow: "0 6px 18px rgba(0,0,0,0.45)",
            }}
          >
            Events koppelen
          </div>
          <div className="mt-1 text-sm text-white/75">
            Koppel matchmakings aan evenementen
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SilverButton
              label="Terug"
              icon={<ArrowLeft size={16} strokeWidth={2.7} />}
              onClick={onBack}
            />
            <SilverButton
              label="Naar dashboard"
              icon={<LayoutDashboard size={16} strokeWidth={2.7} />}
              onClick={onDashboard}
            />
          </div>
        </div>

        <div className="justify-self-center">
          <img
            src="/branding/fightsupport/excel-logo.png"
            alt="FightSupport"
            loading="eager"
            style={{
              width: 240,
              maxWidth: "80vw",
              height: "auto",
              display: "block",
              filter:
                "drop-shadow(0 10px 20px rgba(0,0,0,0.45)) drop-shadow(0 0 10px rgba(255,77,0,0.10))",
            }}
          />
        </div>

        <div className="justify-self-end text-right">
          <div
            className="font-extrabold tracking-[0.20em]"
            style={{
              fontSize: 14,
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(230,230,230,0.74) 35%, rgba(150,150,150,0.55) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 8px 22px rgba(0,0,0,0.35)",
            }}
          >
            FIGHTSUPPORT
          </div>
          <div className="text-xs text-white/70">Vechtsport ondersteuning</div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] p-5" style={LIGHT_PANEL}>
      <div className="mb-4 flex items-start gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-[12px]"
          style={{
            background:
              "linear-gradient(180deg, #ff6b22 0%, #ff4d00 55%, #b93200 100%)",
            color: "#fff",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.22), 0 8px 18px rgba(255,77,0,0.16)",
          }}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-lg font-extrabold" style={{ color: "#111" }}>
            {title}
          </div>
          {subtitle ? (
            <div className="text-sm" style={{ color: "#56606d" }}>
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>

      <div
        className="mb-4 h-[4px] w-full rounded-full"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,77,0,0.95) 0%, rgba(255,77,0,0.18) 48%, rgba(0,0,0,0.08) 100%)",
        }}
      />

      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-1 text-[12px] font-extrabold uppercase tracking-[0.10em]"
      style={{ color: "#36404d" }}
    >
      {children}
    </div>
  );
}

function inputStyle(): CSSProperties {
  return {
    width: "100%",
    borderRadius: 12,
    padding: "10px 12px",
    background: "#fff",
    border: "2px solid rgba(43,49,56,0.90)",
    color: "#000",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
  };
}

function asText(v: unknown) {
  const s = String(v ?? "").trim();
  return s || "";
}

function normalizeForCompare(v?: string | null) {
  return asText(v).toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreMatchmakingToEvent(matchmaking: MatchmakingRow, event: EventRow) {
  let score = 0;

  const mmNaam = normalizeForCompare(matchmaking.naam);
  const evNaam = normalizeForCompare(event.naam);

  const mmDatum = normalizeForCompare(matchmaking.datum);
  const evDatum = normalizeForCompare(event.datum);

  const mmLocatie = normalizeForCompare(matchmaking.locatie);
  const evLocatie = normalizeForCompare(event.locatie);

  if (mmNaam && evNaam && mmNaam === evNaam) score += 100;
  else if (mmNaam && evNaam && (mmNaam.includes(evNaam) || evNaam.includes(mmNaam))) score += 60;

  if (mmDatum && evDatum && mmDatum === evDatum) score += 40;
  if (mmLocatie && evLocatie && mmLocatie === evLocatie) score += 20;

  return score;
}

export default function LinkEventsPage() {
  const router = useRouter();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [matchmakings, setMatchmakings] = useState<MatchmakingRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const [eventsRes, matchmakingsRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, naam, datum, locatie, status, bondteam, promotor, matchmaker, hoofdofficial")
          .order("datum", { ascending: false }),
        supabase
          .from("matchmakings")
          .select("id, naam, datum, locatie, status, bondteam, promotor, matchmaker, hoofdofficial, bron_type, stadium, created_at, last_updated_at, event_id, matchmaking_upload_id")
          .order("datum", { ascending: false }),
      ]);

      if (eventsRes.error) throw new Error(eventsRes.error.message);
      if (matchmakingsRes.error) throw new Error(matchmakingsRes.error.message);

      setEvents((eventsRes.data ?? []) as EventRow[]);
      setMatchmakings((matchmakingsRes.data ?? []) as MatchmakingRow[]);
    } catch (e: any) {
      setErr(e?.message || "Laden mislukt");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function linkMatchmaking(matchmakingId: string) {
    if (!selectedEventId) {
      setErr("Kies eerst een evenement");
      return;
    }

    setSaving(true);
    setErr(null);

    try {
      const { error } = await supabase
        .from("matchmakings")
        .update({
          event_id: selectedEventId,
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", matchmakingId);

      if (error) throw new Error(error.message);

      await load();
    } catch (e: any) {
      setErr(e?.message || "Koppelen mislukt");
    } finally {
      setSaving(false);
    }
  }

  async function saveEventPatch(patch: Partial<EventRow>) {
    if (!selectedEventId) return;

    setSaving(true);
    setErr(null);

    try {
      const { error } = await supabase
        .from("events")
        .update(patch)
        .eq("id", selectedEventId);

      if (error) throw new Error(error.message);

      await load();
    } catch (e: any) {
      setErr(e?.message || "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  const openMatchmakings = useMemo(() => {
    return matchmakings.filter((m) => !asText(m.event_id));
  }, [matchmakings]);

  const sortedOpenMatchmakings = useMemo(() => {
    if (!selectedEvent) return openMatchmakings;

    return [...openMatchmakings].sort((a, b) => {
      const aScore = scoreMatchmakingToEvent(a, selectedEvent);
      const bScore = scoreMatchmakingToEvent(b, selectedEvent);

      if (bScore !== aScore) return bScore - aScore;

      const aDate = asText(a.datum);
      const bDate = asText(b.datum);
      if (aDate !== bDate) return aDate.localeCompare(bDate);

      return asText(a.naam).localeCompare(asText(b.naam));
    });
  }, [openMatchmakings, selectedEvent]);

  return (
    <Shell>
      <Header
        onBack={() => router.back()}
        onDashboard={() => router.push("/dashboard/admin")}
      />

      <div className="px-4 py-6 md:px-6">
        <div
          className="rounded-[24px] p-5 md:p-6"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(239,242,246,0.98) 100%)",
            border: "2px solid rgba(95,105,118,0.40)",
            boxShadow:
              "0 18px 36px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.88)",
          }}
        >
          <div className="text-center">
            <h1
              className="text-4xl font-extrabold md:text-5xl"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, #ff7a1a 0%, #ff4d00 45%, #c92c00 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                textShadow:
                  "0 2px 0 rgba(255,255,255,0.35), 0 8px 22px rgba(0,0,0,0.18)",
              }}
            >
              Events koppelen
            </h1>
            <p className="mt-2 text-sm md:text-base" style={{ color: "#55606d" }}>
              Koppel openstaande matchmakings zonder event_id aan een event
            </p>
          </div>

          {err ? (
            <div
              className="mt-5 rounded-[18px] border px-4 py-3 text-sm font-semibold"
              style={{
                background: "rgba(220,38,38,0.10)",
                color: "#991b1b",
                borderColor: "rgba(220,38,38,0.28)",
              }}
            >
              {err}
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard
              title="1) Kies event"
              subtitle="Selecteer een evenement en vul ontbrekende info aan"
              icon={<CalendarDays size={22} strokeWidth={2.4} />}
            >
              <div>
                <FieldLabel>Event</FieldLabel>
                <select
                  style={inputStyle()}
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  disabled={loading || saving}
                >
                  <option value="">— kies —</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.naam} — {e.datum}
                      {e.locatie ? ` — ${e.locatie}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEvent ? (
                <div className="mt-5">
                  <div
                    className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.10em]"
                    style={{ color: "#36404d" }}
                  >
                    Missende info aanvullen
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <FieldLabel>Promotor</FieldLabel>
                      <FieldOnBlur
                        value={selectedEvent.promotor ?? ""}
                        onBlurSave={(v) => saveEventPatch({ promotor: v || null })}
                      />
                    </div>

                    <div>
                      <FieldLabel>Matchmaker</FieldLabel>
                      <FieldOnBlur
                        value={selectedEvent.matchmaker ?? ""}
                        onBlurSave={(v) => saveEventPatch({ matchmaker: v || null })}
                      />
                    </div>

                    <div>
                      <FieldLabel>Hoofdofficial</FieldLabel>
                      <FieldOnBlur
                        value={selectedEvent.hoofdofficial ?? ""}
                        onBlurSave={(v) =>
                          saveEventPatch({ hoofdofficial: v || null })
                        }
                      />
                    </div>
                  </div>

                  {saving ? (
                    <div className="mt-3 text-sm" style={{ color: "#667282" }}>
                      Bezig…
                    </div>
                  ) : null}
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              title="2) Matchmakings zonder event"
              subtitle="Koppel openstaande matchmakings aan het gekozen evenement"
              icon={<Swords size={22} strokeWidth={2.4} />}
            >
              <div
                className="overflow-x-auto rounded-[18px]"
                style={{
                  border: "2px solid rgba(43,49,56,0.90)",
                  background: "#fff",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
                }}
              >
                <table className="min-w-full border-collapse text-sm">
                  <thead
                    style={{
                      background:
                        "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                      color: "#fff",
                      borderBottom: "2px solid rgba(255,77,0,0.55)",
                    }}
                  >
                    <tr>
                      <th className="px-4 py-3 text-left">Matchmaking</th>
                      <th className="px-4 py-3 text-left">Info</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actie</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedOpenMatchmakings.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-6 text-center"
                          style={{ background: "#ffffff", color: "#667282" }}
                        >
                          Geen openstaande matchmakings zonder event_id.
                        </td>
                      </tr>
                    ) : (
                      sortedOpenMatchmakings.map((m, idx) => {
                        const zebra = idx % 2 === 0;
                        const hintScore = selectedEvent
                          ? scoreMatchmakingToEvent(m, selectedEvent)
                          : 0;

                        return (
                          <tr
                            key={m.id}
                            style={{
                              backgroundColor: zebra ? "#ffffff" : "#0d0d0d",
                              color: zebra ? "#000" : "#fff",
                            }}
                          >
                            <td className="px-4 py-3 align-top">
                              <div className="font-bold">{m.naam || "—"}</div>
                              <div
                                className="text-xs"
                                style={{
                                  color: zebra
                                    ? "#667282"
                                    : "rgba(255,255,255,0.70)",
                                }}
                              >
                                {m.id}
                              </div>
                            </td>

                            <td className="px-4 py-3 align-top">
                              <div>{m.datum || "—"}</div>
                              <div
                                className="text-sm"
                                style={{
                                  color: zebra
                                    ? "#667282"
                                    : "rgba(255,255,255,0.70)",
                                }}
                              >
                                {m.locatie || "—"}
                              </div>
                              <div
                                className="mt-1 text-xs"
                                style={{
                                  color: zebra
                                    ? "#667282"
                                    : "rgba(255,255,255,0.70)",
                                }}
                              >
                                Bondteam: {m.bondteam || "—"}
                                {m.bron_type ? ` • ${m.bron_type}` : ""}
                              </div>

                              {selectedEvent && hintScore > 0 ? (
                                <div
                                  className="mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-extrabold"
                                  style={{
                                    background: zebra
                                      ? "rgba(255,77,0,0.10)"
                                      : "rgba(255,255,255,0.12)",
                                    color: zebra ? "#c2410c" : "#fff",
                                    border: `1px solid ${
                                      zebra
                                        ? "rgba(255,77,0,0.20)"
                                        : "rgba(255,255,255,0.18)"
                                    }`,
                                  }}
                                >
                                  Waarschijnlijk goede match
                                </div>
                              ) : null}
                            </td>

                            <td className="px-4 py-3 align-top">
                              <div>{m.status || "—"}</div>
                              <div
                                className="text-sm"
                                style={{
                                  color: zebra
                                    ? "#667282"
                                    : "rgba(255,255,255,0.70)",
                                }}
                              >
                                {m.stadium || "—"}
                              </div>
                            </td>

                            <td className="px-4 py-3 align-top">
                              <OrangeButton
                                disabled={!selectedEventId || saving}
                                onClick={() => linkMatchmaking(m.id)}
                                icon={<Link2 size={15} strokeWidth={2.7} />}
                                label="Koppel"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div
                className="mt-3 inline-flex items-center gap-2 rounded-[14px] px-3 py-2 text-xs"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(236,239,243,0.95) 100%)",
                  color: "#56606d",
                  border: "1px solid rgba(95,105,118,0.28)",
                }}
              >
                <FileSpreadsheet size={14} strokeWidth={2.5} />
                Matchmakings zonder <span className="font-mono font-bold">event_id</span> kunnen hier alsnog aan een event gekoppeld worden.
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function FieldOnBlur({
  value,
  onBlurSave,
}: {
  value: string;
  onBlurSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);

  useEffect(() => setV(value), [value]);

  return (
    <div className="relative">
      <UserRound
        size={16}
        strokeWidth={2.5}
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: "#53606f",
        }}
      />
      <input
        style={{ ...inputStyle(), paddingLeft: 36 }}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          if (v !== value) onBlurSave(v.trim());
        }}
      />
    </div>
  );
}