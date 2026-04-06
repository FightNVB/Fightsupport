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
    const auth = await requireUserWithRole(req, ["official", "hoofdofficial", "admin", "superadmin"]);
    const userId = String((auth as any)?.user?.id ?? "").trim();
    const body = await req.json();

    const requestId = asText(body?.request_id);
    const response = asText(body?.response);
    const reason = asText(body?.reason);

    if (!requestId) return NextResponse.json({ error: "request_id ontbreekt" }, { status: 400 });
    if (response !== "accepted" && response !== "declined") {
      return NextResponse.json({ error: "response moet accepted of declined zijn" }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from("event_requests")
      .select("id, toegewezen_hoofdofficial_user_id")
      .eq("id", requestId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ error: "Verzoek niet gevonden" }, { status: 404 });
    if (String(existing.toegewezen_hoofdofficial_user_id ?? "") !== userId) {
      return NextResponse.json({ error: "Niet toegestaan voor dit verzoek" }, { status: 403 });
    }

    const patch: Record<string, unknown> = {
      reactie_official: reason,
      official_responded_at: new Date().toISOString(),
    };

    if (response === "accepted") {
      patch.status = "geaccepteerd";
      patch.accepted_at = new Date().toISOString();
      patch.declined_at = null;
    } else {
      patch.status = "afgewezen";
      patch.declined_at = new Date().toISOString();
      patch.accepted_at = null;
    }

    const { error } = await supabase
      .from("event_requests")
      .update(patch)
      .eq("id", requestId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Opslaan mislukt" }, { status: 500 });
  }
}
