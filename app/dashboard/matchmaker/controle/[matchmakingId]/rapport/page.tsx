"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type PartijStatus = "OK" | "AFKEUR" | "DISPENSATIE" | "ACTIE" | "VERBOD";

type ControleRun = {
  id: string;
  matchmaking_id: string;
  status: string | null;
  gestart_op: string | null;
  afgerond_op: string | null;
  run_type: string | null;
};

type EventMeta = {
  id: string | null;
  event_id?: string | null;
  naam: string | null;
  datum: string | null;
  bondteam?: string | null;
  source?: "matchmaking_uploads" | "events" | null;
};

type ResultRow = {
  partij_nr: number | null;
  rule: string | null;
  rule_code: string | null;
  resultaat: string | null;
  boodschap: string | null;
  aantekeningen: string | null;
  created_at: string | null;
  review_status?: string | null;
  hoek?: "rood" | "blauw" | null;
};

type AuditEvent = {
  partij_nr: number | null;
  hoek: "rood" | "blauw" | null;
  event_type: string | null;
  old_va: string | null;
  new_va: string | null;
  actor_email: string | null;
  created_at: string | null;
  reason: string | null;
};

type IssueSummaryItem = {
  partij_nr: number;
  partij: string;
  hoek: "rood" | "blauw";
  naam: string;
  gym: string;
  label: string;
  detail: string;
};

type VerbodSummaryItem = {
  partij_nr: number;
  partij: string;
  hoek: "rood" | "blauw";
  naam: string;
  gym: string;
  type: "STARTVERBOD" | "VERBOD";
  detail: string;
};

function safe(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function safeRaw(v: any) {
  return String(v ?? "").trim();
}

function normalizeVa(v: any) {
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[-–—]/g, "")
    .toUpperCase();
}

function fmtNlDateOnly(v: any) {
  if (!v) return "-";
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" });
}

function fmtDateTime(v: any) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" });
}

function normCode(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function normResultaatLower(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "afkeur" || s === "afgekeurd" || s === "afkeuren") return "afgekeurd";
  if (s === "dispensatie" || s === "disp") return "dispensatie";
  if (s === "actie" || s === "waarschuwing") return "actie";
  if (s === "ok" || s === "goedgekeurd" || s === "info") return "ok";
  if (s === "verbod") return "verbod";
  return s;
}

function isApprovedOrClosed(review_status: any) {
  if (review_status == null) return false;
  const raw = String(review_status).trim().toLowerCase();
  if (!raw) return false;

  const tokens = raw
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/g)
    .filter(Boolean);

  const tset = new Set(tokens);
  const hasAny = (...t: string[]) => t.some((x) => tset.has(x));

  if (
    hasAny(
      "approved",
      "approve",
      "accepted",
      "ok",
      "akkoord",
      "done",
      "closed",
      "resolved",
      "complete",
      "completed"
    )
  ) {
    return true;
  }

  if (hasAny("goedgekeurd", "afgehandeld")) return true;
  if (tset.has("goed") && !tset.has("niet")) return true;
  if (raw.includes("goedgekeurd") || raw.includes("afgehandeld")) return true;

  return false;
}

function rowHaystack(row: ResultRow) {
  return `${row.rule_code ?? ""} ${row.rule ?? ""} ${row.boodschap ?? ""} ${row.aantekeningen ?? ""}`.toLowerCase();
}

function isNameMismatch(row: ResultRow) {
  const c = normCode(row.rule_code);
  return c.startsWith("VECHTER_NAAM_MISMATCH") || c.startsWith("VECHTER_NAAM_ANDERS");
}

function isVARow(row: ResultRow) {
  const hay = rowHaystack(row);
  const c = normCode(row.rule_code);
  return (
    c.includes("VA") ||
    hay.includes("fightpaspoort") ||
    hay.includes("va nummer") ||
    hay.includes("va-nummer") ||
    hay.includes("v.a.") ||
    hay.includes("passport nummer")
  );
}

function isMissingVARow(row: ResultRow) {
  const hay = rowHaystack(row);
  const c = normCode(row.rule_code);
  return (
    c.includes("VA_ONTBREEKT") ||
    c.includes("VA_MISSING") ||
    c.includes("FIGHTPASPOORT_ONTBREEKT") ||
    c.includes("FIGHTPASPOORT_MISSING") ||
    c.includes("GEEN_VA") ||
    (isVARow(row) &&
      (hay.includes("ontbreekt") ||
        hay.includes("missing") ||
        hay.includes("geen va") ||
        hay.includes("geen fightpaspoort") ||
        hay.includes("leeg va") ||
        hay.includes("va ontbreekt") ||
        hay.includes("fightpaspoort ontbreekt") ||
        hay.includes("geen nummer") ||
        hay.includes("nummer ontbreekt")))
  );
}

function isGenericMissingVARow(row: ResultRow) {
  const text = `${row.rule ?? ""} ${row.boodschap ?? ""}`.trim().toLowerCase().replace(/\s+/g, " ");

  return (
    text === "fightpaspoortnummer ontbreekt" ||
    text === "fightpaspoort nummer ontbreekt" ||
    text === "va nummer ontbreekt" ||
    text === "fight passport nummer ontbreekt" ||
    text === "fightpaspoort ontbreekt"
  );
}

function missingVARowSpecificity(row: ResultRow) {
  const msg = safeRaw(row.boodschap ?? row.rule);
  let score = 0;

  if (!isGenericMissingVARow(row)) score += 100;
  if (msg) score += Math.min(msg.length, 80);
  if (safeRaw(row.aantekeningen)) score += 10;
  if (safeRaw(row.rule_code)) score += 5;

  return score;
}

function dedupeRows(rows: ResultRow[]) {
  const missingVaBest = new Map<string, ResultRow>();
  const otherRows: ResultRow[] = [];

  for (const row of rows) {
    if (isMissingVARow(row)) {
      const pn = Number(row.partij_nr);
      const hoek = inferHoek(row) ?? "onbekend";
      const key = `${Number.isFinite(pn) ? pn : "x"}-${hoek}-missing-va`;
      const prev = missingVaBest.get(key);

      if (!prev) {
        missingVaBest.set(key, row);
        continue;
      }

      const prevScore = missingVARowSpecificity(prev);
      const nextScore = missingVARowSpecificity(row);

      if (nextScore > prevScore) {
        missingVaBest.set(key, row);
        continue;
      }

      if (nextScore === prevScore) {
        const prevTime = prev.created_at ? new Date(prev.created_at).getTime() : 0;
        const nextTime = row.created_at ? new Date(row.created_at).getTime() : 0;
        if (nextTime > prevTime) {
          missingVaBest.set(key, row);
        }
      }

      continue;
    }

    otherRows.push(row);
  }

  return [...otherRows, ...Array.from(missingVaBest.values())];
}

function isFightpaspoortGewijzigd(row: ResultRow) {
  const c = normCode(row.rule_code);
  if (
    c.startsWith("VA_NUMMER_AANGEPAST") ||
    c.includes("VA_CHANGED") ||
    c.includes("VA_WIJZIG") ||
    c.includes("VA_UPDATED") ||
    c.includes("FIGHTPASPOORT_GEWIJZIGD") ||
    c.includes("FIGHTPASPOORT_AANGEPAST")
  ) {
    return true;
  }

  const hay = rowHaystack(row);
  return (
    hay.includes("fightpaspoort nummer gewijzigd") ||
    hay.includes("va nummer gewijzigd") ||
    hay.includes("va aangepast") ||
    hay.includes("fightpaspoort aangepast") ||
    hay.includes("gewijzigd van") ||
    hay.includes("aangepast van") ||
    hay.includes("oude va") ||
    hay.includes("nieuwe va")
  );
}

