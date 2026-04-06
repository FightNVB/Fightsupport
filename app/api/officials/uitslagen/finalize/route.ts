import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return bad("Missing bearer token", 401);

    const authClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) return bad("Unauthorized", 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const matchmaking_id = String(body.matchmaking_id ?? "").trim();
    if (!matchmaking_id) return bad("matchmaking_id ontbreekt");

    const { data: definitiveRows, error: definitiveErr } = await admin
      .from("definitive_matchmaking_bouts")
      .select("id")
      .eq("matchmaking_id", matchmaking_id)
      .order("sort_order", { ascending: true })
      .order("partij_nr", { ascending: true });

    if (definitiveErr) return bad(definitiveErr.message, 500);
    if (!definitiveRows?.length) return bad("Geen definitieve lineup gevonden.", 404);

    const { data: resultRows, error: resultErr } = await admin
      .from("uitslagen_officieel")
      .select("id, definitive_bout_id")
      .eq("matchmaking_id", matchmaking_id);

    if (resultErr) return bad(resultErr.message, 500);

    const resultBoutIds = new Set(
      (resultRows ?? []).map((x: any) => String(x.definitive_bout_id ?? ""))
    );

    const missingCount = definitiveRows.filter(
      (x: any) => !resultBoutIds.has(String(x.id))
    ).length;

    if (missingCount > 0) {
      return bad(`Nog niet alle partijen hebben een uitslag. Ontbrekend: ${missingCount}.`);
    }

    const now = new Date().toISOString();

    const { error: upErr } = await admin
      .from("uitslagen_officieel")
      .update({
        finalized: true,
        finalized_at: now,
        finalized_by: userRes.user.id,
        updated_at: now,
      })
      .eq("matchmaking_id", matchmaking_id)
      .eq("finalized", false);

    if (upErr) return bad(upErr.message, 500);

    return NextResponse.json({ ok: true, matchmaking_id });
  } catch (e: any) {
    return bad(e?.message ?? String(e), 500);
  }
}