import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.type || !body.data) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    switch (body.type) {
      case "fighter":
        await supabase.from("fighters").upsert(body.data, { onConflict: "nvb_nummer" });
        break;

      case "gym":
        await supabase.from("gyms").upsert(body.data, { onConflict: "naam" });
        break;

      case "event":
        await supabase.from("events").upsert(body.data, { onConflict: "id" });
        break;

      case "bout":
        await supabase.from("bouts").upsert(body.data, { onConflict: "id" });
        break;

      default:
        return NextResponse.json({ ok: false, error: "Unknown type" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
