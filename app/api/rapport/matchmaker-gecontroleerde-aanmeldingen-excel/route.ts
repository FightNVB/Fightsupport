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
  return s(v)
    .replace(/[^0-9]/g, "")
    .replace(/^0+/, "");
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

  if (
    [
      "gescrapt",
      "gescraped",
      "scraped",
      "gecontroleerd",
      "checked",
      "verwerkt",
      "processed",
      "klaar",
      "done",
    ].includes(status)
  )
    return "gescrapt";
  if (["scrape_mislukt", "mislukt", "failed", "error", "fout"].includes(status))
    return "scrape_mislukt";
  if (
    [
      "controle_bezig",
      "bezig",
      "running",
      "scraping",
      "processing",
      "in_progress",
    ].includes(status)
  )
    return "controle_bezig";
  if (["gematcht", "matched"].includes(status)) return "gematcht";
  if (["afgemeld", "cancelled", "canceled"].includes(status)) return "afgemeld";
  if (
    [
      "nieuw",
      "rauw",
      "raw",
      "open",
      "aangemeld",
      "uploaded",
      "upload",
      "",
    ].includes(status)
  )
    return "rauw";

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
  return (
    s(
      pickFirst(
        f.naam,
        f.fp_naam,
        f.naam_fp,
        f.naam_input,
        f.fighter_naam,
        f.vechter_naam,
        [f.voornaam, f.achternaam].map(s).filter(Boolean).join(" "),
        getPath(f, "extra.raw.aanmelding.naam"),
      ),
    ) || "Onbekend"
  );
}

function vaOf(f: Row) {
  return onlyDigits(
    pickFirst(f.va_nummer, f.va, f.fighter_id, f.fightpaspoort_nummer),
  );
}

function vaExcelValue(v: unknown) {
  const va = onlyDigits(v);
  if (!va) return "";
  const n = Number(va);
  return Number.isFinite(n) ? n : va;
}

function inschrijvingIdOf(f: Row) {
  return s(pickFirst(f.inschrijving_id, f.aanmelding_id, f.id));
}

function gymOf(f: Row) {
  return s(
    pickFirst(
      f.fp_gym,
      f.gym,
      f.sportschool,
      f.sportschool_fp,
      f.sportschool_input,
      f.gym_input,
      getPath(f, "extra.raw.aanmelding.gym"),
    ),
  );
}

function trainerOf(f: Row) {
  return s(
    pickFirst(
      f.trainer,
      f.naam_trainer,
      f.trainer_naam,
      f.contactpersoon,
      getPath(f, "extra.raw.aanmelding.trainer"),
    ),
  );
}

function emailOf(f: Row) {
  return s(
    pickFirst(
      f.email,
      f.emailadres,
      f.trainer_email,
      f.contact_email,
      getPath(f, "extra.raw.aanmelding.email"),
      getPath(f, "extra.raw.aanmelding.emailadres"),
    ),
  );
}

function phoneOf(f: Row) {
  return s(
    pickFirst(
      f.telefoon,
      f.telefoonnummer,
      f.phone,
      f.trainer_telefoon,
      getPath(f, "extra.raw.aanmelding.telefoon"),
      getPath(f, "extra.raw.aanmelding.telefoonnummer"),
    ),
  );
}

function disciplineOf(f: Row) {
  return (
    s(
      pickFirst(
        f.discipline,
        f.discipline_input,
        f.sport,
        f.vechtsport,
        getPath(f, "extra.raw.aanmelding.discipline"),
      ),
    ) || "Onbekend"
  );
}

function klasseOf(f: Row) {
  return (
    s(
      pickFirst(
        f.klasse,
        f.fp_klasse,
        f.klasse_fp,
        f.klasse_input,
        f.nulmeting_klasse,
        getPath(f, "extra.raw.aanmelding.klasse"),
      ),
    ) || "Onbekend"
  );
}

function geslachtOf(f: Row) {
  // FightPassport scrape/context is leidend voor geslacht.
  // Bij aanmeldingen is geslacht vaak leeg, terwijl matchmaker_fighters_raw
  // of matchmaker_fighter_context.fp_geslacht wel "man"/"vrouw" bevat.
  const raw = pickFirst(
    f.fp_geslacht,
    f.geslacht,
    f.gender,
    f.sexe,
    getPath(f, "extra.raw.fighters_raw.geslacht"),
    getPath(f, "extra.raw.fighters_raw.fp_geslacht"),
    getPath(f, "raw.fighters_raw.geslacht"),
    getPath(f, "raw.geslacht"),
    getPath(f, "extra.raw.aanmelding.geslacht"),
  );
  const g = lower(raw);
  if (["m", "man", "male", "heer", "heren", "jongen", "jongens"].includes(g))
    return "Man";
  if (
    ["v", "vrouw", "female", "dame", "dames", "meisje", "meisjes"].includes(g)
  )
    return "Vrouw";
  return s(raw) || "Onbekend";
}

function parseDateOnly(v: any): Date | null {
  if (!v) return null;
  const txt = String(v).trim();
  const ymd = txt.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd)
    return new Date(
      Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12),
    );
  const dmy = txt.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy)
    return new Date(
      Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12),
    );
  const d = new Date(txt);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12),
  );
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
  return pickFirst(
    f.geboortedatum,
    f.fp_geboortedatum,
    f.geboortedatum_fp,
    f.dob,
    f.birthdate,
    getPath(f, "extra.raw.aanmelding.geboortedatum"),
  );
}

function eventDateOf(f: Row, matchmaking: Row | null) {
  return pickFirst(
    f.event_datum,
    f.event_date,
    f.datum,
    f.matchmaking_datum,
    matchmaking?.event_datum,
    matchmaking?.datum,
    matchmaking?.event_date,
  );
}

function leeftijdNumberOf(f: Row, matchmaking: Row | null) {
  const direct = pickFirst(f.leeftijd, f.age, f.fp_leeftijd);
  const directNumber = Number(String(direct ?? "").replace(/[^\d.-]/g, ""));
  if (Number.isFinite(directNumber) && directNumber > 0)
    return Math.round(directNumber);
  return calcAgeNumber(dobOf(f), eventDateOf(f, matchmaking));
}

function gewichtNumberOf(f: Row) {
  const raw = pickFirst(
    f.gewicht,
    f.gewicht_input,
    f.fp_gewicht,
    f.gewicht_fp,
    f.weight,
    getPath(f, "extra.raw.aanmelding.gewicht"),
  );
  const n = Number(
    s(raw)
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );
  return Number.isFinite(n) ? n : null;
}

function gewichtOf(f: Row) {
  const n = gewichtNumberOf(f);
  if (n == null)
    return (
      s(pickFirst(f.gewicht, f.gewicht_input, f.fp_gewicht, f.gewicht_fp)) || ""
    );
  return Number.isInteger(n) ? `${n} kg` : `${String(n).replace(".", ",")} kg`;
}

