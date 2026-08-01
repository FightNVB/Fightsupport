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
  canonical_naam?: string | null;
  is_alias?: boolean;
  aliases?: string[];
};

async function loadSchoolsWithAliases(
  schoolIds?: number[],
): Promise<SchoolRow[]> {
  const schools: SchoolRow[] = [];

  if (Array.isArray(schoolIds) && schoolIds.length > 0) {
    // Bij gekoppelde vechters is de lijst beperkt en kan één IN-query volstaan.
    const { data, error } = await supabaseAdmin
      .from("sportscholen")
      .select("sportschool_id, naam, plaats")
      .in("sportschool_id", schoolIds)
      .order("naam", { ascending: true });

    if (error) throw error;
    schools.push(...((data ?? []) as SchoolRow[]));
  } else {
    // Supabase/PostgREST retourneert standaard maximaal circa 1000 regels.
    // Haal daarom alle sportscholen paginagewijs op, anders stopt de dropdown
    // alfabetisch rond de G en ontbreken onder meer sportscholen bij K.
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

  // Ook de aliasquery in kleinere ID-batches uitvoeren. Daarmee vermijden we
  // een te lange IN-filter en verliezen we geen aliassen door een row-limit.
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
      const schools = await loadSchoolsWithAliases();

      return NextResponse.json({
        // Altijd exact één rij per sportschool_id. Aliassen blijven als
        // zoeknamen aan de canonieke sportschool gekoppeld, zodat de UI geen
        // dubbele React-keys of dubbele dropdownopties krijgt.
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

    // Een sportschool kan veel meer dan 75 actieve vechters hebben. Laad de
    // gekoppelde VA-nummers daarom in veilige batches en geef alle unieke
    // vechters terug. Zo vermijden we ook een te lange enkele IN-query.
    if (vaFilter) {
      const batchSize = 75;
      const loaded: any[] = [];

      for (let index = 0; index < vaFilter.length; index += batchSize) {
        const batch = vaFilter.slice(index, index + batchSize);

        const { data, error } = await supabaseAdmin
          .from("fightpassport_fighters")
          .select(fighterColumns)
          .in("va_nummer", batch)
          .order("naam", { ascending: true });

        if (error) throw error;
        loaded.push(...(data ?? []));
      }

      const uniqueByVa = new Map<string, any>();
      for (const fighter of loaded) {
        const va = clean(fighter?.va_nummer);
        if (va && !uniqueByVa.has(va)) uniqueByVa.set(va, fighter);
      }

      const fighters = Array.from(uniqueByVa.values()).sort((a, b) =>
        clean(a?.naam).localeCompare(clean(b?.naam), "nl", {
          sensitivity: "base",
        }),
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
