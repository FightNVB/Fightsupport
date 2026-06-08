"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Send,
  AlertTriangle,
  CheckCircle2,
  List,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const LOGO = "/branding/fightsupport/excel-logo.png";
const BETROKKENEN = [
  "matchmaker",
  "vechter",
  "official",
  "sportschool",
  "anders",
];
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
  event_naam: string;
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
  betrokkene_type: "official",
  naam: "",
  va_nummer: "",
  categorie: "",
  ernst: "laag",
  omschrijving: "",
  interne_notitie: "",
  matchmaking_id: "",
  event_id: "",
  event_naam: "",
  bout_id: "",
  melder_user_id: "",
  melder_naam: "",
  melder_email: "",
  melder_bondteam: "",
};

function fieldClass() {
  return "mt-1 h-11 w-full border border-zinc-600 bg-[#111] px-3 text-sm font-semibold text-white outline-none focus:border-[#ff4d00]";
}

function textareaClass() {
  return "mt-1 w-full border border-zinc-600 bg-[#111] px-3 py-3 text-sm font-semibold text-white outline-none focus:border-[#ff4d00]";
}

function silverButton(extra = "") {
  return [
    "inline-flex items-center justify-center gap-2 border border-zinc-300",
    "bg-gradient-to-b from-white via-zinc-200 to-zinc-500",
    "px-4 py-2 text-xs font-black uppercase !text-black shadow-lg shadow-black/30",
    "transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50",
    extra,
  ].join(" ");
}

function orangeButton(extra = "") {
  return [
    "inline-flex items-center justify-center gap-2 border border-[#ff4d00] bg-[#ff4d00]",
    "px-4 py-2 text-xs font-black uppercase !text-black shadow-lg shadow-black/30",
    "transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50",
    extra,
  ].join(" ");
}

function darkButton(extra = "") {
  return [
    "inline-flex items-center justify-center gap-2 border border-zinc-600 bg-[#1c1c1c]",
    "px-4 py-2 text-xs font-black uppercase text-zinc-200 shadow-lg shadow-black/20",
    "transition hover:border-[#ff4d00] disabled:cursor-not-allowed disabled:opacity-50",
    extra,
  ].join(" ");
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-600 bg-[#1c1c1c] p-3 shadow-lg shadow-black/20">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#ff4d00]">{value || "-"}</p>
    </div>
  );
}

