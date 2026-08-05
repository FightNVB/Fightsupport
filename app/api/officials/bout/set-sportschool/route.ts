// app/api/officials/bout/set-sportschool/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rulesEngine } from "@/lib/rulesEngine";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";
import { secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type AnyRow = Record<string, any>;

async function detectColumns(table: string) {
  const { data, error } = await supabaseAdmin.from(table).select("*").limit(1);
  if (error) throw error;
  const row = (data?.[0] ?? {}) as AnyRow;
  return new Set(Object.keys(row));
}

async function getEventIdForMatchmaking(matchmaking_id: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("matchmaking_uploads")
    .select("event_id")
    .eq("id", matchmaking_id)
    .maybeSingle();

  if (error) throw error;
  return (data as any)?.event_id ?? null;
}

function asUuid(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "[object Object]") return null;
  return s;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const matchmaking_id = asUuid(body?.matchmaking_id);
    const controle_run_id = asUuid(body?.controle_run_id);
    const bout_id = asUuid(body?.bout_id);
    const partij_nr = body?.partij_nr ?? null;

    const hoek = String(body?.hoek ?? "").trim().toLowerCase(); // rood/blauw
    const sportschool_id = asUuid(body?.sportschool_id);
    const keurmerkOk = body?.keurmerkOk ?? null;

    if (!matchmaking_id || !controle_run_id || !bout_id || !hoek) {
      return NextResponse.json({ ok: false, error: "matchmaking_id, controle_run_id, bout_id en hoek zijn verplicht" }, { status: 400 });
    }

    const auth = await requireUserWithRole(req, ["official", "hoofdofficial", "admin", "superadmin"]);
    await assertCanAccessMatchmaking({ matchmaking_id, userId: auth.userId, role: auth.role });

    // 1) bestaande ctx ophalen
    const { data: ctx, error: ctxErr } = await supabaseAdmin
      .from("controle_bout_context")
      .select("*")
      .eq("controle_run_id", controle_run_id)
      .eq("bout_id", bout_id)
      .maybeSingle();

    if (ctxErr) throw ctxErr;
    if (!ctx) return NextResponse.json({ ok: false, error: "Bout context niet gevonden" }, { status: 404 });

    // 2) patch bouwen
    const patch: AnyRow = {};
    if (hoek === "rood") {
      patch.rood_sportschool_id = sportschool_id;
      if (typeof keurmerkOk === "boolean") patch.keurmerk_rood = keurmerkOk;
    } else if (hoek === "blauw") {
      patch.blauw_sportschool_id = sportschool_id;
      if (typeof keurmerkOk === "boolean") patch.keurmerk_blauw = keurmerkOk;
    } else {
      return NextResponse.json({ ok: false, error: "hoek moet rood of blauw zijn" }, { status: 400 });
    }

    // 3) update ctx
    const { error: upErr } = await supabaseAdmin
      .from("controle_bout_context")
      .update(patch)
      .eq("controle_run_id", controle_run_id)
      .eq("bout_id", bout_id);
    if (upErr) throw upErr;

    // 4) oude resultaten weg voor deze bout
    const { error: delErr } = await supabaseAdmin
      .from("controle_resultaten")
      .delete()
      .eq("controle_run_id", controle_run_id)
      .eq("bout_id", bout_id);

    // als bout_id kolom niet bestaat, fallback op partij_nr
    if (delErr) {
      if (partij_nr != null) {
        const { error: del2 } = await supabaseAdmin
          .from("controle_resultaten")
          .delete()
          .eq("controle_run_id", controle_run_id)
          .eq("partij_nr", partij_nr);
        if (del2) throw del2;
      } else {
        throw delErr;
      }
    }

    // 5) nieuwe ctx ophalen (na patch)
    const { data: ctx2, error: ctx2Err } = await supabaseAdmin
      .from("controle_bout_context")
      .select("*")
      .eq("controle_run_id", controle_run_id)
      .eq("bout_id", bout_id)
      .maybeSingle();
    if (ctx2Err) throw ctx2Err;
    if (!ctx2) return NextResponse.json({ ok: false, error: "Bout context niet gevonden na update" }, { status: 404 });

    const hits = await rulesEngine({
      matchmaking_id,
      controle_run_id,
      ctxRows: [ctx2 as AnyRow],
      scoped_bout_id: bout_id,
    });

    return NextResponse.json({
      ok: true,
      controle_run_id,
      bout_id,
      hoek,
      sportschool_id,
      keurmerkOk,
      inserted: hits.length,
    });
  } catch (e: any) {
    return secureError(e, "Sportschool kon niet worden bijgewerkt.");
  }
}
