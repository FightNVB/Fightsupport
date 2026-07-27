import { NextResponse } from "next/server";
import {
  hasAnyRoleFromReq,
  requireUserFromAuthHeader,
  supabaseAdmin,
} from "@/lib/api/requireRole";

export const runtime = "nodejs";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

type SchoolRow = {
  sportschool_id: number;
  naam: string;
  plaats?: string | null;
};

async function attachSchools(fighters: any[]) {
  const vaNummers = [...new Set(fighters.map((row) => clean(row.va_nummer)).filter(Boolean))];
  if (!vaNummers.length) return fighters;

  const { data: links, error: linkError } = await supabaseAdmin
    .from("fightpassport_school_fighters")
    .select("va_nummer, sportschool_id")
    .in("va_nummer", vaNummers)
    .eq("actief", true);

  if (linkError) throw linkError;

  const schoolIds = [
    ...new Set((links ?? []).map((row: any) => Number(row.sportschool_id)).filter(Number.isFinite)),
  ];

  let schools: SchoolRow[] = [];
  if (schoolIds.length) {
    const { data, error } = await supabaseAdmin
      .from("sportscholen")
      .select("sportschool_id, naam, plaats")
      .in("sportschool_id", schoolIds)
      .order("naam", { ascending: true });
    if (error) throw error;
    schools = (data ?? []) as SchoolRow[];
  }

  const schoolById = new Map(schools.map((school) => [Number(school.sportschool_id), school]));
  const schoolsByVa = new Map<string, SchoolRow[]>();

  for (const link of links ?? []) {
    const va = clean((link as any).va_nummer);
    const school = schoolById.get(Number((link as any).sportschool_id));
    if (!va || !school) continue;
    const current = schoolsByVa.get(va) ?? [];
    current.push(school);
    schoolsByVa.set(va, current);
  }

  return fighters.map((fighter) => ({
    ...fighter,
    sportscholen: schoolsByVa.get(clean(fighter.va_nummer)) ?? [],
  }));
}

export async function GET(req: Request) {
  try {
    await requireUserFromAuthHeader(req);
    const allowed = await hasAnyRoleFromReq(req, ["matchmaker", "admin", "superadmin"]);
    if (!allowed) {
      return NextResponse.json({ error: "Geen rechten." }, { status: 403 });
    }

    const url = new URL(req.url);
    const sportschoolId = clean(url.searchParams.get("sportschool_id"));
    const q = clean(url.searchParams.get("q"));

    if (!sportschoolId && !q) {
      const { data, error } = await supabaseAdmin
        .from("sportscholen")
        .select("sportschool_id, naam, plaats")
        .order("naam", { ascending: true });
      if (error) throw error;
      return NextResponse.json({ sportscholen: data ?? [] });
    }

    let vaFilter: string[] | null = null;
    if (sportschoolId) {
      const { data: links, error: linkError } = await supabaseAdmin
        .from("fightpassport_school_fighters")
        .select("va_nummer")
        .eq("sportschool_id", Number(sportschoolId))
        .eq("actief", true);
      if (linkError) throw linkError;
      vaFilter = [...new Set((links ?? []).map((row: any) => clean(row.va_nummer)).filter(Boolean))];
      if (!vaFilter.length) return NextResponse.json({ fighters: [] });
    }

    let fighterQuery = supabaseAdmin
      .from("fightpassport_fighters")
      .select(
        "va_nummer, naam, geboortedatum, geslacht, primary_discipline, nulmeting_discipline, berekende_klasse, nulmeting_klasse, nulmeting_gewicht, email, fit_to_fight, licentie_actief, heeft_startverbod",
      );

    if (vaFilter) fighterQuery = fighterQuery.in("va_nummer", vaFilter);

    if (q) {
      const safe = q.replace(/[,%()]/g, " ").trim();
      if (/^\d+$/.test(safe)) {
        fighterQuery = fighterQuery.or(`va_nummer.ilike.%${safe}%,naam.ilike.%${safe}%`);
      } else {
        fighterQuery = fighterQuery.ilike("naam", `%${safe}%`);
      }
    }

    const { data: fighters, error: fighterError } = await fighterQuery
      .order("naam", { ascending: true })
      .limit(75);

    if (fighterError) throw fighterError;
    return NextResponse.json({ fighters: await attachSchools(fighters ?? []) });
  } catch (error: any) {
    console.error("[matchmaker/fighter-selector]", error);
    return NextResponse.json(
      { error: error?.message || "Vechters konden niet worden geladen." },
      { status: 500 },
    );
  }
}
