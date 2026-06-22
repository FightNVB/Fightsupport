import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type AnyRow = Record<string, any>;

type DeleteReport = Record<string, number>;

function s(v: unknown) {
  return String(v ?? "").trim();
}

function onlyDigits(v: any): string | null {
  const digits = String(v ?? "").replace(/[^0-9]/g, "").trim();
  return /^\d{3,6}$/.test(digits) ? digits : null;
}

function uuidOrNull(v: any): string | null {
  const x = s(v);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x)
    ? x
    : null;
}

function uniq(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((v) => s(v)).filter(Boolean)));
}

function addDeleted(deleted: DeleteReport, table: string, count: number) {
  deleted[table] = (deleted[table] ?? 0) + (count || 0);
}

function isMissingSchemaError(error: any) {
  const msg = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "");

  return (
    code === "42P01" || // relation does not exist
    code === "42703" || // column does not exist
    code === "PGRST204" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find") ||
    msg.includes("relation") && msg.includes("does not exist")
  );
}

function isBadValueForColumn(error: any) {
  const msg = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "");

  // Bijvoorbeeld: VA-nummer in een uuid-kolom zoals fighter_id.
  // Dan moet die kolom voor deze delete-poging worden overgeslagen, niet de hele route 500 laten geven.
  return (
    code === "22P02" ||
    msg.includes("invalid input syntax") ||
    msg.includes("invalid input")
  );
}

async function getUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) throw new Error("Niet ingelogd.");

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    throw new Error(error?.message || "Niet ingelogd.");
  }

  return data.user;
}

