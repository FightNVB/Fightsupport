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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,77,0,0.16),transparent_30%),linear-gradient(180deg,#050505_0%,#111_38%,#020202_100%)] p-4 text-white sm:p-6">
      <style>{`
        .sportschool-silver-btn, .sportschool-silver-btn *{color:#050505!important;}
        .fs-metal-btn{transition:filter .12s ease, transform .12s ease;}
        .fs-metal-btn:hover{filter:brightness(1.08); transform:translateY(-1px);}
        .fs-panel{
          border:1px solid rgba(255,255,255,.18);
          background:linear-gradient(135deg,rgba(255,255,255,.13),rgba(255,255,255,.045) 34%,rgba(0,0,0,.36)),linear-gradient(180deg,#171717 0%,#080808 100%);
          box-shadow:0 22px 60px rgba(0,0,0,.58), inset 0 1px 0 rgba(255,255,255,.20), inset 0 -1px 0 rgba(255,255,255,.06);
        }
        .fs-steel{
          border:1px solid rgba(255,255,255,.34);
          background:linear-gradient(145deg,#fff 0%,#d8d8d8 10%,#777 20%,#f5f5f5 34%,#aaa 46%,#4e4e4e 60%,#fdfdfd 78%,#b8b8b8 100%);
          box-shadow:0 12px 28px rgba(0,0,0,.55), inset 0 2px 1px rgba(255,255,255,.86), inset 0 -2px 2px rgba(0,0,0,.70);
          padding:3px;
        }
        .fs-steel-inner{
          border:1px solid rgba(255,255,255,.11);
          background:linear-gradient(180deg,#1c1c1c 0%,#090909 100%);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.10);
        }
      `}</style>

      <section className="mx-auto max-w-7xl space-y-4">
        <header className="fs-steel">
          <div className="fs-steel-inner p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div className="min-w-0 text-center lg:text-left">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ff4d00]">
                  Sportschool
                </p>
                <h1 className="mt-1 truncate text-3xl font-black uppercase leading-none tracking-tight text-white sm:text-4xl">
                  {safe(sportschool?.naam, "Gekoppelde sportschool")}
                </h1>
                <p className="mt-2 text-sm font-bold text-zinc-300">
                  {[sportschool?.plaats, sportschool?.land].filter(Boolean).join(" • ") || "Fightcrew beheer"}
                </p>
              </div>

              <div className="flex justify-center">
                <img
                  src="/branding/fightsupport/fightsupport1.png"
                  alt="FightSupport"
                  className="h-20 w-auto max-w-[360px] object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,.65)] sm:h-24"
                />
              </div>

              <div className="flex flex-col items-center gap-3 lg:items-end">
                <div className="text-center lg:text-right">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ff4d00]">
                    FightSupport
                  </p>
                  <h2 className="mt-1 text-3xl font-black uppercase leading-none text-white sm:text-4xl">
                    Fightcrew
                  </h2>
                  <p className="mt-2 text-sm font-bold text-zinc-300">
                    Vechters, licenties, nulmeting en startverboden.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="sportschool-silver-btn fs-metal-btn inline-flex min-h-10 items-center justify-center gap-2 border border-zinc-300 bg-[linear-gradient(180deg,#ffffff,#eeeeee_18%,#bdbdbd_55%,#f8f8f8)] px-5 text-xs font-black uppercase tracking-[0.18em] text-black shadow-lg shadow-black/40"
                >
                  <ArrowLeft size={16} />
                  Terug
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 border-t border-white/15 pt-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div />
              <div className="fs-panel px-5 py-3 text-center">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#ff4d00]/60 bg-[#241008] text-[#ff4d00]">
                    <Trophy size={22} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400">
                      Keurmerk sportschool
                    </p>
                    <p className="text-lg font-black text-white">
                      <span className="text-[#ff4d00]">Einde:</span>{" "}
                      {formatDate(sportschool?.keurmerk_einde)}
                    </p>
                    <p className="text-xs font-bold text-zinc-400">
                      Start: {formatDate(sportschool?.keurmerk_start)}
                    </p>
                  </div>
                </div>
              </div>
              <div />

              {(keurmerkExpired || keurmerkSoon) && (
                <div
                  className={`lg:col-span-3 mx-auto max-w-[760px] border px-4 py-3 text-center text-sm font-black shadow-lg shadow-black/40 ${
                    keurmerkExpired
                      ? "border-red-500/70 bg-[#260d0d] text-red-200"
                      : "border-[#ff4d00]/70 bg-[#241008] text-[#ffd2bd]"
                  }`}
                >
                  {keurmerkExpired
                    ? "Keurmerk is verlopen. Vraag verlenging aan."
                    : "Let op: keurmerk verloopt binnen 2 maanden. Vraag verlenging aan via keurmerk@nederlandsevechtsportbond.nl."}
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-2 border-t border-white/15 pt-4 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="Totaal" value={stats.total} icon={<Users size={17} />} />
              <Stat label="Gecontroleerd" value={stats.gecontroleerd} icon={<CheckCircle2 size={17} />} good />
              <Stat label="Mislukt" value={stats.mislukt} icon={<XCircle size={17} />} bad />
              <Stat label="Startverbod" value={stats.startverbod} icon={<ShieldAlert size={17} />} warn />
              <Stat label="Zonder licentie" value={stats.zonderLicentie} icon={<AlertTriangle size={17} />} bad />
            </div>
          </div>
        </header>

        <section className="fs-panel p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-h-11 flex-1 items-center gap-3 border border-white/20 bg-black/45 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
              <Search size={18} className="text-[#ff4d00]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek vechter op naam, VA, discipline, klasse, status of licentie..."
                className="w-full bg-transparent py-2.5 text-sm font-bold text-white outline-none placeholder:text-zinc-500"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={downloadFightcrewExcel}
                disabled={exportLoading || loading || fighters.length === 0}
                className="sportschool-silver-btn fs-metal-btn inline-flex min-h-11 items-center justify-center gap-2 border border-zinc-300 bg-[linear-gradient(180deg,#ffffff,#eeeeee_18%,#bdbdbd_55%,#f8f8f8)] px-5 text-xs font-black uppercase tracking-[0.16em] text-black shadow-lg shadow-black/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportLoading ? <RefreshCw size={17} className="animate-spin" /> : <Download size={17} />}
                Excel
              </button>

              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="fs-metal-btn inline-flex min-h-11 items-center justify-center gap-2 border border-[#ff4d00]/70 bg-[linear-gradient(180deg,#ff7a2f,#ff4d00_48%,#8f2800)] px-5 text-xs font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-orange-950/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
                Vernieuwen
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-3 border border-red-500/60 bg-[#260d0d] p-3 text-sm font-bold text-red-200">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              <div>
                <div className="font-black">Vechters konden niet geladen worden.</div>
                <div className="mt-1 text-red-200/80">{error}</div>
              </div>
            </div>
          )}
        </section>

        <section className="fs-steel">
          <div className="fs-steel-inner">
            <div className="border-b border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,.12),rgba(0,0,0,.12))] px-5 py-3">
              <div className="text-lg font-black uppercase tracking-wide text-white">Vechters</div>
              <div className="text-xs font-bold text-zinc-400">
                Duidelijk overzicht voor trainers: VA, nulmeting, licentie en controle.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] table-fixed border-collapse text-sm">
                <thead>
                  <tr className="bg-[linear-gradient(180deg,#ffffff,#d7d7d7_24%,#777_68%,#202020)] text-xs uppercase tracking-[0.13em] text-black">
                    <th className="w-[26%] border-r border-black/25 px-3 py-3 text-left font-black">Vechter</th>
                    <th className="w-[10%] border-r border-black/25 px-3 py-3 text-left font-black">VA</th>
                    <th className="w-[18%] border-r border-black/25 px-3 py-3 text-left font-black">Nulmeting</th>
                    <th className="w-[12%] border-r border-black/25 px-3 py-3 text-left font-black">Record</th>
                    <th className="w-[14%] border-r border-black/25 px-3 py-3 text-left font-black">Licentie</th>
                    <th className="w-[14%] border-r border-black/25 px-3 py-3 text-left font-black">Controle</th>
                    <th className="w-[6%] px-3 py-3 text-right font-black">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr className="bg-[#111]">
                      <td colSpan={7} className="px-4 py-14 text-center font-bold text-zinc-300">
                        <RefreshCw className="mx-auto mb-3 animate-spin text-[#ff4d00]" />
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
                      const nulKlasse = safe(f.nulmeting_klasse ?? raw?.nulmeting?.klasse);
                      const nulTotaal = safe(f.nulmeting_totaal ?? raw?.nulmeting?.totaal, "0");

                      return (
                        <tr
                          key={f.id || `${f.sportschool_id}-${f.va_nummer}-${idx}`}
                          className="border-t border-white/10 bg-[#111] text-white"
                        >
                          <td className="px-3 py-2.5 align-middle">
                            <div className="truncate font-black uppercase tracking-[0.02em] text-[#ff4d00]">
                              {fighterName(f)}
                            </div>
                            <div className="mt-0.5 truncate text-xs font-bold text-white">
                              {formatDate(dob(f))} • {safe(f.geslacht)}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-middle text-white">
                            <span className="border border-white/25 bg-black/45 px-2.5 py-1 font-mono text-xs font-black text-white shadow-sm shadow-black/40">
                              {safe(f.va_nummer)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 align-middle text-white">
                            <div className="truncate font-black text-white">{nulKlasse}</div>
                            <div className="text-xs font-bold text-white">Totaal nulmeting: {nulTotaal}</div>
                          </td>
                          <td className="px-3 py-2.5 align-middle text-white">
                            <div className="font-black text-white">
                              {recordLabelFromUitslagen(uitslagenByVa[normalizeVa(f.va_nummer)] ?? [])}
                            </div>
                            <div className="text-xs font-bold text-white">
                              {(uitslagenByVa[normalizeVa(f.va_nummer)] ?? []).length || 0} partijen
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-middle text-white">
                            {licOk ? (
                              <Badge icon={<ShieldCheck size={15} />} label="OK" tone="good" />
                            ) : (
                              <Badge icon={<ShieldAlert size={15} />} label="Geen licentie" tone="bad" />
                            )}
                          </td>
                          <td className="px-3 py-2.5 align-middle text-white">
                            {startverbod ? (
                              <Badge icon={<AlertTriangle size={15} />} label="Startverbod" tone="bad" />
                            ) : (
                              <span className={`inline-flex items-center gap-2 border px-2.5 py-1 text-xs font-black ${statusClass(f)}`}>
                                {statusLabel(f)}
                              </span>
                            )}
                            {f.scrape_error && (
                              <div className="mt-1 max-w-[180px] truncate text-[11px] font-bold text-red-300">
                                {f.scrape_error}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right align-middle">
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/sportscholen/vechters/${f.id}`)}
                              className="sportschool-silver-btn fs-metal-btn inline-flex h-9 w-9 items-center justify-center border border-zinc-300 bg-[linear-gradient(180deg,#ffffff,#eeeeee_18%,#bdbdbd_55%,#f8f8f8)] font-black text-black shadow-lg shadow-black/30"
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

            {!loading && filtered.length === 0 && (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center border border-white/20 bg-black/50 text-[#ff4d00]">
                  <Users size={24} />
                </div>
                <div className="text-lg font-black text-white">Geen vechters gevonden</div>
                <div className="mt-1 text-sm font-bold text-zinc-300">
                  Er zijn nog geen vechters geladen voor deze sportschool of je zoekopdracht geeft geen resultaat.
                </div>
              </div>
            )}
          </div>
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
  const tone = good ? "text-emerald-200" : bad ? "text-red-200" : warn ? "text-[#ffd2bd]" : "text-white";
  const glow = good
    ? "border-emerald-400/45"
    : bad
      ? "border-red-500/45"
      : warn
        ? "border-[#ff4d00]/55"
        : "border-white/20";

  return (
    <div className={`border ${glow} bg-[linear-gradient(135deg,rgba(255,255,255,.12),rgba(0,0,0,.35))] p-3 shadow-lg shadow-black/35`}>
      <div className={`flex items-center justify-between ${tone}`}>
        <span className="text-[11px] font-black uppercase tracking-[0.22em]">
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
    <span className={`inline-flex items-center gap-2 border px-2.5 py-1 text-xs font-black ${cls}`}>
      {icon}
      {label}
    </span>
  );
}
