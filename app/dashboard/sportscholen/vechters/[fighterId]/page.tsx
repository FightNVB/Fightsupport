"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Dumbbell,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  User,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Uitslag = {
  id?: string;
  datum?: string | null;
  evenement?: string | null;
  tegenstander?: string | null;
  uitslag?: string | null;
  discipline?: string | null;
  klasse?: string | null;
  gewicht?: string | number | null;
  sportschool?: string | null;
};

type Sportschool = {
  sportschool_id?: string | number | null;
  naam?: string | null;
  plaats?: string | null;
  land?: string | null;
  keurmerk_start?: string | null;
  keurmerk_einde?: string | null;
};

function safe(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function parseRaw(raw: any) {
  if (!raw) return {} as any;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return {} as any;
  }
}

function formatDate(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}


function calculateAge(
  geboorteDatum?: string | null,
) {
  const s = String(geboorteDatum ?? "").trim();
  if (!s) return "-";

  const dob = new Date(s);
  if (Number.isNaN(dob.getTime())) return "-";

  const now = new Date();

  let age = now.getFullYear() - dob.getFullYear();

  const m = now.getMonth() - dob.getMonth();

  if (
    m < 0 ||
    (m === 0 && now.getDate() < dob.getDate())
  ) {
    age--;
  }

  return `${age} jaar`;
}


function yes(
  value: any,
  positiveWords = ["ja", "yes", "true", "ok", "geldig", "actief"],
) {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  return value === true || positiveWords.some((w) => s === w || s.includes(w));
}

