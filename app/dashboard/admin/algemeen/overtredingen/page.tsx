"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, BadgeCheck, Gavel, Inbox, Plus, Search, ShieldAlert, UserRound } from "lucide-react";

type DisciplineCase = {
  [key: string]: any;
  id: string;
  type: string;
  status: string;
  betrokkene_type: string;
  naam: string;
  va_nummer?: number | null;
  categorie: string;
  ernst: string;
  omschrijving: string;
  interne_notitie?: string | null;
  aangemaakt_op: string;
  actieve_acties?: number;
  punten_totaal?: number;
  bron_type?: string | null;
  bron?: string | null;
  melding_bron?: string | null;
  melder_naam?: string | null;
  melder_email?: string | null;
  melder_rol?: string | null;
  melder_role?: string | null;
  melder_bondteam?: string | null;
  aangemaakt_door_role?: string | null;
  aangemaakt_door_rol?: string | null;
  aangemaakt_door_email?: string | null;
  aangemaakt_door_naam?: string | null;
  aangemaakt_door_bondteam?: string | null;
  gemeld_door_user_id?: string | null;
  gemeld_door_naam?: string | null;
  gemeld_door_email?: string | null;
  gemeld_door_role?: string | null;
  gemeld_door_rol?: string | null;
  gemeld_door_bondteam?: string | null;
  gemeld_op?: string | null;
};

const BETROKKENEN = ["matchmaker", "vechter", "official", "sportschool", "bondteam", "anders"];
const TYPES = ["overtreding", "waarschuwing", "notitie", "maatregel"];
const ERNST = ["laag", "middel", "hoog", "ernstig"];

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function badgeClass(value: string) {
  if (["ernstig", "hoog", "open"].includes(value)) return "border-red-400/40 bg-red-950/50 text-red-100";
  if (["middel", "in_behandeling"].includes(value)) return "border-orange-400/50 bg-orange-950/40 text-orange-100";
  if (["afgerond", "laag"].includes(value)) return "border-emerald-400/40 bg-emerald-950/40 text-emerald-100";
  return "border-zinc-500/50 bg-zinc-900 text-zinc-200";
}

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function norm(v: unknown) {
  return clean(v).toLowerCase();
}

