import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Fighter = Record<string, any>;
type EngineHit = Record<string, any>;

function s(v: unknown) {
  return String(v ?? "").trim();
}

function n(v: unknown): number | null {
  const x = Number(
    String(v ?? "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, ""),
  );
  return Number.isFinite(x) ? x : null;
}

function parseJson(v: unknown): any {
  if (!v) return {};
  if (typeof v === "object") return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return {};
  }
}

function firstFilled(...values: unknown[]) {
  for (const v of values) {
    const out = s(v);
    if (out) return out;
  }
  return "";
}

function deep(f?: Fighter | null) {
  const extra = parseJson(f?.extra);
  return {
    extra,
    raw: extra?.raw ?? f?.raw ?? {},
    aanmelding: extra?.raw?.aanmelding ?? f?.aanmelding ?? {},
    fightersRaw: extra?.raw?.fighters_raw ?? f?.fighters_raw ?? {},
  };
}

function fighterName(f?: Fighter | null) {
  if (!f) return "";
  const d = deep(f);
  return firstFilled(
    f.naam,
    f.fp_naam,
    d.fightersRaw?.naam,
    f.naam_input,
    [f.voornaam, f.achternaam].map(s).filter(Boolean).join(" "),
    [d.aanmelding?.voornaam, d.aanmelding?.achternaam].map(s).filter(Boolean).join(" "),
  );
}

function fighterVa(f?: Fighter | null) {
  if (!f) return "";
  const d = deep(f);
  return firstFilled(
    f.va_nummer,
    f.va,
    f.fighter_id,
    f.fp_va_nummer,
    d.fightersRaw?.va_nummer,
    d.aanmelding?.va_nummer,
  ).replace(/[^0-9]/g, "");
}

function fighterDob(f?: Fighter | null) {
  if (!f) return "";
  const d = deep(f);
  return firstFilled(
    f.geboortedatum,
    f.fp_geboortedatum,
    d.fightersRaw?.geboortedatum,
    f.geboortedatum_input,
    d.aanmelding?.geboortedatum,
  );
}

function fighterGender(f?: Fighter | null) {
  if (!f) return "";
  const d = deep(f);
  return firstFilled(
    f.geslacht,
    f.fp_geslacht,
    d.fightersRaw?.geslacht,
    d.aanmelding?.geslacht,
    f.gender,
  );
}

function fighterGym(f?: Fighter | null) {
  if (!f) return "";
  const d = deep(f);
  return firstFilled(
    f.sportschool,
    f.gym_input,
    f.fp_gym,
    f.gym,
    d.fightersRaw?.gym,
    d.aanmelding?.gym,
  );
}

function fighterWeight(f?: Fighter | null) {
  if (!f) return null;
  const d = deep(f);
  return n(firstFilled(f.gewicht, f.gewicht_input, f.fp_gewicht, d.aanmelding?.gewicht));
}

function fighterClass(f?: Fighter | null) {
  if (!f) return "";
  const d = deep(f);
  return firstFilled(
    f.klasse,
    f.fp_klasse,
    f.klasse_fp,
    f.nulmeting_klasse,
    d.fightersRaw?.nulmeting_klasse,
    d.aanmelding?.klasse,
  );
}

function fighterDiscipline(f?: Fighter | null) {
  if (!f) return "";
  const d = deep(f);
  return firstFilled(f.discipline, f.fp_discipline, d.aanmelding?.discipline);
}

function fighterLicense(f?: Fighter | null) {
  if (!f) return "";
  const d = deep(f);
  return firstFilled(f.licentie, d.fightersRaw?.licentie, f.licentie_ok, f.licentie_status, f.fp_licentie);
}

function fighterStartverbod(f?: Fighter | null) {
  if (!f) return "";
  const d = deep(f);
  return firstFilled(f.heeft_startverbod, d.fightersRaw?.heeft_startverbod, f.startverbod, f.startverbod_status);
}

