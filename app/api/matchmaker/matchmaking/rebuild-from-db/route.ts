import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  refreshMatchmaking,
  type TerminatorProgress,
} from "@/lib/matchmaker/terminator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function s(value: unknown) {
  return String(value ?? "").trim();
}

async function requireUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) throw new Error("Niet ingelogd.");

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    throw new Error(error?.message || "Niet ingelogd.");
  }

  return data.user;
}

async function assertAccess(userId: string, matchmakingId: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmakings")
    .select(
      "id, matchmaker_id, uploaded_by, maker_user_id, huidige_eigenaar_user_id, locked_for_editing",
    )
    .eq("id", matchmakingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Matchmaking niet gevonden.");

  const allowed = [
    data.matchmaker_id,
    data.uploaded_by,
    data.maker_user_id,
    data.huidige_eigenaar_user_id,
  ]
    .map(s)
    .filter(Boolean);

  if (!allowed.includes(userId)) {
    throw new Error("Geen toegang tot deze matchmaking.");
  }

  if (data.locked_for_editing === true) {
    throw new Error("Deze matchmaking is vergrendeld.");
  }
}


async function markLatestUploadChecked(matchmakingId: string) {
  const { data: uploads, error: findError } = await supabaseAdmin
    .from("matchmaking_uploads")
    .select("id, uploaded_at, created_at")
    .eq("matchmaking_id", matchmakingId)
    .order("uploaded_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (findError) {
    throw new Error(`Laatste matchmaking-upload ophalen mislukt: ${findError.message}`);
  }

  const uploadId = s(uploads?.[0]?.id);
  if (!uploadId) return;

  const { error: updateError } = await supabaseAdmin
    .from("matchmaking_uploads")
    .update({
      controle_status: "klaar",
      flow_status: "klaar",
    })
    .eq("id", uploadId)
    .eq("matchmaking_id", matchmakingId);

  if (updateError) {
    throw new Error(`Controle-status upload bijwerken mislukt: ${updateError.message}`);
  }
}

async function assertHasBouts(matchmakingId: string) {
  const { count, error } = await supabaseAdmin
    .from("matchmaking_bouts_raw")
    .select("id", { count: "exact", head: true })
    .eq("matchmaking_id", matchmakingId)
    .or("verwijderd.is.null,verwijderd.eq.false");

  if (error) throw new Error(error.message);
  if (!count) {
    throw new Error(
      "Deze matchmaking bevat geen actieve partijen om tegen FightPassport te controleren.",
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body.matchmaking_id);

    if (!matchmakingId) throw new Error("matchmaking_id ontbreekt.");

    await assertAccess(user.id, matchmakingId);
    await assertHasBouts(matchmakingId);

    // Dit is bewust dezelfde DB-opbouw als refresh-all. refreshMatchmaking
    // gebruikt de FightPassport-tabellen als bron en start geen scraper.
    if (body.progress_stream === true) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        start(controller) {
          const send = (payload: Record<string, unknown>) => {
            controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
          };

          void (async () => {
            try {
              const result = await refreshMatchmaking({
                supabase: supabaseAdmin,
                matchmakingId,
                onProgress(progress: TerminatorProgress) {
                  send({ type: "progress", ...progress });
                },
              });

              await markLatestUploadChecked(matchmakingId);

              send({
                type: "result",
                ...result,
                ok: true,
                source: "fightpassport_database",
                scraper_started: false,
                matchmaking_id: matchmakingId,
                processed: result.fighter_contexts,
                rebuilt_bouts: result.bouts,
                refresh_page: true,
              });
              controller.close();
            } catch (error: any) {
              console.error(
                "[POST /api/matchmaker/matchmaking/rebuild-from-db stream]",
                error,
              );
              send({
                type: "error",
                ok: false,
                scraper_started: false,
                error:
                  error?.message ||
                  "Matchmaking opnieuw opbouwen vanuit FightPassport mislukt.",
              });
              controller.close();
            }
          })();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const result = await refreshMatchmaking({
      supabase: supabaseAdmin,
      matchmakingId,
    });

    await markLatestUploadChecked(matchmakingId);

    return NextResponse.json({
      ...result,
      ok: true,
      source: "fightpassport_database",
      scraper_started: false,
      matchmaking_id: matchmakingId,
      processed: result.fighter_contexts,
      rebuilt_bouts: result.bouts,
      refresh_page: true,
    });
  } catch (error: any) {
    console.error("[POST /api/matchmaker/matchmaking/rebuild-from-db]", error);
    return NextResponse.json(
      {
        ok: false,
        scraper_started: false,
        error:
          error?.message ||
          "Matchmaking opnieuw opbouwen vanuit FightPassport mislukt.",
      },
      { status: 400 },
    );
  }
}