function tabKeyOf(f: Row) {
  const discipline = disciplineOf(f);
  const g = geslachtOf(f);
  const kRaw = klasseOf(f);
  const k = lower(kRaw);

  let klasse = kRaw;
  if (k.includes("jeugd") || k === "j" || k.includes("youth")) klasse = "J";
  else if (
    k.includes("nieuweling") ||
    k === "n" ||
    k.includes("n-klasse") ||
    k.includes("n klasse")
  )
    klasse = "N";
  else if (k.includes("r-klasse") || k.includes("r klasse") || k === "r")
    klasse = "R";
  else if (k.includes("c-klasse") || k.includes("c klasse") || k === "c")
    klasse = "C";
  else if (k.includes("b-klasse") || k.includes("b klasse") || k === "b")
    klasse = "B";
  else if (k.includes("a-klasse") || k.includes("a klasse") || k === "a")
    klasse = "A";
  else if (k.includes("amateur") || k.includes("ama")) klasse = "Amateur";
  else if (k.includes("pro")) klasse = "Pro";

  return (
    `${discipline} - ${geslachtOf({ geslacht: g })} - ${klasse}`
      .replace(/[\\/?*\[\]:]/g, "-")
      .slice(0, 31) || "Onbekend"
  );
}

function statusJaNee(raw: unknown) {
  const x = lower(raw);
  if (["ja", "true", "geldig", "ok", "1", "valid", "yes", "y"].includes(x))
    return "Ja";
  if (
    ["nee", "false", "ongeldig", "geen", "0", "invalid", "no", "n"].includes(
      x,
    ) ||
    x.includes("geen")
  )
    return "Nee";
  return s(raw);
}

function licentieOf(f: Row) {
  // matchmaker_fighter_context is leidend. De raw waarden zitten soms genest in extra.raw.fighters_raw.
  const raw = pickFirst(
    f.licentie,
    f.licentie_status,
    f.licentie_ok,
    f.fightlicentie,
    f.fp_licentie,
    getPath(f, "extra.raw.fighters_raw.licentie"),
    getPath(f, "raw.licentie"),
  );
  return statusJaNee(raw) || "Onbekend";
}

function extractKeurmerkEndDate(reason: unknown) {
  const txt = s(reason);
  const iso =
    txt.match(
      /(?:t\/m|tot en met|eindigt|eindigde op|geldig t\/m)\s*(\d{4}-\d{2}-\d{2})/i,
    )?.[1] || txt.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
  if (iso) return iso;
  const dmy = txt.match(
    /(?:t\/m|tot en met|eindigt|eindigde op|geldig t\/m)?\s*(\d{2})-(\d{2})-(\d{4})/i,
  );
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return "";
}

function extractKeurmerkMatchedName(reason: unknown) {
  return s(reason).match(/gematcht met\s+"([^"]+)"/i)?.[1] || "";
}

function extractMmSportschool(reason: unknown) {
  return s(reason).match(/\[MM sportschool:\]\s+"([^"]+)"/i)?.[1] || "";
}

