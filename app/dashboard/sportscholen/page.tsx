"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Sportschool = {
  sportschool_id?: string | number | null;
  naam?: string | null;
  plaats?: string | null;
  land?: string | null;
  keurmerk_start?: string | null;
  keurmerk_einde?: string | null;
};



type Uitslag = {
  id?: string | number;
  va_nummer?: string | number | null;
  sportschool_id?: string | number | null;
  datum?: string | null;
  evenement?: string | null;
  tegenstander?: string | null;
  uitslag?: string | null;
  discipline?: string | null;
  klasse?: string | null;
  gewicht?: string | number | null;
  sportschool?: string | null;
};

type Fighter = {
  id: string;
  sportschool_id: string | number;
  va_nummer?: string | null;
  naam?: string | null;
  fp_naam?: string | null;
  geboortedatum?: string | null;
  fp_geboortedatum?: string | null;
  geslacht?: string | null;
  discipline?: string | null;
  klasse?: string | null;
  gewicht?: number | string | null;
  licentie?: string | null;
  licentie_status?: string | null;
  heeft_licentie?: boolean | string | null;
  heeft_startverbod?: string | boolean | null;
  startverbod?: string | boolean | null;
  totaal_wedstrijden?: number | null;
  gewonnen?: number | null;
  verloren?: number | null;
  onbeslist?: number | null;
  nulmeting_klasse?: string | null;
  nulmeting_totaal?: number | null;
  nulmeting_opmerking?: string | null;
  scrape_status?: string | null;
  status?: string | null;
  scrape_error?: string | null;
  scraped_at?: string | null;
  raw?: any;
};

