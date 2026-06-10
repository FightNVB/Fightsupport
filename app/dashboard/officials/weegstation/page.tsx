"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Scale,
  Search,
  ShieldCheck,
  CalendarDays,
  Swords,
  ChevronDown,
  Trash2,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

const ORANGE = "#ff4d00";

type RoleName =
  | "superadmin"
  | "admin"
  | "promotor"
  | "matchmaker"
  | "official"
  | "hoofdofficial"
  | "dispensatie_admin";

type WeegstationTab = "actief" | "afgerond";

type MatchmakingRow = {
  id: string;
  matchmaking_id?: string | null;
  naam: string | null;
  datum: string | null;
  bondteam: string | null;
  locatie: string | null;
  stadium?: string | null;
  status?: string | null;
  huidige_eigenaar_type?: string | null;
  huidige_eigenaar_bondteam?: string | null;
  created_at?: string | null;
  huidige_eigenaar_user_id?: string | null;
};

function pageBgStyle(): CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(255,77,0,0.12) 0%, rgba(255,77,0,0.03) 18%, transparent 34%), linear-gradient(180deg, #050608 0%, #0a0d12 55%, #050608 100%)",
  };
}

function metalFrameStyle(): CSSProperties {
  return {
    border: "4px solid rgba(20,22,26,0.92)",
    borderRadius: 26,
    background:
      "radial-gradient(900px 300px at 50% -10%, rgba(255,77,0,0.16), transparent 55%), linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.05) 20%, rgba(255,255,255,0.00) 42%, rgba(255,255,255,0.12) 70%, rgba(255,255,255,0.02) 100%), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0.015) 5px), linear-gradient(180deg, #575b64 0%, #2b2f37 45%, #181b20 100%)",
    boxShadow:
      "0 20px 55px rgba(0,0,0,0.34), inset 0 0 0 2px rgba(255,255,255,0.14), inset 0 0 0 5px rgba(90,94,104,0.28), inset 0 -14px 22px rgba(0,0,0,0.30)",
  };
}

function metalInnerStyle(): CSSProperties {
  return {
    border: "3px solid rgba(20,22,26,0.34)",
    borderRadius: 20,
    background:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 6px), linear-gradient(180deg, #f8fafc 0%, #e7edf3 100%)",
    boxShadow:
      "inset 0 0 0 2px rgba(255,255,255,0.80), inset 0 0 0 6px rgba(0,0,0,0.08), inset 0 -12px 22px rgba(0,0,0,0.08)",
  };
}

function darkPanelStyle(): CSSProperties {
  return {
    background:
      "linear-gradient(180deg, rgba(47,50,58,0.98) 0%, rgba(30,32,37,0.98) 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.07), 0 14px 28px rgba(0,0,0,0.24)",
    borderRadius: 16,
  };
}

function silverCardStyle(): CSSProperties {
  return {
    background:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 6px), linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(237,242,247,0.98) 100%)",
    border: "2px solid rgba(0,0,0,0.15)",
    borderRadius: 18,
    boxShadow:
      "inset 0 0 0 1px rgba(255,255,255,0.75), inset 0 -10px 18px rgba(0,0,0,0.06), 0 14px 32px rgba(0,0,0,0.10)",
  };
}

function normalizeRoleName(v: unknown): RoleName | "" {
  return String(v ?? "")
    .trim()
    .toLowerCase() as RoleName | "";
}

function safeText(v: unknown, fallback = "-") {
  const s = String(v ?? "").trim();
  return s.length ? s : fallback;
}

function formatDate(v: string | null) {
  if (!v) return "-";
  return new Date(v.length === 10 ? `${v}T00:00:00` : v).toLocaleDateString(
    "nl-NL",
  );
}

