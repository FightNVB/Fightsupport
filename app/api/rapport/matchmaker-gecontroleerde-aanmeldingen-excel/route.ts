// app/api/rapport/matchmaker-gecontroleerde-aanmeldingen-excel/route.ts
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type Row = Record<string, any>;

const ORANGE = "FFFF4D00";
const BLACK = "FF111111";
const WHITE = "FFFFFFFF";
const GREY = "FFE7E7E7";

function s(v: unknown) {
  return String(v ?? "").trim();
}

function lower(v: unknown) {
  return s(v).toLowerCase();
}

function pickFirst(...vals: any[]) {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return "";
}

function onlyDigits(v: unknown) {
  return s(v).replace(/[^0-9]/g, "").replace(/^0+/, "");
}

function obj(v: any) {
  if (!v) return null;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return null;
  try {
    const parsed = JSON.parse(v);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function getPath(source: any, pathName: string) {
  let cur = source;
  for (const part of pathName.split(".")) {
    cur = obj(cur) ?? cur;
    if (!cur || typeof cur !== "object") return "";
    cur = cur?.[part];
  }
  return cur;
}

function normalizeStatus(raw: unknown) {
  const status = lower(raw);

  if (["gescrapt", "gescraped", "scraped", "gecontroleerd", "checked", "verwerkt", "processed", "klaar", "done"].includes(status)) return "gescrapt";
  if (["scrape_mislukt", "mislukt", "failed", "error", "fout"].includes(status)) return "scrape_mislukt";
  if (["controle_bezig", "bezig", "running", "scraping", "processing", "in_progress"].includes(status)) return "controle_bezig";
  if (["gematcht", "matched"].includes(status)) return "gematcht";
  if (["afgemeld", "cancelled", "canceled"].includes(status)) return "afgemeld";
  if (["nieuw", "rauw", "raw", "open", "aangemeld", "uploaded", "upload", ""].includes(status)) return "rauw";

  return status || "rauw";
}

function hasValue(v: unknown) {
  return s(v).length > 0;
}

function pickStatusValue(r: Row) {
  return pickFirst(
    r.__fs_aanmelding_status,
    r.__fs_status,
    r.__fs_gematcht ? "gematcht" : "",
    r.status,
    r.aanmelding_status,
    r.inschrijving_status,
    r.controle_status,
    r.scrape_status,
    r.fightpaspoort_status,
    getPath(r, "aanmelding.status"),
    getPath(r, "aanmelding.aanmelding_status"),
    getPath(r, "extra.aanmelding.status"),
    getPath(r, "extra.aanmelding.aanmelding_status"),
    getPath(r, "extra.raw.aanmelding.status"),
    getPath(r, "extra.raw.aanmelding.aanmelding_status"),
    getPath(r, "raw.aanmelding.status"),
    getPath(r, "raw.aanmelding.aanmelding_status"),
    getPath(r, "extra.raw.status"),
    getPath(r, "raw.status"),
  );
}

function statusOf(f: Row) {
  const normalized = normalizeStatus(pickStatusValue(f));

  const hasFailure =
    normalized === "scrape_mislukt" ||
    hasValue(f?.scrape_failed_at) ||
    hasValue(f?.scrape_error) ||
    hasValue(f?.error) ||
    hasValue(getPath(f, "aanmelding.scrape_failed_at")) ||
    hasValue(getPath(f, "extra.raw.aanmelding.scrape_failed_at")) ||
    hasValue(getPath(f, "raw.aanmelding.scrape_failed_at"));
  if (hasFailure) return "scrape_mislukt";

  if (normalized === "gematcht" || normalized === "afgemeld") return normalized;

  const isRunning =
    normalized === "controle_bezig" ||
    hasValue(f?.scrape_started_at) ||
    hasValue(f?.controle_started_at) ||
    hasValue(getPath(f, "aanmelding.scrape_started_at")) ||
    hasValue(getPath(f, "extra.raw.aanmelding.scrape_started_at")) ||
    hasValue(getPath(f, "raw.aanmelding.scrape_started_at"));

  const hasScrapeSignal =
    normalized === "gescrapt" ||
    hasValue(f?.scraped_at) ||
    hasValue(f?.controle_run_id) ||
    hasValue(f?.checked_at) ||
    hasValue(f?.fightpaspoort_checked_at) ||
    hasValue(getPath(f, "aanmelding.scraped_at")) ||
    hasValue(getPath(f, "extra.raw.aanmelding.scraped_at")) ||
    hasValue(getPath(f, "raw.aanmelding.scraped_at"));

  if (hasScrapeSignal) return "gescrapt";
  if (isRunning) return "controle_bezig";

  return normalized;
}

function displayStatusOf(f: Row) {
  const st = statusOf(f);
  if (st === "gematcht") return "Gematcht";
  if (st === "afgemeld") return "Afgemeld";
  if (st === "gescrapt") return "Gecontroleerd";
  if (st === "scrape_mislukt") return "Controle mislukt";
  if (st === "controle_bezig") return "Controle bezig";
  return "Niet gecontroleerd";
}

function nameOf(f: Row) {
  return s(pickFirst(
    f.naam,
    f.fp_naam,
    f.naam_fp,
    f.naam_input,
    f.fighter_naam,
    f.vechter_naam,
    [f.voornaam, f.achternaam].map(s).filter(Boolean).join(" "),
    getPath(f, "extra.raw.aanmelding.naam"),
  )) || "Onbekend";
}

function vaOf(f: Row) {
  return onlyDigits(pickFirst(f.va_nummer, f.va, f.fighter_id, f.fightpaspoort_nummer));
}

function inschrijvingIdOf(f: Row) {
  return s(pickFirst(f.inschrijving_id, f.aanmelding_id, f.id));
}

function gymOf(f: Row) {
  return s(pickFirst(f.fp_gym, f.gym, f.sportschool, f.sportschool_fp, f.sportschool_input, f.gym_input, getPath(f, "extra.raw.aanmelding.gym")));
}

function trainerOf(f: Row) {
  return s(pickFirst(f.trainer, f.naam_trainer, f.trainer_naam, f.contactpersoon, getPath(f, "extra.raw.aanmelding.trainer")));
}

function emailOf(f: Row) {
  return s(pickFirst(f.email, f.emailadres, f.trainer_email, f.contact_email, getPath(f, "extra.raw.aanmelding.email"), getPath(f, "extra.raw.aanmelding.emailadres")));
}

function phoneOf(f: Row) {
  return s(pickFirst(f.telefoon, f.telefoonnummer, f.phone, f.trainer_telefoon, getPath(f, "extra.raw.aanmelding.telefoon"), getPath(f, "extra.raw.aanmelding.telefoonnummer")));
}

function disciplineOf(f: Row) {
  return s(pickFirst(f.discipline, f.discipline_input, f.sport, f.vechtsport, getPath(f, "extra.raw.aanmelding.discipline"))) || "Onbekend";
}

function klasseOf(f: Row) {
  return s(pickFirst(f.klasse, f.fp_klasse, f.klasse_fp, f.klasse_input, f.nulmeting_klasse, getPath(f, "extra.raw.aanmelding.klasse"))) || "Onbekend";
}

function geslachtOf(f: Row) {
  const g = lower(pickFirst(f.geslacht, f.gender, f.sexe, getPath(f, "extra.raw.aanmelding.geslacht")));
  if (["m", "man", "male", "heer", "heren", "jongen", "jongens"].includes(g)) return "Man";
  if (["v", "vrouw", "female", "dame", "dames", "meisje", "meisjes"].includes(g)) return "Vrouw";
  return s(pickFirst(f.geslacht, f.gender, f.sexe)) || "Onbekend";
}

function parseDateOnly(v: any): Date | null {
  if (!v) return null;
  const txt = String(v).trim();
  const ymd = txt.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12));
  const dmy = txt.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12));
  const d = new Date(txt);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
}

