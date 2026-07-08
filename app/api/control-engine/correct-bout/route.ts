// app/api/control-engine/correct-bout/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildControleBoutContext,
  buildToernooiContext,
} from "@/lib/control/buildControleBoutContext";
import { enrichControleBoutContext } from "@/lib/control/enrichControleBoutContext";
import { rulesEngine } from "@/lib/rulesEngine";
import {
  assertCanAccessMatchmaking,
  requireUserWithRole,
} from "@/app/api/_utils/authz";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function normalizeVa(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  if (!s) return null;
  const digits = s.replace(/\D+/g, "");
  const noLeadingZeros = digits.replace(/^0+/, "");
  return noLeadingZeros ? noLeadingZeros : null;
}

function normalizeText(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  return s ? s : null;
}

function normalizeWeight(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim().replace(/,/g, ".");
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  return cleaned ? cleaned : null;
}

function unwrapUuid(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "[object Object]") return null;
  return s;
}

function hasOwn(obj: any, key: string) {
  return Object.prototype.hasOwnProperty.call(obj ?? {}, key);
}

async function getLatestControleRunId(matchmaking_id: string): Promise<string | null> {
  const { data: ctxRows, error: ctxErr } = await supabase
    .from("controle_bout_context")
    .select("controle_run_id, created_at")
    .eq("matchmaking_id", matchmaking_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (ctxErr) throw ctxErr;

  const fromCtx = ctxRows?.[0]?.controle_run_id ?? null;
  if (fromCtx) return String(fromCtx);

  const { data: tRows, error: tErr } = await supabase
    .from("controle_toernooi_context")
    .select("controle_run_id, created_at")
    .eq("matchmaking_id", matchmaking_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (tErr) throw tErr;

  const fromToernooi = tRows?.[0]?.controle_run_id ?? null;
  if (fromToernooi) return String(fromToernooi);

  const { data: resRows, error: resErr } = await supabase
    .from("controle_resultaten")
    .select("controle_run_id, created_at")
    .eq("matchmaking_id", matchmaking_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (resErr) throw resErr;

  const fromRes = resRows?.[0]?.controle_run_id ?? null;
  return fromRes ? String(fromRes) : null;
}

async function getBoutRow(matchmaking_id: string, partij_nr: number) {
  const { data, error } = await supabase
    .from("matchmaking_bouts_raw")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("partij_nr", partij_nr)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function getBoutContextRow(
  matchmaking_id: string,
  controle_run_id: string,
  partij_nr: number
) {
  const { data, error } = await supabase
    .from("controle_bout_context")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("controle_run_id", controle_run_id)
    .eq("partij_nr", partij_nr)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function getToernooiBoutRow(opts: {
  matchmaking_id: string;
  toernooi_code: string;
  va_nummer: string;
}) {
  const { matchmaking_id, toernooi_code, va_nummer } = opts;

  const { data, error } = await supabase
    .from("matchmaking_bouts_raw")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("toernooi_code", toernooi_code)
    .or(`va_rood.eq.${va_nummer},va_blauw.eq.${va_nummer}`)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

async function getToernooiContextRow(opts: {
  matchmaking_id: string;
  controle_run_id?: string | null;
  toernooi_code: string;
  va_nummer: string;
}) {
  const { matchmaking_id, controle_run_id, toernooi_code, va_nummer } = opts;

  let q = supabase
    .from("controle_toernooi_context")
    .select("*")
    .eq("matchmaking_id", matchmaking_id)
    .eq("toernooi_code", toernooi_code)
    .eq("va_nummer", va_nummer)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (controle_run_id) q = q.eq("controle_run_id", controle_run_id);

  const { data, error } = await q;
  if (error) throw error;
  return data?.[0] ?? null;
}


async function matchmakerOwnsMatchmaking(opts: {
  matchmaking_id: string;
  userId: string;
}): Promise<boolean> {
  const { matchmaking_id, userId } = opts;

  const { data: mm, error: mmErr } = await supabase
    .from("matchmakings")
    .select(
      "id, matchmaker_id, huidige_eigenaar_user_id, uploaded_by, maker_user_id"
    )
    .eq("id", matchmaking_id)
    .maybeSingle();

  if (mmErr) throw mmErr;

  if (
    String(mm?.matchmaker_id ?? "") === userId ||
    String(mm?.huidige_eigenaar_user_id ?? "") === userId ||
    String(mm?.uploaded_by ?? "") === userId ||
    String(mm?.maker_user_id ?? "") === userId
  ) {
    return true;
  }

  const { data: upload, error: uploadErr } = await supabase
    .from("matchmaking_uploads")
    .select("id, uploaded_by, matchmaking_id")
    .eq("matchmaking_id", matchmaking_id)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (uploadErr) throw uploadErr;

  return String(upload?.uploaded_by ?? "") === userId;
}

async function assertCanCorrectBout(opts: {
  matchmaking_id: string;
  userId: string;
  role: string;
}) {
  const { matchmaking_id, userId, role } = opts;
  const accessRole = String(role ?? "").trim().toLowerCase();

  if (accessRole === "matchmaker") {
    const owns = await matchmakerOwnsMatchmaking({ matchmaking_id, userId });
    if (owns) return;
  }

  await assertCanAccessMatchmaking({ matchmaking_id, userId, role });
}

function readToernooiInput(body: any) {
  const toernooi_code = String(body?.toernooi_code ?? body?.toernooiCode ?? "")
    .trim()
    .toUpperCase();

  const oldVa = normalizeVa(
    body?.va_nummer ??
      body?.fighter_id ??
      body?.fighterId ??
      body?.old_va_nummer ??
      body?.old_va
  );

  const newVa = normalizeVa(
    hasOwn(body, "new_va_nummer")
      ? body.new_va_nummer
      : hasOwn(body, "new_va")
        ? body.new_va
        : oldVa
  );

  const newNaam = normalizeText(
    hasOwn(body, "new_naam")
      ? body.new_naam
      : hasOwn(body, "naam")
        ? body.naam
        : undefined
  );

  const newGym = normalizeText(
    hasOwn(body, "new_gym")
      ? body.new_gym
      : hasOwn(body, "sportschool")
        ? body.sportschool
        : hasOwn(body, "gym")
          ? body.gym
          : undefined
  );

  const newDiscipline = normalizeText(
    hasOwn(body, "new_discipline")
      ? body.new_discipline
      : hasOwn(body, "discipline")
        ? body.discipline
        : undefined
  );

  const newKlasse = normalizeText(
    hasOwn(body, "new_klasse")
      ? body.new_klasse
      : hasOwn(body, "new_klasse_mm")
        ? body.new_klasse_mm
        : hasOwn(body, "klasse")
          ? body.klasse
          : undefined
  );

  const newGewicht = normalizeWeight(
    hasOwn(body, "new_gewicht")
      ? body.new_gewicht
      : hasOwn(body, "gewicht")
        ? body.gewicht
        : undefined
  );

  return { toernooi_code, oldVa, newVa, newNaam, newGym, newDiscipline, newKlasse, newGewicht };
}

async function correctToernooiFighter(opts: {
  body: any;
  matchmaking_id: string;
  controle_run_id: string | null;
}) {
  const { body, matchmaking_id } = opts;
  let controle_run_id = opts.controle_run_id;

  const {
    toernooi_code,
    oldVa,
    newVa,
    newNaam,
    newGym,
    newDiscipline,
    newKlasse,
    newGewicht,
  } = readToernooiInput(body);

  if (!toernooi_code) {
    return NextResponse.json({ error: "toernooi_code ontbreekt" }, { status: 400 });
  }

  if (!oldVa) {
    return NextResponse.json({ error: "va_nummer/fighter_id ontbreekt voor toernooi-correctie" }, { status: 400 });
  }

  const oldCtx = await getToernooiContextRow({
    matchmaking_id,
    controle_run_id,
    toernooi_code,
    va_nummer: oldVa,
  });

  const rawBout = await getToernooiBoutRow({
    matchmaking_id,
    toernooi_code,
    va_nummer: oldVa,
  });

  if (!oldCtx && !rawBout) {
    return NextResponse.json(
      { error: `Toernooi-vechter niet gevonden voor ${toernooi_code} / VA ${oldVa}` },
      { status: 404 }
    );
  }

  const hasNewVaInput = hasOwn(body, "new_va_nummer") || hasOwn(body, "new_va");
  const sourceVa = hasNewVaInput ? newVa : oldVa;
  const isRood =
    normalizeVa(rawBout?.va_rood ?? rawBout?.rood_va ?? rawBout?.rood_va_mm) === oldVa;
  const isBlauw =
    normalizeVa(rawBout?.va_blauw ?? rawBout?.blauw_va ?? rawBout?.blauw_va_mm) === oldVa;

  // 1) Bron aanpassen: buildToernooiContext gebruikt matchmaking_bouts_raw.
  //    Als we alleen controle_toernooi_context aanpassen, overschrijft build/rules de wijziging later weer.
  if (rawBout) {
    const boutPatch: Record<string, any> = {
      laatste_bewerking_op: new Date().toISOString(),
    };

    if (newDiscipline !== null) boutPatch.discipline = newDiscipline;
    if (newKlasse !== null) boutPatch.klasse = newKlasse;

    if (isRood) {
      if (hasNewVaInput) boutPatch.va_rood = sourceVa;
      if (newNaam !== null) boutPatch.rood_naam = newNaam;
      if (newGym !== null) boutPatch.rood_gym = newGym;
      if (newGewicht !== null) boutPatch.rood_gewicht = newGewicht;

      if (sourceVa !== oldVa) {
        boutPatch.rood_va_changed = true;
        boutPatch.rood_va_is_gewijzigd = true;
        boutPatch.rood_va_changed_at = new Date().toISOString();
        boutPatch.rood_va_was = oldVa;
        if (!rawBout?.rood_va_mm_prev) boutPatch.rood_va_mm_prev = oldVa;
      }
    } else if (isBlauw) {
      if (hasNewVaInput) boutPatch.va_blauw = sourceVa;
      if (newNaam !== null) boutPatch.blauw_naam = newNaam;
      if (newGym !== null) boutPatch.blauw_gym = newGym;
      if (newGewicht !== null) boutPatch.blauw_gewicht = newGewicht;

      if (sourceVa !== oldVa) {
        boutPatch.blauw_va_changed = true;
        boutPatch.blauw_va_is_gewijzigd = true;
        boutPatch.blauw_va_changed_at = new Date().toISOString();
        boutPatch.blauw_va_was = oldVa;
        if (!rawBout?.blauw_va_mm_prev) boutPatch.blauw_va_mm_prev = oldVa;
      }
    }

    // Alleen update, nooit upsert: jouw tabel heeft id NOT NULL zonder default.
    const { error: rawErr } = await supabase
      .from("matchmaking_bouts_raw")
      .update(boutPatch)
      .eq("id", rawBout.id);

    if (rawErr) throw rawErr;
  }

  // 2) Bestaande context ook direct aanpassen, zodat de pagina meteen klopt.
  //    Alleen update, geen upsert/insert, anders krijg je "null value in column id".
  if (oldCtx) {
    const ctxPatch: Record<string, any> = {
      updated_at: new Date().toISOString(),
      bijgewerkt_op: new Date().toISOString().slice(0, 10),
    };

    if (hasNewVaInput) {
      ctxPatch.va_nummer = sourceVa;
      ctxPatch.fighter_id = sourceVa;
    }

    if (newNaam !== null) {
      ctxPatch.naam_mm = newNaam;
      ctxPatch.naam = newNaam;
    }

    if (newGym !== null) {
      ctxPatch.sportschool_mm = newGym;
      ctxPatch.sportschool = newGym;
    }

    if (newGewicht !== null) {
      ctxPatch.gewicht_mm = newGewicht;
      ctxPatch.gewicht = newGewicht;
    }

    if (newDiscipline !== null) ctxPatch.discipline = newDiscipline;
    if (newKlasse !== null) {
      ctxPatch.klasse_mm = newKlasse;
      ctxPatch.klasse = newKlasse;
    }

    const { error: ctxErr } = await supabase
      .from("controle_toernooi_context")
      .update(ctxPatch)
      .eq("id", oldCtx.id);

    if (ctxErr) throw ctxErr;
  }

  if (!controle_run_id) {
    controle_run_id = await getLatestControleRunId(matchmaking_id);
  }

  if (!controle_run_id) {
    return NextResponse.json({
      ok: true,
      message:
        "Toernooi-vechter bijgewerkt, maar geen controle_run gevonden om rules te herbouwen.",
      type: "toernooi_fighter",
      matchmaking_id,
      toernooi_code,
      old_va_nummer: oldVa,
      new_va_nummer: sourceVa,
    });
  }

  // 3) Nu opnieuw bouwen. Daarna nog een tweede kleine override op context,
  //    omdat buildToernooiContext scraped FP-waarden kan terugzetten.
  await buildToernooiContext(matchmaking_id, controle_run_id, {
    toernooi_code,
    fighter_id: sourceVa ?? oldVa,
  });

  const rebuiltCtx = await getToernooiContextRow({
    matchmaking_id,
    controle_run_id,
    toernooi_code,
    va_nummer: sourceVa ?? oldVa,
  });

  if (rebuiltCtx) {
    const finalPatch: Record<string, any> = {
      updated_at: new Date().toISOString(),
      bijgewerkt_op: new Date().toISOString().slice(0, 10),
    };

    if (newNaam !== null) {
      finalPatch.naam_mm = newNaam;
      finalPatch.naam = newNaam;
    }
    if (newGym !== null) {
      finalPatch.sportschool_mm = newGym;
      finalPatch.sportschool = newGym;
    }
    if (newGewicht !== null) {
      finalPatch.gewicht_mm = newGewicht;
      finalPatch.gewicht = newGewicht;
    }
    if (newDiscipline !== null) finalPatch.discipline = newDiscipline;
    if (newKlasse !== null) {
      finalPatch.klasse_mm = newKlasse;
      finalPatch.klasse = newKlasse;
    }
    if (hasNewVaInput) {
      finalPatch.va_nummer = sourceVa;
      finalPatch.fighter_id = sourceVa;
    }

    const { error: finalErr } = await supabase
      .from("controle_toernooi_context")
      .update(finalPatch)
      .eq("id", rebuiltCtx.id);

    if (finalErr) throw finalErr;
  }

  // 4) Regels opnieuw draaien voor deze toernooi-vechter.
  //    rulesEngine gebruikt ctxRows uit controle_bout_context voor normale partijen;
  //    voor toernooi draait hij meestal op DB-context. Daarom geven we lege ctxRows mee.
  await rulesEngine({
    matchmaking_id,
    controle_run_id,
    ctxRows: [],
  });

  return NextResponse.json({
    ok: true,
    message: "Toernooi-vechter bijgewerkt + toernooi-controle opnieuw opgebouwd",
    type: "toernooi_fighter",
    matchmaking_id,
    controle_run_id,
    toernooi_code,
    old_va_nummer: oldVa,
    new_va_nummer: sourceVa,
    raw_bout_id: rawBout?.id ?? null,
    controle_toernooi_context_id: rebuiltCtx?.id ?? oldCtx?.id ?? null,
  });
}

export async function POST(req: Request) {
  try {
    const { userId, role } = await requireUserWithRole(req);
    const body = await req.json().catch(() => ({}));

    const matchmaking_id = String(body?.matchmaking_id ?? "").trim();
    const partij_nr =
      body?.partij_nr !== undefined && body?.partij_nr !== null && body?.partij_nr !== ""
        ? Number(body.partij_nr)
        : NaN;
    const controle_run_id_in = body?.controle_run_id ? String(body.controle_run_id) : null;
    const toernooi_code = String(body?.toernooi_code ?? body?.toernooiCode ?? "").trim();

    if (!matchmaking_id) {
      return NextResponse.json(
        { error: "matchmaking_id ontbreekt" },
        { status: 400 }
      );
    }

    await assertCanCorrectBout({ matchmaking_id, userId, role });

    // Toernooi-flow: geen partij_nr, maar wel toernooi_code + VA.
    if (toernooi_code && !Number.isFinite(partij_nr)) {
      return await correctToernooiFighter({
        body,
        matchmaking_id,
        controle_run_id: controle_run_id_in,
      });
    }

    if (!Number.isFinite(partij_nr)) {
      return NextResponse.json(
        { error: "partij_nr ontbreekt of ongeldig. Voor toernooi is toernooi_code + va_nummer verplicht." },
        { status: 400 }
      );
    }

    const existingBout = await getBoutRow(matchmaking_id, partij_nr);
    if (!existingBout) {
      return NextResponse.json(
        { error: "Bout niet gevonden" },
        { status: 404 }
      );
    }

    const oldVaRood =
      existingBout?.va_rood != null && String(existingBout.va_rood).trim()
        ? String(existingBout.va_rood).trim()
        : null;

    const oldVaBlauw =
      existingBout?.va_blauw != null && String(existingBout.va_blauw).trim()
        ? String(existingBout.va_blauw).trim()
        : null;

    const patch: Record<string, any> = {};

    const hasNewVaRood = hasOwn(body, "new_va_rood");
    const hasNewVaBlauw = hasOwn(body, "new_va_blauw");

    if (hasNewVaRood) {
      patch.va_rood = normalizeVa(body.new_va_rood);
    }

    if (hasNewVaBlauw) {
      patch.va_blauw = normalizeVa(body.new_va_blauw);
    }

    const canEditNames =
      role === "admin" || role === "superadmin" || role === "matchmaker";

    if (canEditNames) {
      if (hasOwn(body, "new_rood_naam")) {
        patch.rood_naam = String(body.new_rood_naam ?? "").trim() || null;
      }
      if (hasOwn(body, "new_blauw_naam")) {
        patch.blauw_naam = String(body.new_blauw_naam ?? "").trim() || null;
      }
    }

    if (hasOwn(body, "new_rood_gym")) {
      patch.rood_gym = String(body.new_rood_gym ?? "").trim() || null;
    }

    if (hasOwn(body, "new_blauw_gym")) {
      patch.blauw_gym = String(body.new_blauw_gym ?? "").trim() || null;
    }

    const hasNewDiscipline = hasOwn(body, "new_discipline");
    const hasDiscipline = hasOwn(body, "discipline");
    const hasNewKlasse = hasOwn(body, "new_klasse");
    const hasNewKlasseMm = hasOwn(body, "new_klasse_mm");
    const hasKlasse = hasOwn(body, "klasse");

    if (hasNewDiscipline || hasDiscipline) {
      patch.discipline = normalizeText(hasNewDiscipline ? body.new_discipline : body.discipline);
    }

    if (hasNewKlasse || hasNewKlasseMm || hasKlasse) {
      patch.klasse = normalizeText(
        hasNewKlasse ? body.new_klasse : hasNewKlasseMm ? body.new_klasse_mm : body.klasse
      );
    }

    if (hasOwn(body, "new_geslacht") || hasOwn(body, "geslacht")) {
      patch.geslacht = normalizeText(hasOwn(body, "new_geslacht") ? body.new_geslacht : body.geslacht);
    }

    if (hasOwn(body, "new_max_gewicht") || hasOwn(body, "max_gewicht")) {
      const maxGewicht = normalizeWeight(hasOwn(body, "new_max_gewicht") ? body.new_max_gewicht : body.max_gewicht);
      patch.max_gewicht = maxGewicht;
      patch.max_gewicht_notatie = maxGewicht ? `-${maxGewicht}` : null;
      if (!patch.max_gewicht_type) patch.max_gewicht_type = "up_to";
    }

    if (hasOwn(body, "new_rood_gewicht")) {
      patch.rood_gewicht = normalizeWeight(body.new_rood_gewicht);
    }

    if (hasOwn(body, "new_blauw_gewicht")) {
      patch.blauw_gewicht = normalizeWeight(body.new_blauw_gewicht);
    }

    const newVaRood = hasNewVaRood ? (patch.va_rood ?? null) : oldVaRood;
    const newVaBlauw = hasNewVaBlauw ? (patch.va_blauw ?? null) : oldVaBlauw;

    const roodVaChanged = hasNewVaRood && newVaRood !== oldVaRood;
    const blauwVaChanged = hasNewVaBlauw && newVaBlauw !== oldVaBlauw;

    if (roodVaChanged) {
      const prevExisting =
        existingBout?.rood_va_mm_prev != null &&
        String(existingBout.rood_va_mm_prev).trim()
          ? String(existingBout.rood_va_mm_prev).trim()
          : null;

      if (!prevExisting) patch.rood_va_mm_prev = oldVaRood;

      patch.rood_va_changed = true;
      patch.rood_va_is_gewijzigd = true;
      patch.rood_va_changed_at = new Date().toISOString();
      patch.rood_va_was = oldVaRood;
    }

    if (blauwVaChanged) {
      const prevExisting =
        existingBout?.blauw_va_mm_prev != null &&
        String(existingBout.blauw_va_mm_prev).trim()
          ? String(existingBout.blauw_va_mm_prev).trim()
          : null;

      if (!prevExisting) patch.blauw_va_mm_prev = oldVaBlauw;

      patch.blauw_va_changed = true;
      patch.blauw_va_is_gewijzigd = true;
      patch.blauw_va_changed_at = new Date().toISOString();
      patch.blauw_va_was = oldVaBlauw;
    }

    if (Object.keys(patch).length > 0) {
      patch.laatste_bewerking_op = new Date().toISOString();

      const { error: upErr } = await supabase
        .from("matchmaking_bouts_raw")
        .update(patch)
        // Gebruik de stabiele raw-bout id. partij_nr kan wijzigen door reorder,
        // waardoor discipline/klasse anders aan de oude positie blijft hangen.
        .eq("id", existingBout.id);

      if (upErr) {
        console.error("DB update fout:", upErr);
        return NextResponse.json(
          { error: upErr.message ?? "Kon bout niet updaten" },
          { status: 500 }
        );
      }
    }

    const controle_run_id =
      controle_run_id_in ?? (await getLatestControleRunId(matchmaking_id));

    if (!controle_run_id) {
      return NextResponse.json({
        ok: true,
        message:
          "Bout bijgewerkt, maar geen controle_run gevonden om context/rules te herbouwen.",
        matchmaking_id,
        partij_nr,
      });
    }

    await buildControleBoutContext(matchmaking_id, controle_run_id, { partij_nr });

    const ctxAfterBuild = await getBoutContextRow(matchmaking_id, controle_run_id, partij_nr);
    const scopedBoutId =
      unwrapUuid(ctxAfterBuild?.bout_id) ??
      unwrapUuid(existingBout?.bout_uid) ??
      unwrapUuid(existingBout?.bout_id) ??
      null;

    await enrichControleBoutContext(matchmaking_id, controle_run_id, {
      partij_nr,
      bout_id: scopedBoutId,
    });

    let ctxFinal = await getBoutContextRow(matchmaking_id, controle_run_id, partij_nr);

    // Final override na build + enrich:
    // buildControleBoutContext/enrich kunnen context opnieuw vullen vanuit raw/scrape.
    // De bewerkvelden uit deze request moeten leidend blijven.
    // Let op: controle_bout_context gebruikt *_mm kolommen voor namen/gym/gewicht.
    if (ctxFinal) {
      const finalCtxPatch: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (hasNewVaRood) {
        finalCtxPatch.rood_va_mm = newVaRood;
        finalCtxPatch.rood_va_mm_prev = oldVaRood;
      }

      if (hasNewVaBlauw) {
        finalCtxPatch.blauw_va_mm = newVaBlauw;
        finalCtxPatch.blauw_va_mm_prev = oldVaBlauw;
      }

      if (canEditNames && hasOwn(body, "new_rood_naam")) {
        finalCtxPatch.rood_naam_mm = patch.rood_naam ?? null;
      }

      if (canEditNames && hasOwn(body, "new_blauw_naam")) {
        finalCtxPatch.blauw_naam_mm = patch.blauw_naam ?? null;
      }

      if (hasOwn(body, "new_rood_gym")) {
        finalCtxPatch.rood_gym_mm = patch.rood_gym ?? null;
      }

      if (hasOwn(body, "new_blauw_gym")) {
        finalCtxPatch.blauw_gym_mm = patch.blauw_gym ?? null;
      }

      if (hasNewDiscipline || hasDiscipline) {
        finalCtxPatch.discipline = patch.discipline ?? null;
      }

      if (hasNewKlasse || hasNewKlasseMm || hasKlasse) {
        // controle_bout_context heeft geen kolom "klasse"; alleen "klasse_mm".
        finalCtxPatch.klasse_mm = patch.klasse ?? null;
      }

      if (hasOwn(body, "new_max_gewicht") || hasOwn(body, "max_gewicht")) {
        finalCtxPatch.max_gewicht = patch.max_gewicht ?? null;
        finalCtxPatch.max_gewicht_notatie = patch.max_gewicht_notatie ?? null;
        finalCtxPatch.max_gewicht_type = patch.max_gewicht_type ?? null;
      }

      if (hasOwn(body, "new_rood_gewicht")) {
        finalCtxPatch.rood_gewicht_mm = patch.rood_gewicht ?? null;
      }

      if (hasOwn(body, "new_blauw_gewicht")) {
        finalCtxPatch.blauw_gewicht_mm = patch.blauw_gewicht ?? null;
      }

      if (Object.keys(finalCtxPatch).length > 1) {
        const { error: finalCtxErr } = await supabase
          .from("controle_bout_context")
          .update(finalCtxPatch)
          .eq("id", ctxFinal.id);

        if (finalCtxErr) throw finalCtxErr;

        ctxFinal = await getBoutContextRow(matchmaking_id, controle_run_id, partij_nr);
      }
    }

    const ctxRows = ctxFinal ? [ctxFinal] : [];

    if (ctxRows.length === 0) {
      return NextResponse.json({
        ok: true,
        message:
          "Bout bijgewerkt, maar geen controle_bout_context gevonden voor deze partij.",
        matchmaking_id,
        partij_nr,
        controle_run_id,
      });
    }

    await rulesEngine({
      matchmaking_id,
      controle_run_id,
      ctxRows,
      scoped_partij_nr: partij_nr,
      scoped_bout_id: unwrapUuid(ctxFinal?.bout_id) ?? scopedBoutId ?? null,
    });

    return NextResponse.json({
      ok: true,
      message: "Bout bijgewerkt + alleen deze partij opnieuw opgebouwd",
      type: "partij",
      matchmaking_id,
      partij_nr,
      controle_run_id,
      ctx_rows: ctxRows.length,
      bout_id: unwrapUuid(ctxFinal?.bout_id) ?? scopedBoutId ?? null,
    });
  } catch (e: any) {
    console.error("correct-bout error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}
