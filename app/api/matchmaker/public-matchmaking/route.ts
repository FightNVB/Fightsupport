import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader } from "@/lib/api/auth";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function s(value: unknown) {
  return String(value ?? "").trim();
}

async function requireAllowedUser(req: NextRequest) {
  const user = await requireUserFromAuthHeader(req);
  const role = s(user.role).toLowerCase();
  if (!role.includes("matchmaker") && !role.includes("admin") && !role.includes("superadmin")) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function GET(req: NextRequest) {
  try {
    await requireAllowedUser(req);
    const matchmakingId = s(req.nextUrl.searchParams.get("matchmakingId"));
    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmakingId ontbreekt" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("matchmaking_public_pages")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ ok: true, publication: data ?? null });
  } catch (error: any) {
    const message = s(error?.message) || "Openbare matchmaking laden mislukt";
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAllowedUser(req);
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmakingId);
    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmakingId ontbreekt" }, { status: 400 });
    }

    const { data: matchmaking, error: mmError } = await supabaseAdmin
      .from("matchmakings")
      .select("*")
      .eq("id", matchmakingId)
      .maybeSingle();

    if (mmError) throw mmError;
    if (!matchmaking) {
      return NextResponse.json({ error: "Matchmaking niet gevonden" }, { status: 404 });
    }

    const payload = {
      matchmaking_id: matchmakingId,
      is_enabled: body?.is_enabled !== false,
      show_pending: body?.show_pending !== false,
      show_opponent_search: body?.show_opponent_search !== false,
      public_title: s(body?.public_title) || s(matchmaking.event_naam) || s(matchmaking.naam) || null,
      public_location: s(body?.public_location) || s(matchmaking.event_locatie) || s(matchmaking.locatie) || null,
      public_disciplines: s(body?.public_disciplines) || s(matchmaking.discipline) || null,
      created_by: user.userId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("matchmaking_public_pages")
      .upsert(payload, { onConflict: "matchmaking_id" })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, publication: data });
  } catch (error: any) {
    const message = s(error?.message) || "Openbare matchmaking opslaan mislukt";
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
