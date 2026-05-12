import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type AnyRow = Record<string, any>;

export function s(v: unknown): string | null {
  const x = String(v ?? "").trim();
  return x || null;
}

export function n(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const parsed = Number(String(v).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseJsonObject(v: unknown): Record<string, any> {
  if (!v) return {};
  if (typeof v === "object" && v !== null) return v as Record<string, any>;
  if (typeof v !== "string") return {};
  try {
    const parsed = JSON.parse(v);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function fullNameFromInschrijving(row?: AnyRow | null): string | null {
  if (!row) return null;
  const first = s(row.voornaam);
  const last = s(row.achternaam);
  const combined = [first, last].filter(Boolean).join(" ").trim();
  return combined || s(row.naam_input) || null;
}

export function calcAgeAtEvent(
  geboortedatum: string | null,
  eventDate: string | null
): number | null {
  if (!geboortedatum || !eventDate) return null;

  const birth = new Date(geboortedatum);
  const event = new Date(eventDate);

  if (Number.isNaN(birth.getTime()) || Number.isNaN(event.getTime())) {
    return null;
  }

  let age = event.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = event.getUTCMonth() - birth.getUTCMonth();
  const dayDiff = event.getUTCDate() - birth.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function normalizeBoolLike(v: unknown): boolean | null {
  if (v == null || v === "") return null;
  if (typeof v === "boolean") return v;

  const x = String(v).trim().toLowerCase();
  if (!x) return null;

  if (["1", "true", "ja", "yes", "y", "geldig"].includes(x)) return true;
  if (["0", "false", "nee", "no", "n", "ongeldig"].includes(x)) return false;

  return null;
}

export function boolLikeLabel(v: unknown): "ja" | "nee" | null {
  const b = normalizeBoolLike(v);
  if (b === true) return "ja";
  if (b === false) return "nee";
  return null;
}

export function extractKeurmerkFromExtra(extra: unknown): {
  heeft_keurmerk: string | null;
  reden: string | null;
  payload: Record<string, any> | null;
} {
  const obj = parseJsonObject(extra);
  const keurmerk = parseJsonObject(obj?.keurmerk);

  const heeft =
    s(obj?.heeft_keurmerk) ??
    s(keurmerk?.geldig) ??
    s(keurmerk?.status) ??
    null;

  const reason =
    s(obj?.keurmerk_reason) ??
    s(keurmerk?.reason) ??
    null;

  return {
    heeft_keurmerk: heeft,
    reden: reason,
    payload: Object.keys(keurmerk).length ? keurmerk : null,
  };
}

export function findRawFighter(args: {
  vaNummer: string | null;
  matchmakingId: string;
  controleRunId: string | null;
  fighterRawByRunVa: Map<string, AnyRow>;
  fighterRawByVa: Map<string, AnyRow>;
}) {
  const { vaNummer, matchmakingId, controleRunId, fighterRawByRunVa, fighterRawByVa } = args;
  if (!vaNummer) return null;

  if (controleRunId) {
    const key = `${matchmakingId}::${controleRunId}::${vaNummer}`;
    const exact = fighterRawByRunVa.get(key);
    if (exact) return exact;
  }

  const fallbackKey = `${matchmakingId}::${vaNummer}`;
  return fighterRawByVa.get(fallbackKey) ?? null;
}

export function buildUnifiedFighterFromSources(args: {
  eventDate: string | null;
  matchmakingId: string;
  controleRunId: string | null;
  fighter?: AnyRow | null;
  context?: AnyRow | null;
  inschrijving?: AnyRow | null;
  fighterRawByRunVa: Map<string, AnyRow>;
  fighterRawByVa: Map<string, AnyRow>;
  fallbackVa?: string | null;
  fallbackNaam?: string | null;
  fallbackGym?: string | null;
  fallbackGewicht?: number | null;
  fallbackDiscipline?: string | null;
  fallbackKlasse?: string | null;
  fallbackGeslacht?: string | null;
  fallbackGeboortedatum?: string | null;
}) {
  const {
    eventDate,
    matchmakingId,
    controleRunId,
    fighter,
    context,
    inschrijving,
    fighterRawByRunVa,
    fighterRawByVa,
    fallbackVa,
    fallbackNaam,
    fallbackGym,
    fallbackGewicht,
    fallbackDiscipline,
    fallbackKlasse,
    fallbackGeslacht,
    fallbackGeboortedatum,
  } = args;

  const va_nummer =
    s(fighter?.va_nummer) ||
    s(context?.va_nummer) ||
    s(inschrijving?.va_nummer) ||
    s(fallbackVa) ||
    null;

  const fighterRaw = findRawFighter({
    vaNummer: va_nummer,
    matchmakingId,
    controleRunId,
    fighterRawByRunVa,
    fighterRawByVa,
  });

  const keurmerk = extractKeurmerkFromExtra(context?.extra);

  const naam =
    s(fighterRaw?.naam) ||
    s(context?.fp_naam) ||
    s(context?.naam) ||
    fullNameFromInschrijving(inschrijving) ||
    s(fighter?.naam_input) ||
    s(fallbackNaam) ||
    null;

  const geboortedatum =
    s(fighterRaw?.geboortedatum) ||
    s(context?.fp_geboortedatum) ||
    s(context?.geboortedatum_input) ||
    s(inschrijving?.geboortedatum) ||
    s(fallbackGeboortedatum) ||
    null;

  const gym =
    s(context?.fp_gym) ||
    s(context?.gym_input) ||
    s(inschrijving?.gym) ||
    s(fallbackGym) ||
    null;

  const discipline =
    s(context?.discipline) ||
    s(inschrijving?.discipline) ||
    s(fallbackDiscipline) ||
    null;

  const klasse =
    s(context?.klasse) ||
    s(context?.fp_klasse) ||
    s(inschrijving?.klasse) ||
    s(fallbackKlasse) ||
    null;

  const geslacht =
    s(fighterRaw?.geslacht) ||
    s(context?.geslacht) ||
    s(inschrijving?.geslacht) ||
    s(fallbackGeslacht) ||
    null;

  const gewicht =
    n(context?.gewicht) ??
    n(inschrijving?.gewicht) ??
    n(fallbackGewicht);

  const licentie =
    boolLikeLabel(fighterRaw?.licentie) ??
    boolLikeLabel(context?.extra?.licentie) ??
    boolLikeLabel(fighter?.licentie) ??
    null;

  const heeft_startverbod =
    boolLikeLabel(fighterRaw?.heeft_startverbod) ??
    boolLikeLabel(context?.extra?.startverbod) ??
    boolLikeLabel(fighter?.startverbod) ??
    null;

  const totaal_wedstrijden =
    n(fighterRaw?.totaal_wedstrijden) ??
    n(context?.uitslagen_count) ??
    null;

  const gewonnen =
    n(fighterRaw?.gewonnen) ??
    n(context?.record_w) ??
    n(fighter?.win) ??
    null;

  const verloren =
    n(fighterRaw?.verloren) ??
    n(context?.record_l) ??
    n(fighter?.loss) ??
    null;

  const draw =
    n(fighterRaw?.gelijk) ??
    n(context?.record_d) ??
    n(fighter?.draw) ??
    null;

  const nulmeting_totaal =
    n(fighterRaw?.nulmeting_totaal) ??
    n(context?.extra?.nulmeting_totaal) ??
    n(fighter?.demo) ??
    null;

  const nulmeting_klasse =
    s(fighterRaw?.nulmeting_klasse) ||
    s(context?.fp_klasse) ||
    null;

  const nulmeting_opmerking =
    s(fighterRaw?.nulmeting_opmerking) ||
    s(context?.nulmeting_opmerking) ||
    s(fighter?.nulmeting_opmerking) ||
    null;

  const leeftijd = calcAgeAtEvent(geboortedatum, eventDate);

  return {
    fighter_id: s(fighter?.fighter_id) || s(context?.fighter_id) || null,
    inschrijving_id: s(inschrijving?.id) || s(context?.inschrijving_id) || null,
    fighter_context_id: s(context?.id) || null,
    fighter_raw_id: s(fighterRaw?.id) || null,
    row_nr: n(context?.row_nr) ?? n(fighterRaw?.row_nr) ?? n(fighter?.row_nr) ?? null,

    naam,
    geboortedatum,
    leeftijd,
    geslacht,
    gewicht,
    discipline,
    klasse,
    gym,
    va_nummer,

    licentie,
    heeft_startverbod,

    totaal_wedstrijden,
    gewonnen,
    verloren,
    draw,

    nulmeting_totaal,
    nulmeting_klasse,
    nulmeting_opmerking,

    heeft_keurmerk: s(context?.heeft_keurmerk) || keurmerk.heeft_keurmerk || null,
    keurmerk_reason: keurmerk.reden,
    keurmerk_payload: keurmerk.payload,

    email: s(fighter?.email) || null,
    telefoon: s(fighter?.telefoon) || null,
    trainer_naam: s(fighter?.trainer_naam) || null,
    trainer_email: s(fighter?.trainer_email) || null,
    trainer_tel: s(fighter?.trainer_tel) || null,

    bron_fighter_raw: fighterRaw,
    bron_fighter_context: context,
    bron_inschrijving: inschrijving,
  };
}

export async function loadEventHeader(matchmakingId: string) {
  const { data: ownedRow, error } = await supabaseAdmin
    .from("matchmakings")
    .select(
      "id, naam, datum, locatie, promotor, bondteam, status, matchmaker_id, huidige_eigenaar_type, huidige_eigenaar_user_id, is_archived"
    )
    .eq("id", matchmakingId)
    .maybeSingle();

  if (error) throw error;
  return ownedRow ?? null;
}

export async function loadLatestMatchmakerRun(matchmakingId: string) {
  const { data, error } = await supabaseAdmin
    .from("controle_runs")
    .select("id, matchmaking_id, status, gestart_op, afgerond_op, run_type")
    .eq("matchmaking_id", matchmakingId)
    .order("gestart_op", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function loadFighterSupportMaps(args: {
  matchmakingId: string;
  vaNummers?: string[];
  inschrijvingIds?: (string | number)[];
  contextIds?: (string | number)[];
}) {
  const { matchmakingId, vaNummers = [], inschrijvingIds = [], contextIds = [] } = args;

  const cleanVas = Array.from(new Set(vaNummers.map((x) => s(x)).filter(Boolean))) as string[];
  const cleanInschrijvingIds = Array.from(
    new Set(inschrijvingIds.map((x) => s(x)).filter(Boolean))
  ) as string[];
  const cleanContextIds = Array.from(
    new Set(contextIds.map((x) => s(x)).filter(Boolean))
  ) as string[];

  const [inschrijvingenRes, fighterContextRes, fighterRawRes] = await Promise.all([
    cleanInschrijvingIds.length
      ? supabaseAdmin
          .from("aanmeldingen")
          .select("*")
          .in("id", cleanInschrijvingIds)
      : Promise.resolve({ data: [], error: null }),
    cleanContextIds.length
      ? supabaseAdmin
          .from("matchmaker_fighter_context")
          .select("*")
          .in("id", cleanContextIds)
      : Promise.resolve({ data: [], error: null }),
    cleanVas.length
      ? supabaseAdmin
          .from("fighters_raw")
          .select("*")
          .eq("matchmaking_id", matchmakingId)
          .in("va_nummer", cleanVas)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (inschrijvingenRes.error) throw inschrijvingenRes.error;
  if (fighterContextRes.error) throw fighterContextRes.error;
  if (fighterRawRes.error) throw fighterRawRes.error;

  const inschrijvingById = new Map<string, AnyRow>();
  for (const row of (inschrijvingenRes.data ?? []) as AnyRow[]) {
    const id = s(row.id);
    if (id) inschrijvingById.set(id, row);
  }

  const contextById = new Map<string, AnyRow>();
  for (const row of (fighterContextRes.data ?? []) as AnyRow[]) {
    const id = s(row.id);
    if (id) contextById.set(id, row);
  }

  const fighterRawByRunVa = new Map<string, AnyRow>();
  const fighterRawByVa = new Map<string, AnyRow>();

  for (const row of (fighterRawRes.data ?? []) as AnyRow[]) {
    const mmId = s(row.matchmaking_id);
    const runId = s(row.controle_run_id);
    const va = s(row.va_nummer);
    if (!mmId || !va) continue;

    const fallbackKey = `${mmId}::${va}`;
    if (!fighterRawByVa.has(fallbackKey)) {
      fighterRawByVa.set(fallbackKey, row);
    }

    if (runId) {
      const exactKey = `${mmId}::${runId}::${va}`;
      if (!fighterRawByRunVa.has(exactKey)) {
        fighterRawByRunVa.set(exactKey, row);
      }
    }
  }

  return {
    inschrijvingById,
    contextById,
    fighterRawByRunVa,
    fighterRawByVa,
    fighterRawRows: (fighterRawRes.data ?? []) as AnyRow[],
    contextRows: (fighterContextRes.data ?? []) as AnyRow[],
    inschrijvingRows: (inschrijvingenRes.data ?? []) as AnyRow[],
  };
}

export async function loadUitslagenByVa(matchmakingId: string, vaNummer: string | null) {
  if (!vaNummer) return [];
  const { data, error } = await supabaseAdmin
    .from("uitslagen_raw")
    .select("datum, discipline, klasse, uitslag, fighter_id, tegenstander, evenement, sportschool, gewicht")
    .eq("matchmaking_id", matchmakingId)
    .eq("va_nummer", vaNummer)
    .order("datum", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function loadFighterRuleResults(args: {
  matchmakingId: string;
  controleRunId: string | null;
  fighterId?: string | null;
  inschrijvingId?: string | null;
  rowNr?: number | null;
  vaNummer?: string | null;
}) {
  const { matchmakingId, controleRunId, fighterId, inschrijvingId, rowNr, vaNummer } = args;

  const tryQueries: Array<() => Promise<any[]>> = [];

  if (controleRunId && fighterId) {
    tryQueries.push(async () => {
      const { data, error } = await supabaseAdmin
        .from("controle_resultaten")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("controle_run_id", controleRunId)
        .eq("fighter_id", fighterId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    });
  }

  if (controleRunId && inschrijvingId) {
    tryQueries.push(async () => {
      const { data, error } = await supabaseAdmin
        .from("controle_resultaten")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("controle_run_id", controleRunId)
        .eq("inschrijving_id", inschrijvingId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    });
  }

  if (controleRunId && rowNr != null) {
    tryQueries.push(async () => {
      const { data, error } = await supabaseAdmin
        .from("controle_resultaten")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("controle_run_id", controleRunId)
        .eq("row_nr", rowNr)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    });
  }

  if (controleRunId && vaNummer) {
    tryQueries.push(async () => {
      const { data, error } = await supabaseAdmin
        .from("controle_resultaten")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("controle_run_id", controleRunId)
        .eq("va_nummer", vaNummer)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    });
  }

  if (fighterId) {
    tryQueries.push(async () => {
      const { data, error } = await supabaseAdmin
        .from("controle_resultaten")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("fighter_id", fighterId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    });
  }

  if (inschrijvingId) {
    tryQueries.push(async () => {
      const { data, error } = await supabaseAdmin
        .from("controle_resultaten")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("inschrijving_id", inschrijvingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    });
  }

  if (rowNr != null) {
    tryQueries.push(async () => {
      const { data, error } = await supabaseAdmin
        .from("controle_resultaten")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("row_nr", rowNr)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    });
  }

  if (vaNummer) {
    tryQueries.push(async () => {
      const { data, error } = await supabaseAdmin
        .from("controle_resultaten")
        .select("*")
        .eq("matchmaking_id", matchmakingId)
        .eq("va_nummer", vaNummer)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    });
  }

  for (const q of tryQueries) {
    const rows = await q();
    if (rows.length > 0) return rows;
  }

  return [];
}