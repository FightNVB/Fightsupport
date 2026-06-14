// app/api/rapport/jury-lineup-excel/route.ts
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function s(v: any) {
  return String(v ?? "").trim();
}

function parseRawJson(v: any): any {
  if (!v) return {};
  if (typeof v === "object") return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return {};
  }
}

function isTitelpartij(b: any): boolean {
  const raw = parseRawJson(b.raw_json);
  const text = [
    b.titelpartij,
    b.is_titelpartij,
    b.titel_partij,
    b.title_fight,
    b.opmerking,
    b.bijzonderheden,
    raw.titelpartij,
    raw.is_titelpartij,
    raw.titel_partij,
    raw.title_fight,
    raw.opmerking,
    raw.bijzonderheden,
  ]
    .map(s)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("titel") ||
    text.includes("title fight") ||
    text.includes("championship")
  );
}

function getRondeTijden({
  discipline,
  klasse,
  rood_leeftijd,
  blauw_leeftijd,
  titelpartij,
}: any): string {
  const d = s(discipline).toUpperCase();
  const k = s(klasse).toUpperCase();

  const rAge = Number(rood_leeftijd ?? 0);
  const bAge = Number(blauw_leeftijd ?? 0);

  if (d.includes("MMA")) {
    if (k.includes("JEUGD") || k.includes("J")) return "2x3 min";
    if (k.includes("PRO")) return titelpartij ? "5x5 min" : "3x5 min";
    return titelpartij ? "5x3 min" : "3x3 min";
  }

  if (titelpartij) return "5 rondes";

  // Kickboksen jeugd/J/J+: alleen als beide vechters 16 jaar of ouder zijn 3x1,5 minuut.
  // Zodra één van beide vechters jonger dan 16 is, blijft het 3x1 minuut.
  if (k.includes("J") || k.includes("JEUGD")) {
    if (rAge >= 16 && bAge >= 16) return "3x1.5 min";
    return "3x1 min";
  }

  if (k.includes("R")) return "3x1 min";
  if (k.includes("N") || k.includes("NIEUWELING") || k.includes("NEWCOMER")) {
    return "3x1.5 min";
  }

  if (k.includes("C")) return "3x2 min";
  if (k.includes("B")) return "3x3 min";
  if (k.includes("A")) return "3x3 min";

  return "";
}

function getLeeftijdVoorRondetijd(b: any, side: "rood" | "blauw") {
  return (
    b?.[`${side}_leeftijd_event`] ??
    b?.[`${side}_leeftijd`] ??
    b?.[`${side}_leeftijd_mm`] ??
    b?.[`${side}_leeftijd_fp`] ??
    b?.[`${side}_age`] ??
    parseRawJson(b?.raw_json)?.[`${side}_leeftijd_event`] ??
    parseRawJson(b?.raw_json)?.[`${side}_leeftijd`] ??
    0
  );
}

function isToernooiBout(b: any): boolean {
  const raw = parseRawJson(b.raw_json);
  return Boolean(
    b.is_toernooi ||
    b.toernooi_code ||
    raw.toernooi_code ||
    s(b.partij_nr).toUpperCase().startsWith("T"),
  );
}

function getToernooiCode(b: any): string {
  const raw = parseRawJson(b.raw_json);
  return s(b.toernooi_code || raw.toernooi_code || b.partij_nr);
}

function toernooiFighterKey(
  toernooiCode: string,
  naam: any,
  gym: any,
  va: any,
): string {
  const vaClean = s(va).replace(/\D/g, "");
  if (vaClean) return `${s(toernooiCode).toUpperCase()}::VA::${vaClean}`;

  return `${s(toernooiCode).toUpperCase()}::NAME::${s(naam).toLowerCase()}::${s(gym).toLowerCase()}`;
}

function norm(v: unknown) {
  return s(v).toLowerCase();
}

function upper(v: unknown) {
  return s(v).toUpperCase();
}

function n(v: unknown, fallback = 0) {
  const x = Number(v ?? fallback);
  return Number.isFinite(x) ? x : fallback;
}

function vaNumberOrBlank(v: unknown): number | string {
  const digits = s(v).replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return "";
  const value = Number(digits);
  return Number.isFinite(value) ? value : "";
}

