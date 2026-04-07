"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";

import NvbLightButton from "@/components/NvbLightButton";
import NvbDarkButton from "@/components/NvbDarkButton";

const NVB_ORANGE = "#ff4d00";

const silverBackplate: CSSProperties = {
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.16) 38%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(236,238,242,0.98) 100%)",
};

interface ControleRun {
  id: string;
  matchmaking_id: string;
  status: string | null;
  gestart_op: string | null;
  afgerond_op: string | null;
}

interface MatchmakingRow {
  id: string;
  naam: string | null;
  datum: string | null;
  locatie: string | null;
  promotor: string | null;
  bondteam: string | null;
  matchmaker_id: string | null;
  matchmaker_naam: string | null;
  status: string | null;
  official_release: boolean | null;
  official_released_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  laatste_run: ControleRun | null;
}

interface Profile {
  id: string;
  full_name?: string | null;
  bondteam?: string | null;
}

function formatDate(v: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("nl-NL");
}

function formatDateTime(v: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleString("nl-NL");
}

function getMonthKey(v: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey: string) {
  if (!monthKey) return "-";
  const [year, month] = monthKey.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
  });
}

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "concept").trim().toLowerCase();
}

function formatStatusLabel(status: string | null | undefined) {
  const s = normalizeStatus(status);
  if (s === "concept") return "Concept";
  if (s === "nieuw") return "Nieuw";
  if (s === "niet gecontroleerd") return "Niet gecontroleerd";
  if (s === "ingediend_admin") return "Ingediend admin";
  if (s === "in_controle_admin") return "In controle";
  if (s === "retour_naar_eigenaar") return "Retour";
  if (s === "klaar_voor_weegstation") return "Klaar voor weegstation";
  if (s === "in_weegstation") return "In weegstation";
  if (s === "weegstation_verwerkt") return "Weegstation verwerkt";
  if (s === "definitieve_matchmaking_ingediend") {
    return "Definitieve MM ingediend";
  }
  if (s === "klaar_voor_uitslagen") return "Klaar voor uitslagen";
  if (s === "uitslagen_in_bewerking") return "Uitslagen in bewerking";
  if (s === "uitslagen_definitief") return "Uitslagen definitief";
  if (s === "gearchiveerd") return "Gearchiveerd";
  return status ?? "Concept";
}

function effectiveStatus(row: MatchmakingRow) {
  return row.laatste_run?.status ?? row.status ?? "concept";
}

function Small({
  children,
  origin = "left center",
}: {
  children: ReactNode;
  origin?: string;
}) {
  return (
    <div style={{ transform: "scale(0.85)", transformOrigin: origin }}>
      {children}
    </div>
  );
}

