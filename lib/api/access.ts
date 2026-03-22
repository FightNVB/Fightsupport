// lib/api/access.ts
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export async function assertCanAccessMatchmaking(
  userId: string,
  role: string,
  matchmakingId: string
) {
  const roleName = norm(role);

  // Admin / Superadmin mogen alles
  if (
    roleName === "admin" ||
    roleName === "administrator" ||
    roleName === "superadmin" ||
    roleName === "super_admin"
  ) {
    return;
  }

  const { data: upload, error } = await supabaseAdmin
    .from("matchmaking_uploads")
    .select("id, matchmaking_id, uploaded_by, event_id")
    .eq("matchmaking_id", matchmakingId)
    .maybeSingle();

  if (error || !upload) {
    throw new Error("MATCHMAKING_NOT_FOUND");
  }

  // Matchmaker: alleen eigen uploads
  if (roleName === "matchmaker") {
    if (upload.uploaded_by !== userId) {
      throw new Error("FORBIDDEN_MATCHMAKER");
    }
    return;
  }

  // Official / Hoofdofficial: alleen als hij hoofdofficial is van event
  if (roleName === "official" || roleName === "hoofdofficial") {
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

  throw new Error("FORBIDDEN_ROLE");
}
