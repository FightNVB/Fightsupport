"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  User,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { authedFetch } from "@/lib/api/authedFetch";

type Uitslag = {
  id?: string;
  datum?: string | null;
  evenement?: string | null;
  tegenstander?: string | null;
  uitslag?: string | null;
  discipline?: string | null;
  klasse?: string | null;
  gewicht?: string | number | null;
  sportschool?: string | null;
};

type Sportschool = {
  sportschool_id?: string | number | null;
  naam?: string | null;
  plaats?: string | null;
  land?: string | null;
  keurmerk_start?: string | null;
  keurmerk_einde?: string | null;
};

type FighterRuleResultRow = {
  id?: string | number;
  yoc_event_id?: string | null;
  yoc_run_id?: string | null;
  fighter_raw_id?: string | null;
  rule?: string | null;
  rule_code?: string | null;
  resultaat?: string | null;
  severity?: string | null;
  boodschap?: string | null;
  review_status?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
};

type YocHeader = {
  id?: string | null;
  naam?: string | null;
  event_name?: string | null;
  event_datum?: string | null;
  locatie?: string | null;
  status?: string | null;
  raw_filename?: string | null;
};

type CorrectFighterForm = {
  va_nummer: string;
  naam: string;
  sportschool: string;
  geslacht: string;
  gewicht: string;
  emailadres: string;
  telefoonnummer: string;
  naam_trainer: string;
};

function normalizeVa(v: unknown) {
  return String(v ?? "").replace(/[^0-9]/g, "");
}

function isUuid(v: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v ?? "").trim());
}

