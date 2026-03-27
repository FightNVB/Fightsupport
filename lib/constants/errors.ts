// lib/constants/errors.ts
// Unified error messages for the workflow & approval system.

export const ERRORS = {
  // Auth
  NOT_LOGGED_IN: "Niet ingelogd.",
  NO_ACCESS: "Geen toegang.",
  INVALID_TOKEN: "Ongeldig token.",

  // Validation
  MISSING_FIELD: (field: string) => `Veld '${field}' is verplicht.`,
  INVALID_UUID: (field: string) => `Ongeldige UUID voor veld '${field}'.`,
  INVALID_STATE: (state: string) => `Ongeldige status: '${state}'.`,

  // State transitions
  INVALID_TRANSITION: (from: string, to: string) =>
    `Ongeldige statusovergang van '${from}' naar '${to}'.`,
  PENDING_MELDINGEN: "Er zijn nog openstaande of afgewezen meldingen. Los deze eerst op.",
  NO_BOUTS: "Geen partijen gevonden voor deze matchmaking.",
  NOT_IN_STATE: (expected: string, actual: string) =>
    `Matchmaking is niet in de vereiste status '${expected}' (huidig: '${actual}').`,

  // Meldingen
  MELDING_NOT_FOUND: "Melding niet gevonden.",
  MELDING_ALREADY_RESOLVED: "Melding is al afgehandeld.",
  INVALID_MELDING_STATUS: (status: string) => `Ongeldige meldingstatus: '${status}'.`,

  // Uitslagen
  UITSLAG_ALREADY_EXISTS: "Uitslag is al ingevoerd voor deze partij.",
  UITSLAG_NOT_FOUND: "Uitslag niet gevonden.",
  MATCHMAKING_NOT_IN_LINEUP: "Matchmaking moet in LINEUP status zijn om uitslagen in te voeren.",
  INVALID_UITSLAG: "Ongeldige uitslag waarde.",

  // Access
  NOT_OWN_MATCHMAKING: "Je hebt alleen toegang tot je eigen matchmakings.",
  NOT_OWN_BONDTEAM: "Je hebt alleen toegang tot matchmakings van je eigen bondteam.",

  // General
  NOT_FOUND: (entity: string) => `${entity} niet gevonden.`,
  DB_ERROR: "Databasefout opgetreden.",
  UNKNOWN_ERROR: "Er is een onbekende fout opgetreden.",
} as const;
