import { createClient } from "@supabase/supabase-js";
import {
  MatchmakingOwnerType as BaseMatchmakingOwnerType,
  MatchmakingStage,
  getOwnerTypeForStage,
} from "@/lib/matchmakingLifecycleConfig";

export type MatchmakingOwnerType = BaseMatchmakingOwnerType | "matchmaker_upload";

export const supabaseAdminLifecycle = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type EnsureLifecycleInput = {
  matchmakingId: string;
  naam?: string | null;
  datum?: string | null;
  locatie?: string | null;
  promotorId?: string | null;
  matchmakerId?: string | null;
  makerType?:
    | "matchmaker"
    | "matchmaker_upload"
    | "admin"
    | "superadmin"
    | "official"
    | "hoofdofficial"
    | null;
  makerUserId?: string | null;
  bondteam?: string | null;
  eventId?: string | null;
  bronType?: string | null;
  stage?: MatchmakingStage | null;
  ownerType?: MatchmakingOwnerType | null;
  ownerUserId?: string | null;
  ownerBondteam?: string | null;
  previousOwnerType?: MatchmakingOwnerType | null;
  previousOwnerUserId?: string | null;
  previousOwnerBondteam?: string | null;
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

function ownerFieldsForStage(input: {
  stage: MatchmakingStage;
  ownerType?: MatchmakingOwnerType | null;
  ownerUserId?: string | null;
  ownerBondteam?: string | null;
  matchmakerId?: string | null;
  bondteam?: string | null;
}) {
  const resolvedOwnerType = input.ownerType ?? getOwnerTypeForStage(input.stage);
  const matchmakerUserId = s(input.matchmakerId ?? input.ownerUserId);
  const adminUserId = s(input.ownerUserId);

  let huidige_eigenaar_user_id: string | null = null;
  if (
    resolvedOwnerType === "matchmaker" ||
    resolvedOwnerType === "matchmaker_upload"
  ) {
    huidige_eigenaar_user_id = matchmakerUserId;
  } else if (resolvedOwnerType === "admin") {
    huidige_eigenaar_user_id = adminUserId;
  }

  return {
    huidige_eigenaar_type: resolvedOwnerType,
    huidige_eigenaar_user_id,
    huidige_eigenaar_bondteam:
      resolvedOwnerType === "bondteam"
        ? s(input.ownerBondteam ?? input.bondteam)
        : null,
  };
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

  /*
   * BELANGRIJK:
   * - Bij een BESTAANDE matchmaking betekent `undefined`: NIET AANRAKEN.
   * - Alleen expliciet meegegeven velden worden bijgewerkt.
   * - Expliciet `null` mag een veld wel leegmaken.
   *
   * Dit voorkomt dat ensureLifecycleRecord bestaande masterdata zoals
   * bondteam, event_id, matchmaker_id, naam, datum enz. per ongeluk op NULL zet.
   */
  if (existingRes.data?.id) {
    const current = existingRes.data as Record<string, any>;
    const patch: Record<string, any> = {
      last_updated_at: nowIso,
      last_updated_by: s(input.actorUserId),
    };

    if (input.naam !== undefined) patch.naam = s(input.naam);
    if (input.datum !== undefined) patch.datum = s(input.datum);
    if (input.locatie !== undefined) patch.locatie = s(input.locatie);
    if (input.promotorId !== undefined) patch.promotor_id = s(input.promotorId);

    if (input.matchmakerId !== undefined || input.makerUserId !== undefined) {
      patch.matchmaker_id = s(input.matchmakerId ?? input.makerUserId);
    }

    if (input.makerType !== undefined) {
      patch.maker_type = s(input.makerType);
    }

    if (input.makerUserId !== undefined || input.matchmakerId !== undefined) {
      patch.maker_user_id = s(input.makerUserId ?? input.matchmakerId);
    }

    if (input.bondteam !== undefined) {
      patch.bondteam = s(input.bondteam);
    }

    if (input.eventId !== undefined) {
      patch.event_id = s(input.eventId);
    }

    if (input.bronType !== undefined) {
      patch.bron_type = s(input.bronType);
    }

    if (input.stage !== undefined && input.stage !== null) {
      patch.stadium = s(input.stage);
      patch.status = s(input.stage);
    }

    const shouldUpdateOwner =
      input.stage !== undefined ||
      input.ownerType !== undefined ||
      input.ownerUserId !== undefined ||
      input.ownerBondteam !== undefined ||
      input.matchmakerId !== undefined ||
      input.bondteam !== undefined;

    if (shouldUpdateOwner) {
      const effectiveStage =
        (input.stage ??
          current.stadium ??
          current.status ??
          "concept_matchmaking") as MatchmakingStage;

      const ownerPatch = ownerFieldsForStage({
        stage: effectiveStage,
        ownerType:
          input.ownerType !== undefined
            ? input.ownerType
            : (current.huidige_eigenaar_type as MatchmakingOwnerType | null),
        ownerUserId:
          input.ownerUserId !== undefined
            ? input.ownerUserId
            : current.huidige_eigenaar_user_id,
        ownerBondteam:
          input.ownerBondteam !== undefined
            ? input.ownerBondteam
            : current.huidige_eigenaar_bondteam,
        matchmakerId:
          input.matchmakerId !== undefined || input.makerUserId !== undefined
            ? s(input.matchmakerId ?? input.makerUserId)
            : s(current.matchmaker_id ?? current.maker_user_id),
        bondteam:
          input.bondteam !== undefined ? input.bondteam : current.bondteam,
      });

      Object.assign(patch, ownerPatch);
    }

    if (input.previousOwnerType !== undefined) {
      patch.vorige_eigenaar_type = s(input.previousOwnerType);

      if (
        input.previousOwnerType === "matchmaker" ||
        input.previousOwnerType === "matchmaker_upload" ||
        input.previousOwnerType === "admin"
      ) {
        patch.vorige_eigenaar_user_id = s(input.previousOwnerUserId);
        patch.vorige_eigenaar_bondteam = null;
      } else if (input.previousOwnerType === "bondteam") {
        patch.vorige_eigenaar_user_id = null;
        patch.vorige_eigenaar_bondteam = s(input.previousOwnerBondteam);
      } else {
        patch.vorige_eigenaar_user_id = null;
        patch.vorige_eigenaar_bondteam = null;
      }
    } else {
      if (input.previousOwnerUserId !== undefined) {
        patch.vorige_eigenaar_user_id = s(input.previousOwnerUserId);
      }
      if (input.previousOwnerBondteam !== undefined) {
        patch.vorige_eigenaar_bondteam = s(input.previousOwnerBondteam);
      }
    }

    const { data, error } = await supabaseAdminLifecycle
      .from("matchmakings")
      .update(patch)
      .eq("id", input.matchmakingId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  // Nieuwe matchmaking/lifecycle-row: hier mogen defaults wél worden gezet.
  const stage = input.stage ?? "concept_matchmaking";
  const resolvedMatchmakerId = s(input.matchmakerId ?? input.makerUserId);

  const ownerPatch = ownerFieldsForStage({
    stage,
    ownerType: input.ownerType,
    ownerUserId: input.ownerUserId,
    ownerBondteam: input.ownerBondteam,
    matchmakerId: resolvedMatchmakerId,
    bondteam: input.bondteam ?? null,
  });

  const insertPayload = {
    id: input.matchmakingId,
    created_at: nowIso,
    naam: s(input.naam),
    datum: s(input.datum),
    locatie: s(input.locatie),
    promotor_id: s(input.promotorId),
    matchmaker_id: resolvedMatchmakerId,
    maker_type: s(input.makerType ?? "matchmaker"),
    maker_user_id: s(input.makerUserId ?? input.matchmakerId),
    bondteam: s(input.bondteam),
    event_id: s(input.eventId),
    bron_type: s(input.bronType),
    stadium: s(stage),
    status: s(stage),
    ...ownerPatch,
    vorige_eigenaar_type: s(input.previousOwnerType),
    vorige_eigenaar_user_id:
      input.previousOwnerType === "matchmaker" ||
      input.previousOwnerType === "matchmaker_upload" ||
      input.previousOwnerType === "admin"
        ? s(input.previousOwnerUserId)
        : null,
    vorige_eigenaar_bondteam:
      input.previousOwnerType === "bondteam"
        ? s(input.previousOwnerBondteam)
        : null,
    is_actief: true,
    is_archived: false,
    last_updated_at: nowIso,
    last_updated_by: s(input.actorUserId),
  } as Record<string, any>;

  const { data, error } = await supabaseAdminLifecycle
    .from("matchmakings")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw error;

  await logMatchmakingFlow({
    matchmakingId: input.matchmakingId,
    actieType: "created",
    naarStadium: insertPayload.stadium,
    naarEigenaarType: insertPayload.huidige_eigenaar_type,
    naarEigenaarUserId: insertPayload.huidige_eigenaar_user_id,
    naarEigenaarBondteam: insertPayload.huidige_eigenaar_bondteam,
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
  newOwnerType?: MatchmakingOwnerType | null;
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
  const resolvedOwnerType =
    input.newOwnerType ?? getOwnerTypeForStage(input.newStage);

  const ownerPatch = ownerFieldsForStage({
    stage: input.newStage,
    ownerType: resolvedOwnerType,
    ownerUserId:
      resolvedOwnerType === "matchmaker" ||
      resolvedOwnerType === "matchmaker_upload"
        ? s(
            current.maker_user_id ??
              current.matchmaker_id ??
              input.newOwnerUserId,
          )
        : resolvedOwnerType === "admin"
        ? s(input.newOwnerUserId ?? input.actorUserId)
        : s(input.newOwnerUserId),
    ownerBondteam: input.newOwnerBondteam ?? current.bondteam ?? null,
    matchmakerId: s(current.maker_user_id ?? current.matchmaker_id ?? null),
    bondteam: s(current.bondteam ?? null),
  });

  const patch: Record<string, any> = {
    stadium: input.newStage,
    status: input.newStage,
    vorige_eigenaar_type: current.huidige_eigenaar_type ?? null,
    vorige_eigenaar_user_id: current.huidige_eigenaar_user_id ?? null,
    vorige_eigenaar_bondteam: current.huidige_eigenaar_bondteam ?? null,
    ...ownerPatch,
    last_updated_at: nowIso,
    last_updated_by: s(input.actorUserId),
    last_received_at: nowIso,
    last_received_by: s(input.actorUserId),
  };

  if (input.newStage === "ingediend_admin") {
    patch.submitted_to_admin_at = nowIso;
    patch.sent_at = nowIso;
    patch.sent_by = s(input.actorUserId);
  }

  if (input.newStage === "in_controle_admin") {
    patch.entered_control_at = nowIso;
  }

  if (input.newStage === "review") {
    patch.returned_at = nowIso;
    patch.returned_by = s(input.actorUserId);
    patch.return_reason = s(input.opmerking);
    patch.locked_for_editing = false;
  }

  if (input.newStage === "klaar_voor_weegstation" || String(input.newStage) === "naar-weegstation") {
    patch.stadium = "naar-weegstation";
    patch.status = "naar-weegstation";
    patch.sent_at = nowIso;
    patch.sent_by = s(input.actorUserId);
    patch.sent_to_officials_at = nowIso;
  }

  if (input.newStage === "in_officials") {
    patch.sent_to_officials_at = nowIso;
  }

  if (input.newStage === "in_weegstation") {
    patch.entered_weegstation_at = nowIso;
  }

  if (input.newStage === "weegstation_verwerkt") {
    patch.weegstation_processed_at = nowIso;
  }

  if (input.newStage === "definitieve_lineup") {
    patch.definitive_version_submitted_at = nowIso;
    patch.locked_for_editing = true;
  }

  if (input.newStage === "klaar_voor_uitslagen") {
    patch.ready_for_results_at = nowIso;
    patch.locked_for_editing = true;
  }

  if (input.newStage === "uitslagen_in_bewerking") {
    patch.locked_for_editing = true;
  }

  if (input.newStage === "uitslagen_definitief") {
    patch.results_finalized_at = nowIso;
    patch.locked_for_editing = true;
  }

  if (input.newStage === "gearchiveerd") {
    patch.archived_at = nowIso;
    patch.is_archived = true;
    patch.is_actief = false;
    patch.locked_for_editing = true;
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
    actieType: input.newStage === "review" ? "returned" : "sent",
    vanStadium: current.stadium ?? null,
    naarStadium: input.newStage,
    vanEigenaarType: current.huidige_eigenaar_type ?? null,
    naarEigenaarType: data.huidige_eigenaar_type ?? null,
    vanEigenaarUserId: current.huidige_eigenaar_user_id ?? null,
    naarEigenaarUserId: data.huidige_eigenaar_user_id ?? null,
    vanEigenaarBondteam: current.huidige_eigenaar_bondteam ?? null,
    naarEigenaarBondteam: data.huidige_eigenaar_bondteam ?? null,
    actorUserId: s(input.actorUserId),
    actorRole: s(input.actorRole),
    opmerking: input.opmerking ?? null,
    metadata: cleanMeta(input.metadata),
  });

  return data;
}
