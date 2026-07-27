// lib/matchmaker/saveSingleFighterContext.ts

import { type AnyRow, type SupabaseLike, normalizeVa } from "./singleFighterUtils";

function s(v: any): string {
  return String(v ?? "").trim();
}

function n(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const num = Number(String(v).replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function i(v: any): number | null {
  const num = n(v);
  return num === null ? null : Math.trunc(num);
}

function dateOrNull(v: any): string | null {
  const x = s(v);
  if (!x) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x;

  const m = x.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }

  return null;
}

function boolOrNull(v: any): boolean | null {
  if (v === true || v === false) return v;

  const x = s(v).toLowerCase();
  if (!x) return null;

  if (["true", "ja", "yes", "1", "ok"].includes(x)) return true;
  if (["false", "nee", "no", "0"].includes(x)) return false;

  return null;
}

function uuidOrNull(v: any): string | null {
  const x = s(v);
  if (!x) return null;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x)
    ? x
    : null;
}

function toernooiCodeOrNull(v: any): string | null {
  const x = s(v).toUpperCase();
  return x ? x : null;
}

function isToernooiContext(ctx: AnyRow): boolean {
  if (toernooiCodeOrNull(pick(ctx, ["toernooi_code", "toernooicode", "tournament_code"]))) return true;
  const raw = pick(ctx, ["is_toernooi", "toernooi"]);
  if (raw === true) return true;
  const x = s(raw).toLowerCase();
  return ["true", "1", "ja", "yes"].includes(x);
}

function missingColumn(message: string): string {
  return (
    message.match(/'([^']+)' column/)?.[1] ||
    message.match(/column "([^"]+)"/)?.[1] ||
    message.match(/Could not find the ([^\s]+) column/)?.[1] ||
    ""
  );
}

async function safeInsertRows(params: {
  supabase: SupabaseLike;
  table: string;
  rows: Record<string, any>[];
}) {
  const { supabase, table } = params;
  let rows = params.rows.map((r) => ({ ...r }));
  const dropped: string[] = [];

  for (let attempt = 0; attempt < 25; attempt++) {
    const { data, error } = await supabase.from(table).insert(rows).select("*");
    if (!error) return { data: data ?? [], error: null, dropped };

    const col = missingColumn(error.message || "");
    if ((error.code === "PGRST204" || error.code === "42703") && col) {
      rows = rows.map((r) => {
        if (!(col in r)) return r;
        const next = { ...r };
        delete next[col];
        return next;
      });
      dropped.push(col);
      continue;
    }

    return { data: [], error, dropped };
  }

  return {
    data: [],
    error: new Error(`Insert ${table} mislukt: te veel onbekende kolommen.`),
    dropped,
  };
}

async function tryDeleteToernooiContexts(params: {
  supabase: SupabaseLike;
  matchmakingId: string;
  toernooiCode: string;
  vaNummers: string[];
}) {
  const { supabase, matchmakingId, toernooiCode, vaNummers } = params;
  if (!vaNummers.length) return false;

  const { error } = await supabase
    .from("matchmaker_fighter_context")
    .delete()
    .eq("matchmaking_id", matchmakingId)
    .eq("toernooi_code", toernooiCode)
    .in("va_nummer", vaNummers);

  if (!error) return true;

  // Als de kolom toernooi_code nog niet bestaat in matchmaker_fighter_context,
  // kan deze tabel de toernooi-context niet apart bewaren. Dan vallen we terug
  // op de oude VA-delete zodat inserts niet dubbel worden.
  if (error.code === "PGRST204" || error.code === "42703") return false;

  throw error;
}


function pick(row: AnyRow, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && s(value) !== "") return value;
  }
  return null;
}