function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone = "dark",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "dark" | "orange" | "silver" | "danger";
}) {
  const styles =
    tone === "orange"
      ? {
          background: "linear-gradient(180deg, #ff6a2b 0%, #ff4d00 100%)",
          border: "1px solid #c93e00",
          color: "#111",
        }
      : tone === "silver"
        ? {
            background: "linear-gradient(180deg, #d7dde5 0%, #aab3bf 100%)",
            border: "1px solid #7d8794",
            color: "#111827",
          }
        : tone === "danger"
          ? {
              background: "linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)",
              border: "1px solid #7f1d1d",
              color: "#fff",
            }
          : {
              background: "linear-gradient(180deg, #3d434d 0%, #22262d 100%)",
              border: "1px solid rgba(0,0,0,0.45)",
              color: "#fff",
            };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center whitespace-nowrap px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        borderRadius: 4,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
        ...styles,
      }}
    >
      {children}
    </button>
  );
}

function getBondteamBadgeStyle(
  bondteam: string | null | undefined,
  darkRow: boolean,
): CSSProperties {
  const key = String(bondteam ?? "")
    .trim()
    .toUpperCase();

  const map: Record<string, { bg: string; color: string; border: string }> = {
    IRO: { bg: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
    NKF: { bg: "#dcfce7", color: "#166534", border: "#86efac" },
    WPKL: { bg: "#f3e8ff", color: "#7c3aed", border: "#d8b4fe" },
    WMTA: { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" },
    VON: { bg: "#fef3c7", color: "#b45309", border: "#fcd34d" },
    UMC: { bg: "#cffafe", color: "#0f766e", border: "#67e8f9" },
    MMAAN: { bg: "#e0e7ff", color: "#4338ca", border: "#a5b4fc" },
    MON: { bg: "#ffedd5", color: "#c2410c", border: "#fdba74" },
  };

  const found = map[key];

  if (found) {
    return {
      background: found.bg,
      color: found.color,
      border: `1px solid ${found.border}`,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
    };
  }

  return darkRow
    ? {
        background: "rgba(255,255,255,0.10)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.14)",
      }
    : {
        background: "rgba(255,77,0,0.12)",
        color: "#9a3412",
        border: "1px solid rgba(255,77,0,0.20)",
      };
}

function normalizeStageKey(v: unknown) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function normalizeBondteam(v: unknown) {
  return String(v ?? "")
    .trim()
    .toUpperCase();
}

function isWeegstationFlow(
  stadium: unknown,
  status?: unknown,
  ownerType?: unknown,
) {
  const values = [stadium, status].map(normalizeStageKey);
  const owner = String(ownerType ?? "")
    .trim()
    .toLowerCase();

  if (
    owner === "bondteam" &&
    values.some(
      (v) => v === "naar-weegstation" || v === "klaar-voor-weegstation",
    )
  ) {
    return true;
  }

  return values.some((s) =>
    [
      "naar-weegstation",
      "klaar-voor-weegstation",
      "in-weegstation",
      "weegstation-verwerkt",
      "definitieve-matchmaking-ingediend",
      "definitieve-lineup",
      "klaar-voor-uitslagen",
      "uitslagen-in-bewerking",
      "uitslagen-definitief",
    ].includes(s),
  );
}

function displayStage(row: MatchmakingRow) {
  return safeText(row.stadium ?? row.status);
}

function isAfgerondWeegstation(row: MatchmakingRow) {
  const stadium = normalizeStageKey(row.stadium);
  const status = normalizeStageKey(row.status);

  return [stadium, status].some((v) =>
    [
      "weegstation-verwerkt",
      "weging-afgesloten",
      "definitieve-matchmaking-ingediend",
      "definitieve-lineup",
      "klaar-voor-uitslagen",
      "uitslagen-in-bewerking",
      "uitslagen-definitief",
    ].includes(v),
  );
}

function isActiefWeegstation(row: MatchmakingRow) {
  return !isAfgerondWeegstation(row);
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition"
      style={{
        borderColor: active ? "#ff4d00" : "rgba(113,113,122,0.75)",
        background: active
          ? "linear-gradient(180deg, #ff6a2b 0%, #ff4d00 100%)"
          : "linear-gradient(180deg, #2f3238 0%, #191b20 100%)",
        color: active ? "#111" : "#f4f4f5",
        boxShadow: active
          ? "0 0 18px rgba(255,77,0,0.24), inset 0 1px 0 rgba(255,255,255,0.22)"
          : "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {label} ({count})
    </button>
  );
}

function HeaderLogo() {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div
        className="flex h-[90px] w-full items-center justify-center rounded-[12px] border border-white/10 bg-white/5 px-6"
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 18px rgba(255,77,0,0.08)",
        }}
      >
        <div
          className="text-center text-[28px] font-black uppercase tracking-[0.14em]"
          style={{
            color: "#f3f4f6",
            textShadow: "0 0 14px rgba(255,77,0,0.22)",
          }}
        >
          FIGHTSUPPORT
        </div>
      </div>
    );
  }

  return (
    <img
      src="/branding/fightsupport/logo-header.png"
      alt="FightSupport"
      onError={() => setBroken(true)}
      className="block h-auto w-full"
      style={{
        filter:
          "drop-shadow(0 0 10px rgba(255,77,0,0.18)) drop-shadow(0 0 22px rgba(255,77,0,0.10))",
      }}
    />
  );
}

