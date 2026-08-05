// app/api/admin/yoc/delete-event/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminAccess, secureError } from "@/lib/api/secureRoute";

export async function DELETE(req: NextRequest) {
  try { await requireAdminAccess(req); } catch (error) { return secureError(error); }
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
      return secureError(error, "YOC-event kon niet worden verwijderd.");
    }
  }

  const { error: eventError } = await supabase
    .from("yoc_events")
    .delete()
    .eq("id", yoc_event_id);

  if (eventError) {
    return secureError(eventError, "YOC-event kon niet worden verwijderd.");
  }

  return NextResponse.json({ ok: true });
}
