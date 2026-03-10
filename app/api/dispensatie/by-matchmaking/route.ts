// app/api/dispensatie/by_matchmaking/route.ts
// (compat route) sommige pagina's roepen per ongeluk by_matchmaking aan i.p.v. by-matchmaking
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader, hasAnyRole, hasAnyRoleFromReq } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  try {
    await requireUserFromAuthHeader(req);

    const ok = await hasAnyRoleFromReq(req, ["admin", "superadmin", "dispensatie_admin", "hoofdofficial"]);
    if (!ok) return NextResponse.json({ error: "Geen rechten." }, { status: 403 });

    const url = new URL(req.url);
    const matchmaking_id = String(url.searchParams.get("matchmaking_id") ?? "").trim();

    if (!matchmaking_id || !UUID_RE.test(matchmaking_id)) {
      return NextResponse.json({ error: "matchmaking_id is verplicht (uuid)." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("dispensatie_requests")
      .select("id, status, decision, partij_nr, bout_id, rule_code, controle_run_id, created_at, updated_at")
      .eq("matchmaking_id", matchmaking_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
