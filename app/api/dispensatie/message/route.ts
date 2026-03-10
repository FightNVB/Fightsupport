// app/api/dispensatie/message/route.ts
import { NextResponse } from "next/server";
import { requireUserFromAuthHeader } from "@/lib/api/requireRole";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { supabase, userId } = await requireUserFromAuthHeader(req);

    const body = await req.json();
    const request_id = String(body?.request_id ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!request_id) return NextResponse.json({ error: "request_id ontbreekt" }, { status: 400 });
    if (!message) return NextResponse.json({ error: "message ontbreekt" }, { status: 400 });

    const now = new Date().toISOString();

    const { error: insErr } = await supabase.from("dispensatie_messages").insert({
      request_id,
      user_id: userId,
      message,
      created_at: now,
    });

    if (insErr) throw insErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
