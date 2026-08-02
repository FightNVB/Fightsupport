import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/_utils/authz";
import { supabaseAdmin } from "@/lib/api/requireRole";
import { refreshVaNumbers } from "@/lib/matchmaker/terminator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isInternalTerminatorAllowed(req: Request): boolean {
  const expected = String(
    process.env.TERMINATOR_INTERNAL_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  ).trim();
  if (!expected) return false;

  const authorization = req.headers.get("authorization") || "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  return Boolean(supplied) && safeEqual(supplied, expected);
}

async function requireAdminOrInternal(req: Request) {
  if (isInternalTerminatorAllowed(req)) return;
  await requireAdmin(req);
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item ?? "").replace(/\D+/g, "")).filter(Boolean))];
}

async function vaNumbersFromRun(syncRunId: string): Promise<string[]> {
  const rows: string[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("fightpassport_sync_items")
      .select("va_nummer, status, profiel_gevonden")
      .eq("sync_run_id", syncRunId)
      .eq("profiel_gevonden", true)
      .in("status", ["success", "completed"])
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const va = String(row.va_nummer ?? "").replace(/\D+/g, "");
      if (va) rows.push(va);
    }
    if ((data ?? []).length < pageSize) break;
    from += pageSize;
  }

  return [...new Set(rows)];
}

export async function POST(req: Request) {
  try {
    await requireAdminOrInternal(req);
    const body = await req.json().catch(() => ({}));
    const syncRunId = String(body.sync_run_id ?? "").trim();
    const explicitVas = normalizeList(body.va_numbers);
    const vaNumbers = explicitVas.length
      ? explicitVas
      : syncRunId
        ? await vaNumbersFromRun(syncRunId)
        : [];

    if (!vaNumbers.length) {
      return NextResponse.json(
        { ok: false, error: "Geen va_numbers gevonden; geef va_numbers of sync_run_id mee." },
        { status: 400 },
      );
    }

    const result = await refreshVaNumbers({ supabase: supabaseAdmin, vaNumbers });
    return NextResponse.json({ ...result, sync_run_id: syncRunId || null });
  } catch (error: any) {
    console.error("[POST /api/admin/terminator/run]", error);
    const message = error?.message ?? "Terminator uitvoeren mislukt.";
    const status = /toegang|admin|ingelogd|token/i.test(message) ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
