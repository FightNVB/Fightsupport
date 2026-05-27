import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseExcelToFighters } from "./parse_aanmeldingen";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export const runtime = "nodejs";

const BLOCKED_EDIT_STAGES = new Set([
  "definitieve_lineup",
  "klaar_voor_uitslagen",
  "uitslagen_in_bewerking",
  "uitslagen_definitief",
  "terug_bij_admin",
  "gearchiveerd",
]);

const EARLY_EDIT_STAGES = new Set([
  "concept_matchmaking",
  "retour_naar_matchmaker",
]);

function ct(req: Request) {
  return (req.headers.get("content-type") ?? "").toLowerCase();
}

function isForm(req: Request) {
  const c = ct(req);
  return (
    c.includes("multipart/form-data") ||
    c.includes("application/x-www-form-urlencoded")
  );
}

function s(v: unknown) {
  return String(v ?? "").trim();
}

function norm(v: unknown) {
  return s(v).toLowerCase().replace(/\s+/g, " ");
}

function isExcelFilename(name: string) {
  const n = String(name ?? "").toLowerCase().trim();
  return n.endsWith(".xlsx") || n.endsWith(".xls");
}

function safeFileName(name: string) {
  const cleaned = String(name ?? "")
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, "_")
    .trim();

  return cleaned || "aanmeldingen.xlsx";
}

function textOrNull(v: unknown) {
  const x = s(v);
  return x || null;
}

function fullNameOrNull(row: {
  naam?: unknown;
  voornaam?: unknown;
  achternaam?: unknown;
}) {
  const direct = textOrNull(row.naam);
  if (direct) return direct;

  const combined = [textOrNull(row.voornaam), textOrNull(row.achternaam)]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return combined || null;
}

function asUuidOrNull(v: unknown) {
  const x = s(v);
  if (!x) return null;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    x,
  )
    ? x
    : null;
}

function missingColumnName(error: any): string | null {
  const msg = String(error?.message ?? error ?? "");
  const m = msg.match(/Could not find the ['"]([^'"]+)['"] column/i);
  return m?.[1] ?? null;
}

async function insertSafe(table: string, rows: Record<string, any>[]) {
  let body = rows.map((row) => ({ ...row }));

  for (let attempt = 0; attempt < 30; attempt++) {
    if (!body.length) {
      return {
        data: [] as any[],
        error: null as any,
        usedRows: body,
      };
    }

    const { data, error } = await supabaseAdmin
      .from(table)
      .insert(body)
      .select("*");

    if (!error) {
      return {
        data: data ?? [],
        error: null as any,
        usedRows: body,
      };
    }

    const col = missingColumnName(error);

    if (
      col &&
      body.some((row) => Object.prototype.hasOwnProperty.call(row, col))
    ) {
      body = body.map((row) => {
        const next = { ...row };
        delete next[col];
        return next;
      });
      continue;
    }

    return {
      data: null as any,
      error,
      usedRows: body,
    };
  }

  return {
    data: null as any,
    error: new Error(`Kon niet invoegen in ${table} met beschikbare kolommen.`),
    usedRows: body,
  };
}

async function insertAanmeldingenSafe(rows: Record<string, any>[]) {
  return insertSafe("aanmeldingen", rows);
}

async function insertMatchmakerUploadSafe(row: Record<string, any>) {
  return insertSafe("matchmaker_uploads", [row]);
}

function normalizeNullableNumber(v: unknown) {
  if (v == null || v === "") return null;

  const n =
    typeof v === "number"
      ? v
      : Number(
          String(v)
            .replace(",", ".")
            .replace(/[^\d.-]/g, ""),
        );

  return Number.isFinite(n) ? n : null;
}

function onlyDigits(v: unknown) {
  return String(v ?? "").replace(/\D+/g, "").replace(/^0+/, "").trim();
}

