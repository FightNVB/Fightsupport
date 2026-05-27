import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function lower(v: unknown) {
  return s(v).toLowerCase();
}

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function getUserFromBearer(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { userId: null as string | null, error: "Geen bearer token ontvangen." };

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user?.id) {
    return { userId: null as string | null, error: error?.message ?? "Niet ingelogd." };
  }

  return { userId: data.user.id as string, error: null as string | null };
}

async function getRoles(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  if (error) throw error;

  return Array.from(
    new Set(
      (data ?? [])
        .map((r: any) => lower(r?.roles?.name))
        .filter(Boolean)
    )
  );
}

async function getUserBondteam(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("bondteam")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return s((data as any)?.bondteam).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const { userId, error: authError } = await getUserFromBearer(req);
    if (!userId) return bad(authError ?? "Unauthorized", 401);

    const roles = await getRoles(userId);
    const allowed = roles.some((r) => ["official", "hoofdofficial", "admin", "superadmin"].includes(r));
    if (!allowed) return bad("Geen rechten om naar admin archief te verplaatsen.", 403);

    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmaking_id);
    if (!matchmakingId) return bad("matchmaking_id ontbreekt.");

    const { data: mm, error: mmErr } = await supabaseAdmin
      .from("matchmakings")
      .select("id, naam, bondteam, huidige_eigenaar_bondteam, status, stadium")
      .eq("id", matchmakingId)
      .maybeSingle();

    if (mmErr) throw mmErr;
    if (!mm) return bad("Matchmaking niet gevonden.", 404);

    const userBondteam = await getUserBondteam(userId);
    const mmBondteam = s((mm as any).huidige_eigenaar_bondteam || (mm as any).bondteam).toUpperCase();
    const isNvbSuperadmin = roles.includes("superadmin") && userBondteam === "NVB";

    if (!isNvbSuperadmin && userBondteam && mmBondteam && userBondteam !== mmBondteam) {
      return bad("Je mag alleen matchmakings van je eigen bondteam verplaatsen.", 403);
    }

    const currentStage = lower((mm as any).stadium || (mm as any).status);
    const isFinished = currentStage === "uitslagen_definitief" || currentStage === "afgerond";
    if (!isFinished) {
      return bad("Alleen afgeronde matchmakings kunnen naar Admin Archief worden verplaatst.", 409);
    }

    const now = new Date().toISOString();

    const { error: updErr } = await supabaseAdmin
      .from("matchmakings")
      .update({
        status: "admin_archief",
        stadium: "admin_archief",
        huidige_eigenaar_type: "admin",
        huidige_eigenaar_user_id: null,
        huidige_eigenaar_bondteam: mmBondteam || null,
        is_archived: true,
        locked_for_editing: true,
        last_updated_at: now,
        last_updated_by: userId,
      })
      .eq("id", matchmakingId);

    if (updErr) throw updErr;

    await supabaseAdmin
      .from("matchmaking_uploads")
      .update({ flow_status: "admin_archief" })
      .eq("matchmaking_id", matchmakingId);

    await supabaseAdmin.from("matchmaking_flow_log").insert({
      matchmaking_id: matchmakingId,
      actie_type: "naar_admin_archief",
      van_stadium: currentStage || null,
      naar_stadium: "admin_archief",
      van_eigenaar_type: "bondteam",
      naar_eigenaar_type: "admin",
      naar_eigenaar_bondteam: mmBondteam || null,
      actor_user_id: userId,
      actor_role: roles[0] ?? null,
      opmerking: "Afgeronde matchmaking vanuit officials archief naar Admin Archief verplaatst.",
      metadata: { route: "api/admin/archief/verplaats" },
    });

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      status: "admin_archief",
    });
  } catch (e: any) {
    console.error("[admin/archief/verplaats]", e);
    return bad(e?.message ?? "Verplaatsen naar Admin Archief mislukt.", 500);
  }
}
