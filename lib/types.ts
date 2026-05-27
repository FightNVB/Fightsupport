// lib/types.ts

export type Discipline = "KB" | "MT" | "DSB" | "MMA";

export interface Fighter {
  nvb_nummer: string; // technisch: VA nummer

  naam: string;
  geboortedatum: string | null; // ISO (kan ontbreken)
  leeftijd?: number | null;

  gewicht?: number | null;
  record_total?: number | null;

  gym_naam?: string | null;
  gym_nvb_nummer?: string | null;

  // ✅ Keurmerk (nu afkomstig uit controle_bout_context / sportscholen)
  // - heeft_keurmerk: null = onbekend/geen match
  // - keurmerk_reden: human readable reden uit merge-laag
  heeft_keurmerk?: boolean | null;
  keurmerk_reden?: string | null;

  // optioneel, als je later wél land/einddatum meegeeft
  gym_land?: string | null;
  gym_keurmerk_verloopt_op?: string | null;

  klasse_kb?: string | null;
  klasse_mt?: string | null;
  klasse_dsb?: string | null;
  klasse_mma?: string | null;

  wins?: number | null;
  losses?: number | null;
  draws?: number | null;
  ko_losses?: number | null;

  // ⬇️ OUDE VELDEN (mogen blijven bestaan voor compat, maar niet meer leidend)
  startverbod_tot?: string | null;
  licentie_geldig_tot?: string | null;

  // ✅ NIEUW: jouw scraper werkt met actief ja/nee
  startverbod_actief?: boolean | null; // true = actief startverbod
  licentie_actief?: boolean | null; // true = licentie actief

  // extra (bestaat al)
  medisch_commentaar?: string | null;
  talent_status?: boolean | null;
}

export interface ParsedPartij {
  id: string;
  matchmaking_id: string;
  event_naam: string;
  datum: string | null;
  discipline: Discipline;
  partij_nr?: number | null;

  hoek_rood_nvb: string;
  hoek_blauw_nvb: string;

  hoek_rood_naam: string;
  hoek_blauw_naam: string;

  gewicht_rood?: number | null;
  gewicht_blauw?: number | null;

  leeftijd_rood?: number | null;
  leeftijd_blauw?: number | null;

  rondes?: number | null;
  tijd_per_ronde?: string | null;

  // 👇 NIEUW
  is_toernooi?: boolean | null;
  toernooi_id?: string | null;
}

export type RuleSeverity = "info" | "warning" | "error";

export interface RuleResult {
  rule_code: string;
  severity: RuleSeverity;
  message: string;

  matchmaking_id: string;
  partij_id?: string | null;

  // ✅ nieuw:
  partij_nr?: number | null;

  hoek_rood_nvb?: string | null;
  hoek_blauw_nvb?: string | null;
  hoek?: "rood" | "blauw" | string;
}

/**
 * ✅ Uitslag parsing voor recordberekening (merge-laag)
 * Je gaf een lijst met mogelijke uitslagen. Deze helper maakt er een "result type" van.
 */
export type BoutOutcome = "WIN" | "LOSS" | "DRAW" | "NC" | "DEMO" | "UNKNOWN";

export interface ParsedUitslag {
  outcome: BoutOutcome;
  isKoLoss?: boolean; // true als verlies op KO/TKO/RSC e.d.
}

export function parseUitslagTekst(input?: string | null): ParsedUitslag {
  const s = (input || "").trim().toLowerCase();
  if (!s) return { outcome: "UNKNOWN" };

  // Demo / no contest
  if (s === "demo" || s.includes("demo")) return { outcome: "DEMO" };
  if (s.includes("no contest")) return { outcome: "NC" };

  // Draw
  if (s.includes("onbeslist")) return { outcome: "DRAW" };

  // Win / Loss detectie
  const isWin = s.startsWith("wint") || s.includes("wint ");
  const isLoss = s.startsWith("verliest") || s.includes("verliest ");

  // KO-achtige methodes (voor ko_losses)
  const isKoLike =
    s.includes("ko") ||
    s.includes("technisch ko") ||
    s.includes("tko") ||
    s.includes("rsc");

  // Als verlies en ko-like → ko loss
  if (isLoss) {
    return { outcome: "LOSS", isKoLoss: isKoLike };
  }

  if (isWin) {
    return { outcome: "WIN", isKoLoss: false };
  }

  // Edgecases
  if (s.includes("submission") && s.includes("wint")) return { outcome: "WIN" };
  if (s.includes("submission") && s.includes("verliest"))
    return { outcome: "LOSS", isKoLoss: false };

  return { outcome: "UNKNOWN" };
}
