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

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function calcAgeOnEvent(
  dob: string | null | undefined,
  eventDate: string | null | undefined
): number | null {
  if (!dob || !eventDate) return null;

  const birth = new Date(dob);
  const event = new Date(eventDate);

  if (Number.isNaN(birth.getTime()) || Number.isNaN(event.getTime())) return null;

  let age = event.getFullYear() - birth.getFullYear();
  const monthDiff = event.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && event.getDate() < birth.getDate())) {
    age -= 1;
  }

  return Number.isFinite(age) ? age : null;
}

function avgWeight(row: any) {
  const r = toNum(row.rood_gewogen_gewicht);
  const b = toNum(row.blauw_gewogen_gewicht);

  if (r != null && b != null) return (r + b) / 2;
  if (r != null) return r;
  if (b != null) return b;
  return 999;
}

function inferYouthFromDatesOrType(row: any) {
  const leeftijdType = lower(row.leeftijd_type);
  if (leeftijdType === "jeugd") return true;
  if (leeftijdType === "volwassene") return false;

  const eventDate = row.evenement_datum ?? null;
  const ageR = calcAgeOnEvent(row.rood_geboortedatum, eventDate);
  const ageB = calcAgeOnEvent(row.blauw_geboortedatum, eventDate);

  const known = [ageR, ageB].filter((v): v is number => v != null);
  if (known.length === 0) return false;

  return Math.max(...known) < 18;
}

function youthSortAge(row: any) {
  const eventDate = row.evenement_datum ?? null;
  const ageR = calcAgeOnEvent(row.rood_geboortedatum, eventDate);
  const ageB = calcAgeOnEvent(row.blauw_geboortedatum, eventDate);

  const known = [ageR, ageB].filter((v): v is number => v != null);
  if (known.length === 0) return 999;

  return Math.max(...known);
}

function classRank(row: any) {
  if (inferYouthFromDatesOrType(row)) return 0;

  const k = lower(row.klasse_mm);

  if (k === "n") return 1;
  if (k === "c") return 2;
  if (k === "b") return 3;
  if (k === "a") return 4;

  return 9;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const definitiveMatchmakingId = norm((body as any)?.definitiveMatchmakingId);

    if (!definitiveMatchmakingId) {
      return NextResponse.json(
        { error: "definitiveMatchmakingId ontbreekt." },
        { status: 400 }
      );
    }

    const { userId } = await requireUserFromAuthHeader(req);
    const roleNames = await getUserRoleNames(supabaseAdmin, userId);

    const canSort =
      roleNames.includes("matchmaker") ||
      roleNames.includes("official") ||
      roleNames.includes("hoofdofficial") ||
      roleNames.includes("admin") ||
      roleNames.includes("superadmin");

    const isAdmin =
      roleNames.includes("admin") || roleNames.includes("superadmin");

    if (!canSort) {
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
      return NextResponse.json(
        { error: "Definitieve lineup niet gevonden." },
        { status: 404 }
      );
    }

    if (!isAdmin && lower(header.bondteam) !== lower(profile.bondteam)) {
      return NextResponse.json(
        { error: "Geen toegang tot dit bondteam." },
        { status: 403 }
      );
    }

    if (header.locked || header.status === "finalized") {
      return NextResponse.json(
        { error: "Deze lineup staat al vast en kan niet meer automatisch worden gesorteerd." },
        { status: 400 }
      );
    }

    const { data: bouts, error: boutsErr } = await supabaseAdmin
      .from("definitive_matchmaking_bouts")
      .select("*")
      .eq("definitive_matchmaking_id", definitiveMatchmakingId);

    if (boutsErr) {
      return NextResponse.json({ error: boutsErr.message }, { status: 500 });
    }

    const sorted = [...(bouts ?? [])].sort((a: any, b: any) => {
      const rankA = classRank(a);
      const rankB = classRank(b);
      if (rankA !== rankB) return rankA - rankB;

      const youthA = inferYouthFromDatesOrType(a);
      const youthB = inferYouthFromDatesOrType(b);

      if (youthA && youthB) {
        const ageA = youthSortAge(a);
        const ageB = youthSortAge(b);
        if (ageA !== ageB) return ageA - ageB;
      }

      const weightA = avgWeight(a);
      const weightB = avgWeight(b);
      if (weightA !== weightB) return weightA - weightB;

      return (a.partij_nr ?? 9999) - (b.partij_nr ?? 9999);
    });

    for (let i = 0; i < sorted.length; i++) {
      const row = sorted[i];

      const { error: updErr } = await supabaseAdmin
        .from("definitive_matchmaking_bouts")
        .update({ sort_order: i + 1 })
        .eq("id", row.id)
        .eq("definitive_matchmaking_id", definitiveMatchmakingId);

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      updated: sorted.length,
      rule:
        "Jeugd op leeftijd en gewicht, daarna N, C, B, A; binnen klasse lichter eerst, zwaarste achteraan.",
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout bij automatisch sorteren." },
      { status: 500 }
    );
  }
}