function normName(v: unknown) {
  return norm(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normDate(v: unknown) {
  const x = s(v);
  if (!x) return "";

  const iso = x.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }

  const nl = x.match(/^(\d{1,2})[\-/ .](\d{1,2})[\-/ .](\d{4})$/);
  if (nl) {
    return `${nl[3]}-${nl[2].padStart(2, "0")}-${nl[1].padStart(2, "0")}`;
  }

  return norm(x);
}

function buildDuplicateKeys(row: {
  naam?: string | null;
  voornaam?: string | null;
  achternaam?: string | null;
  va_nummer?: string | null;
  geboortedatum?: string | null;
  gym?: string | null;
  gewicht?: number | null;
}) {
  const keys: string[] = [];

  const directName = normName(row.naam);
  const combinedName = [normName(row.voornaam), normName(row.achternaam)]
    .filter(Boolean)
    .join(" ")
    .trim();
  const naam = directName || combinedName;

  // Belangrijk voor dubbele Matchmaking Nederland uploads:
  // NIET alleen op VA-nummer dedupen, want een verkeerd VA-nummer mag niet
  // per ongeluk een andere vechter overslaan. Alleen dezelfde naam + hetzelfde
  // genormaliseerde VA-nummer wordt als dezelfde aanmelding gezien.
  const va = onlyDigits(row.va_nummer);
  if (naam && va) keys.push(`name-va:${naam}|${va}`);

  const dob = normDate(row.geboortedatum);
  const gym = normName(row.gym);

  // Fallback voor templates/rijen zonder VA-nummer. Gewicht telt bewust niet mee:
  // gewicht kan per upload wisselen en mag geen dubbele rij veroorzaken.
  if (!va && naam && dob) keys.push(`name-dob:${naam}|${dob}`);
  if (!va && naam && dob && gym) keys.push(`name-dob-gym:${naam}|${dob}|${gym}`);

  // Laatste fallback voor rijen zonder VA en zonder geboortedatum.
  // Bewust niet alleen op naam, om onterechte matches te voorkomen.
  if (!va && !dob && naam && gym) keys.push(`name-gym:${naam}|${gym}`);

  return Array.from(new Set(keys));
}

function hasDuplicateKey(row: Parameters<typeof buildDuplicateKeys>[0], keys: Set<string>) {
  return buildDuplicateKeys(row).some((key) => keys.has(key));
}

function addDuplicateKeys(row: Parameters<typeof buildDuplicateKeys>[0], keys: Set<string>) {
  for (const key of buildDuplicateKeys(row)) keys.add(key);
}

async function getUserFromBearer(req: Request) {
  const auth =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";

  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) {
    return {
      user: null as any,
      token: "",
      error: "Geen bearer token ontvangen.",
    };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error) {
    return {
      user: null as any,
      token: "",
      error: error.message,
    };
  }

  return {
    user,
    token,
    error: null as string | null,
  };
}

async function assertOwner(matchmaking_id: string, user_id: string) {
  const mmId = s(matchmaking_id);
  const userId = s(user_id);

  if (!mmId) throw new Error("matchmaking_id ontbreekt.");
  if (!userId) throw new Error("user_id ontbreekt.");

  const { data: mmRow, error: mmErr } = await supabaseAdmin
    .from("matchmakings")
    .select(
      "id, matchmaker_id, maker_user_id, uploaded_by, huidige_eigenaar_user_id",
    )
    .eq("id", mmId)
    .maybeSingle();

  if (mmErr) throw new Error(mmErr.message);

  if (mmRow) {
    const allowed = [
      s(mmRow.matchmaker_id),
      s(mmRow.uploaded_by),
      s((mmRow as any).maker_user_id),
      s((mmRow as any).huidige_eigenaar_user_id),
    ].filter(Boolean);

    if (allowed.includes(userId)) return true;
  }

  throw new Error("Geen rechten voor deze matchmaking.");
}

async function getEditableMatchmaking(matchmaking_id: string) {
  const mmId = s(matchmaking_id);
  if (!mmId) throw new Error("matchmaking_id ontbreekt.");

  const { data, error } = await supabaseAdmin
    .from("matchmakings")
    .select(
      "id, stadium, status, locked_for_editing, bondteam, matchmaker_id, maker_user_id",
    )
    .eq("id", mmId)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Matchmaking niet gevonden.");

  const stage = s((data as any).stadium) || s((data as any).status) || "";
  const locked = Boolean((data as any).locked_for_editing);

  if (locked || BLOCKED_EDIT_STAGES.has(stage)) {
    throw new Error(
      "Deze matchmaking is vergrendeld. Aanmeldingen wijzigen is in deze fase niet meer toegestaan.",
    );
  }

  return {
    row: data as any,
    stage,
    locked,
  };
}

