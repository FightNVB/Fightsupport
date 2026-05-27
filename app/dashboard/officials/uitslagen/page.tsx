"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

type Row = {
  matchmaking_id: string;
  bondteam: string | null;
  evenement_naam: string | null;
  evenement_datum: string | null;
  partijen: number;
  ingevuld: number;
  run_status: string | null;
  finalized: boolean;
};

type UserProfile = { bondteam: string | null };
type ActiveTab = "active" | "done";

function clean(v: unknown) { return String(v ?? "").trim(); }
function norm(v: unknown) { return clean(v).toUpperCase(); }
function lower(v: unknown) { return clean(v).toLowerCase(); }

function formatDate(v: string | null) {
  if (!v) return "-";
  const d = new Date(v.length === 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("nl-NL");
}

export default function OfficialsUitslagenPage() {
  const router = useRouter();
  const { user, roles, loading: authLoading } = useAuth();

  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [myBondteam, setMyBondteam] = useState("");
  const [melding, setMelding] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("active");

  const allowed = useMemo(
    () => roles?.some((r) => ["official", "hoofdofficial", "admin", "superadmin"].includes(String(r).toLowerCase())) ?? false,
    [roles]
  );

  const isSuperadmin = useMemo(
    () => roles?.some((r) => String(r).toLowerCase() === "superadmin") ?? false,
    [roles]
  );

  const canSeeAllBonds = isSuperadmin && norm(myBondteam) === "NVB";

  async function loadMyProfileBondteam(userId: string) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("bondteam")
      .eq("id", userId)
      .maybeSingle<UserProfile>();

    if (error) throw new Error(`Bondteam ophalen uit user_profiles mislukt: ${error.message}`);
    return clean(data?.bondteam).toUpperCase();
  }

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    setMelding(null);

    try {
      const profileBondteam = await loadMyProfileBondteam(user.id);
      setMyBondteam(profileBondteam);

      if (!profileBondteam) {
        setRows([]);
        setMelding("Geen bondteam gevonden in user_profiles. Zet bondteam op de gebruiker om uitslagen te tonen.");
        return;
      }

      const [
        { data: runRows, error: runError },
        { data: boutRows, error: boutError },
        { data: resultRows, error: resultError },
        { data: uploadRows, error: uploadError },
        { data: mmRows, error: mmError },
      ] = await Promise.all([
        supabase.from("uitslagen_runs").select("id, matchmaking_id, status"),
        supabase.from("uitslagen_bouts").select("uitslagen_run_id, matchmaking_id, partij_nr"),
        supabase.from("uitslagen_resultaten").select("uitslagen_run_id, matchmaking_id, uitslag_status"),
        supabase.from("matchmaking_uploads").select("matchmaking_id, bondteam, evenement_naam, evenement_datum"),
        supabase.from("matchmakings").select("id, naam, datum, bondteam, huidige_eigenaar_bondteam, stadium, status"),
      ]);

      if (runError) throw runError;
      if (boutError) throw boutError;
      if (resultError) throw resultError;
      if (uploadError) throw uploadError;
      if (mmError) throw mmError;

      const uploadById = new Map((uploadRows ?? []).map((r: any) => [String(r.matchmaking_id), r]));
      const mmById = new Map((mmRows ?? []).map((r: any) => [String(r.id), r]));
      const byRun = new Map<string, Row>();

      for (const run of runRows ?? []) {
        const runId = clean((run as any).id);
        const mmid = clean((run as any).matchmaking_id);
        if (!runId || !mmid) continue;

        const upload: any = uploadById.get(mmid) ?? {};
        const mm: any = mmById.get(mmid) ?? {};
        const rowBondteam = norm(upload?.bondteam || mm?.huidige_eigenaar_bondteam || mm?.bondteam);

        if (!canSeeAllBonds && rowBondteam !== profileBondteam) continue;

        byRun.set(runId, {
          matchmaking_id: mmid,
          bondteam: rowBondteam || null,
          evenement_naam: upload?.evenement_naam ?? mm?.naam ?? null,
          evenement_datum: upload?.evenement_datum ?? mm?.datum ?? null,
          partijen: 0,
          ingevuld: 0,
          run_status: clean((run as any).status) || null,
          finalized: lower((run as any).status) === "afgerond" || lower(mm?.status) === "uitslagen_definitief" || lower(mm?.stadium) === "uitslagen_definitief",
        });
      }

      for (const row of boutRows ?? []) {
        const cur = byRun.get(String((row as any).uitslagen_run_id));
        if (cur) cur.partijen += 1;
      }

      for (const row of resultRows ?? []) {
        const cur = byRun.get(String((row as any).uitslagen_run_id));
        if (cur && String((row as any).uitslag_status ?? "") !== "concept") cur.ingevuld += 1;
      }

      setRows(Array.from(byRun.values()).sort((a, b) => String(b.evenement_datum ?? "").localeCompare(String(a.evenement_datum ?? ""))));
    } catch (e: any) {
      setRows([]);
      setMelding(e?.message ?? "Uitslagen laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) return void router.replace("/login");
    if (!allowed) return void router.replace("/dashboard");
    void load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, allowed, router, roles]);

  const activeRows = useMemo(
    () => rows.filter((row) => !row.finalized),
    [rows]
  );

  const doneRows = useMemo(
    () => rows.filter((row) => row.finalized),
    [rows]
  );

  const tabRows = activeTab === "active" ? activeRows : doneRows;

  const filtered = tabRows.filter((row) =>
    [row.evenement_naam, row.evenement_datum, row.bondteam, row.run_status]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="mx-auto max-w-[1740px] px-6 py-5">
        <div className="overflow-hidden rounded-none border-4 border-[#a3a7ad] bg-[linear-gradient(180deg,#3a3d43_0%,#171b22_40%,#080b11_100%)] shadow-[0_0_45px_rgba(0,0,0,0.7)]">
          <div className="grid grid-cols-[210px_1fr_380px] items-center gap-5 border-b-2 border-[#ff4d00] px-8 py-4">
            <button
              onClick={() => router.push("/dashboard/officials")}
              className="h-[48px] rounded-none border-2 border-[#f4f4f4] bg-[linear-gradient(180deg,#ffffff_0%,#d8d8d8_42%,#878787_100%)] text-[16px] font-black text-black shadow-[inset_0_2px_0_rgba(255,255,255,.9),0_0_0_1px_rgba(0,0,0,.5)]"
            >
              ← Officials
            </button>

            <div className="flex items-center justify-center">
              <Image
                src="/branding/fightsupport/fightsupport1.png"
                alt="FightSupport"
                width={1400}
                height={260}
                loading="eager"
                priority
                className="h-[125px] w-[700px] object-contain drop-shadow-[0_0_32px_rgba(255,255,255,0.28)]"
              />
            </div>

            <div className="text-right">
              <div className="text-[30px] font-black tracking-[7px] text-[#ff4d00]">UITSLAGEN</div>
              <div className="text-sm text-zinc-300">Invoeren en inzien · FightSupport</div>
              <div className="mt-3 inline-flex items-center gap-2 border border-[#ff4d00] bg-[#ff4d0017] px-3 py-2 text-xs font-black uppercase tracking-[2px] text-[#ff7a3c]">
                <ShieldCheck className="h-4 w-4" />
                Bond: {myBondteam || "-"}
              </div>
            </div>
          </div>

          <div className="px-8 py-8 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.10),transparent_38%)]">
            <div className="mb-6 flex items-center justify-between gap-6">
              <div>
                <h1 className="text-[34px] font-black tracking-[5px] text-[#ff4d00]">EVENT OVERZICHT</h1>
                <p className="text-zinc-300">
                  {canSeeAllBonds ? "NVB superadmin: alle bondteams zichtbaar" : `Alleen uitslagen van bondteam ${myBondteam || "-"}`}
                </p>
              </div>

              <div className="relative w-[440px]">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Zoek event, status of bondteam..."
                  className="h-[48px] w-full rounded-none border-2 border-[#777c86] bg-black/75 pl-12 pr-4 text-white outline-none transition focus:border-[#ff4d00]"
                />
              </div>
            </div>

            {melding ? <div className="mb-6 border-2 border-red-500/70 bg-red-950/70 px-5 py-4 text-sm font-black text-red-100">{melding}</div> : null}

            <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setActiveTab("active")}
                className={`h-[46px] min-w-[240px] rounded-none border-2 px-5 text-sm font-black uppercase tracking-[2px] transition ${
                  activeTab === "active"
                    ? "border-[#ffb18b] bg-[linear-gradient(180deg,#ff7d38_0%,#ff4d00_100%)] text-white shadow-[0_0_25px_rgba(255,77,0,0.35)]"
                    : "border-[#f4f4f4] bg-[linear-gradient(180deg,#ffffff_0%,#d8d8d8_42%,#878787_100%)] text-black shadow-[inset_0_2px_0_rgba(255,255,255,.9),0_0_0_1px_rgba(0,0,0,.5)]"
                }`}
              >
                Actieve uitslagen ({activeRows.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("done")}
                className={`h-[46px] min-w-[240px] rounded-none border-2 px-5 text-sm font-black uppercase tracking-[2px] transition ${
                  activeTab === "done"
                    ? "border-[#ffb18b] bg-[linear-gradient(180deg,#ff7d38_0%,#ff4d00_100%)] text-white shadow-[0_0_25px_rgba(255,77,0,0.35)]"
                    : "border-[#f4f4f4] bg-[linear-gradient(180deg,#ffffff_0%,#d8d8d8_42%,#878787_100%)] text-black shadow-[inset_0_2px_0_rgba(255,255,255,.9),0_0_0_1px_rgba(0,0,0,.5)]"
                }`}
              >
                Afgeronde uitslagen ({doneRows.length})
              </button>
            </div>

            <div className="mb-4 text-center text-sm font-bold text-zinc-300">
              {activeTab === "active"
                ? "Uitslagen die nog ingevoerd of gecontroleerd moeten worden."
                : "Uitslagen die definitief zijn afgerond en alleen nog ingezien kunnen worden."}
            </div>

            <div className="overflow-hidden rounded-none border-4 border-[#a3a7ad] shadow-[inset_0_0_0_2px_rgba(255,255,255,.25),0_18px_35px_rgba(0,0,0,.45)]">
              <div className="grid grid-cols-[2fr_120px_140px_120px_1fr_390px] bg-[linear-gradient(180deg,#ffffff_0%,#d8d8d8_30%,#8f8f8f_64%,#eeeeee_100%)] px-6 py-4 border-b-2 border-black text-sm font-black uppercase tracking-[2px] text-black">
                <div>Event</div><div>Bond</div><div>Datum</div><div>Partijen</div><div>Status</div><div className="text-right">Acties</div>
              </div>

              {loading ? (
                <div className="bg-[#0e1118] px-6 py-10 text-center text-zinc-400">Laden...</div>
              ) : filtered.length === 0 ? (
                <div className="bg-[#0e1118] px-6 py-10 text-center text-zinc-400">{activeTab === "active" ? "Geen actieve uitslagen gevonden." : "Geen afgeronde uitslagen gevonden."}</div>
              ) : filtered.map((row, index) => {
                const pct = row.partijen > 0 ? Math.round((row.ingevuld / row.partijen) * 100) : 0;
                const finalized = row.finalized;
                return (
                  <div key={row.matchmaking_id} className={`grid grid-cols-[2fr_120px_140px_120px_1fr_390px] items-center border-t-2 border-[#4f545c] px-6 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] ${index % 2 === 0 ? "bg-[#0f131a]" : "bg-[#161b23]"}`}>
                    <div>
                      <div className="text-[26px] font-black uppercase tracking-[2px] text-white">{row.evenement_naam || "-"}</div>
                      <div className="mt-1 text-xs text-zinc-500">{row.matchmaking_id}</div>
                    </div>
                    <div><span className="rounded-none border border-[#ff4d00] bg-[#ff4d0017] px-4 py-2 text-sm font-black text-[#ff7a3c]">{row.bondteam || "-"}</span></div>
                    <div className="font-bold text-zinc-300">{formatDate(row.evenement_datum)}</div>
                    <div className="text-lg font-black">{row.partijen}</div>
                    <div className="pr-6">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-zinc-400">{row.ingevuld} ingevuld</span>
                        <span className={finalized ? "font-black text-emerald-300" : "font-black text-[#ff4d00]"}>{finalized ? "Definitief" : `${pct}%`}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-none bg-black border border-[#222]"><div className="h-full rounded-none bg-[linear-gradient(90deg,#ffffff_0%,#c8c8c8_45%,#ff4d00_100%)]" style={{ width: `${pct}%` }} /></div>
                    </div>
                    <div className="flex justify-end gap-3 text-right">
                      {activeTab === "active" ? (
                        <Link href={`/dashboard/officials/uitslagen/${row.matchmaking_id}`} className="inline-flex h-[42px] items-center justify-center rounded-none border-2 border-[#ffb18b] bg-[linear-gradient(180deg,#ff7d38_0%,#ff4d00_100%)] px-4 text-xs font-black uppercase tracking-[1.5px] text-white shadow-[0_0_25px_rgba(255,77,0,0.35)] transition hover:scale-[1.02]">
                          Uitslagen
                        </Link>
                      ) : (
                        <Link href={`/dashboard/officials/uitslagen/inzien/${row.matchmaking_id}`} className="inline-flex h-[42px] items-center justify-center rounded-none border-2 border-[#f4f4f4] bg-[linear-gradient(180deg,#ffffff_0%,#d8d8d8_42%,#878787_100%)] px-4 text-xs font-black uppercase tracking-[1.5px] !text-black text-black shadow-[inset_0_2px_0_rgba(255,255,255,.9),0_0_0_1px_rgba(0,0,0,.5)] transition hover:scale-[1.02]">
                          Inzien
                        </Link>
                      )}

                      <Link href={`/dashboard/officials/controle/${row.matchmaking_id}`} className="inline-flex h-[42px] items-center justify-center rounded-none border-2 border-[#f4f4f4] bg-[linear-gradient(180deg,#ffffff_0%,#d8d8d8_42%,#878787_100%)] px-4 text-xs font-black uppercase tracking-[1.5px] !text-black text-black shadow-[inset_0_2px_0_rgba(255,255,255,.9),0_0_0_1px_rgba(0,0,0,.5)] transition hover:scale-[1.02]">
                        Matchmaking
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
