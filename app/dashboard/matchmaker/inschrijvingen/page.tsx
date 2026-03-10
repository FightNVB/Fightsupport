"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api/authedFetch";

type AnyRow = Record<string, any>;

export default function MatchmakerUploadsOverzichtPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [melding, setMelding] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);

    // matchmakings van deze gebruiker
    const { data: mms, error } = await supabase
      .from("matchmaker_matchmakings")
      .select("*")
      .eq("created_by", user.id)
      .order("id", { ascending: false });

    if (error) {
      setMelding(`❌ ${error.message}`);
      setRows([]);
      setLoading(false);
      return;
    }

    // tel uploads + fighters + bouts per mm (simpel & betrouwbaar: extra queries)
    const ids = (mms ?? []).map((m: any) => m.id).filter(Boolean);

    let uploadsById: Record<string, number> = {};
    let fightersById: Record<string, number> = {};
    let boutsById: Record<string, number> = {};

    if (ids.length) {
      const [{ data: ups }, { data: fs }, { data: bs }] = await Promise.all([
        supabase.from("matchmaker_uploads").select("matchmaker_matchmaking_id").in("matchmaker_matchmaking_id", ids),
        supabase.from("matchmaker_fighters_raw").select("matchmaker_matchmaking_id").in("matchmaker_matchmaking_id", ids),
        supabase.from("matchmaker_bouts_raw").select("matchmaker_matchmaking_id").in("matchmaker_matchmaking_id", ids),
      ]);

      for (const u of ups ?? []) {
        const k = String((u as any).matchmaker_matchmaking_id);
        uploadsById[k] = (uploadsById[k] ?? 0) + 1;
      }
      for (const f of fs ?? []) {
        const k = String((f as any).matchmaker_matchmaking_id);
        fightersById[k] = (fightersById[k] ?? 0) + 1;
      }

      for (const b of bs ?? []) {
        const k = String((b as any).matchmaker_matchmaking_id);
        boutsById[k] = (boutsById[k] ?? 0) + 1;
      }
    }

    const merged = (mms ?? []).map((m: any) => ({
      ...m,
      uploads_count: uploadsById[String(m.id)] ?? 0,
      fighters_count: fightersById[String(m.id)] ?? 0,
      bouts_count: boutsById[String(m.id)] ?? 0,
      status: m.status ?? "draft",
    }));

    setRows(merged);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function deleteMatchmaking(mmId: number) {
    try {
      if (!user) return setMelding("⚠️ Je bent niet ingelogd.");

      const ok = confirm("Weet je zeker dat je dit evenement (alle uploads + vechters) wilt verwijderen?");
      if (!ok) return;

      setBusy(true);
      setMelding("⏳ Evenement verwijderen…");

      const res = await authedFetch("/api/matchmaker/submit-inschrijvingen", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "delete_matchmaking",
          matchmaker_matchmaking_id: mmId,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) return setMelding(`❌ ${data?.error ?? "Verwijderen mislukt"}`);

      setMelding("✅ Verwijderd.");
      await load();
    } catch (e) {
      console.error(e);
      setMelding("❌ Onverwachte fout.");
    } finally {
      setBusy(false);
    }
  }

  async function sendToNvb(mmId: number) {
    try {
      if (!user) return setMelding("⚠️ Je bent niet ingelogd.");

      const ok = confirm(
        "Stuur deze matchmaking naar NVB voor controle?\n\nDit maakt een officiële matchmaking aan (matchmaking_uploads + matchmaking_bouts_raw)."
      );
      if (!ok) return;

      setBusy(true);
      setMelding("⏳ Versturen naar NVB…");

      const res = await authedFetch("/api/matchmaker/send-to-controle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchmaker_matchmaking_id: mmId }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) return setMelding(`❌ ${data?.error ?? "Versturen mislukt"}`);

      setMelding("✅ Verstuurd naar NVB.");
      await load();
    } catch (e) {
      console.error(e);
      setMelding("❌ Onverwachte fout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--brand-orange)", background: "#111" }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--brand-orange)" }}>
                Mijn uploads (alle evenementen)
              </h1>
              <div className="text-sm text-white/70">
                Hier zie je al je matchmaker-drafts. Je kunt een event openen of volledig verwijderen.
              </div>
            </div>

            <button
              onClick={() => router.push("/dashboard/matchmaker/inschrijvingen/upload")}
              className="rounded-md px-4 py-2 font-semibold"
              style={{ background: "var(--brand-orange)", color: "black" }}
            >
              Nieuwe upload
            </button>
          </div>
        </div>

        {melding && <div className="text-sm font-semibold" style={{ color: "var(--brand-orange)" }}>{melding}</div>}

        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--brand-orange)", background: "#111" }}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-white/80">
                  <th className="py-2 pr-4">Evenement</th>
                  <th className="py-2 pr-4">Datum</th>
                  <th className="py-2 pr-4">Bondteam</th>
                  <th className="py-2 pr-4">Uploads</th>
                  <th className="py-2 pr-4">Vechters</th>
                  <th className="py-2 pr-4">Partijen</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Acties</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-4 text-white/60">Laden…</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-4 text-white/60">Nog geen uploads.</td>
                  </tr>
                ) : (
                  rows.map((r, i) => {
                    const light = i % 2 === 1;
                    const rowClass = light ? "bg-white text-zinc-900" : "bg-zinc-900 text-zinc-100";
                    return (
                      <tr key={r.id ?? i} className={rowClass}>
                        <td className="py-2 px-2 whitespace-nowrap">{r.evenement_naam ?? "—"}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{r.evenement_datum ?? "—"}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{r.bondteam ?? "—"}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{r.uploads_count ?? 0}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{r.fighters_count ?? 0}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{r.bouts_count ?? 0}</td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          <span
                            className="rounded px-2 py-1 text-xs font-bold"
                            style={{
                              background: r.status === "sent" ? "rgba(16,185,129,0.15)" : "rgba(255,77,0,0.12)",
                              color: r.status === "sent" ? "#34d399" : "var(--brand-orange)",
                              border: `1px solid ${r.status === "sent" ? "rgba(16,185,129,0.35)" : "rgba(255,77,0,0.35)"}`,
                            }}
                          >
                            {String(r.status ?? "draft").toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap flex gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/matchmaker/inschrijvingen/${r.id}`)}
                            className="rounded-md px-3 py-1 font-semibold"
                            style={{ background: "var(--brand-orange)", color: "black" }}
                          >
                            Open
                          </button>

                          <button
                            onClick={() => sendToNvb(Number(r.id))}
                            disabled={busy || r.status === "sent" || Number(r.bouts_count ?? 0) === 0}
                            className="rounded-md px-3 py-1 font-semibold disabled:opacity-60"
                            style={{
                              background: "#111",
                              border: "1px solid rgba(16,185,129,0.55)",
                              color: "#34d399",
                            }}
                            title={Number(r.bouts_count ?? 0) === 0 ? "Maak eerst partijen (match page)" : "Publiceer naar NVB controle"}
                          >
                            Stuur naar NVB
                          </button>

                          <button
                            onClick={() => deleteMatchmaking(Number(r.id))}
                            disabled={busy}
                            className="rounded-md px-3 py-1 font-semibold disabled:opacity-60 border"
                            style={{ borderColor: "var(--brand-orange)", color: "var(--brand-orange)", background: "transparent" }}
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