function fighterNulmetingTotal(f?: Fighter | null) {
  if (!f) return null;
  const d = deep(f);
  return n(firstFilled(f.nulmeting_totaal, d.fightersRaw?.nulmeting_totaal, f.totaal_wedstrijden, d.fightersRaw?.totaal_wedstrijden));
}

function fighterWins(f?: Fighter | null) {
  if (!f) return null;
  const d = deep(f);
  return n(firstFilled(f.gewonnen, d.fightersRaw?.gewonnen, f.record_w));
}

function fighterNulmetingOpmerking(f?: Fighter | null) {
  if (!f) return "";
  const d = deep(f);
  return firstFilled(f.nulmeting_opmerking, d.fightersRaw?.nulmeting_opmerking);
}


function parseKeurmerkBoolFromValues(...values: unknown[]): boolean | null {
  const joined = values
    .map((v) => s(v).toLowerCase())
    .filter(Boolean)
    .join(" | ");

  if (!joined) return null;

  // Expliciet ongeldig wint van algemeen tekst-matchen.
  if (
    joined.includes("geen geldig") ||
    joined.includes("ongeldig") ||
    joined.includes("verlopen") ||
    joined.includes("geen keurmerk") ||
    joined.includes("geen match") ||
    joined.includes("false") ||
    joined.includes("nee")
  ) {
    return false;
  }

  if (
    joined.includes("keurmerk geldig") ||
    joined.includes("geldig op eventdatum") ||
    joined.includes("gematcht met") ||
    joined.includes("true") ||
    joined.includes("ja") ||
    joined.includes("ok")
  ) {
    return true;
  }

  return null;
}

function fighterKeurmerkStatus(f?: Fighter | null): boolean | null {
  if (!f) return null;
  const d = deep(f);

  return parseKeurmerkBoolFromValues(
    f.heeft_keurmerk,
    f.keurmerk_ok,
    f.keurmerk_status,
    f.keurmerk,
    f.keurmerk_reden,
    d.fightersRaw?.heeft_keurmerk,
    d.fightersRaw?.keurmerk_ok,
    d.fightersRaw?.keurmerk_status,
    d.fightersRaw?.keurmerk_reden,
    d.aanmelding?.heeft_keurmerk,
    d.aanmelding?.keurmerk_ok,
    d.aanmelding?.keurmerk_status,
    d.aanmelding?.keurmerk_reden,
  );
}

function fighterKeurmerkReason(f?: Fighter | null): string {
  if (!f) return "";
  const d = deep(f);

  return firstFilled(
    f.keurmerk_reden,
    f.keurmerk_reason,
    f.keurmerk_status_reden,
    d.fightersRaw?.keurmerk_reden,
    d.fightersRaw?.keurmerk_reason,
    d.fightersRaw?.keurmerk_status_reden,
    d.aanmelding?.keurmerk_reden,
    d.aanmelding?.keurmerk_reason,
    d.aanmelding?.keurmerk_status_reden,
  );
}

