import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { buildFighterContextsForAanmeldingen } from "@/lib/matchmaker/buildSingleFighterContext";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const runtime = "nodejs";

type AnyRow = Record<string, any>;

function s(v: any): string {
  return String(v ?? "").trim();
}

function toVa(v: any): string | null {
  const digits = s(v).replace(/[^0-9]/g, "");
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

function missingColumnName(error: any): string | null {
  const msg = String(error?.message ?? error ?? "");
  const m = msg.match(/Could not find the ['\"]([^'\"]+)['\"] column/i);
  return m?.[1] ?? null;
}

function pick(row: AnyRow | null | undefined, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return null;
}

function fullName(row: AnyRow | null | undefined) {
  return (
    pick(row, ["naam", "naam_fp", "fighter_naam", "full_name"]) ??
    [pick(row, ["voornaam"]), pick(row, ["achternaam"])].filter(Boolean).join(" ")
  ).trim();
}

async function safeInsert(table: string, rows: AnyRow[]) {
  if (!rows.length) return { data: [] as AnyRow[], error: null as any };
  let body = rows.map((row) => ({ ...row }));

  for (let attempt = 0; attempt < 30; attempt++) {
    const { data, error } = await supabaseAdmin.from(table).insert(body).select("*");
    if (!error) return { data: data ?? [], error: null as any };

    const col = missingColumnName(error);
    if (col && body.some((row) => Object.prototype.hasOwnProperty.call(row, col))) {
      body = body.map((row) => {
        const next = { ...row };
        delete next[col];
        return next;
      });
      continue;
    }

    return { data: null as any, error };
  }

  return { data: null as any, error: new Error(`${table}: te veel schema-aanpassingen nodig`) };
}

async function safeUpdateIn(table: string, patch: AnyRow, column: string, values: string[], extraEq: AnyRow = {}) {
  if (!values.length) return null;
  let body = { ...patch };

  for (let attempt = 0; attempt < 20; attempt++) {
    let q = supabaseAdmin.from(table).update(body).in(column, values);
    for (const [key, value] of Object.entries(extraEq)) q = q.eq(key, value);
    const { error } = await q;
    if (!error) return null;

    const col = missingColumnName(error);
    if (col && Object.prototype.hasOwnProperty.call(body, col)) {
      delete body[col];
      continue;
    }

    return error;
  }

  return new Error(`${table}: update past niet op schema`);
}

function buildContextRow(matchmakingId: string, runId: string, aanmelding: AnyRow, raw: AnyRow | null) {
  const va = toVa(aanmelding?.va_nummer ?? aanmelding?.va ?? aanmelding?.va_nr ?? aanmelding?.vanummer) ?? toVa(raw?.va_nummer ?? raw?.fighter_id);
  const naamInput = fullName(aanmelding);
  const fpNaam = raw ? fullName(raw) : "";
  const now = new Date().toISOString();

  return {
    matchmaking_id: matchmakingId,
    controle_run_id: runId,
    inschrijving_id: aanmelding.id,
    row_nr: aanmelding.row_nr ?? null,
    upload_id: aanmelding.upload_id ?? null,
    fighter_id: va ?? raw?.fighter_id ?? null,
    va_nummer: va ?? raw?.va_nummer ?? raw?.fighter_id ?? null,
    va: va ?? raw?.va_nummer ?? raw?.fighter_id ?? null,

    naam: fpNaam || naamInput || null,
    naam_input: naamInput || null,
    fp_naam: fpNaam || null,
    voornaam: aanmelding.voornaam ?? null,
    achternaam: aanmelding.achternaam ?? null,

    discipline: aanmelding.discipline ?? raw?.discipline ?? null,
    klasse: aanmelding.klasse ?? raw?.klasse ?? raw?.nulmeting_klasse ?? null,
    fp_klasse: raw?.klasse ?? raw?.nulmeting_klasse ?? null,
    nulmeting_klasse: raw?.nulmeting_klasse ?? raw?.klasse ?? null,
    nulmeting_opmerking: raw?.nulmeting_opmerking ?? null,

    geslacht: raw?.geslacht ?? aanmelding.geslacht ?? null,
    fp_geslacht: raw?.geslacht ?? null,
    geboortedatum: raw?.geboortedatum ?? aanmelding.geboortedatum ?? null,
    fp_geboortedatum: raw?.geboortedatum ?? null,
    geboortedatum_input: aanmelding.geboortedatum ?? null,

    gym: raw?.sportschool ?? raw?.gym ?? aanmelding.gym ?? null,
    fp_gym: raw?.sportschool ?? raw?.gym ?? null,
    gym_input: aanmelding.gym ?? null,
    gewicht: aanmelding.gewicht ?? raw?.gewicht ?? null,

    licentie: raw?.licentie ?? raw?.licentie_status ?? null,
    licentie_status: raw?.licentie_status ?? raw?.licentie ?? null,
    heeft_startverbod: raw?.heeft_startverbod ?? raw?.startverbod ?? null,
    heeft_keurmerk: raw?.heeft_keurmerk ?? raw?.keurmerk ?? raw?.gym_keurmerk ?? null,
    keurmerk: raw?.keurmerk ?? raw?.heeft_keurmerk ?? null,

    totaal_wedstrijden: raw?.totaal_wedstrijden ?? raw?.record_totaal ?? null,
    uitslagen_count: raw?.uitslagen_count ?? raw?.totaal_wedstrijden ?? null,
    laatste_partij_datum: raw?.laatste_partij_datum ?? null,

    scrape_status: raw ? "gecontroleerd" : "controle_mislukt",
    controle_status: raw ? "gecontroleerd" : "controle_mislukt",
    scraped_at: raw ? now : null,
    checked_at: raw ? now : null,
    bron: "aanmeldingen",
    raw: { aanmelding, fighters_raw: raw },
    created_at: now,
    updated_at: now,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmaking_id ?? body?.matchmaker_matchmaking_id);
    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt" }, { status: 400 });
    }

    const runId = s(body?.controle_run_id ?? body?.scrape_run_id) || crypto.randomUUID();

    const { data: aanmeldingen, error: aErr } = await supabaseAdmin
      .from("aanmeldingen")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .order("row_nr", { ascending: true });

    if (aErr) throw aErr;

    const vaNummers = Array.from(
      new Set((aanmeldingen ?? []).map((row: AnyRow) => toVa(row.va_nummer ?? row.va ?? row.va_nr)).filter(Boolean) as string[])
    );

    const { data: rawRows, error: rawErr } = vaNummers.length
      ? await supabaseAdmin.from("fighters_raw").select("*").eq("matchmaking_id", matchmakingId).in("va_nummer", vaNummers)
      : { data: [], error: null as any };

    if (rawErr) throw rawErr;

    const rawByVa = new Map<string, AnyRow>();
    for (const raw of rawRows ?? []) {
      const va = toVa(raw.va_nummer ?? raw.fighter_id);
      if (va && !rawByVa.has(va)) rawByVa.set(va, raw);
    }

    const { data: mmDate } = await supabaseAdmin.from("matchmakings").select("datum").eq("id", matchmakingId).maybeSingle();

    const inserted = await buildFighterContextsForAanmeldingen({
      supabase: supabaseAdmin,
      matchmakingId,
      controleRunId: runId,
      aanmeldingen: aanmeldingen ?? [],
      rawRows: rawRows ?? [],
      eventDate: mmDate?.datum ?? null,
      writeRules: true,
    });
    if (inserted.error) throw inserted.error;

    const foundVas = new Set([...rawByVa.keys()]);
    const found = vaNummers.filter((va) => foundVas.has(va));
    const missing = vaNummers.filter((va) => !foundVas.has(va));
    const now = new Date().toISOString();

    await safeUpdateIn(
      "aanmeldingen",
      { scrape_status: "gecontroleerd", controle_status: "gecontroleerd", scraped_at: now, checked_at: now, updated_at: now },
      "va_nummer",
      found,
      { matchmaking_id: matchmakingId }
    );

    await safeUpdateIn(
      "aanmeldingen",
      { scrape_status: "controle_mislukt", controle_status: "controle_mislukt", checked_at: now, updated_at: now },
      "va_nummer",
      missing,
      { matchmaking_id: matchmakingId }
    );

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      count: inserted.data?.length ?? contextRows.length,
      fighters_raw_count: rawRows?.length ?? 0,
      gecontroleerd: found.length,
      controle_mislukt: missing.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
