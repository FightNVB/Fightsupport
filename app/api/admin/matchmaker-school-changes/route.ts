import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAnyRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function s(value: unknown) { return String(value ?? "").trim(); }
function bad(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, extra }, { status });
}
async function requireAdmin(req: Request) {
  try {
    const auth = await requireAnyRole(req, ["admin", "superadmin"]);
    return { ok: true as const, userId: auth.userId };
  } catch (error: any) {
    if (error instanceof Response) return { ok: false as const, response: bad(error.status === 401 ? "Niet ingelogd" : "Geen toegang", error.status) };
    return { ok: false as const, response: bad("Autorisatie mislukt", 500, error?.message) };
  }
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req); if (!auth.ok) return auth.response;
  const { searchParams } = new URL(req.url);
  const status = s(searchParams.get("status") || "open");
  const q = s(searchParams.get("q"));

  let query = supabaseAdmin.from("matchmaker_fighter_school_changes").select("*").order("created_at", { ascending: false }).limit(500);
  if (status !== "alles") query = query.eq("status", ["open", "resolved", "ignored"].includes(status) ? status : "open");
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`va_nummer.ilike.${like},old_sportschool_name.ilike.${like},new_sportschool_name.ilike.${like},changed_by_email.ilike.${like},admin_note.ilike.${like}`);
  }
  const { data, error } = await query;
  if (error) return bad("Sportschoolwijzigingen laden mislukt", 500, error.message);

  const fighterIds = [...new Set((data ?? []).map((r: any) => r.fighter_id).filter(Boolean))];
  const matchmakingIds = [...new Set((data ?? []).map((r: any) => r.matchmaking_id).filter(Boolean))];
  const fighterById = new Map<string, any>();
  const matchmakingById = new Map<string, any>();

  if (fighterIds.length) {
    const { data: fighters } = await supabaseAdmin.from("fightpassport_fighters").select("id,naam,va_nummer").in("id", fighterIds);
    for (const f of fighters ?? []) fighterById.set(String(f.id), f);
  }
  if (matchmakingIds.length) {
    const { data: matchmakings } = await supabaseAdmin.from("matchmakings").select("id,naam,event_naam,datum,event_datum").in("id", matchmakingIds);
    for (const m of matchmakings ?? []) matchmakingById.set(String(m.id), m);
  }

  const items = (data ?? []).map((row: any) => ({ ...row, fighter: fighterById.get(String(row.fighter_id)) ?? null, matchmaking: matchmakingById.get(String(row.matchmaking_id)) ?? null }));
  return NextResponse.json({ ok: true, items });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req); if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => ({}));
  const id = s(body.id);
  const status = s(body.status);
  const adminNote = s(body.admin_note);
  if (!id) return bad("id ontbreekt");
  if (!["open", "resolved", "ignored"].includes(status)) return bad("Ongeldige status");

  const patch: Record<string, any> = { status, admin_note: adminNote || null };
  if (status === "resolved" || status === "ignored") {
    patch.resolved_by_user_id = auth.userId;
    patch.resolved_at = new Date().toISOString();
  } else {
    patch.resolved_by_user_id = null;
    patch.resolved_at = null;
  }
  const { data, error } = await supabaseAdmin.from("matchmaker_fighter_school_changes").update(patch).eq("id", id).select("*").single();
  if (error) return bad("Sportschoolwijziging bijwerken mislukt", 500, error.message);
  return NextResponse.json({ ok: true, item: data });
}