async function touchMatchmaking(
  matchmaking_id: string,
  user_id: string,
  currentStage?: string | null,
) {
  const mmId = s(matchmaking_id);
  const userId = asUuidOrNull(user_id);

  if (!mmId || !userId) return;

  const now = new Date().toISOString();

  const patch: Record<string, any> = {
    last_updated_at: now,
    last_updated_by: userId,
  };

  const stage = s(currentStage);

  if (stage && EARLY_EDIT_STAGES.has(stage)) {
    patch.stadium = "bij_matchmaker_in_bewerking";
    patch.status = "bij_matchmaker_in_bewerking";
    patch.huidige_eigenaar_type = "matchmaker";
    patch.huidige_eigenaar_user_id = userId;
    patch.huidige_eigenaar_bondteam = null;
  }

  const { error } = await supabaseAdmin
    .from("matchmakings")
    .update(patch)
    .eq("id", mmId);

  if (error) {
    console.warn(
      "[submit-aanmeldingen] touch matchmakings warning:",
      error.message,
    );
  }
}

async function syncUploadedByOnParents(
  matchmaking_id: string,
  uploaded_by: string,
) {
  const mmId = s(matchmaking_id);
  const userId = asUuidOrNull(uploaded_by);

  if (!mmId || !userId) return;

  const { error } = await supabaseAdmin
    .from("matchmakings")
    .update({ uploaded_by: userId })
    .eq("id", mmId)
    .is("uploaded_by", null);

  if (error) {
    console.warn(
      "[submit-aanmeldingen] matchmakings uploaded_by sync warning:",
      error.message,
    );
  }
}

async function bestEffortDeleteEq(table: string, column: string, value: string) {
  try {
    const { error } = await supabaseAdmin.from(table).delete().eq(column, value);

    if (error) {
      console.warn(
        `[submit-aanmeldingen] delete warning ${table}.${column}:`,
        error.message,
      );
    }
  } catch (e: any) {
    console.warn(
      `[submit-aanmeldingen] delete exception ${table}.${column}:`,
      e?.message,
    );
  }
}

async function bestEffortDeleteScoped(params: {
  table: string;
  matchmaking_id: string;
  column: string;
  value: string;
}) {
  const { table, matchmaking_id, column, value } = params;

  try {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("matchmaking_id", matchmaking_id)
      .eq(column, value);

    if (error) {
      console.warn(
        `[submit-aanmeldingen] delete warning ${table}.${column}:`,
        error.message,
      );
    }
  } catch (e: any) {
    console.warn(
      `[submit-aanmeldingen] delete exception ${table}.${column}:`,
      e?.message,
    );
  }
}

