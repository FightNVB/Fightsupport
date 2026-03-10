export type DispensatieStatus =
  | "open"
  | "approved"
  | "rejected"
  | "tied";

export type DispensatieRule = {
  rule_code: string;
  rule: string;
  boodschap?: string;
};

export type DispensatieBoutRow = {
  bout_uid: string;
  matchmaking_id: string;
  partij_nr: number | null;

  rood_naam: string;
  blauw_naam: string;
  rood_va: string;
  blauw_va: string;

  status: DispensatieStatus;
  rules: DispensatieRule[];

  votes_total: number;
  votes_approve: number;
};