function buildCtx(opts: {
  matchmakingId: string;
  controleRunId: string;
  eventDate: string;
  rood: Fighter;
  blauw: Fighter;
  maxGewicht: number | null;
}) {
  const { matchmakingId, controleRunId, eventDate, rood, blauw, maxGewicht } = opts;
  const discipline = firstFilled(fighterDiscipline(rood), fighterDiscipline(blauw));
  const klasse = firstFilled(fighterClass(rood), fighterClass(blauw));

  const roodVa = fighterVa(rood);
  const blauwVa = fighterVa(blauw);
  const roodGewicht = fighterWeight(rood);
  const blauwGewicht = fighterWeight(blauw);

  return {
    matchmaking_id: matchmakingId,
    controle_run_id: controleRunId,
    bout_id: null,
    partij_nr: null,
    is_toernooi: false,

    event_date: eventDate || null,
    event_datum: eventDate || null,
    datum: eventDate || null,

    discipline,
    sub_discipline: discipline,
    klasse_mm: klasse,
    klasse,

    max_gewicht: maxGewicht,
    afgesproken_max_gewicht: maxGewicht,
    gewicht: maxGewicht,

    rood_naam: fighterName(rood),
    rood_naam_mm: fighterName(rood),
    rood_naam_fp: fighterName(rood),
    rood_va_mm: roodVa,
    rood_va_nummer: roodVa,
    va_rood: roodVa,
    rood_geboortedatum: fighterDob(rood),
    rood_geboortedatum_fp: fighterDob(rood),
    rood_geslacht: fighterGender(rood),
    rood_geslacht_fp: fighterGender(rood),
    rood_gym: fighterGym(rood),
    rood_gym_mm: fighterGym(rood),
    rood_gym_fp: fighterGym(rood),
    rood_gewicht: roodGewicht,
    rood_gewicht_mm: roodGewicht,
    rood_gewicht_fp: roodGewicht,
    rood_licentie: fighterLicense(rood),
    rood_heeft_startverbod: fighterStartverbod(rood),
    rood_nulmeting_klasse: fighterClass(rood),
    rood_nulmeting_totaal: fighterNulmetingTotal(rood),
    rood_totaal_wedstrijden_scrape: fighterNulmetingTotal(rood),
    rood_gewonnen: fighterWins(rood),
    rood_nulmeting_opmerking: fighterNulmetingOpmerking(rood),
    keurmerk_rood: fighterKeurmerkStatus(rood),
    keurmerk_reden_rood: fighterKeurmerkReason(rood),
    rood_heeft_keurmerk: fighterKeurmerkStatus(rood),
    rood_keurmerk_reden: fighterKeurmerkReason(rood),

    blauw_naam: fighterName(blauw),
    blauw_naam_mm: fighterName(blauw),
    blauw_naam_fp: fighterName(blauw),
    blauw_va_mm: blauwVa,
    blauw_va_nummer: blauwVa,
    va_blauw: blauwVa,
    blauw_geboortedatum: fighterDob(blauw),
    blauw_geboortedatum_fp: fighterDob(blauw),
    blauw_geslacht: fighterGender(blauw),
    blauw_geslacht_fp: fighterGender(blauw),
    blauw_gym: fighterGym(blauw),
    blauw_gym_mm: fighterGym(blauw),
    blauw_gym_fp: fighterGym(blauw),
    blauw_gewicht: blauwGewicht,
    blauw_gewicht_mm: blauwGewicht,
    blauw_gewicht_fp: blauwGewicht,
    blauw_licentie: fighterLicense(blauw),
    blauw_heeft_startverbod: fighterStartverbod(blauw),
    blauw_nulmeting_klasse: fighterClass(blauw),
    blauw_nulmeting_totaal: fighterNulmetingTotal(blauw),
    blauw_totaal_wedstrijden_scrape: fighterNulmetingTotal(blauw),
    blauw_gewonnen: fighterWins(blauw),
    blauw_nulmeting_opmerking: fighterNulmetingOpmerking(blauw),
    keurmerk_blauw: fighterKeurmerkStatus(blauw),
    keurmerk_reden_blauw: fighterKeurmerkReason(blauw),
    blauw_heeft_keurmerk: fighterKeurmerkStatus(blauw),
    blauw_keurmerk_reden: fighterKeurmerkReason(blauw),

    raw_json: {
      bron: "matchmaker_match_preview",
      rood,
      blauw,
    },
  };
}

function normalizeHits(raw: any): EngineHit[] {
  const hits = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.hits)
      ? raw.hits
      : Array.isArray(raw?.resultaten)
        ? raw.resultaten
        : Array.isArray(raw?.meldingen)
          ? raw.meldingen
          : [];

  return hits.map((hit: any) => ({
    ...hit,
    resultaat: hit?.resultaat ?? hit?.severity ?? hit?.status ?? "OK",
    severity: hit?.severity ?? hit?.resultaat ?? hit?.status ?? "OK",
    rule: hit?.rule ?? hit?.titel ?? hit?.title ?? hit?.rule_code ?? "MatchEngine",
    boodschap: hit?.boodschap ?? hit?.message ?? hit?.detail ?? "",
  }));
}

