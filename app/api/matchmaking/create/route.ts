import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAnyRole } from "@/app/api/_utils/authz";
import { ensureLifecycleRecord } from "@/app/api/_utils/matchmakingLifecycle";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const ALLOWED_BONDTEAMS = new Set([
  "IRO",
  "NKF",
  "WPKL",
  "WMTA",
  "VON",
  "UMC",
  "MMAAN",
  "MON",
]);

type Payload = {
  naam: string;
  datum: string;
  locatie?: string | null;
  bondteam: string;
  promotor?: string | null;
  promotor_id?: string | null;
  event_id?: string | null;
};

function bad(message: string, status = 400, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, extra }, { status });
}

function s(v: unknown): string | null {
  const x = String(v ?? "").trim();
  return x || null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAnyRole(req, [
      "superadmin",
      "admin",
      "matchmaker",
    ]);

    const userId = auth.userId;
    const role = String(auth.role ?? "").trim().toLowerCase();

    if (role !== "matchmaker" && role !== "admin" && role !== "superadmin") {
      return bad("Alleen matchmaker of admin mag een matchmaking aanmaken.", 403);
    }

    const body = (await req.json().catch(() => ({}))) as Partial<Payload>;

    const naam = s(body?.naam);
    const datum = s(body?.datum);
    const locatie = s(body?.locatie);
    const bondteam = s(body?.bondteam);
    const promotor = s(body?.promotor);
    const promotor_id = s(body?.promotor_id);
    let event_id = s(body?.event_id);

    if (!naam) return bad("naam ontbreekt.");
    if (!datum) return bad("datum ontbreekt.");
    if (!bondteam) return bad("bondteam ontbreekt.");
    if (!ALLOWED_BONDTEAMS.has(bondteam)) {
      return bad("Onbekend bondteam.");
    }

    const now = new Date().toISOString();

    if (!event_id) {
      const { data: ev, error: evErr } = await supabaseAdmin
        .from("events")
        .insert({
          naam,
          datum,
          locatie,
          status: "draft",
          bondteam,
          promotor,
        })
        .select("id")
        .single();

      if (evErr) {
        return bad(evErr.message, 500);
      }

      event_id = String((ev as any)?.id ?? "").trim() || null;
    } else {
      const { data: existingEvent, error: existingEventErr } = await supabaseAdmin
        .from("events")
        .select("id")
        .eq("id", event_id)
        .maybeSingle();

      if (existingEventErr) {
        return bad(existingEventErr.message, 500);
      }
      if (!existingEvent) {
        return bad("event_id bestaat niet.", 400);
      }
    }

    const insertPayload = {
      naam,
      datum,
      locatie,
      bondteam,

      promotor,
      promotor_id,

      maker_type: "matchmaker",
      maker_user_id: userId,
      matchmaker_id: userId,

      bron_type: "matchmaker_app",
      stadium: "concept_matchmaking",
      status: "concept_matchmaking",

      huidige_eigenaar_type: "matchmaker",
      huidige_eigenaar_user_id: userId,
      huidige_eigenaar_bondteam: null,

      vorige_eigenaar_type: null,
      vorige_eigenaar_user_id: null,
      vorige_eigenaar_bondteam: null,

      is_actief: true,
      is_archived: false,
      locked_for_editing: false,

      created_at: now,
      last_updated_at: now,
      last_updated_by: userId,

      event_id: event_id || null,
    };

    const { data: mm, error: mmErr } = await supabaseAdmin
      .from("matchmakings")
      .insert(insertPayload)
      .select("*")
      .single();

    if (mmErr) {
      return bad(mmErr.message, 500, mmErr);
    }

    const matchmakingId = String((mm as any)?.id ?? "").trim();
    if (!matchmakingId) {
      return bad("Kon matchmaking id niet bepalen.", 500);
    }

    await ensureLifecycleRecord({
      matchmakingId,
      naam,
      datum,
      locatie,
      promotorId: promotor_id,
      matchmakerId: userId,
      makerType: "matchmaker",
      makerUserId: userId,
      bondteam,
      eventId: event_id || null,
      bronType: "matchmaker_app",
      stage: "concept_matchmaking",
      ownerType: "matchmaker",
      ownerUserId: userId,
      ownerBondteam: null,
      actorUserId: userId,
      actorRole: role,
      metadata: {
        route: "app/api/matchmakings/create/route.ts",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Matchmaking aangemaakt.",
      matchmaking: mm,
    });
  } catch (e: any) {
    console.error("[matchmakings/create]", e);
    return bad(e?.message ?? "Onbekende fout.", 500);
  }
}