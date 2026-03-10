import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const event_id = String(body?.event_id ?? "").trim();
    const matchmaking_upload_id = String(body?.matchmaking_upload_id ?? "").trim();

    if (!event_id) return NextResponse.json({ error: "event_id ontbreekt" }, { status: 400 });
    if (!matchmaking_upload_id)
      return NextResponse.json({ error: "matchmaking_upload_id ontbreekt" }, { status: 400 });

    const { error } = await supabase
      .from("matchmaker_uploads")
      .update({ event_id })
      .eq("id", matchmaking_upload_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Onbekende fout" }, { status: 500 });
  }
}