function dateKey(v: unknown) {
  const d = parseDateOnly(v);
  if (!d) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function keurmerkReasonOf(f: Row) {
  return s(
    pickFirst(
      f.keurmerk_reden,
      f.keurmerk_reason,
      f.keurmerk_melding,
      getPath(f, "extra.keurmerk_reden"),
      getPath(f, "extra.raw.fighters_raw.keurmerk_reden"),
    ),
  );
}

function keurmerkOf(f: Row, matchmaking?: Row | null) {
  const reason = keurmerkReasonOf(f);
  const txt = lower(reason);

  if (
    txt.includes("geen geldig keurmerk") ||
    txt.includes("geen keurmerk") ||
    txt.includes("verlopen")
  )
    return "Nee";

  // Geen einddatum of verlopen einddatum telt als geen keurmerk.
  const end = extractKeurmerkEndDate(reason);
  if (!end) return "Nee";

  const eventDate = dateKey(eventDateOf(f, matchmaking ?? null));
  if (eventDate && end < eventDate) return "Nee";

  if (txt.includes("keurmerk geldig") || txt.includes("geldig op eventdatum"))
    return "Ja";

  const raw = pickFirst(
    f.heeft_keurmerk,
    f.keurmerk,
    f.keurmerk_status,
    f.keurmerk_ok,
  );
  return statusJaNee(raw) === "Ja" ? "Ja" : "Nee";
}

function startverbodOf(f: Row) {
  // matchmaker_fighter_context is leidend. De raw waarden zitten soms genest in extra.raw.fighters_raw.
  const raw = pickFirst(
    f.heeft_startverbod,
    f.startverbod,
    f.startverbod_status,
    f.fp_startverbod,
    getPath(f, "extra.raw.fighters_raw.heeft_startverbod"),
    getPath(f, "raw.heeft_startverbod"),
    getPath(f, "raw.startverbod"),
  );
  const formatted = statusJaNee(raw);
  return formatted || "Onbekend";
}

function getResultKind(v: unknown): "win" | "loss" | "draw" | "other" {
  const x = lower(v).replace(/\s+/g, " ").trim();
  if (!x) return "other";
  if (
    x.includes("demo") ||
    x.includes("no contest") ||
    x.includes("nocontest") ||
    x === "nc"
  )
    return "other";
  if (x.includes("onbeslist") || x.includes("gelijk") || x.includes("draw"))
    return "draw";
  if (
    x.includes("verliest") ||
    x.includes("verlies") ||
    x.includes("verloren") ||
    x.includes("loss") ||
    x === "l"
  )
    return "loss";
  if (
    x.includes("wint") ||
    x.includes("winst") ||
    x.includes("gewonnen") ||
    x === "win" ||
    x === "w"
  )
    return "win";
  return "other";
}

function normalizeClassToken(v: unknown) {
  const x = lower(v)
    .replace(/klasse/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  const order: Record<string, number> = {
    j: 1,
    r: 2,
    n: 3,
    c: 4,
    b: 5,
    a: 6,
    amateur: 3,
    pro: 6,
  };
  return order[token] ?? 0;
}

function rowMatchesFighter(row: Row, f: Row) {
  const va = vaOf(f);
  const inschrijvingId = inschrijvingIdOf(f);
  return (
    (!!va && onlyDigits(row.va_nummer) === va) ||
    (!!va && onlyDigits(row.bron_va_nummer) === va) ||
    (!!va && onlyDigits(row.fighter_id) === va) ||
    (!!inschrijvingId &&
      s(pickFirst(row.inschrijving_id, row.aanmelding_id)) ===
        inschrijvingId) ||
    (!!s(row.naam) && lower(row.naam) === lower(nameOf(f)))
  );
}

function recordOf(f: Row, uitslagenRows: Row[]) {
  const rows = uitslagenRows.filter((r) => rowMatchesFighter(r, f));
  if (rows.length) {
    let highest = "";
    let highestRank = 0;
    for (const row of rows) {
      if (
        getResultKind(pickFirst(row.uitslag, row.resultaat, row.outcome)) ===
        "other"
      )
        continue;
      const token = normalizeClassToken(
        pickFirst(
          row.klasse,
          row.class,
          row.wedstrijdklasse,
          row.niveau,
          row.fight_class,
        ),
      );
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
      const kind = getResultKind(
        pickFirst(row.uitslag, row.resultaat, row.outcome),
      );
      if (kind === "other") {
        other += 1;
        continue;
      }
      const rowClass = normalizeClassToken(
        pickFirst(
          row.klasse,
          row.class,
          row.wedstrijdklasse,
          row.niveau,
          row.fight_class,
        ),
      );
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

  const w = Number(
    String(pickFirst(f.win, f.wins, f.winst, f.record_w) || 0).replace(
      /[^\d.-]/g,
      "",
    ),
  );
  const l = Number(
    String(pickFirst(f.loss, f.losses, f.verlies, f.record_l) || 0).replace(
      /[^\d.-]/g,
      "",
    ),
  );
  const d = Number(
    String(pickFirst(f.draw, f.draws, f.onbeslist, f.record_d) || 0).replace(
      /[^\d.-]/g,
      "",
    ),
  );
  const total = Number(
    String(
      pickFirst(
        f.totaal_wedstrijden,
        f.totaal_partijen,
        f.aantal_partijen,
        f.total_fights,
        f.fights_total,
        f.uitslagen_count,
      ) || 0,
    ).replace(/[^\d.-]/g, ""),
  );
  const explicitOther = Number(
    String(
      pickFirst(
        f.overige,
        f.overige_partijen,
        f.demo,
        f.demo_totaal,
        f.nulmeting_demo,
        f.demo_partijen,
        f.no_contest,
        f.no_contest_totaal,
      ) || 0,
    ).replace(/[^\d.-]/g, ""),
  );
  const safeW = Number.isFinite(w) ? w : 0;
  const safeL = Number.isFinite(l) ? l : 0;
  const safeD = Number.isFinite(d) ? d : 0;
  const fromTotal = Number.isFinite(total)
    ? Math.max(0, total - safeW - safeL - safeD)
    : 0;
  const other = Math.max(
    Number.isFinite(explicitOther) ? explicitOther : 0,
    fromTotal,
  );
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

function mergeAanmeldingStatusIntoFighters(
  fighters: Row[],
  aanmeldingen: Row[],
) {
  const { byId, byVa } = buildStatusMaps(aanmeldingen);
  return fighters.map((f) => {
    const id = inschrijvingIdOf(f);
    const va = vaOf(f);
    const aanmeldingStatus = (id && byId.get(id)) || (va && byVa.get(va)) || "";
    return aanmeldingStatus
      ? { ...f, __fs_aanmelding_status: aanmeldingStatus }
      : f;
  });
}

function collectMatchedKeys(bouts: Row[]) {
  const ids = new Set<string>();
  const vas = new Set<string>();
  const addId = (v: any) => {
    const id = s(v);
    if (id) ids.add(id);
  };
  const addVa = (v: any) => {
    const va = onlyDigits(v);
    if (va) vas.add(va);
  };

  for (const b of bouts || []) {
    const status = lower(
      pickFirst(b?.status, b?.partij_status, b?.bout_status),
    );
    const verwijderd =
      b?.verwijderd === true ||
      String(b?.verwijderd ?? "").trim() === "1" ||
      lower(b?.verwijderd) === "true";
    if (
      verwijderd ||
      status.includes("verwijderd") ||
      status.includes("deleted")
    )
      continue;

    const raw = obj(b?.raw_json) || {};
    const deelnemer = obj(raw?.deelnemer) || {};
    const rawAanmelding =
      obj(deelnemer?.aanmelding) ||
      obj(deelnemer?.extra?.raw?.aanmelding) ||
      obj(deelnemer?.raw?.aanmelding) ||
      {};

    [
      b?.rood_inschrijving_id,
      b?.blauw_inschrijving_id,
      b?.red_inschrijving_id,
      b?.blue_inschrijving_id,
      b?.rood_aanmelding_id,
      b?.blauw_aanmelding_id,
      b?.inschrijving_id,
      b?.aanmelding_id,
      deelnemer?.inschrijving_id,
      deelnemer?.aanmelding_id,
      deelnemer?.id,
      rawAanmelding?.inschrijving_id,
      rawAanmelding?.aanmelding_id,
      rawAanmelding?.id,
    ].forEach(addId);
    [
      b?.va_rood,
      b?.va_blauw,
      b?.rood_va,
      b?.blauw_va,
      b?.red_va,
      b?.blue_va,
      b?.va_nummer,
      b?.fighter_id,
      b?.rood_fighter_id,
      b?.blauw_fighter_id,
      deelnemer?.va_nummer,
      deelnemer?.va,
      deelnemer?.fighter_id,
      rawAanmelding?.va_nummer,
      rawAanmelding?.va,
      rawAanmelding?.fightpaspoort_nummer,
    ].forEach(addVa);
  }
  return { ids, vas };
}

function markMatchedFromBouts(fighters: Row[], bouts: Row[]) {
  const { ids, vas } = collectMatchedKeys(bouts);
  return fighters.map((f) => {
    const id = inschrijvingIdOf(f);
    const va = vaOf(f);
    if ((id && ids.has(id)) || (va && vas.has(va)))
      return { ...f, __fs_gematcht: true, __fs_status: "gematcht" };
    return f;
  });
}

function isControlledFighter(f: Row) {
  const status = statusOf(f);
  return (
    status === "gescrapt" || status === "gematcht" || status === "afgemeld"
  );
}

function mergeByAanmelding(base: Row[], scraped: Row[]) {
  const byKey = new Map<string, Row>();
  const keysOf = (r: Row) =>
    [
      s(pickFirst(r.inschrijving_id, r.aanmelding_id, r.id)),
      onlyDigits(
        pickFirst(r.va_nummer, r.va, r.fightpaspoort_nummer, r.fighter_id),
      ),
    ].filter(Boolean);

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
    byKey.set(foundKey, {
      ...current,
      ...f,
      __source_aanmelding: current.__source_aanmelding || null,
    });
  }

  return Array.from(byKey.values());
}

function isJeugdFighter(f: Row) {
  return normalizeClassToken(klasseOf(f)) === "j";
}

function sortFighters(a: Row, b: Row, matchmaking: Row | null) {
  const weightA = gewichtNumberOf(a) ?? Number.POSITIVE_INFINITY;
  const weightB = gewichtNumberOf(b) ?? Number.POSITIVE_INFINITY;

  if (isJeugdFighter(a) || isJeugdFighter(b)) {
    const ageA = leeftijdNumberOf(a, matchmaking) ?? Number.POSITIVE_INFINITY;
    const ageB = leeftijdNumberOf(b, matchmaking) ?? Number.POSITIVE_INFINITY;
    if (ageA !== ageB) return ageA - ageB;
    if (weightA !== weightB) return weightA - weightB;
    return nameOf(a).localeCompare(nameOf(b), "nl");
  }

  // Volwassenen: alleen op gewicht sorteren, daarna naam als vaste fallback.
  if (weightA !== weightB) return weightA - weightB;
  return nameOf(a).localeCompare(nameOf(b), "nl");
}

function hasContactDetails(fighters: Row[]) {
  return fighters.some((f) => trainerOf(f) || emailOf(f) || phoneOf(f));
}

function excelColName(col: number) {
  let name = "";
  let n = col;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function setHeaderStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLACK } };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: GREY } },
      left: { style: "thin", color: { argb: GREY } },
      bottom: { style: "thin", color: { argb: GREY } },
      right: { style: "thin", color: { argb: GREY } },
    };
  });
}

