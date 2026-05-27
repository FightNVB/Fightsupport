"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Send, ShieldAlert, AlertTriangle, CheckCircle2, List } from "lucide-react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const LOGO = "/branding/fightsupport/fightsupport1.png";

let browserSupabase: SupabaseClient | null = null;
function getBrowserSupabase() {
  if (browserSupabase) return browserSupabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  browserSupabase = createClient(url, anon);
  return browserSupabase;
}

const BETROKKENEN = ["matchmaker", "vechter", "official", "sportschool", "anders"];
const ERNST = ["laag", "middel", "hoog", "ernstig"];

type FormState = {
  datum_overtreding: string;
  betrokkene_type: string;
  naam: string;
  va_nummer: string;
  categorie: string;
  ernst: string;
  omschrijving: string;
  interne_notitie: string;
  matchmaking_id: string;
  event_id: string;
  bout_id: string;
  melder_user_id: string;
  melder_naam: string;
  melder_email: string;
  melder_bondteam: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const initialForm: FormState = {
  datum_overtreding: todayIso(),
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
  melder_user_id: "",
  melder_naam: "",
  melder_email: "",
  melder_bondteam: "",
};

function fieldClass() {
  return "mt-1 w-full border border-zinc-600 bg-black/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-orange-400";
}

function silverButton(extra = "") {
  return [
    "inline-flex items-center justify-center gap-2 border border-zinc-400",
    "bg-gradient-to-b from-[#fafafa] via-[#d9d9dd] to-[#8a8a90]",
    "px-3 py-2 text-xs font-black uppercase !text-black shadow-lg",
    "[&_svg]:!text-black hover:from-white hover:via-zinc-200 hover:to-zinc-400 disabled:opacity-60",
    extra,
  ].join(" ");
}

function darkButton(extra = "") {
  return [
    "inline-flex items-center justify-center gap-2 border border-zinc-600",
    "bg-black/45 px-3 py-2 text-xs font-black uppercase text-zinc-200",
    "hover:border-orange-400 disabled:opacity-60",
    extra,
  ].join(" ");
}

export default function OfficialOvertredingMeldenPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const didLoad = useRef(false);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;

    let cancelled = false;

    async function loadMelder() {
      const params = new URLSearchParams(window.location.search);
      const patch: Partial<FormState> = {
        datum_overtreding: params.get("datum_overtreding") || undefined,
        matchmaking_id: params.get("matchmaking_id") || undefined,
        event_id: params.get("event_id") || undefined,
        bout_id: params.get("bout_id") || undefined,
        naam: params.get("naam") || undefined,
        va_nummer: params.get("va_nummer") || undefined,
      };

      try {
        const supabase = getBrowserSupabase();
        if (supabase) {
          const { data: userData } = await supabase.auth.getUser();
          const user = userData?.user;

          if (user?.id) {
            patch.melder_user_id = user.id;
            patch.melder_email = user.email || "";

            let profile: any = null;
            const byId = await supabase
              .from("user_profiles")
              .select("full_name, email, bondteam")
              .eq("id", user.id)
              .maybeSingle();
            profile = byId.data;

            if (!profile && user.email) {
              const byEmail = await supabase
                .from("user_profiles")
                .select("full_name, email, bondteam")
                .eq("email", user.email)
                .maybeSingle();
              profile = byEmail.data;
            }

            patch.melder_naam = profile?.full_name || user.email || "Official";
            patch.melder_email = profile?.email || user.email || "";
            patch.melder_bondteam = profile?.bondteam || "";
          }
        }
      } catch {
        // De API vult minimaal bron=official; opslaan blijft mogelijk.
      }

      if (!cancelled) {
        setForm((prev) => ({
          ...prev,
          datum_overtreding: patch.datum_overtreding || prev.datum_overtreding,
          matchmaking_id: patch.matchmaking_id || prev.matchmaking_id,
          event_id: patch.event_id || prev.event_id,
          bout_id: patch.bout_id || prev.bout_id,
          naam: patch.naam || prev.naam,
          va_nummer: patch.va_nummer || prev.va_nummer,
          melder_user_id: patch.melder_user_id || prev.melder_user_id,
          melder_naam: patch.melder_naam || prev.melder_naam,
          melder_email: patch.melder_email || prev.melder_email,
          melder_bondteam: patch.melder_bondteam || prev.melder_bondteam,
        }));
      }
    }

    loadMelder();
    return () => { cancelled = true; };
  }, []);

  function setValue<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/officials/overtreding-melden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok || !json?.ok) {
      setError(json?.error || "Melding opslaan mislukt.");
      return;
    }

    setSuccess("Melding is doorgestuurd naar Admin > Algemeen > Overtredingen.");
    setForm({
      ...initialForm,
      datum_overtreding: todayIso(),
      melder_user_id: form.melder_user_id,
      melder_naam: form.melder_naam,
      melder_email: form.melder_email,
      melder_bondteam: form.melder_bondteam,
    });
  }

  return (
    <main className="min-h-screen bg-[#171514] text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/officials" className={silverButton()}>
              <ArrowLeft size={14} /> Terug naar officials
            </Link>
            <Link href="/dashboard/officials/overtreding-melden/overzicht" className={silverButton()}>
              <List size={14} /> Overzicht meldingen
            </Link>
          </div>
        </div>

        <header className="mb-4 overflow-hidden border border-zinc-500/50 bg-gradient-to-br from-[#2b2825] via-[#171514] to-[#101010] shadow-xl">
          <div className="border-b border-orange-500/40 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-1 inline-flex items-center gap-2 border border-orange-500/50 bg-black/40 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
                  <ShieldAlert size={13} /> FightSupport Officials
                </div>
                <h1 className="text-xl font-black uppercase tracking-wide text-white">Overtreding melden</h1>
                <p className="mt-1 max-w-3xl text-xs font-semibold text-zinc-300">
                  Meld een overtreding of incident. De melding komt direct in het admin-overzicht.
                </p>
              </div>
              <div className="relative h-12 w-44">
                <Image src={LOGO} alt="FightSupport" fill priority className="object-contain" sizes="176px" />
              </div>
            </div>
          </div>

          <div className="grid gap-2 p-3 md:grid-cols-3">
            <div className="border border-zinc-600/70 bg-black/35 p-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Status</div>
              <div className="mt-1 text-sm font-black text-orange-300">Open melding</div>
            </div>
            <div className="border border-zinc-600/70 bg-black/35 p-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Bestemming</div>
              <div className="mt-1 text-sm font-black text-white">Admin overtredingen</div>
            </div>
            <div className="border border-zinc-600/70 bg-black/35 p-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Melder</div>
              <div className="mt-1 text-sm font-black text-zinc-200">
                {form.melder_naam || "Official"}{form.melder_bondteam ? ` · ${form.melder_bondteam}` : ""}
              </div>
            </div>
          </div>
        </header>

        {error ? <div className="mb-3 flex items-center gap-2 border border-red-400/50 bg-red-950/40 p-3 text-sm font-bold text-red-100"><AlertTriangle size={16} /> {error}</div> : null}
        {success ? <div className="mb-3 flex items-center gap-2 border border-emerald-400/50 bg-emerald-950/40 p-3 text-sm font-bold text-emerald-100"><CheckCircle2 size={16} /> {success}</div> : null}

        <form onSubmit={submit} className="border border-orange-500/40 bg-[#211f1d] p-4 shadow-xl">
          <h2 className="mb-3 text-lg font-black uppercase text-orange-300">Melding registreren</h2>

          <div className="grid gap-2 md:grid-cols-4">
            <label className="block text-[10px] font-black uppercase text-zinc-400">
              Datum overtreding
              <input required type="date" className={fieldClass()} value={form.datum_overtreding} onChange={(e) => setValue("datum_overtreding", e.target.value)} />
            </label>

            <label className="block text-[10px] font-black uppercase text-zinc-400">
              Betrokkene
              <select className={fieldClass()} value={form.betrokkene_type} onChange={(e) => setValue("betrokkene_type", e.target.value)}>
                {BETROKKENEN.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>

            <label className="block text-[10px] font-black uppercase text-zinc-400 md:col-span-2">
              Naam betrokkene
              <input required className={fieldClass()} value={form.naam} onChange={(e) => setValue("naam", e.target.value)} placeholder="Naam matchmaker, vechter, official of sportschool" />
            </label>

            <label className="block text-[10px] font-black uppercase text-zinc-400">
              VA nummer
              <input className={fieldClass()} value={form.va_nummer} onChange={(e) => setValue("va_nummer", e.target.value)} placeholder="Optioneel" />
            </label>

            <label className="block text-[10px] font-black uppercase text-zinc-400 md:col-span-2">
              Categorie
              <input required className={fieldClass()} value={form.categorie} onChange={(e) => setValue("categorie", e.target.value)} placeholder="Bijv. gedrag, no-show, startverbod, keurmerk" />
            </label>

            <label className="block text-[10px] font-black uppercase text-zinc-400">
              Ernst
              <select className={fieldClass()} value={form.ernst} onChange={(e) => setValue("ernst", e.target.value)}>
                {ERNST.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>

            <label className="block text-[10px] font-black uppercase text-zinc-400">
              Matchmaking ID
              <input className={fieldClass()} value={form.matchmaking_id} onChange={(e) => setValue("matchmaking_id", e.target.value)} />
            </label>

            <label className="block text-[10px] font-black uppercase text-zinc-400">
              Event ID
              <input className={fieldClass()} value={form.event_id} onChange={(e) => setValue("event_id", e.target.value)} />
            </label>

            <label className="block text-[10px] font-black uppercase text-zinc-400">
              Bout ID
              <input className={fieldClass()} value={form.bout_id} onChange={(e) => setValue("bout_id", e.target.value)} />
            </label>

            <label className="block text-[10px] font-black uppercase text-zinc-400 md:col-span-4">
              Omschrijving overtreding / incident
              <textarea required rows={4} className={fieldClass()} value={form.omschrijving} onChange={(e) => setValue("omschrijving", e.target.value)} placeholder="Beschrijf concreet wat er is gebeurd en welke actie nodig is." />
            </label>

            <label className="block text-[10px] font-black uppercase text-zinc-400 md:col-span-4">
              Interne notitie voor admin
              <textarea rows={2} className={fieldClass()} value={form.interne_notitie} onChange={(e) => setValue("interne_notitie", e.target.value)} placeholder="Optioneel: extra context voor admin." />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setForm({ ...initialForm, datum_overtreding: todayIso(), melder_user_id: form.melder_user_id, melder_naam: form.melder_naam, melder_email: form.melder_email, melder_bondteam: form.melder_bondteam })} className={darkButton()}>Wissen</button>
            <button disabled={saving} className={silverButton()}><Send size={15} /> {saving ? "Versturen..." : "Doorsturen naar admin"}</button>
          </div>
        </form>
      </div>
    </main>
  );
}