export default function OvertredingMeldenPage() {
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
        event_naam:
          params.get("event_naam") ||
          params.get("event_name") ||
          params.get("event") ||
          undefined,
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
        // De API controleert de melder nogmaals server-side.
      }

      if (!cancelled) {
        setForm((prev) => ({
          ...prev,
          datum_overtreding: patch.datum_overtreding || prev.datum_overtreding,
          matchmaking_id: patch.matchmaking_id || prev.matchmaking_id,
          event_id: patch.event_id || prev.event_id,
          event_naam: patch.event_naam || prev.event_naam,
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
    return () => {
      cancelled = true;
    };
  }, []);

  function setValue<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm({
      ...initialForm,
      datum_overtreding: todayIso(),
      melder_user_id: form.melder_user_id,
      melder_naam: form.melder_naam,
      melder_email: form.melder_email,
      melder_bondteam: form.melder_bondteam,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await fetch("/api/officials/overtreding-melden", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(form),
    });

    const json = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok || !json?.ok) {
      setError(json?.error || "Melding opslaan mislukt.");
      return;
    }

    setSuccess(
      "Melding is doorgestuurd naar Admin > Algemeen > Overtredingen.",
    );
    resetForm();
  }

  return (
    <main className="fs-page336 min-h-screen bg-[#2b2b2b] p-6 text-white">
      <style>{`
        .fs-page336, .fs-page336 * { box-sizing: border-box; }
        .fs-page336 h1, .fs-page336 h2, .fs-page336 h3 { text-transform: uppercase; font-weight: 950; letter-spacing: .02em; }
        .fs-page336 input, .fs-page336 select, .fs-page336 textarea { border-radius: 0 !important; }
        .fs-page336 a, .fs-page336 button { border-radius: 0 !important; }
        .fs-page336 label { color: #d4d4d8; }
        .fs-page336 select option { background: #111; color: #fff; }
      `}</style>

      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl shadow-black/60">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ff4d00]">
                FightSupport · official
              </p>
              <h1 className="text-2xl font-black uppercase text-[#ff4d00]">
                Officials · Overtreding melden
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-zinc-300">
                Meld een overtreding of incident. Gebruik gewoon de eventnaam;
                niemand hoeft een event-id te weten.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/dashboard/officials" className={silverButton()}>
                  <ArrowLeft size={15} /> Terug
                </Link>
                <Link
                  href="/dashboard/officials/overtreding-melden/overzicht"
                  className={silverButton()}
                >
                  <List size={15} /> Overzicht meldingen
                </Link>
              </div>
            </div>

            <div className="justify-self-center">
              <Image
                src={LOGO}
                alt="FightSupport"
                width={360}
                height={86}
                priority
                className="object-contain"
              />
            </div>

            <div className="grid gap-3 justify-self-end text-right">
              <InfoCard
                label="Melder"
                value={`${form.melder_naam || "Official"}${form.melder_bondteam ? ` · ${form.melder_bondteam}` : ""}`}
              />
              <InfoCard label="Bestemming" value="Admin overtredingen" />
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-3">
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <div className="flex items-center gap-2 text-[#ff4d00]">
              <ShieldAlert size={18} />
              <b className="text-sm uppercase">Melding</b>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Eventnaam wordt meegestuurd en server-side gekoppeld als het event
              gevonden wordt.
            </p>
          </div>
          <InfoCard
            label="Event"
            value={form.event_naam || "Nog niet ingevuld"}
          />
          <InfoCard label="Ernst" value={form.ernst} />
        </div>

        <div className="p-4">
          {error ? (
            <div className="mb-4 flex items-center gap-2 border border-red-500/70 bg-red-950/80 p-4 text-sm font-bold text-red-100">
              <AlertTriangle size={16} /> {error}
            </div>
          ) : null}
          {success ? (
            <div className="mb-4 flex items-center gap-2 border border-emerald-500/70 bg-emerald-950/80 p-4 text-sm font-bold text-emerald-100">
              <CheckCircle2 size={16} /> {success}
            </div>
          ) : null}

          <form
            onSubmit={submit}
            className="border border-zinc-600 bg-[#171717] shadow-xl shadow-black/30"
          >
            <div className="border-b border-zinc-700 bg-[#242424] px-5 py-4">
              <h2 className="text-xl font-black uppercase text-[#ff4d00]">
                Melding registreren
              </h2>
              <p className="mt-1 text-sm text-zinc-300">
                Vul de gegevens compact en duidelijk in. Event ID is vervangen
                door Event naam.
              </p>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-4">
              <label className="block text-[11px] font-black uppercase tracking-[0.12em]">
                Datum overtreding
                <input
                  required
                  type="date"
                  className={fieldClass()}
                  value={form.datum_overtreding}
                  onChange={(e) =>
                    setValue("datum_overtreding", e.target.value)
                  }
                />
              </label>

              <label className="block text-[11px] font-black uppercase tracking-[0.12em]">
                Betrokkene
                <select
                  className={fieldClass()}
                  value={form.betrokkene_type}
                  onChange={(e) => setValue("betrokkene_type", e.target.value)}
                >
                  {BETROKKENEN.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[11px] font-black uppercase tracking-[0.12em] md:col-span-2">
                Naam betrokkene
                <input
                  required
                  className={fieldClass()}
                  value={form.naam}
                  onChange={(e) => setValue("naam", e.target.value)}
                  placeholder="Naam matchmaker, vechter, official of sportschool"
                />
              </label>

              <label className="block text-[11px] font-black uppercase tracking-[0.12em]">
                VA nummer
                <input
                  className={fieldClass()}
                  value={form.va_nummer}
                  onChange={(e) => setValue("va_nummer", e.target.value)}
                  placeholder="Optioneel"
                />
              </label>

              <label className="block text-[11px] font-black uppercase tracking-[0.12em] md:col-span-2">
                Categorie
                <input
                  required
                  className={fieldClass()}
                  value={form.categorie}
                  onChange={(e) => setValue("categorie", e.target.value)}
                  placeholder="Bijv. gedrag, no-show, startverbod, keurmerk"
                />
              </label>

              <label className="block text-[11px] font-black uppercase tracking-[0.12em]">
                Ernst
                <select
                  className={fieldClass()}
                  value={form.ernst}
                  onChange={(e) => setValue("ernst", e.target.value)}
                >
                  {ERNST.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[11px] font-black uppercase tracking-[0.12em] md:col-span-2">
                Event naam
                <input
                  className={fieldClass()}
                  value={form.event_naam}
                  onChange={(e) => setValue("event_naam", e.target.value)}
                  placeholder="Bijv. YOC 2026 of The Beatdown"
                />
              </label>

              <label className="block text-[11px] font-black uppercase tracking-[0.12em]">
                Matchmaking ID
                <input
                  className={fieldClass()}
                  value={form.matchmaking_id}
                  onChange={(e) => setValue("matchmaking_id", e.target.value)}
                  placeholder="Optioneel"
                />
              </label>

              <label className="block text-[11px] font-black uppercase tracking-[0.12em]">
                Bout ID
                <input
                  className={fieldClass()}
                  value={form.bout_id}
                  onChange={(e) => setValue("bout_id", e.target.value)}
                  placeholder="Optioneel"
                />
              </label>

              <input type="hidden" value={form.event_id} readOnly />

              <label className="block text-[11px] font-black uppercase tracking-[0.12em] md:col-span-4">
                Omschrijving overtreding / incident
                <textarea
                  required
                  rows={5}
                  className={textareaClass()}
                  value={form.omschrijving}
                  onChange={(e) => setValue("omschrijving", e.target.value)}
                  placeholder="Beschrijf concreet wat er is gebeurd en welke actie nodig is."
                />
              </label>

              <label className="block text-[11px] font-black uppercase tracking-[0.12em] md:col-span-4">
                Interne notitie voor admin
                <textarea
                  rows={3}
                  className={textareaClass()}
                  value={form.interne_notitie}
                  onChange={(e) => setValue("interne_notitie", e.target.value)}
                  placeholder="Optioneel: extra context voor admin."
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-700 bg-[#1c1c1c] px-5 py-4">
              <button
                type="button"
                onClick={resetForm}
                className={darkButton()}
              >
                <Trash2 size={15} /> Wissen
              </button>
              <button disabled={saving} className={orangeButton()}>
                <Send size={15} />{" "}
                {saving ? "Versturen..." : "Doorsturen naar admin"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
