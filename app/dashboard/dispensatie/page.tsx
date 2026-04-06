"use client";

import React, { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, RefreshCcw, ShieldCheck, ClipboardList, Trash2, Scale } from "lucide-react";

const logoSrc = "/branding/fightsupport/excel-logo.png";
const NVB_ORANGE = "#ff4d00";

type RequestRow = {
  id: string;
  status: string | null;
  matchmaking_id: string | null;
  partij_nr: number | null;
  rule_code: string | null;
  rule?: string | null;
  reason?: string | null;
  evenement_naam?: string | null;
  evenement_datum?: string | null;
};

function safeText(v: unknown) {
  return String(v ?? "").trim();
}

function normStatus(s: any) {
  const x = String(s ?? "").trim().toLowerCase();
  if (x === "open") return "nieuw";
  if (x === "pending") return "pending";
  if (x === "afgehandeld") return "afgehandeld";
  if (!x) return "nieuw";
  return x;
}

function statusLabel(s: any) {
  const x = normStatus(s);
  if (x === "open" || x === "nieuw") return "NIEUW";
  if (x === "afgehandeld") return "AFGEHANDELD";
  return x.toUpperCase();
}

function fmtDateNL(d: string | null | undefined) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

function ruleLabel(r: RequestRow) {
  const rule = String(r.rule ?? "").trim();
  if (rule) return rule;

  const reason = String(r.reason ?? "").trim();
  if (reason) return reason;

  const code = String(r.rule_code ?? "").trim();
  if (!code) return "-";

  const x = code.replace(/_/g, " ").toLowerCase();
  return x ? x.charAt(0).toUpperCase() + x.slice(1) : code;
}

function isDispensatieRow(r: RequestRow) {
  const code = safeText(r.rule_code).toUpperCase();
  const rule = safeText(r.rule).toLowerCase();
  const reason = safeText(r.reason).toLowerCase();
  const combined = `${code} ${rule} ${reason}`.toLowerCase();

  const explicitBlocklist = [
    "licentie ongeldig",
    "keurmerk ongeldig",
    "afkeur",
    "handmatige beoordeling",
    "admin sanctie",
    "naam wijkt af",
    "geen licentie",
  ];

  if (explicitBlocklist.some((x) => combined.includes(x))) return false;

  const exactBlockedCodes = new Set([
    "LICENTIE_ONGELDIG",
    "KEURMERK_ONGELDIG",
    "AFKEUR",
    "HANDMATIGE_BEOORDELING",
    "ADMIN_SANCTIE_NODIG",
    "GEEN_LICENTIE",
    "LICENTIE_ONTBREEKT",
  ]);

  if (exactBlockedCodes.has(code)) return false;

  if (code === "DISPENSATIE_NODIG" || code === "GOEDGEKEURD_MET_DISPENSATIE" || code === "DISPENSATIE") {
    return true;
  }

  return combined.includes("dispensatie");
}

const pageBg: CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at 50% 0%, rgba(255,77,0,0.10) 0%, rgba(255,77,0,0.02) 12%, transparent 26%), linear-gradient(180deg, #06080d 0%, #0a0d12 100%)",
  color: "#fff",
};

const topShell: CSSProperties = {
  border: "1px solid rgba(205,205,215,0.35)",
  borderRadius: 22,
  overflow: "hidden",
  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
  boxShadow: "0 18px 40px rgba(0,0,0,0.34)",
};

const darkHeader: CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(44,46,53,0.98) 0%, rgba(61,63,72,0.96) 26%, rgba(36,38,45,0.98) 50%, rgba(61,63,72,0.96) 74%, rgba(44,46,53,0.98) 100%)",
  borderBottom: `2px solid ${NVB_ORANGE}`,
};

const silverButton: CSSProperties = {
  background:
    "linear-gradient(180deg, #f7f7f8 0%, #cacbd0 18%, #f2f2f3 48%, #9c9ea6 78%, #d8d9dd 100%)",
  border: "1px solid rgba(88,91,100,0.9)",
  color: "#16181d",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), 0 3px 8px rgba(0,0,0,0.18)",
};