function cloneExcelStyle(style: Partial<ExcelJS.Style> | undefined) {
  return JSON.parse(JSON.stringify(style ?? {}));
}

function clearTemplateData(ws: ExcelJS.Worksheet, startRow = 2) {
  const last = ws.rowCount;
  if (last >= startRow) {
    ws.spliceRows(startRow, last - startRow + 1);
  }
}


function headerText(ws: ExcelJS.Worksheet, col: number): string {
  const value = ws.getRow(1).getCell(col).value;
  if (value == null) return "";
  if (typeof value === "object" && "richText" in (value as any)) {
    return String((value as any).richText?.map((x: any) => x.text).join("") ?? "")
      .trim()
      .toLowerCase();
  }
  return String(value).trim().toLowerCase();
}

function findHeaderColumn(
  ws: ExcelJS.Worksheet,
  predicate: (header: string) => boolean,
): number | null {
  const maxCol = Math.max(ws.columnCount || 0, 13);
  for (let col = 1; col <= maxCol; col += 1) {
    const h = headerText(ws, col);
    if (h && predicate(h)) return col;
  }
  return null;
}

function getLineupColumns(ws: ExcelJS.Worksheet) {
  const rondesCol =
    findHeaderColumn(
      ws,
      (h) =>
        (h.includes("ronde") || h.includes("rondes") || h.includes("tijd")) &&
        !h.includes("minpunt") &&
        !h.includes("min punt") &&
        !h.includes("minpunten"),
    ) ?? 12;

  const minpuntCol =
    findHeaderColumn(
      ws,
      (h) =>
        h.includes("minpunt") ||
        h.includes("min punt") ||
        h.includes("minpunten") ||
        h.includes("strafpunt") ||
        h.includes("straf punt"),
    ) ?? 13;

  const titelpartijCol = findHeaderColumn(
    ws,
    (h) => h.includes("titel") || h.includes("title"),
  );

  return { rondesCol, minpuntCol, titelpartijCol };
}

function applyTemplateRowStyle(
  ws: ExcelJS.Worksheet,
  rowNumber: number,
  templateStyles: Record<number, Partial<ExcelJS.Style>>,
  templateHeight: number | undefined,
  columns?: { rondesCol: number; minpuntCol: number; titelpartijCol: number | null },
) {
  const row = ws.getRow(rowNumber);
  if (templateHeight) row.height = templateHeight;

  for (let col = 1; col <= 13; col += 1) {
    const style = templateStyles[col];
    if (style) row.getCell(col).style = cloneExcelStyle(style);
  }
}

function setLineupCellValues(
  ws: ExcelJS.Worksheet,
  rowNumber: number,
  values: {
    partij_nr: string | number;
    discipline: any;
    klasse: any;
    rood_naam: any;
    rood_gym: any;
    rood_va: any;
    blauw_naam: any;
    blauw_gym: any;
    blauw_va: any;
    rondes: any;
    minpunt: any;
    titelpartij?: any;
    vs?: any;
  },
  templateStyles: Record<number, Partial<ExcelJS.Style>>,
  templateHeight: number | undefined,
) {
  applyTemplateRowStyle(ws, rowNumber, templateStyles, templateHeight);

  const row = ws.getRow(rowNumber);

  // Definitieve lineup volgt de template-koptekst voor de laatste kolommen.
  // Daardoor blijven rondetijden en minpunten goed staan, ook als de template
  // geen titelpartij-kolom heeft of kolommen anders gepositioneerd zijn.
  const lineupColumns = columns ?? getLineupColumns(ws);

  row.getCell(1).value = values.partij_nr;
  row.getCell(2).value = s(values.discipline);
  row.getCell(3).value = s(values.klasse);
  row.getCell(4).value = s(values.rood_naam);
  row.getCell(5).value = s(values.rood_gym);
  row.getCell(6).value = vaNumberOrBlank(values.rood_va);
  row.getCell(7).value = s(values.vs ?? "VS");
  row.getCell(8).value = s(values.blauw_naam);
  row.getCell(9).value = s(values.blauw_gym);
  row.getCell(10).value = vaNumberOrBlank(values.blauw_va);

  if (lineupColumns.titelpartijCol) {
    row.getCell(lineupColumns.titelpartijCol).value = s(values.titelpartij);
  }

  // Eerst rondetijden, daarna pas minpunten.
  row.getCell(lineupColumns.rondesCol).value = s(values.rondes);
  row.getCell(lineupColumns.minpuntCol).value = s(values.minpunt);

  // VA-kolommen als getal, zonder Excel-melding "getal opgeslagen als tekst".
  row.getCell(6).numFmt = "0";
  row.getCell(10).numFmt = "0";

  // Template blijft leidend, maar deze kolommen moeten gecentreerd blijven.
  [1, 3, 6, 7, 10, 11, 12, 13].forEach((col) => {
    row.getCell(col).alignment = {
      ...(row.getCell(col).alignment ?? {}),
      horizontal: "center",
      vertical: "middle",
    };
  });

  row.commit();
}

