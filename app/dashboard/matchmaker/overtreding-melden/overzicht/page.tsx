"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import {
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Search,
  Plus,
  FileText,
} from "lucide-react";

const LOGO = "/branding/fightsupport/fightsupport1.png";

type Melding = {
  id: string;
  created_at?: string | null;
  aangemaakt_op?: string | null;
  gemeld_op?: string | null;
  datum_overtreding?: string | null;
  datum?: string | null;
  status?: string | null;
  betrokkene_type?: string | null;
  type?: string | null;
  naam?: string | null;
  betrokkene_naam?: string | null;
  va_nummer?: string | number | null;
  categorie?: string | null;
  ernst?: string | null;
  omschrijving?: string | null;
  beschrijving?: string | null;
  interne_notitie?: string | null;
  bron?: string | null;
  bron_type?: string | null;
  melding_bron?: string | null;
  bondteam?: string | null;
  bron_bondteam?: string | null;
  gemeld_door_bondteam?: string | null;
  aangemaakt_door_bondteam?: string | null;
  melder_naam?: string | null;
  melder_email?: string | null;
  melder_id?: string | null;
  melder_user_id?: string | null;
  aangemaakt_door?: string | null;
  aangemaakt_door_id?: string | null;
  aangemaakt_door_user_id?: string | null;
  gemeld_door?: string | null;
  gemeld_door_id?: string | null;
  gemeld_door_user_id?: string | null;
  user_id?: string | null;
  created_by?: string | null;
  created_by_user_id?: string | null;
  melder_bondteam?: string | null;
  gemeld_door_naam?: string | null;
  gemeld_door_email?: string | null;
  aangemaakt_door_naam?: string | null;
  aangemaakt_door_email?: string | null;
};

function silverButton(extra = "") {
  return [
    "inline-flex items-center justify-center gap-2 border border-zinc-400",
    "bg-gradient-to-b from-[#fafafa] via-[#d9d9dd] to-[#8a8a90]",
    "px-3 py-2 text-xs font-black uppercase !text-black shadow-lg",
    "[&_svg]:!text-black hover:from-white hover:via-zinc-200 hover:to-zinc-400 disabled:opacity-60",
    extra,
  ].join(" ");
}

function darkButton(extra = "") {
  return [
    "inline-flex items-center justify-center gap-2 border border-orange-500/45",
    "bg-black/45 px-3 py-2 text-xs font-black uppercase text-orange-200",
    "hover:border-orange-300 hover:bg-black/70 disabled:opacity-60",
    extra,
  ].join(" ");
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("nl-NL");
}

function naamVan(m: Melding) {
  return m.naam || m.betrokkene_naam || "-";
}

function typeVan(m: Melding) {
  return m.betrokkene_type || m.type || "-";
}

function datumOvertredingVan(m: Melding) {
  return (
    m.datum_overtreding ||
    m.datum ||
    m.aangemaakt_op ||
    m.gemeld_op ||
    m.created_at ||
    null
  );
}

function tekstVan(m: Melding) {
  return m.omschrijving || m.beschrijving || "-";
}

function statusClass(status?: string | null) {
  const s = (status || "open").toLowerCase();
  if (s.includes("afgerond") || s.includes("gesloten"))
    return "border-emerald-400/50 bg-emerald-950/30 text-emerald-100";
  if (s.includes("vervallen"))
    return "border-zinc-500 bg-zinc-900/60 text-zinc-300";
  return "border-orange-400/50 bg-orange-950/30 text-orange-100";
}

function normalizeBondteam(value?: string | null) {
  return (value || "").trim().toUpperCase();
}

function valueFromInterneNotitie(note: string | null | undefined, key: string) {
  const lines = String(note || "").split(/\r?\n/);
  const wanted = key.trim().toUpperCase();

  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;

    const k = line.slice(0, idx).trim().toUpperCase();
    const v = line.slice(idx + 1).trim();

    if (k === wanted) return v;
  }

  return "";
}

function bronVan(m: Melding) {
  return (
    m.bron ||
    m.bron_type ||
    m.melding_bron ||
    valueFromInterneNotitie(m.interne_notitie, "BRON") ||
    ""
  );
}

function melderRolVan(m: Melding) {
  return valueFromInterneNotitie(m.interne_notitie, "MELDER_ROL") || "";
}

