import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function norm(v: unknown) {
  return String(v ?? "").trim();
}

function asPositiveInt(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

type ReorderItem = {
  ctx_row_id: string;
  old_partij_nr: number | null;
  partij_nr: number;
  swap_hoeken: boolean;
  rood_va: string | null;
  blauw_va: string | null;
};

type ResolvedReorderItem = ReorderItem & {
  original_partij_nr: number | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getUserFromBearer(req: NextRequest) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) return { user: null, error: "Geen bearer token ontvangen." };

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const { data, error } = await supabaseUser.auth.getUser();
  if (error || !data?.user) {
    return { user: null, error: error?.message ?? "Niet ingelogd." };
  }

  return { user: data.user, error: null };
}

async function getRolesForUser(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  if (error) throw error;

  const roles =
    (data ?? [])
      .map((r: any) => String(r?.roles?.name ?? "").trim().toLowerCase())
      .filter(Boolean) ?? [];

  return Array.from(new Set(roles));
}

async function canAccessMatchmaking(matchmakingId: string, userId: string, roles: string[]) {
  if (
    roles.includes("superadmin") ||
    roles.includes("admin") ||
    roles.includes("hoofdofficial") ||
    roles.includes("matchmaker")
  ) {
    return true;
  }

  const { data: uploadRow, error: uploadErr } = await supabaseAdmin
    .from("matchmaking_uploads")
    .select("uploaded_by")
    .eq("matchmaking_id", matchmakingId)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (uploadErr) throw uploadErr;

  if (uploadRow?.uploaded_by && String(uploadRow.uploaded_by) === userId) return true;

  const { data: mmRow, error: mmErr } = await supabaseAdmin
    .from("matchmaker_matchmakings")
    .select("created_by, user_id, owner_user_id, uploaded_by")
    .eq("id", matchmakingId)
    .maybeSingle();

  if (mmErr) throw mmErr;

  const ownerCandidates = [
    mmRow?.created_by,
    mmRow?.user_id,
    mmRow?.owner_user_id,
    mmRow?.uploaded_by,
  ]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);

  if (ownerCandidates.includes(userId)) return true;

  return false;
}

