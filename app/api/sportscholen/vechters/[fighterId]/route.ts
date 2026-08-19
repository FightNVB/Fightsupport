import { NextResponse } from "next/server";
import { requireAnyRole, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanId(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeVa(v: unknown) {
  return String(v ?? "")
    .trim()
    .replace(/^VA\s*/i, "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function trainerHasAccess(userId: string, sportschoolId: string) {
  const sportschoolIdText = cleanId(sportschoolId);
  const sportschoolIdNumber = Number(sportschoolIdText);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .select("id, role, meekijk_sportschool_id, active_sportschool_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;

  const meekijk = cleanId((profile as any)?.meekijk_sportschool_id);
  const active = cleanId((profile as any)?.active_sportschool_id);

  if (meekijk && meekijk === sportschoolIdText) return true;
  if (active && active === sportschoolIdText) return true;

  let query = supabaseAdmin
    .from("sportschool_contactpersonen")
    .select("id")
    .eq("user_id", userId)
    .eq("actief", true)
    .limit(1);

  query = Number.isFinite(sportschoolIdNumber)
    ? query.eq("sportschool_id", sportschoolIdNumber)
    : query.eq("sportschool_id", sportschoolIdText);

  const { data, error } = await query;
  if (error) throw error;

  return !!data?.length;
}

function safeFighter(link: any, fp: any) {
  return {
    // id blijft de koppeling-id. De sportschoolpagina gebruikt deze id ook
    // voor wijzigingsmeldingen en voor de detailroute.
    id: link.id,
    sportschool_id: link.sportschool_id,
    va_nummer: normalizeVa(fp?.va_nummer ?? link.va_nummer),

    naam: fp?.naam ?? link.naam ?? null,
    fp_naam: fp?.naam ?? null,
    geboortedatum: fp?.geboortedatum ?? null,
    fp_geboortedatum: fp?.geboortedatum ?? null,
    geslacht: fp?.geslacht ?? link.geslacht ?? null,
    email: fp?.email ?? null,

    primary_discipline: fp?.primary_discipline ?? null,
    discipline: fp?.primary_discipline ?? fp?.nulmeting_discipline ?? null,
    klasse:
      fp?.mma_level ??
      fp?.berekende_klasse ??
      fp?.nulmeting_klasse ??
      null,
    berekende_klasse: fp?.berekende_klasse ?? null,
    mma_level: fp?.mma_level ?? null,

    fit_to_fight: fp?.fit_to_fight ?? null,
    licentie_actief: fp?.licentie_actief ?? false,
    heeft_licentie: fp?.licentie_actief ?? false,
    licentie: fp?.licentie_actief ? "actief" : "niet actief",
    licentie_status: fp?.licentie_actief ? "actief" : "niet actief",

    heeft_startverbod: fp?.heeft_startverbod ?? false,
    startverbod: fp?.heeft_startverbod ?? false,

    totaal_wedstrijden: fp?.totaal_wedstrijden ?? 0,
    gewonnen: fp?.gewonnen ?? 0,
    verloren: fp?.verloren ?? 0,
    onbeslist: fp?.onbeslist ?? 0,
    kos: fp?.kos ?? 0,

    nulmeting_gewicht: fp?.nulmeting_gewicht ?? null,
    nulmeting_discipline: fp?.nulmeting_discipline ?? null,
    nulmeting_klasse: fp?.nulmeting_klasse ?? null,
    nulmeting_totaal: fp?.nulmeting_totaal ?? 0,
    nulmeting_gewonnen: fp?.nulmeting_gewonnen ?? 0,
    nulmeting_verloren: fp?.nulmeting_verloren ?? 0,
    nulmeting_onbeslist: fp?.nulmeting_onbeslist ?? 0,
    nulmeting_kos: fp?.nulmeting_kos ?? 0,
    nulmeting_opmerking: fp?.nulmeting_opmerking ?? null,

    updated_at: fp?.updated_at ?? link.updated_at ?? null,
    last_scraped_at: fp?.last_scraped_at ?? null,
  };
}

function safeResult(row: any) {
  return {
    id: row?.id ?? null,
    va_nummer: normalizeVa(row?.va_nummer),
    datum: row?.datum ?? null,
    evenement: row?.evenement ?? row?.event ?? null,
    tegenstander: row?.tegenstander ?? null,
    sportschool:
      row?.sportschool ??
      row?.tegenstander_sportschool ??
      row?.sportschool_naam ??
      null,
    discipline: row?.discipline ?? null,
    klasse: row?.klasse ?? null,
    gewicht: row?.gewicht ?? null,
    uitslag: row?.uitslag ?? row?.resultaat ?? null,
  };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ fighterId: string }> | { fighterId: string } },
) {
  try {
    const auth = await requireAnyRole(
      req,
      ["trainer", "admin", "superadmin"] as any,
    );
    const userId = (auth as any).userId;
    const role = (auth as any).role;

    const resolvedParams = await Promise.resolve(ctx.params as any);
    const key = cleanId(resolvedParams?.fighterId);

    if (!key) {
      return NextResponse.json(
        { error: "Vechter id ontbreekt" },
        { status: 400 },
      );
    }

    const url = new URL(req.url);
    const sportschoolIdParam = cleanId(
      url.searchParams.get("sportschool_id"),
    );

    // 1) Eerst de sportschool/VA-koppeling bepalen.
    let linkQuery = supabaseAdmin
      .from("fightpassport_school_fighters")
      .select(
        "id,sportschool_id,va_nummer,naam,geslacht,actief,updated_at",
      )
      .eq("actief", true);

    if (isUuid(key)) {
      linkQuery = linkQuery.eq("id", key);
    } else {
      const va = normalizeVa(key);
      if (!va) {
        return NextResponse.json(
          { error: "Ongeldig vechter id" },
          { status: 400 },
        );
      }

      linkQuery = linkQuery.eq("va_nummer", va);
      if (sportschoolIdParam) {
        const nr = Number(sportschoolIdParam);
        linkQuery = Number.isFinite(nr)
          ? linkQuery.eq("sportschool_id", nr)
          : linkQuery.eq("sportschool_id", sportschoolIdParam);
      }
    }

    const { data: links, error: linkError } = await linkQuery.limit(2);

    if (linkError) throw linkError;
    if (!links?.length) {
      return NextResponse.json(
        { error: "Vechter niet gevonden bij deze sportschool" },
        { status: 404 },
      );
    }

    if (links.length > 1) {
      return NextResponse.json(
        {
          error:
            "Meerdere sportschoolkoppelingen gevonden. Open de vechter via de id of geef sportschool_id mee.",
        },
        { status: 409 },
      );
    }

    const link = links[0] as any;
    const sportschoolId = cleanId(link.sportschool_id);
    const vaNummer = normalizeVa(link.va_nummer);

    if (!sportschoolId || !vaNummer) {
      return NextResponse.json(
        { error: "Sportschool of VA-nummer ontbreekt bij deze koppeling" },
        { status: 500 },
      );
    }

    // 2) Rechten blijven hetzelfde als voorheen.
    if (role !== "admin" && role !== "superadmin") {
      const allowed = await trainerHasAccess(userId, sportschoolId);
      if (!allowed) {
        return NextResponse.json(
          { error: "Geen toegang tot deze vechter" },
          { status: 403 },
        );
      }
    }

    // 3) Sportschool en actuele FightPassport-vechter parallel ophalen.
    const [schoolRes, fighterRes] = await Promise.all([
      supabaseAdmin
        .from("sportscholen")
        .select(
          "sportschool_id, naam, plaats, land, keurmerk_start, keurmerk_einde",
        )
        .eq("sportschool_id", Number.isFinite(Number(sportschoolId)) ? Number(sportschoolId) : sportschoolId)
        .maybeSingle(),

      supabaseAdmin
        .from("fightpassport_fighters")
        .select("*")
        .eq("va_nummer", vaNummer)
        .maybeSingle(),
    ]);

    if (schoolRes.error) throw schoolRes.error;
    if (fighterRes.error) throw fighterRes.error;

    if (!fighterRes.data) {
      return NextResponse.json(
        { error: `VA ${vaNummer} niet gevonden in fightpassport_fighters` },
        { status: 404 },
      );
    }

    // 4) Wedstrijdhistorie rechtstreeks uit de centrale FightPassport-resultaten.
    // fightpassport_results is in de controle-engine de leidende uitslagenbron.
    const { data: resultRows, error: resultsError } = await supabaseAdmin
      .from("fightpassport_results")
      .select("*")
      .eq("va_nummer", vaNummer)
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (resultsError) throw resultsError;

    const fighter = safeFighter(link, fighterRes.data);
    const uitslagen = (resultRows ?? []).map(safeResult);

    return NextResponse.json({
      ok: true,
      fighter,
      sportschool: schoolRes.data ?? null,
      uitslagen,
    });
  } catch (e: any) {
    if (e instanceof Response) {
      const text = await e.text().catch(() => "");
      return NextResponse.json(
        {
          error:
            text ||
            (e.status === 401
              ? "Niet ingelogd of sessie verlopen"
              : "Geen toegang"),
        },
        { status: e.status || 500 },
      );
    }

    console.error("[api/sportscholen/vechters/[fighterId]] GET", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 },
    );
  }
}