const orangeButton: CSSProperties = {
  background: "linear-gradient(180deg, #ff6a00 0%, #ff4d00 58%, #bc3800 100%)",
  border: "1px solid rgba(255,200,160,0.35)",
  color: "#fff",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 6px 14px rgba(255,77,0,0.22)",
};

const contentShell: CSSProperties = {
  marginTop: 14,
  borderRadius: 24,
  overflow: "hidden",
  background: "linear-gradient(180deg, #f1f1f3 0%, #d9dadf 100%)",
  border: "1px solid rgba(115,118,128,0.6)",
  boxShadow: "0 16px 34px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.75)",
};

const lightHeaderCard: CSSProperties = {
  borderRadius: 20,
  border: "1px solid rgba(122,124,132,0.45)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.78), rgba(238,238,241,0.95))",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.78)",
};

const statCard: CSSProperties = {
  borderRadius: 16,
  background: "linear-gradient(180deg, #11171e 0%, #070b11 100%)",
  border: "1px solid rgba(176,180,190,0.14)",
  boxShadow: "0 8px 18px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.05)",
};

const iconBox: CSSProperties = {
  width: 48,
  height: 48,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  background: "linear-gradient(180deg, #ff6a00 0%, #ff4d00 58%, #b73900 100%)",
  color: "#fff",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), 0 6px 12px rgba(255,77,0,0.18)",
};

const tableShell: CSSProperties = {
  borderRadius: 20,
  overflow: "hidden",
  border: "1px solid rgba(86,89,97,0.8)",
  boxShadow: "0 16px 32px rgba(0,0,0,0.12)",
};

