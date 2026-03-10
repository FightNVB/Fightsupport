"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

type AnyRow = Record<string, any>;

function fullName(r: AnyRow) {
  const vn = String(r?.voornaam ?? "").trim();
  const an = String(r?.achternaam ?? "").trim();
  const joined = [vn, an].filter(Boolean).join(" ").trim();
  return joined || String(r?.naam ?? "").trim() || "—";
}

export default function MatchmakerInschrijvingenEventPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const mmId = useMemo(() => {
    const raw = params?.matchmakerMatchmakingId as string;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [params]);

  const [mm, setMm] = useState<AnyRow | null>(null);
  const [uploads, setUploads] = useState<AnyRow[]>([]);
  const [fighters, setFighters] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ✅ handmatig toevoegen
  const [manual, setManual] = useState({
    discipline: "",
    klasse: "",
    geslacht: "",
    voornaam: "",
    achternaam: "",
    email: "",
    gym: "",
    va_nummer: "",
    geboortedatum: "",
    gewicht: "",
    opmerkingen: "",
  });
  const [manualMsg, setManualMsg] = useState<string | null>(null);

  async function loadAll() {
    if (!mmId) return;
    setLoading(true);

    const [{ data: mmData }, { data: upData }, { data: fData }] = await Promise.all([
      supabase.from("matchmaker_matchmakings").select("*").eq("id", mmId).maybeSingle(),
      supabase
        .from("matchmaker_uploads")
        .select("*")
        .eq("matchmaker_matchmaking_id", mmId)
        .order("uploaded_at", { ascending: false }),
      supabase
        .from("matchmaker_inschrijvingen")
        .select("*")
        .eq("matchmaker_matchmaking_id", mmId)
        .order("created_at", { ascending: true }),
    ]);

    setMm(mmData ?? null);
    setUploads(upData ?? []);
    setFighters(fData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mmId]);

  async function addUpload() {
    try {
      if (!user) return setMelding("⚠️ Je bent niet ingelogd.");
      if (!mmId) return setMelding("⚠️ Ongeldig id.");
      if (!file) return setMelding("⚠️ Kies een Excel bestand.");

      setBusy(true);
      setMelding("⏳ Uploaden en bijschrijven…");

      const fd = new FormData();
      fd.append("uploaded_by", user.id);
      fd.append("matchmaker_matchmaking_id", String(mmId));
      fd.append("file", file);

      const res = await fetch("/api/matchmaker/submit-inschrijvingen", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);

      if (!res.ok) return setMelding(`❌ ${data?.error ?? "Upload mislukt"}`);

      setFile(null);
      setMelding(`✅ ${data.inserted} vechters toegevoegd.`);
      await loadAll();
    } catch (e) {
      console.error(e);
      setMelding("❌ Onverwachte fout.");
    } finally {
      setBusy(false);
    }
  }

  async function addManualFighter() {
    try {
      if (!user) return setManualMsg("⚠️ Je bent niet ingelogd.");
      if (!mmId) return setManualMsg("⚠️ Ongeldig id.");

      const naamOk = (manual.voornaam || manual.achternaam).trim().length > 0;
      if (!naamOk) return setManualMsg("⚠️ Vul minimaal voornaam of achternaam in.");

      setBusy(true);
      setManualMsg("⏳ Vechter toevoegen…");

      const res = await fetch("/api/matchmaker/manual-fighter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          matchmaker_matchmaking_id: mmId,
          user_id: user.id,
          fighter: manual,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) return setManualMsg(`❌ ${data?.error ?? "Toevoegen mislukt"}`);

      setManual({
        discipline: "",
        klasse: "",
        geslacht: "",
        voornaam: "",
        achternaam: "",
        email: "",
        gym: "",
        va_nummer: "",
        geboortedatum: "",
        gewicht: "",
        opmerkingen: "",
      });
      setManualMsg("✅ Vechter toegevoegd.");
      await loadAll();
    } catch (e) {
      console.error(e);
      setManualMsg("❌ Onverwachte fout.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUpload(uploadId: number) {
    try {
      if (!user) return setMelding("⚠️ Je bent niet ingelogd.");
      if (!mmId) return;

      const ok = confirm("Weet je zeker dat je deze upload + alle vechters uit die upload wilt verwijderen?");
      if (!ok) return;

      setBusy(true);
      setMelding("⏳ Upload verwijderen…");

      const res = await fetch("/api/matchmaker/submit-inschrijvingen", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "delete_upload",
          upload_id: uploadId,
          matchmaker_matchmaking_id: mmId,
          user_id: user.id,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) return setMelding(`❌ ${data?.error ?? "Verwijderen mislukt"}`);

      setMelding("✅ Upload verwijderd.");
      await loadAll();
    } catch (e) {
      console.error(e);
      setMelding("❌ Onverwachte fout.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteMatchmaking() {
    try {
      if (!user) return setMelding("⚠️ Je bent niet ingelogd.");
      if (!mmId) return;

      const ok = confirm("Weet je zeker dat je dit hele evenement (alle uploads + vechters) wilt verwijderen?");
      if (!ok) return;

      setBusy(true);
      setMelding("⏳ Evenement verwijderen…");

      const res = await fetch("/api/matchmaker/submit-inschrijvingen", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "delete_matchmaking",
          matchmaker_matchmaking_id: mmId,
          user_id: user.id,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) return setMelding(`❌ ${data?.error ?? "Verwijderen mislukt"}`);

      router.push("/dashboard/matchmaker/inschrijvingen");
    } catch (e) {
      console.error(e);
      setMelding("❌ Onverwachte fout.");
    } finally {
      setBusy(false);
    }
  }

  if (!mmId) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/80">Ongeldig matchmaking id.</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--brand-orange)", background: "#111" }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--brand-orange)" }}>
                Inschrijvingen overzicht
              </h1>
              <div className="text-sm text-white/70">
                Draft #{mmId}
                {mm?.evenement_naam ? ` • ${mm.evenement_naam}` : ""}
                {mm?.evenement_datum ? ` • ${mm.evenement_datum}` : ""}
                {mm?.bondteam ? ` • ${mm.bondteam}` : ""}
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <div className="text-sm text-white/80">
                <div>
                  <span className="font-semibold" style={{ color: "var(--brand-orange)" }}>
                    Vechters:
                  </span>{" "}
                  {fighters.length}
                </div>
                <div>
                  <span className="font-semibold" style={{ color: "var(--brand-orange)" }}>
                    Uploads:
                  </span>{" "}
                  {uploads.length}
                </div>
              </div>

              <button
                onClick={deleteMatchmaking}
                disabled={busy}
                className="rounded-md px-4 py-2 font-semibold disabled:opacity-60 border"
                style={{ borderColor: "var(--brand-orange)", color: "var(--brand-orange)", background: "transparent" }}
                title="Verwijder hele draft"
              >
                Verwijder event
              </button>
            </div>
          </div>
        </div>

        {/* Add upload */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--brand-orange)", background: "#111" }}>
          <h2 className="text-lg font-bold" style={{ color: "var(--brand-orange)" }}>
            Bestand bijschrijven
          </h2>
          <p className="text-sm text-white/70 mt-1">
            Upload nog een Excel bestand om extra vechters toe te voegen aan dit evenement.
          </p>

          <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="w-full">
              <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                Excel bestand
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 px-3 py-2"
              />
            </div>

            <button
              onClick={addUpload}
              disabled={busy}
              className="rounded-md px-4 py-2 font-semibold disabled:opacity-60"
              style={{ background: "var(--brand-orange)", color: "black" }}
            >
              {busy ? "Bezig…" : "Upload & bijschrijven"}
            </button>
          </div>

          {melding && (
            <div className="mt-3 text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
              {melding}
            </div>
          )}
        </div>

        {/* Manual fighter */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--brand-orange)", background: "#111" }}>
          <h2 className="text-lg font-bold" style={{ color: "var(--brand-orange)" }}>
            Vechter handmatig toevoegen
          </h2>
          <p className="text-sm text-white/70 mt-1">
            Voeg een losse inschrijving toe (bijv. late aanmelding of correctie). Deze komt direct in de lijst.
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                Discipline
              </label>
              <input
                value={manual.discipline}
                onChange={(e) => setManual((m) => ({ ...m, discipline: e.target.value }))}
                placeholder="Kickboksen / Muay Thai / MMA"
                className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                Klasse
              </label>
              <input
                value={manual.klasse}
                onChange={(e) => setManual((m) => ({ ...m, klasse: e.target.value }))}
                placeholder="Jeugd / N / C / B / A"
                className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                Geslacht
              </label>
              <input
                value={manual.geslacht}
                onChange={(e) => setManual((m) => ({ ...m, geslacht: e.target.value }))}
                placeholder="Man / Vrouw"
                className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                Voornaam
              </label>
              <input
                value={manual.voornaam}
                onChange={(e) => setManual((m) => ({ ...m, voornaam: e.target.value }))}
                className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                Achternaam
              </label>
              <input
                value={manual.achternaam}
                onChange={(e) => setManual((m) => ({ ...m, achternaam: e.target.value }))}
                className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                Email
              </label>
              <input
                value={manual.email}
                onChange={(e) => setManual((m) => ({ ...m, email: e.target.value }))}
                placeholder="naam@email.com"
                className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                Sportschool
              </label>
              <input
                value={manual.gym}
                onChange={(e) => setManual((m) => ({ ...m, gym: e.target.value }))}
                className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                Fightpassport nr
              </label>
              <input
                value={manual.va_nummer}
                onChange={(e) => setManual((m) => ({ ...m, va_nummer: e.target.value }))}
                placeholder="29372"
                className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                Geboortedatum
              </label>
              <input
                value={manual.geboortedatum}
                onChange={(e) => setManual((m) => ({ ...m, geboortedatum: e.target.value }))}
                placeholder="YYYY-MM-DD"
                className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                Gewicht
              </label>
              <input
                value={manual.gewicht}
                onChange={(e) => setManual((m) => ({ ...m, gewicht: e.target.value }))}
                placeholder="kg"
                className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 px-3 py-2"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="block text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                Opmerkingen
              </label>
              <input
                value={manual.opmerkingen}
                onChange={(e) => setManual((m) => ({ ...m, opmerkingen: e.target.value }))}
                className="mt-1 w-full rounded-md bg-zinc-900 text-zinc-100 border border-zinc-700 px-3 py-2"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <button
              onClick={addManualFighter}
              disabled={busy}
              className="rounded-md px-4 py-2 font-semibold disabled:opacity-60"
              style={{ background: "var(--brand-orange)", color: "black" }}
            >
              {busy ? "Bezig…" : "Vechter toevoegen"}
            </button>

            {manualMsg && (
              <div className="text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>
                {manualMsg}
              </div>
            )}
          </div>
        </div>

        {/* Fighters list */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--brand-orange)", background: "#111" }}>
          <h2 className="text-lg font-bold" style={{ color: "var(--brand-orange)" }}>
            Inschrijvingen
          </h2>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-[1200px] text-sm">
              <thead>
                <tr className="text-left text-white/80">
                  {/* ✅ gewenste volgorde */}
                  <th className="py-2 pr-4">Discipline</th>
                  <th className="py-2 pr-4">Klasse</th>
                  <th className="py-2 pr-4">Geslacht</th>
                  <th className="py-2 pr-4">Naam</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Sportschool</th>
                  <th className="py-2 pr-4">Fightpaspoort nr</th>
                  <th className="py-2 pr-4 min-w-[140px]">Geboortedatum</th>
                  <th className="py-2 pr-4">Gewicht</th>
                </tr>
              </thead>
              <tbody>
                {fighters.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-4 text-white/60">
                      {loading ? "Laden…" : "Nog geen inschrijvingen."}
                    </td>
                  </tr>
                ) : (
                  fighters.map((f, i) => {
                    // ✅ zebra fix: lichte rij = donkere tekst
                    const light = i % 2 === 1;
                    const rowClass = light ? "bg-white text-zinc-900" : "bg-zinc-900 text-zinc-100";

                    return (
                      <tr key={f.id ?? `${f.upload_id}-${f.row_nr}-${i}`} className={rowClass}>
                        <td className="py-2 px-2 whitespace-nowrap">{f.discipline ?? "—"}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{f.klasse ?? "—"}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{f.geslacht ?? "—"}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{fullName(f)}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{f.email ?? "—"}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{f.gym ?? "—"}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{f.va_nummer ?? "—"}</td>
                        <td className="py-2 px-2 whitespace-nowrap min-w-[140px]">{f.geboortedatum ?? "—"}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{f.gewicht ?? "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Uploads list */}
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--brand-orange)", background: "#111" }}>
          <h2 className="text-lg font-bold" style={{ color: "var(--brand-orange)" }}>
            Uploads
          </h2>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-white/80">
                  <th className="py-2 pr-4">Datum</th>
                  <th className="py-2 pr-4">Bestand</th>
                  <th className="py-2 pr-4">Uploader</th>
                  <th className="py-2 pr-4">Actie</th>
                </tr>
              </thead>
              <tbody>
                {uploads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-white/60">
                      Geen uploads.
                    </td>
                  </tr>
                ) : (
                  uploads.map((u, i) => {
                    const light = i % 2 === 1;
                    const rowClass = light ? "bg-white text-zinc-900" : "bg-zinc-900 text-zinc-100";
                    return (
                      <tr key={u.id ?? i} className={rowClass}>
                        <td className="py-2 px-2 whitespace-nowrap">{u.uploaded_at ?? "—"}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{u.raw_filename ?? u.file_path ?? "—"}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{u.uploaded_by ?? "—"}</td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          <button
                            onClick={() => deleteUpload(Number(u.id))}
                            disabled={busy}
                            className="rounded-md px-3 py-1 font-semibold disabled:opacity-60"
                            style={{ background: "var(--brand-orange)", color: "black" }}
                          >
                            Verwijder
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}