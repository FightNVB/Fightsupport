import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const runtime = "nodejs";

type AnyRow = Record<string, any>;

function s(v: unknown) {
  return String(v ?? "").trim();
}

function va(v: unknown) {
  const x = s(v).replace(/[^0-9]/g, "");
  return x || null;
}

function fullName(row?: AnyRow | null) {
  return (
    s(row?.naam) ||
    s(row?.fp_naam) ||
    s(row?.naam_input) ||
    [row?.voornaam, row?.achternaam].map(s).filter(Boolean).join(" ") ||
    null
  );
}

function parseObj(v: unknown): AnyRow {
  if (!v) return {};
  if (typeof v === "object") return v as AnyRow;

  try {
    const parsed = JSON.parse(String(v));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function buildUploadBatches(rows: AnyRow[]) {
  const map = new Map<string, AnyRow>();

  for (const row of rows ?? []) {
    const uploadId = s(row?.upload_id ?? row?.raw?.upload_batch_id);
    if (!uploadId) continue;

    const current =
      map.get(uploadId) ?? {
        id: uploadId,
        upload_id: uploadId,
        filename: row?.raw?.upload_filename ?? null,
        storage_path: row?.raw?.storage_path ?? null,
        rows: 0,
        source: "aanmeldingen",
      };

    current.rows += 1;
    current.filename = current.filename ?? row?.raw?.upload_filename ?? null;
    current.storage_path = current.storage_path ?? row?.raw?.storage_path ?? null;

    map.set(uploadId, current);
  }

  return Array.from(map.values());
}

function parseRawJson(v: unknown): AnyRow {
  if (!v) return {};
  if (typeof v === "object") return v as AnyRow;
  try {
    const parsed = JSON.parse(String(v));
    return parsed && typeof parsed === "object" ? (parsed as AnyRow) : {};
  } catch {
    return {};
  }
}

function isRemovedBout(row: AnyRow) {
  return (
    row?.verwijderd === true ||
    String(row?.verwijderd ?? "").trim().toLowerCase() === "true" ||
    String(row?.verwijderd ?? "").trim() === "1"
  );
}

function isToernooiBout(row: AnyRow) {
  const code = s(row?.toernooi_code).toUpperCase();
  return (
    !!code ||
    row?.is_toernooi === true ||
    String(row?.is_toernooi ?? "").trim().toLowerCase() === "true" ||
    String(row?.is_toernooi ?? "").trim() === "1"
  );
}

function collectMatchedFromBouts(rows: AnyRow[]) {
  const ids = new Set<string>();
  const vas = new Set<string>();

  for (const row of rows ?? []) {
    if (!row || isRemovedBout(row)) continue;

    const raw = parseRawJson(row?.raw_json);
    const deelnemer = parseRawJson(raw?.deelnemer);

    [
      row?.rood_inschrijving_id,
      row?.blauw_inschrijving_id,
      row?.red_inschrijving_id,
      row?.blue_inschrijving_id,
      row?.rood_aanmelding_id,
      row?.blauw_aanmelding_id,
      row?.red_aanmelding_id,
      row?.blue_aanmelding_id,
      row?.inschrijving_id,
      row?.aanmelding_id,
      deelnemer?.inschrijving_id,
      deelnemer?.aanmelding_id,
      deelnemer?.id,
      raw?.inschrijving_id,
      raw?.aanmelding_id,
    ]
      .map(s)
      .filter(Boolean)
      .forEach((id) => ids.add(id));

    [
      row?.va_rood,
      row?.va_blauw,
      row?.rood_va,
      row?.blauw_va,
      row?.red_va,
      row?.blue_va,
      row?.va_nummer,
      row?.fighter_id,
      row?.rood_fighter_id,
      row?.blauw_fighter_id,
      deelnemer?.va_nummer,
      deelnemer?.va,
      deelnemer?.fighter_id,
      raw?.va_nummer,
      raw?.va,
      raw?.fighter_id,
    ]
      .map(va)
      .filter((x): x is string => !!x)
      .forEach((nummer) => vas.add(nummer));
  }

  return { ids, vas };
}

function markFighterMatched(fighter: AnyRow, matched: { ids: Set<string>; vas: Set<string> }) {
  const inschrijvingId = s(fighter?.inschrijving_id ?? fighter?.id ?? fighter?.aanmelding_id);
  const cleanVa = va(fighter?.va_nummer ?? fighter?.va ?? fighter?.fighter_id);
  const isMatched =
    (!!inschrijvingId && matched.ids.has(inschrijvingId)) ||
    (!!cleanVa && matched.vas.has(cleanVa));

  if (!isMatched) return fighter;

  return {
    ...fighter,
    __fs_gematcht: true,
    __fs_status: "gematcht",
    status: "gematcht",
    aanmelding_status: "gematcht",
  };
}

function mergeFighter(context: AnyRow | null, aanmelding: AnyRow | null, raw: AnyRow | null) {
  const extra = parseObj(context?.extra);

  const cleanVa = va(
    context?.va_nummer ??
      context?.va ??
      raw?.va_nummer ??
      raw?.fighter_id ??
      aanmelding?.va_nummer,
  );

  return {
    ...(aanmelding ?? {}),
    ...(context ?? {}),

    context_id: context?.id ?? null,
    inschrijving_id: context?.inschrijving_id ?? aanmelding?.id ?? null,
    source: context ? "matchmaker_fighter_context" : "aanmeldingen",

    va_nummer: cleanVa,
    fighter_id: context?.fighter_id ?? raw?.fighter_id ?? cleanVa,

    naam: fullName(raw) || fullName(context) || fullName(aanmelding),
    naam_input: context?.naam_input ?? aanmelding?.naam_input ?? fullName(aanmelding),

    gym: context?.gym_input ?? context?.gym ?? aanmelding?.gym ?? null,
    fp_gym: context?.fp_gym ?? raw?.sportschool ?? raw?.gym ?? null,

    geboortedatum: context?.geboortedatum_input ?? aanmelding?.geboortedatum ?? null,
    fp_geboortedatum: context?.fp_geboortedatum ?? raw?.geboortedatum ?? null,

    geslacht: context?.geslacht ?? raw?.geslacht ?? aanmelding?.geslacht ?? null,

    klasse: context?.klasse ?? aanmelding?.klasse ?? null,
    fp_klasse: context?.fp_klasse ?? raw?.klasse ?? raw?.nulmeting_klasse ?? null,

    discipline: context?.discipline ?? aanmelding?.discipline ?? null,
    gewicht: context?.gewicht ?? aanmelding?.gewicht ?? null,

    licentie_status:
      context?.licentie_status ??
      context?.licentie ??
      raw?.licentie ??
      raw?.licentie_status ??
      null,

    heeft_keurmerk:
      context?.heeft_keurmerk ??
      extra?.heeft_keurmerk ??
      extra?.keurmerk?.geldig ??
      null,

    keurmerk_status:
      context?.keurmerk_status ??
      extra?.keurmerk_status ??
      extra?.keurmerk?.status ??
      null,

    totaal_wedstrijden: context?.totaal_wedstrijden ?? raw?.totaal_wedstrijden ?? null,
    record: context?.record ?? raw?.record ?? null,

    raw_fighter: raw,
    extra,
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ matchmakingid: string }> },
) {
  try {
    const params = await ctx.params;

    console.log("MATCHMAKER ROUTE PARAMS:", params);

    const mmId = s(
      (params as any)?.matchmakingid ??
      (params as any)?.matchmakingId
    );

    console.log("MATCHMAKER ROUTE MMID:", mmId);

    if (!mmId || mmId === "undefined" || mmId === "null") {
      return NextResponse.json(
        { error: "Ongeldige matchmaking id" },
        { status: 400 },
      );
    }
    
    const [mmRes, aanmeldingenRes, contextRes, rawRes, matchesRes, runsRes] =
      await Promise.all([
        supabaseAdmin.from("matchmakings").select("*").eq("id", mmId).single(),

        supabaseAdmin
          .from("aanmeldingen")
          .select("*")
          .eq("matchmaking_id", mmId)
          .order("row_nr", { ascending: true }),

        supabaseAdmin
          .from("matchmaker_fighter_context")
          .select("*")
          .eq("matchmaking_id", mmId)
          .order("created_at", { ascending: false }),

        supabaseAdmin
          .from("matchmaker_fighters_raw")
          .select("*")
          .eq("matchmaking_id", mmId),

        supabaseAdmin
          .from("matchmaking_bouts_raw")
          .select("*")
          .eq("matchmaking_id", mmId)
          .order("partij_nr", { ascending: true }),

        supabaseAdmin
          .from("controle_runs")
          .select("*")
          .eq("matchmaking_id", mmId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    if (mmRes.error) throw mmRes.error;
    if (aanmeldingenRes.error) throw aanmeldingenRes.error;

    const aanmeldingen = aanmeldingenRes.data ?? [];
    const contexts = contextRes.error ? [] : contextRes.data ?? [];
    const rawRows = rawRes.error ? [] : rawRes.data ?? [];

    const aanmeldingById = new Map<string, AnyRow>();
    for (const row of aanmeldingen) {
      aanmeldingById.set(String(row.id), row);
    }

    const rawByVa = new Map<string, AnyRow>();
    for (const row of rawRows) {
      const key = va(row.va_nummer ?? row.fighter_id);
      if (key && !rawByVa.has(key)) rawByVa.set(key, row);
    }

    const seen = new Set<string>();
    const fighters: AnyRow[] = [];

    for (const ctxRow of contexts) {
      const inschrijvingId = s(ctxRow.inschrijving_id);
      const cleanVa = va(ctxRow.va_nummer ?? ctxRow.va ?? ctxRow.fighter_id);
      const key = inschrijvingId || cleanVa || s(ctxRow.id);

      if (!key || seen.has(key)) continue;

      seen.add(key);

      fighters.push(
        mergeFighter(
          ctxRow,
          aanmeldingById.get(inschrijvingId) ?? null,
          cleanVa ? rawByVa.get(cleanVa) ?? null : null,
        ),
      );
    }

    for (const row of aanmeldingen) {
      const cleanVa = va(row.va_nummer);
      const key = s(row.id) || cleanVa;

      if (!key || seen.has(key)) continue;

      seen.add(key);

      fighters.push(
        mergeFighter(
          null,
          row,
          cleanVa ? rawByVa.get(cleanVa) ?? null : null,
        ),
      );
    }

    const matches = matchesRes.error ? [] : matchesRes.data ?? [];
    const toernooien = matches.filter(isToernooiBout);
    const matchedKeys = collectMatchedFromBouts(matches);
    const fightersWithMatchStatus = fighters.map((fighter) =>
      markFighterMatched(fighter, matchedKeys),
    );
    const aanmeldingenWithMatchStatus = aanmeldingen.map((row) =>
      markFighterMatched(row, matchedKeys),
    );

    return NextResponse.json({
      ok: true,
      matchmaking: mmRes.data,
      uploads: buildUploadBatches(aanmeldingen),
      aanmeldingen: aanmeldingenWithMatchStatus,
      fighters: fightersWithMatchStatus,

      // Belangrijk: de match-page zoekt op meerdere namen. Daarom dezelfde rows
      // bewust onder alle gangbare sleutels teruggeven.
      matches,
      bouts: matches,
      matchmaking_bouts_raw: matches,
      toernooien,
      tournaments: toernooien,

      scrape_runs: runsRes.error ? [] : runsRes.data ?? [],
      warnings: {
        context: contextRes.error?.message ?? null,
        raw: rawRes.error?.message ?? null,
        matches: matchesRes.error?.message ?? null,
        runs: runsRes.error?.message ?? null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Onbekende fout" },
      { status: 500 },
    );
  }
}
