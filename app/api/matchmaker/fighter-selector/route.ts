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

function normalise(value: unknown) {
  return clean(value).toLocaleLowerCase("nl-NL");
}

type SchoolRow = {
  sportschool_id: number;
  naam: string;
  plaats?: string | null;
  canonical_naam?: string | null;
  is_alias?: boolean;
  aliases?: string[];
};

async function loadSchoolsWithAliases(
  schoolIds?: number[],
): Promise<SchoolRow[]> {
  const schools: SchoolRow[] = [];

  if (Array.isArray(schoolIds) && schoolIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("sportscholen")
      .select("sportschool_id, naam, plaats")
      .in("sportschool_id", schoolIds)
      .order("naam", { ascending: true });

    if (error) throw error;
    schools.push(...((data ?? []) as SchoolRow[]));
  } else {
    const pageSize = 1000;

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseAdmin
        .from("sportscholen")
        .select("sportschool_id, naam, plaats")
        .order("naam", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const batch = (data ?? []) as SchoolRow[];
      schools.push(...batch);

      if (batch.length < pageSize) break;
    }
  }

  const ids = schools
    .map((school) => Number(school.sportschool_id))
    .filter(Number.isFinite);

  if (!ids.length) return schools;

  const aliasRows: any[] = [];
  const aliasBatchSize = 500;

  for (let index = 0; index < ids.length; index += aliasBatchSize) {
    const idBatch = ids.slice(index, index + aliasBatchSize);
    const pageSize = 1000;

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseAdmin
        .from("sportschool_aliases")
        .select("sportschool_id, alias_text")
        .in("sportschool_id", idBatch)
        .order("alias_text", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const batch = data ?? [];
      aliasRows.push(...batch);
      if (batch.length < pageSize) break;
    }
  }

  const aliasesBySchool = new Map<number, string[]>();

  for (const alias of aliasRows) {
    const sportschoolId = Number((alias as any).sportschool_id);
    const aliasText = clean((alias as any).alias_text);
    if (!Number.isFinite(sportschoolId) || !aliasText) continue;

    const current = aliasesBySchool.get(sportschoolId) ?? [];
    if (!current.some((item) => item.toLowerCase() === aliasText.toLowerCase())) {
      current.push(aliasText);
    }
    aliasesBySchool.set(sportschoolId, current);
  }

  return schools.map((school) => ({
    ...school,
    canonical_naam: school.naam,
    is_alias: false,
    aliases: aliasesBySchool.get(Number(school.sportschool_id)) ?? [],
  }));
}

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

  const schools = schoolIds.length
    ? await loadSchoolsWithAliases(schoolIds)
    : [];

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

function fighterMatchesSearch(fighter: any, q: string, geboortedatum: string) {
  if (geboortedatum && clean(fighter?.geboortedatum) !== geboortedatum) return false;
  if (!q) return true;

  const needle = normalise(q);
  return (
    normalise(fighter?.naam).includes(needle) ||
    normalise(fighter?.va_nummer).includes(needle)
  );
}

export async function GET(req: Request) {
  try {
    await requireUserFromAuthHeader(req);
    const allowed = await hasAnyRoleFromReq(req, [
      "matchmaker",
      "official",
      "hoofdofficial",
      "admin",
      "superadmin",
    ]);
    if (!allowed) {
      return NextResponse.json({ error: "Geen rechten." }, { status: 403 });
    }

    const url = new URL(req.url);
    const sportschoolId = clean(url.searchParams.get("sportschool_id"));
    const q = clean(url.searchParams.get("q"));
    const geboortedatum = clean(url.searchParams.get("geboortedatum"));

    if (!sportschoolId && !q && !geboortedatum) {
      const schools = await loadSchoolsWithAliases();

      return NextResponse.json({
        sportscholen: schools.map((school) => ({
          ...school,
          zoeknamen: [school.naam, ...(school.aliases ?? [])],
        })),
      });
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

    const fighterColumns =
      "va_nummer, naam, geboortedatum, geslacht, primary_discipline, nulmeting_discipline, berekende_klasse, nulmeting_klasse, nulmeting_gewicht, email, fit_to_fight, licentie_actief, heeft_startverbod";

    if (vaFilter) {
      // De batchgrootte is alleen bedoeld om grote .in()-queries veilig te houden.
      // De uiteindelijke lijst mag NIET op 75 worden afgekapt: bij een gekozen
      // sportschool moet iedere actief gekoppelde vechter selecteerbaar zijn.
      const batchSize = 75;
      const loaded: any[] = [];

      for (let index = 0; index < vaFilter.length; index += batchSize) {
        const batch = vaFilter.slice(index, index + batchSize);

        let query = supabaseAdmin
          .from("fightpassport_fighters")
          .select(fighterColumns)
          .in("va_nummer", batch);

        if (geboortedatum) query = query.eq("geboortedatum", geboortedatum);

        const { data, error } = await query.order("naam", { ascending: true });
        if (error) throw error;
        loaded.push(...(data ?? []));
      }

      const uniqueByVa = new Map<string, any>();
      for (const fighter of loaded) {
        const fighterVa = clean(fighter?.va_nummer);
        if (fighterVa && !uniqueByVa.has(fighterVa) && fighterMatchesSearch(fighter, q, geboortedatum)) {
          uniqueByVa.set(fighterVa, fighter);
        }
      }

      const fighters = Array.from(uniqueByVa.values()).sort((a, b) =>
        clean(a?.naam).localeCompare(clean(b?.naam), "nl", { sensitivity: "base" }),
      );

      return NextResponse.json({
        fighters: await attachSchools(fighters),
        count: fighters.length,
        linked_va_count: vaFilter.length,
      });
    }

    let fighterQuery = supabaseAdmin
      .from("fightpassport_fighters")
      .select(fighterColumns);

    if (geboortedatum) {
      fighterQuery = fighterQuery.eq("geboortedatum", geboortedatum);
    }

    if (q) {
      const safe = q.replace(/[,%()]/g, " ").trim();
      if (/^\d+$/.test(safe)) {
        fighterQuery = fighterQuery.or(
          `va_nummer.ilike.%${safe}%,naam.ilike.%${safe}%`,
        );
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
