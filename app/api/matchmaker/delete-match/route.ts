import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

async function getUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) throw new Error("Niet ingelogd.");

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Niet ingelogd.");

  return data.user;
}

function parseObject(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      // Ongeldige oude raw_json mag ontbinden niet blokkeren.
    }
  }

  return {};
}

function withoutMatchMarker(extraValue: unknown) {
  const extra = { ...parseObject(extraValue) };
  delete extra.gematcht;
  delete extra.matchmaker_match;
  return extra;
}

async function resetAanmeldingen(matchmakingId: string, ids: string[]) {
  if (!ids.length) return;

  const now = new Date().toISOString();
  const payloads = [
    { status: "beschikbaar", updated_at: now },
    { status: "beschikbaar" },
  ];

  for (const payload of payloads) {
    const { error } = await supabaseAdmin
      .from("aanmeldingen")
      .update(payload)
      .eq("matchmaking_id", matchmakingId)
      .in("id", ids);

    if (!error) return;

    const missingColumn =
      error.code === "PGRST204" ||
      error.code === "42703" ||
      String(error.message ?? "").includes("column") ||
      String(error.message ?? "").includes("schema cache");

    if (!missingColumn) throw error;
  }
}

async function resetFighterContext(matchmakingId: string, ids: string[]) {
  if (!ids.length) return;

  const { data: rows, error } = await supabaseAdmin
    .from("matchmaker_fighter_context")
    .select("id, extra")
    .eq("matchmaking_id", matchmakingId)
    .in("inschrijving_id", ids);

  if (error) throw error;

  for (const row of rows ?? []) {
    const nextExtra = withoutMatchMarker(row.extra);
    const now = new Date().toISOString();

    const first = await supabaseAdmin
      .from("matchmaker_fighter_context")
      .update({ extra: nextExtra, updated_at: now })
      .eq("id", row.id);

    if (!first.error) continue;

    const fallback = await supabaseAdmin
      .from("matchmaker_fighter_context")
      .update({ extra: nextExtra })
      .eq("id", row.id);

    if (fallback.error) throw fallback.error;
  }
}

async function deleteScopedRows(
  table: string,
  matchmakingId: string,
  partijNr: number,
  boutId: string | null,
) {
  let query = supabaseAdmin.from(table).delete().eq("matchmaking_id", matchmakingId);

  // bout_id is de stabielste sleutel. partij_nr is fallback voor oudere rijen.
  if (boutId) query = query.eq("bout_id", boutId);
  else query = query.eq("partij_nr", partijNr);

  const { error } = await query;
  if (error && error.code !== "42P01") throw error;
}

export async function POST(req: Request) {
  try {
    await getUser(req);
    const body = await req.json().catch(() => ({}));

    const matchmakingId = s(body.matchmaking_id);
    const partijNr = Number(body.partij_nr);
    const requestedBoutId = s(body.bout_id) || null;

    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt." }, { status: 400 });
    }

    if (!Number.isInteger(partijNr) || partijNr <= 0) {
      return NextResponse.json({ error: "Een geldig partij_nr ontbreekt." }, { status: 400 });
    }

    let boutQuery = supabaseAdmin
      .from("matchmaking_bouts_raw")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq("partij_nr", partijNr)
      .limit(1);

    if (requestedBoutId) boutQuery = boutQuery.eq("bout_uid", requestedBoutId);

    const { data: bout, error: boutError } = await boutQuery.maybeSingle();
    if (boutError) throw boutError;

    if (!bout) {
      return NextResponse.json({ error: "Match niet gevonden." }, { status: 404 });
    }

    if (bout.is_toernooi === true || s(bout.toernooi_code)) {
      return NextResponse.json(
        { error: "Deze route ontbindt alleen gewone matches, geen toernooien." },
        { status: 400 },
      );
    }

    const raw = parseObject(bout.raw_json);
    const inschrijvingIds = Array.from(
      new Set(
        [raw.rood_inschrijving_id, raw.blauw_inschrijving_id]
          .map(s)
          .filter(Boolean),
      ),
    );

    const boutId = s(bout.bout_uid) || requestedBoutId;

    // Eerst alle afgeleide controlerijen verwijderen, daarna pas de bronmatch.
    await deleteScopedRows("controle_resultaten", matchmakingId, partijNr, boutId);
    await deleteScopedRows("controle_uitslagen", matchmakingId, partijNr, boutId);
    await deleteScopedRows("controle_bout_context", matchmakingId, partijNr, boutId);

    let deleteBoutQuery = supabaseAdmin
      .from("matchmaking_bouts_raw")
      .delete()
      .eq("matchmaking_id", matchmakingId)
      .eq("partij_nr", partijNr);

    if (boutId) deleteBoutQuery = deleteBoutQuery.eq("bout_uid", boutId);

    const { error: deleteBoutError } = await deleteBoutQuery;
    if (deleteBoutError) throw deleteBoutError;

    await resetAanmeldingen(matchmakingId, inschrijvingIds);
    await resetFighterContext(matchmakingId, inschrijvingIds);

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      partij_nr: partijNr,
      bout_id: boutId,
      vrijgegeven_inschrijvingen: inschrijvingIds,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Match ontbinden mislukt.",
        code: error?.code ?? null,
        details: error?.details ?? null,
      },
      { status: 500 },
    );
  }
}
