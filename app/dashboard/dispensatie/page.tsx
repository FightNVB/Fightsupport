"use client";

import React, { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  RefreshCcw,
  ShieldCheck,
  ClipboardList,
  Trash2,
  Scale,
} from "lucide-react";

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
  const x = String(s ?? "")
    .trim()
    .toLowerCase();
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

  if (
    code === "DISPENSATIE_NODIG" ||
    code === "GOEDGEKEURD_MET_DISPENSATIE" ||
    code === "DISPENSATIE"
  ) {
    return true;
  }

  return combined.includes("dispensatie");
}

function Badge({
  children,
  type = "default",
}: {
  children: React.ReactNode;
  type?: string;
}) {
  const cls =
    type === "ok"
      ? "border-green-500/50 bg-green-500/10 text-green-300"
      : type === "bad"
        ? "border-red-500/50 bg-red-500/10 text-red-300"
        : type === "warn"
          ? "border-[#ff4d00]/70 bg-[#ff4d00]/10 text-[#ff7a33]"
          : "border-zinc-600 bg-[#242424] text-zinc-200";

  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-xs font-black uppercase tracking-wide ${cls}`}
    >
      {children}
    </span>
  );
}

function statusType(status: string) {
  if (status === "afgehandeld") return "ok";
  if (status === "pending") return "warn";
  if (status === "nieuw" || status === "open") return "warn";
  return "default";
}

function SilverButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border border-zinc-300 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function OrangeButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border border-[#ff4d00] bg-[#ff4d00] px-4 py-2 text-sm font-black uppercase !text-black shadow-lg shadow-black/30 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function MiniLink({
  href,
  label,
  dark,
}: {
  href: string;
  label: string;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-block border px-3 py-1 text-xs font-black uppercase ${
        dark
          ? "border-zinc-300 bg-white !text-black"
          : "border-zinc-400 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 !text-black"
      }`}
    >
      {label}
    </Link>
  );
}

