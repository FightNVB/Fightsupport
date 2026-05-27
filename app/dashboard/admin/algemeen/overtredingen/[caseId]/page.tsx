"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Gavel, History, Pencil, Plus, Save, ShieldAlert, Trash2, X } from "lucide-react";

type Dossier = any;
type Action = any;

const ACTIES = [
  "GEEN_ACTIE",
  "MONDELING",
  "SCHRIFTELIJK",
  "LAATSTE_WAARSCHUWING",
  "VERSCHERPT_TOEZICHT",
  "EXTRA_CONTROLE",
  "MIN_PUNTEN",
  "BOETE",
  "STARTVERBOD",
  "SCHORSING",
  "UITSLUITING",
  "HERKEURING",
  "OPLEIDING_VERPLICHT",
  "HERSTELACTIE",
];
const BETROKKENEN = ["matchmaker", "vechter", "official", "sportschool", "bondteam", "anders"];
const TYPES = ["overtreding", "waarschuwing", "notitie", "maatregel"];
const ERNST = ["laag", "middel", "hoog", "ernstig"];
const STATUSSEN = ["open", "in_behandeling", "afgerond"];

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const silverButton =
  "inline-flex items-center justify-center gap-2 border border-zinc-200 bg-gradient-to-b from-white via-zinc-300 to-zinc-500 px-4 py-3 text-sm font-black uppercase !text-[#11100f] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_24px_rgba(0,0,0,0.35)] hover:from-white hover:via-zinc-200 hover:to-zinc-400 disabled:cursor-not-allowed disabled:opacity-60";
const fieldClass = "mt-1 w-full border border-zinc-500/80 bg-[#11100f] p-3 text-white outline-none focus:border-orange-400";

function badge(value: string) {
  const red = ["ernstig", "hoog", "open", "SCHORSING", "STARTVERBOD", "UITSLUITING"];
  const orange = ["middel", "in_behandeling", "VERSCHERPT_TOEZICHT", "EXTRA_CONTROLE", "MIN_PUNTEN", "LAATSTE_WAARSCHUWING"];
  const green = ["laag", "afgerond", "GEEN_ACTIE", "MONDELING", "HERSTELACTIE"];
  const cn = red.includes(value)
    ? "border-red-400/40 bg-red-950/50 text-red-100"
    : orange.includes(value)
    ? "border-orange-400/60 bg-orange-950/40 text-orange-100"
    : green.includes(value)
    ? "border-emerald-400/40 bg-emerald-950/40 text-emerald-100"
    : "border-zinc-500/50 bg-[#151312] text-zinc-200";
  return <span className={`border px-2 py-1 text-xs font-black uppercase ${cn}`}>{value}</span>;
}

