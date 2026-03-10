// app/api/control-engine/admin-correct-bout/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildControleBoutContext } from "@/lib/control/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/control/enrichControleBoutContext";
import { rulesEngine } from "@/lib/rulesEngine";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function normalizeVa(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  if (!s) return null;

  // Keep only digits, then drop leading zeros (VA numbers never start with 0).
  const digits = s.replace(/\D+/g, "");
  const noLeadingZeros = digits.replace(/^0+/, "");
  return noLeadingZeros ? noLeadingZeros : null;
}

async function getLatestControleRunId(matchmaking_id: string): Promise<string | null> {
  const { data: ctxRows, error: ctxErr } = await supabase
    .from("controle_bout_context")
    .select("controle_run_id, created_at")
    .eq("matchmaking_id", matchmaking_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (ctxErr) throw ctxErr;
  const fromCtx = ctxRows?.[0]?.controle_run_id ?? null;
  if (fromCtx) return String(fromCtx);

  const { data: resRows, error: resErr } = await supabase
    .from("controle_resultaten")
    .select("controle_run_id, created_at")
    .eq("matchmaking_id", matchmaking_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (resErr) throw resErr;
  const fromRes = resRows?.[0]?.controle_run_id ?? null;
  return fromRes ? String(fromRes) : null;
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req);
    const body = await req.json().catch(() => ({}));

    const matchmaking_id = String(body?.matchmaking_id ?? "").trim();
    const partij_nr = body?.partij_nr != null ? Number(body.partij_nr) : NaN;
    const controle_run_id_in = body?.controle_run_id ? String(body.controle_run_id) : null;

    if (!matchmaking_id) return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    if (!Number.isFinite(partij_nr)) return NextResponse.json({ error: "partij_nr ontbreekt of ongeldig" }, { status: 400 });

    // ✅ AuthZ: admin/superadmin always ok; matchmaker only on own matchmaking
    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    // ✅ huidige waarden ophalen (om *_prev te kunnen vullen)
    const { data: existingBout, error: exErr } = await supabase
      .from("matchmaking_bouts_raw")
      .select("va_rood, va_blauw, rood_va_mm_prev, blauw_va_mm_prev")
      .eq("matchmaking_id", matchmaking_id)
      .eq("partij_nr", partij_nr)
      .maybeSingle();

    if (exErr) {
      console.error("Kon bestaande bout niet ophalen:", exErr);
      return NextResponse.json({ error: exErr.message ?? "Kon bestaande bout niet ophalen" }, { status: 500 });
    }

    const oldVaRood = existingBout?.va_rood ? String(existingBout.va_rood) : null;
    const oldVaBlauw = existingBout?.va_blauw ? String(existingBout.va_blauw) : null;

// ✅ patch velden (matchmaking_bouts_raw)
    // (Ik ga uit van jouw standaard kolommen: va_rood, va_blauw, rood_naam, blauw_naam, rood_gym, blauw_gym)
    const patch: Record<string, any> = {};

    if (Object.prototype.hasOwnProperty.call(body, "new_va_rood")) patch.va_rood = normalizeVa(body.new_va_rood);
    if (Object.prototype.hasOwnProperty.call(body, "new_va_blauw")) patch.va_blauw = normalizeVa(body.new_va_blauw);

    // ✅ Matchmakers mogen naam WEL wijzigen (voor kleine mismatches),
    // maar blijven beperkt tot hun eigen matchmakings via assertCanAccessMatchmaking.
    const canEditNames = role === "admin" || role === "superadmin" || role === "matchmaker";
    if (canEditNames) {
      if (Object.prototype.hasOwnProperty.call(body, "new_rood_naam")) patch.rood_naam = String(body.new_rood_naam ?? "").trim() || null;
      if (Object.prototype.hasOwnProperty.call(body, "new_blauw_naam")) patch.blauw_naam = String(body.new_blauw_naam ?? "").trim() || null;
    }

    if (Object.prototype.hasOwnProperty.call(body, "new_rood_gym")) patch.rood_gym = String(body.new_rood_gym ?? "").trim() || null;
    if (Object.prototype.hasOwnProperty.call(body, "new_blauw_gym")) patch.blauw_gym = String(body.new_blauw_gym ?? "").trim() || null;

    const newVaRood = Object.prototype.hasOwnProperty.call(body, "new_va_rood") ? (patch.va_rood ?? null) : null;
    const newVaBlauw = Object.prototype.hasOwnProperty.call(body, "new_va_blauw") ? (patch.va_blauw ?? null) : null;

    const roodVaChanged = newVaRood !== null && newVaRood !== (oldVaRood ?? null);
    const blauwVaChanged = newVaBlauw !== null && newVaBlauw !== (oldVaBlauw ?? null);


    // ✅ Als VA gewijzigd is: bewaar de oude matchmaker-VA éénmalig in matchmaking_bouts_raw.*_va_mm_prev
    if (roodVaChanged) {
      const prevExisting = existingBout?.rood_va_mm_prev ? String(existingBout.rood_va_mm_prev) : null;
      if (!prevExisting) patch.rood_va_mm_prev = oldVaRood; // kan null zijn
    }
    if (blauwVaChanged) {
      const prevExisting = existingBout?.blauw_va_mm_prev ? String(existingBout.blauw_va_mm_prev) : null;
      if (!prevExisting) patch.blauw_va_mm_prev = oldVaBlauw; // kan null zijn
    }


    if (Object.keys(patch).length > 0) {
      const { error: upErr } = await supabase
        .from("matchmaking_bouts_raw")
        .update(patch)
        .eq("matchmaking_id", matchmaking_id)
        .eq("partij_nr", partij_nr);
                
      if (upErr) {
        console.error("DB update fout:", upErr);
        return NextResponse.json({ error: upErr.message ?? "Kon bout niet updaten" }, { status: 500 });
      }
    }

    // ✅ daarna context/rules bijwerken zodat UI meteen klopt (ook zonder herscrape)
    const controle_run_id = controle_run_id_in ?? (await getLatestControleRunId(matchmaking_id));
    if (!controle_run_id) {
      return NextResponse.json({
        ok: true,
        message: "Bout bijgewerkt, maar geen controle_run gevonden om context/rules te herbouwen.",
      });
    }

    await buildControleBoutContext(matchmaking_id, controle_run_id);
    await enrichControleBoutContext(matchmaking_id, controle_run_id);

    // ✅ ctxRows laden voor rulesEngine (nieuwe signature)
    const { data: ctxRows, error: ctxErr } = await supabase
      .from("controle_bout_context")
      .select("*")
      .eq("controle_run_id", controle_run_id);

    if (ctxErr) throw ctxErr;

    await rulesEngine({
      matchmaking_id,
      controle_run_id,
      ctxRows: ctxRows ?? [],
    });

    return NextResponse.json({
      ok: true,
      message: "Bout bijgewerkt + context/rules opnieuw opgebouwd",
      matchmaking_id,
      partij_nr,
      controle_run_id,
    });
  } catch (e: any) {
    console.error("admin-correct-bout error:", e);
    return NextResponse.json({ error: e?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
