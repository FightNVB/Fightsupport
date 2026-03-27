// lib/workflow/auditLogger.ts
// Audit log helpers — write structured audit entries to the database.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLogEntry, RoleName } from "@/lib/types/workflow";

/**
 * Write a single audit log entry to `admin_beheer_audit_log`.
 * Non-throwing: errors are logged to console but do not propagate.
 */
export async function writeAuditLog(
  supabase: SupabaseClient,
  entry: Omit<AuditLogEntry, "created_at">
): Promise<void> {
  try {
    const { error } = await supabase.from("admin_beheer_audit_log").insert({
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      matchmaking_id: entry.matchmaking_id ?? null,
      actor_id: entry.actor_id,
      actor_role: entry.actor_role,
      details: entry.details ?? null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[auditLogger] insert error:", error.message);
    }
  } catch (err: any) {
    console.error("[auditLogger] unexpected error:", err?.message ?? err);
  }
}

/**
 * Convenience: log a state transition.
 */
export async function logStateTransition(
  supabase: SupabaseClient,
  opts: {
    matchmaking_id: string;
    from_state: string;
    to_state: string;
    actor_id: string;
    actor_role: RoleName | string;
  }
): Promise<void> {
  await writeAuditLog(supabase, {
    action: "state_transition",
    entity_type: "matchmaking",
    entity_id: opts.matchmaking_id,
    matchmaking_id: opts.matchmaking_id,
    actor_id: opts.actor_id,
    actor_role: opts.actor_role,
    details: {
      from_state: opts.from_state,
      to_state: opts.to_state,
    },
  });
}

/**
 * Convenience: log a melding status change.
 */
export async function logMeldingUpdate(
  supabase: SupabaseClient,
  opts: {
    melding_id: string;
    matchmaking_id: string | null;
    old_status: string;
    new_status: string;
    actor_id: string;
    actor_role: RoleName | string;
    reden?: string | null;
  }
): Promise<void> {
  await writeAuditLog(supabase, {
    action: "melding_status_update",
    entity_type: "controle_resultaat",
    entity_id: opts.melding_id,
    matchmaking_id: opts.matchmaking_id,
    actor_id: opts.actor_id,
    actor_role: opts.actor_role,
    details: {
      old_status: opts.old_status,
      new_status: opts.new_status,
      reden: opts.reden ?? null,
    },
  });
}

/**
 * Convenience: log an uitslag entry.
 */
export async function logUitslagEntry(
  supabase: SupabaseClient,
  opts: {
    uitslag_id: string;
    matchmaking_id: string;
    partij_nr: number;
    actor_id: string;
    actor_role: RoleName | string;
    uitslag_rood: string | null;
    winnaar: string | null;
  }
): Promise<void> {
  await writeAuditLog(supabase, {
    action: "uitslag_ingevoerd",
    entity_type: "uitslag",
    entity_id: opts.uitslag_id,
    matchmaking_id: opts.matchmaking_id,
    actor_id: opts.actor_id,
    actor_role: opts.actor_role,
    details: {
      partij_nr: opts.partij_nr,
      uitslag_rood: opts.uitslag_rood,
      winnaar: opts.winnaar,
    },
  });
}
