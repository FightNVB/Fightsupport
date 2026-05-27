import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function upper(v: unknown) {
  return clean(v).toUpperCase();
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env mist: NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getUserIdFromBearer(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Supabase env mist: NEXT_PUBLIC_SUPABASE_URL of NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  const authClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

function missingColumn(error: any) {
  const msg = String(error?.message ?? error ?? "").toLowerCase();
  return msg.includes("could not find") || msg.includes("schema cache") || msg.includes("column") || msg.includes("42703");
}

function isOpenReview(v: unknown) {
  const s = upper(v);
  return s === "OPEN" || s === "PENDING" || s === "WACHT" || s === "WACHTEND";
}

function blocksByControleResult(row: any) {
  const rule = upper(row.rule);
  const result = upper(row.resultaat);
  const ruleCode = upper(row.rule_code);
  const severity = upper(row.severity);
  const reviewStatus = upper(row.review_status);
  const actieStatus = upper(row.actie_status);
  const boodschap = upper(row.boodschap);
  const combined = `${rule} ${result} ${ruleCode} ${severity} ${reviewStatus} ${actieStatus} ${boodschap}`;

  // INFO mag door, tenzij het expliciet een afkeur/status/blokkade betreft.
  const isPureInfo = severity === "INFO";

  // Weegstation status is leidend als die expliciet AFKEUR/AFGEKEURD is.
  if (rule === "WEEGSTATION_STATUS") {
    return result === "AFKEUR" || result === "AFGEKEURD" || ruleCode === "AFKEUR" || ruleCode === "AFGEKEURD";
  }

  // Startverbod / verbod altijd blokkeren.
  if (combined.includes("STARTVERBOD") || combined.includes("VERBOD")) return true;

  // Harde afkeur blokkeert.
  if (result === "AFKEUR" || result === "AFGEKEURD" || ruleCode === "AFKEUR" || ruleCode === "AFGEKEURD") return true;

  // Open actiepunten blokkeren.
  if (result === "ACTIE" || ruleCode.includes("ACTIE") || isOpenReview(reviewStatus) || isOpenReview(actieStatus)) {
    return true;
  }

  // Open/nodige dispensatie blokkeert. Verleend mag door.
  const isDispensatie = result === "DISPENSATIE" || rule.includes("DISPENSATIE") || ruleCode.includes("DISPENSATIE") || rule === "WEEGSTATION_DISPENSATIE";
  const isVerleend = result === "VERLEEND" || ruleCode === "VERLEEND" || combined.includes("DISPENSATIE VERLEEND");
  const isAfgewezen = result === "AFGEWEZEN" || result === "AFGEKEURD" || ruleCode === "AFGEWEZEN";
  const isNodig = result === "NODIG" || ruleCode === "NODIG" || result === "DISPENSATIE";

  if (isDispensatie && !isVerleend) return true;
  if (isAfgewezen || isNodig) return true;

  // Info-regels die niet onder bovenstaande vallen blokkeren niet.
  if (isPureInfo) return false;

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromBearer(req);
    if (!userId) return bad("Unauthorized", 401);

    const body = await req.json().catch(() => ({}));
    const matchmakingId = clean(body.matchmaking_id);
    if (!matchmakingId) return bad("matchmaking_id ontbreekt");

    const supabase = adminClient();

    const { data: run, error: runErr } = await supabase
      .from("uitslagen_runs")
      .select("id, matchmaking_id, status")
      .eq("matchmaking_id", matchmakingId)
      .maybeSingle();

    if (runErr) return bad(runErr.message, 500);
    if (!run) return bad("Geen uitslagen_run gevonden voor deze matchmaking.", 404);

    const { data: bouts, error: boutErr } = await supabase
      .from("uitslagen_bouts")
      .select("id, uitslagen_run_id, matchmaking_id, partij_nr")
      .eq("matchmaking_id", matchmakingId);

    if (boutErr) return bad(boutErr.message, 500);

    const total = bouts?.length ?? 0;
    if (total <= 0) return bad("Geen partijen gevonden om te finaliseren.");

    const { data: results, error: resultErr } = await supabase
      .from("uitslagen_resultaten")
      .select("id, uitslagen_bout_id, matchmaking_id, uitslag_status")
      .eq("matchmaking_id", matchmakingId)
      .neq("uitslag_status", "concept");

    if (resultErr) return bad(resultErr.message, 500);

    const filled = results?.length ?? 0;
    if (filled < total) {
      return bad(`Nog niet alle uitslagen zijn ingevuld (${filled}/${total}).`);
    }

    const partijNrs = Array.from(new Set((bouts ?? []).map((b: any) => Number(b.partij_nr)).filter((n) => Number.isFinite(n))));

    const { data: controles, error: ctrlErr } = await supabase
      .from("controle_resultaten")
      .select("id, partij_nr, bout_id, rule, resultaat, rule_code, severity, actie_status, review_status, boodschap")
      .eq("matchmaking_id", matchmakingId)
      .in("partij_nr", partijNrs);

    if (ctrlErr) return bad(ctrlErr.message, 500);

    const blocked = (controles ?? []).filter(blocksByControleResult);

    if (blocked.length > 0) {
      const uniquePartijen = Array.from(new Set(blocked.map((r: any) => clean(r.partij_nr)).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
      const preview = uniquePartijen.slice(0, 12).join(", ");
      const extra = uniquePartijen.length > 12 ? ` + ${uniquePartijen.length - 12} meer` : "";
      return bad(
        `Niet naar admin gestuurd: ${uniquePartijen.length} partij(en) hebben nog afkeur, verbod, open actiepunt of open dispensatie. Partij(en): ${preview}${extra}.`
      );
    }

    const now = new Date().toISOString();

    const { error: resultUpdateErr } = await supabase
      .from("uitslagen_resultaten")
      .update({
        uitslag_status: "definitief",
        updated_at: now,
      })
      .eq("matchmaking_id", matchmakingId);

    if (resultUpdateErr) return bad(resultUpdateErr.message, 500);

    const { error: runStatusErr } = await supabase
      .from("uitslagen_runs")
      .update({ status: "afgerond" })
      .eq("id", (run as any).id);

    if (runStatusErr) return bad(runStatusErr.message, 500);

    const { error: optionalRunErr } = await supabase
      .from("uitslagen_runs")
      .update({ afgerond_op: now, afgerond_door: userId })
      .eq("id", (run as any).id);

    if (optionalRunErr && !missingColumn(optionalRunErr)) {
      console.warn("[officials/uitslagen/finalize] optionele run update mislukt:", optionalRunErr.message);
    }

    const { data: mmRow, error: mmReadErr } = await supabase
      .from("matchmakings")
      .select("bondteam, huidige_eigenaar_bondteam")
      .eq("id", matchmakingId)
      .maybeSingle();

    if (mmReadErr) return bad(mmReadErr.message, 500);

    const targetBondteam =
      clean((mmRow as any)?.huidige_eigenaar_bondteam) ||
      clean((mmRow as any)?.bondteam) ||
      null;

    const { error: mmCoreErr } = await supabase
      .from("matchmakings")
      .update({
        stadium: "uitslagen_definitief",
        status: "uitslagen_definitief",
        huidige_eigenaar_type: "bondteam",
        huidige_eigenaar_user_id: null,
        huidige_eigenaar_bondteam: targetBondteam,
        locked_for_editing: true,
        last_updated_at: now,
        last_updated_by: userId,
      })
      .eq("id", matchmakingId);

    if (mmCoreErr) return bad(mmCoreErr.message, 500);

    const { error: mmOptionalErr } = await supabase
      .from("matchmakings")
      .update({ results_finalized_at: now })
      .eq("id", matchmakingId);

    if (mmOptionalErr && !missingColumn(mmOptionalErr)) {
      console.warn("[officials/uitslagen/finalize] optionele matchmaking update mislukt:", mmOptionalErr.message);
    }

    const { error: uploadFlowErr } = await supabase
      .from("matchmaking_uploads")
      .update({ flow_status: "uitslagen_definitief" })
      .eq("matchmaking_id", matchmakingId);

    if (uploadFlowErr && !missingColumn(uploadFlowErr)) {
      console.warn("[officials/uitslagen/finalize] optionele upload flow update mislukt:", uploadFlowErr.message);
    }

    return NextResponse.json({
      ok: true,
      matchmaking_id: matchmakingId,
      partijen: total,
      ingevuld: filled,
      status: "uitslagen_definitief",
    });
  } catch (e: any) {
    console.error("[officials/uitslagen/finalize]", e);
    return bad(e?.message ?? "Finaliseren mislukt", 500);
  }
}
