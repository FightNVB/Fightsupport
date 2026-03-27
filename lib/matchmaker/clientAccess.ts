import { supabase } from "@/lib/supabaseClient";

export type MatchmakerPageRole = "matchmaker" | "admin" | "superadmin";

export function isAllowedMatchmakerPageRole(role: unknown): role is MatchmakerPageRole {
  const r = String(role ?? "").trim().toLowerCase();
  return r === "matchmaker" || r === "admin" || r === "superadmin";
}

export async function getCurrentMatchmakerPageUser() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;

  const user = authData?.user ?? null;
  if (!user?.id) {
    return { userId: null, role: null, fullName: null, bondteam: null, allowed: false };
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role, full_name, bondteam")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  const role = String((profile as any)?.role ?? "").trim().toLowerCase() || null;

  return {
    userId: user.id,
    role,
    fullName: String((profile as any)?.full_name ?? "").trim() || null,
    bondteam: String((profile as any)?.bondteam ?? "").trim() || null,
    allowed: isAllowedMatchmakerPageRole(role),
  };
}

export async function ensureOwnedMatchmakerMatchmaking(matchmakingId: number | string, userId: string) {
  const mmId = Number(matchmakingId);
  if (!Number.isFinite(mmId)) return false;

  const [{ data: matchmaking, error: matchmakingError }, { data: upload, error: uploadError }] = await Promise.all([
    supabase
      .from("matchmaker_matchmakings")
      .select("id, created_by")
      .eq("id", mmId)
      .eq("created_by", userId)
      .maybeSingle(),
    supabase
      .from("matchmaker_uploads")
      .select("id, matchmaker_matchmaking_id")
      .eq("matchmaker_matchmaking_id", mmId)
      .limit(1)
      .maybeSingle(),
  ]);

  if (matchmakingError) throw matchmakingError;
  if (uploadError) throw uploadError;

  return !!matchmaking && !!upload;
}

export async function ensureOwnedControleUpload(matchmakingId: string, userId: string) {
  const { data, error } = await supabase
    .from("matchmaking_uploads")
    .select("id, matchmaking_id, uploaded_by")
    .eq("matchmaking_id", matchmakingId)
    .eq("uploaded_by", userId)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
