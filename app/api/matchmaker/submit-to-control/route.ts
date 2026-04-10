import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";
import { ensureLifecycleRecord, transferLifecycle } from "@/app/api/_utils/matchmakingLifecycle";

export const runtime = "nodejs";
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
function bad(message: string, status = 400, extra?: unknown) { return NextResponse.json({ ok: false, error: message, extra }, { status }); }
function clean(v: unknown): string | null { const s = String(v ?? "").trim(); return s || null; }
function toNum(v: unknown): number | null { if (v == null || v === "") return null; const n = Number(String(v).replace(",", ".")); return Number.isFinite(n) ? n : null; }

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req);
    const body = await req.json().catch(() => ({}));
    const matchmaking_id = String(body?.matchmaking_id ?? "").trim();
    if (!matchmaking_id) return bad("matchmaking_id ontbreekt");
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    const { data: sourceRows, error: sourceErr } = await supabaseAdmin
      .from("matchmaker_bouts_raw")
      .select(`id, partij_nr, rood_naam, rood_gym, rood_va, rood_gewicht, blauw_naam, blauw_gym, blauw_va, blauw_gewicht, discipline, klasse, raw, matchmaking_id, max_gewicht`)
      .eq("matchmaking_id", matchmaking_id)
      .order("partij_nr", { ascending: true });
    if (sourceErr) return bad("Ophalen matchmaker_bouts_raw mislukt", 500, sourceErr);
    const rows = sourceRows ?? [];
    if (!rows.length) return bad("Geen partijen gevonden in matchmaker_bouts_raw voor deze matchmaking.", 404);

    const upserts = rows.map((row: any) => ({
      matchmaking_id,
      partij_nr: Number(row.partij_nr),
      rood_naam: clean(row.rood_naam),
      rood_gym: clean(row.rood_gym),
      rood_gewicht: toNum(row.rood_gewicht),
      blauw_naam: clean(row.blauw_naam),
      blauw_gym: clean(row.blauw_gym),
      blauw_gewicht: toNum(row.blauw_gewicht),
      discipline: clean(row.discipline),
      klasse: clean(row.klasse),
      va_rood: clean(row.rood_va),
      va_blauw: clean(row.blauw_va),
      max_gewicht: toNum(row.max_gewicht),
      raw_json: { source: "matchmaker_bouts_raw", source_matchmaker_bout_id: row.id, raw: row.raw ?? null },
      source_type: "matchmaker_app",
      source_matchmaker_bout_id: row.id,
      laatste_bewerking_op: new Date().toISOString(),
    }));

    for (const payload of upserts) {
      const { data: existing } = await supabaseAdmin.from("matchmaking_bouts_raw").select("id").eq("matchmaking_id", matchmaking_id).eq("partij_nr", payload.partij_nr).maybeSingle();
      if (existing?.id) {
        const { error } = await supabaseAdmin.from("matchmaking_bouts_raw").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin.from("matchmaking_bouts_raw").insert(payload);
        if (error) throw error;
      }
    }

    await ensureLifecycleRecord({ matchmakingId: matchmaking_id, bronType: "matchmaker_app", stage: "concept_matchmaking", ownerType: "matchmaker", ownerUserId: userId, actorUserId: userId, actorRole: role, metadata: { route: "api/matchmaker/submit-to-control/route" } });
    const lifecycle = await transferLifecycle({ matchmakingId: matchmaking_id, newStage: "ingediend_admin", newOwnerType: "admin", actorUserId: userId, actorRole: role, opmerking: "Matchmaking snapshot doorgestuurd naar admin/controle.", metadata: { route: "api/matchmaker/submit-to-control/route", source_rows: rows.length } });

    return NextResponse.json({ ok: true, matchmaking_id, imported_bouts: rows.length, lifecycle, message: "Matchmaking snapshot staat klaar voor admin/controle." });
  } catch (err: any) {
    return bad(err?.message ?? "Onbekende fout.", 500);
  }
}