export default function MatchmakingOverzichtPage() {
  const router = useRouter();

  const [rows, setRows] = useState<MatchmakingRow[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [busyId, setBusyId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  const [naam, setNaam] = useState("");
  const [datum, setDatum] = useState("");
  const [locatie, setLocatie] = useState("");
  const [promotor, setPromotor] = useState("");
  const [bondteam, setBondteam] = useState("");

  const [filterMonth, setFilterMonth] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    void load();
  }, []);

  function resetCreateForm(profileData?: Profile | null) {
    setNaam("");
    setDatum("");
    setLocatie("");
    setPromotor("");
    setBondteam(profileData?.bondteam ?? "");
    setCreateMsg("");
  }

  async function load() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Fout bij ophalen gebruiker:", userError);
      setRows([]);
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, full_name, bondteam")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Fout bij laden profiel:", profileError);
    }

    const normalizedProfile: Profile = {
      id: user.id,
      full_name: profileData?.full_name ?? "",
      bondteam: profileData?.bondteam ?? "",
    };

    setProfile(normalizedProfile);

    const { data: matchmakings, error: matchmakingError } = await supabase
      .from("matchmaker_matchmakings")
      .select(`
        id,
        naam,
        datum,
        locatie,
        promotor,
        bondteam,
        matchmaker_id,
        matchmaker_naam,
        status,
        official_release,
        official_released_at,
        created_at,
        updated_at
      `)
      .eq("matchmaker_id", user.id)
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    if (matchmakingError) {
      console.error("Fout bij laden matchmakings:", matchmakingError);
      setRows([]);
      setLoading(false);
      return;
    }

    const ids = (matchmakings ?? []).map((r: any) => r.id).filter(Boolean);

    const { data: runs, error: runsError } = ids.length
      ? await supabase
          .from("controle_runs")
          .select("id, matchmaking_id, status, gestart_op, afgerond_op")
          .in("matchmaking_id", ids)
      : { data: [], error: null as any };

    if (runsError) {
      console.error("Fout bij laden controle runs:", runsError);
    }

    const runMap = new Map<string, ControleRun>();
    (runs ?? []).forEach((r: ControleRun) => {
      const existing = runMap.get(r.matchmaking_id);
      if (
        !existing ||
        new Date(r.gestart_op ?? 0).getTime() >
          new Date(existing.gestart_op ?? 0).getTime()
      ) {
        runMap.set(r.matchmaking_id, r);
      }
    });

    const merged: MatchmakingRow[] = (matchmakings ?? []).map((r: any) => ({
      ...r,
      laatste_run: runMap.get(r.id) ?? null,
    }));

    setRows(merged);
    setLoading(false);
  }

  async function createMatchmaking() {
    try {
      setCreateMsg("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setCreateMsg("❌ Gebruiker niet gevonden.");
        return;
      }

      if (!naam.trim()) {
        setCreateMsg("⚠️ Naam is verplicht.");
        return;
      }

      if (!datum.trim()) {
        setCreateMsg("⚠️ Datum is verplicht.");
        return;
      }

      if (!bondteam.trim()) {
        setCreateMsg("⚠️ Bondteam is verplicht.");
        return;
      }

      setCreating(true);

      const res = await authedFetch("/api/matchmaker/create-matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: naam.trim(),
          datum,
          locatie: locatie.trim() || null,
          promotor: promotor.trim() || null,
          bondteam: bondteam.trim() || null,
          matchmaker_naam: profile?.full_name?.trim() || null,
        }),
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("create-matchmaking failed:", res.status, payload);
        setCreateMsg(
          payload?.error || "❌ Nieuwe matchmaking aanmaken mislukt."
        );
        return;
      }

      const matchmakingId = String(payload?.matchmaking_id ?? "").trim();

      setShowCreate(false);
      resetCreateForm(profile);
      await load();

      if (matchmakingId) {
        router.push(`/dashboard/matchmaker/matchmaking/`);
      }
    } catch (e) {
      console.error(e);
      setCreateMsg("❌ Onverwachte fout bij aanmaken.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteMM(matchmakingId: string) {
    const ok = window.confirm(
      "Weet je zeker dat je deze matchmaking wilt verwijderen?\n\nDit kan niet ongedaan gemaakt worden."
    );
    if (!ok) return;

    try {
      setBusyId(matchmakingId);

      const res = await authedFetch("/api/matchmaker/delete-matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: matchmakingId }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("Delete failed:", res.status, t);
        alert("Verwijderen mislukt.");
        return;
      }

      await load();
    } finally {
      setBusyId(null);
    }
  }

  const monthOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => getMonthKey(r.datum)).filter(Boolean))
    ).sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const statusOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => normalizeStatus(effectiveStatus(r))))
    ).sort((a, b) => a.localeCompare(b, "nl"));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const nameNeedle = filterName.trim().toLowerCase();

    return rows.filter((r) => {
      const rowMonth = getMonthKey(r.datum);
      const rowStatus = normalizeStatus(effectiveStatus(r));
      const rowNaam = (r.naam ?? "").trim().toLowerCase();
      const rowLocatie = (r.locatie ?? "").trim().toLowerCase();
      const rowPromotor = (r.promotor ?? "").trim().toLowerCase();

      if (filterMonth && rowMonth !== filterMonth) return false;
      if (filterStatus && rowStatus !== filterStatus) return false;

      if (
        nameNeedle &&
        !rowNaam.includes(nameNeedle) &&
        !rowLocatie.includes(nameNeedle) &&
        !rowPromotor.includes(nameNeedle)
      ) {
        return false;
      }

      return true;
    });
  }, [rows, filterMonth, filterName, filterStatus]);

  const hasActiveFilters = !!filterMonth || !!filterName || !!filterStatus;

  function resetFilters() {
    setFilterMonth("");
    setFilterName("");
    setFilterStatus("");
  }

  return (
    <main className="min-h-screen px-4 py-6" style={{ background: "#eef0f3" }}>
      <div className="mx-auto w-full max-w-[1500px]">
        <div
          className="rounded-[32px] p-[6px]"
          style={{
            background:
              "linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 22%, #8f8f8f 55%, #f0f0f0 100%)",
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.7),
              0 22px 70px rgba(0,0,0,0.9)
            `,
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
            <div
              className="px-6 py-5"
              style={{
                background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                borderBottom: `3px solid rgba(255,77,0,0.55)`,
              }}
            >
              <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto_1fr]">
                <div className="justify-self-start">
                  <div className="leading-tight">
                    <div
                      className="font-extrabold uppercase"
                      style={{
                        fontSize: 28,
                        letterSpacing: "0.04em",
                        color: NVB_ORANGE,
                        textShadow: "0 6px 18px rgba(0,0,0,0.45)",
                      }}
                    >
                      Matchmaking overzicht
                    </div>
                    <div className="mt-1 text-sm text-white/85">
                      Maak een nieuwe MM.
                    </div>
                    <div className="mt-1 text-xs text-white/70">
                      Ingelogd als: {profile?.full_name || "-"}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Small origin="left center">
                      <NvbLightButton
                        label="← Terug naar menu"
                        onClick={() => router.push("/dashboard/matchmaker")}
                      />
                    </Small>

                    <Small origin="left center">
                      <NvbDarkButton
                        label={
                          showCreate
                            ? "Nieuwe matchmaking sluiten"
                            : "Nieuwe matchmaking starten"
                        }
                        onClick={() => {
                          if (!showCreate) resetCreateForm(profile);
                          setShowCreate((prev) => !prev);
                        }}
                      />
                    </Small>
                  </div>
                </div>

                <div className="justify-self-center">
                  <div className="w-[240px] md:w-[280px] xl:w-[320px]">
                    <Image
                      src="/branding/fightsupport/excel-logo.png"
                      alt="FightSupport"
                      width={320}
                      height={120}
                      priority
                      style={{ width: "100%", height: "auto" }}
                      className="drop-shadow-[0_8px_22px_rgba(0,0,0,0.45)]"
                    />
                  </div>
                </div>

                <div className="justify-self-end" />
              </div>
            </div>

            <div className="px-4 py-6 md:px-6">
              <div
                className="rounded-3xl border-2 border-zinc-500/60 p-4 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50 md:p-5"
                style={silverBackplate}
              >
                <div className="px-2 py-2 md:px-3">
                  {showCreate && (
                    <div
                      className="mb-5 rounded-[24px] border p-4 md:p-5"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(239,242,246,0.98) 100%)",
                        borderColor: "rgba(90,90,95,0.22)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 24px rgba(0,0,0,0.08)",
                      }}
                    >
                      <div className="mb-3">
                        <div className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-700">
                          Nieuwe matchmaking
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          Na opslaan komt de matchmaking direct in het overzicht.
                          De app maakt nu ook meteen een centrale rij in{" "}
                          <code>matchmakings</code>.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-5">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            Datum *
                          </label>
                          <input
                            type="date"
                            value={datum}
                            onChange={(e) => setDatum(e.target.value)}
                            className="orange-input h-10 w-full"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            Naam *
                          </label>
                          <input
                            value={naam}
                            onChange={(e) => setNaam(e.target.value)}
                            placeholder="Evenement naam"
                            className="orange-input h-10 w-full"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            Locatie
                          </label>
                          <input
                            value={locatie}
                            onChange={(e) => setLocatie(e.target.value)}
                            placeholder="Locatie"
                            className="orange-input h-10 w-full"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            Promotor
                          </label>
                          <input
                            value={promotor}
                            onChange={(e) => setPromotor(e.target.value)}
                            placeholder="Promotor"
                            className="orange-input h-10 w-full"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            Bondteam *
                          </label>
                          <input
                            value={bondteam}
                            onChange={(e) => setBondteam(e.target.value)}
                            placeholder="Bondteam"
                            className="orange-input h-10 w-full"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          onClick={createMatchmaking}
                          disabled={creating}
                          className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-4 py-2 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60"
                        >
                          {creating ? "Bezig…" : "Nieuwe matchmaking starten"}
                        </button>

                        <button
                          onClick={() => {
                            setShowCreate(false);
                            setCreateMsg("");
                          }}
                          disabled={creating}
                          className="rounded border border-zinc-300 bg-[#2f2f33] px-4 py-2 text-sm text-white hover:bg-white hover:text-black disabled:opacity-60"
                        >
                          Annuleren
                        </button>

                        {createMsg ? (
                          <span
                            className="text-xs"
                            style={{
                              color: createMsg.startsWith("⚠️")
                                ? "#9a5a00"
                                : "var(--brand-orange)",
                            }}
                          >
                            {createMsg}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {!loading && (
                    <div
                      className="rounded-[24px] border p-4 md:p-4"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(239,242,246,0.98) 100%)",
                        borderColor: "rgba(90,90,95,0.22)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 24px rgba(0,0,0,0.08)",
                      }}
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-700">
                            Filters
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            Filter op maand, naam of status
                          </div>
                        </div>

                        <div className="text-sm text-zinc-600">
                          {filteredRows.length} van {rows.length} zichtbaar
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[180px_minmax(180px,1fr)_180px_180px]">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            Maand
                          </label>
                          <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
                            style={{
                              borderColor: "rgba(63,63,70,0.22)",
                              background: "#fff",
                              boxShadow:
                                "inset 0 1px 0 rgba(255,255,255,0.95)",
                            }}
                          >
                            <option value="">Alle maanden</option>
                            {monthOptions.map((monthKey) => (
                              <option key={monthKey} value={monthKey}>
                                {formatMonthLabel(monthKey)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            Naam
                          </label>
                          <input
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                            placeholder="Zoek naam, locatie of promotor"
                            className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
                            style={{
                              borderColor: "rgba(63,63,70,0.22)",
                              background: "#fff",
                              boxShadow:
                                "inset 0 1px 0 rgba(255,255,255,0.95)",
                            }}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            Status
                          </label>
                          <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
                            style={{
                              borderColor: "rgba(63,63,70,0.22)",
                              background: "#fff",
                              boxShadow:
                                "inset 0 1px 0 rgba(255,255,255,0.95)",
                            }}
                          >
                            <option value="">Alle statussen</option>
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {formatStatusLabel(status)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-end">
                          <button
                            onClick={resetFilters}
                            disabled={!hasActiveFilters}
                            className="h-10 w-full rounded-xl border bg-[#2f2f33] px-3 text-sm text-white hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                            style={{
                              borderColor: hasActiveFilters
                                ? "rgba(255,77,0,0.65)"
                                : "rgba(63,63,70,0.22)",
                            }}
                          >
                            Filters wissen
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <p className="mt-6 text-center text-gray-500">Laden…</p>
                  ) : (
                    <div
                      className="mt-5 overflow-hidden rounded-2xl"
                      style={{
                        border: "2px solid rgba(230,230,230,0.55)",
                        background:
                          "linear-gradient(180deg, rgba(18,18,18,0.18) 0%, rgba(10,10,10,0.22) 100%)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                      }}
                    >
                      <div
                        className="h-[3px]"
                        style={{ background: "rgba(255,77,0,0.75)" }}
                      />

                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                          <thead
                            style={{
                              background:
                                "linear-gradient(180deg, #ff6a00 0%, #ff5400 100%)",
                              color: "#fff",
                              borderBottom:
                                "2px solid rgba(255,255,255,0.35)",
                            }}
                          >
                            <tr>
                              <th className="px-4 py-3 text-left">Datum</th>
                              <th className="px-4 py-3 text-left">Naam</th>
                              <th className="px-4 py-3 text-left">Locatie</th>
                              <th className="px-4 py-3 text-left">Promotor</th>
                              <th className="px-4 py-3 text-left">Bondteam</th>
                              <th className="px-4 py-3 text-left">Status</th>
                              <th className="px-4 py-3 text-left">
                                Laatste run
                              </th>
                              <th className="px-4 py-3 text-left">
                                Aangemaakt
                              </th>
                              <th className="px-4 py-3 text-left">Acties</th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredRows.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={9}
                                  className="px-4 py-8 text-center text-sm"
                                  style={{ background: "#ffffff", color: "#555" }}
                                >
                                  Geen matchmakings gevonden met deze filters.
                                </td>
                              </tr>
                            ) : (
                              filteredRows.map((r, i) => {
                                const zebra = i % 2 === 0;
                                const rowBusy = busyId === r.id;

                                return (
                                  <tr
                                    key={r.id}
                                    style={{
                                      backgroundColor: zebra
                                        ? "#ffffff"
                                        : "#0d0d0d",
                                      color: zebra ? "#000" : "#fff",
                                    }}
                                  >
                                    <td className="px-4 py-3">
                                      {formatDate(r.datum)}
                                    </td>
                                    <td className="px-4 py-3 font-semibold">
                                      {r.naam ?? "-"}
                                    </td>
                                    <td className="px-4 py-3">
                                      {r.locatie ?? "-"}
                                    </td>
                                    <td className="px-4 py-3">
                                      {r.promotor ?? "-"}
                                    </td>
                                    <td className="px-4 py-3">
                                      {r.bondteam ?? "-"}
                                    </td>
                                    <td className="px-4 py-3 italic">
                                      {formatStatusLabel(r.status)}
                                    </td>
                                    <td className="px-4 py-3 italic">
                                      {formatStatusLabel(effectiveStatus(r))}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      {formatDateTime(r.created_at)}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex flex-wrap items-center gap-3">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            router.push(
                                              `/dashboard/matchmaker/matchmaking/${r.id}/match`
                                            )
                                          }
                                          className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black"
                                        >
                                          Match
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            router.push(
                                              `/dashboard/matchmaker/matchmaking/${r.id}`
                                            )
                                          }
                                          className="rounded border border-zinc-300 bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-white hover:text-black"
                                        >
                                          Matchmaking
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => deleteMM(r.id)}
                                          disabled={rowBusy}
                                          className="rounded border border-red-600 bg-[#2f2f33] px-3 py-1 text-sm text-red-200 hover:bg-red-600 hover:text-white disabled:opacity-60"
                                        >
                                          {rowBusy ? "Bezig…" : "Verwijderen"}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <p className="mt-7 text-center text-xs text-zinc-500">
                    © FightSupport
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx global>{`
          :root {
            --brand-orange: ${NVB_ORANGE};
          }

          .orange-input {
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(255, 77, 0, 0.35);
            border-radius: 10px;
            padding: 0 10px;
            outline: none;
            color: #111;
          }

          .orange-input:focus {
            border-color: rgba(255, 77, 0, 0.75);
            box-shadow: 0 0 0 3px rgba(255, 77, 0, 0.18);
          }
        `}</style>
      </div>
    </main>
  );
}