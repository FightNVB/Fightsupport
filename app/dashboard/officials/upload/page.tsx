"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import DarkCardInputLayout from "@/components/DarkCardInputLayout";
import { authedFetch } from "@/lib/api/authedFetch";

type Profile = {
  role?: string | null;
  bondteam?: string | null;
  full_name?: string | null;
};

function norm(v: unknown) {
  return String(v ?? "").trim();
}

function isEmpty(v: unknown) {
  return norm(v).length === 0;
}

function roleNorm(role: unknown) {
  return String(role ?? "").trim().toLowerCase();
}

function canOfficialUpload(role: unknown) {
  const r = roleNorm(role);
  return r === "official" || r === "hoofdofficial" || r === "admin" || r === "superadmin";
}

function fieldClass() {
  return "w-full rounded-xl border border-white/10 bg-[#101114] px-3 py-2.5 text-white outline-none transition placeholder:text-white/35 focus:border-[#ff4d00]/60 focus:ring-2 focus:ring-[#ff4d00]/20";
}

function labelClass() {
  return "mb-1.5 text-sm font-medium text-white/90";
}

export default function UploadMatchmakingOfficialPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile>({});
  const allowed = useMemo(() => canOfficialUpload(profile.role), [profile.role]);

  const [file, setFile] = useState<File | null>(null);

  const [eventNaam, setEventNaam] = useState("");
  const [datum, setDatum] = useState("");
  const [plaats, setPlaats] = useState("");

  const [matchmaker, setMatchmaker] = useState("");
  const [promotor, setPromotor] = useState("");
  const [hoofdofficial, setHoofdofficial] = useState("");

  const [busy, setBusy] = useState(false);
  const [melding, setMelding] = useState("");

  useEffect(() => {
    (async () => {
      if (!user?.id) {
        setProfile({});
        return;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("role,bondteam,full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("profile load error:", error.message);
      }

      const profileData = (data ?? {}) as Profile;
      setProfile(profileData);

      const fn = norm(profileData.full_name);
      if (fn) {
        setHoofdofficial((prev) => prev || fn);
      }
    })();
  }, [user?.id]);

  async function onUpload() {
    setMelding("");

    if (!allowed) {
      setMelding("Je hebt geen rechten om een upload uit te voeren.");
      return;
    }

    if (!file) {
      setMelding("Kies eerst een Excel-bestand.");
      return;
    }

    if (isEmpty(eventNaam) || isEmpty(datum)) {
      setMelding("Vul evenement naam en datum in.");
      return;
    }

    const profileBondteam = norm(profile.bondteam);
    if (!profileBondteam) {
      setMelding("Er is geen bondteam gekoppeld aan jouw profiel. Neem contact op met een beheerder.");
      return;
    }

    const hasMatchmaker = !isEmpty(matchmaker);
    const hasPromotor = !isEmpty(promotor);

    if (!hasMatchmaker && !hasPromotor) {
      setMelding("Vul minimaal een matchmaker of promotor in.");
      return;
    }

    try {
      setBusy(true);
      setMelding("Uploaden naar storage...");

      const filePath = `matchmakings/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error(uploadError);
        setMelding("Upload naar storage mislukt.");
        return;
      }

      setMelding("Matchmaking verwerken...");

      const response = await authedFetch("/api/submit-matchmaking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_path: filePath,
          raw_filename: file.name,
          evenement_naam: norm(eventNaam),
          evenement_datum: norm(datum),
          locatie: norm(plaats) || null,
          bondteam: profileBondteam,
          matchmaker: hasMatchmaker ? norm(matchmaker) : null,
          promotor: hasPromotor ? norm(promotor) : null,
          hoofdofficial: norm(hoofdofficial) || null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMelding(data?.error ?? "Onbekende fout tijdens verwerken.");
        return;
      }

      const matchmakingId = norm(data?.matchmaking_id);
      if (!matchmakingId) {
        setMelding("Upload gelukt maar matchmaking_id ontbreekt in de response.");
        return;
      }

      setMelding("Upload gelukt. Doorsturen naar controle...");
      router.push("/dashboard/officials/controle");
    } catch (e: any) {
      console.error(e);
      setMelding(e?.message ?? "Onbekende fout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DarkCardInputLayout
      title="Upload matchmaking"
      backHref="/dashboard/officials"
      backLabel="← Terug"
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Template</div>
              <div className="mt-1 text-sm text-white/65">
                Gebruik het juiste Excel-template voor de matchmaking upload.
              </div>
            </div>

            <Link
              href="/templates/fightsupport-upload.xlsx"
              target="_blank"
              className="inline-flex items-center justify-center rounded-xl border border-[#ff4d00]/40 bg-[#ff4d00]/10 px-3.5 py-2 text-sm font-medium text-[#ff9a6e] transition hover:border-[#ff4d00]/70 hover:bg-[#ff4d00]/15 hover:text-white"
            >
              Download template
            </Link>
          </div>
        </div>

        {!allowed && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-100">
            Je hebt geen rechten om deze upload uit te voeren.
          </div>
        )}

        {!!norm(profile.bondteam) && (
          <div className="rounded-2xl border border-white/10 bg-[#0f1013] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Bondteam</div>
            <div className="mt-1 text-sm font-semibold text-white">{norm(profile.bondteam)}</div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <div className={labelClass()}>
              Evenement naam <span className="text-[#ff6b35]">*</span>
            </div>
            <input
              className={fieldClass()}
              value={eventNaam}
              onChange={(e) => setEventNaam(e.target.value)}
              placeholder="Bijvoorbeeld: Gala VON"
            />
          </label>

          <label className="block">
            <div className={labelClass()}>
              Datum <span className="text-[#ff6b35]">*</span>
            </div>
            <input
              type="date"
              className={fieldClass()}
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
            />
          </label>

          <label className="block">
            <div className={labelClass()}>Locatie</div>
            <input
              className={fieldClass()}
              value={plaats}
              onChange={(e) => setPlaats(e.target.value)}
              placeholder="Bijvoorbeeld: Amersfoort"
            />
          </label>

          <label className="block">
            <div className={labelClass()}>
              Matchmaker <span className="text-white/40">of promotor verplicht</span>
            </div>
            <input
              className={fieldClass()}
              value={matchmaker}
              onChange={(e) => setMatchmaker(e.target.value)}
              placeholder="Naam matchmaker"
            />
          </label>

          <label className="block">
            <div className={labelClass()}>Promotor</div>
            <input
              className={fieldClass()}
              value={promotor}
              onChange={(e) => setPromotor(e.target.value)}
              placeholder="Naam promotor"
            />
          </label>

          <label className="block md:col-span-2">
            <div className={labelClass()}>Hoofdofficial</div>
            <input
              className={fieldClass()}
              value={hoofdofficial}
              onChange={(e) => setHoofdofficial(e.target.value)}
              placeholder="Naam hoofdofficial"
            />
          </label>
        </div>

        <label className="block">
          <div className={labelClass()}>
            Excel bestand <span className="text-[#ff6b35]">*</span>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="w-full rounded-xl border border-white/10 bg-[#101114] px-3 py-2.5 text-white outline-none transition file:mr-4 file:rounded-lg file:border-0 file:bg-[#ff4d00] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#ff5e1f]"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="mt-2 text-sm text-white/60">Gekozen bestand: {file.name}</div>
          ) : null}
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onUpload}
            disabled={busy || !allowed}
            className="inline-flex items-center justify-center rounded-xl border border-[#ff4d00]/50 bg-gradient-to-b from-[#ff6a2a] to-[#d9470a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,77,0,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Bezig..." : "Uploaden"}
          </button>

          <Link
            href="/dashboard/officials"
            className="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/[0.07] hover:text-white"
          >
            Annuleren
          </Link>
        </div>

        {melding && (
          <div className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/90">
            {melding}
          </div>
        )}
      </div>
    </DarkCardInputLayout>
  );
}