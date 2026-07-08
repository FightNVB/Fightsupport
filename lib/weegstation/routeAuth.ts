import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireAnyRole } from "@/app/api/_utils/authz";

export type WeegstationRole =
  | "superadmin"
  | "admin"
  | "promotor"
  | "matchmaker"
  | "official"
  | "hoofdofficial"
  | "dispensatie_admin";

type AuthContext = {
  userId: string;
  roles: WeegstationRole[];
  isAdminLike: boolean;
  isHoofdofficialLike: boolean;
  bondteam: string;
  admin: SupabaseClient;
};

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

export async function getWeegstationAuthContext(
  req: Request,
  matchmakingId?: string
): Promise<AuthContext> {
  const admin = createSupabaseAdmin();
  const auth = await requireAnyRole(req, [
    "official",
    "hoofdofficial",
    "admin",
    "superadmin",
    "dispensatie_admin",
  ]);

  const roles = [auth.role as WeegstationRole];
  const isAdminLike = roles.some((r) =>
    ["admin", "superadmin", "dispensatie_admin"].includes(r)
  );

  const isHoofdofficialLike = roles.some((r) =>
    ["hoofdofficial", "superadmin", "dispensatie_admin"].includes(r)
  );

  const bondteam = String(auth.profile?.bondteam ?? "").trim();

  if (matchmakingId) {
    const { data: mm, error: mmErr } = await admin
      .from("matchmaking_uploads")
      .select("matchmaking_id, bondteam")
      .eq("matchmaking_id", matchmakingId)
      .single();

    if (mmErr) {
      throw new Error(mmErr.message);
    }

    const mmBondteam = String(mm?.bondteam ?? "").trim().toLowerCase();

    const teamAccess =
      roles.some((r) => r === "official" || r === "hoofdofficial") &&
      !!mmBondteam &&
      mmBondteam === bondteam.toLowerCase();

    if (!isAdminLike && !teamAccess) {
      throw new Error("Je mag alleen matchmakings van je eigen bondteam zien en bewerken.");
    }
  }

  return {
    userId: auth.userId,
    roles,
    isAdminLike,
    isHoofdofficialLike,
    bondteam,
    admin,
  };
}
