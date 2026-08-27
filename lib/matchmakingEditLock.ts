import { createClient } from "@supabase/supabase-js";

const LOCK_MINUTES = 120;

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function assertHasMatchmakingEditLock(matchmakingId: string, userId: string) {
  const supabase = admin();
  const now = new Date();
  const { data, error } = await supabase.from("matchmaking_edit_locks")
    .select("locked_by_user_id, locked_by_name, locked_by_role, expires_at")
    .eq("matchmaking_id", matchmakingId)
    .gt("expires_at", now.toISOString())
    .maybeSingle();
  if (error) throw error;

  if (!data) {
    const err: any = new Error("Deze matchmaking heeft geen actieve bewerk-lock. Open de matchmaking opnieuw.");
    err.status = 423;
    throw err;
  }
  if (String(data.locked_by_user_id) !== String(userId)) {
    const who = data.locked_by_name || "een andere gebruiker";
    const role = data.locked_by_role ? ` · ${data.locked_by_role}` : "";
    const err: any = new Error(`Deze matchmaking wordt al bewerkt door ${who}${role}. Alleen-lezen.`);
    err.status = 423;
    throw err;
  }

  // Een echte wijziging verlengt de lock; er is dus geen periodieke polling/heartbeat nodig.
  await supabase.from("matchmaking_edit_locks")
    .update({ expires_at: new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString() })
    .eq("matchmaking_id", matchmakingId)
    .eq("locked_by_user_id", userId);
}