type ControleRow = {
  partij_nr: number | string | null;
  bout_id?: string | null;
  source_id: string | null;
  source_table: string | null;
  toernooi_code?: string | null;
  va_nummer?: string | number | null;
  toernooi_va_nummer?: string | number | null;
  fighter_id?: string | null;
  rule: string | null;
  rule_code: string | null;
  resultaat: string | null;
  severity?: string | null;
  actie_status: string | null;
  review_status?: string | null;
  hoek: string | null;
  boodschap?: string | null;
};

type PartyDecision = {
  blocked: boolean;
  blockedReasons: string[];
  roodMinpunten: number;
  blauwMinpunten: number;
  hasControle: boolean;
  roodWarning: boolean;
  blauwWarning: boolean;
  algemeneWarning: boolean;
  warningReasons: string[];
};

function isApprovedOverride(row: ControleRow) {
  const actieStatus = norm(row.actie_status);
  const reviewStatus = norm(row.review_status);
  return [actieStatus, reviewStatus].some((status) =>
    ["goedgekeurd", "approved", "akkoord", "ok"].includes(status),
  );
}

function isResolvedControleRow(row: ControleRow) {
  return (
    isApprovedOverride(row) ||
    norm(row.resultaat) === "ok" ||
    norm(row.resultaat) === "info" ||
    upper(row.rule_code) === "OK" ||
    upper(row.severity) === "INFO"
  );
}

function controleResolutionKey(row: ControleRow) {
  const partijNr = n(row.partij_nr, 0);
  const boutId = s(row.bout_id) || s(row.source_id);
  const toernooiCode = tournamentCode(row.toernooi_code);
  const va = normVa(row.toernooi_va_nummer) || normVa(row.va_nummer) || s(row.fighter_id);
  const ruleKey = upper(row.rule_code) || upper(row.rule) || upper((row as any).boodschap);
  const hoek = upper(row.hoek);

  if (toernooiCode && va) return `T:${toernooiCode}:${va}:R:${ruleKey}:H:${hoek}`;
  if (boutId) return `B:${boutId}:R:${ruleKey}:H:${hoek}`;
  if (partijNr) return `P:${partijNr}:R:${ruleKey}:H:${hoek}`;
  return `R:${ruleKey}:H:${hoek}`;
}

function activeControleRowsForDefinitieveLineup(rows: ControleRow[]) {
  const resolvedKeys = new Set<string>();

  for (const row of rows) {
    if (isResolvedControleRow(row)) {
      resolvedKeys.add(controleResolutionKey(row));
    }
  }

  return rows.filter((row) => {
    if (isResolvedControleRow(row)) return false;
    if (resolvedKeys.has(controleResolutionKey(row))) return false;
    return isLineupBlokkadeRow(row);
  });
}

function isAfkeur(row: ControleRow) {
  const resultaat = norm(row.resultaat);
  const ruleCode = upper(row.rule_code);
  return (
    resultaat === "afkeur" || resultaat === "afgekeurd" || ruleCode === "AFKEUR"
  );
}

function isDispensatie(row: ControleRow) {
  const rule = norm(row.rule);
  const code = upper(row.rule_code);
  return (
    rule.includes("dispensatie") ||
    code.includes("DISPENSATIE") ||
    code === "VERLEEND"
  );
}

function isDispensatieVerleend(row: ControleRow) {
  const result = upper(row.resultaat);
  const code = upper(row.rule_code);
  return (
    result === "VERLEEND" || code === "VERLEEND" || isApprovedOverride(row)
  );
}