function toContextRow(ctx: AnyRow) {
  const va = normalizeVa(
    pick(ctx, ["va_nummer", "va", "fighter_va", "fighterVa"])
  );

  const now = new Date().toISOString();
  const toernooi_code = toernooiCodeOrNull(
    pick(ctx, ["toernooi_code", "toernooicode", "tournament_code"])
  );
  const is_toernooi = isToernooiContext(ctx);

  return {
    updated_at: now,

    toernooi_code,
    is_toernooi,
    partij_nr: is_toernooi ? 0 : i(pick(ctx, ["partij_nr", "partijNr"])),
    bout_id: is_toernooi ? null : uuidOrNull(pick(ctx, ["bout_id", "bout_uid", "boutId"])),
    matchmaker_toernooi_fighter_id: uuidOrNull(
      pick(ctx, ["matchmaker_toernooi_fighter_id", "toernooi_fighter_id", "toernooi_deelnemer_id"])
    ),

    inschrijving_id: i(pick(ctx, ["inschrijving_id", "aanmelding_id", "id_aanmelding"])),
    matchmaking_id: uuidOrNull(pick(ctx, ["matchmaking_id", "matchmakingId"])),
    controle_run_id: uuidOrNull(pick(ctx, ["controle_run_id", "controleRunId", "scrape_run_id"])),
    fighter_id: is_toernooi
      ? ((va ?? s(pick(ctx, ["fighter_id", "fighterId"]))) || null)
      : uuidOrNull(pick(ctx, ["fighter_id", "fighterId"])),
    event_id: uuidOrNull(pick(ctx, ["event_id", "eventId"])),

    row_nr: i(pick(ctx, ["row_nr", "rowNr", "rij", "regel"])),

    discipline: pick(ctx, ["discipline"]),
    klasse: pick(ctx, ["klasse", "klasse_input", "klasse_mm"]),
    geslacht: pick(ctx, ["geslacht", "fp_geslacht", "geslacht_input"]),

    voornaam: pick(ctx, ["voornaam"]),
    achternaam: pick(ctx, ["achternaam"]),
    naam: pick(ctx, ["naam", "fp_naam", "naam_input"]),
    naam_input: pick(ctx, ["naam_input", "input_naam"]),
    gym_input: pick(ctx, ["gym_input", "sportschool_input", "sportschool_mm", "gym"]),
    geboortedatum_input: dateOrNull(pick(ctx, ["geboortedatum_input", "input_geboortedatum"])),

    gewicht: n(pick(ctx, ["gewicht"])),

    va_nummer: va,

    fp_naam: pick(ctx, ["fp_naam", "naam_fp"]),
    fp_geboortedatum: dateOrNull(pick(ctx, ["fp_geboortedatum", "geboortedatum_fp"])),
    fp_gym: pick(ctx, ["fp_gym", "gym_fp", "sportschool_fp"]),
    fp_klasse: pick(ctx, ["fp_klasse", "klasse_fp"]),
    fp_geslacht: pick(ctx, ["fp_geslacht", "geslacht_fp"]),

    geboortedatum: dateOrNull(pick(ctx, ["geboortedatum", "fp_geboortedatum", "geboortedatum_fp"])),

    licentie: pick(ctx, ["licentie_actief", "licentie", "licentie_status"]),
    licentie_actief: boolOrNull(pick(ctx, ["licentie_actief", "licentie_ok", "licentie"])),
    licentie_ok: boolOrNull(pick(ctx, ["licentie_ok", "licentie_actief", "licentie"])),
    fit_to_fight: boolOrNull(pick(ctx, ["fit_to_fight"])),
    heeft_startverbod: pick(ctx, ["heeft_startverbod", "startverbod"]),
    heeft_keurmerk: pick(ctx, ["heeft_keurmerk", "keurmerk"]),
    keurmerk_reden: pick(ctx, ["keurmerk_reden"]),

    totaal_wedstrijden: i(pick(ctx, ["totaal_wedstrijden", "record_totaal"])),
    gewonnen: i(pick(ctx, ["gewonnen", "record_w", "wins"])),
    record_w: i(pick(ctx, ["record_w", "gewonnen", "wins"])),
    record_l: i(pick(ctx, ["record_l", "verloren", "losses"])),
    record_d: i(pick(ctx, ["record_d", "draws", "gelijk"])),

    nulmeting_totaal: i(pick(ctx, ["nulmeting_totaal"])),
    nulmeting_klasse: pick(ctx, ["nulmeting_klasse"]),
    berekende_klasse: pick(ctx, ["berekende_klasse", "klasse_advies"]),
    klasse_advies: pick(ctx, ["klasse_advies"]),
    klasse_advies_reden: pick(ctx, ["klasse_advies_reden"]),
    nulmeting_opmerking: pick(ctx, ["nulmeting_opmerking"]),

    naam_match: boolOrNull(pick(ctx, ["naam_match"])),
    geboortedatum_match: boolOrNull(pick(ctx, ["geboortedatum_match"])),
    gym_match: boolOrNull(pick(ctx, ["gym_match"])),

    uitslagen_count: i(pick(ctx, ["uitslagen_count"])),
    laatste_partij_datum: dateOrNull(pick(ctx, ["laatste_partij_datum"])),

    scraped_at: pick(ctx, ["scraped_at"]) ?? now,
    evenement_datum: dateOrNull(pick(ctx, ["evenement_datum", "eventDate", "event_date"])),
    leeftijd: i(pick(ctx, ["leeftijd", "leeftijd_event"])),
    leeftijd_event: i(pick(ctx, ["leeftijd_event", "leeftijd"])),

    extra: {
      scrape_status: pick(ctx, ["scrape_status", "controle_status"]),
      bron: pick(ctx, ["bron", "source"]) ?? (is_toernooi ? "matchmaker_toernooi_fighters" : null),
      toernooi_code,
      is_toernooi,
      matchmaker_toernooi_fighter_id: uuidOrNull(
        pick(ctx, ["matchmaker_toernooi_fighter_id", "toernooi_fighter_id", "toernooi_deelnemer_id"])
      ),
      raw: pick(ctx, ["raw"]),
    },
  };
}

