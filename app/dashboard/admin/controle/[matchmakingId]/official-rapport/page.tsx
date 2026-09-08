"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authedFetch } from "@/lib/api/authedFetch";

type AnyRow = Record<string, any>;

type Issue = {
  key: string;
  partij: string;
  hoek: string;
  naam: string;
  va: string;
  code: string;
  label: string;
  detail: string;
  resultaat: string;
};

const KLASSE_MINUTEN: Record<string, number> = {
  "a titel": 31,
  a: 21,
  b: 14,
  c: 13,
  n: 11.5,
  "16/17": 10.5,
  jeugd: 8.5,
  "jeugd 16+": 10.5,
  talentstatus: 10.5,
  jplus: 10.5,
  r: 8.5,
  recreant: 8.5,
  demo: 6,
  boksen: 10,
  "mma pro": 17,
  "mma amateur": 17,
  "mma jeugd": 17,
};

function text(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function norm(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeVa(v: any) {
  const digits = String(v ?? "").replace(/\D/g, "").trim();
  return /^\d{3,6}$/.test(digits) ? digits : "";
}

function formatDate(v: any) {
  if (!v) return "-";
  const d = new Date(String(v).length === 10 ? `${v}T12:00:00` : v);
  return Number.isNaN(d.getTime()) ? text(v) : d.toLocaleDateString("nl-NL");
}

function formatDuration(mins: number) {
  if (!Number.isFinite(mins)) return "-";
  const rounded = Math.round(mins * 10) / 10;
  const hours = Math.floor(rounded / 60);
  const minutes = Math.round((rounded - hours * 60) * 10) / 10;
  const m = Number.isInteger(minutes) ? String(minutes) : String(minutes).replace(".", ",");
  return hours ? `${hours} uur${minutes ? ` ${m} min` : ""}` : `${m} min`;
}

function normalizeClass(v: any) {
  return norm(v)
    .replace(/\+/g, " plus ")
    .replace(/[._/\\-]+/g, " ")
    .replace(/\bklasse\b|\bclass\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasToken(value: string, token: string) {
  return new RegExp(`(^|\\s)${token}(\\s|$)`, "i").test(value);
}

function ageOnEvent(row: AnyRow, side: "rood" | "blauw", eventDate: any): number | null {
  const raw = row?.[`${side}_geboortedatum_fp`] ?? row?.[`${side}_geboortedatum_mm`] ?? row?.[`${side}_geboortedatum`];
  if (!raw || !eventDate) return null;
  const birth = new Date(String(raw).length === 10 ? `${raw}T12:00:00` : raw);
  const event = new Date(String(eventDate).length === 10 ? `${eventDate}T12:00:00` : eventDate);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(event.getTime())) return null;
  let years = event.getFullYear() - birth.getFullYear();
  if (event.getMonth() < birth.getMonth() || (event.getMonth() === birth.getMonth() && event.getDate() < birth.getDate())) years--;
  return years;
}

function classMinutes(row: AnyRow, eventDate: any): number | null {
  const rawClass = row?.klasse_mm ?? row?.klasse ?? "";
  const k = normalizeClass(rawClass);
  const d = normalizeClass(row?.discipline ?? row?.discipline_mm ?? "");
  const both16 = (["rood", "blauw"] as const).every((side) => {
    const age = ageOnEvent(row, side, eventDate);
    return age != null && age >= 16;
  });

  if (k.includes("mma") || d.includes("mma")) {
    if (k.includes("pro") || d.includes("pro")) return KLASSE_MINUTEN["mma pro"];
    if (k.includes("jeugd") || k.includes("youth") || d.includes("jeugd")) return KLASSE_MINUTEN["mma jeugd"];
    return KLASSE_MINUTEN["mma amateur"];
  }
  if (["boksen", "boxing", "boxen"].includes(d) || k.includes("boksen")) return KLASSE_MINUTEN.boksen;
  if (`${k} ${d}`.includes("titel")) return KLASSE_MINUTEN["a titel"];
  if (k.includes("talent") || norm(rawClass).includes("j+")) return KLASSE_MINUTEN.talentstatus;
  if (/16\s*17/.test(k)) return KLASSE_MINUTEN["16/17"];
  if (hasToken(k, "j") || k.includes("jeugd") || k.includes("youth") || k.includes("junior")) return both16 ? KLASSE_MINUTEN["jeugd 16+"] : KLASSE_MINUTEN.jeugd;
  if (hasToken(k, "r") || k.includes("recreant")) return KLASSE_MINUTEN.r;
  if (hasToken(k, "n") || k.includes("nieuweling") || k.includes("novice")) return KLASSE_MINUTEN.n;
  if (hasToken(k, "c")) return KLASSE_MINUTEN.c;
  if (hasToken(k, "b")) return KLASSE_MINUTEN.b;
  if (hasToken(k, "a")) return KLASSE_MINUTEN.a;
  if (k.includes("demo")) return KLASSE_MINUTEN.demo;
  return null;
}

function isApproved(row: AnyRow) {
  const s = norm(row?.review_status);
  return ["approved", "accepted", "goedgekeurd", "akkoord", "resolved", "afgehandeld", "closed"].includes(s);
}

function isOpenRule(row: AnyRow) {
  if (isApproved(row)) return false;
  const result = norm(row?.resultaat);
  return result !== "ok" && result !== "info" && !!result;
}

function dispDecision(row: AnyRow) {
  const s = norm(row?.decision ?? row?.status);
  if (["approved", "approve", "goedgekeurd", "akkoord", "accepted", "geaccepteerd"].includes(s)) return "approved";
  if (["rejected", "reject", "afgewezen", "afgekeurd", "denied", "declined"].includes(s)) return "rejected";
  return "pending";
}

function StatusCard({ label, value, ok, detail }: { label: string; value: string; ok: boolean; detail?: string }) {
  return (
    <div className={`min-h-[82px] rounded-lg border bg-gradient-to-b from-zinc-100 to-zinc-300 px-3 py-2.5 ${ok ? "border-zinc-400" : "border-[#ff4d00]"}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600">{label}</div>
      <div className={`mt-1 text-[18px] font-black leading-tight ${ok ? "text-zinc-950" : "text-[#b93600]"}`}>{value}</div>
      {detail ? <div className="mt-1 text-[10px] font-bold leading-snug text-zinc-700">{detail}</div> : null}
    </div>
  );
}

function IssuePanel({ title, issues }: { title: string; issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <section className="report-section overflow-hidden rounded-lg border border-[#ff4d00] bg-[#151518]">
      <div className="flex items-center justify-between bg-[#3a3f46] px-3 py-2 text-[12px] font-black uppercase tracking-[0.06em] text-white">
        <span>{title}</span><span>{issues.length}</span>
      </div>
      {issues.map((issue) => (
        <div key={issue.key} className="grid grid-cols-[58px_minmax(0,1fr)] gap-2 border-b border-zinc-700 px-3 py-2 text-[12px] last:border-0">
          <b className="text-[#ff7a42]">P{issue.partij}</b>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2">
              <b className="text-white">{issue.naam}</b>
              {issue.va ? <span className="text-zinc-400">VA {issue.va}</span> : null}
              <span className="font-black text-[#ff6a2a]">{issue.label}</span>
            </div>
            <div className="mt-0.5 text-zinc-300">{issue.detail}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

export default function AdminEindrapportPage() {
  const params = useParams<{ matchmakingId: string }>();
  const router = useRouter();
  const matchmakingId = String(params?.matchmakingId ?? "").trim();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!matchmakingId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await authedFetch(
          `/api/rapport/official-eindrapport?matchmaking_id=${encodeURIComponent(matchmakingId)}`,
          { cache: "no-store" },
        );
        const json = await response.json();
        if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Eindrapport kon niet worden geladen.");
        setData(json);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [matchmakingId]);

  const summary = useMemo(() => {
    const ctx: AnyRow[] = data?.bout_context ?? [];
    const results: AnyRow[] = data?.resultaten ?? [];
    const dispensaties: AnyRow[] = data?.dispensaties ?? [];
    const event = data?.event ?? null;
    const byParty = new Map<number, AnyRow>();
    for (const row of ctx) {
      const pn = Number(row?.partij_nr);
      if (Number.isFinite(pn) && pn > 0 && !byParty.has(pn)) byParty.set(pn, row);
    }

    const issueFromResult = (row: AnyRow, index: number): Issue => {
      const pn = Number(row?.partij_nr);
      const ctxRow = Number.isFinite(pn) ? byParty.get(pn) : null;
      const side = row?.hoek === "blauw" ? "blauw" : row?.hoek === "rood" ? "rood" : "";
      const va = normalizeVa(
        row?.fighter_id ??
          row?.toernooi_va_nummer ??
          (side ? ctxRow?.[`${side}_va_mm`] ?? ctxRow?.[`${side}_va_fp`] : null),
      );
      const naam = side
        ? text(ctxRow?.[`${side}_naam_fp`] ?? ctxRow?.[`${side}_naam_mm`] ?? ctxRow?.[`${side}_naam`], va ? `VA ${va}` : "Onbekende vechter")
        : text(row?.fighter_name ?? row?.naam, va ? `VA ${va}` : "Partijcontrole");
      const code = String(row?.rule_code ?? row?.rule ?? "").toUpperCase();
      return {
        key: String(row?.id ?? `${pn}-${side}-${code}-${index}`),
        partij: Number.isFinite(pn) && pn > 0 ? String(pn) : text(row?.toernooi_code, "-") ,
        hoek: side,
        naam,
        va,
        code,
        label: text(row?.rule ?? row?.rule_code, text(row?.resultaat)),
        detail: text(row?.boodschap ?? row?.message ?? row?.rule),
        resultaat: String(row?.resultaat ?? "").toUpperCase(),
      };
    };

    const active = results.filter(isOpenRule);
    const issues = active.map(issueFromResult);
    const license = issues.filter((x) => x.code.includes("LICENT"));
    const fightpassport = issues.filter((x) => x.code.includes("FIGHTPASPOORT") || x.code.includes("GEEN_FIGHTPASSPORT_INFO"));
    const startverbod = issues.filter((x) => x.code.includes("STARTVERBOD"));
    const keurmerk = issues.filter((x) => x.code.includes("KEURMERK") || x.code.includes("SPORTSCHOOL_NIET_GEVONDEN"));
    const verboden = issues.filter((x) => x.resultaat === "VERBOD" && !x.code.includes("STARTVERBOD"));
    const acties = issues.filter((x) => x.resultaat === "ACTIE");
    const afkeur = issues.filter((x) => x.resultaat === "AFKEUR");
    const dispIssues = issues.filter((x) => x.resultaat === "DISPENSATIE" || x.code.includes("DISPENSATIE"));

    const dispStates = dispIssues.map((issue) => {
      const result = active.find((r) => String(r?.id ?? "") === issue.key) ?? null;
      const pn = Number(result?.partij_nr ?? issue.partij);
      const ctxRow = Number.isFinite(pn) ? byParty.get(pn) : null;
      const boutId = String(result?.bout_id ?? ctxRow?.bout_id ?? "").trim();
      const red = normalizeVa(ctxRow?.rood_va_mm);
      const blue = normalizeVa(ctxRow?.blauw_va_mm);
      const requests = dispensaties.filter((request: AnyRow) => {
        if (boutId && String(request?.bout_id ?? "").trim() === boutId) return true;
        if (Number(request?.partij_nr) === pn) return true;
        const rr = normalizeVa(request?.va_rood);
        const rb = normalizeVa(request?.va_blauw);
        return !!red && !!blue && [rr, rb].sort().join("|") === [red, blue].sort().join("|");
      });
      const states = requests.map(dispDecision);
      const state = states.includes("rejected") ? "rejected" : states.includes("pending") ? "pending" : states.includes("approved") ? "approved" : "not_requested";
      return { issue, state };
    });

    const dispApproved = dispStates.filter((x) => x.state === "approved").length;
    const dispBlocking = dispStates.filter((x) => x.state !== "approved");

    let galaTotal = 0;
    const unknownClasses = new Set<string>();
    for (const row of ctx.filter((r) => Number(r?.partij_nr) > 0)) {
      const mins = classMinutes(row, event?.datum);
      if (mins == null) unknownClasses.add(text(row?.klasse_mm ?? row?.klasse, "Onbekende klasse"));
      else galaTotal += mins;
    }
    const requestedHours = Number(event?.aantal_uren);
    const targetMinutes = Number.isFinite(requestedHours) && requestedHours > 0 ? requestedHours * 60 : null;
    const galaOk = unknownClasses.size === 0 && targetMinutes != null && galaTotal <= targetMinutes + 10;

    const unresolvedAfkeur = afkeur.length;
    const unresolvedVerbod = verboden.length + startverbod.length;
    const akkoord = unresolvedAfkeur === 0 && unresolvedVerbod === 0 && dispBlocking.length === 0 && galaOk;

    const knownKeys = new Set([...license, ...fightpassport, ...startverbod, ...keurmerk, ...verboden, ...dispIssues].map((x) => x.key));
    const overige = issues.filter((x) => !knownKeys.has(x.key) && x.resultaat !== "ACTIE");

    return {
      ctx,
      issues,
      license,
      fightpassport,
      startverbod,
      keurmerk,
      verboden,
      acties,
      overige,
      afkeur,
      dispIssues,
      dispApproved,
      dispBlocking,
      galaTotal,
      unknownClasses: [...unknownClasses],
      requestedHours,
      galaOk,
      akkoord,
    };
  }, [data]);

  if (loading) return <div className="p-8">Eindrapport laden…</div>;
  if (error) return <div className="p-8 text-red-700">{error}</div>;

  const event = data?.event ?? {};
  const run = data?.run ?? {};

  return (
    <main className="min-h-screen bg-[#151518] p-4 text-zinc-100 print:bg-[#202024] print:p-0">
      <style jsx global>{`
        @page{size:A4;margin:0}
        *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
        @media print{
          html,body{width:210mm!important;min-height:297mm!important;margin:0!important;padding:0!important;background:#202024!important}
          .no-print{display:none!important}
          .a4{width:210mm!important;max-width:210mm!important;min-height:297mm!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important}
          .report-section{break-inside:avoid-page}
        }
      `}</style>

      <div className="no-print mx-auto mb-3 flex max-w-[1120px] justify-between gap-2">
        <button
          onClick={() => router.push(`/dashboard/admin/controle/${encodeURIComponent(matchmakingId)}`)}
          className="rounded-md border border-zinc-500 bg-[#242428] px-4 py-2 text-sm font-black text-white hover:border-[#ff4d00]"
        >
          ← Terug
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-md border border-[#ff6a2a] bg-[#ff4d00] px-4 py-2 text-sm font-black text-black"
        >
          Print / PDF
        </button>
      </div>

      <section className="a4 mx-auto min-h-[277mm] max-w-[1120px] overflow-hidden rounded-xl border border-zinc-600 bg-[#202024] shadow-2xl">
        <div className="h-2 bg-[#ff4d00]" />
        <header className="flex items-center justify-between gap-4 border-b border-zinc-600 bg-gradient-to-b from-[#35353a] to-[#242428] px-5 py-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-[#ff6a2a]">FightSupport · NVB</div>
            <h1 className="mt-0.5 text-xl font-black leading-none text-white">Eindrapport</h1>
            <div className="mt-1 text-[10px] font-medium text-zinc-300">Samenvatting van de laatste afgeronde admincontrole</div>
          </div>
          <div className={`min-w-[145px] rounded-md border-2 px-3 py-2 text-center ${summary.akkoord ? "border-[#39a85a] bg-[#176b35]" : "border-[#e4483e] bg-[#a9231c]"}`}>
            <div className="text-[10px] font-black uppercase tracking-wider text-white/80">Eventstatus</div>
            <div className="text-base font-black text-white">{summary.akkoord ? "AKKOORD" : "NIET AKKOORD"}</div>
          </div>
        </header>

        <div className="px-6 py-4 print:px-5 print:py-3">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-zinc-500 bg-zinc-500 text-[12px] sm:grid-cols-4 xl:grid-cols-8 print:grid-cols-8 print:text-[9px]">
            {[
              ["Evenement", text(event?.naam)],
              ["Datum", formatDate(event?.datum)],
              ["Locatie", text(event?.locatie)],
              ["Promotor", text(event?.promotor)],
              ["Matchmaker", text(event?.matchmaker_naam)],
              ["Partijen", String(summary.ctx.filter((r) => Number(r?.partij_nr) > 0).length)],
              ["Controlerun", formatDate(run?.afgerond_op ?? run?.gestart_op)],
              ["Ingesteld", Number.isFinite(summary.requestedHours) && summary.requestedHours > 0 ? `${summary.requestedHours} uur` : "-"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 bg-gradient-to-b from-zinc-100 to-zinc-300 px-2 py-1.5 text-zinc-950">
                <div className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600">{label}</div>
                <div className="mt-0.5 truncate font-bold" title={String(value)}>{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
            <StatusCard label="Licentie" value={summary.license.length ? `${summary.license.length} ongeldig` : "Alles geldig"} ok={summary.license.length === 0} />
            <StatusCard label="FightPassport" value={summary.fightpassport.length ? `${summary.fightpassport.length} ontbreekt/controle` : "Alles aanwezig"} ok={summary.fightpassport.length === 0} />
            <StatusCard label="Startverbod" value={summary.startverbod.length ? `${summary.startverbod.length} actief` : "0 actief"} ok={summary.startverbod.length === 0} />
            <StatusCard label="Keurmerk" value={summary.keurmerk.length ? `${summary.keurmerk.length} melding(en)` : "Alles akkoord"} ok={summary.keurmerk.length === 0} />
            <StatusCard label="Dispensaties" value={`${summary.dispApproved}/${summary.dispIssues.length} akkoord`} detail={summary.dispBlocking.length ? `${summary.dispBlocking.length} nog blokkerend` : undefined} ok={summary.dispBlocking.length === 0} />
            <StatusCard label="Galaduur" value={formatDuration(summary.galaTotal)} detail={summary.unknownClasses.length ? `Onbekende klasse: ${summary.unknownClasses.join(", ")}` : summary.requestedHours ? `Max ${summary.requestedHours} uur + 10 min` : "Geen ingestelde galaduur"} ok={summary.galaOk} />
          </div>

          <div className="mt-3 grid gap-3">
            <IssuePanel title="Vechters zonder geldige licentie" issues={summary.license} />
            <IssuePanel title="FightPassport ontbreekt / vechtergegevens controleren" issues={summary.fightpassport} />
            <IssuePanel title="Actieve startverboden" issues={summary.startverbod} />
            <IssuePanel title="Sportschool / keurmerk" issues={summary.keurmerk} />
            <IssuePanel title="Verboden partijen" issues={summary.verboden} />
            <IssuePanel title="Overige blokkerende controles" issues={summary.overige} />
            <IssuePanel title="Aandachtspunten" issues={summary.acties} />
          </div>

          {summary.dispBlocking.length ? (
            <section className="report-section mt-3 overflow-hidden rounded-lg border border-[#ff4d00] bg-[#151518]">
              <div className="flex items-center justify-between bg-[#ff4d00] px-3 py-2 text-[12px] font-black uppercase tracking-[0.06em] text-white">
                <span>Blokkerende dispensaties</span><span>{summary.dispBlocking.length}</span>
              </div>
              {summary.dispBlocking.map(({ issue, state }: any) => (
                <div key={`disp-${issue.key}`} className="grid grid-cols-[58px_minmax(0,1fr)] gap-2 border-b border-zinc-700 px-3 py-2 text-[12px] last:border-0">
                  <b className="text-[#ff7a42]">P{issue.partij}</b>
                  <div><b className="text-white">{issue.naam}</b><div className="text-zinc-300">{issue.detail}</div><b className="text-[#ff6a2a]">{state === "rejected" ? "Afgewezen" : state === "pending" ? "Aangevraagd / in behandeling" : "Niet aangevraagd"}</b></div>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
