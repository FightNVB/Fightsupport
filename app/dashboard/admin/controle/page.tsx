"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
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

type TabKey = "eigen" | "matchmaker" | "official";
type EigenaarType = "admin" | "matchmaker" | "official" | "unknown";

interface MatchmakingRow {
  id: string;
  naam: string | null;
  datum: string | null;
  locatie: string | null;
  promotor: string | null;
  bondteam: string | null;

  bron_type: string | null;
  stadium: string | null;
  status: string | null;
  final_status: string | null;

  huidige_eigenaar_type: string | null;
  huidige_eigenaar_user_id: string | null;
  huidige_eigenaar_bondteam: string | null;

  created_at: string | null;
  last_updated_at: string | null;
  last_updated_by: string | null;

  submitted_to_admin_at: string | null;
  entered_control_at: string | null;
  sent_to_officials_at: string | null;
  entered_weegstation_at: string | null;
  ready_for_results_at: string | null;
  results_finalized_at: string | null;

  is_actief: boolean | null;
  locked_for_editing: boolean | null;
  is_archived: boolean | null;

  matchmaker_id?: string | null;
  hoofdofficial_id?: string | null;

  laatste_run: ControleRun | null;
}

function formatDate(v: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("nl-NL");
}

function formatDateTime(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("nl-NL");
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
  const raw = String(status ?? "").trim();
  const s = raw.toLowerCase();

  if (!s) return "Niet gecontroleerd";
  if (s === "niet gecontroleerd") return "Niet gecontroleerd";
  if (s === "nieuw") return "Nieuw";
  if (s === "concept") return "Concept";
  if (s === "in_behandeling") return "In behandeling";
  if (s === "running") return "Bezig";
  if (s === "klaar") return "Klaar";
  if (s === "failed") return "Mislukt";

  return raw;
}

function formatBronLabel(bronType: string | null | undefined) {
  const s = String(bronType ?? "").trim().toLowerCase();

  if (!s) return "-";
  if (s === "matchmaker_upload") return "Matchmaker upload";
  if (s === "matchmaker_app") return "Matchmaker app";
  if (s === "official_upload") return "Official upload";
  if (s === "admin_upload") return "Admin upload";
  if (s === "admin_app") return "Admin app";

  return String(bronType ?? "-");
}

function normalizeOwnerType(v: string | null | undefined): EigenaarType {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "admin") return "admin";
  if (s === "matchmaker") return "matchmaker";
  if (s === "official") return "official";
  return "unknown";
}

function formatOwnerTypeLabel(v: string | null | undefined) {
  const t = normalizeOwnerType(v);
  if (t === "admin") return "Admin";
  if (t === "matchmaker") return "Matchmaker";
  if (t === "official") return "Official";
  return "Onbekend";
}

function shortId(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (s.length <= 10) return s;
  return `${s.slice(0, 8)}…`;
}

