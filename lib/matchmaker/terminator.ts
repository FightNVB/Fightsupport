import { buildControleBoutContext } from "./buildControleBoutContext";
import { enrichControleBoutContext } from "./enrichControleBoutContext";
import { processSingleFighter } from "./processMatchmakingFighters";
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

export type TerminatorProgress = {
  phase: string;
  message: string;
  current?: number;
  total?: number;
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

async function ensureControleRun(
  supabase: SupabaseLike,
  matchmakingId: string,
  totalBouts: number,
): Promise<string> {
  const existing = await latestControleRunId(supabase, matchmakingId);
  if (existing) {
    const { error } = await supabase
      .from("controle_runs")
      .update({
        status: "running",
        afgerond_op: null,
        is_latest: true,
        totaal_aantal: totalBouts,
        verwerkt_aantal: 0,
        progress: 0,
        current_step: "Matchmaking opnieuw opbouwen vanuit FightPassport database...",
        foutmelding: null,
      })
      .eq("id", existing);

    if (error) throw new Error(`Controlerun herstarten mislukt: ${error.message}`);

    const { error: latestError } = await supabase
      .from("controle_runs")
      .update({ is_latest: false })
      .eq("matchmaking_id", matchmakingId)
      .neq("id", existing);
    if (latestError) console.warn("[TERMINATOR] is_latest bijwerken warning:", latestError.message);

    return existing;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("controle_runs")
    .insert({
      matchmaking_id: matchmakingId,
      gestart_door_user_id: null,
      gestart_door_rol: "matchmaker",
      status: "running",
      gestart_op: now,
      run_type: "control-engine",
      is_latest: true,
      totaal_aantal: totalBouts,
      verwerkt_aantal: 0,
      progress: 0,
      current_step: "Matchmaking opnieuw opbouwen vanuit FightPassport database...",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Controlerun aanmaken mislukt: ${error.message}`);
  const runId = text(data?.id);
  if (!runId) throw new Error("Controlerun aanmaken gaf geen id terug.");

  const { error: latestError } = await supabase
    .from("controle_runs")
    .update({ is_latest: false })
    .eq("matchmaking_id", matchmakingId)
    .neq("id", runId);
  if (latestError) console.warn("[TERMINATOR] is_latest bijwerken warning:", latestError.message);

  console.info(`[TERMINATOR] Nieuwe controlerun aangemaakt: ${runId}`);
  return runId;
}

async function updateControleRunProgress(
  supabase: SupabaseLike,
  controleRunId: string,
  values: Record<string, unknown>,
) {
  const { error } = await supabase.from("controle_runs").update(values).eq("id", controleRunId);
  if (error) console.warn("[TERMINATOR] controlerun progress warning:", error.message);
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
  onProgress?: (progress: TerminatorProgress) => void;
}): Promise<TerminatorResult> {
  const { supabase, onProgress } = params;
  const matchmakingId = text(params.matchmakingId);
  if (!matchmakingId) throw new Error("matchmakingId ontbreekt.");

  const emit = (progress: TerminatorProgress) => {
    onProgress?.(progress);
    console.info(`[TERMINATOR] ${progress.message}`);
  };

  console.info(`[TERMINATOR] Matchmaking target acquired: ${matchmakingId}`);

  // Aanmeldingen-flow blijft ondersteund. Een complete matchmaking-upload heeft
  // bewust geen aanmeldingen; die wordt verderop rechtstreeks vanuit de partijen
  // en FightPassport-tabellen opgebouwd.
  const { data: registrations, error: registrationsError } = await supabase
    .from("aanmeldingen")
    .select("id")
    .eq("matchmaking_id", matchmakingId)
    .order("created_at", { ascending: true, nullsFirst: false });

  if (registrationsError) {
    throw new Error(`Aanmeldingen laden mislukt: ${registrationsError.message}`);
  }

  const registrationRows = (registrations ?? []) as AnyRow[];
  console.info(`[TERMINATOR] ${registrationRows.length} aanmeldingen gevonden.`);

  let processed = 0;
  for (const registration of registrationRows) {
    const aanmeldingId = text(registration?.id);
    if (!aanmeldingId) continue;

    await processSingleFighter({
      supabase,
      matchmakingId,
      aanmeldingId,
      controleRunId: matchmakingId,
    });
    processed++;

    if (processed === 1 || processed === registrationRows.length || processed % 10 === 0) {
      emit({
        phase: "fighter_context",
        message: `Fighter contexts: ${processed}/${registrationRows.length} verwerkt.`,
        current: processed,
        total: registrationRows.length,
      });
    }
  }

  console.info(`[TERMINATOR] Fighter contexts klaar: ${processed}.`);

  const bouts = await loadBouts(supabase, matchmakingId);
  console.info(`[TERMINATOR] ${bouts.length} wedstrijden gevonden.`);

  if (!bouts.length) {
    console.info(
      `[TERMINATOR] Mission complete: ${processed} fighter contexts, 0 bouts rebuilt. I'll be back.`,
    );
    return {
      ok: true,
      mode: "matchmaking",
      va_numbers: [],
      matchmakings: 1,
      fighter_contexts: processed,
      bouts: 0,
      skipped_without_run: 0,
      errors: [],
    };
  }

  // Een complete matchmaking-upload heeft nog geen controlerun. Start controle
  // moet die zelf kunnen aanmaken; anders kan build/enrich/rulesEngine niets opslaan.
  const controleRunId = await ensureControleRun(supabase, matchmakingId, bouts.length);

  emit({
    phase: "bout_rebuild",
    message: `${bouts.length} wedstrijden worden opnieuw opgebouwd vanuit FightPassport database.`,
    current: 0,
    total: bouts.length,
  });

  let rebuilt = 0;
  for (let index = 0; index < bouts.length; index++) {
    const bout = bouts[index];
    const partijNr = Number(bout?.partij_nr);
    if (!Number.isFinite(partijNr) || partijNr <= 0) continue;

    if (await rebuildBout(supabase, matchmakingId, controleRunId, partijNr)) {
      rebuilt++;
    }

    const current = index + 1;
    const progress = Math.max(1, Math.min(99, Math.round((current / bouts.length) * 100)));
    await updateControleRunProgress(supabase, controleRunId, {
      verwerkt_aantal: current,
      progress,
      current_step: `Wedstrijd ${current}/${bouts.length} opnieuw opgebouwd vanuit FightPassport database`,
    });

    if (current === 1 || current === bouts.length || current % 10 === 0) {
      emit({
        phase: "bout_rebuild",
        message: `Wedstrijden: ${current}/${bouts.length} verwerkt (${rebuilt} opgebouwd).`,
        current,
        total: bouts.length,
      });
    }
  }

  const now = new Date().toISOString();
  await updateControleRunProgress(supabase, controleRunId, {
    status: "klaar",
    afgerond_op: now,
    is_latest: true,
    verwerkt_aantal: bouts.length,
    progress: 100,
    current_step: "Controle afgerond vanuit FightPassport database",
    foutmelding: null,
  });

  emit({
    phase: "done",
    message: `Mission complete: ${processed} fighter contexts, ${rebuilt} bouts rebuilt. I'll be back.`,
    current: bouts.length,
    total: bouts.length,
  });

  return {
    ok: true,
    mode: "matchmaking",
    va_numbers: unique(
      bouts.flatMap((bout) => [getBoutVa(bout, "rood"), getBoutVa(bout, "blauw")]),
    ),
    matchmakings: 1,
    fighter_contexts: processed,
    bouts: rebuilt,
    skipped_without_run: 0,
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
