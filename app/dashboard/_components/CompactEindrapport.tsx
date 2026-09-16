"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authedFetch } from "@/lib/api/authedFetch";

type Row = Record<string, any>;
type Props = { endpoint: string; title: string; backHref: (id: string) => string };

const norm = (v: any) => String(v ?? "").trim().toLowerCase();
const safe = (v: any, fallback = "-") => String(v ?? "").trim() || fallback;
const va = (v: any) => String(v ?? "").replace(/\D/g, "");
const fmtDate = (v: any) => {
  if (!v) return "-";
  const d = new Date(String(v).length === 10 ? `${v}T12:00:00` : v);
  return Number.isNaN(d.getTime()) ? safe(v) : d.toLocaleDateString("nl-NL");
};
const approved = (v: any) => ["approved","accepted","goedgekeurd","akkoord","resolved","afgehandeld","closed"].includes(norm(v));
const dispApproved = (r: Row) => ["approved","approve","goedgekeurd","akkoord","accepted","geaccepteerd"].includes(norm(r?.decision ?? r?.beslissing ?? r?.besluit ?? r?.final_decision ?? r?.status));
const isDisp = (r: Row) => String(r?.rule_code ?? "").toUpperCase().includes("DISPENSATIE") || norm(r?.resultaat) === "dispensatie";
const isVerbod = (r: Row) => {
  const code = String(r?.rule_code ?? r?.rule ?? "").toUpperCase();
  return !code.includes("STARTVERBOD") && (code.includes("VERBOD") || norm(r?.resultaat) === "verbod");
};

function sideInfo(row: Row, side: "rood" | "blauw") {
  return {
    va: va(row?.[`${side}_va_mm`] ?? row?.[`va_${side}`] ?? row?.[`${side}_va`] ?? row?.[`${side}_fighter_id`]),
    naam: safe(row?.[`${side}_naam_fp`] ?? row?.[`${side}_naam_mm`] ?? row?.[`${side}_naam`], "Naam onbekend"),
    gym: safe(row?.[`${side}_gym_mm`] ?? row?.[`${side}_gym_fp`] ?? row?.[`${side}_gym`] ?? row?.[`${side}_sportschool`], "Sportschool onbekend"),
  };
}

