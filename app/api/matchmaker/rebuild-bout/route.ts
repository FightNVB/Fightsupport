import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processMatchmakingFighters } from "@/lib/matchmaker/processMatchmakingFighters";
import { buildControleBoutContext } from "@/lib/matchmaker/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/matchmaker/enrichControleBoutContext";
import { rulesEngine } from "@/lib/matchmaker/rulesEngine";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function text(v: unknown): string {
  return String(v ?? "").trim();
}

function va(v: unknown): string | null {
  const digits = text(v).replace(/\D+/g, "").replace(/^0+(?=\d)/, "");
  return digits || null;
}

function uuid(v: unknown): string | null {
  const value = text(v);
  return value && value !== "[object Object]" ? value : null;
}

async function latestRunId(matchmakingId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("controle_runs")
    .select("id, gestart_op")
    .eq("matchmaking_id", matchmakingId)
    .order("gestart_op", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.id ? String(data[0].id) : null;
}

async function findAanmeldingId(matchmakingId: string, vaNumber: string | null): Promise<string | null> {
  if (!vaNumber) return null;

  for (const column of ["va_nummer", "va", "fightpaspoort_nummer"]) {
    const { data, error } = await supabase
      .from("aanmeldingen")
      .select("id")
      .eq("matchmaking_id", matchmakingId)
      .eq(column, vaNumber)
      .limit(1);

    if (!error && data?.[0]?.id != null) return String(data[0].id);
    if (error && !["42703", "PGRST204"].includes(String(error.code ?? ""))) throw error;
  }

  return null;
}

async function loadContext(matchmakingId: string, runId: string, partijNr: number) {
  const { data, error } = await supabase
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .eq("controle_run_id", runId)
    .eq("partij_nr", partijNr)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req);
    const body = await req.json().catch(() => ({}));
    const matchmakingId = text(body.matchmaking_id);
    const partijNr = Number(body.partij_nr);

    if (!matchmakingId) return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    if (!Number.isFinite(partijNr) || partijNr <= 0) {
      return NextResponse.json({ error: "partij_nr ontbreekt of is ongeldig" }, { status: 400 });
    }

    await assertCanAccessMatchmaking({ matchmaking_id: matchmakingId, userId, role });

    const { data: bout, error: boutError } = await supabase
      .from("matchmaking_bouts_raw")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq("partij_nr", partijNr)
      .maybeSingle();
    if (boutError) throw boutError;
    if (!bout) return NextResponse.json({ error: "Partij niet gevonden" }, { status: 404 });

    const roodVa = va(bout.va_rood ?? bout.rood_va ?? bout.rood_va_mm);
    const blauwVa = va(bout.va_blauw ?? bout.blauw_va ?? bout.blauw_va_mm);
    const ids = Array.from(new Set((await Promise.all([
      findAanmeldingId(matchmakingId, roodVa),
      findAanmeldingId(matchmakingId, blauwVa),
    ])).filter((id): id is string => Boolean(id))));

    for (const aanmeldingId of ids) {
      await processMatchmakingFighters({ supabase, matchmakingId, aanmeldingId });
    }

    const runId = text(body.controle_run_id) || (await latestRunId(matchmakingId));
    if (!runId) {
      return NextResponse.json({
        ok: true,
        message: "Aanmeldingen opnieuw verwerkt; er is nog geen controle-run om de partijcontrole te herbouwen.",
        processed_aanmeldingen: ids,
      });
    }

    await buildControleBoutContext(matchmakingId, runId, { partij_nr: partijNr });
    let ctx = await loadContext(matchmakingId, runId, partijNr);
    const boutId = uuid(ctx?.bout_id) ?? uuid(bout.bout_uid) ?? uuid(bout.bout_id);

    await enrichControleBoutContext(matchmakingId, runId, { partij_nr: partijNr, bout_id: boutId });
    ctx = await loadContext(matchmakingId, runId, partijNr);

    await rulesEngine({
      matchmaking_id: matchmakingId,
      controle_run_id: runId,
      ctxRows: ctx ? [ctx] : [],
      scoped_partij_nr: partijNr,
      scoped_bout_id: uuid(ctx?.bout_id) ?? boutId,
    });

    return NextResponse.json({
      ok: true,
      message: "Partij opnieuw opgebouwd uit databasegegevens; er is niet gescrapet.",
      matchmaking_id: matchmakingId,
      partij_nr: partijNr,
      controle_run_id: runId,
      processed_aanmeldingen: ids,
    });
  } catch (error: any) {
    console.error("[POST /api/matchmaker/rebuild-bout]", error);
    return NextResponse.json({ ok: false, error: error?.message ?? "Partij herbouwen mislukt" }, { status: 500 });
  }
}
