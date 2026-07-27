import { buildSingleFighterContext } from "./buildSingleFighterContext";
import { enrichSingleFighterContext } from "./enrichSingleFighterContext";
import { runMatchmakerFighterRules } from "./fighterRules";
import {
  markAanmeldingenFromContexts,
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

/**
 * Bouwt de matchmaker-context opnieuw voor alle aanmeldingen binnen een
 * matchmaking, of alleen voor één aanmelding wanneer aanmeldingId is opgegeven.
 *
 * Bronnen:
 * - aanmeldingen: opgegeven naam, VA, sportschool, gewicht en matchmaker-invoer;
 * - fightpassport_fighters: profiel, geboortedatum, geslacht, licentie, startverbod en nulmeting;
 * - fightpassport_results: volledige uitslagenhistorie;
 * - matchmakings.datum: leeftijd en keurmerk op evenementdatum.
 */
export async function processMatchmakingFighters(params: {
  supabase: SupabaseLike;
  matchmakingId: string;
  controleRunId?: string;
  aanmeldingId?: string | number;
}) {
  const { supabase, matchmakingId } = params;
  const aanmeldingId = String(params.aanmeldingId ?? "").trim();

  // Voor de pre-matchmakerfase gebruiken we een stabiele UUID per matchmaking.
  // Daardoor worden regels bij herverwerking vervangen in plaats van opgestapeld.
  const controleRunId = params.controleRunId ?? matchmakingId;

  let aanmeldingenQuery = supabase
    .from("aanmeldingen")
    .select("*")
    .eq("matchmaking_id", matchmakingId);

  if (aanmeldingId) {
    aanmeldingenQuery = aanmeldingenQuery.eq("id", aanmeldingId);
  }

  const [
    { data: matchmaking, error: mmError },
    { data: aanmeldingen, error: aanmeldingenError },
  ] = await Promise.all([
    supabase
      .from("matchmakings")
      .select("id, datum")
      .eq("id", matchmakingId)
      .maybeSingle(),
    aanmeldingenQuery,
  ]);

  requireNoError("Matchmaking laden mislukt", mmError);
  requireNoError("Aanmeldingen laden mislukt", aanmeldingenError);
  if (!matchmaking) throw new Error("Matchmaking niet gevonden.");

  const registrations = (aanmeldingen ?? []) as AnyRow[];
  if (!registrations.length) {
    if (aanmeldingId) {
      throw new Error(`Aanmelding ${aanmeldingId} niet gevonden binnen deze matchmaking.`);
    }
    return { ok: true, controleRunId, processed: 0, contexts: [], hits: [] };
  }

  const vaNummers = unique(
    registrations
      .map((row) => normalizeVa(row?.va_nummer ?? row?.va ?? row?.fighter_id))
      .filter((va): va is string => Boolean(va)),
  );

  let fighterRows: AnyRow[] = [];
  let resultRows: AnyRow[] = [];

  if (vaNummers.length) {
    const [
      { data: fighters, error: fightersError },
      { data: results, error: resultsError },
    ] = await Promise.all([
      supabase.from("fightpassport_fighters").select("*").in("va_nummer", vaNummers),
      supabase.from("fightpassport_results").select("*").in("va_nummer", vaNummers),
    ]);

    requireNoError("FightPassport-vechters laden mislukt", fightersError);
    requireNoError("FightPassport-uitslagen laden mislukt", resultsError);
    fighterRows = (fighters ?? []) as AnyRow[];
    resultRows = (results ?? []) as AnyRow[];
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

  const built = registrations.map((aanmelding) => {
    const va = normalizeVa(aanmelding?.va_nummer ?? aanmelding?.va ?? aanmelding?.fighter_id);
    return buildSingleFighterContext({
      matchmakingId,
      controleRunId,
      aanmelding,
      fightersRaw: va ? fighterByVa.get(va) ?? null : null,
      uitslagen: va ? resultsByVa.get(va) ?? [] : [],
      eventDate: matchmaking.datum ?? null,
    });
  });

  const contexts: AnyRow[] = [];
  for (const context of built) {
    contexts.push(await enrichSingleFighterContext({ supabase, context }));
  }

  const hits = contexts.flatMap((context) =>
    runMatchmakerFighterRules(context, {
      uitslagen: Array.isArray(context.uitslagen) ? context.uitslagen : undefined,
      includeOk: true,
    }),
  );

  // De save-functies krijgen alleen de geselecteerde context(en). Bij een scoped
  // aanroep worden daardoor uitsluitend de context en regels van die aanmelding vervangen.
  const contextSave = await saveSingleFighterContexts({
    supabase,
    matchmakingId,
    contexts,
  });
  requireNoError("Fighter-context opslaan mislukt", contextSave.error);

  const rulesSave = await saveSingleFighterRules({
    supabase,
    matchmakingId,
    controleRunId,
    hits,
    scopeRows: contexts,
  });
  requireNoError("Fighterregels opslaan mislukt", rulesSave.error);

  await markAanmeldingenFromContexts({ supabase, matchmakingId, contexts });

  return {
    ok: true,
    controleRunId,
    processed: contexts.length,
    scoped: Boolean(aanmeldingId),
    aanmeldingId: aanmeldingId || null,
    contexts,
    hits,
  };
}
