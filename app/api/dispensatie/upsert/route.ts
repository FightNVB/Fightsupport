// app/api/dispensatie/upsert/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader, hasAnyRoleFromReq } from "@/lib/api/requireRole";

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
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") {
    return null;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function asText(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function normUpper(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}

async function findBoutVaNumbers(params: {
  matchmaking_id: string;
  partij_nr: number | null;
}) {
  const { matchmaking_id, partij_nr } = params;

  // matchmaking_bouts_raw heeft geen bout_id-kolom.
  // Daarom halen we de VA-nummers op via matchmaking_id + partij_nr.
  if (partij_nr == null) {
    return { va_rood: null, va_blauw: null };
  }

  const { data, error } = await supabaseAdmin
    .from("matchmaking_bouts_raw")
    .select("va_rood, va_blauw")
    .eq("matchmaking_id", matchmaking_id)
    .eq("partij_nr", partij_nr)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return {
    va_rood: asInt((data as any)?.va_rood),
    va_blauw: asInt((data as any)?.va_blauw),
  };
}

async function findLatestDispensatieResult(params: {
  bout_id: string;
  controle_run_id: string | null;
}) {
  const { bout_id, controle_run_id } = params;

  let result: {
    id: string | null;
    rule: string | null;
    rule_code: string | null;
    boodschap: string | null;
    resultaat: string | null;
  } | null = null;

  // eerst binnen laatste run
  {
    let q = supabaseAdmin
      .from("controle_resultaten")
      .select("id, rule, rule_code, boodschap, resultaat, created_at, controle_run_id")
      .eq("bout_id", bout_id)
      .order("created_at", { ascending: false });

    if (controle_run_id) {
      q = q.eq("controle_run_id", controle_run_id);
    }

    const { data, error } = await q;
    if (error) throw error;

    const match = (data ?? []).find(
      (row: any) => normUpper(row?.resultaat) === "DISPENSATIE"
    );

    if (match) {
      result = {
        id: asText(match.id),
        rule: asText(match.rule),
        rule_code: asText(match.rule_code),
        boodschap: asText(match.boodschap),
        resultaat: asText(match.resultaat),
      };
    }
  }

  // fallback zonder run filter
  if (!result) {
    const { data, error } = await supabaseAdmin
      .from("controle_resultaten")
      .select("id, rule, rule_code, boodschap, resultaat, created_at, controle_run_id")
      .eq("bout_id", bout_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const match = (data ?? []).find(
      (row: any) => normUpper(row?.resultaat) === "DISPENSATIE"
    );

    if (match) {
      result = {
        id: asText(match.id),
        rule: asText(match.rule),
        rule_code: asText(match.rule_code),
        boodschap: asText(match.boodschap),
        resultaat: asText(match.resultaat),
      };
    }
  }

  return result;
}

export async function POST(req: Request) {
  try {
    const { user } = await requireUserFromAuthHeader(req);

    const ok = await hasAnyRoleFromReq(req, [
      "matchmaker",
      "dispensatie_admin",
      "superadmin",
    ]);

    if (!ok) {
      return NextResponse.json(
        {
          error:
            "Geen rechten. Alleen matchmaker, dispensatie_admin of superadmin.",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    console.log("[dispensatie/upsert] RAW body:", JSON.stringify(body, null, 2));
    console.log("[dispensatie/upsert] RAW user.id:", (user as any)?.id);

    const matchmaking_id = asUuidStrict((body as any).matchmaking_id);
    const bout_id = asUuidStrict((body as any).bout_id);
    const partij_nr = asInt((body as any).partij_nr);
    const created_by = asUuidStrict((user as any)?.id);

    const bodyRuleCode =
      typeof (body as any).rule_code === "string"
        ? (body as any).rule_code.trim() || null
        : (body as any).rule_code
          ? String((body as any).rule_code).trim() || null
          : null;

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

    const { data: runs, error: runErr } = await supabaseAdmin
      .from("controle_runs")
      .select("id")
      .eq("matchmaking_id", matchmaking_id)
      .order("gestart_op", { ascending: false })
      .limit(1);

    if (runErr) throw runErr;

    const controle_run_id = asUuidStrict(runs?.[0]?.id);

    /**
     * Alleen resultaat DISPENSATIE telt.
     * Dus NIET op rule_code, NIET op boodschap, NIET op andere meldingen.
     */
    const dispensatieResult = await findLatestDispensatieResult({
      bout_id,
      controle_run_id,
    });

    if (!dispensatieResult) {
      return NextResponse.json(
        {
          error:
            "Geen controle_resultaten row met resultaat DISPENSATIE gevonden voor deze partij.",
          debug: {
            matchmaking_id,
            bout_id,
            partij_nr,
            controle_run_id,
            body_rule_code: bodyRuleCode,
          },
        },
        { status: 400 }
      );
    }

    const resolved_rule_code =
      dispensatieResult.rule_code ??
      bodyRuleCode ??
      null;

    const dispensatie_melding = dispensatieResult.boodschap ?? null;

    const { va_rood, va_blauw } = await findBoutVaNumbers({
      matchmaking_id,
      partij_nr,
    });

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
        va_rood,
        va_blauw,
        rule: dispensatieResult.rule ?? null,
        rule_code: resolved_rule_code,
        reason: dispensatie_melding,
        updated_at: new Date().toISOString(),
      };

      if (controle_run_id) patch.controle_run_id = controle_run_id;

      console.log("[dispensatie/upsert] UPDATE id:", id, "patch:", patch);
      console.log("[dispensatie/upsert] DISPENSATIE melding:", dispensatie_melding);
      console.log(
        "[dispensatie/upsert] SOURCE resultaat:",
        dispensatieResult.resultaat,
        "SOURCE rule_code:",
        dispensatieResult.rule_code
      );

      const { error: updErr } = await supabaseAdmin
        .from("dispensatie_requests")
        .update(patch)
        .eq("id", id);

      if (updErr) {
        console.log("[dispensatie/upsert] UPDATE ERROR:", updErr);
        return NextResponse.json(
          { error: updErr.message, supabase_error: updErr, patch },
          { status: 500 }
        );
      }

      return NextResponse.json({
        id,
        rule: dispensatieResult.rule ?? null,
        rule_code: resolved_rule_code,
        reason: dispensatie_melding,
        melding: dispensatie_melding,
        resultaat: "DISPENSATIE",
        source_resultaat_id: dispensatieResult.id ?? null,
      });
    }

    const insertRow: any = {
      status: "open",
      matchmaking_id,
      bout_id,
      partij_nr,
      va_rood,
      va_blauw,
      rule: dispensatieResult.rule ?? null,
      rule_code: resolved_rule_code,
      reason: dispensatie_melding,
      controle_run_id: controle_run_id ?? null,
      created_by: created_by ?? null,
    };

    console.log("[dispensatie/upsert] INSERT row:", insertRow);
    console.log("[dispensatie/upsert] DISPENSATIE melding:", dispensatie_melding);
    console.log(
      "[dispensatie/upsert] SOURCE resultaat:",
      dispensatieResult.resultaat,
      "SOURCE rule_code:",
      dispensatieResult.rule_code
    );

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

    return NextResponse.json({
      id: ins.id,
      rule: dispensatieResult.rule ?? null,
      rule_code: resolved_rule_code,
      reason: dispensatie_melding,
      melding: dispensatie_melding,
      resultaat: "DISPENSATIE",
      source_resultaat_id: dispensatieResult.id ?? null,
    });
  } catch (e: any) {
    console.log("[dispensatie/upsert] CATCH ERROR:", e);
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}