async function getLatestControleRunId(matchmakingId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("controle_bout_context")
    .select("controle_run_id, created_at")
    .eq("matchmaking_id", matchmakingId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  const runId = norm(data?.[0]?.controle_run_id);
  return runId || null;
}

async function ensureOriginalPartijNrControleContext(
  matchmakingId: string,
  controleRunId: string
) {
  const { data, error } = await supabaseAdmin
    .from("controle_bout_context")
    .select("id, partij_nr, original_partij_nr")
    .eq("matchmaking_id", matchmakingId)
    .eq("controle_run_id", controleRunId);

  if (error) throw error;

  for (const row of data ?? []) {
    const id = norm((row as any)?.id);
    const partijNr = asPositiveInt((row as any)?.partij_nr);
    const originalPartijNr = asPositiveInt((row as any)?.original_partij_nr);

    if (!id || partijNr == null || originalPartijNr != null) continue;

    const { error: updErr } = await supabaseAdmin
      .from("controle_bout_context")
      .update({ original_partij_nr: partijNr })
      .eq("id", id)
      .eq("matchmaking_id", matchmakingId)
      .eq("controle_run_id", controleRunId);

    if (updErr) throw updErr;
  }
}

async function ensureOriginalPartijNrRaw(
  matchmakingId: string,
  partijNrs: number[]
) {
  if (!partijNrs.length) return;

  const { data, error } = await supabaseAdmin
    .from("matchmaking_bouts_raw")
    .select("partij_nr, original_partij_nr")
    .eq("matchmaking_id", matchmakingId)
    .in("partij_nr", partijNrs);

  if (error) throw error;

  for (const row of data ?? []) {
    const partijNr = asPositiveInt((row as any)?.partij_nr);
    const originalPartijNr = asPositiveInt((row as any)?.original_partij_nr);

    if (partijNr == null || originalPartijNr != null) continue;

    const { error: updErr } = await supabaseAdmin
      .from("matchmaking_bouts_raw")
      .update({ original_partij_nr: partijNr })
      .eq("matchmaking_id", matchmakingId)
      .eq("partij_nr", partijNr);

    if (updErr) throw updErr;
  }
}


async function repairControleResultatenPartijNrByBoutId(
  matchmakingId: string,
  controleRunId: string
) {
  // Belangrijk na reorder:
  // controle_resultaten.bout_id verwijst naar matchmaking_bouts_raw.bout_uid.
  // Als bout_id gevuld is, is die leidend en mag partij_nr alleen daarvan afgeleid worden.
  // Dit voorkomt dat een melding van partij 11 na reorder op partij 12 blijft hangen.
  const { data: rawRows, error: rawErr } = await supabaseAdmin
    .from("matchmaking_bouts_raw")
    .select("bout_uid, partij_nr")
    .eq("matchmaking_id", matchmakingId)
    .or("verwijderd.is.null,verwijderd.eq.false");

  if (rawErr) throw rawErr;

  const partijNrByBoutUid = new Map<string, number>();

  for (const row of rawRows ?? []) {
    const partijNr = asPositiveInt((row as any)?.partij_nr);
    const boutUid = norm((row as any)?.bout_uid);

    if (partijNr == null || !boutUid) continue;
    partijNrByBoutUid.set(boutUid, partijNr);
  }

  if (partijNrByBoutUid.size === 0) return;

  const { data: controleRows, error: controleErr } = await supabaseAdmin
    .from("controle_resultaten")
    .select("id, bout_id, partij_nr")
    .eq("matchmaking_id", matchmakingId)
    .eq("controle_run_id", controleRunId)
    .not("bout_id", "is", null);

  if (controleErr) throw controleErr;

  for (const row of controleRows ?? []) {
    const id = norm((row as any)?.id);
    const boutId = norm((row as any)?.bout_id);
    const currentPartijNr = asPositiveInt((row as any)?.partij_nr);
    const correctPartijNr = partijNrByBoutUid.get(boutId) ?? null;

    if (!id || correctPartijNr == null || currentPartijNr === correctPartijNr) continue;

    const { error: updErr } = await supabaseAdmin
      .from("controle_resultaten")
      .update({ partij_nr: correctPartijNr })
      .eq("id", id)
      .eq("matchmaking_id", matchmakingId)
      .eq("controle_run_id", controleRunId);

    if (updErr) throw updErr;
  }
}

async function updateControleResultatenZonderBoutIdByOldToNewMap(
  matchmakingId: string,
  controleRunId: string,
  mapping: { old_partij_nr: number; partij_nr: number }[]
) {
  // Alleen regels zonder bout_id mogen op partij_nr worden meeverplaatst.
  // Regels met bout_id worden daarna herleid vanuit matchmaking_bouts_raw.bout_uid.
  if (!mapping.length) return;

  const maxTarget = Math.max(...mapping.map((x) => x.partij_nr), 0);
  const tempBase = maxTarget + 10000;

  for (let i = 0; i < mapping.length; i += 1) {
    const item = mapping[i];

    const { error } = await supabaseAdmin
      .from("controle_resultaten")
      .update({ partij_nr: tempBase + i + 1 })
      .eq("matchmaking_id", matchmakingId)
      .eq("controle_run_id", controleRunId)
      .eq("partij_nr", item.old_partij_nr)
      .is("bout_id", null);

    if (error) throw error;
  }

  for (let i = 0; i < mapping.length; i += 1) {
    const item = mapping[i];

    const { error } = await supabaseAdmin
      .from("controle_resultaten")
      .update({ partij_nr: item.partij_nr })
      .eq("matchmaking_id", matchmakingId)
      .eq("controle_run_id", controleRunId)
      .eq("partij_nr", tempBase + i + 1)
      .is("bout_id", null);

    if (error) throw error;
  }
}

async function updatePartijNrSequenceByIds(
  table: string,
  idField: string,
  idsAndNewNumbers: { id: string; partij_nr: number }[],
  extraWhere?: Record<string, string>
) {
  if (!idsAndNewNumbers.length) return;

  const targetNumbers = idsAndNewNumbers.map((x) => x.partij_nr);
  const tempBase = Math.max(...targetNumbers, 0) + 10000;

  for (let i = 0; i < idsAndNewNumbers.length; i += 1) {
    const item = idsAndNewNumbers[i];

    let q = supabaseAdmin
      .from(table)
      .update({ partij_nr: tempBase + i + 1 })
      .eq(idField, item.id);

    for (const [k, v] of Object.entries(extraWhere ?? {})) {
      q = q.eq(k, v);
    }

    const { error } = await q;
    if (error) throw error;
  }

  for (const item of idsAndNewNumbers) {
    let q = supabaseAdmin
      .from(table)
      .update({ partij_nr: item.partij_nr })
      .eq(idField, item.id);

    for (const [k, v] of Object.entries(extraWhere ?? {})) {
      q = q.eq(k, v);
    }

    const { error } = await q;
    if (error) throw error;
  }
}

async function updatePartijNrByOldToNewMap(
  table: string,
  where: Record<string, string>,
  mapping: { old_partij_nr: number; partij_nr: number }[]
) {
  if (!mapping.length) return;

  const maxTarget = Math.max(...mapping.map((x) => x.partij_nr), 0);
  const tempBase = maxTarget + 10000;

  for (let i = 0; i < mapping.length; i += 1) {
    const item = mapping[i];

    let q = supabaseAdmin
      .from(table)
      .update({ partij_nr: tempBase + i + 1 })
      .eq("partij_nr", item.old_partij_nr);

    for (const [k, v] of Object.entries(where)) {
      q = q.eq(k, v);
    }

    const { error } = await q;
    if (error) throw error;
  }

  for (let i = 0; i < mapping.length; i += 1) {
    const item = mapping[i];

    let q = supabaseAdmin
      .from(table)
      .update({ partij_nr: item.partij_nr })
      .eq("partij_nr", tempBase + i + 1);

    for (const [k, v] of Object.entries(where)) {
      q = q.eq(k, v);
    }

    const { error } = await q;
    if (error) throw error;
  }
}

function hasOwn(row: any, key: string) {
  return row != null && Object.prototype.hasOwnProperty.call(row, key);
}

function pickExisting(row: any, keys: string[]) {
  for (const key of keys) {
    if (hasOwn(row, key)) return row[key];
  }
  return undefined;
}

function setIfExists(patch: Record<string, any>, row: any, key: string, value: any) {
  if (hasOwn(row, key)) patch[key] = value;
}

function shouldSwapHoeken(item: any, row: any): boolean {
  const explicit =
    item?.swap_hoeken === true ||
    item?.swapHoeken === true ||
    item?.hoek_gewisseld === true ||
    item?.hoeken_gewisseld === true ||
    item?.swapped === true ||
    item?.swap === true;

  if (explicit) return true;

  const nextRoodVa = norm(item?.rood_va ?? item?.va_rood ?? item?.roodVa ?? item?.vaRood);
  const nextBlauwVa = norm(item?.blauw_va ?? item?.va_blauw ?? item?.blauwVa ?? item?.vaBlauw);

  if (!nextRoodVa || !nextBlauwVa) return false;

  const currentRoodVa = norm(
    pickExisting(row, ["rood_va_mm", "rood_va", "va_rood"])
  );
  const currentBlauwVa = norm(
    pickExisting(row, ["blauw_va_mm", "blauw_va", "va_blauw"])
  );

  return !!currentRoodVa && !!currentBlauwVa && nextRoodVa === currentBlauwVa && nextBlauwVa === currentRoodVa;
}

function makeSwapPatch(row: any, pairs: [string, string][]) {
  const patch: Record<string, any> = {};

  for (const [roodKey, blauwKey] of pairs) {
    if (!hasOwn(row, roodKey) && !hasOwn(row, blauwKey)) continue;

    const roodValue = hasOwn(row, roodKey) ? row[roodKey] : null;
    const blauwValue = hasOwn(row, blauwKey) ? row[blauwKey] : null;

    setIfExists(patch, row, roodKey, blauwValue);
    setIfExists(patch, row, blauwKey, roodValue);
  }

  return patch;
}

const CONTEXT_HOEK_PAIRS: [string, string][] = [
  ["rood_naam_mm", "blauw_naam_mm"],
  ["rood_naam_fp", "blauw_naam_fp"],
  ["rood_naam", "blauw_naam"],
  ["rood_gym_mm", "blauw_gym_mm"],
  ["rood_gym_fp", "blauw_gym_fp"],
  ["rood_gym", "blauw_gym"],
  ["rood_va_mm", "blauw_va_mm"],
  ["rood_va_fp", "blauw_va_fp"],
  ["rood_va", "blauw_va"],
  ["va_rood", "va_blauw"],
  ["rood_geboortedatum_mm", "blauw_geboortedatum_mm"],
  ["rood_geboortedatum_fp", "blauw_geboortedatum_fp"],
  ["rood_geboortedatum", "blauw_geboortedatum"],
  ["rood_leeftijd_mm", "blauw_leeftijd_mm"],
  ["rood_leeftijd_fp", "blauw_leeftijd_fp"],
  ["rood_leeftijd_event", "blauw_leeftijd_event"],
  ["rood_gewicht_mm", "blauw_gewicht_mm"],
  ["rood_gewicht_fp", "blauw_gewicht_fp"],
  ["rood_doorgegeven_gewicht", "blauw_doorgegeven_gewicht"],
  ["rood_gewogen_gewicht", "blauw_gewogen_gewicht"],
  ["gewicht_strafpunt_rood", "gewicht_strafpunt_blauw"],
];

const RAW_HOEK_PAIRS: [string, string][] = [
  ["rood_naam", "blauw_naam"],
  ["naam_rood", "naam_blauw"],
  ["rood_gym", "blauw_gym"],
  ["gym_rood", "gym_blauw"],
  ["va_rood", "va_blauw"],
  ["rood_va", "blauw_va"],
  ["rood_geboortedatum", "blauw_geboortedatum"],
  ["geboortedatum_rood", "geboortedatum_blauw"],
  ["rood_leeftijd", "blauw_leeftijd"],
  ["leeftijd_rood", "leeftijd_blauw"],
  ["rood_gewicht", "blauw_gewicht"],
  ["gewicht_rood", "gewicht_blauw"],
  ["rood_doorgegeven_gewicht", "blauw_doorgegeven_gewicht"],
  ["rood_gewogen_gewicht", "blauw_gewogen_gewicht"],
  ["gewicht_strafpunt_rood", "gewicht_strafpunt_blauw"],
];

const WEIGH_HOEK_PAIRS: [string, string][] = [
  ["rood_naam", "blauw_naam"],
  ["rood_gym", "blauw_gym"],
  ["rood_va", "blauw_va"],
  ["rood_geboortedatum", "blauw_geboortedatum"],
  ["rood_leeftijd_event", "blauw_leeftijd_event"],
  ["rood_doorgegeven_gewicht", "blauw_doorgegeven_gewicht"],
  ["rood_gewogen_gewicht", "blauw_gewogen_gewicht"],
  ["gewicht_strafpunt_rood", "gewicht_strafpunt_blauw"],
];

async function applyHoekSwapToControleContext(
  matchmakingId: string,
  controleRunId: string,
  resolved: ResolvedReorderItem[],
  ctxById: Map<string, any>
) {
  const swaps = resolved.filter((x) => x.swap_hoeken);
  if (!swaps.length) return 0;

  let updated = 0;

  for (const item of swaps) {
    const row = ctxById.get(item.ctx_row_id);
    if (!row?.id) continue;

    const patch = makeSwapPatch(row, CONTEXT_HOEK_PAIRS);
    if (Object.keys(patch).length === 0) continue;

    const { error } = await supabaseAdmin
      .from("controle_bout_context")
      .update(patch)
      .eq("id", item.ctx_row_id)
      .eq("matchmaking_id", matchmakingId)
      .eq("controle_run_id", controleRunId);

    if (error) throw error;
    updated++;
  }

  return updated;
}

async function applyHoekSwapByPartijNr(
  table: string,
  matchmakingId: string,
  swaps: ResolvedReorderItem[],
  pairs: [string, string][]
) {
  if (!swaps.length) return 0;

  const oldPartijNrs = swaps
    .map((x) => x.old_partij_nr)
    .filter((v): v is number => v != null);

  if (!oldPartijNrs.length) return 0;

  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .in("partij_nr", oldPartijNrs);

  if (error) throw error;

  const rowsByPartij = new Map<number, any>();
  for (const row of data ?? []) {
    const partijNr = asPositiveInt((row as any)?.partij_nr);
    if (partijNr != null) rowsByPartij.set(partijNr, row);
  }

  let updated = 0;

  for (const item of swaps) {
    if (item.old_partij_nr == null) continue;
    const row = rowsByPartij.get(item.old_partij_nr);
    if (!row) continue;

    const patch = makeSwapPatch(row, pairs);
    if (Object.keys(patch).length === 0) continue;

    let q = supabaseAdmin
      .from(table)
      .update(patch)
      .eq("matchmaking_id", matchmakingId)
      .eq("partij_nr", item.old_partij_nr);

    if (hasOwn(row, "id") && row.id) q = q.eq("id", row.id);

    const { error: updErr } = await q;
    if (updErr) throw updErr;
    updated++;
  }

  return updated;
}

async function swapControleResultatenHoek(
  matchmakingId: string,
  controleRunId: string,
  swaps: ResolvedReorderItem[]
) {
  if (!swaps.length) return 0;

  let updated = 0;

  for (const item of swaps) {
    if (item.old_partij_nr == null) continue;
    const tempHoek = `__swap_${Date.now()}_${item.old_partij_nr}`;

    const { error: tempErr } = await supabaseAdmin
      .from("controle_resultaten")
      .update({ hoek: tempHoek })
      .eq("matchmaking_id", matchmakingId)
      .eq("controle_run_id", controleRunId)
      .eq("partij_nr", item.old_partij_nr)
      .eq("hoek", "rood");
    if (tempErr) throw tempErr;

    const { error: roodErr } = await supabaseAdmin
      .from("controle_resultaten")
      .update({ hoek: "rood" })
      .eq("matchmaking_id", matchmakingId)
      .eq("controle_run_id", controleRunId)
      .eq("partij_nr", item.old_partij_nr)
      .eq("hoek", "blauw");
    if (roodErr) throw roodErr;

    const { error: blauwErr } = await supabaseAdmin
      .from("controle_resultaten")
      .update({ hoek: "blauw" })
      .eq("matchmaking_id", matchmakingId)
      .eq("controle_run_id", controleRunId)
      .eq("partij_nr", item.old_partij_nr)
      .eq("hoek", tempHoek);
    if (blauwErr) throw blauwErr;

    updated++;
  }

  return updated;
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: userError } = await getUserFromBearer(req);
    if (!user) return jsonError(userError ?? "Niet ingelogd.", 401);

    const body = await req.json().catch(() => null);
    const matchmakingId = norm(body?.matchmaking_id);
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    if (!matchmakingId) {
      return jsonError("matchmaking_id ontbreekt.");
    }

    if (rawItems.length === 0) {
      return jsonError("items ontbreekt of is leeg.");
    }

    const roles = await getRolesForUser(user.id);
    const allowed = await canAccessMatchmaking(matchmakingId, user.id, roles);

    if (!allowed) {
      return jsonError("Je hebt geen toegang tot deze matchmaking.", 403);
    }

    const latestControleRunId = await getLatestControleRunId(matchmakingId);
    if (!latestControleRunId) {
      return jsonError(
        "Geen controle_bout_context gevonden voor deze matchmaking. Draai eerst een controle-run zodat lineup op controle-context kan leunen."
      );
    }

    const items: ReorderItem[] = rawItems
      .map((x: any) => ({
        ctx_row_id: norm(x?.ctx_row_id),
        old_partij_nr: asPositiveInt(x?.old_partij_nr),
        partij_nr: asPositiveInt(x?.partij_nr),
        swap_hoeken:
          x?.swap_hoeken === true ||
          x?.swapHoeken === true ||
          x?.hoek_gewisseld === true ||
          x?.hoeken_gewisseld === true ||
          x?.swapped === true ||
          x?.swap === true,
        rood_va: norm(x?.rood_va ?? x?.va_rood ?? x?.roodVa ?? x?.vaRood) || null,
        blauw_va: norm(x?.blauw_va ?? x?.va_blauw ?? x?.blauwVa ?? x?.vaBlauw) || null,
      }))
      .filter((x: any): x is ReorderItem => x.partij_nr != null && (x.ctx_row_id || x.old_partij_nr != null));

    if (items.length !== rawItems.length) {
      return jsonError(
        "Niet alle items bevatten een geldige ctx_row_id of old_partij_nr en partij_nr."
      );
    }

    const uniquePartijNrs = new Set<number>(items.map((x: ReorderItem) => x.partij_nr));
    if (uniquePartijNrs.size !== items.length) {
      return jsonError("Er zitten dubbele partij_nr waarden in items.");
    }

    const expected = Array.from({ length: items.length }, (_, i) => i + 1);
    const got = [...uniquePartijNrs].sort((a: number, b: number) => a - b);
    const sameSequence = expected.length === got.length && expected.every((n, i) => got[i] === n);

    if (!sameSequence) {
      return jsonError("partij_nr moet een aaneengesloten reeks zijn vanaf 1.");
    }

    await ensureOriginalPartijNrControleContext(matchmakingId, latestControleRunId);

    const { data: ctxRows, error: ctxErr } = await supabaseAdmin
      .from("controle_bout_context")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq("controle_run_id", latestControleRunId)
      .order("partij_nr", { ascending: true });

    if (ctxErr) throw ctxErr;

    const ctxList = (ctxRows ?? []) as any[];
    if (ctxList.length === 0) {
      return jsonError("Geen partijen gevonden in controle_bout_context voor deze matchmaking/run.");
    }

    if (ctxList.length !== items.length) {
      return jsonError(
        `Aantal reorder-items (${items.length}) komt niet overeen met aantal controle-partijen (${ctxList.length}).`
      );
    }

    const ctxById = new Map<string, any>();
    const ctxByPartijNr = new Map<number, any>();

    for (const row of ctxList) {
      const rowId = norm(row?.id);
      const rowPn = asPositiveInt(row?.partij_nr);

      if (rowId) ctxById.set(rowId, row);
      if (rowPn != null) ctxByPartijNr.set(rowPn, row);
    }

    const resolved: ResolvedReorderItem[] = items.map((item: ReorderItem) => {
      let row: any | null = null;

      if (item.ctx_row_id) row = ctxById.get(item.ctx_row_id) ?? null;
      if (!row && item.old_partij_nr != null) row = ctxByPartijNr.get(item.old_partij_nr) ?? null;

      const currentPartijNr = asPositiveInt(row?.partij_nr);
      const originalPartijNr = asPositiveInt(row?.original_partij_nr);

      return {
        ctx_row_id: norm(row?.id),
        old_partij_nr: currentPartijNr ?? item.old_partij_nr,
        partij_nr: item.partij_nr,
        original_partij_nr: originalPartijNr ?? currentPartijNr ?? item.old_partij_nr,
        swap_hoeken: item.swap_hoeken || shouldSwapHoeken(item, row),
        rood_va: item.rood_va,
        blauw_va: item.blauw_va,
      };
    });

    const unresolved = resolved.filter((x: ResolvedReorderItem) => !x.ctx_row_id || x.old_partij_nr == null);
    if (unresolved.length > 0) {
      return jsonError(
        "Niet alle items konden gekoppeld worden aan controle_bout_context. Controleer ctx_row_id / old_partij_nr."
      );
    }

    const uniqueCtxIds = new Set(resolved.map((x: ResolvedReorderItem) => x.ctx_row_id));
    if (uniqueCtxIds.size !== resolved.length) {
      return jsonError("Er zijn dubbele controle-context rijen gevonden bij het koppelen van reorder items.");
    }

    const uniqueOldPn = new Set(resolved.map((x: ResolvedReorderItem) => x.old_partij_nr));
    if (uniqueOldPn.size !== resolved.length) {
      return jsonError("Er zijn dubbele oude partij_nummers gevonden in de reorder-mapping.");
    }

    const mapping = resolved.map((x: ResolvedReorderItem) => ({
      old_partij_nr: x.old_partij_nr!,
      partij_nr: x.partij_nr,
    }));

    const hoekSwaps = resolved.filter((x: ResolvedReorderItem) => x.swap_hoeken);

    const swappedControleContext = await applyHoekSwapToControleContext(
      matchmakingId,
      latestControleRunId,
      resolved,
      ctxById
    );

    const swappedControleResultaten = await swapControleResultatenHoek(
      matchmakingId,
      latestControleRunId,
      hoekSwaps
    );

    let swappedRaw = 0;
    try {
      swappedRaw = await applyHoekSwapByPartijNr(
        "matchmaking_bouts_raw",
        matchmakingId,
        hoekSwaps,
        RAW_HOEK_PAIRS
      );
    } catch (e) {
      console.warn("matchmaking_bouts_raw hoekwissel sync overgeslagen:", e);
    }

    let swappedWeighIn = 0;
    try {
      swappedWeighIn = await applyHoekSwapByPartijNr(
        "weigh_in_bouts",
        matchmakingId,
        hoekSwaps,
        WEIGH_HOEK_PAIRS
      );
    } catch (e) {
      console.warn("weigh_in_bouts hoekwissel sync overgeslagen:", e);
    }

    await updatePartijNrSequenceByIds(
      "controle_bout_context",
      "id",
      resolved.map((x: ResolvedReorderItem) => ({
        id: x.ctx_row_id,
        partij_nr: x.partij_nr,
      })),
      {
        matchmaking_id: matchmakingId,
        controle_run_id: latestControleRunId,
      }
    );

    await updateControleResultatenZonderBoutIdByOldToNewMap(
      matchmakingId,
      latestControleRunId,
      mapping
    );

    try {
      await updatePartijNrByOldToNewMap(
        "dispensatie_requests",
        { matchmaking_id: matchmakingId },
        mapping
      );
    } catch (e) {
      console.warn("dispensatie_requests reorder sync overgeslagen:", e);
    }

    try {
      const { error: probeErr } = await supabaseAdmin
        .from("dispensatie_hits")
        .select("partij_nr")
        .limit(1);

      if (!probeErr) {
        await updatePartijNrByOldToNewMap(
          "dispensatie_hits",
          { matchmaking_id: matchmakingId },
          mapping
        );
      }
    } catch (e) {
      console.warn("dispensatie_hits reorder sync overgeslagen:", e);
    }

    try {
      const oldPartijNrs = mapping.map((x: { old_partij_nr: number }) => x.old_partij_nr);
      await ensureOriginalPartijNrRaw(matchmakingId, oldPartijNrs);

      await updatePartijNrByOldToNewMap(
        "matchmaking_bouts_raw",
        { matchmaking_id: matchmakingId },
        mapping
      );
    } catch (e) {
      console.warn("matchmaking_bouts_raw reorder sync overgeslagen:", e);
    }

    try {
      await repairControleResultatenPartijNrByBoutId(matchmakingId, latestControleRunId);
    } catch (e) {
      console.warn("controle_resultaten bout_id repair overgeslagen:", e);
    }

    try {
      await updatePartijNrByOldToNewMap(
        "weigh_in_bouts",
        { matchmaking_id: matchmakingId },
        mapping
      );
    } catch (e) {
      console.warn("weigh_in_bouts reorder sync overgeslagen:", e);
    }

    return NextResponse.json({
      ok: true,
      message:
        "Lineup-volgorde en hoekwissels opgeslagen. original_partij_nr is behouden. controle_resultaten zonder bout_id zijn op partij_nr verplaatst; controle_resultaten met bout_id zijn hersteld via matchmaking_bouts_raw.bout_uid.",
      matchmaking_id: matchmakingId,
      controle_run_id: latestControleRunId,
      updated: resolved.length,
      hoek_swaps: hoekSwaps.length,
      swapped_controle_context: swappedControleContext,
      swapped_controle_resultaten: swappedControleResultaten,
      swapped_matchmaking_bouts_raw: swappedRaw,
      swapped_weigh_in_bouts: swappedWeighIn,
      items: resolved.map((x: ResolvedReorderItem) => ({
        ctx_row_id: x.ctx_row_id,
        original_partij_nr: x.original_partij_nr,
        old_partij_nr: x.old_partij_nr,
        new_partij_nr: x.partij_nr,
        swap_hoeken: x.swap_hoeken,
      })),
    });
  } catch (e: any) {
    console.error("controle/reorder-partijen POST error:", e);
    return jsonError(e?.message ?? "Onbekende fout bij controle reorder-partijen.", 500);
  }
}