function addLogo(workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet) {
  const logoPath = path.join(
    process.cwd(),
    "public",
    "branding",
    "fightsupport",
    "excel-logo.png",
  );
  if (!fs.existsSync(logoPath)) return;
  const imageId = workbook.addImage({ filename: logoPath, extension: "png" });
  ws.addImage(imageId, {
    tl: { col: 0, row: 0 },
    ext: { width: 210, height: 54 },
  });
}


function isOpenReview(row: Row) {
  const review = lower(row.review_status);
  return ![
    "goedgekeurd",
    "approved",
    "akkoord",
    "afgehandeld",
    "closed",
    "gesloten",
  ].includes(review);
}

function isKlasseMelding(row: Row) {
  const haystack = lower(
    [
      row.rule_code,
      row.rule,
      row.resultaat,
      row.severity,
      row.boodschap,
      row.message,
      row.opmerking,
      row.notitie,
    ]
      .map(s)
      .filter(Boolean)
      .join(" "),
  );

  return (
    haystack.includes("klasse") ||
    haystack.includes("te hoog") ||
    haystack.includes("te laag") ||
    haystack.includes("promotie") ||
    haystack.includes("degradatie")
  );
}

function klasseMeldingForFighter(f: Row, resultRows: Row[]) {
  return resultRows.find(
    (r) => isOpenReview(r) && isKlasseMelding(r) && rowMatchesFighter(r, f),
  );
}

function kleurKlasseCell(cell: ExcelJS.Cell, melding: Row | undefined) {
  if (!melding) return;

  const resultaat = lower(
    pickFirst(
      melding.resultaat,
      melding.severity,
      melding.status,
      melding.rule_resultaat,
      melding.rule_status,
    ),
  );
  const tekst = lower(
    [
      melding.rule_code,
      melding.rule,
      melding.boodschap,
      melding.message,
      melding.opmerking,
      melding.notitie,
    ]
      .map(s)
      .filter(Boolean)
      .join(" "),
  );

  if (resultaat.includes("verbod") || tekst.includes("verbod")) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFB00020" },
    };
    cell.font = { bold: true, color: { argb: WHITE } };
    return;
  }

  if (
    resultaat.includes("afkeur") ||
    tekst.includes("afkeur") ||
    tekst.includes("verkeerde klasse")
  ) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: ORANGE },
    };
    cell.font = { bold: true, color: { argb: WHITE } };
    return;
  }

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFE08A" },
  };
  cell.font = { bold: true, color: { argb: BLACK } };
}

function fillSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  fighters: Row[],
  uitslagenRows: Row[],
  resultRows: Row[],
  matchmaking: Row | null,
) {
  const ws = workbook.addWorksheet(sheetName);
  const includeContact = hasContactDetails(fighters);
  const baseHeader = [
    "Geslacht",
    "Discipline",
    "Klasse",
    "Naam",
    "Startverbod",
    "Sportschool",
    "Keurmerk",
    "VA",
    "Licentie",
    "Geboortedatum",
    "Leeftijd",
    "Record",
    "Gewicht",
  ];
  const contactHeader = ["Trainer/contact", "E-mail", "Telefoon"];
  const header = includeContact ? [...baseHeader, ...contactHeader] : baseHeader;

  addLogo(workbook, ws);
  ws.mergeCells(`A1:${excelColName(header.length)}3`);
  ws.getCell("A1").value = `Gecontroleerde aanmeldingen - ${sheetName}`;
  ws.getCell("A1").font = { bold: true, size: 18, color: { argb: ORANGE } };
  ws.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };

  ws.addRow([]);
  ws.addRow(header);
  const headerRow = ws.lastRow!;
  setHeaderStyle(headerRow);

  for (const f of fighters) {
    const age = leeftijdNumberOf(f, matchmaking);
    const values = [
      geslachtOf(f),
      disciplineOf(f),
      klasseOf(f),
      nameOf(f),
      startverbodOf(f),
      gymOf(f),
      keurmerkOf(f, matchmaking),
      vaExcelValue(vaOf(f)),
      licentieOf(f),
      fmtDate(dobOf(f)),
      age ?? "",
      recordOf(f, uitslagenRows),
      gewichtOf(f),
    ];

    if (includeContact) {
      values.push(trainerOf(f), emailOf(f), phoneOf(f));
    }

    const row = ws.addRow(values);
    row.getCell(8).numFmt = "0";

    const rowNo = row.number;
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: GREY } },
        left: { style: "thin", color: { argb: GREY } },
        bottom: { style: "thin", color: { argb: GREY } },
        right: { style: "thin", color: { argb: GREY } },
      };
      if (rowNo % 2 === 0)
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF7F7F7" },
        };
    });
    row.getCell(4).font = { bold: true, color: { argb: ORANGE } };
    kleurKlasseCell(row.getCell(3), klasseMeldingForFighter(f, resultRows));
  }

  ws.views = [{ state: "frozen", ySplit: 5 }];
  ws.columns = [
    { width: 12 }, // Geslacht
    { width: 16 }, // Discipline
    { width: 14 }, // Klasse
    { width: 28 }, // Naam
    { width: 14 }, // Startverbod
    { width: 28 }, // Sportschool
    { width: 12 }, // Keurmerk
    { width: 10 }, // VA
    { width: 12 }, // Licentie
    { width: 16 }, // Geboortedatum
    { width: 10 }, // Leeftijd
    { width: 14 }, // Record
    { width: 12 }, // Gewicht
    ...(includeContact
      ? [{ width: 24 }, { width: 30 }, { width: 16 }]
      : []),
  ];
}

function ruleNameOf(row: Row) {
  return s(pickFirst(row.rule, row.rule_code, "Melding"));
}

function resultTextOf(row: Row) {
  return s(pickFirst(row.resultaat, row.severity, ""));
}

function messageOf(row: Row) {
  return s(pickFirst(row.boodschap, row.message, row.opmerking, row.notitie));
}

function fighterKey(row: Row) {
  return (
    onlyDigits(row.va_nummer) ||
    s(
      pickFirst(
        row.inschrijving_id,
        row.aanmelding_id,
        row.fighter_context_id,
        row.fighter_id,
        row.id,
      ),
    )
  );
}

function buildFighterMaps(fighters: Row[]) {
  const byVa = new Map<string, Row>();
  const byInschrijving = new Map<string, Row>();
  for (const f of fighters) {
    const va = vaOf(f);
    const ins = inschrijvingIdOf(f);
    if (va) byVa.set(va, f);
    if (ins) byInschrijving.set(ins, f);
  }
  return { byVa, byInschrijving };
}

function findFighterForRule(
  row: Row,
  maps: ReturnType<typeof buildFighterMaps>,
) {
  const va = onlyDigits(row.va_nummer);
  const ins = s(pickFirst(row.inschrijving_id, row.aanmelding_id));
  return (
    (va && maps.byVa.get(va)) || (ins && maps.byInschrijving.get(ins)) || null
  );
}

