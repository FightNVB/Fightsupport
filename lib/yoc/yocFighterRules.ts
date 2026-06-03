// lib/yoc/yocFighterRules.ts
// Regels voor één YOC-deelnemer. YOC is uitsluitend jeugd: 18+ op eventdatum is verboden.
// Deze versie meldt ook expliciet ontbrekende/onbekende licentie en keurmerkstatus.

import { type AnyRow, boolish, normalizeVa, s, toNumberOrNull } from "./yocUtils";

export type YocFighterResultaat = "ok" | "actie" | "afgekeurd" | "geen_info";
export type YocFighterSeverity = "ok" | "info" | "warning" | "error";

export type YocFighterRuleHit = {
  yoc_event_id?: string | null;
  yoc_run_id?: string | null;
  fighter_raw_id?: string | null;
  yoc_fighter_id?: string | null;
  va_nummer?: string | null;
  regel_type: "yoc_fighter";
  rule: string;
  rule_code: string;
  resultaat: YocFighterResultaat;
  severity: YocFighterSeverity;
  boodschap: string;
  created_at: string;
};

function normName(v: unknown): string {
  return s(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(v: unknown): Date | null {
  const x = s(v);
  if (!x) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(x)) {
    const d = new Date(`${x.slice(0, 10)}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = x.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) {
    const d = new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ageOnDate(dobRaw: unknown, eventRaw: unknown): number | null {
  const dob = parseDate(dobRaw);
  const event = parseDate(eventRaw);
  if (!dob || !event) return null;
  let age = event.getFullYear() - dob.getFullYear();
  const m = event.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && event.getDate() < dob.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

function sameGender(a: unknown, b: unknown): boolean | null {
  const x = s(a).toLowerCase();
  const y = s(b).toLowerCase();
  if (!x || !y) return null;
  const nx = x.startsWith("m") || x.includes("man") || x.includes("jongen") ? "m" : x.startsWith("v") || x.includes("vrouw") || x.includes("meisje") ? "v" : x;
  const ny = y.startsWith("m") || y.includes("man") || y.includes("jongen") ? "m" : y.startsWith("v") || y.includes("vrouw") || y.includes("meisje") ? "v" : y;
  return nx === ny;
}

function valueLabel(v: unknown) {
  const x = s(v);
  return x || "leeg/onbekend";
}

const RULE_LABELS: Record<string, string> = {
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

function humanRule(code: string) {
  return RULE_LABELS[code] ?? code.replace(/^YOC[_-]?/i, "").replace(/_/g, " ");
}

function isBelgiumStatus(ctx: AnyRow) {
  const text = `${ctx.keurmerk_status ?? ""} ${ctx.keurmerk_reden ?? ""} ${ctx.sportschool_match_land ?? ""}`.toLowerCase();
  return text.includes("belgie") || text.includes("belgië") || text.includes("belgium") || text.includes("bkbmo");
}

function addFactory(ctx: AnyRow, hits: YocFighterRuleHit[]) {
  return (rule_code: string, resultaat: YocFighterResultaat, boodschap: string, severity?: YocFighterSeverity) => {
    hits.push({
      yoc_event_id: ctx.yoc_event_id ?? null,
      yoc_run_id: ctx.yoc_run_id ?? null,
      // Belangrijk: fighter_raw_id NIET vullen met yoc_fighter_id. Deze kolom heeft een FK naar yoc_fighters_raw.
      fighter_raw_id: ctx.fighter_raw_id ?? null,
      yoc_fighter_id: ctx.yoc_fighter_id ?? null,
      va_nummer: normalizeVa(ctx.va_nummer ?? ctx.va_nummer_mm ?? ctx.va) ?? null,
      regel_type: "yoc_fighter",
      rule: rule_code,
      rule_code,
      resultaat,
      severity: severity ?? (resultaat === "ok" ? "ok" : resultaat === "afgekeurd" ? "error" : "warning"),
      boodschap,
      created_at: new Date().toISOString(),
    });
  };
}

export function runYocFighterRules(ctx: AnyRow): YocFighterRuleHit[] {
  const hits: YocFighterRuleHit[] = [];
  const add = addFactory(ctx, hits);

  const va = normalizeVa(ctx.va_nummer ?? ctx.va_nummer_mm ?? ctx.va);
  const naam = s(ctx.naam_fp ?? ctx.fp_naam ?? ctx.naam_mm ?? ctx.naam_input ?? ctx.naam) || "Deze deelnemer";

  if (!va) {
    add("YOC_GEEN_VA", "actie", `${naam} heeft geen geldig FightPassportnummer.`);
  }

  const heeftFpData = !!(s(ctx.naam_fp ?? ctx.fp_naam) || s(ctx.licentie) || s(ctx.geboortedatum_fp ?? ctx.fp_geboortedatum));
  if (va && !heeftFpData) {
    add("YOC_GEEN_FP_DATA", "actie", `${naam}: geen FightPassportgegevens gevonden. Licentie, leeftijd en startverbod zijn daardoor niet betrouwbaar gecontroleerd.`);
  }

  const eventDate = ctx.evenement_datum ?? ctx.event_datum ?? ctx.event_date;
  const age = toNumberOrNull(ctx.leeftijd_event ?? ctx.leeftijd) ?? ageOnDate(ctx.geboortedatum_fp ?? ctx.fp_geboortedatum ?? ctx.geboortedatum_mm ?? ctx.geboortedatum, eventDate);
  if (age === null) {
    add("YOC_LEEFTIJD_ONBEKEND", "actie", `${naam}: leeftijd op eventdatum kan niet worden vastgesteld.`);
  } else if (age >= 18) {
    add("YOC_18_PLUS_VERBODEN", "afgekeurd", `${naam}: YOC is alleen voor jeugd. Deze deelnemer is ${age} jaar op eventdatum.`, "error");
  }

  const licentieRaw = ctx.licentie_ok ?? ctx.licentie_status ?? ctx.licentie;
  const licentieBool = boolish(licentieRaw);
  if (licentieBool !== true) {
    add(
      "YOC_GEEN_LICENTIE",
      "afgekeurd",
      `${naam}: geen geldige licentie gevonden (waarde: ${valueLabel(ctx.licentie_status ?? ctx.licentie ?? ctx.licentie_ok)}).`,
      "error"
    );
  }

  const startverbod = boolish(ctx.heeft_startverbod ?? ctx.startverbod);
  if (startverbod === true || s(ctx.heeft_startverbod ?? ctx.startverbod).toLowerCase().includes("ja")) {
    add("YOC_STARTVERBOD", "afgekeurd", `${naam}: deelnemer heeft een startverbod.`, "error");
  }

  const naamMm = ctx.naam_mm ?? ctx.naam_input;
  const naamFp = ctx.naam_fp ?? ctx.fp_naam;
  if (s(naamMm) && s(naamFp) && normName(naamMm) !== normName(naamFp)) {
    add("YOC_NAAM_WIJKT_AF", "actie", `${naam}: naam uit upload wijkt af van FightPassport. Upload="${s(naamMm)}" • FP="${s(naamFp)}".`);
  }

  const g = sameGender(ctx.geslacht_mm, ctx.geslacht_fp ?? ctx.fp_geslacht);
  if (g === false) add("YOC_GESLACHT_WIJKT_AF", "actie", `${naam}: geslacht uit upload wijkt af van FightPassport.`);

  const keurmerkBool = boolish(ctx.keurmerk_ok ?? ctx.heeft_keurmerk ?? ctx.keurmerk);
  const keurmerkStatus = s(ctx.keurmerk_status).toLowerCase();
  const keurmerkReden = s(ctx.keurmerk_reden);

  if (isBelgiumStatus(ctx)) {
    add(
      "YOC_KEURMERK_BELGIE_CHECK",
      "actie",
      `${naam}: Belgische sportschool handmatig controleren op BKBMO/boksboekje. ${keurmerkReden}`.trim()
    );
  } else if (keurmerkStatus === "geen_match" || keurmerkStatus === "ambigue" || keurmerkBool === null) {
    add(
      "YOC_SPORTSCHOOL_NIET_GEVONDEN",
      "actie",
      `${naam}: sportschool/keurmerk niet betrouwbaar gevonden. ${keurmerkReden || "Geen match in sportscholen of geen keurmerkdata beschikbaar."}`.trim()
    );
  } else if (keurmerkStatus === "eventdatum_ontbreekt") {
    add(
      "YOC_KEURMERK_EVENTDATUM_ONTBREEKT",
      "actie",
      `${naam}: keurmerk kan niet op eventdatum worden gecontroleerd omdat de eventdatum ontbreekt. ${keurmerkReden}`.trim()
    );
  } else if (keurmerkBool === false) {
    add(
      "YOC_GEEN_KEURMERK",
      "afgekeurd",
      `${naam}: sportschool heeft geen geldig keurmerk op eventdatum. ${keurmerkReden}`.trim(),
      "error"
    );
  }

  if (!hits.length) add("YOC_OK", "ok", "Geen YOC-meldingen gevonden.", "ok");
  return hits;
}
