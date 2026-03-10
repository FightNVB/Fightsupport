import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET() {
  try {
    const { data: events, error: eErr } = await supabase
      .from("events")
      .select("id, naam, datum, locatie, status, bondteam, promotor, matchmaker, hoofdofficial")
      .order("datum", { ascending: false });

    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });

    const { data: uploads, error: uErr } = await supabase
      .from("matchmaker_matchmakings")
      .select("id, raw_filename, uploaded_at, evenement_naam, evenement_datum, locatie, event_id")
      .order("uploaded_at", { ascending: false })
      .limit(200);

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    return NextResponse.json({ events: events ?? [], uploads: uploads ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Onbekende fout" }, { status: 500 });
  }
}
