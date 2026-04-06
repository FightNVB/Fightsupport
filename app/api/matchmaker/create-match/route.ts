import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rulesEngineMM } from "@/lib/rulesEngineMM";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

function s(v: unknown) {
  return String(v ?? "").trim();
}

function toNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toNumeric(v: unknown): number | null {
  if (v == null || v === "") return null;
  const normalized = String(v).replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function toBoolLikeJaNee(v: unknown): "Ja" | "Nee" | null {
  const value = s(v).toLowerCase();
  if (!value) return null;

  if (
    value === "ja" ||
    value === "j" ||
    value === "true" ||
    value === "1" ||
    value === "yes" ||
    value === "geldig"
  ) {
    return "Ja";
  }

  if (
    value === "nee" ||
    value === "n" ||
    value === "false" ||
    value === "0" ||
    value === "no" ||
    value === "ongeldig"
  ) {
    return "Nee";
  }

  return null;
}

function jsonError(message: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}

async function getUserFromBearer(req: NextRequest) {
  const auth =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) {
    return { user: null, error: "Geen bearer token ontvangen." };
  }

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const { data, error } = await supabaseUser.auth.getUser();
  if (error || !data?.user) {
    return { user: null, error: error?.message ?? "Niet ingelogd." };
  }

  return { user: data.user, error: null };
}

async function getRolesForUser(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  if (error) throw error;

  return Array.from(
    new Set(
      (data ?? [])
        .map((r: any) => s(r?.roles?.name).toLowerCase())
        .filter(Boolean)
    )
  );
}

async function canAccessMatchmaking(
  matchmakingId: string,
  userId: string,
  roles: string[]
) {
  if (roles.includes("superadmin") || roles.includes("admin")) return true;

  const { data: uploadRow, error: uploadErr } = await supabaseAdmin
    .from("matchmaking_uploads")
    .select("uploaded_by")
    .eq("matchmaking_id", matchmakingId)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (uploadErr) throw uploadErr;
  if (s(uploadRow?.uploaded_by) === userId) return true;

  const { data: mmRow, error: mmErr } = await supabaseAdmin
    .from("matchmaker_matchmakings")
    .select("*")
    .eq("id", matchmakingId)
    .maybeSingle();

  if (mmErr) throw mmErr;
  if (!mmRow) return false;

  const owners = [
    s(mmRow?.created_by),
    s(mmRow?.user_id),
    s(mmRow?.owner_user_id),
    s(mmRow?.uploaded_by),
  ].filter(Boolean);

  if (owners.includes(userId)) return true;
  if (roles.includes("matchmaker")) return true;

  return false;
}

function deriveLeeftijdType(klasse?: string | null) {
  const k = s(klasse).toLowerCase();
  if (!k) return null;
  if (k.includes("jeugd")) return "jeugd";
  return "senior";
}

function normalizeGeslacht(value?: string | null) {
  const v = s(value).toLowerCase();
  if (!v) return null;
  if (["vrouw", "v", "female", "f", "dame", "meisje"].includes(v)) return "vrouw";
  if (["man", "m", "male", "heer", "jongen"].includes(v)) return "man";
  return s(value) || null;
}

