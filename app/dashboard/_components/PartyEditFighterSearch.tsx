"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";

type School = {
  sportschool_id: number;
  naam: string;
  plaats?: string | null;
  aliases?: string[];
  zoeknamen?: string[];
};

type Fighter = {
  va_nummer: string;
  naam: string;
  geboortedatum?: string | null;
  sportscholen?: School[];
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function fmtDate(value?: string | null) {
  const raw = clean(value);
  if (!raw) return "-";
  const [y, m, d] = raw.slice(0, 10).split("-");
  return y && m && d ? `${d}-${m}-${y}` : raw;
}

function findEditModal(): HTMLElement | null {
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>("[role='dialog']"));
  const dialog = dialogs.find((el) => /Bewerk persoon/i.test(el.textContent ?? ""));
  if (dialog) return dialog;

  const textNodes = Array.from(document.querySelectorAll<HTMLElement>("div,section"));
  return textNodes.find((el) => /Bewerk persoon/i.test(el.textContent ?? "") && el.querySelector("input")) ?? null;
}

function findLabelInput(modal: HTMLElement, label: RegExp): HTMLInputElement | null {
  const inputs = Array.from(modal.querySelectorAll<HTMLInputElement>("input"));
  for (const input of inputs) {
    const wrapper = input.parentElement;
    const text = wrapper?.textContent ?? "";
    if (label.test(text)) return input;
  }
  return null;
}

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export default function PartyEditFighterSearch() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [fighters, setFighters] = useState<Fighter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const sync = () => setHost(findEditModal());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open || schools.length) return;
    authedFetch("/api/matchmaker/fighter-selector", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Sportscholen konden niet worden geladen.");
        setSchools(Array.isArray(json?.sportscholen) ? json.sportscholen : []);
      })
      .catch((e) => setError(e?.message || "Sportscholen konden niet worden geladen."));
  }, [open, schools.length]);

  const filteredSchools = useMemo(() => {
    const needle = schoolQuery.trim().toLocaleLowerCase("nl-NL");
    if (!needle) return schools.slice(0, 40);
    return schools
      .filter((school) => {
        const names = [school.naam, ...(school.zoeknamen ?? []), ...(school.aliases ?? [])];
        return names.some((name) => clean(name).toLocaleLowerCase("nl-NL").includes(needle));
      })
      .slice(0, 40);
  }, [schoolQuery, schools]);

  async function search() {
    if (!q.trim() && !birthDate && !schoolId) {
      setError("Vul naam/VA, geboortedatum of sportschool in.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (birthDate) params.set("geboortedatum", birthDate);
      if (schoolId) params.set("sportschool_id", schoolId);
      const res = await authedFetch(`/api/matchmaker/fighter-selector?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Zoeken mislukt.");
      setFighters(Array.isArray(json?.fighters) ? json.fighters : []);
    } catch (e: any) {
      setError(e?.message || "Zoeken mislukt.");
    } finally {
      setLoading(false);
    }
  }

  function selectFighter(fighter: Fighter, school?: School) {
    const modal = findEditModal();
    if (!modal) return;
    const vaInput = findLabelInput(modal, /VA nummer/i);
    const nameInput = findLabelInput(modal, /Naam/i);
    const gymInput = findLabelInput(modal, /Sportschool/i);
    if (vaInput) setReactInputValue(vaInput, clean(fighter.va_nummer));
    if (nameInput) setReactInputValue(nameInput, clean(fighter.naam));
    if (gymInput && school?.naam) setReactInputValue(gymInput, clean(school.naam));
    setOpen(false);
  }

  if (!host) return null;

  const button = (
    <button
      type="button"
      onClick={() => {
        const modal = findEditModal();
        const currentName = modal ? findLabelInput(modal, /Naam/i)?.value ?? "" : "";
        const currentGym = modal ? findLabelInput(modal, /Sportschool/i)?.value ?? "" : "";
        setQ(currentName);
        setSchoolQuery(currentGym);
        setOpen(true);
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-orange-500/50 bg-orange-500/10 px-2.5 py-1.5 text-xs font-bold text-orange-300 hover:bg-orange-500/20"
    >
      <Search size={14} /> Zoeken
    </button>
  );

  return (
    <>
      {createPortal(
        <div className="mt-2 flex justify-end" data-party-fighter-search="true">{button}</div>,
        host,
      )}
      {open && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="w-full max-w-3xl rounded-xl border border-white/15 bg-zinc-950 p-4 text-white shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><div className="text-lg font-extrabold">Zoek vechter</div><div className="text-xs text-zinc-400">Zoekt in de FightPassport database.</div></div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-zinc-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-xs font-bold text-zinc-300">Naam of VA
                <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} className="mt-1 w-full rounded-md border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-500" placeholder="Naam of VA nummer" />
              </label>
              <label className="text-xs font-bold text-zinc-300">Geboortedatum
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="mt-1 w-full rounded-md border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-500" />
              </label>
              <label className="text-xs font-bold text-zinc-300">Sportschool
                <input value={schoolQuery} onChange={(e) => { setSchoolQuery(e.target.value); setSchoolId(""); }} className="mt-1 w-full rounded-md border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-500" placeholder="Zoek sportschool" />
                {schoolQuery && !schoolId && filteredSchools.length > 0 && <div className="absolute z-[10002] mt-1 max-h-48 w-64 overflow-auto rounded-md border border-white/15 bg-zinc-900 shadow-xl">{filteredSchools.map((school) => <button key={school.sportschool_id} type="button" onClick={() => { setSchoolId(String(school.sportschool_id)); setSchoolQuery(school.naam); }} className="block w-full border-b border-white/5 px-3 py-2 text-left text-xs hover:bg-white/10"><b>{school.naam}</b>{school.plaats ? <span className="ml-1 text-zinc-400">· {school.plaats}</span> : null}</button>)}</div>}
              </label>
            </div>

            <div className="mt-3 flex justify-end"><button type="button" onClick={search} disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-orange-500 disabled:opacity-50"><Search size={15} />{loading ? "Zoeken…" : "Zoeken"}</button></div>
            {error && <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

            <div className="mt-4 max-h-[45vh] overflow-auto rounded-lg border border-white/10">
              {!loading && fighters.length === 0 ? <div className="p-5 text-center text-sm text-zinc-500">Nog geen resultaten.</div> : fighters.map((fighter) => {
                const fighterSchools = fighter.sportscholen ?? [];
                return <div key={fighter.va_nummer} className="border-b border-white/10 p-3 last:border-b-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><div className="font-extrabold">{fighter.naam}</div><div className="mt-0.5 text-xs text-zinc-400">VA {fighter.va_nummer} · {fmtDate(fighter.geboortedatum)}</div></div>
                    {fighterSchools.length === 0 && <button type="button" onClick={() => selectFighter(fighter)} className="rounded-md border border-orange-500/50 px-3 py-1.5 text-xs font-bold text-orange-300 hover:bg-orange-500/10">Selecteer</button>}
                  </div>
                  {fighterSchools.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{fighterSchools.map((school) => <button key={school.sportschool_id} type="button" onClick={() => selectFighter(fighter, school)} className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-left text-xs hover:border-orange-500/50 hover:bg-orange-500/10"><b>{school.naam}</b>{school.plaats ? ` · ${school.plaats}` : ""}</button>)}</div>}
                </div>;
              })}
            </div>
            <div className="mt-3 text-xs text-zinc-500">Selecteren vult VA, naam en de gekozen sportschool in. Gebruik daarna de bestaande knop Opslaan in Bewerk persoon.</div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
