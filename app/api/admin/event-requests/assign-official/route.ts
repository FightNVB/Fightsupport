import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function asText(v: unknown) {
  const s = String(v ?? "").trim();
  return s || null;
}

export async function PATCH(req: Request) {
  try {
    await requireUserWithRole(req, ["admin", "superadmin"]);
    const body = await req.json();

    const requestId = asText(body?.request_id);
    const officialUserId = asText(body?.official_user_id);
    const adminNote = asText(body?.opmerking_admin);

    if (!requestId) return NextResponse.json({ error: "request_id ontbreekt" }, { status: 400 });
    if (!officialUserId) return NextResponse.json({ error: "official_user_id ontbreekt" }, { status: 400 });

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, display_name, naam, name, username")
      .eq("user_id", officialUserId)
      .maybeSingle();

    const officialName =
      (profile as any)?.full_name ||
      (profile as any)?.display_name ||
      (profile as any)?.naam ||
      (profile as any)?.name ||
      (profile as any)?.username ||
      officialUserId;

    const { error } = await supabase
      .from("event_requests")
      .update({
        toegewezen_hoofdofficial_user_id: officialUserId,
        toegewezen_hoofdofficial_name: officialName,
        opmerking_admin: adminNote,
        admin_assigned_at: new Date().toISOString(),
        status: "verzonden_naar_official",
      })
      .eq("id", requestId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Koppelen mislukt" }, { status: 500 });
  }
}
