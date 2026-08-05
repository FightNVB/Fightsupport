"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Eye, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authedFetch } from "@/lib/api/authedFetch";

type BoutRow = {
  id: string;
  partij_nr: number | null;
  discipline: string | null;
  klasse: string | null;
  rood_naam: string | null;
  rood_gym: string | null;
  rood_va: string | null;
  rood_gewicht_gewogen: string | number | null;
  gewicht_strafpunt_rood: string | number | null;
  blauw_naam: string | null;
  blauw_gym: string | null;
  blauw_va: string | null;
  blauw_gewicht_gewogen: string | number | null;
  gewicht_strafpunt_blauw: string | number | null;
};

type ResultRow = {
  uitslagen_bout_id: string;
  uitslag_status: string | null;
  winnaar_hoek: string | null;
  methode: string | null;
  ronde: string | number | null;
  tijd_in_ronde: string | null;
  opmerkingen: string | null;
  ingevuld_op: string | null;
};

type Meta = {
  naam: string | null;
  datum: string | null;
  bondteam: string | null;
};

function clean(v: unknown) { return String(v ?? "").trim(); }
function norm(v: unknown) { return clean(v).toUpperCase(); }
function fmt(v: unknown, fallback = "-") { const x = clean(v); return x || fallback; }
function minpunt(v: unknown) { const x = Number(v ?? 0); return Number.isFinite(x) && x > 0 ? `-${x}` : "0"; }
function formatDate(v: string | null) { if (!v) return "-"; const d = new Date(v.length === 10 ? `${v}T00:00:00` : v); return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("nl-NL"); }
function formatDateTime(v: string | null) { if (!v) return "-"; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleString("nl-NL"); }
function resultLabel(r?: ResultRow) {
  if (!r) return "Niet ingevuld";
  const hoek = clean(r.winnaar_hoek).toLowerCase();
  if (hoek === "rood") return `Rood wint · ${fmt(r.methode)}`;
  if (hoek === "blauw") return `Blauw wint · ${fmt(r.methode)}`;
  if (hoek === "onbeslist") return "Onbeslist";
  if (hoek === "no_contest") return "No contest";
  if (hoek === "demo") return "Demo";
  return fmt(r.methode, "Niet ingevuld");
}

