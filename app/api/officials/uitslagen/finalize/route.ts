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

function isApprovedStatus(v: unknown) {
  const s = upper(v);
  return ["GOEDGEKEURD", "APPROVED", "AKKOORD", "OK", "OPGELOST", "RESOLVED"].includes(s);
}


function pickFirst(...vals: any[]) {
  for (const v of vals) {
    const s = clean(v);
    if (s) return s;
  }
  return "";
}

function isJPlus(v: unknown) {
  const s = upper(v).replace(/\s+/g, "");
  return s === "J+" || s.includes("J+TALENTSTATUS") || s.includes("TALENTSTATUS");
}

function winnerName(result: any, bout: any) {
  const hoek = clean(result?.winnaar_hoek).toLowerCase();
  if (hoek === "rood") return clean(bout?.rood_naam) || null;
  if (hoek === "blauw") return clean(bout?.blauw_naam) || null;
  if (hoek === "onbeslist") return "Onbeslist";
  if (hoek === "no_contest") return "No contest";
  if (hoek === "demo") return "Demo";
  return null;
}

async function syncTalentstatusPartijen(supabase: any, matchmakingId: string) {
  const { data: bouts, error: boutErr } = await supabase
    .from("uitslagen_bouts")
    .select("*")
    .eq("matchmaking_id", matchmakingId);
  if (boutErr) throw new Error(boutErr.message);

  const { data: results, error: resultErr } = await supabase
    .from("uitslagen_resultaten")
    .select("*")
    .eq("matchmaking_id", matchmakingId)
    .neq("uitslag_status", "concept");
  if (resultErr) throw new Error(resultErr.message);

  const resultByBoutId = new Map((results ?? []).map((r: any) => [String(r.uitslagen_bout_id), r]));
  let synced = 0;

  for (const bout of bouts ?? []) {
    const result: any = resultByBoutId.get(String(bout.id));
    if (!result) continue;

    const klasse = pickFirst(bout.klasse, bout.bout_klasse, bout.partij_klasse, result.klasse);
    if (!isJPlus(klasse)) continue;

    const payload = {
      event_naam: pickFirst(bout.event_name) || null,
      event_datum: pickFirst(bout.datum) || null,
      matchmaking_id: matchmakingId,
      bout_id: String(bout.id),
      partij_nr: Number(bout.partij_nr) || null,
      vechter_naam: pickFirst(bout.rood_naam, bout.vechter_naam) || "Rood",
      vechter_sportschool: pickFirst(bout.rood_gym, bout.rood_sportschool, bout.vechter_sportschool) || null,
      vechter_va: pickFirst(bout.rood_va) || null,
      vechter_land: pickFirst(bout.rood_land, bout.vechter_land) || "NL",
      vechter_gewicht: bout.rood_gewicht_gewogen ?? bout.rood_gewogen_gewicht ?? bout.rood_weeggewicht ?? bout.rood_gewicht ?? null,
      tegenstander_naam: pickFirst(bout.blauw_naam, bout.tegenstander_naam) || "Blauw",
      tegenstander_sportschool: pickFirst(bout.blauw_gym, bout.blauw_sportschool, bout.tegenstander_sportschool) || null,
      tegenstander_va: pickFirst(bout.blauw_va) || null,
      tegenstander_land: pickFirst(bout.blauw_land, bout.tegenstander_land) || "NL",
      tegenstander_gewicht: bout.blauw_gewicht_gewogen ?? bout.blauw_gewogen_gewicht ?? bout.blauw_weeggewicht ?? bout.blauw_gewicht ?? null,
      winnaar: winnerName(result, bout),
      uitslag: pickFirst(result.methode, result.resultaat_type) || null,
      status: "geregistreerd",
      bron: "uitslagen",
      opmerkingen: pickFirst(result.opmerkingen) || null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: existingErr } = await supabase
      .from("talentstatus_partijen")
      .select("id")
      .eq("matchmaking_id", matchmakingId)
      .eq("bout_id", String(bout.id))
      .maybeSingle();
    if (existingErr) throw new Error(existingErr.message);

    const write = existing?.id
      ? await supabase.from("talentstatus_partijen").update(payload).eq("id", existing.id)
      : await supabase.from("talentstatus_partijen").insert(payload);
    if (write.error) throw new Error(write.error.message);
    synced++;
  }

  return synced;
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

  const isMinpunt =
    rule.includes("MINPUNT") ||
    ruleCode.includes("MINPUNT") ||
    boodschap.includes("MINPUNT");

  const isPureOk = result === "OK" || ruleCode === "OK" || isApprovedStatus(reviewStatus);
  const isPureInfo = result === "INFO" || severity === "INFO";

  // Weegstation status OK/INFO mag nooit blokkeren door een oude review_status=open.
  // Weegstation status AFKEUR/AFGEKEURD blijft wel een harde blokkade.
  if (rule === "WEEGSTATION_STATUS") {
    return (
      result === "AFKEUR" ||
      result === "AFGEKEURD" ||
      ruleCode === "AFKEUR" ||
      ruleCode === "AFGEKEURD" ||
      combined.includes("STARTVERBOD") ||
      combined.includes("VERBOD")
    );
  }

  // ACTIE minpunt rood/blauw is de enige ACTIE die door mag.
  // Die moet als strafpunt mee naar uitslagen, maar mag finaliseren niet blokkeren.
  if ((result === "ACTIE" || ruleCode.includes("ACTIE")) && isMinpunt) {
    return false;
  }

  // OK en INFO mogen door, tenzij dezelfde regel expliciet een harde blokkade noemt.
  if ((isPureOk || isPureInfo) && !(combined.includes("STARTVERBOD") || combined.includes("VERBOD"))) {
    if (result !== "AFKEUR" && result !== "AFGEKEURD" && ruleCode !== "AFKEUR" && ruleCode !== "AFGEKEURD") {
      return false;
    }
  }

  // Startverbod / verbod altijd blokkeren.
  if (combined.includes("STARTVERBOD") || combined.includes("VERBOD")) return true;

  // Harde afkeur blokkeert.
  if (result === "AFKEUR" || result === "AFGEKEURD" || ruleCode === "AFKEUR" || ruleCode === "AFGEKEURD") return true;

  // Open/nodige dispensatie blokkeert. Verleend/goedgekeurd mag door.
  const isDispensatie =
    result === "DISPENSATIE" ||
    rule.includes("DISPENSATIE") ||
    ruleCode.includes("DISPENSATIE") ||
    rule === "WEEGSTATION_DISPENSATIE";
  const isVerleend =
    result === "VERLEEND" ||
    ruleCode === "VERLEEND" ||
    combined.includes("DISPENSATIE VERLEEND") ||
    isApprovedStatus(reviewStatus) ||
    isApprovedStatus(actieStatus);
  const isAfgewezen =
    result === "AFGEWEZEN" ||
    result === "AFGEKEURD" ||
    ruleCode === "AFGEWEZEN" ||
    combined.includes("AFGEWEZEN") ||
    combined.includes("GEWEIGERD") ||
    combined.includes("NIET VERLEEND");
  const isNodig = result === "NODIG" || ruleCode === "NODIG" || result === "DISPENSATIE";

  if (isAfgewezen) return true;
  if (isDispensatie && !isVerleend) return true;
  if (isNodig && !isVerleend) return true;

  // Alle overige ACTIE/open review blokkeert.
  if (
    (result === "ACTIE" && !isMinpunt) ||
    (ruleCode.includes("ACTIE") && !isMinpunt) ||
    isOpenReview(reviewStatus) ||
    isOpenReview(actieStatus)
  ) {
    return true;
  }

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
      .select("*")
      .eq("matchmaking_id", matchmakingId);

    if (boutErr) return bad(boutErr.message, 500);

    // uitslagen_bouts.partij_nr is opnieuw genummerd voor de uitslagenflow.
    // controle_resultaten.partij_nr verwijst nog naar het originele matchmaking-partijnummer.
    // Daarom controleren we hieronder op original_partij_nr, maar tonen we in meldingen
    // het zichtbare uitslagen-partijnummer dat de official op deze pagina ziet.
    const uitslagenNrByOriginal = new Map<number, number>();

    for (const b of bouts ?? []) {
      const originalNr = Number((b as any).original_partij_nr ?? (b as any).partij_nr);
      const uitslagenNr = Number((b as any).partij_nr);

      if (Number.isFinite(originalNr) && Number.isFinite(uitslagenNr)) {
        uitslagenNrByOriginal.set(originalNr, uitslagenNr);
      }
    }

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

    const controlePartijNrs = Array.from(
      new Set(
        (bouts ?? [])
          .map((b: any) => Number((b as any).original_partij_nr ?? (b as any).partij_nr))
          .filter((n) => Number.isFinite(n))
      )
    );

    const { data: controles, error: ctrlErr } = await supabase
      .from("controle_resultaten")
      .select("id, partij_nr, bout_id, rule, resultaat, rule_code, severity, actie_status, review_status, boodschap")
      .eq("matchmaking_id", matchmakingId)
      .in("partij_nr", controlePartijNrs);

    if (ctrlErr) return bad(ctrlErr.message, 500);

    const blocked = (controles ?? []).filter(blocksByControleResult);

    if (blocked.length > 0) {
      const uniquePartijen = Array.from(
        new Set(
          blocked
            .map((r: any) => {
              const originalNr = Number(r.partij_nr);
              return uitslagenNrByOriginal.get(originalNr) ?? originalNr;
            })
            .filter((n) => Number.isFinite(n))
        )
      ).sort((a, b) => a - b);
      const preview = uniquePartijen.slice(0, 12).join(", ");
      const extra = uniquePartijen.length > 12 ? ` + ${uniquePartijen.length - 12} meer` : "";
      return bad(
        `Niet naar admin gestuurd: ${uniquePartijen.length} partij(en) hebben nog afkeur, verbod, open actiepunt of open dispensatie. Partij(en): ${preview}${extra}.`
      );
    }

    const now = new Date().toISOString();

    const { data: mmStageRow, error: mmStageReadErr } = await supabase
      .from("matchmakings")
      .select("status, stadium, bondteam, huidige_eigenaar_bondteam")
      .eq("id", matchmakingId)
      .maybeSingle();

    if (mmStageReadErr) return bad(mmStageReadErr.message, 500);
    if (!mmStageRow) return bad("Matchmaking niet gevonden.", 404);

    const currentStage = clean((mmStageRow as any).stadium || (mmStageRow as any).status);

    // Volgens matchmaking_stage_transitions moet dit eerst:
    // klaar_voor_uitslagen -> uitslagen_in_bewerking -> uitslagen_definitief.
    // Als de pagina direct finaliseert terwijl de matchmaking nog op klaar_voor_uitslagen staat,
    // zetten we hem eerst veilig op uitslagen_in_bewerking.
    if (currentStage === "klaar_voor_uitslagen") {
      const { error: inBewerkingErr } = await supabase
        .from("matchmakings")
        .update({
          stadium: "uitslagen_in_bewerking",
          status: "uitslagen_in_bewerking",
          huidige_eigenaar_type: "bondteam",
          huidige_eigenaar_user_id: null,
          last_updated_at: now,
          last_updated_by: userId,
        })
        .eq("id", matchmakingId);

      if (inBewerkingErr) return bad(inBewerkingErr.message, 500);
    } else if (currentStage && currentStage !== "uitslagen_in_bewerking" && currentStage !== "uitslagen_definitief") {
      return bad(`Deze matchmaking staat op '${currentStage}' en kan niet als uitslagen worden gefinaliseerd.`, 409);
    }

    for (const bout of bouts ?? []) {
      const klasse = pickFirst((bout as any).klasse, (bout as any).bout_klasse, (bout as any).partij_klasse);
      if (!klasse) continue;
      const { error: klasseErr } = await supabase
        .from("uitslagen_resultaten")
        .update({ klasse, updated_at: now })
        .eq("matchmaking_id", matchmakingId)
        .eq("uitslagen_bout_id", (bout as any).id)
        .or("klasse.is.null,klasse.eq.");
      if (klasseErr) return bad(klasseErr.message, 500);
    }

    const { error: resultUpdateErr } = await supabase
      .from("uitslagen_resultaten")
      .update({
        uitslag_status: "definitief",
        updated_at: now,
      })
      .eq("matchmaking_id", matchmakingId);

    if (resultUpdateErr) return bad(resultUpdateErr.message, 500);

    try {
      await syncTalentstatusPartijen(supabase, matchmakingId);
    } catch (syncErr: any) {
      return bad(`Talentstatus-partijen synchroniseren mislukt: ${syncErr?.message ?? syncErr}`, 500);
    }

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

    const targetBondteam =
      clean((mmStageRow as any)?.huidige_eigenaar_bondteam) ||
      clean((mmStageRow as any)?.bondteam) ||
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
        results_finalized_at: now,
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