function isBelgischeContextRow(row: ResultRow) {
  const hay = rowHaystack(row);
  return (
    hay.includes("belgië") ||
    hay.includes("belgie") ||
    hay.includes("belgische") ||
    hay.includes("bkbmo") ||
    hay.includes("boksboekje")
  );
}

function isBelgischeManualCheckRow(row: ResultRow) {
  const hay = rowHaystack(row);
  return (
    isBelgischeContextRow(row) &&
    (hay.includes("bkbmo") ||
      hay.includes("boksboekje") ||
      hay.includes("belgië") ||
      hay.includes("belgie") ||
      hay.includes("belgische sportschool") ||
      hay.includes("controleer sportschool op bkbmo") ||
      hay.includes("land: belgië") ||
      hay.includes("land: belgie"))
  );
}

function isKeurmerkRow(row: ResultRow) {
  const c = String(row.rule_code ?? "").toLowerCase();
  const r = String(row.rule ?? "").toLowerCase();
  const b = String(row.boodschap ?? "").toLowerCase();
  const hay = `${c} ${r} ${b}`;
  return hay.includes("keurmerk") || hay.includes("gym keurmerk") || hay.includes("sportschool keurmerk");
}

function isSportschoolMatchRow(row: ResultRow) {
  const c = String(row.rule_code ?? "").toLowerCase();
  const r = String(row.rule ?? "").toLowerCase();
  const b = String(row.boodschap ?? "").toLowerCase();
  const hay = `${c} ${r} ${b}`;

  return (
    hay.includes("sportschool_niet_gevonden") ||
    hay.includes("geen match in sportscholen") ||
    hay.includes("sportschool niet gevonden") ||
    hay.includes("lege/ongeldige sportschoolnaam") ||
    hay.includes("ongeldige sportschoolnaam") ||
    hay.includes("leeg sportschool") ||
    hay.includes("geen sportschool match")
  );
}

function isLicentieRow(row: ResultRow) {
  const c = String(row.rule_code ?? "").toLowerCase();
  const r = String(row.rule ?? "").toLowerCase();
  const b = String(row.boodschap ?? "").toLowerCase();
  const hay = `${c} ${r} ${b}`;
  return hay.includes("licentie") || hay.includes("license");
}

function inferHoek(row: ResultRow): "rood" | "blauw" | null {
  if (row.hoek === "rood" || row.hoek === "blauw") return row.hoek;

  const c = String(row.rule_code ?? "").toLowerCase();
  const r = String(row.rule ?? "").toLowerCase();
  const b = String(row.boodschap ?? "").toLowerCase();
  const hay = `${c} ${r} ${b}`;

  if (hay.includes("_rood") || hay.includes(" rood") || hay.includes("rode hoek") || hay.includes("hoek rood")) {
    return "rood";
  }

  if (hay.includes("_blauw") || hay.includes(" blauw") || hay.includes("blauwe hoek") || hay.includes("hoek blauw")) {
    return "blauw";
  }

  return null;
}

function isVerbodRow(row: ResultRow) {
  const c = normCode(row.rule_code ?? row.rule);
  if (c.includes("STARTVERBOD")) return false;
  if (c.startsWith("VERBOD_")) return true;
  if (c.startsWith("VERBODZONDER") || c.startsWith("VERBOD_ZONDER")) return true;
  if (c.includes("JEUGD_VOLWASSEN_MIX")) return true;
  if (c.includes("LEEFTIJD_VERSCHIL") && c.includes("AFKEUR")) return true;

  const r = String(row.rule ?? "").toUpperCase();
  const b = String(row.boodschap ?? "").toUpperCase();
  return r.includes("VERBOD") || b.includes("VERBOD");
}

function isStartverbodRow(row: ResultRow) {
  const c = normCode(row.rule_code ?? row.rule);
  return c.includes("STARTVERBOD");
}

function isVaAuditEventType(v: any) {
  const c = normCode(v);
  return (
    c === "VA_CHANGED" ||
    c === "VA_UPDATED" ||
    c === "VA_NUMMER_AANGEPAST" ||
    c === "FIGHTPASPOORT_GEWIJZIGD" ||
    c === "FIGHTPASPOORT_AANGEPAST"
  );
}

function getCurrentVaFromCtx(ctx: any, hoek: "rood" | "blauw") {
  if (hoek === "rood") {
    return safeRaw(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.rood_va);
  }
  return safeRaw(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.blauw_va);
}

function getPrevVaFromCtx(ctx: any, hoek: "rood" | "blauw") {
  if (hoek === "rood") {
    return safeRaw(ctx?.rood_va_mm_prev);
  }
  return safeRaw(ctx?.blauw_va_mm_prev);
}

function hasPrevVaField(ctx: any, hoek: "rood" | "blauw") {
  if (hoek === "rood") {
    return ctx?.rood_va_mm_prev !== undefined && ctx?.rood_va_mm_prev !== null;
  }
  return ctx?.blauw_va_mm_prev !== undefined && ctx?.blauw_va_mm_prev !== null;
}

function statusFromResultaat(resultaat: any, rule_code?: any): PartijStatus {
  if (rule_code) {
    const c = String(rule_code ?? "").toUpperCase();
    if (c.includes("JEUGD_VOLWASSEN_MIX")) return "VERBOD";
    if (c.includes("LEEFTIJD_VERSCHIL") && c.includes("AFKEUR")) return "VERBOD";
    if (c.includes("VERBOD")) return "VERBOD";
    if (c.includes("AFKEUR")) return "AFKEUR";
  }

  const s = String(resultaat ?? "").trim().toLowerCase();
  if (s === "verbod") return "VERBOD";
  if (s === "afkeur" || s === "afgekeurd") return "AFKEUR";
  if (s === "dispensatie") return "DISPENSATIE";
  if (s === "actie") return "ACTIE";
  return "OK";
}

function statusPrio(s: PartijStatus) {
  return s === "VERBOD" ? 0 : s === "AFKEUR" ? 1 : s === "DISPENSATIE" ? 2 : s === "ACTIE" ? 3 : 9;
}

function partyStatusVoorMeldingen(meldingen: ResultRow[]): PartijStatus {
  if (!meldingen?.length) return "OK";
  let best: PartijStatus = "OK";
  let bestP = 999;
  for (const m of meldingen) {
    const st = statusFromResultaat(m.resultaat, m.rule_code);
    const p = statusPrio(st);
    if (p < bestP) {
      bestP = p;
      best = st;
    }
  }
  return best;
}

function licentieIsProbleem(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  return s !== "ja";
}

function licentieLabel(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  return s || "onbekend";
}

function maxGewichtLabel(p: any) {
  const raw = p.max_gewicht ?? p.maxgewicht ?? p.max_kg ?? null;
  if (raw == null || raw === "") return "-";
  return String(raw).replace(".", ",");
}

function Badge({ status }: { status: PartijStatus }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide";
  if (status === "VERBOD") return <span className={`${base} bg-purple-700 text-white`}>VERBOD</span>;
  if (status === "AFKEUR") return <span className={`${base} bg-red-600 text-white`}>AFKEUR</span>;
  if (status === "DISPENSATIE") return <span className={`${base} bg-yellow-400 text-black`}>DISPENSATIE</span>;
  if (status === "ACTIE") return <span className={`${base} bg-orange-500 text-black`}>ACTIE</span>;
  return <span className={`${base} bg-green-600 text-white`}>OK</span>;
}

