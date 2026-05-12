// lib/matchmakingLifecycleConfig.ts

export type MatchmakingStage =
  | "nieuw"
  | "bouwen_matchmaking"
  | "concept_matchmaking"
  | "ingediend_admin"
  | "in_controle_admin"
  | "review"
  | "klaar_voor_weegstation"
  | "in_officials"
  | "in_weegstation"
  | "weegstation_verwerkt"
  | "definitieve_lineup"
  | "klaar_voor_uitslagen"
  | "uitslagen_in_bewerking"
  | "uitslagen_definitief"
  | "gearchiveerd";

export type MatchmakingOwnerType =
  | "matchmaker"
  | "admin"
  | "bondteam"
  | "archief";

export const ALL_MATCHMAKING_STAGES: MatchmakingStage[] = [
  "nieuw",
  "bouwen_matchmaking",
  "concept_matchmaking",
  "ingediend_admin",
  "in_controle_admin",
  "review",
  "klaar_voor_weegstation",
  "in_officials",
  "in_weegstation",
  "weegstation_verwerkt",
  "definitieve_lineup",
  "klaar_voor_uitslagen",
  "uitslagen_in_bewerking",
  "uitslagen_definitief",
  "gearchiveerd",
];

export const STAGE_LABELS: Record<MatchmakingStage, string> = {
  nieuw: "Nieuw",
  bouwen_matchmaking: "Bouwen matchmaking",
  concept_matchmaking: "Concept matchmaking",
  ingediend_admin: "Ingediend admin",
  in_controle_admin: "In controle admin",
  review: "Review",
  klaar_voor_weegstation: "Klaar voor weegstation",
  in_officials: "In officials",
  in_weegstation: "In weegstation",
  weegstation_verwerkt: "Weegstation verwerkt",
  definitieve_lineup: "Definitieve lineup",
  klaar_voor_uitslagen: "Klaar voor uitslagen",
  uitslagen_in_bewerking: "Uitslagen in bewerking",
  uitslagen_definitief: "Uitslagen definitief",
  gearchiveerd: "Gearchiveerd",
};

export const STAGE_OWNER: Record<MatchmakingStage, MatchmakingOwnerType> = {
  nieuw: "matchmaker",
  bouwen_matchmaking: "matchmaker",
  concept_matchmaking: "matchmaker",
  ingediend_admin: "admin",
  in_controle_admin: "admin",
  review: "matchmaker",
  klaar_voor_weegstation: "admin",
  in_officials: "bondteam",
  in_weegstation: "bondteam",
  weegstation_verwerkt: "bondteam",
  definitieve_lineup: "bondteam",
  klaar_voor_uitslagen: "bondteam",
  uitslagen_in_bewerking: "bondteam",
  uitslagen_definitief: "bondteam",
  gearchiveerd: "archief",
};

export const MATCHMAKING_STAGE_TRANSITIONS: Record<
  MatchmakingStage,
  MatchmakingStage[]
> = {
  nieuw: ["bouwen_matchmaking"],
  bouwen_matchmaking: ["concept_matchmaking"],
  concept_matchmaking: ["ingediend_admin"],
  ingediend_admin: ["in_controle_admin"],
  in_controle_admin: ["review", "klaar_voor_weegstation"],
  review: [
    "review",
    "bouwen_matchmaking",
    "concept_matchmaking",
    "ingediend_admin",
    "klaar_voor_weegstation",
  ],
  klaar_voor_weegstation: ["in_officials"],
  in_officials: ["review", "in_weegstation"],
  in_weegstation: ["review", "weegstation_verwerkt"],
  weegstation_verwerkt: ["review", "definitieve_lineup"],
  definitieve_lineup: ["klaar_voor_uitslagen"],
  klaar_voor_uitslagen: ["uitslagen_in_bewerking"],
  uitslagen_in_bewerking: ["uitslagen_definitief"],
  uitslagen_definitief: ["gearchiveerd"],
  gearchiveerd: [],
};

export function isKnownMatchmakingStage(v: unknown): v is MatchmakingStage {
  return ALL_MATCHMAKING_STAGES.includes(
    String(v ?? "").trim() as MatchmakingStage
  );
}

export function canMoveMatchmakingStage(
  from: MatchmakingStage,
  to: MatchmakingStage
) {
  return MATCHMAKING_STAGE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getOwnerTypeForStage(
  stage: MatchmakingStage
): MatchmakingOwnerType {
  return STAGE_OWNER[stage];
}

// backwards-compatible alias for older imports
export const getRequiredOwnerTypeForStage = getOwnerTypeForStage;

export function stageAllowsBuilding(stage: MatchmakingStage) {
  return [
    "nieuw",
    "bouwen_matchmaking",
    "concept_matchmaking",
    "review",
  ].includes(stage);
}

export function stageLocksLineup(stage: MatchmakingStage) {
  return [
    "definitieve_lineup",
    "klaar_voor_uitslagen",
    "uitslagen_in_bewerking",
    "uitslagen_definitief",
    "gearchiveerd",
  ].includes(stage);
}

export function stageAllowsResults(stage: MatchmakingStage) {
  return [
    "klaar_voor_uitslagen",
    "uitslagen_in_bewerking",
    "uitslagen_definitief",
    "gearchiveerd",
  ].includes(stage);
}

export function stageDisplayOrder(stage: MatchmakingStage): number {
  const order: MatchmakingStage[] = [
    "nieuw",
    "bouwen_matchmaking",
    "concept_matchmaking",
    "ingediend_admin",
    "in_controle_admin",
    "review",
    "klaar_voor_weegstation",
    "in_officials",
    "in_weegstation",
    "weegstation_verwerkt",
    "definitieve_lineup",
    "klaar_voor_uitslagen",
    "uitslagen_in_bewerking",
    "uitslagen_definitief",
    "gearchiveerd",
  ];

  return order.indexOf(stage);
}
