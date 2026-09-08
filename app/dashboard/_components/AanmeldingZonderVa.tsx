"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { authedFetch } from "@/lib/api/authedFetch";

const initialForm = {
  naam: "",
  gym: "",
  geslacht: "",
  discipline: "KICKBOKSEN",
  klasse: "",
  gewicht: "",
  email: "",
  telefoon: "",
};

function normalize(v: string) {
  return String(v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

export default function AanmeldingZonderVa() {
  const path = usePathname() ?? "";
  const match = path.match(/^\/dashboard\/matchmaker\/matchmaking\/([^/]+)\/aanmeldingen\/?$/);
  const matchmakingId = match?.[1] ?? "";
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (!matchmakingId) return;

    const cleanups: Array<() => void> = [];

    const mount = () => {
      if (document.querySelector("[data-zonder-va-button='1']")) return;
      const nodes = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6,div,span,p"));
      const title = nodes.find((el) => normalize(el.textContent ?? "") === "handmatig toevoegen");
      if (!title) return;

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.zonderVaButton = "1";
      button.textContent = "+ Zonder VA";
      button.className = "ml-2 inline-flex items-center rounded border border-[#ff4d00] bg-[#171717] px-2.5 py-1 text-xs font-black text-white hover:bg-[#ff4d00]";
      button.title = "Aanmelding toevoegen zonder VA-nummer";

      const onClick = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        setMsg("");
        setOpen(true);
      };
      button.addEventListener("click", onClick);

      const target = title.parentElement ?? title;
      if (getComputedStyle(target).display === "block") {
        target.style.display = "flex";
        target.style.alignItems = "center";
        target.style.gap = "0.4rem";
        target.style.flexWrap = "wrap";
      }
      target.appendChild(button);

      cleanups.push(() => {
        button.removeEventListener("click", onClick);
        button.remove();
      });
    };

    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach((fn) => fn());
      document.querySelectorAll("[data-zonder-va-button='1']").forEach((el) => el.remove());
    };
  }, [matchmakingId]);

  if (!matchmakingId) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.naam.trim()) return setMsg("Vul de naam van de vechter in.");
    if (!form.gym.trim()) return setMsg("Vul de sportschool in.");
    if (!form.klasse.trim()) return setMsg("Vul de klasse in.");
    if (!form.gewicht.trim()) return setMsg("Vul het wedstrijdgewicht in.");

    setSaving(true);
    setMsg("");
    try {
      const res = await authedFetch("/api/matchmaker/add-fighter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          manual_without_va: true,
          va_nummer: "",
          ...form,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Toevoegen mislukt.");

      setMsg(`${form.naam} is toegevoegd zonder VA-nummer.`);
      setForm(initialForm);
      window.setTimeout(() => window.location.reload(), 650);
    } catch (e: any) {
      setMsg(e?.message || "Toevoegen mislukt.");
    } finally {
      setSaving(false);
    }
  }

  return open ? (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <form onSubmit={submit} className="w-full max-w-2xl rounded-lg border border-zinc-600 bg-[#171717] p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-[#ff4d00]">Aanmeldingen</div>
            <h2 className="text-xl font-black">Vechter zonder VA toevoegen</h2>
            <p className="mt-1 text-sm text-zinc-400">Deze aanmelding komt automatisch onder Zonder VA te staan en kan later aan FightPassport worden gekoppeld.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="text-2xl text-zinc-300">×</button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input required placeholder="Naam vechter *" value={form.naam} onChange={(e) => setForm({ ...form, naam: e.target.value })} className="rounded border border-zinc-600 bg-zinc-900 p-2" />
          <input required placeholder="Sportschool *" value={form.gym} onChange={(e) => setForm({ ...form, gym: e.target.value })} className="rounded border border-zinc-600 bg-zinc-900 p-2" />
          <select value={form.geslacht} onChange={(e) => setForm({ ...form, geslacht: e.target.value })} className="rounded border border-zinc-600 bg-zinc-900 p-2">
            <option value="">Geslacht</option>
            <option value="Man">Man</option>
            <option value="Vrouw">Vrouw</option>
          </select>
          <select value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })} className="rounded border border-zinc-600 bg-zinc-900 p-2">
            <option value="KICKBOKSEN">Kickboksen</option>
            <option value="THAIBOKSEN">Thaiboksen</option>
            <option value="MMA">MMA</option>
          </select>
          <input required placeholder="Klasse *" value={form.klasse} onChange={(e) => setForm({ ...form, klasse: e.target.value.toUpperCase() })} className="rounded border border-zinc-600 bg-zinc-900 p-2" />
          <input required placeholder="Gewicht kg *" inputMode="decimal" value={form.gewicht} onChange={(e) => setForm({ ...form, gewicht: e.target.value })} className="rounded border border-zinc-600 bg-zinc-900 p-2" />
          <input placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded border border-zinc-600 bg-zinc-900 p-2" />
          <input placeholder="Telefoon" value={form.telefoon} onChange={(e) => setForm({ ...form, telefoon: e.target.value })} className="rounded border border-zinc-600 bg-zinc-900 p-2" />
        </div>

        {msg && <div className="mt-3 rounded border border-zinc-600 bg-zinc-900 p-2 text-sm">{msg}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="rounded border border-zinc-600 px-4 py-2 text-sm font-bold">Annuleren</button>
          <button disabled={saving} className="rounded bg-[#ff4d00] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
            {saving ? "Toevoegen…" : "Toevoegen zonder VA"}
          </button>
        </div>
      </form>
    </div>
  ) : null;
}
