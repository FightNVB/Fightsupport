import { buildControleBoutContext } from "./buildControleBoutContext";
import { enrichControleBoutContext } from "./enrichControleBoutContext";
import { processMatchmakingFighters, processSingleFighter } from "./processMatchmakingFighters";
import { rulesEngine } from "./rulesEngine";
import { normalizeVa, type AnyRow, type SupabaseLike } from "./singleFighterUtils";

type TerminatorResult = {
  ok: true;
  mode: "matchmaking" | "va_numbers";
  va_numbers: string[];
  matchmakings: number;
  fighter_contexts: number;
  bouts: number;
  skipped_without_run: number;
  errors: Array<{ matchmaking_id: string; message: string }>;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function getBoutVa(row: AnyRow, corner: "rood" | "blauw"): string | null {
  return normalizeVa(
    row?.[`va_${corner}`] ??
      row?.[`${corner}_va`] ??
      row?.[`${corner}_va_mm`] ??
      row?.[`${corner}_va_nummer`] ??
      row?.[`${corner}_fightpaspoort_nummer`],
  );
}

async function latestControleRunId(
  supabase: SupabaseLike,
  matchmakingId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("controle_runs")
    .select("id, gestart_op, afgerond_op")
    .eq("matchmaking_id", matchmakingId)
    .order("gestart_op", { ascending: false, nullsFirst: false })
    .order("afgerond_op", { ascending: false, nullsFirst: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const runId = text(data?.[0]?.id);
  if (runId) return runId;

  const { data: contexts, error: contextError } = await supabase
    .from("controle_bout_context")
    .select("controle_run_id, created_at")
    .eq("matchmaking_id", matchmakingId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (contextError) throw new Error(contextError.message);
  return text(contexts?.[0]?.controle_run_id) || null;
}

async function rebuildBout(
  supabase: SupabaseLike,
  matchmakingId: string,
  controleRunId: string,
  partijNr: number,
): Promise<boolean> {
  await buildControleBoutContext(matchmakingId, controleRunId, { partij_nr: partijNr });
  await enrichControleBoutContext(matchmakingId, controleRunId, { partij_nr: partijNr });

  const { data: ctxRows, error } = await supabase
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .eq("controle_run_id", controleRunId)
    .eq("partij_nr", partijNr);

  if (error) throw new Error(error.message);
  if (!ctxRows?.length) return false;

  await rulesEngine({
    matchmaking_id: matchmakingId,
    controle_run_id: controleRunId,
    ctxRows,
    scoped_partij_nr: partijNr,
  });

  return true;
}

async function loadBouts(supabase: SupabaseLike, matchmakingId: string): Promise<AnyRow[]> {
  const { data, error } = await supabase
    .from("matchmaking_bouts_raw")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .or("verwijderd.is.null,verwijderd.eq.false")
    .order("partij_nr", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AnyRow[];
}

export async function refreshMatchmaking(params: {
  supabase: SupabaseLike;
  matchmakingId: string;
}): Promise<TerminatorResult> {
  const { supabase } = params;
  const matchmakingId = text(params.matchmakingId);
  if (!matchmakingId) throw new Error("matchmakingId ontbreekt.");

  console.info(`[TERMINATOR] Matchmaking target acquired: ${matchmakingId}`);

  const processing = await processMatchmakingFighters({ supabase, matchmakingId });
  const bouts = await loadBouts(supabase, matchmakingId);
  const controleRunId = await latestControleRunId(supabase, matchmakingId);

  let rebuilt = 0;
  if (controleRunId) {
    for (const bout of bouts) {
      const partijNr = Number(bout?.partij_nr);
      if (!Number.isFinite(partijNr) || partijNr <= 0) continue;
      if (await rebuildBout(supabase, matchmakingId, controleRunId, partijNr)) rebuilt++;
    }
  }

  console.info(
    `[TERMINATOR] Mission complete: ${processing.processed} fighter contexts, ${rebuilt} bouts rebuilt. I'll be back.`,
  );

  return {
    ok: true,
    mode: "matchmaking",
    va_numbers: [],
    matchmakings: 1,
    fighter_contexts: processing.processed,
    bouts: rebuilt,
    skipped_without_run: controleRunId ? 0 : bouts.length > 0 ? 1 : 0,
    errors: [],
  };
}

export async function refreshVaNumbers(params: {
  supabase: SupabaseLike;
  vaNumbers: Array<string | number>;
}): Promise<TerminatorResult> {
  const { supabase } = params;
  const vaNumbers = unique(params.vaNumbers.map(normalizeVa));
  if (!vaNumbers.length) {
    return {
      ok: true,
      mode: "va_numbers",
      va_numbers: [],
      matchmakings: 0,
      fighter_contexts: 0,
      bouts: 0,
      skipped_without_run: 0,
      errors: [],
    };
  }

  console.info(`[TERMINATOR] ${vaNumbers.length} targets acquired.`);

  const { data: registrations, error } = await supabase
    .from("aanmeldingen")
    .select("*")
    .in("va_nummer", vaNumbers);

  if (error) throw new Error(`Aanmeldingen voor Terminator laden mislukt: ${error.message}`);

  const byMatchmaking = new Map<string, AnyRow[]>();
  for (const registration of (registrations ?? []) as AnyRow[]) {
    const matchmakingId = text(registration?.matchmaking_id);
    if (!matchmakingId) continue;
    const list = byMatchmaking.get(matchmakingId) ?? [];
    list.push(registration);
    byMatchmaking.set(matchmakingId, list);
  }

  let fighterContexts = 0;
  let rebuiltBouts = 0;
  let skippedWithoutRun = 0;
  const errors: Array<{ matchmaking_id: string; message: string }> = [];

  for (const [matchmakingId, affectedRegistrations] of byMatchmaking) {
    try {
      for (const registration of affectedRegistrations) {
        await processSingleFighter({
          supabase,
          matchmakingId,
          aanmeldingId: registration.id,
        });
        fighterContexts++;
      }

      const affectedVas = new Set(
        affectedRegistrations
          .map((row) => normalizeVa(row?.va_nummer ?? row?.va ?? row?.fighter_id))
          .filter((value): value is string => Boolean(value)),
      );
      const bouts = await loadBouts(supabase, matchmakingId);
      const affectedBouts = bouts.filter((bout) => {
        const rood = getBoutVa(bout, "rood");
        const blauw = getBoutVa(bout, "blauw");
        return (rood && affectedVas.has(rood)) || (blauw && affectedVas.has(blauw));
      });

      if (!affectedBouts.length) continue;
      const controleRunId = await latestControleRunId(supabase, matchmakingId);
      if (!controleRunId) {
        skippedWithoutRun++;
        continue;
      }

      for (const bout of affectedBouts) {
        const partijNr = Number(bout?.partij_nr);
        if (!Number.isFinite(partijNr) || partijNr <= 0) continue;
        if (await rebuildBout(supabase, matchmakingId, controleRunId, partijNr)) rebuiltBouts++;
      }
    } catch (cause: any) {
      errors.push({
        matchmaking_id: matchmakingId,
        message: cause?.message ?? String(cause),
      });
    }
  }

  console.info(
    `[TERMINATOR] Mission complete: ${fighterContexts} fighter contexts, ${rebuiltBouts} bouts rebuilt. I'll be back.`,
  );

  return {
    ok: true,
    mode: "va_numbers",
    va_numbers: vaNumbers,
    matchmakings: byMatchmaking.size,
    fighter_contexts: fighterContexts,
    bouts: rebuiltBouts,
    skipped_without_run: skippedWithoutRun,
    errors,
  };
}