function bondteamVan(m: Melding) {
  return (
    m.gemeld_door_bondteam ||
    m.melder_bondteam ||
    m.aangemaakt_door_bondteam ||
    m.bron_bondteam ||
    m.bondteam ||
    valueFromInterneNotitie(m.interne_notitie, "BONDTEAM") ||
    valueFromInterneNotitie(m.interne_notitie, "MELDER_BONDTEAM") ||
    ""
  );
}

function isMatchmakerMelding(m: Melding) {
  const bron = lower(bronVan(m));
  const melderRol = lower(melderRolVan(m));
  return bron === "matchmaker" || melderRol === "matchmaker";
}

function melderNaamVan(m: Melding) {
  return (
    m.gemeld_door_naam ||
    m.melder_naam ||
    m.aangemaakt_door_naam ||
    "Matchmaker"
  );
}

function melderEmailVan(m: Melding) {
  return m.gemeld_door_email || m.melder_email || m.aangemaakt_door_email || "";
}

function melderIdsVan(m: Melding) {
  return [
    m.melder_id,
    m.melder_user_id,
    m.aangemaakt_door,
    m.aangemaakt_door_id,
    m.aangemaakt_door_user_id,
    m.gemeld_door,
    m.gemeld_door_id,
    m.gemeld_door_user_id,
    m.user_id,
    m.created_by,
    m.created_by_user_id,
  ]
    .map(clean)
    .filter(Boolean);
}

function isEigenMelding(m: Melding, userId: string, email?: string | null) {
  const myId = clean(userId);
  const myEmail = lower(email);
  const ids = melderIdsVan(m);

  if (myId && ids.some((id) => id === myId)) return true;

  if (myEmail) {
    const mails = [m.gemeld_door_email, m.melder_email, m.aangemaakt_door_email]
      .map(lower)
      .filter(Boolean);
    if (mails.some((mail) => mail === myEmail)) return true;
  }

  return false;
}

function arraysFromApi(json: any): Melding[] {
  const candidates = [
    json?.items,
    json?.data,
    json?.meldingen,
    json?.cases,
    json?.rows,
    json?.dossiers,
  ];
  const found = candidates.find(Array.isArray);
  return Array.isArray(found) ? found : [];
}

type UserProfile = {
  bondteam: string | null;
  role?: string | null;
  email?: string | null;
};

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function norm(v: unknown) {
  return clean(v).toUpperCase();
}

function lower(v: unknown) {
  return clean(v).toLowerCase();
}