async function deleteUploadArtifacts(uploadBatchId: string, matchmakingId: string) {
  const uploadId = s(uploadBatchId);
  const mmId = s(matchmakingId);

  if (!uploadId || !mmId) return;

  await bestEffortDeleteScoped({
    table: "matchmaker_fighter_context",
    matchmaking_id: mmId,
    column: "upload_batch_id",
    value: uploadId,
  });

  await bestEffortDeleteScoped({
    table: "matchmaker_fighter_context",
    matchmaking_id: mmId,
    column: "upload_id",
    value: uploadId,
  });

  await bestEffortDeleteScoped({
    table: "matchmaker_fighters_raw",
    matchmaking_id: mmId,
    column: "upload_batch_id",
    value: uploadId,
  });

  await bestEffortDeleteScoped({
    table: "matchmaker_fighters_raw",
    matchmaking_id: mmId,
    column: "upload_id",
    value: uploadId,
  });

  await bestEffortDeleteScoped({
    table: "fighters_raw",
    matchmaking_id: mmId,
    column: "upload_batch_id",
    value: uploadId,
  });

  await bestEffortDeleteScoped({
    table: "fighters_raw",
    matchmaking_id: mmId,
    column: "upload_id",
    value: uploadId,
  });

  await bestEffortDeleteScoped({
    table: "matchmaker_uitslagen_raw",
    matchmaking_id: mmId,
    column: "upload_batch_id",
    value: uploadId,
  });

  await bestEffortDeleteScoped({
    table: "matchmaker_uitslagen_raw",
    matchmaking_id: mmId,
    column: "upload_id",
    value: uploadId,
  });

  try {
    const { data: rows } = await supabaseAdmin
      .from("aanmeldingen")
      .select("id")
      .eq("matchmaking_id", mmId)
      .eq("upload_batch_id", uploadId);

    const insIds = (rows ?? [])
      .map((r: any) => Number(r.id))
      .filter((n) => Number.isFinite(n));

    if (insIds.length > 0) {
      const { error: fcErr } = await supabaseAdmin
        .from("matchmaker_fighter_context")
        .delete()
        .eq("matchmaking_id", mmId)
        .in("inschrijving_id", insIds);

      if (fcErr) {
        console.warn(
          "[submit-aanmeldingen] delete fighter_context warning:",
          fcErr.message,
        );
      }

      const { error: boutErr1 } = await supabaseAdmin
        .from("matchmaking_bouts_raw")
        .delete()
        .eq("matchmaking_id", mmId)
        .in("rood_inschrijving_id", insIds);

      if (boutErr1) {
        console.warn(
          "[submit-aanmeldingen] delete bouts rood warning:",
          boutErr1.message,
        );
      }

      const { error: boutErr2 } = await supabaseAdmin
        .from("matchmaking_bouts_raw")
        .delete()
        .eq("matchmaking_id", mmId)
        .in("blauw_inschrijving_id", insIds);

      if (boutErr2) {
        console.warn(
          "[submit-aanmeldingen] delete bouts blauw warning:",
          boutErr2.message,
        );
      }
    }
  } catch (e: any) {
    console.warn(
      "[submit-aanmeldingen] deleteUploadArtifacts lookup warning:",
      e?.message,
    );
  }
}