function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-t-xl bg-[#ff4d00] px-4 py-2 text-sm font-black text-black">
      <div>{children}</div>
      {right ? <div className="text-xs font-bold text-black/80">{right}</div> : null}
    </div>
  );
}

function FsLogo() {
  const candidates = [
    "/branding/fightsupport/excel-logo.png",
    "/branding/fightsupport/logo-header.png",
    "/branding/fightsupport/logo.png",
  ];

  const [src, setSrc] = useState<string>(candidates[0]);

  useEffect(() => {
    let alive = true;

    (async () => {
      for (const c of candidates) {
        try {
          const r = await fetch(c, { method: "HEAD" });
          if (!alive) return;
          if (r.ok) {
            setSrc(c);
            return;
          }
        } catch {
          // ignore
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <img
      src={src}
      alt="FightSupport"
      className="mx-auto h-auto max-h-[86px] w-auto object-contain"
      onError={() => setSrc(candidates[candidates.length - 1])}
    />
  );
}

function rowBg(idx: number) {
  return idx % 2 === 0 ? "bg-white text-black" : "bg-[#eef1f4] text-black";
}

function keurmerkTekst(row: ResultRow) {
  return `${row.rule_code ?? ""} ${row.rule ?? ""} ${row.boodschap ?? ""} ${row.aantekeningen ?? ""}`.toLowerCase();
}

function isKeurmerkOpenIssue(row: ResultRow) {
  if (!isKeurmerkRow(row)) return false;
  if (isBelgischeManualCheckRow(row)) return false;

  const tekst = keurmerkTekst(row);

  if (!isApprovedOrClosed(row.review_status)) {
    return true;
  }

  if (normResultaatLower(row.resultaat) !== "ok") {
    return true;
  }

  if (
    tekst.includes("geen match") ||
    tekst.includes("geen match gevonden") ||
    tekst.includes("niet gevonden") ||
    tekst.includes("geen data") ||
    tekst.includes("onvoldoende data") ||
    tekst.includes("meerdere matches") ||
    tekst.includes("ambigue") ||
    tekst.includes("verlopen") ||
    tekst.includes("expiry") ||
    tekst.includes("expired") ||
    tekst.includes("geen keurmerk") ||
    tekst.includes("zonder keurmerk") ||
    tekst.includes("ongeldig keurmerk") ||
    tekst.includes("keurmerk datum ontbreekt") ||
    tekst.includes("geen keurmerkdatum") ||
    tekst.includes("geen datum") ||
    tekst.includes("datum ontbreekt")
  ) {
    return true;
  }

  return false;
}

async function getEventMeta(matchmaking_id: string): Promise<EventMeta> {
  try {
    const { data: up, error: upErr } = await supabase
      .from("matchmaking_uploads")
      .select("event_id, evenement_naam, evenement_datum, matchmaking_id, bondteam")
      .or(`id.eq.${matchmaking_id},matchmaking_id.eq.${matchmaking_id}`)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (upErr) throw upErr;

    const uploadEventId = (up as any)?.event_id ? String((up as any).event_id) : null;

    if (uploadEventId) {
      const { data: ev, error: evErr } = await supabase
        .from("events")
        .select("id, naam, datum")
        .eq("id", uploadEventId)
        .maybeSingle();

      if (!evErr && ev) {
        return {
          id: String((ev as any)?.id ?? uploadEventId),
          event_id: uploadEventId,
          naam: (ev as any)?.naam ?? (up as any)?.evenement_naam ?? null,
          datum: (ev as any)?.datum ?? (up as any)?.evenement_datum ?? null,
          bondteam: (up as any)?.bondteam ?? null,
          source: "events",
        };
      }
    }

    return {
      id: String((up as any)?.matchmaking_id ?? matchmaking_id),
      event_id: uploadEventId,
      naam: (up as any)?.evenement_naam ?? null,
      datum: (up as any)?.evenement_datum ?? null,
      bondteam: (up as any)?.bondteam ?? null,
      source: "matchmaking_uploads",
    };
  } catch {
    return { id: null, naam: null, datum: null, bondteam: null, source: null };
  }
}

export default function RapportPage() {
  const params = useParams();
  const matchmakingId = String((params as any)?.matchmakingId ?? "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<ControleRun | null>(null);
  const [eventMeta, setEventMeta] = useState<EventMeta | null>(null);
  const [ctxRows, setCtxRows] = useState<any[]>([]);
  const [resultaten, setResultaten] = useState<ResultRow[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    if (!matchmakingId) return;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: runRows, error: runErr } = await supabase
          .from("controle_runs")
          .select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type")
          .eq("matchmaking_id", matchmakingId)
          .order("gestart_op", { ascending: false })
          .limit(1);

        if (runErr) throw runErr;
        const lastRun = (runRows ?? [])[0] ?? null;
        setRun(lastRun);

        const em = await getEventMeta(matchmakingId);
        setEventMeta(em);

        if (!lastRun?.id) {
          setCtxRows([]);
          setResultaten([]);
          setAuditEvents([]);
          setLoading(false);
          return;
        }

        const { data: ctx, error: ctxErr } = await supabase
          .from("controle_bout_context")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("controle_run_id", lastRun.id)
          .order("partij_nr", { ascending: true });

        if (ctxErr) throw ctxErr;
        setCtxRows(ctx ?? []);

        const { data: res, error: resErr } = await supabase
          .from("controle_resultaten")
          .select("partij_nr, rule, rule_code, resultaat, boodschap, aantekeningen, created_at, review_status, hoek")
          .eq("controle_run_id", lastRun.id);

        if (resErr) throw resErr;
        setResultaten((res ?? []) as ResultRow[]);

        const { data: aud, error: audErr } = await supabase
          .from("controle_audit_events")
          .select("partij_nr, hoek, event_type, old_va, new_va, actor_email, created_at, reason")
          .eq("controle_run_id", lastRun.id)
          .eq("matchmaking_id", matchmakingId)
          .order("created_at", { ascending: false });

        if (audErr) {
          console.warn("audit load failed:", audErr.message);
          setAuditEvents([]);
        } else {
          setAuditEvents((aud ?? []) as AuditEvent[]);
        }
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [matchmakingId]);

  const openMeldingen = useMemo(() => {
    const filtered = (resultaten ?? []).filter((r) => {
      if (isNameMismatch(r) && !isFightpaspoortGewijzigd(r)) return false;

      if (isMissingVARow(r)) {
        if (isApprovedOrClosed(r.review_status)) return false;
        return true;
      }

      if (isFightpaspoortGewijzigd(r)) {
        return true;
      }

      if (isBelgischeManualCheckRow(r)) {
        if (isApprovedOrClosed(r.review_status)) return false;
        if (normResultaatLower(r.resultaat) === "ok") return false;
        return true;
      }

      if (isKeurmerkOpenIssue(r)) return true;

      if (isSportschoolMatchRow(r) && !isApprovedOrClosed(r.review_status)) {
        return true;
      }

      if (isApprovedOrClosed(r.review_status)) return false;
      if (normResultaatLower(r.resultaat) === "ok") return false;

      return true;
    });

    return dedupeRows(filtered);
  }, [resultaten]);

  const openKeurmerkRows = useMemo(() => {
    return (resultaten ?? []).filter((r) => isKeurmerkOpenIssue(r) && !isBelgischeManualCheckRow(r));
  }, [resultaten]);

  const ctxByPartij = useMemo(() => {
    const map = new Map<number, any>();
    for (const p of ctxRows ?? []) {
      const pn = Number(p.partij_nr);
      if (!Number.isFinite(pn)) continue;
      map.set(pn, p);
    }
    return map;
  }, [ctxRows]);

  const verbodStartverbodIssues = useMemo(() => {
    const items: VerbodSummaryItem[] = [];
    const seen = new Set<string>();

    for (const r of resultaten ?? []) {
      const resultaat = normResultaatLower(r.resultaat);

      let type: "STARTVERBOD" | "VERBOD" | null = null;

      if (isStartverbodRow(r)) {
        if (resultaat === "ok") continue;
        type = "STARTVERBOD";
      } else if (isVerbodRow(r)) {
        if (isApprovedOrClosed(r.review_status)) continue;
        if (resultaat === "ok") continue;
        type = "VERBOD";
      } else {
        continue;
      }

      const pn = Number(r.partij_nr);
      const hoek = inferHoek(r);
      if (!Number.isFinite(pn) || !hoek) continue;

      const ctx = ctxByPartij.get(pn);
      const naam =
        hoek === "rood"
          ? safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm)
          : safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm);

      const gym =
        hoek === "rood"
          ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym)
          : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym);

      const detail = safe(r.boodschap ?? r.rule ?? r.rule_code ?? type);
      const key = `${type}-${pn}-${hoek}-${detail}`;
      if (seen.has(key)) continue;
      seen.add(key);

      items.push({
        partij_nr: pn,
        partij: safe(ctx?.partij_label ?? pn),
        hoek,
        naam,
        gym,
        type,
        detail,
      });
    }

    return items.sort((a, b) => {
      if (a.partij_nr !== b.partij_nr) return a.partij_nr - b.partij_nr;
      if (a.type !== b.type) return a.type === "STARTVERBOD" ? -1 : 1;
      if (a.hoek !== b.hoek) return a.hoek.localeCompare(b.hoek);
      return a.naam.localeCompare(b.naam, "nl");
    });
  }, [resultaten, ctxByPartij]);

  const meldByPartij = useMemo(() => {
    const m = new Map<number, ResultRow[]>();
    for (const r of openMeldingen) {
      const pn = Number(r.partij_nr);
      if (!Number.isFinite(pn)) continue;
      const arr = m.get(pn) ?? [];
      arr.push(r);
      m.set(pn, arr);
    }
    for (const [pn, arr] of m.entries()) {
      arr.sort(
        (a, b) =>
          statusPrio(statusFromResultaat(a.resultaat, a.rule_code)) -
          statusPrio(statusFromResultaat(b.resultaat, b.rule_code))
      );
      m.set(pn, arr);
    }
    return m;
  }, [openMeldingen]);

  const licentieMetaByPartijHoek = useMemo(() => {
    const map = new Map<string, { hasRow: boolean; state: "ok" | "issue" | null }>();

    for (const r of resultaten ?? []) {
      if (!isLicentieRow(r)) continue;
      const pn = Number(r.partij_nr);
      const hoek = inferHoek(r);
      if (!Number.isFinite(pn) || !hoek) continue;
      const key = `${pn}-${hoek}`;
      const prev = map.get(key) ?? { hasRow: false, state: null as "ok" | "issue" | null };
      prev.hasRow = true;

      if (isApprovedOrClosed(r.review_status) || normResultaatLower(r.resultaat) === "ok") {
        prev.state = "ok";
      } else {
        if (prev.state !== "ok") prev.state = "issue";
      }

      map.set(key, prev);
    }

    return map;
  }, [resultaten]);

  const partijenCompact = useMemo(() => {
    return (ctxRows ?? []).map((p: any) => {
      const pn = Number(p.partij_nr);
      const meldingen = Number.isFinite(pn) ? meldByPartij.get(pn) ?? [] : [];
      return {
        partij_nr: pn,
        partij_label: safe(p.partij_label ?? p.partij_nr),
        discipline: safe(p.discipline),
        klasse: safe(p.klasse_mm ?? p.klasse),
        max_gewicht: maxGewichtLabel(p),
        rood: safe(p.rood_naam_fp ?? p.rood_naam_mm),
        rood_gym: safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym),
        blauw: safe(p.blauw_naam_fp ?? p.blauw_naam_mm),
        blauw_gym: safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym),
        status: partyStatusVoorMeldingen(meldingen),
      };
    });
  }, [ctxRows, meldByPartij]);

  const licentieIssues = useMemo(() => {
    const items: IssueSummaryItem[] = [];

    for (const p of ctxRows ?? []) {
      const pn = Number(p.partij_nr);
      if (!Number.isFinite(pn)) continue;
      const partij = safe(p.partij_label ?? p.partij_nr);

      const add = (hoek: "rood" | "blauw", naam: string, gym: string, detail: string) => {
        items.push({
          partij_nr: pn,
          partij,
          hoek,
          naam,
          gym,
          label: "Licentie",
          detail,
        });
      };

      const roodKey = `${pn}-rood`;
      const blauwKey = `${pn}-blauw`;

      const roodMeta = licentieMetaByPartijHoek.get(roodKey);
      const blauwMeta = licentieMetaByPartijHoek.get(blauwKey);

      const roodIssue =
        roodMeta?.state === "ok"
          ? false
          : roodMeta?.state === "issue"
            ? true
            : roodMeta?.hasRow
              ? false
              : licentieIsProbleem(p.rood_licentie);

      const blauwIssue =
        blauwMeta?.state === "ok"
          ? false
          : blauwMeta?.state === "issue"
            ? true
            : blauwMeta?.hasRow
              ? false
              : licentieIsProbleem(p.blauw_licentie);

      if (roodIssue) {
        add(
          "rood",
          safe(p.rood_naam_fp ?? p.rood_naam_mm),
          safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym),
          `licentie: ${licentieLabel(p.rood_licentie)}`
        );
      }

      if (blauwIssue) {
        add(
          "blauw",
          safe(p.blauw_naam_fp ?? p.blauw_naam_mm),
          safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym),
          `licentie: ${licentieLabel(p.blauw_licentie)}`
        );
      }
    }

    return items.sort((a, b) => {
      if (a.partij_nr !== b.partij_nr) return a.partij_nr - b.partij_nr;
      if (a.hoek !== b.hoek) return a.hoek.localeCompare(b.hoek);
      return a.naam.localeCompare(b.naam, "nl");
    });
  }, [ctxRows, licentieMetaByPartijHoek]);

  const missingVaIssues = useMemo(() => {
    const items: IssueSummaryItem[] = [];

    const missingRows = dedupeRows(
      (resultaten ?? []).filter((r) => {
        if (!isMissingVARow(r)) return false;
        if (isApprovedOrClosed(r.review_status)) return false;
        return true;
      })
    );

    for (const r of missingRows) {
      const pn = Number(r.partij_nr);
      const hoek = inferHoek(r);
      if (!Number.isFinite(pn) || !hoek) continue;

      const ctx = ctxByPartij.get(pn);
      items.push({
        partij_nr: pn,
        partij: safe(ctx?.partij_label ?? pn),
        hoek,
        naam: hoek === "rood" ? safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm) : safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm),
        gym:
          hoek === "rood"
            ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym)
            : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym),
        label: "VA ontbreekt",
        detail: safe(r.boodschap ?? r.rule ?? "Fightpaspoortnummer ontbreekt"),
      });
    }

    return items.sort((a, b) => {
      if (a.partij_nr !== b.partij_nr) return a.partij_nr - b.partij_nr;
      if (a.hoek !== b.hoek) return a.hoek.localeCompare(b.hoek);
      return a.naam.localeCompare(b.naam, "nl");
    });
  }, [resultaten, ctxByPartij]);

  const keurmerkIssues = useMemo(() => {
    const items: IssueSummaryItem[] = [];
    const seen = new Set<string>();

    for (const r of openKeurmerkRows) {
      const pn = Number(r.partij_nr);
      const hoek = inferHoek(r);
      if (!Number.isFinite(pn) || !hoek) continue;

      const ctx = ctxByPartij.get(pn);
      const naam =
        hoek === "rood"
          ? safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm)
          : safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm);

      const gym =
        hoek === "rood"
          ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym)
          : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym);

      const detail = safe(r.boodschap ?? r.rule ?? "geen geldig of geen herkend keurmerk");
      const key = `${pn}-${hoek}-${detail}`;
      if (seen.has(key)) continue;
      seen.add(key);

      items.push({
        partij_nr: pn,
        partij: safe(ctx?.partij_label ?? pn),
        hoek,
        naam,
        gym,
        label: "Keurmerk",
        detail,
      });
    }

    return items.sort((a, b) => {
      if (a.partij_nr !== b.partij_nr) return a.partij_nr - b.partij_nr;
      if (a.hoek !== b.hoek) return a.hoek.localeCompare(b.hoek);
      return a.naam.localeCompare(b.naam, "nl");
    });
  }, [openKeurmerkRows, ctxByPartij]);

  const fightpaspoortGewijzigd = useMemo(() => {
    const items: IssueSummaryItem[] = [];
    const seen = new Set<string>();

    for (const p of ctxRows ?? []) {
      const pn = Number(p.partij_nr);
      if (!Number.isFinite(pn)) continue;
      const partij = safe(p.partij_label ?? p.partij_nr);

      const roodPrevRaw = getPrevVaFromCtx(p, "rood");
      const roodCurrentRaw = getCurrentVaFromCtx(p, "rood");
      const roodPrev = normalizeVa(roodPrevRaw);
      const roodCurrent = normalizeVa(roodCurrentRaw);
      const roodHasPrevField = hasPrevVaField(p, "rood");

      if (roodHasPrevField && roodPrev !== roodCurrent) {
        const naam = safe(p.rood_naam_fp ?? p.rood_naam_mm);
        items.push({
          partij_nr: pn,
          partij,
          hoek: "rood",
          naam,
          gym: safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym),
          label: "Fightpaspoort gewijzigd",
          detail: `${naam}: ${roodPrevRaw || "-"} → ${roodCurrentRaw || "-"}`,
        });
        seen.add(`${pn}-rood`);
      }

      const blauwPrevRaw = getPrevVaFromCtx(p, "blauw");
      const blauwCurrentRaw = getCurrentVaFromCtx(p, "blauw");
      const blauwPrev = normalizeVa(blauwPrevRaw);
      const blauwCurrent = normalizeVa(blauwCurrentRaw);
      const blauwHasPrevField = hasPrevVaField(p, "blauw");

      if (blauwHasPrevField && blauwPrev !== blauwCurrent) {
        const naam = safe(p.blauw_naam_fp ?? p.blauw_naam_mm);
        items.push({
          partij_nr: pn,
          partij,
          hoek: "blauw",
          naam,
          gym: safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym),
          label: "Fightpaspoort gewijzigd",
          detail: `${naam}: ${blauwPrevRaw || "-"} → ${blauwCurrentRaw || "-"}`,
        });
        seen.add(`${pn}-blauw`);
      }
    }

    for (const ev of auditEvents ?? []) {
      if (!isVaAuditEventType(ev.event_type)) continue;

      const pn = Number(ev.partij_nr);
      if (!Number.isFinite(pn)) continue;
      const hoek = (ev.hoek ?? "rood") as "rood" | "blauw";
      const key = `${pn}-${hoek}`;
      if (seen.has(key)) continue;

      const oldNorm = normalizeVa(ev.old_va);
      const newNorm = normalizeVa(ev.new_va);
      if (oldNorm === newNorm) continue;

      const ctx = ctxByPartij.get(pn);
      const naam =
        hoek === "rood"
          ? safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm)
          : safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm);

      items.push({
        partij_nr: pn,
        partij: safe(ctx?.partij_label ?? pn),
        hoek,
        naam,
        gym:
          hoek === "rood"
            ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym)
            : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym),
        label: "Fightpaspoort gewijzigd",
        detail: `${naam}: ${safe(ev.old_va, "-")} → ${safe(ev.new_va, "-")}`,
      });
      seen.add(key);
    }

    for (const r of resultaten ?? []) {
      if (!isFightpaspoortGewijzigd(r)) continue;

      const pn = Number(r.partij_nr);
      const hoek = inferHoek(r);
      if (!Number.isFinite(pn) || !hoek) continue;

      const key = `${pn}-${hoek}`;
      if (seen.has(key)) continue;

      const ctx = ctxByPartij.get(pn);
      const naam =
        hoek === "rood"
          ? safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm)
          : safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm);

      items.push({
        partij_nr: pn,
        partij: safe(ctx?.partij_label ?? pn),
        hoek,
        naam,
        gym:
          hoek === "rood"
            ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym)
            : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym),
        label: "Fightpaspoort gewijzigd",
        detail: `${naam}: ${safe(r.boodschap ?? r.rule ?? "Fightpaspoortnummer gewijzigd")}`,
      });
      seen.add(key);
    }

    return items.sort((a, b) => {
      if (a.partij_nr !== b.partij_nr) return a.partij_nr - b.partij_nr;
      return a.hoek.localeCompare(b.hoek);
    });
  }, [auditEvents, ctxByPartij, ctxRows, resultaten]);

  const sportschoolIssues = useMemo(() => {
    const geenKeurmerk = new Set<string>();
    const geenData = new Set<string>();
    const verlopen = new Set<string>();
    const datumOntbreekt = new Set<string>();
    const nietGevonden = new Set<string>();
    const belgischeCheck = new Set<string>();

    for (const r of resultaten ?? []) {
      const isRelevant =
        isBelgischeManualCheckRow(r) ||
        isKeurmerkOpenIssue(r) ||
        (isSportschoolMatchRow(r) && !isApprovedOrClosed(r.review_status));

      if (!isRelevant) continue;

      const tekst = `${r.rule_code ?? ""} ${r.rule ?? ""} ${r.boodschap ?? ""} ${r.aantekeningen ?? ""}`.toLowerCase();
      const quoted = String(r.boodschap ?? "").match(/"([^"]+)"/);
      const pn = Number(r.partij_nr);
      const hoek = inferHoek(r);
      const ctx = Number.isFinite(pn) ? ctxByPartij.get(pn) : null;

      const gymFromCtx =
        hoek === "rood"
          ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym, "")
          : hoek === "blauw"
            ? safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym, "")
            : "";

      const gym = quoted?.[1]?.trim() || gymFromCtx || "-";
      if (!gym) continue;

      if (isBelgischeManualCheckRow(r)) {
        belgischeCheck.add(gym);
        continue;
      }

      const isNietGevonden =
        tekst.includes("sportschool_niet_gevonden") ||
        tekst.includes("geen match in sportscholen") ||
        tekst.includes("sportschool niet gevonden") ||
        tekst.includes("lege/ongeldige sportschoolnaam") ||
        tekst.includes("ongeldige sportschoolnaam");

      const isGeenData =
        tekst.includes("geen match gevonden") ||
        tekst.includes("niet gevonden op bkbmo") ||
        tekst.includes("geen data") ||
        tekst.includes("onvoldoende data") ||
        tekst.includes("meerdere matches") ||
        tekst.includes("ambigue");

      const isDatumOntbreekt =
        tekst.includes("keurmerk datum ontbreekt") ||
        tekst.includes("geen keurmerkdatum") ||
        (tekst.includes("keurmerk") && tekst.includes("datum ontbreekt")) ||
        (tekst.includes("expiry") && tekst.includes("missing")) ||
        (tekst.includes("vervaldatum") && tekst.includes("ontbreekt"));

      const isVerlopen =
        tekst.includes("verlopen") ||
        tekst.includes("expired") ||
        tekst.includes("expiry verlopen") ||
        (tekst.includes("keurmerk") && tekst.includes("niet meer geldig"));

      const isGeenKeurmerk =
        tekst.includes("geen keurmerk") ||
        tekst.includes("zonder keurmerk") ||
        tekst.includes("ongeldig keurmerk") ||
        tekst.includes("heeft geen geldig keurmerk") ||
        tekst.includes("niet geldig keurmerk");

      if (isNietGevonden) {
        nietGevonden.add(gym);
        continue;
      }

      if (isGeenData) {
        geenData.add(gym);
        continue;
      }

      if (isDatumOntbreekt) {
        datumOntbreekt.add(gym);
        continue;
      }

      if (isVerlopen) {
        verlopen.add(gym);
        continue;
      }

      if (isGeenKeurmerk || !isApprovedOrClosed(r.review_status) || normResultaatLower(r.resultaat) !== "ok") {
        geenKeurmerk.add(gym);
      }
    }

    for (const gym of belgischeCheck) {
      nietGevonden.delete(gym);
      geenData.delete(gym);
      geenKeurmerk.delete(gym);
      verlopen.delete(gym);
      datumOntbreekt.delete(gym);
    }

    for (const gym of nietGevonden) {
      geenData.delete(gym);
      geenKeurmerk.delete(gym);
      verlopen.delete(gym);
      datumOntbreekt.delete(gym);
    }

    for (const gym of geenData) {
      geenKeurmerk.delete(gym);
      verlopen.delete(gym);
      datumOntbreekt.delete(gym);
    }

    for (const gym of datumOntbreekt) {
      geenKeurmerk.delete(gym);
      verlopen.delete(gym);
    }

    for (const gym of verlopen) {
      geenKeurmerk.delete(gym);
    }

    return {
      belgischeCheck: Array.from(belgischeCheck).sort((a, b) => a.localeCompare(b, "nl")),
      nietGevonden: Array.from(nietGevonden).sort((a, b) => a.localeCompare(b, "nl")),
      geenKeurmerk: Array.from(geenKeurmerk).sort((a, b) => a.localeCompare(b, "nl")),
      geenData: Array.from(geenData).sort((a, b) => a.localeCompare(b, "nl")),
      verlopen: Array.from(verlopen).sort((a, b) => a.localeCompare(b, "nl")),
      datumOntbreekt: Array.from(datumOntbreekt).sort((a, b) => a.localeCompare(b, "nl")),
    };
  }, [resultaten, ctxByPartij]);

  const partijMetOpenMeldingen = useMemo(() => {
    return (ctxRows ?? [])
      .map((p: any) => {
        const pn = Number(p.partij_nr);
        if (!Number.isFinite(pn)) return null;
        const meldingen = meldByPartij.get(pn) ?? [];
        if (!meldingen.length) return null;
        return {
          partij_nr: pn,
          partij_label: safe(p.partij_label ?? p.partij_nr),
          status: partyStatusVoorMeldingen(meldingen),
          discipline: safe(p.discipline),
          klasse: safe(p.klasse_mm ?? p.klasse),
          max_gewicht: maxGewichtLabel(p),
          roodNaam: safe(p.rood_naam_fp ?? p.rood_naam_mm),
          roodGym: safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym),
          roodVa: safe(p.rood_va_mm ?? p.va_rood ?? p.rood_va),
          blauwNaam: safe(p.blauw_naam_fp ?? p.blauw_naam_mm),
          blauwGym: safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym),
          blauwVa: safe(p.blauw_va_mm ?? p.va_blauw ?? p.blauw_va),
          meldingen,
        };
      })
      .filter(Boolean) as Array<{
      partij_nr: number;
      partij_label: string;
      status: PartijStatus;
      discipline: string;
      klasse: string;
      max_gewicht: string;
      roodNaam: string;
      roodGym: string;
      roodVa: string;
      blauwNaam: string;
      blauwGym: string;
      blauwVa: string;
      meldingen: ResultRow[];
    }>;
  }, [ctxRows, meldByPartij]);

  if (loading) {
    return <div className="p-6 text-sm">Rapport laden…</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-red-700">Fout: {error}</div>;
  }

  return (
    <div className="fs-report min-h-screen bg-[#eceff3] text-[#111827]">
      <style jsx global>{`
        @page {
          size: A4;
          margin: 10mm;
        }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          html,
          body {
            background: #ffffff !important;
          }

          .no-print {
            display: none !important;
          }

          .print-max {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .page-break {
            page-break-before: always !important;
            break-before: page !important;
          }

          .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .compact-first-page {
            break-after: page;
            page-break-after: always;
          }
        }
      `}</style>

      <div className="print-max mx-auto max-w-6xl px-4 py-5">
        <div className="no-print mb-4 flex items-center justify-between gap-3">
          <Link
            href={`/dashboard/admin/controle/${matchmakingId}`}
            className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            ← Terug
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center rounded-lg bg-[#ff4d00] px-4 py-2 text-sm font-black text-black hover:brightness-105"
          >
            Print / PDF
          </button>
        </div>

        <section className="compact-first-page avoid-break rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
          <div className="rounded-[18px] border border-black/10 bg-[linear-gradient(180deg,#f7f7f7_0%,#ececec_100%)] px-5 py-4">
            <div className="mb-4 text-center">
              <FsLogo />
            </div>

            <div className="grid gap-3 md:grid-cols-[1.3fr,1fr,1fr,1.5fr]">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff4d00]">Evenement</div>
                <div className="text-xl font-black leading-tight">{safe(eventMeta?.naam)}</div>
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff4d00]">Datum</div>
                <div className="text-base font-black">{fmtNlDateOnly(eventMeta?.datum)}</div>
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff4d00]">Bond</div>
                <div className="text-base font-black">{safe(eventMeta?.bondteam)}</div>
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff4d00]">Controle run</div>
                <div className="text-sm font-bold">
                  {safe(run?.status)} • gestart: {fmtDateTime(run?.gestart_op)}
                </div>
                <div className="text-sm font-bold">afgerond: {fmtDateTime(run?.afgerond_op)}</div>
              </div>
            </div>

            <div className="mt-3 text-xs font-semibold text-black/70">Matchmaking ID: {matchmakingId}</div>
          </div>
        </section>

        <section className="page-break rounded-[24px] border border-black/10 bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[18px] border border-black/10">
              <SectionTitle right={`${verbodStartverbodIssues.length}`}>VERBOD / STARTVERBOD</SectionTitle>
              <div className="overflow-x-auto px-3 pb-3">
                <table className="w-full border-separate border-spacing-y-[2px] text-xs">
                  <thead>
                    <tr>
                      <th className="rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Partij</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Type</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Hoek</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Naam</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Gym</th>
                      <th className="rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verbodStartverbodIssues.length ? (
                      verbodStartverbodIssues.map((item, idx) => (
                        <tr key={`${item.type}-${item.partij_nr}-${item.hoek}-${idx}`}>
                          <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`}>{item.partij}</td>
                          <td className={`px-2 py-1.5 font-black ${rowBg(idx)}`}>{item.type}</td>
                          <td className={`px-2 py-1.5 capitalize ${rowBg(idx)}`}>{item.hoek}</td>
                          <td className={`px-2 py-1.5 font-semibold ${rowBg(idx)}`}>{item.naam}</td>
                          <td className={`px-2 py-1.5 ${rowBg(idx)}`}>{item.gym}</td>
                          <td className={`rounded-r-md px-2 py-1.5 ${rowBg(idx)}`}>{item.detail}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="rounded-md bg-white px-3 py-3 text-sm text-black/70">
                          Geen open verboden of startverboden.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-[18px] border border-black/10">
              <SectionTitle right={`${licentieIssues.length}`}>GEEN LICENTIE</SectionTitle>
              <div className="overflow-x-auto px-3 pb-3">
                <table className="w-full border-separate border-spacing-y-[2px] text-xs">
                  <thead>
                    <tr>
                      <th className="rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Partij</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Hoek</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Naam</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Gym</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Soort</th>
                      <th className="rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licentieIssues.length ? (
                      licentieIssues.map((item, idx) => (
                        <tr key={`${item.partij_nr}-${item.hoek}-${item.label}-${idx}`}>
                          <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`}>{item.partij}</td>
                          <td className={`px-2 py-1.5 capitalize ${rowBg(idx)}`}>{item.hoek}</td>
                          <td className={`px-2 py-1.5 font-semibold ${rowBg(idx)}`}>{item.naam}</td>
                          <td className={`px-2 py-1.5 ${rowBg(idx)}`}>{item.gym}</td>
                          <td className={`px-2 py-1.5 font-bold ${rowBg(idx)}`}>{item.label}</td>
                          <td className={`rounded-r-md px-2 py-1.5 ${rowBg(idx)}`}>{item.detail}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="rounded-md bg-white px-3 py-3 text-sm text-black/70">
                          Geen open licentieproblemen.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-[18px] border border-black/10">
              <SectionTitle right={missingVaIssues.length}>ONTBREKENDE VA NUMMERS</SectionTitle>
              <div className="overflow-x-auto px-3 pb-3">
                <table className="w-full border-separate border-spacing-y-[2px] text-xs">
                  <thead>
                    <tr>
                      <th className="rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Partij</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Hoek</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Naam</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Gym</th>
                      <th className="rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingVaIssues.length ? (
                      missingVaIssues.map((item, idx) => (
                        <tr key={`${item.partij_nr}-${item.hoek}-missing-va-${idx}`}>
                          <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`}>{item.partij}</td>
                          <td className={`px-2 py-1.5 capitalize ${rowBg(idx)}`}>{item.hoek}</td>
                          <td className={`px-2 py-1.5 font-semibold ${rowBg(idx)}`}>{item.naam}</td>
                          <td className={`px-2 py-1.5 ${rowBg(idx)}`}>{item.gym}</td>
                          <td className={`rounded-r-md px-2 py-1.5 ${rowBg(idx)}`}>{item.detail}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="rounded-md bg-white px-3 py-3 text-sm text-black/70">
                          Geen.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-[18px] border border-black/10">
              <SectionTitle right={fightpaspoortGewijzigd.length}>FIGHTPASPOORT NUMMER GEWIJZIGD</SectionTitle>
              <div className="overflow-x-auto px-3 pb-3">
                <table className="w-full border-separate border-spacing-y-[2px] text-xs">
                  <thead>
                    <tr>
                      <th className="rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Partij</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Hoek</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Naam</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Gym</th>
                      <th className="rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Wijziging</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fightpaspoortGewijzigd.length ? (
                      fightpaspoortGewijzigd.map((item, idx) => (
                        <tr key={`${item.partij_nr}-${item.hoek}-${idx}`}>
                          <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`}>{item.partij}</td>
                          <td className={`px-2 py-1.5 capitalize ${rowBg(idx)}`}>{item.hoek}</td>
                          <td className={`px-2 py-1.5 font-semibold ${rowBg(idx)}`}>{item.naam}</td>
                          <td className={`px-2 py-1.5 ${rowBg(idx)}`}>{item.gym}</td>
                          <td className={`rounded-r-md px-2 py-1.5 font-bold ${rowBg(idx)}`}>{item.detail}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="rounded-md bg-white px-3 py-3 text-sm text-black/70">
                          Geen.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-[18px] border border-black/10">
              <SectionTitle right={`${sportschoolIssues.belgischeCheck.length}`}>
                BELGIË / BKBMO / BOKSBOEKJE CONTROLE
              </SectionTitle>
              <div className="overflow-x-auto px-3 pb-3">
                <table className="w-full border-separate border-spacing-y-[2px] text-xs">
                  <thead>
                    <tr>
                      <th className="rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Soort</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Waarde</th>
                      <th className="rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sportschoolIssues.belgischeCheck.length ? (
                      sportschoolIssues.belgischeCheck.map((gym, idx) => (
                        <tr key={`belgische-check-${gym}-${idx}`}>
                          <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`}>België / BKBMO check</td>
                          <td className={`px-2 py-1.5 font-semibold ${rowBg(idx)}`}>{gym}</td>
                          <td className={`rounded-r-md px-2 py-1.5 ${rowBg(idx)}`}>
                            Belgische sportschool. Geen NVB-keurmerk vereist; controleer BKBMO-site en boksboekje.
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="rounded-md bg-white px-3 py-3 text-sm text-black/70">
                          Geen open Belgische sportschoolcontroles.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-[18px] border border-black/10">
              <SectionTitle
                right={`${
                  keurmerkIssues.length +
                  sportschoolIssues.nietGevonden.length +
                  sportschoolIssues.geenKeurmerk.length +
                  sportschoolIssues.geenData.length +
                  sportschoolIssues.verlopen.length +
                  sportschoolIssues.datumOntbreekt.length
                }`}
              >
                KEURMERK CONTROLE
              </SectionTitle>
              <div className="space-y-4 px-3 pb-3">
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-y-[2px] text-xs">
                    <thead>
                      <tr>
                        <th className="rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Soort</th>
                        <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Waarde</th>
                        <th className="rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sportschoolIssues.nietGevonden.length === 0 &&
                      sportschoolIssues.geenKeurmerk.length === 0 &&
                      sportschoolIssues.geenData.length === 0 &&
                      sportschoolIssues.verlopen.length === 0 &&
                      sportschoolIssues.datumOntbreekt.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="rounded-md bg-white px-3 py-3 text-sm text-black/70">
                            Geen.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {sportschoolIssues.nietGevonden.map((gym, idx) => (
                            <tr key={`niet-gevonden-${gym}-${idx}`}>
                              <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`}>Niet gevonden</td>
                              <td className={`px-2 py-1.5 font-semibold ${rowBg(idx)}`}>{gym}</td>
                              <td className={`rounded-r-md px-2 py-1.5 ${rowBg(idx)}`}>
                                Sportschool niet gevonden. Onbekend of sportschool keurmerk heeft.
                              </td>
                            </tr>
                          ))}

                          {sportschoolIssues.geenKeurmerk.map((gym, idx) => {
                            const offset = sportschoolIssues.nietGevonden.length + idx;
                            return (
                              <tr key={`geen-keurmerk-${gym}-${idx}`}>
                                <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(offset)}`}>Zonder geldig keurmerk</td>
                                <td className={`px-2 py-1.5 font-semibold ${rowBg(offset)}`}>{gym}</td>
                                <td className={`rounded-r-md px-2 py-1.5 ${rowBg(offset)}`}>Sportschool heeft geen geldig keurmerk</td>
                              </tr>
                            );
                          })}

                          {sportschoolIssues.verlopen.map((gym, idx) => {
                            const offset =
                              sportschoolIssues.nietGevonden.length +
                              sportschoolIssues.geenKeurmerk.length +
                              idx;
                            return (
                              <tr key={`verlopen-${gym}-${idx}`}>
                                <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(offset)}`}>Keurmerk verlopen</td>
                                <td className={`px-2 py-1.5 font-semibold ${rowBg(offset)}`}>{gym}</td>
                                <td className={`rounded-r-md px-2 py-1.5 ${rowBg(offset)}`}>Keurmerk aanwezig maar verlopen</td>
                              </tr>
                            );
                          })}

                          {sportschoolIssues.datumOntbreekt.map((gym, idx) => {
                            const offset =
                              sportschoolIssues.nietGevonden.length +
                              sportschoolIssues.geenKeurmerk.length +
                              sportschoolIssues.verlopen.length +
                              idx;
                            return (
                              <tr key={`datum-ontbreekt-${gym}-${idx}`}>
                                <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(offset)}`}>Datum ontbreekt</td>
                                <td className={`px-2 py-1.5 font-semibold ${rowBg(offset)}`}>{gym}</td>
                                <td className={`rounded-r-md px-2 py-1.5 ${rowBg(offset)}`}>Keurmerkdatum ontbreekt</td>
                              </tr>
                            );
                          })}

                          {sportschoolIssues.geenData.map((gym, idx) => {
                            const offset =
                              sportschoolIssues.nietGevonden.length +
                              sportschoolIssues.geenKeurmerk.length +
                              sportschoolIssues.verlopen.length +
                              sportschoolIssues.datumOntbreekt.length +
                              idx;
                            return (
                              <tr key={`geen-data-${gym}-${idx}`}>
                                <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(offset)}`}>Niet gevonden / geen data</td>
                                <td className={`px-2 py-1.5 font-semibold ${rowBg(offset)}`}>{gym}</td>
                                <td className={`rounded-r-md px-2 py-1.5 ${rowBg(offset)}`}>Sportschool niet gevonden of onvoldoende data</td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                <div>
                  <div className="mb-2 text-sm font-black">Open keurmerkmeldingen per vechter</div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-y-[2px] text-xs">
                      <thead>
                        <tr>
                          <th className="rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Partij</th>
                          <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Hoek</th>
                          <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Naam</th>
                          <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Gym</th>
                          <th className="rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {keurmerkIssues.length ? (
                          keurmerkIssues.map((item, idx) => (
                            <tr key={`${item.partij_nr}-${item.hoek}-keurmerk-${idx}`}>
                              <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`}>{item.partij}</td>
                              <td className={`px-2 py-1.5 capitalize ${rowBg(idx)}`}>{item.hoek}</td>
                              <td className={`px-2 py-1.5 font-semibold ${rowBg(idx)}`}>{item.naam}</td>
                              <td className={`px-2 py-1.5 ${rowBg(idx)}`}>{item.gym}</td>
                              <td className={`rounded-r-md px-2 py-1.5 ${rowBg(idx)}`}>{item.detail}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="rounded-md bg-white px-3 py-3 text-sm text-black/70">
                              Geen open keurmerkproblemen.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {partijMetOpenMeldingen.map((item) => (
              <section
                key={item.partij_nr}
                className="avoid-break overflow-hidden rounded-[18px] border border-black/10 bg-[linear-gradient(180deg,#f9f9f9_0%,#eeeeee_100%)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#ff4d00] px-4 py-2">
                  <div className="text-sm font-black text-black">
                    Partij {item.partij_label} • {item.discipline} • {item.klasse} • max {item.max_gewicht} kg
                  </div>
                  <Badge status={item.status} />
                </div>

                <div className="grid gap-3 p-4 md:grid-cols-2">
                  <div className="rounded-xl border border-black/10 bg-white px-3 py-3">
                    <div className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#ff4d00]">Rood</div>
                    <div className="font-black">{item.roodNaam}</div>
                    <div className="text-sm text-black/75">{item.roodGym}</div>
                    <div className="mt-1 text-xs font-bold text-black/60">VA: {item.roodVa}</div>
                  </div>
                  <div className="rounded-xl border border-black/10 bg-white px-3 py-3">
                    <div className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#ff4d00]">Blauw</div>
                    <div className="font-black">{item.blauwNaam}</div>
                    <div className="text-sm text-black/75">{item.blauwGym}</div>
                    <div className="mt-1 text-xs font-bold text-black/60">VA: {item.blauwVa}</div>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <div className="mb-2 text-sm font-black">Open meldingen</div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-y-[2px] text-sm">
                      <thead>
                        <tr>
                          <th className="w-[110px] rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">
                            Resultaat
                          </th>
                          <th className="w-[280px] bg-[#3a3f46] px-2 py-1 text-left font-black text-white">
                            Regel
                          </th>
                          <th className="rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">
                            Melding
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.meldingen.map((m, idx) => {
                          const st = statusFromResultaat(m.resultaat, m.rule_code);
                          return (
                            <tr key={`${item.partij_nr}-${idx}-${m.rule_code || m.rule || "melding"}`}>
                              <td className={`rounded-l-md px-2 py-2 ${rowBg(idx)}`}>
                                <Badge status={st} />
                              </td>
                              <td className={`px-2 py-2 font-mono text-[12px] ${rowBg(idx)}`}>
                                {safe(m.rule_code ?? m.rule)}
                              </td>
                              <td className={`rounded-r-md px-2 py-2 ${rowBg(idx)}`}>
                                <div>{safe(m.boodschap ?? m.rule)}</div>
                                {m.aantekeningen ? (
                                  <div className="mt-1 text-xs opacity-80">Notitie: {m.aantekeningen}</div>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="page-break mt-4 overflow-hidden rounded-[18px] border border-black/10">
            <SectionTitle right={`${partijenCompact.length} partijen`}>TOTAAL OVERZICHT PARTIJEN</SectionTitle>
            <div className="overflow-x-auto px-3 pb-3">
              <table className="w-full table-fixed border-separate border-spacing-y-[2px] text-[10px] leading-[1.15] md:text-[11px]">
                <thead>
                  <tr>
                    <th className="w-[42px] rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Nr</th>
                    <th className="w-[95px] bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Disc.</th>
                    <th className="w-[90px] bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Klasse</th>
                    <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Rood</th>
                    <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Gym</th>
                    <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Blauw</th>
                    <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Gym</th>
                    <th className="w-[70px] bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Max KG</th>
                    <th className="w-[92px] rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {partijenCompact.map((p, idx) => (
                    <tr key={p.partij_nr || idx}>
                      <td className={`rounded-l-md px-2 py-[5px] font-black ${rowBg(idx)}`}>{p.partij_label}</td>
                      <td className={`px-2 py-[5px] ${rowBg(idx)}`}>{p.discipline}</td>
                      <td className={`px-2 py-[5px] ${rowBg(idx)}`}>{p.klasse}</td>
                      <td className={`truncate px-2 py-[5px] font-semibold ${rowBg(idx)}`} title={p.rood}>
                        {p.rood}
                      </td>
                      <td className={`truncate px-2 py-[5px] ${rowBg(idx)}`} title={p.rood_gym}>
                        {p.rood_gym}
                      </td>
                      <td className={`truncate px-2 py-[5px] font-semibold ${rowBg(idx)}`} title={p.blauw}>
                        {p.blauw}
                      </td>
                      <td className={`truncate px-2 py-[5px] ${rowBg(idx)}`} title={p.blauw_gym}>
                        {p.blauw_gym}
                      </td>
                      <td className={`${rowBg(idx)} px-2 py-[5px]`}>{p.max_gewicht}</td>
                      <td className={`rounded-r-md px-2 py-[5px] ${rowBg(idx)}`}>
                        <Badge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}