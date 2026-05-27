import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader, hasAnyRoleFromReq } from "@/lib/api/requireRole";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function asUuid(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const ok = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  return ok ? s : null;
}

/**
 * Voer een supabase query uit, maar negeer fouten (best effort).
 * Handig voor "kolom bestaat niet" of "tabel bestaat niet" scenario's.
 */
async function bestEffort<T>(promise: any): Promise<null> {
  try {
    await promise;
  } catch {
    // bewust negeren
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const user = await requireUserFromAuthHeader(req);
    const allowed = await hasAnyRoleFromReq(req, ["superadmin", "admin"]);
    if (!allowed) {
      return NextResponse.json({ error: "Geen rechten." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const matchmaking_id = asUuid(body?.matchmaking_id);
    const partij_nr = Number(body?.partij_nr);
    const controle_run_id = asUuid(body?.controle_run_id);
    const bout_id = asUuid(body?.bout_id);

    if (!matchmaking_id) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt." }, { status: 400 });
    }

    if (!Number.isFinite(partij_nr)) {
      return NextResponse.json({ error: "partij_nr ontbreekt." }, { status: 400 });
    }

    // 1) dispensatie_requests
    await bestEffort(
      supabaseAdmin
        .from("dispensatie_requests")
        .delete()
        .eq("matchmaking_id", matchmaking_id)
        .eq("partij_nr", partij_nr)
        .throwOnError()
    );

    // 2) controle_resultaten
    if (controle_run_id) {
      await bestEffort(
        supabaseAdmin
          .from("controle_resultaten")
          .delete()
          .eq("controle_run_id", controle_run_id)
          .eq("partij_nr", partij_nr)
          .throwOnError()
      );
    } else {
      await bestEffort(
        supabaseAdmin
          .from("controle_resultaten")
          .delete()
          .eq("matchmaking_id", matchmaking_id)
          .eq("partij_nr", partij_nr)
          .throwOnError()
      );

      // fallback voor oudere data waar matchmaking_id niet op controle_resultaten staat:
      const { data: runs } = await supabaseAdmin
        .from("controle_runs")
        .select("id")
        .eq("matchmaking_id", matchmaking_id);

      for (const run of runs ?? []) {
        await bestEffort(
          supabaseAdmin
            .from("controle_resultaten")
            .delete()
            .eq("controle_run_id", run.id)
            .eq("partij_nr", partij_nr)
            .throwOnError()
        );
      }
    }

    // 3) controle_bout_context
    {
      let q = supabaseAdmin
        .from("controle_bout_context")
        .delete()
        .eq("matchmaking_id", matchmaking_id)
        .eq("partij_nr", partij_nr);

      if (controle_run_id) q = q.eq("controle_run_id", controle_run_id);

      await bestEffort(q.throwOnError());
    }

    // 4) controle_audit_events  <-- BELANGRIJK voor VA gewijzigd / oude rapportregels
    if (controle_run_id) {
      await bestEffort(
        supabaseAdmin
          .from("controle_audit_events")
          .delete()
          .eq("matchmaking_id", matchmaking_id)
          .eq("controle_run_id", controle_run_id)
          .eq("partij_nr", partij_nr)
          .throwOnError()
      );
    } else {
      await bestEffort(
        supabaseAdmin
          .from("controle_audit_events")
          .delete()
          .eq("matchmaking_id", matchmaking_id)
          .eq("partij_nr", partij_nr)
          .throwOnError()
      );
    }

    // 5) matchmaking_bouts_raw
    if (bout_id) {
      await bestEffort(
        supabaseAdmin
          .from("matchmaking_bouts_raw")
          .delete()
          // @ts-ignore
          .or(`bout_uid.eq.${bout_id},id.eq.${bout_id}`)
          .throwOnError()
      );
    }

    await bestEffort(
      supabaseAdmin
        .from("matchmaking_bouts_raw")
        .delete()
        .eq("matchmaking_id", matchmaking_id)
        .eq("partij_nr", partij_nr)
        .throwOnError()
    );

    return NextResponse.json({
      ok: true,
      removed: {
        matchmaking_id,
        partij_nr,
        controle_run_id: controle_run_id ?? null,
        bout_id: bout_id ?? null,
      },
      by: {
        user_id: user?.userId ?? user?.user?.id ?? null,
        email: user?.user?.email ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
