"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { authedFetch } from "@/lib/api/authedFetch";
import { supabase } from "@/lib/supabaseClient";

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
  status: string;
  gestart_op: string | null;
  afgerond_op: string | null;
  run_type: string | null;
}

interface UploadRow {
  id: string;
  evenement_naam: string | null;
  evenement_datum: string | null;
  locatie: string | null;
  matchmaking_id: string | null;
  matchmaker: string | null;
  promotor: string | null;
  bondteam: string | null;
  official_release?: boolean | null;
  official_released_at?: string | null;
  uploaded_at?: string | null;
  uploaded_by?: string | null;
  hoofdofficial_user_id?: string | null;
  laatste_run: ControleRun | null;
}

type TabKey = "controle" | "bondteam";

function formatDate(v: string | null) {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("nl-NL");
}

function formatDateTime(v: string | null | undefined) {
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

function Small({
  children,
  origin = "left center",
}: {
  children: ReactNode;
  origin?: string;
}) {
  return (
    <div
      style={{
        transform: "scale(0.85)",
        transformOrigin: origin,
      }}
    >
      {children}
    </div>
  );
}

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "Niet gecontroleerd").trim().toLowerCase();
}

function formatStatusLabel(status: string | null | undefined) {
  const s = normalizeStatus(status);
  if (s === "niet gecontroleerd") return "Niet gecontroleerd";
  return status ?? "Niet gecontroleerd";
}

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 text-sm font-extrabold tracking-[0.02em] transition"
      style={{
        borderRadius: 0,
        minWidth: 220,
        background: active
          ? "linear-gradient(180deg, #ff6a14 0%, #ff4d00 55%, #df3f00 100%)"
          : "linear-gradient(180deg, #f2f2f2 0%, #cfcfcf 48%, #a8a8a8 100%)",
        color: active ? "#fff" : "#161616",
        border: active
          ? "1px solid rgba(150,40,0,0.55)"
          : "1px solid rgba(82,82,91,0.45)",
        boxShadow: active
          ? "inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 22px rgba(255,77,0,0.18)"
          : "inset 0 1px 0 rgba(255,255,255,0.85), 0 10px 18px rgba(0,0,0,0.10)",
      }}
    >
      {label} <span style={{ opacity: 0.9 }}>({count})</span>
    </button>
  );
}

