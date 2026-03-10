// app/api/dispensatie/delete/route.ts
import { NextResponse } from "next/server";
import { requireUserFromAuthHeader, getUserRoleNames, hasAnyRole } from "@/lib/api/requireRole";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { supabase, userId } = await requireUserFromAuthHeader(req);
    const roles = await getUserRoleNames(supabase, userId);

    if (!hasAnyRole(roles, ["admin", "superadmin"])) {
      return NextResponse.json({ error: "Geen toegang (alleen admin/superadmin)." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const request_id = String(body?.request_id ?? "").trim();
    if (!request_id) return NextResponse.json({ error: "request_id ontbreekt" }, { status: 400 });

    // Request verwijderen
    const { error: delReqErr } = await supabase.from("dispensatie_requests").delete().eq("id", request_id);
    if (delReqErr) throw delReqErr;

    // Optioneel: votes/messages opruimen (als tabellen bestaan)
    for (const t of ["dispensatie_votes", "dispensatie_messages"] as const) {
      const { error } = await supabase.from(t as any).delete().eq("request_id", request_id);
      if (error && String((error as any)?.code ?? "") !== "PGRST204") {
        console.warn(`[dispensatie/delete] cleanup ${t} error:`, error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
