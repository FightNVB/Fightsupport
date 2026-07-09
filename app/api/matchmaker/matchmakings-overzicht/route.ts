import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUserWithRole } from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type ControleRun = {
  id: string;
  matchmaking_id: string;
  status: string | null;
  gestart_op: string | null;
  afgerond_op: string | null;
  run_type: string | null;
};

type UploadInfo = {
  id: string;
  matchmaking_id: string;
  raw_filename: string | null;
  controle_status: string | null;
  flow_status: string | null;
  nvb_controle_ingestuurd: boolean | null;
  nvb_controle_ingestuurd_op: string | null;
  uploaded_at: string | null;
  created_at: string | null;
};

function getUserIdFromAuth(auth: any) {
  return String(
    auth?.user?.id ??
      auth?.session?.user?.id ??
      auth?.profile?.id ??
      auth?.id ??
      auth?.userId ??
      "",
  ).trim();
}

function norm(v: unknown) {
  return String(v ?? "").trim();
}

function lower(v: unknown) {
  return norm(v).toLowerCase();
}

function inferTab(row: any): "app" | "uploads" | "retour" {
  const stadium = lower(row?.stadium);
  const status = lower(row?.status);
  const bron = lower(row?.bron_type);

  const isRetour =
    stadium === "retour_naar_eigenaar" ||
    stadium === "retour_naar_matchmaker" ||
    stadium.includes("retour") ||
    status === "retour_naar_eigenaar" ||
    status === "retour_naar_matchmaker" ||
    status.includes("retour");

  if (isRetour) return "retour";

  if (
    bron === "matchmaker_upload" ||
    bron === "admin_upload" ||
    bron === "upload" ||
    bron.includes("upload")
  ) {
    return "uploads";
  }

  return "app";
}

function isRetourRow(row: any) {
  return inferTab(row) === "retour";
}

function isAangebodenAanNvbRow(row: any) {
  if (isRetourRow(row)) return false;

  const stadium = lower(row?.stadium);
  const status = lower(row?.status);
  const finalStatus = lower(row?.final_status);
  const eigenaarType = lower(row?.huidige_eigenaar_type);

  return (
    status === "ingediend_admin" ||
    status === "in_controle_admin" ||
    status === "definitieve_matchmaking_ingediend" ||
    stadium === "ingediend_admin" ||
    stadium === "in_controle_admin" ||
    stadium === "definitieve_matchmaking_ingediend" ||
    finalStatus === "ingediend_admin" ||
    finalStatus === "in_controle_admin" ||
    finalStatus === "definitieve_matchmaking_ingediend" ||
    eigenaarType === "admin" ||
    eigenaarType === "nvb" ||
    eigenaarType === "bondteam"
  );
}

function isMatchmakerVisibleRow(row: any, userId: string) {
  const bronType = lower(row?.bron_type);
  const isArchived = row?.is_archived === true;

  const eigenaarUserId = norm(row?.huidige_eigenaar_user_id);
  const matchmakerId = norm(row?.matchmaker_id);
  const makerUserId = norm(row?.maker_user_id);
  const uploadedBy = norm(row?.uploaded_by);

  const isRetour = isRetourRow(row);
  const isAdminUpload = bronType === "admin_upload";
  const isMatchmakerUpload = bronType === "matchmaker_upload";
  const isAangebodenAanNvb = isAangebodenAanNvbRow(row);

  // Hard filter op gebruiker-id. Rollen kunnen dubbel zijn; de id bepaalt of de
  // matchmaking bij deze matchmaker hoort.
  const hoortBijDezeGebruiker =
    eigenaarUserId === userId ||
    matchmakerId === userId ||
    makerUserId === userId ||
    uploadedBy === userId;

  if (isArchived || !hoortBijDezeGebruiker) return false;

  // Zodra de matchmaking is aangeboden en admin/NVB eigenaar is, verdwijnt hij
  // uit het matchmaker-overzicht. Hij komt pas terug als NVB hem retour zet.
  if (isAangebodenAanNvb && !isRetour) return false;

  // Matchmaker-upload herkennen we voortaan op bron_type.
  // huidige_eigenaar_type blijft "matchmaker" vanwege de database-check constraint.
  if (isMatchmakerUpload) return true;

  // Admin uploads blijven normaal uit het matchmaker-overzicht, behalve als NVB hem
  // expliciet retour heeft gezet naar deze matchmaker.
  if (isAdminUpload && !isRetour) return false;

  return true;
}

