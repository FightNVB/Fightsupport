"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import NvbLightButton from "@/components/NvbLightButton";

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
  return dt.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function ruleLabel(r: RequestRow) {
  const rule = String((r.rule ?? "")).trim();
  if (rule) return rule;

  const reason = String((r.reason ?? "")).trim();
  if (reason) return reason;

  const code = String((r.rule_code ?? "")).trim();
  if (!code) return "-";

  const x = code.replace(/_/g, " ").toLowerCase();
  return x ? x.charAt(0).toUpperCase() + x.slice(1) : code;
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl px-4 py-4"
      style={{
        background: "linear-gradient(180deg, #f4f4f4 0%, #dfdfdf 100%)",
        border: "2px solid #3f3f3f",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85), 0 10px 28px rgba(0,0,0,0.18)",
      }}
    >
      <div className="text-xs uppercase tracking-widest text-black/60">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-black">{value}</div>
    </div>
  );
}

export default function DispensatiePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);

  const canDelete = myRole === "admin" || myRole === "superadmin";

  async function getUserRole() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      if (!uid) return setMyRole(null);

      const { data: ur } = await supabase.from("user_roles").select("role_id").eq("user_id", uid);
      const roleIds = (ur ?? []).map((r: any) => Number(r.role_id)).filter(Number.isFinite);
      if (roleIds.length === 0) return setMyRole(null);

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error ?? "Laden mislukt");

      setRows((j?.rows ?? []) as RequestRow[]);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setRows([]);
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { nieuw: 0, open: 0, pending: 0, afgehandeld: 0 };
    for (const r of rows) c[normStatus(r.status)] = (c[normStatus(r.status)] ?? 0) + 1;
    return c;
  }, [rows]);

  return (
    <main
      className="min-h-screen px-4 py-6"
      style={{
        background:
          "radial-gradient(1200px 700px at 50% 0%, rgba(255,255,255,0.90), rgba(235,235,235,0.96) 55%, rgba(225,225,225,1) 100%)",
      }}
    >
      <div className="mx-auto w-full max-w-[1200px]">
        {/* OUTER FRAME – dikker staal */}
        <div
          className="rounded-[32px] p-[6px]"
          style={{
            background: "linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 22%, #8f8f8f 55%, #f0f0f0 100%)",
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.7),
              0 22px 70px rgba(0,0,0,0.35)
            `,
          }}
        >
          <div
            className="relative rounded-[28px]"
            style={{
              background: "linear-gradient(180deg, #f2f2f2 0%, #e6e6e6 100%)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            {/* TOPBAR */}
            <div
              className="px-6 py-5 rounded-t-[28px]"
              style={{
                background: "linear-gradient(180deg, #3b3b3b 0%, #2f2f2f 100%)",
                borderBottom: "2px solid rgba(0,0,0,0.25)",
              }}
            >
              <div className="grid grid-cols-3 items-center gap-4">
                {/* links: tekst (FIGHTSUPPORT groter) */}
                <div className="justify-self-start leading-tight">
                  <div
                    className="font-extrabold tracking-[0.20em]"
                    style={{
                      color: NVB_ORANGE,
                      fontSize: 14, // ✅ groter
                      letterSpacing: "0.22em",
                    }}
                  >
                    FIGHTSUPPORT
                  </div>
                  <div className="text-xs text-white/70">Vechtsport ondersteuning</div>
                </div>

                {/* midden: logo met dikkere zilveren rand */}
                <div className="justify-self-center">
                  <div
                    className="rounded-[28px] p-[6px]"
                    style={{
                      background:
                        "linear-gradient(180deg, #f5f5f5 0%, #cfcfcf 35%, #8f8f8f 65%, #f0f0f0 100%)",
                      boxShadow: `
                        0 0 0 1px rgba(255,255,255,0.70),
                        0 12px 28px rgba(0,0,0,0.70)
                      `,
                    }}
                  >
                    <div
                      className="rounded-[22px] p-3"
                      style={{
                        background: "linear-gradient(180deg, rgba(12,12,12,0.96), rgba(4,4,4,0.96))",
                        border: "3px solid rgba(220,220,220,0.50)", // ✅ duidelijker rand
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
                      }}
                    >
                      <Image
                        src="/branding/fightsupport/logo-dark.png"
                        alt="FightSupport"
                        width={120}
                        height={120}
                        priority
                      />
                    </div>
                  </div>
                </div>

                {/* rechts: acties (Dashboard knop kleiner) */}
                <div className="justify-self-end flex items-center gap-2">
                  <button
                    type="button"
                    onClick={load}
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                  >
                    Ververs
                  </button>

                  {/* ✅ maak NvbLightButton compacter zonder component-wijziging */}
                  <div style={{ transform: "scale(0.88)", transformOrigin: "right center" }}>
                    <NvbLightButton label="Naar dashboard" onClick={() => router.push("/dashboard")} />
                  </div>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="px-6 py-7">
              {/* titel */}
              <div className="mt-4 text-center">
                <h1 className="text-4xl font-extrabold" style={{ color: NVB_ORANGE }}>
                  Dispensatie Portaal
                </h1>
                <p className="mt-1 text-sm text-black/60">Alle benodigde dispensaties (via Controle)</p>
              </div>

              {/* cards */}
              <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-4">
                <StatCard label="Nieuw" value={counts.nieuw + counts.open} />
                <StatCard label="Pending" value={counts.pending} />
                <StatCard label="Afgehandeld" value={counts.afgehandeld} />
                <StatCard label="Rol" value={myRole ?? "-"} />
              </div>

              {error ? (
                <div className="mt-5 rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {/* TABLE */}
              <div
                className="mt-6 overflow-hidden rounded-2xl"
                style={{
                  border: "2px solid rgba(60,60,60,0.28)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(235,235,235,0.92))",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 26px rgba(0,0,0,0.12)",
                }}
              >
                <div className="h-[3px]" style={{ background: "rgba(255,77,0,0.75)" }} />

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead
                      style={{
                        background: "linear-gradient(180deg, #3a3a3a 0%, #2e2e2e 100%)",
                        color: "#fff",
                      }}
                    >
                      <tr className="text-left">
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Evenement</th>
                        <th className="py-3 px-4">Partij</th>
                        <th className="py-3 px-4">Rule</th>
                        <th className="py-3 px-4">Actie</th>
                      </tr>
                    </thead>

                    <tbody className="[&>tr:nth-child(odd)]:bg-[#f1f1f1] [&>tr:nth-child(even)]:bg-[#e6e6e6] text-black">
                      {loading ? (
                        <tr>
                          <td className="py-3 px-4 opacity-70" colSpan={5}>
                            Laden...
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td className="py-3 px-4 opacity-70" colSpan={5}>
                            Geen dispensatie-aanvragen.
                          </td>
                        </tr>
                      ) : (
                        rows.map((r, idx) => {
                          const pillCls =
                            "border border-black/15 bg-white/55 text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]";
                          const eventLabel = `${r.evenement_naam ?? "-"} • ${fmtDateNL(r.evenement_datum)}`;

                          return (
                            <tr key={r.id}>
                              <td className="py-3 px-4">
                                <span className={`rounded px-2 py-1 text-xs font-extrabold ${pillCls}`}>
                                  {statusLabel(r.status)}
                                </span>
                              </td>

                              <td className="py-3 px-4">{eventLabel}</td>
                              <td className="py-3 px-4">{r.partij_nr ?? "-"}</td>

                              <td className="py-3 px-4">
                                <span className="text-black/80">{ruleLabel(r)}</span>
                              </td>

                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/dashboard/dispensatie/${r.id}`}
                                    className="inline-flex items-center rounded px-3 py-1 text-xs font-semibold border border-black/20 bg-white/65 text-black hover:bg-white"
                                  >
                                    Stemmen →
                                  </Link>

                                  {r.matchmaking_id && r.partij_nr != null ? (
                                    <Link
                                      href={`/dashboard/admin/controle/${r.matchmaking_id}/${r.partij_nr}`}
                                      className="inline-flex items-center rounded px-3 py-1 text-xs font-semibold border border-black/20 bg-white/65 text-black hover:bg-white"
                                    >
                                      Details →
                                    </Link>
                                  ) : null}

                                  {canDelete ? (
                                    <button
                                      type="button"
                                      onClick={() => deleteRequest(r.id)}
                                      className="inline-flex items-center rounded px-3 py-1 text-xs font-semibold border border-red-700/25 bg-red-600/15 text-red-800 hover:bg-red-600/20"
                                    >
                                      Verwijder
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
              </div>

              <p className="mt-7 text-xs text-center text-black/40">© FightSupport</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}