export default function OfficialsUitslagenInzienPage() {
  const router = useRouter();
  const params = useParams<{ matchmakingId: string }>();
  const matchmakingId = String(params?.matchmakingId ?? "");
  const { user, roles, loading: authLoading } = useAuth();

  const [meta, setMeta] = useState<Meta>({ naam: null, datum: null, bondteam: null });
  const [bouts, setBouts] = useState<BoutRow[]>([]);
  const [results, setResults] = useState<Map<string, ResultRow>>(new Map());
  const [myBondteam, setMyBondteam] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const allowed = useMemo(() => roles?.some((r) => ["official", "hoofdofficial", "admin", "superadmin"].includes(String(r).toLowerCase())) ?? false, [roles]);
  const isSuperadmin = useMemo(() => roles?.some((r) => String(r).toLowerCase() === "superadmin") ?? false, [roles]);

  async function load() {
    if (!user?.id || !matchmakingId) return;
    setLoading(true); setError("");
    try {
      const response = await authedFetch(`/api/officials/uitslagen/${encodeURIComponent(matchmakingId)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Uitslagen laden mislukt.");
      const profileBond = norm(payload?.viewerBondteam);
      setMyBondteam(profileBond);
      const mm = payload?.matchmaking ?? null;
      const upload = payload?.upload ?? null;
      const boutRows = payload?.bouts ?? [];
      const resultRows = payload?.results ?? [];

      const bond = norm((upload as any)?.bondteam || (mm as any)?.huidige_eigenaar_bondteam || (mm as any)?.bondteam);
      setMeta({
        naam: (upload as any)?.evenement_naam ?? (mm as any)?.naam ?? null,
        datum: (upload as any)?.evenement_datum ?? (mm as any)?.datum ?? null,
        bondteam: bond || null,
      });
      setBouts((boutRows ?? []) as BoutRow[]);
      setResults(new Map((resultRows ?? []).map((r: any) => [String(r.uitslagen_bout_id), r as ResultRow])));
    } catch (e: any) {
      setError(e?.message ?? "Uitslagen laden mislukt.");
      setBouts([]);
      setResults(new Map());
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) return void router.replace("/login");
    if (!allowed) return void router.replace("/dashboard");
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, allowed, matchmakingId, router, roles]);

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="mx-auto max-w-[1720px] px-6 py-5">
        <div className="overflow-hidden rounded-none border-4 border-[#a3a7ad] bg-[linear-gradient(180deg,#3a3d43_0%,#171b22_40%,#080b11_100%)] shadow-[0_0_45px_rgba(0,0,0,0.75)]">
          <div className="grid grid-cols-[210px_1fr_360px] items-center gap-5 border-b-2 border-[#ff4d00] px-8 py-4">
            <div className="flex flex-wrap gap-2">
              {isSuperadmin && myBondteam === "NVB" ? (
                <button
                  onClick={() =>
                    router.push("/dashboard/admin/uitslagen/ready-to-upload")
                  }
                  className="h-[48px] rounded-none border-2 border-[#ff4d00] bg-[linear-gradient(180deg,#ff8a45_0%,#ff4d00_50%,#8f2600_100%)] px-4 text-[15px] font-black uppercase tracking-[1.5px] text-white shadow-[inset_0_2px_0_rgba(255,255,255,.35),0_0_0_1px_rgba(0,0,0,.5)]"
                >
                  Naar Admin
                </button>
              ) : null}

              <button
                onClick={() => router.push("/dashboard/officials/uitslagen")}
                className="h-[48px] rounded-none border-2 border-[#f4f4f4] bg-[linear-gradient(180deg,#ffffff_0%,#d8d8d8_42%,#878787_100%)] px-4 text-[15px] font-black uppercase tracking-[1.5px] text-black shadow-[inset_0_2px_0_rgba(255,255,255,.9),0_0_0_1px_rgba(0,0,0,.5)]"
              >
                ← Uitslagen
              </button>
            </div>
            <div className="flex items-center justify-center"><Image src="/branding/fightsupport/fightsupport1.png" alt="FightSupport" width={1400} height={260} priority className="h-[118px] w-[680px] object-contain drop-shadow-[0_0_32px_rgba(255,255,255,0.28)]" /></div>
            <div className="text-right"><div className="text-[29px] font-black tracking-[6px] text-[#ff4d00]">INZIEN</div><div className="text-sm text-zinc-300">Alleen lezen · geen wijzigingen</div><div className="mt-3 inline-flex items-center gap-2 border border-[#ff4d00] bg-[#ff4d0017] px-3 py-2 text-xs font-black uppercase tracking-[2px] text-[#ff7a3c]"><ShieldCheck className="h-4 w-4" /> {myBondteam || "-"}</div></div>
          </div>

          <div className="px-8 py-8 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.10),transparent_38%)]">
            <div className="mb-6 rounded-none border-4 border-[#c7cbd1] bg-[linear-gradient(180deg,#ffffff_0%,#d8d8d8_42%,#878787_100%)] p-5 text-black shadow-[inset_0_2px_0_rgba(255,255,255,.9)]">
              <div className="flex items-center justify-between gap-6">
                <div><div className="text-[32px] font-black uppercase tracking-[3px] text-[#ff4d00]">{meta.naam || "Uitslagen"}</div><div className="mt-1 text-sm font-black uppercase tracking-[2px] text-zinc-800">{formatDate(meta.datum)} · {meta.bondteam || "-"}</div></div>
                <div className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-3 text-sm font-black uppercase tracking-[2px]"><Eye className="h-5 w-5" /> Read only</div>
              </div>
            </div>

            {error ? <div className="mb-5 border-2 border-red-500 bg-red-950/80 px-5 py-4 text-sm font-black text-red-100">{error}</div> : null}

            <div className="overflow-hidden rounded-none border-4 border-[#a3a7ad] shadow-[inset_0_0_0_2px_rgba(255,255,255,.25),0_18px_35px_rgba(0,0,0,.45)]">
              <div className="grid grid-cols-[90px_1fr_1fr_1.4fr_180px] bg-[linear-gradient(180deg,#ffffff_0%,#d8d8d8_30%,#8f8f8f_64%,#eeeeee_100%)] px-5 py-4 border-b-2 border-black text-sm font-black uppercase tracking-[2px] text-black"><div>Nr</div><div>Rood</div><div>Blauw</div><div>Uitslag</div><div>Ingevoerd</div></div>
              {loading ? <div className="bg-[#0e1118] px-6 py-10 text-center text-zinc-400">Laden...</div> : bouts.length === 0 ? <div className="bg-[#0e1118] px-6 py-10 text-center text-zinc-400">Geen uitslagen gevonden.</div> : bouts.map((b, i) => {
                const r = results.get(String(b.id));
                const zebra = i % 2 === 0;
                return <div key={b.id} className={`grid grid-cols-[90px_1fr_1fr_1.4fr_180px] items-center border-t-2 border-[#4f545c] px-5 py-4 ${zebra ? "bg-[#0f131a]" : "bg-[#161b23]"}`}>
                  <div className="text-[24px] font-black text-[#ff4d00]">{b.partij_nr ?? "-"}</div>
                  <div><div className="text-[20px] font-black uppercase text-white">{fmt(b.rood_naam)}</div><div className="text-sm font-bold text-[#ffb067]">{fmt(b.rood_gym)}</div><div className="mt-1 text-xs text-zinc-400">VA {fmt(b.rood_va)} · {fmt(b.rood_gewicht_gewogen)} kg · minpunt {minpunt(b.gewicht_strafpunt_rood)}</div></div>
                  <div className="text-right"><div className="text-[20px] font-black uppercase text-white">{fmt(b.blauw_naam)}</div><div className="text-sm font-bold text-[#ffb067]">{fmt(b.blauw_gym)}</div><div className="mt-1 text-xs text-zinc-400">VA {fmt(b.blauw_va)} · {fmt(b.blauw_gewicht_gewogen)} kg · minpunt {minpunt(b.gewicht_strafpunt_blauw)}</div></div>
                  <div><div className="inline-block border-2 border-[#ff4d00] bg-[#ff4d0017] px-4 py-2 text-sm font-black uppercase tracking-[1.5px] text-[#ffb067]">{resultLabel(r)}</div>{r?.opmerkingen ? <div className="mt-2 text-sm text-zinc-300">{r.opmerkingen}</div> : null}</div>
                  <div className="text-sm text-zinc-300">{formatDateTime(r?.ingevuld_op ?? null)}</div>
                </div>;
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
