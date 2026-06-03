"use client";

import Link from "next/link";
import { use, useEffect, useState, type ReactNode, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Gavel,
  History,
  Pencil,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

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
  "inline-flex items-center justify-center gap-2 border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
const orangeButton =
  "inline-flex items-center justify-center gap-2 border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50";
const fieldClass = "mt-1 w-full border border-zinc-600 bg-black p-3 text-white outline-none focus:border-[#ff4d00]";

function badgeTone(value: string) {
  const red = ["ernstig", "hoog", "open", "SCHORSING", "STARTVERBOD", "UITSLUITING"];
  const orange = ["middel", "in_behandeling", "VERSCHERPT_TOEZICHT", "EXTRA_CONTROLE", "MIN_PUNTEN", "LAATSTE_WAARSCHUWING"];
  const green = ["laag", "afgerond", "GEEN_ACTIE", "MONDELING", "HERSTELACTIE"];
  if (red.includes(value)) return "bad";
  if (orange.includes(value)) return "warn";
  if (green.includes(value)) return "ok";
  return "default";
}

function Badge({ value }: { value: string }) {
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

function toDateValue(value: string | null | undefined) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function fmtDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("nl-NL");
}

function InfoBox({ label, value, orange = false }: { label: string; value: ReactNode; orange?: boolean }) {
  return (
    <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
      <div className="text-xs font-black uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={cls("mt-1 truncate text-lg font-black", orange ? "text-[#ff4d00]" : "text-white")}>{value}</div>
    </div>
  );
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
    try {
      const res = await fetch(`/api/admin/discipline/cases/${caseId}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!json.ok) setError(json.error || "Kon dossier niet laden.");
      setDossier(json.dossier || null);
      setActions(json.actions || []);
      setRelatedCases(json.related_cases || []);
      if (json.dossier) fillEditForm(json.dossier);
    } catch (e: any) {
      setError(e?.message ?? "Kon dossier niet laden.");
      setDossier(null);
      setActions([]);
      setRelatedCases([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    setError("");
    try {
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
      const json = await res.json().catch(() => ({}));
      if (!json.ok) {
        setError(json.error || "Bewerken mislukt.");
        return;
      }
      setDossier(json.dossier || null);
      if (json.dossier) fillEditForm(json.dossier);
      setEditing(false);
      await load();
    } finally {
      setSavingEdit(false);
    }
  }

  async function addAction(e: FormEvent) {
    e.preventDefault();
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
        close_case: false,
        afgerond: false,
        update_case_status: false,
        case_status: huidigeDossierStatus,
        dossier_status: huidigeDossierStatus,
      }),
    });
    const json = await res.json().catch(() => ({}));

    if (!json.ok) {
      setSaving(false);
      setError(json.error || "Vervolgstap opslaan mislukt.");
      return;
    }

    if (huidigeDossierStatus !== "afgerond") {
      const herstelRes = await fetch(`/api/admin/discipline/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: huidigeDossierStatus, afgerond_op: null }),
      });
      const herstelJson = await herstelRes.json().catch(() => null);
      if (!herstelRes.ok || (herstelJson && herstelJson.ok === false)) {
        setSaving(false);
        setError(herstelJson?.error || "Vervolgstap is opgeslagen, maar dossierstatus kon niet worden hersteld.");
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

  async function saveActionEdit(e: FormEvent) {
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
    const json = await res.json().catch(() => ({}));

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
    const json = await res.json().catch(() => ({}));
    if (!json.ok) setError(json.error || "Afronden mislukt.");
    await load();
  }

  async function deleteCase() {
    if (!confirm("Dossier verwijderen? Dit kan niet ongedaan gemaakt worden.")) return;
    const res = await fetch(`/api/admin/discipline/cases/${caseId}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!json.ok) {
      setError(json.error || "Verwijderen mislukt.");
      return;
    }
    window.location.href = "/dashboard/admin/algemeen/overtredingen";
  }

  if (loading) return <main className="min-h-screen bg-[#2b2b2b] p-8 text-zinc-200">Dossier laden...</main>;
  if (!dossier) return <main className="min-h-screen bg-[#2b2b2b] p-8 text-zinc-200">Dossier niet gevonden.</main>;

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
                FightSupport Admin / Discipline dossier
              </p>
              <h1 className="text-2xl font-black uppercase">{dossier.naam}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge value={dossier.betrokkene_type} />
                <Badge value={dossier.status} />
                <Badge value={dossier.ernst} />
                {dossier.va_nummer ? <Badge value={`VA ${dossier.va_nummer}`} /> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/admin/algemeen/overtredingen" className={silverButton}><ArrowLeft size={16} /> Terug</Link>
              <a href={`/api/admin/discipline/reports/case/${caseId}`} target="_blank" rel="noreferrer" className={silverButton}><FileText size={16} /> Rapport dossier</a>
              <a href={`/api/admin/discipline/reports/offender?betrokkene_type=${encodeURIComponent(dossier.betrokkene_type || "")}&naam=${encodeURIComponent(dossier.naam || "")}&va_nummer=${encodeURIComponent(dossier.va_nummer || "")}`} target="_blank" rel="noreferrer" className={silverButton}><FileText size={16} /> Rapport overtreder</a>
              <button onClick={() => { fillEditForm(dossier); setEditing((v) => !v); }} className={silverButton}>{editing ? <X size={16} /> : <Pencil size={16} />} {editing ? "Sluiten" : "Bewerk"}</button>
              <button onClick={() => setShowAction((v) => !v)} className={orangeButton}><Plus size={16} /> Vervolgstap</button>
              <button onClick={closeCase} className={silverButton}><CheckCircle2 size={16} /> Afronden</button>
              <button onClick={deleteCase} className={silverButton}><Trash2 size={16} /> Verwijderen</button>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-5">
          <InfoBox label="Categorie" value={dossier.categorie || "-"} orange />
          <InfoBox label="Datum overtreding" value={fmtDate(dossier.datum_overtreding)} />
          <InfoBox label="Type" value={dossier.type || "-"} />
          <InfoBox label="Actieve acties" value={dossier.actieve_acties || 0} />
          <InfoBox label="Minpunten" value={dossier.punten_totaal || 0} />
        </div>

        {error ? <div className="m-4 border border-red-500 bg-red-950/60 p-3 text-sm font-bold text-red-200">{error}</div> : null}

        {relatedCases.length > 0 ? (
          <section className="m-4 border border-[#ff4d00]/60 bg-[#1c1c1c] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-black uppercase text-[#ff4d00]"><History size={18} /> Eerdere dossiers zelfde betrokkene</h2>
              <Badge value={`${relatedCases.length} eerder`} />
            </div>
            <div className="mb-3 flex items-start gap-2 border border-red-400/40 bg-red-950/30 p-3 text-sm font-bold text-red-100">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              Controleer of de sanctie zwaarder moet worden bij herhaling.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
                  <tr><th className="border border-zinc-700 p-2">Categorie</th><th className="border border-zinc-700 p-2">Datum</th><th className="border border-zinc-700 p-2">Status</th><th className="border border-zinc-700 p-2">Ernst</th><th className="border border-zinc-700 p-2 text-right">Open</th></tr>
                </thead>
                <tbody>
                  {relatedCases.map((c, i) => {
                    const zebra = i % 2 === 0;
                    return (
                      <tr key={c.id} style={{ backgroundColor: zebra ? "#ffffff" : "#171717", color: zebra ? "#000" : "#fff" }}>
                        <td className="border border-zinc-800 p-2"><b style={{ color: "#ff4d00" }}>{c.categorie}</b><p className="line-clamp-1 text-xs opacity-75">{c.omschrijving}</p></td>
                        <td className="border border-zinc-800 p-2">{fmtDate(c.datum_overtreding || c.aangemaakt_op)}</td>
                        <td className="border border-zinc-800 p-2"><Badge value={c.status} /></td>
                        <td className="border border-zinc-800 p-2"><Badge value={c.ernst} /></td>
                        <td className="border border-zinc-800 p-2 text-right"><Link href={`/dashboard/admin/algemeen/overtredingen/${c.id}`} className="inline-block border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-3 py-1 text-xs font-black uppercase !text-black">Detail</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {editing ? (
          <form onSubmit={saveEdit} className="m-4 border border-[#ff4d00]/60 bg-[#1c1c1c] p-4">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black uppercase text-[#ff4d00]"><Pencil size={20} /> Dossier bewerken</h2>
            <DossierForm form={editForm} setForm={setEditForm} />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { fillEditForm(dossier); setEditing(false); }} className={silverButton}><X size={16} /> Annuleren</button>
              <button disabled={savingEdit} className={silverButton}><Save size={16} /> {savingEdit ? "Opslaan..." : "Wijzigingen opslaan"}</button>
            </div>
          </form>
        ) : null}

        {showAction ? (
          <form onSubmit={addAction} className="m-4 border border-[#ff4d00]/60 bg-[#1c1c1c] p-4">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-black uppercase text-[#ff4d00]"><Gavel size={20} /> Sanctie of vervolgstap toevoegen</h2>
            <p className="mb-4 border border-zinc-700 bg-[#111] p-3 text-sm font-bold text-zinc-300">Een vervolgstap sluit het dossier niet af. Je sluit het dossier zelf af met de knop Afronden.</p>
            <ActionForm action={action} setAction={setAction} />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAction(false)} className={silverButton}>Annuleren</button>
              <button disabled={saving} className={orangeButton}>{saving ? "Opslaan..." : "Vervolgstap opslaan"}</button>
            </div>
          </form>
        ) : null}

        <div className="grid gap-4 p-4 md:grid-cols-2">
          <section className="border border-zinc-700 bg-[#1c1c1c] p-4">
            <h2 className="mb-3 text-lg font-black uppercase text-[#ff4d00]">Omschrijving</h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-200">{dossier.omschrijving}</p>
          </section>
          <section className="border border-zinc-700 bg-[#1c1c1c] p-4">
            <h2 className="mb-3 text-lg font-black uppercase text-[#ff4d00]">Interne notitie</h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">{dossier.interne_notitie || "Geen interne notitie."}</p>
          </section>
        </div>

        <section className="m-4 mt-0 border border-zinc-700 bg-[#1c1c1c]">
          <div className="border-b border-zinc-700 bg-[#252525] p-3">
            <h2 className="text-lg font-black uppercase text-white">Sancties & vervolgstappen</h2>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
                <tr><th className="border border-zinc-700 p-2">Actie</th><th className="border border-zinc-700 p-2">Status</th><th className="border border-zinc-700 p-2">Periode</th><th className="border border-zinc-700 p-2">Punten</th><th className="border border-zinc-700 p-2">Omschrijving</th><th className="border border-zinc-700 p-2 text-right">Bewerk</th></tr>
              </thead>
              <tbody>
                {actions.length === 0 ? (
                  <tr className="bg-[#171717]"><td colSpan={6} className="border border-zinc-800 p-4 text-center text-zinc-300">Nog geen vervolgacties.</td></tr>
                ) : null}
                {actions.map((a, index) => {
                  const zebra = index % 2 === 0;
                  const editingThisAction = editingActionId === a.id;
                  return (
                    <tr key={a.id} style={{ backgroundColor: zebra ? "#ffffff" : "#171717", color: zebra ? "#000" : "#fff" }}>
                      {editingThisAction ? (
                        <td colSpan={6} className="border border-zinc-800 p-3">
                          <form onSubmit={saveActionEdit}>
                            <ActionForm action={editAction} setAction={setEditAction} />
                            <div className="mt-4 flex justify-end gap-2">
                              <button type="button" onClick={() => setEditingActionId(null)} className={silverButton}><X size={16} /> Annuleren</button>
                              <button disabled={saving} className={orangeButton}><Save size={16} /> {saving ? "Opslaan..." : "Vervolgstap bijwerken"}</button>
                            </div>
                          </form>
                        </td>
                      ) : (
                        <>
                          <td className="border border-zinc-800 p-2"><Badge value={a.actie_type} /></td>
                          <td className="border border-zinc-800 p-2"><Badge value={a.status} /></td>
                          <td className="border border-zinc-800 p-2">{a.start_datum || "-"} t/m {a.eind_datum || "-"}</td>
                          <td className="border border-zinc-800 p-2 font-bold">{Number(a.punten ?? 0)}</td>
                          <td className="border border-zinc-800 p-2">{a.omschrijving || "-"}<div className="text-xs opacity-70">{fmtDate(a.aangemaakt_op)}</div></td>
                          <td className="border border-zinc-800 p-2 text-right"><button type="button" onClick={() => startEditAction(a)} className="inline-flex items-center gap-1 border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-3 py-1 text-xs font-black uppercase !text-black"><Pencil size={14} /> Bewerk</button></td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function DossierForm({ form, setForm }: { form: any; setForm: (v: any) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Field label="Type"><Select value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPES} /></Field>
      <Field label="Status"><Select value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={STATUSSEN} /></Field>
      <Field label="Betrokkene"><Select value={form.betrokkene_type} onChange={(v) => setForm({ ...form, betrokkene_type: v })} options={BETROKKENEN} /></Field>
      <Field label="Ernst"><Select value={form.ernst} onChange={(v) => setForm({ ...form, ernst: v })} options={ERNST} /></Field>
      <Field label="Naam" className="md:col-span-2"><Input required value={form.naam} onChange={(v) => setForm({ ...form, naam: v })} /></Field>
      <Field label="VA nummer"><Input value={form.va_nummer} onChange={(v) => setForm({ ...form, va_nummer: v })} /></Field>
      <Field label="Datum overtreding"><Input type="date" value={form.datum_overtreding} onChange={(v) => setForm({ ...form, datum_overtreding: v })} /></Field>
      <Field label="Matchmaking ID"><Input value={form.matchmaking_id} onChange={(v) => setForm({ ...form, matchmaking_id: v })} /></Field>
      <Field label="Categorie" className="md:col-span-3"><Input required value={form.categorie} onChange={(v) => setForm({ ...form, categorie: v })} /></Field>
      <Field label="Omschrijving" className="md:col-span-2"><Textarea required rows={5} value={form.omschrijving} onChange={(v) => setForm({ ...form, omschrijving: v })} /></Field>
      <Field label="Interne notitie" className="md:col-span-2"><Textarea rows={5} value={form.interne_notitie} onChange={(v) => setForm({ ...form, interne_notitie: v })} /></Field>
    </div>
  );
}

function ActionForm({ action, setAction }: { action: any; setAction: (v: any) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      <Field label="Actie" className="md:col-span-2"><Select value={action.actie_type} onChange={(v) => setAction({ ...action, actie_type: v })} options={ACTIES} /></Field>
      <Field label="Status vervolgstap"><Select value={action.status} onChange={(v) => setAction({ ...action, status: v })} options={["open", "actief", "afgerond", "ingetrokken", "vervallen"]} /></Field>
      <Field label="Start"><Input type="date" value={toDateValue(action.start_datum)} onChange={(v) => setAction({ ...action, start_datum: v })} /></Field>
      <Field label="Einde"><Input type="date" value={toDateValue(action.eind_datum)} onChange={(v) => setAction({ ...action, eind_datum: v })} /></Field>
      <Field label="Punten"><Input type="number" value={action.punten} onChange={(v) => setAction({ ...action, punten: v })} /></Field>
      <Field label="Omschrijving" className="md:col-span-4"><Textarea required rows={4} value={action.omschrijving} onChange={(v) => setAction({ ...action, omschrijving: v })} /></Field>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <label className={cls("block text-xs font-bold uppercase text-zinc-400", className)}>{label}{children}</label>;
}

function Input({ value, onChange, required, type = "text" }: { value: string; onChange: (v: string) => void; required?: boolean; type?: string }) {
  return <input type={type} required={required} className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)} />;
}

function Textarea({ value, onChange, required, rows }: { value: string; onChange: (v: string) => void; required?: boolean; rows: number }) {
  return <textarea required={required} rows={rows} className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)} />;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((x) => <option key={x}>{x}</option>)}
    </select>
  );
}
