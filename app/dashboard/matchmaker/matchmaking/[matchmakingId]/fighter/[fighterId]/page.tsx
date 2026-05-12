"use client";

import React, { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import dayjs from "dayjs";
import { Bebas_Neue } from "next/font/google";
import {
  ArrowLeft,
  AlertTriangle,
  BadgeInfo,
  Building2,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  FileDigit,
  RefreshCcw,
  Save,
  Scale,
  ShieldCheck,
  ShieldX,
  Trophy,
  UserCog,
  UserRound,
  X,
} from "lucide-react";
import { authedFetch } from "@/lib/api/authedFetch";
import { supabase } from "@/lib/supabaseClient";

const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400" });
const ORANGE = "#ff4d00";
const HERO_ART_SRC = "/branding/fightsupport/app-icon.png";
const SCRAPE_START_ENDPOINT = (matchmakingId: string) => `/api/matchmaker/${matchmakingId}/fighters/herscrape`;

type AnyRow = Record<string, any>;
type HeaderRow = { id: string; naam: string | null; datum: string | null; locatie: string | null; bondteam: string | null };
type ResultRow = { id?: string | number; datum: string | null; discipline: string | null; klasse: string | null; uitslag: string | null; tegenstander?: string | null; evenement?: string | null; sportschool?: string | null; gewicht?: string | number | null };
type FighterRuleResultRow = { id?: string | number; controle_run_id?: string | null; inschrijving_id?: string | number | null; fighter_id?: string | null; va_nummer?: string | null; rule: string | null; rule_code: string | null; resultaat: string | null; severity: string | null; boodschap: string | null; review_status?: string | null };
type UnifiedFighter = {
  context_id: string | number | null;
  inschrijving_id: string | number | null;
  fighter_id: string | null;
  controle_run_id: string | null;
  row_nr: number | null;
  naam: string | null;
  naam_fp: string | null;
  geboortedatum: string | null;
  geslacht: string | null;
  gewicht: number | null;
  discipline: string | null;
  klasse: string | null;
  gym: string | null;
  va_nummer: string | null;
  licentie: string | null;
  heeft_startverbod: string | null;
  totaal_wedstrijden: number | null;
  gewonnen: number | null;
  verloren: number | null;
  draw: number | null;
  demo: number | null;
  nulmeting_totaal: number | null;
  nulmeting_klasse: string | null;
  nulmeting_opmerking: string | null;
  heeft_keurmerk: string | null;
  keurmerk_reason: string | null;
  email: string | null;
  telefoon: string | null;
  trainer_naam: string | null;
  trainer_email: string | null;
  trainer_tel: string | null;
};
type MeldingItem = { id?: string | number; level: "ok" | "info" | "warn" | "error"; title: string; text: string; resultaat?: string | null; severity?: string | null; canReview?: boolean };
type EditDraft = { naam: string; geboortedatum: string; geslacht: string; gewicht: string; gym: string; va_nummer: string; email: string; telefoon: string };

function s(v: unknown) { return String(v ?? "").trim(); }
function norm(v: unknown) { return s(v).toLowerCase(); }
function normalizeVa(v: unknown) { return s(v).replace(/[^0-9]/g, ""); }
function isNumericId(v: unknown) { return /^\d+$/.test(s(v)); }
function isUuid(v: unknown) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s(v)); }
function toNum(v: unknown): number | null { if (v === null || v === undefined || v === "") return null; if (typeof v === "number" && Number.isFinite(v)) return v; const n = Number(String(v).replace(",", ".").replace(/[^\d.-]/g, "")); return Number.isFinite(n) ? n : null; }
function firstFilled(...vals: unknown[]) { for (const val of vals) { const out = s(val); if (out) return out; } return ""; }
function safeText(v: unknown, fallback = "-") { return s(v) || fallback; }
function formatDate(v?: string | null) { if (!v) return "-"; const d = dayjs(v); return d.isValid() ? d.format("DD-MM-YYYY") : String(v); }
function formatWeight(v: unknown) { const n = toNum(v); return n == null ? "-" : `${n.toFixed(1)} kg`; }
function boolLikeLabel(v?: string | null) { const x = norm(v); if (!x) return null; if (["ja", "true", "1", "yes", "geldig", "actief"].includes(x)) return true; if (["nee", "false", "0", "no", "ongeldig", "geen"].includes(x)) return false; return null; }
function normalizeGender(v?: string | null) { const x = norm(v); if (["vrouw", "v", "female", "f", "dame", "meisje"].includes(x)) return "Vrouw"; if (["man", "m", "male", "heer", "jongen"].includes(x)) return "Man"; return s(v) || "-"; }
function calcAgeAtDate(birth?: string | null, at?: string | null) { if (!birth || !at) return null; const b = dayjs(birth); const e = dayjs(at); if (!b.isValid() || !e.isValid()) return null; return e.diff(b, "year"); }
function parseExtra(v: unknown): AnyRow { if (!v) return {}; if (typeof v === "object") return v as AnyRow; try { const p = JSON.parse(String(v)); return p && typeof p === "object" ? p : {}; } catch { return {}; } }
function fullName(row?: AnyRow | null) { return firstFilled(row?.naam, row?.fp_naam, row?.naam_input, [row?.voornaam, row?.achternaam].map(s).filter(Boolean).join(" ")); }
function extractKeurmerkDate(reason?: string | null) { const raw = s(reason); const iso = raw.match(/(\d{4}-\d{2}-\d{2})/)?.[1]; if (iso && dayjs(iso).isValid()) return iso; const nl = raw.match(/(\d{2})-(\d{2})-(\d{4})/); if (nl) return `${nl[3]}-${nl[2]}-${nl[1]}`; return null; }
function resultLabel(v?: string | null) { const x = norm(v); if (x.includes("win") || x.includes("wint")) return "Winst"; if (x.includes("verlies") || x.includes("verliest") || x.includes("loss")) return "Verlies"; if (x.includes("draw") || x.includes("onbeslist")) return "Onbeslist"; return s(v) || "-"; }
function mapSeverity(severity?: string | null, resultaat?: string | null): MeldingItem["level"] { const sev = norm(severity); const res = norm(resultaat); if (sev === "error" || ["afkeur", "verbod"].includes(res)) return "error"; if (sev === "warning" || ["actie", "dispensatie", "let_op"].includes(res)) return "warn"; if (sev === "info" || res === "info") return "info"; return "ok"; }
function dedupeRules(rows: FighterRuleResultRow[]) { const seen = new Set<string>(); return rows.filter((r) => { const key = [norm(r.rule), norm(r.rule_code), norm(r.resultaat), norm(r.boodschap)].join("|"); if (seen.has(key)) return false; seen.add(key); return true; }); }

