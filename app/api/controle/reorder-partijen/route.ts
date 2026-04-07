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

    const items = rawItems
      .map((x: any) => ({
        ctx_row_id: norm(x?.ctx_row_id),
        old_partij_nr: asPositiveInt(x?.old_partij_nr),
        partij_nr: asPositiveInt(x?.partij_nr),
      }))
      .filter((x) => x.partij_nr != null && (x.ctx_row_id || x.old_partij_nr != null));

    if (items.length !== rawItems.length) {
      return jsonError(
        "Niet alle items bevatten een geldige ctx_row_id of old_partij_nr en partij_nr."
      );
    }

    const uniquePartijNrs = new Set(items.map((x) => x.partij_nr));
    if (uniquePartijNrs.size !== items.length) {
      return jsonError("Er zitten dubbele partij_nr waarden in items.");
    }

    const expected = Array.from({ length: items.length }, (_, i) => i + 1);
    const got = [...uniquePartijNrs].sort((a, b) => a - b);
    const sameSequence = expected.length === got.length && expected.every((n, i) => got[i] === n);

    if (!sameSequence) {
      return jsonError("partij_nr moet een aaneengesloten reeks zijn vanaf 1.");
    }

    await ensureOriginalPartijNrControleContext(matchmakingId, latestControleRunId);

    const { data: ctxRows, error: ctxErr } = await supabaseAdmin
      .from("controle_bout_context")
      .select("id, matchmaking_id, controle_run_id, partij_nr, original_partij_nr")
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

    const resolved = items.map((item) => {
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
      };
    });

    const unresolved = resolved.filter((x) => !x.ctx_row_id || x.old_partij_nr == null);
    if (unresolved.length > 0) {
      return jsonError(
        "Niet alle items konden gekoppeld worden aan controle_bout_context. Controleer ctx_row_id / old_partij_nr."
      );
    }

    const uniqueCtxIds = new Set(resolved.map((x) => x.ctx_row_id));
    if (uniqueCtxIds.size !== resolved.length) {
      return jsonError("Er zijn dubbele controle-context rijen gevonden bij het koppelen van reorder items.");
    }

    const uniqueOldPn = new Set(resolved.map((x) => x.old_partij_nr));
    if (uniqueOldPn.size !== resolved.length) {
      return jsonError("Er zijn dubbele oude partij_nummers gevonden in de reorder-mapping.");
    }

    const mapping = resolved.map((x) => ({
      old_partij_nr: x.old_partij_nr!,
      partij_nr: x.partij_nr,
    }));

    await updatePartijNrSequenceByIds(
      "controle_bout_context",
      "id",
      resolved.map((x) => ({
        id: x.ctx_row_id,
        partij_nr: x.partij_nr,
      })),
      {
        matchmaking_id: matchmakingId,
        controle_run_id: latestControleRunId,
      }
    );

    await updatePartijNrByOldToNewMap(
      "controle_resultaten",
      { controle_run_id: latestControleRunId },
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
  const oldPartijNrs = mapping.map((x) => x.old_partij_nr);
  await ensureOriginalPartijNrRaw(matchmakingId, oldPartijNrs);

  await updatePartijNrByOldToNewMap(
    "matchmaking_bouts_raw",
    { matchmaking_id: matchmakingId },
    mapping
  );
} catch (e) {
  console.warn("matchmaking_bouts_raw reorder sync overgeslagen:", e);
}

    return NextResponse.json({
      ok: true,
      message:
        "Lineup-volgorde opgeslagen. original_partij_nr is behouden en partij_nr is bijgewerkt op controle_bout_context, controle_resultaten, dispensatie_requests en matchmaking_bouts_raw.",
      matchmaking_id: matchmakingId,
      controle_run_id: latestControleRunId,
      updated: resolved.length,
      items: resolved.map((x) => ({
        ctx_row_id: x.ctx_row_id,
        original_partij_nr: x.original_partij_nr,
        old_partij_nr: x.old_partij_nr,
        new_partij_nr: x.partij_nr,
      })),
    });
  } catch (e: any) {
    console.error("controle/reorder-partijen POST error:", e);
    return jsonError(e?.message ?? "Onbekende fout bij controle reorder-partijen.", 500);
  }
}