import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function requireMatchmakerAccess(req: Request, matchmakerMatchmakingId: number) {
  const { userId, role } = await requireUserWithRole(req);
  const roleNorm = String(role ?? "").toLowerCase();
  const isAdmin =
    roleNorm.includes("superadmin") ||
    roleNorm.includes("admin") ||
    roleNorm.includes("hoofdofficial");

  const { data, error } = await supabaseAdmin
    .from("matchmaker_matchmakings")
    .select("id, created_by, status")
    .eq("id", matchmakerMatchmakingId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Matchmaker matchmaking niet gevonden.");

  if (!isAdmin && String(data.created_by ?? "") !== String(userId)) {
    throw new Error("Geen toegang tot deze matchmaker matchmaking.");
  }

  return {
    userId,
    role: roleNorm,
    matchmaking: data,
  };
}