function mapToUnified(ctx: AnyRow | null, aanmelding: AnyRow | null, raw: AnyRow | null, fighterIdParam: string): UnifiedFighter {
  const extra = parseExtra(ctx?.extra);
  const extraAanmelding = extra?.raw?.aanmelding ?? extra?.aanmelding ?? {};
  const sourceAanmelding = aanmelding ?? extraAanmelding ?? {};
  const rawScraped = raw ?? extra?.raw?.fighters_raw ?? {};
  const va = normalizeVa(firstFilled(ctx?.va_nummer, rawScraped?.va_nummer, sourceAanmelding?.va_nummer, fighterIdParam));
  return {
    context_id: ctx?.id ?? null,
    inschrijving_id: ctx?.inschrijving_id ?? sourceAanmelding?.id ?? aanmelding?.id ?? (isNumericId(fighterIdParam) ? fighterIdParam : null),
    fighter_id: s(ctx?.fighter_id ?? rawScraped?.fighter_id) || null,
    controle_run_id: s(ctx?.controle_run_id ?? rawScraped?.controle_run_id) || null,
    row_nr: toNum(ctx?.row_nr ?? sourceAanmelding?.row_nr),
    naam: firstFilled(ctx?.naam, ctx?.fp_naam, rawScraped?.naam, fullName(sourceAanmelding), fighterIdParam),
    naam_fp: s(ctx?.fp_naam ?? rawScraped?.naam) || null,
    geboortedatum: firstFilled(ctx?.geboortedatum, ctx?.fp_geboortedatum, rawScraped?.geboortedatum, sourceAanmelding?.geboortedatum, ctx?.geboortedatum_input) || null,
    geslacht: firstFilled(ctx?.geslacht, ctx?.fp_geslacht, rawScraped?.geslacht, sourceAanmelding?.geslacht) || null,
    gewicht: toNum(ctx?.gewicht ?? sourceAanmelding?.gewicht),
    discipline: s(ctx?.discipline ?? sourceAanmelding?.discipline) || null,
    klasse: firstFilled(ctx?.klasse, sourceAanmelding?.klasse, ctx?.fp_klasse, ctx?.nulmeting_klasse, rawScraped?.nulmeting_klasse) || null,
    gym: firstFilled(ctx?.gym_input, ctx?.fp_gym, sourceAanmelding?.gym, rawScraped?.sportschool) || null,
    va_nummer: va || null,
    licentie: s(ctx?.licentie ?? rawScraped?.licentie) || null,
    heeft_startverbod: s(ctx?.heeft_startverbod ?? rawScraped?.heeft_startverbod) || null,
    totaal_wedstrijden: toNum(ctx?.totaal_wedstrijden ?? rawScraped?.totaal_wedstrijden),
    gewonnen: toNum(ctx?.gewonnen ?? ctx?.record_w ?? rawScraped?.gewonnen ?? sourceAanmelding?.win),
    verloren: toNum(ctx?.record_l ?? sourceAanmelding?.loss),
    draw: toNum(ctx?.record_d ?? sourceAanmelding?.draw),
    demo: toNum(sourceAanmelding?.demo),
    nulmeting_totaal: toNum(ctx?.nulmeting_totaal ?? rawScraped?.nulmeting_totaal),
    nulmeting_klasse: s(ctx?.nulmeting_klasse ?? rawScraped?.nulmeting_klasse) || null,
    nulmeting_opmerking: s(ctx?.nulmeting_opmerking ?? rawScraped?.nulmeting_opmerking) || null,
    heeft_keurmerk: s(ctx?.heeft_keurmerk) || null,
    keurmerk_reason: s(ctx?.keurmerk_reden) || null,
    email: s(sourceAanmelding?.email ?? extra?.email) || null,
    telefoon: s(sourceAanmelding?.telefoon ?? extra?.telefoon) || null,
    trainer_naam: s(sourceAanmelding?.trainer_naam ?? extra?.trainer_naam) || null,
    trainer_email: s(sourceAanmelding?.trainer_email ?? extra?.trainer_email) || null,
    trainer_tel: s(sourceAanmelding?.trainer_tel ?? extra?.trainer_tel) || null,
  };
}

