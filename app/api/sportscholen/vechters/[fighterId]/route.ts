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

  if (Number.isFinite(sportschoolIdNumber)) {
    query = query.eq("sportschool_id", sportschoolIdNumber);
  } else {
    query = query.eq("sportschool_id", sportschoolIdText);
  }

  const { data, error } = await query;
  if (error) throw error;

  return !!data?.length;
}

export async function GET(req: Request, ctx: { params: Promise<{ fighterId: string }> | { fighterId: string } }) {
  try {
    const auth = await requireAnyRole(req, ["trainer", "admin", "superadmin"] as any);
    const userId = (auth as any).userId;
    const role = (auth as any).role;

    const resolvedParams = await Promise.resolve(ctx.params as any);
    const key = cleanId(resolvedParams?.fighterId);

    if (!key) {
      return NextResponse.json({ error: "Vechter id ontbreekt" }, { status: 400 });
    }

    const url = new URL(req.url);
    const sportschoolIdParam = cleanId(url.searchParams.get("sportschool_id"));

    let query = supabaseAdmin.from("sportschool_fighters").select("*");

    if (isUuid(key)) {
      query = query.eq("id", key);
    } else {
      const va = normalizeVa(key);
      if (!va) return NextResponse.json({ error: "Ongeldig vechter id" }, { status: 400 });
      query = query.eq("va_nummer", va);
      if (sportschoolIdParam) query = query.eq("sportschool_id", sportschoolIdParam);
    }

    const { data: rows, error } = await query.limit(2);

    if (error) throw error;
    if (!rows?.length) return NextResponse.json({ error: "Vechter niet gevonden" }, { status: 404 });
    if (rows.length > 1) {
      return NextResponse.json(
        { error: "Meerdere vechters gevonden. Open de vechter via de id of geef sportschool_id mee." },
        { status: 409 },
      );
    }

    const fighter = rows[0];
    const sportschoolId = cleanId((fighter as any).sportschool_id);

    if (!sportschoolId) {
      return NextResponse.json({ error: "Sportschool ontbreekt bij deze vechter" }, { status: 500 });
    }

    if (role !== "admin" && role !== "superadmin") {
      const allowed = await trainerHasAccess(userId, sportschoolId);
      if (!allowed) return NextResponse.json({ error: "Geen toegang tot deze vechter" }, { status: 403 });
    }

    const { data: sportschool, error: schoolError } = await supabaseAdmin
      .from("sportscholen")
      .select("sportschool_id, naam, plaats, land, keurmerk_start, keurmerk_einde, last_team_sync_at, team_sync_status, team_sync_error")
      .eq("sportschool_id", sportschoolId)
      .maybeSingle();

    if (schoolError) throw schoolError;

    const vaNummer = normalizeVa((fighter as any).va_nummer);

    const { data: uitslagen, error: uitslagenError } = await supabaseAdmin
      .from("sportschool_fighter_uitslagen_raw")
      .select("id, sportschool_id, scrape_run_id, va_nummer, datum, evenement, tegenstander, sportschool, discipline, klasse, gewicht, uitslag, raw, created_at")
      .eq("sportschool_id", Number.isFinite(Number(sportschoolId)) ? Number(sportschoolId) : sportschoolId)
      .eq("va_nummer", vaNummer)
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (uitslagenError) throw uitslagenError;

    return NextResponse.json({
      fighter,
      sportschool: sportschool ?? null,
      uitslagen: uitslagen ?? [],
    });
  } catch (e: any) {
    if (e instanceof Response) {
      const text = await e.text().catch(() => "");
      return NextResponse.json(
        { error: text || (e.status === 401 ? "Niet ingelogd of sessie verlopen" : "Geen toegang") },
        { status: e.status || 500 },
      );
    }

    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
