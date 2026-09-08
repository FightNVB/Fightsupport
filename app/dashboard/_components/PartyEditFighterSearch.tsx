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

type SearchMode = "persoon" | "sportschool";

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
  const dialog = dialogs.find((el) => /Bewerk persoon/i.test(el.textContent ?? "") && el.querySelector("input"));
  if (dialog) return dialog;

  // De bestaande partijpagina's gebruiken geen role=dialog. Kies daarom niet
  // de eerste grote pagina-container met deze tekst, maar juist de kleinste
  // container die de editvelden bevat. Dat is het witte max-w-lg editvenster.
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("div,section"))
    .filter((el) => /Bewerk persoon/i.test(el.textContent ?? "") && el.querySelector("input"))
    .sort((a, b) => {
      const aInputs = a.querySelectorAll("input").length;
      const bInputs = b.querySelectorAll("input").length;
      if (aInputs !== bInputs) return aInputs - bInputs;
      return a.querySelectorAll("*").length - b.querySelectorAll("*").length;
    });

  const editCard = candidates.find((el) => el.classList.contains("max-w-lg"));
  return editCard ?? candidates[0] ?? null;
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
  const [mode, setMode] = useState<SearchMode>("persoon");
  const [q, setQ] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
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
    if (!open || mode !== "sportschool" || schools.length) return;
    authedFetch("/api/matchmaker/fighter-selector", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Sportscholen konden niet worden geladen.");
        setSchools(Array.isArray(json?.sportscholen) ? json.sportscholen : []);
      })
      .catch((e) => setError(e?.message || "Sportscholen konden niet worden geladen."));
  }, [open, mode, schools.length]);

  const filteredSchools = useMemo(() => {
    const needle = schoolQuery.trim().toLocaleLowerCase("nl-NL");
    if (!needle) return [];
    return schools
      .filter((school) => {
        const names = [school.naam, ...(school.zoeknamen ?? []), ...(school.aliases ?? [])];
        return names.some((name) => clean(name).toLocaleLowerCase("nl-NL").includes(needle));
      })
      .slice(0, 40);
  }, [schoolQuery, schools]);

  function resetResults() {
    setFighters([]);
    setError("");
  }

  function switchMode(nextMode: SearchMode) {
    setMode(nextMode);
    resetResults();
    if (nextMode === "persoon") {
      setSchoolId("");
      setSelectedSchool(null);
      setSchoolQuery("");
    } else {
      setQ("");
      setBirthDate("");
    }
  }

  async function searchPerson() {
    if (!q.trim() && !birthDate) {
      setError("Vul een naam/VA nummer of geboortedatum in.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (birthDate) params.set("geboortedatum", birthDate);
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

  async function loadSchoolFighters(school: School) {
    setSelectedSchool(school);
    setSchoolId(String(school.sportschool_id));
    setSchoolQuery(school.naam);
    setLoading(true);
    setError("");
    setFighters([]);

    try {
      const res = await authedFetch(
        `/api/matchmaker/fighter-selector?sportschool_id=${encodeURIComponent(String(school.sportschool_id))}`,
        { cache: "no-store" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Vechters konden niet worden geladen.");
      setFighters(Array.isArray(json?.fighters) ? json.fighters : []);
    } catch (e: any) {
      setError(e?.message || "Vechters konden niet worden geladen.");
    } finally {
      setLoading(false);
    }
  }

  function selectFighter(fighter: Fighter) {
    const modal = findEditModal();
    if (!modal) return;

    const vaInput = findLabelInput(modal, /VA nummer/i);
    const nameInput = findLabelInput(modal, /Naam/i);
    const gymInput = findLabelInput(modal, /Sportschool/i);

    if (vaInput) setReactInputValue(vaInput, clean(fighter.va_nummer));
    if (nameInput) setReactInputValue(nameInput, clean(fighter.naam));

    if (mode === "sportschool" && selectedSchool && gymInput) {
      setReactInputValue(gymInput, clean(selectedSchool.naam));
    }

    setOpen(false);
  }

  if (!host) return null;

  const button = (
    <button
      type="button"
      onClick={() => {
        const modal = findEditModal();
        const currentName = modal ? findLabelInput(modal, /Naam/i)?.value ?? "" : "";
        setMode("persoon");
        setQ(currentName);
        setBirthDate("");
        setSchoolId("");
        setSchoolQuery("");
        setSelectedSchool(null);
        setFighters([]);
        setError("");
        setOpen(true);
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-orange-500 bg-orange-50 px-2.5 py-1.5 text-xs font-extrabold text-orange-700 hover:bg-orange-100"
    >
      <Search size={14} /> Zoeken
    </button>
  );

  return (
    <>
      {createPortal(
        <div className="mt-3 flex justify-end" data-party-fighter-search="true">{button}</div>,
        host,
      )}

      {open && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-3xl rounded-xl border border-white/15 bg-zinc-950 p-4 text-white shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold">Zoek vechter</div>
                <div className="text-xs text-zinc-400">Zoekt in de lokale FightPassport database.</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-zinc-400 hover:bg-white/10 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-black/30 p-1">
              <button
                type="button"
                onClick={() => switchMode("persoon")}
                className={`rounded-md px-3 py-2 text-sm font-extrabold ${mode === "persoon" ? "bg-orange-600 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
              >
                Naam / geboortedatum
              </button>
              <button
                type="button"
                onClick={() => switchMode("sportschool")}
                className={`rounded-md px-3 py-2 text-sm font-extrabold ${mode === "sportschool" ? "bg-orange-600 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
              >
                Sportschool
              </button>
            </div>

            {mode === "persoon" ? (
              <div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-bold text-zinc-300">
                    Naam of VA nummer
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchPerson()}
                      className="mt-1 w-full rounded-md border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                      placeholder="Naam of VA nummer"
                    />
                  </label>
                  <label className="text-xs font-bold text-zinc-300">
                    Geboortedatum
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="mt-1 w-full rounded-md border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                    />
                  </label>
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={searchPerson} disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-orange-500 disabled:opacity-50">
                    <Search size={15} /> {loading ? "Zoeken…" : "Zoeken"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="relative block text-xs font-bold text-zinc-300">
                  Zoek eerst de sportschool
                  <input
                    value={schoolQuery}
                    onChange={(e) => {
                      setSchoolQuery(e.target.value);
                      setSchoolId("");
                      setSelectedSchool(null);
                      setFighters([]);
                    }}
                    className="mt-1 w-full rounded-md border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                    placeholder="Naam sportschool of alias"
                  />
                  {schoolQuery && !schoolId && filteredSchools.length > 0 && (
                    <div className="absolute z-[10002] mt-1 max-h-56 w-full overflow-auto rounded-md border border-white/15 bg-zinc-900 shadow-xl">
                      {filteredSchools.map((school) => (
                        <button
                          key={school.sportschool_id}
                          type="button"
                          onClick={() => loadSchoolFighters(school)}
                          className="block w-full border-b border-white/5 px-3 py-2 text-left text-xs hover:bg-white/10"
                        >
                          <b>{school.naam}</b>
                          {school.plaats ? <span className="ml-1 text-zinc-400">· {school.plaats}</span> : null}
                        </button>
                      ))}
                    </div>
                  )}
                </label>
                {selectedSchool && (
                  <div className="mt-3 rounded-md border border-orange-500/25 bg-orange-500/10 px-3 py-2 text-sm">
                    <b>{selectedSchool.naam}</b>{selectedSchool.plaats ? ` · ${selectedSchool.plaats}` : ""}
                    <span className="ml-2 text-xs text-zinc-400">— selecteer hieronder een vechter van deze sportschool</span>
                  </div>
                )}
              </div>
            )}

            {error && <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

            <div className="mt-4 max-h-[45vh] overflow-auto rounded-lg border border-white/10">
              {loading ? (
                <div className="p-5 text-center text-sm text-zinc-400">Laden…</div>
              ) : fighters.length === 0 ? (
                <div className="p-5 text-center text-sm text-zinc-500">
                  {mode === "sportschool" && !selectedSchool ? "Zoek en selecteer eerst een sportschool." : "Nog geen resultaten."}
                </div>
              ) : (
                fighters.map((fighter) => (
                  <div key={fighter.va_nummer} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-3 last:border-b-0">
                    <div>
                      <div className="font-extrabold">{fighter.naam}</div>
                      <div className="mt-0.5 text-xs text-zinc-400">VA {fighter.va_nummer} · {fmtDate(fighter.geboortedatum)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectFighter(fighter)}
                      className="rounded-md border border-orange-500/50 px-3 py-1.5 text-xs font-bold text-orange-300 hover:bg-orange-500/10"
                    >
                      Selecteer
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 text-xs text-zinc-500">
              Bij zoeken op naam/geboortedatum blijft de sportschool uit de matchmaking staan. Bij zoeken via sportschool wordt de gekozen sportschool ingevuld. Gebruik daarna de bestaande knop Opslaan in Bewerk persoon.
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