async function deleteOldContexts(params: {
  supabase: SupabaseLike;
  matchmakingId: string;
  rows: AnyRow[];
}) {
  const { supabase, matchmakingId, rows } = params;

  const toernooiRows = rows.filter((r) => toernooiCodeOrNull(pick(r, ["toernooi_code"])));
  const normalRows = rows.filter((r) => !toernooiCodeOrNull(pick(r, ["toernooi_code"])));

  // Toernooi-context mag normale fighter-context niet opruimen.
  // Daarom eerst proberen te deleten op matchmaking_id + toernooi_code + va_nummer.
  const fallbackVaDeletes: string[] = [];

  const byToernooi = new Map<string, string[]>();
  for (const row of toernooiRows) {
    const code = toernooiCodeOrNull(pick(row, ["toernooi_code"]));
    const va = normalizeVa(pick(row, ["va_nummer", "va"]));
    if (!code || !va) continue;
    if (!byToernooi.has(code)) byToernooi.set(code, []);
    byToernooi.get(code)!.push(va);
  }

  for (const [code, vasRaw] of byToernooi.entries()) {
    const vas = Array.from(new Set(vasRaw));
    const deletedWithScope = await tryDeleteToernooiContexts({
      supabase,
      matchmakingId,
      toernooiCode: code,
      vaNummers: vas,
    });

    if (!deletedWithScope) fallbackVaDeletes.push(...vas);
  }

  const inschrijvingIds = normalRows
    .map((r) => i(pick(r, ["inschrijving_id"])))
    .filter((x): x is number => x !== null);

  if (inschrijvingIds.length) {
    await supabase
      .from("matchmaker_fighter_context")
      .delete()
      .eq("matchmaking_id", matchmakingId)
      .in("inschrijving_id", inschrijvingIds);
  }

  const normalVaNummers = normalRows
    .map((r) => normalizeVa(pick(r, ["va_nummer", "va"])))
    .filter(Boolean);

  const vaNummers = Array.from(new Set([...normalVaNummers, ...fallbackVaDeletes]));

  if (vaNummers.length) {
    await supabase
      .from("matchmaker_fighter_context")
      .delete()
      .eq("matchmaking_id", matchmakingId)
      .in("va_nummer", vaNummers);
  }
}