async function findFighterRecord({
  matchmakingId,
  fighterContextId,
  inschrijvingId,
  fighterId,
}: {
  matchmakingId: string;
  fighterContextId?: string | null;
  inschrijvingId?: string | null;
  fighterId?: string | null;
}) {
  let fighterContext: any = null;
  let inschrijving: any = null;

  if (s(fighterContextId)) {
    const { data, error } = await supabaseAdmin
      .from("matchmaker_fighter_context")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq("id", fighterContextId)
      .maybeSingle();

    if (error) throw error;
    fighterContext = data ?? null;
  }

  if (!inschrijving && s(inschrijvingId)) {
    const { data, error } = await supabaseAdmin
      .from("matchmaker_inschrijvingen")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq("id", inschrijvingId)
      .maybeSingle();

    if (error) throw error;
    inschrijving = data ?? null;
  }

  if (!fighterContext && !inschrijving && s(fighterId)) {
    const byContext = await supabaseAdmin
      .from("matchmaker_fighter_context")
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq("fighter_id", fighterId)
      .limit(1)
      .maybeSingle();

    if (!byContext.error && byContext.data) {
      fighterContext = byContext.data;
    } else {
      const byInschrijving = await supabaseAdmin
        .from("matchmaker_inschrijvingen")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("fighter_id", fighterId)
        .limit(1)
        .maybeSingle();

      if (byInschrijving.error) throw byInschrijving.error;
      inschrijving = byInschrijving.data ?? null;
    }
  }

  if (fighterContext && !inschrijving) {
    const linkedInschrijvingId = s(fighterContext?.inschrijving_id);
    const linkedFighterId = s(fighterContext?.fighter_id);

    if (linkedInschrijvingId) {
      const { data, error } = await supabaseAdmin
        .from("matchmaker_inschrijvingen")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("id", linkedInschrijvingId)
        .maybeSingle();

      if (error) throw error;
      inschrijving = data ?? null;
    } else if (linkedFighterId) {
      const { data, error } = await supabaseAdmin
        .from("matchmaker_inschrijvingen")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("fighter_id", linkedFighterId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      inschrijving = data ?? null;
    }
  }

  const base = fighterContext ?? inschrijving;
  if (!base) return null;

  const resolvedInschrijvingId = toNumber(inschrijving?.id);
  if (resolvedInschrijvingId == null) {
    throw new Error(
      `Kon verplichte inschrijving_id niet vinden voor vechter ${
        s(base?.fp_naam) || s(base?.naam_input) || s(base?.naam) || "onbekend"
      }.`
    );
  }

  const naam =
    s(base?.fp_naam) ||
    `${s(base?.voornaam)} ${s(base?.achternaam)}`.trim() ||
    s(base?.naam_input) ||
    s(base?.naam) ||
    "Onbekend";

  const gym =
    s(base?.gym_input) ||
    s(base?.fp_gym) ||
    s(base?.gym) ||
    s(inschrijving?.gym_input) ||
    s(inschrijving?.gym) ||
    null;

  const discipline = s(base?.discipline) || s(inschrijving?.discipline) || null;

  const klasse =
    s(base?.klasse) ||
    s(base?.klasse_mm) ||
    s(base?.fp_klasse) ||
    s(inschrijving?.klasse) ||
    s(inschrijving?.klasse_mm) ||
    null;

  const geslacht = s(base?.geslacht) || s(inschrijving?.geslacht) || null;

  const va_nummer =
    s(base?.va_nummer) ||
    s(base?.va) ||
    s(inschrijving?.va_nummer) ||
    s(inschrijving?.va) ||
    null;

  const gewicht = toNumeric(base?.gewicht) ?? toNumeric(inschrijving?.gewicht);

  const geboortedatum =
    s(base?.fp_geboortedatum) ||
    s(base?.geboortedatum) ||
    s(base?.geboortedatum_input) ||
    s(inschrijving?.geboortedatum) ||
    s(inschrijving?.geboortedatum_input) ||
    null;

  return {
    fighter_context_id: fighterContext ? s(fighterContext.id) : null,
    inschrijving_id: resolvedInschrijvingId,
    fighter_id:
      s(fighterContext?.fighter_id) ||
      s(inschrijving?.fighter_id) ||
      s(fighterId) ||
      null,
    naam,
    gym,
    discipline,
    klasse,
    geslacht: normalizeGeslacht(geslacht),
    leeftijd_type: deriveLeeftijdType(klasse),
    va_nummer,
    gewicht,
    geboortedatum,
    raw_context: fighterContext,
    raw_inschrijving: inschrijving,
  };
}

async function getNextPartijNr(matchmakingId: string): Promise<number> {
  const values: number[] = [];

  const rawRes = await supabaseAdmin
    .from("matchmaker_bouts_raw")
    .select("partij_nr")
    .eq("matchmaking_id", matchmakingId);

  if (rawRes.error) throw rawRes.error;

  for (const row of rawRes.data ?? []) {
    const v = toNumber(row?.partij_nr);
    if (v != null) values.push(v);
  }

  return (values.length ? Math.max(...values) : 0) + 1;
}

function calcBirthDiffMonths(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null;

  let older = da;
  let younger = db;
  if (da.getTime() > db.getTime()) {
    older = db;
    younger = da;
  }

  let months =
    (younger.getFullYear() - older.getFullYear()) * 12 +
    (younger.getMonth() - older.getMonth());

  const probe = new Date(older);
  probe.setMonth(probe.getMonth() + months);

  if (probe.getTime() > younger.getTime()) {
    months -= 1;
  }

  return months;
}

async function ensureScopedControleRunId(matchmakingId: string): Promise<string> {
  const { data: latest, error: latestErr } = await supabaseAdmin
    .from("controle_runs")
    .select("id")
    .eq("matchmaking_id", matchmakingId)
    .order("gestart_op", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) throw latestErr;
  if (s(latest?.id)) return s(latest.id);

  const now = new Date().toISOString();

  const { data: created, error: createErr } = await supabaseAdmin
    .from("controle_runs")
    .insert({
      matchmaking_id: matchmakingId,
      status: "afgerond",
      run_type: "matchmaker_create_match",
      gestart_op: now,
      afgerond_op: now,
    })
    .select("id")
    .single();

  if (createErr) throw createErr;

  const newId = s(created?.id);
  if (!newId) {
    throw new Error("Kon geen controle_run aanmaken voor rulesEngine.");
  }

  return newId;
}

async function fetchEventInfo(matchmakingId: string) {
  const { data: mmRow, error: mmErr } = await supabaseAdmin
    .from("matchmaker_matchmakings")
    .select("id, datum, evenement_datum, event_date, gala_date, discipline, sub_discipline")
    .eq("id", matchmakingId)
    .maybeSingle();

  if (mmErr) throw mmErr;

  const { data: uploadRow, error: uploadErr } = await supabaseAdmin
    .from("matchmaking_uploads")
    .select("evenement_datum")
    .eq("matchmaking_id", matchmakingId)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (uploadErr) throw uploadErr;

  return {
    evenement_datum:
      s(mmRow?.evenement_datum) ||
      s(mmRow?.datum) ||
      s(mmRow?.event_date) ||
      s(mmRow?.gala_date) ||
      s(uploadRow?.evenement_datum) ||
      null,
    discipline: s(mmRow?.discipline) || null,
    sub_discipline: s(mmRow?.sub_discipline) || null,
  };
}

function buildScopedCtxRow(args: {
  matchmakingId: string;
  inserted: any;
  partijNr: number;
  red: any;
  blue: any;
  eventInfo: {
    evenement_datum: string | null;
    discipline: string | null;
    sub_discipline: string | null;
  };
}) {
  const { matchmakingId, inserted, partijNr, red, blue, eventInfo } = args;

  const redCtx = red?.raw_context ?? {};
  const blueCtx = blue?.raw_context ?? {};
  const redIns = red?.raw_inschrijving ?? {};
  const blueIns = blue?.raw_inschrijving ?? {};

  const klasseMm = s(inserted?.klasse) || s(red?.klasse) || s(blue?.klasse) || null;
  const discipline =
    s(inserted?.discipline) ||
    eventInfo.discipline ||
    s(red?.discipline) ||
    s(blue?.discipline) ||
    null;

  return {
    matchmaking_id: matchmakingId,
    bout_id: s(inserted?.id) || null,
    partij_nr: partijNr,

    event_date: eventInfo.evenement_datum,
    evenement_datum: eventInfo.evenement_datum,
    discipline,
    sub_discipline: eventInfo.sub_discipline,
    klasse_mm: klasseMm,

    rood_va_mm: s(red?.va_nummer) || null,
    blauw_va_mm: s(blue?.va_nummer) || null,

    rood_naam_mm: s(red?.naam) || null,
    blauw_naam_mm: s(blue?.naam) || null,

    rood_naam_fp:
      s(redCtx?.fp_naam) ||
      s(redIns?.fp_naam) ||
      s(red?.naam) ||
      null,
    blauw_naam_fp:
      s(blueCtx?.fp_naam) ||
      s(blueIns?.fp_naam) ||
      s(blue?.naam) ||
      null,

    rood_naam_scrape:
      s(redCtx?.fp_naam) ||
      s(redCtx?.naam) ||
      s(redIns?.naam) ||
      s(red?.naam) ||
      null,
    blauw_naam_scrape:
      s(blueCtx?.fp_naam) ||
      s(blueCtx?.naam) ||
      s(blueIns?.naam) ||
      s(blue?.naam) ||
      null,

    rood_geboortedatum_fp:
      s(redCtx?.fp_geboortedatum) ||
      s(red?.geboortedatum) ||
      s(redIns?.geboortedatum) ||
      null,
    blauw_geboortedatum_fp:
      s(blueCtx?.fp_geboortedatum) ||
      s(blue?.geboortedatum) ||
      s(blueIns?.geboortedatum) ||
      null,

    rood_geboortedatum:
      s(red?.geboortedatum) ||
      s(redCtx?.geboortedatum) ||
      s(redIns?.geboortedatum) ||
      null,
    blauw_geboortedatum:
      s(blue?.geboortedatum) ||
      s(blueCtx?.geboortedatum) ||
      s(blueIns?.geboortedatum) ||
      null,

    rood_geslacht:
      s(red?.geslacht) ||
      s(redCtx?.geslacht) ||
      s(redIns?.geslacht) ||
      null,
    blauw_geslacht:
      s(blue?.geslacht) ||
      s(blueCtx?.geslacht) ||
      s(blueIns?.geslacht) ||
      null,

    rood_licentie:
      toBoolLikeJaNee(redCtx?.licentie) ||
      toBoolLikeJaNee(redIns?.licentie) ||
      null,
    blauw_licentie:
      toBoolLikeJaNee(blueCtx?.licentie) ||
      toBoolLikeJaNee(blueIns?.licentie) ||
      null,

    rood_heeft_startverbod:
      toBoolLikeJaNee(redCtx?.heeft_startverbod) ||
      toBoolLikeJaNee(redIns?.heeft_startverbod) ||
      null,
    blauw_heeft_startverbod:
      toBoolLikeJaNee(blueCtx?.heeft_startverbod) ||
      toBoolLikeJaNee(blueIns?.heeft_startverbod) ||
      null,

    keurmerk_rood:
      redCtx?.keurmerk_geldig ??
      redCtx?.keurmerk ??
      redIns?.keurmerk_geldig ??
      null,
    keurmerk_blauw:
      blueCtx?.keurmerk_geldig ??
      blueCtx?.keurmerk ??
      blueIns?.keurmerk_geldig ??
      null,

    keurmerk_reden_rood:
      s(redCtx?.keurmerk_reden) ||
      s(redIns?.keurmerk_reden) ||
      null,
    keurmerk_reden_blauw:
      s(blueCtx?.keurmerk_reden) ||
      s(blueIns?.keurmerk_reden) ||
      null,

    rood_totaal_wedstrijden_scrape:
      toNumber(redCtx?.totaal_wedstrijden) ??
      toNumber(redIns?.totaal_wedstrijden) ??
      null,
    blauw_totaal_wedstrijden_scrape:
      toNumber(blueCtx?.totaal_wedstrijden) ??
      toNumber(blueIns?.totaal_wedstrijden) ??
      null,

    rood_demo_totaal:
      toNumber(redCtx?.demo_totaal) ??
      toNumber(redIns?.demo_totaal) ??
      null,
    blauw_demo_totaal:
      toNumber(blueCtx?.demo_totaal) ??
      toNumber(blueIns?.demo_totaal) ??
      null,

    rood_uitslagen_per_discipline:
      redCtx?.uitslagen_per_discipline ??
      redIns?.uitslagen_per_discipline ??
      null,
    blauw_uitslagen_per_discipline:
      blueCtx?.uitslagen_per_discipline ??
      blueIns?.uitslagen_per_discipline ??
      null,

    rood_mma_current_klasse:
      s(redCtx?.mma_current_klasse) ||
      s(redCtx?.mma_klasse) ||
      s(redIns?.mma_current_klasse) ||
      s(redIns?.mma_klasse) ||
      null,
    blauw_mma_current_klasse:
      s(blueCtx?.mma_current_klasse) ||
      s(blueCtx?.mma_klasse) ||
      s(blueIns?.mma_current_klasse) ||
      s(blueIns?.mma_klasse) ||
      null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: userError } = await getUserFromBearer(req);
    if (!user) return jsonError(userError ?? "Niet ingelogd.", 401);

    const body = await req.json().catch(() => null);

    const matchmakingId = s(body?.matchmaking_id);

    const rood_fighter_id = s(body?.rood_fighter_id);
    const blauw_fighter_id = s(body?.blauw_fighter_id);

    const rood_fighter_context_id = s(body?.rood_fighter_context_id);
    const blauw_fighter_context_id = s(body?.blauw_fighter_context_id);

    const rood_inschrijving_id = s(body?.rood_inschrijving_id);
    const blauw_inschrijving_id = s(body?.blauw_inschrijving_id);

    if (!matchmakingId) return jsonError("matchmaking_id ontbreekt.");
    if (!rood_fighter_id && !rood_fighter_context_id && !rood_inschrijving_id) {
      return jsonError("Rode vechter ontbreekt.");
    }
    if (!blauw_fighter_id && !blauw_fighter_context_id && !blauw_inschrijving_id) {
      return jsonError("Blauwe vechter ontbreekt.");
    }

    const roles = await getRolesForUser(user.id);
    const allowed = await canAccessMatchmaking(matchmakingId, user.id, roles);
    if (!allowed) {
      return jsonError("Je hebt geen toegang tot deze matchmaking.", 403);
    }

    const red = await findFighterRecord({
      matchmakingId,
      fighterContextId: rood_fighter_context_id || null,
      inschrijvingId: rood_inschrijving_id || null,
      fighterId: rood_fighter_id || null,
    });

    const blue = await findFighterRecord({
      matchmakingId,
      fighterContextId: blauw_fighter_context_id || null,
      inschrijvingId: blauw_inschrijving_id || null,
      fighterId: blauw_fighter_id || null,
    });

    if (!red) return jsonError("Rode vechter niet gevonden.");
    if (!blue) return jsonError("Blauwe vechter niet gevonden.");

    const redKeys = [
      s(red.fighter_context_id),
      String(red.inschrijving_id),
      s(red.fighter_id),
    ].filter(Boolean);

    const blueKeys = [
      s(blue.fighter_context_id),
      String(blue.inschrijving_id),
      s(blue.fighter_id),
    ].filter(Boolean);

    if (redKeys.some((k) => blueKeys.includes(k))) {
      return jsonError("Rood en blauw mogen niet dezelfde vechter zijn.");
    }

    const leeftijdDiffMonths = calcBirthDiffMonths(
      red.geboortedatum,
      blue.geboortedatum
    );

    if (leeftijdDiffMonths != null && leeftijdDiffMonths >= 24) {
      return jsonError(
        `Partij verboden: leeftijdsverschil is ${leeftijdDiffMonths} maanden en dus 24 maanden of meer.`,
        400
      );
    }

    const { data: existingBouts, error: existingErr } = await supabaseAdmin
      .from("matchmaker_bouts_raw")
      .select("id, rood_inschrijving_id, blauw_inschrijving_id, raw")
      .eq("matchmaking_id", matchmakingId);

    if (existingErr) throw existingErr;

    for (const row of existingBouts ?? []) {
      const usedKeys = [
        String(toNumber(row?.rood_inschrijving_id) ?? ""),
        String(toNumber(row?.blauw_inschrijving_id) ?? ""),
        s(row?.raw?.rood_fighter_context_id),
        s(row?.raw?.blauw_fighter_context_id),
        s(row?.raw?.rood_fighter_id),
        s(row?.raw?.blauw_fighter_id),
      ].filter(Boolean);

      if (redKeys.some((k) => usedKeys.includes(k))) {
        return jsonError(`Vechter ${red.naam} zit al in een partij.`);
      }
      if (blueKeys.some((k) => usedKeys.includes(k))) {
        return jsonError(`Vechter ${blue.naam} zit al in een partij.`);
      }
    }

    const partijNr = await getNextPartijNr(matchmakingId);

    const discipline =
      red.discipline && blue.discipline && red.discipline === blue.discipline
        ? red.discipline
        : red.discipline || blue.discipline || null;

    const klasse =
      red.klasse && blue.klasse && red.klasse === blue.klasse
        ? red.klasse
        : red.klasse || blue.klasse || null;

    const geslacht =
      red.geslacht && blue.geslacht && red.geslacht === blue.geslacht
        ? red.geslacht
        : red.geslacht || blue.geslacht || null;

    const leeftijd_type =
      red.leeftijd_type &&
      blue.leeftijd_type &&
      red.leeftijd_type === blue.leeftijd_type
        ? red.leeftijd_type
        : red.leeftijd_type || blue.leeftijd_type || null;

    const maxGewicht =
      red.gewicht != null && blue.gewicht != null
        ? Math.max(red.gewicht, blue.gewicht)
        : red.gewicht ?? blue.gewicht ?? null;

    const requiresDispensatie =
      leeftijdDiffMonths != null &&
      leeftijdDiffMonths >= 18 &&
      leeftijdDiffMonths < 24;

    const rawPayload = {
      source: "match_portal",
      created_via: "create-match",
      matchmaking_id: matchmakingId,
      partij_nr: partijNr,
      requires_dispensatie: requiresDispensatie,
      leeftijdsverschil_maanden: leeftijdDiffMonths,

      rood_fighter_context_id: red.fighter_context_id,
      blauw_fighter_context_id: blue.fighter_context_id,

      rood_fighter_id: red.fighter_id,
      blauw_fighter_id: blue.fighter_id,

      rood_inschrijving_id: red.inschrijving_id,
      blauw_inschrijving_id: blue.inschrijving_id,

      rood: {
        naam: red.naam,
        gym: red.gym,
        va: red.va_nummer,
        gewicht: red.gewicht,
        discipline: red.discipline,
        klasse: red.klasse,
        geslacht: red.geslacht,
        geboortedatum: red.geboortedatum,
      },
      blauw: {
        naam: blue.naam,
        gym: blue.gym,
        va: blue.va_nummer,
        gewicht: blue.gewicht,
        discipline: blue.discipline,
        klasse: blue.klasse,
        geslacht: blue.geslacht,
        geboortedatum: blue.geboortedatum,
      },
    };

    const insertPayload = {
      matchmaking_id: matchmakingId,
      partij_nr: partijNr,

      rood_inschrijving_id: red.inschrijving_id,
      blauw_inschrijving_id: blue.inschrijving_id,

      discipline,
      klasse,
      status: requiresDispensatie ? "dispensatie" : "concept",
      geslacht,
      leeftijd_type,

      rood_naam: red.naam,
      blauw_naam: blue.naam,

      rood_gym: red.gym,
      blauw_gym: blue.gym,

      rood_va: red.va_nummer,
      blauw_va: blue.va_nummer,

      rood_gewicht: red.gewicht,
      blauw_gewicht: blue.gewicht,

      max_gewicht: maxGewicht,

      created_by: user.id,
      source_match_id: null,
      raw: rawPayload,
    };

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("matchmaker_bouts_raw")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertErr) throw insertErr;

    const controleRunId = await ensureScopedControleRunId(matchmakingId);
    const eventInfo = await fetchEventInfo(matchmakingId);

    const scopedCtxRow = buildScopedCtxRow({
      matchmakingId,
      inserted,
      partijNr,
      red,
      blue,
      eventInfo,
    });

    const ruleHits = await rulesEngineMM({
      controle_run_id: controleRunId,
      matchmaking_id: matchmakingId,
      ctxRows: [scopedCtxRow],
      scoped_bout_id: s(inserted?.id) || null,
      scoped_partij_nr: partijNr,
    });

    const verbodHits = (ruleHits ?? []).filter(
      (hit: any) => s(hit?.resultaat).toUpperCase() === "VERBOD"
    );

    if (verbodHits.length > 0) {
      await supabaseAdmin.from("matchmaker_bouts_raw").delete().eq("id", inserted.id);

      const verbodMessage =
        verbodHits.map((hit: any) => s(hit?.boodschap)).filter(Boolean)[0] ||
        "Deze match is verboden volgens de RulesEngine.";

      return jsonError(
        `Partij niet opgeslagen: ${verbodMessage}`,
        400,
        {
          rules_blocked: true,
          rules_hits: ruleHits,
          partij_nr: partijNr,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      message: requiresDispensatie
        ? "Partij opgeslagen. Dispensatie nodig."
        : "Partij opgeslagen.",
      partij_nr: partijNr,
      requires_dispensatie: requiresDispensatie,
      leeftijdsverschil_maanden: leeftijdDiffMonths,
      bout: inserted,
      rules_hits: ruleHits,
    });
  } catch (e: any) {
    console.error("create-match POST error:", e);
    return jsonError(e?.message ?? "Onbekende fout bij create-match.", 500);
  }
}