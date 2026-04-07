import { createClient } from "@supabase/supabase-js";

export const supabaseAdminLifecycle = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type MatchmakingOwnerType = "matchmaker" | "admin" | "bondteam" | "archief";
export type MatchmakingStage =
  | "concept_matchmaking"
  | "ingediend_admin"
  | "in_controle_admin"
  | "retour_naar_eigenaar"
  | "klaar_voor_weegstation"
  | "in_weegstation"
  | "weegstation_verwerkt"
  | "definitieve_matchmaking_ingediend"
  | "klaar_voor_uitslagen"
  | "uitslagen_in_bewerking"
  | "uitslagen_definitief"
  | "gearchiveerd";

export type EnsureLifecycleInput = {
  matchmakingId: string;
  naam?: string | null;
  datum?: string | null;
  locatie?: string | null;
  promotorId?: string | null;
  matchmakerId?: string | null;
  eventId?: string | null;
  bronType?: string | null;
  stage?: MatchmakingStage | null;
  ownerType?: MatchmakingOwnerType | null;
  ownerUserId?: string | null;
  ownerBondteam?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  metadata?: Record<string, any> | null;
};

function s(v: unknown): string | null {
  const x = String(v ?? "").trim();
  return x || null;
}

function cleanMeta(v: Record<string, any> | null | undefined) {
  return v && typeof v === "object" ? v : {};
}

export async function logMatchmakingFlow(input: {
  matchmakingId: string;
  actieType: string;
  vanStadium?: string | null;
  naarStadium?: string | null;
  vanEigenaarType?: string | null;
  naarEigenaarType?: string | null;
  vanEigenaarUserId?: string | null;
  naarEigenaarUserId?: string | null;
  vanEigenaarBondteam?: string | null;
  naarEigenaarBondteam?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  opmerking?: string | null;
  metadata?: Record<string, any> | null;
}) {
  const payload = {
    matchmaking_id: input.matchmakingId,
    actie_type: input.actieType,
    van_stadium: input.vanStadium ?? null,
    naar_stadium: input.naarStadium ?? null,
    van_eigenaar_type: input.vanEigenaarType ?? null,
    naar_eigenaar_type: input.naarEigenaarType ?? null,
    van_eigenaar_user_id: input.vanEigenaarUserId ?? null,
    naar_eigenaar_user_id: input.naarEigenaarUserId ?? null,
    van_eigenaar_bondteam: input.vanEigenaarBondteam ?? null,
    naar_eigenaar_bondteam: input.naarEigenaarBondteam ?? null,
    actor_user_id: input.actorUserId ?? null,
    actor_role: input.actorRole ?? null,
    opmerking: input.opmerking ?? null,
    metadata: cleanMeta(input.metadata),
  };

  const { error } = await supabaseAdminLifecycle
    .from("matchmaking_flow_log")
    .insert(payload);

  if (error) {
    console.error("[logMatchmakingFlow]", error);
    throw error;
  }
}