export default function ControleOverzichtPage() {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const [sportsBusy, setSportsBusy] = useState(false);
  const [sportsMsg, setSportsMsg] = useState<string>("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editMatchmaker, setEditMatchmaker] = useState("");
  const [editPromotor, setEditPromotor] = useState("");
  const [editBondteam, setEditBondteam] = useState("");

  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [snapshotSavingId, setSnapshotSavingId] = useState<string | null>(null);
  const [rowMsgById, setRowMsgById] = useState<Record<string, string>>({});

  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterBondteam, setFilterBondteam] = useState<string>("");
  const [filterName, setFilterName] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabKey>("controle");

  useEffect(() => {
    void load();
  }, []);

  function setRowMessage(rowId: string, message: string) {
    setRowMsgById((prev) => ({
      ...prev,
      [rowId]: message,
    }));
  }

  async function load() {
    setLoading(true);
    setSportsMsg("");

    const { data: uploads, error: uploadError } = await supabase
      .from("matchmaking_uploads")
      .select(
        `
        id,
        uploaded_at,
        uploaded_by,
        hoofdofficial_user_id,
        evenement_naam,
        evenement_datum,
        locatie,
        matchmaking_id,
        matchmaker,
        promotor,
        bondteam,
        official_release,
        official_released_at
      `
      )
      .order("uploaded_at", { ascending: false });

    if (uploadError) {
      console.error("Fout bij laden uploads:", uploadError);
      setRows([]);
      setLoading(false);
      return;
    }

    const matchmakingIds = (uploads ?? [])
      .map((u: any) => u.matchmaking_id)
      .filter(Boolean) as string[];

    const { data: runs } = matchmakingIds.length
      ? await supabase
          .from("controle_runs")
          .select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type")
          .in("matchmaking_id", matchmakingIds)
      : { data: [] as any[] };

    const runMap = new Map<string, ControleRun>();
    (runs ?? []).forEach((r: ControleRun) => {
      const existing = runMap.get(r.matchmaking_id);
      if (
        !existing ||
        new Date(r.gestart_op ?? 0) > new Date(existing.gestart_op ?? 0)
      ) {
        runMap.set(r.matchmaking_id, r);
      }
    });

    const merged: UploadRow[] = (uploads ?? []).map((u: any) => ({
      ...u,
      laatste_run: u.matchmaking_id ? runMap.get(u.matchmaking_id) ?? null : null,
    }));

    setRows(merged);
    setLoading(false);
  }

  async function runSportscholen() {
    try {
      setSportsMsg("");
      setSportsBusy(true);

      const res = await authedFetch("/api/control-engine/sportscholen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("Sportscholen run failed:", res.status, t);
        setSportsMsg(`❌ Sportscholen sync mislukt (${res.status}).`);
        return;
      }

      setSportsMsg("✅ Sportscholen sync gestart/afgerond.");
      await load();
    } catch (e) {
      console.error(e);
      setSportsMsg("❌ Onverwachte fout bij sportscholen sync.");
    } finally {
      setSportsBusy(false);
    }
  }

  async function startControle(matchmakingId: string) {
    try {
      setIsBusy(true);
      setBusyId(matchmakingId);

      const res = await authedFetch("/api/control-engine/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
          do_scrape: true,
          scrape_mode: "auto",
          reset_before_run: true,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("Start controle failed:", res.status, t);
        alert("Start controle mislukt. Check console/logs.");
        return;
      }

      await load();
    } finally {
      setBusyId(null);
      setIsBusy(false);
    }
  }

  async function deleteMatchmaking(matchmaking_id: string) {
    const ok2 = window.confirm(
      "Weet je zeker dat je deze matchmaking + alle controle data wilt verwijderen?\n\nDit kan niet ongedaan gemaakt worden."
    );
    if (!ok2) return;

    try {
      setBusyId(matchmaking_id);

      const res = await authedFetch("/api/control-engine/delete-matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("Delete failed:", res.status, t);
        alert("Verwijderen mislukt. Check console/logs.");
        return;
      }

      await load();
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(r: UploadRow) {
    setRowMessage(r.id, "");
    setEditId(r.id);
    setEditMatchmaker(r.matchmaker ?? "");
    setEditPromotor(r.promotor ?? "");
    setEditBondteam(r.bondteam ?? "");
  }

  function closeEdit() {
    setEditId(null);
    setEditMatchmaker("");
    setEditPromotor("");
    setEditBondteam("");
  }

  async function saveEdit(uploadId: string) {
    try {
      setRowMessage(uploadId, "");

      if (!editMatchmaker.trim()) {
        setRowMessage(uploadId, "⚠️ Matchmaker is verplicht.");
        return;
      }

      setSavingEditId(uploadId);

      const { error } = await supabase
        .from("matchmaking_uploads")
        .update({
          matchmaker: editMatchmaker.trim(),
          promotor: editPromotor.trim() || null,
          bondteam: editBondteam.trim() || null,
        })
        .eq("id", uploadId);

      if (error) {
        console.error("Update upload meta error:", error);
        setRowMessage(uploadId, "❌ Bewerken opslaan mislukt.");
        return;
      }

      setRowMessage(uploadId, "✅ Bewerking opgeslagen.");
      await load();
      closeEdit();
    } catch (e) {
      console.error(e);
      setRowMessage(uploadId, "❌ Onverwachte fout bij opslaan.");
    } finally {
      setSavingEditId(null);
    }
  }

  async function saveSnapshot(row: UploadRow) {
    try {
      const matchmakingId = String(row.matchmaking_id ?? "").trim();

      if (!matchmakingId) {
        setRowMessage(row.id, "❌ Geen matchmaking_id.");
        return;
      }

      setRowMessage(row.id, "");
      setSnapshotSavingId(row.id);

      const res = await authedFetch("/api/admin/beheer/save-matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: matchmakingId,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("save-matchmaking failed:", res.status, json);
        setRowMessage(
          row.id,
          json?.error ? `❌ ${json.error}` : "❌ Snapshot opslaan mislukt."
        );
        return;
      }

      setRowMessage(
        row.id,
        json?.message ?? "✅ Matchmaking opgeslagen in beheer-database."
      );
    } catch (e) {
      console.error(e);
      setRowMessage(row.id, "❌ Onverwachte fout bij snapshot opslaan.");
    } finally {
      setSnapshotSavingId(null);
    }
  }

  const monthOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => getMonthKey(r.evenement_datum)).filter(Boolean))
    ).sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const statusOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows.map((r) => normalizeStatus(r.laatste_run?.status ?? "Niet gecontroleerd"))
      )
    ).sort((a, b) => a.localeCompare(b, "nl"));
  }, [rows]);

  const tabRows = useMemo(() => {
    if (activeTab === "bondteam") {
      return rows.filter((r) => !!r.official_release);
    }
    return rows.filter((r) => !r.official_release);
  }, [rows, activeTab]);

  const filteredRows = useMemo(() => {
    const nameNeedle = filterName.trim().toLowerCase();
    const bondNeedle = filterBondteam.trim().toLowerCase();

    return tabRows.filter((r) => {
      const rowMonth = getMonthKey(r.evenement_datum);
      const rowBondteam = (r.bondteam ?? "").trim().toLowerCase();
      const rowMatchmaker = (r.matchmaker ?? "").trim().toLowerCase();
      const rowEvent = (r.evenement_naam ?? "").trim().toLowerCase();
      const rowStatus = normalizeStatus(r.laatste_run?.status ?? "Niet gecontroleerd");

      if (filterMonth && rowMonth !== filterMonth) return false;
      if (filterStatus && rowStatus !== filterStatus) return false;
      if (bondNeedle && !rowBondteam.includes(bondNeedle)) return false;

      if (
        nameNeedle &&
        !rowMatchmaker.includes(nameNeedle) &&
        !rowEvent.includes(nameNeedle)
      ) {
        return false;
      }

      return true;
    });
  }, [tabRows, filterMonth, filterBondteam, filterName, filterStatus]);

  const hasActiveFilters =
    !!filterMonth || !!filterBondteam || !!filterName || !!filterStatus;

  function resetFilters() {
    setFilterMonth("");
    setFilterBondteam("");
    setFilterName("");
    setFilterStatus("");
  }

  const bondteamCount = useMemo(
    () => rows.filter((r) => !!r.official_release).length,
    [rows]
  );
  const controleCount = useMemo(
    () => rows.filter((r) => !r.official_release).length,
    [rows]
  );

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
                      Controle Overzicht
                    </div>
                    <div className="mt-1 text-sm text-white/85">
                      Matchmakings ter controle
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Small origin="left center">
                      <NvbLightButton
                        label="← Terug naar Admin"
                        onClick={() => (window.location.href = "/dashboard/admin")}
                      />
                    </Small>

                    <Small origin="left center">
                      <NvbDarkButton
                        label="Upload MM"
                        onClick={() => (window.location.href = "/dashboard/admin/upload")}
                      />
                    </Small>
                  </div>
                </div>

                <div className="justify-self-center">
                  <Image
                    src="/branding/fightsupport/excel-logo.png"
                    alt="FightSupport"
                    width={320}
                    height={120}
                    priority
                    className="h-auto w-[240px] md:w-[280px] xl:w-[320px] drop-shadow-[0_8px_22px_rgba(0,0,0,0.45)]"
                  />
                </div>

                <div className="flex min-w-[240px] flex-col items-end gap-2 justify-self-end">
                  <button
                    onClick={runSportscholen}
                    disabled={sportsBusy}
                    className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-2 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60"
                    title="Update sportscholen tabel (keurmerk data)"
                  >
                    {sportsBusy ? "Sportscholen…" : "Sportscholen sync"}
                  </button>
                  {sportsMsg ? (
                    <span className="text-xs" style={{ color: "var(--brand-orange)" }}>
                      {sportsMsg}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="px-4 py-6 md:px-6">
              <div
                className="rounded-3xl border-2 border-zinc-500/60 p-4 shadow-[0_22px_60px_rgba(24,24,27,0.12)] ring-1 ring-white/50 md:p-5"
                style={silverBackplate}
              >
                <div className="px-2 py-2 md:px-3">
                  <div className="mb-5 flex flex-wrap items-center justify-center gap-3">
                    <TabButton
                      active={activeTab === "controle"}
                      label="Controle overzicht"
                      count={controleCount}
                      onClick={() => setActiveTab("controle")}
                    />
                    <TabButton
                      active={activeTab === "bondteam"}
                      label="Naar bondteam gestuurd"
                      count={bondteamCount}
                      onClick={() => setActiveTab("bondteam")}
                    />
                  </div>

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
                            {activeTab === "bondteam"
                              ? "Overzicht van matchmakings die naar bondteam / officials zijn gestuurd"
                              : "Filter op maand, bondteam, naam of status"}
                          </div>
                        </div>

                        <div className="text-sm text-zinc-600">
                          {filteredRows.length} van {tabRows.length} zichtbaar
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[180px_180px_minmax(180px,1fr)_180px_180px]">
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
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
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
                            Bondteam
                          </label>
                          <input
                            value={filterBondteam}
                            onChange={(e) => setFilterBondteam(e.target.value)}
                            placeholder="Zoek bondteam"
                            className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
                            style={{
                              borderColor: "rgba(63,63,70,0.22)",
                              background: "#fff",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
                            }}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            Naam
                          </label>
                          <input
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                            placeholder="Zoek evenement of matchmaker"
                            className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
                            style={{
                              borderColor: "rgba(63,63,70,0.22)",
                              background: "#fff",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
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
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
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
                              borderBottom: "2px solid rgba(255,255,255,0.35)",
                            }}
                          >
                            <tr>
                              <th className="px-4 py-3 text-left">Datum</th>
                              <th className="px-4 py-3 text-left">Evenement</th>
                              <th className="px-4 py-3 text-left">Locatie</th>
                              <th className="px-4 py-3 text-left">Matchmaker</th>
                              <th className="px-4 py-3 text-left">Promotor</th>
                              <th className="px-4 py-3 text-left">Bondteam</th>
                              <th className="px-4 py-3 text-left">Status</th>
                              {activeTab === "bondteam" ? (
                                <th className="px-4 py-3 text-left">Doorgestuurd</th>
                              ) : null}
                              <th className="px-4 py-3 text-left">Acties</th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredRows.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={activeTab === "bondteam" ? 9 : 8}
                                  className="px-4 py-8 text-center text-sm"
                                  style={{ background: "#ffffff", color: "#555" }}
                                >
                                  {activeTab === "bondteam"
                                    ? "Geen naar bondteam gestuurde matchmakings gevonden."
                                    : "Geen matchmakings gevonden met deze filters."}
                                </td>
                              </tr>
                            ) : (
                              filteredRows.map((r, i) => {
                                const zebra = i % 2 === 0;
                                const run = r.laatste_run;
                                const hasMatchmaking = !!r.matchmaking_id;
                                const canView = hasMatchmaking;
                                const isEditing = editId === r.id;
                                const mmId = r.matchmaking_id ?? "";
                                const rowBusy = busyId === mmId;
                                const rowEditBusy = savingEditId === r.id;
                                const rowSnapshotBusy = snapshotSavingId === r.id;
                                const rowMsg = rowMsgById[r.id] ?? "";

                                return (
                                  <tr
                                    key={r.id}
                                    style={{
                                      backgroundColor: zebra ? "#ffffff" : "#0d0d0d",
                                      color: zebra ? "#000" : "#fff",
                                    }}
                                  >
                                    <td className="px-4 py-3">
                                      {formatDate(r.evenement_datum)}
                                    </td>
                                    <td className="px-4 py-3 font-semibold">
                                      {r.evenement_naam ?? "-"}
                                    </td>
                                    <td className="px-4 py-3">{r.locatie ?? "-"}</td>

                                    <td className="px-4 py-3">
                                      {isEditing ? (
                                        <input
                                          className="orange-input h-9 w-full"
                                          value={editMatchmaker}
                                          onChange={(e) =>
                                            setEditMatchmaker(e.target.value)
                                          }
                                          placeholder="Matchmaker *"
                                        />
                                      ) : (
                                        r.matchmaker ?? "-"
                                      )}
                                    </td>

                                    <td className="px-4 py-3">
                                      {isEditing ? (
                                        <input
                                          className="orange-input h-9 w-full"
                                          value={editPromotor}
                                          onChange={(e) =>
                                            setEditPromotor(e.target.value)
                                          }
                                          placeholder="Promotor (optioneel)"
                                        />
                                      ) : (
                                        r.promotor ?? "-"
                                      )}
                                    </td>

                                    <td className="px-4 py-3">
                                      {isEditing ? (
                                        <input
                                          className="orange-input h-9 w-full"
                                          value={editBondteam}
                                          onChange={(e) =>
                                            setEditBondteam(e.target.value)
                                          }
                                          placeholder="Bondteam (optioneel)"
                                        />
                                      ) : (
                                        r.bondteam ?? "-"
                                      )}
                                    </td>

                                    <td className="px-4 py-3 italic">
                                      {formatStatusLabel(run?.status)}
                                    </td>

                                    {activeTab === "bondteam" ? (
                                      <td className="px-4 py-3 text-sm">
                                        {formatDateTime(r.official_released_at)}
                                      </td>
                                    ) : null}

                                    <td className="px-4 py-3">
                                      <div className="flex flex-wrap items-center gap-3">
                                        <Link
                                          href={
                                            hasMatchmaking
                                              ? `/dashboard/admin/controle/${r.matchmaking_id}`
                                              : "#"
                                          }
                                          className={[
                                            "rounded border px-3 py-1 text-sm",
                                            canView
                                              ? "bg-[#2f2f33] border-[var(--brand-orange)] text-white hover:bg-[var(--brand-orange)] hover:text-black"
                                              : "pointer-events-none cursor-not-allowed bg-zinc-200 text-zinc-400 border-zinc-300",
                                          ].join(" ")}
                                          aria-disabled={!canView}
                                          tabIndex={canView ? 0 : -1}
                                        >
                                          Matchmaking
                                        </Link>

                                        {activeTab === "controle" && hasMatchmaking && (
                                          <button
                                            onClick={() =>
                                              startControle(r.matchmaking_id!)
                                            }
                                            disabled={
                                              rowBusy ||
                                              isBusy ||
                                              rowEditBusy ||
                                              rowSnapshotBusy
                                            }
                                            className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60"
                                            title="Start volledige controle: scrape + build + enrich + rules (nieuwe run)"
                                          >
                                            {rowBusy ? "Bezig…" : "Start controle"}
                                          </button>
                                        )}

                                        {!isEditing ? (
                                          <button
                                            onClick={() => openEdit(r)}
                                            disabled={
                                              rowBusy ||
                                              rowEditBusy ||
                                              rowSnapshotBusy
                                            }
                                            className="rounded border border-zinc-300 bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-white hover:text-black disabled:opacity-60"
                                          >
                                            Bewerken
                                          </button>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => saveEdit(r.id)}
                                              disabled={
                                                rowBusy ||
                                                rowEditBusy ||
                                                rowSnapshotBusy ||
                                                isBusy
                                              }
                                              className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60"
                                            >
                                              {rowEditBusy ? "Opslaan…" : "Bewerking opslaan"}
                                            </button>
                                            <button
                                              onClick={closeEdit}
                                              disabled={rowEditBusy || rowSnapshotBusy}
                                              className="rounded border border-zinc-300 bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-white hover:text-black disabled:opacity-60"
                                            >
                                              Annuleren
                                            </button>
                                          </>
                                        )}

                                        {activeTab === "bondteam" && hasMatchmaking && (
                                          <button
                                            onClick={() => saveSnapshot(r)}
                                            disabled={
                                              rowBusy ||
                                              rowEditBusy ||
                                              rowSnapshotBusy ||
                                              isBusy
                                            }
                                            className="rounded border border-emerald-600 bg-[#2f2f33] px-3 py-1 text-sm text-emerald-100 hover:bg-emerald-600 hover:text-white disabled:opacity-60"
                                            title="Sla deze matchmaking op in admin beheer snapshots"
                                          >
                                            {rowSnapshotBusy ? "Bezig…" : "Opslaan"}
                                          </button>
                                        )}

                                        {hasMatchmaking && (
                                          <button
                                            onClick={() =>
                                              deleteMatchmaking(r.matchmaking_id!)
                                            }
                                            disabled={
                                              rowBusy ||
                                              isBusy ||
                                              rowEditBusy ||
                                              rowSnapshotBusy
                                            }
                                            className="rounded border border-red-600 bg-[#2f2f33] px-3 py-1 text-sm text-red-200 hover:bg-red-600 hover:text-white disabled:opacity-60"
                                            title="Verwijdert uploads, bouts, uitslagen_raw en alle controle-data voor deze matchmaking"
                                          >
                                            {rowBusy ? "Bezig…" : "Verwijderen"}
                                          </button>
                                        )}

                                        {rowMsg ? (
                                          <span
                                            className="text-xs"
                                            style={{
                                              color: rowMsg.startsWith("✅")
                                                ? zebra
                                                  ? "#0a7a2f"
                                                  : "#8dffb0"
                                                : rowMsg.startsWith("⚠️")
                                                ? zebra
                                                  ? "#9a5a00"
                                                  : "#ffd58f"
                                                : zebra
                                                ? "var(--brand-orange)"
                                                : "#ffb38a",
                                            }}
                                          >
                                            {rowMsg}
                                          </span>
                                        ) : null}
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