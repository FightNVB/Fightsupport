import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader, hasAnyRole, hasAnyRoleFromReq } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // <-- MOET bestaan in je env
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    await requireUserFromAuthHeader(req);

    const ok = await hasAnyRoleFromReq(req, ["dispensatie_admin", "admin", "superadmin"]);
    if (!ok) return NextResponse.json({ error: "Geen rechten." }, { status: 403 });

    const body = await req.json();
    const request_id = String(body.request_id ?? "").trim();
    const storage_path = String(body.storage_path ?? "").trim();
    const original_filename = body.original_filename ? String(body.original_filename) : null;
    const content_type = body.content_type ? String(body.content_type) : "application/pdf";

    if (!request_id || !storage_path) {
      return NextResponse.json({ error: "request_id en storage_path verplicht." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("dispensatie_attachments")
      .insert({
        request_id,
        storage_path,
        original_filename,
        content_type,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ attachment: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