export async function ensureLifecycleRecord(input: EnsureLifecycleInput) {
  const existingRes = await supabaseAdminLifecycle
    .from("matchmakings")
    .select("*")
    .eq("id", input.matchmakingId)
    .maybeSingle();

  if (existingRes.error) throw existingRes.error;

  const nowIso = new Date().toISOString();
  const patch = {
    naam: s(input.naam),
    datum: s(input.datum),
    locatie: s(input.locatie),
    promotor_id: s(input.promotorId),
    matchmaker_id: s(input.matchmakerId),
    event_id: s(input.eventId),
    bron_type: s(input.bronType),
    stadium: s(input.stage),
    status: s(input.stage) ?? "concept",
    huidige_eigenaar_type: s(input.ownerType),
    huidige_eigenaar_user_id: input.ownerType === "matchmaker" ? s(input.ownerUserId) : null,
    huidige_eigenaar_bondteam: input.ownerType === "bondteam" ? s(input.ownerBondteam) : null,
    is_actief: true,
    is_archived: false,
    last_updated_at: nowIso,
    last_updated_by: s(input.actorUserId),
  } as Record<string, any>;

  if (existingRes.data?.id) {
    const { data, error } = await supabaseAdminLifecycle
      .from("matchmakings")
      .update(patch)
      .eq("id", input.matchmakingId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  const insertPayload = {
    id: input.matchmakingId,
    created_at: nowIso,
    ...patch,
  };

  const { data, error } = await supabaseAdminLifecycle
    .from("matchmakings")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw error;

  await logMatchmakingFlow({
    matchmakingId: input.matchmakingId,
    actieType: "created",
    naarStadium: patch.stadium,
    naarEigenaarType: patch.huidige_eigenaar_type,
    naarEigenaarUserId: patch.huidige_eigenaar_user_id,
    naarEigenaarBondteam: patch.huidige_eigenaar_bondteam,
    actorUserId: s(input.actorUserId),
    actorRole: s(input.actorRole),
    opmerking: "Lifecycle-record aangemaakt",
    metadata: cleanMeta(input.metadata),
  });

  return data;
}

export async function transferLifecycle(input: {
  matchmakingId: string;
  newStage: MatchmakingStage;
  newOwnerType: MatchmakingOwnerType;
  newOwnerUserId?: string | null;
  newOwnerBondteam?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  opmerking?: string | null;
  metadata?: Record<string, any> | null;
}) {
  const { data: current, error: currentErr } = await supabaseAdminLifecycle
    .from("matchmakings")
    .select("*")
    .eq("id", input.matchmakingId)
    .single();

  if (currentErr) throw currentErr;

  const nowIso = new Date().toISOString();
  const patch: Record<string, any> = {
    stadium: input.newStage,
    status: input.newStage,
    huidige_eigenaar_type: input.newOwnerType,
    huidige_eigenaar_user_id: input.newOwnerType === "matchmaker" ? s(input.newOwnerUserId) : null,
    huidige_eigenaar_bondteam: input.newOwnerType === "bondteam" ? s(input.newOwnerBondteam) : null,
    last_updated_at: nowIso,
    last_updated_by: s(input.actorUserId),
    last_received_at: nowIso,
    last_received_by: s(input.actorUserId),
  };

  if (["ingediend_admin", "klaar_voor_weegstation", "definitieve_matchmaking_ingediend", "klaar_voor_uitslagen"].includes(input.newStage)) {
    patch.sent_at = nowIso;
    patch.sent_by = s(input.actorUserId);
  }
  if (input.newStage === "retour_naar_eigenaar") {
    patch.returned_at = nowIso;
    patch.returned_by = s(input.actorUserId);
    patch.return_reason = s(input.opmerking);
  }
  if (input.newStage === "in_controle_admin") patch.entered_control_at = nowIso;
  if (input.newStage === "klaar_voor_weegstation") patch.sent_to_officials_at = nowIso;
  if (input.newStage === "in_weegstation") patch.entered_weegstation_at = nowIso;
  if (input.newStage === "weegstation_verwerkt") patch.weegstation_processed_at = nowIso;
  if (input.newStage === "definitieve_matchmaking_ingediend") patch.definitive_version_submitted_at = nowIso;
  if (input.newStage === "klaar_voor_uitslagen") patch.ready_for_results_at = nowIso;
  if (input.newStage === "uitslagen_definitief") patch.results_finalized_at = nowIso;
  if (input.newStage === "gearchiveerd") {
    patch.archived_at = nowIso;
    patch.is_archived = true;
    patch.is_actief = false;
  }

  const { data, error } = await supabaseAdminLifecycle
    .from("matchmakings")
    .update(patch)
    .eq("id", input.matchmakingId)
    .select("*")
    .single();

  if (error) throw error;

  await logMatchmakingFlow({
    matchmakingId: input.matchmakingId,
    actieType: input.newStage === "retour_naar_eigenaar" ? "returned" : "sent",
    vanStadium: current.stadium ?? null,
    naarStadium: input.newStage,
    vanEigenaarType: current.huidige_eigenaar_type ?? null,
    naarEigenaarType: input.newOwnerType,
    vanEigenaarUserId: current.huidige_eigenaar_user_id ?? null,
    naarEigenaarUserId: input.newOwnerType === "matchmaker" ? s(input.newOwnerUserId) : null,
    vanEigenaarBondteam: current.huidige_eigenaar_bondteam ?? null,
    naarEigenaarBondteam: input.newOwnerType === "bondteam" ? s(input.newOwnerBondteam) : null,
    actorUserId: s(input.actorUserId),
    actorRole: s(input.actorRole),
    opmerking: input.opmerking ?? null,
    metadata: cleanMeta(input.metadata),
  });

  return data;
}