function daysUntil(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  d.setHours(23, 59, 59, 999);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

function fighterName(fighter: any) {
  return safe(fighter?.fp_naam ?? fighter?.naam, "Onbekende vechter");
}

function licenseValue(fighter: any) {
  const raw = parseRaw(fighter?.raw);
  return (
    fighter?.licentie ??
    fighter?.licentie_status ??
    fighter?.heeft_licentie ??
    raw?.details?.licentie ??
    null
  );
}


function firstFilled(...vals: unknown[]) {
  for (const v of vals) {
    const out = String(v ?? "").trim();
    if (out) return out;
  }
  return "";
}

function getResultKind(v?: string | null): "win" | "loss" | "draw" | "other" {
  const x = String(v ?? "").trim().toLowerCase();

  if (x.includes("onbeslist") || x.includes("draw") || x.includes("gelijk")) return "draw";
  if (x.includes("verlies") || x.includes("verliest") || x.includes("verloren") || x.includes("loss") || x === "l") return "loss";
  if (x.includes("winst") || x.includes("wint") || x.includes("gewonnen") || x === "win" || x === "w") return "win";

  return "other";
}

function normalizeClassToken(v?: string | null) {
  const x = String(v ?? "").trim().toLowerCase();
  if (!x) return "";

  if (x.includes("jeugd") || x.includes("youth") || /^j(\b|\s|\/|-)/i.test(x) || x === "j") return "j";
  if (x.includes("recreant") || /^r(\b|\s|\/|-)/i.test(x) || x === "r") return "r";
  if (x.includes("nieuweling") || /^n(\b|\s|\/|-)/i.test(x) || x === "n") return "n";
  if (x.includes("c-klasse") || x.includes("c klasse") || /^c(\b|\s|\/|-)/i.test(x) || x === "c") return "c";
  if (x.includes("b-klasse") || x.includes("b klasse") || /^b(\b|\s|\/|-)/i.test(x) || x === "b") return "b";
  if (x.includes("a-klasse") || x.includes("a klasse") || x.includes("elite") || /^a(\b|\s|\/|-)/i.test(x) || x === "a") return "a";

  return x.replace(/[^a-z0-9+]/g, "");
}

function classRank(token?: string | null) {
  const t = normalizeClassToken(token);
  const order: Record<string, number> = { j: 1, r: 2, n: 3, c: 4, b: 5, a: 6 };
  return order[t] ?? 0;
}

function highestRecordClass(rows: Uitslag[]) {
  let best = "";
  let bestRank = 0;

  for (const row of rows) {
    const token = normalizeClassToken(row.klasse);
    const rank = classRank(token);
    if (rank > bestRank) {
      best = token;
      bestRank = rank;
    }
  }

  return best;
}

function displayClassToken(v?: string | null) {
  const token = normalizeClassToken(v);
  const labels: Record<string, string> = {
    j: "J",
    r: "R",
    n: "N",
    c: "C",
    b: "B",
    a: "A",
  };

  return labels[token] ?? safe(v);
}

function recordStatsFromUitslagen(rows: Uitslag[]) {
  const hoogsteKlasse = highestRecordClass(rows);

  return rows.reduce(
    (acc, row) => {
      const kind = getResultKind(row.uitslag);
      const rowKlasse = normalizeClassToken(row.klasse);

      if (!hoogsteKlasse || rowKlasse !== hoogsteKlasse || kind === "other") {
        acc.other += 1;
        return acc;
      }

      if (kind === "win") acc.w += 1;
      else if (kind === "loss") acc.l += 1;
      else if (kind === "draw") acc.d += 1;
      else acc.other += 1;

      return acc;
    },
    { w: 0, l: 0, d: 0, other: 0 },
  );
}

function resultLabel(v?: string | null) {
  const kind = getResultKind(v);
  if (kind === "win") return "Winst";
  if (kind === "loss") return "Verlies";
  if (kind === "draw") return "Onbeslist";
  const x = String(v ?? "").trim().toLowerCase();
  if (x.includes("demo")) return "Demo";
  if (x.includes("no contest") || x.includes("nocontest") || x === "nc") return "No contest";
  return safe(v);
}

function hasStartverbod(fighter: any) {
  const raw = parseRaw(fighter?.raw);
  return (
    yes(fighter?.heeft_startverbod, ["ja", "yes", "true"]) ||
    yes(fighter?.startverbod, ["ja", "yes", "true"]) ||
    yes(raw?.details?.heeft_startverbod, ["ja", "yes", "true"])
  );
}

export default function FighterDetailPage() {
  const params = useParams<{ fighterId: string }>();
  const router = useRouter();

  const fighterId = String(params?.fighterId ?? "").trim();

  const [fighter, setFighter] = useState<any>(null);
  const [sportschool, setSportschool] = useState<Sportschool | null>(null);
  const [uitslagen, setUitslagen] = useState<Uitslag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meldingType, setMeldingType] = useState("traint_niet_meer_bij_ons");
  const [meldingText, setMeldingText] = useState("");
  const [meldingSaving, setMeldingSaving] = useState(false);
  const [meldingMsg, setMeldingMsg] = useState("");

  useEffect(() => {
    if (fighterId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fighterId]);

  async function readJsonSafe(res: Response) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { error: text || "Ongeldige server response" };
    }
  }

  async function loadUitslagenFallback(
    nextFighter: any,
    apiUitslagen: Uitslag[],
  ) {
    if (apiUitslagen.length) return apiUitslagen;

    const va = String(nextFighter?.va_nummer ?? "").trim();
    const sportschoolId =
      nextFighter?.sportschool_id ?? sportschool?.sportschool_id;
    if (!va || !sportschoolId) return [];

    const { data, error: uitslagenError } = await supabase
      .from("sportschool_fighter_uitslagen_raw")
      .select(
        "id,sportschool_id,va_nummer,datum,evenement,tegenstander,uitslag,discipline,klasse,gewicht,sportschool",
      )
      .eq("sportschool_id", Number(sportschoolId))
      .eq("va_nummer", va)
      .order("datum", { ascending: false });

    if (uitslagenError) {
      console.warn("Uitslagen fallback laden mislukt", uitslagenError);
      return [];
    }

    return Array.isArray(data) ? data : [];
  }

  async function load() {
    try {
      setLoading(true);
      setError("");

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch(
        `/api/sportscholen/vechters/${encodeURIComponent(fighterId)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        },
      );

      const json = await readJsonSafe(res);
      if (!res.ok)
        throw new Error(json?.error || `Vechter laden mislukt (${res.status})`);

      const nextFighter = json?.fighter || null;
      const nextSportschool = json?.sportschool || null;
      const apiUitslagen = Array.isArray(json?.uitslagen) ? json.uitslagen : [];
      const completeUitslagen = await loadUitslagenFallback(
        nextFighter,
        apiUitslagen,
      );

      setFighter(nextFighter);
      setSportschool(nextSportschool);
      setUitslagen(completeUitslagen);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Vechter laden mislukt");
      setFighter(null);
      setSportschool(null);
      setUitslagen([]);
    } finally {
      setLoading(false);
    }
  }



  async function submitMelding() {
    if (!fighter) return;

    const tekst = meldingText.trim();
    if (!tekst) {
      setMeldingMsg("Vul eerst een korte toelichting in.");
      return;
    }

    try {
      setMeldingSaving(true);
      setMeldingMsg("");

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch("/api/sportscholen/vechter-melding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fighter_id: fighter.id,
          sportschool_id: fighter.sportschool_id ?? sportschool?.sportschool_id ?? null,
          sportschool_naam: sportschool?.naam ?? null,
          va_nummer: fighter.va_nummer ?? null,
          naam: fighterName(fighter),
          type: meldingType,
          melding: tekst,
          snapshot: {
            fighter,
            sportschool,
            uitslagen_count: uitslagen.length,
          },
        }),
      });

      const json = await readJsonSafe(res);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Melding versturen mislukt");
      }

      setMeldingText("");
      setMeldingType("traint_niet_meer_bij_ons");
      setMeldingMsg("Melding is verstuurd naar admin.");
    } catch (e: any) {
      setMeldingMsg(e?.message || "Melding versturen mislukt");
    } finally {
      setMeldingSaving(false);
    }
  }

  const raw = useMemo(() => parseRaw(fighter?.raw), [fighter?.raw]);
  const recordStats = useMemo(() => {
    if (uitslagen.length) return recordStatsFromUitslagen(uitslagen);

    const w = Number(fighter?.gewonnen ?? raw?.details?.gewonnen ?? 0) || 0;
    const l = Number(fighter?.verloren ?? raw?.details?.verloren ?? 0) || 0;
    const d = Number(fighter?.onbeslist ?? raw?.details?.onbeslist ?? raw?.details?.gelijk ?? 0) || 0;
    const total = Number(fighter?.totaal_wedstrijden ?? raw?.details?.totaal ?? raw?.details?.totaal_wedstrijden ?? 0) || 0;
    return { w, l, d, other: Math.max(0, total - w - l - d) };
  }, [fighter, raw, uitslagen]);

  const record = `${recordStats.w}-${recordStats.l}-${recordStats.d} (${recordStats.other})`;
  const totaalWedstrijden = uitslagen.length || Number(fighter?.totaal_wedstrijden ?? raw?.details?.totaal ?? recordStats.w + recordStats.l + recordStats.d + recordStats.other) || 0;
  const hoogsteUitslagenKlasse = highestRecordClass(uitslagen);
  const klasseVolgensControle = hoogsteUitslagenKlasse
    ? displayClassToken(hoogsteUitslagenKlasse)
    : displayClassToken(fighter?.nulmeting_klasse ?? raw?.nulmeting?.klasse ?? fighter?.klasse);
  const klasseControleBron = hoogsteUitslagenKlasse ? "uitslagen" : "nulmeting";

  const hasLicense = yes(licenseValue(fighter));
  const startverbod = hasStartverbod(fighter);
  const keurmerkDays = daysUntil(sportschool?.keurmerk_einde);
  const keurmerkSoon =
    keurmerkDays !== null && keurmerkDays >= 0 && keurmerkDays <= 62;
  const keurmerkExpired = keurmerkDays !== null && keurmerkDays < 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(96,74,58,0.36),transparent_30rem),radial-gradient(circle_at_bottom,rgba(255,90,31,0.08),transparent_24rem),linear-gradient(180deg,#100e0c,#080808_52%,#030303)] text-white">
      <div className="mx-auto max-w-7xl px-3 py-2 sm:px-5 lg:px-6">
        <div className="fs-chrome-panel relative mb-3 overflow-hidden rounded-[1.15rem] border-[5px] border-[#d9d6d0] bg-[linear-gradient(135deg,#251f1a,#11100f_48%,#050505)] shadow-[0_0_0_1px_#59534d,0_0_0_5px_rgba(255,255,255,0.22),0_16px_34px_rgba(0,0,0,0.86),inset_0_2px_0_rgba(255,255,255,0.78),inset_0_-2px_0_rgba(0,0,0,0.95)] before:absolute before:inset-[7px] before:rounded-[0.82rem] before:border before:border-[#8f8982] before:content-[''] after:absolute after:left-10 after:top-0 after:h-[3px] after:w-48 after:bg-[linear-gradient(90deg,transparent,#fff,transparent)] after:content-['']">
          <div className="relative min-h-[126px] px-3 py-3">
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden px-[260px]">
              <img
                src="/branding/fightsupport/fightsupport1.png"
                alt="FightSupport"
                draggable={false}
                className="
                  h-[86px]
                  w-auto
                  max-w-[920px]
                  object-contain
                  select-none
                  drop-shadow-[0_0_18px_rgba(255,120,40,0.24)]
                "
              />
            </div>

            <div className="relative z-10 flex min-h-[102px] items-center justify-between gap-4"><div className="flex min-w-[260px] items-center gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-[0.26em] text-[#ff8a4c]">
                    Vechter detail
                  </div>
                  <div className="truncate text-sm text-[#d1c3b7]">
                    {safe(sportschool?.naam, "Sportschool")}
                  </div>
                </div>
              </div>

              <div className="hidden min-w-[280px] text-right lg:block">
                <div className="text-[11px] font-black uppercase tracking-[0.32em] text-[#ff6a2a]">
                  FightSupport
                </div>
                <div className="text-xl font-black tracking-tight text-white sm:text-3xl">
                  Fightcrew
                </div>
                <div className="text-sm text-[#d1c3b7]">
                  Profiel, licentie, nulmeting en uitslagen.
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="rounded-[2rem] border border-[#8a8178] bg-[#161311] p-10 text-center text-lg font-black text-zinc-200 shadow-xl shadow-black/50">
            <RefreshCw className="mx-auto mb-3 animate-spin text-[#ff6a2a]" />{" "}
            Laden...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-[2rem] border border-red-500/60 bg-[#2a1111] p-6 text-red-200 shadow-xl shadow-black/50">
            <div className="flex items-center gap-3 text-lg font-black">
              <XCircle /> {error}
            </div>
          </div>
        )}

        {!loading && !error && fighter && (
          <>
            <div className="relative mb-3 overflow-hidden rounded-[1.05rem] border-[5px] border-[#d9d6d0] bg-[linear-gradient(180deg,#1b1714,#0b0a09)] shadow-[0_0_0_1px_#524c46,0_0_0_7px_rgba(255,255,255,0.28),0_14px_30px_rgba(0,0,0,0.82),inset_0_2px_0_rgba(255,255,255,0.58)] before:absolute before:inset-[7px] before:rounded-[0.75rem] before:border before:border-[#89847e] before:content-['']">
              <div className="relative border-b border-[#b8afa6]/45 bg-[linear-gradient(90deg,#11100f,#211914,#3a1609)] px-4 py-2.5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <div className="text-sm font-black uppercase tracking-[0.24em] text-[#d0c4b8]">
                      {safe(sportschool?.naam, "Sportschool")}
                    </div>

                    <h1
                      className="
                        mt-1
                        text-3xl
                        sm:text-4xl
                        font-black
                        leading-tight
                        tracking-tight
                        text-[#ff6a2a]
                        drop-shadow-[0_2px_10px_rgba(255,120,40,0.35)]
                      "
                    >
                      {fighterName(fighter)}
                    </h1>

                    <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-xs text-zinc-300">
                      <span className="rounded-full border border-[#b8afa6] bg-[#11100f] px-2.5 py-0.5 font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                        VA {safe(fighter.va_nummer)}
                      </span>
                      <span className="rounded-full border border-[#8a8178] bg-[#11100f] px-2.5 py-0.5">
                        Leeftijd{" "}
                        {calculateAge(
                          fighter.fp_geboortedatum ??
                            fighter.geboortedatum ??
                            raw?.details?.geboortedatum,
                        )}
                      </span>
                      <span className="rounded-full border border-[#8a8178] bg-[#11100f] px-2.5 py-0.5">
                        {safe(fighter.geslacht)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push("/dashboard/sportscholen")}
                    className="inline-flex items-center justify-center gap-2 border-2 border-[#d7d4ce] bg-[linear-gradient(180deg,#ffffff,#adadad_44%,#eeeeee_52%,#6f6f6f)] px-5 py-2 text-sm font-black text-black shadow-[inset_0_1px_0_#fff,0_5px_0_#28140c,0_8px_16px_rgba(0,0,0,0.55)] transition hover:brightness-110"
                  >
                    <ArrowLeft size={18} /> Terug
                  </button>
                </div>
              </div>

              <div className="relative grid gap-2 p-3 md:grid-cols-5">
                <InfoCard
                  icon={<ShieldCheck />}
                  label="Licentie"
                  value={hasLicense ? "Ja" : "Nee"}
                  danger={!hasLicense}
                />
                <InfoCard
                  icon={<ShieldAlert />}
                  label="Startverbod"
                  value={startverbod ? "Ja" : "Nee"}
                  danger={startverbod}
                />
                <InfoCard icon={<Trophy />} label="Record" value={record} />
                <InfoCard
                  icon={<Dumbbell />}
                  label="Totaal wedstrijden"
                  value={String(totaalWedstrijden)}
                />
                <InfoCard
                  icon={<Trophy />}
                  label="Klasse volgens controle"
                  value={`${safe(klasseVolgensControle)} (${klasseControleBron})`}
                />
              </div>
            </div>

            {(keurmerkExpired || keurmerkSoon) && (
              <div
                className={`mb-4 rounded-[1.6rem] border-2 p-3 text-sm font-bold shadow-xl shadow-black/50 ${keurmerkExpired ? "border-red-500/60 bg-[#2a1111] text-red-200" : "border-[#ff7a3d]/60 bg-[#2a1c14] text-[#ffd2bd]"}`}
              >
                {keurmerkExpired
                  ? "Keurmerk is verlopen. Vraag verlenging aan door te mailen naar keurmerk@nederlandsevechtsportbond.nl of check de site."
                  : "Let op: keurmerk verloopt binnen 2 maanden. Vraag verlenging aan door te mailen naar keurmerk@nederlandsevechtsportbond.nl of check de site."}
              </div>
            )}

            <div className="mb-3 grid gap-2 md:grid-cols-3">
              <DetailBlock
                title="Nulmeting"
                rows={[
                  [
                    "Klasse volgens controle",
                    `${safe(klasseVolgensControle)} (${klasseControleBron})`,
                  ],
                  [
                    "Nulmeting klasse",
                    safe(fighter.nulmeting_klasse ?? raw?.nulmeting?.klasse),
                  ],
                  [
                    "Totaal",
                    safe(
                      fighter.nulmeting_totaal ?? raw?.nulmeting?.totaal,
                      "0",
                    ),
                  ],
                  [
                    "Opmerking",
                    safe(
                      fighter.nulmeting_opmerking ?? raw?.nulmeting?.opmerking,
                    ),
                  ],
                ]}
              />
              <DetailBlock
                title="Sportschool"
                rows={[
                  ["Naam", safe(sportschool?.naam)],
                  ["Plaats", safe(sportschool?.plaats)],
                  ["Keurmerk einde", formatDate(sportschool?.keurmerk_einde)],
                ]}
              />
              <DetailBlock
                title="Controle"
                rows={[
                  [
                    "Scrape status",
                    safe(fighter.scrape_status ?? fighter.status),
                  ],
                  ["Laatste scrape", formatDate(fighter.scraped_at)],
                  ["Run", safe(fighter.scrape_run_id)],
                ]}
              />
            </div>



            <div className="mb-3 border border-zinc-600 bg-[#121212] p-4 shadow-2xl">
              <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                <div>
                  <div className="flex items-center gap-2 text-lg font-black uppercase text-white">
                    <MessageSquare size={20} className="text-[#ff4d00]" />
                    Melding aan admin
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">
                    Vraag een wijziging aan voor deze vechter, bijvoorbeeld traint niet meer bij ons, gegevens wijzigen of uitslag klopt niet.
                  </div>
                </div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#ff4d00]">
                  VA {safe(fighter.va_nummer)}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[260px_1fr_auto] md:items-end">
                <label className="block text-xs font-black uppercase tracking-[0.18em] text-zinc-300">
                  Type melding
                  <select
                    value={meldingType}
                    onChange={(e) => setMeldingType(e.target.value)}
                    className="mt-2 w-full border border-zinc-600 bg-[#111] px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#ff4d00]"
                  >
                    <option value="traint_niet_meer_bij_ons">Traint niet meer bij ons</option>
                    <option value="gegevens_wijzigen">Gegevens wijzigen</option>
                    <option value="uitslag_klopt_niet">Uitslag klopt niet</option>
                    <option value="licentie_klopt_niet">Licentie klopt niet</option>
                    <option value="startverbod_klopt_niet">Startverbod klopt niet</option>
                    <option value="sportschool_klopt_niet">Sportschool klopt niet</option>
                    <option value="anders">Anders</option>
                  </select>
                </label>

                <label className="block text-xs font-black uppercase tracking-[0.18em] text-zinc-300">
                  Toelichting
                  <textarea
                    value={meldingText}
                    onChange={(e) => setMeldingText(e.target.value)}
                    rows={3}
                    placeholder="Beschrijf kort wat admin moet controleren of aanpassen..."
                    className="mt-2 w-full resize-none border border-zinc-600 bg-[#111] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#ff4d00]"
                  />
                </label>

                <button
                  type="button"
                  onClick={submitMelding}
                  disabled={meldingSaving || !meldingText.trim()}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {meldingSaving ? <RefreshCw size={17} className="animate-spin" /> : <Send size={17} />}
                  Verstuur
                </button>
              </div>

              {meldingMsg && (
                <div className="mt-3 border border-zinc-700 bg-[#1c1c1c] p-3 text-sm font-bold text-zinc-200">
                  {meldingMsg}
                </div>
              )}
            </div>

            {fighter.scrape_error && (
              <div className="mb-3 rounded-[1rem] border-2 border-[#ff7a3d]/60 bg-[#24170f] p-3 text-[#ffd2bd] shadow-xl shadow-black/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-1 shrink-0" />
                  <div>
                    <div className="font-black">Scrape melding</div>
                    <div className="mt-1 text-sm">{fighter.scrape_error}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="relative overflow-hidden rounded-[1.05rem] border-[5px] border-[#d9d6d0] bg-[linear-gradient(180deg,#1b1714,#0d0c0b)] shadow-[0_0_0_1px_#524c46,0_0_0_7px_rgba(255,255,255,0.28),0_14px_30px_rgba(0,0,0,0.82),inset_0_2px_0_rgba(255,255,255,0.58)] before:absolute before:inset-[7px] before:rounded-[0.75rem] before:border before:border-[#89847e] before:content-['']">
              <div className="relative flex items-center justify-between border-b border-[#b8afa6]/45 bg-[linear-gradient(90deg,#11100f,#211914,#3a1609)] px-4 py-2.5 text-white">
                <div>
                  <div className="flex items-center gap-2 text-lg font-black">
                    <CalendarDays size={20} /> Uitslagen
                  </div>
                  <div className="mt-0.5 text-xs text-[#c8bdb3]">
                    Gelezen uit sportschool_fighter_uitslagen_raw op VA{" "}
                    {safe(fighter.va_nummer)}.
                  </div>
                </div>
                <div className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                  {uitslagen.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] table-fixed text-xs">
                  <thead>
                    <tr className="border-b border-[#b8afa6]/45 bg-[#241f1b] text-xs uppercase tracking-[0.14em] text-zinc-300">
                      <th className="w-[12%] px-3 py-2 text-left">Datum</th>
                      <th className="w-[25%] px-3 py-2 text-left">Event</th>
                      <th className="w-[18%] px-3 py-2 text-left">
                        Tegenstander
                      </th>
                      <th className="w-[16%] px-3 py-2 text-left">
                        Sportschool
                      </th>
                      <th className="w-[12%] px-3 py-2 text-left">Klasse</th>
                      <th className="w-[8%] px-3 py-2 text-left">Kg</th>
                      <th className="w-[9%] px-3 py-2 text-left">Uitslag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uitslagen.map((u, i) => (
                      <tr
                        key={u.id || i}
                        className="border-b border-white/10 odd:bg-[#11100f] even:bg-[#1b1714] hover:bg-[#2a1c14]/70"
                      >
                        <td className="px-3 py-2 font-bold text-white">
                          {formatDate(u.datum)}
                        </td>
                        <td className="px-3 py-2 text-zinc-200">
                          <div className="line-clamp-2">
                            {safe(u.evenement)}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-black text-white">
                          {safe(u.tegenstander)}
                        </td>
                        <td className="px-3 py-2 text-zinc-300">
                          {safe(u.sportschool)}
                        </td>
                        <td className="px-3 py-2 text-zinc-300">
                          {safe(u.klasse)}
                          <div className="text-xs text-[#9f948c]">
                            {safe(u.discipline)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-zinc-300">
                          {safe(u.gewicht)}
                        </td>
                        <td className="px-3 py-2 font-black text-[#ff9a66]">
                          {resultLabel(u.uitslag)}
                        </td>
                      </tr>
                    ))}
                    {!uitslagen.length && (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-5 text-center text-[#c8bdb3]"
                        >
                          Geen uitslagen gevonden voor deze VA.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[0.85rem] border-[5px] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_10px_20px_rgba(0,0,0,0.70),inset_0_1px_0_rgba(255,255,255,0.30)] before:absolute before:inset-[5px] before:rounded-[0.6rem] before:border before:border-white/20 before:content-[''] after:absolute after:right-5 after:top-2 after:h-2 after:w-9 after:rounded-full after:bg-[#ff5a1f] after:blur-[5px] after:content-[''] ${danger ? "border-red-500/70 bg-[linear-gradient(180deg,#321111,#160707)]" : "border-[#d4d0c9] bg-[linear-gradient(180deg,#1a1714,#0f0d0c)]"}`}
    >
      <div
        className={`relative mb-2 flex items-center justify-between ${danger ? "text-red-300" : "text-[#c8bdb3]"}`}
      >
        <span className="text-xs font-black uppercase tracking-[0.2em]">
          {label}
        </span>
        <span>{icon}</span>
      </div>
      <div
        className={`relative text-xl font-black ${danger ? "text-red-200" : "text-white"}`}
      >
        {value}
      </div>
    </div>
  );
}

function DetailBlock({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div className="relative overflow-hidden rounded-[1rem] border-[5px] border-[#d9d6d0] bg-[linear-gradient(180deg,#1b1714,#100e0c)] p-3 shadow-[0_0_0_1px_#524c46,0_0_0_4px_rgba(255,255,255,0.18),0_12px_24px_rgba(0,0,0,0.75),inset_0_2px_0_rgba(255,255,255,0.45)] before:absolute before:inset-[6px] before:rounded-[0.7rem] before:border before:border-[#89847e] before:content-[''] after:absolute after:right-8 after:top-2 after:h-2 after:w-10 after:rounded-full after:bg-[#ff5a1f] after:blur-[5px] after:content-['']">
      <div className="relative mb-2 flex items-center gap-2 text-base font-black text-white">
        <User size={18} className="text-[#ff6a2a]" /> {title}
      </div>
      <div className="relative space-y-1.5">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between gap-4 border-b border-white/10 pb-1.5 text-xs last:border-b-0"
          >
            <span className="font-bold text-[#c8bdb3]">{k}</span>
            <span className="text-right font-black text-white">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