function isInfo(row: ControleRow) {
  return norm(row.resultaat) === "info" || upper(row.severity) === "INFO";
}

function isOk(row: ControleRow) {
  return norm(row.resultaat) === "ok" || upper(row.rule_code) === "OK";
}

function isOpenReview(v: unknown) {
  const x = upper(v);
  return x === "OPEN" || x === "PENDING" || x === "WACHT" || x === "WACHTEND";
}

function hasVerbod(row: ControleRow) {
  const combined = `${upper(row.rule)} ${upper(row.rule_code)} ${upper(row.resultaat)} ${upper((row as any).boodschap)}`;
  return combined.includes("STARTVERBOD") || combined.includes("VERBOD");
}

function isHardNoRow(row: ControleRow) {
  const combined = `${upper(row.rule)} ${upper(row.rule_code)} ${upper(row.resultaat)} ${upper((row as any).boodschap)}`;

  // Zelfde basis als voorlopige lineup: alleen verbod/startverbod houdt een partij volledig tegen.
  // Licentie/keurmerk is geen harde blokkade voor de voorlopige set; die wordt pas hieronder
  // gebruikt als open melding om uit de definitieve jury-lineup te filteren.
  return combined.includes("STARTVERBOD") || combined.includes("VERBOD");
}


function isLicentieOfKeurmerkRow(row: ControleRow) {
  const combined = `${upper(row.rule)} ${upper(row.rule_code)} ${upper(row.resultaat)} ${upper((row as any).boodschap)}`;
  return (
    combined.includes("LICENTIE") ||
    combined.includes("KEURMERK") ||
    combined.includes("GEEN_LICENTIE") ||
    combined.includes("GEEN_KEURMERK")
  );
}

function isOpenLicentieOfKeurmerkRow(row: ControleRow) {
  if (!isLicentieOfKeurmerkRow(row)) return false;
  if (isResolvedControleRow(row)) return false;
  return true;
}

function warningHoek(row: ControleRow): "rood" | "blauw" | null {
  const hoek = norm(row.hoek);
  const combined = `${upper(row.rule)} ${upper(row.rule_code)} ${upper((row as any).boodschap)}`;
  if (hoek === "rood" || combined.includes("ROOD")) return "rood";
  if (hoek === "blauw" || combined.includes("BLAUW")) return "blauw";
  return null;
}

function isLineupBlokkadeRow(row: ControleRow) {
  if (isResolvedControleRow(row)) return false;

  // Definitieve/jury lineup en naar-uitslagen = voorlopige lineup minus ALLE open meldingen.
  // Alleen een echte minpunt-regel mag mee, want dat is een strafpunt en geen blokkade/melding.
  if (isActieMinpunt(row)) return false;

  return true;
}

function isActieMinpunt(row: ControleRow) {
  const resultaat = norm(row.resultaat);
  const code = upper(row.rule_code);
  const rule = norm(row.rule);
  const msg = norm((row as any).boodschap);
  return resultaat === "actie" && (rule.includes("minpunt") || code.includes("MINPUNT") || msg.includes("minpunt"));
}

function normVa(v: unknown) {
  const digits = s(v).replace(/\D/g, "").replace(/^0+/, "");
  return digits || s(v);
}

function tournamentCode(v: unknown) {
  return upper(v);
}

function rowTournamentKey(row: ControleRow) {
  const code = tournamentCode(row.toernooi_code);
  if (!code) return null;

  const id =
    normVa(row.toernooi_va_nummer) ||
    normVa(row.va_nummer) ||
    s(row.fighter_id) ||
    normVa(row.source_id);
  if (!id) return null;

  return `T:${code}:${id}`;
}

function rawTournamentKeys(row: any) {
  const code = tournamentCode(
    row.toernooi_code ?? parseRawJson(row.raw_json)?.toernooi_code,
  );
  if (!code) return [];

  const ids = [
    row.toernooi_va_nummer,
    row.va_nummer,
    row.va,
    row.fighter_va,
    row.vechter_va,
    row.fighter_id,
    row.rood_va,
    row.blauw_va,
    row.va_rood,
    row.va_blauw,
    row.rood_va_nummer,
    row.blauw_va_nummer,
    row.id,
  ]
    .map((x) => normVa(x) || s(x))
    .filter(Boolean);

  return Array.from(new Set(ids.map((id) => `T:${code}:${id}`)));
}

