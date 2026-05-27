// app/api/rapport/official-excel/route.ts
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function safe(v: any, fallback = "") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function pickFirst(...vals: any[]) {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== "") return v;
  }
  return "";
}

function onlyDigits(v: any) {
  const s = String(v ?? "")
    .replace(/[^\d]/g, "")
    .trim();
  return s || "";
}


function numberValueOrBlank(v: any): number | string {
  const digits = onlyDigits(v);
  if (!digits) return "";

  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : digits;
}

function recordValueForExcel(v: any): number | string {
  const raw = safe(v, "");
  if (!raw) return "";

  const simpleNumber = raw.match(/^\d+$/);
  if (!simpleNumber) return raw;

  const n = Number(raw);
  return Number.isSafeInteger(n) ? n : raw;
}

function parseDateOnly(v: any): Date | null {
  if (!v) return null;
  const s = String(v).trim();

  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return new Date(
      Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12, 0, 0),
    );
  }

  const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) {
    return new Date(
      Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12, 0, 0),
    );
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;

  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0),
  );
}

function calcAgeAtDateNumber(dob: any, refDate: any): number | null {
  const birth = parseDateOnly(dob);
  const ref = parseDateOnly(refDate);
  if (!birth || !ref) return null;

  let age = ref.getUTCFullYear() - birth.getUTCFullYear();
  const m = ref.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function formatAge(v: any, dob: any, eventDate: any) {
  const calc = calcAgeAtDateNumber(dob, eventDate);
  if (calc != null) return `${calc} jaar`;

  const raw = safe(v, "");
  if (!raw) return "";
  if (/jaar/i.test(raw)) return raw;

  const n = Number(String(raw).replace(/[^\d.-]/g, ""));
  if (Number.isFinite(n)) return `${Math.round(n)} jaar`;

  return raw;
}

function formatKg(v: any) {
  const raw = safe(v, "");
  if (!raw) return "";

  const n = Number(
    String(raw)
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );
  if (!Number.isFinite(n)) {
    return /kg/i.test(raw) ? raw : `${raw}kg`;
  }

  if (Number.isInteger(n)) return `${n}kg`;
  return `${String(n).replace(".", ",")}kg`;
}

function formatJaNee(v: any) {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "";

  if (
    s === "ja" ||
    s === "yes" ||
    s === "true" ||
    s === "1" ||
    s === "geldig" ||
    s === "valid"
  ) {
    return "Ja";
  }

  if (
    s === "nee" ||
    s === "no" ||
    s === "false" ||
    s === "0" ||
    s === "ongeldig" ||
    s === "invalid"
  ) {
    return "Nee";
  }

  return "";
}

function fmtYmdForFilename(v: any) {
  if (!v) return "00000000";
  const d = parseDateOnly(v);
  if (!d) return "00000000";

  const y = String(d.getUTCFullYear());
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function getCurrentNaam(ctx: any, side: "rood" | "blauw") {
  return side === "rood"
    ? safe(
        pickFirst(
          ctx?.rood_naam_fp,
          ctx?.rood_naam_gecorrigeerd,
          ctx?.rood_naam_corrected,
          ctx?.rood_naam_mm,
          ctx?.rood_naam,
        ),
        "",
      )
    : safe(
        pickFirst(
          ctx?.blauw_naam_fp,
          ctx?.blauw_naam_gecorrigeerd,
          ctx?.blauw_naam_corrected,
          ctx?.blauw_naam_mm,
          ctx?.blauw_naam,
        ),
        "",
      );
}

function getCurrentGym(ctx: any, side: "rood" | "blauw") {
  return side === "rood"
    ? safe(pickFirst(ctx?.rood_gym_fp, ctx?.rood_gym_mm, ctx?.rood_gym), "")
    : safe(pickFirst(ctx?.blauw_gym_fp, ctx?.blauw_gym_mm, ctx?.blauw_gym), "");
}

function getVa(ctx: any, side: "rood" | "blauw") {
  const raw =
    side === "rood"
      ? pickFirst(
          ctx?.rood_va_mm,
          ctx?.rood_va_gecorrigeerd,
          ctx?.rood_va_corrected,
          ctx?.va_rood,
          ctx?.rood_va,
        )
      : pickFirst(
          ctx?.blauw_va_mm,
          ctx?.blauw_va_gecorrigeerd,
          ctx?.blauw_va_corrected,
          ctx?.va_blauw,
          ctx?.blauw_va,
        );

  return onlyDigits(raw);
}

function getDob(ctx: any, side: "rood" | "blauw") {
  return side === "rood"
    ? pickFirst(
        ctx?.rood_geboortedatum_fp,
        ctx?.rood_geboortedatum_mm,
        ctx?.rood_geboortedatum,
        ctx?.geboortedatum_rood,
        ctx?.rood_dob,
      )
    : pickFirst(
        ctx?.blauw_geboortedatum_fp,
        ctx?.blauw_geboortedatum_mm,
        ctx?.blauw_geboortedatum,
        ctx?.geboortedatum_blauw,
        ctx?.blauw_dob,
      );
}

function getLeeftijd(ctx: any, side: "rood" | "blauw", eventDate: any) {
  const dob = getDob(ctx, side);
  const direct =
    side === "rood"
      ? pickFirst(ctx?.rood_leeftijd, ctx?.leeftijd_rood)
      : pickFirst(ctx?.blauw_leeftijd, ctx?.leeftijd_blauw);

  return formatAge(direct, dob, eventDate);
}

function getGewicht(ctx: any, side: "rood" | "blauw") {
  const raw =
    side === "rood"
      ? pickFirst(
          ctx?.rood_gewicht_fp,
          ctx?.rood_gewicht_mm,
          ctx?.rood_gewicht,
          ctx?.gewicht_rood,
        )
      : pickFirst(
          ctx?.blauw_gewicht_fp,
          ctx?.blauw_gewicht_mm,
          ctx?.blauw_gewicht,
          ctx?.gewicht_blauw,
        );

  return formatKg(raw);
}

function getLicentie(ctx: any, side: "rood" | "blauw") {
  const raw =
    side === "rood"
      ? pickFirst(
          ctx?.rood_licentie,
          ctx?.rood_fightlicentie,
          ctx?.licentie_rood,
        )
      : pickFirst(
          ctx?.blauw_licentie,
          ctx?.blauw_fightlicentie,
          ctx?.licentie_blauw,
        );

  return formatJaNee(raw);
}

function getKlasse(ctx: any) {
  const extra = rawJsonObject(ctx);
  return safe(
    pickFirst(ctx?.klasse_mm, ctx?.klasse, extra?.klasse, extra?.class),
    "",
  );
}

function normalizeWeightValueForExcel(v: any) {
  const raw = safe(v, "");
  if (!raw) return "";

  const n = Number(
    raw
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );

  if (!Number.isFinite(n)) {
    return raw
      .replace(/\s*kg$/i, "")
      .trim();
  }

  return Number.isInteger(n)
    ? String(Math.abs(n))
    : String(Math.abs(n)).replace(".", ",");
}

function isOpenAboveWeightType(v: any) {
  const t = normalizeText(v).replace(/[\s_-]+/g, "_");
  return (
    t === "open_above" ||
    t === "above" ||
    t === "plus" ||
    t === "open_plus" ||
    t.includes("open_above") ||
    t.includes("boven") ||
    t.includes("vanaf") ||
    t.includes("plus")
  );
}

function formatMaxKg(v: any, type: any = "") {
  const raw = safe(v, "");
  if (!raw) return "";

  const rawTxt = String(raw).trim();

  // Gewichtsklassen zoals 95+ mogen nooit als -95 kg worden weergegeven.
  // Dit vangt zowel max_gewicht_notatie="95+" als max_gewicht=95 + type=open_above af.
  const plusMatch =
    rawTxt.match(/^(\d+(?:[,.]\d+)?)\s*\+/) ||
    rawTxt.match(/^\+\s*(\d+(?:[,.]\d+)?)/);
  if (plusMatch) {
    const value = plusMatch[1].replace(".", ",");
    return `${value}+ kg`;
  }

  if (isOpenAboveWeightType(type)) {
    const value = normalizeWeightValueForExcel(rawTxt);
    return value ? `${value}+ kg` : "";
  }

  const n = Number(
    rawTxt
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );

  if (!Number.isFinite(n)) {
    const cleaned = rawTxt
      .replace(/^[-–—]\s*/, "")
      .replace(/\s*kg$/i, "")
      .trim();
    return cleaned ? `-${cleaned} kg` : "";
  }

  const value = Number.isInteger(n)
    ? String(Math.abs(n))
    : String(Math.abs(n)).replace(".", ",");

  return `-${value} kg`;
}

function getMaxKg(ctx: any) {
  const extra = rawJsonObject(ctx);

  const notatie = pickFirst(
    ctx?.max_gewicht_notatie,
    ctx?.max_gewicht_notation,
    ctx?.max_gewicht_label,
    ctx?.gewicht_notatie,
    extra?.max_gewicht_notatie,
    extra?.max_gewicht_notation,
    extra?.max_gewicht_label,
    extra?.gewicht_notatie,
  );

  const type = pickFirst(
    ctx?.max_gewicht_type,
    ctx?.maxgewicht_type,
    ctx?.gewichtslimiet_type,
    extra?.max_gewicht_type,
    extra?.maxgewicht_type,
    extra?.gewichtslimiet_type,
  );

  const gewicht = pickFirst(
    ctx?.max_gewicht,
    ctx?.max_gewicht_kg,
    ctx?.maxgewicht,
    ctx?.gewichtslimiet,
    ctx?.afgesproken_gewicht,
    ctx?.partij_gewicht,
    extra?.max_gewicht,
    extra?.max_gewicht_kg,
    extra?.maxgewicht,
    extra?.gewichtslimiet,
    extra?.afgesproken_gewicht,
    extra?.partij_gewicht,
    extra?.weight_limit,
    extra?.maxWeight,
    extra?.max_weight,
  );

  return formatMaxKg(pickFirst(notatie, gewicht), type);
}

function normalizeText(v: any) {
  return safe(v, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getDiscipline(ctx: any) {
  const extra = rawJsonObject(ctx);
  return safe(
    pickFirst(
      ctx?.discipline_mm,
      ctx?.discipline,
      ctx?.sport,
      ctx?.vechtsport,
      extra?.discipline,
      extra?.sport,
    ),
    "",
  );
}

function rawJsonObject(ctx: any): any {
  const raw = ctx?.raw_json;
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return {};
  }
}

function isTitleFight(ctx: any) {
  const extra = rawJsonObject(ctx);
  const haystack = normalizeText(
    [
      ctx?.titelpartij,
      ctx?.is_titelpartij,
      ctx?.title_fight,
      ctx?.partij_type,
      ctx?.type,
      ctx?.klasse_mm,
      ctx?.klasse,
      ctx?.opmerking,
      ctx?.notitie,
      ctx?.notes,
      extra?.titelpartij,
      extra?.is_titelpartij,
      extra?.title_fight,
      extra?.partij_type,
      extra?.type,
      extra?.opmerking,
    ]
      .filter((x) => x !== null && x !== undefined)
      .join(" "),
  );

  return (
    haystack.includes("titel") ||
    haystack.includes("title fight") ||
    haystack.includes("championship") ||
    haystack.includes("wereldtitel") ||
    haystack.includes("nederlandse titel")
  );
}

function ageNumber(ctx: any, side: "rood" | "blauw", eventDate: any) {
  const dob = getDob(ctx, side);
  const calc = calcAgeAtDateNumber(dob, eventDate);
  if (calc != null) return calc;

  const direct =
    side === "rood"
      ? pickFirst(ctx?.rood_leeftijd, ctx?.leeftijd_rood)
      : pickFirst(ctx?.blauw_leeftijd, ctx?.leeftijd_blauw);

  const n = Number(String(direct ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function isJeugdKlasse(raw: any) {
  const k = normalizeText(raw);
  return (
    k.includes("jeugd") ||
    k === "j" ||
    k.startsWith("j ") ||
    k.includes("j-") ||
    k.includes("j klasse") ||
    k.includes("j-klasse") ||
    k.includes("youth")
  );
}

function includesClass(raw: any, code: "R" | "N" | "C" | "B" | "A") {
  const k = normalizeText(raw).replace(/_/g, " ");
  const c = code.toLowerCase();

  if (code === "N" && (k.includes("nieuweling") || k.includes("newcomer"))) {
    return true;
  }

  if (code === "R" && (k.includes("recreant") || k.includes("recreatief"))) {
    return true;
  }

  return (
    k === c ||
    k.startsWith(`${c} `) ||
    k.includes(` ${c} `) ||
    k.includes(`${c}-`) ||
    k.includes(`${c} klasse`) ||
    k.includes(`${c}-klasse`) ||
    k.includes(`klasse ${c}`) ||
    k.includes(`${c} class`)
  );
}

function getRondeTijden(ctx: any, eventDate: any) {
  const klasse = getKlasse(ctx);
  const klasseTxt = normalizeText(klasse);
  const disciplineTxt = normalizeText(getDiscipline(ctx));
  const titleFight = isTitleFight(ctx);

  if (
    disciplineTxt.includes("mma") ||
    disciplineTxt.includes("mixed martial")
  ) {
    if (
      isJeugdKlasse(klasse) ||
      klasseTxt.includes("jeugd") ||
      klasseTxt.includes("youth")
    ) {
      return "2x3 min";
    }
    if (klasseTxt.includes("pro") || klasseTxt.includes("professional")) {
      return titleFight ? "5x5 min" : "3x5 min";
    }
    if (klasseTxt.includes("amateur"))
      return titleFight ? "5x3 min" : "3x3 min";
    return titleFight ? "5x3 min" : "3x3 min";
  }

  if (titleFight) return "5 rondes";

  if (isJeugdKlasse(klasse)) {
    const roodAge = ageNumber(ctx, "rood", eventDate);
    const blauwAge = ageNumber(ctx, "blauw", eventDate);
    if (
      roodAge != null &&
      blauwAge != null &&
      roodAge >= 16 &&
      blauwAge >= 16
    ) {
      return "3x1,5 min";
    }
    return "3x1 min";
  }

  if (includesClass(klasse, "R")) return "3x1,5 min";
  if (includesClass(klasse, "N")) return "3x1,5 min";
  if (includesClass(klasse, "C")) return "3x2 min";
  if (includesClass(klasse, "B")) return "3x3 min";
  if (includesClass(klasse, "A")) return "3x3 min";

  return "";
}

type UitslagRow = {
  va_nummer?: string | number | null;
  bron_va_nummer?: string | number | null;
  uitslag?: string | null;
  klasse?: string | null;
  datum?: string | null;
  matchmaking_id?: string | null;
  controle_run_id?: string | null;
};

type KlasseCode = "J" | "R" | "N" | "C" | "B" | "A";

const KLASSE_RANK: Record<KlasseCode, number> = {
  J: 0,
  R: 1,
  N: 2,
  C: 3,
  B: 4,
  A: 5,
};

function normalizeKlasseForRanking(
  rawKlasse: any,
  dob: any,
  resultDate: any,
): KlasseCode | null {
  const klasse = safe(rawKlasse, "").toLowerCase();
  const ageAtFight = calcAgeAtDateNumber(dob, resultDate);

  if (ageAtFight != null && ageAtFight < 18) {
    return "J";
  }

  if (
    klasse.includes("jeugd") ||
    klasse === "j" ||
    klasse.startsWith("j ") ||
    klasse.includes(" klasse j") ||
    klasse.includes("j klasse")
  ) {
    return "J";
  }

  if (
    klasse === "r" ||
    klasse.startsWith("r ") ||
    klasse.includes(" r ") ||
    klasse.includes("r-") ||
    klasse.includes("klasse r") ||
    klasse.includes("r klasse")
  ) {
    return "R";
  }

  if (
    klasse === "n" ||
    klasse.startsWith("n ") ||
    klasse.includes(" n ") ||
    klasse.includes("n-") ||
    klasse.includes("klasse n") ||
    klasse.includes("n klasse")
  ) {
    return "N";
  }

  if (
    klasse === "c" ||
    klasse.startsWith("c ") ||
    klasse.includes(" c ") ||
    klasse.includes("c-") ||
    klasse.includes("klasse c") ||
    klasse.includes("c klasse")
  ) {
    return "C";
  }

  if (
    klasse === "b" ||
    klasse.startsWith("b ") ||
    klasse.includes(" b ") ||
    klasse.includes("b-") ||
    klasse.includes("klasse b") ||
    klasse.includes("b klasse")
  ) {
    return "B";
  }

  if (
    klasse === "a" ||
    klasse.startsWith("a ") ||
    klasse.includes(" a ") ||
    klasse.includes("a-") ||
    klasse.includes("klasse a") ||
    klasse.includes("a klasse")
  ) {
    return "A";
  }

  if (ageAtFight != null && ageAtFight >= 18) {
    return "N";
  }

  return null;
}

function classifyUitslag(raw: any): "win" | "loss" | "draw" | "demo" | null {
  const txt = safe(raw, "").toLowerCase();
  if (!txt) return null;

  if (txt.includes("demo")) return "demo";
  if (txt.includes("no contest") || txt.includes("no-contest")) return "draw";
  if (txt.includes("onbeslist")) return "draw";
  if (txt.includes("verlies") || txt.includes("verliest")) return "loss";
  if (txt.includes("wint")) return "win";

  return null;
}

function formatRecordString(
  win: number,
  loss: number,
  draw: number,
  demo: number,
  includeDemo: boolean,
) {
  if (includeDemo) {
    return `${win}-${loss}-${draw} (${demo} demo)`;
  }
  return `${win}-${loss}-${draw}`;
}

function buildRecordHighestClassFromUitslagen(rows: UitslagRow[], dob: any) {
  if (!rows.length) {
    return {
      record: "",
      highestClass: null as KlasseCode | null,
      recordWithClass: "",
    };
  }

  let highestClass: KlasseCode | null = null;

  for (const row of rows) {
    const normalized = normalizeKlasseForRanking(row?.klasse, dob, row?.datum);
    if (!normalized) continue;

    if (!highestClass || KLASSE_RANK[normalized] > KLASSE_RANK[highestClass]) {
      highestClass = normalized;
    }
  }

  if (!highestClass) {
    return {
      record: "",
      highestClass: null as KlasseCode | null,
      recordWithClass: "",
    };
  }

  let win = 0;
  let loss = 0;
  let draw = 0;
  let demo = 0;

  for (const row of rows) {
    const normalized = normalizeKlasseForRanking(row?.klasse, dob, row?.datum);
    if (normalized !== highestClass) continue;

    const kind = classifyUitslag(row?.uitslag);
    if (kind === "win") win += 1;
    else if (kind === "loss") loss += 1;
    else if (kind === "draw") draw += 1;
    else if (kind === "demo") demo += 1;
  }

  const includeDemo = highestClass === "J";
  const record = formatRecordString(win, loss, draw, demo, includeDemo);

  return {
    record,
    highestClass,
    recordWithClass: `${highestClass} ${record}`,
  };
}

function getScraperTotaal(ctx: any, side: "rood" | "blauw") {
  return side === "rood"
    ? safe(ctx?.rood_totaal_wedstrijden_scrape, "")
    : safe(ctx?.blauw_totaal_wedstrijden_scrape, "");
}

function getContextTotaalWedstrijden(ctx: any, side: "rood" | "blauw") {
  if (side === "rood") {
    return safe(
      pickFirst(
        ctx?.rood_totaal_wedstrijden_mm,
        ctx?.rood_totaal_wedstrijden,
        ctx?.rood_total_fights,
        ctx?.rood_fights_total,
        ctx?.rood_aantal_partijen,
        ctx?.rood_partijen,
        ctx?.rood_record_totaal,
        ctx?.totaal_wedstrijden_rood,
      ),
      "",
    );
  }

  return safe(
    pickFirst(
      ctx?.blauw_totaal_wedstrijden_mm,
      ctx?.blauw_totaal_wedstrijden,
      ctx?.blauw_total_fights,
      ctx?.blauw_fights_total,
      ctx?.blauw_aantal_partijen,
      ctx?.blauw_partijen,
      ctx?.blauw_record_totaal,
      ctx?.totaal_wedstrijden_blauw,
    ),
    "",
  );
}

function getRecordOfErvaring(
  ctx: any,
  side: "rood" | "blauw",
  uitslagenByVa: Map<string, UitslagRow[]>,
) {
  const va = getVa(ctx, side);
  const dob = getDob(ctx, side);

  if (va) {
    const rows = uitslagenByVa.get(va) ?? [];
    const built = buildRecordHighestClassFromUitslagen(rows, dob);
    if (built.recordWithClass) return built.recordWithClass;
  }

  const contextTotaal = getContextTotaalWedstrijden(ctx, side);
  if (contextTotaal) return contextTotaal;

  return getScraperTotaal(ctx, side);
}

async function getLatestRun(matchmaking_id: string) {
  const { data, error } = await supabase
    .from("controle_runs")
    .select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type")
    .eq("matchmaking_id", matchmaking_id)
    .order("gestart_op", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

async function getEventMeta(matchmaking_id: string) {
  const { data, error } = await supabase
    .from("matchmakings")
    .select("id, naam, datum, bondteam, locatie, promotor")
    .eq("id", matchmaking_id)
    .maybeSingle();

  if (error) throw error;

  return {
    id: data?.id ?? matchmaking_id,
    naam: data?.naam ?? null,
    datum: data?.datum ?? null,
    bond: data?.bondteam ?? null,
    locatie: data?.locatie ?? null,
    promotor: data?.promotor ?? null,
  };
}

async function loadUitslagenByVa(vaNumbers: string[]) {
  const cleaned = Array.from(
    new Set((vaNumbers ?? []).map((v) => onlyDigits(v)).filter(Boolean)),
  );

  const map = new Map<string, UitslagRow[]>();
  if (!cleaned.length) return map;

  const lookup = new Set(cleaned);

  const { data, error } = await supabase
    .from("uitslagen_raw")
    .select(
      "va_nummer, bron_va_nummer, uitslag, klasse, datum, matchmaking_id, controle_run_id",
    )
    .or(
      cleaned.map((v) => `va_nummer.eq.${v},bron_va_nummer.eq.${v}`).join(","),
    );

  if (error) throw error;

  const allRows = (data ?? []) as UitslagRow[];

  for (const row of allRows) {
    const primaryVa = onlyDigits(row?.va_nummer);
    const backupVa = onlyDigits(row?.bron_va_nummer);

    const matchedVa = lookup.has(primaryVa)
      ? primaryVa
      : lookup.has(backupVa)
        ? backupVa
        : "";

    if (!matchedVa) continue;

    if (!map.has(matchedVa)) map.set(matchedVa, []);
    map.get(matchedVa)!.push({
      va_nummer: matchedVa,
      bron_va_nummer: backupVa || null,
      uitslag: row?.uitslag ?? null,
      klasse: row?.klasse ?? null,
      datum: row?.datum ?? null,
      matchmaking_id: row?.matchmaking_id ?? null,
      controle_run_id: row?.controle_run_id ?? null,
    });
  }

  return map;
}

function borderThin() {
  return {
    top: { style: "thin" as const, color: { argb: "FF000000" } },
    left: { style: "thin" as const, color: { argb: "FF000000" } },
    bottom: { style: "thin" as const, color: { argb: "FF000000" } },
    right: { style: "thin" as const, color: { argb: "FF000000" } },
  };
}

function applySheetLayout(ws: ExcelJS.Worksheet) {
  ws.views = [{ state: "normal", showGridLines: true }];

  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 28;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 22;
  ws.getColumn(6).width = 20;
  ws.getColumn(7).width = 10;
  ws.getColumn(8).width = 10;
  ws.getColumn(9).width = 8;
  ws.getColumn(10).width = 10;
  ws.getColumn(11).width = 28;
  ws.getColumn(12).width = 14;
  ws.getColumn(13).width = 24;
  ws.getColumn(14).width = 20;
  ws.getColumn(15).width = 10;
  ws.getColumn(16).width = 10;
  ws.getColumn(17).width = 14;
  ws.getColumn(18).width = 12;
  ws.getColumn(19).width = 16;
  ws.getColumn(20).width = 18;

  ws.getRow(1).height = 22;
}

function styleHeaderRow(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  for (let c = 1; c <= 20; c++) {
    const cell = row.getCell(c);
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FF000000" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "left",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" },
    } as any;
    cell.border = borderThin();
  }
  row.commit();
}

function styleDataRow(row: ExcelJS.Row) {
  for (let c = 1; c <= 20; c++) {
    const cell = row.getCell(c);
    cell.font = { name: "Calibri", size: 11, color: { argb: "FF000000" } };
    cell.alignment = {
      vertical: "middle",
      horizontal:
        c === 1 ||
        c === 2 ||
        c === 6 ||
        c === 7 ||
        c === 8 ||
        c === 9 ||
        c === 10 ||
        c === 14 ||
        c === 15 ||
        c === 16 ||
        c === 18 ||
        c === 19 ||
        c === 20
          ? "center"
          : "left",
      wrapText: true,
    };
    cell.border = borderThin();
  }

  row.getCell(9).font = {
    name: "Calibri",
    size: 11,
    bold: true,
    color: { argb: "FF000000" },
  };
  row.getCell(9).alignment = { vertical: "middle", horizontal: "center" };
  row.height = 21;
  row.commit();
}

function applyNoLicenseCellStyle(cell: ExcelJS.Cell) {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFC7CE" },
  } as any;
  cell.font = {
    name: "Calibri",
    size: 11,
    bold: true,
    color: { argb: "FF9C0006" },
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
}

type ControleMeldingRow = {
  id?: string | null;
  matchmaking_id?: string | null;
  controle_run_id?: string | null;
  partij_nr?: string | number | null;
  toernooi_code?: string | null;
  hoek?: string | null;
  fighter_id?: string | null;
  va_nummer?: string | number | null;
  regel?: string | null;
  rule?: string | null;
  regel_code?: string | null;
  rule_code?: string | null;
  resultaat?: string | null;
  severity?: string | null;
  boodschap?: string | null;
  melding?: string | null;
  review_status?: string | null;
  actie_status?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

const MELDING_RESULT_PRIORITY: Record<string, number> = {
  VERBOD: 1,
  DISPENSATIE: 2,
  AFKEUR: 3,
  ACTIE: 4,
  "LET OP": 5,
  LET_OP: 5,
  INFO: 6,
  OK: 99,
};

function normalizeResultaat(v: any) {
  const raw = safe(v, "").toUpperCase().replace(/\s+/g, " ").trim();
  if (!raw) return "MELDING";
  if (raw === "LET_OP") return "LET OP";
  return raw;
}

function meldingPriority(row: ControleMeldingRow) {
  const resultaat = normalizeResultaat(row?.resultaat || row?.severity);
  return MELDING_RESULT_PRIORITY[resultaat] ?? 50;
}

function isApprovedMelding(row: ControleMeldingRow) {
  const review = normalizeText(row?.review_status);
  const actie = normalizeText(row?.actie_status);

  return (
    review.includes("goedgekeurd") ||
    review.includes("approved") ||
    review === "akkoord" ||
    actie.includes("goedgekeurd") ||
    actie.includes("approved") ||
    actie === "akkoord"
  );
}

function isLicentieMelding(row: ControleMeldingRow) {
  const text = normalizeText(
    [
      row?.regel,
      row?.rule,
      row?.regel_code,
      row?.rule_code,
      row?.boodschap,
      row?.melding,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return (
    text.includes("licentie") ||
    text.includes("license") ||
    text.includes("fightlicentie")
  );
}

function isKeurmerkMelding(row: ControleMeldingRow) {
  const text = normalizeText(
    [
      row?.regel,
      row?.rule,
      row?.regel_code,
      row?.rule_code,
      row?.boodschap,
      row?.melding,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return text.includes("keurmerk");
}

function formatDateNl(v: any) {
  const d = parseDateOnly(v);
  if (!d) return safe(v, "");

  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = String(d.getUTCFullYear());

  return `${day}-${month}-${year}`;
}

function getSideFromHoek(v: any): "rood" | "blauw" | null {
  const h = normalizeText(v);
  if (h.includes("rood") || h === "r") return "rood";
  if (h.includes("blauw") || h === "b") return "blauw";
  return null;
}

function getContextForMelding(
  row: ControleMeldingRow,
  ctxList: any[],
): any | null {
  const partijKey = meldingPartijKey(row);
  const va = onlyDigits(pickFirst(row?.va_nummer, row?.fighter_id));

  const samePartij = (ctx: any) => contextPartijKey(ctx) === partijKey;

  if (va) {
    const byVa = ctxList.find(
      (ctx) =>
        samePartij(ctx) &&
        (getVa(ctx, "rood") === va || getVa(ctx, "blauw") === va),
    );
    if (byVa) return byVa;
  }

  return ctxList.find(samePartij) ?? null;
}

function pickKeurmerkEinddatumFromObject(
  obj: any,
  side: "rood" | "blauw" | null = null,
) {
  if (!obj) return "";

  const raw = rawJsonObject(obj);
  const allObjects = [
    obj,
    raw,
    obj?.extra,
    obj?.metadata,
    obj?.details,
    obj?.raw_json,
  ]
    .filter(Boolean)
    .map((value) =>
      typeof value === "string" ? rawJsonObject({ raw_json: value }) : value,
    );

  const sidePrefix = side ? `${side}_` : "";

  const directNames = side
    ? [
        `${side}_keurmerk_einddatum`,
        `${side}_keurmerk_einddatum_sportschool`,
        `${side}_sportschool_keurmerk_einddatum`,
        `${side}_keurmerk_geldig_tot`,
        `${side}_gym_keurmerk_einddatum`,
        `${side}_keurmerk_tot`,
        `${side}_keurmerk_until`,
        `${side}_keurmerk_valid_until`,
      ]
    : [
        "keurmerk_einddatum",
        "keurmerk_einddatum_sportschool",
        "sportschool_keurmerk_einddatum",
        "keurmerk_geldig_tot",
        "gym_keurmerk_einddatum",
        "keurmerk_tot",
        "keurmerk_until",
        "keurmerk_valid_until",
        "einde_keurmerk",
        "einddatum_keurmerk",
        "geldig_tot",
        "valid_until",
      ];

  for (const source of allObjects) {
    const direct = pickFirst(...directNames.map((name) => source?.[name]));
    if (direct) return direct;
  }

  for (const source of allObjects) {
    for (const [key, value] of Object.entries(source ?? {})) {
      if (!value) continue;
      const k = normalizeText(key).replace(/[-\s]+/g, "_");
      const isSideMatch =
        !side || k.startsWith(sidePrefix) || k.includes(`_${sidePrefix}`);
      const isKeurmerkDate =
        k.includes("keurmerk") &&
        (k.includes("eind") ||
          k.includes("tot") ||
          k.includes("geldig") ||
          k.includes("valid") ||
          k.includes("until")) &&
        (k.includes("datum") ||
          k.includes("date") ||
          k.includes("tot") ||
          k.includes("until"));

      if (isSideMatch && isKeurmerkDate) return value;
    }
  }

  return "";
}

function getKeurmerkEinddatumVoorExcel(
  melding: ControleMeldingRow,
  ctxList: any[] = [],
) {
  if (!isKeurmerkMelding(melding)) return "";

  const side = getSideFromHoek(melding?.hoek);
  const direct = pickKeurmerkEinddatumFromObject(melding, side);
  if (direct) return formatDateNl(direct);

  const ctx = getContextForMelding(melding, ctxList);
  const fromCtx = pickKeurmerkEinddatumFromObject(ctx, side);
  return formatDateNl(fromCtx);
}

function getMeldingTekstVoorExcel(
  melding: ControleMeldingRow,
  ctxList: any[] = [],
) {
  const tekst = safe(pickFirst(melding?.boodschap, melding?.melding), "");
  if (!tekst || !isKeurmerkMelding(melding)) return tekst;

  // Als de datum al in de melding staat, niets dubbel toevoegen.
  if (
    /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/.test(tekst) ||
    /\b\d{4}-\d{2}-\d{2}\b/.test(tekst)
  ) {
    return tekst;
  }

  const formatted = getKeurmerkEinddatumVoorExcel(melding, ctxList);

  return formatted ? `${tekst} (einde keurmerk: ${formatted})` : tekst;
}

function meldingPartijKey(row: ControleMeldingRow) {
  const toernooi = safe(row?.toernooi_code, "");
  if (toernooi) return toernooi;

  const partij = safe(row?.partij_nr, "");
  if (partij && partij !== "0") return partij;

  return "-";
}

function sortPartijLabel(a: string, b: string) {
  const an = Number(String(a).replace(/[^\d.-]/g, ""));
  const bn = Number(String(b).replace(/[^\d.-]/g, ""));
  const aIsT = /^t/i.test(a);
  const bIsT = /^t/i.test(b);

  if (aIsT && !bIsT) return 1;
  if (!aIsT && bIsT) return -1;
  if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
  return String(a).localeCompare(String(b), "nl", { numeric: true });
}

function openMeldingen(meldingen: ControleMeldingRow[]) {
  return (meldingen ?? [])
    .filter((m) => normalizeResultaat(m?.resultaat) !== "OK")
    .filter((m) => !isApprovedMelding(m))
    .filter((m) => !isLicentieMelding(m));
}

function getMeldingenByPartij(meldingen: ControleMeldingRow[]) {
  const grouped = new Map<string, ControleMeldingRow[]>();

  for (const melding of openMeldingen(meldingen)) {
    const key = meldingPartijKey(melding);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(melding);
  }

  return grouped;
}

function getMeldingenAnchorRows(meldingen: ControleMeldingRow[]) {
  const grouped = getMeldingenByPartij(meldingen);
  const anchorRows = new Map<string, number>();
  const partijLabels = Array.from(grouped.keys()).sort(sortPartijLabel);

  let rowNr = 2;
  for (const partij of partijLabels) {
    const items = grouped.get(partij) ?? [];
    anchorRows.set(partij, rowNr);
    rowNr += 1 + items.length;
  }

  return anchorRows;
}

function contextPartijKey(ctx: any) {
  const toernooi = safe(
    pickFirst(
      ctx?.toernooi_code,
      ctx?.toernooicode,
      rawJsonObject(ctx)?.toernooi_code,
    ),
    "",
  );
  if (toernooi) return toernooi;

  const partij = safe(ctx?.partij_nr, "");
  if (partij && partij !== "0") return partij;

  return "-";
}

function highestMeldingForPartij(items: ControleMeldingRow[]) {
  const sorted = [...(items ?? [])].sort(
    (a, b) => meldingPriority(a) - meldingPriority(b),
  );
  return sorted[0] ?? null;
}

function meldingFillArgb(resultaat: string) {
  const r = normalizeResultaat(resultaat);
  if (r === "VERBOD") return "FFFFC7CE";
  if (r === "DISPENSATIE") return "FFFFD966";
  if (r === "AFKEUR") return "FFF4B183";
  if (r === "ACTIE") return "FFFFE699";
  if (r === "LET OP" || r === "INFO") return "FFDDEBF7";
  return "FFE2F0D9";
}

function applyMeldingHighlightToOfficialRow(
  row: ExcelJS.Row,
  partij: string,
  items: ControleMeldingRow[],
  anchorRows: Map<string, number>,
) {
  if (!items?.length) return;

  const top = highestMeldingForPartij(items);
  const status = normalizeResultaat(
    top?.resultaat || top?.severity || "MELDING",
  );
  const fillArgb = meldingFillArgb(status);

  for (let c = 1; c <= 20; c++) {
    const cell = row.getCell(c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: fillArgb },
    } as any;
  }

  const count = items.length;
  const anchor = anchorRows.get(partij) ?? 1;
  row.getCell(20).value = {
    text: `${status} (${count})`,
    hyperlink: `#'meldingen'!A${anchor}`,
  } as any;
  row.getCell(20).font = {
    name: "Calibri",
    size: 11,
    bold: true,
    underline: true,
    color: { argb: "FF0563C1" },
  };
  row.getCell(20).alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
}

function createMeldingenSheet(
  wb: ExcelJS.Workbook,
  meldingen: ControleMeldingRow[],
  ctxList: any[] = [],
) {
  const visibleMeldingen = openMeldingen(meldingen);

  const ws = wb.addWorksheet("meldingen");

  ws.columns = [
    { header: "Partij", key: "partij", width: 20 },
    { header: "Status", key: "status", width: 20 },
    { header: "Hoek", key: "hoek", width: 18 },
    { header: "Regel", key: "regel", width: 46 },
    { header: "Code", key: "code", width: 38 },
    { header: "Melding", key: "melding", width: 150 },
  ];

  ws.views = [{ state: "frozen", ySplit: 1, showGridLines: true }];
  ws.properties.defaultRowHeight = 30;

  const header = ws.getRow(1);
  header.height = 32;
  header.eachCell((cell) => {
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF404040" },
    } as any;
    cell.border = borderThin();
  });
  header.commit();

  if (!visibleMeldingen.length) {
    const row = ws.getRow(2);
    row.getCell(1).value = "Geen open meldingen gevonden";
    ws.mergeCells("A2:F2");
    row.getCell(1).font = {
      name: "Calibri",
      italic: true,
      color: { argb: "FF666666" },
    };
    row.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    row.commit();
    return;
  }

  const grouped = getMeldingenByPartij(meldingen);
  const partijLabels = Array.from(grouped.keys()).sort(sortPartijLabel);
  let rowNr = 2;

  for (const partij of partijLabels) {
    const items = (grouped.get(partij) ?? []).sort((a, b) => {
      const prio = meldingPriority(a) - meldingPriority(b);
      if (prio !== 0) return prio;
      return safe(a?.hoek, "").localeCompare(safe(b?.hoek, ""), "nl");
    });

    const groupRow = ws.getRow(rowNr++);
    groupRow.getCell(1).value = /^t/i.test(partij)
      ? `Toernooi ${partij}`
      : `Partij ${partij}`;
    ws.mergeCells(`A${groupRow.number}:F${groupRow.number}`);
    groupRow.getCell(1).font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    groupRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    groupRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF808080" },
    } as any;
    groupRow.getCell(1).border = borderThin();
    groupRow.height = 28;
    groupRow.commit();

    for (const melding of items) {
      const row = ws.getRow(rowNr++);
      row.getCell(1).value = partij;
      row.getCell(2).value = normalizeResultaat(melding?.resultaat);
      row.getCell(3).value = safe(melding?.hoek, "");
      row.getCell(4).value = safe(pickFirst(melding?.regel, melding?.rule), "");
      row.getCell(5).value = safe(
        pickFirst(melding?.regel_code, melding?.rule_code),
        "",
      );
      row.getCell(6).value = getMeldingTekstVoorExcel(melding, ctxList);

      const status = normalizeResultaat(
        melding?.resultaat || melding?.severity || "MELDING",
      );
      const fillArgb = meldingFillArgb(status);

      for (let c = 1; c <= 6; c++) {
        const cell = row.getCell(c);
        cell.font = {
          name: "Calibri",
          size: 12,
          bold: c === 2,
          color: { argb: "FF000000" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: fillArgb },
        } as any;
        cell.alignment = {
          vertical: "top",
          horizontal: [1, 2, 3].includes(c) ? "center" : "left",
          wrapText: true,
        };
        cell.border = borderThin();
      }

      const meldingText = getMeldingTekstVoorExcel(melding, ctxList);
      const regelText = safe(pickFirst(melding?.regel, melding?.rule), "");
      const codeText = safe(
        pickFirst(melding?.regel_code, melding?.rule_code),
        "",
      );
      const longestText = Math.max(
        meldingText.length,
        regelText.length,
        codeText.length,
      );
      const extraHeight = Math.min(120, Math.ceil(longestText / 90) * 18);
      row.height = Math.max(70, 34 + extraHeight);
      row.commit();
    }
  }
}

function isToernooiContext(ctx: any) {
  const extra = rawJsonObject(ctx);
  const code = pickFirst(
    ctx?.toernooi_code,
    ctx?.toernooicode,
    extra?.toernooi_code,
    extra?.toernooicode,
  );

  const partij = safe(ctx?.partij_nr, "").toUpperCase();

  return Boolean(
    ctx?.is_toernooi === true ||
    ctx?.is_toernooi === "true" ||
    code ||
    partij.startsWith("T"),
  );
}

function getToernooiCode(ctx: any) {
  const extra = rawJsonObject(ctx);
  return safe(
    pickFirst(
      ctx?.toernooi_code,
      ctx?.toernooicode,
      extra?.toernooi_code,
      extra?.toernooicode,
      ctx?.partij_nr,
    ),
    "Toernooi",
  );
}

function createToernooiSheet(
  wb: ExcelJS.Workbook,
  ctxList: any[],
  eventDateRaw: any,
  uitslagenByVa: Map<string, UitslagRow[]>,
) {
  const toernooiRows = ctxList.filter(isToernooiContext);
  if (!toernooiRows.length) return;

  const ws = wb.addWorksheet("toernooien");

  ws.columns = [
    { header: "Toernooi", key: "toernooi", width: 12 },
    { header: "Discipline", key: "discipline", width: 18 },
    { header: "Klasse", key: "klasse", width: 16 },
    { header: "Max KG", key: "max_kg", width: 12 },
    { header: "VA nr", key: "va", width: 12 },
    { header: "Naam", key: "naam", width: 28 },
    { header: "Fightlicentie", key: "licentie", width: 14 },
    { header: "Sportschool", key: "gym", width: 28 },
    { header: "Record", key: "record", width: 18 },
    { header: "Gewicht", key: "gewicht", width: 12 },
    { header: "Lftd", key: "leeftijd", width: 12 },
    { header: "Ronde tijden", key: "ronde_tijden", width: 16 },
  ];

  ws.views = [{ state: "frozen", ySplit: 1, showGridLines: true }];

  const header = ws.getRow(1);
  header.height = 32;
  header.eachCell((cell) => {
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF404040" },
    } as any;
    cell.border = borderThin();
  });
  header.commit();

  const seen = new Set<string>();
  let rowNr = 2;

  for (const ctx of toernooiRows) {
    const toernooi = getToernooiCode(ctx);
    const discipline = getDiscipline(ctx);
    const klasse = getKlasse(ctx);
    const maxKg = getMaxKg(ctx);
    const rondeTijden = getRondeTijden(ctx, eventDateRaw);

    const fillArgb = "FFF2F2F2";

    for (const side of ["rood", "blauw"] as const) {
      const va = getVa(ctx, side);
      const naam = getCurrentNaam(ctx, side);
      const gym = getCurrentGym(ctx, side);

      if (!va && !naam) continue;

      const dedupeKey = [
        toernooi,
        va || normalizeText(naam),
        normalizeText(gym),
      ].join("|");
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const row = ws.getRow(rowNr++);
      row.getCell(1).value = toernooi;
      row.getCell(2).value = discipline;
      row.getCell(3).value = klasse;
      row.getCell(4).value = maxKg;
      row.getCell(5).value = numberValueOrBlank(va);
      row.getCell(6).value = naam;
      row.getCell(7).value = getLicentie(ctx, side);
      row.getCell(8).value = gym;
      row.getCell(9).value = recordValueForExcel(
        getRecordOfErvaring(ctx, side, uitslagenByVa),
      );
      row.getCell(10).value = getGewicht(ctx, side);
      row.getCell(11).value = getLeeftijd(ctx, side, eventDateRaw);
      row.getCell(12).value = rondeTijden;

      for (let c = 1; c <= 12; c++) {
        const cell = row.getCell(c);
        cell.font = {
          name: "Calibri",
          size: 12,
          bold: c === 2,
          color: { argb: "FF000000" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: fillArgb },
        } as any;
        cell.alignment = {
          vertical: "middle",
          horizontal: [1, 2, 3, 4, 5, 7, 10, 11, 12].includes(c)
            ? "center"
            : "left",
          wrapText: true,
        };
        cell.border = borderThin();
      }

      if (getLicentie(ctx, side) === "Nee") {
        applyNoLicenseCellStyle(row.getCell(7));
      }

      row.height = 21;
      row.commit();
    }
  }

  if (rowNr === 2) {
    const row = ws.getRow(2);
    row.getCell(1).value = "Geen toernooi-deelnemers gevonden";
    ws.mergeCells("A2:L2");
    row.getCell(1).font = {
      name: "Calibri",
      italic: true,
      color: { argb: "FF666666" },
    };
    row.commit();
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const matchmaking_id = String(
      url.searchParams.get("matchmaking_id") ?? "",
    ).trim();

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt" },
        { status: 400 },
      );
    }

    const run = await getLatestRun(matchmaking_id);
    if (!run?.id) {
      return NextResponse.json(
        { error: "Geen controle_run gevonden voor deze matchmaking_id" },
        { status: 400 },
      );
    }

    const eventMeta = await getEventMeta(matchmaking_id);

    const { data: ctxRows, error: ctxErr } = await supabase
      .from("controle_bout_context")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", run.id)
      .order("partij_nr", { ascending: true });

    if (ctxErr) throw ctxErr;

    const ctxList = (ctxRows ?? []) as any[];
    if (!ctxList.length) {
      return NextResponse.json(
        {
          error: "Geen controle_bout_context gevonden voor deze matchmaking_id",
        },
        { status: 400 },
      );
    }

    const allVaNumbers = Array.from(
      new Set(
        ctxList
          .flatMap((p) => [getVa(p, "rood"), getVa(p, "blauw")])
          .filter(Boolean),
      ),
    );

    const uitslagenByVa = await loadUitslagenByVa(allVaNumbers);

    const { data: meldingRows, error: meldingErr } = await supabase
      .from("controle_resultaten")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", run.id);

    if (meldingErr) throw meldingErr;

    const meldingen = (meldingRows ?? []) as ControleMeldingRow[];

    const wb = new ExcelJS.Workbook();
    wb.creator = "FightSupport";
    wb.created = new Date();

    const ws = wb.addWorksheet("official");
    applySheetLayout(ws);

    ws.getCell("A1").value = "Nr.";
    ws.getCell("B1").value = "VA nr";
    ws.getCell("C1").value = "Naam";
    ws.getCell("D1").value = "Fightlicentie";
    ws.getCell("E1").value = "Gym:";
    ws.getCell("F1").value = "Record";
    ws.getCell("G1").value = "Gewicht";
    ws.getCell("H1").value = "Lftd";
    ws.getCell("I1").value = "VS";
    ws.getCell("J1").value = "VA nr";
    ws.getCell("K1").value = "Naam";
    ws.getCell("L1").value = "Fightlicentie";
    ws.getCell("M1").value = "Gym:";
    ws.getCell("N1").value = "Record";
    ws.getCell("O1").value = "Lftd";
    ws.getCell("P1").value = "Gewicht";
    ws.getCell("Q1").value = "Klasse";
    ws.getCell("R1").value = "Max KG";
    ws.getCell("S1").value = "Ronde tijden";
    ws.getCell("T1").value = "Meldingen";

    styleHeaderRow(ws);

    const eventDateRaw = eventMeta?.datum ?? null;
    const meldingenByPartij = getMeldingenByPartij(meldingen);
    const meldingAnchorRows = getMeldingenAnchorRows(meldingen);

    let outRowNr = 2;

    for (const p of ctxList) {
      const row = ws.getRow(outRowNr++);

      row.getCell(1).value = p.partij_nr ?? outRowNr - 2;

      row.getCell(2).value = numberValueOrBlank(getVa(p, "rood"));
      row.getCell(3).value = getCurrentNaam(p, "rood");
      row.getCell(4).value = getLicentie(p, "rood");
      row.getCell(5).value = getCurrentGym(p, "rood");
      row.getCell(6).value = recordValueForExcel(
        getRecordOfErvaring(p, "rood", uitslagenByVa),
      );
      row.getCell(7).value = getGewicht(p, "rood");
      row.getCell(8).value = getLeeftijd(p, "rood", eventDateRaw);

      row.getCell(9).value = "VS";

      row.getCell(10).value = numberValueOrBlank(getVa(p, "blauw"));
      row.getCell(11).value = getCurrentNaam(p, "blauw");
      row.getCell(12).value = getLicentie(p, "blauw");
      row.getCell(13).value = getCurrentGym(p, "blauw");
      row.getCell(14).value = recordValueForExcel(
        getRecordOfErvaring(p, "blauw", uitslagenByVa),
      );
      row.getCell(15).value = getLeeftijd(p, "blauw", eventDateRaw);
      row.getCell(16).value = getGewicht(p, "blauw");
      row.getCell(17).value = getKlasse(p);
      row.getCell(18).value = getMaxKg(p);
      row.getCell(19).value = getRondeTijden(p, eventDateRaw);

      styleDataRow(row);

      const partijKey = contextPartijKey(p);
      applyMeldingHighlightToOfficialRow(
        row,
        partijKey,
        meldingenByPartij.get(partijKey) ?? [],
        meldingAnchorRows,
      );

      if (row.getCell(4).value === "Nee") {
        applyNoLicenseCellStyle(row.getCell(4));
      }

      if (row.getCell(12).value === "Nee") {
        applyNoLicenseCellStyle(row.getCell(12));
      }

      row.commit();
    }

    createToernooiSheet(wb, ctxList, eventDateRaw, uitslagenByVa);
    createMeldingenSheet(wb, meldingen, ctxList);

    const cleanEventName = safe(eventMeta?.naam, "Official_Matchmaking")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "_");

    const dateForFile = fmtYmdForFilename(eventMeta?.datum);
    const filename = `Official_${cleanEventName}_${dateForFile}.xlsx`;

    const outBuf = await wb.xlsx.writeBuffer();

    return new Response(outBuf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("❌ official excel export error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout" },
      { status: 500 },
    );
  }
}

// FIX: 95+ blijft 95+ en wordt nooit als -95 opgeslagen.
