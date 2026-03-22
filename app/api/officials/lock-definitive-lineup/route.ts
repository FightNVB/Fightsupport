import { NextResponse } from "next/server";
import {
  requireUserFromAuthHeader,
  getUserRoleNames,
  supabaseAdmin,
} from "@/lib/api/requireRole";

function norm(v: unknown) {
  return String(v ?? "").trim();
}

function lower(v: unknown) {
  return norm(v).toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const definitiveMatchmakingId = norm((body as any)?.definitiveMatchmakingId);

    if (!definitiveMatchmakingId) {
      return NextResponse.json({ error: "definitiveMatchmakingId ontbreekt." }, { status: 400 });
    }

    const { user, userId } = await requireUserFromAuthHeader(req);
    const roleNames = await getUserRoleNames(supabaseAdmin, userId);

    const canLock =
      roleNames.includes("matchmaker") ||
      roleNames.includes("hoofdofficial") ||
      roleNames.includes("admin") ||
      roleNames.includes("superadmin");

    const isAdmin =
      roleNames.includes("admin") || roleNames.includes("superadmin");

    if (!canLock) {
      return NextResponse.json(
        { error: "Geen toegang om definitief op te slaan." },
        { status: 403 }
      );
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("user_profiles")
      .select("id, bondteam")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Gebruikersprofiel niet gevonden." }, { status: 403 });
    }

    const { data: header, error: headerErr } = await supabaseAdmin
      .from("definitive_matchmakings")
      .select("*")
      .eq("id", definitiveMatchmakingId)
      .single();

    if (headerErr || !header) {
      return NextResponse.json({ error: "Definitieve lineup niet gevonden." }, { status: 404 });
    }

    if (!isAdmin && lower(header.bondteam) !== lower(profile.bondteam)) {
      return NextResponse.json({ error: "Geen toegang tot dit bondteam." }, { status: 403 });
    }

    if (header.locked || header.status === "finalized") {
      return NextResponse.json(
        { error: "Deze lineup staat al definitief vast." },
        { status: 400 }
      );
    }

    const { data: bouts, error: boutsErr } = await supabaseAdmin
      .from("definitive_matchmaking_bouts")
      .select("id")
      .eq("definitive_matchmaking_id", definitiveMatchmakingId);

    if (boutsErr) {
      return NextResponse.json({ error: boutsErr.message }, { status: 500 });
    }

    if (!bouts || bouts.length === 0) {
      return NextResponse.json({ error: "Geen partijen in deze lineup." }, { status: 400 });
    }

    const { error: headerUpdateErr } = await supabaseAdmin
      .from("definitive_matchmakings")
      .update({
        status: "finalized",
        locked: true,
        finalized_at: new Date().toISOString(),
        finalized_by: user.id,
      })
      .eq("id", definitiveMatchmakingId);

    if (headerUpdateErr) {
      return NextResponse.json({ error: headerUpdateErr.message }, { status: 500 });
    }

    const { error: boutUpdateErr } = await supabaseAdmin
      .from("definitive_matchmaking_bouts")
      .update({ is_locked: true })
      .eq("definitive_matchmaking_id", definitiveMatchmakingId);

    if (boutUpdateErr) {
      return NextResponse.json({ error: boutUpdateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout bij definitief opslaan." },
      { status: 500 }
    );
  }
}