export default function DispensatiePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allRows, setAllRows] = useState<RequestRow[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);

  const canDelete = myRole === "admin" || myRole === "superadmin";

  async function getUserRole() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      if (!uid) return setMyRole(null);

      const { data: ur } = await supabase.from("user_roles").select("role_id").eq("user_id", uid);
      const roleIds = (ur ?? []).map((r: any) => Number(r.role_id)).filter(Number.isFinite);
      if (!roleIds.length) return setMyRole(null);

      const { data: roles } = await supabase.from("roles").select("id,name").in("id", roleIds);
      const names = (roles ?? []).map((r: any) => String(r.name ?? "").toLowerCase());

      if (names.includes("superadmin")) return setMyRole("superadmin");
      if (names.includes("dispensatie_admin")) return setMyRole("dispensatie_admin");
      if (names.includes("admin")) return setMyRole("admin");
      return setMyRole(names[0] ?? null);
    } catch {
      setMyRole(null);
    }
  }

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token ?? null;
      if (!token) throw new Error("Niet ingelogd.");

      const r = await fetch("/api/dispensatie/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error ?? "Laden mislukt");

      const rawRows = Array.isArray(j?.rows) ? (j.rows as RequestRow[]) : [];
      setAllRows(rawRows);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRequest(requestId: string) {
    try {
      setError(null);
      if (!canDelete) throw new Error("Geen rechten om te verwijderen.");

      const ok = window.confirm("Dispensatie verwijderen? Dit kan niet ongedaan worden gemaakt.");
      if (!ok) return;

      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token ?? null;
      if (!token) throw new Error("Niet ingelogd.");

      const r = await fetch("/api/dispensatie/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ request_id: requestId }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error ?? "Verwijderen mislukt");
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    getUserRole();
    load();
  }, []);

  const rows = useMemo(() => allRows.filter(isDispensatieRow), [allRows]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { nieuw: 0, open: 0, pending: 0, afgehandeld: 0 };
    for (const r of rows) {
      const key = normStatus(r.status);
      c[key] = (c[key] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  return (
    <main style={pageBg}>
      <div className="mx-auto max-w-[1600px] px-4 py-3 md:px-5 md:py-4">
        <div style={topShell}>
          <div style={darkHeader} className="px-4 py-4 md:px-6 md:py-5">
            <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="inline-flex h-[42px] items-center gap-2 rounded-[8px] px-4 text-sm font-semibold"
                  style={silverButton}
                >
                  <ArrowLeft size={16} strokeWidth={2.4} />
                  Terug naar Menu
                </button>
                <button
                  type="button"
                  onClick={load}
                  className="inline-flex h-[42px] items-center gap-2 rounded-[8px] px-4 text-sm font-bold"
                  style={orangeButton}
                >
                  <RefreshCcw size={16} strokeWidth={2.4} />
                  Ververs
                </button>
              </div>

              <div className="flex justify-center">
                <Image src={logoSrc} alt="FightSupport" width={350} height={90} priority className="h-auto w-auto max-w-full" />
              </div>

              <div className="hidden md:block" />
            </div>
          </div>

          <div style={contentShell}>
            <div className="p-4 md:p-5">
              <div style={lightHeaderCard} className="px-4 py-4 md:px-5 md:py-5">
                <div className="grid items-center gap-3 xl:grid-cols-[1fr_auto]">
                  <div>
                    <h1 className="text-2xl font-extrabold md:text-4xl" style={{ color: NVB_ORANGE }}>
                      Dispensatie Overzicht
                    </h1>
                    <div className="mt-1 text-sm text-[#334155]">Echte dispensatie-aanvragen vanuit controle</div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard icon={<ClipboardList size={20} strokeWidth={2.4} />} label="Nieuw" value={counts.nieuw + counts.open} />
                    <StatCard icon={<ShieldCheck size={20} strokeWidth={2.4} />} label="Pending" value={counts.pending} />
                    <StatCard icon={<Scale size={20} strokeWidth={2.4} />} label="Afgehandeld" value={counts.afgehandeld} />
                    <StatCard icon={<ShieldCheck size={20} strokeWidth={2.4} />} label="Rol" value={myRole ?? "-"} />
                  </div>
                </div>
              </div>

              {error ? (
                <div className="mt-4 rounded-[14px] border border-red-200/60 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm">
                  {error}
                </div>
              ) : null}

              <div className="mt-4" style={tableShell}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[linear-gradient(180deg,#131920_0%,#080c11_100%)] px-4 py-3 text-white">
                  <div className="flex items-center gap-3">
                    <div style={iconBox}>
                      <ShieldCheck size={22} strokeWidth={2.4} />
                    </div>
                    <div>
                      <div className="text-lg font-extrabold">Aanvragen</div>
                      <div className="text-xs text-white/68">Compact overzicht met rustige zebra en subtiele zilveren randen</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={load}
                    className="inline-flex h-[38px] items-center gap-2 rounded-[8px] px-4 text-sm font-bold"
                    style={silverButton}
                  >
                    <RefreshCcw size={14} strokeWidth={2.5} />
                    Ververs lijst
                  </button>
                </div>

                <div className="overflow-x-auto bg-white">
                  <table className="min-w-[1020px] w-full border-collapse">
                    <thead>
                      <tr style={{ background: "linear-gradient(180deg, #ff6200 0%, #ff4d00 100%)" }}>
                        <HeadCell>Status</HeadCell>
                        <HeadCell>Evenement</HeadCell>
                        <HeadCell>Datum</HeadCell>
                        <HeadCell>Partij</HeadCell>
                        <HeadCell>Rule / reden</HeadCell>
                        <HeadCell>Acties</HeadCell>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <BodyCell colSpan={6} muted>Laden...</BodyCell>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <BodyCell colSpan={6} muted>Geen dispensatie-aanvragen.</BodyCell>
                        </tr>
                      ) : (
                        rows.map((r, idx) => {
                          const dark = idx % 2 === 1;
                          return (
                            <tr key={r.id} style={{ background: dark ? "#080808" : "#f3f3f5", color: dark ? "#fff" : "#111" }}>
                              <BodyCell dark={dark}><StatusBadge status={normStatus(r.status)}>{statusLabel(r.status)}</StatusBadge></BodyCell>
                              <BodyCell dark={dark}>{r.evenement_naam ?? "-"}</BodyCell>
                              <BodyCell dark={dark}>{fmtDateNL(r.evenement_datum)}</BodyCell>
                              <BodyCell dark={dark}>{r.partij_nr ?? "-"}</BodyCell>
                              <BodyCell dark={dark}>{ruleLabel(r)}</BodyCell>
                              <BodyCell dark={dark}>
                                <div className="flex flex-wrap gap-2">
                                  <MiniLink href={`/dashboard/dispensatie/${r.id}`} label="Stemmen" dark={dark} />
                                  {r.matchmaking_id && r.partij_nr != null ? (
                                    <MiniLink href={`/dashboard/admin/controle/${r.matchmaking_id}/${r.partij_nr}`} label="Details" dark={dark} />
                                  ) : null}
                                  {canDelete ? (
                                    <button
                                      type="button"
                                      onClick={() => deleteRequest(r.id)}
                                      className="inline-flex h-[36px] items-center gap-2 rounded-[8px] px-3 text-xs font-bold"
                                      style={dark ? { ...orangeButton, height: 36 } : { ...silverButton, height: 36, color: "#8c140c" }}
                                    >
                                      <Trash2 size={14} strokeWidth={2.4} />
                                      Verwijder
                                    </button>
                                  ) : null}
                                </div>
                              </BodyCell>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-4 text-center text-[11px] tracking-[0.22em] text-[#6b7280]">© FIGHTSUPPORT</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={statCard} className="min-w-[170px] p-3">
      <div className="flex items-center gap-3">
        <div style={iconBox}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/65">{label}</div>
          <div className="mt-1 truncate text-2xl font-extrabold text-white">{value}</div>
        </div>
      </div>
    </div>
  );
}

function HeadCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-sm font-extrabold text-white" style={{ borderRight: "1px solid rgba(255,255,255,0.24)" }}>
      {children}
    </th>
  );
}

function BodyCell({ children, colSpan, muted = false, dark = false }: { children: React.ReactNode; colSpan?: number; muted?: boolean; dark?: boolean }) {
  return (
    <td
      colSpan={colSpan}
      className="px-4 py-3 align-middle text-sm"
      style={{
        borderTop: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)",
        borderRight: dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(0,0,0,0.08)",
        color: muted ? (dark ? "rgba(255,255,255,0.68)" : "#6b7280") : undefined,
      }}
    >
      {children}
    </td>
  );
}

function MiniLink({ href, label, dark = false }: { href: string; label: string; dark?: boolean }) {
  return (
    <Link
      href={href}
      className="inline-flex h-[36px] items-center rounded-[8px] px-3 text-xs font-bold"
      style={dark ? { background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)", color: "#fff" } : { background: "#ffffff", border: "1px solid rgba(125,128,138,0.8)", color: "#111" }}
    >
      {label}
    </Link>
  );
}

function StatusBadge({ status, children }: { status: string; children: React.ReactNode }) {
  let style: CSSProperties = { background: "#eceff3", border: "1px solid #c4c9d1", color: "#334155" };

  if (status === "nieuw" || status === "open") {
    style = { background: "#ffedd5", border: "1px solid #fdba74", color: "#c2410c" };
  } else if (status === "pending") {
    style = { background: "#fef3c7", border: "1px solid #fcd34d", color: "#92400e" };
  } else if (status === "afgehandeld") {
    style = { background: "#dcfce7", border: "1px solid #86efac", color: "#166534" };
  }

  return (
    <span className="inline-flex min-h-[28px] items-center rounded-full px-3 text-[11px] font-extrabold uppercase tracking-[0.08em]" style={style}>
      {children}
    </span>
  );
}
