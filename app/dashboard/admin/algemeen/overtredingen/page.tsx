"use client";

import { authedFetch } from "@/lib/api/authedFetch";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Gavel,
  Inbox,
  Plus,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react";

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

const NVB_ORANGE = "#ff4d00";
const BETROKKENEN = ["matchmaker", "vechter", "official", "sportschool", "bondteam", "anders"];
const TYPES = ["overtreding", "waarschuwing", "notitie", "maatregel"];
const ERNST = ["laag", "middel", "hoog", "ernstig"];

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
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
  return norm(
    pick(item, [
      "gemeld_door_role",
      "gemeld_door_rol",
      "melder_rol",
      "melder_role",
      "aangemaakt_door_role",
      "aangemaakt_door_rol",
      "MELDER_ROL",
      "MELDER_ROLE",
      "GEMELD_DOOR_ROLE",
      "GEMELD_DOOR_ROL",
    ])
  );
}

function melderNaamVan(item: DisciplineCase) {
  return (
    clean(pick(item, ["gemeld_door_naam", "melder_naam", "aangemaakt_door_naam", "MELDER_NAAM", "GEMELD_DOOR_NAAM"])) ||
    "Official"
  );
}

function melderEmailVan(item: DisciplineCase) {
  return clean(pick(item, ["gemeld_door_email", "melder_email", "aangemaakt_door_email", "MELDER_EMAIL", "GEMELD_DOOR_EMAIL"]));
}

function melderBondteamVan(item: DisciplineCase) {
  return clean(
    pick(item, ["gemeld_door_bondteam", "melder_bondteam", "aangemaakt_door_bondteam", "MELDER_BONDTEAM", "GEMELD_DOOR_BONDTEAM"])
  );
}

function officialMetaText(item: DisciplineCase) {
  return norm(
    [
      bronVan(item),
      melderRolVan(item),
      pick(item, ["gemeld_door_user_id", "GEMELD_DOOR_USER_ID"]),
      pick(item, ["gemeld_door_naam", "melder_naam", "MELDER_NAAM"]),
      pick(item, ["gemeld_door_email", "melder_email", "MELDER_EMAIL"]),
      item.interne_notitie,
      item.omschrijving,
    ].join(" ")
  );
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

function isMatchmakerMelding(item: DisciplineCase) {
  const bron = bronVan(item);
  const rol = melderRolVan(item);
  const meta = officialMetaText(item);
  return (
    bron === "matchmaker" ||
    bron === "matchmaker_melding" ||
    bron.includes("matchmaker") ||
    rol === "matchmaker" ||
    meta.includes("melding aangemaakt door matchmaker") ||
    meta.includes("bron: matchmaker") ||
    meta.includes("melder_rol: matchmaker")
  );
}

function isAdminDossier(item: DisciplineCase) {
  return !isOfficialMelding(item) && !isMatchmakerMelding(item);
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("nl-NL");
}

function badgeTone(value: string) {
  const v = String(value ?? "").toLowerCase();
  if (["ernstig", "hoog", "open"].includes(v)) return "bad";
  if (["middel", "in_behandeling"].includes(v)) return "warn";
  if (["afgerond", "laag"].includes(v)) return "ok";
  return "default";
}

function StatusBadge({ value }: { value: string }) {
  const tone = badgeTone(value);
  const clsName =
    tone === "bad"
      ? "border-red-500/60 bg-red-500/15 text-red-300"
      : tone === "warn"
        ? "border-[#ff4d00]/70 bg-[#ff4d00]/10 text-[#ff7a33]"
        : tone === "ok"
          ? "border-green-500/50 bg-green-500/10 text-green-300"
          : "border-zinc-600 bg-zinc-800 text-zinc-200";
  return <span className={`inline-flex border px-2 py-0.5 text-[11px] font-black uppercase ${clsName}`}>{value || "-"}</span>;
}

function StatBox({ label, value, active, onClick }: { label: string; value: number; active?: boolean; onClick?: () => void }) {
  const inner = (
    <div
      className={cls(
        "border p-3 text-left shadow-sm",
        active ? "border-[#ff4d00] bg-[#ff4d00]/10" : "border-zinc-600 bg-[#1c1c1c]"
      )}
    >
      <b className="text-2xl text-[#ff4d00]">{value}</b>
      <p className="mt-1 text-xs font-black uppercase tracking-wide text-zinc-400">{label}</p>
    </div>
  );
  if (!onClick) return inner;
  return <button type="button" onClick={onClick} className="block w-full">{inner}</button>;
}

function SilverLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:brightness-110"
    >
      {children}
    </Link>
  );
}

function SilverButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function OrangeButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export default function OvertredingenPage() {
  const [cases, setCases] = useState<DisciplineCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("alle");
  const [betrokkeneType, setBetrokkeneType] = useState("alle");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bronFilter, setBronFilter] = useState<"alle" | "official_melding" | "matchmaker_melding" | "admin_dossier">("alle");
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
    try {
      const res = await authedFetch(`/api/admin/discipline/cases/${item.id}`, { cache: "no-store" });
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
    params.set("status", status);
    params.set("betrokkene_type", betrokkeneType);
    if (q.trim()) params.set("q", q.trim());

    try {
      const res = await authedFetch(`/api/admin/discipline/cases?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!json.ok) setError(json.error || "Kon dossiers niet laden.");
      const baseCases: DisciplineCase[] = json.cases || [];
      const enriched = await Promise.all(baseCases.map((item) => enrichCaseDetail(item)));
      setCases(enriched);
    } catch (e: any) {
      setError(e?.message ?? "Kon dossiers niet laden.");
      setCases([]);
    } finally {
      setLoading(false);
    }
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
    const matchmakerMeldingen = cases.filter(isMatchmakerMelding).length;
    const adminDossiers = cases.filter(isAdminDossier).length;
    return { open, active, points, officialMeldingen, matchmakerMeldingen, adminDossiers };
  }, [cases]);

  const visibleCases = useMemo(() => {
    if (bronFilter === "official_melding") return cases.filter(isOfficialMelding);
    if (bronFilter === "matchmaker_melding") return cases.filter(isMatchmakerMelding);
    if (bronFilter === "admin_dossier") return cases.filter(isAdminDossier);
    return cases;
  }, [cases, bronFilter]);

  async function createCase(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await authedFetch("/api/admin/discipline/cases", {
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
      const json = await res.json().catch(() => ({}));
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
                FightSupport Admin / Discipline
              </p>
              <h1 className="text-2xl font-black uppercase">Dossiers & Sancties</h1>
              <p className="mt-1 text-sm text-zinc-300">Overtredingen, meldingen, waarschuwingen en vervolgstappen.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SilverLink href="/dashboard/admin/"><ArrowLeft size={16} /> Terug naar admin</SilverLink>
              <OrangeButton onClick={() => setShowForm((v) => !v)}><Plus size={17} /> Nieuw dossier</OrangeButton>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-6">
          <StatBox label="Open dossiers" value={stats.open} />
          <StatBox label="Actieve stappen" value={stats.active} />
          <StatBox label="Minpunten totaal" value={stats.points} />
          <StatBox label="Officials" value={stats.officialMeldingen} active={bronFilter === "official_melding"} onClick={() => setBronFilter((v) => (v === "official_melding" ? "alle" : "official_melding"))} />
          <StatBox label="Matchmakers" value={stats.matchmakerMeldingen} active={bronFilter === "matchmaker_melding"} onClick={() => setBronFilter((v) => (v === "matchmaker_melding" ? "alle" : "matchmaker_melding"))} />
          <StatBox label="Admin dossiers" value={stats.adminDossiers} active={bronFilter === "admin_dossier"} onClick={() => setBronFilter((v) => (v === "admin_dossier" ? "alle" : "admin_dossier"))} />
        </div>

        {showForm ? (
          <form onSubmit={createCase} className="m-4 border border-[#ff4d00]/60 bg-[#1c1c1c] p-4">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black uppercase text-[#ff4d00]"><Gavel size={20} /> Nieuw dossier</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Type"><Select value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPES} /></Field>
              <Field label="Betrokkene"><Select value={form.betrokkene_type} onChange={(v) => setForm({ ...form, betrokkene_type: v })} options={BETROKKENEN} /></Field>
              <Field label="Naam"><Input required value={form.naam} onChange={(v) => setForm({ ...form, naam: v })} /></Field>
              <Field label="VA nummer"><Input value={form.va_nummer} onChange={(v) => setForm({ ...form, va_nummer: v })} /></Field>
              <Field label="Categorie" className="md:col-span-2"><Input required placeholder="bijv. no-show" value={form.categorie} onChange={(v) => setForm({ ...form, categorie: v })} /></Field>
              <Field label="Ernst"><Select value={form.ernst} onChange={(v) => setForm({ ...form, ernst: v })} options={ERNST} /></Field>
              <Field label="Matchmaking ID"><Input value={form.matchmaking_id} onChange={(v) => setForm({ ...form, matchmaking_id: v })} /></Field>
              <Field label="Omschrijving" className="md:col-span-2"><Textarea required rows={4} value={form.omschrijving} onChange={(v) => setForm({ ...form, omschrijving: v })} /></Field>
              <Field label="Interne notitie" className="md:col-span-2"><Textarea rows={4} value={form.interne_notitie} onChange={(v) => setForm({ ...form, interne_notitie: v })} /></Field>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <SilverButton onClick={() => setShowForm(false)}>Annuleren</SilverButton>
              <button disabled={saving} className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black disabled:opacity-60">
                {saving ? "Opslaan..." : "Dossier opslaan"}
              </button>
            </div>
          </form>
        ) : null}

        <div className="border-b border-zinc-700 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 text-zinc-500" size={18} />
              <input
                className="h-11 w-full border border-zinc-700 bg-[#171717] py-3 pl-10 pr-3 text-white outline-none focus:border-[#ff4d00]"
                placeholder="Zoek op naam, categorie of omschrijving"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
              />
            </div>
            <select className="h-11 border border-zinc-700 bg-[#171717] px-3 text-white outline-none" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="open">open</option><option value="in_behandeling">in behandeling</option><option value="afgerond">afgerond</option><option value="alle">alle</option>
            </select>
            <select className="h-11 border border-zinc-700 bg-[#171717] px-3 text-white outline-none" value={betrokkeneType} onChange={(e) => setBetrokkeneType(e.target.value)}>
              <option value="alle">alle betrokkenen</option>{BETROKKENEN.map((x) => <option key={x}>{x}</option>)}
            </select>
            <SilverButton onClick={load}>Zoeken</SilverButton>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <FilterButton active={bronFilter === "alle"} onClick={() => setBronFilter("alle")}>Alle dossiers</FilterButton>
            <FilterButton active={bronFilter === "official_melding"} onClick={() => setBronFilter("official_melding")}><Inbox size={15} /> Officials</FilterButton>
            <FilterButton active={bronFilter === "matchmaker_melding"} onClick={() => setBronFilter("matchmaker_melding")}><Inbox size={15} /> Matchmakers</FilterButton>
            <FilterButton active={bronFilter === "admin_dossier"} onClick={() => setBronFilter("admin_dossier")}><Gavel size={15} /> Admin</FilterButton>
          </div>
        </div>

        {error ? <div className="m-4 border border-red-500 bg-red-950/60 p-3 text-sm font-bold text-red-200">{error}</div> : null}
        {loading ? <div className="m-4 border border-zinc-700 bg-[#171717] p-8 text-center font-bold text-zinc-300">Dossiers laden...</div> : null}

        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[1120px] border-collapse text-sm">
            <thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
              <tr>
                <th className="border border-zinc-700 p-2">Naam</th>
                <th className="border border-zinc-700 p-2">Bron</th>
                <th className="border border-zinc-700 p-2">Categorie</th>
                <th className="border border-zinc-700 p-2">Betrokkene</th>
                <th className="border border-zinc-700 p-2">Status</th>
                <th className="border border-zinc-700 p-2">Ernst</th>
                <th className="border border-zinc-700 p-2">Acties</th>
                <th className="border border-zinc-700 p-2 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {!loading && visibleCases.length === 0 ? (
                <tr className="bg-[#171717]"><td colSpan={8} className="border border-zinc-800 p-4 text-zinc-300">Geen dossiers gevonden.</td></tr>
              ) : null}
              {visibleCases.map((item, index) => {
                const zebra = index % 2 === 0;
                const source = isOfficialMelding(item) ? "Official" : isMatchmakerMelding(item) ? "Matchmaker" : "Admin";
                return (
                  <tr key={item.id} style={{ backgroundColor: zebra ? "#ffffff" : "#171717", color: zebra ? "#000000" : "#ffffff" }}>
                    <td className="border border-zinc-800 p-2">
                      <b style={{ color: "#ff4d00" }}>{item.naam || "-"}</b>
                      {item.va_nummer ? <div className="text-xs opacity-75">VA {item.va_nummer}</div> : null}
                      <p className="mt-1 line-clamp-2 text-xs opacity-75">{item.omschrijving}</p>
                    </td>
                    <td className="border border-zinc-800 p-2">
                      <div className="font-bold">{source}</div>
                      {source !== "Admin" ? (
                        <div className="mt-1 text-xs opacity-75">
                          <UserRound size={12} className="inline" /> {melderNaamVan(item)} {melderEmailVan(item) ? `· ${melderEmailVan(item)}` : ""}
                        </div>
                      ) : null}
                    </td>
                    <td className="border border-zinc-800 p-2 font-bold">{item.categorie || "-"}</td>
                    <td className="border border-zinc-800 p-2"><StatusBadge value={item.betrokkene_type} /></td>
                    <td className="border border-zinc-800 p-2"><StatusBadge value={item.status} /></td>
                    <td className="border border-zinc-800 p-2"><StatusBadge value={item.ernst} /></td>
                    <td className="border border-zinc-800 p-2">
                      {Number(item.actieve_acties || 0) > 0 ? (
                        <span className="font-black" style={{ color: "#ff4d00" }}><AlertTriangle size={13} className="inline" /> {item.actieve_acties} actief</span>
                      ) : (
                        <span style={{ color: zebra ? "#111827" : "#bbf7d0" }}><BadgeCheck size={13} className="inline" /> geen actief</span>
                      )}
                    </td>
                    <td className="border border-zinc-800 p-2 text-right">
                      <Link className="inline-block border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-3 py-1 text-xs font-black uppercase !text-black" href={`/dashboard/admin/algemeen/overtredingen/${item.id}`}>
                        Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cls(
        "inline-flex items-center gap-2 border px-4 py-2 text-xs font-black uppercase",
        active ? "border-zinc-200 bg-gradient-to-b from-white via-zinc-300 to-zinc-500 text-black" : "border-zinc-600 bg-[#211f1d] text-zinc-200 hover:border-[#ff4d00]"
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <label className={cls("block text-xs font-bold uppercase text-zinc-400", className)}>{label}{children}</label>;
}

function Input({ value, onChange, required, placeholder = "" }: { value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return <input required={required} placeholder={placeholder} className="mt-1 w-full border border-zinc-600 bg-black p-3 text-white outline-none focus:border-[#ff4d00]" value={value} onChange={(e) => onChange(e.target.value)} />;
}

function Textarea({ value, onChange, required, rows }: { value: string; onChange: (v: string) => void; required?: boolean; rows: number }) {
  return <textarea required={required} rows={rows} className="mt-1 w-full border border-zinc-600 bg-black p-3 text-white outline-none focus:border-[#ff4d00]" value={value} onChange={(e) => onChange(e.target.value)} />;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select className="mt-1 w-full border border-zinc-600 bg-black p-3 text-white outline-none focus:border-[#ff4d00]" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((x) => <option key={x}>{x}</option>)}
    </select>
  );
}
