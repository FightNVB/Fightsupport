"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Send, ShieldAlert, AlertTriangle, CheckCircle2, List } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const LOGO = "/branding/fightsupport/fightsupport1.png";

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
    <main className="min-h-screen px-4 py-6" style={{ background: "#eef0f3" }}>
      <div className="mx-auto w-full max-w-[1500px]">
        <div
          className="rounded-[32px] p-[6px]"
          style={{
            background:
              "linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 22%, #8f8f8f 55%, #f0f0f0 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.7), 0 22px 70px rgba(0,0,0,0.9)",
          }}
        >
          <div
            className="relative overflow-hidden rounded-[28px]"
            style={{
              background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
              border: "3px solid rgba(63,63,70,0.35)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            <header
              className="px-6 py-5"
              style={{
                background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                borderBottom: "3px solid rgba(255,77,0,0.55)",
              }}
            >
              <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto_1fr]">
                <div className="justify-self-start">
                  <div className="font-extrabold uppercase" style={{ fontSize: 28, letterSpacing: "0.04em", color: "#ff4d00", textShadow: "0 6px 18px rgba(0,0,0,0.45)" }}>
                    Officials · Overtreding melden
                  </div>
                  <div className="mt-1 max-w-2xl text-sm text-white/85">Meld een overtreding of incident. De melding komt direct in het admin-overzicht.</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/dashboard/officials" className={silverButton()}>
                      <ArrowLeft size={14} /> Terug naar officials
                    </Link>
                    <Link href="/dashboard/officials/overtreding-melden/overzicht" className={silverButton()}>
                      <List size={14} /> Overzicht meldingen
                    </Link>
                  </div>
                </div>

                <div className="justify-self-center">
                  <div className="relative h-[90px] w-[260px]">
                    <Image src={LOGO} alt="FightSupport" fill priority className="object-contain" sizes="260px" />
                  </div>
                </div>

                <div className="grid gap-2 justify-self-end text-right">
                  <div className="rounded-2xl border border-zinc-700/30 bg-[#242428] px-4 py-3 text-white shadow-inner">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">Melder</div>
                    <div className="mt-1 text-sm font-black text-[#ff4d00]">
                      {form.melder_naam || "Official"}{form.melder_bondteam ? ` · ${form.melder_bondteam}` : ""}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-zinc-700/30 bg-[#242428] px-4 py-3 text-white shadow-inner">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">Bestemming</div>
                    <div className="mt-1 text-sm font-black text-white">Admin overtredingen</div>
                  </div>
                </div>
              </div>
            </header>

            <div className="px-4 py-6 md:px-6">
              {error ? (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-400/50 bg-red-950/90 p-4 text-sm font-bold text-red-100">
                  <AlertTriangle size={16} /> {error}
                </div>
              ) : null}
              {success ? (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-400/50 bg-emerald-950/90 p-4 text-sm font-bold text-emerald-100">
                  <CheckCircle2 size={16} /> {success}
                </div>
              ) : null}

              <div
                className="rounded-3xl border-2 border-zinc-500/60 p-4 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50 md:p-5"
                style={{
                  background:
                    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 38%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(236,238,242,0.98) 100%)",
                }}
              >
                <form onSubmit={submit} className="overflow-hidden rounded-2xl border-2 border-zinc-300/80 bg-white shadow-xl">
                  <div className="border-b-2 border-[#ff4d00]/70 bg-[#242428] px-5 py-4 text-white">
                    <div className="text-xl font-black uppercase tracking-wide text-[#ff4d00]">Melding registreren</div>
                    <div className="mt-1 text-sm text-white/75">Vul de gegevens duidelijk in. Admin ziet deze melding terug in Dossiers & Sancties.</div>
                  </div>

                  <div className="grid gap-4 p-5 md:grid-cols-4">
                    <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-zinc-600">
                      Datum overtreding
                      <input required type="date" className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-[#ff4d00]" value={form.datum_overtreding} onChange={(e) => setValue("datum_overtreding", e.target.value)} />
                    </label>

                    <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-zinc-600">
                      Betrokkene
                      <select className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-[#ff4d00]" value={form.betrokkene_type} onChange={(e) => setValue("betrokkene_type", e.target.value)}>
                        {BETROKKENEN.map((x, idx) => <option key={`${x}-${idx}`} value={x}>{x}</option>)}
                      </select>
                    </label>

                    <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-zinc-600 md:col-span-2">
                      Naam betrokkene
                      <input required className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-[#ff4d00]" value={form.naam} onChange={(e) => setValue("naam", e.target.value)} placeholder="Naam matchmaker, vechter, official of sportschool" />
                    </label>

                    <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-zinc-600">
                      VA nummer
                      <input className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-[#ff4d00]" value={form.va_nummer} onChange={(e) => setValue("va_nummer", e.target.value)} placeholder="Optioneel" />
                    </label>

                    <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-zinc-600 md:col-span-2">
                      Categorie
                      <input required className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-[#ff4d00]" value={form.categorie} onChange={(e) => setValue("categorie", e.target.value)} placeholder="Bijv. gedrag, no-show, startverbod, keurmerk" />
                    </label>

                    <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-zinc-600">
                      Ernst
                      <select className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-[#ff4d00]" value={form.ernst} onChange={(e) => setValue("ernst", e.target.value)}>
                        {ERNST.map((x, idx) => <option key={`${x}-${idx}`} value={x}>{x}</option>)}
                      </select>
                    </label>

                    <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-zinc-600">
                      Matchmaking ID
                      <input className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-[#ff4d00]" value={form.matchmaking_id} onChange={(e) => setValue("matchmaking_id", e.target.value)} />
                    </label>

                    <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-zinc-600">
                      Event ID
                      <input className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-[#ff4d00]" value={form.event_id} onChange={(e) => setValue("event_id", e.target.value)} />
                    </label>

                    <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-zinc-600">
                      Bout ID
                      <input className="mt-1 h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-[#ff4d00]" value={form.bout_id} onChange={(e) => setValue("bout_id", e.target.value)} />
                    </label>

                    <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-zinc-600 md:col-span-4">
                      Omschrijving overtreding / incident
                      <textarea required rows={5} className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm font-semibold text-zinc-950 outline-none focus:border-[#ff4d00]" value={form.omschrijving} onChange={(e) => setValue("omschrijving", e.target.value)} placeholder="Beschrijf concreet wat er is gebeurd en welke actie nodig is." />
                    </label>

                    <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-zinc-600 md:col-span-4">
                      Interne notitie voor admin
                      <textarea rows={3} className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm font-semibold text-zinc-950 outline-none focus:border-[#ff4d00]" value={form.interne_notitie} onChange={(e) => setValue("interne_notitie", e.target.value)} placeholder="Optioneel: extra context voor admin." />
                    </label>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-5 py-4">
                    <button type="button" onClick={() => setForm({ ...initialForm, datum_overtreding: todayIso(), melder_user_id: form.melder_user_id, melder_naam: form.melder_naam, melder_email: form.melder_email, melder_bondteam: form.melder_bondteam })} className={darkButton()}>Wissen</button>
                    <button disabled={saving} className={silverButton()}><Send size={15} /> {saving ? "Versturen..." : "Doorsturen naar admin"}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
