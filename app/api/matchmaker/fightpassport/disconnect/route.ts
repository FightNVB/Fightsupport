// app/api/matchmaker/fightpassport/disconnect/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { userId } = await requireUserWithRole(req);
    const { error } = await supabase
      .from("fightpassport_sessions")
      .update({ cookies: [], status: "disconnected", message: "FightPassport sessie is losgekoppeld.", updated_at: new Date().toISOString() })
      .eq("matchmaker_id", userId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Loskoppelen mislukt" }, { status: 500 });
  }
}
