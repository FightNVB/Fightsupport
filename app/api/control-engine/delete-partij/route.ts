import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertCanAccessMatchmaking, requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function asUuid(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const ok = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  return ok ? s : null;
}

/**
 * Voer een supabase query uit, maar negeer fouten (best effort).
 * Handig voor "kolom bestaat niet" of "tabel bestaat niet" scenario's.
 */
async function bestEffort(promise: any): Promise<boolean> {
  try {
    await promise;
    return true;
  } catch {
    // bewust negeren
    return false;
  }
}

async function getControleRunIds(matchmaking_id: string, controle_run_id: string | null) {
  const ids = new Set<string>();
  if (controle_run_id) ids.add(controle_run_id);

  const { data } = await supabaseAdmin
    .from("controle_runs")
    .select("id")
    .eq("matchmaking_id", matchmaking_id);

  for (const run of data ?? []) {
    if (run?.id) ids.add(String(run.id));
  }

  return [...ids];
}

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await requireUserWithRole(req);

    const body = await req.json().catch(() => ({}));
    const matchmaking_id = asUuid(
      body?.matchmaking_id ?? body?.matchmakingId,
    );
    const partij_nr = Number(body?.partij_nr);
    const controle_run_id = asUuid(body?.controle_run_id);
    const bout_id = asUuid(body?.bout_id);

    if (!matchmaking_id) {
      return NextResponse.json({ error: "matchmaking_id ontbreekt." }, { status: 400 });
    }

    if (!Number.isFinite(partij_nr)) {
      return NextResponse.json({ error: "partij_nr ontbreekt." }, { status: 400 });
    }

    // Geen aparte rollenlijst: dezelfde centrale toegangscontrole bepaalt
    // of deze gebruiker binnen deze matchmaking mag werken.
    await assertCanAccessMatchmaking({
      matchmaking_id,
      userId,
      role,
    });

    const controleRunIds = await getControleRunIds(matchmaking_id, controle_run_id);

    /**
     * BELANGRIJK:
     * Een verwijderde partij mag NIET zorgen dat partij_nr's opschuiven.
     * Daarom doen we hier nergens een update zoals partij_nr = partij_nr - 1.
     * We ruimen alleen data op van exact dit partij_nr / bout_id.
     */

    // 1) dispensatie_requests
    await bestEffort(
      supabaseAdmin
        .from("dispensatie_requests")
        .delete()
        .eq("matchmaking_id", matchmaking_id)
        .eq("partij_nr", partij_nr)
        .throwOnError()
    );

    if (bout_id) {
      await bestEffort(
        supabaseAdmin
          .from("dispensatie_requests")
          .delete()
          .eq("matchmaking_id", matchmaking_id)
          // @ts-ignore oudere database kan bout_id missen
          .eq("bout_id", bout_id)
          .throwOnError()
      );
    }

    // 2) controle_resultaten: altijd alle runs van deze matchmaking opschonen.
    // Dit voorkomt dat oude resultaten van partij 12 later aan een andere partij 12 lijken te hangen.
    await bestEffort(
      supabaseAdmin
        .from("controle_resultaten")
        .delete()
        .eq("matchmaking_id", matchmaking_id)
        .eq("partij_nr", partij_nr)
        .throwOnError()
    );

    for (const runId of controleRunIds) {
      await bestEffort(
        supabaseAdmin
          .from("controle_resultaten")
          .delete()
          .eq("controle_run_id", runId)
          .eq("partij_nr", partij_nr)
          .throwOnError()
      );
    }

    if (bout_id) {
      await bestEffort(
        supabaseAdmin
          .from("controle_resultaten")
          .delete()
          // @ts-ignore oudere database kan bout_id missen
          .eq("bout_id", bout_id)
          .throwOnError()
      );
    }

    // 3) controle_bout_context
    await bestEffort(
      supabaseAdmin
        .from("controle_bout_context")
        .delete()
        .eq("matchmaking_id", matchmaking_id)
        .eq("partij_nr", partij_nr)
        .throwOnError()
    );

    for (const runId of controleRunIds) {
      await bestEffort(
        supabaseAdmin
          .from("controle_bout_context")
          .delete()
          .eq("controle_run_id", runId)
          .eq("partij_nr", partij_nr)
          .throwOnError()
      );
    }

    if (bout_id) {
      await bestEffort(
        supabaseAdmin
          .from("controle_bout_context")
          .delete()
          // @ts-ignore oudere database kan bout_id missen
          .eq("bout_id", bout_id)
          .throwOnError()
      );
    }

    // 4) controle_uitslagen: ook opschonen, anders kan de oude context blijven terugkomen.
    await bestEffort(
      supabaseAdmin
        .from("controle_uitslagen")
        .delete()
        .eq("matchmaking_id", matchmaking_id)
        .eq("partij_nr", partij_nr)
        .throwOnError()
    );

    for (const runId of controleRunIds) {
      await bestEffort(
        supabaseAdmin
          .from("controle_uitslagen")
          .delete()
          .eq("controle_run_id", runId)
          .eq("partij_nr", partij_nr)
          .throwOnError()
      );
    }

    if (bout_id) {
      await bestEffort(
        supabaseAdmin
          .from("controle_uitslagen")
          .delete()
          // @ts-ignore oudere database kan bout_id missen
          .eq("bout_id", bout_id)
          .throwOnError()
      );
    }

    // 5) controle_audit_events  <-- BELANGRIJK voor VA gewijzigd / oude rapportregels
    await bestEffort(
      supabaseAdmin
        .from("controle_audit_events")
        .delete()
        .eq("matchmaking_id", matchmaking_id)
        .eq("partij_nr", partij_nr)
        .throwOnError()
    );

    for (const runId of controleRunIds) {
      await bestEffort(
        supabaseAdmin
          .from("controle_audit_events")
          .delete()
          .eq("matchmaking_id", matchmaking_id)
          .eq("controle_run_id", runId)
          .eq("partij_nr", partij_nr)
          .throwOnError()
      );
    }

    if (bout_id) {
      await bestEffort(
        supabaseAdmin
          .from("controle_audit_events")
          .delete()
          .eq("matchmaking_id", matchmaking_id)
          // @ts-ignore oudere database kan bout_id missen
          .eq("bout_id", bout_id)
          .throwOnError()
      );
    }

    // 6) weegstation / uitslagen data voor exact deze partij verwijderen.
    await bestEffort(
      supabaseAdmin
        .from("weigh_in_bouts")
        .delete()
        .eq("matchmaking_id", matchmaking_id)
        .eq("partij_nr", partij_nr)
        .throwOnError()
    );

    await bestEffort(
      supabaseAdmin
        .from("uitslagen_bouts")
        .delete()
        .eq("matchmaking_id", matchmaking_id)
        .eq("partij_nr", partij_nr)
        .throwOnError()
    );

    if (bout_id) {
      await bestEffort(
        supabaseAdmin
          .from("weigh_in_bouts")
          .delete()
          // @ts-ignore oudere database kan bout_id missen
          .eq("bout_id", bout_id)
          .throwOnError()
      );

      await bestEffort(
        supabaseAdmin
          .from("uitslagen_bouts")
          .delete()
          // @ts-ignore oudere database kan bout_id missen
          .eq("bout_id", bout_id)
          .throwOnError()
      );
    }

    /**
     * 7) matchmaking_bouts_raw
     * Soft delete is bewust beter dan fysiek verwijderen:
     * - partij_nr 12 blijft historisch partij_nr 12
     * - partij_nr 13 wordt dus NIET ineens 12
     * - schermen die .neq("verwijderd", true) gebruiken tonen hem niet meer
     *
     * Als de kolom "verwijderd" in een oude database niet bestaat, doen we daarna
     * alsnog een fysieke delete als fallback.
     */
    const softDeletedByPartijNr = await bestEffort(
      supabaseAdmin
        .from("matchmaking_bouts_raw")
        .update({ verwijderd: true })
        .eq("matchmaking_id", matchmaking_id)
        .eq("partij_nr", partij_nr)
        .throwOnError()
    );

    let softDeletedByBoutId = false;
    if (bout_id) {
      softDeletedByBoutId = await bestEffort(
        supabaseAdmin
          .from("matchmaking_bouts_raw")
          .update({ verwijderd: true })
          // @ts-ignore
          .or(`bout_uid.eq.${bout_id},id.eq.${bout_id},bout_id.eq.${bout_id}`)
          .throwOnError()
      );
    }

    // Fallback: alleen voor databases zonder soft-delete kolom.
    // Geen enkele hernummering uitvoeren.
    if (!softDeletedByPartijNr && !softDeletedByBoutId) {
      await bestEffort(
        supabaseAdmin
          .from("matchmaking_bouts_raw")
          .delete()
          .eq("matchmaking_id", matchmaking_id)
          .eq("partij_nr", partij_nr)
          .throwOnError()
      );

      if (bout_id) {
        await bestEffort(
          supabaseAdmin
            .from("matchmaking_bouts_raw")
            .delete()
            // @ts-ignore
            .or(`bout_uid.eq.${bout_id},id.eq.${bout_id},bout_id.eq.${bout_id}`)
            .throwOnError()
        );
      }
    }

    return NextResponse.json({
      ok: true,
      removed: {
        matchmaking_id,
        partij_nr,
        controle_run_id: controle_run_id ?? null,
        controle_run_ids: controleRunIds,
        bout_id: bout_id ?? null,
        renumbered: false,
      },
      by: {
        user_id: userId,
        role,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