function safe(v: unknown, fallback = "-") {
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

function yes(v: unknown) {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return (
    v === true ||
    ["ja", "yes", "true", "1", "ok", "geldig", "actief"].includes(s)
  );
}

function no(v: unknown) {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return (
    v === false ||
    ["nee", "no", "false", "0", "ongeldig", "verlopen", "geen"].includes(s)
  );
}

function statusValue(f: Fighter) {
  return String(f.scrape_status ?? f.status ?? "")
    .trim()
    .toLowerCase();
}

function checked(f: Fighter) {
  return ["klaar", "gescrapt", "gescraped", "gecontroleerd"].includes(
    statusValue(f),
  );
}

function failed(f: Fighter) {
  return ["mislukt", "failed", "scrape_mislukt", "fout"].includes(
    statusValue(f),
  );
}

function formatDate(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("nl-NL");
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

function statusLabel(f: Fighter) {
  const s = statusValue(f);
  if (!s) return "Niet gestart";
  if (checked(f)) return "Gecontroleerd";
  if (["bezig", "running", "controle_bezig"].includes(s)) return "Bezig";
  if (failed(f)) return "Mislukt";
  return safe(f.scrape_status ?? f.status);
}

function statusClass(f: Fighter) {
  const s = statusValue(f);
  if (checked(f)) return "border-emerald-400/60 bg-[#10261b] text-emerald-200";
  if (["bezig", "running", "controle_bezig"].includes(s))
    return "border-[#ff7a3d]/60 bg-[#2a1c14] text-[#ffd2bd]";
  if (failed(f)) return "border-red-500/60 bg-[#2a1111] text-red-200";
  return "border-[#8a8178] bg-[#211c19] text-zinc-200";
}

function fighterName(f: Fighter) {
  return safe(f.fp_naam ?? f.naam, "Onbekende vechter");
}

function dob(f: Fighter) {
  return safe(f.fp_geboortedatum ?? f.geboortedatum);
}

function licenseValue(f: Fighter) {
  const raw = parseRaw(f.raw);
  return (
    f.licentie ??
    f.licentie_status ??
    f.heeft_licentie ??
    raw?.details?.licentie ??
    null
  );
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

function recordLabelFromUitslagen(rows: Uitslag[]) {
  const r = recordStatsFromUitslagen(rows);
  return `${r.w}-${r.l}-${r.d} (${r.other})`;
}

function normalizeVa(v: unknown) {
  return String(v ?? "").replace(/[^0-9]/g, "");
}

function hasStartverbod(f: Fighter) {
  const raw = parseRaw(f.raw);
  return (
    yes(f.heeft_startverbod) ||
    yes(f.startverbod) ||
    yes(raw?.details?.heeft_startverbod)
  );
}

export default function SportschoolPage() {
  const router = useRouter();
  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [uitslagenByVa, setUitslagenByVa] = useState<Record<string, Uitslag[]>>({});
  const [sportschool, setSportschool] = useState<Sportschool | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  async function loadUitslagenForFighters(nextFighters: Fighter[], nextSportschool: Sportschool | null) {
    const sportschoolId = nextSportschool?.sportschool_id;
    const vaNummers = Array.from(
      new Set(nextFighters.map((f) => normalizeVa(f.va_nummer)).filter(Boolean)),
    );

    if (!sportschoolId || !vaNummers.length) {
      setUitslagenByVa({});
      return;
    }

    let q = supabase
      .from("sportschool_fighter_uitslagen_raw")
      .select("id,sportschool_id,va_nummer,datum,evenement,tegenstander,uitslag,discipline,klasse,gewicht,sportschool")
      .in("va_nummer", vaNummers)
      .order("datum", { ascending: false });

    const sportschoolIdNumber = Number(sportschoolId);
    q = Number.isFinite(sportschoolIdNumber)
      ? q.eq("sportschool_id", sportschoolIdNumber)
      : q.eq("sportschool_id", String(sportschoolId));

    const { data, error } = await q;

    if (error) {
      console.warn("Sportschool uitslagen laden mislukt", error);
      setUitslagenByVa({});
      return;
    }

    const grouped: Record<string, Uitslag[]> = {};
    for (const row of (data ?? []) as Uitslag[]) {
      const va = normalizeVa(row.va_nummer);
      if (!va) continue;
      if (!grouped[va]) grouped[va] = [];
      grouped[va].push(row);
    }
    setUitslagenByVa(grouped);
  }



  async function downloadFightcrewExcel() {
    try {
      setExportLoading(true);
      setError(null);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch("/api/sportscholen/fightcrew-excel", {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        let message = `Excel downloaden mislukt (${res.status})`;
        try {
          const json = text ? JSON.parse(text) : {};
          message = json?.error || message;
        } catch {
          message = text || message;
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      const filename = decodeURIComponent(
        match?.[1] || match?.[2] || "fightcrew.xlsx",
      );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Excel downloaden mislukt");
    } finally {
      setExportLoading(false);
    }
  }

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch("/api/sportscholen/vechters", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { error: text || "Ongeldige server response" };
      }

      if (!res.ok)
        throw new Error(
          json?.error || `Vechters laden mislukt (${res.status})`,
        );

      const nextSportschool = json?.sportschool ?? null;
      const nextFighters = Array.isArray(json?.fighters) ? json.fighters : [];
      setSportschool(nextSportschool);
      setFighters(nextFighters);
      await loadUitslagenForFighters(nextFighters, nextSportschool);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Vechters laden mislukt");
      setFighters([]);
      setUitslagenByVa({});
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? fighters.filter((f) => {
          const raw = parseRaw(f.raw);
          return [
            f.naam,
            f.fp_naam,
            f.va_nummer,
            f.discipline,
            f.klasse,
            f.geslacht,
            f.nulmeting_klasse,
            f.scrape_status,
            f.status,
            raw?.details?.licentie,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q);
        })
      : fighters;

    return [...list].sort((a, b) =>
      fighterName(a).localeCompare(fighterName(b), "nl"),
    );
  }, [fighters, search]);

  const stats = useMemo(() => {
    const total = fighters.length;
    const gecontroleerd = fighters.filter(checked).length;
    const mislukt = fighters.filter(failed).length;
    const startverbod = fighters.filter(hasStartverbod).length;
    const zonderLicentie = fighters.filter((f) => !yes(licenseValue(f))).length;
    return { total, gecontroleerd, mislukt, startverbod, zonderLicentie };
  }, [fighters]);

  const keurmerkDays = daysUntil(sportschool?.keurmerk_einde);
  const keurmerkExpired = keurmerkDays !== null && keurmerkDays < 0;
  const keurmerkSoon =
    keurmerkDays !== null && keurmerkDays >= 0 && keurmerkDays <= 62;

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <style>{`.sportschool-silver-btn, .sportschool-silver-btn *{color:#000!important;}`}</style>
      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] shadow-2xl">
          <div className="relative px-4 py-4 sm:px-5">

            <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div className="min-w-0 text-center">
                <div className="text-[11px] font-black uppercase tracking-[0.26em] text-[#ff8a4c]">
                  Sportschool
                </div>
                <div className="mt-0.5 truncate text-2xl font-black leading-tight text-white">
                  {safe(sportschool?.naam, "Gekoppelde sportschool")}
                </div>
                <div className="text-sm text-[#d1c3b7]">
                  {[sportschool?.plaats, sportschool?.land]
                    .filter(Boolean)
                    .join(" • ")}
                </div>
              </div>

              <div className="flex justify-center lg:px-6">
                <img
                  src="/branding/fightsupport/fightsupport1.png"
                  alt="FightSupport"
                  className="h-16 w-auto max-w-[310px] object-contain sm:h-20 lg:h-24 lg:max-w-[390px]"
                />
              </div>

              <div className="text-left lg:text-right">
                <div className="text-[11px] font-black uppercase tracking-[0.32em] text-[#ff6a2a]">
                  FightSupport
                </div>
                <h1 className="mt-0.5 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Fightcrew
                </h1>
                <p className="mt-0.5 text-sm text-[#d1c3b7]">
                  Vechters, licenties, nulmeting en startverboden.
                </p>
              </div>
            </div>

            
            <div className="mt-4 grid items-center gap-3 border-t border-[#b8afa6]/45 pt-3 lg:grid-cols-[1fr_auto_1fr]">
              <div className="hidden lg:block" />

              <div className="flex items-center justify-center gap-3 rounded-2xl bg-[#151210] px-6 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#ff7a3d]/55 bg-[#24170f] text-[#ff7a3d]">
                  <Trophy size={22} />
                </div>
                <div className="min-w-0 text-center">
                  <div className="text-[12px] font-black uppercase tracking-[0.24em] text-[#d1c3b7]">
                    Keurmerk sportschool
                  </div>
                  <div className="truncate text-lg font-black">
                    <span className="text-[#ff6a2a]">Einde keurmerk:</span>{" "}
                    <span className="text-[#ff6a2a]">
                      {formatDate(sportschool?.keurmerk_einde)}
                    </span>
                  </div>
                  <div className="text-sm text-[#b8aaa0]">
                    Start: {formatDate(sportschool?.keurmerk_start)}
                  </div>
                </div>
              </div>

              <div className="flex justify-center lg:justify-end">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="sportschool-silver-btn inline-flex items-center justify-center gap-2 border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black"
                >
                  <ArrowLeft size={17} />
                  Terug
                </button>
              </div>

              {(keurmerkExpired || keurmerkSoon) && (
                <div
                  className={`lg:col-span-3 mx-auto max-w-[680px] rounded-2xl border-2 px-4 py-3 text-center text-sm font-bold shadow-lg shadow-black/40 ${keurmerkExpired ? "border-red-500/70 bg-[#260d0d] text-red-200" : "border-[#ff7a3d]/70 bg-[#24170f] text-[#ffd2bd]"}`}
                >
                  {keurmerkExpired
                    ? "Keurmerk is verlopen. Vraag verlenging aan."
                    : "Let op: keurmerk verloopt binnen 2 maanden. Vraag verlenging aan via keurmerk@nederlandsevechtsportbond.nl."}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-2 border-t border-[#b8afa6]/45 p-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat
              label="Totaal"
              value={stats.total}
              icon={<Users size={17} />}
            />
            <Stat
              label="Gecontroleerd"
              value={stats.gecontroleerd}
              icon={<CheckCircle2 size={17} />}
              good
            />
            <Stat
              label="Mislukt"
              value={stats.mislukt}
              icon={<XCircle size={17} />}
              bad
            />
            <Stat
              label="Startverbod"
              value={stats.startverbod}
              icon={<ShieldAlert size={17} />}
              warn
            />
            <Stat
              label="Zonder licentie"
              value={stats.zonderLicentie}
              icon={<AlertTriangle size={17} />}
              bad
            />
          </div>
        </header>

        <section className="border-b border-zinc-700 bg-[#181818] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-h-11 flex-1 items-center gap-3 rounded-2xl border-[3px] border-[#a59b92] bg-[#110f0e] px-4">
              <Search size={18} className="text-[#ff9a66]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek vechter op naam, VA, discipline, klasse, status of licentie..."
                className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-[#9f948c]"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={downloadFightcrewExcel}
                disabled={exportLoading || loading || fighters.length === 0}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-[#d8d3cc] bg-[linear-gradient(180deg,#ffffff,#d7d7d7_42%,#8f8f8f)] px-5 text-sm font-black uppercase tracking-[0.14em] text-black shadow-lg shadow-black/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportLoading ? (
                  <RefreshCw size={17} className="animate-spin" />
                ) : (
                  <Download size={17} />
                )}
                Excel
              </button>

              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border-2 border-[#ffb082]/55 bg-[linear-gradient(180deg,#ff7a2f,#b9360c)] px-5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
                Vernieuwen
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-3 rounded-2xl border-2 border-red-500/60 bg-[#260d0d] p-3 text-sm text-red-200">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <div>
                <div className="font-bold">
                  Vechters konden niet geladen worden.
                </div>
                <div className="mt-1 text-red-200/80">{error}</div>
              </div>
            </div>
          )}
        </section>

        <section className="p-4 pt-0">
          <div className="overflow-hidden border border-zinc-600 bg-[#111] shadow-2xl">
          <div className="border-b border-zinc-700 bg-[#252525] px-5 py-3">
            <div className="text-lg font-black text-white">Vechters</div>
            <div className="text-xs text-[#d1c3b7]">
              Duidelijk overzicht voor trainers: VA, nulmeting, licentie en
              controle.
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed text-sm">
              <thead>
                <tr className="bg-[#252525] text-xs uppercase text-zinc-300">
                  <th className="w-[26%] px-3 py-3 text-left">Vechter</th>
                  <th className="w-[10%] px-3 py-3 text-left">VA</th>
                  <th className="w-[18%] px-3 py-3 text-left">Nulmeting</th>
                  <th className="w-[12%] px-3 py-3 text-left">Record</th>
                  <th className="w-[14%] px-3 py-3 text-left">Licentie</th>
                  <th className="w-[14%] px-3 py-3 text-left">Controle</th>
                  <th className="w-[6%] px-3 py-3 text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-14 text-center text-zinc-300"
                    >
                      <RefreshCw className="mx-auto mb-3 animate-spin text-[#ff6a2a]" />
                      Vechters laden...
                    </td>
                  </tr>
                )}

                {!loading &&
                  filtered.map((f, idx) => {
                    const raw = parseRaw(f.raw);
                    const lic = licenseValue(f);
                    const licOk = yes(lic);
                    const startverbod = hasStartverbod(f);
                    const nulKlasse = safe(
                      f.nulmeting_klasse ?? raw?.nulmeting?.klasse,
                    );
                    const nulTotaal = safe(
                      f.nulmeting_totaal ?? raw?.nulmeting?.totaal,
                      "0",
                    );

                    return (
                      <tr
                        key={
                          f.id || `${f.sportschool_id}-${f.va_nummer}-${idx}`
                        }
                        className="border border-zinc-800 bg-[#171717] hover:bg-[#202020]"
                      >
                        <td className="px-3 py-2.5 align-middle">
                          <div className="truncate font-black text-[#ff6a2a]">
                            {fighterName(f)}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-[#c8bdb3]">
                            {formatDate(dob(f))} • {safe(f.geslacht)}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          <span className="rounded-xl border border-[#8f857d] bg-[#100e0c] px-2.5 py-1 font-mono text-xs font-black text-white shadow-sm shadow-black/40">
                            {safe(f.va_nummer)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-middle text-zinc-200">
                          <div className="truncate font-black">{nulKlasse}</div>
                          <div className="text-xs text-[#9f948c]">
                            Totaal nulmeting: {nulTotaal}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          <div className="font-black text-white">
                            {recordLabelFromUitslagen(uitslagenByVa[normalizeVa(f.va_nummer)] ?? [])}
                          </div>
                          <div className="text-xs text-[#9f948c]">
                            {(uitslagenByVa[normalizeVa(f.va_nummer)] ?? []).length || 0} partijen
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          {licOk ? (
                            <Badge
                              icon={<ShieldCheck size={15} />}
                              label="OK"
                              tone="good"
                            />
                          ) : (
                            <Badge
                              icon={<ShieldAlert size={15} />}
                              label="Geen licentie"
                              tone="bad"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          {startverbod ? (
                            <Badge
                              icon={<AlertTriangle size={15} />}
                              label="Startverbod"
                              tone="bad"
                            />
                          ) : (
                            <span
                              className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1 text-xs font-black ${statusClass(f)}`}
                            >
                              {statusLabel(f)}
                            </span>
                          )}
                          {f.scrape_error && (
                            <div className="mt-1 max-w-[180px] truncate text-[11px] text-red-300">
                              {f.scrape_error}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right align-middle">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/sportscholen/vechters/${f.id}`,
                              )
                            }
                            className="sportschool-silver-btn inline-flex h-9 w-9 items-center justify-center border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 font-black !text-black transition hover:brightness-110"
                            title="Open profiel"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          </div>

          {!loading && filtered.length === 0 && (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl border border-white/20 bg-black/50 text-[#ffb28a]">
                <Users size={24} />
              </div>
              <div className="text-lg font-black text-white">
                Geen vechters gevonden
              </div>
              <div className="mt-1 text-sm text-[#c8bdb3]">
                Er zijn nog geen vechters geladen voor deze sportschool of je
                zoekopdracht geeft geen resultaat.
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  icon,
  good,
  bad,
  warn,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  good?: boolean;
  bad?: boolean;
  warn?: boolean;
}) {
  const cls = good
    ? "border-emerald-400/60 bg-[#10261b] text-emerald-100"
    : bad
      ? "border-red-500/60 bg-[#2a1111] text-red-200"
      : warn
        ? "border-[#ff7a3d]/60 bg-[#2a1c14] text-[#ffd2bd]"
        : "border-[#8f857d] bg-[#11100f] text-zinc-100";

  return (
    <div className={`rounded-2xl border-2 p-3 ${cls}`}>
      <div className="flex items-center justify-between text-current/80">
        <span className="text-xs font-black uppercase tracking-[0.22em]">
          {label}
        </span>
        {icon}
      </div>
      <div className="mt-1 text-3xl font-black leading-none text-white">
        {value}
      </div>
    </div>
  );
}

function Badge({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "good" | "bad";
}) {
  const cls =
    tone === "good"
      ? "border-emerald-400/60 bg-[#10261b] text-emerald-200"
      : "border-red-500/60 bg-[#2a1111] text-red-200";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1 text-xs font-bold ${cls}`}
    >
      {icon}
      {label}
    </span>
  );
}
