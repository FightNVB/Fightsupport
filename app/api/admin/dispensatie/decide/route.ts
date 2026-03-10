import { NextResponse } from "next/server";
import { requireAnyRole, supabaseAdmin } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAnyRole(req, ["superadmin"]);

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? "").trim();
    const decision = String(body?.decision ?? "").trim().toLowerCase(); // approve|reject
    const notes = body?.notes ? String(body.notes).trim() : null;

    if (!id) return bad("Missing id", 400);
    if (decision !== "approve" && decision !== "reject") return bad("decision must be approve/reject", 400);

    const { data: row, error: rErr } = await supabaseAdmin
      .from("dispensatie_requests")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (rErr) return bad(rErr.message, 500);
    if (!row?.id) return bad("Not found", 404);

    const nextStatus = decision === "approve" ? "goedgekeurd" : "afgekeurd";

    const { error: uErr } = await supabaseAdmin
      .from("dispensatie_requests")
      .update({
        status: nextStatus,
        beslist_door: userId,
        beslist_op: new Date().toISOString(),
        notities: notes,
      })
      .eq("id", id);

    if (uErr) return bad(uErr.message, 500);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return bad(e?.message ?? "Server error", 500);
  }
}