export async function POST(req: Request) {
  const uploadId = crypto.randomUUID();
  let uploadedStoragePath = "";
  let matchmakerUploadInserted = false;
  let cleanupMatchmakingId = "";

  try {
    if (!isForm(req)) {
      return NextResponse.json(
        { error: "Gebruik multipart/form-data" },
        { status: 415 },
      );
    }

    const fd = await req.formData();

    const bearerUser = await getUserFromBearer(req);

    if (bearerUser.error || !bearerUser.user) {
      return NextResponse.json(
        { error: bearerUser.error ?? "Niet ingelogd." },
        { status: 401 },
      );
    }

    const uploaded_by_from_body = asUuidOrNull(fd.get("uploaded_by"));
    const uploaded_by =
      asUuidOrNull(bearerUser.user.id) ?? uploaded_by_from_body ?? "";

    const matchmaking_id = s(fd.get("matchmaking_id"));
    cleanupMatchmakingId = matchmaking_id;
    const file = fd.get("file");

    if (!uploaded_by) {
      return NextResponse.json(
        { error: "uploaded_by ontbreekt" },
        { status: 400 },
      );
    }

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt" },
        { status: 400 },
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Excel bestand ontbreekt" },
        { status: 400 },
      );
    }

    if (!isExcelFilename(file.name || "")) {
      return NextResponse.json(
        { error: "Alleen .xlsx of .xls bestanden zijn toegestaan." },
        { status: 400 },
      );
    }

    await assertOwner(matchmaking_id, uploaded_by);

    const mm = await getEditableMatchmaking(matchmaking_id);

    await syncUploadedByOnParents(matchmaking_id, uploaded_by);

    const raw_filename = safeFileName(file.name || "aanmeldingen.xlsx");
    const requestedSourceType = s(fd.get("source_type"));
    const uploadSourceType = requestedSourceType || "excel_upload";
    const filePath = `aanmeldingen/${matchmaking_id}/${Date.now()}_${raw_filename}`;
    uploadedStoragePath = filePath;

    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);

    const { error: upErr } = await supabaseAdmin.storage
      .from("uploads")
      .upload(filePath, buf, {
        contentType:
          (file as any).type ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    if (upErr) {
      uploadedStoragePath = "";
      console.warn(
        "[submit-aanmeldingen] storage upload warning:",
        upErr.message,
      );
    }

    const { error: uploadInsertErr } = await insertMatchmakerUploadSafe({
      id: uploadId,
      upload_batch_id: uploadId,
      matchmaking_id,
      event_id: null,
      raw_filename,
      filename: raw_filename,
      original_filename: raw_filename,
      storage_path: uploadedStoragePath || null,
      source_type: uploadSourceType,
      uploaded_by,
      status: "geupload",
      created_at: new Date().toISOString(),
    });

    if (uploadInsertErr) throw new Error(uploadInsertErr.message);

    matchmakerUploadInserted = true;

    const fighters = await parseExcelToFighters(buf, {
      upload_batch_id: uploadId,
      upload_id: uploadId,
      upload_filename: raw_filename,
      storage_path: uploadedStoragePath || null,
    } as any);

    if (!fighters.length) {
      return NextResponse.json(
        {
          error: "Geen vechters gevonden in dit bestand.",
          matchmaking_id,
          upload_id: uploadId,
        },
        { status: 400 },
      );
    }

    const rows: any[] = fighters.map((f: any) => {
      const naam = fullNameOrNull({
        naam: f.naam,
        voornaam: f.voornaam,
        achternaam: f.achternaam,
      });

      return {
        matchmaking_id,
        event_id: null,
        upload_batch_id: uploadId,
        raw_filename,
        source_type: uploadSourceType,
        uploaded_by,
        bondteam: null,

        row_nr: normalizeNullableNumber(f.row_nr),

        discipline: textOrNull(f.discipline),
        klasse: textOrNull(f.klasse),
        geslacht: textOrNull(f.geslacht),

        naam,
        voornaam: textOrNull(f.voornaam),
        achternaam: textOrNull(f.achternaam),
        email: textOrNull(f.email),
        telefoon: textOrNull(f.telefoon),

        gym: textOrNull(f.gym),
        va_nummer: textOrNull(f.va_nummer),

        geboortedatum: textOrNull(f.geboortedatum),
        gewicht: normalizeNullableNumber(f.gewicht),

        win: normalizeNullableNumber(f.win),
        loss: normalizeNullableNumber(f.loss),
        draw: normalizeNullableNumber(f.draw),
        demo: normalizeNullableNumber(f.demo),

        opmerkingen: textOrNull(f.opmerkingen),
        status: "rauw",
        duplicate_key: null,

        raw: {
          ...(typeof f.raw === "object" && f.raw ? f.raw : {}),
          parser_source: "parseExcelToFighters",
          template_supported: true,
          source_type: uploadSourceType,
          upload_batch_id: uploadId,
          upload_id: uploadId,
          upload_filename: raw_filename,
          storage_path: uploadedStoragePath || null,
          parsed_naam: naam,
        },
      };
    });

    const validRows = rows.filter((row) => {
      return Boolean(
        s(row.naam) ||
          s(row.voornaam) ||
          s(row.achternaam) ||
          s(row.va_nummer) ||
          s(row.gym) ||
          s(row.geboortedatum),
      );
    });

    if (!validRows.length) {
      return NextResponse.json(
        {
          error: "Na parseren zijn geen geldige vechters overgebleven.",
          matchmaking_id,
          upload_id: uploadId,
        },
        { status: 400 },
      );
    }

    const { data: existingRows, error: existingErr } = await supabaseAdmin
      .from("aanmeldingen")
      .select(
        "id, naam, voornaam, achternaam, va_nummer, geboortedatum, gym, gewicht",
      )
      .eq("matchmaking_id", matchmaking_id);

    if (existingErr) throw new Error(existingErr.message);

    const existingKeys = new Set<string>();

    for (const row of existingRows ?? []) {
      addDuplicateKeys(
        {
          naam: row.naam,
          voornaam: row.voornaam,
          achternaam: row.achternaam,
          va_nummer: row.va_nummer,
          geboortedatum: row.geboortedatum,
          gym: row.gym,
          gewicht: row.gewicht,
        },
        existingKeys,
      );
    }

    const uploadKeys = new Set<string>();
    const dedupedRows: typeof validRows = [];
    let duplicatesExisting = 0;
    let duplicatesInFile = 0;

    for (const row of validRows) {
      if (hasDuplicateKey(row, existingKeys)) {
        duplicatesExisting++;
        continue;
      }

      if (hasDuplicateKey(row, uploadKeys)) {
        duplicatesInFile++;
        continue;
      }

      addDuplicateKeys(row, uploadKeys);
      dedupedRows.push({
        ...row,
        duplicate_key: buildDuplicateKeys(row)[0] ?? "",
      });
    }

    if (dedupedRows.length > 0) {
      const { error: insErr } = await insertAanmeldingenSafe(dedupedRows);
      if (insErr) throw new Error(insErr.message);
    }

    const { error: uploadUpdateErr } = await supabaseAdmin
      .from("matchmaker_uploads")
      .update({
        status: "verwerkt",
        row_count: validRows.length,
        inserted_count: dedupedRows.length,
        duplicate_count: duplicatesExisting + duplicatesInFile,
      })
      .eq("id", uploadId);

    if (uploadUpdateErr) {
      console.warn(
        "[submit-aanmeldingen] matchmaker_uploads update warning:",
        uploadUpdateErr.message,
      );
    }

    await touchMatchmaking(matchmaking_id, uploaded_by, mm.stage);

    return NextResponse.json({
      ok: true,
      matchmaking_id,
      upload_id: uploadId,
      upload_batch_id: uploadId,
      inserted: dedupedRows.length,
      duplicates: duplicatesExisting + duplicatesInFile,
      duplicates_existing: duplicatesExisting,
      duplicates_in_file: duplicatesInFile,
      uploaded_by,
      source_type: uploadSourceType,
      skipped_existing: duplicatesExisting,
      skipped_in_file: duplicatesInFile,
      scraper_started: false,
      scraper_error: null,
      scraper_response: null,
      message:
        dedupedRows.length > 0
          ? `Upload gelukt. ${dedupedRows.length} nieuwe aanmelding(en) toegevoegd. ${duplicatesExisting + duplicatesInFile} dubbele aanmelding(en) overgeslagen.`
          : `Upload gelukt, maar er zijn geen nieuwe aanmeldingen toegevoegd. ${duplicatesExisting + duplicatesInFile} dubbele aanmelding(en) overgeslagen.`,
    });
  } catch (err: any) {
    console.error("[matchmaker/submit-aanmeldingen] error", err);

    if (uploadId) {
      await bestEffortDeleteScoped({
        table: "aanmeldingen",
        matchmaking_id: cleanupMatchmakingId,
        column: "upload_batch_id",
        value: uploadId,
      });

      if (matchmakerUploadInserted) {
        await bestEffortDeleteEq("matchmaker_uploads", "id", uploadId);
      }
    }

    if (uploadedStoragePath) {
      await supabaseAdmin.storage.from("uploads").remove([uploadedStoragePath]);
    }

    return NextResponse.json(
      { error: err?.message ?? "Onbekende fout" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const bearerUser = await getUserFromBearer(req);

    if (bearerUser.error || !bearerUser.user) {
      return NextResponse.json(
        { error: bearerUser.error ?? "Niet ingelogd." },
        { status: 401 },
      );
    }

    const user_id = s(bearerUser.user.id);

    let body: any = null;

    try {
      body = await req.json();
    } catch {
      const url = new URL(req.url);
      body = {
        action: url.searchParams.get("upload_id")
          ? "delete_upload"
          : url.searchParams.get("action"),
        upload_id: url.searchParams.get("upload_id"),
        matchmaking_id: url.searchParams.get("matchmaking_id"),
      };
    }

    const action = s(body?.action);

    if (!action) {
      return NextResponse.json({ error: "action ontbreekt" }, { status: 400 });
    }

    if (action === "delete_upload") {
      const upload_id = s(body?.upload_id);
      const matchmaking_id = s(body?.matchmaking_id);

      if (!upload_id || !matchmaking_id) {
        return NextResponse.json(
          { error: "upload_id en matchmaking_id zijn verplicht" },
          { status: 400 },
        );
      }

      await assertOwner(matchmaking_id, user_id);
      await getEditableMatchmaking(matchmaking_id);

      const { data: uploadRow } = await supabaseAdmin
        .from("matchmaker_uploads")
        .select("id, storage_path")
        .eq("id", upload_id)
        .eq("matchmaking_id", matchmaking_id)
        .maybeSingle();

      await deleteUploadArtifacts(upload_id, matchmaking_id);

      const { error: delAanmeldingenErr } = await supabaseAdmin
        .from("aanmeldingen")
        .delete()
        .eq("matchmaking_id", matchmaking_id)
        .eq("upload_batch_id", upload_id);

      if (delAanmeldingenErr) throw new Error(delAanmeldingenErr.message);

      const { error: delUploadErr } = await supabaseAdmin
        .from("matchmaker_uploads")
        .delete()
        .eq("id", upload_id)
        .eq("matchmaking_id", matchmaking_id);

      if (delUploadErr) throw new Error(delUploadErr.message);

      if ((uploadRow as any)?.storage_path) {
        const { error: rmErr } = await supabaseAdmin.storage
          .from("uploads")
          .remove([(uploadRow as any).storage_path]);

        if (rmErr) {
          console.warn("storage remove warning:", rmErr.message);
        }
      }

      await touchMatchmaking(matchmaking_id, user_id);

      return NextResponse.json({
        ok: true,
        upload_id,
        upload_batch_id: upload_id,
      });
    }

    if (action === "delete_matchmaking") {
      const matchmaking_id = s(body?.matchmaking_id);

      if (!matchmaking_id) {
        return NextResponse.json(
          { error: "matchmaking_id is verplicht" },
          { status: 400 },
        );
      }

      await assertOwner(matchmaking_id, user_id);
      await getEditableMatchmaking(matchmaking_id);

      const { data: storedRows } = await supabaseAdmin
        .from("aanmeldingen")
        .select("raw")
        .eq("matchmaking_id", matchmaking_id);

      const { data: storedUploads } = await supabaseAdmin
        .from("matchmaker_uploads")
        .select("storage_path")
        .eq("matchmaking_id", matchmaking_id);

      await bestEffortDeleteEq(
        "matchmaker_fighter_context",
        "matchmaking_id",
        matchmaking_id,
      );
      await bestEffortDeleteEq("fighters_raw", "matchmaking_id", matchmaking_id);
      await bestEffortDeleteEq(
        "matchmaker_fighters_raw",
        "matchmaking_id",
        matchmaking_id,
      );
      await bestEffortDeleteEq(
        "matchmaker_uitslagen_raw",
        "matchmaking_id",
        matchmaking_id,
      );
      await bestEffortDeleteEq(
        "matchmaking_bouts_raw",
        "matchmaking_id",
        matchmaking_id,
      );
      await bestEffortDeleteEq(
        "controle_resultaten",
        "matchmaking_id",
        matchmaking_id,
      );
      await bestEffortDeleteEq(
        "dispensatie_hits",
        "matchmaking_id",
        matchmaking_id,
      );
      await bestEffortDeleteEq(
        "dispensatie_requests",
        "matchmaking_id",
        matchmaking_id,
      );

      const { error: dUploads } = await supabaseAdmin
        .from("matchmaker_uploads")
        .delete()
        .eq("matchmaking_id", matchmaking_id);

      if (dUploads) throw new Error(dUploads.message);

      const { error: d1 } = await supabaseAdmin
        .from("aanmeldingen")
        .delete()
        .eq("matchmaking_id", matchmaking_id);

      if (d1) throw new Error(d1.message);

      const { error: d3 } = await supabaseAdmin
        .from("matchmakings")
        .delete()
        .eq("id", matchmaking_id);

      if (d3) throw new Error(d3.message);

      const pathsFromRows = (storedRows ?? [])
        .map((r: any) => r?.raw?.storage_path)
        .filter(Boolean);

      const pathsFromUploads = (storedUploads ?? [])
        .map((r: any) => r?.storage_path)
        .filter(Boolean);

      const paths = Array.from(new Set([...pathsFromRows, ...pathsFromUploads]));

      if (paths.length) {
        const { error: rmErr } = await supabaseAdmin.storage
          .from("uploads")
          .remove(paths);

        if (rmErr) {
          console.warn("storage remove warning:", rmErr.message);
        }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: `Onbekende action: ${action}` },
      { status: 400 },
    );
  } catch (err: any) {
    console.error("[matchmaker/submit-aanmeldingen][DELETE] error", err);

    return NextResponse.json(
      { error: err?.message ?? "Onbekende fout" },
      { status: 500 },
    );
  }
}
