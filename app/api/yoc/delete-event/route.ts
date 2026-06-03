// app/api/admin/yoc/delete-event/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(req: NextRequest) {
  const { yoc_event_id } = await req.json();

  if (!yoc_event_id) {
    return NextResponse.json({ ok: false, error: "yoc_event_id ontbreekt" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tables = [
    "yoc_resultaten",
    "yoc_fighter_context",
    "yoc_fighters_raw",
    "yoc_runs",
    "yoc_fighters",
    "yoc_uploads",
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("yoc_event_id", yoc_event_id);

    if (error) {
      return NextResponse.json(
        { ok: false, table, error: error.message },
        { status: 500 }
      );
    }
  }

  const { error: eventError } = await supabase
    .from("yoc_events")
    .delete()
    .eq("id", yoc_event_id);

  if (eventError) {
    return NextResponse.json(
      { ok: false, table: "yoc_events", error: eventError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}