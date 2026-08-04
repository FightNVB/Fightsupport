import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserFromAuthHeader } from "@/lib/api/auth";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function s(value: unknown) {
  return String(value ?? "").trim();
}

async function requireAllowedUser(req: NextRequest) {
  const user = await requireUserFromAuthHeader(req);
  const role = s(user.role).toLowerCase();
  if (!role.includes("matchmaker") && !role.includes("admin") && !role.includes("superadmin")) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function GET(req: NextRequest) {
  try {
    await requireAllowedUser(req);
    const matchmakingId = s(req.nextUrl.searchParams.get("matchmakingId"));
    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmakingId ontbreekt" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("matchmaking_public_pages")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ ok: true, publication: data ?? null });
  } catch (error: any) {
    const message = s(error?.message) || "Openbare matchmaking laden mislukt";
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function makeToken() {
  return randomBytes(32).toString("hex");
}

async function getPublication(matchmakingId: string) {
  const { data, error } = await supabaseAdmin
    .from("matchmaking_public_pages")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAllowedUser(req);
    const body = await req.json().catch(() => ({}));
    const matchmakingId = s(body?.matchmakingId);
    const action = s(body?.action) || "publish_live";
    if (!matchmakingId) {
      return NextResponse.json({ error: "matchmakingId ontbreekt" }, { status: 400 });
    }

    const { data: matchmaking, error: mmError } = await supabaseAdmin
      .from("matchmakings")
      .select("*")
      .eq("id", matchmakingId)
      .maybeSingle();

    if (mmError) throw mmError;
    if (!matchmaking) {
      return NextResponse.json({ error: "Matchmaking niet gevonden" }, { status: 404 });
    }

    const existing = await getPublication(matchmakingId);
    const now = new Date().toISOString();
    const basePayload = {
      matchmaking_id: matchmakingId,
      is_enabled: action === "offline" ? false : true,
      show_pending: body?.show_pending !== false,
      show_opponent_search: body?.show_opponent_search !== false,
      public_title: s(body?.public_title) || s(matchmaking.event_naam) || s(matchmaking.naam) || null,
      public_location: s(body?.public_location) || s(matchmaking.event_locatie) || s(matchmaking.locatie) || null,
      public_disciplines: s(body?.public_disciplines) || s(matchmaking.discipline) || null,
      created_by: existing?.created_by || user.userId,
      public_token: existing?.public_token || makeToken(),
      trainer_token: existing?.trainer_token || makeToken(),
      trainer_is_published:
        action === "offline" ? false : existing?.trainer_is_published === true,
      updated_at: now,
    };

    if (action === "rotate_promoter") basePayload.public_token = makeToken();
    if (action === "rotate_trainers") basePayload.trainer_token = makeToken();

    const { data: saved, error } = await supabaseAdmin
      .from("matchmaking_public_pages")
      .upsert(basePayload, { onConflict: "matchmaking_id" })
      .select("*")
      .single();
    if (error) throw error;

    if (action === "publish_trainers") {
      const liveUrl = new URL(
        `/api/public/matchmaking/${encodeURIComponent(saved.public_token)}`,
        req.nextUrl.origin,
      );
      const liveResponse = await fetch(liveUrl, { cache: "no-store" });
      const snapshot = await liveResponse.json().catch(() => null);
      if (!liveResponse.ok || !snapshot) {
        throw new Error(snapshot?.error || "Live matchmaking kon niet worden vastgelegd");
      }

      const trainerSnapshot = {
        ...snapshot,
        audience: "trainers",
        bouts: Array.isArray(snapshot.bouts)
          ? snapshot.bouts.map((bout: any) => ({
              ...bout,
              red: bout?.red
                ? { ...bout.red, starred: undefined, inschrijvingId: undefined }
                : bout?.red,
              blue: bout?.blue
                ? { ...bout.blue, starred: undefined, inschrijvingId: undefined }
                : bout?.blue,
            }))
          : [],
        searching: Array.isArray(snapshot.searching)
          ? snapshot.searching.map((fighter: any) => ({
              ...fighter,
              starred: undefined,
              inschrijvingId: undefined,
            }))
          : [],
        event: {
          ...snapshot.event,
          phase: "Gepubliceerde update voor trainers",
          updatedAt: now,
        },
      };

      const { data: published, error: publishError } = await supabaseAdmin
        .from("matchmaking_public_pages")
        .update({
          trainer_snapshot: trainerSnapshot,
          trainer_published_at: now,
          trainer_published_by: user.userId,
          trainer_is_published: true,
          updated_at: now,
        })
        .eq("matchmaking_id", matchmakingId)
        .select("*")
        .single();
      if (publishError) throw publishError;
      return NextResponse.json({ ok: true, publication: published });
    }

    return NextResponse.json({ ok: true, publication: saved });
  } catch (error: any) {
    const message = s(error?.message) || "Deellinks voor matchmaking opslaan mislukt";
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
