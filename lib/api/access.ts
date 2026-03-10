// lib/api/access.ts
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function assertCanAccessMatchmaking(
  userId: string,
  role: string,
  matchmakingId: string
) {
  // Admin / Superadmin mogen alles
  if (role === "Admin" || role === "Superadmin") {
    return;
  }

  const { data: upload, error } = await supabaseAdmin
    .from("matchmaking_uploads")
    .select("uploaded_by, event_id")
    .eq("id", matchmakingId)
    .maybeSingle();

  if (error || !upload) {
    throw new Error("MATCHMAKING_NOT_FOUND");
  }

  // Matchmaker: alleen eigen uploads
  if (role === "Matchmaker") {
    if (upload.uploaded_by !== userId) {
      throw new Error("FORBIDDEN_MATCHMAKER");
    }
    return;
  }

  // Official / Hoofdofficial: alleen als hij hoofdofficial is van event
  if (role === "Official" || role === "Hoofdofficial") {
    if (!upload.event_id) {
      throw new Error("FORBIDDEN_NO_EVENT");
    }

    const { data: event, error: evErr } = await supabaseAdmin
      .from("events")
      .select("hoofdofficial_id")
      .eq("id", upload.event_id)
      .maybeSingle();

    if (evErr || !event) {
      throw new Error("EVENT_NOT_FOUND");
    }

    if (event.hoofdofficial_id !== userId) {
      throw new Error("FORBIDDEN_NOT_HOOFDOFFICIAL");
    }

    return;
  }

  // Alles wat hier komt: geen toegang
  throw new Error("FORBIDDEN_ROLE");
}