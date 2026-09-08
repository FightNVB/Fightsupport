"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { authedFetch } from "@/lib/api/authedFetch";

type Row = Record<string, any>;
type Hoek = "rood" | "blauw";

const emptyForm = {
  va_nummer: "",
  vechter_naam: "",
  datum: "",
  discipline: "",
  klasse: "",
  tegenstander: "",
  uitslag: "W",
  evenement: "",
  organisatie: "",
  land: "",
  bewijs_opmerking: "",
};

function s(v: unknown) { return String(v ?? "").trim(); }
function pick(row: Row | null | undefined, keys: string[]) {
  for (const key of keys) { const value = s(row?.[key]); if (value) return value; }
  return "";
}
function normaliseHeaderText(v: string) {
  return String(v ?? "").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim().toUpperCase();
}
function findResultHeaders(): Array<{ el: HTMLElement; hoek: Hoek }> {
  const all = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6,div,span,p"));
  const out: Array<{ el: HTMLElement; hoek: Hoek }> = [];
  for (const el of all) {
    if (el.dataset.foreignResultsTarget === "1") continue;
    const txt = normaliseHeaderText(el.textContent ?? "");
    if (txt === "ROOD - UITSLAGEN") out.push({ el, hoek: "rood" });
    if (txt === "BLAUW - UITSLAGEN") out.push({ el, hoek: "blauw" });
  }
  return out.filter(({ el }) => !Array.from(el.children).some((child) => {
    const txt = normaliseHeaderText((child as HTMLElement).textContent ?? "");
    return txt === "ROOD - UITSLAGEN" || txt === "BLAUW - UITSLAGEN";
  }));
}
function inferFighterFromNearbyDom(header: HTMLElement, hoek: Hoek) {
  let node: HTMLElement | null = header; let text = "";
  for (let i = 0; i < 6 && node; i += 1) { text = String(node.textContent ?? ""); if (/VA(?:-nummer)?\s*[:#]?\s*\d+/i.test(text)) break; node = node.parentElement; }
  const vaMatches = [...text.matchAll(/VA(?:-nummer)?\s*[:#]?\s*(\d+)/gi)].map((m) => m[1]);
  return { va_nummer: (hoek === "rood" ? vaMatches[0] : vaMatches[1] ?? vaMatches[0]) || "" };
}
function fighterFromBout(bout: Row | null | undefined, aanmeldingen: Row[], hoek: Hoek) {
  if (!bout) return {};
  const prefix = hoek === "rood" ? "rood" : "blauw";
  const english = hoek === "rood" ? "red" : "blue";
  const inschrijvingId = pick(bout, [`${prefix}_inschrijving_id`, `${english}_inschrijving_id`, `${prefix}_aanmelding_id`, `${english}_aanmelding_id`]);
  const aanmelding = inschrijvingId ? aanmeldingen.find((row) => s(row?.id) === inschrijvingId) ?? null : null;
  return {
    va_nummer: pick(bout, [`va_${prefix}`, `${prefix}_va`, `${prefix}_va_mm`, `${prefix}_va_fp`, `${english}_va`]) || pick(aanmelding, ["va_nummer", "va", "fightpaspoort_nummer"]),
    vechter_naam: pick(bout, [`${prefix}_naam`, `${prefix}_naam_mm`, `${prefix}_naam_fp`, `${english}_naam`]) || pick(aanmelding, ["naam", "fighter_naam", "vechter_naam"]),
    discipline: pick(bout, ["discipline", "discipline_mm", "sport"]) || pick(aanmelding, ["discipline", "sport"]),
    klasse: pick(bout, ["klasse_mm", "klasse"]) || pick(aanmelding, ["klasse", "klasse_mm"]),
  };
}

export default function BuitenlandseUitslagenPanel() {
  const path = usePathname() ?? "";
  const mm = path.match(/^\/dashboard\/matchmaker\/matchmaking\/([^/]+)\/partij\/(\d+)/);
  const admin = path.match(/^\/dashboard\/admin\/controle\/([^/]+)\/partij\/(\d+)/);
  const match = mm || admin; const isAdmin = !!admin;
  const matchmakingId = match?.[1] ?? ""; const partijNr = match?.[2] ?? "";
  const [open, setOpen] = useState(false); const [activeHoek, setActiveHoek] = useState<Hoek>("rood");
  const [rows, setRows] = useState<Row[]>([]); const [saving, setSaving] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false); const [msg, setMsg] = useState("");
  const [form, setForm] = useState(emptyForm);
  const pending = useMemo(() => rows.filter((r) => r.status !== "VERWERKT_IN_FIGHTPASSPORT" && r.status !== "AFGEWEZEN").length, [rows]);

  async function load() {
    if (!matchmakingId) return;
    const r = await authedFetch(`/api/matchmaker/buitenlandse-uitslagen?matchmaking_id=${encodeURIComponent(matchmakingId)}`);
    const j = await r.json().catch(() => ({}));
    if (r.ok) setRows((j.uitslagen ?? []).filter((x: Row) => String(x.partij_nr ?? "") === partijNr));
  }
  async function prefillFighter(header: HTMLElement, hoek: Hoek) {
    const domFallback = inferFighterFromNearbyDom(header, hoek); setForm({ ...emptyForm, ...domFallback });
    if (!matchmakingId) return; setPrefillLoading(true);
    try {
      const res = await authedFetch(`/api/matchmaker/${encodeURIComponent(matchmakingId)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({})); if (!res.ok) throw new Error(json?.error || "Vechtergegevens laden mislukt");
      const bouts: Row[] = Array.isArray(json?.bouts) ? json.bouts : Array.isArray(json?.matches) ? json.matches : [];
      const aanmeldingen: Row[] = Array.isArray(json?.aanmeldingen) ? json.aanmeldingen : [];
      const bout = bouts.find((row) => String(row?.partij_nr ?? "") === String(partijNr)) ?? null;
      const fighter = fighterFromBout(bout, aanmeldingen, hoek);
      setForm((current) => ({ ...current, ...fighter, va_nummer: s((fighter as any).va_nummer) || current.va_nummer }));
    } catch (e: any) { setMsg(e?.message || "Vechtergegevens konden niet automatisch worden ingevuld."); }
    finally { setPrefillLoading(false); }
  }
  useEffect(() => { void load(); }, [matchmakingId, partijNr]);
  useEffect(() => {
    if (!match) return; const cleanup: Array<() => void> = [];
    const mountButtons = () => {
      for (const { el, hoek } of findResultHeaders()) {
        if (el.dataset.foreignResultsTarget === "1") continue;
        if (isAdmin && rows.length === 0) continue;
        el.dataset.foreignResultsTarget = "1";
        const button = document.createElement("button"); button.type = "button"; button.dataset.foreignResultsButton = "1";
        button.title = isAdmin ? "Buitenlandse uitslagen bekijken" : "Buitenlandse partij toevoegen";
        button.textContent = isAdmin ? `Buitenlands ${pending || rows.length}` : "+";
        button.className = isAdmin ? "ml-2 inline-flex items-center rounded border border-[#ff4d00] bg-[#171717] px-2 py-1 text-[11px] font-black text-white hover:bg-[#242424]" : "ml-2 inline-flex h-7 w-7 items-center justify-center rounded border border-[#ff4d00] bg-[#171717] text-lg font-black leading-none text-white hover:bg-[#ff4d00]";
        const onClick = (event: Event) => { event.preventDefault(); event.stopPropagation(); setActiveHoek(hoek); setMsg(""); if (!isAdmin) void prefillFighter(el, hoek); setOpen(true); };
        button.addEventListener("click", onClick);
        if (getComputedStyle(el).display === "block") { el.style.display = "flex"; el.style.alignItems = "center"; el.style.gap = "0.25rem"; }
        el.appendChild(button); cleanup.push(() => { button.removeEventListener("click", onClick); button.remove(); delete el.dataset.foreignResultsTarget; });
      }
    };
    mountButtons(); const observer = new MutationObserver(() => mountButtons()); observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); cleanup.forEach((fn) => fn()); document.querySelectorAll<HTMLElement>("[data-foreign-results-target='1']").forEach((el) => delete el.dataset.foreignResultsTarget); document.querySelectorAll<HTMLElement>("[data-foreign-results-button='1']").forEach((el) => el.remove()); };
  }, [matchmakingId, partijNr, isAdmin, pending, rows.length]);
  if (!match) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    try {
      const r = await authedFetch("/api/matchmaker/buitenlandse-uitslagen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, matchmaking_id: matchmakingId, partij_nr: Number(partijNr) }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error ?? "Opslaan mislukt");
      setMsg("Buitenlandse partij ingediend voor NVB-controle.");
      setForm((current) => ({ ...emptyForm, va_nummer: current.va_nummer, vechter_naam: current.vechter_naam, discipline: current.discipline, klasse: current.klasse })); await load();
    } catch (e: any) { setMsg(e?.message ?? "Opslaan mislukt"); } finally { setSaving(false); }
  }
  async function status(id: string, next: string) {
    const r = await authedFetch("/api/matchmaker/buitenlandse-uitslagen", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: next }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) return setMsg(j.error ?? "Bijwerken mislukt"); await load();
  }
  const fieldClass = "rounded border border-zinc-600 bg-zinc-900 p-2 text-white placeholder:text-zinc-400 [color-scheme:dark] focus:border-[#ff4d00] focus:outline-none";

  return <>{open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
    <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg border border-zinc-500 bg-[#171717] p-5 text-white shadow-2xl">
      <div className="mb-4 flex items-center justify-between"><div><div className="text-xs font-black uppercase tracking-widest text-[#ff4d00]">Partij {partijNr} · {activeHoek === "rood" ? "Rood" : "Blauw"}</div><h2 className="text-xl font-black">{isAdmin ? "Buitenlandse partijen controleren" : "Buitenlandse uitslag melden"}</h2></div><button type="button" onClick={() => setOpen(false)} className="text-2xl text-zinc-300">×</button></div>
      {!isAdmin && <form onSubmit={submit} className="space-y-4">
        <div className="rounded border border-zinc-700 bg-zinc-900 p-3"><div className="text-xs font-black uppercase tracking-wide text-[#ff4d00]">Vechter</div>{prefillLoading ? <div className="mt-1 text-sm text-zinc-300">Vechtergegevens laden…</div> : <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-200"><b>{form.vechter_naam || "Naam onbekend"}</b><span>VA {form.va_nummer || "ontbreekt"}</span><span>{form.discipline || "Discipline onbekend"}</span><span>{form.klasse ? `Klasse ${form.klasse}` : "Klasse onbekend"}</span></div>}</div>
        <div><div className="mb-2 text-xs font-black uppercase tracking-wide text-zinc-300">Uitslag *</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["W","Winst"],["V","Verlies"],["G","Onbeslist"],["NC","No contest"]].map(([value,label]) => <button key={value} type="button" onClick={() => setForm({ ...form, uitslag: value })} className={`rounded border px-3 py-3 text-sm font-black ${form.uitslag === value ? "border-[#ff4d00] bg-[#ff4d00] text-white" : "border-zinc-600 bg-zinc-900 text-zinc-200 hover:border-zinc-400"}`}>{label}</button>)}</div></div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><label className="text-xs font-bold text-zinc-300">Datum<input required type="date" value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })} className={`mt-1 w-full ${fieldClass}`} /></label><label className="text-xs font-bold text-zinc-300">Tegenstander <span className="font-normal text-zinc-500">(optioneel)</span><input placeholder="Naam tegenstander" value={form.tegenstander} onChange={(e) => setForm({ ...form, tegenstander: e.target.value })} className={`mt-1 w-full ${fieldClass}`} /></label><label className="text-xs font-bold text-zinc-300 md:col-span-2">Evenement <span className="font-normal text-zinc-500">(optioneel)</span><input placeholder="Naam evenement" value={form.evenement} onChange={(e) => setForm({ ...form, evenement: e.target.value })} className={`mt-1 w-full ${fieldClass}`} /></label></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="text-xs text-zinc-400">Meer hoeft de matchmaker niet aan te leveren; de NVB controleert en schrijft de uitslag bij.</div><button disabled={saving || prefillLoading} className="rounded bg-[#ff4d00] px-4 py-2 font-black text-white disabled:opacity-50">{saving ? "Opslaan…" : "Uitslag melden"}</button></div>
      </form>}
      {msg && <div className="my-3 rounded border border-zinc-600 bg-zinc-900 p-2 text-sm text-white">{msg}</div>}
      <div className="mt-5 space-y-2">{rows.length === 0 && <div className="text-sm text-zinc-400">Geen buitenlandse partijen gemeld voor deze partij.</div>}{rows.map((r) => <div key={r.id} className="rounded border border-zinc-700 bg-zinc-900 p-3"><div className="flex flex-wrap justify-between gap-2"><b>{r.vechter_naam || "Vechter"} · VA {r.va_nummer}</b><span className="text-xs font-black text-[#ff4d00]">{r.status}</span></div><div className="mt-1 text-sm text-zinc-300">{r.datum || "datum onbekend"} · {r.uitslag === "W" ? "Winst" : r.uitslag === "V" ? "Verlies" : r.uitslag === "G" ? "Onbeslist" : "No contest"}{r.tegenstander ? ` · vs ${r.tegenstander}` : ""}{r.evenement ? ` · ${r.evenement}` : ""}</div>{r.bewijs_opmerking && <div className="mt-1 text-xs text-zinc-400">{r.bewijs_opmerking}</div>}{isAdmin && r.status !== "VERWERKT_IN_FIGHTPASSPORT" && r.status !== "AFGEWEZEN" && <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => status(r.id, "GOEDGEKEURD")} className="rounded border border-green-700 px-3 py-1 text-xs font-bold text-white">Goedkeuren</button><button type="button" onClick={() => status(r.id, "VERWERKT_IN_FIGHTPASSPORT")} className="rounded bg-[#ff4d00] px-3 py-1 text-xs font-bold text-white">Verwerkt in Fightpassport</button><button type="button" onClick={() => status(r.id, "AFGEWEZEN")} className="rounded border border-red-700 px-3 py-1 text-xs font-bold text-white">Afwijzen</button></div>}</div>)}</div>
    </div>
  </div>}</>;
}
