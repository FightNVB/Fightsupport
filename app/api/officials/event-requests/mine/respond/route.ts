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
    const body = await req.json();

    const requestId = asText(body?.request_id);
    const response = asText(body?.response);
    const reason = asText(body?.reason);

    if (!requestId) return NextResponse.json({ error: "request_id ontbreekt" }, { status: 400 });
    if (response !== "accepted" && response !== "declined") {
      return NextResponse.json({ error: "response moet accepted of declined zijn" }, { status: 400 });
    }

    let existingQuery = supabase
      .from("event_requests")
      .select("id,bondteam")
      .eq("id", requestId);
    if (auth.role !== "admin" && auth.role !== "superadmin") existingQuery = existingQuery.eq("bondteam", String(auth.bondteam ?? ""));
    const { data: existing, error: existingError } = await existingQuery.maybeSingle();

    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ error: "Verzoek niet gevonden" }, { status: 404 });

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

    let updateQuery = supabase
      .from("event_requests")
      .update(patch)
      .eq("id", requestId);
    if (auth.role !== "admin" && auth.role !== "superadmin") updateQuery = updateQuery.eq("bondteam", String(auth.bondteam ?? ""));
    const { error } = await updateQuery;

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Opslaan mislukt" }, { status: 500 });
  }
}
