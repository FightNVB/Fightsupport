// lib/yoc/runYocFighterContextPipeline.ts
// Complete YOC-flow: build → enrich → rules → save.

import { type AnyRow, type SupabaseLike, normalizeVa } from "./yocUtils";
import { buildYocFighterContext } from "./buildYocFighterContext";
import { enrichYocFighterContext } from "./enrichYocFighterContext";
import { runYocFighterRules } from "./yocFighterRules";
import { saveYocFighterContexts, saveYocFighterRules } from "./saveYocFighterContext";

export async function runYocFighterContextPipeline(params: {
  supabase: SupabaseLike;
  yocEventId: string;
  yocRunId?: string | null;
  yocFighters: AnyRow[];
  rawRows: AnyRow[];
  eventDate?: string | null;
  writeRules?: boolean;
}) {
  const {
    supabase,
    yocEventId,
    yocRunId = null,
    yocFighters,
    rawRows,
    eventDate = null,
    writeRules = true,
  } = params;

  const rawByVa = new Map<string, AnyRow>();
  for (const raw of rawRows ?? []) {
    const va = normalizeVa(raw?.va_nummer ?? raw?.fighter_id ?? raw?.va);
    if (va && !rawByVa.has(va)) rawByVa.set(va, raw);
  }

  const built = (yocFighters ?? []).map((fighter) => {
    const va = normalizeVa(fighter?.va_nummer_mm ?? fighter?.va_nummer ?? fighter?.va ?? fighter?.fighter_id);
    return buildYocFighterContext({
      yocEventId,
      yocRunId,
      yocFighter: fighter,
      fightersRaw: va ? rawByVa.get(va) ?? null : null,
      eventDate,
    });
  });

  const enriched: AnyRow[] = [];
  for (const ctx of built) {
    enriched.push(await enrichYocFighterContext({ supabase, context: ctx }));
  }

  const contextSave = await saveYocFighterContexts({ supabase, yocEventId, contexts: enriched });

  let rulesCount = 0;
  let rulesError: any = null;

  if (writeRules) {
    const hits = enriched.flatMap(runYocFighterRules).filter((hit) => hit.resultaat !== "ok");
    const rulesSave = await saveYocFighterRules({ supabase, yocEventId, yocRunId, hits });
    rulesCount = rulesSave.data?.length ?? hits.length;
    rulesError = rulesSave.error ?? null;
  }

  return {
    count: contextSave.data?.length ?? enriched.length,
    rules_count: rulesCount,
    rows: contextSave.data ?? enriched,
    error: contextSave.error ?? rulesError ?? null,
  };
}
