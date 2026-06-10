// app/api/rapport/jury-lineup-excel/route.ts
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
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

  if (k.includes("J")) {
    if (rAge >= 16 && bAge >= 16) return "3x1.5 min";
    return "3x1 min";
  }

  if (k.includes("R")) return "3x1.5 min";
  if (k.includes("N") || k.includes("NIEUWELING") || k.includes("NEWCOMER")) {
    return "3x1.5 min";
  }

  if (k.includes("C")) return "3x2 min";
  if (k.includes("B")) return "3x3 min";
  if (k.includes("A")) return "3x3 min";

  return "";
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
};

type PartyDecision = {
  blocked: boolean;
  blockedReasons: string[];
  roodMinpunten: number;
  blauwMinpunten: number;
  hasControle: boolean;
};

function isApprovedOverride(row: ControleRow) {
  const actieStatus = norm(row.actie_status);
  const reviewStatus = norm(row.review_status);
  return [actieStatus, reviewStatus].some((status) =>
    ["goedgekeurd", "approved", "akkoord", "ok"].includes(status),
  );
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

  // Harde nee: mag nooit naar jury-lineup of uitslagen.
  // Ook niet als er later een losse OK/INFO-regel of weegstation OK-regel bij dezelfde partij staat.
  return (
    combined.includes("STARTVERBOD") ||
    combined.includes("VERBOD") ||
    combined.includes("LICENTIE_ONGELDIG") ||
    combined.includes("GEEN_LICENTIE") ||
    combined.includes("LICENTIE ONGELDIG") ||
    combined.includes("GEEN GELDIGE LICENTIE") ||
    combined.includes("KEURMERK_ONGELDIG") ||
    combined.includes("GEEN_KEURMERK") ||
    combined.includes("KEURMERK ONGELDIG") ||
    combined.includes("GEEN GELDIG KEURMERK")
  );
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
  target.blockedReasons.push(...source.blockedReasons);
}

