import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function bad(msg: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: msg, extra }, { status });
}

function asString(v: unknown) {
  const s = String(v ?? "").trim();
  return s || null;
}

function asNumber(v: unknown) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asSafeMeta(v: unknown) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as Record<string, any>;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const q = asString(url.searchParams.get("q"));
    const status = asString(url.searchParams.get("status"));
    const type = asString(url.searchParams.get("type")) ?? "afmelding_laat";
    const limit = Math.min(asNumber(url.searchParams.get("limit")) ?? 200, 500);

    let query = supabase
      .from("admin_meldingen")
      .select("*")
      .eq("type", type)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return bad("Afmeldingen laden mislukt", 500, error.message);
    }

    let rows = (data ?? []).map((row: any) => ({
      ...row,
      meta: asSafeMeta(row?.meta),
    }));

    if (q) {
      const needle = q.toLowerCase();

      rows = rows.filter((row: any) => {
        const meta = asSafeMeta(row?.meta);

        return [
          row?.id,
          row?.titel,
          row?.type,
          row?.status,
          row?.boodschap,
          row?.matchmaking_id,
          row?.fighter_id,
          meta?.fighter_naam,
          meta?.event_naam,
          meta?.event_datum,
          meta?.fighter_context_id,
          meta?.inschrijving_id,
        ]
          .map((v) => String(v ?? "").toLowerCase())
          .join(" ")
          .includes(needle);
      });
    }

    return NextResponse.json({
      ok: true,
      count: rows.length,
      rows,
    });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    const id = body?.id;
    const status = asString(body?.status);
    const notitie = asString(body?.notitie);

    if (id == null || id === "") {
      return bad("id ontbreekt");
    }

    if (!status) {
      return bad("status ontbreekt");
    }

    const allowedStatuses = ["nieuw", "gelezen", "in_behandeling", "afgerond"];
    if (!allowedStatuses.includes(status)) {
      return bad("Ongeldige status");
    }

    const { data: existing, error: existingError } = await supabase
      .from("admin_meldingen")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return bad("Melding laden mislukt", 500, existingError.message);
    }

    if (!existing) {
      return bad("Melding niet gevonden", 404);
    }

    const existingMeta = asSafeMeta(existing?.meta);

    const nextMeta = {
      ...existingMeta,
      admin_notitie: notitie ?? existingMeta?.admin_notitie ?? null,
      status_updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("admin_meldingen")
      .update({
        status,
        meta: nextMeta,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return bad("Status bijwerken mislukt", 500, error.message);
    }

    return NextResponse.json({
      ok: true,
      row: {
        ...data,
        meta: asSafeMeta(data?.meta),
      },
    });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}