async function getLatestControleRunId(matchmakingId: string) {
  const { data } = await supabaseAdmin
    .from("controle_runs")
    .select("id")
    .eq("matchmaking_id", matchmakingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return s(data?.id) || `match-preview-${matchmakingId}`;
}

async function loadFighterFromDb(matchmakingId: string, idOrVa: string) {
  const key = s(idOrVa);
  if (!key) return null;

  const va = key.replace(/[^0-9]/g, "");

  const orParts = [
    `id.eq.${key}`,
    `inschrijving_id.eq.${key}`,
    `fighter_id.eq.${key}`,
  ];
  if (va) {
    orParts.push(`va_nummer.eq.${va}`, `va.eq.${va}`);
  }

  const { data } = await supabaseAdmin
    .from("aanmeldingen")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .or(orParts.join(","))
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined> },
) {
  try {
    const resolvedParams = await params;
    const body = await req.json().catch(() => ({}));

    // Ondersteunt zowel [matchmakingId] als [matchmakingid] en valt terug op de body.
    const paramId = Array.isArray(resolvedParams?.matchmakingId)
      ? resolvedParams?.matchmakingId[0]
      : resolvedParams?.matchmakingId;
    const paramIdLower = Array.isArray((resolvedParams as any)?.matchmakingid)
      ? (resolvedParams as any)?.matchmakingid[0]
      : (resolvedParams as any)?.matchmakingid;

    const matchmakingId = firstFilled(
      paramId,
      paramIdLower,
      body?.matchmaking_id,
      body?.matchmakingId,
    );

    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmakingId ontbreekt" }, { status: 400 });
    }

    const rood =
      body?.rood ??
      (await loadFighterFromDb(
        matchmakingId,
        firstFilled(body?.rood_inschrijving_id, body?.rood_fighter_id, body?.rood_id),
      ));

    const blauw =
      body?.blauw ??
      (await loadFighterFromDb(
        matchmakingId,
        firstFilled(body?.blauw_inschrijving_id, body?.blauw_fighter_id, body?.blauw_id),
      ));

    if (!rood || !blauw) {
      return NextResponse.json(
        { error: "Rood en blauw moeten bekend zijn voor MatchEngine controle" },
        { status: 400 },
      );
    }

    const controleRunId = await getLatestControleRunId(matchmakingId);
    const eventDate = s(body?.event_date ?? body?.event_datum ?? body?.datum);
    const maxGewicht = n(body?.max_gewicht ?? body?.afgesproken_max_gewicht);
    const ctx = buildCtx({ matchmakingId, controleRunId, eventDate, rood, blauw, maxGewicht });

    // Verwacht: lib/matchEngine.ts met export async function matchEngine(...)
    // Tijdelijke fallback: als je kopie nog export function rulesEngine heet, werkt deze route ook.
    const mod = await import("@/lib/matchEngine");
    const runMatchEngine = (mod as any).matchEngine ?? (mod as any).rulesEngine;

    if (typeof runMatchEngine !== "function") {
      return NextResponse.json(
        { error: "lib/matchEngine.ts moet export async function matchEngine(...) bevatten" },
        { status: 500 },
      );
    }

    const rawHits = await runMatchEngine({
      controle_run_id: controleRunId,
      matchmaking_id: matchmakingId,
      ctxRows: [ctx],
      preview: true,
      save: false,
    });

    const hits = normalizeHits(rawHits);

    return NextResponse.json({ ok: true, hits, ctx });
  } catch (e: any) {
    console.error("[match-check] MatchEngine controle mislukt", e);
    return NextResponse.json(
      { error: e?.message || "MatchEngine controle mislukt" },
      { status: 500 },
    );
  }
}
