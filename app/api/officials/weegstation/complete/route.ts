import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

async function getUserFromBearer(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) return { user: null, error: "Geen bearer token ontvangen." };

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const { data, error } = await supabaseUser.auth.getUser();
  if (error || !data?.user) {
    return { user: null, error: error?.message ?? "Niet ingelogd." };
  }

  return { user: data.user, error: null };
}

async function getRolesForUser(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  if (error) throw error;

  return Array.from(
    new Set(
      (data ?? [])
        .map((r: any) => String(r?.roles?.name ?? "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authErr } = await getUserFromBearer(req);
    if (!user) {
      return NextResponse.json(
        { error: authErr ?? "Niet ingelogd." },
        { status: 401 }
      );
    }

    const roles = await getRolesForUser(user.id);
    const canStartWeegstation =
      roles.includes("official") ||
      roles.includes("hoofdofficial") ||
      roles.includes("superadmin");

    if (!canStartWeegstation) {
      return NextResponse.json(
        { error: "Alleen official, hoofdofficial of superadmin mag weegstation starten." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmakingId);

    if (!matchmakingId) {
      return NextResponse.json(
        { error: "matchmakingId ontbreekt." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    const { error: mmErr } = await supabaseAdmin
      .from("matchmakings")
      .update({
        stadium: "in_weegstation",
        entered_weegstation_at: nowIso,
        last_updated_at: nowIso,
        last_updated_by: user.id,
      })
      .eq("id", matchmakingId);

    if (mmErr) throw mmErr;

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      stadium: "in_weegstation",
      message: "Weegstation is gestart.",
    });
  } catch (err: any) {
    console.error("weegstation/complete POST error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Starten van weegstation mislukt." },
      { status: 500 }
    );
  }
}