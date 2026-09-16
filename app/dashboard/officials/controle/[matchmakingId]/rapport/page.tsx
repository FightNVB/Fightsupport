"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { authedFetch } from "@/lib/api/authedFetch";

type AnyRow = Record<string, any>;
type DispState = "not_requested" | "pending" | "approved" | "rejected";

type Blocker = {
  key: string;
  partij: string;
  label: string;
  detail: string;
};

type Attention = {
  key: string;
  partij: string;
  label: string;
  detail: string;
};

type KeurmerkIssue = {
  key: string;
  sportschool: string;
  land: string;
  partijen: string[];
  vechters: Array<{
    partij: string;
    va: string;
    naam: string;
  }>;
};

type FighterIssue = {
  key: string;
  partij: string;
  va: string;
  naam: string;
  detail?: string;
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

function safe(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function normalizeVa(v: any) {
  return String(v ?? "").replace(/\D/g, "").trim();
}

function norm(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function formatDate(v: any) {
  if (!v) return "-";
  const d = new Date(String(v).length === 10 ? `${v}T12:00:00` : v);
  return Number.isNaN(d.getTime()) ? safe(v) : d.toLocaleDateString("nl-NL");
}

function formatDuration(mins: number) {
  if (!Number.isFinite(mins)) return "-";
  const rounded = Math.round(mins * 10) / 10;
  const h = Math.floor(rounded / 60);
  const m = Math.round((rounded - h * 60) * 10) / 10;
  const mt = Number.isInteger(m) ? String(m) : String(m).replace(".", ",");
  if (!h) return `${mt} min`;
  return m ? `${h} uur ${mt} min` : `${h} uur`;
}

function ageOnEvent(row: AnyRow, side: "rood" | "blauw", eventDate: any): number | null {
  const dob = row?.[`${side}_geboortedatum_fp`] ?? row?.[`${side}_geboortedatum_mm`] ?? row?.[`${side}_geboortedatum`];
  if (!dob || !eventDate) return null;
  const b = new Date(String(dob).length === 10 ? `${dob}T12:00:00` : dob);
  const e = new Date(String(eventDate).length === 10 ? `${eventDate}T12:00:00` : eventDate);
  if (Number.isNaN(b.getTime()) || Number.isNaN(e.getTime())) return null;
  let years = e.getFullYear() - b.getFullYear();
  if (e.getMonth() < b.getMonth() || (e.getMonth() === b.getMonth() && e.getDate() < b.getDate())) years--;
  return years >= 0 ? years : null;
}

function normalizeClass(v: any) {
  return norm(v)
    .replace(/\+/g, " plus ")
    .replace(/[._/\\-]+/g, " ")
    .replace(/\bklasse\b|\bclass\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasToken(text: string, token: string) {
  return new RegExp(`(^|\\s)${token}(\\s|$)`, "i").test(text);
}

function classMinutes(row: AnyRow, eventDate: any): number | null {
  const rawClass = row?.klasse_mm ?? row?.klasse ?? "";
  const k = normalizeClass(rawClass);
  const d = normalizeClass(row?.discipline ?? row?.discipline_mm ?? "");
  const both16 = ["rood", "blauw"].every((side) => {
    const age = ageOnEvent(row, side as "rood" | "blauw", eventDate);
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
  if (/16\s*17/.test(k) || /16\s*\/\s*17/.test(norm(rawClass))) return KLASSE_MINUTEN["16/17"];
  if (hasToken(k, "j") || k.includes("jeugd") || k.includes("youth") || k.includes("junior")) return both16 ? KLASSE_MINUTEN["jeugd 16+"] : KLASSE_MINUTEN.jeugd;
  if (hasToken(k, "r") || k.includes("recreant")) return KLASSE_MINUTEN.r;
  if (hasToken(k, "n") || k.includes("nieuweling") || k.includes("novice")) return KLASSE_MINUTEN.n;
  if (hasToken(k, "c")) return KLASSE_MINUTEN.c;
  if (hasToken(k, "b")) return KLASSE_MINUTEN.b;
  if (hasToken(k, "a")) return KLASSE_MINUTEN.a;
  if (k.includes("demo")) return KLASSE_MINUTEN.demo;
  return null;
}

function parseRawJsonSafe(v: any): AnyRow | null {
  if (!v) return null;
  if (typeof v === "object") return v as AnyRow;
  try { return JSON.parse(String(v)); } catch { return null; }
}

function isToernooi(row: AnyRow) {
  const candidates = [row?.toernooi_code,row?.toernooi_id,row?.toernooi_nummer,row?.toernooi,row?.t_nummer,row?.t_code,row?.tournament_code];
  for (const c of candidates) {
    const x = String(c ?? "").trim().toUpperCase();
    if (x && /^T\d+$/.test(x)) return true;
  }
  const raw = parseRawJsonSafe(row?.raw_json);
  for (const c of [raw?.toernooi_code,raw?.toernooi_id,raw?.toernooi_nummer,raw?.toernooi,raw?.t_nummer,raw?.t_code,raw?.tournament_code]) {
    const x = String(c ?? "").trim().toUpperCase();
    if (x && /^T\d+$/.test(x)) return true;
  }
  const v = norm(row?.is_toernooi);
  return v === "true" || v === "1" || v === "ja";
}

function tournamentCode(row: AnyRow) {
  const direct = String(row?.toernooi_code ?? row?.toernooi_id ?? row?.toernooi_nummer ?? row?.toernooi ?? row?.t_nummer ?? row?.t_code ?? row?.tournament_code ?? "").trim().toUpperCase();
  if (direct) return direct;
  const raw = parseRawJsonSafe(row?.raw_json);
  return String(raw?.toernooi_code ?? "").trim().toUpperCase() || (isToernooi(row) ? "TOERNOOI" : "");
}

function tournamentFighterKey(row: AnyRow, side: "rood" | "blauw") {
  const va = normalizeVa(row?.[`${side}_va_mm`] ?? row?.[side === "rood" ? "va_rood" : "va_blauw"] ?? row?.[`${side}_va`] ?? row?.[`${side}_fighter_id`]);
  if (va) return `va:${va}`;
  const naam = norm(row?.[`${side}_naam_fp`] ?? row?.[`${side}_naam_mm`] ?? row?.[`${side}_naam`]);
  const gym = norm(row?.[`${side}_gym_mm`] ?? row?.[`${side}_gym_fp`] ?? row?.[`${side}_gym`] ?? row?.[`${side}_sportschool`]);
  return naam || gym ? `fallback:${naam}__${gym}` : null;
}

function calcGalaMinutes(rows: AnyRow[], eventDate: any) {
  let total = 0;
  const unknown = new Set<string>();
  const gewoneRows = rows.filter((r) => !isToernooi(r));
  for (const row of gewoneRows) {
    const m = classMinutes(row, eventDate);
    if (m == null) unknown.add(safe(row?.klasse_mm ?? row?.klasse, "Onbekende klasse"));
    else total += m;
  }

  const groups = new Map<string, AnyRow[]>();
  for (const row of rows.filter(isToernooi)) {
    const code = tournamentCode(row) || "TOERNOOI";
    const arr = groups.get(code) ?? [];
    arr.push(row); groups.set(code, arr);
  }

  for (const [code, groupRows] of groups) {
    const fighters = new Set<string>();
    const pairingMinutes: number[] = [];
    for (const row of groupRows) {
      for (const side of ["rood","blauw"] as const) {
        const key = tournamentFighterKey(row, side); if (key) fighters.add(key);
      }
      const m = classMinutes(row, eventDate);
      if (m == null) unknown.add(`Toernooi ${code} (${safe(row?.klasse_mm ?? row?.klasse, "klasse onbekend")})`);
      else { total += m; pairingMinutes.push(m); }
    }
    const expectedBouts = fighters.size >= 2 ? fighters.size - 1 : groupRows.length;
    const missingBouts = Math.max(0, expectedBouts - groupRows.length);
    if (missingBouts > 0) {
      const fallback = pairingMinutes.length ? Math.max(...pairingMinutes) : classMinutes(groupRows[0] ?? {}, eventDate);
      if (fallback == null) unknown.add(`Toernooi ${code} - nog te bepalen ronde`);
      else total += fallback * missingBouts;
    }
  }
  return { total, unknown: unknown.size, unknownLabels: [...unknown] };
}

function isJPlus(row: AnyRow) {
  const raw = String(row?.klasse_mm ?? row?.klasse ?? "").trim().toLowerCase();
  const k = normalizeClass(raw);
  return raw.includes("j+") || k.includes("j plus") || k.includes("talentstatus") || k.includes("talent status") || k.includes("talent");
}

function tournamentClassToken(v: any) {
  const x = normalizeClass(v);
  if (hasToken(x, "c")) return "C";
  if (hasToken(x, "b")) return "B";
  if (hasToken(x, "a")) return "A";
  if (hasToken(x, "n") || x.includes("nieuweling") || x.includes("novice")) return "N";
  if (hasToken(x, "r") || x.includes("recreant")) return "R";
  if (x.includes("j plus") || x.includes("talent")) return "J+";
  if (hasToken(x, "j") || x.includes("jeugd")) return "J";
  return String(v ?? "").trim().toUpperCase();
}

function dispKey(matchmakingId: any, rood: any, blauw: any, boutId?: any) {
  const mm = safe(matchmakingId, "");
  const pair = [normalizeVa(rood), normalizeVa(blauw)].filter(Boolean).sort();
  if (mm && pair.length === 2) return `${mm}|va:${pair[0]}|${pair[1]}`;
  const bout = safe(boutId, "");
  return mm && bout ? `${mm}|bout:${bout}` : null;
}

function ctxDispKey(matchmakingId: string, row: AnyRow) {
  return dispKey(
    matchmakingId,
    row?.rood_va_mm ?? row?.va_rood ?? row?.rood_va,
    row?.blauw_va_mm ?? row?.va_blauw ?? row?.blauw_va,
    row?.bout_id,
  );
}

function requestDispKey(row: AnyRow) {
  return dispKey(row?.matchmaking_id, row?.va_rood, row?.va_blauw, row?.bout_id);
}

function dispDecision(row: AnyRow): Exclude<DispState, "not_requested"> {
  const s = norm(row?.decision ?? row?.beslissing ?? row?.besluit ?? row?.final_decision ?? row?.status);
  if (["approved", "approve", "goedgekeurd", "akkoord", "accepted", "geaccepteerd"].includes(s)) return "approved";
  if (["rejected", "reject", "afgewezen", "afgekeurd", "denied", "declined"].includes(s)) return "rejected";
  return "pending";
}

function aggregateDisp(rows: AnyRow[]): Exclude<DispState, "not_requested"> {
  const states = rows.map(dispDecision);
  if (states.includes("rejected")) return "rejected";
  if (states.includes("pending")) return "pending";
  return states.length ? "approved" : "pending";
}

function isApprovedReview(v: any) {
  const s = norm(v);
  return ["approved", "accepted", "goedgekeurd", "akkoord", "resolved", "afgehandeld", "closed"].includes(s);
}

function isVerbodResult(row: AnyRow) {
  const code = String(row?.rule_code ?? row?.rule ?? "").toUpperCase();
  const result = norm(row?.resultaat);
  if (code.includes("STARTVERBOD")) return false;
  return code.includes("VERBOD") || result === "verbod";
}

function isDispResult(row: AnyRow) {
  return String(row?.rule_code ?? "").toUpperCase().includes("DISPENSATIE") || norm(row?.resultaat) === "dispensatie";
}

function StatusCard({ label, value, ok, detail }: { label: string; value: string; ok: boolean; detail?: string }) {
  return (
    <div
      className={`min-h-[82px] min-w-0 rounded-lg border bg-gradient-to-b from-zinc-100 to-zinc-300 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] print:min-h-[68px] print:px-2 print:py-2 ${
        ok ? "border-zinc-400" : "border-[#ff4d00]"
      }`}
    >
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600 print:text-[8px]">{label}</div>
      <div className={`mt-1 text-[18px] font-black leading-tight print:text-[14px] ${ok ? "text-zinc-950" : "text-[#b93600]"}`} title={value}>
        {value}
      </div>
      {detail ? (
        <div className="mt-1 text-[10px] font-bold leading-snug text-zinc-700 print:text-[8px]" title={detail}>
          {detail}
        </div>
      ) : null}
    </div>
  );
}


function IssuePanel({
  title,
  count,
  variant,
  children,
}: {
  title: string;
  count: number;
  variant: "orangeWhite" | "orangeDark" | "grayWhite" | "grayOrange";
  children: ReactNode;
}) {
  const headerStyles = {
    orangeWhite: "bg-[#ff4d00] text-white",
    orangeDark: "bg-[#ff4d00] text-[#171719]",
    grayWhite: "bg-[#3a3f46] text-white",
    grayOrange: "bg-[#3a3f46] text-[#ff6a2a]",
  } as const;

  return (
    <section className="report-section overflow-hidden rounded-lg border border-[#ff4d00] bg-[#151518]">
      <div className={`flex items-center justify-between px-3 py-2 text-[12px] print:px-2.5 print:py-1.5 print:text-[9px] font-black uppercase tracking-[0.06em] ${headerStyles[variant]}`}>
        <span>{title}</span><span>{count}</span>
      </div>
      <div>{children}</div>
    </section>
  );
}

function CompactFighterRow({ partij, naam, va, status }: { partij: string; naam: string; va: string; status: string }) {
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)_150px] gap-2 border-b border-zinc-700 px-3 py-2 text-[12px] last:border-0 print:grid-cols-[52px_minmax(0,1fr)_110px] print:px-2 print:py-1 print:text-[9px]">
      <b className="text-[#ff7a42]">{partij.startsWith("T") ? partij : `P${partij}`}</b>
      <div className="min-w-0"><b className="block text-white">{naam}</b><span className="text-zinc-400">VA {va}</span></div>
      <b className="text-right text-[#ff6a2a]">{status}</b>
    </div>
  );
}

export default function OfficialRapportPage() {
  const params = useParams();
  const router = useRouter();
  const matchmakingId = String((params as any)?.matchmakingId ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<AnyRow | null>(null);
  const [event, setEvent] = useState<AnyRow | null>(null);
  const [ctx, setCtx] = useState<AnyRow[]>([]);
  const [tournamentCtx, setTournamentCtx] = useState<AnyRow[]>([]);
  const [actueel, setActueel] = useState<AnyRow[]>([]);
  const [results, setResults] = useState<AnyRow[]>([]);
  const [disp, setDisp] = useState<AnyRow[]>([]);

  useEffect(() => {
    if (!matchmakingId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authedFetch(`/api/rapport/official-eindrapport?matchmaking_id=${encodeURIComponent(matchmakingId)}`, { cache: "no-store" });
        const raw = await res.text();
        let json: any = {};
        try { json = raw ? JSON.parse(raw) : {}; } catch {
          throw new Error(res.status === 401 ? "Je sessie is verlopen of niet geldig. Log opnieuw in." : (raw || "Eindrapport gaf geen geldige JSON terug."));
        }
        if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Eindrapport kon niet worden geladen.");
        setRun(json.run ?? null);
        setEvent(json.event ?? null);
        setCtx(json.bout_context ?? []);
        setTournamentCtx(json.tournament_context ?? []);
        setActueel(json.fighter_actueel ?? []);
        setResults(json.resultaten ?? []);
        setDisp(json.dispensaties ?? []);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [matchmakingId]);

  const summary = useMemo(() => {
    const allBoutRows = ctx.filter((r) => Number(r?.partij_nr) > 0);
    const ordinary = allBoutRows.filter((r) => !isToernooi(r));

    const vaContext = new Map<string, { partij: string; naam: string }>();
    for (const row of allBoutRows) {
      const pn = Number(row?.partij_nr);
      const partij = Number.isFinite(pn) && pn > 0 ? String(pn) : (tournamentCode(row) || "Toernooi");
      for (const side of ["rood", "blauw"] as const) {
        const va = normalizeVa(row?.[`${side}_va_mm`] ?? row?.[`${side}_va_fp`] ?? row?.[`va_${side}`] ?? row?.[`${side}_va`] ?? row?.[`${side}_fighter_id`]);
        if (!va || vaContext.has(va)) continue;
        const naam = safe(row?.[`${side}_naam_fp`] ?? row?.[`${side}_naam_mm`] ?? row?.[`${side}_naam`], `VA ${va}`);
        vaContext.set(va, { partij, naam });
      }
    }
    // Ook deelnemers meenemen die nog niet in een latere toernooipairing staan.
    for (const row of tournamentCtx) {
      const va = normalizeVa(row?.va_nummer ?? row?.fighter_id);
      if (!va || vaContext.has(va)) continue;
      vaContext.set(va, { partij: tournamentCode(row) || "Toernooi", naam: safe(row?.naam_fp ?? row?.naam_mm ?? row?.naam, `VA ${va}`) });
    }

    const expectedVas = Array.from(vaContext.keys());
    const actualByVa = new Map<string, AnyRow>(actueel.map((r): [string, AnyRow] => [normalizeVa(r?.va_nummer), r]));
    let licenseBad = 0, startBad = 0, missingLive = 0;
    const blockers: Blocker[] = []; // alle vereiste dispensaties die niet zijn goedgekeurd blokkeren eventstatus
    const attention: Attention[] = [];
    const keurmerkIssueMap = new Map<string, KeurmerkIssue>();
    const licentieIssues: FighterIssue[] = [];
    const startverbodIssues: FighterIssue[] = [];
    const liveIssues: FighterIssue[] = [];

    for (const va of expectedVas) {
      const r = actualByVa.get(va);
      const context = vaContext.get(va);
      const partij = context?.partij ?? "-";
      const wie = `${context?.naam ?? `VA ${va}`} · VA ${va}`;
      if (!r || r?.error_message || typeof r?.licentie_ok !== "boolean" || typeof r?.startverbod_actief !== "boolean" || typeof r?.keurmerk_ok !== "boolean") {
        missingLive++;
        liveIssues.push({
          key: `live-${va}`, partij, va, naam: context?.naam ?? `VA ${va}`,
          detail: safe(r?.error_message, "Actuele FightPassport-controle is niet compleet."),
        });
        continue;
      }
      if (r.licentie_ok !== true) {
        licenseBad++;
        licentieIssues.push({ key: `lic-${va}`, partij, va, naam: context?.naam ?? `VA ${va}` });
      }
      if (r.startverbod_actief === true) {
        startBad++;
        startverbodIssues.push({ key: `sv-${va}`, partij, va, naam: context?.naam ?? `VA ${va}` });
      }
      if (r.keurmerk_ok !== true) {
        const sportschool = safe(r?.sportschool, "Sportschool onbekend");
        const land = safe(r?.land, "-");
        const schoolKey = `${norm(sportschool)}|${norm(land)}`;
        const existing = keurmerkIssueMap.get(schoolKey);

        if (existing) {
          if (!existing.partijen.includes(partij)) existing.partijen.push(partij);
          existing.vechters.push({
            partij,
            va,
            naam: context?.naam ?? `VA ${va}`,
          });
        } else {
          keurmerkIssueMap.set(schoolKey, {
            key: `keur-${schoolKey || va}`,
            sportschool,
            land,
            partijen: [partij],
            vechters: [{
              partij,
              va,
              naam: context?.naam ?? `VA ${va}`,
            }],
          });
        }
      }
    }

    const keurmerkIssues = Array.from(keurmerkIssueMap.values()).map((issue) => ({
      ...issue,
      partijen: [...issue.partijen].sort((a, b) => {
        const an = Number(a);
        const bn = Number(b);
        if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
        return String(a).localeCompare(String(b), "nl");
      }),
    }));
    const keurmerkBad = keurmerkIssues.length;

    const activeVerboden = results.filter((r) => !isApprovedReview(r?.review_status) && norm(r?.resultaat) !== "ok" && isVerbodResult(r));
    const verbodIssues: Blocker[] = activeVerboden.map((r) => {
      const partij = Number(r?.partij_nr) > 0 ? safe(r?.partij_nr) : safe(r?.toernooi_code, "Toernooi");
      return {
        key: `verbod-${r.id ?? r.rule_code}-${partij}`,
        partij,
        label: safe(r?.rule ?? r?.rule_code, "VERBOD"),
        detail: safe(r?.boodschap ?? r?.rule ?? r?.rule_code),
      };
    });

    const reqByKey = new Map<string, AnyRow[]>();
    for (const r of disp) {
      const key = requestDispKey(r); if (!key) continue;
      const arr = reqByKey.get(key) ?? []; arr.push(r); reqByKey.set(key, arr);
    }

    // Zowel gewone partijen als bestaande toernooipairings gebruiken dezelfde duurzame VA-pair identiteit.
    const requiredRows = new Set<AnyRow>();
    for (const result of results.filter(isDispResult)) {
      const pn = Number(result?.partij_nr);
      if (pn > 0) {
        const row = allBoutRows.find((x) => Number(x?.partij_nr) === pn); if (row) requiredRows.add(row);
        continue;
      }
      const code = String(result?.toernooi_code ?? "").trim().toUpperCase();
      const fighterVa = normalizeVa(result?.toernooi_va_nummer ?? result?.fighter_id ?? result?.va_nummer);
      if (!code) continue;
      for (const row of allBoutRows.filter((x) => tournamentCode(x) === code)) {
        const rowVas = [normalizeVa(row?.rood_va_mm ?? row?.va_rood ?? row?.rood_va), normalizeVa(row?.blauw_va_mm ?? row?.va_blauw ?? row?.blauw_va)];
        if (!fighterVa || rowVas.includes(fighterVa)) requiredRows.add(row);
      }
    }

    let dispRequired = 0, dispApproved = 0, dispPending = 0, dispRejected = 0, dispNotRequested = 0;
    const seenDisp = new Set<string>();
    for (const row of allBoutRows) {
      const pn = Number(row?.partij_nr);
      const key = ctxDispKey(matchmakingId, row);
      const requests = key ? reqByKey.get(key) ?? [] : [];
      const required = requiredRows.has(row);
      if (!required && requests.length === 0) continue;
      const identity = key ?? `pn:${pn}`;
      if (seenDisp.has(identity)) continue; seenDisp.add(identity);
      if (required) dispRequired++;
      const state: DispState = requests.length ? aggregateDisp(requests) : "not_requested";
      if (state === "approved") dispApproved++;
      if (state === "pending") dispPending++;
      if (state === "rejected") dispRejected++;
      if (state === "not_requested") dispNotRequested++;
      if (required && state !== "approved") {
        const label = state === "rejected" ? "Dispensatie afgewezen" : state === "pending" ? "Dispensatie aangevraagd" : "Dispensatie niet aangevraagd";
        blockers.push({ key: `disp-${identity}`, partij: safe(row?.partij_label ?? pn), label, detail: `${safe(row?.rood_naam_fp ?? row?.rood_naam_mm)} / ${safe(row?.blauw_naam_fp ?? row?.blauw_naam_mm)}` });
      }
    }

    // Operationeel aandachtspunt: J+ is jeugd met hoofdcontact. Dit blokkeert het akkoord niet.
    for (const row of allBoutRows.filter(isJPlus)) {
      const pn = Number(row?.partij_nr);
      attention.push({
        key: `jplus-${pn}-${tournamentCode(row)}`,
        partij: safe(pn),
        label: "J+ · JEUGD MET HOOFDCONTACT",
        detail: "Informeer de scheidsrechter vóór aanvang dat dit een jeugdpartij met hoofdcontact betreft.",
      });
    }

    // 8-man C is niet automatisch verboden: finale kan op een andere wedstrijddag plaatsvinden.
    const tGroups = new Map<string, AnyRow[]>();
    for (const r of tournamentCtx) {
      const code = tournamentCode(r) || "TOERNOOI";
      const arr = tGroups.get(code) ?? []; arr.push(r); tGroups.set(code, arr);
    }
    for (const [code, rows] of tGroups) {
      const vas = new Set(rows.map((r) => normalizeVa(r?.va_nummer ?? r?.fighter_id)).filter(Boolean));
      const klasses = new Set(rows.map((r) => tournamentClassToken(r?.klasse_mm ?? r?.klasse)).filter(Boolean));
      if (vas.size >= 8 && klasses.has("C")) {
        attention.push({
          key: `8c-${code}`,
          partij: code,
          label: "8-MAN C-TOERNOOI",
          detail: "Controleer of de finale op een andere wedstrijddag plaatsvindt, zodat een C-klasser het maximaal toegestane aantal partijen op één dag niet overschrijdt.",
        });
      }
    }

    const gala = calcGalaMinutes(ctx, event?.datum);
    const requestedHours = Number(event?.aantal_uren);
    const targetMins = [6, 7, 8].includes(requestedHours) ? requestedHours * 60 : null;
    // Dit is de definitieve eindcontrole voor de officials.
    // Hier geldt geen voorlopige +30/+15 minuten marge meer: maximaal +10 minuten.
    const margeMinuten = 10;
    const galaOk = gala.unknown === 0 && targetMins != null && gala.total <= targetMins + margeMinuten && gala.total <= 510;
    const akkoord =
      licenseBad === 0 &&
      startBad === 0 &&
      keurmerkBad === 0 &&
      missingLive === 0 &&
      activeVerboden.length === 0 &&
      blockers.length === 0 &&
      galaOk;
    return {
      ordinary, allBoutRows, expectedVas, licenseBad, startBad, keurmerkBad, missingLive,
      activeVerboden, verbodIssues, dispRequired, dispApproved, dispPending, dispRejected,
      dispNotRequested, gala, requestedHours, galaOk, margeMinuten, blockers, attention,
      keurmerkIssues, licentieIssues, startverbodIssues, liveIssues, akkoord
    };
  }, [ctx, tournamentCtx, actueel, results, disp, event, matchmakingId]);

  if (loading) return <div className="p-8">Eindrapport laden…</div>;
  if (error) return <div className="p-8 text-red-700">{error}</div>;

  const shownBlockers = summary.blockers;

  return (
    <main className="min-h-screen bg-[#151518] p-4 text-zinc-100 print:min-h-[297mm] print:bg-[#202024] print:p-0 print:text-zinc-100">
      <style jsx global>{`
        @page{size:A4;margin:0}
        *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
        @media print{
          html,body{
            width:210mm!important;
            min-height:297mm!important;
            margin:0!important;
            padding:0!important;
            background:#202024!important;
          }
          body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
          .no-print{display:none!important}
          .a4{
            width:210mm!important;
            max-width:210mm!important;
            min-height:297mm!important;
            margin:0!important;
            border:0!important;
            border-radius:0!important;
            box-shadow:none!important;
            background:#202024!important;
          }
          .report-section{break-inside:avoid-page}
          .a4>div:last-child{font-size:8px}
        }
      `}</style>

      <div className="no-print mx-auto mb-3 flex max-w-[1120px] justify-between gap-2">
        <button onClick={() => router.back()} className="rounded-md border border-zinc-500 bg-[#242428] px-4 py-2 text-sm font-black text-white hover:border-[#ff4d00]">← Terug</button>
        <button onClick={() => window.print()} className="rounded-md border border-[#ff6a2a] bg-[#ff4d00] px-4 py-2 text-sm font-black text-black shadow-[0_0_18px_rgba(255,77,0,0.25)]">Print / PDF</button>
      </div>

      <section className="a4 mx-auto min-h-[277mm] max-w-[1120px] overflow-hidden rounded-xl border border-zinc-600 bg-[#202024] shadow-2xl print:max-w-[210mm] print:rounded-none">
        <div className="h-2 bg-[#ff4d00]" />

        <header className="flex items-center justify-between gap-4 border-b border-zinc-600 bg-gradient-to-b from-[#35353a] to-[#242428] px-5 py-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-[#ff6a2a]">FightSupport · NVB</div>
            <h1 className="mt-0.5 text-xl font-black leading-none text-white">Eindrapport Officials</h1>
            <div className="mt-1 text-[10px] font-medium text-zinc-300">Laatste eindcontrole voor de dienstdoende hoofdofficial</div>
          </div>
          <div className={`min-w-[145px] rounded-md border-2 px-3 py-2 text-center shadow-[0_0_18px_rgba(0,0,0,0.18)] ${
            summary.akkoord
              ? "border-[#39a85a] bg-[#176b35] text-white"
              : "border-[#e4483e] bg-[#a9231c] text-white"
          }`}>
            <div className="text-[10px] font-black uppercase tracking-wider text-white/80">Eventstatus</div>
            <div className="text-base font-black leading-tight text-white">{summary.akkoord ? "AKKOORD" : "NIET AKKOORD"}</div>
          </div>
        </header>

        <div className="px-6 py-4 print:px-5 print:py-3">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-zinc-500 bg-zinc-500 text-[12px] sm:grid-cols-4 xl:grid-cols-8 print:grid-cols-8 print:text-[9px]">
            {[
              ["Evenement", safe(event?.naam)],
              ["Datum", formatDate(event?.datum)],
              ["Locatie", safe(event?.locatie)],
              ["Promotor", safe(event?.promotor)],
              ["Matchmaker", safe(event?.matchmaker_naam)],
              ["Partijen", String(summary.allBoutRows.length)],
              ["Controlerun", formatDate(run?.afgerond_op ?? run?.gestart_op)],
              ["Ingesteld", [6,7,8].includes(summary.requestedHours) ? `${summary.requestedHours} uur` : "-"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 bg-gradient-to-b from-zinc-100 to-zinc-300 px-2 py-1.5 text-zinc-950">
                <div className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-600 print:text-[7px]">{label}</div>
                <div className="mt-0.5 truncate font-bold leading-tight text-zinc-950" title={String(value)}>{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-1.5 items-stretch">
            <StatusCard
              label="Licentie"
              value={
                summary.licenseBad === 0 && summary.missingLive === 0
                  ? "Alle licenties geldig"
                  : summary.licenseBad === 1
                    ? "1 ongeldige licentie"
                    : summary.licenseBad > 1
                      ? `${summary.licenseBad} ongeldige licenties`
                      : `${summary.missingLive} controle(s) onvolledig`
              }
              detail={summary.missingLive > 0 ? `${summary.missingLive} controle(s) onvolledig` : undefined}
              ok={summary.licenseBad === 0 && summary.missingLive === 0}
            />
            <StatusCard
              label="Startverbod"
              value={summary.startBad === 0 ? "0 actief" : `${summary.startBad} actief`}
              ok={summary.startBad === 0}
            />
            <StatusCard
              label="Keurmerk"
              value={summary.keurmerkBad === 0 && summary.missingLive === 0 ? "alles akkoord" : `${summary.keurmerkBad + summary.missingLive} probleem`}
              detail={summary.keurmerkBad > 0 ? `${summary.keurmerkBad} sportschool/scholen` : undefined}
              ok={summary.keurmerkBad === 0 && summary.missingLive === 0}
            />
            <StatusCard
              label="Verboden partijen"
              value={summary.activeVerboden.length === 0 ? "0" : `${summary.activeVerboden.length} probleem`}
              detail={summary.activeVerboden.length > 0 ? "zie blokkades hieronder" : undefined}
              ok={summary.activeVerboden.length === 0}
            />
            <StatusCard
              label="Dispensaties"
              value={summary.dispRequired === 0 ? "geen nodig" : `${summary.dispApproved}/${summary.dispRequired} akkoord`}
              detail={
                summary.dispRequired === 0
                  ? undefined
                  : [
                      summary.dispPending ? `${summary.dispPending} open` : "",
                      summary.dispRejected ? `${summary.dispRejected} afgewezen` : "",
                      summary.dispNotRequested ? `${summary.dispNotRequested} niet aangevraagd` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "alles goedgekeurd"
              }
              ok={summary.dispPending === 0 && summary.dispRejected === 0 && summary.dispNotRequested === 0}
            />
            <StatusCard
              label="Galaduur"
              value={formatDuration(summary.gala.total)}
              detail={
                summary.gala.unknown
                  ? `${summary.gala.unknown} klasse(s) onbekend`
                  : [6,7,8].includes(summary.requestedHours)
                    ? `${summary.requestedHours} uur ingesteld · definitief max ${formatDuration(summary.requestedHours * 60 + summary.margeMinuten)}`
                    : "6/7/8 uur niet ingesteld"
              }
              ok={summary.galaOk}
            />
          </div>

          <div className="mt-2 grid gap-2 md:grid-cols-2 print:grid-cols-2 print:gap-1.5">
            {summary.licentieIssues.length > 0 ? (
              <IssuePanel title="Vechters zonder geldige licentie" count={summary.licentieIssues.length} variant="orangeWhite">
                {summary.licentieIssues.map((x) => (
                  <CompactFighterRow key={x.key} partij={x.partij} naam={x.naam} va={x.va} status="GEEN LICENTIE" />
                ))}
              </IssuePanel>
            ) : null}

            {summary.startverbodIssues.length > 0 ? (
              <IssuePanel title="Vechters met actueel startverbod" count={summary.startverbodIssues.length} variant="grayOrange">
                {summary.startverbodIssues.map((x) => (
                  <CompactFighterRow key={x.key} partij={x.partij} naam={x.naam} va={x.va} status="STARTVERBOD" />
                ))}
              </IssuePanel>
            ) : null}

            {summary.keurmerkIssues.length > 0 ? (
              <IssuePanel title="Sportscholen zonder geldig keurmerk" count={summary.keurmerkIssues.length} variant="orangeDark">
                {summary.keurmerkIssues.map((x) => {
                  const partijLabels = x.partijen.map((p) => (p.startsWith("T") ? p : `P${p}`));
                  return (
                    <div key={x.key} className="grid grid-cols-[145px_minmax(0,1fr)_minmax(0,1.35fr)] gap-2 border-b border-zinc-700 px-3 py-2 text-[12px] last:border-0 print:grid-cols-[105px_minmax(0,1fr)_minmax(0,1.35fr)] print:px-2 print:py-1 print:text-[9px]">
                      <b className="text-[#ff7a42]">{partijLabels.join(", ")}</b>
                      <div className="min-w-0">
                        <b className="block truncate text-white">{x.sportschool}</b>
                        <span className="text-zinc-400">{x.land}</span>
                      </div>
                      <div className="min-w-0 text-zinc-200">
                        <b className="block text-zinc-100">
                          {x.vechters.length} {x.vechters.length === 1 ? "vechter" : "vechters"}
                        </b>
                        <span className="text-zinc-400">
                          {x.vechters.map((v) => v.naam).join(" · ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </IssuePanel>
            ) : null}

            {summary.verbodIssues.length > 0 ? (
              <IssuePanel title="Partijen met actief verbod" count={summary.verbodIssues.length} variant="grayWhite">
                {summary.verbodIssues.map((x) => (
                  <div key={x.key} className="grid grid-cols-[64px_175px_1fr] gap-2 border-b border-zinc-700 px-3 py-2 text-[12px] last:border-0 print:grid-cols-[52px_115px_1fr] print:px-2 print:py-1 print:text-[9px]">
                    <b className="text-[#ff7a42]">{x.partij.startsWith("T") ? x.partij : `P${x.partij}`}</b>
                    <b className="truncate text-[#ff6a2a]">{x.label}</b>
                    <span className="text-zinc-200">{x.detail}</span>
                  </div>
                ))}
              </IssuePanel>
            ) : null}

            {summary.liveIssues.length > 0 ? (
              <IssuePanel title="Onvolledige FightPassport-controles" count={summary.liveIssues.length} variant="grayOrange">
                {summary.liveIssues.map((x) => (
                  <CompactFighterRow key={x.key} partij={x.partij} naam={x.naam} va={x.va} status={x.detail || "ONVOLLEDIG"} />
                ))}
              </IssuePanel>
            ) : null}
          </div>

          {summary.blockers.length > 0 ? (
            <div className="report-section mt-2 overflow-hidden rounded-lg border border-[#ff4d00] bg-gradient-to-b from-zinc-100 to-zinc-300 text-zinc-950 print:mt-1.5">
              <div className="flex items-center justify-between bg-[#ff4d00] px-3 py-2 text-[12px] font-black uppercase tracking-[0.06em] text-white print:px-2.5 print:py-1.5 print:text-[9px]">
                <span>Blokkerende dispensaties</span>
                <span>{summary.blockers.length}</span>
              </div>
              <div className="grid md:grid-cols-2 print:grid-cols-2">
                {shownBlockers.map((b) => (
                  <div key={b.key} className="grid grid-cols-[64px_155px_1fr] gap-2 border-b border-r border-zinc-400/60 px-3 py-2 text-[12px] print:grid-cols-[52px_105px_1fr] print:gap-1 print:px-2 print:py-1 print:text-[9px]">
                    <b>{b.partij.startsWith("T") ? b.partij : `P${b.partij}`}</b>
                    <b className="text-[#b93600]">{b.label}</b>
                    <span>{b.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {summary.attention.length > 0 ? (
            <div className="report-section mt-2 overflow-hidden rounded-lg border border-zinc-500 bg-gradient-to-b from-zinc-100 to-zinc-300 text-zinc-950 print:mt-1.5">
              <div className="bg-[#3a3a40] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-white">
                Informatie hoofdofficial · talentstatus / toernooi ({summary.attention.length})
              </div>
              <div className="grid md:grid-cols-2 print:grid-cols-2">
                {summary.attention.map((a) => (
                  <div key={a.key} className="grid grid-cols-[64px_175px_1fr] gap-2 border-b border-r border-zinc-400/60 px-3 py-2 text-[12px] print:grid-cols-[52px_120px_1fr] print:gap-1 print:px-2 print:py-1 print:text-[9px]">
                    <b>{a.partij.startsWith("T") ? a.partij : `P${a.partij}`}</b>
                    <b className="text-[#b93600]">{a.label}</b>
                    <span>{a.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {summary.akkoord ? (
            <div className="report-section mt-2 rounded-lg border border-zinc-500 bg-gradient-to-b from-zinc-100 to-zinc-300 px-3 py-2 text-[11px] font-bold text-zinc-950 print:mt-1.5 print:py-1">
              Geen blokkerende controles gevonden. Het evenement is akkoord voor overdracht aan de hoofdofficial.
            </div>
          ) : null}

          <footer className="mt-3 border-t border-zinc-600 pt-2 text-[9px] text-zinc-400">
            FightSupport eindcontrole · actuele FightPassport-data · statusmoment {new Date().toLocaleString("nl-NL")}.
          </footer>
        </div>
      </section>
    </main>
  );
}