function minpuntHoek(row: ControleRow): "rood" | "blauw" | null {
  const code = upper(row.rule_code);
  const hoek = norm(row.hoek);

  if (hoek === "rood" || code.includes("ROOD")) return "rood";
  if (hoek === "blauw" || code.includes("BLAUW")) return "blauw";
  return null;
}

function rawRowKeys(row: any) {
  const keys = new Set<string>();
  const partijNr = n(row.partij_nr, 0);

  if (row.id) keys.add(`ID:${s(row.id)}`);
  if (row.bout_id) keys.add(`ID:${s(row.bout_id)}`);
  if (partijNr) keys.add(`P:${partijNr}`);

  return Array.from(keys);
}

function controleRowKeys(row: ControleRow) {
  const keys = new Set<string>();
  const partijNr = n(row.partij_nr, 0);
  const sourceTable = norm(row.source_table);

  // Weegstation-regels en minpunten koppelen alleen via partij_nr.
  // source_id is bij weigh_in_bouts niet hetzelfde als matchmaking_bouts_raw.id.
  // Dit voorkomt dubbele minpunten via ID én P.
  if (sourceTable === "weigh_in_bouts" || norm(row.rule).startsWith("weegstation") || isActieMinpunt(row)) {
    if (partijNr) keys.add(`P:${partijNr}`);
    return Array.from(keys);
  }

  if (row.bout_id) keys.add(`ID:${s(row.bout_id)}`);
  if (row.source_id) keys.add(`ID:${s(row.source_id)}`);

  // Belangrijk: harde blokkerende regels moeten altijd ook via partij_nr gekoppeld worden.
  // Anders kan een sportschool zonder keurmerk/licentie/startverbod toch door als source_id
  // niet exact matcht met matchmaking_bouts_raw.id.
  if (partijNr) keys.add(`P:${partijNr}`);

  return Array.from(keys);
}

function mergeDecision(target: PartyDecision, source: PartyDecision) {
  target.blocked = target.blocked || source.blocked;
  target.hasControle = target.hasControle || source.hasControle;
  target.roodMinpunten += source.roodMinpunten;
  target.blauwMinpunten += source.blauwMinpunten;
  target.roodWarning = target.roodWarning || source.roodWarning;
  target.blauwWarning = target.blauwWarning || source.blauwWarning;
  target.algemeneWarning = target.algemeneWarning || source.algemeneWarning;
  target.blockedReasons.push(...source.blockedReasons);
  target.warningReasons.push(...source.warningReasons);
}

function addWarningReason(decision: PartyDecision, row: ControleRow, fallback = "Open melding") {
  const msg = s((row as any).boodschap) || s(row.rule) || s(row.rule_code) || fallback;
  const key = msg.replace(/\s+/g, " ").trim().toLowerCase();
  if (!key) return;
  const exists = decision.warningReasons.some(
    (x) => x.replace(/\s+/g, " ").trim().toLowerCase() === key,
  );
  if (!exists) decision.warningReasons.push(msg);
}