export default function FighterPage() {
  const router = useRouter();
  const params = useParams<{ matchmakingId: string; fighterId: string }>();
  const matchmakingId = s(params?.matchmakingId);
  const fighterId = s(params?.fighterId);

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [header, setHeader] = useState<HeaderRow | null>(null);
  const [unified, setUnified] = useState<UnifiedFighter | null>(null);
  const [ctxRow, setCtxRow] = useState<AnyRow | null>(null);
  const [aanmeldingRow, setAanmeldingRow] = useState<AnyRow | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [ruleResults, setRuleResults] = useState<FighterRuleResultRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft>({ naam: "", geboortedatum: "", geslacht: "", gewicht: "", gym: "", va_nummer: "", email: "", telefoon: "" });

  const loadData = useCallback(async () => {
    if (!matchmakingId || !fighterId) return;
    setLoading(true); setLoadError(null);
    try {
      const needleVa = normalizeVa(fighterId);
      const numeric = isNumericId(fighterId);
      const { data: matchRows, error: matchErr } = await supabase.from("matchmakings").select("id, naam, datum, locatie, bondteam").eq("id", matchmakingId).limit(1);
      if (matchErr) throw matchErr;
      const h = (matchRows ?? [])[0] ?? null;

      const ctxFilters = [`va_nummer.eq.${needleVa || fighterId}`];
      // VA nummers zijn gewone cijfers, geen UUID. Filter daarom alleen op UUID-kolommen
      // zoals fighter_id wanneer de route-parameter ook echt een UUID is.
      if (isUuid(fighterId)) ctxFilters.push(`fighter_id.eq.${fighterId}`);
      if (numeric) ctxFilters.push(`inschrijving_id.eq.${fighterId}`, `id.eq.${fighterId}`);
      const { data: ctxRows, error: ctxErr } = await supabase.from("matchmaker_fighter_context").select("*").eq("matchmaking_id", matchmakingId).or(ctxFilters.join(",")).order("updated_at", { ascending: false }).limit(1);
      if (ctxErr) throw ctxErr;
      const ctx = (ctxRows ?? [])[0] ?? null;

      const aanmeldingFilters = [`va_nummer.eq.${needleVa || fighterId}`];
      if (numeric) aanmeldingFilters.push(`id.eq.${fighterId}`);
      const { data: aanRows, error: aanErr } = await supabase.from("aanmeldingen").select("*").eq("matchmaking_id", matchmakingId).or(aanmeldingFilters.join(",")).order("updated_at", { ascending: false }).limit(1);
      if (aanErr) throw aanErr;
      const aan = (aanRows ?? [])[0] ?? null;

      let raw: AnyRow | null = null;
      try {
        if (needleVa) {
          const { data } = await supabase.from("matchmaker_fighters_raw").select("*").eq("matchmaking_id", matchmakingId).eq("va_nummer", needleVa).order("updated_at", { ascending: false }).limit(1);
          raw = (data ?? [])[0] ?? null;
        } else if (isUuid(fighterId)) {
          const { data } = await supabase.from("matchmaker_fighters_raw").select("*").eq("matchmaking_id", matchmakingId).eq("fighter_id", fighterId).order("updated_at", { ascending: false }).limit(1);
          raw = (data ?? [])[0] ?? null;
        }
      } catch { raw = null; }

      if (!ctx && !aan && !raw) throw new Error("Geen vechter gevonden in aanmeldingen, matchmaker_fighter_context of matchmaker_fighters_raw.");
      const mapped = mapToUnified(ctx, aan, raw, fighterId);
      setHeader({ id: matchmakingId, naam: h?.naam ?? null, datum: h?.datum ?? ctx?.evenement_datum ?? null, locatie: h?.locatie ?? null, bondteam: h?.bondteam ?? null });
      setCtxRow(ctx); setAanmeldingRow(aan); setUnified(mapped);

      const va = normalizeVa(mapped.va_nummer || needleVa || fighterId);
      const inschrijvingId = s(mapped.inschrijving_id);
      const controleRunId = s(mapped.controle_run_id);

      let rules: FighterRuleResultRow[] = [];
      if (va) {
        let q = supabase.from("matchmaker_fighter_resultaten").select("id, controle_run_id, inschrijving_id, fighter_id, va_nummer, rule, rule_code, resultaat, severity, boodschap, review_status").eq("matchmaking_id", matchmakingId).eq("va_nummer", va).order("created_at", { ascending: true });
        if (controleRunId) q = q.eq("controle_run_id", controleRunId);
        const r = await q; if (r.error) throw r.error; rules = (r.data ?? []) as FighterRuleResultRow[];
      }
      if (!rules.length && inschrijvingId) {
        const r = await supabase.from("matchmaker_fighter_resultaten").select("id, controle_run_id, inschrijving_id, fighter_id, va_nummer, rule, rule_code, resultaat, severity, boodschap, review_status").eq("matchmaking_id", matchmakingId).eq("inschrijving_id", inschrijvingId).order("created_at", { ascending: true });
        if (r.error) throw r.error; rules = (r.data ?? []) as FighterRuleResultRow[];
      }
      setRuleResults(dedupeRules(rules));

      const u = va ? await supabase.from("matchmaker_uitslagen_raw").select("id, datum, discipline, klasse, uitslag, tegenstander, evenement, sportschool, gewicht, va_nummer").eq("matchmaking_id", matchmakingId).eq("va_nummer", va).order("datum", { ascending: false }) : { data: [], error: null } as any;
      if (u.error) throw u.error;
      setResults((u.data ?? []) as ResultRow[]);
    } catch (err: any) {
      setLoadError(err?.message || "Onbekende fout bij laden.");
    } finally { setLoading(false); }
  }, [matchmakingId, fighterId]);

  useEffect(() => { loadData(); }, [loadData]);

  const age = useMemo(() => calcAgeAtDate(unified?.geboortedatum, header?.datum), [unified?.geboortedatum, header?.datum]);
  const licentie = boolLikeLabel(unified?.licentie);
  const startverbod = boolLikeLabel(unified?.heeft_startverbod);
  const keurmerkDate = extractKeurmerkDate(unified?.keurmerk_reason);
  const meldingen = useMemo<MeldingItem[]>(() => {
    const rows = ruleResults.map((r) => ({ id: r.id, level: mapSeverity(r.severity, r.resultaat), title: safeText(r.rule, safeText(r.rule_code, "Melding")), text: `${safeText(r.boodschap, "Geen toelichting.")}${r.resultaat ? ` (${r.resultaat})` : ""}${r.review_status ? ` — review: ${r.review_status}` : ""}`, resultaat: r.resultaat, severity: r.severity, canReview: Boolean(r.id) }));
    if (rows.length) return rows;
    if (s(unified?.nulmeting_opmerking)) return [{ level: "warn", title: "Nulmeting opmerking", text: s(unified?.nulmeting_opmerking), canReview: false }];
    return [{ level: "ok", title: "Geen meldingen", text: "Geen matchmaker fighter meldingen gevonden.", canReview: false }];
  }, [ruleResults, unified?.nulmeting_opmerking]);

  function openEdit() {
    if (!unified) return;
    setEditDraft({ naam: s(unified.naam), geboortedatum: s(unified.geboortedatum), geslacht: s(unified.geslacht), gewicht: s(unified.gewicht), gym: s(unified.gym), va_nummer: s(unified.va_nummer), email: s(unified.email), telefoon: s(unified.telefoon) });
    setEditOpen(true);
  }

  async function reviewMelding(item: MeldingItem, status: "goedgekeurd" | "afgekeurd") {
    if (!item.id) return;
    setReviewingId(item.id);
    try {
      const { error } = await supabase.from("matchmaker_fighter_resultaten").update({ review_status: status, reviewed_at: new Date().toISOString() }).eq("id", item.id);
      if (error) throw error;
      await loadData();
    } catch (err: any) { alert(err?.message || "Melding verwerken mislukt."); }
    finally { setReviewingId(null); }
  }

  async function runAutocheckFightpaspoort() {
    if (!unified?.va_nummer && !unified?.inschrijving_id) return;
    setChecking(true);
    try {
      const res = await authedFetch(SCRAPE_START_ENDPOINT(matchmakingId), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ va_nummers: unified.va_nummer ? [unified.va_nummer] : [], selected_ids: unified.inschrijving_id ? [unified.inschrijving_id] : [] }) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Controle mislukt (${res.status})`);
      await loadData();
    } catch (err: any) { alert(err?.message || "Controle mislukt."); }
    finally { setChecking(false); }
  }

  async function saveEdit(runCheck: boolean) {
    if (!unified) return;
    setEditSaving(true);
    try {
      const now = new Date().toISOString();
      const va = normalizeVa(editDraft.va_nummer) || null;
      const aanPatch = { naam: s(editDraft.naam) || null, geboortedatum: s(editDraft.geboortedatum) || null, geslacht: s(editDraft.geslacht) || null, gewicht: toNum(editDraft.gewicht), gym: s(editDraft.gym) || null, va_nummer: va, email: s(editDraft.email) || null, telefoon: s(editDraft.telefoon) || null, updated_at: now };
      if (unified.inschrijving_id) {
        const { error } = await supabase.from("aanmeldingen").update(aanPatch).eq("id", unified.inschrijving_id);
        if (error) throw error;
      }
      if (unified.context_id) {
        const extra = { ...parseExtra(ctxRow?.extra), email: s(editDraft.email) || null, telefoon: s(editDraft.telefoon) || null };
        const { error } = await supabase.from("matchmaker_fighter_context").update({ naam: s(editDraft.naam) || null, naam_input: s(editDraft.naam) || null, geboortedatum_input: s(editDraft.geboortedatum) || null, geslacht: s(editDraft.geslacht) || null, gewicht: toNum(editDraft.gewicht), gym_input: s(editDraft.gym) || null, va_nummer: va, extra, updated_at: now }).eq("id", unified.context_id);
        if (error) throw error;
      }
      setEditOpen(false);
      await loadData();
      if (runCheck) await runAutocheckFightpaspoort();
    } catch (err: any) { alert(err?.message || "Opslaan mislukt."); }
    finally { setEditSaving(false); }
  }

  if (loading) return <main style={pageStyle}><div style={pageGlow} /><div style={loadingWrap}>Vechter laden...</div></main>;
  if (loadError) return <main style={pageStyle}><div style={pageGlow} /><div style={loadingWrap}>{loadError}</div></main>;
  if (!unified) return <main style={pageStyle}><div style={pageGlow} /><div style={loadingWrap}>Geen vechter gevonden.</div></main>;

  return (
    <main style={pageStyle}>
      <div style={pageGlow} />
      {checking ? <WaitOverlay title="Fightpaspoort controle bezig" subtitle="De vechtergegevens worden gecontroleerd." /> : null}
      {editOpen ? <EditModal draft={editDraft} saving={editSaving} onClose={() => setEditOpen(false)} onChange={(k, v) => setEditDraft((p) => ({ ...p, [k]: v }))} onSave={() => saveEdit(false)} onSaveAndCheck={() => saveEdit(true)} /> : null}
      <div style={shell}>
        <Header eventName={safeText(header?.naam)} eventDate={formatDate(header?.datum)} fighterName={safeText(unified.naam, "Onbekend")} discipline={safeText(unified.discipline)} klasse={safeText(unified.klasse)} onBack={() => router.back()} onEdit={openEdit} onCheck={runAutocheckFightpaspoort} checking={checking} />
        <section style={backplate}>
          <section style={topGrid}>
            <MetalCard accent="blue"><CardHeader title="Persoonlijk" onEdit={openEdit} /><div style={cardBodyDark}><div style={fighterHeaderName}>{safeText(unified.naam, "Onbekend")}</div><InfoGrid rows={[
              [<CalendarDays size={14} />, "Geboortedatum", formatDate(unified.geboortedatum)], [<CalendarDays size={14} />, "Leeftijd event", age == null ? "-" : `${age} jaar`], [<BadgeInfo size={14} />, "Geslacht", normalizeGender(unified.geslacht)], [<FileDigit size={14} />, "VA nummer", safeText(unified.va_nummer)], [<UserRound size={14} />, "Naam Fightpaspoort", safeText(unified.naam_fp)],
            ]} /><div style={badgeRow}><StatusBadge ok={licentie === true} goodText="Licentie JA" badText="Licentie NEE" /><StatusBadge ok={startverbod !== true} goodText="Startverbod NEE" badText="Startverbod JA" /></div></div></MetalCard>
            <div style={heroWrap}><Image src={HERO_ART_SRC} alt="Fighter shield" width={340} height={340} priority style={heroImage} /></div>
            <MetalCard accent="red"><CardHeader title="Vechterdetails" onEdit={openEdit} /><div style={cardBodyDark}><InfoGrid rows={[
              [<Dumbbell size={14} />, "Discipline", safeText(unified.discipline)], [<BadgeInfo size={14} />, "Klasse", safeText(unified.klasse)], [<Scale size={14} />, "Gewicht", formatWeight(unified.gewicht)], [<Trophy size={14} />, "Totaal partijen", safeText(unified.totaal_wedstrijden)], [<Trophy size={14} />, "Record", `${safeText(unified.gewonnen, "0")}-${safeText(unified.verloren, "0")}-${safeText(unified.draw, "0")}`], [<Building2 size={14} />, "Sportschool", safeText(unified.gym)],
            ]} /></div></MetalCard>
          </section>

          <section style={twoGrid}>
            <MetalCard accent="orange"><CardHeader title="Keurmerk" /><div style={cardBodyDark}><MiniGrid rows={[["Sportschool aanmelding", safeText(unified.gym)], ["Gematcht in DB", safeText((unified.keurmerk_reason || "").match(/gematcht met\s+\"([^\"]+)\"/i)?.[1] || unified.gym)], ["Keurmerk aanwezig", boolLikeLabel(unified.heeft_keurmerk) ? "Ja" : "Nee"], ["Einddatum", keurmerkDate ? formatDate(keurmerkDate) : "-"]]} /><ReadOnlyBlock label="Keurmerk reden" value={safeText(unified.keurmerk_reason)} /></div></MetalCard>
            <MetalCard accent="blue"><CardHeader title="Extra / Nulmeting" /><div style={cardBodyDark}><MiniGrid rows={[["Nulmeting klasse", safeText(unified.nulmeting_klasse)], ["Nulmeting totaal", safeText(unified.nulmeting_totaal)], ["Aanmelding ID", safeText(unified.inschrijving_id)], ["Bron", ctxRow ? "matchmaker_fighter_context" : aanmeldingRow ? "aanmeldingen" : "matchmaker_fighters_raw"]]} /><ReadOnlyBlock label="Opmerking" value={safeText(unified.nulmeting_opmerking)} /></div></MetalCard>
          </section>

          <MetalCard accent="orange"><CardHeader title="Uitslagen" /><div style={cardBodyLight}>{results.length === 0 ? <Empty text="Nog geen uitslagen gevonden in matchmaker_uitslagen_raw." /> : <ResultsTable rows={results} />}</div></MetalCard>
          <MetalCard accent="blue"><CardHeader title="Meldingen" /><div style={cardBodyDark}><div style={meldingGrid}>{meldingen.map((m, i) => <MeldingBlock key={`${m.title}-${i}`} item={m} busy={reviewingId === m.id} onApprove={() => reviewMelding(m, "goedgekeurd")} onReject={() => reviewMelding(m, "afgekeurd")} />)}</div></div></MetalCard>
        </section>
        <div style={footer}>© FightSupport</div>
      </div>
    </main>
  );
}

function Header({ eventName, eventDate, fighterName, discipline, klasse, onBack, onEdit, onCheck, checking }: { eventName: string; eventDate: string; fighterName: string; discipline: string; klasse: string; onBack: () => void; onEdit: () => void; onCheck: () => void; checking: boolean }) {
  return <header style={headerStyle}><button style={metalBtn} onClick={onBack}><ArrowLeft size={17} /> Terug</button><div style={headerCenter}><div style={eyebrow}>{eventName} • {eventDate}</div><h1 className={bebas.className} style={titleStyle}>{fighterName}</h1><div style={subTitle}>{discipline} / {klasse}</div></div><div style={headerActions}><button style={orangeBtn} onClick={onCheck} disabled={checking}><RefreshCcw size={16} /> Controleer</button><button style={metalBtn} onClick={onEdit}><Save size={16} /> Bewerken</button></div></header>;
}
function MetalCard({ children, accent = "orange" }: { children: ReactNode; accent?: "orange" | "blue" | "red" }) { const color = accent === "orange" ? ORANGE : accent === "blue" ? "#60a5fa" : "#ef4444"; return <section style={{ ...metalCard, boxShadow: `inset 0 1px 0 rgba(255,255,255,.12), 0 18px 45px rgba(0,0,0,.36), 0 0 0 1px rgba(255,255,255,.06), 0 0 24px ${color}22` }}>{children}</section>; }
function CardHeader({ title, onEdit }: { title: string; onEdit?: () => void }) { return <div style={cardHeader}><div style={cardTitle}><span style={orangeDot} />{title}</div>{onEdit ? <button style={miniBtn} onClick={onEdit}>Wijzig</button> : null}</div>; }
function InfoGrid({ rows }: { rows: [ReactNode, string, string][] }) { return <div style={infoGrid}>{rows.map(([icon, label, value]) => <div key={label} style={infoRow}><span style={infoIcon}>{icon}</span><span style={infoLabel}>{label}</span><b style={infoValue}>{value}</b></div>)}</div>; }
function MiniGrid({ rows }: { rows: [string, string][] }) { return <div style={miniGrid}>{rows.map(([l, v]) => <div key={l} style={miniBox}><span>{l}</span><b>{v}</b></div>)}</div>; }
function ReadOnlyBlock({ label, value }: { label: string; value: string }) { return <div style={readBlock}><span>{label}</span><p>{value}</p></div>; }
function StatusBadge({ ok, goodText, badText }: { ok: boolean; goodText: string; badText: string }) { return <span style={{ ...statusBadge, background: ok ? "linear-gradient(180deg,#22c55e,#15803d)" : "linear-gradient(180deg,#ef4444,#991b1b)" }}>{ok ? <ShieldCheck size={14} /> : <ShieldX size={14} />}{ok ? goodText : badText}</span>; }
function Empty({ text }: { text: string }) { return <div style={emptyState}><AlertTriangle size={16} /> {text}</div>; }
function ResultsTable({ rows }: { rows: ResultRow[] }) { return <div style={tableWrap}><table style={tableStyle}><thead><tr>{["Datum", "Resultaat", "Tegenstander", "Evenement", "Discipline", "Klasse", "Sportschool", "Gewicht"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={String(r.id ?? i)} style={{ background: i % 2 ? "#f3f4f6" : "#fff", color: "#111827" }}><td style={tdStyle}>{formatDate(r.datum)}</td><td style={tdStyle}>{resultLabel(r.uitslag)}</td><td style={tdStyle}>{safeText(r.tegenstander)}</td><td style={tdStyle}>{safeText(r.evenement)}</td><td style={tdStyle}>{safeText(r.discipline)}</td><td style={tdStyle}>{safeText(r.klasse)}</td><td style={tdStyle}>{safeText(r.sportschool)}</td><td style={tdStyle}>{formatWeight(r.gewicht)}</td></tr>)}</tbody></table></div>; }
function MeldingBlock({ item, busy, onApprove, onReject }: { item: MeldingItem; busy: boolean; onApprove: () => void; onReject: () => void }) { const color = item.level === "error" ? "#ef4444" : item.level === "warn" ? ORANGE : item.level === "info" ? "#60a5fa" : "#22c55e"; return <div style={{ ...meldingBlock, borderColor: `${color}66` }}><b style={{ color }}>{item.title}</b><p>{item.text}</p>{item.canReview ? <div style={reviewRow}><button disabled={busy} style={miniBtn} onClick={onApprove}><CheckCircle2 size={14} /> Goedkeuren</button><button disabled={busy} style={miniBtn} onClick={onReject}><X size={14} /> Afkeuren</button></div> : null}</div>; }
function WaitOverlay({ title, subtitle }: { title: string; subtitle: string }) { return <div style={overlay}><div style={waitBox}><div style={spinner} /><h2>{title}</h2><p>{subtitle}</p></div></div>; }
function EditModal({ draft, saving, onClose, onChange, onSave, onSaveAndCheck }: { draft: EditDraft; saving: boolean; onClose: () => void; onChange: (k: keyof EditDraft, v: string) => void; onSave: () => void; onSaveAndCheck: () => void }) { const fields: [keyof EditDraft, string][] = [["naam", "Naam"], ["geboortedatum", "Geboortedatum"], ["geslacht", "Geslacht"], ["gewicht", "Gewicht"], ["gym", "Sportschool"], ["va_nummer", "VA nummer"], ["email", "Email"], ["telefoon", "Telefoon"]]; return <div style={overlay}><div style={modal}><div style={modalHead}><h2>Vechter wijzigen</h2><button style={miniBtn} onClick={onClose}><X size={15} /></button></div><div style={formGrid}>{fields.map(([k, label]) => <label key={k} style={fieldLabel}>{label}<input style={inputStyle} value={draft[k]} onChange={(e) => onChange(k, e.target.value)} /></label>)}</div><div style={modalActions}><button style={metalBtn} onClick={onClose} disabled={saving}>Annuleren</button><button style={metalBtn} onClick={onSave} disabled={saving}>Opslaan</button><button style={orangeBtn} onClick={onSaveAndCheck} disabled={saving}>Opslaan + controleren</button></div></div></div>; }

const pageStyle: CSSProperties = { minHeight: "100vh", background: "radial-gradient(circle at top, #374151 0, #111827 42%, #07090d 100%)", color: "#f9fafb", position: "relative", overflow: "hidden", padding: 22 };
const pageGlow: CSSProperties = { position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 50% 0%, rgba(255,77,0,.18), transparent 38%)" };
const shell: CSSProperties = { position: "relative", zIndex: 1, maxWidth: 1420, margin: "0 auto" };
const loadingWrap: CSSProperties = { position: "relative", zIndex: 2, margin: "80px auto", maxWidth: 640, padding: 28, borderRadius: 16, background: "linear-gradient(180deg,#2b3138,#151922)", border: "1px solid rgba(255,255,255,.12)", textAlign: "center", fontWeight: 900 };
const headerStyle: CSSProperties = { display: "grid", gridTemplateColumns: "220px 1fr 300px", gap: 14, alignItems: "center", marginBottom: 14 };
const headerCenter: CSSProperties = { textAlign: "center", padding: 14, borderRadius: 18, background: "linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.04))", border: "1px solid rgba(255,255,255,.14)" };
const eyebrow: CSSProperties = { color: "#fbbf24", fontWeight: 900, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" };
const titleStyle: CSSProperties = { margin: 0, fontSize: 62, lineHeight: .92, letterSpacing: ".03em", textShadow: "0 2px 0 #000, 0 0 20px rgba(255,77,0,.28)" };
const subTitle: CSSProperties = { color: "#d1d5db", fontWeight: 800 };
const headerActions: CSSProperties = { display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" };
const metalBtn: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 40, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.18)", color: "#fff", fontWeight: 900, background: "linear-gradient(180deg,#4b5563,#1f2937)", cursor: "pointer" };
const orangeBtn: CSSProperties = { ...metalBtn, border: "1px solid rgba(255,77,0,.42)", background: "linear-gradient(180deg,#ff6a22,#b73600)" };
const miniBtn: CSSProperties = { ...metalBtn, minHeight: 30, padding: "0 10px", fontSize: 12, borderRadius: 8 };
const backplate: CSSProperties = { padding: 14, borderRadius: 22, background: "linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.035))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 24px 60px rgba(0,0,0,.42)" };
const topGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 360px 1fr", gap: 14, alignItems: "stretch" };
const twoGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14, marginBottom: 14 };
const metalCard: CSSProperties = { borderRadius: 18, overflow: "hidden", background: "linear-gradient(180deg,#2b3138,#151922)", border: "1px solid rgba(255,255,255,.12)", marginBottom: 14 };
const cardHeader: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 14px", background: "linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.04))", borderBottom: "1px solid rgba(255,255,255,.10)" };
const cardTitle: CSSProperties = { display: "flex", alignItems: "center", gap: 9, fontWeight: 950, letterSpacing: ".04em", textTransform: "uppercase" };
const orangeDot: CSSProperties = { width: 9, height: 9, borderRadius: 999, background: ORANGE, boxShadow: "0 0 14px rgba(255,77,0,.8)" };
const cardBodyDark: CSSProperties = { padding: 14, background: "rgba(8,12,18,.42)" };
const cardBodyLight: CSSProperties = { padding: 14, background: "#f8fafc", color: "#111827" };
const fighterHeaderName: CSSProperties = { fontSize: 24, fontWeight: 950, marginBottom: 12 };
const infoGrid: CSSProperties = { display: "grid", gap: 8 };
const infoRow: CSSProperties = { display: "grid", gridTemplateColumns: "24px 145px 1fr", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)" };
const infoIcon: CSSProperties = { color: ORANGE, display: "flex" };
const infoLabel: CSSProperties = { color: "#aeb8c7", fontSize: 12, fontWeight: 800 };
const infoValue: CSSProperties = { color: "#fff", fontSize: 13, wordBreak: "break-word" };
const badgeRow: CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 };
const statusBadge: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 10px", borderRadius: 9, color: "#fff", fontWeight: 950, border: "1px solid rgba(255,255,255,.16)" };
const heroWrap: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320, borderRadius: 20, background: "radial-gradient(circle, rgba(255,77,0,.18), rgba(255,255,255,.04) 45%, rgba(0,0,0,.24))", border: "1px solid rgba(255,255,255,.10)" };
const heroImage: CSSProperties = { width: "96%", height: "auto", objectFit: "contain", filter: "drop-shadow(0 24px 35px rgba(0,0,0,.55))" };
const miniGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginBottom: 10 };
const miniBox: CSSProperties = { padding: 11, borderRadius: 12, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)", display: "grid", gap: 4 };
const readBlock: CSSProperties = { padding: 11, borderRadius: 12, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)" };
const tableWrap: CSSProperties = { overflowX: "auto", borderRadius: 14, border: "1px solid #d1d5db" };
const tableStyle: CSSProperties = { width: "100%", borderCollapse: "collapse", minWidth: 900 };
const thStyle: CSSProperties = { padding: 10, textAlign: "left", background: "#1f2937", color: "#fff", fontSize: 12, textTransform: "uppercase" };
const tdStyle: CSSProperties = { padding: 10, borderBottom: "1px solid #e5e7eb", fontSize: 13, fontWeight: 700 };
const emptyState: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, background: "rgba(255,77,0,.10)", color: "#111827", fontWeight: 900 };
const meldingGrid: CSSProperties = { display: "grid", gap: 10 };
const meldingBlock: CSSProperties = { border: "1px solid", borderRadius: 13, padding: 12, background: "rgba(255,255,255,.06)" };
const reviewRow: CSSProperties = { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" };
const footer: CSSProperties = { textAlign: "center", color: "#9ca3af", fontSize: 12, padding: 18 };
const overlay: CSSProperties = { position: "fixed", inset: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.68)", backdropFilter: "blur(4px)", padding: 18 };
const waitBox: CSSProperties = { width: "min(520px,100%)", padding: 26, textAlign: "center", borderRadius: 20, background: "linear-gradient(180deg,#2b3138,#111827)", border: "1px solid rgba(255,255,255,.15)" };
const spinner: CSSProperties = { width: 46, height: 46, margin: "0 auto 14px", borderRadius: 999, border: "4px solid rgba(255,255,255,.18)", borderTopColor: ORANGE, animation: "spin 1s linear infinite" };
const modal: CSSProperties = { width: "min(760px,100%)", borderRadius: 20, padding: 16, background: "linear-gradient(180deg,#2b3138,#111827)", border: "1px solid rgba(255,255,255,.16)" };
const modalHead: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 };
const fieldLabel: CSSProperties = { display: "grid", gap: 6, color: "#d1d5db", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const inputStyle: CSSProperties = { minHeight: 40, borderRadius: 10, border: "1px solid rgba(255,255,255,.18)", background: "rgba(0,0,0,.28)", color: "#fff", padding: "0 11px", fontWeight: 800 };
const modalActions: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14, flexWrap: "wrap" };
