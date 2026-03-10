"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import DarkCardInputLayout from "@/components/DarkCardInputLayout";
import Link from "next/link";
import { authedFetch } from "@/lib/api/authedFetch";

type Profile = {
  role?: string | null;
  bondteam?: string | null;
  full_name?: string | null;
};

function norm(v: any) {
  return String(v ?? "").trim();
}
function isEmpty(v: any) {
  return !norm(v);
}

const BONDTEAMS = ["IRO", "NKF", "WPKL", "WMTA", "VON", "UMC", "MMAAN", "MON"];

function isAdminRole(role: any) {
  const r = String(role ?? "").trim().toLowerCase();
  return r === "admin" || r === "superadmin";
}

export default function UploadMatchmakingAdminPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile>({});
  const isAdmin = useMemo(() => isAdminRole(profile.role), [profile.role]);

  const [file, setFile] = useState<File | null>(null);

  const [eventNaam, setEventNaam] = useState("");
  const [datum, setDatum] = useState("");
  const [plaats, setPlaats] = useState("");
  const [bondteam, setBondteam] = useState("");

  const [matchmaker, setMatchmaker] = useState("");
  const [promotor, setPromotor] = useState("");
  const [hoofdofficial, setHoofdofficial] = useState("");

  const [busy, setBusy] = useState(false);
  const [melding, setMelding] = useState<string>("");

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
      if (error) console.warn("profile load error:", error.message);
      setProfile((data ?? {}) as any);

      // sensible prefills
      const bt = String((data as any)?.bondteam ?? "").trim();
      if (bt && !bondteam) setBondteam(bt);
      const fn = String((data as any)?.full_name ?? "").trim();
      if (fn && !matchmaker) setMatchmaker(fn);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function onUpload() {
    setMelding("");

    if (!isAdmin) {
      setMelding("❌ Geen rechten. Alleen admin/superadmin kan uploaden.");
      return;
    }

    if (!file) {
      setMelding("❌ Kies eerst een Excel bestand.");
      return;
    }

    // ✅ Admin upload: bondteam + matchmaker verplicht
    if (isEmpty(eventNaam) || isEmpty(datum) || isEmpty(bondteam) || isEmpty(matchmaker)) {
      setMelding("❌ Vul verplicht in: Naam, Datum, Bondteam en Matchmaker.");
      return;
    }

    try {
      setBusy(true);
      setMelding("⏳ Uploaden…");

      // 1) upload naar storage
      const filePath = `matchmakings/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(filePath, file, { upsert: true });
      if (uploadError) {
        console.error(uploadError);
        setMelding("❌ Upload naar storage mislukt.");
        return;
      }

      // 2) verwerken + event + matchmaking aanmaken
      setMelding("⏳ Matchmaking verwerken…");

      const response = await authedFetch("/api/submit-matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_path: filePath,
          raw_filename: file.name,

          evenement_naam: norm(eventNaam),
          evenement_datum: norm(datum),
          locatie: norm(plaats) || null,

          bondteam: norm(bondteam),
          matchmaker: norm(matchmaker),
          promotor: norm(promotor) || null,
          hoofdofficial: norm(hoofdofficial) || null,
        }),
      });

      const data = await response.json().catch(() => ({} as any));
      if (!response.ok) {
        setMelding(`❌ ${data?.error ?? "Onbekende fout"}`);
        return;
      }

      const matchmaking_id = String(data?.matchmaking_id ?? "").trim();
      const event_id = String(data?.event_id ?? "").trim();

      if (!matchmaking_id) {
        setMelding("❌ Upload gelukt maar matchmaking_id ontbreekt in response.");
        return;
      }

      setMelding(`✅ Upload gelukt. Event gekoppeld (${event_id || "—"}). Doorsturen naar controle…`);
      router.push(`/dashboard/admin/controle`);
    } catch (e: any) {
      console.error(e);
      setMelding(`❌ ${e?.message ?? "Onbekende fout"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DarkCardInputLayout title="Upload Excel">
      <div className="space-y-4">
        <div className="text-sm opacity-90">
          <div className="font-semibold">Template</div>
          <div className="flex items-center gap-3 mt-1">
            <Link className="underline" href="/templates/admin_upload_template.xlsx" target="_blank">
              Download template
            </Link>
            <span className="opacity-80">
              Gebruik de kolom <b>VS</b> voor partijen en <b>T</b> (T1/T2/…) voor toernooien.
            </span>
          </div>
        </div>

        {!isAdmin && (
          <div className="p-3 rounded bg-red-950/40 border border-red-800 text-sm">
            Je bent niet ingelogd als admin/superadmin. Uploaden is geblokkeerd.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <div className="text-sm mb-1">
              Evenement naam <span className="text-red-400">*</span>
            </div>
            <input
              className="w-full p-2 rounded bg-black/30 border border-white/10 text-white placeholder-white/40"
              value={eventNaam}
              onChange={(e) => setEventNaam(e.target.value)}
              placeholder="Bijv. King of the Ring"
            />
          </label>

          <label className="block">
            <div className="text-sm mb-1">
              Datum <span className="text-red-400">*</span>
            </div>
            <input
              type="date"
              className="w-full p-2 rounded bg-black/30 border border-white/10 text-white placeholder-white/40"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
            />
          </label>

          <label className="block">
            <div className="text-sm mb-1">
              Bondteam <span className="text-red-400">*</span>
            </div>
            <select
              className="w-full p-2 rounded bg-black/30 border border-white/10 text-white placeholder-white/40"
              value={bondteam}
              onChange={(e) => setBondteam(e.target.value)}
            >
              <option value="">— kies bondteam —</option>
              {BONDTEAMS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="text-sm mb-1">
              Matchmaker <span className="text-red-400">*</span>
            </div>
            <input
              className="w-full p-2 rounded bg-black/30 border border-white/10 text-white placeholder-white/40"
              value={matchmaker}
              onChange={(e) => setMatchmaker(e.target.value)}
              placeholder="Naam matchmaker"
            />
          </label>

          <label className="block">
            <div className="text-sm mb-1">Promotor (optioneel)</div>
            <input
              className="w-full p-2 rounded bg-black/30 border border-white/10 text-white placeholder-white/40"
              value={promotor}
              onChange={(e) => setPromotor(e.target.value)}
              placeholder="Naam promotor"
            />
          </label>

          <label className="block">
            <div className="text-sm mb-1">Locatie</div>
            <input
              className="w-full p-2 rounded bg-black/30 border border-white/10 text-white placeholder-white/40"
              value={plaats}
              onChange={(e) => setPlaats(e.target.value)}
              placeholder="Bijv. Amersfoort"
            />
          </label>

          <label className="block">
            <div className="text-sm mb-1">Hoofdofficial (optioneel)</div>
            <input
              className="w-full p-2 rounded bg-black/30 border border-white/10 text-white placeholder-white/40"
              value={hoofdofficial}
              onChange={(e) => setHoofdofficial(e.target.value)}
              placeholder="Naam hoofdofficial"
            />
          </label>
        </div>

        <label className="block">
          <div className="text-sm mb-1">
            Excel bestand <span className="text-red-400">*</span>
          </div>
          <input
            className="w-full p-2 rounded bg-black/30 border border-white/10 text-white placeholder-white/40"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <button
          className="px-4 py-2 rounded bg-orange-600 hover:bg-orange-500 disabled:opacity-50"
          onClick={onUpload}
          disabled={busy || !isAdmin}
        >
          {busy ? "Bezig…" : "Uploaden & starten controle"}
        </button>

        {melding && (
          <div className="p-3 rounded bg-black/30 border border-white/10 text-sm whitespace-pre-wrap">
            {melding}
          </div>
        )}
      </div>
    </DarkCardInputLayout>
  );
}
