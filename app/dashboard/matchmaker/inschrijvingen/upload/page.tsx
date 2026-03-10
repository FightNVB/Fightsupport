"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api/authedFetch";

export default function MatchmakerInschrijvingenUploadPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user } = useAuth();

  const existingMmId = String(sp.get("matchmaker_matchmaking_id") ?? "").trim();

  const [evenementNaam, setEvenementNaam] = useState("");
  const [evenementDatum, setEvenementDatum] = useState("");
  const [bondteam, setBondteam] = useState("");
  const [matchmakerNaam, setMatchmakerNaam] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  const bondteams = useMemo(() => ["WPKL", "NKF", "WAKO", "VON", "IRO", "MMAAN", "WMTA"], []);

  async function handleSubmit() {
    try {
      if (!user) {
        setMelding("⚠️ Je bent niet ingelogd.");
        return;
      }

      const isAppend = !!existingMmId;
      if (!isAppend) {
        if (!evenementNaam.trim() || !evenementDatum.trim() || !bondteam.trim()) {
          setMelding("⚠️ Vul evenement naam, datum en bondteam in.");
          return;
        }
      }

      if (!file) {
        setMelding("⚠️ Kies een Excel bestand.");
        return;
      }

      setLoading(true);
      setMelding("⏳ Uploaden en verwerken…");

      const fd = new FormData();
      if (isAppend) {
        fd.append("matchmaker_matchmaking_id", existingMmId);
      } else {
        fd.append("evenement_naam", evenementNaam.trim());
        fd.append("evenement_datum", evenementDatum.trim());
        fd.append("bondteam", bondteam.trim());
        fd.append("matchmaker", matchmakerNaam.trim());
      }
      fd.append("file", file);

      const res = await authedFetch("/api/matchmaker/submit-inschrijvingen", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMelding(`❌ ${data?.error ?? "Upload mislukt"}`);
        return;
      }

      setMelding(`✅ ${data.inserted} vechters toegevoegd.`);
      const mmId = data.matchmaker_matchmaking_id;
      router.push(`/dashboard/matchmaker/inschrijvingen/${mmId}`);
    } catch (e: any) {
      console.error(e);
      setMelding("❌ Onverwachte fout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div
        className="w-full max-w-xl rounded-2xl border p-6"
        style={{ borderColor: "var(--brand-orange)", background: "#111", boxShadow: "0 0 40px rgba(253,120,3,0.25)" }}
      >
        <h1 className="text-2xl font-bold" style={{ color: "var(--brand-orange)" }}>
          Matchmaker – Inschrijvingen upload
        </h1>
        <p className="text-sm text-white/70 mt-1">
          {existingMmId
            ? "Voeg een extra bestand toe aan dit evenement (append)."
            : "Maak een nieuwe matchmaking-draft en upload je vechters (1 vechter per rij). Je kunt later nog bestanden toevoegen om bij te schrijven."}
        </p>

        <div className="mt-6 space-y-4">
          {!existingMmId ? (
            <div>
              <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                Evenement naam *
              </label>
              <input
                value={evenementNaam}
                onChange={(e) => setEvenementNaam(e.target.value)}
                className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 placeholder-zinc-400 border border-zinc-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Beatdown #4"
              />
            </div>
          ) : (
            <div className="text-xs text-white/60">
              Evenement ID: <span className="font-semibold" style={{ color: "var(--brand-orange)" }}>{existingMmId}</span>
            </div>
          )}

          {!existingMmId ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                  Datum *
                </label>
                <input
                  type="date"
                  value={evenementDatum}
                  onChange={(e) => setEvenementDatum(e.target.value)}
                  className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                  Bondteam *
                </label>
                <select
                  value={bondteam}
                  onChange={(e) => setBondteam(e.target.value)}
                  className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">— kies —</option>
                  {bondteams.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {!existingMmId ? (
            <div>
              <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                Matchmaker (naam)
              </label>
              <input
                value={matchmakerNaam}
                onChange={(e) => setMatchmakerNaam(e.target.value)}
                className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 placeholder-zinc-400 border border-zinc-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Said"
              />
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
              Excel bestand *
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 px-3 py-2"
            />
            <p className="text-xs text-white/60 mt-1">
              Let op: 1 vechter per rij (geen rood/blauw split).
            </p>
          </div>

          {melding && <div className="text-center text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>{melding}</div>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-md px-4 py-2 font-semibold disabled:opacity-60"
            style={{ background: "var(--brand-orange)", color: "black" }}
          >
            {loading ? "Bezig…" : existingMmId ? "Upload & voeg toe" : "Upload & maak matchmaking"}
          </button>
        </div>
      </div>
    </main>
  );
}
