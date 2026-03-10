"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import NvbTable from "@/components/NvbTable";

type PartijStatus = "OK" | "AFKEUR" | "DISPENSATIE" | "ACTIE";

type ControleRun = {
  id: string;
  matchmaking_id: string;
  status: string | null;
  gestart_op: string | null;
  afgerond_op: string | null;
  run_type: string | null;
};

type EventMeta = {
  id: string | null; // matchmaking_uploads.id (matchmaking_id)
  event_id?: string | null; // optional FK to events
  naam: string | null;
  datum: string | null;
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
  event_type: string | null; // "RESCRAPE" | "VA_CHANGED" | "RESCRAPE_NO_VA"
  old_va: string | null;
  new_va: string | null;
  actor_email: string | null;
  created_at: string | null;
  reason: string | null;
};

function safe(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
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

function isApprovedOrClosed(review_status: any) {
  if (review_status == null) return false;
  const raw = String(review_status).trim().toLowerCase();
  if (!raw) return false;

  // ✅ tolerant: "GOEDGEKEURD ✅", "approved (by ...)", "closed/afgehandeld", etc.
  // We split into tokens so we don't accidentally match "niet goed" as approved.
  const tokens = raw
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/g)
    .filter(Boolean);

  const tset = new Set(tokens);
  const hasAny = (...t: string[]) => t.some((x) => tset.has(x));

  if (hasAny("approved", "approve", "accepted", "ok", "akkoord", "done", "closed", "resolved", "complete", "completed")) {
    return true;
  }

  // NL varianten
  if (hasAny("goedgekeurd", "afgehandeld")) return true;

  // "goed" is alleen een approval als het een los token is (en niet in "niet goed")
  if (tset.has("goed") && !tset.has("niet")) return true;

  // last resort (suffix/prefix) – voor rare waarden zoals "status_goedgekeurd"
  if (raw.includes("goedgekeurd") || raw.includes("afgehandeld")) return true;
  return false;
}

/**
 * ✅ Naam mismatch / naam anders NOOIT tonen in rapport
 * (maar "Fightpaspoort nummer gewijzigd" wél, dat is aparte melding)
 */
function isNameMismatch(row: ResultRow) {
  const c = normCode(row.rule_code);
  return c.startsWith("VECHTER_NAAM_MISMATCH") || c.startsWith("VECHTER_NAAM_ANDERS");
}

/**
 * ✅ "Fightpaspoort nummer gewijzigd" melding tonen
 * - liefst via rule_code VA_NUMMER_AANGEPAST_*
 * - maar ook tolerant: als rule/boodschap die tekst bevat
 */
function isFightpaspoortGewijzigd(row: ResultRow) {
  const c = normCode(row.rule_code);
  if (c.startsWith("VA_NUMMER_AANGEPAST")) return true;

  const r = String(row.rule ?? "").toLowerCase();
  const b = String(row.boodschap ?? "").toLowerCase();

  if (r.includes("fightpaspoort nummer gewijzigd")) return true;
  if (b.includes("fightpaspoort nummer gewijzigd")) return true;

  return false;
}

function statusFromResultaat(resultaat: any): PartijStatus {
  const s = String(resultaat ?? "").trim().toLowerCase();
  if (s === "afkeur" || s === "afgekeurd" || s === "reject" || s === "rejected") return "AFKEUR";
  if (s === "dispensatie") return "DISPENSATIE";
  if (s === "actie") return "ACTIE";
  return "OK";
}

function statusPrio(s: PartijStatus) {
  return s === "AFKEUR" ? 1 : s === "DISPENSATIE" ? 2 : s === "ACTIE" ? 3 : 9;
}

function partyStatusVoorMeldingen(meldingen: ResultRow[]): PartijStatus {
  if (!meldingen?.length) return "OK";
  let best: PartijStatus = "OK";
  let bestP = 999;
  for (const m of meldingen) {
    const st = statusFromResultaat(m.resultaat);
    const p = statusPrio(st);
    if (p < bestP) {
      bestP = p;
      best = st;
    }
  }
  return best;
}

function StatusBadge({ status }: { status: PartijStatus }) {
  const base = "inline-flex items-center rounded px-2 py-0.5 text-xs font-bold";
  if (status === "AFKEUR") return <span className={`${base} bg-red-600 text-zinc-900`}>AFKEUR</span>;
  if (status === "DISPENSATIE") return <span className={`${base} bg-yellow-500 text-black`}>DISPENSATIE</span>;
  if (status === "ACTIE") return <span className={`${base} bg-orange-500 text-black`}>ACTIE</span>;
  return <span className={`${base} bg-green-600 text-zinc-900`}>OK</span>;
}

function licentieIsProbleem(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  return s !== "ja"; // nee / null / anders -> probleem
}
function licentieLabel(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "onbekend";
  return s;
}
function keurmerkIsProbleem(v: any) {
  return v === false || v == null; // ongeldig of onbekend
}

// ✅ VA "mist" check (tolerant): leeg/geen digits => mist
function vaIsMissing(v: any) {
  if (v == null) return true;
  const s = String(v).trim();
  if (!s) return true;
  const digits = s.replace(/[^0-9]/g, "");
  // jouw VA is typisch 3-5 cijfers (zoals in andere code)
  return !/^\d{3,5}$/.test(digits);
}

/**
 * ============================================================
 * ✅ DISPENSATIE-INDICATIE (voor badge + jotform link)
 * - Niet alleen resultaat === "DISPENSATIE"
 * - Ook fallback op rule_code/rule als dat dispensatie aanduidt
 * ============================================================
 */
