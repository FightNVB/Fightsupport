// lib/matchmaker/rulesSingleFighter.ts
// Eén ingang voor single-fighter regels.
// Belangrijk: gebruik dezelfde volwassen klasse/record-logica als fighterRules.ts.
// Jeugdpartijen tellen niet mee voor volwassen R/N/C/B/A-promotie.

import { type AnyRow } from "./singleFighterUtils";
import { runMatchmakerFighterRules } from "./fighterRules";

export type SingleFighterRuleHit = {
  matchmaking_id: string;
  controle_run_id: string;
  inschrijving_id?: string | number | null;
  aanmelding_id?: string | number | null;
  fighter_id?: string | null;
  va_nummer?: string | null;
  toernooi_code?: string | null;
  is_toernooi?: boolean | null;
  partij_nr?: number | null;
  bout_id?: string | null;
  regel_type: "matchmaker_fighter";
  rule: string;
  rule_code: string;
  resultaat: "OK" | "LET_OP" | "ACTIE" | "DISPENSATIE" | "AFKEUR" | "VERBOD";
  severity: string;
  boodschap: string;
  bron: "aanmeldingen";
  created_at: string;
};

function s(v: any): string {
  return String(v ?? "").trim();
}

/**
 * Backwards compatible wrapper voor bestaande imports.
 *
 * De oude rulesSingleFighter gebruikte context.klasse_advies uit enrich.
 * Dat kon fout gaan omdat klasse_advies op totale aantallen leunde.
 * Deze wrapper draait daarom altijd de centrale runMatchmakerFighterRules,
 * die per volwassen klasse telt en jeugdpartijen niet laat promoveren.
 */
export function rulesSingleFighter(context: AnyRow): SingleFighterRuleHit[] {
  const hits = runMatchmakerFighterRules(context, { includeOk: false });

  return hits.map((hit: any) => ({
    matchmaking_id: s(hit.matchmaking_id ?? context.matchmaking_id),
    controle_run_id: s(hit.controle_run_id ?? context.controle_run_id),
    inschrijving_id: hit.inschrijving_id ?? context.inschrijving_id ?? context.aanmelding_id ?? null,
    aanmelding_id: hit.aanmelding_id ?? context.aanmelding_id ?? context.inschrijving_id ?? null,
    fighter_id: hit.fighter_id ?? context.fighter_id ?? null,
    va_nummer: hit.va_nummer ?? context.va_nummer ?? null,
    toernooi_code: s(context.toernooi_code) || null,
    is_toernooi: context.is_toernooi === true || !!s(context.toernooi_code),
    partij_nr: Number.isFinite(Number(context.partij_nr)) ? Number(context.partij_nr) : null,
    bout_id: s(context.bout_id) || null,
    regel_type: "matchmaker_fighter",
    rule: hit.rule ?? hit.rule_code,
    rule_code: hit.rule_code,
    resultaat: hit.resultaat,
    severity: hit.severity,
    boodschap: hit.boodschap,
    bron: "aanmeldingen",
    created_at: hit.created_at ?? new Date().toISOString(),
  }));
}

export default rulesSingleFighter;