function applyControleRowToDecision(row: ControleRow, decision: PartyDecision) {
  decision.hasControle = true;

  // Goedgekeurde/naar OK/INFO gezette regels zijn afgehandeld en mogen niet meer als melding meetellen.
  if (isResolvedControleRow(row)) return;

  // Minpunt is geen open melding voor lineup-filtering; dit gaat alleen naar de kolom Min punt.
  if (isActieMinpunt(row)) {
    const hoek = minpuntHoek(row);
    if (hoek === "rood") decision.roodMinpunten += 1;
    if (hoek === "blauw") decision.blauwMinpunten += 1;
    return;
  }

  // Iedere andere open regel is een melding: zichtbaar in voorlopige lineup en reden om
  // de partij uit definitieve/jury lineup en naar-uitslagen te houden.
  const hoek = warningHoek(row);
  if (hoek === "rood") decision.roodWarning = true;
  else if (hoek === "blauw") decision.blauwWarning = true;
  else decision.algemeneWarning = true;

  addWarningReason(decision, row, "Open melding");

  if (isHardNoRow(row) || hasVerbod(row)) {
    decision.blocked = true;
    decision.blockedReasons.push("Verbod/startverbod aanwezig");
  }
}
function buildDecisions(rows: ControleRow[]) {
  const byKey = new Map<string, PartyDecision>();
  const byTournamentFighter = new Map<string, PartyDecision>();

  function newDecision(): PartyDecision {
    return {
      blocked: false,
      blockedReasons: [],
      roodMinpunten: 0,
      blauwMinpunten: 0,
      hasControle: false,
      roodWarning: false,
      blauwWarning: false,
      algemeneWarning: false,
      warningReasons: [],
    };
  }

  function ensureKey(key: string) {
    const current = byKey.get(key);
    if (current) return current;
    const next = newDecision();
    byKey.set(key, next);
    return next;
  }

  function ensureTournamentFighter(key: string) {
    const current = byTournamentFighter.get(key);
    if (current) return current;
    const next = newDecision();
    byTournamentFighter.set(key, next);
    return next;
  }

  for (const row of rows) {
    const tKey = rowTournamentKey(row);
    if (tKey) {
      applyControleRowToDecision(row, ensureTournamentFighter(tKey));
      continue;
    }

    const keys = controleRowKeys(row);
    if (!keys.length) continue;

    for (const key of keys) {
      applyControleRowToDecision(row, ensureKey(key));
    }
  }

  return { byKey, byTournamentFighter, newDecision };
}

function rawRowDecision(
  row: any,
  decisions: ReturnType<typeof buildDecisions>,
) {
  const partijNr = n(row.partij_nr, 0);

  if (
    partijNr === 0 ||
    tournamentCode(
      row.toernooi_code ?? parseRawJson(row.raw_json)?.toernooi_code,
    )
  ) {
    const keys = rawTournamentKeys(row);
    const merged = decisions.newDecision();
    for (const key of keys) {
      const found = decisions.byTournamentFighter.get(key);
      if (found) mergeDecision(merged, found);
    }
    return merged.hasControle ? merged : null;
  }

  const merged = decisions.newDecision();
  for (const key of rawRowKeys(row)) {
    const found = decisions.byKey.get(key);
    if (found) mergeDecision(merged, found);
  }

  return merged.hasControle ? merged : null;
}

function hasValue(v: any): boolean {
  return v != null && String(v).trim() !== "";
}

function licenseValueToKnown(v: any): boolean {
  if (v == null) return false;
  if (typeof v === "boolean" || typeof v === "number") return true;
  return String(v).trim() !== "";
}

function hasScrapeInfoForSide(row: any, side: "rood" | "blauw") {
  return (
    hasValue(row?.[`${side}_naam_fp`]) ||
    hasValue(row?.[`${side}_geboortedatum_fp`]) ||
    hasValue(row?.[`${side}_geboortedatum`]) ||
    licenseValueToKnown(
      row?.[`${side}_licentie`] ??
        row?.[`${side}_licentie_ok`] ??
        row?.[`${side}_licentie_geldig`] ??
        row?.[`${side}_licentie_status`] ??
        row?.[`${side}_licentie_fp`] ??
        row?.[`${side}_licentie_ja_nee`],
    ) ||
    hasValue(row?.[`${side}_totaal_wedstrijden`]) ||
    hasValue(row?.[`${side}_nulmeting_totaal`])
  );
}

function isContextCompleet(row: any): boolean {
  const roodVa =
    row?.rood_va_mm ?? row?.va_rood ?? row?.rood_va ?? row?.rood_va_nummer;
  const blauwVa =
    row?.blauw_va_mm ?? row?.va_blauw ?? row?.blauw_va ?? row?.blauw_va_nummer;
  const roodNaam = row?.rood_naam_fp ?? row?.rood_naam_mm ?? row?.rood_naam;
  const blauwNaam = row?.blauw_naam_fp ?? row?.blauw_naam_mm ?? row?.blauw_naam;

  return (
    hasValue(roodVa) &&
    hasValue(blauwVa) &&
    hasValue(roodNaam) &&
    hasValue(blauwNaam) &&
    hasScrapeInfoForSide(row, "rood") &&
    hasScrapeInfoForSide(row, "blauw")
  );
}