function pick(item: DisciplineCase, keys: string[]) {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function bronVan(item: DisciplineCase) {
  return norm(pick(item, ["bron_type", "bron", "melding_bron", "BRON", "BRON_TYPE", "MELDING_BRON"]));
}

function melderRolVan(item: DisciplineCase) {
  return norm(pick(item, [
    "gemeld_door_role", "gemeld_door_rol", "melder_rol", "melder_role",
    "aangemaakt_door_role", "aangemaakt_door_rol", "MELDER_ROL", "MELDER_ROLE",
    "GEMELD_DOOR_ROLE", "GEMELD_DOOR_ROL"
  ]));
}

function melderNaamVan(item: DisciplineCase) {
  return clean(pick(item, ["gemeld_door_naam", "melder_naam", "aangemaakt_door_naam", "MELDER_NAAM", "GEMELD_DOOR_NAAM"])) || "Official";
}

function melderEmailVan(item: DisciplineCase) {
  return clean(pick(item, ["gemeld_door_email", "melder_email", "aangemaakt_door_email", "MELDER_EMAIL", "GEMELD_DOOR_EMAIL"]));
}

function melderBondteamVan(item: DisciplineCase) {
  return clean(pick(item, ["gemeld_door_bondteam", "melder_bondteam", "aangemaakt_door_bondteam", "MELDER_BONDTEAM", "GEMELD_DOOR_BONDTEAM"]));
}

function officialMetaText(item: DisciplineCase) {
  return norm([
    bronVan(item),
    melderRolVan(item),
    pick(item, ["gemeld_door_user_id", "GEMELD_DOOR_USER_ID"]),
    pick(item, ["gemeld_door_naam", "melder_naam", "MELDER_NAAM"]),
    pick(item, ["gemeld_door_email", "melder_email", "MELDER_EMAIL"]),
    item.interne_notitie,
    item.omschrijving,
  ].join(" "));
}

function isOfficialMelding(item: DisciplineCase) {
  const bron = bronVan(item);
  const rol = melderRolVan(item);
  const meta = officialMetaText(item);

  return (
    bron === "official" ||
    bron === "official_melding" ||
    bron.includes("official") ||
    rol === "official" ||
    rol === "hoofdofficial" ||
    meta.includes("melding aangemaakt door official") ||
    meta.includes("bron: official") ||
    meta.includes("melder_rol: official") ||
    Boolean(pick(item, ["gemeld_door_user_id", "GEMELD_DOOR_USER_ID"])) ||
    Boolean(pick(item, ["gemeld_door_naam", "gemeld_door_email", "melder_naam", "melder_email", "MELDER_NAAM", "MELDER_EMAIL"]))
  );
}

function isAdminDossier(item: DisciplineCase) {
  return !isOfficialMelding(item);
}

const silverButton =
  "inline-flex items-center justify-center gap-2 border border-zinc-200 bg-gradient-to-b from-white via-zinc-300 to-zinc-500 px-4 py-3 text-sm font-black uppercase !text-[#11100f] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_24px_rgba(0,0,0,0.35)] hover:from-white hover:via-zinc-200 hover:to-zinc-400 disabled:cursor-not-allowed disabled:opacity-60";

export default function OvertredingenPage() {
  const [cases, setCases] = useState<DisciplineCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("alle");
  const [betrokkeneType, setBetrokkeneType] = useState("alle");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bronFilter, setBronFilter] = useState<"alle" | "official_melding" | "admin_dossier">("alle");
  const [form, setForm] = useState({
    type: "overtreding",
    betrokkene_type: "matchmaker",
    naam: "",
    va_nummer: "",
    categorie: "",
    ernst: "laag",
    omschrijving: "",
    interne_notitie: "",
    matchmaking_id: "",
    event_id: "",
    bout_id: "",
  });

  async function enrichCaseDetail(item: DisciplineCase): Promise<DisciplineCase> {
    // De lijst-API geeft bij sommige dossiers niet alle melder/bron-velden terug,
    // terwijl de detailpagina ze wel toont. Daarom halen we per dossier veilig de detail op
    // en mergen we die metadata terug voor de juiste tab-indeling.
    try {
      const res = await fetch(`/api/admin/discipline/cases/${item.id}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) return item;
      const detail = json?.case || json?.item || json?.data || json?.dossier || null;
      return detail ? { ...item, ...detail } : item;
    } catch {
      return item;
    }
  }

  async function load() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    // Bron-filter doen we client-side, omdat oude en nieuwe meldingen verschillende velden gebruiken:
    // bron=official, bron_type=official_melding, melder_rol=Official of gemeld_door_*.
    params.set("status", status);
    params.set("betrokkene_type", betrokkeneType);
    if (q.trim()) params.set("q", q.trim());

    const res = await fetch(`/api/admin/discipline/cases?${params.toString()}`, { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) setError(json.error || "Kon dossiers niet laden.");

    const baseCases: DisciplineCase[] = json.cases || [];
    const enriched = await Promise.all(baseCases.map((item) => enrichCaseDetail(item)));
    setCases(enriched);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, betrokkeneType, bronFilter]);

  const stats = useMemo(() => {
    const open = cases.filter((c) => c.status === "open").length;
    const active = cases.reduce((sum, c) => sum + Number(c.actieve_acties || 0), 0);
    const points = cases.reduce((sum, c) => sum + Number(c.punten_totaal || 0), 0);
    const officialMeldingen = cases.filter(isOfficialMelding).length;
    const adminDossiers = cases.filter(isAdminDossier).length;
    return { open, active, points, officialMeldingen, adminDossiers };
  }, [cases]);

  const visibleCases = useMemo(() => {
    if (bronFilter === "official_melding") return cases.filter(isOfficialMelding);
    if (bronFilter === "admin_dossier") return cases.filter(isAdminDossier);
    return cases;
  }, [cases, bronFilter]);

  async function createCase(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/admin/discipline/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        va_nummer: form.va_nummer || null,
        matchmaking_id: form.matchmaking_id || null,
        event_id: form.event_id || null,
        bout_id: form.bout_id || null,
      }),
    });
    const json = await res.json();
    setSaving(false);

    if (!json.ok) {
      setError(json.error || "Opslaan mislukt.");
      return;
    }

    setShowForm(false);
    setForm({
      type: "overtreding",
      betrokkene_type: "matchmaker",
      naam: "",
      va_nummer: "",
      categorie: "",
      ernst: "laag",
      omschrijving: "",
      interne_notitie: "",
      matchmaking_id: "",
      event_id: "",
      bout_id: "",
    });
    await load();
  }

  return (
    <main className="min-h-screen bg-[#171514] text-zinc-100">
      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard/admin/beheer" className={silverButton}>
            <ArrowLeft size={16} /> Terug naar admin/beheer
          </Link>
          <Link href="/dashboard/admin/algemeen" className="inline-flex items-center justify-center gap-2 border border-zinc-500 bg-[#211f1d] px-4 py-3 text-sm font-black uppercase text-zinc-200 hover:border-orange-400">
            Terug naar admin/algemeen
          </Link>
        </div>

        <header className="mb-6 overflow-hidden border border-zinc-500/40 bg-gradient-to-br from-[#2a2724] via-[#161514] to-black shadow-2xl">
          <div className="border-b border-orange-500/40 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 border border-orange-500/50 bg-black/40 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-orange-300">
                  <ShieldAlert size={15} /> FightSupport Admin
                </div>
                <h1 className="text-3xl font-black uppercase tracking-wide text-white">Dossiers & Sancties</h1>
                <p className="mt-2 max-w-3xl text-sm text-zinc-300">
                  Registreer overtredingen, waarschuwingen, notities, sancties en vervolgstappen voor matchmakers, vechters en officials.
                </p>
              </div>
              <button
                onClick={() => setShowForm((v) => !v)}
                className="inline-flex items-center gap-2 border border-zinc-300 bg-gradient-to-b from-zinc-100 to-zinc-500 px-4 py-3 text-sm font-black uppercase text-black shadow-lg hover:from-white hover:to-zinc-400"
              >
                <Plus size={18} /> Nieuw dossier
              </button>
            </div>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-4">
            <div className="border border-zinc-600/70 bg-black/35 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Open dossiers</div>
              <div className="mt-1 text-3xl font-black text-orange-300">{stats.open}</div>
            </div>
            <div className="border border-zinc-600/70 bg-black/35 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Actieve vervolgstappen</div>
              <div className="mt-1 text-3xl font-black text-white">{stats.active}</div>
            </div>
            <div className="border border-zinc-600/70 bg-black/35 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Minpunten totaal</div>
              <div className="mt-1 text-3xl font-black text-zinc-200">{stats.points}</div>
            </div>
            <button
              type="button"
              onClick={() => setBronFilter((v) => v === "official_melding" ? "alle" : "official_melding")}
              className={cls(
                "border p-4 text-left transition",
                bronFilter === "official_melding"
                  ? "border-orange-400 bg-orange-950/40"
                  : "border-zinc-600/70 bg-black/35 hover:border-orange-400/60"
              )}
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400"><Inbox size={15} /> Meldingen officials</div>
              <div className="mt-1 text-3xl font-black text-orange-300">{stats.officialMeldingen}</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-zinc-500">Admin gemaakt: {stats.adminDossiers}</div>
            </button>
          </div>
        </header>

        {showForm && (
          <form onSubmit={createCase} className="mb-6 border border-orange-500/40 bg-[#211f1d] p-5 shadow-2xl">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black uppercase text-orange-300"><Gavel size={20} /> Nieuw dossier</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="block text-xs font-bold uppercase text-zinc-400">Type
                <select className="mt-1 w-full border border-zinc-600 bg-black p-3 text-white" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400">Betrokkene
                <select className="mt-1 w-full border border-zinc-600 bg-black p-3 text-white" value={form.betrokkene_type} onChange={(e) => setForm({ ...form, betrokkene_type: e.target.value })}>
                  {BETROKKENEN.map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400">Naam
                <input required className="mt-1 w-full border border-zinc-600 bg-black p-3 text-white" value={form.naam} onChange={(e) => setForm({ ...form, naam: e.target.value })} />
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400">VA nummer
                <input className="mt-1 w-full border border-zinc-600 bg-black p-3 text-white" value={form.va_nummer} onChange={(e) => setForm({ ...form, va_nummer: e.target.value })} />
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400 md:col-span-2">Categorie
                <input required placeholder="bijv. verlopen keurmerk, no-show, foutieve uitslag" className="mt-1 w-full border border-zinc-600 bg-black p-3 text-white" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} />
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400">Ernst
                <select className="mt-1 w-full border border-zinc-600 bg-black p-3 text-white" value={form.ernst} onChange={(e) => setForm({ ...form, ernst: e.target.value })}>
                  {ERNST.map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400">Matchmaking ID
                <input className="mt-1 w-full border border-zinc-600 bg-black p-3 text-white" value={form.matchmaking_id} onChange={(e) => setForm({ ...form, matchmaking_id: e.target.value })} />
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400 md:col-span-2">Omschrijving
                <textarea required rows={4} className="mt-1 w-full border border-zinc-600 bg-black p-3 text-white" value={form.omschrijving} onChange={(e) => setForm({ ...form, omschrijving: e.target.value })} />
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400 md:col-span-2">Interne notitie
                <textarea rows={4} className="mt-1 w-full border border-zinc-600 bg-black p-3 text-white" value={form.interne_notitie} onChange={(e) => setForm({ ...form, interne_notitie: e.target.value })} />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="border border-zinc-600 px-4 py-3 text-sm font-black uppercase text-zinc-200">Annuleren</button>
              <button disabled={saving} className="border border-orange-400 bg-orange-600 px-4 py-3 text-sm font-black uppercase text-white disabled:opacity-60">{saving ? "Opslaan..." : "Dossier opslaan"}</button>
            </div>
          </form>
        )}

        <section className="mb-4 border border-zinc-600/60 bg-[#211f1d] p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 text-zinc-500" size={18} />
              <input className="w-full border border-zinc-600 bg-black py-3 pl-10 pr-3 text-white" placeholder="Zoek op naam, categorie of omschrijving" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
            </div>
            <select className="border border-zinc-600 bg-black p-3 text-white" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="open">open</option><option value="in_behandeling">in behandeling</option><option value="afgerond">afgerond</option><option value="alle">alle</option>
            </select>
            <select className="border border-zinc-600 bg-black p-3 text-white" value={betrokkeneType} onChange={(e) => setBetrokkeneType(e.target.value)}>
              <option value="alle">alle betrokkenen</option>{BETROKKENEN.map((x) => <option key={x}>{x}</option>)}
            </select>
            <button onClick={load} className="border border-zinc-300 bg-zinc-200 px-4 py-3 font-black uppercase text-black">Zoeken</button>
          </div>
        </section>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBronFilter("alle")}
            className={cls(
              "inline-flex items-center gap-2 border px-4 py-2 text-xs font-black uppercase",
              bronFilter === "alle"
                ? "border-zinc-200 bg-gradient-to-b from-white via-zinc-300 to-zinc-500 text-black"
                : "border-zinc-600 bg-[#211f1d] text-zinc-200 hover:border-orange-400"
            )}
          >
            Alle dossiers
          </button>
          <button
            type="button"
            onClick={() => setBronFilter("official_melding")}
            className={cls(
              "inline-flex items-center gap-2 border px-4 py-2 text-xs font-black uppercase",
              bronFilter === "official_melding"
                ? "border-zinc-200 bg-gradient-to-b from-white via-zinc-300 to-zinc-500 text-black"
                : "border-orange-500/50 bg-orange-950/30 text-orange-200 hover:border-orange-400"
            )}
          >
            <Inbox size={15} /> Binnengekomen meldingen officials ({stats.officialMeldingen})
          </button>
          <button
            type="button"
            onClick={() => setBronFilter("admin_dossier")}
            className={cls(
              "inline-flex items-center gap-2 border px-4 py-2 text-xs font-black uppercase",
              bronFilter === "admin_dossier"
                ? "border-zinc-200 bg-gradient-to-b from-white via-zinc-300 to-zinc-500 text-black"
                : "border-zinc-600 bg-[#211f1d] text-zinc-200 hover:border-orange-400"
            )}
          >
            <Gavel size={15} /> Gemaakt door admin ({stats.adminDossiers})
          </button>
        </div>

        {error && <div className="mb-4 border border-red-400/50 bg-red-950/40 p-4 font-bold text-red-100">{error}</div>}
        {loading ? <div className="border border-zinc-600 bg-black/50 p-8 text-center font-bold text-zinc-300">Dossiers laden...</div> : null}

        <div className="grid gap-3">
          {!loading && visibleCases.length === 0 && <div className="border border-zinc-600 bg-black/50 p-8 text-center font-bold text-zinc-300">{bronFilter === "official_melding" ? "Geen binnengekomen official-meldingen gevonden." : bronFilter === "admin_dossier" ? "Geen door admin gemaakte dossiers gevonden." : "Geen dossiers gevonden."}</div>}
          {visibleCases.map((item) => (
            <Link key={item.id} href={`/dashboard/admin/algemeen/overtredingen/${item.id}`} className="group border border-zinc-600/70 bg-gradient-to-r from-[#24211f] to-[#111] p-4 shadow-xl hover:border-orange-400/70">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xl font-black uppercase text-white group-hover:text-orange-200">{item.naam}</span>
                    {item.va_nummer ? <span className="border border-zinc-600 bg-black px-2 py-1 text-xs font-black text-zinc-300">VA {item.va_nummer}</span> : null}
                    <span className="border border-orange-500/50 bg-orange-950/30 px-2 py-1 text-xs font-black uppercase text-orange-200">{item.betrokkene_type}</span>
                    {isOfficialMelding(item) ? (
                      <span className="inline-flex items-center gap-1 border border-orange-400/70 bg-orange-950/50 px-2 py-1 text-xs font-black uppercase text-orange-100">
                        <Inbox size={13} /> Melding official
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm font-bold text-zinc-300">{item.categorie}</div>
                  {isOfficialMelding(item) ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 border border-zinc-600/80 bg-black/35 px-3 py-2 text-xs font-bold text-zinc-200">
                      <span className="inline-flex items-center gap-1 text-orange-200"><UserRound size={13} /> Gemeld door:</span>
                      <span>{melderNaamVan(item) || "Onbekende official"}</span>
                      {melderRolVan(item) ? <span className="text-zinc-500">· {melderRolVan(item)}</span> : null}
                      {melderBondteamVan(item) ? <span className="border border-zinc-500 bg-[#111] px-2 py-0.5 text-zinc-100">Bondteam {melderBondteamVan(item)}</span> : null}
                      {melderEmailVan(item) ? <span className="text-zinc-400">· {melderEmailVan(item)}</span> : null}
                      {item.gemeld_op ? <span className="text-zinc-500">· {new Date(item.gemeld_op).toLocaleDateString("nl-NL")}</span> : null}
                    </div>
                  ) : null}
                  <p className="mt-2 line-clamp-2 max-w-4xl text-sm text-zinc-400">{item.omschrijving}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <span className={cls("border px-2 py-1 text-xs font-black uppercase", badgeClass(item.status))}>{item.status}</span>
                  <span className={cls("border px-2 py-1 text-xs font-black uppercase", badgeClass(item.ernst))}>{item.ernst}</span>
                  {Number(item.actieve_acties || 0) > 0 ? <span className="border border-orange-400/50 bg-orange-950/50 px-2 py-1 text-xs font-black text-orange-100"><AlertTriangle size={13} className="inline" /> {item.actieve_acties} actief</span> : <span className="border border-emerald-400/40 bg-emerald-950/40 px-2 py-1 text-xs font-black text-emerald-100"><BadgeCheck size={13} className="inline" /> geen actief</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
