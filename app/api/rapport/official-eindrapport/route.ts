// app/api/rapport/official-eindrapport/route.ts
import { createClient } from "@supabase/supabase-js";
import { privateJson, requireMatchmakingAccess, secureError } from "@/lib/api/secureRoute";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function isAdminOfficialReportRequest(req: Request) {
  const referer = String(req.headers.get("referer") ?? "").trim();
  if (!referer) return false;

  try {
    const pathname = new URL(referer).pathname;
    return /^\/dashboard\/admin\/controle\/[^/]+\/official-rapport\/?$/.test(pathname);
  } catch {
    return false;
  }
}

function norm(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function va(v: any) {
  return String(v ?? "").replace(/\D/g, "").trim();
}

function activeResult(row: any) {
  const result = norm(row?.resultaat);
  const review = norm(row?.review_status);
  if (["approved", "accepted", "goedgekeurd", "akkoord", "resolved", "afgehandeld", "closed"].includes(review)) return false;
  if (result === "ok" || result === "info") return false;
  return true;
}

function buildAdminFighterActueel(ctxRows: any[], tournamentRows: any[], resultRows: any[]) {
  const byVa = new Map<string, any>();
  const partySideToVa = new Map<string, string>();

  const add = (vaRaw: any, data: any) => {
    const key = va(vaRaw);
    if (!key) return;
    const prev = byVa.get(key) ?? {
      va_nummer: key,
      licentie_ok: true,
      startverbod_actief: false,
      keurmerk_ok: true,
      sportschool: null,
      land: null,
      error_message: null,
    };
    byVa.set(key, { ...prev, ...data, va_nummer: key });
  };

  for (const row of ctxRows ?? []) {
    const partij = Number(row?.partij_nr);
    for (const side of ["rood", "blauw"] as const) {
      const key = va(
        row?.[`${side}_va_mm`] ??
          row?.[`${side}_va_fp`] ??
          row?.[`va_${side}`] ??
          row?.[`${side}_va`] ??
          row?.[`${side}_fighter_id`],
      );
      if (!key) continue;

      if (Number.isFinite(partij) && partij > 0) {
        partySideToVa.set(`${partij}|${side}`, key);
      }

      const reason = String(row?.[side === "rood" ? "keurmerk_reden_rood" : "keurmerk_reden_blauw"] ?? "");
      const landMatch = reason.match(/\((?:[^,()]+,\s*)?([^()]+)\)/);
      add(key, {
        sportschool:
          row?.[`${side}_gym_mm`] ??
          row?.[`${side}_sportschool_mm`] ??
          row?.[`${side}_gym_fp`] ??
          row?.[`${side}_gym`] ??
          null,
        land: landMatch?.[1]?.trim() || row?.[`${side}_land_fp`] || row?.[`${side}_land`] || null,
      });
    }
  }

  for (const row of tournamentRows ?? []) {
    const key = va(row?.va_nummer ?? row?.fighter_id);
    if (!key) continue;
    add(key, {
      sportschool: row?.sportschool_mm ?? row?.sportschool ?? null,
      land: row?.land ?? null,
    });
  }

  for (const result of (resultRows ?? []).filter(activeResult)) {
    let key = va(result?.fighter_id ?? result?.toernooi_va_nummer ?? result?.va_nummer);
    if (!key && Number(result?.partij_nr) > 0 && (result?.hoek === "rood" || result?.hoek === "blauw")) {
      key = partySideToVa.get(`${Number(result.partij_nr)}|${result.hoek}`) ?? "";
    }
    if (!key) continue;

    const current = byVa.get(key);
    if (!current) continue;

    const code = String(result?.rule_code ?? result?.rule ?? "").toUpperCase();
    if (code.includes("LICENT")) current.licentie_ok = false;
    if (code.includes("STARTVERBOD")) current.startverbod_actief = true;
    if (code.includes("KEURMERK") || code.includes("SPORTSCHOOL_NIET_GEVONDEN")) current.keurmerk_ok = false;
  }

  return Array.from(byVa.values());
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const matchmakingId = String(url.searchParams.get("matchmaking_id") ?? "").trim();
    if (!matchmakingId) {
      return privateJson({ ok: false, error: "matchmaking_id ontbreekt" }, 400);
    }

    await requireMatchmakingAccess(req, matchmakingId);

    const adminReport = isAdminOfficialReportRequest(req);

    let runQuery = supabase
      .from("controle_runs")
      .select("*")
      .eq("matchmaking_id", matchmakingId);

    // Admin Eindrapport hoort uitsluitend bij de laatste afgeronde volledige admincontrole.
    if (adminReport) {
      runQuery = runQuery
        .eq("run_type", "control-engine-admin-total")
        .eq("status", "klaar");
    }

    const { data: runRows, error: runErr } = await runQuery
      .order("gestart_op", { ascending: false })
      .limit(1);
    if (runErr) throw runErr;

    const run = runRows?.[0] ?? null;
    if (!run?.id) {
      return privateJson(
        {
          ok: false,
          error: adminReport
            ? "Nog geen afgeronde admincontrole gevonden. Draai eerst de admincontrole."
            : "Geen controlerun gevonden.",
        },
        404,
      );
    }

    const [eventQ, ctxQ, tournamentQ, currentQ, resultQ, dispQ] = await Promise.all([
      supabase
        .from("matchmakings")
        .select("id,naam,datum,locatie,promotor,matchmaker_naam,matchmaker_id,maker_user_id,uploaded_by,bondteam,aantal_uren")
        .eq("id", matchmakingId)
        .maybeSingle(),
      supabase
        .from("controle_bout_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("controle_run_id", run.id)
        .order("partij_nr", { ascending: true }),
      supabase
        .from("controle_toernooi_context")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("controle_run_id", run.id),
      supabase
        .from("controle_fighter_actueel")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("controle_run_id", run.id),
      supabase
        .from("controle_resultaten")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("controle_run_id", run.id),
      supabase
        .from("dispensatie_requests")
        .select("*")
        .eq("matchmaking_id", matchmakingId),
    ]);

    for (const q of [eventQ, ctxQ, tournamentQ, currentQ, resultQ, dispQ]) {
      if (q.error) throw q.error;
    }

    const event = eventQ.data ? { ...eventQ.data } : null;

    if (event && !String(event.matchmaker_naam ?? "").trim()) {
      const profileId = String(
        event.matchmaker_id ?? event.maker_user_id ?? event.uploaded_by ?? "",
      ).trim();

      if (profileId) {
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("id,full_name")
          .eq("id", profileId)
          .maybeSingle();

        if (profileError) throw profileError;
        if (String(profile?.full_name ?? "").trim()) {
          event.matchmaker_naam = String(profile?.full_name).trim();
        }
      }
    }

    // Voor Admin is rulesEngine/controle_resultaten de waarheid. De gedeelde
    // rapport-UI verwacht nog fighter_actueel; daarom leveren we voor Admin een
    // compatibele projectie op basis van dezelfde controle_resultaten en context.
    // Official/Matchmaker houden hun eigen live fighter_actueel-gedrag.
    const fighterActueel = adminReport
      ? buildAdminFighterActueel(ctxQ.data ?? [], tournamentQ.data ?? [], resultQ.data ?? [])
      : currentQ.data ?? [];

    return privateJson({
      ok: true,
      report_role: adminReport ? "admin" : "official",
      matchmaking_id: matchmakingId,
      run,
      event,
      bout_context: ctxQ.data ?? [],
      tournament_context: tournamentQ.data ?? [],
      fighter_actueel: fighterActueel,
      resultaten: resultQ.data ?? [],
      dispensaties: dispQ.data ?? [],
    });
  } catch (error) {
    return secureError(error);
  }
}
