"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import {
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Search,
  Printer,
  FileText,
} from "lucide-react";

const LOGO = "/branding/fightsupport/fightsupport1.png";

type Melding = {
  id: string;
  created_at?: string | null;
  aangemaakt_op?: string | null;
  gemeld_op?: string | null;
  datum_overtreding?: string | null;
  datum?: string | null;
  status?: string | null;
  betrokkene_type?: string | null;
  type?: string | null;
  naam?: string | null;
  betrokkene_naam?: string | null;
  va_nummer?: string | null;
  categorie?: string | null;
  ernst?: string | null;
  omschrijving?: string | null;
  beschrijving?: string | null;
  interne_notitie?: string | null;
  bron?: string | null;
  melding_bron?: string | null;
  melder_naam?: string | null;
  melder_email?: string | null;
  melder_bondteam?: string | null;
  aangemaakt_door_naam?: string | null;
  aangemaakt_door_email?: string | null;
};

function silverButton(extra = "") {
  return [
    "inline-flex items-center justify-center gap-2 border border-zinc-300",
    "bg-gradient-to-b from-white via-zinc-200 to-zinc-500",
    "px-4 py-3 text-sm font-black uppercase text-black shadow-lg",
    "hover:from-white hover:to-zinc-400 disabled:opacity-60",
    extra,
  ].join(" ");
}

function darkButton(extra = "") {
  return [
    "inline-flex items-center justify-center gap-2 border border-orange-500/45",
    "bg-black/45 px-4 py-3 text-sm font-black uppercase text-orange-200",
    "hover:border-orange-300 hover:bg-black/70 disabled:opacity-60",
    extra,
  ].join(" ");
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("nl-NL");
}

function naamVan(m: Melding) {
  return m.naam || m.betrokkene_naam || "-";
}

function typeVan(m: Melding) {
  return m.betrokkene_type || m.type || "-";
}

function datumOvertredingVan(m: Melding) {
  return m.datum_overtreding || m.datum || m.aangemaakt_op || m.gemeld_op || m.created_at || null;
}

function tekstVan(m: Melding) {
  return m.omschrijving || m.beschrijving || "-";
}

