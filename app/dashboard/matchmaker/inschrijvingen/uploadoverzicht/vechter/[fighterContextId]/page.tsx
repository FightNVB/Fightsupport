"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Inter, Bebas_Neue } from "next/font/google";
import { supabase } from "@/lib/supabaseClient";

type FighterContext = {
  id: number;
  created_at: string | null;
  updated_at: string | null;

  matchmaker_matchmaking_id: number | null;
  inschrijving_id: number | null;

  discipline: string | null;
  klasse: string | null;
  geslacht: string | null;

  voornaam: string | null;
  achternaam: string | null;

  naam_input: string | null;
  gym_input: string | null;
  geboortedatum_input: string | null; // jouw schema zegt date; supabase kan als string terugkomen

  gewicht: number | null;
  va_nummer: string | null;

  fp_naam: string | null;
  fp_geboortedatum: string | null; // date
  fp_gym: string | null;
  fp_klasse: string | null;

  record_w: number | null;
  record_l: number | null;
  record_d: number | null;

  naam_match: boolean | null;
  geboortedatum_match: boolean | null;
  gym_match: boolean | null;

  uitslagen_count: number | null;
  laatste_partij_datum: string | null; // date

  extra: any | null; // jsonb
  nulmeting_opmerking: string | null;

  heeft_keurmerk: string | null; // bijv "ja"/"nee" of label
};

const inter = Inter({ subsets: ["latin"], weight: ["500", "600", "700"] });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400" });

const NVB_ORANGE = "#ff4d00";

// ====== Styles ======
function fightSupportTitleText(): CSSProperties {
  return {
    background:
      "linear-gradient(180deg, #ffffff 0%, #f4f4f4 18%, #dcdcdc 38%, #bfbfbf 55%, #f8f8f8 75%, #9a9a9a 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textShadow: "0 2px 12px rgba(255,255,255,0.18)",
  };
}

function metalText(): CSSProperties {
  return {
    background:
      "linear-gradient(180deg, #f7f7f7 0%, #d7d7d7 22%, #9f9f9f 52%, #f1f1f1 70%, #6f6f6f 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  };
}

function metalFrameStyle(): CSSProperties {
  const accentGlow =
    "radial-gradient(680px 340px at 50% 0%, rgba(255,77,0,0.18), transparent 62%)";
  const brushed =
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 4px)";
  const sheen =
    "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 24%, rgba(255,255,255,0) 48%, rgba(255,255,255,0.10) 70%, rgba(255,255,255,0) 100%)";

  return {
    border: "5px solid rgba(10,10,12,0.92)",
    borderRadius: 22,
    background: `${accentGlow}, ${sheen}, ${brushed}, linear-gradient(180deg, #3a3d44 0%, #1f2025 52%, #0a0b0e 100%)`,
    boxShadow:
      "0 26px 70px rgba(0,0,0,0.70)," +
      " inset 0 0 0 2px rgba(255,255,255,0.14)," +
      " inset 0 0 0 4px rgba(180,180,190,0.18)," +
      " inset 0 0 0 7px rgba(0,0,0,0.55)," +
      " inset 0 1px 0 rgba(255,255,255,0.22)," +
      " inset 0 -18px 24px rgba(0,0,0,0.65)",
  };
}

function metalInnerStyle(): CSSProperties {
  return {
    border: "3px solid rgba(0,0,0,0.45)",
    borderRadius: 16,
    background:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, rgba(255,255,255,0.025) 1px, rgba(255,255,255,0.025) 6px)," +
      " linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(233,236,240,0.98) 100%)",
    boxShadow:
      "inset 0 0 0 2px rgba(255,255,255,0.70)," +
      " inset 0 0 0 6px rgba(0,0,0,0.10)," +
      " inset 0 -12px 22px rgba(0,0,0,0.12)",
  };
}

function sectionTitleStyle(): CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: "2px solid rgba(0,0,0,0.35)",
    background:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 6px)," +
      "linear-gradient(180deg, #2f3239 0%, #111215 100%)",
    color: "white",
    fontWeight: 900,
    letterSpacing: 0.4,
    boxShadow: "0 10px 22px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
  };
}

function pillStyle(kind: "ok" | "warn" | "bad" | "info"): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.3,
    border: "1px solid rgba(0,0,0,0.35)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  if (kind === "ok")
    return { ...base, background: "linear-gradient(180deg, #1f6f3a 0%, #0f3a1e 100%)", color: "white" };
  if (kind === "warn")
    return { ...base, background: "linear-gradient(180deg, #8b5a00 0%, #3b2700 100%)", color: "white" };
  if (kind === "bad")
    return { ...base, background: "linear-gradient(180deg, #9a1b1b 0%, #3b0a0a 100%)", color: "white" };
  return { ...base, background: "linear-gradient(180deg, #30333a 0%, #15171b 100%)", color: "white" };
}

