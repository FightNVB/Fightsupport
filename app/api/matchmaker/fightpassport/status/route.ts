// app/api/matchmaker/fightpassport/status/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  try {
    const { userId } = await requireUserWithRole(req);
    const { data, error } = await supabase
      .from("fightpassport_sessions")
      .select("id, status, message, updated_at, last_login_at, trusted_device")
      .eq("matchmaker_id", userId)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: true, connected: data?.status === "active", session: data ?? null });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Status ophalen mislukt" }, { status: 500 });
  }
}
