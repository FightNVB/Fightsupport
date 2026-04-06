import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function bad(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, extra }, { status });
}

function clean(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

type MatchmakerBoutRow = {
  id: number;
  matchmaker_matchmaking_id: number;
  partij_nr: number;
  rood_inschrijving_id: number;
  blauw_inschrijving_id: number;
  created_at: string;
  discipline: string | null;
  klasse: string | null;
  gepland_op: string | null;
  created_by: string | null;
  status: string;
  leeftijd_type: string | null;
  rood_naam: string | null;
  blauw_naam: string | null;
  rood_gym: string | null;
  blauw_gym: string | null;
  rood_va: string | null;
  blauw_va: string | null;
  rood_gewicht: number | string | null;
  blauw_gewicht: number | string | null;
  source_match_id: string | null;
  submitted_at: string | null;
  raw: any;
  matchmaking_id: string | null;
  max_gewicht: number | string | null;
};

type MatchmakingBoutRawRow = {
  id: number;
  upload_id: string | null;
  partij_nr: number | null;
  rood_naam: string | null;
  rood_voornaam: string | null;
  rood_achternaam: string | null;
  rood_gym: string | null;
  rood_leeftijd: number | null;
  rood_gewicht: number | string | null;
  blauw_naam: string | null;
  blauw_voornaam: string | null;
  blauw_achternaam: string | null;
  blauw_gym: string | null;
  blauw_leeftijd: number | null;
  blauw_gewicht: number | string | null;
  discipline: string | null;
  klasse: string | null;
  raw_json: string | null;
  created_at: string;
  matchmaking_id: string | null;
  is_toernooi: boolean | null;
  rood_geboortedatum: string | null;
  blauw_geboortedatum: string | null;
  sub_discipline: string | null;
  va_rood: string | null;
  va_blauw: string | null;
  max_gewicht: number | string | null;
  bout_uid: string | null;
  event_id: string | null;
  partij_label: string | null;
  rood_va_changed: boolean | null;
  blauw_va_changed: boolean | null;
  rood_va_changed_at: string | null;
  blauw_va_changed_at: string | null;
  rood_va_is_gewijzigd: boolean | null;
  blauw_va_is_gewijzigd: boolean | null;
  rood_va_mm_prev: string | null;
  blauw_va_mm_prev: string | null;
  rood_va_was: string | null;
  blauw_va_was: string | null;
  max_gewicht_notatie: string | null;
  max_gewicht_type: string | null;
};

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return bad(
        "Missing env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
        500
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return bad("Missing Authorization Bearer token", 401);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return bad("Unauthorized", 401, userErr?.message);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const matchmaking_id = String(body?.matchmaking_id ?? "").trim();

    if (!matchmaking_id) {
      return bad("matchmaking_id ontbreekt");
    }

    const { data: sourceRows, error: sourceErr } = await admin
      .from("matchmaker_bouts_raw")
      .select(`
        id,
        matchmaker_matchmaking_id,
        partij_nr,
        rood_inschrijving_id,
        blauw_inschrijving_id,
        created_at,
        discipline,
        klasse,
        gepland_op,
        created_by,
        status,
        leeftijd_type,
        rood_naam,
        blauw_naam,
        rood_gym,
        blauw_gym,
        rood_va,
        blauw_va,
        rood_gewicht,
        blauw_gewicht,
        source_match_id,
        submitted_at,
        raw,
        matchmaking_id,
        max_gewicht
      `)
      .eq("matchmaking_id", matchmaking_id)
      .order("partij_nr", { ascending: true });

    if (sourceErr) {
      return bad("Ophalen matchmaker_bouts_raw mislukt", 500, sourceErr);
    }

    const rows = (sourceRows ?? []) as MatchmakerBoutRow[];

    if (rows.length === 0) {
      return bad("Geen partijen gevonden in matchmaker_bouts_raw voor deze matchmaking.", 404);
    }

    const { data: existingRows, error: existingErr } = await admin
      .from("matchmaking_bouts_raw")
      .select(`
        id,
        upload_id,
        partij_nr,
        rood_naam,
        rood_voornaam,
        rood_achternaam,
        rood_gym,
        rood_leeftijd,
        rood_gewicht,
        blauw_naam,
        blauw_voornaam,
        blauw_achternaam,
        blauw_gym,
        blauw_leeftijd,
        blauw_gewicht,
        discipline,
        klasse,
        raw_json,
        created_at,
        matchmaking_id,
        is_toernooi,
        rood_geboortedatum,
        blauw_geboortedatum,
        sub_discipline,
        va_rood,
        va_blauw,
        max_gewicht,
        bout_uid,
        event_id,
        partij_label,
        rood_va_changed,
        blauw_va_changed,
        rood_va_changed_at,
        blauw_va_changed_at,
        rood_va_is_gewijzigd,
        blauw_va_is_gewijzigd,
        rood_va_mm_prev,
        blauw_va_mm_prev,
        rood_va_was,
        blauw_va_was,
        max_gewicht_notatie,
        max_gewicht_type
      `)
      .eq("matchmaking_id", matchmaking_id)
      .order("partij_nr", { ascending: true });

    if (existingErr) {
      return bad("Ophalen bestaande matchmaking_bouts_raw mislukt", 500, existingErr);
    }

    const existingByPartijNr = new Map<number, MatchmakingBoutRawRow>();
    for (const row of (existingRows ?? []) as MatchmakingBoutRawRow[]) {
      if (row.partij_nr != null) {
        existingByPartijNr.set(Number(row.partij_nr), row);
      }
    }

    const snapshotRows = rows.map((row) => {
      const existing = existingByPartijNr.get(Number(row.partij_nr));

      const rawObj =
        row.raw && typeof row.raw === "object"
          ? row.raw
          : row.raw
          ? { raw: row.raw }
          : {};

      return {
        upload_id: existing?.upload_id ?? null,
        partij_nr: Number(row.partij_nr),

        rood_naam: clean(row.rood_naam),
        rood_voornaam: existing?.rood_voornaam ?? null,
        rood_achternaam: existing?.rood_achternaam ?? null,
        rood_gym: clean(row.rood_gym),
        rood_leeftijd: existing?.rood_leeftijd ?? null,
        rood_gewicht: toNum(row.rood_gewicht),

        blauw_naam: clean(row.blauw_naam),
        blauw_voornaam: existing?.blauw_voornaam ?? null,
        blauw_achternaam: existing?.blauw_achternaam ?? null,
        blauw_gym: clean(row.blauw_gym),
        blauw_leeftijd: existing?.blauw_leeftijd ?? null,
        blauw_gewicht: toNum(row.blauw_gewicht),

        discipline: clean(row.discipline),
        klasse: clean(row.klasse),

        raw_json: JSON.stringify(rawObj),
        created_at: existing?.created_at ?? new Date().toISOString(),
        matchmaking_id,

        is_toernooi: existing?.is_toernooi ?? false,
        rood_geboortedatum: existing?.rood_geboortedatum ?? null,
        blauw_geboortedatum: existing?.blauw_geboortedatum ?? null,
        sub_discipline: existing?.sub_discipline ?? null,

        va_rood: clean(row.rood_va),
        va_blauw: clean(row.blauw_va),

        max_gewicht: toNum(row.max_gewicht),
        bout_uid: existing?.bout_uid ?? null,
        event_id: existing?.event_id ?? null,
        partij_label: existing?.partij_label ?? null,

        rood_va_changed: existing?.rood_va_changed ?? false,
        blauw_va_changed: existing?.blauw_va_changed ?? false,
        rood_va_changed_at: existing?.rood_va_changed_at ?? null,
        blauw_va_changed_at: existing?.blauw_va_changed_at ?? null,
        rood_va_is_gewijzigd: existing?.rood_va_is_gewijzigd ?? false,
        blauw_va_is_gewijzigd: existing?.blauw_va_is_gewijzigd ?? false,
        rood_va_mm_prev: existing?.rood_va_mm_prev ?? null,
        blauw_va_mm_prev: existing?.blauw_va_mm_prev ?? null,
        rood_va_was: existing?.rood_va_was ?? null,
        blauw_va_was: existing?.blauw_va_was ?? null,

        max_gewicht_notatie:
          existing?.max_gewicht_notatie ??
          (row.max_gewicht != null ? String(row.max_gewicht) : null),

        max_gewicht_type:
          existing?.max_gewicht_type ??
          (rawObj?.max_gewicht_type ? String(rawObj.max_gewicht_type) : null),
      };
    });

    const { error: deleteErr } = await admin
      .from("matchmaking_bouts_raw")
      .delete()
      .eq("matchmaking_id", matchmaking_id);

    if (deleteErr) {
      return bad("Verwijderen oude snapshot mislukt", 500, deleteErr);
    }

    const { error: insertErr, data: inserted } = await admin
      .from("matchmaking_bouts_raw")
      .insert(snapshotRows)
      .select("id, partij_nr");

    if (insertErr) {
      return bad("Opslaan snapshot naar matchmaking_bouts_raw mislukt", 500, {
        insertErr,
        firstRow: snapshotRows[0] ?? null,
      });
    }

    const { error: updateSourceErr } = await admin
      .from("matchmaker_bouts_raw")
      .update({
        status: "submitted_for_control",
        submitted_at: new Date().toISOString(),
      })
      .eq("matchmaking_id", matchmaking_id);

    if (updateSourceErr) {
      return bad(
        "Snapshot opgeslagen, maar status-update in matchmaker_bouts_raw mislukt",
        500,
        updateSourceErr
      );
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      submitted: inserted?.length ?? snapshotRows.length,
      partij_nrs: snapshotRows.map((x) => x.partij_nr),
      message: "Matchmaker-partijen zijn als snapshot doorgestuurd naar matchmaking_bouts_raw.",
    });
  } catch (e: any) {
    return bad(e?.message ?? "Submit to control mislukt.", 500);
  }
}