function StatusPill({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className={`border px-2.5 py-1.5 ${ok ? "border-zinc-400 bg-zinc-200" : "border-[#ff4d00] bg-orange-50"}`}>
    <div className="text-[9px] font-black uppercase tracking-[.1em] text-zinc-500">{label}</div>
    <div className={`text-[13px] font-black leading-tight ${ok ? "text-zinc-950" : "text-[#b93600]"}`}>{value}</div>
  </div>;
}

function SmallPanel({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (!count) return null;
  return <section className="overflow-hidden border border-zinc-700 bg-[#151518]">
    <div className="flex justify-between bg-[#3a3f46] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[.06em] text-white"><span>{title}</span><span>{count}</span></div>
    {children}
  </section>;
}

function PersonRow({ naam, gym, extra }: { naam: string; gym: string; extra?: string }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 border-b border-zinc-700 px-2.5 py-1.5 text-[11px] last:border-0">
    <b className="truncate text-white">{naam}</b><span className="truncate text-zinc-300">{gym}</span>{extra ? <b className="whitespace-nowrap text-[#ff7a42]">{extra}</b> : null}
  </div>;
}

export default function CompactEindrapport({ endpoint, title, backHref }: Props) {
  const params = useParams();
  const router = useRouter();
  const matchmakingId = String((params as any)?.matchmakingId ?? "");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchmakingId) return;
    (async () => {
      try {
        const res = await authedFetch(`${endpoint}?matchmaking_id=${encodeURIComponent(matchmakingId)}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Eindrapport kon niet worden geladen.");
        setData(json);
      } catch (e: any) { setError(e?.message ?? String(e)); }
    })();
  }, [endpoint, matchmakingId]);

  const s = useMemo(() => {
    const ctx: Row[] = data?.bout_context ?? [];
    const current: Row[] = data?.fighter_actueel ?? [];
    const results: Row[] = data?.resultaten ?? [];
    const requests: Row[] = data?.dispensaties ?? [];
    const infoByVa = new Map<string, { naam: string; gym: string; partij: string }>();
    const missingVa: Array<{ naam: string; gym: string }> = [];

    for (const row of ctx.filter(r => Number(r?.partij_nr) > 0)) {
      for (const side of ["rood","blauw"] as const) {
        const x = sideInfo(row, side);
        if (!x.va) missingVa.push({ naam: x.naam, gym: x.gym });
        else if (!infoByVa.has(x.va)) infoByVa.set(x.va, { naam: x.naam, gym: x.gym, partij: safe(row?.partij_nr) });
      }
    }

    const currentByVa = new Map(current.map(r => [va(r?.va_nummer), r]));
    const lic: Array<{naam:string;gym:string}> = [];
    const start: Array<{naam:string;gym:string}> = [];
    const keur = new Map<string, { gym:string; eind:string }>();
    const incomplete: Array<{naam:string;gym:string}> = [];

    for (const [num, info] of infoByVa) {
      const r = currentByVa.get(num);
      if (!r || r?.error_message) { incomplete.push({ naam: info.naam, gym: info.gym }); continue; }
      if (r?.licentie_ok !== true) lic.push({ naam: info.naam, gym: safe(r?.sportschool, info.gym) });
      if (r?.startverbod_actief === true) start.push({ naam: info.naam, gym: safe(r?.sportschool, info.gym) });
      if (r?.keurmerk_ok !== true) {
        const gym = safe(r?.sportschool, info.gym);
        const eind = r?.keurmerk_einddatum ?? r?.keurmerk_einde ?? r?.keurmerk_eind ?? r?.keurmerk_geldig_tot ?? null;
        const key = norm(gym);
        if (!keur.has(key)) keur.set(key, { gym, eind: eind ? fmtDate(eind) : "" });
      }
    }

    const verboden = results.filter(r => !approved(r?.review_status) && norm(r?.resultaat) !== "ok" && isVerbod(r));
    const dispRows = results.filter(isDisp);
    const blockers = dispRows.filter(r => {
      const boutId = safe(r?.bout_id, "");
      const pn = Number(r?.partij_nr);
      const related = requests.filter(q => (boutId && safe(q?.bout_id, "") === boutId) || (pn > 0 && Number(q?.partij_nr) === pn));
      return !related.some(dispApproved);
    });

    const totalProblems = missingVa.length + lic.length + start.length + keur.size + incomplete.length + verboden.length + blockers.length;
    return { missingVa, lic, start, keur: [...keur.values()], incomplete, verboden, blockers, akkoord: totalProblems === 0 };
  }, [data]);

  if (error) return <main className="min-h-screen bg-zinc-100 p-4"><div className="mx-auto max-w-[1200px] border border-red-400 bg-white p-4 font-bold text-red-700">{error}</div></main>;
  if (!data) return <main className="min-h-screen bg-zinc-100 p-4"><div className="mx-auto max-w-[1200px] bg-white p-4 font-bold">Eindrapport laden...</div></main>;

  const event = data?.event ?? {};
  return <main className="min-h-screen bg-zinc-100 p-3 text-zinc-950 print:bg-white print:p-0">
    <section className="mx-auto max-w-[1200px] overflow-hidden border-2 border-zinc-900 bg-white shadow-xl print:shadow-none">
      <header className="flex items-center gap-3 bg-zinc-950 px-4 py-2 text-white">
        <div className={`px-3 py-1 text-[12px] font-black uppercase ${s.akkoord ? "bg-zinc-200 text-zinc-950" : "bg-[#ff4d00] text-white"}`}>{s.akkoord ? "EVENT AKKOORD" : "EVENT NIET AKKOORD"}</div>
        <div className="min-w-0"><h1 className="truncate text-[18px] font-black uppercase leading-none">{title}</h1><div className="mt-1 truncate text-[10px] text-zinc-400">{safe(event?.naam)} · {fmtDate(event?.datum)} · {safe(event?.locatie)}</div></div>
        <button onClick={() => router.push(backHref(matchmakingId))} className="ml-auto border border-zinc-600 px-2.5 py-1 text-[10px] font-black uppercase hover:bg-zinc-800 print:hidden">Terug</button>
      </header>

      <div className="p-3">
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          <StatusPill label="Geen VA" value={String(s.missingVa.length)} ok={!s.missingVa.length} />
          <StatusPill label="Licentie" value={String(s.lic.length)} ok={!s.lic.length} />
          <StatusPill label="Keurmerk" value={String(s.keur.length)} ok={!s.keur.length} />
          <StatusPill label="Startverbod" value={String(s.start.length)} ok={!s.start.length} />
          <StatusPill label="Verboden" value={String(s.verboden.length)} ok={!s.verboden.length} />
          <StatusPill label="Dispensatie" value={String(s.blockers.length)} ok={!s.blockers.length} />
        </div>

        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <SmallPanel title="Geen VA-nummer" count={s.missingVa.length}>{s.missingVa.map((x,i)=><PersonRow key={`va-${i}`} naam={x.naam} gym={x.gym} />)}</SmallPanel>
          <SmallPanel title="Geen geldige licentie" count={s.lic.length}>{s.lic.map((x,i)=><PersonRow key={`lic-${i}`} naam={x.naam} gym={x.gym} />)}</SmallPanel>
          <SmallPanel title="Geen geldig keurmerk" count={s.keur.length}>{s.keur.map((x,i)=><PersonRow key={`keur-${i}`} naam={x.gym} gym="" extra={x.eind ? `einde ${x.eind}` : undefined} />)}</SmallPanel>
          <SmallPanel title="Actief startverbod" count={s.start.length}>{s.start.map((x,i)=><PersonRow key={`sv-${i}`} naam={x.naam} gym={x.gym} />)}</SmallPanel>
          <SmallPanel title="FightPassport controle onvolledig" count={s.incomplete.length}>{s.incomplete.map((x,i)=><PersonRow key={`inc-${i}`} naam={x.naam} gym={x.gym} />)}</SmallPanel>
        </div>

        {s.verboden.length > 0 && <section className="mt-2 overflow-hidden border border-[#ff4d00]">
          <div className="flex justify-between bg-[#3a3f46] px-2.5 py-1.5 text-[10px] font-black uppercase text-white"><span>Verboden partijen</span><span>{s.verboden.length}</span></div>
          {s.verboden.map((r:Row,i:number)=><div key={r?.id ?? i} className="grid grid-cols-[55px_170px_1fr] gap-2 border-b border-zinc-300 px-2.5 py-1.5 text-[11px] last:border-0"><b>P{safe(r?.partij_nr)}</b><b className="text-[#b93600]">{safe(r?.rule ?? r?.rule_code,"VERBOD")}</b><span>{safe(r?.boodschap ?? r?.rule ?? r?.rule_code)}</span></div>)}
        </section>}

        {s.blockers.length > 0 && <section className="mt-2 overflow-hidden border border-[#ff4d00]">
          <div className="flex justify-between bg-[#ff4d00] px-2.5 py-1.5 text-[10px] font-black uppercase text-white"><span>Blokkerende dispensaties</span><span>{s.blockers.length}</span></div>
          <div className="grid md:grid-cols-2">{s.blockers.map((r:Row,i:number)=><div key={r?.id ?? i} className="grid grid-cols-[55px_1fr] gap-2 border-b border-r border-zinc-300 px-2.5 py-1.5 text-[11px]"><b>P{safe(r?.partij_nr)}</b><span>{safe(r?.boodschap ?? r?.rule ?? r?.rule_code,"Dispensatie vereist")}</span></div>)}</div>
        </section>}

        {s.akkoord && <div className="mt-2 border border-zinc-400 bg-zinc-100 px-3 py-2 text-[11px] font-black">Geen blokkerende controles gevonden. Evenementstatus: AKKOORD.</div>}
        <footer className="mt-2 border-t border-zinc-300 pt-1.5 text-[8px] text-zinc-500">FightSupport eindrapport · actuele FightPassport-data · {new Date().toLocaleString("nl-NL")}</footer>
      </div>
    </section>
  </main>;
}
