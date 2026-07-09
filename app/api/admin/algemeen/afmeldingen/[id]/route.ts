import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type AnyRow = Record<string, any>;

function s(v: unknown) {
  return String(v ?? "").trim();
}

function asString(v: unknown) {
  const x = s(v);
  return x || null;
}

function isUuid(v: unknown) {
  const x = s(v);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
}

function isValidId(v: unknown) {
  const x = s(v);
  return isUuid(x) || /^\d+$/.test(x);
}

function bad(msg: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: msg, extra }, { status });
}

function pickName(row: AnyRow) {
  return (
    asString(row?.naam_input) ||
    asString(row?.fp_naam) ||
    asString(row?.naam) ||
    [row?.voornaam, row?.achternaam].map(s).filter(Boolean).join(" ") ||
    null
  );
}

function normalize(row: AnyRow) {
  return {
    ...row,
    display_naam: pickName(row),
    display_sportschool: asString(row?.sportschool) || asString(row?.gym_input) || asString(row?.fp_gym) || asString(row?.gym),
    display_event: asString(row?.event_naam) || asString(row?.evenement_naam) || asString(row?.raw?.event?.naam) || asString(row?.raw?.matchmaking?.naam),
    display_event_datum: asString(row?.event_datum) || asString(row?.evenement_datum) || asString(row?.raw?.event?.datum) || asString(row?.raw?.matchmaking?.datum),
  };
}

async function loadHistorie(row: AnyRow) {
  const va = asString(row?.va_nummer);
  const naamInput = asString(row?.naam_input);
  const fpNaam = asString(row?.fp_naam);
  const inschrijvingId = row?.inschrijving_id;

  const ors: string[] = [];
  if (va) ors.push(`va_nummer.eq.${va}`);
  if (inschrijvingId) ors.push(`inschrijving_id.eq.${inschrijvingId}`);
  if (naamInput) ors.push(`naam_input.eq.${naamInput}`);
  if (fpNaam) ors.push(`fp_naam.eq.${fpNaam}`);
  if (!ors.length) return [];

  const { data } = await supabase
    .from("afmeldingen")
    .select("*")
    .or(ors.join(","))
    .order("afgemeld_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  return (data || []).map(normalize);
}


function isMissingColumnError(error: any) {
  const msg = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "");
  return (
    code === "42703" ||
    code === "PGRST204" ||
    msg.includes("could not find") ||
    msg.includes("does not exist")
  );
}

function missingColumnName(error: any) {
  const msg = String(error?.message || "");
  return (
    msg.match(/column\s+["']?([a-zA-Z0-9_]+)["']?\s+does not exist/i)?.[1] ||
    msg.match(/Could not find the ['"]?([a-zA-Z0-9_]+)['"]? column/i)?.[1] ||
    msg.match(/'([a-zA-Z0-9_]+)' column/i)?.[1] ||
    null
  );
}

function dropUndefined(row: AnyRow) {
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined),
  );
}

function mergeJson(current: unknown, patch: AnyRow) {
  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? (current as AnyRow)
      : {};
  return { ...base, ...patch };
}

async function safeUpdate(table: string, filters: AnyRow, patch: AnyRow) {
  let payload = dropUndefined({ ...patch });

  for (let i = 0; i < 20; i += 1) {
    let query = supabase.from(table).update(payload);
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }

    const { error } = await query;
    if (!error) return { error: null, payload };
    if (!isMissingColumnError(error)) return { error, payload };

    const col = missingColumnName(error);
    if (!col || !(col in payload)) return { error, payload };
    delete payload[col];
  }

  return {
    error: { message: `Update in ${table} mislukt door schema-afwijkingen` },
    payload,
  };
}

async function restoreAanmeldingAfterDelete(row: AnyRow, userId: string | null) {
  if (!row?.inschrijving_id || !row?.matchmaking_id) return null;

  const rawPatch = {
    afmelding_verwijderd: true,
    afmelding_verwijderd_at: new Date().toISOString(),
    afmelding_verwijderd_door: userId,
    verwijderde_afmelding_id: row.id,
    afgemeld: false,
    afmelding_status: "verwijderd",
  };

  const result = await safeUpdate(
    "aanmeldingen",
    { id: row.inschrijving_id, matchmaking_id: row.matchmaking_id },
    {
      status: "gescrapt",
      raw: mergeJson(row.raw, rawPatch),
      updated_at: new Date().toISOString(),
    },
  );

  return result.error;
}

async function restoreContextAfterDelete(row: AnyRow, userId: string | null) {
  if (!row?.fighter_context_id) return null;

  const { data: ctx } = await supabase
    .from("matchmaker_fighter_context")
    .select("id, extra")
    .eq("id", row.fighter_context_id)
    .maybeSingle();

  const extraPatch = {
    afmelding_verwijderd: true,
    afmelding_verwijderd_at: new Date().toISOString(),
    afmelding_verwijderd_door: userId,
    verwijderde_afmelding_id: row.id,
    afgemeld: false,
    afmelding_status: "verwijderd",
    beschikbaar: true,
  };

  const result = await safeUpdate(
    "matchmaker_fighter_context",
    { id: row.fighter_context_id },
    {
      status: "gescrapt",
      afmelding_status: "verwijderd",
      afgemeld: false,
      beschikbaar: true,
      extra: mergeJson(ctx?.extra, extraPatch),
      updated_at: new Date().toISOString(),
    },
  );

  return result.error;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await ctx.params;
    const id = params.id;
    if (!isValidId(id)) return bad("Geldige afmelding id ontbreekt");

    const { data, error } = await supabase.from("afmeldingen").select("*").eq("id", id).maybeSingle();
    if (error) return bad("Afmelding laden mislukt", 500, error.message);
    if (!data) return bad("Afmelding niet gevonden", 404);

    const afmelding = normalize(data);
    const historie = await loadHistorie(data);
    const vaker_afgemeld = historie.filter((x: AnyRow) => x.id !== id).length;

    return NextResponse.json({ ok: true, afmelding, historie, vaker_afgemeld });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}


export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { userId } = await requireUserWithRole(req, ["admin", "superadmin"]);
    const params = await ctx.params;
    const id = params.id;

    if (!isValidId(id)) return bad("Geldige afmelding id ontbreekt");

    const { data: current, error: loadError } = await supabase
      .from("afmeldingen")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (loadError) return bad("Afmelding laden mislukt", 500, loadError.message);
    if (!current) return bad("Afmelding niet gevonden", 404);

    // Verwijderen betekent: afmelding weg en gekoppelde vechter terug naar gecontroleerd/matchbaar.
    const aanmeldingError = await restoreAanmeldingAfterDelete(current, userId ?? null);
    if (aanmeldingError) {
      return bad("Aanmelding herstellen mislukt", 500, aanmeldingError.message);
    }

    const contextError = await restoreContextAfterDelete(current, userId ?? null);
    if (contextError) {
      return bad("Fighter context herstellen mislukt", 500, contextError.message);
    }

    const { error: deleteError } = await supabase
      .from("afmeldingen")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return bad("Afmelding verwijderen mislukt", 500, deleteError.message);
    }

    return NextResponse.json({
      ok: true,
      deleted: true,
      afmelding_id: id,
      herstel_status: "gescrapt",
    });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> | { id: string } },
) {
  return DELETE(req, ctx);
}
