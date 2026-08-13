// app/api/dispensatie/vote/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader, hasAnyRole, hasAnyRoleFromReq } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { user } = await requireUserFromAuthHeader(req);

    const ok = await hasAnyRoleFromReq(req, ["dispensatie_admin", "admin", "superadmin"]);
    if (!ok) return NextResponse.json({ error: "Geen rechten." }, { status: 403 });

    const body = await req.json();
    const request_id = String(body.request_id ?? "").trim();
    const vote = String(body.vote ?? "").trim(); // "approve" | "reject"
    const note = body.note ? String(body.note) : null;

    if (!request_id) return NextResponse.json({ error: "request_id ontbreekt." }, { status: 400 });
    if (!["approve", "reject"].includes(vote)) return NextResponse.json({ error: "Ongeldige vote." }, { status: 400 });

    // upsert vote
    const { error: vErr } = await supabaseAdmin
      .from("dispensatie_votes")
      .upsert(
        { request_id, user_id: user.id, vote, note, updated_at: new Date().toISOString() },
        { onConflict: "request_id,user_id" }
      );

    if (vErr) throw vErr;

    // status => pending (alleen als nog open)
    const { error: sErr } = await supabaseAdmin
      .from("dispensatie_requests")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", request_id)
      .in("status", ["open", "nieuw"]);

    if (sErr) throw sErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