async function requireMatchmakerAccess(matchmaking_id: string, user_id: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmakings")
    .select("id, matchmaker_id, uploaded_by, huidige_eigenaar_user_id")
    .eq("id", matchmaking_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Matchmaking niet gevonden.");

  const allowed =
    data.matchmaker_id === user_id ||
    data.uploaded_by === user_id ||
    data.huidige_eigenaar_user_id === user_id;

  if (!allowed) throw new Error("Geen toegang tot deze matchmaking.");
}

async function selectRowsSafe(params: {
  table: string;
  matchmaking_id: string;
  column: string;
  value: string;
}) {
  const { table, matchmaking_id, column, value } = params;

  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq(column, value);

  if (error) {
    if (isMissingSchemaError(error) || isBadValueForColumn(error)) return [] as AnyRow[];
    throw new Error(`${table} lezen via ${column}: ${error.message}`);
  }

  return data ?? [];
}

async function safeSelectUploadAanmeldingen(matchmaking_id: string, upload_id: string) {
  const rowsByBatch = await selectRowsSafe({
    table: "aanmeldingen",
    matchmaking_id,
    column: "upload_batch_id",
    value: upload_id,
  });

  const rowsByUpload = await selectRowsSafe({
    table: "aanmeldingen",
    matchmaking_id,
    column: "upload_id",
    value: upload_id,
  });

  const byId = new Map<string, AnyRow>();
  for (const row of [...rowsByBatch, ...rowsByUpload]) {
    byId.set(s(row?.id) || JSON.stringify(row), row);
  }

  return [...byId.values()];
}

async function safeDeleteEq(params: {
  table: string;
  matchmaking_id: string;
  column: string;
  value: string;
}) {
  const { table, matchmaking_id, column, value } = params;
  if (!value) return 0;

  const { count, error } = await supabaseAdmin
    .from(table)
    .delete({ count: "exact" })
    .eq("matchmaking_id", matchmaking_id)
    .eq(column, value);

  if (error) {
    if (isMissingSchemaError(error) || isBadValueForColumn(error)) {
      console.warn(`[delete-aanmeldingupload] ${table}.${column} overgeslagen:`, error.message);
      return 0;
    }

    throw new Error(`${table}.${column}: ${error.message}`);
  }

  return count ?? 0;
}

async function safeDeleteIn(params: {
  table: string;
  matchmaking_id: string;
  column: string;
  values: string[];
}) {
  const { table, matchmaking_id, column, values } = params;
  const clean = uniq(values);
  if (!clean.length) return 0;

  const { count, error } = await supabaseAdmin
    .from(table)
    .delete({ count: "exact" })
    .eq("matchmaking_id", matchmaking_id)
    .in(column, clean);

  if (error) {
    if (isMissingSchemaError(error) || isBadValueForColumn(error)) {
      console.warn(`[delete-aanmeldingupload] ${table}.${column} overgeslagen:`, error.message);
      return 0;
    }

    throw new Error(`${table}.${column}: ${error.message}`);
  }

  return count ?? 0;
}

async function deleteByUploadColumns(params: {
  deleted: DeleteReport;
  table: string;
  matchmaking_id: string;
  upload_id: string;
}) {
  const { deleted, table, matchmaking_id, upload_id } = params;
  let count = 0;

  count += await safeDeleteEq({ table, matchmaking_id, column: "upload_batch_id", value: upload_id });
  count += await safeDeleteEq({ table, matchmaking_id, column: "upload_id", value: upload_id });

  addDeleted(deleted, table, count);
}

async function deleteByKnownFighterKeys(params: {
  deleted: DeleteReport;
  table: string;
  matchmaking_id: string;
  vaNummers: string[];
  fighterIds: string[];
  aanmeldingIds: string[];
}) {
  const { deleted, table, matchmaking_id, vaNummers, fighterIds, aanmeldingIds } = params;
  let count = 0;

  // VA hoort alleen in VA-achtige kolommen. Niet in fighter_id, want dat is vaak uuid.
  count += await safeDeleteIn({ table, matchmaking_id, column: "va_nummer", values: vaNummers });
  count += await safeDeleteIn({ table, matchmaking_id, column: "va", values: vaNummers });

  // Alleen echte UUID's naar fighter_id sturen.
  count += await safeDeleteIn({ table, matchmaking_id, column: "fighter_id", values: fighterIds });

  count += await safeDeleteIn({ table, matchmaking_id, column: "aanmelding_id", values: aanmeldingIds });
  count += await safeDeleteIn({ table, matchmaking_id, column: "inschrijving_id", values: aanmeldingIds });

  addDeleted(deleted, table, count);
}

async function deleteDerivedFighterData(params: {
  deleted: DeleteReport;
  matchmaking_id: string;
  upload_id: string;
  vaNummers: string[];
  fighterIds: string[];
  aanmeldingIds: string[];
}) {
  const { deleted, matchmaking_id, upload_id, vaNummers, fighterIds, aanmeldingIds } = params;

  // Niet matchmaker_fighter_rules toevoegen: die tabel bestaat bij jou niet.
  // Als je hem later ooit toevoegt, kan hij terug in deze lijst.
  const derivedTables = [
    "matchmaker_fighter_context",
    "matchmaker_fighter_resultaten",
    "matchmaker_fighters_raw",
    "matchmaker_uitslagen_raw",
  ];

  for (const table of derivedTables) {
    await deleteByUploadColumns({ deleted, table, matchmaking_id, upload_id });
    await deleteByKnownFighterKeys({
      deleted,
      table,
      matchmaking_id,
      vaNummers,
      fighterIds,
      aanmeldingIds,
    });
  }
}

async function deleteMatchmakingBoutsForUpload(params: {
  deleted: DeleteReport;
  matchmaking_id: string;
  upload_id: string;
  vaNummers: string[];
  aanmeldingIds: string[];
}) {
  const { deleted, matchmaking_id, upload_id, vaNummers, aanmeldingIds } = params;
  const table = "matchmaking_bouts_raw";
  let count = 0;

  count += await safeDeleteEq({ table, matchmaking_id, column: "upload_id", value: upload_id });
  count += await safeDeleteEq({ table, matchmaking_id, column: "upload_batch_id", value: upload_id });

  count += await safeDeleteIn({ table, matchmaking_id, column: "rood_inschrijving_id", values: aanmeldingIds });
  count += await safeDeleteIn({ table, matchmaking_id, column: "blauw_inschrijving_id", values: aanmeldingIds });
  count += await safeDeleteIn({ table, matchmaking_id, column: "aanmelding_id", values: aanmeldingIds });
  count += await safeDeleteIn({ table, matchmaking_id, column: "inschrijving_id", values: aanmeldingIds });

  count += await safeDeleteIn({ table, matchmaking_id, column: "va_rood", values: vaNummers });
  count += await safeDeleteIn({ table, matchmaking_id, column: "va_blauw", values: vaNummers });
  count += await safeDeleteIn({ table, matchmaking_id, column: "rood_va", values: vaNummers });
  count += await safeDeleteIn({ table, matchmaking_id, column: "blauw_va", values: vaNummers });
  count += await safeDeleteIn({ table, matchmaking_id, column: "va_nummer", values: vaNummers });

  addDeleted(deleted, table, count);
}

async function deleteAanmeldingenForUpload(params: {
  deleted: DeleteReport;
  matchmaking_id: string;
  upload_id: string;
  aanmeldingIds: string[];
  vaNummers: string[];
}) {
  const { deleted, matchmaking_id, upload_id, aanmeldingIds, vaNummers } = params;
  const table = "aanmeldingen";
  let count = 0;

  count += await safeDeleteEq({ table, matchmaking_id, column: "upload_batch_id", value: upload_id });
  count += await safeDeleteEq({ table, matchmaking_id, column: "upload_id", value: upload_id });

  // Fallback als upload-kolommen in oude data ontbreken.
  count += await safeDeleteIn({ table, matchmaking_id, column: "id", values: aanmeldingIds });
  count += await safeDeleteIn({ table, matchmaking_id, column: "va_nummer", values: vaNummers });

  addDeleted(deleted, table, count);
}

async function deleteUploadRow(params: {
  deleted: DeleteReport;
  matchmaking_id: string;
  upload_id: string;
}) {
  const { deleted, matchmaking_id, upload_id } = params;

  const { count, error } = await supabaseAdmin
    .from("matchmaker_uploads")
    .delete({ count: "exact" })
    .eq("id", upload_id)
    .eq("matchmaking_id", matchmaking_id);

  if (error) {
    if (isMissingSchemaError(error)) {
      console.warn("[delete-aanmeldingupload] matchmaker_uploads overgeslagen:", error.message);
      addDeleted(deleted, "matchmaker_uploads", 0);
      return;
    }

    throw new Error(`matchmaker_uploads: ${error.message}`);
  }

  addDeleted(deleted, "matchmaker_uploads", count ?? 0);
}

export async function DELETE(req: Request) {
  try {
    const user = await getUser(req);
    const body = await req.json().catch(() => ({}));

    const matchmaking_id = s(body.matchmaking_id ?? body.matchmakingId);
    const upload_id = s(body.upload_id ?? body.uploadId ?? body.upload_batch_id ?? body.uploadBatchId);

    if (!matchmaking_id) {
      return NextResponse.json(
        { ok: false, error: "matchmaking_id ontbreekt." },
        { status: 400 }
      );
    }

    if (!upload_id) {
      return NextResponse.json(
        { ok: false, error: "upload_id ontbreekt." },
        { status: 400 }
      );
    }

    await requireMatchmakerAccess(matchmaking_id, user.id);

    // Eerst lezen vóórdat we aanmeldingen verwijderen.
    // Deze IDs/VA's zijn nodig om oude matchmaker_fighter_context en resultaten op te ruimen,
    // want die tabellen hebben niet altijd upload_batch_id.
    const uploadAanmeldingen = await safeSelectUploadAanmeldingen(matchmaking_id, upload_id);

    const aanmeldingIds = uniq(uploadAanmeldingen.map((row) => s(row?.id)));
    const vaNummers = uniq(
      uploadAanmeldingen.map(
        (row) =>
          onlyDigits(row?.va_nummer) ??
          onlyDigits(row?.va) ??
          onlyDigits(row?.va_nr) ??
          onlyDigits(row?.vanummer) ??
          onlyDigits(row?.fightpaspoort_nummer)
      )
    );
    const fighterIds = uniq(
      uploadAanmeldingen.map((row) => uuidOrNull(row?.fighter_id))
    );

    const deleted: DeleteReport = {};

    await deleteDerivedFighterData({
      deleted,
      matchmaking_id,
      upload_id,
      vaNummers,
      fighterIds,
      aanmeldingIds,
    });

    await deleteMatchmakingBoutsForUpload({
      deleted,
      matchmaking_id,
      upload_id,
      vaNummers,
      aanmeldingIds,
    });

    await deleteAanmeldingenForUpload({
      deleted,
      matchmaking_id,
      upload_id,
      aanmeldingIds,
      vaNummers,
    });

    await deleteUploadRow({ deleted, matchmaking_id, upload_id });

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      upload_id,
      deleted,
      cleanup_scope: {
        aanmelding_ids: aanmeldingIds.length,
        va_nummers: vaNummers.length,
        fighter_ids: fighterIds.length,
      },
    });
  } catch (err: any) {
    console.error("delete-aanmeldingupload error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Upload verwijderen mislukt.",
      },
      { status: 500 }
    );
  }
}