function fillMeldingenSheet(
  workbook: ExcelJS.Workbook,
  rules: Row[],
  fighters: Row[],
) {
  const ws = workbook.addWorksheet("Meldingen");
  addLogo(workbook, ws);
  ws.mergeCells("A1:H3");
  ws.getCell("A1").value = "Meldingen voor matchmaker";
  ws.getCell("A1").font = { bold: true, size: 18, color: { argb: ORANGE } };
  ws.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
  ws.addRow([]);
  ws.addRow([
    "Naam",
    "VA",
    "Sportschool",
    "Regel",
    "Resultaat",
    "Melding",
    "Review",
    "Controle run",
  ]);
  setHeaderStyle(ws.lastRow!);

  const maps = buildFighterMaps(fighters);
  const rows = [...rules].sort((a, b) =>
    nameOf(findFighterForRule(a, maps) || a).localeCompare(
      nameOf(findFighterForRule(b, maps) || b),
      "nl",
    ),
  );
  for (const r of rows) {
    const f = findFighterForRule(r, maps) || r;
    const row = ws.addRow([
      nameOf(f),
      vaExcelValue(pickFirst(r.va_nummer, vaOf(f))),
      gymOf(f),
      ruleNameOf(r),
      resultTextOf(r),
      messageOf(r),
      s(r.review_status),
      s(r.controle_run_id),
    ]);
    row.getCell(2).numFmt = "0";
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: GREY } },
        left: { style: "thin", color: { argb: GREY } },
        bottom: { style: "thin", color: { argb: GREY } },
        right: { style: "thin", color: { argb: GREY } },
      };
    });
    row.getCell(1).font = { bold: true, color: { argb: ORANGE } };
  }
  ws.views = [{ state: "frozen", ySplit: 5 }];
  ws.columns = [
    { width: 28 },
    { width: 10 },
    { width: 28 },
    { width: 34 },
    { width: 14 },
    { width: 90 },
    { width: 16 },
    { width: 36 },
  ];
}

function fillKeurmerkenSheet(
  workbook: ExcelJS.Workbook,
  fighters: Row[],
  matchmaking: Row | null,
) {
  const ws = workbook.addWorksheet("Keurmerken");
  addLogo(workbook, ws);
  ws.mergeCells("A1:H3");
  ws.getCell("A1").value = "Keurmerken en sportschool-match";
  ws.getCell("A1").font = { bold: true, size: 18, color: { argb: ORANGE } };
  ws.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
  ws.addRow([]);
  ws.addRow([
    "Sportschool aanmelding",
    "Gematcht met DB",
    "Keurmerk einde",
    "Keurmerk",
    "Vechter",
    "VA",
    "Eventdatum",
    "Reden",
  ]);
  setHeaderStyle(ws.lastRow!);

  const seen = new Set<string>();
  const rows = [...fighters].sort(
    (a, b) =>
      gymOf(a).localeCompare(gymOf(b), "nl") ||
      nameOf(a).localeCompare(nameOf(b), "nl"),
  );
  for (const f of rows) {
    const reason = keurmerkReasonOf(f);
    const mmGym = extractMmSportschool(reason) || gymOf(f);
    const dbGym = extractKeurmerkMatchedName(reason);
    const end = extractKeurmerkEndDate(reason);
    const key = [mmGym, dbGym, end, keurmerkOf(f, matchmaking), reason]
      .join("|")
      .toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const row = ws.addRow([
      mmGym,
      dbGym || "-",
      end ? fmtDate(end) : "Geen datum",
      keurmerkOf(f, matchmaking),
      nameOf(f),
      vaExcelValue(vaOf(f)),
      fmtDate(eventDateOf(f, matchmaking)),
      reason,
    ]);
    row.getCell(6).numFmt = "0";
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: GREY } },
        left: { style: "thin", color: { argb: GREY } },
        bottom: { style: "thin", color: { argb: GREY } },
        right: { style: "thin", color: { argb: GREY } },
      };
    });
    row.getCell(1).font = { bold: true, color: { argb: ORANGE } };
  }
  ws.views = [{ state: "frozen", ySplit: 5 }];
  ws.columns = [
    { width: 32 },
    { width: 32 },
    { width: 16 },
    { width: 12 },
    { width: 28 },
    { width: 10 },
    { width: 14 },
    { width: 90 },
  ];
}

function opmerkingOf(f: Row) {
  return s(
    pickFirst(
      f.opmerking,
      f.opmerkingen,
      f.notitie,
      f.notes,
      getPath(f, "extra.raw.aanmelding.opmerkingen"),
      getPath(f, "extra.raw.aanmelding.opmerking"),
    ),
  );
}

function fillOpmerkingenSheet(workbook: ExcelJS.Workbook, fighters: Row[]) {
  const rows = fighters.filter((f) => opmerkingOf(f));
  if (!rows.length) return;
  const ws = workbook.addWorksheet("Opmerkingen");
  addLogo(workbook, ws);
  ws.mergeCells("A1:E3");
  ws.getCell("A1").value = "Opmerkingen uit aanmeldingen";
  ws.getCell("A1").font = { bold: true, size: 18, color: { argb: ORANGE } };
  ws.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
  ws.addRow([]);
  ws.addRow(["Naam", "Opmerking", "VA", "Sportschool", "Groep"]);
  setHeaderStyle(ws.lastRow!);
  for (const f of rows.sort((a, b) =>
    nameOf(a).localeCompare(nameOf(b), "nl"),
  )) {
    const row = ws.addRow([
      nameOf(f),
      opmerkingOf(f),
      vaExcelValue(vaOf(f)),
      gymOf(f),
      tabKeyOf(f),
    ]);
    row.getCell(3).numFmt = "0";
    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: GREY } },
        left: { style: "thin", color: { argb: GREY } },
        bottom: { style: "thin", color: { argb: GREY } },
        right: { style: "thin", color: { argb: GREY } },
      };
    });
    row.getCell(1).font = { bold: true, color: { argb: ORANGE } };
  }
  ws.views = [{ state: "frozen", ySplit: 5 }];
  ws.columns = [
    { width: 30 },
    { width: 78 },
    { width: 10 },
    { width: 30 },
    { width: 28 },
  ];
}



function safeSheetTitle(value: unknown, fallback: string) {
  return (s(value) || fallback)
    .replace(/[\/?*\[\]:]/g, "-")
    .slice(0, 31);
}

function eventLabelOf(matchmaking: Row | null) {
  const name = s(
    pickFirst(
      matchmaking?.naam,
      matchmaking?.titel,
      matchmaking?.event_naam,
      matchmaking?.event_name,
      matchmaking?.omschrijving,
    ),
  );
  const date = fmtDate(
    pickFirst(
      matchmaking?.event_datum,
      matchmaking?.datum,
      matchmaking?.event_date,
    ),
  );
  return [name, date].filter(Boolean).join(" - ") || "Matchmaking";
}

function boutValue(row: Row, ...keys: string[]) {
  const raw = obj(row?.raw_json) || {};
  for (const key of keys) {
    const value = pickFirst(row?.[key], raw?.[key]);
    if (s(value)) return value;
  }
  return "";
}

function fighterLookupKeys(f: Row) {
  return [
    inschrijvingIdOf(f) ? `id:${inschrijvingIdOf(f)}` : "",
    vaOf(f) ? `va:${vaOf(f)}` : "",
    nameOf(f) ? `name:${lower(nameOf(f))}` : "",
  ].filter(Boolean);
}

function buildFighterLookup(fighters: Row[]) {
  const map = new Map<string, Row>();
  for (const f of fighters) {
    for (const key of fighterLookupKeys(f)) map.set(key, f);
  }
  return map;
}

