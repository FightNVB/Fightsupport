import { NextResponse } from "next/server";
import { requireAnyRole, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

function cleanId(v: unknown) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function jsonError(message: string, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function jsonFromResponse(e: Response) {
  try {
    const text = await e.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  } catch {
    return {};
  }
}

async function getProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, role, email, full_name, meekijk_sportschool_id, active_sportschool_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as any;
}

async function getSportschool(sportschoolId: string) {
  const { data, error } = await supabaseAdmin
    .from("sportscholen")
    .select("sportschool_id, naam, plaats, land, keurmerk_start, keurmerk_einde")
    .eq("sportschool_id", sportschoolId)
    .maybeSingle();

  if (error) throw error;
  return data as any;
}

async function getFighters(sportschoolId: string) {
  const nr = Number(sportschoolId);
  const schoolValue: string | number = Number.isFinite(nr) ? nr : sportschoolId;

  // De sportschool/VA-koppeling komt rechtstreeks uit FightPassport.
  const { data: links, error: linkError } = await supabaseAdmin
    .from("fightpassport_school_fighters")
    .select("id,sportschool_id,va_nummer,naam,geslacht,actief,updated_at")
    .eq("sportschool_id", schoolValue)
    .eq("actief", true)
    .order("naam", { ascending: true });

  if (linkError) throw linkError;

  const vaNummers = Array.from(
    new Set(
      (links ?? [])
        .map((row: any) => String(row.va_nummer ?? "").replace(/\D/g, ""))
        .filter(Boolean),
    ),
  );

  if (!vaNummers.length) return [];

  // Alleen velden ophalen die de trainerpagina daadwerkelijk nodig heeft.
  // raw_details, e-mail en identificatiegegevens blijven server-side.
  const { data: fighterRows, error: fighterError } = await supabaseAdmin
    .from("fightpassport_fighters")
    .select(
      [
        "va_nummer",
        "naam",
        "geboortedatum",
        "geslacht",
        "fit_to_fight",
        "licentie_actief",
        "heeft_startverbod",
        "totaal_wedstrijden",
        "gewonnen",
        "kos",
        "nulmeting_gewicht",
        "nulmeting_discipline",
        "nulmeting_klasse",
        "nulmeting_totaal",
        "primary_discipline",
        "updated_at",
      ].join(","),
    )
    .in("va_nummer", vaNummers);

  if (fighterError) throw fighterError;

  // W/V/O komt uit fightpassport_results. De top-level kolommen
  // verloren en onbeslist bestaan niet in fightpassport_fighters.
  const { data: resultRows, error: resultsError } = await supabaseAdmin
    .from("fightpassport_results")
    .select("va_nummer,uitslag")
    .in("va_nummer", vaNummers);

  if (resultsError) throw resultsError;

  const recordByVa = new Map<
    string,
    { gewonnen: number; verloren: number; onbeslist: number }
  >();

  for (const row of resultRows ?? []) {
    const va = String((row as any).va_nummer ?? "").replace(/\D/g, "");
    if (!va) continue;

    const record =
      recordByVa.get(va) ?? { gewonnen: 0, verloren: 0, onbeslist: 0 };

    const uitslag = String((row as any).uitslag ?? "")
      .trim()
      .toLowerCase();

    if (/win|winst|gewonnen|wint/.test(uitslag)) {
      record.gewonnen += 1;
    } else if (/loss|verlies|verloren|verliest/.test(uitslag)) {
      record.verloren += 1;
    } else if (/draw|onbeslist|gelijk/.test(uitslag)) {
      record.onbeslist += 1;
    }

    recordByVa.set(va, record);
  }

  const byVa = new Map(
    (fighterRows ?? []).map((fighter: any) => [
      String(fighter.va_nummer ?? "").replace(/\D/g, ""),
      fighter,
    ]),
  );

  return (links ?? [])
    .map((link: any) => {
      const va = String(link.va_nummer ?? "").replace(/\D/g, "");
      const fighter: any = byVa.get(va) ?? {};

      return {
        id: link.id,
        sportschool_id: link.sportschool_id,
        va_nummer: va,

        naam: fighter.naam ?? link.naam ?? null,
        fp_naam: fighter.naam ?? null,
        geboortedatum: fighter.geboortedatum ?? null,
        fp_geboortedatum: fighter.geboortedatum ?? null,
        geslacht: fighter.geslacht ?? link.geslacht ?? null,

        discipline:
          fighter.primary_discipline ??
          fighter.nulmeting_discipline ??
          null,
        klasse: fighter.nulmeting_klasse ?? null,
        gewicht: fighter.nulmeting_gewicht ?? null,

        licentie_actief: fighter.licentie_actief ?? false,
        heeft_licentie: fighter.licentie_actief ?? false,
        licentie: fighter.licentie_actief ? "actief" : "niet actief",
        licentie_status: fighter.licentie_actief ? "actief" : "niet actief",

        fit_to_fight: fighter.fit_to_fight ?? null,
        heeft_startverbod: fighter.heeft_startverbod ?? false,
        startverbod: fighter.heeft_startverbod ?? false,

        totaal_wedstrijden: fighter.totaal_wedstrijden ?? 0,
        gewonnen: recordByVa.get(va)?.gewonnen ?? fighter.gewonnen ?? 0,
        verloren: recordByVa.get(va)?.verloren ?? 0,
        onbeslist: recordByVa.get(va)?.onbeslist ?? 0,
        kos: fighter.kos ?? 0,

        nulmeting_klasse: fighter.nulmeting_klasse ?? null,
        nulmeting_totaal: fighter.nulmeting_totaal ?? 0,
        nulmeting_gewicht: fighter.nulmeting_gewicht ?? null,
        nulmeting_discipline: fighter.nulmeting_discipline ?? null,

        updated_at: fighter.updated_at ?? link.updated_at ?? null,
      };
    })
    .sort((a: any, b: any) =>
      String(a.naam ?? "").localeCompare(String(b.naam ?? ""), "nl"),
    );
}

export async function GET(req: Request) {
  try {
    const { userId } = await requireAnyRole(req, ["trainer", "admin", "superadmin"] as any);
    const profile = await getProfile(userId);

    const sportschoolId = cleanId(profile?.meekijk_sportschool_id ?? profile?.active_sportschool_id);

    if (!sportschoolId) {
      return NextResponse.json({
        ok: true,
        sportschool: null,
        fighters: [],
        message: "Geen sportschool gekoppeld.",
      });
    }

    const [sportschool, fighters] = await Promise.all([
      getSportschool(sportschoolId),
      getFighters(sportschoolId),
    ]);

    return NextResponse.json({
      ok: true,
      sportschool_id: sportschoolId,
      sportschool,
      fighters,
    });
  } catch (e: any) {
    if (e instanceof Response) {
      const body = await jsonFromResponse(e);
      return jsonError(
        body?.error || body?.message || (e.status === 401 ? "Niet ingelogd of sessie verlopen" : "Geen toegang"),
        e.status || 401,
      );
    }

    console.error("[api/sportscholen/vechters] GET error", e);
    return jsonError(e?.message || "Vechters laden mislukt", 500);
  }
}