export default function MatchmakersOvertredingenOverzichtPage() {
  const router = useRouter();
  const { user, roles, loading: authLoading } = useAuth();

  const [items, setItems] = useState<Melding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [myBondteam, setMyBondteam] = useState("");
  const [myRole, setMyRole] = useState("");

  const allowed = useMemo(
    () =>
      roles?.some((r) =>
        ["matchmaker", "admin", "superadmin"].includes(
          String(r).toLowerCase(),
        ),
      ) ?? false,
    [roles],
  );

  const authIsSuperadmin = useMemo(
    () => roles?.some((r) => String(r).toLowerCase() === "superadmin") ?? false,
    [roles],
  );

  const isSuperadmin = authIsSuperadmin || lower(myRole) === "superadmin";
  const canSeeAllBonds = isSuperadmin && norm(myBondteam) === "NVB";

  async function loadMyProfile(userId: string, email?: string | null) {
    const byId = await supabase
      .from("user_profiles")
      .select("bondteam, role, email")
      .eq("id", userId)
      .maybeSingle<UserProfile>();

    if (byId.error)
      throw new Error(
        `Profiel ophalen uit user_profiles mislukt: ${byId.error.message}`,
      );
    if (byId.data?.bondteam || byId.data?.role) return byId.data;

    if (email) {
      const byEmail = await supabase
        .from("user_profiles")
        .select("bondteam, role, email")
        .eq("email", email)
        .maybeSingle<UserProfile>();

      if (byEmail.error)
        throw new Error(
          `Profiel ophalen op e-mail mislukt: ${byEmail.error.message}`,
        );
      if (byEmail.data) return byEmail.data;
    }

    return byId.data ?? null;
  }

  async function getSessionToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }

  async function load() {
    if (!user?.id) return;

    setLoading(true);
    setError("");

    try {
      const profile = await loadMyProfile(user.id, user.email);
      const profileBondteam = norm(profile?.bondteam);
      const profileRole = clean(profile?.role);

      setMyBondteam(profileBondteam);
      setMyRole(profileRole);

      const token = await getSessionToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const profileIsSuperadmin =
        lower(profileRole) === "superadmin" ||
        roles?.some((r) => lower(r) === "superadmin");
      const profileCanSeeAllBonds =
        profileIsSuperadmin && profileBondteam === "NVB";

      const adminEndpoints = [
        "/api/admin/algemeen/overtredingen?bron=matchmaker",
        "/api/admin/overtredingen?bron=matchmaker",
      ];
      const matchmakerEndpoints = [
        "/api/matchmaker/overtredingen?naar_admin=1&include_admin=1",
        "/api/matchmaker/overtredingen",
      ];
      const endpoints =
        profileIsSuperadmin ||
        roles?.some((r) => ["admin", "superadmin"].includes(lower(r)))
          ? [...adminEndpoints, ...matchmakerEndpoints]
          : [...matchmakerEndpoints, ...adminEndpoints];

      let loaded: Melding[] = [];
      let warning = "";
      let lastError = "";
      let success = false;

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, { cache: "no-store", headers });
          const json = await res.json().catch(() => null);

          if (!res.ok || json?.ok === false) {
            lastError =
              json?.error || `Meldingen laden mislukt via ${endpoint}`;
            continue;
          }

          success = true;
          warning = json?.warning || "";
          loaded = arraysFromApi(json);
          break;
        } catch (e: any) {
          lastError = e?.message || "Meldingen laden mislukt.";
        }
      }

      const roleList = roles ?? [];
      const isAdminLike =
        profileIsSuperadmin ||
        roleList.some((r) => ["admin", "superadmin"].includes(lower(r)));

      const scoped = isAdminLike
        ? loaded
        : loaded.filter((m) => isEigenMelding(m, user.id, user.email));

      setItems(scoped);

      if (!success) {
        setError(lastError || "Meldingen laden mislukt.");
      } else if (warning) {
        setError(warning);
      } else {
        setError("");
      }
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Meldingen laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) return void router.replace("/login");
    if (!allowed) return void router.replace("/dashboard");
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, allowed, router, roles]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((x) =>
      [
        naamVan(x),
        typeVan(x),
        x.va_nummer,
        x.categorie,
        x.ernst,
        x.status,
        tekstVan(x),
        melderNaamVan(x),
        melderEmailVan(x),
        bondteamVan(x),
        bronVan(x),
        melderRolVan(x),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [items, q]);

  const openCount = filtered.filter(
    (m) =>
      !(m.status || "open").toLowerCase().match(/afgerond|gesloten|vervallen/),
  ).length;
  const ernstigCount = filtered.filter((m) =>
    ["hoog", "ernstig"].includes((m.ernst || "").toLowerCase()),
  ).length;

  return (
    <main
      className="min-h-screen px-4 py-6 print:bg-white print:px-0 print:py-0"
      style={{ background: "#eef0f3" }}
    >
      <div className="mx-auto w-full max-w-[1650px] print:max-w-none">
        <div
          className="no-print rounded-[32px] p-[6px]"
          style={{
            background:
              "linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 22%, #8f8f8f 55%, #f0f0f0 100%)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.7), 0 22px 70px rgba(0,0,0,0.9)",
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
            <header
              className="px-6 py-5"
              style={{
                background: "linear-gradient(180deg, #3a3a3f 0%, #2a2a2e 100%)",
                borderBottom: "3px solid rgba(255,77,0,0.55)",
              }}
            >
              <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto_1fr]">
                <div className="justify-self-start">
                  <div
                    className="font-extrabold uppercase"
                    style={{
                      fontSize: 28,
                      letterSpacing: "0.04em",
                      color: "#ff4d00",
                    }}
                  >
                    Matchmaker · Overzicht meldingen
                  </div>
                  <div className="mt-1 max-w-2xl text-sm text-white/85">
                    {isSuperadmin
                      ? "Superadmin: alle meldingen zichtbaar."
                      : "Matchmaker-meldingen die naar admin zijn gestuurd. Je ziet alleen je eigen meldingen."}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href="/dashboard/matchmaker"
                      className={silverButton()}
                    >
                      <ArrowLeft size={14} /> Terug naar matchmaker
                    </Link>
                    <Link
                      href="/dashboard/matchmaker/overtreding-melden"
                      className={darkButton()}
                    >
                      <Plus size={14} /> Nieuwe melding
                    </Link>
                  </div>
                </div>
                <div className="justify-self-center">
                  <div className="relative h-[90px] w-[260px]">
                    <Image
                      src={LOGO}
                      alt="FightSupport"
                      fill
                      priority
                      className="object-contain"
                      sizes="260px"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Link
                    href="/dashboard/matchmaker/overtreding-melden/rapport"
                    className={silverButton()}
                  >
                    <FileText size={14} /> Rapport
                  </Link>
                  <button
                    onClick={load}
                    disabled={loading}
                    className={darkButton()}
                  >
                    <RefreshCw size={14} /> Ververs
                  </button>
                </div>
              </div>
            </header>

            <div className="px-4 py-6 md:px-6">
              <div className="grid gap-3 md:grid-cols-6">
                {[
                  ["Account", user?.email || myBondteam || "-"],
                  ["Rol", myRole || roles?.join(", ") || "-"],
                  ["Totaal", items.length],
                  ["Gefilterd", filtered.length],
                  ["Open/actief", openCount],
                  ["Hoog/ernstig", ernstigCount],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-zinc-700/30 bg-[#242428] p-3 text-white shadow-inner"
                  >
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
                      {label}
                    </div>
                    <div className="mt-1 text-2xl font-black text-[#ff4d00]">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {error ? (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-400/50 bg-red-950/90 p-4 text-sm font-bold text-red-100">
                  <AlertTriangle size={16} /> {error}
                </div>
              ) : null}

              <div
                className="mt-4 rounded-2xl border p-3"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(239,242,246,0.98) 100%)",
                  borderColor: "rgba(90,90,95,0.22)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 24px rgba(0,0,0,0.08)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Search size={17} className="text-[#ff4d00]" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Zoeken op naam, VA, categorie, status, melder..."
                    className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none focus:border-[#ff4d00]"
                  />
                </div>
              </div>

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
                  <table className="min-w-full border-collapse text-sm">
                    <thead
                      style={{
                        background:
                          "linear-gradient(180deg, #ff6a00 0%, #ff5400 100%)",
                        color: "#fff",
                        borderBottom: "2px solid rgba(255,255,255,0.35)",
                      }}
                    >
                      <tr>
                        <th className="px-3 py-2 text-left">Datum</th>
                        <th className="px-3 py-2 text-left">Ingediend</th>
                        <th className="px-3 py-2 text-left">Betrokkene</th>
                        <th className="px-3 py-2 text-left">Categorie</th>
                        <th className="px-3 py-2 text-left">Ernst</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Melder</th>
                        <th className="px-3 py-2 text-left">Bondteam/bron</th>
                        <th className="px-3 py-2 text-left">Omschrijving</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="bg-white p-8 text-center font-bold text-zinc-500"
                          >
                            Meldingen laden...
                          </td>
                        </tr>
                      ) : filtered.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="bg-white p-8 text-center font-bold text-zinc-500"
                          >
                            Geen meldingen gevonden.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((m, i) => {
                          const zebra = i % 2 === 0;
                          return (
                            <tr
                              key={m.id}
                              style={{
                                backgroundColor: zebra ? "#ffffff" : "#0d0d0d",
                                color: zebra ? "#000" : "#fff",
                              }}
                            >
                              <td className="px-3 py-2 font-black">
                                {fmtDate(datumOvertredingVan(m))}
                              </td>
                              <td className="px-3 py-2">
                                {fmtDate(
                                  m.aangemaakt_op ||
                                    m.gemeld_op ||
                                    m.created_at,
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div
                                  className="font-black"
                                  style={{ color: "#ff4d00" }}
                                >
                                  {naamVan(m)}
                                </div>
                                <div className="text-[11px] uppercase opacity-70">
                                  {typeVan(m)}
                                  {m.va_nummer ? ` · VA ${m.va_nummer}` : ""}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                {m.categorie || "-"}
                              </td>
                              <td className="px-3 py-2">
                                <span className="border border-orange-500/40 bg-orange-950/30 px-2 py-1 text-[10px] font-black uppercase text-orange-200">
                                  {m.ernst || "-"}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`border px-2 py-1 text-[10px] font-black uppercase ${statusClass(m.status)}`}
                                >
                                  {m.status || "open"}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <div className="font-bold">
                                  {melderNaamVan(m)}
                                </div>
                                <div className="text-[11px] opacity-70">
                                  {melderEmailVan(m) || melderRolVan(m) || "-"}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div
                                  className="font-black"
                                  style={{ color: "#ff4d00" }}
                                >
                                  {bondteamVan(m) || "Geen bondteam"}
                                </div>
                                <div className="text-[11px] uppercase opacity-70">
                                  {bronVan(m) || "-"}
                                </div>
                              </td>
                              <td className="max-w-xl px-3 py-2">
                                {tekstVan(m)}
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
          </div>
        </div>
      </div>
    </main>
  );
}
