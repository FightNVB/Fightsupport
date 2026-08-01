import { buildSingleFighterContext } from "./buildSingleFighterContext";
import { enrichSingleFighterContext } from "./enrichSingleFighterContext";
import { runMatchmakerFighterRules } from "./fighterRules";
import {
  saveSingleFighterContexts,
  saveSingleFighterRules,
} from "./saveSingleFighterContext";
import { normalizeVa, type AnyRow, type SupabaseLike } from "./singleFighterUtils";

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function requireNoError(label: string, error: any) {
  if (error) throw new Error(`${label}: ${error.message ?? String(error)}`);
}

type MatchmakingRow = {
  id: string;
  datum?: string | null;
};

type SingleFighterSources = {
  matchmaking: MatchmakingRow;
  aanmelding: AnyRow;
  fighterRaw?: AnyRow | null;
  uitslagen?: AnyRow[];
  startverboden?: AnyRow[];
};

async function buildAndSaveSingleFighter(params: {
  supabase: SupabaseLike;
  matchmakingId: string;
  controleRunId: string;
  sources: SingleFighterSources;
}) {
  const { supabase, matchmakingId, controleRunId, sources } = params;
  const {
    matchmaking,
    aanmelding,
    fighterRaw = null,
    uitslagen = [],
    startverboden = [],
  } = sources;

  const built = buildSingleFighterContext({
    matchmakingId,
    controleRunId,
    aanmelding,
    fightersRaw: fighterRaw,
    uitslagen,
    startverboden,
    eventDate: matchmaking.datum ?? null,
  });

  const context = await enrichSingleFighterContext({ supabase, context: built });
  const contextUitslagen = (context as AnyRow).uitslagen;
  const hits = runMatchmakerFighterRules(context, {
    uitslagen: Array.isArray(contextUitslagen) ? contextUitslagen : uitslagen,
    includeOk: true,
  });

  const contextSave = await saveSingleFighterContexts({
    supabase,
    matchmakingId,
    contexts: [context],
  });
  requireNoError("Fighter-context opslaan mislukt", contextSave.error);

  const rulesSave = await saveSingleFighterRules({
    supabase,
    matchmakingId,
    controleRunId,
    hits,
    scopeRows: [context],
  });
  requireNoError("Fighterregels opslaan mislukt", rulesSave.error);

  return { context, hits };
}

/**
 * Bouwt, verrijkt, controleert en bewaart exact één aanmelding.
 * Dit is de enige publieke write-pipeline voor een losse matchmaker-vechter.
 *
 * Gebruik deze functie direct na:
 * - upload/insert van een aanmelding;
 * - handmatig toevoegen;
 * - aanpassen van VA-nummer, naam, sportschool, gewicht of klasse;
 * - een gerichte refresh/hercontrole.
 */
export async function processSingleFighter(params: {
  supabase: SupabaseLike;
  matchmakingId: string;
  aanmeldingId: string | number;
  controleRunId?: string;
}) {
  const { supabase, matchmakingId } = params;
  const aanmeldingId = String(params.aanmeldingId ?? "").trim();
  if (!aanmeldingId) throw new Error("aanmeldingId is verplicht voor processSingleFighter.");

  // Voor de pre-matchmakerfase gebruiken we een stabiele UUID per matchmaking.
  // Daardoor worden regels bij herverwerking vervangen in plaats van opgestapeld.
  const controleRunId = params.controleRunId ?? matchmakingId;

  const [
    { data: matchmaking, error: mmError },
    { data: aanmelding, error: aanmeldingError },
  ] = await Promise.all([
    supabase
      .from("matchmakings")
      .select("id, datum")
      .eq("id", matchmakingId)
      .maybeSingle(),
    supabase
      .from("aanmeldingen")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq("id", aanmeldingId)
      .maybeSingle(),
  ]);

  requireNoError("Matchmaking laden mislukt", mmError);
  requireNoError("Aanmelding laden mislukt", aanmeldingError);
  if (!matchmaking) throw new Error("Matchmaking niet gevonden.");
  if (!aanmelding) {
    throw new Error(`Aanmelding ${aanmeldingId} niet gevonden binnen deze matchmaking.`);
  }

  const va = normalizeVa(aanmelding?.va_nummer ?? aanmelding?.va ?? aanmelding?.fighter_id);
  let fighterRaw: AnyRow | null = null;
  let uitslagen: AnyRow[] = [];
  let startverboden: AnyRow[] = [];

  if (va) {
    const [
      { data: fighter, error: fighterError },
      { data: resultRows, error: resultsError },
      { data: startverbodRows, error: startverbodError },
    ] = await Promise.all([
      supabase
        .from("fightpassport_fighters")
        .select("*")
        .eq("va_nummer", va)
        .maybeSingle(),
      supabase
        .from("fightpassport_results")
        .select("*")
        .eq("va_nummer", va),
      supabase
        .from("startverbod")
        .select("*")
        .eq("va_nummer", va),
    ]);

    requireNoError("FightPassport-vechter laden mislukt", fighterError);
    requireNoError("FightPassport-uitslagen laden mislukt", resultsError);
    requireNoError("Startverboden laden mislukt", startverbodError);
    fighterRaw = (fighter ?? null) as AnyRow | null;
    uitslagen = (resultRows ?? []) as AnyRow[];
    startverboden = (startverbodRows ?? []) as AnyRow[];
  }

  const result = await buildAndSaveSingleFighter({
    supabase,
    matchmakingId,
    controleRunId,
    sources: {
      matchmaking: matchmaking as MatchmakingRow,
      aanmelding: aanmelding as AnyRow,
      fighterRaw,
      uitslagen,
      startverboden,
    },
  });

  return {
    ok: true,
    controleRunId,
    processed: 1,
    scoped: true,
    aanmeldingId,
    contexts: [result.context],
    hits: result.hits,
  };
}