function toDateValue(value: string | null | undefined) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export default function DossierDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [relatedCases, setRelatedCases] = useState<Dossier[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showAction, setShowAction] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    type: "overtreding",
    status: "open",
    betrokkene_type: "matchmaker",
    naam: "",
    va_nummer: "",
    categorie: "",
    datum_overtreding: "",
    ernst: "laag",
    omschrijving: "",
    interne_notitie: "",
    matchmaking_id: "",
    event_id: "",
    bout_id: "",
  });
  const [action, setAction] = useState({
    actie_type: "MONDELING",
    status: "open",
    start_datum: "",
    eind_datum: "",
    punten: "0",
    omschrijving: "",
  });
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editAction, setEditAction] = useState({
    actie_type: "MONDELING",
    status: "open",
    start_datum: "",
    eind_datum: "",
    punten: "0",
    omschrijving: "",
  });

  function fillEditForm(next: Dossier) {
    setEditForm({
      type: next?.type || "overtreding",
      status: next?.status || "open",
      betrokkene_type: next?.betrokkene_type || "matchmaker",
      naam: next?.naam || "",
      va_nummer: next?.va_nummer ? String(next.va_nummer) : "",
      categorie: next?.categorie || "",
      datum_overtreding: toDateValue(next?.datum_overtreding),
      ernst: next?.ernst || "laag",
      omschrijving: next?.omschrijving || "",
      interne_notitie: next?.interne_notitie || "",
      matchmaking_id: next?.matchmaking_id || "",
      event_id: next?.event_id || "",
      bout_id: next?.bout_id || "",
    });
  }

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/discipline/cases/${caseId}`, { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) setError(json.error || "Kon dossier niet laden.");
    setDossier(json.dossier || null);
    setActions(json.actions || []);
    setRelatedCases(json.related_cases || []);
    if (json.dossier) fillEditForm(json.dossier);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    setError("");
    const res = await fetch(`/api/admin/discipline/cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        va_nummer: editForm.va_nummer || null,
        matchmaking_id: editForm.matchmaking_id || null,
        event_id: editForm.event_id || null,
        bout_id: editForm.bout_id || null,
        datum_overtreding: editForm.datum_overtreding || null,
      }),
    });
    const json = await res.json();
    setSavingEdit(false);
    if (!json.ok) {
      setError(json.error || "Bewerken mislukt.");
      return;
    }
    setDossier(json.dossier || null);
    if (json.dossier) fillEditForm(json.dossier);
    setEditing(false);
    await load();
  }

  async function addAction(e: React.FormEvent) {
    e.preventDefault();

    // Belangrijk:
    // Een vervolgstap/sanctie mag het dossier NOOIT automatisch afronden.
    // De dossierstatus wordt alleen aangepast via "Dossier bewerken" of de knop "Afronden".
    const huidigeDossierStatus = dossier?.status || "open";

    setSaving(true);
    setError("");

    const res = await fetch(`/api/admin/discipline/cases/${caseId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...action,
        status: action.status || "open",
        punten: Number(action.punten || 0),

        // Extra flags voor routes die dit ondersteunen.
        // Routes die dit niet kennen negeren deze velden gewoon.
        close_case: false,
        afgerond: false,
        update_case_status: false,
        case_status: huidigeDossierStatus,
        dossier_status: huidigeDossierStatus,
      }),
    });

    const json = await res.json();

    if (!json.ok) {
      setSaving(false);
      setError(json.error || "Vervolgstap opslaan mislukt.");
      return;
    }

    // Veiligheidsnet:
    // Als de API-route na het toevoegen van een actie tóch het dossier op "afgerond" zet,
    // herstellen we direct de originele dossierstatus. Zo beslist de gebruiker zelf wanneer
    // het dossier echt afgerond is.
    if (huidigeDossierStatus !== "afgerond") {
      const herstelRes = await fetch(`/api/admin/discipline/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: huidigeDossierStatus,
          afgerond_op: null,
        }),
      });

      const herstelJson = await herstelRes.json().catch(() => null);
      if (!herstelRes.ok || (herstelJson && herstelJson.ok === false)) {
        setSaving(false);
        setError(
          herstelJson?.error ||
            "Vervolgstap is opgeslagen, maar dossierstatus kon niet worden hersteld. Controleer de PATCH-route."
        );
        await load();
        return;
      }
    }

    setSaving(false);
    setAction({ actie_type: "MONDELING", status: "open", start_datum: "", eind_datum: "", punten: "0", omschrijving: "" });
    setShowAction(false);
    await load();
  }

  function startEditAction(a: Action) {
    setEditingActionId(a.id);
    setEditAction({
      actie_type: a.actie_type || "MONDELING",
      status: a.status || "open",
      start_datum: toDateValue(a.start_datum),
      eind_datum: toDateValue(a.eind_datum),
      punten: String(a.punten ?? 0),
      omschrijving: a.omschrijving || "",
    });
  }

  async function saveActionEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingActionId) return;
    setSaving(true);
    setError("");

    const huidigeDossierStatus = dossier?.status || "in_behandeling";
    const res = await fetch(`/api/admin/discipline/cases/${caseId}/actions/${editingActionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editAction, punten: Number(editAction.punten || 0) }),
    });
    const json = await res.json();

    if (json.ok && huidigeDossierStatus !== "afgerond") {
      await fetch(`/api/admin/discipline/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: huidigeDossierStatus }),
      });
    }

    setSaving(false);
    if (!json.ok) {
      setError(json.error || "Vervolgstap aanpassen mislukt.");
      return;
    }
    setEditingActionId(null);
    await load();
  }

  async function closeCase() {
    if (!confirm("Dossier afronden?")) return;
    const res = await fetch(`/api/admin/discipline/cases/${caseId}/close`, { method: "POST" });
    const json = await res.json();
    if (!json.ok) setError(json.error || "Afronden mislukt.");
    await load();
  }

  async function deleteCase() {
    if (!confirm("Dossier verwijderen? Dit kan niet ongedaan gemaakt worden.")) return;
    const res = await fetch(`/api/admin/discipline/cases/${caseId}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) {
      setError(json.error || "Verwijderen mislukt.");
      return;
    }
    window.location.href = "/dashboard/admin/algemeen/overtredingen";
  }

  if (loading) return <main className="min-h-screen bg-[#24211f] p-8 text-zinc-200">Dossier laden...</main>;
  if (!dossier) return <main className="min-h-screen bg-[#24211f] p-8 text-zinc-200">Dossier niet gevonden.</main>;

  return (
    <main className="min-h-screen bg-[#24211f] text-zinc-100">
      <div className="mx-auto max-w-6xl px-5 py-6">
        <Link href="/dashboard/admin/algemeen/overtredingen" className={cls(silverButton, "mb-4 px-3 py-2")}>
          <ArrowLeft size={16} /> Terug naar dossiers
        </Link>

        <header className="mb-5 border border-zinc-400/50 bg-gradient-to-br from-[#302b27] via-[#1f1d1b] to-[#151312] shadow-2xl">
          <div className="border-b border-orange-500/50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-4">
                  <img src="/branding/fightsupport/fightsupport1.png" alt="FightSupport" className="h-14 w-auto object-contain" />
                  <div className="inline-flex items-center gap-2 border border-orange-500/60 bg-[#11100f]/70 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-orange-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                    <ShieldAlert size={15} /> Discipline dossier
                  </div>
                </div>
                <h1 className="text-3xl font-black uppercase text-white">{dossier.naam}</h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  {badge(dossier.betrokkene_type)}
                  {badge(dossier.status)}
                  {badge(dossier.ernst)}
                  {dossier.va_nummer ? badge(`VA ${dossier.va_nummer}`) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`/api/admin/discipline/reports/case/${caseId}`} target="_blank" rel="noreferrer" className={silverButton}>
                  <FileText size={17} /> Rapport dossier
                </a>
                <a href={`/api/admin/discipline/reports/offender?betrokkene_type=${encodeURIComponent(dossier.betrokkene_type || "")}&naam=${encodeURIComponent(dossier.naam || "")}&va_nummer=${encodeURIComponent(dossier.va_nummer || "")}`} target="_blank" rel="noreferrer" className={silverButton}>
                  <FileText size={17} /> Rapport overtreder
                </a>
                <button onClick={() => { fillEditForm(dossier); setEditing((v) => !v); }} className={silverButton}>
                  {editing ? <X size={17} /> : <Pencil size={17} />} {editing ? "Sluiten" : "Bewerk"}
                </button>
                <button onClick={() => setShowAction((v) => !v)} className={silverButton}>
                  <Plus size={17} /> Vervolgstap
                </button>
                <button onClick={closeCase} className={silverButton}>
                  <CheckCircle2 size={17} /> Afronden
                </button>
                <button onClick={deleteCase} className={silverButton}>
                  <Trash2 size={17} /> Verwijderen
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-5">
            <div className="border border-zinc-500/70 bg-[#11100f]/65 p-3"><div className="text-xs font-bold uppercase text-zinc-400">Categorie</div><div className="mt-1 font-black text-orange-200">{dossier.categorie}</div></div>
            <div className="border border-zinc-500/70 bg-[#11100f]/65 p-3"><div className="text-xs font-bold uppercase text-zinc-400">Datum overtreding</div><div className="mt-1 font-black text-white">{dossier.datum_overtreding ? new Date(dossier.datum_overtreding).toLocaleDateString("nl-NL") : "-"}</div></div>
            <div className="border border-zinc-500/70 bg-[#11100f]/65 p-3"><div className="text-xs font-bold uppercase text-zinc-400">Type</div><div className="mt-1 font-black text-white">{dossier.type}</div></div>
            <div className="border border-zinc-500/70 bg-[#11100f]/65 p-3"><div className="text-xs font-bold uppercase text-zinc-400">Actieve acties</div><div className="mt-1 font-black text-white">{dossier.actieve_acties || 0}</div></div>
            <div className="border border-zinc-500/70 bg-[#11100f]/65 p-3"><div className="text-xs font-bold uppercase text-zinc-400">Minpunten</div><div className="mt-1 font-black text-white">{dossier.punten_totaal || 0}</div></div>
          </div>
        </header>

        {error && <div className="mb-4 border border-red-400/50 bg-red-950/40 p-4 font-bold text-red-100">{error}</div>}

        {relatedCases.length > 0 && (
          <section className="mb-5 border border-orange-500/50 bg-[#1b1917] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-black uppercase text-orange-300">
                <History size={19} /> Eerdere dossiers zelfde betrokkene
              </h2>
              <div className="border border-orange-400/60 bg-orange-950/40 px-3 py-1 text-xs font-black uppercase text-orange-100">
                {relatedCases.length} eerder(e) dossier(s)
              </div>
            </div>
            <div className="mb-3 flex items-start gap-2 border border-red-400/40 bg-red-950/30 p-3 text-sm font-bold text-red-100">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>
                Controleer bij dezelfde categorie of hetzelfde probleem of de sanctie zwaarder moet worden, bijvoorbeeld laatste waarschuwing, verscherpt toezicht, schorsing of uitsluiting.
              </span>
            </div>
            <div className="grid gap-2">
              {relatedCases.map((c) => (
                <Link key={c.id} href={`/dashboard/admin/algemeen/overtredingen/${c.id}`} className="border border-zinc-600/80 bg-[#11100f]/70 p-3 hover:border-orange-400/80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-black uppercase text-white">{c.categorie}</div>
                      <div className="mt-1 text-xs font-bold text-zinc-400">
                        Overtreding: {c.datum_overtreding ? new Date(c.datum_overtreding).toLocaleDateString("nl-NL") : "geen datum"} · aangemaakt {new Date(c.aangemaakt_op).toLocaleDateString("nl-NL")} · status {c.status} · ernst {c.ernst}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {badge(c.status)}
                      {badge(c.ernst)}
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-300">{c.omschrijving}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {editing && (
          <form onSubmit={saveEdit} className="mb-5 border border-orange-500/50 bg-[#1b1917] p-5 shadow-2xl">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black uppercase text-orange-300"><Pencil size={20} /> Dossier bewerken</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="block text-xs font-bold uppercase text-zinc-400">Type
                <select className={fieldClass} value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>{TYPES.map((x) => <option key={x}>{x}</option>)}</select>
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400">Status
                <select className={fieldClass} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>{STATUSSEN.map((x) => <option key={x}>{x}</option>)}</select>
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400">Betrokkene
                <select className={fieldClass} value={editForm.betrokkene_type} onChange={(e) => setEditForm({ ...editForm, betrokkene_type: e.target.value })}>{BETROKKENEN.map((x) => <option key={x}>{x}</option>)}</select>
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400">Ernst
                <select className={fieldClass} value={editForm.ernst} onChange={(e) => setEditForm({ ...editForm, ernst: e.target.value })}>{ERNST.map((x) => <option key={x}>{x}</option>)}</select>
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400 md:col-span-2">Naam
                <input required className={fieldClass} value={editForm.naam} onChange={(e) => setEditForm({ ...editForm, naam: e.target.value })} />
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400">VA nummer
                <input className={fieldClass} value={editForm.va_nummer} onChange={(e) => setEditForm({ ...editForm, va_nummer: e.target.value })} />
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400">Datum overtreding
                <input type="date" className={fieldClass} value={editForm.datum_overtreding} onChange={(e) => setEditForm({ ...editForm, datum_overtreding: e.target.value })} />
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400">Matchmaking ID
                <input className={fieldClass} value={editForm.matchmaking_id} onChange={(e) => setEditForm({ ...editForm, matchmaking_id: e.target.value })} />
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400 md:col-span-4">Categorie
                <input required className={fieldClass} value={editForm.categorie} onChange={(e) => setEditForm({ ...editForm, categorie: e.target.value })} />
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400 md:col-span-2">Omschrijving
                <textarea required rows={5} className={fieldClass} value={editForm.omschrijving} onChange={(e) => setEditForm({ ...editForm, omschrijving: e.target.value })} />
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400 md:col-span-2">Interne notitie
                <textarea rows={5} className={fieldClass} value={editForm.interne_notitie} onChange={(e) => setEditForm({ ...editForm, interne_notitie: e.target.value })} />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => { fillEditForm(dossier); setEditing(false); }} className={silverButton}><X size={17} /> Annuleren</button>
              <button disabled={savingEdit} className={silverButton}><Save size={17} /> {savingEdit ? "Opslaan..." : "Wijzigingen opslaan"}</button>
            </div>
          </form>
        )}

        {showAction && (
          <form onSubmit={addAction} className="mb-5 border border-orange-500/50 bg-[#1b1917] p-5 shadow-2xl">
            <h2 className="mb-2 flex items-center gap-2 text-xl font-black uppercase text-orange-300"><Gavel size={20} /> Sanctie of vervolgstap toevoegen</h2>
            <p className="mb-4 border border-zinc-600/70 bg-[#11100f]/70 p-3 text-sm font-bold text-zinc-300">
              Een vervolgstap sluit het dossier niet af. Je kunt meerdere stappen toevoegen en sluit het dossier pas zelf af met de knop Afronden.
            </p>
            <div className="grid gap-3 md:grid-cols-5">
              <label className="block text-xs font-bold uppercase text-zinc-400 md:col-span-2">Actie
                <select className={fieldClass} value={action.actie_type} onChange={(e) => setAction({ ...action, actie_type: e.target.value })}>{ACTIES.map((x) => <option key={x}>{x}</option>)}</select>
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400">Status vervolgstap
                <select className={fieldClass} value={action.status} onChange={(e) => setAction({ ...action, status: e.target.value })}>
                  <option value="open">open</option><option value="actief">actief</option><option value="afgerond">afgerond</option><option value="ingetrokken">ingetrokken</option>
                </select>
                <span className="mt-1 block text-[11px] normal-case text-zinc-500">
                  Dit is alleen de status van deze vervolgstap, niet van het dossier.
                </span>
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400">Start
                <input type="date" className={fieldClass} value={toDateValue(action.start_datum)} onChange={(e) => setAction({ ...action, start_datum: e.target.value })} />
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400">Einde
                <input type="date" className={fieldClass} value={toDateValue(action.eind_datum)} onChange={(e) => setAction({ ...action, eind_datum: e.target.value })} />
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400">Punten
                <input type="number" className={fieldClass} value={action.punten} onChange={(e) => setAction({ ...action, punten: e.target.value })} />
              </label>
              <label className="block text-xs font-bold uppercase text-zinc-400 md:col-span-4">Omschrijving
                <textarea required rows={4} className={fieldClass} value={action.omschrijving} onChange={(e) => setAction({ ...action, omschrijving: e.target.value })} />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAction(false)} className={silverButton}>Annuleren</button>
              <button disabled={saving} className={silverButton}>{saving ? "Opslaan..." : "Vervolgstap opslaan"}</button>
            </div>
          </form>
        )}

        <section className="mb-5 grid gap-4 md:grid-cols-2">
          <div className="border border-zinc-500/70 bg-[#1b1917] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <h2 className="mb-3 text-lg font-black uppercase text-orange-300">Omschrijving</h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-200">{dossier.omschrijving}</p>
          </div>
          <div className="border border-zinc-500/70 bg-[#1b1917] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <h2 className="mb-3 text-lg font-black uppercase text-orange-300">Interne notitie</h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">{dossier.interne_notitie || "Geen interne notitie."}</p>
          </div>
        </section>

        <section className="border border-zinc-500/70 bg-[#1b1917] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          <h2 className="mb-4 text-lg font-black uppercase text-white">Sancties & vervolgstappen</h2>
          <div className="grid gap-3">
            {actions.length === 0 && <div className="border border-zinc-600/80 bg-[#11100f]/70 p-5 text-center font-bold text-zinc-400">Nog geen vervolgacties.</div>}
            {actions.map((a) => (
              <div key={a.id} className="border border-zinc-500/70 bg-[#11100f]/70 p-4">
                {editingActionId === a.id ? (
                  <form onSubmit={saveActionEdit}>
                    <div className="grid gap-3 md:grid-cols-5">
                      <label className="block text-xs font-bold uppercase text-zinc-400 md:col-span-2">Actie
                        <select className={fieldClass} value={editAction.actie_type} onChange={(e) => setEditAction({ ...editAction, actie_type: e.target.value })}>{ACTIES.map((x) => <option key={x}>{x}</option>)}</select>
                      </label>
                      <label className="block text-xs font-bold uppercase text-zinc-400">Status
                        <select className={fieldClass} value={editAction.status} onChange={(e) => setEditAction({ ...editAction, status: e.target.value })}>
                          <option value="open">open</option><option value="actief">actief</option><option value="afgerond">afgerond</option><option value="ingetrokken">ingetrokken</option><option value="vervallen">vervallen</option>
                        </select>
                      </label>
                      <label className="block text-xs font-bold uppercase text-zinc-400">Start
                        <input type="date" className={fieldClass} value={toDateValue(editAction.start_datum)} onChange={(e) => setEditAction({ ...editAction, start_datum: e.target.value })} />
                      </label>
                      <label className="block text-xs font-bold uppercase text-zinc-400">Einde
                        <input type="date" className={fieldClass} value={toDateValue(editAction.eind_datum)} onChange={(e) => setEditAction({ ...editAction, eind_datum: e.target.value })} />
                      </label>
                      <label className="block text-xs font-bold uppercase text-zinc-400">Punten
                        <input type="number" className={fieldClass} value={editAction.punten} onChange={(e) => setEditAction({ ...editAction, punten: e.target.value })} />
                      </label>
                      <label className="block text-xs font-bold uppercase text-zinc-400 md:col-span-4">Omschrijving
                        <textarea required rows={4} className={fieldClass} value={editAction.omschrijving} onChange={(e) => setEditAction({ ...editAction, omschrijving: e.target.value })} />
                      </label>
                    </div>
                    <div className="mt-4 flex justify-end gap-3">
                      <button type="button" onClick={() => setEditingActionId(null)} className={silverButton}><X size={17} /> Annuleren</button>
                      <button disabled={saving} className={silverButton}><Save size={17} /> {saving ? "Opslaan..." : "Vervolgstap bijwerken"}</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">{badge(a.actie_type)}{badge(a.status)}{Number(a.punten) !== 0 ? badge(`${a.punten} punten`) : null}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-zinc-500">{new Date(a.aangemaakt_op).toLocaleDateString("nl-NL")}</div>
                        <button type="button" onClick={() => startEditAction(a)} className={cls(silverButton, "px-3 py-2 text-xs")}>
                          <Pencil size={14} /> Bewerk
                        </button>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{a.omschrijving}</p>
                    {(a.start_datum || a.eind_datum) && <div className="mt-3 text-xs font-bold uppercase text-zinc-400">Periode: {a.start_datum || "-"} t/m {a.eind_datum || "-"}</div>}
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
