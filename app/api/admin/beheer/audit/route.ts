import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseFromAuthHeader(authHeader: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase env vars ontbreken.");
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
    }

    const supabase = getSupabaseFromAuthHeader(authHeader);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const q = String(searchParams.get("q") ?? "").trim();
    const action = String(searchParams.get("action") ?? "").trim();
    const matchmaking_id = String(searchParams.get("matchmaking_id") ?? "").trim();
    const actor = String(searchParams.get("actor") ?? "").trim();
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? 100), 1),
      300
    );

    let query = supabase
      .from("admin_beheer_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (action) {
      query = query.eq("action", action);
    }

    if (matchmaking_id) {
      query = query.eq("matchmaking_id", matchmaking_id);
    }

    if (actor) {
      query = query.or(
        `actor_email.ilike.%${actor}%,actor_role.ilike.%${actor}%`
      );
    }

    if (q) {
      query = query.or(
        [
          `action.ilike.%${q}%`,
          `entity_type.ilike.%${q}%`,
          `actor_email.ilike.%${q}%`,
          `actor_role.ilike.%${q}%`,
          `matchmaking_id.ilike.%${q}%`,
        ].join(",")
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("audit GET error:", error);
      return NextResponse.json(
        { error: "Kon audit log niet laden." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      items: data ?? [],
    });
  } catch (error: any) {
    console.error("audit GET fatal:", error);
    return NextResponse.json(
      { error: error?.message ?? "Onbekende fout." },
      { status: 500 }
    );
  }
}