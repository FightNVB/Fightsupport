// app/api/control-engine/toernooi-fighter/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function s(v: unknown) { return String(v ?? "").trim(); }
function va(v: unknown) { const d = s(v).replace(/\D/g, ""); return d || null; }
async function bestEffort(p: PromiseLike<any>) { try { await p; } catch {} }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmaking_id = s(body.matchmaking_id);
    const toernooi_code = s(body.toernooi_code);
    const fighter_id = va(body.fighter_id ?? body.va_nummer);

    if (!matchmaking_id) return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    if (!toernooi_code) return NextResponse.json({ error: "toernooi_code ontbreekt" }, { status: 400 });
    if (!fighter_id) return NextResponse.json({ error: "fighter_id/va_nummer ontbreekt" }, { status: 400 });

    const { userId, role } = await requireUserWithRole(req);
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    await bestEffort(
      supabase.from("controle_resultaten")
        .delete()
        .eq("matchmaking_id", matchmaking_id)
        .eq("toernooi_code", toernooi_code)
        .or(`fighter_id.eq.${fighter_id},va_nummer.eq.${fighter_id}`)
        .throwOnError()
    );

    await bestEffort(
      supabase.from("controle_uitslagen")
        .delete()
        .eq("matchmaking_id", matchmaking_id)
        .eq("toernooi_code", toernooi_code)
        .eq("va_nummer", fighter_id)
        .throwOnError()
    );

    const { data, error } = await supabase
      .from("controle_toernooi_context")
      .delete()
      .eq("matchmaking_id", matchmaking_id)
      .eq("toernooi_code", toernooi_code)
      .or(`fighter_id.eq.${fighter_id},va_nummer.eq.${fighter_id}`)
      .select("*");

    if (error) throw error;

    return NextResponse.json({ ok: true, deleted: data?.length ?? 0, matchmaking_id, toernooi_code, fighter_id });
  } catch (err: any) {
    console.error("[toernooi-fighter/delete]", err);
    return NextResponse.json({ error: err?.message ?? "Toernooi-vechter verwijderen mislukt" }, { status: 500 });
  }
}
