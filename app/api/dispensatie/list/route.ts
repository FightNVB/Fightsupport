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
    await requireUserFromAuthHeader(req);
    const ok = await hasAnyRoleFromReq(req, ["admin", "superadmin", "dispensatie_admin"]);
    if (!ok) return NextResponse.json({ error: "Geen rechten." }, { status: 403 });

    const { data: base, error: rErr } = await supabaseAdmin
      .from("dispensatie_requests")
      .select("id,status,matchmaking_id,partij_nr,bout_id,rule_code,created_at,updated_at,decision")
      .order("updated_at", { ascending: false });

    if (rErr) throw rErr;

    const rows = (base ?? []) as any[];

    // 2e query matchmaking_uploads (geen embedded select zonder FK)
    const matchmakingIds = [...new Set(rows.map((d) => d.matchmaking_id).filter(Boolean) as string[])];

    const { data: uploads, error: uErr } = matchmakingIds.length
      ? await supabaseAdmin
          .from("matchmaking_uploads")
          .select("matchmaking_id,evenement_naam,evenement_datum")
          .in("matchmaking_id", matchmakingIds)
      : ({ data: [], error: null } as any);

    if (uErr) throw uErr;

    const uploadsBy = new Map<string, any>();
    (uploads ?? []).forEach((u: any) => uploadsBy.set(String(u.matchmaking_id), u));

    const merged = rows.map((r) => {
      const u = r.matchmaking_id ? uploadsBy.get(String(r.matchmaking_id)) ?? null : null;
      return { ...r, evenement_naam: u?.evenement_naam ?? null, evenement_datum: u?.evenement_datum ?? null };
    });

    return NextResponse.json({ rows: merged });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
