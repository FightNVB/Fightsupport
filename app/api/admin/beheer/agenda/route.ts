import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAnyRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function bad(error: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error, extra }, { status });
}

function s(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeRole(v: unknown) {
  return s(v).toLowerCase();
}

async function getUserRoleNames(userId: string): Promise<string[]> {
  const { data: userRoles, error: userRolesError } = await supabaseAdmin
    .from("user_roles")
    .select("role_id, role")
    .eq("user_id", userId);

  if (userRolesError) throw userRolesError;

  const directRoles = (userRoles ?? [])
    .map((r: any) => normalizeRole(r.role))
    .filter(Boolean);

  const roleIds = Array.from(
    new Set(
      (userRoles ?? [])
        .map((r: any) => r.role_id)
        .filter((id: any) => id !== null && id !== undefined),
    ),
  );

  let roleNamesFromIds: string[] = [];

  if (roleIds.length > 0) {
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("roles")
      .select("id, name")
      .in("id", roleIds);

    if (rolesError) throw rolesError;

    roleNamesFromIds = (roles ?? [])
      .map((r: any) => normalizeRole(r.name))
      .filter(Boolean);
  }

  return Array.from(new Set([...roleNamesFromIds, ...directRoles]));
}

async function requireAdmin(req: Request) {
  try {
    const auth = await requireAnyRole(req, ["admin", "superadmin"]);
    return {
      ok: true as const,
      user: { id: auth.userId },
      profile: auth.profile,
      roles: [auth.role],
    };
  } catch (error: any) {
    if (error instanceof Response) {
      return {
        ok: false as const,
        error: error.status === 401 ? "Niet ingelogd" : "Geen toegang",
        status: error.status,
      };
    }
    return {
      ok: false as const,
      error: "Autorisatie mislukt",
      status: 500,
      extra: error?.message,
    };
  }
}

function dateValue(row: AnyRow) {
  return s(
    row.datum ??
      row.event_datum ??
      row.start_datum ??
      row.start_date ??
      row.date,
  );
}

function nameValue(row: AnyRow) {
  return s(row.naam ?? row.event_naam ?? row.titel ?? row.title ?? row.name);
}

function isSchemaCacheError(error: any) {
  const msg = s(error?.message).toLowerCase();
  const code = s(error?.code).toUpperCase();
  return (
    code === "PGRST204" ||
    code === "PGRST205" ||
    code === "42P01" ||
    code === "42703" ||
    msg.includes("could not find the table") ||
    msg.includes("could not find the column") ||
    msg.includes("schema cache") ||
    msg.includes("does not exist")
  );
}

async function safeDeleteWhere(
  table: string,
  column: string,
  value: string,
  stats: Record<string, number>,
) {
  if (!value) return;

  const { count, error } = await supabaseAdmin
    .from(table)
    .delete({ count: "exact" })
    .eq(column, value);

  if (error) {
    if (isSchemaCacheError(error)) return;
    throw new Error(`${table}.${column}: ${error.message}`);
  }

  if (count && count > 0) stats[table] = (stats[table] ?? 0) + count;
}

async function safeDeleteIn(
  table: string,
  column: string,
  values: string[],
  stats: Record<string, number>,
) {
  const clean = Array.from(new Set(values.map(s).filter(Boolean)));
  if (!clean.length) return;

  const { count, error } = await supabaseAdmin
    .from(table)
    .delete({ count: "exact" })
    .in(column, clean);

  if (error) {
    if (isSchemaCacheError(error)) return;
    throw new Error(`${table}.${column}: ${error.message}`);
  }

  if (count && count > 0) stats[table] = (stats[table] ?? 0) + count;
}

async function safeSelectIds(table: string, column: string, value: string) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("id")
    .eq(column, value);

  if (error) {
    if (isSchemaCacheError(error)) return [] as string[];
    throw new Error(`${table}.${column}: ${error.message}`);
  }

  return (data ?? []).map((row: any) => s(row.id)).filter(Boolean);
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return bad(
        auth.error,
        auth.status,
        "extra" in auth ? auth.extra : undefined,
      );

    const { searchParams } = new URL(req.url);
    const q = s(searchParams.get("q")).toLowerCase();
    const status = s(searchParams.get("status") || "alles").toLowerCase();

    const { data, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .order("datum", { ascending: true, nullsFirst: false });

    if (error) return bad("Evenementen laden mislukt", 500, error.message);

    const items = ((data ?? []) as AnyRow[]).filter((event) => {
      const haystack = [
        nameValue(event),
        event.locatie,
        event.plaats,
        event.land,
        event.promotor,
        event.organisatie,
        event.hoofdofficial,
        event.matchmaker,
        event.status,
        dateValue(event),
      ]
        .map((x) => s(x).toLowerCase())
        .join(" ");

      if (q && !haystack.includes(q)) return false;
      if (
        status &&
        status !== "alles" &&
        s(event.status).toLowerCase() !== status
      )
        return false;
      return true;
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return bad(
        auth.error,
        auth.status,
        "extra" in auth ? auth.extra : undefined,
      );

    const { searchParams } = new URL(req.url);
    const id = s(searchParams.get("id"));

    if (!id) return bad("Event id ontbreekt", 400);

    const { data: event, error: loadError } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (loadError)
      return bad("Evenement laden mislukt", 500, loadError.message);
    if (!event) return bad("Evenement niet gevonden", 404);

    const stats: Record<string, number> = {};
    const matchmakingIds = await safeSelectIds("matchmakings", "event_id", id);

    // Verwijder eerst gekoppelde records. De helpers slaan tabellen/kolommen over
    // die in een oudere database niet bestaan, maar geven echte delete-fouten wel terug.
    for (const matchmakingId of matchmakingIds) {
      await safeDeleteWhere(
        "weigh_in_audit",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
      await safeDeleteWhere(
        "weigh_in_bouts",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
      await safeDeleteWhere(
        "uitslagen_bouts",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
      await safeDeleteWhere(
        "uitslagen_runs",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
      await safeDeleteWhere(
        "controle_resultaten",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
      await safeDeleteWhere(
        "controle_uitslagen",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
      await safeDeleteWhere(
        "controle_bout_context",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
      await safeDeleteWhere(
        "controle_toernooi_context",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
      await safeDeleteWhere(
        "controle_runs",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
      await safeDeleteWhere(
        "matchmaker_fighter_resultaten",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
      await safeDeleteWhere(
        "matchmaker_fighter_context",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
      await safeDeleteWhere(
        "matchmaker_fighters_raw",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
      await safeDeleteWhere(
        "matchmaker_uitslagen_raw",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
      await safeDeleteWhere(
        "matchmaking_bouts_raw",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
      await safeDeleteWhere(
        "aanmeldingen",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
      await safeDeleteWhere(
        "matchmaking_uploads",
        "matchmaking_id",
        matchmakingId,
        stats,
      );
    }

    // Directe event-koppelingen, ook voor modules die geen matchmakings gebruiken.
    for (const table of [
      "weigh_in_audit",
      "weigh_in_bouts",
      "uitslagen_bouts",
      "uitslagen_runs",
      "controle_resultaten",
      "controle_uitslagen",
      "controle_bout_context",
      "controle_toernooi_context",
      "controle_runs",
      "matchmaker_fighter_resultaten",
      "matchmaker_fighter_context",
      "matchmaker_fighters_raw",
      "matchmaker_uitslagen_raw",
      "matchmaking_bouts_raw",
      "aanmeldingen",
      "matchmaking_uploads",
      "matchmakings",
    ]) {
      await safeDeleteWhere(table, "event_id", id, stats);
    }

    for (const table of [
      "yoc_resultaten",
      "yoc_fighter_context",
      "yoc_fighters_raw",
      "yoc_fighters",
      "yoc_runs",
      "yoc_uploads",
    ]) {
      await safeDeleteWhere(table, "yoc_event_id", id, stats);
    }

    if (matchmakingIds.length) {
      await safeDeleteIn("matchmakings", "id", matchmakingIds, stats);
    }

    const { count, error } = await supabaseAdmin
      .from("events")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) return bad("Evenement verwijderen mislukt", 500, error.message);
    if (!count) return bad("Evenement niet gevonden of al verwijderd", 404);

    return NextResponse.json({
      ok: true,
      deleted: event,
      linked_matchmakings: matchmakingIds.length,
      deleted_counts: stats,
    });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}
