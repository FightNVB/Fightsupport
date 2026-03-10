// app/api/dispensatie/upsert/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader, hasAnyRole, hasAnyRoleFromReq } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asUuidStrict(v: unknown): string | null {
  if (v == null) return null;

  if (typeof v === "object") {
    const o: any = v;
    const cand =
      (typeof o.bout_id === "string" && o.bout_id) ||
      (typeof o.bout_uid === "string" && o.bout_uid) ||
      (typeof o.id === "string" && o.id);
    return asUuidStrict(cand);
  }

  const s = String(v).trim();
  if (!s || s === "[object Object]") return null;

  const low = s.toLowerCase();
  if (low === "null" || low === "undefined") return null;

  if (!UUID_RE.test(s)) return null;
  return s;
}

function asInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  try {
    const { user } = await requireUserFromAuthHeader(req);
    const ok = await hasAnyRoleFromReq(req, ["admin", "superadmin"]);
    if (!ok) return NextResponse.json({ error: "Geen rechten." }, { status: 403 });

    const body = await req.json().catch(() => ({}));

    // 🔎 Forensic logging
    console.log("[dispensatie/upsert] RAW body:", JSON.stringify(body, null, 2));
    console.log("[dispensatie/upsert] RAW user.id:", (user as any)?.id);

    const matchmaking_id = asUuidStrict((body as any).matchmaking_id);
    const bout_id = asUuidStrict((body as any).bout_id);
    const partij_nr = asInt((body as any).partij_nr);

    const rule_code =
      typeof (body as any).rule_code === "string"
        ? (body as any).rule_code.trim() || null
        : (body as any).rule_code
        ? String((body as any).rule_code).trim() || null
        : null;

    const created_by = asUuidStrict((user as any)?.id);

    if (!matchmaking_id || !bout_id) {
      return NextResponse.json(
        {
          error: "matchmaking_id en bout_id zijn verplicht en moeten uuid zijn.",
          debug: {
            matchmaking_id_in: (body as any).matchmaking_id,
            bout_id_in: (body as any).bout_id,
            matchmaking_id_out: matchmaking_id,
            bout_id_out: bout_id,
            user_id_in: (user as any)?.id,
            created_by_out: created_by,
          },
        },
        { status: 400 }
      );
    }

    // laatste controle_run_id (mag null)
    const { data: runs, error: runErr } = await supabaseAdmin
      .from("controle_runs")
      .select("id")
      .eq("matchmaking_id", matchmaking_id)
      .order("gestart_op", { ascending: false })
      .limit(1);

    if (runErr) throw runErr;

    const controle_run_id = asUuidStrict(runs?.[0]?.id);

    // bestaat al? (matchmaking_id + bout_id)
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("dispensatie_requests")
      .select("id")
      .eq("matchmaking_id", matchmaking_id)
      .eq("bout_id", bout_id)
      .limit(1);

    if (exErr) throw exErr;

    if (existing?.[0]?.id) {
      const id = String(existing[0].id);

      const patch: any = {
        partij_nr,
        rule_code,
        updated_at: new Date().toISOString(),
      };
      if (controle_run_id) patch.controle_run_id = controle_run_id;

      console.log("[dispensatie/upsert] UPDATE id:", id, "patch:", patch);

      const { error: updErr } = await supabaseAdmin
        .from("dispensatie_requests")
        .update(patch)
        .eq("id", id);

      if (updErr) {
        console.log("[dispensatie/upsert] UPDATE ERROR:", updErr);
        return NextResponse.json({ error: updErr.message, supabase_error: updErr, patch }, { status: 500 });
      }

      return NextResponse.json({ id });
    }

    const insertRow: any = {
      status: "open",
      matchmaking_id,
      bout_id,
      partij_nr,
      rule_code,
      controle_run_id: controle_run_id ?? null,
      // ⚠️ als created_by kolom NOT NULL is, moet dit een uuid zijn.
      created_by: created_by ?? null,
    };

    console.log("[dispensatie/upsert] INSERT row:", insertRow);

    const { data: ins, error: insErr } = await supabaseAdmin
      .from("dispensatie_requests")
      .insert(insertRow)
      .select("id")
      .single();

    if (insErr) {
      console.log("[dispensatie/upsert] INSERT ERROR:", insErr);
      return NextResponse.json(
        { error: insErr.message, supabase_error: insErr, insertRow },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: ins.id });
  } catch (e: any) {
    console.log("[dispensatie/upsert] CATCH ERROR:", e);
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