export default function OfficialsOvertredingenRapportPage() {
  const [items, setItems] = useState<Melding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    let token = "";
    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token || "";
    } catch {
      // De API geeft zelf een nette lege lijst/waarschuwing als er geen sessie is.
    }

    const res = await fetch("/api/officials/overtredingen", {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const json = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok || !json?.ok) {
      setError(json?.error || "Meldingen laden mislukt.");
      return;
    }
    if (json.warning) setError(json.warning);
    setItems(Array.isArray(json.items) ? json.items : Array.isArray(json.data) ? json.data : []);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((x) =>
      [
        naamVan(x),
        typeVan(x),
        x.va_nummer,
        x.categorie,
        x.ernst,
        x.status,
        tekstVan(x),
        x.melder_naam,
        x.melder_email,
        x.melder_bondteam,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [items, q]);

  const openCount = filtered.filter((m) => !(m.status || "open").toLowerCase().match(/afgerond|gesloten|vervallen/)).length;
  const ernstigCount = filtered.filter((m) => ["hoog", "ernstig"].includes((m.ernst || "").toLowerCase())).length;
  const reportDate = new Date().toLocaleDateString("nl-NL");

  return (
    <main className="min-h-screen px-4 py-6 print:bg-white print:px-0 print:py-0" style={{ background: "#eef0f3" }}>
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { size: A4 landscape; margin: 12mm; }
        }
      `}</style>

      <div className="mx-auto w-full max-w-[1650px] print:max-w-none">
        <div className="no-print mb-4 rounded-[32px] p-[6px]" style={{ background: "linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 22%, #8f8f8f 55%, #f0f0f0 100%)", boxShadow: "0 0 0 1px rgba(255,255,255,0.7), 0 22px 70px rgba(0,0,0,0.9)" }}>
          <div className="overflow-hidden rounded-[28px]" style={{ background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)", border: "3px solid rgba(63,63,70,0.35)" }}>
            <header className="px-6 py-5" style={{ background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)", borderBottom: "3px solid rgba(255,77,0,0.55)" }}>
              <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto_1fr]">
                <div>
                  <div className="font-extrabold uppercase" style={{ fontSize: 28, letterSpacing: "0.04em", color: "#ff4d00" }}>Rapport meldingen officials</div>
                  <div className="mt-1 text-sm text-white/85">Gegenereerd op {reportDate} · selectie: {filtered.length} melding(en)</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/dashboard/officials/overtreding-melden/overzicht" className={silverButton()}><ArrowLeft size={16} /> Terug naar overzicht</Link>
                    <Link href="/dashboard/officials" className={darkButton()}><ShieldAlert size={16} /> Officials</Link>
                  </div>
                </div>
                <div className="justify-self-center"><div className="relative h-[90px] w-[260px]"><Image src={LOGO} alt="FightSupport" fill className="object-contain" sizes="260px" /></div></div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button onClick={() => window.print()} className={silverButton()}><Printer size={16} /> Print rapport</button>
                  <button onClick={load} disabled={loading} className={darkButton()}><RefreshCw size={16} /> Verversen</button>
                </div>
              </div>
            </header>
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-3 py-2">
                <Search size={17} className="text-[#ff4d00]" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rapport filteren op naam, VA, categorie, status, melder..." className="w-full bg-transparent p-2 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-500" />
              </div>
              {error ? <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-400/50 bg-red-950/90 p-4 font-bold text-red-100"><AlertTriangle size={18} /> {error}</div> : null}
            </div>
          </div>
        </div>

        <section className="border border-zinc-500/50 bg-[#f6f3ee] p-5 text-black shadow-2xl print:border-0 print:bg-white print:p-0 print:shadow-none">
          <div className="mb-4 flex items-start justify-between gap-4 border-b-4 border-[#ff4d00] pb-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 bg-black px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#ffb38a] print:border print:border-black print:bg-white print:text-black">
                <FileText size={14} /> FightSupport rapport
              </div>
              <h1 className="text-3xl font-black uppercase tracking-wide text-black">Rapport meldingen officials</h1>
              <p className="mt-1 text-sm font-bold text-zinc-700">Gegenereerd op {reportDate} · selectie: {filtered.length} melding(en)</p>
            </div>
            <div className="relative h-14 w-48 print:hidden"><Image src={LOGO} alt="FightSupport" fill className="object-contain" sizes="192px" /></div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-4 print:grid-cols-4">
            {[["Totaal selectie", filtered.length], ["Open/actief", openCount], ["Hoog/ernstig", ernstigCount], ["Bron", "Officials"]].map(([label, value]) => (
              <div key={String(label)} className="border-2 border-zinc-800 bg-white p-3"><div className="text-[10px] font-black uppercase tracking-wider text-zinc-600">{label}</div><div className="text-2xl font-black">{value}</div></div>
            ))}
          </div>

          <div className="overflow-x-auto border-2 border-zinc-900 bg-white">
            <table className="min-w-full border-collapse text-[12px] print:text-[10px]">
              <thead>
                <tr style={{ background: "linear-gradient(180deg, #ff6a00 0%, #ff5400 100%)", color: "#fff" }}>
                  <th className="border border-zinc-800 p-2 text-left">Datum overtreding</th>
                  <th className="border border-zinc-800 p-2 text-left">Ingediend</th>
                  <th className="border border-zinc-800 p-2 text-left">Betrokkene</th>
                  <th className="border border-zinc-800 p-2 text-left">Categorie</th>
                  <th className="border border-zinc-800 p-2 text-left">Ernst</th>
                  <th className="border border-zinc-800 p-2 text-left">Status</th>
                  <th className="border border-zinc-800 p-2 text-left">Melder</th>
                  <th className="border border-zinc-800 p-2 text-left">Omschrijving</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-5 text-center font-bold">Meldingen laden...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="p-5 text-center font-bold">Geen meldingen in deze selectie.</td></tr>
                ) : filtered.map((m, idx) => (
                  <tr key={`rapport-${m.id}`} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#171717", color: idx % 2 === 0 ? "#000000" : "#ffffff" }}>
                    <td className="border border-zinc-400 p-2 font-bold">{fmtDate(datumOvertredingVan(m))}</td>
                    <td className="border border-zinc-400 p-2">{fmtDate(m.aangemaakt_op || m.gemeld_op || m.created_at)}</td>
                    <td className="border border-zinc-400 p-2"><div className="font-black" style={{ color: "#ff4d00" }}>{naamVan(m)}</div><div className="text-[10px] uppercase opacity-70">{typeVan(m)}{m.va_nummer ? ` · VA ${m.va_nummer}` : ""}</div></td>
                    <td className="border border-zinc-400 p-2">{m.categorie || "-"}</td>
                    <td className="border border-zinc-400 p-2 font-bold uppercase">{m.ernst || "-"}</td>
                    <td className="border border-zinc-400 p-2 font-bold uppercase">{m.status || "open"}</td>
                    <td className="border border-zinc-400 p-2"><div className="font-bold">{m.melder_naam || m.aangemaakt_door_naam || "Official"}</div><div className="text-[10px] opacity-70">{m.melder_bondteam || m.melder_email || m.aangemaakt_door_email || "-"}</div></td>
                    <td className="border border-zinc-400 p-2">{tekstVan(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