function isDispensatieMelding(m: ResultRow) {
  const res = String(m.resultaat ?? "").trim().toLowerCase();
  if (res === "dispensatie") return true;

  const c = normCode(m.rule_code ?? m.rule);
  if (c.includes("DISPENSATIE")) return true;
  if (c.includes("KLASSE") && c.includes("VERSCHIL")) return true; // bv KLASSE_VERSCHIL_*
  return false;
}

function hasDispensatie(meldingen: ResultRow[]) {
  return (meldingen ?? []).some(isDispensatieMelding);
}

/**
 * ✅ Max 2 badges:
 * - Hoofdbadge = zwaarste status (AFKEUR > DISPENSATIE > ACTIE > OK)
 * - Extra badge = DISPENSATIE als die óók voorkomt en hoofdbadge ≠ DISPENSATIE
 */
function StatusBadges({ status, meldingen }: { status: PartijStatus; meldingen: ResultRow[] }) {
  const extraDisp = hasDispensatie(meldingen) && status !== "DISPENSATIE";
  return (
    <div className="flex items-center gap-2">
      <StatusBadge status={status} />
      {extraDisp ? <StatusBadge status="DISPENSATIE" /> : null}
    </div>
  );
}

/**
 * DISPENSATIE LINKS
 * - volwassen klasse verschil: https://form.jotform.com/252374601478056
 * - jeugd dispensatie:         https://form.jotform.com/252374582262055
 *
 * ✅ Let op: we tonen link zodra hasDispensatie(meldingen) true is,
 * ook als hoofdbadge AFKEUR is.
 */
const DISP_VOLWASSENEN = "https://form.jotform.com/252374601478056";
const DISP_JEUGD = "https://form.jotform.com/252374582262055";

function isJeugdDispensatie(meldingen: ResultRow[]) {
  for (const m of meldingen ?? []) {
    if (!isDispensatieMelding(m)) continue;
    const c = normCode(m.rule_code ?? m.rule);
    if (c.includes("JEUGD") || c.includes("YOUTH") || c.includes("CAT13") || c.includes("CAT15") || c.includes("CAT17")) {
      return true;
    }
  }
  return false;
}

function DispensatieLinks({ meldingen }: { meldingen: ResultRow[] }) {
  if (!hasDispensatie(meldingen)) return null;

  const jeugd = isJeugdDispensatie(meldingen);
  const url = jeugd ? DISP_JEUGD : DISP_VOLWASSENEN;
  const label = jeugd ? "Dispensatie jeugd (formulier)" : "Klasse verschil volwassenen (formulier)";

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-md bg-[#111] px-3 py-1.5 text-xs font-extrabold text-[#f2f2f2] ring-1 ring-white/20 shadow-sm hover:bg-[#151515] hover:text-white"
      title="Open Jotform in nieuwe tab"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff4d00] shadow-[0_0_0_2px_rgba(255,77,0,0.22)]" />
      <span className="underline decoration-white/30 underline-offset-2">{label}</span>
    </a>
  );
}

function FsLogo({ className }: { className?: string }) {
  // Probe a few common locations so the report doesn't break if your asset path differs.
  // Put your REAL path first if you know it.
  const candidates = [
    "/branding/fightsupport/logo-dark.png",
    "/branding/fightsupport/logo.png",
    "/branding/fightsupport/logo-light.png",
    "/fightsupport-logo-dark.png",
    "/fightsupport-logo.png",
    "/logo.png",
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
          // ignore and continue
        }
      }
      // fallback: keep first candidate even if HEAD blocked in prod
      if (alive) setSrc(candidates[0]);
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <img
      src={src}
      alt="Fightsupport"
      className={className ?? ""}
      onError={() => setSrc(candidates[candidates.length - 1])}
    />
  );
}

/**
 * ✅ Eventmeta (FightSupport):
 * 1) matchmaking_uploads.event_id -> events.id (naam, datum)
 * 2) fallback: events.matchmaking_id == matchmaking_id
 * 3) fallback: events.upload_id == matchmaking_id
 * 4) fallback: matchmaking_uploads.(evenement_naam/evenement_datum)
 */
