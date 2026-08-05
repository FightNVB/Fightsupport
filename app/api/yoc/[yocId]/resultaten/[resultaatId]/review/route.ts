import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminAccess, secureError } from "@/lib/api/secureRoute";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    yocId: string;
    resultaatId: string;
  }>;
};

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? "").trim(),
  );
}

export async function POST(req: NextRequest, ctx: Params) {
  try {
    const auth = await requireAdminAccess(req);
    const { yocId, resultaatId } = await ctx.params;

    if (!isUuid(yocId)) return json(400, { ok: false, error: "Ongeldig YOC-id." });
    if (!isUuid(resultaatId)) return json(400, { ok: false, error: "Ongeldig resultaat-id." });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return json(500, { ok: false, error: "Supabase env mist." });
    }

    const body = await req.json().catch(() => ({}));
    const reviewStatusRaw = String(body?.review_status ?? "approved").trim().toLowerCase();
    const review_status = reviewStatusRaw === "open" ? "open" : "approved";
    const review_note = String(body?.review_note ?? "").trim() || null;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("yoc_resultaten")
      .select("id,yoc_event_id,review_status")
      .eq("id", resultaatId)
      .eq("yoc_event_id", yocId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) return json(404, { ok: false, error: "Melding niet gevonden." });

    const patch: Record<string, unknown> = {
      review_status,
      reviewed_by: auth.authUserId,
      reviewed_at: new Date().toISOString(),
      review_note,
    };

    if (review_status === "open") {
      patch.reviewed_by = null;
      patch.reviewed_at = null;
      patch.review_note = review_note;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("yoc_resultaten")
      .update(patch)
      .eq("id", resultaatId)
      .eq("yoc_event_id", yocId)
      .select("id,review_status,reviewed_by,reviewed_at,review_note")
      .single();

    if (updateError) throw updateError;

    return json(200, { ok: true, resultaat: updated });
  } catch (e: any) {
    return secureError(e, "Review opslaan mislukt.");
  }
}
