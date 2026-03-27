// lib/workflow/dataFilters.ts
// Data filtering helpers that scope database queries to what a user may see.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoleName } from "@/lib/types/workflow";
import { isAdminLike } from "@/lib/auth/roleChecks";

/**
 * Returns a Supabase query that is scoped to what the user may see.
 *
 * - admin/superadmin/dispensatie_admin → all matchmakings
 * - matchmaker → only matchmakings uploaded by this user
 * - official/hoofdofficial → only matchmakings with same bondteam
 */
export function scopeMatchmakingQuery(
  query: ReturnType<SupabaseClient["from"]>,
  opts: {
    role: RoleName | string;
    userId: string;
    bondteam: string | null;
  }
): ReturnType<SupabaseClient["from"]> {
  const { role, userId, bondteam } = opts;
  const r = String(role).trim().toLowerCase() as RoleName;

  if (isAdminLike(r)) {
    return query;
  }

  if (r === "matchmaker") {
    return (query as any).eq("uploaded_by", userId);
  }

  if ((r === "official" || r === "hoofdofficial") && bondteam) {
    return (query as any).eq("bondteam", bondteam);
  }

  // Unknown role – return no results
  return (query as any).eq("matchmaking_id", "00000000-0000-0000-0000-000000000000");
}

/**
 * Scope a partijen (bouts) query to a user's bondteam.
 * Officials may only see bouts where one of the fighters belongs to their bondteam.
 */
export function scopePartijQuery(
  query: ReturnType<SupabaseClient["from"]>,
  opts: {
    role: RoleName | string;
    bondteam: string | null;
  }
): ReturnType<SupabaseClient["from"]> {
  const { role, bondteam } = opts;
  const r = String(role).trim().toLowerCase() as RoleName;

  if (isAdminLike(r) || r === "matchmaker") {
    return query;
  }

  if ((r === "official" || r === "hoofdofficial") && bondteam) {
    // Filter on matchmakings from the same bondteam (via join or separate lookup)
    return (query as any).or(
      `rood_bondteam.eq.${bondteam},blauw_bondteam.eq.${bondteam}`
    );
  }

  return (query as any).eq("id", "00000000-0000-0000-0000-000000000000");
}

/**
 * Filter a list of matchmaking rows in memory based on the user's role.
 */
export function filterMatchmakingRows<T extends Record<string, any>>(
  rows: T[],
  opts: {
    role: RoleName | string;
    userId: string;
    bondteam: string | null;
  }
): T[] {
  const { role, userId, bondteam } = opts;
  const r = String(role).trim().toLowerCase() as RoleName;

  if (isAdminLike(r) || r === "superadmin") return rows;

  if (r === "matchmaker") {
    return rows.filter((row) => row.uploaded_by === userId);
  }

  if ((r === "official" || r === "hoofdofficial") && bondteam) {
    return rows.filter(
      (row) =>
        String(row.bondteam ?? "").toLowerCase() === String(bondteam).toLowerCase()
    );
  }

  return [];
}
