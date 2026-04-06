import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fighterRulesEngine } from "@/lib/fighterRulesEngine";
import { saveMatchmakerFighterResultaten } from "@/lib/matchmaker/saveMatchmakerFighterResultaten";

function normStr(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function asInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function runMatchmakerFighterRules(opts: {
  matchmaking_id: string;
  controle_run_id: string;
}) {
  const { matchmaking_id, controle_run_id } = opts;

  if (!matchmaking_id) {
    throw new Error("runMatchmakerFighterRules: matchmaking_id ontbreekt");
  }

  if (!controle_run_id) {
    throw new Error("runMatchmakerFighterRules: controle_run_id ontbreekt");
  }

  const { data: fighters, error } = await supabaseAdmin
    .from("matchmaker_fighter_context")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id)
    .order("row_nr", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`matchmaker_fighter_context ophalen mislukt: ${error.message}`);
  }

  const hits: any[] = [];

  for (const fighter of fighters ?? []) {
    const fighterHits = await fighterRulesEngine({
      ctx: fighter,
      matchmaking_id,
      controle_run_id,
    });

    for (const hit of fighterHits) {
      hits.push({
        matchmaking_id,
        controle_run_id,
        fighter_id: normStr(fighter?.fighter_id),
        inschrijving_id: normStr(fighter?.inschrijving_id ?? fighter?.id),
        row_nr: asInt(fighter?.row_nr),
        naam: normStr(
          fighter?.naam_mm ??
            fighter?.naam_fp ??
            fighter?.naam ??
            fighter?.full_name
        ),
        va_nummer: normStr(fighter?.va_nummer ?? fighter?.va_nummer_mm),
        rule: hit.rule,
        rule_code: hit.rule_code,
        resultaat: hit.resultaat,
        severity: hit.severity,
        boodschap: hit.boodschap,
      });
    }
  }

  const saveResult = await saveMatchmakerFighterResultaten({
    matchmaking_id,
    controle_run_id,
    hits,
    deleteExistingForRun: true,
  });

  return {
    ok: true,
    fighters_processed: fighters?.length ?? 0,
    hits: hits.length,
    inserted: saveResult.inserted,
  };
}