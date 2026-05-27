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
  const first = await supabaseAdmin
    .from("sportschool_fighters")
    .select("*")
    .eq("sportschool_id", sportschoolId)
    .order("naam", { ascending: true });

  if (!first.error) return first.data ?? [];

  // Voor installaties waar sportschool_id als integer staat.
  const nr = Number(sportschoolId);
  if (Number.isFinite(nr)) {
    const second = await supabaseAdmin
      .from("sportschool_fighters")
      .select("*")
      .eq("sportschool_id", nr)
      .order("naam", { ascending: true });

    if (!second.error) return second.data ?? [];
  }

  throw first.error;
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
