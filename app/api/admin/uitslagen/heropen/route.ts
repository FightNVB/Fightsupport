import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function norm(v: unknown) {
  return clean(v).toUpperCase();
}

function missingColumn(error: any) {
  const msg = String(error?.message ?? error ?? "").toLowerCase();
  return msg.includes("could not find") || msg.includes("schema cache") || msg.includes("column") || msg.includes("42703");
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env mist: NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getUserIdFromBearer(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase env mist: NEXT_PUBLIC_SUPABASE_URL of NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  const authClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromBearer(req);
    if (!userId) return bad("Unauthorized", 401);

    const body = await req.json().catch(() => ({}));
    const matchmakingId = clean(body.matchmaking_id);
    if (!matchmakingId) return bad("matchmaking_id ontbreekt");

    const supabase = adminClient();

    const { data: roleRows, error: rolesErr } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", userId);

    if (rolesErr) return bad(rolesErr.message, 500);

    const roles = new Set(
      (roleRows ?? [])
        .map((r: any) => clean(r?.roles?.name).toLowerCase())
        .filter(Boolean)
    );

    if (!roles.has("superadmin")) {
      return bad("Alleen superadmin mag gefinaliseerde uitslagen op bewerken zetten.", 403);
    }

    const { data: profile, error: profileErr } = await supabase
      .from("user_profiles")
      .select("bondteam")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) return bad(profileErr.message, 500);
    const userBondteam = norm((profile as any)?.bondteam);

    const { data: mm, error: mmErr } = await supabase
      .from("matchmakings")
      .select("id, bondteam, huidige_eigenaar_bondteam, status, stadium")
      .eq("id", matchmakingId)
      .maybeSingle();

    if (mmErr) return bad(mmErr.message, 500);
    if (!mm) return bad("Matchmaking niet gevonden.", 404);

    const mmBondteam = norm((mm as any)?.huidige_eigenaar_bondteam || (mm as any)?.bondteam);
    if (userBondteam !== "NVB" && mmBondteam && userBondteam !== mmBondteam) {
      return bad("Je mag alleen uitslagen van je eigen bondteam op bewerken zetten.", 403);
    }

    const now = new Date().toISOString();

    const { error: runErr } = await supabase
      .from("uitslagen_runs")
      .update({ status: "open" })
      .eq("matchmaking_id", matchmakingId);

    if (runErr) return bad(runErr.message, 500);

    const { error: resultErr } = await supabase
      .from("uitslagen_resultaten")
      .update({ uitslag_status: "definitief", updated_at: now })
      .eq("matchmaking_id", matchmakingId);

    if (resultErr) return bad(resultErr.message, 500);

    const { error: mmCoreErr } = await supabase
      .from("matchmakings")
      .update({
        stadium: "uitslagen_in_bewerking",
        status: "uitslagen_in_bewerking",
        huidige_eigenaar_type: "bondteam",
        huidige_eigenaar_user_id: null,
        huidige_eigenaar_bondteam: mmBondteam || null,
        locked_for_editing: false,
        last_updated_at: now,
        last_updated_by: userId,
      })
      .eq("id", matchmakingId);

    if (mmCoreErr) return bad(mmCoreErr.message, 500);

    const { error: uploadErr } = await supabase
      .from("matchmaking_uploads")
      .update({ flow_status: "in_uitslagen" })
      .eq("matchmaking_id", matchmakingId);

    if (uploadErr && !missingColumn(uploadErr)) {
      console.warn("[admin/uitslagen/heropen] optionele upload update mislukt:", uploadErr.message);
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      status: "uitslagen_in_bewerking",
      message: "Uitslagen zijn opnieuw op bewerken gezet.",
    });
  } catch (e: any) {
    console.error("[admin/uitslagen/heropen]", e);
    return bad(e?.message ?? "Heropenen mislukt", 500);
  }
}
