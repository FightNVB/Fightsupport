// lib/matchmaker/rulesSingleFighter.ts
// Regels voor één losse matchmaker-aanmelding.
// Deze regels zijn bedoeld om de matchmaker te helpen vóórdat er een partij bestaat.

import { type AnyRow, boolish, s, toNumberOrNull, normalizeKlasse } from "./singleFighterUtils";

export type SingleFighterRuleHit = {
  matchmaking_id: string;
  controle_run_id: string;
  inschrijving_id?: string | number | null;
  aanmelding_id?: string | number | null;
  fighter_id?: string | null;
  va_nummer?: string | null;
  regel_type: "matchmaker_fighter";
  rule: string;
  rule_code: string;
  resultaat: "OK" | "LET_OP" | "ACTIE" | "AFKEUR" | "VERBOD";
  severity: string;
  boodschap: string;
  bron: "aanmeldingen";
  created_at: string;
};

function addFactory(context: AnyRow, hits: SingleFighterRuleHit[]) {
  return (
    rule_code: string,
    resultaat: SingleFighterRuleHit["resultaat"],
    boodschap: string,
    severity = resultaat
  ) => {
    hits.push({
      matchmaking_id: context.matchmaking_id,
      controle_run_id: context.controle_run_id,
      inschrijving_id: context.inschrijving_id ?? context.aanmelding_id ?? null,
      aanmelding_id: context.aanmelding_id ?? context.inschrijving_id ?? null,
      fighter_id: s(context.fighter_id ?? context.va_nummer) || null,
      va_nummer: s(context.va_nummer) || null,
      regel_type: "matchmaker_fighter",
      rule: rule_code,
      rule_code,
      resultaat,
      severity,
      boodschap,
      bron: "aanmeldingen",
      created_at: new Date().toISOString(),
    });
  };
}

export function rulesSingleFighter(context: AnyRow): SingleFighterRuleHit[] {
  const hits: SingleFighterRuleHit[] = [];
  const add = addFactory(context, hits);

  if (!s(context.va_nummer)) {
    add("MATCHMAKER_GEEN_VA", "ACTIE", "Deze aanmelding heeft geen geldig Fightpaspoortnummer.");
  }

  if (!s(context.naam_fp ?? context.fp_naam) && s(context.va_nummer)) {
    add("MATCHMAKER_GEEN_FP_DATA", "ACTIE", "Geen Fightpaspoortgegevens gevonden voor deze vechter.");
  }

  const licentieBool = boolish(context.licentie_ok ?? context.licentie_status ?? context.licentie);
  if (licentieBool === false) {
    add("MATCHMAKER_GEEN_LICENTIE", "AFKEUR", "Deze vechter heeft geen geldige licentie.");
  }

  const startverbod = boolish(context.heeft_startverbod ?? context.startverbod);
  if (startverbod === true || s(context.heeft_startverbod ?? context.startverbod).toLowerCase().includes("ja")) {
    add("MATCHMAKER_STARTVERBOD", "VERBOD", "Deze vechter heeft een startverbod.", "VERBOD");
  }

  if (context.naam_match === false) {
    add("MATCHMAKER_NAAM_WIJKT_AF", "LET_OP", "Naam uit aanmelding wijkt af van Fightpaspoort.", "LET_OP");
  }

  if (context.geboortedatum_match === false) {
    add("MATCHMAKER_GEBOORTEDATUM_WIJKT_AF", "LET_OP", "Geboortedatum uit aanmelding wijkt af van Fightpaspoort.", "LET_OP");
  }

  if (context.gym_match === false) {
    add("MATCHMAKER_SCHOOL_WIJKT_AF", "LET_OP", "Sportschool uit aanmelding wijkt af van Fightpaspoort.", "LET_OP");
  }

  if (context.keurmerk === false || context.heeft_keurmerk === false) {
    add(
      "MATCHMAKER_GEEN_KEURMERK",
      "LET_OP",
      context.keurmerk_reden || "Sportschool heeft geen geldig keurmerk op eventdatum.",
      "LET_OP"
    );
  }

  if (s(context.keurmerk_status) === "belgie_check") {
    add(
      "MATCHMAKER_BELGIE_CHECK",
      "LET_OP",
      context.keurmerk_reden || "Belgische sportschool: controleer BKBMO/boksboekje handmatig.",
      "LET_OP"
    );
  }

  const klasse = normalizeKlasse(context.klasse ?? context.klasse_mm ?? context.nulmeting_klasse);
  const advies = normalizeKlasse(context.klasse_advies);
  if (klasse && advies && klasse !== advies) {
    add(
      "MATCHMAKER_KLASSE_ADVIES",
      "LET_OP",
      context.klasse_advies_reden || `Klasseadvies wijkt af: ${klasse} → ${advies}.`,
      "LET_OP"
    );
  }

  const leeftijd = toNumberOrNull(context.leeftijd_event ?? context.leeftijd);
  if (leeftijd != null && leeftijd < 18 && klasse && !String(klasse).startsWith("J")) {
    add(
      "MATCHMAKER_JEUGD_LET_OP",
      "LET_OP",
      "Deze vechter is jeugd op eventdatum. Match alleen met passende jeugdregels/leeftijd/gewicht/ervaring.",
      "LET_OP"
    );
  }

  return hits;
}