function rowStatusForUitslagen(row: any) {
  return norm(
    row?.eindstatus ??
      row?.weegstation_status ??
      row?.controle_status ??
      row?.status ??
      row?.resultaat ??
      parseRawJson(row?.raw_json)?.eindstatus ??
      parseRawJson(row?.raw_json)?.status,
  );
}

function isRowOkOrInfo(row: any) {
  const status = rowStatusForUitslagen(row);
  return ["ok", "info", "goedgekeurd", "approved", "akkoord"].includes(status);
}

function isEligibleForLineup(
  row: any,
  decisions: ReturnType<typeof buildDecisions>,
) {
  // Definitieve lineup = voorlopige lineup minus partijen met echte open meldingen.
  // Daarom niet opnieuw streng filteren op context/OK-status; alleen blokkades tellen.
  const decision = rawRowDecision(row, decisions);
  return !decision?.blocked;
}

function warningText(decision: PartyDecision | null) {
  if (!decision) return "";
  const seen = new Set<string>();
  const reasons: string[] = [];

  for (const reason of decision.warningReasons) {
    const clean = s(reason).replace(/\s+/g, " ").trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    reasons.push(clean);
  }

  return reasons.join(" | ");
}

function minpuntenFromDecision(
  b: any,
  decision: PartyDecision | null,
): { rood: number; blauw: number } {
  return {
    rood:
      n(
        b.rood_minpunten ??
          b.rood_min_punten ??
          b.rood_strafpunten ??
          b.gewicht_strafpunt_rood,
        0,
      ) + (decision?.roodMinpunten ?? 0),
    blauw:
      n(
        b.blauw_minpunten ??
          b.blauw_min_punten ??
          b.blauw_strafpunten ??
          b.gewicht_strafpunt_blauw,
        0,
      ) + (decision?.blauwMinpunten ?? 0),
  };
}