function findBoutFighter(
  row: Row,
  side: "rood" | "blauw",
  lookup: Map<string, Row>,
) {
  const sideRaw = obj((obj(row?.raw_json) || {})?.[side]) || {};
  const id = s(
    pickFirst(
      row?.[`${side}_inschrijving_id`],
      row?.[`${side}_aanmelding_id`],
      row?.[side === "rood" ? "red_inschrijving_id" : "blue_inschrijving_id"],
      sideRaw?.inschrijving_id,
      sideRaw?.aanmelding_id,
      sideRaw?.id,
    ),
  );
  if (id && lookup.has(`id:${id}`)) return lookup.get(`id:${id}`) || null;

  const va = onlyDigits(
    pickFirst(
      row?.[side === "rood" ? "va_rood" : "va_blauw"],
      row?.[`${side}_va`],
      row?.[`${side}_va_mm`],
      sideRaw?.va_nummer,
      sideRaw?.va,
    ),
  );
  if (va && lookup.has(`va:${va}`)) return lookup.get(`va:${va}`) || null;

  const naam = lower(
    pickFirst(
      row?.[`${side}_naam`],
      row?.[`${side}_naam_mm`],
      row?.[`${side}_naam_fp`],
      row?.[side === "rood" ? "red_name" : "blue_name"],
      sideRaw?.naam,
    ),
  );
  return naam ? lookup.get(`name:${naam}`) || null : null;
}

function copyRowStyle(source: ExcelJS.Row | undefined, target: ExcelJS.Row) {
  if (!source) return;
  target.height = source.height;
  for (let col = 1; col <= Math.max(source.cellCount, target.cellCount); col += 1) {
    const src = source.getCell(col);
    const dst = target.getCell(col);
    dst.style = { ...src.style };
    dst.numFmt = src.numFmt;
    if (src.alignment) dst.alignment = { ...src.alignment };
    if (src.border) dst.border = { ...src.border };
    if (src.fill) dst.fill = { ...src.fill };
    if (src.font) dst.font = { ...src.font };
  }
}

function clearRowsBelow(ws: ExcelJS.Worksheet, startRow: number) {
  if (ws.rowCount >= startRow) ws.spliceRows(startRow, ws.rowCount - startRow + 1);
}

function normalizeTemplateSheets(workbook: ExcelJS.Workbook) {
  const first = workbook.worksheets[0] || workbook.addWorksheet("MM");
  const second = workbook.worksheets[1] || workbook.addWorksheet("Aanmeldingen");
  const third = workbook.worksheets[2] || workbook.addWorksheet("Sportscholen");
  first.name = "MM";
  second.name = "Aanmeldingen";
  third.name = "Sportscholen";
  while (workbook.worksheets.length > 3) workbook.removeWorksheet(workbook.worksheets[3].id);
  return { first, second, third };
}

function boutWeightNumber(raw: unknown) {
  const match = s(raw).replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}


function boutRoundTimes(
  bout: Row,
  red: Row | null,
  blue: Row | null,
  matchmaking: Row | null,
) {
  const raw = obj(bout?.raw_json) || {};
  const klasseRaw = s(
    pickFirst(
      bout?.klasse,
      bout?.klasse_mm,
      bout?.wedstrijdklasse,
      raw?.klasse,
      raw?.klasse_mm,
      red ? klasseOf(red) : "",
      blue ? klasseOf(blue) : "",
    ),
  );
  const compactClass = lower(klasseRaw)
    .replace(/\b(?:klasse|class|clas)\b/g, "")
    .replace(/[-_\s/]+/g, "")
    .trim();

  const discipline = lower(
    pickFirst(
      bout?.discipline,
      bout?.sport,
      bout?.vechtsport,
      raw?.discipline,
      red ? disciplineOf(red) : "",
      blue ? disciplineOf(blue) : "",
    ),
  );

  const description = lower(
    [
      klasseRaw,
      discipline,
      bout?.type,
      bout?.partij_type,
      bout?.titel,
      bout?.omschrijving,
      bout?.handschoenen,
      raw?.type,
      raw?.partij_type,
      raw?.titel,
      raw?.omschrijving,
      raw?.handschoenen,
    ]
      .map(s)
      .filter(Boolean)
      .join(" "),
  );

  const explicit = s(
    pickFirst(
      bout?.ronde_tijden,
      bout?.rondetijden,
      bout?.partijduur,
      bout?.rondes,
      raw?.ronde_tijden,
      raw?.rondetijden,
      raw?.partijduur,
      raw?.rondes,
    ),
  );
  if (explicit) {
    // Toon uitsluitend de rondetijd; eventuele opgeslagen rusttekst hoort niet in deze kolom.
    return explicit
      .replace(/\s*\/\s*\d+(?:[,.]\d+)?\s*(?:sec(?:onden?)?|min(?:uten?)?)\s*rust.*$/i, "")
      .replace(/\s*[-–—]\s*rust.*$/i, "")
      .replace(/\s+rust.*$/i, "")
      .trim();
  }

  const isTitle =
    description.includes("titel") ||
    description.includes("championship") ||
    description.includes("kampioenschap");
  const is4oz =
    /(?:^|\s)4\s*oz(?:\s|$)/i.test(description) ||
    description.includes("4 ounce");
  const isThai =
    discipline.includes("thai") ||
    discipline.includes("muay");

  if (isTitle && (compactClass === "a" || compactClass.startsWith("a"))) {
    return "5 x 3 min";
  }
  if (is4oz) return "3 x 3 min";

  if (compactClass === "d" || compactClass.includes("demo")) {
    return "2 x 1 min";
  }

  const isJPlus =
    compactClass.includes("j+") ||
    compactClass.includes("jplus") ||
    compactClass.includes("talentstatus") ||
    description.includes("talentstatus");
  if (isJPlus) return "3 x 1,5 min";

  const isYouth =
    compactClass === "j" ||
    compactClass.startsWith("jeugd") ||
    compactClass.includes("youth");
  if (isYouth) {
    const ages = [
      red ? leeftijdNumberOf(red, matchmaking) : null,
      blue ? leeftijdNumberOf(blue, matchmaking) : null,
    ].filter((age): age is number => age !== null && Number.isFinite(age));
    const youngest = ages.length ? Math.min(...ages) : null;
    return youngest !== null && youngest >= 16
      ? "3 x 1,5 min"
      : "3 x 1 min";
  }

  if (compactClass === "r" || compactClass.includes("recreant")) {
    return "3 x 1 min";
  }
  if (compactClass === "n" || compactClass.includes("nieuweling")) {
    return "3 x 1,5 min";
  }
  if (compactClass === "c" || compactClass.startsWith("c")) {
    return "3 x 2 min";
  }
  if (compactClass === "b" || compactClass.startsWith("b")) {
    // Het thaiboksreglement staat ook 5 x 2 minuten toe. Zonder expliciete
    // keuze in de partij gebruiken we de reguliere standaard van 3 x 3.
    return isThai ? "3 x 3 min" : "3 x 3 min";
  }
  if (compactClass === "a" || compactClass.startsWith("a")) {
    return isThai ? "3 x 3 min" : "3 x 3 min";
  }

  return "";
}

