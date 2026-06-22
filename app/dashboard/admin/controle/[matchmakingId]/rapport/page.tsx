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
  matchmaker?: string | null;
  promotor?: string | null;
  locatie?: string | null;
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
  toernooi_code?: string | null;
  fighter_id?: string | null;
  toernooi_va_nummer?: string | null;
  va_nummer?: string | null;
  naam?: string | null;
  sportschool?: string | null;
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
  sortNaam?: string;
};

type VerbodSummaryItem = {
  partij_nr: number;
  partij: string;
  hoek: "rood" | "blauw" | "-";
  naam: string;
  gym: string;
  type: "STARTVERBOD" | "VERBOD";
  detail: string;
};

type ToernooiFighterIssue = {
  toernooiCode: string;
  fighterKey: string;
  naam: string;
  gym: string;
  hoek: "rood" | "blauw" | null;
  scope: "fighter" | "pair";
  labels: string[];
  details: string[];
  status: PartijStatus;
};

function safe(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function safeRaw(v: any) {
  return String(v ?? "").trim();
}

function normDedupeText(v: any) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normGymKey(v: any) {
  return normDedupeText(v)
    .replace(/\s*\((be|belgië|belgie)\)\s*$/i, "")
    .replace(/\s+/g, " ");
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

function isExactBoksen(v: any) {
  return String(v ?? "").trim().toLowerCase() === "boksen";
}

function isBoksenContext(row: any) {
  return isExactBoksen(row?.discipline);
}

function shouldIgnoreLicentieForBoksen(row: ResultRow, ctx?: any | null) {
  return isLicentieRow(row) && isBoksenContext(ctx);
}

function naamFromLicentieBoodschap(row: ResultRow) {
  const msg = safeRaw(row.boodschap);
  const m = msg.match(/^(.+?)\s+heeft\s+geen\s+geldige\s+licentie/i);
  return safeRaw(row.naam) || safeRaw(m?.[1]) || "-";
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
  if (hoek === "rood") return safeRaw(ctx?.rood_va_mm ?? ctx?.va_rood ?? ctx?.rood_va);
  return safeRaw(ctx?.blauw_va_mm ?? ctx?.va_blauw ?? ctx?.blauw_va);
}

function getPrevVaFromCtx(ctx: any, hoek: "rood" | "blauw") {
  if (hoek === "rood") return safeRaw(ctx?.rood_va_mm_prev);
  return safeRaw(ctx?.blauw_va_mm_prev);
}

function hasPrevVaField(ctx: any, hoek: "rood" | "blauw") {
  if (hoek === "rood") return ctx?.rood_va_mm_prev !== undefined && ctx?.rood_va_mm_prev !== null;
  return ctx?.blauw_va_mm_prev !== undefined && ctx?.blauw_va_mm_prev !== null;
}

function statusFromResultaat(resultaat: any, rule_code?: any): PartijStatus {
  if (rule_code) {
    const c = String(rule_code ?? "").toUpperCase();
    if (c.includes("JEUGD_VOLWASSEN_MIX")) return "VERBOD";
    if (c.includes("LEEFTIJD_VERSCHIL") && c.includes("AFKEUR")) return "VERBOD";
    if (c.includes("VERBOD")) return "VERBOD";
    if (c.includes("DISPENSATIE")) return "DISPENSATIE";
    if (c.includes("AFKEUR")) return "AFKEUR";
  }

  const s = String(resultaat ?? "").trim().toLowerCase();
  if (s === "verbod") return "VERBOD";
  if (s === "dispensatie") return "DISPENSATIE";
  if (s === "afkeur" || s === "afgekeurd") return "AFKEUR";
  if (s === "actie") return "ACTIE";
  return "OK";
}

function statusPrio(s: PartijStatus) {
  // Hoogste prioriteit eerst: VERBOD > DISPENSATIE > AFKEUR > ACTIE > OK
  return s === "VERBOD" ? 0 : s === "DISPENSATIE" ? 1 : s === "AFKEUR" ? 2 : s === "ACTIE" ? 3 : 9;
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

function maxGewichtLabel(p: any) {
  const raw = p.max_gewicht ?? p.maxgewicht ?? p.max_kg ?? null;
  if (raw == null || raw === "") return "-";
  return String(raw).replace(".", ",");
}

function isTrueLike(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "ja" || s === "yes";
}

function getToernooiCode(row: any) {
  return String(
    row?.toernooi_code ??
      row?.toernooi_id ??
      row?.toernooi_nummer ??
      row?.toernooi ??
      ""
  )
    .trim()
    .toUpperCase();
}

function parseRawJsonSafe(v: any): any | null {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return null;
  }
}

function getToernooiCodeSafe(row: any) {
  const direct = getToernooiCode(row);
  if (direct) return direct;
  const raw = parseRawJsonSafe(row?.raw_json);
  const fromRaw = String(raw?.toernooi_code ?? raw?.toernooi_id ?? raw?.toernooi_nummer ?? "").trim().toUpperCase();
  if (fromRaw) return fromRaw;
  return "TOERNOOI";
}

function getPartijLabel(row: any) {
  if (isTrueLike(row?.is_toernooi)) return getToernooiCodeSafe(row);
  return safe(row?.partij_label ?? row?.partij_nr);
}

function getToernooiFighterKey(row: any, hoek: "rood" | "blauw") {
  const va = normalizeVa(hoek === "rood" ? row?.rood_va_mm ?? row?.va_rood ?? row?.rood_va : row?.blauw_va_mm ?? row?.va_blauw ?? row?.blauw_va);
  if (va) return `va:${va}`;

  const naam = String(
    hoek === "rood"
      ? row?.rood_naam_fp ?? row?.rood_naam_mm ?? row?.rood_naam ?? ""
      : row?.blauw_naam_fp ?? row?.blauw_naam_mm ?? row?.blauw_naam ?? ""
  )
    .trim()
    .toLowerCase();

  const gym = String(
    hoek === "rood"
      ? row?.rood_gym_fp ?? row?.rood_gym_mm ?? row?.rood_gym ?? ""
      : row?.blauw_gym_fp ?? row?.blauw_gym_mm ?? row?.blauw_gym ?? ""
  )
    .trim()
    .toLowerCase();

  return `fallback:${naam}__${gym}`;
}
function getToernooiPairKey(row: any) {
  const rood = getToernooiFighterKey(row, "rood");
  const blauw = getToernooiFighterKey(row, "blauw");
  return [rood, blauw].sort().join("__");
}

function getToernooiPairNaam(row: any) {
  const rood = safe(row?.rood_naam_fp ?? row?.rood_naam_mm ?? row?.rood_naam);
  const blauw = safe(row?.blauw_naam_fp ?? row?.blauw_naam_mm ?? row?.blauw_naam);
  return `${rood} / ${blauw}`;
}

function getToernooiPairGym(row: any) {
  const rood = safe(row?.rood_gym_fp ?? row?.rood_gym_mm ?? row?.rood_gym, "");
  const blauw = safe(row?.blauw_gym_fp ?? row?.blauw_gym_mm ?? row?.blauw_gym, "");
  return [rood, blauw].filter(Boolean).join(" / ") || "-";
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
  if (!isKeurmerkRow(row) && !isSportschoolMatchRow(row)) return false;
  if (isBelgischeManualCheckRow(row)) return false;

  const tekst = keurmerkTekst(row);

  if (
    tekst.includes("sportschool_niet_gevonden") ||
    tekst.includes("sportschool niet gevonden") ||
    tekst.includes("geen sportschool match") ||
    tekst.includes("geen match in sportscholen") ||
    tekst.includes("lege/ongeldige sportschoolnaam") ||
    tekst.includes("ongeldige sportschoolnaam") ||
    tekst.includes("leeg sportschool") ||
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

  return normResultaatLower(row.resultaat) !== "ok";
}

async function getEventMeta(matchmaking_id: string): Promise<EventMeta> {
  try {
    const { data: up, error: upErr } = await supabase
      .from("matchmaking_uploads")
      .select("event_id, evenement_naam, evenement_datum, matchmaking_id, bondteam, matchmaker, promotor, locatie")
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
          matchmaker: (up as any)?.matchmaker ?? null,
          promotor: (up as any)?.promotor ?? null,
          locatie: (up as any)?.locatie ?? null,
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
      matchmaker: (up as any)?.matchmaker ?? null,
      promotor: (up as any)?.promotor ?? null,
      locatie: (up as any)?.locatie ?? null,
      source: "matchmaking_uploads",
    };
  } catch {
    return {
      id: null,
      naam: null,
      datum: null,
      bondteam: null,
      matchmaker: null,
      promotor: null,
      locatie: null,
      source: null,
    };
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
  const [toernooiCtxRows, setToernooiCtxRows] = useState<any[]>([]);
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
        const latestRun = (runRows ?? [])[0] ?? null;
        let latestControleRunId = latestRun?.id ? String(latestRun.id) : null;

        // Zelfde fallback als de werkende matchmakingId-pagina:
        // als controle_runs geen laatste run geeft, pak de meest recente context-run.
        if (!latestControleRunId) {
          const { data: lastCtxRows, error: lastCtxErr } = await supabase
            .from("controle_bout_context")
            .select("controle_run_id, created_at")
            .eq("matchmaking_id", matchmakingId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (lastCtxErr) throw lastCtxErr;
          latestControleRunId = lastCtxRows?.[0]?.controle_run_id
            ? String(lastCtxRows[0].controle_run_id)
            : null;
        }

        const activeRun =
          latestRun ??
          (latestControleRunId
            ? ({
                id: latestControleRunId,
                matchmaking_id: matchmakingId,
                status: "unknown",
                gestart_op: null,
                afgerond_op: null,
                run_type: null,
              } as ControleRun)
            : null);

        setRun(activeRun);

        const em = await getEventMeta(matchmakingId);
        setEventMeta(em);

        if (!latestControleRunId) {
          setCtxRows([]);
          setToernooiCtxRows([]);
          setResultaten([]);
          setAuditEvents([]);
          setLoading(false);
          return;
        }

        // Zelfde bron als de werkende matchmakingId-pagina: context van de actieve run.
        // Als die leeg terugkomt, fallback naar alle context van deze matchmaking.
        let ctxQuery = supabase
          .from("controle_bout_context")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("controle_run_id", latestControleRunId);

        let { data: ctx, error: ctxErr } = await ctxQuery.order("partij_nr", { ascending: true });

        if (ctxErr) throw ctxErr;

        if (!ctx || ctx.length === 0) {
          const fallbackCtx = await supabase
            .from("controle_bout_context")
            .select("*")
            .eq("matchmaking_id", matchmakingId)
            .order("partij_nr", { ascending: true });

          if (fallbackCtx.error) throw fallbackCtx.error;
          ctx = fallbackCtx.data ?? [];
        }

        setCtxRows(ctx ?? []);

        const { data: toernooiCtx, error: toernooiCtxErr } = await supabase
          .from("controle_toernooi_context")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .eq("controle_run_id", latestControleRunId)
          .order("toernooi_code", { ascending: true })
          .order("naam", { ascending: true });

        if (toernooiCtxErr) {
          console.warn("controle_toernooi_context load failed:", toernooiCtxErr.message);
          setToernooiCtxRows([]);
        } else {
          setToernooiCtxRows(toernooiCtx ?? []);
        }

        // Zelfde basis als de werkende matchmakingId-pagina:
        // meldingen komen uit controle_resultaten van de actieve controle_run.
        const { data: res, error: resErr } = await supabase
          .from("controle_resultaten")
          .select("partij_nr, rule, rule_code, resultaat, boodschap, aantekeningen, created_at, review_status, hoek, toernooi_code, fighter_id, toernooi_va_nummer, va_nummer, controle_run_id")
          .eq("controle_run_id", latestControleRunId)
          .order("created_at", { ascending: true });

        if (resErr) throw resErr;
        setResultaten((res ?? []) as ResultRow[]);

        const { data: aud, error: audErr } = await supabase
          .from("controle_audit_events")
          .select("partij_nr, hoek, event_type, old_va, new_va, actor_email, created_at, reason")
          .eq("controle_run_id", latestControleRunId)
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
    // Zelfde gedachte als de werkende matchmakingId-pagina:
    // actieve meldingen zijn alle regels die niet goedgekeurd/afgehandeld zijn
    // en waarvan resultaat niet leeg/OK is. Geen extra rapport-filterlaag meer,
    // want die verstopte wedstrijdmeldingen zodra toernooi-data aanwezig was.
    const active = (resultaten ?? []).filter((r) => {
      if (isApprovedOrClosed(r.review_status)) return false;
      const res = normResultaatLower(r.resultaat);
      return res !== "" && res !== "ok";
    });

    return dedupeRows(active);
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

  const gewonePartijNrs = useMemo(() => {
    const s = new Set<number>();
    for (const row of ctxRows ?? []) {
      const pn = Number(row?.partij_nr);
      if (!Number.isFinite(pn)) continue;
      if (!isTrueLike(row?.is_toernooi)) s.add(pn);
    }
    return s;
  }, [ctxRows]);

  const toernooiRows = useMemo(() => {
    return [
      ...(ctxRows ?? []).filter((row: any) => isTrueLike(row?.is_toernooi)),
      ...(toernooiCtxRows ?? []),
    ];
  }, [ctxRows, toernooiCtxRows]);

  const toernooiInfo = useMemo(() => {
    if (!toernooiRows.length) {
      return {
        isToernooi: false,
        code: "-",
        codes: [] as string[],
        aantalToernooien: 0,
      };
    }

    const codes = Array.from(
      new Set(
        toernooiRows
          .map((row: any) => getToernooiCodeSafe(row))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "nl"));

    return {
      isToernooi: true,
      code: codes.join(" / ") || "-",
      codes,
      aantalToernooien: codes.length,
    };
  }, [toernooiRows]);

  const meldByPartij = useMemo(() => {
    const m = new Map<number, ResultRow[]>();

    for (const r of openMeldingen) {
      const pn = Number(r.partij_nr);
      // Wedstrijdmeldingen zijn alleen echte partijen: partij_nr > 0.
      // Toernooi gebruikt partij_nr 0. Ook als een rij per ongeluk een toernooi_code heeft,
      // blijft partij_nr leidend voor het wedstrijdmeldingenblok.
      if (!Number.isFinite(pn) || pn <= 0) continue;

      const ctx = ctxByPartij.get(pn) ?? null;
      if (shouldIgnoreLicentieForBoksen(r, ctx)) continue;

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
  }, [openMeldingen, ctxByPartij]);

  const partijenCompact = useMemo(() => {
    return (ctxRows ?? [])
      .filter((p: any) => !isTrueLike(p?.is_toernooi))
      .map((p: any) => {
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

  const wedstrijdenMetMeldingen = useMemo(() => {
    const out: Array<{
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
    }> = [];

    // Bouw dit direct uit controle_resultaten via meldByPartij.
    // Daardoor blijven wedstrijdmeldingen zichtbaar, ook als dezelfde matchmaking toernooi-meldingen bevat
    // of als controle_bout_context niet exact meer met alle resultaatregels matcht.
    for (const [pn, meldingen] of Array.from(meldByPartij.entries()).sort((a, b) => a[0] - b[0])) {
      if (!meldingen.length) continue;

      const p = ctxByPartij.get(pn) ?? null;

      out.push({
        partij_nr: pn,
        partij_label: safe(p?.partij_label ?? pn),
        status: partyStatusVoorMeldingen(meldingen),
        discipline: safe(p?.discipline),
        klasse: safe(p?.klasse_mm ?? p?.klasse),
        max_gewicht: p ? maxGewichtLabel(p) : "-",
        roodNaam: safe(p?.rood_naam_fp ?? p?.rood_naam_mm ?? p?.rood_naam),
        roodGym: safe(p?.rood_gym_fp ?? p?.rood_gym_mm ?? p?.rood_gym),
        roodVa: safe(p?.rood_va_mm ?? p?.va_rood ?? p?.rood_va),
        blauwNaam: safe(p?.blauw_naam_fp ?? p?.blauw_naam_mm ?? p?.blauw_naam),
        blauwGym: safe(p?.blauw_gym_fp ?? p?.blauw_gym_mm ?? p?.blauw_gym),
        blauwVa: safe(p?.blauw_va_mm ?? p?.va_blauw ?? p?.blauw_va),
        meldingen,
      });
    }

    return out;
  }, [ctxByPartij, meldByPartij]);

  const verbodStartverbodIssues = useMemo(() => {
    const items: VerbodSummaryItem[] = [];
    const seen = new Set<string>();

    for (const r of resultaten ?? []) {
      const pn = Number(r.partij_nr);
      if (!Number.isFinite(pn) || !gewonePartijNrs.has(pn)) continue;

      const resultaat = normResultaatLower(r.resultaat);
      const notApproved = !isApprovedOrClosed(r.review_status);

      let type: "STARTVERBOD" | "VERBOD" | null = null;

      if (isStartverbodRow(r)) {
        if (resultaat === "ok") continue;
        if (!notApproved && resultaat !== "verbod") continue;
        type = "STARTVERBOD";
      } else if (isVerbodRow(r)) {
        if (!notApproved) continue;
        if (resultaat === "ok") continue;
        type = "VERBOD";
      } else if (resultaat === "verbod" && notApproved) {
        type = "VERBOD";
      } else {
        continue;
      }

      const ctx = ctxByPartij.get(pn);
      const inferredHoek = inferHoek(r);
      const hoek: "rood" | "blauw" | "-" = inferredHoek ?? "-";

      let naam = "-";
      let gym = "-";

      if (inferredHoek === "rood") {
        naam = safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm);
        gym = safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym);
      } else if (inferredHoek === "blauw") {
        naam = safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm);
        gym = safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym);
      } else {
        const roodNaam = safeRaw(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm);
        const blauwNaam = safeRaw(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm);
        const roodGym = safeRaw(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym);
        const blauwGym = safeRaw(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym);
        naam = [roodNaam, blauwNaam].filter(Boolean).join(" / ") || "-";
        gym = [roodGym, blauwGym].filter(Boolean).join(" / ") || "-";
      }

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
  }, [resultaten, ctxByPartij, gewonePartijNrs]);

  const licentieIssues = useMemo(() => {
    // Belangrijk: "Geen licentie" wordt uitsluitend opgebouwd uit controle_resultaten.
    // Contextvelden zoals rood_licentie/blauw_licentie zijn alleen weergave-data en mogen
    // het rapport niet zelfstandig vullen, anders ontstaan dubbele/toernooi-meldingen.
    const items: IssueSummaryItem[] = [];
    const seen = new Set<string>();

    const codeFromAny = (row: any) =>
      String(row?.toernooi_code ?? row?.toernooiCode ?? "").trim().toUpperCase();

    const fighterIdFromAny = (row: any) =>
      normalizeVa(row?.fighter_id ?? row?.toernooi_va_nummer ?? row?.va_nummer ?? row?.fighterId);

    const ctxByToernooiFighter = new Map<string, any>();
    for (const row of toernooiRows ?? []) {
      const code = codeFromAny(row) || getToernooiCodeSafe(row);
      const fighterId = fighterIdFromAny(row);
      if (!code || !fighterId) continue;
      ctxByToernooiFighter.set(`${code}__${fighterId}`, row);
    }

    const add = (args: {
      partij_nr: number;
      partij: string;
      hoek: "rood" | "blauw";
      naam: string;
      gym: string;
      detail: string;
      dedupeKey: string;
    }) => {
      const naam = safe(args.naam);
      const key = `${args.dedupeKey}__licentie`;
      if (seen.has(key)) return;
      seen.add(key);

      items.push({
        partij_nr: args.partij_nr,
        partij: args.partij,
        hoek: args.hoek,
        naam,
        gym: safe(args.gym),
        label: "Geen licentie",
        detail: args.detail,
        sortNaam: naam.toLowerCase(),
      });
    };

    for (const r of resultaten ?? []) {
      if (!isLicentieRow(r)) continue;
      if (isApprovedOrClosed(r.review_status)) continue;

      const res = normResultaatLower(r.resultaat);
      if (res === "" || res === "ok") continue;

      const code = codeFromAny(r);
      const fighterId = fighterIdFromAny(r);
      const pn = Number(r.partij_nr);
      const isToernooiResultaat = (Number.isFinite(pn) && pn === 0) || !!code;

      if (isToernooiResultaat) {
        const toernooiCode = code || "TOERNOOI";
        const ctx = fighterId ? ctxByToernooiFighter.get(`${toernooiCode}__${fighterId}`) : null;
        if (shouldIgnoreLicentieForBoksen(r, ctx)) continue;

        const naam =
          safeRaw(ctx?.naam ?? ctx?.naam_fp ?? ctx?.naam_mm ?? r.naam) ||
          naamFromLicentieBoodschap(r) ||
          (fighterId ? `VA ${fighterId}` : "Toernooi deelnemer");

        const gym = safeRaw(ctx?.sportschool ?? ctx?.sportschool_mm ?? r.sportschool);
        const naamKey = naam.trim().toLowerCase().replace(/\s+/g, " ");
        const gymKey = gym.trim().toLowerCase().replace(/\s+/g, " ");

        add({
          partij_nr: Number.isFinite(pn) ? pn : 0,
          partij: toernooiCode,
          hoek: inferHoek(r) ?? "rood",
          naam,
          gym,
          detail: safe(r.boodschap ?? r.rule ?? "Licentie ontbreekt of ongeldig"),
          // Toernooivechters kunnen dubbel in controle_resultaten staan:
          // soms één regel met fighter_id en één regel zonder. Daarom niet op boodschap dedupen,
          // maar op dezelfde deelnemer binnen hetzelfde toernooi.
          dedupeKey: `${toernooiCode}__${fighterId || `${naamKey}__${gymKey}`}`,
        });

        continue;
      }

      if (!Number.isFinite(pn) || !gewonePartijNrs.has(pn)) continue;

      const ctx = ctxByPartij.get(pn) ?? null;
      if (shouldIgnoreLicentieForBoksen(r, ctx)) continue;

      const hoek = inferHoek(r) ?? "rood";
      const naam =
        hoek === "rood"
          ? safeRaw(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm ?? ctx?.rood_naam) || naamFromLicentieBoodschap(r)
          : safeRaw(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm ?? ctx?.blauw_naam) || naamFromLicentieBoodschap(r);

      add({
        partij_nr: pn,
        partij: safe(ctx?.partij_label ?? pn),
        hoek,
        naam,
        gym:
          hoek === "rood"
            ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym)
            : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym),
        detail: safe(r.boodschap ?? r.rule ?? "Licentie ontbreekt of ongeldig"),
        dedupeKey: `${pn}__${hoek}`,
      });
    }

    return items.sort((a, b) =>
      (a.sortNaam ?? a.naam).localeCompare(b.sortNaam ?? b.naam, "nl")
    );
  }, [resultaten, ctxByPartij, gewonePartijNrs, toernooiRows]);

  const missingVaIssues = useMemo(() => {
    const items: IssueSummaryItem[] = [];
    const seen = new Set<string>();

    const missingRows = dedupeRows(
      (resultaten ?? []).filter((r) => {
        const pn = Number(r.partij_nr);
        if (!Number.isFinite(pn) || !gewonePartijNrs.has(pn)) return false;
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
      if (!ctx) continue;

      const partij = getPartijLabel(ctx);
      const naam =
        hoek === "rood"
          ? safe(ctx?.rood_naam_fp ?? ctx?.rood_naam_mm ?? ctx?.rood_naam)
          : safe(ctx?.blauw_naam_fp ?? ctx?.blauw_naam_mm ?? ctx?.blauw_naam);

      const key = `${naam.toLowerCase()}__va-ontbreekt`;
      if (seen.has(key)) continue;
      seen.add(key);

      items.push({
        partij_nr: pn,
        partij,
        hoek,
        naam,
        gym:
          hoek === "rood"
            ? safe(ctx?.rood_gym_fp ?? ctx?.rood_gym_mm ?? ctx?.rood_gym)
            : safe(ctx?.blauw_gym_fp ?? ctx?.blauw_gym_mm ?? ctx?.blauw_gym),
        label: "VA ontbreekt",
        detail: safe(r.boodschap ?? r.rule ?? "Fightpaspoortnummer ontbreekt"),
        sortNaam: naam.toLowerCase(),
      });
    }

    return items.sort((a, b) =>
      (a.sortNaam ?? a.naam).localeCompare(b.sortNaam ?? b.naam, "nl")
    );
  }, [resultaten, ctxByPartij, gewonePartijNrs]);

  const openKeurmerkRows = useMemo(() => {
    return (resultaten ?? []).filter((r) => {
      const pn = Number(r.partij_nr);
      if (!Number.isFinite(pn) || !gewonePartijNrs.has(pn)) return false;
      return isKeurmerkOpenIssue(r) && !isBelgischeManualCheckRow(r);
    });
  }, [resultaten, gewonePartijNrs]);

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
      if (!Number.isFinite(pn) || isTrueLike(p?.is_toernooi)) continue;
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
      if (!Number.isFinite(pn) || !gewonePartijNrs.has(pn)) continue;
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
      if (isApprovedOrClosed(r.review_status)) continue;
      if (!isFightpaspoortGewijzigd(r)) continue;

      const pn = Number(r.partij_nr);
      const hoek = inferHoek(r);
      if (!Number.isFinite(pn) || !hoek || !gewonePartijNrs.has(pn)) continue;

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
  }, [auditEvents, ctxByPartij, ctxRows, resultaten, gewonePartijNrs]);

  const sportschoolIssues = useMemo(() => {
    const belgischeCheck = new Set<string>();
    const nietGevonden = new Set<string>();
    const geenKeurmerk = new Set<string>();
    const geenData = new Set<string>();
    const verlopen = new Set<string>();
    const datumOntbreekt = new Set<string>();

    for (const r of resultaten ?? []) {
      const pn = Number(r.partij_nr);
      if (!Number.isFinite(pn) || !gewonePartijNrs.has(pn)) continue;

      const isRelevant =
        isBelgischeManualCheckRow(r) ||
        isKeurmerkOpenIssue(r) ||
        (isSportschoolMatchRow(r) && !isApprovedOrClosed(r.review_status));

      if (!isRelevant) continue;

      const tekst = `${r.rule_code ?? ""} ${r.rule ?? ""} ${r.boodschap ?? ""} ${r.aantekeningen ?? ""}`.toLowerCase();
      const quoted = String(r.boodschap ?? "").match(/"([^"]+)"/);
      const hoek = inferHoek(r);
      const ctx = ctxByPartij.get(pn);

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

    const uniqueGyms = (values: Set<string>) => {
      const map = new Map<string, string>();
      for (const value of values) {
        const label = safeRaw(value);
        if (!label || label === "-") continue;
        const key = normGymKey(label);
        const prev = map.get(key);
        if (!prev || label.length < prev.length || label.localeCompare(prev, "nl") < 0) {
          map.set(key, label);
        }
      }
      return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "nl"));
    };

    return {
      belgischeCheck: uniqueGyms(belgischeCheck),
      nietGevonden: uniqueGyms(nietGevonden),
      geenKeurmerk: uniqueGyms(geenKeurmerk),
      geenData: uniqueGyms(geenData),
      verlopen: uniqueGyms(verlopen),
      datumOntbreekt: uniqueGyms(datumOntbreekt),
    };
  }, [resultaten, ctxByPartij, gewonePartijNrs]);

  const sportschoolIssueCount = useMemo(() => {
    return (
      sportschoolIssues.nietGevonden.length +
      sportschoolIssues.geenData.length +
      sportschoolIssues.datumOntbreekt.length +
      sportschoolIssues.verlopen.length +
      sportschoolIssues.geenKeurmerk.length
    );
  }, [sportschoolIssues]);

  const toernooiMeldingen = useMemo(() => {
    const map = new Map<string, ToernooiFighterIssue>();
    const seen = new Set<string>();

    const normalizeIssueGroup = (label: string, detail: string) => {
      const l = String(label ?? "").trim().toLowerCase();
      const d = String(detail ?? "").trim().toLowerCase();

      if (
        l.includes("verkeerde klasse") ||
        l.includes("boutklasse") ||
        l.includes("klasse") ||
        d.includes("verkeerde klasse") ||
        d.includes("boutklasse klopt niet") ||
        d.includes("hoort niet in") ||
        d.includes("mag maximaal")
      ) {
        return "klasse_mismatch";
      }

      if (l.includes("leeftijd") || d.includes("maanden") || d.includes("jeugd/volwassen")) return "leeftijd";
      if (l.includes("partijverschil") || d.includes("partijverschil") || d.includes("verschil")) return "partijverschil";
      if (l.includes("gewicht") || d.includes("gewicht") || d.includes("kg")) return "gewicht";
      if (l.includes("rondetijd") || l.includes("ronde") || d.includes("rondetijd") || d.includes("ronde")) return "rondetijd";
      if (l.includes("verbod") || d.includes("verbod")) return "verbod";
      if (l.includes("dispensatie") || d.includes("dispensatie")) return "dispensatie";
      if (l.includes("afkeur") || d.includes("afkeur")) return "afkeur";
      if (l.includes("actie") || d.includes("actie")) return "actie";

      return `${l}__${d}`;
    };

    const isBijzonderhedenRow = (res: ResultRow) => {
      return (
        isLicentieRow(res) ||
        isMissingVARow(res) ||
        isStartverbodRow(res) ||
        isKeurmerkRow(res) ||
        isSportschoolMatchRow(res) ||
        isBelgischeManualCheckRow(res) ||
        isFightpaspoortGewijzigd(res)
      );
    };

    const isOpenToernooiMelding = (res: ResultRow) => {
      if (isApprovedOrClosed(res.review_status)) return false;
      if (normResultaatLower(res.resultaat) === "ok") return false;

      // Toernooimeldingen moeten alle open meldingen tonen, inclusief licentie/keurmerk/VA/startverbod.
      // Die mogen alleen verdwijnen na expliciete goedkeuring.
      return true;
    };

    const codeFromAny = (row: any) =>
      String(row?.toernooi_code ?? row?.toernooiCode ?? "").trim().toUpperCase();

    const fighterIdFromAny = (row: any) =>
      normalizeVa(row?.fighter_id ?? row?.toernooi_va_nummer ?? row?.va_nummer ?? row?.fighterId);

    const ctxByToernooiFighter = new Map<string, any>();

    for (const row of toernooiRows) {
      const code = codeFromAny(row) || getToernooiCodeSafe(row);
      const fighterId = fighterIdFromAny(row);
      if (!code || !fighterId) continue;
      ctxByToernooiFighter.set(`${code}__${fighterId}`, row);
    }

    const addIssue = (args: {
      code: string;
      fighterKey: string;
      naam: string;
      gym: string;
      label: string;
      detail: string;
      status: PartijStatus;
    }) => {
      const code = args.code || "TOERNOOI";
      const fighterKey = args.fighterKey || "algemeen";
      const issueGroup = normalizeIssueGroup(args.label, args.detail);
      const baseKey = `${code}__fighter__${fighterKey}`;
      const onceKey = `${baseKey}__${issueGroup}`;

      if (seen.has(onceKey)) return;
      seen.add(onceKey);

      const existing = map.get(baseKey);

      if (!existing) {
        map.set(baseKey, {
          toernooiCode: code,
          fighterKey,
          naam: safe(args.naam, "Toernooi algemeen"),
          gym: safe(args.gym),
          hoek: null,
          scope: fighterKey.startsWith("algemeen") ? "pair" : "fighter",
          labels: [args.label],
          details: [args.detail],
          status: args.status,
        });
        return;
      }

      if (!existing.labels.some((x) => x.toLowerCase() === args.label.toLowerCase())) existing.labels.push(args.label);
      if (!existing.details.some((x) => x.toLowerCase() === args.detail.toLowerCase())) existing.details.push(args.detail);
      if (statusPrio(args.status) < statusPrio(existing.status)) existing.status = args.status;
    };

    // Nieuwe toernooi-opslag: controle_resultaten heeft toernooi_code + fighter_id/toernooi_va_nummer.
    for (const res of resultaten ?? []) {
      const pn = Number(res.partij_nr);
      const code = codeFromAny(res);
      const isToernooiResultaat = (Number.isFinite(pn) && pn === 0) || !!code;
      if (!isToernooiResultaat || !isOpenToernooiMelding(res)) continue;

      const status = statusFromResultaat(res.resultaat, res.rule_code);
      if (status === "OK") continue;

      const fighterId = fighterIdFromAny(res);
      const ctx = fighterId ? ctxByToernooiFighter.get(`${code}__${fighterId}`) : null;
      if (shouldIgnoreLicentieForBoksen(res, ctx)) continue;
      const label = safe(res.rule ?? res.rule_code ?? "Toernooi melding");
      const detail = safe(res.boodschap ?? res.aantekeningen ?? res.rule ?? "Toernooi melding");

      addIssue({
        code,
        fighterKey: fighterId || `algemeen:${normalizeIssueGroup(label, detail)}`,
        naam: safeRaw(ctx?.naam ?? ctx?.naam_fp ?? ctx?.naam_mm ?? res.naam) || (fighterId ? `VA ${fighterId}` : "Toernooi algemeen"),
        gym: safeRaw(ctx?.sportschool ?? ctx?.sportschool_mm ?? res.sportschool),
        label,
        detail,
        status,
      });
    }

    // Fallback voor oude runs: melding is nog gekoppeld via partij_nr aan een is_toernooi-row.
    for (const row of (ctxRows ?? []).filter((r: any) => isTrueLike(r?.is_toernooi))) {
      const pn = Number(row?.partij_nr);
      if (!Number.isFinite(pn)) continue;
      const code = getToernooiCodeSafe(row);

      const rows = (resultaten ?? []).filter((res) => !codeFromAny(res) && Number(res.partij_nr) === pn && isOpenToernooiMelding(res));

      for (const res of rows) {
        const status = statusFromResultaat(res.resultaat, res.rule_code);
        if (status === "OK") continue;
        if (shouldIgnoreLicentieForBoksen(res, row)) continue;

        const hoek = inferHoek(res);
        const label = safe(res.rule ?? res.rule_code ?? "Toernooi melding");
        const detail = safe(res.boodschap ?? res.aantekeningen ?? res.rule ?? "Toernooi melding");

        if (hoek) {
          addIssue({
            code,
            fighterKey: getToernooiFighterKey(row, hoek),
            naam: safeRaw(hoek === "rood" ? row?.rood_naam_fp ?? row?.rood_naam_mm ?? row?.rood_naam : row?.blauw_naam_fp ?? row?.blauw_naam_mm ?? row?.blauw_naam),
            gym: safeRaw(hoek === "rood" ? row?.rood_gym_fp ?? row?.rood_gym_mm ?? row?.rood_gym : row?.blauw_gym_fp ?? row?.blauw_gym_mm ?? row?.blauw_gym),
            label,
            detail,
            status,
          });
        } else {
          addIssue({
            code,
            fighterKey: getToernooiPairKey(row),
            naam: getToernooiPairNaam(row),
            gym: getToernooiPairGym(row),
            label,
            detail,
            status,
          });
        }
      }
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        labels: item.labels.sort((a, b) => a.localeCompare(b, "nl")),
        details: item.details.sort((a, b) => a.localeCompare(b, "nl")),
      }))
      .sort((a, b) => {
        if (a.toernooiCode !== b.toernooiCode) return a.toernooiCode.localeCompare(b.toernooiCode, "nl");
        if (a.scope !== b.scope) return a.scope === "fighter" ? -1 : 1;
        if (statusPrio(a.status) !== statusPrio(b.status)) return statusPrio(a.status) - statusPrio(b.status);
        return a.naam.localeCompare(b.naam, "nl");
      });
  }, [resultaten, toernooiRows, ctxRows]);

  const toernooiMeldingenByCode = useMemo(() => {
    const groups = new Map<string, ToernooiFighterIssue[]>();
    for (const item of toernooiMeldingen) {
      const code = item.toernooiCode || "TOERNOOI";
      const arr = groups.get(code) ?? [];
      arr.push(item);
      groups.set(code, arr);
    }

    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "nl"))
      .map(([code, items]) => ({
        code,
        items: items.sort((a, b) => {
          if (a.scope !== b.scope) return a.scope === "fighter" ? -1 : 1;
          if (statusPrio(a.status) !== statusPrio(b.status)) return statusPrio(a.status) - statusPrio(b.status);
          return a.naam.localeCompare(b.naam, "nl");
        }),
      }));
  }, [toernooiMeldingen]);

  const toernooiVerbodStartverbodIssues = useMemo(() => {
    const items: VerbodSummaryItem[] = [];
    const seen = new Set<string>();

    for (const item of toernooiMeldingen) {
      const hasStartverbod = item.labels.some((x) => x.toLowerCase().includes("startverbod"));
      const hasVerbod = item.labels.some((x) => x.toLowerCase().includes("verbod"));
      if (!hasStartverbod && !hasVerbod) continue;

      const type: "STARTVERBOD" | "VERBOD" = hasStartverbod ? "STARTVERBOD" : "VERBOD";
      const detail = item.details.join(" • ") || type;
      const key = `${item.toernooiCode}-${type}-${item.fighterKey}-${detail}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      items.push({
        partij_nr: 999999,
        partij: item.toernooiCode || "TOERNOOI",
        hoek: item.hoek ?? "-",
        naam: item.naam,
        gym: item.gym,
        type,
        detail,
      });
    }

    return items.sort((a, b) => {
      if (a.partij !== b.partij) return a.partij.localeCompare(b.partij, "nl");
      if (a.type !== b.type) return a.type === "STARTVERBOD" ? -1 : 1;
      return a.naam.localeCompare(b.naam, "nl");
    });
  }, [toernooiMeldingen]);

  const allVerbodStartverbodIssues = useMemo(() => {
    return [...verbodStartverbodIssues, ...toernooiVerbodStartverbodIssues];
  }, [verbodStartverbodIssues, toernooiVerbodStartverbodIssues]);

  const toernooiLicentieIssues = useMemo(() => {
    const items: IssueSummaryItem[] = [];
    const seen = new Set<string>();

    for (const item of toernooiMeldingen) {
      if (!item.labels.some((x) => x.toLowerCase().includes("licentie") || x.toLowerCase().includes("license"))) continue;
      const key = `${item.toernooiCode}-${item.fighterKey}-licentie`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        partij_nr: 999999,
        partij: item.toernooiCode || "TOERNOOI",
        hoek: item.hoek ?? "rood",
        naam: item.naam,
        gym: item.gym,
        label: "Geen licentie",
        detail: item.details.join(" • ") || "Licentie ontbreekt of ongeldig",
        sortNaam: item.naam.toLowerCase(),
      });
    }

    return items.sort((a, b) => (a.sortNaam ?? a.naam).localeCompare(b.sortNaam ?? b.naam, "nl"));
  }, [toernooiMeldingen]);

  const allLicentieIssues = useMemo(() => {
    const map = new Map<string, IssueSummaryItem>();

    for (const item of [...licentieIssues, ...toernooiLicentieIssues]) {
      const key = `${normDedupeText(item.partij)}__${normDedupeText(item.naam)}__${normGymKey(item.gym)}__licentie`;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, item);
        continue;
      }

      // Bewaar de meest herkenbare partijlabel/detail, maar toon dezelfde vechter maar één keer.
      map.set(key, {
        ...prev,
        partij: prev.partij !== "TOERNOOI" ? prev.partij : item.partij,
        detail: prev.detail.length >= item.detail.length ? prev.detail : item.detail,
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      (a.sortNaam ?? a.naam).localeCompare(b.sortNaam ?? b.naam, "nl")
    );
  }, [licentieIssues, toernooiLicentieIssues]);

  const toernooiMissingVaIssues = useMemo(() => {
    const items: IssueSummaryItem[] = [];
    const seen = new Set<string>();

    for (const item of toernooiMeldingen) {
      if (!item.labels.some((x) => x.toLowerCase().includes("geen va"))) continue;
      const key = `${item.toernooiCode}-${item.fighterKey}-va`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        partij_nr: 999999,
        partij: item.toernooiCode || "TOERNOOI",
        hoek: item.hoek ?? "rood",
        naam: item.naam,
        gym: item.gym,
        label: "VA ontbreekt",
        detail: item.details.join(" • ") || "Fightpaspoortnummer ontbreekt",
        sortNaam: item.naam.toLowerCase(),
      });
    }

    return items.sort((a, b) => (a.sortNaam ?? a.naam).localeCompare(b.sortNaam ?? b.naam, "nl"));
  }, [toernooiMeldingen]);

  const allMissingVaIssues = useMemo(() => {
    return [...missingVaIssues, ...toernooiMissingVaIssues];
  }, [missingVaIssues, toernooiMissingVaIssues]);

  const toernooiKeurmerkIssues = useMemo(() => {
    const items: IssueSummaryItem[] = [];
    const seen = new Set<string>();

    for (const item of toernooiMeldingen) {
      if (!item.labels.some((x) => x.toLowerCase().includes("keurmerk"))) continue;
      const key = `${item.toernooiCode}-${item.fighterKey}-keurmerk`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        partij_nr: 999999,
        partij: item.toernooiCode || "TOERNOOI",
        hoek: item.hoek ?? "rood",
        naam: item.naam,
        gym: item.gym,
        label: "Keurmerk",
        detail: item.details.join(" • ") || "Geen geldig keurmerk",
        sortNaam: item.naam.toLowerCase(),
      });
    }

    return items.sort((a, b) => (a.sortNaam ?? a.naam).localeCompare(b.sortNaam ?? b.naam, "nl"));
  }, [toernooiMeldingen]);

  const allKeurmerkIssues = useMemo(() => {
    return [...keurmerkIssues, ...toernooiKeurmerkIssues];
  }, [keurmerkIssues, toernooiKeurmerkIssues]);

  const toernooiFightpaspoortGewijzigd = useMemo(() => {
    const items: IssueSummaryItem[] = [];
    const seen = new Set<string>();

    for (const item of toernooiMeldingen) {
      if (!item.labels.some((x) => x.toLowerCase().includes("fightpaspoort gewijzigd"))) continue;
      const key = `${item.toernooiCode}-${item.fighterKey}-va-gewijzigd`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        partij_nr: 999999,
        partij: item.toernooiCode || "TOERNOOI",
        hoek: item.hoek ?? "rood",
        naam: item.naam,
        gym: item.gym,
        label: "Fightpaspoort gewijzigd",
        detail: `${item.naam}: ${item.details.join(" • ") || "Fightpaspoortnummer gewijzigd"}`,
        sortNaam: item.naam.toLowerCase(),
      });
    }

    return items.sort((a, b) => (a.sortNaam ?? a.naam).localeCompare(b.sortNaam ?? b.naam, "nl"));
  }, [toernooiMeldingen]);

  const allFightpaspoortGewijzigd = useMemo(() => {
    return [...fightpaspoortGewijzigd, ...toernooiFightpaspoortGewijzigd];
  }, [fightpaspoortGewijzigd, toernooiFightpaspoortGewijzigd]);

  const allSportschoolIssues = useMemo(() => {
    const uniqueGyms = (values: string[]) => {
      const map = new Map<string, string>();
      for (const value of values) {
        const label = safeRaw(value);
        if (!label || label === "-") continue;
        const key = normGymKey(label);
        const prev = map.get(key);
        if (!prev || label.length < prev.length || label.localeCompare(prev, "nl") < 0) {
          map.set(key, label);
        }
      }
      return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "nl"));
    };

    const toernooiGeenKeurmerk = toernooiKeurmerkIssues.map((x) => x.gym).filter((x) => x && x !== "-");

    return {
      belgischeCheck: uniqueGyms(sportschoolIssues.belgischeCheck),
      nietGevonden: uniqueGyms(sportschoolIssues.nietGevonden),
      geenData: uniqueGyms(sportschoolIssues.geenData),
      datumOntbreekt: uniqueGyms(sportschoolIssues.datumOntbreekt),
      verlopen: uniqueGyms(sportschoolIssues.verlopen),
      geenKeurmerk: uniqueGyms([...sportschoolIssues.geenKeurmerk, ...toernooiGeenKeurmerk]),
    };
  }, [sportschoolIssues, toernooiKeurmerkIssues]);

  const allSportschoolIssueCount = useMemo(() => {
    return (
      allSportschoolIssues.nietGevonden.length +
      allSportschoolIssues.geenData.length +
      allSportschoolIssues.datumOntbreekt.length +
      allSportschoolIssues.verlopen.length +
      allSportschoolIssues.geenKeurmerk.length
    );
  }, [allSportschoolIssues]);

  if (loading) return <div className="p-6 text-sm">Rapport laden…</div>;
  if (error) return <div className="p-6 text-sm text-red-700">Fout: {error}</div>;

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

          .cover-page,
          .page-break-after {
            page-break-after: always !important;
            break-after: page !important;
          }

          .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          table {
            page-break-inside: auto !important;
          }

          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
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

        <section className="cover-page page-break-after rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
          <div className="flex min-h-[78vh] flex-col justify-center rounded-[18px] border border-black/10 bg-[linear-gradient(180deg,#f7f7f7_0%,#ececec_100%)] px-6 py-10 text-center">
            <div className="mb-8 text-center">
              <div className="mx-auto max-w-[360px]">
                <FsLogo />
              </div>
            </div>

            <div className="mb-5">
              <div className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#ff4d00]">Controle rapport</div>
              <div className="text-4xl font-black leading-tight">{safe(eventMeta?.naam)}</div>
              <div className="mt-2 text-lg font-black text-black/80">{fmtNlDateOnly(eventMeta?.datum)}</div>
              {toernooiInfo.isToernooi ? (
                <div className="mt-3 inline-flex items-center rounded-full border border-[#ff4d00]/25 bg-[#fff3eb] px-4 py-2 text-sm font-black text-[#111827]">
                  Toernooi: {toernooiInfo.code} • {toernooiInfo.aantalToernooien} {toernooiInfo.aantalToernooien === 1 ? "toernooi aanwezig" : "toernooien aanwezig"}
                </div>
              ) : null}
            </div>

            <div className="mx-auto grid w-full max-w-4xl gap-3 text-left md:grid-cols-2">

              <div className="rounded-2xl border border-black/10 bg-white/85 px-5 py-4">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff4d00]">Bond</div>
                <div className="mt-1 text-lg font-black">{safe(eventMeta?.bondteam)}</div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/85 px-5 py-4">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff4d00]">Matchmaker</div>
                <div className="mt-1 text-lg font-black">{safe(eventMeta?.matchmaker)}</div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/85 px-5 py-4">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff4d00]">Promotor</div>
                <div className="mt-1 text-lg font-black">{safe(eventMeta?.promotor)}</div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/85 px-5 py-4 md:col-span-2">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff4d00]">Locatie</div>
                <div className="mt-1 text-lg font-black">{safe(eventMeta?.locatie)}</div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/85 px-5 py-4 md:col-span-2">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff4d00]">Controle run</div>
                <div className="mt-1 text-sm font-bold">
                  {safe(run?.status)} • gestart: {fmtDateTime(run?.gestart_op)}
                </div>
                <div className="text-sm font-bold">afgerond: {fmtDateTime(run?.afgerond_op)}</div>
                <div className="mt-2 text-xs font-semibold text-black/70">Matchmaking ID: {matchmakingId}</div>
              </div>

              {toernooiInfo.isToernooi ? (
                <div className="rounded-2xl border border-[#ff4d00]/25 bg-[#fff7f3] px-5 py-4 md:col-span-2">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff4d00]">Toernooi</div>
                  <div className="mt-1 text-lg font-black">{toernooiInfo.code}</div>
                  <div className="mt-1 text-sm font-semibold text-black/70">
                    {toernooiInfo.aantalToernooien} {toernooiInfo.aantalToernooien === 1 ? "toernooi aanwezig" : "toernooien aanwezig"}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>



        <section className="mt-4 rounded-[24px] border border-black/10 bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[18px] border border-black/10">
              <SectionTitle right={`${allVerbodStartverbodIssues.length}`}>VERBOD / STARTVERBOD</SectionTitle>
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
                    {allVerbodStartverbodIssues.length ? (
                      allVerbodStartverbodIssues.map((item, idx) => (
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
              <SectionTitle right={`${allLicentieIssues.length}`}>GEEN LICENTIE</SectionTitle>
              <div className="overflow-x-auto px-3 pb-3">
                <table className="w-full border-separate border-spacing-y-[2px] text-xs">
                  <thead>
                    <tr>
                      <th className="rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Partij</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Vechter</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Gym</th>
                      <th className="rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLicentieIssues.length ? (
                      allLicentieIssues.map((item, idx) => (
                        <tr key={`${item.partij}-${item.naam}-${item.label}-${idx}`}>
                          <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`}>{item.partij}</td>
                          <td className={`px-2 py-1.5 font-semibold ${rowBg(idx)}`}>{item.naam}</td>
                          <td className={`px-2 py-1.5 ${rowBg(idx)}`}>{item.gym}</td>
                          <td className={`rounded-r-md px-2 py-1.5 ${rowBg(idx)}`}>{item.detail}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="rounded-md bg-white px-3 py-3 text-sm text-black/70">
                          Geen open licentieproblemen.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-[18px] border border-black/10">
              <SectionTitle right={allMissingVaIssues.length}>ONTBREKENDE VA NUMMERS</SectionTitle>
              <div className="overflow-x-auto px-3 pb-3">
                <table className="w-full border-separate border-spacing-y-[2px] text-xs">
                  <thead>
                    <tr>
                      <th className="rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Partij</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Vechter</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Gym</th>
                      <th className="rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allMissingVaIssues.length ? (
                      allMissingVaIssues.map((item, idx) => (
                        <tr key={`${item.partij}-${item.naam}-missing-va-${idx}`}>
                          <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`}>{item.partij}</td>
                          <td className={`px-2 py-1.5 font-semibold ${rowBg(idx)}`}>{item.naam}</td>
                          <td className={`px-2 py-1.5 ${rowBg(idx)}`}>{item.gym}</td>
                          <td className={`rounded-r-md px-2 py-1.5 ${rowBg(idx)}`}>{item.detail}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="rounded-md bg-white px-3 py-3 text-sm text-black/70">
                          Geen ontbrekende VA-nummers.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-[18px] border border-black/10">
              <SectionTitle right={allFightpaspoortGewijzigd.length}>FIGHTPASPOORT NUMMER GEWIJZIGD</SectionTitle>
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
                    {allFightpaspoortGewijzigd.length ? (
                      allFightpaspoortGewijzigd.map((item, idx) => (
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
                          Geen wijzigingen.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-[18px] border border-black/10">
              <SectionTitle right={allSportschoolIssueCount}>SPORTSCHOLEN ZONDER KEURMERK / GEEN KEURMERK INFO</SectionTitle>
              <div className="overflow-x-auto px-3 pb-3">
                <table className="w-full border-separate border-spacing-y-[2px] text-xs">
                  <thead>
                    <tr>
                      <th className="rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Soort</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Sportschool</th>
                      <th className="rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSportschoolIssueCount ? (
                      <>
                        {allSportschoolIssues.nietGevonden.map((gym, idx) => (
                          <tr key={`sportschool-niet-gevonden-${gym}-${idx}`}>
                            <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`}>Niet gevonden</td>
                            <td className={`px-2 py-1.5 font-semibold ${rowBg(idx)}`}>{gym}</td>
                            <td className={`rounded-r-md px-2 py-1.5 ${rowBg(idx)}`}>Geen match in sportscholen. Maak alias aan of koppel juiste sportschool.</td>
                          </tr>
                        ))}
                        {allSportschoolIssues.geenData.map((gym, idx) => {
                          const rowIndex = allSportschoolIssues.nietGevonden.length + idx;
                          return (
                            <tr key={`sportschool-geen-data-${gym}-${idx}`}>
                              <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(rowIndex)}`}>Geen keurmerk info</td>
                              <td className={`px-2 py-1.5 font-semibold ${rowBg(rowIndex)}`}>{gym}</td>
                              <td className={`rounded-r-md px-2 py-1.5 ${rowBg(rowIndex)}`}>Geen bruikbare keurmerkdata gevonden of meerdere matches.</td>
                            </tr>
                          );
                        })}
                        {allSportschoolIssues.datumOntbreekt.map((gym, idx) => {
                          const rowIndex = allSportschoolIssues.nietGevonden.length + allSportschoolIssues.geenData.length + idx;
                          return (
                            <tr key={`sportschool-datum-ontbreekt-${gym}-${idx}`}>
                              <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(rowIndex)}`}>Datum ontbreekt</td>
                              <td className={`px-2 py-1.5 font-semibold ${rowBg(rowIndex)}`}>{gym}</td>
                              <td className={`rounded-r-md px-2 py-1.5 ${rowBg(rowIndex)}`}>Keurmerkinfo gevonden maar datum/vervaldatum ontbreekt.</td>
                            </tr>
                          );
                        })}
                        {allSportschoolIssues.verlopen.map((gym, idx) => {
                          const rowIndex = allSportschoolIssues.nietGevonden.length + allSportschoolIssues.geenData.length + allSportschoolIssues.datumOntbreekt.length + idx;
                          return (
                            <tr key={`sportschool-verlopen-${gym}-${idx}`}>
                              <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(rowIndex)}`}>Keurmerk verlopen</td>
                              <td className={`px-2 py-1.5 font-semibold ${rowBg(rowIndex)}`}>{gym}</td>
                              <td className={`rounded-r-md px-2 py-1.5 ${rowBg(rowIndex)}`}>Keurmerk gevonden maar niet meer geldig op eventdatum.</td>
                            </tr>
                          );
                        })}
                        {allSportschoolIssues.geenKeurmerk.map((gym, idx) => {
                          const rowIndex = allSportschoolIssues.nietGevonden.length + allSportschoolIssues.geenData.length + allSportschoolIssues.datumOntbreekt.length + allSportschoolIssues.verlopen.length + idx;
                          return (
                            <tr key={`sportschool-geen-keurmerk-${gym}-${idx}`}>
                              <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(rowIndex)}`}>Geen keurmerk</td>
                              <td className={`px-2 py-1.5 font-semibold ${rowBg(rowIndex)}`}>{gym}</td>
                              <td className={`rounded-r-md px-2 py-1.5 ${rowBg(rowIndex)}`}>Sportschool heeft geen geldig keurmerk op datum evenement.</td>
                            </tr>
                          );
                        })}
                      </>
                    ) : (
                      <tr>
                        <td colSpan={3} className="rounded-md bg-white px-3 py-3 text-sm text-black/70">
                          Geen open sportschool- of keurmerkmeldingen.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-[18px] border border-black/10">
              <SectionTitle right={`${allSportschoolIssues.belgischeCheck.length}`}>SPORTSCHOLEN BUITEN NEDERLAND</SectionTitle>
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
                    {allSportschoolIssues.belgischeCheck.length ? (
                      allSportschoolIssues.belgischeCheck.map((gym, idx) => (
                        <tr key={`belgische-check-${gym}-${idx}`}>
                          <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`}>Buitenlandse sportschool</td>
                          <td className={`px-2 py-1.5 font-semibold ${rowBg(idx)}`}>{gym}</td>
                          <td className={`rounded-r-md px-2 py-1.5 ${rowBg(idx)}`}>
                            Buitenlandse sportschool. Geen NVB-keurmerk vereist. Controleer de licentie/registratie volgens de regels van het betreffende land.
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="rounded-md bg-white px-3 py-3 text-sm text-black/70">
                          Geen open Belgische meldingen.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-[18px] border border-black/10">
              <SectionTitle right={wedstrijdenMetMeldingen.length}>WEDSTRIJDMELDINGEN</SectionTitle>
              <div className="px-3 pb-3">
                {wedstrijdenMetMeldingen.length ? (
                  <div className="space-y-4">
                    {wedstrijdenMetMeldingen.map((item) => (
                      <section
                        key={`wedstrijd-meldingen-${item.partij_nr}`}
                        className="avoid-break overflow-hidden rounded-[16px] border border-black/10 bg-[#f8fafc]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#e9edf2] px-3 py-2">
                          <div>
                            <div className="text-sm font-black text-black">Partij {item.partij_label}</div>
                            <div className="text-xs font-semibold text-black/70">
                              {item.discipline} • {item.klasse} • Max {item.max_gewicht} kg
                            </div>
                          </div>
                          <Badge status={item.status} />
                        </div>

                        <div className="grid gap-3 border-b border-black/10 px-3 py-3 md:grid-cols-2">
                          <div className="rounded-xl border border-[#ff4d00]/30 bg-white p-3">
                            <div className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#ff4d00]">Rood</div>
                            <div className="font-black">{item.roodNaam}</div>
                            <div className="text-xs text-black/70">{item.roodGym}</div>
                            <div className="mt-1 text-xs font-mono text-black/70">VA: {item.roodVa}</div>
                          </div>
                          <div className="rounded-xl border border-[#2563eb]/30 bg-white p-3">
                            <div className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#2563eb]">Blauw</div>
                            <div className="font-black">{item.blauwNaam}</div>
                            <div className="text-xs text-black/70">{item.blauwGym}</div>
                            <div className="mt-1 text-xs font-mono text-black/70">VA: {item.blauwVa}</div>
                          </div>
                        </div>

                        <div className="overflow-x-auto px-3 py-3">
                          <table className="w-full border-separate border-spacing-y-[2px] text-xs">
                            <thead>
                              <tr>
                                <th className="rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Resultaat</th>
                                <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Regel</th>
                                <th className="rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Melding</th>
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
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md bg-white px-3 py-3 text-sm text-black/70">
                    Geen open wedstrijdmeldingen.
                  </div>
                )}
              </div>
            </div>


            {toernooiMeldingenByCode.length ? (
              <div className="space-y-4">
            {toernooiMeldingenByCode.map(({ code, items }) => (
                <section
                  key={code}
                  className="avoid-break overflow-hidden rounded-[18px] border border-black/10 bg-[linear-gradient(180deg,#fff5ef_0%,#fff 100%)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#ff4d00] px-4 py-2">
                    <div className="text-sm font-black text-black">TOERNOOI {code} — MELDINGENBLOK</div>
                    <div className="rounded-full bg-black px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white">
                      {items.length} unieke meldingen
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="mb-3 text-sm font-semibold text-black/75">
                      Alle unieke meldingen van de vechters binnen {code}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-separate border-spacing-y-[2px] text-xs">
                        <thead>
                          <tr>
                            <th className="rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Vechter</th>
                            <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Gym</th>
                            <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Soorten</th>
                            <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Status</th>
                            <th className="rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                            <tr key={`${code}-${item.fighterKey}-${item.scope}`}>
                              <td className={`rounded-l-md px-2 py-1.5 font-semibold ${rowBg(idx)}`}>{item.naam}</td>
                              <td className={`px-2 py-1.5 ${rowBg(idx)}`}>{item.gym}</td>
                              <td className={`px-2 py-1.5 ${rowBg(idx)}`}>{item.labels.join(" • ")}</td>
                              <td className={`px-2 py-1.5 ${rowBg(idx)}`}><Badge status={item.status} /></td>
                              <td className={`rounded-r-md px-2 py-1.5 ${rowBg(idx)}`}>{item.details.join(" • ")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              ))}
          </div>
            ) : (
              <div className="rounded-md bg-white px-3 py-3 text-sm text-black/70">Geen open toernooimeldingen.</div>
            )}

            <div className="overflow-hidden rounded-[18px] border border-black/10">
              <SectionTitle right={partijenCompact.length}>WEDSTRIJDEN</SectionTitle>
              <div className="overflow-x-auto px-3 pb-3">
                <table className="w-full border-separate border-spacing-y-[2px] text-xs">
                  <thead>
                    <tr>
                      <th className="rounded-l-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Partij</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Discipline</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Klasse</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Max KG</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Rood</th>
                      <th className="bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Blauw</th>
                      <th className="rounded-r-md bg-[#3a3f46] px-2 py-1 text-left font-black text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partijenCompact.length ? (
                      partijenCompact.map((item, idx) => (
                        <tr key={`compact-${item.partij_nr}-${idx}`}>
                          <td className={`rounded-l-md px-2 py-1.5 font-bold ${rowBg(idx)}`}>{item.partij_label}</td>
                          <td className={`px-2 py-1.5 ${rowBg(idx)}`}>{item.discipline}</td>
                          <td className={`px-2 py-1.5 ${rowBg(idx)}`}>{item.klasse}</td>
                          <td className={`px-2 py-1.5 ${rowBg(idx)}`}>{item.max_gewicht}</td>
                          <td className={`px-2 py-1.5 ${rowBg(idx)}`}>{item.rood} • {item.rood_gym}</td>
                          <td className={`px-2 py-1.5 ${rowBg(idx)}`}>{item.blauw} • {item.blauw_gym}</td>
                          <td className={`rounded-r-md px-2 py-1.5 ${rowBg(idx)}`}><Badge status={item.status} /></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="rounded-md bg-white px-3 py-3 text-sm text-black/70">
                          Geen wedstrijden gevonden.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}