export default function WeegstationOverzichtPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [melding, setMelding] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [rows, setRows] = useState<MatchmakingRow[]>([]);
  const [search, setSearch] = useState("");
  const [bondteamFilter, setBondteamFilter] = useState("ALLE");
  const [activeTab, setActiveTab] = useState<WeegstationTab>("actief");

  const [roleNames, setRoleNames] = useState<RoleName[]>([]);
  const [myBondteam, setMyBondteam] = useState("");

  const canSeeAllBondteams = useMemo(() => {
    return (
      roleNames.includes("superadmin") &&
      normalizeBondteam(myBondteam) === "NVB"
    );
  }, [roleNames, myBondteam]);

  useEffect(() => {
    if (!user?.id) return;
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!canSeeAllBondteams && myBondteam && bondteamFilter !== myBondteam) {
      setBondteamFilter(myBondteam);
    }
  }, [canSeeAllBondteams, myBondteam, bondteamFilter]);

  async function loadRows() {
    if (!user?.id) return;

    setLoading(true);
    setMelding(null);

    try {
      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();

      if (sessionErr) throw sessionErr;

      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error("Niet ingelogd of sessie verlopen.");
      }

      const res = await fetch("/api/officials/weegstation/list", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error ?? "Fout bij laden van matchmakings.");
      }

      const names = Array.isArray(json?.roles)
        ? (json.roles.map(normalizeRoleName).filter(Boolean) as RoleName[])
        : [];

      setRoleNames(names);
      setMyBondteam(String(json?.bondteam ?? "").trim());

      const deduped = new Map<string, MatchmakingRow>();
      for (const raw of (json?.rows ?? []) as MatchmakingRow[]) {
        const id = String(raw?.id ?? "").trim();
        if (!id) continue;
        if (!deduped.has(id)) {
          deduped.set(id, { ...raw, matchmaking_id: id });
        }
      }

      setRows(Array.from(deduped.values()));
    } catch (e: any) {
      setMelding(e?.message ?? "Fout bij laden van matchmakings.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(matchmakingId: string) {
    if (!matchmakingId) return;

    const ok = window.confirm(
      "Weet je zeker dat je eerdere weegdata voor deze matchmaking wilt verwijderen? De matchmaking zelf blijft bestaan.",
    );
    if (!ok) return;

    setDeletingId(matchmakingId);
    setMelding(null);

    try {
      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();

      if (sessionErr) throw sessionErr;

      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error("Niet ingelogd of sessie verlopen.");
      }

      const res = await fetch("/api/officials/weegstation/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ matchmakingId }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Weegdata verwijderen mislukt.");
      }

      setMelding(
        "Eerdere weegdata verwijderd. De matchmaking staat nog steeds klaar voor weegstation.",
      );
      await loadRows();
    } catch (e: any) {
      setMelding(e?.message ?? "Weegdata verwijderen mislukt.");
    } finally {
      setDeletingId(null);
    }
  }

  function effectiveBondteam(row: MatchmakingRow) {
    return normalizeBondteam(
      row.bondteam ?? row.huidige_eigenaar_bondteam ?? "",
    );
  }

  const bondteamOptions = useMemo(() => {
    const unique = Array.from(
      new Set<string>(
        rows.map((row) => effectiveBondteam(row)).filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "nl"));

    if (canSeeAllBondteams) {
      return ["ALLE", ...unique];
    }

    return myBondteam ? [myBondteam] : [];
  }, [rows, canSeeAllBondteams, myBondteam]);

  const visibleRows = useMemo(() => {
    const q = normalizeSearchText(search);
    const ownBondteam = normalizeBondteam(myBondteam);

    return rows.filter((row) => {
      const rowBondteam = effectiveBondteam(row);

      if (canSeeAllBondteams) {
        if (
          bondteamFilter !== "ALLE" &&
          rowBondteam !== normalizeBondteam(bondteamFilter)
        ) {
          return false;
        }
      } else if (!ownBondteam || rowBondteam !== ownBondteam) {
        return false;
      }

      if (!q) return true;

      const haystack = normalizeSearchText(
        [
          row.naam,
          row.datum,
          effectiveBondteam(row),
          row.locatie,
          row.id,
          row.stadium,
          row.status,
          row.huidige_eigenaar_type,
          row.huidige_eigenaar_bondteam,
        ].join(" "),
      );

      return haystack.includes(q);
    });
  }, [rows, search, bondteamFilter, canSeeAllBondteams, myBondteam]);

  const activeRows = useMemo(
    () => visibleRows.filter((row) => isActiefWeegstation(row)),
    [visibleRows],
  );

  const afgerondRows = useMemo(
    () => visibleRows.filter((row) => isAfgerondWeegstation(row)),
    [visibleRows],
  );

  const filteredRows = activeTab === "afgerond" ? afgerondRows : activeRows;

  const roleLabel = useMemo(() => {
    if (roleNames.includes("superadmin")) return "SUPERADMIN";
    if (roleNames.includes("admin")) return "ADMIN";
    if (roleNames.includes("dispensatie_admin")) return "DISPENSATIE ADMIN";
    if (roleNames.includes("hoofdofficial")) return "HOOFDOFFICIAL";
    if (roleNames.includes("official")) return "OFFICIAL";
    if (roleNames.includes("matchmaker")) return "MATCHMAKER";
    return "GEBRUIKER";
  }, [roleNames]);

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
                FightSupport Officials
              </p>
              <h1 className="flex items-center gap-2 text-2xl font-black uppercase">
                <Scale className="h-6 w-6 text-[#ff4d00]" />
                Weegstation
              </h1>
              <p className="text-sm text-zinc-300">
                {canSeeAllBondteams
                  ? "Alle matchmakings die naar weegstation zijn gestuurd"
                  : "Alleen matchmakings van jouw bond die naar weegstation zijn gestuurd"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="border border-[#ff4d00] bg-[#ff4d0017] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#ff7a3c]">
                {roleLabel} · Bondteam: {safeText(myBondteam)}
              </div>
              <button
                type="button"
                onClick={() => router.push("/dashboard/officials")}
                className="inline-flex items-center border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:brightness-110"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Terug
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-4">
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{filteredRows.length}</b>
            <p className="text-xs uppercase text-zinc-400">In selectie</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{visibleRows.length}</b>
            <p className="text-xs uppercase text-zinc-400">Zichtbaar totaal</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">
              {canSeeAllBondteams ? "ALLE" : safeText(myBondteam)}
            </b>
            <p className="text-xs uppercase text-zinc-400">Bondteam filter</p>
          </div>
          <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
            <b className="text-xl text-[#ff4d00]">{roleLabel}</b>
            <p className="text-xs uppercase text-zinc-400">Toegang</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-700 p-4">
          <TabButton
            label="Actief"
            count={activeRows.length}
            active={activeTab === "actief"}
            onClick={() => setActiveTab("actief")}
          />
          <TabButton
            label="Afgerond"
            count={afgerondRows.length}
            active={activeTab === "afgerond"}
            onClick={() => setActiveTab("afgerond")}
          />
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
            Afgerond is alleen inzien; aanpassen of wissen is uitgeschakeld.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="flex min-w-[320px] flex-1 items-center gap-2 border border-zinc-600 bg-[#111] px-3 py-2">
            <Search className="h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek op event, datum, bondteam of id..."
              className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-zinc-500"
            />
          </div>

          {canSeeAllBondteams ? (
            <div className="relative min-w-[190px]">
              <select
                value={bondteamFilter}
                onChange={(e) => setBondteamFilter(e.target.value)}
                className="w-full appearance-none border border-zinc-500 bg-[#242424] px-3 py-2 pr-10 text-sm font-black uppercase text-white outline-none focus:border-[#ff4d00]"
              >
                {bondteamOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "ALLE" ? "Alle bondteams" : option}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            </div>
          ) : null}
        </div>

        {melding ? (
          <p className="mx-4 mb-4 border border-red-500 bg-red-950 p-3 text-sm font-bold text-red-100">
            {melding}
          </p>
        ) : null}

        <div className="px-4 pb-5">
          <div className="overflow-x-auto border border-zinc-700">
            <table className="w-full min-w-[1040px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
                  <th className="border border-zinc-700 px-4 py-3">
                    Evenement
                  </th>
                  <th className="border border-zinc-700 px-4 py-3">Datum</th>
                  <th className="border border-zinc-700 px-4 py-3">Bondteam</th>
                  <th className="border border-zinc-700 px-4 py-3">Stadium</th>
                  <th className="border border-zinc-700 px-4 py-3 text-right">
                    Actie
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="border border-zinc-800 px-4 py-8 text-center text-zinc-300"
                    >
                      Laden...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="border border-zinc-800 px-4 py-8 text-center text-zinc-300"
                    >
                      {activeTab === "afgerond"
                        ? "Geen afgeronde matchmakings gevonden."
                        : "Geen actieve matchmakings gevonden."}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => {
                    const darkRow = index % 2 === 1;
                    const matchmakingId = String(row.id ?? "").trim();

                    return (
                      <tr
                        key={matchmakingId}
                        className={
                          darkRow
                            ? "bg-[#202020] text-white"
                            : "bg-[#171717] text-white"
                        }
                      >
                        <td className="border border-zinc-800 px-4 py-3">
                          <b className="text-[#ff4d00]">
                            {safeText(row.naam, "Onbekend evenement")}
                          </b>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                            <span className="inline-flex items-center gap-1">
                              <Swords className="h-3.5 w-3.5" /> Matchmaking
                            </span>
                            <span>ID: {matchmakingId}</span>
                            {row.locatie ? (
                              <span>Locatie: {row.locatie}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="border border-zinc-800 px-4 py-3 font-black">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4 text-[#ff4d00]" />
                            {formatDate(row.datum)}
                          </span>
                        </td>
                        <td className="border border-zinc-800 px-4 py-3">
                          <span
                            className="inline-flex items-center rounded-[4px] px-2 py-1 text-[11px] font-black uppercase"
                            style={getBondteamBadgeStyle(
                              effectiveBondteam(row),
                              true,
                            )}
                          >
                            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                            {safeText(effectiveBondteam(row))}
                          </span>
                        </td>
                        <td className="border border-zinc-800 px-4 py-3 text-xs font-black uppercase tracking-[0.04em] text-zinc-200">
                          {displayStage(row)}
                        </td>
                        <td className="border border-zinc-800 px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/dashboard/officials/controle/${matchmakingId}`,
                                )
                              }
                              className="inline-flex border border-sky-500 bg-sky-700 px-3 py-2 text-xs font-black uppercase text-white"
                            >
                              MM
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/dashboard/officials/weegstation/${matchmakingId}`,
                                )
                              }
                              className="inline-flex border border-[#ff4d00] bg-[#ff4d00] px-3 py-2 text-xs font-black uppercase !text-black"
                            >
                              {activeTab === "afgerond"
                                ? "Inzien"
                                : "Weegstation"}
                            </button>

                            {activeTab === "actief" ? (
                              <button
                                type="button"
                                onClick={() => handleDelete(matchmakingId)}
                                disabled={deletingId === matchmakingId}
                                className="inline-flex items-center border border-red-500 bg-red-700 px-3 py-2 text-xs font-black uppercase text-white disabled:opacity-50"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deletingId === matchmakingId
                                  ? "Wissen..."
                                  : "Wis data"}
                              </button>
                            ) : (
                              <span className="inline-flex items-center border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-black uppercase text-zinc-300">
                                Afgerond · niet wijzigen
                              </span>
                            )}
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
      </section>
    </main>
  );
}
