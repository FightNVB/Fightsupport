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
    const items = Array.isArray((body as any)?.items) ? (body as any).items : [];

    if (!definitiveMatchmakingId) {
      return NextResponse.json({ error: "definitiveMatchmakingId ontbreekt." }, { status: 400 });
    }

    const { userId } = await requireUserFromAuthHeader(req);
    const roleNames = await getUserRoleNames(supabaseAdmin, userId);

    const canReorder =
      roleNames.includes("matchmaker") ||
      roleNames.includes("official") ||
      roleNames.includes("hoofdofficial") ||
      roleNames.includes("admin") ||
      roleNames.includes("superadmin");

    const isAdmin =
      roleNames.includes("admin") || roleNames.includes("superadmin");

    if (!canReorder) {
      return NextResponse.json({ error: "Geen toegang." }, { status: 403 });
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
        { error: "Deze lineup staat al vast en kan niet meer worden gewijzigd." },
        { status: 400 }
      );
    }

    for (const item of items) {
      const boutId = norm(item?.id);
      const sortOrder = Number(item?.sort_order);

      if (!boutId || !Number.isFinite(sortOrder)) continue;

      const { error: updErr } = await supabaseAdmin
        .from("definitive_matchmaking_bouts")
        .update({ sort_order: sortOrder })
        .eq("id", boutId)
        .eq("definitive_matchmaking_id", definitiveMatchmakingId);

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout bij herschikken van lineup." },
      { status: 500 }
    );
  }
}