function applyControleRowToDecision(row: ControleRow, decision: PartyDecision) {
  decision.hasControle = true;

  const resultaat = norm(row.resultaat);
  const code = upper(row.rule_code);
  const rule = norm(row.rule);

  // Harde nee: licentie ongeldig/geen licentie, geen geldig keurmerk en startverbod/verbod
  // mogen nooit door naar jury-lineup of uitslagen.
  if (isHardNoRow(row)) {
    decision.blocked = true;
    decision.blockedReasons.push("Harde blokkade: licentie/keurmerk/startverbod/verbod");
    return;
  }

  // ACTIE minpunt is de enige ACTIE die door mag. Deze telt als strafpunt, niet als blokkade.
  if (isActieMinpunt(row)) {
    const hoek = minpuntHoek(row);
    if (hoek === "rood") decision.roodMinpunten += 1;
    if (hoek === "blauw") decision.blauwMinpunten += 1;
    return;
  }

  // AFKEUR is nooit geschikt voor jury-lineup/uitslagen zolang het resultaat AFKEUR blijft.
  // Wil je een afkeur toch laten doorgaan, dan moet die review-route de regel echt naar OK zetten.
  if (isAfkeur(row)) {
    decision.blocked = true;
    decision.blockedReasons.push("AFKEUR aanwezig");
    return;
  }

  // Goedgekeurde/naar OK gezette meldingen blokkeren niet meer.
  // Een losse OK/INFO-regel mag geen andere open ACTIE/AFKEUR/DISPENSATIE opheffen.
  if (isApprovedOverride(row)) return;

  if (hasVerbod(row)) {
    decision.blocked = true;
    decision.blockedReasons.push("Verbod/startverbod aanwezig");
    return;
  }

  if (isDispensatie(row) && !isDispensatieVerleend(row)) {
    decision.blocked = true;
    decision.blockedReasons.push("Dispensatie open/nodig/afgewezen");
    return;
  }

  // OK en INFO zijn toegestaan. Dit moet vóór de open-review check staan,
  // omdat oudere OK/NO_RULES regels soms review_status=open hebben.
  // Losse ACTIE/AFKEUR/DISPENSATIE regels blijven alsnog blokkeren via hun eigen rij.
  if (isOk(row) || isInfo(row) || isDispensatieVerleend(row)) return;

  if (
    resultaat === "actie" ||
    isOpenReview(row.actie_status) ||
    isOpenReview(row.review_status)
  ) {
    decision.blocked = true;
    decision.blockedReasons.push("Open actiepunt of review aanwezig");
    return;
  }

  const status = s(row.resultaat) || s(row.rule_code);
  if (status) {
    decision.blocked = true;
    decision.blockedReasons.push(`Controle-status blokkeert: ${status}`);
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
  // Exact dezelfde selectie als /api/matchmaking/naar-uitslagen:
  // OK en INFO mogen door, zolang er geen blokkerende controle-regels zijn.
  // Afkeur, verbod/startverbod, open actie en open/nodige/afgewezen dispensatie blokkeren.
  const decision = rawRowDecision(row, decisions);
  if (decision?.blocked) return false;

  // Als controle_resultaten expliciet OK/INFO voor deze partij bevatten, mag hij door.
  // Dit is belangrijk na het weegstation: OK staat vaak in controle_resultaten
  // met source_table=weigh_in_bouts en wordt via partij_nr gekoppeld.
  if (decision?.hasControle) return true;

  if (isRowOkOrInfo(row)) return true;

  // Fallback voor oudere data zonder eindstatus: laat alleen complete context door.
  return isContextCompleet(row);
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
      "partij_nr,bout_id,source_id,source_table,toernooi_code,toernooi_va_nummer,va_nummer,fighter_id,rule,rule_code,resultaat,severity,actie_status,review_status,hoek",
    )
    .eq("matchmaking_id", matchmaking_id);

  if (controleErr) {
    return NextResponse.json({ error: controleErr.message }, { status: 500 });
  }

  const decisions = buildDecisions((controleRows ?? []) as ControleRow[]);
  const bouts = (rawBouts ?? []).filter((b: any) =>
    isEligibleForLineup(b, decisions),
  );

  if (!bouts.length) {
    return NextResponse.json(
      {
        error:
          "Geen partijen geschikt voor jury-lineup. Alleen OK/INFO zonder afkeur, verbod/startverbod, open actie of open/nodige/afgewezen dispensatie worden meegenomen.",
        total_count: rawBouts?.length ?? 0,
        controle_count: controleRows?.length ?? 0,
      },
      { status: 409 },
    );
  }

  const hasTitelpartij = bouts.some((b) => isTitelpartij(b));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Jury lineup");

  const columns: Partial<ExcelJS.Column>[] = [
    { header: "Partij", key: "partij_nr", width: 8 },
    { header: "Discipline", key: "discipline", width: 18 },
    { header: "Klasse", key: "klasse", width: 16 },

    { header: "Rood naam", key: "rood_naam", width: 28 },
    { header: "Rood sportschool", key: "rood_gym", width: 28 },
    { header: "Rood VA", key: "rood_va", width: 14 },
    { header: "VS", key: "vs", width: 5 },

    { header: "Blauw naam", key: "blauw_naam", width: 28 },
    { header: "Blauw sportschool", key: "blauw_gym", width: 28 },
    { header: "Blauw VA", key: "blauw_va", width: 14 },
  ];

  if (hasTitelpartij) {
    columns.push({ header: "Titelpartij", key: "titelpartij", width: 14 });
  }

  columns.push({ header: "Ronde tijden", key: "rondes", width: 18 });
  columns.push({ header: "Min punt", key: "minpunt", width: 18 });

  ws.columns = columns;

  ws.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.4,
      bottom: 0.4,
      header: 0.2,
      footer: 0.2,
    },
    printTitlesRow: "1:1",
  };

  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.properties.defaultRowHeight = 20;

  const header = ws.getRow(1);
  header.height = 24;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { vertical: "middle", horizontal: "center" };

  header.eachCell((cell, colNumber) => {
    const key = ws.getColumn(colNumber).key;

    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    if (["rood_naam", "rood_gym", "rood_va"].includes(String(key))) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC00000" },
      };
      return;
    }

    if (["blauw_naam", "blauw_gym", "blauw_va"].includes(String(key))) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F4E79" },
      };
      return;
    }

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF555555" },
    };
  });

  const seenToernooiFighters = new Set<string>();
  let exportPartijNr = 1;

  for (const b of bouts) {
    const decision = rawRowDecision(b, decisions);
    const titelpartij = isTitelpartij(b);
    const rondes = getRondeTijden({
      discipline: b.discipline,
      klasse: b.klasse,
      rood_leeftijd: b.rood_leeftijd,
      blauw_leeftijd: b.blauw_leeftijd,
      titelpartij,
    });

    if (isToernooiBout(b)) {
      const toernooiCode = getToernooiCode(b);

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

        ws.addRow({
          partij_nr: exportPartijNr++,
          discipline: b.discipline,
          klasse: b.klasse,
          rood_naam: fighter.naam,
          rood_gym: fighter.gym,
          rood_va: fighter.va,
          blauw_naam: "",
          blauw_gym: "",
          blauw_va: "",
          vs: "VS",
          ...(hasTitelpartij ? { titelpartij: titelpartij ? "Ja" : "" } : {}),
          rondes,
          minpunt: getMinPuntForLineup(b, decision),
        });
      }

      continue;
    }

    ws.addRow({
      partij_nr: exportPartijNr++,
      discipline: b.discipline,
      klasse: b.klasse,

      rood_naam: b.rood_naam,
      rood_gym: b.rood_gym,
      rood_va: b.va_rood ?? b.rood_va ?? b.rood_va_nummer,

      blauw_naam: b.blauw_naam,
      blauw_gym: b.blauw_gym,
      blauw_va: b.va_blauw ?? b.blauw_va ?? b.blauw_va_nummer,

      vs: "VS",
      ...(hasTitelpartij ? { titelpartij: titelpartij ? "Ja" : "" } : {}),
      rondes,
      minpunt: getMinPuntForLineup(b, decision),
    });
  }

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    row.alignment = { vertical: "middle" };

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9D9D9" } },
        left: { style: "thin", color: { argb: "FFD9D9D9" } },
        bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
        right: { style: "thin", color: { argb: "FFD9D9D9" } },
      };
    });
  });

  ws.pageSetup.printArea = `A1:${String.fromCharCode(64 + ws.columns.length)}${ws.rowCount}`;
  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=jury-lineup.xlsx`,
    },
  });
}