function firstFilled(...vals: unknown[]) {
  for (const val of vals) {
    const out = String(val ?? "").trim();
    if (out) return out;
  }
  return "";
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function mapResultLevel(severity?: string | null, resultaat?: string | null) {
  const sev = String(severity ?? "").trim().toLowerCase();
  const res = String(resultaat ?? "").trim().toLowerCase();
  if (sev === "error" || res.includes("verbod") || res.includes("afkeur")) return "error";
  if (sev === "warning" || res.includes("dispensatie") || res.includes("actie") || res.includes("let")) return "warn";
  if (sev === "info" || res.includes("info")) return "info";
  return "ok";
}

function dedupeRules(rows: FighterRuleResultRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = [row.rule, row.rule_code, row.resultaat, row.boodschap]
      .map((x) => String(x ?? "").trim().toLowerCase())
      .join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function calcAgeAtDate(birth?: string | null, at?: string | null) {
  if (!birth || !at) return null;
  const b = new Date(birth);
  const e = new Date(at);
  if (Number.isNaN(b.getTime()) || Number.isNaN(e.getTime())) return null;
  let years = e.getFullYear() - b.getFullYear();
  const beforeBirthday = e.getMonth() < b.getMonth() || (e.getMonth() === b.getMonth() && e.getDate() < b.getDate());
  if (beforeBirthday) years -= 1;
  return years;
}

function extractKeurmerkDate(reason?: string | null) {
  const raw = String(reason ?? "").trim();
  const iso = raw.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
  if (iso && !Number.isNaN(new Date(iso).getTime())) return iso;
  const nl = raw.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (nl) return `${nl[3]}-${nl[2]}-${nl[1]}`;
  return null;
}

function getResultKind(v?: string | null): "win" | "loss" | "draw" | "other" {
  const x = String(v ?? "").trim().toLowerCase();
  if (x.includes("onbeslist") || x.includes("draw") || x.includes("gelijk")) return "draw";
  if (x.includes("verlies") || x.includes("verliest") || x.includes("verloren") || x.includes("loss") || x === "l") return "loss";
  if (x.includes("winst") || x.includes("wint") || x.includes("gewonnen") || x === "win" || x === "w") return "win";
  return "other";
}

function normalizeClassToken(v?: string | null) {
  const x = String(v ?? "").trim().toLowerCase();
  if (!x) return "";
  if (x.includes("jeugd") || x.includes("youth") || /^j(\b|\s|\/|-)/i.test(x) || x === "j") return "j";
  if (x.includes("recreant") || /^r(\b|\s|\/|-)/i.test(x) || x === "r") return "r";
  if (x.includes("nieuweling") || /^n(\b|\s|\/|-)/i.test(x) || x === "n") return "n";
  if (x.includes("c-klasse") || x.includes("c klasse") || /^c(\b|\s|\/|-)/i.test(x) || x === "c") return "c";
  if (x.includes("b-klasse") || x.includes("b klasse") || /^b(\b|\s|\/|-)/i.test(x) || x === "b") return "b";
  if (x.includes("a-klasse") || x.includes("a klasse") || x.includes("elite") || /^a(\b|\s|\/|-)/i.test(x) || x === "a") return "a";
  return x.replace(/[^a-z0-9+]/g, "");
}

function classRank(token?: string | null) {
  const t = normalizeClassToken(token);
  const order: Record<string, number> = { j: 1, r: 2, n: 3, c: 4, b: 5, a: 6 };
  return order[t] ?? 0;
}

function highestRecordClass(rows: Uitslag[]) {
  let best = "";
  let bestRank = 0;
  for (const row of rows) {
    const token = normalizeClassToken(row.klasse);
    const rank = classRank(token);
    if (rank > bestRank) {
      best = token;
      bestRank = rank;
    }
  }
  return best;
}

function displayClassToken(v?: string | null) {
  const token = normalizeClassToken(v);
  const labels: Record<string, string> = { j: "J", r: "R", n: "N", c: "C", b: "B", a: "A" };
  return labels[token] ?? safe(v);
}

function resultLabel(v?: string | null) {
  const kind = getResultKind(v);
  if (kind === "win") return "Winst";
  if (kind === "loss") return "Verlies";
  if (kind === "draw") return "Onbeslist";
  const x = String(v ?? "").trim().toLowerCase();
  if (x.includes("demo")) return "Demo";
  if (x.includes("no contest") || x.includes("nocontest") || x === "nc") return "No contest";
  return safe(v);
}

function ruleLabel(rule?: string | null, code?: string | null) {
  const key = String(code || rule || "").trim().toUpperCase();
  const labels: Record<string, string> = {
    YOC_OK: "Geen meldingen",
    YOC_GEEN_LICENTIE: "Licentie ontbreekt",
    YOC_STARTVERBOD: "Startverbod",
    YOC_GEEN_KEURMERK: "Keurmerk sportschool ongeldig",
    YOC_SPORTSCHOOL_NIET_GEVONDEN: "Sportschool niet gevonden",
    YOC_KEURMERK_BELGIE_CHECK: "Belgische sportschool controleren",
    YOC_KEURMERK_EVENTDATUM_ONTBREEKT: "Eventdatum ontbreekt voor keurmerk",
    YOC_LEEFTIJD_ONBEKEND: "Leeftijd onbekend",
    YOC_18_PLUS_VERBODEN: "18+ niet toegestaan",
    YOC_NAAM_WIJKT_AF: "Naam wijkt af",
    YOC_GESLACHT_WIJKT_AF: "Geslacht wijkt af",
  };
  if (labels[key]) return labels[key];
  const raw = String(rule || code || "Melding").trim();
  return raw.replace(/^YOC[_-]?/i, "").replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
}

function extractKeurmerkName(reason?: string | null, fallback = "-") {
  const match = String(reason ?? "").match(/gematcht met\s+\"([^\"]+)\"/i);
  return match?.[1] || fallback;
}

function safe(v: any, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function parseRaw(raw: any) {
  if (!raw) return {} as any;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return {} as any;
  }
}

function formatDate(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function yes(value: any, positiveWords = ["ja", "yes", "true", "ok", "geldig", "actief"]) {
  const s = String(value ?? "").trim().toLowerCase();
  return value === true || positiveWords.some((w) => s === w || s.includes(w));
}

function licenseValue(fighter: any) {
  const raw = parseRaw(fighter?.raw);
  return fighter?.licentie ?? fighter?.licentie_status ?? fighter?.heeft_licentie ?? raw?.details?.licentie ?? null;
}

function hasStartverbod(fighter: any) {
  const raw = parseRaw(fighter?.raw);
  return (
    yes(fighter?.heeft_startverbod, ["ja", "yes", "true"]) ||
    yes(fighter?.startverbod, ["ja", "yes", "true"]) ||
    yes(raw?.details?.heeft_startverbod, ["ja", "yes", "true"])
  );
}

export default function YocFighterDetailPage() {
  const params = useParams<{ yocId: string; fighterId: string }>();
  const router = useRouter();

  const yocId = String(params?.yocId ?? "").trim();
  const fighterId = String(params?.fighterId ?? "").trim();

  const [fighter, setFighter] = useState<any>(null);
  const [uploadRow, setUploadRow] = useState<any>(null);
  const [sportschool, setSportschool] = useState<Sportschool | null>(null);
  const [yocEvent, setYocEvent] = useState<YocHeader | null>(null);
  const [uitslagen, setUitslagen] = useState<Uitslag[]>([]);
  const [meldingen, setMeldingen] = useState<FighterRuleResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [savingCorrectie, setSavingCorrectie] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [correctForm, setCorrectForm] = useState<CorrectFighterForm>({
    va_nummer: "",
    naam: "",
    sportschool: "",
    geslacht: "",
    gewicht: "",
    emailadres: "",
    telefoonnummer: "",
    naam_trainer: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (yocId && fighterId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yocId, fighterId]);

  async function load() {
    try {
      setLoading(true);
      setError("");

      if (!isUuid(yocId)) throw new Error("Ongeldig YOC-id in de URL.");
      if (!isUuid(fighterId)) throw new Error("Ongeldig fighter-id in de URL.");

      const { data: eventRows, error: eventErr } = await supabase
        .from("yoc_events")
        .select("*")
        .eq("id", yocId)
        .limit(1);

      if (eventErr) throw eventErr;
      const event = (eventRows ?? [])[0] ?? null;
      setYocEvent(event);

      const { data: uploadRows, error: uploadErr } = await supabase
        .from("yoc_fighters")
        .select("*")
        .eq("yoc_event_id", yocId)
        .eq("id", fighterId)
        .limit(1);

      if (uploadErr) throw uploadErr;
      const upload = (uploadRows ?? [])[0] ?? null;

      // De detail-URL gebruikt yoc_fighters.id. De context/resultaten kunnen echter
      // gekoppeld zijn via yoc_fighter_id, fighter_raw_id of VA. Daarom zoeken we breed.
      let ctxRows: any[] = [];
      let ctxErr: any = null;

      const ctxRes = await supabase
        .from("yoc_fighter_context")
        .select("*")
        .eq("yoc_event_id", yocId)
        .or(`yoc_fighter_id.eq.${fighterId},fighter_raw_id.eq.${fighterId}`)
        .order("updated_at", { ascending: false })
        .limit(1);

      ctxRows = (ctxRes.data ?? []) as any[];
      ctxErr = ctxRes.error;

      if (ctxErr) throw ctxErr;
      let ctx = (ctxRows ?? [])[0] ?? null;

      const uploadVa = normalizeVa(firstFilled(upload?.va_nummer_mm, upload?.va_nummer));
      if (!ctx && uploadVa) {
        const byVa = await supabase
          .from("yoc_fighter_context")
          .select("*")
          .eq("yoc_event_id", yocId)
          .eq("va_nummer", uploadVa)
          .order("updated_at", { ascending: false })
          .limit(1);
        if (byVa.error) throw byVa.error;
        ctx = (byVa.data ?? [])[0] ?? null;
      }

      if (!upload && !ctx) throw new Error("Geen YOC-vechter gevonden in yoc_fighters of yoc_fighter_context.");

      let rawRow: any = null;
      const rawId = firstFilled(ctx?.fighter_raw_id);
      const vaForRaw = normalizeVa(firstFilled(ctx?.va_nummer, upload?.va_nummer_mm, upload?.va_nummer, fighterId));

      if (rawId) {
        const rawById = await supabase
          .from("yoc_fighters_raw")
          .select("*")
          .eq("id", rawId)
          .limit(1);
        if (!rawById.error) rawRow = (rawById.data ?? [])[0] ?? null;
      }

      if (!rawRow && vaForRaw) {
        const rawByVa = await supabase
          .from("yoc_fighters_raw")
          .select("*")
          .eq("yoc_event_id", yocId)
          .eq("va_nummer", vaForRaw)
          .order("updated_at", { ascending: false })
          .limit(1);
        if (!rawByVa.error) rawRow = (rawByVa.data ?? [])[0] ?? null;
      }

      const va = normalizeVa(firstFilled(ctx?.va_nummer, rawRow?.va_nummer, upload?.va_nummer_mm, upload?.va_nummer, fighterId));
      const keurmerkReason = firstFilled(
        ctx?.keurmerk_reason,
        ctx?.keurmerk_reden,
        ctx?.keurmerk_reden_rood,
        ctx?.keurmerk_reden_blauw,
        rawRow?.keurmerk_reason,
        rawRow?.keurmerk_reden
      );

      const nextFighter = {
        id: ctx?.id ?? upload?.id ?? fighterId,
        context_id: ctx?.id ?? null,
        yoc_event_id: yocId,
        yoc_run_id: firstFilled(ctx?.yoc_run_id, ctx?.controle_run_id),
        fighter_raw_id: firstFilled(ctx?.fighter_raw_id, rawRow?.id, fighterId),
        row_index: upload?.row_index ?? ctx?.row_index ?? null,

        naam: firstFilled(ctx?.naam, ctx?.naam_fp, rawRow?.naam, rawRow?.naam_fp, ctx?.naam_mm, upload?.naam_mm, upload?.naam),
        naam_mm: firstFilled(ctx?.naam_mm, upload?.naam_mm, upload?.naam),
        fp_naam: firstFilled(ctx?.naam_fp, ctx?.fp_naam, rawRow?.naam, rawRow?.naam_fp),
        geboortedatum: firstFilled(ctx?.geboortedatum_fp, ctx?.fp_geboortedatum, rawRow?.geboortedatum, rawRow?.geboortedatum_fp, ctx?.geboortedatum, upload?.geboortedatum_mm, upload?.geboortedatum),
        fp_geboortedatum: firstFilled(ctx?.geboortedatum_fp, ctx?.fp_geboortedatum, rawRow?.geboortedatum, rawRow?.geboortedatum_fp),
        geslacht: firstFilled(ctx?.geslacht_fp, rawRow?.geslacht, rawRow?.geslacht_fp, ctx?.geslacht, ctx?.geslacht_mm, upload?.geslacht_mm, upload?.geslacht),
        geslacht_mm: firstFilled(ctx?.geslacht_mm, upload?.geslacht_mm, upload?.geslacht),
        gewicht: toNum(ctx?.gewicht_mm ?? ctx?.gewicht ?? upload?.gewicht_mm ?? upload?.gewicht),
        sportschool: firstFilled(ctx?.sportschool_mm, ctx?.sportschool, ctx?.gym, rawRow?.sportschool, rawRow?.gym, upload?.sportschool_mm, upload?.sportschool),
        sportschool_mm: firstFilled(ctx?.sportschool_mm, upload?.sportschool_mm, upload?.sportschool),
        va_nummer: va,
        va_nummer_mm: firstFilled(upload?.va_nummer_mm, ctx?.va_nummer),

        licentie: firstFilled(ctx?.licentie, ctx?.licentie_status, rawRow?.licentie, rawRow?.licentie_status),
        heeft_startverbod: firstFilled(ctx?.heeft_startverbod, ctx?.startverbod, rawRow?.heeft_startverbod, rawRow?.startverbod),
        gewonnen: toNum(ctx?.gewonnen ?? ctx?.record_w ?? ctx?.wins) ?? 0,
        verloren: toNum(ctx?.verloren ?? ctx?.record_l ?? ctx?.losses) ?? 0,
        onbeslist: toNum(ctx?.draw ?? ctx?.record_d ?? ctx?.draws ?? ctx?.gelijk) ?? 0,
        totaal_wedstrijden: toNum(ctx?.totaal_wedstrijden ?? ctx?.totaal ?? ctx?.nulmeting_totaal) ?? 0,
        nulmeting_klasse: firstFilled(ctx?.nulmeting_klasse, ctx?.klasse_fp, ctx?.klasse, rawRow?.nulmeting_klasse, rawRow?.klasse),
        nulmeting_totaal: toNum(ctx?.nulmeting_totaal) ?? 0,
        nulmeting_opmerking: firstFilled(ctx?.nulmeting_opmerking, rawRow?.nulmeting_opmerking),
        heeft_keurmerk: firstFilled(ctx?.heeft_keurmerk, ctx?.keurmerk_status, ctx?.keurmerk_ok, ctx?.keurmerk, rawRow?.heeft_keurmerk, rawRow?.keurmerk_status, rawRow?.keurmerk_ok, rawRow?.keurmerk),
        keurmerk_reden: keurmerkReason,
        scrape_status: firstFilled(ctx?.scrape_status, ctx?.gegevens_status),
        scraped_at: firstFilled(ctx?.updated_at, ctx?.created_at),
        scrape_error: firstFilled(ctx?.scrape_error),
        raw: ctx?.raw ?? ctx?.raw_json ?? rawRow?.raw ?? rawRow?.raw_json ?? {},
      };

      setUploadRow(upload);
      setFighter(nextFighter);
      setCorrectForm({
        va_nummer: safe(nextFighter.va_nummer, ""),
        naam: safe(nextFighter.naam_mm || nextFighter.naam, ""),
        sportschool: safe(nextFighter.sportschool_mm || nextFighter.sportschool, ""),
        geslacht: safe(nextFighter.geslacht_mm || nextFighter.geslacht, ""),
        gewicht: nextFighter.gewicht == null ? "" : String(nextFighter.gewicht),
        emailadres: safe(upload?.emailadres, ""),
        telefoonnummer: safe(upload?.telefoonnummer, ""),
        naam_trainer: safe(upload?.naam_trainer, ""),
      });
      setEditMode(false);

      setSportschool({
        naam: nextFighter.sportschool,
        plaats: firstFilled(ctx?.plaats, ctx?.sportschool_plaats),
        keurmerk_einde: firstFilled(ctx?.keurmerk_einddatum, ctx?.keurmerk_einde, rawRow?.keurmerk_einddatum, rawRow?.keurmerk_einde, extractKeurmerkDate(keurmerkReason)),
      });

      // yoc_resultaten heeft geen yoc_fighter_id en geen va_nummer kolom.
      // De enige harde koppeling is fighter_raw_id. VA komt uit yoc_fighters/yoc_fighters_raw/context.
      const resultRawId = firstFilled(rawId, ctx?.fighter_raw_id, rawRow?.id);

      if (resultRawId) {
        const { data: resultRows, error: resultErr } = await supabase
          .from("yoc_resultaten")
          .select("*")
          .eq("yoc_event_id", yocId)
          .eq("fighter_raw_id", resultRawId)
          .order("created_at", { ascending: true });

        if (resultErr) throw resultErr;
        setMeldingen(dedupeRules((resultRows ?? []) as FighterRuleResultRow[]));
      } else {
        setMeldingen([]);
      }

      if (va) {
        let res = await supabase
          .from("yoc_uitslagen_raw")
          .select("id,datum,evenement,tegenstander,uitslag,discipline,klasse,gewicht,sportschool,va_nummer")
          .eq("yoc_event_id", yocId)
          .eq("va_nummer", va)
          .order("datum", { ascending: false });

        if (res.error && (res.error.code === "42P01" || res.error.code === "PGRST205")) {
          setUitslagen([]);
        } else if (res.error) {
          throw res.error;
        } else {
          setUitslagen((res.data ?? []) as Uitslag[]);
        }
      } else {
        setUitslagen([]);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "YOC-vechter laden mislukt");
      setFighter(null);
      setUploadRow(null);
      setSportschool(null);
      setUitslagen([]);
      setMeldingen([]);
    } finally {
      setLoading(false);
    }
  }

  async function runAutocheckFightpaspoort() {
    if (!fighter?.va_nummer) return;

    setChecking(true);
    try {
      const va = String(fighter.va_nummer).replace(/\D/g, "");
      const res = await authedFetch(`/api/yoc/${yocId}/scrape/fighter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yoc_fighter_id: uploadRow?.id || fighterId, va_nummer: va }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || `Controle mislukt (${res.status})`);

      for (let i = 0; i < 180; i++) {
        const statusRes = await authedFetch(`/api/yoc/${yocId}/scrape/status?run_id=${json.yoc_run_id}&t=${Date.now()}`);
        const statusJson = await statusRes.json().catch(() => null);
        if (!statusRes.ok || !statusJson?.ok) throw new Error(statusJson?.error || "Status ophalen mislukt");
        if (statusJson.done) {
          if (statusJson.failed) throw new Error(statusJson.error || "Herscrape mislukt");
          break;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2500));
      }

      await load();
    } catch (err: any) {
      alert(err?.message || "Controle mislukt.");
    } finally {
      setChecking(false);
    }
  }

  async function reviewMelding(resultaatId: string | number, status: "approved" | "open") {
    if (!resultaatId) return;

    setReviewingId(resultaatId);
    try {
      const res = await authedFetch(`/api/yoc/${yocId}/resultaten/${resultaatId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_status: status,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Review opslaan mislukt.");

      setMeldingen((prev) =>
        prev.map((m) =>
          String(m.id) === String(resultaatId)
            ? {
                ...m,
                review_status: json.resultaat?.review_status ?? status,
                reviewed_at: json.resultaat?.reviewed_at ?? new Date().toISOString(),
                reviewed_by: json.resultaat?.reviewed_by ?? m.reviewed_by ?? null,
              }
            : m,
        ),
      );
    } catch (err: any) {
      alert(err?.message || "Review opslaan mislukt.");
    } finally {
      setReviewingId(null);
    }
  }

  async function saveCorrectFighter() {
    if (!uploadRow?.id) {
      alert("Deze YOC-vechter heeft geen uploadrij. Kan niet opslaan.");
      return;
    }

    setSavingCorrectie(true);
    try {
      const res = await authedFetch(`/api/yoc/${yocId}/correct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yoc_fighter_id: uploadRow.id,
          va_nummer: correctForm.va_nummer,
          naam: correctForm.naam,
          sportschool: correctForm.sportschool,
          geslacht: correctForm.geslacht,
          gewicht: correctForm.gewicht,
          emailadres: correctForm.emailadres,
          telefoonnummer: correctForm.telefoonnummer,
          naam_trainer: correctForm.naam_trainer,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Opslaan mislukt.");

      await load();
      alert("YOC-vechter opgeslagen en controle opnieuw opgebouwd.");
    } catch (err: any) {
      alert(err?.message || "Opslaan mislukt.");
    } finally {
      setSavingCorrectie(false);
    }
  }

  const raw = useMemo(() => parseRaw(fighter?.raw), [fighter?.raw]);
  const recordStats = useMemo(() => {
    if (uitslagen.length) {
      const hoogsteKlasse = highestRecordClass(uitslagen);
      return uitslagen.reduce(
        (acc, row) => {
          const kind = getResultKind(row.uitslag);
          const rowKlasse = normalizeClassToken(row.klasse);

          if (!hoogsteKlasse || rowKlasse !== hoogsteKlasse || kind === "other") {
            acc.other += 1;
            return acc;
          }

          if (kind === "win") acc.w += 1;
          else if (kind === "loss") acc.l += 1;
          else if (kind === "draw") acc.d += 1;
          else acc.other += 1;

          return acc;
        },
        { w: 0, l: 0, d: 0, other: 0 },
      );
    }

    const w = Number(fighter?.gewonnen ?? raw?.details?.gewonnen ?? 0) || 0;
    const l = Number(fighter?.verloren ?? raw?.details?.verloren ?? 0) || 0;
    const d = Number(fighter?.onbeslist ?? raw?.details?.onbeslist ?? raw?.details?.gelijk ?? 0) || 0;
    const total = Number(fighter?.totaal_wedstrijden ?? raw?.details?.totaal ?? raw?.details?.totaal_wedstrijden ?? 0) || 0;
    return { w, l, d, other: Math.max(0, total - w - l - d) };
  }, [fighter, raw, uitslagen]);

  const record = `${recordStats.w}-${recordStats.l}-${recordStats.d} (${recordStats.other})`;
  const totaalWedstrijden =
    uitslagen.length ||
    Number(fighter?.totaal_wedstrijden ?? raw?.details?.totaal ?? recordStats.w + recordStats.l + recordStats.d + recordStats.other) ||
    0;
  const hoogsteUitslagenKlasse = highestRecordClass(uitslagen);
  const klasseVolgensControle = hoogsteUitslagenKlasse
    ? displayClassToken(hoogsteUitslagenKlasse)
    : displayClassToken(fighter?.nulmeting_klasse ?? raw?.nulmeting?.klasse);
  const klasseControleBron = hoogsteUitslagenKlasse ? "uitslagen" : "nulmeting";
  const hasLicense = yes(licenseValue(fighter));
  const startverbod = hasStartverbod(fighter);
  const eventDate = yocEvent?.event_datum ?? null;
  const age = calcAgeAtDate(fighter?.fp_geboortedatum ?? fighter?.geboortedatum, eventDate);
  const isAdultForYoc = age !== null && age >= 18;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(96,74,58,0.36),transparent_30rem),radial-gradient(circle_at_bottom,rgba(255,90,31,0.08),transparent_24rem),linear-gradient(180deg,#100e0c,#080808_52%,#030303)] text-white">
      <div className="mx-auto max-w-7xl px-3 py-2 sm:px-5 lg:px-6">
        <div className="fs-chrome-panel relative mb-3 overflow-hidden rounded-[1.15rem] border-[5px] border-[#d9d6d0] bg-[linear-gradient(135deg,#251f1a,#11100f_48%,#050505)] shadow-[0_0_0_1px_#59534d,0_0_0_5px_rgba(255,255,255,0.22),0_16px_34px_rgba(0,0,0,0.86),inset_0_2px_0_rgba(255,255,255,0.78),inset_0_-2px_0_rgba(0,0,0,0.95)] before:absolute before:inset-[7px] before:rounded-[0.82rem] before:border before:border-[#8f8982] before:content-[''] after:absolute after:left-10 after:top-0 after:h-[3px] after:w-48 after:bg-[linear-gradient(90deg,transparent,#fff,transparent)] after:content-['']">
          <div className="relative min-h-[126px] px-3 py-3">
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden px-[260px]">
              <img
                src="/branding/fightsupport/fightsupport1.png"
                alt="FightSupport"
                draggable={false}
                className="h-[86px] w-auto max-w-[920px] object-contain select-none drop-shadow-[0_0_18px_rgba(255,120,40,0.24)]"
              />
            </div>

            <div className="relative z-10 flex min-h-[102px] items-center justify-between gap-4">
              <div className="flex min-w-[260px] items-center gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-[0.26em] text-[#ff8a4c]">
                    YOC vechter
                  </div>
                  <div className="truncate text-sm text-[#d1c3b7]">
                    {safe(yocEvent?.naam || yocEvent?.event_name, "YOC")}
                  </div>
                </div>
              </div>

              <div className="hidden min-w-[280px] text-right lg:block">
                <div className="text-[11px] font-black uppercase tracking-[0.32em] text-[#ff6a2a]">
                  FightSupport
                </div>
                <div className="text-xl font-black tracking-tight text-white sm:text-3xl">YOC</div>
                <div className="text-sm text-[#d1c3b7]">
                  Controleprofiel, licentie, leeftijd, nulmeting, meldingen en uitslagen.
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="rounded-[2rem] border border-[#8a8178] bg-[#161311] p-10 text-center text-lg font-black text-zinc-200 shadow-xl shadow-black/50">
            <RefreshCw className="mx-auto mb-3 animate-spin text-[#ff6a2a]" /> Laden...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-[2rem] border border-red-500/60 bg-[#2a1111] p-6 text-red-200 shadow-xl shadow-black/50">
            <div className="flex items-center gap-3 text-lg font-black">
              <XCircle /> {error}
            </div>
          </div>
        )}

        {!loading && !error && fighter && (
          <>
            <div className="relative mb-3 overflow-hidden rounded-[1.05rem] border-[5px] border-[#d9d6d0] bg-[linear-gradient(180deg,#1b1714,#0b0a09)] shadow-[0_0_0_1px_#524c46,0_0_0_7px_rgba(255,255,255,0.28),0_14px_30px_rgba(0,0,0,0.82),inset_0_2px_0_rgba(255,255,255,0.58)] before:absolute before:inset-[7px] before:rounded-[0.75rem] before:border before:border-[#89847e] before:content-['']">
              <div className="relative border-b border-[#b8afa6]/45 bg-[linear-gradient(90deg,#11100f,#211914,#3a1609)] px-4 py-2.5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <div className="text-sm font-black uppercase tracking-[0.24em] text-[#d0c4b8]">
                      {safe(sportschool?.naam, "Sportschool")}
                    </div>

                    <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-[#ff6a2a] drop-shadow-[0_2px_10px_rgba(255,120,40,0.35)] sm:text-4xl">
                      {safe(fighter.naam, "Onbekende vechter")}
                    </h1>

                    <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-xs text-zinc-300">
                      <span className="rounded-full border border-[#b8afa6] bg-[#11100f] px-2.5 py-0.5 font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                        VA {safe(fighter.va_nummer)}
                      </span>
                      <span className="rounded-full border border-[#8a8178] bg-[#11100f] px-2.5 py-0.5">
                        Geboren {formatDate(fighter.fp_geboortedatum ?? fighter.geboortedatum)}
                      </span>
                      <span className="rounded-full border border-[#8a8178] bg-[#11100f] px-2.5 py-0.5">
                        {safe(fighter.geslacht)}
                      </span>
                      {age !== null && (
                        <span className={`rounded-full border px-2.5 py-0.5 font-black ${isAdultForYoc ? "border-red-500 bg-red-950 text-red-200" : "border-[#8a8178] bg-[#11100f] text-zinc-300"}`}>
                          {age} jaar op YOC
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    <button
                      onClick={() => router.push(`/dashboard/admin/controle/yoc/${yocId}`)}
                      className="inline-flex items-center justify-center gap-2 border-2 border-[#d7d4ce] bg-[linear-gradient(180deg,#ffffff,#adadad_44%,#eeeeee_52%,#6f6f6f)] px-5 py-2 text-sm font-black text-black shadow-[inset_0_1px_0_#fff,0_5px_0_#28140c,0_8px_16px_rgba(0,0,0,0.55)] transition hover:brightness-110"
                    >
                      <ArrowLeft size={18} /> Terug
                    </button>
                    <button
                      onClick={runAutocheckFightpaspoort}
                      disabled={checking || !fighter?.va_nummer}
                      className="inline-flex items-center justify-center gap-2 border-2 border-[#ff7a3d] bg-[linear-gradient(180deg,#ff6a22,#b73600)] px-5 py-2 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_5px_0_#28140c,0_8px_16px_rgba(0,0,0,0.55)] transition hover:brightness-110 disabled:opacity-60"
                    >
                      <RefreshCw size={17} className={checking ? "animate-spin" : ""} /> Autocheck opnieuw
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative grid gap-2 p-3 md:grid-cols-5">
                <InfoCard icon={<ShieldCheck />} label="Licentie" value={hasLicense ? "Ja" : "Nee"} danger={!hasLicense} />
                <InfoCard icon={<ShieldAlert />} label="Startverbod" value={startverbod ? "Ja" : "Nee"} danger={startverbod} />
                <InfoCard icon={<User />} label="YOC leeftijd" value={age === null ? "-" : `${age} jaar`} danger={isAdultForYoc} />
                <InfoCard icon={<Trophy />} label="Record" value={record} />
                <InfoCard icon={<Dumbbell />} label="Totaal wedstrijden" value={String(totaalWedstrijden)} />
              </div>

              <div className="relative border-t border-[#b8afa6]/35 p-3">
                <div className="mb-2 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.18em] text-[#ff8a4c]">Uploadgegevens corrigeren</div>
                    <div className="text-xs text-[#c8bdb3]">
                      Opslaan wijzigt de uploadrij in yoc_fighters. Draai daarna YOC controle opnieuw.
                    </div>
                  </div>
                  <div className="sticky top-2 z-20 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#1b1714]/95 p-2 shadow-lg shadow-black/30 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
                    {!editMode ? (
                      <button
                        onClick={() => setEditMode(true)}
                        className="border-2 border-[#d7d4ce] bg-[linear-gradient(180deg,#ffffff,#adadad_44%,#eeeeee_52%,#6f6f6f)] px-4 py-2 text-xs font-black text-black shadow-[inset_0_1px_0_#fff,0_4px_0_#28140c]"
                      >
                        Wijzigen
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setCorrectForm({
                              va_nummer: safe(fighter.va_nummer, ""),
                              naam: safe(fighter.naam_mm || fighter.naam, ""),
                              sportschool: safe(fighter.sportschool_mm || fighter.sportschool, ""),
                              geslacht: safe(fighter.geslacht_mm || fighter.geslacht, ""),
                              gewicht: fighter.gewicht == null ? "" : String(fighter.gewicht),
                              emailadres: safe(uploadRow?.emailadres, ""),
                              telefoonnummer: safe(uploadRow?.telefoonnummer, ""),
                              naam_trainer: safe(uploadRow?.naam_trainer, ""),
                            });
                            setEditMode(false);
                          }}
                          disabled={savingCorrectie}
                          className="border-2 border-[#d7d4ce] bg-[#161311] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                        >
                          Annuleren
                        </button>
                        <button
                          onClick={saveCorrectFighter}
                          disabled={savingCorrectie}
                          className="border-2 border-[#ff7a3d] bg-[linear-gradient(180deg,#ff6a22,#b73600)] px-4 py-2 text-xs font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_4px_0_#28140c] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingCorrectie ? "Opslaan..." : "Opslaan"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <EditField label="VA" value={correctForm.va_nummer} disabled={!editMode} onChange={(v) => setCorrectForm((p) => ({ ...p, va_nummer: v.replace(/[^0-9]/g, "") }))} />
                  <EditField label="Naam" value={correctForm.naam} disabled={!editMode} onChange={(v) => setCorrectForm((p) => ({ ...p, naam: v }))} />
                  <EditField label="Sportschool" value={correctForm.sportschool} disabled={!editMode} onChange={(v) => setCorrectForm((p) => ({ ...p, sportschool: v }))} />
                  <EditField label="Geslacht" value={correctForm.geslacht} disabled={!editMode} onChange={(v) => setCorrectForm((p) => ({ ...p, geslacht: v }))} />
                  <EditField label="Gewicht" value={correctForm.gewicht} disabled={!editMode} onChange={(v) => setCorrectForm((p) => ({ ...p, gewicht: v }))} />
                  <EditField label="E-mail" value={correctForm.emailadres} disabled={!editMode} onChange={(v) => setCorrectForm((p) => ({ ...p, emailadres: v }))} />
                  <EditField label="Telefoon" value={correctForm.telefoonnummer} disabled={!editMode} onChange={(v) => setCorrectForm((p) => ({ ...p, telefoonnummer: v }))} />
                  <EditField label="Trainer" value={correctForm.naam_trainer} disabled={!editMode} onChange={(v) => setCorrectForm((p) => ({ ...p, naam_trainer: v }))} />
                </div>
              </div>
            </div>

            <div className="mb-3 grid gap-2 md:grid-cols-2">
              <DetailBlock
                title="Nulmeting"
                rows={[
                  ["Klasse volgens controle", `${safe(klasseVolgensControle)} (${klasseControleBron})`],
                  ["Nulmeting klasse", safe(fighter.nulmeting_klasse ?? raw?.nulmeting?.klasse)],
                  ["Totaal", safe(fighter.nulmeting_totaal ?? raw?.nulmeting?.totaal, "0")],
                  ["Opmerking", safe(fighter.nulmeting_opmerking ?? raw?.nulmeting?.opmerking)],
                ]}
              />
              <DetailBlock
                title="Keurmerk"
                rows={[
                  ["Sportschool", safe(sportschool?.naam)],
                  ["Gematcht in DB", extractKeurmerkName(fighter.keurmerk_reden, safe(sportschool?.naam))],
                  ["Keurmerk einde", formatDate(sportschool?.keurmerk_einde)],
                ]}
              />
            </div>

            <div className="relative mb-3 overflow-hidden rounded-[1.05rem] border-[5px] border-[#d9d6d0] bg-[linear-gradient(180deg,#1b1714,#0d0c0b)] shadow-[0_0_0_1px_#524c46,0_0_0_7px_rgba(255,255,255,0.28),0_14px_30px_rgba(0,0,0,0.82),inset_0_2px_0_rgba(255,255,255,0.58)] before:absolute before:inset-[7px] before:rounded-[0.75rem] before:border before:border-[#89847e] before:content-['']">
              <div className="relative flex items-center justify-between border-b border-[#b8afa6]/45 bg-[linear-gradient(90deg,#11100f,#211914,#3a1609)] px-4 py-2.5 text-white">
                <div>
                  <div className="flex items-center gap-2 text-lg font-black">
                    <CalendarDays size={20} /> Uitslagen
                  </div>
                  <div className="mt-0.5 text-xs text-[#c8bdb3]">
                    Gelezen uit yoc_uitslagen_raw op VA {safe(fighter.va_nummer)}.
                  </div>
                </div>
                <div className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                  {uitslagen.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] table-fixed text-xs">
                  <thead>
                    <tr className="border-b border-[#b8afa6]/45 bg-[#ff4d00] text-xs uppercase tracking-[0.14em] text-white">
                      <th className="w-[12%] px-3 py-2 text-left">Datum</th>
                      <th className="w-[25%] px-3 py-2 text-left">Event</th>
                      <th className="w-[18%] px-3 py-2 text-left">Tegenstander</th>
                      <th className="w-[16%] px-3 py-2 text-left">Sportschool</th>
                      <th className="w-[12%] px-3 py-2 text-left">Klasse</th>
                      <th className="w-[8%] px-3 py-2 text-left">Kg</th>
                      <th className="w-[9%] px-3 py-2 text-left">Uitslag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uitslagen.map((u, i) => (
                      <tr key={u.id || i} className="border-b border-white/10 odd:bg-[#11100f] even:bg-[#1b1714]">
                        <td className="px-3 py-2 font-bold text-white">{formatDate(u.datum)}</td>
                        <td className="px-3 py-2 text-zinc-200"><div className="line-clamp-2">{safe(u.evenement)}</div></td>
                        <td className="px-3 py-2 font-black text-white">{safe(u.tegenstander)}</td>
                        <td className="px-3 py-2 text-zinc-300">{safe(u.sportschool)}</td>
                        <td className="px-3 py-2 text-zinc-300">{safe(u.klasse)}<div className="text-xs text-[#9f948c]">{safe(u.discipline)}</div></td>
                        <td className="px-3 py-2 text-zinc-300">{safe(u.gewicht)}</td>
                        <td className="px-3 py-2 font-black text-[#ff9a66]">{resultLabel(u.uitslag)}</td>
                      </tr>
                    ))}
                    {!uitslagen.length && (
                      <tr><td colSpan={7} className="p-5 text-center text-[#c8bdb3]">Geen uitslagen gevonden voor deze VA.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.05rem] border-[5px] border-[#d9d6d0] bg-[linear-gradient(180deg,#1b1714,#0d0c0b)] shadow-[0_0_0_1px_#524c46,0_0_0_7px_rgba(255,255,255,0.28),0_14px_30px_rgba(0,0,0,0.82),inset_0_2px_0_rgba(255,255,255,0.58)] before:absolute before:inset-[7px] before:rounded-[0.75rem] before:border before:border-[#89847e] before:content-['']">
              <div className="relative flex items-center justify-between border-b border-[#b8afa6]/45 bg-[linear-gradient(90deg,#11100f,#211914,#3a1609)] px-4 py-2.5 text-white">
                <div>
                  <div className="flex items-center gap-2 text-lg font-black">
                    <ShieldAlert size={20} /> Meldingen
                  </div>
                  <div className="mt-0.5 text-xs text-[#c8bdb3]">
                    Gelezen uit yoc_resultaten voor deze YOC-vechter.
                  </div>
                </div>
                <div className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                  {meldingen.length}
                </div>
              </div>

              <div className="relative flex flex-col gap-2 p-3">
                {meldingen.length ? (
                  meldingen.map((m, i) => {
                    const level = mapResultLevel(m.severity, m.resultaat);
                    const color = level === "error" ? "border-red-500/70 bg-[#2a1111] text-red-100" : level === "warn" ? "border-[#ff7a3d]/70 bg-[#24170f] text-[#ffd2bd]" : level === "info" ? "border-blue-400/60 bg-[#101827] text-blue-100" : "border-green-500/50 bg-[#102016] text-green-100";
                    return (
                      <div key={m.id ?? i} className={`relative w-full rounded-[0.85rem] border-2 p-3 shadow-xl shadow-black/40 ${color}`}>
                        <div className="flex items-start gap-3">
                          {level === "ok" ? <CheckCircle2 className="mt-0.5 shrink-0" /> : <AlertTriangle className="mt-0.5 shrink-0" />}
                          <div>
                            <div className="font-black uppercase tracking-[0.08em]">{ruleLabel(m.rule, m.rule_code)}</div>
                            <div className="mt-1 text-sm font-semibold">{safe(m.boodschap, "Geen toelichting.")}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-black opacity-90">
                              <span>{safe(m.resultaat)}</span>
                              {m.review_status === "approved" ? (
                                <span className="rounded-full border border-green-400/60 bg-green-950/60 px-2 py-0.5 text-green-100">Goedgekeurd</span>
                              ) : m.review_status ? (
                                <span className="rounded-full border border-white/25 bg-black/30 px-2 py-0.5">review: {m.review_status}</span>
                              ) : (
                                <span className="rounded-full border border-[#ff7a3d]/60 bg-black/30 px-2 py-0.5 text-[#ffd2bd]">Nog niet beoordeeld</span>
                              )}
                            </div>
                          </div>

                          {m.id && String(m.review_status ?? "").toLowerCase() !== "approved" ? (
                            <button
                              onClick={() => reviewMelding(m.id!, "approved")}
                              disabled={reviewingId === m.id}
                              className="ml-auto shrink-0 border-2 border-green-400/80 bg-[linear-gradient(180deg,#22c55e,#166534)] px-3 py-2 text-xs font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_4px_0_#132416] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {reviewingId === m.id ? "Opslaan..." : "Goedkeuren"}
                            </button>
                          ) : m.id ? (
                            <button
                              onClick={() => reviewMelding(m.id!, "open")}
                              disabled={reviewingId === m.id}
                              className="ml-auto shrink-0 border-2 border-[#d7d4ce] bg-[linear-gradient(180deg,#ffffff,#adadad_44%,#eeeeee_52%,#6f6f6f)] px-3 py-2 text-xs font-black text-black shadow-[inset_0_1px_0_#fff,0_4px_0_#28140c] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {reviewingId === m.id ? "Opslaan..." : "Heropen"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="relative rounded-[0.85rem] border-2 border-green-500/50 bg-[#102016] p-3 text-green-100 shadow-xl shadow-black/40 md:col-span-2">
                    <div className="flex items-center gap-3 font-black"><CheckCircle2 /> Geen meldingen gevonden.</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-[#c8bdb3]">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-2 border-[#8a8178] bg-[#080808] px-3 py-2 text-sm font-black text-white outline-none transition focus:border-[#ff6a2a] disabled:opacity-65"
      />
    </label>
  );
}

function InfoCard({
  icon,
  label,
  value,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[0.85rem] border-[5px] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_10px_20px_rgba(0,0,0,0.70),inset_0_1px_0_rgba(255,255,255,0.30)] before:absolute before:inset-[5px] before:rounded-[0.6rem] before:border before:border-white/20 before:content-[''] after:absolute after:right-5 after:top-2 after:h-2 after:w-9 after:rounded-full after:bg-[#ff5a1f] after:blur-[5px] after:content-[''] ${danger ? "border-red-500/70 bg-[linear-gradient(180deg,#321111,#160707)]" : "border-[#d4d0c9] bg-[linear-gradient(180deg,#1a1714,#0f0d0c)]"}`}
    >
      <div className={`relative mb-2 flex items-center justify-between ${danger ? "text-red-300" : "text-[#c8bdb3]"}`}>
        <span className="text-xs font-black uppercase tracking-[0.2em]">{label}</span>
        <span>{icon}</span>
      </div>
      <div className={`relative text-xl font-black ${danger ? "text-red-200" : "text-white"}`}>{value}</div>
    </div>
  );
}

function DetailBlock({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div className="relative overflow-hidden rounded-[1rem] border-[5px] border-[#d9d6d0] bg-[linear-gradient(180deg,#1b1714,#100e0c)] p-3 shadow-[0_0_0_1px_#524c46,0_0_0_4px_rgba(255,255,255,0.18),0_12px_24px_rgba(0,0,0,0.75),inset_0_2px_0_rgba(255,255,255,0.45)] before:absolute before:inset-[6px] before:rounded-[0.7rem] before:border before:border-[#89847e] before:content-[''] after:absolute after:right-8 after:top-2 after:h-2 after:w-10 after:rounded-full after:bg-[#ff5a1f] after:blur-[5px] after:content-['']">
      <div className="relative mb-2 flex items-center gap-2 text-base font-black text-white">
        <User size={18} className="text-[#ff6a2a]" /> {title}
      </div>
      <div className="relative space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-white/10 pb-1.5 text-xs last:border-b-0">
            <span className="font-bold text-[#c8bdb3]">{k}</span>
            <span className="text-right font-black text-white">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
