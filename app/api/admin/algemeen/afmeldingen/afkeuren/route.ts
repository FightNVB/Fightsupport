import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";
import { privateJson, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";

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
  return privateJson({ ok: false, error: msg, ...(extra === undefined ? {} : { extra }) }, status);
}

function isMissingColumnError(error: any) {
  const msg = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "");
  return code === "42703" || code === "PGRST204" || msg.includes("could not find") || msg.includes("does not exist");
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
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}

function mergeJson(current: unknown, patch: AnyRow) {
  const base = current && typeof current === "object" && !Array.isArray(current) ? (current as AnyRow) : {};
  return { ...base, ...patch };
}

async function safeUpdate(table: string, filters: AnyRow, patch: AnyRow) {
  let payload = dropUndefined({ ...patch });
  for (let i = 0; i < 20; i += 1) {
    let query = supabase.from(table).update(payload);
    for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
    const { error } = await query;
    if (!error) return { error: null, payload };
    if (!isMissingColumnError(error)) return { error, payload };
    const col = missingColumnName(error);
    if (!col || !(col in payload)) return { error, payload };
    delete payload[col];
  }
  return { error: { message: `Update in ${table} mislukt door schema-afwijkingen` }, payload };
}

async function readBody(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return await req.json();
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    return Object.fromEntries(form.entries());
  }
  const text = await req.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

async function setAanmeldingStatus(row: AnyRow, status: string, extraPatch: AnyRow = {}) {
  if (!row?.inschrijving_id || !row?.matchmaking_id) return null;
  const result = await safeUpdate(
    "aanmeldingen",
    { id: row.inschrijving_id, matchmaking_id: row.matchmaking_id },
    {
      status,
      raw: mergeJson(row.raw, extraPatch),
      updated_at: new Date().toISOString(),
    },
  );
  return result.error;
}

async function setContextStatus(row: AnyRow, status: string, extraPatch: AnyRow = {}) {
  if (!row?.fighter_context_id) return null;

  const { data: ctx } = await supabase
    .from("matchmaker_fighter_context")
    .select("id, extra")
    .eq("id", row.fighter_context_id)
    .maybeSingle();

  const result = await safeUpdate(
    "matchmaker_fighter_context",
    { id: row.fighter_context_id },
    {
      status,
      afmelding_status: extraPatch.afmelding_status,
      afgemeld: status === "afgemeld",
      beschikbaar: status !== "afgemeld",
      extra: mergeJson(ctx?.extra, extraPatch),
      updated_at: new Date().toISOString(),
    },
  );
  return result.error;
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  try {
    const body = await readBody(req);
    const id = asString(body.afmelding_id ?? body.afmeldingId ?? body.id);
    if (!id || !isValidId(id)) return bad("Geldige afmelding_id ontbreekt");

    const herstelStatus = asString(body.herstel_status ?? body.herstelStatus) || "gescrapt";

    const { data: current, error: loadError } = await supabase.from("afmeldingen").select("*").eq("id", id).maybeSingle();
    if (loadError) return bad("Afmelding laden mislukt", 500);
    if (!current) return bad("Afmelding niet gevonden", 404);

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("afmeldingen")
      .update({
        status: "afgekeurd",
        beoordeeld_at: now,
        beoordeeld_door: auth.userId,
        beoordelings_opmerking: asString(body.beoordelings_opmerking ?? body.opmerking ?? body.reason),
        updated_at: now,
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) return bad("Afmelding afkeuren mislukt", 500);

    // Bij afkeuren mag de vechter terug naar gecontroleerd/gescrapt.
    const statusPatch = { afmelding_id: id, afmelding_status: "afgekeurd", afgemeld: false, beschikbaar: true };
    const statusError = await setAanmeldingStatus(current, herstelStatus, statusPatch);
    if (statusError) return bad("Aanmelding herstellen mislukt", 500);

    const contextError = await setContextStatus(current, herstelStatus, statusPatch);
    if (contextError) return bad("Fighter context herstellen mislukt", 500);

    return privateJson({ ok: true, afmelding: data, herstel_status: herstelStatus });
  } catch (e: any) {
    return secureError(e, "Afmelding kon niet worden afgekeurd.");
  }
}

export async function PATCH(req: Request) {
  return POST(req);
}