function csvCell(v: unknown) {
  const s = String(v ?? "").replaceAll('"', '""');
  return `"${s}"`;
}

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

      const { data: ur } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", uid);
      const roleIds = (ur ?? [])
        .map((r: any) => Number(r.role_id))
        .filter(Number.isFinite);
      if (!roleIds.length) return setMyRole(null);

      const { data: roles } = await supabase
        .from("roles")
        .select("id,name")
        .in("id", roleIds);
      const names = (roles ?? []).map((r: any) =>
        String(r.name ?? "").toLowerCase(),
      );

      if (names.includes("superadmin")) return setMyRole("superadmin");
      if (names.includes("dispensatie_admin"))
        return setMyRole("dispensatie_admin");
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

      const ok = window.confirm(
        "Dispensatie verwijderen? Dit kan niet ongedaan worden gemaakt.",
      );
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

  function downloadCsv() {
    const header = ["Status", "Evenement", "Datum", "Partij", "Rule / reden"];
    const lines = rows.map((r) =>
      [
        statusLabel(r.status),
        r.evenement_naam,
        fmtDateNL(r.evenement_datum),
        r.partij_nr,
        ruleLabel(r),
      ]
        .map(csvCell)
        .join(";"),
    );
    const csv = ["sep=;", header.map(csvCell).join(";"), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dispensatie-overzicht.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    getUserRole();
    load();
  }, []);

  const rows = useMemo(() => allRows.filter(isDispensatieRow), [allRows]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      nieuw: 0,
      open: 0,
      pending: 0,
      afgehandeld: 0,
    };
    for (const r of rows) {
      const key = normStatus(r.status);
      c[key] = (c[key] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  return (
    <main className="min-h-screen bg-[#2b2b2b] p-6 text-white">
      <section className="mx-auto max-w-7xl border border-zinc-500 bg-[#121212] shadow-2xl">
        <header className="border-b border-zinc-600 bg-gradient-to-r from-[#1d1d1d] via-[#303030] to-[#151515] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#ff4d00]">
                FightSupport Admin / Dispensatie
              </p>
              <h1 className="text-2xl font-black uppercase">
                Dispensatie overzicht
              </h1>
              <p className="mt-1 text-sm text-zinc-300">
                Echte dispensatie-aanvragen vanuit de controleflow.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <SilverButton onClick={() => router.push("/dashboard")}>
                ← Terug naar menu
              </SilverButton>
              <OrangeButton onClick={load} disabled={loading}>
                {loading ? "Laden..." : "Ververs"}
              </OrangeButton>
              <SilverButton onClick={downloadCsv} disabled={rows.length === 0}>
                Excel download
              </SilverButton>
            </div>
          </div>
        </header>

        <div className="grid gap-3 border-b border-zinc-700 p-4 md:grid-cols-4">
          <Stat
            title="Nieuw"
            value={(counts.nieuw || 0) + (counts.open || 0)}
            tone="warn"
          />
          <Stat title="Pending" value={counts.pending || 0} tone="warn" />
          <Stat title="Afgehandeld" value={counts.afgehandeld || 0} tone="ok" />
          <Stat title="Rol" value={myRole ?? "-"} tone="default" />
        </div>

        {error && (
          <div className="m-4 border border-red-500 bg-red-950/60 p-3 text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        <div className="overflow-x-auto p-4">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#252525] text-left text-xs uppercase text-zinc-300">
              <tr>
                <th className="border border-zinc-700 p-2">Status</th>
                <th className="border border-zinc-700 p-2">Evenement</th>
                <th className="border border-zinc-700 p-2">Datum</th>
                <th className="border border-zinc-700 p-2">Partij</th>
                <th className="border border-zinc-700 p-2">Rule / reden</th>
                <th className="border border-zinc-700 p-2 text-right">
                  Acties
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr className="bg-[#171717]">
                  <td
                    colSpan={6}
                    className="border border-zinc-800 p-4 text-zinc-300"
                  >
                    Laden...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr className="bg-[#171717]">
                  <td
                    colSpan={6}
                    className="border border-zinc-800 p-4 text-zinc-300"
                  >
                    Geen dispensatie-aanvragen gevonden.
                  </td>
                </tr>
              ) : (
                rows.map((r, index) => {
                  const dark = index % 2 === 1;
                  const st = normStatus(r.status);
                  return (
                    <tr
                      key={r.id}
                      style={{
                        backgroundColor: dark ? "#171717" : "#ffffff",
                        color: dark ? "#ffffff" : "#000000",
                      }}
                    >
                      <td className="border border-zinc-800 p-2">
                        <Badge type={statusType(st)}>
                          {statusLabel(r.status)}
                        </Badge>
                      </td>
                      <td className="border border-zinc-800 p-2">
                        <b style={{ color: NVB_ORANGE }}>
                          {r.evenement_naam ?? "-"}
                        </b>
                      </td>
                      <td className="border border-zinc-800 p-2">
                        {fmtDateNL(r.evenement_datum)}
                      </td>
                      <td className="border border-zinc-800 p-2 font-bold">
                        {r.partij_nr ?? "-"}
                      </td>
                      <td className="border border-zinc-800 p-2">
                        {ruleLabel(r)}
                      </td>
                      <td className="border border-zinc-800 p-2 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <MiniLink
                            href={`/dashboard/dispensatie/${r.id}`}
                            label="Stemmen"
                            dark={dark}
                          />
                          {r.matchmaking_id && r.partij_nr != null ? (
                            <MiniLink
                              href={`/dashboard/matchmaker/matchmaking/${r.matchmaking_id}/partij/${r.partij_nr}`}
                              label="Partij detail"
                              dark={dark}
                            />
                          ) : null}
                          {r.matchmaking_id ? (
                            <MiniLink
                              href={`/dashboard/admin/controle/${r.matchmaking_id}`}
                              label="Controle"
                              dark={dark}
                            />
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => deleteRequest(r.id)}
                              className="inline-flex border border-red-400 bg-red-900 px-3 py-1 text-xs font-black uppercase text-white"
                            >
                              <Trash2 size={14} /> Verwijder
                            </button>
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
      </section>
    </main>
  );
}

function Stat({
  title,
  value,
  tone,
}: {
  title: string;
  value: React.ReactNode;
  tone: "ok" | "warn" | "default";
}) {
  const color =
    tone === "ok"
      ? "text-green-300"
      : tone === "warn"
        ? "text-[#ff4d00]"
        : "text-zinc-200";
  return (
    <div className="border border-zinc-600 bg-[#1c1c1c] p-3">
      <b className={`block truncate text-xl ${color}`}>{value}</b>
      <p className="text-xs uppercase text-zinc-400">{title}</p>
    </div>
  );
}
