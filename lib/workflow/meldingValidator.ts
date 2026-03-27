// lib/workflow/meldingValidator.ts
// Validation logic for the melding (controle_resultaat) approval system.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MeldingStatus } from "@/lib/types/workflow";
import { ERRORS } from "@/lib/constants/errors";

export type MeldingValidationResult = {
  ok: boolean;
  error?: string;
};

const VALID_STATUSES: MeldingStatus[] = ["pending", "akkoord", "afgewezen", "deleted"];

/**
 * Validate that a status value is a valid MeldingStatus.
 */
export function isValidMeldingStatus(status: string): status is MeldingStatus {
  return VALID_STATUSES.includes(status as MeldingStatus);
}

/**
 * Validate a melding status transition.
 * Rules:
 * - deleted → any = not allowed
 * - already akkoord/afgewezen → akkoord/afgewezen = warn but allow override by admin
 */
export function validateMeldingStatusChange(
  currentStatus: MeldingStatus,
  newStatus: MeldingStatus
): MeldingValidationResult {
  if (currentStatus === "deleted") {
    return { ok: false, error: "Verwijderde meldingen kunnen niet worden bijgewerkt." };
  }

  if (!isValidMeldingStatus(newStatus)) {
    return { ok: false, error: ERRORS.INVALID_MELDING_STATUS(newStatus) };
  }

  return { ok: true };
}

/**
 * Check whether all meldingen for a matchmaking are resolved (akkoord or deleted).
 * Returns null when all are resolved, or an error message string when blocked.
 */
export async function checkAllMeldingenResolved(
  supabase: SupabaseClient,
  matchmaking_id: string
): Promise<string | null> {
  const { data: rows, error } = await supabase
    .from("controle_resultaten")
    .select("id, resultaat, review_status")
    .eq("matchmaking_id", matchmaking_id);

  if (error) return ERRORS.DB_ERROR;

  const blocked = (rows ?? []).filter((r: any) => {
    const res = String(r.resultaat ?? "").toLowerCase();
    const rev = String(r.review_status ?? "").toLowerCase();
    if (res === "ok") return false;
    if (rev === "goedgekeurd") return false;
    return true;
  });

  if (blocked.length > 0) {
    return `${blocked.length} melding(en) zijn nog niet akkoord. Los deze op voor de statusovergang.`;
  }

  return null;
}

/**
 * Fetch a single melding row by id.
 * Returns null when not found.
 */
export async function getMelding(
  supabase: SupabaseClient,
  meldingId: string
): Promise<Record<string, any> | null> {
  const { data, error } = await supabase
    .from("controle_resultaten")
    .select("*")
    .eq("id", meldingId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Record<string, any>;
}

/**
 * Bulk check: returns counts of meldingen per status for a matchmaking.
 */
export async function getMeldingStatusCounts(
  supabase: SupabaseClient,
  matchmaking_id: string
): Promise<{
  total: number;
  ok: number;
  pending: number;
  afgewezen: number;
  deleted: number;
}> {
  const { data: rows, error } = await supabase
    .from("controle_resultaten")
    .select("id, resultaat, review_status")
    .eq("matchmaking_id", matchmaking_id);

  if (error || !rows) {
    return { total: 0, ok: 0, pending: 0, afgewezen: 0, deleted: 0 };
  }

  let ok = 0;
  let pending = 0;
  let afgewezen = 0;
  let deleted = 0;

  for (const r of rows) {
    const res = String((r as any).resultaat ?? "").toLowerCase();
    const rev = String((r as any).review_status ?? "").toLowerCase();

    if (res === "ok" || rev === "goedgekeurd") {
      ok++;
    } else if (res === "afgekeurd" || rev === "afgekeurd") {
      afgewezen++;
    } else {
      pending++;
    }
  }

  return { total: rows.length, ok, pending, afgewezen, deleted };
}