/**
 * Batch-wrapper. De inhoudelijke verwerking blijft per vechter via exact
 * dezelfde single-fighter pipeline lopen. Bronnen worden vooraf in bulk geladen
 * zodat grote uploads geen onnodige N+1 database-queries veroorzaken.
 */
export async function processMatchmakingFighters(params: {
  supabase: SupabaseLike;
  matchmakingId: string;
  controleRunId?: string;
  aanmeldingId?: string | number;
}) {
  const { supabase, matchmakingId } = params;
  const scopedAanmeldingId = String(params.aanmeldingId ?? "").trim();

  // Achterwaartse compatibiliteit: bestaande callers met aanmeldingId gaan
  // automatisch door de nieuwe single-fighter pipeline.
  if (scopedAanmeldingId) {
    return processSingleFighter({
      supabase,
      matchmakingId,
      controleRunId: params.controleRunId,
      aanmeldingId: scopedAanmeldingId,
    });
  }

  const controleRunId = params.controleRunId ?? matchmakingId;

  const [
    { data: matchmaking, error: mmError },
    { data: aanmeldingen, error: aanmeldingenError },
  ] = await Promise.all([
    supabase
      .from("matchmakings")
      .select("id, datum")
      .eq("id", matchmakingId)
      .maybeSingle(),
    supabase
      .from("aanmeldingen")
      .select("*")
      .eq("matchmaking_id", matchmakingId),
  ]);

  requireNoError("Matchmaking laden mislukt", mmError);
  requireNoError("Aanmeldingen laden mislukt", aanmeldingenError);
  if (!matchmaking) throw new Error("Matchmaking niet gevonden.");

  const registrations = (aanmeldingen ?? []) as AnyRow[];
  if (!registrations.length) {
    return { ok: true, controleRunId, processed: 0, scoped: false, aanmeldingId: null, contexts: [], hits: [] };
  }

  const vaNummers = unique(
    registrations
      .map((row) => normalizeVa(row?.va_nummer ?? row?.va ?? row?.fighter_id))
      .filter((va): va is string => Boolean(va)),
  );

  let fighterRows: AnyRow[] = [];
  let resultRows: AnyRow[] = [];
  let startverbodRows: AnyRow[] = [];

  if (vaNummers.length) {
    const [
      { data: fighters, error: fightersError },
      { data: results, error: resultsError },
      { data: startverboden, error: startverbodenError },
    ] = await Promise.all([
      supabase.from("fightpassport_fighters").select("*").in("va_nummer", vaNummers),
      supabase.from("fightpassport_results").select("*").in("va_nummer", vaNummers),
      supabase.from("startverbod").select("*").in("va_nummer", vaNummers),
    ]);

    requireNoError("FightPassport-vechters laden mislukt", fightersError);
    requireNoError("FightPassport-uitslagen laden mislukt", resultsError);
    requireNoError("Startverboden laden mislukt", startverbodenError);
    fighterRows = (fighters ?? []) as AnyRow[];
    resultRows = (results ?? []) as AnyRow[];
    startverbodRows = (startverboden ?? []) as AnyRow[];
  }

  const fighterByVa = new Map<string, AnyRow>();
  for (const fighter of fighterRows) {
    const va = normalizeVa(fighter?.va_nummer ?? fighter?.va ?? fighter?.fighter_id);
    if (va && !fighterByVa.has(va)) fighterByVa.set(va, fighter);
  }

  const resultsByVa = new Map<string, AnyRow[]>();
  for (const result of resultRows) {
    const va = normalizeVa(result?.va_nummer ?? result?.va ?? result?.fighter_id);
    if (!va) continue;
    const list = resultsByVa.get(va) ?? [];
    list.push(result);
    resultsByVa.set(va, list);
  }

  const startverbodenByVa = new Map<string, AnyRow[]>();
  for (const startverbod of startverbodRows) {
    const va = normalizeVa(
      startverbod?.va_nummer ?? startverbod?.va ?? startverbod?.fighter_id,
    );
    if (!va) continue;
    const list = startverbodenByVa.get(va) ?? [];
    list.push(startverbod);
    startverbodenByVa.set(va, list);
  }

  const contexts: AnyRow[] = [];
  const hits: AnyRow[] = [];

  // Bewust per aanmelding opslaan: dezelfde pipeline kan daardoor ook veilig
  // direct na iedere losse insert worden aangeroepen.
  for (const aanmelding of registrations) {
    const va = normalizeVa(aanmelding?.va_nummer ?? aanmelding?.va ?? aanmelding?.fighter_id);
    const result = await buildAndSaveSingleFighter({
      supabase,
      matchmakingId,
      controleRunId,
      sources: {
        matchmaking: matchmaking as MatchmakingRow,
        aanmelding,
        fighterRaw: va ? fighterByVa.get(va) ?? null : null,
        uitslagen: va ? resultsByVa.get(va) ?? [] : [],
        startverboden: va ? startverbodenByVa.get(va) ?? [] : [],
      },
    });

    contexts.push(result.context);
    hits.push(...result.hits);
  }

  return {
    ok: true,
    controleRunId,
    processed: contexts.length,
    scoped: false,
    aanmeldingId: null,
    contexts,
    hits,
  };
}
