"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { ArrowLeft, AlertTriangle, RefreshCw, ShieldAlert, Search, Plus, FileText } from "lucide-react";

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
  return m.datum_overtreding || m.datum || m.aangemaakt_op || m.gemeld_op || m.created_at || null;
}

function tekstVan(m: Melding) {
  return m.omschrijving || m.beschrijving || "-";
}

function statusClass(status?: string | null) {
  const s = (status || "open").toLowerCase();
  if (s.includes("afgerond") || s.includes("gesloten")) return "border-emerald-400/50 bg-emerald-950/30 text-emerald-100";
  if (s.includes("vervallen")) return "border-zinc-500 bg-zinc-900/60 text-zinc-300";
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
  return m.gemeld_door_naam || m.melder_naam || m.aangemaakt_door_naam || "Matchmaker";
}

function melderEmailVan(m: Melding) {
  return m.gemeld_door_email || m.melder_email || m.aangemaakt_door_email || "";
}

function arraysFromApi(json: any): Melding[] {
  const candidates = [json?.items, json?.data, json?.meldingen, json?.cases, json?.rows, json?.dossiers];
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
    () => roles?.some((r) => ["matchmaker", "hoofdmatchmaker", "admin", "superadmin"].includes(String(r).toLowerCase())) ?? false,
    [roles]
  );

  const authIsSuperadmin = useMemo(
    () => roles?.some((r) => String(r).toLowerCase() === "superadmin") ?? false,
    [roles]
  );

  const isSuperadmin = authIsSuperadmin || lower(myRole) === "superadmin";
  const canSeeAllBonds = isSuperadmin && norm(myBondteam) === "NVB";

  async function loadMyProfile(userId: string, email?: string | null) {
    const byId = await supabase
      .from("user_profiles")
      .select("bondteam, role, email")
      .eq("id", userId)
      .maybeSingle<UserProfile>();

    if (byId.error) throw new Error(`Profiel ophalen uit user_profiles mislukt: ${byId.error.message}`);
    if (byId.data?.bondteam || byId.data?.role) return byId.data;

    if (email) {
      const byEmail = await supabase
        .from("user_profiles")
        .select("bondteam, role, email")
        .eq("email", email)
        .maybeSingle<UserProfile>();

      if (byEmail.error) throw new Error(`Profiel ophalen op e-mail mislukt: ${byEmail.error.message}`);
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

      if (!profileBondteam) {
        setItems([]);
        setError("Geen bondteam gevonden in user_profiles. Controleer of dit account in user_profiles een bondteam heeft.");
        setLoading(false);
        return;
      }

      const token = await getSessionToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const profileIsSuperadmin = lower(profileRole) === "superadmin" || roles?.some((r) => lower(r) === "superadmin");
      const profileCanSeeAllBonds = profileIsSuperadmin && profileBondteam === "NVB";

      const adminEndpoints = [
        "/api/admin/algemeen/overtredingen?bron=matchmaker",
        "/api/admin/overtredingen?bron=matchmaker",
      ];
      const matchmakerEndpoints = [
        "/api/matchmaker/overtredingen?naar_admin=1&include_admin=1",
        "/api/matchmaker/overtredingen",
      ];
      const endpoints = profileIsSuperadmin || roles?.some((r) => ["admin", "superadmin"].includes(lower(r)))
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
            lastError = json?.error || `Meldingen laden mislukt via ${endpoint}`;
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

      const scoped = profileCanSeeAllBonds
        ? loaded
        : loaded.filter((m) => {
            const itemBondteam = norm(bondteamVan(m));

            // Oude/matchmaker meldingen hebben soms nog geen bondteam-kolom gevuld.
            // Die mogen niet verdwijnen uit het matchmakers-overzicht als BRON/MELDER_ROL matchmaker is.
            if (!itemBondteam && isMatchmakerMelding(m)) return true;

            return itemBondteam === profileBondteam;
          });

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
        .includes(needle)
    );
  }, [items, q]);

  const openCount = filtered.filter((m) => !(m.status || "open").toLowerCase().match(/afgerond|gesloten|vervallen/)).length;
  const ernstigCount = filtered.filter((m) => ["hoog", "ernstig"].includes((m.ernst || "").toLowerCase())).length;

  return (
    <main className="min-h-screen bg-[#171514] text-zinc-100 print:bg-white print:text-black">
      <div className="mx-auto max-w-7xl px-4 py-4 print:max-w-none print:px-0 print:py-0">
        <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/matchmaker" className={silverButton()}>
              <ArrowLeft size={14} /> Terug naar matchmaker
            </Link>
            <Link href="/dashboard/matchmaker/overtreding-melden" className={darkButton()}>
              <Plus size={14} /> Nieuwe melding
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/matchmaker/overtreding-melden/rapport" className={silverButton()}>
              <FileText size={14} /> Rapport
            </Link>
            <button onClick={load} disabled={loading} className={darkButton()}>
              <RefreshCw size={14} /> Verversen
            </button>
          </div>
        </div>

        <header className="no-print mb-4 overflow-hidden border border-zinc-500/50 bg-gradient-to-br from-[#2b2825] via-[#171514] to-[#101010] shadow-xl">
          <div className="border-b border-orange-500/40 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-1 inline-flex items-center gap-2 border border-orange-500/50 bg-black/40 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">
                  <ShieldAlert size={13} /> FightSupport Matchmaker
                </div>
                <h1 className="text-xl font-black uppercase tracking-wide text-white">Overzicht meldingen</h1>
                <p className="mt-1 max-w-3xl text-xs font-semibold text-zinc-300">
                  {canSeeAllBonds ? "NVB superadmin: alle bondteams zichtbaar." : `Meldingen die naar admin zijn gestuurd. Alleen meldingen van bondteam ${myBondteam || "-"}.`}
                </p>
              </div>
              <div className="relative h-12 w-44">
                <Image src={LOGO} alt="FightSupport" fill priority className="object-contain" sizes="176px" />
              </div>
            </div>
          </div>
          <div className="grid gap-2 p-3 md:grid-cols-6">
            <div className="border border-zinc-600/70 bg-black/35 p-2"><div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Bondteam</div><div className="mt-1 text-sm font-black text-orange-300">{myBondteam || "-"}</div></div>
            <div className="border border-zinc-600/70 bg-black/35 p-2"><div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Rol</div><div className="mt-1 text-sm font-black text-orange-300">{myRole || roles?.join(", ") || "-"}</div></div>
            <div className="border border-zinc-600/70 bg-black/35 p-2"><div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Totaal</div><div className="mt-1 text-sm font-black text-orange-300">{items.length}</div></div>
            <div className="border border-zinc-600/70 bg-black/35 p-2"><div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Gefilterd</div><div className="mt-1 text-sm font-black text-white">{filtered.length}</div></div>
            <div className="border border-zinc-600/70 bg-black/35 p-2"><div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Open/actief</div><div className="mt-1 text-sm font-black text-zinc-200">{openCount}</div></div>
            <div className="border border-zinc-600/70 bg-black/35 p-2"><div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Hoog/ernstig</div><div className="mt-1 text-sm font-black text-zinc-200">{ernstigCount}</div></div>
          </div>
        </header>

        {error ? <div className="no-print mb-3 flex items-center gap-2 border border-red-400/50 bg-red-950/40 p-3 text-sm font-bold text-red-100"><AlertTriangle size={16} /> {error}</div> : null}

        <div className="no-print mb-3 flex items-center gap-2 border border-zinc-600 bg-black/40 px-3 py-1">
          <Search size={15} className="text-orange-300" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoeken op naam, VA, categorie, status, melder..." className="w-full bg-transparent p-2 text-xs font-semibold text-white outline-none placeholder:text-zinc-500" />
        </div>

        <section className="no-print overflow-hidden border border-orange-500/35 bg-[#211f1d] shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-black/60 text-[10px] uppercase tracking-wider text-orange-300">
                <tr>
                  <th className="border-b border-zinc-700 p-2 text-left">Datum</th>
                  <th className="border-b border-zinc-700 p-2 text-left">Ingediend</th>
                  <th className="border-b border-zinc-700 p-2 text-left">Betrokkene</th>
                  <th className="border-b border-zinc-700 p-2 text-left">Categorie</th>
                  <th className="border-b border-zinc-700 p-2 text-left">Ernst</th>
                  <th className="border-b border-zinc-700 p-2 text-left">Status</th>
                  <th className="border-b border-zinc-700 p-2 text-left">Melder</th>
                  <th className="border-b border-zinc-700 p-2 text-left">Bondteam/bron</th>
                  <th className="border-b border-zinc-700 p-2 text-left">Omschrijving</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="p-5 text-center font-bold text-zinc-300">Meldingen laden...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="p-5 text-center font-bold text-zinc-300">Geen meldingen gevonden.</td></tr>
                ) : filtered.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-800 bg-black/20 hover:bg-black/35">
                    <td className="p-2 font-black text-white">{fmtDate(datumOvertredingVan(m))}</td>
                    <td className="p-2 text-zinc-300">{fmtDate(m.aangemaakt_op || m.gemeld_op || m.created_at)}</td>
                    <td className="p-2"><div className="font-black text-white">{naamVan(m)}</div><div className="text-[10px] uppercase text-zinc-400">{typeVan(m)}{m.va_nummer ? ` · VA ${m.va_nummer}` : ""}</div></td>
                    <td className="p-2 text-zinc-200">{m.categorie || "-"}</td>
                    <td className="p-2"><span className="border border-orange-500/40 bg-orange-950/30 px-2 py-1 text-[10px] font-black uppercase text-orange-200">{m.ernst || "-"}</span></td>
                    <td className="p-2"><span className={`border px-2 py-1 text-[10px] font-black uppercase ${statusClass(m.status)}`}>{m.status || "open"}</span></td>
                    <td className="p-2"><div className="font-bold text-zinc-100">{melderNaamVan(m)}</div><div className="text-[10px] text-zinc-400">{melderEmailVan(m) || melderRolVan(m) || "-"}</div></td>
                    <td className="p-2"><div className="font-black text-orange-200">{bondteamVan(m) || "Geen bondteam"}</div><div className="text-[10px] uppercase text-zinc-400">{bronVan(m) || "-"}</div></td>
                    <td className="max-w-xl p-2 text-zinc-300">{tekstVan(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
