import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";

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

export async function GET(req: Request) {
  await requireAdmin(req);
  try {
    const url = new URL(req.url);
    const status = asString(url.searchParams.get("status"));
    const q = asString(url.searchParams.get("q"));
    const limitRaw = Number(url.searchParams.get("limit") || 100);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    let query = supabase
      .from("afmeldingen")
      .select("*")
      .order("afgemeld_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && status !== "all" && status !== "alles") {
      query = query.eq("status", status);
    }

    if (q) {
      const safe = q.replace(/[%_,]/g, "");
      query = query.or([
        `naam.ilike.%${safe}%`,
        `naam_input.ilike.%${safe}%`,
        `fp_naam.ilike.%${safe}%`,
        `voornaam.ilike.%${safe}%`,
        `achternaam.ilike.%${safe}%`,
        `sportschool.ilike.%${safe}%`,
        `va_nummer.ilike.%${safe}%`,
        `event_naam.ilike.%${safe}%`,
        `matchmaker_naam.ilike.%${safe}%`,
        `matchmaker_email.ilike.%${safe}%`,
      ].join(","));
    }

    const { data, error } = await query;
    if (error) return bad("Afmeldingen laden mislukt", 500, error.message);

    return NextResponse.json({ ok: true, afmeldingen: (data || []).map(normalize) });
  } catch (e: any) {
    return bad(e?.message || "Server fout", 500);
  }
}