function fmtDate(v: any) {
  const d = parseDateOnly(v);
  if (!d) return s(v);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${d.getUTCFullYear()}`;
}

function calcAgeNumber(dob: any, ref: any) {
  const birth = parseDateOnly(dob);
  const date = parseDateOnly(ref) || new Date();
  if (!birth) return null;
  let age = date.getUTCFullYear() - birth.getUTCFullYear();
  const m = date.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && date.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
}

function dobOf(f: Row) {
  return pickFirst(f.geboortedatum, f.fp_geboortedatum, f.geboortedatum_fp, f.dob, f.birthdate, getPath(f, "extra.raw.aanmelding.geboortedatum"));
}

function eventDateOf(f: Row, matchmaking: Row | null) {
  return pickFirst(f.event_datum, f.event_date, f.datum, f.matchmaking_datum, matchmaking?.event_datum, matchmaking?.datum, matchmaking?.event_date);
}

function leeftijdNumberOf(f: Row, matchmaking: Row | null) {
  const direct = pickFirst(f.leeftijd, f.age, f.fp_leeftijd);
  const directNumber = Number(String(direct ?? "").replace(/[^\d.-]/g, ""));
  if (Number.isFinite(directNumber) && directNumber > 0) return Math.round(directNumber);
  return calcAgeNumber(dobOf(f), eventDateOf(f, matchmaking));
}

function gewichtNumberOf(f: Row) {
  const raw = pickFirst(f.gewicht, f.gewicht_input, f.fp_gewicht, f.gewicht_fp, f.weight, getPath(f, "extra.raw.aanmelding.gewicht"));
  const n = Number(s(raw).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function gewichtOf(f: Row) {
  const n = gewichtNumberOf(f);
  if (n == null) return s(pickFirst(f.gewicht, f.gewicht_input, f.fp_gewicht, f.gewicht_fp)) || "";
  return Number.isInteger(n) ? `${n} kg` : `${String(n).replace(".", ",")} kg`;
}

function tabKeyOf(f: Row) {
  const discipline = disciplineOf(f);
  const g = geslachtOf(f);
  const kRaw = klasseOf(f);
  const k = lower(kRaw);

  let klasse = kRaw;
  if (k.includes("jeugd") || k === "j" || k.includes("youth")) klasse = "J";
  else if (k.includes("nieuweling") || k === "n" || k.includes("n-klasse") || k.includes("n klasse")) klasse = "N";
  else if (k.includes("r-klasse") || k.includes("r klasse") || k === "r") klasse = "R";
  else if (k.includes("c-klasse") || k.includes("c klasse") || k === "c") klasse = "C";
  else if (k.includes("b-klasse") || k.includes("b klasse") || k === "b") klasse = "B";
  else if (k.includes("a-klasse") || k.includes("a klasse") || k === "a") klasse = "A";
  else if (k.includes("amateur") || k.includes("ama")) klasse = "Amateur";
  else if (k.includes("pro")) klasse = "Pro";

  return `${discipline} - ${geslachtOf({ geslacht: g })} - ${klasse}`.replace(/[\\/?*\[\]:]/g, "-").slice(0, 31) || "Onbekend";
}

function statusJaNee(raw: unknown) {
  const x = lower(raw);
  if (!x) return "";
  if (["ja", "true", "geldig", "ok", "1", "valid", "yes", "y", "actief"].includes(x)) return "Ja";
  if (["nee", "false", "ongeldig", "geen", "0", "invalid", "no", "n", "verlopen"].includes(x) || x.includes("geen") || x.includes("ongeldig") || x.includes("verlopen")) return "Nee";
  return s(raw);
}

function resultRowsForFighter(f: Row, resultatenRows: Row[]) {
  const va = vaOf(f);
  const id = inschrijvingIdOf(f);
  const fighterId = s(f.fighter_id);
  return resultatenRows.filter((r) =>
    (!!va && onlyDigits(r.va_nummer) === va) ||
    (!!id && s(pickFirst(r.inschrijving_id, r.aanmelding_id)) === id) ||
    (!!fighterId && s(r.fighter_id) === fighterId)
  );
}

function statusFromResultaten(rows: Row[], onderwerp: "licentie" | "keurmerk" | "startverbod") {
  const relevant = rows.filter((r) => {
    const txt = lower([r.rule, r.rule_code, r.resultaat, r.severity, r.boodschap].map(s).join(" "));
    if (onderwerp === "licentie") return txt.includes("licentie") || txt.includes("fightlicentie");
    if (onderwerp === "keurmerk") return txt.includes("keurmerk");
    return txt.includes("startverbod") || txt.includes("verbod");
  });

  if (!relevant.length) return "";

  const allText = lower(relevant.map((r) => [r.rule, r.rule_code, r.resultaat, r.severity, r.boodschap].map(s).join(" ")).join(" "));

  if (onderwerp === "startverbod") {
    if (allText.includes("startverbod") && !allText.includes("geen startverbod")) return "Ja";
    return "Nee";
  }

  if (allText.includes("geen") || allText.includes("ongeldig") || allText.includes("verlopen") || allText.includes("afkeur") || allText.includes("error")) return "Nee";
  if (allText.includes("ok") || allText.includes("geldig") || allText.includes("ja")) return "Ja";
  return "Onbekend";
}

function licentieOf(f: Row, resultatenRows: Row[]) {
  const raw = pickFirst(
    f.licentie_status,
    f.licentie,
    f.licentie_ok,
    f.fightlicentie,
    f.fp_licentie,
    f.heeft_licentie,
    getPath(f, "raw.licentie"),
    getPath(f, "raw.details.licentie"),
    getPath(f, "extra.licentie"),
    getPath(f, "extra.raw.fighters_raw.licentie"),
    getPath(f, "extra.raw.details.licentie"),
    getPath(f, "__source_aanmelding.licentie"),
    getPath(f, "__source_aanmelding.licentie_status")
  );
  return statusJaNee(raw) || statusFromResultaten(resultRowsForFighter(f, resultatenRows), "licentie") || "Onbekend";
}

function keurmerkOf(f: Row, resultatenRows: Row[]) {
  const raw = pickFirst(
    f.heeft_keurmerk,
    f.keurmerk,
    f.keurmerk_status,
    f.keurmerk_ok,
    f.sportschool_keurmerk,
    f.gym_keurmerk,
    f.fp_keurmerk,
    getPath(f, "extra.heeft_keurmerk"),
    getPath(f, "extra.keurmerk"),
    getPath(f, "extra.raw.fighters_raw.heeft_keurmerk"),
    getPath(f, "extra.raw.fighters_raw.keurmerk"),
    getPath(f, "extra.raw.fighters_raw.keurmerk_status"),
    getPath(f, "raw.keurmerk"),
    getPath(f, "raw.heeft_keurmerk"),
    getPath(f, "raw.details.keurmerk"),
    getPath(f, "__source_aanmelding.keurmerk"),
    getPath(f, "__source_aanmelding.heeft_keurmerk")
  );
  return statusJaNee(raw) || statusFromResultaten(resultRowsForFighter(f, resultatenRows), "keurmerk") || "Onbekend";
}

function startverbodOf(f: Row, resultatenRows: Row[]) {
  const raw = pickFirst(
    f.startverbod,
    f.heeft_startverbod,
    f.startverbod_status,
    f.fp_startverbod,
    getPath(f, "raw.startverbod"),
    getPath(f, "raw.heeft_startverbod"),
    getPath(f, "raw.details.startverbod"),
    getPath(f, "raw.details.heeft_startverbod"),
    getPath(f, "extra.raw.fighters_raw.startverbod"),
    getPath(f, "extra.raw.fighters_raw.heeft_startverbod"),
    getPath(f, "extra.raw.fighters_raw.details.heeft_startverbod"),
    getPath(f, "__source_aanmelding.startverbod"),
    getPath(f, "__source_aanmelding.heeft_startverbod")
  );
  return statusJaNee(raw) || statusFromResultaten(resultRowsForFighter(f, resultatenRows), "startverbod") || "Onbekend";
}

function getResultKind(v: unknown): "win" | "loss" | "draw" | "other" {
  const x = lower(v).replace(/\s+/g, " ").trim();
  if (!x) return "other";
  if (x.includes("demo") || x.includes("no contest") || x.includes("nocontest") || x === "nc") return "other";
  if (x.includes("onbeslist") || x.includes("gelijk") || x.includes("draw")) return "draw";
  if (x.includes("verliest") || x.includes("verlies") || x.includes("verloren") || x.includes("loss") || x === "l") return "loss";
  if (x.includes("wint") || x.includes("winst") || x.includes("gewonnen") || x === "win" || x === "w") return "win";
  return "other";
}

function normalizeClassToken(v: unknown) {
  const x = lower(v).replace(/klasse/g, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();
  if (!x || x === "-") return "";
  if (x === "j" || x.includes("jeugd") || x.includes("youth")) return "j";
  if (x === "r" || x.includes("recreant")) return "r";
  if (x === "n" || x.includes("nieuweling")) return "n";
  if (x === "c") return "c";
  if (x === "b") return "b";
  if (x === "a" || x.includes("elite")) return "a";
  if (x.includes("amateur") || x.includes("ama")) return "amateur";
  if (x.includes("pro")) return "pro";
  return x.replace(/[^a-z0-9+]/g, "");
}

function classRank(token: string) {
  const order: Record<string, number> = { j: 1, r: 2, n: 3, c: 4, b: 5, a: 6, amateur: 3, pro: 6 };
  return order[token] ?? 0;
}

function rowMatchesFighter(row: Row, f: Row) {
  const va = vaOf(f);
  const inschrijvingId = inschrijvingIdOf(f);
  return (
    (!!va && onlyDigits(row.va_nummer) === va) ||
    (!!va && onlyDigits(row.bron_va_nummer) === va) ||
    (!!va && onlyDigits(row.fighter_id) === va) ||
    (!!inschrijvingId && s(pickFirst(row.inschrijving_id, row.aanmelding_id)) === inschrijvingId) ||
    (!!s(row.naam) && lower(row.naam) === lower(nameOf(f)))
  );
}

function recordOf(f: Row, uitslagenRows: Row[]) {
  const rows = uitslagenRows.filter((r) => rowMatchesFighter(r, f));
  if (rows.length) {
    let highest = "";
    let highestRank = 0;
    for (const row of rows) {
      if (getResultKind(pickFirst(row.uitslag, row.resultaat, row.outcome)) === "other") continue;
      const token = normalizeClassToken(pickFirst(row.klasse, row.class, row.wedstrijdklasse, row.niveau, row.fight_class));
      const rank = classRank(token);
      if (rank > highestRank) {
        highest = token;
        highestRank = rank;
      }
    }

    let w = 0;
    let l = 0;
    let d = 0;
    let other = 0;
    for (const row of rows) {
      const kind = getResultKind(pickFirst(row.uitslag, row.resultaat, row.outcome));
      if (kind === "other") {
        other += 1;
        continue;
      }
      const rowClass = normalizeClassToken(pickFirst(row.klasse, row.class, row.wedstrijdklasse, row.niveau, row.fight_class));
      if (highest && rowClass && rowClass !== highest) {
        other += 1;
        continue;
      }
      if (kind === "win") w += 1;
      else if (kind === "loss") l += 1;
      else if (kind === "draw") d += 1;
    }
    return `${w}-${l}-${d} (${other})`;
  }

  const w = Number(String(pickFirst(f.win, f.wins, f.winst, f.record_w) || 0).replace(/[^\d.-]/g, ""));
  const l = Number(String(pickFirst(f.loss, f.losses, f.verlies, f.record_l) || 0).replace(/[^\d.-]/g, ""));
  const d = Number(String(pickFirst(f.draw, f.draws, f.onbeslist, f.record_d) || 0).replace(/[^\d.-]/g, ""));
  const total = Number(String(pickFirst(f.totaal_wedstrijden, f.totaal_partijen, f.aantal_partijen, f.total_fights, f.fights_total, f.uitslagen_count) || 0).replace(/[^\d.-]/g, ""));
  const explicitOther = Number(String(pickFirst(f.overige, f.overige_partijen, f.demo, f.demo_totaal, f.nulmeting_demo, f.demo_partijen, f.no_contest, f.no_contest_totaal) || 0).replace(/[^\d.-]/g, ""));
  const safeW = Number.isFinite(w) ? w : 0;
  const safeL = Number.isFinite(l) ? l : 0;
  const safeD = Number.isFinite(d) ? d : 0;
  const fromTotal = Number.isFinite(total) ? Math.max(0, total - safeW - safeL - safeD) : 0;
  const other = Math.max(Number.isFinite(explicitOther) ? explicitOther : 0, fromTotal);
  return `${safeW}-${safeL}-${safeD} (${other})`;
}

function buildStatusMaps(aanmeldingen: Row[]) {
  const byId = new Map<string, string>();
  const byVa = new Map<string, string>();
  for (const a of aanmeldingen) {
    const status = statusOf(a);
    const id = s(pickFirst(a.id, a.aanmelding_id, a.inschrijving_id));
    const va = onlyDigits(pickFirst(a.va_nummer, a.va, a.fightpaspoort_nummer));
    if (id) byId.set(id, status);
    if (va) byVa.set(va, status);
  }
  return { byId, byVa };
}

function mergeAanmeldingStatusIntoFighters(fighters: Row[], aanmeldingen: Row[]) {
  const { byId, byVa } = buildStatusMaps(aanmeldingen);
  return fighters.map((f) => {
    const id = inschrijvingIdOf(f);
    const va = vaOf(f);
    const aanmeldingStatus = (id && byId.get(id)) || (va && byVa.get(va)) || "";
    return aanmeldingStatus ? { ...f, __fs_aanmelding_status: aanmeldingStatus } : f;
  });
}

function collectMatchedKeys(bouts: Row[]) {
  const ids = new Set<string>();
  const vas = new Set<string>();
  const addId = (v: any) => { const id = s(v); if (id) ids.add(id); };
  const addVa = (v: any) => { const va = onlyDigits(v); if (va) vas.add(va); };

  for (const b of bouts || []) {
    const status = lower(pickFirst(b?.status, b?.partij_status, b?.bout_status));
    const verwijderd = b?.verwijderd === true || String(b?.verwijderd ?? "").trim() === "1" || lower(b?.verwijderd) === "true";
    if (verwijderd || status.includes("verwijderd") || status.includes("deleted")) continue;

    const raw = obj(b?.raw_json) || {};
    const deelnemer = obj(raw?.deelnemer) || {};
    const rawAanmelding = obj(deelnemer?.aanmelding) || obj(deelnemer?.extra?.raw?.aanmelding) || obj(deelnemer?.raw?.aanmelding) || {};

    [b?.rood_inschrijving_id, b?.blauw_inschrijving_id, b?.red_inschrijving_id, b?.blue_inschrijving_id, b?.rood_aanmelding_id, b?.blauw_aanmelding_id, b?.inschrijving_id, b?.aanmelding_id, deelnemer?.inschrijving_id, deelnemer?.aanmelding_id, deelnemer?.id, rawAanmelding?.inschrijving_id, rawAanmelding?.aanmelding_id, rawAanmelding?.id].forEach(addId);
    [b?.va_rood, b?.va_blauw, b?.rood_va, b?.blauw_va, b?.red_va, b?.blue_va, b?.va_nummer, b?.fighter_id, b?.rood_fighter_id, b?.blauw_fighter_id, deelnemer?.va_nummer, deelnemer?.va, deelnemer?.fighter_id, rawAanmelding?.va_nummer, rawAanmelding?.va, rawAanmelding?.fightpaspoort_nummer].forEach(addVa);
  }
  return { ids, vas };
}

function markMatchedFromBouts(fighters: Row[], bouts: Row[]) {
  const { ids, vas } = collectMatchedKeys(bouts);
  return fighters.map((f) => {
    const id = inschrijvingIdOf(f);
    const va = vaOf(f);
    if ((id && ids.has(id)) || (va && vas.has(va))) return { ...f, __fs_gematcht: true, __fs_status: "gematcht" };
    return f;
  });
}

function isControlledFighter(f: Row) {
  const status = statusOf(f);
  return status === "gescrapt" || status === "gematcht" || status === "afgemeld";
}

function mergeByAanmelding(base: Row[], scraped: Row[]) {
  const byKey = new Map<string, Row>();
  const keysOf = (r: Row) => [s(pickFirst(r.inschrijving_id, r.aanmelding_id, r.id)), onlyDigits(pickFirst(r.va_nummer, r.va, r.fightpaspoort_nummer, r.fighter_id))].filter(Boolean);

  for (const a of base) {
    const keys = keysOf(a);
    const key = keys[0] || `row:${byKey.size}`;
    byKey.set(key, { ...a, __source_aanmelding: a });
  }

  for (const f of scraped) {
    const keys = keysOf(f);
    let foundKey = keys.find((k) => byKey.has(k));
    if (!foundKey) foundKey = keys[0] || `scraped:${byKey.size}`;
    const current = byKey.get(foundKey) || {};
    byKey.set(foundKey, { ...current, ...f, __source_aanmelding: current.__source_aanmelding || null });
  }

  return Array.from(byKey.values());
}

function disciplineSortValue(f: Row) {
  return lower(disciplineOf(f));
}

function klasseSortRank(f: Row) {
  const token = normalizeClassToken(klasseOf(f));
  const order: Record<string, number> = {
    j: 1,
    r: 2,
    n: 3,
    c: 4,
    b: 5,
    a: 6,
    amateur: 7,
    pro: 8,
  };
  return order[token] ?? 99;
}

function geslachtSortValue(f: Row) {
  const g = lower(geslachtOf(f));
  if (g.includes("vrouw") || g.includes("dame") || g.includes("meis")) return 1;
  if (g.includes("man") || g.includes("heer") || g.includes("jong")) return 2;
  return 9;
}

function sortFighters(a: Row, b: Row, matchmaking: Row | null) {
  const discipline = disciplineSortValue(a).localeCompare(disciplineSortValue(b), "nl");
  if (discipline !== 0) return discipline;

  const klasse = klasseSortRank(a) - klasseSortRank(b);
  if (klasse !== 0) return klasse;

  const geslacht = geslachtSortValue(a) - geslachtSortValue(b);
  if (geslacht !== 0) return geslacht;

  const ageA = leeftijdNumberOf(a, matchmaking) ?? Number.POSITIVE_INFINITY;
  const ageB = leeftijdNumberOf(b, matchmaking) ?? Number.POSITIVE_INFINITY;
  if (ageA !== ageB) return ageA - ageB;

  const weightA = gewichtNumberOf(a) ?? Number.POSITIVE_INFINITY;
  const weightB = gewichtNumberOf(b) ?? Number.POSITIVE_INFINITY;
  if (weightA !== weightB) return weightA - weightB;

  return nameOf(a).localeCompare(nameOf(b), "nl");
}

function setHeaderStyle(row: ExcelJS.Row, fill = BLACK) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: GREY } },
      left: { style: "thin", color: { argb: GREY } },
      bottom: { style: "thin", color: { argb: GREY } },
      right: { style: "thin", color: { argb: GREY } },
    };
  });
  row.height = 28;
}

function addLogo(workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet) {
  const logoPath = path.join(process.cwd(), "public", "branding", "fightsupport", "excel-logo.png");
  if (!fs.existsSync(logoPath)) return;
  const imageId = workbook.addImage({ filename: logoPath, extension: "png" });
  ws.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 210, height: 54 } });
}

function applyBodyStyle(row: ExcelJS.Row, zebra: boolean) {
  row.eachCell((cell) => {
    cell.alignment = { vertical: "top", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: GREY } },
      left: { style: "thin", color: { argb: GREY } },
      bottom: { style: "thin", color: { argb: GREY } },
      right: { style: "thin", color: { argb: GREY } },
    };
    if (zebra) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F7F7" } };
    }
  });
}

function totalOf(f: Row, uitslagenRows: Row[]) {
  const rows = uitslagenRows.filter((r) => rowMatchesFighter(r, f));
  if (rows.length) return rows.length;

  const direct = Number(String(pickFirst(
    f.totaal_wedstrijden,
    f.totaal_partijen,
    f.aantal_partijen,
    f.total_fights,
    f.fights_total,
    f.uitslagen_count,
    f.nulmeting_totaal,
  ) || 0).replace(/[^\d.-]/g, ""));

  if (Number.isFinite(direct) && direct > 0) return direct;

  const record = recordOf(f, uitslagenRows);
  const m = record.match(/^(\d+)-(\d+)-(\d+)\s*\((\d+)\)/);
  if (!m) return "";
  return Number(m[1]) + Number(m[2]) + Number(m[3]) + Number(m[4]);
}

function meldingenArrayOf(f: Row, resultatenRows: Row[]) {
  const va = vaOf(f);
  const id = inschrijvingIdOf(f);
  const rows = resultatenRows.filter((r) =>
    (!!va && onlyDigits(r.va_nummer) === va) ||
    (!!id && s(pickFirst(r.inschrijving_id, r.aanmelding_id)) === id) ||
    (!!s(r.fighter_id) && s(r.fighter_id) === s(f.fighter_id))
  );

  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const resultaat = s(r.resultaat || r.severity || r.rule_code);
    const rule = s(r.rule || r.rule_code || "Melding");
    const boodschap = s(r.boodschap);
    const line = [resultaat, rule, boodschap].filter(Boolean).join(" - ");
    const key = line.toLowerCase();
    if (!line || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }

  const source = sourceOpmerkingOf(f);
  if (source && !seen.has(source.toLowerCase())) out.push(source);
  return out;
}

function sourceOpmerkingOf(f: Row) {
  return s(pickFirst(
    f.opmerking,
    f.notitie,
    f.notes,
    f.keurmerk_reden,
    f.keurmerk_reason,
    f.nulmeting_opmerking,
    getPath(f, "extra.raw.aanmelding.opmerking"),
    getPath(f, "extra.raw.aanmelding.notitie"),
  ));
}

function rawObject(row: Row) {
  return obj(row?.raw_json) || {};
}

function boutValue(row: Row, ...keys: string[]) {
  const raw = rawObject(row);
  for (const key of keys) {
    const value = pickFirst(row?.[key], raw?.[key]);
    if (s(value)) return value;
  }
  return "";
}

function boutSideValue(row: Row, side: "rood" | "blauw", field: string) {
  const raw = rawObject(row);
  const sideRaw = obj(raw?.[side]) || {};
  const prefixes = side === "rood" ? ["rood", "red"] : ["blauw", "blue"];
  const candidates: any[] = [sideRaw?.[field]];
  for (const prefix of prefixes) {
    candidates.push(row?.[`${prefix}_${field}`], raw?.[`${prefix}_${field}`]);
  }
  return pickFirst(...candidates);
}

function activeBouts(bouts: Row[]) {
  return (bouts || [])
    .filter((b) => {
      const status = lower(pickFirst(b?.status, b?.partij_status, b?.bout_status));
      const verwijderd = b?.verwijderd === true || String(b?.verwijderd ?? "").trim() === "1" || lower(b?.verwijderd) === "true";
      return !(verwijderd || status.includes("verwijderd") || status.includes("deleted"));
    })
    .sort((a, b) => {
      const an = Number(pickFirst(a?.partij_nr, a?.partijNr, a?.bout_nr));
      const bn = Number(pickFirst(b?.partij_nr, b?.partijNr, b?.bout_nr));
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return s(pickFirst(a?.toernooi_code, a?.toernooicode)).localeCompare(s(pickFirst(b?.toernooi_code, b?.toernooicode)), "nl", { numeric: true });
    });
}

function writeTitle(workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet, title: string, subtitle: string, endColumn: number) {
  addLogo(workbook, ws);
  ws.mergeCells(1, 1, 2, endColumn);
  ws.getCell(1, 1).value = title;
  ws.getCell(1, 1).font = { bold: true, size: 20, color: { argb: ORANGE } };
  ws.getCell(1, 1).alignment = { vertical: "middle", horizontal: "center" };
  ws.mergeCells(3, 1, 3, endColumn);
  ws.getCell(3, 1).value = subtitle;
  ws.getCell(3, 1).font = { italic: true, size: 11, color: { argb: "FF555555" } };
  ws.getCell(3, 1).alignment = { horizontal: "center" };
  ws.getRow(1).height = 30;
  ws.getRow(2).height = 30;
}

function matchmakingLabel(matchmaking: Row | null) {
  return s(pickFirst(matchmaking?.naam, matchmaking?.event_naam, matchmaking?.evenement, matchmaking?.titel, matchmaking?.locatie)) || "Matchmaking";
}

function matchmakingDate(matchmaking: Row | null) {
  return fmtDate(pickFirst(matchmaking?.datum, matchmaking?.event_datum, matchmaking?.event_date));
}

function fillMatchmakingSheet(workbook: ExcelJS.Workbook, bouts: Row[], matchmaking: Row | null) {
  const ws = workbook.addWorksheet("Matchmaking");
  const headers = [
    "Partij", "Discipline", "Klasse", "Max gewicht",
    "Rode hoek", "Sportschool rood", "VA rood", "Gewicht rood", "Record rood",
    "VS",
    "Blauwe hoek", "Sportschool blauw", "VA blauw", "Gewicht blauw", "Record blauw",
    "Status", "Bijzonderheden",
  ];

  writeTitle(
    workbook,
    ws,
    `FightSupport - ${matchmakingLabel(matchmaking)}`,
    `Actuele matchmaking tot dit moment${matchmakingDate(matchmaking) ? ` | ${matchmakingDate(matchmaking)}` : ""}`,
    headers.length,
  );

  ws.getRow(5).values = headers;
  setHeaderStyle(ws.getRow(5));

  // Rode hoek-kolommen duidelijk rood, blauwe hoek-kolommen duidelijk blauw.
  for (let col = 5; col <= 9; col += 1) {
    const cell = ws.getRow(5).getCell(col);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC00000" } };
    cell.font = { bold: true, color: { argb: WHITE } };
  }
  for (let col = 11; col <= 15; col += 1) {
    const cell = ws.getRow(5).getCell(col);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
    cell.font = { bold: true, color: { argb: WHITE } };
  }
  const vsHeader = ws.getRow(5).getCell(10);
  vsHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLACK } };
  vsHeader.font = { bold: true, color: { argb: ORANGE }, size: 12 };

  const rows = activeBouts(bouts);
  for (const [index, bout] of rows.entries()) {
    const partij = pickFirst(bout?.partij_nr, bout?.partijNr, bout?.bout_nr, bout?.toernooi_code, bout?.toernooicode);
    const row = ws.addRow([
      partij,
      boutValue(bout, "discipline", "sport"),
      boutValue(bout, "klasse", "klasse_mm", "class"),
      pickFirst(boutValue(bout, "max_gewicht_notatie", "max_gewicht_label"), boutValue(bout, "max_gewicht", "max_weight")),
      boutSideValue(bout, "rood", "naam"),
      pickFirst(boutSideValue(bout, "rood", "gym"), boutSideValue(bout, "rood", "sportschool")),
      onlyDigits(pickFirst(boutSideValue(bout, "rood", "va"), boutSideValue(bout, "rood", "va_nummer"), bout?.va_rood)),
      pickFirst(boutSideValue(bout, "rood", "gewicht"), boutSideValue(bout, "rood", "weight")),
      pickFirst(boutSideValue(bout, "rood", "record"), boutSideValue(bout, "rood", "record_label")),
      "VS",
      boutSideValue(bout, "blauw", "naam"),
      pickFirst(boutSideValue(bout, "blauw", "gym"), boutSideValue(bout, "blauw", "sportschool")),
      onlyDigits(pickFirst(boutSideValue(bout, "blauw", "va"), boutSideValue(bout, "blauw", "va_nummer"), bout?.va_blauw)),
      pickFirst(boutSideValue(bout, "blauw", "gewicht"), boutSideValue(bout, "blauw", "weight")),
      pickFirst(boutSideValue(bout, "blauw", "record"), boutSideValue(bout, "blauw", "record_label")),
      s(pickFirst(bout?.status, bout?.partij_status, bout?.bout_status)) || "Concept",
      s(pickFirst(bout?.opmerking, bout?.notitie, bout?.bijzonderheden, rawObject(bout)?.opmerking, rawObject(bout)?.bijzonderheden)),
    ]);
    row.height = 28;
    applyBodyStyle(row, index % 2 === 1);
    row.getCell(5).font = { bold: true, color: { argb: "FFC00000" } };
    row.getCell(10).font = { bold: true, color: { argb: ORANGE }, size: 12 };
    row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(11).font = { bold: true, color: { argb: "FF1F4E78" } };
  }

  if (!rows.length) {
    const row = ws.addRow(["", "", "", "", "Nog geen partijen samengesteld"]);
    ws.mergeCells(row.number, 5, row.number, 13);
    row.getCell(5).alignment = { horizontal: "center" };
    row.getCell(5).font = { italic: true, color: { argb: "FF666666" } };
  }

  ws.views = [{ state: "frozen", ySplit: 5 }];
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  ws.columns = [
    { width: 10 }, { width: 16 }, { width: 12 }, { width: 14 },
    { width: 25 }, { width: 25 }, { width: 11 }, { width: 12 }, { width: 14 },
    { width: 7 },
    { width: 25 }, { width: 25 }, { width: 11 }, { width: 12 }, { width: 14 },
    { width: 14 }, { width: 30 },
  ];
}

function fillUnmatchedSheet(
  workbook: ExcelJS.Workbook,
  fighters: Row[],
  uitslagenRows: Row[],
  resultatenRows: Row[],
  matchmaking: Row | null,
) {
  const ws = workbook.addWorksheet("Ongematchte aanmeldingen");
  const commentsByFighter = fighters.map((f) => meldingenArrayOf(f, resultatenRows));
  const maxComments = Math.max(1, ...commentsByFighter.map((rows) => rows.length));

  const fixedHeaders = [
    "Discipline", "Klasse", "Geslacht", "Leeftijd", "Gewicht",
    "VA", "Naam", "Sportschool", "Geboortedatum", "Record", "Totaal",
    "Trainer/contact", "E-mail", "Telefoon", "Licentie", "Keurmerk", "Startverbod",
  ];
  const commentHeaders = Array.from({ length: maxComments }, (_, i) => `Opmerking ${i + 1}`);
  const headers = [...fixedHeaders, ...commentHeaders];

  writeTitle(
    workbook,
    ws,
    "FightSupport - Ongematchte aanmeldingen",
    `Beschikbare vechters | gesorteerd op discipline, klasse, geslacht, leeftijd en gewicht${matchmakingDate(matchmaking) ? ` | ${matchmakingDate(matchmaking)}` : ""}`,
    headers.length,
  );

  ws.getRow(5).values = headers;
  setHeaderStyle(ws.getRow(5));

  fighters.forEach((f, index) => {
    const comments = commentsByFighter[index];
    const row = ws.addRow([
      disciplineOf(f),
      klasseOf(f),
      geslachtOf(f),
      leeftijdNumberOf(f, matchmaking) ?? "",
      gewichtOf(f),
      vaOf(f),
      nameOf(f),
      gymOf(f),
      fmtDate(dobOf(f)),
      recordOf(f, uitslagenRows),
      totalOf(f, uitslagenRows),
      trainerOf(f),
      emailOf(f),
      phoneOf(f),
      licentieOf(f, resultatenRows),
      keurmerkOf(f, resultatenRows),
      startverbodOf(f, resultatenRows),
      ...comments,
    ]);
    row.height = 30;
    applyBodyStyle(row, index % 2 === 1);
    row.getCell(7).font = { bold: true, color: { argb: ORANGE } };

  });

  if (!fighters.length) {
    const row = ws.addRow(["Geen ongematchte aanmeldingen beschikbaar"]);
    ws.mergeCells(row.number, 1, row.number, headers.length);
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(1).font = { italic: true, color: { argb: "FF666666" } };
  }

  ws.views = [{ state: "frozen", ySplit: 5, xSplit: 7 }];
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };

  ws.columns = [
    { width: 16 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 12 },
    { width: 11 }, { width: 28 }, { width: 28 }, { width: 14 }, { width: 15 }, { width: 10 },
    { width: 24 }, { width: 28 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 14 },
    ...Array.from({ length: maxComments }, () => ({ width: 38 })),
  ];
}

async function queryTable(table: string, matchmakingId: string, orderColumn?: string) {
  let q = supabase.from(table).select("*").eq("matchmaking_id", matchmakingId);
  if (orderColumn) q = q.order(orderColumn, { ascending: true });
  const { data, error } = await q;
  if (error) {
    // Alleen oude/niet-bestaande tabellen mogen nooit de route breken.
    return [] as Row[];
  }
  return (data ?? []) as Row[];
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const matchmakingId = s(url.searchParams.get("matchmakingId") ?? url.searchParams.get("matchmakingid") ?? url.searchParams.get("id"));
    if (!matchmakingId) {
      return NextResponse.json({ ok: false, error: "matchmakingId ontbreekt" }, { status: 400 });
    }

    const [{ data: matchmaking }, aanmeldingen, fighterContext, fightersRaw, uitslagenRows, resultatenRows, bouts] = await Promise.all([
      supabase.from("matchmakings").select("*").eq("id", matchmakingId).maybeSingle(),
      queryTable("aanmeldingen", matchmakingId, "created_at"),
      queryTable("matchmaker_fighter_context", matchmakingId, "updated_at"),
      queryTable("matchmaker_fighters_raw", matchmakingId, "created_at"),
      queryTable("matchmaker_uitslagen_raw", matchmakingId, "datum"),
      queryTable("matchmaker_fighter_resultaten", matchmakingId, "created_at"),
      queryTable("matchmaking_bouts_raw", matchmakingId, "partij_nr"),
    ]);

    const merged = mergeByAanmelding(mergeByAanmelding(aanmeldingen, fighterContext), fightersRaw);
    const withAanmeldingStatus = mergeAanmeldingStatusIntoFighters(merged, aanmeldingen);
    const marked = markMatchedFromBouts(withAanmeldingStatus, bouts);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FightSupport";
    workbook.company = "FightSupport";
    workbook.subject = "Matchmaking en ongematchte aanmeldingen";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Geen status- of regelblokkades: iedere aanmelding komt mee, behalve een
    // vechter die al daadwerkelijk in een bestaande partij van deze matchmaking staat.
    const unmatched = marked
      .filter((f) => f.__fs_gematcht !== true)
      .sort((a, b) => sortFighters(a, b, matchmaking ?? null));

    fillMatchmakingSheet(workbook, bouts, matchmaking ?? null);
    fillUnmatchedSheet(workbook, unmatched, uitslagenRows, resultatenRows, matchmaking ?? null);

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `matchmaking-en-aanmeldingen-${matchmakingId}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Excel export maken mislukt" },
      { status: 500 },
    );
  }
}
