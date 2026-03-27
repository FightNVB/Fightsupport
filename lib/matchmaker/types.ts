export type MatchmakerStatus =
  | "draft"
  | "ready_for_scrape"
  | "scraping"
  | "ready_for_matching"
  | "matching"
  | "submitted"
  | "locked";

export type LeeftijdType = "jeugd" | "volwassen" | "onbekend";

export type FighterContextRow = {
  id: number;
  matchmaker_matchmaking_id: number;
  inschrijving_id: number | null;
  discipline: string | null;
  klasse: string | null;
  geslacht: string | null;
  voornaam: string | null;
  achternaam: string | null;
  naam_input: string | null;
  gym_input: string | null;
  geboortedatum_input: string | null;
  gewicht: number | null;
  va_nummer: string | null;
  fp_naam: string | null;
  fp_geboortedatum: string | null;
  fp_gym: string | null;
  fp_klasse: string | null;
  record_w: number | null;
  record_l: number | null;
  record_d: number | null;
  naam_match: boolean | null;
  geboortedatum_match: boolean | null;
  gym_match: boolean | null;
  uitslagen_count: number | null;
  laatste_partij_datum: string | null;
  extra: Record<string, any> | null;
  nulmeting_opmerking: string | null;
  heeft_keurmerk: string | null;
};

export type MatchAdvice = {
  discipline_ok: boolean;
  gender_ok: boolean;
  leeftijd_type_ok: boolean;
  klasse_ok: boolean;
  leeftijd_diff_days: number | null;
  leeftijd_diff_label: string | null;
  gewicht_diff: number | null;
  advies: "goed" | "handmatig" | "afkeur";
  warnings: string[];
};