function inferTabFromRow(row: MatchmakingRow): TabKey {
  const bron = String(row.bron_type ?? "").trim().toLowerCase();

  if (bron === "matchmaker_app" || bron === "matchmaker_upload") {
    return "matchmaker";
  }

  if (bron === "official_upload") {
    return "official";
  }

  return "eigen";
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
        minWidth: 240,
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
  const [rows, setRows] = useState<MatchmakingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const [sportsBusy, setSportsBusy] = useState(false);
  const [sportsMsg, setSportsMsg] = useState<string>("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editNaam, setEditNaam] = useState("");
  const [editLocatie, setEditLocatie] = useState("");
  const [editPromotor, setEditPromotor] = useState("");
  const [editBondteam, setEditBondteam] = useState("");

  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [snapshotSavingId, setSnapshotSavingId] = useState<string | null>(null);
  const [rowMsgById, setRowMsgById] = useState<Record<string, string>>({});

  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterBondteam, setFilterBondteam] = useState<string>("");
  const [filterName, setFilterName] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterOwner, setFilterOwner] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabKey>("eigen");

  const [ownerMap, setOwnerMap] = useState<Map<string, string>>(new Map());

  const [scrapeOverlayOpen, setScrapeOverlayOpen] = useState(false);
  const [scrapeOverlayTitle, setScrapeOverlayTitle] = useState("Even wachten");
  const [scrapeOverlayMessage, setScrapeOverlayMessage] = useState(
    "Autocheck loopt. Wacht op resultaten..."
  );
  const [scrapeOverlaySub, setScrapeOverlaySub] = useState(
    "Sluit deze pagina niet af terwijl de autocheck loopt."
  );

  useEffect(() => {
    void load();
  }, []);

  function openScrapeOverlay(options?: {
    title?: string;
    message?: string;
    sub?: string;
  }) {
    setScrapeOverlayTitle(options?.title ?? "Even wachten");
    setScrapeOverlayMessage(
      options?.message ?? "Autocheck loopt. Wacht op resultaten..."
    );
    setScrapeOverlaySub(
      options?.sub ?? "Sluit deze pagina niet af terwijl de controle loopt."
    );
    setScrapeOverlayOpen(true);
  }

  function closeScrapeOverlay() {
    setScrapeOverlayOpen(false);
  }

  function setRowMessage(rowId: string, message: string) {
    setRowMsgById((prev) => ({
      ...prev,
      [rowId]: message,
    }));
  }

  async function load() {
    setLoading(true);
    setSportsMsg("");

    try {
      const res = await authedFetch("/api/admin/beheer/matchmakings-overzicht", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("Fout bij laden matchmakings:", res.status, t);
        setRows([]);
        setLoading(false);
        return;
      }

      const json = await res.json();
      const matchmakings = Array.isArray(json?.rows) ? json.rows : [];

      const matchmakingIds = matchmakings
        .map((r: any) => String(r.id ?? "").trim())
        .filter(Boolean);

      const { data: runs, error: runsError } = matchmakingIds.length
        ? await supabase
            .from("controle_runs")
            .select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type")
            .in("matchmaking_id", matchmakingIds)
        : { data: [] as any[], error: null as any };

      if (runsError) {
        console.error("Fout bij laden controle_runs:", runsError);
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

      const merged: MatchmakingRow[] = matchmakings.map((r: any) => ({
        id: String(r.id),
        naam: r.naam ?? null,
        datum: r.datum ?? null,
        locatie: r.locatie ?? null,
        promotor: r.promotor ?? null,
        bondteam: r.bondteam ?? null,

        bron_type: r.bron_type ?? null,
        stadium: r.stadium ?? null,
        status: r.status ?? null,
        final_status: r.final_status ?? null,

        huidige_eigenaar_type: r.huidige_eigenaar_type ?? null,
        huidige_eigenaar_user_id: r.huidige_eigenaar_user_id ?? null,
        huidige_eigenaar_bondteam: r.huidige_eigenaar_bondteam ?? null,

        created_at: r.created_at ?? null,
        last_updated_at: r.last_updated_at ?? null,
        last_updated_by: r.last_updated_by ?? null,

        submitted_to_admin_at: r.submitted_to_admin_at ?? null,
        entered_control_at: r.entered_control_at ?? null,
        sent_to_officials_at: r.sent_to_officials_at ?? null,
        entered_weegstation_at: r.entered_weegstation_at ?? null,
        ready_for_results_at: r.ready_for_results_at ?? null,
        results_finalized_at: r.results_finalized_at ?? null,

        is_actief: r.is_actief ?? true,
        locked_for_editing: r.locked_for_editing ?? false,
        is_archived: r.is_archived ?? false,

        matchmaker_id: r.matchmaker_id ?? null,
        hoofdofficial_id: r.hoofdofficial_id ?? null,

        laatste_run: runMap.get(String(r.id)) ?? null,
      }));

      const adminOnly = merged.filter(
        (r) => String(r.huidige_eigenaar_type ?? "").trim().toLowerCase() === "admin"
      );

      const profileIds = Array.from(
        new Set(
          adminOnly
            .flatMap((r) => [r.last_updated_by, r.huidige_eigenaar_user_id])
            .map((v) => String(v ?? "").trim())
            .filter(Boolean)
        )
      );

      const ownerNameMap = new Map<string, string>();

      if (profileIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from("user_profiles")
          .select("id, full_name, role, email, bondteam, created_at")
          .in("id", profileIds);

        if (profilesError) {
          console.error("Fout bij laden user_profiles:", profilesError);
        } else {
          (profiles ?? []).forEach((p: any) => {
            const label =
              String(p.full_name ?? p.email ?? p.id ?? "").trim() ||
              String(p.id ?? "").trim();

            if (p.id) {
              ownerNameMap.set(String(p.id), label);
            }
          });
        }
      }

      setOwnerMap(ownerNameMap);

      const sorted = adminOnly.sort((a, b) => {
        const aTime = new Date(a.datum ?? a.created_at ?? 0).getTime();
        const bTime = new Date(b.datum ?? b.created_at ?? 0).getTime();
        return bTime - aTime;
      });

      setRows(sorted);
    } catch (e) {
      console.error("Onverwachte fout bij load:", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
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

      openScrapeOverlay({
        title: "Even wachten",
        message: "Autocheck loopt. Wacht op resultaten...",
        sub: "Deze matchmaking wordt nu gecontroleerd. Dit kan even duren.",
      });

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
        closeScrapeOverlay();
        alert("Start controle mislukt. Check console/logs.");
        return;
      }

      setScrapeOverlayMessage("Resultaten worden geladen...");
      setScrapeOverlaySub("Nog heel even geduld.");

      await load();
      closeScrapeOverlay();
    } catch (e) {
      console.error(e);
      closeScrapeOverlay();
      alert("Onverwachte fout bij starten controle.");
    } finally {
      setBusyId(null);
      setIsBusy(false);
    }
  }

  async function deleteMatchmaking(matchmakingId: string) {
    const ok2 = window.confirm(
      "Weet je zeker dat je deze matchmaking + alle controle data wilt verwijderen?\n\nDit kan niet ongedaan gemaakt worden."
    );
    if (!ok2) return;

    try {
      setBusyId(matchmakingId);

      const res = await authedFetch("/api/control-engine/delete-matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchmaking_id: matchmakingId }),
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

  function openEdit(r: MatchmakingRow) {
    setRowMessage(r.id, "");
    setEditId(r.id);
    setEditNaam(r.naam ?? "");
    setEditLocatie(r.locatie ?? "");
    setEditPromotor(r.promotor ?? "");
    setEditBondteam(r.bondteam ?? "");
  }

  function closeEdit() {
    setEditId(null);
    setEditNaam("");
    setEditLocatie("");
    setEditPromotor("");
    setEditBondteam("");
  }

  async function saveEdit(row: MatchmakingRow) {
    try {
      setRowMessage(row.id, "");

      if (!editNaam.trim()) {
        setRowMessage(row.id, "⚠️ Naam evenement is verplicht.");
        return;
      }

      setSavingEditId(row.id);

      const { error } = await supabase
        .from("matchmakings")
        .update({
          naam: editNaam.trim(),
          locatie: editLocatie.trim() || null,
          promotor: editPromotor.trim() || null,
          bondteam: editBondteam.trim() || null,
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (error) {
        console.error("Update matchmaking error:", error);
        setRowMessage(row.id, "❌ Bewerken opslaan mislukt.");
        return;
      }

      setRowMessage(row.id, "✅ Bewerking opgeslagen.");
      await load();
      closeEdit();
    } catch (e) {
      console.error(e);
      setRowMessage(row.id, "❌ Onverwachte fout bij opslaan.");
    } finally {
      setSavingEditId(null);
    }
  }

  async function saveSnapshot(row: MatchmakingRow) {
    try {
      if (!row.id) {
        setRowMessage(row.id, "❌ Geen matchmaking_id.");
        return;
      }

      setRowMessage(row.id, "");
      setSnapshotSavingId(row.id);

      const res = await authedFetch("/api/admin/beheer/save-matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchmaking_id: row.id,
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

  function getOwnerLabel(row: MatchmakingRow) {
    const typeLabel = formatOwnerTypeLabel(row.huidige_eigenaar_type);
    const ownerId = String(row.huidige_eigenaar_user_id ?? "").trim();

    if (!ownerId) return typeLabel;

    const profileName = ownerMap.get(ownerId);
    if (profileName) return `${typeLabel} · ${profileName}`;

    return `${typeLabel} · ${shortId(ownerId)}`;
  }

  const monthOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => getMonthKey(r.datum)).filter(Boolean))
    ).sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const statusOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows.map((r) =>
          normalizeStatus(
            r.laatste_run?.status ?? r.stadium ?? r.status ?? "Niet gecontroleerd"
          )
        )
      )
    ).sort((a, b) => a.localeCompare(b, "nl"));
  }, [rows]);

  const ownerOptions = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => normalizeOwnerType(r.huidige_eigenaar_type)))
    ).filter((v) => v !== "unknown");
  }, [rows]);

  const eigenCount = useMemo(
    () => rows.filter((r) => inferTabFromRow(r) === "eigen").length,
    [rows]
  );

  const matchmakerCount = useMemo(
    () => rows.filter((r) => inferTabFromRow(r) === "matchmaker").length,
    [rows]
  );

  const officialCount = useMemo(
    () => rows.filter((r) => inferTabFromRow(r) === "official").length,
    [rows]
  );

  const tabRows = useMemo(() => {
    return rows.filter((r) => inferTabFromRow(r) === activeTab);
  }, [rows, activeTab]);

  const filteredRows = useMemo(() => {
    const nameNeedle = filterName.trim().toLowerCase();
    const bondNeedle = filterBondteam.trim().toLowerCase();

    return tabRows.filter((r) => {
      const rowMonth = getMonthKey(r.datum);
      const rowBondteam = (r.bondteam ?? "").trim().toLowerCase();
      const rowEvent = (r.naam ?? "").trim().toLowerCase();
      const rowOwner = normalizeOwnerType(r.huidige_eigenaar_type);
      const rowStatus = normalizeStatus(
        r.laatste_run?.status ?? r.stadium ?? r.status ?? "Niet gecontroleerd"
      );

      if (filterMonth && rowMonth !== filterMonth) return false;
      if (filterStatus && rowStatus !== filterStatus) return false;
      if (filterOwner && rowOwner !== filterOwner) return false;
      if (bondNeedle && !rowBondteam.includes(bondNeedle)) return false;
      if (nameNeedle && !rowEvent.includes(nameNeedle)) return false;

      return true;
    });
  }, [tabRows, filterMonth, filterBondteam, filterName, filterStatus, filterOwner]);

  const hasActiveFilters =
    !!filterMonth || !!filterBondteam || !!filterName || !!filterStatus || !!filterOwner;

  function resetFilters() {
    setFilterMonth("");
    setFilterBondteam("");
    setFilterName("");
    setFilterStatus("");
    setFilterOwner("");
  }

  return (
    <main className="min-h-screen px-4 py-6" style={{ background: "#eef0f3" }}>
      <div className="mx-auto w-full max-w-[1650px]">
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
                      Admin Beheer · Matchmakings
                    </div>
                    <div className="mt-1 text-sm text-white/85">
                      Overzicht op basis van tabel <strong>matchmakings</strong>
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
                  <div className="w-[240px] md:w-[280px] xl:w-[320px]">
                    <img
                      src="/branding/fightsupport/excel-logo.png"
                      alt="FightSupport"
                      width={320}
                      height={120}
                      loading="eager"
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                        filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.45))",
                      }}
                    />
                  </div>
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
                      active={activeTab === "eigen"}
                      label="Eigen upload"
                      count={eigenCount}
                      onClick={() => setActiveTab("eigen")}
                    />
                    <TabButton
                      active={activeTab === "matchmaker"}
                      label="Van matchmaker ontvangen"
                      count={matchmakerCount}
                      onClick={() => setActiveTab("matchmaker")}
                    />
                    <TabButton
                      active={activeTab === "official"}
                      label="Van official ontvangen"
                      count={officialCount}
                      onClick={() => setActiveTab("official")}
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
                            {activeTab === "eigen"
                              ? "Admin eigen uploads en admin-aangemaakte matchmakings"
                              : activeTab === "matchmaker"
                              ? "Alleen ontvangen van matchmaker en nu in bezit van admin"
                              : "Alleen ontvangen van official en nu in bezit van admin"}
                          </div>
                        </div>

                        <div className="text-sm text-zinc-600">
                          {filteredRows.length} van {tabRows.length} zichtbaar
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[180px_180px_minmax(200px,1fr)_180px_180px_180px]">
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
                            Naam event
                          </label>
                          <input
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                            placeholder="Zoek evenement"
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

                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                            Eigenaar
                          </label>
                          <select
                            value={filterOwner}
                            onChange={(e) => setFilterOwner(e.target.value)}
                            className="h-10 w-full rounded-xl border px-3 text-sm outline-none"
                            style={{
                              borderColor: "rgba(63,63,70,0.22)",
                              background: "#fff",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.95)",
                            }}
                          >
                            <option value="">Alle eigenaren</option>
                            {ownerOptions.map((owner) => (
                              <option key={owner} value={owner}>
                                {formatOwnerTypeLabel(owner)}
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
                              <th className="px-4 py-3 text-left">Bron</th>
                              <th className="px-4 py-3 text-left">Eigenaar</th>
                              <th className="px-4 py-3 text-left">Bondteam</th>
                              <th className="px-4 py-3 text-left">Laatst bijgewerkt</th>
                              <th className="px-4 py-3 text-left">Acties</th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredRows.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="px-4 py-8 text-center text-sm"
                                  style={{ background: "#ffffff", color: "#555" }}
                                >
                                  {activeTab === "eigen"
                                    ? "Geen eigen admin matchmakings gevonden."
                                    : activeTab === "matchmaker"
                                    ? "Nog geen matchmakings van matchmaker ontvangen."
                                    : "Nog geen matchmakings van official ontvangen."}
                                </td>
                              </tr>
                            ) : (
                              filteredRows.map((r, i) => {
                                const zebra = i % 2 === 0;
                                const isEditing = editId === r.id;
                                const rowBusy = busyId === r.id;
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
                                    <td className="px-4 py-3">{formatDate(r.datum)}</td>

                                    <td className="px-4 py-3 font-semibold">
                                      {isEditing ? (
                                        <input
                                          className="orange-input h-9 w-full"
                                          value={editNaam}
                                          onChange={(e) => setEditNaam(e.target.value)}
                                          placeholder="Naam evenement *"
                                        />
                                      ) : (
                                        <div>
                                          <div>{r.naam ?? "-"}</div>
                                          {r.locatie ? (
                                            <div className="text-xs opacity-75">
                                              {r.locatie}
                                            </div>
                                          ) : null}
                                        </div>
                                      )}
                                    </td>

                                    <td className="px-4 py-3">{formatBronLabel(r.bron_type)}</td>

                                    <td className="px-4 py-3">
                                      <div className="font-semibold">{getOwnerLabel(r)}</div>
                                      {r.huidige_eigenaar_bondteam ? (
                                        <div className="text-xs opacity-75">
                                          Bondteam: {r.huidige_eigenaar_bondteam}
                                        </div>
                                      ) : null}
                                    </td>

                                    <td className="px-4 py-3">
                                      {isEditing ? (
                                        <input
                                          className="orange-input h-9 w-full"
                                          value={editBondteam}
                                          onChange={(e) => setEditBondteam(e.target.value)}
                                          placeholder="Bondteam"
                                        />
                                      ) : (
                                        r.bondteam ?? "-"
                                      )}
                                    </td>

                                    <td className="px-4 py-3 text-sm">
                                      <div>{formatDateTime(r.last_updated_at)}</div>
                                      {r.last_updated_by ? (
                                        <div className="text-xs opacity-75">
                                          {ownerMap.get(r.last_updated_by) ??
                                            shortId(r.last_updated_by)}
                                        </div>
                                      ) : null}
                                    </td>

                                    <td className="px-4 py-3">
                                      <div className="flex flex-wrap items-center gap-3">
                                        <Link
                                          href={`/dashboard/admin/controle/${r.id}`}
                                          className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black"
                                        >
                                          Matchmaking
                                        </Link>

                                        <button
                                          onClick={() => startControle(r.id)}
                                          disabled={
                                            rowBusy ||
                                            isBusy ||
                                            rowEditBusy ||
                                            rowSnapshotBusy
                                          }
                                          className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60"
                                          title="Start volledige controle: scrape + build + enrich + rules"
                                        >
                                          {rowBusy ? "Bezig…" : "Start controle"}
                                        </button>

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
                                              onClick={() => saveEdit(r)}
                                              disabled={
                                                rowBusy ||
                                                rowEditBusy ||
                                                rowSnapshotBusy ||
                                                isBusy
                                              }
                                              className="rounded border border-[var(--brand-orange)] bg-[#2f2f33] px-3 py-1 text-sm text-white hover:bg-[var(--brand-orange)] hover:text-black disabled:opacity-60"
                                            >
                                              {rowEditBusy ? "Opslaan…" : "Opslaan"}
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

                                        <button
                                          onClick={() => deleteMatchmaking(r.id)}
                                          disabled={
                                            rowBusy ||
                                            isBusy ||
                                            rowEditBusy ||
                                            rowSnapshotBusy
                                          }
                                          className="rounded border border-red-600 bg-[#2f2f33] px-3 py-1 text-sm text-red-200 hover:bg-red-600 hover:text-white disabled:opacity-60"
                                          title="Verwijdert deze matchmaking met gekoppelde controledata"
                                        >
                                          {rowBusy ? "Bezig…" : "Verwijderen"}
                                        </button>

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

        {scrapeOverlayOpen ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background:
                "radial-gradient(circle at center, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.74) 62%, rgba(0,0,0,0.88) 100%)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <div
              style={{
                width: "min(96vw, 760px)",
                borderRadius: 28,
                overflow: "hidden",
                border: "3px solid rgba(255,77,0,0.45)",
                boxShadow:
                  "0 30px 90px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.12)",
                background:
                  "linear-gradient(180deg, rgba(42,42,46,0.98) 0%, rgba(20,20,24,0.98) 100%)",
              }}
            >
              <div
                style={{
                  height: 5,
                  background:
                    "linear-gradient(90deg, rgba(255,106,0,0.95) 0%, rgba(255,77,0,1) 50%, rgba(255,106,0,0.95) 100%)",
                }}
              />

              <div
                style={{
                  padding: "34px 28px 30px",
                  textAlign: "center",
                  color: "#fff",
                }}
              >
                <div
                  style={{
                    margin: "0 auto 18px",
                    width: 86,
                    height: 86,
                    borderRadius: "50%",
                    border: "4px solid rgba(255,255,255,0.16)",
                    borderTop: "4px solid #ff4d00",
                    animation: "scrapeSpin 1s linear infinite",
                    boxShadow: "0 0 0 10px rgba(255,77,0,0.08)",
                  }}
                />

                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    color: NVB_ORANGE,
                    textShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  }}
                >
                  {scrapeOverlayTitle}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    fontSize: 18,
                    fontWeight: 700,
                    lineHeight: 1.45,
                    color: "#ffffff",
                  }}
                >
                  {scrapeOverlayMessage}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "rgba(255,255,255,0.78)",
                  }}
                >
                  {scrapeOverlaySub}
                </div>

                <div
                  style={{
                    marginTop: 24,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    borderRadius: 999,
                    padding: "10px 16px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: NVB_ORANGE,
                      boxShadow: "0 0 18px rgba(255,77,0,0.75)",
                    }}
                  />
                  Controle bezig
                </div>
              </div>
            </div>
          </div>
        ) : null}

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

          @keyframes scrapeSpin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </main>
  );
}