function fillMatchmakingSheet(
  ws: ExcelJS.Worksheet,
  bouts: Row[],
  fighters: Row[],
  uitslagenRows: Row[],
  matchmaking: Row | null,
) {
  // De aangepaste template gebruikt:
  // rij 1 = vaste kolomkoppen, rij 2 = klasseregel, rij 3 = partijregel.
  const sectionStyle = ws.getRow(2);
  const dataStyle = ws.getRow(3);
  clearRowsBelow(ws, 2);

  const lookup = buildFighterLookup(fighters);
  const classOrder: Record<string, number> = {
    a: 0,
    b: 1,
    c: 2,
    n: 3,
    "j+": 4,
    j: 5,
  };

  const normalizedBouts = [...bouts].sort((a, b) => {
    const ka = normalizeClassToken(
      boutValue(a, "klasse", "wedstrijdklasse", "class"),
    );
    const kb = normalizeClassToken(
      boutValue(b, "klasse", "wedstrijdklasse", "class"),
    );
    const classDiff =
      (classOrder[ka] ?? 99) - (classOrder[kb] ?? 99);
    if (classDiff !== 0) return classDiff;

    // Exact dezelfde gewichtsbron als in tab Matchmaking: het afgesproken
    // maximale partijgewicht, niet het losse gewicht van één van de vechters.
    const weightA = boutWeightNumber(
      boutValue(
        a,
        "max_gewicht_notatie",
        "max_gewicht",
        "gewicht",
        "gewichtsklasse",
        "weight",
      ),
    );
    const weightB = boutWeightNumber(
      boutValue(
        b,
        "max_gewicht_notatie",
        "max_gewicht",
        "gewicht",
        "gewichtsklasse",
        "weight",
      ),
    );
    const weightDiff =
      (weightA ?? Number.POSITIVE_INFINITY) -
      (weightB ?? Number.POSITIVE_INFINITY);
    if (weightDiff !== 0) return weightDiff;

    const nrA = Number(boutValue(a, "partij_nr", "partijNr", "bout_nr"));
    const nrB = Number(boutValue(b, "partij_nr", "partijNr", "bout_nr"));
    return (Number.isFinite(nrA) ? nrA : 9999) -
      (Number.isFinite(nrB) ? nrB : 9999);
  });

  let rowNo = 2;
  let currentClass = "";

  for (const [boutIndex, bout] of normalizedBouts.entries()) {
    const clsToken = normalizeClassToken(
      boutValue(bout, "klasse", "wedstrijdklasse", "class"),
    );
    const cls =
      ({ a: "A", b: "B", c: "C", n: "N", "j+": "J+", j: "J" } as Record<
        string,
        string
      >)[clsToken] ||
      s(boutValue(bout, "klasse", "wedstrijdklasse", "class")) ||
      "Onbekend";

    if (cls !== currentClass) {
      currentClass = cls;
      const section = ws.insertRow(rowNo, []);
      copyRowStyle(sectionStyle, section);

      // Eén doorlopende lichtgrijze klassebalk boven iedere klasse.
      ws.mergeCells(`A${rowNo}:R${rowNo}`);
      const classCell = section.getCell(1);
      classCell.value = `${cls}-klasse`;
      classCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: GREY },
      };
      classCell.font = { bold: true, color: { argb: BLACK } };
      classCell.alignment = { vertical: "middle", horizontal: "left" };
      classCell.border = {};
      for (let col = 1; col <= 18; col += 1) {
        section.getCell(col).border = {};
      }
      section.height = Math.max(section.height || 15, 20);
      rowNo += 1;
    }

    const red = findBoutFighter(bout, "rood", lookup);
    const blue = findBoutFighter(bout, "blauw", lookup);
    // De Matchmaking-weergave staat met de main card bovenaan en jeugd
    // onderaan. Nummer daarom van onder naar boven: onderste partij = 1,
    // bovenste partij = hoogste nummer. Dit nummer is alleen voor de export.
    const partyNo = normalizedBouts.length - boutIndex;

    const discipline =
      boutValue(bout, "discipline", "sport", "vechtsport") ||
      (red ? disciplineOf(red) : blue ? disciplineOf(blue) : "");
    const gender =
      boutValue(bout, "geslacht", "gender", "m_v") ||
      (red ? geslachtOf(red) : blue ? geslachtOf(blue) : "");
    const maxWeightRaw =
      boutValue(
        bout,
        "max_gewicht_notatie",
        "max_gewicht",
        "gewicht",
        "gewichtsklasse",
        "weight",
      ) || (red ? gewichtOf(red) : blue ? gewichtOf(blue) : "");
    const maxWeight = boutWeightNumber(maxWeightRaw);

    const row = ws.insertRow(rowNo, []);
    copyRowStyle(dataStyle, row);
    row.values = [
      partyNo, // A Partijnummer gelijk aan tab Matchmaking
      discipline, // B Discipline
      cls, // C Klasse
      gender, // D M/V
      red ? nameOf(red) : boutValue(bout, "rood_naam", "rood_naam_mm", "red_name"), // E
      red ? gymOf(red) : boutValue(bout, "rood_gym", "rood_sportschool"), // F
      red
        ? parseDateOnly(dobOf(red)) || fmtDate(dobOf(red))
        : boutValue(bout, "rood_geboortedatum", "rood_geboortedatum_mm"), // G
      red ? leeftijdNumberOf(red, matchmaking) ?? "" : boutValue(bout, "rood_leeftijd"), // H
      red ? vaExcelValue(vaOf(red)) : vaExcelValue(boutValue(bout, "va_rood", "rood_va")), // I
      red ? recordOf(red, uitslagenRows) : boutValue(bout, "rood_record"), // J
      maxWeight ?? "", // K Max gew: echt getal, geen tekst
      blue ? nameOf(blue) : boutValue(bout, "blauw_naam", "blauw_naam_mm", "blue_name"), // L
      blue ? gymOf(blue) : boutValue(bout, "blauw_gym", "blauw_sportschool"), // M
      blue
        ? parseDateOnly(dobOf(blue)) || fmtDate(dobOf(blue))
        : boutValue(bout, "blauw_geboortedatum", "blauw_geboortedatum_mm"), // N
      blue ? leeftijdNumberOf(blue, matchmaking) ?? "" : boutValue(bout, "blauw_leeftijd"), // O
      blue ? vaExcelValue(vaOf(blue)) : vaExcelValue(boutValue(bout, "va_blauw", "blauw_va")), // P
      blue ? recordOf(blue, uitslagenRows) : boutValue(bout, "blauw_record"), // Q
      boutRoundTimes(bout, red, blue, matchmaking), // R Ronde tijden volgens NVB-reglement
    ];
    copyRowStyle(dataStyle, row);

    // Raster rond alle partijgegevens. De grijze klassebalken worden hierboven
    // apart aangemaakt en krijgen bewust geen celranden.
    for (let col = 1; col <= 18; col += 1) {
      const cell = row.getCell(col);
      cell.border = {
        top: { style: "thin", color: { argb: "FFBFBFBF" } },
        left: { style: "thin", color: { argb: "FFBFBFBF" } },
        bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
        right: { style: "thin", color: { argb: "FFBFBFBF" } },
      };
    }

    // Max gewicht is een numerieke Excel-cel en wordt rood weergegeven.
    const maxWeightCell = row.getCell(11);
    maxWeightCell.numFmt = "0.0";
    maxWeightCell.alignment = {
      ...(maxWeightCell.alignment || {}),
      horizontal: "center",
      vertical: "middle",
    };
    maxWeightCell.font = {
      ...(maxWeightCell.font || {}),
      color: { argb: "FFFF0000" },
      bold: true,
    };
    rowNo += 1;
  }

  ws.views = [{ state: "frozen", ySplit: 1 }];
  // Bewust geen filter op MM: de klassebalken moeten zichtbaar blijven.
  ws.autoFilter = undefined;
}

