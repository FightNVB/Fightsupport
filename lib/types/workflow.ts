// lib/types/workflow.ts
// Central TypeScript types for the security, workflow & approval system.

// ─── Roles ────────────────────────────────────────────────────────────────────

export type RoleName =
  | "superadmin"
  | "admin"
  | "matchmaker"
  | "official"
  | "hoofdofficial"
  | "dispensatie_admin"
  | "unknown";

// ─── Matchmaking states ───────────────────────────────────────────────────────

export type MatchmakingState =
  | "draft"
  | "approved"
  | "weging"
  | "lineup"
  | "complete";

// ─── Meldingen (controle_resultaten) ─────────────────────────────────────────

export type MeldingStatus =
  | "pending"
  | "akkoord"
  | "afgewezen"
  | "deleted";

export interface Melding {
  id: string;
  matchmaking_id: string;
  partij_nr: number | null;
  hoek: "rood" | "blauw" | null;
  rule_code: string | null;
  resultaat: string | null;
  boodschap: string | null;
  status: MeldingStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  aantekeningen: string | null;
}

// ─── Uitslagen ────────────────────────────────────────────────────────────────

export interface Uitslag {
  id: string;
  matchmaking_id: string;
  partij_id: string;
  partij_nr: number;
  uitslag_rood: string | null;
  winnaar: "rood" | "blauw" | "onbeslist" | null;
  ingevoerd_door: string | null;
  ingevoerd_op: string | null;
  bondteam: string | null;
}

// ─── State transition ─────────────────────────────────────────────────────────

export interface StateTransitionRequest {
  matchmaking_id: string;
  from_state: MatchmakingState;
  to_state: MatchmakingState;
  requested_by: string;
  role: RoleName;
}

export interface StateTransitionResult {
  ok: boolean;
  error?: string;
  new_state?: MatchmakingState;
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  action: string;
  entity_type: string;
  entity_id: string;
  matchmaking_id: string | null;
  actor_id: string;
  actor_role: RoleName | string;
  details: Record<string, unknown> | null;
  created_at?: string;
}

// ─── Access check result ──────────────────────────────────────────────────────

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}
