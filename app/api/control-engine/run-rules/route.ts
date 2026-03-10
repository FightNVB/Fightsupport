import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { runRulesForBoutContext } from "@/lib/rulesEngine";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

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
    .eq("matchmaking_id", matchmaking_id)
    .maybeSingle();

  if (error) throw error;
  return (data as any)?.event_id ?? null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const matchmaking_id = body?.matchmaking_id as string | undefined;
    const controle_run_id = body?.controle_run_id as string | undefined;

    if (!matchmaking_id || !controle_run_id) {
      return NextResponse.json(
        { error: "matchmaking_id en controle_run_id zijn verplicht" },
        { status: 400 }
      );
    }

    // 0) event_id ophalen (zodat controle_resultaten het altijd krijgt)
    const cols = await detectColumns("controle_resultaten");
    const event_id = cols.has("event_id") ? await getEventIdForMatchmaking(matchmaking_id) : null;

    // 1) context ophalen
    const { data: ctxRows, error: ctxErr } = await supabaseAdmin
      .from("controle_bout_context")
      .select("*")
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", controle_run_id)
      .order("partij_nr", { ascending: true });

    if (ctxErr) throw ctxErr;

    // 2) oude resultaten weg
    const { error: delErr } = await supabaseAdmin
      .from("controle_resultaten")
      .delete()
      .eq("matchmaking_id", matchmaking_id)
      .eq("controle_run_id", controle_run_id);

    if (delErr) throw delErr;

    if (!ctxRows || ctxRows.length === 0) {
      return NextResponse.json({ ok: true, matchmaking_id, controle_run_id, inserted: 0 });
    }

    const now = new Date().toISOString();
    const inserts: AnyRow[] = [];

    for (const ctx of ctxRows as AnyRow[]) {
      const hits = runRulesForBoutContext(ctx);

      for (const h of hits) {
        const row: AnyRow = {
          id: randomUUID(),
          matchmaking_id,
          controle_run_id,
          partij_nr: ctx?.partij_nr ?? null,
        };

        // ✅ event_id vullen (als kolom bestaat)
        if (cols.has("event_id")) row.event_id = event_id;

        // verplichte velden bij jou:
        if (cols.has("rule")) row.rule = h.rule ?? h.rule_code ?? "RULE";
        if (cols.has("rule_code")) row.rule_code = h.rule_code ?? null;
        if (cols.has("resultaat")) row.resultaat = h.resultaat ?? "ok";

        // ✅ bij jou heet het boodschap (niet message)
        if (cols.has("boodschap")) row.boodschap = h.message ?? h.boodschap ?? null;

        // optioneel
        if (cols.has("severity")) row.severity = h.severity ?? null;
        if (cols.has("hoek")) row.hoek = h.hoek ?? null;
        if (cols.has("match_id")) row.match_id = h.match_id ?? ctx?.bout_id ?? null;
        if (cols.has("created_at")) row.created_at = now;

        // actie velden (alleen als bestaan)
        if (cols.has("actie_status")) row.actie_status = h.resultaat === "actie" ? "open" : null;
        if (cols.has("actie")) row.actie = null;
        if (cols.has("aantekeningen")) row.aantekeningen = null;

        inserts.push(row);
      }
    }

    // insert in chunks
    const chunkSize = 500;
    for (let i = 0; i < inserts.length; i += chunkSize) {
      const chunk = inserts.slice(i, i + chunkSize);
      const { error: insErr } = await supabaseAdmin.from("controle_resultaten").insert(chunk);
      if (insErr) throw insErr;
    }

    return NextResponse.json({ ok: true, matchmaking_id, controle_run_id, inserted: inserts.length });
  } catch (e: any) {
    console.error("❌ run-rules error:", e);
    return NextResponse.json({ error: e?.message ?? "Onbekende fout" }, { status: 500 });
  }
}