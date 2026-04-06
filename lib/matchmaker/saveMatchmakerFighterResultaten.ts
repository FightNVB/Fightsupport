import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type MatchmakerFighterRuleResultaat =
  | "OK"
  | "INFO"
  | "ACTIE"
  | "DISPENSATIE"
  | "AFKEUR"
  | "VERBOD";

export type MatchmakerFighterSeverity = "info" | "ok" | "warning" | "error";

export type MatchmakerFighterResultHit = {
  matchmaking_id?: string | null;
  controle_run_id?: string | null;

  fighter_id?: string | null;
  inschrijving_id?: string | null;
  row_nr?: number | null;

  naam?: string | null;
  va_nummer?: string | null;

  rule: string;
  rule_code: string;
  resultaat: MatchmakerFighterRuleResultaat;
  severity: MatchmakerFighterSeverity;
  boodschap: string;
};

function normStr(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function asInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export async function saveMatchmakerFighterResultaten(opts: {
  matchmaking_id: string;
  controle_run_id: string;
  hits: MatchmakerFighterResultHit[];
  deleteExistingForRun?: boolean;
}) {
  const {
    matchmaking_id,
    controle_run_id,
    hits,
    deleteExistingForRun = true,
  } = opts;

  if (!matchmaking_id) {
    throw new Error("saveMatchmakerFighterResultaten: matchmaking_id ontbreekt");
  }

  if (!controle_run_id) {
    throw new Error("saveMatchmakerFighterResultaten: controle_run_id ontbreekt");
  }

  if (!Array.isArray(hits)) {
    throw new Error("saveMatchmakerFighterResultaten: hits moet een array zijn");
  }

  if (deleteExistingForRun) {
    const { error: deleteErr } = await supabaseAdmin
      .from("matchmaker_fighter_resultaten")
      .delete()
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", controle_run_id);

    if (deleteErr) {
      throw new Error(
        `matchmaker_fighter_resultaten cleanup mislukt: ${deleteErr.message}`
      );
    }
  }

  if (hits.length === 0) {
    return {
      ok: true,
      inserted: 0,
      deleted_existing: deleteExistingForRun,
    };
  }

  const rows = hits.map((hit) => ({
    matchmaking_id,
    controle_run_id,

    fighter_id: normStr(hit.fighter_id),
    inschrijving_id: normStr(hit.inschrijving_id),
    row_nr: asInt(hit.row_nr),

    naam: normStr(hit.naam),
    va_nummer: normStr(hit.va_nummer),

    rule: String(hit.rule ?? "").trim(),
    rule_code: String(hit.rule_code ?? "").trim().toUpperCase(),
    resultaat: String(hit.resultaat ?? "").trim().toUpperCase(),
    severity: String(hit.severity ?? "").trim().toLowerCase(),
    boodschap: String(hit.boodschap ?? "").trim(),
  }));

  for (const row of rows) {
    if (!row.rule) {
      throw new Error("saveMatchmakerFighterResultaten: rule ontbreekt in een hit");
    }
    if (!row.rule_code) {
      throw new Error("saveMatchmakerFighterResultaten: rule_code ontbreekt in een hit");
    }
    if (!row.resultaat) {
      throw new Error("saveMatchmakerFighterResultaten: resultaat ontbreekt in een hit");
    }
    if (!row.severity) {
      throw new Error("saveMatchmakerFighterResultaten: severity ontbreekt in een hit");
    }
  }

  let inserted = 0;

  for (const chunk of chunkArray(rows, 500)) {
    const { error: insertErr, data } = await supabaseAdmin
      .from("matchmaker_fighter_resultaten")
      .insert(chunk)
      .select("id");

    if (insertErr) {
      throw new Error(
        `matchmaker_fighter_resultaten insert mislukt: ${insertErr.message}`
      );
    }

    inserted += data?.length ?? chunk.length;
  }

  return {
    ok: true,
    inserted,
    deleted_existing: deleteExistingForRun,
  };
}