// ====== Helpers ======
function safeJson(input: any): any {
  if (input == null) return null;
  if (typeof input === "object") return input;
  if (typeof input !== "string") return input;
  const s = input.trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return input;
  }
}

function fmtKg(v: any): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `${n.toFixed(1)} KG`.replace(".0", "");
}

function fmtDate(v: any): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("nl-NL");
}

function asYes(v: any): boolean {
  if (v == null) return false;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "ja" || s === "yes" || s === "y";
}

function zebraRowStyle(isDark: boolean): CSSProperties {
  return {
    background: isDark ? "#3a3d44" : "#ffffff",
    color: isDark ? "#ffffff" : "#111111",
    borderBottom: "1px solid rgba(0,0,0,0.10)",
  };
}

function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2" style={{ borderBottom: "1px solid rgba(0,0,0,0.10)" }}>
      <div className="text-sm font-extrabold text-zinc-800">{label}</div>
      <div className="text-sm font-extrabold text-zinc-950 text-right">{value}</div>
    </div>
  );
}

function BulletBlock({ title, data, emptyText }: { title: string; data: any; emptyText: string }) {
  const parsed = useMemo(() => safeJson(data), [data]);

  const lines: string[] = useMemo(() => {
    if (!parsed) return [];
    if (Array.isArray(parsed)) return parsed.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
    if (typeof parsed === "string") return [parsed];
    return [JSON.stringify(parsed)];
  }, [parsed]);

  return (
    <div className="rounded-2xl p-3" style={metalInnerStyle()}>
      <div style={sectionTitleStyle()}>{title}</div>
      <div className="mt-3 text-sm font-semibold text-zinc-900">
        {lines.length === 0 ? (
          <div className="opacity-80">{emptyText}</div>
        ) : (
          <ul className="list-disc pl-5 space-y-2">
            {lines.map((t, i) => (
              <li key={i} className="leading-snug">
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function MatchmakerFighterContextPage() {
  const router = useRouter();
  const params = useParams<{ fighterContextId: string }>();
  const fighterContextId = String(params?.fighterContextId ?? "");

  const [row, setRow] = useState<FighterContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("matchmaker_fighter_context")
        .select("*")
        .eq("id", fighterContextId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setErr(error.message);
        setRow(null);
      } else {
        setRow((data as FighterContext) ?? null);
      }
      setLoading(false);
    }

    if (fighterContextId) run();
    else {
      setErr("Geen fighterContextId in route.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [fighterContextId]);

  const fullName = useMemo(() => {
    if (!row) return "ONBEKENDE VECHTER";
    const a = String(row.achternaam ?? "").trim();
    const v = String(row.voornaam ?? "").trim();
    if (v || a) return `${v} ${a}`.trim().toUpperCase();
    const ni = String(row.naam_input ?? "").trim();
    return (ni || "ONBEKENDE VECHTER").toUpperCase();
  }, [row]);

  const subLine = useMemo(() => {
    if (!row) return "—";
    const k = row.klasse ?? "—";
    const w = fmtKg(row.gewicht);
    return `${k} — ${w}`;
  }, [row]);

  const recordStr = useMemo(() => {
    if (!row) return "—";
    const w = row.record_w ?? 0;
    const l = row.record_l ?? 0;
    const d = row.record_d ?? 0;
    // als alles null was (kan), toon —
    if (row.record_w == null && row.record_l == null && row.record_d == null) return "—";
    return `${w} - ${l} - ${d}`;
  }, [row]);

  const naamMatch = !!row?.naam_match;
  const dobMatch = !!row?.geboortedatum_match;
  const gymMatch = !!row?.gym_match;
  const keurmerk = asYes(row?.heeft_keurmerk);

  return (
    <div className={`${inter.className} min-h-screen`} style={{ background: "linear-gradient(180deg, #0b0c0f 0%, #15161a 40%, #0b0c0f 100%)" }}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-[26px] p-4 md:p-6" style={metalFrameStyle()}>
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="px-3 py-2 rounded-xl text-xs font-black text-white active:scale-95"
                style={{
                  background: "linear-gradient(180deg, #ff6200 0%, #cc3d00 100%)",
                  boxShadow: "0 12px 26px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
                  border: "1px solid rgba(0,0,0,0.35)",
                }}
                title="Terug"
              >
                ← TERUG
              </button>

              <div className="hidden sm:flex items-center gap-2">
                <div className={`${bebas.className} text-2xl tracking-[0.10em]`} style={fightSupportTitleText()}>
                  FIGHT<span style={{ color: NVB_ORANGE, WebkitTextFillColor: "unset" }}>SUPPORT</span>
                </div>
                <div
                  className="h-[2px] w-16 rounded-full"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,77,0,0.9), transparent)" }}
                />
              </div>
            </div>

            {/* Quick meta */}
            <div className="text-right text-xs font-extrabold text-zinc-200/80">
              <div>
                MM ID: <span className="text-white">{row?.matchmaker_matchmaking_id ?? "—"}</span>
              </div>
              <div>
                Inschrijving: <span className="text-white">{row?.inschrijving_id ?? "—"}</span>
              </div>
            </div>
          </div>

          {/* Title strip */}
          <div className="mt-4 rounded-2xl p-4" style={metalInnerStyle()}>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <div className="text-3xl md:text-4xl font-black tracking-wide" style={metalText()}>
                  {fullName}
                </div>
                <div className="mt-1 text-sm font-extrabold text-zinc-900 opacity-85">
                  {subLine} • {row?.discipline ?? "—"} • {row?.geslacht ?? "—"}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                <span style={pillStyle(naamMatch ? "ok" : "warn")}>{naamMatch ? "✓ NAAM MATCH" : "⚠ NAAM CHECK"}</span>
                <span style={pillStyle(dobMatch ? "ok" : "warn")}>{dobMatch ? "✓ GEBOORTEDATUM MATCH" : "⚠ GEBOORTEDATUM CHECK"}</span>
                <span style={pillStyle(gymMatch ? "ok" : "warn")}>{gymMatch ? "✓ GYM MATCH" : "⚠ GYM CHECK"}</span>
                <span style={pillStyle(keurmerk ? "ok" : "info")}>{keurmerk ? "✓ KEURMERK GYM" : "• GEEN KEURMERK"}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="mt-4 rounded-2xl p-6 text-white font-extrabold" style={{ ...metalInnerStyle(), background: "linear-gradient(180deg, #2b2e35 0%, #15171b 100%)" }}>
              Laden…
            </div>
          ) : err ? (
            <div className="mt-4 rounded-2xl p-6 text-white font-extrabold" style={{ ...metalInnerStyle(), background: "linear-gradient(180deg, #6b1414 0%, #2b0a0a 100%)" }}>
              Fout: {err}
            </div>
          ) : !row ? (
            <div className="mt-4 rounded-2xl p-6 text-white font-extrabold" style={{ ...metalInnerStyle(), background: "linear-gradient(180deg, #2b2e35 0%, #15171b 100%)" }}>
              Geen data gevonden in matchmaker_fighter_context.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl p-4" style={metalInnerStyle()}>
                  <div className="flex items-start gap-4">
                    {/* Avatar circle */}
                    <div
                      className="relative shrink-0"
                      style={{
                        width: 170,
                        height: 170,
                        borderRadius: 999,
                        border: "6px solid rgba(0,0,0,0.55)",
                        boxShadow:
                          "0 18px 40px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,255,255,0.22), inset 0 0 0 6px rgba(180,180,190,0.12)",
                        background:
                          "radial-gradient(circle at 50% 45%, rgba(255,77,0,0.25), transparent 55%), linear-gradient(180deg, #2d2f36 0%, #111214 100%)",
                        overflow: "hidden",
                      }}
                      title="Placeholder (handschoenen)"
                    >
                      <Image
                        src="/logo_fightsupport.png"
                        alt="FightSupport"
                        fill
                        priority
                        style={{ objectFit: "cover", transform: "scale(1.06)" }}
                      />
                    </div>

                    <div className="flex-1">
                      <div style={sectionTitleStyle()}>Invoer (matchmaker)</div>
                      <div className="mt-3">
                        <FieldRow label="Naam (input)" value={row.naam_input ?? "—"} />
                        <FieldRow label="Gym (input)" value={row.gym_input ?? "—"} />
                        <FieldRow label="Geboortedatum (input)" value={row.geboortedatum_input ? fmtDate(row.geboortedatum_input) : "—"} />
                        <FieldRow label="Gewicht" value={fmtKg(row.gewicht)} />
                        <FieldRow label="VA nummer" value={row.va_nummer ?? "—"} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl p-3" style={metalInnerStyle()}>
                    <div style={sectionTitleStyle()}>FightPassport (gevonden)</div>
                    <div className="mt-3">
                      <FieldRow label="FP naam" value={row.fp_naam ?? "—"} />
                      <FieldRow label="FP geboortedatum" value={row.fp_geboortedatum ? fmtDate(row.fp_geboortedatum) : "—"} />
                      <FieldRow label="FP gym" value={row.fp_gym ?? "—"} />
                      <FieldRow label="FP klasse" value={row.fp_klasse ?? "—"} />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-2xl p-3" style={metalInnerStyle()}>
                      <div style={sectionTitleStyle()}>Record</div>
                      <div className="mt-3 text-2xl font-black text-zinc-950">{recordStr}</div>
                      <div className="text-xs font-extrabold text-zinc-700 mt-1">W - L - D</div>
                    </div>

                    <div className="rounded-2xl p-3" style={metalInnerStyle()}>
                      <div style={sectionTitleStyle()}>Uitslagen</div>
                      <div className="mt-3 text-2xl font-black text-zinc-950">{row.uitslagen_count ?? 0}x</div>
                      <div className="text-xs font-extrabold text-zinc-700 mt-1">
                        Laatste partij: {row.laatste_partij_datum ? fmtDate(row.laatste_partij_datum) : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl p-3" style={metalInnerStyle()}>
                    <div style={sectionTitleStyle()}>Nulmeting opmerking</div>
                    <div className="mt-3 text-sm font-extrabold text-zinc-950">
                      {row.nulmeting_opmerking?.trim() ? row.nulmeting_opmerking : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="lg:col-span-7 space-y-4">
                <div className="rounded-2xl p-3" style={metalInnerStyle()}>
                  <div style={sectionTitleStyle()}>Extra</div>

                  {/* Extra is jsonb -> netjes tonen */}
                  <div className="mt-3 overflow-hidden rounded-xl" style={{ border: "2px solid rgba(0,0,0,0.18)" }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: "linear-gradient(180deg, #e9ecef 0%, #cfd4da 100%)" }}>
                          <th className="text-left px-3 py-2 font-black text-zinc-900">Key</th>
                          <th className="text-left px-3 py-2 font-black text-zinc-900">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const parsed = safeJson(row.extra);
                          if (!parsed) {
                            return (
                              <tr style={zebraRowStyle(false)}>
                                <td className="px-3 py-3 font-extrabold" colSpan={2}>
                                  Geen extra velden
                                </td>
                              </tr>
                            );
                          }

                          // array -> index rows, object -> key rows, string -> 1 row
                          const entries: Array<[string, any]> = Array.isArray(parsed)
                            ? parsed.map((v, i) => [String(i), v])
                            : typeof parsed === "object"
                            ? Object.entries(parsed)
                            : [["waarde", parsed]];

                          return entries.map(([k, v], idx) => {
                            const dark = idx % 2 === 1;
                            return (
                              <tr key={k} style={zebraRowStyle(dark)}>
                                <td className="px-3 py-2 font-extrabold">{k}</td>
                                <td className="px-3 py-2 font-extrabold">
                                  {typeof v === "string" ? v : JSON.stringify(v)}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Je vroeg ook om: licentie/startverbod/uitslagen etc.
                    Die staan (nog) niet in jouw matchmaker_fighter_context schema.
                    Daarom geef ik “ruimte” voor wanneer je later kolommen toevoegt. */}
                <BulletBlock
                  title="Meldingen"
                  data={null}
                  emptyText="(Nog niet gekoppeld) — voeg bv. jsonb kolom 'meldingen' toe of haal ze uit jouw rules/controle tabel."
                />
                <BulletBlock
                  title="Verschillen"
                  data={null}
                  emptyText="(Nog niet gekoppeld) — voeg bv. jsonb kolom 'verschillen' toe of bereken op basis van *_match velden."
                />

                {/* Mini: “verschillen automatisch” op basis van match flags */}
                <div className="rounded-2xl p-3" style={metalInnerStyle()}>
                  <div style={sectionTitleStyle()}>Match analyse</div>
                  <div className="mt-3 text-sm font-semibold text-zinc-950">
                    <ul className="list-disc pl-5 space-y-2">
                      {!naamMatch ? <li>Naam wijkt af tussen input en FightPassport.</li> : null}
                      {!dobMatch ? <li>Geboortedatum wijkt af tussen input en FightPassport.</li> : null}
                      {!gymMatch ? <li>Gym wijkt af tussen input en FightPassport.</li> : null}
                      {naamMatch && dobMatch && gymMatch ? <li>Geen afwijkingen gevonden op naam/geboortedatum/gym.</li> : null}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 text-center text-xs font-bold text-zinc-300 opacity-70">
            Data bron: <span className="font-black">matchmaker_fighter_context</span> • id:{" "}
            <span className="font-black">{fighterContextId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}