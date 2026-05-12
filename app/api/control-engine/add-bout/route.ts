import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { spawn } from "child_process";
import path from "path";

import {
  assertCanAccessMatchmaking,
  requireAnyRole,
} from "@/app/api/_utils/authz";

import { buildControleBoutContext } from "@/lib/control/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/control/enrichControleBoutContext";
import { rulesEngine } from "@/lib/rulesEngine";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ===== helpers (ongewijzigd) =====
function clean(v: any) {
  const s = String(v ?? "").trim();
  return s || null;
}

function toNum(v: any) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toWeightString(v: any) {
  const n = toNum(v);
  return n == null ? null : String(n);
}

function toVa(v: any) {
  if (!v) return null;
  const d = String(v).replace(/\D/g, "");
  return d || null;
}

function makeBoutUid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `bout-${Date.now()}`;
  }
}

// ===== MAIN =====
export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await requireAnyRole(req, [
      "admin",
      "superadmin",
      "official",
      "hoofdofficial",
      "matchmaker",
    ]);

    const body = await req.json();

    const matchmaking_id = String(body.matchmaking_id ?? "").trim();
    if (!matchmaking_id) throw new Error("matchmaking_id ontbreekt");

    await assertCanAccessMatchmaking({ matchmaking_id, userId, role });

    // ===== insert bout =====
    const { data: last } = await supabaseAdmin
      .from("matchmaking_bouts_raw")
      .select("partij_nr")
      .eq("matchmaking_id", matchmaking_id)
      .order("partij_nr", { ascending: false })
      .limit(1)
      .maybeSingle();

    const partij_nr = Number(last?.partij_nr ?? 0) + 1;

    const insertRow = {
      matchmaking_id,
      partij_nr,
      bout_uid: makeBoutUid(),

      discipline: clean(body.discipline),
      klasse: clean(body.klasse),

      rood_naam: clean(body.rood_naam),
      rood_gym: clean(body.rood_gym),
      rood_gewicht: toWeightString(body.rood_gewicht),
      va_rood: toVa(body.va_rood),

      blauw_naam: clean(body.blauw_naam),
      blauw_gym: clean(body.blauw_gym),
      blauw_gewicht: toWeightString(body.blauw_gewicht),
      va_blauw: toVa(body.va_blauw),

      max_gewicht: toNum(body.max_gewicht),

      source_type: "manual_add_bout",
      laatste_bewerking_op: new Date().toISOString(),
      raw_json: JSON.stringify({
        created_by: userId,
        role,
      }),
    };

    const { error: insertErr } = await supabaseAdmin
      .from("matchmaking_bouts_raw")
      .insert([insertRow]);

    if (insertErr) throw insertErr;

    // ===== 🔥 CONTROL ENGINE START =====
    const controle_run_id = crypto.randomUUID();

    await supabaseAdmin.from("controle_runs").insert({
      id: controle_run_id,
      matchmaking_id,
      status: "running",
      run_type: "manual_add_bout",
      gestart_op: new Date().toISOString(),
    });

    // ===== SCRAPER =====
    const vas = [toVa(body.va_rood), toVa(body.va_blauw)].filter(Boolean);

    if (vas.length > 0) {
      await new Promise((resolve, reject) => {
        const proc = spawn(
          "node",
          [
            path.resolve(
              "ControlEngine/scrapers/fp_bundle/scraper_fp_bundle.js"
            ),
            matchmaking_id,
            controle_run_id,
            ...vas,
          ],
          { stdio: "inherit" }
        );

        proc.on("exit", (code) => {
          if (code === 0) resolve(true);
          else reject(new Error("scraper failed"));
        });
      });
    }

    // ===== BUILD / ENRICH / RULES =====
    await buildControleBoutContext(matchmaking_id, controle_run_id);
    await enrichControleBoutContext(matchmaking_id, controle_run_id);

    const { data: ctxRows } = await supabaseAdmin
      .from("controle_bout_context")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", controle_run_id);

    await rulesEngine(ctxRows ?? []);

    // ===== afronden =====
    await supabaseAdmin
      .from("controle_runs")
      .update({
        status: "klaar",
        afgerond_op: new Date().toISOString(),
      })
      .eq("id", controle_run_id);

    return NextResponse.json({
      ok: true,
      message: "Bout toegevoegd + volledig gecontroleerd",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}