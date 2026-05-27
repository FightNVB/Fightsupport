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
  return String(v ?? "").trim().toUpperCase();
}

function isWeegstationFlow(stadium: unknown, status?: unknown, ownerType?: unknown) {
  const values = [stadium, status].map(normalizeStageKey);
  const owner = String(ownerType ?? "")
    .trim()
    .toLowerCase();

  if (owner === "bondteam" && values.some((v) => v === "naar-weegstation" || v === "klaar-voor-weegstation")) {
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

  const [roleNames, setRoleNames] = useState<RoleName[]>([]);
  const [myBondteam, setMyBondteam] = useState("");

  const canSeeAllBondteams = useMemo(() => {
    return roleNames.includes("superadmin") && normalizeBondteam(myBondteam) === "NVB";
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

      setMelding("Eerdere weegdata verwijderd. De matchmaking staat nog steeds klaar voor weegstation.");
      await loadRows();
    } catch (e: any) {
      setMelding(e?.message ?? "Weegdata verwijderen mislukt.");
    } finally {
      setDeletingId(null);
    }
  }

  const bondteamOptions = useMemo(() => {
    const unique = Array.from(
      new Set<string>(
        rows.map((row) => String(row.bondteam ?? "").trim()).filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "nl"));

    if (canSeeAllBondteams) {
      return ["ALLE", ...unique];
    }

    return myBondteam ? [myBondteam] : [];
  }, [rows, canSeeAllBondteams, myBondteam]);

  const filteredRows = useMemo(() => {
    const q = normalizeSearchText(search);
    const ownBondteam = normalizeBondteam(myBondteam);

    return rows.filter((row) => {
      const rowBondteam = normalizeBondteam(row.bondteam);

      if (canSeeAllBondteams) {
        if (
          bondteamFilter !== "ALLE" &&
          normalizeBondteam(row.bondteam) !== normalizeBondteam(bondteamFilter)
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
          row.bondteam,
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
    <main
      className="min-h-screen px-3 py-4 md:px-5 md:py-5"
      style={pageBgStyle()}
    >
      <div className="mx-auto max-w-[1480px]" style={metalFrameStyle()}>
        <div className="p-3 md:p-4" style={metalInnerStyle()}>
          <div
            className="rounded-[14px] px-4 py-4 text-white shadow-2xl"
            style={darkPanelStyle()}
          >
            <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
              <div className="min-w-0 leading-tight">
                <div
                  className="text-[11px] font-black uppercase tracking-[0.12em]"
                  style={{ color: ORANGE }}
                >
                  Officials portaal
                </div>

                <div className="mt-1 flex items-center gap-2 text-[26px] font-black leading-[1.05] text-white">
                  <Scale className="h-6 w-6" style={{ color: ORANGE }} />
                  <span>WEEGSTATION</span>
                </div>

                <div className="mt-2 text-[13px] font-semibold text-white/75">
                  {canSeeAllBondteams
                    ? "Alle matchmakings die naar weegstation zijn gestuurd"
                    : "Alleen matchmakings van jouw bond die naar weegstation zijn gestuurd"}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="w-full max-w-[440px]">
                  <HeaderLogo />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <div className="min-w-[170px] rounded-[10px] border border-white/10 bg-white/5 px-3 py-2">
                  <div
                    className="text-[10px] font-black uppercase tracking-[0.1em]"
                    style={{ color: ORANGE }}
                  >
                    Toegang
                  </div>
                  <div className="mt-1 text-sm font-black text-white">
                    {roleLabel}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-white/65">
                    Bondteam: {safeText(myBondteam)}
                  </div>
                </div>

                <ActionButton
                  onClick={() => router.push("/dashboard/officials")}
                  tone="silver"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Terug
                </ActionButton>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[18px] p-4" style={silverCardStyle()}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="text-[15px] font-black uppercase tracking-[0.08em] text-zinc-900">
                  Kies matchmaking voor wegen
                </div>
                <div className="text-sm font-semibold text-zinc-600">
                  {canSeeAllBondteams
                    ? "Superadmin NVB ziet alle bondteams"
                    : "Gefilterd op jouw bondteam"}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                <label className="flex min-w-[280px] items-center gap-2 rounded-[8px] border border-black/15 bg-white/80 px-3 py-2">
                  <Search className="h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Zoek op event, datum, bondteam of id..."
                    className="w-full bg-transparent text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-400"
                  />
                </label>

                {canSeeAllBondteams ? (
                  <div className="relative min-w-[180px]">
                    <select
                      value={bondteamFilter}
                      onChange={(e) => setBondteamFilter(e.target.value)}
                      className="w-full appearance-none rounded-[8px] border border-black/15 bg-white/85 px-3 py-2 pr-10 text-sm font-black text-zinc-900 outline-none"
                    >
                      {bondteamOptions.map((option) => (
                        <option key={option} value={option}>
                          {option === "ALLE" ? "Alle bondteams" : option}
                        </option>
                      ))}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  </div>
                ) : null}
              </div>
            </div>

            {melding ? (
              <div
                className="mt-4 rounded-[10px] px-4 py-3 text-sm font-bold"
                style={{
                  background: "#fee2e2",
                  color: "#991b1b",
                  border: "1px solid #fca5a5",
                }}
              >
                {melding}
              </div>
            ) : null}

            <div className="mt-4 overflow-hidden rounded-[16px] border border-black/15">
              <div
                className="grid items-center gap-3 px-4 py-3 text-[11px] font-black uppercase tracking-[0.08em]"
                style={{
                  gridTemplateColumns:
                    "minmax(260px,2fr) 130px 160px 180px 260px",
                  background:
                    "linear-gradient(180deg, #2f323a 0%, #1e2025 100%)",
                  color: "#fff",
                }}
              >
                <div>Evenement</div>
                <div>Datum</div>
                <div>Bondteam</div>
                <div>Stadium</div>
                <div className="text-right">Actie</div>
              </div>

              {loading ? (
                <div className="px-4 py-8 text-center text-sm font-bold text-zinc-600">
                  Laden...
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm font-bold text-zinc-600">
                  Geen matchmakings gevonden.
                </div>
              ) : (
                filteredRows.map((row, index) => {
                  const darkRow = index % 2 === 1;
                  const matchmakingId = String(row.id ?? "").trim();

                  return (
                    <div
                      key={matchmakingId}
                      className="grid items-center gap-3 px-4 py-3"
                      style={{
                        gridTemplateColumns:
                          "minmax(260px,2fr) 130px 160px 180px 260px",
                        background: darkRow
                          ? "linear-gradient(180deg, #3a3f48 0%, #2d3138 100%)"
                          : "linear-gradient(180deg, #ffffff 0%, #eef2f6 100%)",
                        color: darkRow ? "#ffffff" : "#111827",
                        borderTop: "1px solid rgba(0,0,0,0.10)",
                      }}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[18px] font-black">
                          {safeText(row.naam, "Onbekend evenement")}
                        </div>

                        <div
                          className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold"
                          style={{
                            color: darkRow
                              ? "rgba(255,255,255,0.72)"
                              : "#6b7280",
                          }}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Swords className="h-3.5 w-3.5" />
                            Matchmaking
                          </span>

                          <span className="truncate">ID: {matchmakingId}</span>

                          {row.locatie ? (
                            <span className="truncate">
                              Locatie: {row.locatie}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-sm font-black">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" />
                          {formatDate(row.datum)}
                        </span>
                      </div>

                      <div>
                        <span
                          className="inline-flex items-center rounded-[4px] px-2 py-1 text-[11px] font-black uppercase"
                          style={getBondteamBadgeStyle(row.bondteam, darkRow)}
                        >
                          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                          {safeText(row.bondteam)}
                        </span>
                      </div>

                      <div className="text-xs font-black uppercase tracking-[0.04em]">
                        {displayStage(row)}
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <ActionButton
                          onClick={() =>
                            router.push(
                              `/dashboard/officials/weegstation/${matchmakingId}`,
                            )
                          }
                          tone="orange"
                        >
                          Weegstation
                        </ActionButton>

                        <ActionButton
                          onClick={() => handleDelete(matchmakingId)}
                          tone="danger"
                          disabled={deletingId === matchmakingId}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingId === matchmakingId
                            ? "Wissen..."
                            : "Wis data"}
                        </ActionButton>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div
            className="mt-4 text-center"
            style={{
              fontSize: 10,
              letterSpacing: 2,
              color: "rgba(255,255,255,0.34)",
              textTransform: "uppercase",
            }}
          >
            © Fightsupport
          </div>
        </div>
      </div>
    </main>
  );
}