async function getEventMeta(matchmaking_id: string): Promise<EventMeta> {
  try {
    const { data: up, error: upErr } = await supabase
      .from("matchmaking_uploads")
      // ⚠️ select alleen kolommen die zeker bestaan
      .select("event_id, evenement_naam, evenement_datum, matchmaking_id")
      .or(`id.eq.${matchmaking_id},matchmaking_id.eq.${matchmaking_id}`)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (upErr) throw upErr;

    const uploadEventId = (up as any)?.event_id ? String((up as any).event_id) : null;

    // 1) Prefer: echte link via event_id
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
          naam: (ev as any)?.naam ?? null,
          datum: (ev as any)?.datum ?? null,
          source: "events",
        };
      }
    }

    // 2) Fallback: events.matchmaking_id == matchmaking_id
    const { data: evByMm, error: evByMmErr } = await supabase
      .from("events")
      .select("id, naam, datum")
      .eq("matchmaking_id", matchmaking_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!evByMmErr && evByMm) {
      return {
        id: String((evByMm as any)?.id ?? null),
        event_id: String((evByMm as any)?.id ?? null),
        naam: (evByMm as any)?.naam ?? null,
        datum: (evByMm as any)?.datum ?? null,
        source: "events",
      };
    }

    // 3) Fallback: events.upload_id == matchmaking_id
    const { data: evByUpload, error: evByUploadErr } = await supabase
      .from("events")
      .select("id, naam, datum")
      .eq("upload_id", matchmaking_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!evByUploadErr && evByUpload) {
      return {
        id: String((evByUpload as any)?.id ?? null),
        event_id: String((evByUpload as any)?.id ?? null),
        naam: (evByUpload as any)?.naam ?? null,
        datum: (evByUpload as any)?.datum ?? null,
        source: "events",
      };
    }

    // 4) Laatste fallback: upload zelf
    return {
      id: String((up as any)?.matchmaking_id ?? matchmaking_id),
      event_id: uploadEventId,
      naam: (up as any)?.evenement_naam ?? null,
      datum: (up as any)?.evenement_datum ?? null,
      source: "matchmaking_uploads",
    };
  } catch {
    return { id: null, naam: null, datum: null, source: null };
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

        // ✅ event meta: zelfde aanpak als Excel (naam/datum consistent)
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
        setResultaten(res ?? []);

        // ✅ Audit events (blijven bestaan na herscrape)
        const { data: aud, error: audErr } = await supabase
          .from("controle_audit_events")
          .select("partij_nr, hoek, event_type, old_va, new_va, actor_email, created_at, reason")
          .eq("controle_run_id", lastRun.id)
          .eq("matchmaking_id", matchmakingId)
          .order("created_at", { ascending: false });

        if (audErr) {
          // audit is nice-to-have: niet crashen
          console.warn("audit load failed:", audErr.message);
          setAuditEvents([]);
        } else {
          setAuditEvents((aud ?? []) as any);
        }
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [matchmakingId]);

  // OPEN meldingen: alles wat NIET approved/closed is
  // + naam mismatch/anders weglaten (maar fightpaspoort gewijzigd wél meenemen)
  const openMeldingen = useMemo(() => {
    return (resultaten ?? []).filter((r) => {
      if (isApprovedOrClosed((r as any).review_status)) return false;
      if (isNameMismatch(r) && !isFightpaspoortGewijzigd(r)) return false;
      return true;
    });
  }, [resultaten]);

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
      arr.sort((a, b) => statusPrio(statusFromResultaat(a.resultaat)) - statusPrio(statusFromResultaat(b.resultaat)));
      m.set(pn, arr);
    }
    return m;
  }, [openMeldingen]);

  const partijenOverzicht = useMemo(() => {
    return (ctxRows ?? []).map((p: any) => {
      const pn = Number(p.partij_nr);
      const meldingen = Number.isFinite(pn) ? meldByPartij.get(pn) ?? [] : [];
      const status = partyStatusVoorMeldingen(meldingen);

      return {
        partij_label: p.partij_label ?? p.partij_nr,
        partij_nr: p.partij_nr,
        rood: safe(p.rood_naam_fp ?? p.rood_naam_mm),
        blauw: safe(p.blauw_naam_fp ?? p.blauw_naam_mm),
        discipline: safe(p.discipline),
        klasse: safe(p.klasse_mm ?? p.klasse),
        status,
        hasOpenMeldingen: meldingen.length > 0,
        meldingen,
      };
    });
  }, [ctxRows, meldByPartij]);

  const partijMetMeldingen = useMemo(() => {
    return (ctxRows ?? [])
      .map((p: any) => {
        const pn = Number(p.partij_nr);
        const meldingen = Number.isFinite(pn) ? meldByPartij.get(pn) ?? [] : [];
        if (!meldingen.length) return null;

        return {
          partij_label: p.partij_label ?? p.partij_nr,
          partij_nr: p.partij_nr,
          status: partyStatusVoorMeldingen(meldingen),
          roodNaam: safe(p.rood_naam_fp ?? p.rood_naam_mm),
          blauwNaam: safe(p.blauw_naam_fp ?? p.blauw_naam_mm),
          roodGym: safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym),
          blauwGym: safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym),
          roodVa: safe(p.rood_va_mm ?? p.va_rood ?? p.rood_va),
          blauwVa: safe(p.blauw_va_mm ?? p.va_blauw ?? p.blauw_va),
          meldingen,
        };
      })
      .filter(Boolean) as any[];
  }, [ctxRows, meldByPartij]);

  // ✅ map partij_nr -> ctx row (voor lookup)
  const ctxByPartijNr = useMemo(() => {
    const m = new Map<number, any>();
    for (const p of ctxRows ?? []) {
      const pn = Number(p.partij_nr);
      if (!Number.isFinite(pn)) continue;
      m.set(pn, p);
    }
    return m;
  }, [ctxRows]);

  /**
   * ✅ Aandacht vereist: fightpaspoort nummer gewijzigd
   * - Eerst: audit VA_CHANGED (blijft bestaan na herscrape)
   * - Daarna: fallback op controle_resultaten (als ze er (nog) zijn)
   */
  const lijstFightpaspoortGewijzigd = useMemo(() => {
    const items: {
      partij: string;
      partij_nr: number;
      hoek: "rood" | "blauw";
      naam: string;
      gym: string;
      boodschap: string;
      created_at: string | null;
    }[] = [];


// 0) context-first: controle_bout_context.*_va_mm_prev gevuld => VA gewijzigd
for (const p of ctxRows ?? []) {
  const pn = Number(p.partij_nr);
  if (!Number.isFinite(pn)) continue;

  const partij = safe(p.partij_label ?? pn);

  // rood
  const roodPrevRaw = (p as any).rood_va_mm_prev;
  const roodHasPrevField = roodPrevRaw !== null && roodPrevRaw !== undefined;
  if (roodHasPrevField) {
    const prev = safe((p as any).rood_va_mm_prev, "");
    const current = safe((p as any).rood_va_mm ?? (p as any).va_rood ?? (p as any).rood_va, "");
    const fp = safe((p as any).rood_va, "");
    const changed = (prev && prev !== current) || (!prev && !!current);
    if (changed) {
      const extraFp = fp && fp !== "-" && fp !== current ? ` (FightPassport: ${fp})` : "";
      items.push({
        partij,
        partij_nr: pn,
        hoek: "rood",
        naam: safe(p.rood_naam_fp ?? p.rood_naam_mm),
        gym: safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym),
        boodschap: `VA-nummer gewijzigd: ${prev} → ${current}.${extraFp}`,
        created_at: null,
      });
    }
  }

  // blauw
  const blauwPrevRaw = (p as any).blauw_va_mm_prev;
  const blauwHasPrevField = blauwPrevRaw !== null && blauwPrevRaw !== undefined;
  if (blauwHasPrevField) {
    const prev = safe((p as any).blauw_va_mm_prev, "");
    const current = safe((p as any).blauw_va_mm ?? (p as any).va_blauw ?? (p as any).blauw_va, "");
    const fp = safe((p as any).blauw_va, "");
    const changed = (prev && prev !== current) || (!prev && !!current);
    if (changed) {
      const extraFp = fp && fp !== "-" && fp !== current ? ` (FightPassport: ${fp})` : "";
      items.push({
        partij,
        partij_nr: pn,
        hoek: "blauw",
        naam: safe(p.blauw_naam_fp ?? p.blauw_naam_mm),
        gym: safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym),
        boodschap: `VA-nummer gewijzigd: ${prev} → ${current}.${extraFp}`,
        created_at: null,
      });
    }
  }
}
    // 1) audit-first
    for (const ev of auditEvents ?? []) {
      if (normCode(ev.event_type) !== "VA_CHANGED") continue;

      const pn = Number(ev.partij_nr);
      if (!Number.isFinite(pn)) continue;

      const hoek = (ev.hoek ?? "rood") as "rood" | "blauw";
      const ctx = ctxByPartijNr.get(pn);

      const naam =
        hoek === "rood"
          ? safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm)
          : safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm);

      const gym =
        hoek === "rood"
          ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym)
          : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym);

      const oldVa = safe(ev.old_va, "-");
      const newVa = safe(ev.new_va, "-");
      const actor = ev.actor_email ? ` (door: ${ev.actor_email})` : "";

      items.push({
        partij: safe(ctx?.partij_label ?? pn),
        partij_nr: pn,
        hoek,
        naam,
        gym,
        boodschap: `Fightpaspoort nummer gewijzigd: ${oldVa} → ${newVa}. Pas aan op MM.${actor}`,
        created_at: ev.created_at ?? null,
      });
    }

    // 2) fallback: resultaten (zonder duplicates)
    const seen = new Set(items.map((x) => `${x.partij_nr}-${x.hoek}`));

    for (const r of openMeldingen ?? []) {
      if (!isFightpaspoortGewijzigd(r)) continue;

      const pn = Number(r.partij_nr);
      if (!Number.isFinite(pn)) continue;

      const ctx = ctxByPartijNr.get(pn);
      const hoek = (r.hoek ?? (normCode(r.rule_code).includes("_BLAUW") ? "blauw" : "rood")) as "rood" | "blauw";

      const key = `${pn}-${hoek}`;
      if (seen.has(key)) continue;

      const naam =
        hoek === "rood"
          ? safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm)
          : safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm);

      const gym =
        hoek === "rood"
          ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym)
          : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym);

      items.push({
        partij: safe(ctx?.partij_label ?? pn),
        partij_nr: pn,
        hoek,
        naam,
        gym,
        boodschap: safe(r.boodschap ?? r.rule ?? "Fightpaspoort nummer gewijzigd", "-"),
        created_at: r.created_at ?? null,
      });
    }

  // ✅ dedupe per partij+hoek (context > audit > resultaat) doordat we 'first wins' houden
  const uniqMap = new Map<string, (typeof items)[number]>();
  for (const it of items) {
    const key = `${it.partij_nr}-${it.hoek}`;
    if (!uniqMap.has(key)) uniqMap.set(key, it);
  }
  const uniq = Array.from(uniqMap.values());

  uniq.sort((a, b) => {
    if (a.partij_nr !== b.partij_nr) return a.partij_nr - b.partij_nr;
    return a.hoek.localeCompare(b.hoek);
  });

  return uniq;
}, [auditEvents, openMeldingen, ctxByPartijNr, ctxRows]);

  // ===== aparte lijsten =====
  const lijstLicentie = useMemo(() => {
    const items: {
      partij: string;
      hoek: "rood" | "blauw";
      naam: string;
      gym: string;
      licentie: string;
      ookGeenVa: boolean;
    }[] = [];

    for (const p of ctxRows ?? []) {
      const partij = safe(p.partij_label ?? p.partij_nr);

      const roodVa = p.rood_va_mm ?? p.va_rood ?? p.rood_va;
      const blauwVa = p.blauw_va_mm ?? p.va_blauw ?? p.blauw_va;

      if (licentieIsProbleem(p.rood_licentie)) {
        items.push({
          partij,
          hoek: "rood",
          naam: safe(p.rood_naam_fp ?? p.rood_naam_mm),
          gym: safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym),
          licentie: licentieLabel(p.rood_licentie),
          ookGeenVa: vaIsMissing(roodVa),
        });
      }
      if (licentieIsProbleem(p.blauw_licentie)) {
        items.push({
          partij,
          hoek: "blauw",
          naam: safe(p.blauw_naam_fp ?? p.blauw_naam_mm),
          gym: safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym),
          licentie: licentieLabel(p.blauw_licentie),
          ookGeenVa: vaIsMissing(blauwVa),
        });
      }
    }

    const score = (x: string) => (x === "nee" ? 1 : x === "onbekend" ? 2 : 9);
    const toNum = (s: string) => {
      const m = String(s ?? "").match(/^\d+/);
      return m ? Number(m[0]) : 999999;
    };

    return items.sort((a, b) => {
      const sa = score(a.licentie);
      const sb = score(b.licentie);
      if (sa !== sb) return sa - sb;

      if (a.ookGeenVa !== b.ookGeenVa) return a.ookGeenVa ? -1 : 1;

      const na = toNum(a.partij);
      const nb = toNum(b.partij);
      if (na !== nb) return na - nb;

      return a.hoek.localeCompare(b.hoek);
    });
  }, [ctxRows]);

  const lijstKeurmerkSportscholen = useMemo(() => {
    const set = new Set<string>();
    for (const p of ctxRows ?? []) {
      const roodGym = safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym, "");
      const blauwGym = safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym, "");
      if (roodGym && keurmerkIsProbleem(p.keurmerk_rood)) set.add(roodGym);
      if (blauwGym && keurmerkIsProbleem(p.keurmerk_blauw)) set.add(blauwGym);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "nl"));
  }, [ctxRows]);

  const lijstStartverbod = useMemo(() => {
    const items: { partij: string; hoek: "rood" | "blauw"; naam: string; gym: string }[] = [];
    for (const p of ctxRows ?? []) {
      const partij = safe(p.partij_label ?? p.partij_nr);

      if (p.rood_heeft_startverbod === true) {
        items.push({
          partij,
          hoek: "rood",
          naam: safe(p.rood_naam_fp ?? p.rood_naam_mm),
          gym: safe(p.rood_gym_fp ?? p.rood_gym_mm ?? p.rood_gym),
        });
      }
      if (p.blauw_heeft_startverbod === true) {
        items.push({
          partij,
          hoek: "blauw",
          naam: safe(p.blauw_naam_fp ?? p.blauw_naam_mm),
          gym: safe(p.blauw_gym_fp ?? p.blauw_gym_mm ?? p.blauw_gym),
        });
      }
    }

    const toNum = (s: string) => {
      const m = String(s ?? "").match(/^\d+/);
      return m ? Number(m[0]) : 999999;
    };

    return items.sort((a, b) => {
      const na = toNum(a.partij);
      const nb = toNum(b.partij);
      if (na !== nb) return na - nb;
      return a.hoek.localeCompare(b.hoek);
    });
  }, [ctxRows]);

  return (
    <div className="min-h-screen fs-report" style={{ background: "#eef0f3", color: "#111827" }}>
      {/* ✅ Print/PDF: behoud kleuren & layout (PDF wordt opgeslagen, niet fysiek geprint) */}
      <style jsx global>{`
  @media print {
    @page {
      margin: 12mm;
    }

    /* ✅ Chrome/Safari: print backgrounds altijd mee */
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
      padding: 0 !important;
      margin: 0 !important;
    
    /* ✅ Print: voorkom 'header op losse pagina' door viewport heights */
    .fs-report,
    .min-h-screen {
      min-height: auto !important;
      height: auto !important;
    }

}

    /* ✅ Voorkom dat kaarten/secties half op het einde van een pagina vallen */
    .avoid-break {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    /* ✅ Fightsupport PDF: frame iets steviger */
    .fs-report .fs-silver-frame {
      box-shadow: 0 0 0 2px rgba(192, 192, 192, 0.55) !important;
    }

    /* ✅ Partijen ‘cards’ met ruimte ertussen */
    .fs-report table {
      border-collapse: separate !important;
      border-spacing: 0 3px !important;
    }

    .fs-report table thead th {
      border-bottom: 1px solid rgba(192, 192, 192, 0.35) !important;
    }

    /* ❗️NIET meer background forceren op TD — dat breekt zebra (wit wordt zwart) */
    .fs-report table tbody tr td {
      border-top: 1px solid rgba(192, 192, 192, 0.35) !important;
      border-bottom: 1px solid rgba(192, 192, 192, 0.35) !important;
    }

    .fs-report table tbody tr td:first-child {
      border-left: 1px solid rgba(192, 192, 192, 0.35) !important;
      border-top-left-radius: 10px !important;
      border-bottom-left-radius: 10px !important;
    }

    .fs-report table tbody tr td:last-child {
      border-right: 1px solid rgba(192, 192, 192, 0.35) !important;
      border-top-right-radius: 10px !important;
      border-bottom-right-radius: 10px !important;
    }

    /* ✅ Safety: nested spans/divs erven de juiste kleur (zebra bepaalt) */
    .fs-report table tbody td * {
      color: inherit !important;
    }
  }



  /* ✅ Duidelijke randen om secties (zodat zebra niet “door elkaar” loopt) */
  .fs-section {
    border: 1px solid rgba(0, 0, 0, 0.10);
    box-shadow: inset 0 0 0 1px rgba(192, 192, 192, 0.25);
  }

  /* ✅ Zebra (screen + print) — wit / donkergrijs */
  .fs-report table {
    width: 100%;
  }

  .fs-report table thead th {
    background: linear-gradient(180deg, rgba(245,245,245,1) 0%, rgba(210,210,210,1) 100%);
    color: #111827 !important;
    font-weight: 800;
  }

  .fs-report table tbody tr:nth-child(odd) td {
    background: #ffffff !important;
    color: #111827 !important;
  }

  .fs-report table tbody tr:nth-child(even) td {
    background: #3a3a3a !important;
    color: #ffffff !important;
  }

  .fs-report table tbody td * {
    color: inherit !important;
  }


  /* === Strong section borders for Licentie / Keurmerk / Startverbod === */
  .section-strong {
    border: 2px solid rgba(0,0,0,.85) !important;
    border-radius: 14px !important;
    padding: 16px;
    margin-bottom: 22px;
    background: linear-gradient(180deg, #ffffff 0%, #f0f0f0 55%, #e6e6e6 100%) !important;
    box-shadow:
      0 0 0 1px rgba(255,255,255,.35) inset,
      0 10px 18px rgba(0,0,0,.12),
      0 2px 0 rgba(0,0,0,.18) !important;
  }
`}

</style>
      <div className="print-max mx-auto max-w-6xl px-4 py-6">
        {/* ✅ FightSupport frame (zilver buitenrand + zwarte/oranje binnenrand) */}
        <div className="fs-silver-frame rounded-[28px] p-[2px] bg-gradient-to-b from-white/70 via-white/25 to-white/60 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_18px_70px_rgba(0,0,0,0.25)]">
          <div className="rounded-[26px] p-[2px] bg-gradient-to-b from-[#111111] via-[#070707] to-[#111111] ring-1 ring-black/70">
            <div className="rounded-[24px] bg-[#f8fafc] ring-1 ring-black/10">
              {/* header */}
              <div className="px-5 py-5 border-b border-black/10">
                <div className="grid gap-4 lg:grid-cols-3 lg:items-center">
                  {/* links: info */}
                  <div>
                    <div
                      className="text-xs font-extrabold tracking-wider"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(230,230,230,0.72) 40%, rgba(140,140,140,0.60) 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textShadow: "0 10px 24px rgba(0,0,0,0.18)",
                      }}
                    >
                      FIGHTSUPPORT RAPPORT
                    </div>
                    <div className="mt-2">
                      <div className="text-[#ff4d00] font-extrabold text-sm">Evenement</div>
                      <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">{eventMeta?.naam ?? "-"}</div>
                      <div className="mt-1 text-[#ff4d00] font-extrabold text-sm">Datum</div>
                      <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900/90">{fmtNlDateOnly(eventMeta?.datum)}</div>
                    </div>

                    <div className="mt-3 text-xs text-zinc-700">
                      Matchmaking ID: <span className="font-mono">{matchmakingId}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-600">
                      Run: {safe(run?.status)} • Gestart: {fmtDateTime(run?.gestart_op)} • Afgerond: {fmtDateTime(run?.afgerond_op)}
                    </div>
                  </div>

                  {/* midden: logo (strak staal, geen glow) */}
                  <div className="flex justify-center">
                    <div className="rounded-xl p-[5px] bg-gradient-to-b from-[#e0e0e0] via-[#8c8c8c] to-[#cfcfcf]">
                      <div className="rounded-lg border-[3px] border-[#bdbdbd] bg-[#0b0b0b] p-4">
                        {/* ✅ kleiner logo voor rapport (minder dominant) */}
                        <FsLogo className="h-20 sm:h-24 w-auto" />
                      </div>
                    </div>
                  </div>

                  {/* rechts: acties (niet printen) */}
                  <div className="no-print flex items-center justify-start lg:justify-end gap-2">
                    <Link
                      href={`/dashboard/admin/controle/${matchmakingId}`}
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#c0c0c0] ring-1 ring-white/20 hover:bg-[#151515] hover:text-white"
                    >
                      Terug
                    </Link>
                    <button
                      onClick={() => window.print()}
                      className="rounded-md bg-[#ff4d00] px-3 py-2 text-sm font-extrabold text-black hover:brightness-110"
                    >
                      Opslaan als PDF
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-5 py-6 space-y-6">
                {loading && <div className="rounded-xl border border-black/10 bg-white p-4 text-sm text-zinc-800">Rapport laden…</div>}
                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700">{error}</div>}

                {!loading && !error && (
                  <>
                    {/* Overzicht ALLE partijen — zebra via NvbTable */}
                    <div className="fs-section rounded-2xl bg-white overflow-hidden">
                      <div className="bg-[#ff4d00] px-4 py-3 font-extrabold text-black">Overzicht partijen (alle)</div>

                      <div className="p-3">
                <NvbTable columns={["Partij", "Partij", "Status"]}>
                  {partijenOverzicht.map((r, i) => (
                    <tr key={`${r.partij_nr}-${i}`}>
                      <td className="px-4 py-2 font-semibold">{safe(r.partij_label)}</td>
                      <td className="px-4 py-2">
                        <div className="font-medium">
                          {r.rood} <span className="opacity-70">vs</span> {r.blauw}
                        </div>
                        <div className="text-xs opacity-80">
                          {r.discipline} • {r.klasse}
                          {r.hasOpenMeldingen ? " • open meldingen" : ""}
                        </div>

                        {/* ✅ Jotform link zodra er dispensatie is (ook als hoofdbadge AFKEUR is) */}
                        {hasDispensatie(r.meldingen) ? (
                          <div className="mt-2">
                            <DispensatieLinks meldingen={r.meldingen} />
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2">
                        {/* ✅ Max 2 badges incl. dispensatie */}
                        <StatusBadges status={r.status} meldingen={r.meldingen} />
                      </td>
                    </tr>
                  ))}
                </NvbTable>
              </div>
            </div>

            {/* ✅ AANDACHT VEREIST — onder partijen, boven licentie/keurmerk/startverbod */}
            <div className="fs-section rounded-2xl bg-white overflow-hidden">
              <div className="bg-[#ff4d00] px-4 py-3 font-extrabold text-black">Aandacht vereist</div>

              <div className="p-3 space-y-4">
                {/* Fightpaspoort nummer gewijzigd */}
                <div className="rounded-xl border border-black/10 bg-white p-3 avoid-break">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-zinc-900">Fightpaspoort nummer gewijzigd</div>
                    <span className="text-xs font-extrabold text-zinc-600">{lijstFightpaspoortGewijzigd.length}</span>
                  </div>

                  {lijstFightpaspoortGewijzigd.length === 0 ? (
                    <div className="mt-2 text-sm text-zinc-700">Geen.</div>
                  ) : (
                    <div className="mt-3">
                      <NvbTable columns={["Partij", "Hoek", "Naam", "Sportschool", "Melding"]}>
                        {lijstFightpaspoortGewijzigd.map((x, i) => (
                          <tr key={`fpchg-${x.partij_nr}-${x.hoek}-${i}`}>
                            <td className="px-4 py-2 font-semibold">{x.partij}</td>
                            <td className="px-4 py-2">{x.hoek}</td>
                            <td className="px-4 py-2">{x.naam}</td>
                            <td className="px-4 py-2">{x.gym}</td>
                            <td className="px-4 py-2">
                              <div>{x.boodschap}</div>
                              {x.created_at ? <div className="mt-1 text-xs text-zinc-600">({fmtDateTime(x.created_at)})</div> : null}
                            </td>
                          </tr>
                        ))}
                      </NvbTable>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Aparte lijsten (onder elkaar in PDF/print) */}
            <div className="space-y-4">
              {/* Licentie */}
              <div className="rounded-2xl border border-black/10 bg-white overflow-hidden section-strong">
                <div className="bg-[#101010] text-white px-4 py-3 font-extrabold border-b border-black/10">Licentie (nee/onbekend)</div>
                                <div className="p-3">
                  {lijstLicentie.length === 0 ? (
                    <div className="text-sm text-zinc-700">Geen.</div>
                  ) : (
                    (() => {
                      // groepeer per partij zodat rood/blauw naast elkaar kunnen staan
                      const map = new Map<
                        string,
                        {
                          partij: string;
                          rood?: (typeof lijstLicentie)[number];
                          blauw?: (typeof lijstLicentie)[number];
                        }
                      >();

                      for (const it of lijstLicentie) {
                        const k = it.partij;
                        const cur = map.get(k) ?? { partij: it.partij };
                        if (it.hoek === "rood") cur.rood = it;
                        if (it.hoek === "blauw") cur.blauw = it;
                        map.set(k, cur);
                      }

                      const rows = Array.from(map.values());

                      const Badge = ({
                        children,
                        tone,
                      }: {
                        children: any;
                        tone: "danger" | "warn" | "muted";
                      }) => (
                        <span
                          className={
                            "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-extrabold ring-1 " +
                            (tone === "danger"
                              ? "bg-[#ff4d00]/15 text-[#ff4d00] ring-[#ff4d00]/25"
                              : tone === "warn"
                              ? "bg-amber-500/15 text-amber-700 ring-amber-500/25"
                              : "bg-black/5 text-zinc-700 ring-black/10")
                          }
                        >
                          {children}
                        </span>
                      );

                      return (
                        <div className="rounded-xl overflow-hidden border border-black/10">
                          {/* header */}
                          <div className="grid grid-cols-[86px_1fr_1fr] bg-gradient-to-r from-[#f6f6f6] to-white text-xs font-extrabold text-zinc-900 border-b border-black/10">
                            <div className="px-3 py-2">Partij</div>
                            <div className="px-3 py-2 border-l border-black/10">Rood</div>
                            <div className="px-3 py-2 border-l border-black/10">Blauw</div>
                          </div>

                          {/* rows */}
                          {rows.map((r, idx) => {
                            const zebra = idx % 2 === 0 ? "bg-white text-zinc-900" : "bg-[#2f2f2f] text-white";
                            const subText = idx % 2 === 0 ? "text-zinc-600" : "text-white/75";
                            const line = idx % 2 === 0 ? "border-black/10" : "border-white/10";

                            const Cell = ({ it, side }: { it?: (typeof lijstLicentie)[number]; side: "rood" | "blauw" }) => {
                              if (!it) return <div className={`px-3 py-2 text-sm ${idx % 2 === 0 ? "text-zinc-500" : "text-white/70"}`}>—</div>;

                              const licTone = it.licentie === "nee" ? "danger" : it.licentie === "onbekend" ? "warn" : "muted";

                              return (
                                <div className="px-3 py-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-semibold">{it.naam}</div>
                                      <div className={`truncate text-xs ${subText}`}>{it.gym}</div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                      {it.ookGeenVa ? <Badge tone="danger">ook geen VA</Badge> : null}
                                      <Badge tone={licTone as any}>licentie: {it.licentie}</Badge>
                                    </div>
                                  </div>
                                </div>
                              );
                            };

                            return (
                              <div key={`licrow-${r.partij}-${idx}`} className={`grid grid-cols-[86px_1fr_1fr] ${zebra} border-b last:border-b-0 ${line}`}>
                                <div className="px-3 py-2 font-extrabold">{r.partij}</div>
                                <div className={`border-l ${line}`}>
                                  <Cell it={r.rood} side="rood" />
                                </div>
                                <div className={`border-l ${line}`}>
                                  <Cell it={r.blauw} side="blauw" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>

              {/* <div className="section-strong">Keurmerk sportscholen */}
              <div className="rounded-2xl border border-black/10 bg-white overflow-hidden section-strong">
                <div className="bg-[#101010] text-white px-4 py-3 font-extrabold border-b border-black/10">Keurmerk (sportscholen)</div>
                <div className="p-3">
                  <div className="text-xs text-zinc-600 mb-2">Ongeldig of onbekend (uniek)</div>
                  {lijstKeurmerkSportscholen.length === 0 ? (
                    <div className="text-sm text-zinc-700">Geen.</div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-black/10">
                      {lijstKeurmerkSportscholen.map((gym, idx) => (
                        <div
                          key={`keur-${idx}`}
                          className={`${idx % 2 === 0 ? "bg-white text-zinc-900" : "bg-[#2f2f2f] text-white"} px-3 py-2 text-sm border-b border-black/10 last:border-b-0`}
                        >
                          {gym}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* <div className="section-strong">Startverbod */}
              <div className="rounded-2xl border border-black/10 bg-white overflow-hidden section-strong">
                <div className="bg-[#101010] text-white px-4 py-3 font-extrabold border-b border-black/10">Startverbod (true)</div>
                <div className="p-3">
                  {lijstStartverbod.length === 0 ? (
                    <div className="text-sm text-zinc-700">Geen.</div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-black/10">
                      {lijstStartverbod.map((x, idx) => (
                        <div
                          key={`sv-${idx}`}
                          className={`${idx % 2 === 0 ? "bg-white text-zinc-900" : "bg-[#2f2f2f] text-white"} px-3 py-2 text-sm border-b border-black/10 last:border-b-0`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold">
                              {x.partij} • {x.hoek}
                            </div>
                            <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-extrabold text-red-700 ring-1 ring-red-500/25">startverbod</span>
                          </div>
                          <div className="mt-1">{x.naam}</div>
                          <div className={`${idx % 2 === 0 ? "text-zinc-600" : "text-white/75"} text-xs`}>{x.gym}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Onderaan: detailblokken met open meldingen */}
            <div className="space-y-6">
              {partijMetMeldingen.map((it, idx) => (
                <div key={`partij-${safe(it.partij_nr)}-${idx}`} className="relative mb-12 rounded-2xl p-[4px] bg-gradient-to-br from-[#d9d9d9] via-[#8f8f8f] to-[#cfcfcf]">
                  <div className="rounded-[14px] border border-white/12 bg-white overflow-hidden">
                  <div className="flex items-center justify-between gap-3 bg-[#ff4d00] px-4 py-3 shadow-inner">
                    <div className="font-extrabold text-black">Partij {safe(it.partij_label)}</div>

                    <div className="flex items-center gap-2">
                      {/* ✅ Jotform link zodra er dispensatie is (ook als hoofdbadge AFKEUR is) */}
                      <DispensatieLinks meldingen={it.meldingen} />

                      {/* ✅ Max 2 badges incl. dispensatie */}
                      <StatusBadges status={it.status} meldingen={it.meldingen} />
                    </div>
                  </div>

                  <div className="px-4 py-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-black/10 bg-white p-3 avoid-break">
                        <div className="text-xs font-semibold text-zinc-600">Rood</div>
                        <div className="mt-1 font-semibold text-zinc-900">{it.roodNaam}</div>
                        <div className="text-sm text-zinc-700">
                          {it.roodGym} • VA: {it.roodVa}
                        </div>
                      </div>

                      <div className="rounded-xl border border-black/10 bg-white p-3 avoid-break">
                        <div className="text-xs font-semibold text-zinc-600">Blauw</div>
                        <div className="mt-1 font-semibold text-zinc-900">{it.blauwNaam}</div>
                        <div className="text-sm text-zinc-700">
                          {it.blauwGym} • VA: {it.blauwVa}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-sm font-semibold">Open meldingen</div>

                      {/* Meldingen zebra ook via NvbTable */}
                      <div className="mt-2">
                        <NvbTable columns={["Resultaat", "Regel", "Melding"]}>
                          {it.meldingen.map((m: ResultRow, i: number) => {
                            const st = statusFromResultaat(m.resultaat);
                            const code = safe(m.rule_code ?? m.rule);
                            const msg = safe(m.boodschap ?? "", "-");
                            const aant = safe(m.aantekeningen ?? "", "");

                            return (
                              <tr key={`${safe(it.partij_nr)}-${i}`}>
                                <td className="px-4 py-2">
                                  <StatusBadge status={st} />
                                </td>
                                <td className="px-4 py-2 font-mono text-xs">{code}</td>
                                <td className="px-4 py-2">
                                  <div>{msg}</div>
                                  {aant && (
                                    <div className="mt-1 text-xs opacity-80">
                                      <span className="font-semibold">Aantekeningen:</span> {aant}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </NvbTable>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              ))}

              {partijMetMeldingen.length === 0 && (
                <div className="rounded border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                  Geen open meldingen.
                </div>
              )}
            </div>
          </>
        )}

                <div className="mt-10 border-t border-white/15 pt-4 text-center text-xs text-zinc-600">
                  © 2026 Fightsupport – Alle rechten voorbehouden
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
