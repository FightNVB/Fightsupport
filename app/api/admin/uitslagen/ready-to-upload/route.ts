// app/api/admin/uitslagen/ready-to-upload/route.ts
// List matchmakings that are ready to export (LINEUP state, all uitslagen entered).
// Requires hoofdofficial, admin, superadmin, or dispensatie_admin role.

import { NextResponse } from "next/server";
import { requireAnyRole, supabaseAdmin } from "@/app/api/_utils/authz";
import { getReadyToExportMatchmakings } from "@/lib/workflow/matchmakingValidator";
import { ERRORS } from "@/lib/constants/errors";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAnyRole(req, ["hoofdofficial", "admin", "superadmin", "dispensatie_admin"]);

    const ready = await getReadyToExportMatchmakings(supabaseAdmin);

    return NextResponse.json({ ok: true, items: ready });
  } catch (e: any) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e?.message ?? ERRORS.UNKNOWN_ERROR },
      { status: 500 }
    );
  }
}