function getMinPuntForLineup(b: any, decision: PartyDecision | null): string {
  const mp = minpuntenFromDecision(b, decision);
  const parts = [];
  if (mp.rood > 0) parts.push(`Rood -${mp.rood}`);
  if (mp.blauw > 0) parts.push(`Blauw -${mp.blauw}`);
  return parts.join(" | ");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const matchmaking_id = searchParams.get("matchmaking_id");

  if (!matchmaking_id) {
    return NextResponse.json(
      { error: "matchmaking_id ontbreekt" },
      { status: 400 },
    );
  }

  const { data: rawBouts, error } = await supabase
    .from("matchmaking_bouts_raw")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .or("verwijderd.is.null,verwijderd.eq.false")
    .order("partij_nr", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: controleRows, error: controleErr } = await supabase
    .from("controle_resultaten")
    .select(
      "partij_nr,bout_id,source_id,source_table,toernooi_code,toernooi_va_nummer,va_nummer,fighter_id,rule,rule_code,resultaat,severity,actie_status,review_status,hoek,boodschap",
    )
    .eq("matchmaking_id", matchmaking_id);

  if (controleErr) {
    return NextResponse.json({ error: controleErr.message }, { status: 500 });
  }

  const activeControleRows = activeControleRowsForDefinitieveLineup(
    (controleRows ?? []) as ControleRow[],
  );
  const decisions = buildDecisions(activeControleRows);
  const bouts = (rawBouts ?? []).filter((b: any) => {
    if (!isEligibleForLineup(b, decisions)) return false;
    const decision = rawRowDecision(b, decisions);
    return !warningText(decision);
  });

  if (!bouts.length) {
    return NextResponse.json(
      {
        error:
          "Geen partijen geschikt voor jury-lineup. Alleen partijen met echte open meldingen of verbod/startverbod worden overgeslagen.",
        total_count: rawBouts?.length ?? 0,
        controle_count: controleRows?.length ?? 0,
      },
      { status: 409 },
    );
  }

  const templatePath = path.join(
    process.cwd(),
    "public",
    "templates",
    "definitieve-lineup.xlsx",
  );

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);

  const ws =
    wb.getWorksheet("Jury lineup") ??
    wb.getWorksheet("Definitieve lineup") ??
    wb.worksheets[0];

  if (!ws) {
    return NextResponse.json(
      { error: "Template definitieve-lineup.xlsx heeft geen werkblad" },
      { status: 500 },
    );
  }

  // Rij 2 is de template-datarij. Die stijl wordt doorgetrokken naar alle exportregels.
  const templateRow = ws.getRow(2);
  const templateHeight = templateRow.height;
  const templateStyles: Record<number, Partial<ExcelJS.Style>> = {};
  for (let col = 1; col <= 13; col += 1) {
    templateStyles[col] = cloneExcelStyle(templateRow.getCell(col).style);
  }

  const lineupColumns = getLineupColumns(ws);

  clearTemplateData(ws, 2);

  const seenToernooiFighters = new Set<string>();
  let exportPartijNr = 1;
  let rowNumber = 2;

  const gewonePartijen = bouts.filter((b: any) => !isToernooiBout(b));
  const toernooiPartijen = bouts.filter((b: any) => isToernooiBout(b));

  for (const b of gewonePartijen) {
    const decision = rawRowDecision(b, decisions);
    const titelpartij = isTitelpartij(b);
    const rondes = getRondeTijden({
      discipline: b.discipline,
      klasse: b.klasse,
      rood_leeftijd: getLeeftijdVoorRondetijd(b, "rood"),
      blauw_leeftijd: getLeeftijdVoorRondetijd(b, "blauw"),
      titelpartij,
    });

    setLineupCellValues(ws, rowNumber++, {
      partij_nr: exportPartijNr++,
      discipline: b.discipline,
      klasse: b.klasse,
      rood_naam: b.rood_naam,
      rood_gym: b.rood_gym,
      rood_va: b.va_rood ?? b.rood_va ?? b.rood_va_nummer,
      blauw_naam: b.blauw_naam,
      blauw_gym: b.blauw_gym,
      blauw_va: b.va_blauw ?? b.blauw_va ?? b.blauw_va_nummer,
      rondes,
      minpunt: getMinPuntForLineup(b, decision),
      titelpartij: titelpartij ? "Ja" : "",
      vs: "VS",
    }, templateStyles, templateHeight, lineupColumns);
  }

  const toernooiGroups = new Map<string, any[]>();
  for (const b of toernooiPartijen) {
    const code = getToernooiCode(b) || "TOERNOOI";
    if (!toernooiGroups.has(code)) toernooiGroups.set(code, []);
    toernooiGroups.get(code)!.push(b);
  }

  for (const [toernooiCode, groupBouts] of toernooiGroups.entries()) {
    for (const b of groupBouts) {
      const decision = rawRowDecision(b, decisions);
      const titelpartij = isTitelpartij(b);
      const rondes = getRondeTijden({
        discipline: b.discipline,
        klasse: b.klasse,
        rood_leeftijd: getLeeftijdVoorRondetijd(b, "rood"),
        blauw_leeftijd: getLeeftijdVoorRondetijd(b, "blauw"),
        titelpartij,
      });

      const toernooiFighters = [
        { naam: b.rood_naam, gym: b.rood_gym, va: b.va_rood ?? b.rood_va },
        { naam: b.blauw_naam, gym: b.blauw_gym, va: b.va_blauw ?? b.blauw_va },
      ];

      for (const fighter of toernooiFighters) {
        const key = toernooiFighterKey(
          toernooiCode,
          fighter.naam,
          fighter.gym,
          fighter.va,
        );

        if (seenToernooiFighters.has(key)) continue;
        seenToernooiFighters.add(key);

        setLineupCellValues(ws, rowNumber++, {
          partij_nr: toernooiCode,
          discipline: b.discipline,
          klasse: b.klasse,
          rood_naam: fighter.naam,
          rood_gym: fighter.gym,
          rood_va: fighter.va,
          blauw_naam: "",
          blauw_gym: "",
          blauw_va: "",
          rondes,
          minpunt: getMinPuntForLineup(b, decision),
          titelpartij: titelpartij ? "Ja" : "",
          vs: "",
        }, templateStyles, templateHeight, lineupColumns);
      }
    }
  }

  ws.pageSetup.printArea = `A1:M${Math.max(1, rowNumber - 1)}`;
  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=jury-lineup.xlsx`,
    },
  });
}