function fillAanmeldingenTemplateSheet(
  ws: ExcelJS.Worksheet,
  fighters: Row[],
  uitslagenRows: Row[],
  matchmaking: Row | null,
) {
  const dataStyle = ws.getRow(2);
  clearRowsBelow(ws, 2);

  // De kopregel uit de template blijft volledig intact.
  const sorted = [...fighters].sort((a, b) => sortFighters(a, b, matchmaking));
  for (const f of sorted) {
    const row = ws.addRow([
      disciplineOf(f),
      klasseOf(f),
      geslachtOf(f),
      nameOf(f),
      gymOf(f),
      parseDateOnly(dobOf(f)) || fmtDate(dobOf(f)),
      vaExcelValue(vaOf(f)),
      recordOf(f, uitslagenRows),
      leeftijdNumberOf(f, matchmaking) ?? "",
      gewichtOf(f),
    ]);
    copyRowStyle(dataStyle, row);
  }

  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: "A1", to: "J1" };
}

function fillSportscholenTemplateSheet(
  ws: ExcelJS.Worksheet,
  fighters: Row[],
  matchmaking: Row | null,
) {
  const gymStyle = ws.getRow(1);
  const fighterStyle = ws.getRow(2);
  clearRowsBelow(ws, 1);

  const groups = new Map<string, Row[]>();
  for (const f of fighters) {
    const gym = gymOf(f) || "Sportschool onbekend";
    if (!groups.has(gym)) groups.set(gym, []);
    groups.get(gym)!.push(f);
  }

  const sortedGroups = [...groups.entries()].sort(([a], [b]) =>
    a.localeCompare(b, "nl"),
  );

  for (const [gym, rows] of sortedGroups) {
    // Exact volgens de aangepaste template:
    // A = Sportschool:, C = E-mailadres:, D = leeg invulvak.
    const gymRow = ws.addRow(["Sportschool:", gym, "E-mailadres:", ""]);
    copyRowStyle(gymStyle, gymRow);
    gymRow.getCell(1).font = { ...(gymRow.getCell(1).font || {}), bold: true };
    gymRow.getCell(2).font = { ...(gymRow.getCell(2).font || {}), bold: true };
    gymRow.getCell(3).font = { ...(gymRow.getCell(3).font || {}), bold: true };

    const headerRow = ws.addRow(["Naam", "Klasse", "Gewicht", "Bijzonderheden"]);
    copyRowStyle(fighterStyle, headerRow);

    for (const f of [...rows].sort((a, b) => sortFighters(a, b, matchmaking))) {
      const row = ws.addRow([nameOf(f), klasseOf(f), gewichtOf(f), ""]);
      copyRowStyle(fighterStyle, row);
      // Alleen de gegevensrij, niet de kopregel, krijgt normale tekststijl.
      row.getCell(1).font = { ...(row.getCell(1).font || {}), bold: false };
      row.getCell(2).font = { ...(row.getCell(2).font || {}), bold: false };
      row.getCell(3).font = { ...(row.getCell(3).font || {}), bold: false };
      row.getCell(4).font = { ...(row.getCell(4).font || {}), bold: false };
    }

    ws.addRow([]);
  }
}

async function createTemplateWorkbook(
  matchmaking: Row | null,
  controlled: Row[],
  allAanmeldingen: Row[],
  bouts: Row[],
  uitslagenRows: Row[],
) {
  const templatePath = path.join(process.cwd(), "public", "templates", "matchmaking-template.xlsx");
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Excel-template ontbreekt: ${templatePath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  workbook.creator = "FightSupport";
  workbook.modified = new Date();

  const { first, second, third } = normalizeTemplateSheets(workbook);
  first.name = safeSheetTitle(`MM ${eventLabelOf(matchmaking)}`, "MM");
  fillMatchmakingSheet(first, bouts, controlled, uitslagenRows, matchmaking);
  fillAanmeldingenTemplateSheet(second, allAanmeldingen, uitslagenRows, matchmaking);
  fillSportscholenTemplateSheet(third, allAanmeldingen, matchmaking);

  // Open het gedownloade werkboek standaard op het eerste tabblad: MM.
  workbook.views = [{
    x: 0,
    y: 0,
    width: 12000,
    height: 20000,
    activeTab: 0,
    firstSheet: 0,
    visibility: "visible",
  }];
  first.state = "visible";
  return workbook;
}

async function queryTable(
  table: string,
  matchmakingId: string,
  orderColumn?: string,
) {
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
    const matchmakingId = s(
      url.searchParams.get("matchmaking_id") ??
        url.searchParams.get("matchmakingId") ??
        url.searchParams.get("matchmakingid") ??
        url.searchParams.get("id"),
    );
    if (!matchmakingId) {
      return NextResponse.json(
        { ok: false, error: "matchmakingId ontbreekt" },
        { status: 400 },
      );
    }

    const [
      { data: matchmaking },
      aanmeldingen,
      fighterContext,
      fightersRaw,
      uitslagenRows,
      bouts,
      resultRows,
    ] = await Promise.all([
      supabase
        .from("matchmakings")
        .select("*")
        .eq("id", matchmakingId)
        .maybeSingle(),
      queryTable("aanmeldingen", matchmakingId, "created_at"),
      queryTable("matchmaker_fighter_context", matchmakingId, "created_at"),
      queryTable("matchmaker_fighters_raw", matchmakingId, "created_at"),
      queryTable("matchmaker_uitslagen_raw", matchmakingId, "datum"),
      queryTable("matchmaking_bouts_raw", matchmakingId, "partij_nr"),
      queryTable("matchmaker_fighter_resultaten", matchmakingId, "created_at"),
    ]);

    // Context is leidend: daarin staan licentie, startverbod, keurmerk_reden en de geneste raw scrape.
    const contextPlusRaw = mergeByAanmelding(fighterContext, fightersRaw);
    const merged = mergeByAanmelding(aanmeldingen, contextPlusRaw);
    const withAanmeldingStatus = mergeAanmeldingStatusIntoFighters(
      merged,
      aanmeldingen,
    );
    const marked = markMatchedFromBouts(withAanmeldingStatus, bouts);
    const controlled = marked.filter(isControlledFighter);

    const allAanmeldingen = markMatchedFromBouts(withAanmeldingStatus, bouts);
    const workbook = await createTemplateWorkbook(
      matchmaking ?? null,
      controlled,
      allAanmeldingen,
      bouts,
      uitslagenRows,
    );

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `matchmaking-${safeSheetTitle(eventLabelOf(matchmaking ?? null), matchmakingId)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
