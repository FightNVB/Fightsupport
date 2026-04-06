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

  if (!token) {
    return { user: null, error: "Geen bearer token ontvangen." };
  }

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
  if (roles.includes("superadmin") || roles.includes("admin")) return true;

  const { data: uploadRows, error: uploadErr } = await supabaseAdmin
    .from("matchmaking_uploads")
    .select("uploaded_by")
    .eq("matchmaking_id", matchmakingId)
    .order("uploaded_at", { ascending: false })
    .limit(5);

  if (uploadErr) throw uploadErr;

  const uploadOwners = (uploadRows ?? [])
    .map((r: any) => norm(r?.uploaded_by))
    .filter(Boolean);

  if (uploadOwners.includes(userId)) return true;

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
    .map((v) => norm(v))
    .filter(Boolean);

  if (ownerCandidates.includes(userId)) return true;

  return false;
}

type ReorderItem = {
  bout_id: string;
  partij_nr: number;
};

async function validateItems(rawItems: any[]): Promise<ReorderItem[]> {
  const items = rawItems
    .map((x: any) => ({
      bout_id: norm(x?.bout_id),
      partij_nr: asPositiveInt(x?.partij_nr),
    }))
    .filter((x) => x.bout_id && x.partij_nr != null) as ReorderItem[];

  if (items.length !== rawItems.length) {
    throw new Error("Niet alle items bevatten een geldige bout_id en partij_nr.");
  }

  const uniqueBoutIds = new Set(items.map((x) => x.bout_id));
  if (uniqueBoutIds.size !== items.length) {
    throw new Error("Er zitten dubbele bout_id waarden in items.");
  }

  const uniquePartijNrs = new Set(items.map((x) => x.partij_nr));
  if (uniquePartijNrs.size !== items.length) {
    throw new Error("Er zitten dubbele partij_nr waarden in items.");
  }

  const expected = Array.from({ length: items.length }, (_, i) => i + 1);
  const got = [...uniquePartijNrs].sort((a, b) => a - b);
  const sameSequence =
    expected.length === got.length && expected.every((n, i) => got[i] === n);

  if (!sameSequence) {
    throw new Error("partij_nr moet een aaneengesloten reeks zijn vanaf 1.");
  }

  return items;
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: userError } = await getUserFromBearer(req);
    if (!user) {
      return jsonError(userError ?? "Niet ingelogd.", 401);
    }

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

    let items: ReorderItem[];
    try {
      items = await validateItems(rawItems);
    } catch (e: any) {
      return jsonError(e?.message ?? "Ongeldige reorder items.");
    }

    const boutIds = items.map((x) => x.bout_id);

    const { data: rawBouts, error: rawErr } = await supabaseAdmin
      .from("matchmaker_bouts_raw")
      .select("id, matchmaking_id, partij_nr")
      .eq("matchmaking_id", matchmakingId)
      .in("id", boutIds);

    if (rawErr) throw rawErr;

    const foundRows = rawBouts ?? [];
    const foundRawIds = new Set(foundRows.map((r: any) => String(r.id)));
    const missingInRaw = boutIds.filter((id) => !foundRawIds.has(id));

    if (missingInRaw.length > 0) {
      return jsonError(
        `Niet alle bout_id waarden bestaan in matchmaker_bouts_raw voor deze matchmaking. Ontbrekend: ${missingInRaw.join(", ")}`
      );
    }

    if (foundRows.length !== items.length) {
      return jsonError("Aantal gevonden partijen komt niet overeen met de aangeleverde items.");
    }

    const existingPartijNrs = new Set(
      foundRows
        .map((r: any) => asPositiveInt(r?.partij_nr))
        .filter((n: number | null): n is number => n != null)
    );

    const tempBase =
      Math.max(items.length, ...(existingPartijNrs.size ? Array.from(existingPartijNrs) : [0])) + 1000;

    const tempUpdates = items.map((item, index) => ({
      id: item.bout_id,
      partij_nr: tempBase + index + 1,
    }));

    for (const upd of tempUpdates) {
      const { error: updErr } = await supabaseAdmin
        .from("matchmaker_bouts_raw")
        .update({ partij_nr: upd.partij_nr })
        .eq("matchmaking_id", matchmakingId)
        .eq("id", upd.id);

      if (updErr) throw updErr;
    }

    for (const item of items) {
      const { error: updErr } = await supabaseAdmin
        .from("matchmaker_bouts_raw")
        .update({ partij_nr: item.partij_nr })
        .eq("matchmaking_id", matchmakingId)
        .eq("id", item.bout_id);

      if (updErr) throw updErr;
    }

    const { data: finalRows, error: finalErr } = await supabaseAdmin
      .from("matchmaker_bouts_raw")
      .select("id, partij_nr")
      .eq("matchmaking_id", matchmakingId)
      .in("id", boutIds)
      .order("partij_nr", { ascending: true });

    if (finalErr) throw finalErr;

    return NextResponse.json({
      ok: true,
      message: "Volgorde opgeslagen.",
      matchmaking_id: matchmakingId,
      updated: items.length,
      items,
      final_rows: finalRows ?? [],
    });
  } catch (e: any) {
    console.error("matchmaking/reorder-partijen POST error:", e);
    return jsonError(e?.message ?? "Onbekende fout bij reorder-partijen.", 500);
  }
}