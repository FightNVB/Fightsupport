import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  mapBoutResultToExcel,
  type BoutResultType,
  type DecisionCode,
  EXCEL_UITSLAGEN,
  assertAllowedExcelValue,
} from "@/lib/uitslagen/excelMapping";

export const runtime = "nodejs";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return bad("Missing bearer token", 401);

    const authClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) return bad("Unauthorized", 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));

    const definitive_bout_id = String(body.definitive_bout_id ?? "").trim();
    const matchmaking_id = String(body.matchmaking_id ?? "").trim();
    const partij_nr = Number(body.partij_nr ?? 0);
    const result_type = String(body.result_type ?? "").trim() as BoutResultType;
    const decision_code = (body.decision_code ?? null) as DecisionCode;
    const changed_reason = String(body.changed_reason ?? "").trim() || null;

    if (!definitive_bout_id) return bad("definitive_bout_id ontbreekt");
    if (!matchmaking_id) return bad("matchmaking_id ontbreekt");
    if (!partij_nr) return bad("partij_nr ontbreekt");
    if (!result_type) return bad("result_type ontbreekt");

    if (["red_win", "blue_win"].includes(result_type) && !decision_code) {
      return bad("Wijze van winst is verplicht.");
    }

    if (["draw", "no_contest", "demo"].includes(result_type) && decision_code) {
      return bad("Bij Onbeslist / No contest / Demo mag geen wijze van winst gevuld zijn.");
    }

    const { data: bout, error: boutErr } = await admin
      .from("definitive_matchmaking_bouts")
      .select("id, matchmaking_id, partij_nr, is_locked")
      .eq("id", definitive_bout_id)
      .eq("matchmaking_id", matchmaking_id)
      .maybeSingle();

    if (boutErr) return bad(boutErr.message, 500);
    if (!bout) return bad("Definitieve partij niet gevonden.", 404);

    if (Number(bout.partij_nr) !== partij_nr) {
      return bad("partij_nr hoort niet bij definitive_bout_id.");
    }

    const { data: existing, error: existingErr } = await admin
      .from("uitslagen_officieel")
      .select("id, finalized, uitslag")
      .eq("definitive_bout_id", definitive_bout_id)
      .maybeSingle();

    if (existingErr) return bad(existingErr.message, 500);

    if (existing?.finalized) {
      return bad("Uitslag is al gefinaliseerd en kan niet meer gewijzigd worden.", 409);
    }

    if (existing?.uitslag && !changed_reason) {
      return bad("Bij wijzigen van een bestaande uitslag is een reden verplicht.");
    }

    const uitslag = assertAllowedExcelValue(
      mapBoutResultToExcel(result_type, decision_code),
      EXCEL_UITSLAGEN,
      "Uitslag"
    );

    const now = new Date().toISOString();

    const payload = {
      definitive_bout_id,
      matchmaking_id,
      partij_nr,
      result_type,
      decision_code,
      uitslag,
      changed_reason,
      changed_at: now,
      changed_by: userRes.user.id,
      updated_at: now,
      finalized: false,
    };

    const { data, error } = await admin
      .from("uitslagen_officieel")
      .upsert(payload, { onConflict: "definitive_bout_id" })
      .select("*")
      .single();

    if (error) return bad(error.message, 500);

    return NextResponse.json({ ok: true, row: data });
  } catch (e: any) {
    return bad(e?.message ?? String(e), 500);
  }
}