export async function GET(req: Request) {
  try {
    const auth = await requireUserWithRole(req, [
      "matchmaker",
      "admin",
      "superadmin",
    ]);

    const userId = getUserIdFromAuth(auth);

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Geen geldige gebruiker gevonden." },
        { status: 401 },
      );
    }

    const profile = auth.profile;

    const { data: matchmakingsRaw, error } = await supabaseAdmin
      .from("matchmakings")
      .select(
        `
        id,
        naam,
        datum,
        locatie,
        promotor,
        bondteam,
        bron_type,
        stadium,
        status,
        final_status,
        huidige_eigenaar_type,
        huidige_eigenaar_user_id,
        huidige_eigenaar_bondteam,
        created_at,
        last_updated_at,
        last_updated_by,
        submitted_to_admin_at,
        entered_control_at,
        sent_to_officials_at,
        entered_weegstation_at,
        ready_for_results_at,
        results_finalized_at,
        is_actief,
        locked_for_editing,
        is_archived,
        matchmaker_id,
        maker_type,
        maker_user_id,
        matchmaker_naam,
        uploaded_by,
        hoofdofficial_id
      `,
      )
      .eq("is_archived", false)
      .order("datum", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "[matchmaker/matchmakings-overzicht] matchmakings error:",
        error,
      );
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    const matchmakings = (matchmakingsRaw ?? []).filter((row: any) =>
      isMatchmakerVisibleRow(row, userId),
    );

    const matchmakingIds = matchmakings
      .map((r: any) => norm(r.id))
      .filter(Boolean);

    const { data: runs, error: runsError } = matchmakingIds.length
      ? await supabaseAdmin
          .from("controle_runs")
          .select(
            "id, matchmaking_id, status, gestart_op, afgerond_op, run_type",
          )
          .in("matchmaking_id", matchmakingIds)
      : { data: [] as any[], error: null as any };

    if (runsError) {
      console.error(
        "[matchmaker/matchmakings-overzicht] controle_runs error:",
        runsError,
      );
    }

    const latestRunMap = new Map<string, ControleRun>();

    for (const run of runs ?? []) {
      const mmId = norm(run.matchmaking_id);
      if (!mmId) continue;

      const existing = latestRunMap.get(mmId);
      const runTime = new Date(run.gestart_op ?? 0).getTime();
      const existingTime = new Date(existing?.gestart_op ?? 0).getTime();

      if (!existing || runTime > existingTime) {
        latestRunMap.set(mmId, {
          id: String(run.id),
          matchmaking_id: mmId,
          status: run.status ?? null,
          gestart_op: run.gestart_op ?? null,
          afgerond_op: run.afgerond_op ?? null,
          run_type: run.run_type ?? null,
        });
      }
    }

    const { data: uploads, error: uploadsError } = matchmakingIds.length
      ? await supabaseAdmin
          .from("matchmaking_uploads")
          .select(
            "id, matchmaking_id, raw_filename, controle_status, flow_status, nvb_controle_ingestuurd, nvb_controle_ingestuurd_op, uploaded_at, created_at",
          )
          .in("matchmaking_id", matchmakingIds)
      : { data: [] as any[], error: null as any };

    if (uploadsError) {
      console.error(
        "[matchmaker/matchmakings-overzicht] matchmaking_uploads error:",
        uploadsError,
      );
    }

    const latestUploadMap = new Map<string, UploadInfo>();

    for (const upload of uploads ?? []) {
      const mmId = norm(upload.matchmaking_id);
      if (!mmId) continue;

      const existing = latestUploadMap.get(mmId);
      const uploadTime = new Date(
        upload.uploaded_at ?? upload.created_at ?? 0,
      ).getTime();
      const existingTime = new Date(
        existing?.uploaded_at ?? existing?.created_at ?? 0,
      ).getTime();

      if (!existing || uploadTime > existingTime) {
        latestUploadMap.set(mmId, {
          id: String(upload.id),
          matchmaking_id: mmId,
          raw_filename: upload.raw_filename ?? null,
          controle_status: upload.controle_status ?? null,
          flow_status: upload.flow_status ?? null,
          nvb_controle_ingestuurd: upload.nvb_controle_ingestuurd ?? null,
          nvb_controle_ingestuurd_op: upload.nvb_controle_ingestuurd_op ?? null,
          uploaded_at: upload.uploaded_at ?? null,
          created_at: upload.created_at ?? null,
        });
      }
    }

    const rows = matchmakings.map((r: any) => ({
      id: String(r.id),
      naam: r.naam ?? null,
      datum: r.datum ?? null,
      locatie: r.locatie ?? null,
      promotor: r.promotor ?? null,
      bondteam: r.bondteam ?? null,

      bron_type: r.bron_type ?? null,
      stadium: r.stadium ?? null,
      status: r.status ?? null,
      final_status: r.final_status ?? null,

      huidige_eigenaar_type: r.huidige_eigenaar_type ?? null,
      huidige_eigenaar_user_id: r.huidige_eigenaar_user_id ?? null,
      huidige_eigenaar_bondteam: r.huidige_eigenaar_bondteam ?? null,

      created_at: r.created_at ?? null,
      last_updated_at: r.last_updated_at ?? null,
      last_updated_by: r.last_updated_by ?? null,

      submitted_to_admin_at: r.submitted_to_admin_at ?? null,
      entered_control_at: r.entered_control_at ?? null,
      sent_to_officials_at: r.sent_to_officials_at ?? null,
      entered_weegstation_at: r.entered_weegstation_at ?? null,
      ready_for_results_at: r.ready_for_results_at ?? null,
      results_finalized_at: r.results_finalized_at ?? null,

      is_actief: r.is_actief ?? true,
      locked_for_editing: r.locked_for_editing ?? false,
      is_archived: r.is_archived ?? false,

      matchmaker_id: r.matchmaker_id ?? null,
      maker_type: r.maker_type ?? null,
      maker_user_id: r.maker_user_id ?? null,
      matchmaker_naam: r.matchmaker_naam ?? null,
      uploaded_by: r.uploaded_by ?? null,
      hoofdofficial_id: r.hoofdofficial_id ?? null,

      tab: inferTab(r),
      laatste_run: latestRunMap.get(String(r.id)) ?? null,

      upload_id: latestUploadMap.get(String(r.id))?.id ?? null,
      upload_raw_filename:
        latestUploadMap.get(String(r.id))?.raw_filename ?? null,
      controle_status:
        latestUploadMap.get(String(r.id))?.controle_status ?? null,
      upload_flow_status:
        latestUploadMap.get(String(r.id))?.flow_status ?? null,
      nvb_controle_ingestuurd:
        latestUploadMap.get(String(r.id))?.nvb_controle_ingestuurd ?? false,
      nvb_controle_ingestuurd_op:
        latestUploadMap.get(String(r.id))?.nvb_controle_ingestuurd_op ?? null,
      upload_uploaded_at:
        latestUploadMap.get(String(r.id))?.uploaded_at ?? null,
    }));

    return NextResponse.json({
      ok: true,
      user_id: userId,
      full_name: profile?.full_name ?? null,
      rows,
    });
  } catch (e: any) {
    console.error("[matchmaker/matchmakings-overzicht] unexpected:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Onverwachte fout" },
      { status: 500 },
    );
  }
}
