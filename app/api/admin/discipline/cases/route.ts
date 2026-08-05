import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET(req: NextRequest) {
  await requireAdmin(req);
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const betrokkeneType = searchParams.get("betrokkene_type") || "";
    const q = searchParams.get("q") || "";

    let query = supabase
      .from("discipline_case_summary")
      .select("*")
      .order("datum_overtreding", { ascending: false, nullsFirst: false })
      .order("aangemaakt_op", { ascending: false });

    if (status && status !== "alle") query = query.eq("status", status);
    if (type && type !== "alle") query = query.eq("type", type);
    if (betrokkeneType && betrokkeneType !== "alle") query = query.eq("betrokkene_type", betrokkeneType);
    if (q) query = query.or(`naam.ilike.%${q}%,categorie.ilike.%${q}%,omschrijving.ilike.%${q}%`);

    const { data, error } = await query.limit(250);
    if (error) throw error;

    return NextResponse.json({ ok: true, cases: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await requireAdmin(req);
  try {
    const body = await req.json();

    const payload = {
      type: cleanText(body.type) || "overtreding",
      status: cleanText(body.status) || "open",
      betrokkene_type: cleanText(body.betrokkene_type),
      betrokkene_id: body.betrokkene_id || null,
      va_nummer: body.va_nummer ? Number(body.va_nummer) : null,
      naam: cleanText(body.naam),
      datum_overtreding: body.datum_overtreding || null,
      matchmaking_id: body.matchmaking_id || null,
      event_id: body.event_id || null,
      bout_id: body.bout_id || null,
      categorie: cleanText(body.categorie),
      ernst: cleanText(body.ernst) || "laag",
      omschrijving: cleanText(body.omschrijving),
      interne_notitie: cleanText(body.interne_notitie) || null,
      aangemaakt_door: body.aangemaakt_door || null,
    };

    if (!payload.betrokkene_type || !payload.naam || !payload.categorie || !payload.omschrijving) {
      return NextResponse.json({ ok: false, error: "Betrokkene, naam, categorie en omschrijving zijn verplicht." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("discipline_cases")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, case: data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: "De aanvraag kon niet worden verwerkt." }, { status: 500 });
  }
}