export async function saveSingleFighterContexts(params: {
  supabase: SupabaseLike;
  matchmakingId: string;
  contexts: AnyRow[];
}) {
  const { supabase, matchmakingId, contexts } = params;

  const rows = (contexts ?? []).map(toContextRow);

  if (!rows.length) {
    return { data: [], error: null };
  }

  await deleteOldContexts({ supabase, matchmakingId, rows });

  const { data, error } = await safeInsertRows({
    supabase,
    table: "matchmaker_fighter_context",
    rows,
  });

  // De context-save is het beslissende moment in de nieuwe statusflow.
  // Zodra de context succesvol is opgeslagen, is de vechter beschikbaar
  // voor matchmaking. Zo is dit niet afhankelijk van een losse pipeline.
  if (!error) {
    await markAanmeldingenFromContexts({
      supabase,
      matchmakingId,
      contexts,
    });
  }

  return { data: data ?? [], error };
}

export async function saveSingleFighterRules(params: {
  supabase: SupabaseLike;
  matchmakingId: string;
  controleRunId: string;
  hits: AnyRow[];
  scopeRows?: AnyRow[];
}) {
  const { supabase, matchmakingId, controleRunId, hits, scopeRows = [] } = params;
  const table = "matchmaker_fighter_resultaten";

  // Verwijder alleen regels van de concrete vechter(s) die nu opnieuw worden verwerkt.
  // Dit maakt losse verwerking na upload, correctie of refresh veilig.
  const scope = (scopeRows?.length ? scopeRows : hits) ?? [];

  const normalIds = Array.from(
    new Set(
      scope
        .filter((row) => !toernooiCodeOrNull(pick(row, ["toernooi_code", "toernooicode", "tournament_code"])))
        .map((row) => i(pick(row, ["inschrijving_id", "aanmelding_id", "id_aanmelding"])))
        .filter((id): id is number => id !== null),
    ),
  );

  const tournamentScopes = new Map<string, Set<string>>();
  for (const row of scope) {
    const code = toernooiCodeOrNull(pick(row, ["toernooi_code", "toernooicode", "tournament_code"]));
    if (!code && !isToernooiContext(row)) continue;

    const va = normalizeVa(pick(row, ["va_nummer", "va", "toernooi_va_nummer", "fighter_id"]));
    if (!code || !va) continue;

    if (!tournamentScopes.has(code)) tournamentScopes.set(code, new Set());
    tournamentScopes.get(code)!.add(va);
  }

  const existingRows: AnyRow[] = [];

  if (normalIds.length) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq("controle_run_id", controleRunId)
      .in("inschrijving_id", normalIds);

    if (error) return { data: [], error };
    existingRows.push(...((data ?? []) as AnyRow[]));
  }

  for (const [toernooiCode, vas] of tournamentScopes.entries()) {
    const vaNummers = Array.from(vas);
    if (!vaNummers.length) continue;

    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("matchmaking_id", matchmakingId)
      .eq("controle_run_id", controleRunId)
      .eq("toernooi_code", toernooiCode)
      .in("va_nummer", vaNummers);

    if (error) return { data: [], error };
    existingRows.push(...((data ?? []) as AnyRow[]));
  }

  const reviewByKey = new Map<string, AnyRow>();
  for (const row of existingRows) {
    const key = [
      normalizeVa(pick(row, ["va_nummer", "va", "fighter_id"])) ?? "",
      s(pick(row, ["rule_code"])),
      String(i(pick(row, ["inschrijving_id"])) ?? ""),
      toernooiCodeOrNull(pick(row, ["toernooi_code"])) ?? "",
    ].join("||");

    if (row?.review_status || row?.reviewed_at || row?.original_resultaat) {
      reviewByKey.set(key, row);
    }
  }

  if (normalIds.length) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("matchmaking_id", matchmakingId)
      .eq("controle_run_id", controleRunId)
      .in("inschrijving_id", normalIds);

    if (error) return { data: [], error };
  }

  for (const [toernooiCode, vas] of tournamentScopes.entries()) {
    const vaNummers = Array.from(vas);
    if (!vaNummers.length) continue;

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("matchmaking_id", matchmakingId)
      .eq("controle_run_id", controleRunId)
      .eq("toernooi_code", toernooiCode)
      .in("va_nummer", vaNummers);

    if (error) return { data: [], error };
  }

  // Geen hits betekent dat alleen de oude regels binnen deze scope verwijderd blijven.
  if (!hits?.length) return { data: [], error: null };

  const rows = hits.map((hit) => {
    const toernooi_code = toernooiCodeOrNull(pick(hit, ["toernooi_code", "toernooicode", "tournament_code"]));
    const va = normalizeVa(pick(hit, ["va_nummer", "va", "toernooi_va_nummer", "fighter_id"]));
    const inschrijving_id = i(hit.inschrijving_id);
    const key = [
      va ?? "",
      s(hit.rule_code),
      String(inschrijving_id ?? ""),
      toernooi_code ?? "",
    ].join("||");
    const previousReview = reviewByKey.get(key);

    return {
      matchmaking_id: matchmakingId,
      controle_run_id: controleRunId,
      inschrijving_id,
      fighter_id: toernooi_code
        ? ((va ?? s(hit.fighter_id)) || null)
        : uuidOrNull(hit.fighter_id),
      va_nummer: va,
      toernooi_code,
      is_toernooi: !!toernooi_code,
      partij_nr: toernooi_code ? 0 : i(hit.partij_nr),
      bout_id: toernooi_code ? null : uuidOrNull(hit.bout_id),
      rule: hit.rule ?? null,
      rule_code: hit.rule_code ?? null,
      resultaat: previousReview?.review_status ? previousReview.resultaat : hit.resultaat ?? null,
      severity: hit.severity ?? null,
      boodschap: hit.boodschap ?? null,
      original_resultaat:
        previousReview?.original_resultaat ??
        (previousReview?.review_status ? previousReview?.resultaat : null),
      review_status: previousReview?.review_status ?? null,
      review_note: previousReview?.review_note ?? null,
      reviewed_by: previousReview?.reviewed_by ?? null,
      reviewed_at: previousReview?.reviewed_at ?? null,
      created_at: previousReview?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  const { data, error } = await safeInsertRows({ supabase, table, rows });
  return { data: data ?? [], error };
}

export async function markAanmeldingenFromContexts(params: {
  supabase: SupabaseLike;
  matchmakingId: string;
  contexts: AnyRow[];
}) {
  const { supabase, matchmakingId, contexts } = params;

  const okIds: number[] = [];
  const failIds: number[] = [];

  for (const ctx of contexts ?? []) {
    const id = i(pick(ctx, ["inschrijving_id"]));
    if (!id) continue;

    const status = s(pick(ctx, ["scrape_status", "controle_status"])).toLowerCase();

    if (status.includes("mislukt") || status.includes("fail") || status.includes("error")) {
      failIds.push(id);
    } else {
      okIds.push(id);
    }
  }

  const now = new Date().toISOString();

  if (okIds.length) {
    await supabase
      .from("aanmeldingen")
      .update({
        status: "beschikbaar",
        scrape_status: "gecontroleerd",
        controle_status: "gecontroleerd",
        gegevens_status: "gecontroleerd",
        checked_at: now,
        scraped_at: now,
        updated_at: now,
      })
      .eq("matchmaking_id", matchmakingId)
      .in("id", okIds);
  }

  if (failIds.length) {
    await supabase
      .from("aanmeldingen")
      .update({
        scrape_status: "controle_mislukt",
        controle_status: "controle_mislukt",
        gegevens_status: "controle_mislukt",
        checked_at: now,
        updated_at: now,
      })
      .eq("matchmaking_id", matchmakingId)
      .in("id", failIds);
  }

  return { ok: true };
}