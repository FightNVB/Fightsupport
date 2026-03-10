import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader, hasAnyRoleFromReq } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * Return events visible for officials.
 * - superadmin/admin: all events
 * - official/hoofdofficial:
 *    - if user has bondteam: events with same bondteam OR bondteam NULL (general)
 *    - if user has NO bondteam: only bondteam NULL (general)
 */
export async function GET(req: Request) {
  try {
    const { user } = await requireUserFromAuthHeader(req);

    const isAdmin = await hasAnyRoleFromReq(req, ["superadmin", "admin"]);
    const isOfficial = await hasAnyRoleFromReq(req, ["official", "hoofdofficial", "superadmin", "admin"]);
    if (!isOfficial) return NextResponse.json({ ok: false, error: "Geen rechten" }, { status: 403 });

    let userBondteam: string | null = null;

    if (!isAdmin) {
      const { data: prof, error: pErr } = await supabaseAdmin
        .from("user_profiles")
        .select("bondteam")
        .eq("id", user.id)
        .maybeSingle();

      if (pErr) throw pErr;
      userBondteam = (prof as any)?.bondteam ? String((prof as any).bondteam).trim() : null;
    }

    let q = supabaseAdmin
      .from("events")
      .select("id, naam, datum, locatie, bondteam, created_at")
      .order("datum", { ascending: false })
      .limit(200);

    // officials scope (bondteam is NOT required)
    if (!isAdmin) {
      if (userBondteam) {
        // same bondteam OR general (NULL)
        q = q.or(`bondteam.is.null,bondteam.eq.${userBondteam}`);
      } else {
        // bondless official: only general events
        q = q.is("bondteam", null);
      }
    }

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ ok: true, events: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Onbekende fout" }, { status: 500 });
  }
}
