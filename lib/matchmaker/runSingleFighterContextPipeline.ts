// lib/matchmaker/runSingleFighterContextPipeline.ts
// Complete flow: build → enrich → rules → save voor losse matchmaker-aanmeldingen.

import { type AnyRow, type SupabaseLike, normalizeVa } from "./singleFighterUtils";
import { buildSingleFighterContext } from "./buildSingleFighterContext";
import { enrichSingleFighterContext } from "./enrichSingleFighterContext";
import { rulesSingleFighter } from "./rulesSingleFighter";
import { saveSingleFighterContexts, saveSingleFighterRules, markAanmeldingenFromContexts } from "./saveSingleFighterContext";

export async function runSingleFighterContextPipeline(params: {
  supabase: SupabaseLike;
  matchmakingId: string;
  controleRunId: string;
  aanmeldingen: AnyRow[];
  rawRows: AnyRow[];
  uitslagenRows?: AnyRow[];
  eventDate?: string | null;
  writeRules?: boolean;
}) {
  const {
    supabase,
    matchmakingId,
    controleRunId,
    aanmeldingen,
    rawRows,
    uitslagenRows = [],
    eventDate = null,
    writeRules = true,
  } = params;

  const rawByVa = new Map<string, AnyRow>();
  for (const raw of rawRows ?? []) {
    const va = normalizeVa(raw?.va_nummer ?? raw?.fighter_id);
    if (va && !rawByVa.has(va)) rawByVa.set(va, raw);
  }

  const uitslagenByVa = new Map<string, AnyRow[]>();
  for (const row of uitslagenRows ?? []) {
    const va = normalizeVa(row?.va_nummer ?? row?.fighter_id ?? row?.va);
    if (!va) continue;
    const list = uitslagenByVa.get(va) ?? [];
    list.push(row);
    uitslagenByVa.set(va, list);
  }

  const built = (aanmeldingen ?? []).map((aanmelding) => {
    const va = normalizeVa(aanmelding?.va_nummer ?? aanmelding?.va ?? aanmelding?.va_nr ?? aanmelding?.vanummer);
    return buildSingleFighterContext({
      matchmakingId,
      controleRunId,
      aanmelding,
      fightersRaw: va ? rawByVa.get(va) ?? null : null,
      uitslagen: va ? uitslagenByVa.get(va) ?? [] : [],
      eventDate,
    });
  });

  const enriched: AnyRow[] = [];
  for (const ctx of built) {
    enriched.push(await enrichSingleFighterContext({ supabase, context: ctx }));
  }

  const contextSave = await saveSingleFighterContexts({
    supabase,
    matchmakingId,
    contexts: enriched,
  });

  let rulesCount = 0;
  let rulesError: any = null;

  if (writeRules) {
    const hits = enriched.flatMap(rulesSingleFighter);
    const rulesSave = await saveSingleFighterRules({
      supabase,
      matchmakingId,
      controleRunId,
      hits,
      scopeRows: enriched,
    });

    rulesCount = rulesSave.data?.length ?? hits.length;
    rulesError = rulesSave.error ?? null;
  }

  await markAanmeldingenFromContexts({ supabase, matchmakingId, contexts: enriched });

  return {
    count: contextSave.data?.length ?? enriched.length,
    rules_count: rulesCount,
    rows: contextSave.data ?? enriched,
    error: contextSave.error ?? rulesError ?? null,
  };
}

// Backwards compatible naam voor bestaande imports uit oudere v10/v11 routes.
export const buildFighterContextsForAanmeldingen = runSingleFighterContextPipeline;
